// =============================================================================
// ATTENDING AI - Unified Emergency Modal Component
// apps/shared/components/chat/EmergencyModal.tsx
//
// Shared emergency alert modal used by both Patient and Provider portals.
// Displays critical alerts and provides emergency action options.
// =============================================================================

import React, { useEffect } from 'react';

// =============================================================================
// Props Interface
// =============================================================================

export interface EmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCall911: () => void;
  symptoms?: string[];
  urgencyLevel?: 'high' | 'emergency';
  title?: string;
  message?: string;
  showCall911?: boolean;
  className?: string;
}

// =============================================================================
// Emergency Modal Component
// =============================================================================

export const EmergencyModal: React.FC<EmergencyModalProps> = ({
  isOpen,
  onClose,
  onCall911,
  symptoms = [],
  urgencyLevel = 'emergency',
  title,
  message,
  showCall911 = true,
  className = '',
}) => {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isEmergency = urgencyLevel === 'emergency';

  const defaultTitle = isEmergency
    ? '🚨 Emergency Symptoms Detected'
    : '⚠️ Urgent Attention Required';

  const defaultMessage = isEmergency
    ? 'Based on your symptoms, you may need immediate medical attention. Please consider calling 911 or going to the nearest emergency room.'
    : 'Your symptoms require prompt medical evaluation. Please contact your healthcare provider or visit an urgent care center soon.';

  return (
    <div className={`fixed inset-0 z-50 overflow-y-auto ${className}`}>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className={`
            relative w-full max-w-md transform rounded-2xl bg-white p-6 shadow-2xl transition-all
            ${isEmergency ? 'border-2 border-red-500' : 'border-2 border-yellow-500'}
          `}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="emergency-title"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div
              className={`
                w-16 h-16 rounded-full flex items-center justify-center
                ${isEmergency ? 'bg-red-100' : 'bg-yellow-100'}
              `}
            >
              {isEmergency ? (
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              ) : (
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
          </div>

          {/* Title */}
          <h2
            id="emergency-title"
            className={`
              text-xl font-bold text-center mb-3
              ${isEmergency ? 'text-red-700' : 'text-yellow-700'}
            `}
          >
            {title || defaultTitle}
          </h2>

          {/* Message */}
          <p className="text-gray-600 text-center mb-4">
            {message || defaultMessage}
          </p>

          {/* Symptoms List */}
          {symptoms.length > 0 && (
            <div className={`rounded-lg p-3 mb-4 ${isEmergency ? 'bg-red-50' : 'bg-yellow-50'}`}>
              <p className={`text-sm font-medium mb-2 ${isEmergency ? 'text-red-700' : 'text-yellow-700'}`}>
                Concerning symptoms:
              </p>
              <ul className="space-y-1">
                {symptoms.map((symptom, index) => (
                  <li
                    key={index}
                    className={`text-sm flex items-center gap-2 ${isEmergency ? 'text-red-600' : 'text-yellow-600'}`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current flex-shrink-0" />
                    {symptom}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            {showCall911 && isEmergency && (
              <button
                onClick={onCall911}
                className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Call 911 Now
              </button>
            )}

            <button
              onClick={onClose}
              className={`
                w-full py-3 px-4 font-medium rounded-xl transition-colors
                ${isEmergency
                  ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  : 'bg-yellow-100 hover:bg-yellow-200 text-yellow-700'
                }
              `}
            >
              {isEmergency ? 'Continue Assessment' : 'I Understand'}
            </button>
          </div>

          {/* Disclaimer */}
          <p className="text-xs text-gray-500 text-center mt-4">
            This is not a substitute for professional medical advice. When in doubt, always seek emergency care.
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmergencyModal;
