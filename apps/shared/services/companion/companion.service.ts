// ============================================================
// ATTENDING AI - Patient Health Companion Service
// apps/shared/services/companion/companion.service.ts
//
// Phase 8C: Backend service for patient engagement
// Medication tracking, check-ins, care gaps, notifications
// ============================================================

import { prisma } from '../../lib/prisma';

// ============================================================
// TYPES
// ============================================================

export type MoodLevel = 'great' | 'good' | 'okay' | 'bad' | 'terrible';

export interface DailyCheckIn {
  id: string;
  patientId: string;
  date: Date;
  mood: MoodLevel;
  energyLevel: number;
  painLevel: number;
  sleepHours: number;
  sleepQuality: number;
  symptoms: string[];
  notes?: string;
  createdAt: Date;
}

export interface MedicationSchedule {
  id: string;
  patientId: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'bedtime' | 'as_needed';
  instructions?: string;
  prescribedBy: string;
  startDate: Date;
  endDate?: Date;
  refillDate?: Date;
  isActive: boolean;
}

export interface MedicationLog {
  id: string;
  scheduleId: string;
  patientId: string;
  takenAt: Date;
  skipped: boolean;
  skipReason?: string;
}

export interface VitalReading {
  id: string;
  patientId: string;
  type: 'blood_pressure' | 'heart_rate' | 'weight' | 'blood_sugar' | 'temperature' | 'oxygen';
  value: string;
  numericValue?: number;
  secondaryValue?: number;
  unit: string;
  timestamp: Date;
  source: 'manual' | 'device';
  notes?: string;
}

export interface CareGap {
  id: string;
  patientId: string;
  type: 'screening' | 'lab' | 'vaccination' | 'visit' | 'medication';
  title: string;
  description: string;
  measure: string;
  dueDate?: Date;
  priority: 'high' | 'medium' | 'low';
  status: 'open' | 'scheduled' | 'completed' | 'declined';
  completedAt?: Date;
  declinedReason?: string;
}

export interface HealthGoal {
  id: string;
  patientId: string;
  type: 'medication_adherence' | 'vitals' | 'activity' | 'diet' | 'weight' | 'custom';
  title: string;
  targetValue?: number;
  currentValue?: number;
  unit?: string;
  startDate: Date;
  targetDate?: Date;
  status: 'active' | 'achieved' | 'paused';
  streak: number;
}

export interface PatientNotification {
  id: string;
  patientId: string;
  type: 'medication' | 'appointment' | 'care_gap' | 'check_in' | 'message' | 'alert';
  title: string;
  body: string;
  scheduledFor: Date;
  sentAt?: Date;
  readAt?: Date;
  actionUrl?: string;
  priority: 'high' | 'normal' | 'low';
}

export interface EngagementMetrics {
  checkInStreak: number;
  medicationAdherence: number;
  lastCheckIn?: Date;
  lastMedicationLog?: Date;
  totalCheckIns: number;
  averageMood: number;
  careGapsOpen: number;
  careGapsClosed: number;
}

// ============================================================
// PATIENT COMPANION SERVICE
// ============================================================

export class PatientCompanionService {
  
  // ============================================================
  // DAILY CHECK-INS
  // ============================================================

  /**
   * Record a daily check-in
   */
  async recordCheckIn(
    patientId: string,
    data: Omit<DailyCheckIn, 'id' | 'patientId' | 'createdAt'>
  ): Promise<DailyCheckIn> {
    const checkIn: DailyCheckIn = {
      id: `ci_${Date.now()}`,
      patientId,
      ...data,
      createdAt: new Date(),
    };

    try {
      // In production, save to database
      await this.saveCheckInToDb(checkIn);
    } catch (error) {
      console.log('[Companion] Check-in saved to memory (DB pending)');
    }

    // Analyze check-in for alerts
    await this.analyzeCheckIn(checkIn);

    return checkIn;
  }

  /**
   * Get patient's check-in history
   */
  async getCheckInHistory(
    patientId: string,
    days: number = 30
  ): Promise<DailyCheckIn[]> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    try {
      // In production, query from database
      return this.getCheckInsFromDb(patientId, startDate);
    } catch {
      return [];
    }
  }

  /**
   * Analyze check-in for concerning patterns
   */
  private async analyzeCheckIn(checkIn: DailyCheckIn): Promise<void> {
    const alerts: string[] = [];

    // Check for concerning mood patterns
    if (checkIn.mood === 'terrible' || checkIn.mood === 'bad') {
      alerts.push('Patient reported poor mood - consider follow-up');
    }

    // Check for high pain levels
    if (checkIn.painLevel >= 7) {
      alerts.push('Patient reported high pain level - may need intervention');
    }

    // Check for poor sleep
    if (checkIn.sleepHours < 5 || checkIn.sleepQuality <= 2) {
      alerts.push('Patient reported poor sleep - may affect health outcomes');
    }

    // Create provider alerts if needed
    if (alerts.length > 0) {
      await this.createProviderAlert(checkIn.patientId, alerts);
    }
  }

  // ============================================================
  // MEDICATION TRACKING
  // ============================================================

  /**
   * Get patient's medication schedule
   */
  async getMedicationSchedule(patientId: string): Promise<MedicationSchedule[]> {
    try {
      // In production, query from database
      return this.getMedicationsFromDb(patientId);
    } catch {
      return [];
    }
  }

  /**
   * Log medication taken/skipped
   */
  async logMedication(
    patientId: string,
    scheduleId: string,
    taken: boolean,
    skipReason?: string
  ): Promise<MedicationLog> {
    const log: MedicationLog = {
      id: `ml_${Date.now()}`,
      scheduleId,
      patientId,
      takenAt: new Date(),
      skipped: !taken,
      skipReason,
    };

    try {
      await this.saveMedicationLogToDb(log);
    } catch (error) {
      console.log('[Companion] Medication log saved to memory');
    }

    // Update adherence metrics
    await this.updateAdherenceMetrics(patientId);

    return log;
  }

  /**
   * Calculate medication adherence rate
   */
  async calculateAdherence(
    patientId: string,
    days: number = 30
  ): Promise<number> {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const logs = await this.getMedicationLogsFromDb(patientId, startDate);
      
      if (logs.length === 0) return 100;

      const taken = logs.filter(l => !l.skipped).length;
      return Math.round((taken / logs.length) * 100);
    } catch {
      return 0;
    }
  }

  /**
   * Get medications due for reminder
   */
  async getMedicationsDue(patientId: string): Promise<MedicationSchedule[]> {
    const schedule = await this.getMedicationSchedule(patientId);
    const now = new Date();
    const currentHour = now.getHours();

    // Determine current time of day
    let currentTimeOfDay: MedicationSchedule['timeOfDay'];
    if (currentHour < 12) currentTimeOfDay = 'morning';
    else if (currentHour < 17) currentTimeOfDay = 'afternoon';
    else if (currentHour < 21) currentTimeOfDay = 'evening';
    else currentTimeOfDay = 'bedtime';

    // Filter to medications due now that haven't been taken today
    return schedule.filter(med => 
      med.isActive && 
      (med.timeOfDay === currentTimeOfDay || med.timeOfDay === 'as_needed')
    );
  }

  // ============================================================
  // VITAL SIGNS
  // ============================================================

  /**
   * Record a vital sign reading
   */
  async recordVital(
    patientId: string,
    type: VitalReading['type'],
    value: string,
    source: 'manual' | 'device' = 'manual'
  ): Promise<VitalReading> {
    const { numericValue, secondaryValue, unit } = this.parseVitalValue(type, value);

    const reading: VitalReading = {
      id: `vr_${Date.now()}`,
      patientId,
      type,
      value,
      numericValue,
      secondaryValue,
      unit,
      timestamp: new Date(),
      source,
    };

    try {
      await this.saveVitalToDb(reading);
    } catch (error) {
      console.log('[Companion] Vital saved to memory');
    }

    // Check for abnormal readings
    await this.checkVitalAlerts(reading);

    return reading;
  }

  /**
   * Get patient's vital history
   */
  async getVitalHistory(
    patientId: string,
    type?: VitalReading['type'],
    days: number = 30
  ): Promise<VitalReading[]> {
    try {
      return this.getVitalsFromDb(patientId, type, days);
    } catch {
      return [];
    }
  }

  /**
   * Parse vital value into numeric components
   */
  private parseVitalValue(
    type: VitalReading['type'],
    value: string
  ): { numericValue?: number; secondaryValue?: number; unit: string } {
    switch (type) {
      case 'blood_pressure':
        const [systolic, diastolic] = value.split('/').map(v => parseInt(v));
        return { numericValue: systolic, secondaryValue: diastolic, unit: 'mmHg' };
      case 'heart_rate':
        return { numericValue: parseInt(value), unit: 'bpm' };
      case 'weight':
        return { numericValue: parseFloat(value), unit: 'lbs' };
      case 'blood_sugar':
        return { numericValue: parseInt(value), unit: 'mg/dL' };
      case 'temperature':
        return { numericValue: parseFloat(value), unit: '°F' };
      case 'oxygen':
        return { numericValue: parseInt(value), unit: '%' };
      default:
        return { unit: '' };
    }
  }

  /**
   * Check for abnormal vital readings
   */
  private async checkVitalAlerts(reading: VitalReading): Promise<void> {
    const alerts: string[] = [];

    switch (reading.type) {
      case 'blood_pressure':
        if (reading.numericValue && reading.numericValue >= 180) {
          alerts.push('CRITICAL: Systolic BP >= 180 - immediate attention needed');
        } else if (reading.numericValue && reading.numericValue >= 140) {
          alerts.push('High blood pressure reading - may need medication adjustment');
        }
        break;
      case 'blood_sugar':
        if (reading.numericValue && reading.numericValue >= 300) {
          alerts.push('CRITICAL: Blood sugar >= 300 - contact provider immediately');
        } else if (reading.numericValue && reading.numericValue >= 200) {
          alerts.push('Elevated blood sugar - review diet and medications');
        }
        break;
      case 'temperature':
        if (reading.numericValue && reading.numericValue >= 103) {
          alerts.push('High fever - seek medical attention');
        }
        break;
    }

    if (alerts.length > 0) {
      await this.createProviderAlert(reading.patientId, alerts);
    }
  }

  // ============================================================
  // CARE GAPS
  // ============================================================

  /**
   * Get open care gaps for patient
   */
  async getCareGaps(patientId: string): Promise<CareGap[]> {
    try {
      return this.getCareGapsFromDb(patientId);
    } catch {
      return [];
    }
  }

  /**
   * Update care gap status
   */
  async updateCareGapStatus(
    gapId: string,
    status: CareGap['status'],
    declinedReason?: string
  ): Promise<void> {
    try {
      await this.updateCareGapInDb(gapId, status, declinedReason);
    } catch (error) {
      console.log('[Companion] Care gap status update pending');
    }
  }

  /**
   * Calculate care gaps from clinical rules
   */
  async calculateCareGaps(patientId: string): Promise<CareGap[]> {
    const gaps: CareGap[] = [];

    // In production, this would query patient data and apply
    // quality measure rules to identify care gaps

    // Example: Diabetic eye exam
    // Check if patient has diabetes and last eye exam > 1 year ago

    // Example: A1c testing
    // Check if patient has diabetes and last A1c > 3 months ago

    // Example: Flu vaccination
    // Check if it's flu season and no flu shot recorded this year

    return gaps;
  }

  // ============================================================
  // NOTIFICATIONS
  // ============================================================

  /**
   * Schedule a notification
   */
  async scheduleNotification(
    patientId: string,
    type: PatientNotification['type'],
    title: string,
    body: string,
    scheduledFor: Date,
    priority: PatientNotification['priority'] = 'normal'
  ): Promise<PatientNotification> {
    const notification: PatientNotification = {
      id: `notif_${Date.now()}`,
      patientId,
      type,
      title,
      body,
      scheduledFor,
      priority,
    };

    try {
      await this.saveNotificationToDb(notification);
    } catch (error) {
      console.log('[Companion] Notification scheduled in memory');
    }

    return notification;
  }

  /**
   * Get pending notifications
   */
  async getPendingNotifications(patientId: string): Promise<PatientNotification[]> {
    try {
      return this.getNotificationsFromDb(patientId);
    } catch {
      return [];
    }
  }

  /**
   * Schedule medication reminders for the day
   */
  async scheduleMedicationReminders(patientId: string): Promise<void> {
    const schedule = await this.getMedicationSchedule(patientId);
    const today = new Date();

    for (const med of schedule) {
      if (!med.isActive) continue;

      const reminderTime = this.getTimeForTimeOfDay(med.timeOfDay);
      const scheduledFor = new Date(today);
      scheduledFor.setHours(reminderTime.hours, reminderTime.minutes, 0, 0);

      if (scheduledFor > new Date()) {
        await this.scheduleNotification(
          patientId,
          'medication',
          `Time for ${med.medicationName}`,
          `Take ${med.dosage} ${med.instructions || ''}`.trim(),
          scheduledFor
        );
      }
    }
  }

  private getTimeForTimeOfDay(
    timeOfDay: MedicationSchedule['timeOfDay']
  ): { hours: number; minutes: number } {
    switch (timeOfDay) {
      case 'morning': return { hours: 8, minutes: 0 };
      case 'afternoon': return { hours: 13, minutes: 0 };
      case 'evening': return { hours: 18, minutes: 0 };
      case 'bedtime': return { hours: 21, minutes: 0 };
      default: return { hours: 12, minutes: 0 };
    }
  }

  // ============================================================
  // ENGAGEMENT METRICS
  // ============================================================

  /**
   * Get patient engagement metrics
   */
  async getEngagementMetrics(patientId: string): Promise<EngagementMetrics> {
    const [checkIns, adherence, careGaps] = await Promise.all([
      this.getCheckInHistory(patientId, 30),
      this.calculateAdherence(patientId, 30),
      this.getCareGaps(patientId),
    ]);

    // Calculate check-in streak
    let streak = 0;
    const sortedCheckIns = checkIns.sort((a, b) => b.date.getTime() - a.date.getTime());
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const hasCheckIn = sortedCheckIns.some(c => 
        c.date.toDateString() === checkDate.toDateString()
      );
      if (hasCheckIn) streak++;
      else if (i > 0) break;
    }

    // Calculate average mood
    const moodValues: Record<MoodLevel, number> = {
      great: 5, good: 4, okay: 3, bad: 2, terrible: 1
    };
    const avgMood = checkIns.length > 0
      ? checkIns.reduce((sum, c) => sum + moodValues[c.mood], 0) / checkIns.length
      : 0;

    return {
      checkInStreak: streak,
      medicationAdherence: adherence,
      lastCheckIn: sortedCheckIns[0]?.date,
      lastMedicationLog: undefined, // Would come from medication logs
      totalCheckIns: checkIns.length,
      averageMood: avgMood,
      careGapsOpen: careGaps.filter(g => g.status === 'open').length,
      careGapsClosed: careGaps.filter(g => g.status === 'completed').length,
    };
  }

  // ============================================================
  // HELPER METHODS (DB Operations)
  // ============================================================

  private async saveCheckInToDb(checkIn: DailyCheckIn): Promise<void> {
    // Placeholder - would save to Prisma
  }

  private async getCheckInsFromDb(patientId: string, startDate: Date): Promise<DailyCheckIn[]> {
    return [];
  }

  private async getMedicationsFromDb(patientId: string): Promise<MedicationSchedule[]> {
    return [];
  }

  private async saveMedicationLogToDb(log: MedicationLog): Promise<void> {
    // Placeholder
  }

  private async getMedicationLogsFromDb(patientId: string, startDate: Date): Promise<MedicationLog[]> {
    return [];
  }

  private async updateAdherenceMetrics(patientId: string): Promise<void> {
    // Placeholder
  }

  private async saveVitalToDb(reading: VitalReading): Promise<void> {
    // Placeholder
  }

  private async getVitalsFromDb(
    patientId: string,
    type?: VitalReading['type'],
    days?: number
  ): Promise<VitalReading[]> {
    return [];
  }

  private async getCareGapsFromDb(patientId: string): Promise<CareGap[]> {
    return [];
  }

  private async updateCareGapInDb(
    gapId: string,
    status: CareGap['status'],
    reason?: string
  ): Promise<void> {
    // Placeholder
  }

  private async saveNotificationToDb(notification: PatientNotification): Promise<void> {
    // Placeholder
  }

  private async getNotificationsFromDb(patientId: string): Promise<PatientNotification[]> {
    return [];
  }

  private async createProviderAlert(patientId: string, alerts: string[]): Promise<void> {
    // In production, create alerts for the care team
    console.log(`[Companion] Provider alerts for ${patientId}:`, alerts);
  }
}

// ============================================================
// SINGLETON INSTANCE
// ============================================================

export const patientCompanion = new PatientCompanionService();
