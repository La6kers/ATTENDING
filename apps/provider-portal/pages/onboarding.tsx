// ============================================================
// ATTENDING AI - Onboarding Page
// apps/provider-portal/pages/onboarding.tsx
// ============================================================

import React from 'react';
import ProviderShell from '../components/layout/ProviderShell';
import OnboardingWizard from '../components/onboarding/OnboardingWizard';

export default function OnboardingPage() {
  return (
    <ProviderShell contextBadge="Setup" currentPage="" showNav={false}>
      <OnboardingWizard />
    </ProviderShell>
  );
}
