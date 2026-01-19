// ============================================================
// Collapsible Components - @attending/shared
// apps/shared/components/ui/Collapsible.tsx
//
// Re-exports from @attending/ui-primitives plus specialized collapsibles
// ============================================================

import * as React from 'react';
import { cn } from '../../lib/utils';
import { priorityConfig, type OrderPriority } from '@attending/ui-primitives';

// Re-export base collapsible
export {
  Collapsible,
  OrderCategoryCollapsible,
  type CollapsibleProps,
  type OrderCategoryCollapsibleProps,
} from '@attending/ui-primitives';

// Re-export priority type
export type OrderCategoryPriority = OrderPriority;

// ============================================================
// CLINICAL SECTION COLLAPSIBLE
// ============================================================

export interface ClinicalSectionCollapsibleProps {
  title: string;
  icon?: React.ReactNode;
  count?: number;
  urgency?: 'normal' | 'warning' | 'critical';
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
}

export const ClinicalSectionCollapsible: React.FC<ClinicalSectionCollapsibleProps> = ({
  title,
  icon,
  count,
  urgency = 'normal',
  defaultOpen = true,
  children,
  className,
  headerClassName,
}) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  const urgencyStyles: Record<NonNullable<ClinicalSectionCollapsibleProps['urgency']>, string> = {
    normal: 'bg-white border-gray-200',
    warning: 'bg-yellow-50 border-yellow-200',
    critical: 'bg-red-50 border-red-200',
  };

  const urgencyHeaderStyles: Record<NonNullable<ClinicalSectionCollapsibleProps['urgency']>, string> = {
    normal: 'hover:bg-gray-50',
    warning: 'bg-yellow-100 hover:bg-yellow-200',
    critical: 'bg-red-100 hover:bg-red-200',
  };

  return (
    <div className={cn('border rounded-xl overflow-hidden', urgencyStyles[urgency], className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center justify-between px-4 py-3 text-left transition-colors',
          urgencyHeaderStyles[urgency],
          headerClassName
        )}
      >
        <div className="flex items-center gap-3">
          {icon && <span className="text-lg">{icon}</span>}
          <span className="font-semibold text-gray-900">{title}</span>
          {count !== undefined && (
            <span className="px-2 py-0.5 bg-gray-200 rounded-full text-xs font-medium text-gray-600">
              {count}
            </span>
          )}
          {urgency === 'critical' && <span className="animate-pulse">🚨</span>}
        </div>
        <svg
          className={cn('w-5 h-5 text-gray-400 transition-transform', isOpen && 'rotate-180')}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && <div className="px-4 py-3 border-t border-gray-100">{children}</div>}
    </div>
  );
};

// ============================================================
// ACCORDION (Multiple collapsible sections)
// ============================================================

export interface AccordionItemProps {
  id: string;
  title: React.ReactNode;
  children: React.ReactNode;
}

export interface AccordionProps {
  items: AccordionItemProps[];
  allowMultiple?: boolean;
  defaultOpen?: string[];
  className?: string;
}

export const AccordionItem: React.FC<
  AccordionItemProps & { isOpen: boolean; onToggle: () => void }
> = ({ title, children, isOpen, onToggle }) => (
  <div className="border-b border-gray-200 last:border-b-0">
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
    >
      <span className="font-medium text-gray-900">{title}</span>
      <svg
        className={cn('w-5 h-5 text-gray-400 transition-transform', isOpen && 'rotate-180')}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
    {isOpen && <div className="px-4 py-3 bg-gray-50">{children}</div>}
  </div>
);

export const Accordion: React.FC<AccordionProps> = ({
  items,
  allowMultiple = false,
  defaultOpen = [],
  className,
}) => {
  const [openItems, setOpenItems] = React.useState<Set<string>>(new Set(defaultOpen));

  const handleToggle = (id: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (!allowMultiple) {
          next.clear();
        }
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className={cn('border border-gray-200 rounded-xl overflow-hidden', className)}>
      {items.map((item) => (
        <AccordionItem
          key={item.id}
          {...item}
          isOpen={openItems.has(item.id)}
          onToggle={() => handleToggle(item.id)}
        />
      ))}
    </div>
  );
};

export default ClinicalSectionCollapsible;
