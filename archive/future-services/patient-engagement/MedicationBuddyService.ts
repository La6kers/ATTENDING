// =============================================================================
// ATTENDING AI - Medication Buddy Service
// apps/shared/services/patient-engagement/MedicationBuddyService.ts
//
// Patient medication management assistant including:
// - Photo pill identification
// - Smart reminders based on routine
// - Side effect tracking with AI analysis
// - Drug interaction checker
// - Refill prediction and reminders
// =============================================================================

import { EventEmitter } from 'events';

// =============================================================================
// Types
// =============================================================================

export interface Medication {
  id: string;
  patientId: string;
  name: string;
  genericName?: string;
  brandName?: string;
  dosage: string;
  form: 'tablet' | 'capsule' | 'liquid' | 'injection' | 'inhaler' | 'patch' | 'cream' | 'drops' | 'other';
  color?: string;
  shape?: string;
  imprint?: string;
  schedule: MedicationSchedule[];
  purpose: string;
  prescribedBy?: string;
  prescribedDate?: Date;
  startDate: Date;
  endDate?: Date;
  refillsRemaining?: number;
  pillCount?: number;
  daysSupply?: number;
  pharmacy?: Pharmacy;
  interactions: DrugInteraction[];
  sideEffects: SideEffectProfile;
  specialInstructions?: string[];
  isActive: boolean;
}

export interface MedicationSchedule {
  time: string; // HH:MM format
  daysOfWeek?: number[]; // 0-6, undefined = every day
  withFood: boolean;
  beforeBed?: boolean;
  asNeeded?: boolean;
  maxDailyDoses?: number;
}

export interface Pharmacy {
  name: string;
  phone: string;
  address?: string;
  autoRefill?: boolean;
}

export interface DrugInteraction {
  interactingDrug: string;
  severity: 'minor' | 'moderate' | 'major' | 'contraindicated';
  description: string;
  recommendation: string;
  source?: string;
}

export interface SideEffectProfile {
  common: string[];
  uncommon: string[];
  rare: string[];
  reportImmediately: string[];
}

export interface SideEffectReport {
  id: string;
  medicationId: string;
  patientId: string;
  reportedAt: Date;
  symptom: string;
  severity: 'mild' | 'moderate' | 'severe';
  frequency: 'once' | 'occasional' | 'frequent' | 'constant';
  duration?: string;
  interferesWithLife: boolean;
  stoppedMedication: boolean;
  notes?: string;
  aiAnalysis?: SideEffectAnalysis;
}

export interface SideEffectAnalysis {
  likelyRelated: boolean;
  confidence: number;
  knownSideEffect: boolean;
  recommendAction: 'continue-monitor' | 'contact-provider' | 'seek-immediate-care' | 'stop-medication';
  reasoning: string;
  similarReports?: number;
}

export interface MedicationReminder {
  id: string;
  medicationId: string;
  patientId: string;
  scheduledTime: Date;
  status: 'pending' | 'sent' | 'acknowledged' | 'taken' | 'skipped' | 'snoozed';
  acknowledgedAt?: Date;
  takenAt?: Date;
  snoozeUntil?: Date;
  notes?: string;
}

export interface AdherenceRecord {
  patientId: string;
  medicationId: string;
  date: Date;
  scheduled: number;
  taken: number;
  skipped: number;
  late: number;
  adherenceRate: number;
}

export interface RefillPrediction {
  medicationId: string;
  currentPillCount: number;
  dailyUsage: number;
  estimatedRunOutDate: Date;
  daysRemaining: number;
  refillsRemaining: number;
  shouldOrderNow: boolean;
  autoRefillEnabled: boolean;
  pharmacy?: Pharmacy;
}

export interface PillIdentification {
  query: {
    color?: string;
    shape?: string;
    imprint?: string;
    imageData?: string; // base64
  };
  results: PillMatch[];
}

export interface PillMatch {
  name: string;
  genericName: string;
  manufacturer: string;
  strength: string;
  ndcCode?: string;
  confidence: number;
  imageUrl?: string;
  description: string;
  warnings?: string[];
}

// =============================================================================
// Drug Interaction Database (Simplified)
// =============================================================================

const DRUG_INTERACTIONS: { drug1: string; drug2: string; interaction: DrugInteraction }[] = [
  {
    drug1: 'warfarin',
    drug2: 'aspirin',
    interaction: {
      interactingDrug: 'aspirin',
      severity: 'major',
      description: 'Increased risk of bleeding when used together',
      recommendation: 'Monitor closely for signs of bleeding. INR monitoring recommended.',
      source: 'FDA',
    },
  },
  {
    drug1: 'metformin',
    drug2: 'contrast dye',
    interaction: {
      interactingDrug: 'contrast dye',
      severity: 'major',
      description: 'Risk of lactic acidosis with iodinated contrast',
      recommendation: 'Hold metformin 48 hours before and after contrast procedures',
      source: 'FDA',
    },
  },
  {
    drug1: 'lisinopril',
    drug2: 'potassium',
    interaction: {
      interactingDrug: 'potassium supplements',
      severity: 'moderate',
      description: 'ACE inhibitors can increase potassium levels',
      recommendation: 'Monitor potassium levels. Avoid potassium supplements unless prescribed.',
      source: 'Clinical',
    },
  },
  {
    drug1: 'simvastatin',
    drug2: 'grapefruit',
    interaction: {
      interactingDrug: 'grapefruit juice',
      severity: 'moderate',
      description: 'Grapefruit can increase statin levels and risk of side effects',
      recommendation: 'Avoid grapefruit and grapefruit juice',
      source: 'FDA',
    },
  },
  {
    drug1: 'ssri',
    drug2: 'nsaid',
    interaction: {
      interactingDrug: 'NSAIDs',
      severity: 'moderate',
      description: 'Increased risk of bleeding, especially GI bleeding',
      recommendation: 'Use with caution. Consider gastroprotection.',
      source: 'Clinical',
    },
  },
  {
    drug1: 'levothyroxine',
    drug2: 'calcium',
    interaction: {
      interactingDrug: 'calcium supplements',
      severity: 'moderate',
      description: 'Calcium can reduce absorption of levothyroxine',
      recommendation: 'Take levothyroxine 4 hours before or after calcium',
      source: 'Clinical',
    },
  },
  {
    drug1: 'methotrexate',
    drug2: 'nsaid',
    interaction: {
      interactingDrug: 'NSAIDs',
      severity: 'major',
      description: 'NSAIDs can increase methotrexate toxicity',
      recommendation: 'Avoid concurrent use. Monitor closely if necessary.',
      source: 'FDA',
    },
  },
  {
    drug1: 'digoxin',
    drug2: 'amiodarone',
    interaction: {
      interactingDrug: 'amiodarone',
      severity: 'major',
      description: 'Amiodarone increases digoxin levels significantly',
      recommendation: 'Reduce digoxin dose by 50% when starting amiodarone',
      source: 'FDA',
    },
  },
];

// =============================================================================
// Pill Database (Simplified)
// =============================================================================

const PILL_DATABASE: PillMatch[] = [
  {
    name: 'Lisinopril',
    genericName: 'lisinopril',
    manufacturer: 'Various',
    strength: '10 mg',
    confidence: 0,
    description: 'White, round tablet for high blood pressure',
  },
  {
    name: 'Metformin',
    genericName: 'metformin',
    manufacturer: 'Various',
    strength: '500 mg',
    confidence: 0,
    description: 'White, oval tablet for diabetes',
  },
  {
    name: 'Atorvastatin (Lipitor)',
    genericName: 'atorvastatin',
    manufacturer: 'Pfizer',
    strength: '20 mg',
    confidence: 0,
    description: 'White, oval tablet for cholesterol',
  },
  {
    name: 'Omeprazole (Prilosec)',
    genericName: 'omeprazole',
    manufacturer: 'Various',
    strength: '20 mg',
    confidence: 0,
    description: 'Purple/pink capsule for acid reflux',
  },
  {
    name: 'Amlodipine (Norvasc)',
    genericName: 'amlodipine',
    manufacturer: 'Pfizer',
    strength: '5 mg',
    confidence: 0,
    description: 'White, round tablet for blood pressure',
  },
];

// =============================================================================
// Medication Buddy Service Class
// =============================================================================

export class MedicationBuddyService extends EventEmitter {
  private medications: Map<string, Medication[]> = new Map(); // patientId -> medications
  private reminders: Map<string, MedicationReminder[]> = new Map();
  private sideEffects: Map<string, SideEffectReport[]> = new Map();
  private adherenceHistory: Map<string, AdherenceRecord[]> = new Map();

  constructor() {
    super();
  }

  // ===========================================================================
  // Medication Management
  // ===========================================================================

  addMedication(medication: Omit<Medication, 'id' | 'interactions'>): Medication {
    const id = `med_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Check for interactions
    const patientMeds = this.medications.get(medication.patientId) || [];
    const interactions = this.checkInteractions(medication.name, patientMeds);
    
    const fullMedication: Medication = {
      ...medication,
      id,
      interactions,
    };
    
    patientMeds.push(fullMedication);
    this.medications.set(medication.patientId, patientMeds);
    
    // Generate reminders
    this.generateReminders(fullMedication);
    
    this.emit('medicationAdded', fullMedication);
    
    if (interactions.some(i => i.severity === 'major' || i.severity === 'contraindicated')) {
      this.emit('interactionAlert', { medication: fullMedication, interactions });
    }
    
    return fullMedication;
  }

  getMedications(patientId: string): Medication[] {
    return (this.medications.get(patientId) || []).filter(m => m.isActive);
  }

  // ===========================================================================
  // Drug Interaction Checking
  // ===========================================================================

  checkInteractions(newDrug: string, currentMedications: Medication[]): DrugInteraction[] {
    const interactions: DrugInteraction[] = [];
    const newDrugLower = newDrug.toLowerCase();
    
    for (const currentMed of currentMedications) {
      if (!currentMed.isActive) continue;
      
      const currentDrugLower = currentMed.name.toLowerCase();
      
      for (const known of DRUG_INTERACTIONS) {
        const drug1Lower = known.drug1.toLowerCase();
        const drug2Lower = known.drug2.toLowerCase();
        
        // Check both directions
        if ((newDrugLower.includes(drug1Lower) && currentDrugLower.includes(drug2Lower)) ||
            (newDrugLower.includes(drug2Lower) && currentDrugLower.includes(drug1Lower))) {
          interactions.push({
            ...known.interaction,
            interactingDrug: currentMed.name,
          });
        }
      }
    }
    
    return interactions;
  }

  checkInteractionsWithFood(medication: Medication, food: string): DrugInteraction | null {
    const medLower = medication.name.toLowerCase();
    const foodLower = food.toLowerCase();
    
    // Check grapefruit interaction with statins
    if (foodLower.includes('grapefruit') && 
        (medLower.includes('statin') || medLower.includes('simvastatin') || 
         medLower.includes('atorvastatin') || medLower.includes('lovastatin'))) {
      return {
        interactingDrug: 'grapefruit',
        severity: 'moderate',
        description: 'Grapefruit can increase statin levels in your blood',
        recommendation: 'Avoid grapefruit and grapefruit juice while taking this medication',
      };
    }
    
    // Check calcium/dairy with levothyroxine
    if ((foodLower.includes('calcium') || foodLower.includes('dairy') || foodLower.includes('milk')) &&
        medLower.includes('levothyroxine')) {
      return {
        interactingDrug: 'calcium-containing foods',
        severity: 'moderate',
        description: 'Calcium can reduce absorption of thyroid medication',
        recommendation: 'Take levothyroxine 4 hours before or after dairy products',
      };
    }
    
    return null;
  }

  // ===========================================================================
  // Pill Identification
  // ===========================================================================

  identifyPill(query: PillIdentification['query']): PillIdentification {
    const results: PillMatch[] = [];
    
    for (const pill of PILL_DATABASE) {
      let score = 0;
      
      // Color matching
      if (query.color && pill.description.toLowerCase().includes(query.color.toLowerCase())) {
        score += 30;
      }
      
      // Shape matching
      if (query.shape && pill.description.toLowerCase().includes(query.shape.toLowerCase())) {
        score += 30;
      }
      
      // Imprint matching
      if (query.imprint) {
        // Would do more sophisticated matching in production
        score += 40;
      }
      
      if (score > 0) {
        results.push({
          ...pill,
          confidence: Math.min(score / 100, 0.95),
        });
      }
    }
    
    // Sort by confidence
    results.sort((a, b) => b.confidence - a.confidence);
    
    return {
      query,
      results: results.slice(0, 5),
    };
  }

  // ===========================================================================
  // Reminder Management
  // ===========================================================================

  private generateReminders(medication: Medication): void {
    const reminders: MedicationReminder[] = [];
    const today = new Date();
    
    // Generate reminders for next 7 days
    for (let day = 0; day < 7; day++) {
      const date = new Date(today);
      date.setDate(date.getDate() + day);
      
      for (const schedule of medication.schedule) {
        // Check if this day is scheduled
        if (schedule.daysOfWeek && !schedule.daysOfWeek.includes(date.getDay())) {
          continue;
        }
        
        const [hours, minutes] = schedule.time.split(':').map(Number);
        const reminderTime = new Date(date);
        reminderTime.setHours(hours, minutes, 0, 0);
        
        if (reminderTime > today) {
          reminders.push({
            id: `rem_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            medicationId: medication.id,
            patientId: medication.patientId,
            scheduledTime: reminderTime,
            status: 'pending',
          });
        }
      }
    }
    
    const existingReminders = this.reminders.get(medication.patientId) || [];
    existingReminders.push(...reminders);
    this.reminders.set(medication.patientId, existingReminders);
  }

  getUpcomingReminders(patientId: string, hoursAhead: number = 24): MedicationReminder[] {
    const reminders = this.reminders.get(patientId) || [];
    const now = new Date();
    const cutoff = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);
    
    return reminders
      .filter(r => r.status === 'pending' && r.scheduledTime >= now && r.scheduledTime <= cutoff)
      .sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());
  }

  recordMedicationTaken(reminderId: string, takenAt?: Date): void {
    for (const [patientId, reminders] of this.reminders) {
      const reminder = reminders.find(r => r.id === reminderId);
      if (reminder) {
        reminder.status = 'taken';
        reminder.takenAt = takenAt || new Date();
        this.emit('medicationTaken', reminder);
        this.updateAdherence(patientId, reminder.medicationId);
        break;
      }
    }
  }

  recordMedicationSkipped(reminderId: string, reason?: string): void {
    for (const [patientId, reminders] of this.reminders) {
      const reminder = reminders.find(r => r.id === reminderId);
      if (reminder) {
        reminder.status = 'skipped';
        reminder.notes = reason;
        this.emit('medicationSkipped', reminder);
        this.updateAdherence(patientId, reminder.medicationId);
        break;
      }
    }
  }

  snoozeReminder(reminderId: string, minutes: number): void {
    for (const reminders of this.reminders.values()) {
      const reminder = reminders.find(r => r.id === reminderId);
      if (reminder) {
        reminder.status = 'snoozed';
        reminder.snoozeUntil = new Date(Date.now() + minutes * 60 * 1000);
        this.emit('reminderSnoozed', reminder);
        break;
      }
    }
  }

  // ===========================================================================
  // Adherence Tracking
  // ===========================================================================

  private updateAdherence(patientId: string, medicationId: string): void {
    const reminders = this.reminders.get(patientId) || [];
    const today = new Date().toDateString();
    
    const todayReminders = reminders.filter(
      r => r.medicationId === medicationId && r.scheduledTime.toDateString() === today
    );
    
    const scheduled = todayReminders.length;
    const taken = todayReminders.filter(r => r.status === 'taken').length;
    const skipped = todayReminders.filter(r => r.status === 'skipped').length;
    const late = todayReminders.filter(r => {
      if (r.status !== 'taken' || !r.takenAt) return false;
      const diff = r.takenAt.getTime() - r.scheduledTime.getTime();
      return diff > 30 * 60 * 1000; // More than 30 minutes late
    }).length;
    
    const record: AdherenceRecord = {
      patientId,
      medicationId,
      date: new Date(),
      scheduled,
      taken,
      skipped,
      late,
      adherenceRate: scheduled > 0 ? (taken / scheduled) * 100 : 0,
    };
    
    const history = this.adherenceHistory.get(patientId) || [];
    history.push(record);
    this.adherenceHistory.set(patientId, history);
  }

  getAdherenceRate(patientId: string, medicationId: string, days: number = 30): number {
    const history = this.adherenceHistory.get(patientId) || [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    
    const relevantRecords = history.filter(
      r => r.medicationId === medicationId && r.date >= cutoff
    );
    
    if (relevantRecords.length === 0) return 0;
    
    const totalScheduled = relevantRecords.reduce((sum, r) => sum + r.scheduled, 0);
    const totalTaken = relevantRecords.reduce((sum, r) => sum + r.taken, 0);
    
    return totalScheduled > 0 ? (totalTaken / totalScheduled) * 100 : 0;
  }

  // ===========================================================================
  // Side Effect Tracking
  // ===========================================================================

  reportSideEffect(report: Omit<SideEffectReport, 'id' | 'aiAnalysis'>): SideEffectReport {
    const id = `se_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // AI analysis
    const aiAnalysis = this.analyzeSideEffect(report);
    
    const fullReport: SideEffectReport = {
      ...report,
      id,
      aiAnalysis,
    };
    
    const reports = this.sideEffects.get(report.patientId) || [];
    reports.push(fullReport);
    this.sideEffects.set(report.patientId, reports);
    
    this.emit('sideEffectReported', fullReport);
    
    if (aiAnalysis.recommendAction === 'seek-immediate-care') {
      this.emit('urgentSideEffect', fullReport);
    }
    
    return fullReport;
  }

  private analyzeSideEffect(report: Omit<SideEffectReport, 'id' | 'aiAnalysis'>): SideEffectAnalysis {
    // Get medication
    const patientMeds = this.medications.get(report.patientId) || [];
    const medication = patientMeds.find(m => m.id === report.medicationId);
    
    if (!medication) {
      return {
        likelyRelated: false,
        confidence: 0.3,
        knownSideEffect: false,
        recommendAction: 'contact-provider',
        reasoning: 'Unable to verify medication information',
      };
    }
    
    // Check if it's a known side effect
    const symptomLower = report.symptom.toLowerCase();
    const isKnown = [
      ...medication.sideEffects.common,
      ...medication.sideEffects.uncommon,
      ...medication.sideEffects.rare,
    ].some(se => symptomLower.includes(se.toLowerCase()));
    
    const isUrgent = medication.sideEffects.reportImmediately.some(
      se => symptomLower.includes(se.toLowerCase())
    );
    
    // Determine recommendation
    let recommendAction: SideEffectAnalysis['recommendAction'] = 'continue-monitor';
    let reasoning = '';
    
    if (isUrgent) {
      recommendAction = 'seek-immediate-care';
      reasoning = 'This symptom requires immediate medical attention';
    } else if (report.severity === 'severe' || report.stoppedMedication) {
      recommendAction = 'contact-provider';
      reasoning = 'Severe side effect or medication stopped - provider review needed';
    } else if (report.interferesWithLife) {
      recommendAction = 'contact-provider';
      reasoning = 'Side effect is interfering with daily activities';
    } else if (isKnown && report.severity === 'mild') {
      recommendAction = 'continue-monitor';
      reasoning = 'This is a known mild side effect. Continue monitoring and report if it worsens.';
    } else {
      recommendAction = 'contact-provider';
      reasoning = 'Unknown symptom - provider should evaluate';
    }
    
    return {
      likelyRelated: isKnown,
      confidence: isKnown ? 0.85 : 0.5,
      knownSideEffect: isKnown,
      recommendAction,
      reasoning,
    };
  }

  // ===========================================================================
  // Refill Prediction
  // ===========================================================================

  predictRefill(medicationId: string, patientId: string): RefillPrediction | null {
    const patientMeds = this.medications.get(patientId) || [];
    const medication = patientMeds.find(m => m.id === medicationId);
    
    if (!medication || !medication.pillCount || !medication.daysSupply) {
      return null;
    }
    
    // Calculate daily usage
    const dosesPerDay = medication.schedule.reduce((sum, s) => {
      if (s.asNeeded) return sum; // Can't predict as-needed
      return sum + 1;
    }, 0);
    
    const daysRemaining = Math.floor(medication.pillCount / dosesPerDay);
    const runOutDate = new Date();
    runOutDate.setDate(runOutDate.getDate() + daysRemaining);
    
    // Should order when 7-10 days remaining
    const shouldOrderNow = daysRemaining <= 10;
    
    return {
      medicationId,
      currentPillCount: medication.pillCount,
      dailyUsage: dosesPerDay,
      estimatedRunOutDate: runOutDate,
      daysRemaining,
      refillsRemaining: medication.refillsRemaining || 0,
      shouldOrderNow,
      autoRefillEnabled: medication.pharmacy?.autoRefill || false,
      pharmacy: medication.pharmacy,
    };
  }

  getRefillAlerts(patientId: string): RefillPrediction[] {
    const medications = this.medications.get(patientId) || [];
    const alerts: RefillPrediction[] = [];
    
    for (const med of medications) {
      if (!med.isActive) continue;
      
      const prediction = this.predictRefill(med.id, patientId);
      if (prediction && prediction.shouldOrderNow) {
        alerts.push(prediction);
      }
    }
    
    return alerts.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }
}

// Singleton instance
export const medicationBuddyService = new MedicationBuddyService();
export default medicationBuddyService;
