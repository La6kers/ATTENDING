// =============================================================================
// ATTENDING AI - Full Patient Sync Endpoint
// apps/provider-portal/pages/api/fhir/sync/patient.ts
//
// Syncs complete patient record from EHR to ATTENDING database
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { prisma } from '@/lib/prisma';
import { createFhirSyncService } from '@/shared/services/fhir-sync/FhirSyncService';
import { createFhirPersistenceService } from '@/shared/services/fhir-sync/FhirPersistenceService';
import type { EhrVendor } from '@/shared/lib/fhir/types';

interface SyncRequest {
  vendor?: EhrVendor;
  patientId?: string;
  includePatient?: boolean;
  includeMedications?: boolean;
  includeAllergies?: boolean;
  includeConditions?: boolean;
  includeLabResults?: boolean;
  includeVitals?: boolean;
  includeEncounters?: boolean;
  sinceDays?: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Authenticate user
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = session.user.id;
  const {
    vendor = 'epic',
    patientId,
    includePatient = true,
    includeMedications = true,
    includeAllergies = true,
    includeConditions = true,
    includeLabResults = true,
    includeVitals = true,
    includeEncounters = true,
    sinceDays,
  } = req.body as SyncRequest;

  try {
    // Get FHIR connection credentials
    const connection = await prisma.fhirConnection.findUnique({
      where: {
        userId_vendor: {
          userId,
          vendor,
        },
      },
    });

    if (!connection) {
      return res.status(404).json({ 
        error: 'No FHIR connection found',
        message: 'Please connect to your EHR first via /api/fhir/launch',
      });
    }

    // Check token expiration
    if (new Date() >= connection.tokenExpiresAt) {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Please reconnect to your EHR',
      });
    }

    // Create sync service
    const syncService = createFhirSyncService({
      vendor: connection.vendor as EhrVendor,
      baseUrl: connection.baseUrl,
      accessToken: connection.accessToken,
      refreshToken: connection.refreshToken || undefined,
      tokenExpiresAt: connection.tokenExpiresAt,
      patientId: patientId || connection.patientId || undefined,
      encounterId: connection.encounterId || undefined,
    });

    // Calculate since date if specified
    const sinceDatetime = sinceDays 
      ? new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000)
      : undefined;

    // Perform sync
    const syncResult = await syncService.syncAll({
      includePatient,
      includeMedications,
      includeAllergies,
      includeConditions,
      includeLabResults,
      includeVitals,
      includeEncounters,
      sinceDatetime,
      maxResults: 100,
    });

    // Persist to database
    const persistenceService = createFhirPersistenceService(
      prisma as any,
      userId,
      syncService.getPatientId() || ''
    );

    const persistResult = await persistenceService.persistSyncResult(syncResult);

    // Update last sync time on connection
    await prisma.fhirConnection.update({
      where: {
        userId_vendor: {
          userId,
          vendor,
        },
      },
      data: {
        lastSyncAt: new Date(),
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'FHIR_SYNC',
        resourceType: 'Patient',
        resourceId: syncService.getPatientId(),
        details: JSON.stringify({
          vendor,
          counts: syncResult.counts,
          duration: syncResult.duration,
          errors: syncResult.errors,
        }),
      },
    });

    return res.status(200).json({
      success: syncResult.success && persistResult.success,
      syncResult: {
        syncedAt: syncResult.syncedAt,
        duration: syncResult.duration,
        counts: syncResult.counts,
        errors: syncResult.errors,
      },
      persistResult: {
        persisted: persistResult.persisted,
        errors: persistResult.errors,
      },
    });

  } catch (error: any) {
    console.error('[FHIR Sync] Error:', error);
    
    // Log error
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'FHIR_SYNC_ERROR',
        resourceType: 'Patient',
        details: JSON.stringify({
          vendor,
          error: error.message,
        }),
      },
    });

    return res.status(500).json({
      error: 'Sync failed',
      message: error.message,
    });
  }
}
