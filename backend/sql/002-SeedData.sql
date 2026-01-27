-- ============================================================================
-- ATTENDING AI - Seed Data
-- Version: 1.0.0
-- 
-- This script populates reference data for the ATTENDING AI platform.
-- Run this after 001-CreateSchema.sql
-- ============================================================================

USE ATTENDING;
GO

-- ============================================================================
-- REFERENCE DATA TABLES (Optional - for catalog storage)
-- ============================================================================

-- Lab Test Catalog
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'LabTestCatalog' AND schema_id = SCHEMA_ID('clinical'))
BEGIN
    CREATE TABLE clinical.LabTestCatalog (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        TestCode NVARCHAR(20) NOT NULL,
        TestName NVARCHAR(200) NOT NULL,
        CPTCode NVARCHAR(10) NOT NULL,
        LOINCCode NVARCHAR(20) NOT NULL,
        Category NVARCHAR(50) NOT NULL,
        Description NVARCHAR(500) NULL,
        RequiresFasting BIT NOT NULL DEFAULT 0,
        SpecimenType NVARCHAR(100) NULL,
        TurnaroundTime NVARCHAR(50) NULL,
        BasePrice DECIMAL(10,2) NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        
        CONSTRAINT UQ_LabTestCatalog_TestCode UNIQUE (TestCode)
    );
    
    CREATE INDEX IX_LabTestCatalog_Category ON clinical.LabTestCatalog(Category);
END;
GO

-- Imaging Study Catalog
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ImagingStudyCatalog' AND schema_id = SCHEMA_ID('clinical'))
BEGIN
    CREATE TABLE clinical.ImagingStudyCatalog (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        StudyCode NVARCHAR(20) NOT NULL,
        StudyName NVARCHAR(200) NOT NULL,
        Modality NVARCHAR(50) NOT NULL,
        BodyPart NVARCHAR(100) NOT NULL,
        CPTCode NVARCHAR(10) NOT NULL,
        Description NVARCHAR(500) NULL,
        EstimatedRadiationDose DECIMAL(10,4) NULL,
        PreparationRequired NVARCHAR(500) NULL,
        ContrastOptions NVARCHAR(100) NULL, -- None, Optional, Required
        BasePrice DECIMAL(10,2) NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        
        CONSTRAINT UQ_ImagingStudyCatalog_StudyCode UNIQUE (StudyCode)
    );
    
    CREATE INDEX IX_ImagingStudyCatalog_Modality ON clinical.ImagingStudyCatalog(Modality);
END;
GO

-- Medication Catalog
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'MedicationCatalog' AND schema_id = SCHEMA_ID('clinical'))
BEGIN
    CREATE TABLE clinical.MedicationCatalog (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        MedicationCode NVARCHAR(20) NOT NULL, -- NDC or RxNorm
        BrandName NVARCHAR(200) NOT NULL,
        GenericName NVARCHAR(200) NOT NULL,
        Strength NVARCHAR(50) NOT NULL,
        Form NVARCHAR(50) NOT NULL,
        Manufacturer NVARCHAR(200) NULL,
        DrugClass NVARCHAR(100) NULL,
        IsControlledSubstance BIT NOT NULL DEFAULT 0,
        DEASchedule NVARCHAR(5) NULL,
        HasBlackBoxWarning BIT NOT NULL DEFAULT 0,
        BlackBoxWarningText NVARCHAR(MAX) NULL,
        CommonDosage NVARCHAR(200) NULL,
        CommonFrequency NVARCHAR(100) NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        
        CONSTRAINT UQ_MedicationCatalog_Code UNIQUE (MedicationCode)
    );
    
    CREATE INDEX IX_MedicationCatalog_GenericName ON clinical.MedicationCatalog(GenericName);
END;
GO

PRINT 'Catalog tables created';
GO

-- ============================================================================
-- LAB TEST CATALOG DATA
-- ============================================================================

-- Chemistry
INSERT INTO clinical.LabTestCatalog (TestCode, TestName, CPTCode, LOINCCode, Category, RequiresFasting, SpecimenType, TurnaroundTime, BasePrice) VALUES
('BMP', 'Basic Metabolic Panel', '80048', '51990-0', 'Chemistry', 1, 'Serum', '1-2 hours', 35.00),
('CMP', 'Comprehensive Metabolic Panel', '80053', '24323-8', 'Chemistry', 1, 'Serum', '1-2 hours', 45.00),
('GLUCOSE', 'Glucose, Fasting', '82947', '1558-6', 'Chemistry', 1, 'Serum', '30 min', 12.00),
('HBA1C', 'Hemoglobin A1c', '83036', '4548-4', 'Chemistry', 0, 'Whole Blood', '1-2 hours', 35.00),
('LIPID', 'Lipid Panel', '80061', '57698-3', 'Chemistry', 1, 'Serum', '1-2 hours', 40.00),
('LFT', 'Liver Function Tests', '80076', '24325-3', 'Chemistry', 0, 'Serum', '1-2 hours', 38.00),
('BUN', 'Blood Urea Nitrogen', '84520', '3094-0', 'Chemistry', 0, 'Serum', '30 min', 10.00),
('CREAT', 'Creatinine', '82565', '2160-0', 'Chemistry', 0, 'Serum', '30 min', 12.00),
('EGFR', 'eGFR (Estimated GFR)', '82565', '33914-3', 'Chemistry', 0, 'Serum', '30 min', 15.00),
('ELECTROLYTES', 'Electrolyte Panel', '80051', '55231-5', 'Chemistry', 0, 'Serum', '30 min', 25.00);
GO

-- Hematology
INSERT INTO clinical.LabTestCatalog (TestCode, TestName, CPTCode, LOINCCode, Category, RequiresFasting, SpecimenType, TurnaroundTime, BasePrice) VALUES
('CBC', 'Complete Blood Count with Diff', '85025', '57021-8', 'Hematology', 0, 'EDTA Whole Blood', '30 min', 18.00),
('CBC-ND', 'Complete Blood Count (No Diff)', '85027', '57782-5', 'Hematology', 0, 'EDTA Whole Blood', '20 min', 12.00),
('RETIC', 'Reticulocyte Count', '85044', '17849-1', 'Hematology', 0, 'EDTA Whole Blood', '1 hour', 15.00),
('ESR', 'Erythrocyte Sedimentation Rate', '85651', '30341-2', 'Hematology', 0, 'EDTA Whole Blood', '1 hour', 12.00),
('IRON', 'Iron Studies', '83540', '14749-6', 'Hematology', 1, 'Serum', '2-4 hours', 35.00),
('FERRITIN', 'Ferritin', '82728', '2276-4', 'Hematology', 0, 'Serum', '2-4 hours', 22.00),
('B12', 'Vitamin B12', '82607', '2132-9', 'Hematology', 0, 'Serum', '2-4 hours', 28.00),
('FOLATE', 'Folate', '82746', '2284-8', 'Hematology', 0, 'Serum', '2-4 hours', 25.00);
GO

-- Coagulation
INSERT INTO clinical.LabTestCatalog (TestCode, TestName, CPTCode, LOINCCode, Category, RequiresFasting, SpecimenType, TurnaroundTime, BasePrice) VALUES
('PT-INR', 'Prothrombin Time / INR', '85610', '5902-2', 'Coagulation', 0, 'Citrate Plasma', '30 min', 15.00),
('PTT', 'Partial Thromboplastin Time', '85730', '3173-2', 'Coagulation', 0, 'Citrate Plasma', '30 min', 18.00),
('DDIMER', 'D-Dimer', '85379', '48058-2', 'Coagulation', 0, 'Citrate Plasma', '1 hour', 45.00),
('FIBRINOGEN', 'Fibrinogen', '85384', '3255-7', 'Coagulation', 0, 'Citrate Plasma', '1-2 hours', 25.00);
GO

-- Cardiac Markers
INSERT INTO clinical.LabTestCatalog (TestCode, TestName, CPTCode, LOINCCode, Category, RequiresFasting, SpecimenType, TurnaroundTime, BasePrice) VALUES
('TROPONIN', 'Troponin I, High Sensitivity', '84484', '89579-7', 'Cardiac', 0, 'Serum', '30 min', 55.00),
('BNP', 'BNP (Brain Natriuretic Peptide)', '83880', '30934-4', 'Cardiac', 0, 'EDTA Plasma', '1 hour', 65.00),
('PRBNP', 'NT-proBNP', '83880', '33762-6', 'Cardiac', 0, 'Serum', '1 hour', 70.00),
('CK', 'Creatine Kinase, Total', '82550', '2157-6', 'Cardiac', 0, 'Serum', '30 min', 18.00),
('CKMB', 'CK-MB', '82553', '13969-1', 'Cardiac', 0, 'Serum', '30 min', 25.00);
GO

-- Thyroid
INSERT INTO clinical.LabTestCatalog (TestCode, TestName, CPTCode, LOINCCode, Category, RequiresFasting, SpecimenType, TurnaroundTime, BasePrice) VALUES
('TSH', 'Thyroid Stimulating Hormone', '84443', '3016-3', 'Thyroid', 0, 'Serum', '1-2 hours', 28.00),
('FT4', 'Free T4', '84439', '3024-7', 'Thyroid', 0, 'Serum', '1-2 hours', 25.00),
('FT3', 'Free T3', '84481', '3051-0', 'Thyroid', 0, 'Serum', '1-2 hours', 28.00),
('THYROID-PANEL', 'Thyroid Panel (TSH, Free T4)', '84436', '55231-5', 'Thyroid', 0, 'Serum', '1-2 hours', 45.00);
GO

-- Urinalysis
INSERT INTO clinical.LabTestCatalog (TestCode, TestName, CPTCode, LOINCCode, Category, RequiresFasting, SpecimenType, TurnaroundTime, BasePrice) VALUES
('UA', 'Urinalysis, Complete', '81003', '24356-8', 'Urinalysis', 0, 'Urine', '30 min', 12.00),
('UAMICRO', 'Urinalysis with Microscopy', '81001', '5767-9', 'Urinalysis', 0, 'Urine', '1 hour', 18.00),
('UCR', 'Urine Creatinine', '82570', '2161-8', 'Urinalysis', 0, 'Urine', '30 min', 10.00),
('MALB', 'Microalbumin, Urine', '82043', '14957-5', 'Urinalysis', 0, 'Urine', '1-2 hours', 22.00),
('ACR', 'Albumin/Creatinine Ratio, Urine', '82043', '14959-1', 'Urinalysis', 0, 'Urine', '1-2 hours', 28.00);
GO

-- Microbiology
INSERT INTO clinical.LabTestCatalog (TestCode, TestName, CPTCode, LOINCCode, Category, RequiresFasting, SpecimenType, TurnaroundTime, BasePrice) VALUES
('UCULTURE', 'Urine Culture', '87086', '630-4', 'Microbiology', 0, 'Urine', '24-48 hours', 35.00),
('BCULTURE', 'Blood Culture', '87040', '600-7', 'Microbiology', 0, 'Blood', '24-72 hours', 65.00),
('STREP', 'Rapid Strep Screen', '87880', '6558-4', 'Microbiology', 0, 'Throat Swab', '15 min', 25.00),
('FLU', 'Influenza A/B Rapid', '87804', '80382-5', 'Microbiology', 0, 'Nasal Swab', '15 min', 35.00),
('COVID', 'SARS-CoV-2 PCR', '87635', '94500-6', 'Microbiology', 0, 'Nasal Swab', '1-4 hours', 75.00);
GO

-- Inflammatory Markers
INSERT INTO clinical.LabTestCatalog (TestCode, TestName, CPTCode, LOINCCode, Category, RequiresFasting, SpecimenType, TurnaroundTime, BasePrice) VALUES
('CRP', 'C-Reactive Protein', '86140', '1988-5', 'Inflammatory', 0, 'Serum', '1-2 hours', 18.00),
('HSCRP', 'High-Sensitivity CRP', '86141', '30522-7', 'Inflammatory', 0, 'Serum', '1-2 hours', 28.00),
('PROCALC', 'Procalcitonin', '84145', '75241-0', 'Inflammatory', 0, 'Serum', '1-2 hours', 85.00),
('LACTIC', 'Lactic Acid', '83605', '2524-7', 'Inflammatory', 0, 'Plasma', '30 min', 25.00);
GO

PRINT 'Lab test catalog populated: ' + CAST(@@ROWCOUNT AS VARCHAR(10)) + ' tests';
GO

-- ============================================================================
-- IMAGING STUDY CATALOG DATA
-- ============================================================================

-- X-Ray Studies
INSERT INTO clinical.ImagingStudyCatalog (StudyCode, StudyName, Modality, BodyPart, CPTCode, EstimatedRadiationDose, ContrastOptions, BasePrice) VALUES
('XR-CHEST-1', 'Chest X-Ray, 1 View', 'XRay', 'Chest', '71045', 0.1, 'None', 45.00),
('XR-CHEST-2', 'Chest X-Ray, 2 Views', 'XRay', 'Chest', '71046', 0.1, 'None', 65.00),
('XR-CSPINE', 'Cervical Spine X-Ray', 'XRay', 'Cervical Spine', '72040', 0.2, 'None', 55.00),
('XR-LSPINE', 'Lumbar Spine X-Ray', 'XRay', 'Lumbar Spine', '72100', 1.5, 'None', 65.00),
('XR-ABD', 'Abdominal X-Ray', 'XRay', 'Abdomen', '74000', 0.7, 'None', 55.00),
('XR-KNEE', 'Knee X-Ray', 'XRay', 'Knee', '73562', 0.005, 'None', 45.00),
('XR-ANKLE', 'Ankle X-Ray', 'XRay', 'Ankle', '73600', 0.001, 'None', 45.00),
('XR-HAND', 'Hand X-Ray', 'XRay', 'Hand', '73130', 0.001, 'None', 40.00),
('XR-FOOT', 'Foot X-Ray', 'XRay', 'Foot', '73630', 0.001, 'None', 40.00),
('XR-SHOULDER', 'Shoulder X-Ray', 'XRay', 'Shoulder', '73030', 0.01, 'None', 50.00);
GO

-- CT Studies
INSERT INTO clinical.ImagingStudyCatalog (StudyCode, StudyName, Modality, BodyPart, CPTCode, EstimatedRadiationDose, PreparationRequired, ContrastOptions, BasePrice) VALUES
('CT-HEAD', 'CT Head without Contrast', 'CT', 'Head', '70450', 2.0, NULL, 'Optional', 350.00),
('CT-HEAD-C', 'CT Head with Contrast', 'CT', 'Head', '70460', 2.0, NULL, 'Required', 450.00),
('CT-CHEST', 'CT Chest without Contrast', 'CT', 'Chest', '71250', 7.0, NULL, 'Optional', 400.00),
('CT-CHEST-C', 'CT Chest with Contrast', 'CT', 'Chest', '71260', 7.0, NULL, 'Required', 500.00),
('CT-ABD-PELVIS', 'CT Abdomen/Pelvis without Contrast', 'CT', 'Abdomen/Pelvis', '74176', 10.0, 'NPO 4 hours', 'Optional', 450.00),
('CT-ABD-PELVIS-C', 'CT Abdomen/Pelvis with Contrast', 'CT', 'Abdomen/Pelvis', '74177', 10.0, 'NPO 4 hours', 'Required', 550.00),
('CT-CSPINE', 'CT Cervical Spine', 'CT', 'Cervical Spine', '72125', 6.0, NULL, 'Optional', 350.00),
('CT-LSPINE', 'CT Lumbar Spine', 'CT', 'Lumbar Spine', '72131', 6.0, NULL, 'Optional', 350.00),
('CTA-HEAD', 'CT Angiography Head', 'CT', 'Head', '70496', 5.0, NULL, 'Required', 650.00),
('CTA-CHEST', 'CT Angiography Chest (PE Protocol)', 'CT', 'Chest', '71275', 15.0, NULL, 'Required', 750.00);
GO

-- MRI Studies
INSERT INTO clinical.ImagingStudyCatalog (StudyCode, StudyName, Modality, BodyPart, CPTCode, EstimatedRadiationDose, PreparationRequired, ContrastOptions, BasePrice) VALUES
('MRI-BRAIN', 'MRI Brain without Contrast', 'MRI', 'Brain', '70551', 0, 'Remove metal', 'Optional', 850.00),
('MRI-BRAIN-C', 'MRI Brain with Contrast', 'MRI', 'Brain', '70553', 0, 'Remove metal', 'Required', 1050.00),
('MRI-CSPINE', 'MRI Cervical Spine', 'MRI', 'Cervical Spine', '72141', 0, 'Remove metal', 'Optional', 800.00),
('MRI-LSPINE', 'MRI Lumbar Spine', 'MRI', 'Lumbar Spine', '72148', 0, 'Remove metal', 'Optional', 800.00),
('MRI-KNEE', 'MRI Knee', 'MRI', 'Knee', '73721', 0, 'Remove metal', 'Optional', 750.00),
('MRI-SHOULDER', 'MRI Shoulder', 'MRI', 'Shoulder', '73221', 0, 'Remove metal', 'Optional', 750.00),
('MRI-ABD', 'MRI Abdomen', 'MRI', 'Abdomen', '74181', 0, 'NPO 4 hours', 'Optional', 900.00),
('MRA-HEAD', 'MR Angiography Head', 'MRI', 'Head', '70544', 0, 'Remove metal', 'Optional', 950.00);
GO

-- Ultrasound Studies
INSERT INTO clinical.ImagingStudyCatalog (StudyCode, StudyName, Modality, BodyPart, CPTCode, EstimatedRadiationDose, PreparationRequired, ContrastOptions, BasePrice) VALUES
('US-ABD', 'Ultrasound Abdomen Complete', 'Ultrasound', 'Abdomen', '76700', 0, 'NPO 8 hours', 'None', 250.00),
('US-PELVIS', 'Ultrasound Pelvis', 'Ultrasound', 'Pelvis', '76856', 0, 'Full bladder', 'None', 250.00),
('US-THYROID', 'Ultrasound Thyroid', 'Ultrasound', 'Thyroid', '76536', 0, NULL, 'None', 200.00),
('US-CAROTID', 'Carotid Duplex', 'Ultrasound', 'Neck', '93880', 0, NULL, 'None', 350.00),
('US-LE-VENOUS', 'Lower Extremity Venous Duplex', 'Ultrasound', 'Lower Extremity', '93970', 0, NULL, 'None', 350.00),
('US-RENAL', 'Ultrasound Renal', 'Ultrasound', 'Kidneys', '76770', 0, NULL, 'None', 250.00),
('ECHO', 'Echocardiogram', 'Ultrasound', 'Heart', '93306', 0, NULL, 'None', 450.00);
GO

PRINT 'Imaging study catalog populated';
GO

-- ============================================================================
-- MEDICATION CATALOG DATA (Common medications)
-- ============================================================================

-- Antibiotics
INSERT INTO clinical.MedicationCatalog (MedicationCode, BrandName, GenericName, Strength, Form, DrugClass, IsControlledSubstance, CommonDosage, CommonFrequency) VALUES
('RX-AMOX-500', 'Amoxil', 'Amoxicillin', '500mg', 'Capsule', 'Antibiotic', 0, '500mg', 'Three times daily'),
('RX-AMOX-875', 'Augmentin', 'Amoxicillin-Clavulanate', '875mg', 'Tablet', 'Antibiotic', 0, '875mg', 'Twice daily'),
('RX-AZITH-250', 'Zithromax', 'Azithromycin', '250mg', 'Tablet', 'Antibiotic', 0, '250mg', 'Daily x 5 days'),
('RX-CIPRO-500', 'Cipro', 'Ciprofloxacin', '500mg', 'Tablet', 'Antibiotic', 0, '500mg', 'Twice daily'),
('RX-DOXY-100', 'Vibramycin', 'Doxycycline', '100mg', 'Capsule', 'Antibiotic', 0, '100mg', 'Twice daily'),
('RX-BACTRIM-DS', 'Bactrim DS', 'Sulfamethoxazole-Trimethoprim', '800-160mg', 'Tablet', 'Antibiotic', 0, '1 tablet', 'Twice daily');
GO

-- Pain / Anti-inflammatory
INSERT INTO clinical.MedicationCatalog (MedicationCode, BrandName, GenericName, Strength, Form, DrugClass, IsControlledSubstance, DEASchedule, CommonDosage, CommonFrequency) VALUES
('RX-IBU-400', 'Motrin', 'Ibuprofen', '400mg', 'Tablet', 'NSAID', 0, NULL, '400mg', 'Every 6 hours as needed'),
('RX-IBU-800', 'Motrin', 'Ibuprofen', '800mg', 'Tablet', 'NSAID', 0, NULL, '800mg', 'Three times daily'),
('RX-NAPRO-500', 'Naprosyn', 'Naproxen', '500mg', 'Tablet', 'NSAID', 0, NULL, '500mg', 'Twice daily'),
('RX-APAP-500', 'Tylenol', 'Acetaminophen', '500mg', 'Tablet', 'Analgesic', 0, NULL, '500-1000mg', 'Every 6 hours as needed'),
('RX-TRAM-50', 'Ultram', 'Tramadol', '50mg', 'Tablet', 'Opioid Analgesic', 1, 'IV', '50mg', 'Every 6 hours as needed'),
('RX-NORCO-5', 'Norco', 'Hydrocodone-Acetaminophen', '5-325mg', 'Tablet', 'Opioid Analgesic', 1, 'II', '1-2 tablets', 'Every 4-6 hours as needed'),
('RX-OXY-5', 'Oxycontin', 'Oxycodone', '5mg', 'Tablet', 'Opioid Analgesic', 1, 'II', '5mg', 'Every 4-6 hours as needed');
GO

-- Cardiovascular
INSERT INTO clinical.MedicationCatalog (MedicationCode, BrandName, GenericName, Strength, Form, DrugClass, IsControlledSubstance, CommonDosage, CommonFrequency) VALUES
('RX-LISIN-10', 'Prinivil', 'Lisinopril', '10mg', 'Tablet', 'ACE Inhibitor', 0, '10mg', 'Daily'),
('RX-LISIN-20', 'Prinivil', 'Lisinopril', '20mg', 'Tablet', 'ACE Inhibitor', 0, '20mg', 'Daily'),
('RX-ATOR-20', 'Lipitor', 'Atorvastatin', '20mg', 'Tablet', 'Statin', 0, '20mg', 'Daily at bedtime'),
('RX-ATOR-40', 'Lipitor', 'Atorvastatin', '40mg', 'Tablet', 'Statin', 0, '40mg', 'Daily at bedtime'),
('RX-METOP-25', 'Lopressor', 'Metoprolol Tartrate', '25mg', 'Tablet', 'Beta Blocker', 0, '25mg', 'Twice daily'),
('RX-METOP-50', 'Lopressor', 'Metoprolol Tartrate', '50mg', 'Tablet', 'Beta Blocker', 0, '50mg', 'Twice daily'),
('RX-AMLO-5', 'Norvasc', 'Amlodipine', '5mg', 'Tablet', 'Calcium Channel Blocker', 0, '5mg', 'Daily'),
('RX-LOSARTAN-50', 'Cozaar', 'Losartan', '50mg', 'Tablet', 'ARB', 0, '50mg', 'Daily'),
('RX-ASA-81', 'Aspirin', 'Aspirin', '81mg', 'Tablet', 'Antiplatelet', 0, '81mg', 'Daily');
GO

-- Diabetes
INSERT INTO clinical.MedicationCatalog (MedicationCode, BrandName, GenericName, Strength, Form, DrugClass, IsControlledSubstance, CommonDosage, CommonFrequency) VALUES
('RX-METF-500', 'Glucophage', 'Metformin', '500mg', 'Tablet', 'Biguanide', 0, '500mg', 'Twice daily with meals'),
('RX-METF-1000', 'Glucophage', 'Metformin', '1000mg', 'Tablet', 'Biguanide', 0, '1000mg', 'Twice daily with meals'),
('RX-GLIP-5', 'Glucotrol', 'Glipizide', '5mg', 'Tablet', 'Sulfonylurea', 0, '5mg', 'Daily before breakfast'),
('RX-JARD-10', 'Jardiance', 'Empagliflozin', '10mg', 'Tablet', 'SGLT2 Inhibitor', 0, '10mg', 'Daily');
GO

-- Respiratory
INSERT INTO clinical.MedicationCatalog (MedicationCode, BrandName, GenericName, Strength, Form, DrugClass, IsControlledSubstance, CommonDosage, CommonFrequency) VALUES
('RX-ALB-HFA', 'ProAir', 'Albuterol', '90mcg/actuation', 'Inhaler', 'Beta-2 Agonist', 0, '2 puffs', 'Every 4-6 hours as needed'),
('RX-FLUTIC', 'Flovent', 'Fluticasone', '110mcg', 'Inhaler', 'Corticosteroid', 0, '2 puffs', 'Twice daily'),
('RX-MONTEL-10', 'Singulair', 'Montelukast', '10mg', 'Tablet', 'Leukotriene Inhibitor', 0, '10mg', 'Daily at bedtime'),
('RX-PRED-10', 'Deltasone', 'Prednisone', '10mg', 'Tablet', 'Corticosteroid', 0, '40-60mg', 'Daily for 5 days');
GO

-- GI
INSERT INTO clinical.MedicationCatalog (MedicationCode, BrandName, GenericName, Strength, Form, DrugClass, IsControlledSubstance, CommonDosage, CommonFrequency) VALUES
('RX-OMEP-20', 'Prilosec', 'Omeprazole', '20mg', 'Capsule', 'PPI', 0, '20mg', 'Daily before breakfast'),
('RX-PANTO-40', 'Protonix', 'Pantoprazole', '40mg', 'Tablet', 'PPI', 0, '40mg', 'Daily before breakfast'),
('RX-ONDANS-4', 'Zofran', 'Ondansetron', '4mg', 'Tablet', 'Antiemetic', 0, '4-8mg', 'Every 8 hours as needed');
GO

-- Psychiatric
INSERT INTO clinical.MedicationCatalog (MedicationCode, BrandName, GenericName, Strength, Form, DrugClass, IsControlledSubstance, DEASchedule, HasBlackBoxWarning, CommonDosage, CommonFrequency) VALUES
('RX-SERT-50', 'Zoloft', 'Sertraline', '50mg', 'Tablet', 'SSRI', 0, NULL, 1, '50mg', 'Daily'),
('RX-ESCIT-10', 'Lexapro', 'Escitalopram', '10mg', 'Tablet', 'SSRI', 0, NULL, 1, '10mg', 'Daily'),
('RX-FLUOX-20', 'Prozac', 'Fluoxetine', '20mg', 'Capsule', 'SSRI', 0, NULL, 1, '20mg', 'Daily'),
('RX-LORAZ-1', 'Ativan', 'Lorazepam', '1mg', 'Tablet', 'Benzodiazepine', 1, 'IV', 0, '1mg', 'Every 8 hours as needed'),
('RX-ALPRAZ-0.5', 'Xanax', 'Alprazolam', '0.5mg', 'Tablet', 'Benzodiazepine', 1, 'IV', 0, '0.5mg', 'Three times daily as needed');
GO

PRINT 'Medication catalog populated';
GO

-- ============================================================================
-- SPECIALTIES REFERENCE
-- ============================================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Specialties' AND schema_id = SCHEMA_ID('clinical'))
BEGIN
    CREATE TABLE clinical.Specialties (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Name NVARCHAR(100) NOT NULL,
        Description NVARCHAR(500) NULL,
        IsActive BIT NOT NULL DEFAULT 1
    );
END;
GO

INSERT INTO clinical.Specialties (Name, Description) VALUES
('Cardiology', 'Diagnosis and treatment of heart and cardiovascular diseases'),
('Dermatology', 'Diagnosis and treatment of skin conditions'),
('Endocrinology', 'Diagnosis and treatment of hormone-related conditions'),
('Gastroenterology', 'Diagnosis and treatment of digestive system disorders'),
('Hematology', 'Diagnosis and treatment of blood disorders'),
('Infectious Disease', 'Diagnosis and treatment of infectious diseases'),
('Nephrology', 'Diagnosis and treatment of kidney diseases'),
('Neurology', 'Diagnosis and treatment of nervous system disorders'),
('Oncology', 'Diagnosis and treatment of cancer'),
('Ophthalmology', 'Diagnosis and treatment of eye conditions'),
('Orthopedics', 'Diagnosis and treatment of musculoskeletal conditions'),
('Otolaryngology', 'Diagnosis and treatment of ear, nose, and throat conditions'),
('Pulmonology', 'Diagnosis and treatment of respiratory diseases'),
('Rheumatology', 'Diagnosis and treatment of autoimmune and joint diseases'),
('Urology', 'Diagnosis and treatment of urinary tract and male reproductive conditions'),
('Psychiatry', 'Diagnosis and treatment of mental health conditions'),
('General Surgery', 'Surgical treatment of various conditions');
GO

PRINT 'Specialties reference populated';
GO

-- ============================================================================
-- SUMMARY
-- ============================================================================

PRINT '';
PRINT '============================================================================';
PRINT 'ATTENDING AI Seed Data Loaded Successfully!';
PRINT '============================================================================';
PRINT '';

SELECT 'Lab Tests' AS Catalog, COUNT(*) AS Count FROM clinical.LabTestCatalog
UNION ALL
SELECT 'Imaging Studies', COUNT(*) FROM clinical.ImagingStudyCatalog
UNION ALL
SELECT 'Medications', COUNT(*) FROM clinical.MedicationCatalog
UNION ALL
SELECT 'Specialties', COUNT(*) FROM clinical.Specialties;
GO

PRINT '';
PRINT 'Next: Run 003-SampleData.sql for test patients and orders (dev only)';
PRINT '============================================================================';
GO
