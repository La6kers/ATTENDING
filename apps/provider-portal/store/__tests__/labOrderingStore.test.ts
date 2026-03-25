// Lab Ordering Store Tests
// apps/provider-portal/store/__tests__/labOrderingStore.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useLabOrderingStore } from '../labOrderingStore';
import { act } from 'react-dom/test-utils';

// Reset store before each test
beforeEach(() => {
  const store = useLabOrderingStore.getState();
  store.clearOrder();
  vi.clearAllMocks();
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
      expect(state.isLoading).toBe(false);
      expect(state.isSubmitting).toBe(false);
    });
  });

  describe('Lab Selection', () => {
    it('should add a lab to selection by object', () => {
      const store = useLabOrderingStore.getState();
      const labs = Array.from(store.labCatalog.values());
      const testLab = labs[0];

      act(() => {
        store.addLab(testLab);
      });

      const updatedState = useLabOrderingStore.getState();
      expect(updatedState.selectedLabs.has(testLab.code)).toBe(true);
    });

    it('should add a lab to selection by code', () => {
      const store = useLabOrderingStore.getState();

      act(() => {
        store.addLab('CBC');
      });

      const updatedState = useLabOrderingStore.getState();
      expect(updatedState.selectedLabs.has('CBC')).toBe(true);
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
        store.setDefaultPriority('ASAP');
      });

      const labs = Array.from(store.labCatalog.values());
      
      act(() => {
        store.addLab(labs[0]);
      });

      const updatedState = useLabOrderingStore.getState();
      const selectedLab = updatedState.selectedLabs.get(labs[0].code);
      expect(selectedLab?.priority).toBe('ASAP');
    });

    it('should add lab with specific priority option', () => {
      const store = useLabOrderingStore.getState();
      
      act(() => {
        store.addLab('CBC', { priority: 'STAT' });
      });

      const updatedState = useLabOrderingStore.getState();
      const selectedLab = updatedState.selectedLabs.get('CBC');
      expect(selectedLab?.priority).toBe('STAT');
    });
  });

  describe('Lab Panels', () => {
    it('should add BMP panel', () => {
      const store = useLabOrderingStore.getState();
      
      act(() => {
        store.addLabPanel('BMP');
      });

      const updatedState = useLabOrderingStore.getState();
      expect(updatedState.selectedLabs.size).toBeGreaterThanOrEqual(1);
      expect(updatedState.selectedLabs.has('BMP')).toBe(true);
    });

    it('should add CMP panel', () => {
      const store = useLabOrderingStore.getState();
      
      act(() => {
        store.addLabPanel('CMP');
      });

      const updatedState = useLabOrderingStore.getState();
      expect(updatedState.selectedLabs.has('CMP')).toBe(true);
    });

    it('should add cardiac panel', () => {
      const store = useLabOrderingStore.getState();
      
      act(() => {
        store.addLabPanel('CARDIAC');
      });

      const updatedState = useLabOrderingStore.getState();
      // CARDIAC panel includes TROP-I and BNP
      expect(updatedState.selectedLabs.has('TROP-I')).toBe(true);
      expect(updatedState.selectedLabs.has('BNP')).toBe(true);
    });

    it('should not duplicate labs when adding panel with existing labs', () => {
      const store = useLabOrderingStore.getState();

      act(() => {
        store.addLab('BMP');
        store.addLabPanel('BMP');
      });

      const updatedState = useLabOrderingStore.getState();
      // BMP should only appear once
      const bmpCount = Array.from(updatedState.selectedLabs.values())
        .filter(l => l.lab.code === 'BMP').length;
      expect(bmpCount).toBe(1);
    });
  });

  describe('Fasting Requirements', () => {
    it('should calculate fasting required correctly', () => {
      const store = useLabOrderingStore.getState();
      
      // LIPID panel requires fasting
      act(() => {
        store.addLab('LIPID');
      });

      const updatedState = useLabOrderingStore.getState();
      expect(updatedState.requiresFasting()).toBe(true);
    });

    it('should return false when no fasting labs selected', () => {
      const store = useLabOrderingStore.getState();
      
      // CBC doesn't require fasting
      act(() => {
        store.addLab('CBC');
      });

      const updatedState = useLabOrderingStore.getState();
      expect(updatedState.requiresFasting()).toBe(false);
    });
  });

  describe('Cost Estimation', () => {
    it('should calculate total cost', () => {
      const store = useLabOrderingStore.getState();

      act(() => {
        store.addLab('CBC');
        store.addLab('BMP');
        store.addLab('TSH');
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
      const filteredLabs = updatedState.getFilteredLabs();
      
      expect(filteredLabs.length).toBeGreaterThan(0);
      filteredLabs.forEach(lab => {
        const matchesSearch = 
          lab.name.toLowerCase().includes('glucose') ||
          lab.code.toLowerCase().includes('glucose') ||
          lab.description?.toLowerCase().includes('glucose');
        expect(matchesSearch).toBe(true);
      });
    });

    it('should filter labs by category', () => {
      const store = useLabOrderingStore.getState();
      
      act(() => {
        store.setCategoryFilter('chemistry');
      });

      const updatedState = useLabOrderingStore.getState();
      const filteredLabs = updatedState.getFilteredLabs();
      
      filteredLabs.forEach(lab => {
        expect(lab.category).toBe('chemistry');
      });
    });

    it('should reset filters', () => {
      const store = useLabOrderingStore.getState();
      
      act(() => {
        store.setSearchQuery('test');
        store.setCategoryFilter('chemistry');
        store.resetFilters();
      });

      const updatedState = useLabOrderingStore.getState();
      expect(updatedState.searchQuery).toBe('');
      expect(updatedState.categoryFilter).toBe('all');
    });
  });

  describe('STAT Count', () => {
    it('should count STAT priority labs', () => {
      const store = useLabOrderingStore.getState();

      act(() => {
        store.addLab('CBC', { priority: 'STAT' });
        store.addLab('BMP', { priority: 'STAT' });
        store.addLab('TSH', { priority: 'STAT' });
      });

      const updatedState = useLabOrderingStore.getState();
      expect(updatedState.getStatCount()).toBe(3);
    });

    it('should return 0 when no STAT labs', () => {
      const store = useLabOrderingStore.getState();

      act(() => {
        store.addLab('CBC', { priority: 'ROUTINE' });
        store.addLab('BMP', { priority: 'ROUTINE' });
      });

      const updatedState = useLabOrderingStore.getState();
      expect(updatedState.getStatCount()).toBe(0);
    });
  });

  describe('AI Recommendations', () => {
    it('should load AI recommendations with fallback', async () => {
      const store = useLabOrderingStore.getState();

      // Mock fetch to fail (triggering fallback)
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
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
        rec => rec.labCode === 'TROP-I'
      );
      expect(hasTroponin).toBe(true);
    });

    it('should generate fallback recommendations for fever', async () => {
      const store = useLabOrderingStore.getState();

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
      });

      await act(async () => {
        await store.loadAIRecommendations('patient-1', {
          chiefComplaint: 'fever',
          redFlags: [],
        });
      });

      const updatedState = useLabOrderingStore.getState();
      // Should include CBC for fever
      const hasCBC = updatedState.aiRecommendations.some(
        rec => rec.labCode === 'CBC-DIFF'
      );
      expect(hasCBC).toBe(true);
    });
  });

  describe('Clear Order', () => {
    it('should clear all selected labs', () => {
      const store = useLabOrderingStore.getState();

      act(() => {
        store.addLab('CBC');
        store.addLab('BMP');
        store.addLab('TSH');
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

    it('should reset default priority', () => {
      const store = useLabOrderingStore.getState();

      act(() => {
        store.setDefaultPriority('STAT');
        store.clearOrder();
      });

      const updatedState = useLabOrderingStore.getState();
      expect(updatedState.defaultPriority).toBe('ROUTINE');
    });
  });

  describe('Computed Values', () => {
    it('should correctly get selected labs as array', () => {
      const store = useLabOrderingStore.getState();

      act(() => {
        store.addLab('CBC');
        store.addLab('BMP');
        store.addLab('TSH');
      });

      const updatedState = useLabOrderingStore.getState();
      const selectedArray = updatedState.getSelectedLabsArray();
      
      expect(Array.isArray(selectedArray)).toBe(true);
      expect(selectedArray.length).toBe(3);
    });

    it('should check if can submit', () => {
      const store = useLabOrderingStore.getState();

      // Initially cannot submit (no labs or indication)
      expect(store.canSubmit()).toBe(false);

      act(() => {
        store.addLab('CBC');
      });
      
      // Still cannot submit (no indication)
      expect(useLabOrderingStore.getState().canSubmit()).toBe(false);

      act(() => {
        store.setClinicalIndication('Routine screening');
      });

      // Now can submit
      expect(useLabOrderingStore.getState().canSubmit()).toBe(true);
    });
  });
});

describe('labOrderingStore Submission', () => {
  beforeEach(() => {
    useLabOrderingStore.getState().clearOrder();
    vi.clearAllMocks();
  });

  it('should require clinical indication for submission', async () => {
    const store = useLabOrderingStore.getState();

    act(() => {
      store.addLab('CBC');
    });

    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'lab-order-1' }),
    });

    // Should return false without clinical indication
    const result = await useLabOrderingStore.getState().submitOrder('enc-001');
    expect(result).toBe(false);
    expect(useLabOrderingStore.getState().error).toContain('indication');
  });

  it('should require labs for submission', async () => {
    const store = useLabOrderingStore.getState();

    act(() => {
      store.setClinicalIndication('Test indication');
    });

    // Should return false without labs
    const result = await useLabOrderingStore.getState().submitOrder('enc-001');
    expect(result).toBe(false);
    expect(useLabOrderingStore.getState().error).toContain('labs');
  });

  it('should track submission state', async () => {
    const store = useLabOrderingStore.getState();

    global.fetch = vi.fn().mockImplementation(() => 
      new Promise(resolve => 
        setTimeout(() => resolve({ 
          ok: true, 
          json: () => Promise.resolve({ id: 'lab-1' }) 
        }), 50)
      )
    );

    act(() => {
      store.addLab('CBC');
      store.setClinicalIndication('Test indication');
    });

    // Start submission
    const submitPromise = useLabOrderingStore.getState().submitOrder('enc-001');
    
    // Check submitting state
    expect(useLabOrderingStore.getState().isSubmitting).toBe(true);

    await submitPromise;

    // After completion
    expect(useLabOrderingStore.getState().isSubmitting).toBe(false);
  });

  it('should clear order after successful submission', async () => {
    const store = useLabOrderingStore.getState();

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'lab-order-1' }),
    });

    act(() => {
      store.addLab('CBC');
      store.setClinicalIndication('Test indication');
    });

    await useLabOrderingStore.getState().submitOrder('enc-001');

    const updatedState = useLabOrderingStore.getState();
    expect(updatedState.selectedLabs.size).toBe(0);
    expect(updatedState.clinicalIndication).toBe('');
  });

  it('should handle submission errors', async () => {
    const store = useLabOrderingStore.getState();

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Server error' }),
    });

    act(() => {
      store.addLab('CBC');
      store.setClinicalIndication('Test indication');
    });

    const result = await useLabOrderingStore.getState().submitOrder('enc-001');
    
    expect(result).toBe(false);
    expect(useLabOrderingStore.getState().error).toBeTruthy();
    expect(useLabOrderingStore.getState().isSubmitting).toBe(false);
  });
});
