// ============================================================
// COMPASS Standalone — Quick Replies
// Suggested response buttons for common answers
// ============================================================

import React from 'react';
import { ArrowRight, Check, X, Clock, AlertTriangle } from 'lucide-react';
import type { QuickReply } from '@attending/shared/types/chat.types';

export interface QuickRepliesProps {
  replies: QuickReply[];
  onSelect: (reply: QuickReply) => void;
  disabled?: boolean;
}

const getIcon = (icon?: string) => {
  switch (icon) {
    case 'check': return <Check className="w-4 h-4" />;
    case 'x': return <X className="w-4 h-4" />;
    case 'clock': return <Clock className="w-4 h-4" />;
    case 'arrow': return <ArrowRight className="w-4 h-4" />;
    case 'alert': return <AlertTriangle className="w-4 h-4" />;
    default: return null;
  }
};

const getVariantClasses = (variant?: string) => {
  switch (variant) {
    case 'primary': return 'bg-teal-500/20 border-teal-500/40 text-teal-300 hover:bg-teal-500/30';
    case 'success': return 'bg-green-500/20 border-green-500/40 text-green-300 hover:bg-green-500/30';
    case 'warning': return 'bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30';
    case 'danger': return 'bg-red-500/20 border-red-500/40 text-red-300 hover:bg-red-500/30';
    default: return 'bg-white/10 border-white/20 text-white/80 hover:bg-white/15 hover:border-white/30';
  }
};

export const QuickReplies: React.FC<QuickRepliesProps> = ({ replies, onSelect, disabled = false }) => {
  const cols = replies.length <= 2 ? 'grid-cols-2' : replies.length <= 4 ? 'grid-cols-2' : 'grid-cols-3';

  return (
    <div className={`grid ${cols} gap-2`}>
      {replies.map((reply) => (
        <button
          key={reply.id}
          onClick={() => onSelect(reply)}
          disabled={disabled}
          className={`
            px-4 py-3 text-base ${getVariantClasses(reply.variant)}
            rounded-xl border-2 font-medium transition-all duration-200
            flex items-center justify-center gap-2
            disabled:opacity-50 disabled:cursor-not-allowed
            hover:shadow-md active:scale-[0.98]
          `}
        >
          {reply.icon && getIcon(reply.icon)}
          <span>{reply.text}</span>
        </button>
      ))}
    </div>
  );
};
