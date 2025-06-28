import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export type MessagePriority = 'urgent' | 'high' | 'normal' | 'low';
export type MessageStatus = 'unread' | 'read' | 'archived' | 'deleted';
export type MessageType = 'email' | 'lab' | 'phone' | 'refill';

export interface PatientDetails {
  id: string;
  name: string;
  age: string;
  dateOfBirth: string;
  allergies: string[];
  lastVisit: string;
  conditions: string[];
  mrn: string;
}

export interface MessageAttachment {
  id: string;
  name: string;
  type: string;
  url: string;
  size: number;
}

export interface Message {
  id: number;
  patientDetails: PatientDetails;
  type: MessageType;
  priority: MessagePriority;
  status: MessageStatus;
  subject: string;
  preview: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  medications?: string[];
  attachments?: MessageAttachment[];
  assignedTo?: string;
  labels: string[];
  followUpDate?: Date;
  responseRequired: boolean;
  aiAnalysis?: {
    summary: string;
    recommendations: string[];
    riskFactors: string[];
    suggestedActions: string[];
  };
}

interface AIAssistantState {
  isAnalyzing: boolean;
  suggestion: string | null;
  error: string | null;
}

export interface MessageFilter {
  type?: MessageType[];
  priority?: MessagePriority[];
  status?: MessageStatus[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  assignedTo?: string[];
  labels?: string[];
  responseRequired?: boolean;
  hasAttachments?: boolean;
}

interface InboxState {
  // Message Data
  messages: Message[];
  currentMessage: Message | null;
  selectedMessages: Set<number>;
  
  // UI State
  filter: MessageFilter;
  searchQuery: string;
  sortBy: 'date' | 'priority' | 'patientName' | 'type';
  sortOrder: 'asc' | 'desc';
  view: 'list' | 'grid';
  sidebarCollapsed: boolean;
  
  // Composition State
  draftMessage: Partial<Message> | null;
  isComposing: boolean;
  
  // AI Assistant State
  aiAssistant: AIAssistantState;
  
  // Loading States
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  lastSynced: Date | null;
  
  // Metadata
  unreadCount: number;
  urgentCount: number;
  labelCounts: Record<string, number>;
  
  // Actions - Message Operations
  fetchMessages: () => Promise<void>;
  refreshMessages: () => Promise<void>;
  selectMessage: (message: Message) => void;
  toggleMessageSelection: (messageId: number) => void;
  selectAllMessages: () => void;
  clearSelection: () => void;
  markAsRead: (messageIds: number[]) => Promise<void>;
  markAsUnread: (messageIds: number[]) => Promise<void>;
  archiveMessages: (messageIds: number[]) => Promise<void>;
  deleteMessages: (messageIds: number[]) => Promise<void>;
  restoreMessages: (messageIds: number[]) => Promise<void>;
  assignMessages: (messageIds: number[], userId: string) => Promise<void>;
  addLabel: (messageIds: number[], label: string) => Promise<void>;
  removeLabel: (messageIds: number[], label: string) => Promise<void>;
  setFollowUpDate: (messageId: number, date: Date) => Promise<void>;
  
  // Actions - UI Operations
  setFilter: (filter: Partial<MessageFilter>) => void;
  clearFilters: () => void;
  setSearchQuery: (query: string) => void;
  setSortBy: (sortBy: 'date' | 'priority' | 'patientName' | 'type') => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
  setView: (view: 'list' | 'grid') => void;
  toggleSidebar: () => void;
  
  // Actions - Composition
  startComposing: () => void;
  cancelComposing: () => void;
  saveDraft: (draft: Partial<Message>) => void;
  sendMessage: (message: Message) => Promise<void>;
  
  // Actions - AI Assistant
  requestAIAnalysis: (messageId: number) => Promise<void>;
  generateAIResponse: (messageId: number, prompt?: string) => Promise<string>;
  cancelAIOperation: () => void;
  
  // Actions - Data Operations
  updateMessageCounts: () => void;
  syncWithServer: () => Promise<void>;
  handleError: (error: Error) => void;
}

const initialState = {
  messages: [],
  currentMessage: null,
  selectedMessages: new Set<number>(),
  filter: {},
  searchQuery: '',
  sortBy: 'date' as const,
  sortOrder: 'desc' as const,
  view: 'list' as const,
  sidebarCollapsed: false,
  draftMessage: null,
  isComposing: false,
  aiAssistant: {
    isAnalyzing: false,
    suggestion: null,
    error: null,
  },
  isLoading: false,
  isRefreshing: false,
  error: null,
  lastSynced: null,
  unreadCount: 0,
  urgentCount: 0,
  labelCounts: {},
};

export const useInbox = create<InboxState>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        // Message Operations
        fetchMessages: async () => {
          set(state => { state.isLoading = true; state.error = null; });
          try {
            // API call would go here
            const messages: Message[] = [];
            set(state => {
              state.messages = messages;
              state.isLoading = false;
              state.lastSynced = new Date();
              state.updateMessageCounts();
            });
          } catch (error) {
            set(state => {
              state.isLoading = false;
              state.error = error.message;
            });
          }
        },

        refreshMessages: async () => {
          set(state => { state.isRefreshing = true; });
          await get().fetchMessages();
          set(state => { state.isRefreshing = false; });
        },

        selectMessage: (message) =>
          set(state => {
            state.currentMessage = message;
            if (message.status === 'unread') {
              get().markAsRead([message.id]);
            }
          }),

        toggleMessageSelection: (messageId) =>
          set(state => {
            if (state.selectedMessages.has(messageId)) {
              state.selectedMessages.delete(messageId);
            } else {
              state.selectedMessages.add(messageId);
            }
          }),

        selectAllMessages: () =>
          set(state => {
            const filtered = get().getFilteredMessages();
            state.selectedMessages = new Set(filtered.map(m => m.id));
          }),

        clearSelection: () =>
          set(state => {
            state.selectedMessages.clear();
          }),

        markAsRead: async (messageIds) => {
          set(state => {
            messageIds.forEach(id => {
              const message = state.messages.find(m => m.id === id);
              if (message) {
                message.status = 'read';
                message.updatedAt = new Date();
              }
            });
            state.updateMessageCounts();
          });
        },

        markAsUnread: async (messageIds) => {
          set(state => {
            messageIds.forEach(id => {
              const message = state.messages.find(m => m.id === id);
              if (message) {
                message.status = 'unread';
                message.updatedAt = new Date();
              }
            });
            state.updateMessageCounts();
          });
        },

        archiveMessages: async (messageIds) => {
          set(state => {
            messageIds.forEach(id => {
              const message = state.messages.find(m => m.id === id);
              if (message) {
                message.status = 'archived';
                message.updatedAt = new Date();
              }
            });
            state.selectedMessages.clear();
            state.updateMessageCounts();
          });
        },

        // UI Operations
        setFilter: (filter) =>
          set(state => {
            state.filter = { ...state.filter, ...filter };
          }),

        clearFilters: () =>
          set(state => {
            state.filter = {};
            state.searchQuery = '';
          }),

        setSearchQuery: (query) =>
          set(state => {
            state.searchQuery = query;
          }),

        setSortBy: (sortBy) =>
          set(state => {
            state.sortBy = sortBy;
          }),

        setSortOrder: (order) =>
          set(state => {
            state.sortOrder = order;
          }),

        setView: (view) =>
          set(state => {
            state.view = view;
          }),

        toggleSidebar: () =>
          set(state => {
            state.sidebarCollapsed = !state.sidebarCollapsed;
          }),

        // AI Assistant Operations
        requestAIAnalysis: async (messageId) => {
          set(state => {
            state.aiAssistant.isAnalyzing = true;
            state.aiAssistant.error = null;
          });
          try {
            // API call would go here
            set(state => {
              state.aiAssistant.isAnalyzing = false;
              const message = state.messages.find(m => m.id === messageId);
              if (message) {
                message.aiAnalysis = {
                  summary: 'AI-generated summary',
                  recommendations: [],
                  riskFactors: [],
                  suggestedActions: [],
                };
              }
            });
          } catch (error) {
            set(state => {
              state.aiAssistant.isAnalyzing = false;
              state.aiAssistant.error = error.message;
            });
          }
        },

        generateAIResponse: async (messageId, prompt) => {
          set(state => {
            state.aiAssistant.isAnalyzing = true;
            state.aiAssistant.error = null;
          });
          try {
            // API call would go here
            const response = 'AI-generated response';
            set(state => {
              state.aiAssistant.isAnalyzing = false;
              state.aiAssistant.suggestion = response;
            });
            return response;
          } catch (error) {
            set(state => {
              state.aiAssistant.isAnalyzing = false;
              state.aiAssistant.error = error.message;
            });
            return '';
          }
        },

        cancelAIOperation: () =>
          set(state => {
            state.aiAssistant.isAnalyzing = false;
            state.aiAssistant.error = null;
          }),

        // Utility Operations
        updateMessageCounts: () =>
          set(state => {
            state.unreadCount = state.messages.filter(m => m.status === 'unread').length;
            state.urgentCount = state.messages.filter(m => m.priority === 'urgent').length;
            
            const labelCounts: Record<string, number> = {};
            state.messages.forEach(message => {
              message.labels.forEach(label => {
                labelCounts[label] = (labelCounts[label] || 0) + 1;
              });
            });
            state.labelCounts = labelCounts;
          }),

        syncWithServer: async () => {
          set(state => { state.isLoading = true; });
          try {
            await get().fetchMessages();
          } finally {
            set(state => { state.isLoading = false; });
          }
        },

        handleError: (error: Error) =>
          set(state => {
            state.error = error.message;
            console.error('Inbox Error:', error);
          }),
      })),
      {
        name: 'inbox-storage',
        partialize: (state) => ({
          view: state.view,
          sortBy: state.sortBy,
          sortOrder: state.sortOrder,
          sidebarCollapsed: state.sidebarCollapsed,
        }),
      }
    )
  )
);