// ============================================================
// Pre-Visit Summary Page
// apps/provider-portal/pages/previsit/[id].tsx
//
// Loads real assessment data from /api/assessments/[id].
// When provider is connected to Epic/Cerner, EHR data
// (medications, allergies, vitals, conditions) enriches
// the view — EHR is authoritative, assessment is fallback.
// ============================================================

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import type { PreVisitData, PatientVitals } from '@/components/previsit';
import { PreVisitSummary } from '@/components/previsit';
import { usePatientFhirEnrichment } from '@/hooks/usePatientFhirEnrichment';

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
// API → PreVisitData Mapper  (unchanged from original)
// ============================================================

function mapApiToPreVisitData(api: any): PreVisitData {
  const p = api.patient || {};
  const record = api.patientRecord || {};
  const vitalsRaw = record.recentVitals;

  const vitals: PatientVitals = vitalsRaw
    ? {
        bloodPressure: { systolic: vitalsRaw.bloodPressureSystolic ?? 120, diastolic: vitalsRaw.bloodPressureDiastolic ?? 80, status: bpStatus(vitalsRaw.bloodPressureSystolic ?? 120) },
        heartRate: { value: vitalsRaw.heartRate ?? 75, status: hrStatus(vitalsRaw.heartRate ?? 75) },
        temperature: { value: vitalsRaw.temperature ?? 98.6, unit: 'F', status: tempStatus(vitalsRaw.temperature ?? 98.6) },
        respRate: { value: vitalsRaw.respiratoryRate ?? 16, status: respStatus(vitalsRaw.respiratoryRate ?? 16) },
        oxygenSat: { value: vitalsRaw.oxygenSaturation ?? 98, status: o2Status(vitalsRaw.oxygenSaturation ?? 98) },
      }
    : {
        bloodPressure: { systolic: 0, diastolic: 0, status: 'normal' },
        heartRate: { value: 0, status: 'normal' },
        temperature: { value: 0, unit: 'F', status: 'normal' },
        respRate: { value: 0, status: 'normal' },
        oxygenSat: { value: 0, status: 'normal' },
      };

  const medications: PreVisitData['medications'] =
    record.medications?.length > 0
      ? record.medications.map((m: any) => ({ id: m.id, name: m.name, dosage: m.dose || 'See chart', frequency: m.frequency || '', status: (m.status?.toLowerCase() || 'active') as any }))
      : (api.medications as string[] || []).map((name: string, i: number) => ({ id: `asm-med-${i}`, name, dosage: '', frequency: '', status: 'active' as const }));

  const allergies: PreVisitData['allergies'] =
    record.allergies?.length > 0
      ? record.allergies.map((a: any) => ({ id: a.id, allergen: a.allergen, reaction: a.reaction || 'Unknown reaction', severity: (a.severity?.toLowerCase() || 'moderate') as any }))
      : (api.allergies as string[] || []).map((name: string, i: number) => ({ id: `asm-allergy-${i}`, allergen: name, reaction: 'See chart', severity: 'moderate' as const }));

  const redFlags: string[] = Array.isArray(api.redFlags) ? api.redFlags : [];
  const triageLevel: string = api.triageLevel || 'ROUTINE';
  const riskLevel: PreVisitData['riskAssessment']['level'] =
    triageLevel === 'EMERGENCY' ? 'critical' : triageLevel === 'URGENT' ? 'high' : triageLevel === 'MODERATE' ? 'moderate' : 'low';
  const riskSummary = riskLevel === 'critical' ? 'Emergency Evaluation Required' : riskLevel === 'high' ? 'Urgent Evaluation Required' : riskLevel === 'moderate' ? 'Requires Prompt Attention' : 'Routine Evaluation';

  const actionItems: PreVisitData['actionItems'] = redFlags.length > 0
    ? redFlags.map((flag: string, i: number) => ({ id: `rf-action-${i}`, description: `Evaluate: ${flag}`, priority: riskLevel === 'critical' || riskLevel === 'high' ? 'urgent' : 'high' }))
    : [{ id: 'action-default', description: 'Review patient history', priority: 'normal' }, { id: 'action-vitals', description: 'Obtain vital signs', priority: 'normal' }];

  const cc = api.chiefComplaint || 'Not specified';
  const hpi = api.hpiNarrative || cc;
  const symptoms: string[] = Array.isArray(api.symptoms) ? api.symptoms : [];
  const symptomsText = symptoms.length > 0 ? `\n\nAssociated symptoms: ${symptoms.join(', ')}.` : '';
  const dob = p.dateOfBirth ? new Date(p.dateOfBirth).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : 'Unknown';
  const criticalAlert: PreVisitData['criticalAlert'] | undefined =
    (riskLevel === 'critical' || (riskLevel === 'high' && redFlags.length > 0))
      ? { message: redFlags.length > 0 ? `${redFlags[0]} — ${riskSummary}` : riskSummary, type: 'other' }
      : undefined;

  return {
    patient: { id: p.id || api.id, firstName: p.firstName || 'Unknown', lastName: p.lastName || 'Patient', age: p.age || 0, gender: p.gender || 'Unknown', mrn: p.mrn || '', dob, phone: p.phone || undefined },
    appointment: { time: api.completedAt ? new Date(api.completedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'Pending', type: 'COMPASS Pre-Visit Assessment' },
    chiefComplaint: { summary: cc, patientQuote: cc, patientEmphasis: redFlags.length > 0 ? `Red flags detected: ${redFlags.slice(0, 3).join(', ')}` : undefined, details: hpi + symptomsText },
    vitals,
    medications,
    allergies,
    riskAssessment: { level: riskLevel, summary: riskSummary, factors: redFlags.map((flag, i) => ({ id: `rf-${i}`, description: flag })) },
    actionItems,
    criticalAlert,
  };
}

// ============================================================
// EHR Source Badge
// ============================================================

function EhrBadge({ source }: { source: 'epic' | 'cerner' | 'ehr' }) {
  const label = source === 'epic' ? '⚡ Epic EHR' : source === 'cerner' ? '⚡ Oracle Health' : '⚡ EHR';
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
      {label}
      <span className="font-normal">data loaded</span>
    </div>
  );
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
  const [baseData, setBaseData] = useState<PreVisitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rawAssessment, setRawAssessment] = useState<any>(null);

  // Grab the FHIR patient ID from the assessment once loaded
  // Epic patient IDs are stored in the assessment's fhirPatientId field when available
  const fhirPatientId: string | null = rawAssessment?.fhirPatientId || rawAssessment?.patient?.fhirId || null;

  // EHR enrichment — runs in parallel with page load, non-blocking
  const ehr = usePatientFhirEnrichment(fhirPatientId);

  // Fetch real assessment data
  useEffect(() => {
    if (!id || typeof id !== 'string') return;
    setLoading(true);
    setError(null);
    fetchAssessment(id)
      .then((data) => {
        setRawAssessment(data);
        setBaseData(mapApiToPreVisitData(data));
        setLoading(false);
      })
      .catch((err) => {
        console.error('[PreVisit] Failed to load assessment:', err);
        setError(err.message || 'Failed to load assessment');
        setLoading(false);
      });
  }, [id]);

  // Merge EHR enrichment over assessment base data
  // EHR wins on medications, allergies, and vitals when available
  const preVisitData: PreVisitData | null = useMemo(() => {
    if (!baseData) return null;
    if (!ehr.isConnected || ehr.isLoading) return baseData;

    return {
      ...baseData,

      // EHR medications override assessment medications when available
      medications: ehr.medications
        ? ehr.medications.map((m) => ({
            id: m.id,
            name: m.name,
            dosage: m.dosage,
            frequency: m.frequency,
            status: m.status,
          }))
        : baseData.medications,

      // EHR allergies override assessment allergies when available
      allergies: ehr.allergies
        ? ehr.allergies.map((a) => ({
            id: a.id,
            allergen: a.allergen,
            reaction: a.reaction,
            severity: a.severity === 'unknown' ? ('moderate' as const) : a.severity,
          }))
        : baseData.allergies,

      // EHR vitals override if all key values are present
      vitals: ehr.vitals?.bloodPressure && ehr.vitals.bloodPressure.systolic > 0
        ? {
            bloodPressure: {
              systolic: ehr.vitals.bloodPressure.systolic,
              diastolic: ehr.vitals.bloodPressure.diastolic,
              status: bpStatus(ehr.vitals.bloodPressure.systolic),
            },
            heartRate: ehr.vitals.heartRate
              ? { value: ehr.vitals.heartRate, status: hrStatus(ehr.vitals.heartRate) }
              : baseData.vitals.heartRate,
            temperature: ehr.vitals.temperature
              ? { value: ehr.vitals.temperature, unit: 'F' as const, status: tempStatus(ehr.vitals.temperature) }
              : baseData.vitals.temperature,
            respRate: ehr.vitals.respiratoryRate
              ? { value: ehr.vitals.respiratoryRate, status: respStatus(ehr.vitals.respiratoryRate) }
              : baseData.vitals.respRate,
            oxygenSat: ehr.vitals.oxygenSaturation
              ? { value: ehr.vitals.oxygenSaturation, status: o2Status(ehr.vitals.oxygenSaturation) }
              : baseData.vitals.oxygenSat,
          }
        : baseData.vitals,
    };
  }, [baseData, ehr]);

  // Navigation
  const handleNavigatePatient = async (direction: 'prev' | 'next') => {
    try {
      const res = await fetch('/api/assessments?pageSize=50');
      if (!res.ok) return;
      const data = await res.json();
      const ids: string[] = (data.assessments || []).map((a: any) => a.id);
      const currentIndex = ids.indexOf(id as string);
      if (currentIndex === -1) return;
      const newIndex = direction === 'prev' ? Math.max(0, currentIndex - 1) : Math.min(ids.length - 1, currentIndex + 1);
      if (newIndex !== currentIndex) router.push(`/previsit/${ids[newIndex]}`);
    } catch { /* non-critical */ }
  };

  const handleStartEncounter = () => router.push(`/visit/${id}`);

  const handleEmergencyProtocol = () => {
    if (preVisitData) {
      try {
        sessionStorage.setItem('emergencyPatient', JSON.stringify({
          id, name: `${preVisitData.patient.firstName} ${preVisitData.patient.lastName}`,
          mrn: preVisitData.patient.mrn, chiefComplaint: preVisitData.chiefComplaint.summary,
          redFlags: preVisitData.riskAssessment.factors.map((f) => f.description),
        }));
      } catch { /* sessionStorage unavailable */ }
    }
    router.push(`/visit/${id}?emergency=true`);
  };

  const handleReviewChart = () => {
    const patientId = rawAssessment?.patient?.id;
    router.push(patientId ? `/patients/${patientId}` : `/patients`);
  };

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div className="text-center text-white">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg font-medium">Loading pre-visit summary…</p>
          <p className="text-purple-200 text-sm mt-1">Pulling assessment data from database</p>
        </div>
      </div>
    );
  }

  // Error
  if (error || !preVisitData) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center shadow-2xl">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"><span className="text-3xl">⚠️</span></div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Assessment Not Found</h2>
          <p className="text-gray-600 mb-6">{error || 'This assessment could not be loaded.'}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => router.back()} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors">Go Back</button>
            <button onClick={() => router.push('/assessments')} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors">All Assessments</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* EHR source badge — only shown when connected */}
      {ehr.isConnected && ehr.source && (
        <div className="fixed bottom-4 right-4 z-50">
          <EhrBadge source={ehr.source} />
        </div>
      )}
      <PreVisitSummary
        data={preVisitData}
        onStartEncounter={handleStartEncounter}
        onOrderLabs={() => {
          const pid = rawAssessment?.patient?.id || id;
          const cc = encodeURIComponent(rawAssessment?.chiefComplaint || '');
          router.push(`/labs?patientId=${pid}&assessmentId=${id}&chiefComplaint=${cc}`);
        }}
        onOrderImaging={() => router.push(`/imaging?patientId=${rawAssessment?.patient?.id || id}&assessmentId=${id}`)}
        onPrescribe={() => router.push(`/medications?patientId=${rawAssessment?.patient?.id || id}&assessmentId=${id}`)}
        onRefer={() => router.push(`/referrals?patientId=${rawAssessment?.patient?.id || id}&assessmentId=${id}`)}
        onScheduleFollowup={() => {
          const name = `${preVisitData.patient.firstName} ${preVisitData.patient.lastName}`;
          router.push(`/schedule?action=new&patientId=${rawAssessment?.patient?.id || id}&patientName=${encodeURIComponent(name)}&type=followup`);
        }}
        onEmergencyProtocol={handleEmergencyProtocol}
        onReviewChart={handleReviewChart}
        onNavigatePatient={handleNavigatePatient}
      />
    </div>
  );
}
