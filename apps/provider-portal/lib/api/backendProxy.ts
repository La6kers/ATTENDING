// =============================================================================
// Provider Portal — Backend Proxy
// apps/provider-portal/lib/api/backendProxy.ts
//
// Re-exports the canonical shared implementation.
// All business logic lives in @attending/shared/lib/api/backendProxy.
// =============================================================================

export {
  BackendError,
  backendFetch,
  isBackendAvailable,
  proxyToBackend,
  BACKEND_PATH_MAP,
} from '@attending/shared/lib/api/backendProxy';
