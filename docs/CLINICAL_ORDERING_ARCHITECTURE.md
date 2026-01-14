# Clinical Ordering Architecture Analysis

## Executive Summary

After analyzing all four clinical ordering stores (Labs, Imaging, Medications, Referrals), I recommend **keeping them separate** with shared type definitions. This is the better approach for a healthcare application.

---

## What's Shared vs Unique

### Shared Patterns (~20% of code)

| Pattern | Description |
|---------|-------------|
| Store structure | `patientContext`, `selectedItems (Map)`, `aiRecommendations`, `loading states` |
| Common actions | `setPatientContext`, `add/remove items`, `filters`, `submit`, `clear` |
| Zustand setup | `devtools` + `immer` middleware pattern |
| Computed getters | `getSelectedArray()`, `getFilteredCatalog()`, `getStatCount()` |

### Unique to Each Module (~80% of code)

| Module | Unique Domain Logic |
|--------|---------------------|
| **Labs** | CPT/LOINC codes, specimen types, turnaround times, fasting requirements, lab panels |
| **Imaging** | Modalities (CT/MRI/US), laterality, contrast tracking, radiation dose, body parts |
| **Medications** | Drug interactions, allergy cross-reactivity, DEA schedules, black box warnings, pharmacy integration |
| **Referrals** | Specialty catalog, provider directory, insurance matching, prior authorization, subspecialties |

---

## Recommendation: Keep Separate ✅

### Why Separate is Better

1. **Clinical Safety**: Medication ordering has drug interaction checking. A shared abstraction might accidentally break this critical safety feature when you update lab ordering.

2. **Domain Complexity**: Each module has extensive domain-specific catalogs:
   - `LAB_CATALOG`: 50+ tests with CPT codes, LOINC codes, specimen types
   - `IMAGING_CATALOG`: 30+ studies with modalities, radiation doses, contrast types
   - `MEDICATION_CATALOG`: 40+ drugs with interactions, schedules, black box warnings
   - `SPECIALTY_CATALOG`: 17 specialties with subspecialties, wait times, auth requirements

3. **Independent Evolution**: Labs might need new specimen handling logic. Medications might need e-prescribing. These shouldn't be coupled.

4. **Testing**: Can test drug interaction logic without touching imaging contrast allergy logic.

5. **Team Collaboration**: Different developers can work on different modules without merge conflicts.

6. **Regulatory Compliance**: For HIPAA/ONC certification, auditors may want to review medication ordering separately from lab ordering.

### What SHOULD Be Shared

Create lightweight shared utilities in `apps/shared/`:

```typescript
// apps/shared/types/clinical-ordering.types.ts
export type Priority = 'STAT' | 'URGENT' | 'ASAP' | 'ROUTINE';

export interface PatientContext {
  id: string;
  name: string;
  age: number;
  gender: string;
  mrn: string;
  chiefComplaint: string;
  allergies: string[];
  currentMedications: string[];
  medicalHistory: string[];
  redFlags: string[];
}

export interface AIRecommendation {
  id: string;
  rationale: string;
  clinicalEvidence: string[];
  confidence: number;
  category: 'critical' | 'recommended' | 'consider';
  redFlagRelated?: boolean;
}

export interface OrderingStoreState {
  patientContext: PatientContext | null;
  loading: boolean;
  submitting: boolean;
  error: string | null;
  isLoadingRecommendations: boolean;
}
```

```typescript
// apps/shared/hooks/useOrderingState.ts
// Shared hook for common loading/error patterns
export function useOrderingState<T>(store: T) {
  const loading = store.loading;
  const submitting = store.submitting;
  const error = store.error;
  
  return {
    isLoading: loading || submitting,
    error,
    canSubmit: !loading && !submitting && !error,
  };
}
```

---

## Current Architecture (Keep This)

```
apps/provider-portal/store/
├── labOrderingStore.ts        # Labs with LAB_CATALOG
├── imagingOrderingStore.ts    # Imaging with IMAGING_CATALOG  
├── medicationOrderingStore.ts # Meds with MEDICATION_CATALOG + interactions
├── referralOrderingStore.ts   # Referrals with SPECIALTY_CATALOG + providers
├── assessmentQueueStore.ts    # Patient assessment queue
├── treatmentPlanStore.ts      # Treatment planning
└── patientChatStore.ts        # Chat state
```

```
apps/shared/
├── types/
│   ├── index.ts              # Existing types
│   └── clinical-ordering.types.ts  # NEW: Shared ordering types
├── schemas/
│   ├── lab-order.schema.ts   # Zod validation
│   ├── imaging-order.schema.ts
│   ├── assessment.schema.ts
│   └── referral-order.schema.ts
└── hooks/
    └── useOrderingState.ts   # NEW: Shared state hook
```

---

## Don't Create a Monolithic Store Factory

The factory pattern I showed earlier is **overkill** for your situation because:

1. Each module has ~1500 lines of domain-specific code vs ~200 lines of shared patterns
2. The AI recommendation generators are completely different for each clinical domain
3. The catalog structures are incompatible (labs have specimen types, imaging has laterality, meds have interactions)
4. A factory would add abstraction complexity without reducing overall code

---

## Verdict

| Approach | Pros | Cons |
|----------|------|------|
| **Separate stores (current)** ✅ | Independent evolution, easier testing, clinical safety isolation | Some code duplication (~200 lines per store) |
| **Shared factory** ❌ | Less code duplication | Complex abstraction, harder to customize, risk of breaking changes across modules |
| **Hybrid (shared types only)** ✅ | Type consistency, minimal coupling | Requires discipline to keep shared minimal |

**Recommendation**: Stay with separate stores. Add shared types/interfaces for consistency. The code "duplication" is actually appropriate isolation for clinical safety.

---

## Implementation Complete

### Changes Made:
1. ✅ Zod validation schemas in `apps/shared/schemas/`
2. ✅ API routes updated with validation (labs, imaging, assessments, referrals)
3. ✅ Health check endpoint at `/api/health`
4. ✅ Cleanup script at `scripts/cleanup.bat`

### Run These Commands:
```bash
# 1. Clean up placeholder code
scripts\cleanup.bat

# 2. Install dependencies (adds Zod)
npm install

# 3. Test the application
npm run dev:provider
```

### Next Steps (Optional):
1. Add shared `PatientContext` type to `apps/shared/types/`
2. Create `useOrderingState` hook for common loading patterns
3. Add unit tests for AI recommendation generators
