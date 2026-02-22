# ATTENDING AI - Streamlining Implementation Guide

This guide provides step-by-step instructions for implementing the critical improvements identified in the Expert Code Review.

---

## Phase 1: Quick Wins (1-2 Days)

### 1.1 Remove Orphaned Root Files

```bash
# Run from repository root
cd C:\Users\Scott\source\repos\La6kers\ATTENDING

# Remove git command artifacts
del "e 1 - Production Fundamentals"
del "h origin mockup-2"
del "ISO"
del "tatus"
del "text"
```

### 1.2 Fix TypeScript `any` Usage in API Routes

Create a proper type extension for Prisma's PatientAssessment:

```typescript
// File: apps/provider-portal/types/prisma-extensions.ts

import type { PatientAssessment, Patient, Encounter } from '@prisma/client';

/**
 * Extended PatientAssessment with JSON fields properly typed
 */
export interface PatientAssessmentExtended extends PatientAssessment {
  // Typed JSON fields
  reviewOfSystems: Record<string, string[]> | null;
  socialHistory: {
    smoking?: string;
    alcohol?: string;
    drugs?: string;
    occupation?: string;
    livingSituation?: string;
  } | null;
  differentialDx: Array<{
    diagnosis: string;
    probability: number;
    evidence: string[];
  }> | null;
  confirmedDiagnoses: Array<{
    name: string;
    icdCode: string;
    isPrimary: boolean;
  }> | null;
}

/**
 * Encounter with typed relations
 */
export interface EncounterWithRelations extends Encounter {
  patient: Patient;
  patientAssessment: PatientAssessmentExtended | null;
}

/**
 * Helper to safely extract symptoms from assessment
 */
export function getAssessmentSymptoms(assessment: PatientAssessmentExtended | null): string[] {
  if (!assessment) return [];
  
  const symptoms: string[] = [];
  
  // From HPI associated symptoms
  if (assessment.hpiAssociated) {
    symptoms.push(...assessment.hpiAssociated);
  }
  
  // From review of systems
  if (assessment.reviewOfSystems) {
    Object.values(assessment.reviewOfSystems).forEach(systemSymptoms => {
      symptoms.push(...systemSymptoms);
    });
  }
  
  return symptoms;
}
```

Then update the API route:

```typescript
// File: apps/provider-portal/pages/api/labs/index.ts
// Replace the any casts with proper types

import type { 
  EncounterWithRelations, 
  PatientAssessmentExtended,
  getAssessmentSymptoms 
} from '@/types/prisma-extensions';

// In createLabOrder function:
const encounter = await prisma.encounter.findUnique({
  where: { id: encounterId },
  include: { 
    patient: true,
    patientAssessment: true,
  },
}) as EncounterWithRelations | null;

if (!encounter) {
  return res.status(404).json({ error: 'Encounter not found' });
}

const assessment = encounter.patientAssessment;
const symptoms = getAssessmentSymptoms(assessment);
const chiefComplaint = assessment?.chiefComplaint || indication;
```

---

## Phase 2: Consolidate Shared Code (2-3 Days)

### 2.1 Move apps/shared to packages/shared

```bash
# Create proper structure in packages/shared
mkdir -p packages/shared/src/catalogs
mkdir -p packages/shared/src/services
mkdir -p packages/shared/src/schemas
mkdir -p packages/shared/src/types
mkdir -p packages/shared/src/hooks

# Move content
xcopy apps\shared\catalogs packages\shared\src\catalogs /E
xcopy apps\shared\services packages\shared\src\services /E
xcopy apps\shared\schemas packages\shared\src\schemas /E
xcopy apps\shared\types packages\shared\src\types /E
xcopy apps\shared\hooks packages\shared\src\hooks /E
```

### 2.2 Update packages/shared/package.json

```json
{
  "name": "@attending/shared",
  "version": "1.0.0",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "sideEffects": false,
  "exports": {
    ".": "./src/index.ts",
    "./catalogs": "./src/catalogs/index.ts",
    "./services": "./src/services/index.ts",
    "./schemas": "./src/schemas/index.ts",
    "./types": "./src/types/index.ts",
    "./hooks": "./src/hooks/index.ts"
  },
  "dependencies": {
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "typescript": "^5.3.3"
  }
}
```

### 2.3 Create Barrel Exports

```typescript
// File: packages/shared/src/index.ts

// Catalogs
export * from './catalogs';

// Services
export * from './services';

// Schemas
export * from './schemas';

// Types
export * from './types';

// Hooks
export * from './hooks';
```

### 2.4 Update Import Paths

Find and replace across the codebase:
- `from '@attending/shared/catalogs'` → `from '@attending/shared/catalogs'` (same, but now from packages)
- `from 'apps/shared'` → `from '@attending/shared'`

---

## Phase 3: Create Generic Ordering Store Factory (3-4 Days)

### 3.1 Create the Factory

```typescript
// File: packages/shared/src/stores/createOrderingStore.ts

import { create, StateCreator } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';

enableMapSet();

// Generic types
export type OrderPriority = 'ROUTINE' | 'URGENT' | 'ASAP' | 'STAT';

export interface OrderableItem {
  code: string;
  name: string;
  category: string;
  cost?: number;
}

export interface SelectedItem<T extends OrderableItem> {
  item: T;
  priority: OrderPriority;
  aiRecommended: boolean;
  rationale?: string;
}

export interface AIRecommendation {
  itemCode: string;
  itemName: string;
  priority: OrderPriority;
  rationale: string;
  category: 'critical' | 'recommended' | 'optional';
  confidence: number;
}

export interface PatientContext {
  id: string;
  name: string;
  age?: number;
  gender?: string;
  chiefComplaint?: string;
  redFlags?: string[];
  allergies?: Array<{ allergen: string; severity: string }>;
  currentMedications?: string[];
  medicalHistory?: string[];
}

// Store config
export interface OrderingStoreConfig<T extends OrderableItem> {
  name: string;
  catalog: Record<string, T>;
  panels?: Record<string, { name: string; items: string[] }>;
  generateRecommendations: (context: PatientContext) => Promise<AIRecommendation[]>;
  submitEndpoint: string;
  persistKey?: string;
}

// Store state interface
export interface OrderingState<T extends OrderableItem> {
  // Data
  catalog: Map<string, T>;
  selectedItems: Map<string, SelectedItem<T>>;
  patientContext: PatientContext | null;
  
  // Settings
  defaultPriority: OrderPriority;
  clinicalIndication: string;
  specialInstructions: string;
  
  // AI
  recommendations: AIRecommendation[];
  isLoadingRecommendations: boolean;
  
  // Search
  searchQuery: string;
  categoryFilter: string;
  
  // UI State
  isSubmitting: boolean;
  error: string | null;
  lastSubmittedOrderIds: string[];
  
  // Actions
  setPatientContext: (context: PatientContext) => void;
  addItem: (itemOrCode: T | string, options?: {
    priority?: OrderPriority;
    rationale?: string;
    aiRecommended?: boolean;
  }) => void;
  addPanel: (panelId: string) => void;
  removeItem: (code: string) => void;
  updateItemPriority: (code: string, priority: OrderPriority) => void;
  setDefaultPriority: (priority: OrderPriority) => void;
  setClinicalIndication: (indication: string) => void;
  setSpecialInstructions: (instructions: string) => void;
  setSearchQuery: (query: string) => void;
  setCategoryFilter: (category: string) => void;
  resetFilters: () => void;
  loadRecommendations: (context: PatientContext) => Promise<void>;
  addRecommendedItems: (category: 'critical' | 'recommended' | 'optional') => void;
  submitOrder: (encounterId: string) => Promise<string[] | false>;
  clearOrder: () => void;
  
  // Computed
  getSelectedItemsArray: () => SelectedItem<T>[];
  getFilteredCatalog: () => T[];
  getTotalCost: () => number;
  getStatCount: () => number;
  canSubmit: () => boolean;
}

// Factory function
export function createOrderingStore<T extends OrderableItem>(
  config: OrderingStoreConfig<T>
) {
  const { name, catalog, panels, generateRecommendations, submitEndpoint, persistKey } = config;
  
  // Convert catalog to Map
  const catalogMap = new Map(Object.entries(catalog));
  
  const createStore: StateCreator<
    OrderingState<T>,
    [['zustand/devtools', never], ['zustand/immer', never]]
  > = (set, get) => ({
    // Initial state
    catalog: catalogMap,
    selectedItems: new Map(),
    patientContext: null,
    defaultPriority: 'ROUTINE',
    clinicalIndication: '',
    specialInstructions: '',
    recommendations: [],
    isLoadingRecommendations: false,
    searchQuery: '',
    categoryFilter: 'all',
    isSubmitting: false,
    error: null,
    lastSubmittedOrderIds: [],

    // Actions
    setPatientContext: (context) => {
      set(state => {
        state.patientContext = context;
        if (context.chiefComplaint) {
          state.clinicalIndication = `Evaluation for: ${context.chiefComplaint}`;
        }
      });
      get().loadRecommendations(context);
    },

    addItem: (itemOrCode, options = {}) => {
      let item: T | undefined;
      
      if (typeof itemOrCode === 'string') {
        item = catalogMap.get(itemOrCode);
      } else {
        item = itemOrCode;
      }
      
      if (!item) {
        console.warn(`Item not found in ${name} catalog`);
        return;
      }
      
      set(state => {
        if (!state.selectedItems.has(item!.code)) {
          state.selectedItems.set(item!.code, {
            item: item!,
            priority: options.priority || state.defaultPriority,
            aiRecommended: options.aiRecommended || false,
            rationale: options.rationale,
          });
        }
      });
    },

    addPanel: (panelId) => {
      if (!panels) return;
      const panel = panels[panelId];
      if (!panel) {
        console.warn(`Panel ${panelId} not found`);
        return;
      }
      panel.items.forEach(code => get().addItem(code));
    },

    removeItem: (code) => {
      set(state => { state.selectedItems.delete(code); });
    },

    updateItemPriority: (code, priority) => {
      set(state => {
        const item = state.selectedItems.get(code);
        if (item) item.priority = priority;
      });
    },

    setDefaultPriority: (priority) => {
      set(state => { state.defaultPriority = priority; });
    },

    setClinicalIndication: (indication) => {
      set({ clinicalIndication: indication });
    },

    setSpecialInstructions: (instructions) => {
      set({ specialInstructions: instructions });
    },

    setSearchQuery: (query) => {
      set({ searchQuery: query });
    },

    setCategoryFilter: (category) => {
      set({ categoryFilter: category });
    },

    resetFilters: () => {
      set(state => {
        state.searchQuery = '';
        state.categoryFilter = 'all';
      });
    },

    loadRecommendations: async (context) => {
      set({ isLoadingRecommendations: true, error: null });
      
      try {
        const recommendations = await generateRecommendations(context);
        set({ 
          recommendations, 
          isLoadingRecommendations: false,
        });
      } catch (error) {
        console.error(`Failed to load ${name} recommendations:`, error);
        set({ 
          isLoadingRecommendations: false,
          error: 'Failed to load recommendations',
        });
      }
    },

    addRecommendedItems: (category) => {
      const { recommendations, addItem } = get();
      recommendations
        .filter(rec => rec.category === category)
        .forEach(rec => {
          addItem(rec.itemCode, {
            priority: rec.priority,
            rationale: rec.rationale,
            aiRecommended: true,
          });
        });
    },

    submitOrder: async (encounterId) => {
      const { selectedItems, clinicalIndication, specialInstructions } = get();
      
      if (selectedItems.size === 0) {
        set({ error: 'No items selected' });
        return false;
      }
      
      if (!clinicalIndication) {
        set({ error: 'Clinical indication required' });
        return false;
      }
      
      set({ isSubmitting: true, error: null });
      
      try {
        const items = Array.from(selectedItems.values()).map(si => ({
          code: si.item.code,
          name: si.item.name,
          category: si.item.category,
          priority: si.priority,
        }));
        
        const response = await fetch(submitEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            encounterId,
            items,
            indication: clinicalIndication,
            specialInstructions,
          }),
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Submission failed');
        }
        
        const result = await response.json();
        const orderIds = result.orders?.map((o: any) => o.id) || [result.id];
        
        set(state => {
          state.isSubmitting = false;
          state.lastSubmittedOrderIds = orderIds;
        });
        
        get().clearOrder();
        return orderIds;
      } catch (error) {
        set(state => {
          state.isSubmitting = false;
          state.error = error instanceof Error ? error.message : 'Submission failed';
        });
        return false;
      }
    },

    clearOrder: () => {
      set(state => {
        state.selectedItems = new Map();
        state.defaultPriority = 'ROUTINE';
        state.clinicalIndication = '';
        state.specialInstructions = '';
        state.recommendations = [];
        state.error = null;
        state.searchQuery = '';
        state.categoryFilter = 'all';
      });
    },

    // Computed getters
    getSelectedItemsArray: () => Array.from(get().selectedItems.values()),

    getFilteredCatalog: () => {
      const { searchQuery, categoryFilter, catalog } = get();
      let items = Array.from(catalog.values());
      
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        items = items.filter(item => 
          item.name.toLowerCase().includes(query) ||
          item.code.toLowerCase().includes(query)
        );
      }
      
      if (categoryFilter !== 'all') {
        items = items.filter(item => item.category === categoryFilter);
      }
      
      return items;
    },

    getTotalCost: () => {
      return get().getSelectedItemsArray()
        .reduce((sum, si) => sum + (si.item.cost || 0), 0);
    },

    getStatCount: () => {
      return get().getSelectedItemsArray()
        .filter(si => si.priority === 'STAT').length;
    },

    canSubmit: () => {
      const state = get();
      return state.selectedItems.size > 0 && 
             state.clinicalIndication.length > 0 &&
             !state.isSubmitting;
    },
  });

  // Apply middleware
  const baseStore = immer(createStore);
  const withDevTools = devtools(baseStore, { name: `${name}-ordering-store` });
  
  // Optionally add persistence
  if (persistKey) {
    return create(persist(withDevTools, {
      name: persistKey,
      partialize: (state) => ({
        selectedItems: Array.from(state.selectedItems.entries()),
        clinicalIndication: state.clinicalIndication,
        specialInstructions: state.specialInstructions,
      }),
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as any),
        selectedItems: new Map((persisted as any)?.selectedItems || []),
      }),
    }));
  }
  
  return create(withDevTools);
}
```

### 3.2 Refactor Lab Store to Use Factory

```typescript
// File: apps/provider-portal/store/labOrderingStore.ts

import { createOrderingStore } from '@attending/shared/stores';
import { LAB_CATALOG, LAB_PANELS } from '@attending/shared/catalogs';
import { labRecommender } from '@attending/clinical-services';
import type { LabTest } from '@attending/shared/catalogs';

// Generate recommendations adapter
const generateLabRecommendations = async (context) => {
  try {
    const recs = await labRecommender.getRecommendations({
      chiefComplaint: context.chiefComplaint || '',
      symptoms: context.redFlags || [],
      age: context.age || 0,
      gender: context.gender || 'unknown',
    });
    
    return recs.map(r => ({
      itemCode: r.testCode,
      itemName: r.testName,
      priority: r.priority,
      rationale: r.rationale,
      category: r.category,
      confidence: r.confidence || 0.8,
    }));
  } catch (error) {
    console.error('Lab recommendation failed:', error);
    return [];
  }
};

// Create store with factory
export const useLabOrderingStore = createOrderingStore<LabTest>({
  name: 'lab',
  catalog: LAB_CATALOG,
  panels: LAB_PANELS,
  generateRecommendations: generateLabRecommendations,
  submitEndpoint: '/api/labs',
  persistKey: 'lab-ordering-draft',
});

export default useLabOrderingStore;
```

---

## Phase 4: Standardize API Error Responses (1 Day)

### 4.1 Create Error Utilities

```typescript
// File: apps/provider-portal/lib/api/errors.ts

import type { NextApiResponse } from 'next';

export interface APIError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
  requestId?: string;
}

export type ErrorCode = 
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'INTERNAL_ERROR'
  | 'RATE_LIMITED'
  | 'SERVICE_UNAVAILABLE';

const ERROR_STATUS_MAP: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  INTERNAL_ERROR: 500,
  RATE_LIMITED: 429,
  SERVICE_UNAVAILABLE: 503,
};

export function sendError(
  res: NextApiResponse,
  code: ErrorCode,
  message: string,
  details?: Record<string, any>
): void {
  const status = ERROR_STATUS_MAP[code];
  
  res.status(status).json({
    code,
    message,
    details,
    timestamp: new Date().toISOString(),
    requestId: res.getHeader('x-request-id'),
  } as APIError);
}

// Convenience methods
export const sendValidationError = (
  res: NextApiResponse, 
  details: Record<string, any>
) => sendError(res, 'VALIDATION_ERROR', 'Validation failed', details);

export const sendNotFound = (
  res: NextApiResponse, 
  resource: string
) => sendError(res, 'NOT_FOUND', `${resource} not found`);

export const sendUnauthorized = (
  res: NextApiResponse
) => sendError(res, 'UNAUTHORIZED', 'Authentication required');

export const sendInternalError = (
  res: NextApiResponse, 
  error?: Error
) => sendError(
  res, 
  'INTERNAL_ERROR', 
  'An unexpected error occurred',
  process.env.NODE_ENV === 'development' ? { stack: error?.stack } : undefined
);
```

### 4.2 Update API Routes

```typescript
// File: apps/provider-portal/pages/api/labs/index.ts
// Example update

import { sendValidationError, sendNotFound, sendInternalError } from '@/lib/api/errors';

async function createLabOrder(req, res, session) {
  const validation = validate(CreateLabOrderSchema, req.body);
  
  if (!validation.success) {
    return sendValidationError(res, validation.error.flatten());
  }
  
  try {
    const encounter = await prisma.encounter.findUnique({...});
    
    if (!encounter) {
      return sendNotFound(res, 'Encounter');
    }
    
    // ... rest of implementation
    
  } catch (error) {
    console.error('Lab order creation failed:', error);
    return sendInternalError(res, error as Error);
  }
}
```

---

## Testing the Changes

After implementing each phase, run:

```bash
# Type checking
npm run typecheck:all

# Unit tests
npm run test:run

# Build verification
npm run build

# E2E tests (if available)
npm run test:e2e
```

---

## Rollback Plan

If issues arise:

1. Each phase is independent - can be rolled back separately
2. Git branches for each phase: `streamline/phase-1`, `streamline/phase-2`, etc.
3. Original stores preserved until new ones verified
4. Database schema unchanged - no migrations needed

---

*Implementation Guide v1.0 - January 2026*
