// =============================================================================
// ATTENDING AI - Provider Inbox Types
// apps/provider-portal/components/inbox/types.ts
// =============================================================================

export type CategoryType = 
  | 'encounters' 
  | 'phone' 
  | 'charts' 
  | 'messages' 
  | 'refills' 
  | 'labs' 
  | 'imaging'
  | 'incomplete';

export type PriorityLevel = 'urgent' | 'high' | 'normal' | 'low';

export type ItemStatus = 
  | 'unread' 
  | 'read' 
  | 'pending' 
  | 'in_progress'
  | 'completed' 
  | 'forwarded' 
  | 'reassigned';

export interface Provider {
  id: string;
  name: string;
  role: string;
  department: string;
  email?: string;
  avatar?: string;
}

export interface PatientVitals {
  bp: string;
  hr: string;
  temp: string;
  weight: string;
  spo2?: string;
  rr?: string;
  recordedAt: string;
}

export interface Medication {
  id: string;
  name: string;
  dose: string;
  frequency: string;
  route?: string;
  startDate?: string;
}

export interface LabResult {
  id: string;
  name: string;
  value: string;
  unit: string;
  status: 'normal' | 'abnormal' | 'critical';
  referenceRange?: string;
  collectedAt: string;
}

export interface PatientChartData {
  allergies: string[];
  conditions: string[];
  medications: Medication[];
  recentLabs: LabResult[];
  recentVitals: PatientVitals;
  lastVisit: {
    date: string;
    reason: string;
    provider: string;
  };
}

export interface InboxItem {
  id: string;
  category: CategoryType;
  patientId: string;
  patientName: string;
  patientAge: number;
  patientDOB: string;
  mrn: string;
  subject: string;
  preview: string;
  content: string;
  chiefComplaint?: string;
  symptoms?: string[];
  timestamp: Date;
  priority: PriorityLevel;
  status: ItemStatus;
  encounterType?: string;
  encounterStatus?: string;
  roomNumber?: string;
  waitTime?: string;
  callbackNumber?: string;
  callReason?: string;
  fromProvider?: string;
  consultType?: string;
  medication?: string;
  pharmacy?: string;
  lastFillDate?: string;
  labType?: 'normal' | 'abnormal' | 'critical';
  labOrderId?: string;
  imagingType?: string;
  imagingStatus?: 'pending' | 'completed' | 'preliminary';
  radiologistNote?: string;
  visitDate?: string;
  visitType?: string;
  daysOpen?: number;
  missingElements?: string[];
  chartData: PatientChartData;
  createdAt?: Date;
  updatedAt?: Date;
  completedAt?: Date;
  completedBy?: string;
  forwardedTo?: string;
  reassignedTo?: string;
}

export interface ResponseTemplate {
  id: string;
  title: string;
  category: string;
  content: string;
  confidence: number;
  reasoning: string;
  suggestedActions?: string[];
}

export interface CategoryCount {
  total: number;
  unread: number;
  urgent: number;
}

export interface InboxFilters {
  category: CategoryType;
  status?: ItemStatus[];
  priority?: PriorityLevel[];
  dateRange?: { start: Date; end: Date; };
  searchQuery?: string;
}

export interface InboxSortOptions {
  field: 'timestamp' | 'priority' | 'patientName' | 'status';
  direction: 'asc' | 'desc';
}

export type InboxAction = 
  | 'view' | 'complete' | 'forward' | 'reassign' 
  | 'mark_read' | 'mark_unread' | 'add_note' | 'start_encounter';

export interface AuditLogEntry {
  id: string;
  itemId: string;
  action: InboxAction;
  performedBy: string;
  performedAt: Date;
  details?: Record<string, unknown>;
}
