// ============================================================
// Clinical Decision Support Disclaimer Component
// apps/shared/components/ClinicalDisclaimer.tsx
//
// FDA 21st Century Cures Act § 3060(a) - Clinical Decision Support
// This component provides the required disclaimer that AI features
// are decision SUPPORT tools, not autonomous clinical decisions.
//
// Place this component:
// - At the top of any page showing AI-generated content
// - Within AI recommendation panels
// - In assessment summaries that include AI analysis
// - Near differential diagnosis suggestions
// ============================================================

import React from 'react';

export type DisclaimerVariant = 'banner' | 'inline' | 'compact' | 'footer';
export type DisclaimerContext = 
  | 'differential'
  | 'recommendations'
  | 'risk-score'
  | 'lab-suggestions'
  | 'imaging-suggestions'
  | 'medication-check'
  | 'triage'
  | 'general';

interface ClinicalDisclaimerProps {
  /** Display variant */
  variant?: DisclaimerVariant;
  /** Clinical context for tailored messaging */
  context?: DisclaimerContext;
  /** Custom override message */
  message?: string;
  /** Whether the disclaimer can be dismissed (banner only) */
  dismissible?: boolean;
  /** Callback when dismissed */
  onDismiss?: () => void;
  /** Additional CSS classes */
  className?: string;
}

const CONTEXT_MESSAGES: Record<DisclaimerContext, string> = {
  differential:
    'Differential diagnoses are generated using evidence-based algorithms and clinical guidelines. ' +
    'These suggestions require independent clinical judgment and should not replace a thorough patient evaluation.',
  recommendations:
    'Clinical recommendations are derived from peer-reviewed guidelines and population-level evidence. ' +
    'Individual patient circumstances may warrant different approaches.',
  'risk-score':
    'Risk scores are statistical estimates based on population data and known risk factors. ' +
    'Clinical correlation and individual patient assessment are essential.',
  'lab-suggestions':
    'Suggested laboratory tests are based on clinical guidelines for the presenting symptoms. ' +
    'Ordering decisions should reflect the individual clinical context.',
  'imaging-suggestions':
    'Imaging recommendations follow ACR Appropriateness Criteria and clinical guidelines. ' +
    'Clinical judgment should guide final ordering decisions.',
  'medication-check':
    'Drug interaction and dosing checks reference standard pharmaceutical databases. ' +
    'Verify all medication decisions with current references and patient-specific factors.',
  triage:
    'Triage levels are algorithmically assigned based on reported symptoms and vital signs. ' +
    'Clinical reassessment by a qualified provider is required for all patients.',
  general:
    'This clinical decision support tool provides evidence-based suggestions to assist clinical reasoning. ' +
    'All outputs require independent verification by a licensed healthcare provider.',
};

const LEGAL_FOOTER =
  'ATTENDING AI is a clinical decision support system. It does not independently diagnose, ' +
  'treat, or manage patients. All clinical decisions are the responsibility of the treating provider.';

export const ClinicalDisclaimer: React.FC<ClinicalDisclaimerProps> = ({
  variant = 'inline',
  context = 'general',
  message,
  dismissible = false,
  onDismiss,
  className = '',
}) => {
  const [dismissed, setDismissed] = React.useState(false);

  if (dismissed) return null;

  const displayMessage = message || CONTEXT_MESSAGES[context];

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  // Compact: single-line for tight spaces
  if (variant === 'compact') {
    return (
      <p className={`text-xs text-gray-500 italic ${className}`}>
        ⓘ Clinical decision support — requires provider verification
      </p>
    );
  }

  // Footer: legal disclaimer at page bottom
  if (variant === 'footer') {
    return (
      <div className={`border-t border-gray-200 pt-3 mt-6 ${className}`}>
        <p className="text-xs text-gray-400 leading-relaxed">
          {LEGAL_FOOTER}
        </p>
      </div>
    );
  }

  // Banner: prominent top-of-page notice
  if (variant === 'banner') {
    return (
      <div
        className={`bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-4 flex items-start gap-3 ${className}`}
        role="note"
        aria-label="Clinical decision support disclaimer"
      >
        <span className="text-blue-500 text-lg flex-shrink-0 mt-0.5">🏥</span>
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-800 mb-0.5">
            Evidence-Based Decision Support
          </p>
          <p className="text-xs text-blue-700 leading-relaxed">
            {displayMessage}
          </p>
        </div>
        {dismissible && (
          <button
            onClick={handleDismiss}
            className="text-blue-400 hover:text-blue-600 text-sm flex-shrink-0"
            aria-label="Dismiss disclaimer"
          >
            ✕
          </button>
        )}
      </div>
    );
  }

  // Inline (default): subtle contextual note
  return (
    <div
      className={`bg-gray-50 border border-gray-200 rounded px-3 py-2 ${className}`}
      role="note"
      aria-label="Clinical decision support disclaimer"
    >
      <p className="text-xs text-gray-600 leading-relaxed">
        <span className="font-medium">ⓘ Decision Support:</span>{' '}
        {displayMessage}
      </p>
    </div>
  );
};

// ============================================================
// COPY CONSTANTS for consistent terminology across the platform
// ============================================================

/**
 * Use these constants instead of ad-hoc AI language in components.
 *
 * ❌ AVOID: "AI diagnosis", "AI recommends", "AI predicts"
 * ✅ USE:   "Evidence-based suggestion", "Clinical decision support",
 *           "Guideline-based recommendation"
 */
export const CDS_COPY = {
  // Section headers
  SECTION_TITLE: 'Clinical Decision Support',
  DIFFERENTIAL_TITLE: 'Evidence-Based Differential Considerations',
  RECOMMENDATIONS_TITLE: 'Guideline-Based Recommendations',
  RISK_TITLE: 'Risk Assessment',
  LAB_TITLE: 'Suggested Laboratory Studies',
  IMAGING_TITLE: 'Suggested Imaging Studies',
  TRIAGE_TITLE: 'Algorithmic Triage Assessment',

  // Action labels
  REVIEW_ACTION: 'Review Suggestion',
  ACCEPT_ACTION: 'Accept & Order',
  MODIFY_ACTION: 'Modify & Order',
  DISMISS_ACTION: 'Dismiss Suggestion',

  // Confidence framing
  HIGH_CONFIDENCE: 'Strongly supported by clinical evidence',
  MODERATE_CONFIDENCE: 'Supported by clinical guidelines',
  LOW_CONFIDENCE: 'Consider based on clinical presentation',

  // Attribution
  POWERED_BY: 'Powered by ATTENDING Clinical Decision Support',
  EVIDENCE_SOURCE: 'Based on peer-reviewed clinical guidelines',
  DISCLAIMER_SHORT: 'Decision support — requires provider verification',

  // Avoid these phrases (for reference / linting)
  DEPRECATED_PHRASES: [
    'AI diagnosis',
    'AI recommends',
    'AI predicts',
    'AI determines',
    'AI-generated diagnosis',
    'the AI says',
    'AI decision',
    'machine-generated',
    'computer diagnosis',
  ] as const,
} as const;

export default ClinicalDisclaimer;
