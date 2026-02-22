# ATTENDING AI - Build Fix & Architecture Streamlining Recommendations

## Build Issues Fixed

### Issue 1: TypeScript Type Mismatch (FIXED)
**Location:** `apps/provider-portal/components/referral-ordering/ReferralOrderingPanel.tsx:214`

**Root Cause:** 
- Store uses `ReferralRecommendation` from `@attending/shared/catalogs` with `category: RecommendationCategory`
- Component expected `AIReferralRecommendation` from local types with `category: ReferralCategory`
- The types had incompatible union values

**Solution Applied:**
1. Aligned `ReferralCategory` in local types to include all values from `RecommendationCategory`
2. Added missing category styles (`avoid`, `not-indicated`) to `AIRecommendationsPanel`
3. Added fallback for unknown category types

### Issue 2: ESLint Warning - Missing Dependency (FIXED)
**Location:** `apps/provider-portal/components/referral-ordering/ProviderSearchModal.tsx:52`

**Root Cause:** `useEffect` missing `onSearch` in dependency array

**Solution Applied:** Used `useRef` pattern to store the callback reference, avoiding stale closures while satisfying ESLint rules.

---

## Architecture Streamlining Recommendations

### 1. **Type Consolidation (High Priority)**

**Problem:** Duplicate type definitions across the codebase cause maintenance headaches and type mismatches.

**Current State:**
```
Local types:    apps/provider-portal/components/referral-ordering/types.ts
Shared types:   apps/shared/catalogs/types.ts
Store types:    apps/provider-portal/store/referralOrderingStore.ts (re-exports)
Catalog types:  apps/shared/catalogs/referrals.ts
```

**Recommended Structure:**
```
packages/clinical-types/
├── index.ts
├── referrals.ts      # ReferralCategory, ReferralUrgency, etc.
├── labs.ts           # LabCategory, LabTest, etc.
├── imaging.ts        # ImagingModality, etc.
├── medications.ts    # DrugCategory, etc.
├── common.ts         # OrderPriority, PatientContext, etc.
└── ai.ts             # AIRecommendation generic types
```

**Migration Steps:**
1. Create unified type package at `packages/clinical-types`
2. Export all types from single barrel file
3. Update imports across all apps to use `@attending/clinical-types`
4. Remove duplicate type definitions from component-level files
5. Keep component-specific types (UI props) in component files

### 2. **Store Architecture Improvements**

**Current Issues:**
- Stores mix catalog data (static) with state data (dynamic)
- AI recommendations loaded via API with fallback duplicating logic

**Recommended Pattern:**
```typescript
// Separate concerns:
// 1. Static catalog data (read-only)
import { getAllSpecialties } from '@attending/shared/catalogs';

// 2. Dynamic state (Zustand store)
interface ReferralOrderingState {
  // Selection state only
  selectedReferrals: Map<string, SelectedReferral>;
  expandedReferral: string | null;
  
  // AI state
  aiRecommendations: ReferralRecommendation[];
  loadingRecommendations: boolean;
  
  // Form state
  searchQuery: string;
  categoryFilter: string;
}

// 3. API/service layer
class ReferralService {
  static async getRecommendations(context: PatientContext) { ... }
  static async submitReferrals(referrals: SelectedReferral[]) { ... }
}
```

### 3. **Component Architecture**

**Current Pattern (Issue):**
- Components import types from multiple locations
- Props interfaces defined inline or in separate files inconsistently

**Recommended Pattern:**
```typescript
// Component-specific props in same file
interface ReferralCardProps {
  referral: ReferralRecommendation;  // From shared types
  isSelected: boolean;
  onSelect: () => void;
}

// Use React.FC with explicit props
export const ReferralCard: React.FC<ReferralCardProps> = ({
  referral,
  isSelected,
  onSelect
}) => { ... };
```

### 4. **Import Path Standardization**

**Current State:** Mixed import patterns
```typescript
// Some files use relative
import { Specialty } from './types';

// Some use aliases
import { Specialty } from '@/components/referral-ordering/types';

// Some use package
import { Specialty } from '@attending/shared/catalogs';
```

**Recommended:** Establish clear hierarchy
```typescript
// 1. External packages
import { create } from 'zustand';

// 2. Internal packages (monorepo)
import type { Specialty } from '@attending/clinical-types';
import { getAllSpecialties } from '@attending/catalogs';

// 3. App-level shared
import { useNotifications } from '@/hooks';

// 4. Feature-level (relative only within feature)
import { ReferralCard } from './ReferralCard';
```

### 5. **File Organization by Feature**

**Recommended Structure for referral-ordering:**
```
components/referral-ordering/
├── index.ts                    # Barrel export
├── ReferralOrderingPanel.tsx   # Main container
├── components/                 # Sub-components
│   ├── AIRecommendationsPanel.tsx
│   ├── ReferralCard.tsx
│   ├── ProviderSearchModal.tsx
│   └── ...
├── hooks/                      # Feature-specific hooks
│   └── useReferralOrdering.ts
└── utils/                      # Feature-specific utilities
    └── categoryStyles.ts       # Style configurations
```

### 6. **Shared Style Constants**

**Problem:** Style constants duplicated across files (`CATEGORY_STYLES`, `URGENCY_STYLES`)

**Solution:** Create shared style utility
```typescript
// packages/ui-primitives/styles/clinical.ts
export const URGENCY_STYLES = { ... } as const;
export const CATEGORY_STYLES = { ... } as const;
export const PRIORITY_STYLES = { ... } as const;

// Usage
import { URGENCY_STYLES } from '@attending/ui-primitives/styles/clinical';
```

---

## Immediate Action Items

### Quick Wins (Today)
- [x] Fix type mismatch build error
- [x] Fix ESLint warning

### Short Term (This Week)
- [ ] Consolidate duplicate types into shared package
- [ ] Add barrel exports for cleaner imports
- [ ] Standardize category/urgency style definitions

### Medium Term (This Sprint)
- [ ] Separate static catalog data from dynamic store state
- [ ] Create feature-level hooks for complex workflows
- [ ] Establish coding standards document

### Long Term (Next Sprint)
- [ ] Full type system audit
- [ ] Component library documentation
- [ ] E2E test coverage for ordering workflows

---

## Build Verification

After applying fixes, run:
```bash
npm run build:provider
```

Expected output: Build should complete without TypeScript errors.
