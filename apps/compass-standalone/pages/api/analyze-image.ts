// ============================================================
// COMPASS Standalone — Image Analysis API
// AI Vision agent: Claude Vision → Azure OpenAI GPT-4V → local fallback
// With rate limiting, origin validation, retry logic
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { logClinicalAudit, createImageAuditEntry } from '@attending/shared/lib/audit/clinicalAuditLog';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

interface ImageAnalysisRequest {
  image: string; // base64
  mimeType: string;
  context?: {
    chiefComplaint?: string;
    hpiSummary?: string;
    phase?: string;
    bodyRegion?: string;
    shotLabel?: string;
  };
}

interface SuggestedCondition {
  name: string;
  confidence: number;
  reasoning: string;
}

interface ImageAnalysisResult {
  imageDescription: string;
  findings: string[];
  suggestedConditions: SuggestedCondition[];
  urgency: 'routine' | 'urgent' | 'emergent';
  recommendations: string[];
  provider: string;
}

// Rate limiter (5 image analyses/minute per IP — more restrictive due to cost)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

function validateOrigin(req: NextApiRequest): boolean {
  const origin = req.headers.origin || req.headers.referer || '';
  const allowedOrigins = [
    process.env.NEXTAUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    'https://attending-compass.azurewebsites.net',
  ].filter(Boolean);
  if (process.env.NODE_ENV === 'development') return true;
  return allowedOrigins.some(allowed => origin.startsWith(allowed as string));
}

// Retry helper with exponential backoff
async function withRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 1000): Promise<T> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries) throw err;
      await new Promise(r => setTimeout(r, delayMs * Math.pow(2, i)));
    }
  }
  throw new Error('Retry exhausted');
}

// Region-specific focus conditions for vision AI
const REGION_FOCUS: Record<string, string> = {
  'head_face': 'skin lesion, rash, swelling, asymmetry, discoloration, laceration, bruising, masses',
  'neck_throat': 'erythema, exudate, tonsillar swelling, lymphadenopathy, uvular deviation, peritonsillar bulge, masses, thyroid enlargement',
  'chest': 'rash, skin lesion, swelling, bruising, surgical sites, chest wall deformity',
  'abdomen': 'distension, rash, surgical scars, hernia, bruising, skin changes, wounds, striae',
  'upper_back': 'rash, skin lesion, swelling, curvature abnormality, bruising, mole changes',
  'lower_back': 'rash, swelling, curvature, bruising, pilonidal changes, sacral abnormalities',
  'left_arm': 'rash, swelling, bruising, deformity, wounds, skin lesion, joint swelling, edema',
  'right_arm': 'rash, swelling, bruising, deformity, wounds, skin lesion, joint swelling, edema',
  'left_hand': 'joint deformity, swelling, skin lesion, nail changes, wounds, rash, nodules, contracture, joint erosions',
  'right_hand': 'joint deformity, swelling, skin lesion, nail changes, wounds, rash, nodules, contracture, joint erosions',
  'left_leg': 'swelling, rash, bruising, varicose veins, wounds, skin discoloration, deformity, edema, DVT signs',
  'right_leg': 'swelling, rash, bruising, varicose veins, wounds, skin discoloration, deformity, edema, DVT signs',
  'left_foot': 'wounds, ulcers, deformity, swelling, skin changes, nail changes, callus, bunion, diabetic changes',
  'right_foot': 'wounds, ulcers, deformity, swelling, skin changes, nail changes, callus, bunion, diabetic changes',
  'skin_general': 'rash distribution pattern, lesion morphology, color changes, texture, scale, vesicles, papules, plaques, urticaria, petechiae',
  'eye': 'redness, discharge, swelling, ptosis, pupil asymmetry, stye, chalazion, subconjunctival hemorrhage, foreign body',
  'other': 'general assessment of visible pathology',
};

const REGION_LABELS: Record<string, string> = {
  'head_face': 'head and face', 'neck_throat': 'neck and throat', 'chest': 'chest',
  'abdomen': 'abdomen', 'upper_back': 'upper back', 'lower_back': 'lower back',
  'left_arm': 'left arm', 'right_arm': 'right arm', 'left_hand': 'left hand',
  'right_hand': 'right hand', 'left_leg': 'left leg', 'right_leg': 'right leg',
  'left_foot': 'left foot', 'right_foot': 'right foot', 'skin_general': 'skin',
  'eye': 'eye', 'other': 'body area',
};

function buildClinicalVisionPrompt(context?: ImageAnalysisRequest['context']): string {
  let prompt = `You are a clinical image analysis assistant supporting healthcare providers. Analyze this clinical photograph and provide a structured assessment.

Respond ONLY with valid JSON in this exact format:
{
  "imageDescription": "Detailed visual description of what you observe",
  "findings": ["finding 1", "finding 2"],
  "suggestedConditions": [
    {"name": "Condition Name", "confidence": 75, "reasoning": "Brief reasoning"}
  ],
  "urgency": "routine|urgent|emergent",
  "recommendations": ["recommendation 1", "recommendation 2"]
}`;

  if (context?.bodyRegion) {
    const regionLabel = REGION_LABELS[context.bodyRegion] || context.bodyRegion;
    const focusAreas = REGION_FOCUS[context.bodyRegion] || 'general assessment';
    const shotDesc = context.shotLabel ? ` (${context.shotLabel.toLowerCase()} view)` : '';
    prompt += `\n\nANATOMICAL CONTEXT: This is a photograph of the patient's ${regionLabel}${shotDesc}.`;
    prompt += `\nFocus your analysis on: ${focusAreas}.`;
    prompt += `\nAssess for clinically significant findings relevant to this anatomical region.`;
  }

  if (context?.chiefComplaint) {
    prompt += `\n\nPatient context — Chief complaint: ${context.chiefComplaint}`;
  }
  if (context?.hpiSummary) {
    prompt += `\nHPI summary: ${context.hpiSummary}`;
  }

  prompt += `\n\nIMPORTANT: This is for clinical decision support only. Always include "Professional in-person evaluation recommended" in recommendations. Confidence scores should reflect uncertainty appropriately — image-only assessment has inherent limitations.`;

  return prompt;
}

async function analyzeWithClaude(
  base64Image: string,
  mimeType: string,
  context?: ImageAnalysisRequest['context']
): Promise<ImageAnalysisResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';
  const prompt = buildClinicalVisionPrompt(context);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64Image } },
            { type: 'text', text: prompt },
          ],
        }],
      }),
      signal: controller.signal,
    });

    if (!response.ok) throw new Error(`Claude Vision API error ${response.status}`);

    const data = await response.json();
    const text = data.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Failed to parse Claude Vision response');

    return { ...JSON.parse(jsonMatch[0]), provider: 'claude-vision' };
  } finally {
    clearTimeout(timeout);
  }
}

async function analyzeWithAzureOpenAI(
  base64Image: string,
  mimeType: string,
  context?: ImageAnalysisRequest['context']
): Promise<ImageAnalysisResult> {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_KEY;
  const deployment = process.env.AZURE_OPENAI_VISION_DEPLOYMENT || 'gpt-4-vision';

  if (!endpoint || !apiKey) throw new Error('Azure OpenAI not configured');

  const prompt = buildClinicalVisionPrompt(context);
  const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=2024-02-15-preview`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}` } },
            { type: 'text', text: prompt },
          ],
        }],
        max_tokens: 2048,
        temperature: 0.2,
      }),
      signal: controller.signal,
    });

    if (!response.ok) throw new Error(`Azure OpenAI error: ${response.status}`);

    const data = await response.json();
    const text = data.choices[0].message.content;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Failed to parse Azure OpenAI response');

    return { ...JSON.parse(jsonMatch[0]), provider: 'azure-openai-vision' };
  } finally {
    clearTimeout(timeout);
  }
}

function localFallback(): ImageAnalysisResult {
  return {
    imageDescription: 'Image received. AI vision analysis is not available — no API keys configured.',
    findings: ['Clinical image uploaded for provider review'],
    suggestedConditions: [],
    urgency: 'routine',
    recommendations: [
      'Professional in-person evaluation recommended',
      'Image has been attached to the assessment for provider review',
    ],
    provider: 'local-fallback',
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
    || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  // Origin validation
  if (!validateOrigin(req)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cache-Control', 'no-store');

  try {
    const { image, mimeType, context } = req.body as ImageAnalysisRequest;

    if (!image || typeof image !== 'string') {
      return res.status(400).json({ error: 'Image data is required and must be a base64 string' });
    }

    const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const safeMimeType = ALLOWED_MIME_TYPES.includes(mimeType) ? mimeType : 'image/jpeg';

    try {
      const decoded = Buffer.from(image, 'base64');
      if (decoded.length > 8 * 1024 * 1024) {
        return res.status(400).json({ error: 'Image exceeds maximum size of 8MB' });
      }
      if (decoded.length < 100) {
        return res.status(400).json({ error: 'Image data appears to be invalid' });
      }
    } catch {
      return res.status(400).json({ error: 'Invalid base64 image encoding' });
    }

    const safeContext = context ? {
      chiefComplaint: context.chiefComplaint?.slice(0, 500),
      hpiSummary: context.hpiSummary?.slice(0, 1000),
      phase: context.phase?.slice(0, 50),
      bodyRegion: context.bodyRegion?.slice(0, 50),
      shotLabel: context.shotLabel?.slice(0, 50),
    } : undefined;

    // Try Claude with retry, then Azure with retry, then local fallback
    let result: ImageAnalysisResult;

    const startTime = Date.now();
    let provider = 'local';

    try {
      result = await withRetry(() => analyzeWithClaude(image, safeMimeType, safeContext), 1, 2000);
      provider = 'anthropic';
    } catch {
      try {
        result = await withRetry(() => analyzeWithAzureOpenAI(image, safeMimeType, safeContext), 1, 2000);
        provider = 'azure-openai';
      } catch {
        result = localFallback();
        provider = 'local';
      }
    }

    // HIPAA audit log
    logClinicalAudit(createImageAuditEntry({
      requestId: `img-${Date.now().toString(36)}`,
      clientIp: clientIp,
      bodyRegion: safeContext?.bodyRegion,
      provider,
      latencyMs: Date.now() - startTime,
      success: true,
    }));

    return res.status(200).json(result);
  } catch (error) {
    console.error('[COMPASS Vision] Error:', error);

    logClinicalAudit(createImageAuditEntry({
      requestId: `img-${Date.now().toString(36)}`,
      clientIp: clientIp,
      provider: 'error',
      latencyMs: 0,
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    }));

    return res.status(500).json({
      error: 'Image analysis failed. Please try again.',
      ...localFallback(),
    });
  }
}
