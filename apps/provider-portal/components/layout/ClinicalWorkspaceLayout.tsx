// ============================================================
// ATTENDING AI — Clinical Workspace Layout
// apps/provider-portal/components/layout/ClinicalWorkspaceLayout.tsx
//
// Provides the clinical workspace shell used by:
// - /clinical (unified workspace)
// - /encounter/[id] (patient encounter)
// - /visit/[id] (visit flow)
// - /previsit/[id] (pre-visit intelligence)
// - And other clinical workflow pages
//
// Structure:
//   [Patient Context Bar]
//   [Gradient background workspace area]
//     [children — tabs, content, etc.]
// ============================================================

import React from 'react';
import PatientContextBar, { type PatientContextData } from './PatientContextBar';

export interface ClinicalWorkspaceLayoutProps {
  patient: PatientContextData;
  activeSection?: string;
  onSectionChange?: (section: string) => void;
  children: React.ReactNode;
  /** Show the patient context bar (default true) */
  showPatientBar?: boolean;
  /** Additional class for the content area */
  className?: string;
}

const ClinicalWorkspaceLayout: React.FC<ClinicalWorkspaceLayoutProps> = ({
  patient,
  activeSection,
  onSectionChange,
  children,
  showPatientBar = true,
  className,
}) => {
  return (
    <div className="flex flex-col min-h-[calc(100vh-112px)]">
      {/* Patient Context Bar */}
      {showPatientBar && (
        <PatientContextBar patient={patient} />
      )}

      {/* Main Workspace Area */}
      <div
        className="flex-1"
        style={{
          background: 'linear-gradient(180deg, #0C3547 0%, #1A8FA8 30%, #f0fdf9 100%)',
        }}
      >
        <div className={`max-w-[1200px] mx-auto px-6 py-6 ${className || ''}`}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default ClinicalWorkspaceLayout;
export { ClinicalWorkspaceLayout };
