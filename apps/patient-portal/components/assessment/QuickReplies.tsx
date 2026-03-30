// =============================================================================
// ATTENDING AI - Quick Replies Component
// apps/patient-portal/components/assessment/QuickReplies.tsx
//
// Suggested response buttons for common answers during COMPASS assessment.
// Speeds up the assessment flow and ensures consistent data capture.
//
// UPDATED: Uses unified QuickReply type from @attending/shared/types
// =============================================================================

import React from 'react';
import { ArrowRight, Check, X, Clock, AlertTriangle } from 'lucide-react';

// Import unified types from shared
import type { QuickReply } from '../../../shared/types/chat.types';

// Re-export for convenience
export type { QuickReply };

// ============================================================================
// Props Interface
// ============================================================================

export interface QuickRepliesProps {
  replies: QuickReply[];
  onSelect: (reply: QuickReply) => void;
  disabled?: boolean;
  columns?: 1 | 2 | 3;
  size?: 'sm' | 'md' | 'lg';
  showIcons?: boolean;
}

// ============================================================================
// Preset Quick Reply Sets
// ============================================================================

export const QUICK_REPLY_PRESETS = {
  yesNo: [
    { id: 'yes', text: 'Yes', value: 'yes', icon: 'check' as const, variant: 'success' as const },
    { id: 'no', text: 'No', value: 'no', icon: 'x' as const, variant: 'default' as const },
  ],

  yesNoUnsure: [
    { id: 'yes', text: 'Yes', value: 'yes', icon: 'check' as const, variant: 'success' as const },
    { id: 'no', text: 'No', value: 'no', icon: 'x' as const, variant: 'default' as const },
    { id: 'unsure', text: 'Not sure', value: 'unsure', variant: 'default' as const },
  ],

  timing: [
    { id: 'now', text: 'Just now', value: 'just now' },
    { id: 'today', text: 'Today', value: 'today' },
    { id: 'yesterday', text: 'Yesterday', value: 'yesterday' },
    { id: 'days', text: 'Few days ago', value: 'few days ago' },
    { id: 'week', text: 'About a week', value: 'about a week' },
    { id: 'longer', text: 'Longer', value: 'longer than a week' },
  ],

  painScale: [
    { id: 'pain-0', text: '0 - None', value: '0' },
    { id: 'pain-2', text: '1-2 - Mild', value: '2' },
    { id: 'pain-4', text: '3-4 - Moderate', value: '4' },
    { id: 'pain-6', text: '5-6 - Significant', value: '6', variant: 'warning' as const },
    { id: 'pain-8', text: '7-8 - Severe', value: '8', variant: 'danger' as const },
    { id: 'pain-10', text: '9-10 - Worst possible', value: '10', variant: 'danger' as const },
  ],

  painCharacter: [
    { id: 'sharp', text: 'Sharp', value: 'sharp' },
    { id: 'dull', text: 'Dull', value: 'dull' },
    { id: 'burning', text: 'Burning', value: 'burning' },
    { id: 'throbbing', text: 'Throbbing', value: 'throbbing' },
    { id: 'aching', text: 'Aching', value: 'aching' },
    { id: 'pressure', text: 'Pressure', value: 'pressure' },
    { id: 'stabbing', text: 'Stabbing', value: 'stabbing' },
    { id: 'cramping', text: 'Cramping', value: 'cramping' },
  ],

  frequency: [
    { id: 'constant', text: 'Constant', value: 'constant' },
    { id: 'intermittent', text: 'Comes and goes', value: 'intermittent' },
    { id: 'activity', text: 'Only with activity', value: 'with activity' },
    { id: 'random', text: 'Random', value: 'random' },
    { id: 'worsening', text: 'Getting worse', value: 'progressively worsening', variant: 'warning' as const },
  ],

  commonSymptoms: [
    { id: 'fever', text: 'Fever/Chills', value: 'fever' },
    { id: 'nausea', text: 'Nausea', value: 'nausea' },
    { id: 'vomiting', text: 'Vomiting', value: 'vomiting' },
    { id: 'fatigue', text: 'Fatigue', value: 'fatigue' },
    { id: 'headache', text: 'Headache', value: 'headache' },
    { id: 'dizziness', text: 'Dizziness', value: 'dizziness' },
    { id: 'sob', text: 'Short of breath', value: 'shortness of breath' },
    { id: 'none', text: 'None of these', value: 'none', icon: 'x' as const },
  ],

  chiefComplaint: [
    { id: 'pain', text: 'I have pain', value: 'pain' },
    { id: 'sick', text: 'I feel sick', value: 'feeling sick' },
    { id: 'injury', text: 'I have an injury', value: 'injury' },
    { id: 'checkup', text: 'Need a check-up', value: 'check-up needed' },
    { id: 'medication', text: 'Medication question', value: 'medication inquiry' },
    { id: 'other', text: 'Something else', value: 'other', icon: 'arrow' as const },
  ],

  allergySeverity: [
    { id: 'mild', text: 'Mild (rash, itching)', value: 'mild' },
    { id: 'moderate', text: 'Moderate (hives, swelling)', value: 'moderate', variant: 'warning' as const },
    { id: 'severe', text: 'Severe (anaphylaxis)', value: 'severe', variant: 'danger' as const },
    { id: 'unknown', text: 'Not sure', value: 'unknown' },
  ],

  smokingStatus: [
    { id: 'never', text: 'Never smoked', value: 'never' },
    { id: 'former', text: 'Former smoker', value: 'former' },
    { id: 'current', text: 'Current smoker', value: 'current', variant: 'warning' as const },
    { id: 'vape', text: 'Vape/E-cigarettes', value: 'vaping' },
  ],

  alcoholUse: [
    { id: 'none', text: 'None', value: 'none' },
    { id: 'occasional', text: 'Occasional (social)', value: 'occasional' },
    { id: 'moderate', text: 'Moderate (1-2/day)', value: 'moderate' },
    { id: 'heavy', text: 'Heavy (3+/day)', value: 'heavy', variant: 'warning' as const },
  ],

  confirmation: [
    { id: 'correct', text: 'Yes, this is correct', value: 'confirmed', icon: 'check' as const, variant: 'success' as const },
    { id: 'edit', text: 'I need to make changes', value: 'edit', icon: 'arrow' as const },
  ],
} satisfies Record<string, QuickReply[]>;

// ============================================================================
// Icon Component
// ============================================================================

const getIcon = (icon?: string, className: string = 'w-4 h-4') => {
  switch (icon) {
    case 'check':
      return <Check className={className} />;
    case 'x':
      return <X className={className} />;
    case 'clock':
      return <Clock className={className} />;
    case 'arrow':
      return <ArrowRight className={className} />;
    case 'alert':
      return <AlertTriangle className={className} />;
    default:
      return null;
  }
};

// ============================================================================
// Component
// ============================================================================

export const QuickReplies: React.FC<QuickRepliesProps> = ({
  replies,
  onSelect,
  disabled = false,
  columns = 2,
  size = 'md',
  showIcons = true,
}) => {
  // Size classes
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-base',
    lg: 'px-5 py-4 text-lg',
  };

  // Variant classes
  const getVariantClasses = (variant?: string) => {
    switch (variant) {
      case 'primary':
        return 'bg-teal-100 border-teal-300 text-teal-700 hover:bg-teal-200 hover:border-teal-400';
      case 'success':
        return 'bg-green-100 border-green-300 text-green-700 hover:bg-green-200 hover:border-green-400';
      case 'warning':
        return 'bg-amber-100 border-amber-300 text-amber-700 hover:bg-amber-200 hover:border-amber-400';
      case 'danger':
        return 'bg-red-100 border-red-300 text-red-700 hover:bg-red-200 hover:border-red-400';
      default:
        return 'bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/40';
    }
  };

  // Grid columns
  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
  };

  return (
    <div className={`grid ${gridClasses[columns]} gap-2`}>
      {replies.map((reply) => (
        <button
          key={reply.id}
          onClick={() => onSelect(reply)}
          disabled={disabled}
          className={`
            ${sizeClasses[size]}
            ${getVariantClasses(reply.variant)}
            rounded-xl border-2 font-medium
            transition-all duration-200
            flex items-center justify-center gap-2
            disabled:opacity-50 disabled:cursor-not-allowed
            hover:shadow-md active:scale-[0.98]
          `}
        >
          {showIcons && reply.icon && getIcon(reply.icon)}
          <span>{reply.text}</span>
        </button>
      ))}
    </div>
  );
};

// ============================================================================
// Specialized Components
// ============================================================================

export const YesNoReplies: React.FC<{ onSelect: (value: string) => void; disabled?: boolean }> = ({
  onSelect,
  disabled,
}) => (
  <QuickReplies
    replies={QUICK_REPLY_PRESETS.yesNo}
    onSelect={(reply) => onSelect(reply.value || reply.text)}
    disabled={disabled}
    columns={2}
  />
);

export const PainScaleReplies: React.FC<{ onSelect: (value: number) => void; disabled?: boolean }> = ({
  onSelect,
  disabled,
}) => (
  <QuickReplies
    replies={QUICK_REPLY_PRESETS.painScale}
    onSelect={(reply) => onSelect(parseInt(reply.value || '0', 10))}
    disabled={disabled}
    columns={2}
  />
);

export const TimingReplies: React.FC<{ onSelect: (value: string) => void; disabled?: boolean }> = ({
  onSelect,
  disabled,
}) => (
  <QuickReplies
    replies={QUICK_REPLY_PRESETS.timing}
    onSelect={(reply) => onSelect(reply.value || reply.text)}
    disabled={disabled}
    columns={2}
  />
);

export const PainCharacterReplies: React.FC<{ onSelect: (value: string) => void; disabled?: boolean }> = ({
  onSelect,
  disabled,
}) => (
  <QuickReplies
    replies={QUICK_REPLY_PRESETS.painCharacter}
    onSelect={(reply) => onSelect(reply.value || reply.text)}
    disabled={disabled}
    columns={2}
  />
);

export default QuickReplies;
