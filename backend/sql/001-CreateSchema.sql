-- ============================================================================
-- ATTENDING AI - Database Schema
-- Version: 1.0.0
-- Created: 2026-01-22
-- 
-- This script creates all tables, indexes, and constraints for the 
-- ATTENDING AI clinical platform.
--
-- Run this script in SQL Server Management Studio or Azure Data Studio
-- against a new database named 'ATTENDING'
-- ============================================================================

-- Create database (run separately if needed)
-- CREATE DATABASE ATTENDING;
-- GO
-- USE ATTENDING;
-- GO

-- ============================================================================
-- SCHEMA CREATION
-- ============================================================================

-- Create schemas for logical separation
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'clinical')
    EXEC('CREATE SCHEMA clinical');
GO

IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'identity')
    EXEC('CREATE SCHEMA identity');
GO

IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'audit')
    EXEC('CREATE SCHEMA audit');
GO

PRINT 'Schemas created successfully';
GO

-- ============================================================================
-- IDENTITY TABLES
-- ============================================================================

-- Users table
CREATE TABLE identity.Users (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Email NVARCHAR(256) NOT NULL,
    FirstName NVARCHAR(100) NOT NULL,
    LastName NVARCHAR(100) NOT NULL,
    FullName AS (FirstName + ' ' + LastName) PERSISTED,
    Role NVARCHAR(50) NOT NULL, -- Patient, Provider, Nurse, Admin
    IsActive BIT NOT NULL DEFAULT 1,
    AzureAdObjectId NVARCHAR(100) NULL,
    LastLoginAt DATETIME2 NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT UQ_Users_Email UNIQUE (Email),
    CONSTRAINT CK_Users_Role CHECK (Role IN ('Patient', 'Provider', 'Nurse', 'Admin', 'Staff'))
);
GO

CREATE INDEX IX_Users_Email ON identity.Users(Email);
CREATE INDEX IX_Users_Role ON identity.Users(Role);
CREATE INDEX IX_Users_AzureAdObjectId ON identity.Users(AzureAdObjectId);
GO

-- Providers table (extends Users for clinical staff)
CREATE TABLE identity.Providers (
    Id UNIQUEIDENTIFIER PRIMARY KEY,
    NPI NVARCHAR(10) NOT NULL,
    Specialty NVARCHAR(100) NULL,
    Credentials NVARCHAR(50) NULL, -- MD, DO, NP, PA, etc.
    DEANumber NVARCHAR(20) NULL,
    StateLicenseNumber NVARCHAR(50) NULL,
    StateLicenseState NVARCHAR(2) NULL,
    
    CONSTRAINT FK_Providers_Users FOREIGN KEY (Id) REFERENCES identity.Users(Id),
    CONSTRAINT UQ_Providers_NPI UNIQUE (NPI)
);
GO

CREATE INDEX IX_Providers_NPI ON identity.Providers(NPI);
CREATE INDEX IX_Providers_Specialty ON identity.Providers(Specialty);
GO

PRINT 'Identity tables created successfully';
GO

-- ============================================================================
-- CLINICAL TABLES - Core
-- ============================================================================

-- Patients table
CREATE TABLE clinical.Patients (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId UNIQUEIDENTIFIER NULL, -- Link to user account if patient has portal access
    MRN NVARCHAR(20) NOT NULL, -- Medical Record Number
    FirstName NVARCHAR(100) NOT NULL,
    LastName NVARCHAR(100) NOT NULL,
    FullName AS (FirstName + ' ' + LastName) PERSISTED,
    MiddleName NVARCHAR(100) NULL,
    DateOfBirth DATE NOT NULL,
    Sex NVARCHAR(10) NOT NULL, -- Male, Female, Other
    SSN NVARCHAR(11) NULL, -- Encrypted
    Phone NVARCHAR(20) NULL,
    Email NVARCHAR(256) NULL,
    AddressLine1 NVARCHAR(200) NULL,
    AddressLine2 NVARCHAR(200) NULL,
    City NVARCHAR(100) NULL,
    State NVARCHAR(2) NULL,
    ZipCode NVARCHAR(10) NULL,
    EmergencyContactName NVARCHAR(200) NULL,
    EmergencyContactPhone NVARCHAR(20) NULL,
    EmergencyContactRelation NVARCHAR(50) NULL,
    PreferredLanguage NVARCHAR(50) DEFAULT 'English',
    PrimaryInsurance NVARCHAR(100) NULL,
    PrimaryInsuranceMemberId NVARCHAR(50) NULL,
    SecondaryInsurance NVARCHAR(100) NULL,
    SecondaryInsuranceMemberId NVARCHAR(50) NULL,
    PrimaryCareProviderId UNIQUEIDENTIFIER NULL,
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT FK_Patients_Users FOREIGN KEY (UserId) REFERENCES identity.Users(Id),
    CONSTRAINT FK_Patients_PCP FOREIGN KEY (PrimaryCareProviderId) REFERENCES identity.Providers(Id),
    CONSTRAINT UQ_Patients_MRN UNIQUE (MRN),
    CONSTRAINT CK_Patients_Sex CHECK (Sex IN ('Male', 'Female', 'Other', 'Unknown'))
);
GO

CREATE INDEX IX_Patients_MRN ON clinical.Patients(MRN);
CREATE INDEX IX_Patients_LastName ON clinical.Patients(LastName);
CREATE INDEX IX_Patients_DateOfBirth ON clinical.Patients(DateOfBirth);
CREATE INDEX IX_Patients_PCP ON clinical.Patients(PrimaryCareProviderId);
GO

-- Patient Allergies
CREATE TABLE clinical.Allergies (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    PatientId UNIQUEIDENTIFIER NOT NULL,
    Allergen NVARCHAR(200) NOT NULL,
    AllergenType NVARCHAR(50) NOT NULL, -- Drug, Food, Environmental, Other
    Reaction NVARCHAR(500) NULL,
    Severity NVARCHAR(20) NOT NULL, -- Mild, Moderate, Severe, Life-Threatening
    OnsetDate DATE NULL,
    VerifiedDate DATE NULL,
    VerifiedById UNIQUEIDENTIFIER NULL,
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT FK_Allergies_Patients FOREIGN KEY (PatientId) REFERENCES clinical.Patients(Id),
    CONSTRAINT FK_Allergies_VerifiedBy FOREIGN KEY (VerifiedById) REFERENCES identity.Users(Id),
    CONSTRAINT CK_Allergies_Severity CHECK (Severity IN ('Mild', 'Moderate', 'Severe', 'Life-Threatening'))
);
GO

CREATE INDEX IX_Allergies_PatientId ON clinical.Allergies(PatientId);
GO

-- Medical Conditions (Problem List)
CREATE TABLE clinical.MedicalConditions (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    PatientId UNIQUEIDENTIFIER NOT NULL,
    ICD10Code NVARCHAR(10) NOT NULL,
    Description NVARCHAR(500) NOT NULL,
    OnsetDate DATE NULL,
    DiagnosedDate DATE NULL,
    DiagnosedById UNIQUEIDENTIFIER NULL,
    Status NVARCHAR(20) NOT NULL DEFAULT 'Active', -- Active, Resolved, Chronic
    Notes NVARCHAR(MAX) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT FK_MedicalConditions_Patients FOREIGN KEY (PatientId) REFERENCES clinical.Patients(Id),
    CONSTRAINT FK_MedicalConditions_DiagnosedBy FOREIGN KEY (DiagnosedById) REFERENCES identity.Providers(Id),
    CONSTRAINT CK_MedicalConditions_Status CHECK (Status IN ('Active', 'Resolved', 'Chronic', 'Inactive'))
);
GO

CREATE INDEX IX_MedicalConditions_PatientId ON clinical.MedicalConditions(PatientId);
CREATE INDEX IX_MedicalConditions_ICD10 ON clinical.MedicalConditions(ICD10Code);
GO

-- Encounters (Visits)
CREATE TABLE clinical.Encounters (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    PatientId UNIQUEIDENTIFIER NOT NULL,
    ProviderId UNIQUEIDENTIFIER NOT NULL,
    EncounterNumber NVARCHAR(20) NOT NULL,
    EncounterType NVARCHAR(50) NOT NULL, -- Office Visit, Telehealth, Emergency, etc.
    Status NVARCHAR(20) NOT NULL DEFAULT 'InProgress', -- Scheduled, CheckedIn, InProgress, Completed, Cancelled
    ChiefComplaint NVARCHAR(500) NULL,
    ScheduledAt DATETIME2 NULL,
    CheckedInAt DATETIME2 NULL,
    StartedAt DATETIME2 NULL,
    CompletedAt DATETIME2 NULL,
    Notes NVARCHAR(MAX) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT FK_Encounters_Patients FOREIGN KEY (PatientId) REFERENCES clinical.Patients(Id),
    CONSTRAINT FK_Encounters_Providers FOREIGN KEY (ProviderId) REFERENCES identity.Providers(Id),
    CONSTRAINT UQ_Encounters_Number UNIQUE (EncounterNumber)
);
GO

CREATE INDEX IX_Encounters_PatientId ON clinical.Encounters(PatientId);
CREATE INDEX IX_Encounters_ProviderId ON clinical.Encounters(ProviderId);
CREATE INDEX IX_Encounters_Status ON clinical.Encounters(Status);
CREATE INDEX IX_Encounters_ScheduledAt ON clinical.Encounters(ScheduledAt);
GO

PRINT 'Core clinical tables created successfully';
GO

-- ============================================================================
-- CLINICAL TABLES - Lab Orders
-- ============================================================================

CREATE TABLE clinical.LabOrders (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    PatientId UNIQUEIDENTIFIER NOT NULL,
    EncounterId UNIQUEIDENTIFIER NOT NULL,
    OrderingProviderId UNIQUEIDENTIFIER NOT NULL,
    OrderNumber NVARCHAR(20) NOT NULL,
    TestCode NVARCHAR(20) NOT NULL,
    TestName NVARCHAR(200) NOT NULL,
    CPTCode NVARCHAR(10) NOT NULL,
    CPTDescription NVARCHAR(500) NULL,
    CPTBasePrice DECIMAL(10,2) NULL,
    LOINCCode NVARCHAR(20) NOT NULL,
    Category NVARCHAR(50) NOT NULL,
    Priority NVARCHAR(20) NOT NULL DEFAULT 'Routine', -- Routine, Urgent, Asap, Stat
    ClinicalIndication NVARCHAR(1000) NOT NULL,
    DiagnosisCode NVARCHAR(10) NOT NULL, -- ICD-10
    DiagnosisDescription NVARCHAR(500) NULL,
    RequiresFasting BIT NOT NULL DEFAULT 0,
    IsStatFromRedFlag BIT NOT NULL DEFAULT 0,
    RedFlagReason NVARCHAR(500) NULL,
    SpecimenType NVARCHAR(100) NULL,
    CollectionInstructions NVARCHAR(500) NULL,
    Status NVARCHAR(20) NOT NULL DEFAULT 'Pending', -- Pending, Collected, InProcess, Completed, Cancelled
    OrderedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CollectedAt DATETIME2 NULL,
    CollectedById UNIQUEIDENTIFIER NULL,
    ResultedAt DATETIME2 NULL,
    CancelledAt DATETIME2 NULL,
    CancelledById UNIQUEIDENTIFIER NULL,
    CancellationReason NVARCHAR(500) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT FK_LabOrders_Patients FOREIGN KEY (PatientId) REFERENCES clinical.Patients(Id),
    CONSTRAINT FK_LabOrders_Encounters FOREIGN KEY (EncounterId) REFERENCES clinical.Encounters(Id),
    CONSTRAINT FK_LabOrders_OrderingProvider FOREIGN KEY (OrderingProviderId) REFERENCES identity.Providers(Id),
    CONSTRAINT FK_LabOrders_CollectedBy FOREIGN KEY (CollectedById) REFERENCES identity.Users(Id),
    CONSTRAINT FK_LabOrders_CancelledBy FOREIGN KEY (CancelledById) REFERENCES identity.Users(Id),
    CONSTRAINT UQ_LabOrders_Number UNIQUE (OrderNumber),
    CONSTRAINT CK_LabOrders_Priority CHECK (Priority IN ('Routine', 'Urgent', 'Asap', 'Stat')),
    CONSTRAINT CK_LabOrders_Status CHECK (Status IN ('Pending', 'Collected', 'InProcess', 'Completed', 'Cancelled'))
);
GO

CREATE INDEX IX_LabOrders_PatientId ON clinical.LabOrders(PatientId);
CREATE INDEX IX_LabOrders_EncounterId ON clinical.LabOrders(EncounterId);
CREATE INDEX IX_LabOrders_OrderingProviderId ON clinical.LabOrders(OrderingProviderId);
CREATE INDEX IX_LabOrders_Status ON clinical.LabOrders(Status);
CREATE INDEX IX_LabOrders_Priority ON clinical.LabOrders(Priority);
CREATE INDEX IX_LabOrders_OrderedAt ON clinical.LabOrders(OrderedAt DESC);
CREATE INDEX IX_LabOrders_OrderNumber ON clinical.LabOrders(OrderNumber);
GO

-- Lab Results
CREATE TABLE clinical.LabResults (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    LabOrderId UNIQUEIDENTIFIER NOT NULL,
    Value NVARCHAR(500) NOT NULL,
    Unit NVARCHAR(50) NULL,
    ReferenceRangeLow DECIMAL(18,4) NULL,
    ReferenceRangeHigh DECIMAL(18,4) NULL,
    ReferenceRangeText NVARCHAR(200) NULL,
    Interpretation NVARCHAR(50) NULL, -- Normal, Abnormal, Critical, Indeterminate
    IsCritical BIT NOT NULL DEFAULT 0,
    CriticalNotifiedAt DATETIME2 NULL,
    CriticalNotifiedToId UNIQUEIDENTIFIER NULL,
    PerformingLab NVARCHAR(200) NULL,
    PerformingLabAddress NVARCHAR(500) NULL,
    Comments NVARCHAR(MAX) NULL,
    ResultedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    VerifiedAt DATETIME2 NULL,
    VerifiedById UNIQUEIDENTIFIER NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT FK_LabResults_LabOrders FOREIGN KEY (LabOrderId) REFERENCES clinical.LabOrders(Id),
    CONSTRAINT FK_LabResults_CriticalNotifiedTo FOREIGN KEY (CriticalNotifiedToId) REFERENCES identity.Users(Id),
    CONSTRAINT FK_LabResults_VerifiedBy FOREIGN KEY (VerifiedById) REFERENCES identity.Providers(Id)
);
GO

CREATE INDEX IX_LabResults_LabOrderId ON clinical.LabResults(LabOrderId);
CREATE INDEX IX_LabResults_IsCritical ON clinical.LabResults(IsCritical) WHERE IsCritical = 1;
GO

PRINT 'Lab order tables created successfully';
GO

-- ============================================================================
-- CLINICAL TABLES - Imaging Orders
-- ============================================================================

CREATE TABLE clinical.ImagingOrders (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    PatientId UNIQUEIDENTIFIER NOT NULL,
    EncounterId UNIQUEIDENTIFIER NOT NULL,
    OrderingProviderId UNIQUEIDENTIFIER NOT NULL,
    OrderNumber NVARCHAR(20) NOT NULL,
    StudyCode NVARCHAR(20) NOT NULL,
    StudyName NVARCHAR(200) NOT NULL,
    Modality NVARCHAR(50) NOT NULL, -- XRay, CT, MRI, Ultrasound, Nuclear, PET, Mammography, Fluoroscopy, DEXA
    BodyPart NVARCHAR(100) NOT NULL,
    Laterality NVARCHAR(20) NULL, -- Left, Right, Bilateral
    WithContrast BIT NOT NULL DEFAULT 0,
    CPTCode NVARCHAR(10) NOT NULL,
    Priority NVARCHAR(20) NOT NULL DEFAULT 'Routine',
    ClinicalIndication NVARCHAR(1000) NOT NULL,
    DiagnosisCode NVARCHAR(10) NOT NULL,
    EstimatedRadiationDose DECIMAL(10,4) NULL, -- mSv
    PreparationInstructions NVARCHAR(1000) NULL,
    TransportationNeeds NVARCHAR(200) NULL,
    Status NVARCHAR(20) NOT NULL DEFAULT 'Pending', -- Pending, Scheduled, InProgress, Completed, Cancelled
    ScheduledAt DATETIME2 NULL,
    ScheduledLocation NVARCHAR(200) NULL,
    PerformedAt DATETIME2 NULL,
    CompletedAt DATETIME2 NULL,
    OrderedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CancelledAt DATETIME2 NULL,
    CancelledById UNIQUEIDENTIFIER NULL,
    CancellationReason NVARCHAR(500) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT FK_ImagingOrders_Patients FOREIGN KEY (PatientId) REFERENCES clinical.Patients(Id),
    CONSTRAINT FK_ImagingOrders_Encounters FOREIGN KEY (EncounterId) REFERENCES clinical.Encounters(Id),
    CONSTRAINT FK_ImagingOrders_OrderingProvider FOREIGN KEY (OrderingProviderId) REFERENCES identity.Providers(Id),
    CONSTRAINT FK_ImagingOrders_CancelledBy FOREIGN KEY (CancelledById) REFERENCES identity.Users(Id),
    CONSTRAINT UQ_ImagingOrders_Number UNIQUE (OrderNumber),
    CONSTRAINT CK_ImagingOrders_Modality CHECK (Modality IN ('XRay', 'CT', 'MRI', 'Ultrasound', 'Nuclear', 'PET', 'Mammography', 'Fluoroscopy', 'DEXA'))
);
GO

CREATE INDEX IX_ImagingOrders_PatientId ON clinical.ImagingOrders(PatientId);
CREATE INDEX IX_ImagingOrders_Status ON clinical.ImagingOrders(Status);
CREATE INDEX IX_ImagingOrders_ScheduledAt ON clinical.ImagingOrders(ScheduledAt);
GO

-- Imaging Results
CREATE TABLE clinical.ImagingResults (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    ImagingOrderId UNIQUEIDENTIFIER NOT NULL,
    Findings NVARCHAR(MAX) NOT NULL,
    Impression NVARCHAR(MAX) NOT NULL,
    HasCriticalFindings BIT NOT NULL DEFAULT 0,
    CriticalFindingsDescription NVARCHAR(1000) NULL,
    CriticalNotifiedAt DATETIME2 NULL,
    CriticalNotifiedToId UNIQUEIDENTIFIER NULL,
    Technique NVARCHAR(1000) NULL,
    Comparison NVARCHAR(500) NULL, -- Previous studies compared
    ReadingRadiologistId UNIQUEIDENTIFIER NULL,
    ReadingRadiologist NVARCHAR(200) NULL,
    ReadAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    FinalizedAt DATETIME2 NULL,
    Addendum NVARCHAR(MAX) NULL,
    AddendumAt DATETIME2 NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT FK_ImagingResults_ImagingOrders FOREIGN KEY (ImagingOrderId) REFERENCES clinical.ImagingOrders(Id),
    CONSTRAINT FK_ImagingResults_CriticalNotifiedTo FOREIGN KEY (CriticalNotifiedToId) REFERENCES identity.Users(Id),
    CONSTRAINT FK_ImagingResults_Radiologist FOREIGN KEY (ReadingRadiologistId) REFERENCES identity.Providers(Id)
);
GO

CREATE INDEX IX_ImagingResults_ImagingOrderId ON clinical.ImagingResults(ImagingOrderId);
CREATE INDEX IX_ImagingResults_HasCritical ON clinical.ImagingResults(HasCriticalFindings) WHERE HasCriticalFindings = 1;
GO

PRINT 'Imaging order tables created successfully';
GO

-- ============================================================================
-- CLINICAL TABLES - Medication Orders
-- ============================================================================

CREATE TABLE clinical.MedicationOrders (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    PatientId UNIQUEIDENTIFIER NOT NULL,
    EncounterId UNIQUEIDENTIFIER NOT NULL,
    OrderingProviderId UNIQUEIDENTIFIER NOT NULL,
    OrderNumber NVARCHAR(20) NOT NULL,
    MedicationCode NVARCHAR(20) NOT NULL, -- NDC or RxNorm
    MedicationName NVARCHAR(200) NOT NULL,
    GenericName NVARCHAR(200) NOT NULL,
    Strength NVARCHAR(50) NOT NULL,
    Form NVARCHAR(50) NOT NULL, -- Tablet, Capsule, Liquid, Injection, etc.
    Route NVARCHAR(50) NOT NULL, -- PO, IV, IM, SC, Topical, etc.
    Frequency NVARCHAR(100) NOT NULL,
    Dosage NVARCHAR(100) NOT NULL,
    Quantity INT NOT NULL,
    DaysSupply INT NULL,
    Refills INT NOT NULL DEFAULT 0,
    Instructions NVARCHAR(1000) NULL,
    ClinicalIndication NVARCHAR(1000) NOT NULL,
    DiagnosisCode NVARCHAR(10) NOT NULL,
    IsControlledSubstance BIT NOT NULL DEFAULT 0,
    DEASchedule NVARCHAR(5) NULL, -- II, III, IV, V
    HasBlackBoxWarning BIT NOT NULL DEFAULT 0,
    BlackBoxWarningText NVARCHAR(MAX) NULL,
    DispenseAsWritten BIT NOT NULL DEFAULT 0,
    PharmacyId NVARCHAR(50) NULL,
    PharmacyName NVARCHAR(200) NULL,
    PharmacyAddress NVARCHAR(500) NULL,
    PharmacyPhone NVARCHAR(20) NULL,
    Status NVARCHAR(20) NOT NULL DEFAULT 'Active', -- Active, Discontinued, Completed, Cancelled
    StartDate DATE NULL,
    EndDate DATE NULL,
    OrderedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    DiscontinuedAt DATETIME2 NULL,
    DiscontinuedById UNIQUEIDENTIFIER NULL,
    DiscontinuedReason NVARCHAR(500) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT FK_MedicationOrders_Patients FOREIGN KEY (PatientId) REFERENCES clinical.Patients(Id),
    CONSTRAINT FK_MedicationOrders_Encounters FOREIGN KEY (EncounterId) REFERENCES clinical.Encounters(Id),
    CONSTRAINT FK_MedicationOrders_OrderingProvider FOREIGN KEY (OrderingProviderId) REFERENCES identity.Providers(Id),
    CONSTRAINT FK_MedicationOrders_DiscontinuedBy FOREIGN KEY (DiscontinuedById) REFERENCES identity.Users(Id),
    CONSTRAINT UQ_MedicationOrders_Number UNIQUE (OrderNumber)
);
GO

CREATE INDEX IX_MedicationOrders_PatientId ON clinical.MedicationOrders(PatientId);
CREATE INDEX IX_MedicationOrders_Status ON clinical.MedicationOrders(Status);
CREATE INDEX IX_MedicationOrders_IsControlled ON clinical.MedicationOrders(IsControlledSubstance) WHERE IsControlledSubstance = 1;
GO

PRINT 'Medication order tables created successfully';
GO

-- ============================================================================
-- CLINICAL TABLES - Referrals
-- ============================================================================

CREATE TABLE clinical.Referrals (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    PatientId UNIQUEIDENTIFIER NOT NULL,
    EncounterId UNIQUEIDENTIFIER NOT NULL,
    ReferringProviderId UNIQUEIDENTIFIER NOT NULL,
    ReferralNumber NVARCHAR(20) NOT NULL,
    Specialty NVARCHAR(100) NOT NULL,
    Urgency NVARCHAR(20) NOT NULL DEFAULT 'Routine', -- Routine, Urgent, Emergent
    ClinicalQuestion NVARCHAR(1000) NOT NULL,
    DiagnosisCode NVARCHAR(10) NOT NULL,
    ReasonForReferral NVARCHAR(MAX) NULL,
    ReferredToProviderId UNIQUEIDENTIFIER NULL,
    ReferredToProviderName NVARCHAR(200) NULL,
    ReferredToFacility NVARCHAR(200) NULL,
    ReferredToPhone NVARCHAR(20) NULL,
    ReferredToFax NVARCHAR(20) NULL,
    InsuranceAuthRequired BIT NOT NULL DEFAULT 0,
    InsuranceAuthNumber NVARCHAR(50) NULL,
    AuthExpirationDate DATE NULL,
    Status NVARCHAR(20) NOT NULL DEFAULT 'Pending', -- Pending, Scheduled, Completed, Cancelled
    ReferredAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    ScheduledAt DATETIME2 NULL,
    CompletedAt DATETIME2 NULL,
    ConsultNotes NVARCHAR(MAX) NULL,
    CancelledAt DATETIME2 NULL,
    CancelledById UNIQUEIDENTIFIER NULL,
    CancellationReason NVARCHAR(500) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT FK_Referrals_Patients FOREIGN KEY (PatientId) REFERENCES clinical.Patients(Id),
    CONSTRAINT FK_Referrals_Encounters FOREIGN KEY (EncounterId) REFERENCES clinical.Encounters(Id),
    CONSTRAINT FK_Referrals_ReferringProvider FOREIGN KEY (ReferringProviderId) REFERENCES identity.Providers(Id),
    CONSTRAINT FK_Referrals_ReferredToProvider FOREIGN KEY (ReferredToProviderId) REFERENCES identity.Providers(Id),
    CONSTRAINT FK_Referrals_CancelledBy FOREIGN KEY (CancelledById) REFERENCES identity.Users(Id),
    CONSTRAINT UQ_Referrals_Number UNIQUE (ReferralNumber),
    CONSTRAINT CK_Referrals_Urgency CHECK (Urgency IN ('Routine', 'Urgent', 'Emergent'))
);
GO

CREATE INDEX IX_Referrals_PatientId ON clinical.Referrals(PatientId);
CREATE INDEX IX_Referrals_Specialty ON clinical.Referrals(Specialty);
CREATE INDEX IX_Referrals_Status ON clinical.Referrals(Status);
GO

PRINT 'Referral tables created successfully';
GO

-- ============================================================================
-- CLINICAL TABLES - Patient Assessments (COMPASS)
-- ============================================================================

CREATE TABLE clinical.PatientAssessments (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    PatientId UNIQUEIDENTIFIER NOT NULL,
    EncounterId UNIQUEIDENTIFIER NULL, -- May be created before encounter
    AssessmentNumber NVARCHAR(20) NOT NULL,
    ChiefComplaint NVARCHAR(500) NOT NULL,
    CurrentPhase NVARCHAR(50) NOT NULL DEFAULT 'Welcome', -- Welcome, ChiefComplaint, HPI, ReviewOfSystems, etc.
    TriageLevel NVARCHAR(30) NULL, -- Level1_Resuscitation, Level2_Emergent, Level3_Urgent, Level4_LessUrgent, Level5_NonUrgent
    PainSeverity INT NULL, -- 0-10
    
    -- HPI (History of Present Illness) OLDCARTS
    HpiOnset NVARCHAR(500) NULL,
    HpiLocation NVARCHAR(500) NULL,
    HpiDuration NVARCHAR(500) NULL,
    HpiCharacter NVARCHAR(500) NULL,
    HpiAggravating NVARCHAR(500) NULL,
    HpiRelieving NVARCHAR(500) NULL,
    HpiTiming NVARCHAR(500) NULL,
    HpiSeverity NVARCHAR(500) NULL,
    HpiContext NVARCHAR(500) NULL,
    HpiAssociatedSymptoms NVARCHAR(1000) NULL,
    
    -- Red Flag Detection
    HasRedFlags BIT NOT NULL DEFAULT 0,
    RedFlagsJson NVARCHAR(MAX) NULL, -- JSON array of detected red flags
    IsEmergency BIT NOT NULL DEFAULT 0,
    EmergencyReason NVARCHAR(500) NULL,
    
    -- Review / Notes
    AssessmentSummary NVARCHAR(MAX) NULL,
    ProviderNotes NVARCHAR(MAX) NULL,
    
    -- Timestamps
    StartedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CompletedAt DATETIME2 NULL,
    ReviewedAt DATETIME2 NULL,
    ReviewedById UNIQUEIDENTIFIER NULL,
    
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT FK_Assessments_Patients FOREIGN KEY (PatientId) REFERENCES clinical.Patients(Id),
    CONSTRAINT FK_Assessments_Encounters FOREIGN KEY (EncounterId) REFERENCES clinical.Encounters(Id),
    CONSTRAINT FK_Assessments_ReviewedBy FOREIGN KEY (ReviewedById) REFERENCES identity.Providers(Id),
    CONSTRAINT UQ_Assessments_Number UNIQUE (AssessmentNumber),
    CONSTRAINT CK_Assessments_Pain CHECK (PainSeverity IS NULL OR (PainSeverity >= 0 AND PainSeverity <= 10))
);
GO

CREATE INDEX IX_Assessments_PatientId ON clinical.PatientAssessments(PatientId);
CREATE INDEX IX_Assessments_CurrentPhase ON clinical.PatientAssessments(CurrentPhase);
CREATE INDEX IX_Assessments_HasRedFlags ON clinical.PatientAssessments(HasRedFlags) WHERE HasRedFlags = 1;
CREATE INDEX IX_Assessments_IsEmergency ON clinical.PatientAssessments(IsEmergency) WHERE IsEmergency = 1;
CREATE INDEX IX_Assessments_StartedAt ON clinical.PatientAssessments(StartedAt DESC);
GO

-- Assessment Symptoms (captured during assessment)
CREATE TABLE clinical.AssessmentSymptoms (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    AssessmentId UNIQUEIDENTIFIER NOT NULL,
    SymptomName NVARCHAR(200) NOT NULL,
    IsPresent BIT NOT NULL DEFAULT 1,
    Severity NVARCHAR(20) NULL, -- Mild, Moderate, Severe
    Duration NVARCHAR(100) NULL,
    Notes NVARCHAR(500) NULL,
    RecordedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT FK_AssessmentSymptoms_Assessments FOREIGN KEY (AssessmentId) REFERENCES clinical.PatientAssessments(Id)
);
GO

CREATE INDEX IX_AssessmentSymptoms_AssessmentId ON clinical.AssessmentSymptoms(AssessmentId);
GO

PRINT 'Assessment tables created successfully';
GO

-- ============================================================================
-- AUDIT TABLES
-- ============================================================================

CREATE TABLE audit.AuditLogs (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId UNIQUEIDENTIFIER NULL,
    UserEmail NVARCHAR(256) NULL,
    PatientId UNIQUEIDENTIFIER NULL,
    Action NVARCHAR(100) NOT NULL, -- CREATE, READ, UPDATE, DELETE, LOGIN, LOGOUT, etc.
    ResourceType NVARCHAR(100) NOT NULL, -- Patient, LabOrder, etc.
    ResourceId UNIQUEIDENTIFIER NULL,
    Details NVARCHAR(MAX) NULL,
    IpAddress NVARCHAR(45) NULL,
    UserAgent NVARCHAR(500) NULL,
    RequestPath NVARCHAR(500) NULL,
    RequestMethod NVARCHAR(10) NULL,
    ResponseStatusCode INT NULL,
    DurationMs INT NULL,
    Timestamp DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT FK_AuditLogs_Users FOREIGN KEY (UserId) REFERENCES identity.Users(Id),
    CONSTRAINT FK_AuditLogs_Patients FOREIGN KEY (PatientId) REFERENCES clinical.Patients(Id)
);
GO

-- Partition by month for better performance with large audit logs
CREATE INDEX IX_AuditLogs_Timestamp ON audit.AuditLogs(Timestamp DESC);
CREATE INDEX IX_AuditLogs_UserId ON audit.AuditLogs(UserId);
CREATE INDEX IX_AuditLogs_PatientId ON audit.AuditLogs(PatientId);
CREATE INDEX IX_AuditLogs_Action ON audit.AuditLogs(Action);
CREATE INDEX IX_AuditLogs_ResourceType ON audit.AuditLogs(ResourceType);
GO

PRINT 'Audit tables created successfully';
GO

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to generate order numbers
CREATE OR ALTER FUNCTION dbo.GenerateOrderNumber(@Prefix NVARCHAR(5))
RETURNS NVARCHAR(20)
AS
BEGIN
    DECLARE @Number NVARCHAR(20);
    SET @Number = @Prefix + '-' + 
                  FORMAT(GETUTCDATE(), 'yyyyMMdd') + '-' + 
                  RIGHT('0000' + CAST(ABS(CHECKSUM(NEWID())) % 10000 AS NVARCHAR(4)), 4);
    RETURN @Number;
END;
GO

-- Function to calculate age
CREATE OR ALTER FUNCTION dbo.CalculateAge(@DateOfBirth DATE)
RETURNS INT
AS
BEGIN
    RETURN DATEDIFF(YEAR, @DateOfBirth, GETUTCDATE()) - 
           CASE WHEN (MONTH(@DateOfBirth) > MONTH(GETUTCDATE())) OR 
                     (MONTH(@DateOfBirth) = MONTH(GETUTCDATE()) AND DAY(@DateOfBirth) > DAY(GETUTCDATE()))
                THEN 1 ELSE 0 END;
END;
GO

PRINT 'Helper functions created successfully';
GO

-- ============================================================================
-- SUMMARY
-- ============================================================================

PRINT '';
PRINT '============================================================================';
PRINT 'ATTENDING AI Database Schema Created Successfully!';
PRINT '============================================================================';
PRINT '';
PRINT 'Schemas: clinical, identity, audit';
PRINT '';
PRINT 'Identity Tables:';
PRINT '  - identity.Users';
PRINT '  - identity.Providers';
PRINT '';
PRINT 'Clinical Tables:';
PRINT '  - clinical.Patients';
PRINT '  - clinical.Allergies';
PRINT '  - clinical.MedicalConditions';
PRINT '  - clinical.Encounters';
PRINT '  - clinical.LabOrders';
PRINT '  - clinical.LabResults';
PRINT '  - clinical.ImagingOrders';
PRINT '  - clinical.ImagingResults';
PRINT '  - clinical.MedicationOrders';
PRINT '  - clinical.Referrals';
PRINT '  - clinical.PatientAssessments';
PRINT '  - clinical.AssessmentSymptoms';
PRINT '';
PRINT 'Audit Tables:';
PRINT '  - audit.AuditLogs';
PRINT '';
PRINT 'Next Steps:';
PRINT '  1. Run 002-SeedData.sql to populate reference data';
PRINT '  2. Run 003-SampleData.sql for test data (dev only)';
PRINT '============================================================================';
GO
