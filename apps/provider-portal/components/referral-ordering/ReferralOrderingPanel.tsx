// Referral Ordering Panel Component
// apps/provider-portal/components/referral-ordering/ReferralOrderingPanel.tsx

import { useState, useEffect } from 'react';
import {
  UserPlus,
  Search,
  Star,
  Clock,
  AlertTriangle,
  CheckCircle,
  Building2,
  Phone,
  MapPin,
  Sparkles,
  ChevronDown,
  ChevronRight,
  X,
  FileText,
  Shield
} from 'lucide-react';
import { useReferralOrderingStore } from '@/store/referralOrderingStore';
import type { Specialty, Provider, PatientContext } from '@/store/referralOrderingStore';

interface ReferralOrderingPanelProps {
  patientContext: PatientContext;
  encounterId: string;
  onOrderComplete?: (referralIds: string[]) => void;
}

export function ReferralOrderingPanel({ 
  patientContext, 
  encounterId,
  onOrderComplete 
}: ReferralOrderingPanelProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [showProviderSearch, setShowProviderSearch] = useState<string | null>(null);
  const [expandedReferral, setExpandedReferral] = useState<string | null>(null);

  const {
    specialtyCatalog,
    selectedReferrals,
    aiRecommendations,
    loadingRecommendations,
    filteredProviders,
    searchQuery,
    submitting,
    error,
    loadAIRecommendations,
    addReferral,
    removeReferral,
    updateReferral,
    setPreferredProvider,
    searchProviders,
    setSearchQuery,
    submitReferrals,
    getSelectedReferralsArray,
    getFilteredCatalog,
    getStatCount,
    getAuthRequiredCount,
  } = useReferralOrderingStore();

  // Load AI recommendations on mount
  useEffect(() => {
    if (patientContext) {
      loadAIRecommendations(patientContext.id, patientContext);
    }
  }, [patientContext]);

  const selectedArray = getSelectedReferralsArray();
  const filteredSpecialties = getFilteredCatalog();
  const statCount = getStatCount();
  const authRequired = getAuthRequiredCount();

  const categories = [
    { id: 'all', label: 'All Specialties' },
    { id: 'medical', label: 'Medical' },
    { id: 'surgical', label: 'Surgical' },
    { id: 'behavioral', label: 'Behavioral' },
    { id: 'therapeutic', label: 'Therapeutic' },
    { id: 'diagnostic', label: 'Diagnostic' },
  ];

  const handleSubmit = async () => {
    try {
      const ids = await submitReferrals(encounterId);
      onOrderComplete?.(ids);
    } catch (err) {
      console.error('Failed to submit referrals:', err);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'STAT': return 'bg-red-100 text-red-700 border-red-300';
      case 'URGENT': return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'ROUTINE': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'ELECTIVE': return 'bg-gray-100 text-gray-700 border-gray-300';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'critical': return 'border-l-red-500 bg-red-50';
      case 'recommended': return 'border-l-blue-500 bg-blue-50';
      case 'consider': return 'border-l-gray-400 bg-gray-50';
      default: return 'border-l-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Specialty Referrals</h2>
          <p className="text-sm text-gray-500">
            {selectedArray.length} referral{selectedArray.length !== 1 ? 's' : ''} selected
            {statCount > 0 && <span className="text-red-600 ml-2">({statCount} STAT)</span>}
            {authRequired > 0 && <span className="text-orange-600 ml-2">({authRequired} need auth)</span>}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search specialties..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-64 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* AI Recommendations */}
      {aiRecommendations.length > 0 && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-200">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h3 className="font-medium text-purple-900">AI Recommended Referrals</h3>
            {loadingRecommendations && (
              <span className="text-sm text-purple-600">Loading...</span>
            )}
          </div>
          
          <div className="space-y-2">
            {aiRecommendations.map(rec => {
              const isSelected = selectedReferrals.has(rec.specialty);
              const specialty = specialtyCatalog.find(s => s.code === rec.specialty);
              
              return (
                <div 
                  key={rec.id}
                  className={`p-3 rounded-lg border-l-4 ${getCategoryColor(rec.category)} ${
                    isSelected ? 'ring-2 ring-purple-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {specialty?.name || rec.specialty}
                        </span>
                        {rec.subspecialty && (
                          <span className="text-xs text-gray-500">
                            ({rec.subspecialty})
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getUrgencyColor(rec.urgency)}`}>
                          {rec.urgency}
                        </span>
                        {rec.redFlagRelated && (
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{rec.rationale}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>Confidence: {Math.round(rec.confidence * 100)}%</span>
                        {rec.suggestedTests.length > 0 && (
                          <span>Suggested: {rec.suggestedTests.join(', ')}</span>
                        )}
                      </div>
                    </div>
                    
                    <button
                      onClick={() => {
                        if (isSelected) {
                          removeReferral(rec.specialty);
                        } else if (specialty) {
                          addReferral(specialty, rec.urgency);
                          updateReferral(rec.specialty, {
                            clinicalQuestion: rec.clinicalQuestion
                          });
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        isSelected
                          ? 'bg-purple-600 text-white'
                          : 'bg-white border border-purple-300 text-purple-700 hover:bg-purple-50'
                      }`}
                    >
                      {isSelected ? 'Added' : 'Add'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              activeCategory === cat.id
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Selected Referrals */}
      {selectedArray.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-medium text-gray-900 mb-3">Selected Referrals ({selectedArray.length})</h3>
          <div className="space-y-3">
            {selectedArray.map(ref => (
              <div 
                key={ref.specialty.code}
                className="border rounded-lg overflow-hidden"
              >
                <div 
                  className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer"
                  onClick={() => setExpandedReferral(
                    expandedReferral === ref.specialty.code ? null : ref.specialty.code
                  )}
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <div>
                      <span className="font-medium">{ref.specialty.name}</span>
                      {ref.preferredProvider && (
                        <span className="text-sm text-gray-500 ml-2">
                          → {ref.preferredProvider.name}
                        </span>
                      )}
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getUrgencyColor(ref.urgency)}`}>
                      {ref.urgency}
                    </span>
                    {ref.priorAuthRequired && (
                      <span className="flex items-center gap-1 text-xs text-orange-600">
                        <Shield className="w-3 h-3" />
                        Auth Required
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {expandedReferral === ref.specialty.code ? (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeReferral(ref.specialty.code);
                      }}
                      className="p-1 text-gray-400 hover:text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {expandedReferral === ref.specialty.code && (
                  <div className="p-4 space-y-4 border-t">
                    {/* Urgency Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Urgency</label>
                      <div className="flex gap-2">
                        {(['STAT', 'URGENT', 'ROUTINE', 'ELECTIVE'] as const).map(urg => (
                          <button
                            key={urg}
                            onClick={() => updateReferral(ref.specialty.code, { urgency: urg })}
                            className={`px-3 py-1.5 rounded text-sm font-medium border transition-colors ${
                              ref.urgency === urg
                                ? getUrgencyColor(urg)
                                : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            {urg}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Clinical Question */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Clinical Question for Specialist
                      </label>
                      <textarea
                        value={ref.clinicalQuestion}
                        onChange={(e) => updateReferral(ref.specialty.code, { 
                          clinicalQuestion: e.target.value 
                        })}
                        placeholder="What specific question would you like the specialist to address?"
                        className="w-full p-3 border rounded-lg text-sm min-h-[80px] focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    {/* Relevant History */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Relevant History Summary
                      </label>
                      <textarea
                        value={ref.relevantHistory}
                        onChange={(e) => updateReferral(ref.specialty.code, { 
                          relevantHistory: e.target.value 
                        })}
                        placeholder="Brief summary of relevant medical history..."
                        className="w-full p-3 border rounded-lg text-sm min-h-[60px] focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    {/* Provider Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Preferred Provider (Optional)
                      </label>
                      {ref.preferredProvider ? (
                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                              <UserPlus className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {ref.preferredProvider.name}, {ref.preferredProvider.credentials}
                              </p>
                              <p className="text-sm text-gray-500">{ref.preferredProvider.organization}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => setShowProviderSearch(ref.specialty.code)}
                            className="text-sm text-purple-600 hover:underline"
                          >
                            Change
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setShowProviderSearch(ref.specialty.code);
                            searchProviders(ref.specialty.code, patientContext.insurancePlan);
                          }}
                          className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-purple-300 hover:text-purple-600 transition-colors"
                        >
                          + Select Preferred Provider
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Specialty Catalog */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b">
          <h3 className="font-medium text-gray-900">
            {activeCategory === 'all' ? 'All Specialties' : `${activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)} Specialties`}
          </h3>
        </div>
        <div className="divide-y max-h-96 overflow-y-auto">
          {filteredSpecialties
            .filter(spec => activeCategory === 'all' || spec.category === activeCategory)
            .map(specialty => {
              const isSelected = selectedReferrals.has(specialty.code);
              const recommendation = aiRecommendations.find(r => r.specialty === specialty.code);
              
              return (
                <div
                  key={specialty.code}
                  className={`p-4 hover:bg-gray-50 transition-colors ${
                    isSelected ? 'bg-purple-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{specialty.name}</span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                          {specialty.code}
                        </span>
                        {specialty.requiresAuth && (
                          <span className="text-xs text-orange-600 flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            Auth
                          </span>
                        )}
                        {recommendation && (
                          <span className="text-xs text-purple-600 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            AI Recommended
                          </span>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-1 mt-2">
                        {specialty.subspecialties.slice(0, 4).map(sub => (
                          <span key={sub} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                            {sub}
                          </span>
                        ))}
                        {specialty.subspecialties.length > 4 && (
                          <span className="text-xs text-gray-400">
                            +{specialty.subspecialties.length - 4} more
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Routine: ~{specialty.averageWaitDays.routine} days
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Urgent: ~{specialty.averageWaitDays.urgent} days
                        </span>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => {
                        if (isSelected) {
                          removeReferral(specialty.code);
                        } else {
                          addReferral(specialty);
                        }
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isSelected
                          ? 'bg-purple-600 text-white'
                          : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {isSelected ? 'Added' : 'Add'}
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Provider Search Modal */}
      {showProviderSearch && (
        <ProviderSearchModal
          specialtyCode={showProviderSearch}
          providers={filteredProviders}
          insurance={patientContext.insurancePlan}
          onSelect={(provider) => {
            setPreferredProvider(showProviderSearch, provider);
            setShowProviderSearch(null);
          }}
          onClose={() => setShowProviderSearch(null)}
          onSearch={(specialty, insurance) => searchProviders(specialty, insurance)}
        />
      )}

      {/* Submit Button */}
      {selectedArray.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
          <div className="text-sm text-gray-600">
            {selectedArray.length} referral{selectedArray.length !== 1 ? 's' : ''} ready to submit
          </div>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Submitting...' : 'Submit Referrals'}
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}

// Provider Search Modal Component
function ProviderSearchModal({
  specialtyCode,
  providers,
  insurance,
  onSelect,
  onClose,
  onSearch,
}: {
  specialtyCode: string;
  providers: Provider[];
  insurance?: string;
  onSelect: (provider: Provider) => void;
  onClose: () => void;
  onSearch: (specialty: string, insurance?: string) => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    onSearch(specialtyCode, insurance);
  }, [specialtyCode]);

  const filtered = providers.filter(p =>
    !searchTerm ||
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.organization.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold text-lg">Select Provider</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search providers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border rounded-lg"
            />
          </div>
        </div>
        
        <div className="overflow-y-auto max-h-96">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No providers found
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map(provider => (
                <div
                  key={provider.id}
                  className="p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => onSelect(provider)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                        <UserPlus className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{provider.name}, {provider.credentials}</span>
                          {provider.preferred && (
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          )}
                          {provider.rating && (
                            <span className="text-sm text-gray-500">★ {provider.rating}</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{provider.subspecialty || provider.specialty}</p>
                        <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                          <Building2 className="w-3 h-3" />
                          {provider.organization}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <MapPin className="w-3 h-3" />
                          {provider.address}
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div className={`${provider.acceptingNew ? 'text-green-600' : 'text-red-600'}`}>
                        {provider.acceptingNew ? 'Accepting New' : 'Not Accepting'}
                      </div>
                      <div className="text-gray-500 mt-1">
                        <div>Routine: {provider.nextAvailable.routine}</div>
                        <div>Urgent: {provider.nextAvailable.urgent}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ReferralOrderingPanel;
