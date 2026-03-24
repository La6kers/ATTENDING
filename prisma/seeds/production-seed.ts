// ============================================================
// ATTENDING AI - Production Database Seed
// prisma/seeds/production-seed.ts
//
// Realistic clinical data for pilot deployment
// Includes sample providers, patients, and clinical scenarios
//
// Run: npx tsx prisma/seeds/production-seed.ts
// ============================================================

import { PrismaClient } from '@prisma/client';

// Use dynamic import for bcryptjs to avoid type declaration issues
async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import('bcryptjs');
  return bcrypt.hash(password, 12);
}

const prisma = new PrismaClient();

// ============================================================
// CONFIGURATION
// ============================================================

const PILOT_CLINIC = {
  name: 'Rural Health Clinic - Pilot Site',
  npi: '1234567890',
  address: '123 Main Street, Rural Town, MT 59001',
};

// ============================================================
// SEED DATA
// ============================================================

async function main() {
  console.log('🌱 Starting production seed...');

  // ============================================================
  // 0. CREATE PILOT CLINIC ORGANIZATION
  // ============================================================
  console.log('Creating pilot clinic organization...');

  const org = await prisma.organization.upsert({
    where: { slug: 'pilot-clinic' },
    update: {},
    create: {
      name: PILOT_CLINIC.name,
      slug: 'pilot-clinic',
      type: 'RURAL_HEALTH_CLINIC',
      npi: PILOT_CLINIC.npi,
      address: PILOT_CLINIC.address.split(',')[0],
      city: 'Rural Town',
      state: 'MT',
      zipCode: '59001',
      settings: JSON.stringify({ timezone: 'America/Denver' }),
      featureFlags: JSON.stringify({
        FEATURE_AI_DIFFERENTIAL_DIAGNOSIS: true,
        FEATURE_AI_LAB_ORDERING: true,
        FEATURE_AI_DRUG_RECOMMENDATIONS: true,
        FEATURE_AMBIENT_DOCUMENTATION: true,
      }),
    },
  });
  console.log(`  ✓ Organization created: ${org.name}`);

  // ============================================================
  // 1. CREATE ADMIN USER
  // ============================================================
  console.log('Creating admin user...');

  const adminPassword = await hashPassword(process.env.ADMIN_PASSWORD || 'ChangeMe123!');

  const admin = await prisma.user.upsert({
    where: { email: 'admin@attending.ai' },
    update: { organizationId: org.id },
    create: {
      organizationId: org.id,
      email: 'admin@attending.ai',
      name: 'System Administrator',
      password: adminPassword,
      role: 'ADMIN',
      isActive: true,
    },
  });

  console.log(`  ✓ Admin user created: ${admin.email}`);

  // ============================================================
  // 2. CREATE PILOT CLINIC PROVIDERS
  // ============================================================
  console.log('Creating pilot clinic providers...');

  const providers = [
    {
      email: 'dr.smith@pilotclinic.org',
      name: 'Dr. Sarah Smith, MD',
      role: 'PROVIDER',
      specialty: 'Family Medicine',
      npi: '1122334455',
      department: 'Primary Care',
    },
    {
      email: 'dr.jones@pilotclinic.org',
      name: 'Dr. Michael Jones, DO',
      role: 'PROVIDER',
      specialty: 'Internal Medicine',
      npi: '2233445566',
      department: 'Primary Care',
    },
    {
      email: 'np.williams@pilotclinic.org',
      name: 'Jennifer Williams, NP',
      role: 'PROVIDER',
      specialty: 'Family Nurse Practitioner',
      npi: '3344556677',
      department: 'Primary Care',
    },
    {
      email: 'rn.davis@pilotclinic.org',
      name: 'Robert Davis, RN',
      role: 'NURSE',
      department: 'Primary Care',
    },
    {
      email: 'staff.miller@pilotclinic.org',
      name: 'Amanda Miller',
      role: 'STAFF',
      department: 'Front Desk',
    },
  ];

  const providerPassword = await hashPassword('PilotClinic2026!');

  for (const provider of providers) {
    const created = await prisma.user.upsert({
      where: { email: provider.email },
      update: { organizationId: org.id },
      create: {
        ...provider,
        organizationId: org.id,
        password: providerPassword,
        isActive: true,
      },
    });
    console.log(`  ✓ Provider created: ${created.name}`);
  }

  // ============================================================
  // 3. CREATE SAMPLE PATIENTS
  // ============================================================
  console.log('Creating sample patients...');

  const patients = [
    {
      mrn: 'MRN-001',
      firstName: 'John',
      lastName: 'Anderson',
      dateOfBirth: new Date('1965-03-15'),
      gender: 'male',
      phone: '555-0101',
      address: '456 Oak Street',
      city: 'Rural Town',
      state: 'MT',
      zipCode: '59001',
      allergies: [
        { allergen: 'Penicillin', reaction: 'Hives', severity: 'MODERATE' },
        { allergen: 'Sulfa', reaction: 'Rash', severity: 'MILD' },
      ],
      conditions: [
        { description: 'Type 2 Diabetes Mellitus', icdCode: 'E11.9' },
        { description: 'Essential Hypertension', icdCode: 'I10' },
        { description: 'Hyperlipidemia', icdCode: 'E78.5' },
      ],
      medications: [
        { name: 'Metformin', dose: '1000mg', frequency: 'twice daily' },
        { name: 'Lisinopril', dose: '20mg', frequency: 'once daily' },
        { name: 'Atorvastatin', dose: '40mg', frequency: 'at bedtime' },
      ],
    },
    {
      mrn: 'MRN-002',
      firstName: 'Mary',
      lastName: 'Johnson',
      dateOfBirth: new Date('1978-08-22'),
      gender: 'female',
      phone: '555-0102',
      address: '789 Pine Avenue',
      city: 'Rural Town',
      state: 'MT',
      zipCode: '59001',
      allergies: [
        { allergen: 'Codeine', reaction: 'Nausea', severity: 'MILD' },
      ],
      conditions: [
        { description: 'Asthma, moderate persistent', icdCode: 'J45.40' },
        { description: 'Seasonal allergies', icdCode: 'J30.2' },
      ],
      medications: [
        { name: 'Fluticasone/Salmeterol', dose: '250/50mcg', frequency: 'twice daily' },
        { name: 'Albuterol', dose: '90mcg', frequency: 'as needed' },
      ],
    },
    {
      mrn: 'MRN-003',
      firstName: 'Robert',
      lastName: 'Williams',
      dateOfBirth: new Date('1955-11-30'),
      gender: 'male',
      phone: '555-0103',
      address: '321 Maple Drive',
      city: 'Rural Town',
      state: 'MT',
      zipCode: '59001',
      allergies: [],
      conditions: [
        { description: 'Coronary artery disease', icdCode: 'I25.10' },
        { description: 'History of STEMI', icdCode: 'I25.2' },
        { description: 'Heart failure with reduced EF', icdCode: 'I50.22' },
      ],
      medications: [
        { name: 'Aspirin', dose: '81mg', frequency: 'once daily' },
        { name: 'Metoprolol succinate', dose: '100mg', frequency: 'once daily' },
        { name: 'Lisinopril', dose: '40mg', frequency: 'once daily' },
        { name: 'Atorvastatin', dose: '80mg', frequency: 'at bedtime' },
        { name: 'Furosemide', dose: '40mg', frequency: 'once daily' },
      ],
    },
    {
      mrn: 'MRN-004',
      firstName: 'Emily',
      lastName: 'Brown',
      dateOfBirth: new Date('1990-05-12'),
      gender: 'female',
      phone: '555-0104',
      address: '567 Cedar Lane',
      city: 'Rural Town',
      state: 'MT',
      zipCode: '59001',
      allergies: [
        { allergen: 'Peanuts', reaction: 'Anaphylaxis', severity: 'LIFE_THREATENING' },
      ],
      conditions: [
        { description: 'Anxiety disorder', icdCode: 'F41.1' },
        { description: 'Migraine without aura', icdCode: 'G43.909' },
      ],
      medications: [
        { name: 'Sertraline', dose: '100mg', frequency: 'once daily' },
        { name: 'Sumatriptan', dose: '50mg', frequency: 'as needed for migraine' },
      ],
    },
    {
      mrn: 'MRN-005',
      firstName: 'James',
      lastName: 'Davis',
      dateOfBirth: new Date('1948-02-28'),
      gender: 'male',
      phone: '555-0105',
      address: '890 Birch Road',
      city: 'Rural Town',
      state: 'MT',
      zipCode: '59001',
      allergies: [
        { allergen: 'NSAIDs', reaction: 'GI bleeding', severity: 'SEVERE' },
        { allergen: 'ACE inhibitors', reaction: 'Angioedema', severity: 'LIFE_THREATENING' },
      ],
      conditions: [
        { description: 'Chronic kidney disease, stage 3', icdCode: 'N18.3' },
        { description: 'Atrial fibrillation', icdCode: 'I48.91' },
        { description: 'Osteoarthritis', icdCode: 'M19.90' },
        { description: 'GERD', icdCode: 'K21.0' },
      ],
      medications: [
        { name: 'Apixaban', dose: '2.5mg', frequency: 'twice daily' },
        { name: 'Diltiazem', dose: '240mg', frequency: 'once daily' },
        { name: 'Pantoprazole', dose: '40mg', frequency: 'once daily' },
        { name: 'Acetaminophen', dose: '650mg', frequency: 'every 6 hours as needed' },
      ],
    },
  ];

  for (const patientData of patients) {
    const { allergies, conditions, medications, ...patient } = patientData;
    
    const created = await prisma.patient.upsert({
      where: { organizationId_mrn: { organizationId: org.id, mrn: patient.mrn } },
      update: {},
      create: { ...patient, organizationId: org.id },
    });

    // Add allergies
    for (const allergy of allergies) {
      await prisma.allergy.create({
        data: {
          ...allergy,
          patientId: created.id,
          organizationId: org.id,
        },
      });
    }

    // Add conditions (maps to Condition model)
    for (const condition of conditions) {
      await prisma.condition.create({
        data: {
          ...condition,
          patientId: created.id,
          organizationId: org.id,
          status: 'ACTIVE',
        },
      });
    }

    // Add medications (maps to Medication model)
    for (const medication of medications) {
      await prisma.medication.create({
        data: {
          patientId: created.id,
          organizationId: org.id,
          name: medication.name,
          dose: medication.dose,
          frequency: medication.frequency,
          status: 'ACTIVE',
        },
      });
    }

    console.log(`  ✓ Patient created: ${created.firstName} ${created.lastName} (${created.mrn})`);
  }

  // ============================================================
  // 4. CREATE AUDIT LOG ENTRY FOR SEED
  // ============================================================
  console.log('Creating seed audit log...');

  await prisma.auditLog.create({
    data: {
      action: 'SYSTEM_SEED',
      entityType: 'database',
      entityId: 'production-seed',
      userId: admin.id,
      changes: JSON.stringify({
        providers: providers.length,
        patients: patients.length,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        clinic: PILOT_CLINIC.name,
      }),
      ipAddress: '127.0.0.1',
      userAgent: 'prisma-seed',
    },
  });

  console.log('  ✓ Audit log created');

  // ============================================================
  // COMPLETE
  // ============================================================
  console.log('\n✅ Production seed completed successfully!');
  console.log(`   - Admin user: admin@attending.ai`);
  console.log(`   - Providers: ${providers.length}`);
  console.log(`   - Patients: ${patients.length}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
