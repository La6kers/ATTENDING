# ATTENDING AI — Master Test & Git Command Reference
# docs/TESTING_COMMANDS.md
#
# Every command needed to test and push the platform.
# Run from: C:\Users\Scott\ATTENDING
# Branch:   mockup-2

---

## QUICK START — Run everything in order

```powershell
# 1. Verify you're on the right branch
cd C:\Users\Scott\ATTENDING
git branch            # must show * mockup-2
git status            # should be clean

# 2. Start Docker (SQL Server + Redis)
docker-compose up -d

# 3. Start the .NET API (new terminal)
cd C:\Users\Scott\ATTENDING\backend
dotnet run --project src/ATTENDING.Orders.Api
# API available at: http://localhost:5080
# Swagger UI at:   http://localhost:5080/swagger

# 4. Run the full test suite (new terminal)
cd C:\Users\Scott\ATTENDING
# See sections below for each layer
```

---

## LAYER 1 — Unit Tests (no Docker needed, ~2 min)

```powershell
cd C:\Users\Scott\ATTENDING\backend

# Run all unit/integration tests (excludes Docker/Testcontainers)
dotnet test --filter "Category!=Docker" --verbosity normal

# With coverage report
dotnet test --filter "Category!=Docker" `
  --collect:"XPlat Code Coverage" `
  --results-directory ./TestResults

# Generate HTML coverage report
dotnet tool install -g dotnet-reportgenerator-globaltool   # first time only
reportgenerator `
  -reports:"TestResults/**/coverage.cobertura.xml" `
  -targetdir:"coverage-report" `
  -reporttypes:Html
# Open: backend\coverage-report\index.html

# Run a specific test file
dotnet test --filter "FullyQualifiedName~RedFlagEvaluatorTests" --verbosity detailed
dotnet test --filter "FullyQualifiedName~SecurityRegressionTests" --verbosity detailed
dotnet test --filter "FullyQualifiedName~DrugInteractionServiceTests" --verbosity detailed
dotnet test --filter "FullyQualifiedName~MultiTenantIsolationTests" --verbosity detailed
```

---

## LAYER 2 — Integration Tests (Docker required, ~5 min)

```powershell
# Docker Desktop must be running first
docker ps    # verify Docker is up

cd C:\Users\Scott\ATTENDING\backend

# Real SQL Server via Testcontainers
dotnet test --filter "Category=Docker" --verbosity normal

# All tests (unit + integration)
dotnet test --verbosity normal

# Specific integration test
dotnet test --filter "FullyQualifiedName~E2EClinicalWorkflowTests" --verbosity detailed
dotnet test --filter "FullyQualifiedName~AuditTrailTests" --verbosity detailed
```

---

## LAYER 3 — Playwright E2E Tests (~3 min)

```powershell
cd C:\Users\Scott\ATTENDING

# Prerequisites: API + portals must be running
# Terminal 1: docker-compose up -d
# Terminal 2: cd backend && dotnet run --project src/ATTENDING.Orders.Api
# Terminal 3: npm run dev   (or individual portals)

# Install browsers (first time only)
npx playwright install chromium

# Run all E2E tests
npx playwright test --project=chromium

# Run with visible browser (good for debugging)
npx playwright test --headed --project=chromium

# Run a single test file
npx playwright test tests/e2e/core-loop.spec.ts --headed

# Interactive UI mode (best for development)
npx playwright test --ui

# View last report
npx playwright show-report
```

---

## LAYER 4 — Load Tests with k6

```powershell
# Install k6 (once):
winget install k6 --source winget
# OR: choco install k6

# Set your target (local or staging):
$env:BASE_URL = "http://localhost:5080"
# $env:BASE_URL = "https://attending-staging-api.azurewebsites.net"

cd C:\Users\Scott\ATTENDING

# Step 1: Smoke test (5 VUs, 1 min) — always run first
k6 run tests/load/smoke-backend.js
k6 run -e BASE_URL=$env:BASE_URL tests/load/smoke-backend.js

# Step 2: Clinical workflow (50 VUs, 5 min) — most important
k6 run tests/load/clinical-backend.js
k6 run -e BASE_URL=$env:BASE_URL tests/load/clinical-backend.js

# Step 3: Full COMPASS loop with emergency scenarios
k6 run tests/load/compass-full-loop.js
k6 run -e BASE_URL=$env:BASE_URL -e ORG_SLUG=dev-clinic tests/load/compass-full-loop.js

# Step 4: Sustained endurance (100 VUs, 30 min) — memory leak detection
k6 run tests/load/sustained.js
k6 run -e BASE_URL=$env:BASE_URL tests/load/sustained.js

# Step 5: Spike test (0→150 VUs burst)
k6 run tests/load/spike.js
k6 run -e BASE_URL=$env:BASE_URL tests/load/spike.js
```

---

## LAYER 5 — Chaos Tests (local Docker only)

```powershell
# Run with API + k6 clinical test running simultaneously

# Chaos Test 1: Kill the database mid-load
# Terminal 1: k6 run tests/load/clinical-backend.js
# Terminal 2 (after 60s):
docker ps                                    # find SQL Server container name
docker stop attending_sqlserver_1            # (adjust name to match your docker ps output)
# Watch k6 — error rate should spike then API returns 503 (not 500)
# Watch Seq at http://localhost:5341 — circuit breaker should log "opened"
Start-Sleep 60
docker start attending_sqlserver_1           # restart DB
# Watch k6 — error rate should drop back to ~0% within 60s automatically

# Chaos Test 2: Kill Redis mid-load
docker stop attending_redis_1
# Expected: clinical workflows continue, real-time notifications pause
# Expected: NO unhandled exceptions, NO 500 errors
docker start attending_redis_1
# SignalR auto-reconnects within ~30 seconds

# Chaos Test 3: Concurrent submissions race condition
k6 run --vus 20 --duration 30s -e BASE_URL=http://localhost:5080 - << 'EOF'
import http from 'k6/http';
import { check } from 'k6';
export default function() {
  const r = http.post('http://localhost:5080/api/v1/assessments/submit',
    JSON.stringify({chiefComplaint:'race condition test',organization_slug:'dev-clinic'}),
    {headers:{'Content-Type':'application/json','X-Organization-Slug':'dev-clinic'}}
  );
  check(r, {'no 500s': x => x.status !== 500});
}
EOF
# Then verify no duplicate MRNs in SQL Server:
# SELECT MRN, COUNT(*) FROM Patients GROUP BY MRN HAVING COUNT(*) > 1
# Expected: 0 rows
```

---

## LAYER 6 — Security Tests

```powershell
cd C:\Users\Scott\ATTENDING

# Security boundary test (auth, PHI, rate limiting, headers)
node tests/security/auth-boundary.mjs
node tests/security/auth-boundary.mjs --url https://attending-staging-api.azurewebsites.net

# OWASP ZAP scan (Docker required)
docker pull zaproxy/zap-stable

# Baseline scan (~5 min)
docker run -t zaproxy/zap-stable zap-baseline.py `
  -t http://host.docker.internal:5080 `
  -r zap-baseline-report.html -I

# Full scan (~30-60 min, more thorough)
docker run -t zaproxy/zap-stable zap-full-scan.py `
  -t http://host.docker.internal:5080 `
  -r zap-full-report.html

# Open report:
Start-Process zap-baseline-report.html
```

---

## LAYER 7 — Clinical Accuracy Tests

```powershell
cd C:\Users\Scott\ATTENDING

# Red flag accuracy (API must be running)
node tests/clinical/red-flag-accuracy.mjs
node tests/clinical/red-flag-accuracy.mjs --url https://attending-staging-api.azurewebsites.net

# Pre-pilot acceptance checklist (run before EVERY pilot deployment)
.\tests\clinical\pre-pilot-acceptance.ps1
.\tests\clinical\pre-pilot-acceptance.ps1 -ApiUrl https://attending-staging-api.azurewebsites.net -Token "your-staging-token"
```

---

## GIT — Committing Test Files

```powershell
cd C:\Users\Scott\ATTENDING
git checkout mockup-2
git status

# Stage all new test files
git add tests/load/sustained.js
git add tests/load/spike.js
git add tests/load/compass-full-loop.js
git add tests/clinical/red-flag-accuracy.mjs
git add tests/clinical/pre-pilot-acceptance.ps1
git add tests/security/auth-boundary.mjs
git add docs/PERFORMANCE_BASELINE.md
git add docs/TESTING_COMMANDS.md

# Commit
git commit -m "test: add complete testing suite -- load, chaos, clinical accuracy, security"

# Push to remote
git push origin mockup-2
```

---

## GIT — Standard Workflow

```powershell
cd C:\Users\Scott\ATTENDING

# Before starting any work
git checkout mockup-2
git pull origin mockup-2
git status

# After making changes
git add .                                          # or: git add <specific files>
git status                                         # review what's staged
git commit -m "type: description of change"
git push origin mockup-2

# Commit message types:
# feat:     new feature
# fix:      bug fix
# test:     adding or updating tests
# docs:     documentation only
# ci:       CI/CD pipeline changes
# infra:    infrastructure (Azure, Docker, Terraform)
# config:   configuration changes
# refactor: code restructure without behavior change
# chore:    maintenance (remove scratch files, update .gitignore)

# View recent commits
git log --oneline -15

# Check what changed vs remote
git diff origin/mockup-2..HEAD --name-only
```

---

## GIT — Remove Scratch Files (one-time cleanup)

```powershell
cd C:\Users\Scott\ATTENDING

# Remove the scratch file at repo root (safe to delete)
git rm "e 1 - Production Fundamentals"
git commit -m "chore: remove scratch file from repo root"

# Check for accidentally committed .env files
git log --all --full-history -- "**/.env.local"
git log --all --full-history -- ".env"
# If anything appears, rotate those credentials immediately
# then contact for purge instructions

# Remove test result artifacts from tracking
git rm --cached backend/test-results*.txt 2>$null
git rm --cached test-results.txt 2>$null
git commit -m "chore: untrack build artifacts"
git push origin mockup-2
```

---

## FULL PRE-DEPLOYMENT CHECKLIST

Run these in order before any deployment touching real patient data:

```powershell
cd C:\Users\Scott\ATTENDING

# 1. Ensure clean branch
git status                                     # must be clean
git checkout mockup-2
git pull origin mockup-2

# 2. Unit + integration tests
cd backend
dotnet test --filter "Category!=Docker"        # must be 0 failures
dotnet test --filter "Category=Docker"         # must be 0 failures
cd ..

# 3. E2E tests
npx playwright test --project=chromium         # must be 0 failures

# 4. Security boundary
node tests/security/auth-boundary.mjs          # must be 0 failures

# 5. Clinical accuracy
node tests/clinical/red-flag-accuracy.mjs      # must be 0 failures, 10/10 emergencies detected

# 6. Load test (smoke minimum, full suite preferred)
k6 run tests/load/smoke-backend.js             # must pass SLA gates

# 7. Pre-pilot acceptance
.\tests\clinical\pre-pilot-acceptance.ps1      # must show VERDICT: ALL CHECKS PASSED

# 8. Push if all pass
git push origin mockup-2
```

---

## USEFUL SHORTCUTS

```powershell
# Check what's running on the API port
netstat -ano | findstr :5080

# View live API logs in Seq
Start-Process "http://localhost:5341"

# View distributed traces in Jaeger
Start-Process "http://localhost:16686"

# View Swagger UI
Start-Process "http://localhost:5080/swagger"

# Docker status
docker ps
docker-compose logs -f attending-api    # live API container logs

# Check git remote
git remote -v                           # should show your GitHub repo

# Hard reset to match remote (CAUTION: loses local changes)
git fetch origin
git reset --hard origin/mockup-2
```
