// ============================================================
// ATTENDING AI — Patient Context Bar
// apps/provider-portal/components/layout/PatientContextBar.tsx
//
// Displays patient identity, demographics, allergies, and
// code status in a compact bar above clinical workspace content.
// ============================================================

import React from 'react';
import { User, AlertTriangle, Shield } from 'lucide-react';

export interface PatientContextData {
  id: string;
  name: string;
  age: number;
  gender: string;
  mrn?: string;
  dateOfBirth?: string;
  allergies?: string[];
  codeStatus?: string;
  chiefComplaint?: string;
  insuranceType?: string;
  primaryProvider?: string;
  room?: string;
}

export interface PatientContextBarProps {
  patient: PatientContextData;
  compact?: boolean;
  className?: string;
}

const PatientContextBar: React.FC<PatientContextBarProps> = ({ patient, compact = false, className }) => {
  return (
    <div
      className={`flex items-center gap-4 px-4 py-3 border-b border-white/10 ${className || ''}`}
      style={{ background: 'rgba(12, 53, 71, 0.6)', backdropFilter: 'blur(10px)' }}
    >
      {/* Avatar */}
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
        style={{ background: 'linear-gradient(180deg, #25B8A9 0%, #1A8FA8 100%)' }}
      >
        {patient.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
      </div>

      {/* Patient Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white text-sm">{patient.name}</span>
          <span className="text-teal-200 text-xs">
            {patient.age}y {patient.gender}
          </span>
          {patient.mrn && (
            <span className="text-teal-300/60 text-xs">MRN: {patient.mrn}</span>
          )}
          {patient.room && (
            <span className="px-2 py-0.5 bg-white/10 rounded text-xs text-teal-200">
              {patient.room}
            </span>
          )}
        </div>
        {!compact && patient.chiefComplaint && (
          <p className="text-teal-200/70 text-xs mt-0.5 truncate">
            CC: {patient.chiefComplaint}
          </p>
        )}
      </div>

      {/* Allergies */}
      {patient.allergies && patient.allergies.length > 0 && (
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
          <div className="flex gap-1">
            {patient.allergies.slice(0, 3).map(a => (
              <span key={a} className="px-1.5 py-0.5 bg-red-500/20 text-red-200 text-[10px] font-medium rounded">
                {a}
              </span>
            ))}
            {patient.allergies.length > 3 && (
              <span className="text-red-300 text-[10px]">+{patient.allergies.length - 3}</span>
            )}
          </div>
        </div>
      )}

      {/* Code Status */}
      {patient.codeStatus && (
        <div className="flex items-center gap-1 px-2 py-1 bg-white/10 rounded-lg flex-shrink-0">
          <Shield className="w-3.5 h-3.5 text-teal-200" />
          <span className="text-xs text-teal-200 font-medium">{patient.codeStatus}</span>
        </div>
      )}
    </div>
  );
};

export default PatientContextBar;
