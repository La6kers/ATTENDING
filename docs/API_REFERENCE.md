# ATTENDING AI — API Reference

**Last Updated:** February 21, 2026

---

## Overview

The API is currently served by Next.js API routes (BFF layer). Per the architectural plan, core business logic will migrate to the .NET backend, with Next.js routes becoming thin proxies.

**Base URLs:**
- BFF (Next.js): `http://localhost:3000/api/`
- Backend (.NET): `http://localhost:5000/api/v1/` (when connected)

**Authentication:** All non-public endpoints require a valid NextAuth session (Bearer JWT).
**CSRF:** All state-changing requests (POST/PUT/DELETE) require a CSRF token from `GET /api/csrf-token`.

---

## Core Loop Endpoints (Phase 3 Priority)

These are the endpoints that must work end-to-end for the MVP demo.

### Assessments

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /api/assessments/submit | Submit completed COMPASS assessment | Patient |
| GET | /api/assessments | List assessments (provider dashboard queue) | Provider |
| GET | /api/assessments/[id] | Get single assessment detail | Provider |

**POST /api/assessments/submit**
```json
// Request
{
  "patientId": "string",
  "chiefComplaint": "string",
  "responses": { /* OLDCARTS phase responses */ },
  "redFlagsDetected": [],
  "severity": 1-10,
  "hpiNarrative": "string"
}

// Response: 201 Created
{
  "id": "string",
  "status": "COMPLETED",
  "orderNumber": "ASM-20260221-001"
}
```

### Lab Orders

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /api/labs | Create lab order | Provider |
| GET | /api/labs | List lab orders (with filters) | Provider |
| GET | /api/labs/[id] | Get single lab order | Provider |

**POST /api/labs**
```json
// Request
{
  "patientId": "string",
  "encounterId": "string",
  "tests": [
    { "code": "CBC", "cptCode": "85025", "name": "Complete Blood Count" }
  ],
  "priority": "ROUTINE" | "URGENT" | "STAT",
  "diagnosis": "string",
  "clinicalNotes": "string"
}

// Response: 201 Created
{
  "id": "string",
  "orderNumber": "LAB-20260221-001",
  "status": "PENDING"
}
```

### Patients

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /api/patients | List patients | Provider |
| GET | /api/patients/[id] | Get patient detail | Provider |

---

## Clinical Decision Support Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /api/clinical/red-flags | Evaluate text for red flags | Provider |
| POST | /api/clinical/drug-check | Check drug interactions | Provider |
| POST | /api/clinical/differential | AI differential diagnosis | Provider |
| GET | /api/clinical/protocols | Evidence-based protocols | Provider |
| POST | /api/clinical/triage | Triage severity assessment | Provider |

### POST /api/clinical/red-flags
```json
// Request
{ "text": "patient reports worst headache of their life", "context": { "age": 45 } }

// Response
{
  "isEmergency": true,
  "flags": [
    { "pattern": "worst_headache", "severity": "EMERGENCY", "action": "Evaluate for SAH — CT head stat" }
  ]
}
```

### POST /api/clinical/drug-check
```json
// Request
{
  "medications": ["warfarin", "ibuprofen"],
  "allergies": ["penicillin"]
}

// Response
{
  "interactions": [
    { "drugA": "warfarin", "drugB": "ibuprofen", "severity": "HIGH", "risk": "Increased bleeding risk" }
  ],
  "allergyWarnings": []
}
```

---

## Additional Endpoints (By Category)

### Ordering
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/imaging | Create imaging order |
| POST | /api/prescriptions | Create prescription |
| GET | /api/prescriptions/[id] | Get prescription detail |
| POST | /api/referrals | Create referral |
| GET | /api/referrals | List referrals |
| GET | /api/referrals/[id] | Get referral detail |
| GET | /api/referrals/providers | Search referral providers |
| POST | /api/referrals/ai-recommendations | AI referral suggestions |

### Treatment Plans
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/treatment-plans | Create treatment plan |
| GET | /api/treatment-plans | List treatment plans |
| GET | /api/treatment-plans/[id] | Get plan detail |
| GET | /api/treatment-plans/protocols | Evidence-based protocols |

### FHIR / EHR Integration
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/fhir/launch | SMART on FHIR launch |
| GET | /api/fhir/auth/authorize | OAuth2 authorize |
| GET | /api/fhir/auth/callback | OAuth2 callback |
| GET | /api/fhir/patient/[id] | Fetch patient from EHR |
| POST | /api/fhir/sync/patient | Sync patient data |
| POST | /api/fhir/orders/submit | Submit order to EHR |
| GET | /api/fhir/status | FHIR connection status |
| POST | /api/fhir/bulk/export | Bulk data export |

### Admin
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/admin/dashboard | Admin dashboard metrics |
| POST | /api/admin/api-keys | Manage API keys |
| POST | /api/admin/features | Toggle feature flags |
| POST | /api/admin/onboard-tenant | Onboard new organization |
| GET | /api/admin/webhooks | Manage webhook subscriptions |
| GET | /api/admin/dlq | Dead letter queue |
| POST | /api/admin/rate-limits | Configure rate limits |

### AI / Ambient
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/ambient/transcribe | Transcribe audio |
| POST | /api/ambient/generate-note | Generate clinical note from transcript |
| POST | /api/ambient/session | Manage ambient session |
| POST | /api/ai/differential | AI differential diagnosis |
| POST | /api/ai/feedback | Submit AI feedback |
| POST | /api/scribe | AI scribe for documentation |

### Other
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/health | Health check |
| GET | /api/metrics | Prometheus metrics |
| GET | /api/csrf-token | Get CSRF token |
| GET | /api/notifications | User notifications |
| GET | /api/appointments | Appointments list |
| POST | /api/prior-auth | Prior authorization |
| GET | /api/quality/dashboard | Quality metrics |
| POST | /api/inbox/smart | AI-powered inbox |

---

## .NET Backend Endpoints (When Connected)

The .NET backend at `backend/src/ATTENDING.Orders.Api/` exposes:

| Controller | Endpoints | Status |
|-----------|-----------|--------|
| AssessmentsController | CRUD for assessments | Built, needs wiring |
| LabOrdersController | CRUD for lab orders | Built, needs wiring |
| ImagingOrdersController | CRUD for imaging orders | Built, needs wiring |
| MedicationOrdersController | CRUD for prescriptions | Built, needs wiring |
| ReferralsController | CRUD for referrals | Built, needs wiring |
| PatientsController | Patient lookup | Built, needs wiring |
| SystemController | Health checks, ping | Built, working |

**Swagger UI:** Available at `/swagger` when backend is running.

---

## Security Pipeline

Every API route passes through the secure handler pipeline (apps/shared/lib/api/secureHandler.ts):

1. **Method validation** — Only allowed HTTP methods
2. **Rate limiting** — Per-IP, per-user (memory + Redis fallback)
3. **Authentication** — NextAuth JWT session validation
4. **RBAC** — Role check against required roles for endpoint
5. **CSRF** — HMAC-SHA256 token verification (timing-safe)
6. **Input sanitization** — SQL injection + XSS pattern detection
7. **Schema validation** — Zod schema against request body
8. **Handler execution** — Business logic
9. **Audit logging** — All PHI access logged
10. **PHI masking** — Error responses stripped of PHI
