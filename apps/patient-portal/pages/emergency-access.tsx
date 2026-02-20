// =============================================================================
// ATTENDING AI - Emergency Access Page
// apps/patient-portal/pages/emergency-access.tsx
//
// The page shown when crash is detected or when emergency access is triggered
// =============================================================================

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  AlertTriangle,
  Heart,
  Pill,
  Shield,
  Phone,
  User,
  AlertCircle,
  Droplets,
  Syringe,
  FileText,
  Camera,
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
  patientName: string;
  dateOfBirth: string;
  age: number;
  bloodType: string;
  allergies: string[];
  conditions: string[];
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    critical?: boolean;
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

// =============================================================================
// Mock Patient Data
// =============================================================================

const mockMedicalInfo: MedicalInfo = {
  patientName: 'Robert Anderson',
  dateOfBirth: '1957-03-15',
  age: 68,
  bloodType: 'A+',
  allergies: ['Penicillin', 'Sulfa drugs', 'Shellfish'],
  conditions: [
    'Type 2 Diabetes',
    'Hypertension',
    'Atrial Fibrillation',
    'Chronic Kidney Disease Stage 3',
  ],
  medications: [
    { name: 'Metformin', dosage: '1000mg', frequency: 'Twice daily', critical: false },
    { name: 'Lisinopril', dosage: '20mg', frequency: 'Once daily', critical: false },
    { name: 'Eliquis (Apixaban)', dosage: '5mg', frequency: 'Twice daily', critical: true },
    { name: 'Carvedilol', dosage: '12.5mg', frequency: 'Twice daily', critical: false },
    { name: 'Furosemide', dosage: '40mg', frequency: 'Once daily', critical: false },
  ],
  implants: ['Pacemaker (Medtronic Azure XT DR, implanted March 2022)'],
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
  notes: 'Patient on anticoagulation (Eliquis) - INCREASED BLEEDING RISK. Has pacemaker - AVOID MRI without cardiology clearance. Contact cardiology for pacemaker interrogation if needed.',
};

// =============================================================================
// Countdown Screen Component
// =============================================================================

const CountdownScreen: React.FC<{
  seconds: number;
  onCancel: () => void;
  onExpire: () => void;
}> = ({ seconds, onCancel, onExpire }) => {
  const [countdown, setCountdown] = useState(seconds);

  useEffect(() => {
    if (countdown <= 0) {
      onExpire();
      return;
    }

    const timer = setInterval(() => {
      setCountdown(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, onExpire]);

  return (
    <div className="min-h-screen bg-red-600 flex flex-col items-center justify-center p-6 text-white">
      {/* Pulsing Alert */}
      <div className="relative mb-8">
        <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center animate-pulse">
          <AlertTriangle size={64} className="text-red-600" />
        </div>
        <div className="absolute inset-0 w-32 h-32 bg-white rounded-full animate-ping opacity-30" />
      </div>

      <h1 className="text-3xl font-bold mb-2">CRASH DETECTED</h1>
      <p className="text-red-100 text-center mb-8 max-w-xs">
        Emergency Medical Access will activate in:
      </p>

      {/* Countdown Timer */}
      <div className="text-8xl font-bold mb-8 tabular-nums">
        {countdown}
      </div>

      <p className="text-red-100 text-center mb-8 max-w-xs">
        Tap below if you're okay to cancel
      </p>

      {/* Cancel Button */}
      <button
        onClick={onCancel}
        className="w-full max-w-xs py-4 bg-white text-red-600 rounded-xl font-bold text-lg shadow-lg active:scale-95 transition-transform"
      >
        I'M OKAY - CANCEL
      </button>

      {/* Info */}
      <div className="mt-8 text-center text-red-200 text-sm">
        <p>Your emergency contacts will be notified</p>
        <p>Location will be shared with emergency services</p>
      </div>
    </div>
  );
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
        <p className="flex items-center justify-center gap-2">
          <Camera size={14} />
          Access is logged and photographed for security
        </p>
      </div>
    </div>
  );
};

// =============================================================================
// Medical Info Display Component
// =============================================================================

const MedicalInfoDisplay: React.FC<{
  info: MedicalInfo;
  accessTime: Date;
}> = ({ info, accessTime }) => {
  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Critical Header */}
      <div className="bg-red-600 text-white p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
            <Heart size={24} className="text-red-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold">EMERGENCY MEDICAL INFO</h1>
            <p className="text-red-100 text-sm">
              {info.patientName} • {info.age}yo • DOB: {info.dateOfBirth}
            </p>
          </div>
        </div>
      </div>

      {/* CRITICAL ALERTS - Most Important Info First */}
      <div className="bg-red-50 border-b-4 border-red-600 p-4">
        <h2 className="font-bold text-red-800 mb-3 flex items-center gap-2 text-lg">
          <AlertTriangle size={20} />
          ⚠️ CRITICAL ALERTS
        </h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3 bg-red-100 p-3 rounded-lg">
            <Droplets size={24} className="text-red-700" />
            <span className="font-bold text-red-800 text-lg">Blood Type: {info.bloodType}</span>
          </div>
          
          <div className="bg-red-200 p-3 rounded-lg border-2 border-red-400">
            <p className="font-bold text-red-900 text-lg">
              ⚠️ ON BLOOD THINNERS (Eliquis) - HIGH BLEEDING RISK
            </p>
          </div>
          
          <div className="bg-yellow-100 p-3 rounded-lg border-2 border-yellow-400">
            <p className="font-bold text-yellow-900 text-lg">
              ⚠️ HAS PACEMAKER - NO MRI WITHOUT CARDIOLOGY
            </p>
          </div>
        </div>
      </div>

      {/* Allergies - Critical */}
      <div className="bg-orange-50 p-4 border-b-2 border-orange-300">
        <h2 className="font-bold text-orange-800 mb-3 flex items-center gap-2 text-lg">
          <AlertTriangle size={20} />
          ALLERGIES
        </h2>
        <div className="flex flex-wrap gap-2">
          {info.allergies.map((allergy, idx) => (
            <span
              key={idx}
              className="px-4 py-2 bg-orange-200 text-orange-900 rounded-full font-bold text-lg"
            >
              ⚠️ {allergy}
            </span>
          ))}
        </div>
      </div>

      {/* Medical Conditions */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2 text-lg">
          <FileText size={20} />
          MEDICAL CONDITIONS
        </h2>
        <div className="space-y-2">
          {info.conditions.map((condition, idx) => (
            <div key={idx} className="flex items-center gap-2 text-gray-700 text-lg">
              <div className="w-3 h-3 bg-blue-500 rounded-full" />
              {condition}
            </div>
          ))}
        </div>
      </div>

      {/* Current Medications */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2 text-lg">
          <Pill size={20} />
          CURRENT MEDICATIONS
        </h2>
        <div className="space-y-3">
          {info.medications.map((med, idx) => (
            <div 
              key={idx} 
              className={`rounded-lg p-3 ${
                med.critical ? 'bg-red-50 border-2 border-red-300' : 'bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                {med.critical && <AlertTriangle size={16} className="text-red-600" />}
                <p className={`font-semibold ${med.critical ? 'text-red-900' : 'text-gray-900'}`}>
                  {med.name}
                </p>
              </div>
              <p className="text-gray-600">
                {med.dosage} • {med.frequency}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Implants/Devices */}
      {info.implants.length > 0 && (
        <div className="p-4 border-b border-gray-200 bg-yellow-50">
          <h2 className="font-bold text-yellow-800 mb-3 flex items-center gap-2 text-lg">
            <Syringe size={20} />
            IMPLANTS / MEDICAL DEVICES
          </h2>
          <div className="space-y-2">
            {info.implants.map((implant, idx) => (
              <div key={idx} className="flex items-start gap-2 text-yellow-900">
                <AlertCircle size={18} className="mt-1 flex-shrink-0" />
                <span className="font-medium">{implant}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Emergency Contacts */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2 text-lg">
          <Phone size={20} />
          EMERGENCY CONTACTS
        </h2>
        <div className="space-y-3">
          {info.emergencyContacts.map((contact, idx) => (
            <a
              key={idx}
              href={`tel:${contact.phone.replace(/\D/g, '')}`}
              className="flex items-center justify-between bg-green-50 rounded-lg p-4 border border-green-200 active:bg-green-100"
            >
              <div>
                <p className="font-semibold text-gray-900 text-lg">
                  {contact.name}
                  {contact.isPrimary && (
                    <span className="ml-2 px-2 py-0.5 bg-green-200 text-green-800 text-sm rounded">
                      PRIMARY
                    </span>
                  )}
                </p>
                <p className="text-gray-600">{contact.relationship}</p>
              </div>
              <div className="flex items-center gap-2 text-green-700 font-bold">
                <Phone size={20} />
                <span className="text-lg">{contact.phone}</span>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Physician */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2 text-lg">
          <User size={20} />
          PRIMARY PHYSICIAN
        </h2>
        <a
          href={`tel:${info.physicianPhone.replace(/\D/g, '')}`}
          className="flex items-center justify-between bg-blue-50 rounded-lg p-4 border border-blue-200 active:bg-blue-100"
        >
          <div>
            <p className="font-semibold text-gray-900 text-lg">{info.physicianName}</p>
            <p className="text-gray-600">Primary Care Physician</p>
          </div>
          <div className="flex items-center gap-2 text-blue-700 font-bold">
            <Phone size={20} />
            <span className="text-lg">{info.physicianPhone}</span>
          </div>
        </a>
      </div>

      {/* Medical Directives */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2 text-lg">
          <Shield size={20} />
          MEDICAL DIRECTIVES
        </h2>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="font-medium">Organ Donor</span>
            <span className={info.organDonor ? 'text-green-600 font-bold' : 'text-gray-400'}>
              {info.organDonor ? '✓ YES' : 'No'}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="font-medium">Advance Directive on File</span>
            <span className={info.advanceDirective ? 'text-green-600 font-bold' : 'text-gray-400'}>
              {info.advanceDirective ? '✓ YES' : 'No'}
            </span>
          </div>
          <div className={`flex items-center justify-between p-3 rounded-lg ${
            info.dnr ? 'bg-red-100 border-2 border-red-300' : 'bg-gray-50'
          }`}>
            <span className="font-medium">DNR Order</span>
            <span className={info.dnr ? 'text-red-700 font-bold text-xl' : 'text-gray-600'}>
              {info.dnr ? '⚠️ YES - DNR' : 'No - Full Code'}
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
            <p className="text-gray-600">ID: {info.insuranceId}</p>
          </div>
        </div>
      )}

      {/* Additional Notes */}
      {info.notes && (
        <div className="p-4 bg-yellow-50 border-b-4 border-yellow-400">
          <h2 className="font-bold text-yellow-800 mb-2 flex items-center gap-2 text-lg">
            <AlertCircle size={20} />
            IMPORTANT NOTES FOR CARE TEAM
          </h2>
          <p className="text-yellow-900 font-medium">{info.notes}</p>
        </div>
      )}

      {/* Footer */}
      <div className="p-4 bg-gray-100 text-center">
        <div className="flex items-center justify-center gap-2 text-gray-600 mb-2">
          <Camera size={16} />
          <span className="text-sm">Access photo captured for security</span>
        </div>
        <p className="text-sm text-gray-500">
          ATTENDING AI Emergency Medical Access
        </p>
        <p className="text-xs text-gray-400">
          Accessed: {accessTime.toLocaleString()}
        </p>
      </div>
    </div>
  );
};

// =============================================================================
// Main Emergency Access Page
// =============================================================================

export default function EmergencyAccessPage() {
  const router = useRouter();
  const { mode } = router.query; // 'crash' for auto-triggered, 'preview' for testing
  
  const [stage, setStage] = useState<'countdown' | 'pin' | 'display'>('pin');
  const [accessTime, setAccessTime] = useState<Date>(new Date());

  // If triggered by crash detection, start with countdown
  useEffect(() => {
    if (mode === 'crash') {
      setStage('countdown');
    } else if (mode === 'preview') {
      setStage('display');
      setAccessTime(new Date());
    }
  }, [mode]);

  const handleCancelCountdown = () => {
    // User is okay - go back to dashboard
    router.push('/dashboard');
  };

  const handleCountdownExpire = () => {
    // Countdown finished - show PIN entry
    setStage('pin');
  };

  const handlePINSuccess = () => {
    setAccessTime(new Date());
    setStage('display');
  };

  const captureFacePhoto = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);
      
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      stream.getTracks().forEach(track => track.stop());

      // Get location
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

      // Log to console (in production, send to server)
      console.log('🔐 Emergency access logged:', {
        timestamp: new Date().toISOString(),
        imageData: '[CAPTURED - ' + (imageData.length / 1024).toFixed(1) + 'KB]',
        location,
        userAgent: navigator.userAgent,
      });

    } catch (error) {
      console.error('Failed to capture photo:', error);
    }
  };

  return (
    <>
      <Head>
        <title>Emergency Medical Access | ATTENDING AI</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#dc2626" />
      </Head>

      {stage === 'countdown' && (
        <CountdownScreen
          seconds={30}
          onCancel={handleCancelCountdown}
          onExpire={handleCountdownExpire}
        />
      )}

      {stage === 'pin' && (
        <PINEntry
          onSuccess={handlePINSuccess}
          onCaptureFace={captureFacePhoto}
        />
      )}

      {stage === 'display' && (
        <MedicalInfoDisplay
          info={mockMedicalInfo}
          accessTime={accessTime}
        />
      )}
    </>
  );
}
