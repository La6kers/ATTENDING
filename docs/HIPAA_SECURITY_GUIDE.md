# ATTENDING AI - HIPAA Security & Compliance Guide

## Overview

This document outlines the security measures and HIPAA compliance controls implemented in the ATTENDING AI platform. All team members developing, deploying, or maintaining the application must follow these guidelines.

## HIPAA Technical Safeguards Implementation

### 1. Access Control (§164.312(a)(1))

#### Authentication
- **Multi-factor authentication (MFA)**: Recommended for all provider accounts
- **Azure AD B2C integration**: Enterprise-grade identity management
- **Session management**: 8-hour clinical shift-aligned sessions with 30-minute inactivity timeout
- **Password requirements**: Minimum 12 characters, complexity requirements enforced

#### Authorization
- **Role-Based Access Control (RBAC)**: ADMIN, PROVIDER, NURSE, STAFF, PATIENT
- **Principle of least privilege**: Users only access data necessary for their role
- **Provider-only functions**: Controlled substance prescribing, order signing

#### Implementation Files
- `apps/provider-portal/middleware.ts` - Route protection
- `apps/shared/lib/auth/secureSession.ts` - Session management
- `apps/shared/lib/api/secureHandler.ts` - API authorization

### 2. Audit Controls (§164.312(b))

#### Audit Logging
All PHI access and clinical actions are logged with:
- User ID
- Timestamp
- Action performed
- Resource accessed
- IP address
- Success/failure status

#### Logged Events
- User authentication (login, logout, failed attempts)
- Patient record access
- Order creation/modification
- PHI export/download
- Emergency events (red flags)
- Security events (unauthorized access attempts)

#### Implementation Files
- `apps/shared/lib/audit/index.ts` - Audit logging service
- Prisma `AuditLog` model in database schema

#### Retention
- Audit logs retained for minimum 6 years (HIPAA requirement)
- Immutable storage recommended for audit logs

### 3. Integrity (§164.312(c)(1))

#### Data Integrity
- Input validation using Zod schemas (`apps/shared/schemas/clinical.schemas.ts`)
- SQL injection prevention
- XSS attack prevention
- CSRF token validation for state-changing requests

#### Implementation Files
- `apps/shared/lib/security/index.ts` - Security utilities
- `apps/shared/schemas/clinical.schemas.ts` - Data validation

### 4. Transmission Security (§164.312(e)(1))

#### Encryption in Transit
- TLS 1.2+ required for all connections
- HTTPS enforced via HSTS headers
- Secure WebSocket (WSS) for real-time communication

#### Security Headers
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: [configured per page]
Referrer-Policy: strict-origin-when-cross-origin
```

### 5. Encryption at Rest

#### Database
- PostgreSQL with encryption at rest (Azure/AWS managed)
- Sensitive fields encrypted at application layer

#### File Storage
- Azure Blob Storage with encryption enabled
- PHI documents encrypted with customer-managed keys

#### Implementation
```typescript
import { encryptData, decryptData } from '@attending/shared/lib/security';

// Encrypt before storage
const encrypted = encryptData(phiData, process.env.ENCRYPTION_KEY);

// Decrypt when retrieving
const decrypted = decryptData(encrypted, process.env.ENCRYPTION_KEY);
```

## Security Checklist

### Development
- [ ] No PHI in code comments or logs
- [ ] No hardcoded credentials
- [ ] Input validation on all user inputs
- [ ] Output encoding for displayed data
- [ ] Parameterized queries (never string concatenation)
- [ ] Error messages don't expose system details

### Code Review
- [ ] Authentication/authorization checks present
- [ ] Audit logging for PHI access
- [ ] Input validation implemented
- [ ] No sensitive data in HTTP headers
- [ ] Rate limiting on sensitive endpoints
- [ ] CSRF protection on state-changing endpoints

### Deployment
- [ ] Environment variables for all secrets
- [ ] Secrets rotated on schedule
- [ ] TLS certificates valid and up-to-date
- [ ] Database encryption enabled
- [ ] Audit logging active
- [ ] Monitoring and alerting configured

## API Security Standards

### Protected Endpoints
All API endpoints handling PHI must use the secure handler:

```typescript
import { createSecureHandler, createPHIHandler } from '@attending/shared/lib/api/secureHandler';
import { PatientDemographicsSchema } from '@attending/shared/schemas/clinical.schemas';

export default createPHIHandler(
  async (req, res) => {
    // Handler implementation
    // req.user contains authenticated user
    // req.validatedBody contains validated input
  },
  {
    methods: ['GET', 'POST'],
    allowedRoles: ['ADMIN', 'PROVIDER', 'NURSE'],
    bodySchema: PatientDemographicsSchema,
    auditAction: 'PATIENT_VIEW',
  }
);
```

### Response Format
All API responses follow a standard format:

```typescript
// Success
{
  success: true,
  data: { ... },
  meta: { requestId, timing },
  timestamp: "2025-01-29T..."
}

// Error
{
  success: false,
  error: {
    code: "ERROR_CODE",
    message: "User-friendly message",
    details: { ... }
  },
  timestamp: "2025-01-29T..."
}
```

## PHI Handling Guidelines

### What is PHI?
Protected Health Information includes:
- Patient name, address, dates (birth, admission, discharge, death)
- Phone, fax, email, social security, medical record numbers
- Health plan beneficiary numbers, account numbers
- Certificate/license numbers, device identifiers
- Web URLs, IP addresses, biometric identifiers
- Full-face photos, any unique identifying characteristic

### PHI in Logs
- NEVER log PHI directly
- Use `maskPHI()` function for any logged data that might contain PHI:

```typescript
import { maskPHI } from '@attending/shared/lib/security';

// ❌ Wrong
console.log('Processing patient:', patientData);

// ✅ Correct
console.log('Processing patient:', maskPHI(JSON.stringify(patientData)));
```

### PHI in Error Messages
- Error messages returned to users must not contain PHI
- Internal errors are logged with masked PHI

## Incident Response

### Security Incident Types
1. **Data Breach**: Unauthorized access to PHI
2. **System Compromise**: Malware, unauthorized system access
3. **Availability Impact**: DDoS, system outage affecting patient care

### Incident Response Steps
1. **Identify**: Detect and confirm the incident
2. **Contain**: Isolate affected systems
3. **Eradicate**: Remove the threat
4. **Recover**: Restore systems to normal operation
5. **Report**: Notify affected parties per HIPAA Breach Notification Rule
6. **Review**: Conduct post-incident analysis

### Breach Notification Requirements
- Individual notification within 60 days
- HHS notification for breaches affecting 500+ individuals
- Media notification for breaches affecting 500+ in a state

## Vulnerability Management

### Regular Assessments
- **Automated scanning**: Weekly dependency vulnerability scans
- **Penetration testing**: Annual third-party assessment
- **Code review**: Security review for all PRs

### Dependency Updates
- Critical security updates: Within 24 hours
- High severity: Within 7 days
- Medium severity: Within 30 days

## Training Requirements

All team members must complete:
1. HIPAA Privacy and Security training (annual)
2. Secure coding practices training (annual)
3. Phishing awareness training (quarterly)

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-01-29 | Security Team | Initial version |

## References

- [HIPAA Security Rule](https://www.hhs.gov/hipaa/for-professionals/security/index.html)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
