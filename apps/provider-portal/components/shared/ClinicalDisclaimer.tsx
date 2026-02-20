// ============================================================
// ATTENDING AI - Clinical Disclaimer Banner Component
// apps/provider-portal/components/shared/ClinicalDisclaimer.tsx
//
// Drop-in component for any section rendering AI-generated
// clinical content. Ensures consistent FDA/AMA-compliant
// framing across all clinical views.
//
// Usage:
//   <ClinicalDisclaimer />                    // Standard
//   <ClinicalDisclaimer variant="inline" />   // Compact
//   <ClinicalDisclaimer variant="footer" />   // Subtle footer
//   <ClinicalDisclaimer text={DIFFERENTIAL_DISCLAIMER} /> // Custom
// ============================================================

import React from 'react';
import {
  CLINICAL_DISCLAIMER,
  CLINICAL_DISCLAIMER_SHORT,
  TERM,
} from '@attending/shared/lib/clinicalBranding';

interface ClinicalDisclaimerProps {
  /** Display variant */
  variant?: 'standard' | 'inline' | 'footer';
  /** Custom disclaimer text (overrides default) */
  text?: string;
  /** Evidence source to cite */
  source?: string;
  /** Additional CSS classes */
  className?: string;
}

export const ClinicalDisclaimer: React.FC<ClinicalDisclaimerProps> = ({
  variant = 'standard',
  text,
  source,
  className = '',
}) => {
  if (variant === 'inline') {
    return (
      <span
        className={`text-xs text-gray-500 italic ${className}`}
        role="note"
        aria-label="Clinical decision support disclaimer"
      >
        {text || CLINICAL_DISCLAIMER_SHORT}
      </span>
    );
  }

  if (variant === 'footer') {
    return (
      <div
        className={`mt-4 pt-3 border-t border-gray-200 ${className}`}
        role="note"
        aria-label="Clinical decision support disclaimer"
      >
        <div className="flex items-start gap-2">
          <svg
            className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-xs text-gray-500 leading-relaxed">
            {text || CLINICAL_DISCLAIMER}
            {source && (
              <span className="block mt-1 text-gray-400">
                Source: {source}
              </span>
            )}
          </p>
        </div>
      </div>
    );
  }

  // Standard variant
  return (
    <div
      className={`rounded-md bg-blue-50 border border-blue-100 p-3 ${className}`}
      role="note"
      aria-label="Clinical decision support disclaimer"
    >
      <div className="flex items-start gap-2.5">
        <svg
          className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
        <div>
          <p className="text-sm font-medium text-blue-800">
            {TERM.aiInsightsHeader}
          </p>
          <p className="text-xs text-blue-700 mt-1 leading-relaxed">
            {text || CLINICAL_DISCLAIMER}
          </p>
          {source && (
            <p className="text-xs text-blue-500 mt-1">
              Source: {source}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClinicalDisclaimer;
