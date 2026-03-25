// =============================================================================
// ATTENDING AI - RPM Readings & Dashboard API
// apps/provider-portal/pages/api/rpm/[patientId].ts
//
// Ingest device readings and get patient dashboard
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { 
  remoteMonitoringService,
  type DeviceReading,
  type RPMDashboardData,
  type ReadingValues,
  type DeviceType,
} from '@attending/shared/services/rpm';

interface ReadingRequest {
  deviceId?: string;
  deviceType?: DeviceType;
  values: ReadingValues;
  timestamp?: string;
  context?: any;
}

interface RPMPatientResponse {
  success: boolean;
  dashboard?: RPMDashboardData;
  reading?: DeviceReading;
  billing?: any;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RPMPatientResponse>
) {
  try {
    // Authenticate
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { patientId, action } = req.query;
    const patientIdStr = Array.isArray(patientId) ? patientId[0] : patientId;

    if (!patientIdStr) {
      return res.status(400).json({ success: false, error: 'Patient ID required' });
    }

    switch (req.method) {
      case 'GET': {
        if (action === 'billing') {
          // Get billing report
          const billing = await remoteMonitoringService.getBillingReport(
            patientIdStr,
            new Date()
          );
          return res.status(200).json({ success: true, billing });
        }

        // Get patient dashboard
        const dashboard = await remoteMonitoringService.getPatientDashboard(patientIdStr);
        
        if (!dashboard) {
          return res.status(404).json({ 
            success: false, 
            error: 'Patient not enrolled in RPM' 
          });
        }

        return res.status(200).json({ success: true, dashboard });
      }

      case 'POST': {
        // Ingest reading
        const { deviceId, deviceType, values, timestamp, context } = req.body as ReadingRequest;

        if (!values) {
          return res.status(400).json({ 
            success: false, 
            error: 'Reading values are required' 
          });
        }

        let reading: DeviceReading;

        if (deviceId) {
          // Device reading
          reading = await remoteMonitoringService.ingestReading(
            deviceId,
            values,
            timestamp ? new Date(timestamp) : new Date(),
            context
          );
        } else if (deviceType) {
          // Manual reading
          reading = await remoteMonitoringService.ingestManualReading(
            patientIdStr,
            deviceType,
            values,
            timestamp ? new Date(timestamp) : new Date(),
            context
          );
        } else {
          return res.status(400).json({ 
            success: false, 
            error: 'Either deviceId or deviceType is required' 
          });
        }

        return res.status(201).json({ success: true, reading });
      }

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ 
          success: false, 
          error: `Method ${req.method} Not Allowed` 
        });
    }
  } catch (error) {
    console.error('[RPM Patient API] Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}
