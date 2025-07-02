// Emergency Modal Component

import React, { useState } from 'react';
import { usePatientChatStore } from '@/store/patientChatStore';
import { X, Phone, MapPin, AlertTriangle, Stethoscope, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmergencyOption {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  urgent?: boolean;
}

export const EmergencyModal: React.FC = () => {
  const { setEmergencyModal, handleEmergency } = usePatientChatStore();
  const [isLocating, setIsLocating] = useState(false);

  const handleCall911 = () => {
    handleEmergency('911');
    window.location.href = 'tel:911';
  };

  const handleFindER = async () => {
    setIsLocating(true);
    handleEmergency('emergency-room');
    
    // In production, this would use geolocation API to find nearest ER
    setTimeout(() => {
      setIsLocating(false);
      alert('Finding nearest emergency rooms...\n\nIn production, this would show a map with nearby ERs and directions.');
    }, 1500);
  };

  const handleUrgentCare = async () => {
    setIsLocating(true);
    handleEmergency('urgent-care');
    
    // In production, this would use geolocation API to find urgent care
    setTimeout(() => {
      setIsLocating(false);
      alert('Finding nearest urgent care centers...\n\nIn production, this would show a map with nearby urgent care facilities.');
    }, 1500);
  };

  const handleProviderContact = () => {
    handleEmergency('provider');
    alert('Contacting your healthcare provider...\n\nIn production, this would connect to your provider\'s on-call service.');
  };

  const handleNurseLine = () => {
    handleEmergency('nurse-line');
    alert('Connecting to 24/7 nurse hotline...\n\nIn production, this would provide nurse hotline numbers based on your insurance.');
  };

  const emergencyOptions: EmergencyOption[] = [
    {
      id: '911',
      title: '🚨 Call 911',
      description: 'For life-threatening emergencies',
      icon: <Phone className="w-6 h-6 text-red-600" />,
      action: handleCall911,
      urgent: true
    },
    {
      id: 'er',
      title: '🏥 Find Emergency Rooms',
      description: 'Locate nearest emergency departments',
      icon: <MapPin className="w-6 h-6 text-red-500" />,
      action: handleFindER,
      urgent: true
    },
    {
      id: 'urgent-care',
      title: '⚕️ Find Urgent Care',
      description: 'For non-life-threatening urgent needs',
      icon: <Clock className="w-6 h-6 text-orange-500" />,
      action: handleUrgentCare
    },
    {
      id: 'provider',
      title: '👨‍⚕️ Contact Provider',
      description: 'Reach your healthcare provider',
      icon: <Stethoscope className="w-6 h-6 text-blue-500" />,
      action: handleProviderContact
    },
    {
      id: 'nurse-line',
      title: '📞 Nurse Hotline',
      description: '24/7 medical guidance',
      icon: <Phone className="w-6 h-6 text-green-500" />,
      action: handleNurseLine
    }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-red-50 p-6 border-b border-red-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-red-600" />
              <h2 className="text-2xl font-bold text-red-900">Emergency Help</h2>
            </div>
            <button
              onClick={() => setEmergencyModal(false)}
              className="text-red-600 hover:text-red-800 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-700 mb-6">
            If you're experiencing a life-threatening emergency, please call 911 immediately. 
            For other urgent medical needs, select an option below:
          </p>

          {/* Emergency Options */}
          <div className="space-y-3">
            {emergencyOptions.map((option) => (
              <button
                key={option.id}
                onClick={option.action}
                disabled={isLocating}
                className={cn(
                  "w-full p-4 rounded-xl border-2 transition-all duration-200",
                  "hover:shadow-md hover:-translate-y-0.5",
                  "flex items-start gap-4 text-left",
                  option.urgent 
                    ? "border-red-200 hover:border-red-300 bg-red-50" 
                    : "border-gray-200 hover:border-gray-300 bg-gray-50",
                  isLocating && "opacity-50 cursor-not-allowed"
                )}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {option.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {option.title}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {option.description}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {/* Loading State */}
          {isLocating && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent" />
                <p className="text-sm text-blue-700">
                  Finding medical facilities near you...
                </p>
              </div>
            </div>
          )}

          {/* Return Button */}
          <button
            onClick={() => setEmergencyModal(false)}
            className="w-full mt-6 py-3 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-xl transition-colors duration-200"
          >
            Return to Assessment
          </button>
        </div>
      </div>
    </div>
  );
};
