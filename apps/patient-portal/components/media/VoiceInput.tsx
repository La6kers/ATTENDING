// ============================================================
// ATTENDING AI - Voice Input Component
// apps/patient-portal/components/media/VoiceInput.tsx
//
// Real voice input with Web Speech API + fallback to backend transcription
// Revolutionary Feature: Hands-free patient symptom reporting
// ============================================================

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff, Loader2, Volume2, AlertCircle } from 'lucide-react';

interface VoiceInputProps {
  onTranscript: (text: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onListeningChange?: (isListening: boolean) => void;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'floating' | 'inline';
  showWaveform?: boolean;
  language?: string;
  continuous?: boolean;
  autoSubmit?: boolean;
}

interface AudioLevel {
  level: number;
  timestamp: number;
}

export function VoiceInput({
  onTranscript,
  onError,
  onListeningChange,
  disabled = false,
  className = '',
  size = 'md',
  variant = 'default',
  showWaveform = true,
  language = 'en-US',
  continuous = true,
  autoSubmit = false,
}: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [audioLevels, setAudioLevels] = useState<AudioLevel[]>([]);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const sizeClasses = { sm: 'w-10 h-10', md: 'w-12 h-12', lg: 'w-16 h-16' };
  const iconSizes = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-6 h-6' };

  const hasSpeechRecognition = typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  useEffect(() => {
    if (typeof window === 'undefined' || !hasSpeechRecognition) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.lang = language;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      onListeningChange?.(true);
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
      onListeningChange?.(false);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      setInterimTranscript(interim);

      if (final) {
        onTranscript(final.trim(), true);
        setInterimTranscript('');
        if (autoSubmit) {
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => stopListening(), 1500);
        }
      } else if (interim) {
        onTranscript(interim, false);
      }
    };

    recognition.onerror = (event: any) => {
      let errorMessage = 'Voice recognition error';
      switch (event.error) {
        case 'not-allowed':
        case 'permission-denied':
          errorMessage = 'Microphone access denied. Please allow microphone access.';
          setPermissionGranted(false);
          break;
        case 'no-speech':
          errorMessage = 'No speech detected. Please try again.';
          break;
        case 'audio-capture':
          errorMessage = 'No microphone found.';
          break;
        case 'network':
          errorMessage = 'Network error. Check your connection.';
          break;
        case 'aborted':
          return;
        default:
          errorMessage = `Voice error: ${event.error}`;
      }
      setError(errorMessage);
      onError?.(errorMessage);
      setIsListening(false);
      onListeningChange?.(false);
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognitionRef.current?.stop();
      } catch (_e) {
        // Recognition may already be stopped
      }
    };
  }, [hasSpeechRecognition, language, continuous, autoSubmit, onTranscript, onError, onListeningChange]);

  const startAudioVisualization = useCallback(async () => {
    if (!showWaveform) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setPermissionGranted(true);

      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyzer = audioContext.createAnalyser();
      analyzer.fftSize = 256;
      source.connect(analyzer);
      analyzerRef.current = analyzer;

      const dataArray = new Uint8Array(analyzer.frequencyBinCount);

      const updateLevels = () => {
        if (!analyzerRef.current) return;
        analyzerRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        const normalizedLevel = average / 255;

        setAudioLevels(prev => [...prev, { level: normalizedLevel, timestamp: Date.now() }].slice(-20));
        animationRef.current = requestAnimationFrame(updateLevels);
      };
      updateLevels();
    } catch (_err) {
      console.error('[VoiceInput] Audio visualization error:', _err);
    }
  }, [showWaveform]);

  const stopAudioVisualization = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    analyzerRef.current = null;
    setAudioLevels([]);
  }, []);

  const startListening = useCallback(async () => {
    if (disabled || isProcessing) return;
    setError(null);

    if (hasSpeechRecognition && recognitionRef.current) {
      try {
        recognitionRef.current.start();
        startAudioVisualization();
      } catch (_err) {
        setError('Failed to start voice recognition');
      }
    } else {
      // Fallback: Record audio for backend transcription
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 }
        });
        streamRef.current = stream;
        setPermissionGranted(true);

        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
            ? 'audio/webm;codecs=opus' : 'audio/webm'
        });

        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };

        mediaRecorder.onstop = async () => {
          setIsProcessing(true);
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

          try {
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.webm');
            formData.append('language', language);

            const response = await fetch('/api/transcribe', { method: 'POST', body: formData });
            if (!response.ok) throw new Error('Transcription failed');

            const { text } = await response.json();
            if (text) onTranscript(text, true);
          } catch (_err) {
            setError('Failed to transcribe audio');
            onError?.('Failed to transcribe audio');
          } finally {
            setIsProcessing(false);
          }
        };

        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.start(1000);
        setIsListening(true);
        onListeningChange?.(true);
        startAudioVisualization();
      } catch (err: unknown) {
        const error = err as { name?: string };
        if (error.name === 'NotAllowedError') {
          setError('Microphone access denied');
          setPermissionGranted(false);
        } else {
          setError('Failed to access microphone');
        }
        onError?.('Failed to access microphone');
      }
    }
  }, [disabled, isProcessing, hasSpeechRecognition, language, startAudioVisualization, onTranscript, onError, onListeningChange]);

  const stopListening = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    try {
      recognitionRef.current?.stop();
    } catch (_e) {
      // Recognition may already be stopped
    }
    if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current?.stop();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    stopAudioVisualization();
    setIsListening(false);
    onListeningChange?.(false);
  }, [stopAudioVisualization, onListeningChange]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  const renderWaveform = () => {
    if (!showWaveform || audioLevels.length === 0) return null;
    return (
      <div className="flex items-center justify-center gap-0.5 h-4">
        {audioLevels.slice(-8).map((level, index) => (
          <div
            key={index}
            className="w-1 bg-white rounded-full transition-all duration-75"
            style={{ height: `${Math.max(4, level.level * 16)}px`, opacity: 0.6 + level.level * 0.4 }}
          />
        ))}
      </div>
    );
  };

  const getButtonClasses = () => {
    const base = `${sizeClasses[size]} rounded-full flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed`;
    if (variant === 'floating') {
      return `${base} shadow-lg hover:shadow-xl ${isListening ? 'bg-red-500 hover:bg-red-600 focus:ring-red-500' : 'bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 focus:ring-green-500'}`;
    }
    if (variant === 'inline') {
      return `${base} ${isListening ? 'bg-red-100 text-red-600 hover:bg-red-200 focus:ring-red-500' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 focus:ring-gray-500'}`;
    }
    return `${base} ${isListening ? 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500 animate-pulse' : 'bg-green-500 text-white hover:bg-green-600 focus:ring-green-500'}`;
  };

  return (
    <div className={`relative inline-flex flex-col items-center ${className}`}>
      <button
        type="button"
        onClick={toggleListening}
        disabled={disabled || isProcessing}
        className={getButtonClasses()}
        aria-label={isListening ? 'Stop recording' : 'Start voice input'}
        aria-pressed={isListening}
      >
        {isProcessing ? (
          <Loader2 className={`${iconSizes[size]} animate-spin`} />
        ) : isListening ? (
          showWaveform && audioLevels.length > 0 ? renderWaveform() : <MicOff className={iconSizes[size]} />
        ) : (
          <Mic className={iconSizes[size]} />
        )}
      </button>

      {isListening && (
        <div className="absolute inset-0 rounded-full border-2 border-red-500 animate-ping opacity-75" />
      )}

      {interimTranscript && (
        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg max-w-48 truncate shadow-lg whitespace-nowrap">
          <Volume2 className="w-3 h-3 inline mr-1 opacity-70" />
          {interimTranscript}
        </div>
      )}

      <div className="mt-1.5 text-xs text-center">
        {isProcessing ? (
          <span className="text-purple-600">Processing...</span>
        ) : isListening ? (
          <span className="text-red-600 animate-pulse">Listening...</span>
        ) : error ? (
          <span className="text-red-500 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Tap to retry
          </span>
        ) : (
          <span className="text-gray-500">Tap to speak</span>
        )}
      </div>

      {error && !isListening && (
        <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg max-w-64 text-center shadow-md z-10">
          {error}
        </div>
      )}

      {permissionGranted === false && (
        <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-2 rounded-lg max-w-64 text-center shadow-md z-10">
          Please enable microphone access in your browser settings.
        </div>
      )}
    </div>
  );
}

export default VoiceInput;
