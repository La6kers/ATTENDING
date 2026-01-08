// ============================================================
// COMPASS Emergency Modal Component
// apps/patient-portal/components/chat/EmergencyModal.tsx
//
// Modal displayed when critical symptoms/red flags are detected
// ============================================================

import React, { useEffect, useRef } from 'react';
import { 
  AlertTriangle, 
  Phone, 
  X, 
  MapPin, 
  Ambulance,
  Heart,
  Clock
} from 'lucide-react';

interface EmergencyModalProps {
  onClose: () => void;
  onConfirmEmergency: () => void;
  detectedSymptoms?: string[];
}

export function EmergencyModal({ 
  onClose, 
  onConfirmEmergency,
  detectedSymptoms = []
}: EmergencyModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus trap and escape key handling
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    document.addEventListener('keydown', handleEscape);
    closeButtonRef.current?.focus();
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  const handleCall911 = () => {
    window.location.href = 'tel:911';
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="emergency-title"
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div 
        ref={modalRef}
        className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Red Alert Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-full animate-pulse">
                <AlertTriangle className="h-8 w-8" />
              </div>
              <div>
                <h2 id="emergency-title" className="text-xl font-bold">
                  Emergency Warning
                </h2>
                <p className="text-red-100 text-sm">
                  Potentially serious symptoms detected
                </p>
              </div>
            </div>
            <button
              ref={closeButtonRef}
              onClick={onClose}
              className="p-1 rounded-full hover:bg-white/20 transition-colors"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Detected Symptoms */}
          {detectedSymptoms.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-red-900 mb-2 flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Concerning Symptoms Detected:
              </h3>
              <ul className="space-y-1">
                {detectedSymptoms.map((symptom, idx) => (
                  <li key={idx} className="text-sm text-red-700 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                    {symptom}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warning Message */}
          <div className="text-center space-y-2">
            <p className="text-gray-900 font-medium">
              Based on your symptoms, you may need immediate medical attention.
            </p>
            <p className="text-gray-600 text-sm">
              If you're experiencing a medical emergency, please call 911 or go to your nearest emergency room immediately.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Call 911 */}
            <button
              onClick={handleCall911}
              className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-red-600 text-white rounded-xl font-bold text-lg hover:bg-red-700 transition-colors shadow-lg hover:shadow-xl"
            >
              <Phone className="h-6 w-6" />
              Call 911 Now
            </button>

            {/* Find Emergency Room */}
            <a
              href="https://www.google.com/maps/search/emergency+room+near+me"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-3 py-3 px-6 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 transition-colors"
            >
              <MapPin className="h-5 w-5" />
              Find Nearest ER
            </a>

            {/* Continue Assessment */}
            <button
              onClick={onConfirmEmergency}
              className="w-full flex items-center justify-center gap-3 py-3 px-6 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              <Clock className="h-5 w-5" />
              Send to Provider Urgently & Continue
            </button>
          </div>

          {/* Dismiss Option */}
          <div className="text-center">
            <button
              onClick={onClose}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              I understand the risk - continue assessment
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 text-center">
          <p className="text-xs text-gray-500">
            This is not a substitute for professional medical advice.
            When in doubt, seek emergency care immediately.
          </p>
        </div>
      </div>
    </div>
  );
}

export default EmergencyModal;
