if (process.env.NODE_ENV === 'production') {
  console.warn('[MOCK DATA] This module should not be imported in production builds');
}

import type { Message, MessagePriority, MessageType, PatientDetails } from '../store/useInbox';

const patientNames = [
  'Emily Chen', 'Robert Martinez', 'Sarah Johnson', 'Michael Thompson', 'Patricia Anderson',
  'James Wilson', 'Maria Garcia', 'David Lee', 'Ashley Brown', 'William Taylor'
];

const conditions = [
  ['Type 2 Diabetes', 'Hypertension', 'Hyperlipidemia'],
  ['CAD', 'Hypertension', 'Type 2 Diabetes'],
  ['Migraines', 'Anxiety'],
  ['GAD', 'Major Depressive Disorder'],
  ['Osteoarthritis', 'CKD Stage 2'],
  ['Seasonal Allergies'],
  ['GERD', 'Anxiety'],
  ['Hypertension', 'Colonic Polyps'],
  ['Asthma'],
  ['Hypertension', 'Pre-diabetes', 'Obesity']
];

const allergies = [
  ['None'],
  ['Aspirin'],
  ['Penicillin', 'Sulfa'],
  ['None'],
  ['NSAIDs'],
  ['Shellfish'],
  ['Codeine'],
  ['None'],
  ['Amoxicillin'],
  ['None']
];

const medications = [
  ['Metformin 1000mg BID', 'Lisinopril 20mg daily', 'Atorvastatin 40mg QHS'],
  ['Metoprolol 50mg BID', 'Clopidogrel 75mg daily', 'Atorvastatin 40mg QHS'],
  ['Sumatriptan 100mg PRN', 'Topiramate 50mg daily'],
  ['Sertraline 100mg daily', 'Trazodone 50mg QHS PRN'],
  ['Acetaminophen 650mg TID PRN', 'Vitamin D 2000 IU daily'],
  ['Cetirizine 10mg daily'],
  ['Omeprazole 20mg daily'],
  ['Amlodipine 5mg daily'],
  ['Albuterol inhaler PRN', 'Fluticasone inhaler daily'],
  ['Lisinopril 20mg daily', 'HCTZ 25mg daily']
];

// Realistic email subjects that will trigger AI features
const emailSubjects = [
  'Need to get my labs done',
  'Refill request - Metformin',
  'Feeling more tired than usual',
  'Question about my A1c',
  'Need cholesterol checked',
  'Medication side effects',
  'Annual checkup labs',
  'Blood pressure concerns',
  'Thyroid check needed',
  'Routine lab work request'
];

// Realistic lab request messages
const labRequestMessages = [
  `Dear Dr. Reed,\n\nI wanted to check if it's time for my routine lab work. I believe my last A1c was about 3 months ago and I want to make sure my diabetes is still under control.\n\nCould you please order my labs so I can get them done this week? I'm available to go to Quest or Labcorp anytime.\n\nThank you!`,
  
  `Hi Dr. Reed,\n\nI've been feeling more tired than usual lately. My mom mentioned I should get my thyroid checked since she has thyroid problems.\n\nCould you order a thyroid panel for me? I'd also like to get my cholesterol checked since it's been about a year.\n\nThanks!`,
  
  `Hello,\n\nIt's been a while since my last blood work and I'd like to get my routine labs done. I think I'm due for my A1c, lipid panel, and kidney function tests based on what we discussed at my last visit.\n\nPlease let me know when I can get these done.\n\nBest regards`,
  
  `Dr. Reed,\n\nI'm planning to apply for life insurance and they need recent blood work. Could you order a complete metabolic panel, CBC, and lipid panel?\n\nI can go to the lab anytime this week.\n\nThank you!`,
  
  `Hi,\n\nI've been having some unusual symptoms - fatigue, hair loss, and feeling cold all the time. My friend suggested I might have a vitamin deficiency or thyroid issue.\n\nCould you order some labs to check? I'm thinking Vitamin D, B12, and maybe thyroid?\n\nThanks for your help!`,
];

// Symptom report messages
const symptomReportMessages = [
  `Dr. Reed,\n\nI've been having chest discomfort on and off for the past few days. It's not severe pain, more like a tightness, especially when I'm stressed or after meals. No shortness of breath.\n\nShould I be concerned? I have my blood pressure medication but wonder if I need to come in.\n\nThank you`,
  
  `Hello,\n\nI've had a persistent headache for 3 days now. Tylenol helps a little but it keeps coming back. I also feel a bit nauseous in the mornings.\n\nIs there anything stronger I can take? Or should I schedule an appointment?\n\nThanks`,
  
  `Hi Dr. Reed,\n\nI've been feeling dizzy when I stand up quickly. It started about a week ago. I'm not sure if it's related to my blood pressure medication that was increased last month.\n\nCan you advise? Should I stop taking it?\n\nBest regards`,
];

const phoneMessages = [
  'Called about test results - wants callback',
  'Requesting refill approval - Metformin',
  'Questions about medication side effects',
  'Reporting improvement in symptoms',
  'Needs prior authorization form',
  'Concerned about recent weight gain',
  'Lab results question',
  'Needs referral to specialist',
  'Follow-up on recent visit',
  'Insurance question about medications'
];

const labResults = [
  'HbA1c - Results: 7.2% (improved from 7.8%)',
  'Lipid Panel - LDL elevated at 118 mg/dL',
  'Thyroid Panel - TSH normal at 2.5',
  'CMP - All values within normal limits',
  'CBC - Mild anemia noted',
  'Vitamin D - Low at 22 ng/mL',
  'Kidney Function - Creatinine stable',
  'Liver Function - Slight elevation',
  'Fasting Glucose - 142 mg/dL (elevated)',
  'Urinalysis - Trace protein'
];

function generatePatientDetails(index: number): PatientDetails {
  const ages = [49, 66, 34, 32, 62, 39, 56, 54, 26, 47];
  const lastVisitDays = [45, 30, 90, 14, 60, 180, 21, 7, 120, 30];
  const lastVisitDate = new Date();
  lastVisitDate.setDate(lastVisitDate.getDate() - lastVisitDays[index % 10]);

  return {
    id: `PAT-${1000 + index}`,
    name: patientNames[index % patientNames.length],
    age: `${ages[index % 10]} years`,
    dateOfBirth: `${(index % 12) + 1}/${(index % 28) + 1}/${2024 - ages[index % 10]}`,
    allergies: allergies[index % allergies.length],
    lastVisit: lastVisitDate.toLocaleDateString(),
    conditions: conditions[index % conditions.length],
    mrn: `MRN-2024-${String(index + 1).padStart(3, '0')}`
  };
}

function generateMessageContent(type: MessageType, index: number): string {
  switch (type) {
    case 'email': {
      // Rotate through different message types
      if (index % 4 === 0) {
        return labRequestMessages[index % labRequestMessages.length];
      } else if (index % 4 === 1) {
        return symptomReportMessages[index % symptomReportMessages.length];
      }
      return labRequestMessages[(index + 2) % labRequestMessages.length];
    }
    
    case 'phone': {
      // Use deterministic suffix based on index instead of Math.random()
      const phoneSuffix = String(1000 + ((index * 7 + 3) % 9000)).padStart(4, '0');
      return `Phone message received at ${new Date().toLocaleTimeString()}\n\nPatient called regarding: ${phoneMessages[index % phoneMessages.length]}\n\nPatient requested a callback at their preferred number ending in -${phoneSuffix}.\n\nUrgency level: ${index % 3 === 0 ? 'High - patient waiting' : 'Normal'}\n\nAdditional notes: Patient ${index % 2 === 0 ? 'needs response today' : 'can wait until tomorrow'}.`;
    }
    
    case 'lab': {
      const patientDetails = generatePatientDetails(index);
      return `Lab Results Summary\n\n${labResults[index % labResults.length]}\n\nOrdered by: Dr. Thomas Reed\nCollection Date: ${new Date(Date.now() - 86400000 * 2).toLocaleDateString()}\nReceived: ${new Date().toLocaleDateString()}\n\nPatient: ${patientDetails.name}\nMRN: ${patientDetails.mrn}\n\nKey Findings:\n- ${index % 2 === 0 ? 'Some values outside normal range - review recommended' : 'Most values within normal limits'}\n- ${index % 3 === 0 ? 'Trend improving from previous results' : 'Stable compared to last visit'}\n\nAction Required: ${index % 2 === 0 ? 'Review and contact patient' : 'File in chart, routine follow-up'}`;
    }
    
    case 'refill': {
      const patientInfo = generatePatientDetails(index);
      // Use deterministic values based on index instead of Math.random()
      const pharmacyNum = 100 + ((index * 13 + 5) % 900);
      const refillsRemaining = index % 2;
      return `Prescription Refill Request\n\nPatient: ${patientInfo.name}\nMRN: ${patientInfo.mrn}\nPharmacy: ${index % 2 === 0 ? 'CVS Pharmacy' : 'Walgreens'} #${pharmacyNum}\n\nMedications requested:\n${medications[index % medications.length].map(med => `• ${med}`).join('\n')}\n\nLast filled: ${new Date(Date.now() - 86400000 * 25).toLocaleDateString()}\nRefills remaining: ${refillsRemaining}\n\nLast office visit: ${patientInfo.lastVisit}\nActive conditions: ${conditions[index % conditions.length].join(', ')}\n\nPharmacy notes: ${index % 2 === 0 ? 'Patient has been on this medication for 2+ years' : 'Standard refill request'}`;
    }
    
    case 'biomistral-assessment': {
      return `BioMistral-7B Clinical Assessment\n\nThis patient completed a pre-visit assessment via COMPASS.\n\nChief Complaint: ${emailSubjects[index % emailSubjects.length]}\n\nSummary: Patient reports ongoing concerns related to their chronic conditions. Vital signs were self-reported as stable.\n\nRecommendation: Review assessment and prepare for upcoming visit.`;
    }
    
    default:
      return 'Message content';
  }
}

export function generateMockMessages(count: number = 20): Message[] {
  const messages: Message[] = [];
  const types: MessageType[] = ['email', 'email', 'refill', 'lab', 'phone', 'email']; // More emails
  const priorities: MessagePriority[] = ['urgent', 'high', 'normal', 'normal', 'low'];

  for (let i = 0; i < count; i++) {
    const type = types[i % types.length];
    const priority = i % 5 === 0 ? 'urgent' : priorities[i % priorities.length];
    const isUnread = i < 8; // First 8 messages are unread
    const createdAt = new Date(Date.now() - (i * 3600000 * 4)); // Spread over time
    const patientDetails = generatePatientDetails(i);

    const content = generateMessageContent(type, i);
    const isLabRequest = /lab|a1c|cholesterol|thyroid|blood work|vitamin/i.test(content);

    const message: Message = {
      id: i + 1,
      patientDetails,
      type,
      priority: isLabRequest && type === 'email' ? 'normal' : priority,
      status: isUnread ? 'unread' : 'read',
      subject: type === 'email' ? emailSubjects[i % emailSubjects.length] : 
               type === 'lab' ? labResults[i % labResults.length] :
               type === 'phone' ? `Phone: ${phoneMessages[i % phoneMessages.length].substring(0, 30)}...` : 
               'Prescription Refill Request',
      preview: content.substring(0, 120) + '...',
      content,
      createdAt,
      updatedAt: createdAt,
      medications: type === 'refill' ? medications[i % medications.length] : undefined,
      attachments: type === 'lab' ? [{
        id: `att-${i}`,
        name: `lab-results-${patientDetails.mrn}.pdf`,
        type: 'application/pdf',
        url: '#',
        size: 100 + ((i * 37 + 11) % 500)
      }] : undefined,
      labels: [
        ...(priority === 'urgent' ? ['urgent'] : []),
        ...(type === 'lab' && i % 3 === 0 ? ['abnormal'] : []),
        ...(type === 'refill' ? ['pharmacy'] : []),
        ...(isLabRequest ? ['lab-request'] : []),
        ...(i % 4 === 0 ? ['follow-up'] : [])
      ],
      responseRequired: priority === 'urgent' || priority === 'high' || type === 'refill',
      aiAnalysis: {
        summary: isLabRequest 
          ? `Patient ${patientDetails.name} is requesting routine laboratory testing. Based on their medical history of ${patientDetails.conditions.join(', ')}, appropriate labs would include metabolic panel and disease-specific monitoring.`
          : type === 'refill'
          ? `Patient ${patientDetails.name} is requesting medication refills. Last visit was ${patientDetails.lastVisit}. Current medications appear appropriate for their conditions.`
          : `Patient ${patientDetails.name} has sent a message requiring provider attention. Medical history includes ${patientDetails.conditions.join(', ')}.`,
        recommendations: isLabRequest ? [
          'Order routine labs based on patient conditions',
          'Include HbA1c if diabetic (due every 3 months)',
          'Include lipid panel if on statin therapy',
          'Consider kidney function tests annually'
        ] : type === 'refill' ? [
          'Verify medication compliance at last visit',
          'Check for drug interactions',
          'Confirm appropriate refill quantity',
          'Schedule follow-up if overdue'
        ] : [
          'Review message content carefully',
          'Consider patient history',
          'Determine urgency of response needed'
        ],
        riskFactors: [
          ...(patientDetails.conditions.includes('Type 2 Diabetes') ? ['Diabetes requires monitoring'] : []),
          ...(patientDetails.conditions.includes('Hypertension') ? ['Cardiovascular risk factors present'] : []),
          ...(patientDetails.conditions.includes('CKD Stage 2') ? ['Renal function impaired - avoid nephrotoxic drugs'] : []),
        ],
        suggestedActions: isLabRequest ? [
          'Approve lab order',
          'Order HbA1c',
          'Order Lipid Panel', 
          'Order CMP'
        ] : type === 'refill' ? [
          'Approve refill',
          'Send to pharmacy',
          'Schedule follow-up'
        ] : [
          'Reply to patient',
          'Schedule appointment',
          'Order tests'
        ]
      }
    };

    messages.push(message);
  }

  return messages.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

// =============================================================================
// Appointment Data
// =============================================================================

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  mrn: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  avatarColor: string;
  insurancePlan: string;
  currentAssessment?: {
    id: string;
    urgencyLevel: 'routine' | 'urgent' | 'emergent';
    chiefComplaint: string;
    redFlags: string[];
    status: 'pending' | 'completed';
  };
}

interface Appointment {
  id: string;
  scheduledAt: Date;
  duration: number;
  type: 'Office Visit' | 'Follow-up' | 'Annual Wellness' | 'Urgent' | 'New Patient';
  status: 'scheduled' | 'checked-in' | 'in-progress' | 'completed' | 'cancelled';
  reason: string;
  provider: string;
  patient: Patient;
}

const mockPatients: Patient[] = [
  { id: 'P001', firstName: 'Emily', lastName: 'Chen', mrn: 'MRN-2024-001', age: 49, gender: 'Female', avatarColor: '#7c3aed', insurancePlan: 'Blue Cross PPO', currentAssessment: { id: 'A001', urgencyLevel: 'routine', chiefComplaint: 'Diabetes follow-up', redFlags: [], status: 'completed' } },
  { id: 'P002', firstName: 'Robert', lastName: 'Martinez', mrn: 'MRN-2024-002', age: 66, gender: 'Male', avatarColor: '#2563eb', insurancePlan: 'Medicare', currentAssessment: { id: 'A002', urgencyLevel: 'urgent', chiefComplaint: 'Chest pain', redFlags: ['History of CAD', 'Chest pain at rest'], status: 'completed' } },
  { id: 'P003', firstName: 'Sarah', lastName: 'Johnson', mrn: 'MRN-2024-003', age: 34, gender: 'Female', avatarColor: '#db2777', insurancePlan: 'Aetna HMO' },
  { id: 'P004', firstName: 'Michael', lastName: 'Thompson', mrn: 'MRN-2024-004', age: 32, gender: 'Male', avatarColor: '#059669', insurancePlan: 'United Healthcare' },
  { id: 'P005', firstName: 'Patricia', lastName: 'Anderson', mrn: 'MRN-2024-005', age: 62, gender: 'Female', avatarColor: '#d97706', insurancePlan: 'Cigna PPO', currentAssessment: { id: 'A003', urgencyLevel: 'routine', chiefComplaint: 'Annual physical', redFlags: [], status: 'pending' } },
];

const generateTodaysAppointments = (): Appointment[] => {
  const today = new Date();
  today.setHours(8, 0, 0, 0);
  
  const appointments: Appointment[] = [
    { id: 'APT001', scheduledAt: new Date(today.getTime()), duration: 30, type: 'Follow-up', status: 'completed', reason: 'Diabetes management', provider: 'Dr. Thomas Reed', patient: mockPatients[0] },
    { id: 'APT002', scheduledAt: new Date(today.getTime() + 30 * 60000), duration: 30, type: 'Urgent', status: 'in-progress', reason: 'Chest pain evaluation', provider: 'Dr. Thomas Reed', patient: mockPatients[1] },
    { id: 'APT003', scheduledAt: new Date(today.getTime() + 60 * 60000), duration: 20, type: 'Office Visit', status: 'checked-in', reason: 'Migraine consultation', provider: 'Dr. Thomas Reed', patient: mockPatients[2] },
    { id: 'APT004', scheduledAt: new Date(today.getTime() + 90 * 60000), duration: 30, type: 'Follow-up', status: 'scheduled', reason: 'Anxiety follow-up', provider: 'Dr. Thomas Reed', patient: mockPatients[3] },
    { id: 'APT005', scheduledAt: new Date(today.getTime() + 120 * 60000), duration: 45, type: 'Annual Wellness', status: 'scheduled', reason: 'Annual physical', provider: 'Dr. Thomas Reed', patient: mockPatients[4] },
  ];
  
  return appointments;
};

export function getTodaysAppointments(): Appointment[] {
  return generateTodaysAppointments();
}

export function getAppointmentsForDateRange(start: Date, end: Date): Appointment[] {
  const appointments = generateTodaysAppointments();
  return appointments.filter(appt => appt.scheduledAt >= start && appt.scheduledAt <= end);
}

// =============================================================================
// Assessment Data
// =============================================================================

export type AssessmentStatus = 'pending' | 'in_progress' | 'completed' | 'reviewed';
export type UrgencyLevel = 'routine' | 'urgent' | 'emergent';

interface Assessment {
  id: string;
  patientId: string;
  status: AssessmentStatus;
  urgencyLevel: UrgencyLevel;
  chiefComplaint: string;
  redFlags: string[];
  symptoms: string[];
  duration: string;
  createdAt: Date;
  completedAt?: Date;
  patient: Patient;
}

interface PatientFull extends Patient {
  allergies: string[];
  medications: string[];
  medicalHistory: string[];
}

const mockPatientsFull: PatientFull[] = [
  { id: 'P001', firstName: 'Emily', lastName: 'Chen', mrn: 'MRN-2024-001', age: 49, gender: 'Female', avatarColor: '#7c3aed', insurancePlan: 'Blue Cross PPO', allergies: ['Penicillin'], medications: ['Metformin 1000mg BID', 'Lisinopril 20mg daily'], medicalHistory: ['Type 2 Diabetes', 'Hypertension'] },
  { id: 'P002', firstName: 'Robert', lastName: 'Martinez', mrn: 'MRN-2024-002', age: 66, gender: 'Male', avatarColor: '#2563eb', insurancePlan: 'Medicare', allergies: ['Sulfa'], medications: ['Aspirin 81mg daily', 'Metoprolol 50mg BID'], medicalHistory: ['CAD', 'Prior MI', 'Hypertension'] },
  { id: 'P003', firstName: 'Sarah', lastName: 'Johnson', mrn: 'MRN-2024-003', age: 34, gender: 'Female', avatarColor: '#db2777', insurancePlan: 'Aetna HMO', allergies: [], medications: ['Sumatriptan 100mg PRN'], medicalHistory: ['Migraines'] },
  { id: 'P004', firstName: 'Michael', lastName: 'Thompson', mrn: 'MRN-2024-004', age: 32, gender: 'Male', avatarColor: '#059669', insurancePlan: 'United Healthcare', allergies: [], medications: ['Sertraline 100mg daily'], medicalHistory: ['GAD', 'Depression'] },
  { id: 'P005', firstName: 'Patricia', lastName: 'Anderson', mrn: 'MRN-2024-005', age: 62, gender: 'Female', avatarColor: '#d97706', insurancePlan: 'Cigna PPO', allergies: ['NSAIDs'], medications: ['Acetaminophen PRN'], medicalHistory: ['Osteoarthritis', 'CKD Stage 2'] },
];

const mockAssessments: Assessment[] = [
  { id: 'A001', patientId: 'P001', status: 'completed', urgencyLevel: 'routine', chiefComplaint: 'Diabetes follow-up', redFlags: [], symptoms: ['Increased thirst', 'Fatigue'], duration: '2 weeks', createdAt: new Date(Date.now() - 86400000), completedAt: new Date(Date.now() - 3600000), patient: mockPatientsFull[0] },
  { id: 'A002', patientId: 'P002', status: 'completed', urgencyLevel: 'urgent', chiefComplaint: 'Chest pain', redFlags: ['History of CAD', 'Chest pain at rest', 'Diaphoresis'], symptoms: ['Chest pressure', 'Shortness of breath', 'Sweating'], duration: '2 hours', createdAt: new Date(Date.now() - 7200000), completedAt: new Date(Date.now() - 3600000), patient: mockPatientsFull[1] },
  { id: 'A003', patientId: 'P003', status: 'in_progress', urgencyLevel: 'routine', chiefComplaint: 'Severe headache', redFlags: [], symptoms: ['Throbbing headache', 'Nausea', 'Light sensitivity'], duration: '6 hours', createdAt: new Date(Date.now() - 1800000), patient: mockPatientsFull[2] },
  { id: 'A004', patientId: 'P004', status: 'pending', urgencyLevel: 'routine', chiefComplaint: 'Anxiety follow-up', redFlags: [], symptoms: ['Worry', 'Sleep difficulty'], duration: 'Ongoing', createdAt: new Date(Date.now() - 900000), patient: mockPatientsFull[3] },
  { id: 'A005', patientId: 'P005', status: 'reviewed', urgencyLevel: 'routine', chiefComplaint: 'Annual physical', redFlags: [], symptoms: [], duration: 'N/A', createdAt: new Date(Date.now() - 172800000), completedAt: new Date(Date.now() - 86400000), patient: mockPatientsFull[4] },
];

export function getAllAssessments(): Assessment[] {
  return mockAssessments;
}

export function getAssessmentsByStatus(status: AssessmentStatus): Assessment[] {
  return mockAssessments.filter(a => a.status === status);
}

export function getAssessmentsByUrgency(urgency: UrgencyLevel): Assessment[] {
  return mockAssessments.filter(a => a.urgencyLevel === urgency);
}

export function getUrgentAssessments(): Assessment[] {
  return mockAssessments.filter(a => a.urgencyLevel === 'urgent' || a.urgencyLevel === 'emergent');
}

export function getPatientById(patientId: string): PatientFull | undefined {
  return mockPatientsFull.find(p => p.id === patientId);
}

// =============================================================================
// Extended Patient Data for Patients API
// =============================================================================

interface PatientExtended {
  id: string;
  firstName: string;
  lastName: string;
  mrn: string;
  dateOfBirth: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  phone: string;
  email: string;
  avatarColor: string;
  insurancePlan: string;
  allergies: { allergen: string; severity: 'mild' | 'moderate' | 'severe' }[];
  medications: string[];
  medicalHistory: string[];
  currentAssessment?: {
    id: string;
    status: 'pending' | 'in_progress' | 'completed';
    urgencyLevel: 'routine' | 'urgent' | 'emergent';
    chiefComplaint: string;
    submittedAt: Date;
    redFlags: string[];
  };
}

const mockPatientsExtended: PatientExtended[] = [
  { id: 'P001', firstName: 'Emily', lastName: 'Chen', mrn: 'MRN-2024-001', dateOfBirth: '1975-04-12', age: 49, gender: 'Female', phone: '(303) 555-0101', email: 'emily.chen@email.com', avatarColor: '#7c3aed', insurancePlan: 'Blue Cross PPO', allergies: [{ allergen: 'Penicillin', severity: 'severe' }], medications: ['Metformin 1000mg BID', 'Lisinopril 20mg daily'], medicalHistory: ['Type 2 Diabetes', 'Hypertension'], currentAssessment: { id: 'A001', status: 'completed', urgencyLevel: 'routine', chiefComplaint: 'Diabetes follow-up', submittedAt: new Date(Date.now() - 86400000), redFlags: [] } },
  { id: 'P002', firstName: 'Robert', lastName: 'Martinez', mrn: 'MRN-2024-002', dateOfBirth: '1958-07-22', age: 66, gender: 'Male', phone: '(303) 555-0142', email: 'robert.martinez@email.com', avatarColor: '#2563eb', insurancePlan: 'Medicare', allergies: [{ allergen: 'Sulfa', severity: 'moderate' }], medications: ['Aspirin 81mg daily', 'Metoprolol 50mg BID', 'Atorvastatin 40mg QHS'], medicalHistory: ['CAD', 'Prior MI', 'Hypertension'], currentAssessment: { id: 'A002', status: 'completed', urgencyLevel: 'urgent', chiefComplaint: 'Chest pain', submittedAt: new Date(Date.now() - 7200000), redFlags: ['History of CAD', 'Chest pain at rest'] } },
  { id: 'P003', firstName: 'Sarah', lastName: 'Johnson', mrn: 'MRN-2024-003', dateOfBirth: '1990-03-15', age: 34, gender: 'Female', phone: '(303) 555-0198', email: 'sarah.johnson@email.com', avatarColor: '#db2777', insurancePlan: 'Aetna HMO', allergies: [], medications: ['Sumatriptan 100mg PRN'], medicalHistory: ['Migraines'] },
  { id: 'P004', firstName: 'Michael', lastName: 'Thompson', mrn: 'MRN-2024-004', dateOfBirth: '1992-09-03', age: 32, gender: 'Male', phone: '(303) 555-0156', email: 'michael.thompson@email.com', avatarColor: '#059669', insurancePlan: 'United Healthcare', allergies: [], medications: ['Sertraline 100mg daily'], medicalHistory: ['GAD', 'Depression'] },
  { id: 'P005', firstName: 'Patricia', lastName: 'Anderson', mrn: 'MRN-2024-005', dateOfBirth: '1962-02-28', age: 62, gender: 'Female', phone: '(303) 555-0167', email: 'patricia.anderson@email.com', avatarColor: '#d97706', insurancePlan: 'Cigna PPO', allergies: [{ allergen: 'NSAIDs', severity: 'mild' }], medications: ['Acetaminophen PRN', 'Vitamin D 2000IU daily'], medicalHistory: ['Osteoarthritis', 'CKD Stage 2'] },
  { id: 'P006', firstName: 'James', lastName: 'Wilson', mrn: 'MRN-2024-006', dateOfBirth: '1969-09-10', age: 55, gender: 'Male', phone: '(303) 555-0178', email: 'james.wilson@email.com', avatarColor: '#6366f1', insurancePlan: 'Blue Shield', allergies: [], medications: ['Albuterol inhaler PRN', 'Tiotropium daily'], medicalHistory: ['COPD', 'Former smoker'] },
  { id: 'P007', firstName: 'Maria', lastName: 'Garcia', mrn: 'MRN-2024-007', dateOfBirth: '1968-03-22', age: 56, gender: 'Female', phone: '(303) 555-0189', email: 'maria.garcia@email.com', avatarColor: '#ec4899', insurancePlan: 'Kaiser', allergies: [{ allergen: 'Codeine', severity: 'moderate' }], medications: ['Metformin 1000mg BID', 'Glipizide 5mg daily'], medicalHistory: ['Type 2 Diabetes'] },
  { id: 'P008', firstName: 'David', lastName: 'Lee', mrn: 'MRN-2024-008', dateOfBirth: '1970-06-19', age: 54, gender: 'Male', phone: '(303) 555-0190', email: 'david.lee@email.com', avatarColor: '#14b8a6', insurancePlan: 'Anthem', allergies: [], medications: ['Lisinopril 10mg daily', 'Metformin 500mg BID'], medicalHistory: ['Type 2 Diabetes', 'Hypertension'] },
];

export function getAllPatients(): PatientExtended[] {
  return mockPatientsExtended;
}

export function searchPatients(query: string): PatientExtended[] {
  const lowerQuery = query.toLowerCase();
  return mockPatientsExtended.filter(p => 
    p.firstName.toLowerCase().includes(lowerQuery) ||
    p.lastName.toLowerCase().includes(lowerQuery) ||
    p.mrn.toLowerCase().includes(lowerQuery) ||
    `${p.firstName} ${p.lastName}`.toLowerCase().includes(lowerQuery)
  );
}

export function getStatistics() {
  const patients = mockPatientsExtended;
  const assessments = mockAssessments;
  
  return {
    totalPatients: patients.length,
    activeAssessments: assessments.filter(a => a.status === 'pending' || a.status === 'in_progress').length,
    completedToday: assessments.filter(a => a.status === 'completed' && a.completedAt && new Date(a.completedAt).toDateString() === new Date().toDateString()).length,
    urgentPending: assessments.filter(a => (a.urgencyLevel === 'urgent' || a.urgencyLevel === 'emergent') && a.status !== 'completed').length,
    byStatus: {
      pending: assessments.filter(a => a.status === 'pending').length,
      inProgress: assessments.filter(a => a.status === 'in_progress').length,
      completed: assessments.filter(a => a.status === 'completed').length,
      reviewed: assessments.filter(a => a.status === 'reviewed').length,
    },
    byUrgency: {
      routine: assessments.filter(a => a.urgencyLevel === 'routine').length,
      urgent: assessments.filter(a => a.urgencyLevel === 'urgent').length,
      emergent: assessments.filter(a => a.urgencyLevel === 'emergent').length,
    },
  };
}
