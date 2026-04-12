# ATTENDING AI — Provider Setup Guide

**Purpose:** Connect ATTENDING AI to your EHR and go live with real patient data.  
**Time to complete:** 30–60 minutes depending on your EHR vendor.

---

## Prerequisites

| Requirement | Notes |
|-------------|-------|
| Docker Desktop | Runs SQL Server + Redis locally |
| .NET 8 SDK | `dotnet --version` |
| Node.js 20 | `node --version` |
| EHR Sandbox Access | See vendor steps below |

---

## Step 1 — Clone & Start Local Stack

```powershell
git clone <repo-url>
cd ATTENDING

# Copy env template
Copy-Item env.development.example .env.local

# Start Docker containers (SQL Server + Redis)
npm run db:up

# Run database migrations
cd backend
dotnet ef database update --project src/ATTENDING.Infrastructure --startup-project src/ATTENDING.Orders.Api
cd ..

# Start everything
npm run dev:full
```

Open http://localhost:3002 (provider portal) and http://localhost:3001 (patient portal).  
Auth is auto-bypassed in dev — no credentials needed yet.

---

## Step 2 — Connect Your EHR

### Option A: Epic (MyChart / App Orchard)

1. Register at https://appmarket.epic.com/ → **Build Apps** → **Create App**
2. Set redirect URI: `http://localhost:3002/api/auth/fhir/callback`
3. Request scopes: `launch/patient openid fhirUser patient/*.read`
4. Copy your **Client ID** (non-confidential for web apps)
5. Update `.env.local`:
   ```
   EPIC_BASE_URL=https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4
   EPIC_CLIENT_ID=<your-client-id>
   EPIC_REDIRECT_URI=http://localhost:3002/api/auth/fhir/callback
   EPIC_SCOPES=launch/patient openid fhirUser patient/*.read
   ```
6. Restart: `npm run dev:all`

**Epic sandbox test patients:** https://fhir.epic.com/Documentation?docId=testpatients

---

### Option B: Oracle Health / Cerner

1. Register at https://code.cerner.com → **My Apps** → **New App**
2. Choose **Provider** app type, FHIR R4
3. Set redirect URI: `http://localhost:3002/api/auth/fhir/callback`
4. Copy **Client ID** and **Tenant ID**
5. Update `.env.local`:
   ```
   CERNER_BASE_URL=https://fhir-ehr-code.cerner.com/r4/<TENANT_ID>
   CERNER_CLIENT_ID=<your-client-id>
   CERNER_REDIRECT_URI=http://localhost:3002/api/auth/fhir/callback
   ```
6. Restart: `npm run dev:all`

**Cerner sandbox:** https://code.cerner.com/apiaccess

---

### Option C: Generic FHIR R4 (Meditech, Athena, etc.)

Any FHIR R4 server with SMART on FHIR auth works. The `FhirClient.ts`
auto-discovers SMART config from `/.well-known/smart-configuration` or
falls back to the `/metadata` endpoint.

```
FHIR_BASE_URL=https://your-ehr.example.com/fhir/r4
FHIR_CLIENT_ID=<your-client-id>
FHIR_CLIENT_SECRET=<your-secret>
```

---

## Step 3 — Configure Azure AD B2C (Production Auth)

In development, `DevAuthHandler` auto-authenticates — no B2C needed.  
For production:

1. Create an Azure AD B2C tenant at https://portal.azure.com
2. Register an app → note **Tenant ID**, **Client ID**, **Client Secret**
3. Update `.env.local` (dev) or Azure App Service config (prod):
   ```
   AZURE_AD_B2C_TENANT_ID=<your-tenant-id>
   AZURE_AD_B2C_CLIENT_ID=<your-client-id>
   AZURE_AD_B2C_CLIENT_SECRET=<your-secret>
   ```

---

## Step 4 — Verify the Core Loop

Once EHR is connected:

1. Open http://localhost:3001/compass — complete a patient assessment
2. Open http://localhost:3002/dashboard — patient should appear in queue
3. Click patient → order a lab → verify confirmation appears
4. Check terminal for domain events: `EmergencyProtocol`, `CriticalLabResult`

If the patient doesn't appear: confirm `BACKEND_API_URL=http://localhost:5080`
in `.env.local` and that the .NET backend is running (`npm run dev:backend`).

---

## Step 5 — Production Deployment

See `docs/STAGING_SETUP.md` for full Azure deployment steps.

Quick checklist before go-live:
- [ ] All `CHANGE_ME` values replaced in Azure App Service config
- [ ] `NEXTAUTH_SECRET` is a real random value (`openssl rand -base64 32`)
- [ ] `ENCRYPTION_KEY` is a real 32-byte hex key (`openssl rand -hex 32`)
- [ ] EHR redirect URIs updated to production hostname
- [ ] Azure AD B2C tenant configured
- [ ] `npm run test:smoke` passes against staging slot

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Dashboard empty after assessment | Backend not running | `npm run dev:backend` |
| FHIR auth redirect fails | Wrong redirect URI | Must match exactly what's registered in App Orchard/Cerner |
| `401 Unauthorized` on API | Auth bypass inactive | Confirm `NODE_ENV=development` in `.env.local` |
| SQL connection refused | Docker not running | `npm run db:up` |
| `NEXTAUTH_SECRET` error | Secret too short | Must be 32+ characters |
| EF migrations fail | SQL Server not ready | Wait 15s after `npm run db:up`, then retry |

---

## Related Docs

- Architecture: `docs/ARCHITECTURE.md`
- Current state: `docs/CURRENT_STATE.md`
- Staging setup: `docs/STAGING_SETUP.md`
- Operations runbook: `docs/OPERATIONS_RUNBOOK.md`
