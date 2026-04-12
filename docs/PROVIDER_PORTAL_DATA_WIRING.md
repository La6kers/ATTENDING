# ATTENDING AI — Provider Portal Data Wiring Plan

**Last Updated:** March 5, 2026

---

## Overview

The provider portal contains 40+ pages, each rendering clinical UI components. Currently, many pages use local mock data or Zustand store defaults for rendering. This document tracks the plan for wiring each page to live backend data via the BFF API layer.

---

## Architecture: How Data Flows

```
Provider Portal Page
  → Zustand Store (client state)
  → Next.js API Route (BFF)
  → proxyToBackend() → .NET Orders API
  → CQRS Handler → EF Core → SQL Server
```

The BFF pattern means **no page calls the .NET backend directly**. All data flows through Next.js API routes in `pages/api/`, which proxy to the .NET backend or fall back to Prisma for portal-specific data.

---

## Page Wiring Status

### Tier 1: Core Clinical Loop (Priority — Wire First)

These pages form the patient encounter workflow and should be wired to live data first.

| Page | File | Data Source | Status |
|------|------|-------------|--------|
| Dashboard | `dashboard.tsx` | `/api/v1/encounters/schedule/today`, `/api/v1/assessments/pending-review` | Mock data — needs BFF route |
| Patient List | `patients/index.tsx` | `/api/v1/patients/search` | Mock data — needs BFF route |
| Patient Detail | `patients/[id].tsx` | `/api/v1/patients/{id}` | Mock data — needs BFF route |
| Visit Flow | `visit/[id].tsx` | `/api/v1/encounters/{id}` | Mock data — needs BFF route |
| Labs | `labs.tsx` | `/api/v1/laborders/pending`, `/api/v1/laborders/critical` | Mock data — needs BFF route |
| Assessments | `assessments/index.tsx` | `/api/v1/assessments/pending-review`, `/api/v1/assessments/red-flags` | Mock data — needs BFF route |
| Pre-Visit | `previsit/index.tsx` | COMPASS assessment data | Mock data — needs BFF route |

### Tier 2: Clinical Intelligence (Wire After Core Loop)

| Page | File | Data Source | Status |
|------|------|-------------|--------|
| Clinical Dashboard | `clinical-dashboard.tsx` | Aggregated clinical metrics | Mock data |
| Clinical Hub | `clinical-hub.tsx` | AI recommendations + clinical alerts | Mock data |
| Decision Support | `decision-support.tsx` | Drug interactions, red flags, guidelines | Mock data |
| Medications | `medications.tsx` | `/api/v1/medications` (when endpoint exists) | Mock data |
| Imaging | `imaging.tsx` | `/api/v1/imaging` (when endpoint exists) | Mock data |
| Referrals | `referrals.tsx` | `/api/v1/referrals` (when endpoint exists) | Mock data |

### Tier 3: Administrative & Analytics (Wire Last)

| Page | File | Data Source | Status |
|------|------|-------------|--------|
| Admin | `admin.tsx` | `/api/v1/admin/dashboard` (admin role required) | Mock data |
| Executive Analytics | `executive-analytics.tsx` | `/api/v1/analytics/outcomes`, quality dashboard | Mock data |
| My Performance | `my-performance.tsx` | Provider-specific analytics | Mock data |
| Quality Measures | `quality-measures.tsx` | Quality metric aggregations | Mock data |
| Population Health | `population-health.tsx` | Population-level analytics | Mock data |
| Outcomes | `outcomes.tsx` | `/api/v1/analytics/outcomes` | Mock data |

### Tier 4: Specialized Features (Wire When Backend Ready)

| Page | File | Notes |
|------|------|-------|
| Ambient | `ambient.tsx` | Ambient listening — requires audio pipeline |
| Copilot | `copilot.tsx` | AI copilot — requires streaming AI endpoint |
| Image Analysis | `image-analysis.tsx` | Medical imaging AI — requires ML service |
| Visual AI | `visual-ai.tsx` | Visual AI analysis — requires ML service |
| SDOH | `sdoh.tsx` | Social determinants — requires SDOH data model |
| Predictive Risk | `predictive-risk.tsx` | Risk scoring — requires ML pipeline |
| Treatment Plans | `treatment-plans.tsx` | Treatment planning — complex domain model |
| Interventions | `interventions.tsx` | Clinical interventions tracking |
| Care Coordination | `care-coordination.tsx` | Multi-provider coordination |
| Patient Outreach | `patient-outreach.tsx` | Patient communication system |

### Utility & Settings Pages (No Backend Wiring Needed)

| Page | File | Notes |
|------|------|-------|
| Profile | `profile.tsx` | Uses NextAuth session data |
| Settings | `settings.tsx` | Local preferences |
| Help | `help.tsx` | Static content |
| Onboarding | `onboarding.tsx` | Guided tour — client-only |
| Component Demo | `component-demo.tsx` | Development utility |
| Unauthorized | `unauthorized.tsx` | Auth redirect page |
| 404 | `404.tsx` | Error page |

---

## Wiring Pattern (Per Page)

For each page that needs to be wired to live data, follow this pattern:

### 1. Create or update the BFF API route

```typescript
// pages/api/patients/index.ts
import { proxyToBackend } from '@/lib/api/proxyToBackend';

export default async function handler(req, res) {
  return proxyToBackend(req, res, '/api/v1/patients/search');
}
```

### 2. Update the Zustand store to fetch from BFF

```typescript
// store/patientStore.ts
fetchPatients: async (query) => {
  const res = await fetch(`/api/patients?q=${query}`);
  const data = await res.json();
  set({ patients: data.items, loading: false });
}
```

### 3. Replace mock data in the page component

```typescript
// Before: const patients = MOCK_PATIENTS;
// After:
const { patients, fetchPatients } = usePatientStore();
useEffect(() => { fetchPatients(''); }, []);
```

---

## Backend Endpoint Readiness

The .NET backend exposes these endpoints that are **ready for wiring**:

| Endpoint | Method | Controller | Ready |
|----------|--------|-----------|-------|
| `/api/v1/patients` | POST | PatientsController | Yes |
| `/api/v1/patients/search` | GET | PatientsController | Yes |
| `/api/v1/patients/{id}` | GET | PatientsController | Yes |
| `/api/v1/patients/mrn/{mrn}` | GET | PatientsController | Yes |
| `/api/v1/encounters` | POST | EncountersController | Yes |
| `/api/v1/encounters/schedule/today` | GET | EncountersController | Yes |
| `/api/v1/encounters/{id}` | GET | EncountersController | Yes |
| `/api/v1/encounters/{id}/check-in` | POST | EncountersController | Yes |
| `/api/v1/encounters/{id}/start` | POST | EncountersController | Yes |
| `/api/v1/encounters/{id}/complete` | POST | EncountersController | Yes |
| `/api/v1/laborders/pending` | GET | LabOrdersController | Yes |
| `/api/v1/laborders/critical` | GET | LabOrdersController | Yes |
| `/api/v1/assessments/pending-review` | GET | AssessmentsController | Yes |
| `/api/v1/assessments/red-flags` | GET | AssessmentsController | Yes |
| `/api/v1/analytics/outcomes` | GET | AnalyticsController | Yes |
| `/api/v1/analytics/quality/dashboard` | GET | AnalyticsController | Yes |
| `/api/v1/admin/dashboard` | GET | AdminController | Yes (admin role) |
| `/api/v1/system/version` | GET | SystemController | Yes |

---

## Milestone: Core Loop Complete

The core loop is complete when a patient can:

1. Enter symptoms via COMPASS (patient portal) → **Assessment submission is wired**
2. Provider sees pre-visit summary on dashboard → **Needs BFF route wiring**
3. Provider opens encounter, reviews assessment → **Needs BFF route wiring**
4. Provider orders labs → **Needs BFF route wiring**
5. Lab order persists to database → **Backend endpoint ready**
6. Provider sees confirmation → **Needs BFF route wiring**

Steps 2-4 and 6 are the next implementation priority for the provider portal.
