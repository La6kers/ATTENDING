# ATTENDING Platform -- Four-Feature Architecture Design

**Date:** 2026-03-24
**Scope:** Seed demo (React + Express + sql.js) and enterprise scaffold (Next.js 14 + Prisma + PostgreSQL)
**Design principles:** Lean, cost-effective, easily expandable. Enterprise scaffold visible but seed-functional.

---

## Current Architecture Summary

### Seed Demo (main branch, `attending-medical-ai/`)

```
attending-medical-ai/
  apps/
    backend/
      db/
        database.js      -- sql.js wrapper (queryAll, queryOne, execute)
        schema.sql       -- 3 tables: patients, encounters, ai_interactions
        seed.sql         -- 8 patients, 8 encounters at various stages
      routes/
        patients.js      -- CRUD
        encounters.js    -- CRUD + PATCH status transitions
        ai.js            -- 5 AI endpoints (intake-followup, intake-summary, encounter-assist, generate-note, review)
      services/
        claude.js        -- Direct Anthropic SDK, 5 functions, logInteraction()
      server.js          -- Express, 3 route groups
    frontend/
      src/
        pages/
          Dashboard.jsx       -- Stats + active/completed encounters
          CompassIntake.jsx   -- 6-step patient intake (welcome > demographics > symptoms > followup > vitals > complete)
          WaitingRoom.jsx     -- Queue view
          Encounter.jsx       -- Clinician exam view + AI assist
          Charting.jsx        -- SOAP note entry + AI generation
          VisitReview.jsx     -- Quality review + coding
        components/
          AIInsight.jsx       -- Reusable AI response card
          SOAPNote.jsx        -- Rendered note display
          PatientCard.jsx     -- Patient summary card
          SymptomInput.jsx    -- Chief complaint entry
          Layout.jsx          -- Clinician nav shell
```

**Encounter status flow:** `intake -> waiting -> in_progress -> charting -> review -> completed`

**Key architectural traits:**
- No authentication (seed mode)
- All AI calls go directly to Claude (hardcoded in `services/claude.js`)
- JSON stored as TEXT in SQLite columns (intake_data, vitals, etc.)
- Only `started_at` and `completed_at` timestamps (no per-stage timing)
- No guardrail/safety systems
- No demo automation

### Enterprise Scaffold (mockup-2 branch)

```
apps/
  shared/
    services/
      ClaudeService.ts                -- Singleton, 5 methods, ENABLE_CLAUDE_AI env flag
      ClaudePrompts.ts                -- System prompts + predictive OLDCARTS questions
      ClinicalRecommendationService.ts -- Rule-based symptom->order mappings
    types/
      claude.types.ts                 -- Full request/response interfaces, AISource union
    catalogs/
      labs.ts, imaging.ts, medications.ts -- Static order catalogs
  provider-portal/
    pages/api/
      clinical/
        drug-check.ts    -- DrugInteractionChecker (rule-based, from @attending/clinical-services)
        red-flags.ts     -- RedFlagEvaluator (rule-based, from @attending/clinical-services)
        triage.ts, protocols.ts, labs.ts
      encounters/[id]/
        note.ts          -- SOAP note generation (Claude with fallback)
        quality-review.ts
    components/encounter/
      SOAPNoteEditor.tsx -- Section-editable SOAP note
    store/
      assessmentQueueStore.ts, medicationOrderingStore.ts, etc.
  patient-portal/
    machines/assessmentMachine.ts -- XState assessment flow
services/
  cds-hooks/             -- HL7 CDS Hooks (encounter-start, order-select, patient-view)
prisma/
  schema.prisma          -- ~30 models, full clinical data model
```

**Key enterprise traits:**
- ClaudeService already has `isAvailable()` guard and AISource type
- DrugInteractionChecker and RedFlagEvaluator exist as imports from `@attending/clinical-services`
- Prisma `AIInteraction` model already tracks latencyMs, token counts, estimated cost
- CDS Hooks service already structured for clinical decision support
- Enterprise encounter has 9 statuses (vs seed's 6)

---

## RECOMMENDATION #1: Encounter Timing Metrics

### Purpose
Track how long each encounter stage takes to produce the killer pitch metric: "Our platform reduces documentation time by X%."

### 1. File Structure

**Seed demo -- new/modified files:**
```
apps/backend/
  db/schema.sql                          -- ADD encounter_events table
  db/seed.sql                            -- ADD realistic timing seed data
  routes/encounters.js                   -- MODIFY status PATCH to record timestamps
  routes/metrics.js                      -- NEW: aggregate metrics endpoints
  services/metrics.js                    -- NEW: calculation engine
apps/frontend/
  src/components/MetricsPanel.jsx        -- NEW: dashboard metrics widget
  src/components/EncounterTimeline.jsx   -- NEW: per-encounter timing breakdown
  src/pages/Dashboard.jsx                -- MODIFY: add metrics section
  src/pages/VisitReview.jsx              -- MODIFY: enhance timeline
```

**Enterprise scaffold -- new/modified files:**
```
prisma/schema.prisma                     -- ADD EncounterEvent model
apps/shared/types/metrics.types.ts       -- NEW: timing metric interfaces
apps/shared/services/MetricsService.ts   -- NEW: aggregate metric calculations
apps/provider-portal/
  pages/api/metrics/
    encounters.ts                        -- NEW: aggregate metrics API
    encounters/[id]/timeline.ts          -- NEW: per-encounter timeline API
  components/dashboard/MetricsPanel.tsx  -- NEW: dashboard metrics widget
  components/encounter/EncounterTimeline.tsx -- NEW: detailed timing view
```

### 2. Data Models / Schema Changes

**Seed demo (schema.sql) -- new table:**
```sql
CREATE TABLE IF NOT EXISTS encounter_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  encounter_id INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  -- event_type values:
  --   status_change: intake, waiting, in_progress, charting, review, completed
  --   ai_request_start, ai_request_end: bracket AI call duration
  --   user_action: manual documentation events
  from_status TEXT,
  to_status TEXT,
  timestamp TEXT DEFAULT (datetime('now')),
  duration_ms INTEGER,        -- NULL on first event; calculated from prev event of same encounter
  metadata TEXT DEFAULT '{}', -- JSON: {ai_type, tokens, model} for AI events
  FOREIGN KEY (encounter_id) REFERENCES encounters(id)
);

CREATE INDEX idx_encounter_events_encounter ON encounter_events(encounter_id);
CREATE INDEX idx_encounter_events_type ON encounter_events(event_type);
```

**Enterprise (prisma/schema.prisma) -- new model:**
```prisma
model EncounterEvent {
  id           String   @id @default(cuid())
  encounterId  String
  eventType    EncounterEventType
  fromStatus   EncounterStatus?
  toStatus     EncounterStatus?
  timestamp    DateTime @default(now())
  durationMs   Int?
  metadata     Json?
  createdAt    DateTime @default(now())

  encounter Encounter @relation(fields: [encounterId], references: [id], onDelete: Cascade)

  @@index([encounterId])
  @@index([eventType])
  @@index([timestamp])
}

enum EncounterEventType {
  STATUS_CHANGE
  AI_REQUEST_START
  AI_REQUEST_END
  USER_ACTION
  GUARDRAIL_CHECK
}
```

Add to existing `Encounter` model:
```prisma
model Encounter {
  // ... existing fields ...
  events  EncounterEvent[]
}
```

### 3. API Endpoints

**Seed demo:**

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/metrics/encounters` | Aggregate metrics across all encounters |
| GET | `/api/metrics/encounters/:id/timeline` | Per-encounter event timeline |
| GET | `/api/metrics/summary` | Dashboard summary (avg times, AI usage) |

**Enterprise:**

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/metrics/encounters` | Aggregate metrics with date range filtering |
| GET | `/api/metrics/encounters/[id]/timeline` | Per-encounter event timeline |
| GET | `/api/metrics/dashboard` | Provider-specific dashboard summary |
| GET | `/api/metrics/ai-usage` | AI cost and token tracking |

### 4. Key Interfaces/Types

```typescript
// apps/shared/types/metrics.types.ts (enterprise)
// apps/backend/services/metrics.js equivalent in seed

interface EncounterTimingMetrics {
  encounterId: string;
  totalDurationMs: number;
  stageDurations: Record<EncounterStage, number>;  // ms per stage
  aiInteractions: {
    count: number;
    totalLatencyMs: number;
    avgLatencyMs: number;
    totalTokens: number;
    estimatedCost: number;
  };
  documentationTimeMs: number;  // charting + review stages combined
  timeToFirstAI: number | null; // ms from encounter start to first AI request
}

type EncounterStage =
  | 'intake_to_waiting'
  | 'waiting_to_in_progress'
  | 'in_progress_to_charting'
  | 'charting_to_review'
  | 'review_to_completed';

interface AggregateMetrics {
  period: { start: string; end: string };
  encounterCount: number;
  avgTotalDurationMs: number;
  avgDocumentationTimeMs: number;
  avgStageDurations: Record<EncounterStage, number>;
  avgAILatencyMs: number;
  totalAICost: number;
  percentileDocTime: {
    p50: number;
    p90: number;
    p95: number;
  };
}

interface DashboardMetrics {
  today: AggregateMetrics;
  thisWeek: AggregateMetrics;
  allTime: AggregateMetrics;
  aiSavingsEstimate: {
    avgWithAI: number;
    estimatedWithoutAI: number;
    timeSavedPercent: number;
    timeSavedMinutes: number;
  };
}
```

### 5. Integration Points with Existing Code

**Seed `routes/encounters.js` -- PATCH /:id/status handler (line 95-126):**
The existing status transition handler must emit an `encounter_event` on every successful transition. Insert after line 123 (`db.execute(sql, params)`):

```javascript
// Record timing event
const prevEvent = db.queryOne(
  `SELECT timestamp FROM encounter_events WHERE encounter_id = ? ORDER BY timestamp DESC LIMIT 1`,
  [parseInt(req.params.id)]
);
const now = new Date().toISOString();
const durationMs = prevEvent
  ? new Date(now).getTime() - new Date(prevEvent.timestamp).getTime()
  : null;

db.execute(
  `INSERT INTO encounter_events (encounter_id, event_type, from_status, to_status, timestamp, duration_ms)
   VALUES (?, 'status_change', ?, ?, ?, ?)`,
  [parseInt(req.params.id), current.status, status, now, durationMs]
);
```

**Seed `routes/ai.js` -- every AI endpoint:**
Wrap each AI call with start/end events. Example for intake-followup (lines 16-38):

```javascript
// Before AI call
db.execute(
  `INSERT INTO encounter_events (encounter_id, event_type, metadata) VALUES (?, 'ai_request_start', ?)`,
  [encounterId, JSON.stringify({ ai_type: 'intake_followup' })]
);

const result = await intakeFollowup(patientData, current_symptoms);

// After AI call
db.execute(
  `INSERT INTO encounter_events (encounter_id, event_type, duration_ms, metadata) VALUES (?, 'ai_request_end', ?, ?)`,
  [encounterId, Date.now() - startTime, JSON.stringify({ ai_type: 'intake_followup', tokens: result.tokens })]
);
```

**Seed `pages/Dashboard.jsx`:**
Add a `<MetricsPanel />` component below the stats cards that fetches `/api/metrics/summary` and displays:
- Average encounter time (total)
- Average documentation time (charting + review)
- AI-assisted vs manual comparison
- A "Time Saved" highlight number for the pitch

**Seed `pages/VisitReview.jsx` -- Encounter Timeline section (lines 189-197):**
Replace the basic `TimelineItem` with `<EncounterTimeline encounterId={id} />` that fetches the full event list and renders a visual waterfall showing each stage with duration.

**Enterprise:** The `ClaudeService.ts` already logs `latencyMs` via `logInteraction()`. Wire this to also create `EncounterEvent` records. The `AIInteraction` model already captures the data; `EncounterEvent` provides the unified timeline view.

### 6. Implementation Order

1. **Schema first:** Add `encounter_events` table to `schema.sql` and seed realistic timing data in `seed.sql`
2. **Backend instrumentation:** Modify `encounters.js` PATCH handler and `ai.js` endpoints to emit events
3. **Metrics service:** Create `services/metrics.js` with aggregation logic
4. **Metrics API:** Create `routes/metrics.js` with the 3 endpoints
5. **Frontend timeline:** Build `EncounterTimeline.jsx` and integrate into `VisitReview.jsx`
6. **Frontend dashboard:** Build `MetricsPanel.jsx` and integrate into `Dashboard.jsx`
7. **Seed data:** Backfill seed encounters with realistic timing events so the demo has data on first load

**Dependencies:** None external. Uses only existing sql.js infrastructure.

---

## RECOMMENDATION #2: AI Provider Abstraction Layer

### Purpose
Decouple AI calls from Claude so the platform can switch providers via env flag. Currently the seed demo is hardcoded to `@anthropic-ai/sdk` in `services/claude.js`; the enterprise scaffold has `ClaudeService.ts` with an `isAvailable()` guard but no provider switching.

### 1. File Structure

**Seed demo -- new/modified files:**
```
apps/backend/
  services/
    claude.js                -- REMOVE (replaced by ai-provider/)
    ai-provider/
      index.js               -- NEW: factory + provider resolution
      types.js               -- NEW: JSDoc type definitions
      claude-provider.js     -- NEW: Claude implementation (extracted from claude.js)
      openai-provider.js     -- NEW: OpenAI stub
      mock-provider.js       -- NEW: Deterministic mock responses (for demo mode)
      provider-registry.js   -- NEW: Available provider enumeration
  routes/
    ai.js                    -- MODIFY: import from ai-provider/ instead of claude.js
```

**Enterprise scaffold -- new/modified files:**
```
apps/shared/
  services/
    ClaudeService.ts              -- KEEP but make it implement AIProvider interface
    ai-provider/
      index.ts                    -- NEW: factory + singleton
      AIProvider.interface.ts     -- NEW: provider contract
      ClaudeProvider.ts           -- NEW: wraps existing ClaudeService
      OpenAIProvider.ts           -- NEW: stub
      MockProvider.ts             -- NEW: cached/deterministic responses
      ProviderRegistry.ts         -- NEW: runtime provider resolution
    ai-provider.config.ts         -- NEW: env-driven configuration
  types/
    ai-provider.types.ts          -- NEW: provider-agnostic request/response types
```

### 2. Data Models / Schema Changes

**Seed (schema.sql) -- modify `ai_interactions` table:**
```sql
-- Add provider column to track which provider handled each interaction
ALTER TABLE ai_interactions ADD COLUMN provider TEXT DEFAULT 'claude';
-- Values: 'claude', 'openai', 'mock', 'local'
```

**Enterprise (schema.prisma) -- modify `AIInteraction` model:**
```prisma
model AIInteraction {
  // ... existing fields ...
  provider    String    @default("claude")  // NEW: 'claude' | 'openai' | 'mock' | 'local'
  // 'model' field already exists
}
```

### 3. API Endpoints

No new endpoints required. The abstraction is internal -- existing `/api/ai/*` endpoints remain identical. Add one health/config endpoint:

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/ai/config` | Returns current provider, enabled status, available providers |

```json
{
  "enabled": true,
  "provider": "claude",
  "availableProviders": ["claude", "openai", "mock"],
  "features": {
    "intake_followup": true,
    "intake_summary": true,
    "encounter_assist": true,
    "generate_note": true,
    "quality_review": true
  }
}
```

### 4. Key Interfaces/Types

```typescript
// apps/shared/services/ai-provider/AIProvider.interface.ts

/**
 * Every AI provider must implement this contract.
 * Methods return null on failure (graceful degradation).
 */
interface AIProvider {
  readonly name: string;              // 'claude' | 'openai' | 'mock' | 'local'
  readonly isAvailable: boolean;

  intakeFollowup(input: AIIntakeFollowupInput): Promise<AIIntakeFollowupOutput | null>;
  intakeSummary(input: AIIntakeSummaryInput): Promise<AIIntakeSummaryOutput | null>;
  encounterAssist(input: AIEncounterAssistInput): Promise<AIEncounterAssistOutput | null>;
  generateNote(input: AIGenerateNoteInput): Promise<AIGenerateNoteOutput | null>;
  qualityReview(input: AIQualityReviewInput): Promise<AIQualityReviewOutput | null>;
}

// Provider-agnostic input/output types (map 1:1 to existing Claude types)
interface AIIntakeFollowupInput {
  patientAge: number;
  patientGender: string;
  medicalHistory: string[];
  medications: string[];
  allergies: string[];
  currentSymptoms: string;
}

interface AIIntakeFollowupOutput {
  questions: Array<{ question: string; category: string }>;
  source: 'claude' | 'openai' | 'mock' | 'local';
  tokens?: number;
  latencyMs: number;
}

// ... similar for other 4 methods

// Factory configuration
interface AIProviderConfig {
  provider: 'claude' | 'openai' | 'mock' | 'local';
  enabled: boolean;         // Master switch (ENABLE_AI env var)
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  fallbackProvider?: string; // If primary fails, try this
  mockResponseDelayMs?: number; // Simulate latency in mock mode
}
```

**Environment variables:**
```env
# Master switch
ENABLE_AI=true

# Provider selection
AI_PROVIDER=claude           # claude | openai | mock | local

# Claude-specific
ANTHROPIC_API_KEY=sk-ant-...
CLAUDE_MODEL=claude-sonnet-4-5-20250514

# OpenAI-specific (future)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4

# Mock configuration
MOCK_AI_DELAY_MS=800         # Simulate realistic latency
```

### 5. Integration Points with Existing Code

**Seed `services/claude.js` -> `services/ai-provider/index.js`:**

The existing `claude.js` exports 5 functions (`intakeFollowup`, `intakeSummary`, `encounterAssist`, `generateNote`, `qualityReview`) plus `callClaude` and `logInteraction`. The new `ai-provider/index.js` must export the same 5 function signatures so that `routes/ai.js` requires minimal changes:

```javascript
// ai-provider/index.js
import { createProvider } from './provider-registry.js';

const provider = createProvider(); // reads AI_PROVIDER and ENABLE_AI env vars

// Re-export with same signatures as old claude.js
export const intakeFollowup = (patientData, symptoms) => provider.intakeFollowup(patientData, symptoms);
export const intakeSummary = (patientData, intakeData) => provider.intakeSummary(patientData, intakeData);
export const encounterAssist = (patientData, intakeData, notes) => provider.encounterAssist(patientData, intakeData, notes);
export const generateNote = (patientData, encounterData) => provider.generateNote(patientData, encounterData);
export const qualityReview = (soapNote, encounterData) => provider.qualityReview(soapNote, encounterData);
export { logInteraction } from './provider-registry.js';
```

**Seed `routes/ai.js` (line 2):**
Change import from:
```javascript
import { intakeFollowup, intakeSummary, encounterAssist, generateNote, qualityReview, logInteraction } from '../services/claude.js';
```
To:
```javascript
import { intakeFollowup, intakeSummary, encounterAssist, generateNote, qualityReview, logInteraction } from '../services/ai-provider/index.js';
```

**Enterprise `ClaudeService.ts`:**
Keep as-is but have `ClaudeProvider.ts` delegate to it. The existing singleton pattern and interaction logging continue to work. The new `AIProvider` interface is a superset of what `ClaudeService` already provides.

**Enterprise `encounters/[id]/note.ts` (line 21):**
Currently checks `claudeService.isAvailable()`. Replace with:
```typescript
import { aiProvider } from '@attending/shared/services/ai-provider';
// ...
if (!aiProvider.isAvailable) { /* fallback */ }
const result = await aiProvider.generateNote({ ... });
```

### 6. Implementation Order

1. **Define interface:** Create `AIProvider.interface.ts` (enterprise) and JSDoc equivalent (seed)
2. **Extract Claude provider:** Move `claude.js` logic into `claude-provider.js`, implementing the interface
3. **Build mock provider:** Deterministic responses using seed data -- this is critical for demo mode (Rec #3)
4. **Build factory:** `provider-registry.js` reads env vars, instantiates correct provider
5. **Create facade:** `ai-provider/index.js` re-exports the 5 functions
6. **Update routes:** Change single import line in `routes/ai.js`
7. **Stub OpenAI:** Empty implementation that returns null (future work)
8. **Add config endpoint:** `/api/ai/config`

**Dependencies:** None external for seed. Enterprise OpenAI provider would need `openai` npm package (stub only for now).

---

## RECOMMENDATION #3: Demo Script (3-Minute Patient Journey)

### Purpose
Build the technical infrastructure for a guided, repeatable 3-minute demo that walks through the entire ATTENDING workflow without requiring an API key.

### 1. File Structure

**Seed demo -- new/modified files:**
```
apps/backend/
  services/
    ai-provider/
      mock-provider.js             -- Extends from Rec #2; cached clinical responses
    demo/
      demo-controller.js           -- NEW: orchestrates demo state machine
      demo-scenarios.js            -- NEW: pre-scripted patient journeys
      demo-responses.js            -- NEW: cached AI responses for each scenario step
  routes/
    demo.js                        -- NEW: demo control endpoints
  db/
    seed.sql                       -- MODIFY: add demo-ready encounter
apps/frontend/
  src/components/
    DemoController.jsx             -- NEW: floating demo control panel
    DemoOverlay.jsx                -- NEW: step explanation overlay
    DemoHighlight.jsx              -- NEW: feature highlight callouts
  src/hooks/
    useDemo.js                     -- NEW: demo state management hook
  src/pages/
    Dashboard.jsx                  -- MODIFY: add demo launch button
    CompassIntake.jsx              -- MODIFY: listen for demo auto-fill events
    Encounter.jsx                  -- MODIFY: listen for demo auto-fill events
    Charting.jsx                   -- MODIFY: listen for demo auto-fill events
    VisitReview.jsx                -- MODIFY: listen for demo auto-fill events
```

**Enterprise scaffold:**
```
apps/shared/
  services/
    demo/
      DemoController.ts            -- NEW: state machine for demo flow
      DemoScenarios.ts             -- NEW: scenario definitions
      DemoCachedResponses.ts       -- NEW: pre-computed AI responses
  types/
    demo.types.ts                  -- NEW: demo interfaces
apps/provider-portal/
  components/demo/
    DemoPanel.tsx                   -- NEW: floating control panel
    DemoOverlay.tsx                 -- NEW: explanatory overlay
    DemoHighlight.tsx               -- NEW: AI feature callouts
  pages/api/demo/
    start.ts                       -- NEW: initialize demo session
    step.ts                        -- NEW: advance/pause/skip
    reset.ts                       -- NEW: clean demo state
```

### 2. Data Models / Schema Changes

**No persistent schema changes.** Demo state is ephemeral (in-memory on the server, localStorage on the client). However, the demo does create/use real encounter records with a `demo` flag:

**Seed -- add to encounters table (considered but rejected in favor of a simpler approach):**
Instead of schema changes, the demo controller creates a normal encounter and tracks it by ID in memory. On reset, it deletes demo-created records.

**Demo scenario data structure (in-memory):**
```javascript
// demo-scenarios.js
const SCENARIOS = {
  chest_pain: {
    name: "Maria Santos - Chest Pain",
    patient_id: 1,  // existing seed patient
    duration_target_ms: 180000, // 3 minutes
    steps: [
      {
        id: 'compass_start',
        page: '/compass/1',
        stage: 'intake',
        duration_ms: 30000,
        auto_fill: { chief_complaint: "Chest pain and shortness of breath for 2 days" },
        ai_highlight: "COMPASS asks AI-powered follow-up questions",
        cached_ai_response: "intake_followup_chest_pain",
        narration: "Patient Maria Santos begins her visit through COMPASS, our AI-powered intake system.",
      },
      // ... 8-10 more steps
    ]
  }
};
```

### 3. API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/demo/start` | Start demo: `{ scenario: 'chest_pain' }` -> returns demo session |
| POST | `/api/demo/step` | Advance: `{ action: 'next' | 'prev' | 'pause' | 'resume' | 'skip' }` |
| GET | `/api/demo/state` | Current demo state (step, timing, highlights) |
| POST | `/api/demo/reset` | Clean up demo data, return to dashboard |
| GET | `/api/demo/scenarios` | List available scenarios |

### 4. Key Interfaces/Types

```typescript
// demo.types.ts

interface DemoScenario {
  id: string;
  name: string;
  description: string;
  patientId: number;            // Existing seed patient
  targetDurationMs: number;
  steps: DemoStep[];
}

interface DemoStep {
  id: string;
  page: string;                 // Route to navigate to
  stage: EncounterStatus;
  durationMs: number;           // How long to stay on this step
  autoFill?: Record<string, any>;  // Form values to auto-populate
  aiHighlight?: string;         // Feature callout text
  cachedAIResponseKey?: string; // Key into DemoCachedResponses
  narration: string;            // Explanation text for the overlay
  userAction?: string;          // "Click 'Get AI Assist'" -- optional manual step
  autoAdvance: boolean;         // Auto-move to next step when timer expires
}

interface DemoSession {
  id: string;
  scenarioId: string;
  encounterId: number;
  currentStepIndex: number;
  state: 'running' | 'paused' | 'completed';
  startedAt: string;
  stepStartedAt: string;
  timing: {
    elapsed: number;
    remaining: number;
    stepElapsed: number;
    stepRemaining: number;
  };
}

interface DemoCachedResponse {
  key: string;
  endpoint: string;              // Which /api/ai/* endpoint this replaces
  response: any;                 // Pre-computed response body
  simulatedLatencyMs: number;    // Fake delay for realism
}

// Client-side hook state
interface UseDemoState {
  active: boolean;
  session: DemoSession | null;
  currentStep: DemoStep | null;
  highlights: string[];
  narration: string;
  controls: {
    next: () => void;
    prev: () => void;
    pause: () => void;
    resume: () => void;
    skip: () => void;
    stop: () => void;
  };
}
```

### 5. Integration Points with Existing Code

**Mock provider integration (depends on Rec #2):**
When demo mode is active, the AI provider abstraction layer switches to the mock provider automatically. The mock provider returns cached responses keyed by the demo step ID. This means the demo works without any API key.

```javascript
// In ai-provider/index.js
import { isDemoActive, getDemoCachedResponse } from '../demo/demo-controller.js';

// Inside each provider method:
if (isDemoActive()) {
  const cached = getDemoCachedResponse(interactionType);
  if (cached) return cached;
}
// else: fall through to real provider
```

**Seed `pages/CompassIntake.jsx` -- demo auto-fill:**
The `useDemo` hook exposes auto-fill data. Each page component checks for active demo and pre-populates forms:

```jsx
// In CompassIntake.jsx
const { active, currentStep } = useDemo();

useEffect(() => {
  if (active && currentStep?.autoFill) {
    // Auto-populate form fields from demo step
    Object.entries(currentStep.autoFill).forEach(([field, value]) => {
      updateForm(field, value);
    });
  }
}, [active, currentStep]);
```

**Seed `pages/Dashboard.jsx` -- demo launch:**
Add a "Run Demo" button in the Quick Actions section (line 93-102). This button calls `/api/demo/start` and then navigates to the first step's page.

**Seed `components/DemoController.jsx` -- floating panel:**
A fixed-position panel in the bottom-right of all pages during demo mode. Shows:
- Current step name and narration
- Progress bar (step N of M)
- Elapsed/remaining time
- Pause, Resume, Skip, Stop buttons
- AI feature highlight callouts

The panel is rendered in `Layout.jsx` (for clinician views) and independently in `CompassIntake.jsx` (patient-facing).

**Timing metrics integration (depends on Rec #1):**
The demo generates real `encounter_events` records, so the metrics panel shows accurate timing data for the demo encounter. This is intentional -- the demo encounter serves as example data for the metrics dashboard.

### 6. Implementation Order

1. **Pre-compute AI responses:** Record real Claude responses for the chest pain scenario; store as JSON in `demo-responses.js` (this is a one-time manual step)
2. **Demo controller:** Build `demo-controller.js` with state machine (running/paused/completed transitions)
3. **Demo scenarios:** Define the chest pain 3-minute walkthrough in `demo-scenarios.js`
4. **Demo API routes:** Create `routes/demo.js` with start/step/state/reset
5. **Mock provider wiring:** Integrate demo controller with mock provider from Rec #2
6. **Frontend hook:** Build `useDemo.js` that polls `/api/demo/state`
7. **DemoController component:** Build the floating control panel
8. **Page integration:** Add auto-fill listeners to all 5 page components
9. **DemoOverlay + DemoHighlight:** Build the narration and callout components
10. **End-to-end test:** Run full 3-minute demo end to end

**Dependencies:** Requires Rec #2 (AI Provider Abstraction) for the mock provider. Can be built in parallel if the mock provider interface is defined first.

---

## RECOMMENDATION #4: Rule-Based Clinical Guardrails

### Purpose
Build deterministic safety systems that run ALWAYS, regardless of AI availability. These are non-negotiable clinical safety checks.

### 1. File Structure

**Seed demo -- new/modified files:**
```
apps/backend/
  services/
    guardrails/
      index.js                     -- NEW: orchestrator, runs all checks
      drug-interactions.js         -- NEW: rule-based interaction lookup
      vital-alerts.js              -- NEW: age-stratified vital sign thresholds
      allergy-crossref.js          -- NEW: allergy-medication cross-reference
      red-flag-symptoms.js         -- NEW: dangerous symptom combinations
      guardrail-data/
        drug-interaction-table.json -- NEW: interaction rules dataset
        vital-ranges.json          -- NEW: normal ranges by age group
        allergy-crossref.json      -- NEW: drug-allergy mappings
        red-flag-rules.json        -- NEW: symptom combination rules
  routes/
    guardrails.js                  -- NEW: safety check endpoints
    encounters.js                  -- MODIFY: auto-run guardrails on status change
    ai.js                          -- MODIFY: append guardrail results to AI responses
apps/frontend/
  src/components/
    GuardrailAlert.jsx             -- NEW: safety alert banner
    DrugInteractionCard.jsx        -- NEW: interaction warning display
    VitalSignAlert.jsx             -- NEW: out-of-range vital highlight
  src/pages/
    Encounter.jsx                  -- MODIFY: display guardrail alerts
    Charting.jsx                   -- MODIFY: show drug interaction warnings
    VisitReview.jsx                -- MODIFY: show safety summary
```

**Enterprise scaffold -- new/modified files:**
```
apps/shared/
  services/
    guardrails/
      GuardrailOrchestrator.ts     -- NEW: runs all checks, combines results
      DrugInteractionEngine.ts     -- NEW: maps to existing @attending/clinical-services
      VitalSignEngine.ts           -- NEW: age-stratified threshold checks
      AllergyCrossReference.ts     -- NEW: allergy-drug matching
      RedFlagEngine.ts             -- NEW: maps to existing RedFlagEvaluator
    guardrails/data/
      drug-interactions.json       -- NEW: comprehensive rule dataset
      vital-ranges.json            -- NEW: ranges by age/gender
      allergy-crossref.json        -- NEW: allergen-drug families
      red-flag-rules.json          -- NEW: symptom pattern rules
  types/
    guardrails.types.ts            -- NEW: safety check interfaces
apps/provider-portal/
  pages/api/
    guardrails/
      check.ts                     -- NEW: run all guardrails on demand
      drug-check.ts                -- UPDATE: refactored from clinical/drug-check.ts
  components/
    guardrails/
      GuardrailBanner.tsx          -- NEW: persistent safety alert bar
      InteractionWarning.tsx       -- NEW: medication interaction detail
      VitalAlert.tsx               -- NEW: vital sign anomaly highlight
      SafetySummary.tsx            -- NEW: pre-sign safety checklist
```

### 2. Data Models / Schema Changes

**No new database tables.** Guardrail rules are static JSON datasets loaded at startup. Guardrail results are ephemeral (returned in API responses, not stored). However, guardrail check events are logged in the `encounter_events` table from Rec #1:

```sql
-- Logged via encounter_events with event_type = 'guardrail_check'
-- metadata JSON contains:
-- {
--   "check_type": "drug_interaction" | "vital_alert" | "allergy_crossref" | "red_flag",
--   "severity": "info" | "warning" | "critical" | "block",
--   "findings": [...],
--   "auto_blocked": false
-- }
```

### 3. API Endpoints

**Seed demo:**

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/guardrails/check` | Run all guardrails for an encounter |
| POST | `/api/guardrails/drug-interaction` | Check specific medication against current meds + allergies |
| POST | `/api/guardrails/vital-check` | Check vitals against age-appropriate ranges |
| POST | `/api/guardrails/red-flags` | Evaluate symptom combinations |

**Enterprise:**

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/guardrails/check` | Full guardrail suite for encounter |
| POST | `/api/guardrails/drug-interaction` | Specific drug check |
| POST | `/api/guardrails/vital-check` | Vital sign evaluation |
| POST | `/api/guardrails/red-flags` | Symptom pattern check |
| GET | `/api/guardrails/rules` | List active rules (for admin) |

### 4. Key Interfaces/Types

```typescript
// guardrails.types.ts

// --- Orchestrator ---

interface GuardrailCheckRequest {
  encounterId: string;
  patientId: string;
  patientAge: number;
  patientGender: 'Male' | 'Female' | 'Other';
  allergies: string[];
  currentMedications: string[];
  proposedMedications?: string[];
  vitals?: VitalSigns;
  symptoms?: string[];
  chiefComplaint?: string;
}

interface GuardrailCheckResult {
  encounterId: string;
  timestamp: string;
  overallSeverity: 'clear' | 'info' | 'warning' | 'critical' | 'block';
  checks: {
    drugInteractions: DrugInteractionResult;
    vitalAlerts: VitalAlertResult;
    allergyCrossRef: AllergyCrossRefResult;
    redFlags: RedFlagResult;
  };
  /** Ordered by severity descending */
  allAlerts: GuardrailAlert[];
  /** Whether any check recommends blocking the action */
  hasBlockingAlert: boolean;
}

// --- Drug Interactions ---

interface DrugInteractionRule {
  drug_a: string;
  drug_a_class: string;       // e.g., "ACE_INHIBITOR"
  drug_b: string;
  drug_b_class: string;
  severity: 'minor' | 'moderate' | 'major' | 'contraindicated';
  effect: string;             // "Increased risk of hyperkalemia"
  mechanism: string;          // "Both drugs increase potassium levels"
  management: string;         // "Monitor potassium levels, consider alternative"
}

interface DrugInteractionResult {
  checked: boolean;
  interactions: Array<{
    drug_a: string;
    drug_b: string;
    severity: string;
    effect: string;
    management: string;
  }>;
  maxSeverity: string;
}

// --- Vital Sign Alerts ---

interface VitalRange {
  age_group: 'pediatric_infant' | 'pediatric_child' | 'pediatric_adolescent' | 'adult' | 'geriatric';
  age_min: number;
  age_max: number;
  vital: string;
  unit: string;
  normal_low: number;
  normal_high: number;
  warning_low: number;
  warning_high: number;
  critical_low: number;
  critical_high: number;
}

interface VitalAlertResult {
  checked: boolean;
  alerts: Array<{
    vital: string;
    value: number;
    unit: string;
    severity: 'normal' | 'warning' | 'critical';
    range: { low: number; high: number };
    message: string;
  }>;
  maxSeverity: string;
}

// --- Allergy Cross-Reference ---

interface AllergyCrossRefRule {
  allergen: string;
  drug_family: string[];      // ["Amoxicillin", "Ampicillin", "Cephalexin"]
  cross_reactivity: string;   // "Penicillin allergy: 1-10% cephalosporin cross-reactivity"
  severity: 'caution' | 'avoid' | 'contraindicated';
}

interface AllergyCrossRefResult {
  checked: boolean;
  alerts: Array<{
    allergen: string;
    conflicting_medication: string;
    cross_reactivity: string;
    severity: string;
    recommendation: string;
  }>;
  maxSeverity: string;
}

// --- Red Flag Symptom Combinations ---

interface RedFlagRule {
  id: string;
  name: string;               // "Possible ACS"
  symptoms: string[];         // ["chest pain", "shortness of breath"]
  required_count: number;     // How many symptoms must match (2 = both required)
  vital_criteria?: {          // Optional vital sign criteria
    vital: string;
    operator: '>' | '<' | '>=' | '<=';
    value: number;
  }[];
  severity: 'urgent' | 'emergent' | 'critical';
  recommended_action: string;
  time_to_action: string;     // "Immediate", "Within 10 minutes"
  protocol?: string;          // "ACS Protocol"
}

interface RedFlagResult {
  checked: boolean;
  flags: Array<{
    rule_id: string;
    name: string;
    matched_symptoms: string[];
    severity: string;
    action: string;
    protocol?: string;
  }>;
  maxSeverity: string;
}

// --- Unified Alert ---

interface GuardrailAlert {
  id: string;
  type: 'drug_interaction' | 'vital_alert' | 'allergy_crossref' | 'red_flag';
  severity: 'info' | 'warning' | 'critical' | 'block';
  title: string;
  message: string;
  action?: string;
  dismissible: boolean;       // block-severity alerts are NOT dismissible
}
```

### 5. Integration Points with Existing Code

**Seed `routes/encounters.js` -- PATCH /:id/status (line 95-126):**
Before allowing certain status transitions, run guardrails automatically:

```javascript
// Before transition to 'charting' (from in_progress): run vital + red flag checks
// Before transition to 'completed' (from review): run full guardrail suite
if (status === 'charting' || status === 'completed') {
  const guardrailResult = await runGuardrails(encounter);
  if (guardrailResult.hasBlockingAlert) {
    return res.status(409).json({
      error: 'Safety check failed',
      alerts: guardrailResult.allAlerts.filter(a => a.severity === 'block'),
      guardrailResult
    });
  }
  // Include non-blocking alerts in response
  responseData.guardrailAlerts = guardrailResult.allAlerts;
}
```

**Seed `routes/ai.js` -- all AI endpoints:**
After every AI response, append guardrail context. The AI should not be the sole safety net:

```javascript
// Example: after encounter-assist response (line 94)
const guardrails = await runGuardrails(encounter);
res.json({
  assist: result.assist,
  guardrails: guardrails.allAlerts  // Always include safety info alongside AI
});
```

**Seed `pages/Encounter.jsx` -- display guardrail alerts:**
The existing left column (Patient info, lines 93-136) should include a `<GuardrailAlert />` banner above the patient info when alerts exist. Critical alerts get a red banner with a pulse animation. This integrates with the existing allergy display (line 116-121) but extends it to be more prominent.

**Seed `pages/Charting.jsx` -- drug interaction on medication mention:**
When the clinician types medication names in the Plan textarea, debounce and run `/api/guardrails/drug-interaction` against the patient's current medications and allergies. Display a `<DrugInteractionCard />` in the right column near the SOAP note.

**Enterprise mapping:**
The enterprise scaffold already has `DrugInteractionChecker` and `RedFlagEvaluator` imported from `@attending/clinical-services` in `clinical/drug-check.ts` and `clinical/red-flags.ts`. The seed guardrails should use the same data structure and rule format so that the transition is straightforward. The seed implementation is a simplified subset of the enterprise rules.

### 6. Rule Data: Seed-Appropriate Subset

The rule datasets should be small enough for the seed demo but realistic. Target sizes:

| Dataset | Seed count | Enterprise target |
|---------|-----------|-------------------|
| Drug interaction rules | 50-80 common pairs | 500+ |
| Vital sign ranges | 5 age groups x 6 vitals | Same + specialty ranges |
| Allergy cross-reference | 20-30 common allergen families | 200+ |
| Red flag symptom rules | 15-20 critical patterns | 100+ |

**Critically, the seed rules should cover all 8 seed patients.** For example:
- Maria Santos (allergies: Penicillin, Sulfa) + her diabetes/HTN meds must trigger appropriate cross-reference checks
- Robert Kim (diabetic neuropathy) + his medication regimen must produce relevant interaction data
- The chest pain encounter (patient 1) must trigger the ACS red flag rule

### 7. Implementation Order

1. **Rule data files:** Create the 4 JSON rule datasets in `guardrail-data/`, covering all seed patients
2. **Engine modules:** Build the 4 checker modules (`drug-interactions.js`, `vital-alerts.js`, `allergy-crossref.js`, `red-flag-symptoms.js`)
3. **Orchestrator:** Build `guardrails/index.js` that runs all 4 and combines results
4. **API routes:** Create `routes/guardrails.js` with the 4 endpoints
5. **Encounter integration:** Wire auto-checks into `routes/encounters.js` status transitions
6. **AI integration:** Append guardrail results to AI endpoint responses
7. **Frontend alerts:** Build `GuardrailAlert.jsx`, `DrugInteractionCard.jsx`, `VitalSignAlert.jsx`
8. **Page integration:** Wire alerts into Encounter, Charting, and VisitReview pages
9. **Demo validation:** Verify all seed patients trigger appropriate guardrails

**Dependencies:** Uses Rec #1's `encounter_events` table for logging guardrail checks (soft dependency -- can log to console if events table not yet added).

---

## Cross-Cutting Implementation Strategy

### Dependency Graph

```
Rec #2 (AI Abstraction)  ------>  Rec #3 (Demo Script)
       |                                    |
       v                                    |
Rec #1 (Timing Metrics)  <-----------------+
       |
       v
Rec #4 (Guardrails) ---- logs to ----> Rec #1 (encounter_events)
```

### Recommended Build Order

| Phase | Recommendation | Estimated Effort | Rationale |
|-------|---------------|-----------------|-----------|
| 1 | #1 Timing Metrics (schema + backend) | 1-2 days | Foundation table used by #3 and #4 |
| 2 | #2 AI Abstraction (interface + factory + mock) | 2-3 days | Required by #3 for demo mode |
| 3 | #4 Guardrails (engines + data + API) | 2-3 days | Can parallelize with #2; no AI dependency |
| 4 | #1 Timing Metrics (frontend) | 1 day | Needs backend from phase 1 |
| 5 | #3 Demo Script (controller + scenarios + UI) | 3-4 days | Needs #2 mock provider; benefits from #1 and #4 |
| 6 | Integration testing | 1-2 days | Full flow through all 4 features |

**Total estimated: 10-15 days for seed demo implementation.**

### Shared Conventions

All four features follow these patterns from the existing codebase:

1. **Backend services** live in `apps/backend/services/` (seed) or `apps/shared/services/` (enterprise)
2. **Routes** follow Express Router pattern in seed, Next.js API routes in enterprise
3. **Frontend components** use functional React with hooks, Tailwind CSS classes
4. **Data** stored as JSON TEXT in SQLite (seed) or typed Prisma models (enterprise)
5. **Error handling** returns `{ error: string }` with appropriate HTTP status
6. **AI responses** always return `null` on failure (graceful degradation pattern from `ClaudeService.ts`)
7. **Logging** uses `console.log` for info, `console.error` for failures, `console.warn` for safety events

### Environment Variable Summary

```env
# Existing
ANTHROPIC_API_KEY=sk-ant-...
PORT=3001

# New for Rec #1
# (no new env vars needed)

# New for Rec #2
ENABLE_AI=true
AI_PROVIDER=claude              # claude | openai | mock | local
MOCK_AI_DELAY_MS=800

# New for Rec #3
DEMO_MODE=false                 # Set true to enable demo button on dashboard
DEMO_SCENARIO=chest_pain        # Default scenario

# New for Rec #4
GUARDRAILS_ENABLED=true         # Master switch (should always be true in production)
GUARDRAILS_BLOCK_ON_CRITICAL=true  # Whether critical findings block transitions
```
