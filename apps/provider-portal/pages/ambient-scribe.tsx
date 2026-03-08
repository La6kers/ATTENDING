import { useState, useRef } from 'react';
import Head from 'next/head';
import { ProviderShell } from '@/components/layout/ProviderShell';

/**
 * Ambient Scribe — AI-Powered Clinical Documentation
 * 
 * Records provider-patient conversations and generates:
 * - Structured SOAP notes
 * - ICD-10 code suggestions
 * - Follow-up action items
 * - Medication reconciliation
 */

type RecordingState = 'idle' | 'recording' | 'processing' | 'complete';

interface ScribeResult {
  soapNote: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  };
  suggestedCodes: Array<{ code: string; description: string; confidence: number }>;
  actionItems: string[];
  medications: Array<{ name: string; action: 'continue' | 'start' | 'discontinue' | 'modify'; details: string }>;
  duration: number;
  wordCount: number;
}

const mockResult: ScribeResult = {
  soapNote: {
    subjective: 'Patient presents with a 3-day history of progressive lower back pain radiating to the left leg. Pain rated 7/10, worsening with prolonged sitting. No bladder or bowel changes. Denies recent trauma. Reports mild tingling in left foot. Previously managed with OTC ibuprofen with partial relief.',
    objective: 'Vital signs stable. BP 128/82, HR 72, Temp 98.6°F. Lumbar spine: tenderness at L4-L5. Positive straight leg raise on left at 45°. Intact sensation bilateral lower extremities. 5/5 strength bilateral except 4/5 left ankle dorsiflexion. DTRs 2+ bilateral. Gait antalgic, favoring right.',
    assessment: 'Lumbar radiculopathy, likely L5 nerve root involvement based on exam findings. Red flags absent (no cauda equina syndrome signs, no progressive neurological deficit, no fever or weight loss).',
    plan: '1. MRI lumbar spine without contrast to evaluate for disc herniation\n2. Naproxen 500mg BID with food x 14 days\n3. Physical therapy referral — core strengthening program\n4. Gabapentin 300mg QHS for neuropathic pain component\n5. Return in 2 weeks for MRI review, sooner if symptoms worsen\n6. Patient education on red flags (urinary retention, saddle anesthesia, progressive weakness)',
  },
  suggestedCodes: [
    { code: 'M54.17', description: 'Radiculopathy, lumbosacral region', confidence: 0.94 },
    { code: 'M51.16', description: 'Intervertebral disc disorders with radiculopathy, lumbar region', confidence: 0.82 },
    { code: 'G57.00', description: 'Lesion of sciatic nerve, unspecified lower limb', confidence: 0.65 },
  ],
  actionItems: [
    'Order MRI lumbar spine without contrast',
    'Prescribe Naproxen 500mg BID x 14 days',
    'Prescribe Gabapentin 300mg QHS',
    'Refer to Physical Therapy',
    'Schedule follow-up in 2 weeks',
  ],
  medications: [
    { name: 'Naproxen 500mg', action: 'start', details: 'BID with food, 14-day course' },
    { name: 'Gabapentin 300mg', action: 'start', details: 'At bedtime, for neuropathic pain' },
    { name: 'Ibuprofen 400mg', action: 'discontinue', details: 'Replaced by naproxen — avoid concurrent NSAIDs' },
  ],
  duration: 847,
  wordCount: 2341,
};

export default function AmbientScribePage() {
  const [state, setState] = useState<RecordingState>('idle');
  const [result, setResult] = useState<ScribeResult | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [patientContext, setPatientContext] = useState({ name: '', mrn: '', encounter: '' });
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = () => {
    setState('recording');
    setElapsedTime(0);
    timerRef.current = setInterval(() => {
      setElapsedTime(t => t + 1);
    }, 1000);
  };

  const stopRecording = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setState('processing');
    
    // Simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    setResult(mockResult);
    setState('complete');
  };

  const reset = () => {
    setState('idle');
    setResult(null);
    setElapsedTime(0);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <Head>
        <title>Ambient Scribe | ATTENDING AI</title>
      </Head>
      
      <ProviderShell contextBadge="Ambient Scribe" currentPage="ambient-scribe">
      <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '4px' }}>Ambient Scribe</h1>
        <p style={{ color: '#6b7280', marginBottom: '24px' }}>
          AI-powered clinical documentation from provider-patient conversations
        </p>

        {/* Patient Context */}
        <div style={{ background: 'white', borderRadius: '8px', padding: '16px', border: '1px solid #e5e7eb', marginBottom: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '13px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Patient Name</label>
              <input
                type="text"
                value={patientContext.name}
                onChange={e => setPatientContext(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g., John Smith"
                style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>MRN</label>
              <input
                type="text"
                value={patientContext.mrn}
                onChange={e => setPatientContext(p => ({ ...p, mrn: e.target.value }))}
                placeholder="e.g., MRN-12345"
                style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Encounter ID</label>
              <input
                type="text"
                value={patientContext.encounter}
                onChange={e => setPatientContext(p => ({ ...p, encounter: e.target.value }))}
                placeholder="Auto-linked from active encounter"
                style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        </div>

        {/* Recording Controls */}
        <div style={{
          background: state === 'recording' ? '#fef2f2' : 'white',
          borderRadius: '8px',
          padding: '24px',
          border: `1px solid ${state === 'recording' ? '#fca5a5' : '#e5e7eb'}`,
          marginBottom: '24px',
          textAlign: 'center',
        }}>
          {state === 'idle' && (
            <div>
              <button
                onClick={startRecording}
                style={{
                  padding: '16px 48px',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50px',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Start Recording
              </button>
              <p style={{ color: '#6b7280', marginTop: '12px', fontSize: '14px' }}>
                Begin recording the provider-patient conversation for AI documentation
              </p>
            </div>
          )}
          
          {state === 'recording' && (
            <div>
              <div style={{ fontSize: '48px', fontWeight: 700, color: '#ef4444', marginBottom: '8px' }}>
                {formatTime(elapsedTime)}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginBottom: '16px' }}>
                {[...Array(5)].map((_, i) => (
                  <div key={i} style={{
                    width: '4px',
                    height: `${12 + Math.random() * 20}px`,
                    background: '#ef4444',
                    borderRadius: '2px',
                    animation: 'pulse 0.5s infinite alternate',
                  }} />
                ))}
              </div>
              <button
                onClick={stopRecording}
                style={{
                  padding: '12px 36px',
                  background: '#374151',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Stop & Process
              </button>
            </div>
          )}
          
          {state === 'processing' && (
            <div>
              <div style={{ fontSize: '18px', color: '#6b7280', marginBottom: '8px' }}>Processing conversation...</div>
              <div style={{ width: '200px', height: '4px', background: '#e5e7eb', borderRadius: '2px', margin: '0 auto' }}>
                <div style={{
                  width: '60%',
                  height: '100%',
                  background: '#3b82f6',
                  borderRadius: '2px',
                  animation: 'loading 1.5s ease-in-out infinite',
                }} />
              </div>
              <p style={{ color: '#9ca3af', marginTop: '12px', fontSize: '13px' }}>
                Generating SOAP note, ICD-10 codes, and action items...
              </p>
            </div>
          )}
        </div>

        {/* Results */}
        {state === 'complete' && result && (
          <div>
            {/* Stats */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
              <div style={{ background: '#f0fdf4', padding: '12px 20px', borderRadius: '8px', fontSize: '13px' }}>
                Duration: <strong>{Math.floor(result.duration / 60)}m {result.duration % 60}s</strong>
              </div>
              <div style={{ background: '#eff6ff', padding: '12px 20px', borderRadius: '8px', fontSize: '13px' }}>
                Words transcribed: <strong>{result.wordCount.toLocaleString()}</strong>
              </div>
              <button
                onClick={reset}
                style={{ marginLeft: 'auto', padding: '8px 20px', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', background: 'white' }}
              >
                New Recording
              </button>
            </div>

            {/* SOAP Note */}
            <div style={{ background: 'white', borderRadius: '8px', padding: '20px', border: '1px solid #e5e7eb', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>SOAP Note</h2>
              {Object.entries(result.soapNote).map(([key, value]) => (
                <div key={key} style={{ marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#3b82f6', textTransform: 'capitalize', marginBottom: '4px' }}>
                    {key}
                  </h3>
                  <p style={{ fontSize: '14px', lineHeight: '1.6', color: '#374151', whiteSpace: 'pre-line' }}>
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* ICD-10 Codes */}
              <div style={{ background: 'white', borderRadius: '8px', padding: '20px', border: '1px solid #e5e7eb' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>Suggested ICD-10 Codes</h2>
                {result.suggestedCodes.map((code) => (
                  <div key={code.code} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                    <code style={{ fontWeight: 600, color: '#7c3aed' }}>{code.code}</code>
                    <span style={{ flex: 1, fontSize: '14px' }}>{code.description}</span>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>{(code.confidence * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>

              {/* Action Items */}
              <div style={{ background: 'white', borderRadius: '8px', padding: '20px', border: '1px solid #e5e7eb' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>Action Items</h2>
                {result.actionItems.map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                    <input type="checkbox" style={{ marginTop: '2px' }} />
                    <span style={{ fontSize: '14px' }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Medications */}
            <div style={{ background: 'white', borderRadius: '8px', padding: '20px', border: '1px solid #e5e7eb', marginTop: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>Medication Reconciliation</h2>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ textAlign: 'left', padding: '8px', fontSize: '13px', color: '#6b7280' }}>Medication</th>
                    <th style={{ textAlign: 'left', padding: '8px', fontSize: '13px', color: '#6b7280' }}>Action</th>
                    <th style={{ textAlign: 'left', padding: '8px', fontSize: '13px', color: '#6b7280' }}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {result.medications.map((med) => (
                    <tr key={med.name} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '10px 8px', fontWeight: 500 }}>{med.name}</td>
                      <td style={{ padding: '10px 8px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 500,
                          background: med.action === 'start' ? '#dcfce7' : med.action === 'discontinue' ? '#fee2e2' : med.action === 'modify' ? '#fef3c7' : '#f3f4f6',
                          color: med.action === 'start' ? '#166534' : med.action === 'discontinue' ? '#991b1b' : med.action === 'modify' ? '#92400e' : '#374151',
                        }}>
                          {med.action}
                        </span>
                      </td>
                      <td style={{ padding: '10px 8px', color: '#6b7280', fontSize: '14px' }}>{med.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      </ProviderShell>
    </>
  );
}
