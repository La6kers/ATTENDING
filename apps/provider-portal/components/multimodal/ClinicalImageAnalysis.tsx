// ============================================================
// ATTENDING AI - Multi-Modal Clinical AI
// apps/provider-portal/components/multimodal/ClinicalImageAnalysis.tsx
//
// Phase 9A: See beyond text - analyze clinical images with AI
// Dermatology, wounds, rashes, and visual symptom assessment
// ============================================================

'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
  Camera,
  Upload,
  Image as ImageIcon,
  Scan,
  AlertTriangle,
  CheckCircle,
  Info,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Ruler,
  Download,
  Share2,
  History,
  Brain,
  Eye,
  Thermometer,
  Activity,
  FileText,
  ChevronRight,
  X,
  Loader2,
} from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

export type ImageCategory = 'dermatology' | 'wound' | 'eye' | 'throat' | 'general' | 'document';
export type AnalysisStatus = 'idle' | 'uploading' | 'analyzing' | 'complete' | 'error';
export type UrgencyLevel = 'emergent' | 'urgent' | 'routine' | 'benign';

export interface AnalysisResult {
  id: string;
  category: ImageCategory;
  findings: Finding[];
  differentials: Differential[];
  recommendations: string[];
  urgency: UrgencyLevel;
  confidence: number;
  processingTime: number;
  modelVersion: string;
  analyzedAt: Date;
}

export interface Finding {
  id: string;
  description: string;
  location?: string;
  characteristics: string[];
  measurements?: {
    width?: number;
    height?: number;
    area?: number;
    unit: string;
  };
  severity: 'mild' | 'moderate' | 'severe';
  confidence: number;
}

export interface Differential {
  condition: string;
  icd10?: string;
  probability: number;
  keyFeatures: string[];
  redFlags?: string[];
  recommendedWorkup?: string[];
}

export interface ImageHistoryItem {
  id: string;
  imageUrl: string;
  thumbnailUrl: string;
  category: ImageCategory;
  capturedAt: Date;
  analysis?: AnalysisResult;
  notes?: string;
}

// ============================================================
// MOCK AI ANALYSIS
// ============================================================

const mockAnalyzeImage = async (category: ImageCategory): Promise<AnalysisResult> => {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 2500));

  const mockResults: Record<ImageCategory, AnalysisResult> = {
    dermatology: {
      id: `analysis_${Date.now()}`,
      category: 'dermatology',
      findings: [
        {
          id: 'f1',
          description: 'Erythematous papule with irregular borders',
          location: 'Left forearm, dorsal aspect',
          characteristics: [
            'Asymmetric shape',
            'Border irregularity noted',
            'Color variation (brown, tan, red)',
            'Diameter approximately 6mm',
          ],
          measurements: { width: 6, height: 5, area: 23.5, unit: 'mm' },
          severity: 'moderate',
          confidence: 0.87,
        },
      ],
      differentials: [
        {
          condition: 'Dysplastic nevus',
          icd10: 'D22.6',
          probability: 0.45,
          keyFeatures: ['Irregular borders', 'Color variation', 'Size >5mm'],
          recommendedWorkup: ['Dermoscopy', 'Consider excisional biopsy'],
        },
        {
          condition: 'Melanoma in situ',
          icd10: 'D03.6',
          probability: 0.25,
          keyFeatures: ['ABCDE criteria partially met', 'Asymmetry present'],
          redFlags: ['Requires urgent dermatology referral if suspected'],
          recommendedWorkup: ['Urgent dermoscopy', 'Excisional biopsy with margins'],
        },
        {
          condition: 'Seborrheic keratosis',
          icd10: 'L82.1',
          probability: 0.20,
          keyFeatures: ['Stuck-on appearance possible', 'Waxy surface'],
        },
        {
          condition: 'Benign compound nevus',
          icd10: 'D22.6',
          probability: 0.10,
          keyFeatures: ['Regular features on close inspection'],
        },
      ],
      recommendations: [
        'Recommend dermoscopy for detailed evaluation',
        'Consider dermatology referral within 2 weeks',
        'Document with serial photography for monitoring',
        'Educate patient on ABCDE warning signs',
        'Sun protection counseling',
      ],
      urgency: 'urgent',
      confidence: 0.85,
      processingTime: 2340,
      modelVersion: 'derm-ai-v2.1',
      analyzedAt: new Date(),
    },
    wound: {
      id: `analysis_${Date.now()}`,
      category: 'wound',
      findings: [
        {
          id: 'f1',
          description: 'Partial thickness wound with granulation tissue',
          location: 'Right lower leg, lateral aspect',
          characteristics: [
            'Red granulation tissue base (80%)',
            'Yellow slough present (15%)',
            'Minimal necrotic tissue (5%)',
            'Wound edges: attached, non-undermined',
            'Periwound skin: mild erythema, no maceration',
          ],
          measurements: { width: 32, height: 28, area: 7.03, unit: 'mm/cm²' },
          severity: 'moderate',
          confidence: 0.91,
        },
      ],
      differentials: [
        {
          condition: 'Venous stasis ulcer',
          icd10: 'I87.2',
          probability: 0.55,
          keyFeatures: ['Location consistent', 'Irregular borders', 'Granulation present'],
          recommendedWorkup: ['ABI measurement', 'Venous duplex if not done'],
        },
        {
          condition: 'Arterial insufficiency ulcer',
          icd10: 'I70.25',
          probability: 0.20,
          keyFeatures: ['Consider if ABI <0.9'],
          redFlags: ['Check pedal pulses', 'Vascular surgery referral if arterial'],
        },
        {
          condition: 'Diabetic foot ulcer',
          icd10: 'E11.621',
          probability: 0.15,
          keyFeatures: ['Check diabetes status', 'Assess neuropathy'],
        },
      ],
      recommendations: [
        'Wound appears to be healing - continue current treatment',
        'Recommend compression therapy if venous etiology confirmed',
        'Weekly wound measurements to track progress',
        'Optimize nutrition (protein, vitamin C, zinc)',
        'Consider negative pressure wound therapy if stalled >2 weeks',
      ],
      urgency: 'routine',
      confidence: 0.88,
      processingTime: 1890,
      modelVersion: 'wound-ai-v1.8',
      analyzedAt: new Date(),
    },
    eye: {
      id: `analysis_${Date.now()}`,
      category: 'eye',
      findings: [
        {
          id: 'f1',
          description: 'Conjunctival injection with clear cornea',
          characteristics: [
            'Diffuse conjunctival hyperemia',
            'No corneal opacity or defect visible',
            'Pupil appears round and reactive',
            'No hypopyon noted',
          ],
          severity: 'mild',
          confidence: 0.82,
        },
      ],
      differentials: [
        {
          condition: 'Viral conjunctivitis',
          icd10: 'B30.9',
          probability: 0.50,
          keyFeatures: ['Diffuse injection', 'Watery discharge common'],
        },
        {
          condition: 'Bacterial conjunctivitis',
          icd10: 'H10.0',
          probability: 0.25,
          keyFeatures: ['Purulent discharge if bacterial'],
        },
        {
          condition: 'Allergic conjunctivitis',
          icd10: 'H10.1',
          probability: 0.20,
          keyFeatures: ['Itching prominent', 'Bilateral common'],
        },
      ],
      recommendations: [
        'Artificial tears for comfort',
        'Good hand hygiene to prevent spread',
        'Return if vision changes or worsens',
        'Ophthalmology referral if no improvement in 7 days',
      ],
      urgency: 'routine',
      confidence: 0.80,
      processingTime: 1560,
      modelVersion: 'ophtho-ai-v1.3',
      analyzedAt: new Date(),
    },
    throat: {
      id: `analysis_${Date.now()}`,
      category: 'throat',
      findings: [
        {
          id: 'f1',
          description: 'Tonsillar enlargement with exudates',
          characteristics: [
            'Bilateral tonsillar hypertrophy (3+)',
            'White-yellow exudates on tonsils',
            'Pharyngeal erythema',
            'Uvula midline',
          ],
          severity: 'moderate',
          confidence: 0.88,
        },
      ],
      differentials: [
        {
          condition: 'Streptococcal pharyngitis',
          icd10: 'J02.0',
          probability: 0.45,
          keyFeatures: ['Exudates', 'Tender anterior cervical nodes', 'Fever'],
          recommendedWorkup: ['Rapid strep test', 'Throat culture if rapid negative'],
        },
        {
          condition: 'Infectious mononucleosis',
          icd10: 'B27.9',
          probability: 0.25,
          keyFeatures: ['Consider if teen/young adult', 'Fatigue prominent'],
          recommendedWorkup: ['Monospot test', 'CBC with diff'],
        },
        {
          condition: 'Viral pharyngitis',
          icd10: 'J02.9',
          probability: 0.25,
          keyFeatures: ['Cough/coryza present', 'Gradual onset'],
        },
      ],
      recommendations: [
        'Obtain rapid strep test',
        'If strep positive: Penicillin V or Amoxicillin x 10 days',
        'Supportive care: fluids, rest, analgesics',
        'Return if difficulty breathing or swallowing',
      ],
      urgency: 'routine',
      confidence: 0.86,
      processingTime: 1420,
      modelVersion: 'ent-ai-v1.5',
      analyzedAt: new Date(),
    },
    general: {
      id: `analysis_${Date.now()}`,
      category: 'general',
      findings: [
        {
          id: 'f1',
          description: 'Image analyzed for general clinical findings',
          characteristics: ['Detailed analysis pending clinical context'],
          severity: 'mild',
          confidence: 0.75,
        },
      ],
      differentials: [],
      recommendations: [
        'Provide additional clinical context for more specific analysis',
        'Consider specialized image category for better results',
      ],
      urgency: 'routine',
      confidence: 0.70,
      processingTime: 1200,
      modelVersion: 'general-ai-v1.0',
      analyzedAt: new Date(),
    },
    document: {
      id: `analysis_${Date.now()}`,
      category: 'document',
      findings: [
        {
          id: 'f1',
          description: 'Medical document detected and processed',
          characteristics: ['Text extraction complete', 'Key findings identified'],
          severity: 'mild',
          confidence: 0.92,
        },
      ],
      differentials: [],
      recommendations: [
        'Review extracted information for accuracy',
        'Import relevant data to patient chart',
      ],
      urgency: 'routine',
      confidence: 0.90,
      processingTime: 980,
      modelVersion: 'ocr-ai-v2.0',
      analyzedAt: new Date(),
    },
  };

  return mockResults[category];
};

// ============================================================
// COMPONENTS
// ============================================================

const CategorySelector: React.FC<{
  selected: ImageCategory;
  onSelect: (category: ImageCategory) => void;
}> = ({ selected, onSelect }) => {
  const categories: Array<{ value: ImageCategory; label: string; icon: React.ReactNode; description: string }> = [
    { value: 'dermatology', label: 'Skin/Derm', icon: <Eye size={20} />, description: 'Lesions, rashes, moles' },
    { value: 'wound', label: 'Wound', icon: <Activity size={20} />, description: 'Ulcers, surgical sites' },
    { value: 'eye', label: 'Eye', icon: <Eye size={20} />, description: 'Conjunctiva, external eye' },
    { value: 'throat', label: 'Throat', icon: <Thermometer size={20} />, description: 'Pharynx, tonsils' },
    { value: 'document', label: 'Document', icon: <FileText size={20} />, description: 'Labs, records, Rx' },
    { value: 'general', label: 'General', icon: <ImageIcon size={20} />, description: 'Other clinical images' },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {categories.map((cat) => (
        <button
          key={cat.value}
          onClick={() => onSelect(cat.value)}
          className={`p-4 rounded-xl border-2 transition-all text-left ${
            selected === cat.value
              ? 'border-teal-500 bg-teal-50'
              : 'border-slate-200 hover:border-slate-300 bg-white'
          }`}
        >
          <div className={`mb-2 ${selected === cat.value ? 'text-teal-600' : 'text-slate-400'}`}>
            {cat.icon}
          </div>
          <p className="font-medium text-slate-900">{cat.label}</p>
          <p className="text-xs text-slate-500">{cat.description}</p>
        </button>
      ))}
    </div>
  );
};

const UrgencyBadge: React.FC<{ urgency: UrgencyLevel }> = ({ urgency }) => {
  const config = {
    emergent: { color: 'bg-red-100 text-red-700 border-red-200', label: 'EMERGENT' },
    urgent: { color: 'bg-orange-100 text-orange-700 border-orange-200', label: 'URGENT' },
    routine: { color: 'bg-blue-100 text-blue-700 border-blue-200', label: 'ROUTINE' },
    benign: { color: 'bg-green-100 text-green-700 border-green-200', label: 'BENIGN' },
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${config[urgency].color}`}>
      {config[urgency].label}
    </span>
  );
};

const FindingCard: React.FC<{ finding: Finding; index: number }> = ({ finding, index }) => {
  const severityColors = {
    mild: 'border-l-green-500',
    moderate: 'border-l-amber-500',
    severe: 'border-l-red-500',
  };

  return (
    <div className={`bg-white rounded-lg border border-slate-200 border-l-4 ${severityColors[finding.severity]} p-4`}>
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-semibold text-slate-900">Finding #{index + 1}</h4>
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          finding.severity === 'severe' ? 'bg-red-100 text-red-700' :
          finding.severity === 'moderate' ? 'bg-amber-100 text-amber-700' :
          'bg-green-100 text-green-700'
        }`}>
          {finding.severity} • {Math.round(finding.confidence * 100)}% confidence
        </span>
      </div>
      
      <p className="text-slate-700 mb-3">{finding.description}</p>
      
      {finding.location && (
        <p className="text-sm text-slate-500 mb-2">
          <strong>Location:</strong> {finding.location}
        </p>
      )}
      
      {finding.characteristics.length > 0 && (
        <div className="mb-3">
          <p className="text-sm font-medium text-slate-600 mb-1">Characteristics:</p>
          <ul className="text-sm text-slate-600 space-y-1">
            {finding.characteristics.map((char, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-teal-500 mt-1">•</span>
                {char}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {finding.measurements && (
        <div className="p-2 bg-slate-50 rounded-lg">
          <p className="text-sm font-medium text-slate-600 mb-1">Measurements:</p>
          <div className="flex gap-4 text-sm">
            {finding.measurements.width && (
              <span>Width: {finding.measurements.width}{finding.measurements.unit}</span>
            )}
            {finding.measurements.height && (
              <span>Height: {finding.measurements.height}{finding.measurements.unit}</span>
            )}
            {finding.measurements.area && (
              <span>Area: {finding.measurements.area}{finding.measurements.unit}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const DifferentialCard: React.FC<{ differential: Differential; rank: number }> = ({ differential, rank }) => {
  const [expanded, setExpanded] = useState(rank === 1);

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
            rank === 1 ? 'bg-teal-100 text-teal-700' :
            rank === 2 ? 'bg-blue-100 text-blue-700' :
            'bg-slate-100 text-slate-600'
          }`}>
            #{rank}
          </div>
          <div className="text-left">
            <p className="font-semibold text-slate-900">{differential.condition}</p>
            {differential.icd10 && (
              <p className="text-xs text-slate-500">ICD-10: {differential.icd10}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-lg font-bold text-teal-600">{Math.round(differential.probability * 100)}%</p>
            <p className="text-xs text-slate-500">probability</p>
          </div>
          <ChevronRight className={`text-slate-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </div>
      </button>
      
      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-100 bg-slate-50">
          <div className="mt-3 space-y-3">
            {differential.keyFeatures.length > 0 && (
              <div>
                <p className="text-sm font-medium text-slate-700 mb-1">Key Features:</p>
                <ul className="text-sm text-slate-600 space-y-1">
                  {differential.keyFeatures.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {differential.redFlags && differential.redFlags.length > 0 && (
              <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                <p className="text-sm font-medium text-red-700 mb-1 flex items-center gap-1">
                  <AlertTriangle size={14} />
                  Red Flags:
                </p>
                <ul className="text-sm text-red-600 space-y-1">
                  {differential.redFlags.map((flag, idx) => (
                    <li key={idx}>• {flag}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {differential.recommendedWorkup && differential.recommendedWorkup.length > 0 && (
              <div>
                <p className="text-sm font-medium text-slate-700 mb-1">Recommended Workup:</p>
                <ul className="text-sm text-slate-600 space-y-1">
                  {differential.recommendedWorkup.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-blue-500">→</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export const ClinicalImageAnalysis: React.FC<{
  patientId: string;
  patientName: string;
  onSaveToChart?: (analysis: AnalysisResult, imageUrl: string) => void;
}> = ({ patientId, patientName, onSaveToChart }) => {
  const [category, setCategory] = useState<ImageCategory>('dermatology');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [status, setStatus] = useState<AnalysisStatus>('idle');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [imageHistory, setImageHistory] = useState<ImageHistoryItem[]>([]);
  const [zoom, setZoom] = useState(1);
  const [showHistory, setShowHistory] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Create preview URL
    const imageUrl = URL.createObjectURL(file);
    setSelectedImage(imageUrl);
    setStatus('uploading');
    setAnalysis(null);

    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 500));
    setStatus('analyzing');

    try {
      // Run AI analysis
      const result = await mockAnalyzeImage(category);
      setAnalysis(result);
      setStatus('complete');

      // Add to history
      const historyItem: ImageHistoryItem = {
        id: `img_${Date.now()}`,
        imageUrl,
        thumbnailUrl: imageUrl,
        category,
        capturedAt: new Date(),
        analysis: result,
      };
      setImageHistory(prev => [historyItem, ...prev]);
    } catch (error) {
      setStatus('error');
    }
  }, [category]);

  const handleCapture = () => {
    fileInputRef.current?.click();
  };

  const handleSaveToChart = () => {
    if (analysis && selectedImage && onSaveToChart) {
      onSaveToChart(analysis, selectedImage);
    }
  };

  const handleReset = () => {
    setSelectedImage(null);
    setAnalysis(null);
    setStatus('idle');
    setZoom(1);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-6 py-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Scan className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Multi-Modal Clinical AI</h2>
              <p className="text-teal-200 text-sm">AI-powered image analysis for clinical decision support</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-white/20 rounded-full text-sm">
              Patient: {patientName}
            </span>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors relative"
            >
              <History size={20} />
              {imageHistory.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-xs rounded-full flex items-center justify-center">
                  {imageHistory.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Category Selection */}
        {status === 'idle' && !selectedImage && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-slate-700 mb-3">Select Image Category</h3>
            <CategorySelector selected={category} onSelect={setCategory} />
          </div>
        )}

        {/* Upload Area */}
        {!selectedImage && (
          <div 
            className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center hover:border-teal-400 hover:bg-teal-50 transition-colors cursor-pointer"
            onClick={handleCapture}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Camera className="w-8 h-8 text-teal-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Capture or Upload Image</h3>
            <p className="text-slate-500 mb-4">
              Take a photo or upload an existing image for AI analysis
            </p>
            <div className="flex items-center justify-center gap-4">
              <button className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors">
                <Camera size={18} />
                Take Photo
              </button>
              <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors">
                <Upload size={18} />
                Upload
              </button>
            </div>
          </div>
        )}

        {/* Image Preview & Analysis */}
        {selectedImage && (
          <div className="grid grid-cols-2 gap-6">
            {/* Image Panel */}
            <div className="space-y-4">
              <div className="relative bg-slate-900 rounded-xl overflow-hidden">
                <img
                  src={selectedImage}
                  alt="Clinical image"
                  className="w-full h-auto transition-transform"
                  style={{ transform: `scale(${zoom})` }}
                />
                
                {/* Image Controls */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-black/50 rounded-full px-3 py-2">
                  <button
                    onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
                    className="p-1 hover:bg-white/20 rounded"
                  >
                    <ZoomOut size={18} className="text-white" />
                  </button>
                  <span className="text-white text-sm px-2">{Math.round(zoom * 100)}%</span>
                  <button
                    onClick={() => setZoom(z => Math.min(3, z + 0.25))}
                    className="p-1 hover:bg-white/20 rounded"
                  >
                    <ZoomIn size={18} className="text-white" />
                  </button>
                </div>

                {/* Status Overlay */}
                {(status === 'uploading' || status === 'analyzing') && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <div className="text-center text-white">
                      <Loader2 className="w-12 h-12 animate-spin mx-auto mb-3" />
                      <p className="font-medium">
                        {status === 'uploading' ? 'Uploading image...' : 'Analyzing with AI...'}
                      </p>
                      <p className="text-sm text-white/70">This may take a few seconds</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <RotateCw size={16} />
                  New Image
                </button>
                <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
                  <Ruler size={16} />
                  Measure
                </button>
                <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
                  <Download size={16} />
                  Export
                </button>
              </div>
            </div>

            {/* Analysis Panel */}
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {status === 'complete' && analysis && (
                <>
                  {/* Summary */}
                  <div className="bg-gradient-to-r from-teal-50 to-teal-50 rounded-xl p-4 border border-teal-100">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Brain className="w-5 h-5 text-teal-600" />
                        <h3 className="font-semibold text-slate-900">AI Analysis Complete</h3>
                      </div>
                      <UrgencyBadge urgency={analysis.urgency} />
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-teal-600">{analysis.confidence}%</p>
                        <p className="text-xs text-slate-500">Confidence</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-slate-900">{analysis.findings.length}</p>
                        <p className="text-xs text-slate-500">Findings</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-slate-900">{analysis.differentials.length}</p>
                        <p className="text-xs text-slate-500">Differentials</p>
                      </div>
                    </div>
                  </div>

                  {/* Findings */}
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-3">Findings</h3>
                    <div className="space-y-3">
                      {analysis.findings.map((finding, idx) => (
                        <FindingCard key={finding.id} finding={finding} index={idx} />
                      ))}
                    </div>
                  </div>

                  {/* Differential Diagnoses */}
                  {analysis.differentials.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-3">Differential Diagnoses</h3>
                      <div className="space-y-2">
                        {analysis.differentials.map((diff, idx) => (
                          <DifferentialCard key={diff.condition} differential={diff} rank={idx + 1} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-3">Recommendations</h3>
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                      <ul className="space-y-2">
                        {analysis.recommendations.map((rec, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                            <Info size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Save to Chart */}
                  <button
                    onClick={handleSaveToChart}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition-colors"
                  >
                    <CheckCircle size={20} />
                    Save Analysis to Patient Chart
                  </button>

                  {/* Disclaimer */}
                  <p className="text-xs text-slate-400 text-center">
                    AI analysis is for clinical decision support only. Model: {analysis.modelVersion} • 
                    Processing time: {analysis.processingTime}ms
                  </p>
                </>
              )}

              {status === 'error' && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                  <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                  <h3 className="font-semibold text-red-900 mb-2">Analysis Failed</h3>
                  <p className="text-sm text-red-700 mb-4">
                    Unable to analyze the image. Please try again or use a different image.
                  </p>
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* History Sidebar */}
        {showHistory && (
          <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-xl z-50 overflow-y-auto">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Image History</h3>
              <button onClick={() => setShowHistory(false)}>
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {imageHistory.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No images analyzed yet</p>
              ) : (
                imageHistory.map(item => (
                  <div
                    key={item.id}
                    className="border border-slate-200 rounded-lg overflow-hidden cursor-pointer hover:border-teal-300 transition-colors"
                    onClick={() => {
                      setSelectedImage(item.imageUrl);
                      setCategory(item.category);
                      setAnalysis(item.analysis || null);
                      setStatus(item.analysis ? 'complete' : 'idle');
                      setShowHistory(false);
                    }}
                  >
                    <img src={item.thumbnailUrl} alt="" className="w-full h-32 object-cover" />
                    <div className="p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-900 capitalize">{item.category}</span>
                        {item.analysis && <UrgencyBadge urgency={item.analysis.urgency} />}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {item.capturedAt.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClinicalImageAnalysis;
