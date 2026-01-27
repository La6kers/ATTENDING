-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "emailVerified" DATETIME,
    "name" TEXT,
    "image" TEXT,
    "password" TEXT,
    "role" TEXT NOT NULL DEFAULT 'PROVIDER',
    "specialty" TEXT,
    "npi" TEXT,
    "department" TEXT,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" DATETIME NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mrn" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "middleName" TEXT,
    "dateOfBirth" DATETIME NOT NULL,
    "gender" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "emergencyContact" TEXT,
    "emergencyPhone" TEXT,
    "insuranceId" TEXT,
    "insuranceName" TEXT,
    "primaryProviderId" TEXT,
    "preferredLanguage" TEXT DEFAULT 'en',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Allergy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "allergen" TEXT NOT NULL,
    "reaction" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'MILD',
    "type" TEXT NOT NULL DEFAULT 'DRUG',
    "onsetDate" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Allergy_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MedicalCondition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icdCode" TEXT,
    "onsetDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MedicalCondition_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PatientMedication" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "medicationName" TEXT NOT NULL,
    "genericName" TEXT,
    "dose" TEXT,
    "frequency" TEXT,
    "route" TEXT,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "prescriber" TEXT,
    "pharmacy" TEXT,
    "indication" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PatientMedication_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VitalSigns" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "encounterId" TEXT,
    "systolic" INTEGER,
    "diastolic" INTEGER,
    "heartRate" INTEGER,
    "respiratoryRate" INTEGER,
    "temperature" REAL,
    "temperatureUnit" TEXT DEFAULT 'F',
    "oxygenSaturation" INTEGER,
    "weight" REAL,
    "weightUnit" TEXT DEFAULT 'lbs',
    "height" REAL,
    "heightUnit" TEXT DEFAULT 'in',
    "painLevel" INTEGER,
    "bloodGlucose" INTEGER,
    "notes" TEXT,
    "recordedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedBy" TEXT,
    CONSTRAINT "VitalSigns_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VitalSigns_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Encounter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "visitType" TEXT NOT NULL DEFAULT 'OFFICE_VISIT',
    "chiefComplaint" TEXT,
    "scheduledAt" DATETIME,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "location" TEXT,
    "roomNumber" TEXT,
    "reasonForVisit" TEXT,
    "clinicalNotes" TEXT,
    "assessment" TEXT,
    "plan" TEXT,
    "followUpDate" DATETIME,
    "followUpNotes" TEXT,
    "billingCode" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Encounter_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Encounter_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EncounterDiagnosis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "encounterId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icdCode" TEXT,
    "probability" REAL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "evidence" TEXT NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EncounterDiagnosis_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PatientAssessment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "encounterId" TEXT,
    "sessionId" TEXT NOT NULL,
    "assignedProviderId" TEXT,
    "chiefComplaint" TEXT NOT NULL,
    "hpiOnset" TEXT,
    "hpiLocation" TEXT,
    "hpiDuration" TEXT,
    "hpiCharacter" TEXT,
    "hpiSeverity" INTEGER,
    "hpiAggravating" TEXT NOT NULL DEFAULT '[]',
    "hpiRelieving" TEXT NOT NULL DEFAULT '[]',
    "hpiAssociated" TEXT NOT NULL DEFAULT '[]',
    "hpiTiming" TEXT,
    "reviewOfSystems" TEXT,
    "medications" TEXT NOT NULL DEFAULT '[]',
    "allergies" TEXT NOT NULL DEFAULT '[]',
    "medicalHistory" TEXT NOT NULL DEFAULT '[]',
    "surgicalHistory" TEXT NOT NULL DEFAULT '[]',
    "familyHistory" TEXT,
    "socialHistory" TEXT,
    "urgencyLevel" TEXT NOT NULL DEFAULT 'STANDARD',
    "urgencyScore" INTEGER NOT NULL DEFAULT 0,
    "redFlags" TEXT NOT NULL DEFAULT '[]',
    "riskFactors" TEXT NOT NULL DEFAULT '[]',
    "differentialDx" TEXT,
    "aiRecommendations" TEXT NOT NULL DEFAULT '[]',
    "clinicalPearls" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "submittedAt" DATETIME,
    "reviewedAt" DATETIME,
    "completedAt" DATETIME,
    "providerNotes" TEXT,
    "confirmedDiagnoses" TEXT,
    "icdCodes" TEXT NOT NULL DEFAULT '[]',
    "treatmentPlan" TEXT,
    "followUpInstructions" TEXT,
    "ordersPlaced" TEXT NOT NULL DEFAULT '[]',
    "compassVersion" TEXT,
    "aiModelUsed" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PatientAssessment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PatientAssessment_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PatientAssessment_assignedProviderId_fkey" FOREIGN KEY ("assignedProviderId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LabOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "encounterId" TEXT NOT NULL,
    "orderedById" TEXT NOT NULL,
    "testCode" TEXT NOT NULL,
    "testName" TEXT NOT NULL,
    "category" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'ROUTINE',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "indication" TEXT,
    "specialInstructions" TEXT,
    "specimenType" TEXT,
    "collectionDate" DATETIME,
    "orderedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "collectedAt" DATETIME,
    "resultedAt" DATETIME,
    "notes" TEXT,
    CONSTRAINT "LabOrder_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LabOrder_orderedById_fkey" FOREIGN KEY ("orderedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LabResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "labOrderId" TEXT NOT NULL,
    "analyte" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "unit" TEXT,
    "referenceRange" TEXT,
    "isAbnormal" BOOLEAN NOT NULL DEFAULT false,
    "isCritical" BOOLEAN NOT NULL DEFAULT false,
    "interpretation" TEXT,
    "resultedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedBy" TEXT,
    "notes" TEXT,
    CONSTRAINT "LabResult_labOrderId_fkey" FOREIGN KEY ("labOrderId") REFERENCES "LabOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ImagingOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "encounterId" TEXT NOT NULL,
    "orderedById" TEXT NOT NULL,
    "studyType" TEXT NOT NULL,
    "studyName" TEXT NOT NULL,
    "bodyPart" TEXT,
    "laterality" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'ROUTINE',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "indication" TEXT NOT NULL,
    "clinicalHistory" TEXT,
    "contrast" BOOLEAN NOT NULL DEFAULT false,
    "contrastType" TEXT,
    "radiationDose" TEXT,
    "specialInstructions" TEXT,
    "orderedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduledAt" DATETIME,
    "performedAt" DATETIME,
    "readAt" DATETIME,
    "report" TEXT,
    "impression" TEXT,
    "findings" TEXT,
    "radiologist" TEXT,
    "facility" TEXT,
    "notes" TEXT,
    CONSTRAINT "ImagingOrder_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ImagingOrder_orderedById_fkey" FOREIGN KEY ("orderedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MedicationOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "encounterId" TEXT NOT NULL,
    "orderedById" TEXT NOT NULL,
    "medicationName" TEXT NOT NULL,
    "genericName" TEXT,
    "dose" TEXT NOT NULL,
    "doseUnit" TEXT,
    "frequency" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "duration" TEXT,
    "quantity" INTEGER,
    "refills" INTEGER DEFAULT 0,
    "indication" TEXT,
    "instructions" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "priority" TEXT NOT NULL DEFAULT 'ROUTINE',
    "isControlled" BOOLEAN NOT NULL DEFAULT false,
    "deaSchedule" TEXT,
    "pharmacy" TEXT,
    "dispenseAsWritten" BOOLEAN NOT NULL DEFAULT false,
    "priorAuthRequired" BOOLEAN NOT NULL DEFAULT false,
    "priorAuthStatus" TEXT,
    "orderedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "discontinuedAt" DATETIME,
    "discontinuedBy" TEXT,
    "discontinueReason" TEXT,
    "notes" TEXT,
    CONSTRAINT "MedicationOrder_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MedicationOrder_orderedById_fkey" FOREIGN KEY ("orderedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DrugInteraction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "medicationOrderId" TEXT NOT NULL,
    "interactingDrug" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "mechanism" TEXT,
    "management" TEXT,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedBy" TEXT,
    "acknowledgedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DrugInteraction_medicationOrderId_fkey" FOREIGN KEY ("medicationOrderId") REFERENCES "MedicationOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "encounterId" TEXT NOT NULL,
    "referringProviderId" TEXT NOT NULL,
    "specialty" TEXT NOT NULL,
    "urgency" TEXT NOT NULL DEFAULT 'ROUTINE',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reason" TEXT NOT NULL,
    "clinicalSummary" TEXT,
    "specificQuestions" TEXT,
    "preferredProvider" TEXT,
    "preferredFacility" TEXT,
    "insurancePreAuth" BOOLEAN NOT NULL DEFAULT false,
    "preAuthStatus" TEXT,
    "preAuthNumber" TEXT,
    "appointmentDate" DATETIME,
    "appointmentTime" TEXT,
    "consultNote" TEXT,
    "recommendations" TEXT,
    "followUpNeeded" BOOLEAN NOT NULL DEFAULT false,
    "orderedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" DATETIME,
    "scheduledAt" DATETIME,
    "completedAt" DATETIME,
    "notes" TEXT,
    CONSTRAINT "Referral_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Referral_referringProviderId_fkey" FOREIGN KEY ("referringProviderId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" DATETIME,
    "relatedType" TEXT,
    "relatedId" TEXT,
    "actionUrl" TEXT,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmergencyEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assessmentId" TEXT,
    "patientId" TEXT,
    "eventType" TEXT NOT NULL,
    "triggeredBy" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "protocol" TEXT NOT NULL,
    "autoOrders" TEXT NOT NULL DEFAULT '[]',
    "location" TEXT,
    "acknowledgedAt" DATETIME,
    "acknowledgedBy" TEXT,
    "resolvedAt" DATETIME,
    "resolvedBy" TEXT,
    "resolution" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "changes" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "sessionId" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClinicalProtocol" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "triggerCriteria" TEXT NOT NULL,
    "recommendedActions" TEXT NOT NULL,
    "labOrders" TEXT,
    "imagingOrders" TEXT,
    "medications" TEXT,
    "referrals" TEXT,
    "patientEducation" TEXT,
    "followUp" TEXT,
    "evidenceLevel" TEXT,
    "references" TEXT NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PatientEducationMaterial" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'text',
    "url" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "readingLevel" TEXT,
    "conditions" TEXT NOT NULL DEFAULT '[]',
    "keywords" TEXT NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TreatmentPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "encounterId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "diagnoses" TEXT NOT NULL DEFAULT '[]',
    "chiefComplaint" TEXT,
    "clinicalSummary" TEXT,
    "labOrderIds" TEXT NOT NULL DEFAULT '[]',
    "imagingOrderIds" TEXT NOT NULL DEFAULT '[]',
    "prescriptionIds" TEXT NOT NULL DEFAULT '[]',
    "referralIds" TEXT NOT NULL DEFAULT '[]',
    "followUpSchedule" TEXT NOT NULL DEFAULT '[]',
    "patientEducation" TEXT NOT NULL DEFAULT '[]',
    "returnPrecautions" TEXT NOT NULL DEFAULT '[]',
    "additionalInstructions" TEXT,
    "protocolApplied" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" DATETIME
);

-- CreateTable
CREATE TABLE "ProviderDirectory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "credentials" TEXT NOT NULL,
    "specialty" TEXT NOT NULL,
    "subspecialty" TEXT,
    "organization" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "fax" TEXT,
    "npi" TEXT,
    "acceptingNew" BOOLEAN NOT NULL DEFAULT true,
    "insurancesAccepted" TEXT NOT NULL DEFAULT '[]',
    "nextAvailableRoutine" TEXT,
    "nextAvailableUrgent" TEXT,
    "rating" REAL,
    "preferred" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_npi_key" ON "User"("npi");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_npi_idx" ON "User"("npi");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_mrn_key" ON "Patient"("mrn");

-- CreateIndex
CREATE INDEX "Patient_mrn_idx" ON "Patient"("mrn");

-- CreateIndex
CREATE INDEX "Patient_lastName_firstName_idx" ON "Patient"("lastName", "firstName");

-- CreateIndex
CREATE INDEX "Patient_dateOfBirth_idx" ON "Patient"("dateOfBirth");

-- CreateIndex
CREATE INDEX "Allergy_patientId_idx" ON "Allergy"("patientId");

-- CreateIndex
CREATE INDEX "MedicalCondition_patientId_idx" ON "MedicalCondition"("patientId");

-- CreateIndex
CREATE INDEX "PatientMedication_patientId_idx" ON "PatientMedication"("patientId");

-- CreateIndex
CREATE INDEX "VitalSigns_patientId_idx" ON "VitalSigns"("patientId");

-- CreateIndex
CREATE INDEX "VitalSigns_encounterId_idx" ON "VitalSigns"("encounterId");

-- CreateIndex
CREATE INDEX "VitalSigns_recordedAt_idx" ON "VitalSigns"("recordedAt");

-- CreateIndex
CREATE INDEX "Encounter_patientId_idx" ON "Encounter"("patientId");

-- CreateIndex
CREATE INDEX "Encounter_providerId_idx" ON "Encounter"("providerId");

-- CreateIndex
CREATE INDEX "Encounter_status_idx" ON "Encounter"("status");

-- CreateIndex
CREATE INDEX "Encounter_scheduledAt_idx" ON "Encounter"("scheduledAt");

-- CreateIndex
CREATE INDEX "EncounterDiagnosis_encounterId_idx" ON "EncounterDiagnosis"("encounterId");

-- CreateIndex
CREATE UNIQUE INDEX "PatientAssessment_encounterId_key" ON "PatientAssessment"("encounterId");

-- CreateIndex
CREATE UNIQUE INDEX "PatientAssessment_sessionId_key" ON "PatientAssessment"("sessionId");

-- CreateIndex
CREATE INDEX "PatientAssessment_patientId_idx" ON "PatientAssessment"("patientId");

-- CreateIndex
CREATE INDEX "PatientAssessment_status_idx" ON "PatientAssessment"("status");

-- CreateIndex
CREATE INDEX "PatientAssessment_urgencyLevel_idx" ON "PatientAssessment"("urgencyLevel");

-- CreateIndex
CREATE INDEX "PatientAssessment_submittedAt_idx" ON "PatientAssessment"("submittedAt");

-- CreateIndex
CREATE INDEX "LabOrder_encounterId_idx" ON "LabOrder"("encounterId");

-- CreateIndex
CREATE INDEX "LabOrder_orderedById_idx" ON "LabOrder"("orderedById");

-- CreateIndex
CREATE INDEX "LabOrder_status_idx" ON "LabOrder"("status");

-- CreateIndex
CREATE INDEX "LabOrder_priority_idx" ON "LabOrder"("priority");

-- CreateIndex
CREATE INDEX "LabResult_labOrderId_idx" ON "LabResult"("labOrderId");

-- CreateIndex
CREATE INDEX "ImagingOrder_encounterId_idx" ON "ImagingOrder"("encounterId");

-- CreateIndex
CREATE INDEX "ImagingOrder_orderedById_idx" ON "ImagingOrder"("orderedById");

-- CreateIndex
CREATE INDEX "ImagingOrder_status_idx" ON "ImagingOrder"("status");

-- CreateIndex
CREATE INDEX "MedicationOrder_encounterId_idx" ON "MedicationOrder"("encounterId");

-- CreateIndex
CREATE INDEX "MedicationOrder_orderedById_idx" ON "MedicationOrder"("orderedById");

-- CreateIndex
CREATE INDEX "MedicationOrder_status_idx" ON "MedicationOrder"("status");

-- CreateIndex
CREATE INDEX "DrugInteraction_medicationOrderId_idx" ON "DrugInteraction"("medicationOrderId");

-- CreateIndex
CREATE INDEX "Referral_encounterId_idx" ON "Referral"("encounterId");

-- CreateIndex
CREATE INDEX "Referral_referringProviderId_idx" ON "Referral"("referringProviderId");

-- CreateIndex
CREATE INDEX "Referral_status_idx" ON "Referral"("status");

-- CreateIndex
CREATE INDEX "Referral_specialty_idx" ON "Referral"("specialty");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "Notification"("type");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "EmergencyEvent_assessmentId_idx" ON "EmergencyEvent"("assessmentId");

-- CreateIndex
CREATE INDEX "EmergencyEvent_patientId_idx" ON "EmergencyEvent"("patientId");

-- CreateIndex
CREATE INDEX "EmergencyEvent_createdAt_idx" ON "EmergencyEvent"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "ClinicalProtocol_condition_idx" ON "ClinicalProtocol"("condition");

-- CreateIndex
CREATE INDEX "ClinicalProtocol_isActive_idx" ON "ClinicalProtocol"("isActive");

-- CreateIndex
CREATE INDEX "PatientEducationMaterial_category_idx" ON "PatientEducationMaterial"("category");

-- CreateIndex
CREATE UNIQUE INDEX "TreatmentPlan_encounterId_key" ON "TreatmentPlan"("encounterId");

-- CreateIndex
CREATE INDEX "TreatmentPlan_patientId_idx" ON "TreatmentPlan"("patientId");

-- CreateIndex
CREATE INDEX "TreatmentPlan_providerId_idx" ON "TreatmentPlan"("providerId");

-- CreateIndex
CREATE INDEX "TreatmentPlan_status_idx" ON "TreatmentPlan"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderDirectory_npi_key" ON "ProviderDirectory"("npi");

-- CreateIndex
CREATE INDEX "ProviderDirectory_specialty_idx" ON "ProviderDirectory"("specialty");

-- CreateIndex
CREATE INDEX "ProviderDirectory_subspecialty_idx" ON "ProviderDirectory"("subspecialty");

-- CreateIndex
CREATE INDEX "ProviderDirectory_acceptingNew_idx" ON "ProviderDirectory"("acceptingNew");

-- CreateIndex
CREATE INDEX "ProviderDirectory_preferred_idx" ON "ProviderDirectory"("preferred");
