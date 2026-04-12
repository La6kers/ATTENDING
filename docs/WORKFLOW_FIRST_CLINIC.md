# ATTENDING AI — First Clinic Launch Workflow

**Created:** 2026-03-24
**Objective:** One real clinic processes one real patient encounter through ATTENDING by June 30, 2026
**Source:** Business Panel Analysis (Christensen, Porter, Drucker, Godin, Kim/Mauborgne, Collins, Taleb, Meadows, Doumont)

---

## Strategic Context

The business panel reached unanimous consensus: **ship to a real clinic now.** The technical foundation is strong enough. The highest-risk activity is continued engineering without real usage.

**Entry wedge:** COMPASS patient intake (highest leverage, lowest risk, most shareable)
**Differentiator:** Offline-first capability (no competitor offers this)
**Moat:** Physician-founder credibility + rural provider network effects

---

## Phase 0: Launch Prerequisites (Week 1-2)

*Goal: Clear the regulatory, legal, and communication blockers before any clinic touches the system.*

### 0.1 Regulatory Posture Definition
- [ ] **Classify ATTENDING under FDA CDS guidance**
  - Determine if ATTENDING meets the "non-device CDS" criteria under 21st Century Cures Act Section 3060(a)
  - Key test: Does the system (a) display information, (b) allow the provider to independently review the basis, (c) not replace clinical judgment, and (d) target a healthcare professional?
  - If all four criteria met → not a medical device → no FDA clearance needed
  - Document the classification decision with legal counsel sign-off
  - **Output:** `docs/REGULATORY_POSTURE.md` — one-page classification rationale

- [ ] **Craft clinical disclaimers for all AI-generated content**
  - Every AI recommendation must display: *"Clinical decision support only. Not a diagnostic tool. Provider judgment required."*
  - Red flag alerts must clarify: *"This alert is based on patient-reported symptoms and does not replace clinical assessment."*
  - **Files to update:** COMPASS chat UI, provider dashboard alerts, assessment reports

- [ ] **Verify malpractice insurance coverage**
  - Confirm Dr. Isbell's malpractice carrier covers AI-assisted clinical workflows
  - Obtain written confirmation that pilot usage is covered
  - If gap exists, obtain supplemental technology E&O coverage

### 0.2 Value Proposition & Sales Materials
- [ ] **Create one-page clinic decision-maker document**
  - Target audience: physician-owner or practice manager at a rural clinic
  - Structure (Doumont clarity framework):
    1. Problem: "You're seeing 30 patients a day with no specialist backup"
    2. Solution: "AI safety net — structured intake before, alerts during, documentation after"
    3. Three proof points: Works offline / Patients do their own intake / Never miss a critical finding
    4. CTA: "Live in 4 hours. Free pilot."
  - **Output:** `docs/sales/ONE_PAGER.pdf` (designed, printable)

- [ ] **Build 3-minute demo video**
  - Screen recording of: Patient opens COMPASS on phone → completes intake → Provider sees structured HPI + red flag alert → Lab order generated
  - Narration by Dr. Isbell (physician-to-physician credibility)
  - **Output:** Hosted on landing page

- [ ] **Update landing page**
  - Current state: minimal static HTML at `apps/landing/`
  - Add: value proposition, demo video embed, waitlist signup form, "For Rural Clinics" positioning
  - Keep it simple — one page, no framework needed

### 0.3 Incident Response Plan
- [ ] **Document adverse event response protocol**
  - What happens if a patient has a bad outcome during the pilot?
  - Chain of communication: clinic → Dr. Isbell → legal counsel → insurance carrier
  - System response: preserve all audit logs, assessment data, and AI recommendations
  - Post-incident review process
  - **Output:** `docs/INCIDENT_RESPONSE.md`

- [ ] **Implement "Report Concern" button in provider UI**
  - One-click clinical concern reporting from the provider dashboard
  - Captures: encounter ID, timestamp, provider notes, system state snapshot
  - Routes to Dr. Isbell's email immediately

---

## Phase 1: COMPASS Standalone (Week 2-4)

*Goal: Ship COMPASS patient intake as a standalone, immediately useful tool that doesn't require EHR integration or full platform deployment.*

### 1.1 COMPASS Hardening
- [ ] **Audit COMPASS chat flow end-to-end**
  - Walk through every assessment phase: chief complaint → HPI → ROS → medications → allergies → history
  - Verify red flag detection triggers correctly for all 12+ emergency patterns
  - Test offline mode (Tier 0) — does COMPASS work with zero network?
  - **Existing files:** `apps/patient-portal/pages/compass/chat.tsx`, `apps/patient-portal/pages/api/chat/compass.ts`

- [ ] **Add clinical disclaimers to COMPASS UI**
  - Opening screen: "This is not a substitute for emergency services. Call 911 for emergencies."
  - Before submission: "Your responses will be reviewed by your healthcare provider."
  - Red flag detection: Clear language directing patient to seek immediate care

- [ ] **Test COMPASS on mobile devices**
  - Primary use case: patient completes intake on their phone in the waiting room or at home
  - Test on: iPhone Safari, Android Chrome, low-bandwidth (3G simulation)
  - Verify PWA offline mode works (`apps/patient-portal/pages/offline.tsx` exists)
  - Fix any responsive layout issues

- [ ] **Simplify COMPASS entry point**
  - Create a direct URL: `patient-portal.attendingai.com/compass/start`
  - No login required for intake (session-based, not account-based)
  - QR code generation for clinic waiting room poster
  - **Output:** Printable QR code poster for clinic

### 1.2 Provider Dashboard — Assessment View
- [ ] **Verify provider sees COMPASS submissions in real-time**
  - Patient submits COMPASS → provider dashboard shows new assessment
  - SignalR notification or polling fallback
  - Assessment card shows: patient name, chief complaint, triage level, red flags
  - **Existing files:** `apps/provider-portal/` dashboard components

- [ ] **Assessment detail view**
  - Provider clicks assessment → sees structured HPI narrative, medications, allergies, ROS
  - Red flags highlighted with severity
  - AI differential diagnosis (if enabled) shown as "Considerations" (not diagnoses)
  - Print-friendly view for paper-based workflows (many rural clinics still use paper)

- [ ] **Provider can "Accept" or "Defer" an assessment**
  - Accept → creates encounter, links patient, begins clinical workflow
  - Defer → marks as reviewed, no action needed
  - Audit trail for both actions

### 1.3 Core Security Fixes (From Analysis Report — Blockers Only)
- [ ] **C1: Add `requireAuth()` to backend proxy route**
  - File: `apps/provider-portal/pages/api/backend/[...path].ts`
  - Wrap handler with `requireAuth()` — this is an auth bypass

- [ ] **C2: Add production guard for DEMO_MODE**
  - File: `apps/provider-portal/lib/api/auth.ts`
  - Add: `if (isDemo && process.env.NODE_ENV === 'production') throw new Error('DEMO_MODE disabled in production')`

- [ ] **H2: Add auth to clinical API routes**
  - Files: `pages/api/clinical/triage.ts`, `red-flags.ts`, `protocols.ts`, `labs.ts`, `drug-check.ts`
  - Add `requireAuth()` wrapper to each

---

## Phase 2: Pilot Clinic Onboarding (Week 4-6)

*Goal: Identify, recruit, and onboard one specific clinic.*

### 2.1 Clinic Recruitment
- [ ] **Identify 3-5 candidate clinics**
  - Criteria: rural primary care, 1-3 providers, known to Dr. Isbell personally, willing to pilot
  - Preference: clinic where Dr. Isbell has a professional relationship
  - Anti-criteria: large health systems, clinics with IT departments, clinics requiring Epic integration for MVP

- [ ] **Pilot agreement**
  - Simple 1-page agreement covering:
    - Free usage during pilot period (90 days)
    - Data handling: HIPAA BAA executed
    - Expectations: use COMPASS for intake, provide feedback weekly
    - Exit: clinic can stop at any time, data exported or deleted
  - **Output:** `docs/legal/PILOT_AGREEMENT.md` (template for legal review)

- [ ] **Execute BAA with pilot clinic**
  - Use standard BAA template from compliance framework
  - **Existing:** `docs/compliance/COMPLIANCE_FRAMEWORK.md` references BAA requirements

### 2.2 Onboarding Execution
- [ ] **Run onboarding wizard for pilot clinic**
  - Use existing OnboardingWizard: `apps/provider-portal/components/onboarding/OnboardingWizard.tsx`
  - Step 1: Facility profile (name, NPI, address, type)
  - Step 2: Provider accounts (name, email, NPI, role)
  - Step 3: EHR connection (likely "none" for MVP — skip)
  - Step 4: Protocol selection (enable core modules only: labs, medications)
  - Step 5: Smoke test with synthetic patient
  - **Backend:** `apps/provider-portal/pages/api/admin/onboarding.ts` (recently fixed to create real Organization records)
  - **Target:** Complete in under 4 hours

- [ ] **Provider training session**
  - 30-minute video call with pilot clinic providers
  - Walk through: COMPASS patient flow, dashboard, assessment review, lab ordering
  - Provide: Quick reference card (laminated, for exam room)
  - Record session for future clinics

- [ ] **Deploy to production environment**
  - Use dev-tier Azure SKUs (save ~$1,075/mo vs prod SKUs)
  - Verify: SQL Server accessible, Redis running, SignalR connected
  - SSL certificates for custom domain
  - **Terraform:** Set `environment = "dev"` in infrastructure config

### 2.3 Monitoring & Support
- [ ] **Set up production monitoring**
  - Application Insights for error tracking (already configured in .NET backend)
  - Alert on: 5xx errors, SignalR disconnections, assessment submission failures
  - Daily review of audit logs for the pilot org

- [ ] **Direct support channel**
  - Dr. Isbell's phone number / text for the pilot clinic
  - Response SLA: 1 hour during business hours for the pilot
  - Weekly 15-minute check-in call with pilot providers

---

## Phase 3: Learn & Iterate (Week 6-10)

*Goal: Gather real-world feedback, fix what breaks, document what works.*

### 3.1 Data Collection
- [ ] **Track pilot metrics**
  - Assessments completed per day
  - Time from COMPASS start to provider review
  - Red flags detected vs. provider-confirmed
  - Provider satisfaction (weekly 1-5 rating)
  - Patient completion rate (started vs. finished COMPASS)
  - **Use:** Existing `BillingMeter` event tracking (`meter.record()`)

- [ ] **Conduct weekly provider interviews**
  - 15-minute structured interview:
    1. What worked well this week?
    2. What was frustrating?
    3. Did COMPASS catch anything you might have missed?
    4. What's missing?
  - Document responses in `docs/pilot/WEEKLY_FEEDBACK.md`

- [ ] **Collect first case studies**
  - De-identify 3-5 interesting encounters
  - Document: what COMPASS captured, what the provider saw, clinical outcome
  - Format as 1-page case studies for marketing
  - **Output:** `docs/sales/CASE_STUDIES.md`

### 3.2 Rapid Fixes
- [ ] **Fix issues surfaced by real usage**
  - Maintain a prioritized bug list from pilot feedback
  - Fix critical/blocking issues within 24 hours
  - Deploy fixes via CI/CD pipeline (GitHub Actions already configured)

- [ ] **Iterate on COMPASS question flow**
  - Adjust based on: what patients skip, where they get confused, what providers wish was asked
  - A/B test question ordering if volume supports it

### 3.3 Pricing Validation
- [ ] **Test willingness-to-pay with pilot clinic**
  - After 4 weeks of free usage, ask: "What would you pay for this monthly?"
  - Proposed tiers (from billing infrastructure):
    - **Starter:** $299/mo — COMPASS intake + basic alerts (1-2 providers)
    - **Pro:** $599/mo — Full CDS + lab ordering + AI differential (3-5 providers)
    - **Enterprise:** Custom — Multi-location, EHR integration, SSO
  - Validate against: clinic revenue, current software spend, perceived value
  - **Output:** `docs/PRICING_MODEL.md`

---

## Phase 4: Scale Preparation (Week 10-14)

*Goal: Prepare to onboard clinics 2-10 based on pilot learnings.*

### 4.1 Advisory Board
- [ ] **Recruit 5-10 Rural Provider Advisory Board members**
  - Mix of: pilot clinic providers + Dr. Isbell's professional network
  - Offer: free access, direct influence on product, recognition as founding advisors
  - Quarterly virtual meetings, async Slack channel
  - **Output:** `docs/ADVISORY_BOARD.md`

### 4.2 Self-Service Onboarding
- [ ] **Streamline onboarding to require zero engineering support**
  - Clinic admin creates account → runs OnboardingWizard → clinic is live
  - Remove any manual steps discovered during pilot onboarding
  - Add: automated welcome email, getting-started guide, training video links

### 4.3 Technical Debt (From Analysis Report — Non-Blocking)
- [ ] **C3: Replace hard deletes with soft-delete on PHI data** (6 locations)
- [ ] **H10: Replace Redis KEYS with SCAN** (6 call sites)
- [ ] **H5: Remove 14 phantom service exports**
- [ ] **M7: Remove PHI from console.log in emergency notification**
- [ ] **L9: Remove dead notification-service**

### 4.4 Flywheel Documentation
- [ ] **Document the ATTENDING Flywheel**
  ```
  More clinics → More encounter data → Better AI recommendations →
  Better outcomes → More referrals → More clinics
  ```
- [ ] **Define BHAG**
  - Proposed: "By 2030, every rural clinic in America has access to AI-powered clinical decision support that works even without internet."
- [ ] **Output:** `docs/STRATEGY.md`

---

## Execution Dependencies

```
Phase 0 ──────────────────────────────────────────────────┐
  0.1 Regulatory posture ─────────────────────────────────┤
  0.2 Sales materials ────────────────────────────────────┤
  0.3 Incident response plan ─────────────────────────────┤
                                                          ▼
Phase 1 ──────────────────────────────────────────────────┐
  1.1 COMPASS hardening ──┐                               │
  1.2 Provider dashboard ─┤── can run in parallel         │
  1.3 Security fixes ─────┘                               │
                                                          ▼
Phase 2 ──────────────────────────────────────────────────┐
  2.1 Clinic recruitment ─┐                               │
  2.2 Onboarding ─────────┤── sequential                  │
  2.3 Monitoring ──────────┘                               │
                                                          ▼
Phase 3 ──────────────────────────────────────────────────┐
  3.1 Data collection ────┐                               │
  3.2 Rapid fixes ────────┤── continuous                  │
  3.3 Pricing validation ─┘                               │
                                                          ▼
Phase 4 ──────────────────────────────────────────────────┘
  4.1 Advisory board
  4.2 Self-service onboarding
  4.3 Technical debt
  4.4 Flywheel documentation
```

---

## Critical Path

The minimum path to "one real patient encounter" is:

1. **Regulatory posture document** (0.1) — 1 day
2. **Clinical disclaimers in COMPASS UI** (0.1 + 1.1) — 1 day
3. **Security fixes C1 + C2** (1.3) — 2 hours
4. **COMPASS mobile testing** (1.1) — 1 day
5. **Identify pilot clinic** (2.1) — already known to Dr. Isbell
6. **Execute BAA** (2.1) — 1 week (legal review)
7. **Run onboarding wizard** (2.2) — 4 hours
8. **Provider training** (2.2) — 30 minutes
9. **First real patient uses COMPASS** — Day 1 at clinic

**Critical path duration: ~3 weeks** (dominated by BAA legal review)

**Parallel work during BAA review:** COMPASS hardening, security fixes, landing page, demo video, monitoring setup.

---

## What NOT to Do

Per business panel consensus, the following are explicitly out of scope until after the pilot:

| Do Not | Why (Expert) |
|--------|-------------|
| Build new features | 47 component dirs for 0 users is a red flag (Christensen) |
| Add EHR integration for pilot | Optional, not required for COMPASS value (Kim/Mauborgne) |
| Upgrade to production Azure SKUs | $1,075/mo savings, no benefit at pilot scale (Taleb) |
| Implement Kubernetes deployment | K8s manifests are aspirational, App Service is sufficient (Taleb) |
| Refactor shared library split | Architectural improvement with no user impact (Drucker) |
| Add SSO/enterprise auth | Not needed for 1-3 provider clinic (Porter) |
| Build analytics dashboards | Learn from conversations first, dashboards second (Godin) |
| Pursue FDA clearance proactively | Classify as non-device CDS first (Taleb) |

---

## Success Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| Clinic onboarded | 1 | Organization record in database |
| Patient assessments completed | 10+ in first 2 weeks | PatientAssessment count |
| Provider daily usage | At least 1 provider reviews assessments daily | Audit log activity |
| Red flag detection accuracy | 0 false negatives on critical flags | Provider feedback |
| System uptime | 99%+ during clinic hours | Application Insights |
| Provider satisfaction | 4+/5 weekly rating | Interview data |
| Time to value | Provider says "this is useful" | Qualitative feedback |

---

## Checkpoint Gates

| Gate | Criteria | Decision |
|------|----------|----------|
| **G1: Ready to recruit** (end of Phase 0) | Regulatory posture documented, disclaimers added, incident plan written | Proceed to clinic outreach |
| **G2: Ready to onboard** (end of Phase 1) | COMPASS tested on mobile, security fixes deployed, provider dashboard shows assessments | Proceed to pilot onboarding |
| **G3: Pilot go-live** (end of Phase 2) | BAA signed, onboarding complete, monitoring active, support channel established | First real patient |
| **G4: Scale decision** (end of Phase 3) | 10+ assessments, positive provider feedback, pricing validated | Proceed to clinics 2-10 |

---

*This workflow was generated from the Business Panel Analysis conducted 2026-03-24. Execute phases sequentially with parallel work within each phase. Use `/sc:implement` to begin Phase 0.*
