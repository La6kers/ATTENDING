// =============================================================================
// Shared dark teal theme for review components (inbox, labs, imaging, meds)
// apps/provider-portal/lib/reviewTheme.ts
// =============================================================================

import React from 'react';
import type { LucideIcon } from 'lucide-react';

// Dark teal panel colors used across all review screens
export const reviewColors = {
  panelBg: '#1A5C6B',
  panelBgRight: '#1D6374',
  cardDark: '#145566',
  cardRead: '#2A7A8A',
  headerGradient: 'linear-gradient(135deg, #145566 0%, #1A8FA8 100%)',
  accent: '#1A8FA8',
  accentLight: 'rgba(26,143,168,0.15)',
  gold: '#c8a44e',
  coral: '#e07a5f',
  // Dark-on-dark text (for dark panel backgrounds)
  text: '#E0F4F4',
  textMuted: 'rgba(255,255,255,0.5)',
  sectionBg: 'rgba(255,255,255,0.06)',
  // Light card colors (for white card overlays on dark panels)
  cardBg: '#FFFFFF',
  cardText: '#0C3547',
  cardTextSecondary: '#3d6b7a',
  cardTextMuted: '#7faaab',
  cardSectionBg: '#F0FAF9',
  cardAccentLight: '#E6F7F5',
  cardBorder: 'rgba(26, 143, 168, 0.15)',
};

export type ReviewColors = typeof reviewColors;

// Tab definition for review panel tab bars
export interface ReviewTab {
  id: string;
  label: string;
  icon: LucideIcon;
  count?: number;
}
