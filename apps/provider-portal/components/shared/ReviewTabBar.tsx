// =============================================================================
// Shared tab bar for review panels (labs, imaging, medications, referrals)
// apps/provider-portal/components/shared/ReviewTabBar.tsx
// =============================================================================

import React from 'react';
import { reviewColors, type ReviewTab } from '../../lib/reviewTheme';

interface ReviewTabBarProps {
  tabs: readonly ReviewTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
}

export function ReviewTabBar({ tabs, activeTab, onTabChange }: ReviewTabBarProps) {
  return (
    <div className="flex gap-1 px-3 py-2 flex-shrink-0"
      style={{ background: reviewColors.cardDark, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
      {tabs.map(tab => {
        const Icon = tab.icon;
        const active = activeTab === tab.id;
        return (
          <button key={tab.id} onClick={() => onTabChange(tab.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap"
            style={active
              ? { background: reviewColors.accent, color: 'white' }
              : { color: 'rgba(255,255,255,0.5)' }
            }>
            <Icon className="w-3.5 h-3.5" />
            {tab.label}
            {tab.count != null && tab.count > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] rounded-full font-semibold"
                style={{
                  background: active ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
                  color: active ? 'white' : 'rgba(255,255,255,0.5)',
                }}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
