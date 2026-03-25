// ============================================================
// Button Component - @attending/shared
// apps/shared/components/ui/Button.tsx
//
// Re-exports from @attending/ui-primitives for backward compatibility
// Plus additional specialized clinical buttons
// ============================================================

// Re-export all button components from ui-primitives
export {
  Button,
  QuickActionButton,
  FloatingActionButton,
  StatusToggle,
  gradients as GRADIENTS,
  type ButtonProps,
  type QuickActionButtonProps,
  type FloatingActionButtonProps,
  type StatusToggleProps,
  type StatusValue,
} from '@attending/ui-primitives';

// Note: gradients is exported from design-tokens in index.ts, not duplicated here
