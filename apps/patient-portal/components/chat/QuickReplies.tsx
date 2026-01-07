// Quick Replies Component
// apps/patient-portal/components/chat/QuickReplies.tsx

import React from 'react';

interface QuickRepliesProps {
  options: string[];
  onSelect: (option: string) => void;
}

export function QuickReplies({ options, onSelect }: QuickRepliesProps) {
  if (!options || options.length === 0) return null;

  return (
    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
      <p className="text-xs text-gray-500 mb-3 font-medium">
        Quick responses - tap to select:
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((option, index) => (
          <button
            key={index}
            onClick={() => onSelect(option)}
            className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-all duration-200 shadow-sm hover:shadow"
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

export default QuickReplies;
