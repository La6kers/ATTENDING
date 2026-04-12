// =============================================================================
// ATTENDING AI - Unified Provider Store
// apps/provider-portal/store/useProviderStore.ts
//
// Consolidated state management for the provider portal (ATTENDING).
// Combines patient queue, active assessments, real-time updates, and notifications.
// =============================================================================

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import type { RedFlag as SharedRedFlag } from '@attending/shared/types/chat.types';

// ============================================================================
// Types — extend shared canonical types for provider store
// ============================================================================

export type UrgencyLevel = 'critical' | 'emergent' | 'urgent' | 'routine';
export type AssessmentStatus = 'waiting' | 'in-progress' | 'review-needed' | 'completed' | 'transferred';

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  mrn: string;
  gender: 'male' | 'female' | 'other';
  allergies: string[];
  medications: string[];
  medicalHistory: string[];
}

export interface VitalSigns {
  heartRate?: number;
  bloodPressure?: string;
  respiratoryRate?: number;
  temperature?: number;
  oxygenSaturation?: number;
  painLevel?: number;
  timestamp: string;
}

/**
 * RedFlag for the provider store. Extends shared RedFlag but uses
 * provider-specific UrgencyLevel for severity and adds `acknowledged` tracking.
 */
export interface RedFlag extends Omit<SharedRedFlag, 'severity' | 'context'> {
  severity: UrgencyLevel;
  acknowledged: boolean;
}

export interface Assessment {
  id: string;
  patient: Patient;
  chiefComplaint: string;
  symptoms: string[];
  vitalSigns: VitalSigns | null;
  redFlags: RedFlag[];
  urgencyLevel: UrgencyLevel;
  status: AssessmentStatus;
  assignedProviderId: string | null;
  startedAt: string;
  updatedAt: string;
  compassSessionId: string;
  aiSummary?: string;
  differentialDiagnosis?: { name: string; probability: number }[];
}

export interface Notification {
  id: string;
  type: 'red-flag' | 'new-patient' | 'escalation' | 'message' | 'system';
  title: string;
  message: string;
  assessmentId?: string;
  urgency: UrgencyLevel;
  read: boolean;
  createdAt: string;
}

export interface ProviderState {
  // Provider Info
  providerId: string | null;
  providerName: string | null;
  isOnline: boolean;
  
  // Patient Queue
  assessments: Assessment[];
  activeAssessmentId: string | null;
  queueFilter: UrgencyLevel | 'all';
  
  // Notifications
  notifications: Notification[];
  unreadCount: number;
  audioAlertsEnabled: boolean;
  
  // Real-time Connection
  isConnected: boolean;
  lastSyncTime: string | null;
  
  // UI State
  isSidebarOpen: boolean;
  isNotificationPanelOpen: boolean;
  activeTab: 'queue' | 'active' | 'completed';
}

export interface ProviderActions {
  // Provider
  setProvider: (id: string, name: string) => void;
  setOnlineStatus: (isOnline: boolean) => void;
  
  // Queue Management
  addAssessment: (assessment: Assessment) => void;
  updateAssessment: (id: string, updates: Partial<Assessment>) => void;
  removeAssessment: (id: string) => void;
  claimAssessment: (assessmentId: string) => void;
  releaseAssessment: (assessmentId: string) => void;
  setActiveAssessment: (id: string | null) => void;
  setQueueFilter: (filter: UrgencyLevel | 'all') => void;
  
  // Red Flags
  addRedFlag: (assessmentId: string, redFlag: RedFlag) => void;
  acknowledgeRedFlag: (assessmentId: string, redFlagId: string) => void;
  
  // Notifications
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;
  toggleAudioAlerts: () => void;
  
  // Real-time
  setConnectionStatus: (connected: boolean) => void;
  syncAssessments: (assessments: Assessment[]) => void;
  
  // UI
  toggleSidebar: () => void;
  toggleNotificationPanel: () => void;
  setActiveTab: (tab: 'queue' | 'active' | 'completed') => void;
  
  // Computed
  getFilteredAssessments: () => Assessment[];
  getCriticalAssessments: () => Assessment[];
  getAssessmentById: (id: string) => Assessment | undefined;
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useProviderStore = create<ProviderState & ProviderActions>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        // Initial State
        providerId: null,
        providerName: null,
        isOnline: true,
        assessments: [],
        activeAssessmentId: null,
        queueFilter: 'all',
        notifications: [],
        unreadCount: 0,
        audioAlertsEnabled: true,
        isConnected: false,
        lastSyncTime: null,
        isSidebarOpen: true,
        isNotificationPanelOpen: false,
        activeTab: 'queue',

        // Provider Actions
        setProvider: (id, name) => {
          set((state) => {
            state.providerId = id;
            state.providerName = name;
          });
        },

        setOnlineStatus: (isOnline) => {
          set((state) => {
            state.isOnline = isOnline;
          });
        },

        // Queue Management
        addAssessment: (assessment) => {
          set((state) => {
            // Check if already exists
            const exists = state.assessments.find(a => a.id === assessment.id);
            if (!exists) {
              // Insert based on urgency (critical first)
              const urgencyOrder: Record<UrgencyLevel, number> = {
                critical: 0,
                emergent: 1,
                urgent: 2,
                routine: 3
              };
              
              const insertIndex = state.assessments.findIndex(
                a => urgencyOrder[a.urgencyLevel] > urgencyOrder[assessment.urgencyLevel]
              );
              
              if (insertIndex === -1) {
                state.assessments.push(assessment);
              } else {
                state.assessments.splice(insertIndex, 0, assessment);
              }

              // Create notification for critical/emergent
              if (assessment.urgencyLevel === 'critical' || assessment.urgencyLevel === 'emergent') {
                state.notifications.unshift({
                  id: `notif-${Date.now()}`,
                  type: 'new-patient',
                  title: `New ${assessment.urgencyLevel.toUpperCase()} Patient`,
                  message: `${assessment.patient.firstName} ${assessment.patient.lastName}: ${assessment.chiefComplaint}`,
                  assessmentId: assessment.id,
                  urgency: assessment.urgencyLevel,
                  read: false,
                  createdAt: new Date().toISOString()
                });
                state.unreadCount++;
              }
            }
          });
        },

        updateAssessment: (id, updates) => {
          set((state) => {
            const index = state.assessments.findIndex(a => a.id === id);
            if (index !== -1) {
              state.assessments[index] = {
                ...state.assessments[index],
                ...updates,
                updatedAt: new Date().toISOString()
              };
            }
          });
        },

        removeAssessment: (id) => {
          set((state) => {
            state.assessments = state.assessments.filter(a => a.id !== id);
            if (state.activeAssessmentId === id) {
              state.activeAssessmentId = null;
            }
          });
        },

        claimAssessment: (assessmentId) => {
          const { providerId } = get();
          set((state) => {
            const assessment = state.assessments.find(a => a.id === assessmentId);
            if (assessment && !assessment.assignedProviderId) {
              assessment.assignedProviderId = providerId;
              assessment.status = 'in-progress';
              assessment.updatedAt = new Date().toISOString();
              state.activeAssessmentId = assessmentId;
            }
          });
        },

        releaseAssessment: (assessmentId) => {
          set((state) => {
            const assessment = state.assessments.find(a => a.id === assessmentId);
            if (assessment) {
              assessment.assignedProviderId = null;
              assessment.status = 'waiting';
              assessment.updatedAt = new Date().toISOString();
              if (state.activeAssessmentId === assessmentId) {
                state.activeAssessmentId = null;
              }
            }
          });
        },

        setActiveAssessment: (id) => {
          set((state) => {
            state.activeAssessmentId = id;
          });
        },

        setQueueFilter: (filter) => {
          set((state) => {
            state.queueFilter = filter;
          });
        },

        // Red Flags
        addRedFlag: (assessmentId, redFlag) => {
          set((state) => {
            const assessment = state.assessments.find(a => a.id === assessmentId);
            if (assessment) {
              assessment.redFlags.push(redFlag);
              
              // Update urgency if needed
              if (redFlag.severity === 'critical' && assessment.urgencyLevel !== 'critical') {
                assessment.urgencyLevel = 'critical';
              }

              // Create notification
              state.notifications.unshift({
                id: `notif-${Date.now()}`,
                type: 'red-flag',
                title: 'RED FLAG DETECTED',
                message: `${assessment.patient.firstName} ${assessment.patient.lastName}: ${redFlag.symptom}`,
                assessmentId,
                urgency: redFlag.severity,
                read: false,
                createdAt: new Date().toISOString()
              });
              state.unreadCount++;

              // Play audio alert if enabled
              if (state.audioAlertsEnabled && typeof window !== 'undefined') {
                // Audio alert would be triggered here
                console.log('🔔 RED FLAG AUDIO ALERT');
              }
            }
          });
        },

        acknowledgeRedFlag: (assessmentId, redFlagId) => {
          set((state) => {
            const assessment = state.assessments.find(a => a.id === assessmentId);
            if (assessment) {
              const redFlag = assessment.redFlags.find(rf => rf.id === redFlagId);
              if (redFlag) {
                redFlag.acknowledged = true;
              }
            }
          });
        },

        // Notifications
        addNotification: (notification) => {
          set((state) => {
            state.notifications.unshift({
              ...notification,
              id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              read: false,
              createdAt: new Date().toISOString()
            });
            state.unreadCount++;
          });
        },

        markNotificationRead: (id) => {
          set((state) => {
            const notification = state.notifications.find(n => n.id === id);
            if (notification && !notification.read) {
              notification.read = true;
              state.unreadCount = Math.max(0, state.unreadCount - 1);
            }
          });
        },

        markAllNotificationsRead: () => {
          set((state) => {
            state.notifications.forEach(n => { n.read = true; });
            state.unreadCount = 0;
          });
        },

        clearNotifications: () => {
          set((state) => {
            state.notifications = [];
            state.unreadCount = 0;
          });
        },

        toggleAudioAlerts: () => {
          set((state) => {
            state.audioAlertsEnabled = !state.audioAlertsEnabled;
          });
        },

        // Real-time
        setConnectionStatus: (connected) => {
          set((state) => {
            state.isConnected = connected;
            if (connected) {
              state.lastSyncTime = new Date().toISOString();
            }
          });
        },

        syncAssessments: (assessments) => {
          set((state) => {
            state.assessments = assessments;
            state.lastSyncTime = new Date().toISOString();
          });
        },

        // UI
        toggleSidebar: () => {
          set((state) => {
            state.isSidebarOpen = !state.isSidebarOpen;
          });
        },

        toggleNotificationPanel: () => {
          set((state) => {
            state.isNotificationPanelOpen = !state.isNotificationPanelOpen;
          });
        },

        setActiveTab: (tab) => {
          set((state) => {
            state.activeTab = tab;
          });
        },

        // Computed
        getFilteredAssessments: () => {
          const { assessments, queueFilter } = get();
          if (queueFilter === 'all') return assessments;
          return assessments.filter(a => a.urgencyLevel === queueFilter);
        },

        getCriticalAssessments: () => {
          const { assessments } = get();
          return assessments.filter(a => 
            a.urgencyLevel === 'critical' || 
            a.redFlags.some(rf => !rf.acknowledged)
          );
        },

        getAssessmentById: (id) => {
          return get().assessments.find(a => a.id === id);
        },
      }))
    ),
    { name: 'provider-store' }
  )
);

// ============================================================================
// Selectors
// ============================================================================

export const selectActiveAssessment = (state: ProviderState & ProviderActions) => {
  return state.activeAssessmentId 
    ? state.assessments.find(a => a.id === state.activeAssessmentId)
    : null;
};

export const selectCriticalCount = (state: ProviderState & ProviderActions) => {
  return state.assessments.filter(a => a.urgencyLevel === 'critical').length;
};

export const selectUnacknowledgedRedFlags = (state: ProviderState & ProviderActions) => {
  return state.assessments.flatMap(a => 
    a.redFlags.filter(rf => !rf.acknowledged).map(rf => ({ ...rf, assessmentId: a.id }))
  );
};
