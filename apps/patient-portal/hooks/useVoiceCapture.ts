// ============================================================
// Voice Capture Hook for COMPASS Patient Portal
// apps/patient-portal/hooks/useVoiceCapture.ts
//
// MediaRecorder-based voice capture with transcription
// Supports real-time streaming and batch upload modes
// ============================================================

import { useState, useCallback, useRef, useEffect } from 'react';

// ============================================================
// TYPES
// ============================================================

export interface VoiceCaptureState {
  isRecording: boolean;
  isPaused: boolean;
  isProcessing: boolean;
  duration: number;
  audioLevel: number;
  error: string | null;
}

export interface VoiceCaptureResult {
  transcript: string;
  confidence: number;
  duration: number;
  audioBlob?: Blob;
  extractedEntities?: ExtractedEntity[];
}

export interface ExtractedEntity {
  type: 'symptom' | 'duration' | 'location' | 'severity' | 'medication' | 'allergy';
  value: string;
  confidence: number;
  span?: { start: number; end: number };
}

export interface UseVoiceCaptureOptions {
  /** Transcription API endpoint */
  transcribeEndpoint?: string;
  /** Maximum recording duration in seconds */
  maxDuration?: number;
  /** Audio sample rate */
  sampleRate?: number;
  /** Whether to extract medical entities from transcript */
  extractEntities?: boolean;
  /** Callback when recording starts */
  onRecordingStart?: () => void;
  /** Callback when recording stops */
  onRecordingStop?: (result: VoiceCaptureResult) => void;
  /** Callback for real-time transcript updates (streaming mode) */
  onTranscriptUpdate?: (partial: string) => void;
  /** Callback for errors */
  onError?: (error: string) => void;
}

// ============================================================
// HOOK
// ============================================================

export function useVoiceCapture(options: UseVoiceCaptureOptions = {}) {
  const {
    transcribeEndpoint = '/api/transcribe',
    maxDuration = 120, // 2 minutes default
    sampleRate = 16000,
    extractEntities = true,
    onRecordingStart,
    onRecordingStop,
    onTranscriptUpdate,
    onError,
  } = options;

  // State
  const [state, setState] = useState<VoiceCaptureState>({
    isRecording: false,
    isPaused: false,
    isProcessing: false,
    duration: 0,
    audioLevel: 0,
    error: null,
  });

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const levelIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  /**
   * Check if voice capture is supported
   */
  const isSupported = useCallback((): boolean => {
    return !!(
      typeof window !== 'undefined' &&
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia &&
      window.MediaRecorder
    );
  }, []);

  /**
   * Request microphone permission
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('[VoiceCapture] Permission denied:', error);
      return false;
    }
  }, []);

  /**
   * Start recording
   */
  const startRecording = useCallback(async (): Promise<boolean> => {
    if (!isSupported()) {
      const error = 'Voice capture is not supported in this browser';
      setState(s => ({ ...s, error }));
      onError?.(error);
      return false;
    }

    try {
      // Get microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      // Set up audio analysis for level metering
      audioContextRef.current = new AudioContext({ sampleRate });
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      // Create MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000,
      });

      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        await processRecording();
      };

      mediaRecorderRef.current.onerror = (event: any) => {
        const error = event.error?.message || 'Recording error';
        setState(s => ({ ...s, error, isRecording: false }));
        onError?.(error);
      };

      // Start recording
      mediaRecorderRef.current.start(1000); // Collect data every second
      startTimeRef.current = Date.now();

      // Start duration timer
      durationIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setState(s => ({ ...s, duration: elapsed }));

        // Auto-stop at max duration
        if (elapsed >= maxDuration) {
          stopRecording();
        }
      }, 1000);

      // Start audio level monitoring
      levelIntervalRef.current = setInterval(() => {
        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          const normalizedLevel = Math.min(100, Math.round((average / 128) * 100));
          setState(s => ({ ...s, audioLevel: normalizedLevel }));
        }
      }, 100);

      setState(s => ({
        ...s,
        isRecording: true,
        isPaused: false,
        error: null,
        duration: 0,
      }));

      onRecordingStart?.();
      return true;

    } catch (error: any) {
      const errorMessage = error.name === 'NotAllowedError'
        ? 'Microphone permission denied'
        : error.message || 'Failed to start recording';
      
      setState(s => ({ ...s, error: errorMessage }));
      onError?.(errorMessage);
      return false;
    }
  }, [isSupported, sampleRate, maxDuration, onRecordingStart, onError]);

  /**
   * Stop recording
   */
  const stopRecording = useCallback(() => {
    // Stop timers
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    if (levelIntervalRef.current) {
      clearInterval(levelIntervalRef.current);
      levelIntervalRef.current = null;
    }

    // Stop MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setState(s => ({ ...s, isRecording: false, isPaused: false, audioLevel: 0 }));
  }, []);

  /**
   * Pause recording
   */
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setState(s => ({ ...s, isPaused: true }));
    }
  }, []);

  /**
   * Resume recording
   */
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setState(s => ({ ...s, isPaused: false }));
    }
  }, []);

  /**
   * Cancel recording without processing
   */
  const cancelRecording = useCallback(() => {
    chunksRef.current = [];
    stopRecording();
    setState(s => ({ ...s, duration: 0 }));
  }, [stopRecording]);

  /**
   * Process recorded audio
   */
  const processRecording = useCallback(async () => {
    if (chunksRef.current.length === 0) {
      return;
    }

    setState(s => ({ ...s, isProcessing: true }));

    try {
      const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);

      // Create form data for transcription
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('extractEntities', String(extractEntities));

      // Send to transcription API
      const response = await fetch(transcribeEndpoint, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.status}`);
      }

      const data = await response.json();

      const result: VoiceCaptureResult = {
        transcript: data.transcript || '',
        confidence: data.confidence || 0,
        duration,
        audioBlob,
        extractedEntities: data.entities || [],
      };

      setState(s => ({ ...s, isProcessing: false }));
      onRecordingStop?.(result);

    } catch (error: any) {
      const errorMessage = error.message || 'Failed to process recording';
      setState(s => ({ ...s, isProcessing: false, error: errorMessage }));
      onError?.(errorMessage);
    }
  }, [transcribeEndpoint, extractEntities, onRecordingStop, onError]);

  return {
    // State
    ...state,
    
    // Actions
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
    
    // Utilities
    isSupported: isSupported(),
    requestPermission,
  };
}

export default useVoiceCapture;
