// Shared components index
// apps/provider-portal/components/shared/index.ts

// ============================================================================
// New Standardized Components
// ============================================================================

export { default as PageHeader, ModeToggle, FilterToggle } from './PageHeader';
export type { PageHeaderProps, ModeToggleProps, FilterToggleProps } from './PageHeader';

export { default as ContextBanner } from './ContextBanner';
export type { ContextBannerProps, PatientInfo, ContextType } from './ContextBanner';

export { default as TabNavigation, TabPanel } from './TabNavigation';
export type { TabNavigationProps, TabItem, TabPanelProps } from './TabNavigation';

// ============================================================================
// Existing Components
// ============================================================================

export { default as QuickActionsBar } from './QuickActionsBar';
export type { QuickActionsBarProps } from './QuickActionsBar';

export { default as PatientBanner } from './PatientBanner';
export type { PatientBannerProps, PatientContext } from './PatientBanner';

export { default as EmergencyProtocolModal } from './EmergencyProtocolModal';
export type { EmergencyProtocolModalProps, EmergencyProtocol, ProtocolStep } from './EmergencyProtocolModal';

export { default as ClinicalAlertBanner, SimpleCriticalAlert } from './ClinicalAlertBanner';
export type { ClinicalAlertBannerProps, ClinicalAlert, SimpleCriticalAlertProps } from './ClinicalAlertBanner';

export { default as FindingStatusCard, FindingList } from './FindingStatusCard';
export type { 
  FindingStatusCardProps, 
  Finding, 
  FindingStatus,
  FindingListProps 
} from './FindingStatusCard';

export { default as FloatingActionButton, SimpleFAB } from './FloatingActionButton';
export type { FloatingActionButtonProps, FABAction } from './FloatingActionButton';

export { ToastProvider, useToast, toast, setToastFn } from './Toast';
export type { Toast, ToastType } from './Toast';

export { default as CollapsibleOrderCategory } from './CollapsibleOrderCategory';
export type { CollapsibleOrderCategoryProps } from './CollapsibleOrderCategory';

export { default as KeyboardShortcutsHelp, ShortcutBadge } from './KeyboardShortcutsHelp';
export type { KeyboardShortcutsHelpProps } from './KeyboardShortcutsHelp';

export { default as NotificationCenter } from './NotificationCenter';
export type { NotificationCenterProps, Notification as NotificationType, TeamMember } from './NotificationCenter';
