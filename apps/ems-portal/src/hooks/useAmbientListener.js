import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Ambient listening hook using Web Speech API + demo playback mode.
 * Mode toggle: 'live' (real mic) or 'demo' (pre-recorded transcript).
 */
export default function useAmbientListener({ onTranscript, demoTranscript }) {
  const [isListening, setIsListening] = useState(false);
  const [mode, setMode] = useState('demo'); // 'live' | 'demo'
  const [transcript, setTranscript] = useState([]);
  const [interimText, setInterimText] = useState('');
  const [error, setError] = useState(null);

  const recognitionRef = useRef(null);
  const demoTimersRef = useRef([]);
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  // Initialize SpeechRecognition (if available)
  const initRecognition = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setError('Speech recognition not supported in this browser. Use Chrome or Edge.');
      return null;
    }

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          const text = result[0].transcript.trim();
          if (text) {
            const chunk = {
              timestamp: new Date().toTimeString().slice(0, 5),
              text,
            };
            setTranscript(prev => [...prev, chunk]);
            if (onTranscriptRef.current) onTranscriptRef.current(chunk);
          }
        } else {
          interim += result[0].transcript;
        }
      }
      setInterimText(interim);
    };

    recognition.onerror = (event) => {
      if (event.error !== 'aborted') {
        setError(`Speech recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      // Auto-restart if still listening (Chrome cuts off after silence)
      if (recognitionRef.current?._shouldRestart) {
        try { recognition.start(); } catch (e) { /* ignore */ }
      }
    };

    return recognition;
  }, []);

  const startLive = useCallback(() => {
    const recognition = initRecognition();
    if (!recognition) return;
    recognitionRef.current = recognition;
    recognition._shouldRestart = true;
    recognition.start();
    setIsListening(true);
    setError(null);
  }, [initRecognition]);

  const stopLive = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current._shouldRestart = false;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterimText('');
  }, []);

  const startDemo = useCallback(() => {
    if (!demoTranscript?.length) return;
    setIsListening(true);
    setError(null);

    const timers = demoTranscript.map((entry, i) => {
      return setTimeout(() => {
        const chunk = {
          timestamp: entry.timestamp || new Date().toTimeString().slice(0, 5),
          text: entry.text,
        };
        setTranscript(prev => [...prev, chunk]);
        if (onTranscriptRef.current) onTranscriptRef.current(chunk);

        // End listening after last entry
        if (i === demoTranscript.length - 1) {
          setTimeout(() => setIsListening(false), 1000);
        }
      }, entry.delay);
    });

    demoTimersRef.current = timers;
  }, [demoTranscript]);

  const stopDemo = useCallback(() => {
    demoTimersRef.current.forEach(t => clearTimeout(t));
    demoTimersRef.current = [];
    setIsListening(false);
  }, []);

  const start = useCallback(() => {
    setTranscript([]);
    setInterimText('');
    if (mode === 'live') startLive();
    else startDemo();
  }, [mode, startLive, startDemo]);

  const stop = useCallback(() => {
    if (mode === 'live') stopLive();
    else stopDemo();
  }, [mode, stopLive, stopDemo]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopLive();
      stopDemo();
    };
  }, [stopLive, stopDemo]);

  return {
    isListening,
    start,
    stop,
    transcript,
    interimText,
    error,
    mode,
    setMode: (newMode) => {
      if (isListening) stop();
      setMode(newMode);
    },
  };
}
