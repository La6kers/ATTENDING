# ATTENDING AI - Codebase Streamlining Implementation

**Date:** January 14, 2026  
**Status:** Implemented

---

## Changes Made

### 1. Store Refactoring

All clinical ordering stores have been updated to use the shared `ClinicalAIService` and data catalogs from `@attending/shared`:

| Store | Status | Lines Saved |
|-------|--------|-------------|
| `labOrderingStore.ts` | ✅ Refactored | ~100 |
| `imagingOrderingStore.ts` | ✅ Refactored | ~150 |
| `medicationOrderingStore.ts` | ✅ Already using shared | ~200 |
| `referralOrderingStore.ts` | ✅ Refactored | ~150 |
| `treatmentPlanStore.ts` | ✅ Already complete | - |

**Total Estimated Lines Saved:** ~600 lines

### 2. Files Marked for Deletion

The following files have been marked as deprecated and should be deleted:

```powershell
# Run these commands to complete cleanup:
Remove-Item apps\provider-portal\store\referralOrderingStore.backup.ts
Remove-Item apps\provider-portal\pages\treatment-plans.tsx
```

### 3. Import Consistency

All stores now import from the shared package:

```typescript
// Standard imports for all clinical stores
import { 
  LAB_CATALOG,         // or IMAGING_CATALOG, MEDICATION_CATALOG, etc.
  type LabTest,         // Type definitions
} from '@attending/shared/data/catalogs';

import { 
  ClinicalAIService,
  type LabRecommendation,
} from '@attending/shared/services';

import type { 
  PatientContext, 
  OrderPriority 
} from '@attending/shared/stores/types';
```

### 4. API Route Fix

Fixed the referral API route to use consistent prisma import:

```typescript
// Before
import { prisma } from '@/lib/prisma';

// After
import { prisma } from '@/lib/api/prisma';
```

---

## Verification Steps

Run these commands to verify the changes work correctly:

```powershell
# 1. Navigate to project root
cd C:\Users\la6ke\Projects\ATTENDING

# 2. Install dependencies (if needed)
npm install

# 3. Generate Prisma client
npm run db:generate

# 4. Run type checking
npm run typecheck

# 5. Start development server
npm run dev

# 6. Test each module:
#    - http://localhost:3002/labs
#    - http://localhost:3002/imaging
#    - http://localhost:3002/medications
#    - http://localhost:3002/referrals
#    - http://localhost:3002/treatment-plan
```

---

## Architecture Benefits

### Before
- Each store had ~400-500 lines of duplicate code
- AI recommendation logic was copy-pasted across stores
- Catalog data was defined in multiple places
- Import paths were inconsistent

### After
- Single source of truth for AI recommendations (`ClinicalAIService`)
- Single source of truth for clinical catalogs (`@attending/shared/data/catalogs`)
- Consistent import patterns across all stores
- Cleaner separation of concerns

---

## Next Steps (Future Optimization)

1. **Adopt Factory Pattern:** The `createClinicalOrderStore` factory exists in `@attending/shared/stores` but is not yet being used. Future optimization can migrate stores to use this factory for additional code reduction (~70% per store).

2. **Complete Cleanup:** Delete the deprecated files:
   - `referralOrderingStore.backup.ts`
   - `treatment-plans.tsx`

3. **Add Tests:** Create comprehensive tests for:
   - `ClinicalAIService` recommendation generation
   - Store state management
   - API route handlers

4. **Update ESLint:** Upgrade to ESLint 9.x when ready:
   ```bash
   npm install eslint@latest @eslint/js@latest --save-dev
   ```

---

## File Changes Summary

| File | Action |
|------|--------|
| `apps/provider-portal/store/labOrderingStore.ts` | Updated |
| `apps/provider-portal/store/imagingOrderingStore.ts` | Updated |
| `apps/provider-portal/store/referralOrderingStore.ts` | Replaced with refactored version |
| `apps/provider-portal/store/referralOrderingStore.backup.ts` | Marked for deletion |
| `apps/provider-portal/pages/treatment-plans.tsx` | Marked for deletion |
| `apps/provider-portal/pages/api/referrals/index.ts` | Fixed import |
| `apps/shared/stores/createClinicalOrderStore.ts` | Minor update |
| `scripts/streamline-codebase.ps1` | Created |

---

*Implementation completed by: Claude AI - Development Assistant*
