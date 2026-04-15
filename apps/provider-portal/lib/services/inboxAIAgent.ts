// =============================================================================
// ATTENDING AI - Inbox AI Agent Service
// apps/provider-portal/lib/services/inboxAIAgent.ts
//
// Architecture: Single-call structured LLM agent
//   1. Pre-scan message for keywords (no AI, fast)
//   2. Gather relevant chart context based on keywords (data fetch, no AI)
//   3. Single LLM call returns: intent, severity, actions, patient draft, staff draft
//
// Designed to work with mock data now, real EHR/FHIR data later.
// =============================================================================

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type MessageIntent =
  | 'refill'
  | 'med-adjustment'
  | 'lab-request'
  | 'referral'
  | 'symptom-report'
  | 'lab-question'
  | 'appointment'
  | 'general';

export type SeverityLevel = 'routine' | 'soon' | 'urgent' | 'emergent';

export interface PendedAction {
  id: string;
  type: 'lab' | 'referral' | 'refill' | 'appointment' | 'follow-up' | 'imaging' | 'medication-change';
  title: string;
  detail: string;
  enabled: boolean;
  confidence: number;
}

export interface AIDraft {
  id: string;
  label: string;
  tone: string;
  content: string;
  confidence: number;
  audience: 'patient' | 'staff';
}

export interface StaffInstruction {
  assignTo: 'RN' | 'MA' | 'front-desk' | 'referral-coordinator' | 'provider';
  action: string;
  priority: SeverityLevel;
  details: string;
  schedulingGuidance?: string;
}

export interface InboxAIResponse {
  intent: MessageIntent;
  severity: SeverityLevel;
  reasoning: string;
  pendedActions: PendedAction[];
  patientDrafts: AIDraft[];
  staffDraft: AIDraft;
  staffInstruction: StaffInstruction;
  chartContextUsed: string[];  // tracks which chart sections the AI pulled
}

// -----------------------------------------------------------------------------
// Chart context that gets passed to the LLM (subset of full chart)
// -----------------------------------------------------------------------------

export interface RelevantChartContext {
  conditions: string[];
  medications: { name: string; dose: string; frequency: string }[];
  recentLabs: { name: string; value: string; unit: string; status: string; date: string }[];
  allergies: string[];
  recentVitals: { bp?: string; hr?: string; temp?: string; weight?: string };
  lastVisit: { date: string; reason: string };
  // Only included when relevant to the message
  relevantImaging?: { type: string; date: string; finding: string }[];
  relevantProcedures?: { name: string; date: string; result: string }[];
  /**
   * Recent behavioral health screenings — included whenever the prescan
   * detects mood/anxiety/SI-related terminology so the LLM can reconcile
   * patient message text against the structured (scored) screening record.
   * This is the ground truth: if C-SSRS says ideationLevel=0 then the LLM
   * must NOT escalate even if the message contains the word "suicidal".
   */
  behavioralHealth?: BehavioralHealthSnapshot;
}

/**
 * Snapshot of the patient's most recent behavioral health screening data
 * passed to the inbox AI for clinical reconciliation. Sourced from the
 * BehavioralHealthScreening aggregate (BehavioralHealth.cs).
 */
export interface BehavioralHealthSnapshot {
  /** Most recent PHQ-9 — null if none on file */
  phq9?: {
    completedAt: string;
    totalScore: number;             // 0–27
    severity: string;                // none|mild|moderate|moderately-severe|severe
    item9Score: number;              // 0–3 (suicidal ideation question)
    interpretation: string;
  };
  /** Most recent GAD-7 — null if none on file */
  gad7?: {
    completedAt: string;
    totalScore: number;             // 0–21
    severity: string;                // none|mild|moderate|severe
  };
  /** Most recent C-SSRS — null if none on file */
  cssrs?: {
    completedAt: string;
    ideationLevel: number;          // 0=none, 1=wish dead, 2=non-specific, 3=method, 4=intent, 5=plan
    behaviorPresent: boolean;       // any lifetime suicidal behavior endorsed
    interpretation: string;
  };
  /** True if structured screening currently classifies patient as positive for suicide risk */
  hasSuicideRisk: boolean;
  /** Action recommended by the most recent screening review, if any */
  recommendedAction?: string;
  /** Whether a safety plan is currently on file (and active) */
  safetyPlanOnFile: boolean;
  /** Free-form clinician note for the AI: e.g. "Patient denied SI on 2026-04-12 C-SSRS." */
  clinicianContextNote?: string;
}

// -----------------------------------------------------------------------------
// Step 1: Keyword Pre-Scan (no AI, fast)
// Determines which chart sections to pull, reducing token cost
// -----------------------------------------------------------------------------

interface ChartSections {
  medications: boolean;
  labs: boolean;
  vitals: boolean;
  imaging: boolean;
  procedures: boolean;
  allergies: boolean;
  conditions: boolean;
  behavioralHealth: boolean;
}

const KEYWORD_MAP: Record<string, (keyof ChartSections)[]> = {
  // Medication-related
  'refill': ['medications', 'allergies'],
  'medication': ['medications', 'allergies', 'labs'],
  'dose': ['medications', 'labs'],
  'side effect': ['medications', 'allergies'],
  'prescription': ['medications'],
  'pharmacy': ['medications'],
  'cough': ['medications', 'allergies'],        // ACEi cough
  'levothyroxine': ['medications', 'labs'],
  'thyroid': ['medications', 'labs'],
  'lisinopril': ['medications', 'labs', 'vitals'],
  'metformin': ['medications', 'labs'],
  'insulin': ['medications', 'labs'],

  // Lab-related
  'lab': ['labs', 'conditions'],
  'blood work': ['labs', 'conditions'],
  'result': ['labs'],
  'a1c': ['labs', 'medications', 'conditions'],
  'cholesterol': ['labs', 'medications'],
  'tsh': ['labs', 'medications'],

  // Symptom-related
  'pain': ['medications', 'conditions', 'imaging'],
  'fatigue': ['labs', 'medications', 'conditions'],
  'chest': ['labs', 'vitals', 'imaging', 'medications', 'conditions'],
  'heart': ['labs', 'vitals', 'imaging', 'medications'],
  'headache': ['medications', 'conditions', 'imaging'],
  'shortness of breath': ['labs', 'vitals', 'medications', 'conditions'],
  'swelling': ['labs', 'vitals', 'medications'],
  'dizzy': ['medications', 'vitals', 'labs'],
  'nausea': ['medications', 'conditions'],
  'weight': ['labs', 'vitals', 'medications'],
  'fever': ['labs', 'vitals', 'conditions'],

  // Imaging/procedure-related
  'xray': ['imaging'],
  'x-ray': ['imaging'],
  'mri': ['imaging'],
  'ct scan': ['imaging'],
  'ultrasound': ['imaging'],
  'biopsy': ['procedures', 'imaging'],

  // Referral-related
  'referral': ['conditions', 'medications', 'imaging'],
  'specialist': ['conditions', 'medications'],
  'orthopedic': ['imaging', 'conditions'],
  'cardiology': ['labs', 'vitals', 'imaging', 'conditions'],
  'dermatology': ['conditions', 'procedures'],

  // Scheduling
  'appointment': ['conditions'],
  'follow-up': ['conditions', 'labs'],
  'schedule': ['conditions'],

  // Behavioral health — ALWAYS pull recent screenings when these terms appear.
  // Critical for PHQ-9 / GAD-7 / C-SSRS reconciliation in the LLM prompt so
  // the model does not generate alarm responses based on negated phrasing.
  'suicidal': ['behavioralHealth', 'conditions', 'medications'],
  'suicide': ['behavioralHealth', 'conditions', 'medications'],
  'self-harm': ['behavioralHealth', 'conditions'],
  'self harm': ['behavioralHealth', 'conditions'],
  'kill myself': ['behavioralHealth', 'conditions'],
  'end my life': ['behavioralHealth', 'conditions'],
  'depression': ['behavioralHealth', 'medications', 'conditions'],
  'depressed': ['behavioralHealth', 'medications', 'conditions'],
  'anxiety': ['behavioralHealth', 'medications', 'conditions'],
  'anxious': ['behavioralHealth', 'medications', 'conditions'],
  'panic': ['behavioralHealth', 'medications', 'conditions'],
  'mood': ['behavioralHealth', 'medications', 'conditions'],
  'phq-9': ['behavioralHealth'],
  'phq9': ['behavioralHealth'],
  'gad-7': ['behavioralHealth'],
  'gad7': ['behavioralHealth'],
  'cssrs': ['behavioralHealth'],
  'c-ssrs': ['behavioralHealth'],
  'ssri': ['medications', 'behavioralHealth'],
  'antidepressant': ['medications', 'behavioralHealth'],
  'sertraline': ['medications', 'behavioralHealth', 'labs'],
  'fluoxetine': ['medications', 'behavioralHealth', 'labs'],
  'escitalopram': ['medications', 'behavioralHealth', 'labs'],
  'venlafaxine': ['medications', 'behavioralHealth', 'labs'],
  'bupropion': ['medications', 'behavioralHealth'],
  'lexapro': ['medications', 'behavioralHealth'],
  'zoloft': ['medications', 'behavioralHealth'],
  'prozac': ['medications', 'behavioralHealth'],
  'wellbutrin': ['medications', 'behavioralHealth'],
};

export function prescanMessage(messageText: string): ChartSections {
  const text = messageText.toLowerCase();
  const sections: ChartSections = {
    medications: false,
    labs: false,
    vitals: false,
    imaging: false,
    procedures: false,
    allergies: false,
    conditions: true, // always include conditions as baseline context
    behavioralHealth: false,
  };

  for (const [keyword, sectionList] of Object.entries(KEYWORD_MAP)) {
    if (text.includes(keyword)) {
      for (const section of sectionList) {
        sections[section] = true;
      }
    }
  }

  return sections;
}

// -----------------------------------------------------------------------------
// Step 2: Chart Context Gatherer (no AI, data fetch only)
// In production: FHIR/EHR API calls. Now: reads from mock chartData.
// Only fetches sections flagged by pre-scan.
// -----------------------------------------------------------------------------

export function gatherChartContext(
  chartData: {
    conditions: string[];
    medications: { name: string; dose: string; frequency: string }[];
    recentLabs: { name: string; value: string; unit: string; status: string; collectedAt: string }[];
    allergies: string[];
    recentVitals: { bp?: string; hr?: string; temp?: string; weight?: string };
    lastVisit: { date: string; reason: string; provider: string };
    behavioralHealth?: BehavioralHealthSnapshot;
  },
  sections: ChartSections
): RelevantChartContext {
  const context: RelevantChartContext = {
    conditions: sections.conditions ? chartData.conditions : [],
    medications: sections.medications ? chartData.medications : [],
    recentLabs: sections.labs
      ? chartData.recentLabs.map(l => ({
          name: l.name, value: l.value, unit: l.unit, status: l.status, date: l.collectedAt,
        }))
      : [],
    allergies: sections.allergies ? chartData.allergies : [],
    recentVitals: sections.vitals ? chartData.recentVitals : {},
    lastVisit: { date: chartData.lastVisit.date, reason: chartData.lastVisit.reason },
  };

  // In production, these would be separate API calls only when flagged
  if (sections.imaging) {
    context.relevantImaging = []; // TODO: fetch from EHR
  }
  if (sections.procedures) {
    context.relevantProcedures = []; // TODO: fetch from EHR
  }

  // Behavioral health snapshot — pulled from the BehavioralHealthScreening
  // aggregate. ALWAYS included when (a) the prescan flagged BH terms in the
  // message, OR (b) the patient currently has hasSuicideRisk=true. The second
  // condition prevents the AI from drafting a routine response on a patient
  // with an active positive screen.
  if (chartData.behavioralHealth) {
    if (sections.behavioralHealth || chartData.behavioralHealth.hasSuicideRisk) {
      context.behavioralHealth = chartData.behavioralHealth;
    }
  }

  return context;
}

// -----------------------------------------------------------------------------
// Step 3: Build the LLM Prompt
// Single structured prompt that returns everything in one call
// -----------------------------------------------------------------------------

export function buildAgentPrompt(
  message: {
    from: string;
    subject: string;
    content: string;
    category: string;
    chiefComplaint?: string;
    symptoms?: string[];
  },
  chartContext: RelevantChartContext,
  providerName: string,
): string {
  const bh = chartContext.behavioralHealth;
  const bhBlock = bh
    ? `
BEHAVIORAL HEALTH STATUS (STRUCTURED — TREAT AS GROUND TRUTH):
${bh.phq9 ? `  PHQ-9 (${bh.phq9.completedAt}): total ${bh.phq9.totalScore}/27 — ${bh.phq9.severity}; item 9 (SI) = ${bh.phq9.item9Score}/3` : '  PHQ-9: no recent screening on file'}
${bh.gad7 ? `  GAD-7 (${bh.gad7.completedAt}): total ${bh.gad7.totalScore}/21 — ${bh.gad7.severity}` : '  GAD-7: no recent screening on file'}
${bh.cssrs ? `  C-SSRS (${bh.cssrs.completedAt}): ideationLevel=${bh.cssrs.ideationLevel}/5, lifetimeBehavior=${bh.cssrs.behaviorPresent ? 'yes' : 'no'} — ${bh.cssrs.interpretation}` : '  C-SSRS: no recent screening on file'}
  hasSuicideRisk: ${bh.hasSuicideRisk}
  safetyPlanOnFile: ${bh.safetyPlanOnFile}
${bh.recommendedAction ? `  recommendedAction: ${bh.recommendedAction}` : ''}
${bh.clinicianContextNote ? `  clinicianNote: ${bh.clinicianContextNote}` : ''}

CRITICAL SI RECONCILIATION RULES:
  - The structured screening above is the AUTHORITATIVE record. The patient's
    free-text message is NOT a screening instrument.
  - If hasSuicideRisk=false AND the message merely uses the word "suicidal",
    "depression", or similar in a NEGATED or HISTORICAL context (e.g. "I used
    to feel suicidal but no longer", "I deny any thoughts of self harm",
    "no SI today"), DO NOT escalate severity to urgent/emergent solely on
    keyword presence. Set severity based on the rest of the message.
  - If hasSuicideRisk=true OR the message contains a NEW assertion of active
    SI/plan/intent/means that is NOT reflected in the structured screening,
    you MUST: set severity="emergent", set staffInstruction.assignTo="provider",
    set staffInstruction.priority="emergent", and include in the patient draft
    explicit instructions to call 988 (Suicide & Crisis Lifeline), text HOME
    to 741741, OR go to the nearest ED. Add a pendedAction of type "follow-up"
    titled "Same-day BH evaluation" with enabled=true.
  - If a new assertion of SI conflicts with a recent negative screening,
    treat the assertion as authoritative and trigger the same emergent path.
  - Never imply that a patient is suicidal in a draft response when the
    structured screening says they are not. Reconcile carefully.
`
    : '';
  return `You are a clinical AI assistant for ${providerName}, a primary care physician.

PATIENT MESSAGE:
From: ${message.from}
Subject: ${message.subject}
Category: ${message.category}
${message.chiefComplaint ? `Chief Complaint: ${message.chiefComplaint}` : ''}
${message.symptoms?.length ? `Symptoms: ${message.symptoms.join(', ')}` : ''}

Content:
${message.content}

RELEVANT CHART DATA:
${chartContext.conditions.length ? `Conditions: ${chartContext.conditions.join(', ')}` : ''}
${chartContext.medications.length ? `Medications:\n${chartContext.medications.map(m => `  - ${m.name} ${m.dose} ${m.frequency}`).join('\n')}` : ''}
${chartContext.recentLabs.length ? `Recent Labs:\n${chartContext.recentLabs.map(l => `  - ${l.name}: ${l.value} ${l.unit} (${l.status}) [${l.date}]`).join('\n')}` : ''}
${chartContext.allergies.length ? `Allergies: ${chartContext.allergies.join(', ')}` : ''}
${chartContext.recentVitals.bp ? `Vitals: BP ${chartContext.recentVitals.bp}, HR ${chartContext.recentVitals.hr}, Temp ${chartContext.recentVitals.temp}` : ''}
Last Visit: ${chartContext.lastVisit.date} - ${chartContext.lastVisit.reason}
${chartContext.relevantImaging?.length ? `Imaging:\n${chartContext.relevantImaging.map(i => `  - ${i.type} (${i.date}): ${i.finding}`).join('\n')}` : ''}
${chartContext.relevantProcedures?.length ? `Procedures:\n${chartContext.relevantProcedures.map(p => `  - ${p.name} (${p.date}): ${p.result}`).join('\n')}` : ''}
${bhBlock}
INSTRUCTIONS:
Analyze this message and return a JSON response with:

1. "intent" - one of: refill, med-adjustment, lab-request, referral, symptom-report, lab-question, appointment, general
2. "severity" - one of: routine, soon, urgent, emergent
3. "reasoning" - brief clinical reasoning (1-2 sentences, for provider's eyes only)
4. "pendedActions" - array of clinical actions to auto-pend for provider approval:
   Each: { "type": "lab|referral|refill|appointment|follow-up|imaging|medication-change", "title": string, "detail": string, "enabled": boolean, "confidence": 0-1 }
   - Set enabled=true for high-confidence standard-of-care actions
   - Set enabled=false for suggested-but-optional actions
5. "patientDrafts" - array of 2-3 draft responses TO THE PATIENT:
   Each: { "label": string, "tone": "Detailed|Concise|Educational", "content": string, "confidence": 0-1 }
   RULES for patient drafts:
   - Use plain language, NO medical abbreviations
   - Write "thyroid level" not "TSH", "blood pressure" not "BP", "blood sugar test" not "HbA1c"
   - Write "micrograms" not "mcg", "blood work" not "labs"
   - Be warm, clear, and reassuring
   - Sign as ${providerName}
6. "staffDraft" - a single draft message TO CLINICAL STAFF (RN/MA):
   { "label": "Staff Instructions", "tone": "Clinical", "content": string, "confidence": 0-1 }
   RULES for staff draft:
   - Medical terminology is fine (this is provider-to-staff)
   - Include specific triage instructions
   - Include scheduling guidance if applicable (urgency, timeframe, visit type)
   - Include any tasks: vitals to collect, forms to prepare, prior auths needed
7. "staffInstruction" - structured staff routing:
   { "assignTo": "RN|MA|front-desk|referral-coordinator|provider", "action": string, "priority": "routine|soon|urgent|emergent", "details": string, "schedulingGuidance": string }

Respond ONLY with valid JSON. No markdown, no explanation outside the JSON.`;
}

// -----------------------------------------------------------------------------
// Step 4: Parse LLM Response
// -----------------------------------------------------------------------------

export function parseAgentResponse(raw: string): InboxAIResponse | null {
  try {
    // Strip markdown code fences if present
    const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);

    // Validate and normalize
    const response: InboxAIResponse = {
      intent: parsed.intent || 'general',
      severity: parsed.severity || 'routine',
      reasoning: parsed.reasoning || '',
      pendedActions: (parsed.pendedActions || []).map((a: any, i: number) => ({
        id: `ai-action-${i}`,
        type: a.type,
        title: a.title,
        detail: a.detail,
        enabled: a.enabled ?? true,
        confidence: a.confidence ?? 0.8,
      })),
      patientDrafts: (parsed.patientDrafts || []).map((d: any, i: number) => ({
        id: `patient-draft-${i}`,
        label: d.label,
        tone: d.tone,
        content: d.content,
        confidence: d.confidence ?? 0.8,
        audience: 'patient' as const,
      })),
      staffDraft: {
        id: 'staff-draft',
        label: parsed.staffDraft?.label || 'Staff Instructions',
        tone: 'Clinical',
        content: parsed.staffDraft?.content || '',
        confidence: parsed.staffDraft?.confidence ?? 0.9,
        audience: 'staff' as const,
      },
      staffInstruction: {
        assignTo: parsed.staffInstruction?.assignTo || 'RN',
        action: parsed.staffInstruction?.action || '',
        priority: parsed.staffInstruction?.priority || parsed.severity || 'routine',
        details: parsed.staffInstruction?.details || '',
        schedulingGuidance: parsed.staffInstruction?.schedulingGuidance,
      },
      chartContextUsed: [],
    };

    return response;
  } catch {
    console.error('Failed to parse AI agent response');
    return null;
  }
}

// -----------------------------------------------------------------------------
// Main Agent Entry Point
// Orchestrates the full pipeline: prescan -> gather context -> LLM call -> parse
// -----------------------------------------------------------------------------

export interface InboxAIAgentConfig {
  providerName: string;
  // In production, this would be the LLM API call
  llmCall: (prompt: string) => Promise<string>;
  // In production, chart data comes from EHR API. For now, passed in directly.
  getChartData?: (patientId: string) => Promise<RelevantChartContext>;
}

export async function runInboxAgent(
  message: {
    patientId: string;
    from: string;
    subject: string;
    content: string;
    category: string;
    chiefComplaint?: string;
    symptoms?: string[];
  },
  chartData: {
    conditions: string[];
    medications: { name: string; dose: string; frequency: string }[];
    recentLabs: { name: string; value: string; unit: string; status: string; collectedAt: string }[];
    allergies: string[];
    recentVitals: { bp?: string; hr?: string; temp?: string; weight?: string };
    lastVisit: { date: string; reason: string; provider: string };
    behavioralHealth?: BehavioralHealthSnapshot;
  },
  config: InboxAIAgentConfig,
): Promise<InboxAIResponse> {
  // Step 1: Pre-scan to determine what chart data is relevant
  const sections = prescanMessage(message.content + ' ' + (message.chiefComplaint || ''));

  // Step 2: Gather only relevant chart context (reduces tokens sent to LLM)
  const context = gatherChartContext(chartData, sections);

  // Track which sections were used
  const contextUsed: string[] = [];
  if (sections.medications) contextUsed.push('medications');
  if (sections.labs) contextUsed.push('labs');
  if (sections.vitals) contextUsed.push('vitals');
  if (sections.imaging) contextUsed.push('imaging');
  if (sections.procedures) contextUsed.push('procedures');
  if (sections.allergies) contextUsed.push('allergies');
  if (sections.conditions) contextUsed.push('conditions');
  if (context.behavioralHealth) contextUsed.push('behavioralHealth');

  // Step 3: Build prompt and call LLM
  const prompt = buildAgentPrompt(message, context, config.providerName);
  const rawResponse = await config.llmCall(prompt);

  // Step 4: Parse structured response
  const result = parseAgentResponse(rawResponse);

  if (!result) {
    // Fallback: return safe defaults if LLM response is unparseable
    return {
      intent: 'general',
      severity: 'routine',
      reasoning: 'AI analysis unavailable — please review manually.',
      pendedActions: [],
      patientDrafts: [{
        id: 'fallback',
        label: 'Manual Response',
        tone: 'Professional',
        content: `Dear ${message.from.split(' ')[0]},\n\nThank you for your message. I've reviewed your concern and will follow up with you shortly.\n\nBest regards,\n${config.providerName}`,
        confidence: 0.5,
        audience: 'patient',
      }],
      staffDraft: {
        id: 'staff-fallback',
        label: 'Staff Instructions',
        tone: 'Clinical',
        content: 'AI analysis unavailable. Please review message and route appropriately.',
        confidence: 0.5,
        audience: 'staff',
      },
      staffInstruction: {
        assignTo: 'RN',
        action: 'Review and triage',
        priority: 'routine',
        details: 'AI unable to process — manual review required.',
      },
      chartContextUsed: contextUsed,
    };
  }

  result.chartContextUsed = contextUsed;
  return result;
}

// -----------------------------------------------------------------------------
// Mock LLM Call (for development without API keys)
// Uses the same deterministic logic currently in ExpandedPanel.tsx
// Replace with real Claude/GPT call in production
// -----------------------------------------------------------------------------

export async function mockLLMCall(prompt: string): Promise<string> {
  // Simulate latency
  await new Promise(resolve => setTimeout(resolve, 800));

  // Parse key info from the prompt to generate contextual mock response
  const isRefill = prompt.includes('Category: refills') || prompt.toLowerCase().includes('refill');
  const isThyroid = prompt.toLowerCase().includes('thyroid') || prompt.toLowerCase().includes('levothyroxine');
  const isCough = prompt.toLowerCase().includes('cough') || prompt.toLowerCase().includes('side effect');
  const isChest = prompt.toLowerCase().includes('chest') || prompt.toLowerCase().includes('heart');
  const isLabQuestion = prompt.includes('Category: labs') || prompt.toLowerCase().includes('lab result');
  const isFatigue = prompt.toLowerCase().includes('fatigue') || prompt.toLowerCase().includes('tired');

  // Extract patient name from prompt
  const fromMatch = prompt.match(/From:\s*(.+)/);
  const firstName = fromMatch ? fromMatch[1].trim().split(' ')[0] : 'Patient';

  // Extract provider name
  const providerMatch = prompt.match(/clinical AI assistant for (.+?),/);
  const providerName = providerMatch ? providerMatch[1] : 'Dr. Reed';

  let response: any = {
    intent: 'general',
    severity: 'routine' as SeverityLevel,
    reasoning: 'General patient inquiry requiring provider review.',
    pendedActions: [],
    patientDrafts: [],
    staffDraft: {
      label: 'Staff Instructions',
      tone: 'Clinical',
      content: `Patient message received. Please review and route to ${providerName} for response.`,
      confidence: 0.85,
    },
    staffInstruction: {
      assignTo: 'RN',
      action: 'Review and route',
      priority: 'routine',
      details: 'Standard patient message — no urgent action needed.',
      schedulingGuidance: 'No scheduling action required at this time.',
    },
  };

  if (isRefill) {
    response = {
      intent: 'refill',
      severity: 'routine',
      reasoning: 'Patient requesting medication refill. Chart review shows active prescriptions with no contraindications.',
      pendedActions: [
        { type: 'refill', title: 'Approve Refill', detail: 'Send to patient pharmacy on file', enabled: true, confidence: 0.95 },
        { type: 'lab', title: 'Order routine blood work', detail: 'Consider if overdue for monitoring labs', enabled: false, confidence: 0.70 },
      ],
      patientDrafts: [
        {
          label: 'Approve and Notify', tone: 'Friendly', confidence: 0.95,
          content: `Dear ${firstName},\n\nYour medication refill has been reviewed and approved. It has been sent to your pharmacy and should be ready for pickup within 24-48 hours.\n\nPlease continue taking your medication as prescribed. If you experience any side effects or have questions, don't hesitate to reach out.\n\nBest regards,\n${providerName}`,
        },
        {
          label: 'Approve with Follow-up', tone: 'Clinical', confidence: 0.88,
          content: `Dear ${firstName},\n\nYour refill has been approved and sent to your pharmacy.\n\nSince it's been a while since your last check-up, I'd also like to order some routine blood work to make sure everything is on track. You can complete this at any Quest or LabCorp location at your convenience.\n\nPlease schedule a follow-up visit so we can review your results together.\n\nBest regards,\n${providerName}`,
        },
      ],
      staffDraft: {
        label: 'Staff Instructions', tone: 'Clinical', confidence: 0.92,
        content: `Refill approved for ${firstName}. Please:\n1. Process refill to pharmacy on file\n2. Verify last fill date and day supply\n3. If patient is overdue for labs (>6 months), provide lab order at pickup\n4. No follow-up appointment needed unless labs are ordered`,
      },
      staffInstruction: {
        assignTo: 'MA',
        action: 'Process refill',
        priority: 'routine',
        details: 'Refill approved by provider. Process to pharmacy on file.',
        schedulingGuidance: 'No appointment needed unless labs ordered. If labs ordered, schedule follow-up in 2-3 weeks.',
      },
    };
  } else if (isThyroid) {
    response = {
      intent: 'med-adjustment',
      severity: 'soon',
      reasoning: 'Thyroid levels elevated on recent labs. Dose adjustment indicated per guidelines. Recheck needed in 6-8 weeks.',
      pendedActions: [
        { type: 'medication-change', title: 'Increase levothyroxine dose', detail: 'Increase by 25 micrograms based on elevated thyroid levels', enabled: true, confidence: 0.93 },
        { type: 'lab', title: 'Order thyroid recheck (6-8 weeks)', detail: 'Recheck thyroid levels after dose adjustment', enabled: true, confidence: 0.95 },
        { type: 'follow-up', title: 'Follow-up in 8 weeks', detail: 'Review thyroid levels after dose change, assess symptoms', enabled: true, confidence: 0.88 },
      ],
      patientDrafts: [
        {
          label: 'Dose Adjustment', tone: 'Detailed', confidence: 0.95,
          content: `Dear ${firstName},\n\nThank you for reaching out about your thyroid medication. I've reviewed your recent blood work and your thyroid level is above the target range, which explains your continued fatigue and weight changes.\n\nI'm increasing your levothyroxine dose by 25 micrograms. Please continue taking it on an empty stomach, 30-60 minutes before eating.\n\nI'll order follow-up thyroid blood work in 6-8 weeks to see how you're responding to the new dose. You should start feeling improvement within a few weeks.\n\nBest regards,\n${providerName}`,
        },
        {
          label: 'Educational', tone: 'Educational', confidence: 0.85,
          content: `Dear ${firstName},\n\nI appreciate you keeping me updated on how you're feeling. Let me explain what's happening:\n\nYour thyroid gland isn't producing enough hormone, so we supplement it with levothyroxine. Your recent blood work shows your body needs a bit more than what you're currently taking. I'm increasing your dose by 25 micrograms.\n\nIt takes about 6-8 weeks for your body to fully adjust, so please be patient. Important reminders:\n  - Take on an empty stomach, 30-60 minutes before breakfast\n  - Avoid calcium or iron supplements within 4 hours\n  - Don't skip doses\n\nWe'll recheck your thyroid levels in 6-8 weeks.\n\nBest regards,\n${providerName}`,
        },
      ],
      staffDraft: {
        label: 'Staff Instructions', tone: 'Clinical', confidence: 0.93,
        content: `Thyroid dose adjustment for ${firstName}:\n1. Update Rx: increase levothyroxine by 25mcg\n2. Send updated Rx to pharmacy on file\n3. Place lab order: TSH + Free T4, to be drawn in 6-8 weeks\n4. Schedule follow-up appointment in 8 weeks\n5. Provide patient with lab requisition\n\nNo urgent action needed — routine dose titration.`,
      },
      staffInstruction: {
        assignTo: 'MA',
        action: 'Process medication change and schedule follow-up',
        priority: 'soon',
        details: 'Levothyroxine dose increase. New Rx to pharmacy + lab order for 6-8 weeks.',
        schedulingGuidance: 'Schedule follow-up in 8 weeks. Attach lab order for TSH/Free T4 to be drawn 1 week before visit.',
      },
    };
  } else if (isCough) {
    response = {
      intent: 'med-adjustment',
      severity: 'soon',
      reasoning: 'Dry cough likely ACEi-related side effect. Medication switch to ARB indicated. BP well-controlled per home readings.',
      pendedActions: [
        { type: 'medication-change', title: 'Switch lisinopril to losartan 50mg', detail: 'ACE inhibitor cough — ARB equally effective without cough', enabled: true, confidence: 0.92 },
        { type: 'refill', title: 'Discontinue lisinopril', detail: 'Stop current ACE inhibitor due to side effect', enabled: true, confidence: 0.95 },
        { type: 'lab', title: 'Order blood chemistry panel (2 weeks)', detail: 'Recheck kidney function and potassium after medication change', enabled: true, confidence: 0.88 },
        { type: 'follow-up', title: 'Follow-up in 4 weeks', detail: 'Blood pressure check after medication switch', enabled: true, confidence: 0.85 },
      ],
      patientDrafts: [
        {
          label: 'Detailed Explanation', tone: 'Detailed', confidence: 0.93,
          content: `Dear ${firstName},\n\nThe dry cough you're experiencing is a well-known side effect of lisinopril, your current blood pressure medication. It occurs in about 10-15% of patients and unfortunately doesn't improve with continued use.\n\nThe good news is there's an excellent alternative. I'm switching you to losartan 50mg, which works similarly for blood pressure but doesn't cause the cough. Your home blood pressure readings look well-controlled, so we'll start at an equivalent dose.\n\nPlease:\n  1. Stop the lisinopril today\n  2. Start losartan 50mg tomorrow morning\n  3. Continue monitoring your blood pressure at home\n\nThe cough should resolve within 1-4 weeks. I'll order blood work in 2 weeks to check your kidney function on the new medication.\n\nBest regards,\n${providerName}`,
        },
        {
          label: 'Brief Response', tone: 'Concise', confidence: 0.88,
          content: `Dear ${firstName},\n\nThe cough is a common side effect of lisinopril. I'm switching you to losartan 50mg — same blood pressure benefit without the cough. Stop lisinopril, start losartan tomorrow. Blood work to recheck in 2 weeks.\n\nThe cough should resolve within 1-4 weeks.\n\nBest regards,\n${providerName}`,
        },
      ],
      staffDraft: {
        label: 'Staff Instructions', tone: 'Clinical', confidence: 0.94,
        content: `Medication switch for ${firstName} — ACEi cough:\n1. D/C lisinopril, start losartan 50mg daily\n2. Send new Rx to pharmacy, cancel lisinopril refills\n3. Order BMP in 2 weeks (renal function + K+ monitoring)\n4. Schedule BP recheck in 4 weeks\n5. Instruct patient: stop lisinopril today, start losartan tomorrow AM\n6. If cough not resolved in 4 weeks, notify provider`,
      },
      staffInstruction: {
        assignTo: 'RN',
        action: 'Process medication switch and schedule follow-up',
        priority: 'soon',
        details: 'ACEi to ARB switch. D/C lisinopril, start losartan 50mg. Labs in 2 weeks, BP check in 4 weeks.',
        schedulingGuidance: 'Schedule BP recheck in 4 weeks. Attach BMP lab order for 2 weeks post-switch.',
      },
    };
  } else if (isChest) {
    response = {
      intent: 'symptom-report',
      severity: 'urgent',
      reasoning: 'Chest symptoms require prompt cardiac workup to rule out acute coronary syndrome. Risk stratification needed.',
      pendedActions: [
        { type: 'lab', title: 'Order troponin', detail: 'Rule out acute cardiac injury', enabled: true, confidence: 0.92 },
        { type: 'lab', title: 'Order complete blood count', detail: 'Evaluate for anemia contributing to symptoms', enabled: true, confidence: 0.85 },
        { type: 'imaging', title: 'Order 12-lead electrocardiogram', detail: 'Cardiac rhythm and ischemia evaluation', enabled: true, confidence: 0.95 },
        { type: 'referral', title: 'Referral to cardiology', detail: 'Cardiac evaluation', enabled: false, confidence: 0.75 },
      ],
      patientDrafts: [
        {
          label: 'Urgent Response', tone: 'Detailed', confidence: 0.90,
          content: `Dear ${firstName},\n\nThank you for letting us know about your symptoms. Chest-related symptoms are something we always want to evaluate promptly.\n\nI'm ordering some tests to make sure everything is okay:\n  - A heart tracing test to check your heart rhythm\n  - Blood work to check your heart enzymes and blood counts\n\nPlease come in today or tomorrow to complete these tests. Our staff will contact you to arrange this.\n\nIMPORTANT: If you experience severe chest pain, difficulty breathing, or feel faint, please call 911 or go to the nearest emergency room immediately.\n\nBest regards,\n${providerName}`,
        },
      ],
      staffDraft: {
        label: 'Staff Instructions', tone: 'Clinical', confidence: 0.95,
        content: `URGENT — Chest symptoms for ${firstName}:\n1. Contact patient ASAP to schedule same-day or next-day visit\n2. Orders placed: Troponin, CBC, 12-lead ECG\n3. If patient reports acute/worsening symptoms, advise ER immediately\n4. Prepare for urgent visit: vitals (including bilateral BPs), ECG on arrival\n5. Have crash cart accessible\n6. If unable to reach patient within 1 hour, escalate to provider`,
      },
      staffInstruction: {
        assignTo: 'RN',
        action: 'Urgent patient contact and same-day scheduling',
        priority: 'urgent',
        details: 'Chest symptoms — needs prompt cardiac workup. Contact patient, schedule same-day if possible.',
        schedulingGuidance: 'Same-day or next-day urgent visit. 30-minute slot. ECG on arrival before provider sees patient.',
      },
    };
  } else if (isFatigue) {
    response = {
      intent: 'symptom-report',
      severity: 'soon',
      reasoning: 'Fatigue workup indicated. Common causes include thyroid dysfunction, anemia, vitamin deficiency, and diabetes.',
      pendedActions: [
        { type: 'lab', title: 'Order thyroid panel', detail: 'Rule out hypothyroidism as cause of fatigue', enabled: true, confidence: 0.92 },
        { type: 'lab', title: 'Order complete blood count', detail: 'Rule out anemia', enabled: true, confidence: 0.90 },
        { type: 'lab', title: 'Order iron studies and ferritin', detail: 'Evaluate for iron deficiency', enabled: true, confidence: 0.85 },
        { type: 'lab', title: 'Order vitamin D level', detail: 'Common deficiency contributing to fatigue', enabled: false, confidence: 0.70 },
        { type: 'follow-up', title: 'Follow-up in 2-3 weeks', detail: 'Review lab results and assess symptoms', enabled: true, confidence: 0.88 },
      ],
      patientDrafts: [
        {
          label: 'Comprehensive Response', tone: 'Detailed', confidence: 0.92,
          content: `Dear ${firstName},\n\nI'm sorry to hear you've been feeling so fatigued. There are several common causes we should check for, and the good news is they're all very treatable.\n\nI'm ordering blood work to check your:\n  - Thyroid function\n  - Blood counts (to check for anemia)\n  - Iron levels\n\nYou can complete these at any Quest or LabCorp location — no special preparation is needed.\n\nOnce we have the results (usually within a few days), I'd like to see you for a follow-up to review everything and discuss next steps.\n\nIn the meantime, try to maintain a regular sleep schedule and stay hydrated.\n\nBest regards,\n${providerName}`,
        },
        {
          label: 'Brief Response', tone: 'Concise', confidence: 0.85,
          content: `Dear ${firstName},\n\nLet's check some blood work to find the cause of your fatigue. I'm ordering tests for your thyroid, blood counts, and iron levels.\n\nPlease get these drawn at your convenience, and we'll schedule a follow-up to review results.\n\nBest regards,\n${providerName}`,
        },
      ],
      staffDraft: {
        label: 'Staff Instructions', tone: 'Clinical', confidence: 0.90,
        content: `Fatigue workup for ${firstName}:\n1. Lab orders placed: TSH/Free T4, CBC w/ diff, Iron studies/Ferritin, (Vitamin D optional)\n2. Provide patient with lab requisition — fasting not required\n3. Schedule follow-up in 2-3 weeks for result review\n4. If patient reports additional symptoms (weight changes, hair loss, cold intolerance), note for provider`,
      },
      staffInstruction: {
        assignTo: 'MA',
        action: 'Provide lab orders and schedule follow-up',
        priority: 'routine',
        details: 'Fatigue workup — labs ordered, need follow-up scheduled.',
        schedulingGuidance: 'Schedule 15-minute follow-up in 2-3 weeks. Standard office visit for lab review.',
      },
    };
  } else if (isLabQuestion) {
    response = {
      intent: 'lab-question',
      severity: 'routine',
      reasoning: 'Patient inquiring about lab results. Review values and provide clear explanation.',
      pendedActions: [
        { type: 'follow-up', title: 'Schedule follow-up if needed', detail: 'Discuss results and treatment plan', enabled: false, confidence: 0.70 },
      ],
      patientDrafts: [
        {
          label: 'Detailed Explanation', tone: 'Educational', confidence: 0.92,
          content: `Dear ${firstName},\n\nThank you for your question about your recent blood work. I'm happy to explain what the results mean.\n\nOverall your results look reassuring. I'll continue to monitor these values at your regular check-ups.\n\nIf you have any other questions about your results, don't hesitate to ask.\n\nBest regards,\n${providerName}`,
        },
        {
          label: 'Brief Reassurance', tone: 'Concise', confidence: 0.85,
          content: `Dear ${firstName},\n\nI've reviewed your recent blood work. Everything looks good and within normal range. We'll continue to monitor at your regular visits.\n\nPlease reach out if you have any other questions.\n\nBest regards,\n${providerName}`,
        },
      ],
      staffDraft: {
        label: 'Staff Instructions', tone: 'Clinical', confidence: 0.88,
        content: `Lab question from ${firstName}:\n1. Provider has reviewed results and drafted response\n2. No additional action needed unless provider requests follow-up\n3. If patient calls back with concerns, route to provider's message queue`,
      },
      staffInstruction: {
        assignTo: 'MA',
        action: 'Send provider response to patient',
        priority: 'routine',
        details: 'Lab question — provider has reviewed and drafted response.',
        schedulingGuidance: 'No appointment needed unless patient requests one.',
      },
    };
  }

  // Add default patient draft if none generated
  if (response.patientDrafts.length === 0) {
    response.patientDrafts.push({
      label: 'General Response', tone: 'Friendly', confidence: 0.80,
      content: `Dear ${firstName},\n\nThank you for reaching out. I've reviewed your message and will take the appropriate steps to address your concern.\n\nIf your symptoms change or worsen, please don't hesitate to contact us.\n\nBest regards,\n${providerName}`,
    });
  }

  return JSON.stringify(response);
}
