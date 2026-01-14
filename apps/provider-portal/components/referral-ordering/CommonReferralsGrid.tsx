// ============================================================
// Common Referrals Grid Component
// apps/provider-portal/components/referral-ordering/CommonReferralsGrid.tsx
// ============================================================

import type { CommonReferralOption, Specialty } from './types';

interface CommonReferralsGridProps {
  options: CommonReferralOption[];
  specialtyCatalog: Specialty[];
  onSelectReferral: (specialty: Specialty, urgency: string) => void;
  disabled?: boolean;
}

export function CommonReferralsGrid({
  options,
  specialtyCatalog,
  onSelectReferral,
  disabled = false,
}: CommonReferralsGridProps) {
  const handleClick = (option: CommonReferralOption) => {
    const specialty = specialtyCatalog.find(s => s.code === option.specialty);
    if (specialty) {
      onSelectReferral(specialty, option.defaultUrgency);
    }
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
        <span className="w-1 h-4 bg-blue-500 rounded" />
        Common Referrals
      </h4>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {options.map((option) => (
          <button
            key={option.specialty}
            onClick={() => handleClick(option)}
            disabled={disabled}
            className={`
              flex flex-col items-center justify-center gap-2 p-4 
              bg-white border-2 border-gray-200 rounded-xl
              transition-all duration-200 min-h-[80px]
              ${disabled 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:border-purple-400 hover:bg-purple-50 hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2'
              }
            `}
          >
            <span className="text-2xl" aria-hidden="true">{option.icon}</span>
            <span className="text-sm font-semibold text-gray-900">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default CommonReferralsGrid;
