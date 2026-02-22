// =============================================================================
// ATTENDING AI - Wearables Integration Service
// apps/shared/services/wearables/WearablesService.ts
//
// Comprehensive wearables and IoT device integration including:
// - Multi-device data aggregation
// - Continuous vitals monitoring
// - Activity and sleep tracking
// - Anomaly detection and alerts
// - Trend analysis and insights
// =============================================================================

import { EventEmitter } from 'events';

// =============================================================================
// Types
// =============================================================================

export interface WearableDevice {
  id: string;
  patientId: string;
  deviceType: DeviceType;
  manufacturer: string;
  model: string;
  serialNumber?: string;
  firmwareVersion?: string;
  connectionStatus: 'connected' | 'disconnected' | 'pairing' | 'error';
  lastSyncTime?: Date;
  batteryLevel?: number;
  dataTypes: DataType[];
  permissions: DataPermission[];
  settings: DeviceSettings;
  registeredDate: Date;
}

export type DeviceType =
  | 'smartwatch'
  | 'fitness-tracker'
  | 'continuous-glucose-monitor'
  | 'blood-pressure-monitor'
  | 'pulse-oximeter'
  | 'weight-scale'
  | 'sleep-tracker'
  | 'ecg-monitor'
  | 'thermometer'
  | 'activity-tracker'
  | 'fall-detector'
  | 'medication-dispenser'
  | 'other';

export type DataType =
  | 'heart-rate'
  | 'heart-rate-variability'
  | 'blood-pressure'
  | 'blood-oxygen'
  | 'blood-glucose'
  | 'temperature'
  | 'weight'
  | 'steps'
  | 'distance'
  | 'calories'
  | 'active-minutes'
  | 'sleep'
  | 'ecg'
  | 'respiratory-rate'
  | 'fall-detection'
  | 'stress-level'
  | 'menstrual-cycle'
  | 'medication-adherence';

export interface DataPermission {
  dataType: DataType;
  shareWithProvider: boolean;
  includeInAlerts: boolean;
  retentionDays: number;
}

export interface DeviceSettings {
  syncFrequency: 'realtime' | 'hourly' | 'daily' | 'manual';
  alertsEnabled: boolean;
  quietHours?: { start: string; end: string };
}

// =============================================================================
// Health Data Types
// =============================================================================

export interface HealthDataPoint {
  id: string;
  patientId: string;
  deviceId: string;
  dataType: DataType;
  timestamp: Date;
  value: number;
  unit: string;
  context?: DataContext;
  quality: 'high' | 'medium' | 'low' | 'unknown';
  source: string;
}

export interface DataContext {
  activity?: 'resting' | 'active' | 'sleeping' | 'exercising';
  position?: 'sitting' | 'standing' | 'lying' | 'moving';
  notes?: string;
}

export interface VitalsSnapshot {
  patientId: string;
  timestamp: Date;
  heartRate?: { value: number; unit: string; trend: string };
  bloodPressure?: { systolic: number; diastolic: number; unit: string };
  bloodOxygen?: { value: number; unit: string };
  bloodGlucose?: { value: number; unit: string; mealContext?: string };
  temperature?: { value: number; unit: string };
  weight?: { value: number; unit: string };
  respiratoryRate?: { value: number; unit: string };
}

export interface SleepData {
  id: string;
  patientId: string;
  date: Date;
  sleepStart: Date;
  sleepEnd: Date;
  totalSleepMinutes: number;
  sleepEfficiency: number;
  stages: SleepStage[];
  interruptions: number;
  sleepScore?: number;
  heartRateDuringSleep?: { min: number; max: number; avg: number };
  oxygenDuringSleep?: { min: number; avg: number };
}

export interface SleepStage {
  stage: 'awake' | 'light' | 'deep' | 'rem';
  startTime: Date;
  durationMinutes: number;
}

export interface ActivityData {
  id: string;
  patientId: string;
  date: Date;
  steps: number;
  distance: number;
  distanceUnit: string;
  caloriesBurned: number;
  activeMinutes: number;
  sedentaryMinutes: number;
  floorsClimbed?: number;
  exercises: ExerciseSession[];
  hourlyBreakdown: HourlyActivity[];
  goalAchievement: {
    stepsGoal: number;
    stepsAchieved: boolean;
    activeMinutesGoal: number;
    activeMinutesAchieved: boolean;
  };
}

export interface ExerciseSession {
  type: string;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  caloriesBurned?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  distance?: number;
  pace?: number;
}

export interface HourlyActivity {
  hour: number;
  steps: number;
  activeMinutes: number;
  calories: number;
}

// =============================================================================
// Anomaly Detection Types
// =============================================================================

export interface AnomalyAlert {
  id: string;
  patientId: string;
  deviceId: string;
  dataType: DataType;
  alertType: AlertType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  value: number;
  expectedRange: { min: number; max: number };
  threshold?: number;
  description: string;
  recommendations: string[];
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  escalated: boolean;
  escalatedTo?: string;
  resolution?: string;
}

export type AlertType =
  | 'high-value'
  | 'low-value'
  | 'rapid-change'
  | 'trend-deviation'
  | 'missing-data'
  | 'device-issue'
  | 'fall-detected'
  | 'irregular-rhythm';

export interface AlertThreshold {
  dataType: DataType;
  condition: string;
  lowThreshold?: number;
  highThreshold?: number;
  criticalLow?: number;
  criticalHigh?: number;
  changeThreshold?: number;
  changeTimeMinutes?: number;
  enabled: boolean;
  priority: 'low' | 'medium' | 'high';
}

// =============================================================================
// Trend Analysis Types
// =============================================================================

export interface TrendAnalysis {
  patientId: string;
  dataType: DataType;
  periodDays: number;
  startDate: Date;
  endDate: Date;
  statistics: DataStatistics;
  trend: TrendDirection;
  trendMagnitude: number;
  anomalyCount: number;
  insights: string[];
  recommendations: string[];
  comparisonToPrior?: PeriodComparison;
}

export interface DataStatistics {
  count: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  standardDeviation: number;
  percentile25: number;
  percentile75: number;
}

export type TrendDirection = 'increasing' | 'stable' | 'decreasing' | 'variable' | 'insufficient-data';

export interface PeriodComparison {
  priorPeriod: { start: Date; end: Date };
  priorMean: number;
  currentMean: number;
  percentChange: number;
  significantChange: boolean;
}

// =============================================================================
// CGM Specific Types
// =============================================================================

export interface CGMData {
  patientId: string;
  periodStart: Date;
  periodEnd: Date;
  readings: GlucoseReading[];
  statistics: CGMStatistics;
  timeInRange: TimeInRange;
  glucoseManagementIndicator?: number;
  coefficientOfVariation?: number;
  patterns: GlucosePattern[];
}

export interface GlucoseReading {
  timestamp: Date;
  value: number;
  unit: string;
  trend?: 'rising-rapidly' | 'rising' | 'stable' | 'falling' | 'falling-rapidly';
  source: string;
}

export interface CGMStatistics {
  avgGlucose: number;
  stdDev: number;
  min: number;
  max: number;
  estimatedA1c: number;
}

export interface TimeInRange {
  veryLow: number;    // <54 mg/dL
  low: number;        // 54-69 mg/dL
  inRange: number;    // 70-180 mg/dL
  high: number;       // 181-250 mg/dL
  veryHigh: number;   // >250 mg/dL
  targetInRange: number;
}

export interface GlucosePattern {
  type: 'dawn-phenomenon' | 'post-meal-spike' | 'nocturnal-hypoglycemia' | 'exercise-response' | 'other';
  frequency: 'daily' | 'frequent' | 'occasional';
  timeOfDay?: string;
  description: string;
  recommendation: string;
}

// =============================================================================
// Default Thresholds
// =============================================================================

const DEFAULT_THRESHOLDS: AlertThreshold[] = [
  {
    dataType: 'heart-rate',
    condition: 'resting',
    lowThreshold: 50,
    highThreshold: 100,
    criticalLow: 40,
    criticalHigh: 150,
    enabled: true,
    priority: 'high',
  },
  {
    dataType: 'blood-oxygen',
    condition: 'any',
    lowThreshold: 92,
    criticalLow: 88,
    enabled: true,
    priority: 'high',
  },
  {
    dataType: 'blood-glucose',
    condition: 'any',
    lowThreshold: 70,
    highThreshold: 180,
    criticalLow: 54,
    criticalHigh: 250,
    enabled: true,
    priority: 'high',
  },
  {
    dataType: 'blood-pressure',
    condition: 'systolic',
    lowThreshold: 90,
    highThreshold: 140,
    criticalLow: 80,
    criticalHigh: 180,
    enabled: true,
    priority: 'high',
  },
  {
    dataType: 'temperature',
    condition: 'any',
    lowThreshold: 96.8,
    highThreshold: 100.4,
    criticalHigh: 103,
    enabled: true,
    priority: 'medium',
  },
  {
    dataType: 'respiratory-rate',
    condition: 'resting',
    lowThreshold: 12,
    highThreshold: 20,
    criticalLow: 8,
    criticalHigh: 30,
    enabled: true,
    priority: 'high',
  },
];

// =============================================================================
// Wearables Service Class
// =============================================================================

export class WearablesService extends EventEmitter {
  private devices: Map<string, WearableDevice[]> = new Map(); // patientId -> devices
  private healthData: Map<string, HealthDataPoint[]> = new Map();
  private sleepData: Map<string, SleepData[]> = new Map();
  private activityData: Map<string, ActivityData[]> = new Map();
  private alerts: Map<string, AnomalyAlert[]> = new Map();
  private thresholds: Map<string, AlertThreshold[]> = new Map(); // patientId -> thresholds

  constructor() {
    super();
  }

  // ===========================================================================
  // Device Management
  // ===========================================================================

  registerDevice(
    device: Omit<WearableDevice, 'id' | 'registeredDate' | 'connectionStatus'>
  ): WearableDevice {
    const id = `dev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const fullDevice: WearableDevice = {
      ...device,
      id,
      registeredDate: new Date(),
      connectionStatus: 'pairing',
    };

    const patientDevices = this.devices.get(device.patientId) || [];
    patientDevices.push(fullDevice);
    this.devices.set(device.patientId, patientDevices);

    // Initialize default thresholds if not set
    if (!this.thresholds.has(device.patientId)) {
      this.thresholds.set(device.patientId, [...DEFAULT_THRESHOLDS]);
    }

    this.emit('deviceRegistered', fullDevice);

    return fullDevice;
  }

  getDevices(patientId: string): WearableDevice[] {
    return this.devices.get(patientId) || [];
  }

  updateDeviceStatus(
    patientId: string,
    deviceId: string,
    status: WearableDevice['connectionStatus'],
    batteryLevel?: number
  ): void {
    const devices = this.devices.get(patientId) || [];
    const device = devices.find(d => d.id === deviceId);

    if (device) {
      device.connectionStatus = status;
      if (batteryLevel !== undefined) {
        device.batteryLevel = batteryLevel;
      }
      device.lastSyncTime = new Date();

      this.emit('deviceStatusUpdated', device);

      if (batteryLevel !== undefined && batteryLevel < 20) {
        this.emit('lowBatteryWarning', device);
      }
    }
  }

  // ===========================================================================
  // Data Ingestion
  // ===========================================================================

  ingestHealthData(data: Omit<HealthDataPoint, 'id'>): HealthDataPoint {
    const id = `data_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const fullData: HealthDataPoint = {
      ...data,
      id,
    };

    const patientData = this.healthData.get(data.patientId) || [];
    patientData.push(fullData);
    this.healthData.set(data.patientId, patientData);

    // Check for anomalies
    this.checkForAnomalies(fullData);

    this.emit('healthDataReceived', fullData);

    return fullData;
  }

  ingestBatchData(dataPoints: Omit<HealthDataPoint, 'id'>[]): HealthDataPoint[] {
    return dataPoints.map(point => this.ingestHealthData(point));
  }

  ingestSleepData(data: Omit<SleepData, 'id'>): SleepData {
    const id = `sleep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const fullData: SleepData = {
      ...data,
      id,
    };

    const patientSleep = this.sleepData.get(data.patientId) || [];
    patientSleep.push(fullData);
    this.sleepData.set(data.patientId, patientSleep);

    // Check for sleep issues
    if (fullData.totalSleepMinutes < 360) { // Less than 6 hours
      this.emit('sleepAlert', {
        patientId: data.patientId,
        issue: 'insufficient-sleep',
        data: fullData,
      });
    }

    this.emit('sleepDataReceived', fullData);

    return fullData;
  }

  ingestActivityData(data: Omit<ActivityData, 'id'>): ActivityData {
    const id = `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const fullData: ActivityData = {
      ...data,
      id,
    };

    const patientActivity = this.activityData.get(data.patientId) || [];
    patientActivity.push(fullData);
    this.activityData.set(data.patientId, patientActivity);

    this.emit('activityDataReceived', fullData);

    return fullData;
  }

  // ===========================================================================
  // Anomaly Detection
  // ===========================================================================

  private checkForAnomalies(data: HealthDataPoint): void {
    const thresholds = this.thresholds.get(data.patientId) || DEFAULT_THRESHOLDS;
    const threshold = thresholds.find(t => t.dataType === data.dataType && t.enabled);

    if (!threshold) return;

    let alertType: AlertType | null = null;
    let severity: AnomalyAlert['severity'] = 'low';
    let description = '';

    // Check critical thresholds first
    if (threshold.criticalLow !== undefined && data.value < threshold.criticalLow) {
      alertType = 'low-value';
      severity = 'critical';
      description = `${data.dataType} critically low: ${data.value} (threshold: ${threshold.criticalLow})`;
    } else if (threshold.criticalHigh !== undefined && data.value > threshold.criticalHigh) {
      alertType = 'high-value';
      severity = 'critical';
      description = `${data.dataType} critically high: ${data.value} (threshold: ${threshold.criticalHigh})`;
    } else if (threshold.lowThreshold !== undefined && data.value < threshold.lowThreshold) {
      alertType = 'low-value';
      severity = threshold.priority === 'high' ? 'medium' : 'low';
      description = `${data.dataType} below normal: ${data.value} (threshold: ${threshold.lowThreshold})`;
    } else if (threshold.highThreshold !== undefined && data.value > threshold.highThreshold) {
      alertType = 'high-value';
      severity = threshold.priority === 'high' ? 'medium' : 'low';
      description = `${data.dataType} above normal: ${data.value} (threshold: ${threshold.highThreshold})`;
    }

    if (alertType) {
      this.createAlert({
        patientId: data.patientId,
        deviceId: data.deviceId,
        dataType: data.dataType,
        alertType,
        severity,
        timestamp: data.timestamp,
        value: data.value,
        expectedRange: {
          min: threshold.lowThreshold || threshold.criticalLow || 0,
          max: threshold.highThreshold || threshold.criticalHigh || 999,
        },
        description,
        recommendations: this.getRecommendations(data.dataType, alertType, severity),
      });
    }
  }

  private createAlert(
    alert: Omit<AnomalyAlert, 'id' | 'acknowledged' | 'escalated'>
  ): AnomalyAlert {
    const id = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const fullAlert: AnomalyAlert = {
      ...alert,
      id,
      acknowledged: false,
      escalated: false,
    };

    const patientAlerts = this.alerts.get(alert.patientId) || [];
    patientAlerts.push(fullAlert);
    this.alerts.set(alert.patientId, patientAlerts);

    this.emit('anomalyDetected', fullAlert);

    if (fullAlert.severity === 'critical') {
      this.emit('criticalAlert', fullAlert);
    }

    return fullAlert;
  }

  private getRecommendations(
    dataType: DataType,
    alertType: AlertType,
    severity: AnomalyAlert['severity']
  ): string[] {
    const recommendations: string[] = [];

    if (severity === 'critical') {
      recommendations.push('Seek immediate medical attention');
      recommendations.push('Contact your healthcare provider urgently');
    }

    switch (dataType) {
      case 'heart-rate':
        if (alertType === 'high-value') {
          recommendations.push('Rest and relax');
          recommendations.push('Avoid caffeine and stimulants');
          recommendations.push('Practice deep breathing');
        } else if (alertType === 'low-value') {
          recommendations.push('Monitor for dizziness or fainting');
          recommendations.push('Sit or lie down if feeling unwell');
        }
        break;

      case 'blood-oxygen':
        if (alertType === 'low-value') {
          recommendations.push('Sit upright to improve breathing');
          recommendations.push('Take slow, deep breaths');
          recommendations.push('Use prescribed oxygen if available');
        }
        break;

      case 'blood-glucose':
        if (alertType === 'low-value') {
          recommendations.push('Consume 15g fast-acting carbohydrates');
          recommendations.push('Recheck glucose in 15 minutes');
          recommendations.push('Do not drive or operate machinery');
        } else if (alertType === 'high-value') {
          recommendations.push('Take prescribed correction dose if applicable');
          recommendations.push('Drink water');
          recommendations.push('Avoid additional carbohydrates');
        }
        break;

      case 'blood-pressure':
        if (alertType === 'high-value') {
          recommendations.push('Rest for 5 minutes and recheck');
          recommendations.push('Take prescribed medication if due');
          recommendations.push('Avoid salt and caffeine');
        }
        break;
    }

    return recommendations;
  }

  acknowledgeAlert(alertId: string, patientId: string, acknowledgedBy: string): void {
    const alerts = this.alerts.get(patientId) || [];
    const alert = alerts.find(a => a.id === alertId);

    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedBy = acknowledgedBy;
      alert.acknowledgedAt = new Date();

      this.emit('alertAcknowledged', alert);
    }
  }

  getActiveAlerts(patientId: string): AnomalyAlert[] {
    const alerts = this.alerts.get(patientId) || [];
    return alerts
      .filter(a => !a.acknowledged)
      .sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      });
  }

  // ===========================================================================
  // Data Retrieval
  // ===========================================================================

  getLatestVitals(patientId: string): VitalsSnapshot {
    const data = this.healthData.get(patientId) || [];
    const snapshot: VitalsSnapshot = {
      patientId,
      timestamp: new Date(),
    };

    const getLatest = (type: DataType) =>
      data
        .filter(d => d.dataType === type)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

    const heartRate = getLatest('heart-rate');
    if (heartRate) {
      snapshot.heartRate = { value: heartRate.value, unit: 'bpm', trend: 'stable' };
    }

    const oxygen = getLatest('blood-oxygen');
    if (oxygen) {
      snapshot.bloodOxygen = { value: oxygen.value, unit: '%' };
    }

    const glucose = getLatest('blood-glucose');
    if (glucose) {
      snapshot.bloodGlucose = { value: glucose.value, unit: 'mg/dL' };
    }

    const temp = getLatest('temperature');
    if (temp) {
      snapshot.temperature = { value: temp.value, unit: '°F' };
    }

    const weight = getLatest('weight');
    if (weight) {
      snapshot.weight = { value: weight.value, unit: 'lbs' };
    }

    return snapshot;
  }

  getHealthData(
    patientId: string,
    dataType: DataType,
    startDate: Date,
    endDate: Date
  ): HealthDataPoint[] {
    const data = this.healthData.get(patientId) || [];
    return data
      .filter(
        d =>
          d.dataType === dataType &&
          d.timestamp >= startDate &&
          d.timestamp <= endDate
      )
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  getSleepData(patientId: string, startDate: Date, endDate: Date): SleepData[] {
    const data = this.sleepData.get(patientId) || [];
    return data
      .filter(d => d.date >= startDate && d.date <= endDate)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  getActivityData(patientId: string, startDate: Date, endDate: Date): ActivityData[] {
    const data = this.activityData.get(patientId) || [];
    return data
      .filter(d => d.date >= startDate && d.date <= endDate)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  // ===========================================================================
  // Trend Analysis
  // ===========================================================================

  analyzeTrend(
    patientId: string,
    dataType: DataType,
    periodDays: number = 30
  ): TrendAnalysis {
    const endDate = new Date();
    const startDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

    const data = this.getHealthData(patientId, dataType, startDate, endDate);
    const values = data.map(d => d.value);

    if (values.length < 3) {
      return {
        patientId,
        dataType,
        periodDays,
        startDate,
        endDate,
        statistics: {
          count: values.length,
          min: 0,
          max: 0,
          mean: 0,
          median: 0,
          standardDeviation: 0,
          percentile25: 0,
          percentile75: 0,
        },
        trend: 'insufficient-data',
        trendMagnitude: 0,
        anomalyCount: 0,
        insights: ['Insufficient data for trend analysis'],
        recommendations: ['Continue collecting data'],
      };
    }

    // Calculate statistics
    const sorted = [...values].sort((a, b) => a - b);
    const count = values.length;
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const mean = values.reduce((a, b) => a + b, 0) / count;
    const median = sorted[Math.floor(count / 2)];
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / count;
    const standardDeviation = Math.sqrt(variance);
    const percentile25 = sorted[Math.floor(count * 0.25)];
    const percentile75 = sorted[Math.floor(count * 0.75)];

    // Calculate trend
    const firstHalfMean = values.slice(0, Math.floor(count / 2)).reduce((a, b) => a + b, 0) / Math.floor(count / 2);
    const secondHalfMean = values.slice(Math.floor(count / 2)).reduce((a, b) => a + b, 0) / (count - Math.floor(count / 2));
    const trendMagnitude = ((secondHalfMean - firstHalfMean) / firstHalfMean) * 100;

    let trend: TrendDirection;
    if (Math.abs(trendMagnitude) < 5) {
      trend = 'stable';
    } else if (trendMagnitude > 0) {
      trend = 'increasing';
    } else {
      trend = 'decreasing';
    }

    // Count anomalies
    const alerts = this.alerts.get(patientId) || [];
    const anomalyCount = alerts.filter(
      a => a.dataType === dataType && a.timestamp >= startDate && a.timestamp <= endDate
    ).length;

    // Generate insights
    const insights = this.generateInsights(dataType, { mean, standardDeviation, trend, trendMagnitude });
    const recommendations = this.generateTrendRecommendations(dataType, trend, mean);

    return {
      patientId,
      dataType,
      periodDays,
      startDate,
      endDate,
      statistics: {
        count,
        min,
        max,
        mean: Math.round(mean * 10) / 10,
        median,
        standardDeviation: Math.round(standardDeviation * 10) / 10,
        percentile25,
        percentile75,
      },
      trend,
      trendMagnitude: Math.round(trendMagnitude * 10) / 10,
      anomalyCount,
      insights,
      recommendations,
    };
  }

  private generateInsights(
    dataType: DataType,
    stats: { mean: number; standardDeviation: number; trend: TrendDirection; trendMagnitude: number }
  ): string[] {
    const insights: string[] = [];

    switch (dataType) {
      case 'heart-rate':
        if (stats.mean < 60) {
          insights.push('Your average resting heart rate is in the athletic range');
        } else if (stats.mean > 100) {
          insights.push('Your average heart rate is elevated - consider discussing with your provider');
        }
        if (stats.standardDeviation > 15) {
          insights.push('Your heart rate shows high variability');
        }
        break;

      case 'blood-glucose':
        if (stats.mean < 100) {
          insights.push('Your average glucose is in the normal range');
        } else if (stats.mean > 140) {
          insights.push('Your average glucose is elevated');
        }
        if (stats.standardDeviation > 40) {
          insights.push('You have significant glucose variability - timing of meals may help');
        }
        break;

      case 'steps':
        if (stats.mean >= 10000) {
          insights.push('Great job! You\'re averaging 10,000+ steps per day');
        } else if (stats.mean < 5000) {
          insights.push('Your activity level is below recommended - consider adding more movement');
        }
        break;
    }

    if (stats.trend === 'increasing' && Math.abs(stats.trendMagnitude) > 10) {
      insights.push(`${dataType} has increased by ${Math.abs(stats.trendMagnitude).toFixed(1)}% over this period`);
    } else if (stats.trend === 'decreasing' && Math.abs(stats.trendMagnitude) > 10) {
      insights.push(`${dataType} has decreased by ${Math.abs(stats.trendMagnitude).toFixed(1)}% over this period`);
    }

    return insights;
  }

  private generateTrendRecommendations(
    dataType: DataType,
    trend: TrendDirection,
    mean: number
  ): string[] {
    const recommendations: string[] = [];

    // Generic recommendations based on trend
    if (trend === 'stable') {
      recommendations.push('Continue your current routine');
    }

    // Specific recommendations
    switch (dataType) {
      case 'blood-glucose':
        if (mean > 140) {
          recommendations.push('Review carbohydrate intake');
          recommendations.push('Consider discussing medication adjustment with provider');
        }
        break;

      case 'blood-pressure':
        if (mean > 135) {
          recommendations.push('Reduce sodium intake');
          recommendations.push('Maintain regular exercise');
          recommendations.push('Practice stress management');
        }
        break;

      case 'steps':
        if (mean < 7500) {
          recommendations.push('Try adding a 15-minute walk after meals');
          recommendations.push('Take stairs instead of elevator when possible');
        }
        break;
    }

    return recommendations;
  }

  // ===========================================================================
  // Dashboard Data
  // ===========================================================================

  getPatientDashboard(patientId: string): {
    devices: WearableDevice[];
    latestVitals: VitalsSnapshot;
    activeAlerts: AnomalyAlert[];
    todayActivity: ActivityData | null;
    lastNightSleep: SleepData | null;
    weeklyTrends: { dataType: DataType; trend: TrendDirection; change: number }[];
  } {
    const devices = this.getDevices(patientId);
    const latestVitals = this.getLatestVitals(patientId);
    const activeAlerts = this.getActiveAlerts(patientId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const activityData = this.activityData.get(patientId) || [];
    const todayActivity = activityData.find(
      a => a.date.toDateString() === today.toDateString()
    ) || null;

    const sleepDataList = this.sleepData.get(patientId) || [];
    const lastNightSleep = sleepDataList.find(
      s => s.date.toDateString() === yesterday.toDateString() || s.date.toDateString() === today.toDateString()
    ) || null;

    // Calculate weekly trends for key metrics
    const weeklyTrends: { dataType: DataType; trend: TrendDirection; change: number }[] = [];
    const keyMetrics: DataType[] = ['heart-rate', 'blood-glucose', 'blood-pressure', 'steps'];

    for (const metric of keyMetrics) {
      const analysis = this.analyzeTrend(patientId, metric, 7);
      weeklyTrends.push({
        dataType: metric,
        trend: analysis.trend,
        change: analysis.trendMagnitude,
      });
    }

    return {
      devices,
      latestVitals,
      activeAlerts,
      todayActivity,
      lastNightSleep,
      weeklyTrends,
    };
  }

  // ===========================================================================
  // Threshold Management
  // ===========================================================================

  updateThreshold(patientId: string, threshold: AlertThreshold): void {
    const thresholds = this.thresholds.get(patientId) || [...DEFAULT_THRESHOLDS];
    const index = thresholds.findIndex(t => t.dataType === threshold.dataType);

    if (index >= 0) {
      thresholds[index] = threshold;
    } else {
      thresholds.push(threshold);
    }

    this.thresholds.set(patientId, thresholds);
    this.emit('thresholdUpdated', { patientId, threshold });
  }

  getThresholds(patientId: string): AlertThreshold[] {
    return this.thresholds.get(patientId) || DEFAULT_THRESHOLDS;
  }
}

// Singleton instance
export const wearablesService = new WearablesService();
export default wearablesService;
