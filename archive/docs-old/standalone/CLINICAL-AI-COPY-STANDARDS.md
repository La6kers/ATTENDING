# ATTENDING AI — Clinical AI Copy & Branding Standards

## Regulatory Context

The FDA's **21st Century Cures Act § 3060(a)** exempts Clinical Decision Support (CDS) software from device regulation **only if** it:

1. Is not intended to acquire, process, or analyze medical images/signals
2. Displays or presents clinical information to a healthcare professional
3. Does not replace the professional's independent clinical judgment
4. Enables the professional to independently review the basis for the recommendation

**ATTENDING AI must consistently present itself as a decision SUPPORT tool, not an autonomous clinical system.**

## Terminology Standards

### ❌ NEVER Use

| Deprecated Phrase | Why |
|---|---|
| "AI diagnosis" | Implies autonomous diagnostic capability |
| "AI recommends" | Implies AI has clinical authority |
| "AI predicts" | Overstates certainty of probabilistic outputs |
| "AI determines" | Implies deterministic clinical decision |
| "AI-generated diagnosis" | Conflates support with autonomous action |
| "The AI says..." | Anthropomorphizes the system |
| "Machine-generated" | Sounds unreliable, non-clinical |

### ✅ ALWAYS Use

| Preferred Phrase | Context |
|---|---|
| "Evidence-based suggestion" | Any AI output |
| "Clinical decision support" | System description |
| "Guideline-based recommendation" | When citing specific guidelines |
| "Algorithmic triage assessment" | Triage scoring |
| "Risk assessment" | Predictive risk scores |
| "Differential considerations" | AI-generated differential lists |
| "Suggested laboratory/imaging studies" | AI-recommended orders |
| "Requires provider verification" | All AI outputs |

## Component Usage

### ClinicalDisclaimer Component

Import from `@attending/shared/components/ClinicalDisclaimer`:

```tsx
import { ClinicalDisclaimer } from '@attending/shared/components/ClinicalDisclaimer';

// Banner: top of AI-powered pages
<ClinicalDisclaimer variant="banner" context="differential" />

// Inline: within recommendation panels
<ClinicalDisclaimer variant="inline" context="lab-suggestions" />

// Compact: tight spaces (table rows, cards)
<ClinicalDisclaimer variant="compact" />

// Footer: page-level legal disclaimer
<ClinicalDisclaimer variant="footer" />
```

### CDS_COPY Constants

Use `CDS_COPY` from the same import for consistent section headers:

```tsx
import { CDS_COPY } from '@attending/shared/components/ClinicalDisclaimer';

<h2>{CDS_COPY.DIFFERENTIAL_TITLE}</h2>
// Renders: "Evidence-Based Differential Considerations"

<p className="text-xs">{CDS_COPY.DISCLAIMER_SHORT}</p>
// Renders: "Decision support — requires provider verification"
```

## Where Disclaimers Are Required

| Page / Component | Variant | Context |
|---|---|---|
| Differential diagnosis panel | `banner` | `differential` |
| Lab/imaging recommendation panels | `inline` | `lab-suggestions` / `imaging-suggestions` |
| Risk score dashboards | `inline` | `risk-score` |
| Triage/ESI assignment | `banner` | `triage` |
| Drug interaction checker | `inline` | `medication-check` |
| AI Scribe output | `banner` | `general` |
| Treatment plan suggestions | `inline` | `recommendations` |
| Patient-facing assessment summary | `banner` | `general` |
| Every page with AI features | `footer` | — |

## Confidence Display

When displaying AI confidence scores:

- **Never** show raw model probabilities to clinicians
- **Always** map to clinical language:
  - 0.8+ → "Strongly supported by clinical evidence"
  - 0.5–0.8 → "Supported by clinical guidelines"  
  - <0.5 → "Consider based on clinical presentation"
- Include the evidence basis (which guideline, which data points)

## Marketing vs. Clinical UI

- **Marketing materials** (landing pages, investor decks): May use "AI-powered" as a feature description
- **Clinical UI** (provider portal, patient portal): Must use "clinical decision support" language
- **API responses**: Use neutral field names (`suggestions`, `considerations`, `supportData`) not `aiDiagnosis` or `aiRecommendation`
