// =============================================================================
// ATTENDING AI - Clinical Image Analysis Service
// apps/shared/services/clinical-imaging/ImageAnalysisService.ts
//
// AI-powered medical image analysis including:
// - Dermatology skin lesion analysis
// - Wound assessment and tracking
// - Retinal scan analysis
// - X-ray/CT preliminary reads
// - ECG interpretation
// =============================================================================

import { EventEmitter } from 'events';

// =============================================================================
// Types
// =============================================================================

export interface ImageAnalysisRequest {
  id: string;
  patientId: string;
  imageType: ImageType;
  imageData: string; // Base64 or URL
  clinicalContext?: string;
  bodyLocation?: string;
  priorImages?: string[]; // For comparison
  requestedBy: string;
  requestedAt: Date;
  urgency: 'stat' | 'urgent' | 'routine';
}

export type ImageType =
  | 'skin-lesion'
  | 'wound'
  | 'retinal'
  | 'chest-xray'
  | 'extremity-xray'
  | 'ct-head'
  | 'ct-chest'
  | 'ct-abdomen'
  | 'ecg'
  | 'other';

export interface ImageAnalysisResult {
  requestId: string;
  patientId: string;
  imageType: ImageType;
  analysisDate: Date;
  aiFindings: AIFinding[];
  overallAssessment: OverallAssessment;
  recommendations: Recommendation[];
  comparisonToPrior?: PriorComparison;
  confidence: number;
  disclaimer: string;
  requiresPhysicianReview: boolean;
  processingTime: number; // milliseconds
}

export interface AIFinding {
  id: string;
  category: string;
  description: string;
  location?: string;
  severity: 'normal' | 'mild' | 'moderate' | 'severe' | 'critical';
  confidence: number;
  boundingBox?: BoundingBox;
  measurements?: Measurement[];
  differentialDiagnoses?: DifferentialDiagnosis[];
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Measurement {
  type: string;
  value: number;
  unit: string;
  normalRange?: { min: number; max: number };
  interpretation?: string;
}

export interface DifferentialDiagnosis {
  diagnosis: string;
  probability: number;
  icd10Code?: string;
  keyFeatures: string[];
  recommendedWorkup?: string[];
}

export interface OverallAssessment {
  impression: string;
  urgency: 'normal' | 'non-urgent-abnormal' | 'urgent' | 'critical';
  actionRequired: boolean;
  summary: string;
}

export interface Recommendation {
  priority: 'immediate' | 'urgent' | 'routine';
  category: 'follow-up' | 'additional-imaging' | 'referral' | 'biopsy' | 'treatment' | 'monitoring';
  description: string;
  rationale: string;
  timeframe?: string;
}

export interface PriorComparison {
  priorImageDate: Date;
  changes: ChangeAssessment[];
  overallChange: 'improved' | 'stable' | 'worsened' | 'new-finding' | 'resolved';
}

export interface ChangeAssessment {
  finding: string;
  priorStatus: string;
  currentStatus: string;
  changeType: 'improved' | 'stable' | 'worsened' | 'new' | 'resolved';
  clinicalSignificance: 'significant' | 'minor' | 'uncertain';
}

// =============================================================================
// Skin Lesion Analysis Types
// =============================================================================

export interface SkinLesionAnalysis extends ImageAnalysisResult {
  lesionCharacteristics: LesionCharacteristics;
  abcdeAssessment: ABCDEAssessment;
  dermoscopyFeatures?: DermoscopyFeature[];
  riskScore: number;
  melanomaProbability: number;
}

export interface LesionCharacteristics {
  type: 'macule' | 'papule' | 'nodule' | 'plaque' | 'vesicle' | 'bulla' | 'pustule' | 'ulcer' | 'other';
  color: string[];
  shape: string;
  border: 'regular' | 'irregular' | 'poorly-defined';
  size: { length: number; width: number; unit: string };
  surface: string;
  distribution?: string;
}

export interface ABCDEAssessment {
  asymmetry: { present: boolean; score: number; details: string };
  border: { irregular: boolean; score: number; details: string };
  color: { variegated: boolean; colors: string[]; score: number; details: string };
  diameter: { value: number; over6mm: boolean; score: number };
  evolution: { changing: boolean; details: string };
  totalScore: number;
  interpretation: string;
}

export interface DermoscopyFeature {
  feature: string;
  present: boolean;
  description?: string;
  associatedConditions?: string[];
}

// =============================================================================
// Wound Analysis Types
// =============================================================================

export interface WoundAnalysis extends ImageAnalysisResult {
  woundCharacteristics: WoundCharacteristics;
  healingAssessment: HealingAssessment;
  tissueComposition: TissueComposition;
  treatmentRecommendations: WoundTreatmentRecommendation[];
}

export interface WoundCharacteristics {
  type: 'surgical' | 'traumatic' | 'pressure' | 'diabetic' | 'venous' | 'arterial' | 'other';
  location: string;
  dimensions: {
    length: number;
    width: number;
    depth?: number;
    area: number;
    unit: string;
  };
  shape: string;
  edges: 'well-defined' | 'irregular' | 'undermined' | 'rolled';
  tunneling: boolean;
  tunnelingDetails?: string;
}

export interface HealingAssessment {
  stage: 'inflammatory' | 'proliferative' | 'remodeling' | 'chronic';
  healingProgress: 'healing' | 'stalled' | 'deteriorating';
  infectionRisk: 'low' | 'moderate' | 'high';
  infectionSigns: string[];
  predictedHealingTime?: string;
}

export interface TissueComposition {
  granulation: number; // percentage
  slough: number;
  necrotic: number;
  epithelial: number;
  other: number;
  exudate: {
    amount: 'none' | 'scant' | 'moderate' | 'heavy';
    type: 'serous' | 'sanguinous' | 'serosanguinous' | 'purulent';
  };
  periwoundSkin: string;
}

export interface WoundTreatmentRecommendation {
  category: 'cleansing' | 'debridement' | 'dressing' | 'offloading' | 'compression' | 'referral' | 'other';
  recommendation: string;
  rationale: string;
  frequency?: string;
  duration?: string;
}

// =============================================================================
// ECG Analysis Types
// =============================================================================

export interface ECGAnalysis extends ImageAnalysisResult {
  rhythm: RhythmAssessment;
  intervals: ECGIntervals;
  axis: AxisAssessment;
  morphology: MorphologyFindings;
  interpretation: ECGInterpretation;
}

export interface RhythmAssessment {
  primaryRhythm: string;
  rate: number;
  regularity: 'regular' | 'regularly-irregular' | 'irregularly-irregular';
  pWaves: { present: boolean; morphology: string; relationship: string };
  qrsComplex: { duration: number; morphology: string };
}

export interface ECGIntervals {
  pr: { value: number; interpretation: string };
  qrs: { value: number; interpretation: string };
  qt: { value: number; qtc: number; interpretation: string };
  rr: { value: number; variability: string };
}

export interface AxisAssessment {
  pAxis: number;
  qrsAxis: number;
  tAxis: number;
  interpretation: string;
}

export interface MorphologyFindings {
  stSegment: STSegmentFinding[];
  tWave: TWaveFinding[];
  qWaves: QWaveFinding[];
  rProgression: string;
  otherFindings: string[];
}

export interface STSegmentFinding {
  leads: string[];
  finding: 'elevation' | 'depression' | 'normal';
  magnitude?: number;
  morphology?: string;
  clinicalCorrelation?: string;
}

export interface TWaveFinding {
  leads: string[];
  finding: 'inverted' | 'peaked' | 'flattened' | 'normal';
  clinicalCorrelation?: string;
}

export interface QWaveFinding {
  leads: string[];
  pathological: boolean;
  clinicalCorrelation?: string;
}

export interface ECGInterpretation {
  normalVsAbnormal: 'normal' | 'borderline' | 'abnormal';
  acuteFindings: string[];
  chronicFindings: string[];
  comparisonToPrior?: string;
  clinicalCorrelation: string;
}

// =============================================================================
// Chest X-ray Analysis Types
// =============================================================================

export interface ChestXrayAnalysis extends ImageAnalysisResult {
  technicalQuality: TechnicalQuality;
  findings: ChestXrayFindings;
  cardiacAssessment: CardiacAssessment;
  pulmonaryAssessment: PulmonaryAssessment;
}

export interface TechnicalQuality {
  adequate: boolean;
  issues: string[];
  positioning: string;
  penetration: string;
  inspiration: string;
}

export interface ChestXrayFindings {
  lungs: LungFindings;
  heart: HeartFindings;
  mediastinum: MediastinumFindings;
  pleura: PleuraFindings;
  bones: BoneFindings;
  softTissues: string;
  devices: string[];
}

export interface LungFindings {
  rightLung: { zones: string[]; findings: string[] };
  leftLung: { zones: string[]; findings: string[] };
  airspaceOpacities: string[];
  interstitialPattern: string;
  nodules: { present: boolean; details: string[] };
  masses: { present: boolean; details: string[] };
}

export interface HeartFindings {
  size: 'normal' | 'enlarged' | 'borderline';
  cardiothoracicRatio?: number;
  silhouette: string;
  calcifications: string[];
}

export interface MediastinumFindings {
  width: 'normal' | 'widened';
  contour: string;
  lymphadenopathy: boolean;
  trachea: string;
}

export interface PleuraFindings {
  effusion: { present: boolean; side: string; size: string };
  thickening: boolean;
  pneumothorax: { present: boolean; side: string; size: string };
}

export interface BoneFindings {
  ribs: string;
  spine: string;
  shoulders: string;
  fractures: string[];
  lesions: string[];
}

export interface CardiacAssessment {
  cardiomegaly: boolean;
  chamberEnlargement: string[];
  pulmonaryVasculature: 'normal' | 'congested' | 'pruned';
  pericardialEffusion: boolean;
}

export interface PulmonaryAssessment {
  overallAeration: 'normal' | 'hyperinflated' | 'decreased';
  consolidation: boolean;
  atelectasis: boolean;
  edema: boolean;
  fibrosis: boolean;
}

// =============================================================================
// Image Analysis Service Class
// =============================================================================

export class ImageAnalysisService extends EventEmitter {
  private analysisQueue: Map<string, ImageAnalysisRequest> = new Map();
  private results: Map<string, ImageAnalysisResult> = new Map();

  constructor() {
    super();
  }

  // ===========================================================================
  // Main Analysis Entry Point
  // ===========================================================================

  async analyzeImage(request: Omit<ImageAnalysisRequest, 'id' | 'requestedAt'>): Promise<ImageAnalysisResult> {
    const id = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    const fullRequest: ImageAnalysisRequest = {
      ...request,
      id,
      requestedAt: new Date(),
    };
    
    this.analysisQueue.set(id, fullRequest);
    this.emit('analysisStarted', fullRequest);
    
    let result: ImageAnalysisResult;
    
    try {
      switch (request.imageType) {
        case 'skin-lesion':
          result = await this.analyzeSkinLesion(fullRequest);
          break;
        case 'wound':
          result = await this.analyzeWound(fullRequest);
          break;
        case 'ecg':
          result = await this.analyzeECG(fullRequest);
          break;
        case 'chest-xray':
          result = await this.analyzeChestXray(fullRequest);
          break;
        default:
          result = await this.performGenericAnalysis(fullRequest);
      }
      
      result.processingTime = Date.now() - startTime;
      this.results.set(id, result);
      
      this.emit('analysisCompleted', result);
      
      if (result.overallAssessment.urgency === 'critical') {
        this.emit('criticalFinding', result);
      }
      
      return result;
    } catch (error) {
      this.emit('analysisError', { request: fullRequest, error });
      throw error;
    }
  }

  // ===========================================================================
  // Skin Lesion Analysis
  // ===========================================================================

  private async analyzeSkinLesion(request: ImageAnalysisRequest): Promise<SkinLesionAnalysis> {
    // In production, this would call an AI model (e.g., trained dermatology CNN)
    // For now, we demonstrate the structure
    
    const lesionCharacteristics: LesionCharacteristics = {
      type: 'macule',
      color: ['brown', 'tan'],
      shape: 'oval',
      border: 'regular',
      size: { length: 5, width: 4, unit: 'mm' },
      surface: 'flat',
    };
    
    const abcdeAssessment: ABCDEAssessment = {
      asymmetry: { present: false, score: 0, details: 'Lesion appears symmetric' },
      border: { irregular: false, score: 0, details: 'Borders are well-defined and regular' },
      color: { variegated: false, colors: ['brown'], score: 0, details: 'Uniform brown coloration' },
      diameter: { value: 5, over6mm: false, score: 0 },
      evolution: { changing: false, details: 'No reported changes' },
      totalScore: 0,
      interpretation: 'Low-risk ABCDE score',
    };
    
    const riskScore = abcdeAssessment.totalScore;
    const melanomaProbability = riskScore * 0.1; // Simplified calculation
    
    const findings: AIFinding[] = [
      {
        id: 'finding_1',
        category: 'lesion-assessment',
        description: 'Benign-appearing pigmented lesion',
        severity: 'normal',
        confidence: 0.85,
        differentialDiagnoses: [
          {
            diagnosis: 'Seborrheic keratosis',
            probability: 0.45,
            keyFeatures: ['Well-defined borders', 'Uniform color', 'Waxy appearance'],
          },
          {
            diagnosis: 'Benign nevus',
            probability: 0.40,
            keyFeatures: ['Symmetric', 'Regular borders', 'Uniform pigmentation'],
          },
          {
            diagnosis: 'Lentigo',
            probability: 0.10,
            keyFeatures: ['Flat', 'Brown', 'Sun-exposed area'],
          },
        ],
      },
    ];
    
    const recommendations: Recommendation[] = [
      {
        priority: 'routine',
        category: 'monitoring',
        description: 'Monitor for changes using the ABCDE criteria',
        rationale: 'Low-risk lesion but continued surveillance recommended',
        timeframe: 'Annual skin check recommended',
      },
    ];
    
    return {
      requestId: request.id,
      patientId: request.patientId,
      imageType: 'skin-lesion',
      analysisDate: new Date(),
      aiFindings: findings,
      overallAssessment: {
        impression: 'Benign-appearing pigmented lesion',
        urgency: 'normal',
        actionRequired: false,
        summary: 'AI analysis suggests benign lesion. Low ABCDE score (0). Recommend routine monitoring.',
      },
      recommendations,
      confidence: 0.85,
      disclaimer: 'AI analysis is for decision support only. Clinical correlation and dermatologist review recommended for any concerning lesions.',
      requiresPhysicianReview: false,
      processingTime: 0,
      lesionCharacteristics,
      abcdeAssessment,
      riskScore,
      melanomaProbability,
    };
  }

  // ===========================================================================
  // Wound Analysis
  // ===========================================================================

  private async analyzeWound(request: ImageAnalysisRequest): Promise<WoundAnalysis> {
    const woundCharacteristics: WoundCharacteristics = {
      type: 'pressure',
      location: request.bodyLocation || 'sacrum',
      dimensions: {
        length: 3.5,
        width: 2.8,
        depth: 0.5,
        area: 9.8,
        unit: 'cm',
      },
      shape: 'oval',
      edges: 'well-defined',
      tunneling: false,
    };
    
    const tissueComposition: TissueComposition = {
      granulation: 70,
      slough: 20,
      necrotic: 5,
      epithelial: 5,
      other: 0,
      exudate: {
        amount: 'moderate',
        type: 'serous',
      },
      periwoundSkin: 'Intact, no maceration',
    };
    
    const healingAssessment: HealingAssessment = {
      stage: 'proliferative',
      healingProgress: 'healing',
      infectionRisk: 'low',
      infectionSigns: [],
      predictedHealingTime: '4-6 weeks with appropriate care',
    };
    
    const findings: AIFinding[] = [
      {
        id: 'wound_1',
        category: 'wound-assessment',
        description: 'Stage 3 pressure ulcer with predominantly granulating wound bed',
        severity: 'moderate',
        confidence: 0.82,
        measurements: [
          { type: 'length', value: 3.5, unit: 'cm' },
          { type: 'width', value: 2.8, unit: 'cm' },
          { type: 'area', value: 9.8, unit: 'cm²' },
        ],
      },
    ];
    
    const treatmentRecommendations: WoundTreatmentRecommendation[] = [
      {
        category: 'cleansing',
        recommendation: 'Gentle wound cleansing with normal saline',
        rationale: 'Maintain clean wound environment',
        frequency: 'Each dressing change',
      },
      {
        category: 'debridement',
        recommendation: 'Continue autolytic debridement for remaining slough',
        rationale: '20% slough tissue present',
      },
      {
        category: 'dressing',
        recommendation: 'Hydrocolloid or foam dressing',
        rationale: 'Appropriate for moderate exudate and granulating wound',
        frequency: 'Change every 3-5 days or when saturated',
      },
      {
        category: 'offloading',
        recommendation: 'Ensure appropriate pressure redistribution surface and repositioning schedule',
        rationale: 'Essential for sacral pressure ulcer healing',
        frequency: 'Reposition every 2 hours',
      },
    ];
    
    return {
      requestId: request.id,
      patientId: request.patientId,
      imageType: 'wound',
      analysisDate: new Date(),
      aiFindings: findings,
      overallAssessment: {
        impression: 'Stage 3 pressure ulcer, healing well',
        urgency: 'non-urgent-abnormal',
        actionRequired: true,
        summary: 'Wound shows good granulation tissue (70%). No signs of infection. Continue current treatment plan.',
      },
      recommendations: treatmentRecommendations,
      confidence: 0.82,
      disclaimer: 'AI wound analysis is for decision support. Clinical assessment by wound care specialist recommended.',
      requiresPhysicianReview: false,
      processingTime: 0,
      woundCharacteristics,
      healingAssessment,
      tissueComposition,
      treatmentRecommendations,
    };
  }

  // ===========================================================================
  // ECG Analysis
  // ===========================================================================

  private async analyzeECG(request: ImageAnalysisRequest): Promise<ECGAnalysis> {
    const rhythm: RhythmAssessment = {
      primaryRhythm: 'Sinus rhythm',
      rate: 72,
      regularity: 'regular',
      pWaves: {
        present: true,
        morphology: 'Normal',
        relationship: '1:1 with QRS',
      },
      qrsComplex: {
        duration: 88,
        morphology: 'Normal',
      },
    };
    
    const intervals: ECGIntervals = {
      pr: { value: 160, interpretation: 'Normal' },
      qrs: { value: 88, interpretation: 'Normal' },
      qt: { value: 380, qtc: 400, interpretation: 'Normal' },
      rr: { value: 833, variability: 'Normal' },
    };
    
    const axis: AxisAssessment = {
      pAxis: 45,
      qrsAxis: 60,
      tAxis: 40,
      interpretation: 'Normal axis',
    };
    
    const morphology: MorphologyFindings = {
      stSegment: [
        {
          leads: ['V1-V6', 'I', 'II', 'III', 'aVL', 'aVF'],
          finding: 'normal',
        },
      ],
      tWave: [
        {
          leads: ['All leads'],
          finding: 'normal',
        },
      ],
      qWaves: [],
      rProgression: 'Normal R wave progression',
      otherFindings: [],
    };
    
    const interpretation: ECGInterpretation = {
      normalVsAbnormal: 'normal',
      acuteFindings: [],
      chronicFindings: [],
      clinicalCorrelation: 'Normal sinus rhythm with no acute ischemic changes',
    };
    
    const findings: AIFinding[] = [
      {
        id: 'ecg_1',
        category: 'rhythm',
        description: 'Normal sinus rhythm at 72 bpm',
        severity: 'normal',
        confidence: 0.95,
      },
    ];
    
    return {
      requestId: request.id,
      patientId: request.patientId,
      imageType: 'ecg',
      analysisDate: new Date(),
      aiFindings: findings,
      overallAssessment: {
        impression: 'Normal ECG',
        urgency: 'normal',
        actionRequired: false,
        summary: 'Sinus rhythm, rate 72, normal intervals, no acute ST-T changes',
      },
      recommendations: [],
      confidence: 0.95,
      disclaimer: 'AI ECG interpretation is for decision support only. Clinical correlation required. Not for emergent STEMI diagnosis.',
      requiresPhysicianReview: false,
      processingTime: 0,
      rhythm,
      intervals,
      axis,
      morphology,
      interpretation,
    };
  }

  // ===========================================================================
  // Chest X-ray Analysis
  // ===========================================================================

  private async analyzeChestXray(request: ImageAnalysisRequest): Promise<ChestXrayAnalysis> {
    const technicalQuality: TechnicalQuality = {
      adequate: true,
      issues: [],
      positioning: 'PA view, good positioning',
      penetration: 'Adequate',
      inspiration: 'Good inspiratory effort',
    };
    
    const lungFindings: LungFindings = {
      rightLung: { zones: ['upper', 'middle', 'lower'], findings: ['Clear'] },
      leftLung: { zones: ['upper', 'lower'], findings: ['Clear'] },
      airspaceOpacities: [],
      interstitialPattern: 'Normal',
      nodules: { present: false, details: [] },
      masses: { present: false, details: [] },
    };
    
    const heartFindings: HeartFindings = {
      size: 'normal',
      cardiothoracicRatio: 0.45,
      silhouette: 'Normal cardiac silhouette',
      calcifications: [],
    };
    
    const findings: ChestXrayFindings = {
      lungs: lungFindings,
      heart: heartFindings,
      mediastinum: {
        width: 'normal',
        contour: 'Normal mediastinal contour',
        lymphadenopathy: false,
        trachea: 'Midline',
      },
      pleura: {
        effusion: { present: false, side: '', size: '' },
        thickening: false,
        pneumothorax: { present: false, side: '', size: '' },
      },
      bones: {
        ribs: 'No acute fractures',
        spine: 'Unremarkable',
        shoulders: 'Unremarkable',
        fractures: [],
        lesions: [],
      },
      softTissues: 'Unremarkable',
      devices: [],
    };
    
    const cardiacAssessment: CardiacAssessment = {
      cardiomegaly: false,
      chamberEnlargement: [],
      pulmonaryVasculature: 'normal',
      pericardialEffusion: false,
    };
    
    const pulmonaryAssessment: PulmonaryAssessment = {
      overallAeration: 'normal',
      consolidation: false,
      atelectasis: false,
      edema: false,
      fibrosis: false,
    };
    
    const aiFindings: AIFinding[] = [
      {
        id: 'cxr_1',
        category: 'overall',
        description: 'No acute cardiopulmonary disease',
        severity: 'normal',
        confidence: 0.92,
      },
    ];
    
    return {
      requestId: request.id,
      patientId: request.patientId,
      imageType: 'chest-xray',
      analysisDate: new Date(),
      aiFindings,
      overallAssessment: {
        impression: 'Normal chest radiograph',
        urgency: 'normal',
        actionRequired: false,
        summary: 'Clear lungs bilaterally. Normal heart size. No pleural effusion or pneumothorax.',
      },
      recommendations: [],
      confidence: 0.92,
      disclaimer: 'AI chest X-ray analysis is for decision support. Final interpretation by radiologist required.',
      requiresPhysicianReview: true,
      processingTime: 0,
      technicalQuality,
      findings,
      cardiacAssessment,
      pulmonaryAssessment,
    };
  }

  // ===========================================================================
  // Generic Analysis
  // ===========================================================================

  private async performGenericAnalysis(request: ImageAnalysisRequest): Promise<ImageAnalysisResult> {
    return {
      requestId: request.id,
      patientId: request.patientId,
      imageType: request.imageType,
      analysisDate: new Date(),
      aiFindings: [],
      overallAssessment: {
        impression: 'Image received for analysis',
        urgency: 'normal',
        actionRequired: true,
        summary: 'Specialized analysis not available for this image type. Manual review required.',
      },
      recommendations: [
        {
          priority: 'routine',
          category: 'referral',
          description: 'Manual review by specialist required',
          rationale: 'AI analysis not available for this image type',
        },
      ],
      confidence: 0,
      disclaimer: 'Automated analysis not available for this image type.',
      requiresPhysicianReview: true,
      processingTime: 0,
    };
  }

  // ===========================================================================
  // Comparison Analysis
  // ===========================================================================

  async compareImages(
    currentRequest: ImageAnalysisRequest,
    priorResult: ImageAnalysisResult
  ): Promise<PriorComparison> {
    const changes: ChangeAssessment[] = [];
    
    // In production, this would perform detailed comparison
    // For demonstration, we show the structure
    
    return {
      priorImageDate: priorResult.analysisDate,
      changes,
      overallChange: 'stable',
    };
  }

  // ===========================================================================
  // Result Management
  // ===========================================================================

  getResult(requestId: string): ImageAnalysisResult | undefined {
    return this.results.get(requestId);
  }

  getPatientResults(patientId: string): ImageAnalysisResult[] {
    return Array.from(this.results.values())
      .filter(r => r.patientId === patientId)
      .sort((a, b) => b.analysisDate.getTime() - a.analysisDate.getTime());
  }
}

// Singleton instance
export const imageAnalysisService = new ImageAnalysisService();
export default imageAnalysisService;
