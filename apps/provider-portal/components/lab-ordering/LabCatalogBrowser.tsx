// ============================================================
// Lab Catalog Browser Component
// components/lab-ordering/LabCatalogBrowser.tsx
//
// Searchable, filterable lab catalog with category tabs
// ============================================================

import React from 'react';
import { Search, Filter, Grid, List } from 'lucide-react';
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

const categories: { id: LabCategory | 'all'; label: string; color: string }[] = [
  { id: 'all', label: 'All', color: 'gray' },
  { id: 'hematology', label: 'Hematology', color: 'red' },
  { id: 'chemistry', label: 'Chemistry', color: 'blue' },
  { id: 'endocrine', label: 'Endocrine', color: 'purple' },
  { id: 'coagulation', label: 'Coagulation', color: 'orange' },
  { id: 'microbiology', label: 'Microbiology', color: 'green' },
  { id: 'urinalysis', label: 'Urinalysis', color: 'yellow' },
  { id: 'immunology', label: 'Immunology', color: 'pink' },
  { id: 'toxicology', label: 'Toxicology', color: 'slate' },
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
  // Group catalog by category for display
  const catalogByCategory = catalog.reduce((acc, test) => {
    if (!acc[test.category]) acc[test.category] = [];
    acc[test.category].push(test);
    return acc;
  }, {} as Record<string, LabTest[]>);

  const activeCategories = Object.keys(catalogByCategory);

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
              placeholder="Search labs by name, code, or description..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 mt-3">
          {categories.map((cat) => {
            // Only show categories that have tests
            if (cat.id !== 'all' && !activeCategories.includes(cat.id)) return null;
            
            const isActive = categoryFilter === cat.id;
            const count = cat.id === 'all' 
              ? catalog.length 
              : catalogByCategory[cat.id]?.length || 0;

            return (
              <button
                key={cat.id}
                onClick={() => onCategoryChange(cat.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat.label} ({count})
              </button>
            );
          })}
        </div>
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
          <div className="text-center py-8 text-gray-500">
            <Filter className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No tests found</p>
            <p className="text-sm">Try adjusting your search or filters</p>
          </div>
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
