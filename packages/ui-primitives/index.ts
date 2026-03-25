// ============================================================
// @attending/ui-primitives — Main Entry Point
// packages/ui-primitives/index.ts
//
// Everything exported from here is consumed by:
// - apps/shared/components/ui/*
// - apps/provider-portal/components/ui/index.ts
// ============================================================

// Utility
export { cn } from './components';

// Components
export {
  Button,
  type ButtonProps,
  QuickActionButton,
  type QuickActionButtonProps,
  FloatingActionButton,
  type FloatingActionButtonProps,
  StatusToggle,
  type StatusToggleProps,
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
  Input,
  type InputProps,
  SearchInput,
  type SearchInputProps,
  Modal,
  type ModalProps,
  EmergencyModal,
  type EmergencyModalProps,
  Collapsible,
  type CollapsibleProps,
  OrderCategoryCollapsible,
  type OrderCategoryCollapsibleProps,
  Spinner,
  type SpinnerProps,
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
  FilterTabs,
  type FilterTabsProps,
  Avatar,
  type AvatarProps,
  PatientBanner,
  type PatientBannerProps,
} from './components';

// Toast
export {
  ToastProvider,
  ToastContainer,
  useToast,
  useToastActions,
  type Toast,
  type ToastType,
  type ToastContextType,
} from './toast';

// Design Tokens
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
} from './tokens';

// Types
export type {
  OrderPriority,
  RecommendationCategory,
  UrgencyLevel,
  ModuleType,
  FindingStatus,
  ButtonVariant,
  ButtonSize,
  StatusValue,
  FilterTab,
} from './types';
