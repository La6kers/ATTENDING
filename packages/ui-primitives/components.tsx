// ============================================================
// ATTENDING AI — UI Primitives Components
// packages/ui-primitives/components.tsx
//
// Base component implementations using CVA + Tailwind.
// These are re-exported by @attending/shared which adds
// clinical-specific extensions on top.
// ============================================================

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { X, Search, ChevronDown, ChevronRight, Loader2, AlertTriangle, Sparkles, Info } from 'lucide-react';
import type { ButtonVariant, ButtonSize, OrderPriority, StatusValue, FilterTab } from './types';
import { gradients, colors } from './tokens';

// ============================================================
// UTILITY
// ============================================================

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ============================================================
// BUTTON
// ============================================================

const buttonVariants = cva(
  'inline-flex items-center justify-center font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary: 'bg-[#1A8FA8] text-white hover:bg-[#157A90] focus:ring-[#1A8FA8] rounded-xl shadow-sm hover:shadow-md',
        secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-[#B0D8E4] focus:ring-[#1A8FA8] rounded-xl',
        ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-lg',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 rounded-xl',
        teal: 'text-[#1A8FA8] hover:bg-[#E6F7F5] rounded-lg',
        coral: 'bg-[#E87461] text-white hover:bg-[#D4624F] focus:ring-[#E87461] rounded-xl',
        gold: 'bg-[#F0A500] text-white hover:bg-[#D48F00] focus:ring-[#F0A500] rounded-xl',
      },
      size: {
        xs: 'text-xs px-2 py-1 gap-1',
        sm: 'text-sm px-3 py-1.5 gap-1.5',
        md: 'text-sm px-4 py-2 gap-2',
        lg: 'text-base px-6 py-3 gap-2',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} disabled={disabled || loading} {...props}>
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  )
);
Button.displayName = 'Button';

export interface QuickActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
  label: string;
  description?: string;
  gradient?: string;
}

export const QuickActionButton: React.FC<QuickActionButtonProps> = ({ icon, label, description, gradient, className, ...props }) => (
  <button className={cn('flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:shadow-md transition-all text-left w-full', className)} {...props}>
    {icon && <div className="p-2 rounded-lg text-white flex-shrink-0" style={{ background: gradient || gradients.teal }}>{icon}</div>}
    <div>
      <p className="font-semibold text-slate-900 text-sm">{label}</p>
      {description && <p className="text-xs text-slate-500">{description}</p>}
    </div>
  </button>
);

export interface FloatingActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({ icon, className, ...props }) => (
  <button className={cn('fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg text-white flex items-center justify-center transition-all z-50 hover:scale-105', className)} style={{ background: gradients.teal }} {...props}>
    {icon || <Sparkles className="w-6 h-6" />}
  </button>
);

export interface StatusToggleProps {
  value: StatusValue;
  onChange: (value: StatusValue) => void;
  options?: { value: StatusValue; label: string }[];
  className?: string;
}

export const StatusToggle: React.FC<StatusToggleProps> = ({ value, onChange, options, className }) => {
  const defaultOptions = [
    { value: 'active' as StatusValue, label: 'Active' },
    { value: 'inactive' as StatusValue, label: 'Inactive' },
  ];
  const opts = options || defaultOptions;
  return (
    <div className={cn('inline-flex rounded-lg border border-slate-200 bg-white p-0.5', className)}>
      {opts.map(opt => (
        <button key={opt.value} onClick={() => onChange(opt.value)}
          className={cn('px-3 py-1 text-sm font-medium rounded-md transition-colors', value === opt.value ? 'bg-[#1A8FA8] text-white' : 'text-slate-600 hover:bg-slate-100')}>
          {opt.label}
        </button>
      ))}
    </div>
  );
};

// ============================================================
// CARD
// ============================================================

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('bg-white rounded-xl border border-slate-200 shadow-sm', className)} {...props} />
));
Card.displayName = 'Card';

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-4 border-b border-slate-200', className)} {...props} />
));
CardHeader.displayName = 'CardHeader';

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-4', className)} {...props} />
));
CardContent.displayName = 'CardContent';

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-4 border-t border-slate-200', className)} {...props} />
));
CardFooter.displayName = 'CardFooter';

// ============================================================
// BADGE
// ============================================================

const badgeVariants = cva(
  'inline-flex items-center rounded-full font-medium',
  {
    variants: {
      variant: {
        default: 'bg-slate-100 text-slate-700',
        primary: 'bg-[#E6F7F5] text-[#0C4C5E]',
        success: 'bg-green-100 text-green-800',
        warning: 'bg-amber-100 text-amber-800',
        danger: 'bg-red-100 text-red-800',
        info: 'bg-blue-100 text-blue-800',
        purple: 'bg-purple-100 text-purple-800',
        teal: 'bg-teal-100 text-teal-800',
        outline: 'border border-slate-200 text-slate-600',
      },
      size: {
        sm: 'text-[10px] px-1.5 py-0.5',
        md: 'text-xs px-2.5 py-0.5',
        lg: 'text-sm px-3 py-1',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(({ className, variant, size, ...props }, ref) => (
  <span ref={ref} className={cn(badgeVariants({ variant, size }), className)} {...props} />
));
Badge.displayName = 'Badge';

export interface PriorityBadgeProps { priority: OrderPriority; className?: string; }

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, className }) => {
  const config: Record<OrderPriority, { bg: string; text: string; label: string }> = {
    stat: { bg: 'bg-red-100', text: 'text-red-800', label: 'STAT' },
    urgent: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Urgent' },
    asap: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'ASAP' },
    routine: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Routine' },
  };
  const c = config[priority] || config.routine;
  return <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold', c.bg, c.text, className)}>{c.label}</span>;
};

export interface AIBadgeProps { className?: string; label?: string; }

export const AIBadge: React.FC<AIBadgeProps> = ({ className, label = 'AI' }) => (
  <span className={cn('px-1.5 py-0.5 text-[10px] font-bold rounded text-white', className)} style={{ background: gradients.teal }}>{label}</span>
);

// ============================================================
// INPUT
// ============================================================

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn('w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A8FA8] focus:border-[#1A8FA8] placeholder-slate-400 transition-all', className)} {...props} />
));
Input.displayName = 'Input';

export interface SearchInputProps extends InputProps {
  onClear?: () => void;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(({ className, onClear, ...props }, ref) => (
  <div className="relative">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
    <input ref={ref} className={cn('w-full pl-9 pr-8 py-2 bg-slate-100 border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A8FA8] focus:bg-white transition-all', className)} {...props} />
    {props.value && onClear && (
      <button onClick={onClear} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
        <X className="w-4 h-4" />
      </button>
    )}
  </div>
));
SearchInput.displayName = 'SearchInput';

// ============================================================
// MODAL
// ============================================================

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md', className }) => {
  if (!isOpen) return null;
  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl', full: 'max-w-[90vw]' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('relative bg-white rounded-2xl shadow-xl border border-slate-200 w-full overflow-hidden', sizes[size], className)}>
        {title && (
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-900">{title}</h2>
            <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
          </div>
        )}
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
};

export interface EmergencyModalProps extends ModalProps { severity?: 'warning' | 'critical'; }

export const EmergencyModal: React.FC<EmergencyModalProps> = ({ severity = 'critical', title, children, ...props }) => (
  <Modal {...props} title={undefined}>
    <div className={cn('p-4 flex items-center gap-3 border-b', severity === 'critical' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200')}>
      <AlertTriangle className={cn('w-5 h-5', severity === 'critical' ? 'text-red-600' : 'text-amber-600')} />
      <h2 className={cn('font-semibold', severity === 'critical' ? 'text-red-900' : 'text-amber-900')}>{title}</h2>
      <button onClick={props.onClose} className="ml-auto p-1 hover:bg-white/50 rounded"><X className="w-4 h-4" /></button>
    </div>
    <div className="p-4">{children}</div>
  </Modal>
);

// ============================================================
// COLLAPSIBLE
// ============================================================

export interface CollapsibleProps {
  title: string | React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  headerClassName?: string;
}

export const Collapsible: React.FC<CollapsibleProps> = ({ title, children, defaultOpen = false, className, headerClassName }) => {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className={cn('border border-slate-200 rounded-xl overflow-hidden', className)}>
      <button onClick={() => setOpen(!open)} className={cn('w-full flex items-center justify-between p-3 text-left hover:bg-slate-50 transition-colors', headerClassName)}>
        <span className="font-medium text-sm text-slate-900">{title}</span>
        <ChevronRight className={cn('w-4 h-4 text-slate-400 transition-transform', open && 'rotate-90')} />
      </button>
      {open && <div className="border-t border-slate-200 p-3">{children}</div>}
    </div>
  );
};

export interface OrderCategoryCollapsibleProps extends CollapsibleProps {
  priority?: OrderPriority;
  count?: number;
}

export const OrderCategoryCollapsible: React.FC<OrderCategoryCollapsibleProps> = ({ priority, count, title, ...props }) => (
  <Collapsible
    title={
      <span className="flex items-center gap-2">
        {priority && <PriorityBadge priority={priority} />}
        <span>{title}</span>
        {count !== undefined && <span className="text-xs text-slate-400">({count})</span>}
      </span>
    }
    {...props}
  />
);

// ============================================================
// SPINNER / LOADING
// ============================================================

export interface SpinnerProps { size?: 'sm' | 'md' | 'lg'; className?: string; }

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className }) => {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' };
  return <Loader2 className={cn('animate-spin text-[#1A8FA8]', sizes[size], className)} />;
};

export interface LoadingStateProps { message?: string; className?: string; }

export const LoadingState: React.FC<LoadingStateProps> = ({ message = 'Loading...', className }) => (
  <div className={cn('flex flex-col items-center justify-center py-12', className)}>
    <Spinner size="lg" />
    <p className="text-slate-500 text-sm mt-3">{message}</p>
  </div>
);

// ============================================================
// EMPTY STATE
// ============================================================

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action, className }) => (
  <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
    {icon && <div className="mb-4 text-slate-300">{icon}</div>}
    <h3 className="font-semibold text-slate-900">{title}</h3>
    {description && <p className="text-sm text-slate-500 mt-1 max-w-sm">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

// ============================================================
// CONFIDENCE INDICATOR
// ============================================================

export interface ConfidenceIndicatorProps {
  value: number; // 0-1
  label?: string;
  showPercent?: boolean;
  className?: string;
}

export const ConfidenceIndicator: React.FC<ConfidenceIndicatorProps> = ({ value, label, showPercent = true, className }) => {
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {label && <span className="text-xs text-slate-500">{label}</span>}
      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
      {showPercent && <span className="text-xs font-medium text-slate-600">{pct}%</span>}
    </div>
  );
};

// ============================================================
// GRADIENT HEADER
// ============================================================

export interface GradientHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  actions?: React.ReactNode;
  className?: string;
}

export const GradientHeader: React.FC<GradientHeaderProps> = ({ title, subtitle, badge, actions, className }) => (
  <div className={cn('rounded-2xl p-6 text-white', className)} style={{ background: gradients.brand }}>
    <div className="flex items-center justify-between">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">{title}</h1>
          {badge && <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-white/20">{badge}</span>}
        </div>
        {subtitle && <p className="text-teal-100 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  </div>
);

// ============================================================
// WARNING BANNER
// ============================================================

export interface WarningBannerProps {
  message: string;
  severity?: 'info' | 'warning' | 'critical';
  onDismiss?: () => void;
  action?: React.ReactNode;
  className?: string;
}

export const WarningBanner: React.FC<WarningBannerProps> = ({ message, severity = 'warning', onDismiss, action, className }) => {
  const config = {
    info: { bg: 'bg-blue-50 border-blue-200', icon: 'text-blue-600', text: 'text-blue-800' },
    warning: { bg: 'bg-amber-50 border-amber-200', icon: 'text-amber-600', text: 'text-amber-800' },
    critical: { bg: 'bg-red-50 border-red-200', icon: 'text-red-600', text: 'text-red-800' },
  };
  const c = config[severity];
  return (
    <div className={cn('flex items-center gap-3 p-3 rounded-xl border', c.bg, className)}>
      {severity === 'critical' ? <AlertTriangle className={cn('w-5 h-5 flex-shrink-0', c.icon)} /> : <Info className={cn('w-5 h-5 flex-shrink-0', c.icon)} />}
      <p className={cn('text-sm flex-1', c.text)}>{message}</p>
      {action}
      {onDismiss && <button onClick={onDismiss} className="p-1 hover:bg-white/50 rounded"><X className="w-4 h-4 text-slate-400" /></button>}
    </div>
  );
};

// ============================================================
// FILTER TABS
// ============================================================

export interface FilterTabsProps {
  tabs: FilterTab[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export const FilterTabs: React.FC<FilterTabsProps> = ({ tabs, activeTab, onChange, className }) => (
  <div className={cn('flex gap-1 bg-slate-100 rounded-lg p-1', className)}>
    {tabs.map(tab => (
      <button key={tab.id} onClick={() => onChange(tab.id)}
        className={cn('px-3 py-1.5 text-sm font-medium rounded-md transition-colors', activeTab === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900')}>
        {tab.label}
        {tab.count !== undefined && <span className="ml-1.5 text-xs text-slate-400">{tab.count}</span>}
      </button>
    ))}
  </div>
);

// ============================================================
// AVATAR
// ============================================================

export interface AvatarProps {
  name: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ name, src, size = 'md', className }) => {
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-lg' };
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  if (src) {
    return <img src={src} alt={name} className={cn('rounded-full object-cover', sizes[size], className)} />;
  }
  return (
    <div className={cn('rounded-full flex items-center justify-center text-white font-semibold', sizes[size], className)} style={{ background: gradients.teal }}>
      {initials}
    </div>
  );
};

// ============================================================
// PATIENT BANNER
// ============================================================

export interface PatientBannerProps {
  name: string;
  age?: number;
  gender?: string;
  mrn?: string;
  allergies?: string[];
  codeStatus?: string;
  className?: string;
}

export const PatientBanner: React.FC<PatientBannerProps> = ({ name, age, gender, mrn, allergies, codeStatus, className }) => (
  <div className={cn('flex items-center gap-4 p-3 bg-white rounded-xl border border-slate-200', className)}>
    <Avatar name={name} size="lg" />
    <div className="flex-1 min-w-0">
      <h2 className="font-semibold text-slate-900">{name}</h2>
      <p className="text-sm text-slate-500">
        {age && `${age}yo`} {gender} {mrn && `· MRN: ${mrn}`}
      </p>
    </div>
    {allergies && allergies.length > 0 && (
      <div className="flex gap-1">
        {allergies.map(a => <span key={a} className="px-2 py-0.5 bg-red-50 text-red-700 rounded text-xs font-medium">{a}</span>)}
      </div>
    )}
    {codeStatus && <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">{codeStatus}</span>}
  </div>
);
