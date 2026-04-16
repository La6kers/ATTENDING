// ============================================================
// ATTENDING AI — LLM Chief Complaint Normalizer (Tier 3)
//
// Translates patient layman language into standard medical
// terminology using a fast, cheap LLM (Claude Haiku or
// GPT-4o-mini). This is a TRANSLATOR, not a diagnostician —
// the Bayesian engine still makes the clinical call.
//
// Only invoked when Tier 1 (synonym expansion) and Tier 2
// (conversational clarification) both fail to produce a
// recognized medical term.
//
// Design constraints:
//   - 3-second timeout — never block the pipeline
//   - Never throws — returns original CC on any failure
//   - No PII in extractedTerms — only medical vocabulary
//   - max_tokens: 150 — response is a small JSON object
//   - Zero new dependencies — uses raw fetch()
// ============================================================

export interface CCNormalizationResult {
  /** Original CC with medical terms appended (same pattern as synonym normalizer) */
  normalizedCC: string;
  /** Individual medical terms the LLM identified */
  extractedTerms: string[];
  /** Whether the LLM was actually called */
  llmUsed: boolean;
  /** Which provider was used */
  provider: 'anthropic' | 'azure-openai' | 'none';
  /** Round-trip latency in milliseconds */
  latencyMs: number;
}

// ============================================================
// System prompt — tightly scoped to TRANSLATION only
// ============================================================

const SYSTEM_PROMPT = `You are a medical terminology normalizer for a clinical triage system.

TASK: Convert the patient's plain-language description into standard medical terms.

RULES:
1. ONLY normalize language. Do NOT diagnose conditions or suggest causes.
2. Extract individual medical symptom terms from the description.
3. If the input already uses proper medical terminology, return it unchanged.
4. Include anatomical locations, symptom qualities, and associated findings.
5. Age and gender are provided ONLY for anatomical context.
6. Be concise. Return 3-8 medical terms maximum.

RESPOND WITH JSON ONLY — no markdown, no explanation:
{"normalizedCC":"<chief complaint restated in medical terms>","extractedTerms":["term1","term2"]}`;

// ============================================================
// Config resolution
// ============================================================

interface ResolvedConfig {
  provider: 'anthropic' | 'azure-openai';
  apiKey: string;
  model: string;
  endpoint?: string;
}

function resolveConfig(): ResolvedConfig | null {
  const provider = (process.env.CC_NORMALIZE_PROVIDER as 'anthropic' | 'azure-openai') || 'anthropic';

  const apiKey =
    process.env.CC_NORMALIZE_API_KEY ||
    (provider === 'anthropic' ? process.env.ANTHROPIC_API_KEY : undefined) ||
    process.env.AI_API_KEY;

  if (!apiKey) return null;

  const model =
    process.env.CC_NORMALIZE_MODEL ||
    (provider === 'anthropic' ? 'claude-haiku-4-5-20251001' : 'gpt-4o-mini');

  const endpoint =
    process.env.CC_NORMALIZE_ENDPOINT ||
    (provider === 'azure-openai' ? process.env.AI_ENDPOINT || process.env.AZURE_OPENAI_ENDPOINT : undefined);

  if (provider === 'azure-openai' && !endpoint) return null;

  return { provider, apiKey, model, endpoint };
}

// ============================================================
// Main export
// ============================================================

const TIMEOUT_MS = 3000;

export async function normalizeWithLLM(
  chiefComplaint: string,
  age: number,
  gender: string
): Promise<CCNormalizationResult> {
  const fallback: CCNormalizationResult = {
    normalizedCC: chiefComplaint,
    extractedTerms: [],
    llmUsed: false,
    provider: 'none',
    latencyMs: 0,
  };

  // Resolve configuration — bail if no API key
  const config = resolveConfig();
  if (!config) return fallback;

  const userPrompt = `Patient: ${age}-year-old ${gender}\nChief complaint: "${chiefComplaint}"`;

  const start = Date.now();

  try {
    let url: string;
    let headers: Record<string, string>;
    let body: Record<string, unknown>;

    if (config.provider === 'azure-openai') {
      const deployment = config.model;
      url = `${config.endpoint}/openai/deployments/${deployment}/chat/completions?api-version=2024-10-21`;
      headers = { 'api-key': config.apiKey, 'Content-Type': 'application/json' };
      body = {
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 150,
        temperature: 0.1,
        response_format: { type: 'json_object' },
      };
    } else {
      // Anthropic
      url = 'https://api.anthropic.com/v1/messages';
      headers = {
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      };
      body = {
        model: config.model,
        max_tokens: 150,
        temperature: 0.1,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const latencyMs = Date.now() - start;

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error(`[CC-Normalize] ${config.provider} returned ${response.status}: ${errText.slice(0, 200)}`);
      return { ...fallback, llmUsed: true, provider: config.provider, latencyMs };
    }

    const data = await response.json();

    // Extract the text content from the provider-specific response shape
    let rawText: string;
    if (config.provider === 'azure-openai') {
      rawText = data?.choices?.[0]?.message?.content || '';
    } else {
      // Anthropic: content is an array of blocks
      rawText = data?.content?.[0]?.text || '';
    }

    // Parse the JSON response from the LLM
    const parsed = JSON.parse(rawText) as {
      normalizedCC?: string;
      extractedTerms?: string[];
    };

    const extractedTerms = Array.isArray(parsed.extractedTerms)
      ? parsed.extractedTerms.filter((t): t is string => typeof t === 'string' && t.length > 0)
      : [];

    const normalizedCC = extractedTerms.length > 0
      ? `${chiefComplaint} ${extractedTerms.join(' ')}`
      : chiefComplaint;

    return {
      normalizedCC,
      extractedTerms,
      llmUsed: true,
      provider: config.provider,
      latencyMs,
    };
  } catch (err: unknown) {
    const latencyMs = Date.now() - start;
    const msg = err instanceof Error ? err.message : String(err);

    // AbortError = timeout; other errors are network/parse failures
    if (msg.includes('abort') || msg.includes('Abort')) {
      console.warn(`[CC-Normalize] ${config.provider} timed out after ${TIMEOUT_MS}ms`);
    } else {
      console.error(`[CC-Normalize] ${config.provider} error: ${msg.slice(0, 200)}`);
    }

    return { ...fallback, llmUsed: true, provider: config.provider, latencyMs };
  }
}
