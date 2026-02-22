# ATTENDING AI - Enterprise Features

## Overview

ATTENDING AI includes five enterprise-grade features that differentiate it from standard clinical decision support systems:

1. **Ambient Clinical Documentation** - AI-powered transcription and note generation
2. **Prior Authorization Automation** - Automated PA submission and tracking
3. **Predictive Clinical Intelligence** - Sepsis, readmission, and deterioration prediction
4. **Remote Patient Monitoring** - Device integration with AI-powered alerts
5. **Quality Measures & MIPS Dashboard** - Real-time quality tracking and gap closure

---

## 1. Ambient Clinical Documentation

### Overview
Captures patient-provider conversations, filters non-medical content, extracts clinical entities, and generates SOAP/H&P notes automatically.

### Architecture
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Browser/App    │───▶│  Audio Capture   │───▶│  Speech-to-Text │
│  Microphone     │    │  (WebRTC/Media)  │    │  (Whisper/Google)│
└─────────────────┘    └──────────────────┘    └────────┬────────┘
                                                        │
                       ┌──────────────────┐             │
                       │  Medical Content │◀────────────┘
                       │    Filter        │
                       └────────┬─────────┘
                                │
                       ┌────────▼─────────┐
                       │  Clinical Entity │
                       │    Extraction    │
                       └────────┬─────────┘
                                │
                       ┌────────▼─────────┐
                       │  SOAP Note       │
                       │    Generator     │
                       └──────────────────┘
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ambient/session` | POST | Start ambient session |
| `/api/ambient/session` | GET | Get current session |
| `/api/ambient/session` | DELETE | End session |
| `/api/ambient/session` | PATCH | Pause/resume |
| `/api/ambient/transcribe` | POST | Submit transcription |
| `/api/ambient/generate-note` | POST | Generate clinical note |

### Usage Example
```typescript
// Start session when appointment begins
const response = await fetch('/api/ambient/session', {
  method: 'POST',
  body: JSON.stringify({
    encounterId: 'enc_123',
    patientId: 'pat_456',
    settings: {
      enableSpeakerDiarization: true,
      enableMedicalFiltering: true,
    }
  })
});

// Submit transcriptions from browser STT
await fetch('/api/ambient/transcribe', {
  method: 'POST',
  body: JSON.stringify({
    text: 'Patient reports chest pain for three days',
    confidence: 0.95
  })
});

// Generate note when documentation phase begins
const noteResponse = await fetch('/api/ambient/generate-note', {
  method: 'POST',
  body: JSON.stringify({
    format: 'soap',
    options: { verbosityLevel: 'standard' }
  })
});
```

### Key Files
- `apps/shared/services/ambient/AmbientListeningService.ts`
- `apps/shared/services/ambient/ClinicalNoteGenerator.ts`
- `apps/shared/services/ambient/RealtimeTranscriptionService.ts`

---

## 2. Prior Authorization Automation

### Overview
Automates the prior authorization process by extracting clinical evidence, populating PA forms, submitting to payers, and generating appeal letters.

### Workflow
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Order Created  │───▶│  Check PA Rules  │───▶│  PA Required?   │
│  (Med/Imaging)  │    │  (By Payer)      │    │                 │
└─────────────────┘    └──────────────────┘    └────────┬────────┘
                                                        │ Yes
                       ┌──────────────────┐             │
                       │  Extract Clinical│◀────────────┘
                       │  Evidence        │
                       └────────┬─────────┘
                                │
                       ┌────────▼─────────┐
                       │  Generate Medical│
                       │  Necessity       │
                       └────────┬─────────┘
                                │
                       ┌────────▼─────────┐    ┌─────────────────┐
                       │  Submit to Payer │───▶│  Track Status   │
                       │                  │    │  & Appeal       │
                       └──────────────────┘    └─────────────────┘
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/prior-auth` | POST | Create PA request |
| `/api/prior-auth` | GET | List PA requests |
| `/api/prior-auth/[id]` | GET | Get PA details |
| `/api/prior-auth/[id]` | POST | Actions (extract/submit/appeal) |

### Supported PA Types
- **Medications** - Brand drugs, specialty medications
- **Imaging** - MRI, CT, PET scans
- **Procedures** - Surgeries, interventional procedures
- **DME** - Durable medical equipment
- **Referrals** - Specialty referrals

### Usage Example
```typescript
// Create PA request
const pa = await fetch('/api/prior-auth', {
  method: 'POST',
  body: JSON.stringify({
    encounterId: 'enc_123',
    patientId: 'pat_456',
    requestedItem: {
      type: 'imaging',
      code: '72148',
      codeSystem: 'CPT',
      name: 'MRI Lumbar Spine without Contrast',
    },
    payer: {
      payerId: 'BCBS',
      payerName: 'Blue Cross Blue Shield',
      memberId: '123456789',
      electronicSubmission: true,
    },
    urgency: 'routine'
  })
});

// Extract evidence
await fetch(`/api/prior-auth/${pa.id}`, {
  method: 'POST',
  body: JSON.stringify({
    action: 'extract',
    patientData: { diagnoses, medications, labs, notes }
  })
});

// Submit
await fetch(`/api/prior-auth/${pa.id}`, {
  method: 'POST',
  body: JSON.stringify({ action: 'submit' })
});
```

### Key Files
- `apps/shared/services/prior-auth/PriorAuthService.ts`

---

## 3. Predictive Clinical Intelligence

### Overview
AI-powered predictions for clinical deterioration, sepsis risk, and 30-day readmission risk.

### Models

| Model | Prediction | Timeframe | Key Inputs |
|-------|------------|-----------|------------|
| **Sepsis** | Sepsis onset | 24 hours | Vitals, WBC, lactate, procalcitonin |
| **Readmission** | 30-day readmit | 30 days | Comorbidities, prior admits, medications |
| **Deterioration** | Clinical decline | 24 hours | MEWS components, vital trends |

### Risk Levels
- **Low** (0-29): Routine monitoring
- **Moderate** (30-49): Enhanced monitoring
- **High** (50-69): Urgent evaluation
- **Critical** (70+): Immediate intervention

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/predictive/analyze` | POST | Run prediction models |

### Usage Example
```typescript
const predictions = await fetch('/api/predictive/analyze', {
  method: 'POST',
  body: JSON.stringify({
    patientId: 'pat_456',
    patientContext: {
      age: 72,
      gender: 'male',
      vitals: [{
        heartRate: 102,
        systolicBP: 95,
        respiratoryRate: 24,
        temperature: 101.2,
        oxygenSaturation: 91,
        mentalStatus: 'confused'
      }],
      labs: [{
        wbc: 14.2,
        lactate: 2.8
      }],
      conditions: ['diabetes', 'hypertension', 'CHF'],
      medications: ['metformin', 'lisinopril', 'furosemide'],
      comorbidities: ['chronic kidney disease'],
    },
    models: ['all']
  })
});

// Response includes risk scores and recommended actions
// predictions.sepsis.riskLevel = 'high'
// predictions.sepsis.recommendedActions = [...]
```

### Key Files
- `apps/shared/services/predictive/PredictiveModels.ts`

---

## 4. Remote Patient Monitoring

### Overview
Integrates patient device data with AI-powered threshold monitoring and personalized baselines.

### Supported Devices

| Device Type | Metrics | Common Vendors |
|-------------|---------|----------------|
| Blood Pressure | Systolic, diastolic, MAP | Omron, iHealth, Withings |
| Glucose Meter | Blood glucose | Dexcom, FreeStyle Libre |
| Pulse Oximeter | SpO2, HR | Masimo, Nonin |
| Weight Scale | Weight, BMI, body fat | Withings, Fitbit |
| Smart Watch | HR, HRV, activity, sleep | Apple, Fitbit, Garmin |
| CGM | Continuous glucose | Dexcom, FreeStyle Libre |

### Alert Types
- **Critical Value** - Immediately dangerous readings
- **Threshold Exceeded** - Above/below target
- **Trend Alert** - Concerning pattern over time
- **Weight Gain** - Rapid weight increase (CHF)
- **Missing Data** - No readings received
- **Device Disconnected** - Communication lost

### Billing Support (CPT Codes)
- **99453** - Initial setup and education
- **99454** - Device supply with daily recordings (16+ days/month)
- **99457** - First 20 minutes clinical staff time
- **99458** - Each additional 20 minutes

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/rpm/enrollment` | POST | Enroll patient |
| `/api/rpm/enrollment?action=device` | POST | Register device |
| `/api/rpm/[patientId]` | GET | Get dashboard |
| `/api/rpm/[patientId]` | POST | Submit reading |
| `/api/rpm/[patientId]?action=billing` | GET | Billing report |

### Usage Example
```typescript
// Enroll patient
await fetch('/api/rpm/enrollment', {
  method: 'POST',
  body: JSON.stringify({
    patientId: 'pat_456',
    programType: 'chronic_care',
    conditions: ['hypertension', 'diabetes']
  })
});

// Register device
await fetch('/api/rpm/enrollment?action=device', {
  method: 'POST',
  body: JSON.stringify({
    patientId: 'pat_456',
    deviceType: 'blood_pressure',
    vendor: 'omron',
    settings: { alertsEnabled: true }
  })
});

// Submit reading
await fetch('/api/rpm/pat_456', {
  method: 'POST',
  body: JSON.stringify({
    deviceType: 'blood_pressure',
    values: { systolic: 165, diastolic: 95, heartRate: 88 }
  })
});
```

### Key Files
- `apps/shared/services/rpm/RemoteMonitoringService.ts`

---

## 5. Quality Measures & MIPS Dashboard

### Overview
Real-time tracking of quality measures with AI-driven care gap identification and automated patient outreach.

### Supported Measures

| Measure ID | Name | Category |
|------------|------|----------|
| CMS122 | Diabetes A1c Control | Quality |
| CMS131 | Diabetic Eye Exam | Quality |
| CMS165 | BP Control | Quality |
| CMS130 | Colorectal Cancer Screening | Quality |
| CMS125 | Breast Cancer Screening | Quality |
| CMS2 | Depression Screening | Quality |
| CMS138 | Tobacco Screening | Quality |
| CMS347 | Statin Therapy | Quality |
| CMS139 | Fall Risk Screening | Quality |

### MIPS Categories
- **Quality** (30%) - 6+ measures required
- **Promoting Interoperability** (25%) - e-Prescribing, HIE, Security
- **Improvement Activities** (15%) - 40 points required
- **Cost** (30%) - Calculated by CMS

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/quality/dashboard` | GET | Full MIPS dashboard |
| `/api/quality/dashboard?view=score` | GET | MIPS score only |
| `/api/quality/dashboard?view=gaps` | GET | Care gaps only |
| `/api/quality/patient/[id]` | POST | Evaluate patient |
| `/api/quality/patient/[id]?action=outreach` | POST | Schedule outreach |

### Usage Example
```typescript
// Get MIPS dashboard
const dashboard = await fetch('/api/quality/dashboard');
// dashboard.currentScore.finalScore = 87
// dashboard.careGaps = [...]
// dashboard.recommendations = [...]

// Evaluate patient measures
await fetch('/api/quality/patient/pat_456', {
  method: 'POST',
  body: JSON.stringify({
    patientData: {
      age: 58,
      gender: 'female',
      conditions: ['diabetes', 'hypertension'],
      medications: ['metformin', 'lisinopril'],
      labs: [{ code: '4548-4', value: '8.2', date: new Date() }],
      procedures: [],
      vitals: [{ type: 'bp', value: '145/92', date: new Date() }]
    }
  })
});

// Schedule outreach for care gap
await fetch('/api/quality/patient/pat_456?action=outreach', {
  method: 'POST',
  body: JSON.stringify({
    gapId: 'gap_cms125_pat_456',
    method: 'sms'
  })
});
```

### Key Files
- `apps/shared/services/quality/QualityMeasuresService.ts`

---

## Integration Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ATTENDING AI Platform                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐│
│  │  Ambient    │  │  Prior      │  │  Predictive │  │  Remote     ││
│  │  Listening  │  │  Auth       │  │  Analytics  │  │  Monitoring ││
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘│
│         │                │                │                │        │
│  ┌──────▼──────────────▼────────────────▼────────────────▼──────┐ │
│  │                    Clinical AI Engine                         │ │
│  │              (BioMistral / Rule-Based Fallback)              │ │
│  └──────────────────────────┬───────────────────────────────────┘ │
│                             │                                      │
│  ┌──────────────────────────▼───────────────────────────────────┐ │
│  │                    FHIR Integration Layer                     │ │
│  │                  (Epic / Cerner / Generic)                    │ │
│  └──────────────────────────┬───────────────────────────────────┘ │
│                             │                                      │
│  ┌──────────────────────────▼───────────────────────────────────┐ │
│  │                    Quality & MIPS Engine                      │ │
│  │               (Measure Tracking / Gap Closure)                │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
# Copy example environment
cp apps/provider-portal/.env.example apps/provider-portal/.env.local

# Add API keys as needed
WHISPER_API_ENDPOINT=ws://localhost:8765/transcribe
COVERMYMEDS_API_KEY=your_key
```

### 3. Start Development Server
```bash
npm run dev
```

### 4. Access Features
- Ambient Listening: `/encounter/[id]/ambient`
- Prior Auth: `/prior-auth`
- Predictive: `/patient/[id]/risk`
- RPM: `/rpm/[patientId]`
- Quality: `/quality/dashboard`

---

## Production Considerations

### Security
- All PHI encrypted at rest and in transit
- HIPAA-compliant audit logging
- Role-based access control
- Session management with secure tokens

### Scalability
- Stateless services for horizontal scaling
- Event-driven architecture for real-time alerts
- Caching layer for frequently accessed data

### Compliance
- HIPAA Business Associate Agreement required
- SOC 2 Type II certification recommended
- State-specific telehealth regulations apply to RPM

---

## Support

For technical support or feature requests, contact:
- Email: support@attending.ai
- Documentation: https://docs.attending.ai
