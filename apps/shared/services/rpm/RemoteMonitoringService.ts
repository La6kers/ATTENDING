// =============================================================================
// ATTENDING AI - Remote Patient Monitoring Service
// apps/shared/services/rpm/RemoteMonitoringService.ts
//
// Integrates patient device data (BP, glucose, pulse ox, wearables)
// AI-powered threshold monitoring with personalized baselines
// =============================================================================

import { EventEmitter } from 'events';

// =============================================================================
// TYPES
// =============================================================================

export type DeviceType = 
  | 'blood_pressure'
  | 'glucose_meter'
  | 'pulse_oximeter'
  | 'weight_scale'
  | 'thermometer'
  | 'ecg'
  | 'spirometer'
  | 'activity_tracker'
  | 'cgm'  // Continuous glucose monitor
  | 'smart_watch';

export type DeviceVendor = 
  | 'apple_health'
  | 'google_fit'
  | 'fitbit'
  | 'withings'
  | 'dexcom'
  | 'freestyle_libre'
  | 'omron'
  | 'ihealth'
  | 'qardio'
  | 'generic';

export type AlertSeverity = 'info' | 'warning' | 'urgent' | 'critical';
export type ReadingStatus = 'normal' | 'elevated' | 'low' | 'critical_high' | 'critical_low';

export interface PatientDevice {
  id: string;
  patientId: string;
  deviceType: DeviceType;
  vendor: DeviceVendor;
  model?: string;
  serialNumber?: string;
  lastSyncAt?: Date;
  batteryLevel?: number;
  isActive: boolean;
  settings: DeviceSettings;
  createdAt: Date;
}

export interface DeviceSettings {
  syncFrequency: 'realtime' | 'hourly' | 'daily';
  alertsEnabled: boolean;
  thresholds?: CustomThresholds;
}

export interface CustomThresholds {
  // Blood Pressure
  systolicHigh?: number;
  systolicCriticalHigh?: number;
  systolicLow?: number;
  systolicCriticalLow?: number;
  diastolicHigh?: number;
  diastolicCriticalHigh?: number;
  diastolicLow?: number;
  diastolicCriticalLow?: number;
  
  // Heart Rate
  heartRateHigh?: number;
  heartRateCriticalHigh?: number;
  heartRateLow?: number;
  heartRateCriticalLow?: number;
  
  // Blood Glucose
  glucoseHigh?: number;
  glucoseCriticalHigh?: number;
  glucoseLow?: number;
  glucoseCriticalLow?: number;
  glucoseFastingTarget?: number;
  glucosePostMealTarget?: number;
  
  // Oxygen Saturation
  oxygenSatLow?: number;
  oxygenSatCriticalLow?: number;
  
  // Weight
  weightChangeAlertPounds?: number;
  weightChangeAlertPercent?: number;
  
  // Temperature
  tempHigh?: number;
  tempLow?: number;
}

export interface DeviceReading {
  id: string;
  deviceId: string;
  patientId: string;
  deviceType: DeviceType;
  timestamp: Date;
  receivedAt: Date;
  
  // Values based on device type
  values: ReadingValues;
  
  // Status
  status: ReadingStatus;
  flags: ReadingFlag[];
  
  // Context
  context?: ReadingContext;
  
  // Metadata
  rawData?: any;
  source: 'device' | 'manual' | 'imported';
}

export interface ReadingValues {
  // Blood Pressure
  systolic?: number;
  diastolic?: number;
  map?: number;  // Mean arterial pressure
  
  // Heart Rate
  heartRate?: number;
  heartRateVariability?: number;
  
  // Blood Glucose
  glucose?: number;
  glucoseUnit?: 'mg/dL' | 'mmol/L';
  glucoseContext?: 'fasting' | 'pre_meal' | 'post_meal' | 'bedtime' | 'random';
  
  // Oxygen
  oxygenSaturation?: number;
  perfusionIndex?: number;
  
  // Weight
  weight?: number;
  weightUnit?: 'lbs' | 'kg';
  bmi?: number;
  bodyFat?: number;
  muscleMass?: number;
  
  // Temperature
  temperature?: number;
  temperatureUnit?: 'F' | 'C';
  
  // Activity
  steps?: number;
  activeMinutes?: number;
  caloriesBurned?: number;
  distance?: number;
  floors?: number;
  
  // Sleep
  sleepDuration?: number;
  sleepQuality?: number;
  deepSleep?: number;
  remSleep?: number;
  
  // ECG
  ecgClassification?: 'normal' | 'afib' | 'inconclusive';
  
  // Spirometry
  fev1?: number;
  fvc?: number;
  pef?: number;
}

export interface ReadingFlag {
  type: 'threshold_exceeded' | 'trend_alert' | 'missing_reading' | 'device_issue';
  severity: AlertSeverity;
  message: string;
  threshold?: string;
}

export interface ReadingContext {
  notes?: string;
  medications?: string[];
  symptoms?: string[];
  activity?: string;
  meals?: string;
}

export interface RPMAlert {
  id: string;
  patientId: string;
  deviceId?: string;
  readingId?: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  values: any;
  thresholds?: any;
  trend?: TrendData;
  recommendedActions: string[];
  createdAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
  resolution?: string;
}

export type AlertType = 
  | 'threshold_exceeded'
  | 'critical_value'
  | 'trend_alert'
  | 'missing_data'
  | 'device_disconnected'
  | 'battery_low'
  | 'weight_gain'
  | 'glucose_pattern'
  | 'bp_pattern'
  | 'activity_decline';

export interface TrendData {
  direction: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  changePercent: number;
  period: string;
  dataPoints: number;
}

export interface PatientRPMEnrollment {
  id: string;
  patientId: string;
  providerId: string;
  programType: 'chronic_care' | 'post_discharge' | 'high_risk' | 'preventive';
  conditions: string[];
  devices: PatientDevice[];
  goals: RPMGoal[];
  startDate: Date;
  endDate?: Date;
  status: 'active' | 'paused' | 'completed' | 'discontinued';
  billingInfo: RPMBilling;
}

export interface RPMGoal {
  id: string;
  metric: string;
  target: number | string;
  unit?: string;
  frequency?: string;
  progress?: number;
}

export interface RPMBilling {
  cptCodes: string[];
  monthlyMinutes: number;
  lastBilledDate?: Date;
  currentMonthMinutes: number;
  eligibleForBilling: boolean;
}

export interface RPMDashboardData {
  patientId: string;
  enrollment: PatientRPMEnrollment;
  latestReadings: Map<DeviceType, DeviceReading>;
  trends: Map<string, TrendData>;
  activeAlerts: RPMAlert[];
  compliance: {
    readingsExpected: number;
    readingsReceived: number;
    complianceRate: number;
    lastReadingAt?: Date;
    missedDays: number;
  };
  summary: {
    overallStatus: 'stable' | 'improving' | 'concerning' | 'critical';
    keyFindings: string[];
    recommendations: string[];
  };
}

// =============================================================================
// DEFAULT THRESHOLDS
// =============================================================================

const DEFAULT_THRESHOLDS: CustomThresholds = {
  // Blood Pressure (mmHg)
  systolicHigh: 140,
  systolicCriticalHigh: 180,
  systolicLow: 90,
  systolicCriticalLow: 80,
  diastolicHigh: 90,
  diastolicCriticalHigh: 120,
  diastolicLow: 60,
  diastolicCriticalLow: 50,
  
  // Heart Rate (bpm)
  heartRateHigh: 100,
  heartRateCriticalHigh: 150,
  heartRateLow: 50,
  heartRateCriticalLow: 40,
  
  // Blood Glucose (mg/dL)
  glucoseHigh: 180,
  glucoseCriticalHigh: 300,
  glucoseLow: 70,
  glucoseCriticalLow: 54,
  glucoseFastingTarget: 130,
  glucosePostMealTarget: 180,
  
  // Oxygen Saturation (%)
  oxygenSatLow: 92,
  oxygenSatCriticalLow: 88,
  
  // Weight
  weightChangeAlertPounds: 3,
  weightChangeAlertPercent: 2,
  
  // Temperature (°F)
  tempHigh: 100.4,
  tempLow: 96.8,
};

// =============================================================================
// REMOTE PATIENT MONITORING SERVICE
// =============================================================================

export class RemoteMonitoringService extends EventEmitter {
  private enrollments: Map<string, PatientRPMEnrollment> = new Map();
  private devices: Map<string, PatientDevice> = new Map();
  private readings: Map<string, DeviceReading[]> = new Map();
  private alerts: Map<string, RPMAlert[]> = new Map();

  constructor() {
    super();
  }

  // =========================================================================
  // ENROLLMENT MANAGEMENT
  // =========================================================================

  async enrollPatient(
    patientId: string,
    providerId: string,
    programType: PatientRPMEnrollment['programType'],
    conditions: string[]
  ): Promise<PatientRPMEnrollment> {
    const enrollment: PatientRPMEnrollment = {
      id: `rpm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      patientId,
      providerId,
      programType,
      conditions,
      devices: [],
      goals: this.generateDefaultGoals(conditions),
      startDate: new Date(),
      status: 'active',
      billingInfo: {
        cptCodes: this.getBillingCodes(programType),
        monthlyMinutes: 0,
        currentMonthMinutes: 0,
        eligibleForBilling: false,
      },
    };

    this.enrollments.set(patientId, enrollment);
    this.emit('patientEnrolled', enrollment);

    return enrollment;
  }

  private generateDefaultGoals(conditions: string[]): RPMGoal[] {
    const goals: RPMGoal[] = [];
    const conditionLower = conditions.map(c => c.toLowerCase());

    if (conditionLower.some(c => c.includes('hypertension') || c.includes('blood pressure'))) {
      goals.push({
        id: 'bp_goal',
        metric: 'Blood Pressure',
        target: '<140/90',
        unit: 'mmHg',
        frequency: 'daily',
      });
    }

    if (conditionLower.some(c => c.includes('diabetes') || c.includes('glucose'))) {
      goals.push({
        id: 'glucose_goal',
        metric: 'Fasting Glucose',
        target: '<130',
        unit: 'mg/dL',
        frequency: 'daily',
      });
      goals.push({
        id: 'a1c_goal',
        metric: 'HbA1c',
        target: '<7%',
        unit: '%',
        frequency: 'quarterly',
      });
    }

    if (conditionLower.some(c => c.includes('heart failure') || c.includes('chf'))) {
      goals.push({
        id: 'weight_goal',
        metric: 'Weight Stability',
        target: '±3 lbs/week',
        unit: 'lbs',
        frequency: 'daily',
      });
    }

    if (conditionLower.some(c => c.includes('copd') || c.includes('respiratory'))) {
      goals.push({
        id: 'spo2_goal',
        metric: 'Oxygen Saturation',
        target: '>92%',
        unit: '%',
        frequency: 'daily',
      });
    }

    return goals;
  }

  private getBillingCodes(programType: PatientRPMEnrollment['programType']): string[] {
    // CPT codes for RPM
    return [
      '99453', // Initial setup and patient education
      '99454', // Device supply with daily recordings
      '99457', // First 20 minutes of clinical staff time
      '99458', // Additional 20 minutes
    ];
  }

  // =========================================================================
  // DEVICE MANAGEMENT
  // =========================================================================

  async registerDevice(
    patientId: string,
    deviceType: DeviceType,
    vendor: DeviceVendor,
    settings?: Partial<DeviceSettings>
  ): Promise<PatientDevice> {
    const device: PatientDevice = {
      id: `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      patientId,
      deviceType,
      vendor,
      isActive: true,
      settings: {
        syncFrequency: 'daily',
        alertsEnabled: true,
        ...settings,
      },
      createdAt: new Date(),
    };

    this.devices.set(device.id, device);

    // Add to enrollment
    const enrollment = this.enrollments.get(patientId);
    if (enrollment) {
      enrollment.devices.push(device);
    }

    this.emit('deviceRegistered', device);
    return device;
  }

  async syncDevice(deviceId: string): Promise<void> {
    const device = this.devices.get(deviceId);
    if (!device) throw new Error('Device not found');

    device.lastSyncAt = new Date();
    this.emit('deviceSynced', device);
  }

  // =========================================================================
  // READING INGESTION
  // =========================================================================

  async ingestReading(
    deviceId: string,
    values: ReadingValues,
    timestamp: Date = new Date(),
    context?: ReadingContext
  ): Promise<DeviceReading> {
    const device = this.devices.get(deviceId);
    if (!device) throw new Error('Device not found');

    const enrollment = this.enrollments.get(device.patientId);
    const thresholds = device.settings.thresholds || DEFAULT_THRESHOLDS;

    // Evaluate reading status and flags
    const { status, flags } = this.evaluateReading(device.deviceType, values, thresholds);

    const reading: DeviceReading = {
      id: `reading_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      deviceId,
      patientId: device.patientId,
      deviceType: device.deviceType,
      timestamp,
      receivedAt: new Date(),
      values,
      status,
      flags,
      context,
      source: 'device',
    };

    // Store reading
    const patientReadings = this.readings.get(device.patientId) || [];
    patientReadings.unshift(reading);
    this.readings.set(device.patientId, patientReadings.slice(0, 1000)); // Keep last 1000

    // Update billing minutes
    if (enrollment) {
      enrollment.billingInfo.currentMonthMinutes += 1; // Simplified
      enrollment.billingInfo.eligibleForBilling = 
        enrollment.billingInfo.currentMonthMinutes >= 20;
    }

    // Generate alerts if needed
    if (flags.length > 0 && device.settings.alertsEnabled) {
      await this.generateAlerts(reading, device, thresholds);
    }

    // Check trends
    await this.analyzeTrends(device.patientId, device.deviceType);

    this.emit('readingReceived', reading);
    return reading;
  }

  async ingestManualReading(
    patientId: string,
    deviceType: DeviceType,
    values: ReadingValues,
    timestamp: Date = new Date(),
    context?: ReadingContext
  ): Promise<DeviceReading> {
    const enrollment = this.enrollments.get(patientId);
    const thresholds = DEFAULT_THRESHOLDS;

    const { status, flags } = this.evaluateReading(deviceType, values, thresholds);

    const reading: DeviceReading = {
      id: `reading_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      deviceId: 'manual',
      patientId,
      deviceType,
      timestamp,
      receivedAt: new Date(),
      values,
      status,
      flags,
      context,
      source: 'manual',
    };

    const patientReadings = this.readings.get(patientId) || [];
    patientReadings.unshift(reading);
    this.readings.set(patientId, patientReadings.slice(0, 1000));

    this.emit('readingReceived', reading);
    return reading;
  }

  // =========================================================================
  // READING EVALUATION
  // =========================================================================

  private evaluateReading(
    deviceType: DeviceType,
    values: ReadingValues,
    thresholds: CustomThresholds
  ): { status: ReadingStatus; flags: ReadingFlag[] } {
    const flags: ReadingFlag[] = [];
    let status: ReadingStatus = 'normal';

    switch (deviceType) {
      case 'blood_pressure':
        if (values.systolic && values.diastolic) {
          // Critical checks first
          if (values.systolic >= (thresholds.systolicCriticalHigh || 180)) {
            status = 'critical_high';
            flags.push({
              type: 'threshold_exceeded',
              severity: 'critical',
              message: `Critical high systolic BP: ${values.systolic} mmHg`,
              threshold: `≥${thresholds.systolicCriticalHigh} mmHg`,
            });
          } else if (values.systolic <= (thresholds.systolicCriticalLow || 80)) {
            status = 'critical_low';
            flags.push({
              type: 'threshold_exceeded',
              severity: 'critical',
              message: `Critical low systolic BP: ${values.systolic} mmHg`,
              threshold: `≤${thresholds.systolicCriticalLow} mmHg`,
            });
          } else if (values.systolic >= (thresholds.systolicHigh || 140)) {
            status = 'elevated';
            flags.push({
              type: 'threshold_exceeded',
              severity: 'warning',
              message: `Elevated systolic BP: ${values.systolic} mmHg`,
              threshold: `≥${thresholds.systolicHigh} mmHg`,
            });
          } else if (values.systolic <= (thresholds.systolicLow || 90)) {
            status = 'low';
            flags.push({
              type: 'threshold_exceeded',
              severity: 'warning',
              message: `Low systolic BP: ${values.systolic} mmHg`,
              threshold: `≤${thresholds.systolicLow} mmHg`,
            });
          }

          // Diastolic checks
          if (values.diastolic >= (thresholds.diastolicCriticalHigh || 120)) {
            status = 'critical_high';
            flags.push({
              type: 'threshold_exceeded',
              severity: 'critical',
              message: `Critical high diastolic BP: ${values.diastolic} mmHg`,
              threshold: `≥${thresholds.diastolicCriticalHigh} mmHg`,
            });
          } else if (values.diastolic >= (thresholds.diastolicHigh || 90)) {
            if (status === 'normal') status = 'elevated';
            flags.push({
              type: 'threshold_exceeded',
              severity: 'warning',
              message: `Elevated diastolic BP: ${values.diastolic} mmHg`,
              threshold: `≥${thresholds.diastolicHigh} mmHg`,
            });
          }
        }
        break;

      case 'glucose_meter':
      case 'cgm':
        if (values.glucose) {
          if (values.glucose >= (thresholds.glucoseCriticalHigh || 300)) {
            status = 'critical_high';
            flags.push({
              type: 'threshold_exceeded',
              severity: 'critical',
              message: `Critical high glucose: ${values.glucose} mg/dL`,
              threshold: `≥${thresholds.glucoseCriticalHigh} mg/dL`,
            });
          } else if (values.glucose <= (thresholds.glucoseCriticalLow || 54)) {
            status = 'critical_low';
            flags.push({
              type: 'threshold_exceeded',
              severity: 'critical',
              message: `Critical low glucose (hypoglycemia): ${values.glucose} mg/dL`,
              threshold: `≤${thresholds.glucoseCriticalLow} mg/dL`,
            });
          } else if (values.glucose >= (thresholds.glucoseHigh || 180)) {
            status = 'elevated';
            flags.push({
              type: 'threshold_exceeded',
              severity: 'warning',
              message: `Elevated glucose: ${values.glucose} mg/dL`,
              threshold: `≥${thresholds.glucoseHigh} mg/dL`,
            });
          } else if (values.glucose <= (thresholds.glucoseLow || 70)) {
            status = 'low';
            flags.push({
              type: 'threshold_exceeded',
              severity: 'warning',
              message: `Low glucose: ${values.glucose} mg/dL`,
              threshold: `≤${thresholds.glucoseLow} mg/dL`,
            });
          }
        }
        break;

      case 'pulse_oximeter':
        if (values.oxygenSaturation) {
          if (values.oxygenSaturation <= (thresholds.oxygenSatCriticalLow || 88)) {
            status = 'critical_low';
            flags.push({
              type: 'threshold_exceeded',
              severity: 'critical',
              message: `Critical low oxygen saturation: ${values.oxygenSaturation}%`,
              threshold: `≤${thresholds.oxygenSatCriticalLow}%`,
            });
          } else if (values.oxygenSaturation <= (thresholds.oxygenSatLow || 92)) {
            status = 'low';
            flags.push({
              type: 'threshold_exceeded',
              severity: 'warning',
              message: `Low oxygen saturation: ${values.oxygenSaturation}%`,
              threshold: `≤${thresholds.oxygenSatLow}%`,
            });
          }
        }
        break;

      case 'weight_scale':
        // Weight change detection is done in trend analysis
        break;

      case 'thermometer':
        if (values.temperature) {
          const tempF = values.temperatureUnit === 'C' 
            ? (values.temperature * 9/5) + 32 
            : values.temperature;
          
          if (tempF >= (thresholds.tempHigh || 100.4)) {
            status = 'elevated';
            flags.push({
              type: 'threshold_exceeded',
              severity: 'warning',
              message: `Fever detected: ${tempF}°F`,
              threshold: `≥${thresholds.tempHigh}°F`,
            });
          } else if (tempF <= (thresholds.tempLow || 96.8)) {
            status = 'low';
            flags.push({
              type: 'threshold_exceeded',
              severity: 'warning',
              message: `Low temperature: ${tempF}°F`,
              threshold: `≤${thresholds.tempLow}°F`,
            });
          }
        }
        break;
    }

    // Heart rate checks (applies to multiple device types)
    if (values.heartRate) {
      if (values.heartRate >= (thresholds.heartRateCriticalHigh || 150)) {
        if (status === 'normal') status = 'critical_high';
        flags.push({
          type: 'threshold_exceeded',
          severity: 'critical',
          message: `Critical high heart rate: ${values.heartRate} bpm`,
          threshold: `≥${thresholds.heartRateCriticalHigh} bpm`,
        });
      } else if (values.heartRate <= (thresholds.heartRateCriticalLow || 40)) {
        if (status === 'normal') status = 'critical_low';
        flags.push({
          type: 'threshold_exceeded',
          severity: 'critical',
          message: `Critical low heart rate: ${values.heartRate} bpm`,
          threshold: `≤${thresholds.heartRateCriticalLow} bpm`,
        });
      } else if (values.heartRate >= (thresholds.heartRateHigh || 100)) {
        if (status === 'normal') status = 'elevated';
        flags.push({
          type: 'threshold_exceeded',
          severity: 'warning',
          message: `Elevated heart rate: ${values.heartRate} bpm`,
          threshold: `≥${thresholds.heartRateHigh} bpm`,
        });
      } else if (values.heartRate <= (thresholds.heartRateLow || 50)) {
        if (status === 'normal') status = 'low';
        flags.push({
          type: 'threshold_exceeded',
          severity: 'warning',
          message: `Low heart rate: ${values.heartRate} bpm`,
          threshold: `≤${thresholds.heartRateLow} bpm`,
        });
      }
    }

    return { status, flags };
  }

  // =========================================================================
  // ALERT GENERATION
  // =========================================================================

  private async generateAlerts(
    reading: DeviceReading,
    device: PatientDevice,
    thresholds: CustomThresholds
  ): Promise<void> {
    for (const flag of reading.flags) {
      const alert: RPMAlert = {
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        patientId: reading.patientId,
        deviceId: device.id,
        readingId: reading.id,
        type: flag.severity === 'critical' ? 'critical_value' : 'threshold_exceeded',
        severity: flag.severity,
        title: this.getAlertTitle(device.deviceType, flag.severity),
        message: flag.message,
        values: reading.values,
        thresholds,
        recommendedActions: this.getRecommendedActions(device.deviceType, flag.severity, reading.values),
        createdAt: new Date(),
      };

      const patientAlerts = this.alerts.get(reading.patientId) || [];
      patientAlerts.unshift(alert);
      this.alerts.set(reading.patientId, patientAlerts);

      this.emit('alertGenerated', alert);
    }
  }

  private getAlertTitle(deviceType: DeviceType, severity: AlertSeverity): string {
    const deviceNames: Record<DeviceType, string> = {
      blood_pressure: 'Blood Pressure',
      glucose_meter: 'Blood Glucose',
      pulse_oximeter: 'Oxygen Saturation',
      weight_scale: 'Weight',
      thermometer: 'Temperature',
      ecg: 'ECG',
      spirometer: 'Spirometry',
      activity_tracker: 'Activity',
      cgm: 'Glucose (CGM)',
      smart_watch: 'Smart Watch',
    };

    const severityPrefix = severity === 'critical' ? '🚨 CRITICAL: ' : '⚠️ ';
    return `${severityPrefix}${deviceNames[deviceType]} Alert`;
  }

  private getRecommendedActions(
    deviceType: DeviceType,
    severity: AlertSeverity,
    values: ReadingValues
  ): string[] {
    const actions: string[] = [];

    if (severity === 'critical') {
      actions.push('Contact patient immediately');
      actions.push('Consider urgent evaluation');
    }

    switch (deviceType) {
      case 'blood_pressure':
        if (values.systolic && values.systolic >= 180) {
          actions.push('Rule out hypertensive emergency');
          actions.push('Review current antihypertensive regimen');
          actions.push('Consider ER referral if symptomatic');
        } else if (values.systolic && values.systolic <= 90) {
          actions.push('Assess for orthostatic symptoms');
          actions.push('Review medications that may cause hypotension');
        } else {
          actions.push('Recheck in 30 minutes');
          actions.push('Ensure proper cuff size and technique');
        }
        break;

      case 'glucose_meter':
      case 'cgm':
        if (values.glucose && values.glucose <= 70) {
          actions.push('Advise patient to consume 15g fast-acting carbohydrate');
          actions.push('Recheck glucose in 15 minutes');
          actions.push('Review hypoglycemia risk factors');
        } else if (values.glucose && values.glucose >= 300) {
          actions.push('Check for symptoms of DKA/HHS');
          actions.push('Ensure adequate hydration');
          actions.push('Review medication adherence');
        }
        break;

      case 'pulse_oximeter':
        if (values.oxygenSaturation && values.oxygenSaturation <= 88) {
          actions.push('Assess respiratory status');
          actions.push('Consider supplemental oxygen');
          actions.push('May require emergency evaluation');
        } else {
          actions.push('Ensure proper probe placement');
          actions.push('Recheck reading');
        }
        break;

      case 'weight_scale':
        actions.push('Review fluid intake');
        actions.push('Assess for edema');
        actions.push('Review diuretic compliance');
        break;
    }

    return actions;
  }

  // =========================================================================
  // TREND ANALYSIS
  // =========================================================================

  private async analyzeTrends(patientId: string, deviceType: DeviceType): Promise<TrendData | null> {
    const readings = this.readings.get(patientId) || [];
    const deviceReadings = readings
      .filter(r => r.deviceType === deviceType)
      .slice(0, 14); // Last 14 readings

    if (deviceReadings.length < 3) return null;

    let values: number[] = [];
    
    switch (deviceType) {
      case 'blood_pressure':
        values = deviceReadings.map(r => r.values.systolic || 0).filter(v => v > 0);
        break;
      case 'glucose_meter':
      case 'cgm':
        values = deviceReadings.map(r => r.values.glucose || 0).filter(v => v > 0);
        break;
      case 'pulse_oximeter':
        values = deviceReadings.map(r => r.values.oxygenSaturation || 0).filter(v => v > 0);
        break;
      case 'weight_scale':
        values = deviceReadings.map(r => r.values.weight || 0).filter(v => v > 0);
        break;
    }

    if (values.length < 3) return null;

    // Simple trend calculation
    const first = values.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const last = values.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
    const changePercent = ((last - first) / first) * 100;

    let direction: TrendData['direction'];
    if (Math.abs(changePercent) < 2) {
      direction = 'stable';
    } else if (changePercent > 0) {
      direction = 'increasing';
    } else {
      direction = 'decreasing';
    }

    // Check for volatile readings
    const stdDev = this.calculateStdDev(values);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    if (stdDev / mean > 0.2) {
      direction = 'volatile';
    }

    const trend: TrendData = {
      direction,
      changePercent: Math.round(changePercent * 10) / 10,
      period: `${deviceReadings.length} readings`,
      dataPoints: values.length,
    };

    // Generate trend alert if concerning
    if (deviceType === 'weight_scale' && direction === 'increasing' && changePercent > 2) {
      const alert: RPMAlert = {
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        patientId,
        type: 'weight_gain',
        severity: changePercent > 5 ? 'urgent' : 'warning',
        title: '⚠️ Weight Gain Trend Detected',
        message: `Patient's weight has increased ${changePercent.toFixed(1)}% over recent readings. May indicate fluid retention.`,
        values: { changePercent },
        trend,
        recommendedActions: [
          'Review for signs of fluid overload',
          'Consider diuretic adjustment',
          'Assess dietary sodium intake',
        ],
        createdAt: new Date(),
      };

      const patientAlerts = this.alerts.get(patientId) || [];
      patientAlerts.unshift(alert);
      this.alerts.set(patientId, patientAlerts);
      this.emit('alertGenerated', alert);
    }

    return trend;
  }

  private calculateStdDev(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squareDiffs = values.map(v => Math.pow(v - mean, 2));
    return Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / values.length);
  }

  // =========================================================================
  // DASHBOARD & REPORTING
  // =========================================================================

  async getPatientDashboard(patientId: string): Promise<RPMDashboardData | null> {
    const enrollment = this.enrollments.get(patientId);
    if (!enrollment) return null;

    const readings = this.readings.get(patientId) || [];
    const alerts = this.alerts.get(patientId) || [];

    // Get latest reading per device type
    const latestReadings = new Map<DeviceType, DeviceReading>();
    for (const reading of readings) {
      if (!latestReadings.has(reading.deviceType)) {
        latestReadings.set(reading.deviceType, reading);
      }
    }

    // Calculate trends
    const trends = new Map<string, TrendData>();
    for (const [deviceType] of latestReadings) {
      const trend = await this.analyzeTrends(patientId, deviceType);
      if (trend) {
        trends.set(deviceType, trend);
      }
    }

    // Calculate compliance
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentReadings = readings.filter(r => r.timestamp >= thirtyDaysAgo);
    const expectedReadings = enrollment.devices.length * 30; // 1 reading per device per day
    
    // Count days without readings
    const readingDates = new Set(recentReadings.map(r => 
      r.timestamp.toISOString().split('T')[0]
    ));
    const missedDays = 30 - readingDates.size;

    // Generate summary
    const activeAlerts = alerts.filter(a => !a.resolvedAt);
    const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical');

    let overallStatus: RPMDashboardData['summary']['overallStatus'] = 'stable';
    if (criticalAlerts.length > 0) {
      overallStatus = 'critical';
    } else if (activeAlerts.length > 2) {
      overallStatus = 'concerning';
    } else {
      // Check trends
      const concerningTrends = Array.from(trends.values()).filter(
        t => t.direction === 'increasing' && t.changePercent > 10
      );
      if (concerningTrends.length > 0) {
        overallStatus = 'concerning';
      }
    }

    const keyFindings = this.generateKeyFindings(latestReadings, trends, activeAlerts);
    const recommendations = this.generateRecommendations(latestReadings, trends, enrollment);

    return {
      patientId,
      enrollment,
      latestReadings,
      trends,
      activeAlerts,
      compliance: {
        readingsExpected: expectedReadings,
        readingsReceived: recentReadings.length,
        complianceRate: Math.round((recentReadings.length / expectedReadings) * 100),
        lastReadingAt: readings[0]?.timestamp,
        missedDays,
      },
      summary: {
        overallStatus,
        keyFindings,
        recommendations,
      },
    };
  }

  private generateKeyFindings(
    readings: Map<DeviceType, DeviceReading>,
    trends: Map<string, TrendData>,
    alerts: RPMAlert[]
  ): string[] {
    const findings: string[] = [];

    // Add findings from latest readings
    readings.forEach((reading, deviceType) => {
      if (reading.status !== 'normal') {
        findings.push(`${deviceType}: ${reading.status} reading detected`);
      }
    });

    // Add findings from trends
    trends.forEach((trend, deviceType) => {
      if (trend.direction !== 'stable') {
        findings.push(`${deviceType}: ${trend.direction} trend (${trend.changePercent}% change)`);
      }
    });

    // Add active alert count
    if (alerts.length > 0) {
      findings.push(`${alerts.length} active alert(s) requiring attention`);
    }

    return findings.slice(0, 5);
  }

  private generateRecommendations(
    readings: Map<DeviceType, DeviceReading>,
    trends: Map<string, TrendData>,
    enrollment: PatientRPMEnrollment
  ): string[] {
    const recommendations: string[] = [];

    // Check goal progress
    for (const goal of enrollment.goals) {
      recommendations.push(`Continue monitoring ${goal.metric} toward goal of ${goal.target}`);
    }

    // Add trend-based recommendations
    trends.forEach((trend, deviceType) => {
      if (trend.direction === 'increasing' && deviceType === 'blood_pressure') {
        recommendations.push('Consider antihypertensive medication adjustment');
      }
      if (trend.direction === 'increasing' && deviceType === 'weight_scale') {
        recommendations.push('Assess for fluid retention, review diuretic therapy');
      }
    });

    return recommendations.slice(0, 5);
  }

  // =========================================================================
  // BILLING SUPPORT
  // =========================================================================

  async getBillingReport(patientId: string, month: Date): Promise<{
    eligible: boolean;
    cptCodes: Array<{ code: string; description: string; billable: boolean }>;
    totalMinutes: number;
    readingDays: number;
    summary: string;
  }> {
    const enrollment = this.enrollments.get(patientId);
    if (!enrollment) {
      return {
        eligible: false,
        cptCodes: [],
        totalMinutes: 0,
        readingDays: 0,
        summary: 'Patient not enrolled in RPM',
      };
    }

    const readings = this.readings.get(patientId) || [];
    const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
    const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);

    const monthReadings = readings.filter(r => 
      r.timestamp >= monthStart && r.timestamp <= monthEnd
    );

    const readingDays = new Set(monthReadings.map(r => 
      r.timestamp.toISOString().split('T')[0]
    )).size;

    const cptCodes = [
      { 
        code: '99454', 
        description: 'Device supply with daily recordings (16+ days)', 
        billable: readingDays >= 16 
      },
      { 
        code: '99457', 
        description: 'First 20 minutes clinical staff time', 
        billable: enrollment.billingInfo.currentMonthMinutes >= 20 
      },
      { 
        code: '99458', 
        description: 'Each additional 20 minutes', 
        billable: enrollment.billingInfo.currentMonthMinutes >= 40 
      },
    ];

    return {
      eligible: cptCodes.some(c => c.billable),
      cptCodes,
      totalMinutes: enrollment.billingInfo.currentMonthMinutes,
      readingDays,
      summary: readingDays >= 16 
        ? `Patient meets billing requirements with ${readingDays} reading days`
        : `Need ${16 - readingDays} more reading days to meet billing threshold`,
    };
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const remoteMonitoringService = new RemoteMonitoringService();
