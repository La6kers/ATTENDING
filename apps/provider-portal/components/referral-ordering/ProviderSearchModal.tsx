// ============================================================
// Provider Search Modal Component
// apps/provider-portal/components/referral-ordering/ProviderSearchModal.tsx
// ============================================================

import { useState, useEffect, useRef } from 'react';
import {
  X,
  Search,
  UserPlus,
  Star,
  Building2,
  MapPin,
  Phone,
  Clock,
  CheckCircle,
  XCircle,
  Filter,
} from 'lucide-react';
import type { Provider } from './types';

interface ProviderSearchModalProps {
  isOpen: boolean;
  specialtyCode: string;
  specialtyName: string;
  providers: Provider[];
  insurance?: string;
  onSelect: (provider: Provider) => void;
  onClose: () => void;
  onSearch: (specialty: string, insurance?: string) => void;
}

export function ProviderSearchModal({
  isOpen,
  specialtyCode,
  specialtyName,
  providers,
  insurance,
  onSelect,
  onClose,
  onSearch,
}: ProviderSearchModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAcceptingNew, setFilterAcceptingNew] = useState(false);
  const [filterInNetwork, setFilterInNetwork] = useState(true);
  const [sortBy, setSortBy] = useState<'rating' | 'availability' | 'name'>('rating');

  // Use ref to avoid stale closure and prevent unnecessary re-renders
  const onSearchRef = useRef(onSearch);
  onSearchRef.current = onSearch;

  useEffect(() => {
    if (isOpen) {
      onSearchRef.current(specialtyCode, insurance);
    }
  }, [isOpen, specialtyCode, insurance]);

  if (!isOpen) return null;

  // Filter and sort providers
  let filtered = providers.filter(p => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (!p.name.toLowerCase().includes(term) && 
          !p.organization.toLowerCase().includes(term) &&
          !(p.subspecialty?.toLowerCase().includes(term))) {
        return false;
      }
    }
    if (filterAcceptingNew && !p.acceptingNew) return false;
    if (filterInNetwork && insurance && !p.insurancesAccepted.includes(insurance)) return false;
    return true;
  });

  // Sort providers
  filtered = filtered.sort((a, b) => {
    if (sortBy === 'rating') {
      return (b.rating || 0) - (a.rating || 0);
    }
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name);
    }
    // By availability - just use a simple heuristic
    return 0;
  });

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="provider-search-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h2 id="provider-search-title" className="text-lg font-semibold text-gray-900">
              Select Provider
            </h2>
            <p className="text-sm text-gray-500">
              {specialtyName} specialists {insurance && `• In-network for ${insurance}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Search and Filters */}
        <div className="p-4 border-b border-gray-200 space-y-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, organization, or subspecialty..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Filter Row */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterAcceptingNew}
                  onChange={(e) => setFilterAcceptingNew(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                />
                <span className="text-gray-700">Accepting new patients</span>
              </label>
              
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterInNetwork}
                  onChange={(e) => setFilterInNetwork(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                />
                <span className="text-gray-700">In-network only</span>
              </label>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-purple-500"
              >
                <option value="rating">Rating</option>
                <option value="availability">Availability</option>
                <option value="name">Name</option>
              </select>
            </div>
          </div>
        </div>

        {/* Provider List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <UserPlus className="w-12 h-12 mb-3 text-gray-300" />
              <p className="font-medium">No providers found</p>
              <p className="text-sm mt-1">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filtered.map(provider => (
                <div
                  key={provider.id}
                  className="p-4 hover:bg-purple-50 cursor-pointer transition-colors"
                  onClick={() => onSelect(provider)}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Provider Info */}
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <UserPlus className="w-6 h-6 text-purple-600" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900">
                            {provider.name}, {provider.credentials}
                          </span>
                          {provider.preferred && (
                            <span className="flex items-center gap-1 text-xs text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full">
                              <Star className="w-3 h-3 fill-yellow-500" />
                              Preferred
                            </span>
                          )}
                          {provider.rating && (
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                              {provider.rating}
                            </span>
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-600 mt-0.5">
                          {provider.subspecialty || provider.specialty}
                        </p>
                        
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {provider.organization}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {provider.address}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {provider.phone}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status & Availability */}
                    <div className="text-right flex-shrink-0">
                      <div className={`flex items-center gap-1 text-sm ${
                        provider.acceptingNew ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {provider.acceptingNew ? (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            Accepting New
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4" />
                            Not Accepting
                          </>
                        )}
                      </div>
                      
                      <div className="mt-2 text-xs text-gray-500 space-y-0.5">
                        <div className="flex items-center justify-end gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Routine: {provider.nextAvailable.routine}</span>
                        </div>
                        <div className="flex items-center justify-end gap-1">
                          <Clock className="w-3 h-3 text-orange-500" />
                          <span>Urgent: {provider.nextAvailable.urgent}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">
              {filtered.length} provider{filtered.length !== 1 ? 's' : ''} found
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProviderSearchModal;
