import * as React from 'react';
import { FC, useState } from 'react';
import { Sidebar } from './Sidebar';
import { MainContent } from './MainContent';
import { Menu, X } from 'lucide-react';
import { Button } from '../ui/button';
import { useInbox } from '../../store/useInbox';
import { cn } from '../../lib/utils';

export const InboxLayout: FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { currentMessage } = useInbox();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 to-purple-600 p-2 sm:p-5">
      <div className="container mx-auto h-[calc(100vh-2.5rem)] max-w-7xl overflow-hidden rounded-2xl bg-white/95 shadow-xl backdrop-blur-xl">
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
              'absolute inset-0 z-40 w-80 transform bg-white/95 transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0',
              sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            )}
          >
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>

          {/* Main content with animation */}
          <div className={cn(
            'flex-1 transition-all duration-200',
            currentMessage ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'
          )}>
            <MainContent />
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