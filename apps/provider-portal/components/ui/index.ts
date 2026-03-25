// ============================================================
// UI Components - Compatibility Layer
// apps/provider-portal/components/ui/index.ts
//
// Re-exports from @attending/ui-primitives for backward compatibility
// New code should import directly from '@attending/ui-primitives'
// ============================================================

// Re-export components that exist in @attending/ui-primitives
export { 
  Button, 
  type ButtonProps,
  Input,
  type InputProps,
  SearchInput,
  type SearchInputProps,
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  type CardProps,
  Badge,
  type BadgeProps,
  PriorityBadge,
  type PriorityBadgeProps,
  AIBadge,
  type AIBadgeProps,
  Modal,
  type ModalProps,
  EmergencyModal,
  type EmergencyModalProps,
  Collapsible,
  type CollapsibleProps,
  Spinner,
  LoadingState,
  type LoadingStateProps,
  EmptyState,
  type EmptyStateProps,
  ConfidenceIndicator,
  type ConfidenceIndicatorProps,
  GradientHeader,
  type GradientHeaderProps,
  WarningBanner,
  type WarningBannerProps,
  ToastProvider,
  ToastContainer,
  useToast,
  type Toast,
  type ToastType,
  StatusToggle,
  type StatusToggleProps,
  FilterTabs,
  type FilterTabsProps,
  Avatar,
  type AvatarProps,
  PatientBanner,
  type PatientBannerProps,
  QuickActionButton,
  type QuickActionButtonProps,
  FloatingActionButton,
  type FloatingActionButtonProps,
  OrderCategoryCollapsible,
  type OrderCategoryCollapsibleProps,
} from '@attending/ui-primitives';

// Also re-export utility functions
export { cn } from '@attending/ui-primitives';

// Export types
export type {
  OrderPriority,
  RecommendationCategory,
  UrgencyLevel,
  ModuleType,
  FindingStatus,
  FilterTab,
  ButtonVariant,
  ButtonSize,
} from '@attending/ui-primitives';

// Note: The following components need to be created locally or removed from imports:
// - Select, Checkbox, DashboardCard, CardSkeleton
// If you need these, create them in this directory or use alternatives from ui-primitives
