# ATTENDING AI - Streamlining Session 3 Summary
## Date: January 15, 2026

---

## Session Goals
1. ✅ Wire clinical-services package to provider and patient portals
2. ✅ Add authentication middleware to API routes
3. ✅ Create unified clinical orders hook
4. ✅ Organize store and hook exports

---

## Changes Made

### 1. Clinical Services Integration

#### Provider Portal - `useClinicalSafety` Hook
**File:** `apps/provider-portal/hooks/useClinicalSafety.ts`

Provides unified access to all clinical safety services:
- `evaluateRedFlags(symptoms)` - Detect emergency conditions
- `evaluateNarrative(text)` - Parse free-text for red flags
- `classifyTriage(presentation)` - ESI 1-5 classification
- `evaluateSafety(presentation)` - Combined safety evaluation
- `checkDrugInteractions(meds, newMed)` - Drug-drug interactions
- `checkMedicationSafety(med, currentMeds, allergies)` - Full medication safety
- `getProtocol(protocolId)` - Retrieve clinical protocols
- `getLabRecommendations(symptoms)` - AI-powered lab suggestions

#### Patient Portal - `useEmergencyDetection` Hook
**File:** `apps/patient-portal/hooks/useEmergencyDetection.ts`

Real-time emergency detection for COMPASS chat:
- `processMessage(message, symptoms)` - Evaluate each chat message
- `checkSymptomKeywords(text)` - Quick keyword detection
- `findNearestEmergencyFacility()` - Geolocation-based facility lookup
- Emergency alert management with acknowledgment flow

### 2. Authentication Middleware

**File:** `apps/provider-portal/lib/api/middleware.ts`

Comprehensive middleware system:
- `withAuth(handler)` - Basic authentication
- `withRoles(roles, handler)` - Role-based access
- `withPermission(permission, handler)` - Granular permissions
- `withApiMiddleware(options, handler)` - Full-featured wrapper

Pre-configured shortcuts:
- `providerOnly` - Physicians, NPs, PAs only
- `clinicalStaff` - Includes RNs
- `canPrescribe` - Prescribing permission
- `canSignOrders` - Order signing permission
- `adminOnly` - Admin access

Role permission matrix included for:
- Admin, Physician, NP, PA, RN, MA, Staff

### 3. Labs API Enhancement

**File:** `apps/provider-portal/pages/api/labs/index.ts`

Enhanced with clinical safety:
- Integrates `redFlagEvaluator` for emergency detection
- Auto-upgrades to STAT priority when emergencies detected
- Returns AI recommendations for missing critical labs
- Enhanced audit logging with clinical context
- Includes `labRecommender` for symptom-based suggestions

### 4. Unified Clinical Orders Hook

**File:** `apps/provider-portal/hooks/useClinicalOrders.ts`

Single interface for all ordering:
- Combines labs, imaging, medications, referrals
- `setPatientContext(context)` - Set for all stores
- `generateAllRecommendations()` - AI recommendations for all types
- `validateMedicationSafety()` - Drug interaction validation
- `getOrderSummary()` - Formatted order summary
- `submitAllOrders(encounterId)` - Unified submission

### 5. Code Organization

**Files:**
- `apps/provider-portal/hooks/index.ts` - Hook barrel exports
- `apps/provider-portal/store/index.ts` - Store barrel exports
- `apps/provider-portal/lib/api/index.ts` - API utilities exports

---

## File Summary

| File | Lines | Status |
|------|-------|--------|
| `provider-portal/hooks/useClinicalSafety.ts` | ~220 | NEW |
| `provider-portal/hooks/useClinicalOrders.ts` | ~280 | NEW |
| `provider-portal/hooks/index.ts` | ~30 | NEW |
| `provider-portal/lib/api/middleware.ts` | ~350 | NEW |
| `provider-portal/lib/api/index.ts` | ~10 | NEW |
| `provider-portal/store/index.ts` | ~80 | NEW |
| `provider-portal/pages/api/labs/index.ts` | ~180 | MODIFIED |
| `patient-portal/hooks/useEmergencyDetection.ts` | ~250 | NEW |
| `patient-portal/package.json` | - | MODIFIED |
| `.env.example` | - | MODIFIED |

**Total new code:** ~1,200 lines
**Total files:** 10 (8 new, 2 modified)

---

## Testing Checklist

```bash
# 1. Install dependencies (if needed)
cd C:\Users\Scott\source\repos\La6kers\ATTENDING
npm install

# 2. Type check
npm run typecheck:all

# 3. Build both portals
npm run build:provider
npm run build:patient

# 4. Run clinical services tests
cd packages/clinical-services
npm test

# 5. Start development servers
cd ../..
npm run dev:all
```

---

## Import Examples

### Using Clinical Safety in Components
```typescript
import { useClinicalSafety } from '@/hooks';

function PatientAssessment({ symptoms, chiefComplaint }) {
  const { evaluateSafety, checkMedicationSafety } = useClinicalSafety();
  
  const safety = evaluateSafety({
    symptoms,
    chiefComplaint,
    vitalSigns: { heartRate: 110, systolic: 90 }
  });
  
  if (safety.hasEmergency) {
    // Show emergency alert
  }
}
```

### Using Unified Orders Hook
```typescript
import { useClinicalOrders } from '@/hooks';

function OrdersPanel({ encounterId }) {
  const { 
    state, 
    labs, 
    validateMedicationSafety,
    submitAllOrders 
  } = useClinicalOrders();
  
  const handleSubmit = async () => {
    const validation = validateMedicationSafety();
    if (!validation.isValid) {
      // Show validation errors
      return;
    }
    await submitAllOrders(encounterId);
  };
}
```

### Protecting API Routes
```typescript
import { withAuth, providerOnly, canPrescribe } from '@/lib/api';

// Basic auth
export default withAuth(async (req, res) => {
  const user = req.user;
  // ...
});

// Provider only
export default providerOnly(async (req, res) => {
  // Only physicians, NPs, PAs can access
});

// Specific permission
export default canPrescribe(async (req, res) => {
  // Only users with prescribe permission
});
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Provider Portal                       │
├─────────────────────────────────────────────────────────┤
│  Components                                              │
│    └── uses hooks/useClinicalSafety                     │
│    └── uses hooks/useClinicalOrders                     │
├─────────────────────────────────────────────────────────┤
│  API Routes                                              │
│    └── lib/api/middleware (auth, roles, permissions)    │
│    └── @attending/clinical-services (safety checks)     │
├─────────────────────────────────────────────────────────┤
│  Stores (Zustand)                                        │
│    └── store/index.ts (barrel exports)                  │
└─────────────────────────────────────────────────────────┘
                          │
                          │ imports
                          ▼
┌─────────────────────────────────────────────────────────┐
│              @attending/clinical-services                │
├─────────────────────────────────────────────────────────┤
│  • redFlagEvaluator                                     │
│  • triageClassifier                                     │
│  • drugInteractionChecker                               │
│  • clinicalProtocolService                              │
│  • labRecommender                                       │
│  • emergencyLocationService                             │
└─────────────────────────────────────────────────────────┘
```

---

## Git Commands

```bash
cd C:\Users\Scott\source\repos\La6kers\ATTENDING

# Stage changes
git add apps/provider-portal/hooks/
git add apps/provider-portal/lib/api/
git add apps/provider-portal/store/index.ts
git add apps/provider-portal/pages/api/labs/index.ts
git add apps/patient-portal/hooks/useEmergencyDetection.ts
git add apps/patient-portal/package.json
git add .env.example
git add STREAMLINING_SESSION_3.md

# Commit
git commit -m "Integrate clinical-services with portals and add auth middleware

Clinical Safety Integration:
- Provider: useClinicalSafety hook for red flags, triage, drug checks
- Patient: useEmergencyDetection for COMPASS real-time detection
- Labs API: Auto-upgrades to STAT on emergency, AI recommendations

Authentication Middleware:
- withAuth, withRoles, withPermission wrappers
- Role-based permission matrix (admin to staff)
- Audit logging integration
- Rate limiting support

Code Organization:
- Unified useClinicalOrders hook for all ordering
- Barrel exports for hooks and stores
- Updated .env.example with auth config"

# Push
git push origin main
```

---

## Next Session Priorities

1. **Apply middleware to remaining API routes:**
   - imaging, medications, referrals, clinical/*
   
2. **Test end-to-end flow:**
   - Patient assessment with emergency symptoms
   - Verify STAT auto-upgrade
   - Verify WebSocket alerts
   
3. **Complete patient portal chat integration:**
   - Wire useEmergencyDetection to COMPASS chat
   - Add emergency modal component
   
4. **Add remaining unit tests:**
   - Test useClinicalSafety hook
   - Test API middleware
