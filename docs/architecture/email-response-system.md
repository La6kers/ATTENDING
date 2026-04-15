# AI Email Response System -- Architecture Design Document

**ATTENDING AI -- Provider Portal Smart Email Inbox**
**Author:** System Architecture Designer
**Date:** 2026-04-03
**Status:** PROPOSED
**ADR:** ADR-031

---

## 1. System Architecture Overview

### 1.1 Design Philosophy

The email response system extends the existing Provider Inbox (`apps/provider-portal/components/inbox/`) rather than replacing it. The current inbox handles internal clinical messages (encounters, phone, charts, refills, labs, imaging). This system adds an `email` category that ingests external Gmail messages, classifies them, enriches them with patient context, and drafts AI responses for human review.

Key constraints:
- **Never auto-send.** Every outbound email requires explicit provider approval.
- **HIPAA compliance.** Email content containing PHI must follow the same encryption-at-rest and audit-log patterns already in the schema.
- **Multi-tenant.** All new models scoped by `organizationId`, consistent with every existing model.
- **Cost efficiency.** Reuse the existing `CostAwareAIRouter` tiering: Haiku for classification, Sonnet for drafting.

### 1.2 Component Diagram (C4 Level 2)

```
+------------------------------------------------------------------+
|                     PROVIDER PORTAL (Next.js)                     |
|                                                                   |
|  +------------------+   +-------------------+   +---------------+ |
|  | Inbox UI         |   | Email Detail      |   | Draft Editor  | |
|  | (ProviderInbox   |   | (ExpandedPanel    |   | (rich text,   | |
|  |  + new "email"   |   |  extended for     |   |  tone select, | |
|  |  category tab)   |   |  email context)   |   |  regenerate)  | |
|  +--------+---------+   +--------+----------+   +-------+-------+ |
|           |                      |                       |         |
+-----------+----------------------+-----------------------+---------+
            |                      |                       |
            v                      v                       v
+------------------------------------------------------------------+
|                      API LAYER (Next.js API Routes)               |
|                                                                   |
|  /api/email/sync      -- Gmail polling / webhook receiver         |
|  /api/email/classify  -- AI intent classification                 |
|  /api/email/enrich    -- Patient record linking                   |
|  /api/email/draft     -- AI response generation                   |
|  /api/email/send      -- Human-approved send via Gmail MCP        |
|  /api/email/settings  -- Provider preferences & style config      |
|  /api/email/threads   -- Thread history & conversation view       |
+------------------------------------------------------------------+
            |                      |                       |
            v                      v                       v
+------------------------------------------------------------------+
|                      SERVICE LAYER                                 |
|                                                                   |
|  +------------------+  +-------------------+  +-----------------+ |
|  | EmailSyncService |  | EmailClassifier   |  | EmailDrafter    | |
|  | (Gmail MCP       |  | (Haiku via        |  | (Sonnet via     | |
|  |  integration)    |  |  CostAwareRouter) |  |  CostAwareRouter| |
|  +------------------+  +-------------------+  +-----------------+ |
|  +------------------+  +-------------------+  +-----------------+ |
|  | PatientMatcher   |  | StyleLearner      |  | AuditLogger     | |
|  | (email-to-MRN    |  | (provider tone    |  | (HIPAA audit    | |
|  |  linking)        |  |  extraction)      |  |  trail)         | |
|  +------------------+  +-------------------+  +-----------------+ |
+------------------------------------------------------------------+
            |                      |                       |
            v                      v                       v
+------------------------------------------------------------------+
|                      DATA LAYER                                    |
|                                                                   |
|  +------------------+  +-------------------+  +-----------------+ |
|  | SQL Server       |  | Redis             |  | Gmail MCP       | |
|  | (Prisma ORM)     |  | (classification   |  | (read, draft,   | |
|  | EmailMessage,    |  |  cache, rate      |  |  send, search)  | |
|  | EmailDraft,      |  |  limiting)        |  |                 | |
|  | EmailThread,     |  |                   |  |                 | |
|  | ProviderStyle    |  |                   |  |                 | |
|  +------------------+  +-------------------+  +-----------------+ |
+------------------------------------------------------------------+
```

### 1.3 Data Flow -- Inbound Email Processing

```
Gmail Inbox
    |
    v  (1) Poll via Gmail MCP: gmail_search_messages + gmail_read_message
    |      Triggered by: cron job every 2 min OR webhook
    |
    v  (2) Dedup check: gmailMessageId against EmailMessage table
    |
    v  (3) Persist raw: EmailMessage row created (status: RECEIVED)
    |
    v  (4) Classify intent (async job):
    |      - Pre-scan keywords (zero cost, like existing prescanMessage())
    |      - If ambiguous: Haiku call via CostAwareAIRouter
    |      - Result: intent + confidence + priority
    |
    v  (5) Enrich with patient context:
    |      - Extract patient identifiers (name, DOB, MRN, phone, email)
    |      - Fuzzy match against Patient table
    |      - If matched: pull PatientAssessment, recent Encounters, Medications
    |      - Link EmailMessage.patientId
    |
    v  (6) Generate draft response:
    |      - Load ProviderEmailStyle for assigned provider
    |      - Load relevant clinical context (reuse gatherChartContext pattern)
    |      - Sonnet call: produce 2-3 draft alternatives
    |      - Persist as EmailDraft rows
    |
    v  (7) Surface in Provider Inbox:
    |      - Create Notification (existing model)
    |      - EmailMessage status -> PENDING_REVIEW
    |      - Appears in "email" category tab
    |
    v  (8) Provider reviews, edits, approves:
    |      - Select/edit draft in ExpandedPanel
    |      - Click "Approve & Send"
    |      - AuditLog entry created
    |      - EmailMessage status -> APPROVED
    |
    v  (9) Send via Gmail MCP:
           - gmail_create_draft or direct send
           - EmailMessage status -> SENT
           - Store sent gmailMessageId for threading
```

---

## 2. Data Model Additions (Prisma Schema)

These models follow existing conventions: `cuid()` IDs, `organizationId` scoping, soft-delete fields, `NVarChar(Max)` for large text, `NoAction` on relations, composite indexes for query patterns.

```prisma
// ============== EMAIL SYSTEM ==============

model EmailThread {
  id               String    @id @default(cuid())
  organizationId   String
  gmailThreadId    String    @unique
  subject          String
  participantCount Int       @default(1)
  patientId        String?
  providerId       String?
  classification   String?   // clinical-followup, demo-request, investor, partnership, support, spam
  priority         String    @default("NORMAL") // LOW, NORMAL, HIGH, URGENT
  status           String    @default("OPEN")   // OPEN, PENDING_REVIEW, RESPONDED, CLOSED, ARCHIVED
  lastMessageAt    DateTime
  closedAt         DateTime?
  deletedAt        DateTime?
  deletedBy        String?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  organization Organization  @relation(fields: [organizationId], references: [id], onDelete: NoAction, onUpdate: NoAction)
  patient      Patient?      @relation(fields: [patientId], references: [id], onDelete: NoAction, onUpdate: NoAction)
  messages     EmailMessage[]
  drafts       EmailDraft[]

  @@index([organizationId])
  @@index([gmailThreadId])
  @@index([patientId])
  @@index([providerId])
  @@index([classification])
  @@index([status])
  @@index([lastMessageAt])
  @@index([organizationId, status, lastMessageAt])
  @@index([deletedAt])
}

model EmailMessage {
  id                String    @id @default(cuid())
  organizationId    String
  threadId          String
  gmailMessageId    String    @unique
  direction         String    // INBOUND, OUTBOUND
  fromAddress       String
  fromName          String?
  toAddresses       String    @db.NVarChar(Max)  // JSON array
  ccAddresses       String?   @db.NVarChar(Max)  // JSON array
  subject           String
  bodyText          String?   @db.NVarChar(Max)
  bodyHtml          String?   @db.NVarChar(Max)
  snippet           String?   // Gmail snippet for preview
  hasAttachments    Boolean   @default(false)
  attachmentMeta    String?   @db.NVarChar(Max)  // JSON: [{name, mimeType, size}]
  // Classification
  classification    String?   // clinical-followup, demo-request, investor, partnership, support, spam
  classificationConf Float?   // 0.0-1.0 confidence score
  classificationModel String? // which AI model classified it
  priority          String    @default("NORMAL")
  // Patient linking
  patientId         String?
  matchConfidence   Float?    // 0.0-1.0 patient match confidence
  matchMethod       String?   // email-exact, name-dob, mrn-in-body, manual
  // Clinical context snapshot (frozen at classification time)
  clinicalContext   String?   @db.NVarChar(Max)  // JSON: relevant chart data used for drafting
  // Status
  status            String    @default("RECEIVED") // RECEIVED, CLASSIFYING, PENDING_REVIEW, APPROVED, SENT, FAILED, ARCHIVED
  reviewedBy        String?
  reviewedAt        DateTime?
  sentAt            DateTime?
  sentGmailId       String?   // Gmail message ID of the sent reply
  // Processing metadata
  processingTimeMs  Int?      // total pipeline time
  aiCostUsd         Float?    // total AI cost for classification + drafting
  receivedAt        DateTime
  deletedAt         DateTime?
  deletedBy         String?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  organization Organization  @relation(fields: [organizationId], references: [id], onDelete: NoAction, onUpdate: NoAction)
  thread       EmailThread   @relation(fields: [threadId], references: [id], onDelete: NoAction, onUpdate: NoAction)
  patient      Patient?      @relation(fields: [patientId], references: [id], onDelete: NoAction, onUpdate: NoAction)
  drafts       EmailDraft[]

  @@index([organizationId])
  @@index([threadId])
  @@index([gmailMessageId])
  @@index([patientId])
  @@index([classification])
  @@index([status])
  @@index([receivedAt])
  @@index([organizationId, status, receivedAt])
  @@index([deletedAt])
}

model EmailDraft {
  id              String    @id @default(cuid())
  organizationId  String
  messageId       String
  threadId        String
  providerId      String    // provider this draft is for
  version         Int       @default(1)
  tone            String    @default("professional") // professional, empathetic, concise, detailed
  subject         String
  bodyText        String    @db.NVarChar(Max)
  bodyHtml        String?   @db.NVarChar(Max)
  confidence      Float?    // AI confidence in this draft
  reasoning       String?   @db.NVarChar(Max) // why AI chose this approach
  suggestedActions String?  @db.NVarChar(Max) // JSON: pended clinical actions
  // Provider edits
  isEdited        Boolean   @default(false)
  editedBody      String?   @db.NVarChar(Max)
  // Status
  status          String    @default("GENERATED") // GENERATED, SELECTED, EDITED, APPROVED, SENT, DISCARDED
  selectedAt      DateTime?
  approvedAt      DateTime?
  approvedBy      String?
  sentAt          DateTime?
  // Cost tracking
  generationModel String?   // which model generated this
  generationCost  Float?    // USD cost of generation
  deletedAt       DateTime?
  deletedBy       String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: NoAction, onUpdate: NoAction)
  message      EmailMessage @relation(fields: [messageId], references: [id], onDelete: NoAction, onUpdate: NoAction)
  thread       EmailThread  @relation(fields: [threadId], references: [id], onDelete: NoAction, onUpdate: NoAction)

  @@index([organizationId])
  @@index([messageId])
  @@index([threadId])
  @@index([providerId])
  @@index([status])
  @@index([deletedAt])
}

model ProviderEmailStyle {
  id              String    @id @default(cuid())
  organizationId  String
  providerId      String    @unique
  // Learned style attributes
  greeting        String?   // "Dear [Name]," or "Hi [Name]," etc.
  closing         String?   // "Best regards," or "Sincerely," etc.
  signatureBlock  String?   @db.NVarChar(Max)
  tonePreference  String    @default("professional") // professional, warm, concise
  formalityLevel  Int       @default(3)  // 1=casual, 5=very formal
  avgSentenceLen  Int?      // learned from sent emails
  // Explicit preferences
  alwaysCc        String?   @db.NVarChar(Max) // JSON: email addresses to always CC
  autoClassify    Boolean   @default(true)
  autoDraft       Boolean   @default(true)
  spamAutoArchive Boolean   @default(true)
  // Style samples (stored for fine-tuning prompts)
  sampleResponses String?   @db.NVarChar(Max) // JSON: up to 10 exemplar sent emails
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([organizationId])
  @@index([providerId])
}
```

**Relation additions to existing models** (add to Organization, Patient):

```prisma
// Add to Organization model:
  emailThreads     EmailThread[]
  emailMessages    EmailMessage[]
  emailDrafts      EmailDraft[]
  providerStyles   ProviderEmailStyle[]

// Add to Patient model:
  emailThreads     EmailThread[]
  emailMessages    EmailMessage[]
```

---

## 3. API Route Design

All routes live under `apps/provider-portal/pages/api/email/`. Authentication follows the existing `getServerSession` + `resolveProviderId` pattern from `notifications/index.ts`.

### 3.1 Route Table

| Method | Route | Description | Auth | Rate Limit |
|--------|-------|-------------|------|------------|
| POST | `/api/email/sync` | Trigger Gmail sync for current provider | Provider | 1/min |
| GET | `/api/email/threads` | List email threads with filters | Provider | 30/min |
| GET | `/api/email/threads/[id]` | Get thread with all messages + drafts | Provider | 60/min |
| POST | `/api/email/classify` | Classify a single message (or re-classify) | Provider | 20/min |
| POST | `/api/email/enrich` | Link email to patient record | Provider | 20/min |
| POST | `/api/email/draft` | Generate AI draft response | Provider | 10/min |
| PUT | `/api/email/draft/[id]` | Update/edit draft | Provider | 30/min |
| POST | `/api/email/send` | Approve and send draft via Gmail | Provider | 10/min |
| GET | `/api/email/settings` | Get provider email preferences | Provider | 30/min |
| PUT | `/api/email/settings` | Update provider email preferences | Provider | 10/min |
| GET | `/api/email/stats` | Classification breakdown, response times | Provider | 10/min |
| POST | `/api/email/feedback` | Provider feedback on AI quality | Provider | 30/min |

### 3.2 Key Endpoint Contracts

**POST /api/email/sync**
```typescript
// Request: empty body (uses session to determine Gmail account)
// Response:
{
  synced: number;        // new messages found
  classified: number;    // messages auto-classified
  threads: number;       // threads updated
  errors: string[];      // any sync failures
  nextSyncAt: string;    // ISO timestamp
}
```

**POST /api/email/classify**
```typescript
// Request:
{
  messageId: string;     // EmailMessage.id
  forceReclassify?: boolean;
}
// Response:
{
  messageId: string;
  classification: "clinical-followup" | "demo-request" | "investor"
                | "partnership" | "support" | "spam";
  confidence: number;    // 0.0-1.0
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  reasoning: string;
  patientMatch?: {
    patientId: string;
    patientName: string;
    mrn: string;
    confidence: number;
    method: string;
  };
  suggestedRouting: "provider" | "staff" | "auto-archive";
  model: string;         // "haiku" | "sonnet"
  costUsd: number;
}
```

**POST /api/email/draft**
```typescript
// Request:
{
  messageId: string;
  tone?: "professional" | "empathetic" | "concise" | "detailed";
  includeContext?: boolean;  // include clinical context in prompt
  regenerate?: boolean;      // discard existing drafts, regenerate
}
// Response:
{
  drafts: Array<{
    id: string;
    tone: string;
    subject: string;
    bodyText: string;
    bodyHtml: string;
    confidence: number;
    reasoning: string;
    suggestedActions?: Array<{
      type: string;
      title: string;
      detail: string;
    }>;
  }>;
  clinicalContextUsed: string[];
  model: string;
  costUsd: number;
}
```

**POST /api/email/send**
```typescript
// Request:
{
  draftId: string;
  editedBody?: string;     // if provider edited before sending
  confirmNoPhiInBody?: boolean; // explicit PHI acknowledgment for non-encrypted email
}
// Response:
{
  success: boolean;
  gmailMessageId: string;
  sentAt: string;
  auditLogId: string;
}
```

---

## 4. Integration Points with Existing Code

### 4.1 Provider Inbox Extension

**File:** `apps/provider-portal/components/inbox/types.ts`
- Add `'email'` to the `CategoryType` union.

**File:** `apps/provider-portal/components/inbox/inbox-store.ts`
- Add `'email'` to the `categories` array in `getCategoryCounts()`.
- Extend `fetchItems()` to call `/api/email/threads` when `activeCategory === 'email'`.

**File:** `apps/provider-portal/components/inbox/ProviderInbox.tsx`
- Add email tab with `Mail` icon (already imported from lucide-react).
- Render email-specific columns: sender, classification badge, patient match indicator.

**File:** `apps/provider-portal/components/inbox/ExpandedPanel.tsx`
- Add email branch that shows: original email body, thread history, AI drafts panel, patient context sidebar.
- Reuse the existing `prescanMessage()` + `gatherChartContext()` pattern from `inboxAIAgent.ts` for clinical email enrichment.

### 4.2 AI Service Layer

**File:** `apps/shared/services/CostAwareAIRouter.ts`
- Register two new task types: `email-classify` (simple, routes to Haiku) and `email-draft` (moderate/complex, routes to Sonnet).
- Extend the `TaskComplexity` assessment to handle email content length and clinical relevance signals.

**File:** `apps/provider-portal/lib/services/inboxAIAgent.ts`
- Extract the `prescanMessage()` and `gatherChartContext()` functions into a shared module so both internal messages and external emails can use the same keyword-to-chart-section pipeline.

### 4.3 Notification System

**File:** `apps/provider-portal/pages/api/notifications/index.ts`
- New notification type: `EMAIL_RECEIVED` with priority based on classification.
- Notification `data` JSON includes: `{ emailThreadId, classification, patientId, senderName }`.
- `actionUrl` points to `/inbox?category=email&thread={threadId}`.

### 4.4 Audit Logging

**Existing model:** `AuditLog`
- New `entityType` values: `EMAIL_MESSAGE`, `EMAIL_DRAFT`, `EMAIL_SEND`.
- Every draft generation, edit, approval, and send creates an audit entry.
- PHI access through email context enrichment is logged per HIPAA 164.312(b).

### 4.5 Gmail MCP Integration

The available Gmail MCP tools map directly to system operations:

| System Operation | MCP Tool | Notes |
|------------------|----------|-------|
| Sync inbox | `gmail_search_messages` | Query: `is:inbox after:{lastSyncTime}` |
| Read message | `gmail_read_message` | Full body + headers + attachments meta |
| Read thread | `gmail_read_thread` | Complete conversation history |
| Send approved reply | `gmail_create_draft` then send, or direct send | Draft-first is safer |
| Get provider profile | `gmail_get_profile` | Verify connected account |

### 4.6 Patient Matching Pipeline

The `PatientMatcher` service uses a cascading strategy:

1. **Email exact match:** `Patient.email === fromAddress` (highest confidence: 0.95+)
2. **Name + DOB extraction:** Parse email body for patient identifiers, match against `Patient.firstName` + `Patient.lastName` + `Patient.dateOfBirth`
3. **MRN in body:** Regex scan for MRN patterns, match against `Patient.mrn`
4. **Phone match:** Extract phone numbers from email signature, match `Patient.phone`
5. **Recent encounter correlation:** If sender previously had an `Encounter` or `PatientAssessment`, link to that patient
6. **Manual linking:** Provider can manually link/unlink via UI

---

## 5. Implementation Phases

### Phase 1: MVP (Weeks 1-3) -- Read-Only Smart Inbox

**Goal:** Providers can see classified emails in the inbox with basic AI triage.

Deliverables:
- Prisma schema additions: `EmailThread`, `EmailMessage` models only
- `/api/email/sync` endpoint calling Gmail MCP for polling
- `/api/email/classify` using keyword pre-scan (zero cost) + Haiku fallback
- `CategoryType` extended with `'email'`
- Basic email list view in ProviderInbox with classification badges
- Email detail view in ExpandedPanel (read-only, no drafting)
- Notification integration for new emails
- AuditLog entries for email access

**Cost per email:** ~$0.0001 (keyword pre-scan handles 60%+ of classification)

### Phase 2: AI Drafting (Weeks 4-6)

**Goal:** AI-generated response drafts with provider editing.

Deliverables:
- `EmailDraft` model and `/api/email/draft` endpoint
- Sonnet-based response generation with clinical context
- Draft editor component with tone selection and regeneration
- Patient matching pipeline (email-exact + name-DOB methods)
- Clinical context enrichment using shared `gatherChartContext()`
- `/api/email/send` endpoint with Gmail MCP integration
- PHI warning system: detect and flag PHI in draft body before send

**Cost per email with draft:** ~$0.003-0.006 (Sonnet call for drafting)

### Phase 3: Style Learning (Weeks 7-9)

**Goal:** Drafts match individual provider writing style.

Deliverables:
- `ProviderEmailStyle` model
- Style extraction from provider's sent email history (one-time batch via Gmail MCP search)
- Few-shot prompting: include 3-5 exemplar responses in draft generation prompt
- Tone/formality controls in provider settings
- Signature block management
- Auto-CC configuration
- Provider feedback loop: thumbs up/down on drafts to improve over time

**Cost:** One-time style extraction ~$0.05/provider; ongoing per-email unchanged

### Phase 4: Advanced Features (Weeks 10-14)

**Goal:** Full-featured email management with analytics.

Deliverables:
- Thread view with full conversation history
- Bulk operations (classify, archive, assign)
- Email analytics dashboard (response times, classification breakdown, AI accuracy)
- Spam auto-archive with review queue
- Partnership/investor email routing to admin users
- Template library: common responses stored and reusable
- Gmail label sync (map Gmail labels to internal categories)
- Attachment handling: preview, secure storage reference
- Multi-provider routing: emails to shared clinic address assigned by classification

---

## 6. Technology Choices with Justification

### 6.1 Decision Matrix

| Decision | Chosen | Alternative | Rationale |
|----------|--------|-------------|-----------|
| Email source | Gmail MCP | IMAP/POP3 direct | MCP tools already available and authenticated; no SMTP library needed; consistent with tool-use architecture |
| Classification model | Haiku (Tier 2) | Local regex only | Regex handles 60% of cases; Haiku needed for ambiguous intent at <$0.001/call |
| Drafting model | Sonnet (Tier 3) | Haiku | Clinical email responses require nuance, tone control, and accurate medical terminology; Sonnet's quality justifies 10x cost over Haiku |
| Patient matching | Multi-strategy cascade | Single lookup | Healthcare emails arrive via many paths (patient direct, caregiver, referring office); cascade maximizes match rate |
| Sync strategy | Polling (2 min) | Gmail push notifications | Push requires public webhook URL + Google Cloud Pub/Sub setup; polling simpler for MVP, push can be added in Phase 4 |
| Draft storage | SQL Server (Prisma) | Redis only | Drafts need audit trail, versioning, and HIPAA retention; Redis used only for caching classification results |
| Frontend state | Extend existing Zustand store | Separate store | Email is a category within the inbox; reusing `inbox-store.ts` avoids duplicate state management |
| Rich text editing | TipTap (or existing editor) | Markdown textarea | Providers expect email formatting; TipTap is React-native, lightweight, and supports HTML output for email body |

### 6.2 Why Not a Separate Microservice?

The email system is tightly coupled to:
- Patient records (Prisma models in the same database)
- Provider authentication (NextAuth session)
- The inbox UI (same Next.js app)
- The AI router (shared service)

A separate microservice would introduce network latency for every patient lookup, require duplicated auth, and add deployment complexity. The Next.js API route layer is sufficient for the expected volume (hundreds of emails/day per organization, not thousands).

If email volume exceeds 10,000/day per organization, extract the sync and classification into an Azure Function triggered by a Service Bus queue.

### 6.3 Security Considerations

| Concern | Mitigation |
|---------|------------|
| PHI in email body | PHI detection scan before any AI call; clinical context sent to Claude API is already HIPAA-covered under BAA |
| Email spoofing | SPF/DKIM/DMARC headers checked; patient match requires multiple signals, not just sender address |
| Draft leakage | Drafts are never sent automatically; `confirmNoPhiInBody` flag required for non-encrypted channels |
| Attachment malware | Attachments are metadata-only in v1; no download/storage of attachment content |
| Audit compliance | Every read, classify, draft, edit, and send action creates an AuditLog entry |
| Token in transit | Gmail MCP uses OAuth2; all API routes behind NextAuth; HTTPS enforced |

---

## 7. Cost Estimates for AI Processing

### 7.1 Per-Email Cost Breakdown

| Stage | Model | Input Tokens | Output Tokens | Cost/Email |
|-------|-------|-------------|---------------|------------|
| Classification (keyword pre-scan) | None | 0 | 0 | $0.000 |
| Classification (AI fallback, ~40% of emails) | Haiku | ~800 | ~200 | $0.0002 |
| Patient matching | None (DB queries) | 0 | 0 | $0.000 |
| Context enrichment | None (DB queries) | 0 | 0 | $0.000 |
| Draft generation (3 alternatives) | Sonnet | ~2,500 | ~1,500 | $0.005 |
| Style-matched drafting (Phase 3) | Sonnet | ~3,500 | ~1,500 | $0.007 |

### 7.2 Monthly Cost Projections

Assumptions: 50 emails/day per provider, 5 providers per organization.

| Scenario | Emails/Month | Classify Cost | Draft Cost | Total AI Cost |
|----------|-------------|---------------|------------|---------------|
| **MVP (Phase 1)** | 7,500 | $0.60 | $0 (no drafting) | **$0.60/mo** |
| **With Drafting (Phase 2)** | 7,500 | $0.60 | $37.50 | **$38.10/mo** |
| **Style-matched (Phase 3)** | 7,500 | $0.60 | $52.50 | **$53.10/mo** |
| **Spam filtered (Phase 4)** | 5,000 (after spam filter) | $0.40 | $25.00 | **$25.40/mo** |

### 7.3 Cost Optimization Strategies

1. **Keyword pre-scan first.** The existing `prescanMessage()` pattern handles 60%+ of classification without any AI call.
2. **Cache identical senders.** If the same sender sends structurally similar emails (e.g., lab result notifications from a reference lab), cache the classification.
3. **Defer drafting.** Only generate drafts when the provider opens the email, not on sync. This avoids drafting for emails that get bulk-archived.
4. **Batch classify.** Group emails from the same sync cycle into a single Haiku call with multiple messages.
5. **Spam short-circuit.** Known spam senders (maintained in Redis set) skip AI entirely.

---

## 8. Risks and Mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Gmail API rate limits | Medium | Medium | Polling interval auto-adjusts; batch reads; respect 429 backoff |
| AI generates clinically inaccurate response | Medium | High | Human review mandatory; draft includes reasoning + confidence; clinical context visible alongside draft |
| Patient misidentification | Low | High | Match confidence displayed; provider must confirm link; multiple signals required for auto-link |
| Provider ignores PHI warning | Low | High | Modal confirmation required; cannot skip PHI acknowledgment; audit logged |
| Gmail MCP token expiry | Medium | Low | Token refresh handling; graceful degradation (show "reconnect Gmail" prompt) |
| High email volume overwhelms inbox | Low | Medium | Classification-based auto-archive for spam; pagination; priority sorting |

---

## 9. File Inventory -- New and Modified Files

### New Files
```
apps/provider-portal/pages/api/email/sync.ts
apps/provider-portal/pages/api/email/classify.ts
apps/provider-portal/pages/api/email/enrich.ts
apps/provider-portal/pages/api/email/draft.ts
apps/provider-portal/pages/api/email/send.ts
apps/provider-portal/pages/api/email/settings.ts
apps/provider-portal/pages/api/email/threads/index.ts
apps/provider-portal/pages/api/email/threads/[id].ts
apps/provider-portal/pages/api/email/stats.ts
apps/provider-portal/pages/api/email/feedback.ts
apps/provider-portal/lib/services/emailClassifier.ts
apps/provider-portal/lib/services/emailDrafter.ts
apps/provider-portal/lib/services/emailSync.ts
apps/provider-portal/lib/services/patientMatcher.ts
apps/provider-portal/lib/services/styleLearner.ts
apps/provider-portal/components/inbox/EmailDetailPanel.tsx
apps/provider-portal/components/inbox/DraftEditor.tsx
apps/provider-portal/components/inbox/EmailThreadView.tsx
apps/provider-portal/components/inbox/PatientMatchBadge.tsx
apps/provider-portal/components/inbox/ClassificationBadge.tsx
```

### Modified Files
```
prisma/schema.prisma                                    -- Add 4 new models + relations
apps/provider-portal/components/inbox/types.ts          -- Add 'email' to CategoryType
apps/provider-portal/components/inbox/inbox-store.ts    -- Add email category + fetch
apps/provider-portal/components/inbox/ProviderInbox.tsx -- Add email tab + columns
apps/provider-portal/components/inbox/ExpandedPanel.tsx -- Add email detail branch
apps/provider-portal/components/inbox/Sidebar.tsx       -- Add email nav item
apps/provider-portal/components/inbox/theme.ts          -- Add email category config
apps/shared/services/CostAwareAIRouter.ts               -- Add email task types
apps/provider-portal/lib/services/inboxAIAgent.ts       -- Extract shared functions
```
