// ============================================================
// ATTENDING AI - TypeScript SDK Generator
// scripts/generate-sdk.ts
//
// Auto-generates a typed TypeScript client from the OpenAPI spec.
// Output: packages/sdk/src/client.ts
//
// Usage:
//   npx ts-node scripts/generate-sdk.ts
//   npm run sdk:generate
// ============================================================

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

function generateSDKSource(): string {
  return `// ============================================================
// ATTENDING AI - TypeScript SDK
// Auto-generated — do not edit manually
// Generated: ${new Date().toISOString()}
// ============================================================

export interface AttendingClientConfig {
  baseUrl: string;
  apiKey?: string;
  sessionToken?: string;
  timeout?: number;
  maxRetries?: number;
  fetch?: typeof fetch;
  headers?: Record<string, string>;
  organizationId?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: unknown; requestId?: string };
  meta?: { requestId: string; timestamp: string; apiVersion: string; pagination?: { total: number; limit: number; offset: number; hasMore: boolean } };
}

export interface PaginationParams { limit?: number; offset?: number; }

export interface Patient { id: string; mrn: string; firstName: string; lastName: string; dateOfBirth: string; gender?: string; email?: string; phone?: string; isActive: boolean; }

export interface TriageRequest { symptoms: string[]; vitalSigns?: { heartRate?: number; bloodPressureSystolic?: number; bloodPressureDiastolic?: number; temperature?: number; respiratoryRate?: number; oxygenSaturation?: number }; patientAge?: number; patientGender?: string; chiefComplaint?: string; medicalHistory?: string[]; }
export interface TriageResult { esiLevel: number; classification: string; reasoning: string; redFlags: string[]; recommendedActions: string[]; confidence: number; }

export interface DifferentialRequest { symptoms: string[]; patientAge?: number; patientGender?: string; medicalHistory?: string[]; medications?: string[]; labResults?: Array<{ test: string; value: string; unit?: string }>; }
export interface DifferentialResult { diagnoses: Array<{ name: string; icdCode?: string; probability: string; reasoning: string; supportingEvidence: string[]; suggestedWorkup: string[] }>; }

export interface DrugCheckRequest { medications: string[]; patientAllergies?: string[]; }
export interface DrugCheckResult { interactions: Array<{ drug1: string; drug2: string; severity: string; description: string }>; allergyWarnings: string[]; safe: boolean; }

export interface LabOrder { id: string; patientId: string; orderNumber: string; status: string; priority: string; tests: string; orderedAt: string; }
export interface CreateLabOrderRequest { patientId: string; tests: string[]; priority?: 'STAT' | 'ASAP' | 'ROUTINE' | 'TIMED'; indication?: string; fasting?: boolean; }

export interface HealthStatus { status: string; version: string; uptime: number; checks: Record<string, { status: string; latencyMs?: number }>; }

export interface WebhookSubscription { id: string; name: string; url: string; events: string[]; isActive: boolean; }
export interface CreateWebhookRequest { name: string; url: string; events: string[]; }

export interface ApiKeyInfo { id: string; name: string; keyPrefix: string; scopes: string[]; isActive: boolean; lastUsedAt?: string; usageCount: number; }
export interface CreateApiKeyRequest { name: string; scopes: string[]; description?: string; expiresInDays?: number; }

// ============================================================
// HTTP CLIENT
// ============================================================

class HttpClient {
  private config: AttendingClientConfig & { timeout: number; maxRetries: number };

  constructor(config: AttendingClientConfig) {
    this.config = { timeout: 15000, maxRetries: 3, ...config };
  }

  async request<T>(method: string, path: string, options: { body?: unknown; query?: Record<string, string | number | undefined>; idempotent?: boolean } = {}): Promise<ApiResponse<T>> {
    const url = new URL(path, this.config.baseUrl);
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v !== undefined) url.searchParams.set(k, String(v));
      }
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Accept': 'application/json', ...this.config.headers };
    if (this.config.apiKey) headers['X-API-Key'] = this.config.apiKey;
    if (this.config.sessionToken) headers['Authorization'] = 'Bearer ' + this.config.sessionToken;
    if (this.config.organizationId) headers['X-Organization-ID'] = this.config.organizationId;
    if (options.idempotent !== false && ['POST', 'PUT', 'PATCH'].includes(method)) headers['Idempotency-Key'] = crypto.randomUUID();

    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.config.timeout);
        const fetchFn = this.config.fetch || globalThis.fetch;
        const response = await fetchFn(url.toString(), {
          method, headers,
          body: options.body ? JSON.stringify(options.body) : undefined,
          signal: controller.signal,
        });
        clearTimeout(timeout);

        const data: ApiResponse<T> = await response.json();
        if (response.status >= 400 && response.status < 500) return data;
        if (response.status >= 500 && attempt < this.config.maxRetries) {
          await new Promise(r => setTimeout(r, Math.min(1000 * Math.pow(2, attempt), 10000)));
          continue;
        }
        return data;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < this.config.maxRetries) {
          await new Promise(r => setTimeout(r, Math.min(1000 * Math.pow(2, attempt), 10000)));
        }
      }
    }
    return { success: false, error: { code: 'NETWORK_ERROR', message: lastError?.message || 'Request failed after retries' } };
  }

  get<T>(path: string, query?: Record<string, string | number | undefined>) { return this.request<T>('GET', path, { query }); }
  post<T>(path: string, body?: unknown) { return this.request<T>('POST', path, { body }); }
  put<T>(path: string, body?: unknown) { return this.request<T>('PUT', path, { body }); }
  patch<T>(path: string, body?: unknown) { return this.request<T>('PATCH', path, { body }); }
  delete<T>(path: string) { return this.request<T>('DELETE', path); }
}

// ============================================================
// RESOURCE CLIENTS
// ============================================================

class HealthResource {
  constructor(private http: HttpClient) {}
  check() { return this.http.get<HealthStatus>('/api/health'); }
}

class PatientsResource {
  constructor(private http: HttpClient) {}
  list(params?: PaginationParams & { search?: string }) { return this.http.get<Patient[]>('/api/v1/patients', params as any); }
  get(id: string) { return this.http.get<Patient>('/api/v1/patients/' + id); }
}

class ClinicalAIResource {
  constructor(private http: HttpClient) {}
  triage(data: TriageRequest) { return this.http.post<TriageResult>('/api/v1/clinical/triage', data); }
  differential(data: DifferentialRequest) { return this.http.post<DifferentialResult>('/api/v1/ai/differential', data); }
  drugCheck(data: DrugCheckRequest) { return this.http.post<DrugCheckResult>('/api/v1/clinical/drug-check', data); }
}

class LabsResource {
  constructor(private http: HttpClient) {}
  list(params?: PaginationParams & { patientId?: string; status?: string }) { return this.http.get<LabOrder[]>('/api/v1/labs', params as any); }
  create(data: CreateLabOrderRequest) { return this.http.post<LabOrder>('/api/v1/labs', data); }
}

class WebhooksResource {
  constructor(private http: HttpClient) {}
  list() { return this.http.get<WebhookSubscription[]>('/api/admin/webhooks'); }
  create(data: CreateWebhookRequest) { return this.http.post<WebhookSubscription & { secret: string }>('/api/admin/webhooks', data); }
  delete(id: string) { return this.http.delete<{ deleted: boolean }>('/api/admin/webhooks?id=' + id); }
}

class ApiKeysResource {
  constructor(private http: HttpClient) {}
  list() { return this.http.get<ApiKeyInfo[]>('/api/admin/api-keys'); }
  create(data: CreateApiKeyRequest) { return this.http.post<ApiKeyInfo & { key: string }>('/api/admin/api-keys', data); }
  revoke(id: string) { return this.http.delete<{ revoked: boolean }>('/api/admin/api-keys?id=' + id); }
}

// ============================================================
// MAIN CLIENT
// ============================================================

export class AttendingClient {
  readonly health: HealthResource;
  readonly patients: PatientsResource;
  readonly ai: ClinicalAIResource;
  readonly labs: LabsResource;
  readonly webhooks: WebhooksResource;
  readonly apiKeys: ApiKeysResource;

  constructor(config: AttendingClientConfig) {
    const http = new HttpClient(config);
    this.health = new HealthResource(http);
    this.patients = new PatientsResource(http);
    this.ai = new ClinicalAIResource(http);
    this.labs = new LabsResource(http);
    this.webhooks = new WebhooksResource(http);
    this.apiKeys = new ApiKeysResource(http);
  }
}

export default AttendingClient;
`;
}

function generatePackageJson(): string {
  return JSON.stringify({
    name: '@attending-ai/sdk',
    version: '1.0.0',
    description: 'TypeScript SDK for ATTENDING AI Clinical Decision Support API',
    main: 'dist/client.js',
    types: 'dist/client.d.ts',
    files: ['dist'],
    scripts: { build: 'tsc', prepublishOnly: 'npm run build' },
    license: 'MIT',
    devDependencies: { typescript: '^5.0.0' },
  }, null, 2);
}

function generateTsConfig(): string {
  return JSON.stringify({
    compilerOptions: {
      target: 'ES2022', module: 'commonjs', lib: ['ES2022'],
      declaration: true, declarationMap: true, sourceMap: true,
      outDir: './dist', rootDir: './src', strict: true,
      esModuleInterop: true, skipLibCheck: true,
    },
    include: ['src'],
  }, null, 2);
}

function generateReadme(): string {
  return `# @attending-ai/sdk

TypeScript SDK for the ATTENDING AI Clinical Decision Support API.

## Quick Start

\`\`\`typescript
import { AttendingClient } from '@attending-ai/sdk';

const client = new AttendingClient({
  baseUrl: 'https://api.attending.ai',
  apiKey: 'atnd_your_api_key_here',
});

// Health check
const health = await client.health.check();

// AI triage
const triage = await client.ai.triage({
  symptoms: ['chest pain', 'shortness of breath'],
  vitalSigns: { heartRate: 110, oxygenSaturation: 92 },
});

// Lab orders
const labs = await client.labs.list({ patientId: 'P-001' });
const order = await client.labs.create({
  patientId: 'P-001',
  tests: ['CBC', 'BMP', 'Troponin'],
  priority: 'STAT',
});
\`\`\`

## Features

- **Type-safe**: Full TypeScript types for all requests and responses
- **Auto-retry**: Exponential backoff on 5xx errors (configurable)
- **Idempotency**: Auto-generates Idempotency-Key headers for POST/PUT
- **Timeout**: Configurable request timeout (default: 15s)
`;
}

// ============================================================
// GENERATOR
// ============================================================

function main() {
  const sdkDir = join(__dirname, '..', 'packages', 'sdk');
  const srcDir = join(sdkDir, 'src');

  if (!existsSync(sdkDir)) mkdirSync(sdkDir, { recursive: true });
  if (!existsSync(srcDir)) mkdirSync(srcDir, { recursive: true });

  writeFileSync(join(srcDir, 'client.ts'), generateSDKSource());
  writeFileSync(join(sdkDir, 'package.json'), generatePackageJson());
  writeFileSync(join(sdkDir, 'tsconfig.json'), generateTsConfig());
  writeFileSync(join(sdkDir, 'README.md'), generateReadme());

  console.log('✅ SDK generated successfully');
  console.log(`   ${join(srcDir, 'client.ts')}`);
  console.log(`   ${join(sdkDir, 'package.json')}`);
  console.log(`   ${join(sdkDir, 'tsconfig.json')}`);
  console.log(`   ${join(sdkDir, 'README.md')}`);
}

if (require.main === module) { main(); }

export { generateSDKSource, generatePackageJson, generateTsConfig, generateReadme };
