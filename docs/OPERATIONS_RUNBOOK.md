# ATTENDING AI — Operations Runbook
**Version:** 1.0 | **Audience:** On-call Engineers, DevOps, Clinical IT  
**Last Updated:** February 2026

---

## 1. Quick Reference

| Resource | Location |
|----------|----------|
| Provider Portal | `http://localhost:3002` (dev) |
| Patient Portal | `http://localhost:3003` (dev) |
| .NET Backend | `http://localhost:5000` (dev) |
| Database | MS SQL Server via Docker (`localhost:1433`) |
| Logs | Console / structured JSON → Azure Monitor (production) |
| Scheduler Status | `GET /api/admin/scheduler` |
| Health Check | `GET /api/health` |

---

## 2. Deployment

### 2.1 Environment Setup

```bash
# Install dependencies
npm install

# Validate environment variables
cp .env.example .env.local
# Fill in: DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL, AZURE_AD_CLIENT_ID, etc.

# Generate Prisma client
npm run db:generate

# Apply migrations
npm run db:migrate

# Seed development data
npm run db:seed
```

### 2.2 Development Startup

```bash
npm run dev          # Starts both portals + .NET backend (via turbo)
npm run dev:provider # Provider portal only (port 3002)
npm run dev:patient  # Patient portal only (port 3003)
```

### 2.3 Production Build

```bash
npm run build

# Verify build succeeds before deploy
npm run start:provider  # Verify provider portal starts
npm run start:patient   # Verify patient portal starts
```

### 2.4 Database Migrations (Production)

```bash
# ALWAYS run in a maintenance window or with zero-downtime strategy
npm run db:migrate:deploy

# Verify migration status first
npm run db:migrate:status
```

---

## 3. Rollback

### 3.1 Application Rollback

```bash
# Tag releases before deploying
git tag v1.x.x
git push origin v1.x.x

# Rollback: checkout previous tag
git checkout v1.x-1.x
npm run build
npm run start:provider
```

### 3.2 Database Rollback

```bash
# Prisma does not auto-reverse migrations. For emergency rollback:
# 1. Restore from pre-migration snapshot (Azure SQL Backup)
# 2. OR write a reverse migration manually

# DO NOT use db:reset in production — it wipes all data
```

---

## 4. Tenant Provisioning

### 4.1 New Tenant Setup

```bash
# 1. Create organization record in database
# Run via Prisma Studio or admin API:
POST /api/admin/organizations
{
  "name": "Clinic Name",
  "slug": "clinic-slug",
  "planTier": "ENTERPRISE"
}

# 2. Create initial admin user
POST /api/admin/users
{
  "email": "admin@clinic.com",
  "role": "ADMIN",
  "organizationId": "<org-id>"
}

# 3. Verify tenant isolation
# Test that org admin cannot see data from other organizations
```

### 4.2 Tenant Configuration

```env
# Per-tenant feature flags (Azure App Configuration)
attending:features:fhir-integration = true
attending:features:ai-scribe = false
attending:billing:plan = "enterprise"
```

### 4.3 RBAC Configuration

| Role | Access |
|------|--------|
| `ADMIN` | Full platform access, user management |
| `PROVIDER` | Clinical ordering, treatment plans, prescriptions |
| `NURSE` | Clinical ordering (except controlled substances), assessments |
| `STAFF` | Administrative, scheduling |
| `PATIENT` | Patient portal only |

---

## 5. Scheduler Management

### 5.1 View Scheduler Status

```bash
GET /api/admin/scheduler
```

Returns array of job statuses:
```json
{
  "name": "webhook-retry",
  "lastRun": "2026-02-24T10:00:00Z",
  "lastDuration": 142,
  "lastError": null,
  "runCount": 48,
  "errorCount": 0,
  "isRunning": false,
  "nextRun": "2026-02-24T10:01:00Z",
  "enabled": true
}
```

### 5.2 Registered Jobs

| Job | Interval | Purpose |
|-----|----------|---------|
| `webhook-retry` | 60s | Retry failed webhook deliveries |
| `export-cleanup` | 1h | Clean up temp export files |
| `integration-health` | 5min | Check EHR integration connections |
| `audit-rotation` | Daily | Flag audit records past retention |
| `softdelete-cleanup` | Daily | Identify soft-deleted records past retention |
| `session-cleanup` | 4h | Remove expired sessions |
| `retention-policies` | Daily | Run HIPAA data retention policies |
| `alert-evaluation` | 60s | Evaluate clinical alert rules |
| `phi-cache-maintenance` | 15min | PHI cache timeout enforcement |
| `webhook-health` | 30min | Re-enable recovered webhooks |

### 5.3 Distributed Lock Behavior

Jobs use Redis-based distributed locks to prevent duplicate execution across pods:

```
Acquire:  SET scheduler:{name} {instanceId} NX EX {ttl}
Release:  Compare-and-delete (Lua script for atomicity)
Fallback: If Redis unavailable → single-instance mode (always acquires)
```

**Lock TTL Formula:** `max(ceil(jobTimeoutMs / 1000) + 5, 30)` seconds

**If a lock is stuck** (pod crashed while holding):
- Lock auto-expires after TTL (max ~305 seconds for retention jobs)
- No manual intervention needed
- Monitor `[DistributedLock] Not acquired` log messages for pattern

### 5.4 Manually Trigger a Job

```bash
POST /api/admin/scheduler/trigger
{ "jobName": "webhook-retry" }
```

---

## 6. Incident Response

### 6.1 High Error Rate (5xx)

1. Check logs for error pattern: `grep "FAILED" logs/app.log`
2. Check database connectivity: `GET /api/health`
3. Check .NET backend: `GET http://localhost:5000/health`
4. Check for recent deployment: `git log --oneline -5`
5. If DB issue: verify connection pool not exhausted (check `prisma.$metrics`)
6. If code issue: rollback to previous tag (Section 3.1)

### 6.2 Auth Failures Spike

Watch for: `AuditActions.UNAUTHORIZED_ACCESS_ATTEMPT` in audit log

1. Check if `NEXTAUTH_SECRET` env var is set correctly
2. Check if Azure AD B2C tenant is operational
3. Check token expiry settings (`NEXTAUTH_SESSION_MAX_AGE`)
4. If account lockout suspected: check `failedLoginAttempts` counter on user record

### 6.3 PHI Access Anomaly

Watch for: unusual spike in `AuditActions.PHI_ACCESS` from single user or org

1. Pull audit log for user: `SELECT * FROM AuditLog WHERE userId = ?`
2. Disable user account if breach suspected: `PATCH /api/admin/users/{id}` → `{ "isActive": false }`
3. Notify HIPAA Security Officer within 1 hour
4. Preserve all audit records — do NOT delete

### 6.4 Scheduler Lock Failures

Watch for: repeated `[DistributedLock] Not acquired` for the same job across all pods

1. Usually means a pod crashed mid-job with lock held
2. Wait for lock TTL to expire (max ~5 minutes for audit-rotation)
3. If Redis is down: lock service falls back to single-instance mode (logs warning)
4. Check Redis connectivity: `redis-cli ping`

### 6.5 Database Connection Exhaustion

Signs: requests timing out, `can't acquire connection from pool` errors

1. Check `prisma.$metrics.json()` for connection pool stats
2. Default pool size: `connection_limit=5` per instance
3. For high load: increase `DATABASE_URL` connection_limit parameter
4. Verify no long-running queries: check SQL Server activity monitor

---

## 7. HIPAA Incident Response

### 7.1 Breach Notification Timeline

| Event | Required Action | Timeline |
|-------|----------------|----------|
| Breach discovery | Internal notification | Immediately |
| Breach confirmation | HIPAA Security Officer | Within 1 hour |
| Individual notification | Affected patients | Within 60 days |
| HHS notification | Department of Health | Within 60 days |
| Media notification | If >500 patients in state | Within 60 days |

### 7.2 What Counts as a Breach

- Unauthorized access to PHI (successful or attempted exfiltration)
- PHI sent to wrong recipient (email, fax, API)
- Lost/stolen device with unencrypted PHI
- Ransomware or malware affecting PHI systems

### 7.3 Evidence Preservation

```bash
# Immediately export audit logs before any system changes
SELECT * FROM AuditLog 
WHERE createdAt >= '{incident-start}' 
AND createdAt <= '{incident-end}'
ORDER BY createdAt ASC;

# Preserve application logs (do not rotate)
# Archive Docker logs: docker logs {container} > incident-{date}.log
```

---

## 8. Monitoring & Alerting

### 8.1 Key Metrics to Monitor

| Metric | Alert Threshold |
|--------|----------------|
| API error rate | > 1% over 5 minutes |
| P95 API latency | > 2 seconds |
| Auth failure rate | > 5% over 1 minute |
| PHI access rate (anomaly) | > 3x baseline for user |
| Scheduler error count | > 0 for critical jobs |
| DB connection pool usage | > 80% |
| Lock acquisition failures | > 3 consecutive for any job |

### 8.2 Health Check Endpoint

```
GET /api/health

Response:
{
  "status": "healthy" | "degraded" | "unhealthy",
  "timestamp": "2026-02-24T10:00:00Z",
  "checks": {
    "database": "healthy",
    "scheduler": "healthy",
    "redis": "healthy" | "unavailable (single-instance mode)"
  }
}
```

### 8.3 Log Levels

| Level | When Used |
|-------|-----------|
| `error` | Unhandled exceptions, job failures, security violations |
| `warn` | Rate limit hits, lock contention, degraded mode |
| `info` | Job completions, user actions, deployments |
| `debug` | Lock acquisition, cache hits, detailed traces |

---

## 9. Backup & Disaster Recovery

### 9.1 Database Backup

- **Azure SQL**: Automated backups enabled — 7-day point-in-time recovery (PITR)
- **RPO**: 1 hour (transaction log backups every 5-12 minutes)
- **RTO Target**: < 4 hours for full restore

### 9.2 Restore Procedure

```bash
# Azure SQL PITR restore (via Azure Portal or CLI)
az sql db restore \
  --dest-name attending-db-restored \
  --edition Standard \
  --service-objective S3 \
  --resource-group attending-rg \
  --server attending-sql \
  --name attending-db \
  --time "2026-02-24T08:00:00Z"

# After restore: run migration status check
npm run db:migrate:status

# Verify data integrity (spot check)
SELECT COUNT(*) FROM Patient WHERE deletedAt IS NULL;
SELECT COUNT(*) FROM LabOrder WHERE createdAt > '2026-02-01';
```

### 9.3 DR Test Checklist (Run Quarterly)

- [ ] Trigger Azure SQL PITR restore to staging environment
- [ ] Verify application connects to restored DB
- [ ] Spot check 5 random patient records for data integrity
- [ ] Test authentication still works post-restore
- [ ] Verify audit log continuity
- [ ] Document actual RTO achieved
- [ ] Update this runbook if procedures changed

---

## 10. Key Files Reference

| File | Purpose |
|------|---------|
| `docs/CURRENT_STATE.md` | Honest assessment of what's built vs. mock |
| `apps/shared/lib/api/handler.ts` | Unified API handler factory |
| `apps/shared/lib/security/security.ts` | CSRF, rate limiting, injection detection |
| `apps/shared/lib/multiTenant.ts` | Multi-tenant isolation utilities |
| `apps/shared/lib/distributedLock.ts` | Redis-based distributed locking |
| `apps/shared/lib/scheduler.ts` | Background job scheduler |
| `apps/shared/lib/audit/` | HIPAA audit trail |
| `apps/shared/lib/phiCache.ts` | PHI cache with mandatory timeout |
| `prisma/schema.prisma` | Database schema (source of truth) |
| `infrastructure/k8s/` | Kubernetes manifests (not yet applied) |

---

*For clinical safety issues, contact the Clinical Safety Officer immediately. For security breaches, contact the HIPAA Security Officer. Do not resolve incidents alone — follow the two-person rule for PHI access during incidents.*
