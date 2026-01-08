// ============================================================
// Lab Ordering Store - Zustand with BioMistral AI Integration
// apps/provider-portal/store/labOrderingStore.ts
//
// Manages lab ordering workflow with AI-powered recommendations
// ============================================================

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// =============================================================================
// Types
// =============================================================================

export type LabPriority = 'STAT' | 'ASAP' | 'ROUTINE';
export type LabCategory = 'hematology' | 'chemistry' | 'endocrine' | 'coagulation' | 'microbiology' | 'urinalysis' | 'immunology' | 'toxicology' | 'other';

export interface LabTest {
  code: string;
  name: string;
  description: string;
  category: LabCategory;
  defaultPriority: LabPriority;
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
  tests: string[]; // Array of test codes
  cost: number;
  category: LabCategory;
  commonIndications: string[];
}

export interface AILabRecommendation {
  id: string;
  testCode: string;
  testName: string;
  priority: LabPriority;
  rationale: string;
  clinicalEvidence: string[];
  confidence: number; // 0-1
  category: 'critical' | 'recommended' | 'consider';
  redFlagRelated?: boolean;
}

export interface SelectedLab {
  test: LabTest;
  priority: LabPriority;
  aiRecommended: boolean;
  rationale?: string;
}

export interface PatientContext {
  id: string;
  name: string;
  age: number;
  gender: string;
  mrn: string;
  chiefComplaint: string;
  allergies: string[];
  currentMedications: string[];
  medicalHistory: string[];
  redFlags: string[];
}

// =============================================================================
// Lab Catalog - Comprehensive test database
// =============================================================================

export const LAB_CATALOG: Record<string, LabTest> = {
  // Hematology
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
    description: 'Non-specific inflammatory marker, elevated in infection and autoimmune conditions',
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

  // Chemistry - Basic
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
    description: 'Acute phase inflammatory marker, more sensitive than ESR',
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
    description: 'Blood sugar level for diabetes screening and monitoring',
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
    description: 'Three-month average blood glucose for diabetes monitoring',
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
  'BUN': {
    code: 'BUN',
    name: 'Blood Urea Nitrogen',
    description: 'Kidney function marker',
    category: 'chemistry',
    defaultPriority: 'ROUTINE',
    cost: 10,
    turnaroundHours: 2,
    specimenType: 'Serum',
    cptCode: '84520',
    loincCode: '3094-0'
  },
  'CR': {
    code: 'CR',
    name: 'Creatinine',
    description: 'Kidney function marker',
    category: 'chemistry',
    defaultPriority: 'ROUTINE',
    cost: 10,
    turnaroundHours: 2,
    specimenType: 'Serum',
    cptCode: '82565',
    loincCode: '2160-0'
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
  'PHOS': {
    code: 'PHOS',
    name: 'Phosphorus',
    description: 'Mineral important for bone health and energy metabolism',
    category: 'chemistry',
    defaultPriority: 'ROUTINE',
    cost: 15,
    turnaroundHours: 4,
    specimenType: 'Serum',
    cptCode: '84100',
    loincCode: '2777-1'
  },
  'URIC': {
    code: 'URIC',
    name: 'Uric Acid',
    description: 'Elevated in gout and kidney disease',
    category: 'chemistry',
    defaultPriority: 'ROUTINE',
    cost: 18,
    turnaroundHours: 4,
    specimenType: 'Serum',
    cptCode: '84550',
    loincCode: '3084-1'
  },
  'AMYLASE': {
    code: 'AMYLASE',
    name: 'Amylase',
    description: 'Pancreatic enzyme, elevated in pancreatitis',
    category: 'chemistry',
    defaultPriority: 'ROUTINE',
    cost: 22,
    turnaroundHours: 4,
    specimenType: 'Serum',
    cptCode: '82150',
    loincCode: '1798-8'
  },
  'LIPASE': {
    code: 'LIPASE',
    name: 'Lipase',
    description: 'Pancreatic enzyme, more specific for pancreatitis than amylase',
    category: 'chemistry',
    defaultPriority: 'ROUTINE',
    cost: 25,
    turnaroundHours: 4,
    specimenType: 'Serum',
    cptCode: '83690',
    loincCode: '3040-3'
  },
  'LDH': {
    code: 'LDH',
    name: 'Lactate Dehydrogenase',
    description: 'Tissue damage marker, elevated in hemolysis and tissue injury',
    category: 'chemistry',
    defaultPriority: 'ROUTINE',
    cost: 20,
    turnaroundHours: 4,
    specimenType: 'Serum',
    cptCode: '83615',
    loincCode: '2532-0'
  },

  // Cardiac Markers
  'TROP-I': {
    code: 'TROP-I',
    name: 'Troponin I',
    description: 'Cardiac muscle damage marker for acute coronary syndrome',
    category: 'chemistry',
    defaultPriority: 'STAT',
    cost: 45,
    turnaroundHours: 1,
    specimenType: 'Serum',
    cptCode: '84484',
    loincCode: '10839-9'
  },
  'TROP-T': {
    code: 'TROP-T',
    name: 'Troponin T',
    description: 'High-sensitivity cardiac troponin for ACS evaluation',
    category: 'chemistry',
    defaultPriority: 'STAT',
    cost: 48,
    turnaroundHours: 1,
    specimenType: 'Serum',
    cptCode: '84484',
    loincCode: '6598-7'
  },
  'BNP': {
    code: 'BNP',
    name: 'Brain Natriuretic Peptide',
    description: 'Heart failure marker',
    category: 'chemistry',
    defaultPriority: 'ROUTINE',
    cost: 55,
    turnaroundHours: 4,
    specimenType: 'Plasma (EDTA)',
    cptCode: '83880',
    loincCode: '30934-4'
  },
  'PRBNP': {
    code: 'PRBNP',
    name: 'Pro-BNP',
    description: 'N-terminal pro-BNP for heart failure assessment',
    category: 'chemistry',
    defaultPriority: 'ROUTINE',
    cost: 60,
    turnaroundHours: 4,
    specimenType: 'Serum',
    cptCode: '83880',
    loincCode: '33762-6'
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

  // Endocrine
  'TSH': {
    code: 'TSH',
    name: 'Thyroid Stimulating Hormone',
    description: 'Primary thyroid function screening test',
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
    description: 'Measures unbound thyroxine for thyroid evaluation',
    category: 'endocrine',
    defaultPriority: 'ROUTINE',
    cost: 32,
    turnaroundHours: 4,
    specimenType: 'Serum',
    cptCode: '84439',
    loincCode: '3024-7'
  },
  'FT3': {
    code: 'FT3',
    name: 'Free T3',
    description: 'Measures unbound triiodothyronine',
    category: 'endocrine',
    defaultPriority: 'ROUTINE',
    cost: 35,
    turnaroundHours: 4,
    specimenType: 'Serum',
    cptCode: '84481',
    loincCode: '3051-0'
  },
  'CORTISOL': {
    code: 'CORTISOL',
    name: 'Cortisol, AM',
    description: 'Adrenal function assessment',
    category: 'endocrine',
    defaultPriority: 'ROUTINE',
    cost: 40,
    turnaroundHours: 4,
    specimenType: 'Serum',
    cptCode: '82533',
    loincCode: '2143-6'
  },
  'HCG-S': {
    code: 'HCG-S',
    name: 'Beta-hCG, Quantitative',
    description: 'Pregnancy test with quantitative level',
    category: 'endocrine',
    defaultPriority: 'ROUTINE',
    cost: 38,
    turnaroundHours: 4,
    specimenType: 'Serum',
    cptCode: '84703',
    loincCode: '21198-7'
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
  'FOLATE': {
    code: 'FOLATE',
    name: 'Folate',
    description: 'Folic acid level for anemia workup',
    category: 'endocrine',
    defaultPriority: 'ROUTINE',
    cost: 35,
    turnaroundHours: 24,
    specimenType: 'Serum',
    cptCode: '82746',
    loincCode: '2284-8'
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

  // Coagulation
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
  'FIBRIN': {
    code: 'FIBRIN',
    name: 'Fibrinogen',
    description: 'Coagulation factor and acute phase reactant',
    category: 'coagulation',
    defaultPriority: 'ROUTINE',
    cost: 25,
    turnaroundHours: 4,
    specimenType: 'Plasma (Citrate)',
    cptCode: '85384',
    loincCode: '3255-7'
  },

  // Urinalysis
  'UA': {
    code: 'UA',
    name: 'Urinalysis',
    description: 'Complete urinalysis with microscopy',
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
  'UMALB': {
    code: 'UMALB',
    name: 'Urine Microalbumin',
    description: 'Early kidney disease screening in diabetes',
    category: 'urinalysis',
    defaultPriority: 'ROUTINE',
    cost: 28,
    turnaroundHours: 4,
    specimenType: 'Urine',
    cptCode: '82043',
    loincCode: '14957-5'
  },

  // Immunology
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
  'CCP': {
    code: 'CCP',
    name: 'Anti-CCP Antibodies',
    description: 'Specific marker for rheumatoid arthritis',
    category: 'immunology',
    defaultPriority: 'ROUTINE',
    cost: 55,
    turnaroundHours: 48,
    specimenType: 'Serum',
    cptCode: '86200',
    loincCode: '53027-9'
  },

  // Toxicology
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

  // Microbiology
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
  }
};

// =============================================================================
// Lab Panels
// =============================================================================

export const LAB_PANELS: Record<string, LabPanel> = {
  'BASIC': {
    id: 'BASIC',
    name: 'Basic Metabolic Panel',
    abbreviation: 'BMP',
    description: 'Glucose, BUN, creatinine, sodium, potassium, chloride, CO2, calcium',
    tests: ['BMP'],
    cost: 35,
    category: 'chemistry',
    commonIndications: ['General screening', 'Medication monitoring', 'Kidney function', 'Electrolyte assessment']
  },
  'COMP': {
    id: 'COMP',
    name: 'Comprehensive Metabolic Panel',
    abbreviation: 'CMP',
    description: 'BMP plus liver function tests, albumin, and total protein',
    tests: ['CMP'],
    cost: 45,
    category: 'chemistry',
    commonIndications: ['Pre-operative assessment', 'Annual physical', 'Liver function', 'Comprehensive screening']
  },
  'CBC-PANEL': {
    id: 'CBC-PANEL',
    name: 'Complete Blood Count with Differential',
    abbreviation: 'CBC w/Diff',
    description: 'Full blood count with white cell differential',
    tests: ['CBC-DIFF'],
    cost: 24,
    category: 'hematology',
    commonIndications: ['Infection workup', 'Anemia evaluation', 'Pre-operative', 'General screening']
  },
  'THYROID': {
    id: 'THYROID',
    name: 'Thyroid Panel',
    abbreviation: 'Thyroid',
    description: 'TSH, Free T4, Free T3',
    tests: ['TSH', 'FT4', 'FT3'],
    cost: 85,
    category: 'endocrine',
    commonIndications: ['Thyroid dysfunction', 'Fatigue workup', 'Weight changes', 'Hair loss']
  },
  'LIPID-PANEL': {
    id: 'LIPID-PANEL',
    name: 'Lipid Panel',
    abbreviation: 'Lipid',
    description: 'Total cholesterol, HDL, LDL, triglycerides',
    tests: ['LIPID'],
    cost: 38,
    category: 'chemistry',
    commonIndications: ['Cardiovascular risk', 'Annual screening', 'Statin therapy']
  },
  'LIVER': {
    id: 'LIVER',
    name: 'Liver Function Panel',
    abbreviation: 'LFTs',
    description: 'AST, ALT, alkaline phosphatase, bilirubin, albumin',
    tests: ['LFT'],
    cost: 28,
    category: 'chemistry',
    commonIndications: ['Hepatitis screening', 'Medication monitoring', 'Jaundice workup']
  },
  'COAG': {
    id: 'COAG',
    name: 'Coagulation Panel',
    abbreviation: 'Coags',
    description: 'PT/INR, PTT, Fibrinogen',
    tests: ['PT-INR', 'PTT', 'FIBRIN'],
    cost: 55,
    category: 'coagulation',
    commonIndications: ['Pre-operative', 'Anticoagulation therapy', 'Bleeding disorder']
  },
  'INFLAM': {
    id: 'INFLAM',
    name: 'Inflammatory Markers',
    abbreviation: 'Inflam',
    description: 'ESR, CRP',
    tests: ['ESR', 'CRP'],
    cost: 31,
    category: 'chemistry',
    commonIndications: ['Infection', 'Autoimmune disease', 'Temporal arteritis', 'Inflammatory workup']
  },
  'CARDIAC': {
    id: 'CARDIAC',
    name: 'Cardiac Panel',
    abbreviation: 'Cardiac',
    description: 'Troponin I, BNP, CK-MB',
    tests: ['TROP-I', 'BNP'],
    cost: 100,
    category: 'chemistry',
    commonIndications: ['Chest pain', 'Heart failure', 'ACS evaluation']
  },
  'ANEMIA': {
    id: 'ANEMIA',
    name: 'Anemia Panel',
    abbreviation: 'Anemia',
    description: 'CBC, Iron studies, B12, Folate, Reticulocyte count',
    tests: ['CBC-DIFF', 'IRON', 'FERRITIN', 'B12', 'FOLATE', 'RETIC'],
    cost: 150,
    category: 'hematology',
    commonIndications: ['Anemia workup', 'Fatigue', 'Iron deficiency']
  }
};

// =============================================================================
// Store State Interface
// =============================================================================

interface LabOrderingState {
  // Patient context
  patientContext: PatientContext | null;
  
  // Selected labs
  selectedLabs: Map<string, SelectedLab>;
  
  // Order settings
  priority: LabPriority;
  clinicalIndication: string;
  specialInstructions: string;
  encounterId: string | null;
  
  // AI Recommendations
  aiRecommendations: AILabRecommendation[];
  isLoadingRecommendations: boolean;
  
  // Search & Filter
  searchQuery: string;
  categoryFilter: LabCategory | 'all';
  
  // UI State
  loading: boolean;
  submitting: boolean;
  error: string | null;
  lastSubmittedOrderIds: string[];
  
  // Actions
  setPatientContext: (context: PatientContext) => void;
  addLab: (testCode: string, options?: { priority?: LabPriority; rationale?: string; aiRecommended?: boolean }) => void;
  addPanel: (panelId: string) => void;
  removeLab: (testCode: string) => void;
  updateLabPriority: (testCode: string, priority: LabPriority) => void;
  setGlobalPriority: (priority: LabPriority) => void;
  setClinicalIndication: (indication: string) => void;
  setSpecialInstructions: (instructions: string) => void;
  setSearchQuery: (query: string) => void;
  setCategoryFilter: (category: LabCategory | 'all') => void;
  generateAIRecommendations: () => Promise<void>;
  addAIRecommendedLabs: (category: 'critical' | 'recommended' | 'consider') => void;
  submitOrder: (encounterId: string) => Promise<string[]>;
  clearOrder: () => void;
  
  // Computed getters
  getSelectedLabsArray: () => SelectedLab[];
  getFilteredCatalog: () => LabTest[];
  getTotalCost: () => number;
  getStatCount: () => number;
  getFastingRequired: () => boolean;
}

// =============================================================================
// BioMistral AI Recommendation Generator
// =============================================================================

async function generateBioMistralRecommendations(
  patientContext: PatientContext
): Promise<AILabRecommendation[]> {
  const recommendations: AILabRecommendation[] = [];
  const complaint = patientContext.chiefComplaint.toLowerCase();
  const redFlags = patientContext.redFlags || [];
  
  // ==========================================================================
  // HEADACHE WORKUP
  // ==========================================================================
  if (complaint.includes('headache') || complaint.includes('head pain')) {
    // Critical - if red flags present
    if (redFlags.some(rf => rf.toLowerCase().includes('worst') || rf.toLowerCase().includes('thunderclap'))) {
      recommendations.push({
        id: 'rec_cbc_headache',
        testCode: 'CBC-DIFF',
        testName: 'Complete Blood Count with Differential',
        priority: 'STAT',
        rationale: 'Essential baseline for infection, anemia, or hematologic disorders that may cause or complicate severe headache',
        clinicalEvidence: ['Red flag: "worst headache of life" requires emergent workup', 'Rule out infectious or inflammatory etiology'],
        confidence: 0.95,
        category: 'critical',
        redFlagRelated: true
      });
      
      recommendations.push({
        id: 'rec_cmp_headache',
        testCode: 'CMP',
        testName: 'Comprehensive Metabolic Panel',
        priority: 'STAT',
        rationale: 'Evaluate for metabolic derangements, kidney function before contrast imaging, and baseline organ function',
        clinicalEvidence: ['Required before IV contrast administration', 'Metabolic abnormalities can cause altered mental status'],
        confidence: 0.92,
        category: 'critical',
        redFlagRelated: true
      });
      
      recommendations.push({
        id: 'rec_esr_headache',
        testCode: 'ESR',
        testName: 'Erythrocyte Sedimentation Rate',
        priority: 'STAT',
        rationale: 'Screen for giant cell arteritis (temporal arteritis) especially in patients >50 with new severe headache',
        clinicalEvidence: ['ESR >50 highly suggestive of GCA', 'Combined with CRP increases sensitivity'],
        confidence: 0.88,
        category: 'critical',
        redFlagRelated: true
      });
      
      recommendations.push({
        id: 'rec_crp_headache',
        testCode: 'CRP',
        testName: 'C-Reactive Protein',
        priority: 'STAT',
        rationale: 'Acute inflammatory marker more sensitive than ESR, supports GCA evaluation and infection workup',
        clinicalEvidence: ['CRP rises faster than ESR in acute inflammation', 'Elevated in meningitis and encephalitis'],
        confidence: 0.88,
        category: 'critical',
        redFlagRelated: true
      });
    }
    
    // For female patients - pregnancy test before imaging
    if (patientContext.gender.toLowerCase() === 'female' && patientContext.age >= 12 && patientContext.age <= 55) {
      recommendations.push({
        id: 'rec_hcg_headache',
        testCode: 'HCG-U',
        testName: 'Urine Pregnancy Test',
        priority: 'STAT',
        rationale: 'Required before any contrast imaging studies and certain medications. Pregnancy can cause or exacerbate headaches.',
        clinicalEvidence: ['Standard of care before CT/MRI with contrast', 'Avoid teratogenic medications'],
        confidence: 0.98,
        category: 'critical'
      });
    }
    
    // Recommended but not emergent
    recommendations.push({
      id: 'rec_tsh_headache',
      testCode: 'TSH',
      testName: 'Thyroid Stimulating Hormone',
      priority: 'ROUTINE',
      rationale: 'Thyroid dysfunction can cause or contribute to headaches. Important for comprehensive workup.',
      clinicalEvidence: ['Both hypo- and hyperthyroidism associated with headaches', 'Treatable cause'],
      confidence: 0.72,
      category: 'recommended'
    });
    
    // Consider
    recommendations.push({
      id: 'rec_mg_headache',
      testCode: 'MG',
      testName: 'Magnesium Level',
      priority: 'ROUTINE',
      rationale: 'Low magnesium associated with increased migraine frequency. Supplementation can be therapeutic.',
      clinicalEvidence: ['Hypomagnesemia linked to migraine', 'Evidence for magnesium prophylaxis'],
      confidence: 0.65,
      category: 'consider'
    });
    
    recommendations.push({
      id: 'rec_b12_headache',
      testCode: 'B12',
      testName: 'Vitamin B12',
      priority: 'ROUTINE',
      rationale: 'B12 deficiency can cause neurological symptoms including headaches and cognitive changes.',
      clinicalEvidence: ['Neurological manifestations of B12 deficiency', 'Associated with confusion reported'],
      confidence: 0.58,
      category: 'consider'
    });
  }
  
  // ==========================================================================
  // CHEST PAIN WORKUP
  // ==========================================================================
  if (complaint.includes('chest pain') || complaint.includes('chest') || complaint.includes('cardiac')) {
    recommendations.push({
      id: 'rec_trop_chest',
      testCode: 'TROP-I',
      testName: 'Troponin I',
      priority: 'STAT',
      rationale: 'Gold standard biomarker for myocardial injury. Serial measurements required for ACS evaluation.',
      clinicalEvidence: ['High sensitivity and specificity for MI', 'Serial q3h recommended'],
      confidence: 0.98,
      category: 'critical',
      redFlagRelated: true
    });
    
    recommendations.push({
      id: 'rec_cbc_chest',
      testCode: 'CBC-DIFF',
      testName: 'Complete Blood Count',
      priority: 'STAT',
      rationale: 'Evaluate for anemia contributing to chest pain, infection, or acute blood loss.',
      clinicalEvidence: ['Anemia can cause/worsen angina', 'Baseline for potential intervention'],
      confidence: 0.92,
      category: 'critical'
    });
    
    recommendations.push({
      id: 'rec_bmp_chest',
      testCode: 'BMP',
      testName: 'Basic Metabolic Panel',
      priority: 'STAT',
      rationale: 'Electrolytes affect cardiac rhythm, kidney function for contrast/medications.',
      clinicalEvidence: ['Potassium abnormalities cause arrhythmias', 'Creatinine for contrast decisions'],
      confidence: 0.95,
      category: 'critical'
    });
    
    recommendations.push({
      id: 'rec_bnp_chest',
      testCode: 'BNP',
      testName: 'Brain Natriuretic Peptide',
      priority: 'ROUTINE',
      rationale: 'Evaluate for heart failure as cause of symptoms.',
      clinicalEvidence: ['Elevated in CHF', 'Prognostic value in ACS'],
      confidence: 0.78,
      category: 'recommended'
    });
    
    if (complaint.includes('sob') || complaint.includes('breath')) {
      recommendations.push({
        id: 'rec_ddimer_chest',
        testCode: 'DDIMER',
        testName: 'D-Dimer',
        priority: 'STAT',
        rationale: 'Rule out pulmonary embolism in patients with chest pain and dyspnea.',
        clinicalEvidence: ['High sensitivity for PE', 'Use with Wells criteria'],
        confidence: 0.85,
        category: 'critical'
      });
    }
    
    recommendations.push({
      id: 'rec_lipid_chest',
      testCode: 'LIPID',
      testName: 'Lipid Panel',
      priority: 'ROUTINE',
      rationale: 'Cardiovascular risk assessment if not done recently.',
      clinicalEvidence: ['Risk stratification', 'Guide statin therapy'],
      confidence: 0.68,
      category: 'consider'
    });
  }
  
  // ==========================================================================
  // ABDOMINAL PAIN WORKUP
  // ==========================================================================
  if (complaint.includes('abdominal') || complaint.includes('stomach') || complaint.includes('belly')) {
    recommendations.push({
      id: 'rec_cbc_abd',
      testCode: 'CBC-DIFF',
      testName: 'Complete Blood Count',
      priority: 'STAT',
      rationale: 'Evaluate for infection (elevated WBC), blood loss (low H/H), or other hematologic abnormalities.',
      clinicalEvidence: ['Leukocytosis in appendicitis, cholecystitis', 'Anemia suggests GI bleeding'],
      confidence: 0.95,
      category: 'critical'
    });
    
    recommendations.push({
      id: 'rec_cmp_abd',
      testCode: 'CMP',
      testName: 'Comprehensive Metabolic Panel',
      priority: 'STAT',
      rationale: 'Liver function, kidney function, electrolytes - comprehensive abdominal assessment.',
      clinicalEvidence: ['LFTs elevated in hepatobiliary disease', 'Electrolytes for dehydration'],
      confidence: 0.94,
      category: 'critical'
    });
    
    recommendations.push({
      id: 'rec_lipase_abd',
      testCode: 'LIPASE',
      testName: 'Lipase',
      priority: 'STAT',
      rationale: 'More specific than amylase for pancreatitis.',
      clinicalEvidence: ['3x ULN diagnostic for acute pancreatitis', 'Superior specificity to amylase'],
      confidence: 0.88,
      category: 'critical'
    });
    
    recommendations.push({
      id: 'rec_ua_abd',
      testCode: 'UA-MICRO',
      testName: 'Urinalysis with Microscopy',
      priority: 'ROUTINE',
      rationale: 'Evaluate for UTI or nephrolithiasis as cause of abdominal/flank pain.',
      clinicalEvidence: ['Hematuria in renal colic', 'Pyuria in pyelonephritis'],
      confidence: 0.82,
      category: 'recommended'
    });
    
    // Pregnancy test for females
    if (patientContext.gender.toLowerCase() === 'female' && patientContext.age >= 12 && patientContext.age <= 55) {
      recommendations.push({
        id: 'rec_hcg_abd',
        testCode: 'HCG-U',
        testName: 'Urine Pregnancy Test',
        priority: 'STAT',
        rationale: 'Rule out ectopic pregnancy in female patients with abdominal pain.',
        clinicalEvidence: ['Ectopic pregnancy is life-threatening', 'Required before imaging'],
        confidence: 0.98,
        category: 'critical'
      });
    }
  }
  
  // ==========================================================================
  // FATIGUE WORKUP
  // ==========================================================================
  if (complaint.includes('fatigue') || complaint.includes('tired') || complaint.includes('weakness')) {
    recommendations.push({
      id: 'rec_cbc_fatigue',
      testCode: 'CBC-DIFF',
      testName: 'Complete Blood Count',
      priority: 'ROUTINE',
      rationale: 'Evaluate for anemia, infection, or hematologic disorder as cause of fatigue.',
      clinicalEvidence: ['Anemia most common treatable cause', 'Leukocytosis/leukopenia indicate infection'],
      confidence: 0.92,
      category: 'critical'
    });
    
    recommendations.push({
      id: 'rec_cmp_fatigue',
      testCode: 'CMP',
      testName: 'Comprehensive Metabolic Panel',
      priority: 'ROUTINE',
      rationale: 'Evaluate glucose, kidney, liver function - all can cause fatigue.',
      clinicalEvidence: ['Hypoglycemia, uremia, liver disease cause fatigue', 'Electrolyte abnormalities'],
      confidence: 0.90,
      category: 'critical'
    });
    
    recommendations.push({
      id: 'rec_tsh_fatigue',
      testCode: 'TSH',
      testName: 'Thyroid Stimulating Hormone',
      priority: 'ROUTINE',
      rationale: 'Hypothyroidism is a common, treatable cause of fatigue.',
      clinicalEvidence: ['Hypothyroidism classic cause of fatigue', 'Simple treatment available'],
      confidence: 0.88,
      category: 'critical'
    });
    
    recommendations.push({
      id: 'rec_iron_fatigue',
      testCode: 'IRON',
      testName: 'Iron and TIBC',
      priority: 'ROUTINE',
      rationale: 'Iron deficiency can cause fatigue even without anemia.',
      clinicalEvidence: ['Iron deficiency without anemia causes fatigue', 'Common in menstruating women'],
      confidence: 0.82,
      category: 'recommended'
    });
    
    recommendations.push({
      id: 'rec_b12_fatigue',
      testCode: 'B12',
      testName: 'Vitamin B12',
      priority: 'ROUTINE',
      rationale: 'B12 deficiency causes fatigue and neurological symptoms.',
      clinicalEvidence: ['Common deficiency', 'Neurological symptoms if prolonged'],
      confidence: 0.75,
      category: 'recommended'
    });
    
    recommendations.push({
      id: 'rec_vitd_fatigue',
      testCode: 'VITD',
      testName: 'Vitamin D, 25-Hydroxy',
      priority: 'ROUTINE',
      rationale: 'Vitamin D deficiency associated with fatigue and muscle weakness.',
      clinicalEvidence: ['High prevalence of deficiency', 'Fatigue improves with supplementation'],
      confidence: 0.68,
      category: 'consider'
    });
  }
  
  // Sort recommendations by category priority
  const categoryOrder = { 'critical': 0, 'recommended': 1, 'consider': 2 };
  recommendations.sort((a, b) => categoryOrder[a.category] - categoryOrder[b.category]);
  
  return recommendations;
}

// =============================================================================
// Store Implementation
// =============================================================================

export const useLabOrderingStore = create<LabOrderingState>()(
  devtools(
    immer((set, get) => ({
      // Initial state
      patientContext: null,
      selectedLabs: new Map(),
      priority: 'ROUTINE',
      clinicalIndication: '',
      specialInstructions: '',
      encounterId: null,
      aiRecommendations: [],
      isLoadingRecommendations: false,
      searchQuery: '',
      categoryFilter: 'all',
      loading: false,
      submitting: false,
      error: null,
      lastSubmittedOrderIds: [],

      // =======================================================================
      // Patient Context
      // =======================================================================
      setPatientContext: (context) => {
        set(state => {
          state.patientContext = context;
          // Set default clinical indication from chief complaint
          if (context.chiefComplaint) {
            state.clinicalIndication = `Evaluation for: ${context.chiefComplaint}`;
          }
        });
        // Auto-generate AI recommendations
        get().generateAIRecommendations();
      },

      // =======================================================================
      // Lab Selection
      // =======================================================================
      addLab: (testCode, options = {}) => {
        const test = LAB_CATALOG[testCode];
        if (!test) {
          console.warn(`Lab test ${testCode} not found in catalog`);
          return;
        }
        
        set(state => {
          state.selectedLabs.set(testCode, {
            test,
            priority: options.priority || test.defaultPriority,
            aiRecommended: options.aiRecommended || false,
            rationale: options.rationale
          });
        });
      },

      addPanel: (panelId) => {
        const panel = LAB_PANELS[panelId];
        if (!panel) {
          console.warn(`Lab panel ${panelId} not found`);
          return;
        }
        
        panel.tests.forEach(testCode => {
          get().addLab(testCode);
        });
      },

      removeLab: (testCode) => {
        set(state => {
          state.selectedLabs.delete(testCode);
        });
      },

      updateLabPriority: (testCode, priority) => {
        set(state => {
          const lab = state.selectedLabs.get(testCode);
          if (lab) {
            lab.priority = priority;
          }
        });
      },

      setGlobalPriority: (priority) => {
        set(state => {
          state.priority = priority;
          // Update all selected labs
          state.selectedLabs.forEach(lab => {
            lab.priority = priority;
          });
        });
      },

      setClinicalIndication: (indication) => set({ clinicalIndication: indication }),
      setSpecialInstructions: (instructions) => set({ specialInstructions: instructions }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setCategoryFilter: (category) => set({ categoryFilter: category }),

      // =======================================================================
      // AI Recommendations
      // =======================================================================
      generateAIRecommendations: async () => {
        const { patientContext } = get();
        if (!patientContext) return;
        
        set({ isLoadingRecommendations: true });
        
        try {
          // Simulate API delay for realistic UX
          await new Promise(resolve => setTimeout(resolve, 800));
          
          const recommendations = await generateBioMistralRecommendations(patientContext);
          
          set({ 
            aiRecommendations: recommendations,
            isLoadingRecommendations: false 
          });
        } catch (error) {
          console.error('Failed to generate AI recommendations:', error);
          set({ 
            isLoadingRecommendations: false,
            error: 'Failed to generate AI recommendations'
          });
        }
      },

      addAIRecommendedLabs: (category) => {
        const { aiRecommendations, addLab } = get();
        
        aiRecommendations
          .filter(rec => rec.category === category)
          .forEach(rec => {
            addLab(rec.testCode, {
              priority: rec.priority,
              rationale: rec.rationale,
              aiRecommended: true
            });
          });
      },

      // =======================================================================
      // Order Submission
      // =======================================================================
      submitOrder: async (encounterId) => {
        const { selectedLabs, clinicalIndication, specialInstructions } = get();
        
        if (selectedLabs.size === 0) {
          throw new Error('No labs selected');
        }
        
        set({ submitting: true, error: null });
        
        try {
          const tests = Array.from(selectedLabs.values()).map(sl => ({
            code: sl.test.code,
            name: sl.test.name,
            category: sl.test.category,
            specimenType: sl.test.specimenType,
            priority: sl.priority
          }));
          
          const response = await fetch('/api/labs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              encounterId,
              tests,
              indication: clinicalIndication,
              specialInstructions,
              priority: tests.some(t => t.priority === 'STAT') ? 'STAT' : 
                       tests.some(t => t.priority === 'ASAP') ? 'ASAP' : 'ROUTINE'
            })
          });
          
          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to submit lab order');
          }
          
          const result = await response.json();
          const orderIds = Array.isArray(result) ? result.map((r: any) => r.id) : [result.id];
          
          set(state => {
            state.submitting = false;
            state.lastSubmittedOrderIds = orderIds;
          });
          
          // Clear order after successful submission
          get().clearOrder();
          
          return orderIds;
        } catch (error) {
          set(state => {
            state.submitting = false;
            state.error = error instanceof Error ? error.message : 'Failed to submit order';
          });
          throw error;
        }
      },

      clearOrder: () => set(state => {
        state.selectedLabs = new Map();
        state.priority = 'ROUTINE';
        state.clinicalIndication = '';
        state.specialInstructions = '';
        state.error = null;
      }),

      // =======================================================================
      // Computed Getters
      // =======================================================================
      getSelectedLabsArray: () => {
        return Array.from(get().selectedLabs.values());
      },

      getFilteredCatalog: () => {
        const { searchQuery, categoryFilter } = get();
        const query = searchQuery.toLowerCase();
        
        return Object.values(LAB_CATALOG).filter(test => {
          // Category filter
          if (categoryFilter !== 'all' && test.category !== categoryFilter) {
            return false;
          }
          
          // Search filter
          if (query) {
            return (
              test.code.toLowerCase().includes(query) ||
              test.name.toLowerCase().includes(query) ||
              test.description.toLowerCase().includes(query)
            );
          }
          
          return true;
        });
      },

      getTotalCost: () => {
        const labs = get().getSelectedLabsArray();
        return labs.reduce((sum, sl) => sum + sl.test.cost, 0);
      },

      getStatCount: () => {
        const labs = get().getSelectedLabsArray();
        return labs.filter(sl => sl.priority === 'STAT').length;
      },

      getFastingRequired: () => {
        const labs = get().getSelectedLabsArray();
        return labs.some(sl => sl.test.requiresFasting);
      }
    })),
    { name: 'lab-ordering-store' }
  )
);

export default useLabOrderingStore;
