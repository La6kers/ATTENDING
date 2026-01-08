// ============================================================
// Assessment Queue Store - Zustand with Real API Integration
// apps/provider-portal/store/assessmentQueueStore.ts
//
// Manages COMPASS assessments for provider review
// NOW USING REAL API - No more mock data!
// ============================================================

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { 
  PatientAssessment, 
  UrgencyLevel, 
  Diagnosis,
} from '@attending/shared';

// Re-export PatientAssessment for components that import from this file
export type { PatientAssessment };

// Filters for assessment queue
export interface AssessmentFilters {
  status: string | 'all';
  urgency: UrgencyLevel | 'all';
  timeRange: 'today' | 'week' | 'month' | 'all';
  searchQuery: string;
}

interface AssessmentQueueStore {
  assessments: PatientAssessment[];
  selectedAssessment: PatientAssessment | null;
  filters: AssessmentFilters;
  loading: boolean;
  error: string | null;
  lastFetched: string | null;
  
  // Actions
  fetchAssessments: () => Promise<void>;
  refreshAssessments: () => Promise<void>;
  addAssessment: (assessment: PatientAssessment) => void;
  selectAssessment: (id: string | null) => void;
  fetchAssessmentDetails: (id: string) => Promise<PatientAssessment | null>;
  setFilters: (filters: Partial<AssessmentFilters>) => void;
  updateAssessmentStatus: (id: string, status: PatientAssessment['status']) => Promise<void>;
  addProviderNotes: (id: string, notes: string) => Promise<void>;
  confirmDiagnosis: (id: string, diagnosis: Diagnosis) => void;
  addIcdCode: (id: string, code: string) => void;
  setTreatmentPlan: (id: string, plan: string) => Promise<void>;
  completeReview: (id: string, data: Partial<PatientAssessment>) => Promise<void>;
  
  // Computed
  getFilteredAssessments: () => PatientAssessment[];
  getUrgentCount: () => number;
  getPendingCount: () => number;
  getAssessmentById: (id: string) => PatientAssessment | undefined;
}

// API base URL
const API_BASE = '/api';

export const useAssessmentQueueStore = create<AssessmentQueueStore>()(
  devtools(
    immer((set, get) => ({
      assessments: [],
      selectedAssessment: null,
      filters: {
        status: 'all',
        urgency: 'all',
        timeRange: 'today',
        searchQuery: '',
      },
      loading: false,
      error: null,
      lastFetched: null,

      // =====================================================
      // FETCH ASSESSMENTS - Real API Call
      // =====================================================
      fetchAssessments: async () => {
        set(state => { state.loading = true; state.error = null; });
        
        try {
          const { filters } = get();
          
          // Build query params
          const params = new URLSearchParams();
          if (filters.status !== 'all') params.set('status', filters.status);
          if (filters.urgency !== 'all') params.set('urgency', filters.urgency);
          params.set('limit', '100');
          
          const response = await fetch(`${API_BASE}/assessments?${params.toString()}`);
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const data = await response.json();
          
          set(state => {
            state.assessments = data.assessments || [];
            state.loading = false;
            state.lastFetched = new Date().toISOString();
          });
        } catch (error) {
          console.error('Failed to fetch assessments:', error);
          set(state => {
            state.error = error instanceof Error ? error.message : 'Failed to fetch assessments';
            state.loading = false;
          });
        }
      },

      // =====================================================
      // REFRESH - Force fresh fetch
      // =====================================================
      refreshAssessments: async () => {
        const { fetchAssessments } = get();
        await fetchAssessments();
      },

      // =====================================================
      // ADD ASSESSMENT - For WebSocket real-time updates
      // =====================================================
      addAssessment: (assessment) => {
        set(state => {
          const existingIndex = state.assessments.findIndex(a => a.id === assessment.id);
          if (existingIndex >= 0) {
            state.assessments[existingIndex] = assessment;
          } else {
            // Add to beginning (newest first)
            state.assessments.unshift(assessment);
          }
        });
      },

      // =====================================================
      // SELECT ASSESSMENT
      // =====================================================
      selectAssessment: (id) => {
        set(state => {
          state.selectedAssessment = id 
            ? state.assessments.find(a => a.id === id) || null 
            : null;
        });
      },

      // =====================================================
      // FETCH SINGLE ASSESSMENT DETAILS
      // =====================================================
      fetchAssessmentDetails: async (id: string) => {
        try {
          const response = await fetch(`${API_BASE}/assessments/${id}`);
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const assessment = await response.json();
          
          // Update in local state
          set(state => {
            const index = state.assessments.findIndex(a => a.id === id);
            if (index >= 0) {
              state.assessments[index] = { ...state.assessments[index], ...assessment };
            }
            state.selectedAssessment = assessment;
          });
          
          return assessment;
        } catch (error) {
          console.error('Failed to fetch assessment details:', error);
          return null;
        }
      },

      // =====================================================
      // SET FILTERS
      // =====================================================
      setFilters: (filters) => {
        set(state => {
          state.filters = { ...state.filters, ...filters };
        });
        // Auto-refresh when filters change
        get().fetchAssessments();
      },

      // =====================================================
      // UPDATE ASSESSMENT STATUS - API Call
      // =====================================================
      updateAssessmentStatus: async (id, status) => {
        try {
          const response = await fetch(`${API_BASE}/assessments/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          // Update local state
          set(state => {
            const assessment = state.assessments.find(a => a.id === id);
            if (assessment) {
              assessment.status = status;
              if (status === 'in_review') {
                assessment.reviewedAt = new Date().toISOString();
              } else if (status === 'completed') {
                assessment.completedAt = new Date().toISOString();
              }
              if (state.selectedAssessment?.id === id) {
                state.selectedAssessment = { ...assessment };
              }
            }
          });
        } catch (error) {
          console.error('Failed to update assessment status:', error);
          throw error;
        }
      },

      // =====================================================
      // ADD PROVIDER NOTES - API Call
      // =====================================================
      addProviderNotes: async (id, notes) => {
        try {
          const response = await fetch(`${API_BASE}/assessments/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ providerNotes: notes }),
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          set(state => {
            const assessment = state.assessments.find(a => a.id === id);
            if (assessment) {
              assessment.providerNotes = notes;
              if (state.selectedAssessment?.id === id) {
                state.selectedAssessment.providerNotes = notes;
              }
            }
          });
        } catch (error) {
          console.error('Failed to add provider notes:', error);
          throw error;
        }
      },

      // =====================================================
      // CONFIRM DIAGNOSIS (Local + will sync on complete)
      // =====================================================
      confirmDiagnosis: (id, diagnosis) => {
        set(state => {
          const assessment = state.assessments.find(a => a.id === id);
          if (assessment) {
            if (!assessment.confirmedDiagnoses) {
              assessment.confirmedDiagnoses = [];
            }
            if (!assessment.confirmedDiagnoses.find(d => d.name === diagnosis.name)) {
              assessment.confirmedDiagnoses.push(diagnosis);
            }
          }
        });
      },

      // =====================================================
      // ADD ICD CODE (Local + will sync on complete)
      // =====================================================
      addIcdCode: (id, code) => {
        set(state => {
          const assessment = state.assessments.find(a => a.id === id);
          if (assessment) {
            if (!assessment.icdCodes) {
              assessment.icdCodes = [];
            }
            if (!assessment.icdCodes.includes(code)) {
              assessment.icdCodes.push(code);
            }
          }
        });
      },

      // =====================================================
      // SET TREATMENT PLAN - API Call
      // =====================================================
      setTreatmentPlan: async (id, plan) => {
        try {
          const response = await fetch(`${API_BASE}/assessments/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ treatmentPlan: plan }),
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          set(state => {
            const assessment = state.assessments.find(a => a.id === id);
            if (assessment) {
              assessment.treatmentPlan = plan;
            }
          });
        } catch (error) {
          console.error('Failed to set treatment plan:', error);
          throw error;
        }
      },

      // =====================================================
      // COMPLETE REVIEW - Full API Sync
      // =====================================================
      completeReview: async (id, data) => {
        try {
          const response = await fetch(`${API_BASE}/assessments/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...data,
              status: 'completed',
            }),
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          set(state => {
            const assessment = state.assessments.find(a => a.id === id);
            if (assessment) {
              Object.assign(assessment, data);
              assessment.status = 'completed';
              assessment.completedAt = new Date().toISOString();
              if (state.selectedAssessment?.id === id) {
                Object.assign(state.selectedAssessment, assessment);
              }
            }
          });
        } catch (error) {
          console.error('Failed to complete review:', error);
          throw error;
        }
      },

      // =====================================================
      // COMPUTED: Get Filtered Assessments
      // =====================================================
      getFilteredAssessments: () => {
        const { assessments, filters } = get();
        
        return assessments
          .filter(a => {
            // Status filter (already applied in API, but double-check)
            if (filters.status !== 'all' && a.status !== filters.status) return false;
            
            // Urgency filter
            if (filters.urgency !== 'all' && a.urgencyLevel !== filters.urgency) return false;
            
            // Time range filter
            if (filters.timeRange !== 'all') {
              const submittedDate = new Date(a.submittedAt);
              const now = new Date();
              const diffMs = now.getTime() - submittedDate.getTime();
              const diffDays = diffMs / (1000 * 60 * 60 * 24);
              
              if (filters.timeRange === 'today' && diffDays > 1) return false;
              if (filters.timeRange === 'week' && diffDays > 7) return false;
              if (filters.timeRange === 'month' && diffDays > 30) return false;
            }
            
            // Search query filter
            if (filters.searchQuery) {
              const query = filters.searchQuery.toLowerCase();
              const searchableText = [
                a.patientName,
                a.chiefComplaint,
                ...(a.differentialDiagnosis?.map(d => d.name) || []),
                ...(a.redFlags || []),
              ].join(' ').toLowerCase();
              
              if (!searchableText.includes(query)) return false;
            }
            
            return true;
          })
          .sort((a, b) => {
            // Urgent status first
            if (a.status === 'urgent' && b.status !== 'urgent') return -1;
            if (b.status === 'urgent' && a.status !== 'urgent') return 1;
            
            // Then by urgency level
            const urgencyOrder: Record<UrgencyLevel, number> = { high: 0, moderate: 1, standard: 2 };
            const urgencyDiff = urgencyOrder[a.urgencyLevel] - urgencyOrder[b.urgencyLevel];
            if (urgencyDiff !== 0) return urgencyDiff;
            
            // Then by submission time (newest first)
            return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
          });
      },

      // =====================================================
      // COMPUTED: Counts
      // =====================================================
      getUrgentCount: () => get().assessments.filter(
        a => a.urgencyLevel === 'high' || a.status === 'urgent'
      ).length,
      
      getPendingCount: () => get().assessments.filter(
        a => a.status === 'pending' || a.status === 'urgent'
      ).length,

      getAssessmentById: (id) => get().assessments.find(a => a.id === id),
    })),
    { name: 'assessment-queue-store' }
  )
);
