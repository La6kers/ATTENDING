// ============================================================
// Referral Preview Modal Component
// apps/provider-portal/components/referral-ordering/ReferralPreviewModal.tsx
// ============================================================

import { X, Send, Printer, FileText, AlertTriangle, Shield, Clock } from 'lucide-react';
import type { SelectedReferral, PatientContext } from './types';

interface ReferralPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  referral: SelectedReferral | null;
  patient: PatientContext | null;
  onConfirmSubmit: () => void;
  isSubmitting?: boolean;
}

export function ReferralPreviewModal({
  isOpen,
  onClose,
  referral,
  patient,
  onConfirmSubmit,
  isSubmitting = false,
}: ReferralPreviewModalProps) {
  if (!isOpen || !referral || !patient) return null;

  const urgencyColors = {
    STAT: 'text-red-600 bg-red-100',
    URGENT: 'text-orange-600 bg-orange-100',
    ROUTINE: 'text-blue-600 bg-blue-100',
    ELECTIVE: 'text-gray-600 bg-gray-100',
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="preview-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-purple-600" />
            <h2 id="preview-title" className="text-lg font-semibold text-gray-900">
              Referral Preview
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Urgency Banner */}
          {(referral.urgency === 'STAT' || referral.urgency === 'URGENT') && (
            <div className={`flex items-center gap-2 p-3 rounded-lg ${
              referral.urgency === 'STAT' ? 'bg-red-50 border border-red-200' : 'bg-orange-50 border border-orange-200'
            }`}>
              <AlertTriangle className={`w-5 h-5 ${
                referral.urgency === 'STAT' ? 'text-red-600' : 'text-orange-600'
              }`} />
              <span className={`font-semibold ${
                referral.urgency === 'STAT' ? 'text-red-800' : 'text-orange-800'
              }`}>
                {referral.urgency} Referral - Will be prioritized for immediate processing
              </span>
            </div>
          )}

          {/* Specialty & Urgency */}
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {referral.specialty.name} Referral
              </h3>
              {referral.specialty.subspecialties?.[0] && (
                <p className="text-gray-500">
                  Subspecialty: {referral.specialty.subspecialties[0]}
                </p>
              )}
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${urgencyColors[referral.urgency]}`}>
              {referral.urgency}
            </span>
          </div>

          {/* Patient Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Patient Information</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Name:</span>
                <span className="ml-2 font-medium text-gray-900">{patient.name}</span>
              </div>
              <div>
                <span className="text-gray-500">MRN:</span>
                <span className="ml-2 font-medium text-gray-900">{patient.mrn}</span>
              </div>
              <div>
                <span className="text-gray-500">DOB/Age:</span>
                <span className="ml-2 font-medium text-gray-900">{patient.age}yo {patient.gender}</span>
              </div>
              <div>
                <span className="text-gray-500">Insurance:</span>
                <span className="ml-2 font-medium text-gray-900">{patient.insurancePlan}</span>
              </div>
            </div>
            {patient.allergies.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <span className="text-red-600 text-sm font-medium">
                  ⚠️ Allergies: {patient.allergies.join(', ')}
                </span>
              </div>
            )}
          </div>

          {/* Primary Diagnosis */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Primary Diagnosis</h4>
            <p className="text-gray-700">{patient.primaryDiagnosis || patient.chiefComplaint}</p>
          </div>

          {/* Clinical Question */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Clinical Question for Specialist</h4>
            <p className="text-gray-700 bg-purple-50 p-3 rounded-lg border border-purple-100">
              {referral.clinicalQuestion || 'No specific clinical question provided'}
            </p>
          </div>

          {/* Relevant History */}
          {referral.relevantHistory && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Relevant History</h4>
              <p className="text-gray-700">{referral.relevantHistory}</p>
            </div>
          )}

          {/* Red Flags */}
          {patient.redFlags.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Red Flags Present
              </h4>
              <ul className="list-disc list-inside text-red-700 text-sm space-y-1">
                {patient.redFlags.map((flag, i) => (
                  <li key={i}>{flag}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Provider Information */}
          {referral.preferredProvider && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-800 mb-2">Preferred Provider</h4>
              <p className="text-green-900 font-medium">
                {referral.preferredProvider.name}, {referral.preferredProvider.credentials}
              </p>
              <p className="text-green-700 text-sm">{referral.preferredProvider.organization}</p>
              <p className="text-green-600 text-sm mt-1">
                <Clock className="w-3 h-3 inline mr-1" />
                Next available: {referral.preferredProvider.nextAvailable.routine}
              </p>
            </div>
          )}

          {/* Prior Authorization */}
          {referral.priorAuthRequired && (
            <div className="flex items-center gap-2 text-orange-700 bg-orange-50 p-3 rounded-lg">
              <Shield className="w-5 h-5" />
              <span className="font-medium">Prior Authorization Required</span>
              <span className="text-sm text-orange-600">- Will be submitted automatically</span>
            </div>
          )}

          {/* Attached Documents */}
          {referral.attachedDocuments.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Attached Documents</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                {referral.attachedDocuments.map((doc, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-400" />
                    {doc}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print Preview
          </button>
          
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirmSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
              {isSubmitting ? 'Submitting...' : 'Confirm & Submit'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReferralPreviewModal;
