# Test Fixes Applied - January 19, 2026

## Issues Fixed

### Issue 1: Immer MapSet Plugin Not Loaded
**Error:** `[Immer] The plugin for 'MapSet' has not been loaded into Immer`

**Fix:** Added `enableMapSet()` import and call in `labOrderingStore.ts`:
```typescript
import { enableMapSet } from 'immer';
enableMapSet();
```

### Issue 2: Drug-Check API Validation
**Error:** Test expects 400 for missing `currentMedications` and `allergies` but got 200

**Fix:** Updated validation in `drug-check.ts` to require both fields when using `proposedMedication` format.

## Files Modified
1. `apps/provider-portal/store/labOrderingStore.ts` - Added Immer MapSet plugin
2. `apps/provider-portal/pages/api/clinical/drug-check.ts` - Fixed validation

## Verification
Run the tests:
```bash
cd C:\Users\la6ke\Projects\ATTENDING
npm run test:run
```

Expected result: All 112 tests should pass (0 failed)
