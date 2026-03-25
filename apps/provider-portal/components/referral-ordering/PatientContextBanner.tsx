// ============================================================
// Patient Context Banner Component
// apps/provider-portal/components/referral-ordering/PatientContextBanner.tsx
// ============================================================

import { AlertTriangle, User, Shield } from 'lucide-react';
import type { PatientContext } from './types';

interface PatientContextBannerProps {
  patient: PatientContext;
  className?: string;
}

export function PatientContextBanner({ patient, className = '' }: PatientContextBannerProps) {
  const getRiskLevelColor = (level?: string) => {
    switch (level) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'moderate': return 'text-orange-600 bg-orange-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-green-500 p-5 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <User className="w-5 h-5 text-gray-600" />
        <h2 className="text-base font-semibold text-gray-900">
          Patient: {patient.name} - Current Clinical Context
        </h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-1">
          <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">
            Primary Diagnosis
          </span>
          <p className="text-sm font-semibold text-gray-900">
            {patient.primaryDiagnosis || patient.chiefComplaint}
          </p>
        </div>
        
        {patient.redFlags.length > 0 && (
          <div className="space-y-1">
            <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">
              Red Flags Present
            </span>
            <p className="text-sm font-semibold text-red-700">
              {patient.redFlags.slice(0, 2).map((flag, i) => (
                <span key={i}>
                  {i > 0 && ', '}
                  "{flag}"
                </span>
              ))}
              {patient.redFlags.length > 2 && ` +${patient.redFlags.length - 2} more`}
            </p>
          </div>
        )}
        
        <div className="space-y-1">
          <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">
            Risk Level
          </span>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${getRiskLevelColor(patient.riskLevel)}`}>
            {patient.riskLevel === 'high' && <AlertTriangle className="w-3 h-3" />}
            {patient.riskLevel ? `${patient.riskLevel.charAt(0).toUpperCase()}${patient.riskLevel.slice(1)} - Requires ${patient.riskLevel === 'high' ? 'urgent' : 'routine'} evaluation` : 'Not assessed'}
          </span>
        </div>
        
        <div className="space-y-1">
          <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">
            Insurance
          </span>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-600" />
            <p className="text-sm font-semibold text-gray-900">
              {patient.insurancePlan}
            </p>
          </div>
        </div>
      </div>

      {/* Additional Patient Details */}
      <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-4 text-xs text-gray-500">
        <span>
          <strong>MRN:</strong> {patient.mrn}
        </span>
        <span>
          <strong>Age:</strong> {patient.age}yo {patient.gender}
        </span>
        <span>
          <strong>PCP:</strong> {patient.pcp}
        </span>
        {patient.allergies.length > 0 && (
          <span className="text-red-600">
            <strong>Allergies:</strong> {patient.allergies.join(', ')}
          </span>
        )}
      </div>
    </div>
  );
}

export default PatientContextBanner;
