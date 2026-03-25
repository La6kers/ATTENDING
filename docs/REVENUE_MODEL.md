# ATTENDING Revenue Model Analysis

## Recommendation: Hybrid Tiered + Per-AI-Interaction Pricing

### Why Hybrid Wins for ATTENDING

After analyzing four pricing models against ATTENDING's competitive position
(seed-stage, targeting small practices underserved by Epic), the hybrid model
is the strongest choice. Here is the analysis of each option:

| Model | Pros | Cons | Fit |
|---|---|---|---|
| Per-provider/month ($140-500) | Predictable revenue, simple billing | High barrier for small practices, no usage alignment | Medium |
| Per-encounter usage | Perfect cost alignment, low entry barrier | Unpredictable revenue, hard to forecast | Low |
| Tiered (Free/Pro/Enterprise) | Clear upgrade path, freemium acquisition | Free tier costs real money (Claude API), hard to convert | Medium |
| **Hybrid: base + per-AI** | **Low entry, usage-aligned, predictable base** | **Slightly complex billing** | **High** |

### Recommended Pricing Structure

```
STARTER (Free)          - Rule-based features only, no AI
                        - Up to 2 providers, 50 encounters/month
                        - Basic charting and patient management
                        - Goal: acquisition funnel

PROFESSIONAL ($149/provider/month)
                        - All AI features included
                        - Up to 200 AI interactions/provider/month
                        - Overage: $0.15 per AI interaction
                        - Quality review with ICD-10/CPT coding
                        - SOAP note generation
                        - Goal: core revenue driver

ENTERPRISE (Custom)     - Unlimited AI interactions
                        - Custom integrations (HL7/FHIR)
                        - Dedicated support, SLA
                        - Audit trail and compliance reporting
                        - Goal: large group practices
```

### Why This Beats athenahealth on Price

athenahealth charges $140-500/provider/month with percentage-of-collections
billing (typically 4-8% of collections). A small practice doing $30K/month
in collections pays athenahealth ~$1,200-2,400/month PLUS the per-provider fee.

ATTENDING at $149/provider/month with included AI interactions undercuts this
dramatically while delivering the highest-value feature (coding accuracy)
that directly impacts revenue capture.

---

## Cost Structure Analysis

### Claude API Costs Per AI Endpoint

Based on the 5 AI endpoints in the codebase, estimated per-call costs using
Claude Sonnet at current pricing ($3/M input, $15/M output tokens):

| Endpoint | Est. Input Tokens | Est. Output Tokens | Cost/Call |
|---|---|---|---|
| intake-followup | ~800 | ~400 | $0.0084 |
| intake-summary | ~1,200 | ~800 | $0.0156 |
| encounter-assist | ~1,500 | ~1,200 | $0.0225 |
| generate-note | ~2,000 | ~1,500 | $0.0285 |
| quality-review | ~2,500 | ~800 | $0.0195 |

**Full encounter AI cost (all 5 calls): ~$0.095**

A typical encounter uses 2-3 AI calls (summary + note + review): ~$0.055

### Margin Analysis at $149/Provider/Month

| Metric | 10 providers | 100 providers | 1,000 providers |
|---|---|---|---|
| Monthly Revenue | $1,490 | $14,900 | $149,000 |
| Encounters/provider/month (est.) | 80 | 80 | 80 |
| AI calls/encounter (est.) | 2.5 | 2.5 | 2.5 |
| Total AI calls/month | 2,000 | 20,000 | 200,000 |
| Claude API cost/month | $110 | $1,100 | $11,000 |
| Infrastructure (SQLite/hosting) | $50 | $200 | $2,000 |
| **Total COGS** | **$160** | **$1,300** | **$13,000** |
| **Gross Margin** | **89.3%** | **91.3%** | **91.3%** |

### Key Insight: Coding Accuracy ROI

The average small practice loses $50,000-125,000/year to coding errors
(undercoding, missed charges, claim denials). If ATTENDING's AI review
captures even 20% of that leakage, the platform pays for itself in the
first month for a 3-provider practice:

- Recovered revenue: ~$10,000-25,000/year = $833-2,083/month
- ATTENDING cost: 3 * $149 = $447/month
- **ROI: 86%-366%**

This is the sales pitch that closes deals.

---

## Seed Demo Strategy

The demo should NOT require payment. Instead:

1. All accounts start as "Professional Trial" (30-day, all features)
2. Usage dashboard shows real AI cost savings alongside plan details
3. Plan comparison page shows what features gate after trial
4. Demo data includes pre-computed savings metrics from seed encounters

This lets investors and pilot practices see the full product without
friction, while the billing scaffold is ready to activate.
