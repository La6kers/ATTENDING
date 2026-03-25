// ============================================================
// ATTENDING AI — Design Tokens
// packages/ui-primitives/tokens.ts
//
// Single source of truth for all design tokens.
// Matches the CSS variables in apps/shared/styles/design-system.css
// ============================================================

export const colors = {
  deepNavy: '#0C3547',
  headerDark: '#0C4C5E',
  midTeal: '#0F5F76',
  primaryTeal: '#1A8FA8',
  lightTeal: '#25B8A9',
  paleMint: '#E6F7F5',
  gold: '#F0A500',
  goldDark: '#D48F00',
  goldLight: '#FEF8E7',
  coral: '#E87461',
  coralLight: '#FCE8E5',
  white: '#FFFFFF',
  black: '#000000',
  // Neutral palette
  neutral: {
    0: '#ffffff',
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94a3b8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0F172A',
  },
  // Status colors
  status: {
    critical: '#EF4444',
    criticalLight: '#fef2f2',
    warning: '#F0A500',
    warningLight: '#FEF8E7',
    success: '#22c55e',
    successLight: '#f0fdf4',
    info: '#1A8FA8',
    infoLight: '#E6F7F5',
  },
} as const;

export const gradients = {
  brand: 'linear-gradient(135deg, #0C3547 0%, #1A8FA8 100%)',
  brandHeader: 'linear-gradient(180deg, #1A8FA8 0%, #0C4C5E 100%)',
  brandHover: 'linear-gradient(135deg, #0C4C5E 0%, #25B8A9 100%)',
  brandSubtle: 'linear-gradient(135deg, #E6F7F5 0%, #F0F7F9 100%)',
  gold: 'linear-gradient(135deg, #F0A500 0%, #D48F00 100%)',
  coral: 'linear-gradient(135deg, #E87461 0%, #D4624F 100%)',
  teal: 'linear-gradient(135deg, #1A8FA8 0%, #25B8A9 100%)',
} as const;

export const shadows = {
  xs: '0 1px 2px rgba(0, 0, 0, 0.05)',
  sm: '0 2px 4px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.1)',
  md: '0 4px 6px rgba(0, 0, 0, 0.05), 0 2px 4px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04)',
  brand: '0 4px 14px rgba(26, 143, 168, 0.25)',
  brandHover: '0 8px 20px rgba(26, 143, 168, 0.35)',
  critical: '0 4px 14px rgba(239, 68, 68, 0.25)',
  gold: '0 4px 14px rgba(240, 165, 0, 0.25)',
  coral: '0 4px 14px rgba(232, 116, 97, 0.25)',
} as const;

export const spacing = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  '2xl': '3rem',
} as const;

export const typography = {
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  fontMono: "ui-monospace, SFMono-Regular, 'SF Mono', Consolas, monospace",
  xs: '0.75rem',
  sm: '0.875rem',
  base: '1rem',
  lg: '1.125rem',
  xl: '1.25rem',
  '2xl': '1.5rem',
  '3xl': '1.875rem',
  '4xl': '2.25rem',
} as const;

export const borderRadius = {
  sm: '0.375rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
  '2xl': '1.5rem',
  full: '9999px',
} as const;

export const transitions = {
  fast: '150ms ease',
  base: '200ms ease',
  slow: '300ms ease',
} as const;

export const zIndex = {
  dropdown: 10,
  sticky: 20,
  fixed: 30,
  modalBackdrop: 40,
  modal: 50,
  popover: 60,
  tooltip: 70,
  toast: 80,
  emergency: 100,
} as const;

export const breakpoints = {
  xs: '400px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// ============================================================
// Clinical Config Tokens
// ============================================================

export const priorityConfig = {
  stat: { label: 'STAT', color: '#EF4444', bg: '#fef2f2', gradient: 'linear-gradient(135deg, #EF4444 0%, #dc2626 100%)' },
  urgent: { label: 'Urgent', color: '#F0A500', bg: '#FEF8E7', gradient: 'linear-gradient(135deg, #F0A500 0%, #D48F00 100%)' },
  asap: { label: 'ASAP', color: '#D48F00', bg: '#FEF8E7', gradient: 'linear-gradient(135deg, #D48F00 0%, #b87a00 100%)' },
  routine: { label: 'Routine', color: '#6b7280', bg: '#f9fafb', gradient: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)' },
} as const;

export const recommendationConfig = {
  strongly_recommended: { label: 'Strongly Recommended', color: '#1A8FA8', weight: 1 },
  recommended: { label: 'Recommended', color: '#22c55e', weight: 0.75 },
  consider: { label: 'Consider', color: '#F0A500', weight: 0.5 },
  optional: { label: 'Optional', color: '#6b7280', weight: 0.25 },
} as const;

export const urgencyConfig = {
  emergency: { label: 'Emergency', color: '#EF4444', bg: '#fef2f2', icon: 'AlertTriangle' },
  high: { label: 'High', color: '#F0A500', bg: '#FEF8E7', icon: 'AlertCircle' },
  moderate: { label: 'Moderate', color: '#1A8FA8', bg: '#E6F7F5', icon: 'Info' },
  standard: { label: 'Standard', color: '#22c55e', bg: '#f0fdf4', icon: 'CheckCircle' },
} as const;

export const moduleConfig = {
  labs: { label: 'Labs', color: '#f59e0b', icon: 'FlaskConical' },
  imaging: { label: 'Imaging', color: '#06b6d4', icon: 'ScanLine' },
  medications: { label: 'Medications', color: '#0F5F76', icon: 'Pill' },
  referrals: { label: 'Referrals', color: '#E87461', icon: 'ArrowRightLeft' },
  procedures: { label: 'Procedures', color: '#8b5cf6', icon: 'Scissors' },
} as const;

export const designTokens = {
  colors,
  gradients,
  shadows,
  spacing,
  typography,
  borderRadius,
  transitions,
  zIndex,
  breakpoints,
  priorityConfig,
  recommendationConfig,
  urgencyConfig,
  moduleConfig,
} as const;
