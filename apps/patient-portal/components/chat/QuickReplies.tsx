// Quick Replies Component
// apps/patient-portal/components/chat/QuickReplies.tsx

import React from 'react';
import type { QuickReply } from '../../store/useChatStore';
import { ChevronRight } from 'lucide-react';

interface QuickRepliesProps {
  options: QuickReply[];
  onSelect: (reply: QuickReply) => void;
}

export function QuickReplies({ options, onSelect }: QuickRepliesProps) {
  if (!options || options.length === 0) return null;

  // Group options by category if available
  const _hasCategories = options.some(opt => opt.category);
  
  return (
    <div className="px-6 py-4 bg-gradient-to-b from-gray-50 to-white border-t border-gray-200">
      <div className="flex items-center gap-2 mb-3">
        <ChevronRight className="w-4 h-4 text-indigo-500" />
        <p className="text-xs text-gray-600 font-medium">
          Select a response or type your own:
        </p>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.id}
            onClick={() => onSelect(option)}
            className={`
              group px-4 py-2.5 rounded-xl text-sm font-medium
              transition-all duration-200 
              border-2 shadow-sm
              hover:shadow-md hover:-translate-y-0.5
              focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
              ${getButtonStyle(option)}
            `}
          >
            <span className="flex items-center gap-2">
              {getOptionIcon(option)}
              {option.text}
            </span>
          </button>
        ))}
      </div>

      {/* Hint text */}
      <p className="text-xs text-gray-400 mt-3 italic">
        Tap a button or type a custom response below
      </p>
    </div>
  );
}

// Get button styling based on option type
function getButtonStyle(option: QuickReply): string {
  // Special styling for certain buttons
  if (option.id === 'submit' || option.text.includes('Submit')) {
    return `
      bg-gradient-to-r from-green-500 to-emerald-600 
      text-white border-green-600
      hover:from-green-600 hover:to-emerald-700
    `;
  }
  
  if (option.id === 'none' || option.text.toLowerCase().includes('no ')) {
    return `
      bg-gray-50 text-gray-600 border-gray-200
      hover:bg-gray-100 hover:border-gray-300
    `;
  }

  if (option.category === 'severity') {
    // Severity scale styling
    const value = parseInt(option.value || '0');
    if (value >= 8) {
      return `bg-red-50 text-red-700 border-red-200 hover:bg-red-100 hover:border-red-300`;
    } else if (value >= 6) {
      return `bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 hover:border-orange-300`;
    } else if (value >= 4) {
      return `bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100 hover:border-yellow-300`;
    }
    return `bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:border-green-300`;
  }

  // Default styling
  return `
    bg-white text-gray-700 border-gray-200
    hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700
  `;
}

// Get icon for certain option types
function getOptionIcon(option: QuickReply): React.ReactNode {
  if (option.id === 'submit') {
    return <span>✓</span>;
  }
  if (option.id === 'edit') {
    return <span>✏️</span>;
  }
  if (option.id === 'none' || option.text.toLowerCase().includes('no ')) {
    return <span>—</span>;
  }
  return null;
}

export default QuickReplies;
