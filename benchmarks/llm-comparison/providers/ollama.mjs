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
  'You are a clinical decision support AI that produces ONLY differential diagnoses. ' +
  'CRITICAL: Your entire response must be ONLY a numbered list of diagnosis names. ' +
  'Do NOT summarize the case. Do NOT write a clinical narrative. Do NOT explain your reasoning. ' +
  'Respond with EXACTLY 5 lines in this format:\n' +
  '1. [Diagnosis]\n2. [Diagnosis]\n3. [Diagnosis]\n4. [Diagnosis]\n5. [Diagnosis]\n' +
  'Nothing else. No preamble. No explanation. Just the numbered diagnoses.';

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
  // Strip special tokens and artifacts
  text = text.replace(/<\|[^>]*\|>/g, '').replace(/^Example:[\s\S]*/m, '');
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

  // Fallback: if model wrote a narrative instead of a list, try to extract
  // common diagnosis terms after keywords like "diagnoses:", "differential:", etc.
  if (diffs.length === 0 && text.length > 50) {
    // Look for patterns like "Diagnosis: X" or "Assessment: X" or "Differential: X"
    const dxSection = text.match(/(?:diagnos[ie]s?|differential|assessment|impression|likely|consider)[:\s]*([^\n]+)/gi);
    if (dxSection) {
      for (const match of dxSection) {
        const cleaned = match.replace(/^(?:diagnos[ie]s?|differential|assessment|impression|likely|consider)[:\s]*/i, '').trim();
        const parts = cleaned.split(/[,;]/);
        for (const part of parts) {
          const dx = part.trim().replace(/[*_`"]/g, '').replace(/\.$/, '');
          if (dx && dx.length > 2 && dx.length < 120 && !dx.match(/^(?:the|a|an|is|are|was|and|or|but|this|that|which|who|may|can|could|should|would|will|has|have|had|been|being|with|from|for|not)\b/i)) {
            diffs.push({ diagnosis: dx, confidence: Math.max(5, 80 - diffs.length * 15) });
          }
          if (diffs.length >= 5) break;
        }
        if (diffs.length >= 5) break;
      }
    }
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
  const t0 = Date.now();
  try {
    // Try /api/chat first; fall back to /api/generate for base models
    // that don't handle chat format well (e.g., BioMistral).
    let content = '';
    let json;
    const chatUrl = `${baseUrl}/api/chat`;
    const genUrl = `${baseUrl}/api/generate`;

    const chatBody = {
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(kase) },
      ],
      stream: false,
      options: { temperature: 0.2, top_p: 0.9, num_predict: 512 },
    };

    const resp = await fetch(chatUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(chatBody),
    });
    const latencyMs = Date.now() - t0;
    if (!resp.ok) {
      const errText = await resp.text();
      return { ok: false, latencyMs, differentials: [], raw: { status: resp.status, error: errText } };
    }
    json = await resp.json();
    content = json?.message?.content || '';

    // If chat response is garbled/empty/echo, retry with /api/generate (completion mode)
    const parsed = parseOllamaResponse(content);
    if (parsed.length === 0) {
      // Use a more direct completion-style prompt for base models
      const b = kase.body;
      const hpi = b.hpi || {};
      const assoc = Array.isArray(hpi.associated) ? hpi.associated.join(', ') : '';
      const completionPrompt = [
        'Example:',
        'Patient: 45-year-old male with sore throat and fever for 3 days.',
        'Differential diagnoses:',
        '1. Streptococcal pharyngitis',
        '2. Viral pharyngitis',
        '3. Infectious mononucleosis',
        '4. Peritonsillar abscess',
        '5. Epiglottitis',
        '',
        `Patient: ${b.age}-year-old ${b.gender || 'patient'} presenting with: "${b.chiefComplaint}".`,
        hpi.onset ? `Onset: ${hpi.onset}.` : null,
        hpi.duration ? `Duration: ${hpi.duration}.` : null,
        hpi.severity != null ? `Severity: ${hpi.severity}/10.` : null,
        assoc ? `Associated symptoms: ${assoc}.` : null,
        'Differential diagnoses:',
        '1.',
      ].filter(Boolean).join('\n');
      const genBody = {
        model,
        prompt: completionPrompt,
        stream: false,
        options: { temperature: 0.3, top_p: 0.9, num_predict: 200, stop: ['\n\n', '6.', 'Example:', 'Patient:', '<|im'] },
      };
      const genResp = await fetch(genUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(genBody),
      });
      if (genResp.ok) {
        const genJson = await genResp.json();
        const genContent = '1.' + (genJson?.response || '');
        const genParsed = parseOllamaResponse(genContent);
        if (genParsed.length > 0) {
          content = genContent;
          json = genJson;
        }
      }
    }
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
