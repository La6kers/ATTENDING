# ATTENDING AI — Brand & Project Guidelines

## Brand Tagline (permanent, never changes)
> "Empowering physicians with AI that enhances — rather than replaces — clinical expertise."

## Proof Line (Dr. Scott Isbell quote)
> "I was trained to make clinical decisions — that's what medical school prepares you for. But I spend 80% of my time gathering information and only 20% making those decisions. ATTENDING AI flips that ratio."

## Audience-Specific Hero Lines

| Audience | Hero Line |
|---|---|
| Physician (Primary) | "AI that enhances your clinical expertise — never replaces it." |
| Patient | "Your complete health story — connected, protected, and ready before you walk in." |
| Administrator | "25% more patients per provider. 75% less documentation time. Zero workflow disruption." |
| Rural Health Director | "Physician-designed. EHR-agnostic. Built for the clinics that need it most." |
| Investor | "The intelligence layer that makes every rural physician as supported as an academic medical center — without replacing a single clinical decision." |

## Key Stats
- 75% reduction in documentation time
- 25% more patients per provider
- 14 red flag patterns across 18 emergency conditions
- 5-minute setup, zero infrastructure

## Messaging Guardrails

| Never Say | Say Instead |
|---|---|
| "Replaces" or "automates" physician work | "Enhances" or "supports clinical decisions" |
| "Disrupts healthcare" | "Transforms the clinical workflow" |
| "Our AI diagnoses…" | "Our AI supports diagnostic reasoning…" |
| "Cutting-edge" or "revolutionary" | "Physician-designed" or "clinically validated" |
| "Simple" or "easy" | "Seamless" or "integrated into existing workflow" |
| "Patients don't need to see a doctor" | "Patients arrive with their provider already informed" |
| "We eliminate documentation" | "We reduce documentation burden by 75%" |
| "AI-powered everything" | Specific capabilities with measurable outcomes |

## Tone Principles
1. **Clinical confidence, not tech hype.** Sound like a physician talking to a colleague.
2. **Specific over vague.** Numbers over adjectives. "75% less documentation" not "dramatically reduces paperwork."
3. **Humble authority.** We built this because we live this problem. We don't lecture healthcare — we serve it.
4. **Rural-first, not rural-adapted.** Every feature was designed for resource-constrained settings.

## Technical Language Rules (for website/marketing)
- Do NOT use: OLDCARTS, XState, Zustand, Immer, SignalR, ASP.NET, CQRS, MediatR, "9-layer pipeline"
- DO use: "intelligent assessment flow", "real-time alerts", "offline-capable", "evidence-based detection"
- Security: say "HIPAA-compliant. Encrypted. Audited." — not implementation details
- ML Philosophy: "Flight data recorder, not autopilot." ML identifies patterns for retrospective reports — never makes real-time clinical decisions.

## Patent Reference
- USPTO Application #19/215,389 (filed May 22, 2025)
- Title: AI-Assisted Clinical Decision Support and Automated Treatment Workflow System
- CIP Portfolio: Patents 12-16 (emergency access, ambient scribe, EMS handoff, SNF transfer, multi-symptom processing)

## COMPASS Messaging
- **Full name:** Clinical Orientation and Multi-symptom Patient Acuity Screening System (COMPASS)
- Tagline: "AI-Powered Clinical Assessment"
- Hero: "Every symptom documented. Every detail remembered. Every visit prepared — before you walk in."
- Records: "No more repeating your history. No more lost records."
- Never reference "OLDCARTS" in patient-facing or marketing content

## Company Details
- **ATTENDING AI LLC** — founded by Dr. Scott Isbell, Family Physician
- **Domain:** attendingai.health
- **Market:** Rural healthcare providers, RHTP-affiliated health systems, any physician experiencing burnout from non-clinical administrative burden
- **RHTP:** Aligned with Initiative 6 (Digital Health & Technology)

## Website Technical Constraints
- Glassmorphism design system with Plus Jakarta Sans / JetBrains Mono
- Brand colors: Teal #1A8FA8, Navy #0C3547, Gold #F0A500, Coral #E87461
- Single-page HTML (docs/index.html) — vanilla HTML/CSS/JS only
- WCAG 2.2 AA accessibility required
- Always verify with dev server after frontend changes
