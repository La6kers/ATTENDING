# IT Admin Portal — Troubleshooting & Operations Guide

**Document Version:** 2.0
**Last Updated:** February 18, 2026
**Classification:** Internal Use Only

---

## Tier Access Levels

| Tier | Role | Access |
|------|------|--------|
| T1 | Help Desk | User management, password resets, session monitoring |
| T2 | System Admin | Security center, audit logs, system monitoring, integrations, background jobs |
| T3 | Engineering | Database explorer, API tester, WebSocket monitor, feature flags, cache management |

---

## Common Troubleshooting Procedures

### 1. User Cannot Log In

**T1 Steps:**
1. Search for user in User Management
2. Check account status (Active / Locked / Suspended)
3. If Locked: Click "Unlock Account" — lockout is 30 min after 5 failed attempts
4. If password issue: Click "Reset Password" to send reset email
5. Verify MFA status — if MFA device lost, escalate to T2

### 2. Slow Application Performance

**T2 Steps:**
1. Go to System Monitoring → Performance
2. Check CPU, memory, and database connection metrics
3. If DB connections > 80%: Check for long-running queries in Logs → Database Logs
4. If CPU > 90%: Check Background Jobs for stuck processes
5. Review API Logs for endpoints with >500ms response time

### 3. EHR Integration Failure

**T2 Steps:**
1. Go to Integrations → EHR Systems
2. Check connection status for Epic FHIR endpoint
3. Review API Logs filtered by `fhir` resource
4. If token expired: Re-authorize via Settings → EHR Connection
5. If persistent: Escalate to T3 with error logs

### 4. WebSocket Disconnections

**T3 Steps:**
1. Go to Dev Tools → WebSocket Monitor
2. Check connection status and heartbeat messages
3. Review server logs for WebSocket errors
4. Verify load balancer sticky sessions are configured
5. Common causes: network instability, server restart, too many concurrent connections

---

## Emergency Procedures

### Security Breach Response
1. **Isolate**: Disable affected accounts immediately
2. **Assess**: Review Security → Audit Logs for scope of breach
3. **Notify**: Alert T3 and security team
4. **Document**: Record all actions with timestamps

### System Outage Severity

| Level | Impact | Response Time |
|-------|--------|---------------|
| P1 | Complete outage | 15 minutes |
| P2 | Major feature down | 30 minutes |
| P3 | Degraded performance | 2 hours |
| P4 | Minor issue | 24 hours |

---

## Feature Flags Reference

Feature flags are managed at T3 level via Admin Portal → Feature Flags.

**MVP Features (always on):**
- `COMPASS_ASSESSMENT` — Patient symptom assessment chatbot
- `PROVIDER_INBOX` — Provider smart inbox
- `LAB_ORDERING` — Lab ordering module
- `IMAGING_ORDERING` — Imaging ordering module
- `MEDICATION_ORDERING` — Medication ordering module
- `PREVISIT_SUMMARY` — Pre-visit summary generation
- `RED_FLAG_DETECTION` — Emergency red flag detection

**Enterprise Features (toggle per clinic):**
- `AMBIENT_DOCUMENTATION` — Ambient visit documentation
- `TELEHEALTH` — Video telehealth panel
- `POPULATION_HEALTH` — Population health dashboard
- `CLINICAL_TRIALS` — Clinical trials matcher
- `RPM` — Remote patient monitoring
- `PREDICTIVE_ALERTS` — Predictive deterioration alerts
- `PRIOR_AUTH` — Prior authorization automation

---

## Contact Information

| Team | Contact | Hours |
|------|---------|-------|
| T1 Support | support@attendingai.health | 24/7 |
| T2 Escalation | sysadmin@attendingai.health | Business hours |
| T3 Engineering | engineering@attendingai.health | On-call 24/7 |
| CEO | Scott Isbell MD — 702-883-5868 | Business hours |
