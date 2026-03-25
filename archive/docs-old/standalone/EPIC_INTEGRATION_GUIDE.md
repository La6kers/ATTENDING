# ATTENDING AI - Epic FHIR Integration Guide
## Production-Ready Sandbox Testing

**Date:** January 27, 2026  
**Status:** ✅ Ready for Epic Sandbox Testing

---

## What's Been Built

### FHIR Infrastructure

| Component | Location | Purpose |
|-----------|----------|---------|
| **OAuth Launch** | `/api/fhir/launch.ts` | Initiates SMART on FHIR auth |
| **OAuth Callback** | `/api/fhir/callback.ts` | Handles token exchange |
| **Connection Status** | `/api/fhir/status.ts` | Checks connection health |
| **Patient Sync** | `/api/fhir/sync/patient.ts` | Syncs full patient record |
| **Order Send** | `/api/fhir/orders/send.ts` | Sends orders to EHR |
| **Settings UI** | `/settings/integrations.tsx` | User interface for connections |

### Services

| Service | Location | Purpose |
|---------|----------|---------|
| **FhirSyncService** | `shared/services/fhir-sync/` | Orchestrates data pull |
| **FhirPersistenceService** | `shared/services/fhir-sync/` | Writes to database |
| **FhirOrderService** | `shared/services/fhir-sync/` | Sends orders back to EHR |

---

## Quick Start: Connect to Epic Sandbox

### 1. Register with Epic (One-Time)

```
1. Go to: https://fhir.epic.com/Developer/Apps
2. Create an account
3. Click "Create a New App"
4. Fill in:
   - App Name: ATTENDING AI
   - Redirect URI: http://localhost:3000/api/fhir/callback
   - Select "Patient Access API"
   - Check required scopes
5. Copy your Client ID
```

### 2. Configure Environment

Add to `apps/provider-portal/.env.local`:

```env
# Epic Configuration
EPIC_FHIR_BASE_URL="https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4"
EPIC_CLIENT_ID="your-client-id-from-epic"
```

### 3. Test the Connection

```powershell
# Start the app
npm run dev

# Open browser
# Go to: http://localhost:3000/settings/integrations
# Click "Connect" on Epic
# Follow OAuth flow
```

---

## Architecture

### Data Flow: EHR → ATTENDING

```
┌──────────────────────────────────────────────────────────────────┐
│                        ATTENDING AI                               │
│                                                                   │
│  ┌─────────────┐    ┌─────────────────┐    ┌─────────────────┐  │
│  │ /api/fhir/  │    │ FhirSyncService │    │ Prisma Database │  │
│  │ launch.ts   │───▶│                 │───▶│                 │  │
│  │ callback.ts │    │ - syncPatient() │    │ - Patient       │  │
│  │ sync/*.ts   │    │ - syncMeds()    │    │ - FhirMedication│  │
│  └─────────────┘    │ - syncLabs()    │    │ - FhirLabResult │  │
│                     │ - syncVitals()  │    │ - Allergy       │  │
│                     └─────────────────┘    └─────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
         │                                           ▲
         │ SMART on FHIR                            │
         │ OAuth 2.0                                │
         ▼                                           │
┌──────────────────────────────────────────────────────────────────┐
│                      Epic FHIR R4 Server                          │
│                                                                   │
│  /Patient  /Observation  /Condition  /MedicationRequest          │
│  /AllergyIntolerance  /Encounter  /ServiceRequest                │
└──────────────────────────────────────────────────────────────────┘
```

### Data Flow: ATTENDING → EHR (Orders)

```
┌─────────────────────┐         ┌─────────────────┐
│  Provider Portal    │         │  Epic FHIR      │
│                     │         │                 │
│  Lab Order ─────────┼────────▶│  ServiceRequest │
│  Imaging Order ─────┼────────▶│  ServiceRequest │
│  Prescription ──────┼────────▶│  MedicationReq  │
│  Referral ──────────┼────────▶│  ServiceRequest │
└─────────────────────┘         └─────────────────┘
```

---

## API Reference

### Launch FHIR Connection
```
GET /api/fhir/launch?vendor=epic
GET /api/fhir/launch?vendor=cerner
```

### Check Connection Status
```
GET /api/fhir/status?vendor=epic

Response:
{
  "connected": true,
  "vendor": "epic",
  "patientId": "abc123",
  "tokenExpired": false,
  "lastSyncAt": "2026-01-27T...",
  "availableData": {
    "patient": true,
    "medications": 12,
    "allergies": 3,
    ...
  }
}
```

### Sync Patient Data
```
POST /api/fhir/sync/patient
Content-Type: application/json

{
  "vendor": "epic",
  "includePatient": true,
  "includeMedications": true,
  "includeAllergies": true,
  "includeConditions": true,
  "includeLabResults": true,
  "includeVitals": true,
  "sinceDays": 30
}
```

### Send Order to EHR
```
POST /api/fhir/orders/send
Content-Type: application/json

{
  "orderType": "lab",        // lab | imaging | referral | prescription
  "orderId": "local-order-id",
  "vendor": "epic"
}
```

---

## Supported Data Types

### Read (From EHR)
- ✅ Patient demographics
- ✅ Medications (active & historical)
- ✅ Allergies
- ✅ Conditions/Problems
- ✅ Lab Results
- ✅ Vital Signs
- ✅ Encounters

### Write (To EHR)
- ✅ Lab Orders (ServiceRequest)
- ✅ Imaging Orders (ServiceRequest)
- ✅ Referrals (ServiceRequest)
- ✅ Prescriptions (MedicationRequest)

---

## Testing with Epic Sandbox

Epic provides test patients with pre-populated data:

| Patient | MRN | Use Case |
|---------|-----|----------|
| Camila Lopez | E1967 | General adult |
| Derrick Lin | E1982 | Diabetes management |
| Monica Rodriguez | E2022 | Pregnancy |

After connecting, sync a test patient and verify data appears in your database.

---

## Production Checklist

- [ ] Epic App Orchard registration approved
- [ ] Production Client ID obtained
- [ ] Hospital IT approval obtained
- [ ] BAA signed with healthcare organization
- [ ] HIPAA compliance verified
- [ ] OAuth redirect URIs updated for production
- [ ] Token encryption key configured
- [ ] Audit logging enabled
- [ ] Error monitoring configured (Sentry)

---

## Troubleshooting

### "Client ID not configured"
Add `EPIC_CLIENT_ID` to your `.env.local`

### "Token expired"
User needs to reconnect via `/settings/integrations`

### "Failed to get SMART configuration"
Check that `EPIC_FHIR_BASE_URL` is correct and accessible

### "Sync failed - 401"
Token may be expired or revoked. Reconnect to EHR.

---

## Next Steps

1. **Get Epic Client ID** - Register at fhir.epic.com
2. **Test with Sandbox** - Use test patients
3. **Contact Hospital IT** - For production access
4. **Complete Certification** - Epic may require app review
