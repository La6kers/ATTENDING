// ============================================================
// Medication Catalog - Centralized Medication Database
// apps/shared/data/catalogs/medicationCatalog.ts
//
// Comprehensive medication catalog with NDC codes and safety info
// ============================================================

import type { OrderPriority } from '../../stores/types';

// =============================================================================
// Types
// =============================================================================

export type DrugSchedule = 'OTC' | 'RX' | 'II' | 'III' | 'IV' | 'V';
export type DosageForm = 'tablet' | 'capsule' | 'liquid' | 'injection' | 'topical' | 'inhaler' | 'patch' | 'suppository' | 'drops' | 'spray';
export type DrugCategory = 
  | 'analgesic' | 'antibiotic' | 'antihypertensive' | 'antidiabetic' | 'anticoagulant'
  | 'antidepressant' | 'anxiolytic' | 'anticonvulsant' | 'antihistamine' | 'antacid'
  | 'bronchodilator' | 'corticosteroid' | 'diuretic' | 'lipid-lowering' | 'migraine'
  | 'muscle-relaxant' | 'nsaid' | 'opioid' | 'proton-pump-inhibitor' | 'thyroid'
  | 'vitamin' | 'antiemetic' | 'other';

export interface Medication {
  code: string;
  name: string;
  brandName: string;
  genericName: string;
  description: string;
  category: DrugCategory;
  schedule: DrugSchedule;
  dosageForms: DosageForm[];
  strengths: string[];
  defaultStrength: string;
  defaultForm: DosageForm;
  defaultQuantity: number;
  defaultDaysSupply: number;
  defaultRefills: number;
  maxRefills: number;
  defaultDirections: string;
  commonIndications: string[];
  contraindications: string[];
  blackBoxWarning?: string;
  pregnancyCategory?: string;
  requiresPriorAuth?: boolean;
  isControlled: boolean;
  defaultPriority: OrderPriority;
  cost: { generic: number; brand: number };
  ndc?: string;
}

export interface DrugInteraction {
  id: string;
  drug1: string;
  drug2: string;
  severity: 'minor' | 'moderate' | 'major' | 'contraindicated';
  description: string;
  clinicalEffect: string;
  management: string;
}

// =============================================================================
// Medication Catalog
// =============================================================================

export const MEDICATION_CATALOG: Record<string, Medication> = {
  // ---------------------------------------------------------------------------
  // Analgesics & NSAIDs
  // ---------------------------------------------------------------------------
  'acetaminophen': {
    code: 'acetaminophen',
    name: 'Acetaminophen',
    brandName: 'Tylenol',
    genericName: 'Acetaminophen',
    description: 'Non-opioid analgesic and antipyretic',
    category: 'analgesic',
    schedule: 'OTC',
    dosageForms: ['tablet', 'capsule', 'liquid'],
    strengths: ['325mg', '500mg', '650mg', '1000mg'],
    defaultStrength: '500mg',
    defaultForm: 'tablet',
    defaultQuantity: 100,
    defaultDaysSupply: 30,
    defaultRefills: 3,
    maxRefills: 11,
    defaultDirections: 'Take 1-2 tablets every 4-6 hours as needed. Max 4000mg/day.',
    commonIndications: ['Pain', 'Fever', 'Headache'],
    contraindications: ['Severe hepatic impairment', 'Alcohol use disorder'],
    isControlled: false,
    defaultPriority: 'ROUTINE',
    cost: { generic: 8, brand: 15 }
  },
  'ibuprofen': {
    code: 'ibuprofen',
    name: 'Ibuprofen',
    brandName: 'Motrin/Advil',
    genericName: 'Ibuprofen',
    description: 'NSAID for pain, inflammation, and fever',
    category: 'nsaid',
    schedule: 'OTC',
    dosageForms: ['tablet', 'capsule', 'liquid'],
    strengths: ['200mg', '400mg', '600mg', '800mg'],
    defaultStrength: '400mg',
    defaultForm: 'tablet',
    defaultQuantity: 90,
    defaultDaysSupply: 30,
    defaultRefills: 3,
    maxRefills: 11,
    defaultDirections: 'Take 1 tablet every 6-8 hours as needed with food.',
    commonIndications: ['Pain', 'Inflammation', 'Fever', 'Headache', 'Arthritis'],
    contraindications: ['GI bleeding', 'Renal impairment', 'Third trimester pregnancy', 'Aspirin allergy'],
    blackBoxWarning: 'NSAIDs may increase risk of cardiovascular events and GI bleeding.',
    pregnancyCategory: 'D (third trimester)',
    isControlled: false,
    defaultPriority: 'ROUTINE',
    cost: { generic: 10, brand: 18 }
  },
  'naproxen': {
    code: 'naproxen',
    name: 'Naproxen',
    brandName: 'Aleve/Naprosyn',
    genericName: 'Naproxen',
    description: 'NSAID with longer duration of action',
    category: 'nsaid',
    schedule: 'RX',
    dosageForms: ['tablet', 'capsule'],
    strengths: ['220mg', '250mg', '375mg', '500mg'],
    defaultStrength: '500mg',
    defaultForm: 'tablet',
    defaultQuantity: 60,
    defaultDaysSupply: 30,
    defaultRefills: 3,
    maxRefills: 11,
    defaultDirections: 'Take 1 tablet twice daily with food.',
    commonIndications: ['Pain', 'Inflammation', 'Arthritis', 'Dysmenorrhea'],
    contraindications: ['GI bleeding', 'Renal impairment', 'Aspirin allergy'],
    blackBoxWarning: 'NSAIDs may increase risk of cardiovascular events and GI bleeding.',
    isControlled: false,
    defaultPriority: 'ROUTINE',
    cost: { generic: 12, brand: 25 }
  },

  // ---------------------------------------------------------------------------
  // Migraine Medications
  // ---------------------------------------------------------------------------
  'sumatriptan': {
    code: 'sumatriptan',
    name: 'Sumatriptan',
    brandName: 'Imitrex',
    genericName: 'Sumatriptan',
    description: 'Triptan for acute migraine treatment',
    category: 'migraine',
    schedule: 'RX',
    dosageForms: ['tablet', 'injection', 'spray'],
    strengths: ['25mg', '50mg', '100mg'],
    defaultStrength: '100mg',
    defaultForm: 'tablet',
    defaultQuantity: 9,
    defaultDaysSupply: 30,
    defaultRefills: 5,
    maxRefills: 5,
    defaultDirections: 'Take 1 tablet at onset of migraine. May repeat in 2 hours. Max 200mg/day.',
    commonIndications: ['Migraine', 'Cluster headache'],
    contraindications: ['CAD', 'Uncontrolled HTN', 'Hemiplegic migraine', 'MAO-I use within 14 days'],
    isControlled: false,
    defaultPriority: 'ROUTINE',
    cost: { generic: 35, brand: 280 }
  },
  'rizatriptan': {
    code: 'rizatriptan',
    name: 'Rizatriptan',
    brandName: 'Maxalt',
    genericName: 'Rizatriptan',
    description: 'Fast-acting triptan for migraine',
    category: 'migraine',
    schedule: 'RX',
    dosageForms: ['tablet'],
    strengths: ['5mg', '10mg'],
    defaultStrength: '10mg',
    defaultForm: 'tablet',
    defaultQuantity: 12,
    defaultDaysSupply: 30,
    defaultRefills: 5,
    maxRefills: 5,
    defaultDirections: 'Take 1 tablet at onset of migraine. May repeat in 2 hours. Max 30mg/day.',
    commonIndications: ['Migraine'],
    contraindications: ['CAD', 'Uncontrolled HTN', 'MAO-I use within 14 days'],
    isControlled: false,
    defaultPriority: 'ROUTINE',
    cost: { generic: 40, brand: 350 }
  },
  'topiramate': {
    code: 'topiramate',
    name: 'Topiramate',
    brandName: 'Topamax',
    genericName: 'Topiramate',
    description: 'Anticonvulsant used for migraine prophylaxis',
    category: 'anticonvulsant',
    schedule: 'RX',
    dosageForms: ['tablet', 'capsule'],
    strengths: ['25mg', '50mg', '100mg', '200mg'],
    defaultStrength: '25mg',
    defaultForm: 'tablet',
    defaultQuantity: 60,
    defaultDaysSupply: 30,
    defaultRefills: 5,
    maxRefills: 5,
    defaultDirections: 'Take 25mg at bedtime. Titrate by 25mg weekly to target 50mg twice daily.',
    commonIndications: ['Migraine prophylaxis', 'Epilepsy'],
    contraindications: ['Metabolic acidosis', 'Kidney stones', 'Pregnancy'],
    blackBoxWarning: 'Increased risk of oral clefts in infants exposed during first trimester.',
    pregnancyCategory: 'D',
    isControlled: false,
    defaultPriority: 'ROUTINE',
    cost: { generic: 15, brand: 450 }
  },

  // ---------------------------------------------------------------------------
  // Antibiotics
  // ---------------------------------------------------------------------------
  'amoxicillin': {
    code: 'amoxicillin',
    name: 'Amoxicillin',
    brandName: 'Amoxil',
    genericName: 'Amoxicillin',
    description: 'Penicillin-type antibiotic',
    category: 'antibiotic',
    schedule: 'RX',
    dosageForms: ['capsule', 'tablet', 'liquid'],
    strengths: ['250mg', '500mg', '875mg'],
    defaultStrength: '500mg',
    defaultForm: 'capsule',
    defaultQuantity: 21,
    defaultDaysSupply: 7,
    defaultRefills: 0,
    maxRefills: 0,
    defaultDirections: 'Take 1 capsule three times daily for 7 days.',
    commonIndications: ['Upper respiratory infection', 'UTI', 'Skin infection', 'Dental infection'],
    contraindications: ['Penicillin allergy', 'Mononucleosis'],
    isControlled: false,
    defaultPriority: 'ROUTINE',
    cost: { generic: 8, brand: 45 }
  },
  'azithromycin': {
    code: 'azithromycin',
    name: 'Azithromycin',
    brandName: 'Zithromax/Z-Pack',
    genericName: 'Azithromycin',
    description: 'Macrolide antibiotic',
    category: 'antibiotic',
    schedule: 'RX',
    dosageForms: ['tablet', 'liquid'],
    strengths: ['250mg', '500mg'],
    defaultStrength: '250mg',
    defaultForm: 'tablet',
    defaultQuantity: 6,
    defaultDaysSupply: 5,
    defaultRefills: 0,
    maxRefills: 0,
    defaultDirections: 'Take 2 tablets (500mg) on day 1, then 1 tablet daily for days 2-5.',
    commonIndications: ['Respiratory infection', 'Skin infection', 'STI'],
    contraindications: ['Macrolide allergy', 'QT prolongation', 'Cholestatic jaundice history'],
    isControlled: false,
    defaultPriority: 'ROUTINE',
    cost: { generic: 12, brand: 85 }
  },
  'ciprofloxacin': {
    code: 'ciprofloxacin',
    name: 'Ciprofloxacin',
    brandName: 'Cipro',
    genericName: 'Ciprofloxacin',
    description: 'Fluoroquinolone antibiotic',
    category: 'antibiotic',
    schedule: 'RX',
    dosageForms: ['tablet'],
    strengths: ['250mg', '500mg', '750mg'],
    defaultStrength: '500mg',
    defaultForm: 'tablet',
    defaultQuantity: 14,
    defaultDaysSupply: 7,
    defaultRefills: 0,
    maxRefills: 0,
    defaultDirections: 'Take 1 tablet twice daily for 7 days.',
    commonIndications: ['UTI', 'Prostatitis', 'GI infection', 'Bone infection'],
    contraindications: ['Fluoroquinolone allergy', 'Myasthenia gravis', 'QT prolongation'],
    blackBoxWarning: 'Risk of tendinitis, tendon rupture, and irreversible peripheral neuropathy.',
    isControlled: false,
    defaultPriority: 'ROUTINE',
    cost: { generic: 15, brand: 180 }
  },
  'doxycycline': {
    code: 'doxycycline',
    name: 'Doxycycline',
    brandName: 'Vibramycin',
    genericName: 'Doxycycline',
    description: 'Tetracycline antibiotic',
    category: 'antibiotic',
    schedule: 'RX',
    dosageForms: ['capsule', 'tablet'],
    strengths: ['50mg', '100mg'],
    defaultStrength: '100mg',
    defaultForm: 'capsule',
    defaultQuantity: 14,
    defaultDaysSupply: 7,
    defaultRefills: 0,
    maxRefills: 0,
    defaultDirections: 'Take 1 capsule twice daily with food and full glass of water.',
    commonIndications: ['Acne', 'Respiratory infection', 'STI', 'Lyme disease'],
    contraindications: ['Tetracycline allergy', 'Pregnancy', 'Children <8 years'],
    isControlled: false,
    defaultPriority: 'ROUTINE',
    cost: { generic: 20, brand: 250 }
  },

  // ---------------------------------------------------------------------------
  // Cardiovascular
  // ---------------------------------------------------------------------------
  'lisinopril': {
    code: 'lisinopril',
    name: 'Lisinopril',
    brandName: 'Prinivil/Zestril',
    genericName: 'Lisinopril',
    description: 'ACE inhibitor for hypertension and heart failure',
    category: 'antihypertensive',
    schedule: 'RX',
    dosageForms: ['tablet'],
    strengths: ['2.5mg', '5mg', '10mg', '20mg', '40mg'],
    defaultStrength: '10mg',
    defaultForm: 'tablet',
    defaultQuantity: 30,
    defaultDaysSupply: 30,
    defaultRefills: 5,
    maxRefills: 11,
    defaultDirections: 'Take 1 tablet once daily.',
    commonIndications: ['Hypertension', 'Heart failure', 'Post-MI', 'Diabetic nephropathy'],
    contraindications: ['ACE inhibitor allergy', 'Angioedema history', 'Pregnancy', 'Bilateral renal artery stenosis'],
    blackBoxWarning: 'Can cause fetal harm when administered to pregnant women.',
    pregnancyCategory: 'D',
    isControlled: false,
    defaultPriority: 'ROUTINE',
    cost: { generic: 8, brand: 120 }
  },
  'amlodipine': {
    code: 'amlodipine',
    name: 'Amlodipine',
    brandName: 'Norvasc',
    genericName: 'Amlodipine',
    description: 'Calcium channel blocker',
    category: 'antihypertensive',
    schedule: 'RX',
    dosageForms: ['tablet'],
    strengths: ['2.5mg', '5mg', '10mg'],
    defaultStrength: '5mg',
    defaultForm: 'tablet',
    defaultQuantity: 30,
    defaultDaysSupply: 30,
    defaultRefills: 5,
    maxRefills: 11,
    defaultDirections: 'Take 1 tablet once daily.',
    commonIndications: ['Hypertension', 'Angina'],
    contraindications: ['Severe aortic stenosis', 'Hypersensitivity'],
    isControlled: false,
    defaultPriority: 'ROUTINE',
    cost: { generic: 10, brand: 150 }
  },
  'metoprolol': {
    code: 'metoprolol',
    name: 'Metoprolol',
    brandName: 'Lopressor/Toprol-XL',
    genericName: 'Metoprolol',
    description: 'Beta blocker',
    category: 'antihypertensive',
    schedule: 'RX',
    dosageForms: ['tablet'],
    strengths: ['25mg', '50mg', '100mg', '200mg'],
    defaultStrength: '25mg',
    defaultForm: 'tablet',
    defaultQuantity: 60,
    defaultDaysSupply: 30,
    defaultRefills: 5,
    maxRefills: 11,
    defaultDirections: 'Take 1 tablet twice daily.',
    commonIndications: ['Hypertension', 'Angina', 'Heart failure', 'Migraine prophylaxis', 'Afib rate control'],
    contraindications: ['Sinus bradycardia', 'Heart block', 'Cardiogenic shock', 'Decompensated HF'],
    isControlled: false,
    defaultPriority: 'ROUTINE',
    cost: { generic: 8, brand: 85 }
  },
  'atorvastatin': {
    code: 'atorvastatin',
    name: 'Atorvastatin',
    brandName: 'Lipitor',
    genericName: 'Atorvastatin',
    description: 'Statin for cholesterol management',
    category: 'lipid-lowering',
    schedule: 'RX',
    dosageForms: ['tablet'],
    strengths: ['10mg', '20mg', '40mg', '80mg'],
    defaultStrength: '20mg',
    defaultForm: 'tablet',
    defaultQuantity: 30,
    defaultDaysSupply: 30,
    defaultRefills: 5,
    maxRefills: 11,
    defaultDirections: 'Take 1 tablet once daily at bedtime.',
    commonIndications: ['Hyperlipidemia', 'ASCVD prevention'],
    contraindications: ['Active liver disease', 'Pregnancy', 'Breastfeeding'],
    pregnancyCategory: 'X',
    isControlled: false,
    defaultPriority: 'ROUTINE',
    cost: { generic: 12, brand: 280 }
  },

  // ---------------------------------------------------------------------------
  // Diabetes
  // ---------------------------------------------------------------------------
  'metformin': {
    code: 'metformin',
    name: 'Metformin',
    brandName: 'Glucophage',
    genericName: 'Metformin',
    description: 'First-line oral antidiabetic',
    category: 'antidiabetic',
    schedule: 'RX',
    dosageForms: ['tablet'],
    strengths: ['500mg', '850mg', '1000mg'],
    defaultStrength: '500mg',
    defaultForm: 'tablet',
    defaultQuantity: 60,
    defaultDaysSupply: 30,
    defaultRefills: 5,
    maxRefills: 11,
    defaultDirections: 'Take 1 tablet twice daily with meals.',
    commonIndications: ['Type 2 diabetes', 'Prediabetes', 'PCOS'],
    contraindications: ['Renal impairment (GFR <30)', 'Metabolic acidosis', 'Acute MI'],
    blackBoxWarning: 'Lactic acidosis risk, especially with renal impairment.',
    isControlled: false,
    defaultPriority: 'ROUTINE',
    cost: { generic: 8, brand: 180 }
  },

  // ---------------------------------------------------------------------------
  // GI
  // ---------------------------------------------------------------------------
  'omeprazole': {
    code: 'omeprazole',
    name: 'Omeprazole',
    brandName: 'Prilosec',
    genericName: 'Omeprazole',
    description: 'Proton pump inhibitor',
    category: 'proton-pump-inhibitor',
    schedule: 'RX',
    dosageForms: ['capsule', 'tablet'],
    strengths: ['10mg', '20mg', '40mg'],
    defaultStrength: '20mg',
    defaultForm: 'capsule',
    defaultQuantity: 30,
    defaultDaysSupply: 30,
    defaultRefills: 3,
    maxRefills: 5,
    defaultDirections: 'Take 1 capsule 30 minutes before breakfast.',
    commonIndications: ['GERD', 'Peptic ulcer', 'H. pylori', 'NSAID gastroprotection'],
    contraindications: ['PPI allergy', 'Rilpivirine use'],
    isControlled: false,
    defaultPriority: 'ROUTINE',
    cost: { generic: 15, brand: 220 }
  },
  'ondansetron': {
    code: 'ondansetron',
    name: 'Ondansetron',
    brandName: 'Zofran',
    genericName: 'Ondansetron',
    description: 'Antiemetic (5-HT3 antagonist)',
    category: 'antiemetic',
    schedule: 'RX',
    dosageForms: ['tablet', 'liquid'],
    strengths: ['4mg', '8mg'],
    defaultStrength: '4mg',
    defaultForm: 'tablet',
    defaultQuantity: 20,
    defaultDaysSupply: 10,
    defaultRefills: 2,
    maxRefills: 5,
    defaultDirections: 'Take 1 tablet every 8 hours as needed for nausea.',
    commonIndications: ['Nausea', 'Vomiting', 'Chemotherapy-induced N/V'],
    contraindications: ['Hypersensitivity', 'Congenital long QT syndrome'],
    isControlled: false,
    defaultPriority: 'ROUTINE',
    cost: { generic: 25, brand: 180 }
  },

  // ---------------------------------------------------------------------------
  // Psychiatric
  // ---------------------------------------------------------------------------
  'sertraline': {
    code: 'sertraline',
    name: 'Sertraline',
    brandName: 'Zoloft',
    genericName: 'Sertraline',
    description: 'SSRI antidepressant',
    category: 'antidepressant',
    schedule: 'RX',
    dosageForms: ['tablet'],
    strengths: ['25mg', '50mg', '100mg'],
    defaultStrength: '50mg',
    defaultForm: 'tablet',
    defaultQuantity: 30,
    defaultDaysSupply: 30,
    defaultRefills: 5,
    maxRefills: 5,
    defaultDirections: 'Take 1 tablet once daily.',
    commonIndications: ['Depression', 'Anxiety', 'PTSD', 'OCD', 'Panic disorder'],
    contraindications: ['MAO-I use within 14 days', 'Pimozide use'],
    blackBoxWarning: 'Increased risk of suicidal thinking in children and young adults.',
    isControlled: false,
    defaultPriority: 'ROUTINE',
    cost: { generic: 10, brand: 350 }
  },
  'escitalopram': {
    code: 'escitalopram',
    name: 'Escitalopram',
    brandName: 'Lexapro',
    genericName: 'Escitalopram',
    description: 'SSRI antidepressant',
    category: 'antidepressant',
    schedule: 'RX',
    dosageForms: ['tablet'],
    strengths: ['5mg', '10mg', '20mg'],
    defaultStrength: '10mg',
    defaultForm: 'tablet',
    defaultQuantity: 30,
    defaultDaysSupply: 30,
    defaultRefills: 5,
    maxRefills: 5,
    defaultDirections: 'Take 1 tablet once daily.',
    commonIndications: ['Depression', 'Generalized anxiety disorder'],
    contraindications: ['MAO-I use within 14 days', 'Pimozide use', 'QT prolongation'],
    blackBoxWarning: 'Increased risk of suicidal thinking in children and young adults.',
    isControlled: false,
    defaultPriority: 'ROUTINE',
    cost: { generic: 12, brand: 280 }
  },
  'lorazepam': {
    code: 'lorazepam',
    name: 'Lorazepam',
    brandName: 'Ativan',
    genericName: 'Lorazepam',
    description: 'Benzodiazepine anxiolytic',
    category: 'anxiolytic',
    schedule: 'IV',
    dosageForms: ['tablet', 'injection'],
    strengths: ['0.5mg', '1mg', '2mg'],
    defaultStrength: '0.5mg',
    defaultForm: 'tablet',
    defaultQuantity: 30,
    defaultDaysSupply: 30,
    defaultRefills: 0,
    maxRefills: 5,
    defaultDirections: 'Take 1 tablet 2-3 times daily as needed for anxiety.',
    commonIndications: ['Anxiety', 'Insomnia', 'Seizures', 'Alcohol withdrawal'],
    contraindications: ['Acute narrow-angle glaucoma', 'Severe respiratory insufficiency', 'Sleep apnea'],
    blackBoxWarning: 'Risk of abuse, misuse, addiction. Concomitant opioid use increases fatal overdose risk.',
    isControlled: true,
    requiresPriorAuth: true,
    defaultPriority: 'ROUTINE',
    cost: { generic: 15, brand: 120 }
  },

  // ---------------------------------------------------------------------------
  // Respiratory
  // ---------------------------------------------------------------------------
  'albuterol': {
    code: 'albuterol',
    name: 'Albuterol',
    brandName: 'ProAir/Ventolin',
    genericName: 'Albuterol',
    description: 'Short-acting beta agonist bronchodilator',
    category: 'bronchodilator',
    schedule: 'RX',
    dosageForms: ['inhaler'],
    strengths: ['90mcg/actuation'],
    defaultStrength: '90mcg/actuation',
    defaultForm: 'inhaler',
    defaultQuantity: 1,
    defaultDaysSupply: 30,
    defaultRefills: 5,
    maxRefills: 11,
    defaultDirections: 'Inhale 1-2 puffs every 4-6 hours as needed for shortness of breath.',
    commonIndications: ['Asthma', 'COPD', 'Bronchospasm'],
    contraindications: ['Hypersensitivity to albuterol'],
    isControlled: false,
    defaultPriority: 'ROUTINE',
    cost: { generic: 30, brand: 75 }
  },
  'prednisone': {
    code: 'prednisone',
    name: 'Prednisone',
    brandName: 'Deltasone',
    genericName: 'Prednisone',
    description: 'Corticosteroid',
    category: 'corticosteroid',
    schedule: 'RX',
    dosageForms: ['tablet'],
    strengths: ['1mg', '5mg', '10mg', '20mg', '50mg'],
    defaultStrength: '10mg',
    defaultForm: 'tablet',
    defaultQuantity: 21,
    defaultDaysSupply: 7,
    defaultRefills: 0,
    maxRefills: 2,
    defaultDirections: 'Take as directed. Taper as prescribed. Do not stop abruptly.',
    commonIndications: ['Asthma exacerbation', 'COPD exacerbation', 'Inflammation', 'Autoimmune conditions'],
    contraindications: ['Systemic fungal infections', 'Live vaccine administration'],
    isControlled: false,
    defaultPriority: 'ROUTINE',
    cost: { generic: 8, brand: 45 }
  },

  // ---------------------------------------------------------------------------
  // Thyroid
  // ---------------------------------------------------------------------------
  'levothyroxine': {
    code: 'levothyroxine',
    name: 'Levothyroxine',
    brandName: 'Synthroid',
    genericName: 'Levothyroxine',
    description: 'Thyroid hormone replacement',
    category: 'thyroid',
    schedule: 'RX',
    dosageForms: ['tablet'],
    strengths: ['25mcg', '50mcg', '75mcg', '88mcg', '100mcg', '112mcg', '125mcg', '150mcg'],
    defaultStrength: '50mcg',
    defaultForm: 'tablet',
    defaultQuantity: 30,
    defaultDaysSupply: 30,
    defaultRefills: 5,
    maxRefills: 11,
    defaultDirections: 'Take 1 tablet on empty stomach, 30-60 min before breakfast.',
    commonIndications: ['Hypothyroidism', 'TSH suppression'],
    contraindications: ['Untreated adrenal insufficiency', 'Acute MI'],
    isControlled: false,
    defaultPriority: 'ROUTINE',
    cost: { generic: 15, brand: 85 }
  },

  // ---------------------------------------------------------------------------
  // Muscle Relaxants
  // ---------------------------------------------------------------------------
  'cyclobenzaprine': {
    code: 'cyclobenzaprine',
    name: 'Cyclobenzaprine',
    brandName: 'Flexeril',
    genericName: 'Cyclobenzaprine',
    description: 'Skeletal muscle relaxant',
    category: 'muscle-relaxant',
    schedule: 'RX',
    dosageForms: ['tablet'],
    strengths: ['5mg', '10mg'],
    defaultStrength: '10mg',
    defaultForm: 'tablet',
    defaultQuantity: 30,
    defaultDaysSupply: 10,
    defaultRefills: 1,
    maxRefills: 2,
    defaultDirections: 'Take 1 tablet three times daily as needed for muscle spasm.',
    commonIndications: ['Muscle spasm', 'Back pain', 'Neck pain'],
    contraindications: ['MAO-I use within 14 days', 'Arrhythmias', 'Heart block', 'Hyperthyroidism'],
    isControlled: false,
    defaultPriority: 'ROUTINE',
    cost: { generic: 12, brand: 150 }
  },

  // ---------------------------------------------------------------------------
  // Vitamins & Supplements
  // ---------------------------------------------------------------------------
  'vitamin-d3': {
    code: 'vitamin-d3',
    name: 'Vitamin D3',
    brandName: 'Vitamin D3',
    genericName: 'Cholecalciferol',
    description: 'Vitamin D supplement',
    category: 'vitamin',
    schedule: 'OTC',
    dosageForms: ['capsule', 'tablet'],
    strengths: ['1000 IU', '2000 IU', '5000 IU', '50000 IU'],
    defaultStrength: '2000 IU',
    defaultForm: 'capsule',
    defaultQuantity: 90,
    defaultDaysSupply: 90,
    defaultRefills: 3,
    maxRefills: 11,
    defaultDirections: 'Take 1 capsule once daily with food.',
    commonIndications: ['Vitamin D deficiency', 'Osteoporosis prevention'],
    contraindications: ['Hypercalcemia', 'Hypervitaminosis D'],
    isControlled: false,
    defaultPriority: 'ROUTINE',
    cost: { generic: 10, brand: 25 }
  },
  'magnesium-oxide': {
    code: 'magnesium-oxide',
    name: 'Magnesium Oxide',
    brandName: 'Mag-Ox',
    genericName: 'Magnesium Oxide',
    description: 'Magnesium supplement',
    category: 'vitamin',
    schedule: 'OTC',
    dosageForms: ['capsule', 'tablet'],
    strengths: ['400mg', '500mg'],
    defaultStrength: '400mg',
    defaultForm: 'capsule',
    defaultQuantity: 60,
    defaultDaysSupply: 30,
    defaultRefills: 5,
    maxRefills: 11,
    defaultDirections: 'Take 1 capsule twice daily with food.',
    commonIndications: ['Magnesium deficiency', 'Migraine prophylaxis', 'Constipation'],
    contraindications: ['Renal impairment', 'Myasthenia gravis'],
    isControlled: false,
    defaultPriority: 'ROUTINE',
    cost: { generic: 8, brand: 15 }
  },
};

// =============================================================================
// Drug Interactions Database
// =============================================================================

export const DRUG_INTERACTIONS: DrugInteraction[] = [
  {
    id: 'topiramate-ocp',
    drug1: 'topiramate',
    drug2: 'oral contraceptives',
    severity: 'moderate',
    description: 'Topiramate may decrease the effectiveness of oral contraceptives.',
    clinicalEffect: 'Reduced contraceptive efficacy.',
    management: 'Use additional contraceptive methods.'
  },
  {
    id: 'nsaid-anticoagulant',
    drug1: 'ibuprofen',
    drug2: 'warfarin',
    severity: 'major',
    description: 'NSAIDs increase bleeding risk with anticoagulants.',
    clinicalEffect: 'Increased risk of GI bleeding.',
    management: 'Avoid combination. Use acetaminophen instead.'
  },
  {
    id: 'ssri-triptan',
    drug1: 'sertraline',
    drug2: 'sumatriptan',
    severity: 'moderate',
    description: 'Serotonin syndrome risk when combining SSRIs with triptans.',
    clinicalEffect: 'Rare but potentially serious serotonin syndrome.',
    management: 'Use with caution. Educate patient on symptoms.'
  },
  {
    id: 'metformin-contrast',
    drug1: 'metformin',
    drug2: 'iodinated contrast',
    severity: 'major',
    description: 'Hold metformin before and after contrast procedures.',
    clinicalEffect: 'Risk of lactic acidosis.',
    management: 'Hold 48 hours before and after. Check renal function.'
  },
  {
    id: 'ace-potassium',
    drug1: 'lisinopril',
    drug2: 'potassium supplements',
    severity: 'moderate',
    description: 'ACE inhibitors can cause hyperkalemia with potassium.',
    clinicalEffect: 'Risk of hyperkalemia.',
    management: 'Monitor potassium levels.'
  },
  {
    id: 'benzo-opioid',
    drug1: 'lorazepam',
    drug2: 'tramadol',
    severity: 'contraindicated',
    description: 'Benzodiazepines with opioids increase fatal overdose risk.',
    clinicalEffect: 'Profound sedation, respiratory depression, death.',
    management: 'Avoid combination.'
  },
];

export default MEDICATION_CATALOG;
