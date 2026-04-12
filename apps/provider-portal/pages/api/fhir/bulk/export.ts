// ============================================================
// ATTENDING AI - FHIR Bulk Data Export Endpoint
// apps/provider-portal/pages/api/fhir/bulk/export.ts
//
// Implements the FHIR Bulk Data Access IG (HL7 FHIR R4)
// for population health reporting and value-based care contracts.
//
// Required for:
//   - ONC Health IT Certification (§170.315(g)(10))
//   - ACO/MSSP market segment
//   - USCDI compliance
//
// Spec: https://hl7.org/fhir/uv/bulkdata/
//
// Endpoints:
//   POST /api/fhir/bulk/export - Kick off export
//   GET  /api/fhir/bulk/export?jobId=xxx - Check status
//   DELETE /api/fhir/bulk/export?jobId=xxx - Cancel job
//
// Job persistence: Redis with 7-day TTL for completed jobs
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import redis from '@attending/shared/lib/redis/client';

// ============================================================
// Types
// ============================================================

type ExportStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';

interface BulkExportJob {
  id: string;
  status: ExportStatus;
  resourceTypes: string[];
  since?: string;
  outputFormat: 'application/fhir+ndjson' | 'application/ndjson';
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  transactionTime?: string;
  percentComplete: number;
  output: Array<{
    type: string;
    url: string;
    count: number;
  }>;
  error: Array<{
    type: string;
    url: string;
    count: number;
  }>;
  requestUrl: string;
  requiresAccessToken: boolean;
  organizationId: string;
}

// ============================================================
// Redis Job Store
// ============================================================

const JOB_KEY_PREFIX = 'fhir:bulk:job:';
const JOB_TTL_ACTIVE = 86400;         // 24 hours for active jobs
const JOB_TTL_COMPLETED = 604800;     // 7 days for completed/failed jobs

async function getJob(jobId: string): Promise<BulkExportJob | null> {
  try {
    const raw = await redis.get(`${JOB_KEY_PREFIX}${jobId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function saveJob(job: BulkExportJob): Promise<void> {
  const ttl = ['completed', 'failed', 'cancelled'].includes(job.status)
    ? JOB_TTL_COMPLETED
    : JOB_TTL_ACTIVE;

  await redis.set(
    `${JOB_KEY_PREFIX}${job.id}`,
    JSON.stringify(job),
    ttl
  );
}

// FHIR USCDI required resource types
const SUPPORTED_RESOURCE_TYPES = [
  'Patient',
  'AllergyIntolerance',
  'Condition',
  'DiagnosticReport',
  'Encounter',
  'Immunization',
  'MedicationRequest',
  'Observation',
  'Procedure',
  'ServiceRequest',
  'DocumentReference',
];

// ============================================================
// Handler
// ============================================================

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case 'POST':
      return handleKickOff(req, res);
    case 'GET':
      return handleStatusCheck(req, res);
    case 'DELETE':
      return handleCancel(req, res);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

// ============================================================
// POST - Kick Off Export ($export operation)
// FHIR Spec: The server SHALL respond with a 202 Accepted
// and Content-Location header with the polling URL.
// ============================================================

async function handleKickOff(req: NextApiRequest, res: NextApiResponse) {
  const {
    _type,               // Comma-separated resource types
    _since,              // Only resources updated since this date
    _outputFormat,       // Output format (default: ndjson)
  } = req.body || {};

  // Parse resource types
  const resourceTypes = _type
    ? _type.split(',').filter((t: string) => SUPPORTED_RESOURCE_TYPES.includes(t.trim()))
    : SUPPORTED_RESOURCE_TYPES;

  // Validate _since if provided
  if (_since && isNaN(Date.parse(_since))) {
    return res.status(400).json({
      resourceType: 'OperationOutcome',
      issue: [{
        severity: 'error',
        code: 'invalid',
        diagnostics: `Invalid _since parameter: ${_since}`,
      }],
    });
  }

  // Create export job
  const jobId = `bulk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const job: BulkExportJob = {
    id: jobId,
    status: 'queued',
    resourceTypes,
    since: _since,
    outputFormat: _outputFormat || 'application/fhir+ndjson',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    percentComplete: 0,
    output: [],
    error: [],
    requestUrl: `${req.headers.host}/api/fhir/bulk/export`,
    requiresAccessToken: true,
    organizationId: (req as any).organizationId || 'default',
  };

  await saveJob(job);

  // Start async processing (in production: queue to Bull/BullMQ)
  processExportJob(jobId).catch(async (err) => {
    console.error(`[FHIR:BULK] Job ${jobId} failed:`, err);
    const j = await getJob(jobId);
    if (j) {
      j.status = 'failed';
      j.updatedAt = new Date().toISOString();
      await saveJob(j);
    }
  });

  console.log(`[FHIR:BULK] Export kicked off: ${jobId} (${resourceTypes.length} types)`);

  // FHIR spec: 202 Accepted with Content-Location header
  res.setHeader('Content-Location', `/api/fhir/bulk/export?jobId=${jobId}`);
  return res.status(202).end();
}

// ============================================================
// GET - Status Check (Polling endpoint)
// FHIR Spec:
//   - In progress: 202 with X-Progress header
//   - Complete: 200 with response body
//   - Error: 5xx with OperationOutcome
// ============================================================

async function handleStatusCheck(req: NextApiRequest, res: NextApiResponse) {
  const { jobId } = req.query;

  if (!jobId || typeof jobId !== 'string') {
    return res.status(400).json({
      resourceType: 'OperationOutcome',
      issue: [{ severity: 'error', code: 'required', diagnostics: 'jobId is required' }],
    });
  }

  const job = await getJob(jobId);
  if (!job) {
    return res.status(404).json({
      resourceType: 'OperationOutcome',
      issue: [{ severity: 'error', code: 'not-found', diagnostics: `Job ${jobId} not found` }],
    });
  }

  if (job.status === 'queued' || job.status === 'processing') {
    res.setHeader('X-Progress', `${job.percentComplete}%`);
    res.setHeader('Retry-After', '10');
    return res.status(202).end();
  }

  if (job.status === 'failed') {
    return res.status(500).json({
      resourceType: 'OperationOutcome',
      issue: [{ severity: 'error', code: 'exception', diagnostics: 'Export failed' }],
    });
  }

  if (job.status === 'completed') {
    return res.status(200).json({
      transactionTime: job.transactionTime || job.completedAt,
      request: job.requestUrl,
      requiresAccessToken: job.requiresAccessToken,
      output: job.output,
      error: job.error,
    });
  }

  return res.status(500).json({ error: 'Unknown job status' });
}

// ============================================================
// DELETE - Cancel Export
// ============================================================

async function handleCancel(req: NextApiRequest, res: NextApiResponse) {
  const { jobId } = req.query;

  if (!jobId || typeof jobId !== 'string') {
    return res.status(400).json({ error: 'jobId is required' });
  }

  const job = await getJob(jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  job.status = 'cancelled';
  job.updatedAt = new Date().toISOString();
  await saveJob(job);

  console.log(`[FHIR:BULK] Job ${jobId} cancelled`);
  return res.status(202).end();
}

// ============================================================
// Async Export Processing
// In production: this would run as a background worker via
// Bull/BullMQ with Redis-backed queues
// ============================================================

async function processExportJob(jobId: string): Promise<void> {
  const job = await getJob(jobId);
  if (!job) return;

  job.status = 'processing';
  job.updatedAt = new Date().toISOString();
  await saveJob(job);

  const totalTypes = job.resourceTypes.length;

  for (let i = 0; i < totalTypes; i++) {
    // Re-read from Redis to check for cancellation
    const currentJob = await getJob(jobId);
    if (!currentJob || currentJob.status === 'cancelled') return;

    const resourceType = job.resourceTypes[i];
    job.percentComplete = Math.round(((i + 1) / totalTypes) * 100);
    job.updatedAt = new Date().toISOString();

    // Simulate export processing time
    // TODO: Replace with real Prisma → FHIR R4 mapping → NDJSON → Azure Blob
    await new Promise(resolve => setTimeout(resolve, 500));

    const blobUrl = `/api/fhir/bulk/download/${jobId}/${resourceType}.ndjson`;
    job.output.push({
      type: resourceType,
      url: blobUrl,
      count: Math.floor(Math.random() * 100) + 1, // Simulated until real export wired
    });

    // Save progress to Redis after each resource type
    await saveJob(job);
  }

  job.status = 'completed';
  job.completedAt = new Date().toISOString();
  job.transactionTime = job.completedAt;
  job.percentComplete = 100;
  await saveJob(job);

  console.log(`[FHIR:BULK] Job ${jobId} completed: ${job.output.length} types exported`);
}
