# ATTENDING AI - Next Steps Action Plan

## ✅ COMPLETED - Do Now Tasks

### 1. Cleanup Script Created
Run from repository root:
```bash
scripts\cleanup.bat
```
This removes:
- `services/ai-service` (placeholder only)
- `apps/_legacy-prototypes` (archived HTML prototypes)

**Note:** The .NET backend was already removed.

### 2. Zod Validation Added ✅
Schemas created in `apps/shared/schemas/`:
- `lab-order.schema.ts` - Lab order validation
- `imaging-order.schema.ts` - Imaging order validation  
- `assessment.schema.ts` - Patient assessment validation
- `validation.ts` - Helper utilities
- `index.ts` - Barrel exports

API routes updated:
- `pages/api/labs/index.ts` - Now validates with `CreateLabOrderSchema`
- `pages/api/imaging/index.ts` - Now validates with `CreateImagingOrderSchema`

### 3. Health Check Endpoint Added ✅
- `pages/api/health.ts` - Returns database and memory status

---

## Week 1: Remaining Cleanup Tasks

### Run Cleanup Script
```bash
cd C:\Users\Scott\source\repos\La6kers\ATTENDING
scripts\cleanup.bat
```

### Install Zod Dependency
```bash
npm install
# or specifically:
npm install zod --workspace=apps/shared
```

### Day 3-4: Create Shared Packages

1. **Create packages directory structure:**
```bash
mkdir -p packages/shared/src/{types,schemas,constants}
mkdir -p packages/api-client/src
mkdir -p packages/clinical-stores/src
mkdir -p packages/ui-components/src
```

2. **Move shared types:**
```bash
# Copy existing types
cp apps/shared/types/*.ts packages/shared/src/types/
```

3. **Add package.json for each package:**
```json
// packages/shared/package.json
{
  "name": "@attending/shared",
  "version": "1.0.0",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "dependencies": {
    "zod": "^3.22.0"
  }
}
```

### Day 5: Add Zod Validation

Install Zod:
```bash
npm install zod --workspace=packages/shared
```

Create schemas in `packages/shared/src/schemas/`:
- lab-order.schema.ts
- imaging-order.schema.ts
- assessment.schema.ts
- patient.schema.ts

---

## Week 2: API Layer Improvements

### Add API Client Package
Copy the API client from the artifact to `packages/api-client/src/index.ts`

### Update API Routes with Validation
```typescript
// apps/provider-portal/pages/api/labs/index.ts
import { LabOrderSchema } from '@attending/shared/schemas';

async function createLabOrder(req, res, session) {
  const parseResult = LabOrderSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ 
      error: 'Validation failed',
      details: parseResult.error.flatten()
    });
  }
  // ... rest of handler
}
```

### Add Health Check Endpoint
```typescript
// apps/provider-portal/pages/api/health.ts
export default function handler(req, res) {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    database: 'connected', // Add actual DB check
  });
}
```

---

## Week 3: Store Consolidation

### Create Store Factory
Copy the store factory from the artifact to `packages/clinical-stores/src/createOrderingStore.ts`

### Refactor Existing Stores
```typescript
// apps/provider-portal/store/labOrderingStore.ts
import { createOrderingStore } from '@attending/clinical-stores';
import { LAB_CATALOG } from './catalogs/labs';
import { generateLabRecommendations } from './ai/lab-recommendations';

export const useLabOrderingStore = createOrderingStore({
  name: 'lab',
  catalog: LAB_CATALOG,
  generateRecommendations: generateLabRecommendations,
  // ... config
});
```

---

## Week 4: Testing Foundation

### Install Testing Dependencies
```bash
npm install -D vitest @testing-library/react @playwright/test
```

### Add Test Scripts to package.json
```json
{
  "scripts": {
    "test": "vitest",
    "test:e2e": "playwright test",
    "test:coverage": "vitest --coverage"
  }
}
```

### Create First Unit Tests
Focus on clinical logic:
- Lab recommendation generation
- Red flag detection
- Urgency scoring

---

## Month 2: Patient Portal & Infrastructure

### Complete Patient Portal
1. Move chat components from provider-portal
2. Implement patient authentication flow
3. Create patient-specific API routes
4. Add patient dashboard

### Add Caching Layer
```bash
npm install ioredis
```
- Cache lab/imaging catalogs
- Cache provider directory
- Session caching

### Add Background Job Processing
```bash
npm install bullmq
```
- AI recommendation generation
- Notification sending
- Audit log processing

---

## Month 3: Production Readiness

### Containerization
- Create Dockerfiles for each app
- Set up docker-compose for local dev
- Configure multi-stage builds

### CI/CD Pipeline
- GitHub Actions for testing
- Automated deployments
- Security scanning

### Monitoring
- Add Sentry for error tracking
- Prometheus metrics endpoint
- Health check monitoring

---

## Updated Workspace Configuration

Update root `package.json`:
```json
{
  "workspaces": [
    "apps/provider-portal",
    "apps/patient-portal",
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint"
  }
}
```

Install Turborepo for faster builds:
```bash
npm install -D turbo
```

Create `turbo.json`:
```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    }
  }
}
```

---

## Priority Matrix

| Task | Impact | Effort | Priority |
|------|--------|--------|----------|
| Delete broken backend | High | Low | P0 - Do Now |
| Add Zod validation | High | Medium | P0 - Do Now |
| Create API client | High | Medium | P1 - This Week |
| Store factory pattern | Medium | Medium | P1 - This Week |
| Patient portal completion | High | High | P2 - Next Week |
| Add unit tests | Medium | Medium | P2 - Next Week |
| Add E2E tests | Medium | High | P3 - Month 1 |
| Containerization | Medium | Medium | P3 - Month 1 |
| Production deployment | High | High | P4 - Month 2 |

---

## Success Metrics

After completing this plan:
- ✅ Single TypeScript codebase (no .NET)
- ✅ < 30% code duplication in stores
- ✅ 100% API validation coverage
- ✅ > 80% unit test coverage for clinical logic
- ✅ < 500ms API response times
- ✅ Automated CI/CD pipeline
- ✅ Production-ready Docker images
