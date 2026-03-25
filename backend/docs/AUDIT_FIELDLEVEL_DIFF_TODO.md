# HIPAA Audit Trail — Field-Level Diff (Known Gap)

**Severity:** Medium  
**Must complete before:** First production clinic go-live

## Current state

`AuditLog` has `OldValues` and `NewValues` columns — both are always `null`.

The audit trail currently proves:
- **Who** accessed or modified a patient record
- **When** the access occurred  
- **Which endpoint** was called (method + path)
- **What IP** the request came from (verified TCP peer, not spoofable XFF — fixed in this batch)

It cannot currently answer:
- "What specific fields were changed on this Patient record?"
- "What data was viewed in this GET response?"

Both are relevant to a HIPAA breach notification investigation (45 CFR §164.402).

## Why it is deferred

Capturing field-level diffs correctly requires reading EF `OriginalValues` and
`CurrentValues` from the `ChangeTracker` **before** `SaveChangesAsync` — wired
into `AuditSaveChangesInterceptor`.

The blocking complexity is **PHI field exclusion**: `OldValues`/`NewValues` must
never contain raw PHI (name, DOB, MRN, etc.) unless the audit log storage is
separately encrypted. Recording PHI in the audit log — which shares the same
backup/export pipeline — would expand the PHI surface rather than narrowing it.

## Implementation plan

1. Add a static allowlist of safe-to-log field names per entity type:
   IDs, status enums, timestamps, boolean flags — never name/DOB/MRN/address.
2. In `AuditSaveChangesInterceptor.SavingChangesAsync`, for `EntityState.Modified`
   entries, diff `OriginalValues` vs `CurrentValues`, include only allowlisted
   fields, serialize to JSON, write to `OldValues` / `NewValues`.
3. Add a Docker-category integration test: modify a status field on a Patient,
   assert `OldValues`/`NewValues` are populated and PHI-free.
4. Security review before GA to confirm the logged field set meets HIPAA audit
   requirements without expanding the PHI surface.

## Workaround until implemented

EF Core change history is available in the SQL Server transaction log for the
configured retention window. For breach investigations before this feature
lands, the DBA can query the transaction log directly.
