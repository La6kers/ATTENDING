-- ============================================================
-- ATTENDING AI - Database Performance Optimization Migration
-- prisma/migrations/manual/add_composite_indexes.sql
--
-- Adds composite indexes for the two most common provider 
-- dashboard queries:
--   1. (patient_id, encounter_date) - patient timeline queries
--   2. (provider_id, status) - provider dashboard queue filtering
--
-- Expected impact: Reduce API p95 from ~45ms to <20ms
--
-- For SQLite dev: Run these after prisma migrate dev
-- For PostgreSQL prod: Run via psql or prisma db execute
-- ============================================================

-- ENCOUNTER COMPOSITE INDEXES
CREATE INDEX IF NOT EXISTS "idx_encounter_provider_status" 
  ON "Encounter" ("providerId", "status");

CREATE INDEX IF NOT EXISTS "idx_encounter_patient_date" 
  ON "Encounter" ("patientId", "startTime");

CREATE INDEX IF NOT EXISTS "idx_encounter_provider_status_time" 
  ON "Encounter" ("providerId", "status", "startTime");

-- LAB ORDER COMPOSITE INDEXES
CREATE INDEX IF NOT EXISTS "idx_laborder_provider_status" 
  ON "LabOrder" ("providerId", "status");

CREATE INDEX IF NOT EXISTS "idx_laborder_patient_date" 
  ON "LabOrder" ("patientId", "orderedAt");

-- IMAGING ORDER COMPOSITE INDEXES
CREATE INDEX IF NOT EXISTS "idx_imagingorder_provider_status" 
  ON "ImagingOrder" ("providerId", "status");

CREATE INDEX IF NOT EXISTS "idx_imagingorder_patient_date" 
  ON "ImagingOrder" ("patientId", "orderedAt");

-- MEDICATION ORDER COMPOSITE INDEXES
CREATE INDEX IF NOT EXISTS "idx_medorder_provider_status" 
  ON "MedicationOrder" ("providerId", "status");

CREATE INDEX IF NOT EXISTS "idx_medorder_patient_status" 
  ON "MedicationOrder" ("patientId", "status");

-- ASSESSMENT COMPOSITE INDEXES
CREATE INDEX IF NOT EXISTS "idx_assessment_provider_status" 
  ON "PatientAssessment" ("assignedProviderId", "status");

CREATE INDEX IF NOT EXISTS "idx_assessment_patient_recent" 
  ON "PatientAssessment" ("patientId", "status", "lastActivityAt");

-- AUDIT LOG COMPOSITE INDEXES
CREATE INDEX IF NOT EXISTS "idx_audit_user_time" 
  ON "AuditLog" ("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "idx_audit_entity_time" 
  ON "AuditLog" ("entityType", "entityId", "createdAt");

CREATE INDEX IF NOT EXISTS "idx_audit_action_time" 
  ON "AuditLog" ("action", "createdAt");

-- NOTIFICATION COMPOSITE INDEXES
CREATE INDEX IF NOT EXISTS "idx_notification_user_unread" 
  ON "Notification" ("userId", "read", "createdAt");

-- REFERRAL COMPOSITE INDEXES
CREATE INDEX IF NOT EXISTS "idx_referral_provider_status" 
  ON "Referral" ("providerId", "status");

CREATE INDEX IF NOT EXISTS "idx_referral_patient_date" 
  ON "Referral" ("patientId", "orderedAt");
