// ATTENDING AI - Demo Seed Script
// prisma/seed-demo.ts
//
// Seeds realistic demo data for investor presentations.
// Run: npx ts-node prisma/seed-demo.ts

import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding demo data...\n');

  // =========================================================================
  // 0. Organization
  // =========================================================================
  const org = await prisma.organization.upsert({
    where: { slug: 'demo-attending-ai' },
    update: {},
    create: {
      name: 'ATTENDING AI Demo Clinic',
      slug: 'demo-attending-ai',
      type: 'RURAL_HEALTH_CLINIC',
      npi: '9876543210',
      address: '200 Demo Drive',
      city: 'Denver',
      state: 'CO',
      zipCode: '80202',
      phone: '303-555-0100',
      settings: JSON.stringify({ timezone: 'America/Denver' }),
      featureFlags: JSON.stringify({
        FEATURE_AI_DIFFERENTIAL_DIAGNOSIS: true,
        FEATURE_AI_LAB_ORDERING: true,
        FEATURE_AI_DRUG_RECOMMENDATIONS: true,
        FEATURE_AMBIENT_DOCUMENTATION: true,
        FEATURE_IMAGING_ORDERS: true,
        FEATURE_MEDICATION_ORDERS: true,
        FEATURE_REFERRAL_ORDERS: true,
      }),
    },
  });
  console.log('✓ Organization:', org.name);

  // =========================================================================
  // 1. Provider
  // =========================================================================
  const provider = await prisma.user.upsert({
    where: { email: 'scott.isbell@attending.ai' },
    update: { organizationId: org.id },
    create: {
      organizationId: org.id,
      email: 'scott.isbell@attending.ai',
      name: 'Dr. Scott Isbell',
      role: 'PROVIDER',
      specialty: 'Family Medicine',
      npi: '1987654321',
    },
  });
  console.log('✓ Provider:', provider.name);

  // Demo login account (email: demo@attending.ai / password: demo1234)
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@attending.ai' },
    update: { organizationId: org.id, isActive: true },
    create: {
      organizationId: org.id,
      email: 'demo@attending.ai',
      name: 'Demo Provider',
      role: 'PROVIDER',
      specialty: 'Family Medicine',
      npi: '1234567890',
      password: hashPassword('demo1234'),
      isActive: true,
    },
  });
  console.log('✓ Demo user:', demoUser.email, '(password: demo1234)');

  // =========================================================================
  // 2. Patients
  // =========================================================================
  const patientDefs = [
    { mrn: 'DEMO-001', firstName: 'Margaret', lastName: 'White', dateOfBirth: new Date('1953-06-12'), gender: 'Female', email: 'margaret.white@example.com', phone: '303-555-0101' },
    { mrn: 'DEMO-002', firstName: 'Robert', lastName: 'Martinez', dateOfBirth: new Date('1959-11-23'), gender: 'Male', email: 'robert.martinez@example.com', phone: '303-555-0102' },
    { mrn: 'DEMO-003', firstName: 'Sarah', lastName: 'Johnson', dateOfBirth: new Date('1993-04-08'), gender: 'Female', email: 'sarah.johnson@example.com', phone: '303-555-0103' },
    { mrn: 'DEMO-004', firstName: 'James', lastName: 'Wilson', dateOfBirth: new Date('1970-09-30'), gender: 'Male', email: 'james.wilson@example.com', phone: '303-555-0104' },
    { mrn: 'DEMO-005', firstName: 'Dorothy', lastName: 'Clark', dateOfBirth: new Date('1944-02-17'), gender: 'Female', email: 'dorothy.clark@example.com', phone: '303-555-0105' },
    { mrn: 'DEMO-006', firstName: 'Kevin', lastName: 'Nguyen', dateOfBirth: new Date('1997-07-14'), gender: 'Male', email: 'kevin.nguyen@example.com', phone: '303-555-0106' },
  ];

  const patients = await Promise.all(
    patientDefs.map((p) =>
      prisma.patient.upsert({
        where: { organizationId_mrn: { organizationId: org.id, mrn: p.mrn } },
        update: {},
        create: { ...p, organizationId: org.id },
      })
    )
  );

  console.log(`✓ ${patients.length} patients created`);

  // =========================================================================
  // 3. Assessments — realistic clinical scenarios
  // =========================================================================
  const now = new Date();
  const minutesAgo = (m: number) => new Date(now.getTime() - m * 60000);

  const assessmentData = [
    {
      patient: patients[0], // Margaret White, 71yo F
      sessionId: 'COMPASS-DEMO-001',
      chiefComplaint: 'Worsening shortness of breath over 3 days',
      hpiNarrative: 'Chief complaint: Worsening shortness of breath over 3 days. Onset: 3 days ago, gradual. Location: Bilateral chest. Duration: Persistent, worsening. Character: Feels like can\'t get enough air, worse lying flat. Severity: 7/10. Aggravating factors: exertion, lying flat, walking up stairs. Relieving factors: sitting upright, rest. Associated symptoms: lower extremity swelling, 5-pound weight gain, fatigue.',
      symptoms: ['dyspnea', 'orthopnea', 'lower extremity edema', 'weight gain', 'fatigue'],
      reviewOfSystems: { cardiovascular: ['orthopnea', 'PND', 'edema'], respiratory: ['dyspnea on exertion', 'cough'], constitutional: ['fatigue', 'weight gain'] },
      medications: ['Lisinopril 20mg daily', 'Metoprolol 50mg BID', 'Furosemide 40mg daily', 'Aspirin 81mg daily'],
      allergies: ['Penicillin - rash', 'Sulfa drugs - hives'],
      medicalHistory: ['CHF (EF 35%)', 'Hypertension', 'Type 2 Diabetes', 'Atrial Fibrillation'],
      triageLevel: 'URGENT',
      redFlags: ['Acute dyspnea worsening', 'Orthopnea', 'Lower extremity edema', 'Known CHF with low EF'],
      aiSummary: '71-year-old female with known CHF (EF 35%) presenting with 3-day history of progressive dyspnea, orthopnea, and bilateral lower extremity edema with 5-pound weight gain. Symptoms consistent with acute decompensated heart failure. Current on Lisinopril, Metoprolol, and Furosemide. Requires urgent evaluation — consider BNP, chest X-ray, and diuretic adjustment.',
      aiDifferential: [
        { name: 'Acute Decompensated Heart Failure', probability: 0.82, supportingEvidence: ['Known CHF', 'Orthopnea', 'Edema', 'Weight gain'] },
        { name: 'Pneumonia', probability: 0.12, supportingEvidence: ['Dyspnea', 'Cough'] },
        { name: 'Pulmonary Embolism', probability: 0.06, supportingEvidence: ['Acute dyspnea', 'Age'] },
      ],
      completedAt: minutesAgo(12),
    },
    {
      patient: patients[1], // Robert Martinez, 65yo M
      sessionId: 'COMPASS-DEMO-002',
      chiefComplaint: 'Intermittent chest pressure for 2 weeks',
      hpiNarrative: 'Chief complaint: Intermittent chest pressure for 2 weeks. Onset: 2 weeks ago. Location: Substernal, radiating to left arm. Duration: Episodes last 5-10 minutes. Character: Pressure, squeezing. Severity: 6/10. Aggravating factors: exertion, stress, climbing stairs. Relieving factors: rest, sitting down. Associated symptoms: diaphoresis during episodes, mild nausea.',
      symptoms: ['chest pressure', 'left arm radiation', 'diaphoresis', 'nausea'],
      reviewOfSystems: { cardiovascular: ['chest pressure', 'diaphoresis'], gastrointestinal: ['nausea'], constitutional: ['no fever', 'no weight loss'] },
      medications: ['Atorvastatin 40mg daily', 'Metformin 1000mg BID', 'Amlodipine 5mg daily'],
      allergies: ['NKDA'],
      medicalHistory: ['Hyperlipidemia', 'Type 2 Diabetes', 'Hypertension', 'Family hx: father MI at age 58'],
      triageLevel: 'URGENT',
      redFlags: ['Exertional chest pain', 'Radiation to left arm', 'Diaphoresis', 'Multiple cardiac risk factors'],
      aiSummary: '65-year-old male with significant cardiac risk factors (DM, HTN, hyperlipidemia, family history) presenting with 2-week history of exertional substernal chest pressure with left arm radiation and diaphoresis. High pretest probability for unstable angina or ACS. Recommend urgent ECG, troponins, and cardiology referral.',
      aiDifferential: [
        { name: 'Unstable Angina', probability: 0.68, supportingEvidence: ['Exertional chest pain', 'Left arm radiation', 'Risk factors'] },
        { name: 'Acute Coronary Syndrome', probability: 0.22, supportingEvidence: ['Diaphoresis', 'Substernal pressure', 'Family hx'] },
        { name: 'GERD', probability: 0.10, supportingEvidence: ['Nausea', 'Intermittent nature'] },
      ],
      completedAt: minutesAgo(28),
    },
    {
      patient: patients[2], // Sarah Johnson, 31yo F
      sessionId: 'COMPASS-DEMO-003',
      chiefComplaint: 'Severe headache for 3 days, worst of life',
      hpiNarrative: 'Chief complaint: Severe headache for 3 days. Onset: Sudden onset 3 days ago. Location: Bilateral, occipital. Duration: Constant, not improving. Character: Throbbing, intense. Severity: 9/10. Aggravating factors: light, noise, bending over. Relieving factors: dark room, ibuprofen provides minimal relief. Associated symptoms: neck stiffness, photophobia, nausea, one episode of vomiting.',
      symptoms: ['severe headache', 'neck stiffness', 'photophobia', 'nausea', 'vomiting'],
      reviewOfSystems: { neurological: ['headache', 'photophobia', 'neck stiffness'], gastrointestinal: ['nausea', 'vomiting'], constitutional: ['no fever'] },
      medications: ['Oral contraceptive pill'],
      allergies: ['Codeine - nausea'],
      medicalHistory: ['Migraines (diagnosed age 22)', 'Anxiety'],
      triageLevel: 'EMERGENCY',
      redFlags: ['Worst headache of life', 'Neck stiffness', 'Sudden onset thunderclap pattern', 'Not responsive to usual treatment'],
      aiSummary: '31-year-old female with history of migraines presenting with acute severe headache described as "worst of life" with neck stiffness and photophobia. Thunderclap pattern with meningeal signs raises concern for subarachnoid hemorrhage versus meningitis. This presentation deviates significantly from her baseline migraines. Recommend emergent CT head without contrast followed by LP if CT negative.',
      aiDifferential: [
        { name: 'Subarachnoid Hemorrhage', probability: 0.45, supportingEvidence: ['Worst headache of life', 'Sudden onset', 'Neck stiffness'] },
        { name: 'Meningitis', probability: 0.30, supportingEvidence: ['Neck stiffness', 'Photophobia', 'Headache'] },
        { name: 'Severe Migraine with Atypical Features', probability: 0.25, supportingEvidence: ['Migraine history', 'Photophobia', 'Nausea'] },
      ],
      completedAt: minutesAgo(5),
    },
    {
      patient: patients[3], // James Wilson, 55yo M
      sessionId: 'COMPASS-DEMO-004',
      chiefComplaint: 'Low back pain radiating to right leg for 1 week',
      hpiNarrative: 'Chief complaint: Low back pain radiating to right leg for 1 week. Onset: 1 week ago after lifting heavy box. Location: Lower lumbar, radiating down right posterior thigh to calf. Duration: Constant dull ache, sharp with movement. Character: Dull ache at rest, sharp shooting pain with bending. Severity: 5/10 at rest, 8/10 with movement. Aggravating factors: bending, sitting prolonged, coughing. Relieving factors: lying flat, ibuprofen. Associated symptoms: numbness in right lateral foot.',
      symptoms: ['low back pain', 'right leg radiculopathy', 'numbness right foot'],
      reviewOfSystems: { musculoskeletal: ['back pain', 'leg pain'], neurological: ['numbness right foot', 'no weakness', 'no bowel/bladder changes'] },
      medications: ['Ibuprofen 600mg PRN'],
      allergies: ['NKDA'],
      medicalHistory: ['Lumbar strain 2019', 'Otherwise healthy'],
      triageLevel: 'MODERATE',
      redFlags: [],
      aiSummary: '55-year-old male presenting with acute low back pain with right-sided radiculopathy following mechanical lifting injury. Distribution suggests L5-S1 involvement. No red flag symptoms (no saddle anesthesia, no bowel/bladder changes, no progressive weakness). Conservative management appropriate with activity modification, NSAIDs, and physical therapy referral. Consider MRI if symptoms persist beyond 6 weeks.',
      aiDifferential: [
        { name: 'Lumbar Disc Herniation L5-S1', probability: 0.72, supportingEvidence: ['Radiculopathy pattern', 'Mechanical onset', 'Lateral foot numbness'] },
        { name: 'Lumbar Radiculopathy', probability: 0.20, supportingEvidence: ['Leg pain', 'Numbness'] },
        { name: 'Lumbar Strain', probability: 0.08, supportingEvidence: ['Lifting injury', 'Low back pain'] },
      ],
      completedAt: minutesAgo(45),
    },
    {
      patient: patients[4], // Dorothy Clark, 81yo F
      sessionId: 'COMPASS-DEMO-005',
      chiefComplaint: 'Fall at home this morning, hip pain',
      hpiNarrative: 'Chief complaint: Fall at home this morning. Onset: This morning around 7 AM. Location: Right hip. Duration: Since fall. Character: Sharp, unable to bear weight. Severity: 8/10. Aggravating factors: any movement, attempted weight bearing. Relieving factors: staying still. Associated symptoms: briefly felt dizzy before fall, hit head on table but no loss of consciousness, on blood thinners.',
      symptoms: ['right hip pain', 'unable to bear weight', 'dizziness', 'head strike'],
      reviewOfSystems: { musculoskeletal: ['right hip pain', 'unable to bear weight'], neurological: ['dizziness pre-fall', 'no LOC', 'no confusion'], cardiovascular: ['no chest pain', 'no palpitations'] },
      medications: ['Warfarin 5mg daily', 'Donepezil 10mg daily', 'Calcium + Vitamin D', 'Omeprazole 20mg daily'],
      allergies: ['Aspirin - GI bleeding'],
      medicalHistory: ['Atrial Fibrillation on Warfarin', 'Early Alzheimer Disease', 'Osteoporosis', 'GERD', 'Prior hip fracture L side 2018'],
      triageLevel: 'EMERGENCY',
      redFlags: ['Fall with head strike on anticoagulation', 'Unable to bear weight', 'Prior hip fracture history', 'Osteoporosis'],
      aiSummary: '81-year-old female on Warfarin presenting after mechanical fall with right hip pain and inability to bear weight. Head strike on anticoagulation requires urgent CT head to rule out intracranial hemorrhage. High suspicion for right hip fracture given osteoporosis and mechanism. Pre-syncopal dizziness may indicate underlying cardiac or orthostatic etiology. Recommend: STAT CT head, right hip X-ray, INR, CBC, BMP.',
      aiDifferential: [
        { name: 'Right Hip Fracture', probability: 0.78, supportingEvidence: ['Unable to bear weight', 'Osteoporosis', 'Prior contralateral fracture'] },
        { name: 'Intracranial Hemorrhage', probability: 0.15, supportingEvidence: ['Head strike', 'On Warfarin'] },
        { name: 'Syncope - Cardiac Etiology', probability: 0.07, supportingEvidence: ['Pre-fall dizziness', 'A-fib history', 'Age'] },
      ],
      completedAt: minutesAgo(8),
    },
    {
      patient: patients[5], // Kevin Nguyen, 28yo M
      sessionId: 'COMPASS-DEMO-006',
      chiefComplaint: 'Annual physical, new to area',
      hpiNarrative: 'Chief complaint: Requesting annual physical exam, recently moved to Colorado. No acute complaints. Last physical 2 years ago. Generally feeling well.',
      symptoms: [],
      reviewOfSystems: { constitutional: ['no fever', 'no weight changes', 'good energy'], cardiovascular: ['no chest pain'], respiratory: ['no cough', 'no dyspnea'] },
      medications: [],
      allergies: ['NKDA'],
      medicalHistory: ['No significant past medical history'],
      triageLevel: 'ROUTINE',
      redFlags: [],
      aiSummary: '28-year-old healthy male presenting for establish-care visit after relocation. No acute complaints. Due for age-appropriate preventive care including lipid panel screening and immunization review. Consider Colorado-specific counseling on altitude adjustment and sun exposure.',
      aiDifferential: [
        { name: 'Wellness Visit / Establish Care', probability: 0.95, supportingEvidence: ['No complaints', 'New patient', 'Preventive care'] },
      ],
      completedAt: minutesAgo(120),
    },
  ];

  for (const a of assessmentData) {
    const existing = await prisma.patientAssessment.findFirst({
      where: { sessionId: a.sessionId },
    });

    if (existing) {
      console.log(`  ⏭ Assessment ${a.sessionId} already exists`);
      continue;
    }

    const assessment = await prisma.patientAssessment.create({
      data: {
        organizationId: org.id,
        sessionId: a.sessionId,
        patientId: a.patient.id,
        status: 'COMPLETED',
        phase: 'COMPLETE',
        chiefComplaint: a.chiefComplaint,
        hpiNarrative: a.hpiNarrative,
        symptoms: JSON.stringify(a.symptoms),
        reviewOfSystems: JSON.stringify(a.reviewOfSystems),
        medications: JSON.stringify(a.medications),
        allergies: JSON.stringify(a.allergies),
        medicalHistory: JSON.stringify(a.medicalHistory),
        vitalSigns: null,
        triageLevel: a.triageLevel,
        redFlagsDetected: a.redFlags.length > 0 ? JSON.stringify(a.redFlags) : null,
        aiSummary: a.aiSummary,
        aiDifferential: JSON.stringify(a.aiDifferential),
        conversation: null,
        startedAt: new Date(a.completedAt.getTime() - 15 * 60000),
        completedAt: a.completedAt,
        lastActivityAt: a.completedAt,
      },
    });

    // Emergency events for red-flag cases
    if (a.redFlags.length > 0) {
      await prisma.emergencyEvent.create({
        data: {
          organizationId: org.id,
          patientId: a.patient.id,
          assessmentId: assessment.id,
          eventType: 'RED_FLAG',
          severity: a.triageLevel === 'EMERGENCY' ? 'CRITICAL' : 'HIGH',
          description: `COMPASS detected ${a.redFlags.length} red flag(s): ${a.redFlags.join(', ')}`,
          triggeredBy: 'SYSTEM',
        },
      });
    }

    console.log(`  ✓ ${a.patient.firstName} ${a.patient.lastName} — ${a.chiefComplaint} [${a.triageLevel}]`);
  }

  // =========================================================================
  // 4. Audit log entries
  // =========================================================================
  await prisma.auditLog.create({
    data: {
      userId: provider.id,
      action: 'DEMO_SEED',
      entityType: 'System',
      changes: JSON.stringify({ seededAt: new Date().toISOString(), assessments: assessmentData.length }),
      success: true,
    },
  });

  console.log('\n✅ Demo seed complete!');
  console.log(`   ${patients.length} patients`);
  console.log(`   ${assessmentData.length} assessments`);
  console.log(`   2 providers (Dr. Scott Isbell + demo@attending.ai / demo1234)`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
