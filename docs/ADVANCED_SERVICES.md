# ATTENDING AI - Advanced Services Documentation

## Overview

This document covers the 17 advanced healthcare services implemented in the ATTENDING AI platform. These services span clinical intelligence, workflow optimization, patient engagement, specialized care, and platform services.

---

## Table of Contents

1. [Clinical Intelligence Services](#clinical-intelligence-services)
   - AI Scribe with Ambient Listening
   - Predictive Deterioration Alerts
   - Diagnostic Odyssey Solver
   - Clinical Image Analysis
2. [Workflow Optimization Services](#workflow-optimization-services)
   - Smart Inbox Triage
   - Care Gaps Detection
   - Smart Scheduling
   - Peer Consultation Network
3. [Patient Engagement Services](#patient-engagement-services)
   - Medication Buddy
   - Health Coaching
   - Family Health Hub
   - Post-Discharge Concierge
4. [Specialized Care Services](#specialized-care-services)
   - Mental Health Integration
   - Social Support Matching
   - End-of-Life Care Planning
5. [Platform Services](#platform-services)
   - Medical Interpreter
   - Population Health Command Center
   - Wearables Integration

---

## Clinical Intelligence Services

### 1. AI Scribe with Ambient Listening

**Location:** `apps/shared/services/ai-scribe/AmbientScribeService.ts`

**Purpose:** Automates clinical documentation by transcribing patient-provider conversations and generating structured SOAP notes.

**Key Features:**
- Real-time audio transcription with speaker diarization
- Medical entity extraction (symptoms, medications, vitals, diagnoses)
- SOAP note generation (Subjective/Objective/Assessment/Plan)
- ICD-10 code mapping (30+ conditions)
- CPT code mapping with E/M level calculation (99211-99215)
- Patient instruction generation
- Confidence scoring

**API Endpoints:**
```
POST /api/scribe           - Start new scribe session
GET  /api/scribe?sessionId - Get session status
PUT  /api/scribe           - Update session (pause/resume/audio)
DELETE /api/scribe?sessionId - End session and generate note
```

**Usage Example:**
```typescript
import { ambientScribeService } from '@/services/ai-scribe/AmbientScribeService';

// Start session
const session = ambientScribeService.startSession('patient_123', 'office-visit');

// Process audio chunks
ambientScribeService.processAudioChunk(session.id, audioBuffer);

// Generate SOAP note
const soapNote = await ambientScribeService.generateSOAPNote(session.id);
```

---

### 2. Predictive Deterioration Alerts

**Location:** `apps/shared/services/predictive-alerts/DeteriorationAlertService.ts`

**Purpose:** Provides 6-12 hour early warning for clinical deterioration using 8 risk algorithms.

**Algorithms:**
| Algorithm | Description | Key Inputs |
|-----------|-------------|------------|
| Sepsis | qSOFA + SIRS + ML model | Vitals, WBC, lactate |
| Heart Failure | Exacerbation prediction | Weight, BNP, symptoms |
| COPD | Exacerbation risk | Spirometry, symptoms |
| DKA | Diabetic ketoacidosis risk | Glucose, pH, ketones |
| AKI | KDIGO criteria | Creatinine, urine output |
| Respiratory Failure | Oxygenation deterioration | SpO2, respiratory rate |
| Cardiac Arrest | Modified Early Warning | Vitals composite |
| Readmission | HOSPITAL + LACE scores | Multiple factors |

**Alert Severity Levels:**
- **Critical** (Score ≥75): Immediate intervention required
- **High** (Score 50-74): Urgent evaluation needed
- **Moderate** (Score 25-49): Close monitoring
- **Low** (Score <25): Routine surveillance

**API Endpoints:**
```
GET  /api/alerts/deterioration           - Get active alerts
POST /api/alerts/deterioration           - Run risk assessment
PUT  /api/alerts/deterioration           - Acknowledge alert
```

---

### 3. Diagnostic Odyssey Solver

**Location:** `apps/shared/services/diagnostic-solver/DiagnosticSolverService.ts`

**Purpose:** Assists with complex diagnostic cases, particularly rare diseases and diagnostic odysseys.

**Disease Pattern Database (20+ conditions):**
- Autoimmune: SLE, Sjögren's, Scleroderma
- Endocrine: Addison's, Pheochromocytoma, Carcinoid
- Infectious: Lyme, TB, Brucellosis
- Neurological: MS, Myasthenia Gravis
- Hematologic: TTP, HLH
- Rare: Ehlers-Danlos, Mast Cell Activation, POTS

**Diagnostic Workup Phases:**
1. **Immediate:** Basic labs, ECG
2. **Initial:** Targeted testing based on presentation
3. **Secondary:** Advanced diagnostics
4. **Specialized:** Genetic testing, specialty referrals

**Output:**
- Differential diagnosis with probability scores
- Evidence-based workup recommendations
- Clinical pearls and red flags
- Orphanet/OMIM codes for rare diseases

---

### 4. Clinical Image Analysis

**Location:** `apps/shared/services/clinical-imaging/ImageAnalysisService.ts`

**Purpose:** AI-powered analysis of medical images for decision support.

**Supported Image Types:**
| Type | Analysis | Key Outputs |
|------|----------|-------------|
| Skin Lesion | ABCDE assessment, dermoscopy | Melanoma probability, differential |
| Wound | Tissue composition, healing stage | Treatment recommendations |
| ECG | Rhythm, intervals, morphology | Interpretation, STEMI detection |
| Chest X-ray | Lungs, heart, mediastinum | Findings, cardiac assessment |

**Important:** All analyses include disclaimer requiring physician review.

---

## Workflow Optimization Services

### 5. Smart Inbox Triage

**Location:** `apps/shared/services/smart-inbox/SmartInboxService.ts`

**Purpose:** AI-powered message classification and routing with draft response generation.

**Message Classifications (18 types):**
- Refill requests
- Appointment requests
- Test results inquiries
- Symptom reports
- Billing questions
- And more...

**Priority Determination:**
- **Critical:** Chest pain, suicidal ideation, severe symptoms
- **High:** Abnormal results, urgent concerns
- **Medium:** Refills, routine appointments
- **Low:** General questions, billing

**Routing Recommendations:**
- Physician
- Nurse
- Medical Assistant
- Front Desk
- Billing

---

### 6. Care Gaps Detection

**Location:** `apps/shared/services/care-gaps/CareGapsService.ts`

**Purpose:** Identifies preventive care and chronic disease monitoring gaps.

**Preventive Care Guidelines (25+ screenings):**
- Cancer screenings (colorectal, breast, cervical, lung, prostate)
- Cardiovascular (BP, cholesterol, AAA)
- Metabolic (diabetes, osteoporosis)
- Immunizations (flu, pneumococcal, shingles, COVID, RSV)
- Behavioral (depression, alcohol, tobacco)

**Chronic Disease Monitoring:**
| Condition | Metrics | Targets |
|-----------|---------|---------|
| Type 2 Diabetes | HbA1c, eGFR, LDL | <7%, >60, <100 |
| Hypertension | BP, K+, Cr | <140/90 |
| CKD | eGFR, UACR | Stage-based |
| Heart Failure | BNP, weight | <300, stable |
| COPD | FEV1, exacerbations | Stable |

---

### 7. Smart Scheduling

**Location:** `apps/shared/services/smart-scheduling/SmartSchedulingService.ts`

**Purpose:** Optimizes appointment scheduling with predictive analytics.

**Features:**
- **Duration Prediction:** Based on visit type, patient factors, provider
- **No-Show Risk:** 15 risk factors with mitigation strategies
- **Scheduling Optimization:** Slot scoring, gap analysis
- **Reminder Strategy:** Personalized based on risk

**No-Show Risk Factors:**
- History of no-shows >20%
- Transportation challenges
- Monday appointments
- Young adults (18-35)
- Appointments >30 days out
- No visit in past year

---

### 8. Peer Consultation Network

**Location:** `apps/shared/services/peer-consult/PeerConsultService.ts`

**Purpose:** Secure peer-to-peer consultation with AI-suggested specialist matching.

**Consult Types:**
- Curbside
- Formal e-consult
- Second opinion
- Case discussion
- Educational

**Matching Algorithm:**
- Specialty match (50 points)
- Expertise keywords (10 points each)
- Performance rating (10 points)
- Response time (5 points)

---

## Patient Engagement Services

### 9. Medication Buddy

**Location:** `apps/shared/services/patient-engagement/MedicationBuddyService.ts`

**Purpose:** Comprehensive medication management for patients.

**Features:**
- Drug interaction checking (8 major interactions)
- Food interaction warnings
- Pill identification (color, shape, imprint, image)
- Reminder management (7-day schedules)
- Adherence tracking (PDC calculation)
- Side effect reporting with AI analysis
- Refill prediction

**Drug Interactions Tracked:**
- Warfarin + Aspirin (bleeding risk)
- Metformin + Contrast (lactic acidosis)
- Lisinopril + Potassium (hyperkalemia)
- And more...

---

### 10. Health Coaching

**Location:** `apps/shared/services/patient-engagement/HealthCoachingService.ts`

**Purpose:** Behavioral health support with goal tracking and motivation.

**Goal Categories (12):**
- Weight management
- Physical activity
- Nutrition
- Sleep
- Stress management
- Medication adherence
- Smoking cessation
- Alcohol reduction
- Chronic disease management
- Mental health
- Social connection
- Custom

**Gamification:**
- Daily challenges (10-15 points)
- Streaks and milestones
- Achievement badges
- Progress reports

---

### 11. Family Health Hub

**Location:** `apps/shared/services/patient-engagement/FamilyHealthHubService.ts`

**Purpose:** Family-centered health management.

**Features:**
- Multi-member family accounts
- Pediatric developmental milestones (CDC schedule)
- Family vaccination schedules
- Genetic risk assessment and counseling
- Caregiver coordination
- Shared family calendar

**Developmental Milestones:**
- 2 months through 5 years
- Categories: gross motor, fine motor, language, cognitive, social-emotional, self-care

---

### 12. Post-Discharge Concierge

**Location:** `apps/shared/services/patient-engagement/PostDischargeConciergeService.ts`

**Purpose:** Comprehensive 30-day post-discharge support to prevent readmissions.

**Components:**
- **Daily Check-ins:** Condition-specific protocols (heart failure, pneumonia, surgery, general)
- **Medication Reconciliation:** Track filling, understanding, adherence
- **Follow-up Management:** Scheduling, reminders, transportation
- **Escalation Pathways:** Automated triggers based on responses

**Check-in Schedules:**
- High risk: Daily for first week, then every other day
- Moderate risk: Every other day first week, then twice weekly
- Low risk: Twice first week, then weekly

---

## Specialized Care Services

### 13. Mental Health Integration

**Location:** `apps/shared/services/mental-health/MentalHealthService.ts`

**Purpose:** Comprehensive behavioral health support.

**Validated Screenings:**
- PHQ-9 (Depression)
- GAD-7 (Anxiety)
- PHQ-2, GAD-2 (Quick screens)
- C-SSRS (Suicide risk)
- AUDIT-C (Alcohol)
- PC-PTSD-5 (PTSD)

**Crisis Detection:**
- Real-time analysis of screening responses
- Automatic escalation for critical indicators
- Safety plan creation and management

**Safety Plan Components:**
- Warning signs of crisis
- Coping strategies
- Reasons for living
- Support contacts
- Crisis hotlines

---

### 14. Social Support Matching

**Location:** `apps/shared/services/social-support/SocialSupportService.ts`

**Purpose:** Address social isolation and connect patients with support.

**Features:**
- Loneliness screening (UCLA 3-Item Scale)
- Support group matching by condition
- Peer mentor matching
- Volunteer visitor coordination
- Social network assessment

**Support Group Database:**
- Diabetes, heart disease, cancer, caregiver groups
- Virtual and in-person options
- Peer-led and professionally facilitated

---

### 15. End-of-Life Care Planning

**Location:** `apps/shared/services/end-of-life/EndOfLifeService.ts`

**Purpose:** Support advance care planning and goals of care discussions.

**Documentation:**
- Advance directives (living will, healthcare POA)
- POLST forms
- Goals of care
- Healthcare proxy designation

**Conversation Guides:**
- Serious Illness Conversation Guide
- Family Meeting Guide

**Palliative Care:**
- Consult requests
- Symptom assessments
- Hospice eligibility evaluation

---

## Platform Services

### 16. Medical Interpreter

**Location:** `apps/shared/services/interpreter/MedicalInterpreterService.ts`

**Purpose:** Medical interpretation with cultural health context.

**Supported Languages (20):**
Spanish, Chinese, Vietnamese, Korean, Tagalog, Russian, Arabic, French, Portuguese, German, Japanese, Hindi, Farsi, Polish, Italian, Haitian Creole, Somali, Amharic, and more.

**Cultural Health Profiles:**
| Culture | Key Considerations |
|---------|-------------------|
| Hispanic/Latino | Personalismo, familismo, hot/cold theory |
| Chinese | Face, qi balance, filial piety |
| South Asian | Karma, Ayurveda, vegetarianism |
| Middle Eastern | Halal, gender preferences, God's will |

---

### 17. Population Health Command Center

**Location:** `apps/shared/services/population-health/PopulationHealthService.ts`

**Purpose:** Population-level health management and quality improvement.

**Dashboards:**
- Disease surveillance and outbreak detection
- Risk stratification across populations
- Quality measure tracking (HEDIS, STARS, MIPS)
- Health equity gap analysis
- Resource allocation optimization

**Quality Measures:**
- HbA1c control
- Blood pressure control
- Cancer screenings
- Immunizations
- And more...

---

### 18. Wearables Integration

**Location:** `apps/shared/services/wearables/WearablesService.ts`

**Purpose:** Multi-device health data aggregation and monitoring.

**Supported Device Types:**
- Smartwatches
- Fitness trackers
- CGM (Continuous Glucose Monitors)
- Blood pressure monitors
- Pulse oximeters
- Weight scales
- ECG monitors
- Fall detectors

**Data Types:**
- Heart rate, HRV
- Blood pressure
- Blood oxygen
- Blood glucose
- Temperature
- Steps, distance, calories
- Sleep stages
- ECG rhythms

**Anomaly Detection:**
- Configurable thresholds per patient
- Real-time alerting
- Trend analysis
- Automated recommendations

---

## API Reference

### Provider Portal APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/scribe` | POST/GET/PUT/DELETE | AI Scribe session management |
| `/api/alerts/deterioration` | GET/POST/PUT | Predictive alerts |
| `/api/inbox/smart` | GET/POST/PUT | Smart inbox triage |
| `/api/clinical/[service]` | GET/POST | Clinical services |

### Patient Portal APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/engagement/medication-buddy` | GET/POST | Medication management |
| `/api/engagement/health-coaching` | GET/POST | Health coaching |
| `/api/engagement/family-hub` | GET/POST | Family health |
| `/api/engagement/wearables` | GET/POST | Wearables data |
| `/api/engagement/mental-health` | GET/POST | Mental health support |

---

## Security & Compliance

All services are designed with HIPAA compliance in mind:

- **Data Encryption:** All data encrypted in transit and at rest
- **Access Control:** Role-based access with audit logging
- **PHI Handling:** Minimum necessary principle applied
- **Audit Trails:** Complete logging of all access and modifications
- **Data Retention:** Configurable retention policies

---

## Integration Points

### EHR Integration
- FHIR R4 compliant
- Epic and Cerner connectors available
- HL7 v2 message support

### External Services
- Push notifications (FCM, APNS, Expo)
- SMS (Twilio)
- Email notifications
- Telehealth platforms

---

## Performance Considerations

- All services use singleton pattern for efficient resource usage
- Event-driven architecture for real-time updates
- Caching strategies for frequently accessed data
- Rate limiting on API endpoints
- Async processing for heavy operations

---

## Future Roadmap

1. Enhanced AI models for clinical decision support
2. Voice-first interfaces
3. AR/VR for patient education
4. Blockchain for health records
5. Federated learning for population health

---

*Document Version: 1.0*
*Last Updated: January 2025*
*Total Lines of Code: ~15,000+*
