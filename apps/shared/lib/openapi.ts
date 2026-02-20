// ============================================================
// ATTENDING AI - OpenAPI Specification Generator
// apps/shared/lib/openapi.ts
//
// Generates OpenAPI 3.1 spec from route definitions.
// Serves as both documentation and contract for integrations.
//
// Access: GET /api/docs → JSON spec
//         GET /api/docs?ui=true → Swagger UI redirect
// ============================================================

/**
 * ATTENDING AI OpenAPI 3.1 Specification
 *
 * This is a static spec that documents the API surface.
 * For a dynamic Swagger UI, deploy the spec to SwaggerHub
 * or use the /api/docs endpoint.
 */
export function generateOpenAPISpec() {
  return {
    openapi: '3.1.0',
    info: {
      title: 'ATTENDING AI — Clinical Decision Support API',
      version: '1.0.0',
      description:
        'Evidence-based clinical decision support platform API. ' +
        'All endpoints require authentication via session cookie or Bearer token. ' +
        'PHI data is encrypted in transit (TLS) and at rest (AES-256-GCM).',
      contact: {
        name: 'ATTENDING AI Engineering',
        email: 'engineering@attending.ai',
      },
      license: {
        name: 'Proprietary',
      },
    },
    servers: [
      {
        url: '{protocol}://{host}',
        variables: {
          protocol: { default: 'https', enum: ['https', 'http'] },
          host: { default: 'api.attending.ai' },
        },
      },
    ],

    // ---- Tags ----
    tags: [
      { name: 'Health', description: 'System health and diagnostics' },
      { name: 'Authentication', description: 'Session management' },
      { name: 'Patients', description: 'Patient demographics and records' },
      { name: 'Encounters', description: 'Clinical encounters and visits' },
      { name: 'Clinical AI', description: 'Evidence-based decision support' },
      { name: 'Labs', description: 'Laboratory orders and results' },
      { name: 'Medications', description: 'Prescriptions and drug checks' },
      { name: 'Imaging', description: 'Imaging orders' },
      { name: 'Referrals', description: 'Specialist referrals' },
      { name: 'Alerts', description: 'Real-time clinical alerts' },
      { name: 'Admin', description: 'Administrative functions' },
      { name: 'Integrations', description: 'External system integration (HL7v2, webhooks, FHIR)' },
      { name: 'API Keys', description: 'System-to-system API key management' },
      { name: 'Webhooks', description: 'Outbound webhook subscription management' },
    ],

    // ---- Paths ----
    paths: {
      // Health
      '/api/health': {
        get: {
          tags: ['Health'],
          summary: 'System health check',
          description: 'Returns system status including database, Redis, and memory health. Pass X-Health-Secret header for detailed diagnostics.',
          operationId: 'getHealth',
          security: [],
          parameters: [
            {
              name: 'X-Health-Secret',
              in: 'header',
              required: false,
              schema: { type: 'string' },
              description: 'Secret for detailed health info',
            },
          ],
          responses: {
            '200': {
              description: 'System healthy or degraded',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/HealthStatus' } } },
            },
            '503': { description: 'System unhealthy' },
          },
        },
      },

      // Clinical AI - Triage
      '/api/clinical/triage': {
        post: {
          tags: ['Clinical AI'],
          summary: 'AI-assisted triage classification',
          description: 'Classifies patient acuity using ESI (Emergency Severity Index) based on chief complaint, symptoms, and vital signs. Returns evidence-based triage level.',
          operationId: 'triagePatient',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TriageRequest' },
              },
            },
          },
          responses: {
            '200': {
              description: 'Triage classification result',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } },
            },
            '400': { $ref: '#/components/responses/ValidationError' },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },

      // Clinical AI - Differential Diagnosis
      '/api/ai/differential': {
        post: {
          tags: ['Clinical AI'],
          summary: 'Evidence-based diagnostic considerations',
          description: 'Generates differential diagnosis list based on clinical presentation. Requires provider role.',
          operationId: 'getDifferential',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DifferentialRequest' },
              },
            },
          },
          responses: {
            '200': { description: 'Diagnostic considerations', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } },
            '400': { $ref: '#/components/responses/ValidationError' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '429': { $ref: '#/components/responses/RateLimited' },
          },
        },
      },

      // Red Flags
      '/api/clinical/red-flags': {
        post: {
          tags: ['Clinical AI'],
          summary: 'Clinical red flag detection',
          description: 'Evaluates symptoms for critical red flags requiring immediate attention. Emergency-priority endpoint.',
          operationId: 'checkRedFlags',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['symptoms'],
                  properties: {
                    symptoms: { type: 'array', items: { type: 'string' } },
                    chiefComplaint: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Red flag evaluation', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } },
            '400': { $ref: '#/components/responses/ValidationError' },
          },
        },
      },

      // Drug Check
      '/api/clinical/drug-check': {
        post: {
          tags: ['Medications'],
          summary: 'Drug interaction safety check',
          description: 'Checks proposed medication against current medications, allergies, and patient conditions.',
          operationId: 'checkDrugInteractions',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DrugCheckRequest' },
              },
            },
          },
          responses: {
            '200': { description: 'Drug safety report', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } },
            '400': { $ref: '#/components/responses/ValidationError' },
          },
        },
      },

      // Labs
      '/api/labs': {
        get: {
          tags: ['Labs'],
          summary: 'List lab orders',
          operationId: 'listLabOrders',
          parameters: [
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
            { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['PENDING', 'ORDERED', 'RESULTED', 'COMPLETED'] } },
          ],
          responses: {
            '200': { description: 'Lab order list', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
        post: {
          tags: ['Labs'],
          summary: 'Create lab order',
          operationId: 'createLabOrder',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateLabOrder' } } },
          },
          responses: {
            '201': { description: 'Lab order created', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } },
            '400': { $ref: '#/components/responses/ValidationError' },
          },
        },
      },

      // Integrations - HL7v2
      '/api/integrations/hl7v2': {
        post: {
          tags: ['Integrations'],
          summary: 'Receive HL7v2 message',
          description: 'Inbound HL7v2 message receiver. Supports ADT (patient registration/update) and ORU (lab results). Authenticated via API key.',
          operationId: 'receiveHL7v2',
          security: [{ apiKey: [] }],
          requestBody: {
            required: true,
            content: {
              'x-application/hl7-v2+er7': { schema: { type: 'string' } },
              'text/plain': { schema: { type: 'string' } },
              'application/json': {
                schema: { type: 'object', properties: { message: { type: 'string' } } },
              },
            },
          },
          responses: {
            '200': { description: 'HL7v2 ACK/NACK response', content: { 'x-application/hl7-v2+er7': { schema: { type: 'string' } } } },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },

      // Integrations - Webhook receiver
      '/api/integrations/webhook': {
        post: {
          tags: ['Integrations'],
          summary: 'Receive webhook event',
          description: 'Generic inbound webhook receiver for external system events. Authenticated via API key.',
          operationId: 'receiveWebhook',
          security: [{ apiKey: [] }],
          parameters: [
            { name: 'X-Webhook-Event', in: 'header', required: true, schema: { type: 'string' } },
            { name: 'X-Webhook-Signature', in: 'header', schema: { type: 'string' } },
          ],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object' } } },
          },
          responses: {
            '200': { description: 'Event processed' },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },

      // Admin - Tenant Onboarding
      '/api/admin/onboard-tenant': {
        post: {
          tags: ['Admin'],
          summary: 'Onboard new tenant organization',
          description: 'Provisions a new organization with admin user, API key, integration connection, and optional webhook subscription in one idempotent call.',
          operationId: 'onboardTenant',
          parameters: [
            { name: 'Idempotency-Key', in: 'header', schema: { type: 'string', format: 'uuid' }, description: 'Unique key to prevent duplicate provisioning' },
          ],
          requestBody: {
            required: true,
            content: { 'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'domain', 'adminEmail', 'adminName'],
                properties: {
                  name: { type: 'string', description: 'Organization name' },
                  domain: { type: 'string', description: 'Primary email domain' },
                  adminEmail: { type: 'string', format: 'email' },
                  adminName: { type: 'string' },
                  ehrSystem: { type: 'string', enum: ['epic', 'cerner', 'allscripts', 'athena', 'meditech', 'other'] },
                  fhirBaseUrl: { type: 'string', format: 'uri' },
                  createApiKey: { type: 'boolean', default: true },
                  enableWebhooks: { type: 'boolean', default: false },
                },
              },
            } },
          },
          responses: {
            '201': { description: 'Tenant provisioned (includes one-time credentials)' },
            '409': { description: 'Idempotency conflict — duplicate request in progress' },
          },
        },
      },

      // Admin - API Keys
      '/api/admin/api-keys': {
        get: {
          tags: ['API Keys'],
          summary: 'List API keys',
          operationId: 'listApiKeys',
          responses: { '200': { description: 'API key list (hashes never returned)' } },
        },
        post: {
          tags: ['API Keys'],
          summary: 'Create API key',
          description: 'Creates a new API key. The plaintext key is returned ONCE at creation time.',
          operationId: 'createApiKey',
          requestBody: {
            required: true,
            content: { 'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'scopes'],
                properties: {
                  name: { type: 'string' },
                  scopes: { type: 'array', items: { type: 'string' } },
                  expiresInDays: { type: 'integer' },
                },
              },
            } },
          },
          responses: { '201': { description: 'API key created (includes plaintext key)' } },
        },
      },

      // Admin - Webhooks
      '/api/admin/webhooks': {
        get: {
          tags: ['Webhooks'],
          summary: 'List webhook subscriptions',
          operationId: 'listWebhooks',
          responses: { '200': { description: 'Webhook subscription list' } },
        },
        post: {
          tags: ['Webhooks'],
          summary: 'Create webhook subscription',
          description: 'Subscribe to clinical events via webhook. Returns signing secret once.',
          operationId: 'createWebhook',
          requestBody: {
            required: true,
            content: { 'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'url', 'events'],
                properties: {
                  name: { type: 'string' },
                  url: { type: 'string', format: 'uri' },
                  events: { type: 'array', items: { type: 'string' } },
                },
              },
            } },
          },
          responses: { '201': { description: 'Webhook created (includes signing secret)' } },
        },
      },

      // Bulk Data Export (FHIR Bulk Data Access IG)
      '/api/fhir/export': {
        post: {
          tags: ['Integrations'],
          summary: 'Start bulk data export',
          description: 'Initiates an async FHIR Bulk Data export. Returns 202 with polling URL.',
          operationId: 'startBulkExport',
          requestBody: {
            content: { 'application/json': {
              schema: {
                type: 'object',
                properties: {
                  _type: { type: 'array', items: { type: 'string' } },
                  _since: { type: 'string', format: 'date-time' },
                  patientIds: { type: 'array', items: { type: 'string' } },
                },
              },
            } },
          },
          responses: { '202': { description: 'Export job started' } },
        },
        get: {
          tags: ['Integrations'],
          summary: 'Poll export job status',
          operationId: 'getExportStatus',
          parameters: [{ name: 'jobId', in: 'query', schema: { type: 'string' } }],
          responses: { '200': { description: 'Job complete with file URLs' }, '202': { description: 'Still processing' } },
        },
      },

      // Metrics
      '/api/metrics': {
        get: {
          tags: ['Health'],
          summary: 'Prometheus metrics',
          description: 'Metrics in Prometheus text format for monitoring/alerting.',
          operationId: 'getMetrics',
          responses: { '200': { description: 'Prometheus text', content: { 'text/plain': { schema: { type: 'string' } } } } },
        },
      },

      // Admin Dashboard
      '/api/admin/dashboard': {
        get: {
          tags: ['Admin'],
          summary: 'Operational dashboard',
          description: 'Uptime, request stats, latency percentiles, integration health, scheduler status, memory.',
          operationId: 'getDashboard',
          responses: { '200': { description: 'Dashboard JSON' } },
        },
      },

      // Scheduler Controls
      '/api/admin/scheduler': {
        get: {
          tags: ['Admin'],
          summary: 'Background job status',
          operationId: 'getSchedulerStatus',
          responses: { '200': { description: 'Job status list' } },
        },
        post: {
          tags: ['Admin'],
          summary: 'Trigger background job',
          operationId: 'triggerJob',
          parameters: [{ name: 'job', in: 'query', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Job triggered' } },
        },
      },

      // Rate Limit Dashboard
      '/api/admin/rate-limits': {
        get: {
          tags: ['Admin'],
          summary: 'Rate limit tier config and live usage',
          operationId: 'getRateLimits',
          responses: { '200': { description: 'Rate limit tiers + per-key usage stats' } },
        },
      },

      // Data Retention
      '/api/admin/retention': {
        get: {
          tags: ['Admin'],
          summary: 'View data retention policies',
          operationId: 'getRetentionPolicies',
          responses: { '200': { description: 'Retention policy list' } },
        },
        post: {
          tags: ['Admin'],
          summary: 'Run retention policies (dry-run by default)',
          operationId: 'runRetention',
          requestBody: {
            content: { 'application/json': {
              schema: { type: 'object', properties: { dryRun: { type: 'boolean', default: true } } },
            } },
          },
          responses: { '200': { description: 'Retention report' } },
        },
      },

      // Tenant Onboarding
      '/api/admin/onboard-tenant': {
        post: {
          tags: ['Admin'],
          summary: 'Onboard new organization',
          description: 'Automated provisioning: org, admin user, API key, integration connection.',
          operationId: 'onboardTenant',
          requestBody: {
            required: true,
            content: { 'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'domain', 'adminEmail', 'adminName'],
                properties: {
                  name: { type: 'string' },
                  domain: { type: 'string' },
                  adminEmail: { type: 'string', format: 'email' },
                  adminName: { type: 'string' },
                  ehrSystem: { type: 'string', enum: ['epic', 'cerner', 'allscripts', 'athena', 'meditech'] },
                },
              },
            } },
          },
          responses: { '201': { description: 'Tenant onboarded' } },
        },
      },

      // Admin - Integration Connections
      '/api/admin/integrations': {
        get: {
          tags: ['Integrations'],
          summary: 'List integration connections with health status',
          operationId: 'listIntegrations',
          responses: { '200': { description: 'Integration list with health summary' } },
        },
        post: {
          tags: ['Integrations'],
          summary: 'Register integration connection',
          operationId: 'registerIntegration',
          requestBody: {
            required: true,
            content: { 'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'type', 'direction', 'config'],
                properties: {
                  name: { type: 'string' },
                  type: { type: 'string', enum: ['FHIR', 'HL7V2', 'WEBHOOK', 'SFTP', 'CUSTOM'] },
                  direction: { type: 'string', enum: ['INBOUND', 'OUTBOUND', 'BIDIRECTIONAL'] },
                  config: { type: 'object' },
                },
              },
            } },
          },
          responses: { '201': { description: 'Integration registered' } },
        },
      },

      // FHIR Bulk Data Export
      '/api/fhir/$export': {
        post: {
          tags: ['Integrations'],
          summary: 'Start FHIR bulk data export',
          description: 'Initiates an async export job. Returns 202 with a polling URL. Supports _type, _since, and patient filters.',
          operationId: 'startFhirExport',
          security: [{ apiKey: [] }],
          requestBody: {
            content: { 'application/json': {
              schema: {
                type: 'object',
                properties: {
                  _type: { type: 'array', items: { type: 'string', enum: ['Patient', 'Encounter', 'Condition', 'Observation', 'MedicationRequest', 'AllergyIntolerance', 'ServiceRequest'] } },
                  _since: { type: 'string', format: 'date-time', description: 'Only include resources modified since this date' },
                  patientIds: { type: 'array', items: { type: 'string' } },
                },
              },
            } },
          },
          responses: {
            '202': { description: 'Export job started. Poll Content-Location header for status.', headers: { 'Content-Location': { schema: { type: 'string' } } } },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
        get: {
          tags: ['Integrations'],
          summary: 'List export jobs',
          operationId: 'listFhirExports',
          security: [{ apiKey: [] }],
          responses: { '200': { description: 'List of export jobs with status' } },
        },
      },
      '/api/fhir/$export/{jobId}': {
        get: {
          tags: ['Integrations'],
          summary: 'Poll export job status or download file',
          operationId: 'getFhirExportStatus',
          security: [{ apiKey: [] }],
          parameters: [
            { name: 'jobId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'file', in: 'query', schema: { type: 'string' }, description: 'File ID to download NDJSON' },
          ],
          responses: {
            '200': { description: 'Job complete with file manifest, or NDJSON file download' },
            '202': { description: 'Job still processing', headers: { 'X-Progress': { schema: { type: 'string' } }, 'Retry-After': { schema: { type: 'string' } } } },
          },
        },
        delete: {
          tags: ['Integrations'],
          summary: 'Cancel export job',
          operationId: 'cancelFhirExport',
          security: [{ apiKey: [] }],
          parameters: [{ name: 'jobId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '202': { description: 'Job cancelled' } },
        },
      },

      // Patients
      '/api/patients': {
        get: {
          tags: ['Patients'],
          summary: 'List/search patients',
          operationId: 'listPatients',
          parameters: [
            { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search by name or MRN' },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
            { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
          ],
          responses: {
            '200': { description: 'Patient list' },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
    },

    // ---- Components ----
    components: {
      schemas: {
        ApiResponse: {
          type: 'object',
          required: ['success', 'meta'],
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object', description: 'Response payload (on success)' },
            error: { $ref: '#/components/schemas/ApiError' },
            meta: {
              type: 'object',
              properties: {
                requestId: { type: 'string', format: 'uuid' },
                timestamp: { type: 'string', format: 'date-time' },
                apiVersion: { type: 'string', example: '1.0.0' },
              },
            },
          },
        },
        ApiError: {
          type: 'object',
          required: ['code', 'message'],
          properties: {
            code: { type: 'string', example: 'VALIDATION_ERROR' },
            message: { type: 'string', example: 'Request validation failed' },
            details: { type: 'object' },
            validationErrors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' },
                  source: { type: 'string', enum: ['body', 'query'] },
                },
              },
            },
          },
        },
        HealthStatus: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
            timestamp: { type: 'string', format: 'date-time' },
            version: { type: 'string' },
            uptime: { type: 'integer', description: 'Seconds since server start' },
            checks: {
              type: 'object',
              properties: {
                database: { $ref: '#/components/schemas/ComponentHealth' },
                redis: { $ref: '#/components/schemas/ComponentHealth' },
                memory: { $ref: '#/components/schemas/ComponentHealth' },
              },
            },
          },
        },
        ComponentHealth: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['up', 'down', 'degraded'] },
            latencyMs: { type: 'number' },
            message: { type: 'string' },
          },
        },
        TriageRequest: {
          type: 'object',
          required: ['chiefComplaint'],
          properties: {
            chiefComplaint: { type: 'string', example: 'chest pain' },
            symptoms: { type: 'array', items: { type: 'string' } },
            vitalSigns: {
              type: 'object',
              properties: {
                heartRate: { type: 'number' },
                systolicBP: { type: 'number' },
                diastolicBP: { type: 'number' },
                respiratoryRate: { type: 'number' },
                temperature: { type: 'number' },
                oxygenSaturation: { type: 'number' },
              },
            },
          },
        },
        DifferentialRequest: {
          type: 'object',
          required: ['chiefComplaint'],
          properties: {
            chiefComplaint: { type: 'string' },
            symptoms: { type: 'array', items: { type: 'string' } },
            patientAge: { type: 'integer' },
            patientSex: { type: 'string', enum: ['male', 'female', 'other'] },
            labResults: { type: 'array', items: { type: 'object' } },
            medications: { type: 'array', items: { type: 'string' } },
          },
        },
        DrugCheckRequest: {
          type: 'object',
          required: ['proposedMedication', 'currentMedications', 'allergies'],
          properties: {
            proposedMedication: {
              type: 'object',
              properties: { name: { type: 'string' } },
            },
            currentMedications: {
              type: 'array',
              items: { type: 'object', properties: { name: { type: 'string' } } },
            },
            allergies: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  allergen: { type: 'string' },
                  severity: { type: 'string', enum: ['mild', 'moderate', 'severe'] },
                },
              },
            },
            pregnancyStatus: { type: 'string', enum: ['pregnant', 'not_pregnant', 'unknown'] },
          },
        },
        CreateLabOrder: {
          type: 'object',
          required: ['encounterId', 'tests', 'indication'],
          properties: {
            encounterId: { type: 'string' },
            tests: {
              type: 'array',
              items: {
                type: 'object',
                required: ['code', 'name'],
                properties: {
                  code: { type: 'string' },
                  name: { type: 'string' },
                  priority: { type: 'string', enum: ['STAT', 'ASAP', 'ROUTINE'] },
                },
              },
            },
            indication: { type: 'string' },
            priority: { type: 'string', enum: ['STAT', 'ASAP', 'ROUTINE'], default: 'ROUTINE' },
            specialInstructions: { type: 'string' },
          },
        },
      },

      responses: {
        Unauthorized: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: {
                allOf: [{ $ref: '#/components/schemas/ApiResponse' }],
                example: {
                  success: false,
                  error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
                },
              },
            },
          },
        },
        ValidationError: {
          description: 'Request validation failed',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiResponse' },
            },
          },
        },
        RateLimited: {
          description: 'Rate limit exceeded',
          headers: {
            'Retry-After': { schema: { type: 'integer' }, description: 'Seconds to wait' },
            'X-RateLimit-Remaining': { schema: { type: 'integer' } },
          },
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiResponse' },
            },
          },
        },
      },

      securitySchemes: {
        sessionCookie: {
          type: 'apiKey',
          in: 'cookie',
          name: 'next-auth.session-token',
          description: 'Session cookie set by NextAuth.js',
        },
        bearerToken: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT bearer token (for API integrations)',
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key for system-to-system integration (prefix: atnd_)',
        },
      },
      parameters: {
        IdempotencyKey: {
          name: 'Idempotency-Key',
          in: 'header',
          required: false,
          schema: { type: 'string', format: 'uuid' },
          description: 'Client-generated UUID to guarantee exactly-once processing. Responses for duplicate keys are replayed from cache (24h TTL). Returned headers: X-Idempotency-Replayed, X-Idempotency-Original-Date.',
        },
      },
    },

    security: [{ sessionCookie: [] }, { bearerToken: [] }, { apiKey: [] }],
  };
}

export default generateOpenAPISpec;
