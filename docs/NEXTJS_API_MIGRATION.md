# Next.js â†’ .NET API Migration Map

## Status Legend
- âœ… **Migrated** â€” .NET endpoint exists and is tested
- ðŸ”„ **Partial** â€” .NET endpoint exists but missing features
- âŒ **Not Started** â€” Still only in Next.js

## Clinical Order Endpoints

| Next.js Route | .NET Equivalent | Status |
|---|---|---|
| `GET /api/labs` | `GET /api/v1/laborders/pending` | âœ… |
| `GET /api/labs?patientId=X` | `GET /api/v1/laborders/patient/{id}` | âœ… |
| `GET /api/labs/[id]` | `GET /api/v1/laborders/{id}` | âœ… |
| `POST /api/labs` | `POST /api/v1/laborders` | âœ… |
| `GET /api/imaging` | `GET /api/v1/imagingorders/status/Pending` | âœ… |
| `GET /api/prescriptions` | `GET /api/v1/medications/patient/{id}` | âœ… |
| `POST /api/prescriptions` | `POST /api/v1/medications` | âœ… |
| `GET /api/referrals` | `GET /api/v1/referrals/status/Pending` | âœ… |
| `POST /api/referrals` | `POST /api/v1/referrals` | âœ… |
| `GET /api/assessments` | `GET /api/v1/assessments/pending-review` | âœ… |
| `POST /api/assessments/submit` | `POST /api/v1/assessments` | âœ… |
| `GET /api/assessments/[id]` | `GET /api/v1/assessments/{id}` | âœ… |
| `GET /api/clinical/drug-check` | `POST /api/v1/medications/patient/{id}/check-interactions` | âœ… |
| `GET /api/clinical/red-flags` | `GET /api/v1/assessments/red-flags` | âœ… |

## Endpoints Remaining in Next.js (No .NET equivalent yet)

| Next.js Route | Category | Notes |
|---|---|---|
| `POST /api/auth/[...nextauth]` | Auth | NextAuth.js â€” keep until full Azure AD migration |
| `POST /api/chat/compass` | AI/Chat | COMPASS conversational AI â€” separate service |
| `GET /api/clinical/differential` | AI | AI differential diagnosis |
| `POST /api/ai/differential` | AI | AI-powered differentials |
| `POST /api/ai/feedback` | AI | AI feedback loop |
| `POST /api/ambient/*` | AI Scribe | Ambient listening / note gen |
| `POST /api/scribe` | AI Scribe | Clinical documentation AI |
| `GET /api/patients` | Patient mgmt | Patient search/list |
| `GET /api/patients/[id]` | Patient mgmt | Patient detail |
| `GET /api/appointments` | Scheduling | Appointment management |
| `POST /api/fhir/*` | Interop | FHIR integration layer |
| `POST /api/integrations/*` | Interop | HL7v2, webhooks |
| `GET /api/quality/*` | Analytics | Quality metrics |
| `GET /api/predictive/*` | AI | Predictive analytics |
| `GET /api/admin/*` | Admin | Platform administration |
| `GET /api/interventions/*` | Clinical | Care coordination |
| `GET /api/rpm/*` | RPM | Remote patient monitoring |
| `GET /api/prior-auth/*` | Revenue | Prior authorization |
| `GET /api/inbox/smart` | Messaging | Smart inbox |
| `GET /api/treatment-plans/*` | Clinical | Treatment plans |

## Migration Strategy

1. **Phase 6 (current)**: Clinical orders fully migrated to .NET
2. **Phase 7**: Patient management, scheduling â†’ .NET
3. **Phase 8**: AI services remain in Next.js (LLM integration)
4. **Phase 9**: Admin, analytics â†’ .NET
5. **Final**: NextAuth â†’ Azure AD B2C, retire Next.js API layer

## Frontend Migration

When switching a frontend call from Next.js to .NET:

```typescript
// Before (Next.js proxy)
const res = await fetch('/api/labs');

// After (direct to .NET API)
const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/laborders/pending`, {
  headers: { Authorization: `Bearer ${token}` }
});
```

Set `NEXT_PUBLIC_API_URL` in `.env.local` to point to the .NET backend.
