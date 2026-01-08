// ============================================================
// Medication Ordering Store - Zustand with BioMistral AI Integration
// apps/provider-portal/store/medicationOrderingStore.ts
//
// Manages medication prescribing workflow with AI recommendations,
// drug interaction checking, and allergy alerts
// ============================================================

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

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
  | 'vitamin' | 'other';

export type PrescriptionPriority = 'STAT' | 'URGENT' | 'ROUTINE';

export interface Medication {
  id: string;
  brandName: string;
  genericName: string;
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

export interface DrugAllergy {
  allergen: string;
  reaction: string;
  severity: 'mild' | 'moderate' | 'severe';
  crossReactivity?: string[];
}

export interface AIMedicationRecommendation {
  id: string;
  medicationId: string;
  medicationName: string;
  category: DrugCategory;
  priority: PrescriptionPriority;
  rationale: string;
  clinicalEvidence: string[];
  confidence: number;
  recommendationType: 'first-line' | 'alternative' | 'adjunct' | 'avoid';
  dosageRecommendation?: string;
  durationRecommendation?: string;
  monitoringRequired?: string[];
  warningMessage?: string;
}

export interface SelectedMedication {
  medication: Medication;
  strength: string;
  form: DosageForm;
  quantity: number;
  daysSupply: number;
  refills: number;
  directions: string;
  indication: string;
  priority: PrescriptionPriority;
  dispenseAsWritten: boolean;
  aiRecommended: boolean;
  rationale?: string;
}

export interface PatientContext {
  id: string;
  name: string;
  age: number;
  gender: string;
  weight?: number;
  mrn: string;
  chiefComplaint: string;
  allergies: DrugAllergy[];
  currentMedications: string[];
  medicalHistory: string[];
  renalFunction?: { creatinine: number; gfr: number };
  hepaticFunction?: { alt: number; ast: number };
  pregnant?: boolean;
  breastfeeding?: boolean;
}

export interface PharmacyInfo {
  id: string;
  name: string;
  address: string;
  phone: string;
  fax: string;
  hours: string;
  isPreferred: boolean;
  acceptsEprescribe: boolean;
}

// =============================================================================
// Medication Catalog
// =============================================================================

export const MEDICATION_CATALOG: Record<string, Medication> = {
  // Analgesics & NSAIDs
  'acetaminophen': {
    id: 'acetaminophen',
    brandName: 'Tylenol',
    genericName: 'Acetaminophen',
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
    defaultDirections: 'Take 1-2 tablets by mouth every 4-6 hours as needed for pain. Max 4000mg/day.',
    commonIndications: ['Pain', 'Fever', 'Headache'],
    contraindications: ['Severe hepatic impairment', 'Alcohol use disorder'],
    isControlled: false,
    cost: { generic: 8, brand: 15 }
  },
  'ibuprofen': {
    id: 'ibuprofen',
    brandName: 'Motrin/Advil',
    genericName: 'Ibuprofen',
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
    defaultDirections: 'Take 1 tablet by mouth every 6-8 hours as needed for pain with food.',
    commonIndications: ['Pain', 'Inflammation', 'Fever', 'Headache', 'Arthritis'],
    contraindications: ['GI bleeding', 'Renal impairment', 'Third trimester pregnancy', 'Aspirin allergy'],
    blackBoxWarning: 'NSAIDs may increase risk of cardiovascular events and GI bleeding.',
    pregnancyCategory: 'D (third trimester)',
    isControlled: false,
    cost: { generic: 10, brand: 18 }
  },
  'naproxen': {
    id: 'naproxen',
    brandName: 'Aleve/Naprosyn',
    genericName: 'Naproxen',
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
    defaultDirections: 'Take 1 tablet by mouth twice daily with food.',
    commonIndications: ['Pain', 'Inflammation', 'Arthritis', 'Dysmenorrhea'],
    contraindications: ['GI bleeding', 'Renal impairment', 'Aspirin allergy'],
    blackBoxWarning: 'NSAIDs may increase risk of cardiovascular events and GI bleeding.',
    isControlled: false,
    cost: { generic: 12, brand: 25 }
  },
  
  // Migraine Medications
  'sumatriptan': {
    id: 'sumatriptan',
    brandName: 'Imitrex',
    genericName: 'Sumatriptan',
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
    defaultDirections: 'Take 1 tablet at onset of migraine. May repeat in 2 hours if needed. Max 200mg/day.',
    commonIndications: ['Migraine', 'Cluster headache'],
    contraindications: ['CAD', 'Uncontrolled HTN', 'Hemiplegic migraine', 'MAO-I use within 14 days'],
    isControlled: false,
    cost: { generic: 35, brand: 280 }
  },
  'rizatriptan': {
    id: 'rizatriptan',
    brandName: 'Maxalt',
    genericName: 'Rizatriptan',
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
    defaultDirections: 'Take 1 tablet at onset of migraine. May repeat in 2 hours if needed. Max 30mg/day.',
    commonIndications: ['Migraine'],
    contraindications: ['CAD', 'Uncontrolled HTN', 'MAO-I use within 14 days'],
    isControlled: false,
    cost: { generic: 40, brand: 350 }
  },
  'topiramate': {
    id: 'topiramate',
    brandName: 'Topamax',
    genericName: 'Topiramate',
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
    defaultDirections: 'Take 25mg by mouth at bedtime. Titrate up by 25mg weekly to target 50mg BID.',
    commonIndications: ['Migraine prophylaxis', 'Epilepsy', 'Weight loss'],
    contraindications: ['Metabolic acidosis', 'Kidney stones', 'Pregnancy'],
    blackBoxWarning: 'Increased risk of oral clefts in infants exposed during first trimester.',
    pregnancyCategory: 'D',
    isControlled: false,
    cost: { generic: 15, brand: 450 }
  },

  // Antibiotics
  'amoxicillin': {
    id: 'amoxicillin',
    brandName: 'Amoxil',
    genericName: 'Amoxicillin',
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
    defaultDirections: 'Take 1 capsule by mouth three times daily for 7 days.',
    commonIndications: ['Upper respiratory infection', 'UTI', 'Skin infection', 'Dental infection'],
    contraindications: ['Penicillin allergy', 'Mononucleosis'],
    isControlled: false,
    cost: { generic: 8, brand: 45 }
  },
  'azithromycin': {
    id: 'azithromycin',
    brandName: 'Zithromax/Z-Pack',
    genericName: 'Azithromycin',
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
    cost: { generic: 12, brand: 85 }
  },
  'ciprofloxacin': {
    id: 'ciprofloxacin',
    brandName: 'Cipro',
    genericName: 'Ciprofloxacin',
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
    defaultDirections: 'Take 1 tablet by mouth twice daily for 7 days.',
    commonIndications: ['UTI', 'Prostatitis', 'GI infection', 'Bone infection'],
    contraindications: ['Fluoroquinolone allergy', 'Myasthenia gravis', 'QT prolongation'],
    blackBoxWarning: 'Risk of tendinitis, tendon rupture, and irreversible peripheral neuropathy.',
    isControlled: false,
    cost: { generic: 15, brand: 180 }
  },
  'doxycycline': {
    id: 'doxycycline',
    brandName: 'Vibramycin',
    genericName: 'Doxycycline',
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
    defaultDirections: 'Take 1 capsule by mouth twice daily with food and full glass of water.',
    commonIndications: ['Acne', 'Respiratory infection', 'STI', 'Lyme disease', 'Malaria prophylaxis'],
    contraindications: ['Tetracycline allergy', 'Pregnancy', 'Children <8 years'],
    isControlled: false,
    cost: { generic: 20, brand: 250 }
  },

  // Cardiovascular
  'lisinopril': {
    id: 'lisinopril',
    brandName: 'Prinivil/Zestril',
    genericName: 'Lisinopril',
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
    defaultDirections: 'Take 1 tablet by mouth once daily.',
    commonIndications: ['Hypertension', 'Heart failure', 'Post-MI', 'Diabetic nephropathy'],
    contraindications: ['ACE inhibitor allergy', 'Angioedema history', 'Pregnancy', 'Bilateral renal artery stenosis'],
    blackBoxWarning: 'Can cause fetal harm when administered to pregnant women.',
    pregnancyCategory: 'D',
    isControlled: false,
    cost: { generic: 8, brand: 120 }
  },
  'amlodipine': {
    id: 'amlodipine',
    brandName: 'Norvasc',
    genericName: 'Amlodipine',
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
    defaultDirections: 'Take 1 tablet by mouth once daily.',
    commonIndications: ['Hypertension', 'Angina'],
    contraindications: ['Severe aortic stenosis', 'Hypersensitivity'],
    isControlled: false,
    cost: { generic: 10, brand: 150 }
  },
  'metoprolol': {
    id: 'metoprolol',
    brandName: 'Lopressor/Toprol-XL',
    genericName: 'Metoprolol',
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
    defaultDirections: 'Take 1 tablet by mouth twice daily.',
    commonIndications: ['Hypertension', 'Angina', 'Heart failure', 'Migraine prophylaxis', 'Afib rate control'],
    contraindications: ['Sinus bradycardia', 'Heart block', 'Cardiogenic shock', 'Decompensated HF'],
    isControlled: false,
    cost: { generic: 8, brand: 85 }
  },
  'atorvastatin': {
    id: 'atorvastatin',
    brandName: 'Lipitor',
    genericName: 'Atorvastatin',
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
    defaultDirections: 'Take 1 tablet by mouth once daily at bedtime.',
    commonIndications: ['Hyperlipidemia', 'ASCVD prevention', 'Familial hypercholesterolemia'],
    contraindications: ['Active liver disease', 'Pregnancy', 'Breastfeeding'],
    pregnancyCategory: 'X',
    isControlled: false,
    cost: { generic: 12, brand: 280 }
  },

  // Diabetes
  'metformin': {
    id: 'metformin',
    brandName: 'Glucophage',
    genericName: 'Metformin',
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
    defaultDirections: 'Take 1 tablet by mouth twice daily with meals. May titrate up.',
    commonIndications: ['Type 2 diabetes', 'Prediabetes', 'PCOS'],
    contraindications: ['Renal impairment (GFR <30)', 'Metabolic acidosis', 'Acute MI'],
    blackBoxWarning: 'Lactic acidosis risk, especially with renal impairment.',
    isControlled: false,
    cost: { generic: 8, brand: 180 }
  },

  // GI
  'omeprazole': {
    id: 'omeprazole',
    brandName: 'Prilosec',
    genericName: 'Omeprazole',
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
    defaultDirections: 'Take 1 capsule by mouth once daily 30 minutes before breakfast.',
    commonIndications: ['GERD', 'Peptic ulcer', 'H. pylori (with antibiotics)', 'NSAID gastroprotection'],
    contraindications: ['PPI allergy', 'Rilpivirine use'],
    isControlled: false,
    cost: { generic: 15, brand: 220 }
  },
  'ondansetron': {
    id: 'ondansetron',
    brandName: 'Zofran',
    genericName: 'Ondansetron',
    category: 'antihistamine',
    schedule: 'RX',
    dosageForms: ['tablet', 'liquid'],
    strengths: ['4mg', '8mg'],
    defaultStrength: '4mg',
    defaultForm: 'tablet',
    defaultQuantity: 20,
    defaultDaysSupply: 10,
    defaultRefills: 2,
    maxRefills: 5,
    defaultDirections: 'Take 1 tablet by mouth every 8 hours as needed for nausea.',
    commonIndications: ['Nausea', 'Vomiting', 'Chemotherapy-induced N/V'],
    contraindications: ['Hypersensitivity', 'Congenital long QT syndrome'],
    isControlled: false,
    cost: { generic: 25, brand: 180 }
  },

  // Psychiatric
  'sertraline': {
    id: 'sertraline',
    brandName: 'Zoloft',
    genericName: 'Sertraline',
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
    defaultDirections: 'Take 1 tablet by mouth once daily.',
    commonIndications: ['Depression', 'Anxiety', 'PTSD', 'OCD', 'Panic disorder'],
    contraindications: ['MAO-I use within 14 days', 'Pimozide use', 'Disulfiram (oral solution)'],
    blackBoxWarning: 'Increased risk of suicidal thinking in children and young adults.',
    isControlled: false,
    cost: { generic: 10, brand: 350 }
  },
  'escitalopram': {
    id: 'escitalopram',
    brandName: 'Lexapro',
    genericName: 'Escitalopram',
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
    defaultDirections: 'Take 1 tablet by mouth once daily.',
    commonIndications: ['Depression', 'Generalized anxiety disorder'],
    contraindications: ['MAO-I use within 14 days', 'Pimozide use', 'QT prolongation'],
    blackBoxWarning: 'Increased risk of suicidal thinking in children and young adults.',
    isControlled: false,
    cost: { generic: 12, brand: 280 }
  },
  'lorazepam': {
    id: 'lorazepam',
    brandName: 'Ativan',
    genericName: 'Lorazepam',
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
    defaultDirections: 'Take 1 tablet by mouth 2-3 times daily as needed for anxiety.',
    commonIndications: ['Anxiety', 'Insomnia', 'Seizures', 'Alcohol withdrawal'],
    contraindications: ['Acute narrow-angle glaucoma', 'Severe respiratory insufficiency', 'Sleep apnea'],
    blackBoxWarning: 'Risk of abuse, misuse, addiction. Concomitant opioid use increases fatal overdose risk.',
    isControlled: true,
    requiresPriorAuth: true,
    cost: { generic: 15, brand: 120 }
  },

  // Respiratory
  'albuterol': {
    id: 'albuterol',
    brandName: 'ProAir/Ventolin',
    genericName: 'Albuterol',
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
    cost: { generic: 30, brand: 75 }
  },
  'prednisone': {
    id: 'prednisone',
    brandName: 'Deltasone',
    genericName: 'Prednisone',
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
    cost: { generic: 8, brand: 45 }
  },

  // Thyroid
  'levothyroxine': {
    id: 'levothyroxine',
    brandName: 'Synthroid',
    genericName: 'Levothyroxine',
    category: 'thyroid',
    schedule: 'RX',
    dosageForms: ['tablet'],
    strengths: ['25mcg', '50mcg', '75mcg', '88mcg', '100mcg', '112mcg', '125mcg', '150mcg', '175mcg', '200mcg'],
    defaultStrength: '50mcg',
    defaultForm: 'tablet',
    defaultQuantity: 30,
    defaultDaysSupply: 30,
    defaultRefills: 5,
    maxRefills: 11,
    defaultDirections: 'Take 1 tablet by mouth once daily on empty stomach, 30-60 min before breakfast.',
    commonIndications: ['Hypothyroidism', 'TSH suppression'],
    contraindications: ['Untreated adrenal insufficiency', 'Acute MI'],
    isControlled: false,
    cost: { generic: 15, brand: 85 }
  },

  // Controlled Substances
  'tramadol': {
    id: 'tramadol',
    brandName: 'Ultram',
    genericName: 'Tramadol',
    category: 'opioid',
    schedule: 'IV',
    dosageForms: ['tablet', 'capsule'],
    strengths: ['50mg', '100mg'],
    defaultStrength: '50mg',
    defaultForm: 'tablet',
    defaultQuantity: 30,
    defaultDaysSupply: 10,
    defaultRefills: 0,
    maxRefills: 5,
    defaultDirections: 'Take 1 tablet by mouth every 6 hours as needed for moderate pain.',
    commonIndications: ['Moderate to severe pain'],
    contraindications: ['MAO-I use', 'Severe respiratory depression', 'Acute intoxication'],
    blackBoxWarning: 'Risk of addiction, abuse, respiratory depression, and neonatal opioid withdrawal syndrome.',
    isControlled: true,
    cost: { generic: 20, brand: 180 }
  },
  'cyclobenzaprine': {
    id: 'cyclobenzaprine',
    brandName: 'Flexeril',
    genericName: 'Cyclobenzaprine',
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
    defaultDirections: 'Take 1 tablet by mouth three times daily as needed for muscle spasm.',
    commonIndications: ['Muscle spasm', 'Back pain', 'Neck pain'],
    contraindications: ['MAO-I use within 14 days', 'Arrhythmias', 'Heart block', 'Hyperthyroidism'],
    isControlled: false,
    cost: { generic: 12, brand: 150 }
  },

  // Vitamins & Supplements
  'vitamin-d3': {
    id: 'vitamin-d3',
    brandName: 'Vitamin D3',
    genericName: 'Cholecalciferol',
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
    defaultDirections: 'Take 1 capsule by mouth once daily with food.',
    commonIndications: ['Vitamin D deficiency', 'Osteoporosis prevention'],
    contraindications: ['Hypercalcemia', 'Hypervitaminosis D'],
    isControlled: false,
    cost: { generic: 10, brand: 25 }
  },
  'magnesium-oxide': {
    id: 'magnesium-oxide',
    brandName: 'Mag-Ox',
    genericName: 'Magnesium Oxide',
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
    defaultDirections: 'Take 1 capsule by mouth twice daily with food.',
    commonIndications: ['Magnesium deficiency', 'Migraine prophylaxis', 'Constipation'],
    contraindications: ['Renal impairment', 'Myasthenia gravis'],
    isControlled: false,
    cost: { generic: 8, brand: 15 }
  },
  'folic-acid': {
    id: 'folic-acid',
    brandName: 'Folic Acid',
    genericName: 'Folic Acid',
    category: 'vitamin',
    schedule: 'OTC',
    dosageForms: ['tablet'],
    strengths: ['400mcg', '800mcg', '1mg'],
    defaultStrength: '1mg',
    defaultForm: 'tablet',
    defaultQuantity: 30,
    defaultDaysSupply: 30,
    defaultRefills: 5,
    maxRefills: 11,
    defaultDirections: 'Take 1 tablet by mouth once daily.',
    commonIndications: ['Folate deficiency', 'Pregnancy', 'Methotrexate supplementation'],
    contraindications: ['Untreated B12 deficiency'],
    isControlled: false,
    cost: { generic: 5, brand: 12 }
  }
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
    clinicalEffect: 'Reduced contraceptive efficacy, risk of unintended pregnancy.',
    management: 'Use additional or alternative contraceptive methods. Consider higher estrogen dose.'
  },
  {
    id: 'nsaid-anticoagulant',
    drug1: 'ibuprofen',
    drug2: 'warfarin',
    severity: 'major',
    description: 'NSAIDs increase bleeding risk when combined with anticoagulants.',
    clinicalEffect: 'Increased risk of GI bleeding and other hemorrhagic events.',
    management: 'Avoid combination if possible. Use acetaminophen instead. Monitor INR closely.'
  },
  {
    id: 'ssri-triptan',
    drug1: 'sertraline',
    drug2: 'sumatriptan',
    severity: 'moderate',
    description: 'Serotonin syndrome risk when combining SSRIs with triptans.',
    clinicalEffect: 'Rare but potentially serious serotonin syndrome.',
    management: 'Use with caution. Educate patient on serotonin syndrome symptoms.'
  },
  {
    id: 'metformin-contrast',
    drug1: 'metformin',
    drug2: 'iodinated contrast',
    severity: 'major',
    description: 'Metformin should be held before and after iodinated contrast procedures.',
    clinicalEffect: 'Risk of contrast-induced nephropathy leading to lactic acidosis.',
    management: 'Hold metformin 48 hours before and after contrast. Check renal function before resuming.'
  },
  {
    id: 'ace-potassium',
    drug1: 'lisinopril',
    drug2: 'potassium supplements',
    severity: 'moderate',
    description: 'ACE inhibitors can cause hyperkalemia, especially with potassium supplementation.',
    clinicalEffect: 'Risk of dangerous hyperkalemia.',
    management: 'Monitor potassium levels. Avoid potassium supplements unless indicated.'
  },
  {
    id: 'fluoroquinolone-nsaid',
    drug1: 'ciprofloxacin',
    drug2: 'ibuprofen',
    severity: 'moderate',
    description: 'NSAIDs may increase seizure risk with fluoroquinolones.',
    clinicalEffect: 'Lowered seizure threshold, CNS stimulation.',
    management: 'Use with caution, especially in patients with seizure history.'
  },
  {
    id: 'benzo-opioid',
    drug1: 'lorazepam',
    drug2: 'tramadol',
    severity: 'contraindicated',
    description: 'Concomitant use of benzodiazepines and opioids increases risk of fatal overdose.',
    clinicalEffect: 'Profound sedation, respiratory depression, coma, death.',
    management: 'Avoid combination. If necessary, use lowest doses and shortest duration.'
  },
  {
    id: 'statin-azithromycin',
    drug1: 'atorvastatin',
    drug2: 'azithromycin',
    severity: 'minor',
    description: 'Macrolides may slightly increase statin levels.',
    clinicalEffect: 'Increased risk of myopathy/rhabdomyolysis.',
    management: 'Short courses generally safe. Monitor for muscle pain.'
  }
];

// =============================================================================
// Store State Interface
// =============================================================================

interface MedicationOrderingState {
  patientContext: PatientContext | null;
  selectedMedications: Map<string, SelectedMedication>;
  aiRecommendations: AIMedicationRecommendation[];
  isLoadingRecommendations: boolean;
  detectedInteractions: DrugInteraction[];
  allergyAlerts: { medication: string; allergy: DrugAllergy; crossReactivity: boolean }[];
  searchQuery: string;
  categoryFilter: DrugCategory | 'all';
  preferredPharmacy: PharmacyInfo | null;
  loading: boolean;
  submitting: boolean;
  error: string | null;
  lastSubmittedRxIds: string[];
  
  // Actions
  setPatientContext: (context: PatientContext) => void;
  addMedication: (medId: string, options?: Partial<Omit<SelectedMedication, 'medication'>>) => void;
  removeMedication: (medId: string) => void;
  updateMedication: (medId: string, updates: Partial<SelectedMedication>) => void;
  setSearchQuery: (query: string) => void;
  setCategoryFilter: (category: DrugCategory | 'all') => void;
  setPreferredPharmacy: (pharmacy: PharmacyInfo) => void;
  generateAIRecommendations: () => Promise<void>;
  addAIRecommendedMedication: (medId: string, priority: PrescriptionPriority, rationale: string) => void;
  checkInteractions: () => void;
  checkAllergies: (medId: string) => void;
  submitPrescriptions: (encounterId: string) => Promise<string[]>;
  clearOrder: () => void;
  
  // Computed
  getSelectedMedicationsArray: () => SelectedMedication[];
  getFilteredCatalog: () => Medication[];
  getTotalCost: () => { generic: number; brand: number };
  getControlledCount: () => number;
  hasBlackBoxWarnings: () => boolean;
}

// =============================================================================
// BioMistral AI Medication Recommendation Generator
// =============================================================================

async function generateBioMistralMedicationRecommendations(
  patientContext: PatientContext
): Promise<AIMedicationRecommendation[]> {
  const recommendations: AIMedicationRecommendation[] = [];
  const complaint = patientContext.chiefComplaint.toLowerCase();
  const hasPregnancy = patientContext.pregnant;
  
  // ==========================================================================
  // MIGRAINE / HEADACHE
  // ==========================================================================
  if (complaint.includes('migraine') || complaint.includes('headache')) {
    // Acute treatment
    recommendations.push({
      id: 'rec_sumatriptan',
      medicationId: 'sumatriptan',
      medicationName: 'Sumatriptan 100mg',
      category: 'migraine',
      priority: 'ROUTINE',
      rationale: 'First-line abortive therapy for acute migraine. Triptans are most effective when taken early in migraine attack.',
      clinicalEvidence: [
        'Level A evidence for acute migraine treatment',
        'NNT of 4-5 for pain relief at 2 hours',
        'Most studied triptan with established safety profile'
      ],
      confidence: 0.92,
      recommendationType: 'first-line',
      dosageRecommendation: '50-100mg at onset, may repeat in 2 hours. Max 200mg/day.',
      monitoringRequired: ['Cardiovascular symptoms', 'Serotonin syndrome if on SSRI']
    });

    // Alternative triptan
    recommendations.push({
      id: 'rec_rizatriptan',
      medicationId: 'rizatriptan',
      medicationName: 'Rizatriptan 10mg',
      category: 'migraine',
      priority: 'ROUTINE',
      rationale: 'Alternative triptan with faster onset. May be preferred for patients who need rapid relief.',
      clinicalEvidence: [
        'Faster onset than sumatriptan (30 min vs 60 min)',
        'ODT formulation available for nausea'
      ],
      confidence: 0.85,
      recommendationType: 'alternative'
    });

    // Prophylaxis if frequent
    if (complaint.includes('frequent') || complaint.includes('chronic') || complaint.includes('daily')) {
      recommendations.push({
        id: 'rec_topiramate',
        medicationId: 'topiramate',
        medicationName: 'Topiramate 25-50mg BID',
        category: 'anticonvulsant',
        priority: 'ROUTINE',
        rationale: 'First-line prophylactic therapy for frequent migraines. Also aids weight loss.',
        clinicalEvidence: [
          'Level A evidence for migraine prevention',
          '50% reduction in headache frequency in clinical trials',
          'Side effects: cognitive dulling, paresthesias, weight loss'
        ],
        confidence: 0.88,
        recommendationType: 'first-line',
        dosageRecommendation: 'Start 25mg qHS, titrate by 25mg weekly to 50mg BID.',
        warningMessage: hasPregnancy ? 'CONTRAINDICATED IN PREGNANCY - teratogenic risk' : undefined,
        monitoringRequired: ['Kidney stones', 'Metabolic acidosis', 'Cognitive function']
      });

      recommendations.push({
        id: 'rec_magnesium',
        medicationId: 'magnesium-oxide',
        medicationName: 'Magnesium Oxide 400mg',
        category: 'vitamin',
        priority: 'ROUTINE',
        rationale: 'Evidence-based supplement for migraine prophylaxis. Well-tolerated adjunct therapy.',
        clinicalEvidence: [
          'Level B evidence for prevention',
          'Particularly effective in menstrual migraine',
          'Few drug interactions'
        ],
        confidence: 0.78,
        recommendationType: 'adjunct',
        dosageRecommendation: '400-500mg daily with food'
      });
    }

    // Anti-nausea
    recommendations.push({
      id: 'rec_ondansetron',
      medicationId: 'ondansetron',
      medicationName: 'Ondansetron 4mg',
      category: 'antihistamine',
      priority: 'ROUTINE',
      rationale: 'For nausea associated with migraine. May improve triptan absorption.',
      clinicalEvidence: [
        'Effective antiemetic',
        'Can be used sublingually if vomiting'
      ],
      confidence: 0.75,
      recommendationType: 'adjunct'
    });

    // NSAIDs to avoid
    recommendations.push({
      id: 'rec_nsaid_warning',
      medicationId: 'ibuprofen',
      medicationName: 'NSAIDs (Ibuprofen)',
      category: 'nsaid',
      priority: 'ROUTINE',
      rationale: 'May be used for mild-moderate headache, but frequent use can cause medication overuse headache.',
      clinicalEvidence: [
        'Effective for mild-moderate migraine',
        'Risk of MOH if used >15 days/month',
        'GI and CV risks with chronic use'
      ],
      confidence: 0.70,
      recommendationType: 'alternative',
      warningMessage: 'Limit use to <10-15 days/month to avoid medication overuse headache'
    });
  }

  // ==========================================================================
  // INFECTION
  // ==========================================================================
  if (complaint.includes('infection') || complaint.includes('fever') || complaint.includes('cough')) {
    if (complaint.includes('uti') || complaint.includes('urinary')) {
      recommendations.push({
        id: 'rec_cipro_uti',
        medicationId: 'ciprofloxacin',
        medicationName: 'Ciprofloxacin 500mg',
        category: 'antibiotic',
        priority: 'ROUTINE',
        rationale: 'Fluoroquinolone for complicated UTI. Reserve for resistant organisms.',
        clinicalEvidence: [
          'Broad gram-negative coverage',
          'Reserve for complicated/resistant cases'
        ],
        confidence: 0.75,
        recommendationType: 'alternative',
        warningMessage: 'Black box warning: tendinitis, neuropathy. Use only if no alternatives.'
      });
    }

    if (complaint.includes('respiratory') || complaint.includes('bronchitis') || complaint.includes('pneumonia')) {
      recommendations.push({
        id: 'rec_azithromycin',
        medicationId: 'azithromycin',
        medicationName: 'Azithromycin Z-Pack',
        category: 'antibiotic',
        priority: 'ROUTINE',
        rationale: 'Macrolide antibiotic for community-acquired respiratory infections.',
        clinicalEvidence: [
          'Coverage of atypical pathogens',
          'Simple 5-day dosing improves compliance',
          'Consider if penicillin allergy'
        ],
        confidence: 0.82,
        recommendationType: 'first-line',
        dosageRecommendation: '500mg day 1, then 250mg days 2-5'
      });

      recommendations.push({
        id: 'rec_amoxicillin',
        medicationId: 'amoxicillin',
        medicationName: 'Amoxicillin 500mg',
        category: 'antibiotic',
        priority: 'ROUTINE',
        rationale: 'First-line for strep pharyngitis and uncomplicated sinusitis.',
        clinicalEvidence: [
          'First-line for strep throat',
          'Good compliance with TID dosing'
        ],
        confidence: 0.85,
        recommendationType: 'first-line'
      });
    }
  }

  // ==========================================================================
  // PAIN
  // ==========================================================================
  if (complaint.includes('pain') && !complaint.includes('headache')) {
    recommendations.push({
      id: 'rec_ibuprofen_pain',
      medicationId: 'ibuprofen',
      medicationName: 'Ibuprofen 400-800mg',
      category: 'nsaid',
      priority: 'ROUTINE',
      rationale: 'First-line for mild-moderate inflammatory pain.',
      clinicalEvidence: [
        'Effective anti-inflammatory',
        'Take with food to reduce GI upset'
      ],
      confidence: 0.88,
      recommendationType: 'first-line'
    });

    recommendations.push({
      id: 'rec_acetaminophen_pain',
      medicationId: 'acetaminophen',
      medicationName: 'Acetaminophen 500-1000mg',
      category: 'analgesic',
      priority: 'ROUTINE',
      rationale: 'First-line for pain in patients who cannot take NSAIDs.',
      clinicalEvidence: [
        'Safe in pregnancy',
        'No GI or CV risks',
        'Watch for hepatotoxicity with high doses'
      ],
      confidence: 0.85,
      recommendationType: 'first-line'
    });

    if (complaint.includes('severe') || complaint.includes('back') || complaint.includes('muscle')) {
      recommendations.push({
        id: 'rec_cyclobenzaprine',
        medicationId: 'cyclobenzaprine',
        medicationName: 'Cyclobenzaprine 10mg',
        category: 'muscle-relaxant',
        priority: 'ROUTINE',
        rationale: 'Muscle relaxant for acute musculoskeletal pain with spasm.',
        clinicalEvidence: [
          'Short-term use only (2-3 weeks)',
          'Causes drowsiness - good for nighttime dosing'
        ],
        confidence: 0.78,
        recommendationType: 'adjunct',
        dosageRecommendation: '10mg TID or 10mg qHS for 7-10 days'
      });
    }
  }

  // ==========================================================================
  // ANXIETY / DEPRESSION
  // ==========================================================================
  if (complaint.includes('anxiety') || complaint.includes('depression') || complaint.includes('stress')) {
    recommendations.push({
      id: 'rec_sertraline',
      medicationId: 'sertraline',
      medicationName: 'Sertraline 50mg',
      category: 'antidepressant',
      priority: 'ROUTINE',
      rationale: 'First-line SSRI for depression and anxiety disorders.',
      clinicalEvidence: [
        'Well-tolerated SSRI',
        'Effective for depression, GAD, panic, PTSD, OCD',
        'May take 4-6 weeks for full effect'
      ],
      confidence: 0.90,
      recommendationType: 'first-line',
      dosageRecommendation: 'Start 50mg daily, may increase to 100-200mg',
      monitoringRequired: ['Suicidal ideation in young adults', 'Serotonin syndrome', 'Bleeding risk']
    });

    recommendations.push({
      id: 'rec_escitalopram',
      medicationId: 'escitalopram',
      medicationName: 'Escitalopram 10mg',
      category: 'antidepressant',
      priority: 'ROUTINE',
      rationale: 'Alternative first-line SSRI with fewest drug interactions.',
      clinicalEvidence: [
        'Most selective SSRI',
        'Fewer drug interactions than sertraline'
      ],
      confidence: 0.88,
      recommendationType: 'alternative'
    });
  }

  // Sort recommendations
  const typeOrder = { 'first-line': 0, 'alternative': 1, 'adjunct': 2, 'avoid': 3 };
  recommendations.sort((a, b) => typeOrder[a.recommendationType] - typeOrder[b.recommendationType]);

  return recommendations;
}

// =============================================================================
// Store Implementation
// =============================================================================

export const useMedicationOrderingStore = create<MedicationOrderingState>()(
  devtools(
    immer((set, get) => ({
      patientContext: null,
      selectedMedications: new Map(),
      aiRecommendations: [],
      isLoadingRecommendations: false,
      detectedInteractions: [],
      allergyAlerts: [],
      searchQuery: '',
      categoryFilter: 'all',
      preferredPharmacy: null,
      loading: false,
      submitting: false,
      error: null,
      lastSubmittedRxIds: [],

      setPatientContext: (context) => {
        set(state => {
          state.patientContext = context;
        });
        get().generateAIRecommendations();
      },

      addMedication: (medId, options = {}) => {
        const med = MEDICATION_CATALOG[medId];
        if (!med) {
          console.warn(`Medication ${medId} not found in catalog`);
          return;
        }

        // Check allergies
        get().checkAllergies(medId);

        set(state => {
          state.selectedMedications.set(medId, {
            medication: med,
            strength: options.strength || med.defaultStrength,
            form: options.form || med.defaultForm,
            quantity: options.quantity || med.defaultQuantity,
            daysSupply: options.daysSupply || med.defaultDaysSupply,
            refills: options.refills ?? med.defaultRefills,
            directions: options.directions || med.defaultDirections,
            indication: options.indication || '',
            priority: options.priority || 'ROUTINE',
            dispenseAsWritten: options.dispenseAsWritten || false,
            aiRecommended: options.aiRecommended || false,
            rationale: options.rationale
          });
        });

        // Check interactions after adding
        get().checkInteractions();
      },

      removeMedication: (medId) => {
        set(state => {
          state.selectedMedications.delete(medId);
          // Remove related allergy alerts
          state.allergyAlerts = state.allergyAlerts.filter(a => a.medication !== medId);
        });
        get().checkInteractions();
      },

      updateMedication: (medId, updates) => {
        set(state => {
          const existing = state.selectedMedications.get(medId);
          if (existing) {
            state.selectedMedications.set(medId, { ...existing, ...updates });
          }
        });
      },

      setSearchQuery: (query) => set({ searchQuery: query }),
      setCategoryFilter: (category) => set({ categoryFilter: category }),
      setPreferredPharmacy: (pharmacy) => set({ preferredPharmacy: pharmacy }),

      generateAIRecommendations: async () => {
        const { patientContext } = get();
        if (!patientContext) return;

        set({ isLoadingRecommendations: true });

        try {
          await new Promise(resolve => setTimeout(resolve, 800));
          const recommendations = await generateBioMistralMedicationRecommendations(patientContext);
          set({ aiRecommendations: recommendations, isLoadingRecommendations: false });
        } catch (error) {
          console.error('Failed to generate medication recommendations:', error);
          set({ isLoadingRecommendations: false, error: 'Failed to generate recommendations' });
        }
      },

      addAIRecommendedMedication: (medId, priority, rationale) => {
        get().addMedication(medId, { priority, rationale, aiRecommended: true });
      },

      checkInteractions: () => {
        const { selectedMedications, patientContext } = get();
        const selectedIds = Array.from(selectedMedications.keys());
        const allMeds = [...selectedIds, ...(patientContext?.currentMedications || [])];
        
        const detected: DrugInteraction[] = [];
        
        for (const interaction of DRUG_INTERACTIONS) {
          const hasDrug1 = allMeds.some(m => 
            m.toLowerCase().includes(interaction.drug1.toLowerCase()) ||
            interaction.drug1.toLowerCase().includes(m.toLowerCase())
          );
          const hasDrug2 = allMeds.some(m => 
            m.toLowerCase().includes(interaction.drug2.toLowerCase()) ||
            interaction.drug2.toLowerCase().includes(m.toLowerCase())
          );
          
          if (hasDrug1 && hasDrug2) {
            detected.push(interaction);
          }
        }
        
        set({ detectedInteractions: detected });
      },

      checkAllergies: (medId) => {
        const { patientContext, allergyAlerts } = get();
        if (!patientContext) return;

        const med = MEDICATION_CATALOG[medId];
        if (!med) return;

        const newAlerts: typeof allergyAlerts = [];

        for (const allergy of patientContext.allergies) {
          // Direct match
          if (
            med.genericName.toLowerCase().includes(allergy.allergen.toLowerCase()) ||
            med.brandName.toLowerCase().includes(allergy.allergen.toLowerCase())
          ) {
            newAlerts.push({ medication: medId, allergy, crossReactivity: false });
          }
          
          // Cross-reactivity checks
          if (allergy.crossReactivity) {
            for (const crossReactive of allergy.crossReactivity) {
              if (
                med.genericName.toLowerCase().includes(crossReactive.toLowerCase()) ||
                med.category === crossReactive.toLowerCase()
              ) {
                newAlerts.push({ medication: medId, allergy, crossReactivity: true });
              }
            }
          }
          
          // Penicillin/cephalosporin cross-reactivity
          if (allergy.allergen.toLowerCase() === 'penicillin') {
            if (med.genericName.toLowerCase().includes('amoxicillin') ||
                med.genericName.toLowerCase().includes('ampicillin') ||
                med.category === 'antibiotic' && med.genericName.toLowerCase().includes('cillin')) {
              newAlerts.push({ medication: medId, allergy, crossReactivity: false });
            }
          }
        }

        if (newAlerts.length > 0) {
          set(state => {
            state.allergyAlerts = [...state.allergyAlerts.filter(a => a.medication !== medId), ...newAlerts];
          });
        }
      },

      submitPrescriptions: async (encounterId) => {
        const { selectedMedications, preferredPharmacy } = get();
        
        if (selectedMedications.size === 0) {
          throw new Error('No medications selected');
        }
        
        set({ submitting: true, error: null });
        
        try {
          const rxIds: string[] = [];
          
          for (const [id, selectedMed] of selectedMedications.entries()) {
            const response = await fetch('/api/prescriptions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                encounterId,
                medicationName: selectedMed.medication.genericName,
                brandName: selectedMed.medication.brandName,
                strength: selectedMed.strength,
                form: selectedMed.form,
                quantity: selectedMed.quantity,
                daysSupply: selectedMed.daysSupply,
                refills: selectedMed.refills,
                directions: selectedMed.directions,
                indication: selectedMed.indication,
                dispenseAsWritten: selectedMed.dispenseAsWritten,
                pharmacyId: preferredPharmacy?.id,
                isControlled: selectedMed.medication.isControlled,
                schedule: selectedMed.medication.schedule
              })
            });
            
            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.error || 'Failed to submit prescription');
            }
            
            const result = await response.json();
            rxIds.push(result.id);
          }
          
          set(state => {
            state.submitting = false;
            state.lastSubmittedRxIds = rxIds;
          });
          
          get().clearOrder();
          return rxIds;
        } catch (error) {
          set(state => {
            state.submitting = false;
            state.error = error instanceof Error ? error.message : 'Failed to submit prescriptions';
          });
          throw error;
        }
      },

      clearOrder: () => set(state => {
        state.selectedMedications = new Map();
        state.detectedInteractions = [];
        state.allergyAlerts = [];
        state.error = null;
      }),

      getSelectedMedicationsArray: () => Array.from(get().selectedMedications.values()),

      getFilteredCatalog: () => {
        const { searchQuery, categoryFilter } = get();
        const query = searchQuery.toLowerCase();
        
        return Object.values(MEDICATION_CATALOG).filter(med => {
          if (categoryFilter !== 'all' && med.category !== categoryFilter) return false;
          if (query) {
            return (
              med.brandName.toLowerCase().includes(query) ||
              med.genericName.toLowerCase().includes(query) ||
              med.commonIndications.some(i => i.toLowerCase().includes(query))
            );
          }
          return true;
        });
      },

      getTotalCost: () => {
        const meds = get().getSelectedMedicationsArray();
        return meds.reduce(
          (sum, m) => ({
            generic: sum.generic + m.medication.cost.generic,
            brand: sum.brand + m.medication.cost.brand
          }),
          { generic: 0, brand: 0 }
        );
      },

      getControlledCount: () => {
        return get().getSelectedMedicationsArray().filter(m => m.medication.isControlled).length;
      },

      hasBlackBoxWarnings: () => {
        return get().getSelectedMedicationsArray().some(m => m.medication.blackBoxWarning);
      }
    })),
    { name: 'medication-ordering-store' }
  )
);

export default useMedicationOrderingStore;
