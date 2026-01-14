// ============================================================
// Custom Referral Form Component
// apps/provider-portal/components/referral-ordering/CustomReferralForm.tsx
// ============================================================

import { useState } from 'react';
import { Send, X, Search } from 'lucide-react';
import type { Specialty, ReferralUrgency } from './types';

interface CustomReferralFormProps {
  specialtyCatalog: Specialty[];
  onCreateReferral: (data: {
    specialty: Specialty;
    provider?: string;
    urgency: ReferralUrgency;
    clinicalReason: string;
  }) => void;
  onCancel?: () => void;
  disabled?: boolean;
}

export function CustomReferralForm({
  specialtyCatalog,
  onCreateReferral,
  onCancel,
  disabled = false,
}: CustomReferralFormProps) {
  const [specialtySearch, setSpecialtySearch] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<Specialty | null>(null);
  const [provider, setProvider] = useState('');
  const [urgency, setUrgency] = useState<ReferralUrgency>('ROUTINE');
  const [clinicalReason, setClinicalReason] = useState('');
  const [showSpecialtyDropdown, setShowSpecialtyDropdown] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const filteredSpecialties = specialtyCatalog.filter(s =>
    s.name.toLowerCase().includes(specialtySearch.toLowerCase()) ||
    s.code.toLowerCase().includes(specialtySearch.toLowerCase()) ||
    s.subspecialties.some(sub => sub.toLowerCase().includes(specialtySearch.toLowerCase()))
  );

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!selectedSpecialty) {
      newErrors.specialty = 'Specialty is required';
    }
    if (!clinicalReason || clinicalReason.length < 10) {
      newErrors.clinicalReason = 'Clinical reason must be at least 10 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !selectedSpecialty) return;
    
    onCreateReferral({
      specialty: selectedSpecialty,
      provider: provider || undefined,
      urgency,
      clinicalReason,
    });

    // Reset form
    setSpecialtySearch('');
    setSelectedSpecialty(null);
    setProvider('');
    setUrgency('ROUTINE');
    setClinicalReason('');
    setErrors({});
  };

  const handleClear = () => {
    setSpecialtySearch('');
    setSelectedSpecialty(null);
    setProvider('');
    setUrgency('ROUTINE');
    setClinicalReason('');
    setErrors({});
    onCancel?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
        <span className="w-1 h-4 bg-blue-500 rounded" />
        Custom Referral
      </h4>

      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
        {/* Specialty Search */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Specialty/Department <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={selectedSpecialty ? selectedSpecialty.name : specialtySearch}
              onChange={(e) => {
                setSpecialtySearch(e.target.value);
                setSelectedSpecialty(null);
                setShowSpecialtyDropdown(true);
              }}
              onFocus={() => setShowSpecialtyDropdown(true)}
              placeholder="Search specialties (e.g., Pulmonology, Rheumatology)"
              disabled={disabled}
              className={`w-full pl-9 pr-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                errors.specialty ? 'border-red-500' : 'border-gray-300'
              } ${disabled ? 'bg-gray-50 text-gray-500' : ''}`}
            />
            {selectedSpecialty && (
              <button
                type="button"
                onClick={() => {
                  setSelectedSpecialty(null);
                  setSpecialtySearch('');
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {errors.specialty && (
            <p className="text-xs text-red-500 mt-1">{errors.specialty}</p>
          )}
          
          {/* Dropdown */}
          {showSpecialtyDropdown && !selectedSpecialty && specialtySearch && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {filteredSpecialties.length > 0 ? (
                filteredSpecialties.map(spec => (
                  <button
                    key={spec.code}
                    type="button"
                    onClick={() => {
                      setSelectedSpecialty(spec);
                      setSpecialtySearch('');
                      setShowSpecialtyDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-purple-50 text-sm"
                  >
                    <span className="font-medium">{spec.name}</span>
                    <span className="text-gray-400 ml-2">({spec.code})</span>
                    {spec.requiresAuth && (
                      <span className="ml-2 text-xs text-orange-600">Auth Required</span>
                    )}
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-sm text-gray-500">
                  No specialties found. Try a different search term.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Preferred Provider */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Preferred Provider (Optional)
          </label>
          <input
            type="text"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            placeholder="Dr. Name or leave blank for any available"
            disabled={disabled}
            className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
              disabled ? 'bg-gray-50 text-gray-500' : ''
            }`}
          />
        </div>

        {/* Urgency Level */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Urgency Level <span className="text-red-500">*</span>
          </label>
          <select
            value={urgency}
            onChange={(e) => setUrgency(e.target.value as ReferralUrgency)}
            disabled={disabled}
            className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
              disabled ? 'bg-gray-50 text-gray-500' : ''
            }`}
          >
            <option value="ROUTINE">Routine (2-4 weeks)</option>
            <option value="ELECTIVE">Elective (4+ weeks)</option>
            <option value="URGENT">Urgent (24-48 hours)</option>
            <option value="STAT">STAT (Same day)</option>
          </select>
        </div>

        {/* Clinical Reason */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Clinical Reason for Referral <span className="text-red-500">*</span>
          </label>
          <textarea
            value={clinicalReason}
            onChange={(e) => setClinicalReason(e.target.value)}
            placeholder="Brief clinical justification for this referral..."
            rows={3}
            disabled={disabled}
            className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-y ${
              errors.clinicalReason ? 'border-red-500' : 'border-gray-300'
            } ${disabled ? 'bg-gray-50 text-gray-500' : ''}`}
          />
          {errors.clinicalReason && (
            <p className="text-xs text-red-500 mt-1">{errors.clinicalReason}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2 border-t border-gray-100">
          <button
            type="submit"
            disabled={disabled}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-medium hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
            Create Referral
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled}
            className="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <X className="w-4 h-4" />
            Clear Form
          </button>
        </div>
      </div>
    </form>
  );
}

export default CustomReferralForm;
