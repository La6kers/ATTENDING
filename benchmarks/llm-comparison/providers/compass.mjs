// ============================================================
// COMPASS provider — posts to the local Bayesian diagnostic API.
//
// Depends on the COMPASS dev server running:
//   npm run --workspace=compass-standalone dev  (listens on :3005)
//
// Respects COMPASS rate limit (20/min) — caller must throttle.
// ============================================================

/**
 * @param {object} kase          A case object with .body (chiefComplaint, age, gender, hpi, etc.)
 * @param {object} opts          { compassUrl }
 * @returns {Promise<{ok, latencyMs, differentials, raw}>}
 */
export async function runCompass(kase, opts = {}) {
  const baseUrl = opts.compassUrl || 'http://localhost:3005';
  const url = `${baseUrl}/api/diagnose`;
  const t0 = Date.now();
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(kase.body),
    });
    const latencyMs = Date.now() - t0;
    if (!resp.ok) {
      return { ok: false, latencyMs, differentials: [], raw: { status: resp.status, error: await resp.text() } };
    }
    const json = await resp.json();
    const diffs = json?.differentials?.differentials || [];
    const primary = json?.differentials?.primaryDiagnosis;
    // Normalize to [{diagnosis, confidence}]
    const differentials = [];
    if (primary?.diagnosis && !diffs.find(d => d.diagnosis === primary.diagnosis)) {
      differentials.push({ diagnosis: primary.diagnosis, confidence: primary.confidence });
    }
    for (const d of diffs) {
      differentials.push({ diagnosis: d.diagnosis, confidence: d.confidence });
    }
    return { ok: true, latencyMs, differentials, raw: json };
  } catch (e) {
    return { ok: false, latencyMs: Date.now() - t0, differentials: [], raw: { error: e.message } };
  }
}

export const COMPASS_INFO = {
  name: 'compass',
  displayName: 'COMPASS (Bayesian engine)',
  defaultDelayMs: 3500, // respect COMPASS rate limit
};
