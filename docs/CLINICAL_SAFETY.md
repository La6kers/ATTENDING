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

### Red Flag Tests (tests/clinical-safety/red-flags.test.ts)
- [ ] Every pattern in the table above has at least one positive test
- [ ] Every pattern has at least one negative (false-positive prevention) test
- [ ] Edge cases: mixed symptoms, typos, abbreviations

### Drug Interaction Tests (tests/clinical-safety/drug-interactions.test.ts)
- [ ] Every critical pair in the table above is tested
- [ ] Safe combinations return no flag
- [ ] Allergy cross-reactivity is tested

### Assessment Machine Tests (tests/clinical-safety/assessment-machine.test.ts)
- [ ] All 18 phases are reachable
- [ ] Emergency transition works from every phase
- [ ] Completion generates valid HPI
- [ ] Abandonment is properly tracked

### API Security Tests (tests/clinical-safety/api-security.test.ts)
- [ ] Unauthenticated requests → 401
- [ ] Wrong role → 403
- [ ] Malformed input → 400 with Zod errors
- [ ] SQL injection attempts → rejected
- [ ] CSRF required on POST/PUT/DELETE

### .NET Domain Tests (backend/tests/ATTENDING.Domain.Tests/)
- [ ] DrugInteractionService covers all critical pairs
- [ ] RedFlagEvaluator covers all patterns
- [ ] LabOrder STAT auto-upgrade on emergency
- [ ] Entity factory methods enforce invariants
