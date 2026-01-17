import { Message, MessagePriority, MessageStatus, MessageType, PatientDetails } from '../store/useInbox';

const patientNames = [
  'John Smith', 'Mary Johnson', 'Robert Williams', 'Patricia Brown', 'Michael Davis',
  'Linda Miller', 'William Wilson', 'Elizabeth Moore', 'David Taylor', 'Jennifer Anderson'
];

const conditions = [
  ['Hypertension', 'Type 2 Diabetes'],
  ['Asthma', 'Seasonal Allergies'],
  ['Hyperlipidemia', 'GERD'],
  ['Anxiety', 'Depression'],
  ['Osteoarthritis', 'Chronic Back Pain'],
  ['Hypothyroidism'],
  ['Migraine', 'Insomnia'],
  ['COPD', 'Hypertension'],
  ['Atrial Fibrillation', 'Heart Failure'],
  ['Rheumatoid Arthritis']
];

const allergies = [
  ['Penicillin', 'Sulfa'],
  ['None'],
  ['Aspirin'],
  ['Latex', 'Shellfish'],
  ['Codeine'],
  ['None'],
  ['Peanuts', 'Tree nuts'],
  ['Iodine'],
  ['None'],
  ['Morphine', 'NSAIDs']
];

const medications = [
  ['Lisinopril 10mg', 'Metformin 1000mg', 'Atorvastatin 20mg'],
  ['Albuterol inhaler', 'Fluticasone nasal spray'],
  ['Omeprazole 20mg', 'Simvastatin 40mg'],
  ['Sertraline 50mg', 'Alprazolam 0.5mg PRN'],
  ['Ibuprofen 600mg PRN', 'Gabapentin 300mg'],
  ['Levothyroxine 75mcg'],
  ['Sumatriptan 100mg PRN', 'Zolpidem 10mg'],
  ['Tiotropium inhaler', 'Amlodipine 5mg'],
  ['Warfarin 5mg', 'Metoprolol 50mg', 'Furosemide 40mg'],
  ['Methotrexate 15mg weekly', 'Prednisone 5mg']
];

const emailSubjects = [
  'Question about medication side effects',
  'Follow-up from recent appointment',
  'Request for prescription refill',
  'Symptoms getting worse',
  'Need referral to specialist',
  'Lab results inquiry',
  'Vaccination questions',
  'Insurance coverage question',
  'Appointment rescheduling request',
  'New symptoms to discuss'
];

const phoneMessages = [
  'Called about chest pain - advised to go to ER if severe',
  'Requesting callback about test results',
  'Needs forms filled out for work',
  'Questions about new medication dosage',
  'Reporting improvement in symptoms',
  'Wants to discuss treatment options',
  'Concerned about recent weight gain',
  'Asking about flu shot availability',
  'Needs medical records sent to specialist',
  'Follow-up on referral status'
];

const labResults = [
  'Complete Blood Count - Results available',
  'Lipid Panel - Cholesterol elevated',
  'HbA1c - Diabetes well controlled',
  'Thyroid Function Test - Normal',
  'Liver Function Test - Mild elevation',
  'Kidney Function - Within normal limits',
  'Vitamin D - Low levels detected',
  'Urinalysis - Trace protein',
  'COVID-19 Test - Negative',
  'Strep Test - Positive'
];

function generatePatientDetails(index: number): PatientDetails {
  const birthYear = 1940 + Math.floor(Math.random() * 60);
  const age = new Date().getFullYear() - birthYear;
  const lastVisitDays = Math.floor(Math.random() * 180) + 1;
  const lastVisitDate = new Date();
  lastVisitDate.setDate(lastVisitDate.getDate() - lastVisitDays);

  return {
    id: `PAT-${1000 + index}`,
    name: patientNames[index % patientNames.length],
    age: `${age} years`,
    dateOfBirth: `${Math.floor(Math.random() * 12) + 1}/${Math.floor(Math.random() * 28) + 1}/${birthYear}`,
    allergies: allergies[index % allergies.length],
    lastVisit: lastVisitDate.toLocaleDateString(),
    conditions: conditions[index % conditions.length],
    mrn: `MRN-${100000 + index}`
  };
}

function generateMessageContent(type: MessageType, index: number): string {
  switch (type) {
    case 'email':
      return `Dear Dr. Chen,\n\nI hope this message finds you well. ${emailSubjects[index % emailSubjects.length]}.\n\nI've been experiencing some concerns that I'd like to discuss with you. Over the past few weeks, I've noticed some changes in my condition that may require your attention.\n\nCould we schedule a time to discuss this further? I'm available most afternoons next week.\n\nThank you for your time and attention to this matter.\n\nBest regards,\n${patientNames[index % patientNames.length]}`;
    
    case 'phone':
      return `Phone message received at ${new Date().toLocaleTimeString()}\n\nPatient called regarding: ${phoneMessages[index % phoneMessages.length]}\n\nPatient requested a callback at their preferred number ending in -${Math.floor(Math.random() * 9000) + 1000}.\n\nUrgency level: ${index % 3 === 0 ? 'High' : 'Normal'}\n\nAdditional notes: Patient sounds ${index % 2 === 0 ? 'anxious' : 'stable'} and ${index % 3 === 1 ? 'requested earliest available appointment' : 'willing to wait for regular appointment'}.`;
    
    case 'lab':
      return `Lab Results Summary\n\n${labResults[index % labResults.length]}\n\nOrdered by: Dr. Chen\nCollection Date: ${new Date(Date.now() - 86400000 * 2).toLocaleDateString()}\nReceived: ${new Date().toLocaleDateString()}\n\nKey Findings:\n- ${index % 2 === 0 ? 'Some values outside normal range' : 'Most values within normal limits'}\n- ${index % 3 === 0 ? 'Follow-up recommended' : 'Continue current treatment'}\n- ${index % 4 === 0 ? 'Consider medication adjustment' : 'No immediate action required'}\n\nFull report available in patient chart.`;
    
    case 'refill':
      return `Prescription Refill Request\n\nPatient: ${patientNames[index % patientNames.length]}\nPharmacy: CVS Pharmacy #${Math.floor(Math.random() * 900) + 100}\n\nMedications requested:\n${medications[index % medications.length].map(med => `- ${med}`).join('\n')}\n\nLast filled: ${new Date(Date.now() - 86400000 * 25).toLocaleDateString()}\nRefills remaining: ${Math.floor(Math.random() * 3)}\n\nPharmacy notes: ${index % 2 === 0 ? 'Patient requesting early refill due to upcoming travel' : 'Standard refill request'}\n\nInsurance: ${index % 3 === 0 ? 'Prior authorization may be required' : 'Covered by insurance'}`;
    
    default:
      return 'Message content';
  }
}

export function generateMockMessages(count: number = 20): Message[] {
  const messages: Message[] = [];
  const types: MessageType[] = ['email', 'lab', 'phone', 'refill'];
  const priorities: MessagePriority[] = ['urgent', 'high', 'normal', 'low'];
  const _statuses: MessageStatus[] = ['unread', 'read'];

  for (let i = 0; i < count; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const priority = i % 5 === 0 ? 'urgent' : priorities[Math.floor(Math.random() * priorities.length)];
    const isUnread = Math.random() > 0.3;
    const createdAt = new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000));
    const patientDetails = generatePatientDetails(i);

    const message: Message = {
      id: i + 1,
      patientDetails,
      type,
      priority,
      status: isUnread ? 'unread' : 'read',
      subject: type === 'email' ? emailSubjects[i % emailSubjects.length] : 
               type === 'lab' ? labResults[i % labResults.length] :
               type === 'phone' ? 'Phone Message' : 'Refill Request',
      preview: generateMessageContent(type, i).substring(0, 150) + '...',
      content: generateMessageContent(type, i),
      createdAt,
      updatedAt: createdAt,
      medications: type === 'refill' ? medications[i % medications.length] : undefined,
      attachments: type === 'lab' ? [{
        id: `att-${i}`,
        name: `lab-results-${patientDetails.mrn}.pdf`,
        type: 'application/pdf',
        url: '#',
        size: Math.floor(Math.random() * 500) + 100
      }] : undefined,
      labels: [
        ...(priority === 'urgent' ? ['urgent'] : []),
        ...(type === 'lab' && i % 3 === 0 ? ['abnormal'] : []),
        ...(type === 'refill' ? ['pharmacy'] : []),
        ...(i % 4 === 0 ? ['follow-up'] : [])
      ],
      responseRequired: priority === 'urgent' || priority === 'high',
      aiAnalysis: i % 3 === 0 ? {
        summary: `Patient ${patientDetails.name} is presenting with ${type === 'email' ? 'concerns requiring attention' : type === 'lab' ? 'lab results that need review' : type === 'phone' ? 'symptoms that may need follow-up' : 'medication refill needs'}. Based on their medical history of ${patientDetails.conditions.join(', ')}, this requires careful consideration.`,
        recommendations: [
          'Review patient history and current medications',
          'Consider scheduling follow-up appointment',
          type === 'lab' ? 'Evaluate lab trends over time' : 'Assess symptom progression',
          'Update treatment plan if necessary'
        ],
        riskFactors: [
          ...(patientDetails.conditions.includes('Diabetes') ? ['Diabetes management'] : []),
          ...(patientDetails.conditions.includes('Hypertension') ? ['Cardiovascular risk'] : []),
          ...(priority === 'urgent' ? ['Requires immediate attention'] : [])
        ],
        suggestedActions: [
          priority === 'urgent' ? 'Respond within 24 hours' : 'Respond within 48-72 hours',
          type === 'refill' ? 'Verify medication compliance' : 'Review recent test results',
          'Document in patient chart'
        ]
      } : undefined
    };

    messages.push(message);
  }

  return messages.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}
