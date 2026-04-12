// =============================================================================
// ATTENDING AI - Emergency Modal Component
// apps/patient-portal/components/assessment/EmergencyModal.tsx
//
// Critical emergency alert modal with 911 calling, ER finder, and escalation.
// Displays when red flags are detected during COMPASS assessment.
// =============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { 
  AlertTriangle, 
  Phone, 
  MapPin, 
  X, 
  ArrowRight, 
  Clock,
  Heart,
  Activity,
  AlertCircle
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface EmergencyModalProps {
  isOpen: boolean;
  emergencyType: string;
  symptoms?: string[];
  patientName?: string;
  onClose: () => void;
  onCall911: () => void;
  onFindER: () => void;
  onContinueAssessment: () => void;
  onNotifyProvider?: () => void;
}

interface NearbyER {
  name: string;
  address: string;
  distance: string;
  waitTime?: string;
  phone: string;
}

// ============================================================================
// Emergency Type Configurations
// ============================================================================

const EMERGENCY_CONFIGS: Record<string, {
  title: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  instructions: string[];
  doNotDo: string[];
}> = {
  Cardiovascular: {
    title: 'Possible Heart Emergency',
    icon: <Heart className="w-8 h-8" />,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    instructions: [
      'Stop all physical activity immediately',
      'Sit or lie down in a comfortable position',
      'If you have aspirin and are not allergic, chew one regular aspirin (325mg)',
      'Loosen any tight clothing',
      'Try to stay calm and breathe slowly'
    ],
    doNotDo: [
      'Do NOT drive yourself to the hospital',
      'Do NOT ignore chest pain or pressure',
      'Do NOT wait to see if symptoms go away'
    ]
  },
  Respiratory: {
    title: 'Breathing Emergency',
    icon: <Activity className="w-8 h-8" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    instructions: [
      'Sit upright - do not lie flat',
      'Try pursed-lip breathing: breathe in through nose, out through pursed lips',
      'If you have a rescue inhaler, use it now',
      'Loosen any tight clothing around your chest and neck',
      'Open windows or move to fresh air if safe to do so'
    ],
    doNotDo: [
      'Do NOT panic - try to stay calm',
      'Do NOT lie flat on your back',
      'Do NOT exert yourself'
    ]
  },
  Neurological: {
    title: 'Possible Stroke or Neurological Emergency',
    icon: <AlertCircle className="w-8 h-8" />,
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
    instructions: [
      'Note the TIME symptoms started - this is critical for treatment',
      'Lie down with your head slightly elevated',
      'Do NOT eat or drink anything',
      'If possible, have someone stay with you',
      'Keep the area well-lit and quiet'
    ],
    doNotDo: [
      'Do NOT take aspirin for stroke symptoms',
      'Do NOT drive yourself',
      'Do NOT go to sleep'
    ]
  },
  Psychiatric: {
    title: 'Mental Health Crisis',
    icon: <Heart className="w-8 h-8" />,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    instructions: [
      'You are not alone - help is available',
      'Move to a safe, quiet space if possible',
      'Call 988 (Suicide & Crisis Lifeline) if you need to talk',
      'Reach out to a trusted friend or family member',
      'Remove yourself from any dangerous items or situations'
    ],
    doNotDo: [
      'Do NOT isolate yourself completely',
      'Do NOT make any major decisions right now',
      'Remember: This feeling will pass'
    ]
  },
  Allergy: {
    title: 'Severe Allergic Reaction',
    icon: <AlertTriangle className="w-8 h-8" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    instructions: [
      'If you have an EpiPen, use it immediately in your outer thigh',
      'Call 911 even if symptoms improve after EpiPen',
      'Lie down with legs elevated (unless having trouble breathing)',
      'If you have antihistamines (Benadryl), take them',
      'Remove any jewelry or tight clothing'
    ],
    doNotDo: [
      'Do NOT wait to see if symptoms get worse',
      'Do NOT try to drive yourself',
      'Do NOT take oral medications if having trouble swallowing'
    ]
  },
  default: {
    title: 'Medical Emergency Detected',
    icon: <AlertTriangle className="w-8 h-8" />,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    instructions: [
      'Stay calm and do not panic',
      'Do not move unless you are in immediate danger',
      'Have someone stay with you if possible',
      'Gather any medications you are currently taking',
      'Unlock your door for emergency responders'
    ],
    doNotDo: [
      'Do NOT drive yourself to the hospital',
      'Do NOT eat or drink anything',
      'Do NOT ignore your symptoms'
    ]
  }
};

// ============================================================================
// Component
// ============================================================================

export const EmergencyModal: React.FC<EmergencyModalProps> = ({
  isOpen,
  emergencyType,
  symptoms = [],
  patientName,
  onClose,
  onCall911,
  onFindER: _onFindER,
  onContinueAssessment,
  onNotifyProvider
}) => {
  const [showERFinder, setShowERFinder] = useState(false);
  const [nearbyERs, setNearbyERs] = useState<NearbyER[]>([]);
  const [isLoadingERs, setIsLoadingERs] = useState(false);
  const [_countdown, _setCountdown] = useState<number | null>(null);

  const config = EMERGENCY_CONFIGS[emergencyType] || EMERGENCY_CONFIGS.default;

  // Auto-close prevention - require explicit action
  useEffect(() => {
    if (isOpen) {
      // Play audio alert
      if (typeof window !== 'undefined') {
        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.value = 880;
          oscillator.type = 'sine';
          gainNode.gain.value = 0.3;
          
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.3);
          
          setTimeout(() => {
            const osc2 = audioContext.createOscillator();
            osc2.connect(gainNode);
            osc2.frequency.value = 880;
            osc2.type = 'sine';
            osc2.start();
            osc2.stop(audioContext.currentTime + 0.3);
          }, 400);
        } catch (_e) {
          console.log('Audio alert not available');
        }
      }
    }
  }, [isOpen]);

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [showContinue, setShowContinue] = useState(false);

  // 10-second delay before showing the continue option
  useEffect(() => {
    if (isOpen) {
      setShowContinue(false);
      setConfirmText('');
      const timer = setTimeout(() => setShowContinue(true), 10000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Geolocation for ER finder
  const findNearbyERs = useCallback(async () => {
    setIsLoadingERs(true);
    setShowERFinder(true);

    // Get user location
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        });
      });
      const { latitude, longitude } = position.coords;
      setUserLocation({ lat: latitude, lng: longitude });

      // Try Google Places API if key is available
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
      if (apiKey && navigator.onLine) {
        try {
          const res = await fetch(
            `/api/emergency/nearby-facilities?lat=${latitude}&lng=${longitude}`
          );
          if (res.ok) {
            const data = await res.json();
            setNearbyERs(data.facilities || []);
            setIsLoadingERs(false);
            return;
          }
        } catch {
          // Fall through to static fallback
        }
      }

      // Offline / no API key fallback — open Google Maps directly
      setNearbyERs([]);
      setIsLoadingERs(false);
    } catch {
      // Geolocation denied or unavailable
      setNearbyERs([]);
      setIsLoadingERs(false);
    }
  }, []);

  // Handle 911 call
  const handleCall911 = useCallback(() => {
    onCall911();
    // On mobile, this would trigger the phone dialer
    if (typeof window !== 'undefined') {
      window.location.href = 'tel:911';
    }
  }, [onCall911]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop — no click-to-close, this is a hard stop */}
      <div className="absolute inset-0 bg-black/70" />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
        {/* Emergency Header */}
        <div className={`${config.bgColor} px-6 py-4 border-b-4 border-red-500`}>
          <div className="flex items-center gap-3">
            <div className={`${config.color} animate-pulse`}>
              {config.icon}
            </div>
            <div>
              <h2 className={`text-xl font-bold ${config.color}`}>
                ⚠️ {config.title}
              </h2>
              {patientName && (
                <p className="text-gray-600 text-sm">Patient: {patientName}</p>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Detected Symptoms */}
          {symptoms.length > 0 && (
            <div className="mb-4 p-3 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm font-medium text-red-800 mb-1">
                Detected concerning symptoms:
              </p>
              <ul className="text-sm text-red-700">
                {symptoms.map((symptom, idx) => (
                  <li key={idx} className="flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {symptom}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Instructions */}
          <div className="mb-4">
            <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-green-600" />
              While waiting for help:
            </h3>
            <ul className="space-y-2">
              {config.instructions.map((instruction, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-green-500 font-bold">✓</span>
                  {instruction}
                </li>
              ))}
            </ul>
          </div>

          {/* Do Not Do */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-2">Important:</h3>
            <ul className="space-y-1">
              {config.doNotDo.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="text-red-500 font-bold">✗</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* ER Finder */}
          {showERFinder && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Nearby Emergency Facilities
              </h3>
              {isLoadingERs ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                  <span className="ml-2 text-blue-600">Finding nearby facilities...</span>
                </div>
              ) : nearbyERs.length > 0 ? (
                <div className="space-y-3">
                  {nearbyERs.map((er, idx) => (
                    <div
                      key={idx}
                      className="bg-white p-3 rounded-lg border border-blue-100 hover:border-blue-300 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-800">{er.name}</p>
                          <p className="text-sm text-gray-500">{er.address}</p>
                          <div className="flex gap-4 mt-1 text-sm">
                            <span className="text-blue-600">{er.distance}</span>
                            {er.waitTime && (
                              <span className="text-green-600">~{er.waitTime} wait</span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {userLocation && (
                            <a
                              href={`https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lng}/${encodeURIComponent(er.address)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 bg-blue-100 rounded-full text-blue-600 hover:bg-blue-200"
                              title="Get Directions"
                            >
                              <MapPin className="w-4 h-4" />
                            </a>
                          )}
                          <a
                            href={`tel:${er.phone}`}
                            className="p-2 bg-green-100 rounded-full text-green-600 hover:bg-green-200"
                            title="Call"
                          >
                            <Phone className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Offline fallback — direct to Google Maps */
                <div className="text-center py-3">
                  <p className="text-sm text-blue-700 mb-3">
                    {userLocation
                      ? 'Open maps to find emergency rooms near you:'
                      : 'Enable location services to find nearby emergency rooms:'}
                  </p>
                  <a
                    href={userLocation
                      ? `https://www.google.com/maps/search/emergency+room/@${userLocation.lat},${userLocation.lng},13z`
                      : 'https://www.google.com/maps/search/emergency+room+near+me'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <MapPin className="w-4 h-4" />
                    Open Google Maps
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons — HARD STOP: no dismiss without explicit acknowledgment */}
        <div className="p-4 bg-gray-50 border-t space-y-3">
          {/* Primary: Call 911 */}
          <button
            onClick={handleCall911}
            className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-colors shadow-lg animate-pulse"
            style={{ animationDuration: '2s' }}
          >
            <Phone className="w-6 h-6" />
            Call 911 Now
          </button>

          {/* Secondary Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={findNearbyERs}
              className="py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <MapPin className="w-5 h-5" />
              Find Nearest ER
            </button>

            {onNotifyProvider && (
              <button
                onClick={onNotifyProvider}
                className="py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <Activity className="w-5 h-5" />
                Alert Provider
              </button>
            )}
          </div>

          {/* Continue Assessment — requires explicit confirmation */}
          {showContinue && (
            <div className="pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-2 text-center">
                If your symptoms are not severe, type <strong>I UNDERSTAND</strong> below to continue the assessment.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder='Type "I UNDERSTAND"'
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
                <button
                  onClick={onContinueAssessment}
                  disabled={confirmText.trim().toUpperCase() !== 'I UNDERSTAND'}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          )}
        </div>

        {/* NO close button — this is a hard stop */}
      </div>
    </div>
  );
};

export default EmergencyModal;
