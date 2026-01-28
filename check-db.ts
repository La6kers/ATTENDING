import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.findMany();
  const patients = await prisma.patient.findMany();
  const encounters = await prisma.encounter.findMany();
  const medications = await prisma.patientMedication.findMany();
  
  console.log('Database contents:');
  console.log('  Users:', users.length);
  console.log('  Patients:', patients.length);
  console.log('  Encounters:', encounters.length);
  console.log('  Medications:', medications.length);
  
  if (users.length > 0) {
    console.log('\nSample user:', users[0].email, '-', users[0].name);
  }
  if (patients.length > 0) {
    console.log('Sample patient:', patients[0].firstName, patients[0].lastName);
  }
  
  await prisma.$disconnect();
}

check();
