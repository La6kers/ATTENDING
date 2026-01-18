// =============================================================================
// ATTENDING AI - Clinical Workspace Layout
// apps/provider-portal/components/layout/ClinicalWorkspaceLayout.tsx
//
// Wrapper layout for clinical pages with patient context
// =============================================================================

import React from 'react';
import { useRouter } from 'next/router';
import PatientContextBar, { type PatientContextData } from './PatientContextBar';

interface ClinicalWorkspaceLayoutProps {
  patient: PatientContextData;
  activeSection?: string;
  onSectionChange?: (section: string) => void;
  children: React.ReactNode;
}

const ClinicalWorkspaceLayout: React.FC<ClinicalWorkspaceLayoutProps> = ({
  patient,
  activeSection: _activeSection,
  onSectionChange: _onSectionChange,
  children,
}) => {
  const router = useRouter();

  const handleBack = () => {
    router.push('/dashboard');
  };

  const handleViewAssessment = () => {
    if (patient.assessmentId) {
      router.push(`/assessments/${patient.assessmentId}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Patient Context Bar */}
      <PatientContextBar
        patient={patient}
        onBack={handleBack}
        onViewAssessment={handleViewAssessment}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  );
};

export default ClinicalWorkspaceLayout;
