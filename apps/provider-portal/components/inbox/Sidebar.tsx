// =============================================================================
// ATTENDING AI - Provider Inbox Sidebar
// apps/provider-portal/components/inbox/Sidebar.tsx
// =============================================================================

import React from 'react';
import {
  Phone,
  FileText,
  Mail,
  Pill,
  FlaskConical,
  Stethoscope,
  FileClock,
  Inbox,
  ScanLine,
} from 'lucide-react';
import type { CategoryType, CategoryCount } from './types';
import { categoryConfig, theme } from './theme';

const iconMap: Record<CategoryType, React.ComponentType<{ className?: string }>> = {
  encounters: Stethoscope,
  phone: Phone,
  charts: FileText,
  messages: Mail,
  refills: Pill,
  labs: FlaskConical,
  imaging: ScanLine,
  incomplete: FileClock,
};

interface SidebarSection {
  title: string;
  categories: CategoryType[];
}

const sections: SidebarSection[] = [
  { title: 'Active', categories: ['encounters'] },
  { title: 'Inbox', categories: ['phone', 'charts', 'messages', 'refills', 'labs', 'imaging'] },
  { title: 'Charts', categories: ['incomplete'] },
];

interface SidebarProps {
  activeCategory: CategoryType;
  onCategoryChange: (category: CategoryType) => void;
  counts: Record<CategoryType, CategoryCount>;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeCategory,
  onCategoryChange,
  counts,
}) => {
  return (
    <aside
      className="w-60 text-white flex flex-col flex-shrink-0"
      style={{ background: theme.gradient.sidebar }}
    >
      {/* Header */}
      <div className="p-4" style={{ borderBottom: `1px solid ${theme.purple[600]}` }}>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
            style={{ background: theme.gradient.primary }}
          >
            <Inbox className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-base text-white">Provider Inbox</h1>
            <p className="text-xs" style={{ color: theme.purple[400] }}>
              ATTENDING AI
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.title} className="mb-4">
            <div
              className="text-xs font-semibold uppercase tracking-wider px-3 py-2"
              style={{ color: theme.purple[400] }}
            >
              {section.title}
            </div>

            {section.categories.map((categoryId) => {
              const config = categoryConfig[categoryId];
              const count = counts[categoryId] || { total: 0, unread: 0, urgent: 0 };
              const isActive = activeCategory === categoryId;
              const IconComponent = iconMap[categoryId];

              return (
                <button
                  key={categoryId}
                  onClick={() => onCategoryChange(categoryId)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg mb-1 text-sm transition-all duration-200"
                  style={{
                    background: isActive ? theme.gradient.primary : 'transparent',
                    color: isActive ? 'white' : theme.purple[300],
                    boxShadow: isActive ? '0 4px 12px rgba(139, 92, 246, 0.3)' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'rgba(139, 92, 246, 0.2)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-1 h-6 rounded-full"
                      style={{
                        background: isActive ? 'white' : config.accent,
                        opacity: isActive ? 0.5 : 0.8,
                      }}
                    />
                    <IconComponent
                      className="w-5 h-5"
                      style={{ color: isActive ? 'white' : theme.purple[400] }}
                    />
                    <span className="font-medium">{config.label}</span>
                  </div>

                  {count.unread > 0 && (
                    <div className="flex items-center gap-1">
                      {count.urgent > 0 && (
                        <span
                          className="w-2 h-2 rounded-full animate-pulse"
                          style={{ background: '#ef4444' }}
                        />
                      )}
                      <span
                        className="px-2 py-0.5 text-xs rounded-full font-semibold"
                        style={{
                          background: isActive ? 'rgba(255,255,255,0.2)' : theme.purple[500],
                          color: 'white',
                        }}
                      >
                        {count.unread}
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4" style={{ borderTop: `1px solid ${theme.purple[600]}` }}>
        <div className="text-xs text-center" style={{ color: theme.purple[500] }}>
          © 2025 ATTENDING AI
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
