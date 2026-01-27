// ============================================================
// Pre-Visit Summary Page
// apps/provider-portal/pages/previsit/[id].tsx
//
// Dynamic page showing pre-visit intelligence for a patient
// Accessed when clicking on a patient in the queue/list
// UPDATED: Fixed broken links and placeholder implementations
// ============================================================

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import type { PreVisitData } from '@/components/previsit';
import { PreVisitSummary } from '@/components/previsit';

// ============================================================
// Mock Data - Replace with API call
// ============================================================

const getMockPreVisitData = (patientId: string): PreVisitData => ({
  patient: {
    id: patientId,
    firstName: 'Sarah',
    lastName: 'Johnson',
    age: 32,
    gender: 'Female',
    mrn: '78932145',
    dob: '03/15/1992',
    lastVisit: '3 months ago',
    phone: '(555) 123-4567',
  },
  appointment: {
    time: '3:00 PM',
    type: 'Follow-up Visit',
  },
  chiefComplaint: {
    summary: 'Severe headache for 3 days',
    patientQuote: 'Severe headache for 3 days - worst headache of my life',
    patientEmphasis: 'Patient emphasizes this is different from usual migraines',
    details: `The patient reports the gradual onset of a severe, right-sided unilateral headache beginning 3 days ago. The pain is described as throbbing and pulsating in character, with severity reaching 9/10 at its worst and currently rated at 7/10. The headache is associated with visual aura presenting as zigzag lines, along with photophobia, phonophobia, nausea, vomiting, and episodes of confusion.

The patient finds some relief with rest in a dark room, though ibuprofen has provided only minimal pain reduction. She emphasizes that this headache pattern is distinctly different from her usual migraines, describing it as "the worst headache of my life."`,
  },
  vitals: {
    bloodPressure: { systolic: 138, diastolic: 88, status: 'elevated' },
    heartRate: { value: 96, status: 'tachycardia' },
    temperature: { value: 98.6, unit: 'F', status: 'normal' },
    respRate: { value: 18, status: 'normal' },
    oxygenSat: { value: 99, status: 'normal' },
  },
  medications: [
    {
      id: 'med-1',
      name: 'Oral Contraceptive',
      dosage: 'Daily',
      frequency: 'specific formulation to confirm',
      status: 'active',
    },
    {
      id: 'med-2',
      name: 'Ibuprofen',
      dosage: '400mg',
      frequency: 'every 6 hours PRN × 3 days',
      status: 'self-medicating',
    },
  ],
  allergies: [
    {
      id: 'allergy-1',
      allergen: 'Penicillin',
      reaction: 'Rash, hives, difficulty breathing',
      severity: 'severe',
    },
    {
      id: 'allergy-2',
      allergen: 'Sulfa Drugs',
      reaction: 'Skin rash, nausea',
      severity: 'moderate',
    },
    {
      id: 'allergy-3',
      allergen: 'Codeine',
      reaction: 'Nausea, vomiting, drowsiness',
      severity: 'mild',
    },
  ],
  riskAssessment: {
    level: 'high',
    summary: 'Urgent Evaluation Required',
    factors: [
      { id: 'rf-1', description: '"Worst headache of life" reported' },
      { id: 'rf-2', description: 'Confusion mentioned by patient' },
      { id: 'rf-3', description: 'Elevated blood pressure (138/88)' },
      { id: 'rf-4', description: 'Tachycardia (96 BPM)' },
      { id: 'rf-5', description: 'Different from usual migraine pattern' },
    ],
  },
  actionItems: [
    { id: 'action-1', description: 'Order STAT CT head without contrast', priority: 'urgent' },
    { id: 'action-2', description: 'Complete neurological examination', priority: 'urgent' },
    { id: 'action-3', description: 'Assess for meningeal signs', priority: 'urgent' },
    { id: 'action-4', description: 'Obtain pregnancy test', priority: 'high' },
    { id: 'action-5', description: 'Consider CBC and basic metabolic panel', priority: 'normal' },
    { id: 'action-6', description: 'Blood pressure monitoring', priority: 'high' },
  ],
  criticalAlert: {
    message: 'Patient reports "worst headache of life" - High priority for SAH evaluation',
    type: 'sah',
  },
});

// ============================================================
// Patient List for Navigation (Mock)
// ============================================================

const patientQueue = [
  'patient-001',
  'patient-002', // Sarah Johnson
  'patient-003',
  'patient-004',
];

// ============================================================
// Page Component
// ============================================================

export default function PreVisitPage() {
  const router = useRouter();
  const { id } = router.query;
  const [preVisitData, setPreVisitData] = useState<PreVisitData | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch pre-visit data
  useEffect(() => {
    if (!id || typeof id !== 'string') return;

    // Simulate API call
    setLoading(true);
    setTimeout(() => {
      const data = getMockPreVisitData(id);
      setPreVisitData(data);
      setLoading(false);
    }, 300);
  }, [id]);

  // Navigation handlers
  const handleNavigatePatient = (direction: 'prev' | 'next') => {
    const currentIndex = patientQueue.indexOf(id as string);
    if (currentIndex === -1) return;

    const newIndex = direction === 'prev' 
      ? Math.max(0, currentIndex - 1)
      : Math.min(patientQueue.length - 1, currentIndex + 1);

    if (newIndex !== currentIndex) {
      router.push(`/previsit/${patientQueue[newIndex]}`);
    }
  };

  // Action handlers
  const handleStartEncounter = () => {
    // Navigate to diagnosis selection page (visit workflow)
    router.push(`/visit/${id}`);
  };

  const handleOrderLabs = () => {
    router.push(`/labs?patientId=${id}`);
  };

  const handleOrderImaging = () => {
    router.push(`/imaging?patientId=${id}`);
  };

  const handlePrescribe = () => {
    router.push(`/medications?patientId=${id}`);
  };

  const handleRefer = () => {
    router.push(`/referrals?patientId=${id}`);
  };

  const handleScheduleFollowup = () => {
    // Navigate to schedule page with follow-up parameters
    const patientName = preVisitData?.patient 
      ? `${preVisitData.patient.firstName} ${preVisitData.patient.lastName}`
      : '';
    router.push(`/schedule?action=new&patientId=${id}&patientName=${encodeURIComponent(patientName)}&type=followup`);
  };

  const handleEmergencyProtocol = () => {
    // Store emergency context and navigate to visit with emergency flag
    if (preVisitData) {
      sessionStorage.setItem('emergencyPatient', JSON.stringify({
        id,
        name: `${preVisitData.patient.firstName} ${preVisitData.patient.lastName}`,
        mrn: preVisitData.patient.mrn,
        chiefComplaint: preVisitData.chiefComplaint.summary,
        redFlags: preVisitData.riskAssessment.factors.map(f => f.description),
        vitals: preVisitData.vitals,
      }));
    }
    // Navigate to visit workflow with emergency mode
    router.push(`/visit/${id}?emergency=true`);
  };

  const handleReviewChart = () => {
    // FIXED: Navigate to correct patient chart path
    router.push(`/patients/${id}`);
  };

  // Loading state
  if (loading || !preVisitData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading pre-visit summary...</p>
        </div>
      </div>
    );
  }

  return (
    <PreVisitSummary
      data={preVisitData}
      onStartEncounter={handleStartEncounter}
      onOrderLabs={handleOrderLabs}
      onOrderImaging={handleOrderImaging}
      onPrescribe={handlePrescribe}
      onRefer={handleRefer}
      onScheduleFollowup={handleScheduleFollowup}
      onEmergencyProtocol={handleEmergencyProtocol}
      onReviewChart={handleReviewChart}
      onNavigatePatient={handleNavigatePatient}
    />
  );
}
