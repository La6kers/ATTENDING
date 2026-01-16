// ============================================================
// Referral Catalog - Specialty and Provider Data
// apps/shared/data/catalogs/referralCatalog.ts
//
// Centralized specialty catalog for referral ordering
// Moved from provider-portal/store/referralOrderingStore.ts
// ============================================================

// =============================================================================
// Types
// =============================================================================

export type ReferralUrgency = 'STAT' | 'URGENT' | 'ROUTINE' | 'ELECTIVE';
export type ReferralStatus = 'DRAFT' | 'PENDING' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
export type SpecialtyCategory = 'medical' | 'surgical' | 'diagnostic' | 'therapeutic' | 'behavioral';

export interface Specialty {
  code: string;
  name: string;
  category: SpecialtyCategory;
  subspecialties: string[];
  averageWaitDays: { routine: number; urgent: number };
  requiresAuth: boolean;
  commonIndications: string[];
  redFlagIndications: string[];
  defaultPriority: ReferralUrgency;
  cost: number; // Estimated consultation cost
  description: string;
}

export interface ReferralProvider {
  id: string;
  name: string;
  credentials: string;
  specialty: string;
  subspecialty?: string;
  organization: string;
  address: string;
  phone: string;
  fax: string;
  acceptingNew: boolean;
  insurancesAccepted: string[];
  nextAvailable: { routine: string; urgent: string };
  rating?: number;
  preferred?: boolean;
}

// =============================================================================
// Specialty Catalog
// =============================================================================

export const SPECIALTY_CATALOG: Record<string, Specialty> = {
  'NEURO': {
    code: 'NEURO',
    name: 'Neurology',
    description: 'Disorders of the brain, spinal cord, and peripheral nervous system',
    category: 'medical',
    subspecialties: ['Headache Medicine', 'Epilepsy', 'Movement Disorders', 'Stroke', 'Neuromuscular'],
    averageWaitDays: { routine: 21, urgent: 3 },
    requiresAuth: false,
    defaultPriority: 'ROUTINE',
    cost: 350,
    commonIndications: ['Headache evaluation', 'Seizure workup', 'Neuropathy', 'Tremor', 'Memory concerns'],
    redFlagIndications: ['Thunderclap headache', 'New onset seizure', 'Acute weakness', 'Sudden vision loss']
  },
  'CARDS': {
    code: 'CARDS',
    name: 'Cardiology',
    description: 'Heart and cardiovascular system disorders',
    category: 'medical',
    subspecialties: ['Interventional', 'Electrophysiology', 'Heart Failure', 'Preventive'],
    averageWaitDays: { routine: 14, urgent: 2 },
    requiresAuth: false,
    defaultPriority: 'ROUTINE',
    cost: 400,
    commonIndications: ['Chest pain evaluation', 'Arrhythmia', 'Heart murmur', 'Hypertension management'],
    redFlagIndications: ['Acute chest pain', 'Syncope', 'New heart failure', 'Unstable angina']
  },
  'GI': {
    code: 'GI',
    name: 'Gastroenterology',
    description: 'Digestive system and liver disorders',
    category: 'medical',
    subspecialties: ['Hepatology', 'IBD', 'Motility', 'Therapeutic Endoscopy'],
    averageWaitDays: { routine: 28, urgent: 5 },
    requiresAuth: true,
    defaultPriority: 'ROUTINE',
    cost: 375,
    commonIndications: ['GERD refractory to PPI', 'Colonoscopy screening', 'Abnormal LFTs', 'Chronic diarrhea'],
    redFlagIndications: ['GI bleeding', 'Jaundice', 'Acute abdominal pain', 'Weight loss with GI symptoms']
  },
  'PULM': {
    code: 'PULM',
    name: 'Pulmonology',
    description: 'Lung and respiratory system disorders',
    category: 'medical',
    subspecialties: ['Sleep Medicine', 'Critical Care', 'Interventional'],
    averageWaitDays: { routine: 21, urgent: 3 },
    requiresAuth: false,
    defaultPriority: 'ROUTINE',
    cost: 350,
    commonIndications: ['Chronic cough', 'Dyspnea evaluation', 'Abnormal chest imaging', 'Asthma management'],
    redFlagIndications: ['Hemoptysis', 'Pulmonary embolism', 'Respiratory failure', 'Lung mass']
  },
  'ENDO': {
    code: 'ENDO',
    name: 'Endocrinology',
    description: 'Hormone and metabolic disorders',
    category: 'medical',
    subspecialties: ['Diabetes', 'Thyroid', 'Bone/Metabolic', 'Pituitary'],
    averageWaitDays: { routine: 35, urgent: 7 },
    requiresAuth: false,
    defaultPriority: 'ROUTINE',
    cost: 325,
    commonIndications: ['Uncontrolled diabetes', 'Thyroid nodule', 'Osteoporosis', 'Adrenal abnormality'],
    redFlagIndications: ['DKA', 'Thyroid storm', 'Adrenal crisis', 'Severe hypoglycemia']
  },
  'RHEUM': {
    code: 'RHEUM',
    name: 'Rheumatology',
    description: 'Autoimmune and inflammatory joint disorders',
    category: 'medical',
    subspecialties: ['Inflammatory Arthritis', 'Connective Tissue', 'Vasculitis'],
    averageWaitDays: { routine: 42, urgent: 7 },
    requiresAuth: false,
    defaultPriority: 'ROUTINE',
    cost: 350,
    commonIndications: ['Joint pain workup', 'Positive ANA', 'Suspected RA', 'Gout management'],
    redFlagIndications: ['Vasculitis', 'Acute monoarthritis', 'Systemic lupus flare', 'Scleroderma crisis']
  },
  'NEPH': {
    code: 'NEPH',
    name: 'Nephrology',
    description: 'Kidney diseases and hypertension',
    category: 'medical',
    subspecialties: ['Dialysis', 'Transplant', 'Hypertension'],
    averageWaitDays: { routine: 21, urgent: 3 },
    requiresAuth: false,
    defaultPriority: 'ROUTINE',
    cost: 350,
    commonIndications: ['CKD Stage 4+', 'Proteinuria', 'Recurrent kidney stones', 'Resistant hypertension'],
    redFlagIndications: ['Acute kidney injury', 'Glomerulonephritis', 'Nephrotic syndrome', 'Electrolyte emergency']
  },
  'HEME-ONC': {
    code: 'HEME-ONC',
    name: 'Hematology/Oncology',
    description: 'Blood disorders and cancer',
    category: 'medical',
    subspecialties: ['Hematology', 'Medical Oncology', 'Bone Marrow Transplant'],
    averageWaitDays: { routine: 14, urgent: 2 },
    requiresAuth: false,
    defaultPriority: 'URGENT',
    cost: 450,
    commonIndications: ['Anemia workup', 'Abnormal WBC', 'Lymphadenopathy', 'Cancer staging'],
    redFlagIndications: ['Suspected malignancy', 'Pancytopenia', 'Hyperviscosity', 'Tumor lysis']
  },
  'ORTHO': {
    code: 'ORTHO',
    name: 'Orthopedic Surgery',
    description: 'Musculoskeletal injuries and conditions',
    category: 'surgical',
    subspecialties: ['Sports Medicine', 'Spine', 'Joint Replacement', 'Hand', 'Trauma'],
    averageWaitDays: { routine: 21, urgent: 3 },
    requiresAuth: true,
    defaultPriority: 'ROUTINE',
    cost: 375,
    commonIndications: ['Joint pain', 'Back pain', 'Fracture follow-up', 'Rotator cuff tear'],
    redFlagIndications: ['Open fracture', 'Compartment syndrome', 'Cauda equina', 'Septic joint']
  },
  'GENSURG': {
    code: 'GENSURG',
    name: 'General Surgery',
    description: 'Abdominal and general surgical conditions',
    category: 'surgical',
    subspecialties: ['Minimally Invasive', 'Colorectal', 'Breast', 'Trauma'],
    averageWaitDays: { routine: 14, urgent: 2 },
    requiresAuth: true,
    defaultPriority: 'ROUTINE',
    cost: 400,
    commonIndications: ['Hernia repair', 'Cholecystectomy', 'Breast mass', 'Appendicitis'],
    redFlagIndications: ['Acute abdomen', 'Bowel obstruction', 'Perforated viscus', 'Hemorrhage']
  },
  'PSYCH': {
    code: 'PSYCH',
    name: 'Psychiatry',
    description: 'Mental health and psychiatric disorders',
    category: 'behavioral',
    subspecialties: ['Adult', 'Child/Adolescent', 'Addiction', 'Geriatric'],
    averageWaitDays: { routine: 42, urgent: 7 },
    requiresAuth: false,
    defaultPriority: 'ROUTINE',
    cost: 300,
    commonIndications: ['Depression', 'Anxiety', 'Medication management', 'Bipolar disorder'],
    redFlagIndications: ['Suicidal ideation', 'Psychosis', 'Severe agitation', 'Catatonia']
  },
  'DERM': {
    code: 'DERM',
    name: 'Dermatology',
    description: 'Skin, hair, and nail conditions',
    category: 'medical',
    subspecialties: ['Medical Dermatology', 'Dermatopathology', 'Mohs Surgery'],
    averageWaitDays: { routine: 60, urgent: 14 },
    requiresAuth: false,
    defaultPriority: 'ROUTINE',
    cost: 275,
    commonIndications: ['Suspicious lesion', 'Chronic rash', 'Acne', 'Psoriasis'],
    redFlagIndications: ['Melanoma concern', 'SJS/TEN', 'Necrotizing fasciitis', 'Severe drug reaction']
  },
  'OPHTH': {
    code: 'OPHTH',
    name: 'Ophthalmology',
    description: 'Eye and vision disorders',
    category: 'surgical',
    subspecialties: ['Retina', 'Glaucoma', 'Cornea', 'Oculoplastics'],
    averageWaitDays: { routine: 28, urgent: 1 },
    requiresAuth: false,
    defaultPriority: 'ROUTINE',
    cost: 300,
    commonIndications: ['Vision changes', 'Diabetic eye exam', 'Glaucoma screening', 'Cataract'],
    redFlagIndications: ['Acute vision loss', 'Eye trauma', 'Retinal detachment', 'Acute glaucoma']
  },
  'ENT': {
    code: 'ENT',
    name: 'Otolaryngology',
    description: 'Ear, nose, and throat disorders',
    category: 'surgical',
    subspecialties: ['Head & Neck', 'Otology', 'Rhinology', 'Laryngology'],
    averageWaitDays: { routine: 21, urgent: 3 },
    requiresAuth: true,
    defaultPriority: 'ROUTINE',
    cost: 325,
    commonIndications: ['Chronic sinusitis', 'Hearing loss', 'Neck mass', 'Hoarseness'],
    redFlagIndications: ['Airway compromise', 'Deep neck infection', 'Sudden hearing loss', 'Suspected cancer']
  },
  'UROL': {
    code: 'UROL',
    name: 'Urology',
    description: 'Urinary tract and male reproductive disorders',
    category: 'surgical',
    subspecialties: ['Oncology', 'Female Pelvic', 'Male Infertility', 'Pediatric'],
    averageWaitDays: { routine: 21, urgent: 3 },
    requiresAuth: true,
    defaultPriority: 'ROUTINE',
    cost: 350,
    commonIndications: ['Elevated PSA', 'Hematuria', 'BPH', 'Kidney stones'],
    redFlagIndications: ['Urinary retention', 'Testicular torsion', 'Fournier gangrene', 'Urosepsis']
  },
  'PT': {
    code: 'PT',
    name: 'Physical Therapy',
    description: 'Movement and rehabilitation therapy',
    category: 'therapeutic',
    subspecialties: ['Orthopedic', 'Neurologic', 'Vestibular', 'Pelvic Floor'],
    averageWaitDays: { routine: 7, urgent: 2 },
    requiresAuth: true,
    defaultPriority: 'ROUTINE',
    cost: 150,
    commonIndications: ['Post-surgical rehab', 'Back pain', 'Balance issues', 'Joint replacement'],
    redFlagIndications: []
  },
  'OT': {
    code: 'OT',
    name: 'Occupational Therapy',
    description: 'Functional and daily living rehabilitation',
    category: 'therapeutic',
    subspecialties: ['Hand Therapy', 'Neurologic', 'Pediatric'],
    averageWaitDays: { routine: 7, urgent: 3 },
    requiresAuth: true,
    defaultPriority: 'ROUTINE',
    cost: 150,
    commonIndications: ['Hand injury', 'Stroke rehab', 'ADL training', 'Splinting'],
    redFlagIndications: []
  },
  'ALLERGY': {
    code: 'ALLERGY',
    name: 'Allergy/Immunology',
    description: 'Allergic and immunologic disorders',
    category: 'medical',
    subspecialties: ['Allergy Testing', 'Asthma', 'Immunodeficiency'],
    averageWaitDays: { routine: 28, urgent: 7 },
    requiresAuth: false,
    defaultPriority: 'ROUTINE',
    cost: 300,
    commonIndications: ['Allergic rhinitis', 'Food allergies', 'Asthma management', 'Drug allergy evaluation'],
    redFlagIndications: ['Anaphylaxis history', 'Severe asthma', 'Suspected immunodeficiency']
  },
  'ID': {
    code: 'ID',
    name: 'Infectious Disease',
    description: 'Complex infections and antimicrobial management',
    category: 'medical',
    subspecialties: ['HIV', 'Travel Medicine', 'Transplant ID'],
    averageWaitDays: { routine: 14, urgent: 2 },
    requiresAuth: false,
    defaultPriority: 'ROUTINE',
    cost: 350,
    commonIndications: ['Complex infection', 'HIV management', 'Travel consultation', 'Osteomyelitis'],
    redFlagIndications: ['Sepsis', 'Endocarditis', 'Meningitis', 'Necrotizing infection']
  }
};

// =============================================================================
// Sample Provider Directory
// =============================================================================

export const PROVIDER_DIRECTORY: ReferralProvider[] = [
  {
    id: 'prov-001',
    name: 'Sarah Chen',
    credentials: 'MD, PhD',
    specialty: 'NEURO',
    subspecialty: 'Headache Medicine',
    organization: 'Regional Neurology Associates',
    address: '1234 Medical Center Dr, Suite 400',
    phone: '(555) 234-5678',
    fax: '(555) 234-5679',
    acceptingNew: true,
    insurancesAccepted: ['Blue Cross', 'Aetna', 'United', 'Medicare'],
    nextAvailable: { routine: '2 weeks', urgent: '2 days' },
    rating: 4.8,
    preferred: true
  },
  {
    id: 'prov-002',
    name: 'Michael Rodriguez',
    credentials: 'MD, FACC',
    specialty: 'CARDS',
    subspecialty: 'Interventional',
    organization: 'Heart & Vascular Institute',
    address: '5678 Cardiac Way, Suite 200',
    phone: '(555) 345-6789',
    fax: '(555) 345-6790',
    acceptingNew: true,
    insurancesAccepted: ['Blue Cross', 'Aetna', 'United', 'Medicare', 'Medicaid'],
    nextAvailable: { routine: '1 week', urgent: 'Same day' },
    rating: 4.9,
    preferred: true
  },
  {
    id: 'prov-003',
    name: 'Jennifer Park',
    credentials: 'MD',
    specialty: 'GI',
    subspecialty: 'IBD',
    organization: 'Digestive Health Center',
    address: '9012 GI Lane, Suite 150',
    phone: '(555) 456-7890',
    fax: '(555) 456-7891',
    acceptingNew: true,
    insurancesAccepted: ['Blue Cross', 'United', 'Medicare'],
    nextAvailable: { routine: '4 weeks', urgent: '1 week' },
    rating: 4.7
  },
  {
    id: 'prov-004',
    name: 'David Kim',
    credentials: 'MD, FACS',
    specialty: 'ORTHO',
    subspecialty: 'Sports Medicine',
    organization: 'Sports Medicine & Orthopedics',
    address: '3456 Athletic Dr, Suite 300',
    phone: '(555) 567-8901',
    fax: '(555) 567-8902',
    acceptingNew: true,
    insurancesAccepted: ['Blue Cross', 'Aetna', 'United', 'Medicare'],
    nextAvailable: { routine: '3 weeks', urgent: '3 days' },
    rating: 4.6
  },
  {
    id: 'prov-005',
    name: 'Lisa Thompson',
    credentials: 'MD',
    specialty: 'PSYCH',
    subspecialty: 'Adult',
    organization: 'Behavioral Health Associates',
    address: '7890 Mental Health Way, Suite 100',
    phone: '(555) 678-9012',
    fax: '(555) 678-9013',
    acceptingNew: false,
    insurancesAccepted: ['Blue Cross', 'Aetna'],
    nextAvailable: { routine: '6 weeks', urgent: '1 week' },
    rating: 4.9
  },
  {
    id: 'prov-006',
    name: 'Robert Martinez',
    credentials: 'MD, FCCP',
    specialty: 'PULM',
    subspecialty: 'Sleep Medicine',
    organization: 'Pulmonary & Sleep Center',
    address: '2468 Respiratory Blvd, Suite 250',
    phone: '(555) 789-0123',
    fax: '(555) 789-0124',
    acceptingNew: true,
    insurancesAccepted: ['Blue Cross', 'Aetna', 'United', 'Medicare', 'Medicaid'],
    nextAvailable: { routine: '2 weeks', urgent: '3 days' },
    rating: 4.5
  },
  {
    id: 'prov-007',
    name: 'Amanda Wright',
    credentials: 'MD',
    specialty: 'ENDO',
    subspecialty: 'Diabetes',
    organization: 'Endocrine & Diabetes Specialists',
    address: '1357 Hormone Ave, Suite 175',
    phone: '(555) 890-1234',
    fax: '(555) 890-1235',
    acceptingNew: true,
    insurancesAccepted: ['Blue Cross', 'United', 'Medicare'],
    nextAvailable: { routine: '5 weeks', urgent: '1 week' },
    rating: 4.7
  },
  {
    id: 'prov-008',
    name: 'James Lee',
    credentials: 'MD, FAAD',
    specialty: 'DERM',
    organization: 'Dermatology Associates',
    address: '9753 Skin Care Dr, Suite 50',
    phone: '(555) 901-2345',
    fax: '(555) 901-2346',
    acceptingNew: true,
    insurancesAccepted: ['Blue Cross', 'Aetna', 'United'],
    nextAvailable: { routine: '8 weeks', urgent: '2 weeks' },
    rating: 4.4
  }
];

// =============================================================================
// Helper Functions
// =============================================================================

export function getSpecialtyByCode(code: string): Specialty | undefined {
  return SPECIALTY_CATALOG[code];
}

export function getSpecialtiesByCategory(category: SpecialtyCategory): Specialty[] {
  return Object.values(SPECIALTY_CATALOG).filter(s => s.category === category);
}

export function getProvidersBySpecialty(specialtyCode: string): ReferralProvider[] {
  return PROVIDER_DIRECTORY.filter(p => p.specialty === specialtyCode);
}

export function getPreferredProviders(specialtyCode: string): ReferralProvider[] {
  return PROVIDER_DIRECTORY.filter(p => p.specialty === specialtyCode && p.preferred);
}

export function getProvidersAcceptingNew(specialtyCode: string): ReferralProvider[] {
  return PROVIDER_DIRECTORY.filter(p => p.specialty === specialtyCode && p.acceptingNew);
}

export function hasRedFlagIndications(specialtyCode: string): boolean {
  const specialty = SPECIALTY_CATALOG[specialtyCode];
  return specialty ? specialty.redFlagIndications.length > 0 : false;
}

export default SPECIALTY_CATALOG;
