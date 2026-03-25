// =============================================================================
// ATTENDING AI - Population Health Command Center Service
// apps/shared/services/population-health/PopulationHealthService.ts
//
// Comprehensive population health management including:
// - Disease surveillance and outbreak detection
// - Risk stratification across patient populations
// - Quality measure tracking and forecasting
// - Health equity gap identification
// - Resource allocation optimization
// =============================================================================

import { EventEmitter } from 'events';

// =============================================================================
// Types
// =============================================================================

export interface PopulationOverview {
  totalPatients: number;
  activePatients: number;
  riskDistribution: RiskDistribution;
  demographics: Demographics;
  topConditions: ConditionPrevalence[];
  qualityMeasures: QualityMeasureSummary[];
  alerts: PopulationAlert[];
  lastUpdated: Date;
}

export interface RiskDistribution {
  high: number;
  moderate: number;
  low: number;
  rising: number; // Patients whose risk is increasing
}

export interface Demographics {
  ageGroups: { range: string; count: number; percentage: number }[];
  genderDistribution: { gender: string; count: number; percentage: number }[];
  insuranceTypes: { type: string; count: number; percentage: number }[];
  languagePreferences: { language: string; count: number }[];
  raceEthnicity: { category: string; count: number; percentage: number }[];
}

export interface ConditionPrevalence {
  condition: string;
  icd10Codes: string[];
  patientCount: number;
  prevalenceRate: number; // percentage
  avgRiskScore: number;
  controlRate?: number; // For chronic conditions
  trend: 'increasing' | 'stable' | 'decreasing';
}

export interface QualityMeasureSummary {
  measureId: string;
  measureName: string;
  category: 'hedis' | 'stars' | 'mips' | 'custom';
  currentRate: number;
  targetRate: number;
  benchmark: number;
  gap: number;
  trend: 'improving' | 'stable' | 'declining';
  patientsInNumerator: number;
  patientsInDenominator: number;
  actionableGap: number; // Patients who could close the gap
}

export interface PopulationAlert {
  id: string;
  type: AlertType;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedPatients: number;
  createdAt: Date;
  acknowledged: boolean;
  actionTaken?: string;
}

export type AlertType =
  | 'outbreak'
  | 'quality-gap'
  | 'rising-risk'
  | 'care-gap'
  | 'resource-constraint'
  | 'equity-gap'
  | 'cost-trend';

// =============================================================================
// Disease Surveillance Types
// =============================================================================

export interface DiseaseSurveillance {
  condition: string;
  surveillancePeriod: { start: Date; end: Date };
  metrics: SurveillanceMetrics;
  trends: SurveillanceTrend[];
  outbreakStatus: OutbreakStatus;
  geographicDistribution: GeographicCluster[];
  recommendations: string[];
}

export interface SurveillanceMetrics {
  newCases: number;
  activeCases: number;
  resolvedCases: number;
  incidenceRate: number;
  prevalenceRate: number;
  mortalityRate?: number;
  hospitalizationRate?: number;
  avgAgeOfCases: number;
}

export interface SurveillanceTrend {
  date: Date;
  newCases: number;
  cumulativeCases: number;
  movingAverage: number;
}

export interface OutbreakStatus {
  isOutbreak: boolean;
  threshold: number;
  currentLevel: number;
  alertLevel: 'none' | 'watch' | 'warning' | 'outbreak';
  startDate?: Date;
  peakDate?: Date;
  projectedDuration?: string;
}

export interface GeographicCluster {
  location: string; // ZIP code or region
  caseCount: number;
  incidenceRate: number;
  isCluster: boolean;
  riskLevel: 'high' | 'moderate' | 'low';
}

// =============================================================================
// Risk Stratification Types
// =============================================================================

export interface RiskStratificationModel {
  modelName: string;
  version: string;
  lastUpdated: Date;
  patientScores: PatientRiskScore[];
  cohortSummary: CohortSummary;
}

export interface PatientRiskScore {
  patientId: string;
  overallRiskScore: number; // 0-100
  riskLevel: 'high' | 'moderate' | 'low';
  riskFactors: RiskFactor[];
  predictedEvents: PredictedEvent[];
  recommendedInterventions: string[];
  lastCalculated: Date;
  trend: 'improving' | 'stable' | 'worsening';
}

export interface RiskFactor {
  factor: string;
  value: string | number;
  contribution: number; // How much this contributes to risk
  modifiable: boolean;
  intervention?: string;
}

export interface PredictedEvent {
  event: string;
  probability: number;
  timeframe: string;
  preventable: boolean;
  costIfOccurs?: number;
}

export interface CohortSummary {
  totalPatients: number;
  byRiskLevel: { level: string; count: number; avgScore: number }[];
  topRiskFactors: { factor: string; prevalence: number }[];
  interventionOpportunities: { intervention: string; eligiblePatients: number; potentialImpact: string }[];
}

// =============================================================================
// Quality Measures Types
// =============================================================================

export interface QualityMeasure {
  id: string;
  name: string;
  description: string;
  category: 'hedis' | 'stars' | 'mips' | 'custom';
  type: 'process' | 'outcome' | 'structural' | 'patient-experience';
  numeratorCriteria: string;
  denominatorCriteria: string;
  exclusionCriteria?: string;
  targetRate: number;
  nationalBenchmark: number;
  measureSteward: string;
  reportingPeriod: { start: Date; end: Date };
}

export interface QualityMeasurePerformance {
  measure: QualityMeasure;
  currentPerformance: {
    numerator: number;
    denominator: number;
    rate: number;
    confidence: { lower: number; upper: number };
  };
  historicalPerformance: { period: string; rate: number }[];
  gapAnalysis: QualityGapAnalysis;
  projectedPerformance: { rate: number; confidence: number };
  improvementStrategies: ImprovementStrategy[];
}

export interface QualityGapAnalysis {
  patientsInGap: number;
  gapByDemographic: { demographic: string; gapRate: number; patientCount: number }[];
  topBarriers: { barrier: string; affectedPatients: number }[];
  closableGap: number; // Patients where gap can realistically be closed
  estimatedResourcesNeeded: string;
}

export interface ImprovementStrategy {
  strategy: string;
  targetPatients: number;
  estimatedImpact: number; // Percentage point improvement
  effort: 'low' | 'medium' | 'high';
  timeline: string;
  responsible: string;
}

// =============================================================================
// Health Equity Types
// =============================================================================

export interface HealthEquityAnalysis {
  analysisDate: Date;
  populationSize: number;
  disparities: HealthDisparity[];
  equityIndex: number; // 0-100, higher is more equitable
  priorityInterventions: EquityIntervention[];
  sdohImpact: SDOHImpact[];
}

export interface HealthDisparity {
  metric: string;
  dimension: 'race' | 'ethnicity' | 'age' | 'gender' | 'insurance' | 'language' | 'geography' | 'income';
  groups: DisparityGroup[];
  magnitude: 'severe' | 'moderate' | 'mild';
  trend: 'widening' | 'stable' | 'narrowing';
  statisticalSignificance: boolean;
}

export interface DisparityGroup {
  group: string;
  rate: number;
  patientCount: number;
  comparedToReference: number; // Percentage difference from reference group
  isReferenceGroup: boolean;
}

export interface EquityIntervention {
  intervention: string;
  targetDisparity: string;
  targetPopulation: string;
  estimatedImpact: string;
  resources: string;
  timeline: string;
  priority: 'high' | 'medium' | 'low';
}

export interface SDOHImpact {
  domain: 'food' | 'housing' | 'transportation' | 'employment' | 'education' | 'social-support';
  affectedPatients: number;
  healthOutcomeImpact: string;
  interventions: string[];
}

// =============================================================================
// Resource Allocation Types
// =============================================================================

export interface ResourceAllocation {
  analysisDate: Date;
  resources: ResourceCategory[];
  optimization: OptimizationRecommendation[];
  constraints: ResourceConstraint[];
  projections: ResourceProjection[];
}

export interface ResourceCategory {
  category: string;
  currentCapacity: number;
  currentUtilization: number;
  demandForecast: number;
  gapAnalysis: string;
  recommendations: string[];
}

export interface OptimizationRecommendation {
  recommendation: string;
  impact: string;
  investment: string;
  roi: number;
  priority: 'high' | 'medium' | 'low';
  timeline: string;
}

export interface ResourceConstraint {
  resource: string;
  constraint: string;
  impact: string;
  mitigation: string;
}

export interface ResourceProjection {
  timeframe: string;
  demandChange: number;
  capacityNeeded: number;
  gapIfUnaddressed: string;
}

// =============================================================================
// Population Health Service Class
// =============================================================================

export class PopulationHealthService extends EventEmitter {
  private populationData: Map<string, any> = new Map(); // organizationId -> data
  private alerts: PopulationAlert[] = [];
  private surveillanceData: Map<string, DiseaseSurveillance> = new Map();

  constructor() {
    super();
  }

  // ===========================================================================
  // Population Overview
  // ===========================================================================

  getPopulationOverview(organizationId: string): PopulationOverview {
    // In production, this would aggregate data from the database
    // For demonstration, we provide sample structure
    
    return {
      totalPatients: 25000,
      activePatients: 22500,
      riskDistribution: {
        high: 2500,
        moderate: 7500,
        low: 12500,
        rising: 1500,
      },
      demographics: this.getDemographics(),
      topConditions: this.getTopConditions(),
      qualityMeasures: this.getQualityMeasureSummaries(),
      alerts: this.alerts.filter(a => !a.acknowledged).slice(0, 10),
      lastUpdated: new Date(),
    };
  }

  private getDemographics(): Demographics {
    return {
      ageGroups: [
        { range: '0-17', count: 2500, percentage: 10 },
        { range: '18-34', count: 5000, percentage: 20 },
        { range: '35-49', count: 5000, percentage: 20 },
        { range: '50-64', count: 6250, percentage: 25 },
        { range: '65+', count: 6250, percentage: 25 },
      ],
      genderDistribution: [
        { gender: 'Female', count: 13750, percentage: 55 },
        { gender: 'Male', count: 11000, percentage: 44 },
        { gender: 'Other', count: 250, percentage: 1 },
      ],
      insuranceTypes: [
        { type: 'Commercial', count: 12500, percentage: 50 },
        { type: 'Medicare', count: 6250, percentage: 25 },
        { type: 'Medicaid', count: 5000, percentage: 20 },
        { type: 'Uninsured', count: 1250, percentage: 5 },
      ],
      languagePreferences: [
        { language: 'English', count: 20000 },
        { language: 'Spanish', count: 3750 },
        { language: 'Chinese', count: 500 },
        { language: 'Vietnamese', count: 375 },
        { language: 'Other', count: 375 },
      ],
      raceEthnicity: [
        { category: 'White', count: 15000, percentage: 60 },
        { category: 'Hispanic/Latino', count: 5000, percentage: 20 },
        { category: 'Black/African American', count: 2500, percentage: 10 },
        { category: 'Asian', count: 1500, percentage: 6 },
        { category: 'Other', count: 1000, percentage: 4 },
      ],
    };
  }

  private getTopConditions(): ConditionPrevalence[] {
    return [
      {
        condition: 'Hypertension',
        icd10Codes: ['I10'],
        patientCount: 7500,
        prevalenceRate: 30,
        avgRiskScore: 45,
        controlRate: 68,
        trend: 'stable',
      },
      {
        condition: 'Type 2 Diabetes',
        icd10Codes: ['E11.9'],
        patientCount: 5000,
        prevalenceRate: 20,
        avgRiskScore: 55,
        controlRate: 52,
        trend: 'increasing',
      },
      {
        condition: 'Hyperlipidemia',
        icd10Codes: ['E78.5'],
        patientCount: 6250,
        prevalenceRate: 25,
        avgRiskScore: 40,
        controlRate: 45,
        trend: 'stable',
      },
      {
        condition: 'Obesity',
        icd10Codes: ['E66.9'],
        patientCount: 8750,
        prevalenceRate: 35,
        avgRiskScore: 50,
        trend: 'increasing',
      },
      {
        condition: 'Depression',
        icd10Codes: ['F32.9'],
        patientCount: 3750,
        prevalenceRate: 15,
        avgRiskScore: 48,
        controlRate: 35,
        trend: 'increasing',
      },
    ];
  }

  private getQualityMeasureSummaries(): QualityMeasureSummary[] {
    return [
      {
        measureId: 'HbA1c-Control',
        measureName: 'Diabetes: HbA1c Control (<8%)',
        category: 'hedis',
        currentRate: 62,
        targetRate: 70,
        benchmark: 68,
        gap: 8,
        trend: 'improving',
        patientsInNumerator: 3100,
        patientsInDenominator: 5000,
        actionableGap: 400,
      },
      {
        measureId: 'BP-Control',
        measureName: 'Hypertension: BP Control (<140/90)',
        category: 'hedis',
        currentRate: 68,
        targetRate: 75,
        benchmark: 72,
        gap: 7,
        trend: 'stable',
        patientsInNumerator: 5100,
        patientsInDenominator: 7500,
        actionableGap: 525,
      },
      {
        measureId: 'Breast-Cancer-Screen',
        measureName: 'Breast Cancer Screening',
        category: 'hedis',
        currentRate: 72,
        targetRate: 80,
        benchmark: 75,
        gap: 8,
        trend: 'improving',
        patientsInNumerator: 4320,
        patientsInDenominator: 6000,
        actionableGap: 480,
      },
      {
        measureId: 'Colorectal-Screen',
        measureName: 'Colorectal Cancer Screening',
        category: 'hedis',
        currentRate: 58,
        targetRate: 70,
        benchmark: 65,
        gap: 12,
        trend: 'improving',
        patientsInNumerator: 4640,
        patientsInDenominator: 8000,
        actionableGap: 960,
      },
    ];
  }

  // ===========================================================================
  // Disease Surveillance
  // ===========================================================================

  runDiseaseSurveillance(
    condition: string,
    periodDays: number = 30
  ): DiseaseSurveillance {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);
    
    // In production, this would query actual patient data
    const metrics: SurveillanceMetrics = {
      newCases: 45,
      activeCases: 120,
      resolvedCases: 30,
      incidenceRate: 1.8, // per 1000 patients per week
      prevalenceRate: 4.8,
      avgAgeOfCases: 52,
    };
    
    // Generate trends
    const trends: SurveillanceTrend[] = [];
    for (let i = periodDays; i >= 0; i -= 7) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      trends.push({
        date,
        newCases: Math.floor(Math.random() * 20) + 5,
        cumulativeCases: 120 - Math.floor(i / 7) * 15,
        movingAverage: 12 + Math.random() * 5,
      });
    }
    
    // Determine outbreak status
    const baselineIncidence = 1.5;
    const outbreakThreshold = baselineIncidence * 2;
    const isOutbreak = metrics.incidenceRate > outbreakThreshold;
    
    const surveillance: DiseaseSurveillance = {
      condition,
      surveillancePeriod: { start: startDate, end: endDate },
      metrics,
      trends,
      outbreakStatus: {
        isOutbreak,
        threshold: outbreakThreshold,
        currentLevel: metrics.incidenceRate,
        alertLevel: isOutbreak ? 'outbreak' : metrics.incidenceRate > baselineIncidence * 1.5 ? 'warning' : 'none',
      },
      geographicDistribution: [
        { location: '80202', caseCount: 25, incidenceRate: 2.5, isCluster: true, riskLevel: 'high' },
        { location: '80203', caseCount: 15, incidenceRate: 1.5, isCluster: false, riskLevel: 'moderate' },
        { location: '80204', caseCount: 10, incidenceRate: 1.0, isCluster: false, riskLevel: 'low' },
      ],
      recommendations: isOutbreak
        ? ['Increase testing capacity', 'Alert clinical staff', 'Review infection control protocols']
        : ['Continue routine surveillance', 'Monitor trends'],
    };
    
    this.surveillanceData.set(condition, surveillance);
    
    if (isOutbreak) {
      this.createAlert({
        type: 'outbreak',
        severity: 'high',
        title: `Potential ${condition} outbreak detected`,
        description: `Incidence rate ${metrics.incidenceRate.toFixed(1)} exceeds threshold of ${outbreakThreshold.toFixed(1)}`,
        affectedPatients: metrics.activeCases,
      });
    }
    
    return surveillance;
  }

  // ===========================================================================
  // Risk Stratification
  // ===========================================================================

  runRiskStratification(populationFilter?: any): RiskStratificationModel {
    // In production, this would run ML models on patient data
    
    const cohortSummary: CohortSummary = {
      totalPatients: 25000,
      byRiskLevel: [
        { level: 'High', count: 2500, avgScore: 78 },
        { level: 'Moderate', count: 7500, avgScore: 52 },
        { level: 'Low', count: 15000, avgScore: 25 },
      ],
      topRiskFactors: [
        { factor: 'Multiple chronic conditions (3+)', prevalence: 15 },
        { factor: 'Uncontrolled diabetes (A1c > 9)', prevalence: 8 },
        { factor: 'Recent hospitalization', prevalence: 5 },
        { factor: 'Medication non-adherence', prevalence: 12 },
        { factor: 'Social determinants risk', prevalence: 18 },
      ],
      interventionOpportunities: [
        { intervention: 'Care management enrollment', eligiblePatients: 1500, potentialImpact: '15% reduction in hospitalizations' },
        { intervention: 'Medication therapy management', eligiblePatients: 2000, potentialImpact: '20% improvement in adherence' },
        { intervention: 'Chronic care management', eligiblePatients: 3000, potentialImpact: '10% improvement in quality measures' },
      ],
    };
    
    return {
      modelName: 'ATTENDING Risk Stratification Model',
      version: '2.0',
      lastUpdated: new Date(),
      patientScores: [], // Would contain individual patient scores
      cohortSummary,
    };
  }

  // ===========================================================================
  // Quality Measure Performance
  // ===========================================================================

  getQualityMeasurePerformance(measureId: string): QualityMeasurePerformance | null {
    const measures = this.getQualityMeasureSummaries();
    const summary = measures.find(m => m.measureId === measureId);
    
    if (!summary) return null;
    
    const measure: QualityMeasure = {
      id: summary.measureId,
      name: summary.measureName,
      description: `Quality measure for ${summary.measureName}`,
      category: summary.category,
      type: 'process',
      numeratorCriteria: 'Patients meeting measure criteria',
      denominatorCriteria: 'Eligible patients',
      targetRate: summary.targetRate,
      nationalBenchmark: summary.benchmark,
      measureSteward: 'NCQA',
      reportingPeriod: { start: new Date(new Date().getFullYear(), 0, 1), end: new Date() },
    };
    
    return {
      measure,
      currentPerformance: {
        numerator: summary.patientsInNumerator,
        denominator: summary.patientsInDenominator,
        rate: summary.currentRate,
        confidence: { lower: summary.currentRate - 2, upper: summary.currentRate + 2 },
      },
      historicalPerformance: [
        { period: 'Q1', rate: summary.currentRate - 3 },
        { period: 'Q2', rate: summary.currentRate - 1 },
        { period: 'Q3', rate: summary.currentRate },
      ],
      gapAnalysis: {
        patientsInGap: summary.actionableGap,
        gapByDemographic: [
          { demographic: 'Age 65+', gapRate: 15, patientCount: 200 },
          { demographic: 'Medicaid', gapRate: 18, patientCount: 150 },
          { demographic: 'Spanish-speaking', gapRate: 12, patientCount: 100 },
        ],
        topBarriers: [
          { barrier: 'Access/transportation', affectedPatients: 150 },
          { barrier: 'Insurance coverage', affectedPatients: 100 },
          { barrier: 'Language barrier', affectedPatients: 75 },
        ],
        closableGap: Math.floor(summary.actionableGap * 0.7),
        estimatedResourcesNeeded: '50 outreach calls per week for 8 weeks',
      },
      projectedPerformance: {
        rate: summary.currentRate + 3,
        confidence: 0.75,
      },
      improvementStrategies: [
        {
          strategy: 'Targeted outreach campaign',
          targetPatients: 300,
          estimatedImpact: 3,
          effort: 'medium',
          timeline: '8 weeks',
          responsible: 'Care Management Team',
        },
        {
          strategy: 'Provider reminder alerts',
          targetPatients: summary.actionableGap,
          estimatedImpact: 2,
          effort: 'low',
          timeline: '2 weeks',
          responsible: 'IT/Clinical Informatics',
        },
      ],
    };
  }

  // ===========================================================================
  // Health Equity Analysis
  // ===========================================================================

  analyzeHealthEquity(): HealthEquityAnalysis {
    const disparities: HealthDisparity[] = [
      {
        metric: 'Diabetes Control (HbA1c <8%)',
        dimension: 'race',
        groups: [
          { group: 'White', rate: 68, patientCount: 3000, comparedToReference: 0, isReferenceGroup: true },
          { group: 'Black', rate: 52, patientCount: 500, comparedToReference: -16, isReferenceGroup: false },
          { group: 'Hispanic', rate: 55, patientCount: 1000, comparedToReference: -13, isReferenceGroup: false },
        ],
        magnitude: 'moderate',
        trend: 'stable',
        statisticalSignificance: true,
      },
      {
        metric: 'Preventive Screening Completion',
        dimension: 'language',
        groups: [
          { group: 'English', rate: 75, patientCount: 18000, comparedToReference: 0, isReferenceGroup: true },
          { group: 'Spanish', rate: 58, patientCount: 3500, comparedToReference: -17, isReferenceGroup: false },
          { group: 'Other', rate: 52, patientCount: 3500, comparedToReference: -23, isReferenceGroup: false },
        ],
        magnitude: 'moderate',
        trend: 'narrowing',
        statisticalSignificance: true,
      },
    ];
    
    return {
      analysisDate: new Date(),
      populationSize: 25000,
      disparities,
      equityIndex: 72,
      priorityInterventions: [
        {
          intervention: 'Bilingual care coordination',
          targetDisparity: 'Language barrier in preventive care',
          targetPopulation: 'Spanish-speaking patients',
          estimatedImpact: '10% improvement in screening rates',
          resources: '2 FTE bilingual care coordinators',
          timeline: '6 months',
          priority: 'high',
        },
        {
          intervention: 'Community health worker program',
          targetDisparity: 'Diabetes control disparity',
          targetPopulation: 'Black and Hispanic patients with diabetes',
          estimatedImpact: '8% improvement in A1c control',
          resources: '3 FTE community health workers',
          timeline: '12 months',
          priority: 'high',
        },
      ],
      sdohImpact: [
        {
          domain: 'transportation',
          affectedPatients: 2500,
          healthOutcomeImpact: '15% higher missed appointment rate',
          interventions: ['Transportation voucher program', 'Telehealth expansion'],
        },
        {
          domain: 'food',
          affectedPatients: 3000,
          healthOutcomeImpact: '20% worse diabetes control',
          interventions: ['Food pharmacy partnership', 'Nutrition education'],
        },
      ],
    };
  }

  // ===========================================================================
  // Alert Management
  // ===========================================================================

  private createAlert(alert: Omit<PopulationAlert, 'id' | 'createdAt' | 'acknowledged'>): PopulationAlert {
    const fullAlert: PopulationAlert = {
      ...alert,
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      createdAt: new Date(),
      acknowledged: false,
    };
    
    this.alerts.push(fullAlert);
    this.emit('alertCreated', fullAlert);
    
    return fullAlert;
  }

  acknowledgeAlert(alertId: string, actionTaken?: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.actionTaken = actionTaken;
      this.emit('alertAcknowledged', alert);
    }
  }

  getAlerts(includeAcknowledged: boolean = false): PopulationAlert[] {
    if (includeAcknowledged) {
      return this.alerts;
    }
    return this.alerts.filter(a => !a.acknowledged);
  }
}

// Singleton instance
export const populationHealthService = new PopulationHealthService();
export default populationHealthService;
