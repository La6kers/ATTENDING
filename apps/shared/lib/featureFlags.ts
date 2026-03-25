// ============================================================
// ATTENDING AI - Feature Flags & Tenant Configuration
// apps/shared/lib/featureFlags.ts
//
// Per-organization feature toggles for AI modules, integrations,
// UI features, compliance modes, and billing tier limits.
// ============================================================

import { logger } from './logging';

export interface FeatureDefinition {
  key: string;
  description: string;
  defaultValue: boolean | number | string;
  category: 'ai' | 'integration' | 'ui' | 'compliance' | 'limits' | 'billing';
  tier?: 'free' | 'standard' | 'enterprise';
}

const FEATURES: Record<string, FeatureDefinition> = {
  'ai.triage': { key: 'ai.triage', description: 'AI-assisted ESI triage classification', defaultValue: true, category: 'ai', tier: 'standard' },
  'ai.differential': { key: 'ai.differential', description: 'AI differential diagnosis engine', defaultValue: true, category: 'ai', tier: 'standard' },
  'ai.scribe': { key: 'ai.scribe', description: 'AI clinical note generation (scribe)', defaultValue: false, category: 'ai', tier: 'enterprise' },
  'ai.drugInteraction': { key: 'ai.drugInteraction', description: 'AI drug interaction checker', defaultValue: true, category: 'ai', tier: 'standard' },
  'ai.riskPrediction': { key: 'ai.riskPrediction', description: 'AI patient risk score prediction', defaultValue: false, category: 'ai', tier: 'enterprise' },
  'ai.redFlags': { key: 'ai.redFlags', description: 'AI clinical red flag detection', defaultValue: true, category: 'ai', tier: 'standard' },
  'integration.hl7v2': { key: 'integration.hl7v2', description: 'HL7v2 message send/receive', defaultValue: true, category: 'integration', tier: 'standard' },
  'integration.fhir': { key: 'integration.fhir', description: 'FHIR R4 API access', defaultValue: true, category: 'integration', tier: 'standard' },
  'integration.webhooks': { key: 'integration.webhooks', description: 'Outbound webhook event delivery', defaultValue: true, category: 'integration', tier: 'standard' },
  'integration.bulkExport': { key: 'integration.bulkExport', description: 'FHIR Bulk Data Export ($export)', defaultValue: false, category: 'integration', tier: 'enterprise' },
  'integration.csvImport': { key: 'integration.csvImport', description: 'CSV/JSON batch data import', defaultValue: true, category: 'integration', tier: 'standard' },
  'ui.patientPortal': { key: 'ui.patientPortal', description: 'Patient-facing portal access', defaultValue: true, category: 'ui' },
  'ui.secureMessaging': { key: 'ui.secureMessaging', description: 'Provider-patient secure messaging', defaultValue: false, category: 'ui', tier: 'enterprise' },
  'ui.customBranding': { key: 'ui.customBranding', description: 'Custom logo and color scheme', defaultValue: false, category: 'ui', tier: 'enterprise' },
  'compliance.hipaaStrict': { key: 'compliance.hipaaStrict', description: 'Strict HIPAA mode (extra audit, session timeout)', defaultValue: true, category: 'compliance' },
  'compliance.fieldEncryption': { key: 'compliance.fieldEncryption', description: 'Field-level PHI encryption at rest', defaultValue: true, category: 'compliance' },
  'compliance.deIdentification': { key: 'compliance.deIdentification', description: 'Safe Harbor de-identification for exports', defaultValue: true, category: 'compliance' },
  'limits.maxUsers': { key: 'limits.maxUsers', description: 'Maximum active users per organization', defaultValue: 50, category: 'limits', tier: 'standard' },
  'limits.maxApiKeysPerOrg': { key: 'limits.maxApiKeysPerOrg', description: 'Maximum API keys per organization', defaultValue: 10, category: 'limits' },
  'limits.maxWebhooksPerOrg': { key: 'limits.maxWebhooksPerOrg', description: 'Maximum webhook subscriptions per org', defaultValue: 20, category: 'limits' },
  'limits.maxApiCallsPerDay': { key: 'limits.maxApiCallsPerDay', description: 'Daily API call limit', defaultValue: 10000, category: 'limits', tier: 'standard' },
  'limits.maxBulkExportRecords': { key: 'limits.maxBulkExportRecords', description: 'Maximum records per bulk export', defaultValue: 100000, category: 'limits', tier: 'enterprise' },
};

// Cache
const orgOverrideCache = new Map<string, { data: Record<string, any>; expiresAt: number }>();
const CACHE_TTL = 60_000;

async function getOrgOverrides(organizationId: string): Promise<Record<string, any>> {
  const cached = orgOverrideCache.get(organizationId);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  try {
    const { redis } = await import('./redis');
    if (redis) {
      const raw = await redis.get(`feature_flags:${organizationId}`);
      if (raw) {
        const data = JSON.parse(raw);
        orgOverrideCache.set(organizationId, { data, expiresAt: Date.now() + CACHE_TTL });
        return data;
      }
    }
  } catch { /* Redis not available */ }

  try {
    const { prisma } = await import('./prisma');
    if (prisma.organization) {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { featureFlags: true, tier: true },
      });
      if (org?.featureFlags) {
        const data = typeof org.featureFlags === 'string' ? JSON.parse(org.featureFlags) : org.featureFlags;
        data._tier = org.tier || 'standard';
        orgOverrideCache.set(organizationId, { data, expiresAt: Date.now() + CACHE_TTL });
        return data;
      }
    }
  } catch { /* DB not available */ }

  return {};
}

const TIER_ORDER: Record<string, number> = { free: 0, standard: 1, enterprise: 2 };

function tierHasAccess(orgTier: string, requiredTier: string): boolean {
  return (TIER_ORDER[orgTier] ?? 0) >= (TIER_ORDER[requiredTier] ?? 0);
}

export async function isEnabled(featureKey: string, organizationId?: string | null): Promise<boolean> {
  const definition = FEATURES[featureKey];
  if (!definition) { logger.warn(`[FeatureFlags] Unknown feature: ${featureKey}`); return false; }

  if (organizationId) {
    const overrides = await getOrgOverrides(organizationId);
    if (featureKey in overrides) return Boolean(overrides[featureKey]);
    if (definition.tier) {
      const orgTier = overrides._tier || 'standard';
      if (!tierHasAccess(orgTier, definition.tier)) return false;
    }
  }
  return Boolean(definition.defaultValue);
}

export async function getConfig<T = any>(featureKey: string, organizationId?: string | null): Promise<T> {
  const definition = FEATURES[featureKey];
  if (!definition) { logger.warn(`[FeatureFlags] Unknown config: ${featureKey}`); return undefined as any; }

  if (organizationId) {
    const overrides = await getOrgOverrides(organizationId);
    if (featureKey in overrides) return overrides[featureKey] as T;
  }
  return definition.defaultValue as T;
}

export async function setOverride(organizationId: string, featureKey: string, value: boolean | number | string): Promise<void> {
  const overrides = await getOrgOverrides(organizationId);
  overrides[featureKey] = value;
  try {
    const { redis } = await import('./redis');
    if (redis) await redis.set(`feature_flags:${organizationId}`, JSON.stringify(overrides), 'EX', 86400);
  } catch { /* Redis not available */ }
  orgOverrideCache.set(organizationId, { data: overrides, expiresAt: Date.now() + CACHE_TTL });
}

export function clearCache(organizationId?: string): void {
  if (organizationId) orgOverrideCache.delete(organizationId);
  else orgOverrideCache.clear();
}

export async function getAllFeatures(organizationId?: string | null): Promise<Array<{
  key: string; description: string; category: string; defaultValue: any; currentValue: any; tier?: string;
}>> {
  const overrides = organizationId ? await getOrgOverrides(organizationId) : {};
  return Object.values(FEATURES).map(def => ({
    key: def.key, description: def.description, category: def.category,
    defaultValue: def.defaultValue,
    currentValue: def.key in overrides ? overrides[def.key] : def.defaultValue,
    tier: def.tier,
  }));
}

export function requireFeature(featureKey: string) {
  return async (ctx: any): Promise<boolean> => {
    const orgId = ctx.user?.organizationId;
    const enabled = await isEnabled(featureKey, orgId);
    if (!enabled) { ctx.error(403, 'FEATURE_DISABLED' as any, `Feature "${featureKey}" is not enabled for your organization`); return false; }
    return true;
  };
}

export { FEATURES };
export default { isEnabled, getConfig, setOverride, clearCache, getAllFeatures, requireFeature };
