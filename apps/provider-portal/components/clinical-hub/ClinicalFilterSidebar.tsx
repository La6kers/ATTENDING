import React from 'react';
import { useClinicalHub } from '@/store/useClinicalHub';
import { cn } from '@attending/shared/lib/utils';

interface FilterItem {
  id: string;
  label: string;
  count: number;
  icon?: string;
}

export const ClinicalFilterSidebar: React.FC = () => {
  const { messages, currentFilter, setFilter } = useClinicalHub();

  // Calculate counts
  const criticalCount = messages.filter(m => m.priority >= 8).length;
  const timeSensitiveCount = messages.filter(m => m.priority >= 5 && m.priority < 8).length;
  const routineCount = messages.filter(m => m.priority < 5).length;

  const typeCount = (type: string) => messages.filter(m => m.type === type).length;

  const priorityFilters: FilterItem[] = [
    { id: 'all', label: 'All Items', count: messages.length },
    { id: 'critical', label: '🔴 Critical', count: criticalCount },
    { id: 'time-sensitive', label: '🟡 Time-Sensitive', count: timeSensitiveCount },
    { id: 'routine', label: '🟢 Routine', count: routineCount },
  ];

  const typeFilters: FilterItem[] = [
    { id: 'phone', label: '📞 Phone Calls', count: typeCount('phone') },
    { id: 'email', label: '📧 Patient Emails', count: typeCount('email') },
    { id: 'lab', label: '🧪 Lab Results', count: typeCount('lab') },
    { id: 'imaging', label: '🏥 Imaging Reports', count: typeCount('imaging') },
    { id: 'provider', label: '👨‍⚕️ Provider Notes', count: typeCount('provider') },
    { id: 'staff', label: '👥 Staff Messages', count: typeCount('staff') },
    { id: 'refill', label: '💊 Refill Requests', count: typeCount('refill') },
  ];

  const clinicalFilters: FilterItem[] = [
    { id: 'abnormal', label: 'Abnormal Results', count: messages.filter(m => m.results?.some(r => r.status === 'abnormal' || r.status === 'critical')).length },
    { id: 'follow-up', label: 'Follow-up Required', count: messages.filter(m => m.recommendedActions?.some(a => a.action.includes('Follow'))).length },
    { id: 'medication', label: 'Medication Changes', count: messages.filter(m => m.recommendedActions?.some(a => a.action.includes('medication') || a.action.includes('Add') || a.action.includes('Increase'))).length },
    { id: 'coordination', label: 'Care Coordination', count: messages.filter(m => m.type === 'provider' || m.type === 'staff').length },
  ];

  return (
    <div className="bg-white border-r border-gray-200 p-3 overflow-y-auto">
      {/* Priority Filters */}
      <div className="mb-4">
        <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Priority</div>
        {priorityFilters.map(filter => (
          <FilterButton
            key={filter.id}
            filter={filter}
            isActive={currentFilter === filter.id}
            onClick={() => setFilter(filter.id)}
          />
        ))}
      </div>

      {/* Message Type Filters */}
      <div className="mb-4">
        <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Message Type</div>
        {typeFilters.map(filter => (
          <FilterButton
            key={filter.id}
            filter={filter}
            isActive={currentFilter === filter.id}
            onClick={() => setFilter(filter.id)}
          />
        ))}
      </div>

      {/* Clinical Context Filters */}
      <div className="mb-4">
        <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Clinical Context</div>
        {clinicalFilters.map(filter => (
          <FilterButton
            key={filter.id}
            filter={filter}
            isActive={currentFilter === filter.id}
            onClick={() => setFilter(filter.id)}
          />
        ))}
      </div>
    </div>
  );
};

interface FilterButtonProps {
  filter: FilterItem;
  isActive: boolean;
  onClick: () => void;
}

const FilterButton: React.FC<FilterButtonProps> = ({ filter, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between px-2 py-1.5 mb-0.5 rounded text-xs transition-all",
        isActive
          ? "bg-blue-500 text-white"
          : "hover:bg-gray-100 text-gray-700"
      )}
    >
      <span className="truncate">{filter.label}</span>
      <span className={cn(
        "text-[10px] px-1.5 py-0.5 rounded-full font-semibold",
        isActive
          ? "bg-white/30"
          : "bg-gray-200 text-gray-600"
      )}>
        {filter.count}
      </span>
    </button>
  );
};
