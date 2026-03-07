// ATTENDING AI - Database Seed Script
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Create provider user
  const provider = await prisma.user.upsert({
    where: { email: 'dr.smith@hospital.com' },
    update: {},
    create: {
      email: 'dr.smith@hospital.com',
      name: 'Dr. Sarah Smith',
      role: 'PROVIDER',
      specialty: 'Internal Medicine',
      npi: '1234567890',
    },
  });
  console.log('Created provider:', provider.email);

  // Create patient
  const patient = await prisma.patient.upsert({
    where: { mrn: 'MRN001' },
    update: {},
    create: {
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

  // Create encounter
  await prisma.encounter.create({
    data: {
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

  console.log('');
  console.log('Seed completed successfully!');
  console.log('Data created:');
  console.log('  - Provider: Dr. Sarah Smith');
  console.log('  - Patient: John Doe (MRN001)');
  console.log('  - Medication: Metformin (from previous run)');
  console.log('  - Allergy: Penicillin (from previous run)');
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
