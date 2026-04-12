// ATTENDING AI - Database Seed Script
// Exercises the complete encounter flow: Organization → Provider → Patient →
// Clinical Data → Assessment → Encounter → Lab Order → Results → Audit Trail
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...\n');

  // =========================================================================
  // 1. ORGANIZATION — the tenant everything hangs off of
  // =========================================================================
  const org = await prisma.organization.upsert({
    where: { slug: 'demo-clinic' },
    update: {},
    create: {
      name: 'Demo Rural Health Clinic',
      slug: 'demo-clinic',
      type: 'RURAL_HEALTH_CLINIC',
      npi: '9999999999',
      address: '100 Main Street',
      city: 'Springfield',
      state: 'MO',
      zipCode: '65801',
      phone: '555-0100',
      tier: 'standard',
      settings: JSON.stringify({ timezone: 'America/Chicago' }),
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
  console.log(`[1] Organization: ${org.name} (${org.id})`);

  // =========================================================================
  // 2. PROVIDER — the physician who will see the patient
  // =========================================================================
  const provider = await prisma.user.upsert({
    where: { email: 'dr.smith@demo-clinic.org' },
    update: { organizationId: org.id },
    create: {
      organizationId: org.id,
      email: 'dr.smith@demo-clinic.org',
      name: 'Dr. Sarah Smith',
      role: 'PROVIDER',
      specialty: 'Family Medicine',
      npi: '1234567890',
      department: 'Primary Care',
    },
  });
  console.log(`[2] Provider: ${provider.name}`);

  // =========================================================================
  // 2b. DR. ISBELL — Founder/CEO physician account
  // =========================================================================
  const drIsbell = await prisma.user.upsert({
    where: { email: 'scott.isbell@attending.ai' },
    update: { organizationId: org.id },
    create: {
      organizationId: org.id,
      email: 'scott.isbell@attending.ai',
      name: 'Dr. Scott Isbell',
      role: 'ADMIN',
      specialty: 'Emergency Medicine',
      department: 'Administration',
    },
  });
  console.log(`[2b] Founder: ${drIsbell.name}`);

  // =========================================================================
  // 3. PATIENT — arrives at the clinic with multiple chronic conditions
  // =========================================================================
  const patient = await prisma.patient.upsert({
    where: { organizationId_mrn: { organizationId: org.id, mrn: 'MRN-SEED-001' } },
    update: {},
    create: {
      organizationId: org.id,
      mrn: 'MRN-SEED-001',
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: new Date('1965-03-15'),
      gender: 'Male',
      email: 'john.doe@email.com',
      phone: '555-1234',
      address: '456 Oak Avenue',
      city: 'Springfield',
      state: 'MO',
      zipCode: '65801',
    },
  });
  console.log(`[3] Patient: ${patient.firstName} ${patient.lastName} (${patient.mrn})`);

  // =========================================================================
  // 4. EXISTING CLINICAL DATA — loaded before today's visit
  //    Allergies, Medications, Conditions, Vitals from last visit
  // =========================================================================

  // Allergies
  await prisma.allergy.create({
    data: {
      organizationId: org.id,
      patientId: patient.id,
      allergen: 'Penicillin',
      reaction: 'Hives, facial swelling',
      severity: 'MODERATE',
      status: 'ACTIVE',
    },
  });
  await prisma.allergy.create({
    data: {
      organizationId: org.id,
      patientId: patient.id,
      allergen: 'Sulfa drugs',
      reaction: 'Rash',
      severity: 'MILD',
      status: 'ACTIVE',
    },
  });
  console.log('[4a] Allergies: Penicillin (moderate), Sulfa (mild)');

  // Active medications
  await prisma.medication.create({
    data: {
      organizationId: org.id,
      patientId: patient.id,
      name: 'Metformin',
      genericName: 'Metformin HCl',
      dose: '1000mg',
      frequency: 'BID',
      route: 'PO',
      status: 'ACTIVE',
      startDate: new Date('2023-06-01'),
    },
  });
  await prisma.medication.create({
    data: {
      organizationId: org.id,
      patientId: patient.id,
      name: 'Lisinopril',
      genericName: 'Lisinopril',
      dose: '20mg',
      frequency: 'Daily',
      route: 'PO',
      status: 'ACTIVE',
      startDate: new Date('2022-01-15'),
    },
  });
  await prisma.medication.create({
    data: {
      organizationId: org.id,
      patientId: patient.id,
      name: 'Atorvastatin',
      genericName: 'Atorvastatin Calcium',
      dose: '40mg',
      frequency: 'QHS',
      route: 'PO',
      status: 'ACTIVE',
      startDate: new Date('2023-06-01'),
    },
  });
  console.log('[4b] Medications: Metformin 1000mg BID, Lisinopril 20mg daily, Atorvastatin 40mg QHS');

  // Chronic conditions
  await prisma.condition.create({
    data: {
      organizationId: org.id,
      patientId: patient.id,
      name: 'Type 2 Diabetes Mellitus',
      icdCode: 'E11.9',
      status: 'ACTIVE',
      onsetDate: new Date('2020-03-01'),
    },
  });
  await prisma.condition.create({
    data: {
      organizationId: org.id,
      patientId: patient.id,
      name: 'Essential Hypertension',
      icdCode: 'I10',
      status: 'ACTIVE',
      onsetDate: new Date('2018-11-15'),
    },
  });
  await prisma.condition.create({
    data: {
      organizationId: org.id,
      patientId: patient.id,
      name: 'Hyperlipidemia',
      icdCode: 'E78.5',
      status: 'ACTIVE',
      onsetDate: new Date('2023-06-01'),
    },
  });
  console.log('[4c] Conditions: T2DM (E11.9), HTN (I10), Hyperlipidemia (E78.5)');

  // =========================================================================
  // 5. TODAY'S VISIT — Patient checks in, nurse takes vitals
  // =========================================================================
  const encounter = await prisma.encounter.create({
    data: {
      organizationId: org.id,
      patientId: patient.id,
      providerId: provider.id,
      encounterType: 'OFFICE_VISIT',
      status: 'IN_PROGRESS',
      chiefComplaint: 'Follow-up for diabetes management, reports increased thirst and fatigue',
      startTime: new Date(),
      notes: '',
    },
  });
  console.log(`[5] Encounter started: ${encounter.chiefComplaint}`);

  // Vitals taken by nurse at check-in
  const vitals = await prisma.vitalSign.create({
    data: {
      organizationId: org.id,
      patientId: patient.id,
      encounterId: encounter.id,
      heartRate: 82,
      bloodPressureSystolic: 142,
      bloodPressureDiastolic: 88,
      respiratoryRate: 16,
      temperature: 98.4,
      oxygenSaturation: 97,
      weight: 205,
      height: 70,
      bloodGlucose: 187,
      painLevel: 0,
    },
  });
  console.log(`[5a] Vitals: BP ${vitals.bloodPressureSystolic}/${vitals.bloodPressureDiastolic}, HR ${vitals.heartRate}, Glucose ${vitals.bloodGlucose}`);

  // =========================================================================
  // 6. COMPASS ASSESSMENT — AI-assisted clinical intake
  // =========================================================================
  const assessment = await prisma.patientAssessment.create({
    data: {
      organizationId: org.id,
      patientId: patient.id,
      sessionId: `SEED-COMPASS-${Date.now()}`,
      status: 'COMPLETED',
      phase: 'COMPLETE',
      chiefComplaint: 'Follow-up for diabetes management, reports increased thirst and fatigue',
      hpiNarrative: 'Chief complaint: Diabetes follow-up with increased thirst and fatigue. Onset: 2-3 weeks ago, gradual. Character: Polydipsia with increased urination, fatigue worsening in afternoon. Severity: Moderate impact on daily activities. Aggravating: after meals, sedentary periods. Relieving: rest. Associated symptoms: blurred vision intermittently, mild tingling in feet. Reports compliance with Metformin but admits missing evening doses occasionally. Diet has been less controlled over holidays.',
      symptoms: JSON.stringify(['polydipsia', 'polyuria', 'fatigue', 'blurred vision', 'peripheral tingling']),
      reviewOfSystems: JSON.stringify({
        constitutional: ['fatigue', 'no fever', 'no weight loss'],
        eyes: ['intermittent blurred vision'],
        cardiovascular: ['no chest pain', 'no edema'],
        neurological: ['tingling in bilateral feet'],
        endocrine: ['polydipsia', 'polyuria'],
      }),
      medications: JSON.stringify(['Metformin 1000mg BID', 'Lisinopril 20mg daily', 'Atorvastatin 40mg QHS']),
      allergies: JSON.stringify(['Penicillin - hives/swelling', 'Sulfa - rash']),
      medicalHistory: JSON.stringify(['Type 2 DM (2020)', 'Hypertension (2018)', 'Hyperlipidemia (2023)']),
      triageLevel: 'MODERATE',
      redFlagsDetected: null,
      aiSummary: '59-year-old male with T2DM presenting for follow-up with worsening glycemic control. Reports 2-3 weeks of increased thirst, urination, and fatigue. Intermittent blurred vision and bilateral foot tingling suggest possible early neuropathy. Current A1C likely elevated given fasting glucose of 187. BP elevated at 142/88 despite Lisinopril. Consider HbA1c, comprehensive metabolic panel, lipid panel, and urine microalbumin. May need medication adjustment — consider adding sulfonylurea or GLP-1 agonist. Foot exam and monofilament testing indicated.',
      aiDifferential: JSON.stringify([
        { name: 'Uncontrolled Type 2 Diabetes', probability: 0.85, supportingEvidence: ['Polydipsia', 'Polyuria', 'Elevated glucose', 'Medication non-compliance'] },
        { name: 'Diabetic Peripheral Neuropathy', probability: 0.60, supportingEvidence: ['Bilateral foot tingling', 'Known T2DM'] },
        { name: 'Diabetic Retinopathy', probability: 0.25, supportingEvidence: ['Intermittent blurred vision', 'Known T2DM'] },
      ]),
      startedAt: new Date(Date.now() - 15 * 60000),
      completedAt: new Date(),
      lastActivityAt: new Date(),
    },
  });
  console.log(`[6] COMPASS Assessment: ${assessment.triageLevel} — ${assessment.chiefComplaint}`);

  // =========================================================================
  // 7. LAB ORDER — Provider orders labs based on assessment
  // =========================================================================
  const labOrder = await prisma.labOrder.create({
    data: {
      organizationId: org.id,
      patientId: patient.id,
      providerId: provider.id,
      encounterId: encounter.id,
      orderNumber: `LAB-SEED-${Date.now()}`,
      status: 'COMPLETED',
      priority: 'ROUTINE',
      tests: JSON.stringify([
        { code: '4548-4', name: 'Hemoglobin A1c', loinc: '4548-4' },
        { code: '2345-7', name: 'Glucose', loinc: '2345-7' },
        { code: '2160-0', name: 'Creatinine', loinc: '2160-0' },
        { code: '2093-3', name: 'Total Cholesterol', loinc: '2093-3' },
        { code: '2571-8', name: 'Triglycerides', loinc: '2571-8' },
        { code: '13945-1', name: 'Urine Microalbumin', loinc: '13945-1' },
      ]),
      diagnosis: JSON.stringify({ icd: 'E11.65', description: 'Type 2 DM with hyperglycemia' }),
      orderedAt: new Date(),
      completedAt: new Date(),
    },
  });
  console.log(`[7] Lab Order: ${labOrder.orderNumber} — HbA1c, CMP, Lipids, Urine Microalbumin`);

  // =========================================================================
  // 8. LAB RESULTS — Results come back (simulated)
  // =========================================================================
  const labResults = [
    { testCode: '4548-4', testName: 'Hemoglobin A1c', value: '8.2', unit: '%', referenceRange: '4.0-5.6', interpretation: 'HIGH' },
    { testCode: '2345-7', testName: 'Glucose, Fasting', value: '187', unit: 'mg/dL', referenceRange: '70-100', interpretation: 'HIGH' },
    { testCode: '2160-0', testName: 'Creatinine', value: '1.1', unit: 'mg/dL', referenceRange: '0.7-1.3', interpretation: 'NORMAL' },
    { testCode: '2093-3', testName: 'Total Cholesterol', value: '218', unit: 'mg/dL', referenceRange: '<200', interpretation: 'HIGH' },
    { testCode: '2571-8', testName: 'Triglycerides', value: '195', unit: 'mg/dL', referenceRange: '<150', interpretation: 'HIGH' },
    { testCode: '13945-1', testName: 'Urine Microalbumin', value: '45', unit: 'mg/L', referenceRange: '<30', interpretation: 'HIGH' },
  ];

  for (const lr of labResults) {
    await prisma.labResult.create({
      data: {
        organizationId: org.id,
        patientId: patient.id,
        labOrderId: labOrder.id,
        testCode: lr.testCode,
        testName: lr.testName,
        value: lr.value,
        unit: lr.unit,
        referenceRange: lr.referenceRange,
        interpretation: lr.interpretation,
        status: 'FINAL',
        performedAt: new Date(),
      },
    });
  }
  console.log('[8] Lab Results: A1c 8.2% (H), Glucose 187 (H), Creatinine 1.1, Chol 218 (H), Trig 195 (H), Microalbumin 45 (H)');

  // =========================================================================
  // 9. ENCOUNTER COMPLETE — Provider documents findings and plan
  // =========================================================================
  await prisma.encounter.update({
    where: { id: encounter.id },
    data: {
      status: 'COMPLETED',
      endTime: new Date(),
      notes: [
        'SUBJECTIVE: 59M with T2DM, HTN, HLD presents for follow-up. Reports 2-3 weeks of increased thirst, urination, fatigue. Intermittent blurred vision. Tingling in bilateral feet. Admits to occasional missed Metformin doses and poor holiday diet.',
        'OBJECTIVE: BP 142/88, HR 82, Wt 205 lbs. Fasting glucose 187. A1c 8.2% (up from 7.1%). Microalbumin 45 mg/L (elevated). Monofilament exam: decreased sensation bilateral great toes.',
        'ASSESSMENT: 1) T2DM with hyperglycemia (E11.65) — worsening control, A1c 8.2%. 2) Diabetic peripheral neuropathy (E11.42) — new finding. 3) Incipient diabetic nephropathy — microalbuminuria. 4) HTN — suboptimally controlled. 5) Mixed hyperlipidemia.',
        'PLAN: 1) Add Semaglutide 0.25mg SC weekly, titrate to 1mg. 2) Continue Metformin, emphasize compliance. 3) Increase Lisinopril to 40mg for renoprotection. 4) Refer ophthalmology for diabetic eye screening. 5) Diabetes education referral — diet, glucose monitoring. 6) Recheck A1c in 3 months. 7) Annual foot exam documented today.',
      ].join('\n\n'),
    },
  });
  console.log('[9] Encounter completed with SOAP note');

  // =========================================================================
  // 10. AUDIT TRAIL — compliance record of the full visit
  // =========================================================================
  await prisma.auditLog.create({
    data: {
      organizationId: org.id,
      userId: provider.id,
      action: 'ENCOUNTER_COMPLETED',
      entityType: 'Encounter',
      entityId: encounter.id,
      changes: JSON.stringify({
        patientMrn: patient.mrn,
        assessmentId: assessment.id,
        labOrderId: labOrder.id,
        labResultCount: labResults.length,
        diagnosisCodes: ['E11.65', 'E11.42', 'I10', 'E78.5'],
      }),
      success: true,
    },
  });
  console.log('[10] Audit trail logged');

  // =========================================================================
  // ORG 2 — CROSS-TENANT ISOLATION TEST
  // A second organization with intentionally overlapping MRNs to prove that
  // tenant scoping prevents data leakage between organizations.
  // =========================================================================
  console.log('\n--- Seeding second organization for cross-tenant isolation test ---\n');

  // =========================================================================
  // T1. SECOND ORGANIZATION
  // =========================================================================
  const org2 = await prisma.organization.upsert({
    where: { slug: 'test-regional' },
    update: {},
    create: {
      name: 'Test Regional Hospital',
      slug: 'test-regional',
      type: 'HOSPITAL',
      npi: '8888888888',
      address: '200 Hospital Drive',
      city: 'Shelbyville',
      state: 'MO',
      zipCode: '65401',
      phone: '555-0200',
      tier: 'enterprise',
      settings: JSON.stringify({ timezone: 'America/Chicago' }),
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
  console.log(`[T1] Organization: ${org2.name} (${org2.id})`);

  // =========================================================================
  // T2. PROVIDER — scoped to second org
  // =========================================================================
  const provider2 = await prisma.user.upsert({
    where: { email: 'dr.jones@test-regional.org' },
    update: { organizationId: org2.id },
    create: {
      organizationId: org2.id,
      email: 'dr.jones@test-regional.org',
      name: 'Dr. Marcus Jones',
      role: 'PROVIDER',
      specialty: 'Internal Medicine',
      npi: '9876543210',
      department: 'General Medicine',
    },
  });
  console.log(`[T2] Provider: ${provider2.name}`);

  // =========================================================================
  // T3. PATIENTS — MRN-SEED-001 and MRN-SEED-002 intentionally overlap with
  //     org1's patients.  The composite unique key (organizationId, mrn) means
  //     these are distinct records even though the MRN strings are identical.
  // =========================================================================
  const patient2a = await prisma.patient.upsert({
    where: { organizationId_mrn: { organizationId: org2.id, mrn: 'MRN-SEED-001' } },
    update: {},
    create: {
      organizationId: org2.id,
      mrn: 'MRN-SEED-001',          // same MRN string as org1's John Doe — different tenant
      firstName: 'Alice',
      lastName: 'Rivera',
      dateOfBirth: new Date('1978-07-22'),
      gender: 'Female',
      email: 'alice.rivera@email.com',
      phone: '555-5678',
      address: '789 Elm Street',
      city: 'Shelbyville',
      state: 'MO',
      zipCode: '65401',
    },
  });
  console.log(`[T3a] Patient: ${patient2a.firstName} ${patient2a.lastName} (${patient2a.mrn}) — org2, overlapping MRN`);

  const patient2b = await prisma.patient.upsert({
    where: { organizationId_mrn: { organizationId: org2.id, mrn: 'MRN-SEED-002' } },
    update: {},
    create: {
      organizationId: org2.id,
      mrn: 'MRN-SEED-002',
      firstName: 'Carlos',
      lastName: 'Nguyen',
      dateOfBirth: new Date('1950-11-08'),
      gender: 'Male',
      email: 'carlos.nguyen@email.com',
      phone: '555-9012',
      address: '321 Maple Court',
      city: 'Shelbyville',
      state: 'MO',
      zipCode: '65401',
    },
  });
  console.log(`[T3b] Patient: ${patient2b.firstName} ${patient2b.lastName} (${patient2b.mrn})`);

  // =========================================================================
  // T4. CLINICAL RECORDS — scoped to org2.  Proves that queries filtered by
  //     organizationId cannot return these rows for org1 consumers.
  // =========================================================================

  // Allergy — org2 / patient2a
  await prisma.allergy.create({
    data: {
      organizationId: org2.id,
      patientId: patient2a.id,
      allergen: 'Aspirin',
      reaction: 'Bronchospasm',
      severity: 'SEVERE',
      status: 'ACTIVE',
    },
  });
  await prisma.allergy.create({
    data: {
      organizationId: org2.id,
      patientId: patient2b.id,
      allergen: 'Contrast dye',
      reaction: 'Urticaria',
      severity: 'MODERATE',
      status: 'ACTIVE',
    },
  });
  console.log('[T4a] Allergies (org2): Aspirin/severe (Rivera), Contrast dye/moderate (Nguyen)');

  // Medications — org2
  await prisma.medication.create({
    data: {
      organizationId: org2.id,
      patientId: patient2a.id,
      name: 'Amlodipine',
      genericName: 'Amlodipine Besylate',
      dose: '5mg',
      frequency: 'Daily',
      route: 'PO',
      status: 'ACTIVE',
      startDate: new Date('2024-02-01'),
    },
  });
  await prisma.medication.create({
    data: {
      organizationId: org2.id,
      patientId: patient2b.id,
      name: 'Warfarin',
      genericName: 'Warfarin Sodium',
      dose: '5mg',
      frequency: 'Daily',
      route: 'PO',
      status: 'ACTIVE',
      startDate: new Date('2023-09-15'),
    },
  });
  console.log('[T4b] Medications (org2): Amlodipine 5mg daily (Rivera), Warfarin 5mg daily (Nguyen)');

  // Conditions — org2
  await prisma.condition.create({
    data: {
      organizationId: org2.id,
      patientId: patient2a.id,
      name: 'Asthma',
      icdCode: 'J45.50',
      status: 'ACTIVE',
      onsetDate: new Date('2015-04-10'),
    },
  });
  await prisma.condition.create({
    data: {
      organizationId: org2.id,
      patientId: patient2b.id,
      name: 'Atrial Fibrillation',
      icdCode: 'I48.91',
      status: 'ACTIVE',
      onsetDate: new Date('2022-06-20'),
    },
  });
  console.log('[T4c] Conditions (org2): Asthma/J45.50 (Rivera), AFib/I48.91 (Nguyen)');

  // VitalSigns — org2 (standalone, not tied to an encounter)
  await prisma.vitalSign.create({
    data: {
      organizationId: org2.id,
      patientId: patient2a.id,
      heartRate: 76,
      bloodPressureSystolic: 128,
      bloodPressureDiastolic: 82,
      respiratoryRate: 14,
      temperature: 98.6,
      oxygenSaturation: 99,
      weight: 148,
      height: 65,
      painLevel: 1,
    },
  });
  await prisma.vitalSign.create({
    data: {
      organizationId: org2.id,
      patientId: patient2b.id,
      heartRate: 68,
      bloodPressureSystolic: 118,
      bloodPressureDiastolic: 74,
      respiratoryRate: 16,
      temperature: 97.9,
      oxygenSaturation: 96,
      weight: 172,
      height: 68,
      painLevel: 0,
    },
  });
  console.log('[T4d] VitalSigns (org2): Rivera BP 128/82, HR 76; Nguyen BP 118/74, HR 68');

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n--- Seed completed successfully ---');
  console.log('Complete encounter flow seeded:');
  console.log(`  Organization: ${org.name}`);
  console.log(`  Provider: ${provider.name} (${provider.specialty})`);
  console.log(`  Patient: ${patient.firstName} ${patient.lastName} (${patient.mrn})`);
  console.log('  Clinical data: 2 allergies, 3 medications, 3 conditions');
  console.log('  Visit: Vitals → COMPASS Assessment → Lab Order → 6 Results → SOAP Note');
  console.log('  Audit trail: HIPAA-compliant encounter record');
  console.log('');
  console.log('Cross-tenant isolation data seeded:');
  console.log(`  Organization: ${org2.name}`);
  console.log(`  Provider: ${provider2.name} (${provider2.specialty})`);
  console.log(`  Patient A: ${patient2a.firstName} ${patient2a.lastName} (${patient2a.mrn}) — overlapping MRN with org1`);
  console.log(`  Patient B: ${patient2b.firstName} ${patient2b.lastName} (${patient2b.mrn})`);
  console.log('  Clinical data: 2 allergies, 2 medications, 2 conditions, 2 vital sign records');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
