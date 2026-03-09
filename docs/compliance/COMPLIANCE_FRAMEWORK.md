# ATTENDING AI - Compliance Framework

**Classification:** INTERNAL - CONFIDENTIAL
**Owner:** Security & Compliance Team
**Applicable Regulation:** HIPAA (45 CFR Parts 160, 162, 164)
**Scope:** All ATTENDING AI systems, subprocessors, and personnel handling PHI/PII

---

## Version History

| Version | Date       | Author               | Changes                                      |
|---------|------------|-----------------------|----------------------------------------------|
| 1.0     | 2026-03-09 | Security & Compliance | Initial compliance framework                 |

---

## Table of Contents

1. [Data Classification Policy](#1-data-classification-policy)
2. [Business Associate Agreement (BAA) Requirements](#2-business-associate-agreement-baa-requirements)
3. [Breach Notification Procedures](#3-breach-notification-procedures)
4. [Technical Safeguards Inventory](#4-technical-safeguards-inventory)
5. [Risk Assessment Schedule](#5-risk-assessment-schedule)
6. [Audit & Monitoring](#6-audit--monitoring)

---

## 1. Data Classification Policy

All data processed, stored, or transmitted by ATTENDING AI is classified into one of five tiers. Each tier carries specific handling requirements that map to HIPAA minimum necessary standards and the principle of least privilege.

### Tier 1: PHI (Protected Health Information) - HIGHEST

Data elements that identify a patient and relate to their health condition, treatment, or payment for healthcare services. Any combination of patient identifier + health data constitutes PHI under 45 CFR 160.103.

**Data elements:**
- Patient names (first, last, full) -- stored in `clinical.Patients` table
- Medical Record Numbers (MRN) -- unique per patient, indexed at `IX_Patients_MRN`
- Date of birth -- indexed at `IX_Patients_DOB`
- Diagnoses and medical conditions -- `clinical.MedicalConditions` with ICD codes
- Active medications and prescription history
- Lab results and imaging orders
- Assessment data (clinical decision support scores linked to patients)
- Allergy records -- `clinical.Allergies`
- Encounter notes and chief complaints -- `clinical.Encounters`
- Vital signs

**Implementation references:**
- Patient entity configuration: `backend/src/ATTENDING.Infrastructure/Data/Configurations/CoreConfigurations.cs` (PatientConfiguration)
- Assessment configurations: `backend/src/ATTENDING.Infrastructure/Data/Configurations/AssessmentConfigurations.cs`
- Order configurations: `backend/src/ATTENDING.Infrastructure/Data/Configurations/OrderConfigurations.cs`

| Requirement       | Specification                                                                 |
|--------------------|-------------------------------------------------------------------------------|
| **Storage**        | Azure SQL Database with TDE enabled; encrypted columns for SSN if stored      |
| **Encryption at rest** | AES-256 via Azure TDE (Transparent Data Encryption); Azure Key Vault managed keys |
| **Encryption in transit** | TLS 1.2+ enforced at App Service, SQL, Redis, and Front Door layers      |
| **Access controls** | RBAC via Azure AD B2C; role-based API middleware (`requireAuth`, `requireRole`); row-level tenant isolation via `OrganizationId` on every entity; emergency access requires explicit `EmergencyAccess` entity with justification and time-bound scope |
| **Retention period** | 6 years from last encounter date (per HIPAA 164.530(j)); 7 years for minors from age of majority per state law |
| **Disposal method** | Soft-delete with `DeletedAt`/`DeletedBy` audit fields (immediate); hard-delete after retention period via scheduled cleanup job; Azure Storage secure deletion with cryptographic erasure |
| **Logging**        | All PHI access logged via `AuditService.LogPhiAccessAsync()` with user ID, patient ID, resource type, and timestamp |

### Tier 2: PII (Personally Identifiable Information) - HIGH

Patient and provider personal information that does not directly relate to health conditions but can identify an individual.

**Data elements:**
- Email addresses -- `Users.Email`, `Patients.Email` (max 255 chars, unique index on users)
- Phone numbers -- `Patients.Phone` (max 20 chars)
- Mailing addresses -- `AddressLine1`, `AddressLine2`, `City`, `State`, `ZipCode` on Patient entity
- Insurance information
- Provider NPI numbers -- `Users.NPI` (max 10 chars, unique index with null filter)

| Requirement       | Specification                                                                 |
|--------------------|-------------------------------------------------------------------------------|
| **Storage**        | Azure SQL Database within the same tenant-isolated schema                     |
| **Encryption at rest** | AES-256 via Azure TDE                                                     |
| **Encryption in transit** | TLS 1.2+                                                               |
| **Access controls** | Same RBAC as PHI; PII fields masked in logs via `PhiMaskingDestructuringPolicy` (masks Email, Phone, AddressLine1/2, NPI, SSN) |
| **Retention period** | 6 years, aligned with PHI retention                                        |
| **Disposal method** | Same as PHI tier -- soft-delete then hard-delete after retention             |

### Tier 3: Clinical Metadata - MEDIUM

Clinical reference data that has no patient association. Useful for analytics and decision support but cannot identify any individual on its own.

**Data elements:**
- ICD-10 codes (without patient association) -- used in `MedicalConditions.Code`
- Drug interaction rules -- sourced from NIH via `NihDrugInteractionClient`
- Clinical decision support scores (aggregate, de-identified)
- Clinical guideline definitions -- `backend/src/ATTENDING.Domain/ClinicalGuidelines/`
- Red flag evaluation rules -- `backend/src/ATTENDING.Domain/Services/RedFlagEvaluator.cs`

| Requirement       | Specification                                                                 |
|--------------------|-------------------------------------------------------------------------------|
| **Storage**        | Azure SQL Database or application configuration files                         |
| **Encryption at rest** | AES-256 via Azure TDE (database); filesystem encryption for config files  |
| **Encryption in transit** | TLS 1.2+                                                               |
| **Access controls** | Authenticated users with clinical roles (PROVIDER, NURSE, ADMIN)             |
| **Retention period** | Indefinite -- reference data with no PHI exposure                            |
| **Disposal method** | Standard database deletion; no special erasure required                       |

### Tier 4: System Data - LOW

Operational data that supports system function. PHI is stripped or masked before storage at this tier.

**Data elements:**
- Application logs -- PHI masked via `PhiMaskingDestructuringPolicy` in Serilog pipeline
- Performance metrics and SLA monitoring -- `PerformanceMonitoringMiddleware`
- System configuration (non-secret)
- Health check responses -- `/health`, `/health/ready`, `/health/live`
- Rate limiting counters
- Idempotency keys -- `IdempotencyMiddleware`

**Implementation references:**
- PHI masking policy: `backend/src/ATTENDING.Orders.Api/Middleware/PhiSafeLoggingPolicy.cs`
- Masked fields: MRN, PatientName, FirstName, LastName, FullName, DateOfBirth, Dob, SSN, Phone, Email, AddressLine1/2, NPI, plus any property containing "phi", "password", "secret", "token", "connectionstring", or "apikey"
- PHI-safe request enricher strips query strings (which may contain PHI) and logs only the URL path

| Requirement       | Specification                                                                 |
|--------------------|-------------------------------------------------------------------------------|
| **Storage**        | Azure Monitor, Application Insights, Serilog sinks                            |
| **Encryption at rest** | Azure platform encryption (managed keys)                                  |
| **Encryption in transit** | TLS 1.2+                                                               |
| **Access controls** | Platform team with Azure RBAC; no clinical role access required              |
| **Retention period** | 90 days hot, 1 year warm, then purged (no PHI content)                      |
| **Disposal method** | Automated lifecycle policy; no special erasure required                       |

### Tier 5: Public Data - UNRESTRICTED

Information intended for public consumption with no sensitivity.

**Data elements:**
- Marketing content
- General medical education materials
- API documentation (Swagger/OpenAPI specs -- served only in Development/Testing environments)
- Public health check endpoints

| Requirement       | Specification                                                                 |
|--------------------|-------------------------------------------------------------------------------|
| **Storage**        | CDN, static hosting, public endpoints                                         |
| **Encryption at rest** | Not required (recommended for integrity)                                  |
| **Encryption in transit** | TLS 1.2+ (HSTS enforced with `max-age=31536000; includeSubDomains`)     |
| **Access controls** | None required; read-only public access                                       |
| **Retention period** | As needed                                                                    |
| **Disposal method** | Standard deletion                                                            |

---

## 2. Business Associate Agreement (BAA) Requirements

### 2.1 When a BAA Is Required

Under HIPAA 45 CFR 164.502(e) and 164.314(a), a Business Associate Agreement is required with **any subprocessor that creates, receives, maintains, or transmits PHI** on behalf of ATTENDING AI or its covered entity customers.

A BAA is required when a third-party service:
- Stores PHI (even transiently, e.g., in-memory processing)
- Transmits PHI between systems
- Has access to PHI for any operational purpose (backup, support, analytics)
- Provides infrastructure on which PHI resides (IaaS, PaaS, SaaS)

A BAA is **not** required for:
- Services that only process fully de-identified data per 45 CFR 164.514(b)
- Conduit-only services (e.g., ISPs, telecom carriers) per HHS guidance
- Services that handle only Tier 4/5 data (system logs with PHI masked, public data)

### 2.2 Required BAA Provisions per HIPAA 164.314(a)

Every BAA executed by ATTENDING AI must include the following provisions:

| # | Provision | HIPAA Reference | Required Language |
|---|-----------|-----------------|-------------------|
| 1 | Permitted uses and disclosures | 164.314(a)(2)(i) | BA may use/disclose PHI only as permitted by the agreement or required by law |
| 2 | Safeguards | 164.314(a)(2)(i)(B) | BA must implement appropriate safeguards to prevent unauthorized use/disclosure |
| 3 | Reporting | 164.314(a)(2)(i)(C) | BA must report any use/disclosure not provided for by the agreement, including breaches of unsecured PHI |
| 4 | Subcontractor agreements | 164.314(a)(2)(i)(D) | BA must ensure subcontractors agree to the same restrictions and conditions |
| 5 | Access to PHI | 164.314(a)(2)(i)(E) | BA must make PHI available to fulfill individual access rights under 164.524 |
| 6 | Amendment of PHI | 164.314(a)(2)(i)(F) | BA must accommodate amendments to PHI under 164.526 |
| 7 | Accounting of disclosures | 164.314(a)(2)(i)(G) | BA must provide information for accounting of disclosures under 164.528 |
| 8 | HHS access | 164.314(a)(2)(i)(H) | BA must make internal practices available to HHS for compliance determination |
| 9 | Return or destruction | 164.314(a)(2)(i)(I) | BA must return or destroy all PHI at termination |
| 10 | Breach notification | 164.314(a)(2)(i)(C) | BA must notify CE of breaches within contractually defined timeframe (max 60 days per HIPAA, target 24 hours) |

### 2.3 Current BAA Status - Cloud Services

| Service | Provider | PHI Exposure | BAA Status | BAA Mechanism | Review Date |
|---------|----------|-------------|------------|---------------|-------------|
| Azure SQL Database | Microsoft | **Yes** -- primary PHI data store | **Active** | Microsoft Online Services Terms (DPA + HIPAA BAA) | Annual at renewal |
| Azure App Service | Microsoft | **Yes** -- processes PHI in application memory | **Active** | Microsoft Online Services Terms | Annual at renewal |
| Azure Key Vault | Microsoft | **Yes** -- stores encryption keys protecting PHI | **Active** | Microsoft Online Services Terms | Annual at renewal |
| Azure Cache for Redis | Microsoft | **Yes** -- caches clinical data (encrypted, TTL-bound) | **Active** | Microsoft Online Services Terms | Annual at renewal |
| Azure Front Door | Microsoft | **Conduit** -- TLS termination, no PHI storage | **Active** | Microsoft Online Services Terms | Annual at renewal |
| Azure Blob Storage | Microsoft | **Yes** -- audit log archival containing PHI access records | **Active** | Microsoft Online Services Terms | Annual at renewal |
| Azure Monitor / App Insights | Microsoft | **No** -- receives only PHI-masked logs (Tier 4) | **Active** | Microsoft Online Services Terms | Annual at renewal |
| Azure AD B2C | Microsoft | **No** -- authentication tokens only, no PHI | **Active** | Microsoft Online Services Terms | Annual at renewal |
| AI/ML Services (if used) | Varies | **Evaluate per service** | **Pending evaluation** | Must be HIPAA-eligible Azure AI service | Before deployment |

**Microsoft HIPAA BAA note:** Microsoft provides a HIPAA BAA as part of the Online Services Terms for all HIPAA-eligible Azure services. The BAA covers services listed at [Microsoft Trust Center - HIPAA](https://www.microsoft.com/en-us/trust-center/compliance/hipaa). Ensure only HIPAA-eligible SKUs are deployed.

### 2.4 BAA Tracking Process

1. **Inventory update** -- Quarterly review of all subprocessors; any new service that may handle PHI triggers a BAA evaluation before deployment.
2. **Annual review** -- Each existing BAA is reviewed for compliance with current HIPAA requirements and ATTENDING AI security posture.
3. **Breach notification chain** -- Each BAA specifies:
   - BA notifies ATTENDING AI security team within 24 hours of discovering a breach
   - ATTENDING AI Privacy Officer is notified within 4 hours of BA notification
   - ATTENDING AI follows its own breach notification procedures (Section 3)
4. **Termination procedure** -- Upon BAA termination, the BA must certify destruction or return of all PHI within 30 days, or retain only as required by law with continued safeguards.

### 2.5 BAA Template Clause Checklist

Before executing any new BAA, verify the following clauses are present:

- [ ] Definition of PHI scope specific to the engagement
- [ ] Permitted uses limited to services contracted
- [ ] Prohibition on de-identification for BA's own use
- [ ] Minimum necessary standard acknowledgment
- [ ] Security incident and breach notification timeline (24-hour target)
- [ ] Breach notification content requirements (identifiers, description, mitigation)
- [ ] Subcontractor flow-down requirements
- [ ] Individual rights cooperation (access, amendment, accounting)
- [ ] HHS audit cooperation clause
- [ ] PHI return/destruction upon termination with certification
- [ ] Indemnification for breaches caused by BA negligence
- [ ] Insurance requirements (cyber liability minimum)
- [ ] Term, termination for cause (material breach), and survival clauses
- [ ] Governing law and dispute resolution

---

## 3. Breach Notification Procedures

### 3.1 Detection

ATTENDING AI employs multiple layers of breach detection aligned with HIPAA 164.308(a)(1)(ii)(D) (information system activity review):

**Automated monitoring:**
- Azure Monitor alerts on anomalous database query patterns (e.g., bulk SELECT on patient tables outside business hours)
- Application Insights anomaly detection on API response patterns
- Failed authentication spike detection -- consecutive 401/403 responses exceeding threshold trigger alert
- Audit log anomaly detection -- unusual PHI access volume per user flagged by scheduled analytics query
- Rate limiting violations logged by `AttendingRateLimiting` middleware

**Infrastructure monitoring:**
- Azure Security Center / Defender for Cloud threat detection on all Azure resources
- Network Security Group flow log analysis
- Azure SQL Threat Detection (SQL injection, anomalous access patterns)

**Implementation references:**
- Audit middleware: `backend/src/ATTENDING.Orders.Api/Middleware/Middleware.cs` (AuditMiddleware class)
- PHI access logging: `backend/src/ATTENDING.Infrastructure/Services/AuditService.cs` (LogPhiAccessAsync)
- IP verification: AuditMiddleware records verified TCP peer IP and claimed X-Forwarded-For separately for forensic integrity

### 3.2 Assessment

Upon detection of a potential breach, the following risk assessment determines whether notification is required under 45 CFR 164.402:

**Risk Assessment Matrix:**

| | Low Data Sensitivity (Tier 4-5) | Medium Data Sensitivity (Tier 3) | High Data Sensitivity (Tier 1-2: PHI/PII) |
|---|---|---|---|
| **Low probability of compromise** (encrypted, limited exposure) | Monitor only | Document internally | Document; Privacy Officer review |
| **Medium probability of compromise** (some indicators of access) | Document internally | Privacy Officer review | **Presumed breach** -- begin notification timeline |
| **High probability of compromise** (confirmed unauthorized access) | Privacy Officer review | **Presumed breach** -- begin notification timeline | **Confirmed breach** -- immediate notification timeline |

**Four-factor risk assessment** per HHS guidance (45 CFR 164.402(2)):
1. Nature and extent of PHI involved (types of identifiers, likelihood of re-identification)
2. Unauthorized person who used the PHI or to whom disclosure was made
3. Whether PHI was actually acquired or viewed (vs. opportunity only)
4. Extent to which risk has been mitigated (encryption, remote wipe, access revocation)

If the four-factor assessment does not demonstrate a low probability of compromise, the incident is treated as a breach requiring notification.

### 3.3 Notification Timeline

| Notification Target | Deadline | HIPAA Reference | Method |
|---------------------|----------|-----------------|--------|
| Internal security team | Immediate (< 1 hour from detection) | N/A (internal SLA) | PagerDuty alert + Slack #security-incidents channel |
| Privacy Officer | < 4 hours from detection | N/A (internal SLA) | Direct call + email with incident ID |
| ATTENDING AI executive leadership | < 24 hours from confirmation | N/A (internal SLA) | Briefing with incident report |
| HHS Office for Civil Rights (OCR) | Within 60 days of discovery | 164.408 | HHS breach portal (hhs.gov/hipaa); if < 500 individuals, may be reported in annual log |
| Affected individuals | Within 60 days of discovery | 164.404 | Written notice via first-class mail; email only if individual has consented to electronic notice |
| Media notification | Without unreasonable delay | 164.406 | Required if > 500 individuals affected in a single state or jurisdiction; prominent media outlet in the state |
| State Attorneys General | Per state law (varies) | State breach notification laws | Certified mail or state portal; concurrent with individual notice |

### 3.4 Incident Response Runbook Outline

**Phase 1: Identification (0-1 hours)**
1. Triage alert -- determine if event is a true positive
2. Assign incident commander from security team
3. Create incident ticket with unique ID and classification
4. Preserve evidence -- snapshot affected system state, export relevant audit logs

**Phase 2: Containment (1-4 hours)**
1. Isolate affected systems (network segmentation, disable compromised accounts)
2. Revoke compromised credentials (Azure AD B2C account disable, API key rotation)
3. Block attacking IP addresses at Azure Front Door / NSG level
4. Engage Azure support if infrastructure compromise suspected

**Phase 3: Assessment (4-24 hours)**
1. Determine scope -- which patients, which data elements, which time window
2. Pull audit logs from `AuditService` for affected users/patients/time range
   - `GetByPatientIdAsync()` for patient-scoped investigation
   - `GetByUserIdAsync()` for user-scoped investigation
3. Conduct four-factor risk assessment (Section 3.2)
4. Privacy Officer makes breach determination

**Phase 4: Notification (1-60 days)**
1. Prepare notification content per 164.404(c): description of breach, PHI types involved, steps individuals should take, what the organization is doing, contact information
2. Execute notifications per timeline (Section 3.3)
3. Offer identity protection services if SSN or financial data exposed

**Phase 5: Remediation (ongoing)**
1. Patch vulnerability or close attack vector
2. Implement additional controls to prevent recurrence
3. Update risk assessment documentation
4. Conduct staff re-training if human error was a factor

### 3.5 Post-Incident Review

Within 30 days of incident closure:
- Conduct blameless post-mortem with all involved parties
- Document root cause, contributing factors, and timeline
- Identify control gaps and remediation actions with owners and deadlines
- Update this compliance framework if policy gaps are identified
- Present findings to executive leadership
- File updated risk assessment with compliance documentation

---

## 4. Technical Safeguards Inventory

This section maps each HIPAA Security Rule technical safeguard to its implementation in ATTENDING AI. All references are to 45 CFR Part 164, Subpart C.

### 4.1 Access Control -- 164.312(a)(1)

**Standard:** Implement technical policies and procedures for systems that maintain ePHI to allow access only to authorized persons or software programs.

| Implementation | Details | Code Reference |
|----------------|---------|----------------|
| **NextAuth.js sessions** | Provider portal authenticates via NextAuth with session tokens; session validation on every API route | `apps/provider-portal/pages/api/auth/[...nextauth].ts` |
| **Azure AD B2C** | Production authentication via OIDC; JWT bearer validation on .NET API | `backend/src/ATTENDING.Orders.Api/Program.cs` (lines 117-138) |
| **RBAC enforcement** | Five roles: ADMIN, PROVIDER, NURSE, STAFF, PATIENT; role checked on every protected endpoint | `apps/provider-portal/lib/api/auth.ts` (`requireRole()`); `apps/provider-portal/lib/auth.ts` (`hasRole`, `isProvider`, `isClinicalStaff`) |
| **Multi-tenancy isolation** | Every entity has `OrganizationId`; auto-set on creation via `AuditSaveChangesInterceptor`; query filters prevent cross-tenant data access | `backend/src/ATTENDING.Infrastructure/Data/AuditSaveChangesInterceptor.cs` |
| **Emergency access** | Break-the-glass access with mandatory justification, time-bound scope, and full audit trail | `backend/src/ATTENDING.Domain/Entities/EmergencyAccess.cs`; `backend/src/ATTENDING.Application/Commands/EmergencyAccess/EmergencyAccessCommands.cs` |
| **Edge middleware** | NextAuth session token validated at the CDN edge before any page or API route is served | `apps/provider-portal/middleware.ts` |

### 4.2 Unique User Identification -- 164.312(a)(2)(i)

**Standard:** Assign a unique name and/or number for identifying and tracking user identity.

| Implementation | Details | Code Reference |
|----------------|---------|----------------|
| **UUID-based user IDs** | Every user has a globally unique `Id` (GUID); stored in `identity.Users` table | `backend/src/ATTENDING.Infrastructure/Data/Configurations/CoreConfigurations.cs` (UserConfiguration) |
| **Per-user audit trail** | Every state-changing operation records `UserId`, `UserEmail`, `UserRole`; every entity tracks `CreatedBy`, `ModifiedBy`, `DeletedBy` | `backend/src/ATTENDING.Infrastructure/Services/AuditService.cs`; `backend/src/ATTENDING.Infrastructure/Data/AuditSaveChangesInterceptor.cs` |
| **Azure AD Object ID** | External identity provider ID stored as `AzureAdObjectId` for SSO correlation | `CoreConfigurations.cs` -- `Users.AzureAdObjectId` (max 50 chars, indexed) |

### 4.3 Automatic Logoff -- 164.312(a)(2)(iii)

**Standard:** Implement electronic procedures that terminate an electronic session after a predetermined time of inactivity.

| Implementation | Details | Code Reference |
|----------------|---------|----------------|
| **Provider portal shift-aligned timeout** | Secure session management enforces 8-hour maximum session duration aligned with clinical shift patterns (provider-facing only) | `apps/shared/lib/auth/secureSession.ts` (HIPAA 164.312(a)(2)(iii) reference in header) |
| **Patient portal session** | 24-hour `maxAge` on NextAuth session cookie; patient-facing sessions use longer duration since patients access from personal devices outside clinical shifts | `apps/patient-portal/pages/api/auth/[...nextauth].ts` (line 69) |
| **Inactivity detection** | Session activity tracked via `lastActivityAt`; sessions marked invalid after inactivity threshold | `apps/shared/lib/auth/secureSession.ts` (SecureSession interface) |
| **Session revocation** | `User.isActive` checked on every JWT refresh; disabled accounts cannot maintain sessions | `apps/provider-portal/pages/api/auth/[...nextauth].ts` (post-login check) |
| **API session timeout** | Backend API sessions via JWT with configurable expiration; SignalR keep-alive at 15-second intervals with 30-second client timeout | `backend/src/ATTENDING.Orders.Api/Program.cs` (lines 57-62) |

### 4.4 Encryption and Decryption -- 164.312(a)(2)(iv)

**Standard:** Implement a mechanism to encrypt and decrypt ePHI.

| Layer | Implementation | Specification |
|-------|----------------|---------------|
| **Data at rest (database)** | Azure SQL Transparent Data Encryption (TDE) | AES-256; managed by Azure platform; keys in Azure Key Vault |
| **Data at rest (blob storage)** | Azure Storage Service Encryption | AES-256; used for audit log archival |
| **Data at rest (cache)** | Azure Cache for Redis encryption | At-rest encryption enabled; TLS-only connections |
| **Data in transit (external)** | TLS 1.2+ enforced | App Service minimum TLS version; Azure Front Door TLS policy; HSTS header with `max-age=31536000; includeSubDomains` |
| **Data in transit (internal)** | TLS 1.2+ between all Azure services | SQL connection encryption; Redis TLS; Key Vault HTTPS-only |
| **Session data** | Encrypted session tokens | `encryptData()`/`decryptData()` functions from `apps/shared/lib/security`; session fingerprinting for validation |
| **Secrets management** | Azure Key Vault | Production secrets loaded at startup; `DefaultAzureCredential` for authentication; Key Vault URI configured in `AzureKeyVault:Uri` |

**Implementation references:**
- Key Vault integration: `backend/src/ATTENDING.Orders.Api/Program.cs` (lines 20-27)
- Security headers (HSTS): `backend/src/ATTENDING.Orders.Api/Middleware/Middleware.cs` (SecurityHeadersMiddleware)
- Kestrel hardening: Server header suppressed (`AddServerHeader = false`), request body limited to 5 MB, header timeout 30 seconds

### 4.5 Audit Controls -- 164.312(b)

**Standard:** Implement hardware, software, and/or procedural mechanisms that record and examine activity in information systems that contain or use ePHI.

| Implementation | Details | Code Reference |
|----------------|---------|----------------|
| **AuditService** | HIPAA-compliant audit logging service; records userId, userEmail, userRole, action, entityType, entityId, patientId, ipAddress, userAgent, details, old/new values | `backend/src/ATTENDING.Infrastructure/Services/AuditService.cs` |
| **AuditMiddleware** | Automatically audits all state-changing operations (POST/PUT/PATCH/DELETE) on clinical endpoints and all GET requests to patient data | `backend/src/ATTENDING.Orders.Api/Middleware/Middleware.cs` (AuditMiddleware) |
| **EF Core interceptor** | Auto-populates `CreatedBy`/`ModifiedBy`/`DeletedBy` and `OrganizationId` on every database write; intercepts hard deletes and converts to soft deletes | `backend/src/ATTENDING.Infrastructure/Data/AuditSaveChangesInterceptor.cs` |
| **Frontend audit logging** | `createAuditLog()` records action, entityType, entityId, changes (JSON), ipAddress, userAgent via Prisma | `apps/provider-portal/lib/api/auth.ts` (lines 160-184) |
| **PHI access logging** | Dedicated `LogPhiAccessAsync()` method prefixes actions with `PHI_ACCESS:` for easy filtering | `AuditService.cs` (lines 55-93) |
| **Audit trail viewer** | UI component for compliance officers to review audit logs | `apps/provider-portal/components/intelligence/AuditTrailViewer.tsx` |
| **6-year retention** | Audit records retained for minimum 6 years per HIPAA 164.530(j); scheduled rotation at configurable `AUDIT_RETENTION_DAYS` (default 2555 days / ~7 years) | `apps/shared/lib/scheduler.ts` (line 271); `apps/shared/lib/softDeleteMiddleware.ts` |
| **Archival to Azure Blob** | Logs older than 90 days archived from database to Azure Blob Storage with tiered lifecycle: Hot (0-90 days) -> Cool (90-365 days) -> Archive (365+ days) -> Delete (6 years) | `apps/shared/lib/audit/archival.ts` |

### 4.6 Integrity -- 164.312(c)(1)

**Standard:** Implement policies and procedures to protect ePHI from improper alteration or destruction.

| Implementation | Details | Code Reference |
|----------------|---------|----------------|
| **Soft-delete** | All entities use soft-delete via `DeletedAt`/`DeletedBy` fields; hard deletes intercepted by EF Core and converted to soft deletes | `AuditSaveChangesInterceptor.cs` (line 64: `entry.State = EntityState.Modified; entry.Entity.SoftDelete(userId)`) |
| **Concurrency control** | Optimistic concurrency via `RowVersion`/concurrency tokens; `DbUpdateConcurrencyException` handled with 409 Conflict response | Migration: `backend/src/ATTENDING.Infrastructure/Migrations/20260223190102_AddConcurrencyAndSoftDelete.cs`; Exception handling: `Middleware.cs` (HandleConcurrencyExceptionAsync) |
| **Database constraints** | Foreign keys with `DeleteBehavior.Restrict` on critical relationships (Patient-Encounter, Provider-Encounter); cascading only where clinically appropriate (Patient-Allergies) | `CoreConfigurations.cs` |
| **CSRF protection** | SameSite cookie policy; CORS restricted to known origins; Anti-CSRF via framework defaults | `Program.cs` (CORS policy with explicit origins, `AllowCredentials()`) |
| **Input validation** | FluentValidation on all command handlers; request body size limited to 5 MB | `backend/src/ATTENDING.Application/Validators/`; `Program.cs` (Kestrel limits) |
| **Idempotency** | Idempotency middleware prevents duplicate clinical order creation from retry storms | `backend/src/ATTENDING.Orders.Api/Middleware/IdempotencyMiddleware.cs` |

### 4.7 Person or Entity Authentication -- 164.312(d)

**Standard:** Implement procedures to verify that a person or entity seeking access to ePHI is the one claimed.

| Implementation | Details | Code Reference |
|----------------|---------|----------------|
| **MFA via Azure AD B2C** | Multi-factor authentication enforced via Azure AD B2C user flows; configurable per-tenant MFA policies | `Program.cs` (Azure AD B2C JWT bearer configuration) |
| **PBKDF2 PIN verification** | Patient portal uses PIN-based verification with PBKDF2 hashing | Application-level PIN validation |
| **API key authentication** | Service-to-service auth via API keys; keys stored as SHA-256 hashes (never plaintext) | API key middleware |
| **Session fingerprinting** | Sessions bound to device fingerprint; fingerprint mismatch invalidates session | `apps/shared/lib/auth/secureSession.ts` (SecureSession.fingerprint) |
| **JWT validation** | Production: Azure AD B2C authority + audience validation; SignalR: query string token support for WebSocket upgrade | `Program.cs` (lines 117-138) |
| **Dev/production isolation** | Development authentication bypass (`DevAuthHandler`) only active when `Authentication:DevBypass=true` AND `IsDevelopment()` AND NOT `IsProduction()`; triple guard prevents accidental production bypass | `Program.cs` (lines 105-114) |

### 4.8 Transmission Security -- 164.312(e)(1)

**Standard:** Implement technical security measures to guard against unauthorized access to ePHI being transmitted over an electronic communications network.

| Layer | Implementation | Configuration |
|-------|----------------|---------------|
| **Azure App Service** | TLS 1.2 minimum enforced at platform level | Azure resource configuration |
| **Azure SQL Database** | Encrypted connections required; `Encrypt=True` in connection strings | Connection string policy |
| **Azure Cache for Redis** | TLS-only connections; non-SSL port disabled | Redis configuration |
| **Azure Front Door** | TLS 1.2 minimum; custom domain certificates via Azure-managed or Key Vault | Front Door TLS policy |
| **HTTPS redirect** | `app.UseHttpsRedirection()` forces all HTTP requests to HTTPS | `Program.cs` (line 338) |
| **HSTS** | `Strict-Transport-Security: max-age=31536000; includeSubDomains` on all responses | `SecurityHeadersMiddleware` in `Middleware.cs` |
| **Security headers** | `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Content-Security-Policy: default-src 'self'; frame-ancestors 'none'`, `Permissions-Policy: camera=(), microphone=(), geolocation=()` | `SecurityHeadersMiddleware` in `Middleware.cs` |
| **SignalR** | WebSocket connections authenticated via JWT query parameter; Redis backplane with channel prefix `attending:signalr:` | `Program.cs` (lines 57-73, 124-135) |
| **Forwarded headers** | Production: X-Forwarded-For/Proto accepted only from trusted proxy CIDRs (Azure Front Door); prevents IP spoofing for audit integrity | `Program.cs` (lines 248-290) |

---

## 5. Risk Assessment Schedule

Per HIPAA 164.308(a)(1)(ii)(A), ATTENDING AI conducts regular risk assessments to identify potential risks and vulnerabilities to the confidentiality, integrity, and availability of ePHI.

### 5.1 Annual Comprehensive Risk Assessment

**Frequency:** Annually, or upon significant system change
**Scope:** All systems, processes, and third parties that create, receive, maintain, or transmit ePHI
**Methodology:** NIST SP 800-30 (Guide for Conducting Risk Assessments)

**Assessment areas:**
1. Administrative safeguards (policies, training, contingency planning)
2. Physical safeguards (facility access, workstation security, device controls)
3. Technical safeguards (access controls, audit controls, integrity, transmission)
4. Organizational requirements (BAAs, policies, documentation)
5. Third-party/subprocessor risk
6. Emerging threats (new attack vectors, regulatory changes)

**Deliverables:**
- Risk register with likelihood, impact, and risk level for each finding
- Remediation plan with owners, deadlines, and acceptance criteria
- Executive summary for leadership and board reporting
- Updated policies and procedures as needed

### 5.2 Quarterly Vulnerability Scanning

**Frequency:** Quarterly
**Scope:** All externally-facing and internal infrastructure

**Activities:**
- Automated vulnerability scanning of Azure infrastructure
- Dependency scanning (NuGet, npm) for known CVEs
- Azure SQL vulnerability assessment
- Container image scanning (if applicable)
- Web application scanning (OWASP Top 10)

### 5.3 Continuous Automated Monitoring

**Frequency:** Real-time
**Implementation:**

| Monitor | Tool | Alert Threshold |
|---------|------|-----------------|
| Failed authentication attempts | Azure Monitor + audit logs | > 10 failures per user per 5 minutes |
| PHI access anomalies | Scheduled audit log analysis | > 2 standard deviations from user's baseline |
| SQL injection attempts | Azure SQL Threat Detection | Any detection |
| Unusual data export volume | Application-level monitoring | > 1000 records accessed in single session |
| Certificate expiration | Azure Key Vault + Monitor | 30 days before expiry |
| Service health degradation | Health check endpoints + Application Insights | Any `/health/ready` failure |

### 5.4 Pre-Deployment Security Review

**Trigger:** Every deployment to staging or production
**Gate:** CI/CD pipeline security scan must pass before deployment proceeds

**Checks:**
- Static analysis (code quality + security patterns)
- Dependency vulnerability scan (known CVEs with severity threshold)
- Secret scanning (prevent credentials in source code)
- Infrastructure-as-code review (Azure resource configurations)
- API contract validation (no unintentional PHI exposure in new endpoints)

---

## 6. Audit & Monitoring

### 6.1 Audit Log Locations

| Tier | Storage | Retention | Access Pattern | Purpose |
|------|---------|-----------|----------------|---------|
| **Hot** | Azure SQL Database (`AuditLogs` table) | 0-90 days | Real-time queries via `AuditService`, admin UI via `AuditTrailViewer` | Active investigations, compliance queries, user activity review |
| **Warm** | Azure Blob Storage (Cool tier, `phi-audit-logs` container) | 90-365 days | Batch queries, on-demand retrieval | Historical investigations, quarterly reviews |
| **Cold** | Azure Blob Storage (Archive tier) | 1-6 years | Rehydration required (hours); on-demand for regulatory requests | HIPAA retention compliance, OCR investigations |
| **Expired** | Securely deleted | After 6 years | N/A | Cryptographic erasure per retention policy |

**Implementation references:**
- Hot storage and querying: `backend/src/ATTENDING.Infrastructure/Services/AuditService.cs`
- Archival service: `apps/shared/lib/audit/archival.ts`
- Archival config: 1000-record batch size, `phi-audit-logs` container, configurable dry-run mode
- Retention enforcement: `apps/shared/lib/scheduler.ts` (audit-rotation job, `AUDIT_RETENTION_DAYS` env var, default 2555 days)

### 6.2 Immutability

- **Database tier:** Audit log records have no UPDATE or DELETE operations exposed through application code; `AuditService` only performs INSERT operations
- **Blob tier:** Azure Blob Storage immutability policy with time-based retention (WORM -- Write Once Read Many) configured for 6-year minimum
- **Soft-delete records:** Entities that are soft-deleted retain all audit fields (`DeletedAt`, `DeletedBy`) permanently; hard-delete only occurs after HIPAA retention period via the scheduled cleanup job with explicit logging: `"[SoftDelete] HARD DELETE: ${model}#${id} -- ensure HIPAA retention period has elapsed"`

### 6.3 Monitoring Stack

| Component | Role | Configuration |
|-----------|------|---------------|
| **Serilog** | Structured application logging with PHI masking | `PhiMaskingDestructuringPolicy` applied globally; `PhiSafeRequestEnricher` strips query strings; console sink + configurable external sinks via `appsettings.json` |
| **Azure Monitor** | Infrastructure-level metrics, alerts, and dashboards | CPU, memory, request rate, error rate, latency percentiles |
| **Application Insights** | APM, request tracing, dependency tracking, anomaly detection | Distributed tracing with correlation IDs; performance SLA monitoring |
| **OpenTelemetry** | Distributed tracing across services | Configured via `AddAttendingOpenTelemetry()` in `Program.cs`; MediatR behavior tracing via `TracingMediatorBehavior` |
| **Health checks** | Liveness and readiness probes | `/health` (full), `/health/ready` (database), `/health/live` (shallow); HealthChecks UI response format |

### 6.4 Alert Categories and Response SLAs

| Category | Severity | Examples | Response SLA | Escalation |
|----------|----------|----------|-------------|------------|
| **P0 - Security Breach** | Critical | Confirmed unauthorized PHI access, data exfiltration, credential compromise | Immediate (< 15 min acknowledge, < 1 hour containment) | Security team -> Privacy Officer -> Executive leadership -> Legal |
| **P1 - Security Threat** | High | Failed auth spike, SQL injection attempt, anomalous PHI access pattern | < 30 min acknowledge, < 4 hours resolution | Security team -> Privacy Officer |
| **P2 - Service Degradation** | High | Database failover, API error rate > 5%, health check failures | < 15 min acknowledge, < 2 hours resolution | On-call engineer -> Platform team lead |
| **P3 - Performance SLA** | Medium | API latency > threshold, cache hit rate drop, background job failures | < 1 hour acknowledge, < 8 hours resolution | On-call engineer |
| **P4 - Operational** | Low | Certificate approaching expiry, disk usage warning, dependency deprecation | < 24 hours acknowledge, scheduled remediation | Platform team |

### 6.5 Correlation and Tracing

Every request through the ATTENDING AI platform carries a correlation ID for end-to-end tracing:

- **Assignment:** `CorrelationIdMiddleware` assigns a GUID if no `X-Correlation-Id` header is present
- **Propagation:** Correlation ID stored in `HttpContext.Items["CorrelationId"]` and pushed to Serilog `LogContext`
- **Response:** Correlation ID returned in `X-Correlation-Id` response header for client-side correlation
- **Audit linkage:** Correlation ID included in audit log details, enabling linkage between request logs, audit entries, and distributed traces

**Implementation:** `backend/src/ATTENDING.Orders.Api/Middleware/Middleware.cs` (CorrelationIdMiddleware)

---

## Appendix A: Regulatory References

| Reference | Title | Relevance |
|-----------|-------|-----------|
| 45 CFR 164.302-318 | HIPAA Security Rule - Technical Safeguards | Section 4 of this document |
| 45 CFR 164.400-414 | HIPAA Breach Notification Rule | Section 3 of this document |
| 45 CFR 164.314(a) | Business Associate Contracts | Section 2 of this document |
| 45 CFR 164.530(j) | Retention of Documentation | 6-year retention requirement |
| 45 CFR 164.502(e) | Business Associate Requirements | Section 2.1 of this document |
| 45 CFR 164.514(b) | De-identification Standard | Data classification tier boundaries |
| NIST SP 800-30 | Guide for Conducting Risk Assessments | Section 5 methodology |
| NIST SP 800-66 | HIPAA Security Rule Implementation Guide | Overall framework alignment |

## Appendix B: Document Governance

- **Review frequency:** This document must be reviewed and updated at minimum annually, or upon any material change to ATTENDING AI architecture, subprocessors, or applicable regulations.
- **Approval authority:** Privacy Officer and CTO (or delegates) must approve all changes.
- **Distribution:** All personnel with access to PHI/PII must acknowledge this document annually.
- **Storage:** This document is version-controlled in the ATTENDING AI source repository at `docs/compliance/COMPLIANCE_FRAMEWORK.md`.
