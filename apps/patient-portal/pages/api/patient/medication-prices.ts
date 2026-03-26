// ============================================================
// ATTENDING AI — Patient Medication Prices API
// apps/patient-portal/pages/api/patient/medication-prices.ts
//
// GET /api/patient/medication-prices?zipCode=63101
// Returns cost comparison across pharmacies for all patient meds.
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { getMedicationCostSummary } from '@attending/shared/services/PharmacyPricingService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Get patient's active medications from DB
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const medications = await prisma.medication.findMany({
      where: {
        patientId: session.user.id,
        status: 'ACTIVE',
        deletedAt: null,
      },
      select: {
        name: true,
        genericName: true,
        dose: true,
        frequency: true,
      },
    });

    if (medications.length === 0) {
      return res.status(200).json({
        totalMonthlyEstimate: 0,
        totalLowestCost: 0,
        totalSavings: 0,
        medicationCount: 0,
        medications: [],
      });
    }

    const summary = await getMedicationCostSummary(
      medications.map((m: any) => ({
        name: m.name,
        genericName: m.genericName ?? m.name,
        dose: m.dose,
        frequency: m.frequency,
      }))
    );

    return res.status(200).json(summary);
  } catch (error: any) {
    console.error('Medication prices error:', error);
    return res.status(500).json({ error: 'Failed to fetch medication prices' });
  }
}
