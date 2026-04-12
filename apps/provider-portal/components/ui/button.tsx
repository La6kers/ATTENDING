// ============================================================
// Provider Portal Button Component
// apps/provider-portal/components/ui/button.tsx
//
// Re-exports from @attending/shared for consistency
// ============================================================

export {
  Button,
  QuickActionButton,
  FloatingActionButton,
  StatusToggle,
  GRADIENTS,
  type ButtonProps,
  type QuickActionButtonProps,
  type FloatingActionButtonProps,
  type StatusToggleProps,
  type StatusValue,
} from '../../../shared/components/ui/Button';

// Legacy buttonVariants export for backward compatibility
// Some components may still import this directly
import { cva } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-full text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        default: 'bg-gradient-to-r from-teal-600 to-teal-700 text-white hover:shadow-lg hover:-translate-y-0.5',
        secondary: 'bg-teal-100 text-teal-700 hover:bg-teal-200',
        ghost: 'hover:bg-teal-50 hover:text-teal-700',
        link: 'underline-offset-4 hover:underline text-teal-700',
        outline: 'border-2 border-gray-300 bg-white hover:border-teal-500 text-gray-700',
        danger: 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:shadow-lg',
      },
      size: {
        default: 'h-10 py-2 px-5',
        sm: 'h-9 px-4',
        lg: 'h-11 px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export { buttonVariants };
