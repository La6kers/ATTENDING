// =============================================================================
// ATTENDING AI - Referrals AI Agent Service
// apps/provider-portal/lib/services/referralsAIAgent.ts
//
// AI agent for tracking referrals, providing status updates,
// managing follow-up, and closing the referral loop.
// =============================================================================

export type ReferralStatus = 'pending' | 'scheduled' | 'completed' | 'denied' | 'cancelled' | 'overdue';
export type ReferralUrgency = 'routine' | 'urgent' | 'stat';

export interface ReferralItem {
  id: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  mrn: string;
  specialty: string;
  referredTo: string;
  referralDate: string;
  appointmentDate?: string;
  status: ReferralStatus;
  urgency: ReferralUrgency;
  reason: string;
  clinicalQuestion: string;
  notes?: string;
  consultNote?: string;
  followUpNeeded: boolean;
  daysOutstanding: number;
}

export interface ReferralReviewItem {
  patientName: string;
  patientAge: number;
  patientGender: string;
  mrn: string;
  referrals: ReferralItem[];
  hasActionNeeded: boolean;
  actionCount: number;
}

export interface ReferralAIAnalysis {
  summary: string;
  statusUpdate: string;
  consultFindings?: ConsultFinding[];
  recommendedActions: ReferralAction[];
  patientMessage: string;
  followUpPlan: string;
}

export interface ConsultFinding {
  finding: string;
  significance: string;
  recommendation: string;
  requiresAction: boolean;
}

export interface ReferralAction {
  type: 'schedule' | 'follow-up' | 'order' | 'message' | 'close-loop' | 'escalate';
  label: string;
  details: string;
  priority: 'low' | 'medium' | 'high';
  selected?: boolean;
}

export const MOCK_REFERRAL_REVIEWS: ReferralReviewItem[] = [
  {
    patientName: 'Margaret Williams',
    patientAge: 68,
    patientGender: 'Female',
    mrn: 'MRN-6601',
    hasActionNeeded: true,
    actionCount: 3,
    referrals: [
      {
        id: 'ref-001',
        patientName: 'Margaret Williams',
        patientAge: 68,
        patientGender: 'Female',
        mrn: 'MRN-6601',
        specialty: 'Pulmonology',
        referredTo: 'Dr. Alan Torres, Pulmonary Associates',
        referralDate: '2026-02-20',
        appointmentDate: '2026-03-10',
        status: 'scheduled',
        urgency: 'urgent',
        reason: 'Suspicious pulmonary nodule on CT',
        clinicalQuestion: '2.3 cm spiculated RUL nodule with interval growth. Please evaluate for bronchoscopy vs CT-guided biopsy.',
        followUpNeeded: true,
        daysOutstanding: 14,
      },
      {
        id: 'ref-002',
        patientName: 'Margaret Williams',
        patientAge: 68,
        patientGender: 'Female',
        mrn: 'MRN-6601',
        specialty: 'Oncology',
        referredTo: 'Dr. Rachel Kim, Regional Cancer Center',
        referralDate: '2026-02-22',
        status: 'pending',
        urgency: 'urgent',
        reason: 'Possible lung malignancy - staging and treatment planning',
        clinicalQuestion: 'CT showing suspicious nodule with mediastinal LAD. PET/CT pending. Please evaluate for treatment options.',
        followUpNeeded: true,
        daysOutstanding: 12,
      },
    ],
  },
  {
    patientName: 'Sarah Martinez',
    patientAge: 34,
    patientGender: 'Female',
    mrn: 'MRN-6602',
    hasActionNeeded: true,
    actionCount: 2,
    referrals: [
      {
        id: 'ref-003',
        patientName: 'Sarah Martinez',
        patientAge: 34,
        patientGender: 'Female',
        mrn: 'MRN-6602',
        specialty: 'Endocrinology',
        referredTo: 'Dr. Patricia Chen, Thyroid & Endocrine Center',
        referralDate: '2026-03-02',
        appointmentDate: '2026-03-15',
        status: 'scheduled',
        urgency: 'urgent',
        reason: 'TI-RADS 5 thyroid nodule requiring FNA',
        clinicalQuestion: 'Elevated TSH with 1.2 cm suspicious thyroid nodule. Please evaluate and perform FNA biopsy.',
        followUpNeeded: true,
        daysOutstanding: 4,
      },
    ],
  },
  {
    patientName: 'Dorothy Clark',
    patientAge: 81,
    patientGender: 'Female',
    mrn: 'MRN-6603',
    hasActionNeeded: true,
    actionCount: 2,
    referrals: [
      {
        id: 'ref-004',
        patientName: 'Dorothy Clark',
        patientAge: 81,
        patientGender: 'Female',
        mrn: 'MRN-6603',
        specialty: 'Orthopedic Surgery',
        referredTo: 'Dr. Michael Harris, Joint & Bone Specialists',
        referralDate: '2026-03-04',
        appointmentDate: '2026-03-05',
        status: 'completed',
        urgency: 'stat',
        reason: 'Nondisplaced left femoral neck fracture',
        clinicalQuestion: 'Fall with hip fracture. On warfarin (INR 2.8). Please evaluate for surgical fixation.',
        consultNote: 'Patient evaluated. Recommend hemiarthroplasty given patient age and fracture pattern. Surgery scheduled for 3/6/2026. INR must be < 1.5. Will need warfarin held and vitamin K administered pre-op. Post-op plan includes DVT prophylaxis with LMWH until warfarin therapeutic. PT/OT consult ordered.',
        followUpNeeded: true,
        daysOutstanding: 2,
        notes: 'Surgery scheduled 3/6/2026',
      },
      {
        id: 'ref-005',
        patientName: 'Dorothy Clark',
        patientAge: 81,
        patientGender: 'Female',
        mrn: 'MRN-6603',
        specialty: 'Physical Therapy',
        referredTo: 'Active Recovery PT',
        referralDate: '2026-03-04',
        status: 'pending',
        urgency: 'routine',
        reason: 'Post-operative rehabilitation after hip fracture repair',
        clinicalQuestion: 'Will need post-op PT/OT. Fall risk assessment and home safety evaluation needed.',
        followUpNeeded: true,
        daysOutstanding: 2,
      },
    ],
  },
  {
    patientName: 'Michael Brown',
    patientAge: 67,
    patientGender: 'Male',
    mrn: 'MRN-6604',
    hasActionNeeded: true,
    actionCount: 1,
    referrals: [
      {
        id: 'ref-006',
        patientName: 'Michael Brown',
        patientAge: 67,
        patientGender: 'Male',
        mrn: 'MRN-6604',
        specialty: 'Cardiology',
        referredTo: 'Dr. Sarah Kim, Heart & Vascular Center',
        referralDate: '2026-01-15',
        appointmentDate: '2026-01-25',
        status: 'completed',
        urgency: 'routine',
        reason: 'AFib rate control optimization',
        clinicalQuestion: 'AFib with RVR episodes on metoprolol 100mg. Please evaluate for rate control optimization.',
        consultNote: 'Patient evaluated. Added verapamil SR 240mg daily for improved rate control. Recommend continuing metoprolol as well for synergistic effect. ECG shows controlled rate at 72 bpm. Follow up in 4 weeks with ECG.',
        followUpNeeded: true,
        daysOutstanding: 50,
        notes: 'Added verapamil - potential interaction with metoprolol flagged',
      },
    ],
  },
  {
    patientName: 'Nancy White',
    patientAge: 71,
    patientGender: 'Female',
    mrn: 'MRN-6605',
    hasActionNeeded: false,
    actionCount: 0,
    referrals: [
      {
        id: 'ref-007',
        patientName: 'Nancy White',
        patientAge: 71,
        patientGender: 'Female',
        mrn: 'MRN-6605',
        specialty: 'Pulmonary Rehabilitation',
        referredTo: 'Regional Pulmonary Rehab Center',
        referralDate: '2026-02-01',
        appointmentDate: '2026-02-15',
        status: 'scheduled',
        urgency: 'routine',
        reason: 'COPD GOLD Stage II - pulmonary rehabilitation',
        clinicalQuestion: 'COPD with 1 exacerbation in past year. FEV1 62% predicted. Please enroll in pulmonary rehab program.',
        followUpNeeded: false,
        daysOutstanding: 33,
      },
    ],
  },
];

export function generateReferralAIAnalysis(review: ReferralReviewItem): ReferralAIAnalysis {
  const analyses: Record<string, ReferralAIAnalysis> = {
    'MRN-6601': {
      summary: 'Margaret Williams has 2 active urgent referrals related to suspicious pulmonary findings. Pulmonology appointment is scheduled; oncology referral is still pending and needs follow-up.',
      statusUpdate: 'Pulmonology appointment scheduled for 3/10/2026 with Dr. Torres. Oncology referral to Dr. Kim is still pending after 12 days - consider direct contact to expedite given urgency.',
      recommendedActions: [
        { type: 'escalate', label: 'Expedite Oncology Referral', details: 'Call Dr. Kim\'s office directly to schedule - 12 days pending for urgent referral', priority: 'high' },
        { type: 'order', label: 'Ensure PET/CT Completed Before Appointments', details: 'Both specialists will need PET/CT results for evaluation', priority: 'high' },
        { type: 'follow-up', label: 'Schedule Post-Consult Follow-Up', details: 'Book follow-up visit for 1 week after pulmonology appointment', priority: 'medium' },
      ],
      patientMessage: 'Dear Ms. Williams,\n\nWe wanted to update you on your referral appointments:\n\n1. Pulmonology: You have an appointment with Dr. Torres on March 10th. He will discuss the next steps for evaluating the spot on your lung scan.\n\n2. Cancer Specialist: We are working to get you scheduled as soon as possible. Our office is following up to expedite this appointment.\n\nBefore your appointments, we are ordering a special scan (PET scan) that will provide additional information for your doctors.\n\nPlease call us if you have any questions or concerns in the meantime.',
      followUpPlan: 'Follow up on PET/CT results. Contact oncology office to expedite scheduling. Schedule post-consult visit to review findings and coordinate care plan.',
    },
    'MRN-6602': {
      summary: 'Sarah Martinez has an endocrinology appointment scheduled for FNA biopsy of suspicious thyroid nodule. Appointment is in 11 days.',
      statusUpdate: 'Endocrinology with Dr. Chen scheduled for 3/15/2026. FNA biopsy will be performed at that visit. Results typically take 5-7 business days.',
      recommendedActions: [
        { type: 'order', label: 'Ensure Pre-Visit Labs', details: 'Confirm TSH, Free T4, and thyroid antibodies are completed before visit', priority: 'medium' },
        { type: 'follow-up', label: 'Schedule Results Review', details: 'Book follow-up for ~2 weeks after FNA to review pathology results', priority: 'medium' },
      ],
      patientMessage: 'Dear Ms. Martinez,\n\nYour appointment with Dr. Chen (endocrinologist) is confirmed for March 15th. At this visit, she will perform the fine needle biopsy of the thyroid nodule we discussed.\n\nThe procedure is quick (about 15-20 minutes) and done in the office. You should be able to drive yourself home and resume normal activities the same day.\n\nPlease let us know if you need to reschedule or have any questions before your appointment.',
      followUpPlan: 'Verify pre-visit labs are resulted. Schedule post-FNA follow-up visit in 2 weeks for pathology results review.',
    },
    'MRN-6603': {
      summary: 'Dorothy Clark has completed orthopedic evaluation and surgery is scheduled for tomorrow (3/6). Consult note received with pre-op instructions. PT referral pending for post-op care.',
      statusUpdate: 'Orthopedic surgery (hemiarthroplasty) scheduled 3/6/2026. Pre-op requirements: INR must be < 1.5, vitamin K ordered. PT referral needs to be activated for post-op rehab.',
      consultFindings: [
        {
          finding: 'Hemiarthroplasty recommended over internal fixation',
          significance: 'Better outcomes for elderly patients with femoral neck fractures',
          recommendation: 'Hold warfarin, administer vitamin K to reverse INR',
          requiresAction: true,
        },
        {
          finding: 'Post-op DVT prophylaxis plan',
          significance: 'LMWH bridge until warfarin therapeutic post-operatively',
          recommendation: 'Coordinate anticoagulation management with surgeon',
          requiresAction: true,
        },
      ],
      recommendedActions: [
        { type: 'order', label: 'STAT INR Check', details: 'Must be < 1.5 for surgery tomorrow. Current INR 2.8', priority: 'high' },
        { type: 'order', label: 'Administer Vitamin K', details: 'To reverse anticoagulation before surgery', priority: 'high' },
        { type: 'schedule', label: 'Activate PT Referral', details: 'Contact Active Recovery PT for post-op rehabilitation scheduling', priority: 'medium' },
        { type: 'follow-up', label: 'Post-Op Follow-Up', details: 'Schedule 2-week post-op visit for wound check and anticoagulation restart', priority: 'medium' },
      ],
      patientMessage: 'Dear Ms. Clark,\n\nDr. Harris (orthopedic surgeon) has reviewed your case and your hip surgery is scheduled for tomorrow, March 6th.\n\nImportant pre-surgery instructions:\n- Do not eat or drink anything after midnight tonight\n- Your blood thinner (warfarin) has been stopped and we are giving you medication to help your blood clot normally for surgery\n- Please arrive at the hospital by the time instructed by the surgical team\n\nAfter surgery, you will begin physical therapy to help you recover. Our team will be coordinating your care throughout the process.\n\nA family member should plan to be available for transportation and support after your hospital stay.',
      followUpPlan: 'Pre-op: confirm INR reversal, NPO status. Post-op: coordinate warfarin restart with surgery team, activate PT/OT referrals, schedule 2-week follow-up, initiate fall prevention program and DEXA scan when healed.',
    },
    'MRN-6604': {
      summary: 'Michael Brown\'s cardiology consult is completed. Dr. Kim added verapamil for AFib rate control - however, this creates a significant drug interaction with existing metoprolol. Referral loop needs to be closed with medication reconciliation.',
      statusUpdate: 'Cardiology consult completed 1/25/2026. IMPORTANT: Verapamil was added alongside metoprolol, creating a major drug interaction (dual AV nodal blockade). This was flagged in medication review.',
      consultFindings: [
        {
          finding: 'Verapamil SR 240mg added for rate control',
          significance: 'Major interaction with metoprolol - risk of bradycardia and heart block',
          recommendation: 'Contact Dr. Kim to discuss - consider using only one AV nodal blocking agent',
          requiresAction: true,
        },
      ],
      recommendedActions: [
        { type: 'message', label: 'Contact Dr. Kim re: Drug Interaction', details: 'Discuss metoprolol + verapamil combination safety concern', priority: 'high' },
        { type: 'order', label: 'Order ECG', details: 'Check for bradycardia or conduction delays with dual rate control agents', priority: 'high' },
        { type: 'close-loop', label: 'Close Referral Loop', details: 'Acknowledge consult note and reconcile medication changes in chart', priority: 'medium' },
      ],
      patientMessage: 'Dear Mr. Brown,\n\nWe have received the results from your visit with Dr. Kim (cardiologist). She has recommended a new heart medication to help control your heart rhythm.\n\nBefore we finalize this medication change, we want to review how it works with your other medications. We will be in touch with Dr. Kim\'s office and may need to adjust one of your current medications.\n\nIn the meantime, please continue taking all your medications as currently prescribed and let us know if you experience any dizziness, lightheadedness, or feel that your heart is beating very slowly.',
      followUpPlan: 'Urgent: Contact Dr. Kim about metoprolol/verapamil interaction. Order ECG to assess current rhythm and rate. Consider reducing metoprolol if dual therapy is desired. Close referral loop in chart.',
    },
    'MRN-6605': {
      summary: 'Nancy White\'s pulmonary rehab referral is scheduled and progressing normally. No immediate action required.',
      statusUpdate: 'Pulmonary rehabilitation scheduled at Regional Pulmonary Rehab Center starting 2/15/2026. Program is ongoing.',
      recommendedActions: [],
      patientMessage: 'Dear Ms. White,\n\nWe hope your pulmonary rehabilitation program is going well! The exercises and education you receive there will help improve your breathing and quality of life.\n\nPlease continue attending all scheduled sessions and let us know how you are progressing at your next visit.',
      followUpPlan: 'Routine follow-up at next scheduled visit to assess pulmonary rehab progress and breathing status.',
    },
  };

  return analyses[review.mrn] || {
    summary: `Referral review for ${review.patientName}. ${review.referrals.length} referral(s) on file.`,
    statusUpdate: 'Status information not yet available.',
    recommendedActions: [],
    patientMessage: `Dear ${review.patientName.split(' ')[0]},\n\nWe are keeping track of your specialist referrals. Please call our office if you have questions about upcoming appointments.`,
    followUpPlan: 'Continue routine follow-up.',
  };
}
