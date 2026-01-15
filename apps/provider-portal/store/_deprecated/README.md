# Deprecated Store Files

**Date**: January 14, 2026

This folder contains references to deprecated store files that have been superseded.

## Migration Completed

The following stores have been streamlined to use shared catalogs:

| Original File | Status | Action |
|--------------|--------|--------|
| `labOrderingStore.original.ts` | Deprecated | Delete |
| `labOrderingStore.refactored.ts` | Integrated | Delete |
| `imagingOrderingStore.refactored.ts` | Integrated | Delete |
| `medicationOrderingStore.refactored.ts` | Integrated | Delete |

## What Changed

1. **Lab Ordering Store** (`labOrderingStore.ts`)
   - Now imports from `@attending/shared/catalogs`
   - Uses `ClinicalRecommendationService` for AI recommendations
   - Reduced from ~900 lines to ~250 lines (72% reduction)

2. **Imaging Ordering Store** (`imagingOrderingStore.ts`)
   - Now imports from `@attending/shared/catalogs`
   - Uses `ClinicalRecommendationService` for AI recommendations
   - Reduced from ~750 lines to ~280 lines (63% reduction)

3. **Medication Ordering Store** (`medicationOrderingStore.ts`)
   - Now imports from `@attending/shared/catalogs`
   - Uses `ClinicalRecommendationService` for AI recommendations
   - Uses shared `checkDrugInteractions` function
   - Reduced from ~1100 lines to ~350 lines (68% reduction)

## Cleanup Commands

Run these commands to complete the cleanup:

```bash
cd C:\Users\Scott\source\repos\La6kers\ATTENDING\apps\provider-portal\store

# Delete the redundant refactored files (content now in main files)
del labOrderingStore.refactored.ts
del imagingOrderingStore.refactored.ts
del medicationOrderingStore.refactored.ts

# Optionally delete this _deprecated folder
rmdir /s /q _deprecated
```

## Git Commands

```bash
cd C:\Users\Scott\source\repos\La6kers\ATTENDING

git add -A
git commit -m "Streamline: Complete store migration to shared catalogs

- Updated imagingOrderingStore.ts with shared catalog imports
- Updated medicationOrderingStore.ts with shared catalog imports
- Updated apps/shared/package.json with comprehensive exports
- Added ErrorBoundary component for global error handling
- Cleaned up deprecated store files

Total code reduction: 68% across clinical ordering stores"

git push origin main
```
