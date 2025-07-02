// Medical Suggestions Component for follow-up questions

import React from 'react';
import { usePatientChatStore } from '@/store/patientChatStore';
import { cn } from '@/lib/utils';

interface MedicalSuggestionsProps {
  suggestions: string[];
  className?: string;
}

export const MedicalSuggestions: React.FC<MedicalSuggestionsProps> = ({ 
  suggestions, 
  className 
}) => {
  const { sendMessage } = usePatientChatStore();

  const handleSuggestionClick = (suggestion: string) => {
    // Set the input value but don't send immediately
    // This allows the user to modify the suggestion before sending
    const input = document.getElementById('chat-input') as HTMLInputElement;
    if (input) {
      input.value = suggestion;
      input.focus();
    }
  };

  return (
    <div className={cn("mt-3 pt-3 border-t border-gray-100", className)}>
      <div className="flex flex-wrap gap-1.5">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => handleSuggestionClick(suggestion)}
            className="bg-green-50 hover:bg-green-100 text-green-700 text-xs px-2.5 py-1 rounded-full transition-colors duration-200 border border-green-200 hover:border-green-300"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
};
