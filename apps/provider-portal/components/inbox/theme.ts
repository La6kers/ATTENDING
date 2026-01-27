// =============================================================================
// ATTENDING AI - Provider Inbox Theme Configuration
// apps/provider-portal/components/inbox/theme.ts
// =============================================================================

import type { CategoryType } from './types';

export const theme = {
  gradient: {
    // ATTENDING AI Standard Brand Gradient - Indigo/Violet
    primary: 'linear-gradient(135deg, #4c51bf 0%, #6b46c1 100%)',
    sidebar: 'linear-gradient(180deg, #4c51bf 0%, #6b46c1 50%, #4c51bf 100%)',
    header: 'linear-gradient(135deg, #4c51bf 0%, #6b46c1 100%)',
  },
  purple: {
    50: '#faf5ff',
    100: '#ede9fe',
    200: '#ddd6fe',
    300: '#c4b5fd',
    400: '#a78bfa',
    500: '#8b5cf6',
    600: '#7c3aed',
    700: '#6d28d9',
    800: '#5b21b6',
    900: '#4c1d95',
    950: '#1e1b4b',
  },
  semantic: {
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#3b82f6',
  },
  text: {
    primary: '#1f2937',
    secondary: '#6b7280',
    muted: '#9ca3af',
    inverse: '#ffffff',
    accent: '#7c3aed',
  },
  background: {
    main: '#ede9fe',
    card: '#ffffff',
    cardHover: '#faf5ff',
    section: '#ede9fe',
    subtle: '#faf5ff',
  },
  border: {
    light: '#ede9fe',
    medium: '#ddd6fe',
    dark: '#c4b5fd',
    accent: '#8b5cf6',
  },
  shadow: {
    sm: '0 2px 8px rgba(139, 92, 246, 0.1)',
    md: '0 4px 16px rgba(139, 92, 246, 0.15)',
    lg: '0 8px 32px rgba(139, 92, 246, 0.2)',
    glow: '0 0 20px rgba(139, 92, 246, 0.3)',
  },
} as const;

export interface CategoryAccent {
  id: CategoryType;
  label: string;
  accent: string;
  accentLight: string;
  accentDark: string;
  icon: string;
}

export const categoryConfig: Record<CategoryType, CategoryAccent> = {
  encounters: {
    id: 'encounters',
    label: 'Open Encounters',
    accent: '#10b981',
    accentLight: '#d1fae5',
    accentDark: '#065f46',
    icon: 'stethoscope',
  },
  phone: {
    id: 'phone',
    label: 'Phone Calls',
    accent: '#3b82f6',
    accentLight: '#dbeafe',
    accentDark: '#1e40af',
    icon: 'phone',
  },
  charts: {
    id: 'charts',
    label: "CC'd Charts",
    accent: '#8b5cf6',
    accentLight: '#ede9fe',
    accentDark: '#5b21b6',
    icon: 'file-text',
  },
  messages: {
    id: 'messages',
    label: 'Patient Messages',
    accent: '#14b8a6',
    accentLight: '#ccfbf1',
    accentDark: '#0f766e',
    icon: 'mail',
  },
  refills: {
    id: 'refills',
    label: 'Rx Refills',
    accent: '#a855f7',
    accentLight: '#f3e8ff',
    accentDark: '#7e22ce',
    icon: 'pill',
  },
  labs: {
    id: 'labs',
    label: 'Lab Results',
    accent: '#f59e0b',
    accentLight: '#fef3c7',
    accentDark: '#b45309',
    icon: 'beaker',
  },
  imaging: {
    id: 'imaging',
    label: 'Imaging Results',
    accent: '#06b6d4',
    accentLight: '#cffafe',
    accentDark: '#0e7490',
    icon: 'scan',
  },
  incomplete: {
    id: 'incomplete',
    label: 'Incomplete Charts',
    accent: '#f97316',
    accentLight: '#ffedd5',
    accentDark: '#c2410c',
    icon: 'file-clock',
  },
};

export const priorityColors = {
  urgent: { bg: '#fee2e2', text: '#dc2626', border: '#fca5a5', dot: '#ef4444' },
  high: { bg: '#fef3c7', text: '#d97706', border: '#fcd34d', dot: '#f59e0b' },
  normal: { bg: '#ede9fe', text: '#7c3aed', border: '#c4b5fd', dot: '#8b5cf6' },
  low: { bg: '#f3f4f6', text: '#6b7280', border: '#d1d5db', dot: '#9ca3af' },
} as const;

export const statusColors = {
  unread: { bg: '#ede9fe', dot: '#8b5cf6' },
  read: { bg: '#faf5ff', dot: 'transparent' },
  pending: { bg: '#fef3c7', dot: '#f59e0b' },
  in_progress: { bg: '#dbeafe', dot: '#3b82f6' },
  completed: { bg: '#d1fae5', dot: '#10b981' },
  forwarded: { bg: '#e0e7ff', dot: '#6366f1' },
  reassigned: { bg: '#fce7f3', dot: '#ec4899' },
} as const;

export function getCategoryAccent(category: CategoryType): CategoryAccent {
  return categoryConfig[category];
}

export function getCategoryBorderStyle(category: CategoryType): React.CSSProperties {
  const accent = categoryConfig[category];
  return {
    borderLeftColor: accent.accent,
    borderLeftWidth: '4px',
    borderLeftStyle: 'solid',
  };
}

export function getPurpleGradientStyle(): React.CSSProperties {
  return { background: theme.gradient.primary };
}

export function getPriorityStyle(priority: keyof typeof priorityColors) {
  return priorityColors[priority];
}
