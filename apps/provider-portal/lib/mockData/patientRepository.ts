// =============================================================================
// ATTENDING AI - Mock Patient Repository
// apps/provider-portal/lib/mockData/patientRepository.ts
//
// Centralized repository of mock patients with complete COMPASS assessments
// =============================================================================

// Types
export type UrgencyLevel = 'routine' | 'urgent' | 'emergent';
export type AssessmentStatus = 'pending' | 'in_review' | 'completed' | 'cancelled';
export type AppointmentStatus = 'scheduled' | 'checked_in' | 'in_progress' | 'completed' | 'no_show';

export interface Allergy {
  allergen: string;
  reaction: string;
  severity: 'mild' | 'moderate' | 'severe';
}

export interface RedFlag {
  id: string;
  description: string;
  category: string;
  severity: 'warning' | 'critical';
}

export interface AssessmentSubmission {
  id: string;
  patientId: string;
  submittedAt: string;
  status: AssessmentStatus;
  urgencyLevel: UrgencyLevel;
  chiefComplaint: string;
  redFlags: RedFlag[];
  aiSummary: string;
  aiDifferentialDiagnosis: Array<{
    diagnosis: string;
    probability: 'high' | 'moderate' | 'low';
    reasoning: string;
    urgent: boolean;
  }>;
}

export interface Appointment {
  id: string;
  patientId: string;
  assessmentId?: string;
  scheduledAt: string;
  duration: number;
  type: 'new_patient' | 'follow_up' | 'urgent' | 'telehealth' | 'procedure';
  status: AppointmentStatus;
  provider: string;
  reason: string;
}

export interface Patient {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  email: string;
  phone: string;
  insurancePlan: string;
  allergies: Allergy[];
  medications: Array<{ name: string; dosage: string; frequency: string }>;
  medicalHistory: string[];
  currentAssessment?: AssessmentSubmission;
  appointments: Appointment[];
  avatarColor: string;
}

// Helper: Get relative date from now
const getRelativeDate = (daysFromNow: number, hours: number = 9, minutes: number = 0): string => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
};

const avatarColors = [
  'from-purple-500 to-indigo-600',
  'from-blue-500 to-cyan-600',
  'from-green-500 to-teal-600',
  'from-orange-500 to-red-600',
  'from-pink-500 to-rose-600',
  'from-amber-500 to-orange-600',
  'from-emerald-500 to-green-600',
  'from-violet-500 to-purple-600',
  'from-cyan-500 to-blue-600',
  'from-rose-500 to-pink-600',
];

// =============================================================================
// PATIENT DATA - 10 Patients with Assessments
// =============================================================================

export const PATIENTS: Patient[] = [
  // Patient 1: EMERGENT - Severe Headache with Red Flags
  {
    id: 'pat-001',
    mrn: 'MRN-2024-001',
    firstName: 'Sarah',
    lastName: 'Johnson',
    dateOfBirth: '1990-03-15',
    age: 34,
    gender: 'Female',
    email: 'sarah.johnson@email.com',
    phone: '(303) 555-0101',
    insurancePlan: 'Blue Cross PPO',
    allergies: [
      { allergen: 'Penicillin', reaction: 'Hives', severity: 'severe' },
      { allergen: 'Sulfa drugs', reaction: 'Rash', severity: 'moderate' },
    ],
    medications: [
      { name: 'Metformin', dosage: '500mg', frequency: 'BID' },
      { name: 'Lisinopril', dosage: '10mg', frequency: 'Daily' },
    ],
    medicalHistory: ['Type 2 Diabetes', 'Hypertension', 'Migraines'],
    currentAssessment: {
      id: 'assess-001',
      patientId: 'pat-001',
      submittedAt: getRelativeDate(0, 7, 30),
      status: 'pending',
      urgencyLevel: 'emergent',
      chiefComplaint: 'Severe headache with visual disturbances for 3 days',
      redFlags: [
        { id: 'rf-001', description: 'Worst headache of life', category: 'neurological', severity: 'critical' },
        { id: 'rf-002', description: 'Neck stiffness', category: 'neurological', severity: 'critical' },
        { id: 'rf-003', description: 'Visual changes', category: 'neurological', severity: 'warning' },
      ],
      aiSummary: '34-year-old female with severe headache described as "worst of life" with neck stiffness and visual disturbances. Urgent evaluation needed to rule out SAH.',
      aiDifferentialDiagnosis: [
        { diagnosis: 'Subarachnoid Hemorrhage', probability: 'high', reasoning: 'Thunderclap headache, neck stiffness', urgent: true },
        { diagnosis: 'Meningitis', probability: 'moderate', reasoning: 'Neck stiffness, photophobia', urgent: true },
        { diagnosis: 'Migraine with Aura', probability: 'low', reasoning: 'History of migraines but atypical', urgent: false },
      ],
    },
    appointments: [
      {
        id: 'appt-001',
        patientId: 'pat-001',
        assessmentId: 'assess-001',
        scheduledAt: getRelativeDate(0, 9, 0),
        duration: 30,
        type: 'urgent',
        status: 'scheduled',
        provider: 'Dr. Thomas Reed',
        reason: 'Urgent: Severe headache with red flags',
      },
    ],
    avatarColor: avatarColors[0],
  },

  // Patient 2: URGENT - Chest Pain
  {
    id: 'pat-002',
    mrn: 'MRN-2024-002',
    firstName: 'Robert',
    lastName: 'Martinez',
    dateOfBirth: '1958-07-22',
    age: 66,
    gender: 'Male',
    email: 'robert.martinez@email.com',
    phone: '(303) 555-0102',
    insurancePlan: 'Medicare Advantage',
    allergies: [{ allergen: 'Aspirin', reaction: 'GI bleeding', severity: 'moderate' }],
    medications: [
      { name: 'Atorvastatin', dosage: '40mg', frequency: 'Daily' },
      { name: 'Metoprolol', dosage: '50mg', frequency: 'BID' },
      { name: 'Clopidogrel', dosage: '75mg', frequency: 'Daily' },
    ],
    medicalHistory: ['CAD (stent 2019)', 'Hypertension', 'Hyperlipidemia'],
    currentAssessment: {
      id: 'assess-002',
      patientId: 'pat-002',
      submittedAt: getRelativeDate(0, 6, 45),
      status: 'pending',
      urgencyLevel: 'urgent',
      chiefComplaint: 'Chest pressure and shortness of breath with exertion',
      redFlags: [
        { id: 'rf-004', description: 'Chest pain with cardiac history', category: 'cardiovascular', severity: 'critical' },
      ],
      aiSummary: '66-year-old male with CAD presenting with exertional chest pressure. Possible unstable angina or stent restenosis.',
      aiDifferentialDiagnosis: [
        { diagnosis: 'Unstable Angina', probability: 'high', reasoning: 'Cardiac history, exertional symptoms', urgent: true },
        { diagnosis: 'In-stent Restenosis', probability: 'moderate', reasoning: 'Prior PCI, recurring symptoms', urgent: true },
      ],
    },
    appointments: [
      {
        id: 'appt-002',
        patientId: 'pat-002',
        assessmentId: 'assess-002',
        scheduledAt: getRelativeDate(0, 9, 30),
        duration: 30,
        type: 'urgent',
        status: 'scheduled',
        provider: 'Dr. Thomas Reed',
        reason: 'Urgent: Chest pain, cardiac history',
      },
    ],
    avatarColor: avatarColors[1],
  },

  // Patient 3: ROUTINE - Diabetes Follow-up
  {
    id: 'pat-003',
    mrn: 'MRN-2024-003',
    firstName: 'Emily',
    lastName: 'Chen',
    dateOfBirth: '1975-11-08',
    age: 49,
    gender: 'Female',
    email: 'emily.chen@email.com',
    phone: '(303) 555-0103',
    insurancePlan: 'United Healthcare',
    allergies: [],
    medications: [
      { name: 'Metformin', dosage: '1000mg', frequency: 'BID' },
      { name: 'Glipizide', dosage: '5mg', frequency: 'Daily' },
    ],
    medicalHistory: ['Type 2 Diabetes (10 years)', 'Hypothyroidism', 'Obesity'],
    currentAssessment: {
      id: 'assess-003',
      patientId: 'pat-003',
      submittedAt: getRelativeDate(-1, 14, 0),
      status: 'pending',
      urgencyLevel: 'routine',
      chiefComplaint: 'Diabetes follow-up, blood sugars running high',
      redFlags: [],
      aiSummary: '49-year-old female with T2DM presenting for follow-up. Fasting glucose 140-180, A1C was 7.2% three months ago.',
      aiDifferentialDiagnosis: [
        { diagnosis: 'Uncontrolled Type 2 Diabetes', probability: 'high', reasoning: 'Elevated glucose levels', urgent: false },
      ],
    },
    appointments: [
      {
        id: 'appt-003',
        patientId: 'pat-003',
        assessmentId: 'assess-003',
        scheduledAt: getRelativeDate(0, 10, 0),
        duration: 20,
        type: 'follow_up',
        status: 'scheduled',
        provider: 'Dr. Thomas Reed',
        reason: 'Diabetes management follow-up',
      },
    ],
    avatarColor: avatarColors[2],
  },

  // Patient 4: ROUTINE - Annual Physical
  {
    id: 'pat-004',
    mrn: 'MRN-2024-004',
    firstName: 'James',
    lastName: 'Wilson',
    dateOfBirth: '1985-02-28',
    age: 39,
    gender: 'Male',
    email: 'james.wilson@email.com',
    phone: '(303) 555-0104',
    insurancePlan: 'Cigna',
    allergies: [{ allergen: 'Shellfish', reaction: 'Hives', severity: 'moderate' }],
    medications: [],
    medicalHistory: ['Seasonal allergies'],
    currentAssessment: {
      id: 'assess-004',
      patientId: 'pat-004',
      submittedAt: getRelativeDate(-2, 10, 0),
      status: 'pending',
      urgencyLevel: 'routine',
      chiefComplaint: 'Annual physical exam, no current concerns',
      redFlags: [],
      aiSummary: '39-year-old healthy male for annual physical. Family history notable for paternal colon cancer at 62.',
      aiDifferentialDiagnosis: [],
    },
    appointments: [
      {
        id: 'appt-004',
        patientId: 'pat-004',
        assessmentId: 'assess-004',
        scheduledAt: getRelativeDate(0, 10, 30),
        duration: 30,
        type: 'new_patient',
        status: 'scheduled',
        provider: 'Dr. Thomas Reed',
        reason: 'Annual physical exam',
      },
    ],
    avatarColor: avatarColors[3],
  },

  // Patient 5: URGENT - Abdominal Pain
  {
    id: 'pat-005',
    mrn: 'MRN-2024-005',
    firstName: 'Maria',
    lastName: 'Garcia',
    dateOfBirth: '1968-09-12',
    age: 56,
    gender: 'Female',
    email: 'maria.garcia@email.com',
    phone: '(303) 555-0105',
    insurancePlan: 'Aetna',
    allergies: [{ allergen: 'Codeine', reaction: 'Nausea', severity: 'moderate' }],
    medications: [{ name: 'Omeprazole', dosage: '20mg', frequency: 'Daily' }],
    medicalHistory: ['GERD', 'Osteopenia', 'Anxiety'],
    currentAssessment: {
      id: 'assess-005',
      patientId: 'pat-005',
      submittedAt: getRelativeDate(0, 8, 15),
      status: 'pending',
      urgencyLevel: 'urgent',
      chiefComplaint: 'Right upper quadrant abdominal pain after eating',
      redFlags: [
        { id: 'rf-005', description: 'Low-grade fever with abdominal pain', category: 'infection', severity: 'warning' },
      ],
      aiSummary: '56-year-old female with classic biliary colic: postprandial RUQ pain, nausea. Low-grade fever raises concern for acute cholecystitis.',
      aiDifferentialDiagnosis: [
        { diagnosis: 'Acute Cholecystitis', probability: 'high', reasoning: 'RUQ pain, fever, postprandial', urgent: true },
        { diagnosis: 'Biliary Colic', probability: 'high', reasoning: 'Classic presentation', urgent: false },
      ],
    },
    appointments: [
      {
        id: 'appt-005',
        patientId: 'pat-005',
        assessmentId: 'assess-005',
        scheduledAt: getRelativeDate(0, 11, 0),
        duration: 30,
        type: 'urgent',
        status: 'scheduled',
        provider: 'Dr. Thomas Reed',
        reason: 'Urgent: RUQ pain, r/o cholecystitis',
      },
    ],
    avatarColor: avatarColors[4],
  },

  // Patient 6: ROUTINE - Mental Health Follow-up
  {
    id: 'pat-006',
    mrn: 'MRN-2024-006',
    firstName: 'Michael',
    lastName: 'Thompson',
    dateOfBirth: '1992-06-20',
    age: 32,
    gender: 'Male',
    email: 'michael.thompson@email.com',
    phone: '(303) 555-0106',
    insurancePlan: 'Kaiser Permanente',
    allergies: [],
    medications: [
      { name: 'Sertraline', dosage: '100mg', frequency: 'Daily' },
      { name: 'Trazodone', dosage: '50mg', frequency: 'QHS PRN' },
    ],
    medicalHistory: ['Generalized Anxiety Disorder', 'Major Depressive Disorder'],
    currentAssessment: {
      id: 'assess-006',
      patientId: 'pat-006',
      submittedAt: getRelativeDate(-1, 16, 30),
      status: 'pending',
      urgencyLevel: 'routine',
      chiefComplaint: 'Medication check, doing better but still some anxiety',
      redFlags: [],
      aiSummary: '32-year-old male with GAD/MDD on Sertraline 100mg. PHQ-9 improved from 18 to 8. Sober 6 months.',
      aiDifferentialDiagnosis: [
        { diagnosis: 'GAD - partially controlled', probability: 'high', reasoning: 'Ongoing symptoms', urgent: false },
      ],
    },
    appointments: [
      {
        id: 'appt-006',
        patientId: 'pat-006',
        assessmentId: 'assess-006',
        scheduledAt: getRelativeDate(0, 11, 30),
        duration: 20,
        type: 'follow_up',
        status: 'scheduled',
        provider: 'Dr. Thomas Reed',
        reason: 'Psychiatric medication follow-up',
      },
    ],
    avatarColor: avatarColors[5],
  },

  // Patient 7: ROUTINE - Telehealth URI
  {
    id: 'pat-007',
    mrn: 'MRN-2024-007',
    firstName: 'Ashley',
    lastName: 'Brown',
    dateOfBirth: '1998-12-05',
    age: 26,
    gender: 'Female',
    email: 'ashley.brown@email.com',
    phone: '(303) 555-0107',
    insurancePlan: 'Anthem Blue Cross',
    allergies: [{ allergen: 'Amoxicillin', reaction: 'Rash', severity: 'mild' }],
    medications: [{ name: 'Birth control', dosage: '1 tab', frequency: 'Daily' }],
    medicalHistory: [],
    currentAssessment: {
      id: 'assess-007',
      patientId: 'pat-007',
      submittedAt: getRelativeDate(0, 7, 0),
      status: 'pending',
      urgencyLevel: 'routine',
      chiefComplaint: 'Cold symptoms - congestion, sore throat, cough',
      redFlags: [],
      aiSummary: '26-year-old healthy female with 4 days of URI symptoms. Sick contact. Low-grade fever. Consistent with viral URI.',
      aiDifferentialDiagnosis: [
        { diagnosis: 'Viral URI', probability: 'high', reasoning: 'Classic symptoms, sick contact', urgent: false },
      ],
    },
    appointments: [
      {
        id: 'appt-007',
        patientId: 'pat-007',
        assessmentId: 'assess-007',
        scheduledAt: getRelativeDate(0, 14, 0),
        duration: 15,
        type: 'telehealth',
        status: 'scheduled',
        provider: 'Dr. Thomas Reed',
        reason: 'Telehealth: URI symptoms',
      },
    ],
    avatarColor: avatarColors[6],
  },

  // Patient 8: ROUTINE - Post-procedure Follow-up
  {
    id: 'pat-008',
    mrn: 'MRN-2024-008',
    firstName: 'David',
    lastName: 'Lee',
    dateOfBirth: '1970-04-18',
    age: 54,
    gender: 'Male',
    email: 'david.lee@email.com',
    phone: '(303) 555-0108',
    insurancePlan: 'Humana Gold Plus',
    allergies: [],
    medications: [{ name: 'Amlodipine', dosage: '5mg', frequency: 'Daily' }],
    medicalHistory: ['Hypertension', 'Colonic polyps'],
    currentAssessment: {
      id: 'assess-008',
      patientId: 'pat-008',
      submittedAt: getRelativeDate(-1, 9, 0),
      status: 'pending',
      urgencyLevel: 'routine',
      chiefComplaint: 'Post-colonoscopy follow-up, review pathology results',
      redFlags: [],
      aiSummary: '54-year-old male 1 week post-colonoscopy. 3 adenomatous polyps removed. No complications.',
      aiDifferentialDiagnosis: [],
    },
    appointments: [
      {
        id: 'appt-008',
        patientId: 'pat-008',
        assessmentId: 'assess-008',
        scheduledAt: getRelativeDate(0, 14, 30),
        duration: 20,
        type: 'follow_up',
        status: 'scheduled',
        provider: 'Dr. Thomas Reed',
        reason: 'Post-colonoscopy follow-up',
      },
    ],
    avatarColor: avatarColors[7],
  },

  // Patient 9: ROUTINE - New Patient Joint Pain
  {
    id: 'pat-009',
    mrn: 'MRN-2024-009',
    firstName: 'Patricia',
    lastName: 'Anderson',
    dateOfBirth: '1962-08-30',
    age: 62,
    gender: 'Female',
    email: 'patricia.anderson@email.com',
    phone: '(303) 555-0109',
    insurancePlan: 'Medicare',
    allergies: [{ allergen: 'NSAIDs', reaction: 'GI upset', severity: 'moderate' }],
    medications: [{ name: 'Acetaminophen', dosage: '650mg', frequency: 'TID PRN' }],
    medicalHistory: ['Osteoarthritis', 'Osteoporosis', 'CKD Stage 2'],
    currentAssessment: {
      id: 'assess-009',
      patientId: 'pat-009',
      submittedAt: getRelativeDate(-2, 11, 0),
      status: 'pending',
      urgencyLevel: 'routine',
      chiefComplaint: 'New patient - worsening knee and hip pain',
      redFlags: [],
      aiSummary: '62-year-old female new patient with progressive OA. Cannot use NSAIDs due to CKD. Needs comprehensive OA management.',
      aiDifferentialDiagnosis: [
        { diagnosis: 'Osteoarthritis', probability: 'high', reasoning: 'Age, gradual onset, mechanical symptoms', urgent: false },
      ],
    },
    appointments: [
      {
        id: 'appt-009',
        patientId: 'pat-009',
        assessmentId: 'assess-009',
        scheduledAt: getRelativeDate(0, 15, 0),
        duration: 40,
        type: 'new_patient',
        status: 'scheduled',
        provider: 'Dr. Thomas Reed',
        reason: 'New patient: Chronic joint pain',
      },
    ],
    avatarColor: avatarColors[8],
  },

  // Patient 10: ROUTINE - Hypertension Follow-up
  {
    id: 'pat-010',
    mrn: 'MRN-2024-010',
    firstName: 'William',
    lastName: 'Taylor',
    dateOfBirth: '1978-01-15',
    age: 47,
    gender: 'Male',
    email: 'william.taylor@email.com',
    phone: '(303) 555-0110',
    insurancePlan: 'UnitedHealthcare',
    allergies: [],
    medications: [
      { name: 'Lisinopril', dosage: '20mg', frequency: 'Daily' },
      { name: 'HCTZ', dosage: '25mg', frequency: 'Daily' },
    ],
    medicalHistory: ['Hypertension', 'Pre-diabetes', 'Obesity'],
    currentAssessment: {
      id: 'assess-010',
      patientId: 'pat-010',
      submittedAt: getRelativeDate(0, 8, 0),
      status: 'pending',
      urgencyLevel: 'routine',
      chiefComplaint: 'Blood pressure check, still running high at home',
      redFlags: [
        { id: 'rf-006', description: 'Uncontrolled HTN despite dual therapy', category: 'cardiovascular', severity: 'warning' },
      ],
      aiSummary: '47-year-old male with uncontrolled HTN on dual therapy. Home BP 145-155/90-95. BMI 32.3. Needs medication optimization.',
      aiDifferentialDiagnosis: [
        { diagnosis: 'Resistant Hypertension', probability: 'high', reasoning: 'Uncontrolled on 2 agents', urgent: false },
      ],
    },
    appointments: [
      {
        id: 'appt-010',
        patientId: 'pat-010',
        assessmentId: 'assess-010',
        scheduledAt: getRelativeDate(0, 15, 30),
        duration: 20,
        type: 'follow_up',
        status: 'scheduled',
        provider: 'Dr. Thomas Reed',
        reason: 'Hypertension management',
      },
    ],
    avatarColor: avatarColors[9],
  },
];

// =============================================================================
// Repository Access Functions
// =============================================================================

export const getAllPatients = (): Patient[] => PATIENTS;

export const getPatientById = (id: string): Patient | undefined => 
  PATIENTS.find(p => p.id === id);

export const getAllAssessments = (): AssessmentSubmission[] => 
  PATIENTS.filter(p => p.currentAssessment).map(p => p.currentAssessment!);

export const getAssessmentsByStatus = (status: AssessmentStatus): AssessmentSubmission[] => 
  getAllAssessments().filter(a => a.status === status);

export const getAssessmentsByUrgency = (urgency: UrgencyLevel): AssessmentSubmission[] => 
  getAllAssessments().filter(a => a.urgencyLevel === urgency);

export const getTodaysAppointments = (): (Appointment & { patient: Patient })[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const appointments: (Appointment & { patient: Patient })[] = [];
  PATIENTS.forEach(patient => {
    patient.appointments.forEach(appt => {
      const apptDate = new Date(appt.scheduledAt);
      if (apptDate >= today && apptDate < tomorrow) {
        appointments.push({ ...appt, patient });
      }
    });
  });

  return appointments.sort((a, b) => 
    new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
  );
};

export const getAppointmentsForDateRange = (start: Date, end: Date): (Appointment & { patient: Patient })[] => {
  const appointments: (Appointment & { patient: Patient })[] = [];
  PATIENTS.forEach(patient => {
    patient.appointments.forEach(appt => {
      const apptDate = new Date(appt.scheduledAt);
      if (apptDate >= start && apptDate <= end) {
        appointments.push({ ...appt, patient });
      }
    });
  });
  return appointments.sort((a, b) => 
    new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
  );
};

export const getUrgentAssessments = (): (AssessmentSubmission & { patient: Patient })[] => 
  PATIENTS
    .filter(p => p.currentAssessment && 
      (p.currentAssessment.urgencyLevel === 'urgent' || p.currentAssessment.urgencyLevel === 'emergent') &&
      p.currentAssessment.status === 'pending'
    )
    .map(p => ({ ...p.currentAssessment!, patient: p }));

export const getStatistics = () => {
  const assessments = getAllAssessments();
  const todaysAppts = getTodaysAppointments();
  return {
    totalPatients: PATIENTS.length,
    pendingAssessments: assessments.filter(a => a.status === 'pending').length,
    urgentAssessments: assessments.filter(a => 
      (a.urgencyLevel === 'urgent' || a.urgencyLevel === 'emergent') && a.status === 'pending'
    ).length,
    todaysAppointments: todaysAppts.length,
  };
};

export const searchPatients = (query: string): Patient[] => {
  const lowerQuery = query.toLowerCase();
  return PATIENTS.filter(p => 
    p.firstName.toLowerCase().includes(lowerQuery) ||
    p.lastName.toLowerCase().includes(lowerQuery) ||
    p.mrn.toLowerCase().includes(lowerQuery)
  );
};
