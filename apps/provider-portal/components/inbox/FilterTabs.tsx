import { FC } from 'react';
import { useInbox } from '@/store/useInbox';
import { cn } from '@/lib/utils';

export const FilterTabs: FC = () => {
  const { filter, setFilter, counts } = useInbox();

  const tabs = [
    { id: 'all', label: 'All Messages', icon: '??' },
    { id: 'urgent', label: 'Urgent', icon: '??' },
    { id: 'unread', label: 'Unread', icon: '??' },
    { id: 'labs', label: 'Lab Results', icon: '??' },
    { id: 'refills', label: 'Refill Requests', icon: '??' },
  ];

  return (
    <div className="border-b border-slate-200 p-4">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setFilter(tab.id)}
          className={cn(
            'mb-2 flex w-full items-center justify-between rounded-lg px-4 py-3 text-sm font-medium transition-all hover:bg-slate-200',
            filter === tab.id && 'bg-blue-500 text-white hover:bg-blue-600'
          )}
        >
          <span>
            {tab.icon} {tab.label}
          </span>
          {counts[tab.id] > 0 && (
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-xs',
                filter === tab.id ? 'bg-white/30' : 'bg-red-500 text-white'
              )}
            >
              {counts[tab.id]}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};