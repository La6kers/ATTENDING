// ============================================================
// ATTENDING AI - DATABASE SEED SCRIPT
// prisma/seed.ts
// Run: npm run db:seed (from root directory)
// ============================================================

import { PrismaClient, UserRole, UrgencyLevel, AssessmentStatus, OrderPriority, OrderStatus, EncounterStatus, VisitType, AllergySeverity, AllergyType, NotificationType, NotificationPriority } from '@prisma/client';

const prisma = new PrismaClient();

// Helper functions
const randomId = () => Math.random().toString(36).substring(2, 11);
const hoursAgo = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000);
const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);
const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60 * 1000);

async function main() {
  console.log('🌱 Starting ATTENDING AI database seed...\n');

  // =====================================================================
  // USERS (Providers)
  // =====================================================================
  console.log('👤 Creating users...');
  
  const provider = await prisma.user.upsert({
    where: { email: 'scott.isbell@attending.ai' },
    update: {},
    create: {
      email: 'scott.isbell@attending.ai',
      name: 'Dr. Scott Isbell',
      role: UserRole.PROVIDER,
      specialty: 'Family Medicine',
      npi: '1234567890',
      phone: '555-0100',
      department: 'Primary Care',
      isActive: true,
    },
  });

  const nurse = await prisma.user.upsert({
    where: { email: 'sarah.johnson@attending.ai' },
    update: {},
    create: {
      email: 'sarah.johnson@attending.ai',
      name: 'Sarah Johnson, RN',
      role: UserRole.NURSE,
      phone: '555-0101',
      department: 'Primary Care',
      isActive: true,
    },
  });

  console.log(`   ✅ Created 2 users\n`);

  // =====================================================================
  // PATIENTS
  // =====================================================================
  console.log('🏥 Creating patients...');

  const patients = await Promise.all([
    prisma.patient.upsert({
      where: { mrn: 'MRN-001234' },
      update: {},
      create: {
        mrn: 'MRN-001234',
        firstName: 'Maria',
        lastName: 'Garcia',
        dateOfBirth: new Date('1985-03-15'),
        gender: 'Female',
        phone: '555-1001',
        email: 'maria.garcia@email.com',
        address: '123 Main St',
        city: 'Denver',
        state: 'CO',
        zipCode: '80202',
        emergencyContact: 'Carlos Garcia',
        emergencyPhone: '555-1002',
      },
    }),
    prisma.patient.upsert({
      where: { mrn: 'MRN-001235' },
      update: {},
      create: {
        mrn: 'MRN-001235',
        firstName: 'Robert',
        lastName: 'Chen',
        dateOfBirth: new Date('1958-07-22'),
        gender: 'Male',
        phone: '555-1003',
        email: 'robert.chen@email.com',
        address: '456 Oak Ave',
        city: 'Aurora',
        state: 'CO',
        zipCode: '80010',
      },
    }),
    prisma.patient.upsert({
      where: { mrn: 'MRN-001236' },
      update: {},
      create: {
        mrn: 'MRN-001236',
        firstName: 'Jennifer',
        lastName: 'Williams',
        dateOfBirth: new Date('1992-11-08'),
        gender: 'Female',
        phone: '555-1004',
      },
    }),
    prisma.patient.upsert({
      where: { mrn: 'MRN-001237' },
      update: {},
      create: {
        mrn: 'MRN-001237',
        firstName: 'Michael',
        lastName: 'Brown',
        dateOfBirth: new Date('1975-01-30'),
        gender: 'Male',
        phone: '555-1005',
      },
    }),
    prisma.patient.upsert({
      where: { mrn: 'MRN-001238' },
      update: {},
      create: {
        mrn: 'MRN-001238',
        firstName: 'Emily',
        lastName: 'Davis',
        dateOfBirth: new Date('2001-06-15'),
        gender: 'Female',
        phone: '555-1006',
      },
    }),
    prisma.patient.upsert({
      where: { mrn: 'MRN-001239' },
      update: {},
      create: {
        mrn: 'MRN-001239',
        firstName: 'James',
        lastName: 'Wilson',
        dateOfBirth: new Date('1968-09-03'),
        gender: 'Male',
        phone: '555-1007',
      },
    }),
  ]);

  console.log(`   ✅ Created ${patients.length} patients\n`);

  // =====================================================================
  // ALLERGIES
  // =====================================================================
  console.log('⚠️  Creating patient allergies...');

  await Promise.all([
    prisma.allergy.create({
      data: {
        patientId: patients[0].id,
        allergen: 'Penicillin',
        reaction: 'Anaphylaxis',
        severity: AllergySeverity.LIFE_THREATENING,
        type: AllergyType.DRUG,
      },
    }),
    prisma.allergy.create({
      data: {
        patientId: patients[0].id,
        allergen: 'Sulfa drugs',
        reaction: 'Rash',
        severity: AllergySeverity.MODERATE,
        type: AllergyType.DRUG,
      },
    }),
    prisma.allergy.create({
      data: {
        patientId: patients[2].id,
        allergen: 'Latex',
        reaction: 'Contact dermatitis',
        severity: AllergySeverity.MODERATE,
        type: AllergyType.OTHER,
      },
    }),
    prisma.allergy.create({
      data: {
        patientId: patients[2].id,
        allergen: 'Iodine contrast',
        reaction: 'Hives, difficulty breathing',
        severity: AllergySeverity.SEVERE,
        type: AllergyType.DRUG,
      },
    }),
    prisma.allergy.create({
      data: {
        patientId: patients[3].id,
        allergen: 'Aspirin',
        reaction: 'GI bleeding',
        severity: AllergySeverity.MODERATE,
        type: AllergyType.DRUG,
      },
    }),
    prisma.allergy.create({
      data: {
        patientId: patients[5].id,
        allergen: 'Codeine',
        reaction: 'Nausea, vomiting',
        severity: AllergySeverity.MODERATE,
        type: AllergyType.DRUG,
      },
    }),
    prisma.allergy.create({
      data: {
        patientId: patients[5].id,
        allergen: 'Morphine',
        reaction: 'Respiratory depression',
        severity: AllergySeverity.SEVERE,
        type: AllergyType.DRUG,
      },
    }),
  ]);

  console.log(`   ✅ Created allergies\n`);

  // =====================================================================
  // COMPASS ASSESSMENTS - Pending Review
  // =====================================================================
  console.log('📋 Creating COMPASS assessments...');

  // Clear existing assessments for clean seed
  await prisma.patientAssessment.deleteMany({});

  const assessments = await Promise.all([
    // EMERGENCY - Thunderclap headache (SAH concern)
    prisma.patientAssessment.create({
      data: {
        patientId: patients[0].id,
        sessionId: `session_${randomId()}`,
        chiefComplaint: 'Worst headache of my life, sudden onset 2 hours ago',
        urgencyLevel: UrgencyLevel.EMERGENCY,
        urgencyScore: 95,
        status: AssessmentStatus.PENDING,
        hpiOnset: 'Sudden, 2 hours ago',
        hpiSeverity: 10,
        hpiCharacter: 'Thunderclap, explosive',
        hpiLocation: 'Global, bilateral',
        hpiAggravating: ['Light', 'Movement', 'Noise'],
        hpiRelieving: ['Nothing helps'],
        hpiAssociated: ['Nausea', 'Photophobia', 'Neck stiffness', 'Vomiting'],
        medications: ['Lisinopril 10mg daily', 'Metformin 500mg BID'],
        allergies: ['Penicillin', 'Sulfa drugs'],
        redFlags: ['Thunderclap Headache', 'Worst Headache of Life', 'Meningismus'],
        differentialDx: {
          primary: [
            { name: 'Subarachnoid Hemorrhage', probability: 0.75, icdCode: 'I60.9' },
            { name: 'Meningitis', probability: 0.15, icdCode: 'G03.9' },
            { name: 'Hypertensive Emergency', probability: 0.10, icdCode: 'I16.1' },
          ],
        },
        aiRecommendations: [
          'STAT CT head without contrast',
          'If CT negative, lumbar puncture for xanthochromia',
          'Neurosurgery consult',
          'BP monitoring',
        ],
        submittedAt: minutesAgo(5),
      },
    }),

    // HIGH - Exertional chest pain (ACS concern)
    prisma.patientAssessment.create({
      data: {
        patientId: patients[1].id,
        sessionId: `session_${randomId()}`,
        chiefComplaint: 'Chest tightness and pressure with walking, started 3 days ago',
        urgencyLevel: UrgencyLevel.HIGH,
        urgencyScore: 78,
        status: AssessmentStatus.PENDING,
        hpiOnset: 'Gradual, 3 days ago',
        hpiSeverity: 7,
        hpiCharacter: 'Pressure, squeezing, tightness',
        hpiLocation: 'Substernal',
        hpiDuration: '5-10 minutes per episode',
        hpiAggravating: ['Walking', 'Climbing stairs', 'Exertion'],
        hpiRelieving: ['Rest'],
        hpiAssociated: ['Shortness of breath', 'Diaphoresis', 'Fatigue'],
        medications: ['Lisinopril 20mg daily', 'Atorvastatin 40mg daily', 'Metoprolol 25mg BID', 'Aspirin 81mg daily'],
        allergies: [],
        redFlags: ['Exertional Chest Pain'],
        riskFactors: ['Male', 'Age > 55', 'Hypertension', 'Hyperlipidemia'],
        differentialDx: {
          primary: [
            { name: 'Unstable Angina', probability: 0.55, icdCode: 'I20.0' },
            { name: 'NSTEMI', probability: 0.25, icdCode: 'I21.4' },
            { name: 'Stable Angina', probability: 0.15, icdCode: 'I20.9' },
          ],
        },
        aiRecommendations: [
          'STAT ECG',
          'Serial troponins (0, 3, 6 hours)',
          'BMP, CBC',
          'Cardiology consult',
          'Consider cath lab activation if STEMI',
        ],
        submittedAt: minutesAgo(12),
      },
    }),

    // HIGH - PE concern
    prisma.patientAssessment.create({
      data: {
        patientId: patients[5].id,
        sessionId: `session_${randomId()}`,
        chiefComplaint: 'Sudden shortness of breath and sharp chest pain when I breathe',
        urgencyLevel: UrgencyLevel.HIGH,
        urgencyScore: 72,
        status: AssessmentStatus.PENDING,
        hpiOnset: 'Sudden, this morning',
        hpiSeverity: 7,
        hpiCharacter: 'Sharp, stabbing',
        hpiLocation: 'Right lateral chest',
        hpiAggravating: ['Deep breathing', 'Coughing'],
        hpiRelieving: ['Shallow breathing', 'Leaning forward'],
        hpiAssociated: ['Dyspnea', 'Left calf pain and swelling', 'Tachycardia'],
        medications: ['Omeprazole 20mg daily'],
        allergies: ['Codeine', 'Morphine'],
        redFlags: ['Acute Pleuritic Chest Pain with Dyspnea', 'DVT Risk Factors'],
        riskFactors: ['Recent long-haul flight', 'Unilateral leg swelling'],
        differentialDx: {
          primary: [
            { name: 'Pulmonary Embolism', probability: 0.65, icdCode: 'I26.99' },
            { name: 'Pneumonia', probability: 0.20, icdCode: 'J18.9' },
            { name: 'Pleuritis', probability: 0.15, icdCode: 'R09.1' },
          ],
        },
        aiRecommendations: [
          'Calculate Wells Score',
          'D-dimer (if low/moderate probability)',
          'CTA chest (if high probability or positive D-dimer)',
          'Lower extremity duplex if PE confirmed',
          'Consider empiric anticoagulation',
        ],
        submittedAt: minutesAgo(8),
      },
    }),

    // MODERATE - RLQ pain (appendicitis pattern)
    prisma.patientAssessment.create({
      data: {
        patientId: patients[2].id,
        sessionId: `session_${randomId()}`,
        chiefComplaint: 'Abdominal pain that started around my belly button and moved to right lower side',
        urgencyLevel: UrgencyLevel.MODERATE,
        urgencyScore: 55,
        status: AssessmentStatus.PENDING,
        hpiOnset: '36 hours ago',
        hpiSeverity: 6,
        hpiCharacter: 'Constant dull with sharp exacerbations',
        hpiLocation: 'RLQ, initially periumbilical',
        hpiAggravating: ['Movement', 'Coughing', 'Jarring'],
        hpiRelieving: ['Lying still', 'Curled up position'],
        hpiAssociated: ['Nausea', 'Anorexia', 'Low-grade fever'],
        medications: ['Birth control pills'],
        allergies: ['Latex', 'Iodine contrast'],
        redFlags: ['RLQ Pain with Migration Pattern'],
        differentialDx: {
          primary: [
            { name: 'Acute Appendicitis', probability: 0.60, icdCode: 'K35.80' },
            { name: 'Ovarian Cyst', probability: 0.20, icdCode: 'N83.20' },
            { name: 'Mesenteric Lymphadenitis', probability: 0.15, icdCode: 'I88.0' },
          ],
        },
        aiRecommendations: [
          'CBC with differential',
          'CMP',
          'Urinalysis',
          'Beta-HCG (reproductive age female)',
          'CT abdomen/pelvis with contrast (note iodine allergy - use alternative)',
          'Surgical consult if imaging positive',
        ],
        submittedAt: minutesAgo(28),
      },
    }),

    // STANDARD - Chronic cough
    prisma.patientAssessment.create({
      data: {
        patientId: patients[3].id,
        sessionId: `session_${randomId()}`,
        chiefComplaint: 'Cough that won\'t go away for about 3 weeks',
        urgencyLevel: UrgencyLevel.STANDARD,
        urgencyScore: 20,
        status: AssessmentStatus.PENDING,
        hpiOnset: '3 weeks ago, after URI',
        hpiSeverity: 3,
        hpiCharacter: 'Dry, tickling',
        hpiAggravating: ['Lying down', 'Talking', 'Cold air'],
        hpiRelieving: ['Warm drinks', 'Honey'],
        hpiAssociated: ['Post-nasal drip', 'Mild throat irritation'],
        medications: ['Lisinopril 10mg daily'],
        allergies: ['Aspirin'],
        redFlags: [],
        differentialDx: {
          primary: [
            { name: 'Post-viral Cough', probability: 0.45, icdCode: 'R05.9' },
            { name: 'ACE Inhibitor Cough', probability: 0.30, icdCode: 'T46.4X5A' },
            { name: 'GERD-related Cough', probability: 0.20, icdCode: 'K21.0' },
          ],
        },
        aiRecommendations: [
          'Consider ACE inhibitor as cause (patient on Lisinopril)',
          'Trial of PPI if GERD suspected',
          'Chest X-ray if symptoms worsen or persist > 8 weeks',
        ],
        clinicalPearls: ['ACE inhibitors cause chronic cough in ~10-15% of patients'],
        submittedAt: minutesAgo(45),
      },
    }),

    // STANDARD - Anxiety/insomnia
    prisma.patientAssessment.create({
      data: {
        patientId: patients[4].id,
        sessionId: `session_${randomId()}`,
        chiefComplaint: 'Feeling anxious and having trouble sleeping for the past month',
        urgencyLevel: UrgencyLevel.STANDARD,
        urgencyScore: 15,
        status: AssessmentStatus.PENDING,
        hpiOnset: '1 month ago',
        hpiSeverity: 4,
        hpiCharacter: 'Worry, racing thoughts, restlessness',
        hpiAggravating: ['School stress', 'Caffeine', 'Studying late'],
        hpiRelieving: ['Exercise', 'Talking to friends'],
        hpiAssociated: ['Insomnia', 'Daytime fatigue', 'Difficulty concentrating'],
        socialHistory: {
          caffeine: '3-4 cups coffee/day',
          alcohol: 'Occasional',
          tobacco: 'Never',
          exercise: '2-3x/week',
          occupation: 'College student',
        },
        medications: ['Multivitamin'],
        allergies: [],
        redFlags: [],
        differentialDx: {
          primary: [
            { name: 'Generalized Anxiety Disorder', probability: 0.50, icdCode: 'F41.1' },
            { name: 'Adjustment Disorder with Anxiety', probability: 0.35, icdCode: 'F43.22' },
            { name: 'Insomnia Disorder', probability: 0.15, icdCode: 'G47.00' },
          ],
        },
        aiRecommendations: [
          'PHQ-9 and GAD-7 screening',
          'Sleep hygiene counseling',
          'Consider reducing caffeine intake',
          'CBT referral if symptoms persist',
          'TSH to rule out thyroid disorder',
        ],
        submittedAt: hoursAgo(1),
      },
    }),
  ]);

  console.log(`   ✅ Created ${assessments.length} COMPASS assessments\n`);

  // =====================================================================
  // NOTIFICATIONS
  // =====================================================================
  console.log('🔔 Creating notifications...');

  await Promise.all([
    prisma.notification.create({
      data: {
        userId: provider.id,
        type: NotificationType.URGENT_ASSESSMENT,
        title: '🚨 EMERGENCY: Maria Garcia',
        message: 'Thunderclap headache - SAH concern. Requires immediate review.',
        priority: NotificationPriority.CRITICAL,
        relatedType: 'PatientAssessment',
        relatedId: assessments[0].id,
        actionUrl: `/assessments/${assessments[0].id}`,
      },
    }),
    prisma.notification.create({
      data: {
        userId: provider.id,
        type: NotificationType.URGENT_ASSESSMENT,
        title: '⚠️ HIGH PRIORITY: Robert Chen',
        message: 'Exertional chest pain - ACS workup needed.',
        priority: NotificationPriority.HIGH,
        relatedType: 'PatientAssessment',
        relatedId: assessments[1].id,
        actionUrl: `/assessments/${assessments[1].id}`,
      },
    }),
    prisma.notification.create({
      data: {
        userId: provider.id,
        type: NotificationType.URGENT_ASSESSMENT,
        title: '⚠️ HIGH PRIORITY: James Wilson',
        message: 'Pleuritic chest pain with dyspnea - PE concern.',
        priority: NotificationPriority.HIGH,
        relatedType: 'PatientAssessment',
        relatedId: assessments[2].id,
        actionUrl: `/assessments/${assessments[2].id}`,
      },
    }),
    prisma.notification.create({
      data: {
        userId: provider.id,
        type: NotificationType.NEW_ASSESSMENT,
        title: '📋 New Assessment: Jennifer Williams',
        message: 'RLQ abdominal pain - surgical abdomen evaluation.',
        priority: NotificationPriority.NORMAL,
        relatedType: 'PatientAssessment',
        relatedId: assessments[3].id,
        actionUrl: `/assessments/${assessments[3].id}`,
      },
    }),
  ]);

  console.log(`   ✅ Created 4 notifications\n`);

  // =====================================================================
  // SUMMARY
  // =====================================================================
  console.log('═══════════════════════════════════════════════════════════');
  console.log('                    🌱 SEED COMPLETE');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log('  📊 Assessment Queue Preview:');
  console.log('    🔴 EMERGENCY: Maria Garcia - Thunderclap headache (SAH)');
  console.log('    🟠 HIGH: Robert Chen - Exertional chest pain (ACS)');
  console.log('    🟠 HIGH: James Wilson - Pleuritic chest pain (PE)');
  console.log('    🟡 MODERATE: Jennifer Williams - RLQ pain (Appendicitis)');
  console.log('    🟢 STANDARD: Michael Brown - Chronic cough');
  console.log('    🟢 STANDARD: Emily Davis - Anxiety/insomnia');
  console.log('');
  console.log('  🔑 Login: scott.isbell@attending.ai (dev mode - no password)');
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
