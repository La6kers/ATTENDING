// ============================================================
// ATTENDING AI - Feature Flags Admin Endpoint
// GET  /api/admin/features  → List all features + values for org
// POST /api/admin/features  → Set feature override for org
// ============================================================

import { createHandler } from '@attending/shared/lib/api/handler';
import { getAllFeatures, setOverride, clearCache } from '@attending/shared/lib/featureFlags';

export default createHandler({
  methods: ['GET', 'POST'],
  auth: 'admin',

  handler: async (req, ctx) => {
    const orgId = ctx.user?.organizationId;

    switch (req.method) {
      case 'GET': {
        const targetOrg = (req.query.organizationId as string) || orgId;
        const features = await getAllFeatures(targetOrg);
        ctx.success({
          organizationId: targetOrg,
          features,
          totalFeatures: features.length,
          enabledCount: features.filter(f => Boolean(f.currentValue) === true).length,
        });
        break;
      }

      case 'POST': {
        const { featureKey, value, organizationId: targetOrg } = req.body;
        const org = targetOrg || orgId;

        if (!featureKey || value === undefined || !org) {
          ctx.error(400, 'VALIDATION_ERROR' as any, 'Required: featureKey, value, organizationId');
          return;
        }

        await setOverride(org, featureKey, value);
        clearCache(org);

        ctx.log.info('Feature flag updated', { org, featureKey, value, by: ctx.user?.id });
        ctx.success({ organizationId: org, featureKey, value, updated: true });
        break;
      }
    }
  },
});
