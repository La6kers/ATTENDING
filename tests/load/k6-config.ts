// ============================================================
// ATTENDING AI - Load Testing Configuration (k6)
// tests/load/k6-config.ts
//
// Run: k6 run tests/load/k6-config.js
//
// Scenarios:
//   smoke:    5 VUs × 1 min     → Basic sanity
//   load:     50 VUs × 5 min    → Normal traffic
//   stress:   200 VUs × 5 min   → Peak capacity
//   spike:    0→500 VUs instant  → Burst handling
// ============================================================

// @ts-nocheck — k6 uses its own runtime

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const errorRate = new Rate('errors');
const apiLatency = new Trend('api_latency', true);
const aiLatency = new Trend('ai_latency', true);
const authLatency = new Trend('auth_latency', true);
const fhirLatency = new Trend('fhir_latency', true);
const rateLimitHits = new Counter('rate_limit_hits');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_KEY = __ENV.API_KEY || 'test-api-key';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

export const options = {
  scenarios: {
    smoke: {
      executor: 'constant-vus',
      vus: 5,
      duration: '1m',
      tags: { scenario: 'smoke' },
      exec: 'smokeTest',
    },
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 25 },
        { duration: '3m', target: 50 },
        { duration: '1m', target: 0 },
      ],
      tags: { scenario: 'load' },
      exec: 'loadTest',
      startTime: '1m30s',
    },
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '3m', target: 200 },
        { duration: '2m', target: 0 },
      ],
      tags: { scenario: 'stress' },
      exec: 'loadTest',
      startTime: '7m',
    },
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 500 },
        { duration: '1m', target: 500 },
        { duration: '10s', target: 0 },
      ],
      tags: { scenario: 'spike' },
      exec: 'loadTest',
      startTime: '14m',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<2000'],
    errors: ['rate<0.01'],
    api_latency: ['p(95)<400'],
    ai_latency: ['p(95)<2000'],
    auth_latency: ['p(95)<200'],
  },
};

function headers() {
  const h: Record<string, string> = { 'Content-Type': 'application/json', 'X-API-Key': API_KEY };
  if (AUTH_TOKEN) h['Authorization'] = `Bearer ${AUTH_TOKEN}`;
  return h;
}

function checkResponse(res: any, name: string) {
  const success = check(res, {
    [`${name} status 2xx`]: (r: any) => r.status >= 200 && r.status < 300,
    [`${name} < 1s`]: (r: any) => r.timings.duration < 1000,
  });
  errorRate.add(!success);
  apiLatency.add(res.timings.duration);
  if (res.status === 429) rateLimitHits.add(1);
  return success;
}

export function smokeTest() {
  group('Health Check', () => {
    const res = http.get(`${BASE_URL}/api/health`);
    checkResponse(res, 'health');
  });
  group('OpenAPI Docs', () => {
    const res = http.get(`${BASE_URL}/api/docs`);
    check(res, { 'docs 200': (r: any) => r.status === 200 });
  });
  sleep(1);
}

export function loadTest() {
  group('Authentication', () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/api/auth/session`, { headers: headers() });
    authLatency.add(Date.now() - start);
    checkResponse(res, 'auth.session');
  });

  group('Patient Lookup', () => {
    const res = http.get(`${BASE_URL}/api/v1/patients?limit=20`, { headers: headers() });
    checkResponse(res, 'patients.list');
  });

  group('Patient Detail', () => {
    const id = `P-${String(Math.floor(Math.random() * 1000)).padStart(6, '0')}`;
    const res = http.get(`${BASE_URL}/api/v1/patients/${id}`, { headers: headers() });
    check(res, { 'patient responds': (r: any) => r.status === 200 || r.status === 404 });
    apiLatency.add(res.timings.duration);
  });

  group('Encounters', () => {
    const res = http.get(`${BASE_URL}/api/v1/encounters?limit=10&status=active`, { headers: headers() });
    checkResponse(res, 'encounters.list');
  });

  group('Lab Results', () => {
    const res = http.get(`${BASE_URL}/api/v1/lab-results?limit=20`, { headers: headers() });
    checkResponse(res, 'labs.list');
  });

  group('AI Triage', () => {
    const start = Date.now();
    const res = http.post(`${BASE_URL}/api/v1/ai/triage`, JSON.stringify({
      chiefComplaint: 'Chest pain, shortness of breath',
      vitalSigns: { heartRate: 110, systolicBP: 90, spo2: 92, temperature: 38.2 },
      age: 65, gender: 'M',
    }), { headers: headers() });
    aiLatency.add(Date.now() - start);
    check(res, { 'triage responds': (r: any) => [200, 403, 404].includes(r.status) });
  });

  group('FHIR Patient', () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/api/fhir/r4/Patient?_count=5`, { headers: headers() });
    fhirLatency.add(Date.now() - start);
    check(res, { 'fhir responds': (r: any) => [200, 404].includes(r.status) });
  });

  group('Metrics', () => {
    const res = http.get(`${BASE_URL}/api/metrics`);
    check(res, { 'metrics available': (r: any) => r.status === 200 });
  });

  sleep(Math.random() * 2 + 0.5);
}

export function handleSummary(data: any) {
  return {
    'tests/load/summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data),
  };
}

function textSummary(data: any): string {
  const d = data.metrics?.http_req_duration?.values || {};
  const lines = [
    '═══════════════════════════════════════════',
    '  ATTENDING AI - Load Test Results',
    '═══════════════════════════════════════════',
    `  Requests:    ${data.metrics?.http_reqs?.values?.count || 0}`,
    `  Avg Latency: ${Math.round(d.avg || 0)}ms`,
    `  P95 Latency: ${Math.round(d['p(95)'] || 0)}ms`,
    `  P99 Latency: ${Math.round(d['p(99)'] || 0)}ms`,
    `  Error Rate:  ${((data.metrics?.errors?.values?.rate || 0) * 100).toFixed(2)}%`,
    `  Rate Limits: ${data.metrics?.rate_limit_hits?.values?.count || 0}`,
    '═══════════════════════════════════════════',
  ];
  return lines.join('\n');
}
