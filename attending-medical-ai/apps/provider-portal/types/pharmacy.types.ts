/**
 * Pharmacy-related types for the provider portal
 */

export interface PharmacyContact {
  phone: string;
  fax?: string;
  email?: string;
  website?: string;
}

export interface PharmacyHours {
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
  saturday: string;
  sunday: string;
  holidays?: string;
}

export interface PharmacyServices {
  delivery: boolean;
  driveThru: boolean;
  consultation: boolean;
  vaccination: boolean;
  compounding: boolean;
  mtm: boolean; // Medication Therapy Management
  syncRefills: boolean;
  autoRefill: boolean;
}

export interface PharmacyStaff {
  pharmacistInCharge: string;
  pharmacistLicense: string;
  technicians: number;
  languages: string[];
}

export interface PharmacyLocation {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  accessibility: {
    wheelchairAccessible: boolean;
    parkingAvailable: boolean;
    publicTransport: boolean;
  };
}

export interface PharmacyInventory {
  medicationId: string;
  ndc: string;
  quantity: number;
  lastUpdated: Date;
  status: 'in-stock' | 'low-stock' | 'out-of-stock' | 'discontinued';
  estimatedRestockDate?: Date;
  alternativeNdcs?: string[];
}

export interface PharmacyPricing {
  medicationId: string;
  ndc: string;
  cashPrice: number;
  insurancePrice?: number;
  discountPrograms: {
    name: string;
    price: number;
    eligibilityRequirements: string[];
  }[];
  lastUpdated: Date;
}

export interface PharmacyRating {
  overall: number;
  service: number;
  speed: number;
  accuracy: number;
  reviewCount: number;
  lastUpdated: Date;
}

export interface PharmacyChain {
  id: string;
  name: string;
  logo?: string;
  website?: string;
  corporatePhone?: string;
  rewards?: {
    programName: string;
    benefits: string[];
    enrollmentUrl?: string;
  };
}

export interface DetailedPharmacy {
  id: string;
  name: string;
  chain?: PharmacyChain;
  location: PharmacyLocation;
  contact: PharmacyContact;
  hours: PharmacyHours;
  services: PharmacyServices;
  staff: PharmacyStaff;
  rating?: PharmacyRating;
  
  // Network and insurance
  inNetwork: boolean;
  acceptedInsurance: string[];
  
  // Operational status
  isOpen: boolean;
  temporaryClosure?: {
    reason: string;
    expectedReopenDate?: Date;
  };
  
  // Distance and convenience
  distance?: number;
  estimatedTravelTime?: number;
  
  // Inventory and pricing
  inventory: PharmacyInventory[];
  pricing: PharmacyPricing[];
  
  // Patient preferences
  isPreferred: boolean;
  isPrimary: boolean;
  lastUsed?: Date;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface PharmacySearchCriteria {
  location?: {
    latitude: number;
    longitude: number;
    radius: number; // in miles
  };
  address?: string;
  zipCode?: string;
  
  // Filters
  chains?: string[];
  services?: (keyof PharmacyServices)[];
  inNetworkOnly?: boolean;
  openNow?: boolean;
  hasStock?: string[]; // medication NDCs
  
  // Sorting
  sortBy?: 'distance' | 'rating' | 'price' | 'name';
  sortOrder?: 'asc' | 'desc';
  
  // Pagination
  limit?: number;
  offset?: number;
}

export interface PharmacySearchResult {
  pharmacies: DetailedPharmacy[];
  totalFound: number;
  searchCriteria: PharmacySearchCriteria;
  searchRadius: number;
  searchLocation?: {
    latitude: number;
    longitude: number;
    address: string;
  };
}

export interface PharmacyTransferRequest {
  fromPharmacyId: string;
  toPharmacyId: string;
  medicationId: string;
  patientId: string;
  requestedBy: string;
  urgency: 'routine' | 'urgent' | 'emergency';
  notes?: string;
  preferredPickupTime?: Date;
}

export interface PharmacyTransferResponse {
  transferId: string;
  status: 'pending' | 'approved' | 'in-progress' | 'completed' | 'denied' | 'cancelled';
  estimatedCompletionTime?: Date;
  actualCompletionTime?: Date;
  fromPharmacy: DetailedPharmacy;
  toPharmacy: DetailedPharmacy;
  cost?: number;
  denialReason?: string;
  trackingNumber?: string;
  notifications: {
    sms?: boolean;
    email?: boolean;
    call?: boolean;
  };
}

export interface PharmacyStockAlert {
  pharmacyId: string;
  medicationId: string;
  ndc: string;
  previousStatus: PharmacyInventory['status'];
  currentStatus: PharmacyInventory['status'];
  timestamp: Date;
  estimatedRestockDate?: Date;
  alternativePharmacies?: {
    pharmacyId: string;
    distance: number;
    stockStatus: PharmacyInventory['status'];
  }[];
}

export interface PharmacyPreferences {
  patientId: string;
  primaryPharmacyId: string;
  backupPharmacyIds: string[];
  preferences: {
    autoRefill: boolean;
    syncRefills: boolean;
    deliveryPreferred: boolean;
    textNotifications: boolean;
    emailNotifications: boolean;
    callNotifications: boolean;
    preferredPickupTime: 'morning' | 'afternoon' | 'evening' | 'anytime';
    specialInstructions?: string;
  };
  updatedAt: Date;
}

export interface PharmacyReview {
  id: string;
  pharmacyId: string;
  patientId: string;
  rating: number;
  categories: {
    service: number;
    speed: number;
    accuracy: number;
    cleanliness: number;
    staff: number;
  };
  comment?: string;
  isVerified: boolean;
  createdAt: Date;
  helpful: number;
  reported: boolean;
}

export interface PharmacyPromotion {
  id: string;
  pharmacyId?: string; // null for chain-wide promotions
  chainId?: string;
  title: string;
  description: string;
  discountType: 'percentage' | 'fixed' | 'bogo' | 'free-service';
  discountValue: number;
  applicableMedications?: string[]; // NDCs or medication names
  minimumPurchase?: number;
  validFrom: Date;
  validUntil: Date;
  termsAndConditions: string;
  isActive: boolean;
}

export interface PharmacyDelivery {
  id: string;
  pharmacyId: string;
  patientId: string;
  medicationIds: string[];
  deliveryAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    instructions?: string;
  };
  scheduledTime: Date;
  estimatedArrival: Date;
  actualArrival?: Date;
  status: 'scheduled' | 'preparing' | 'out-for-delivery' | 'delivered' | 'failed' | 'cancelled';
  deliveryFee: number;
  driverInfo?: {
    name: string;
    phone: string;
    vehicleInfo: string;
  };
  trackingNumber: string;
  signatureRequired: boolean;
  specialInstructions?: string;
}

// API response types
export interface PharmacyApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  errors?: string[];
  timestamp: Date;
}

export interface PharmacyBulkOperation {
  operation: 'transfer' | 'refill' | 'cancel' | 'update-preferences';
  pharmacyIds?: string[];
  medicationIds?: string[];
  parameters: Record<string, any>;
  batchId: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'partial';
  results?: {
    successful: string[];
    failed: { id: string; error: string; }[];
  };
}

export interface PharmacyAnalytics {
  pharmacyId: string;
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    totalPrescriptions: number;
    averageWaitTime: number;
    customerSatisfaction: number;
    onTimeDelivery: number;
    stockAccuracy: number;
    refillRate: number;
  };
  trends: {
    prescriptionVolume: { date: Date; count: number; }[];
    waitTimes: { date: Date; minutes: number; }[];
    satisfaction: { date: Date; rating: number; }[];
  };
}

// Error types specific to pharmacy operations
export interface PharmacyError {
  code: 'PHARMACY_NOT_FOUND' | 'OUT_OF_STOCK' | 'TRANSFER_DENIED' | 'DELIVERY_UNAVAILABLE' | 'INSURANCE_REJECTED';
  message: string;
  pharmacyId?: string;
  medicationId?: string;
  details?: Record<string, any>;
}
