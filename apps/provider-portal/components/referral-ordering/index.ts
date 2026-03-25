// ============================================================
// Referral Ordering Components - Barrel Export
// apps/provider-portal/components/referral-ordering/index.ts
// ============================================================

// Main Panel
export { ReferralOrderingPanel } from './ReferralOrderingPanel';
export { default } from './ReferralOrderingPanel';

// Individual Components
export { PatientContextBanner } from './PatientContextBanner';
export { AIRecommendationsPanel } from './AIRecommendationsPanel';
export { CommonReferralsGrid } from './CommonReferralsGrid';
export { CustomReferralForm } from './CustomReferralForm';
export { ReferralCard } from './ReferralCard';
export { ReferralStatusSidebar } from './ReferralStatusSidebar';
export { ReferralPreviewModal } from './ReferralPreviewModal';
export { ProviderSearchModal } from './ProviderSearchModal';

// Types
export type {
  ReferralUrgency,
  ReferralStatus,
  ReferralCategory,
  Specialty,
  Provider,
  AIReferralRecommendation,
  SelectedReferral,
  PatientContext,
  ReferralStatusUpdate,
  ActiveReferral,
  CommonReferralOption,
} from './types';

// Constants
export {
  URGENCY_CONFIG,
  CATEGORY_CONFIG,
  COMMON_REFERRALS,
} from './types';
