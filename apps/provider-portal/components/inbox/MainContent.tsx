import { FC } from 'react';
import { useInbox } from '@/store/useInbox';
import { ConversationView } from './ConversationView';
import { ResponseComposer } from './ResponseComposer';
import { Settings, Brain, Inbox } from 'lucide-react';

export const MainContent: FC = () => {
  const { currentMessage } = useInbox();

  return (
    <div className="flex flex-col bg-white">
      <div className="flex justify-between border-b border-slate-200 p-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Provider Inbox</h1>
          <div className="text-sm text-slate-500">AI-Enhanced Communication Hub</div>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-200">
            <Settings className="w-4 h-4" />
            Settings
          </button>
          <button className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-600">
            <Brain className="w-4 h-4" />
            AI Summary
          </button>
        </div>
      </div>

      {currentMessage ? (
        <>
          <ConversationView />
          <ResponseComposer />
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center text-center text-slate-500">
          <Inbox className="mb-4 w-16 h-16 text-slate-400" />
          <h3 className="mb-2 text-lg font-semibold text-slate-700">
            Welcome to Your AI-Enhanced Inbox
          </h3>
          <p>Select a message to view details and access AI-powered response suggestions.</p>
        </div>
      )}
    </div>
  );
};
