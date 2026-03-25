// ============================================================
// ATTENDING AI - k6 Load Testing Suite
// infrastructure/load-testing/load-test.js
//
// Comprehensive load testing for production readiness
// Tests: API endpoints, WebSocket, concurrent users
// ============================================================

import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { randomIntBetween, randomItem } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// ============================================================
// CONFIGURATION
// ============================================================

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const WS_URL = __ENV.WS_URL || 'ws://localhost:3003';
const API_TOKEN = __ENV.API_TOKEN || 'test-token';

// ============================================================
// CUSTOM METRICS
// ============================================================

const assessmentCreated = new Counter('assessments_created');
const labOrderCreated = new Counter('lab_orders_created');
const emergencyDetected = new Counter('emergencies_detected');
const apiErrors = new Counter('api_errors');
const authFailures = new Counter('auth_failures');
const wsConnections = new Counter('ws_connections');
const wsMessages = new Counter('ws_messages');

const apiLatency = new Trend('api_latency');
const assessmentLatency = new Trend('assessment_latency');
const wsLatency = new Trend('ws_latency');

const apiSuccessRate = new Rate('api_success_rate');
const wsSuccessRate = new Rate('ws_success_rate');

// ============================================================
// TEST OPTIONS
// ============================================================

export const options = {
  scenarios: {
    // Smoke test - verify basic functionality
    smoke: {
      executor: 'constant-vus',
      vus: 5,
      duration: '1m',
      startTime: '0s',
      tags: { scenario: 'smoke' },
    },
    
    // Load test - typical production load
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },   // Ramp up
        { duration: '5m', target: 50 },   // Steady state
        { duration: '2m', target: 100 },  // Peak load
        { duration: '3m', target: 100 },  // Sustained peak
        { duration: '2m', target: 0 },    // Ramp down
      ],
      startTime: '1m',
      tags: { scenario: 'load' },
    },
    
    // Stress test - find breaking point
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 200 },
        { duration: '5m', target: 500 },
        { duration: '5m', target: 1000 },
        { duration: '3m', target: 0 },
      ],
      startTime: '15m',
      tags: { scenario: 'stress' },
    },
    
    // Spike test - sudden traffic surge
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10 },
        { duration: '30s', target: 500 },  // Spike!
        { duration: '1m', target: 500 },
        { duration: '30s', target: 10 },
        { duration: '30s', target: 0 },
      ],
      startTime: '35m',
      tags: { scenario: 'spike' },
    },
    
    // WebSocket test
    websocket: {
      executor: 'constant-vus',
      vus: 50,
      duration: '5m',
      startTime: '1m',
      tags: { scenario: 'websocket' },
      exec: 'websocketTest',
    },
  },
  
  thresholds: {
    // Response time thresholds
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    api_latency: ['p(95)<300'],
    assessment_latency: ['p(95)<1000'],
    ws_latency: ['p(95)<100'],
    
    // Success rate thresholds
    api_success_rate: ['rate>0.99'],
    ws_success_rate: ['rate>0.99'],
    
    // Error thresholds
    api_errors: ['count<100'],
    auth_failures: ['count<10'],
  },
};

// ============================================================
// TEST DATA
// ============================================================

const symptoms = [
  'chest pain', 'shortness of breath', 'headache', 'abdominal pain',
  'fever', 'cough', 'nausea', 'dizziness', 'fatigue', 'back pain'
];

const severities = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const labTests = ['CBC', 'BMP', 'LFTs', 'Troponin', 'BNP', 'D-dimer', 'Urinalysis'];

const generatePatientData = () => ({
  firstName: `Test${randomIntBetween(1000, 9999)}`,
  lastName: `Patient${randomIntBetween(1000, 9999)}`,
  dateOfBirth: '1980-01-01',
  gender: randomItem(['male', 'female']),
  mrn: `MRN${randomIntBetween(100000, 999999)}`,
});

const generateAssessmentData = () => ({
  symptoms: [
    {
      name: randomItem(symptoms),
      severity: randomItem(severities),
      duration: `${randomIntBetween(1, 72)} hours`,
    },
    {
      name: randomItem(symptoms),
      severity: randomItem(severities),
    },
  ],
  vitalSigns: {
    heartRate: randomIntBetween(60, 120),
    bloodPressure: { systolic: randomIntBetween(100, 160), diastolic: randomIntBetween(60, 100) },
    temperature: 97 + Math.random() * 4,
    oxygenSaturation: randomIntBetween(94, 100),
  },
});

// ============================================================
// HELPER FUNCTIONS
// ============================================================

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${API_TOKEN}`,
};

function makeRequest(method, endpoint, body = null) {
  const url = `${BASE_URL}${endpoint}`;
  const params = { headers, timeout: '30s' };
  
  const startTime = Date.now();
  let response;
  
  if (method === 'GET') {
    response = http.get(url, params);
  } else if (method === 'POST') {
    response = http.post(url, JSON.stringify(body), params);
  } else if (method === 'PUT') {
    response = http.put(url, JSON.stringify(body), params);
  } else if (method === 'DELETE') {
    response = http.del(url, params);
  }
  
  const latency = Date.now() - startTime;
  apiLatency.add(latency);
  
  const success = response.status >= 200 && response.status < 300;
  apiSuccessRate.add(success);
  
  if (!success) {
    apiErrors.add(1);
    if (response.status === 401 || response.status === 403) {
      authFailures.add(1);
    }
  }
  
  return response;
}

// ============================================================
// MAIN TEST FUNCTION
// ============================================================

export default function() {
  group('Health Check', () => {
    const response = makeRequest('GET', '/api/health');
    check(response, {
      'health check returns 200': (r) => r.status === 200,
      'health check is healthy': (r) => {
        try {
          return JSON.parse(r.body).status === 'healthy';
        } catch {
          return false;
        }
      },
    });
  });
  
  sleep(randomIntBetween(1, 3));
  
  group('Patient Lookup', () => {
    const response = makeRequest('GET', '/api/patients?limit=10');
    check(response, {
      'patient lookup returns 200': (r) => r.status === 200,
      'patient lookup returns array': (r) => {
        try {
          return Array.isArray(JSON.parse(r.body).patients);
        } catch {
          return false;
        }
      },
    });
  });
  
  sleep(randomIntBetween(1, 2));
  
  group('Assessment Submission', () => {
    const assessmentData = generateAssessmentData();
    const startTime = Date.now();
    
    const response = makeRequest('POST', '/api/assessments', {
      ...assessmentData,
      sessionId: `session-${Date.now()}`,
    });
    
    assessmentLatency.add(Date.now() - startTime);
    
    const success = check(response, {
      'assessment returns 200/201': (r) => r.status === 200 || r.status === 201,
      'assessment returns id': (r) => {
        try {
          return JSON.parse(r.body).id !== undefined;
        } catch {
          return false;
        }
      },
    });
    
    if (success) {
      assessmentCreated.add(1);
      
      // Check for emergency detection
      try {
        const body = JSON.parse(response.body);
        if (body.urgencyLevel === 'critical' || body.urgencyLevel === 'emergent') {
          emergencyDetected.add(1);
        }
      } catch {
        // ignore
      }
    }
  });
  
  sleep(randomIntBetween(2, 4));
  
  group('Differential Diagnosis', () => {
    const response = makeRequest('POST', '/api/clinical/differential', {
      chiefComplaint: randomItem(symptoms),
      symptoms: [
        { name: randomItem(symptoms), severity: randomItem(severities) },
      ],
      patientAge: randomIntBetween(20, 80),
      patientGender: randomItem(['male', 'female']),
    });
    
    check(response, {
      'differential returns 200': (r) => r.status === 200,
      'differential has diagnoses': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.differentials && body.differentials.length > 0;
        } catch {
          return false;
        }
      },
    });
  });
  
  sleep(randomIntBetween(1, 3));
  
  group('Lab Order Creation', () => {
    const response = makeRequest('POST', '/api/orders/labs', {
      patientId: `patient-${randomIntBetween(1, 100)}`,
      tests: [
        { code: randomItem(labTests), priority: randomItem(['routine', 'urgent', 'stat']) },
      ],
      clinicalIndication: 'Test indication',
    });
    
    const success = check(response, {
      'lab order returns 200/201': (r) => r.status === 200 || r.status === 201,
    });
    
    if (success) {
      labOrderCreated.add(1);
    }
  });
  
  sleep(randomIntBetween(1, 2));
  
  group('Provider Queue', () => {
    const response = makeRequest('GET', '/api/provider/queue');
    check(response, {
      'queue returns 200': (r) => r.status === 200,
      'queue returns array': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body.assessments) || Array.isArray(body.queue);
        } catch {
          return false;
        }
      },
    });
  });
  
  sleep(randomIntBetween(1, 3));
}

// ============================================================
// WEBSOCKET TEST
// ============================================================

export function websocketTest() {
  const url = `${WS_URL}/socket.io/?EIO=4&transport=websocket`;
  
  const response = ws.connect(url, {}, function(socket) {
    wsConnections.add(1);
    
    socket.on('open', () => {
      wsSuccessRate.add(true);
      
      // Send authentication
      socket.send(JSON.stringify({
        type: 'auth',
        token: API_TOKEN,
        role: 'provider',
      }));
    });
    
    socket.on('message', (data) => {
      wsMessages.add(1);
      const latency = Date.now() - socket.sendTime;
      wsLatency.add(latency);
    });
    
    socket.on('error', (e) => {
      wsSuccessRate.add(false);
      console.error('WebSocket error:', e);
    });
    
    // Simulate activity
    for (let i = 0; i < 10; i++) {
      socket.sendTime = Date.now();
      socket.send(JSON.stringify({
        type: 'ping',
        timestamp: Date.now(),
      }));
      sleep(randomIntBetween(1, 3));
    }
    
    socket.close();
  });
  
  check(response, {
    'WebSocket connected': (r) => r && r.status === 101,
  });
}

// ============================================================
// SETUP & TEARDOWN
// ============================================================

export function setup() {
  console.log('Starting load test...');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`WebSocket URL: ${WS_URL}`);
  
  // Verify API is reachable
  const response = http.get(`${BASE_URL}/api/health`);
  if (response.status !== 200) {
    throw new Error(`API not reachable: ${response.status}`);
  }
  
  return { startTime: Date.now() };
}

export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`Load test completed in ${duration}s`);
}

// ============================================================
// HANDLE SUMMARY
// ============================================================

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'load-test-results.json': JSON.stringify(data),
    'load-test-results.html': htmlReport(data),
  };
}

function textSummary(data, options) {
  // k6 built-in text summary
  return '';
}

function htmlReport(data) {
  return `<!DOCTYPE html>
<html>
<head>
  <title>ATTENDING AI Load Test Results</title>
  <style>
    body { font-family: sans-serif; padding: 20px; }
    .metric { margin: 10px 0; padding: 10px; background: #f5f5f5; }
    .pass { color: green; }
    .fail { color: red; }
  </style>
</head>
<body>
  <h1>ATTENDING AI Load Test Results</h1>
  <p>Completed: ${new Date().toISOString()}</p>
  <div class="metric">
    <h3>API Success Rate</h3>
    <p class="${data.metrics.api_success_rate?.rate > 0.99 ? 'pass' : 'fail'}">
      ${((data.metrics.api_success_rate?.rate || 0) * 100).toFixed(2)}%
    </p>
  </div>
  <div class="metric">
    <h3>Response Time (p95)</h3>
    <p class="${data.metrics.http_req_duration?.p95 < 500 ? 'pass' : 'fail'}">
      ${(data.metrics.http_req_duration?.p95 || 0).toFixed(2)}ms
    </p>
  </div>
  <div class="metric">
    <h3>Total Requests</h3>
    <p>${data.metrics.http_reqs?.count || 0}</p>
  </div>
  <div class="metric">
    <h3>Assessments Created</h3>
    <p>${data.metrics.assessments_created?.count || 0}</p>
  </div>
  <div class="metric">
    <h3>Emergencies Detected</h3>
    <p>${data.metrics.emergencies_detected?.count || 0}</p>
  </div>
</body>
</html>`;
}
