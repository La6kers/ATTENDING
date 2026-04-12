// ============================================================
// Shared Store Types
// apps/shared/stores/types.ts
//
// Base types for all clinical ordering stores
// ============================================================

// =============================================================================
// Patient Context - Shared across all ordering modules
// =============================================================================

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
  weight?: number;
  insurancePlan?: string;
  // Renal function for medication/contrast dosing
  renalFunction?: {
    creatinine: number;
    gfr: number;
  };
  // Pregnancy status for contraindications
  pregnant?: boolean;
  breastfeeding?: boolean;
}

// =============================================================================
// Priority Types
// =============================================================================

export type OrderPriority = 'STAT' | 'URGENT' | 'ASAP' | 'ROUTINE';

// =============================================================================
// AI Recommendation Base Types
// =============================================================================

export type RecommendationCategory = 'critical' | 'recommended' | 'consider' | 'not-indicated' | 'avoid';

export interface BaseAIRecommendation {
  id: string;
  itemCode: string;
  itemName: string;
  priority: OrderPriority;
  rationale: string;
  clinicalEvidence: string[];
  confidence: number; // 0-1
  category: RecommendationCategory;
  redFlagRelated?: boolean;
  warningMessage?: string;
}

// =============================================================================
// Base Catalog Item
// =============================================================================

export interface BaseCatalogItem {
  code: string;
  name: string;
  description: string;
  category: string;
  defaultPriority: OrderPriority;
  cost: number;
}

// =============================================================================
// Base Selected Item
// =============================================================================

export interface BaseSelectedItem<T extends BaseCatalogItem> {
  item: T;
  priority: OrderPriority;
  aiRecommended: boolean;
  rationale?: string;
}

// =============================================================================
// Base Clinical Store State
// =============================================================================

export interface BaseClinicalStoreState<
  TItem extends BaseCatalogItem,
  TSelectedItem extends BaseSelectedItem<TItem>,
  TRecommendation extends BaseAIRecommendation,
  TCategory extends string
> {
  // Patient context
  patientContext: PatientContext | null;
  
  // Selected items
  selectedItems: Map<string, TSelectedItem>;
  
  // Order settings
  globalPriority: OrderPriority;
  clinicalIndication: string;
  specialInstructions: string;
  
  // AI Recommendations
  aiRecommendations: TRecommendation[];
  isLoadingRecommendations: boolean;
  
  // Search & Filter
  searchQuery: string;
  categoryFilter: TCategory | 'all';
  
  // UI State
  loading: boolean;
  submitting: boolean;
  error: string | null;
  lastSubmittedOrderIds: string[];
}

// =============================================================================
// Base Clinical Store Actions
// =============================================================================

// Note: TRecommendation and TCategory are included for type consistency with ClinicalStore
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface BaseClinicalStoreActions<
  TItem extends BaseCatalogItem,
  TSelectedItem extends BaseSelectedItem<TItem>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  TRecommendation extends BaseAIRecommendation,
  TCategory extends string
> {
  // Patient Context
  setPatientContext: (context: PatientContext) => void;
  
  // Item Selection
  addItem: (code: string, options?: Partial<Omit<TSelectedItem, 'item'>>) => void;
  removeItem: (code: string) => void;
  updateItemPriority: (code: string, priority: OrderPriority) => void;
  
  // Order Settings
  setGlobalPriority: (priority: OrderPriority) => void;
  setClinicalIndication: (indication: string) => void;
  setSpecialInstructions: (instructions: string) => void;
  
  // Search & Filter
  setSearchQuery: (query: string) => void;
  setCategoryFilter: (category: TCategory | 'all') => void;
  
  // AI Recommendations
  generateAIRecommendations: () => Promise<void>;
  addAIRecommendedItems: (category: RecommendationCategory) => void;
  
  // Order Submission
  submitOrder: (encounterId: string) => Promise<string[]>;
  clearOrder: () => void;
  
  // Computed Getters
  getSelectedItemsArray: () => TSelectedItem[];
  getFilteredCatalog: () => TItem[];
  getTotalCost: () => number;
  getStatCount: () => number;
}

// =============================================================================
// Complete Clinical Store Type
// =============================================================================

export type ClinicalStore<
  TItem extends BaseCatalogItem,
  TSelectedItem extends BaseSelectedItem<TItem>,
  TRecommendation extends BaseAIRecommendation,
  TCategory extends string
> = BaseClinicalStoreState<TItem, TSelectedItem, TRecommendation, TCategory> &
    BaseClinicalStoreActions<TItem, TSelectedItem, TRecommendation, TCategory>;

// =============================================================================
// Store Factory Configuration
// =============================================================================

export interface ClinicalStoreConfig<
  TItem extends BaseCatalogItem,
  TSelectedItem extends BaseSelectedItem<TItem>,
  TRecommendation extends BaseAIRecommendation,
  TCategory extends string
> {
  name: string;
  catalog: Record<string, TItem>;
  apiEndpoint: string;
  generateRecommendations: (context: PatientContext) => Promise<TRecommendation[]>;
  createSelectedItem: (item: TItem, options?: Partial<Omit<TSelectedItem, 'item'>>) => TSelectedItem;
  transformForSubmit: (selectedItem: TSelectedItem, context: PatientContext | null) => Record<string, any>;
  getItemSearchFields: (item: TItem) => string[];
}
