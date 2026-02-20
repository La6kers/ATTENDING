// ============================================================
// ATTENDING AI - Tenant Onboarding Admin Endpoint
// apps/provider-portal/pages/api/admin/onboard-tenant.ts
//
// POST /api/admin/onboard-tenant → Provision new organization
// ============================================================

import { createHandler } from '@attending/shared/lib/api/handler';
import { onboardTenant } from '../../../../scripts/onboard-tenant';
import { AuditActions } from '@attending/shared/lib/audit';

async function getPrisma() {
  const { prisma } = await import('@attending/shared/lib/prisma');
  return prisma;
}

export default createHandler({
  methods: ['POST'],
  auth: 'admin',
  audit: AuditActions.SYSTEM_CONFIG_CHANGED,
  auditResource: 'System',

  handler: async (req, ctx) => {
    const prisma = await getPrisma();

    const { name, domain, adminEmail, adminName, ehrSystem, fhirBaseUrl, createApiKey, enableWebhooks } = req.body;

    if (!name || !domain || !adminEmail || !adminName) {
      ctx.error(400, 'VALIDATION_ERROR' as any, 'Required: name, domain, adminEmail, adminName');
      return;
    }

    const result = await onboardTenant({
      name,
      domain,
      adminEmail,
      adminName,
      ehrSystem,
      fhirBaseUrl,
      createApiKey: createApiKey !== false,
      enableWebhooks: enableWebhooks === true,
    }, prisma);

    if (result.success) {
      ctx.log.info('Tenant onboarded', { orgId: result.organizationId, name });
      ctx.success(201, {
        organizationId: result.organizationId,
        adminUserId: result.adminUserId,
        adminTemporaryPassword: result.adminTemporaryPassword,
        apiKey: result.apiKey,
        apiKeyId: result.apiKeyId,
        webhookSecret: result.webhookSecret,
        integrationId: result.integrationId,
        steps: result.steps,
        message: 'Store credentials securely — they cannot be retrieved again.',
      });
    } else {
      ctx.error(500, 'INTERNAL_ERROR' as any, 'Onboarding failed', { steps: result.steps });
    }
  },
});
