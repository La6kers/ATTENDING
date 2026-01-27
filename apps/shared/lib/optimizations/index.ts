// Peter's Frontend Optimizations for ATTENDING AI
import { useState, useEffect, useCallback, useRef } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

const cache = new Map<string, { data: unknown; ts: number }>();

export function useCachedFetch<T>(url: string, cacheMs = 300000) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const cached = cache.get(url);
    if (cached && Date.now() - cached.ts < cacheMs) {
      setData(cached.data as T);
      setLoading(false);
      return;
    }
    fetch(url)
      .then(r => r.json())
      .then(d => {
        cache.set(url, { data: d, ts: Date.now() });
        setData(d);
      })
      .catch(setError)
      .finally(() => setLoading(false));
  }, [url, cacheMs]);

  const refetch = useCallback(() => {
    cache.delete(url);
    setLoading(true);
  }, [url]);

  return { data, loading, error, refetch };
}

export function useThrottle<T>(value: T, limit: number): T {
  const [throttled, setThrottled] = useState(value);
  const lastRan = useRef(Date.now());
  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= limit) {
        setThrottled(value);
        lastRan.current = Date.now();
      }
    }, limit - (Date.now() - lastRan.current));
    return () => clearTimeout(handler);
  }, [value, limit]);
  return throttled;
}
