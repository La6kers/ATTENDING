// ============================================================
// Lab Catalog Browser Component (Refactored)
// components/lab-ordering/LabCatalogBrowser.tsx
//
// Searchable, filterable lab catalog using shared UI primitives
// ============================================================

import React from 'react';
import { Filter } from 'lucide-react';
import { SearchInput, FilterTabs, EmptyState, type FilterTab } from '@attending/ui-primitives';
import { LabTestCard } from './LabTestCard';
import type { LabTest, LabCategory, LabPriority, SelectedLab } from '../../store/labOrderingStore';

interface LabCatalogBrowserProps {
  catalog: LabTest[];
  selectedLabs: Map<string, SelectedLab>;
  searchQuery: string;
  categoryFilter: LabCategory | 'all';
  showCosts?: boolean;
  onSearchChange: (query: string) => void;
  onCategoryChange: (category: LabCategory | 'all') => void;
  onToggleLab: (code: string) => void;
  onPriorityChange: (code: string, priority: LabPriority) => void;
}

// Category configuration for filter tabs
const LAB_CATEGORY_TABS: FilterTab<LabCategory | 'all'>[] = [
  { id: 'all', label: 'All' },
  { id: 'hematology', label: 'Hematology' },
  { id: 'chemistry', label: 'Chemistry' },
  { id: 'endocrine', label: 'Endocrine' },
  { id: 'coagulation', label: 'Coagulation' },
  { id: 'microbiology', label: 'Microbiology' },
  { id: 'urinalysis', label: 'Urinalysis' },
  { id: 'immunology', label: 'Immunology' },
  { id: 'toxicology', label: 'Toxicology' },
];

export const LabCatalogBrowser: React.FC<LabCatalogBrowserProps> = ({
  catalog,
  selectedLabs,
  searchQuery,
  categoryFilter,
  showCosts = true,
  onSearchChange,
  onCategoryChange,
  onToggleLab,
  onPriorityChange,
}) => {
  // Group catalog by category for counts
  const catalogByCategory = catalog.reduce((acc, test) => {
    if (!acc[test.category]) acc[test.category] = [];
    acc[test.category].push(test);
    return acc;
  }, {} as Record<string, LabTest[]>);

  // Build tabs with counts, filtering out empty categories
  const tabsWithCounts: FilterTab<LabCategory | 'all'>[] = LAB_CATEGORY_TABS
    .filter(tab => tab.id === 'all' || catalogByCategory[tab.id]?.length > 0)
    .map(tab => ({
      ...tab,
      count: tab.id === 'all' ? catalog.length : catalogByCategory[tab.id]?.length || 0,
    }));

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Search & Filter Header */}
      <div className="p-4 border-b bg-gray-50">
        <SearchInput
          value={searchQuery}
          onChange={onSearchChange}
          placeholder="Search labs by name, code, or description..."
          className="mb-3"
        />

        <FilterTabs
          tabs={tabsWithCounts}
          activeTab={categoryFilter}
          onTabChange={onCategoryChange}
        />
      </div>

      {/* Results Count */}
      <div className="px-4 py-2 border-b bg-gray-50 text-sm text-gray-600">
        Showing {catalog.length} test{catalog.length !== 1 ? 's' : ''}
        {searchQuery && <span className="ml-1">matching "{searchQuery}"</span>}
        {categoryFilter !== 'all' && <span className="ml-1">in {categoryFilter}</span>}
      </div>

      {/* Lab List */}
      <div className="p-4 max-h-[600px] overflow-y-auto space-y-3">
        {catalog.length === 0 ? (
          <EmptyState
            icon={Filter}
            title="No tests found"
            subtitle="Try adjusting your search or filters"
          />
        ) : (
          catalog.map((test) => {
            const selectedLab = selectedLabs.get(test.code);
            return (
              <LabTestCard
                key={test.code}
                test={test}
                selected={!!selectedLab}
                selectedLab={selectedLab}
                showCosts={showCosts}
                onToggle={onToggleLab}
                onPriorityChange={onPriorityChange}
              />
            );
          })
        )}
      </div>
    </div>
  );
};

export default LabCatalogBrowser;
