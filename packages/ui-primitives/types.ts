// ============================================================
// ATTENDING AI — Shared UI Types
// packages/ui-primitives/types.ts
// ============================================================

export type OrderPriority = 'stat' | 'urgent' | 'asap' | 'routine';
export type RecommendationCategory = 'strongly_recommended' | 'recommended' | 'consider' | 'optional';
export type UrgencyLevel = 'emergency' | 'high' | 'moderate' | 'standard';
export type ModuleType = 'labs' | 'imaging' | 'medications' | 'referrals' | 'procedures';
export type FindingStatus = 'active' | 'resolved' | 'pending' | 'ruled_out';
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'teal' | 'coral' | 'gold';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';
export type StatusValue = 'active' | 'inactive' | 'pending';

export interface FilterTab {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}
