// ============================================================
// COMPASS Standalone — Quick Replies (with Multi-Select)
// Suggested response buttons for common answers
// ============================================================

import React, { useState, useEffect } from 'react';
import { ArrowRight, Check, X, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { QuickReply } from '@attending/shared/types/chat.types';

export interface QuickRepliesProps {
  replies: QuickReply[];
  onSelect: (reply: QuickReply) => void;
  disabled?: boolean;
  multiSelect?: boolean;
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

const getVariantClasses = (variant?: string, isSelected?: boolean) => {
  if (isSelected) {
    return 'bg-teal-500/30 border-teal-400 text-white ring-2 ring-teal-400/50';
  }
  switch (variant) {
    case 'primary': return 'bg-teal-500/20 border-teal-500/40 text-teal-300 hover:bg-teal-500/30';
    case 'success': return 'bg-green-500/20 border-green-500/40 text-green-300 hover:bg-green-500/30';
    case 'warning': return 'bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30';
    case 'danger': return 'bg-red-500/20 border-red-500/40 text-red-300 hover:bg-red-500/30';
    default: return 'bg-white/10 border-white/20 text-white/80 hover:bg-white/15 hover:border-white/30';
  }
};

export const QuickReplies: React.FC<QuickRepliesProps> = ({ replies, onSelect, disabled = false, multiSelect = false }) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const cols = replies.length <= 2 ? 'grid-cols-2' : replies.length <= 4 ? 'grid-cols-2' : 'grid-cols-3';

  // Reset selections when replies change (phase advanced)
  useEffect(() => {
    setSelectedIds(new Set());
  }, [replies]);

  const handleClick = (reply: QuickReply) => {
    if (multiSelect && reply.multiSelect) {
      // Toggle selection
      setSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(reply.id)) {
          next.delete(reply.id);
        } else {
          next.add(reply.id);
        }
        return next;
      });
    } else {
      // Immediate single-select
      onSelect(reply);
    }
  };

  const handleDone = () => {
    const selectedReplies = replies.filter(r => selectedIds.has(r.id));
    const combinedValue = selectedReplies.map(r => r.value || r.text).join(', ');
    onSelect({ id: 'multi_done', text: combinedValue, value: combinedValue });
    setSelectedIds(new Set());
  };

  return (
    <div>
      <div className={`grid ${cols} gap-2`}>
        {replies.map((reply) => {
          const isSelected = selectedIds.has(reply.id);
          return (
            <button
              key={reply.id}
              onClick={() => handleClick(reply)}
              disabled={disabled}
              className={`
                px-4 py-3 text-base ${getVariantClasses(reply.variant, isSelected)}
                rounded-xl border-2 font-medium transition-all duration-200
                flex items-center justify-center gap-2
                disabled:opacity-50 disabled:cursor-not-allowed
                hover:shadow-md active:scale-[0.98]
              `}
            >
              {isSelected && <CheckCircle2 className="w-4 h-4 text-teal-300" />}
              {!isSelected && reply.icon && getIcon(reply.icon)}
              <span>{reply.text}</span>
            </button>
          );
        })}
      </div>
      {/* Done button for multi-select */}
      {multiSelect && selectedIds.size > 0 && (
        <button
          onClick={handleDone}
          className="w-full mt-2 px-4 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 text-white font-semibold transition-all hover:shadow-lg active:scale-[0.98]"
        >
          Done ({selectedIds.size} selected)
        </button>
      )}
    </div>
  );
};
