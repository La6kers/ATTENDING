// ============================================================
// ATTENDING AI - Bulk Data Export
// apps/shared/lib/integrations/bulkExport.ts
//
// FHIR Bulk Data Access ($export) implementation.
// Enables large-scale data export for:
//   - Analytics/warehouse population
//   - Regulatory reporting
//   - Organization-to-organization data transfer
//   - Backup/disaster recovery
//
// Spec: HL7 FHIR Bulk Data Access IG
// https://hl7.org/fhir/uv/bulkdata/
//
// Flow:
//   1. POST /api/fhir/$export → Start export job (returns 202 + polling URL)
//   2. GET  /api/fhir/$export/:jobId → Poll status (202=pending, 200=complete)
//   3. GET  /api/fhir/$export/:jobId/files/:fileId → Download NDJSON
//   4. DELETE /api/fhir/$export/:jobId → Cancel job
//
// Output format: NDJSON (newline-delimited JSON)
// ============================================================

import { randomUUID } from 'crypto';

// ============================================================
// TYPES
// ============================================================

export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export type ExportableResourceType =
  | 'Patient'
  | 'Encounter'
  | 'Condition'
  | 'Observation'     // Vitals + lab results
  | 'MedicationRequest'
  | 'AllergyIntolerance'
  | 'DiagnosticReport'
  | 'ServiceRequest'  // Lab/imaging orders
  | 'ClinicalNote';

export interface BulkExportRequest {
  /** Resource types to export (default: all) */
  _type?: ExportableResourceType[];
  /** Only include resources modified since this date */
  _since?: string;
  /** Organization scope */
  organizationId: string;
  /** Patient filter (empty = all patients in org) */
  patientIds?: string[];
  /** Output format (default: ndjson) */
  _outputFormat?: 'application/fhir+ndjson' | 'application/ndjson';
}

export interface ExportJob {
  id: string;
  status: ExportStatus;
  request: BulkExportRequest;
  progress: number; // 0-100
  resourceCounts: Record<string, number>;
  files: ExportFile[];
  error?: string;
  startedAt: string;
  completedAt?: string;
  expiresAt?: string; // Files auto-delete after this
  requestedBy: string;
}

export interface ExportFile {
  id: string;
  resourceType: string;
  count: number;
  sizeBytes: number;
  url: string; // Relative download URL
}

// ============================================================
// IN-MEMORY JOB STORE (production: use Redis or database)
// ============================================================

const jobs = new Map<string, ExportJob>();

// ============================================================
// EXPORT MANAGER
// ============================================================

const ALL_RESOURCE_TYPES: ExportableResourceType[] = [
  'Patient', 'Encounter', 'Condition', 'Observation',
  'MedicationRequest', 'AllergyIntolerance', 'ServiceRequest',
];

/**
 * Start a new bulk export job.
 * Returns immediately with a job ID; processing happens async.
 */
export function startExportJob(
  request: BulkExportRequest,
  requestedBy: string
): ExportJob {
  const job: ExportJob = {
    id: randomUUID(),
    status: 'pending',
    request,
    progress: 0,
    resourceCounts: {},
    files: [],
    startedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h
    requestedBy,
  };

  jobs.set(job.id, job);

  // Start async processing
  processExportJob(job).catch(err => {
    job.status = 'failed';
    job.error = err instanceof Error ? err.message : String(err);
  });

  return job;
}

/**
 * Get export job status.
 */
export function getExportJob(jobId: string): ExportJob | null {
  return jobs.get(jobId) || null;
}

/**
 * Cancel an export job.
 */
export function cancelExportJob(jobId: string): boolean {
  const job = jobs.get(jobId);
  if (!job || job.status === 'completed' || job.status === 'cancelled') return false;
  job.status = 'cancelled';
  return true;
}

/**
 * List active export jobs for an organization.
 */
export function listExportJobs(organizationId: string): ExportJob[] {
  return Array.from(jobs.values())
    .filter(j => j.request.organizationId === organizationId)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

// ============================================================
// EXPORT PROCESSOR
// ============================================================

async function processExportJob(job: ExportJob): Promise<void> {
  job.status = 'processing';

  const resourceTypes = job.request._type || ALL_RESOURCE_TYPES;
  const totalSteps = resourceTypes.length;
  let completedSteps = 0;

  try {
    // Dynamic import prisma
    const { prisma } = await import('../prisma');

    for (const resourceType of resourceTypes) {
      if (job.status === 'cancelled') return;

      const { records, count } = await exportResourceType(
        prisma,
        resourceType,
        job.request
      );

      if (count > 0) {
        // Convert to NDJSON format
        const ndjson = records.map((r: any) => JSON.stringify(r)).join('\n');
        const fileId = randomUUID();

        job.files.push({
          id: fileId,
          resourceType,
          count,
          sizeBytes: Buffer.byteLength(ndjson, 'utf-8'),
          url: `/api/fhir/$export/${job.id}/files/${fileId}`,
        });

        // In production, write to S3/blob storage
        // For now, store in memory (limited to small datasets)
        exportFileData.set(fileId, ndjson);
      }

      job.resourceCounts[resourceType] = count;
      completedSteps++;
      job.progress = Math.round((completedSteps / totalSteps) * 100);
    }

    job.status = 'completed';
    job.completedAt = new Date().toISOString();

  } catch (error) {
    job.status = 'failed';
    job.error = error instanceof Error ? error.message : String(error);
  }
}

// File data store (production: use S3/blob storage)
const exportFileData = new Map<string, string>();

/**
 * Get NDJSON data for an export file.
 */
export function getExportFileData(fileId: string): string | null {
  return exportFileData.get(fileId) || null;
}

// ============================================================
// RESOURCE EXPORTERS
// ============================================================

async function exportResourceType(
  prisma: any,
  resourceType: ExportableResourceType,
  request: BulkExportRequest
): Promise<{ records: unknown[]; count: number }> {
  const since = request._since ? new Date(request._since) : undefined;
  const patientFilter = request.patientIds?.length
    ? { patientId: { in: request.patientIds } }
    : {};

  switch (resourceType) {
    case 'Patient': {
      const patients = await prisma.patient.findMany({
        where: {
          deletedAt: null,
          ...(since ? { updatedAt: { gte: since } } : {}),
        },
        take: 10000,
      });
      return {
        records: patients.map(toFhirPatient),
        count: patients.length,
      };
    }

    case 'Encounter': {
      const encounters = await prisma.encounter.findMany({
        where: {
          deletedAt: null,
          ...patientFilter,
          ...(since ? { updatedAt: { gte: since } } : {}),
        },
        take: 10000,
      });
      return {
        records: encounters.map(toFhirEncounter),
        count: encounters.length,
      };
    }

    case 'Condition': {
      const conditions = await prisma.condition.findMany({
        where: {
          deletedAt: null,
          ...patientFilter,
          ...(since ? { updatedAt: { gte: since } } : {}),
        },
        take: 10000,
      });
      return {
        records: conditions.map(toFhirCondition),
        count: conditions.length,
      };
    }

    case 'Observation': {
      // Export vitals + lab results as FHIR Observations
      const vitals = await prisma.vitalSign.findMany({
        where: {
          deletedAt: null,
          ...patientFilter,
          ...(since ? { createdAt: { gte: since } } : {}),
        },
        take: 10000,
      });
      const labResults = await prisma.labResult.findMany({
        where: {
          deletedAt: null,
          ...patientFilter,
          ...(since ? { createdAt: { gte: since } } : {}),
        },
        take: 10000,
      });
      const records = [
        ...vitals.map(toFhirVitalObservation),
        ...labResults.map(toFhirLabObservation),
      ];
      return { records, count: records.length };
    }

    case 'MedicationRequest': {
      const meds = await prisma.medicationOrder.findMany({
        where: {
          deletedAt: null,
          ...patientFilter,
          ...(since ? { updatedAt: { gte: since } } : {}),
        },
        take: 10000,
      });
      return {
        records: meds.map(toFhirMedicationRequest),
        count: meds.length,
      };
    }

    case 'AllergyIntolerance': {
      const allergies = await prisma.allergy.findMany({
        where: {
          deletedAt: null,
          ...patientFilter,
          ...(since ? { updatedAt: { gte: since } } : {}),
        },
        take: 10000,
      });
      return {
        records: allergies.map(toFhirAllergyIntolerance),
        count: allergies.length,
      };
    }

    case 'ServiceRequest': {
      const labOrders = await prisma.labOrder.findMany({
        where: {
          deletedAt: null,
          ...patientFilter,
          ...(since ? { updatedAt: { gte: since } } : {}),
        },
        take: 10000,
      });
      return {
        records: labOrders.map(toFhirServiceRequest),
        count: labOrders.length,
      };
    }

    default:
      return { records: [], count: 0 };
  }
}

// ============================================================
// FHIR R4 RESOURCE CONVERTERS
// ============================================================

function toFhirPatient(p: any) {
  return {
    resourceType: 'Patient',
    id: p.id,
    identifier: [{ system: 'urn:attending:mrn', value: p.mrn }],
    name: [{ family: p.lastName, given: [p.firstName, p.middleName].filter(Boolean) }],
    birthDate: p.dateOfBirth?.toISOString().slice(0, 10),
    gender: p.gender?.toLowerCase() || 'unknown',
    telecom: [
      ...(p.phone ? [{ system: 'phone', value: p.phone }] : []),
      ...(p.email ? [{ system: 'email', value: p.email }] : []),
    ],
    address: p.address ? [{
      line: [p.address],
      city: p.city,
      state: p.state,
      postalCode: p.zipCode,
    }] : [],
    active: p.isActive,
  };
}

function toFhirEncounter(e: any) {
  return {
    resourceType: 'Encounter',
    id: e.id,
    status: e.status?.toLowerCase() || 'unknown',
    class: { code: e.encounterType?.toLowerCase() || 'AMB' },
    subject: { reference: `Patient/${e.patientId}` },
    participant: [{ individual: { reference: `Practitioner/${e.providerId}` } }],
    period: { start: e.startTime?.toISOString(), end: e.endTime?.toISOString() },
    reasonCode: e.chiefComplaint ? [{ text: e.chiefComplaint }] : [],
  };
}

function toFhirCondition(c: any) {
  return {
    resourceType: 'Condition',
    id: c.id,
    subject: { reference: `Patient/${c.patientId}` },
    code: { coding: [{ system: 'http://hl7.org/fhir/sid/icd-10', code: c.icdCode }], text: c.description },
    clinicalStatus: { coding: [{ code: c.status?.toLowerCase() || 'active' }] },
    onsetDateTime: c.onsetDate?.toISOString(),
  };
}

function toFhirVitalObservation(v: any) {
  const observations: any[] = [];
  if (v.heartRate) observations.push({ code: '8867-4', display: 'Heart rate', value: v.heartRate, unit: '/min' });
  if (v.bloodPressureSystolic) observations.push({ code: '8480-6', display: 'Systolic BP', value: v.bloodPressureSystolic, unit: 'mmHg' });
  if (v.temperature) observations.push({ code: '8310-5', display: 'Temperature', value: v.temperature, unit: v.temperatureUnit || 'F' });
  if (v.oxygenSaturation) observations.push({ code: '2708-6', display: 'SpO2', value: v.oxygenSaturation, unit: '%' });

  return {
    resourceType: 'Observation',
    id: v.id,
    status: 'final',
    category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs' }] }],
    subject: { reference: `Patient/${v.patientId}` },
    effectiveDateTime: v.recordedAt?.toISOString(),
    component: observations.map(o => ({
      code: { coding: [{ system: 'http://loinc.org', code: o.code, display: o.display }] },
      valueQuantity: { value: o.value, unit: o.unit },
    })),
  };
}

function toFhirLabObservation(l: any) {
  return {
    resourceType: 'Observation',
    id: l.id,
    status: l.status?.toLowerCase() || 'final',
    category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'laboratory' }] }],
    code: {
      coding: l.loincCode ? [{ system: 'http://loinc.org', code: l.loincCode }] : [],
      text: l.testName,
    },
    subject: { reference: `Patient/${l.patientId}` },
    valueString: l.value,
    referenceRange: l.referenceRange ? [{ text: l.referenceRange }] : [],
    interpretation: l.interpretation ? [{ coding: [{ code: l.interpretation }] }] : [],
    effectiveDateTime: l.performedAt?.toISOString() || l.reportedAt?.toISOString(),
  };
}

function toFhirMedicationRequest(m: any) {
  return {
    resourceType: 'MedicationRequest',
    id: m.id,
    status: m.status?.toLowerCase() || 'active',
    intent: 'order',
    medicationCodeableConcept: {
      coding: m.rxnormCode ? [{ system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: m.rxnormCode }] : [],
      text: m.medicationName,
    },
    subject: { reference: `Patient/${m.patientId}` },
    requester: { reference: `Practitioner/${m.providerId}` },
    dosageInstruction: [{ text: `${m.dose} ${m.route} ${m.frequency}` }],
    authoredOn: m.orderedAt?.toISOString(),
  };
}

function toFhirAllergyIntolerance(a: any) {
  return {
    resourceType: 'AllergyIntolerance',
    id: a.id,
    clinicalStatus: { coding: [{ code: a.status?.toLowerCase() || 'active' }] },
    code: { text: a.allergen },
    patient: { reference: `Patient/${a.patientId}` },
    reaction: a.reaction ? [{ description: a.reaction, severity: a.severity?.toLowerCase() }] : [],
    onsetDateTime: a.onsetDate?.toISOString(),
  };
}

function toFhirServiceRequest(o: any) {
  return {
    resourceType: 'ServiceRequest',
    id: o.id,
    status: o.status?.toLowerCase() || 'active',
    intent: 'order',
    category: [{ coding: [{ code: '108252007', display: 'Laboratory procedure' }] }],
    subject: { reference: `Patient/${o.patientId}` },
    requester: { reference: `Practitioner/${o.providerId}` },
    code: { text: o.tests },
    priority: o.priority?.toLowerCase() || 'routine',
    authoredOn: o.orderedAt?.toISOString(),
  };
}

export default {
  startExportJob,
  getExportJob,
  cancelExportJob,
  listExportJobs,
  getExportFileData,
};
