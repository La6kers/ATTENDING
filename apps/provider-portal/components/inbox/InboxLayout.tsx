import * as React from 'react';
import type { FC} from 'react';
import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { EnhancedMainContent } from './EnhancedMainContent';
import { Menu, X } from 'lucide-react';
import { Button } from '../ui/button';
import { useInbox } from '../../store/useInbox';
import { cn } from '@attending/shared/lib/utils';

export const InboxLayout: FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { currentMessage: _currentMessage } = useInbox();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-indigo-700 p-2 sm:p-4">
      <div className="container mx-auto h-[calc(100vh-2rem)] max-w-7xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="relative flex h-full">
          {/* Mobile sidebar toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-4 z-50 lg:hidden"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X /> : <Menu />}
          </Button>

          {/* Sidebar */}
          <div
            className={cn(
              'absolute inset-0 z-40 w-80 transform bg-white transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0 border-r border-gray-200',
              sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            )}
          >
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>

          {/* Main content */}
          <div className="flex-1 overflow-hidden">
            <EnhancedMainContent />
          </div>

          {/* Overlay for mobile sidebar */}
          {sidebarOpen && (
            <div
              className="absolute inset-0 z-30 bg-black/20 backdrop-blur-sm lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
};
