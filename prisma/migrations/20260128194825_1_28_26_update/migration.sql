/*
  Warnings:

  - A unique constraint covering the columns `[fhirId]` on the table `Patient` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Patient" ADD COLUMN "fhirId" TEXT;
ALTER TABLE "Patient" ADD COLUMN "fhirVendor" TEXT;
ALTER TABLE "Patient" ADD COLUMN "lastFhirSync" DATETIME;

-- CreateTable
CREATE TABLE "FhirConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "providerId" TEXT NOT NULL,
    "vendor" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "patientId" TEXT,
    "encounterId" TEXT,
    "scope" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "OAuthState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "state" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "FhirLabResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "testName" TEXT NOT NULL,
    "testCode" TEXT,
    "value" TEXT NOT NULL,
    "unit" TEXT,
    "referenceRange" TEXT,
    "interpretation" TEXT,
    "status" TEXT NOT NULL DEFAULT 'FINAL',
    "collectedAt" DATETIME NOT NULL,
    "resultedAt" DATETIME NOT NULL,
    "performedBy" TEXT,
    "notes" TEXT,
    "fhirId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FhirLabResult_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FhirCondition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icdCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "onsetDate" DATETIME,
    "recordedDate" DATETIME NOT NULL,
    "notes" TEXT,
    "fhirId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FhirCondition_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FhirMedication" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "medicationName" TEXT NOT NULL,
    "genericName" TEXT,
    "dosage" TEXT,
    "frequency" TEXT,
    "route" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "prescribedDate" DATETIME NOT NULL,
    "prescriber" TEXT,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "notes" TEXT,
    "fhirId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FhirMedication_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FhirVitalSign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "unit" TEXT,
    "systolic" INTEGER,
    "diastolic" INTEGER,
    "recordedAt" DATETIME NOT NULL,
    "recordedBy" TEXT,
    "fhirId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FhirVitalSign_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FhirEncounter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "type" TEXT,
    "class" TEXT,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME,
    "reasonForVisit" TEXT,
    "fhirId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Allergy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "allergen" TEXT NOT NULL,
    "reaction" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'MILD',
    "type" TEXT NOT NULL DEFAULT 'DRUG',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "onsetDate" DATETIME,
    "fhirId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Allergy_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Allergy" ("allergen", "createdAt", "id", "isActive", "notes", "onsetDate", "patientId", "reaction", "severity", "type", "updatedAt") SELECT "allergen", "createdAt", "id", "isActive", "notes", "onsetDate", "patientId", "reaction", "severity", "type", "updatedAt" FROM "Allergy";
DROP TABLE "Allergy";
ALTER TABLE "new_Allergy" RENAME TO "Allergy";
CREATE INDEX "Allergy_patientId_idx" ON "Allergy"("patientId");
CREATE INDEX "Allergy_fhirId_idx" ON "Allergy"("fhirId");
CREATE UNIQUE INDEX "Allergy_patientId_allergen_key" ON "Allergy"("patientId", "allergen");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "FhirConnection_providerId_idx" ON "FhirConnection"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "FhirConnection_providerId_vendor_key" ON "FhirConnection"("providerId", "vendor");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthState_state_key" ON "OAuthState"("state");

-- CreateIndex
CREATE INDEX "OAuthState_state_idx" ON "OAuthState"("state");

-- CreateIndex
CREATE INDEX "OAuthState_expiresAt_idx" ON "OAuthState"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "FhirLabResult_fhirId_key" ON "FhirLabResult"("fhirId");

-- CreateIndex
CREATE INDEX "FhirLabResult_patientId_idx" ON "FhirLabResult"("patientId");

-- CreateIndex
CREATE INDEX "FhirLabResult_testCode_idx" ON "FhirLabResult"("testCode");

-- CreateIndex
CREATE INDEX "FhirLabResult_fhirId_idx" ON "FhirLabResult"("fhirId");

-- CreateIndex
CREATE UNIQUE INDEX "FhirCondition_fhirId_key" ON "FhirCondition"("fhirId");

-- CreateIndex
CREATE INDEX "FhirCondition_patientId_idx" ON "FhirCondition"("patientId");

-- CreateIndex
CREATE INDEX "FhirCondition_icdCode_idx" ON "FhirCondition"("icdCode");

-- CreateIndex
CREATE INDEX "FhirCondition_fhirId_idx" ON "FhirCondition"("fhirId");

-- CreateIndex
CREATE UNIQUE INDEX "FhirMedication_fhirId_key" ON "FhirMedication"("fhirId");

-- CreateIndex
CREATE INDEX "FhirMedication_patientId_idx" ON "FhirMedication"("patientId");

-- CreateIndex
CREATE INDEX "FhirMedication_fhirId_idx" ON "FhirMedication"("fhirId");

-- CreateIndex
CREATE UNIQUE INDEX "FhirVitalSign_fhirId_key" ON "FhirVitalSign"("fhirId");

-- CreateIndex
CREATE INDEX "FhirVitalSign_patientId_idx" ON "FhirVitalSign"("patientId");

-- CreateIndex
CREATE INDEX "FhirVitalSign_type_idx" ON "FhirVitalSign"("type");

-- CreateIndex
CREATE INDEX "FhirVitalSign_fhirId_idx" ON "FhirVitalSign"("fhirId");

-- CreateIndex
CREATE UNIQUE INDEX "FhirEncounter_fhirId_key" ON "FhirEncounter"("fhirId");

-- CreateIndex
CREATE INDEX "FhirEncounter_patientId_idx" ON "FhirEncounter"("patientId");

-- CreateIndex
CREATE INDEX "FhirEncounter_fhirId_idx" ON "FhirEncounter"("fhirId");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_fhirId_key" ON "Patient"("fhirId");

-- CreateIndex
CREATE INDEX "Patient_fhirId_idx" ON "Patient"("fhirId");
