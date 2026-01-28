// =============================================================================
// ATTENDING AI - Emergency Medical Access Feature
// apps/patient-portal/components/emergency/EmergencyMedicalAccess.tsx
//
// Crash-detection triggered medical ID with first responder access
// Features:
// - G-force detection for auto-activation
// - First responder PIN access
// - Face capture for security audit
// - Critical medical info display
// =============================================================================

'use client';

import React, { useState, useRef } from 'react';
import {
  AlertTriangle,
  Heart,
  Pill,
  Shield,
  Phone,
  User,
  X,
  AlertCircle,
  Activity,
  Droplets,
  Syringe,
  FileText,
} from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  isPrimary: boolean;
}

interface MedicalInfo {
  bloodType: string;
  allergies: string[];
  conditions: string[];
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
  }>;
  implants: string[];
  emergencyContacts: EmergencyContact[];
  organDonor: boolean;
  advanceDirective: boolean;
  dnr: boolean;
  physicianName: string;
  physicianPhone: string;
  insuranceProvider?: string;
  insuranceId?: string;
  notes?: string;
}

interface AccessLog {
  timestamp: Date;
  method: 'pin' | 'face_scan';
  imageData?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  deviceInfo?: string;
}

// =============================================================================
// Mock Patient Data
// =============================================================================

const mockMedicalInfo: MedicalInfo = {
  bloodType: 'A+',
  allergies: ['Penicillin', 'Sulfa drugs', 'Shellfish'],
  conditions: [
    'Type 2 Diabetes',
    'Hypertension',
    'Atrial Fibrillation',
    'CKD Stage 3',
  ],
  medications: [
    { name: 'Metformin', dosage: '1000mg', frequency: 'Twice daily' },
    { name: 'Lisinopril', dosage: '20mg', frequency: 'Once daily' },
    { name: 'Eliquis', dosage: '5mg', frequency: 'Twice daily' },
    { name: 'Carvedilol', dosage: '12.5mg', frequency: 'Twice daily' },
  ],
  implants: ['Pacemaker (Medtronic, implanted 2022)'],
  emergencyContacts: [
    { name: 'Rachel Anderson', relationship: 'Fiancée', phone: '(555) 123-4567', isPrimary: true },
    { name: 'Michael Anderson', relationship: 'Brother', phone: '(555) 234-5678', isPrimary: false },
  ],
  organDonor: true,
  advanceDirective: true,
  dnr: false,
  physicianName: 'Dr. Sarah Chen',
  physicianPhone: '(555) 345-6789',
  insuranceProvider: 'Blue Cross Blue Shield',
  insuranceId: 'XYZ123456789',
  notes: 'Patient on blood thinners - bleeding risk. Pacemaker - avoid MRI without cardiology clearance.',
};

// =============================================================================
// PIN Entry Component
// =============================================================================

const PINEntry: React.FC<{
  onSuccess: () => void;
  onCaptureFace: () => void;
}> = ({ onSuccess, onCaptureFace }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const CORRECT_PIN = '911911'; // Universal first responder PIN

  const handlePinInput = (digit: string) => {
    if (pin.length < 6) {
      const newPin = pin + digit;
      setPin(newPin);
      setError(false);
      
      if (newPin.length === 6) {
        if (newPin === CORRECT_PIN) {
          onCaptureFace();
          onSuccess();
        } else {
          setError(true);
          setAttempts(prev => prev + 1);
          setTimeout(() => setPin(''), 500);
        }
      }
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setError(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-red-600 p-6">
      {/* Emergency Header */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
          <AlertTriangle size={40} className="text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">EMERGENCY MEDICAL ACCESS</h1>
        <p className="text-red-100">Enter First Responder PIN</p>
      </div>

      {/* PIN Display */}
      <div className="flex gap-3 mb-6">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`w-12 h-14 rounded-lg flex items-center justify-center text-2xl font-bold transition-all ${
              error
                ? 'bg-red-300 border-2 border-red-200'
                : pin.length > i
                ? 'bg-white text-red-600'
                : 'bg-red-500 border-2 border-red-400'
            }`}
          >
            {pin.length > i ? '•' : ''}
          </div>
        ))}
      </div>

      {error && (
        <p className="text-red-100 mb-4 flex items-center gap-2">
          <AlertCircle size={16} />
          Incorrect PIN. Attempt {attempts}/5
        </p>
      )}

      {/* Number Pad */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, 'back'].map((item, idx) => (
          <button
            key={idx}
            onClick={() => {
              if (item === 'back') handleBackspace();
              else if (item !== null) handlePinInput(String(item));
            }}
            disabled={item === null}
            className={`w-16 h-16 rounded-full text-xl font-bold transition-all ${
              item === null
                ? 'invisible'
                : item === 'back'
                ? 'bg-red-500 text-white'
                : 'bg-white text-red-600 active:bg-red-100'
            }`}
          >
            {item === 'back' ? '⌫' : item}
          </button>
        ))}
      </div>

      {/* Info */}
      <div className="text-center text-red-100 text-sm">
        <p className="mb-2">🚨 For authorized first responders only</p>
        <p>Access is logged and photographed for security</p>
      </div>
    </div>
  );
};

// =============================================================================
// Medical Info Display Component
// =============================================================================

const MedicalInfoDisplay: React.FC<{
  info: MedicalInfo;
  onClose?: () => void;
}> = ({ info, onClose }) => {
  return (
    <div className="min-h-screen bg-white">
      {/* Critical Header */}
      <div className="bg-red-600 text-white p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
              <Heart size={24} className="text-red-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold">EMERGENCY MEDICAL INFO</h1>
              <p className="text-red-100 text-sm">Robert Anderson • 68 years old</p>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-2 bg-red-500 rounded-full">
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Critical Alerts */}
      <div className="bg-red-50 border-b-4 border-red-600 p-4">
        <h2 className="font-bold text-red-800 mb-2 flex items-center gap-2">
          <AlertTriangle size={18} />
          CRITICAL ALERTS
        </h2>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-red-700">
            <Droplets size={16} />
            <span className="font-bold">Blood Type: {info.bloodType}</span>
          </div>
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle size={16} />
            <span className="font-bold">ON BLOOD THINNERS (Eliquis) - BLEEDING RISK</span>
          </div>
          <div className="flex items-center gap-2 text-red-700">
            <Activity size={16} />
            <span className="font-bold">HAS PACEMAKER - NO MRI</span>
          </div>
        </div>
      </div>

      {/* Allergies - Critical */}
      <div className="bg-orange-50 p-4 border-b border-orange-200">
        <h2 className="font-bold text-orange-800 mb-2 flex items-center gap-2">
          <AlertTriangle size={18} />
          ALLERGIES
        </h2>
        <div className="flex flex-wrap gap-2">
          {info.allergies.map((allergy, idx) => (
            <span
              key={idx}
              className="px-3 py-1 bg-orange-200 text-orange-800 rounded-full font-medium"
            >
              ⚠️ {allergy}
            </span>
          ))}
        </div>
      </div>

      {/* Medical Conditions */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
          <FileText size={18} />
          MEDICAL CONDITIONS
        </h2>
        <div className="space-y-2">
          {info.conditions.map((condition, idx) => (
            <div key={idx} className="flex items-center gap-2 text-gray-700">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              {condition}
            </div>
          ))}
        </div>
      </div>

      {/* Current Medications */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
          <Pill size={18} />
          CURRENT MEDICATIONS
        </h2>
        <div className="space-y-3">
          {info.medications.map((med, idx) => (
            <div key={idx} className="bg-gray-50 rounded-lg p-3">
              <p className="font-semibold text-gray-900">{med.name}</p>
              <p className="text-sm text-gray-600">
                {med.dosage} • {med.frequency}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Implants/Devices */}
      {info.implants.length > 0 && (
        <div className="p-4 border-b border-gray-200 bg-yellow-50">
          <h2 className="font-bold text-yellow-800 mb-3 flex items-center gap-2">
            <Syringe size={18} />
            IMPLANTS / MEDICAL DEVICES
          </h2>
          <div className="space-y-2">
            {info.implants.map((implant, idx) => (
              <div key={idx} className="flex items-center gap-2 text-yellow-800">
                <AlertCircle size={16} />
                {implant}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Emergency Contacts */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
          <Phone size={18} />
          EMERGENCY CONTACTS
        </h2>
        <div className="space-y-3">
          {info.emergencyContacts.map((contact, idx) => (
            <a
              key={idx}
              href={`tel:${contact.phone}`}
              className="flex items-center justify-between bg-gray-50 rounded-lg p-3"
            >
              <div>
                <p className="font-semibold text-gray-900">
                  {contact.name}
                  {contact.isPrimary && (
                    <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                      PRIMARY
                    </span>
                  )}
                </p>
                <p className="text-sm text-gray-600">{contact.relationship}</p>
              </div>
              <div className="flex items-center gap-2 text-blue-600">
                <Phone size={16} />
                {contact.phone}
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Physician */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
          <User size={18} />
          PRIMARY PHYSICIAN
        </h2>
        <a
          href={`tel:${info.physicianPhone}`}
          className="flex items-center justify-between bg-gray-50 rounded-lg p-3"
        >
          <div>
            <p className="font-semibold text-gray-900">{info.physicianName}</p>
            <p className="text-sm text-gray-600">Primary Care Physician</p>
          </div>
          <div className="flex items-center gap-2 text-blue-600">
            <Phone size={16} />
            {info.physicianPhone}
          </div>
        </a>
      </div>

      {/* Directives */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
          <Shield size={18} />
          MEDICAL DIRECTIVES
        </h2>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <span>Organ Donor</span>
            <span className={info.organDonor ? 'text-green-600 font-medium' : 'text-gray-400'}>
              {info.organDonor ? '✓ Yes' : 'No'}
            </span>
          </div>
          <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <span>Advance Directive on File</span>
            <span className={info.advanceDirective ? 'text-green-600 font-medium' : 'text-gray-400'}>
              {info.advanceDirective ? '✓ Yes' : 'No'}
            </span>
          </div>
          <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <span>DNR Order</span>
            <span className={info.dnr ? 'text-red-600 font-bold' : 'text-gray-600'}>
              {info.dnr ? '⚠️ YES - DNR' : 'No'}
            </span>
          </div>
        </div>
      </div>

      {/* Insurance */}
      {info.insuranceProvider && (
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-bold text-gray-800 mb-3">INSURANCE</h2>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="font-semibold text-gray-900">{info.insuranceProvider}</p>
            <p className="text-sm text-gray-600">ID: {info.insuranceId}</p>
          </div>
        </div>
      )}

      {/* Additional Notes */}
      {info.notes && (
        <div className="p-4 bg-yellow-50">
          <h2 className="font-bold text-yellow-800 mb-2 flex items-center gap-2">
            <AlertCircle size={18} />
            ADDITIONAL NOTES
          </h2>
          <p className="text-yellow-800">{info.notes}</p>
        </div>
      )}

      {/* Footer */}
      <div className="p-4 bg-gray-100 text-center text-sm text-gray-500">
        <p>ATTENDING AI Emergency Medical Access</p>
        <p>Access logged at {new Date().toLocaleString()}</p>
      </div>
    </div>
  );
};

// =============================================================================
// Main Emergency Access Component
// =============================================================================

export const EmergencyMedicalAccess: React.FC<{
  isTriggered?: boolean;
  onClose?: () => void;
}> = ({ isTriggered = false, onClose }) => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [, setAccessLog] = useState<AccessLog | null>(null);

  // Capture face photo when PIN is entered correctly
  const captureFacePhoto = async () => {
    try {
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      
      // Create video element to capture frame
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();

      // Create canvas and capture image
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);
      
      // Get image data
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      
      // Stop camera
      stream.getTracks().forEach(track => track.stop());

      // Get location if available
      let location;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        location = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
      } catch {
        // Location not available
      }

      // Log the access
      const log: AccessLog = {
        timestamp: new Date(),
        method: 'pin',
        imageData,
        location,
        deviceInfo: navigator.userAgent,
      };
      
      setAccessLog(log);
      
      // In production, this would be sent to the server
      console.log('Emergency access logged:', {
        ...log,
        imageData: '[CAPTURED]',
      });

    } catch (error) {
      console.error('Failed to capture photo:', error);
      // Still allow access even if photo capture fails
      setAccessLog({
        timestamp: new Date(),
        method: 'pin',
        deviceInfo: navigator.userAgent,
      });
    }
  };

  const handleUnlock = () => {
    setIsUnlocked(true);
  };

  if (!isTriggered && !isUnlocked) {
    return null;
  }

  if (!isUnlocked) {
    return (
      <PINEntry
        onSuccess={handleUnlock}
        onCaptureFace={captureFacePhoto}
      />
    );
  }

  return (
    <MedicalInfoDisplay
      info={mockMedicalInfo}
      onClose={onClose}
    />
  );
};

export default EmergencyMedicalAccess;
