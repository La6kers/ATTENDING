// ============================================================
// UI Components Index - @attending/shared
// apps/shared/components/ui/index.ts
//
// SINGLE ENTRY POINT for all UI components
// Most components are re-exported from @attending/ui-primitives
// with additional clinical-specific extensions
// ============================================================

// ============================================================
// DESIGN TOKENS (from ui-primitives)
// ============================================================
export {
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
  designTokens,
  type OrderPriority,
  type RecommendationCategory,
  type UrgencyLevel,
  type ModuleType,
} from '@attending/ui-primitives';

// ============================================================
// UTILITY FUNCTIONS
// ============================================================
export { cn } from '@attending/ui-primitives';

// ============================================================
// BUTTON COMPONENTS
// ============================================================
export {
  Button,
  QuickActionButton,
  FloatingActionButton,
  StatusToggle,
  GRADIENTS,
  // Note: gradients is exported from design tokens above, not duplicated here
  type ButtonProps,
  type QuickActionButtonProps,
  type FloatingActionButtonProps,
  type StatusToggleProps,
  type StatusValue,
} from './Button';

// ============================================================
// BADGE COMPONENTS
// ============================================================
export {
  Badge,
  PriorityBadge,
  AIBadge,
  NotificationBadge,
  UrgencyBadge,
  TriageBadge,
  StatusBadge,
  ProviderBadge,
  SecurityBadge,
  AvatarStack,
  type BadgeProps,
  type NotificationBadgeProps,
  type UrgencyBadgeProps,
  type UrgencyLevel as BadgeUrgencyLevel,
  type TriageBadgeProps,
  type ESILevel,
  type StatusBadgeProps,
  type StatusType,
  type ProviderBadgeProps,
  type SecurityBadgeProps,
  type AvatarStackProps,
  type AvatarProps,
} from './Badge';

// ============================================================
// CARD COMPONENTS
// ============================================================
export {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  ClinicalCard,
  FindingCard,
  DiagnosisCard,
  type CardProps,
  type ClinicalCardProps,
  type FindingCardProps,
  type FindingStatus,
  type DiagnosisCardProps,
} from './Card';

// ============================================================
// MODAL COMPONENTS
// ============================================================
export {
  Modal,
  EmergencyModal,
  ConfirmModal,
  GuidelinesModal,
  type ModalProps,
  type EmergencyModalProps,
  type ConfirmModalProps,
  type GuidelinesModalProps,
} from './Modal';

// ============================================================
// TOAST COMPONENTS
// ============================================================
export {
  ToastProvider,
  ToastContainer,
  useToast,
  useToastActions,
  type Toast,
  type ToastType,
  type ToastContextType,
} from './Toast';

// ============================================================
// COLLAPSIBLE COMPONENTS
// ============================================================
export {
  Collapsible,
  OrderCategoryCollapsible,
  ClinicalSectionCollapsible,
  Accordion,
  AccordionItem,
  type CollapsibleProps,
  type OrderCategoryCollapsibleProps,
  type OrderCategoryPriority,
  type ClinicalSectionCollapsibleProps,
  type AccordionProps,
  type AccordionItemProps,
} from './Collapsible';

// ============================================================
// FORM COMPONENTS
// ============================================================
export { Input, SearchInput, type InputProps, type SearchInputProps } from './Input';

// ============================================================
// FEEDBACK COMPONENTS
// ============================================================
export { Spinner, LoadingState, type SpinnerProps, type LoadingStateProps } from './Spinner';

// ============================================================
// ADDITIONAL UI PRIMITIVES (direct re-exports)
// ============================================================
export {
  EmptyState,
  ConfidenceIndicator,
  GradientHeader,
  WarningBanner,
  FilterTabs,
  Avatar,
  PatientBanner,
  type EmptyStateProps,
  type ConfidenceIndicatorProps,
  type GradientHeaderProps,
  type WarningBannerProps,
  type FilterTab,
  type FilterTabsProps,
  type AvatarProps as PrimitiveAvatarProps,
  type PatientBannerProps,
} from '@attending/ui-primitives';
