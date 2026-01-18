import { Message, MessagePriority, MessageType, PatientDetails } from '../store/useInbox';

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

// Refill request messages (kept for future use)
const _refillRequestMessages = [
  `Dr. Reed,\n\nI'm running low on my Metformin and need a refill. I have about a week's supply left.\n\nCould you please send a refill to my CVS pharmacy?\n\nThank you!`,
  
  `Hi,\n\nI need refills on my medications:\n- Lisinopril 20mg\n- Atorvastatin 40mg\n\nI use Walgreens on Main Street. I'm also almost out of my blood pressure medication.\n\nThanks!`,
  
  `Hello Dr. Reed,\n\nMy pharmacy said I'm out of refills on my Sertraline. Could you please authorize more refills? I've been doing well on this medication.\n\nThank you!`,
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
      return `Phone message received at ${new Date().toLocaleTimeString()}\n\nPatient called regarding: ${phoneMessages[index % phoneMessages.length]}\n\nPatient requested a callback at their preferred number ending in -${Math.floor(Math.random() * 9000) + 1000}.\n\nUrgency level: ${index % 3 === 0 ? 'High - patient waiting' : 'Normal'}\n\nAdditional notes: Patient ${index % 2 === 0 ? 'needs response today' : 'can wait until tomorrow'}.`;
    }
    
    case 'lab': {
      const patientDetails = generatePatientDetails(index);
      return `Lab Results Summary\n\n${labResults[index % labResults.length]}\n\nOrdered by: Dr. Thomas Reed\nCollection Date: ${new Date(Date.now() - 86400000 * 2).toLocaleDateString()}\nReceived: ${new Date().toLocaleDateString()}\n\nPatient: ${patientDetails.name}\nMRN: ${patientDetails.mrn}\n\nKey Findings:\n- ${index % 2 === 0 ? 'Some values outside normal range - review recommended' : 'Most values within normal limits'}\n- ${index % 3 === 0 ? 'Trend improving from previous results' : 'Stable compared to last visit'}\n\nAction Required: ${index % 2 === 0 ? 'Review and contact patient' : 'File in chart, routine follow-up'}`;
    }
    
    case 'refill': {
      const patientInfo = generatePatientDetails(index);
      return `Prescription Refill Request\n\nPatient: ${patientInfo.name}\nMRN: ${patientInfo.mrn}\nPharmacy: ${index % 2 === 0 ? 'CVS Pharmacy' : 'Walgreens'} #${Math.floor(Math.random() * 900) + 100}\n\nMedications requested:\n${medications[index % medications.length].map(med => `• ${med}`).join('\n')}\n\nLast filled: ${new Date(Date.now() - 86400000 * 25).toLocaleDateString()}\nRefills remaining: ${Math.floor(Math.random() * 2)}\n\nLast office visit: ${patientInfo.lastVisit}\nActive conditions: ${conditions[index % conditions.length].join(', ')}\n\nPharmacy notes: ${index % 2 === 0 ? 'Patient has been on this medication for 2+ years' : 'Standard refill request'}`;
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
    const priority = i % 5 === 0 ? 'urgent' : priorities[Math.floor(Math.random() * priorities.length)];
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
        size: Math.floor(Math.random() * 500) + 100
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
