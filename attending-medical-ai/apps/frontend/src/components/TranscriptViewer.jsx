import { useEffect, useRef } from 'react';

/**
 * Live scrolling transcript display.
 * - Final text in black with timestamps
 * - Interim (in-progress) text in gray italic
 * - Auto-scrolls to bottom
 */
export default function TranscriptViewer({ transcript, interimText, isListening }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript, interimText]);

  return (
    <div className="bg-gray-900 rounded-lg p-4 h-80 overflow-y-auto font-mono text-sm">
      {transcript.length === 0 && !isListening && (
        <p className="text-gray-500 italic">No transcript yet. Start listening to begin capture.</p>
      )}
      {transcript.length === 0 && isListening && (
        <p className="text-gray-400 italic animate-pulse">Listening...</p>
      )}
      {transcript.map((chunk, i) => (
        <div key={i} className="mb-2">
          <span className="text-gray-500 mr-2">[{chunk.timestamp}]</span>
          <span className="text-gray-100">{chunk.text}</span>
        </div>
      ))}
      {interimText && (
        <div className="mb-2">
          <span className="text-gray-500 mr-2">[...]</span>
          <span className="text-gray-400 italic">{interimText}</span>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
