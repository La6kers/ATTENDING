// ============================================================
// Medications Catalog
// apps/shared/catalogs/medications.ts
//
// Comprehensive medication database - extracted from stores
// ============================================================

import type { Medication, DrugInteraction, DrugCategory } from './types';

// =============================================================================
// Medications Database
// =============================================================================

export const MEDICATION_CATALOG: Record<string, Medication> = {
  // ANALGESICS & NSAIDs
  'acetaminophen': {
    id: 'acetaminophen', brandName: 'Tylenol', genericName: 'Acetaminophen',
    category: 'analgesic', schedule: 'OTC',
    dosageForms: ['tablet', 'capsule', 'liquid'],
    strengths: ['325mg', '500mg', '650mg', '1000mg'],
    defaultStrength: '500mg', defaultForm: 'tablet',
    defaultQuantity: 100, defaultDaysSupply: 30, defaultRefills: 3, maxRefills: 11,
    defaultDirections: 'Take 1-2 tablets every 4-6 hours as needed. Max 4000mg/day.',
    commonIndications: ['Pain', 'Fever', 'Headache'],
    contraindications: ['Severe hepatic impairment', 'Alcohol use disorder'],
    isControlled: false, cost: { generic: 8, brand: 15 }
  },
  'ibuprofen': {
    id: 'ibuprofen', brandName: 'Motrin/Advil', genericName: 'Ibuprofen',
    category: 'nsaid', schedule: 'OTC',
    dosageForms: ['tablet', 'capsule', 'liquid'],
    strengths: ['200mg', '400mg', '600mg', '800mg'],
    defaultStrength: '400mg', defaultForm: 'tablet',
    defaultQuantity: 90, defaultDaysSupply: 30, defaultRefills: 3, maxRefills: 11,
    defaultDirections: 'Take 1 tablet every 6-8 hours as needed with food.',
    commonIndications: ['Pain', 'Inflammation', 'Fever', 'Headache', 'Arthritis'],
    contraindications: ['GI bleeding', 'Renal impairment', 'Third trimester pregnancy'],
    blackBoxWarning: 'NSAIDs may increase risk of CV events and GI bleeding.',
    pregnancyCategory: 'D (third trimester)',
    isControlled: false, cost: { generic: 10, brand: 18 }
  },
  'naproxen': {
    id: 'naproxen', brandName: 'Aleve/Naprosyn', genericName: 'Naproxen',
    category: 'nsaid', schedule: 'RX',
    dosageForms: ['tablet', 'capsule'],
    strengths: ['220mg', '250mg', '375mg', '500mg'],
    defaultStrength: '500mg', defaultForm: 'tablet',
    defaultQuantity: 60, defaultDaysSupply: 30, defaultRefills: 3, maxRefills: 11,
    defaultDirections: 'Take 1 tablet twice daily with food.',
    commonIndications: ['Pain', 'Inflammation', 'Arthritis', 'Dysmenorrhea'],
    contraindications: ['GI bleeding', 'Renal impairment', 'Aspirin allergy'],
    blackBoxWarning: 'NSAIDs may increase risk of CV events and GI bleeding.',
    isControlled: false, cost: { generic: 12, brand: 25 }
  },

  // MIGRAINE MEDICATIONS
  'sumatriptan': {
    id: 'sumatriptan', brandName: 'Imitrex', genericName: 'Sumatriptan',
    category: 'migraine', schedule: 'RX',
    dosageForms: ['tablet', 'injection', 'spray'],
    strengths: ['25mg', '50mg', '100mg'],
    defaultStrength: '100mg', defaultForm: 'tablet',
    defaultQuantity: 9, defaultDaysSupply: 30, defaultRefills: 5, maxRefills: 5,
    defaultDirections: 'Take 1 tablet at migraine onset. May repeat in 2 hours. Max 200mg/day.',
    commonIndications: ['Migraine', 'Cluster headache'],
    contraindications: ['CAD', 'Uncontrolled HTN', 'Hemiplegic migraine', 'MAO-I use'],
    isControlled: false, cost: { generic: 35, brand: 280 }
  },
  'rizatriptan': {
    id: 'rizatriptan', brandName: 'Maxalt', genericName: 'Rizatriptan',
    category: 'migraine', schedule: 'RX',
    dosageForms: ['tablet'],
    strengths: ['5mg', '10mg'],
    defaultStrength: '10mg', defaultForm: 'tablet',
    defaultQuantity: 12, defaultDaysSupply: 30, defaultRefills: 5, maxRefills: 5,
    defaultDirections: 'Take 1 tablet at migraine onset. May repeat in 2 hours. Max 30mg/day.',
    commonIndications: ['Migraine'],
    contraindications: ['CAD', 'Uncontrolled HTN', 'MAO-I use'],
    isControlled: false, cost: { generic: 40, brand: 350 }
  },
  'topiramate': {
    id: 'topiramate', brandName: 'Topamax', genericName: 'Topiramate',
    category: 'anticonvulsant', schedule: 'RX',
    dosageForms: ['tablet', 'capsule'],
    strengths: ['25mg', '50mg', '100mg', '200mg'],
    defaultStrength: '25mg', defaultForm: 'tablet',
    defaultQuantity: 60, defaultDaysSupply: 30, defaultRefills: 5, maxRefills: 5,
    defaultDirections: 'Take 25mg at bedtime. Titrate by 25mg weekly to 50mg BID.',
    commonIndications: ['Migraine prophylaxis', 'Epilepsy', 'Weight loss'],
    contraindications: ['Metabolic acidosis', 'Kidney stones', 'Pregnancy'],
    blackBoxWarning: 'Increased risk of oral clefts in exposed infants.',
    pregnancyCategory: 'D',
    isControlled: false, cost: { generic: 15, brand: 450 }
  },

  // ANTIBIOTICS
  'amoxicillin': {
    id: 'amoxicillin', brandName: 'Amoxil', genericName: 'Amoxicillin',
    category: 'antibiotic', schedule: 'RX',
    dosageForms: ['capsule', 'tablet', 'liquid'],
    strengths: ['250mg', '500mg', '875mg'],
    defaultStrength: '500mg', defaultForm: 'capsule',
    defaultQuantity: 21, defaultDaysSupply: 7, defaultRefills: 0, maxRefills: 0,
    defaultDirections: 'Take 1 capsule three times daily for 7 days.',
    commonIndications: ['URI', 'UTI', 'Skin infection', 'Dental infection'],
    contraindications: ['Penicillin allergy', 'Mononucleosis'],
    isControlled: false, cost: { generic: 8, brand: 45 }
  },
  'azithromycin': {
    id: 'azithromycin', brandName: 'Zithromax', genericName: 'Azithromycin',
    category: 'antibiotic', schedule: 'RX',
    dosageForms: ['tablet', 'liquid'],
    strengths: ['250mg', '500mg'],
    defaultStrength: '250mg', defaultForm: 'tablet',
    defaultQuantity: 6, defaultDaysSupply: 5, defaultRefills: 0, maxRefills: 0,
    defaultDirections: 'Take 2 tablets (500mg) day 1, then 1 tablet daily days 2-5.',
    commonIndications: ['Respiratory infection', 'Skin infection', 'STI'],
    contraindications: ['Macrolide allergy', 'QT prolongation'],
    isControlled: false, cost: { generic: 12, brand: 85 }
  },
  'ciprofloxacin': {
    id: 'ciprofloxacin', brandName: 'Cipro', genericName: 'Ciprofloxacin',
    category: 'antibiotic', schedule: 'RX',
    dosageForms: ['tablet'],
    strengths: ['250mg', '500mg', '750mg'],
    defaultStrength: '500mg', defaultForm: 'tablet',
    defaultQuantity: 14, defaultDaysSupply: 7, defaultRefills: 0, maxRefills: 0,
    defaultDirections: 'Take 1 tablet twice daily for 7 days.',
    commonIndications: ['UTI', 'Prostatitis', 'GI infection'],
    contraindications: ['Fluoroquinolone allergy', 'Myasthenia gravis', 'QT prolongation'],
    blackBoxWarning: 'Risk of tendinitis, tendon rupture, peripheral neuropathy.',
    isControlled: false, cost: { generic: 15, brand: 180 }
  },
  'doxycycline': {
    id: 'doxycycline', brandName: 'Vibramycin', genericName: 'Doxycycline',
    category: 'antibiotic', schedule: 'RX',
    dosageForms: ['capsule', 'tablet'],
    strengths: ['50mg', '100mg'],
    defaultStrength: '100mg', defaultForm: 'capsule',
    defaultQuantity: 14, defaultDaysSupply: 7, defaultRefills: 0, maxRefills: 0,
    defaultDirections: 'Take 1 capsule twice daily with food and full glass of water.',
    commonIndications: ['Acne', 'Respiratory infection', 'STI', 'Lyme disease'],
    contraindications: ['Tetracycline allergy', 'Pregnancy', 'Children <8 years'],
    isControlled: false, cost: { generic: 20, brand: 250 }
  },

  // CARDIOVASCULAR
  'lisinopril': {
    id: 'lisinopril', brandName: 'Prinivil/Zestril', genericName: 'Lisinopril',
    category: 'antihypertensive', schedule: 'RX',
    dosageForms: ['tablet'],
    strengths: ['2.5mg', '5mg', '10mg', '20mg', '40mg'],
    defaultStrength: '10mg', defaultForm: 'tablet',
    defaultQuantity: 30, defaultDaysSupply: 30, defaultRefills: 5, maxRefills: 11,
    defaultDirections: 'Take 1 tablet once daily.',
    commonIndications: ['Hypertension', 'Heart failure', 'Diabetic nephropathy'],
    contraindications: ['ACE-I allergy', 'Angioedema history', 'Pregnancy'],
    blackBoxWarning: 'Can cause fetal harm when administered to pregnant women.',
    pregnancyCategory: 'D',
    isControlled: false, cost: { generic: 8, brand: 120 }
  },
  'amlodipine': {
    id: 'amlodipine', brandName: 'Norvasc', genericName: 'Amlodipine',
    category: 'antihypertensive', schedule: 'RX',
    dosageForms: ['tablet'],
    strengths: ['2.5mg', '5mg', '10mg'],
    defaultStrength: '5mg', defaultForm: 'tablet',
    defaultQuantity: 30, defaultDaysSupply: 30, defaultRefills: 5, maxRefills: 11,
    defaultDirections: 'Take 1 tablet once daily.',
    commonIndications: ['Hypertension', 'Angina'],
    contraindications: ['Severe aortic stenosis', 'Hypersensitivity'],
    isControlled: false, cost: { generic: 10, brand: 150 }
  },
  'metoprolol': {
    id: 'metoprolol', brandName: 'Lopressor/Toprol-XL', genericName: 'Metoprolol',
    category: 'antihypertensive', schedule: 'RX',
    dosageForms: ['tablet'],
    strengths: ['25mg', '50mg', '100mg', '200mg'],
    defaultStrength: '25mg', defaultForm: 'tablet',
    defaultQuantity: 60, defaultDaysSupply: 30, defaultRefills: 5, maxRefills: 11,
    defaultDirections: 'Take 1 tablet twice daily.',
    commonIndications: ['Hypertension', 'Angina', 'Heart failure', 'Migraine prophylaxis'],
    contraindications: ['Sinus bradycardia', 'Heart block', 'Cardiogenic shock'],
    isControlled: false, cost: { generic: 8, brand: 85 }
  },
  'atorvastatin': {
    id: 'atorvastatin', brandName: 'Lipitor', genericName: 'Atorvastatin',
    category: 'lipid-lowering', schedule: 'RX',
    dosageForms: ['tablet'],
    strengths: ['10mg', '20mg', '40mg', '80mg'],
    defaultStrength: '20mg', defaultForm: 'tablet',
    defaultQuantity: 30, defaultDaysSupply: 30, defaultRefills: 5, maxRefills: 11,
    defaultDirections: 'Take 1 tablet once daily at bedtime.',
    commonIndications: ['Hyperlipidemia', 'ASCVD prevention'],
    contraindications: ['Active liver disease', 'Pregnancy', 'Breastfeeding'],
    pregnancyCategory: 'X',
    isControlled: false, cost: { generic: 12, brand: 280 }
  },

  // DIABETES
  'metformin': {
    id: 'metformin', brandName: 'Glucophage', genericName: 'Metformin',
    category: 'antidiabetic', schedule: 'RX',
    dosageForms: ['tablet'],
    strengths: ['500mg', '850mg', '1000mg'],
    defaultStrength: '500mg', defaultForm: 'tablet',
    defaultQuantity: 60, defaultDaysSupply: 30, defaultRefills: 5, maxRefills: 11,
    defaultDirections: 'Take 1 tablet twice daily with meals.',
    commonIndications: ['Type 2 diabetes', 'Prediabetes', 'PCOS'],
    contraindications: ['Renal impairment (GFR <30)', 'Metabolic acidosis'],
    blackBoxWarning: 'Lactic acidosis risk with renal impairment.',
    isControlled: false, cost: { generic: 8, brand: 180 }
  },

  // GI MEDICATIONS
  'omeprazole': {
    id: 'omeprazole', brandName: 'Prilosec', genericName: 'Omeprazole',
    category: 'proton-pump-inhibitor', schedule: 'RX',
    dosageForms: ['capsule', 'tablet'],
    strengths: ['10mg', '20mg', '40mg'],
    defaultStrength: '20mg', defaultForm: 'capsule',
    defaultQuantity: 30, defaultDaysSupply: 30, defaultRefills: 3, maxRefills: 5,
    defaultDirections: 'Take 1 capsule 30 minutes before breakfast.',
    commonIndications: ['GERD', 'Peptic ulcer', 'NSAID gastroprotection'],
    contraindications: ['PPI allergy', 'Rilpivirine use'],
    isControlled: false, cost: { generic: 15, brand: 220 }
  },
  'ondansetron': {
    id: 'ondansetron', brandName: 'Zofran', genericName: 'Ondansetron',
    category: 'antihistamine', schedule: 'RX',
    dosageForms: ['tablet', 'liquid'],
    strengths: ['4mg', '8mg'],
    defaultStrength: '4mg', defaultForm: 'tablet',
    defaultQuantity: 20, defaultDaysSupply: 10, defaultRefills: 2, maxRefills: 5,
    defaultDirections: 'Take 1 tablet every 8 hours as needed for nausea.',
    commonIndications: ['Nausea', 'Vomiting'],
    contraindications: ['Hypersensitivity', 'Congenital long QT'],
    isControlled: false, cost: { generic: 25, brand: 180 }
  },

  // PSYCHIATRIC
  'sertraline': {
    id: 'sertraline', brandName: 'Zoloft', genericName: 'Sertraline',
    category: 'antidepressant', schedule: 'RX',
    dosageForms: ['tablet'],
    strengths: ['25mg', '50mg', '100mg'],
    defaultStrength: '50mg', defaultForm: 'tablet',
    defaultQuantity: 30, defaultDaysSupply: 30, defaultRefills: 5, maxRefills: 5,
    defaultDirections: 'Take 1 tablet once daily.',
    commonIndications: ['Depression', 'Anxiety', 'PTSD', 'OCD', 'Panic disorder'],
    contraindications: ['MAO-I use within 14 days', 'Pimozide use'],
    blackBoxWarning: 'Increased risk of suicidal thinking in youth.',
    isControlled: false, cost: { generic: 10, brand: 350 }
  },
  'escitalopram': {
    id: 'escitalopram', brandName: 'Lexapro', genericName: 'Escitalopram',
    category: 'antidepressant', schedule: 'RX',
    dosageForms: ['tablet'],
    strengths: ['5mg', '10mg', '20mg'],
    defaultStrength: '10mg', defaultForm: 'tablet',
    defaultQuantity: 30, defaultDaysSupply: 30, defaultRefills: 5, maxRefills: 5,
    defaultDirections: 'Take 1 tablet once daily.',
    commonIndications: ['Depression', 'Generalized anxiety'],
    contraindications: ['MAO-I use within 14 days', 'QT prolongation'],
    blackBoxWarning: 'Increased risk of suicidal thinking in youth.',
    isControlled: false, cost: { generic: 12, brand: 280 }
  },
  'lorazepam': {
    id: 'lorazepam', brandName: 'Ativan', genericName: 'Lorazepam',
    category: 'anxiolytic', schedule: 'IV',
    dosageForms: ['tablet', 'injection'],
    strengths: ['0.5mg', '1mg', '2mg'],
    defaultStrength: '0.5mg', defaultForm: 'tablet',
    defaultQuantity: 30, defaultDaysSupply: 30, defaultRefills: 0, maxRefills: 5,
    defaultDirections: 'Take 1 tablet 2-3 times daily as needed.',
    commonIndications: ['Anxiety', 'Insomnia', 'Seizures', 'Alcohol withdrawal'],
    contraindications: ['Acute narrow-angle glaucoma', 'Respiratory insufficiency'],
    blackBoxWarning: 'Risk of abuse. Opioid combination increases overdose risk.',
    isControlled: true, requiresPriorAuth: true,
    cost: { generic: 15, brand: 120 }
  },

  // RESPIRATORY
  'albuterol': {
    id: 'albuterol', brandName: 'ProAir/Ventolin', genericName: 'Albuterol',
    category: 'bronchodilator', schedule: 'RX',
    dosageForms: ['inhaler'],
    strengths: ['90mcg/actuation'],
    defaultStrength: '90mcg/actuation', defaultForm: 'inhaler',
    defaultQuantity: 1, defaultDaysSupply: 30, defaultRefills: 5, maxRefills: 11,
    defaultDirections: 'Inhale 1-2 puffs every 4-6 hours as needed.',
    commonIndications: ['Asthma', 'COPD', 'Bronchospasm'],
    contraindications: ['Hypersensitivity'],
    isControlled: false, cost: { generic: 30, brand: 75 }
  },
  'prednisone': {
    id: 'prednisone', brandName: 'Deltasone', genericName: 'Prednisone',
    category: 'corticosteroid', schedule: 'RX',
    dosageForms: ['tablet'],
    strengths: ['1mg', '5mg', '10mg', '20mg', '50mg'],
    defaultStrength: '10mg', defaultForm: 'tablet',
    defaultQuantity: 21, defaultDaysSupply: 7, defaultRefills: 0, maxRefills: 2,
    defaultDirections: 'Take as directed. Taper as prescribed.',
    commonIndications: ['Asthma exacerbation', 'COPD exacerbation', 'Inflammation'],
    contraindications: ['Systemic fungal infections', 'Live vaccines'],
    isControlled: false, cost: { generic: 8, brand: 45 }
  },

  // THYROID
  'levothyroxine': {
    id: 'levothyroxine', brandName: 'Synthroid', genericName: 'Levothyroxine',
    category: 'thyroid', schedule: 'RX',
    dosageForms: ['tablet'],
    strengths: ['25mcg', '50mcg', '75mcg', '88mcg', '100mcg', '112mcg', '125mcg', '150mcg'],
    defaultStrength: '50mcg', defaultForm: 'tablet',
    defaultQuantity: 30, defaultDaysSupply: 30, defaultRefills: 5, maxRefills: 11,
    defaultDirections: 'Take 1 tablet on empty stomach, 30-60 min before breakfast.',
    commonIndications: ['Hypothyroidism', 'TSH suppression'],
    contraindications: ['Untreated adrenal insufficiency', 'Acute MI'],
    isControlled: false, cost: { generic: 15, brand: 85 }
  },

  // CONTROLLED - PAIN
  'tramadol': {
    id: 'tramadol', brandName: 'Ultram', genericName: 'Tramadol',
    category: 'opioid', schedule: 'IV',
    dosageForms: ['tablet', 'capsule'],
    strengths: ['50mg', '100mg'],
    defaultStrength: '50mg', defaultForm: 'tablet',
    defaultQuantity: 30, defaultDaysSupply: 10, defaultRefills: 0, maxRefills: 5,
    defaultDirections: 'Take 1 tablet every 6 hours as needed for moderate pain.',
    commonIndications: ['Moderate to severe pain'],
    contraindications: ['MAO-I use', 'Severe respiratory depression'],
    blackBoxWarning: 'Risk of addiction, respiratory depression, neonatal withdrawal.',
    isControlled: true, cost: { generic: 20, brand: 180 }
  },
  'cyclobenzaprine': {
    id: 'cyclobenzaprine', brandName: 'Flexeril', genericName: 'Cyclobenzaprine',
    category: 'muscle-relaxant', schedule: 'RX',
    dosageForms: ['tablet'],
    strengths: ['5mg', '10mg'],
    defaultStrength: '10mg', defaultForm: 'tablet',
    defaultQuantity: 30, defaultDaysSupply: 10, defaultRefills: 1, maxRefills: 2,
    defaultDirections: 'Take 1 tablet three times daily as needed for muscle spasm.',
    commonIndications: ['Muscle spasm', 'Back pain', 'Neck pain'],
    contraindications: ['MAO-I use', 'Arrhythmias', 'Heart block'],
    isControlled: false, cost: { generic: 12, brand: 150 }
  },

  // VITAMINS
  'vitamin-d3': {
    id: 'vitamin-d3', brandName: 'Vitamin D3', genericName: 'Cholecalciferol',
    category: 'vitamin', schedule: 'OTC',
    dosageForms: ['capsule', 'tablet'],
    strengths: ['1000 IU', '2000 IU', '5000 IU', '50000 IU'],
    defaultStrength: '2000 IU', defaultForm: 'capsule',
    defaultQuantity: 90, defaultDaysSupply: 90, defaultRefills: 3, maxRefills: 11,
    defaultDirections: 'Take 1 capsule once daily with food.',
    commonIndications: ['Vitamin D deficiency', 'Osteoporosis prevention'],
    contraindications: ['Hypercalcemia'],
    isControlled: false, cost: { generic: 10, brand: 25 }
  },
  'magnesium-oxide': {
    id: 'magnesium-oxide', brandName: 'Mag-Ox', genericName: 'Magnesium Oxide',
    category: 'vitamin', schedule: 'OTC',
    dosageForms: ['capsule', 'tablet'],
    strengths: ['400mg', '500mg'],
    defaultStrength: '400mg', defaultForm: 'capsule',
    defaultQuantity: 60, defaultDaysSupply: 30, defaultRefills: 5, maxRefills: 11,
    defaultDirections: 'Take 1 capsule twice daily with food.',
    commonIndications: ['Magnesium deficiency', 'Migraine prophylaxis'],
    contraindications: ['Renal impairment', 'Myasthenia gravis'],
    isControlled: false, cost: { generic: 8, brand: 15 }
  },
};

// =============================================================================
// Drug Interactions Database
// =============================================================================

export const DRUG_INTERACTIONS: DrugInteraction[] = [
  {
    id: 'topiramate-ocp', drug1: 'topiramate', drug2: 'oral contraceptives',
    severity: 'moderate',
    description: 'Topiramate may decrease contraceptive effectiveness.',
    clinicalEffect: 'Reduced contraceptive efficacy, pregnancy risk.',
    management: 'Use additional contraception. Consider higher estrogen dose.'
  },
  {
    id: 'nsaid-anticoagulant', drug1: 'ibuprofen', drug2: 'warfarin',
    severity: 'major',
    description: 'NSAIDs increase bleeding risk with anticoagulants.',
    clinicalEffect: 'Increased GI bleeding and hemorrhagic events.',
    management: 'Avoid if possible. Use acetaminophen. Monitor INR.'
  },
  {
    id: 'ssri-triptan', drug1: 'sertraline', drug2: 'sumatriptan',
    severity: 'moderate',
    description: 'Serotonin syndrome risk with SSRI + triptan.',
    clinicalEffect: 'Rare but potentially serious serotonin syndrome.',
    management: 'Use with caution. Educate on serotonin syndrome symptoms.'
  },
  {
    id: 'metformin-contrast', drug1: 'metformin', drug2: 'iodinated contrast',
    severity: 'major',
    description: 'Hold metformin before/after contrast procedures.',
    clinicalEffect: 'Contrast-induced nephropathy with lactic acidosis risk.',
    management: 'Hold 48h before and after. Check renal function before resuming.'
  },
  {
    id: 'ace-potassium', drug1: 'lisinopril', drug2: 'potassium supplements',
    severity: 'moderate',
    description: 'ACE inhibitors can cause hyperkalemia.',
    clinicalEffect: 'Risk of dangerous hyperkalemia.',
    management: 'Monitor potassium. Avoid supplements unless indicated.'
  },
  {
    id: 'benzo-opioid', drug1: 'lorazepam', drug2: 'tramadol',
    severity: 'contraindicated',
    description: 'Benzo + opioid increases fatal overdose risk.',
    clinicalEffect: 'Profound sedation, respiratory depression, death.',
    management: 'Avoid combination. If necessary, use lowest doses.'
  },
];

// =============================================================================
// Utility Functions
// =============================================================================

export function getMedication(id: string): Medication | undefined {
  return MEDICATION_CATALOG[id];
}

export function searchMedications(query: string): Medication[] {
  const q = query.toLowerCase();
  return Object.values(MEDICATION_CATALOG).filter(med =>
    med.id.toLowerCase().includes(q) ||
    med.brandName.toLowerCase().includes(q) ||
    med.genericName.toLowerCase().includes(q) ||
    med.commonIndications.some(i => i.toLowerCase().includes(q))
  );
}

export function getMedicationsByCategory(category: DrugCategory): Medication[] {
  return Object.values(MEDICATION_CATALOG).filter(med => med.category === category);
}

export function getControlledMedications(): Medication[] {
  return Object.values(MEDICATION_CATALOG).filter(med => med.isControlled);
}

export function getAllMedications(): Medication[] {
  return Object.values(MEDICATION_CATALOG);
}

export function checkDrugInteractions(medications: string[]): DrugInteraction[] {
  const detected: DrugInteraction[] = [];
  const meds = medications.map(m => m.toLowerCase());
  
  for (const interaction of DRUG_INTERACTIONS) {
    const hasDrug1 = meds.some(m => 
      m.includes(interaction.drug1) || interaction.drug1.includes(m)
    );
    const hasDrug2 = meds.some(m => 
      m.includes(interaction.drug2) || interaction.drug2.includes(m)
    );
    
    if (hasDrug1 && hasDrug2) {
      detected.push(interaction);
    }
  }
  
  return detected;
}
