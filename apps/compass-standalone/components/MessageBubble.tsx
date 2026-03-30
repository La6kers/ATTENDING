// ============================================================
// COMPASS Standalone — Message Bubble
// Chat message component matching ATTENDING brand
// ============================================================

import React from 'react';
import { User, Bot, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import type { ChatMessage, MessageRole } from '@attending/shared/types/chat.types';
import { formatMessageTime } from '@attending/shared/types/chat.types';
import { ChatImage, ImageAnalysisCard } from './ImagePreview';

export interface MessageBubbleProps {
  message: ChatMessage;
  isTyping?: boolean;
}

const Avatar: React.FC<{ role: MessageRole; isEmergency?: boolean }> = ({ role, isEmergency }) => {
  if (role === 'user') {
    return (
      <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center shadow-md">
        <User className="w-5 h-5 text-white" />
      </div>
    );
  }
  if (role === 'system') {
    return (
      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shadow-md">
        <Info className="w-5 h-5 text-white" />
      </div>
    );
  }
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md ${
      isEmergency ? 'bg-red-600 animate-pulse' : 'bg-gradient-to-br from-teal-600 to-teal-800'
    }`}>
      {isEmergency ? <AlertTriangle className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
    </div>
  );
};

const TypingIndicator: React.FC = () => (
  <div className="flex items-center gap-1 py-2 px-3">
    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
  </div>
);

const parseContent = (content: string): React.ReactNode => {
  return content.split('\n').map((line, i) => {
    if (line.startsWith('- ') || line.startsWith('• ')) {
      return <li key={i} className="ml-4 list-disc">{parseInline(line.substring(2))}</li>;
    }
    if (line.trim()) {
      return <p key={i} className="mb-2 last:mb-0">{parseInline(line)}</p>;
    }
    return <br key={i} />;
  });
};

const parseInline = (text: string): React.ReactNode => {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return <>{parts.map((p, i) => i % 2 === 1 ? <strong key={i}>{p}</strong> : p)}</>;
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isTyping = false }) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const isEmergency = message.metadata?.isEmergency;
  const hasRedFlag = message.metadata?.redFlagDetected || message.metadata?.isRedFlag;

  if (isSystem) {
    return (
      <div className="flex justify-center my-4 animate-fade-in">
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm ${
          isEmergency ? 'bg-red-900/40 text-red-300 border border-red-500/30' : 'bg-blue-900/30 text-blue-300 border border-blue-500/30'
        }`}>
          {isEmergency ? <AlertTriangle className="w-4 h-4" /> : <Info className="w-4 h-4" />}
          <span>{message.content}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex gap-3 mb-4 animate-fade-in ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className="flex-shrink-0">
        <Avatar role={message.role} isEmergency={isEmergency} />
      </div>
      <div className={`flex flex-col max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`relative px-4 py-3 rounded-2xl shadow-sm ${
          isUser
            ? 'bg-attending-primary text-white rounded-tr-sm'
            : hasRedFlag
              ? 'bg-red-900/40 text-red-100 border-2 border-red-500/40 rounded-tl-sm'
              : 'bg-white/10 text-white border border-white/10 rounded-tl-sm backdrop-blur-sm'
        }`}>
          {hasRedFlag && (
            <div className="absolute -top-2 -left-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
              <AlertTriangle className="w-3 h-3 text-white" />
            </div>
          )}
          {isTyping ? (
            <TypingIndicator />
          ) : (
            <>
              {/* Inline image (user-sent photo) */}
              {(message.metadata as any)?.imageDataUrl && (
                <ChatImage dataUrl={(message.metadata as any).imageDataUrl} />
              )}
              <div className="text-sm leading-relaxed">{parseContent(message.content)}</div>
              {/* AI image analysis card */}
              {(message.metadata as any)?.imageAnalysis && (
                <ImageAnalysisCard analysis={(message.metadata as any).imageAnalysis} />
              )}
            </>
          )}
        </div>
        {!isTyping && (
          <span className={`text-xs text-white/30 mt-1 px-1 ${isUser ? 'text-right' : 'text-left'}`}>
            {formatMessageTime(message.timestamp)}
          </span>
        )}
        {!isUser && message.metadata?.aiConfidence && (
          <div className="flex items-center gap-1 mt-1 text-xs text-white/30">
            <CheckCircle className="w-3 h-3" />
            <span>{Math.round(message.metadata.aiConfidence * 100)}% confident</span>
          </div>
        )}
      </div>
    </div>
  );
};
