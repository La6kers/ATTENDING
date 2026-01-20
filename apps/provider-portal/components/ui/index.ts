// ============================================================
// UI Components - Compatibility Layer
// apps/provider-portal/components/ui/index.ts
//
// Re-exports from @attending/ui-primitives for backward compatibility
// New code should import directly from '@attending/ui-primitives'
// ============================================================

// Re-export all UI primitives
export { 
  Button, 
  buttonVariants, 
  type ButtonProps 
} from '@attending/ui-primitives';

export { 
  Input, 
  type InputProps 
} from '@attending/ui-primitives';

export { 
  Select, 
  type SelectProps,
  type SelectOption,
  type SelectOptionGroup 
} from '@attending/ui-primitives';

export { 
  Checkbox, 
  type CheckboxProps 
} from '@attending/ui-primitives';

export {
  DashboardCard,
  CardSkeleton,
  type DashboardCardProps,
  type CardSkeletonProps
} from '@attending/ui-primitives';

// Also re-export utility functions
export { cn } from '@attending/ui-primitives';
