// ============================================================
// Lab Ordering Components - Barrel Export
// components/lab-ordering/index.ts
// ============================================================

export { LabTestCard } from './LabTestCard';
export { AIRecommendationsPanel } from './AIRecommendationsPanel';
export { LabOrderSummary } from './LabOrderSummary';
export { LabCatalogBrowser } from './LabCatalogBrowser';
export { LabPanelsSelector } from './LabPanelsSelector';

// Re-export types for convenience
export type {
  LabTest,
  LabPanel,
  LabPriority,
  LabCategory,
  SelectedLab,
  AILabRecommendation,
  PatientContext,
} from '../../store/labOrderingStore';
