# ATTENDING AI - HIPAA Compliance Documentation

## Technical Safeguards Implementation

**Document Version:** 1.0  
**Last Updated:** January 2026  
**Compliance Officer:** [Name]  
**Review Cycle:** Annual

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Access Controls](#2-access-controls)
3. [Audit Controls](#3-audit-controls)
4. [Integrity Controls](#4-integrity-controls)
5. [Transmission Security](#5-transmission-security)
6. [Authentication](#6-authentication)
7. [Encryption](#7-encryption)
8. [Data Backup & Recovery](#8-data-backup--recovery)
9. [Incident Response](#9-incident-response)
10. [Risk Assessment](#10-risk-assessment)

---

## 1. Executive Summary

ATTENDING AI implements comprehensive technical safeguards to protect electronic Protected Health Information (ePHI) in compliance with the HIPAA Security Rule (45 CFR Parts 160 and 164).

### Scope

This documentation covers:
- **COMPASS** - Patient-facing symptom assessment portal
- **ATTENDING** - Provider-facing clinical decision support portal
- **Supporting Infrastructure** - Databases, APIs, WebSocket services

### Compliance Status

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Access Controls (§164.312(a)) | ✅ Implemented | Section 2 |
| Audit Controls (§164.312(b)) | ✅ Implemented | Section 3 |
| Integrity Controls (§164.312(c)) | ✅ Implemented | Section 4 |
| Transmission Security (§164.312(e)) | ✅ Implemented | Section 5 |
| Authentication (§164.312(d)) | ✅ Implemented | Section 6 |

---

## 2. Access Controls

### 2.1 Unique User Identification (§164.312(a)(2)(i))

**Implementation:** Every user is assigned a unique identifier (UUID) upon account creation.

```typescript
// User model excerpt
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  role      UserRole
  createdAt DateTime @default(now())
}
```

**Evidence:**
- User IDs are immutable and never reused
- All audit logs reference user IDs
- User IDs are included in all session tokens

### 2.2 Emergency Access Procedure (§164.312(a)(2)(ii))

**Implementation:** Break-glass emergency access protocol for critical situations.

**Procedure:**
1. Provider requests emergency access with documented reason
2. System grants temporary elevated access (4 hours max)
3. Supervisor notified immediately
4. All actions during emergency access are flagged in audit log
5. Post-incident review required within 24 hours

### 2.3 Automatic Logoff (§164.312(a)(2)(iii))

**Implementation:** Sessions automatically expire after inactivity.

| Session Type | Timeout | Warning |
|--------------|---------|---------|
| Provider Portal | 30 minutes idle | 5-minute warning |
| Maximum Session | 8 hours total | 15-minute warning |
| Patient Portal | 15 minutes idle | 3-minute warning |

### 2.4 Encryption and Decryption (§164.312(a)(2)(iv))

**Implementation:** AES-256 encryption for PHI at rest.

| Data Type | Encryption | Key Management |
|-----------|------------|----------------|
| Database fields (SSN, etc.) | AES-256-GCM | Azure Key Vault |
| File uploads | AES-256-CBC | Azure Key Vault |
| Backups | AES-256 | Azure Backup Encryption |

---

## 3. Audit Controls

### 3.1 Audit Log Implementation (§164.312(b))

**Implementation:** Comprehensive audit logging of all PHI access and system events.

#### Logged Events

| Category | Events | Retention |
|----------|--------|-----------|
| Authentication | Login, logout, failed attempts, password changes | 7 years |
| PHI Access | View, create, update, delete patient records | 7 years |
| Orders | Lab, imaging, medication, referral orders | 7 years |
| System | Configuration changes, user management | 7 years |
| Security | Access violations, emergency access | 7 years |

### 3.2 Audit Log Review

**Procedure:**
- Daily automated review for security anomalies
- Weekly manual review by security team
- Monthly compliance review by compliance officer
- Annual third-party audit

---

## 4. Integrity Controls

### 4.1 Data Integrity (§164.312(c)(1))

**Implementation:** Multiple layers of data integrity protection.

- Database referential integrity constraints
- Application-level Zod validation for all inputs
- Checksums and digital signatures for critical data

---

## 5. Transmission Security

### 5.1 Integrity Controls (§164.312(e)(2)(i))

**Implementation:** TLS 1.3 for all data in transit.

**Supported Cipher Suites:**
- TLS_AES_256_GCM_SHA384
- TLS_CHACHA20_POLY1305_SHA256
- TLS_AES_128_GCM_SHA256

### 5.2 Encryption (§164.312(e)(2)(ii))

| Connection | Encryption | Certificate |
|------------|------------|-------------|
| Browser → Portal | TLS 1.3 | Let's Encrypt |
| Portal → Database | TLS 1.2+ | Azure managed |
| Portal → Redis | TLS 1.2+ | Azure managed |
| WebSocket | WSS (TLS) | Let's Encrypt |
| FHIR API | TLS 1.2+ | EHR vendor |

---

## 6. Authentication

### 6.1 Person or Entity Authentication (§164.312(d))

**Implementation:** Multi-factor authentication via Azure AD B2C.

#### Authentication Methods

| Method | Requirement | Implementation |
|--------|-------------|----------------|
| Password | Required | NIST SP 800-63B compliant |
| MFA | Required for providers | Azure Authenticator / SMS |
| SSO | Optional | SAML 2.0 / OIDC |
| Biometric | Optional | WebAuthn |

#### Password Policy

- Minimum length: 12 characters
- Require uppercase, lowercase, number, special character
- Prevent common passwords
- Expiration: 90 days
- History: 12 passwords
- Lockout: 5 failed attempts, 30 minute lockout

---

## 7. Encryption

### 7.1 Encryption Standards

| Data State | Algorithm | Key Size | Key Management |
|------------|-----------|----------|----------------|
| At Rest (Database) | AES-256-GCM | 256-bit | Azure Key Vault |
| At Rest (Files) | AES-256-CBC | 256-bit | Azure Key Vault |
| At Rest (Backups) | AES-256 | 256-bit | Azure Backup |
| In Transit | TLS 1.3 | 256-bit | Cert Manager |

### 7.2 Key Management

**Azure Key Vault Configuration:**
- Hardware Security Module (HSM) backed keys
- Automatic key rotation every 90 days
- Key access logged and audited
- Separation of duties for key management

---

## 8. Data Backup & Recovery

### 8.1 Backup Schedule

| Data Type | Frequency | Retention | Location |
|-----------|-----------|-----------|----------|
| Database | Continuous (PITR) | 35 days | Azure geo-redundant |
| File Storage | Daily | 90 days | Azure geo-redundant |
| Audit Logs | Real-time replication | 7 years | Azure immutable storage |
| Configuration | On change | 1 year | Azure DevOps |

### 8.2 Recovery Objectives

| Metric | Target | Actual |
|--------|--------|--------|
| Recovery Point Objective (RPO) | 1 hour | 5 minutes (continuous backup) |
| Recovery Time Objective (RTO) | 4 hours | 2 hours (tested) |

---

## 9. Incident Response

### 9.1 Security Incident Classification

| Level | Description | Response Time | Example |
|-------|-------------|---------------|---------|
| Critical | Active breach, data exfiltration | Immediate | Unauthorized PHI access |
| High | Potential breach, system compromise | 1 hour | Failed intrusion attempt |
| Medium | Policy violation, suspicious activity | 4 hours | Excessive failed logins |
| Low | Minor security event | 24 hours | Configuration warning |

### 9.2 Breach Notification

**Timeline (per HIPAA Breach Notification Rule):**
- Affected individuals: Within 60 days
- HHS: Within 60 days (or annual if <500 individuals)
- Media: Within 60 days (if >500 individuals in state)

---

## 10. Risk Assessment

### 10.1 Risk Assessment Schedule

- **Annual:** Comprehensive risk assessment
- **Quarterly:** Vulnerability scanning
- **Continuous:** Automated security monitoring

### 10.2 Identified Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation | Residual Risk |
|------|------------|--------|------------|---------------|
| Unauthorized access | Medium | High | MFA, RBAC, audit logging | Low |
| Data breach | Low | Critical | Encryption, monitoring, DLP | Low |
| Ransomware | Medium | High | Backups, endpoint protection | Low |
| Insider threat | Low | High | Audit logging, least privilege | Low |
| Natural disaster | Low | Medium | Geo-redundant backups, DR plan | Low |

---

## Appendix A: Compliance Checklist

### Technical Safeguards (§164.312)

- [x] Unique user identification
- [x] Emergency access procedure
- [x] Automatic logoff
- [x] Encryption and decryption
- [x] Audit controls
- [x] Integrity controls
- [x] Authentication
- [x] Transmission security

---

*This document is confidential and intended for internal compliance purposes only.*
