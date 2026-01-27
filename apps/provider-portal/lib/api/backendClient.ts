/**
 * ATTENDING AI - Backend API Client
 * 
 * TypeScript client for communicating with the .NET backend API.
 * Provides typed methods for all clinical operations.
 */

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

/**
 * Base API client with authentication and error handling
 */
class ApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.accessToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(
        error.title || 'API Error',
        response.status,
        error.detail || response.statusText,
        error.errors
      );
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

/**
 * Custom API error class
 */
export class ApiError extends Error {
  status: number;
  detail: string;
  errors?: Record<string, string[]>;

  constructor(
    message: string,
    status: number,
    detail: string,
    errors?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
    this.errors = errors;
  }
}

// Create singleton instance
export const apiClient = new ApiClient();

// =============================================================================
// TYPE DEFINITIONS (matching .NET Contracts)
// =============================================================================

// Common Types
export interface PatientSummary {
  id: string;
  mrn: string;
  fullName: string;
  age: number;
  sex: string;
}

export interface ProviderSummary {
  id: string;
  fullName: string;
  npi?: string;
  specialty?: string;
}

// Lab Order Types
export interface LabOrderResponse {
  id: string;
  orderNumber: string;
  patientId: string;
  patient?: PatientSummary;
  encounterId: string;
  orderingProviderId: string;
  orderingProvider?: ProviderSummary;
  testCode: string;
  testName: string;
  cptCode: string;
  cptDescription?: string;
  loincCode: string;
  category: string;
  priority: 'Routine' | 'Urgent' | 'Asap' | 'Stat';
  clinicalIndication: string;
  diagnosisCode: string;
  diagnosisDescription?: string;
  requiresFasting: boolean;
  isStatFromRedFlag: boolean;
  redFlagReason?: string;
  status: 'Pending' | 'Collected' | 'InProcess' | 'Completed' | 'Cancelled';
  orderedAt: string;
  collectedAt?: string;
  resultedAt?: string;
  result?: LabResultResponse;
}

export interface LabOrderSummary {
  id: string;
  orderNumber: string;
  testName: string;
  priority: string;
  status: string;
  orderedAt: string;
  hasResult: boolean;
}

export interface LabResultResponse {
  id: string;
  value: string;
  unit?: string;
  referenceRangeLow?: number;
  referenceRangeHigh?: number;
  referenceRangeText?: string;
  interpretation?: string;
  isCritical: boolean;
  criticalNotifiedAt?: string;
  performingLab?: string;
  resultedAt: string;
  comments?: string;
}

export interface CreateLabOrderRequest {
  patientId: string;
  encounterId: string;
  testCode: string;
  testName: string;
  cptCode: string;
  cptDescription?: string;
  cptBasePrice?: number;
  loincCode: string;
  category: string;
  priority: string;
  clinicalIndication: string;
  diagnosisCode: string;
  diagnosisDescription?: string;
  requiresFasting: boolean;
  painSeverity?: number;
}

export interface CreateLabOrderResponse {
  labOrderId: string;
  orderNumber: string;
  wasUpgradedToStat: boolean;
  redFlagReason?: string;
}

// Imaging Order Types
export interface ImagingOrderResponse {
  id: string;
  orderNumber: string;
  patientId: string;
  patient?: PatientSummary;
  studyCode: string;
  studyName: string;
  modality: string;
  bodyPart: string;
  laterality?: string;
  withContrast: boolean;
  cptCode: string;
  priority: string;
  clinicalIndication: string;
  diagnosisCode: string;
  estimatedRadiationDose?: number;
  status: string;
  orderedAt: string;
  scheduledAt?: string;
  completedAt?: string;
  result?: ImagingResultResponse;
}

export interface ImagingResultResponse {
  id: string;
  findings: string;
  impression: string;
  hasCriticalFindings: boolean;
  criticalFindingsDescription?: string;
  readingRadiologist?: string;
  readAt: string;
}

export interface RadiationDoseResponse {
  patientId: string;
  totalDoseMsv: number;
  monthsIncluded: number;
  riskLevel: string;
}

export interface CreateImagingOrderRequest {
  patientId: string;
  encounterId: string;
  studyCode: string;
  studyName: string;
  modality: string;
  bodyPart: string;
  laterality?: string;
  withContrast: boolean;
  cptCode: string;
  priority: string;
  clinicalIndication: string;
  diagnosisCode: string;
  estimatedRadiationDose?: number;
}

// Medication Types
export interface MedicationOrderResponse {
  id: string;
  orderNumber: string;
  patientId: string;
  patient?: PatientSummary;
  medicationCode: string;
  medicationName: string;
  genericName: string;
  strength: string;
  form: string;
  route: string;
  frequency: string;
  dosage: string;
  quantity: number;
  refills: number;
  instructions?: string;
  clinicalIndication: string;
  diagnosisCode: string;
  isControlledSubstance: boolean;
  deaSchedule?: string;
  hasBlackBoxWarning: boolean;
  pharmacyName?: string;
  status: string;
  orderedAt: string;
  interactions?: DrugInteractionResponse[];
}

export interface DrugInteractionResponse {
  drug1: string;
  drug2: string;
  severity: string;
  description: string;
  interactionType: string;
}

export interface CreateMedicationOrderRequest {
  patientId: string;
  encounterId: string;
  medicationCode: string;
  medicationName: string;
  genericName: string;
  strength: string;
  form: string;
  route: string;
  frequency: string;
  dosage: string;
  quantity: number;
  refills: number;
  instructions?: string;
  clinicalIndication: string;
  diagnosisCode: string;
  isControlledSubstance?: boolean;
  deaSchedule?: string;
  pharmacyId?: string;
  pharmacyName?: string;
}

// Referral Types
export interface ReferralResponse {
  id: string;
  referralNumber: string;
  patientId: string;
  patient?: PatientSummary;
  specialty: string;
  urgency: string;
  clinicalQuestion: string;
  diagnosisCode: string;
  reasonForReferral?: string;
  referredToProviderName?: string;
  referredToFacility?: string;
  insuranceAuthNumber?: string;
  authExpirationDate?: string;
  status: string;
  referredAt: string;
  scheduledAt?: string;
  completedAt?: string;
  consultNotes?: string;
}

export interface CreateReferralRequest {
  patientId: string;
  encounterId: string;
  specialty: string;
  urgency: string;
  clinicalQuestion: string;
  diagnosisCode: string;
  reasonForReferral?: string;
  referredToProviderId?: string;
  referredToProviderName?: string;
  referredToFacility?: string;
}

// Assessment Types
export interface AssessmentResponse {
  id: string;
  assessmentNumber: string;
  patientId: string;
  patient?: PatientSummary;
  chiefComplaint: string;
  currentPhase: string;
  triageLevel?: string;
  painSeverity?: number;
  hpi?: HpiResponse;
  hasRedFlags: boolean;
  redFlags?: RedFlagResponse[];
  isEmergency: boolean;
  emergencyReason?: string;
  startedAt: string;
  completedAt?: string;
  reviewedAt?: string;
}

export interface AssessmentSummary {
  id: string;
  assessmentNumber: string;
  patient?: PatientSummary;
  chiefComplaint: string;
  currentPhase: string;
  triageLevel?: string;
  hasRedFlags: boolean;
  isEmergency: boolean;
  startedAt: string;
  completedAt?: string;
}

export interface HpiResponse {
  onset?: string;
  location?: string;
  duration?: string;
  character?: string;
  aggravating?: string;
  relieving?: string;
  timing?: string;
  severity?: string;
  context?: string;
  associatedSymptoms?: string;
}

export interface RedFlagResponse {
  category: string;
  matchedKeyword: string;
  severity: string;
  clinicalReason: string;
}

export interface StartAssessmentRequest {
  patientId: string;
  chiefComplaint: string;
}

export interface SubmitAssessmentResponseRequest {
  question: string;
  response: string;
}

// =============================================================================
// API SERVICE METHODS
// =============================================================================

export const labOrdersApi = {
  getById: (id: string) => 
    apiClient.get<LabOrderResponse>(`/laborders/${id}`),
  
  getByOrderNumber: (orderNumber: string) => 
    apiClient.get<LabOrderResponse>(`/laborders/by-number/${orderNumber}`),
  
  getByPatient: (patientId: string, status?: string, skip = 0, take = 20) => {
    let url = `/laborders/patient/${patientId}?skip=${skip}&take=${take}`;
    if (status) url += `&status=${status}`;
    return apiClient.get<LabOrderSummary[]>(url);
  },
  
  getByEncounter: (encounterId: string) => 
    apiClient.get<LabOrderSummary[]>(`/laborders/encounter/${encounterId}`),
  
  getPending: () => 
    apiClient.get<LabOrderResponse[]>('/laborders/pending'),
  
  getCritical: () => 
    apiClient.get<LabOrderResponse[]>('/laborders/critical'),
  
  create: (request: CreateLabOrderRequest) => 
    apiClient.post<CreateLabOrderResponse>('/laborders', request),
  
  updatePriority: (id: string, newPriority: string) => 
    apiClient.patch<{ previousPriority?: string; newPriority: string }>(
      `/laborders/${id}/priority`, 
      { newPriority }
    ),
  
  cancel: (id: string, reason: string) => 
    apiClient.post(`/laborders/${id}/cancel`, { reason }),
  
  markCollected: (id: string, collectedAt: Date = new Date()) => 
    apiClient.post(`/laborders/${id}/collect`, { collectedAt: collectedAt.toISOString() }),
  
  addResult: (id: string, result: {
    value: string;
    unit?: string;
    referenceRangeLow?: number;
    referenceRangeHigh?: number;
    interpretation?: string;
    isCritical: boolean;
    performingLab?: string;
    comments?: string;
  }) => apiClient.post<{ resultId: string; isCritical: boolean }>(`/laborders/${id}/result`, result),
};

export const imagingOrdersApi = {
  getById: (id: string) => 
    apiClient.get<ImagingOrderResponse>(`/imagingorders/${id}`),
  
  getByPatient: (patientId: string) => 
    apiClient.get<ImagingOrderResponse[]>(`/imagingorders/patient/${patientId}`),
  
  getByEncounter: (encounterId: string) => 
    apiClient.get<ImagingOrderResponse[]>(`/imagingorders/encounter/${encounterId}`),
  
  getByStatus: (status: string) => 
    apiClient.get<ImagingOrderResponse[]>(`/imagingorders/status/${status}`),
  
  getRadiationDose: (patientId: string, monthsBack = 12) => 
    apiClient.get<RadiationDoseResponse>(
      `/imagingorders/patient/${patientId}/radiation-dose?monthsBack=${monthsBack}`
    ),
  
  create: (request: CreateImagingOrderRequest) => 
    apiClient.post<ImagingOrderResponse>('/imagingorders', request),
  
  schedule: (id: string, scheduledAt: Date, location?: string) => 
    apiClient.post(`/imagingorders/${id}/schedule`, { 
      scheduledAt: scheduledAt.toISOString(), 
      location 
    }),
  
  cancel: (id: string, reason: string) => 
    apiClient.post(`/imagingorders/${id}/cancel`, { reason }),
};

export const medicationsApi = {
  getById: (id: string) => 
    apiClient.get<MedicationOrderResponse>(`/medications/${id}`),
  
  getByPatient: (patientId: string) => 
    apiClient.get<MedicationOrderResponse[]>(`/medications/patient/${patientId}`),
  
  getActiveByPatient: (patientId: string) => 
    apiClient.get<MedicationOrderResponse[]>(`/medications/patient/${patientId}/active`),
  
  getByEncounter: (encounterId: string) => 
    apiClient.get<MedicationOrderResponse[]>(`/medications/encounter/${encounterId}`),
  
  checkInteractions: (patientId: string, newMedicationName: string) => 
    apiClient.post<DrugInteractionResponse[]>(
      `/medications/patient/${patientId}/check-interactions`, 
      { newMedicationName }
    ),
  
  create: (request: CreateMedicationOrderRequest) => 
    apiClient.post<MedicationOrderResponse>('/medications', request),
  
  discontinue: (id: string, reason: string) => 
    apiClient.post(`/medications/${id}/discontinue`, { reason }),
};

export const referralsApi = {
  getSpecialties: () => 
    apiClient.get<string[]>('/referrals/specialties'),
  
  getById: (id: string) => 
    apiClient.get<ReferralResponse>(`/referrals/${id}`),
  
  getByPatient: (patientId: string) => 
    apiClient.get<ReferralResponse[]>(`/referrals/patient/${patientId}`),
  
  getByStatus: (status: string) => 
    apiClient.get<ReferralResponse[]>(`/referrals/status/${status}`),
  
  getPendingBySpecialty: (specialty: string) => 
    apiClient.get<ReferralResponse[]>(`/referrals/pending/specialty/${specialty}`),
  
  create: (request: CreateReferralRequest) => 
    apiClient.post<ReferralResponse>('/referrals', request),
  
  schedule: (id: string, scheduledAt: Date) => 
    apiClient.post(`/referrals/${id}/schedule`, { scheduledAt: scheduledAt.toISOString() }),
  
  addAuthorization: (id: string, authNumber: string, expirationDate?: Date) => 
    apiClient.post(`/referrals/${id}/authorization`, { 
      authNumber, 
      expirationDate: expirationDate?.toISOString() 
    }),
  
  complete: (id: string, consultNotes: string) => 
    apiClient.post(`/referrals/${id}/complete`, { consultNotes }),
  
  cancel: (id: string, reason: string) => 
    apiClient.post(`/referrals/${id}/cancel`, { reason }),
};

export const assessmentsApi = {
  getById: (id: string) => 
    apiClient.get<AssessmentResponse>(`/assessments/${id}`),
  
  getByPatient: (patientId: string) => 
    apiClient.get<AssessmentSummary[]>(`/assessments/patient/${patientId}`),
  
  getPendingReview: () => 
    apiClient.get<AssessmentSummary[]>('/assessments/pending-review'),
  
  getWithRedFlags: () => 
    apiClient.get<AssessmentSummary[]>('/assessments/red-flags'),
  
  start: (request: StartAssessmentRequest) => 
    apiClient.post<AssessmentResponse>('/assessments', request),
  
  submitResponse: (id: string, request: SubmitAssessmentResponseRequest) => 
    apiClient.post<AssessmentResponse>(`/assessments/${id}/responses`, request),
  
  advancePhase: (id: string, newPhase: string, data?: Record<string, string>) => 
    apiClient.post<AssessmentResponse>(`/assessments/${id}/advance`, { newPhase, data }),
  
  complete: (id: string, triageLevel: string, summary?: string) => 
    apiClient.post<AssessmentResponse>(`/assessments/${id}/complete`, { triageLevel, summary }),
  
  review: (id: string, notes?: string) => 
    apiClient.post(`/assessments/${id}/review`, { notes }),
};

export const systemApi = {
  getVersion: () => 
    apiClient.get<{ version: string; apiVersion: string; environment: string; buildDate: string }>(
      '/system/version'
    ),
  
  ping: () => 
    apiClient.get<{ status: string; timestamp: string }>('/system/ping'),
  
  getSpecialties: () => 
    apiClient.get<string[]>('/system/specialties'),
  
  getLabCategories: () => 
    apiClient.get<string[]>('/system/lab-categories'),
  
  getImagingModalities: () => 
    apiClient.get<string[]>('/system/imaging-modalities'),
};

export default {
  labOrders: labOrdersApi,
  imagingOrders: imagingOrdersApi,
  medications: medicationsApi,
  referrals: referralsApi,
  assessments: assessmentsApi,
  system: systemApi,
  setAccessToken: (token: string | null) => apiClient.setAccessToken(token),
};
