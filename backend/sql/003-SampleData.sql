-- ============================================================================
-- ATTENDING AI - Sample Test Data
-- Version: 1.0.0
-- 
-- This script creates sample patients, providers, and orders for testing.
-- ONLY RUN IN DEVELOPMENT ENVIRONMENTS!
-- ============================================================================

USE ATTENDING;
GO

PRINT '============================================================================';
PRINT 'WARNING: This script creates sample data for DEVELOPMENT ONLY!';
PRINT '         Do NOT run in production environments.';
PRINT '============================================================================';
GO

-- ============================================================================
-- SAMPLE USERS
-- ============================================================================

-- Admin User
INSERT INTO identity.Users (Id, Email, FirstName, LastName, Role, IsActive, CreatedAt)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'admin@attendingai.com', 'System', 'Administrator', 'Admin', 1, GETUTCDATE());

-- Provider Users
INSERT INTO identity.Users (Id, Email, FirstName, LastName, Role, IsActive, CreatedAt)
VALUES 
    ('22222222-2222-2222-2222-222222222222', 'dr.isbell@attendingai.com', 'Scott', 'Isbell', 'Provider', 1, GETUTCDATE()),
    ('22222222-2222-2222-2222-222222222223', 'dr.smith@attendingai.com', 'Jennifer', 'Smith', 'Provider', 1, GETUTCDATE()),
    ('22222222-2222-2222-2222-222222222224', 'dr.johnson@attendingai.com', 'Michael', 'Johnson', 'Provider', 1, GETUTCDATE());

-- Nurse Users
INSERT INTO identity.Users (Id, Email, FirstName, LastName, Role, IsActive, CreatedAt)
VALUES 
    ('33333333-3333-3333-3333-333333333333', 'nurse.williams@attendingai.com', 'Sarah', 'Williams', 'Nurse', 1, GETUTCDATE()),
    ('33333333-3333-3333-3333-333333333334', 'nurse.davis@attendingai.com', 'Emily', 'Davis', 'Nurse', 1, GETUTCDATE());

PRINT 'Sample users created';
GO

-- ============================================================================
-- SAMPLE PROVIDERS
-- ============================================================================

INSERT INTO identity.Providers (Id, NPI, Specialty, Credentials, StateLicenseNumber, StateLicenseState)
VALUES 
    ('22222222-2222-2222-2222-222222222222', '1234567890', 'Family Medicine', 'MD', 'TX-12345', 'TX'),
    ('22222222-2222-2222-2222-222222222223', 'Internal Medicine', '0987654321', 'DO', 'TX-23456', 'TX'),
    ('22222222-2222-2222-2222-222222222224', 'Emergency Medicine', '1122334455', 'MD', 'TX-34567', 'TX');

PRINT 'Sample providers created';
GO

-- ============================================================================
-- SAMPLE PATIENTS
-- ============================================================================

INSERT INTO clinical.Patients (Id, MRN, FirstName, LastName, DateOfBirth, Sex, Phone, Email, AddressLine1, City, State, ZipCode, PrimaryCareProviderId, CreatedAt)
VALUES 
    -- Patient 1: John Smith - Diabetic with HTN
    ('AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA', 'MRN-10001', 'John', 'Smith', '1965-03-15', 'Male', 
     '555-123-4567', 'john.smith@email.com', '123 Main Street', 'Austin', 'TX', '78701',
     '22222222-2222-2222-2222-222222222222', GETUTCDATE()),
    
    -- Patient 2: Maria Garcia - Asthma
    ('BBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBBBB', 'MRN-10002', 'Maria', 'Garcia', '1982-07-22', 'Female',
     '555-234-5678', 'maria.garcia@email.com', '456 Oak Avenue', 'Austin', 'TX', '78702',
     '22222222-2222-2222-2222-222222222222', GETUTCDATE()),
    
    -- Patient 3: Robert Johnson - Heart disease
    ('CCCCCCCC-CCCC-CCCC-CCCC-CCCCCCCCCCCC', 'MRN-10003', 'Robert', 'Johnson', '1958-11-08', 'Male',
     '555-345-6789', 'robert.johnson@email.com', '789 Pine Road', 'Round Rock', 'TX', '78664',
     '22222222-2222-2222-2222-222222222223', GETUTCDATE()),
    
    -- Patient 4: Lisa Chen - Thyroid condition
    ('DDDDDDDD-DDDD-DDDD-DDDD-DDDDDDDDDDDD', 'MRN-10004', 'Lisa', 'Chen', '1990-04-30', 'Female',
     '555-456-7890', 'lisa.chen@email.com', '321 Elm Street', 'Cedar Park', 'TX', '78613',
     '22222222-2222-2222-2222-222222222223', GETUTCDATE()),
    
    -- Patient 5: James Wilson - Healthy, routine checkup
    ('EEEEEEEE-EEEE-EEEE-EEEE-EEEEEEEEEEEE', 'MRN-10005', 'James', 'Wilson', '1975-09-12', 'Male',
     '555-567-8901', 'james.wilson@email.com', '654 Maple Drive', 'Georgetown', 'TX', '78626',
     '22222222-2222-2222-2222-222222222224', GETUTCDATE()),
    
    -- Patient 6: Emergency test patient
    ('FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF', 'MRN-10006', 'Emily', 'Brown', '1988-12-25', 'Female',
     '555-678-9012', 'emily.brown@email.com', '987 Cedar Lane', 'Pflugerville', 'TX', '78660',
     '22222222-2222-2222-2222-222222222224', GETUTCDATE());

PRINT 'Sample patients created';
GO

-- ============================================================================
-- SAMPLE ALLERGIES
-- ============================================================================

INSERT INTO clinical.Allergies (PatientId, Allergen, AllergenType, Reaction, Severity, IsActive)
VALUES 
    -- John Smith allergies
    ('AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA', 'Penicillin', 'Drug', 'Hives, anaphylaxis', 'Severe', 1),
    ('AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA', 'Shellfish', 'Food', 'Throat swelling', 'Severe', 1),
    
    -- Maria Garcia allergies
    ('BBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBBBB', 'Aspirin', 'Drug', 'Wheezing, asthma exacerbation', 'Moderate', 1),
    ('BBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBBBB', 'Dust Mites', 'Environmental', 'Sneezing, congestion', 'Mild', 1),
    
    -- Robert Johnson allergies
    ('CCCCCCCC-CCCC-CCCC-CCCC-CCCCCCCCCCCC', 'Sulfa', 'Drug', 'Rash', 'Moderate', 1),
    
    -- Lisa Chen - NKDA (no known drug allergies indicated by absence)
    
    -- James Wilson allergies
    ('EEEEEEEE-EEEE-EEEE-EEEE-EEEEEEEEEEEE', 'Latex', 'Environmental', 'Contact dermatitis', 'Mild', 1);

PRINT 'Sample allergies created';
GO

-- ============================================================================
-- SAMPLE MEDICAL CONDITIONS
-- ============================================================================

INSERT INTO clinical.MedicalConditions (PatientId, ICD10Code, Description, Status, DiagnosedById, Notes)
VALUES 
    -- John Smith conditions
    ('AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA', 'E11.9', 'Type 2 Diabetes Mellitus', 'Chronic', '22222222-2222-2222-2222-222222222222', 'A1c 7.2% at last check'),
    ('AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA', 'I10', 'Essential Hypertension', 'Chronic', '22222222-2222-2222-2222-222222222222', 'Controlled on Lisinopril 20mg'),
    ('AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA', 'E78.5', 'Hyperlipidemia', 'Chronic', '22222222-2222-2222-2222-222222222222', 'On Atorvastatin 40mg'),
    
    -- Maria Garcia conditions
    ('BBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBBBB', 'J45.20', 'Mild Intermittent Asthma', 'Chronic', '22222222-2222-2222-2222-222222222222', 'Uses albuterol PRN'),
    ('BBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBBBB', 'J30.9', 'Allergic Rhinitis', 'Chronic', '22222222-2222-2222-2222-222222222222', 'Seasonal symptoms'),
    
    -- Robert Johnson conditions
    ('CCCCCCCC-CCCC-CCCC-CCCC-CCCCCCCCCCCC', 'I25.10', 'Coronary Artery Disease', 'Chronic', '22222222-2222-2222-2222-222222222223', 'S/P CABG 2020'),
    ('CCCCCCCC-CCCC-CCCC-CCCC-CCCCCCCCCCCC', 'I50.9', 'Heart Failure', 'Chronic', '22222222-2222-2222-2222-222222222223', 'EF 40%, stable'),
    ('CCCCCCCC-CCCC-CCCC-CCCC-CCCCCCCCCCCC', 'I48.91', 'Atrial Fibrillation', 'Chronic', '22222222-2222-2222-2222-222222222223', 'On Eliquis'),
    
    -- Lisa Chen conditions
    ('DDDDDDDD-DDDD-DDDD-DDDD-DDDDDDDDDDDD', 'E05.90', 'Hyperthyroidism', 'Active', '22222222-2222-2222-2222-222222222223', 'Newly diagnosed, starting methimazole');

PRINT 'Sample medical conditions created';
GO

-- ============================================================================
-- SAMPLE ENCOUNTERS
-- ============================================================================

-- Create some encounters for today and recent dates
DECLARE @Today DATE = CAST(GETUTCDATE() AS DATE);
DECLARE @Yesterday DATE = DATEADD(DAY, -1, @Today);
DECLARE @LastWeek DATE = DATEADD(DAY, -7, @Today);

INSERT INTO clinical.Encounters (Id, PatientId, ProviderId, EncounterNumber, EncounterType, Status, ChiefComplaint, ScheduledAt, StartedAt, CreatedAt)
VALUES 
    -- John Smith - Today's visit
    ('E1111111-1111-1111-1111-111111111111', 'AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA', 
     '22222222-2222-2222-2222-222222222222', 'ENC-2026-0001', 'Office Visit', 'InProgress',
     'Follow-up for diabetes and hypertension', DATEADD(HOUR, 9, CAST(@Today AS DATETIME2)), 
     DATEADD(HOUR, 9, CAST(@Today AS DATETIME2)), GETUTCDATE()),
    
    -- Maria Garcia - Today's visit
    ('E2222222-2222-2222-2222-222222222222', 'BBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBBBB',
     '22222222-2222-2222-2222-222222222222', 'ENC-2026-0002', 'Office Visit', 'InProgress',
     'Shortness of breath, wheezing for 3 days', DATEADD(HOUR, 10, CAST(@Today AS DATETIME2)),
     DATEADD(HOUR, 10, CAST(@Today AS DATETIME2)), GETUTCDATE()),
    
    -- Robert Johnson - Yesterday's completed visit
    ('E3333333-3333-3333-3333-333333333333', 'CCCCCCCC-CCCC-CCCC-CCCC-CCCCCCCCCCCC',
     '22222222-2222-2222-2222-222222222223', 'ENC-2026-0003', 'Office Visit', 'Completed',
     'Chest pain evaluation', DATEADD(HOUR, 14, CAST(@Yesterday AS DATETIME2)),
     DATEADD(HOUR, 14, CAST(@Yesterday AS DATETIME2)), GETUTCDATE()),
    
    -- Lisa Chen - Today's visit
    ('E4444444-4444-4444-4444-444444444444', 'DDDDDDDD-DDDD-DDDD-DDDD-DDDDDDDDDDDD',
     '22222222-2222-2222-2222-222222222223', 'ENC-2026-0004', 'Office Visit', 'InProgress',
     'New patient - thyroid concerns', DATEADD(HOUR, 11, CAST(@Today AS DATETIME2)),
     DATEADD(HOUR, 11, CAST(@Today AS DATETIME2)), GETUTCDATE()),
    
    -- James Wilson - Telehealth visit
    ('E5555555-5555-5555-5555-555555555555', 'EEEEEEEE-EEEE-EEEE-EEEE-EEEEEEEEEEEE',
     '22222222-2222-2222-2222-222222222224', 'ENC-2026-0005', 'Telehealth', 'Scheduled',
     'Annual wellness exam', DATEADD(HOUR, 15, CAST(@Today AS DATETIME2)),
     NULL, GETUTCDATE()),
    
    -- Emily Brown - Emergency scenario
    ('E6666666-6666-6666-6666-666666666666', 'FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF',
     '22222222-2222-2222-2222-222222222224', 'ENC-2026-0006', 'Office Visit', 'InProgress',
     'Severe chest pain, difficulty breathing', DATEADD(HOUR, 8, CAST(@Today AS DATETIME2)),
     DATEADD(HOUR, 8, CAST(@Today AS DATETIME2)), GETUTCDATE());

PRINT 'Sample encounters created';
GO

-- ============================================================================
-- SAMPLE LAB ORDERS
-- ============================================================================

INSERT INTO clinical.LabOrders (Id, PatientId, EncounterId, OrderingProviderId, OrderNumber, TestCode, TestName, CPTCode, LOINCCode, Category, Priority, ClinicalIndication, DiagnosisCode, RequiresFasting, Status, OrderedAt)
VALUES 
    -- John Smith - Diabetes follow-up labs
    ('L1111111-1111-1111-1111-111111111111', 'AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA',
     'E1111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222',
     'LAB-2026-0001', 'HBA1C', 'Hemoglobin A1c', '83036', '4548-4', 'Chemistry',
     'Routine', 'Diabetes mellitus follow-up', 'E11.9', 0, 'Pending', GETUTCDATE()),
    
    ('L1111111-1111-1111-1111-111111111112', 'AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA',
     'E1111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222',
     'LAB-2026-0002', 'CMP', 'Comprehensive Metabolic Panel', '80053', '24323-8', 'Chemistry',
     'Routine', 'Monitoring renal function in diabetic patient', 'E11.9', 1, 'Pending', GETUTCDATE()),
    
    ('L1111111-1111-1111-1111-111111111113', 'AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA',
     'E1111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222',
     'LAB-2026-0003', 'LIPID', 'Lipid Panel', '80061', '57698-3', 'Chemistry',
     'Routine', 'Hyperlipidemia follow-up', 'E78.5', 1, 'Pending', GETUTCDATE()),
    
    -- Maria Garcia - Asthma evaluation
    ('L2222222-2222-2222-2222-222222222221', 'BBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBBBB',
     'E2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222',
     'LAB-2026-0004', 'CBC', 'Complete Blood Count with Diff', '85025', '57021-8', 'Hematology',
     'Urgent', 'Evaluate for infection with asthma exacerbation', 'J45.20', 0, 'Collected', GETUTCDATE()),
    
    -- Robert Johnson - Cardiac evaluation (completed with critical result)
    ('L3333333-3333-3333-3333-333333333331', 'CCCCCCCC-CCCC-CCCC-CCCC-CCCCCCCCCCCC',
     'E3333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222223',
     'LAB-2026-0005', 'TROPONIN', 'Troponin I, High Sensitivity', '84484', '89579-7', 'Cardiac',
     'Stat', 'Rule out acute coronary syndrome', 'I25.10', 0, 'Completed', DATEADD(HOUR, -20, GETUTCDATE())),
    
    ('L3333333-3333-3333-3333-333333333332', 'CCCCCCCC-CCCC-CCCC-CCCC-CCCCCCCCCCCC',
     'E3333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222223',
     'LAB-2026-0006', 'BNP', 'BNP (Brain Natriuretic Peptide)', '83880', '30934-4', 'Cardiac',
     'Stat', 'Heart failure assessment', 'I50.9', 0, 'Completed', DATEADD(HOUR, -20, GETUTCDATE())),
    
    -- Lisa Chen - Thyroid workup
    ('L4444444-4444-4444-4444-444444444441', 'DDDDDDDD-DDDD-DDDD-DDDD-DDDDDDDDDDDD',
     'E4444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222223',
     'LAB-2026-0007', 'THYROID-PANEL', 'Thyroid Panel (TSH, Free T4)', '84436', '55231-5', 'Thyroid',
     'Routine', 'Evaluate hyperthyroidism', 'E05.90', 0, 'Pending', GETUTCDATE()),
    
    -- Emily Brown - Emergency labs (STAT with red flag)
    ('L6666666-6666-6666-6666-666666666661', 'FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF',
     'E6666666-6666-6666-6666-666666666666', '22222222-2222-2222-2222-222222222224',
     'LAB-2026-0008', 'TROPONIN', 'Troponin I, High Sensitivity', '84484', '89579-7', 'Cardiac',
     'Stat', 'Severe chest pain - rule out MI', 'I21.9', 0, 'Collected', GETUTCDATE()),
    
    ('L6666666-6666-6666-6666-666666666662', 'FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF',
     'E6666666-6666-6666-6666-666666666666', '22222222-2222-2222-2222-222222222224',
     'LAB-2026-0009', 'CBC', 'Complete Blood Count with Diff', '85025', '57021-8', 'Hematology',
     'Stat', 'Evaluate for acute process', 'R07.9', 0, 'Collected', GETUTCDATE()),
    
    ('L6666666-6666-6666-6666-666666666663', 'FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF',
     'E6666666-6666-6666-6666-666666666666', '22222222-2222-2222-2222-222222222224',
     'LAB-2026-0010', 'BMP', 'Basic Metabolic Panel', '80048', '51990-0', 'Chemistry',
     'Stat', 'Evaluate electrolytes', 'R07.9', 0, 'Collected', GETUTCDATE());

-- Update emergency lab orders to show they were auto-upgraded to STAT
UPDATE clinical.LabOrders 
SET IsStatFromRedFlag = 1, RedFlagReason = 'Chest pain with difficulty breathing - possible cardiac emergency'
WHERE PatientId = 'FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF';

PRINT 'Sample lab orders created';
GO

-- ============================================================================
-- SAMPLE LAB RESULTS (for completed orders)
-- ============================================================================

INSERT INTO clinical.LabResults (LabOrderId, Value, Unit, ReferenceRangeLow, ReferenceRangeHigh, Interpretation, IsCritical, PerformingLab, ResultedAt)
VALUES 
    -- Robert Johnson - Troponin (elevated but not critical)
    ('L3333333-3333-3333-3333-333333333331', '0.04', 'ng/mL', 0, 0.03, 'Abnormal', 0, 'ATTENDING Lab', DATEADD(HOUR, -18, GETUTCDATE())),
    
    -- Robert Johnson - BNP (elevated)
    ('L3333333-3333-3333-3333-333333333332', '450', 'pg/mL', 0, 100, 'Abnormal', 0, 'ATTENDING Lab', DATEADD(HOUR, -18, GETUTCDATE()));

-- Update lab order status to Completed
UPDATE clinical.LabOrders SET Status = 'Completed', ResultedAt = DATEADD(HOUR, -18, GETUTCDATE())
WHERE Id IN ('L3333333-3333-3333-3333-333333333331', 'L3333333-3333-3333-3333-333333333332');

PRINT 'Sample lab results created';
GO

-- ============================================================================
-- SAMPLE IMAGING ORDERS
-- ============================================================================

INSERT INTO clinical.ImagingOrders (Id, PatientId, EncounterId, OrderingProviderId, OrderNumber, StudyCode, StudyName, Modality, BodyPart, CPTCode, Priority, ClinicalIndication, DiagnosisCode, WithContrast, EstimatedRadiationDose, Status, OrderedAt)
VALUES 
    -- Maria Garcia - Chest X-Ray for asthma exacerbation
    ('I2222222-2222-2222-2222-222222222221', 'BBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBBBB',
     'E2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222',
     'IMG-2026-0001', 'XR-CHEST-2', 'Chest X-Ray, 2 Views', 'XRay', 'Chest', '71046',
     'Urgent', 'Wheezing, rule out pneumonia', 'J45.20', 0, 0.1, 'Pending', GETUTCDATE()),
    
    -- Robert Johnson - Echo follow-up
    ('I3333333-3333-3333-3333-333333333331', 'CCCCCCCC-CCCC-CCCC-CCCC-CCCCCCCCCCCC',
     'E3333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222223',
     'IMG-2026-0002', 'ECHO', 'Echocardiogram', 'Ultrasound', 'Heart', '93306',
     'Urgent', 'Heart failure assessment, evaluate EF', 'I50.9', 0, 0, 'Scheduled', DATEADD(HOUR, -20, GETUTCDATE())),
    
    -- Lisa Chen - Thyroid ultrasound
    ('I4444444-4444-4444-4444-444444444441', 'DDDDDDDD-DDDD-DDDD-DDDD-DDDDDDDDDDDD',
     'E4444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222223',
     'IMG-2026-0003', 'US-THYROID', 'Ultrasound Thyroid', 'Ultrasound', 'Thyroid', '76536',
     'Routine', 'Evaluate thyroid gland with hyperthyroidism', 'E05.90', 0, 0, 'Pending', GETUTCDATE()),
    
    -- Emily Brown - STAT Chest CT
    ('I6666666-6666-6666-6666-666666666661', 'FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF',
     'E6666666-6666-6666-6666-666666666666', '22222222-2222-2222-2222-222222222224',
     'IMG-2026-0004', 'CTA-CHEST', 'CT Angiography Chest (PE Protocol)', 'CT', 'Chest', '71275',
     'Stat', 'Chest pain with dyspnea - rule out PE', 'I26.99', 1, 15.0, 'InProgress', GETUTCDATE());

PRINT 'Sample imaging orders created';
GO

-- ============================================================================
-- SAMPLE MEDICATION ORDERS
-- ============================================================================

INSERT INTO clinical.MedicationOrders (Id, PatientId, EncounterId, OrderingProviderId, OrderNumber, MedicationCode, MedicationName, GenericName, Strength, Form, Route, Frequency, Dosage, Quantity, Refills, Instructions, ClinicalIndication, DiagnosisCode, Status, OrderedAt)
VALUES 
    -- John Smith - Continue diabetes meds
    ('M1111111-1111-1111-1111-111111111111', 'AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA',
     'E1111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222',
     'RX-2026-0001', 'RX-METF-1000', 'Glucophage', 'Metformin', '1000mg', 'Tablet', 'PO',
     'Twice daily', '1000mg', 60, 3, 'Take with meals to reduce GI upset',
     'Type 2 Diabetes Mellitus', 'E11.9', 'Active', GETUTCDATE()),
    
    -- Maria Garcia - Asthma meds
    ('M2222222-2222-2222-2222-222222222221', 'BBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBBBB',
     'E2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222',
     'RX-2026-0002', 'RX-ALB-HFA', 'ProAir', 'Albuterol', '90mcg/actuation', 'Inhaler', 'Inhalation',
     'Every 4-6 hours as needed', '2 puffs', 1, 2, 'Use as needed for shortness of breath or wheezing',
     'Asthma exacerbation', 'J45.20', 'Active', GETUTCDATE()),
    
    ('M2222222-2222-2222-2222-222222222222', 'BBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBBBB',
     'E2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222',
     'RX-2026-0003', 'RX-PRED-10', 'Deltasone', 'Prednisone', '10mg', 'Tablet', 'PO',
     'Daily', '40mg (4 tablets)', 20, 0, 'Take 4 tablets daily for 5 days then stop',
     'Asthma exacerbation', 'J45.20', 'Active', GETUTCDATE()),
    
    -- Robert Johnson - Cardiac meds
    ('M3333333-3333-3333-3333-333333333331', 'CCCCCCCC-CCCC-CCCC-CCCC-CCCCCCCCCCCC',
     'E3333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222223',
     'RX-2026-0004', 'RX-METOP-50', 'Lopressor', 'Metoprolol Tartrate', '50mg', 'Tablet', 'PO',
     'Twice daily', '50mg', 60, 5, 'Do not stop abruptly',
     'Coronary artery disease, heart failure', 'I25.10', 'Active', DATEADD(HOUR, -20, GETUTCDATE())),
    
    -- Lisa Chen - New thyroid medication
    ('M4444444-4444-4444-4444-444444444441', 'DDDDDDDD-DDDD-DDDD-DDDD-DDDDDDDDDDDD',
     'E4444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222223',
     'RX-2026-0005', 'RX-METHI-10', 'Tapazole', 'Methimazole', '10mg', 'Tablet', 'PO',
     'Daily', '10mg', 30, 2, 'Report sore throat, fever, or unusual bleeding',
     'Hyperthyroidism', 'E05.90', 'Active', GETUTCDATE());

PRINT 'Sample medication orders created';
GO

-- ============================================================================
-- SAMPLE REFERRALS
-- ============================================================================

INSERT INTO clinical.Referrals (Id, PatientId, EncounterId, ReferringProviderId, ReferralNumber, Specialty, Urgency, ClinicalQuestion, DiagnosisCode, ReasonForReferral, Status, ReferredAt)
VALUES 
    -- Robert Johnson - Cardiology referral
    ('R3333333-3333-3333-3333-333333333331', 'CCCCCCCC-CCCC-CCCC-CCCC-CCCCCCCCCCCC',
     'E3333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222223',
     'REF-2026-0001', 'Cardiology', 'Urgent',
     'Please evaluate for possible cardiac catheterization given elevated troponin and known CAD',
     'I25.10', 'Patient with known CAD, s/p CABG, presenting with chest pain and mildly elevated troponin',
     'Pending', DATEADD(HOUR, -20, GETUTCDATE())),
    
    -- Lisa Chen - Endocrinology referral
    ('R4444444-4444-4444-4444-444444444441', 'DDDDDDDD-DDDD-DDDD-DDDD-DDDDDDDDDDDD',
     'E4444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222223',
     'REF-2026-0002', 'Endocrinology', 'Routine',
     'Please evaluate and manage newly diagnosed hyperthyroidism, consider radioiodine uptake',
     'E05.90', 'Newly diagnosed hyperthyroidism, starting methimazole, needs specialist management',
     'Pending', GETUTCDATE());

PRINT 'Sample referrals created';
GO

-- ============================================================================
-- SAMPLE PATIENT ASSESSMENTS (COMPASS)
-- ============================================================================

INSERT INTO clinical.PatientAssessments (Id, PatientId, AssessmentNumber, ChiefComplaint, CurrentPhase, PainSeverity, HasRedFlags, IsEmergency, EmergencyReason, TriageLevel, StartedAt)
VALUES 
    -- Emily Brown - Emergency assessment with red flags
    ('A6666666-6666-6666-6666-666666666661', 'FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF',
     'ASM-2026-0001', 'Severe chest pain radiating to left arm, difficulty breathing, sweating',
     'Completed', 9, 1, 1, 'Chest pain radiating to arm with dyspnea - possible cardiac emergency',
     'Level2_Emergent', DATEADD(HOUR, -1, GETUTCDATE())),
    
    -- Maria Garcia - Moderate assessment
    ('A2222222-2222-2222-2222-222222222221', 'BBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBBBB',
     'ASM-2026-0002', 'Shortness of breath and wheezing for 3 days, getting worse',
     'HPI', 5, 0, 0, NULL, 'Level3_Urgent', DATEADD(MINUTE, -30, GETUTCDATE()));

-- Update Emily's assessment with red flags JSON
UPDATE clinical.PatientAssessments
SET RedFlagsJson = '[{"category":"Cardiovascular","matchedKeyword":"chest pain radiating","severity":"Critical","clinicalReason":"Classic presentation of acute coronary syndrome"},{"category":"Respiratory","matchedKeyword":"difficulty breathing","severity":"High","clinicalReason":"May indicate cardiac or pulmonary emergency"}]'
WHERE Id = 'A6666666-6666-6666-6666-666666666661';

-- Update Emily's HPI
UPDATE clinical.PatientAssessments
SET HpiOnset = 'Started suddenly 1 hour ago',
    HpiLocation = 'Central chest, radiating to left arm and jaw',
    HpiCharacter = 'Crushing, heavy pressure',
    HpiSeverity = '9/10',
    HpiAssociatedSymptoms = 'Diaphoresis, nausea, shortness of breath'
WHERE Id = 'A6666666-6666-6666-6666-666666666661';

PRINT 'Sample assessments created';
GO

-- ============================================================================
-- SAMPLE AUDIT LOGS
-- ============================================================================

INSERT INTO audit.AuditLogs (UserId, UserEmail, PatientId, Action, ResourceType, ResourceId, Details, IpAddress, Timestamp)
VALUES 
    ('22222222-2222-2222-2222-222222222222', 'dr.isbell@attendingai.com', 'AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA',
     'VIEW', 'Patient', 'AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA', 'Viewed patient chart', '192.168.1.100', GETUTCDATE()),
    
    ('22222222-2222-2222-2222-222222222222', 'dr.isbell@attendingai.com', 'AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA',
     'CREATE', 'LabOrder', 'L1111111-1111-1111-1111-111111111111', 'Created lab order LAB-2026-0001', '192.168.1.100', GETUTCDATE()),
    
    ('22222222-2222-2222-2222-222222222224', 'dr.johnson@attendingai.com', 'FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF',
     'CREATE', 'LabOrder', 'L6666666-6666-6666-6666-666666666661', 'Created STAT lab order - RED FLAG DETECTED', '192.168.1.102', GETUTCDATE());

PRINT 'Sample audit logs created';
GO

-- ============================================================================
-- SUMMARY
-- ============================================================================

PRINT '';
PRINT '============================================================================';
PRINT 'ATTENDING AI Sample Data Created Successfully!';
PRINT '============================================================================';
PRINT '';

SELECT 'Users' AS Entity, COUNT(*) AS Count FROM identity.Users
UNION ALL SELECT 'Providers', COUNT(*) FROM identity.Providers
UNION ALL SELECT 'Patients', COUNT(*) FROM clinical.Patients
UNION ALL SELECT 'Allergies', COUNT(*) FROM clinical.Allergies
UNION ALL SELECT 'Medical Conditions', COUNT(*) FROM clinical.MedicalConditions
UNION ALL SELECT 'Encounters', COUNT(*) FROM clinical.Encounters
UNION ALL SELECT 'Lab Orders', COUNT(*) FROM clinical.LabOrders
UNION ALL SELECT 'Lab Results', COUNT(*) FROM clinical.LabResults
UNION ALL SELECT 'Imaging Orders', COUNT(*) FROM clinical.ImagingOrders
UNION ALL SELECT 'Medication Orders', COUNT(*) FROM clinical.MedicationOrders
UNION ALL SELECT 'Referrals', COUNT(*) FROM clinical.Referrals
UNION ALL SELECT 'Assessments', COUNT(*) FROM clinical.PatientAssessments
UNION ALL SELECT 'Audit Logs', COUNT(*) FROM audit.AuditLogs;

PRINT '';
PRINT 'Test Accounts:';
PRINT '  Admin: admin@attendingai.com';
PRINT '  Provider 1: dr.isbell@attendingai.com (Family Medicine)';
PRINT '  Provider 2: dr.smith@attendingai.com (Internal Medicine)';
PRINT '  Provider 3: dr.johnson@attendingai.com (Emergency Medicine)';
PRINT '';
PRINT 'Test Patients:';
PRINT '  MRN-10001: John Smith (Diabetic, HTN)';
PRINT '  MRN-10002: Maria Garcia (Asthma - active visit)';
PRINT '  MRN-10003: Robert Johnson (CAD, HF)';
PRINT '  MRN-10004: Lisa Chen (Hyperthyroidism)';
PRINT '  MRN-10005: James Wilson (Healthy)';
PRINT '  MRN-10006: Emily Brown (EMERGENCY - chest pain)';
PRINT '';
PRINT '============================================================================';
GO
