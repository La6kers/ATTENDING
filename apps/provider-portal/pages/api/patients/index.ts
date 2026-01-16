// ============================================================
// ATTENDING AI - Patients API Route
// apps/provider-portal/pages/api/patients/index.ts
//
// List patients with search and filtering
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@attending/shared/lib/prisma';
import { Prisma } from '@prisma/client';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    const { search, limit = '50', offset = '0' } = req.query;

    // Build where clause for search
    const where: Prisma.PatientWhereInput = {
      isActive: true,
    };

    if (search && typeof search === 'string') {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { mrn: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }

    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        include: {
          allergies: {
            where: { isActive: true },
            select: {
              allergen: true,
              severity: true,
            },
          },
          conditions: {
            where: { status: 'ACTIVE' },
            select: {
              name: true,
              icdCode: true,
            },
          },
          assessments: {
            orderBy: { submittedAt: 'desc' },
            take: 1,
            select: {
              id: true,
              status: true,
              urgencyLevel: true,
              chiefComplaint: true,
              submittedAt: true,
            },
          },
        },
        orderBy: [
          { lastName: 'asc' },
          { firstName: 'asc' },
        ],
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
      }),
      prisma.patient.count({ where }),
    ]);

    const transformed = patients.map(p => ({
      id: p.id,
      mrn: p.mrn,
      name: `${p.firstName} ${p.lastName}`,
      firstName: p.firstName,
      lastName: p.lastName,
      dateOfBirth: p.dateOfBirth.toISOString().split('T')[0],
      age: calculateAge(p.dateOfBirth),
      gender: p.gender,
      phone: p.phone,
      email: p.email,
      address: p.address ? `${p.address}, ${p.city}, ${p.state} ${p.zipCode}` : null,
      allergies: p.allergies.map(a => a.allergen),
      allergySeverities: p.allergies.map(a => ({ allergen: a.allergen, severity: a.severity })),
      conditions: p.conditions.map(c => c.name),
      latestAssessment: p.assessments[0] || null,
      hasActiveAssessment: p.assessments[0] && 
        ['PENDING', 'URGENT', 'IN_REVIEW'].includes(p.assessments[0].status),
    }));

    return res.status(200).json({
      patients: transformed,
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--;
  }
  return age;
}
