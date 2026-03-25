// CollapsibleOrderCategory.tsx
// Collapsible category section for orders (labs, imaging, meds)
// apps/provider-portal/components/shared/CollapsibleOrderCategory.tsx

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle, Clock, CheckCircle } from 'lucide-react';

export interface CollapsibleOrderCategoryProps {
  title: string;
  priority: 'STAT' | 'URGENT' | 'ROUTINE';
  count: number;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  icon?: React.ReactNode;
  badge?: string;
  className?: string;
}

const priorityStyles = {
  STAT: {
    header: 'bg-gradient-to-r from-red-500 to-red-600 text-white',
    badge: 'bg-red-100 text-red-800',
    icon: <AlertTriangle className="w-5 h-5" />,
    pulseClass: 'animate-pulse-urgent',
  },
  URGENT: {
    header: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white',
    badge: 'bg-amber-100 text-amber-800',
    icon: <Clock className="w-5 h-5" />,
    pulseClass: '',
  },
  ROUTINE: {
    header: 'bg-gradient-to-r from-green-500 to-teal-500 text-white',
    badge: 'bg-green-100 text-green-800',
    icon: <CheckCircle className="w-5 h-5" />,
    pulseClass: '',
  },
};

const CollapsibleOrderCategory: React.FC<CollapsibleOrderCategoryProps> = ({
  title,
  priority,
  count,
  children,
  defaultExpanded = true,
  icon,
  badge,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const styles = priorityStyles[priority];

  return (
    <div className={`order-category ${priority.toLowerCase()} rounded-xl overflow-hidden shadow-sm ${className}`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center justify-between px-4 py-3 ${styles.header} transition-colors`}
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3">
          <span className={styles.pulseClass}>
            {icon || styles.icon}
          </span>
          <span className="font-semibold">{title}</span>
          {badge && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles.badge}`}>
              {badge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm opacity-90">
            {count} item{count !== 1 ? 's' : ''}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
        </div>
      </button>

      {/* Content */}
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="bg-white p-4">
          {children}
        </div>
      </div>
    </div>
  );
};

// Convenience wrapper for grouping orders by priority
export const OrderCategoryGroup: React.FC<{
  orders: Array<{ priority: 'STAT' | 'URGENT' | 'ROUTINE'; items: React.ReactNode[] }>;
  renderItem: (item: any, index: number) => React.ReactNode;
  emptyMessage?: string;
  className?: string;
}> = ({ orders, renderItem, emptyMessage = 'No orders in this category', className = '' }) => {
  const statOrders = orders.find(o => o.priority === 'STAT');
  const urgentOrders = orders.find(o => o.priority === 'URGENT');
  const routineOrders = orders.find(o => o.priority === 'ROUTINE');

  return (
    <div className={`space-y-4 ${className}`}>
      {statOrders && statOrders.items.length > 0 && (
        <CollapsibleOrderCategory
          title="STAT Orders"
          priority="STAT"
          count={statOrders.items.length}
          badge="Immediate"
        >
          <div className="space-y-2">
            {statOrders.items.map((item, idx) => renderItem(item, idx))}
          </div>
        </CollapsibleOrderCategory>
      )}

      {urgentOrders && urgentOrders.items.length > 0 && (
        <CollapsibleOrderCategory
          title="Urgent Orders"
          priority="URGENT"
          count={urgentOrders.items.length}
          badge="Today"
        >
          <div className="space-y-2">
            {urgentOrders.items.map((item, idx) => renderItem(item, idx))}
          </div>
        </CollapsibleOrderCategory>
      )}

      {routineOrders && routineOrders.items.length > 0 && (
        <CollapsibleOrderCategory
          title="Routine Orders"
          priority="ROUTINE"
          count={routineOrders.items.length}
        >
          <div className="space-y-2">
            {routineOrders.items.map((item, idx) => renderItem(item, idx))}
          </div>
        </CollapsibleOrderCategory>
      )}

      {(!statOrders || statOrders.items.length === 0) &&
       (!urgentOrders || urgentOrders.items.length === 0) &&
       (!routineOrders || routineOrders.items.length === 0) && (
        <div className="text-center py-8 text-gray-500">
          {emptyMessage}
        </div>
      )}
    </div>
  );
};

export default CollapsibleOrderCategory;
