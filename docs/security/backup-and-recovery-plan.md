# Backup & Recovery Plan

**Owner:** Scott Isbell, MD — Founder, ATTENDING AI LLC
**Version:** 1.0
**Effective Date:** 2026-04-11
**HIPAA:** 45 CFR §164.308(a)(7) (Contingency Plan), §164.310(d)(2)(iv) (Data backup)

---

## 1. Purpose

This plan defines how ATTENDING AI LLC protects data and systems against loss, corruption, and extended unavailability through backup, restoration, and disaster recovery procedures.

## 2. Scope

This plan covers:

- Production database (Azure SQL, planned)
- Application source code and CI configuration (GitHub)
- Secrets and encryption keys (Azure Key Vault)
- Container images (Azure Container Registry `attendingacr`)
- Audit trails and security logs
- Configuration and infrastructure-as-code

## 3. Objectives

| Metric | Target |
|---|---|
| **Recovery Time Objective (RTO)** for tier-1 production | **4 hours** for application tier; **8 hours** for full data restore |
| **Recovery Point Objective (RPO)** for PHI | **1 hour** (acceptable data loss window) |
| **Backup retention** | 30 days rolling point-in-time + quarterly archive for 6 years |
| **Backup test frequency** | Quarterly restore test to non-production environment |

## 4. Backup Scope & Frequency

| Asset | Mechanism | Frequency | Retention |
|---|---|---|---|
| Azure SQL production DB | Azure automated backups + point-in-time restore | Continuous transaction log; full daily | 30 days rolling; quarterly long-term retention for 6 years |
| Source code | GitHub (primary) + weekly mirror to Azure DevOps (planned) | Continuous | Indefinite |
| Secrets (Key Vault) | Azure Key Vault soft-delete + purge protection | Continuous | 90 days soft-delete; keys versioned |
| Container images | Azure Container Registry + geo-replication (planned production) | On every successful CI build | Retain last 10 tagged releases per app |
| Audit logs | Prisma audit tables replicated via DB backup | Continuous | 6 years per HIPAA |
| Security scan results | GitHub Security tab + artifact retention | Per run | 90 days |

## 5. Backup Integrity

- Backups are encrypted at rest using Azure platform-managed keys (or CMK via Key Vault where required)
- Azure SQL backup checksums and page verification are enabled
- Restore tests verify both **data integrity** (checksum on known rows) and **functional integrity** (application starts cleanly against restored DB)

## 6. Restore Procedures

### 6.1 Database point-in-time restore (routine)
1. Authenticate to Azure via MFA
2. From Azure Portal → SQL Server → Databases → Restore
3. Select restore point within 30-day window
4. Target a new database name (never overwrite prod directly)
5. Update application connection string to target the restored DB
6. Verify row counts and last-write timestamps
7. Cut traffic over; decommission old DB only after 72-hour confidence window

### 6.2 Full disaster recovery (regional outage)
1. Confirm the outage scope via Azure Status + third-party monitoring
2. Incident Commander declares DR event per `incident-response-plan.md`
3. Fail over to paired region using pre-provisioned resources (once implemented)
4. Restore DB from geo-redundant backup to paired region
5. Re-deploy containers from Azure Container Registry geo-replica
6. Re-point DNS / Front Door to paired region
7. Communicate restored status to all stakeholders

### 6.3 Source code recovery
1. GitHub is the primary source of truth; restore is a fresh clone from `La6kers/ATTENDING`
2. If GitHub is unavailable, restore from the most recent local clone on a developer endpoint
3. Rebuild CI runners and secrets from documentation and Key Vault

### 6.4 Secrets recovery
1. Azure Key Vault soft-delete allows restoration of deleted secrets within 90 days
2. If a key is lost or compromised, follow the encryption-key rotation procedure: decrypt affected fields with the old key, re-encrypt with a new key, retire the old key

## 7. Testing

- **Quarterly** — restore the most recent backup to a test environment, run smoke tests, and document results in `docs/security/dr-tests/YYYY-QN.md`
- **Annually** — full tabletop DR exercise with a simulated regional outage scenario

## 8. Dependencies on External Providers

| Dependency | Failure mode | Mitigation |
|---|---|---|
| Azure SQL | Service outage | Multi-region geo-redundant backups; paired region fail-over |
| Azure Container Registry | Image pull failure | Geo-replication; local image cache during deploy |
| GitHub | Source / CI unavailable | Weekly mirror to secondary (planned); fall back to local clones |
| Azure Key Vault | Secrets unavailable | Soft-delete + purge protection; emergency access via break-glass account |

## 9. Responsibility

The Security Officer owns this plan and the quarterly test schedule. The Incident Commander activates DR procedures when invoked per the Incident Response Plan.

## 10. Related Documents

- `information-security-policy.md`
- `business-continuity-plan.md`
- `incident-response-plan.md`

## 11. Revision History

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-04-11 | Scott Isbell, MD | Initial plan |
