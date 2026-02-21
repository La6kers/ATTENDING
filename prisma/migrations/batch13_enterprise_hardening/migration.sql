-- ============================================================
-- ATTENDING AI - Batch 13: Enterprise Hardening Migration
-- prisma/migrations/batch13_enterprise_hardening/migration.sql
--
-- Changes:
--   1. Create Organization model
--   2. Add organizationId to all clinical models
--   3. Add proper enum types
--   4. Add indexes for tenant isolation
--
-- Run: npx prisma migrate deploy
-- ============================================================

-- 1. Create enum types
DO $$ BEGIN
  CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'PROVIDER', 'NURSE', 'STAFF', 'PATIENT', 'SYSTEM');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'COLLECTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ACTIVE', 'ON_HOLD', 'SCHEDULED', 'SENT', 'DISCONTINUED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "OrderPriority" AS ENUM ('STAT', 'ASAP', 'URGENT', 'ROUTINE', 'TIMED', 'ELECTIVE');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "EncounterStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "AssessmentStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED', 'EMERGENCY');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "EncounterType" AS ENUM ('OFFICE', 'TELEHEALTH', 'EMERGENCY', 'INPATIENT');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2. Create Organization table
CREATE TABLE IF NOT EXISTS "Organization" (
  "id"             TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "name"           TEXT NOT NULL,
  "slug"           TEXT NOT NULL,
  "type"           TEXT NOT NULL DEFAULT 'CLINIC',
  "npi"            TEXT,
  "taxId"          TEXT,
  "address"        TEXT,
  "city"           TEXT,
  "state"          TEXT,
  "zipCode"        TEXT,
  "phone"          TEXT,
  "faxNumber"      TEXT,
  "website"        TEXT,
  "ehrVendor"      TEXT,
  "fhirEndpoint"   TEXT,
  "tier"           TEXT NOT NULL DEFAULT 'standard',
  "isActive"       BOOLEAN NOT NULL DEFAULT true,
  "settings"       TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Organization_slug_key" ON "Organization"("slug");
CREATE INDEX IF NOT EXISTS "Organization_isActive_idx" ON "Organization"("isActive");
CREATE INDEX IF NOT EXISTS "Organization_tier_idx" ON "Organization"("tier");

-- 3. Add organizationId columns to all clinical models

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
CREATE INDEX IF NOT EXISTS "User_organizationId_idx" ON "User"("organizationId");

ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
CREATE INDEX IF NOT EXISTS "Patient_organizationId_idx" ON "Patient"("organizationId");

ALTER TABLE "Encounter" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
CREATE INDEX IF NOT EXISTS "Encounter_organizationId_idx" ON "Encounter"("organizationId");

ALTER TABLE "LabOrder" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
CREATE INDEX IF NOT EXISTS "LabOrder_organizationId_idx" ON "LabOrder"("organizationId");

ALTER TABLE "ImagingOrder" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
CREATE INDEX IF NOT EXISTS "ImagingOrder_organizationId_idx" ON "ImagingOrder"("organizationId");

ALTER TABLE "MedicationOrder" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
CREATE INDEX IF NOT EXISTS "MedicationOrder_organizationId_idx" ON "MedicationOrder"("organizationId");

ALTER TABLE "Referral" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
CREATE INDEX IF NOT EXISTS "Referral_organizationId_idx" ON "Referral"("organizationId");

ALTER TABLE "PatientAssessment" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
CREATE INDEX IF NOT EXISTS "PatientAssessment_organizationId_idx" ON "PatientAssessment"("organizationId");

ALTER TABLE "TreatmentPlan" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
CREATE INDEX IF NOT EXISTS "TreatmentPlan_organizationId_idx" ON "TreatmentPlan"("organizationId");

ALTER TABLE "ClinicalNote" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
CREATE INDEX IF NOT EXISTS "ClinicalNote_organizationId_idx" ON "ClinicalNote"("organizationId");

ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
CREATE INDEX IF NOT EXISTS "AuditLog_organizationId_idx" ON "AuditLog"("organizationId");

-- 4. Add foreign key constraints (idempotent)

DO $$ BEGIN
  ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "Patient" ADD CONSTRAINT "Patient_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "LabOrder" ADD CONSTRAINT "LabOrder_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "ImagingOrder" ADD CONSTRAINT "ImagingOrder_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "MedicationOrder" ADD CONSTRAINT "MedicationOrder_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "Referral" ADD CONSTRAINT "Referral_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "PatientAssessment" ADD CONSTRAINT "PatientAssessment_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "TreatmentPlan" ADD CONSTRAINT "TreatmentPlan_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "ClinicalNote" ADD CONSTRAINT "ClinicalNote_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ApiKey, WebhookSubscription, IntegrationConnection already have organizationId
DO $$ BEGIN
  ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "WebhookSubscription" ADD CONSTRAINT "WebhookSubscription_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "IntegrationConnection" ADD CONSTRAINT "IntegrationConnection_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 5. Seed default organization for existing data
INSERT INTO "Organization" ("id", "name", "slug", "type", "tier", "isActive", "updatedAt")
VALUES ('org_default', 'Default Organization', 'default', 'CLINIC', 'standard', true, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

-- 6. Backfill existing records
UPDATE "User" SET "organizationId" = 'org_default' WHERE "organizationId" IS NULL;
UPDATE "Patient" SET "organizationId" = 'org_default' WHERE "organizationId" IS NULL;
UPDATE "Encounter" SET "organizationId" = 'org_default' WHERE "organizationId" IS NULL;
UPDATE "LabOrder" SET "organizationId" = 'org_default' WHERE "organizationId" IS NULL;
UPDATE "ImagingOrder" SET "organizationId" = 'org_default' WHERE "organizationId" IS NULL;
UPDATE "MedicationOrder" SET "organizationId" = 'org_default' WHERE "organizationId" IS NULL;
UPDATE "Referral" SET "organizationId" = 'org_default' WHERE "organizationId" IS NULL;
UPDATE "PatientAssessment" SET "organizationId" = 'org_default' WHERE "organizationId" IS NULL;
UPDATE "TreatmentPlan" SET "organizationId" = 'org_default' WHERE "organizationId" IS NULL;
UPDATE "ClinicalNote" SET "organizationId" = 'org_default' WHERE "organizationId" IS NULL;
UPDATE "AuditLog" SET "organizationId" = 'org_default' WHERE "organizationId" IS NULL;
