// ============================================================
// COMPASS Standalone — Emergency Banner / Modal
// Shown when critical red flags are detected
// ============================================================

import React from 'react';
import { AlertTriangle, Phone, MapPin, X, ArrowRight } from 'lucide-react';

interface EmergencyBannerProps {
  isOpen: boolean;
  symptoms: string[];
  patientName?: string;
  onClose: () => void;
  onContinue: () => void;
}

export const EmergencyBanner: React.FC<EmergencyBannerProps> = ({
  isOpen,
  symptoms,
  patientName,
  onClose,
  onContinue,
}) => {
  if (!isOpen) return null;

  // Prefer precise geolocation if the user allows it; otherwise fall back to
  // Google Maps' "near me" resolution which uses IP-based location. Some
  // mobile browsers delay geolocation prompts for links, so we handle the
  // click imperatively and open the resolved URL in a new tab.
  const handleFindER = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const fallback = 'https://www.google.com/maps/search/emergency+room+near+me';
    if (!navigator.geolocation) {
      window.open(fallback, '_blank', 'noopener,noreferrer');
      return;
    }
    const opened = { done: false };
    const timeout = setTimeout(() => {
      if (!opened.done) {
        opened.done = true;
        window.open(fallback, '_blank', 'noopener,noreferrer');
      }
    }, 2500);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (opened.done) return;
        opened.done = true;
        clearTimeout(timeout);
        const { latitude, longitude } = pos.coords;
        const url = `https://www.google.com/maps/search/emergency+room/@${latitude},${longitude},14z`;
        window.open(url, '_blank', 'noopener,noreferrer');
      },
      () => {
        if (opened.done) return;
        opened.done = true;
        clearTimeout(timeout);
        window.open(fallback, '_blank', 'noopener,noreferrer');
      },
      { maximumAge: 60_000, timeout: 2_000 }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" style={{ animation: 'pulse 2s infinite' }} />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-red-50 px-6 py-4 border-b-4 border-red-500">
          <div className="flex items-center gap-3">
            <div className="text-red-600 animate-pulse">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-red-600">Medical Emergency Detected</h2>
              {patientName && <p className="text-gray-600 text-sm">Patient: {patientName}</p>}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {symptoms.length > 0 && (
            <div className="mb-4 p-3 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm font-medium text-red-800 mb-1">Concerning symptoms detected:</p>
              <ul className="text-sm text-red-700 space-y-1">
                {symptoms.map((s, i) => (
                  <li key={i} className="flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 flex-shrink-0" /> {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mb-4">
            <h3 className="font-semibold text-gray-800 mb-2">While waiting for help:</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2"><span className="text-green-500 font-bold">+</span> Stop all physical activity</li>
              <li className="flex items-start gap-2"><span className="text-green-500 font-bold">+</span> Sit or lie down comfortably</li>
              <li className="flex items-start gap-2"><span className="text-green-500 font-bold">+</span> Stay calm, breathe slowly</li>
              <li className="flex items-start gap-2"><span className="text-green-500 font-bold">+</span> Unlock your door for responders</li>
            </ul>
          </div>

          <div className="p-3 bg-gray-50 rounded-lg mb-4">
            <ul className="space-y-1 text-sm text-gray-600">
              <li className="flex items-start gap-2"><span className="text-red-500 font-bold">-</span> Do NOT drive yourself</li>
              <li className="flex items-start gap-2"><span className="text-red-500 font-bold">-</span> Do NOT wait to see if it gets worse</li>
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 bg-gray-50 border-t space-y-3">
          <a
            href="tel:911"
            className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-colors shadow-lg"
          >
            <Phone className="w-6 h-6" />
            Call 911 Now
          </a>
          <div className="grid grid-cols-2 gap-3">
            <a
              href="https://www.google.com/maps/search/emergency+room+near+me"
              onClick={handleFindER}
              target="_blank"
              rel="noopener noreferrer"
              className="py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <MapPin className="w-5 h-5" />
              Find Nearest ER
            </a>
            <button
              onClick={onContinue}
              className="py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={onContinue}
            className="w-full py-2 text-gray-500 text-sm hover:text-gray-700 transition-colors"
          >
            My symptoms are not this severe — continue assessment
          </button>
        </div>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
