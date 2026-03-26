/**
 * useOverrideTracker — Passive clinician-override capture
 *
 * Collects override events in memory, then flushes them to the backend in a
 * single batch POST when the clinician transitions to the next workflow step.
 * The flush is fire-and-forget (no await in the critical path) so it never
 * blocks the UI or adds clicks.
 *
 * Usage pattern in each page:
 *   const { trackSuggestion, flush } = useOverrideTracker(encounterId);
 *
 *   // When AI response arrives, register each suggestion item:
 *   trackSuggestion({ stage, suggestion_type, ai_suggestion });
 *
 *   // When the clinician edits/accepts/ignores, call:
 *   recordAction(id, 'modified', clinicianValue);
 *
 *   // On transition ("Proceed to Charting"), flush pending events:
 *   flush();  // non-blocking
 */
import { useRef, useCallback } from 'react';

const API = '/api/overrides';

export default function useOverrideTracker(encounterId) {
  // Map of trackingId -> { stage, suggestion_type, ai_suggestion, clinician_action, clinician_value }
  const pending = useRef(new Map());
  const nextId = useRef(0);

  /**
   * Register a single AI suggestion item for tracking.
   * Returns a tracking ID the caller can use with recordAction().
   */
  const trackSuggestion = useCallback(({ stage, suggestion_type, ai_suggestion }) => {
    const id = nextId.current++;
    pending.current.set(id, {
      stage,
      suggestion_type,
      ai_suggestion,
      clinician_action: 'accepted', // default: assume accepted unless overridden
      clinician_value: null,
    });
    return id;
  }, []);

  /**
   * Register multiple suggestions at once (convenience for list responses).
   * Returns an array of tracking IDs.
   */
  const trackSuggestions = useCallback(({ stage, suggestion_type, items }) => {
    return items.map(ai_suggestion =>
      trackSuggestion({ stage, suggestion_type, ai_suggestion })
    );
  }, [trackSuggestion]);

  /**
   * Record the clinician's action on a tracked suggestion.
   */
  const recordAction = useCallback((trackingId, action, clinician_value = null) => {
    const entry = pending.current.get(trackingId);
    if (entry) {
      entry.clinician_action = action;
      entry.clinician_value = clinician_value;
    }
  }, []);

  /**
   * Record a clinician-added item (something the AI did not suggest).
   */
  const recordAddition = useCallback(({ stage, suggestion_type, clinician_value }) => {
    const id = nextId.current++;
    pending.current.set(id, {
      stage,
      suggestion_type,
      ai_suggestion: '(none — clinician added)',
      clinician_action: 'added',
      clinician_value,
    });
    return id;
  }, []);

  /**
   * Diff-based tracking: compare AI suggestions against what was actually used.
   * Automatically determines accepted/modified/rejected/added for each item.
   *
   * @param {Object} opts
   * @param {string} opts.stage - workflow stage
   * @param {string} opts.suggestion_type - e.g. 'icd10_code'
   * @param {string[]} opts.aiItems - what the AI suggested
   * @param {string[]} opts.finalItems - what the clinician actually submitted
   * @param {Function} opts.normalize - optional normalizer for comparison (e.g. extract code prefix)
   */
  const diffTrack = useCallback(({ stage, suggestion_type, aiItems, finalItems, normalize }) => {
    const norm = normalize || (x => (typeof x === 'string' ? x.trim().toLowerCase() : JSON.stringify(x)));
    const aiNormed = (aiItems || []).map(norm);
    const finalNormed = (finalItems || []).map(norm);

    // For each AI suggestion: accepted if present in final, rejected if not
    for (let i = 0; i < (aiItems || []).length; i++) {
      const matchIdx = finalNormed.indexOf(aiNormed[i]);
      const id = nextId.current++;
      if (matchIdx !== -1) {
        pending.current.set(id, {
          stage,
          suggestion_type,
          ai_suggestion: typeof aiItems[i] === 'string' ? aiItems[i] : JSON.stringify(aiItems[i]),
          clinician_action: 'accepted',
          clinician_value: null,
        });
      } else {
        // Check for partial match (modification)
        const partialMatch = finalNormed.find(f => f.includes(aiNormed[i]) || aiNormed[i].includes(f));
        pending.current.set(id, {
          stage,
          suggestion_type,
          ai_suggestion: typeof aiItems[i] === 'string' ? aiItems[i] : JSON.stringify(aiItems[i]),
          clinician_action: partialMatch ? 'modified' : 'rejected',
          clinician_value: partialMatch || null,
        });
      }
    }

    // For each final item not in AI suggestions: clinician added
    for (let i = 0; i < (finalItems || []).length; i++) {
      if (!aiNormed.includes(finalNormed[i])) {
        const id = nextId.current++;
        pending.current.set(id, {
          stage,
          suggestion_type,
          ai_suggestion: '(none — clinician added)',
          clinician_action: 'added',
          clinician_value: typeof finalItems[i] === 'string' ? finalItems[i] : JSON.stringify(finalItems[i]),
        });
      }
    }
  }, []);

  /**
   * Flush all pending events to the backend.  Fire-and-forget — returns
   * immediately and does not block the caller.
   */
  const flush = useCallback(() => {
    if (!encounterId || pending.current.size === 0) return;

    const events = Array.from(pending.current.values()).map(evt => ({
      encounter_id: encounterId,
      ...evt,
    }));

    // Clear immediately so double-flush is harmless
    pending.current = new Map();

    // Fire-and-forget POST
    fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events }),
    }).catch(err => {
      console.warn('Override tracking flush failed (non-fatal):', err);
    });
  }, [encounterId]);

  return {
    trackSuggestion,
    trackSuggestions,
    recordAction,
    recordAddition,
    diffTrack,
    flush,
  };
}
