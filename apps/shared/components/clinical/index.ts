// =============================================================================
// ATTENDING AI - Clinical Components Index
// apps/shared/components/clinical/index.ts
// =============================================================================

// Clinical display components
export * from './ClinicalComponents';

// Quick Actions Bar
export {
  QuickActionsBar,
  createLabOrderActions,
  createImagingOrderActions,
  createMedicationOrderActions,
  type QuickAction,
  type QuickActionsBarProps,
} from './QuickActionsBar';
