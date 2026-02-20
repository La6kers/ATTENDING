// =============================================================================
// ATTENDING AI - FHIR Connection Status Endpoint
// apps/provider-portal/pages/api/fhir/status.ts
//
// Returns current FHIR connection status and available data
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '@attending/shared/lib/prisma';

interface FhirStatus {
  connected: boolean;
  vendor?: string;
  patientId?: string;
  encounterId?: string;
  tokenExpired: boolean;
  lastSyncAt?: string;
  availableData: {
    patient: boolean;
    medications: number;
    allergies: number;
    conditions: number;
    labResults: number;
    vitals: number;
    encounters: number;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const providerId = session.user.id;
  const { vendor = 'epic' } = req.query;

  try {
    // Check for FHIR connection
    const connection = await prisma.fhirConnection.findUnique({
      where: {
        providerId_vendor: {
          providerId,
          vendor: vendor as string,
        },
      },
    });

    if (!connection) {
      return res.status(200).json({
        connected: false,
        tokenExpired: true,
        availableData: {
          patient: false,
          medications: 0,
          allergies: 0,
          conditions: 0,
          labResults: 0,
          vitals: 0,
          encounters: 0,
        },
      } as FhirStatus);
    }

    const tokenExpired = new Date() >= connection.expiresAt;

    // Count synced data if patient is connected
    let availableData = {
      patient: false,
      medications: 0,
      allergies: 0,
      conditions: 0,
      labResults: 0,
      vitals: 0,
      encounters: 0,
    };

    if (connection.patientId) {
      // Find the local patient linked to this FHIR patient
      const patient = await prisma.patient.findFirst({
        where: { fhirId: connection.patientId },
      });

      if (patient) {
        availableData.patient = true;

        const [medications, allergies, conditions, labResults, vitals] = await Promise.all([
          prisma.fhirMedication.count({ where: { patientId: patient.id } }),
          prisma.allergy.count({ where: { patientId: patient.id } }),
          prisma.fhirCondition.count({ where: { patientId: patient.id } }),
          prisma.fhirLabResult.count({ where: { patientId: patient.id } }),
          prisma.fhirVitalSign.count({ where: { patientId: patient.id } }),
        ]);

        availableData = {
          patient: true,
          medications,
          allergies,
          conditions,
          labResults,
          vitals,
          encounters: 0, // FhirEncounter doesn't have patientId foreign key
        };
      }
    }

    return res.status(200).json({
      connected: true,
      vendor: connection.vendor,
      patientId: connection.patientId,
      encounterId: connection.encounterId,
      tokenExpired,
      lastSyncAt: connection.updatedAt?.toISOString(),
      availableData,
    } as FhirStatus);

  } catch (error: any) {
    console.error('[FHIR Status] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
