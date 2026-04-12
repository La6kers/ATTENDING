export interface ClinicalMessage {
  id: number;
  priority: number;
  type: 'phone' | 'email' | 'lab' | 'imaging' | 'provider' | 'staff' | 'refill';
  patient: string;
  age: number;
  gender: 'M' | 'F';
  time: string;
  preview: string;
  fullMessage?: string;
  emailContent?: string;
  providerNote?: string;
  staffNote?: string;
  criticalFactors?: string[];
  vitals?: {
    bp?: string;
    hr?: string;
    o2?: string;
    temp?: string;
  };
  pmh?: string[];
  medications?: string[] | Array<{
    name: string;
    lastFill: string;
    adherence: string;
  }>;
  clinicalGuidelines?: string[];
  recommendedActions?: Array<{
    action: string;
    priority: 'immediate' | 'high' | 'medium' | 'low';
    selected: boolean;
  }>;
  results?: Array<{
    test?: string;
    value?: string;
    normal?: string;
    status?: 'critical' | 'abnormal' | 'normal';
    trend?: string;
    finding?: string;
    significance?: string;
    action?: string;
  }>;
  newDiagnosis?: boolean;
  education?: string[];
  lastLabs?: {
    a1c?: string;
    ldl?: string;
    creat?: string;
  };
  currentMeds?: string[];
  relevantLabs?: Array<{
    test: string;
    value: string;
    action?: string;
    date?: string;
  }>;
}

export const clinicalMessages: ClinicalMessage[] = [
  {
    id: 1,
    priority: 10,
    type: 'phone',
    patient: 'Maria Rodriguez',
    age: 45,
    gender: 'F',
    time: '2 min ago',
    preview: 'Severe chest pain radiating to left arm, SOB, nausea',
    fullMessage: 'Dr. Chen, I\'m experiencing severe chest pain that started around 7 AM this morning. It feels like pressure and radiates to my left arm. I\'m also feeling nauseous and short of breath. The pain is getting worse. I\'m really scared - should I go to the emergency room or wait for an appointment?',
    criticalFactors: ['Chest pain', 'Radiation to arm', 'SOB', 'Diaphoresis'],
    vitals: { bp: '158/92', hr: '110', o2: '92%' },
    pmh: ['HTN', 'T2DM', 'Family Hx CAD'],
    medications: ['Metformin 1000mg BID', 'Lisinopril 10mg daily'],
    clinicalGuidelines: [
      'ACC/AHA: Immediate ED evaluation for ACS',
      'TIMI Risk Score: High risk features present',
      'Door-to-balloon time critical'
    ],
    recommendedActions: [
      { action: 'Call 911', priority: 'immediate', selected: false },
      { action: 'Chew aspirin 325mg', priority: 'immediate', selected: false },
      { action: 'Alert ED', priority: 'immediate', selected: false },
      { action: 'Document time', priority: 'high', selected: false }
    ]
  },
  {
    id: 2,
    priority: 7,
    type: 'lab',
    patient: 'John Thompson',
    age: 58,
    gender: 'M',
    time: '15 min ago',
    preview: 'Critical lab values: A1C 8.2%, LDL 145, ALT 52',
    results: [
      { test: 'A1C', value: '8.2%', normal: '<7%', status: 'critical', trend: '↑' },
      { test: 'Glucose', value: '165', normal: '70-100', status: 'abnormal', trend: '↑' },
      { test: 'LDL', value: '145', normal: '<100', status: 'abnormal', trend: '→' },
      { test: 'ALT', value: '52', normal: '7-45', status: 'abnormal', trend: '↑' },
      { test: 'Creat', value: '1.0', normal: '0.6-1.2', status: 'normal', trend: '→' }
    ],
    pmh: ['T2DM', 'Hyperlipidemia', 'NAFLD'],
    medications: ['Metformin 1000mg BID', 'Atorvastatin 40mg HS'],
    clinicalGuidelines: [
      'ADA: A1C goal <7% for most adults',
      'Consider GLP-1 agonist for A1C >7.5%',
      'Monitor ALT - possible NASH'
    ],
    recommendedActions: [
      { action: 'Add GLP-1 agonist', priority: 'high', selected: false },
      { action: 'Increase statin dose', priority: 'medium', selected: false },
      { action: 'Order hepatic panel', priority: 'medium', selected: false },
      { action: 'Nutrition referral', priority: 'medium', selected: false }
    ]
  },
  {
    id: 3,
    priority: 6,
    type: 'imaging',
    patient: 'Susan Chen',
    age: 67,
    gender: 'F',
    time: '30 min ago',
    preview: 'CXR: New RLL infiltrate, concern for pneumonia',
    results: [
      { finding: 'RLL consolidation', significance: 'New finding', action: 'Treat' },
      { finding: 'No pleural effusion', significance: 'Negative', action: 'None' },
      { finding: 'Cardiomegaly', significance: 'Stable', action: 'Monitor' }
    ],
    vitals: { temp: '101.2°F', bp: '142/88', hr: '92', o2: '94%' },
    pmh: ['CHF', 'HTN', 'CKD Stage 3'],
    clinicalGuidelines: [
      'IDSA: Community-acquired pneumonia guidelines',
      'Consider CURB-65 score for disposition',
      'Adjust antibiotics for CKD'
    ],
    recommendedActions: [
      { action: 'Start antibiotics', priority: 'high', selected: false },
      { action: 'Blood cultures', priority: 'high', selected: false },
      { action: 'Calculate CURB-65', priority: 'medium', selected: false },
      { action: 'F/U CXR in 6 weeks', priority: 'low', selected: false }
    ]
  },
  {
    id: 4,
    priority: 5,
    type: 'provider',
    patient: 'Robert Johnson',
    age: 62,
    gender: 'M',
    time: '1 hour ago',
    preview: 'Cardiology: Recommend adding CCB for resistant HTN',
    providerNote: 'Seen in cardiology clinic. BP remains elevated despite dual therapy. No evidence of secondary causes. Recommend adding amlodipine 5mg daily.',
    currentMeds: ['Lisinopril 20mg', 'Metoprolol 50mg BID'],
    vitals: { bp: '156/92', hr: '68' },
    clinicalGuidelines: [
      'JNC 8: Add CCB as third agent',
      'Check for medication adherence',
      'Consider 24hr BP monitoring'
    ],
    recommendedActions: [
      { action: 'Add amlodipine 5mg', priority: 'high', selected: false },
      { action: 'Check adherence', priority: 'high', selected: false },
      { action: 'Order 24hr BP monitor', priority: 'medium', selected: false },
      { action: 'Recheck in 2 weeks', priority: 'medium', selected: false }
    ]
  },
  {
    id: 5,
    priority: 4,
    type: 'staff',
    patient: 'Emma Wilson',
    age: 58,
    gender: 'F',
    time: '2 hours ago',
    preview: 'RN: Patient c/o muscle pain on statin, requesting guidance',
    staffNote: 'Patient called reporting bilateral leg pain x1 week. Started atorvastatin 40mg 3 weeks ago. Pain 6/10, worse with walking.',
    relevantLabs: [
      { test: 'CK', value: 'Not done', action: 'Order' },
      { test: 'LDL', value: '95', date: '6 weeks ago' }
    ],
    clinicalGuidelines: [
      'ACC/AHA: Check CK if muscle symptoms',
      'Consider statin intolerance algorithm',
      'Alternative lipid therapies available'
    ],
    recommendedActions: [
      { action: 'Order CK level', priority: 'high', selected: false },
      { action: 'Hold statin temporarily', priority: 'high', selected: false },
      { action: 'Consider rosuvastatin', priority: 'medium', selected: false },
      { action: 'Schedule visit', priority: 'medium', selected: false }
    ]
  },
  {
    id: 6,
    priority: 3,
    type: 'email',
    patient: 'David Kim',
    age: 42,
    gender: 'M',
    time: '3 hours ago',
    preview: 'Question about new diabetes diagnosis, very anxious',
    emailContent: 'Dr. Chen, I just got my lab results showing I have diabetes with an A1C of 7.8%. I\'m really scared and overwhelmed. My father had diabetes and ended up losing his foot. I don\'t know what to do or where to start. Can this be reversed? Will I need insulin? I\'ve been reading online and I\'m terrified about complications. Please help me understand what this means for my future. I have young kids and I need to be healthy for them.',
    fullMessage: 'Dr. Chen, I just got my lab results showing I have diabetes with an A1C of 7.8%. I\'m really scared and overwhelmed. My father had diabetes and ended up losing his foot. I don\'t know what to do or where to start. Can this be reversed? Will I need insulin? I\'ve been reading online and I\'m terrified about complications. Please help me understand what this means for my future. I have young kids and I need to be healthy for them.',
    newDiagnosis: true,
    education: ['Diabetes basics', 'Lifestyle modifications', 'Monitoring'],
    clinicalGuidelines: [
      'ADA: Metformin first-line therapy for T2DM',
      'Lifestyle intervention can reduce A1C by 1-2%',
      'Diabetes education reduces complications by 50%',
      'Screen for depression with new diagnosis'
    ],
    recommendedActions: [
      { action: 'Start metformin 500mg', priority: 'high', selected: false },
      { action: 'Diabetes educator referral', priority: 'high', selected: false },
      { action: 'Order eye exam', priority: 'medium', selected: false },
      { action: 'Nutrition consult', priority: 'medium', selected: false }
    ]
  },
  {
    id: 7,
    priority: 2,
    type: 'refill',
    patient: 'Linda Martinez',
    age: 55,
    gender: 'F',
    time: '4 hours ago',
    preview: 'Multiple refill requests - BP meds, diabetes meds',
    medications: [
      { name: 'Lisinopril 10mg', lastFill: '90 days ago', adherence: '92%' },
      { name: 'Metformin 1000mg BID', lastFill: '85 days ago', adherence: '88%' },
      { name: 'Atorvastatin 20mg', lastFill: '92 days ago', adherence: '95%' }
    ],
    lastLabs: { a1c: '7.2%', ldl: '102', creat: '0.9' },
    clinicalGuidelines: [
      'Adherence >90% associated with better outcomes',
      'Annual labs recommended',
      'Consider 90-day supplies'
    ],
    recommendedActions: [
      { action: 'Approve all refills', priority: 'medium', selected: false },
      { action: '90-day supplies', priority: 'low', selected: false },
      { action: 'Schedule annual labs', priority: 'medium', selected: false },
      { action: 'Adherence counseling', priority: 'low', selected: false }
    ]
  }
];

export function getPriorityClass(priority: number): string {
  if (priority >= 8) return 'critical';
  if (priority >= 5) return 'warning';
  return 'routine';
}

export function getScoreClass(priority: number): string {
  if (priority >= 8) return 'bg-red-600';
  if (priority >= 5) return 'bg-amber-500';
  return 'bg-green-500';
}

export function getTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    phone: '📞',
    email: '📧',
    lab: '🧪',
    imaging: '🏥',
    provider: '👨‍⚕️',
    staff: '👥',
    refill: '💊'
  };
  return icons[type] || '📄';
}

export function checkVitalAbnormal(key: string, value: string): boolean {
  if (key === 'bp') {
    // Parse systolic from "systolic/diastolic" format (e.g. "158/92")
    const systolic = parseInt(value.split('/')[0], 10);
    if (!isNaN(systolic) && systolic > 140) return true;
    // Also check diastolic
    const parts = value.split('/');
    if (parts.length > 1) {
      const diastolic = parseInt(parts[1], 10);
      if (!isNaN(diastolic) && diastolic > 90) return true;
    }
    return false;
  }
  if (key === 'hr') {
    const hr = parseInt(value, 10);
    return !isNaN(hr) && (hr < 60 || hr > 100);
  }
  if (key === 'o2') {
    const o2 = parseInt(value, 10);
    return !isNaN(o2) && o2 < 95;
  }
  if (key === 'temp') {
    const temp = parseFloat(value);
    return !isNaN(temp) && temp > 100.4;
  }
  return false;
}
