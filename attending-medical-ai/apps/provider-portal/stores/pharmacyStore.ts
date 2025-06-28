/**
 * Pharmacy state management using Zustand
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type {
  DetailedPharmacy,
  PharmacySearchCriteria,
  PharmacySearchResult,
  PharmacyTransferRequest,
  PharmacyTransferResponse,
  PharmacyStockAlert,
  PharmacyPreferences,
} from '../types/pharmacy.types';

interface PharmacyState {
  // Core data
  primaryPharmacy: DetailedPharmacy | null;
  alternatePharmacies: DetailedPharmacy[];
  searchResults: PharmacySearchResult | null;
  preferences: PharmacyPreferences | null;
  
  // Transfer management
  activeTransfers: PharmacyTransferResponse[];
  transferHistory: PharmacyTransferResponse[];
  
  // Stock alerts and notifications
  stockAlerts: PharmacyStockAlert[];
  
  // UI state
  isSearchModalOpen: boolean;
  isTransferModalOpen: boolean;
  isPreferencesModalOpen: boolean;
  selectedPharmacyForTransfer: DetailedPharmacy | null;
  showAlternatePharmacies: boolean;
  
  // Search state
  searchCriteria: PharmacySearchCriteria;
  isSearching: boolean;
  searchError: string | null;
  
  // Loading states
  isLoading: boolean;
  isTransferring: boolean;
  error: string | null;
  lastUpdated: Date | null;
  
  // Actions
  setPrimaryPharmacy: (pharmacy: DetailedPharmacy) => void;
  setAlternatePharmacies: (pharmacies: DetailedPharmacy[]) => void;
  addAlternatePharmacy: (pharmacy: DetailedPharmacy) => void;
  removeAlternatePharmacy: (pharmacyId: string) => void;
  
  // Search actions
  setSearchCriteria: (criteria: Partial<PharmacySearchCriteria>) => void;
  clearSearchCriteria: () => void;
  setSearchResults: (results: PharmacySearchResult) => void;
  clearSearchResults: () => void;
  searchPharmacies: (criteria: PharmacySearchCriteria) => Promise<void>;
  
  // Transfer actions
  initiateTransfer: (request: PharmacyTransferRequest) => Promise<PharmacyTransferResponse>;
  updateTransferStatus: (transferId: string, status: PharmacyTransferResponse['status']) => void;
  cancelTransfer: (transferId: string) => Promise<void>;
  
  // Stock management
  addStockAlert: (alert: PharmacyStockAlert) => void;
  removeStockAlert: (alertId: string) => void;
  clearStockAlerts: () => void;
  
  // Preferences
  setPreferences: (preferences: PharmacyPreferences) => void;
  updatePreferences: (updates: Partial<PharmacyPreferences['preferences']>) => void;
  
  // Modal management
  openSearchModal: () => void;
  closeSearchModal: () => void;
  openTransferModal: (pharmacy?: DetailedPharmacy) => void;
  closeTransferModal: () => void;
  openPreferencesModal: () => void;
  closePreferencesModal: () => void;
  
  // UI state management
  setShowAlternatePharmacies: (show: boolean) => void;
  toggleAlternatePharmacies: () => void;
  
  // Loading states
  setLoading: (loading: boolean) => void;
  setSearching: (searching: boolean) => void;
  setTransferring: (transferring: boolean) => void;
  setError: (error: string | null) => void;
  setSearchError: (error: string | null) => void;
  
  // Utility actions
  refresh: () => Promise<void>;
  reset: () => void;
  
  // Computed getters
  getPharmacyById: (id: string) => DetailedPharmacy | undefined;
  getActiveTransfers: () => PharmacyTransferResponse[];
  getCompletedTransfers: () => PharmacyTransferResponse[];
  getUnreadStockAlerts: () => PharmacyStockAlert[];
  getNearbyPharmacies: (maxDistance?: number) => DetailedPharmacy[];
  getInNetworkPharmacies: () => DetailedPharmacy[];
  getPharmaciesWithStock: (medicationId: string) => DetailedPharmacy[];
}

const initialSearchCriteria: PharmacySearchCriteria = {
  sortBy: 'distance',
  sortOrder: 'asc',
  limit: 20,
  offset: 0,
};

export const usePharmacyStore = create<PharmacyState>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial state
        primaryPharmacy: null,
        alternatePharmacies: [],
        searchResults: null,
        preferences: null,
        
        activeTransfers: [],
        transferHistory: [],
        stockAlerts: [],
        
        isSearchModalOpen: false,
        isTransferModalOpen: false,
        isPreferencesModalOpen: false,
        selectedPharmacyForTransfer: null,
        showAlternatePharmacies: false,
        
        searchCriteria: initialSearchCriteria,
        isSearching: false,
        searchError: null,
        
        isLoading: false,
        isTransferring: false,
        error: null,
        lastUpdated: null,
        
        // Core pharmacy actions
        setPrimaryPharmacy: (pharmacy) =>
          set((state) => {
            state.primaryPharmacy = pharmacy;
            state.lastUpdated = new Date();
          }),
        
        setAlternatePharmacies: (pharmacies) =>
          set((state) => {
            state.alternatePharmacies = pharmacies;
            state.lastUpdated = new Date();
          }),
        
        addAlternatePharmacy: (pharmacy) =>
          set((state) => {
            const exists = state.alternatePharmacies.some((p) => p.id === pharmacy.id);
            if (!exists) {
              state.alternatePharmacies.push(pharmacy);
              state.lastUpdated = new Date();
            }
          }),
        
        removeAlternatePharmacy: (pharmacyId) =>
          set((state) => {
            state.alternatePharmacies = state.alternatePharmacies.filter((p) => p.id !== pharmacyId);
            state.lastUpdated = new Date();
          }),
        
        // Search actions
        setSearchCriteria: (criteria) =>
          set((state) => {
            state.searchCriteria = { ...state.searchCriteria, ...criteria };
          }),
        
        clearSearchCriteria: () =>
          set((state) => {
            state.searchCriteria = initialSearchCriteria;
          }),
        
        setSearchResults: (results) =>
          set((state) => {
            state.searchResults = results;
            state.searchError = null;
          }),
        
        clearSearchResults: () =>
          set((state) => {
            state.searchResults = null;
          }),
        
        searchPharmacies: async (criteria) => {
          const { setSearching, setSearchError, setSearchResults } = get();
          try {
            setSearching(true);
            setSearchError(null);
            
            // Simulate API call - replace with actual service
            await new Promise((resolve) => setTimeout(resolve, 1000));
            
            // Mock search results
            const mockResults: PharmacySearchResult = {
              pharmacies: [],
              totalFound: 0,
              searchCriteria: criteria,
              searchRadius: criteria.location?.radius || 5,
            };
            
            setSearchResults(mockResults);
          } catch (error) {
            setSearchError(error instanceof Error ? error.message : 'Search failed');
          } finally {
            setSearching(false);
          }
        },
        
        // Transfer actions
        initiateTransfer: async (request) => {
          const { setTransferring, setError } = get();
          try {
            setTransferring(true);
            setError(null);
            
            // Simulate API call
            await new Promise((resolve) => setTimeout(resolve, 1500));
            
            const transferResponse: PharmacyTransferResponse = {
              transferId: `transfer-${Date.now()}`,
              status: 'pending',
              estimatedCompletionTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
              fromPharmacy: {} as DetailedPharmacy, // Would be populated from API
              toPharmacy: {} as DetailedPharmacy,
              notifications: {
                sms: true,
                email: true,
                call: false,
              },
            };
            
            set((state) => {
              state.activeTransfers.push(transferResponse);
              state.lastUpdated = new Date();
            });
            
            return transferResponse;
          } catch (error) {
            setError(error instanceof Error ? error.message : 'Transfer failed');
            throw error;
          } finally {
            setTransferring(false);
          }
        },
        
        updateTransferStatus: (transferId, status) =>
          set((state) => {
            const transfer = state.activeTransfers.find((t) => t.transferId === transferId);
            if (transfer) {
              transfer.status = status;
              
              // Move to history if completed or cancelled
              if (status === 'completed' || status === 'cancelled' || status === 'denied') {
                transfer.actualCompletionTime = new Date();
                state.transferHistory.push(transfer);
                state.activeTransfers = state.activeTransfers.filter((t) => t.transferId !== transferId);
              }
              
              state.lastUpdated = new Date();
            }
          }),
        
        cancelTransfer: async (transferId) => {
          const { setTransferring, setError } = get();
          try {
            setTransferring(true);
            
            // Simulate API call
            await new Promise((resolve) => setTimeout(resolve, 500));
            
            set((state) => {
              const transfer = state.activeTransfers.find((t) => t.transferId === transferId);
              if (transfer) {
                transfer.status = 'cancelled';
                transfer.actualCompletionTime = new Date();
                state.transferHistory.push(transfer);
                state.activeTransfers = state.activeTransfers.filter((t) => t.transferId !== transferId);
                state.lastUpdated = new Date();
              }
            });
          } catch (error) {
            setError(error instanceof Error ? error.message : 'Cancel transfer failed');
            throw error;
          } finally {
            setTransferring(false);
          }
        },
        
        // Stock management
        addStockAlert: (alert) =>
          set((state) => {
            state.stockAlerts.push(alert);
          }),
        
        removeStockAlert: (alertId) =>
          set((state) => {
            state.stockAlerts = state.stockAlerts.filter((alert) => alert.medicationId !== alertId);
          }),
        
        clearStockAlerts: () =>
          set((state) => {
            state.stockAlerts = [];
          }),
        
        // Preferences
        setPreferences: (preferences) =>
          set((state) => {
            state.preferences = preferences;
            state.lastUpdated = new Date();
          }),
        
        updatePreferences: (updates) =>
          set((state) => {
            if (state.preferences) {
              state.preferences.preferences = { ...state.preferences.preferences, ...updates };
              state.preferences.updatedAt = new Date();
              state.lastUpdated = new Date();
            }
          }),
        
        // Modal management
        openSearchModal: () =>
          set((state) => {
            state.isSearchModalOpen = true;
          }),
        
        closeSearchModal: () =>
          set((state) => {
            state.isSearchModalOpen = false;
          }),
        
        openTransferModal: (pharmacy) =>
          set((state) => {
            state.isTransferModalOpen = true;
            state.selectedPharmacyForTransfer = pharmacy || null;
          }),
        
        closeTransferModal: () =>
          set((state) => {
            state.isTransferModalOpen = false;
            state.selectedPharmacyForTransfer = null;
          }),
        
        openPreferencesModal: () =>
          set((state) => {
            state.isPreferencesModalOpen = true;
          }),
        
        closePreferencesModal: () =>
          set((state) => {
            state.isPreferencesModalOpen = false;
          }),
        
        // UI state management
        setShowAlternatePharmacies: (show) =>
          set((state) => {
            state.showAlternatePharmacies = show;
          }),
        
        toggleAlternatePharmacies: () =>
          set((state) => {
            state.showAlternatePharmacies = !state.showAlternatePharmacies;
          }),
        
        // Loading states
        setLoading: (loading) =>
          set((state) => {
            state.isLoading = loading;
            if (loading) {
              state.error = null;
            }
          }),
        
        setSearching: (searching) =>
          set((state) => {
            state.isSearching = searching;
            if (searching) {
              state.searchError = null;
            }
          }),
        
        setTransferring: (transferring) =>
          set((state) => {
            state.isTransferring = transferring;
          }),
        
        setError: (error) =>
          set((state) => {
            state.error = error;
            state.isLoading = false;
            state.isTransferring = false;
          }),
        
        setSearchError: (error) =>
          set((state) => {
            state.searchError = error;
            state.isSearching = false;
          }),
        
        // Utility actions
        refresh: async () => {
          const { setLoading, setError } = get();
          try {
            setLoading(true);
            // This would typically call pharmacy service APIs
            // await pharmacyService.refreshPharmacies();
          } catch (error) {
            setError(error instanceof Error ? error.message : 'Failed to refresh pharmacies');
          } finally {
            setLoading(false);
          }
        },
        
        reset: () =>
          set((state) => {
            state.primaryPharmacy = null;
            state.alternatePharmacies = [];
            state.searchResults = null;
            state.preferences = null;
            state.activeTransfers = [];
            state.transferHistory = [];
            state.stockAlerts = [];
            state.isSearchModalOpen = false;
            state.isTransferModalOpen = false;
            state.isPreferencesModalOpen = false;
            state.selectedPharmacyForTransfer = null;
            state.showAlternatePharmacies = false;
            state.searchCriteria = initialSearchCriteria;
            state.isSearching = false;
            state.searchError = null;
            state.isLoading = false;
            state.isTransferring = false;
            state.error = null;
            state.lastUpdated = null;
          }),
        
        // Computed getters
        getPharmacyById: (id) => {
          const { primaryPharmacy, alternatePharmacies, searchResults } = get();
          
          if (primaryPharmacy?.id === id) return primaryPharmacy;
          
          const alternate = alternatePharmacies.find((p) => p.id === id);
          if (alternate) return alternate;
          
          const searchResult = searchResults?.pharmacies.find((p) => p.id === id);
          return searchResult;
        },
        
        getActiveTransfers: () => {
          const { activeTransfers } = get();
          return activeTransfers.filter((t) => 
            t.status === 'pending' || t.status === 'approved' || t.status === 'in-progress'
          );
        },
        
        getCompletedTransfers: () => {
          const { transferHistory } = get();
          return transferHistory.filter((t) => t.status === 'completed');
        },
        
        getUnreadStockAlerts: () => {
          const { stockAlerts } = get();
          // In a real implementation, you'd track read status
          return stockAlerts;
        },
        
        getNearbyPharmacies: (maxDistance = 10) => {
          const { alternatePharmacies, searchResults } = get();
          const allPharmacies = [
            ...alternatePharmacies,
            ...(searchResults?.pharmacies || []),
          ];
          
          return allPharmacies.filter((pharmacy) => 
            pharmacy.distance !== undefined && pharmacy.distance <= maxDistance
          );
        },
        
        getInNetworkPharmacies: () => {
          const { primaryPharmacy, alternatePharmacies, searchResults } = get();
          const allPharmacies = [
            ...(primaryPharmacy ? [primaryPharmacy] : []),
            ...alternatePharmacies,
            ...(searchResults?.pharmacies || []),
          ];
          
          return allPharmacies.filter((pharmacy) => pharmacy.inNetwork);
        },
        
        getPharmaciesWithStock: (medicationId) => {
          const { primaryPharmacy, alternatePharmacies, searchResults } = get();
          const allPharmacies = [
            ...(primaryPharmacy ? [primaryPharmacy] : []),
            ...alternatePharmacies,
            ...(searchResults?.pharmacies || []),
          ];
          
          return allPharmacies.filter((pharmacy) =>
            pharmacy.inventory.some((item) => 
              item.medicationId === medicationId && 
              (item.status === 'in-stock' || item.status === 'low-stock')
            )
          );
        },
      })),
      {
        name: 'pharmacy-store',
        partialize: (state) => ({
          // Only persist certain parts of the state
          primaryPharmacy: state.primaryPharmacy,
          preferences: state.preferences,
          showAlternatePharmacies: state.showAlternatePharmacies,
          searchCriteria: state.searchCriteria,
        }),
      }
    ),
    {
      name: 'pharmacy-store',
    }
  )
);

// Selectors for better performance
export const pharmacySelectors = {
  primaryPharmacy: (state: PharmacyState) => state.primaryPharmacy,
  
  alternatePharmacies: (state: PharmacyState) => state.alternatePharmacies,
  
  searchResults: (state: PharmacyState) => state.searchResults,
  
  activeTransfersCount: (state: PharmacyState) => 
    state.activeTransfers.filter((t) => 
      t.status === 'pending' || t.status === 'approved' || t.status === 'in-progress'
    ).length,
  
  unreadAlertsCount: (state: PharmacyState) => state.stockAlerts.length,
  
  isAnyModalOpen: (state: PharmacyState) => 
    state.isSearchModalOpen || state.isTransferModalOpen || state.isPreferencesModalOpen,
  
  isLoading: (state: PharmacyState) => 
    state.isLoading || state.isSearching || state.isTransferring,
  
  hasSearchResults: (state: PharmacyState) => 
    state.searchResults !== null && state.searchResults.pharmacies.length > 0,
};

// Action creators for complex operations
export const pharmacyActions = {
  // Quick search for pharmacies with specific medication in stock
  searchForMedication: async (medicationId: string, location?: { latitude: number; longitude: number }) => {
    const { searchPharmacies } = usePharmacyStore.getState();
    const criteria: PharmacySearchCriteria = {
      hasStock: [medicationId],
      location: location ? { ...location, radius: 10 } : undefined,
      inNetworkOnly: true,
      sortBy: 'distance',
      sortOrder: 'asc',
      limit: 10,
    };
    
    await searchPharmacies(criteria);
  },
  
  // Switch primary pharmacy
  switchPrimaryPharmacy: (newPrimary: DetailedPharmacy) => {
    const { primaryPharmacy, setPrimaryPharmacy, addAlternatePharmacy } = usePharmacyStore.getState();
    
    if (primaryPharmacy) {
      addAlternatePharmacy(primaryPharmacy);
    }
    setPrimaryPharmacy(newPrimary);
  },
  
  // Bulk transfer multiple medications
  bulkTransferMedications: async (medicationIds: string[], toPharmacy: DetailedPharmacy) => {
    const { initiateTransfer, primaryPharmacy } = usePharmacyStore.getState();
    
    if (!primaryPharmacy) {
      throw new Error('No primary pharmacy set');
    }
    
    const transfers = await Promise.all(
      medicationIds.map((medicationId) =>
        initiateTransfer({
          fromPharmacyId: primaryPharmacy.id,
          toPharmacyId: toPharmacy.id,
          medicationId,
          patientId: 'current-patient', // Would come from patient context
          requestedBy: 'current-user', // Would come from user context
          urgency: 'routine',
        })
      )
    );
    
    return transfers;
  },
};
