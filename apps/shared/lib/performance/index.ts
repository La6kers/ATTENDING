// ATTENDING AI - Performance Monitoring
import { useEffect, useRef, useState } from 'react';

export function useRenderTime(componentName: string): void {
  const renderStart = useRef(performance.now());
  useEffect(() => {
    const renderTime = performance.now() - renderStart.current;
    if (renderTime > 16) console.warn(`Slow render: ${componentName} took ${renderTime.toFixed(2)}ms`);
    renderStart.current = performance.now();
  });
}

interface APIMetric { endpoint: string; duration: number; status: number; timestamp: number; }
const apiMetrics: APIMetric[] = [];

export function recordAPICall(endpoint: string, duration: number, status: number): void {
  apiMetrics.push({ endpoint, duration, status, timestamp: Date.now() });
  if (apiMetrics.length > 100) apiMetrics.shift();
  if (duration > 1000) console.warn(`Slow API: ${endpoint} took ${duration}ms`);
}

export function getAverageAPITime(): number {
  if (apiMetrics.length === 0) return 0;
  return apiMetrics.reduce((sum, m) => sum + m.duration, 0) / apiMetrics.length;
}

export async function trackedFetch(url: string, options?: RequestInit): Promise<Response> {
  const start = performance.now();
  try {
    const response = await fetch(url, options);
    recordAPICall(url, performance.now() - start, response.status);
    return response;
  } catch (error) {
    recordAPICall(url, performance.now() - start, 0);
    throw error;
  }
}
