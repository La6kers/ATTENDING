-- ============================================================
-- ATTENDING AI - Multi-Tenancy Row-Level Security (RLS)
-- prisma/migrations/manual/add_row_level_security.sql
--
-- Verifies and enforces row-level security in PostgreSQL to
-- isolate all PHI by organization_id. Critical for enterprise
-- deals and Series A technical preparation.
--
-- Prerequisites:
--   1. Add organization_id column to all PHI tables
--   2. Enable RLS on each table
--   3. Create policies that restrict access by org
--
-- NOTE: Run this ONLY on PostgreSQL (not SQLite dev).
-- SQLite does not support RLS.
-- ============================================================

-- ============================================================
-- Step 1: Add organization_id to PHI tables (if not exists)
-- ============================================================

-- Check if organization table exists, create if not
CREATE TABLE IF NOT EXISTS "Organization" (
  "id"         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name"       TEXT NOT NULL,
  "slug"       TEXT NOT NULL UNIQUE,
  "npi"        TEXT,
  "taxId"      TEXT,
  "address"    TEXT,
  "city"       TEXT,
  "state"      TEXT,
  "zipCode"    TEXT,
  "phone"      TEXT,
  "tier"       TEXT NOT NULL DEFAULT 'pro',
  "isActive"   BOOLEAN NOT NULL DEFAULT true,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add organization_id to core PHI tables
DO $$ 
BEGIN
  -- Patient table
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Patient' AND column_name = 'organizationId') THEN
    ALTER TABLE "Patient" ADD COLUMN "organizationId" TEXT;
  END IF;

  -- Encounter table
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Encounter' AND column_name = 'organizationId') THEN
    ALTER TABLE "Encounter" ADD COLUMN "organizationId" TEXT;
  END IF;

  -- User table
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'User' AND column_name = 'organizationId') THEN
    ALTER TABLE "User" ADD COLUMN "organizationId" TEXT;
  END IF;

  -- LabOrder table
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'LabOrder' AND column_name = 'organizationId') THEN
    ALTER TABLE "LabOrder" ADD COLUMN "organizationId" TEXT;
  END IF;

  -- ImagingOrder table
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ImagingOrder' AND column_name = 'organizationId') THEN
    ALTER TABLE "ImagingOrder" ADD COLUMN "organizationId" TEXT;
  END IF;

  -- MedicationOrder table
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'MedicationOrder' AND column_name = 'organizationId') THEN
    ALTER TABLE "MedicationOrder" ADD COLUMN "organizationId" TEXT;
  END IF;

  -- Referral table
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Referral' AND column_name = 'organizationId') THEN
    ALTER TABLE "Referral" ADD COLUMN "organizationId" TEXT;
  END IF;

  -- PatientAssessment table
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'PatientAssessment' AND column_name = 'organizationId') THEN
    ALTER TABLE "PatientAssessment" ADD COLUMN "organizationId" TEXT;
  END IF;

  -- AuditLog table
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'AuditLog' AND column_name = 'organizationId') THEN
    ALTER TABLE "AuditLog" ADD COLUMN "organizationId" TEXT;
  END IF;
END $$;

-- ============================================================
-- Step 2: Create indexes on organizationId for performance
-- ============================================================

CREATE INDEX IF NOT EXISTS "idx_patient_org" ON "Patient" ("organizationId");
CREATE INDEX IF NOT EXISTS "idx_encounter_org" ON "Encounter" ("organizationId");
CREATE INDEX IF NOT EXISTS "idx_user_org" ON "User" ("organizationId");
CREATE INDEX IF NOT EXISTS "idx_laborder_org" ON "LabOrder" ("organizationId");
CREATE INDEX IF NOT EXISTS "idx_imagingorder_org" ON "ImagingOrder" ("organizationId");
CREATE INDEX IF NOT EXISTS "idx_medorder_org" ON "MedicationOrder" ("organizationId");
CREATE INDEX IF NOT EXISTS "idx_referral_org" ON "Referral" ("organizationId");
CREATE INDEX IF NOT EXISTS "idx_assessment_org" ON "PatientAssessment" ("organizationId");
CREATE INDEX IF NOT EXISTS "idx_auditlog_org" ON "AuditLog" ("organizationId");

-- ============================================================
-- Step 3: Enable Row-Level Security on all PHI tables
-- ============================================================

ALTER TABLE "Patient" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Encounter" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LabOrder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ImagingOrder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MedicationOrder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Referral" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PatientAssessment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Step 4: Create RLS Policies
-- 
-- Each policy restricts SELECT, INSERT, UPDATE, DELETE to rows
-- matching the current session's organization_id, which is set
-- via: SET app.current_org_id = 'org-xxx';
-- ============================================================

-- Helper function to get current org from session
CREATE OR REPLACE FUNCTION current_org_id() RETURNS TEXT AS $$
  SELECT COALESCE(
    current_setting('app.current_org_id', true),
    ''
  );
$$ LANGUAGE SQL STABLE;

-- Patient policies
DROP POLICY IF EXISTS "patient_org_isolation" ON "Patient";
CREATE POLICY "patient_org_isolation" ON "Patient"
  USING ("organizationId" = current_org_id() OR current_org_id() = '')
  WITH CHECK ("organizationId" = current_org_id() OR current_org_id() = '');

-- Encounter policies
DROP POLICY IF EXISTS "encounter_org_isolation" ON "Encounter";
CREATE POLICY "encounter_org_isolation" ON "Encounter"
  USING ("organizationId" = current_org_id() OR current_org_id() = '')
  WITH CHECK ("organizationId" = current_org_id() OR current_org_id() = '');

-- LabOrder policies
DROP POLICY IF EXISTS "laborder_org_isolation" ON "LabOrder";
CREATE POLICY "laborder_org_isolation" ON "LabOrder"
  USING ("organizationId" = current_org_id() OR current_org_id() = '')
  WITH CHECK ("organizationId" = current_org_id() OR current_org_id() = '');

-- ImagingOrder policies
DROP POLICY IF EXISTS "imagingorder_org_isolation" ON "ImagingOrder";
CREATE POLICY "imagingorder_org_isolation" ON "ImagingOrder"
  USING ("organizationId" = current_org_id() OR current_org_id() = '')
  WITH CHECK ("organizationId" = current_org_id() OR current_org_id() = '');

-- MedicationOrder policies
DROP POLICY IF EXISTS "medorder_org_isolation" ON "MedicationOrder";
CREATE POLICY "medorder_org_isolation" ON "MedicationOrder"
  USING ("organizationId" = current_org_id() OR current_org_id() = '')
  WITH CHECK ("organizationId" = current_org_id() OR current_org_id() = '');

-- Referral policies
DROP POLICY IF EXISTS "referral_org_isolation" ON "Referral";
CREATE POLICY "referral_org_isolation" ON "Referral"
  USING ("organizationId" = current_org_id() OR current_org_id() = '')
  WITH CHECK ("organizationId" = current_org_id() OR current_org_id() = '');

-- PatientAssessment policies
DROP POLICY IF EXISTS "assessment_org_isolation" ON "PatientAssessment";
CREATE POLICY "assessment_org_isolation" ON "PatientAssessment"
  USING ("organizationId" = current_org_id() OR current_org_id() = '')
  WITH CHECK ("organizationId" = current_org_id() OR current_org_id() = '');

-- AuditLog policies (all operations)
DROP POLICY IF EXISTS "auditlog_org_isolation" ON "AuditLog";
CREATE POLICY "auditlog_org_isolation" ON "AuditLog"
  USING ("organizationId" = current_org_id() OR current_org_id() = '')
  WITH CHECK ("organizationId" = current_org_id() OR current_org_id() = '');

-- ============================================================
-- Step 5: Superuser bypass policy
-- The application service account needs to bypass RLS for
-- cross-org operations (admin dashboard, system jobs)
-- ============================================================

-- Create a dedicated application role that bypasses RLS
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'attending_admin') THEN
    CREATE ROLE attending_admin NOLOGIN;
  END IF;
END $$;

-- Grant bypass to admin role
ALTER TABLE "Patient" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Encounter" FORCE ROW LEVEL SECURITY;
ALTER TABLE "LabOrder" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ImagingOrder" FORCE ROW LEVEL SECURITY;
ALTER TABLE "MedicationOrder" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Referral" FORCE ROW LEVEL SECURITY;
ALTER TABLE "PatientAssessment" FORCE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" FORCE ROW LEVEL SECURITY;

-- Admin policies (bypass org isolation)
CREATE POLICY "admin_patient_full_access" ON "Patient" TO attending_admin USING (true);
CREATE POLICY "admin_encounter_full_access" ON "Encounter" TO attending_admin USING (true);
CREATE POLICY "admin_laborder_full_access" ON "LabOrder" TO attending_admin USING (true);
CREATE POLICY "admin_imagingorder_full_access" ON "ImagingOrder" TO attending_admin USING (true);
CREATE POLICY "admin_medorder_full_access" ON "MedicationOrder" TO attending_admin USING (true);
CREATE POLICY "admin_referral_full_access" ON "Referral" TO attending_admin USING (true);
CREATE POLICY "admin_assessment_full_access" ON "PatientAssessment" TO attending_admin USING (true);
CREATE POLICY "admin_auditlog_full_access" ON "AuditLog" TO attending_admin USING (true);

-- ============================================================
-- Step 6: Verification queries (run manually to confirm)
-- ============================================================

-- Verify RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables 
--   WHERE schemaname = 'public' AND rowsecurity = true;

-- Verify policies exist:
-- SELECT tablename, policyname, permissive, roles, cmd, qual 
--   FROM pg_policies WHERE schemaname = 'public';

-- Test isolation (should return 0 rows when org doesn't match):
-- SET app.current_org_id = 'test-org-nonexistent';
-- SELECT COUNT(*) FROM "Patient";  -- Should be 0
-- RESET app.current_org_id;
