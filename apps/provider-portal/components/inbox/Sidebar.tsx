import { FC } from 'react';
import { useInbox } from '@/store/useInbox';
import { FilterTabs } from './FilterTabs';
import { MessageList } from './MessageList';

export const Sidebar: FC = () => {
  return (
    <div className="flex h-full flex-col border-r border-slate-200 bg-slate-50">
      <div className="border-b border-slate-200 p-6">
        <h1 className="mb-2 text-2xl font-bold text-blue-500">ATTENDING AI</h1>
        <div className="text-sm text-slate-500">Dr. Sarah Chen, MD | Internal Medicine</div>
      </div>

      <FilterTabs />
      <MessageList />
    </div>
  );
};