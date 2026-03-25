$ErrorActionPreference = "Continue"
$root = "C:\Users\la6ke\Projects\ATTENDING"
$backend = "$root\backend\src"
$tests = "$root\backend\tests"
$pass = 0; $fail = 0; $warn = 0

function Write-Check($msg) { Write-Host "  [CHECK] $msg" -ForegroundColor Cyan }
function Write-Pass($msg)  { $script:pass++; Write-Host "  [PASS]  $msg" -ForegroundColor Green }
function Write-Fail($msg)  { $script:fail++; Write-Host "  [FAIL]  $msg" -ForegroundColor Red }
function Write-Warn($msg)  { $script:warn++; Write-Host "  [WARN]  $msg" -ForegroundColor Yellow }

Write-Host "`n============================================================" -ForegroundColor White
Write-Host " ATTENDING AI - Section 1 Verification" -ForegroundColor White
Write-Host " $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host "============================================================" -ForegroundColor White

# --- 1.1 MULTI-TENANT ---
Write-Host "`n--- 1.1 Multi-Tenant Isolation ---" -ForegroundColor Yellow

$base = Get-Content "$backend\ATTENDING.Domain\Entities\BaseEntities.cs" -Raw
if ($base -match 'public Guid OrganizationId') { Write-Pass "OrganizationId on BaseEntity" } else { Write-Fail "OrganizationId NOT on BaseEntity" }
if ($base -match 'public void SetOrganization') { Write-Pass "SetOrganization() method" } else { Write-Fail "SetOrganization() missing" }

$repos = Get-Content "$backend\ATTENDING.Domain\Interfaces\Repositories.cs" -Raw
if ($repos -match 'Guid\? TenantId') { Write-Pass "TenantId on ICurrentUserService" } else { Write-Fail "TenantId missing" }

$cus = Get-Content "$backend\ATTENDING.Orders.Api\Services\CurrentUserService.cs" -Raw
if ($cus -match 'tenant_id') { Write-Pass "CurrentUserService reads tenant_id" } else { Write-Fail "tenant_id not read" }

$ctx = Get-Content "$backend\ATTENDING.Infrastructure\Data\AttendingDbContext.cs" -Raw
if ($ctx -match 'OrganizationId == _tenantId') { Write-Pass "Tenant query filters in DbContext" } else { Write-Fail "Tenant filters missing" }
if ($ctx -match 'ICurrentUserService') { Write-Pass "DbContext accepts ICurrentUserService" } else { Write-Fail "DbContext missing ICurrentUserService" }
$fc = ([regex]::Matches($ctx, 'OrganizationId == _tenantId')).Count
if ($fc -ge 14) { Write-Pass "Tenant filter on $fc entities (need 14)" } else { Write-Warn "Only $fc entities filtered (need 14)" }
if ($ctx -match 'IX_.*_OrganizationId') { Write-Pass "OrganizationId indexes in DbContext" } else { Write-Warn "OrganizationId indexes not found" }

$int = Get-Content "$backend\ATTENDING.Infrastructure\Data\AuditSaveChangesInterceptor.cs" -Raw
if ($int -match 'SetOrganization') { Write-Pass "Interceptor auto-sets OrganizationId" } else { Write-Fail "Interceptor missing SetOrganization" }

$mp = "$backend\ATTENDING.Infrastructure\Migrations\20260224180000_AddMultiTenantIsolation.cs"
if (Test-Path $mp) {
    Write-Pass "Migration file exists"
    $mig = Get-Content $mp -Raw
    $tables = @("Users","Patients","Encounters","Allergies","MedicalConditions","LabOrders","LabResults","ImagingOrders","ImagingResults","MedicationOrders","Referrals","Assessments","AssessmentSymptoms","AssessmentResponses","AiFeedback")
    $covered = ($tables | Where-Object { $mig -match "`"$_`"" }).Count
    if ($covered -ge 13) { Write-Pass "Migration covers $covered/$($tables.Count) tables" } else { Write-Warn "Migration covers only $covered/$($tables.Count) tables" }
} else { Write-Fail "Migration file missing" }

$pg = Get-Content "$backend\ATTENDING.Orders.Api\Program.cs" -Raw
if ($pg -match '"tenant_id"') { Write-Pass "DevAuthHandler has tenant_id" } else { Write-Fail "DevAuthHandler missing tenant_id" }

$fa = Get-Content "$tests\ATTENDING.Integration.Tests\Fixtures\AttendingWebApplicationFactory.cs" -Raw
if ($fa -match '"tenant_id"') { Write-Pass "TestAuthHandler has tenant_id" } else { Write-Fail "TestAuthHandler missing tenant_id" }

$fx = Get-Content "$tests\ATTENDING.Integration.Tests\Fixtures\DatabaseFixture.cs" -Raw
if ($fx -match 'DefaultTenantId') { Write-Pass "DatabaseFixture has DefaultTenantId" } else { Write-Fail "Missing DefaultTenantId" }
if ($fx -match 'SetOrganization') { Write-Pass "Fixture seeds with OrganizationId" } else { Write-Fail "Fixture missing SetOrganization" }

$ini = Get-Content "$backend\ATTENDING.Infrastructure\Data\DatabaseInitializer.cs" -Raw
$sc = ([regex]::Matches($ini, 'SetOrganization')).Count
if ($sc -ge 10) { Write-Pass "Initializer sets OrganizationId on $sc entities" } else { Write-Warn "Only $sc entities seeded with org ($sc found)" }

# --- 1.2 DRUG INTERACTION ---
Write-Host "`n--- 1.2 Drug Interaction Service ---" -ForegroundColor Yellow

if (Test-Path "$backend\ATTENDING.Domain\Interfaces\IExternalDrugInteractionApi.cs") { Write-Pass "IExternalDrugInteractionApi exists" } else { Write-Fail "Interface missing" }

$p2 = "$backend\ATTENDING.Infrastructure\External\DrugInteraction\NihDrugInteractionClient.cs"
if (Test-Path $p2) {
    Write-Pass "NihDrugInteractionClient exists"
    $nc = Get-Content $p2 -Raw
    if ($nc -match 'NullExternalDrugInteractionClient') { Write-Pass "Null stub fallback class exists" } else { Write-Warn "Null stub not in same file" }
} else { Write-Fail "NIH client missing" }

$p3 = "$backend\ATTENDING.Infrastructure\External\DrugInteraction\CompositeDrugInteractionService.cs"
if (Test-Path $p3) {
    Write-Pass "CompositeDrugInteractionService exists"
    $cc = Get-Content $p3 -Raw
    if ($cc -match 'IDrugInteractionService') { Write-Pass "Implements IDrugInteractionService" } else { Write-Fail "Does not implement interface" }
    if ($cc -match 'MergeResults') { Write-Pass "Merges external + local results" } else { Write-Warn "MergeResults not found" }
} else { Write-Fail "Composite service missing" }

$di = Get-Content "$backend\ATTENDING.Infrastructure\DependencyInjection.cs" -Raw
if ($di -match 'CompositeDrugInteractionService') { Write-Pass "Composite registered in DI" } else { Write-Fail "Not registered in DI" }
if ($di -match 'NullExternalDrugInteractionClient') { Write-Pass "Null stub registered as fallback" } else { Write-Warn "Null stub registration not found" }
if ($di -match 'DrugInteractionApi') { Write-Pass "DrugInteractionApi config referenced in DI" } else { Write-Warn "Config section not referenced" }

$as = Get-Content "$backend\ATTENDING.Orders.Api\appsettings.json" -Raw
if ($as -match '"DrugInteractionApi"') { Write-Pass "Config section in appsettings.json" } else { Write-Fail "Config section missing" }
$asd = Get-Content "$backend\ATTENDING.Orders.Api\appsettings.Development.json" -Raw
if ($asd -match '"DrugInteractionApi"') { Write-Pass "Config section in appsettings.Development.json" } else { Write-Fail "Dev config missing" }

# --- 1.3 SECRETS ---
Write-Host "`n--- 1.3 Secrets Management ---" -ForegroundColor Yellow

$gi = Get-Content "$root\.gitignore" -Raw
if ($gi -match '\.env') { Write-Pass ".env in .gitignore" } else { Write-Fail ".env NOT in .gitignore" }
if (Test-Path "$root\.env.example") { Write-Pass ".env.example exists" } else { Write-Fail ".env.example missing" }

if ($as -match 'Attending_Dev_2026') { Write-Fail "HARDCODED PASSWORD in appsettings.json!" }
elseif ($as -match '\$\{ATTENDING_DB_PASSWORD\}') { Write-Pass "appsettings.json uses env var placeholder" }
else { Write-Warn "Could not verify password pattern in appsettings.json" }

$dc = Get-Content "$root\docker-compose.yml" -Raw
if ($dc -match 'Attending_Dev_2026') { Write-Fail "HARDCODED PASSWORD in docker-compose.yml!" }
elseif ($dc -match '\$\{MSSQL_SA_PASSWORD') { Write-Pass "docker-compose.yml uses env var" }
else { Write-Warn "Could not verify compose passwords" }

if (Test-Path "$root\.env") {
    $ec = Get-Content "$root\.env" -Raw
    if ($ec -match 'Attending_Dev_2026') { Write-Warn ".env has default dev password (OK for local dev)" }
    else { Write-Pass ".env has non-default passwords" }
} else { Write-Warn ".env not found - copy from .env.example" }

# --- 1.4 SQL SCRIPTS ---
Write-Host "`n--- 1.4 SQL Scripts ---" -ForegroundColor Yellow

$sql = Get-Content "$root\backend\sql\001-CreateSchema.sql" -Raw
$oc = ([regex]::Matches($sql, 'OrganizationId UNIQUEIDENTIFIER NOT NULL')).Count
if ($oc -ge 12) { Write-Pass "OrganizationId in $oc SQL table definitions" } else { Write-Warn "Only $oc tables have OrganizationId (expected 12+)" }
$oi = ([regex]::Matches($sql, 'IX_.*OrganizationId')).Count
if ($oi -ge 1) { Write-Pass "OrganizationId indexes in SQL ($oi found)" } else { Write-Warn "No OrganizationId indexes in SQL" }

# --- BUILD + TEST ---
Write-Host "`n--- Build and Test ---" -ForegroundColor Yellow

$dotnet = Get-Command dotnet -ErrorAction SilentlyContinue
if ($dotnet) {
    $sln = Get-ChildItem "$root\backend" -Filter "*.sln" -Recurse | Select-Object -First 1
    if ($sln) {
        Write-Check "dotnet build $($sln.Name)"
        & dotnet build $sln.FullName --verbosity quiet 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) { Write-Pass "Build succeeded" }
        else {
            Write-Fail "Build FAILED - running again with output:"
            & dotnet build $sln.FullName --verbosity minimal 2>&1 | Select-Object -Last 20 | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkRed }
        }

        if ($LASTEXITCODE -eq 0) {
            Write-Check "dotnet test (excluding Docker)"
            $testOutput = & dotnet test $sln.FullName --no-build --filter "Category!=Docker" --verbosity minimal 2>&1
            if ($LASTEXITCODE -eq 0) { Write-Pass "All tests passed" }
            else {
                Write-Fail "Tests FAILED:"
                $testOutput | Select-Object -Last 25 | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkRed }
            }
        }
    } else { Write-Warn "No .sln found in backend/" }
} else { Write-Warn ".NET SDK not installed - skipping build/test" }

# --- SUMMARY ---
Write-Host "`n============================================================" -ForegroundColor White
$color = if ($fail -gt 0) { "Red" } elseif ($warn -gt 0) { "Yellow" } else { "Green" }
Write-Host " Results: $pass passed, $fail failed, $warn warnings" -ForegroundColor $color
Write-Host "============================================================`n" -ForegroundColor White
