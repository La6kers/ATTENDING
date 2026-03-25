// ============================================================
// Dashboard Widget Registry
// apps/provider-portal/lib/dashboardWidgets.ts
//
// Registry pattern for dashboard widgets
// Makes it easy to add/remove/configure widgets
// ============================================================

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { 
  Activity, 
  Brain, 
  Users, 
  Zap, 
  MessageSquare, 
  BarChart3,
  FileImage,
  TestTube,
  Pill,
  ClipboardList,
  Bell,
  Calendar,
  TrendingUp
} from 'lucide-react';

// ============================================================
// Types
// ============================================================

export type WidgetCategory = 'core' | 'clinical' | 'communication' | 'analytics';

export type WidgetSize = 'small' | 'medium' | 'large' | 'full';

export interface WidgetLayout {
  lg: { x: number; y: number; w: number; h: number };
  md?: { x: number; y: number; w: number; h: number };
  sm?: { x: number; y: number; w: number; h: number };
  xs?: { x: number; y: number; w: number; h: number };
}

export interface WidgetConfig {
  /** Unique widget identifier */
  id: string;
  /** Display title */
  title: string;
  /** Widget description */
  description: string;
  /** Icon component */
  icon: LucideIcon;
  /** Icon color class */
  iconColor: string;
  /** Category for grouping */
  category: WidgetCategory;
  /** Default layout positions */
  defaultLayout: WidgetLayout;
  /** Minimum/maximum size constraints */
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  /** Required permissions to view widget */
  permissions?: string[];
  /** Dynamic import for the component */
  component: () => Promise<{ default: React.ComponentType<any> }>;
  /** Whether widget is enabled by default */
  defaultEnabled?: boolean;
  /** Refresh interval in ms (0 = no auto-refresh) */
  refreshInterval?: number;
  /** Tags for search/filter */
  tags?: string[];
}

// ============================================================
// Widget Definitions
// ============================================================

export const DASHBOARD_WIDGETS: Record<string, WidgetConfig> = {
  // Core Widgets
  stats: {
    id: 'stats',
    title: 'Statistics Overview',
    description: 'Key metrics and KPIs at a glance',
    icon: BarChart3,
    iconColor: 'text-indigo-500',
    category: 'core',
    defaultLayout: {
      lg: { x: 0, y: 0, w: 12, h: 2 },
      md: { x: 0, y: 0, w: 10, h: 2 },
      sm: { x: 0, y: 0, w: 6, h: 3 },
      xs: { x: 0, y: 0, w: 4, h: 4 },
    },
    minW: 6,
    minH: 2,
    maxH: 3,
    component: () => import('@/components/dashboard/StatCards'),
    defaultEnabled: true,
    tags: ['metrics', 'kpi', 'overview'],
  },

  quickAccess: {
    id: 'quickAccess',
    title: 'Quick Access',
    description: 'Shortcuts to frequently used features',
    icon: Zap,
    iconColor: 'text-amber-500',
    category: 'core',
    defaultLayout: {
      lg: { x: 0, y: 2, w: 12, h: 2 },
      md: { x: 0, y: 2, w: 10, h: 2 },
      sm: { x: 0, y: 3, w: 6, h: 3 },
      xs: { x: 0, y: 4, w: 4, h: 4 },
    },
    minW: 6,
    minH: 2,
    maxH: 3,
    component: () => import('@/components/dashboard/QuickAccess'),
    defaultEnabled: true,
    tags: ['shortcuts', 'navigation'],
  },

  // Clinical Widgets
  assessments: {
    id: 'assessments',
    title: 'COMPASS Assessments',
    description: 'Recent patient assessments requiring review',
    icon: Activity,
    iconColor: 'text-green-500',
    category: 'clinical',
    defaultLayout: {
      lg: { x: 0, y: 4, w: 8, h: 5 },
      md: { x: 0, y: 4, w: 6, h: 5 },
      sm: { x: 0, y: 6, w: 6, h: 5 },
      xs: { x: 0, y: 8, w: 4, h: 5 },
    },
    minW: 4,
    minH: 3,
    component: () => import('@/components/dashboard/RecentAssessments'),
    defaultEnabled: true,
    refreshInterval: 30000,
    tags: ['patients', 'assessments', 'compass'],
  },

  patientQueue: {
    id: 'patientQueue',
    title: 'Patient Queue',
    description: 'Patients waiting for review',
    icon: Users,
    iconColor: 'text-blue-500',
    category: 'clinical',
    defaultLayout: {
      lg: { x: 0, y: 9, w: 6, h: 6 },
      md: { x: 0, y: 9, w: 5, h: 6 },
      sm: { x: 0, y: 16, w: 6, h: 6 },
      xs: { x: 0, y: 18, w: 4, h: 6 },
    },
    minW: 4,
    minH: 4,
    component: () => import('@/components/dashboard/PatientQueue'),
    defaultEnabled: true,
    refreshInterval: 15000,
    tags: ['patients', 'queue', 'waiting'],
  },

  // Analytics Widgets
  aiInsights: {
    id: 'aiInsights',
    title: 'BioMistral Insights',
    description: 'AI-generated clinical insights and recommendations',
    icon: Brain,
    iconColor: 'text-purple-500',
    category: 'analytics',
    defaultLayout: {
      lg: { x: 8, y: 4, w: 4, h: 5 },
      md: { x: 6, y: 4, w: 4, h: 5 },
      sm: { x: 0, y: 11, w: 6, h: 5 },
      xs: { x: 0, y: 13, w: 4, h: 5 },
    },
    minW: 3,
    minH: 3,
    component: () => import('@/components/dashboard/AIInsights'),
    defaultEnabled: true,
    refreshInterval: 60000,
    tags: ['ai', 'insights', 'recommendations'],
  },

  trends: {
    id: 'trends',
    title: 'Clinical Trends',
    description: 'Patient volume and clinical metrics over time',
    icon: TrendingUp,
    iconColor: 'text-emerald-500',
    category: 'analytics',
    defaultLayout: {
      lg: { x: 0, y: 15, w: 6, h: 4 },
      md: { x: 0, y: 15, w: 5, h: 4 },
    },
    minW: 4,
    minH: 3,
    component: () => import('@/components/dashboard/ClinicalTrends'),
    defaultEnabled: false,
    tags: ['charts', 'trends', 'analytics'],
  },

  // Communication Widgets
  messaging: {
    id: 'messaging',
    title: 'Patient Messaging',
    description: 'Recent messages and notifications',
    icon: MessageSquare,
    iconColor: 'text-cyan-500',
    category: 'communication',
    defaultLayout: {
      lg: { x: 6, y: 9, w: 6, h: 6 },
      md: { x: 5, y: 9, w: 5, h: 6 },
      sm: { x: 0, y: 22, w: 6, h: 6 },
      xs: { x: 0, y: 24, w: 4, h: 6 },
    },
    minW: 4,
    minH: 4,
    component: () => import('@/components/PatientMessaging'),
    defaultEnabled: true,
    refreshInterval: 10000,
    tags: ['messages', 'communication', 'inbox'],
  },

  notifications: {
    id: 'notifications',
    title: 'Notifications',
    description: 'System alerts and notifications',
    icon: Bell,
    iconColor: 'text-red-500',
    category: 'communication',
    defaultLayout: {
      lg: { x: 6, y: 15, w: 6, h: 4 },
      md: { x: 5, y: 15, w: 5, h: 4 },
    },
    minW: 3,
    minH: 2,
    component: () => import('@/components/dashboard/Notifications'),
    defaultEnabled: false,
    tags: ['alerts', 'notifications'],
  },

  // Additional Clinical Widgets
  labResults: {
    id: 'labResults',
    title: 'Lab Results',
    description: 'Pending and recent lab results',
    icon: TestTube,
    iconColor: 'text-green-600',
    category: 'clinical',
    defaultLayout: {
      lg: { x: 0, y: 19, w: 4, h: 4 },
    },
    minW: 3,
    minH: 3,
    component: () => import('@/components/dashboard/LabResults'),
    defaultEnabled: false,
    tags: ['labs', 'results', 'diagnostics'],
  },

  imagingResults: {
    id: 'imagingResults',
    title: 'Imaging Results',
    description: 'Pending and recent imaging studies',
    icon: FileImage,
    iconColor: 'text-blue-600',
    category: 'clinical',
    defaultLayout: {
      lg: { x: 4, y: 19, w: 4, h: 4 },
    },
    minW: 3,
    minH: 3,
    component: () => import('@/components/dashboard/ImagingResults'),
    defaultEnabled: false,
    tags: ['imaging', 'radiology', 'results'],
  },

  medications: {
    id: 'medications',
    title: 'Medication Alerts',
    description: 'Drug interactions and refill requests',
    icon: Pill,
    iconColor: 'text-purple-600',
    category: 'clinical',
    defaultLayout: {
      lg: { x: 8, y: 19, w: 4, h: 4 },
    },
    minW: 3,
    minH: 3,
    component: () => import('@/components/dashboard/MedicationAlerts'),
    defaultEnabled: false,
    tags: ['medications', 'prescriptions', 'alerts'],
  },

  schedule: {
    id: 'schedule',
    title: 'Today\'s Schedule',
    description: 'Upcoming appointments and tasks',
    icon: Calendar,
    iconColor: 'text-orange-500',
    category: 'core',
    defaultLayout: {
      lg: { x: 0, y: 23, w: 6, h: 4 },
    },
    minW: 4,
    minH: 3,
    component: () => import('@/components/dashboard/Schedule'),
    defaultEnabled: false,
    tags: ['calendar', 'appointments', 'schedule'],
  },

  treatmentPlans: {
    id: 'treatmentPlans',
    title: 'Active Treatment Plans',
    description: 'Patients with active treatment plans',
    icon: ClipboardList,
    iconColor: 'text-teal-500',
    category: 'clinical',
    defaultLayout: {
      lg: { x: 6, y: 23, w: 6, h: 4 },
    },
    minW: 4,
    minH: 3,
    component: () => import('@/components/dashboard/TreatmentPlans'),
    defaultEnabled: false,
    tags: ['treatment', 'plans', 'care'],
  },
};

// ============================================================
// Registry Utilities
// ============================================================

/** Get all widgets as array */
export function getAllWidgets(): WidgetConfig[] {
  return Object.values(DASHBOARD_WIDGETS);
}

/** Get widgets by category */
export function getWidgetsByCategory(category: WidgetCategory): WidgetConfig[] {
  return getAllWidgets().filter(w => w.category === category);
}

/** Get enabled widgets (default or user-selected) */
export function getDefaultEnabledWidgets(): WidgetConfig[] {
  return getAllWidgets().filter(w => w.defaultEnabled);
}

/** Get widget by ID */
export function getWidget(id: string): WidgetConfig | undefined {
  return DASHBOARD_WIDGETS[id];
}

/** Search widgets by tags or title */
export function searchWidgets(query: string): WidgetConfig[] {
  const lowerQuery = query.toLowerCase();
  return getAllWidgets().filter(w => 
    w.title.toLowerCase().includes(lowerQuery) ||
    w.description.toLowerCase().includes(lowerQuery) ||
    w.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}

/** Get category display info */
export const WIDGET_CATEGORIES: Record<WidgetCategory, { label: string; description: string }> = {
  core: {
    label: 'Core',
    description: 'Essential dashboard components',
  },
  clinical: {
    label: 'Clinical',
    description: 'Patient care and clinical workflows',
  },
  communication: {
    label: 'Communication',
    description: 'Messaging and notifications',
  },
  analytics: {
    label: 'Analytics',
    description: 'Insights and reporting',
  },
};

export default DASHBOARD_WIDGETS;
