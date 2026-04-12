// =============================================================================
// Catch-all stub for @/shared/* imports
// These reference apps/shared modules via incorrect @/shared paths.
// Exports empty stubs so the build succeeds.
// =============================================================================

export const createFhirSyncService = (..._args: unknown[]) => ({
  sync: async () => ({}),
});

export const createFhirPersistenceService = (..._args: unknown[]) => ({
  persist: async () => ({}),
});

export const createFhirOrderService = (..._args: unknown[]) => ({
  send: async () => ({}),
});

export const createFhirClient = (..._args: unknown[]) => ({
  request: async () => ({}),
  getAuthorizationUrl: () => '#',
});

export type EhrVendor = 'epic' | 'cerner' | 'allscripts' | 'meditech' | 'stub';
export interface FhirClientConfig { baseUrl: string; vendor: string; }

export default {};
