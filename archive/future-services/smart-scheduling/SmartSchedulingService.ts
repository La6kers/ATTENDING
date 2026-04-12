// =============================================================================
// ATTENDING AI - Smart Scheduling Optimization Service
// apps/shared/services/smart-scheduling/SmartSchedulingService.ts
//
// AI-powered scheduling optimization including:
// - Appointment length prediction
// - Optimal visit clustering
// - Patient acuity-based scheduling
// - No-show prediction and prevention
// - Wait time optimization
// =============================================================================

import { EventEmitter } from 'events';

// =============================================================================
// Types
// =============================================================================

export interface Patient {
  id: string;
  name: string;
  age: number;
  conditions: string[];
  communicationPreferences: {
    preferredContact: 'phone' | 'text' | 'email';
    bestTimeToContact: string;
    language: string;
  };
  schedulingHistory: SchedulingHistoryEntry[];
  noShowHistory: NoShowRecord[];
  lastVisitDate?: Date;
  preferredProvider?: string;
  preferredDays?: string[];
  preferredTimeOfDay?: 'morning' | 'afternoon' | 'evening';
  transportationNeeds?: boolean;
  needsInterpreter?: boolean;
  mobilityLimitations?: boolean;
}

export interface SchedulingHistoryEntry {
  appointmentDate: Date;
  appointmentType: string;
  providerId: string;
  actualDuration: number;
  scheduledDuration: number;
  wasLate: boolean;
  minutesLate?: number;
  outcome: 'completed' | 'no-show' | 'cancelled' | 'rescheduled';
}

export interface NoShowRecord {
  date: Date;
  appointmentType: string;
  reason?: string;
  wasRescheduled: boolean;
}

export interface Provider {
  id: string;
  name: string;
  specialty: string;
  appointmentTypes: AppointmentTypeConfig[];
  availability: ProviderAvailability[];
  preferredPatientLoad: number;
  avgRunningLate: number;
  bufferPreference: number; // minutes between appointments
}

export interface AppointmentTypeConfig {
  type: string;
  defaultDuration: number;
  minDuration: number;
  maxDuration: number;
  requiresSpecificTime?: boolean;
  canBeGrouped?: boolean;
}

export interface ProviderAvailability {
  dayOfWeek: number; // 0-6
  startTime: string; // HH:MM
  endTime: string;
  appointmentTypes?: string[];
}

export interface AppointmentSlot {
  id: string;
  providerId: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  appointmentType: string;
  isAvailable: boolean;
  suggestedFor?: string[]; // Patient types this slot is good for
  acuityLevel?: 'low' | 'medium' | 'high';
}

export interface SchedulingRecommendation {
  patientId: string;
  recommendedSlots: RecommendedSlot[];
  predictedDuration: number;
  noShowRisk: number;
  reminderStrategy: ReminderStrategy;
  specialAccommodations: string[];
  reasoning: string[];
}

export interface RecommendedSlot {
  slot: AppointmentSlot;
  score: number;
  reasons: string[];
}

export interface ReminderStrategy {
  numberOfReminders: number;
  reminderTimes: { daysBefore: number; method: 'phone' | 'text' | 'email' }[];
  personalizedMessage?: string;
}

export interface NoShowPrediction {
  patientId: string;
  appointmentDate: Date;
  riskScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high';
  riskFactors: string[];
  mitigationStrategies: string[];
}

export interface ScheduleOptimization {
  providerId: string;
  date: Date;
  currentSchedule: AppointmentSlot[];
  optimizedSchedule: AppointmentSlot[];
  improvements: OptimizationImprovement[];
  metrics: ScheduleMetrics;
}

export interface OptimizationImprovement {
  type: 'reduced-wait' | 'better-clustering' | 'buffer-optimization' | 'overbooking-adjustment';
  description: string;
  estimatedBenefit: string;
}

export interface ScheduleMetrics {
  totalAppointments: number;
  utilization: number; // percentage
  avgWaitTime: number;
  expectedOverrun: number;
  overbookingRisk: number;
  patientSatisfactionScore: number;
}

export interface WaitTimeEstimate {
  appointmentId: string;
  scheduledTime: Date;
  estimatedActualTime: Date;
  estimatedWait: number; // minutes
  confidence: number;
  factors: string[];
}

// =============================================================================
// Appointment Duration Models
// =============================================================================

interface DurationModel {
  appointmentType: string;
  baseDuration: number;
  modifiers: DurationModifier[];
}

interface DurationModifier {
  condition: (patient: Patient) => boolean;
  adjustment: number; // minutes to add
  reason: string;
}

const DURATION_MODELS: DurationModel[] = [
  {
    appointmentType: 'new-patient',
    baseDuration: 30,
    modifiers: [
      { condition: (p) => p.age >= 65, adjustment: 10, reason: 'Senior patient may need more time' },
      { condition: (p) => p.conditions.length >= 3, adjustment: 15, reason: 'Multiple chronic conditions' },
      { condition: (p) => p.needsInterpreter === true, adjustment: 15, reason: 'Interpreter services needed' },
      { condition: (p) => p.mobilityLimitations === true, adjustment: 5, reason: 'Mobility assistance needed' },
    ],
  },
  {
    appointmentType: 'follow-up',
    baseDuration: 15,
    modifiers: [
      { condition: (p) => p.age >= 65, adjustment: 5, reason: 'Senior patient' },
      { condition: (p) => p.conditions.length >= 3, adjustment: 10, reason: 'Multiple conditions to review' },
      { condition: (p) => p.needsInterpreter === true, adjustment: 10, reason: 'Interpreter services' },
    ],
  },
  {
    appointmentType: 'annual-wellness',
    baseDuration: 30,
    modifiers: [
      { condition: (p) => p.age >= 65, adjustment: 15, reason: 'Medicare AWV requirements' },
      { condition: (p) => p.conditions.length >= 5, adjustment: 10, reason: 'Extensive chronic disease review' },
    ],
  },
  {
    appointmentType: 'urgent',
    baseDuration: 20,
    modifiers: [
      { condition: (p) => p.age >= 65, adjustment: 5, reason: 'Senior patient assessment' },
      { condition: (p) => p.needsInterpreter === true, adjustment: 10, reason: 'Interpreter coordination' },
    ],
  },
  {
    appointmentType: 'procedure',
    baseDuration: 45,
    modifiers: [
      { condition: (p) => p.age >= 75, adjustment: 15, reason: 'Additional monitoring for elderly' },
    ],
  },
  {
    appointmentType: 'mental-health',
    baseDuration: 45,
    modifiers: [
      { condition: (p) => p.conditions.some(c => c.toLowerCase().includes('anxiety')), adjustment: 10, reason: 'May need additional time' },
    ],
  },
  {
    appointmentType: 'chronic-care',
    baseDuration: 25,
    modifiers: [
      { condition: (p) => p.conditions.length >= 4, adjustment: 15, reason: 'Multiple chronic conditions' },
      { condition: (p) => p.needsInterpreter === true, adjustment: 15, reason: 'Interpreter services' },
    ],
  },
];

// =============================================================================
// No-Show Risk Factors
// =============================================================================

interface NoShowRiskFactor {
  condition: (patient: Patient, appointment: { date: Date; type: string }) => boolean;
  weight: number;
  factor: string;
}

const NO_SHOW_RISK_FACTORS: NoShowRiskFactor[] = [
  {
    condition: (p) => {
      const totalAppts = p.schedulingHistory.length;
      const noShows = p.noShowHistory.length;
      return totalAppts > 0 && (noShows / totalAppts) > 0.2;
    },
    weight: 30,
    factor: 'History of no-shows (>20%)',
  },
  {
    condition: (p) => p.transportationNeeds === true,
    weight: 15,
    factor: 'Transportation challenges',
  },
  {
    condition: (p, a) => {
      const dayOfWeek = a.date.getDay();
      return dayOfWeek === 1; // Monday
    },
    weight: 10,
    factor: 'Monday appointment (higher no-show rate)',
  },
  {
    condition: (p) => p.age >= 18 && p.age <= 35,
    weight: 10,
    factor: 'Younger adult demographic',
  },
  {
    condition: (p, a) => {
      const leadTime = Math.floor((a.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return leadTime > 30;
    },
    weight: 15,
    factor: 'Appointment scheduled >30 days out',
  },
  {
    condition: (p) => {
      const lastVisit = p.lastVisitDate;
      if (!lastVisit) return true;
      const daysSinceVisit = Math.floor((Date.now() - lastVisit.getTime()) / (1000 * 60 * 60 * 24));
      return daysSinceVisit > 365;
    },
    weight: 15,
    factor: 'No visit in over a year',
  },
  {
    condition: (p) => {
      const recentHistory = p.schedulingHistory.slice(0, 3);
      return recentHistory.some(h => h.outcome === 'cancelled' || h.outcome === 'rescheduled');
    },
    weight: 10,
    factor: 'Recent cancellations/reschedules',
  },
  {
    condition: (p, a) => a.type.toLowerCase().includes('follow-up'),
    weight: 5,
    factor: 'Follow-up appointments have slightly higher no-show rates',
  },
];

// =============================================================================
// Smart Scheduling Service Class
// =============================================================================

export class SmartSchedulingService extends EventEmitter {
  private patients: Map<string, Patient> = new Map();
  private providers: Map<string, Provider> = new Map();
  private appointments: Map<string, AppointmentSlot[]> = new Map(); // providerId -> appointments

  constructor() {
    super();
  }

  // ===========================================================================
  // Patient & Provider Management
  // ===========================================================================

  registerPatient(patient: Patient): void {
    this.patients.set(patient.id, patient);
  }

  registerProvider(provider: Provider): void {
    this.providers.set(provider.id, provider);
  }

  // ===========================================================================
  // Appointment Duration Prediction
  // ===========================================================================

  predictAppointmentDuration(
    patientId: string,
    appointmentType: string
  ): { duration: number; factors: string[]; confidence: number } {
    const patient = this.patients.get(patientId);
    if (!patient) {
      // Return default duration
      const model = DURATION_MODELS.find(m => m.appointmentType === appointmentType);
      return {
        duration: model?.baseDuration || 20,
        factors: ['Using default duration (patient not found)'],
        confidence: 0.5,
      };
    }

    const model = DURATION_MODELS.find(m => m.appointmentType === appointmentType);
    if (!model) {
      return {
        duration: 20,
        factors: ['Unknown appointment type, using default'],
        confidence: 0.5,
      };
    }

    let duration = model.baseDuration;
    const factors: string[] = [];

    // Apply modifiers
    for (const modifier of model.modifiers) {
      if (modifier.condition(patient)) {
        duration += modifier.adjustment;
        factors.push(`+${modifier.adjustment}min: ${modifier.reason}`);
      }
    }

    // Check historical data
    const similarAppts = patient.schedulingHistory.filter(
      h => h.appointmentType === appointmentType && h.outcome === 'completed'
    );

    if (similarAppts.length >= 3) {
      const avgActual = similarAppts.reduce((sum, a) => sum + a.actualDuration, 0) / similarAppts.length;
      const historicalAdjustment = Math.round(avgActual - model.baseDuration);
      
      if (Math.abs(historicalAdjustment) > 5) {
        duration += Math.round(historicalAdjustment * 0.5); // Partial adjustment based on history
        factors.push(`Historical average: ${avgActual}min`);
      }
    }

    return {
      duration: Math.round(duration),
      factors,
      confidence: similarAppts.length >= 3 ? 0.85 : 0.7,
    };
  }

  // ===========================================================================
  // No-Show Prediction
  // ===========================================================================

  predictNoShowRisk(
    patientId: string,
    appointmentDate: Date,
    appointmentType: string
  ): NoShowPrediction {
    const patient = this.patients.get(patientId);
    
    if (!patient) {
      return {
        patientId,
        appointmentDate,
        riskScore: 50,
        riskLevel: 'medium',
        riskFactors: ['Patient data unavailable'],
        mitigationStrategies: ['Standard reminder protocol'],
      };
    }

    let riskScore = 10; // Base risk
    const riskFactors: string[] = [];
    const appointment = { date: appointmentDate, type: appointmentType };

    for (const factor of NO_SHOW_RISK_FACTORS) {
      if (factor.condition(patient, appointment)) {
        riskScore += factor.weight;
        riskFactors.push(factor.factor);
      }
    }

    // Cap at 100
    riskScore = Math.min(100, riskScore);

    // Determine risk level
    let riskLevel: NoShowPrediction['riskLevel'];
    if (riskScore >= 50) {
      riskLevel = 'high';
    } else if (riskScore >= 25) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'low';
    }

    // Generate mitigation strategies
    const mitigationStrategies = this.generateMitigationStrategies(patient, riskLevel, riskFactors);

    return {
      patientId,
      appointmentDate,
      riskScore,
      riskLevel,
      riskFactors,
      mitigationStrategies,
    };
  }

  private generateMitigationStrategies(
    patient: Patient,
    riskLevel: NoShowPrediction['riskLevel'],
    riskFactors: string[]
  ): string[] {
    const strategies: string[] = [];

    if (riskLevel === 'high') {
      strategies.push('Multiple reminder contacts (3-day, 1-day, same-day)');
      strategies.push('Personal phone call from staff');
      
      if (riskFactors.includes('Transportation challenges')) {
        strategies.push('Offer transportation assistance or telehealth option');
      }
      
      if (riskFactors.includes('Appointment scheduled >30 days out')) {
        strategies.push('Consider closer appointment date if available');
      }
      
      strategies.push('Confirm appointment 48 hours in advance');
    } else if (riskLevel === 'medium') {
      strategies.push('Standard reminder plus confirmation request');
      strategies.push('Text message reminder with easy confirm/reschedule option');
    } else {
      strategies.push('Standard automated reminders');
    }

    // Personalize based on communication preferences
    if (patient.communicationPreferences.preferredContact === 'text') {
      strategies.push('Primary reminders via SMS');
    } else if (patient.communicationPreferences.preferredContact === 'email') {
      strategies.push('Primary reminders via email');
    }

    return strategies;
  }

  // ===========================================================================
  // Scheduling Recommendations
  // ===========================================================================

  getSchedulingRecommendation(
    patientId: string,
    appointmentType: string,
    preferredDateRange: { start: Date; end: Date },
    providerId?: string
  ): SchedulingRecommendation {
    const patient = this.patients.get(patientId);
    const durationPrediction = this.predictAppointmentDuration(patientId, appointmentType);
    
    // Get available slots
    const availableSlots = this.getAvailableSlots(
      preferredDateRange,
      appointmentType,
      durationPrediction.duration,
      providerId
    );

    // Score slots
    const scoredSlots = this.scoreSlots(availableSlots, patient, appointmentType);

    // Sort by score
    const recommendedSlots = scoredSlots
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    // Calculate no-show risk for top recommendation
    const topSlot = recommendedSlots[0]?.slot;
    const noShowRisk = topSlot
      ? this.predictNoShowRisk(patientId, topSlot.startTime, appointmentType).riskScore
      : 50;

    // Generate reminder strategy
    const reminderStrategy = this.generateReminderStrategy(patient, noShowRisk);

    // Identify special accommodations
    const specialAccommodations: string[] = [];
    if (patient?.needsInterpreter) {
      specialAccommodations.push(`Interpreter needed: ${patient.communicationPreferences.language}`);
    }
    if (patient?.mobilityLimitations) {
      specialAccommodations.push('Accessible exam room required');
    }
    if (patient?.transportationNeeds) {
      specialAccommodations.push('May need transportation assistance');
    }

    return {
      patientId,
      recommendedSlots,
      predictedDuration: durationPrediction.duration,
      noShowRisk,
      reminderStrategy,
      specialAccommodations,
      reasoning: durationPrediction.factors,
    };
  }

  private getAvailableSlots(
    dateRange: { start: Date; end: Date },
    appointmentType: string,
    duration: number,
    providerId?: string
  ): AppointmentSlot[] {
    const slots: AppointmentSlot[] = [];
    const providers = providerId
      ? [this.providers.get(providerId)].filter(Boolean)
      : Array.from(this.providers.values());

    for (const provider of providers) {
      if (!provider) continue;

      // Check if provider handles this appointment type
      const typeConfig = provider.appointmentTypes.find(t => t.type === appointmentType);
      if (!typeConfig) continue;

      // Generate slots for each day in range
      const currentDate = new Date(dateRange.start);
      while (currentDate <= dateRange.end) {
        const dayOfWeek = currentDate.getDay();
        const availability = provider.availability.find(a => a.dayOfWeek === dayOfWeek);

        if (availability) {
          // Generate time slots
          const daySlots = this.generateDaySlots(
            provider,
            currentDate,
            availability,
            duration,
            appointmentType
          );
          slots.push(...daySlots);
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    return slots;
  }

  private generateDaySlots(
    provider: Provider,
    date: Date,
    availability: ProviderAvailability,
    duration: number,
    appointmentType: string
  ): AppointmentSlot[] {
    const slots: AppointmentSlot[] = [];
    
    const [startHour, startMin] = availability.startTime.split(':').map(Number);
    const [endHour, endMin] = availability.endTime.split(':').map(Number);
    
    const startTime = new Date(date);
    startTime.setHours(startHour, startMin, 0, 0);
    
    const endTime = new Date(date);
    endTime.setHours(endHour, endMin, 0, 0);
    
    let currentTime = new Date(startTime);
    while (currentTime.getTime() + duration * 60000 <= endTime.getTime()) {
      const slotEnd = new Date(currentTime.getTime() + duration * 60000);
      
      slots.push({
        id: `slot_${provider.id}_${currentTime.getTime()}`,
        providerId: provider.id,
        startTime: new Date(currentTime),
        endTime: slotEnd,
        duration,
        appointmentType,
        isAvailable: true, // Would check against existing appointments
      });
      
      // Move to next slot (duration + buffer)
      currentTime = new Date(currentTime.getTime() + (duration + provider.bufferPreference) * 60000);
    }
    
    return slots;
  }

  private scoreSlots(
    slots: AppointmentSlot[],
    patient: Patient | undefined,
    appointmentType: string
  ): RecommendedSlot[] {
    return slots.map(slot => {
      let score = 50; // Base score
      const reasons: string[] = [];

      // Patient preferences
      if (patient) {
        // Preferred time of day
        const hour = slot.startTime.getHours();
        if (patient.preferredTimeOfDay === 'morning' && hour < 12) {
          score += 15;
          reasons.push('Morning slot matches preference');
        } else if (patient.preferredTimeOfDay === 'afternoon' && hour >= 12 && hour < 17) {
          score += 15;
          reasons.push('Afternoon slot matches preference');
        }

        // Preferred day
        const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][slot.startTime.getDay()];
        if (patient.preferredDays?.includes(dayName)) {
          score += 10;
          reasons.push(`${dayName} is a preferred day`);
        }

        // Preferred provider
        if (patient.preferredProvider === slot.providerId) {
          score += 20;
          reasons.push('Preferred provider');
        }
      }

      // Appointment timing factors
      const daysUntilAppt = Math.floor((slot.startTime.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      
      // Prefer sooner appointments (but not too soon)
      if (daysUntilAppt >= 2 && daysUntilAppt <= 14) {
        score += 10;
        reasons.push('Optimal lead time (2-14 days)');
      } else if (daysUntilAppt > 30) {
        score -= 10;
        reasons.push('Far in advance (higher no-show risk)');
      }

      // Avoid Monday appointments slightly (higher no-show rate)
      if (slot.startTime.getDay() === 1) {
        score -= 5;
      }

      // Provider load consideration
      const provider = this.providers.get(slot.providerId);
      if (provider && provider.avgRunningLate > 15) {
        score -= 10;
        reasons.push('Provider may run late');
      }

      return { slot, score, reasons };
    });
  }

  private generateReminderStrategy(
    patient: Patient | undefined,
    noShowRisk: number
  ): ReminderStrategy {
    const strategy: ReminderStrategy = {
      numberOfReminders: noShowRisk >= 50 ? 3 : noShowRisk >= 25 ? 2 : 1,
      reminderTimes: [],
    };

    const preferredMethod = patient?.communicationPreferences.preferredContact || 'text';

    if (noShowRisk >= 50) {
      strategy.reminderTimes = [
        { daysBefore: 7, method: preferredMethod },
        { daysBefore: 2, method: preferredMethod },
        { daysBefore: 1, method: 'phone' },
      ];
      strategy.personalizedMessage = 'We look forward to seeing you! Please call us if you need to reschedule.';
    } else if (noShowRisk >= 25) {
      strategy.reminderTimes = [
        { daysBefore: 3, method: preferredMethod },
        { daysBefore: 1, method: preferredMethod },
      ];
    } else {
      strategy.reminderTimes = [
        { daysBefore: 1, method: preferredMethod },
      ];
    }

    return strategy;
  }

  // ===========================================================================
  // Schedule Optimization
  // ===========================================================================

  optimizeSchedule(providerId: string, date: Date): ScheduleOptimization {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error('Provider not found');
    }

    const currentSchedule = this.appointments.get(providerId) || [];
    const daySchedule = currentSchedule.filter(
      a => a.startTime.toDateString() === date.toDateString()
    );

    const improvements: OptimizationImprovement[] = [];
    const optimizedSchedule = [...daySchedule];

    // Analyze and suggest improvements

    // 1. Check for gaps
    for (let i = 0; i < daySchedule.length - 1; i++) {
      const gap = (daySchedule[i + 1].startTime.getTime() - daySchedule[i].endTime.getTime()) / 60000;
      if (gap > 30) {
        improvements.push({
          type: 'buffer-optimization',
          description: `${gap}min gap between appointments ${i + 1} and ${i + 2}`,
          estimatedBenefit: 'Could fit additional short appointment',
        });
      }
    }

    // 2. Check for overbooking risk
    const totalScheduledTime = daySchedule.reduce((sum, a) => sum + a.duration, 0);
    const availableTime = this.getProviderDayMinutes(provider, date);
    const utilization = totalScheduledTime / availableTime;

    if (utilization > 0.95) {
      improvements.push({
        type: 'overbooking-adjustment',
        description: 'Schedule is at >95% capacity',
        estimatedBenefit: 'Consider moving non-urgent appointments to reduce overrun risk',
      });
    }

    // 3. Cluster similar appointments
    const appointmentsByType = new Map<string, AppointmentSlot[]>();
    for (const appt of daySchedule) {
      const list = appointmentsByType.get(appt.appointmentType) || [];
      list.push(appt);
      appointmentsByType.set(appt.appointmentType, list);
    }

    for (const [type, appts] of appointmentsByType) {
      if (appts.length >= 2 && !this.areAppointmentsClustered(appts)) {
        improvements.push({
          type: 'better-clustering',
          description: `${type} appointments could be grouped together`,
          estimatedBenefit: 'Improved workflow efficiency',
        });
      }
    }

    // Calculate metrics
    const metrics: ScheduleMetrics = {
      totalAppointments: daySchedule.length,
      utilization: Math.round(utilization * 100),
      avgWaitTime: this.estimateAverageWaitTime(daySchedule, provider),
      expectedOverrun: utilization > 0.85 ? (utilization - 0.85) * 60 : 0,
      overbookingRisk: utilization > 0.9 ? (utilization - 0.9) * 100 : 0,
      patientSatisfactionScore: Math.max(0, 100 - (utilization > 0.9 ? 20 : 0) - improvements.length * 5),
    };

    return {
      providerId,
      date,
      currentSchedule: daySchedule,
      optimizedSchedule,
      improvements,
      metrics,
    };
  }

  private getProviderDayMinutes(provider: Provider, date: Date): number {
    const dayOfWeek = date.getDay();
    const availability = provider.availability.find(a => a.dayOfWeek === dayOfWeek);
    
    if (!availability) return 0;
    
    const [startH, startM] = availability.startTime.split(':').map(Number);
    const [endH, endM] = availability.endTime.split(':').map(Number);
    
    return (endH * 60 + endM) - (startH * 60 + startM);
  }

  private areAppointmentsClustered(appointments: AppointmentSlot[]): boolean {
    if (appointments.length < 2) return true;
    
    const sorted = appointments.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    
    for (let i = 0; i < sorted.length - 1; i++) {
      const gap = (sorted[i + 1].startTime.getTime() - sorted[i].endTime.getTime()) / 60000;
      if (gap > 60) return false; // More than 1 hour gap between same-type appointments
    }
    
    return true;
  }

  private estimateAverageWaitTime(schedule: AppointmentSlot[], provider: Provider): number {
    // Simple estimation based on schedule density and provider tendencies
    let expectedWait = provider.avgRunningLate;
    
    // Add time as day progresses
    const midDayAppts = schedule.filter(
      a => a.startTime.getHours() >= 11 && a.startTime.getHours() <= 14
    ).length;
    
    expectedWait += midDayAppts * 2;
    
    return Math.round(expectedWait);
  }

  // ===========================================================================
  // Wait Time Estimation
  // ===========================================================================

  estimateWaitTime(appointmentId: string): WaitTimeEstimate | null {
    // Find the appointment
    let appointment: AppointmentSlot | undefined;
    let providerId: string | undefined;
    
    for (const [pId, appts] of this.appointments) {
      const found = appts.find(a => a.id === appointmentId);
      if (found) {
        appointment = found;
        providerId = pId;
        break;
      }
    }
    
    if (!appointment || !providerId) return null;
    
    const provider = this.providers.get(providerId);
    if (!provider) return null;
    
    const factors: string[] = [];
    let estimatedDelay = 0;
    
    // Base delay from provider's average
    estimatedDelay += provider.avgRunningLate;
    if (provider.avgRunningLate > 10) {
      factors.push('Provider typically runs late');
    }
    
    // Time of day factor
    const hour = appointment.startTime.getHours();
    if (hour >= 11 && hour <= 14) {
      estimatedDelay += 5;
      factors.push('Mid-day appointment (accumulated delays)');
    } else if (hour >= 15) {
      estimatedDelay += 10;
      factors.push('Late afternoon (potential accumulated delays)');
    }
    
    // Day of week
    if (appointment.startTime.getDay() === 1) {
      estimatedDelay += 5;
      factors.push('Monday (typically busier)');
    }
    
    const estimatedActualTime = new Date(
      appointment.startTime.getTime() + estimatedDelay * 60000
    );
    
    return {
      appointmentId,
      scheduledTime: appointment.startTime,
      estimatedActualTime,
      estimatedWait: estimatedDelay,
      confidence: 0.7,
      factors,
    };
  }
}

// Singleton instance
export const smartSchedulingService = new SmartSchedulingService();
export default smartSchedulingService;
