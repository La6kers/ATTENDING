import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

// ---------------------------------------------------------------------------
// POST /api/overrides — Record one or more override events (batch)
// ---------------------------------------------------------------------------
// Body: { events: [ { encounter_id, ai_interaction_id?, stage, suggestion_type,
//                      ai_suggestion, clinician_action, clinician_value?, provider_name? } ] }
//
// Designed for fire-and-forget from the frontend — the clinician never waits
// on this call.  Accepts an array so a single transition (e.g. "Proceed to
// Charting") can flush every pending override in one round-trip.
// ---------------------------------------------------------------------------
router.post('/', (req, res) => {
  try {
    const { events } = req.body;
    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: 'events array is required' });
    }

    const VALID_ACTIONS = ['accepted', 'modified', 'rejected', 'added'];
    const inserted = [];

    for (const evt of events) {
      const {
        encounter_id,
        ai_interaction_id,
        stage,
        suggestion_type,
        ai_suggestion,
        clinician_action,
        clinician_value,
        provider_name,
      } = evt;

      if (!encounter_id || !stage || !suggestion_type || !ai_suggestion || !clinician_action) {
        continue; // skip malformed entries silently — don't block the batch
      }
      if (!VALID_ACTIONS.includes(clinician_action)) continue;

      const result = db.execute(
        `INSERT INTO ai_suggestion_overrides
           (encounter_id, ai_interaction_id, stage, suggestion_type,
            ai_suggestion, clinician_action, clinician_value, provider_name)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          parseInt(encounter_id),
          ai_interaction_id ? parseInt(ai_interaction_id) : null,
          stage,
          suggestion_type,
          typeof ai_suggestion === 'string' ? ai_suggestion : JSON.stringify(ai_suggestion),
          clinician_action,
          clinician_value || null,
          provider_name || 'Dr. Demo',
        ]
      );
      inserted.push(result.lastInsertRowid);
    }

    res.status(201).json({ recorded: inserted.length, ids: inserted });
  } catch (err) {
    console.error('Override record error:', err);
    res.status(500).json({ error: 'Failed to record overrides', details: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/overrides/encounter/:id — All overrides for a single encounter
// ---------------------------------------------------------------------------
router.get('/encounter/:id', (req, res) => {
  try {
    const rows = db.queryAll(
      `SELECT o.*, ai.interaction_type, ai.created_at as ai_created_at
       FROM ai_suggestion_overrides o
       LEFT JOIN ai_interactions ai ON o.ai_interaction_id = ai.id
       WHERE o.encounter_id = ?
       ORDER BY o.created_at ASC`,
      [parseInt(req.params.id)]
    );
    res.json(rows);
  } catch (err) {
    console.error('Override query error:', err);
    res.status(500).json({ error: 'Query failed', details: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/overrides/analytics — Aggregate override statistics
// ---------------------------------------------------------------------------
// Query params (all optional):
//   stage          — filter to a workflow stage
//   suggestion_type — filter to a suggestion type
//   provider_name  — filter to a single provider
//   since          — ISO date string, only events after this date
//
// Returns per-(stage, suggestion_type) breakdown with acceptance rate, etc.
// ---------------------------------------------------------------------------
router.get('/analytics', (req, res) => {
  try {
    const { stage, suggestion_type, provider_name, since } = req.query;

    let where = '1=1';
    const params = [];

    if (stage) { where += ' AND stage = ?'; params.push(stage); }
    if (suggestion_type) { where += ' AND suggestion_type = ?'; params.push(suggestion_type); }
    if (provider_name) { where += ' AND provider_name = ?'; params.push(provider_name); }
    if (since) { where += ' AND created_at >= ?'; params.push(since); }

    // Aggregate counts by stage + suggestion_type + action
    const breakdown = db.queryAll(
      `SELECT stage, suggestion_type, clinician_action, COUNT(*) as count
       FROM ai_suggestion_overrides
       WHERE ${where}
       GROUP BY stage, suggestion_type, clinician_action
       ORDER BY stage, suggestion_type, clinician_action`,
      params
    );

    // Summary totals
    const summary = db.queryAll(
      `SELECT clinician_action, COUNT(*) as count
       FROM ai_suggestion_overrides
       WHERE ${where}
       GROUP BY clinician_action`,
      params
    );

    const total = summary.reduce((s, r) => s + r.count, 0);
    const accepted = summary.find(r => r.clinician_action === 'accepted')?.count || 0;
    const modified = summary.find(r => r.clinician_action === 'modified')?.count || 0;
    const rejected = summary.find(r => r.clinician_action === 'rejected')?.count || 0;
    const added = summary.find(r => r.clinician_action === 'added')?.count || 0;

    res.json({
      total,
      acceptance_rate: total ? ((accepted / total) * 100).toFixed(1) + '%' : '0%',
      modification_rate: total ? ((modified / total) * 100).toFixed(1) + '%' : '0%',
      rejection_rate: total ? ((rejected / total) * 100).toFixed(1) + '%' : '0%',
      clinician_addition_rate: total ? ((added / total) * 100).toFixed(1) + '%' : '0%',
      summary,
      breakdown,
    });
  } catch (err) {
    console.error('Override analytics error:', err);
    res.status(500).json({ error: 'Analytics query failed', details: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/overrides/analytics/providers — Per-provider override patterns
// ---------------------------------------------------------------------------
router.get('/analytics/providers', (req, res) => {
  try {
    const { since } = req.query;
    let where = '1=1';
    const params = [];
    if (since) { where += ' AND created_at >= ?'; params.push(since); }

    const rows = db.queryAll(
      `SELECT provider_name, clinician_action, COUNT(*) as count
       FROM ai_suggestion_overrides
       WHERE ${where}
       GROUP BY provider_name, clinician_action
       ORDER BY provider_name, clinician_action`,
      params
    );

    // Reshape into { provider: { accepted, modified, rejected, added, total, acceptance_rate } }
    const providers = {};
    for (const row of rows) {
      if (!providers[row.provider_name]) {
        providers[row.provider_name] = { accepted: 0, modified: 0, rejected: 0, added: 0, total: 0 };
      }
      providers[row.provider_name][row.clinician_action] = row.count;
      providers[row.provider_name].total += row.count;
    }
    for (const name of Object.keys(providers)) {
      const p = providers[name];
      p.acceptance_rate = p.total ? ((p.accepted / p.total) * 100).toFixed(1) + '%' : '0%';
    }

    res.json(providers);
  } catch (err) {
    console.error('Provider analytics error:', err);
    res.status(500).json({ error: 'Provider analytics failed', details: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/overrides/analytics/suggestions — Which suggestions are most/least trusted
// ---------------------------------------------------------------------------
// Returns each (stage, suggestion_type) ranked by acceptance rate, with
// the most-overridden suggestions first — directly useful for prompt tuning.
// ---------------------------------------------------------------------------
router.get('/analytics/suggestions', (req, res) => {
  try {
    const { since } = req.query;
    let where = '1=1';
    const params = [];
    if (since) { where += ' AND created_at >= ?'; params.push(since); }

    const rows = db.queryAll(
      `SELECT
         stage,
         suggestion_type,
         COUNT(*) as total,
         SUM(CASE WHEN clinician_action = 'accepted' THEN 1 ELSE 0 END) as accepted,
         SUM(CASE WHEN clinician_action = 'modified' THEN 1 ELSE 0 END) as modified,
         SUM(CASE WHEN clinician_action = 'rejected' THEN 1 ELSE 0 END) as rejected
       FROM ai_suggestion_overrides
       WHERE ${where}
       GROUP BY stage, suggestion_type
       ORDER BY
         CAST(SUM(CASE WHEN clinician_action = 'accepted' THEN 1 ELSE 0 END) AS REAL) / COUNT(*) ASC`,
      params
    );

    const results = rows.map(r => ({
      ...r,
      acceptance_rate: ((r.accepted / r.total) * 100).toFixed(1) + '%',
      override_rate: (((r.modified + r.rejected) / r.total) * 100).toFixed(1) + '%',
    }));

    res.json(results);
  } catch (err) {
    console.error('Suggestion analytics error:', err);
    res.status(500).json({ error: 'Suggestion analytics failed', details: err.message });
  }
});

export default router;
