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
      },
    },

    security: [{ sessionCookie: [] }, { bearerToken: [] }],
  };
}

export default generateOpenAPISpec;
