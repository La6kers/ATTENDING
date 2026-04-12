// ============================================================
// Shared Patient Context Fetcher
// apps/provider-portal/lib/fetchPatientContext.ts
//
// Fetches patient demographics + assessment clinical data in
// parallel, merging them into an OrderingContext suitable for
// lab, imaging, medication, and referral ordering stores.
//
// Data priority:
//   • Patient record rows (allergies, medications, conditions)
//     take precedence over assessment JSON strings.
//   • Assessment-only fields (chiefComplaint, redFlags,
//     triageLevel, primaryDiagnosis) always come from assessment.
//   • Deduplication applied on medicalHistory merge.
// ============================================================

export interface FetchedPatientContext {
  id: string;
  name: string;
  age: number;
  gender: string;
  mrn: string;
  chiefComplaint: string;
  primaryDiagnosis?: string;
  allergies: Array<{ allergen: string; reaction: string; severity: 'mild' | 'moderate' | 'severe' }>;
  /** Flat string list — store-agnostic representation */
  allergyNames: string[];
  currentMedications: string[];
  medicalHistory: string[];
  redFlags: string[];
  // Imaging-specific safety fields
  weight?: number;
  creatinine?: number;
  gfr?: number;
  pregnant?: boolean;
  // Referral-specific fields
  insurancePlan?: string;
  pcp?: string;
}

/** Request timeout in milliseconds (10 seconds). Rural clinic connections may be slow. */
const FETCH_TIMEOUT_MS = 10_000;

/**
 * Fetch patient + assessment data from provider-portal BFF endpoints.
 *
 * Applies a 10-second timeout via AbortController on each fetch. If the
 * network is slow (common in rural settings), callers should fall back to
 * DEMO_PATIENT and surface a toast rather than hanging indefinitely.
 *
 * @param patientId   – Required patient ID
 * @param assessmentId – Optional COMPASS assessment ID
 * @returns Merged patient context
 */
export async function fetchPatientContext(
  patientId: string,
  assessmentId?: string,
): Promise<FetchedPatientContext> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    // Fetch patient record and (optionally) assessment in parallel
    const [patientRes, assessmentRes] = await Promise.all([
      fetch(`/api/patients/${patientId}`, { signal: controller.signal }),
      assessmentId
        ? fetch(`/api/assessments/${assessmentId}`, { signal: controller.signal })
        : Promise.resolve(null),
    ]);

    clearTimeout(timeoutId);

    if (!patientRes.ok) throw new Error(`Patient fetch failed (${patientRes.status})`);
  const patientJson = await patientRes.json();
  const patient = patientJson.patient || patientJson;

  let assessment: any = null;
  if (assessmentRes && assessmentRes.ok) {
    assessment = await assessmentRes.json();
  }

  // ── Allergies ─────────────────────────────────────────────
  // Prefer patient record rows (full objects), fall back to assessment strings
  const allergies: FetchedPatientContext['allergies'] =
    patient.allergies?.length > 0
      ? patient.allergies.map((a: any) => ({
          allergen: typeof a === 'string' ? a : a.allergen,
          reaction: typeof a === 'string' ? 'Unknown' : a.reaction || 'Unknown',
          severity: (typeof a === 'string' ? 'moderate' : a.severity?.toLowerCase() || 'moderate') as any,
        }))
      : (assessment?.allergies || []).map((a: string) => ({
          allergen: a,
          reaction: 'See chart',
          severity: 'moderate' as const,
        }));

  const allergyNames = allergies.map((a) => a.allergen);

  // ── Medications ───────────────────────────────────────────
  const currentMedications: string[] =
    patient.medications?.length > 0
      ? patient.medications.map((m: any) =>
          typeof m === 'string' ? m : `${m.name} ${m.dose || ''}`.trim(),
        )
      : assessment?.medications || [];

  // ── Medical history ───────────────────────────────────────
  const conditionNames = (patient.conditions || []).map((c: any) =>
    typeof c === 'string' ? c : c.name,
  );
  const assessmentHistory = assessment?.medicalHistory || [];
  const medicalHistory = [...new Set([...conditionNames, ...assessmentHistory])];

  // ── Age ───────────────────────────────────────────────────
  let age = patient.age;
  if (!age && patient.dateOfBirth) {
    const dob = new Date(patient.dateOfBirth);
    age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  }

  return {
    id: patient.id || patientId,
    name:
      patient.name ||
      `${patient.firstName || ''} ${patient.lastName || ''}`.trim() ||
      'Unknown Patient',
    age: age || 0,
    gender: patient.gender || 'Unknown',
    mrn: patient.mrn || '',
    chiefComplaint: assessment?.chiefComplaint || '',
    primaryDiagnosis: assessment?.primaryDiagnosis || '',
    allergies,
    allergyNames,
    currentMedications,
    medicalHistory,
    redFlags: assessment?.redFlags || [],
    // Imaging safety
    weight: patient.weight ?? undefined,
    creatinine: patient.creatinine ?? undefined,
    gfr: patient.gfr ?? undefined,
    pregnant: patient.pregnant ?? undefined,
    // Referral-specific
    insurancePlan: patient.insurancePlan || patient.insurance?.plan || '',
    pcp: patient.pcp || patient.primaryCareProvider || '',
  };
  } catch (err) {
    clearTimeout(timeoutId);
    // Re-throw with a clearer message for AbortError (timeout)
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Patient data request timed out after ${FETCH_TIMEOUT_MS / 1000}s. Check network connectivity.`);
    }
    throw err;
  }
}
