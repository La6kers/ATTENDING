// ============================================================
// Pre-Visit Summary Page
// apps/provider-portal/pages/previsit/[id].tsx
//
// Loads real assessment data from /api/assessments/[id]
// and renders it in the PreVisitSummary component.
// ============================================================

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import type { PreVisitData, PatientVitals } from '@/components/previsit';
import { PreVisitSummary } from '@/components/previsit';

// ============================================================
// Vitals Status Helpers
// ============================================================

function bpStatus(systolic: number): PatientVitals['bloodPressure']['status'] {
  if (systolic >= 180) return 'critical';
  if (systolic >= 140) return 'high';
  if (systolic >= 120) return 'elevated';
  return 'normal';
}

function hrStatus(hr: number): PatientVitals['heartRate']['status'] {
  if (hr >= 150) return 'critical';
  if (hr > 100) return 'tachycardia';
  if (hr < 40) return 'critical';
  if (hr < 60) return 'bradycardia';
  return 'normal';
}

function tempStatus(temp: number): PatientVitals['temperature']['status'] {
  if (temp >= 103) return 'fever';
  if (temp >= 99.5) return 'elevated';
  if (temp < 96) return 'low';
  return 'normal';
}

function respStatus(rr: number): PatientVitals['respRate']['status'] {
  if (rr > 20) return 'elevated';
  if (rr < 12) return 'low';
  return 'normal';
}

function o2Status(sat: number): PatientVitals['oxygenSat']['status'] {
  if (sat < 90) return 'critical';
  if (sat < 95) return 'low';
  return 'normal';
}

// ============================================================
// API → PreVisitData Mapper
// ============================================================

function mapApiToPreVisitData(api: any): PreVisitData {
  const p = api.patient || {};
  const record = api.patientRecord || {};
  const vitalsRaw = record.recentVitals;

  // Vitals — use real values when available, or placeholder normals
  const vitals: PatientVitals = vitalsRaw
    ? {
        bloodPressure: {
          systolic: vitalsRaw.bloodPressureSystolic ?? 120,
          diastolic: vitalsRaw.bloodPressureDiastolic ?? 80,
          status: bpStatus(vitalsRaw.bloodPressureSystolic ?? 120),
        },
        heartRate: {
          value: vitalsRaw.heartRate ?? 75,
          status: hrStatus(vitalsRaw.heartRate ?? 75),
        },
        temperature: {
          value: vitalsRaw.temperature ?? 98.6,
          unit: 'F',
          status: tempStatus(vitalsRaw.temperature ?? 98.6),
        },
        respRate: {
          value: vitalsRaw.respiratoryRate ?? 16,
          status: respStatus(vitalsRaw.respiratoryRate ?? 16),
        },
        oxygenSat: {
          value: vitalsRaw.oxygenSaturation ?? 98,
          status: o2Status(vitalsRaw.oxygenSaturation ?? 98),
        },
      }
    : {
        // No vitals yet — show pending placeholders as normal
        bloodPressure: { systolic: 0, diastolic: 0, status: 'normal' },
        heartRate: { value: 0, status: 'normal' },
        temperature: { value: 0, unit: 'F', status: 'normal' },
        respRate: { value: 0, status: 'normal' },
        oxygenSat: { value: 0, status: 'normal' },
      };

  // Medications — prefer structured patient record, fall back to assessment strings
  const medications: PreVisitData['medications'] =
    record.medications?.length > 0
      ? record.medications.map((m: any) => ({
          id: m.id,
          name: m.name,
          dosage: m.dose || 'See chart',
          frequency: m.frequency || '',
          status: (m.status?.toLowerCase() || 'active') as any,
        }))
      : (api.medications as string[] || []).map((name: string, i: number) => ({
          id: `asm-med-${i}`,
          name,
          dosage: '',
          frequency: '',
          status: 'active' as const,
        }));

  // Allergies — prefer structured patient record, fall back to assessment strings
  const allergies: PreVisitData['allergies'] =
    record.allergies?.length > 0
      ? record.allergies.map((a: any) => ({
          id: a.id,
          allergen: a.allergen,
          reaction: a.reaction || 'Unknown reaction',
          severity: (a.severity?.toLowerCase() || 'moderate') as any,
        }))
      : (api.allergies as string[] || []).map((name: string, i: number) => ({
          id: `asm-allergy-${i}`,
          allergen: name,
          reaction: 'See chart',
          severity: 'moderate' as const,
        }));

  // Red flags → risk factors
  const redFlags: string[] = Array.isArray(api.redFlags) ? api.redFlags : [];
  const triageLevel: string = api.triageLevel || 'ROUTINE';

  const riskLevel: PreVisitData['riskAssessment']['level'] =
    triageLevel === 'EMERGENCY' ? 'critical'
      : triageLevel === 'URGENT' ? 'high'
      : triageLevel === 'MODERATE' ? 'moderate'
      : 'low';

  const riskSummary =
    riskLevel === 'critical' ? 'Emergency Evaluation Required'
      : riskLevel === 'high' ? 'Urgent Evaluation Required'
      : riskLevel === 'moderate' ? 'Requires Prompt Attention'
      : 'Routine Evaluation';

  // Action items derived from red flags
  const actionItems: PreVisitData['actionItems'] = redFlags.length > 0
    ? redFlags.map((flag: string, i: number) => ({
        id: `rf-action-${i}`,
        description: `Evaluate: ${flag}`,
        priority: riskLevel === 'critical' || riskLevel === 'high' ? 'urgent' : 'high',
      }))
    : [
        { id: 'action-default', description: 'Review patient history', priority: 'normal' },
        { id: 'action-vitals', description: 'Obtain vital signs', priority: 'normal' },
      ];

  // Chief complaint details
  const cc = api.chiefComplaint || 'Not specified';
  const hpi = api.hpiNarrative || cc;
  const symptoms: string[] = Array.isArray(api.symptoms) ? api.symptoms : [];

  const symptomsText = symptoms.length > 0
    ? `\n\nAssociated symptoms: ${symptoms.join(', ')}.`
    : '';

  // Format DOB
  const dob = p.dateOfBirth
    ? new Date(p.dateOfBirth).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
    : 'Unknown';

  // Critical alert for emergency or urgent with red flags
  const criticalAlert: PreVisitData['criticalAlert'] | undefined =
    (riskLevel === 'critical' || (riskLevel === 'high' && redFlags.length > 0))
      ? {
          message: redFlags.length > 0
            ? `${redFlags[0]} — ${riskSummary}`
            : riskSummary,
          type: 'other',
        }
      : undefined;

  return {
    patient: {
      id: p.id || api.id,
      firstName: p.firstName || 'Unknown',
      lastName: p.lastName || 'Patient',
      age: p.age || 0,
      gender: p.gender || 'Unknown',
      mrn: p.mrn || '',
      dob,
      phone: p.phone || undefined,
    },
    appointment: {
      time: api.completedAt
        ? new Date(api.completedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        : 'Pending',
      type: 'COMPASS Pre-Visit Assessment',
    },
    chiefComplaint: {
      summary: cc,
      patientQuote: cc,
      patientEmphasis: redFlags.length > 0
        ? `Red flags detected: ${redFlags.slice(0, 3).join(', ')}`
        : undefined,
      details: hpi + symptomsText,
    },
    vitals,
    medications,
    allergies,
    riskAssessment: {
      level: riskLevel,
      summary: riskSummary,
      factors: redFlags.map((flag, i) => ({ id: `rf-${i}`, description: flag })),
    },
    actionItems,
    criticalAlert,
  };
}

// ============================================================
// Fetch Assessment from API
// ============================================================

async function fetchAssessment(id: string): Promise<any> {
  const res = await fetch(`/api/assessments/${id}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to load assessment (HTTP ${res.status})`);
  }
  return res.json();
}

// ============================================================
// Page Component
// ============================================================

export default function PreVisitPage() {
  const router = useRouter();
  const { id } = router.query;
  const [preVisitData, setPreVisitData] = useState<PreVisitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rawAssessment, setRawAssessment] = useState<any>(null);

  // Fetch real assessment data
  useEffect(() => {
    if (!id || typeof id !== 'string') return;

    setLoading(true);
    setError(null);

    fetchAssessment(id)
      .then((data) => {
        setRawAssessment(data);
        setPreVisitData(mapApiToPreVisitData(data));
        setLoading(false);
      })
      .catch((err) => {
        console.error('[PreVisit] Failed to load assessment:', err);
        setError(err.message || 'Failed to load assessment');
        setLoading(false);
      });
  }, [id]);

  // Navigation — load adjacent assessments from the queue
  const handleNavigatePatient = async (direction: 'prev' | 'next') => {
    try {
      const res = await fetch('/api/assessments?pageSize=50');
      if (!res.ok) return;
      const data = await res.json();
      const ids: string[] = (data.assessments || []).map((a: any) => a.id);
      const currentIndex = ids.indexOf(id as string);
      if (currentIndex === -1) return;

      const newIndex = direction === 'prev'
        ? Math.max(0, currentIndex - 1)
        : Math.min(ids.length - 1, currentIndex + 1);

      if (newIndex !== currentIndex) {
        router.push(`/previsit/${ids[newIndex]}`);
      }
    } catch {
      // navigation failure is non-critical
    }
  };

  // Action handlers
  const handleStartEncounter = () => {
    router.push(`/visit/${id}`);
  };

  const handleEmergencyProtocol = () => {
    if (preVisitData) {
      try {
        sessionStorage.setItem('emergencyPatient', JSON.stringify({
          id,
          name: `${preVisitData.patient.firstName} ${preVisitData.patient.lastName}`,
          mrn: preVisitData.patient.mrn,
          chiefComplaint: preVisitData.chiefComplaint.summary,
          redFlags: preVisitData.riskAssessment.factors.map((f) => f.description),
        }));
      } catch {
        // sessionStorage may not be available
      }
    }
    router.push(`/visit/${id}?emergency=true`);
  };

  const handleReviewChart = () => {
    const patientId = rawAssessment?.patient?.id;
    if (patientId) {
      router.push(`/patients/${patientId}`);
    } else {
      router.push(`/patients`);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
      >
        <div className="text-center text-white">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg font-medium">Loading pre-visit summary…</p>
          <p className="text-purple-200 text-sm mt-1">Pulling assessment data from database</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !preVisitData) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
      >
        <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center shadow-2xl">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Assessment Not Found</h2>
          <p className="text-gray-600 mb-6">
            {error || 'This assessment could not be loaded. It may have been removed or you may not have permission to view it.'}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
            >
              Go Back
            </button>
            <button
              onClick={() => router.push('/assessments')}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
            >
              All Assessments
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PreVisitSummary
      data={preVisitData}
      onStartEncounter={handleStartEncounter}
      onOrderLabs={() => router.push(`/labs?patientId=${rawAssessment?.patient?.id || id}`)}
      onOrderImaging={() => router.push(`/imaging?patientId=${rawAssessment?.patient?.id || id}`)}
      onPrescribe={() => router.push(`/medications?patientId=${rawAssessment?.patient?.id || id}`)}
      onRefer={() => router.push(`/referrals?patientId=${rawAssessment?.patient?.id || id}`)}
      onScheduleFollowup={() => {
        const name = `${preVisitData.patient.firstName} ${preVisitData.patient.lastName}`;
        router.push(`/schedule?action=new&patientId=${rawAssessment?.patient?.id || id}&patientName=${encodeURIComponent(name)}&type=followup`);
      }}
      onEmergencyProtocol={handleEmergencyProtocol}
      onReviewChart={handleReviewChart}
      onNavigatePatient={handleNavigatePatient}
    />
  );
}
