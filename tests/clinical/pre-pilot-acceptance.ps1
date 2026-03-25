# ATTENDING AI — Pre-Pilot Acceptance Test
# tests/clinical/pre-pilot-acceptance.ps1
#
# Run this script before ANY deployment that will touch real patient data.
# ALL checks must pass before go-live.
#
# Usage:
#   .\tests\clinical\pre-pilot-acceptance.ps1
#   .\tests\clinical\pre-pilot-acceptance.ps1 -ApiUrl https://attending-staging-api.azurewebsites.net
#   .\tests\clinical\pre-pilot-acceptance.ps1 -ApiUrl http://localhost:5080 -Token "dev-bypass-token"

param(
    [string]$ApiUrl = "http://localhost:5080",
    [string]$Token  = "dev-bypass-token"
)

$ErrorActionPreference = "Continue"
$errors   = 0
$warnings = 0
$passed   = 0

function Write-Header([string]$text) {
    Write-Host ""
    Write-Host "── $text " -ForegroundColor Cyan
}

function Test-Get([string]$name, [string]$path, [int]$expectedStatus = 200, [bool]$requiresAuth = $false) {
    $headers = @{ "Accept" = "application/json" }
    if ($requiresAuth) { $headers["Authorization"] = "Bearer $Token" }
    try {
        $r = Invoke-WebRequest -Uri "$ApiUrl$path" -Headers $headers -SkipHttpErrorCheck -TimeoutSec 15 -ErrorAction Stop
        if ($r.StatusCode -eq $expectedStatus) {
            Write-Host "  ✓ PASS  $name" -ForegroundColor Green
            $script:passed++
        } else {
            Write-Host "  ✗ FAIL  $name  (got $($r.StatusCode), expected $expectedStatus)" -ForegroundColor Red
            $script:errors++
        }
    } catch {
        Write-Host "  ✗ ERROR $name  ($($_.Exception.Message))" -ForegroundColor Red
        $script:errors++
    }
}

function Test-Post([string]$name, [string]$path, [string]$body, [int]$expectedStatus = 200, [bool]$requiresAuth = $false) {
    $headers = @{ "Content-Type" = "application/json"; "X-Organization-Slug" = "dev-clinic" }
    if ($requiresAuth) { $headers["Authorization"] = "Bearer $Token" }
    try {
        $r = Invoke-WebRequest -Uri "$ApiUrl$path" -Method POST -Body $body -Headers $headers -SkipHttpErrorCheck -TimeoutSec 15 -ErrorAction Stop
        if ($r.StatusCode -eq $expectedStatus) {
            Write-Host "  ✓ PASS  $name" -ForegroundColor Green
            $script:passed++
            return $r.Content
        } else {
            Write-Host "  ✗ FAIL  $name  (got $($r.StatusCode), expected $expectedStatus)" -ForegroundColor Red
            $script:errors++
        }
    } catch {
        Write-Host "  ✗ ERROR $name  ($($_.Exception.Message))" -ForegroundColor Red
        $script:errors++
    }
}

# ─────────────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "============================================================" -ForegroundColor White
Write-Host "  ATTENDING AI — Pre-Pilot Acceptance Test" -ForegroundColor White
Write-Host "  Target: $ApiUrl" -ForegroundColor Gray
Write-Host "============================================================" -ForegroundColor White

# ── Infrastructure ────────────────────────────────────────────────────────────
Write-Header "Infrastructure"
Test-Get "API liveness"            "/health/live"
Test-Get "API readiness (DB+Redis)" "/health/ready"
Test-Get "System ping"             "/api/v1/system/ping"
Test-Get "FHIR status"             "/api/v1/system/fhir-status" -requiresAuth $true

# ── Authentication gates ──────────────────────────────────────────────────────
Write-Header "Authentication"
Test-Get "Reject no token"         "/api/v1/assessments" -expectedStatus 401 -requiresAuth $false
$headers = @{ Authorization = "Bearer totally-fake-invalid-token"; Accept = "application/json" }
try {
    $r = Invoke-WebRequest -Uri "$ApiUrl/api/v1/assessments" -Headers $headers -SkipHttpErrorCheck -TimeoutSec 10
    if ($r.StatusCode -eq 401) { Write-Host "  ✓ PASS  Reject fake token" -ForegroundColor Green; $passed++ }
    else { Write-Host "  ✗ FAIL  Fake token accepted (got $($r.StatusCode))" -ForegroundColor Red; $errors++ }
} catch { Write-Host "  ✗ ERROR Reject fake token test" -ForegroundColor Red; $errors++ }

# ── Clinical workflows ────────────────────────────────────────────────────────
Write-Header "Clinical Workflows"

$standardPayload = '{"chiefComplaint":"pre-pilot acceptance test - standard","organization_slug":"dev-clinic","dateOfBirth":"1975-06-15","gender":"unknown"}'
Test-Post "Submit standard assessment"   "/api/v1/assessments/submit" $standardPayload -expectedStatus 201

$emergencyPayload = '{"chiefComplaint":"crushing chest pain radiating to left arm","organization_slug":"dev-clinic","dateOfBirth":"1975-06-15","gender":"unknown","hpi":{"severity":9}}'
$emergencyResult = Test-Post "Submit emergency assessment" "/api/v1/assessments/submit" $emergencyPayload -expectedStatus 201
if ($emergencyResult) {
    try {
        $body = $emergencyResult | ConvertFrom-Json
        if ($body.urgentAlert -eq $true) {
            Write-Host "  ✓ PASS  Emergency correctly flagged as urgent" -ForegroundColor Green
            $passed++
        } else {
            Write-Host "  ✗ FAIL  Emergency NOT flagged as urgent — red flag detection broken" -ForegroundColor Red
            $errors++
        }
    } catch { Write-Host "  ⚠ WARN  Could not parse emergency response body" -ForegroundColor Yellow; $warnings++ }
}

Test-Get "Provider pending queue"    "/api/v1/assessments/pending-review" -requiresAuth $true
Test-Get "Red flags queue"           "/api/v1/assessments/red-flags"      -requiresAuth $true
Test-Get "Critical lab results"      "/api/v1/laborders/critical"         -requiresAuth $true

# ── Security headers ──────────────────────────────────────────────────────────
Write-Header "Security Headers"
try {
    $r = Invoke-WebRequest -Uri "$ApiUrl/health/live" -TimeoutSec 10 -ErrorAction Stop
    $requiredHeaders = @("X-Frame-Options", "X-Content-Type-Options", "Strict-Transport-Security", "X-Correlation-ID")
    foreach ($h in $requiredHeaders) {
        if ($r.Headers[$h]) {
            Write-Host "  ✓ PASS  $h present" -ForegroundColor Green
            $passed++
        } else {
            if ($h -eq "Strict-Transport-Security" -and $ApiUrl.StartsWith("http://")) {
                Write-Host "  ⚠ WARN  $h absent (expected on HTTP, required on HTTPS)" -ForegroundColor Yellow
                $warnings++
            } else {
                Write-Host "  ✗ FAIL  $h missing" -ForegroundColor Red
                $errors++
            }
        }
    }
} catch { Write-Host "  ✗ ERROR Could not check security headers" -ForegroundColor Red; $errors++ }

# ── PHI not in error responses ────────────────────────────────────────────────
Write-Header "PHI Safety"
$badPayload = '{"chiefComplaint":"","organization_slug":"dev-clinic","patientName":"PHI_MARKER_DO_NOT_LOG"}'
try {
    $r = Invoke-WebRequest -Uri "$ApiUrl/api/v1/assessments/submit" -Method POST -Body $badPayload `
         -Headers @{"Content-Type"="application/json";"X-Organization-Slug"="dev-clinic"} `
         -SkipHttpErrorCheck -TimeoutSec 10
    if ($r.Content -match "PHI_MARKER_DO_NOT_LOG") {
        Write-Host "  ✗ FAIL  PHI marker visible in error response" -ForegroundColor Red
        $errors++
    } else {
        Write-Host "  ✓ PASS  PHI not reflected in error response" -ForegroundColor Green
        $passed++
    }
} catch { Write-Host "  ⚠ WARN  Could not test PHI safety" -ForegroundColor Yellow; $warnings++ }

# ── Summary ───────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "============================================================" -ForegroundColor White
Write-Host "  Results: $passed passed  |  $warnings warnings  |  $errors FAILED" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor White

if ($errors -gt 0) {
    Write-Host ""
    Write-Host "  VERDICT: DO NOT PROCEED TO PILOT" -ForegroundColor Red
    Write-Host "  Resolve all FAIL items before touching real patient data." -ForegroundColor Red
    exit 1
} elseif ($warnings -gt 0) {
    Write-Host ""
    Write-Host "  VERDICT: CONDITIONAL PASS — review warnings before go-live." -ForegroundColor Yellow
    exit 0
} else {
    Write-Host ""
    Write-Host "  VERDICT: ALL CHECKS PASSED — safe to proceed." -ForegroundColor Green
    exit 0
}
