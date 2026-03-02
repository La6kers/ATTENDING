// ============================================================
// ATTENDING AI - Ambient Clinical Intelligence
// apps/provider-portal/components/ambient/AmbientDocumentation.tsx
//
// Phase 8C: Auto-generate clinical documentation from conversations
// The feature that saves 1-2 hours per day per provider
// ============================================================

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Play,
  Pause,
  Square,
  Volume2,
  VolumeX,
  FileText,
  CheckCircle,
  AlertCircle,
  Edit3,
  Save,
  RotateCcw,
  Clock,
  User,
  Stethoscope,
  Activity,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Send,
  Copy,
  Download,
  Settings,
  Wand2,
} from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

export type RecordingState = 'idle' | 'recording' | 'paused' | 'processing' | 'complete';

export type Speaker = 'provider' | 'patient' | 'unknown';

export interface TranscriptSegment {
  id: string;
  speaker: Speaker;
  text: string;
  timestamp: number;
  confidence: number;
  clinicalEntities?: ClinicalEntity[];
}

export interface ClinicalEntity {
  type: 'symptom' | 'duration' | 'severity' | 'medication' | 'condition' | 'vital' | 'allergy' | 'procedure';
  text: string;
  normalizedValue?: string;
  code?: string; // ICD-10, RxNorm, etc.
}

export interface SOAPNote {
  subjective: {
    chiefComplaint: string;
    hpi: string;
    ros: Record<string, string>;
    pmh: string[];
    medications: string[];
    allergies: string[];
    socialHistory: string;
    familyHistory: string;
  };
  objective: {
    vitals: Record<string, string>;
    physicalExam: Record<string, string>;
    labResults?: string[];
  };
  assessment: {
    diagnoses: Array<{
      description: string;
      icd10?: string;
      isPrimary: boolean;
    }>;
    differentials?: string[];
  };
  plan: {
    items: Array<{
      category: 'medication' | 'lab' | 'imaging' | 'referral' | 'education' | 'follow-up' | 'procedure';
      description: string;
      details?: string;
    }>;
  };
  generated: Date;
  confidence: number;
}

export interface AmbientSession {
  id: string;
  patientId: string;
  patientName: string;
  providerId: string;
  startTime: Date;
  endTime?: Date;
  duration: number;
  transcript: TranscriptSegment[];
  soapNote?: SOAPNote;
  status: RecordingState;
}

// ============================================================
// MOCK NLP PROCESSING
// ============================================================

const extractClinicalEntities = (text: string): ClinicalEntity[] => {
  const entities: ClinicalEntity[] = [];
  
  // Symptom patterns
  const symptomPatterns = [
    /(?:have|having|feel|feeling|experience|experiencing)\s+(?:a\s+)?(\w+(?:\s+\w+)?)/gi,
    /(\w+)\s+(?:pain|ache|discomfort)/gi,
    /(headache|cough|fever|nausea|fatigue|dizziness)/gi,
  ];
  
  symptomPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      entities.push({
        type: 'symptom',
        text: match[1] || match[0],
      });
    }
  });

  // Duration patterns
  const durationMatch = text.match(/(?:for|since|about|approximately)\s+(\d+\s+(?:day|week|month|hour|year)s?)/i);
  if (durationMatch) {
    entities.push({
      type: 'duration',
      text: durationMatch[1],
    });
  }

  // Severity patterns
  const severityMatch = text.match(/(mild|moderate|severe|worst|better|worse|10\/10|[0-9]\/10)/i);
  if (severityMatch) {
    entities.push({
      type: 'severity',
      text: severityMatch[1],
    });
  }

  // Medication patterns
  const medicationPatterns = /(aspirin|ibuprofen|tylenol|acetaminophen|lisinopril|metformin|atorvastatin|omeprazole|amlodipine|metoprolol)/gi;
  let medMatch;
  while ((medMatch = medicationPatterns.exec(text)) !== null) {
    entities.push({
      type: 'medication',
      text: medMatch[1],
    });
  }

  return entities;
};

const generateSOAPNote = (transcript: TranscriptSegment[], patientName: string): SOAPNote => {
  // Combine all text for analysis
  const patientText = transcript
    .filter(s => s.speaker === 'patient')
    .map(s => s.text)
    .join(' ');
  
  const allEntities = transcript.flatMap(s => s.clinicalEntities || []);
  const symptoms = allEntities.filter(e => e.type === 'symptom').map(e => e.text);
  const medications = allEntities.filter(e => e.type === 'medication').map(e => e.text);
  const duration = allEntities.find(e => e.type === 'duration')?.text || 'not specified';
  const severity = allEntities.find(e => e.type === 'severity')?.text || 'not specified';

  // Generate HPI
  const chiefComplaint = symptoms[0] || 'General evaluation';
  const hpi = `${patientName} is a patient presenting with ${symptoms.join(', ') || 'symptoms'} for ${duration}. ` +
    `Patient describes severity as ${severity}. ` +
    `${medications.length > 0 ? `Patient reports taking ${medications.join(', ')}.` : ''}`;

  return {
    subjective: {
      chiefComplaint,
      hpi,
      ros: {
        constitutional: 'Denies fever, chills, weight changes',
        cardiovascular: 'Denies chest pain, palpitations',
        respiratory: 'Denies shortness of breath, cough',
        gastrointestinal: 'Denies nausea, vomiting, diarrhea',
        musculoskeletal: 'See HPI',
        neurological: 'Denies headache, dizziness, numbness',
        psychiatric: 'Denies anxiety, depression',
      },
      pmh: ['Review in chart'],
      medications: medications.length > 0 ? medications : ['Review in chart'],
      allergies: ['NKDA - verify in chart'],
      socialHistory: 'See chart for details',
      familyHistory: 'See chart for details',
    },
    objective: {
      vitals: {
        bp: 'Pending',
        hr: 'Pending',
        temp: 'Pending',
        rr: 'Pending',
        o2sat: 'Pending',
      },
      physicalExam: {
        general: 'Alert, oriented, no acute distress',
        heent: 'Normocephalic, PERRLA, oropharynx clear',
        cardiovascular: 'RRR, no murmurs',
        respiratory: 'Clear to auscultation bilaterally',
        abdomen: 'Soft, non-tender, non-distended',
        extremities: 'No edema, pulses intact',
        neurological: 'CN II-XII intact, strength 5/5 throughout',
      },
    },
    assessment: {
      diagnoses: [
        {
          description: chiefComplaint,
          isPrimary: true,
        },
      ],
      differentials: [],
    },
    plan: {
      items: [
        {
          category: 'follow-up',
          description: 'Return for follow-up as needed',
          details: 'Patient to call if symptoms worsen',
        },
      ],
    },
    generated: new Date(),
    confidence: 85,
  };
};

// ============================================================
// COMPONENTS
// ============================================================

const TranscriptSegmentView: React.FC<{
  segment: TranscriptSegment;
  isEditing: boolean;
  onEdit: (id: string, text: string) => void;
}> = ({ segment, isEditing, onEdit }) => {
  const [editText, setEditText] = useState(segment.text);

  const speakerConfig = {
    provider: { icon: Stethoscope, color: 'text-teal-600', bg: 'bg-teal-100', label: 'Provider' },
    patient: { icon: User, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Patient' },
    unknown: { icon: User, color: 'text-slate-600', bg: 'bg-slate-100', label: 'Unknown' },
  };

  const config = speakerConfig[segment.speaker];
  const Icon = config.icon;

  const formatTimestamp = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`flex gap-3 p-3 rounded-lg ${segment.speaker === 'provider' ? 'bg-teal-50' : 'bg-blue-50'}`}>
      <div className={`w-8 h-8 rounded-full ${config.bg} flex items-center justify-center flex-shrink-0`}>
        <Icon size={16} className={config.color} />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
          <span className="text-xs text-slate-400">{formatTimestamp(segment.timestamp)}</span>
          {segment.confidence < 0.8 && (
            <span className="text-xs text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
              Low confidence
            </span>
          )}
        </div>
        {isEditing ? (
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={() => onEdit(segment.id, editText)}
            className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            rows={2}
          />
        ) : (
          <p className="text-sm text-slate-700">{segment.text}</p>
        )}
        {segment.clinicalEntities && segment.clinicalEntities.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {segment.clinicalEntities.map((entity, idx) => (
              <span
                key={idx}
                className={`text-xs px-2 py-0.5 rounded-full ${
                  entity.type === 'symptom' ? 'bg-red-100 text-red-700' :
                  entity.type === 'medication' ? 'bg-green-100 text-green-700' :
                  entity.type === 'duration' ? 'bg-blue-100 text-blue-700' :
                  entity.type === 'severity' ? 'bg-amber-100 text-amber-700' :
                  'bg-slate-100 text-slate-700'
                }`}
              >
                {entity.type}: {entity.text}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const SOAPNoteEditor: React.FC<{
  note: SOAPNote;
  onUpdate: (note: SOAPNote) => void;
  onSave: () => void;
}> = ({ note, onUpdate, onSave }) => {
  const [activeSection, setActiveSection] = useState<'S' | 'O' | 'A' | 'P'>('S');
  const [isEditing, setIsEditing] = useState(false);

  const sections = [
    { key: 'S' as const, label: 'Subjective', icon: User },
    { key: 'O' as const, label: 'Objective', icon: Activity },
    { key: 'A' as const, label: 'Assessment', icon: FileText },
    { key: 'P' as const, label: 'Plan', icon: CheckCircle },
  ];

  const updateSubjective = (field: string, value: any) => {
    onUpdate({
      ...note,
      subjective: { ...note.subjective, [field]: value },
    });
  };

  const updateObjective = (field: string, value: any) => {
    onUpdate({
      ...note,
      objective: { ...note.objective, [field]: value },
    });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-gradient-to-r from-teal-50 to-teal-50/50">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-teal-600" />
          <h3 className="font-semibold text-slate-900">AI-Generated SOAP Note</h3>
          <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">
            {note.confidence}% confidence
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              isEditing ? 'bg-teal-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            <Edit3 size={14} />
            {isEditing ? 'Done Editing' : 'Edit'}
          </button>
          <button
            onClick={onSave}
            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            <Save size={14} />
            Save to Chart
          </button>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex border-b border-slate-100">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <button
              key={section.key}
              onClick={() => setActiveSection(section.key)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeSection === section.key
                  ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Icon size={16} />
              {section.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="p-4 max-h-[500px] overflow-y-auto">
        {activeSection === 'S' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Chief Complaint</label>
              {isEditing ? (
                <input
                  type="text"
                  value={note.subjective.chiefComplaint}
                  onChange={(e) => updateSubjective('chiefComplaint', e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              ) : (
                <p className="text-slate-900">{note.subjective.chiefComplaint}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">History of Present Illness</label>
              {isEditing ? (
                <textarea
                  value={note.subjective.hpi}
                  onChange={(e) => updateSubjective('hpi', e.target.value)}
                  rows={4}
                  className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              ) : (
                <p className="text-slate-900">{note.subjective.hpi}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Review of Systems</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(note.subjective.ros).map(([system, finding]) => (
                  <div key={system} className="p-2 bg-slate-50 rounded-lg">
                    <span className="text-xs font-medium text-slate-500 capitalize">{system}</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={finding}
                        onChange={(e) => updateSubjective('ros', { ...note.subjective.ros, [system]: e.target.value })}
                        className="w-full mt-1 p-1 text-sm border border-slate-200 rounded"
                      />
                    ) : (
                      <p className="text-sm text-slate-700">{finding}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeSection === 'O' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Vital Signs</label>
              <div className="grid grid-cols-5 gap-2">
                {Object.entries(note.objective.vitals).map(([vital, value]) => (
                  <div key={vital} className="p-2 bg-slate-50 rounded-lg text-center">
                    <span className="text-xs font-medium text-slate-500 uppercase">{vital}</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => updateObjective('vitals', { ...note.objective.vitals, [vital]: e.target.value })}
                        className="w-full mt-1 p-1 text-sm border border-slate-200 rounded text-center"
                      />
                    ) : (
                      <p className="text-sm font-medium text-slate-900">{value}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Physical Examination</label>
              <div className="space-y-2">
                {Object.entries(note.objective.physicalExam).map(([system, finding]) => (
                  <div key={system} className="p-2 bg-slate-50 rounded-lg">
                    <span className="text-xs font-medium text-slate-500 capitalize">{system}</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={finding}
                        onChange={(e) => updateObjective('physicalExam', { ...note.objective.physicalExam, [system]: e.target.value })}
                        className="w-full mt-1 p-1 text-sm border border-slate-200 rounded"
                      />
                    ) : (
                      <p className="text-sm text-slate-700">{finding}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeSection === 'A' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Diagnoses</label>
              <div className="space-y-2">
                {note.assessment.diagnoses.map((dx, idx) => (
                  <div key={idx} className={`p-3 rounded-lg ${dx.isPrimary ? 'bg-teal-50 border border-teal-200' : 'bg-slate-50'}`}>
                    {dx.isPrimary && (
                      <span className="text-xs font-medium text-teal-600 mb-1 block">Primary Diagnosis</span>
                    )}
                    {isEditing ? (
                      <input
                        type="text"
                        value={dx.description}
                        onChange={(e) => {
                          const newDx = [...note.assessment.diagnoses];
                          newDx[idx] = { ...dx, description: e.target.value };
                          onUpdate({ ...note, assessment: { ...note.assessment, diagnoses: newDx } });
                        }}
                        className="w-full p-1 border border-slate-200 rounded"
                      />
                    ) : (
                      <p className="font-medium text-slate-900">{dx.description}</p>
                    )}
                    {dx.icd10 && <p className="text-xs text-slate-500 mt-1">ICD-10: {dx.icd10}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeSection === 'P' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Plan Items</label>
              <div className="space-y-2">
                {note.plan.items.map((item, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        item.category === 'medication' ? 'bg-green-100 text-green-700' :
                        item.category === 'lab' ? 'bg-blue-100 text-blue-700' :
                        item.category === 'imaging' ? 'bg-cyan-100 text-cyan-700' :
                        item.category === 'referral' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-200 text-slate-700'
                      }`}>
                        {item.category}
                      </span>
                    </div>
                    {isEditing ? (
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => {
                          const newItems = [...note.plan.items];
                          newItems[idx] = { ...item, description: e.target.value };
                          onUpdate({ ...note, plan: { ...note.plan, items: newItems } });
                        }}
                        className="w-full p-1 border border-slate-200 rounded"
                      />
                    ) : (
                      <p className="text-sm text-slate-900">{item.description}</p>
                    )}
                    {item.details && <p className="text-xs text-slate-500 mt-1">{item.details}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
        <p className="text-xs text-slate-500">
          Generated: {note.generated.toLocaleString()}
        </p>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1 px-3 py-1.5 text-slate-600 hover:bg-slate-200 rounded-lg text-sm transition-colors">
            <Copy size={14} />
            Copy
          </button>
          <button className="flex items-center gap-1 px-3 py-1.5 text-slate-600 hover:bg-slate-200 rounded-lg text-sm transition-colors">
            <Download size={14} />
            Export
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export const AmbientDocumentation: React.FC<{
  patientId: string;
  patientName: string;
  onSaveNote?: (note: SOAPNote) => void;
}> = ({ patientId, patientName, onSaveNote }) => {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [soapNote, setSoapNote] = useState<SOAPNote | null>(null);
  const [duration, setDuration] = useState(0);
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [autoDetectSpeaker, setAutoDetectSpeaker] = useState(true);
  const [currentSpeaker, setCurrentSpeaker] = useState<Speaker>('provider');
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // Simulated speech recognition
  const simulateTranscription = useCallback(() => {
    const mockPhrases: Array<{ speaker: Speaker; text: string }> = [
      { speaker: 'provider', text: "Good morning. What brings you in today?" },
      { speaker: 'patient', text: "I've been having this headache for about 3 days now. It's mostly in the front of my head." },
      { speaker: 'provider', text: "I see. How would you rate the pain on a scale of 1 to 10?" },
      { speaker: 'patient', text: "It's about a 6 out of 10. Sometimes it gets worse, especially in the morning." },
      { speaker: 'provider', text: "Have you taken anything for it?" },
      { speaker: 'patient', text: "I've been taking ibuprofen, but it only helps a little." },
      { speaker: 'provider', text: "Any other symptoms? Nausea, vision changes, neck stiffness?" },
      { speaker: 'patient', text: "A little bit of nausea, but no vision problems or stiff neck." },
    ];

    let index = 0;
    const interval = setInterval(() => {
      if (index < mockPhrases.length && recordingState === 'recording') {
        const phrase = mockPhrases[index];
        const segment: TranscriptSegment = {
          id: `seg_${Date.now()}`,
          speaker: phrase.speaker,
          text: phrase.text,
          timestamp: duration * 1000,
          confidence: 0.85 + Math.random() * 0.15,
          clinicalEntities: extractClinicalEntities(phrase.text),
        };
        setTranscript(prev => [...prev, segment]);
        index++;
      } else if (index >= mockPhrases.length) {
        clearInterval(interval);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [recordingState, duration]);

  // Timer effect
  useEffect(() => {
    if (recordingState === 'recording') {
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [recordingState]);

  // Simulate transcription when recording
  useEffect(() => {
    if (recordingState === 'recording') {
      const cleanup = simulateTranscription();
      return cleanup;
    }
  }, [recordingState, simulateTranscription]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartRecording = async () => {
    try {
      // In production, initialize real speech recognition here
      setRecordingState('recording');
      setTranscript([]);
      setDuration(0);
      setSoapNote(null);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const handlePauseRecording = () => {
    setRecordingState('paused');
  };

  const handleResumeRecording = () => {
    setRecordingState('recording');
  };

  const handleStopRecording = () => {
    setRecordingState('processing');
    
    // Simulate AI processing
    setTimeout(() => {
      const note = generateSOAPNote(transcript, patientName);
      setSoapNote(note);
      setRecordingState('complete');
    }, 2000);
  };

  const handleReset = () => {
    setRecordingState('idle');
    setTranscript([]);
    setSoapNote(null);
    setDuration(0);
  };

  const handleEditTranscript = (segmentId: string, newText: string) => {
    setTranscript(prev =>
      prev.map(seg =>
        seg.id === segmentId
          ? { ...seg, text: newText, clinicalEntities: extractClinicalEntities(newText) }
          : seg
      )
    );
  };

  const handleRegenerateNote = () => {
    setRecordingState('processing');
    setTimeout(() => {
      const note = generateSOAPNote(transcript, patientName);
      setSoapNote(note);
      setRecordingState('complete');
    }, 1500);
  };

  const handleSaveNote = () => {
    if (soapNote && onSaveNote) {
      onSaveNote(soapNote);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-6 py-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Ambient Clinical Intelligence</h2>
              <p className="text-teal-200 text-sm">Auto-generate documentation from your conversation</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-white/20 rounded-full text-sm">
              Patient: {patientName}
            </span>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <h3 className="font-medium text-slate-900 mb-3">Recording Settings</h3>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={autoDetectSpeaker}
                onChange={(e) => setAutoDetectSpeaker(e.target.checked)}
                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <span className="text-sm text-slate-700">Auto-detect speaker</span>
            </label>
            {!autoDetectSpeaker && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">Current speaker:</span>
                <select
                  value={currentSpeaker}
                  onChange={(e) => setCurrentSpeaker(e.target.value as Speaker)}
                  className="text-sm border border-slate-200 rounded-lg px-2 py-1"
                >
                  <option value="provider">Provider</option>
                  <option value="patient">Patient</option>
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recording Controls */}
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center justify-center gap-4">
          {recordingState === 'idle' && (
            <button
              onClick={handleStartRecording}
              className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white font-medium rounded-full hover:bg-red-600 transition-colors shadow-lg"
            >
              <Mic size={20} />
              Start Recording
            </button>
          )}

          {recordingState === 'recording' && (
            <>
              <button
                onClick={handlePauseRecording}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white font-medium rounded-full hover:bg-amber-600 transition-colors"
              >
                <Pause size={18} />
                Pause
              </button>
              <div className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-600 rounded-full">
                <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                Recording • {formatDuration(duration)}
              </div>
              <button
                onClick={handleStopRecording}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white font-medium rounded-full hover:bg-slate-800 transition-colors"
              >
                <Square size={18} />
                Stop & Generate
              </button>
            </>
          )}

          {recordingState === 'paused' && (
            <>
              <button
                onClick={handleResumeRecording}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white font-medium rounded-full hover:bg-emerald-600 transition-colors"
              >
                <Play size={18} />
                Resume
              </button>
              <div className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-600 rounded-full">
                <Pause size={16} />
                Paused • {formatDuration(duration)}
              </div>
              <button
                onClick={handleStopRecording}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white font-medium rounded-full hover:bg-slate-800 transition-colors"
              >
                <Square size={18} />
                Stop & Generate
              </button>
            </>
          )}

          {recordingState === 'processing' && (
            <div className="flex items-center gap-3 px-6 py-3 bg-teal-100 text-teal-700 rounded-full">
              <div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
              Processing conversation...
            </div>
          )}

          {recordingState === 'complete' && (
            <>
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-600 rounded-full">
                <CheckCircle size={16} />
                Note Generated • {formatDuration(duration)}
              </div>
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-700 font-medium rounded-full hover:bg-slate-300 transition-colors"
              >
                <RotateCcw size={18} />
                New Recording
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-2 divide-x divide-slate-100">
        {/* Transcript Panel */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Live Transcript</h3>
            {transcript.length > 0 && (
              <button
                onClick={() => setIsEditingTranscript(!isEditingTranscript)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-sm ${
                  isEditingTranscript ? 'bg-teal-100 text-teal-700' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                <Edit3 size={14} />
                {isEditingTranscript ? 'Done' : 'Edit'}
              </button>
            )}
          </div>
          
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {transcript.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Mic size={48} className="mx-auto mb-3 opacity-50" />
                <p>Start recording to see the transcript</p>
              </div>
            ) : (
              transcript.map(segment => (
                <TranscriptSegmentView
                  key={segment.id}
                  segment={segment}
                  isEditing={isEditingTranscript}
                  onEdit={handleEditTranscript}
                />
              ))
            )}
          </div>

          {transcript.length > 0 && recordingState === 'complete' && (
            <button
              onClick={handleRegenerateNote}
              className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-teal-100 text-teal-700 font-medium rounded-lg hover:bg-teal-200 transition-colors"
            >
              <Wand2 size={16} />
              Regenerate Note from Edited Transcript
            </button>
          )}
        </div>

        {/* SOAP Note Panel */}
        <div className="p-4">
          {soapNote ? (
            <SOAPNoteEditor
              note={soapNote}
              onUpdate={setSoapNote}
              onSave={handleSaveNote}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400">
              <div className="text-center">
                <FileText size={48} className="mx-auto mb-3 opacity-50" />
                <p>SOAP note will appear here after recording</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AmbientDocumentation;
