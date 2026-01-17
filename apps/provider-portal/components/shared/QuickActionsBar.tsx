// QuickActionsBar.tsx
// Cross-page navigation component matching HTML prototype functionality
// apps/provider-portal/components/shared/QuickActionsBar.tsx

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  ArrowLeft,
  TestTube,
  Pill,
  FileImage,
  Users,
  Calendar,
  Activity,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  Inbox,
} from 'lucide-react';

export interface QuickActionsBarProps {
  currentPage?: 'dashboard' | 'labs' | 'imaging' | 'medications' | 'referrals' | 'treatment' | 'diagnosis' | 'inbox' | 'assessments';
  patientId?: string;
  encounterId?: string;
  showBackButton?: boolean;
  backButtonLabel?: string;
  backButtonHref?: string;
  showEmergencyButton?: boolean;
  onEmergencyProtocol?: () => void;
  onCollapseAll?: () => void;
  onExpandAll?: () => void;
  allCollapsed?: boolean;
  className?: string;
}

interface QuickActionItem {
  id: string;
  label: string;
  icon: React.ElementType;
  href: string;
  emoji: string;
  dataAction: string;
}

// All links verified to match actual pages in /pages directory
const quickActions: QuickActionItem[] = [
  { id: 'labs', label: 'Order Labs', icon: TestTube, href: '/labs', emoji: '🧪', dataAction: 'order-labs' },
  { id: 'medications', label: 'E-Prescribe', icon: Pill, href: '/medications', emoji: '💊', dataAction: 'prescribe' },
  { id: 'imaging', label: 'Order Imaging', icon: FileImage, href: '/imaging', emoji: '🔍', dataAction: 'imaging' },
  { id: 'referrals', label: 'Refer', icon: Users, href: '/referrals', emoji: '👥', dataAction: 'referral' },
  { id: 'treatment', label: 'Treatment Plan', icon: Calendar, href: '/treatment-plans', emoji: '📅', dataAction: 'treatment' },
  { id: 'inbox', label: 'Inbox', icon: Inbox, href: '/inbox', emoji: '📥', dataAction: 'inbox' },
  { id: 'assessments', label: 'Assessments', icon: Activity, href: '/assessments', emoji: '📋', dataAction: 'assessments' },
];

const QuickActionsBar: React.FC<QuickActionsBarProps> = ({
  currentPage,
  patientId,
  encounterId,
  showBackButton = true,
  backButtonLabel = 'Back to Assessments',
  backButtonHref = '/assessments',
  showEmergencyButton = false,
  onEmergencyProtocol,
  onCollapseAll,
  onExpandAll,
  allCollapsed = false,
  className = '',
}) => {
  const router = useRouter();

  // Build href with patient/encounter context
  const buildHref = (baseHref: string) => {
    const params = new URLSearchParams();
    if (patientId) params.set('patientId', patientId);
    if (encounterId) params.set('encounterId', encounterId);
    const queryString = params.toString();
    return queryString ? `${baseHref}?${queryString}` : baseHref;
  };

  // Handle back navigation
  const handleBack = () => {
    if (backButtonHref) {
      router.push(buildHref(backButtonHref));
    } else {
      router.back();
    }
  };

  // Filter out current page from quick actions
  // Also limit to most relevant actions (not all 7)
  const relevantActions = quickActions
    .filter(action => action.id !== currentPage)
    .slice(0, 5); // Show max 5 quick actions

  return (
    <div className={`quick-actions-bar ${className}`}>
      {/* Back Button - HTML prototype style */}
      {showBackButton && (
        <button
          onClick={handleBack}
          className="quick-action quick-action--back"
          data-action="back"
        >
          <ArrowLeft className="w-4 h-4" />
          {backButtonLabel}
        </button>
      )}

      {/* Quick Action Buttons - HTML prototype style with emojis */}
      {relevantActions.map((action) => (
        <Link
          key={action.id}
          href={buildHref(action.href)}
          className="quick-action"
          data-action={action.dataAction}
        >
          <span className="text-base">{action.emoji}</span>
          <span>{action.label}</span>
        </Link>
      ))}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Collapse/Expand Toggle */}
      {(onCollapseAll || onExpandAll) && (
        <button
          onClick={allCollapsed ? onExpandAll : onCollapseAll}
          className="quick-action"
          data-action="toggle"
        >
          {allCollapsed ? (
            <>
              <ChevronDown className="w-4 h-4" />
              <span>Expand All</span>
            </>
          ) : (
            <>
              <ChevronUp className="w-4 h-4" />
              <span>Collapse All</span>
            </>
          )}
        </button>
      )}

      {/* Emergency Protocol Button - HTML prototype style */}
      {showEmergencyButton && (
        <button
          onClick={onEmergencyProtocol}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg
                     bg-gradient-to-r from-red-500 to-red-600 text-white
                     font-semibold text-sm hover:shadow-lg hover:-translate-y-0.5
                     transition-all duration-200 animate-pulse-urgent whitespace-nowrap"
          data-action="emergency"
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Emergency Protocol</span>
        </button>
      )}
    </div>
  );
};

export default QuickActionsBar;
