# ATTENDING AI - Healthcare Integration Status
## Epic FHIR, Lab Systems, Pharmacy Networks, and More

**Date:** January 27, 2026  
**Status:** Foundational Implementation Complete, Integration Pending

---

## Executive Summary

Your ATTENDING AI system has a **solid FHIR R4 foundation** but needs several additional components to become a true "one-stop shop" for patient medical history. Here's the complete picture:

| Integration | Status | What's Needed |
|-------------|--------|---------------|
| **Epic FHIR** | 🟡 Client Ready | OAuth registration, endpoint config |
| **Cerner FHIR** | 🟡 Client Ready | OAuth registration, endpoint config |
| **Lab Systems (LIS)** | 🔴 Not Started | HL7v2/FHIR interface |
| **Pharmacy (Surescripts)** | 🔴 Partial | NCPDP/SCRIPT certification |
| **Imaging (PACS)** | 🔴 Not Started | DICOM/DICOMweb integration |
| **Claims/Billing** | 🔴 Not Started | X12 837/835 integration |
| **Health Information Exchange** | 🔴 Not Started | Carequality/CommonWell |
| **Patient Devices** | 🔴 Not Started | Apple Health, Fitbit APIs |

---

## 1. What's Already Built ✅

### FHIR R4 Client Library
**Location:** `apps/shared/lib/fhir/`

Your FHIR implementation includes:

```
✅ FhirClient.ts          - Full SMART on FHIR authentication
✅ resourceMappers.ts     - FHIR ↔ ATTENDING data transformers
✅ types.ts               - Complete FHIR R4 type definitions
✅ hooks.ts               - React hooks for FHIR data
✅ FhirProvider.tsx       - Context provider for React apps
```

**Supported FHIR Resources:**
- ✅ Patient (demographics, contacts)
- ✅ Observation (labs, vitals)
- ✅ Condition (diagnoses, problems)
- ✅ MedicationRequest (prescriptions)
- ✅ AllergyIntolerance
- ✅ Encounter (visits)
- ✅ ServiceRequest (orders)
- ✅ DiagnosticReport (results)

**Supported EHR Vendors:**
- ✅ Epic (factory function ready)
- ✅ Cerner (factory function ready)
- ✅ Generic FHIR R4 servers

### SMART on FHIR Authentication
```typescript
// Already implemented in FhirClient.ts:
✅ getSmartConfiguration()     - Discovers OAuth endpoints
✅ getAuthorizationUrl()       - Generates auth URL
✅ exchangeCodeForToken()      - OAuth code exchange
✅ refreshAccessToken()        - Token refresh
✅ ensureValidToken()          - Auto-refresh before expiry
```

---

## 2. What's Missing for Epic Integration 🟡

### A. Epic App Orchard Registration

**You need to register with Epic:**
1. Go to: https://fhir.epic.com/Developer/Apps
2. Register your application
3. Get your `Client ID` and configure redirect URIs
4. Request access to Epic's sandbox, then production

**Required Scopes for Full Access:**
```
launch/patient
patient/Patient.read
patient/Patient.write
patient/Observation.read
patient/Observation.write
patient/Condition.read
patient/Condition.write
patient/MedicationRequest.read
patient/MedicationRequest.write
patient/AllergyIntolerance.read
patient/AllergyIntolerance.write
patient/Encounter.read
patient/ServiceRequest.read
patient/ServiceRequest.write
patient/DiagnosticReport.read
patient/DocumentReference.read
patient/DocumentReference.write
openid
fhirUser
```

### B. Configuration Required

Add to your `.env.local`:
```env
# Epic FHIR Configuration
FHIR_ENABLED=true
FHIR_VENDOR=epic

# Epic Sandbox (for testing)
EPIC_FHIR_BASE_URL=https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4
EPIC_CLIENT_ID=your-client-id-from-app-orchard
EPIC_REDIRECT_URI=https://your-app.com/api/fhir/callback

# Production Epic (per-organization)
# Each hospital system has their own Epic instance:
# EPIC_FHIR_BASE_URL=https://epicservices.hospital.org/api/FHIR/R4
```

### C. Missing API Routes

Create these routes for FHIR callback and data sync:

```
apps/provider-portal/pages/api/fhir/
├── callback.ts          # OAuth callback handler (NEEDS CREATION)
├── sync/
│   ├── patient.ts       # Sync patient from EHR (NEEDS CREATION)
│   ├── medications.ts   # Sync medications (NEEDS CREATION)
│   ├── allergies.ts     # Sync allergies (NEEDS CREATION)
│   └── history.ts       # Sync full history (NEEDS CREATION)
```

---

## 3. Additional Integrations Needed 🔴

### A. Laboratory Information Systems (LIS)

**Why Needed:** Direct lab results feed, order transmission

**Options:**
1. **FHIR-based** (preferred if lab supports it)
   - Quest Diagnostics has FHIR APIs
   - LabCorp has FHIR APIs
   
2. **HL7v2** (legacy but common)
   - Need HL7v2 message parser
   - Typically ADT, ORM, ORU messages
   
3. **Direct Interface** (lab-specific APIs)

**Implementation Needed:**
```typescript
// apps/shared/lib/lis/
├── LabInterfaceClient.ts
├── HL7v2Parser.ts
├── resultMappers.ts
└── orderMappers.ts
```

### B. E-Prescribing (Surescripts/NCPDP)

**Why Needed:** Electronic prescriptions to pharmacies

**Current Status:** Basic structure exists but not certified

**What's Required:**
1. **Surescripts Certification** ($15k-50k + annual fees)
2. **NCPDP SCRIPT Standard** implementation
3. **EPCS Certification** for controlled substances
4. **State PDMP Integration** for opioid monitoring

**Alternative:** Use a certified intermediary:
- DrFirst
- Rcopia
- NewCrop

**Configuration Needed:**
```env
# E-Prescribing (via intermediary)
EPRESCRIBING_PROVIDER=rcopia
RCOPIA_ACCOUNT_ID=your-account
RCOPIA_API_KEY=your-api-key
RCOPIA_SITE_ID=your-site
```

### C. Medical Imaging (PACS/DICOM)

**Why Needed:** View X-rays, CTs, MRIs directly in app

**Standards:**
- **DICOM** - Image format standard
- **DICOMweb** - REST API for DICOM (WADO-RS, STOW-RS, QIDO-RS)
- **IHE XDS-I** - Cross-enterprise image sharing

**Implementation Needed:**
```typescript
// apps/shared/lib/imaging/
├── DicomWebClient.ts
├── ImageViewer.tsx          # Cornerstone.js integration
├── studyMappers.ts
└── types.ts
```

**Viewer Libraries:**
- Cornerstone.js (open source)
- OHIF Viewer (open source)
- Philips IntelliSpace (commercial)

### D. Health Information Exchange (HIE)

**Why Needed:** Pull records from OTHER hospital systems

**Networks:**
1. **Carequality** - Connects Epic, Cerner, VA, etc.
2. **CommonWell** - Cerner-led network
3. **eHealth Exchange** - Federal/government network

**Implementation:**
- Typically requires organizational membership
- Uses IHE XCA/XDS profiles
- Often accessed via EHR's built-in query

### E. Patient-Generated Health Data

**Why Needed:** Fitbit, Apple Watch, glucose monitors, etc.

**APIs to Integrate:**
```typescript
// apps/shared/lib/patient-devices/
├── AppleHealthKit.ts        // Apple Health (HealthKit)
├── GoogleFit.ts             // Google Fit
├── FitbitClient.ts          // Fitbit API
├── DexcomClient.ts          // Continuous glucose
├── WithingsClient.ts        // Blood pressure, scales
└── aggregator.ts            // Unified device data
```

### F. Claims & Billing

**Why Needed:** Insurance verification, claim submission

**Standards:**
- **X12 270/271** - Eligibility inquiry/response
- **X12 837** - Claim submission
- **X12 835** - Remittance advice

**Options:**
- Direct clearinghouse integration (Availity, Change Healthcare)
- Practice management system integration
- EHR passthrough

---

## 4. Data Flow Architecture

### Current Flow (What's Built)
```
Patient App → ATTENDING DB → Provider Portal
    ↓              ↓              ↓
  Submit      Store/Read      View/Order
Assessment    Locally        Treatments
```

### Target Flow (Full Integration)
```
                    ┌─────────────────────────────────────┐
                    │         ATTENDING AI Hub            │
                    │  ┌─────────────────────────────┐   │
                    │  │   Patient Context Store     │   │
                    │  │   (Unified Patient Record)  │   │
                    │  └─────────────────────────────┘   │
                    └─────────────┬───────────────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
        ▼                         ▼                         ▼
┌───────────────┐       ┌─────────────────┐       ┌───────────────┐
│   Epic/Cerner │       │   Lab Systems   │       │   Pharmacy    │
│   (FHIR R4)   │       │   (HL7v2/FHIR)  │       │  (Surescripts)│
├───────────────┤       ├─────────────────┤       ├───────────────┤
│ • Demographics│       │ • Results       │       │ • Rx History  │
│ • Medications │       │ • Orders        │       │ • Fill Status │
│ • Allergies   │       │ • Panels        │       │ • New Rx      │
│ • Conditions  │       │                 │       │ • Refills     │
│ • Encounters  │       │                 │       │               │
│ • Documents   │       │                 │       │               │
└───────────────┘       └─────────────────┘       └───────────────┘
        │                         │                         │
        ▼                         ▼                         ▼
┌───────────────┐       ┌─────────────────┐       ┌───────────────┐
│    Imaging    │       │  Patient Devices│       │     HIE       │
│  (DICOMweb)   │       │  (Apple/Fitbit) │       │ (Carequality) │
├───────────────┤       ├─────────────────┤       ├───────────────┤
│ • X-rays      │       │ • Vitals        │       │ • External    │
│ • CT/MRI      │       │ • Activity      │       │   Records     │
│ • Reports     │       │ • Sleep         │       │ • C-CDA Docs  │
│ • AI Analysis │       │ • Glucose       │       │               │
└───────────────┘       └─────────────────┘       └───────────────┘
```

---

## 5. Implementation Roadmap

### Phase 1: Epic FHIR Connection (2-4 weeks)
- [ ] Register with Epic App Orchard
- [ ] Create OAuth callback route
- [ ] Build patient sync service
- [ ] Test with Epic sandbox
- [ ] Implement patient launch flow

### Phase 2: Lab Integration (2-3 weeks)
- [ ] Choose lab partner (Quest/LabCorp)
- [ ] Implement FHIR or HL7v2 interface
- [ ] Map lab results to ATTENDING format
- [ ] Build result notification system

### Phase 3: E-Prescribing (4-6 weeks)
- [ ] Select certified intermediary
- [ ] Implement prescription API
- [ ] Add medication history pull
- [ ] PDMP integration (state-specific)

### Phase 4: Imaging (3-4 weeks)
- [ ] Integrate DICOMweb client
- [ ] Add image viewer component
- [ ] Connect to PACS (per-site)

### Phase 5: Patient Devices (2-3 weeks)
- [ ] Apple Health integration
- [ ] Fitbit/Google Fit
- [ ] Glucose monitor support

### Phase 6: HIE (4-6 weeks)
- [ ] Carequality membership
- [ ] CommonWell connection
- [ ] Cross-organization query

---

## 6. Immediate Next Steps

### To Connect to Epic TODAY (Sandbox):

1. **Register your app:**
   ```
   https://fhir.epic.com/Developer/Apps
   ```

2. **Add callback route:**
   ```typescript
   // apps/provider-portal/pages/api/fhir/callback.ts
   // I can create this for you
   ```

3. **Configure environment:**
   ```env
   FHIR_ENABLED=true
   EPIC_CLIENT_ID=<from-epic>
   EPIC_FHIR_BASE_URL=https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4
   ```

4. **Test the connection:**
   ```typescript
   const client = createEpicClient({
     baseUrl: process.env.EPIC_FHIR_BASE_URL,
     clientId: process.env.EPIC_CLIENT_ID,
     redirectUri: 'https://your-app.com/api/fhir/callback',
   });
   ```

---

## 7. Estimated Costs

| Integration | Development | Licensing/Certification |
|-------------|-------------|------------------------|
| Epic FHIR | $0 (built) | $0-5k (app review) |
| Cerner FHIR | $0 (built) | $0-5k (app review) |
| Surescripts | $10-20k | $15-50k + annual |
| Lab Direct | $5-15k | Per-lab fees |
| PACS/DICOM | $10-20k | Per-site license |
| HIE Membership | $5-10k | $5-20k/year |

**Alternative:** Use an integration platform:
- **Redox** - $500-2000/month, handles all integrations
- **Health Gorilla** - Similar pricing
- **1upHealth** - FHIR-focused

---

## Summary

**What you have:** Excellent FHIR R4 foundation with Epic/Cerner client code ready to go.

**What you need:** 
1. Epic App Orchard registration (free, 1-2 weeks)
2. OAuth callback implementation (I can add today)
3. Patient sync service (I can add today)
4. Lab/pharmacy integrations (separate vendors)

**Want me to create the Epic OAuth callback route and patient sync service now?**
