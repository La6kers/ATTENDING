// =============================================================================
// ATTENDING AI - Provider Inbox Theme Configuration
// apps/provider-portal/components/inbox/theme.ts
// =============================================================================

import type { CategoryType } from './types';

export const theme = {
  gradient: {
    // ATTENDING AI Standard Brand Gradient - Deep Navy/Teal
    primary: 'linear-gradient(135deg, #0C3547 0%, #1A8FA8 100%)',
    sidebar: 'linear-gradient(180deg, #0C3547 0%, #1A8FA8 50%, #0C3547 100%)',
    header: 'linear-gradient(135deg, #0C3547 0%, #1A8FA8 100%)',
  },
  purple: {
    50: '#E6F7F5',
    100: '#C3ECE7',
    200: '#8ED9CE',
    300: '#5AC5B5',
    400: '#25B8A9',
    500: '#1A8FA8',
    600: '#0F5F76',
    700: '#0C4C5E',
    800: '#0C3547',
    900: '#082630',
    950: '#041318',
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
    accent: '#1A8FA8',
  },
  background: {
    main: '#E6F7F5',
    card: '#ffffff',
    cardHover: '#F0FAF9',
    section: '#E6F7F5',
    subtle: '#F0FAF9',
  },
  border: {
    light: '#C3ECE7',
    medium: '#8ED9CE',
    dark: '#5AC5B5',
    accent: '#1A8FA8',
  },
  shadow: {
    sm: '0 2px 8px rgba(26, 143, 168, 0.1)',
    md: '0 4px 16px rgba(26, 143, 168, 0.15)',
    lg: '0 8px 32px rgba(26, 143, 168, 0.2)',
    glow: '0 0 20px rgba(26, 143, 168, 0.3)',
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
    accent: '#1A8FA8',
    accentLight: '#E6F7F5',
    accentDark: '#0C3547',
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
    accent: '#0F5F76',
    accentLight: '#E6F7F5',
    accentDark: '#0C3547',
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
  normal: { bg: '#E6F7F5', text: '#1A8FA8', border: '#8ED9CE', dot: '#1A8FA8' },
  low: { bg: '#f3f4f6', text: '#6b7280', border: '#d1d5db', dot: '#9ca3af' },
} as const;

export const statusColors = {
  unread: { bg: '#E6F7F5', dot: '#1A8FA8' },
  read: { bg: '#F0FAF9', dot: 'transparent' },
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

export function getBrandGradientStyle(): React.CSSProperties {
  return { background: theme.gradient.primary };
}

/** @deprecated Use getBrandGradientStyle instead */
export const getPurpleGradientStyle = getBrandGradientStyle;

export function getPriorityStyle(priority: keyof typeof priorityColors) {
  return priorityColors[priority];
}
