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
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
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
  onFindER,
  onContinueAssessment,
  onNotifyProvider
}) => {
  const [showERFinder, setShowERFinder] = useState(false);
  const [nearbyERs, setNearbyERs] = useState<NearbyER[]>([]);
  const [isLoadingERs, setIsLoadingERs] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

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
        } catch (e) {
          console.log('Audio alert not available');
        }
      }
    }
  }, [isOpen]);

  // Geolocation for ER finder
  const findNearbyERs = useCallback(async () => {
    setIsLoadingERs(true);
    setShowERFinder(true);

    try {
      // In production, this would use Google Places API or similar
      // For now, simulate with mock data
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setNearbyERs([
        {
          name: 'Memorial Hospital Emergency',
          address: '123 Medical Center Drive',
          distance: '2.3 miles',
          waitTime: '15 min',
          phone: '(555) 123-4567'
        },
        {
          name: 'St. Mary\'s Regional Medical Center',
          address: '456 Healthcare Blvd',
          distance: '4.1 miles',
          waitTime: '25 min',
          phone: '(555) 234-5678'
        },
        {
          name: 'University Medical Center ER',
          address: '789 University Ave',
          distance: '5.8 miles',
          waitTime: '10 min',
          phone: '(555) 345-6789'
        }
      ]);
    } catch (error) {
      console.error('Error finding ERs:', error);
    } finally {
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
      {/* Backdrop with pulse animation */}
      <div 
        className="absolute inset-0 bg-black/60 animate-pulse"
        style={{ animationDuration: '2s' }}
      />
      
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
                Nearby Emergency Rooms
              </h3>
              {isLoadingERs ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                  <span className="ml-2 text-blue-600">Finding nearby ERs...</span>
                </div>
              ) : (
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
                        <a
                          href={`tel:${er.phone}`}
                          className="p-2 bg-green-100 rounded-full text-green-600 hover:bg-green-200"
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-gray-50 border-t space-y-3">
          {/* Primary: Call 911 */}
          <button
            onClick={handleCall911}
            className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-colors shadow-lg"
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
                className="py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <Activity className="w-5 h-5" />
                Alert Provider
              </button>
            )}
          </div>

          {/* Continue Assessment (if symptoms are acknowledged) */}
          <button
            onClick={onContinueAssessment}
            className="w-full py-2 text-gray-600 hover:text-gray-800 text-sm flex items-center justify-center gap-1 transition-colors"
          >
            My symptoms are not this severe
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Close button - small and de-emphasized */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default EmergencyModal;
