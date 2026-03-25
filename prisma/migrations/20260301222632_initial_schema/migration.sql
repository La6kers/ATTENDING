BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[Organization] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [slug] NVARCHAR(1000) NOT NULL,
    [type] NVARCHAR(1000) NOT NULL CONSTRAINT [Organization_type_df] DEFAULT 'CLINIC',
    [npi] NVARCHAR(1000),
    [taxId] NVARCHAR(1000),
    [address] NVARCHAR(1000),
    [city] NVARCHAR(1000),
    [state] NVARCHAR(1000),
    [zipCode] NVARCHAR(1000),
    [phone] NVARCHAR(1000),
    [faxNumber] NVARCHAR(1000),
    [website] NVARCHAR(1000),
    [ehrVendor] NVARCHAR(1000),
    [fhirEndpoint] NVARCHAR(1000),
    [tier] NVARCHAR(1000) NOT NULL CONSTRAINT [Organization_tier_df] DEFAULT 'standard',
    [isActive] BIT NOT NULL CONSTRAINT [Organization_isActive_df] DEFAULT 1,
    [settings] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Organization_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Organization_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Organization_slug_key] UNIQUE NONCLUSTERED ([slug])
);

-- CreateTable
CREATE TABLE [dbo].[User] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000),
    [email] NVARCHAR(1000) NOT NULL,
    [emailVerified] DATETIME2,
    [name] NVARCHAR(1000),
    [image] NVARCHAR(1000),
    [password] NVARCHAR(1000),
    [role] NVARCHAR(1000) NOT NULL CONSTRAINT [User_role_df] DEFAULT 'PROVIDER',
    [specialty] NVARCHAR(1000),
    [npi] NVARCHAR(1000),
    [deaNumber] NVARCHAR(1000),
    [department] NVARCHAR(1000),
    [phone] NVARCHAR(1000),
    [isActive] BIT NOT NULL CONSTRAINT [User_isActive_df] DEFAULT 1,
    [mfaEnabled] BIT NOT NULL CONSTRAINT [User_mfaEnabled_df] DEFAULT 0,
    [mfaSecret] NVARCHAR(1000),
    [lastLoginAt] DATETIME2,
    [failedLoginAttempts] INT NOT NULL CONSTRAINT [User_failedLoginAttempts_df] DEFAULT 0,
    [lockedUntil] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [User_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [User_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [User_email_key] UNIQUE NONCLUSTERED ([email]),
    CONSTRAINT [User_npi_key] UNIQUE NONCLUSTERED ([npi])
);

-- CreateTable
CREATE TABLE [dbo].[Account] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [type] NVARCHAR(1000) NOT NULL,
    [provider] NVARCHAR(1000) NOT NULL,
    [providerAccountId] NVARCHAR(1000) NOT NULL,
    [refresh_token] NVARCHAR(max),
    [access_token] NVARCHAR(max),
    [expires_at] INT,
    [token_type] NVARCHAR(1000),
    [scope] NVARCHAR(1000),
    [id_token] NVARCHAR(max),
    [session_state] NVARCHAR(1000),
    CONSTRAINT [Account_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Account_provider_providerAccountId_key] UNIQUE NONCLUSTERED ([provider],[providerAccountId])
);

-- CreateTable
CREATE TABLE [dbo].[Session] (
    [id] NVARCHAR(1000) NOT NULL,
    [sessionToken] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [expires] DATETIME2 NOT NULL,
    [ipAddress] NVARCHAR(1000),
    [userAgent] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Session_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Session_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Session_sessionToken_key] UNIQUE NONCLUSTERED ([sessionToken])
);

-- CreateTable
CREATE TABLE [dbo].[VerificationToken] (
    [identifier] NVARCHAR(1000) NOT NULL,
    [token] NVARCHAR(1000) NOT NULL,
    [expires] DATETIME2 NOT NULL,
    CONSTRAINT [VerificationToken_token_key] UNIQUE NONCLUSTERED ([token]),
    CONSTRAINT [VerificationToken_identifier_token_key] UNIQUE NONCLUSTERED ([identifier],[token])
);

-- CreateTable
CREATE TABLE [dbo].[Patient] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000),
    [mrn] NVARCHAR(1000) NOT NULL,
    [firstName] NVARCHAR(1000) NOT NULL,
    [lastName] NVARCHAR(1000) NOT NULL,
    [middleName] NVARCHAR(1000),
    [dateOfBirth] DATETIME2 NOT NULL,
    [gender] NVARCHAR(1000),
    [sex] NVARCHAR(1000),
    [email] NVARCHAR(1000),
    [phone] NVARCHAR(1000),
    [address] NVARCHAR(1000),
    [city] NVARCHAR(1000),
    [state] NVARCHAR(1000),
    [zipCode] NVARCHAR(1000),
    [emergencyContact] NVARCHAR(1000),
    [emergencyPhone] NVARCHAR(1000),
    [insuranceProvider] NVARCHAR(1000),
    [insurancePolicyNum] NVARCHAR(1000),
    [preferredLanguage] NVARCHAR(1000) NOT NULL CONSTRAINT [Patient_preferredLanguage_df] DEFAULT 'en',
    [isActive] BIT NOT NULL CONSTRAINT [Patient_isActive_df] DEFAULT 1,
    [deletedAt] DATETIME2,
    [deletedBy] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Patient_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Patient_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Patient_mrn_key] UNIQUE NONCLUSTERED ([mrn])
);

-- CreateTable
CREATE TABLE [dbo].[Encounter] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000),
    [patientId] NVARCHAR(1000) NOT NULL,
    [providerId] NVARCHAR(1000) NOT NULL,
    [facilityId] NVARCHAR(1000),
    [encounterType] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [Encounter_status_df] DEFAULT 'IN_PROGRESS',
    [chiefComplaint] NVARCHAR(1000),
    [startTime] DATETIME2 NOT NULL CONSTRAINT [Encounter_startTime_df] DEFAULT CURRENT_TIMESTAMP,
    [endTime] DATETIME2,
    [notes] NVARCHAR(max),
    [diagnosis] NVARCHAR(max),
    [deletedAt] DATETIME2,
    [deletedBy] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Encounter_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Encounter_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Allergy] (
    [id] NVARCHAR(1000) NOT NULL,
    [patientId] NVARCHAR(1000) NOT NULL,
    [allergen] NVARCHAR(1000) NOT NULL,
    [reaction] NVARCHAR(1000),
    [severity] NVARCHAR(1000),
    [onsetDate] DATETIME2,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [Allergy_status_df] DEFAULT 'ACTIVE',
    [verifiedAt] DATETIME2,
    [notes] NVARCHAR(max),
    [deletedAt] DATETIME2,
    [deletedBy] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Allergy_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Allergy_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Condition] (
    [id] NVARCHAR(1000) NOT NULL,
    [patientId] NVARCHAR(1000) NOT NULL,
    [icdCode] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [Condition_status_df] DEFAULT 'ACTIVE',
    [onsetDate] DATETIME2,
    [abatementDate] DATETIME2,
    [isPrimary] BIT NOT NULL CONSTRAINT [Condition_isPrimary_df] DEFAULT 0,
    [notes] NVARCHAR(max),
    [deletedAt] DATETIME2,
    [deletedBy] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Condition_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Condition_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Medication] (
    [id] NVARCHAR(1000) NOT NULL,
    [patientId] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [genericName] NVARCHAR(1000),
    [rxnormCode] NVARCHAR(1000),
    [ndcCode] NVARCHAR(1000),
    [dose] NVARCHAR(1000),
    [frequency] NVARCHAR(1000),
    [route] NVARCHAR(1000),
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [Medication_status_df] DEFAULT 'ACTIVE',
    [startDate] DATETIME2,
    [endDate] DATETIME2,
    [prescribedBy] NVARCHAR(1000),
    [pharmacy] NVARCHAR(1000),
    [notes] NVARCHAR(max),
    [deletedAt] DATETIME2,
    [deletedBy] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Medication_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Medication_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[VitalSign] (
    [id] NVARCHAR(1000) NOT NULL,
    [patientId] NVARCHAR(1000) NOT NULL,
    [encounterId] NVARCHAR(1000),
    [heartRate] INT,
    [bloodPressureSystolic] INT,
    [bloodPressureDiastolic] INT,
    [respiratoryRate] INT,
    [temperature] FLOAT(53),
    [temperatureUnit] NVARCHAR(1000) NOT NULL CONSTRAINT [VitalSign_temperatureUnit_df] DEFAULT 'F',
    [oxygenSaturation] FLOAT(53),
    [weight] FLOAT(53),
    [weightUnit] NVARCHAR(1000) NOT NULL CONSTRAINT [VitalSign_weightUnit_df] DEFAULT 'lbs',
    [height] FLOAT(53),
    [heightUnit] NVARCHAR(1000) NOT NULL CONSTRAINT [VitalSign_heightUnit_df] DEFAULT 'in',
    [painLevel] INT,
    [bloodGlucose] FLOAT(53),
    [notes] NVARCHAR(max),
    [recordedAt] DATETIME2 NOT NULL CONSTRAINT [VitalSign_recordedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [recordedBy] NVARCHAR(1000),
    [deletedAt] DATETIME2,
    [deletedBy] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [VitalSign_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [VitalSign_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[LabOrder] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000),
    [patientId] NVARCHAR(1000) NOT NULL,
    [providerId] NVARCHAR(1000) NOT NULL,
    [encounterId] NVARCHAR(1000),
    [orderNumber] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [LabOrder_status_df] DEFAULT 'PENDING',
    [priority] NVARCHAR(1000) NOT NULL CONSTRAINT [LabOrder_priority_df] DEFAULT 'ROUTINE',
    [tests] NVARCHAR(max) NOT NULL,
    [diagnosis] NVARCHAR(max),
    [indication] NVARCHAR(1000),
    [specialInstructions] NVARCHAR(max),
    [specimenType] NVARCHAR(1000),
    [collectionDate] DATETIME2,
    [fasting] BIT NOT NULL CONSTRAINT [LabOrder_fasting_df] DEFAULT 0,
    [orderedAt] DATETIME2 NOT NULL CONSTRAINT [LabOrder_orderedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [completedAt] DATETIME2,
    [deletedAt] DATETIME2,
    [deletedBy] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [LabOrder_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [LabOrder_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [LabOrder_orderNumber_key] UNIQUE NONCLUSTERED ([orderNumber])
);

-- CreateTable
CREATE TABLE [dbo].[LabResult] (
    [id] NVARCHAR(1000) NOT NULL,
    [patientId] NVARCHAR(1000) NOT NULL,
    [labOrderId] NVARCHAR(1000),
    [testCode] NVARCHAR(1000) NOT NULL,
    [testName] NVARCHAR(1000) NOT NULL,
    [loincCode] NVARCHAR(1000),
    [value] NVARCHAR(1000) NOT NULL,
    [unit] NVARCHAR(1000),
    [referenceRange] NVARCHAR(1000),
    [interpretation] NVARCHAR(1000),
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [LabResult_status_df] DEFAULT 'FINAL',
    [performedAt] DATETIME2,
    [reportedAt] DATETIME2 NOT NULL CONSTRAINT [LabResult_reportedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [notes] NVARCHAR(max),
    [deletedAt] DATETIME2,
    [deletedBy] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [LabResult_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [LabResult_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ImagingOrder] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000),
    [patientId] NVARCHAR(1000) NOT NULL,
    [providerId] NVARCHAR(1000) NOT NULL,
    [encounterId] NVARCHAR(1000),
    [orderNumber] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [ImagingOrder_status_df] DEFAULT 'PENDING',
    [priority] NVARCHAR(1000) NOT NULL CONSTRAINT [ImagingOrder_priority_df] DEFAULT 'ROUTINE',
    [studyType] NVARCHAR(1000) NOT NULL,
    [studyName] NVARCHAR(1000) NOT NULL,
    [bodyPart] NVARCHAR(1000) NOT NULL,
    [laterality] NVARCHAR(1000),
    [indication] NVARCHAR(max) NOT NULL,
    [clinicalHistory] NVARCHAR(max),
    [contrast] BIT NOT NULL CONSTRAINT [ImagingOrder_contrast_df] DEFAULT 0,
    [contrastType] NVARCHAR(1000),
    [specialInstructions] NVARCHAR(max),
    [diagnosis] NVARCHAR(max),
    [scheduledDate] DATETIME2,
    [orderedAt] DATETIME2 NOT NULL CONSTRAINT [ImagingOrder_orderedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [completedAt] DATETIME2,
    [deletedAt] DATETIME2,
    [deletedBy] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ImagingOrder_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [ImagingOrder_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ImagingOrder_orderNumber_key] UNIQUE NONCLUSTERED ([orderNumber])
);

-- CreateTable
CREATE TABLE [dbo].[ImagingResult] (
    [id] NVARCHAR(1000) NOT NULL,
    [patientId] NVARCHAR(1000) NOT NULL,
    [imagingOrderId] NVARCHAR(1000),
    [studyType] NVARCHAR(1000) NOT NULL,
    [studyName] NVARCHAR(1000) NOT NULL,
    [findings] NVARCHAR(max) NOT NULL,
    [impression] NVARCHAR(max),
    [radiologistId] NVARCHAR(1000),
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [ImagingResult_status_df] DEFAULT 'FINAL',
    [performedAt] DATETIME2,
    [reportedAt] DATETIME2 NOT NULL CONSTRAINT [ImagingResult_reportedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [deletedAt] DATETIME2,
    [deletedBy] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ImagingResult_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [ImagingResult_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[MedicationOrder] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000),
    [patientId] NVARCHAR(1000) NOT NULL,
    [providerId] NVARCHAR(1000) NOT NULL,
    [encounterId] NVARCHAR(1000),
    [orderNumber] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [MedicationOrder_status_df] DEFAULT 'ACTIVE',
    [medicationName] NVARCHAR(1000) NOT NULL,
    [genericName] NVARCHAR(1000),
    [rxnormCode] NVARCHAR(1000),
    [ndcCode] NVARCHAR(1000),
    [dose] NVARCHAR(1000) NOT NULL,
    [doseUnit] NVARCHAR(1000),
    [frequency] NVARCHAR(1000) NOT NULL,
    [route] NVARCHAR(1000) NOT NULL,
    [duration] NVARCHAR(1000),
    [quantity] INT,
    [refills] INT NOT NULL CONSTRAINT [MedicationOrder_refills_df] DEFAULT 0,
    [indication] NVARCHAR(max) NOT NULL,
    [instructions] NVARCHAR(max),
    [isControlled] BIT NOT NULL CONSTRAINT [MedicationOrder_isControlled_df] DEFAULT 0,
    [deaSchedule] NVARCHAR(1000),
    [dispenseAsWritten] BIT NOT NULL CONSTRAINT [MedicationOrder_dispenseAsWritten_df] DEFAULT 0,
    [substitutionAllowed] BIT NOT NULL CONSTRAINT [MedicationOrder_substitutionAllowed_df] DEFAULT 1,
    [priorAuthRequired] BIT NOT NULL CONSTRAINT [MedicationOrder_priorAuthRequired_df] DEFAULT 0,
    [priorAuthStatus] NVARCHAR(1000),
    [diagnosis] NVARCHAR(max),
    [pharmacy] NVARCHAR(1000),
    [pharmacyNpi] NVARCHAR(1000),
    [orderedAt] DATETIME2 NOT NULL CONSTRAINT [MedicationOrder_orderedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [discontinuedAt] DATETIME2,
    [discontinuedReason] NVARCHAR(1000),
    [deletedAt] DATETIME2,
    [deletedBy] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [MedicationOrder_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [MedicationOrder_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [MedicationOrder_orderNumber_key] UNIQUE NONCLUSTERED ([orderNumber])
);

-- CreateTable
CREATE TABLE [dbo].[Referral] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000),
    [patientId] NVARCHAR(1000) NOT NULL,
    [providerId] NVARCHAR(1000) NOT NULL,
    [encounterId] NVARCHAR(1000),
    [orderNumber] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [Referral_status_df] DEFAULT 'PENDING',
    [urgency] NVARCHAR(1000) NOT NULL CONSTRAINT [Referral_urgency_df] DEFAULT 'ROUTINE',
    [specialty] NVARCHAR(1000) NOT NULL,
    [subspecialty] NVARCHAR(1000),
    [reason] NVARCHAR(max) NOT NULL,
    [clinicalSummary] NVARCHAR(max),
    [specificQuestions] NVARCHAR(max),
    [preferredProvider] NVARCHAR(1000),
    [preferredFacility] NVARCHAR(1000),
    [diagnosis] NVARCHAR(max),
    [insurancePreAuth] BIT NOT NULL CONSTRAINT [Referral_insurancePreAuth_df] DEFAULT 0,
    [preAuthStatus] NVARCHAR(1000),
    [scheduledDate] DATETIME2,
    [orderedAt] DATETIME2 NOT NULL CONSTRAINT [Referral_orderedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [completedAt] DATETIME2,
    [consultNote] NVARCHAR(max),
    [deletedAt] DATETIME2,
    [deletedBy] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Referral_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Referral_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Referral_orderNumber_key] UNIQUE NONCLUSTERED ([orderNumber])
);

-- CreateTable
CREATE TABLE [dbo].[PatientAssessment] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000),
    [patientId] NVARCHAR(1000) NOT NULL,
    [assignedProviderId] NVARCHAR(1000),
    [sessionId] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [PatientAssessment_status_df] DEFAULT 'IN_PROGRESS',
    [phase] NVARCHAR(1000) NOT NULL CONSTRAINT [PatientAssessment_phase_df] DEFAULT 'GREETING',
    [chiefComplaint] NVARCHAR(max),
    [symptoms] NVARCHAR(max),
    [hpiNarrative] NVARCHAR(max),
    [reviewOfSystems] NVARCHAR(max),
    [medicalHistory] NVARCHAR(max),
    [medications] NVARCHAR(max),
    [allergies] NVARCHAR(max),
    [vitalSigns] NVARCHAR(max),
    [triageLevel] NVARCHAR(1000),
    [redFlagsDetected] NVARCHAR(max),
    [aiSummary] NVARCHAR(max),
    [aiDifferential] NVARCHAR(max),
    [conversation] NVARCHAR(max),
    [startedAt] DATETIME2 NOT NULL CONSTRAINT [PatientAssessment_startedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [completedAt] DATETIME2,
    [lastActivityAt] DATETIME2 NOT NULL CONSTRAINT [PatientAssessment_lastActivityAt_df] DEFAULT CURRENT_TIMESTAMP,
    [deletedAt] DATETIME2,
    [deletedBy] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [PatientAssessment_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [PatientAssessment_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [PatientAssessment_sessionId_key] UNIQUE NONCLUSTERED ([sessionId])
);

-- CreateTable
CREATE TABLE [dbo].[EmergencyEvent] (
    [id] NVARCHAR(1000) NOT NULL,
    [patientId] NVARCHAR(1000) NOT NULL,
    [assessmentId] NVARCHAR(1000),
    [eventType] NVARCHAR(1000) NOT NULL,
    [severity] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(max) NOT NULL,
    [triggeredBy] NVARCHAR(1000) NOT NULL,
    [symptoms] NVARCHAR(max),
    [vitalSigns] NVARCHAR(max),
    [location] NVARCHAR(1000),
    [acknowledgedAt] DATETIME2,
    [acknowledgedBy] NVARCHAR(1000),
    [resolvedAt] DATETIME2,
    [resolvedBy] NVARCHAR(1000),
    [resolution] NVARCHAR(max),
    [notificationsSent] NVARCHAR(max),
    [deletedAt] DATETIME2,
    [deletedBy] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [EmergencyEvent_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [EmergencyEvent_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[TreatmentPlan] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000),
    [patientId] NVARCHAR(1000) NOT NULL,
    [encounterId] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [TreatmentPlan_status_df] DEFAULT 'DRAFT',
    [diagnosis] NVARCHAR(max) NOT NULL,
    [chiefComplaint] NVARCHAR(max),
    [clinicalSummary] NVARCHAR(max),
    [labOrders] NVARCHAR(max),
    [imagingOrders] NVARCHAR(max),
    [medicationOrders] NVARCHAR(max),
    [referralOrders] NVARCHAR(max),
    [followUpSchedule] NVARCHAR(max),
    [patientEducation] NVARCHAR(max),
    [returnPrecautions] NVARCHAR(max),
    [additionalInstructions] NVARCHAR(max),
    [approvedAt] DATETIME2,
    [approvedBy] NVARCHAR(1000),
    [deletedAt] DATETIME2,
    [deletedBy] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [TreatmentPlan_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [TreatmentPlan_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ClinicalNote] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000),
    [patientId] NVARCHAR(1000) NOT NULL,
    [encounterId] NVARCHAR(1000) NOT NULL,
    [noteType] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [ClinicalNote_status_df] DEFAULT 'DRAFT',
    [content] NVARCHAR(max) NOT NULL,
    [subjective] NVARCHAR(max),
    [objective] NVARCHAR(max),
    [assessment] NVARCHAR(max),
    [plan] NVARCHAR(max),
    [authorId] NVARCHAR(1000) NOT NULL,
    [signedAt] DATETIME2,
    [signedBy] NVARCHAR(1000),
    [amendedAt] DATETIME2,
    [amendments] NVARCHAR(max),
    [deletedAt] DATETIME2,
    [deletedBy] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ClinicalNote_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [ClinicalNote_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Notification] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [type] NVARCHAR(1000) NOT NULL,
    [priority] NVARCHAR(1000) NOT NULL CONSTRAINT [Notification_priority_df] DEFAULT 'NORMAL',
    [title] NVARCHAR(1000) NOT NULL,
    [message] NVARCHAR(max) NOT NULL,
    [data] NVARCHAR(max),
    [read] BIT NOT NULL CONSTRAINT [Notification_read_df] DEFAULT 0,
    [readAt] DATETIME2,
    [actionUrl] NVARCHAR(1000),
    [expiresAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Notification_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Notification_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[AuditLog] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000),
    [action] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000),
    [entityType] NVARCHAR(1000) NOT NULL,
    [entityId] NVARCHAR(1000),
    [changes] NVARCHAR(max),
    [ipAddress] NVARCHAR(1000),
    [userAgent] NVARCHAR(1000),
    [success] BIT NOT NULL CONSTRAINT [AuditLog_success_df] DEFAULT 1,
    [errorMessage] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AuditLog_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [AuditLog_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ApiKey] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(max),
    [keyHash] NVARCHAR(1000) NOT NULL,
    [keyPrefix] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [scopes] NVARCHAR(max) NOT NULL,
    [rateLimit] INT,
    [expiresAt] DATETIME2,
    [lastUsedAt] DATETIME2,
    [usageCount] INT NOT NULL CONSTRAINT [ApiKey_usageCount_df] DEFAULT 0,
    [isActive] BIT NOT NULL CONSTRAINT [ApiKey_isActive_df] DEFAULT 1,
    [createdBy] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ApiKey_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [ApiKey_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ApiKey_keyHash_key] UNIQUE NONCLUSTERED ([keyHash])
);

-- CreateTable
CREATE TABLE [dbo].[WebhookSubscription] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [url] NVARCHAR(1000) NOT NULL,
    [secret] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [events] NVARCHAR(max) NOT NULL,
    [isActive] BIT NOT NULL CONSTRAINT [WebhookSubscription_isActive_df] DEFAULT 1,
    [failureCount] INT NOT NULL CONSTRAINT [WebhookSubscription_failureCount_df] DEFAULT 0,
    [disabledAt] DATETIME2,
    [disabledReason] NVARCHAR(1000),
    [lastDeliveryAt] DATETIME2,
    [lastStatusCode] INT,
    [createdBy] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [WebhookSubscription_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [WebhookSubscription_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[webhook_deliveries_legacy] (
    [id] NVARCHAR(1000) NOT NULL,
    [subscriptionId] NVARCHAR(1000) NOT NULL,
    [eventType] NVARCHAR(1000) NOT NULL,
    [payload] NVARCHAR(max) NOT NULL,
    [statusCode] INT,
    [responseBody] NVARCHAR(max),
    [durationMs] INT,
    [attempt] INT NOT NULL CONSTRAINT [webhook_deliveries_legacy_attempt_df] DEFAULT 1,
    [maxAttempts] INT NOT NULL CONSTRAINT [webhook_deliveries_legacy_maxAttempts_df] DEFAULT 5,
    [nextRetryAt] DATETIME2,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [webhook_deliveries_legacy_status_df] DEFAULT 'PENDING',
    [errorMessage] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [webhook_deliveries_legacy_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [webhook_deliveries_legacy_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[IntegrationConnection] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [type] NVARCHAR(1000) NOT NULL,
    [direction] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [config] NVARCHAR(max) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [IntegrationConnection_status_df] DEFAULT 'ACTIVE',
    [lastSyncAt] DATETIME2,
    [lastErrorAt] DATETIME2,
    [lastError] NVARCHAR(max),
    [healthStatus] NVARCHAR(1000) NOT NULL CONSTRAINT [IntegrationConnection_healthStatus_df] DEFAULT 'UNKNOWN',
    [messageCount] INT NOT NULL CONSTRAINT [IntegrationConnection_messageCount_df] DEFAULT 0,
    [errorCount] INT NOT NULL CONSTRAINT [IntegrationConnection_errorCount_df] DEFAULT 0,
    [metadata] NVARCHAR(max),
    [createdBy] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [IntegrationConnection_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [IntegrationConnection_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[FhirLabResult] (
    [id] NVARCHAR(1000) NOT NULL,
    [patientId] NVARCHAR(1000) NOT NULL,
    [fhirId] NVARCHAR(1000) NOT NULL,
    [fhirServerId] NVARCHAR(1000) NOT NULL,
    [resourceType] NVARCHAR(1000) NOT NULL CONSTRAINT [FhirLabResult_resourceType_df] DEFAULT 'Observation',
    [rawResource] NVARCHAR(max) NOT NULL,
    [testCode] NVARCHAR(1000),
    [testName] NVARCHAR(1000),
    [value] NVARCHAR(1000),
    [unit] NVARCHAR(1000),
    [interpretation] NVARCHAR(1000),
    [effectiveDate] DATETIME2,
    [lastSyncedAt] DATETIME2 NOT NULL CONSTRAINT [FhirLabResult_lastSyncedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [FhirLabResult_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [FhirLabResult_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [FhirLabResult_fhirId_key] UNIQUE NONCLUSTERED ([fhirId])
);

-- CreateTable
CREATE TABLE [dbo].[FhirCondition] (
    [id] NVARCHAR(1000) NOT NULL,
    [patientId] NVARCHAR(1000) NOT NULL,
    [fhirId] NVARCHAR(1000) NOT NULL,
    [fhirServerId] NVARCHAR(1000) NOT NULL,
    [resourceType] NVARCHAR(1000) NOT NULL CONSTRAINT [FhirCondition_resourceType_df] DEFAULT 'Condition',
    [rawResource] NVARCHAR(max) NOT NULL,
    [icdCode] NVARCHAR(1000),
    [description] NVARCHAR(1000),
    [status] NVARCHAR(1000),
    [onsetDate] DATETIME2,
    [lastSyncedAt] DATETIME2 NOT NULL CONSTRAINT [FhirCondition_lastSyncedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [FhirCondition_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [FhirCondition_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [FhirCondition_fhirId_key] UNIQUE NONCLUSTERED ([fhirId])
);

-- CreateTable
CREATE TABLE [dbo].[FhirMedication] (
    [id] NVARCHAR(1000) NOT NULL,
    [patientId] NVARCHAR(1000) NOT NULL,
    [fhirId] NVARCHAR(1000) NOT NULL,
    [fhirServerId] NVARCHAR(1000) NOT NULL,
    [resourceType] NVARCHAR(1000) NOT NULL CONSTRAINT [FhirMedication_resourceType_df] DEFAULT 'MedicationRequest',
    [rawResource] NVARCHAR(max) NOT NULL,
    [medicationName] NVARCHAR(1000),
    [dose] NVARCHAR(1000),
    [status] NVARCHAR(1000),
    [lastSyncedAt] DATETIME2 NOT NULL CONSTRAINT [FhirMedication_lastSyncedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [FhirMedication_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [FhirMedication_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [FhirMedication_fhirId_key] UNIQUE NONCLUSTERED ([fhirId])
);

-- CreateTable
CREATE TABLE [dbo].[FhirVitalSign] (
    [id] NVARCHAR(1000) NOT NULL,
    [patientId] NVARCHAR(1000) NOT NULL,
    [fhirId] NVARCHAR(1000) NOT NULL,
    [fhirServerId] NVARCHAR(1000) NOT NULL,
    [resourceType] NVARCHAR(1000) NOT NULL CONSTRAINT [FhirVitalSign_resourceType_df] DEFAULT 'Observation',
    [rawResource] NVARCHAR(max) NOT NULL,
    [vitalType] NVARCHAR(1000),
    [value] NVARCHAR(1000),
    [unit] NVARCHAR(1000),
    [effectiveDate] DATETIME2,
    [lastSyncedAt] DATETIME2 NOT NULL CONSTRAINT [FhirVitalSign_lastSyncedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [FhirVitalSign_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [FhirVitalSign_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [FhirVitalSign_fhirId_key] UNIQUE NONCLUSTERED ([fhirId])
);

-- CreateTable
CREATE TABLE [dbo].[DeadLetterEntry] (
    [id] NVARCHAR(1000) NOT NULL,
    [type] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [DeadLetterEntry_status_df] DEFAULT 'pending',
    [payload] NVARCHAR(max) NOT NULL,
    [destination] NVARCHAR(1000) NOT NULL,
    [error] NVARCHAR(max) NOT NULL,
    [attempts] INT NOT NULL CONSTRAINT [DeadLetterEntry_attempts_df] DEFAULT 0,
    [originalId] NVARCHAR(1000),
    [organizationId] NVARCHAR(1000),
    [lastStatusCode] INT,
    [metadata] NVARCHAR(max),
    [replayedAt] DATETIME2,
    [replayResult] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DeadLetterEntry_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [DeadLetterEntry_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ClinicalProtocol] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(max) NOT NULL,
    [version] NVARCHAR(1000) NOT NULL,
    [category] NVARCHAR(1000) NOT NULL,
    [triggerRules] NVARCHAR(max) NOT NULL,
    [actions] NVARCHAR(max) NOT NULL,
    [evidenceLevel] NVARCHAR(1000),
    [guidelineRef] NVARCHAR(1000),
    [isActive] BIT NOT NULL CONSTRAINT [ClinicalProtocol_isActive_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ClinicalProtocol_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [ClinicalProtocol_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ClinicalProtocol_name_key] UNIQUE NONCLUSTERED ([name])
);

-- CreateTable
CREATE TABLE [dbo].[RedFlagRule] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(max) NOT NULL,
    [category] NVARCHAR(1000) NOT NULL,
    [severity] NVARCHAR(1000) NOT NULL,
    [triggerCriteria] NVARCHAR(max) NOT NULL,
    [vitalThresholds] NVARCHAR(max),
    [icdCodes] NVARCHAR(max),
    [recommendedAction] NVARCHAR(max) NOT NULL,
    [timeframe] NVARCHAR(1000) NOT NULL,
    [isActive] BIT NOT NULL CONSTRAINT [RedFlagRule_isActive_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [RedFlagRule_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [RedFlagRule_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [RedFlagRule_name_key] UNIQUE NONCLUSTERED ([name])
);

-- CreateTable
CREATE TABLE [dbo].[webhook_configs] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [url] NVARCHAR(1000) NOT NULL,
    [secret] NVARCHAR(1000) NOT NULL,
    [format] NVARCHAR(1000) NOT NULL CONSTRAINT [webhook_configs_format_df] DEFAULT 'json',
    [events] NVARCHAR(max) NOT NULL,
    [isActive] BIT NOT NULL CONSTRAINT [webhook_configs_isActive_df] DEFAULT 1,
    [headers] NVARCHAR(max),
    [consecutiveFailures] INT NOT NULL CONSTRAINT [webhook_configs_consecutiveFailures_df] DEFAULT 0,
    [lastSuccessAt] DATETIME2,
    [lastFailureAt] DATETIME2,
    [disabledAt] DATETIME2,
    [disabledReason] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [webhook_configs_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [createdBy] NVARCHAR(1000),
    [updatedAt] DATETIME2 NOT NULL,
    [updatedBy] NVARCHAR(1000),
    [organizationId] NVARCHAR(1000),
    CONSTRAINT [webhook_configs_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[webhook_deliveries] (
    [id] NVARCHAR(1000) NOT NULL,
    [webhookId] NVARCHAR(1000) NOT NULL,
    [event] NVARCHAR(1000) NOT NULL,
    [assessmentId] NVARCHAR(1000),
    [patientId] NVARCHAR(1000),
    [deliveryId] NVARCHAR(1000) NOT NULL,
    [attemptNumber] INT NOT NULL CONSTRAINT [webhook_deliveries_attemptNumber_df] DEFAULT 1,
    [status] NVARCHAR(1000) NOT NULL,
    [httpStatus] INT,
    [responseBody] NVARCHAR(1000),
    [latencyMs] INT,
    [errorMessage] NVARCHAR(1000),
    [scheduledAt] DATETIME2 NOT NULL,
    [attemptedAt] DATETIME2,
    [nextRetryAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [webhook_deliveries_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [webhook_deliveries_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [webhook_deliveries_deliveryId_key] UNIQUE NONCLUSTERED ([deliveryId])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Organization_slug_idx] ON [dbo].[Organization]([slug]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Organization_isActive_idx] ON [dbo].[Organization]([isActive]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Organization_tier_idx] ON [dbo].[Organization]([tier]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [User_email_idx] ON [dbo].[User]([email]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [User_npi_idx] ON [dbo].[User]([npi]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [User_role_idx] ON [dbo].[User]([role]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [User_isActive_idx] ON [dbo].[User]([isActive]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [User_organizationId_idx] ON [dbo].[User]([organizationId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Account_userId_idx] ON [dbo].[Account]([userId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Session_userId_idx] ON [dbo].[Session]([userId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Session_expires_idx] ON [dbo].[Session]([expires]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Patient_mrn_idx] ON [dbo].[Patient]([mrn]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Patient_lastName_firstName_idx] ON [dbo].[Patient]([lastName], [firstName]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Patient_dateOfBirth_idx] ON [dbo].[Patient]([dateOfBirth]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Patient_isActive_idx] ON [dbo].[Patient]([isActive]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Patient_deletedAt_idx] ON [dbo].[Patient]([deletedAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Patient_organizationId_idx] ON [dbo].[Patient]([organizationId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Encounter_patientId_idx] ON [dbo].[Encounter]([patientId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Encounter_providerId_idx] ON [dbo].[Encounter]([providerId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Encounter_status_idx] ON [dbo].[Encounter]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Encounter_startTime_idx] ON [dbo].[Encounter]([startTime]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Encounter_deletedAt_idx] ON [dbo].[Encounter]([deletedAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Encounter_organizationId_idx] ON [dbo].[Encounter]([organizationId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Encounter_providerId_status_idx] ON [dbo].[Encounter]([providerId], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Encounter_patientId_startTime_idx] ON [dbo].[Encounter]([patientId], [startTime]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Encounter_providerId_status_startTime_idx] ON [dbo].[Encounter]([providerId], [status], [startTime]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Allergy_patientId_idx] ON [dbo].[Allergy]([patientId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Allergy_allergen_idx] ON [dbo].[Allergy]([allergen]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Allergy_deletedAt_idx] ON [dbo].[Allergy]([deletedAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Condition_patientId_idx] ON [dbo].[Condition]([patientId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Condition_icdCode_idx] ON [dbo].[Condition]([icdCode]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Condition_status_idx] ON [dbo].[Condition]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Condition_deletedAt_idx] ON [dbo].[Condition]([deletedAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Medication_patientId_idx] ON [dbo].[Medication]([patientId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Medication_name_idx] ON [dbo].[Medication]([name]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Medication_status_idx] ON [dbo].[Medication]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Medication_deletedAt_idx] ON [dbo].[Medication]([deletedAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [VitalSign_patientId_idx] ON [dbo].[VitalSign]([patientId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [VitalSign_encounterId_idx] ON [dbo].[VitalSign]([encounterId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [VitalSign_recordedAt_idx] ON [dbo].[VitalSign]([recordedAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [VitalSign_deletedAt_idx] ON [dbo].[VitalSign]([deletedAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [LabOrder_patientId_idx] ON [dbo].[LabOrder]([patientId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [LabOrder_providerId_idx] ON [dbo].[LabOrder]([providerId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [LabOrder_status_idx] ON [dbo].[LabOrder]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [LabOrder_orderedAt_idx] ON [dbo].[LabOrder]([orderedAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [LabOrder_deletedAt_idx] ON [dbo].[LabOrder]([deletedAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [LabOrder_organizationId_idx] ON [dbo].[LabOrder]([organizationId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [LabOrder_providerId_status_idx] ON [dbo].[LabOrder]([providerId], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [LabOrder_patientId_orderedAt_idx] ON [dbo].[LabOrder]([patientId], [orderedAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [LabResult_patientId_idx] ON [dbo].[LabResult]([patientId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [LabResult_labOrderId_idx] ON [dbo].[LabResult]([labOrderId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [LabResult_testCode_idx] ON [dbo].[LabResult]([testCode]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [LabResult_interpretation_idx] ON [dbo].[LabResult]([interpretation]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [LabResult_deletedAt_idx] ON [dbo].[LabResult]([deletedAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ImagingOrder_patientId_idx] ON [dbo].[ImagingOrder]([patientId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ImagingOrder_providerId_idx] ON [dbo].[ImagingOrder]([providerId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ImagingOrder_status_idx] ON [dbo].[ImagingOrder]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ImagingOrder_orderedAt_idx] ON [dbo].[ImagingOrder]([orderedAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ImagingOrder_deletedAt_idx] ON [dbo].[ImagingOrder]([deletedAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ImagingOrder_organizationId_idx] ON [dbo].[ImagingOrder]([organizationId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ImagingResult_patientId_idx] ON [dbo].[ImagingResult]([patientId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ImagingResult_imagingOrderId_idx] ON [dbo].[ImagingResult]([imagingOrderId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ImagingResult_deletedAt_idx] ON [dbo].[ImagingResult]([deletedAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [MedicationOrder_patientId_idx] ON [dbo].[MedicationOrder]([patientId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [MedicationOrder_providerId_idx] ON [dbo].[MedicationOrder]([providerId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [MedicationOrder_status_idx] ON [dbo].[MedicationOrder]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [MedicationOrder_isControlled_idx] ON [dbo].[MedicationOrder]([isControlled]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [MedicationOrder_orderedAt_idx] ON [dbo].[MedicationOrder]([orderedAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [MedicationOrder_deletedAt_idx] ON [dbo].[MedicationOrder]([deletedAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [MedicationOrder_organizationId_idx] ON [dbo].[MedicationOrder]([organizationId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Referral_patientId_idx] ON [dbo].[Referral]([patientId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Referral_providerId_idx] ON [dbo].[Referral]([providerId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Referral_status_idx] ON [dbo].[Referral]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Referral_specialty_idx] ON [dbo].[Referral]([specialty]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Referral_deletedAt_idx] ON [dbo].[Referral]([deletedAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Referral_organizationId_idx] ON [dbo].[Referral]([organizationId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [PatientAssessment_patientId_idx] ON [dbo].[PatientAssessment]([patientId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [PatientAssessment_assignedProviderId_idx] ON [dbo].[PatientAssessment]([assignedProviderId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [PatientAssessment_status_idx] ON [dbo].[PatientAssessment]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [PatientAssessment_sessionId_idx] ON [dbo].[PatientAssessment]([sessionId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [PatientAssessment_deletedAt_idx] ON [dbo].[PatientAssessment]([deletedAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [PatientAssessment_organizationId_idx] ON [dbo].[PatientAssessment]([organizationId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [EmergencyEvent_patientId_idx] ON [dbo].[EmergencyEvent]([patientId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [EmergencyEvent_eventType_idx] ON [dbo].[EmergencyEvent]([eventType]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [EmergencyEvent_severity_idx] ON [dbo].[EmergencyEvent]([severity]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [EmergencyEvent_createdAt_idx] ON [dbo].[EmergencyEvent]([createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [EmergencyEvent_deletedAt_idx] ON [dbo].[EmergencyEvent]([deletedAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TreatmentPlan_patientId_idx] ON [dbo].[TreatmentPlan]([patientId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TreatmentPlan_encounterId_idx] ON [dbo].[TreatmentPlan]([encounterId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TreatmentPlan_status_idx] ON [dbo].[TreatmentPlan]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TreatmentPlan_deletedAt_idx] ON [dbo].[TreatmentPlan]([deletedAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TreatmentPlan_organizationId_idx] ON [dbo].[TreatmentPlan]([organizationId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ClinicalNote_patientId_idx] ON [dbo].[ClinicalNote]([patientId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ClinicalNote_encounterId_idx] ON [dbo].[ClinicalNote]([encounterId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ClinicalNote_noteType_idx] ON [dbo].[ClinicalNote]([noteType]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ClinicalNote_status_idx] ON [dbo].[ClinicalNote]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ClinicalNote_deletedAt_idx] ON [dbo].[ClinicalNote]([deletedAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ClinicalNote_organizationId_idx] ON [dbo].[ClinicalNote]([organizationId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Notification_userId_idx] ON [dbo].[Notification]([userId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Notification_type_idx] ON [dbo].[Notification]([type]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Notification_read_idx] ON [dbo].[Notification]([read]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Notification_createdAt_idx] ON [dbo].[Notification]([createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Notification_userId_read_createdAt_idx] ON [dbo].[Notification]([userId], [read], [createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditLog_action_idx] ON [dbo].[AuditLog]([action]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditLog_userId_idx] ON [dbo].[AuditLog]([userId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditLog_entityType_idx] ON [dbo].[AuditLog]([entityType]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditLog_entityId_idx] ON [dbo].[AuditLog]([entityId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditLog_createdAt_idx] ON [dbo].[AuditLog]([createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditLog_success_idx] ON [dbo].[AuditLog]([success]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditLog_organizationId_idx] ON [dbo].[AuditLog]([organizationId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditLog_userId_createdAt_idx] ON [dbo].[AuditLog]([userId], [createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditLog_entityType_entityId_createdAt_idx] ON [dbo].[AuditLog]([entityType], [entityId], [createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditLog_action_createdAt_idx] ON [dbo].[AuditLog]([action], [createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ApiKey_keyHash_idx] ON [dbo].[ApiKey]([keyHash]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ApiKey_organizationId_idx] ON [dbo].[ApiKey]([organizationId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ApiKey_isActive_idx] ON [dbo].[ApiKey]([isActive]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WebhookSubscription_organizationId_idx] ON [dbo].[WebhookSubscription]([organizationId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WebhookSubscription_isActive_idx] ON [dbo].[WebhookSubscription]([isActive]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [webhook_deliveries_legacy_subscriptionId_idx] ON [dbo].[webhook_deliveries_legacy]([subscriptionId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [webhook_deliveries_legacy_status_idx] ON [dbo].[webhook_deliveries_legacy]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [webhook_deliveries_legacy_nextRetryAt_idx] ON [dbo].[webhook_deliveries_legacy]([nextRetryAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [webhook_deliveries_legacy_createdAt_idx] ON [dbo].[webhook_deliveries_legacy]([createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IntegrationConnection_organizationId_idx] ON [dbo].[IntegrationConnection]([organizationId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IntegrationConnection_type_idx] ON [dbo].[IntegrationConnection]([type]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IntegrationConnection_status_idx] ON [dbo].[IntegrationConnection]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [FhirLabResult_patientId_idx] ON [dbo].[FhirLabResult]([patientId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [FhirLabResult_fhirId_idx] ON [dbo].[FhirLabResult]([fhirId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [FhirLabResult_fhirServerId_idx] ON [dbo].[FhirLabResult]([fhirServerId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [FhirCondition_patientId_idx] ON [dbo].[FhirCondition]([patientId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [FhirCondition_fhirId_idx] ON [dbo].[FhirCondition]([fhirId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [FhirMedication_patientId_idx] ON [dbo].[FhirMedication]([patientId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [FhirMedication_fhirId_idx] ON [dbo].[FhirMedication]([fhirId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [FhirVitalSign_patientId_idx] ON [dbo].[FhirVitalSign]([patientId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [FhirVitalSign_fhirId_idx] ON [dbo].[FhirVitalSign]([fhirId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [FhirVitalSign_vitalType_idx] ON [dbo].[FhirVitalSign]([vitalType]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [DeadLetterEntry_type_idx] ON [dbo].[DeadLetterEntry]([type]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [DeadLetterEntry_status_idx] ON [dbo].[DeadLetterEntry]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [DeadLetterEntry_organizationId_idx] ON [dbo].[DeadLetterEntry]([organizationId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [DeadLetterEntry_createdAt_idx] ON [dbo].[DeadLetterEntry]([createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [DeadLetterEntry_status_type_idx] ON [dbo].[DeadLetterEntry]([status], [type]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ClinicalProtocol_category_idx] ON [dbo].[ClinicalProtocol]([category]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ClinicalProtocol_isActive_idx] ON [dbo].[ClinicalProtocol]([isActive]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [RedFlagRule_category_idx] ON [dbo].[RedFlagRule]([category]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [RedFlagRule_severity_idx] ON [dbo].[RedFlagRule]([severity]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [RedFlagRule_isActive_idx] ON [dbo].[RedFlagRule]([isActive]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [webhook_configs_isActive_idx] ON [dbo].[webhook_configs]([isActive]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [webhook_configs_organizationId_idx] ON [dbo].[webhook_configs]([organizationId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [webhook_deliveries_webhookId_createdAt_idx] ON [dbo].[webhook_deliveries]([webhookId], [createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [webhook_deliveries_status_scheduledAt_idx] ON [dbo].[webhook_deliveries]([status], [scheduledAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [webhook_deliveries_assessmentId_idx] ON [dbo].[webhook_deliveries]([assessmentId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [webhook_deliveries_deliveryId_idx] ON [dbo].[webhook_deliveries]([deliveryId]);

-- AddForeignKey
ALTER TABLE [dbo].[User] ADD CONSTRAINT [User_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[Organization]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Account] ADD CONSTRAINT [Account_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Session] ADD CONSTRAINT [Session_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Patient] ADD CONSTRAINT [Patient_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[Organization]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Encounter] ADD CONSTRAINT [Encounter_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[Organization]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Encounter] ADD CONSTRAINT [Encounter_patientId_fkey] FOREIGN KEY ([patientId]) REFERENCES [dbo].[Patient]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Encounter] ADD CONSTRAINT [Encounter_providerId_fkey] FOREIGN KEY ([providerId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Allergy] ADD CONSTRAINT [Allergy_patientId_fkey] FOREIGN KEY ([patientId]) REFERENCES [dbo].[Patient]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Condition] ADD CONSTRAINT [Condition_patientId_fkey] FOREIGN KEY ([patientId]) REFERENCES [dbo].[Patient]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Medication] ADD CONSTRAINT [Medication_patientId_fkey] FOREIGN KEY ([patientId]) REFERENCES [dbo].[Patient]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[VitalSign] ADD CONSTRAINT [VitalSign_patientId_fkey] FOREIGN KEY ([patientId]) REFERENCES [dbo].[Patient]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[VitalSign] ADD CONSTRAINT [VitalSign_encounterId_fkey] FOREIGN KEY ([encounterId]) REFERENCES [dbo].[Encounter]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[LabOrder] ADD CONSTRAINT [LabOrder_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[Organization]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[LabOrder] ADD CONSTRAINT [LabOrder_patientId_fkey] FOREIGN KEY ([patientId]) REFERENCES [dbo].[Patient]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[LabOrder] ADD CONSTRAINT [LabOrder_providerId_fkey] FOREIGN KEY ([providerId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[LabOrder] ADD CONSTRAINT [LabOrder_encounterId_fkey] FOREIGN KEY ([encounterId]) REFERENCES [dbo].[Encounter]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[LabResult] ADD CONSTRAINT [LabResult_patientId_fkey] FOREIGN KEY ([patientId]) REFERENCES [dbo].[Patient]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[LabResult] ADD CONSTRAINT [LabResult_labOrderId_fkey] FOREIGN KEY ([labOrderId]) REFERENCES [dbo].[LabOrder]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ImagingOrder] ADD CONSTRAINT [ImagingOrder_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[Organization]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ImagingOrder] ADD CONSTRAINT [ImagingOrder_patientId_fkey] FOREIGN KEY ([patientId]) REFERENCES [dbo].[Patient]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ImagingOrder] ADD CONSTRAINT [ImagingOrder_providerId_fkey] FOREIGN KEY ([providerId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ImagingOrder] ADD CONSTRAINT [ImagingOrder_encounterId_fkey] FOREIGN KEY ([encounterId]) REFERENCES [dbo].[Encounter]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ImagingResult] ADD CONSTRAINT [ImagingResult_patientId_fkey] FOREIGN KEY ([patientId]) REFERENCES [dbo].[Patient]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ImagingResult] ADD CONSTRAINT [ImagingResult_imagingOrderId_fkey] FOREIGN KEY ([imagingOrderId]) REFERENCES [dbo].[ImagingOrder]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[MedicationOrder] ADD CONSTRAINT [MedicationOrder_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[Organization]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[MedicationOrder] ADD CONSTRAINT [MedicationOrder_patientId_fkey] FOREIGN KEY ([patientId]) REFERENCES [dbo].[Patient]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[MedicationOrder] ADD CONSTRAINT [MedicationOrder_providerId_fkey] FOREIGN KEY ([providerId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[MedicationOrder] ADD CONSTRAINT [MedicationOrder_encounterId_fkey] FOREIGN KEY ([encounterId]) REFERENCES [dbo].[Encounter]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Referral] ADD CONSTRAINT [Referral_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[Organization]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Referral] ADD CONSTRAINT [Referral_patientId_fkey] FOREIGN KEY ([patientId]) REFERENCES [dbo].[Patient]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Referral] ADD CONSTRAINT [Referral_providerId_fkey] FOREIGN KEY ([providerId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Referral] ADD CONSTRAINT [Referral_encounterId_fkey] FOREIGN KEY ([encounterId]) REFERENCES [dbo].[Encounter]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[PatientAssessment] ADD CONSTRAINT [PatientAssessment_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[Organization]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[PatientAssessment] ADD CONSTRAINT [PatientAssessment_patientId_fkey] FOREIGN KEY ([patientId]) REFERENCES [dbo].[Patient]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[PatientAssessment] ADD CONSTRAINT [PatientAssessment_assignedProviderId_fkey] FOREIGN KEY ([assignedProviderId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[EmergencyEvent] ADD CONSTRAINT [EmergencyEvent_patientId_fkey] FOREIGN KEY ([patientId]) REFERENCES [dbo].[Patient]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[EmergencyEvent] ADD CONSTRAINT [EmergencyEvent_assessmentId_fkey] FOREIGN KEY ([assessmentId]) REFERENCES [dbo].[PatientAssessment]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[TreatmentPlan] ADD CONSTRAINT [TreatmentPlan_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[Organization]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[TreatmentPlan] ADD CONSTRAINT [TreatmentPlan_patientId_fkey] FOREIGN KEY ([patientId]) REFERENCES [dbo].[Patient]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[TreatmentPlan] ADD CONSTRAINT [TreatmentPlan_encounterId_fkey] FOREIGN KEY ([encounterId]) REFERENCES [dbo].[Encounter]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ClinicalNote] ADD CONSTRAINT [ClinicalNote_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[Organization]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ClinicalNote] ADD CONSTRAINT [ClinicalNote_patientId_fkey] FOREIGN KEY ([patientId]) REFERENCES [dbo].[Patient]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ClinicalNote] ADD CONSTRAINT [ClinicalNote_encounterId_fkey] FOREIGN KEY ([encounterId]) REFERENCES [dbo].[Encounter]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Notification] ADD CONSTRAINT [Notification_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AuditLog] ADD CONSTRAINT [AuditLog_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[Organization]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AuditLog] ADD CONSTRAINT [AuditLog_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ApiKey] ADD CONSTRAINT [ApiKey_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[Organization]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WebhookSubscription] ADD CONSTRAINT [WebhookSubscription_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[Organization]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[webhook_deliveries_legacy] ADD CONSTRAINT [webhook_deliveries_legacy_subscriptionId_fkey] FOREIGN KEY ([subscriptionId]) REFERENCES [dbo].[WebhookSubscription]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[IntegrationConnection] ADD CONSTRAINT [IntegrationConnection_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[Organization]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[FhirLabResult] ADD CONSTRAINT [FhirLabResult_patientId_fkey] FOREIGN KEY ([patientId]) REFERENCES [dbo].[Patient]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[FhirCondition] ADD CONSTRAINT [FhirCondition_patientId_fkey] FOREIGN KEY ([patientId]) REFERENCES [dbo].[Patient]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[FhirMedication] ADD CONSTRAINT [FhirMedication_patientId_fkey] FOREIGN KEY ([patientId]) REFERENCES [dbo].[Patient]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[FhirVitalSign] ADD CONSTRAINT [FhirVitalSign_patientId_fkey] FOREIGN KEY ([patientId]) REFERENCES [dbo].[Patient]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[webhook_deliveries] ADD CONSTRAINT [webhook_deliveries_webhookId_fkey] FOREIGN KEY ([webhookId]) REFERENCES [dbo].[webhook_configs]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
