/**
 * Core medication management types for the provider portal
 */

export type MedicationStatus = 'active' | 'inactive' | 'discontinued' | 'expired' | 'pending' | 'out-of-stock';
export type MedicationForm = 'tablet' | 'capsule' | 'liquid' | 'injection' | 'topical' | 'inhaler' | 'patch' | 'suppository';
export type InteractionSeverity = 'minor' | 'moderate' | 'major' | 'contraindicated';
export type AllergySeverity = 'mild' | 'moderate' | 'severe' | 'life-threatening';
export type RefillStatus = 'available' | 'pending' | 'denied' | 'expired';

export interface Provider {
  id: string;
  name: string;
  npi: string;
  specialty: string;
  phone?: string;
  email?: string;
}

export interface Pharmacy {
  id: string;
  name: string;
  address: string;
  phone: string;
  fax?: string;
  hours: string;
  distance?: number;
  inNetwork: boolean;
  stockStatus?: 'in-stock' | 'low-stock' | 'out-of-stock' | 'unknown';
}

export interface Insurance {
  id: string;
  provider: string;
  memberId: string;
  groupNumber: string;
  copayGeneric: number;
  copayBrand: number;
  deductible: number;
  deductibleMet: number;
}

export interface Interaction {
  id: string;
  medicationIds: string[];
  severity: InteractionSeverity;
  description: string;
  clinicalSignificance: string;
  management: string;
  references?: string[];
}

export interface Contraindication {
  id: string;
  medicationId: string;
  condition: string;
  severity: InteractionSeverity;
  description: string;
  alternatives?: string[];
}

export interface Allergy {
  id: string;
  allergen: string;
  reaction: string;
  severity: AllergySeverity;
  onsetDate?: Date;
  notes?: string;
}

export interface MedicationHistory {
  id: string;
  medicationId: string;
  action: 'prescribed' | 'filled' | 'refilled' | 'discontinued' | 'modified';
  date: Date;
  providerId: string;
  pharmacyId?: string;
  notes?: string;
  quantity?: number;
}

export interface Medication {
  id: string;
  name: string;
  genericName: string;
  brandName?: string;
  strength: string;
  form: MedicationForm;
  status: MedicationStatus;
  ndc: string;
  
  // Prescription details
  prescriber: Provider;
  prescribedDate: Date;
  directions: string;
  quantity: number;
  daysSupply: number;
  refillsTotal: number;
  refillsRemaining: number;
  
  // Pharmacy information
  pharmacy: Pharmacy;
  lastFilled?: Date;
  nextRefillDate?: Date;
  
  // Clinical information
  indication?: string;
  interactions: Interaction[];
  contraindications: Contraindication[];
  
  // Additional metadata
  isControlled: boolean;
  scheduleClass?: string;
  cost?: number;
  notes?: string;
  
  // UI state (for frontend only)
  isExpanded?: boolean;
  hasWarnings?: boolean;
}

export interface MedicationSearchResult {
  id: string;
  name: string;
  genericName: string;
  strength: string;
  form: MedicationForm;
  manufacturer: string;
  ndc: string;
  commonIndications: string[];
  averageCost?: number;
}

export interface RefillRequest {
  medicationId: string;
  pharmacyId: string;
  requestedDate: Date;
  urgency: 'routine' | 'urgent' | 'emergency';
  notes?: string;
}

export interface RefillResponse {
  id: string;
  status: RefillStatus;
  estimatedReadyTime?: Date;
  pharmacyNotes?: string;
  cost?: number;
  authorizationRequired?: boolean;
}

export interface PrescriptionTransfer {
  fromPharmacyId: string;
  toPharmacyId: string;
  medicationId: string;
  transferDate: Date;
  status: 'pending' | 'approved' | 'completed' | 'denied';
  estimatedCompletionTime?: Date;
}

export interface MedicationAction {
  type: 'refill' | 'edit' | 'discontinue' | 'transfer' | 'add' | 'remove';
  medicationId: string;
  timestamp: Date;
  userId: string;
  metadata?: Record<string, any>;
}

export interface AIRecommendation {
  medicationId: string;
  type: 'dosage' | 'alternative' | 'interaction' | 'contraindication' | 'monitoring';
  recommendation: string;
  confidence: number;
  reasoning: string;
  alternatives?: MedicationSearchResult[];
  clinicalEvidence?: string[];
}

export interface MedicationListFilters {
  status?: MedicationStatus[];
  prescriber?: string[];
  pharmacy?: string[];
  form?: MedicationForm[];
  hasInteractions?: boolean;
  needsRefill?: boolean;
  searchQuery?: string;
}

export interface MedicationListSort {
  field: 'name' | 'prescribedDate' | 'lastFilled' | 'nextRefillDate' | 'status';
  direction: 'asc' | 'desc';
}

export interface MedicationSummary {
  totalMedications: number;
  activeMedications: number;
  expiredMedications: number;
  needingRefill: number;
  withInteractions: number;
  totalMonthlyCost: number;
}

// Form types for medication management
export interface AddMedicationForm {
  name: string;
  genericName?: string;
  strength: string;
  form: MedicationForm;
  directions: string;
  quantity: number;
  refills: number;
  indication?: string;
  prescriberId: string;
  pharmacyId: string;
  notes?: string;
}

export interface EditMedicationForm extends Partial<AddMedicationForm> {
  id: string;
  status?: MedicationStatus;
}

// API response types
export interface MedicationListResponse {
  medications: Medication[];
  summary: MedicationSummary;
  interactions: Interaction[];
  lastUpdated: Date;
}

export interface PharmacySearchResponse {
  pharmacies: Pharmacy[];
  searchRadius: number;
  totalFound: number;
}

export interface InteractionCheckResponse {
  interactions: Interaction[];
  contraindications: Contraindication[];
  warnings: string[];
  severity: InteractionSeverity;
}

// WebSocket event types
export interface MedicationWebSocketEvent {
  type: 'stock_update' | 'refill_status' | 'interaction_alert' | 'prescription_ready';
  medicationId?: string;
  pharmacyId?: string;
  data: any;
  timestamp: Date;
}

// Error types
export interface MedicationError {
  code: string;
  message: string;
  field?: string;
  details?: Record<string, any>;
}

export interface ValidationError extends MedicationError {
  field: string;
  value: any;
}

// Audit types for HIPAA compliance
export interface MedicationAuditLog {
  id: string;
  userId: string;
  patientId: string;
  action: MedicationAction['type'];
  medicationId?: string;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  details: Record<string, any>;
}
