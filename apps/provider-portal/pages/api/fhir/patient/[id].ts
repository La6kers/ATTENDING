// ============================================================
// FHIR API Routes - Patient Data
// apps/provider-portal/pages/api/fhir/patient/[id].ts
//
// Fetches patient data from connected EHR via FHIR R4
// Includes: demographics, allergies, medications, conditions
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth, createAuditLog } from '@/lib/api/auth';
import { prisma } from '@/lib/api/prisma';

// Note: In production, import from @attending/fhir
// For now, we'll use a mock/fallback implementation

// ============================================================
// TYPES
// ============================================================

interface PatientSummary {
  patient: any;
  conditions: any[];
  medications: any[];
  allergies: any[];
  recentVitals: any[];
  recentLabs: any[];
  retrievedAt: string;
}

interface FHIRPatientResponse {
  success: boolean;
  data?: PatientSummary;
  cached?: boolean;
  cachedAt?: string;
  error?: string;
  ehrSystem?: string;
}

// ============================================================
// FHIR CLIENT STUB (until package is properly linked)
// ============================================================

const fhirClientStub = {
  isReady: () => {
    // Check if FHIR is configured
    return !!(
      process.env.FHIR_BASE_URL &&
      process.env.FHIR_CLIENT_ID
    );
  },
  
  getPatientSummary: async (patientId: string): Promise<PatientSummary> => {
    // In production, this would call the actual FHIR client
    // For now, return a placeholder
    throw new Error('FHIR client not configured - using local data');
  }
};

// ============================================================
// HANDLER
// ============================================================

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<FHIRPatientResponse>,
  session: any
) {
  const { id } = req.query;
  const patientId = Array.isArray(id) ? id[0] : id;

  if (!patientId) {
    return res.status(400).json({
      success: false,
      error: 'Patient ID is required',
    });
  }

  switch (req.method) {
    case 'GET':
      return getPatientFromEHR(req, res, session, patientId);
    default:
      res.setHeader('Allow', ['GET']);
      return res.status(405).json({
        success: false,
        error: `Method ${req.method} not allowed`,
      });
  }
}

// ============================================================
// GET - Fetch Patient from EHR
// ============================================================

async function getPatientFromEHR(
  req: NextApiRequest,
  res: NextApiResponse<FHIRPatientResponse>,
  session: any,
  patientId: string
) {
  const { refresh = 'false' } = req.query;
  const forceRefresh = refresh === 'true';

  try {
    // Check if we have a cached patient in our database
    const localPatient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        allergies: true,
        medications: { where: { isActive: true } },
        conditions: { where: { status: 'ACTIVE' } },
        vitals: { orderBy: { recordedAt: 'desc' }, take: 10 },
      },
    });

    // Check if FHIR client is configured and connected
    if (!fhirClientStub.isReady()) {
      // Return local data if FHIR is not configured
      if (localPatient) {
        await createAuditLog(
          session.user.id,
          'VIEW',
          'Patient',
          patientId,
          { source: 'local', fhirUnavailable: true },
          req
        );

        return res.status(200).json({
          success: true,
          data: mapLocalPatientToSummary(localPatient),
          cached: true,
          cachedAt: localPatient.updatedAt.toISOString(),
        });
      }

      return res.status(404).json({
        success: false,
        error: 'Patient not found',
      });
    }

    // Fetch from EHR
    try {
      const ehrPatientId = localPatient?.mrn || patientId;
      const patientSummary = await fhirClientStub.getPatientSummary(ehrPatientId);

      // Log the EHR access
      await createAuditLog(
        session.user.id,
        'FHIR_PATIENT_FETCH',
        'Patient',
        patientId,
        {
          ehrPatientId,
          source: 'ehr',
        },
        req
      );

      return res.status(200).json({
        success: true,
        data: patientSummary,
        cached: false,
      });
    } catch (fhirError: any) {
      console.error('[FHIR] Patient fetch failed:', fhirError);

      // Fallback to local data if EHR fetch fails
      if (localPatient) {
        await createAuditLog(
          session.user.id,
          'VIEW',
          'Patient',
          patientId,
          { source: 'local', fhirError: fhirError.message },
          req
        );

        return res.status(200).json({
          success: true,
          data: mapLocalPatientToSummary(localPatient),
          cached: true,
          cachedAt: localPatient.updatedAt.toISOString(),
          error: 'EHR temporarily unavailable, showing cached data',
        });
      }

      throw fhirError;
    }
  } catch (error: any) {
    console.error('[API] FHIR patient fetch error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch patient data',
    });
  }
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Map local Prisma patient to PatientSummary format
 */
function mapLocalPatientToSummary(patient: any): PatientSummary {
  return {
    patient: {
      resourceType: 'Patient',
      id: patient.id,
      name: [{
        use: 'official',
        family: patient.lastName,
        given: [patient.firstName, patient.middleName].filter(Boolean),
      }],
      birthDate: patient.dateOfBirth?.toISOString().split('T')[0],
      gender: patient.gender?.toLowerCase() || 'unknown',
      telecom: [
        patient.phone && { system: 'phone', value: patient.phone },
        patient.email && { system: 'email', value: patient.email },
      ].filter(Boolean),
      address: patient.address ? [{
        use: 'home',
        line: [patient.address],
        city: patient.city,
        state: patient.state,
        postalCode: patient.zipCode,
      }] : undefined,
    },
    conditions: patient.conditions?.map((c: any) => ({
      resourceType: 'Condition',
      id: c.id,
      code: {
        coding: [{ code: c.code, display: c.name }],
        text: c.name,
      },
      clinicalStatus: {
        coding: [{ code: c.status?.toLowerCase() || 'active' }],
      },
      onsetDateTime: c.onsetDate?.toISOString(),
    })) || [],
    medications: patient.medications?.map((m: any) => ({
      resourceType: 'MedicationRequest',
      id: m.id,
      status: m.isActive ? 'active' : 'stopped',
      medicationCodeableConcept: {
        coding: [{ code: m.medicationCode, display: m.medicationName }],
        text: m.medicationName,
      },
      dosageInstruction: m.dosage ? [{ text: m.dosage }] : undefined,
    })) || [],
    allergies: patient.allergies?.map((a: any) => ({
      resourceType: 'AllergyIntolerance',
      id: a.id,
      code: {
        coding: [{ display: a.allergen }],
        text: a.allergen,
      },
      reaction: a.reaction ? [{
        manifestation: [{ coding: [{ display: a.reaction }] }],
        severity: a.severity?.toLowerCase(),
      }] : undefined,
      criticality: a.severity === 'LIFE_THREATENING' ? 'high' : 
                   a.severity === 'SEVERE' ? 'high' : 'low',
    })) || [],
    recentVitals: patient.vitals?.map((v: any) => ({
      resourceType: 'Observation',
      id: v.id,
      effectiveDateTime: v.recordedAt?.toISOString(),
      component: [
        v.systolicBP && { code: { coding: [{ code: '8480-6', display: 'Systolic BP' }] }, valueQuantity: { value: v.systolicBP, unit: 'mmHg' } },
        v.diastolicBP && { code: { coding: [{ code: '8462-4', display: 'Diastolic BP' }] }, valueQuantity: { value: v.diastolicBP, unit: 'mmHg' } },
        v.heartRate && { code: { coding: [{ code: '8867-4', display: 'Heart Rate' }] }, valueQuantity: { value: v.heartRate, unit: '/min' } },
        v.temperature && { code: { coding: [{ code: '8310-5', display: 'Temperature' }] }, valueQuantity: { value: v.temperature, unit: '°F' } },
        v.respiratoryRate && { code: { coding: [{ code: '9279-1', display: 'Respiratory Rate' }] }, valueQuantity: { value: v.respiratoryRate, unit: '/min' } },
        v.oxygenSaturation && { code: { coding: [{ code: '2708-6', display: 'SpO2' }] }, valueQuantity: { value: v.oxygenSaturation, unit: '%' } },
      ].filter(Boolean),
    })) || [],
    recentLabs: [],
    retrievedAt: new Date().toISOString(),
  };
}

export default requireAuth(handler);
