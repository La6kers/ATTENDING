// =============================================================================
// ATTENDING AI - AI Scribe Component
// apps/provider-portal/components/clinical-services/AIScribe.tsx
// =============================================================================

import React, { useState, useEffect, useCallback } from 'react';

interface ScribeSession {
  id: string;
  status: 'active' | 'paused' | 'completed';
  startTime: Date;
  duration: number;
  transcript: string;
}

interface SOAPNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  icd10Codes: { code: string; description: string }[];
  cptCodes: { code: string; description: string }[];
}

export const AIScribe: React.FC<{ patientId: string; patientName: string }> = ({
  patientId,
  patientName,
}) => {
  const [session, setSession] = useState<ScribeSession | null>(null);
  const [soapNote, setSoapNote] = useState<SOAPNote | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Timer for elapsed time
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startSession = async () => {
    try {
      const response = await fetch('/api/scribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, encounterType: 'office-visit' }),
      });

      if (!response.ok) throw new Error('Failed to start session');

      const data = await response.json();
      setSession({
        id: data.sessionId,
        status: 'active',
        startTime: new Date(),
        duration: 0,
        transcript: '',
      });
      setIsRecording(true);
      setElapsedTime(0);
      setError(null);
    } catch (err) {
      setError('Failed to start scribe session');
    }
  };

  const pauseSession = async () => {
    if (!session) return;
    
    try {
      await fetch('/api/scribe', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id, action: 'pause' }),
      });
      setIsRecording(false);
      setSession({ ...session, status: 'paused' });
    } catch (err) {
      setError('Failed to pause session');
    }
  };

  const resumeSession = async () => {
    if (!session) return;

    try {
      await fetch('/api/scribe', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id, action: 'resume' }),
      });
      setIsRecording(true);
      setSession({ ...session, status: 'active' });
    } catch (err) {
      setError('Failed to resume session');
    }
  };

  const endSession = async () => {
    if (!session) return;

    try {
      const response = await fetch(`/api/scribe?sessionId=${session.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to end session');

      const data = await response.json();
      setIsRecording(false);
      setSession({ ...session, status: 'completed' });
      
      // Set generated SOAP note
      setSoapNote({
        subjective: data.session.soapNote.subjective,
        objective: data.session.soapNote.objective,
        assessment: data.session.soapNote.assessment,
        plan: data.session.soapNote.plan,
        icd10Codes: [
          { code: 'J06.9', description: 'Acute upper respiratory infection' },
        ],
        cptCodes: [
          { code: '99213', description: 'Office visit, established patient, level 3' },
        ],
      });
    } catch (err) {
      setError('Failed to end session');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">AI Scribe</h2>
          <p className="text-gray-600">Patient: {patientName}</p>
        </div>
        <div className="flex items-center space-x-2">
          {isRecording && (
            <span className="flex items-center text-red-500">
              <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse mr-2"></span>
              Recording
            </span>
          )}
          <span className="text-2xl font-mono text-gray-700">{formatTime(elapsedTime)}</span>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
          <button onClick={() => setError(null)} className="float-right">&times;</button>
        </div>
      )}

      {/* Controls */}
      <div className="flex space-x-4 mb-6">
        {!session ? (
          <button
            onClick={startSession}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
            </svg>
            Start Session
          </button>
        ) : session.status === 'active' ? (
          <>
            <button
              onClick={pauseSession}
              className="px-6 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Pause
            </button>
            <button
              onClick={endSession}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
              </svg>
              End & Generate Note
            </button>
          </>
        ) : session.status === 'paused' ? (
          <>
            <button
              onClick={resumeSession}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
              </svg>
              Resume
            </button>
            <button
              onClick={endSession}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center"
            >
              End & Generate Note
            </button>
          </>
        ) : null}
      </div>

      {/* Live Transcript */}
      {session && session.status !== 'completed' && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Live Transcript</h3>
          <div className="bg-gray-50 rounded-lg p-4 h-48 overflow-y-auto border">
            <p className="text-gray-600 italic">
              {session.transcript || 'Listening... Speak naturally with your patient.'}
            </p>
          </div>
        </div>
      )}

      {/* Generated SOAP Note */}
      {soapNote && (
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4">Generated SOAP Note</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">Subjective</h4>
              <textarea
                className="w-full bg-white border rounded p-2 text-sm"
                rows={4}
                defaultValue={soapNote.subjective}
              />
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-2">Objective</h4>
              <textarea
                className="w-full bg-white border rounded p-2 text-sm"
                rows={4}
                defaultValue={soapNote.objective}
              />
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h4 className="font-semibold text-yellow-800 mb-2">Assessment</h4>
              <textarea
                className="w-full bg-white border rounded p-2 text-sm"
                rows={4}
                defaultValue={soapNote.assessment}
              />
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <h4 className="font-semibold text-purple-800 mb-2">Plan</h4>
              <textarea
                className="w-full bg-white border rounded p-2 text-sm"
                rows={4}
                defaultValue={soapNote.plan}
              />
            </div>
          </div>

          {/* Coding Suggestions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Suggested ICD-10 Codes</h4>
              {soapNote.icd10Codes.map((code, i) => (
                <div key={i} className="flex items-center justify-between py-1">
                  <span className="font-mono text-sm">{code.code}</span>
                  <span className="text-sm text-gray-600">{code.description}</span>
                </div>
              ))}
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Suggested CPT Codes</h4>
              {soapNote.cptCodes.map((code, i) => (
                <div key={i} className="flex items-center justify-between py-1">
                  <span className="font-mono text-sm">{code.code}</span>
                  <span className="text-sm text-gray-600">{code.description}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-4">
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              Edit Note
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Sign & Save to EHR
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIScribe;
