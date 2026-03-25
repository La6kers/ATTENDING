// ============================================================
// Pharmacy Inventory Service Types
// apps/shared/services/PharmacyInventoryService.ts
// ============================================================

export interface PharmacyInfo {
  id: string;
  name: string;
  address: string;
  phone: string;
  fax?: string;
  npi?: string;
  isPreferred?: boolean;
  operatingHours?: string;
}

export interface InventoryItem {
  medicationName: string;
  ndc: string;
  availability: 'in_stock' | 'low_stock' | 'out_of_stock' | 'special_order';
  quantity?: number;
  estimatedCost?: number;
  lastUpdated?: string;
}

export interface PharmacyInventoryService {
  checkAvailability(medicationName: string, pharmacyId?: string): Promise<InventoryItem>;
  findNearbyPharmacies(zipCode: string): Promise<PharmacyInfo[]>;
  getPreferredPharmacy(patientId: string): Promise<PharmacyInfo | null>;
}
