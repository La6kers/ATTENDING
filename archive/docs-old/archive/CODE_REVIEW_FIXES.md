# Code Review Fixes — ATTENDING AI

**Date:** February 18, 2026  
**Branch:** `mockup-2`  
**Commit message:** `fix: resolve 10 code review issues — type dedup, ID collisions, selector perf, drug DB consolidation`

---

## Summary

All 10 issues from the expert code review have been addressed. Issues #5, #7, #8, #9 were already resolved on disk from a prior session. The remaining 6 were fixed in this session.

---

## Issues Fixed This Session

### 🔴 Issue #1: Deduplicate `ordering.ts` type redefinitions
**File:** `apps/shared/types/ordering.ts`

**Problem:** Three independent definitions of `BaseAIRecommendation`, `BaseCatalogItem`, and `BaseSelectedItem` across `clinical.types.ts`, `catalogs/types.ts`, and `ordering.ts`.

**Fix:** Rewrote `ordering.ts` to re-export ALL base types from canonical sources instead of redefining them.

### 🔴 Issue #2: Fix recommendation ID collisions
**Files:** `ClinicalRecommendationService.ts`, `red-flags.ts`

**Problem:** `Date.now()` in synchronous loops produces identical timestamps.

**Fix:** Counter-based `nextRecId(prefix)` producing `rec_CODE_TIMESTAMP_N`.

### 🟡 Issue #3: Zustand selectors in `useClinicalOrders`
**File:** `apps/provider-portal/hooks/useClinicalOrders.ts`

**Problem:** Full store subscriptions causing cascading re-renders.

**Fix:** 24 individual field selectors across 4 stores.

### 🟡 Issue #4: Consolidate drug interaction databases
**Files:** `medications.ts`, `catalogs/index.ts`

**Problem:** Two independent databases with different interactions.

**Fix:** Expanded canonical source to 16 interactions + cross-reactivity + pregnancy + renal databases.

### 🟡 Issue #5: Already fixed on disk
### 🟡 Issue #6: Already fixed on disk
### 🟢 Issue #7: Already fixed on disk
### 🟢 Issue #8: Already fixed on disk
### 🟢 Issue #9: Already fixed on disk

### 🟢 Issue #10: `PatientContextForAI` vs `OrderingContext` JSDoc
**File:** `patientContextStore.ts`

**Fix:** Added JSDoc guidance for when to use each format.

---

## Git Command

```bash
cd C:\Users\la6ke\Projects\ATTENDING
git add -A
git commit -m "fix: resolve code review issues — type dedup, ID collisions, selector perf, drug DB consolidation"
git push origin mockup-2
```
