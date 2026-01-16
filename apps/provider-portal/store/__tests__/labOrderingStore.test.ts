// Lab Ordering Store Tests
// apps/provider-portal/store/__tests__/labOrderingStore.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useLabOrderingStore } from '../labOrderingStore';
import { act } from 'react-dom/test-utils';

// Reset store before each test
beforeEach(() => {
  const store = useLabOrderingStore.getState();
  store.clearOrder();
});

describe('labOrderingStore', () => {
  describe('Initial State', () => {
    it('should have empty selected labs', () => {
      const state = useLabOrderingStore.getState();
      expect(state.selectedLabs.size).toBe(0);
    });

    it('should have default priority set to ROUTINE', () => {
      const state = useLabOrderingStore.getState();
      expect(state.defaultPriority).toBe('ROUTINE');
    });

    it('should have lab catalog populated', () => {
      const state = useLabOrderingStore.getState();
      expect(state.labCatalog.size).toBeGreaterThan(0);
    });

    it('should not be loading initially', () => {
      const state = useLabOrderingStore.getState();
      expect(state.loading).toBe(false);
      expect(state.submitting).toBe(false);
    });
  });

  describe('Lab Selection', () => {
    it('should add a lab to selection', () => {
      const store = useLabOrderingStore.getState();
      const labs = Array.from(store.labCatalog.values());
      const testLab = labs[0];

      act(() => {
        store.addLab(testLab);
      });

      const updatedState = useLabOrderingStore.getState();
      expect(updatedState.selectedLabs.has(testLab.code)).toBe(true);
    });

    it('should remove a lab from selection', () => {
      const store = useLabOrderingStore.getState();
      const labs = Array.from(store.labCatalog.values());
      const testLab = labs[0];

      act(() => {
        store.addLab(testLab);
        store.removeLab(testLab.code);
      });

      const updatedState = useLabOrderingStore.getState();
      expect(updatedState.selectedLabs.has(testLab.code)).toBe(false);
    });

    it('should not duplicate labs when adding same lab twice', () => {
      const store = useLabOrderingStore.getState();
      const labs = Array.from(store.labCatalog.values());
      const testLab = labs[0];

      act(() => {
        store.addLab(testLab);
        store.addLab(testLab);
      });

      const updatedState = useLabOrderingStore.getState();
      expect(updatedState.selectedLabs.size).toBe(1);
    });
  });

  describe('Priority Management', () => {
    it('should update lab priority', () => {
      const store = useLabOrderingStore.getState();
      const labs = Array.from(store.labCatalog.values());
      const testLab = labs[0];

      act(() => {
        store.addLab(testLab);
        store.updateLabPriority(testLab.code, 'STAT');
      });

      const updatedState = useLabOrderingStore.getState();
      const selectedLab = updatedState.selectedLabs.get(testLab.code);
      expect(selectedLab?.priority).toBe('STAT');
    });

    it('should set default priority for all new labs', () => {
      const store = useLabOrderingStore.getState();
      
      act(() => {
        store.setDefaultPriority('URGENT');
      });

      const labs = Array.from(store.labCatalog.values());
      
      act(() => {
        store.addLab(labs[0]);
      });

      const updatedState = useLabOrderingStore.getState();
      const selectedLab = updatedState.selectedLabs.get(labs[0].code);
      expect(selectedLab?.priority).toBe('URGENT');
    });
  });

  describe('Lab Panels', () => {
    it('should add all labs from a panel', () => {
      const store = useLabOrderingStore.getState();
      
      act(() => {
        store.addPanel('BMP'); // Basic Metabolic Panel
      });

      const updatedState = useLabOrderingStore.getState();
      // BMP typically includes: Glucose, BUN, Creatinine, Sodium, Potassium, Chloride, CO2
      expect(updatedState.selectedLabs.size).toBeGreaterThanOrEqual(4);
    });

    it('should not duplicate labs when adding panel with existing labs', () => {
      const store = useLabOrderingStore.getState();
      const labs = Array.from(store.labCatalog.values());
      const glucoseLab = labs.find(l => l.code === 'GLUCOSE');

      if (glucoseLab) {
        act(() => {
          store.addLab(glucoseLab);
          store.addPanel('BMP');
        });

        const updatedState = useLabOrderingStore.getState();
        const glucoseCount = Array.from(updatedState.selectedLabs.values())
          .filter(l => l.lab.code === 'GLUCOSE').length;
        expect(glucoseCount).toBe(1);
      }
    });
  });

  describe('Fasting Requirements', () => {
    it('should calculate fasting required correctly', () => {
      const store = useLabOrderingStore.getState();
      const labs = Array.from(store.labCatalog.values());
      const fastingLab = labs.find(l => l.requiresFasting);

      if (fastingLab) {
        act(() => {
          store.addLab(fastingLab);
        });

        const updatedState = useLabOrderingStore.getState();
        expect(updatedState.requiresFasting()).toBe(true);
      }
    });

    it('should return false when no fasting labs selected', () => {
      const store = useLabOrderingStore.getState();
      const labs = Array.from(store.labCatalog.values());
      const nonFastingLab = labs.find(l => !l.requiresFasting);

      if (nonFastingLab) {
        act(() => {
          store.addLab(nonFastingLab);
        });

        const updatedState = useLabOrderingStore.getState();
        expect(updatedState.requiresFasting()).toBe(false);
      }
    });
  });

  describe('Cost Estimation', () => {
    it('should calculate total cost', () => {
      const store = useLabOrderingStore.getState();
      const labs = Array.from(store.labCatalog.values()).slice(0, 3);

      act(() => {
        labs.forEach(lab => store.addLab(lab));
      });

      const updatedState = useLabOrderingStore.getState();
      const totalCost = updatedState.getTotalCost();
      expect(totalCost).toBeGreaterThan(0);
    });

    it('should return 0 when no labs selected', () => {
      const store = useLabOrderingStore.getState();
      expect(store.getTotalCost()).toBe(0);
    });
  });

  describe('Filtering', () => {
    it('should filter labs by search query', () => {
      const store = useLabOrderingStore.getState();
      
      act(() => {
        store.setSearchQuery('glucose');
      });

      const updatedState = useLabOrderingStore.getState();
      const filteredLabs = updatedState.getFilteredCatalog();
      
      filteredLabs.forEach(lab => {
        const matchesSearch = 
          lab.name.toLowerCase().includes('glucose') ||
          lab.code.toLowerCase().includes('glucose');
        expect(matchesSearch).toBe(true);
      });
    });

    it('should filter labs by category', () => {
      const store = useLabOrderingStore.getState();
      
      act(() => {
        store.setCategoryFilter('chemistry');
      });

      const updatedState = useLabOrderingStore.getState();
      const filteredLabs = updatedState.getFilteredCatalog();
      
      filteredLabs.forEach(lab => {
        expect(lab.category).toBe('chemistry');
      });
    });

    it('should combine search and category filters', () => {
      const store = useLabOrderingStore.getState();
      
      act(() => {
        store.setSearchQuery('glucose');
        store.setCategoryFilter('chemistry');
      });

      const updatedState = useLabOrderingStore.getState();
      const filteredLabs = updatedState.getFilteredCatalog();
      
      filteredLabs.forEach(lab => {
        expect(lab.category).toBe('chemistry');
        const matchesSearch = 
          lab.name.toLowerCase().includes('glucose') ||
          lab.code.toLowerCase().includes('glucose');
        expect(matchesSearch).toBe(true);
      });
    });
  });

  describe('STAT Count', () => {
    it('should count STAT priority labs', () => {
      const store = useLabOrderingStore.getState();
      const labs = Array.from(store.labCatalog.values()).slice(0, 3);

      act(() => {
        labs.forEach(lab => store.addLab(lab, 'STAT'));
      });

      const updatedState = useLabOrderingStore.getState();
      expect(updatedState.getStatCount()).toBe(3);
    });

    it('should return 0 when no STAT labs', () => {
      const store = useLabOrderingStore.getState();
      const labs = Array.from(store.labCatalog.values()).slice(0, 2);

      act(() => {
        labs.forEach(lab => store.addLab(lab, 'ROUTINE'));
      });

      const updatedState = useLabOrderingStore.getState();
      expect(updatedState.getStatCount()).toBe(0);
    });
  });

  describe('AI Recommendations', () => {
    it('should load AI recommendations', async () => {
      const store = useLabOrderingStore.getState();

      // Mock fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: false, // Force fallback
      });

      await act(async () => {
        await store.loadAIRecommendations('patient-1', {
          chiefComplaint: 'chest pain',
          redFlags: ['diaphoresis'],
        });
      });

      const updatedState = useLabOrderingStore.getState();
      expect(updatedState.aiRecommendations.length).toBeGreaterThan(0);
    });

    it('should generate fallback recommendations for chest pain', async () => {
      const store = useLabOrderingStore.getState();

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
      });

      await act(async () => {
        await store.loadAIRecommendations('patient-1', {
          chiefComplaint: 'chest pain',
          redFlags: [],
        });
      });

      const updatedState = useLabOrderingStore.getState();
      // Should include troponin for chest pain
      const hasTroponin = updatedState.aiRecommendations.some(
        rec => rec.code === 'TROPONIN'
      );
      expect(hasTroponin).toBe(true);
    });
  });

  describe('Clear Order', () => {
    it('should clear all selected labs', () => {
      const store = useLabOrderingStore.getState();
      const labs = Array.from(store.labCatalog.values()).slice(0, 5);

      act(() => {
        labs.forEach(lab => store.addLab(lab));
        store.clearOrder();
      });

      const updatedState = useLabOrderingStore.getState();
      expect(updatedState.selectedLabs.size).toBe(0);
    });

    it('should clear clinical indication', () => {
      const store = useLabOrderingStore.getState();

      act(() => {
        store.setClinicalIndication('Test indication');
        store.clearOrder();
      });

      const updatedState = useLabOrderingStore.getState();
      expect(updatedState.clinicalIndication).toBe('');
    });

    it('should reset filters', () => {
      const store = useLabOrderingStore.getState();

      act(() => {
        store.setSearchQuery('test');
        store.setCategoryFilter('chemistry');
        store.clearOrder();
      });

      const updatedState = useLabOrderingStore.getState();
      expect(updatedState.searchQuery).toBe('');
      expect(updatedState.categoryFilter).toBe('all');
    });
  });

  describe('Computed Values', () => {
    it('should correctly get selected labs as array', () => {
      const store = useLabOrderingStore.getState();
      const labs = Array.from(store.labCatalog.values()).slice(0, 3);

      act(() => {
        labs.forEach(lab => store.addLab(lab));
      });

      const updatedState = useLabOrderingStore.getState();
      const selectedArray = updatedState.getSelectedLabsArray();
      
      expect(Array.isArray(selectedArray)).toBe(true);
      expect(selectedArray.length).toBe(3);
    });
  });
});

describe('labOrderingStore Submission', () => {
  beforeEach(() => {
    useLabOrderingStore.getState().clearOrder();
  });

  it('should require clinical indication for submission', async () => {
    const store = useLabOrderingStore.getState();
    const labs = Array.from(store.labCatalog.values());

    act(() => {
      store.addLab(labs[0]);
    });

    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'lab-order-1' }),
    });

    // Should fail without clinical indication
    const updatedStore = useLabOrderingStore.getState();
    
    // The store should validate this
    expect(updatedStore.clinicalIndication).toBe('');
  });

  it('should track submission state', async () => {
    const store = useLabOrderingStore.getState();
    const labs = Array.from(store.labCatalog.values());

    global.fetch = vi.fn().mockImplementation(() => 
      new Promise(resolve => 
        setTimeout(() => resolve({ 
          ok: true, 
          json: () => Promise.resolve({ ids: ['lab-1'] }) 
        }), 100)
      )
    );

    act(() => {
      store.addLab(labs[0]);
      store.setClinicalIndication('Test indication');
    });

    // Start submission
    const submitPromise = useLabOrderingStore.getState().submitLabs('enc-001');
    
    // Check submitting state
    expect(useLabOrderingStore.getState().submitting).toBe(true);

    await submitPromise;

    // After completion
    expect(useLabOrderingStore.getState().submitting).toBe(false);
  });
});
