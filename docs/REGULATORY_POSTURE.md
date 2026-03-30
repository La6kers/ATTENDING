# ATTENDING AI — Regulatory Classification Posture

**Document Type:** Regulatory Self-Assessment
**Version:** 1.0
**Date:** 2026-03-26
**Author:** Dr. Scott Isbell, MD — Founder & CEO
**Status:** Internal classification rationale — pending legal counsel review

---

## Classification: Non-Device Clinical Decision Support (CDS)

ATTENDING AI is classified as **non-device clinical decision support software** under the 21st Century Cures Act, Section 3060(a). It is **not a medical device** and does not require FDA clearance or approval.

---

## Statutory Basis: 21st Century Cures Act Section 3060(a)

The 21st Century Cures Act (Public Law 114-255), enacted December 13, 2016, amended the Federal Food, Drug, and Cosmetic Act (FD&C Act) Section 520(o) to exclude certain clinical decision support software from the definition of "device."

Software is excluded from the device definition when it meets **all four** of the following criteria:

### Criterion 1: Not intended to acquire, process, or analyze a medical image or signal

**ATTENDING AI meets this criterion.**

- ATTENDING does not acquire, process, or analyze medical images (X-rays, CT scans, MRIs, pathology slides, etc.)
- ATTENDING does not acquire, process, or analyze physiological signals (ECG waveforms, EEG, pulse oximetry waveforms, etc.)
- ATTENDING processes only text-based patient-reported information (symptoms, history, medications, allergies) and structured clinical data entered by providers
- Vital signs are entered manually by clinical staff — ATTENDING does not connect to or process signals from monitoring devices

### Criterion 2: Intended for the purpose of displaying, analyzing, or printing medical information

**ATTENDING AI meets this criterion.**

- ATTENDING displays structured clinical information derived from patient-reported symptoms via the COMPASS assessment tool
- ATTENDING displays lab recommendations, drug interaction alerts, triage classifications, and clinical protocol references
- ATTENDING presents red flag alerts based on published clinical guidelines and evidence-based criteria
- All outputs are informational displays intended to support, not replace, clinical reasoning

### Criterion 3: Intended for the purpose of supporting or providing recommendations to a healthcare professional

**ATTENDING AI meets this criterion.**

- ATTENDING is designed exclusively for use by licensed healthcare professionals (physicians, nurse practitioners, physician assistants, registered nurses)
- All clinical recommendations, alerts, and decision support outputs are directed to healthcare professionals — never directly to patients as clinical guidance
- The COMPASS patient intake tool collects symptoms from patients but does not provide clinical recommendations to patients
- Red flag alerts detected during patient intake are communicated to the healthcare professional, who independently determines the clinical response

### Criterion 4: Intended for the purpose of enabling the healthcare professional to independently review the basis for recommendations

**ATTENDING AI meets this criterion.**

- Every clinical recommendation includes the clinical rationale and evidence basis
- Lab recommendations cite the clinical indication (e.g., "ACS workup with cardiac biomarkers per ACC/AHA guidelines")
- Drug interaction alerts display the mechanism (e.g., "CYP2C9 inhibition increases warfarin levels"), severity classification, and management recommendation
- Red flag alerts show the specific symptom pattern that triggered the alert and the published guideline basis
- Triage classifications display the ESI level rationale with contributing factors
- Clinical protocols reference their source guidelines (e.g., "Surviving Sepsis Campaign guidelines")
- **The healthcare professional can review all underlying data, question the recommendation, and reach their own independent clinical judgment**

---

## What ATTENDING AI Does NOT Do

To be clear about the boundaries of the system:

| ATTENDING Does NOT: | Explanation |
|---|---|
| Make clinical decisions | All decisions are made by the licensed healthcare professional |
| Diagnose patients | ATTENDING presents differential considerations — the provider makes the diagnosis |
| Prescribe medications | ATTENDING may suggest medications for provider review — the provider writes the prescription |
| Order tests autonomously | Lab/imaging recommendations require explicit provider approval and signature |
| Replace clinical judgment | Every output includes the disclaimer: "Clinical decision support only. Provider judgment required." |
| Treat patients | ATTENDING has no therapeutic function; it is an information display tool |
| Operate autonomously | No clinical action occurs without explicit provider initiation and approval |
| Connect to medical devices | ATTENDING does not interface with, control, or process data from any medical device |
| Analyze medical images | ATTENDING processes only text-based clinical information |

---

## How AI Is Used in ATTENDING

ATTENDING employs a tiered intelligence architecture:

### Tier 0 — Rule-Based (No AI)
- Red flag detection: Pattern matching against 14 published emergency criteria
- Drug interaction checking: Known interaction database (warfarin-NSAID, SSRI-tramadol, etc.)
- Triage classification: ESI algorithm implementation
- Clinical protocols: Evidence-based protocol lookup
- **This tier operates entirely offline with deterministic, auditable logic**

### Tier 1 — Contextual Assembly (No AI)
- Structures patient-reported symptoms into clinical narratives
- Assembles relevant clinical context from patient history
- **No AI inference — data organization only**

### Tier 2 — Cloud AI Enhancement (Optional)
- When enabled, provides additional context via large language model
- Used for: follow-up question generation during intake, clinical note structuring
- **Always optional — Tier 0 operates independently if Tier 2 is unavailable**
- **AI outputs are labeled as AI-generated and presented as suggestions, never as conclusions**
- **The provider independently reviews all AI-generated content before any clinical action**

---

## Clinical Disclaimers (Implemented in Software)

The following disclaimers are displayed throughout the application:

1. **All clinical screens:** "Clinical decision support only. Not a diagnostic tool. Provider judgment required."

2. **Red flag alerts:** "This alert is based on patient-reported symptoms and published clinical guidelines. It does not replace clinical assessment by a qualified healthcare professional."

3. **AI-generated content:** "AI-assisted suggestion. Review clinical basis before acting. The healthcare professional retains full authority over all clinical decisions."

4. **COMPASS patient intake (opening screen):** "This is not a substitute for emergency services. If you are experiencing a medical emergency, call 911."

5. **COMPASS patient intake (before submission):** "Your responses will be reviewed by your healthcare provider. This tool does not provide medical advice, diagnosis, or treatment."

---

## Comparable Classified Products

The following products operate under the same non-device CDS classification:

- **UpToDate** (Wolters Kluwer) — Clinical reference and decision support
- **DynaMed** (EBSCO) — Evidence-based clinical decision support
- **Isabel Healthcare** — Differential diagnosis support tool
- **VisualDx** — Clinical decision support for differential diagnosis
- **Epocrates** — Drug interaction and clinical reference

ATTENDING operates in the same category: presenting clinical information to healthcare professionals who independently make all clinical decisions.

---

## Risk Mitigation

Despite the non-device classification, ATTENDING implements safety measures that exceed regulatory requirements:

1. **Audit Trail:** Every clinical action is logged with user, timestamp, and clinical context
2. **Red Flag Fail-Safe:** Critical alerts cannot be dismissed without provider acknowledgment
3. **HIPAA Compliance:** Full PHI protection with encryption, access controls, and audit logging
4. **Clinical Safety Testing:** Dedicated test suite validates red flag detection accuracy
5. **Incident Response:** Documented protocol for adverse events during clinical use
6. **Provider Override:** All automated recommendations can be overridden by the provider
7. **Transparency:** All recommendation rationale is visible to the provider

---

## Regulatory Monitoring

ATTENDING will monitor for regulatory changes that could affect this classification:

- FDA guidance updates on CDS software
- Changes to the 21st Century Cures Act provisions
- New FDA enforcement actions against CDS software
- International regulatory developments (EU MDR, UK MHRA) for future market expansion

**Review schedule:** This classification rationale will be reviewed quarterly and upon any significant product change that could affect the four-criteria analysis.

---

## Action Items

- [ ] Legal counsel review of this classification rationale
- [ ] Confirm malpractice insurance coverage for AI-assisted clinical workflows
- [ ] Document any product changes that could affect classification
- [ ] Monitor FDA Draft Guidance on CDS (September 2022 revision) for final guidance

---

*This document establishes ATTENDING AI's regulatory posture as a non-device CDS tool. The AI serves as an information assistant to the physician — it makes no clinical decisions. The physician retains complete control over all clinical decisions at all times. ATTENDING AI is a tool that provides relevant information; the physician is the decision-maker.*
