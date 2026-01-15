// ============================================================
// Lab Tests Catalog
// apps/shared/catalogs/labs.ts
//
// Comprehensive lab test database - extracted from stores
// ============================================================

import type { LabTest, LabPanel } from './types';

// =============================================================================
// Lab Tests Database
// =============================================================================

export const LAB_CATALOG: Record<string, LabTest> = {
  // HEMATOLOGY
  'CBC': {
    code: 'CBC', name: 'Complete Blood Count',
    description: 'Red cells, white cells, hemoglobin, hematocrit, platelets',
    category: 'hematology', defaultPriority: 'ROUTINE', cost: 18, turnaroundHours: 2,
    specimenType: 'Whole Blood (EDTA)', cptCode: '85025', loincCode: '58410-2'
  },
  'CBC-DIFF': {
    code: 'CBC-DIFF', name: 'CBC with Differential',
    description: 'CBC plus white cell differential for infection/hematologic disorders',
    category: 'hematology', defaultPriority: 'ROUTINE', cost: 24, turnaroundHours: 2,
    specimenType: 'Whole Blood (EDTA)', cptCode: '85025', loincCode: '57021-8'
  },
  'ESR': {
    code: 'ESR', name: 'Erythrocyte Sedimentation Rate',
    description: 'Non-specific inflammatory marker',
    category: 'hematology', defaultPriority: 'ROUTINE', cost: 15, turnaroundHours: 1,
    specimenType: 'Whole Blood (EDTA)', cptCode: '85652', loincCode: '30341-2'
  },
  'RETIC': {
    code: 'RETIC', name: 'Reticulocyte Count',
    description: 'Immature RBCs for anemia workup',
    category: 'hematology', defaultPriority: 'ROUTINE', cost: 20, turnaroundHours: 4,
    specimenType: 'Whole Blood (EDTA)', cptCode: '85044'
  },

  // CHEMISTRY - Basic
  'BMP': {
    code: 'BMP', name: 'Basic Metabolic Panel',
    description: 'Glucose, BUN, creatinine, Na, K, Cl, CO2, calcium',
    category: 'chemistry', defaultPriority: 'ROUTINE', cost: 35, turnaroundHours: 4,
    specimenType: 'Serum', cptCode: '80048', loincCode: '51990-0'
  },
  'CMP': {
    code: 'CMP', name: 'Comprehensive Metabolic Panel',
    description: 'BMP plus liver function, albumin, total protein',
    category: 'chemistry', defaultPriority: 'ROUTINE', cost: 45, turnaroundHours: 4,
    specimenType: 'Serum', cptCode: '80053', loincCode: '24323-8'
  },
  'CRP': {
    code: 'CRP', name: 'C-Reactive Protein',
    description: 'Acute phase inflammatory marker',
    category: 'chemistry', defaultPriority: 'ROUTINE', cost: 16, turnaroundHours: 2,
    specimenType: 'Serum', cptCode: '86140', loincCode: '1988-5'
  },
  'GLU': {
    code: 'GLU', name: 'Glucose, Fasting',
    description: 'Blood sugar for diabetes screening/monitoring',
    category: 'chemistry', defaultPriority: 'ROUTINE', cost: 12, turnaroundHours: 2,
    requiresFasting: true, specimenType: 'Serum', cptCode: '82947', loincCode: '1558-6'
  },
  'HBA1C': {
    code: 'HBA1C', name: 'Hemoglobin A1C',
    description: '3-month average glucose for diabetes monitoring',
    category: 'chemistry', defaultPriority: 'ROUTINE', cost: 32, turnaroundHours: 4,
    specimenType: 'Whole Blood (EDTA)', cptCode: '83036', loincCode: '4548-4'
  },
  'LIPID': {
    code: 'LIPID', name: 'Lipid Panel',
    description: 'Total cholesterol, HDL, LDL, triglycerides',
    category: 'chemistry', defaultPriority: 'ROUTINE', cost: 38, turnaroundHours: 4,
    requiresFasting: true, specimenType: 'Serum', cptCode: '80061', loincCode: '57698-3'
  },
  'LFT': {
    code: 'LFT', name: 'Liver Function Tests',
    description: 'AST, ALT, alk phos, bilirubin',
    category: 'chemistry', defaultPriority: 'ROUTINE', cost: 28, turnaroundHours: 4,
    specimenType: 'Serum', cptCode: '80076'
  },
  'BUN': {
    code: 'BUN', name: 'Blood Urea Nitrogen',
    description: 'Kidney function marker',
    category: 'chemistry', defaultPriority: 'ROUTINE', cost: 10, turnaroundHours: 2,
    specimenType: 'Serum', cptCode: '84520', loincCode: '3094-0'
  },
  'CR': {
    code: 'CR', name: 'Creatinine',
    description: 'Kidney function marker',
    category: 'chemistry', defaultPriority: 'ROUTINE', cost: 10, turnaroundHours: 2,
    specimenType: 'Serum', cptCode: '82565', loincCode: '2160-0'
  },
  'MG': {
    code: 'MG', name: 'Magnesium',
    description: 'Electrolyte for muscle/nerve function',
    category: 'chemistry', defaultPriority: 'ROUTINE', cost: 19, turnaroundHours: 4,
    specimenType: 'Serum', cptCode: '83735', loincCode: '19123-9'
  },
  'PHOS': {
    code: 'PHOS', name: 'Phosphorus',
    description: 'Bone health and energy metabolism',
    category: 'chemistry', defaultPriority: 'ROUTINE', cost: 15, turnaroundHours: 4,
    specimenType: 'Serum', cptCode: '84100', loincCode: '2777-1'
  },
  'URIC': {
    code: 'URIC', name: 'Uric Acid',
    description: 'Elevated in gout and kidney disease',
    category: 'chemistry', defaultPriority: 'ROUTINE', cost: 18, turnaroundHours: 4,
    specimenType: 'Serum', cptCode: '84550', loincCode: '3084-1'
  },
  'LIPASE': {
    code: 'LIPASE', name: 'Lipase',
    description: 'Pancreatic enzyme, specific for pancreatitis',
    category: 'chemistry', defaultPriority: 'ROUTINE', cost: 25, turnaroundHours: 4,
    specimenType: 'Serum', cptCode: '83690', loincCode: '3040-3'
  },
  'AMYLASE': {
    code: 'AMYLASE', name: 'Amylase',
    description: 'Pancreatic enzyme',
    category: 'chemistry', defaultPriority: 'ROUTINE', cost: 22, turnaroundHours: 4,
    specimenType: 'Serum', cptCode: '82150', loincCode: '1798-8'
  },
  'LDH': {
    code: 'LDH', name: 'Lactate Dehydrogenase',
    description: 'Tissue damage marker',
    category: 'chemistry', defaultPriority: 'ROUTINE', cost: 20, turnaroundHours: 4,
    specimenType: 'Serum', cptCode: '83615', loincCode: '2532-0'
  },
  'LACTATE': {
    code: 'LACTATE', name: 'Lactic Acid',
    description: 'Tissue hypoxia/sepsis marker',
    category: 'chemistry', defaultPriority: 'STAT', cost: 25, turnaroundHours: 0.5,
    specimenType: 'Blood', cptCode: '83605'
  },

  // CARDIAC MARKERS
  'TROP-I': {
    code: 'TROP-I', name: 'Troponin I',
    description: 'Cardiac muscle damage marker for ACS',
    category: 'cardiac', defaultPriority: 'STAT', cost: 45, turnaroundHours: 1,
    specimenType: 'Serum', cptCode: '84484', loincCode: '10839-9'
  },
  'TROP-T': {
    code: 'TROP-T', name: 'Troponin T, High-Sensitivity',
    description: 'High-sensitivity cardiac troponin',
    category: 'cardiac', defaultPriority: 'STAT', cost: 48, turnaroundHours: 1,
    specimenType: 'Serum', cptCode: '84484', loincCode: '6598-7'
  },
  'BNP': {
    code: 'BNP', name: 'Brain Natriuretic Peptide',
    description: 'Heart failure marker',
    category: 'cardiac', defaultPriority: 'ROUTINE', cost: 55, turnaroundHours: 4,
    specimenType: 'Plasma (EDTA)', cptCode: '83880', loincCode: '30934-4'
  },
  'PRBNP': {
    code: 'PRBNP', name: 'Pro-BNP',
    description: 'NT-proBNP for HF assessment',
    category: 'cardiac', defaultPriority: 'ROUTINE', cost: 60, turnaroundHours: 4,
    specimenType: 'Serum', cptCode: '83880', loincCode: '33762-6'
  },

  // COAGULATION
  'DDIMER': {
    code: 'DDIMER', name: 'D-Dimer',
    description: 'Fibrin degradation for DVT/PE',
    category: 'coagulation', defaultPriority: 'STAT', cost: 42, turnaroundHours: 2,
    specimenType: 'Plasma (Citrate)', cptCode: '85379', loincCode: '48066-5'
  },
  'PT-INR': {
    code: 'PT-INR', name: 'PT/INR',
    description: 'Warfarin monitoring',
    category: 'coagulation', defaultPriority: 'ROUTINE', cost: 18, turnaroundHours: 2,
    specimenType: 'Plasma (Citrate)', cptCode: '85610', loincCode: '5902-2'
  },
  'PTT': {
    code: 'PTT', name: 'Partial Thromboplastin Time',
    description: 'Heparin monitoring',
    category: 'coagulation', defaultPriority: 'ROUTINE', cost: 18, turnaroundHours: 2,
    specimenType: 'Plasma (Citrate)', cptCode: '85730', loincCode: '3173-2'
  },
  'FIBRIN': {
    code: 'FIBRIN', name: 'Fibrinogen',
    description: 'Coag factor and acute phase reactant',
    category: 'coagulation', defaultPriority: 'ROUTINE', cost: 25, turnaroundHours: 4,
    specimenType: 'Plasma (Citrate)', cptCode: '85384', loincCode: '3255-7'
  },

  // ENDOCRINE
  'TSH': {
    code: 'TSH', name: 'TSH',
    description: 'Primary thyroid screening',
    category: 'endocrine', defaultPriority: 'ROUTINE', cost: 35, turnaroundHours: 4,
    specimenType: 'Serum', cptCode: '84443', loincCode: '3016-3'
  },
  'FT4': {
    code: 'FT4', name: 'Free T4',
    description: 'Unbound thyroxine',
    category: 'endocrine', defaultPriority: 'ROUTINE', cost: 32, turnaroundHours: 4,
    specimenType: 'Serum', cptCode: '84439', loincCode: '3024-7'
  },
  'FT3': {
    code: 'FT3', name: 'Free T3',
    description: 'Unbound triiodothyronine',
    category: 'endocrine', defaultPriority: 'ROUTINE', cost: 35, turnaroundHours: 4,
    specimenType: 'Serum', cptCode: '84481', loincCode: '3051-0'
  },
  'CORTISOL': {
    code: 'CORTISOL', name: 'Cortisol, AM',
    description: 'Adrenal function assessment',
    category: 'endocrine', defaultPriority: 'ROUTINE', cost: 40, turnaroundHours: 4,
    specimenType: 'Serum', cptCode: '82533', loincCode: '2143-6'
  },
  'HCG-S': {
    code: 'HCG-S', name: 'Beta-hCG Quantitative',
    description: 'Quantitative pregnancy test',
    category: 'endocrine', defaultPriority: 'ROUTINE', cost: 38, turnaroundHours: 4,
    specimenType: 'Serum', cptCode: '84703', loincCode: '21198-7'
  },
  'HCG-U': {
    code: 'HCG-U', name: 'Urine Pregnancy Test',
    description: 'Qualitative urine pregnancy',
    category: 'endocrine', defaultPriority: 'STAT', cost: 12, turnaroundHours: 0.5,
    specimenType: 'Urine', cptCode: '81025', loincCode: '2106-3'
  },
  'VITD': {
    code: 'VITD', name: 'Vitamin D, 25-Hydroxy',
    description: 'Vitamin D status',
    category: 'endocrine', defaultPriority: 'ROUTINE', cost: 65, turnaroundHours: 24,
    specimenType: 'Serum', cptCode: '82306', loincCode: '1989-3'
  },
  'B12': {
    code: 'B12', name: 'Vitamin B12',
    description: 'B12 deficiency screening',
    category: 'endocrine', defaultPriority: 'ROUTINE', cost: 38, turnaroundHours: 24,
    specimenType: 'Serum', cptCode: '82607', loincCode: '2132-9'
  },
  'FOLATE': {
    code: 'FOLATE', name: 'Folate',
    description: 'Folic acid for anemia workup',
    category: 'endocrine', defaultPriority: 'ROUTINE', cost: 35, turnaroundHours: 24,
    specimenType: 'Serum', cptCode: '82746', loincCode: '2284-8'
  },
  'FERRITIN': {
    code: 'FERRITIN', name: 'Ferritin',
    description: 'Iron storage marker',
    category: 'endocrine', defaultPriority: 'ROUTINE', cost: 32, turnaroundHours: 4,
    specimenType: 'Serum', cptCode: '82728', loincCode: '2276-4'
  },
  'IRON': {
    code: 'IRON', name: 'Iron and TIBC',
    description: 'Iron status with total iron binding capacity',
    category: 'endocrine', defaultPriority: 'ROUTINE', cost: 28, turnaroundHours: 4,
    specimenType: 'Serum', cptCode: '83540', loincCode: '2498-4'
  },

  // URINALYSIS
  'UA': {
    code: 'UA', name: 'Urinalysis',
    description: 'Complete urinalysis with microscopy',
    category: 'urinalysis', defaultPriority: 'ROUTINE', cost: 14, turnaroundHours: 2,
    specimenType: 'Urine', cptCode: '81003', loincCode: '24356-8'
  },
  'UA-MICRO': {
    code: 'UA-MICRO', name: 'Urinalysis with Microscopy',
    description: 'Urinalysis with manual microscopic examination',
    category: 'urinalysis', defaultPriority: 'ROUTINE', cost: 18, turnaroundHours: 2,
    specimenType: 'Urine', cptCode: '81001', loincCode: '24356-8'
  },
  'UMALB': {
    code: 'UMALB', name: 'Urine Microalbumin',
    description: 'Early kidney disease screening in diabetes',
    category: 'urinalysis', defaultPriority: 'ROUTINE', cost: 28, turnaroundHours: 4,
    specimenType: 'Urine', cptCode: '82043', loincCode: '14957-5'
  },

  // MICROBIOLOGY
  'UCULT': {
    code: 'UCULT', name: 'Urine Culture',
    description: 'Culture for urinary tract infection',
    category: 'microbiology', defaultPriority: 'ROUTINE', cost: 35, turnaroundHours: 48,
    specimenType: 'Urine', cptCode: '87086', loincCode: '630-4'
  },
  'BCULT': {
    code: 'BCULT', name: 'Blood Culture',
    description: 'Aerobic and anaerobic blood cultures',
    category: 'microbiology', defaultPriority: 'STAT', cost: 85, turnaroundHours: 72,
    specimenType: 'Blood (Culture Bottles)', cptCode: '87040'
  },
  'STREP': {
    code: 'STREP', name: 'Rapid Strep Test',
    description: 'Group A streptococcus antigen detection',
    category: 'microbiology', defaultPriority: 'STAT', cost: 18, turnaroundHours: 0.5,
    specimenType: 'Throat Swab', cptCode: '87880'
  },
  'FLU': {
    code: 'FLU', name: 'Influenza A/B Rapid',
    description: 'Rapid influenza A and B antigen test',
    category: 'microbiology', defaultPriority: 'STAT', cost: 35, turnaroundHours: 0.5,
    specimenType: 'Nasopharyngeal Swab', cptCode: '87804'
  },
  'COVID': {
    code: 'COVID', name: 'COVID-19 PCR',
    description: 'SARS-CoV-2 nucleic acid amplification test',
    category: 'microbiology', defaultPriority: 'ROUTINE', cost: 75, turnaroundHours: 24,
    specimenType: 'Nasopharyngeal Swab', cptCode: '87635'
  },
  'PROCALCITONIN': {
    code: 'PROCALCITONIN', name: 'Procalcitonin',
    description: 'Bacterial infection marker',
    category: 'microbiology', defaultPriority: 'STAT', cost: 85, turnaroundHours: 2,
    specimenType: 'Blood', cptCode: '84145'
  },

  // IMMUNOLOGY
  'ANA': {
    code: 'ANA', name: 'Antinuclear Antibody',
    description: 'Autoimmune disease screening',
    category: 'immunology', defaultPriority: 'ROUTINE', cost: 45, turnaroundHours: 24,
    specimenType: 'Serum', cptCode: '86038', loincCode: '8061-4'
  },
  'RF': {
    code: 'RF', name: 'Rheumatoid Factor',
    description: 'Rheumatoid arthritis marker',
    category: 'immunology', defaultPriority: 'ROUTINE', cost: 28, turnaroundHours: 24,
    specimenType: 'Serum', cptCode: '86431', loincCode: '11572-5'
  },
  'CCP': {
    code: 'CCP', name: 'Anti-CCP Antibodies',
    description: 'Specific marker for rheumatoid arthritis',
    category: 'immunology', defaultPriority: 'ROUTINE', cost: 55, turnaroundHours: 48,
    specimenType: 'Serum', cptCode: '86200', loincCode: '53027-9'
  },

  // TOXICOLOGY
  'UTOX': {
    code: 'UTOX', name: 'Urine Drug Screen',
    description: 'Standard 10-panel drug screen',
    category: 'toxicology', defaultPriority: 'ROUTINE', cost: 35, turnaroundHours: 4,
    specimenType: 'Urine', cptCode: '80307'
  },
  'ETOH': {
    code: 'ETOH', name: 'Blood Alcohol Level',
    description: 'Serum ethanol concentration',
    category: 'toxicology', defaultPriority: 'STAT', cost: 25, turnaroundHours: 1,
    specimenType: 'Serum', cptCode: '80320', loincCode: '5643-2'
  },
};

// =============================================================================
// Lab Panels
// =============================================================================

export const LAB_PANELS: Record<string, LabPanel> = {
  'BASIC': {
    id: 'BASIC', name: 'Basic Metabolic Panel', abbreviation: 'BMP',
    description: 'Glucose, BUN, creatinine, Na, K, Cl, CO2, calcium',
    tests: ['BMP'], cost: 35, category: 'chemistry',
    commonIndications: ['General screening', 'Medication monitoring', 'Kidney function']
  },
  'COMP': {
    id: 'COMP', name: 'Comprehensive Metabolic Panel', abbreviation: 'CMP',
    description: 'BMP plus liver function, albumin, total protein',
    tests: ['CMP'], cost: 45, category: 'chemistry',
    commonIndications: ['Pre-operative', 'Annual physical', 'Liver function']
  },
  'CBC-PANEL': {
    id: 'CBC-PANEL', name: 'CBC with Differential', abbreviation: 'CBC w/Diff',
    description: 'Full blood count with white cell differential',
    tests: ['CBC-DIFF'], cost: 24, category: 'hematology',
    commonIndications: ['Infection workup', 'Anemia', 'Pre-operative']
  },
  'THYROID': {
    id: 'THYROID', name: 'Thyroid Panel', abbreviation: 'Thyroid',
    description: 'TSH, Free T4, Free T3',
    tests: ['TSH', 'FT4', 'FT3'], cost: 85, category: 'endocrine',
    commonIndications: ['Thyroid dysfunction', 'Fatigue workup', 'Weight changes']
  },
  'LIPID-PANEL': {
    id: 'LIPID-PANEL', name: 'Lipid Panel', abbreviation: 'Lipid',
    description: 'Total cholesterol, HDL, LDL, triglycerides',
    tests: ['LIPID'], cost: 38, category: 'chemistry',
    commonIndications: ['Cardiovascular risk', 'Annual screening']
  },
  'LIVER': {
    id: 'LIVER', name: 'Liver Function Panel', abbreviation: 'LFTs',
    description: 'AST, ALT, alkaline phosphatase, bilirubin, albumin',
    tests: ['LFT'], cost: 28, category: 'chemistry',
    commonIndications: ['Hepatitis screening', 'Medication monitoring']
  },
  'COAG': {
    id: 'COAG', name: 'Coagulation Panel', abbreviation: 'Coags',
    description: 'PT/INR, PTT, Fibrinogen',
    tests: ['PT-INR', 'PTT', 'FIBRIN'], cost: 55, category: 'coagulation',
    commonIndications: ['Pre-operative', 'Anticoagulation therapy']
  },
  'INFLAM': {
    id: 'INFLAM', name: 'Inflammatory Markers', abbreviation: 'Inflam',
    description: 'ESR, CRP',
    tests: ['ESR', 'CRP'], cost: 31, category: 'chemistry',
    commonIndications: ['Infection', 'Autoimmune disease']
  },
  'CARDIAC': {
    id: 'CARDIAC', name: 'Cardiac Panel', abbreviation: 'Cardiac',
    description: 'Troponin I, BNP',
    tests: ['TROP-I', 'BNP'], cost: 100, category: 'cardiac',
    commonIndications: ['Chest pain', 'Heart failure', 'ACS evaluation']
  },
  'ANEMIA': {
    id: 'ANEMIA', name: 'Anemia Panel', abbreviation: 'Anemia',
    description: 'CBC, Iron studies, B12, Folate, Reticulocyte count',
    tests: ['CBC-DIFF', 'IRON', 'FERRITIN', 'B12', 'FOLATE', 'RETIC'], cost: 150, category: 'hematology',
    commonIndications: ['Anemia workup', 'Fatigue', 'Iron deficiency']
  },
  'SEPSIS': {
    id: 'SEPSIS', name: 'Sepsis Workup', abbreviation: 'Sepsis',
    description: 'CBC, CMP, Lactate, Procalcitonin, Blood cultures',
    tests: ['CBC-DIFF', 'CMP', 'LACTATE', 'PROCALCITONIN', 'BCULT'], cost: 250, category: 'microbiology',
    commonIndications: ['Suspected sepsis', 'SIRS criteria', 'Fever with hypotension']
  },
  'ACS': {
    id: 'ACS', name: 'ACS Panel', abbreviation: 'ACS',
    description: 'Troponin, CBC, BMP, PT/INR, BNP',
    tests: ['TROP-I', 'CBC-DIFF', 'BMP', 'PT-INR', 'BNP'], cost: 160, category: 'cardiac',
    commonIndications: ['Chest pain', 'Suspected MI', 'ACS evaluation']
  },
};

// =============================================================================
// Utility Functions
// =============================================================================

export function getLabTest(code: string): LabTest | undefined {
  return LAB_CATALOG[code];
}

export function getLabPanel(id: string): LabPanel | undefined {
  return LAB_PANELS[id];
}

export function searchLabs(query: string): LabTest[] {
  const q = query.toLowerCase();
  return Object.values(LAB_CATALOG).filter(test =>
    test.code.toLowerCase().includes(q) ||
    test.name.toLowerCase().includes(q) ||
    test.description.toLowerCase().includes(q)
  );
}

export function getLabsByCategory(category: string): LabTest[] {
  return Object.values(LAB_CATALOG).filter(test => test.category === category);
}

export function getAllLabTests(): LabTest[] {
  return Object.values(LAB_CATALOG);
}

export function getAllLabPanels(): LabPanel[] {
  return Object.values(LAB_PANELS);
}
