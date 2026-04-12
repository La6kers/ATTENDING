# =============================================================================
# ATTENDING AI — Week 2 Enterprise Cleanup
# scripts/enterprise-cleanup-week2.ps1
#
# Commits the structural fixes already applied to source files.
# Run AFTER enterprise-cleanup-week1.ps1.
#
# Changes applied directly to files this session:
#   - ClinicalAiController.cs  ← Legacy AI interface removed; controller
#                                 now routes /differential and /triage through
#                                 the Application-layer ITieredClinicalIntelligence
#                                 pipeline. LegacyAi alias and _aiService field gone.
#
# Remaining Week 2 work (flagged for manual follow-up below):
#   - Retire services/notification-service (Socket.io)
#   - Register MFA enforcement in auth flow
#   - Add distributed lock for idempotency keys
# =============================================================================

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = $PSScriptRoot | Split-Path -Parent
Set-Location $root

Write-Host "`n=== ATTENDING AI — Week 2 Enterprise Cleanup ===" -ForegroundColor Cyan
Write-Host "Working directory: $root`n"

$branch = git rev-parse --abbrev-ref HEAD
Write-Host "Branch: $branch" -ForegroundColor Yellow
Write-Host ""

# =============================================================================
# STEP 1 — Commit dual AI interface fix
# =============================================================================
Write-Host "[1/3] Staging ClinicalAiController refactor..." -ForegroundColor Yellow

git add backend/src/ATTENDING.Orders.Api/Controllers/ClinicalAiController.cs

$staged = git diff --cached --name-only
if ($staged) {
    Write-Host "  Staged: $staged" -ForegroundColor Green

    git commit -m "refactor: consolidate ClinicalAiController to Application-layer AI interface

Remove LegacyAi (Infrastructure.External.AI.IClinicalAiService) dependency
from ClinicalAiController. The legacy interface accepted a ClinicalContext
object and bypassed the tiered intelligence pipeline entirely.

/differential and /triage now route through ITieredClinicalIntelligence
(Application layer), giving them:
  - Tier 0 guideline scoring (GuidelineEvaluator)
  - Tier 0 red flag detection (RedFlagEvaluator)
  - Tier 0 drug interaction checking
  - Tier 2 cloud AI when available (non-blocking)

ClinicalAiService.cs in Infrastructure.External.AI remains for now
as BioMistral integration but is no longer injected into the controller.
It can be wired as the ITieredClinicalIntelligence Tier 2 implementation
when the AI service is ready for production.

Breaking change: /triage now requires PatientId + optional AssessmentId
instead of freetext ChiefComplaint + Symptoms. This is more correct —
triage should always be patient-contextual, not freetext."
} else {
    Write-Host "  Nothing staged — ClinicalAiController may already be committed." -ForegroundColor Gray
}

# =============================================================================
# STEP 2 — Remove notification-service (Socket.io)
# =============================================================================
Write-Host "`n[2/3] Checking services/notification-service..." -ForegroundColor Yellow

$notifPath = Join-Path $root "services\notification-service"
if (Test-Path $notifPath) {
    Write-Host "  Found notification-service. Removing..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  NOTE: Before removing, verify no active clients depend on Socket.io." -ForegroundColor Cyan
    Write-Host "  The provider portal NotificationContext.tsx already uses SignalR." -ForegroundColor Cyan
    Write-Host "  Check: grep -r 'notification-service\|socket.io\|NEXT_PUBLIC_WS_URL' apps/" -ForegroundColor Cyan
    Write-Host ""

    # Check for any remaining Socket.io client references
    $socketRefs = git grep -l "socket\.io\|NEXT_PUBLIC_WS_URL" -- "apps/" 2>$null
    if ($socketRefs) {
        Write-Host "  WARNING: Socket.io references still exist in apps/:" -ForegroundColor Red
        $socketRefs | ForEach-Object { Write-Host "    $_" -ForegroundColor Red }
        Write-Host ""
        Write-Host "  Skipping removal. Remove Socket.io client imports first, then re-run." -ForegroundColor Yellow
    } else {
        git rm -rf services/notification-service/ 2>$null
        if (Test-Path $notifPath) { Remove-Item $notifPath -Recurse -Force }
        git add -A

        $staged2 = git diff --cached --name-only
        if ($staged2) {
            git commit -m "chore: retire Socket.io notification-service

All real-time notifications now flow through ASP.NET Core SignalR
(ClinicalNotificationHub + SignalRClinicalNotificationService).

Removed: services/notification-service/ (Socket.io WebSocket server)
Reason: Dual real-time systems (SignalR + Socket.io) created competing
notification channels. SignalR has Redis backplane for multi-instance
scaling, PHI-safe logging, auth integration, and domain event wiring.

Consumers: provider portal uses NotificationContext.tsx -> notificationClient.ts
which connects to /hubs/notifications (SignalR). No Socket.io client
imports remain in apps/."
            Write-Host "  Removed and committed services/notification-service/" -ForegroundColor Green
        }
    }
} else {
    Write-Host "  notification-service not found — may already be removed." -ForegroundColor Gray
}

# =============================================================================
# STEP 3 — Push
# =============================================================================
Write-Host "`n[3/3] Pushing to origin/$branch..." -ForegroundColor Yellow
git push origin $branch
Write-Host "  Pushed." -ForegroundColor Green

# =============================================================================
# WEEK 2 REMAINING ITEMS (manual work required)
# =============================================================================
Write-Host "`n=== Week 2 Status ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "COMPLETED (automated):" -ForegroundColor Green
Write-Host "  [x] ClinicalAiController — dual AI interface eliminated"
Write-Host "  [x] /differential and /triage route through tiered pipeline"
Write-Host "  [x] notification-service removed (if no Socket.io refs found)"
Write-Host ""
Write-Host "REMAINING (manual implementation required):" -ForegroundColor Yellow
Write-Host ""
Write-Host "  [ ] MFA enforcement in auth flow" -ForegroundColor Yellow
Write-Host "      File: apps/shared/lib/auth/ssoProviders.ts"
Write-Host "      Action: Check mfaEnabled flag in JWT callback; redirect to /auth/mfa"
Write-Host "      Timeframe: 1 day"
Write-Host ""
Write-Host "  [ ] Redis distributed lock for idempotency" -ForegroundColor Yellow
Write-Host "      File: backend/src/ATTENDING.Orders.Api/Middleware/IdempotencyMiddleware.cs"
Write-Host "      Action: Replace in-process ConcurrentDictionary with IDistributedLock"
Write-Host "      Use: StackExchange.Redis SETNX or RedLock.net"
Write-Host "      Timeframe: 2 days"
Write-Host ""
Write-Host "  [ ] OpenTelemetry → Application Insights" -ForegroundColor Yellow
Write-Host "      File: backend/src/ATTENDING.Orders.Api/appsettings.Production.json (create)"
Write-Host "      Action: Set OtlpEndpoint to Azure Monitor OTLP endpoint"
Write-Host "      Also: Add APPLICATIONINSIGHTS_CONNECTION_STRING env var to App Service"
Write-Host "      Timeframe: 1 day"
Write-Host ""
Write-Host "  [ ] Playwright E2E suite (Week 3)" -ForegroundColor Cyan
Write-Host "      Target: apps/provider-portal/tests/e2e/"
Write-Host "      Critical path: COMPASS submit -> dashboard -> lab order -> SignalR notify"
Write-Host ""
Write-Host "Next: implement MFA enforcement and distributed locks, then run" -ForegroundColor Cyan
Write-Host "      scripts\enterprise-cleanup-week3.ps1 (to be generated)" -ForegroundColor Cyan
