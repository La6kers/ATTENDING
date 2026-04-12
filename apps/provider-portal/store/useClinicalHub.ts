import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { clinicalMessages, ClinicalMessage } from '../lib/clinicalMockData';

export interface ClinicalHubState {
  // Message Data
  messages: ClinicalMessage[];
  expandedMessages: Set<number>;
  selectedActions: Record<number, number[]>;
  composedResponses: Record<number, string>;
  
  // Filter State
  currentFilter: string;
  currentView: 'priority' | 'timeline' | 'patient';
  
  // Actions
  toggleExpanded: (msgId: number) => void;
  toggleAction: (msgId: number, actionIdx: number) => void;
  updateComposedResponse: (msgId: number, text: string) => void;
  setFilter: (filter: string) => void;
  setView: (view: 'priority' | 'timeline' | 'patient') => void;
  executeAction: (msgId: number) => void;
  removeMessage: (msgId: number) => void;
  
  // Computed values
  getCriticalCount: () => number;
  getFilteredMessages: () => ClinicalMessage[];
}

export const useClinicalHub = create<ClinicalHubState>()(
  devtools(
    immer((set, get) => ({
      // Initial state
      messages: clinicalMessages,
      expandedMessages: new Set<number>(),
      selectedActions: {},
      composedResponses: {},
      currentFilter: 'all',
      currentView: 'priority',
      
      // Actions
      toggleExpanded: (msgId) => set(state => {
        if (state.expandedMessages.has(msgId)) {
          state.expandedMessages.delete(msgId);
        } else {
          state.expandedMessages.add(msgId);
        }
      }),
      
      toggleAction: (msgId, actionIdx) => set(state => {
        const msg = state.messages.find(m => m.id === msgId);
        if (msg && msg.recommendedActions) {
          msg.recommendedActions[actionIdx].selected = !msg.recommendedActions[actionIdx].selected;
          
          // Track selected actions
          if (!state.selectedActions[msgId]) {
            state.selectedActions[msgId] = [];
          }
          
          if (msg.recommendedActions[actionIdx].selected) {
            state.selectedActions[msgId].push(actionIdx);
          } else {
            state.selectedActions[msgId] = state.selectedActions[msgId].filter(idx => idx !== actionIdx);
          }
        }
      }),
      
      updateComposedResponse: (msgId, text) => set(state => {
        state.composedResponses[msgId] = text;
      }),
      
      setFilter: (filter) => set(state => {
        state.currentFilter = filter;
      }),
      
      setView: (view) => set(state => {
        state.currentView = view;
      }),
      
      executeAction: (msgId) => set(state => {
        // In a real app, this would send the response
        console.log('Executing action for message', msgId, state.composedResponses[msgId]);
      }),
      
      removeMessage: (msgId) => set(state => {
        state.messages = state.messages.filter(m => m.id !== msgId);
        state.expandedMessages.delete(msgId);
        delete state.selectedActions[msgId];
        delete state.composedResponses[msgId];
      }),
      
      // Computed values
      getCriticalCount: () => {
        const state = get();
        return state.messages.filter(m => m.priority >= 8).length;
      },
      
      getFilteredMessages: () => {
        const state = get();
        const { messages, currentFilter } = state;
        
        if (currentFilter === 'all') {
          return messages;
        }
        
        if (currentFilter === 'critical') {
          return messages.filter(m => m.priority >= 8);
        }
        
        if (currentFilter === 'time-sensitive') {
          return messages.filter(m => m.priority >= 5 && m.priority < 8);
        }
        
        if (currentFilter === 'routine') {
          return messages.filter(m => m.priority < 5);
        }
        
        // Filter by type
        return messages.filter(m => m.type === currentFilter);
      }
    }))
  )
);
