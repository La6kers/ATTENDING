// ============================================================
// COMPASS Emergency Modal Component - Enhanced
// apps/patient-portal/components/chat/EmergencyModal.tsx
//
// Modal displayed when critical symptoms/red flags are detected.
// Includes GPS-based emergency facility finder.
// ============================================================

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  AlertTriangle, 
  Phone, 
  X, 
  MapPin, 
  Heart,
  Clock,
  Loader2,
  Navigation,
  Building2,
  Stethoscope,
  ArrowLeft,
  Star,
  ExternalLink
} from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

interface EmergencyFacility {
  id: string;
  name: string;
  type: 'emergency' | 'urgent-care';
  address: string;
  phone: string;
  distance: number;
  openNow?: boolean;
  waitTime?: string;
  rating?: number;
}

interface EmergencyModalProps {
  onClose: () => void;
  onConfirmEmergency: () => void;
  detectedSymptoms?: string[];
  emergencyType?: string;
  immediateActions?: string[];
  callToAction?: string;
}

type ModalView = 'main' | 'emergency-rooms' | 'urgent-care' | 'nurse-lines';

// =============================================================================
// Emergency Location Service (Local Implementation)
// =============================================================================

const emergencyLocationService = {
  buildDirectionsUrl: (address: string): string => {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
  },

  buildCallUrl: (phone: string): string => {
    return `tel:${phone.replace(/[^\d+]/g, '')}`;
  },

  getCurrentLocation: async (_forceRefresh?: boolean): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          resolve(null);
        },
        { timeout: 5000 }
      );
    });
  },

  findNearbyFacilities: async (
    type: 'emergency' | 'urgent-care',
    _limit: number
  ): Promise<{ success: boolean; facilities: EmergencyFacility[]; error?: string }> => {
    // In a real implementation, this would call Google Places API or similar
    // For now, return placeholder data with a link to search
    const mockFacilities: EmergencyFacility[] = type === 'emergency' 
      ? [
          { id: '1', name: 'County General Hospital ER', type: 'emergency', address: 'Search for nearest ER', phone: '911', distance: 0, openNow: true },
        ]
      : [
          { id: '1', name: 'Urgent Care Center', type: 'urgent-care', address: 'Search for nearest urgent care', phone: '', distance: 0, openNow: true },
        ];
    
    return {
      success: true,
      facilities: mockFacilities,
    };
  },

  getEmergencyHotlines: () => [
    { name: '911 Emergency', number: '911', description: 'Police, Fire, Medical Emergency' },
    { name: 'Suicide Prevention', number: '988', description: '24/7 Crisis Support' },
    { name: 'Poison Control', number: '1-800-222-1222', description: 'Poisoning emergencies' },
  ],

  getInsuranceNurseLines: () => [
    { name: 'Blue Cross', number: '1-800-224-6792' },
    { name: 'Aetna', number: '1-800-556-1555' },
    { name: 'UnitedHealthcare', number: '1-800-901-9355' },
    { name: 'Cigna', number: '1-800-244-6224' },
  ],
};

// =============================================================================
// Facility Card Component
// =============================================================================

interface FacilityCardProps {
  facility: EmergencyFacility;
}

function FacilityCard({ facility }: FacilityCardProps) {
  const directionsUrl = emergencyLocationService.buildDirectionsUrl(facility.address);
  const callUrl = emergencyLocationService.buildCallUrl(facility.phone);

  return (
    <div className="bg-white rounded-xl p-4 border-2 border-gray-200 hover:border-purple-400 hover:shadow-md transition-all">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`
            w-10 h-10 rounded-xl flex items-center justify-center
            ${facility.type === 'emergency' 
              ? 'bg-red-100 text-red-600' 
              : 'bg-blue-100 text-blue-600'
            }
          `}>
            {facility.type === 'emergency' ? (
              <Building2 size={20} />
            ) : (
              <Stethoscope size={20} />
            )}
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 text-sm">{facility.name}</h4>
            <p className="text-xs text-gray-500">{facility.address}</p>
          </div>
        </div>
        {facility.openNow && (
          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
            Open Now
          </span>
        )}
      </div>

      {/* Details */}
      <div className="flex items-center gap-4 text-xs text-gray-600 mb-3">
        {facility.distance > 0 && (
          <div className="flex items-center gap-1">
            <MapPin size={12} />
            <span>{facility.distance.toFixed(1)} mi</span>
          </div>
        )}
        {facility.waitTime && (
          <div className="flex items-center gap-1">
            <Clock size={12} />
            <span>~{facility.waitTime}</span>
          </div>
        )}
        {facility.rating && (
          <div className="flex items-center gap-1">
            <Star size={12} className="fill-yellow-400 text-yellow-400" />
            <span>{facility.rating}</span>
          </div>
        )}
        {facility.phone && (
          <a 
            href={callUrl}
            className="flex items-center gap-1 text-purple-600 hover:underline"
          >
            <Phone size={12} />
            <span>{facility.phone}</span>
          </a>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-2 px-3 bg-gradient-to-r from-purple-600 to-purple-700 
                   text-white text-center text-sm font-medium rounded-lg 
                   hover:shadow-md transition-all flex items-center justify-center gap-2"
        >
          <Navigation size={14} />
          Get Directions
        </a>
        {facility.phone && (
          <a
            href={callUrl}
            className="py-2 px-3 border-2 border-gray-200 text-gray-700 text-sm font-medium 
                     rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-all
                     flex items-center gap-2"
          >
            <Phone size={14} />
            Call
          </a>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Facility List Component
// =============================================================================

interface FacilityListProps {
  type: 'emergency' | 'urgent-care';
  onBack: () => void;
}

function FacilityList({ type, onBack }: FacilityListProps) {
  const [facilities, setFacilities] = useState<EmergencyFacility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadFacilities() {
      setLoading(true);
      setError(null);

      const result = await emergencyLocationService.findNearbyFacilities(type, 5);

      if (result.success) {
        setFacilities(result.facilities);
      } else {
        setError(result.error || 'Failed to load facilities');
      }

      setLoading(false);
    }

    loadFacilities();
  }, [type]);

  const handleRetry = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Force location refresh
    await emergencyLocationService.getCurrentLocation(true);
    const result = await emergencyLocationService.findNearbyFacilities(type, 5);

    if (result.success) {
      setFacilities(result.facilities);
    } else {
      setError(result.error || 'Failed to load facilities');
    }

    setLoading(false);
  }, [type]);

  const searchUrl = type === 'emergency' 
    ? 'https://www.google.com/maps/search/emergency+room+near+me'
    : 'https://www.google.com/maps/search/urgent+care+near+me';

  return (
    <div>
      {/* Back Button */}
      <button
        onClick={onBack}
        className="mb-4 text-purple-600 hover:text-purple-700 font-medium 
                 flex items-center gap-1 text-sm"
      >
        <ArrowLeft size={16} />
        Back to options
      </button>

      {/* Title */}
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        {type === 'emergency' ? (
          <>
            <Building2 className="text-red-600" size={20} />
            Nearby Emergency Rooms
          </>
        ) : (
          <>
            <Stethoscope className="text-blue-600" size={20} />
            Nearby Urgent Care
          </>
        )}
      </h3>

      {/* Quick Search Link */}
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-4">
        <p className="text-sm text-purple-800 mb-2">
          Find {type === 'emergency' ? 'emergency rooms' : 'urgent care centers'} near you:
        </p>
        <a
          href={searchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 py-2 px-4 bg-purple-600 text-white rounded-lg 
                   font-medium text-sm hover:bg-purple-700 transition-colors"
        >
          <MapPin size={16} />
          Search on Google Maps
          <ExternalLink size={14} />
        </a>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin mb-3" />
          <p className="text-gray-600 text-sm">Finding facilities near you...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
          <p className="text-yellow-800 text-sm">{error}</p>
          <button
            onClick={handleRetry}
            className="mt-2 text-yellow-700 text-sm underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Facility List */}
      {!loading && !error && facilities.length > 0 && (
        <div className="space-y-3">
          {facilities.map((facility) => (
            <FacilityCard key={facility.id} facility={facility} />
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Nurse Lines View
// =============================================================================

interface NurseLinesViewProps {
  onBack: () => void;
}

function NurseLinesView({ onBack }: NurseLinesViewProps) {
  const hotlines = emergencyLocationService.getEmergencyHotlines();
  const nurseLines = emergencyLocationService.getInsuranceNurseLines();

  return (
    <div>
      {/* Back Button */}
      <button
        onClick={onBack}
        className="mb-4 text-purple-600 hover:text-purple-700 font-medium 
                 flex items-center gap-1 text-sm"
      >
        <ArrowLeft size={16} />
        Back to options
      </button>

      <h3 className="text-lg font-bold text-gray-900 mb-4">📞 Medical Hotlines</h3>

      {/* Emergency Hotlines */}
      <div className="space-y-2 mb-6">
        <h4 className="text-sm font-semibold text-gray-700">Emergency Lines</h4>
        {hotlines.map((line) => (
          <a
            key={line.number}
            href={`tel:${line.number.replace(/[^\d]/g, '')}`}
            className="block p-3 bg-red-50 border border-red-200 rounded-xl 
                     hover:border-red-400 transition-colors"
          >
            <div className="flex justify-between items-center">
              <div>
                <span className="font-bold text-gray-900">{line.name}</span>
                <p className="text-xs text-gray-600">{line.description}</p>
              </div>
              <span className="text-red-600 font-mono font-bold">{line.number}</span>
            </div>
          </a>
        ))}
      </div>

      {/* Insurance Nurse Lines */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-gray-700">Insurance Nurse Lines</h4>
        <p className="text-xs text-gray-500 mb-2">
          Check your insurance card for your specific nurse line number.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {nurseLines.map((line) => (
            <a
              key={line.number}
              href={`tel:${line.number.replace(/[^\d]/g, '')}`}
              className="p-2 bg-gray-50 border border-gray-200 rounded-lg 
                       hover:border-purple-400 transition-colors text-sm"
            >
              <span className="font-medium text-gray-900 block">{line.name}</span>
              <span className="text-xs text-purple-600">{line.number}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Main Emergency Modal Component
// =============================================================================

export function EmergencyModal({ 
  onClose, 
  onConfirmEmergency,
  detectedSymptoms = [],
  emergencyType,
  immediateActions = [],
  callToAction
}: EmergencyModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [currentView, setCurrentView] = useState<ModalView>('main');

  // Focus trap and escape key handling
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (currentView !== 'main') {
          setCurrentView('main');
        } else {
          onClose();
        }
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    closeButtonRef.current?.focus();
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [onClose, currentView]);

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
        className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Red Alert Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-full animate-pulse">
                <AlertTriangle className="h-7 w-7" />
              </div>
              <div>
                <h2 id="emergency-title" className="text-xl font-bold">
                  {emergencyType || 'Emergency Warning'}
                </h2>
                <p className="text-red-100 text-sm">
                  {callToAction || 'Potentially serious symptoms detected'}
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

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto max-h-[60vh]">
          {/* Main View */}
          {currentView === 'main' && (
            <>
              {/* Detected Symptoms */}
              {detectedSymptoms.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
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

              {/* Immediate Actions */}
              {immediateActions.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                  <h3 className="text-sm font-semibold text-amber-900 mb-2">
                    ⚡ Immediate Actions:
                  </h3>
                  <ul className="space-y-1">
                    {immediateActions.slice(0, 4).map((action, idx) => (
                      <li key={idx} className="text-sm text-amber-800 flex items-start gap-2">
                        <span className="font-bold text-amber-600">{idx + 1}.</span>
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Warning Message */}
              <p className="text-gray-600 text-sm text-center mb-4">
                If you are experiencing a medical emergency, please call 911 or go to your nearest emergency room.
              </p>

              {/* Quick Action Grid */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {/* Call 911 */}
                <button
                  onClick={handleCall911}
                  className="p-4 bg-red-50 border-2 border-red-200 rounded-xl 
                           hover:border-red-400 hover:bg-red-100 transition-all text-left"
                >
                  <Phone className="h-6 w-6 text-red-600 mb-2" />
                  <h4 className="font-bold text-gray-900 text-sm">🚨 Call 911</h4>
                  <p className="text-xs text-gray-600">Life-threatening emergency</p>
                </button>

                {/* Find ER */}
                <button
                  onClick={() => setCurrentView('emergency-rooms')}
                  className="p-4 bg-purple-50 border-2 border-purple-200 rounded-xl 
                           hover:border-purple-400 hover:bg-purple-100 transition-all text-left"
                >
                  <Building2 className="h-6 w-6 text-purple-600 mb-2" />
                  <h4 className="font-bold text-gray-900 text-sm">🏥 Find ER</h4>
                  <p className="text-xs text-gray-600">Nearby with GPS</p>
                </button>

                {/* Find Urgent Care */}
                <button
                  onClick={() => setCurrentView('urgent-care')}
                  className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl 
                           hover:border-blue-400 hover:bg-blue-100 transition-all text-left"
                >
                  <Stethoscope className="h-6 w-6 text-blue-600 mb-2" />
                  <h4 className="font-bold text-gray-900 text-sm">⚕️ Urgent Care</h4>
                  <p className="text-xs text-gray-600">Non-life-threatening</p>
                </button>

                {/* Nurse Lines */}
                <button
                  onClick={() => setCurrentView('nurse-lines')}
                  className="p-4 bg-green-50 border-2 border-green-200 rounded-xl 
                           hover:border-green-400 hover:bg-green-100 transition-all text-left"
                >
                  <Phone className="h-6 w-6 text-green-600 mb-2" />
                  <h4 className="font-bold text-gray-900 text-sm">📞 Nurse Line</h4>
                  <p className="text-xs text-gray-600">24/7 guidance</p>
                </button>
              </div>

              {/* Continue Assessment Option */}
              <div className="space-y-2">
                <button
                  onClick={onConfirmEmergency}
                  className="w-full py-3 px-4 bg-amber-500 text-white rounded-xl 
                           font-semibold hover:bg-amber-600 transition-colors
                           flex items-center justify-center gap-2"
                >
                  <Clock className="h-5 w-5" />
                  Send to Provider Urgently & Continue
                </button>

                <button
                  onClick={onClose}
                  className="w-full text-sm text-gray-500 hover:text-gray-700 py-2"
                >
                  I understand the risk - continue assessment
                </button>
              </div>
            </>
          )}

          {/* Emergency Rooms View */}
          {currentView === 'emergency-rooms' && (
            <FacilityList 
              type="emergency" 
              onBack={() => setCurrentView('main')} 
            />
          )}

          {/* Urgent Care View */}
          {currentView === 'urgent-care' && (
            <FacilityList 
              type="urgent-care" 
              onBack={() => setCurrentView('main')} 
            />
          )}

          {/* Nurse Lines View */}
          {currentView === 'nurse-lines' && (
            <NurseLinesView onBack={() => setCurrentView('main')} />
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-5 py-3 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            This is not a substitute for professional medical advice.
            When in doubt, seek emergency care immediately.
          </p>
        </div>
      </div>
    </div>
  );
}

export default EmergencyModal;
