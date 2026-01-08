// ============================================================
// Medication Catalog Browser Component
// components/medication-ordering/MedicationCatalogBrowser.tsx
//
// Searchable, filterable medication catalog with category tabs
// ============================================================

import React from 'react';
import { Search, Filter, Pill, X } from 'lucide-react';
import { MedicationCard } from './MedicationCard';
import type { Medication, DrugCategory, SelectedMedication, PrescriptionPriority } from '../../store/medicationOrderingStore';

interface MedicationCatalogBrowserProps {
  medications: Medication[];
  selectedIds: Set<string>;
  selectedMedications: Map<string, SelectedMedication>;
  searchQuery: string;
  categoryFilter: DrugCategory | 'all';
  onSearchChange: (query: string) => void;
  onCategoryChange: (category: DrugCategory | 'all') => void;
  onToggleMedication: (id: string) => void;
  onPriorityChange: (id: string, priority: PrescriptionPriority) => void;
  onStrengthChange: (id: string, strength: string) => void;
}

const categoryLabels: Record<DrugCategory | 'all', string> = {
  all: 'All',
  analgesic: 'Pain Relief',
  antibiotic: 'Antibiotics',
  antihypertensive: 'Blood Pressure',
  antidiabetic: 'Diabetes',
  anticoagulant: 'Blood Thinners',
  antidepressant: 'Antidepressants',
  anxiolytic: 'Anti-Anxiety',
  anticonvulsant: 'Anticonvulsants',
  antihistamine: 'Antihistamines',
  antacid: 'Antacids',
  bronchodilator: 'Respiratory',
  corticosteroid: 'Steroids',
  diuretic: 'Diuretics',
  'lipid-lowering': 'Cholesterol',
  migraine: 'Migraine',
  'muscle-relaxant': 'Muscle Relaxants',
  nsaid: 'NSAIDs',
  opioid: 'Opioids',
  'proton-pump-inhibitor': 'PPIs',
  thyroid: 'Thyroid',
  vitamin: 'Vitamins',
  other: 'Other',
};

const popularCategories: (DrugCategory | 'all')[] = [
  'all', 'antibiotic', 'analgesic', 'antihypertensive', 'antidepressant', 
  'migraine', 'bronchodilator', 'lipid-lowering', 'antidiabetic'
];

export const MedicationCatalogBrowser: React.FC<MedicationCatalogBrowserProps> = ({
  medications,
  selectedIds,
  selectedMedications,
  searchQuery,
  categoryFilter,
  onSearchChange,
  onCategoryChange,
  onToggleMedication,
  onPriorityChange,
  onStrengthChange,
}) => {
  const [showAllCategories, setShowAllCategories] = React.useState(false);

  const displayCategories = showAllCategories 
    ? Object.keys(categoryLabels) as (DrugCategory | 'all')[]
    : popularCategories;

  // Group medications by category for display
  const groupedMedications = medications.reduce((acc, med) => {
    if (!acc[med.category]) acc[med.category] = [];
    acc[med.category].push(med);
    return acc;
  }, {} as Record<string, Medication[]>);

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Search Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Pill className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">Medication Catalog</h3>
            <p className="text-sm text-gray-500">
              {medications.length} medications available
            </p>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by name, generic, or indication..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Category Filter */}
        <div className="mt-3">
          <div className="flex items-center gap-2 mb-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">Filter by category:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {displayCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => onCategoryChange(cat)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                  categoryFilter === cat
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {categoryLabels[cat]}
              </button>
            ))}
            <button
              onClick={() => setShowAllCategories(!showAllCategories)}
              className="px-3 py-1 text-xs font-medium rounded-full bg-gray-50 text-gray-500 hover:bg-gray-100"
            >
              {showAllCategories ? 'Show Less' : 'More...'}
            </button>
          </div>
        </div>
      </div>

      {/* Medications List */}
      <div className="p-4 max-h-[600px] overflow-y-auto">
        {medications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Pill className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No medications found</p>
            <p className="text-sm">Try adjusting your search or filters</p>
          </div>
        ) : categoryFilter === 'all' && !searchQuery ? (
          // Show grouped by category when no filter
          <div className="space-y-6">
            {Object.entries(groupedMedications).map(([category, meds]) => (
              <div key={category}>
                <h4 className="text-sm font-semibold text-gray-700 mb-2 capitalize">
                  {categoryLabels[category as DrugCategory] || category.replace('-', ' ')}
                  <span className="ml-2 text-gray-400 font-normal">({meds.length})</span>
                </h4>
                <div className="space-y-2">
                  {meds.slice(0, 3).map((med) => (
                    <MedicationCard
                      key={med.id}
                      medication={med}
                      selected={selectedIds.has(med.id)}
                      selectedMed={selectedMedications.get(med.id)}
                      onToggle={onToggleMedication}
                      onPriorityChange={onPriorityChange}
                      onStrengthChange={onStrengthChange}
                    />
                  ))}
                  {meds.length > 3 && (
                    <button
                      onClick={() => onCategoryChange(category as DrugCategory)}
                      className="w-full py-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      View all {meds.length} {categoryLabels[category as DrugCategory] || category}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Show flat list when filtered
          <div className="space-y-3">
            {medications.map((med) => (
              <MedicationCard
                key={med.id}
                medication={med}
                selected={selectedIds.has(med.id)}
                selectedMed={selectedMedications.get(med.id)}
                onToggle={onToggleMedication}
                onPriorityChange={onPriorityChange}
                onStrengthChange={onStrengthChange}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MedicationCatalogBrowser;
