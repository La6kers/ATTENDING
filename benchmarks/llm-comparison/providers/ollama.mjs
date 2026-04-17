// ============================================================
// Ollama provider — generic wrapper for any Ollama model.
//
// Supports BioMistral, Meditron, Llama3, or any model available via
// `ollama pull <model>`. Assumes Ollama is running on localhost:11434.
//
// Uses a standardized clinical prompt; parses numbered-list response.
// ============================================================

// Default Ollama tag mappings — edit these if your ollama registry uses
// different namespaces (e.g., alibayram/biomistral vs cniongolo/biomistral).
export const MODEL_TAGS = {
  biomistral: 'cniongolo/biomistral',
  meditron: 'meditron',
  llama3: 'llama3.1:8b',
};

const SYSTEM_PROMPT =
  'You are a clinical decision support AI. You produce differential diagnoses based on patient presentation. ' +
  'You respond ONLY with a numbered list of diagnosis names, no explanations, no preambles.';

function buildUserPrompt(kase) {
  const b = kase.body;
  const hpi = b.hpi || {};
  const assoc = Array.isArray(hpi.associated) ? hpi.associated.join(', ') : (hpi.associated || '');
  const aggr = Array.isArray(hpi.aggravating) ? hpi.aggravating.join(', ') : (hpi.aggravating || '');
  const reli = Array.isArray(hpi.relieving) ? hpi.relieving.join(', ') : (hpi.relieving || '');
  return [
    `PATIENT PRESENTATION:`,
    `- Age: ${b.age} ${b.gender === 'female' ? 'year-old female' : b.gender === 'male' ? 'year-old male' : 'year-old'}`,
    `- Setting: ${kase.setting || 'unknown'}`,
    `- Chief complaint: "${b.chiefComplaint}"`,
    hpi.onset ? `- Onset: ${hpi.onset}` : null,
    hpi.duration ? `- Duration: ${hpi.duration}` : null,
    hpi.location ? `- Location: ${hpi.location}` : null,
    hpi.character ? `- Character: ${hpi.character}` : null,
    hpi.severity != null ? `- Severity: ${hpi.severity}/10` : null,
    aggr ? `- Aggravating factors: ${aggr}` : null,
    reli ? `- Relieving factors: ${reli}` : null,
    assoc ? `- Associated symptoms: ${assoc}` : null,
    '',
    'Provide the TOP 5 most likely diagnoses in order of likelihood.',
    'Respond in EXACTLY this format — one diagnosis per line, numbered, no explanations:',
    '1. [Diagnosis name]',
    '2. [Diagnosis name]',
    '3. [Diagnosis name]',
    '4. [Diagnosis name]',
    '5. [Diagnosis name]',
  ].filter(Boolean).join('\n');
}

// Parse the model's numbered-list response into [{diagnosis, confidence}]
export function parseOllamaResponse(text) {
  const diffs = [];
  if (!text) return diffs;
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    // Match patterns like "1. Diagnosis", "1) Diagnosis", "- Diagnosis", "1: Diagnosis"
    const m = line.match(/^\s*(?:\d+[.):]|\-|\*)\s*(.+?)\s*$/);
    if (m) {
      let dx = m[1].trim();
      // Strip trailing parentheticals/explanations if model ignored instruction
      dx = dx.split(/\s+[\u2014\-]\s+/)[0].trim(); // em-dash/dash separator
      dx = dx.split(/\s*\(.*\)\s*$/)[0].trim(); // trailing (...)
      dx = dx.replace(/[*_`]/g, ''); // strip markdown emphasis
      if (dx && dx.length < 120) {
        diffs.push({ diagnosis: dx, confidence: Math.max(5, 95 - diffs.length * 15) });
      }
    }
    if (diffs.length >= 10) break;
  }
  return diffs;
}

/**
 * Run a single case against Ollama.
 * @param {object} kase
 * @param {object} opts { ollamaUrl, model }
 */
export async function runOllama(kase, opts = {}) {
  const baseUrl = opts.ollamaUrl || 'http://localhost:11434';
  const model = opts.model || MODEL_TAGS.biomistral;
  const url = `${baseUrl}/api/chat`;
  const t0 = Date.now();
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserPrompt(kase) },
        ],
        stream: false,
        options: {
          temperature: 0.2, // low for clinical consistency
          top_p: 0.9,
          num_predict: 256,
        },
      }),
    });
    const latencyMs = Date.now() - t0;
    if (!resp.ok) {
      const errText = await resp.text();
      return { ok: false, latencyMs, differentials: [], raw: { status: resp.status, error: errText } };
    }
    const json = await resp.json();
    const content = json?.message?.content || '';
    const differentials = parseOllamaResponse(content);
    return {
      ok: differentials.length > 0,
      latencyMs,
      differentials,
      raw: { content, model, prompt_eval_count: json.prompt_eval_count, eval_count: json.eval_count },
    };
  } catch (e) {
    return { ok: false, latencyMs: Date.now() - t0, differentials: [], raw: { error: e.message } };
  }
}

export const OLLAMA_INFO = {
  name: 'ollama',
  defaultDelayMs: 100, // LLMs naturally throttle themselves by inference time
};
