// ============================================================
// Imaging Catalog Browser Component (Refactored)
// components/imaging-ordering/ImagingCatalogBrowser.tsx
//
// Searchable, filterable imaging study catalog using shared primitives
// ============================================================

import React from 'react';
import { Filter, Monitor, Waves, Radio, Heart, Zap, Shield } from 'lucide-react';
import { SearchInput, FilterTabs, EmptyState, type FilterTab } from '@attending/ui-primitives';
import { ImagingStudyCard } from './ImagingStudyCard';
import type { 
  ImagingStudy, 
  ImagingModality, 
  ImagingPriority, 
  SelectedStudy 
} from '../../store/imagingOrderingStore';

interface ImagingCatalogBrowserProps {
  catalog: ImagingStudy[];
  selectedStudies: Map<string, SelectedStudy>;
  searchQuery: string;
  modalityFilter: ImagingModality | 'all';
  showCosts?: boolean;
  onSearchChange: (query: string) => void;
  onModalityChange: (modality: ImagingModality | 'all') => void;
  onToggleStudy: (code: string) => void;
  onPriorityChange: (code: string, priority: ImagingPriority) => void;
  onContrastChange: (code: string, contrast: boolean) => void;
}

// Modality icons for filter tabs
const modalityIcons: Record<ImagingModality, React.ReactNode> = {
  CT: <Monitor className="w-4 h-4" />,
  MRI: <Waves className="w-4 h-4" />,
  XRAY: <Radio className="w-4 h-4" />,
  US: <Heart className="w-4 h-4" />,
  NM: <Zap className="w-4 h-4" />,
  FLUORO: <Monitor className="w-4 h-4" />,
  MAMMO: <Shield className="w-4 h-4" />,
  DEXA: <Shield className="w-4 h-4" />,
};

// Base modality configuration
const MODALITY_TABS: FilterTab<ImagingModality | 'all'>[] = [
  { id: 'all', label: 'All' },
  { id: 'CT', label: 'CT', icon: modalityIcons.CT },
  { id: 'MRI', label: 'MRI', icon: modalityIcons.MRI },
  { id: 'XRAY', label: 'X-Ray', icon: modalityIcons.XRAY },
  { id: 'US', label: 'Ultrasound', icon: modalityIcons.US },
  { id: 'NM', label: 'Nuclear Med', icon: modalityIcons.NM },
  { id: 'MAMMO', label: 'Mammography', icon: modalityIcons.MAMMO },
  { id: 'DEXA', label: 'DEXA', icon: modalityIcons.DEXA },
];

export const ImagingCatalogBrowser: React.FC<ImagingCatalogBrowserProps> = ({
  catalog,
  selectedStudies,
  searchQuery,
  modalityFilter,
  showCosts = true,
  onSearchChange,
  onModalityChange,
  onToggleStudy,
  onPriorityChange,
  onContrastChange,
}) => {
  // Group catalog by modality for counts
  const catalogByModality = catalog.reduce((acc, study) => {
    if (!acc[study.modality]) acc[study.modality] = [];
    acc[study.modality].push(study);
    return acc;
  }, {} as Record<string, ImagingStudy[]>);

  // Build tabs with counts, filtering out empty modalities
  const tabsWithCounts: FilterTab<ImagingModality | 'all'>[] = MODALITY_TABS
    .filter(tab => tab.id === 'all' || catalogByModality[tab.id]?.length > 0)
    .map(tab => ({
      ...tab,
      count: tab.id === 'all' ? catalog.length : catalogByModality[tab.id]?.length || 0,
    }));

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Search & Filter Header */}
      <div className="p-4 border-b bg-gray-50">
        <SearchInput
          value={searchQuery}
          onChange={onSearchChange}
          placeholder="Search studies by name, body part, or description..."
          className="mb-3"
        />

        <FilterTabs
          tabs={tabsWithCounts}
          activeTab={modalityFilter}
          onTabChange={onModalityChange}
        />
      </div>

      {/* Results Count */}
      <div className="px-4 py-2 border-b bg-gray-50 text-sm text-gray-600">
        Showing {catalog.length} {catalog.length === 1 ? 'study' : 'studies'}
        {searchQuery && <span className="ml-1">matching "{searchQuery}"</span>}
        {modalityFilter !== 'all' && <span className="ml-1">in {modalityFilter}</span>}
      </div>

      {/* Study List */}
      <div className="p-4 max-h-[600px] overflow-y-auto space-y-3">
        {catalog.length === 0 ? (
          <EmptyState
            icon={Filter}
            title="No studies found"
            subtitle="Try adjusting your search or filters"
          />
        ) : (
          catalog.map((study) => {
            const selectedStudy = selectedStudies.get(study.code);
            return (
              <ImagingStudyCard
                key={study.code}
                study={study}
                selected={!!selectedStudy}
                selectedStudy={selectedStudy}
                showCosts={showCosts}
                onToggle={onToggleStudy}
                onPriorityChange={onPriorityChange}
                onContrastChange={onContrastChange}
              />
            );
          })
        )}
      </div>
    </div>
  );
};

export default ImagingCatalogBrowser;
