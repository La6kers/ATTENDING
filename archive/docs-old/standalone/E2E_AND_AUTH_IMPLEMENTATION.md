# E2E Flow & Authentication Implementation - January 2026

## Summary

This document outlines the implementation of the end-to-end (E2E) assessment flow and authentication system for the ATTENDING AI platform.

---

## Part 1: E2E Flow Fixes

### Issue
The patient portal (COMPASS) was unable to submit assessments to the provider portal because:
1. The API URL was pointing to the wrong port (localhost:3000 instead of localhost:3002)
2. The patient portal didn't have direct database access

### Solution
Updated the patient portal to write directly to the database using Prisma, eliminating the need for cross-portal API calls.

### Files Changed

| File | Change |
|------|--------|
| `apps/patient-portal/pages/api/assessments/submit.ts` | Rewrote to use Prisma directly, create patient records, generate differential diagnoses, and notify WebSocket server |
| `apps/patient-portal/lib/prisma.ts` | Added Prisma client re-export from shared |
| `apps/patient-portal/.env.local` | Added DATABASE_URL and WebSocket configuration |

### E2E Flow (Now Working)

```
1. Patient opens COMPASS (localhost:3001)
           ↓
2. Patient completes symptom assessment
           ↓
3. Assessment saved to PostgreSQL database
           ↓
4. WebSocket server notified (localhost:3003)
           ↓
5. Provider portal receives real-time notification
           ↓
6. Provider sees assessment in queue (localhost:3002)
           ↓
7. Provider reviews and completes assessment
```

---

## Part 2: Authentication Implementation

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    @attending/shared/auth                    │
├─────────────────────────────────────────────────────────────┤
│  config.ts        - NextAuth configuration factory          │
│  middleware.ts    - API route protection (withAuth, etc.)   │
│  useAuth.ts       - React hook for auth state               │
│  index.ts         - Centralized exports                     │
└─────────────────────────────────────────────────────────────┘
           │                              │
           ▼                              ▼
┌─────────────────────┐     ┌─────────────────────┐
│   Provider Portal   │     │   Patient Portal    │
│   (Staff Auth)      │     │   (Patient Auth)    │
├─────────────────────┤     ├─────────────────────┤
│ - Credentials       │     │ - Credentials       │
│ - Azure AD B2C*     │     │ - Guest/Anonymous   │
│ - Role: PROVIDER,   │     │ - Azure AD B2C*     │
│   NURSE, ADMIN,     │     │ - Role: PATIENT     │
│   STAFF             │     │                     │
└─────────────────────┘     └─────────────────────┘
                    
* Azure AD B2C ready but commented out until configured
```

### Files Created

**Shared Auth Package (`apps/shared/auth/`)**

| File | Purpose |
|------|---------|
| `config.ts` | NextAuth configuration for both portals, dev users, Azure AD B2C setup (ready) |
| `middleware.ts` | `withAuth`, `withRole`, `withProvider`, `withPatient`, `withAuditLog` |
| `useAuth.ts` | React hook: `useAuth()` with login/logout/role checking |
| `index.ts` | Centralized exports |

**Provider Portal**

| File | Purpose |
|------|---------|
| `pages/api/auth/[...nextauth].ts` | NextAuth API route |
| `pages/auth/signin.tsx` | Custom sign-in page with dev quick login |
| `pages/_app.tsx` | Updated with SessionProvider and auth checking |

**Patient Portal**

| File | Purpose |
|------|---------|
| `pages/api/auth/[...nextauth].ts` | NextAuth API route (patient-specific) |
| `pages/_app.tsx` | Updated with SessionProvider |

### Development Mode

In development, authentication is bypassed via the `DEV_BYPASS_AUTH=true` environment variable:

- Provider Portal: Auto-authenticated as "Dr. Sarah Chen (Dev)"
- Patient Portal: Allows anonymous/guest access for COMPASS

**Dev Users (password: "password"):**

| Email | Role | Portal |
|-------|------|--------|
| provider@attending.dev | PROVIDER | Provider |
| nurse@attending.dev | NURSE | Provider |
| admin@attending.dev | ADMIN | Provider |
| patient@attending.dev | PATIENT | Patient |

### Usage Examples

**API Route Protection:**
```typescript
// Require any authenticated user
import { withAuth } from '@attending/shared/auth';
import { authOptions } from './api/auth/[...nextauth]';

export default withAuth(async (req, res) => {
  // req.user is guaranteed to exist
  console.log(req.user.name, req.user.role);
}, authOptions);

// Require specific role
import { withRole } from '@attending/shared/auth';

export default withRole(['PROVIDER', 'ADMIN'], async (req, res) => {
  // Only providers and admins
}, authOptions);
```

**React Component:**
```typescript
import { useAuth } from '@attending/shared/auth';

function MyComponent() {
  const { user, isLoading, isAuthenticated, login, logout, hasRole } = useAuth();
  
  if (isLoading) return <Spinner />;
  if (!isAuthenticated) return <button onClick={() => login()}>Sign In</button>;
  
  return (
    <div>
      <p>Hello, {user.name}!</p>
      {hasRole(['PROVIDER', 'ADMIN']) && <AdminPanel />}
      <button onClick={() => logout()}>Sign Out</button>
    </div>
  );
}
```

---

## Environment Variables

### Provider Portal (.env.local)
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/attending_dev"
NEXTAUTH_SECRET="dev-secret-change-in-production-abc123"
NEXTAUTH_URL="http://localhost:3002"
NEXT_PUBLIC_WS_URL="http://localhost:3003"
DEV_BYPASS_AUTH="true"
NEXT_PUBLIC_DEV_BYPASS_AUTH="true"
```

### Patient Portal (.env.local)
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/attending_dev"
NEXTAUTH_SECRET="dev-secret-change-in-production-abc123"
NEXTAUTH_URL="http://localhost:3001"
NEXT_PUBLIC_WS_URL="http://localhost:3003"
WEBSOCKET_URL="http://localhost:3003"
DEV_BYPASS_AUTH="true"
```

---

## Dependencies Added

Both portals now include:
```json
{
  "dependencies": {
    "@prisma/client": "^5.0.0",
    "next-auth": "^4.24.5"
  }
}
```

---

## Running the Application

```bash
# 1. Install dependencies
cd C:\Users\Scott\source\repos\La6kers\ATTENDING
npm install

# 2. Generate Prisma client
npm run db:generate

# 3. Push schema to database (create tables)
npm run db:push

# 4. Seed database with test data (optional)
npm run db:seed

# 5. Start all services
npm run dev:all

# Or start individually:
npm run dev:provider    # Provider portal on localhost:3002
npm run dev:patient     # Patient portal on localhost:3001
npm run dev:ws          # WebSocket server on localhost:3003
```

---

## Testing the E2E Flow

1. **Open Patient Portal**: http://localhost:3001
2. **Click "Start Chat"** or navigate to /chat
3. **Complete the COMPASS assessment** (answer the questions)
4. **Submit the assessment**
5. **Open Provider Portal**: http://localhost:3002
6. **View the assessment** in the queue (should appear in real-time via WebSocket)
7. **Review and complete** the assessment

---

## Next Steps

1. **Configure Azure AD B2C** - Uncomment and configure in `apps/shared/auth/config.ts`
2. **Add protected API routes** - Apply `withAuth`/`withRole` middleware to existing routes
3. **Add E2E tests** - Test the full flow with Playwright
4. **Production secrets** - Change NEXTAUTH_SECRET for production

---

## Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                         ATTENDING AI Platform                          │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   ┌──────────────────┐         ┌──────────────────┐                   │
│   │  Patient Portal  │         │ Provider Portal  │                   │
│   │   (COMPASS)      │         │                  │                   │
│   │   localhost:3001 │         │  localhost:3002  │                   │
│   │                  │         │                  │                   │
│   │  - Chat UI       │         │  - Dashboard     │                   │
│   │  - Assessment    │         │  - Queue         │                   │
│   │  - Submit        │         │  - Review        │                   │
│   └────────┬─────────┘         └────────┬─────────┘                   │
│            │                            │                              │
│            │         ┌──────────────────┤                              │
│            │         │                  │                              │
│            ▼         ▼                  ▼                              │
│   ┌──────────────────────────────────────────────┐                    │
│   │              PostgreSQL Database              │                    │
│   │              (via Prisma ORM)                 │                    │
│   │                                               │                    │
│   │  - Patients, Assessments, Users              │                    │
│   │  - Orders, Notifications, Audit Logs         │                    │
│   └──────────────────────────────────────────────┘                    │
│                          │                                             │
│            ┌─────────────┴─────────────┐                              │
│            │                           │                              │
│            ▼                           ▼                              │
│   ┌──────────────────┐       ┌──────────────────┐                     │
│   │ WebSocket Server │◄─────►│ @attending/shared │                    │
│   │  localhost:3003  │       │                  │                     │
│   │                  │       │  - Types         │                     │
│   │  - Real-time     │       │  - Auth          │                     │
│   │  - Notifications │       │  - Hooks         │                     │
│   │  - Presence      │       │  - Components    │                     │
│   └──────────────────┘       └──────────────────┘                     │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```
