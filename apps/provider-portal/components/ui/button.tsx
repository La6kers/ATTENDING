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

// Legacy export for backward compatibility with existing code
import { Button } from '../../../shared/components/ui/Button';
import { cva, type VariantProps } from 'class-variance-authority';

// Keep the old buttonVariants for any code that still uses it
const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-full text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        default: 'bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:shadow-lg hover:-translate-y-0.5',
        secondary: 'bg-purple-100 text-purple-700 hover:bg-purple-200',
        ghost: 'hover:bg-purple-50 hover:text-purple-700',
        link: 'underline-offset-4 hover:underline text-purple-700',
        outline: 'border-2 border-gray-300 bg-white hover:border-purple-500 text-gray-700',
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
