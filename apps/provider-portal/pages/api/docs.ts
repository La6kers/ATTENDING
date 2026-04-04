// ============================================================
// ATTENDING AI - API Documentation Endpoint
// apps/provider-portal/pages/api/docs.ts
//
// GET /api/docs       → OpenAPI 3.1 JSON spec
// GET /api/docs?ui=1  → Redirect to Swagger UI (petstore viewer)
//
// No authentication required (spec is not PHI).
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { generateOpenAPISpec } from '@attending/shared/lib/openapi';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Swagger UI redirect
  if (req.query.ui) {
    const specUrl = `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}/api/docs`;
    const swaggerUrl = `https://petstore.swagger.io/?url=${encodeURIComponent(specUrl)}`;
    return res.redirect(302, swaggerUrl);
  }

  const spec = generateOpenAPISpec();

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
  // CORS — use shared origin-validated middleware instead of wildcard
  const { cors: applyCors } = await import('@attending/shared/lib/cors');
  await applyCors(req, res);
  return res.status(200).json(spec);
}
