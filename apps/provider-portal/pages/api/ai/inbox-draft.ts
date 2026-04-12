// ============================================================
// API Route: /api/ai/inbox-draft
// apps/provider-portal/pages/api/ai/inbox-draft.ts
//
// Server-side proxy for Azure OpenAI calls from the inbox agent.
// Keeps API keys server-side while letting the client trigger
// AI analysis of patient messages.
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import {
  runInboxAgent,
  type InboxAIResponse,
} from '../../../lib/services/inboxAIAgent';

// ── Azure OpenAI Configuration ──────────────────────────────

const AZURE_OPENAI_KEY =
  process.env.AZURE_OPENAI_KEY || process.env.AZURE_OPENAI_API_KEY || '';
const AZURE_OPENAI_ENDPOINT =
  process.env.AZURE_OPENAI_ENDPOINT || '';
const AZURE_OPENAI_DEPLOYMENT =
  process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o';
const AZURE_OPENAI_API_VERSION =
  process.env.AZURE_OPENAI_API_VERSION || '2024-10-21';

// ── Real Azure OpenAI LLM Call ──────────────────────────────

async function azureOpenAICall(prompt: string): Promise<string> {
  const url = `${AZURE_OPENAI_ENDPOINT.replace(/\/$/, '')}/openai/deployments/${AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=${AZURE_OPENAI_API_VERSION}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'api-key': AZURE_OPENAI_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [
        {
          role: 'system',
          content:
            'You are a clinical AI assistant for a primary care physician. ' +
            'You analyze patient messages against their chart data and return structured JSON responses. ' +
            'You are thorough, clinically accurate, and always prioritize patient safety. ' +
            'For urgent/emergent situations, you clearly escalate. ' +
            'IMPORTANT: This is a clinical decision SUPPORT tool — the physician makes all final decisions.',
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: 2048,
      temperature: 0.3,
      top_p: 0.9,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[AI] Azure OpenAI error:', response.status, errorText);
    throw new Error(`Azure OpenAI returned ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

// ── Request / Response Types ────────────────────────────────

interface InboxDraftRequest {
  message: {
    patientId: string;
    from: string;
    subject: string;
    content: string;
    category: string;
    chiefComplaint?: string;
    symptoms?: string[];
  };
  chartData: {
    conditions: string[];
    medications: { name: string; dose: string; frequency: string }[];
    recentLabs: {
      name: string;
      value: string;
      unit: string;
      status: string;
      collectedAt: string;
    }[];
    allergies: string[];
    recentVitals: {
      bp?: string;
      hr?: string;
      temp?: string;
      weight?: string;
    };
    lastVisit: { date: string; reason: string; provider: string };
  };
  providerName?: string;
}

// ── Handler ─────────────────────────────────────────────────

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<InboxAIResponse | { error: string }>,
) {
  // Only POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Auth check
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Validate Azure OpenAI is configured
  if (!AZURE_OPENAI_KEY || !AZURE_OPENAI_ENDPOINT) {
    console.error('[AI] Azure OpenAI not configured — missing AZURE_OPENAI_KEY or AZURE_OPENAI_ENDPOINT');
    return res.status(503).json({ error: 'AI service not configured' });
  }

  try {
    const body = req.body as InboxDraftRequest;

    if (!body.message || !body.chartData) {
      return res.status(400).json({ error: 'Missing message or chartData' });
    }

    const providerName = body.providerName || (token.name as string) || 'Dr. Provider';

    console.log(
      `[AI] Inbox agent: ${body.message.from} — "${body.message.subject}" (provider: ${providerName})`,
    );

    const startTime = Date.now();

    const result = await runInboxAgent(
      body.message,
      body.chartData,
      {
        providerName,
        llmCall: azureOpenAICall,
      },
    );

    const elapsed = Date.now() - startTime;
    console.log(
      `[AI] Inbox agent complete: intent=${result.intent}, severity=${result.severity}, ` +
        `actions=${result.pendedActions.length}, drafts=${result.patientDrafts.length}, ` +
        `${elapsed}ms`,
    );

    return res.status(200).json(result);
  } catch (error) {
    console.error('[AI] Inbox agent error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'AI analysis failed',
    });
  }
}
