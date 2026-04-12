# ATTENDING AI - Security Audit Preparation Checklist

## Pre-Penetration Test Checklist

**Audit Firm:** [To Be Assigned]  
**Scheduled Date:** [Week 14]  
**Scope:** Full application and infrastructure assessment

---

## 1. Scope Definition

### 1.1 In-Scope Assets

| Asset | URL/Location | Type |
|-------|--------------|------|
| Provider Portal | https://provider.attending.ai | Web Application |
| Patient Portal | https://compass.attending.ai | Web Application |
| API Gateway | https://api.attending.ai | REST API |
| WebSocket Service | wss://ws.attending.ai | WebSocket |
| Mobile PWA | https://compass.attending.ai (PWA) | Progressive Web App |
| Azure Infrastructure | Azure AKS, PostgreSQL, Redis | Cloud Infrastructure |

### 1.2 Out-of-Scope

- [ ] Azure AD B2C (Microsoft managed)
- [ ] Third-party EHR systems (Epic, Oracle Health)
- [ ] Physical security (covered by Azure SOC 2)
- [ ] Social engineering (separate engagement)

---

## 2. Security Controls Verification

### 2.1 Authentication & Authorization

#### Authentication Tests
- [ ] Password policy enforcement (12+ chars, complexity)
- [ ] Account lockout after 5 failed attempts
- [ ] MFA requirement for all providers
- [ ] Session timeout (30 min idle, 8 hr max)
- [ ] Secure password reset flow
- [ ] JWT token security (signing, expiration)

#### Authorization Tests
- [ ] RBAC enforcement (Admin, Provider, Nurse, Staff, Patient)
- [ ] Horizontal privilege escalation prevention
- [ ] Vertical privilege escalation prevention
- [ ] API endpoint authorization
- [ ] Resource-level access control

### 2.2 Input Validation

#### Injection Prevention
- [ ] SQL injection (parameterized queries)
- [ ] NoSQL injection (if applicable)
- [ ] Command injection
- [ ] XPath injection
- [ ] XML External Entity (XXE)

#### Cross-Site Scripting (XSS)
- [ ] Reflected XSS
- [ ] Stored XSS
- [ ] DOM-based XSS
- [ ] Content Security Policy headers

### 2.3 Session Management

- [ ] Secure session ID generation
- [ ] Session ID not exposed in URL
- [ ] Session invalidation on logout
- [ ] Session invalidation on password change
- [ ] Concurrent session handling
- [ ] Session fixation prevention

### 2.4 Cryptography

#### Encryption at Rest
- [ ] Database encryption (AES-256)
- [ ] File storage encryption
- [ ] Backup encryption
- [ ] Key management (Azure Key Vault)

#### Encryption in Transit
- [ ] TLS 1.2+ only (1.3 preferred)
- [ ] Strong cipher suites
- [ ] Certificate validation
- [ ] HSTS header

---

## 3. OWASP Top 10 (2021) Checklist

| # | Vulnerability | Status | Notes |
|---|---------------|--------|-------|
| A01 | Broken Access Control | [ ] Verify | RBAC implemented |
| A02 | Cryptographic Failures | [ ] Verify | AES-256, TLS 1.3 |
| A03 | Injection | [ ] Verify | Parameterized queries |
| A04 | Insecure Design | [ ] Verify | Threat modeling done |
| A05 | Security Misconfiguration | [ ] Verify | Hardening applied |
| A06 | Vulnerable Components | [ ] Verify | Dependabot enabled |
| A07 | Auth Failures | [ ] Verify | MFA, strong passwords |
| A08 | Software/Data Integrity | [ ] Verify | SRI, signed packages |
| A09 | Logging Failures | [ ] Verify | Comprehensive audit logs |
| A10 | SSRF | [ ] Verify | URL validation |

---

## 4. Healthcare-Specific Security

### 4.1 PHI Protection

- [ ] PHI identified and classified
- [ ] PHI encrypted at rest
- [ ] PHI encrypted in transit
- [ ] PHI access logged
- [ ] Minimum necessary principle
- [ ] PHI in logs/errors sanitized

### 4.2 Emergency Access

- [ ] Break-glass procedure documented
- [ ] Emergency access logged
- [ ] Supervisor notification
- [ ] Time-limited access
- [ ] Post-access review

### 4.3 Audit Trail

- [ ] All PHI access logged
- [ ] Logs tamper-resistant
- [ ] Log retention (7 years)
- [ ] Log review process
- [ ] Anomaly detection

---

## 5. Post-Audit Activities

### 5.1 Report Review

- [ ] Receive audit report
- [ ] Technical review of findings
- [ ] Risk assessment for each finding
- [ ] Remediation prioritization
- [ ] Remediation timeline

### 5.2 Remediation Tracking

| Finding ID | Severity | Description | Owner | Status | Due Date |
|------------|----------|-------------|-------|--------|----------|
| [TBD] | - | - | - | - | - |

---

## Appendix: Security Headers Verification

```bash
# Verify security headers
curl -I https://provider.attending.ai | grep -E "(Strict-Transport|Content-Security|X-Frame|X-Content-Type|X-XSS|Referrer-Policy)"

# Expected output:
# Strict-Transport-Security: max-age=31536000; includeSubDomains
# Content-Security-Policy: default-src 'self'; ...
# X-Frame-Options: SAMEORIGIN
# X-Content-Type-Options: nosniff
# X-XSS-Protection: 1; mode=block
# Referrer-Policy: strict-origin-when-cross-origin
```

---

*This checklist should be completed before the security audit begins.*
