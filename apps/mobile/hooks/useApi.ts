// ============================================================
// ATTENDING AI — useApi Hook
// apps/mobile/hooks/useApi.ts
//
// Generic data-fetching hook for mobile API calls.
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ApiResult } from '../lib/api/mobileApiClient';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useApiQuery<T>(
  fetcher: () => Promise<ApiResult<T>>,
  deps: unknown[] = []
): UseApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      if (!mountedRef.current) return;
      if (result.ok) {
        setData(result.data);
      } else {
        setError(result.error?.message ?? 'Unknown error');
      }
    } catch (e: any) {
      if (mountedRef.current) {
        setError(e.message ?? 'Network error');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, deps);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    return () => { mountedRef.current = false; };
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
