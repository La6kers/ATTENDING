// ============================================================
// ATTENDING AI - Bulk Export File Download
// apps/provider-portal/pages/api/fhir/export-files/[fileId].ts
//
// GET /api/fhir/export-files/:fileId → Download NDJSON file
//
// Returns: application/fhir+ndjson stream
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getExportFileData } from '@attending/shared/lib/integrations/bulkExport';
import { validateApiKey } from '@attending/shared/lib/auth/apiKeys';
import { getToken } from 'next-auth/jwt';
import { logger } from '@attending/shared/lib/logging';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Auth: API key or session
  const apiKeyHeader = req.headers['x-api-key'] as string;
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!apiKeyHeader && !token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const fileId = req.query.fileId as string;
  if (!fileId) {
    return res.status(400).json({ error: 'Missing fileId' });
  }

  const data = getExportFileData(fileId);
  if (!data) {
    return res.status(404).json({ error: 'File not found or expired' });
  }

  logger.info('[BulkExport] File download', { fileId, size: data.length });

  res.setHeader('Content-Type', 'application/fhir+ndjson');
  res.setHeader('Content-Disposition', `attachment; filename="export-${fileId}.ndjson"`);
  res.status(200).send(data);
}
