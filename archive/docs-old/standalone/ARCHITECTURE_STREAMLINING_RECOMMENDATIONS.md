# ATTENDING AI Platform - Architecture Streamlining Recommendations

**Date**: January 12, 2026  
**Version**: 2.0

## Executive Summary

After reviewing the codebase, the ATTENDING AI platform has a solid foundation with excellent architectural decisions. The monorepo structure, shared package approach, and clinical data models are well-designed. However, there are opportunities to consolidate, reduce complexity, and improve maintainability.

---

## Current Architecture Assessment

### ✅ Strengths

| Area | Status | Notes |
|------|--------|-------|
| **Prisma Schema** | Excellent | 30+ models with comprehensive clinical data structures |
| **Shared Package** | Good | Store factory, API helpers, and machines properly abstracted |
| **TypeScript** | Strong | Type safety across the codebase |
| **State Management** | Good | Zustand with Immer - correct choice for healthcare workflows |
| **XState Machines** | Good | Assessment workflow properly modeled |
| **Real-time Services** | Good | Socket.io notification service architecture |

### ⚠️ Areas for Improvement

| Area | Issue | Impact |
|------|-------|--------|
| **Workspace Duplication** | Provider/Patient portals share similar components | Maintenance burden |
| **Service Fragmentation** | Multiple service directories (apps/, services/) | Confusion |
| **Legacy Code** | `_legacy-prototypes` still present | Cleanup needed |
| **Package Structure** | `packages/` partially populated | Incomplete migration |

---

## Recommended Architecture

### 1. Unified Package Structure

**Current state:**
```
packages/
├── clinical-types/     (exists but underutilized)
├── fhir/               (exists but minimal)
└── ui-primitives/      (exists but minimal)
apps/
├── shared/             (main shared code lives here)
├── provider-portal/
└── patient-portal/
```

**Recommended state:**
```
packages/
├── shared/                  # Core shared utilities
│   ├── types/              # All TypeScript interfaces
│   ├── schemas/            # Zod validation schemas
│   ├── services/           # Business logic services
│   ├── machines/           # XState machines
│   └── stores/             # Zustand store factories
├── ui/                      # Unified UI component library
│   ├── primitives/         # Base components (Button, Input, etc.)
│   ├── clinical/           # Clinical components (VitalSigns, Assessment)
│   └── layout/             # Layout components (Sidebar, Header)
├── fhir/                    # FHIR R4 integration
└── clinical-engine/         # Differential diagnosis, protocols
apps/
├── provider-portal/         # Minimal portal-specific code
├── patient-portal/          # Minimal portal-specific code
└── mobile/                  # React Native (future)
services/
├── notification-service/    # WebSocket/real-time
└── cds-hooks/              # Clinical decision support hooks
```

### 2. Component Consolidation Strategy

**Problem**: Both portals have duplicate components (Chat, Assessment, Orders).

**Solution**: Create a unified component library in `packages/ui/` with portal-specific wrappers.

```typescript
// packages/ui/clinical/Assessment/index.tsx
export const AssessmentCard = ({ assessment, onAction }) => {
  // Shared rendering logic
};

// apps/provider-portal/components/ProviderAssessmentCard.tsx
import { AssessmentCard } from '@attending/ui/clinical';

export const ProviderAssessmentCard = (props) => (
  <AssessmentCard 
    {...props}
    actions={['review', 'assign', 'order']}
    renderHeader={ProviderAssessmentHeader}
  />
);
```

### 3. Store Architecture Improvements

Your `createStore.ts` factory is excellent. Extend it to create domain-specific store factories:

```typescript
// packages/shared/stores/createOrderingStore.ts
export function createOrderingStore<TItem extends OrderItem>({
  name,
  apiEndpoint,
  catalog,
}: OrderingStoreConfig<TItem>) {
  return createStore<OrderingState<TItem>>(
    (set, get) => ({
      items: [],
      selectedItems: [],
      recommendations: [],
      
      // Shared ordering logic
      addItem: (item) => set(s => { s.selectedItems.push(item) }),
      removeItem: (id) => set(s => { 
        s.selectedItems = s.selectedItems.filter(i => i.id !== id) 
      }),
      submitOrder: async () => {
        const { selectedItems } = get();
        return apiPost(apiEndpoint, { items: selectedItems });
      },
    }),
    { name }
  );
}
```

Then reuse across domains:
```typescript
// apps/provider-portal/store/labOrderingStore.ts
export const useLabOrderingStore = createOrderingStore({
  name: 'lab-ordering',
  apiEndpoint: '/api/labs',
  catalog: LAB_CATALOG,
});

// apps/provider-portal/store/imagingOrderingStore.ts
export const useImagingOrderingStore = createOrderingStore({
  name: 'imaging-ordering',
  apiEndpoint: '/api/imaging',
  catalog: IMAGING_CATALOG,
});
```

**Estimated reduction**: 40-60% less store code

---

## Implementation Phases

### Phase 1: Cleanup & Consolidation (Week 1-2)

1. **Remove Legacy Code**
   - Delete `apps/_legacy-prototypes/`
   - Remove unused HTML files
   - Clean up `.bak` files

2. **Consolidate Shared Code**
   - Move `apps/shared/` → `packages/shared/`
   - Update workspace references
   - Verify imports still work

3. **Clean Up Services**
   - Evaluate `services/ai-service/` (placeholder - remove or implement)
   - Verify `services/cds-hooks/` is needed

### Phase 2: Package Restructure (Week 3-4)

1. **Create Unified UI Package**
   ```bash
   mkdir -p packages/ui/src/{primitives,clinical,layout}
   ```

2. **Extract Common Components**
   - Chat components (used in both portals)
   - Assessment display components
   - Order form components

3. **Create Clinical Engine Package**
   - Differential diagnosis algorithms
   - Red flag detection
   - Protocol matching

### Phase 3: API Standardization (Week 5-6)

1. **Implement API Client Package**
   ```typescript
   // packages/api-client/src/index.ts
   export class AttendingApiClient {
     constructor(private baseUrl: string) {}
     
     assessments = {
       list: () => this.get<Assessment[]>('/api/assessments'),
       get: (id: string) => this.get<Assessment>(`/api/assessments/${id}`),
       submit: (data: AssessmentInput) => this.post('/api/assessments', data),
     };
     
     labs = {
       order: (data: LabOrderInput) => this.post('/api/labs', data),
       results: (orderId: string) => this.get(`/api/labs/${orderId}/results`),
     };
   }
   ```

2. **Standardize API Response Format**
   ```typescript
   interface ApiResponse<T> {
     success: boolean;
     data?: T;
     error?: {
       code: string;
       message: string;
       details?: Record<string, string[]>;
     };
     meta?: {
       page?: number;
       totalPages?: number;
       timestamp: string;
     };
   }
   ```

### Phase 4: Testing Foundation (Week 7-8)

1. **Unit Tests** (Clinical logic priority)
   - Red flag detection
   - Urgency scoring
   - Differential diagnosis ranking

2. **Integration Tests**
   - Assessment submission flow
   - Order creation workflow
   - Real-time notification delivery

3. **E2E Tests** (Critical paths)
   - Patient completes COMPASS assessment
   - Provider reviews and orders tests
   - Emergency escalation workflow

---

## Specific Recommendations

### 1. Remove Redundant Files

```bash
# Files to delete
apps/_legacy-prototypes/          # Archived, not used
apps/provider-portal/inbox.tsx.bak
services/ai-service/             # Empty placeholder

# Consolidate these
apps/provider-portal/treatment-plan.tsx  # Duplicate of treatment-plans.tsx
```

### 2. Fix Workspace Configuration

Update root `package.json`:
```json
{
  "workspaces": [
    "packages/*",
    "apps/provider-portal",
    "apps/patient-portal"
  ]
}
```

### 3. Add Turborepo for Build Optimization

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["build"]
    },
    "lint": {}
  }
}
```

### 4. Standardize Environment Variables

Create `.env.example` at root:
```bash
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/attending"

# Authentication
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# Azure AD B2C (Production)
AZURE_AD_CLIENT_ID=""
AZURE_AD_CLIENT_SECRET=""
AZURE_AD_TENANT_ID=""

# AI Services
BIOMISTRAL_API_URL=""
BIOMISTRAL_API_KEY=""

# Real-time
WEBSOCKET_URL="ws://localhost:3003"
```

---

## Priority Matrix

| Task | Impact | Effort | Priority |
|------|--------|--------|----------|
| Delete legacy prototypes | High | Low | **P0** |
| Consolidate stores with factory | High | Medium | **P1** |
| Move shared → packages | Medium | Medium | **P1** |
| Create unified UI package | High | High | **P2** |
| Add Turborepo | Medium | Low | **P2** |
| Implement API client package | Medium | Medium | **P3** |
| Add comprehensive testing | High | High | **P3** |

---

## Success Metrics

After implementing these recommendations:

| Metric | Current | Target |
|--------|---------|--------|
| Lines of duplicate code | ~3,000 | <500 |
| Build time | ~90s | <30s |
| Time to add new order type | ~4 hours | <1 hour |
| Test coverage (clinical logic) | ~0% | >80% |
| Package dependencies | Scattered | Centralized |

---

## Quick-Win Cleanup Script

Run this to clean up immediately:

```bash
# From repository root
cd C:\Users\Scott\source\repos\La6kers\ATTENDING

# Remove legacy prototypes (if exists)
rmdir /s /q "apps\_legacy-prototypes" 2>nul

# Remove backup files
del /q "apps\provider-portal\*.bak" 2>nul

# Remove empty ai-service placeholder (keep if implementing)
# rmdir /s /q "services\ai-service" 2>nul

echo Cleanup complete!
```

---

## Next Immediate Steps

1. ✅ Run `scripts\git-commit.bat` to commit current state
2. Run cleanup script to remove legacy code
3. Test that apps still build: `npm run build`
4. Begin Phase 1 consolidation

---

## Appendix: File Structure After Optimization

```
ATTENDING/
├── apps/
│   ├── patient-portal/          # ~50 files (down from ~100)
│   │   ├── pages/
│   │   ├── components/          # Portal-specific only
│   │   └── styles/
│   └── provider-portal/         # ~80 files (down from ~150)
│       ├── pages/
│       ├── components/          # Portal-specific only
│       └── styles/
├── packages/
│   ├── shared/                  # Core business logic
│   │   ├── types/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── stores/
│   │   └── machines/
│   ├── ui/                      # All shared components
│   │   ├── primitives/
│   │   ├── clinical/
│   │   └── layout/
│   ├── fhir/                    # FHIR integration
│   └── clinical-engine/         # AI/diagnosis logic
├── services/
│   ├── notification-service/    # Real-time WebSocket
│   └── cds-hooks/              # CDS Hook endpoints
├── prisma/
│   └── schema.prisma           # Database schema
├── docs/                        # Documentation
└── scripts/                     # Build/deploy scripts
```

This structure reduces duplication, improves build times, and makes the codebase more maintainable for your team.
