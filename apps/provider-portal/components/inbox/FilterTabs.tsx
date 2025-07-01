import React, { FC } from 'react';
import { useInbox } from '@/store/useInbox';
import { cn } from '@/lib/utils';
import { Mail, Flask, Phone, Pill, AlertCircle, Clock } from 'lucide-react';

export const FilterTabs: FC = () => {
  const { filter, setFilter, unreadCount, urgentCount, messages } = useInbox();

  const tabs = [
    { id: 'all', label: 'All Messages', count: messages.length, icon: Mail },
    { id: 'unread', label: 'Unread', count: unreadCount, icon: Clock },
    { id: 'urgent', label: 'Urgent', count: urgentCount, icon: AlertCircle },
    { id: 'email', label: 'Emails', count: messages.filter(m => m.type === 'email').length, icon: Mail },
    { id: 'lab', label: 'Lab Results', count: messages.filter(m => m.type === 'lab').length, icon: Flask },
    { id: 'phone', label: 'Phone', count: messages.filter(m => m.type === 'phone').length, icon: Phone },
    { id: 'refill', label: 'Refills', count: messages.filter(m => m.type === 'refill').length, icon: Pill },
  ];

  const activeTab = filter.type?.[0] || filter.priority?.[0] || filter.status?.[0] || 'all';

  const handleTabClick = (tabId: string) => {
    if (tabId === 'all') {
      setFilter({});
    } else if (tabId === 'unread') {
      setFilter({ status: ['unread'] });
    } else if (tabId === 'urgent') {
      setFilter({ priority: ['urgent'] });
    } else {
      setFilter({ type: [tabId as any] });
    }
  };

  return (
    <div className="border-b border-slate-200">
      <div className="flex flex-col space-y-1 p-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id || (activeTab === 'all' && tab.id === 'all');
          
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={cn(
                'flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </div>
              {tab.count > 0 && (
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-semibold',
                    isActive
                      ? 'bg-blue-200 text-blue-800'
                      : 'bg-slate-200 text-slate-700'
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
