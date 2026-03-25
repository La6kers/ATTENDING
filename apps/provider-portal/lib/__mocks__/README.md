# Mock / Demo Data Files

This directory documents the mock and demo data used in the provider portal
during development. These files will be replaced with real API calls as
backend integration progresses.

## File Locations

| File | Purpose | Used By |
|------|---------|---------|
| `../mockData.ts` | General mock data (messages, notifications) | Legacy clinical hub store |
| `../clinicalMockData.ts` | Clinical messages, priority/vital utilities | ClinicalMessageCard, ClinicalSummaryPanel, useClinicalHub |
| `../demoPatient.ts` | Demo patient data for ordering pages | labs.tsx, imaging.tsx, medications.tsx, referrals.tsx |

## Inline Demo Data

- `pages/clinical.tsx` — `DEMO_PATIENT` for clinical workspace
- `pages/clinical-hub.tsx` — `DEMO_PATIENT`, `DEMO_DIFFERENTIAL`, `DEMO_ORDERS`

## Migration Plan

When connecting to real backend APIs:
1. Replace inline `DEMO_*` constants with API calls via React Query / SWR
2. Keep utility functions (`getPriorityClass`, `checkVitalAbnormal`, etc.) — move to `lib/clinical/utils.ts`
3. Mock data files can be moved here (`__mocks__/`) for use in tests only
