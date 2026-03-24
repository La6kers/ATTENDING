// ATTENDING AI - Database Seed Script
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Create demo Organization first (multi-tenant foundation)
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
  console.log('Created organization:', org.name);

  // Create provider user linked to the organization
  const provider = await prisma.user.upsert({
    where: { email: 'dr.smith@hospital.com' },
    update: { organizationId: org.id },
    create: {
      organizationId: org.id,
      email: 'dr.smith@hospital.com',
      name: 'Dr. Sarah Smith',
      role: 'PROVIDER',
      specialty: 'Internal Medicine',
      npi: '1234567890',
    },
  });
  console.log('Created provider:', provider.email);

  // Create patient linked to the organization
  const patient = await prisma.patient.upsert({
    where: {
      organizationId_mrn: { organizationId: org.id, mrn: 'MRN001' },
    },
    update: {},
    create: {
      organizationId: org.id,
      mrn: 'MRN001',
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: new Date('1965-03-15'),
      gender: 'Male',
      email: 'john.doe@email.com',
      phone: '555-1234',
    },
  });
  console.log('Created patient:', patient.mrn);

  // Create encounter linked to the organization
  await prisma.encounter.create({
    data: {
      organizationId: org.id,
      patientId: patient.id,
      providerId: provider.id,
      encounterType: 'OFFICE_VISIT',
      status: 'COMPLETED',
      chiefComplaint: 'Annual wellness visit',
      startTime: new Date(),
      endTime: new Date(),
      notes: 'Patient in good health. Continue current medications, follow up in 6 months.',
    },
  });
  console.log('Created encounter');

  // Create sample allergy
  await prisma.allergy.create({
    data: {
      organizationId: org.id,
      patientId: patient.id,
      allergen: 'Penicillin',
      reaction: 'Hives',
      severity: 'MODERATE',
      status: 'ACTIVE',
    },
  });
  console.log('Created allergy: Penicillin');

  // Create sample medication
  await prisma.medication.create({
    data: {
      organizationId: org.id,
      patientId: patient.id,
      name: 'Metformin',
      genericName: 'Metformin HCl',
      dose: '500mg',
      frequency: 'BID',
      route: 'PO',
      status: 'ACTIVE',
      startDate: new Date('2024-01-15'),
    },
  });
  console.log('Created medication: Metformin');

  // Create sample vital signs
  await prisma.vitalSign.create({
    data: {
      organizationId: org.id,
      patientId: patient.id,
      heartRate: 72,
      bloodPressureSystolic: 128,
      bloodPressureDiastolic: 82,
      respiratoryRate: 16,
      temperature: 98.6,
      oxygenSaturation: 98,
      weight: 185,
      height: 70,
    },
  });
  console.log('Created vital signs');

  console.log('');
  console.log('Seed completed successfully!');
  console.log('Data created:');
  console.log(`  - Organization: ${org.name} (${org.id})`);
  console.log('  - Provider: Dr. Sarah Smith');
  console.log('  - Patient: John Doe (MRN001)');
  console.log('  - Allergy: Penicillin');
  console.log('  - Medication: Metformin');
  console.log('  - Vital Signs: BP 128/82, HR 72');
  console.log('  - Encounter: Office visit');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
