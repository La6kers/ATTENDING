// ============================================================
// Lab Catalog - Centralized Lab Test Database
// apps/shared/data/catalogs/labCatalog.ts
//
// Comprehensive lab test catalog with CPT/LOINC codes
// ============================================================

import type { OrderPriority } from '../../stores/types';

// =============================================================================
// Types
// =============================================================================

export type LabCategory = 
  | 'hematology' 
  | 'chemistry' 
  | 'endocrine' 
  | 'coagulation' 
  | 'microbiology' 
  | 'urinalysis' 
  | 'immunology' 
  | 'toxicology' 
  | 'cardiac'
  | 'other';

export interface LabTest {
  code: string;
  name: string;
  description: string;
  category: LabCategory;
  defaultPriority: OrderPriority;
  cost: number;
  turnaroundHours: number;
  requiresFasting?: boolean;
  specimenType?: string;
  cptCode?: string;
  loincCode?: string;
}

export interface LabPanel {
  id: string;
  name: string;
  abbreviation: string;
  description: string;
  tests: string[];
  cost: number;
  category: LabCategory;
  commonIndications: string[];
}

// =============================================================================
// Lab Catalog
// =============================================================================

export const LAB_CATALOG: Record<string, LabTest> = {
  // ---------------------------------------------------------------------------
  // Hematology
  // ---------------------------------------------------------------------------
  'CBC': {
    code: 'CBC',
    name: 'Complete Blood Count',
    description: 'Measures red cells, white cells, hemoglobin, hematocrit, and platelets',
    category: 'hematology',
    defaultPriority: 'ROUTINE',
    cost: 18,
    turnaroundHours: 2,
    specimenType: 'Whole Blood (EDTA)',
    cptCode: '85025',
    loincCode: '58410-2'
  },
  'CBC-DIFF': {
    code: 'CBC-DIFF',
    name: 'Complete Blood Count with Differential',
    description: 'CBC plus white cell differential count for infection and hematologic disorders',
    category: 'hematology',
    defaultPriority: 'ROUTINE',
    cost: 24,
    turnaroundHours: 2,
    specimenType: 'Whole Blood (EDTA)',
    cptCode: '85025',
    loincCode: '57021-8'
  },
  'ESR': {
    code: 'ESR',
    name: 'Erythrocyte Sedimentation Rate',
    description: 'Non-specific inflammatory marker',
    category: 'hematology',
    defaultPriority: 'ROUTINE',
    cost: 15,
    turnaroundHours: 1,
    specimenType: 'Whole Blood (EDTA)',
    cptCode: '85652',
    loincCode: '30341-2'
  },
  'RETIC': {
    code: 'RETIC',
    name: 'Reticulocyte Count',
    description: 'Measures immature red blood cells for anemia workup',
    category: 'hematology',
    defaultPriority: 'ROUTINE',
    cost: 20,
    turnaroundHours: 4,
    specimenType: 'Whole Blood (EDTA)',
    cptCode: '85044'
  },

  // ---------------------------------------------------------------------------
  // Chemistry - Basic
  // ---------------------------------------------------------------------------
  'BMP': {
    code: 'BMP',
    name: 'Basic Metabolic Panel',
    description: 'Glucose, BUN, creatinine, sodium, potassium, chloride, CO2, calcium',
    category: 'chemistry',
    defaultPriority: 'ROUTINE',
    cost: 35,
    turnaroundHours: 4,
    specimenType: 'Serum',
    cptCode: '80048',
    loincCode: '51990-0'
  },
  'CMP': {
    code: 'CMP',
    name: 'Comprehensive Metabolic Panel',
    description: 'BMP plus liver function tests, albumin, and total protein',
    category: 'chemistry',
    defaultPriority: 'ROUTINE',
    cost: 45,
    turnaroundHours: 4,
    specimenType: 'Serum',
    cptCode: '80053',
    loincCode: '24323-8'
  },
  'CRP': {
    code: 'CRP',
    name: 'C-Reactive Protein',
    description: 'Acute phase inflammatory marker',
    category: 'chemistry',
    defaultPriority: 'ROUTINE',
    cost: 16,
    turnaroundHours: 2,
    specimenType: 'Serum',
    cptCode: '86140',
    loincCode: '1988-5'
  },
  'CRP-HS': {
    code: 'CRP-HS',
    name: 'High-Sensitivity C-Reactive Protein',
    description: 'Cardiovascular risk assessment marker',
    category: 'chemistry',
    defaultPriority: 'ROUTINE',
    cost: 28,
    turnaroundHours: 4,
    specimenType: 'Serum',
    cptCode: '86141',
    loincCode: '30522-7'
  },
  'GLU': {
    code: 'GLU',
    name: 'Glucose, Fasting',
    description: 'Blood sugar level for diabetes screening',
    category: 'chemistry',
    defaultPriority: 'ROUTINE',
    cost: 12,
    turnaroundHours: 2,
    requiresFasting: true,
    specimenType: 'Serum',
    cptCode: '82947',
    loincCode: '1558-6'
  },
  'HBA1C': {
    code: 'HBA1C',
    name: 'Hemoglobin A1C',
    description: 'Three-month average blood glucose',
    category: 'chemistry',
    defaultPriority: 'ROUTINE',
    cost: 32,
    turnaroundHours: 4,
    specimenType: 'Whole Blood (EDTA)',
    cptCode: '83036',
    loincCode: '4548-4'
  },
  'LIPID': {
    code: 'LIPID',
    name: 'Lipid Panel',
    description: 'Total cholesterol, HDL, LDL, triglycerides',
    category: 'chemistry',
    defaultPriority: 'ROUTINE',
    cost: 38,
    turnaroundHours: 4,
    requiresFasting: true,
    specimenType: 'Serum',
    cptCode: '80061',
    loincCode: '57698-3'
  },
  'LFT': {
    code: 'LFT',
    name: 'Liver Function Tests',
    description: 'AST, ALT, alkaline phosphatase, total bilirubin',
    category: 'chemistry',
    defaultPriority: 'ROUTINE',
    cost: 28,
    turnaroundHours: 4,
    specimenType: 'Serum',
    cptCode: '80076'
  },
  'MG': {
    code: 'MG',
    name: 'Magnesium',
    description: 'Electrolyte important for muscle and nerve function',
    category: 'chemistry',
    defaultPriority: 'ROUTINE',
    cost: 19,
    turnaroundHours: 4,
    specimenType: 'Serum',
    cptCode: '83735',
    loincCode: '19123-9'
  },
  'LIPASE': {
    code: 'LIPASE',
    name: 'Lipase',
    description: 'Pancreatic enzyme, specific for pancreatitis',
    category: 'chemistry',
    defaultPriority: 'ROUTINE',
    cost: 25,
    turnaroundHours: 4,
    specimenType: 'Serum',
    cptCode: '83690',
    loincCode: '3040-3'
  },

  // ---------------------------------------------------------------------------
  // Cardiac Markers
  // ---------------------------------------------------------------------------
  'TROP-I': {
    code: 'TROP-I',
    name: 'Troponin I',
    description: 'Cardiac muscle damage marker for ACS',
    category: 'cardiac',
    defaultPriority: 'STAT',
    cost: 45,
    turnaroundHours: 1,
    specimenType: 'Serum',
    cptCode: '84484',
    loincCode: '10839-9'
  },
  'BNP': {
    code: 'BNP',
    name: 'Brain Natriuretic Peptide',
    description: 'Heart failure marker',
    category: 'cardiac',
    defaultPriority: 'ROUTINE',
    cost: 55,
    turnaroundHours: 4,
    specimenType: 'Plasma (EDTA)',
    cptCode: '83880',
    loincCode: '30934-4'
  },
  'DDIMER': {
    code: 'DDIMER',
    name: 'D-Dimer',
    description: 'Fibrin degradation product for DVT/PE evaluation',
    category: 'coagulation',
    defaultPriority: 'STAT',
    cost: 42,
    turnaroundHours: 2,
    specimenType: 'Plasma (Citrate)',
    cptCode: '85379',
    loincCode: '48066-5'
  },

  // ---------------------------------------------------------------------------
  // Endocrine
  // ---------------------------------------------------------------------------
  'TSH': {
    code: 'TSH',
    name: 'Thyroid Stimulating Hormone',
    description: 'Primary thyroid function screening',
    category: 'endocrine',
    defaultPriority: 'ROUTINE',
    cost: 35,
    turnaroundHours: 4,
    specimenType: 'Serum',
    cptCode: '84443',
    loincCode: '3016-3'
  },
  'FT4': {
    code: 'FT4',
    name: 'Free T4',
    description: 'Measures unbound thyroxine',
    category: 'endocrine',
    defaultPriority: 'ROUTINE',
    cost: 32,
    turnaroundHours: 4,
    specimenType: 'Serum',
    cptCode: '84439',
    loincCode: '3024-7'
  },
  'HCG-U': {
    code: 'HCG-U',
    name: 'Urine Pregnancy Test',
    description: 'Qualitative urine pregnancy test',
    category: 'endocrine',
    defaultPriority: 'STAT',
    cost: 12,
    turnaroundHours: 0.5,
    specimenType: 'Urine',
    cptCode: '81025',
    loincCode: '2106-3'
  },
  'VITD': {
    code: 'VITD',
    name: 'Vitamin D, 25-Hydroxy',
    description: 'Vitamin D status assessment',
    category: 'endocrine',
    defaultPriority: 'ROUTINE',
    cost: 65,
    turnaroundHours: 24,
    specimenType: 'Serum',
    cptCode: '82306',
    loincCode: '1989-3'
  },
  'B12': {
    code: 'B12',
    name: 'Vitamin B12',
    description: 'B12 deficiency screening',
    category: 'endocrine',
    defaultPriority: 'ROUTINE',
    cost: 38,
    turnaroundHours: 24,
    specimenType: 'Serum',
    cptCode: '82607',
    loincCode: '2132-9'
  },
  'FERRITIN': {
    code: 'FERRITIN',
    name: 'Ferritin',
    description: 'Iron storage marker',
    category: 'endocrine',
    defaultPriority: 'ROUTINE',
    cost: 32,
    turnaroundHours: 4,
    specimenType: 'Serum',
    cptCode: '82728',
    loincCode: '2276-4'
  },
  'IRON': {
    code: 'IRON',
    name: 'Iron and TIBC',
    description: 'Iron status with total iron binding capacity',
    category: 'endocrine',
    defaultPriority: 'ROUTINE',
    cost: 28,
    turnaroundHours: 4,
    specimenType: 'Serum',
    cptCode: '83540',
    loincCode: '2498-4'
  },

  // ---------------------------------------------------------------------------
  // Coagulation
  // ---------------------------------------------------------------------------
  'PT-INR': {
    code: 'PT-INR',
    name: 'Prothrombin Time/INR',
    description: 'Coagulation monitoring, warfarin therapy',
    category: 'coagulation',
    defaultPriority: 'ROUTINE',
    cost: 18,
    turnaroundHours: 2,
    specimenType: 'Plasma (Citrate)',
    cptCode: '85610',
    loincCode: '5902-2'
  },
  'PTT': {
    code: 'PTT',
    name: 'Partial Thromboplastin Time',
    description: 'Coagulation screening and heparin monitoring',
    category: 'coagulation',
    defaultPriority: 'ROUTINE',
    cost: 18,
    turnaroundHours: 2,
    specimenType: 'Plasma (Citrate)',
    cptCode: '85730',
    loincCode: '3173-2'
  },

  // ---------------------------------------------------------------------------
  // Urinalysis
  // ---------------------------------------------------------------------------
  'UA': {
    code: 'UA',
    name: 'Urinalysis',
    description: 'Complete urinalysis',
    category: 'urinalysis',
    defaultPriority: 'ROUTINE',
    cost: 14,
    turnaroundHours: 2,
    specimenType: 'Urine',
    cptCode: '81003',
    loincCode: '24356-8'
  },
  'UA-MICRO': {
    code: 'UA-MICRO',
    name: 'Urinalysis with Microscopy',
    description: 'Urinalysis with manual microscopic examination',
    category: 'urinalysis',
    defaultPriority: 'ROUTINE',
    cost: 18,
    turnaroundHours: 2,
    specimenType: 'Urine',
    cptCode: '81001',
    loincCode: '24356-8'
  },
  'UCULT': {
    code: 'UCULT',
    name: 'Urine Culture',
    description: 'Culture for urinary tract infection',
    category: 'microbiology',
    defaultPriority: 'ROUTINE',
    cost: 35,
    turnaroundHours: 48,
    specimenType: 'Urine',
    cptCode: '87086',
    loincCode: '630-4'
  },

  // ---------------------------------------------------------------------------
  // Immunology
  // ---------------------------------------------------------------------------
  'ANA': {
    code: 'ANA',
    name: 'Antinuclear Antibody',
    description: 'Autoimmune disease screening',
    category: 'immunology',
    defaultPriority: 'ROUTINE',
    cost: 45,
    turnaroundHours: 24,
    specimenType: 'Serum',
    cptCode: '86038',
    loincCode: '8061-4'
  },
  'RF': {
    code: 'RF',
    name: 'Rheumatoid Factor',
    description: 'Rheumatoid arthritis marker',
    category: 'immunology',
    defaultPriority: 'ROUTINE',
    cost: 28,
    turnaroundHours: 24,
    specimenType: 'Serum',
    cptCode: '86431',
    loincCode: '11572-5'
  },

  // ---------------------------------------------------------------------------
  // Microbiology
  // ---------------------------------------------------------------------------
  'BCULT': {
    code: 'BCULT',
    name: 'Blood Culture',
    description: 'Aerobic and anaerobic blood cultures',
    category: 'microbiology',
    defaultPriority: 'STAT',
    cost: 85,
    turnaroundHours: 72,
    specimenType: 'Blood (Culture Bottles)',
    cptCode: '87040'
  },
  'STREP': {
    code: 'STREP',
    name: 'Rapid Strep Test',
    description: 'Group A streptococcus antigen detection',
    category: 'microbiology',
    defaultPriority: 'STAT',
    cost: 18,
    turnaroundHours: 0.5,
    specimenType: 'Throat Swab',
    cptCode: '87880'
  },
  'FLU': {
    code: 'FLU',
    name: 'Influenza A/B Rapid',
    description: 'Rapid influenza A and B antigen test',
    category: 'microbiology',
    defaultPriority: 'STAT',
    cost: 35,
    turnaroundHours: 0.5,
    specimenType: 'Nasopharyngeal Swab',
    cptCode: '87804'
  },
  'COVID': {
    code: 'COVID',
    name: 'COVID-19 PCR',
    description: 'SARS-CoV-2 nucleic acid amplification test',
    category: 'microbiology',
    defaultPriority: 'ROUTINE',
    cost: 75,
    turnaroundHours: 24,
    specimenType: 'Nasopharyngeal Swab',
    cptCode: '87635'
  },

  // ---------------------------------------------------------------------------
  // Toxicology
  // ---------------------------------------------------------------------------
  'UTOX': {
    code: 'UTOX',
    name: 'Urine Drug Screen',
    description: 'Standard 10-panel drug screen',
    category: 'toxicology',
    defaultPriority: 'ROUTINE',
    cost: 35,
    turnaroundHours: 4,
    specimenType: 'Urine',
    cptCode: '80307'
  },
  'ETOH': {
    code: 'ETOH',
    name: 'Blood Alcohol Level',
    description: 'Serum ethanol concentration',
    category: 'toxicology',
    defaultPriority: 'STAT',
    cost: 25,
    turnaroundHours: 1,
    specimenType: 'Serum',
    cptCode: '80320',
    loincCode: '5643-2'
  },
};

// =============================================================================
// Lab Panels
// =============================================================================

export const LAB_PANELS: Record<string, LabPanel> = {
  'BASIC': {
    id: 'BASIC',
    name: 'Basic Metabolic Panel',
    abbreviation: 'BMP',
    description: 'Glucose, BUN, creatinine, electrolytes, calcium',
    tests: ['BMP'],
    cost: 35,
    category: 'chemistry',
    commonIndications: ['General screening', 'Medication monitoring', 'Kidney function']
  },
  'COMP': {
    id: 'COMP',
    name: 'Comprehensive Metabolic Panel',
    abbreviation: 'CMP',
    description: 'BMP plus liver function tests',
    tests: ['CMP'],
    cost: 45,
    category: 'chemistry',
    commonIndications: ['Pre-operative', 'Annual physical', 'Liver function']
  },
  'CBC-PANEL': {
    id: 'CBC-PANEL',
    name: 'CBC with Differential',
    abbreviation: 'CBC w/Diff',
    description: 'Full blood count with white cell differential',
    tests: ['CBC-DIFF'],
    cost: 24,
    category: 'hematology',
    commonIndications: ['Infection workup', 'Anemia evaluation', 'Pre-operative']
  },
  'THYROID': {
    id: 'THYROID',
    name: 'Thyroid Panel',
    abbreviation: 'Thyroid',
    description: 'TSH and Free T4',
    tests: ['TSH', 'FT4'],
    cost: 67,
    category: 'endocrine',
    commonIndications: ['Thyroid dysfunction', 'Fatigue workup', 'Weight changes']
  },
  'CARDIAC': {
    id: 'CARDIAC',
    name: 'Cardiac Panel',
    abbreviation: 'Cardiac',
    description: 'Troponin I and BNP',
    tests: ['TROP-I', 'BNP'],
    cost: 100,
    category: 'cardiac',
    commonIndications: ['Chest pain', 'Heart failure', 'ACS evaluation']
  },
  'INFLAM': {
    id: 'INFLAM',
    name: 'Inflammatory Markers',
    abbreviation: 'Inflam',
    description: 'ESR and CRP',
    tests: ['ESR', 'CRP'],
    cost: 31,
    category: 'chemistry',
    commonIndications: ['Infection', 'Autoimmune disease', 'Temporal arteritis']
  },
  'ANEMIA': {
    id: 'ANEMIA',
    name: 'Anemia Panel',
    abbreviation: 'Anemia',
    description: 'CBC, Iron studies, B12, Ferritin',
    tests: ['CBC-DIFF', 'IRON', 'FERRITIN', 'B12'],
    cost: 122,
    category: 'hematology',
    commonIndications: ['Anemia workup', 'Fatigue', 'Iron deficiency']
  },
  'COAG': {
    id: 'COAG',
    name: 'Coagulation Panel',
    abbreviation: 'Coags',
    description: 'PT/INR and PTT',
    tests: ['PT-INR', 'PTT'],
    cost: 36,
    category: 'coagulation',
    commonIndications: ['Pre-operative', 'Anticoagulation therapy', 'Bleeding disorder']
  },
};

export default LAB_CATALOG;
