// ============================================================
// ATTENDING AI - API Key Management Endpoint
// apps/provider-portal/pages/api/admin/api-keys.ts
//
// POST   /api/admin/api-keys          → Create new key (returns plaintext once)
// GET    /api/admin/api-keys          → List keys for organization
// DELETE /api/admin/api-keys?id=xxx   → Revoke key
//
// Admin-only endpoint.
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { createHandler } from '@attending/shared/lib/api/handler';
import {
  createApiKeyRecord,
  listApiKeys,
  revokeApiKey,
  API_KEY_SCOPES,
  type ApiKeyScope,
} from '@attending/shared/lib/auth/apiKeys';
import { AuditActions } from '@attending/shared/lib/audit';

async function getPrisma() {
  const { prisma } = await import('@attending/shared/lib/prisma');
  return prisma;
}

const CreateKeySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  scopes: z.array(z.string()).min(1),
  rateLimit: z.number().min(1).max(10000).optional(),
  expiresInDays: z.number().min(1).max(365).optional(),
});

export default createHandler({
  methods: ['GET', 'POST', 'DELETE'],
  auth: 'admin',
  audit: AuditActions.SYSTEM_CONFIG_CHANGED,
  auditResource: 'System',

  handler: async (req, ctx) => {
    const prisma = await getPrisma();

    switch (req.method) {
      case 'GET': {
        const orgId = ctx.user!.organizationId || 'default';
        const keys = await listApiKeys(prisma, orgId);
        ctx.success(keys);
        break;
      }

      case 'POST': {
        const body = CreateKeySchema.parse(req.body);
        const orgId = ctx.user!.organizationId || 'default';

        const expiresAt = body.expiresInDays
          ? new Date(Date.now() + body.expiresInDays * 86400000)
          : undefined;

        const { key, record } = await createApiKeyRecord(prisma, {
          name: body.name,
          description: body.description,
          organizationId: orgId,
          scopes: body.scopes as ApiKeyScope[],
          rateLimit: body.rateLimit,
          expiresAt,
          createdBy: ctx.user!.id,
        });

        ctx.log.info('API key created', { keyId: record.id, name: body.name });

        // Return plaintext key ONCE — never stored or retrievable again
        ctx.success(201, {
          id: record.id,
          key,   // ⚠️ Only returned at creation time
          name: body.name,
          scopes: body.scopes,
          expiresAt,
          message: 'Store this key securely — it cannot be retrieved again.',
        });
        break;
      }

      case 'DELETE': {
        const keyId = req.query.id as string;
        if (!keyId) {
          ctx.error(400, 'VALIDATION_ERROR' as any, 'Missing key ID');
          return;
        }

        await revokeApiKey(prisma, keyId);
        ctx.log.info('API key revoked', { keyId });
        ctx.success({ id: keyId, revoked: true });
        break;
      }
    }
  },
});
