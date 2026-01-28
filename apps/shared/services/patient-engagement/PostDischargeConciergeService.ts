// =============================================================================
// ATTENDING AI - Post-Discharge Concierge Service
// apps/shared/services/patient-engagement/PostDischargeConciergeService.ts
//
// Comprehensive post-discharge support including:
// - Daily symptom check-ins
// - Medication reconciliation
// - Follow-up appointment scheduling
// - Transportation coordination
// - Automated escalation pathways
// =============================================================================

import { EventEmitter } from 'events';

// =============================================================================
// Types
// =============================================================================

export interface DischargeCase {
  id: string;
  patientId: string;
  patientName: string;
  admissionDate: Date;
  dischargeDate: Date;
  dischargeDisposition: DischargeDisposition;
  admittingDiagnosis: string;
  dischargeDiagnoses: string[];
  lengthOfStay: number;
  dischargeUnit: string;
  attendingPhysician: string;
  pcpNotified: boolean;
  riskLevel: 'high' | 'moderate' | 'low';
  readmissionRiskScore: number;
  dischargeSummary?: string;
  dischargeInstructions: DischargeInstruction[];
  medications: DischargeMedication[];
  followUpAppointments: FollowUpAppointment[];
  homeHealthOrders?: HomeHealthOrder[];
  dmeOrders?: DMEOrder[];
  transportationNeeds?: TransportationNeed[];
  checkIns: DailyCheckIn[];
  escalations: Escalation[];
  status: CaseStatus;
  programEndDate: Date;
  assignedCareManager?: string;
}

export type DischargeDisposition =
  | 'home'
  | 'home-with-home-health'
  | 'skilled-nursing'
  | 'rehab'
  | 'long-term-care'
  | 'hospice'
  | 'other';

export type CaseStatus =
  | 'active'
  | 'completed'
  | 'readmitted'
  | 'transferred'
  | 'deceased'
  | 'lost-to-follow-up';

export interface DischargeInstruction {
  category: 'activity' | 'diet' | 'wound-care' | 'medication' | 'symptoms' | 'follow-up' | 'other';
  instruction: string;
  priority: 'critical' | 'important' | 'routine';
  acknowledged: boolean;
  acknowledgedDate?: Date;
}

export interface DischargeMedication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  route: string;
  startDate: Date;
  endDate?: Date;
  isNew: boolean;
  isChanged: boolean;
  wasDiscontinued: boolean;
  previousDosage?: string;
  purpose: string;
  specialInstructions?: string;
  filledAtDischarge: boolean;
  pharmacyConfirmed: boolean;
  patientUnderstands: boolean;
  sideEffectsToWatch: string[];
}

export interface FollowUpAppointment {
  id: string;
  type: 'pcp' | 'specialist' | 'lab' | 'imaging' | 'procedure' | 'other';
  provider: string;
  specialty?: string;
  scheduledDate?: Date;
  dueWithin: number; // days
  status: 'scheduled' | 'pending' | 'completed' | 'missed' | 'cancelled';
  location?: string;
  phone?: string;
  instructions?: string;
  transportationArranged: boolean;
  remindersSent: number;
}

export interface HomeHealthOrder {
  id: string;
  service: 'nursing' | 'pt' | 'ot' | 'speech' | 'social-work' | 'aide';
  frequency: string;
  duration: string;
  agency?: string;
  startDate?: Date;
  status: 'ordered' | 'pending-approval' | 'approved' | 'started' | 'completed';
  notes?: string;
}

export interface DMEOrder {
  id: string;
  equipment: string;
  supplier?: string;
  deliveryDate?: Date;
  status: 'ordered' | 'approved' | 'delivered' | 'setup-complete';
  instructions?: string;
}

export interface TransportationNeed {
  appointmentId: string;
  appointmentDate: Date;
  pickupAddress: string;
  destinationAddress: string;
  wheelchairNeeded: boolean;
  stretcherNeeded: boolean;
  accompanimentNeeded: boolean;
  status: 'needed' | 'arranged' | 'confirmed' | 'completed';
  provider?: string;
  confirmationNumber?: string;
}

export interface DailyCheckIn {
  id: string;
  date: Date;
  dayPostDischarge: number;
  completed: boolean;
  completedAt?: Date;
  method: 'automated-call' | 'sms' | 'app' | 'nurse-call' | 'in-person';
  responses: CheckInResponse[];
  overallStatus: 'stable' | 'improved' | 'concerning' | 'critical';
  escalationTriggered: boolean;
  escalationReason?: string;
  notes?: string;
}

export interface CheckInResponse {
  question: string;
  questionType: 'yes-no' | 'scale' | 'multiple-choice' | 'free-text';
  response: string | number | boolean;
  isRedFlag: boolean;
  redFlagThreshold?: string;
}

export interface Escalation {
  id: string;
  date: Date;
  trigger: EscalationTrigger;
  severity: 'routine' | 'urgent' | 'emergent';
  description: string;
  escalatedTo: string;
  response?: string;
  responseDate?: Date;
  outcome?: string;
  resolvedDate?: Date;
  status: 'open' | 'acknowledged' | 'in-progress' | 'resolved';
}

export type EscalationTrigger =
  | 'symptom-red-flag'
  | 'missed-check-in'
  | 'medication-issue'
  | 'missed-appointment'
  | 'patient-request'
  | 'caregiver-concern'
  | 'clinical-deterioration';

// =============================================================================
// Check-In Questions by Condition
// =============================================================================

interface CheckInProtocol {
  condition: string;
  questions: {
    question: string;
    type: CheckInResponse['questionType'];
    options?: string[];
    redFlagCondition?: (response: any) => boolean;
  }[];
}

const CHECK_IN_PROTOCOLS: CheckInProtocol[] = [
  {
    condition: 'heart-failure',
    questions: [
      {
        question: 'Have you weighed yourself today?',
        type: 'yes-no',
        redFlagCondition: (r) => r === false,
      },
      {
        question: 'What is your weight today (in pounds)?',
        type: 'free-text',
        redFlagCondition: (r) => false, // Compare to baseline
      },
      {
        question: 'On a scale of 0-10, how is your shortness of breath? (0=none, 10=severe)',
        type: 'scale',
        redFlagCondition: (r) => r >= 7,
      },
      {
        question: 'Have you noticed any new or worsening swelling in your legs or feet?',
        type: 'yes-no',
        redFlagCondition: (r) => r === true,
      },
      {
        question: 'Did you take all your medications as prescribed?',
        type: 'yes-no',
        redFlagCondition: (r) => r === false,
      },
      {
        question: 'How many pillows do you need to sleep comfortably?',
        type: 'scale',
        redFlagCondition: (r) => r >= 3,
      },
    ],
  },
  {
    condition: 'pneumonia',
    questions: [
      {
        question: 'What is your temperature today?',
        type: 'free-text',
        redFlagCondition: (r) => parseFloat(r) >= 101.0,
      },
      {
        question: 'On a scale of 0-10, how is your cough? (0=none, 10=severe)',
        type: 'scale',
        redFlagCondition: (r) => r >= 7,
      },
      {
        question: 'On a scale of 0-10, how is your shortness of breath?',
        type: 'scale',
        redFlagCondition: (r) => r >= 6,
      },
      {
        question: 'Have you completed your antibiotic course as prescribed?',
        type: 'yes-no',
        redFlagCondition: (r) => r === false,
      },
      {
        question: 'Are you able to eat and drink normally?',
        type: 'yes-no',
        redFlagCondition: (r) => r === false,
      },
    ],
  },
  {
    condition: 'surgery',
    questions: [
      {
        question: 'On a scale of 0-10, what is your pain level? (0=none, 10=worst)',
        type: 'scale',
        redFlagCondition: (r) => r >= 8,
      },
      {
        question: 'Have you noticed any redness, swelling, or drainage from your incision?',
        type: 'yes-no',
        redFlagCondition: (r) => r === true,
      },
      {
        question: 'Do you have a fever (temperature over 101°F)?',
        type: 'yes-no',
        redFlagCondition: (r) => r === true,
      },
      {
        question: 'Are you able to eat and keep food down?',
        type: 'yes-no',
        redFlagCondition: (r) => r === false,
      },
      {
        question: 'Have you had a bowel movement since discharge?',
        type: 'yes-no',
        redFlagCondition: (r) => false, // Depends on days post-op
      },
    ],
  },
  {
    condition: 'general',
    questions: [
      {
        question: 'Overall, how are you feeling today?',
        type: 'multiple-choice',
        options: ['Better', 'About the same', 'Worse'],
        redFlagCondition: (r) => r === 'Worse',
      },
      {
        question: 'Have you taken all your medications as prescribed?',
        type: 'yes-no',
        redFlagCondition: (r) => r === false,
      },
      {
        question: 'Do you have any new or worsening symptoms?',
        type: 'yes-no',
        redFlagCondition: (r) => r === true,
      },
      {
        question: 'Do you have any questions or concerns?',
        type: 'yes-no',
      },
      {
        question: 'Do you have a way to get to your follow-up appointments?',
        type: 'yes-no',
        redFlagCondition: (r) => r === false,
      },
    ],
  },
];

// =============================================================================
// Post-Discharge Concierge Service Class
// =============================================================================

export class PostDischargeConciergeService extends EventEmitter {
  private cases: Map<string, DischargeCase> = new Map();
  private patientCases: Map<string, string[]> = new Map(); // patientId -> caseIds

  constructor() {
    super();
  }

  // ===========================================================================
  // Case Management
  // ===========================================================================

  createDischargeCase(
    caseData: Omit<DischargeCase, 'id' | 'checkIns' | 'escalations' | 'status' | 'programEndDate'>
  ): DischargeCase {
    const id = `dc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Calculate program end date (typically 30 days post-discharge)
    const programEndDate = new Date(caseData.dischargeDate);
    programEndDate.setDate(programEndDate.getDate() + 30);
    
    const fullCase: DischargeCase = {
      ...caseData,
      id,
      checkIns: [],
      escalations: [],
      status: 'active',
      programEndDate,
    };
    
    this.cases.set(id, fullCase);
    
    // Track by patient
    const patientCases = this.patientCases.get(caseData.patientId) || [];
    patientCases.push(id);
    this.patientCases.set(caseData.patientId, patientCases);
    
    // Generate initial check-in schedule
    this.generateCheckInSchedule(fullCase);
    
    this.emit('caseCreated', fullCase);
    
    // High-risk cases get immediate attention
    if (fullCase.riskLevel === 'high') {
      this.emit('highRiskCase', fullCase);
    }
    
    return fullCase;
  }

  getCase(caseId: string): DischargeCase | undefined {
    return this.cases.get(caseId);
  }

  getPatientCases(patientId: string): DischargeCase[] {
    const caseIds = this.patientCases.get(patientId) || [];
    return caseIds.map(id => this.cases.get(id)).filter(Boolean) as DischargeCase[];
  }

  getActiveCases(): DischargeCase[] {
    return Array.from(this.cases.values()).filter(c => c.status === 'active');
  }

  // ===========================================================================
  // Check-In Management
  // ===========================================================================

  private generateCheckInSchedule(dischargeCase: DischargeCase): void {
    const checkInDays = this.getCheckInSchedule(dischargeCase.riskLevel);
    
    for (const day of checkInDays) {
      const checkInDate = new Date(dischargeCase.dischargeDate);
      checkInDate.setDate(checkInDate.getDate() + day);
      
      const checkIn: DailyCheckIn = {
        id: `checkin_${dischargeCase.id}_day${day}`,
        date: checkInDate,
        dayPostDischarge: day,
        completed: false,
        method: day <= 3 ? 'nurse-call' : 'automated-call',
        responses: [],
        overallStatus: 'stable',
        escalationTriggered: false,
      };
      
      dischargeCase.checkIns.push(checkIn);
    }
  }

  private getCheckInSchedule(riskLevel: DischargeCase['riskLevel']): number[] {
    switch (riskLevel) {
      case 'high':
        // Daily for first week, then every other day
        return [1, 2, 3, 4, 5, 6, 7, 9, 11, 13, 15, 18, 21, 25, 30];
      case 'moderate':
        // Every other day first week, then twice weekly
        return [1, 2, 4, 6, 8, 11, 14, 18, 22, 26, 30];
      case 'low':
        // Twice first week, then weekly
        return [1, 3, 7, 14, 21, 30];
      default:
        return [1, 3, 7, 14, 30];
    }
  }

  recordCheckIn(
    caseId: string,
    checkInId: string,
    responses: CheckInResponse[],
    method: DailyCheckIn['method']
  ): { checkIn: DailyCheckIn; escalation?: Escalation } {
    const dischargeCase = this.cases.get(caseId);
    if (!dischargeCase) throw new Error('Case not found');
    
    const checkIn = dischargeCase.checkIns.find(c => c.id === checkInId);
    if (!checkIn) throw new Error('Check-in not found');
    
    checkIn.completed = true;
    checkIn.completedAt = new Date();
    checkIn.method = method;
    checkIn.responses = responses;
    
    // Analyze responses for red flags
    const redFlags = responses.filter(r => r.isRedFlag);
    
    if (redFlags.length > 0) {
      checkIn.overallStatus = redFlags.length >= 2 ? 'critical' : 'concerning';
      checkIn.escalationTriggered = true;
      checkIn.escalationReason = redFlags.map(r => r.question).join('; ');
      
      // Create escalation
      const escalation = this.createEscalation(
        dischargeCase,
        'symptom-red-flag',
        redFlags.length >= 2 ? 'urgent' : 'routine',
        `Red flags identified: ${checkIn.escalationReason}`
      );
      
      this.emit('checkInCompleted', { checkIn, escalation });
      return { checkIn, escalation };
    }
    
    // Determine overall status
    const worseResponse = responses.find(
      r => r.response === 'Worse' || (typeof r.response === 'number' && r.response >= 7)
    );
    
    if (worseResponse) {
      checkIn.overallStatus = 'concerning';
    } else {
      checkIn.overallStatus = 'stable';
    }
    
    this.emit('checkInCompleted', { checkIn });
    return { checkIn };
  }

  getCheckInQuestions(caseId: string): CheckInProtocol {
    const dischargeCase = this.cases.get(caseId);
    if (!dischargeCase) {
      return CHECK_IN_PROTOCOLS.find(p => p.condition === 'general')!;
    }
    
    // Find matching protocol based on diagnosis
    const diagnosis = dischargeCase.dischargeDiagnoses[0]?.toLowerCase() || '';
    
    if (diagnosis.includes('heart failure') || diagnosis.includes('chf')) {
      return CHECK_IN_PROTOCOLS.find(p => p.condition === 'heart-failure')!;
    }
    
    if (diagnosis.includes('pneumonia')) {
      return CHECK_IN_PROTOCOLS.find(p => p.condition === 'pneumonia')!;
    }
    
    if (diagnosis.includes('surgery') || diagnosis.includes('procedure') || 
        diagnosis.includes('replacement') || diagnosis.includes('repair')) {
      return CHECK_IN_PROTOCOLS.find(p => p.condition === 'surgery')!;
    }
    
    return CHECK_IN_PROTOCOLS.find(p => p.condition === 'general')!;
  }

  // ===========================================================================
  // Medication Reconciliation
  // ===========================================================================

  reconcileMedications(
    caseId: string,
    medicationUpdates: {
      medicationId: string;
      filledAtDischarge?: boolean;
      pharmacyConfirmed?: boolean;
      patientUnderstands?: boolean;
      issue?: string;
    }[]
  ): { success: boolean; issues: string[] } {
    const dischargeCase = this.cases.get(caseId);
    if (!dischargeCase) throw new Error('Case not found');
    
    const issues: string[] = [];
    
    for (const update of medicationUpdates) {
      const medication = dischargeCase.medications.find(m => m.id === update.medicationId);
      if (!medication) continue;
      
      if (update.filledAtDischarge !== undefined) {
        medication.filledAtDischarge = update.filledAtDischarge;
        if (!update.filledAtDischarge) {
          issues.push(`${medication.name} not filled at discharge`);
        }
      }
      
      if (update.pharmacyConfirmed !== undefined) {
        medication.pharmacyConfirmed = update.pharmacyConfirmed;
      }
      
      if (update.patientUnderstands !== undefined) {
        medication.patientUnderstands = update.patientUnderstands;
        if (!update.patientUnderstands) {
          issues.push(`Patient needs education on ${medication.name}`);
        }
      }
      
      if (update.issue) {
        issues.push(`${medication.name}: ${update.issue}`);
      }
    }
    
    // If there are critical issues, escalate
    if (issues.length > 0) {
      this.createEscalation(
        dischargeCase,
        'medication-issue',
        'routine',
        `Medication reconciliation issues: ${issues.join('; ')}`
      );
    }
    
    this.emit('medicationsReconciled', { caseId, issues });
    
    return {
      success: issues.length === 0,
      issues,
    };
  }

  getMedicationReconciliationStatus(caseId: string): {
    total: number;
    filled: number;
    confirmed: number;
    understood: number;
    newMedications: DischargeMedication[];
    changedMedications: DischargeMedication[];
    discontinuedMedications: DischargeMedication[];
  } {
    const dischargeCase = this.cases.get(caseId);
    if (!dischargeCase) throw new Error('Case not found');
    
    const meds = dischargeCase.medications;
    
    return {
      total: meds.length,
      filled: meds.filter(m => m.filledAtDischarge).length,
      confirmed: meds.filter(m => m.pharmacyConfirmed).length,
      understood: meds.filter(m => m.patientUnderstands).length,
      newMedications: meds.filter(m => m.isNew),
      changedMedications: meds.filter(m => m.isChanged),
      discontinuedMedications: meds.filter(m => m.wasDiscontinued),
    };
  }

  // ===========================================================================
  // Follow-Up Appointment Management
  // ===========================================================================

  scheduleFollowUpAppointment(
    caseId: string,
    appointmentId: string,
    scheduledDate: Date,
    location: string,
    phone: string
  ): FollowUpAppointment {
    const dischargeCase = this.cases.get(caseId);
    if (!dischargeCase) throw new Error('Case not found');
    
    const appointment = dischargeCase.followUpAppointments.find(a => a.id === appointmentId);
    if (!appointment) throw new Error('Appointment not found');
    
    appointment.scheduledDate = scheduledDate;
    appointment.location = location;
    appointment.phone = phone;
    appointment.status = 'scheduled';
    
    this.emit('appointmentScheduled', { caseId, appointment });
    
    return appointment;
  }

  getFollowUpStatus(caseId: string): {
    total: number;
    scheduled: number;
    pending: number;
    completed: number;
    missed: number;
    overdue: FollowUpAppointment[];
    upcoming: FollowUpAppointment[];
  } {
    const dischargeCase = this.cases.get(caseId);
    if (!dischargeCase) throw new Error('Case not found');
    
    const appointments = dischargeCase.followUpAppointments;
    const today = new Date();
    
    const overdue = appointments.filter(a => {
      if (a.status !== 'pending') return false;
      const dueDate = new Date(dischargeCase.dischargeDate);
      dueDate.setDate(dueDate.getDate() + a.dueWithin);
      return dueDate < today;
    });
    
    const upcoming = appointments.filter(a => 
      a.status === 'scheduled' && a.scheduledDate && a.scheduledDate > today
    ).sort((a, b) => a.scheduledDate!.getTime() - b.scheduledDate!.getTime());
    
    return {
      total: appointments.length,
      scheduled: appointments.filter(a => a.status === 'scheduled').length,
      pending: appointments.filter(a => a.status === 'pending').length,
      completed: appointments.filter(a => a.status === 'completed').length,
      missed: appointments.filter(a => a.status === 'missed').length,
      overdue,
      upcoming,
    };
  }

  // ===========================================================================
  // Transportation Coordination
  // ===========================================================================

  requestTransportation(
    caseId: string,
    appointmentId: string,
    request: Omit<TransportationNeed, 'appointmentId' | 'status'>
  ): TransportationNeed {
    const dischargeCase = this.cases.get(caseId);
    if (!dischargeCase) throw new Error('Case not found');
    
    const transportationNeed: TransportationNeed = {
      ...request,
      appointmentId,
      status: 'needed',
    };
    
    if (!dischargeCase.transportationNeeds) {
      dischargeCase.transportationNeeds = [];
    }
    
    dischargeCase.transportationNeeds.push(transportationNeed);
    
    // Update appointment
    const appointment = dischargeCase.followUpAppointments.find(a => a.id === appointmentId);
    if (appointment) {
      appointment.transportationArranged = false;
    }
    
    this.emit('transportationRequested', { caseId, transportationNeed });
    
    return transportationNeed;
  }

  confirmTransportation(
    caseId: string,
    appointmentId: string,
    provider: string,
    confirmationNumber: string
  ): void {
    const dischargeCase = this.cases.get(caseId);
    if (!dischargeCase || !dischargeCase.transportationNeeds) {
      throw new Error('Case or transportation needs not found');
    }
    
    const transportationNeed = dischargeCase.transportationNeeds.find(
      t => t.appointmentId === appointmentId
    );
    
    if (transportationNeed) {
      transportationNeed.status = 'confirmed';
      transportationNeed.provider = provider;
      transportationNeed.confirmationNumber = confirmationNumber;
      
      const appointment = dischargeCase.followUpAppointments.find(a => a.id === appointmentId);
      if (appointment) {
        appointment.transportationArranged = true;
      }
    }
    
    this.emit('transportationConfirmed', { caseId, appointmentId });
  }

  // ===========================================================================
  // Escalation Management
  // ===========================================================================

  private createEscalation(
    dischargeCase: DischargeCase,
    trigger: EscalationTrigger,
    severity: Escalation['severity'],
    description: string
  ): Escalation {
    const escalation: Escalation = {
      id: `esc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      date: new Date(),
      trigger,
      severity,
      description,
      escalatedTo: this.determineEscalationTarget(severity, dischargeCase),
      status: 'open',
    };
    
    dischargeCase.escalations.push(escalation);
    
    this.emit('escalationCreated', { case: dischargeCase, escalation });
    
    if (severity === 'emergent') {
      this.emit('emergentEscalation', { case: dischargeCase, escalation });
    }
    
    return escalation;
  }

  private determineEscalationTarget(
    severity: Escalation['severity'],
    dischargeCase: DischargeCase
  ): string {
    switch (severity) {
      case 'emergent':
        return dischargeCase.attendingPhysician;
      case 'urgent':
        return dischargeCase.assignedCareManager || 'Care Management Team';
      case 'routine':
      default:
        return 'Transition Care Team';
    }
  }

  resolveEscalation(
    caseId: string,
    escalationId: string,
    response: string,
    outcome: string
  ): void {
    const dischargeCase = this.cases.get(caseId);
    if (!dischargeCase) throw new Error('Case not found');
    
    const escalation = dischargeCase.escalations.find(e => e.id === escalationId);
    if (!escalation) throw new Error('Escalation not found');
    
    escalation.response = response;
    escalation.responseDate = new Date();
    escalation.outcome = outcome;
    escalation.resolvedDate = new Date();
    escalation.status = 'resolved';
    
    this.emit('escalationResolved', { caseId, escalation });
  }

  getOpenEscalations(caseId?: string): Escalation[] {
    if (caseId) {
      const dischargeCase = this.cases.get(caseId);
      if (!dischargeCase) return [];
      return dischargeCase.escalations.filter(e => e.status !== 'resolved');
    }
    
    const allOpen: Escalation[] = [];
    for (const dischargeCase of this.cases.values()) {
      allOpen.push(...dischargeCase.escalations.filter(e => e.status !== 'resolved'));
    }
    
    return allOpen.sort((a, b) => {
      const severityOrder = { emergent: 0, urgent: 1, routine: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  // ===========================================================================
  // Case Summary & Analytics
  // ===========================================================================

  getCaseSummary(caseId: string): {
    case: DischargeCase;
    daysSinceDischarge: number;
    checkInCompliance: number;
    medicationReconciliation: ReturnType<typeof this.getMedicationReconciliationStatus>;
    followUpStatus: ReturnType<typeof this.getFollowUpStatus>;
    openEscalations: number;
    riskIndicators: string[];
    nextActions: string[];
  } | null {
    const dischargeCase = this.cases.get(caseId);
    if (!dischargeCase) return null;
    
    const today = new Date();
    const daysSinceDischarge = Math.floor(
      (today.getTime() - dischargeCase.dischargeDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    const completedCheckIns = dischargeCase.checkIns.filter(c => c.completed);
    const dueCheckIns = dischargeCase.checkIns.filter(c => c.date <= today);
    const checkInCompliance = dueCheckIns.length > 0
      ? (completedCheckIns.length / dueCheckIns.length) * 100
      : 100;
    
    const medStatus = this.getMedicationReconciliationStatus(caseId);
    const followUpStatus = this.getFollowUpStatus(caseId);
    const openEscalations = dischargeCase.escalations.filter(e => e.status !== 'resolved').length;
    
    // Identify risk indicators
    const riskIndicators: string[] = [];
    
    if (checkInCompliance < 70) {
      riskIndicators.push('Low check-in compliance');
    }
    
    if (medStatus.filled < medStatus.total) {
      riskIndicators.push('Medications not all filled');
    }
    
    if (followUpStatus.overdue.length > 0) {
      riskIndicators.push('Overdue follow-up appointments');
    }
    
    const concerningCheckIns = completedCheckIns.filter(
      c => c.overallStatus === 'concerning' || c.overallStatus === 'critical'
    );
    if (concerningCheckIns.length > 0) {
      riskIndicators.push('Recent concerning symptoms reported');
    }
    
    // Generate next actions
    const nextActions: string[] = [];
    
    if (followUpStatus.pending > 0) {
      nextActions.push(`Schedule ${followUpStatus.pending} pending follow-up appointments`);
    }
    
    if (medStatus.filled < medStatus.total) {
      nextActions.push('Complete medication reconciliation');
    }
    
    const nextCheckIn = dischargeCase.checkIns.find(c => !c.completed && c.date >= today);
    if (nextCheckIn) {
      nextActions.push(`Next check-in due: ${nextCheckIn.date.toLocaleDateString()}`);
    }
    
    if (openEscalations > 0) {
      nextActions.push(`Resolve ${openEscalations} open escalations`);
    }
    
    return {
      case: dischargeCase,
      daysSinceDischarge,
      checkInCompliance,
      medicationReconciliation: medStatus,
      followUpStatus,
      openEscalations,
      riskIndicators,
      nextActions,
    };
  }

  getDashboardMetrics(): {
    activeCases: number;
    highRiskCases: number;
    checkInsDueToday: number;
    openEscalations: number;
    readmissionsLast30Days: number;
    avgCheckInCompliance: number;
    casesNeedingAttention: DischargeCase[];
  } {
    const cases = Array.from(this.cases.values());
    const activeCases = cases.filter(c => c.status === 'active');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    let totalCompliance = 0;
    let complianceCount = 0;
    
    for (const c of activeCases) {
      const completed = c.checkIns.filter(ci => ci.completed).length;
      const due = c.checkIns.filter(ci => ci.date <= new Date()).length;
      if (due > 0) {
        totalCompliance += (completed / due) * 100;
        complianceCount++;
      }
    }
    
    const checkInsDueToday = activeCases.reduce((sum, c) => {
      return sum + c.checkIns.filter(ci => 
        ci.date >= today && ci.date < tomorrow && !ci.completed
      ).length;
    }, 0);
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const readmissions = cases.filter(
      c => c.status === 'readmitted' && c.dischargeDate >= thirtyDaysAgo
    ).length;
    
    const casesNeedingAttention = activeCases.filter(c => {
      const openEsc = c.escalations.filter(e => e.status !== 'resolved').length;
      const missedCheckIns = c.checkIns.filter(ci => ci.date < today && !ci.completed).length;
      return openEsc > 0 || missedCheckIns > 2;
    });
    
    return {
      activeCases: activeCases.length,
      highRiskCases: activeCases.filter(c => c.riskLevel === 'high').length,
      checkInsDueToday,
      openEscalations: this.getOpenEscalations().length,
      readmissionsLast30Days: readmissions,
      avgCheckInCompliance: complianceCount > 0 ? Math.round(totalCompliance / complianceCount) : 100,
      casesNeedingAttention,
    };
  }
}

// Singleton instance
export const postDischargeConciergeService = new PostDischargeConciergeService();
export default postDischargeConciergeService;
