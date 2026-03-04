# ATTENDING AI — Clinical Safety

**Last Updated:** February 21, 2026

---

## Purpose

This document defines the clinical safety rules embedded in ATTENDING AI. Every rule here must have corresponding automated tests that pass before any patient-facing deployment.

---

## Red Flag Detection

**Location:** `apps/shared/lib/clinical-ai/redFlagDetection.ts`
**Also:** `packages/clinical-services/src/red-flags.ts`

### Emergency Red Flags (Require Immediate Escalation)

| # | Pattern | Trigger Examples | Response |
|---|---------|-----------------|----------|
| 1 | Chest pain + cardiac symptoms | "chest pain", "pressure in chest", "chest tightness with sweating" | EMERGENCY — Route to 911 / ED |
| 2 | Stroke symptoms | "sudden weakness one side", "face drooping", "can't speak suddenly" | EMERGENCY — Route to 911 / ED |
| 3 | Respiratory distress | "can't breathe", "severe shortness of breath", "choking" | EMERGENCY — Route to 911 / ED |
| 4 | Suicidal ideation | "want to kill myself", "suicidal thoughts", "don't want to live" | EMERGENCY — Route to 988 / Crisis |
| 5 | Anaphylaxis | "throat closing", "can't swallow", "whole body hives + breathing" | EMERGENCY — Route to 911 / ED |
| 6 | Severe hemorrhage | "won't stop bleeding", "vomiting blood", "blood in stool" | EMERGENCY — Route to 911 / ED |
| 7 | Altered consciousness | "passed out", "seizure", "confused and can't recognize me" | EMERGENCY — Route to 911 / ED |
| 8 | Severe head injury | "worst headache of my life", "hit head and vomiting" | EMERGENCY — Route to 911 / ED |
| 9 | Abdominal emergency | "severe abdominal pain + rigid abdomen", "sudden tearing pain" | URGENT — Same-day evaluation |
| 10 | High fever + immune compromise | "fever 103+ with chemo", "fever + organ transplant" | URGENT — Same-day evaluation |
| 11 | Pregnancy complications | "vaginal bleeding + pregnant", "severe headache + pregnant + swelling" | URGENT — OB triage |
| 12 | Pediatric distress | "infant not breathing normally", "child won't wake up" | EMERGENCY — Route to 911 / ED |
| 13 | Self-harm | "cutting myself", "hurting myself on purpose" | URGENT — Crisis + same-day mental health |
| 14 | Homicidal ideation | "want to hurt someone", "going to kill them" | EMERGENCY — Crisis protocol |

### False Positive Prevention

Clinical text often contains terms that match SQL injection or red flag patterns. The detection logic is tuned to avoid flagging:
- "SELECT the appropriate dosage" (not SQL injection)
- "I had a mild headache yesterday" (not emergency)
- "My chest feels fine today, following up on previous visit" (not emergency)

**Every false-positive scenario must have a negative test case.**

---

## Drug Interaction Checking

**Location:** `apps/shared/catalogs/medications.ts` (interaction data)
**Also:** `backend/src/ATTENDING.Domain/Services/DrugInteractionService.cs`

### Critical Drug Interactions (Must Always Flag)

| Drug A | Drug B | Severity | Risk |
|--------|--------|----------|------|
| Warfarin | NSAIDs (ibuprofen, naproxen) | HIGH | Bleeding risk |
| Warfarin | Aspirin | HIGH | Bleeding risk |
| MAOIs | SSRIs | CRITICAL | Serotonin syndrome |
| MAOIs | Tramadol | CRITICAL | Serotonin syndrome |
| Methotrexate | NSAIDs | HIGH | Renal toxicity |
| ACE inhibitors | Potassium-sparing diuretics | HIGH | Hyperkalemia |
| Digoxin | Amiodarone | HIGH | Digoxin toxicity |
| Lithium | NSAIDs | HIGH | Lithium toxicity |
| Fluoroquinolones | QT-prolonging drugs | HIGH | Cardiac arrhythmia |
| Statins | CYP3A4 inhibitors (clarithromycin) | MODERATE | Rhabdomyolysis risk |

### Allergy Cross-Reactivity

| Reported Allergy | Cross-Reactive Caution |
|-----------------|----------------------|
| Penicillin | Cephalosporins (10% cross-reactivity) |
| Sulfa drugs | Thiazide diuretics, sulfonylureas |
| Aspirin | Other NSAIDs |
| Latex | Banana, avocado, kiwi (latex-fruit syndrome) |

---

## Assessment State Machine

**Location:** `apps/shared/machines/assessmentMachine.ts`

### 18-Phase OLDCARTS Flow

1. Welcome / consent
2. Chief complaint (free text)
3. Onset — When did it start?
4. Location — Where does it hurt?
5. Duration — How long does it last?
6. Character — What does it feel like?
7. Aggravating factors — What makes it worse?
8. Relieving factors — What makes it better?
9. Timing — Is there a pattern?
10. Severity — Scale of 1-10
11. Associated symptoms
12. Past medical history
13. Medications
14. Allergies
15. Social history
16. Family history
17. Review of systems
18. Summary + HPI generation

### Critical State Transitions

- **Any phase → Emergency:** If red flag detected during any input, immediately transition to emergency protocol. Do NOT continue assessment.
- **Emergency → 911 Routing:** Display emergency instructions and 911 prompt. Log the event with full context.
- **Completion → HPI:** Generate structured HPI narrative from collected data. Must include all OLDCARTS elements that were provided.
- **Abandonment:** If user exits mid-assessment, mark status as ABANDONED with last completed phase.

---

## HIPAA Compliance Requirements

### Audit Logging

Every access to Protected Health Information (PHI) must create an `AuditLog` entry:

| Field | Required | Purpose |
|-------|----------|---------|
| userId | Yes | Who accessed the data |
| action | Yes | What they did (VIEW, CREATE, UPDATE, DELETE, EXPORT) |
| resourceType | Yes | What type of record (Patient, LabOrder, Assessment, etc.) |
| resourceId | Yes | Which specific record |
| ipAddress | Yes | Where the request came from |
| userAgent | Yes | What client they used |
| timestamp | Yes | When (server-side, not client-provided) |
| phiAccessed | Yes | Boolean — did this action involve PHI? |

**50+ action types** are defined in the Prisma schema enum `AuditAction`.

### Data Retention

- All PHI models use **soft-delete** (deletedAt/deletedBy fields).
- HIPAA requires **6-year retention** of medical records.
- Hard deletes are prohibited on PHI tables.

### PHI Masking in Logs

**Location:** `apps/shared/lib/api/secureHandler.ts` (maskPHI function)

Log output must NEVER contain:
- Patient names
- Medical Record Numbers (MRNs)
- Dates of birth
- Social Security Numbers
- Phone numbers
- Email addresses
- Addresses

The `maskPHI()` utility scans log strings and replaces detected patterns with `[REDACTED]`.

---

## Required Test Coverage

Before any patient-facing deployment, the following tests must exist and pass:

### Red Flag Tests (apps/shared/lib/clinical-ai/__tests__/redFlagDetection.test.ts)
- [x] Every pattern in the table above has at least one positive test
- [x] Every pattern has at least one negative (false-positive prevention) test
- [x] Edge cases: mixed symptoms, typos, abbreviations
- [x] Vital sign integration (hypotension, tachycardia, hypoxia, fever)
- [x] Performance: <100ms per evaluation
- [x] Null-safety: missing vitals / history / empty symptoms

### Drug Interaction Tests (tests/clinical-safety/drug-interactions.test.ts)
- [x] Every critical pair in the CLINICAL_SAFETY.md table is tested
- [x] Safe combinations return no flag (false-positive prevention)
- [x] Allergy cross-reactivity is tested (penicillin, sulfa, NSAIDs, cephalosporin)
- [x] Pregnancy Category X drugs verified
- [x] Renal dose adjustment drugs verified
- [x] checkDrugInteractions() contract: empty, case-insensitive, order-independent
- [x] Database integrity: required fields, no duplicate IDs, valid severities

### Assessment Machine Tests (tests/clinical-safety/assessment-machine.test.ts)
- [x] All 18 state nodes exist in machine definition
- [x] All OLDCARTS phases visited in correct order during full assessment
- [x] Emergency transition reachable from: welcome, onset, location, severity, quality, associated symptoms, review
- [x] Emergency sets urgencyLevel=high and urgencyScore=100
- [x] Emergency dismiss returns to review
- [x] Completion (review state) contains all 7 core HPI fields
- [x] Red-flag detection fires mid-assessment (on chief complaint, not only on submit)
- [x] BACK navigation works from onset→welcome, location→onset
- [x] SKIP events allow optional phases
- [x] NO events for medications (empty array) and allergies (NKDA)
- [x] Session metadata: sessionId generated, startedAt recorded, questionHistory grows
- [x] Urgency scoring: high severity + red flags → urgencyLevel=high; routine → standard/moderate
- [ ] Abandonment tracking (completedAt=null + ABANDONED status) — requires API integration test

### API Security Tests
- [x] Unauthenticated requests → 401/403 (apps/provider-portal/e2e/auth-security.spec.ts)
- [x] SQL injection in query params → rejected (auth-security.spec.ts)
- [x] SQL injection in POST body → rejected (auth-security.spec.ts)
- [x] XSS in request body → rejected (auth-security.spec.ts)
- [x] CSRF: POST without token → rejected (auth-security.spec.ts)
- [x] PHI not exposed in unauthenticated page source (auth-security.spec.ts)
- [ ] Wrong role → 403 (requires seeded role-limited user in E2E environment)
- [ ] Malformed input → 400 with Zod errors (requires authenticated E2E session)

### .NET Domain Tests (backend/tests/ATTENDING.Domain.Tests/)
- [ ] DrugInteractionService covers all critical pairs  ← OPEN
- [ ] RedFlagEvaluator covers all patterns  ← OPEN
- [ ] LabOrder STAT auto-upgrade on emergency  ← OPEN
- [ ] Entity factory methods enforce invariants  ← OPEN

**Note:** The .NET domain layer has a RedFlagEvaluator and DrugInteractionService in
`backend/src/ATTENDING.Domain/Services/`. These should mirror the TypeScript safety
tests above. Create xUnit test classes in ATTENDING.Domain.Tests/ to close these gaps.
