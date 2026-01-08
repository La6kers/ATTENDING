// ============================================================
// Imaging Catalog Browser Component
// components/imaging-ordering/ImagingCatalogBrowser.tsx
//
// Searchable, filterable imaging study catalog with modality tabs
// ============================================================

import React from 'react';
import { Search, Filter, Monitor, Waves, Radio, Heart, Zap, Shield } from 'lucide-react';
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

const modalities: { id: ImagingModality | 'all'; label: string; color: string }[] = [
  { id: 'all', label: 'All', color: 'gray' },
  { id: 'CT', label: 'CT', color: 'blue' },
  { id: 'MRI', label: 'MRI', color: 'purple' },
  { id: 'XRAY', label: 'X-Ray', color: 'gray' },
  { id: 'US', label: 'Ultrasound', color: 'teal' },
  { id: 'NM', label: 'Nuclear Med', color: 'yellow' },
  { id: 'MAMMO', label: 'Mammography', color: 'pink' },
  { id: 'DEXA', label: 'DEXA', color: 'green' },
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

  // Get total count per modality for tabs
  const getModalityCount = (modality: ImagingModality | 'all'): number => {
    if (modality === 'all') return catalog.length;
    return catalogByModality[modality]?.length || 0;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Search & Filter Header */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search studies by name, body part, or description..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Modality Tabs */}
        <div className="flex flex-wrap gap-2 mt-3">
          {modalities.map((mod) => {
            const count = getModalityCount(mod.id);
            // Hide modalities with no studies (except 'all')
            if (mod.id !== 'all' && count === 0) return null;
            
            const isActive = modalityFilter === mod.id;

            return (
              <button
                key={mod.id}
                onClick={() => onModalityChange(mod.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {mod.id !== 'all' && modalityIcons[mod.id as ImagingModality]}
                {mod.label} ({count})
              </button>
            );
          })}
        </div>
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
          <div className="text-center py-8 text-gray-500">
            <Filter className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No studies found</p>
            <p className="text-sm">Try adjusting your search or filters</p>
          </div>
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
