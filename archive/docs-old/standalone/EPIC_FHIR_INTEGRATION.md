# ATTENDING AI - Epic FHIR Integration Guide
## Production-Ready Setup for Epic Sandbox Testing

**Date:** January 27, 2026  
**Version:** 1.0

---

## What Was Built

This implementation provides complete Epic/Cerner FHIR R4 integration with:

### API Routes Created

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/fhir/auth/authorize` | GET | Initiates OAuth2 flow with Epic/Cerner |
| `/api/fhir/auth/callback` | GET | Handles OAuth callback, stores tokens |
| `/api/fhir/sync/patient` | POST | Syncs patient data from EHR |
| `/api/fhir/status` | GET | Returns connection status for all vendors |

### Library Files Created

| File | Purpose |
|------|---------|
| `lib/fhir/fhirClientFactory.ts` | Creates configured FHIR clients for Epic/Cerner |
| `lib/fhir/oauthState.ts` | CSRF protection for OAuth flow |
| `lib/fhir/tokenStorage.ts` | Encrypted token storage in database |
| `lib/fhir/FhirSyncService.ts` | Syncs FHIR data to ATTENDING database |

### Database Models Added

| Model | Purpose |
|-------|---------|
| `FhirConnection` | Stores OAuth tokens per provider/vendor |
| `OAuthState` | CSRF state parameters |
| `FhirLabResult` | Lab results from FHIR |
| `FhirCondition` | Conditions/diagnoses from FHIR |
| `FhirMedication` | Medications from FHIR |
| `FhirVitalSign` | Vital signs from FHIR |
| `FhirEncounter` | Encounters from FHIR |

### UI Page Created

| Page | Purpose |
|------|---------|
| `/settings/ehr-connection` | Connect/disconnect from Epic/Cerner |

---

## Quick Start: Connect to Epic Sandbox

### Step 1: Register with Epic App Orchard

1. Go to: https://fhir.epic.com/Developer/Apps
2. Create an account or sign in
3. Click "Create" to register a new application
4. Fill in:
   - **Application Name:** ATTENDING AI
   - **Application Type:** Patient Access
   - **Redirect URI:** `http://localhost:3000/api/fhir/auth/callback`
5. Select these scopes:
   - `launch/patient`
   - `patient/Patient.read`
   - `patient/Observation.read`
   - `patient/Condition.read`
   - `patient/MedicationRequest.read`
   - `patient/AllergyIntolerance.read`
   - `patient/Encounter.read`
   - `openid`, `fhirUser`
6. Copy your **Client ID**

### Step 2: Configure Environment

Edit `apps/provider-portal/.env.local`:

```env
FHIR_ENABLED=true
EPIC_CLIENT_ID=your-client-id-from-step-1
EPIC_FHIR_BASE_URL=https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4
EPIC_REDIRECT_URI=http://localhost:3000/api/fhir/auth/callback
FHIR_TOKEN_ENCRYPTION_KEY=generate-a-random-32-char-string
```

### Step 3: Update Database

```powershell
cd C:\Users\la6ke\Projects\ATTENDING
npx prisma migrate dev --name add_fhir_integration
```

### Step 4: Test the Connection

1. Start the dev server: `npm run dev`
2. Go to: http://localhost:3000/settings/ehr-connection
3. Click "Connect to Epic"
4. Log in with Epic sandbox credentials
5. Authorize the application
6. Patient data will sync automatically

---

## How Data Flows

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Epic/Cerner   │────►│  ATTENDING AI   │────►│   Provider UI   │
│   FHIR Server   │     │   Database      │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │  OAuth2 + SMART       │  FhirSyncService      │
        │  on FHIR              │  transforms data      │
        │                       │                       │
        ▼                       ▼                       ▼
   Patient grants          Data stored in         Provider sees
   access in EHR           Fhir* tables          unified patient
                                                  record
```

---

## API Usage Examples

### Initiate Epic Connection

```typescript
// Redirect user to authorize
window.location.href = '/api/fhir/auth/authorize?vendor=epic';
```

### Sync Patient Data

```typescript
// After OAuth callback, sync patient data
const response = await fetch('/api/fhir/sync/patient', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    patientId: 'abc123', // FHIR patient ID from token
    vendor: 'epic',
    fullSync: true, // Include encounters
  }),
});

const result = await response.json();
// {
//   success: true,
//   patient: { id: '...', name: '...' },
//   synced: {
//     allergies: 3,
//     medications: 7,
//     conditions: 5,
//     labResults: 42,
//     vitals: 15,
//     encounters: 12
//   }
// }
```

### Check Connection Status

```typescript
const response = await fetch('/api/fhir/status');
const status = await response.json();
// {
//   fhirEnabled: true,
//   vendors: {
//     epic: { available: true, connected: true, ... },
//     cerner: { available: false, ... }
//   }
// }
```

---

## Security Features

### Token Encryption
Tokens are encrypted at rest using AES-256-GCM:
```typescript
// Automatically handled by tokenStorage.ts
const encrypted = encryptToken(accessToken);
// Stored as: iv:authTag:encryptedData
```

### OAuth State (CSRF Protection)
```typescript
// State is stored in database with 10-minute expiry
const state = generateState(); // Cryptographically random
await storeOAuthState(state, { vendor, providerId });
```

### Audit Logging
All FHIR operations are logged:
```typescript
// Automatic audit logging
await prisma.auditLog.create({
  data: {
    action: 'FHIR_PATIENT_SYNC',
    entityType: 'Patient',
    entityId: patientId,
    details: JSON.stringify({ vendor, recordCount })
  }
});
```

---

## Troubleshooting

### "EPIC_CLIENT_ID not configured"
Add your Epic Client ID to `.env.local`

### "Invalid state" error
OAuth session expired. Try connecting again.

### "Token exchange failed"
Check that redirect URI matches exactly what's registered in Epic

### Data not syncing
Check browser console and server logs for FHIR API errors

---

## Next Steps for Production

1. **Epic Production Access**
   - Submit app for Epic review
   - Complete security questionnaire
   - Get per-organization approval

2. **Cerner Integration**
   - Register at code.cerner.com
   - Configure CERNER_CLIENT_ID

3. **Additional Integrations**
   - Lab systems (Quest, LabCorp)
   - E-prescribing (Surescripts)
   - Imaging (DICOMweb)

---

## Files Changed

```
apps/provider-portal/
├── lib/
│   ├── fhir/
│   │   ├── index.ts
│   │   ├── fhirClientFactory.ts
│   │   ├── oauthState.ts
│   │   ├── tokenStorage.ts
│   │   └── FhirSyncService.ts
│   └── prisma.ts
├── pages/
│   ├── api/fhir/
│   │   ├── auth/
│   │   │   ├── authorize.ts
│   │   │   └── callback.ts
│   │   ├── sync/
│   │   │   └── patient.ts
│   │   └── status.ts
│   └── settings/
│       └── ehr-connection.tsx
└── .env.example (updated)

prisma/
└── schema.prisma (updated with FHIR models)

docs/
├── EPIC_FHIR_INTEGRATION.md (this file)
└── HEALTHCARE_INTEGRATION_STATUS.md
```
