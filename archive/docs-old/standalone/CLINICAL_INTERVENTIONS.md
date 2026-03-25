# ATTENDING AI - Clinical Intervention Features

## Overview

These advanced intervention features transform ATTENDING AI from a passive clinical decision support system into an **active clinical co-pilot**. While competitors focus on alerts and notifications, ATTENDING AI provides actionable, evidence-based recommendations with one-click implementation.

---

## 1. Clinical Decision Engine

### Purpose
Generates evidence-based clinical recommendations with guideline citations, going beyond simple alerts to provide actionable treatment guidance.

### Key Differentiators
- **Guideline-linked recommendations** with citations (ADA, ACC/AHA, USPSTF, etc.)
- **Evidence levels** (A/B/C/D) and recommendation strength
- **One-click order templates** for immediate action
- **Alternative therapy suggestions** with rationale
- **Expected outcomes** including NNT and risk reduction data

### Clinical Rules Included

| Category | Rule | Trigger | Action |
|----------|------|---------|--------|
| Diabetes | A1c > 8% | Elevated A1c in diabetic | Therapy intensification pathway |
| Cardiovascular | ASCVD without high-intensity statin | CAD/Stroke/PAD diagnosis | Statin optimization |
| Hypertension | BP ≥ 140/90 | Uncontrolled HTN | Stepwise therapy |
| CKD | Proteinuria without ACE-I/ARB | CKD + albuminuria | Renal protection |
| Preventive | Age 45-75, no CRC screening | Gap identified | Screening order |
| Safety | NSAID + Anticoagulant | Both active | Bleeding risk alert |
| Cost | Brand medication with generic | Expensive brand drug | Generic substitution |

### API Endpoint
```
POST /api/interventions/recommendations
```

### Response Example
```json
{
  "recommendations": [{
    "id": "rec_dm_a1c",
    "type": "therapeutic",
    "title": "Diabetes Therapy Intensification Recommended",
    "description": "Current A1c is 9.2% (goal <7%). Start GLP-1 RA for cardiovascular benefit.",
    "evidenceLevel": "A",
    "strength": "strong",
    "guidelines": [{
      "organization": "American Diabetes Association",
      "guidelineName": "Standards of Medical Care in Diabetes",
      "year": 2024,
      "grade": "A"
    }],
    "urgency": "soon",
    "actions": [{
      "type": "prescribe",
      "description": "Start Semaglutide 0.25mg weekly",
      "orderTemplate": {
        "orderType": "medication",
        "name": "Semaglutide 0.25mg",
        "code": "1991302",
        "instructions": "Inject subcutaneously once weekly. Titrate as tolerated."
      }
    }],
    "expectedBenefit": "Each 1% A1c reduction reduces microvascular complications by ~35%",
    "numberNeededToTreat": 15
  }]
}
```

---

## 2. Smart Order Assistant

### Purpose
Natural language order processing with AI-powered safety checks, drug interactions, and context-aware suggestions. Transforms ordering from multi-click workflows to conversational commands.

### Key Differentiators
- **Natural language input**: "Order a CT chest for pneumonia workup"
- **Real-time safety checks**: Allergies, interactions, renal dosing, Beers criteria
- **Condition-based order sets**: Chest pain, sepsis bundle, diabetes annual
- **Cost transparency**: Estimated costs and insurance coverage
- **Prior auth detection**: Automatic PA requirement flagging

### Safety Checks Performed

| Check Type | What It Catches |
|------------|-----------------|
| Allergy | Direct matches and cross-reactivity |
| Drug Interaction | 50+ interaction rules with severity levels |
| Duplicate | Same medication or recent lab orders |
| Renal Dosing | Metformin, gabapentin, anticoagulants at low eGFR |
| Hepatic | Statins, acetaminophen with elevated LFTs |
| Age (Beers) | Anticholinergics, benzos, NSAIDs in elderly |
| Pregnancy | Category X medications |
| Contrast + Metformin | Hold metformin reminder |

### Order Sets Included
- **Chest Pain Workup**: Troponin, BNP, BMP, CBC, CXR, ECG
- **Diabetes Annual**: A1c, lipids, CMP, UACR, eye/foot referrals
- **Sepsis Bundle (SEP-1)**: Lactate, cultures, procalcitonin, fluids, antibiotics
- **DVT/PE Workup**: D-dimer, CBC, PT/INR, CTA chest

### API Endpoint
```
POST /api/interventions/orders
```

### Usage Example
```javascript
// Natural language order
const response = await fetch('/api/interventions/orders', {
  method: 'POST',
  body: JSON.stringify({
    action: 'parse',
    naturalLanguageInput: 'Order stat troponin and BNP for chest pain',
    patientContext: {
      patientId: 'pt_123',
      age: 65,
      medications: [{ name: 'Warfarin', status: 'active' }],
      allergies: [{ allergen: 'Penicillin', severity: 'severe' }],
      renalFunction: { egfr: 45 }
    }
  })
});

// Response includes orders with safety alerts
// { suggestions: [{ order: {...}, alerts: [...] }] }
```

---

## 3. Clinical Trial Matcher

### Purpose
Automatically identifies patients eligible for clinical trials based on their conditions, demographics, and clinical data. Connects patients to cutting-edge treatments.

### Key Differentiators
- **Automated eligibility matching** against inclusion/exclusion criteria
- **Lab value validation** (e.g., eGFR 30-60 for CKD trials)
- **Location-aware** with distance calculations
- **Patient notification generation** for trial discussions
- **Provider summary** with match scores and concerns

### Matching Criteria
- Age and gender eligibility
- Required diagnoses (ICD-10 matching)
- Required/excluded medications
- Lab value requirements (>, <, between)
- Performance status (ECOG)
- Prior treatment history

### Sample Trials Database
- Diabetes + CKD (Semaglutide)
- HFpEF (SGLT2 inhibitor)
- Rheumatoid Arthritis (JAK inhibitor)
- NSCLC (Immunotherapy combination)
- Depression (Digital CBT)

### API Endpoint
```
POST /api/interventions/trials
```

### Response Example
```json
{
  "matches": [{
    "trial": {
      "nctId": "NCT04000001",
      "title": "Semaglutide vs Standard Care in Type 2 Diabetes with CKD",
      "phase": "Phase 3",
      "status": "Recruiting"
    },
    "matchScore": 0.85,
    "matchedCriteria": ["Age eligible", "Condition: Type 2 Diabetes", "eGFR in range"],
    "potentialExclusions": [],
    "nearestLocation": {
      "facility": "University of Colorado",
      "city": "Aurora",
      "state": "CO",
      "distance": 15
    },
    "recommendationStrength": "strong"
  }]
}
```

---

## 4. Social Determinants of Health (SDOH) Service

### Purpose
Screens for social determinants affecting health outcomes and connects patients with community resources. Addresses the 80% of health determined outside the healthcare system.

### Key Differentiators
- **Validated screening tool** (AHC-HRSN based)
- **Automatic risk scoring** by domain
- **Community resource matching** by location and need
- **ICD-10 Z code generation** for proper documentation and billing
- **Referral tracking** with outcome measurement

### SDOH Domains Screened

| Domain | Questions | Risk Factors |
|--------|-----------|--------------|
| Food Insecurity | 2 | Hunger Vital Sign |
| Housing Instability | 2 | Homelessness, unsafe conditions |
| Transportation | 1 | Access to medical appointments |
| Utilities | 1 | Shut-off threats |
| Safety | 4 | Domestic violence, abuse |
| Financial Strain | 1 | Difficulty paying for basics |
| Social Isolation | 1 | Loneliness |
| Employment | 1 | Job assistance needs |
| Education | 1 | Training/GED needs |
| Childcare | 1 | Work/study barriers |
| Health Literacy | 1 | Form completion confidence |

### Community Resources Database
- Food banks and SNAP enrollment
- Housing assistance and shelters
- Transportation (paratransit, Medicaid NEMT)
- Utility assistance (LEAP)
- Domestic violence services
- Financial assistance (211)

### ICD-10 Z Codes Generated
- Z59.41 - Food insecurity
- Z59.00 - Homelessness
- Z59.82 - Transportation insecurity
- Z59.86 - Financial insecurity
- Z60.4 - Social exclusion
- Z56.0 - Unemployment
- Z63.0 - Relationship problems

### API Endpoint
```
POST /api/interventions/sdoh
```

---

## 5. Medication Optimizer

### Purpose
AI-powered medication review for deprescribing, polypharmacy management, cost reduction, and adherence improvement. Goes beyond drug interactions to optimize the entire regimen.

### Key Differentiators
- **Beers Criteria integration** for elderly patients
- **STOPP/START criteria** for comprehensive review
- **Deprescribing protocols** with tapering schedules
- **Therapeutic substitution** for cost savings
- **Pill burden reduction** via combination products
- **Renal/hepatic dose adjustments**

### Optimization Types

| Type | Description | Example |
|------|-------------|---------|
| Deprescribe | Remove unnecessary medications | Long-term PPI without indication |
| Therapeutic Substitution | Switch to equivalent cheaper drug | Nexium → Omeprazole |
| Dose Optimization | Adjust for organ function | Gabapentin for eGFR |
| Formulation Change | Improve adherence | Switch to XR formulation |
| Duplicate Therapy | Remove duplications | Two ACE inhibitors |
| Drug-Disease | Address contraindications | NSAID in heart failure |
| Pill Burden | Consolidate to combination | Lisinopril + HCTZ → combo |

### Deprescribing Rules

| Medication Class | Trigger | Recommendation |
|------------------|---------|----------------|
| PPI | > 8 weeks, no Barrett's | Step-down to H2 blocker |
| Benzodiazepine | Age ≥ 65 | Taper and discontinue |
| Anticholinergic | Age ≥ 65 | Switch to safer alternative |
| NSAID | Age ≥ 65, > 3 months | Discontinue, use acetaminophen |
| Statin (primary prev) | Age > 75, no ASCVD | Shared decision-making |
| Bisphosphonate | > 5 years | Consider drug holiday |
| Sulfonylurea | Age ≥ 65 | Switch to DPP-4i or SGLT2i |

### API Endpoint
```
POST /api/interventions/medications
```

### Response Example
```json
{
  "report": {
    "totalMedications": 12,
    "highRiskMedications": 3,
    "polypharmacyLevel": "severe",
    "optimizations": [{
      "type": "deprescribe",
      "priority": "high",
      "currentMedication": {
        "name": "Lorazepam",
        "dose": "0.5mg",
        "frequency": "TID"
      },
      "recommendation": "Strongly consider benzodiazepine tapering",
      "rationale": "Beers Criteria: Risk of cognitive impairment, falls, fractures",
      "tapering": {
        "steps": [
          { "week": 1, "dose": "0.375mg", "frequency": "TID" },
          { "week": 3, "dose": "0.25mg", "frequency": "TID" },
          { "week": 5, "dose": "0.25mg", "frequency": "BID" },
          { "week": 7, "dose": "Discontinue" }
        ],
        "duration": "6-8 weeks"
      }
    }],
    "potentialCostSavings": 350,
    "pillBurdenReduction": 3
  }
}
```

---

## 6. Care Coordination Hub

### Purpose
Team collaboration platform for task management, secure messaging, patient handoffs, and care team communication. Ensures nothing falls through the cracks.

### Key Differentiators
- **I-PASS handoff format** for standardized communication
- **Task escalation** with automatic notifications
- **Care team management** with role assignments
- **Secure messaging** with read receipts
- **Coordination metrics** for quality improvement

### Task Categories
- Follow-up appointments
- Lab/imaging review
- Referral coordination
- Prior authorization
- Patient education
- Care gap closure
- Discharge planning
- Phone calls
- Documentation

### Handoff Format (I-PASS)
- **I**llness severity
- **P**atient summary
- **A**ction list
- **S**ituation awareness
- **S**ynthesis by receiver

### API Endpoints
```
GET  /api/interventions/coordination?view=tasks
GET  /api/interventions/coordination?view=overdue
GET  /api/interventions/coordination?view=handoffs
GET  /api/interventions/coordination?view=messages
POST /api/interventions/coordination
```

### Metrics Tracked
- Tasks completed vs overdue
- Average completion time
- Handoff acknowledgment rate
- Message response time
- Care gaps closed

---

## Competitive Differentiation

### What Competitors Offer
| Feature | Epic BPA | Nuance | Olive AI | ATTENDING AI |
|---------|----------|--------|----------|--------------|
| Basic alerts | ✓ | ✓ | ✓ | ✓ |
| Drug interactions | ✓ | - | - | ✓ |
| Evidence citations | - | - | - | ✓ |
| Order templates | ✓ | - | - | ✓ |
| Natural language orders | - | - | - | ✓ |
| Clinical trial matching | - | - | - | ✓ |
| SDOH screening | - | - | - | ✓ |
| Deprescribing protocols | - | - | - | ✓ |
| Care coordination | Separate module | - | - | ✓ |
| I-PASS handoffs | - | - | - | ✓ |

### ATTENDING AI Unique Value
1. **Actionable, not just informational** - One-click order templates
2. **Evidence-based with citations** - Guideline references for every recommendation
3. **Holistic patient view** - Medical + social determinants
4. **Proactive, not reactive** - Identifies opportunities before problems
5. **Integrated workflow** - No separate modules or systems
6. **Medication intelligence** - Beyond interactions to optimization
7. **Clinical trial access** - Connects patients to cutting-edge treatments
8. **Team collaboration** - Built-in care coordination

---

## Implementation Guide

### Quick Start
```typescript
import {
  clinicalDecisionEngine,
  smartOrderAssistant,
  clinicalTrialMatcher,
  sdohService,
  medicationOptimizer,
  careCoordinationHub,
} from '@attending/shared/services';

// Get clinical recommendations
const recommendations = await clinicalDecisionEngine.analyzePatient(patientContext);

// Process natural language order
const orders = await smartOrderAssistant.processNaturalLanguageOrder(
  'Order A1c and lipid panel',
  patientContext
);

// Find clinical trials
const trials = await clinicalTrialMatcher.findMatchingTrials(patientContext);

// Screen for SDOH
const sdohResults = await sdohService.processScreeningResponses(
  patientId,
  providerId,
  responses
);

// Optimize medications
const medReview = await medicationOptimizer.performMedicationReview(reviewContext);

// Create care task
const task = await careCoordinationHub.createTask(taskData);
```

### Event Listeners
All services emit events for real-time updates:
```typescript
clinicalDecisionEngine.on('recommendationGenerated', (rec) => {
  // Handle new recommendation
});

careCoordinationHub.on('taskEscalated', ({ task, escalateTo, reason }) => {
  // Send notification
});

sdohService.on('screeningCompleted', (screening) => {
  // Update patient record
});
```

---

## Files Created

| Service | File | Lines |
|---------|------|-------|
| Clinical Decision Engine | `clinical-decision/ClinicalDecisionEngine.ts` | ~850 |
| Smart Order Assistant | `interventions/SmartOrderAssistant.ts` | ~950 |
| Clinical Trial Matcher | `interventions/ClinicalTrialMatcher.ts` | ~650 |
| SDOH Service | `interventions/SDOHService.ts` | ~750 |
| Medication Optimizer | `interventions/MedicationOptimizer.ts` | ~900 |
| Care Coordination Hub | `interventions/CareCoordinationHub.ts` | ~700 |
| **Total** | | **~4,800** |

### API Endpoints

| Endpoint | Methods | Purpose |
|----------|---------|---------|
| `/api/interventions/recommendations` | POST | Clinical recommendations |
| `/api/interventions/orders` | POST | Smart order processing |
| `/api/interventions/trials` | POST | Clinical trial matching |
| `/api/interventions/sdoh` | GET, POST | SDOH screening & resources |
| `/api/interventions/medications` | POST | Medication optimization |
| `/api/interventions/coordination` | GET, POST | Care coordination |

---

## Revenue Impact

| Feature | Value Proposition | Pricing Model |
|---------|-------------------|---------------|
| Clinical Decision Engine | Reduced adverse events, improved outcomes | Per provider/month |
| Smart Orders | Time savings (est. 5 min/order) | Per order or subscription |
| Trial Matching | Patient recruitment revenue share | Per enrolled patient |
| SDOH | Improved quality scores, reduced readmissions | Per screening |
| Medication Optimizer | Cost savings (avg $350/patient/year) | Savings share |
| Care Coordination | Reduced tasks falling through cracks | Per provider/month |

**Estimated Value per Provider: $25,000-40,000/year**
