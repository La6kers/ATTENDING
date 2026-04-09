// =============================================================================
// ATTENDING AI - Patient Consent Package
// packages/consent/src/index.ts
//
// Patient consent management for CMS HTE data access
// =============================================================================

export type {
  ConsentType,
  ConsentStatus,
  DataCategory,
  ConsentGrant,
  ConsentRecord,
  ConsentAuditEntry,
  ConsentCheckResult,
} from './types';

export { ConsentGrantSchema, ALL_DATA_CATEGORIES } from './types';

export { ConsentManager } from './consent-manager';
export type { ConsentStorage } from './consent-manager';

// Prisma Storage Adapter
export { PrismaConsentStorage } from './adapters/prisma-consent-storage';
export type { PrismaClientLike, PrismaPatientConsentDelegate } from './adapters/prisma-consent-storage';
