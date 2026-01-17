# ATTENDING AI - Build Fix & Streamlining Session Summary

## Date: January 2026

## Build Issues Resolved

### ✅ Critical Error Fixed
**Problem:** TypeScript error in `assessmentMachine.ts` - XState v4 event type inference
```
Property 'patientName' does not exist on type 'EventObject'
```

**Solution:** Refactored `assign()` callback to explicitly cast event type:
```typescript
// Before (broken)
actions: assign({
  patientName: (_, event) => event.patientName,  // Error!
})

// After (fixed)
actions: assign((_ctx, event) => {
  const startEvent = event as { type: 'START'; patientName: string; patientId?: string };
  return {
    patientName: startEvent.patientName,
    // ...
  };
})
```

### ✅ ESLint Configuration Fixed
Created app-specific ESLint configs that properly extend `next/core-web-vitals`:
- `apps/patient-portal/.eslintrc.json`
- `apps/provider-portal/.eslintrc.json`

### ✅ Turbo Configuration Fixed
Added explicit task for `@attending/shared#build` to eliminate outputs warning.

### ✅ Version Alignment
Aligned Next.js versions across both portals to `14.2.31`.

---

## Unused Import Warnings Fixed

### Patient Portal Files Fixed:
| File | Changes |
|------|---------|
| `pages/api/chat/compass.ts` | Prefixed `PHASE_QUESTIONS`, `sessionId`, `phase`, `existing` with `_` |
| `pages/api/patient/assessments/index.ts` | Prefixed `clinicalData`, `redFlags` with `_` |
| `pages/health-summary.tsx` | Removed unused: Activity, Calendar, Filter, Clock, CheckCircle |
| `pages/profile.tsx` | Removed unused: Pill, AlertTriangle |
| `components/assessment/AssessmentChat.tsx` | Removed unused icons; prefixed unused vars |
| `components/chat/ChatInput.tsx` | Removed unused: Paperclip |
| `components/chat/ProgressTracker.tsx` | Removed unused: Circle, Heart, Users |
| `components/ImprovedPatientPortal.tsx` | Prefixed unused state setters |

### Provider Portal (Remaining ~30 warnings)
Most are unused `session` parameters in API routes. These are intentionally passed for
authorization context but not used in the current handler logic. Options:
1. Prefix with `_session` to silence warnings
2. Add proper authorization checks using the session
3. Remove if not needed

---

## Architecture Recommendations

### High Priority

1. **Consolidate Duplicate Components**
   - `components/assessment/` and `components/chat/` have overlapping files
   - Keep one canonical implementation in `@attending/shared/components/chat`

2. **Remove Local lib/ Files**
   - Both apps have `lib/prisma.ts` and `lib/utils.ts`
   - These should import from `@attending/shared/lib/prisma` and `@attending/shared/lib/utils`
   - ESLint rules exist but aren't enforced

3. **Single Assessment Machine**
   - `apps/patient-portal/machines/assessmentMachine.ts`
   - `apps/shared/machines/assessmentMachine.ts`
   - Keep one in shared, remove the duplicate

### Medium Priority

4. **Consolidate Small Packages**
   ```
   packages/clinical-services/  → Move to @attending/shared/services
   packages/clinical-types/     → Move to @attending/shared/types
   packages/ui-primitives/      → Move to @attending/shared/components/ui
   ```

5. **Clean Up Documentation Sprawl**
   Multiple streamlining docs suggest ongoing refactoring attempts:
   - `docs/ARCHITECTURE_STREAMLINING_PLAN.md`
   - `docs/ARCHITECTURE_STREAMLINING_RECOMMENDATIONS.md`
   - `docs/STREAMLINING_CHANGES_IMPLEMENTED.md`
   - `docs/STREAMLINING_IMPLEMENTATION_SUMMARY.md`
   - `STREAMLINING_SESSION_2.md` through `STREAMLINING_SESSION_5.md`
   
   Consolidate into single `docs/ARCHITECTURE.md`.

### Low Priority

6. **Consider XState v5 Migration**
   - Current: XState v4.38.0
   - XState v5 has better TypeScript support with automatic type inference
   - Would eliminate need for manual event type casting

---

## Remaining Work

### To Complete Build Clean (0 Warnings)

1. **Provider Portal API Routes** (~15 files)
   - Add `_` prefix to unused `session` parameters
   - Or implement proper session usage

2. **Provider Portal Components** (~15 files)
   - Remove unused Lucide icon imports
   - Run: `npx eslint --fix 'apps/provider-portal/**/*.{ts,tsx}'`

3. **Provider Portal Pages** (~10 files)
   - Remove unused variables like `router`, `loadingId`, `setOrders`

### Command to Verify

```bash
cd C:\Users\la6ke\Projects\ATTENDING
npm run build
```

---

## Files Created/Modified

### New Files
- `apps/patient-portal/.eslintrc.json`
- `apps/provider-portal/.eslintrc.json`
- `scripts/fix-unused-imports.ps1`
- `scripts/fix-all-eslint-warnings.ps1`
- `docs/BUILD_FIX_SESSION.md` (this file)

### Modified Files
- `turbo.json` - Added @attending/shared#build task
- `apps/provider-portal/package.json` - Updated Next.js version
- `apps/patient-portal/machines/assessmentMachine.ts` - Fixed TypeScript error
- Multiple component and API files - Fixed unused imports/variables
