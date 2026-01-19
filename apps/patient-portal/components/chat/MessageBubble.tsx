// Message Bubble Component
// apps/patient-portal/components/chat/MessageBubble.tsx

import React from 'react';
import type { ChatMessage } from '../../store/useChatStore';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  // Format timestamp - handle both Date objects and strings
  const formatTime = (timestamp: Date | string): string => {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // System messages (emergency alerts, warnings, etc.)
  if (isSystem) {
    const isEmergency = message.metadata?.isRedFlag || message.metadata?.urgencyTrigger;
    
    return (
      <div className="flex justify-center my-4">
        <div className={`rounded-xl px-6 py-4 text-sm shadow-sm max-w-lg border ${
          isEmergency 
            ? 'bg-red-50 border-red-200 text-red-800' 
            : 'bg-yellow-50 border-yellow-200 text-yellow-800'
        }`}>
          <div className="flex items-start gap-3">
            {isEmergency ? (
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            ) : (
              <Info className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <div 
                className="font-medium"
                dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
              />
              <p className="text-xs opacity-75 mt-2">
                {formatTime(message.timestamp)}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex items-start gap-3 max-w-[75%] ${isUser ? 'flex-row-reverse' : ''}`}>
        {/* Avatar */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${
          isUser 
            ? 'bg-gradient-to-br from-indigo-500 to-purple-600' 
            : 'bg-white border border-gray-200'
        }`}>
          <span className={isUser ? 'text-white text-lg' : 'text-xl'}>
            {isUser ? '👤' : '🩺'}
          </span>
        </div>

        {/* Message Bubble */}
        <div className={`rounded-2xl px-5 py-4 shadow-sm ${
          isUser
            ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-tr-sm'
            : 'bg-white border border-gray-100 text-gray-900 rounded-tl-sm'
        }`}>
          {/* AI Header */}
          {!isUser && (
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
              <span className="text-xs font-bold text-indigo-600 tracking-wide">
                COMPASS AI
              </span>
              {message.metadata?.phase && (
                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                  {formatPhase(message.metadata.phase)}
                </span>
              )}
            </div>
          )}

          {/* Message Content - Support markdown-like formatting */}
          <div 
            className={`text-sm leading-relaxed ${
              isUser ? '' : 'prose prose-sm max-w-none prose-indigo'
            }`}
            dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
          />

          {/* Red Flag Indicator */}
          {message.metadata?.isRedFlag && (
            <div className="mt-3 pt-2 border-t border-red-100 flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs font-medium">Red flag symptom detected</span>
            </div>
          )}

          {/* Clinical Note (for provider reference) */}
          {message.metadata?.clinicalNote && (
            <details className="mt-3 pt-2 border-t border-gray-100">
              <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 flex items-center gap-1">
                <Info className="w-3 h-3" />
                Clinical Context
              </summary>
              <p className="mt-2 text-xs text-gray-500 bg-gray-50 rounded p-2">
                {message.metadata.clinicalNote}
              </p>
            </details>
          )}

          {/* Timestamp */}
          <div className={`text-xs mt-3 flex items-center gap-2 ${
            isUser ? 'text-indigo-200' : 'text-gray-400'
          }`}>
            <span>{formatTime(message.timestamp)}</span>
            {isUser && (
              <CheckCircle className="w-3 h-3" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Format phase name for display
function formatPhase(phase: string): string {
  const phaseNames: Record<string, string> = {
    welcome: 'Introduction',
    demographics: 'Demographics',
    chief_complaint: 'Chief Complaint',
    hpi_onset: 'Onset',
    hpi_location: 'Location',
    hpi_duration: 'Duration',
    hpi_character: 'Character',
    hpi_severity: 'Severity',
    hpi_aggravating: 'Aggravating',
    hpi_relieving: 'Relieving',
    hpi_associated: 'Associated',
    review_of_systems: 'Review of Systems',
    medications: 'Medications',
    allergies: 'Allergies',
    medical_history: 'History',
    social_history: 'Social',
    family_history: 'Family',
    summary: 'Summary',
    complete: 'Complete',
  };
  return phaseNames[phase] || phase;
}

// Format message content with basic markdown support
function formatContent(content: string): string {
  return content
    // Bold text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Line breaks
    .replace(/\n/g, '<br/>')
    // Lists (simple)
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // Wrap consecutive li elements in ul
    .replace(/(<li>.*<\/li>\s*)+/g, '<ul class="list-disc pl-4 my-2">$&</ul>');
}

export default MessageBubble;
