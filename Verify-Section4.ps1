# ============================================================
# ATTENDING AI — Section 4 Core Loop Wiring Verification
# Run from: C:\Users\la6ke\Projects\ATTENDING
#
# Verifies all Phase 2 (Core Loop Wiring) files exist and
# are properly connected.
# ============================================================

$ErrorActionPreference = "Continue"
$root = "C:\Users\la6ke\Projects\ATTENDING"
$pass = 0
$fail = 0
$warn = 0

function Check-FileExists($path, $description) {
    if (Test-Path "$root\$path") {
        Write-Host "  [PASS] $description" -ForegroundColor Green
        $script:pass++
    } else {
        Write-Host "  [FAIL] $description — $path NOT FOUND" -ForegroundColor Red
        $script:fail++
    }
}

function Check-FileContains($path, $pattern, $description) {
    $fullPath = "$root\$path"
    if (Test-Path $fullPath) {
        $content = Get-Content $fullPath -Raw
        if ($content -match [regex]::Escape($pattern)) {
            Write-Host "  [PASS] $description" -ForegroundColor Green
            $script:pass++
        } else {
            Write-Host "  [FAIL] $description — pattern not found in $path" -ForegroundColor Red
            $script:fail++
        }
    } else {
        Write-Host "  [FAIL] $description — file not found: $path" -ForegroundColor Red
        $script:fail++
    }
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  ATTENDING AI — Section 4 Verification" -ForegroundColor Cyan
Write-Host "  Core Loop Wiring (Phase 2)" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# ── 1. Backend Proxy Utility ─────────────────────────────
Write-Host "1. Backend Proxy Utility" -ForegroundColor Yellow
Check-FileExists "apps\provider-portal\lib\api\backendProxy.ts" "backendProxy.ts exists"
Check-FileContains "apps\provider-portal\lib\api\backendProxy.ts" "backendFetch" "Exports backendFetch function"
Check-FileContains "apps\provider-portal\lib\api\backendProxy.ts" "proxyToBackend" "Exports proxyToBackend function"
Check-FileContains "apps\provider-portal\lib\api\backendProxy.ts" "isBackendAvailable" "Exports isBackendAvailable function"
Check-FileContains "apps\provider-portal\lib\api\backendProxy.ts" "BACKEND_PATH_MAP" "Has path mapping table"
Write-Host ""

# ── 2. Generic Backend Proxy Route ───────────────────────
Write-Host "2. Generic Backend Proxy Route" -ForegroundColor Yellow
Check-FileExists "apps\provider-portal\pages\api\backend\[...path].ts" "Catch-all proxy route exists"
Check-FileContains "apps\provider-portal\pages\api\backend\[...path].ts" "backendFetch" "Uses backendFetch"
Write-Host ""

# ── 3. Labs Page — Real Patient Context ──────────────────
Write-Host "3. Labs Page — URL Param Patient Loading" -ForegroundColor Yellow
Check-FileContains "apps\provider-portal\pages\labs.tsx" "fetchPatientContext" "Has fetchPatientContext function"
Check-FileContains "apps\provider-portal\pages\labs.tsx" "patientId" "Reads patientId from URL"
Check-FileContains "apps\provider-portal\pages\labs.tsx" "encounterId" "Reads encounterId from URL"
Check-FileContains "apps\provider-portal\pages\labs.tsx" "assessmentId" "Reads assessmentId from URL"
Write-Host ""

# ── 4. Assessment Detail → Order Labs Link ───────────────
Write-Host "4. Assessment Detail — Order Labs Action" -ForegroundColor Yellow
Check-FileContains "apps\provider-portal\pages\assessments\[id].tsx" "TestTube" "Imports TestTube icon"
Check-FileContains "apps\provider-portal\pages\assessments\[id].tsx" "Order Labs" "Has Order Labs button"
Check-FileContains "apps\provider-portal\pages\assessments\[id].tsx" "pathname: '/labs'" "Links to labs page with context"
Write-Host ""

# ── 5. Labs BFF → .NET Backend Proxy ─────────────────────
Write-Host "5. Labs BFF Route — .NET Backend Forwarding" -ForegroundColor Yellow
Check-FileContains "apps\provider-portal\pages\api\labs\index.ts" "proxyToBackend" "Has .NET backend proxy"
Check-FileContains "apps\provider-portal\pages\api\labs\index.ts" "/api/v1/laborders" "Routes to .NET lab orders endpoint"
Write-Host ""

# ── 6. Assessments BFF → .NET Backend Proxy ──────────────
Write-Host "6. Assessments BFF Route — .NET Backend Forwarding" -ForegroundColor Yellow
Check-FileContains "apps\provider-portal\pages\api\assessments\index.ts" "proxyToBackend" "Has .NET backend proxy"
Check-FileContains "apps\provider-portal\pages\api\assessments\index.ts" "/api/v1/assessments" "Routes to .NET assessments endpoint"
Write-Host ""

# ── 7. Dashboard — Real Data Wiring ──────────────────────
Write-Host "7. Dashboard — Real Assessment Data" -ForegroundColor Yellow
Check-FileContains "apps\provider-portal\pages\dashboard.tsx" "fetch('/api/assessments" "Fetches real assessment data"
Check-FileContains "apps\provider-portal\pages\dashboard.tsx" "setPatientQueue" "Builds patient queue from real data"
Write-Host ""

# ── 8. Patient Portal — Assessment Submission ────────────
Write-Host "8. Patient Portal — Assessment Submission" -ForegroundColor Yellow
Check-FileExists "apps\patient-portal\pages\api\assessments\submit.ts" "Assessment submit endpoint exists"
Check-FileContains "apps\patient-portal\pages\api\assessments\submit.ts" "prisma.patientAssessment.create" "Saves to database"
Check-FileContains "apps\patient-portal\pages\api\assessments\submit.ts" "prisma.auditLog.create" "Creates audit trail"
Write-Host ""

# ── 9. Lab Store — Order Submission ──────────────────────
Write-Host "9. Lab Ordering Store — Order Submission" -ForegroundColor Yellow
Check-FileContains "apps\provider-portal\store\labOrderingStore.ts" "patientId: get().patientContext" "Sends real patientId"
Check-FileContains "apps\provider-portal\store\labOrderingStore.ts" "encounterId" "Sends encounterId"
Check-FileContains "apps\provider-portal\store\labOrderingStore.ts" "fetch('/api/labs'" "Submits to BFF API"
Write-Host ""

# ── Summary ──────────────────────────────────────────────
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Results: $pass passed, $fail failed, $warn warnings" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Red" })
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

if ($fail -eq 0) {
    Write-Host "  Core Loop Wiring: COMPLETE" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Data Flow:" -ForegroundColor White
    Write-Host "    Patient Portal → /api/assessments/submit → DB (Prisma)" -ForegroundColor Gray
    Write-Host "    Provider Dashboard → /api/assessments → Real queue" -ForegroundColor Gray
    Write-Host "    Assessment Detail → Order Labs → /labs?patientId=..." -ForegroundColor Gray
    Write-Host "    Labs Page → /api/labs → .NET backend (or Prisma fallback)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  .NET Backend Integration:" -ForegroundColor White
    Write-Host "    When .NET API is running: BFF routes proxy to .NET" -ForegroundColor Gray
    Write-Host "    When .NET API is down: BFF routes use Prisma directly" -ForegroundColor Gray
    Write-Host "    Generic proxy: /api/backend/* → .NET /api/*" -ForegroundColor Gray
} else {
    Write-Host "  $fail checks failed — review output above" -ForegroundColor Red
}
Write-Host ""
