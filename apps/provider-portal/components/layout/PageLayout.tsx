// PageLayout.tsx
// Standardized page layout wrapper combining all common elements
// apps/provider-portal/components/layout/PageLayout.tsx

import type { ReactNode } from 'react';
import React from 'react';
import type { LucideIcon } from 'lucide-react';
import PageHeader, { ModeToggle, FilterToggle } from '../shared/PageHeader';
import type { PatientInfo, ContextType } from '../shared/ContextBanner';
import ContextBanner from '../shared/ContextBanner';
import QuickActionsBar from '../shared/QuickActionsBar';
import { SimpleCriticalAlert } from '../shared';

// ============================================================================
// Types
// ============================================================================

export interface PageLayoutProps {
  // Header Props
  /** Page title */
  title: string;
  /** Page subtitle/description */
  subtitle?: string;
  /** Header icon */
  icon?: LucideIcon;
  /** Icon color */
  iconColor?: 'purple' | 'blue' | 'green' | 'indigo' | 'amber' | 'red' | 'teal';
  /** Header right-side content */
  headerActions?: ReactNode;

  // Context Banner Props
  /** Selected patient (null for "All Items" view) */
  patient?: PatientInfo | null;
  /** Context type for banner */
  contextType?: ContextType;
  /** Item count when no patient selected */
  itemCount?: number;
  /** Show safety info in banner */
  showSafetyInfo?: boolean;
  /** Custom "All Items" title */
  allItemsTitle?: string;
  /** Callback when Select Patient clicked */
  onSelectPatient?: () => void;
  /** Hide the context banner entirely */
  hideContextBanner?: boolean;

  // Quick Actions Props
  /** Current page for quick actions highlighting */
  currentPage?: 'dashboard' | 'labs' | 'imaging' | 'medications' | 'referrals' | 'treatment' | 'diagnosis';
  /** Show quick actions bar */
  showQuickActions?: boolean;
  /** Back button label */
  backButtonLabel?: string;
  /** Back button href */
  backButtonHref?: string;
  /** Show emergency protocol button */
  showEmergencyButton?: boolean;
  /** Emergency protocol callback */
  onEmergencyProtocol?: () => void;

  // Alert Props
  /** Show critical alert banner */
  showCriticalAlert?: boolean;
  /** Alert title */
  alertTitle?: string;
  /** Alert message */
  alertMessage?: string;
  /** Alert action label */
  alertActionLabel?: string;
  /** Alert action callback */
  onAlertAction?: () => void;
  /** Alert dismiss callback */
  onAlertDismiss?: () => void;

  // Content Props
  /** Main content */
  children: ReactNode;
  /** Max width constraint */
  maxWidth?: 'default' | 'wide' | 'full';
  /** Additional content class */
  contentClassName?: string;
  /** Overall className */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * PageLayout - Comprehensive page wrapper with standardized structure
 * 
 * Combines:
 * - PageHeader (title, icon, actions)
 * - ContextBanner (patient info or "All Items")
 * - QuickActionsBar (cross-page navigation)
 * - CriticalAlert (optional alert banner)
 * - Content area
 * 
 * @example
 * ```tsx
 * <PageLayout
 *   title="Laboratory Orders"
 *   subtitle="AI-Guided Diagnostic Workup"
 *   icon={TestTube}
 *   iconColor="green"
 *   patient={selectedPatient}
 *   contextType="labs"
 *   currentPage="labs"
 *   showQuickActions
 *   headerActions={
 *     <ModeToggle
 *       options={[
 *         { value: 'order', label: 'Order Labs' },
 *         { value: 'results', label: 'View Results' },
 *       ]}
 *       value={viewMode}
 *       onChange={setViewMode}
 *     />
 *   }
 * >
 *   <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 *     {content}
 *   </div>
 * </PageLayout>
 * ```
 */
const PageLayout: React.FC<PageLayoutProps> = ({
  // Header
  title,
  subtitle,
  icon,
  iconColor = 'purple',
  headerActions,

  // Context Banner
  patient = null,
  contextType = 'patients',
  itemCount,
  showSafetyInfo = false,
  allItemsTitle,
  onSelectPatient,
  hideContextBanner = false,

  // Quick Actions
  currentPage,
  showQuickActions = true,
  backButtonLabel = 'Back to Assessments',
  backButtonHref = '/assessments',
  showEmergencyButton,
  onEmergencyProtocol,

  // Alert
  showCriticalAlert = false,
  alertTitle,
  alertMessage,
  alertActionLabel,
  onAlertAction,
  onAlertDismiss,

  // Content
  children,
  maxWidth = 'default',
  contentClassName = '',
  className = '',
}) => {
  const maxWidthClasses = {
    default: 'max-w-7xl',
    wide: 'max-w-[1600px]',
    full: 'max-w-full',
  };

  // Auto-detect emergency button based on patient red flags
  const shouldShowEmergency = showEmergencyButton ?? 
    (patient?.redFlags && patient.redFlags.length > 0);

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* Page Header */}
      <PageHeader
        title={title}
        subtitle={subtitle}
        icon={icon}
        iconColor={iconColor}
      >
        {headerActions}
      </PageHeader>

      {/* Main Content Area */}
      <div className={`${maxWidthClasses[maxWidth]} mx-auto px-4 sm:px-6 lg:px-8 py-6`}>
        {/* Quick Actions Bar */}
        {showQuickActions && (
          <QuickActionsBar
            currentPage={currentPage}
            patientId={patient?.id}
            showBackButton={true}
            backButtonLabel={backButtonLabel}
            backButtonHref={backButtonHref}
            showEmergencyButton={shouldShowEmergency}
            onEmergencyProtocol={onEmergencyProtocol}
          />
        )}

        {/* Critical Alert Banner */}
        {showCriticalAlert && alertTitle && alertMessage && (
          <SimpleCriticalAlert
            title={alertTitle}
            message={alertMessage}
            actionLabel={alertActionLabel}
            onAction={onAlertAction}
            onDismiss={onAlertDismiss}
            className="mb-4"
          />
        )}

        {/* Context Banner */}
        {!hideContextBanner && (
          <ContextBanner
            patient={patient}
            contextType={contextType}
            itemCount={itemCount}
            allItemsTitle={allItemsTitle}
            showRedFlags={true}
            showSafetyInfo={showSafetyInfo}
            showActions={!!patient}
            onSelectPatient={onSelectPatient}
            accentColor={iconColor}
            className="mb-6"
          />
        )}

        {/* Main Content */}
        <div className={contentClassName}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default PageLayout;

// Re-export helpers
export { ModeToggle, FilterToggle };
