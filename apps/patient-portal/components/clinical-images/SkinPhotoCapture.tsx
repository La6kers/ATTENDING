// ============================================================
// ATTENDING AI - Skin Photo Capture Component
// apps/patient-portal/components/clinical-images/SkinPhotoCapture.tsx
//
// 3-view standardized photo capture for skin complaints.
// Used within COMPASS when patient reports a rash, lesion,
// or skin-related chief complaint.
//
// Flow:
// 1. Patient taps affected body region on silhouette
// 2. Guided 3-photo capture: close-up, body part, wide context
// 3. Photos sent to AI for preliminary analysis
// 4. Results forwarded to provider's derm specialty view
//
// API-ready: All image data flows through /api/clinical-images/*
// Currently uses mock AI analysis; swap for real endpoint when ready.
// ============================================================

import React, { useState, useRef, useCallback } from 'react';
import {
  Camera,
  Check,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  Sparkles,
  RotateCcw,
  X,
  ZoomIn,
  Maximize2,
  User,
  Loader2,
} from 'lucide-react';

// ============================================================
// Types
// ============================================================

export type ViewType = 'CLOSEUP' | 'BODY_PART' | 'WIDE_CONTEXT';

export interface CapturedPhoto {
  viewType: ViewType;
  dataUrl: string;
  timestamp: string;
}

export interface AIAnalysisResult {
  primaryAssessment: string;
  confidence: number;
  differential: string[];
  urgency: 'routine' | 'soon' | 'urgent';
  recommendations: string[];
  bodyRegion: string;
}

export interface SkinPhotoSubmission {
  bodyRegion: string;
  photos: CapturedPhoto[];
  aiAnalysis: AIAnalysisResult | null;
  patientNotes: string;
}

interface SkinPhotoCaptureProps {
  /** Called when all 3 photos are captured and AI analysis is complete */
  onComplete: (submission: SkinPhotoSubmission) => void;
  /** Called to dismiss without completing */
  onCancel: () => void;
  /** Chief complaint text for AI context */
  chiefComplaint?: string;
}

// ============================================================
// Body Regions
// ============================================================

interface BodyRegion {
  id: string;
  label: string;
  x: number;
  y: number;
  hitRadius: number;
}

const BODY_REGIONS: BodyRegion[] = [
  { id: 'SCALP', label: 'Scalp', x: 50, y: 6, hitRadius: 6 },
  { id: 'FACE', label: 'Face', x: 50, y: 13, hitRadius: 5 },
  { id: 'NECK', label: 'Neck', x: 50, y: 20, hitRadius: 4 },
  { id: 'CHEST', label: 'Chest', x: 50, y: 30, hitRadius: 7 },
  { id: 'ABDOMEN', label: 'Abdomen', x: 50, y: 42, hitRadius: 7 },
  { id: 'UPPER_BACK', label: 'Upper Back', x: 50, y: 28, hitRadius: 6 },
  { id: 'LOWER_BACK', label: 'Lower Back', x: 50, y: 45, hitRadius: 6 },
  { id: 'ARM_L', label: 'Left Arm', x: 28, y: 38, hitRadius: 6 },
  { id: 'ARM_R', label: 'Right Arm', x: 72, y: 38, hitRadius: 6 },
  { id: 'HAND_L', label: 'Left Hand', x: 22, y: 52, hitRadius: 5 },
  { id: 'HAND_R', label: 'Right Hand', x: 78, y: 52, hitRadius: 5 },
  { id: 'GROIN', label: 'Groin', x: 50, y: 54, hitRadius: 5 },
  { id: 'THIGH_L', label: 'Left Thigh', x: 40, y: 64, hitRadius: 6 },
  { id: 'THIGH_R', label: 'Right Thigh', x: 60, y: 64, hitRadius: 6 },
  { id: 'SHIN_L', label: 'Left Shin', x: 40, y: 78, hitRadius: 5 },
  { id: 'SHIN_R', label: 'Right Shin', x: 60, y: 78, hitRadius: 5 },
  { id: 'FOOT_L', label: 'Left Foot', x: 40, y: 92, hitRadius: 4 },
  { id: 'FOOT_R', label: 'Right Foot', x: 60, y: 92, hitRadius: 4 },
];

// ============================================================
// View step definitions
// ============================================================

const VIEW_STEPS: { type: ViewType; label: string; icon: React.ElementType; instruction: string }[] = [
  {
    type: 'CLOSEUP',
    label: 'Close-up',
    icon: ZoomIn,
    instruction: 'Take a close-up photo of the affected area (6-8 inches away). Focus on the lesion/rash details.',
  },
  {
    type: 'BODY_PART',
    label: 'Body Part',
    icon: Maximize2,
    instruction: 'Step back and capture the entire body part (e.g., full hand, full arm, full face).',
  },
  {
    type: 'WIDE_CONTEXT',
    label: 'Wide View',
    icon: User,
    instruction: 'Take a wide photo showing where on the body the affected area is located.',
  },
];

// ============================================================
// Mock AI Analysis — replace with real API call
// ============================================================

async function analyzePhotos(
  photos: CapturedPhoto[],
  bodyRegion: string,
  chiefComplaint?: string,
): Promise<AIAnalysisResult> {
  // TODO: POST /api/clinical-images/analyze
  // Body: { photos (base64), bodyRegion, chiefComplaint, patientId }
  // Returns: AIAnalysisResult from vision model

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 2500));

  // Mock response — varies by body region for demo realism
  const analyses: Record<string, AIAnalysisResult> = {
    default: {
      primaryAssessment: 'Erythematous papular rash — pattern consistent with contact dermatitis',
      confidence: 0.78,
      differential: [
        'Allergic contact dermatitis (78%)',
        'Eczema / atopic dermatitis (62%)',
        'Irritant dermatitis (45%)',
        'Drug eruption (20%)',
      ],
      urgency: 'routine',
      recommendations: [
        'Recommend in-person dermatology evaluation within 2 weeks',
        'Topical hydrocortisone 1% may provide symptomatic relief',
        'Advise patient to avoid suspected irritants/allergens',
        'Photo set forwarded to provider for review',
      ],
      bodyRegion,
    },
    FACE: {
      primaryAssessment: 'Facial rash with malar distribution — rule out lupus butterfly rash vs rosacea',
      confidence: 0.72,
      differential: [
        'Rosacea (72%)',
        'Seborrheic dermatitis (58%)',
        'Lupus malar rash (35%)',
        'Contact dermatitis (22%)',
      ],
      urgency: 'soon',
      recommendations: [
        'Recommend provider evaluation within 1 week given malar pattern',
        'Consider ANA panel if lupus suspected',
        'Avoid sun exposure; use SPF 30+ sunscreen',
        'Photo set flagged for expedited review',
      ],
      bodyRegion,
    },
    SHIN_L: {
      primaryAssessment: 'Lower extremity lesion — assess for venous stasis changes vs cellulitis',
      confidence: 0.68,
      differential: [
        'Stasis dermatitis (68%)',
        'Cellulitis (42%)',
        'Insect bite reaction (35%)',
        'Psoriasis (25%)',
      ],
      urgency: 'soon',
      recommendations: [
        'Monitor for warmth, spreading redness, or fever (cellulitis signs)',
        'Elevate leg when resting',
        'If signs of infection develop, seek same-day evaluation',
        'Photo set forwarded to provider with urgency flag',
      ],
      bodyRegion,
    },
    SHIN_R: {
      primaryAssessment: 'Lower extremity lesion — assess for venous stasis changes vs cellulitis',
      confidence: 0.68,
      differential: [
        'Stasis dermatitis (68%)',
        'Cellulitis (42%)',
        'Insect bite reaction (35%)',
        'Psoriasis (25%)',
      ],
      urgency: 'soon',
      recommendations: [
        'Monitor for warmth, spreading redness, or fever (cellulitis signs)',
        'Elevate leg when resting',
        'If signs of infection develop, seek same-day evaluation',
        'Photo set forwarded to provider with urgency flag',
      ],
      bodyRegion,
    },
  };

  return analyses[bodyRegion] || analyses.default;
}

// ============================================================
// Component
// ============================================================

export function SkinPhotoCapture({ onComplete, onCancel, chiefComplaint }: SkinPhotoCaptureProps) {
  const [step, setStep] = useState<'region' | 'capture' | 'analyzing' | 'results'>('region');
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState(0);
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [notes, setNotes] = useState('');
  const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const BRAND = {
    navy: '#0C3547',
    teal: '#1A8FA8',
    tealAccent: '#25B8A9',
    tealLight: '#E6F7F5',
    gold: '#c8a44e',
    coral: '#e07a5f',
  };

  // Handle file/camera capture
  const handleCapture = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onloadend = () => {
        const newPhoto: CapturedPhoto = {
          viewType: VIEW_STEPS[currentView].type,
          dataUrl: reader.result as string,
          timestamp: new Date().toISOString(),
        };

        const updated = [...photos, newPhoto];
        setPhotos(updated);

        if (currentView < 2) {
          setCurrentView(currentView + 1);
        } else {
          // All 3 photos captured — run AI analysis
          setStep('analyzing');
          analyzePhotos(updated, selectedRegion!, chiefComplaint).then((result) => {
            setAiResult(result);
            setStep('results');
          });
        }
      };
      reader.readAsDataURL(file);

      // Reset input so same file can be re-selected
      e.target.value = '';
    },
    [currentView, photos, selectedRegion, chiefComplaint],
  );

  const handleRetake = () => {
    setPhotos(photos.slice(0, -1));
    setCurrentView(Math.max(0, currentView - 1));
  };

  const handleSubmit = () => {
    onComplete({
      bodyRegion: selectedRegion!,
      photos,
      aiAnalysis: aiResult,
      patientNotes: notes,
    });
  };

  // ============================================================
  // Step 1: Body Region Selection
  // ============================================================
  if (step === 'region') {
    return (
      <div style={{ background: '#FFFFFF', borderRadius: 16, overflow: 'hidden' }}>
        {/* Header */}
        <div
          style={{
            background: `linear-gradient(135deg, ${BRAND.navy}, ${BRAND.teal})`,
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h3 style={{ color: '#FFFFFF', fontSize: 16, fontWeight: 700, margin: 0 }}>Where is the skin concern?</h3>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: '4px 0 0' }}>
              Tap the area on the body below
            </p>
          </div>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X style={{ width: 20, height: 20, color: 'rgba(255,255,255,0.6)' }} />
          </button>
        </div>

        {/* Body Map */}
        <div style={{ padding: 20, display: 'flex', justifyContent: 'center' }}>
          <div style={{ position: 'relative', width: 240, height: 420 }}>
            <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
              {/* Body outline */}
              <circle cx="50" cy="8" r="6" fill="none" stroke={BRAND.navy} strokeWidth="0.6" opacity="0.25" />
              <path d="M42,14 L42,50 L58,50 L58,14" fill="none" stroke={BRAND.navy} strokeWidth="0.6" opacity="0.25" />
              <path d="M42,18 L26,35 L22,48" fill="none" stroke={BRAND.navy} strokeWidth="0.6" opacity="0.25" />
              <path d="M58,18 L74,35 L78,48" fill="none" stroke={BRAND.navy} strokeWidth="0.6" opacity="0.25" />
              <path d="M45,50 L42,75 L40,95" fill="none" stroke={BRAND.navy} strokeWidth="0.6" opacity="0.25" />
              <path d="M55,50 L58,75 L60,95" fill="none" stroke={BRAND.navy} strokeWidth="0.6" opacity="0.25" />
            </svg>

            {/* Clickable regions */}
            {BODY_REGIONS.map((region) => (
              <button
                key={region.id}
                onClick={() => {
                  setSelectedRegion(region.id);
                  setStep('capture');
                }}
                style={{
                  position: 'absolute',
                  left: `${region.x}%`,
                  top: `${region.y}%`,
                  transform: 'translate(-50%, -50%)',
                  width: region.hitRadius * 5,
                  height: region.hitRadius * 5,
                  borderRadius: '50%',
                  background: `${BRAND.teal}20`,
                  border: `2px solid ${BRAND.teal}60`,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  padding: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = `${BRAND.teal}40`;
                  e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = `${BRAND.teal}20`;
                  e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)';
                }}
                title={region.label}
              />
            ))}
          </div>
        </div>

        {/* Region labels grid for accessibility */}
        <div style={{ padding: '0 20px 20px', display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
          {BODY_REGIONS.map((r) => (
            <button
              key={r.id}
              onClick={() => {
                setSelectedRegion(r.id);
                setStep('capture');
              }}
              style={{
                padding: '4px 10px',
                borderRadius: 16,
                border: `1px solid ${BRAND.teal}30`,
                background: '#FFFFFF',
                color: BRAND.navy,
                fontSize: 11,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = BRAND.tealLight;
                e.currentTarget.style.borderColor = BRAND.teal;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#FFFFFF';
                e.currentTarget.style.borderColor = `${BRAND.teal}30`;
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ============================================================
  // Step 2: 3-View Photo Capture
  // ============================================================
  if (step === 'capture') {
    const viewStep = VIEW_STEPS[currentView];
    const ViewIcon = viewStep.icon;
    const regionLabel = BODY_REGIONS.find((r) => r.id === selectedRegion)?.label || selectedRegion;

    return (
      <div style={{ background: '#FFFFFF', borderRadius: 16, overflow: 'hidden' }}>
        {/* Header */}
        <div
          style={{
            background: `linear-gradient(135deg, ${BRAND.navy}, ${BRAND.teal})`,
            padding: '16px 20px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <button
              onClick={() => {
                if (currentView > 0) {
                  handleRetake();
                } else {
                  setStep('region');
                  setPhotos([]);
                  setCurrentView(0);
                }
              }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}
            >
              <ChevronLeft style={{ width: 16, height: 16 }} /> Back
            </button>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{regionLabel}</span>
            <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <X style={{ width: 18, height: 18, color: 'rgba(255,255,255,0.6)' }} />
            </button>
          </div>

          {/* Progress dots */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 12 }}>
            {VIEW_STEPS.map((vs, i) => (
              <div
                key={i}
                style={{
                  width: i === currentView ? 28 : 8,
                  height: 8,
                  borderRadius: 4,
                  background: i < currentView ? '#25B8A9' : i === currentView ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
                  transition: 'all 0.2s',
                }}
              />
            ))}
          </div>

          <h3 style={{ color: '#FFFFFF', fontSize: 16, fontWeight: 700, margin: 0, textAlign: 'center' }}>
            Photo {currentView + 1} of 3: {viewStep.label}
          </h3>
        </div>

        {/* Instruction + capture area */}
        <div style={{ padding: 20 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: 14,
              background: BRAND.tealLight,
              borderRadius: 10,
              marginBottom: 20,
            }}
          >
            <ViewIcon style={{ width: 20, height: 20, color: BRAND.teal, flexShrink: 0 }} />
            <p style={{ margin: 0, fontSize: 13, color: BRAND.navy, lineHeight: 1.5 }}>{viewStep.instruction}</p>
          </div>

          {/* Preview of captured photo or capture button */}
          {photos[currentView] ? (
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <img
                src={photos[currentView].dataUrl}
                alt={viewStep.label}
                style={{ width: '100%', borderRadius: 12, maxHeight: 300, objectFit: 'cover' }}
              />
              <button
                onClick={handleRetake}
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  background: 'rgba(0,0,0,0.6)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 8,
                  padding: '6px 12px',
                  fontSize: 12,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <RotateCcw style={{ width: 14, height: 14 }} /> Retake
              </button>
            </div>
          ) : (
            <button
              onClick={handleCapture}
              style={{
                width: '100%',
                height: 200,
                borderRadius: 12,
                border: `2px dashed ${BRAND.teal}`,
                background: `${BRAND.teal}08`,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                transition: 'all 0.15s',
              }}
            >
              <Camera style={{ width: 32, height: 32, color: BRAND.teal }} />
              <span style={{ fontSize: 15, fontWeight: 600, color: BRAND.navy }}>Tap to take photo</span>
              <span style={{ fontSize: 12, color: '#64748b' }}>or choose from gallery</span>
            </button>
          )}

          {/* Thumbnails of completed photos */}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            {VIEW_STEPS.map((vs, i) => (
              <div
                key={i}
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 8,
                  border: i === currentView ? `2px solid ${BRAND.teal}` : '1px solid #e2e8f0',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: photos[i] ? 'transparent' : '#f1f5f9',
                }}
              >
                {photos[i] ? (
                  <img src={photos[i].dataUrl} alt={vs.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <vs.icon style={{ width: 20, height: 20, color: i === currentView ? BRAND.teal : '#cbd5e1' }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </div>
    );
  }

  // ============================================================
  // Step 3: AI Analyzing
  // ============================================================
  if (step === 'analyzing') {
    return (
      <div style={{ background: '#FFFFFF', borderRadius: 16, overflow: 'hidden' }}>
        <div
          style={{
            background: `linear-gradient(135deg, ${BRAND.navy}, ${BRAND.teal})`,
            padding: '16px 20px',
          }}
        >
          <h3 style={{ color: '#FFFFFF', fontSize: 16, fontWeight: 700, margin: 0, textAlign: 'center' }}>
            Analyzing Photos
          </h3>
        </div>

        <div style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${BRAND.teal}, ${BRAND.navy})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Loader2 style={{ width: 32, height: 32, color: '#FFFFFF', animation: 'spin 1s linear infinite' }} />
            </div>
          </div>
          <p style={{ fontSize: 16, fontWeight: 600, color: BRAND.navy, marginBottom: 8 }}>
            AI is reviewing your photos...
          </p>
          <p style={{ fontSize: 13, color: '#64748b' }}>
            This typically takes a few seconds. Your provider will also review these images.
          </p>

          {/* Photo thumbnails */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 24 }}>
            {photos.map((p, i) => (
              <img
                key={i}
                src={p.dataUrl}
                alt={VIEW_STEPS[i]?.label}
                style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover', border: '2px solid #e2e8f0' }}
              />
            ))}
          </div>
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ============================================================
  // Step 4: AI Results
  // ============================================================
  if (step === 'results' && aiResult) {
    const urgencyColors = {
      routine: { bg: '#dcfce7', text: '#059669', label: 'Routine' },
      soon: { bg: '#fef3c7', text: '#d97706', label: 'Schedule Soon' },
      urgent: { bg: '#fee2e2', text: '#dc2626', label: 'Urgent' },
    };
    const uc = urgencyColors[aiResult.urgency];
    const regionLabel = BODY_REGIONS.find((r) => r.id === selectedRegion)?.label || selectedRegion;

    return (
      <div style={{ background: '#FFFFFF', borderRadius: 16, overflow: 'hidden' }}>
        {/* Header */}
        <div
          style={{
            background: `linear-gradient(135deg, ${BRAND.navy}, ${BRAND.teal})`,
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sparkles style={{ width: 20, height: 20, color: BRAND.gold }} />
            <h3 style={{ color: '#FFFFFF', fontSize: 16, fontWeight: 700, margin: 0 }}>AI Assessment</h3>
          </div>
          <span
            style={{
              background: uc.bg,
              color: uc.text,
              padding: '4px 12px',
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {uc.label}
          </span>
        </div>

        <div style={{ padding: 20 }}>
          {/* Disclaimer */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              padding: 10,
              background: '#fef3c7',
              borderRadius: 8,
              marginBottom: 16,
              alignItems: 'center',
            }}
          >
            <AlertTriangle style={{ width: 16, height: 16, color: '#d97706', flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: '#92400e' }}>
              This is AI-assisted preliminary analysis only. Your provider will review these images and provide a clinical assessment.
            </span>
          </div>

          {/* Photos */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {photos.map((p, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                <img
                  src={p.dataUrl}
                  alt={VIEW_STEPS[i]?.label}
                  style={{ width: '100%', height: 80, borderRadius: 8, objectFit: 'cover', border: '1px solid #e2e8f0' }}
                />
                <span style={{ fontSize: 10, color: '#94a3b8' }}>{VIEW_STEPS[i]?.label}</span>
              </div>
            ))}
          </div>

          {/* Primary assessment */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4, fontWeight: 500 }}>
              Region: {regionLabel} | Confidence: {Math.round(aiResult.confidence * 100)}%
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: BRAND.navy, margin: 0, lineHeight: 1.5 }}>
              {aiResult.primaryAssessment}
            </p>
          </div>

          {/* Differential */}
          <div style={{ marginBottom: 16 }}>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: BRAND.navy, marginBottom: 8 }}>Possible Conditions</h4>
            {aiResult.differential.map((d, i) => (
              <div
                key={i}
                style={{
                  padding: '6px 10px',
                  background: i === 0 ? BRAND.tealLight : '#f8fafc',
                  borderRadius: 6,
                  marginBottom: 4,
                  fontSize: 13,
                  color: BRAND.navy,
                }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Recommendations */}
          <div style={{ marginBottom: 16 }}>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: BRAND.navy, marginBottom: 8 }}>Recommendations</h4>
            {aiResult.recommendations.map((r, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'flex-start' }}>
                <Check style={{ width: 14, height: 14, color: BRAND.tealAccent, flexShrink: 0, marginTop: 2 }} />
                <span style={{ fontSize: 13, color: '#334155', lineHeight: 1.4 }}>{r}</span>
              </div>
            ))}
          </div>

          {/* Patient notes */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: BRAND.navy, display: 'block', marginBottom: 4 }}>
              Add notes for your provider (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="When did this start? Has it changed? Any itching, pain, or bleeding?"
              style={{
                width: '100%',
                minHeight: 70,
                padding: 10,
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                fontSize: 13,
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            style={{
              width: '100%',
              padding: '14px 20px',
              borderRadius: 10,
              border: 'none',
              background: `linear-gradient(135deg, ${BRAND.teal}, ${BRAND.navy})`,
              color: '#FFFFFF',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            Send to Provider <ChevronRight style={{ width: 18, height: 18 }} />
          </button>
        </div>
      </div>
    );
  }

  return null;
}

export default SkinPhotoCapture;
