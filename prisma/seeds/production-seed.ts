// ============================================================
// ATTENDING AI - Production Database Seed
// prisma/seeds/production-seed.ts
//
// Realistic clinical data for pilot deployment
// Includes sample providers, patients, and clinical scenarios
// ============================================================

import { PrismaClient, UserRole, AllergySeverity, AllergyType } from '@prisma/client';
import { hash } from 'bcryptjs';

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
  // 1. CREATE ADMIN USER
  // ============================================================
  console.log('Creating admin user...');
  
  const adminPassword = await hash(process.env.ADMIN_PASSWORD || 'ChangeMe123!', 12);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@attending.ai' },
    update: {},
    create: {
      email: 'admin@attending.ai',
      name: 'System Administrator',
      password: adminPassword,
      role: UserRole.ADMIN,
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
      role: UserRole.PROVIDER,
      specialty: 'Family Medicine',
      npi: '1122334455',
      department: 'Primary Care',
    },
    {
      email: 'dr.jones@pilotclinic.org',
      name: 'Dr. Michael Jones, DO',
      role: UserRole.PROVIDER,
      specialty: 'Internal Medicine',
      npi: '2233445566',
      department: 'Primary Care',
    },
    {
      email: 'np.williams@pilotclinic.org',
      name: 'Jennifer Williams, NP',
      role: UserRole.PROVIDER,
      specialty: 'Family Nurse Practitioner',
      npi: '3344556677',
      department: 'Primary Care',
    },
    {
      email: 'rn.davis@pilotclinic.org',
      name: 'Robert Davis, RN',
      role: UserRole.NURSE,
      department: 'Primary Care',
    },
    {
      email: 'staff.miller@pilotclinic.org',
      name: 'Amanda Miller',
      role: UserRole.STAFF,
      department: 'Front Desk',
    },
  ];

  const providerPassword = await hash('PilotClinic2026!', 12);

  for (const provider of providers) {
    const created = await prisma.user.upsert({
      where: { email: provider.email },
      update: {},
      create: {
        ...provider,
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
        { allergen: 'Penicillin', reaction: 'Hives', severity: AllergySeverity.MODERATE, type: AllergyType.DRUG },
        { allergen: 'Sulfa', reaction: 'Rash', severity: AllergySeverity.MILD, type: AllergyType.DRUG },
      ],
      conditions: [
        { name: 'Type 2 Diabetes Mellitus', icdCode: 'E11.9' },
        { name: 'Essential Hypertension', icdCode: 'I10' },
        { name: 'Hyperlipidemia', icdCode: 'E78.5' },
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
        { allergen: 'Codeine', reaction: 'Nausea', severity: AllergySeverity.MILD, type: AllergyType.DRUG },
      ],
      conditions: [
        { name: 'Asthma, moderate persistent', icdCode: 'J45.40' },
        { name: 'Seasonal allergies', icdCode: 'J30.2' },
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
        { name: 'Coronary artery disease', icdCode: 'I25.10' },
        { name: 'History of STEMI', icdCode: 'I25.2' },
        { name: 'Heart failure with reduced EF', icdCode: 'I50.22' },
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
        { allergen: 'Peanuts', reaction: 'Anaphylaxis', severity: AllergySeverity.LIFE_THREATENING, type: AllergyType.FOOD },
      ],
      conditions: [
        { name: 'Anxiety disorder', icdCode: 'F41.1' },
        { name: 'Migraine without aura', icdCode: 'G43.909' },
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
        { allergen: 'NSAIDs', reaction: 'GI bleeding', severity: AllergySeverity.SEVERE, type: AllergyType.DRUG },
        { allergen: 'ACE inhibitors', reaction: 'Angioedema', severity: AllergySeverity.LIFE_THREATENING, type: AllergyType.DRUG },
      ],
      conditions: [
        { name: 'Chronic kidney disease, stage 3', icdCode: 'N18.3' },
        { name: 'Atrial fibrillation', icdCode: 'I48.91' },
        { name: 'Osteoarthritis', icdCode: 'M19.90' },
        { name: 'GERD', icdCode: 'K21.0' },
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
      where: { mrn: patient.mrn },
      update: {},
      create: patient,
    });

    // Add allergies
    for (const allergy of allergies) {
      await prisma.allergy.create({
        data: {
          ...allergy,
          patientId: created.id,
        },
      });
    }

    // Add conditions
    for (const condition of conditions) {
      await prisma.medicalCondition.create({
        data: {
          ...condition,
          patientId: created.id,
          status: 'ACTIVE',
        },
      });
    }

    // Add medications
    for (const medication of medications) {
      await prisma.patientMedication.create({
        data: {
          patientId: created.id,
          medicationName: medication.name,
          dose: medication.dose,
          frequency: medication.frequency,
          isActive: true,
        },
      });
    }

    console.log(`  ✓ Patient created: ${created.firstName} ${created.lastName} (${created.mrn})`);
  }

  // ============================================================
  // 4. CREATE SYSTEM CONFIGURATION
  // ============================================================
  console.log('Creating system configuration...');

  await prisma.systemConfig.upsert({
    where: { key: 'clinic_info' },
    update: {},
    create: {
      key: 'clinic_info',
      value: JSON.stringify(PILOT_CLINIC),
    },
  });

  await prisma.systemConfig.upsert({
    where: { key: 'feature_flags' },
    update: {},
    create: {
      key: 'feature_flags',
      value: JSON.stringify({
        ai_differential_diagnosis: true,
        voice_input: true,
        camera_capture: true,
        offline_mode: true,
        fhir_integration: true,
        emergency_escalation: true,
      }),
    },
  });

  await prisma.systemConfig.upsert({
    where: { key: 'ai_settings' },
    update: {},
    create: {
      key: 'ai_settings',
      value: JSON.stringify({
        model: 'biomistral-7b',
        confidence_threshold: 0.7,
        max_differentials: 7,
        enable_learning: true,
      }),
    },
  });

  console.log('  ✓ System configuration created');

  // ============================================================
  // 5. CREATE AUDIT LOG ENTRY FOR SEED
  // ============================================================
  console.log('Creating seed audit log...');

  await prisma.auditLog.create({
    data: {
      action: 'SYSTEM_SEED',
      resource: 'database',
      resourceId: 'production-seed',
      userId: admin.id,
      userEmail: admin.email,
      userRole: admin.role,
      details: JSON.stringify({
        providers: providers.length,
        patients: patients.length,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
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
