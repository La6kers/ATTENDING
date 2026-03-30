// ============================================================
// COMPASS Standalone — Zustand Store
// Simplified assessment flow: Welcome → Demographics → CC → HPI → Results
// No ROS, medications, allergies, medical/social history
// ============================================================

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import {
  type DetailedAssessmentPhase,
  type UrgencyLevel,
  type QuickReply,
  type ChatMessage,
  type RedFlag,
  type HPIData,
  createMessage,
  generateSessionId,
  createRedFlag,
  calculateUrgencyScore,
  determineUrgencyLevel,
} from '@attending/shared/types/chat.types';

import type {
  DifferentialDiagnosisResult,
} from '@attending/shared/lib/ai/differentialDiagnosis';

// Re-export types for components
export type { DetailedAssessmentPhase, UrgencyLevel, QuickReply, ChatMessage, RedFlag, HPIData };

// Extended metadata for image messages (avoids `as any` casts)
interface CompassMessageMetadata {
  phase?: DetailedAssessmentPhase;
  quickReplies?: QuickReply[];
  isRedFlag?: boolean;
  isEmergency?: boolean;
  urgencyTrigger?: boolean;
  imageId?: string;
  imageDataUrl?: string;
  imageAnalysis?: ImageAnalysisResult;
}

function createCompassMessage(
  role: 'user' | 'assistant' | 'system',
  content: string,
  metadata?: CompassMessageMetadata
): ChatMessage {
  return createMessage(role, content, metadata as any);
}

// =============================================================================
// Compass-only phases (subset)
// =============================================================================

export type CompassPhase =
  | 'welcome'
  | 'demographics'
  | 'chiefComplaint'
  | 'hpiOnset'
  | 'hpiLocation'
  | 'hpiDuration'
  | 'hpiCharacter'
  | 'hpiSeverity'
  | 'hpiTiming'
  | 'hpiContext'
  | 'hpiModifying'
  | 'hpiAssociated'
  | 'generating'
  | 'results'
  | 'emergency';

const COMPASS_PHASES: CompassPhase[] = [
  'welcome', 'demographics', 'chiefComplaint',
  'hpiOnset', 'hpiLocation', 'hpiDuration', 'hpiCharacter',
  'hpiSeverity', 'hpiTiming', 'hpiContext', 'hpiModifying', 'hpiAssociated',
  'generating', 'results',
];

export function getCompassProgress(phase: CompassPhase): number {
  const idx = COMPASS_PHASES.indexOf(phase);
  if (idx === -1) return 0;
  return Math.round((idx / (COMPASS_PHASES.length - 1)) * 100);
}

// =============================================================================
// Red Flag Detection
// =============================================================================

const RED_FLAG_PATTERNS = [
  // === CARDIOVASCULAR ===
  { pattern: /chest pain|chest tightness|pressure in chest|chest heaviness|squeezing in chest/i, severity: 'critical' as const, flag: 'Cardiac symptoms', category: 'cardiovascular' },
  { pattern: /jaw pain.*nausea|nausea.*jaw pain|arm pain.*nausea|diaphoresis.*nausea/i, severity: 'critical' as const, flag: 'Atypical MI presentation', category: 'cardiovascular' },
  { pattern: /palpitations.*dizz|racing heart.*faint|irregular heartbeat.*short/i, severity: 'urgent' as const, flag: 'Cardiac arrhythmia symptoms', category: 'cardiovascular' },

  // === RESPIRATORY ===
  { pattern: /can'?t breathe|shortness of breath|difficulty breathing|sob|gasping/i, severity: 'critical' as const, flag: 'Respiratory distress', category: 'respiratory' },
  { pattern: /coughing.*blood|hemoptysis|blood.*sputum/i, severity: 'critical' as const, flag: 'Hemoptysis - rule out PE', category: 'respiratory' },

  // === NEUROLOGICAL ===
  { pattern: /worst headache|thunderclap|sudden severe headache/i, severity: 'critical' as const, flag: 'Severe headache - rule out SAH', category: 'neurological' },
  { pattern: /sudden weakness|face droop|facial asymmetry|slurred speech|can'?t move|one side/i, severity: 'critical' as const, flag: 'Stroke symptoms (FAST)', category: 'neurological' },
  { pattern: /confused|altered mental status|not making sense|disoriented|unresponsive/i, severity: 'critical' as const, flag: 'Altered mental status', category: 'neurological' },
  { pattern: /unconscious|passed out|fainted|syncope|blacked out/i, severity: 'urgent' as const, flag: 'Syncope/LOC', category: 'neurological' },
  { pattern: /seizure|convulsion|shaking uncontrollably/i, severity: 'urgent' as const, flag: 'Seizure activity', category: 'neurological' },
  { pattern: /sudden vision loss|can'?t see|double vision.*headache|blind/i, severity: 'urgent' as const, flag: 'Acute vision change', category: 'neurological' },
  { pattern: /numbness.*face|numbness.*arm|numbness.*leg|tingling.*one side/i, severity: 'urgent' as const, flag: 'Focal neurological deficit', category: 'neurological' },

  // === INFECTIOUS / SEPSIS ===
  { pattern: /fever.*chills.*confusion|fever.*rapid.*heart|fever.*shaking.*chills/i, severity: 'critical' as const, flag: 'Possible sepsis', category: 'infectious' },
  { pattern: /fever.*stiff neck|stiff neck.*headache.*fever|neck stiffness.*light sensitive/i, severity: 'critical' as const, flag: 'Possible meningitis', category: 'infectious' },
  { pattern: /fever.*(\d{3}|104|105)|very high fever|temperature.*10[3-9]/i, severity: 'urgent' as const, flag: 'High fever', category: 'infectious' },
  { pattern: /fever.*rash|rash.*fever.*headache|petechial|purpura/i, severity: 'critical' as const, flag: 'Fever with rash - rule out meningococcemia', category: 'infectious' },

  // === PSYCHIATRIC ===
  { pattern: /suicid|kill myself|end my life|want to die|self.?harm|hurt myself/i, severity: 'critical' as const, flag: 'Suicidal ideation - psychiatric emergency', category: 'psychiatric' },
  { pattern: /homicid|kill someone|hurt someone|harm others/i, severity: 'critical' as const, flag: 'Homicidal ideation - psychiatric emergency', category: 'psychiatric' },

  // === GASTROINTESTINAL ===
  { pattern: /blood in stool|vomiting blood|black stool|melena|hematemesis|bloody vomit/i, severity: 'urgent' as const, flag: 'GI bleeding', category: 'gastrointestinal' },
  { pattern: /severe abdominal pain|rigid abdomen|board.?like abdomen|rebound tenderness/i, severity: 'urgent' as const, flag: 'Acute abdomen', category: 'gastrointestinal' },

  // === ALLERGIC ===
  { pattern: /allergic reaction|throat swelling|anaphylaxis|tongue swelling|difficulty swallowing.*hives|can'?t swallow.*swelling/i, severity: 'critical' as const, flag: 'Anaphylaxis', category: 'allergic' },

  // === OBSTETRIC ===
  { pattern: /pregnant.*bleeding|vaginal bleeding.*pregnant|pregnant.*severe pain|ectopic/i, severity: 'critical' as const, flag: 'Pregnancy emergency', category: 'obstetric' },

  // === UROLOGICAL ===
  { pattern: /testicl.*pain|scrotal.*pain|testicl.*swol|sudden.*groin.*pain/i, severity: 'critical' as const, flag: 'Possible testicular torsion', category: 'urological' },

  // === OPHTHALMOLOGICAL ===
  { pattern: /eye pain.*vision.*headache|severe eye pain.*nausea|eye pressure.*blurred/i, severity: 'urgent' as const, flag: 'Possible acute glaucoma', category: 'ophthalmological' },

  // === METABOLIC ===
  { pattern: /diabetic.*vomiting|fruity breath|blood sugar.*very high|blood sugar.*very low|insulin.*too much/i, severity: 'critical' as const, flag: 'Diabetic emergency (DKA/hypoglycemia)', category: 'metabolic' },

  // === VASCULAR ===
  { pattern: /tearing.*pain.*back|ripping.*chest.*back|sudden.*severe.*back.*chest/i, severity: 'critical' as const, flag: 'Possible aortic dissection', category: 'vascular' },
  { pattern: /leg.*swol.*pain|calf.*pain.*swol|leg.*red.*warm.*swol/i, severity: 'urgent' as const, flag: 'Possible DVT', category: 'vascular' },

  // === SPINAL ===
  { pattern: /can'?t control.*bladder|bowel.*incontinence.*back|saddle.*numb|leg weakness.*back/i, severity: 'critical' as const, flag: 'Possible cauda equina syndrome', category: 'spinal' },
];

function detectRedFlags(text: string): RedFlag[] {
  const flags: RedFlag[] = [];
  RED_FLAG_PATTERNS.forEach(({ pattern, severity, flag, category }) => {
    if (pattern.test(text)) {
      flags.push(createRedFlag(flag, severity, text, category));
    }
  });
  return flags;
}

// =============================================================================
// Phase Config
// =============================================================================

interface PhaseConfig {
  question: string;
  quickReplies?: QuickReply[];
  nextPhase: CompassPhase;
}

const PHASE_CONFIG: Record<CompassPhase, PhaseConfig> = {
  welcome: {
    question: "Hello! I'm COMPASS, your clinical assessment assistant. I'll help gather information about your symptoms and provide a preliminary assessment. What's your name?",
    nextPhase: 'demographics',
  },
  demographics: {
    question: 'Thanks! To help us assess your condition, could you share your date of birth and gender?',
    nextPhase: 'chiefComplaint',
  },
  chiefComplaint: {
    question: 'What brings you in today? Please describe your main concern or symptoms.',
    nextPhase: 'hpiOnset',
  },
  hpiOnset: {
    question: 'When did this start? Was it sudden or gradual?',
    quickReplies: [
      { id: 'today', text: 'Today', value: 'Started today' },
      { id: 'yesterday', text: 'Yesterday', value: 'Started yesterday' },
      { id: 'few_days', text: 'Few days ago', value: 'Started a few days ago' },
      { id: 'week', text: 'About a week', value: 'Started about a week ago' },
      { id: 'longer', text: 'More than a week', value: 'Started more than a week ago' },
    ],
    nextPhase: 'hpiLocation',
  },
  hpiLocation: {
    question: 'Where exactly is the problem located? Does it stay in one place or move around?',
    nextPhase: 'hpiDuration',
  },
  hpiDuration: {
    question: 'When the symptoms occur, how long do they last?',
    quickReplies: [
      { id: 'seconds', text: 'Seconds', value: 'Lasts seconds' },
      { id: 'minutes', text: 'Minutes', value: 'Lasts minutes' },
      { id: 'hours', text: 'Hours', value: 'Lasts hours' },
      { id: 'constant', text: 'Constant', value: 'Constant/continuous' },
      { id: 'comes_goes', text: 'Comes and goes', value: 'Intermittent' },
    ],
    nextPhase: 'hpiCharacter',
  },
  hpiCharacter: {
    question: "How would you describe what you're feeling? (e.g., sharp, dull, throbbing, burning, aching, pressure)",
    quickReplies: [
      { id: 'sharp', text: 'Sharp', value: 'sharp' },
      { id: 'dull', text: 'Dull', value: 'dull' },
      { id: 'burning', text: 'Burning', value: 'burning' },
      { id: 'throbbing', text: 'Throbbing', value: 'throbbing' },
      { id: 'pressure', text: 'Pressure', value: 'pressure' },
      { id: 'aching', text: 'Aching', value: 'aching' },
    ],
    nextPhase: 'hpiSeverity',
  },
  hpiSeverity: {
    question: 'On a scale of 0-10, with 10 being the worst, how would you rate the severity?',
    quickReplies: [
      { id: 's1', text: '1-3 Mild', value: '2' },
      { id: 's2', text: '4-5 Moderate', value: '5' },
      { id: 's3', text: '6-7 Significant', value: '7' },
      { id: 's4', text: '8-9 Severe', value: '9', variant: 'warning' },
      { id: 's5', text: '10 Worst ever', value: '10', variant: 'danger' },
    ],
    nextPhase: 'hpiTiming',
  },
  hpiTiming: {
    question: 'Is it constant or does it come and go? Is there a pattern — worse at certain times of day?',
    nextPhase: 'hpiContext',
  },
  hpiContext: {
    question: 'What were you doing when this started? Any triggering events or activities?',
    nextPhase: 'hpiModifying',
  },
  hpiModifying: {
    question: 'What makes it worse? What makes it better? (movement, rest, medications, position changes, etc.)',
    nextPhase: 'hpiAssociated',
  },
  hpiAssociated: {
    question: 'Are you experiencing any other symptoms along with this? (nausea, fever, dizziness, weakness, etc.)',
    quickReplies: [
      { id: 'fever', text: 'Fever/Chills', value: 'fever' },
      { id: 'nausea', text: 'Nausea', value: 'nausea' },
      { id: 'dizziness', text: 'Dizziness', value: 'dizziness' },
      { id: 'fatigue', text: 'Fatigue', value: 'fatigue' },
      { id: 'none', text: 'None', value: 'No associated symptoms' },
    ],
    nextPhase: 'generating',
  },
  generating: {
    question: 'Analyzing your symptoms and generating your clinical assessment...',
    nextPhase: 'results',
  },
  results: {
    question: 'Your assessment is ready.',
    nextPhase: 'results',
  },
  emergency: {
    question: 'EMERGENCY: Please call 911 immediately. Your symptoms indicate a potential medical emergency.',
    nextPhase: 'results',
  },
};

// =============================================================================
// Store Interface
// =============================================================================

export interface AttachedImage {
  id: string;
  base64: string;
  dataUrl: string;
  mimeType: string;
  analysis?: ImageAnalysisResult | null;
  isAnalyzing?: boolean;
  phase: CompassPhase;
}

export interface ImageAnalysisResult {
  imageDescription: string;
  findings: string[];
  suggestedConditions: { name: string; confidence: number; reasoning: string }[];
  urgency: string;
  recommendations: string[];
  provider: string;
}

export interface CompassAssessmentData {
  sessionId: string;
  patientName?: string;
  dateOfBirth?: string;
  gender?: string;
  chiefComplaint?: string;
  hpi: HPIData;
}

interface CompassState {
  sessionId: string;
  isInitialized: boolean;
  messages: ChatMessage[];
  currentPhase: CompassPhase;
  assessmentData: CompassAssessmentData;
  urgencyLevel: UrgencyLevel;
  urgencyScore: number;
  redFlags: RedFlag[];
  isProcessing: boolean;
  showEmergencyModal: boolean;
  error: string | null;
  diagnosisResult: DifferentialDiagnosisResult | null;
  hpiNarrative: string | null;
  attachedImages: AttachedImage[];
  stagedImage: { base64: string; dataUrl: string; mimeType: string } | null;

  initializeSession: () => void;
  sendMessage: (content: string) => Promise<void>;
  handleQuickReply: (reply: QuickReply) => Promise<void>;
  setEmergencyModal: (show: boolean) => void;
  dismissEmergency: () => void;
  resetSession: () => void;
  getProgress: () => number;
  startNewAssessment: () => void;
  stageImage: (base64: string, mimeType: string) => void;
  clearStagedImage: () => void;
  sendImageMessage: (text?: string) => Promise<void>;
}

// =============================================================================
// Store
// =============================================================================

export const useCompassStore = create<CompassState>()(
  devtools(
    immer((set, get) => ({
      sessionId: '',
      isInitialized: false,
      messages: [],
      currentPhase: 'welcome' as CompassPhase,
      assessmentData: { sessionId: '', hpi: {} },
      urgencyLevel: 'standard' as UrgencyLevel,
      urgencyScore: 0,
      redFlags: [],
      isProcessing: false,
      showEmergencyModal: false,
      error: null,
      diagnosisResult: null,
      hpiNarrative: null,
      attachedImages: [],
      stagedImage: null,

      initializeSession: () => {
        const sessionId = generateSessionId();
        const config = PHASE_CONFIG.welcome;
        set((state) => {
          state.sessionId = sessionId;
          state.isInitialized = true;
          state.assessmentData = { sessionId, hpi: {} };
          state.messages = [
            createMessage('assistant', config.question, {
              phase: 'welcome' as DetailedAssessmentPhase,
              quickReplies: config.quickReplies,
            }),
          ];
        });
      },

      sendMessage: async (content: string) => {
        const { currentPhase } = get();
        if (currentPhase === 'results' || currentPhase === 'generating') return;

        const userMessage = createMessage('user', content, {
          phase: currentPhase as DetailedAssessmentPhase,
        });

        // Red flag detection (computed before set)
        const newRedFlags = detectRedFlags(content);
        const hasCritical = newRedFlags.some((f) => f.severity === 'critical');

        // Single batched state update: message + red flags + phase data
        set((state) => {
          state.messages.push(userMessage);
          state.isProcessing = true;

          // Red flags
          if (newRedFlags.length > 0) {
            state.redFlags.push(...newRedFlags);
            state.urgencyScore = calculateUrgencyScore(state.redFlags, state.assessmentData.hpi.severity);
            state.urgencyLevel = determineUrgencyLevel(state.urgencyScore, false);
          }
          if (hasCritical) {
            state.showEmergencyModal = true;
          }

          // Store data based on phase
          switch (currentPhase) {
            case 'welcome':
              state.assessmentData.patientName = content;
              break;
            case 'demographics':
              state.assessmentData.dateOfBirth = content;
              break;
            case 'chiefComplaint':
              state.assessmentData.chiefComplaint = content;
              break;
            case 'hpiOnset':
              state.assessmentData.hpi.onset = content;
              break;
            case 'hpiLocation':
              state.assessmentData.hpi.location = content;
              break;
            case 'hpiDuration':
              state.assessmentData.hpi.duration = content;
              break;
            case 'hpiCharacter':
              state.assessmentData.hpi.character = content;
              break;
            case 'hpiSeverity': {
              const severity = parseInt(content) || 5;
              state.assessmentData.hpi.severity = severity;
              state.urgencyScore = calculateUrgencyScore(state.redFlags, severity);
              state.urgencyLevel = determineUrgencyLevel(state.urgencyScore, false);
              break;
            }
            case 'hpiTiming':
              state.assessmentData.hpi.timing = content;
              break;
            case 'hpiContext':
              break;
            case 'hpiModifying': {
              const parts = content.split(/worse|better|;|,/).map(s => s.trim()).filter(Boolean);
              state.assessmentData.hpi.aggravating = [parts[0] || content];
              if (parts[1]) state.assessmentData.hpi.relieving = [parts[1]];
              break;
            }
            case 'hpiAssociated':
              state.assessmentData.hpi.associated = content
                .split(/[,;]/)
                .map((s) => s.trim())
                .filter(Boolean);
              break;
          }
        });

        // Simulate processing delay
        await new Promise((resolve) => setTimeout(resolve, 600 + Math.random() * 400));

        const phaseConfig = PHASE_CONFIG[currentPhase];
        const nextPhase = phaseConfig.nextPhase;

        // If next phase is 'generating', trigger diagnosis
        if (nextPhase === 'generating') {
          set((state) => {
            state.currentPhase = 'generating';
            state.messages.push(
              createMessage('assistant', PHASE_CONFIG.generating.question, {
                phase: 'generating' as DetailedAssessmentPhase,
              })
            );
            state.isProcessing = true;
          });

          // Call diagnosis API
          try {
            const { assessmentData, redFlags: currentRedFlags, attachedImages } = get();
            // Collect image analysis findings to enhance diagnosis
            const imageFindings = attachedImages
              .filter(img => img.analysis)
              .flatMap(img => [
                ...(img.analysis?.findings || []),
                ...(img.analysis?.suggestedConditions || []).map(c => `${c.name} (${c.confidence}% from image)`),
              ]);

            const response = await fetch('/api/diagnose', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chiefComplaint: assessmentData.chiefComplaint,
                hpi: assessmentData.hpi,
                patientName: assessmentData.patientName,
                dateOfBirth: assessmentData.dateOfBirth,
                redFlags: [
                  ...currentRedFlags.map((rf) => rf.symptom),
                  ...imageFindings,
                ],
              }),
            });

            if (!response.ok) throw new Error('Diagnosis generation failed');

            const result = await response.json();

            set((state) => {
              state.currentPhase = 'results';
              state.diagnosisResult = result.differentials;
              state.hpiNarrative = result.hpiNarrative;
              state.isProcessing = false;
              state.messages.push(
                createMessage('assistant', 'Your clinical assessment is ready. See the results below.', {
                  phase: 'results' as DetailedAssessmentPhase,
                })
              );
            });
          } catch (err) {
            set((state) => {
              state.isProcessing = false;
              state.error = err instanceof Error ? err.message : 'Failed to generate diagnosis';
              state.currentPhase = 'results';
              state.messages.push(
                createMessage('system', 'Unable to generate AI diagnosis. Showing available assessment data.')
              );
            });
          }
        } else {
          // Normal phase progression
          const nextConfig = PHASE_CONFIG[nextPhase];
          set((state) => {
            state.currentPhase = nextPhase;
            state.isProcessing = false;
            state.messages.push(
              createMessage('assistant', nextConfig.question, {
                phase: nextPhase as DetailedAssessmentPhase,
                quickReplies: nextConfig.quickReplies,
              })
            );
          });
        }
      },

      handleQuickReply: async (reply: QuickReply) => {
        await get().sendMessage(reply.value || reply.text);
      },

      setEmergencyModal: (show: boolean) => set({ showEmergencyModal: show }),

      dismissEmergency: () => {
        set((state) => {
          state.showEmergencyModal = false;
        });
      },

      stageImage: (base64: string, mimeType: string) => {
        const dataUrl = `data:${mimeType};base64,${base64}`;
        set({ stagedImage: { base64, dataUrl, mimeType } });
      },

      clearStagedImage: () => {
        set({ stagedImage: null });
      },

      sendImageMessage: async (text?: string) => {
        const { stagedImage, currentPhase, assessmentData } = get();
        if (!stagedImage) return;

        const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

        // Add user message with image
        const content = text || 'Photo attached';
        const userMsg = createCompassMessage('user', content, {
          phase: currentPhase as DetailedAssessmentPhase,
          imageId,
          imageDataUrl: stagedImage.dataUrl,
        });

        // Track image
        const newImage: AttachedImage = {
          id: imageId,
          base64: stagedImage.base64,
          dataUrl: stagedImage.dataUrl,
          mimeType: stagedImage.mimeType,
          isAnalyzing: true,
          phase: currentPhase,
        };

        set((state) => {
          state.messages.push(userMsg);
          state.attachedImages.push(newImage);
          state.stagedImage = null;
          state.isProcessing = true;
        });

        // Send to vision API
        try {
          const response = await fetch('/api/analyze-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              image: stagedImage.base64,
              mimeType: stagedImage.mimeType,
              context: {
                chiefComplaint: assessmentData.chiefComplaint,
                hpiSummary: [assessmentData.hpi.onset, assessmentData.hpi.location, assessmentData.hpi.character]
                  .filter(Boolean).join('. '),
                phase: currentPhase,
              },
            }),
          });

          const analysis = await response.json() as ImageAnalysisResult;

          // Update image with analysis
          set((state) => {
            const img = state.attachedImages.find(i => i.id === imageId);
            if (img) {
              img.analysis = analysis;
              img.isAnalyzing = false;
            }
          });

          // Add assistant message with analysis
          const analysisMsg = createCompassMessage('assistant',
            `**Image Analysis Complete**\n\n${analysis.imageDescription}\n\n` +
            (analysis.findings.length > 0 ? `**Findings:** ${analysis.findings.join(', ')}\n\n` : '') +
            (analysis.suggestedConditions.length > 0
              ? `**Possible conditions:**\n${analysis.suggestedConditions.map(c => `- ${c.name} (${c.confidence}%) — ${c.reasoning}`).join('\n')}\n\n`
              : '') +
            (analysis.recommendations.length > 0 ? `**Recommendations:** ${analysis.recommendations.join('; ')}` : ''),
            { phase: currentPhase as DetailedAssessmentPhase, imageAnalysis: analysis, imageId }
          );

          set((state) => {
            state.isProcessing = false;
            state.messages.push(analysisMsg);

            // Add follow-up prompt to continue assessment
            state.messages.push(
              createMessage('assistant',
                'Photo received and analyzed. You can add more photos or continue with the assessment. ' +
                (state.currentPhase === 'chiefComplaint'
                  ? 'Please also describe your symptoms in words.'
                  : 'Let\'s continue where we left off.'),
                { phase: currentPhase as DetailedAssessmentPhase }
              )
            );
          });
        } catch (err) {
          set((state) => {
            const img = state.attachedImages.find(i => i.id === imageId);
            if (img) img.isAnalyzing = false;
            state.isProcessing = false;
            state.messages.push(
              createMessage('assistant',
                'Photo received. AI analysis is currently unavailable, but the image has been saved for your assessment.',
                { phase: currentPhase as DetailedAssessmentPhase }
              )
            );
          });
        }
      },

      resetSession: () => {
        set({
          sessionId: '',
          isInitialized: false,
          messages: [],
          currentPhase: 'welcome' as CompassPhase,
          assessmentData: { sessionId: '', hpi: {} },
          urgencyLevel: 'standard' as UrgencyLevel,
          urgencyScore: 0,
          redFlags: [],
          isProcessing: false,
          showEmergencyModal: false,
          error: null,
          diagnosisResult: null,
          hpiNarrative: null,
          attachedImages: [],
          stagedImage: null,
        });
      },

      getProgress: () => {
        return getCompassProgress(get().currentPhase);
      },

      startNewAssessment: () => {
        get().resetSession();
        get().initializeSession();
      },
    })),
    { name: 'compass-standalone-store' }
  )
);

export default useCompassStore;
