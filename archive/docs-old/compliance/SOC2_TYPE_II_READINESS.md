# ATTENDING AI - SOC 2 Type II Readiness Tracker

**Target Audit Period:** Month 1 → Month 7 (6-month minimum)  
**Recommended Vendor:** Vanta (automated evidence collection)  
**Status:** Evidence Collection Phase

---

## Trust Service Criteria Coverage

### CC1: Control Environment

| Control | Evidence | Status | Owner |
|---------|----------|--------|-------|
| Organizational structure documented | Org chart, role descriptions | ✅ Ready | CEO |
| Code of conduct policy | Employee handbook section | ⬜ TODO | CEO |
| Background checks for new hires | HR process documentation | ⬜ TODO | HR |
| Board oversight of security | Board meeting minutes | ⬜ TODO | CEO |
| Risk assessment process | Annual risk assessment doc | ⬜ TODO | CTO |

### CC2: Communication and Information

| Control | Evidence | Status | Owner |
|---------|----------|--------|-------|
| Security policies documented | `docs/compliance/`, `docs/security/` | ✅ Ready | CTO |
| Incident response plan | `docs/operations/DISASTER_RECOVERY_RUNBOOK.md` | ✅ Ready | CTO |
| Change management process | GitHub PR review process, CI/CD workflows | ✅ Ready | CTO |
| Internal communication of policies | Slack channel, onboarding docs | ⬜ TODO | CTO |

### CC3: Risk Assessment

| Control | Evidence | Status | Owner |
|---------|----------|--------|-------|
| Annual risk assessment | Risk register document | ⬜ TODO | CTO |
| Vulnerability management | `security-scan.yaml` GitHub Action | ✅ Ready | CTO |
| Vendor risk assessment | Third-party vendor inventory | ⬜ TODO | CTO |
| Data classification policy | PHI handling procedures | ✅ Ready | CTO |

### CC5: Control Activities

| Control | Evidence | Status | Owner |
|---------|----------|--------|-------|
| Access control (RBAC) | Azure AD B2C config, 5 roles defined | ✅ Ready | CTO |
| MFA enforcement | Azure AD B2C MFA policy | ✅ Ready | CTO |
| Encryption at rest | Azure PostgreSQL TDE, Blob encryption | ✅ Ready | CTO |
| Encryption in transit | TLS 1.2 minimum, HTTPS enforced | ✅ Ready | CTO |
| Audit logging | `apps/shared/lib/audit/` HIPAA audit trail | ✅ Ready | CTO |
| Code review process | GitHub PR required reviews | ✅ Ready | CTO |
| Automated testing | Vitest unit tests, Playwright E2E | ✅ Ready | CTO |
| Infrastructure as Code | `infrastructure/terraform/main.tf` | ✅ Ready | CTO |
| Backup procedures | Azure geo-redundant backups, 35-day retention | ✅ Ready | CTO |

### CC6: Logical and Physical Access

| Control | Evidence | Status | Owner |
|---------|----------|--------|-------|
| User access management | Azure AD B2C provisioning | ✅ Ready | CTO |
| Password policy | Azure AD B2C password policy | ✅ Ready | CTO |
| Access review process | Quarterly access review documentation | ⬜ TODO | CTO |
| Session management | 8-hour clinical sessions, IP tracking | ✅ Ready | CTO |
| Least privilege access | RBAC with 5 roles | ✅ Ready | CTO |

### CC7: System Operations

| Control | Evidence | Status | Owner |
|---------|----------|--------|-------|
| Monitoring and alerting | Prometheus alerts, Grafana dashboard | ✅ Ready | CTO |
| Incident management | Disaster recovery runbook | ✅ Ready | CTO |
| Change management | CI/CD pipeline, staging deploy | ✅ Ready | CTO |
| Capacity planning | Azure autoscale config | ⬜ TODO | CTO |
| System availability (SLA) | Health check endpoints | ✅ Ready | CTO |

### CC8: Change Management

| Control | Evidence | Status | Owner |
|---------|----------|--------|-------|
| Change request process | GitHub Issues + PRs | ✅ Ready | CTO |
| Testing before deployment | CI pipeline, staging environment | ✅ Ready | CTO |
| Rollback procedures | Blue-green deploy, K8s rollback | ✅ Ready | CTO |
| Release documentation | Phase completion docs in `docs/` | ✅ Ready | CTO |

### CC9: Risk Mitigation

| Control | Evidence | Status | Owner |
|---------|----------|--------|-------|
| Business continuity plan | Disaster recovery runbook | ✅ Ready | CTO |
| Data backup and recovery | Azure geo-redundant, 35-day retention | ✅ Ready | CTO |
| Vendor management | Third-party inventory | ⬜ TODO | CTO |

---

## HIPAA-Specific Controls (Healthcare Overlay)

| Control | Evidence | Status |
|---------|----------|--------|
| PHI access logging | Comprehensive audit trail with entity-level tracking | ✅ |
| BAA with subprocessors | Azure BAA, infrastructure vendor BAAs | ⬜ TODO |
| PHI encryption | AES-256 at rest, TLS 1.2+ in transit | ✅ |
| Minimum necessary access | RBAC enforced at API and database level | ✅ |
| Breach notification process | Incident response plan section | ⬜ TODO |
| Employee training records | Annual HIPAA training documentation | ⬜ TODO |
| Data retention policy | 6-year audit log retention via lifecycle policy | ✅ |
| Row-level security | PostgreSQL RLS per organization | ✅ |

---

## Evidence Collection Timeline

| Month | Milestone |
|-------|-----------|
| 1 | Connect Vanta, begin automated evidence collection |
| 1 | Complete all ⬜ TODO items above |
| 2 | First automated compliance scan |
| 3 | Internal audit review |
| 4 | Remediate findings |
| 5 | Mid-period assessment |
| 6 | Pre-audit preparation |
| 7 | SOC 2 Type II audit completion |

---

## Vanta Integration Checklist

- [ ] Sign up for Vanta account
- [ ] Connect Azure Active Directory
- [ ] Connect GitHub organization
- [ ] Connect Azure cloud infrastructure
- [ ] Connect Slack workspace
- [ ] Configure employee onboarding workflows
- [ ] Set up automated policy distribution
- [ ] Enable continuous monitoring alerts
- [ ] Schedule auditor engagement

---

## Estimated Costs

| Item | Cost |
|------|------|
| Vanta (annual) | $10,000-15,000 |
| SOC 2 Type II Audit | $15,000-25,000 |
| Gap remediation | $5,000-10,000 |
| **Total** | **$30,000-50,000** |

---

*Last updated: February 2026*  
*Owner: CTO - Bill LaPierre*
