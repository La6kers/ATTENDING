import React from 'react';
import { useClinicalHub } from '@/store/useClinicalHub';
import { ClinicalMessageCard } from './ClinicalMessageCard';

export const ClinicalMessageList: React.FC = () => {
  const { getFilteredMessages, currentView } = useClinicalHub();
  const messages = getFilteredMessages();

  // Sort messages based on view
  const sortedMessages = [...messages].sort((a, b) => {
    if (currentView === 'priority') {
      return b.priority - a.priority;
    } else if (currentView === 'timeline') {
      // Convert time strings to comparable values
      const getMinutes = (timeStr: string) => {
        if (timeStr.includes('min')) {
          return parseInt(timeStr);
        } else if (timeStr.includes('hour')) {
          return parseInt(timeStr) * 60;
        }
        return 999;
      };
      return getMinutes(a.time) - getMinutes(b.time);
    } else {
      // Patient view - sort by patient name
      return a.patient.localeCompare(b.patient);
    }
  });

  return (
    <div className="flex-1 overflow-y-auto p-2">
      {sortedMessages.map(message => (
        <ClinicalMessageCard key={message.id} message={message} />
      ))}
    </div>
  );
};
