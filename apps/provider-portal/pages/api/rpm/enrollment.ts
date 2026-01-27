// =============================================================================
// ATTENDING AI - Remote Patient Monitoring API
// apps/provider-portal/pages/api/rpm/enrollment.ts
//
// Enroll patients in RPM programs and manage devices
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { 
  remoteMonitoringService,
  type PatientRPMEnrollment,
  type PatientDevice,
  type DeviceType,
  type DeviceVendor,
} from '@attending/shared/services/rpm';

interface EnrollRequest {
  patientId: string;
  programType: PatientRPMEnrollment['programType'];
  conditions: string[];
}

interface DeviceRequest {
  patientId: string;
  deviceType: DeviceType;
  vendor: DeviceVendor;
  settings?: any;
}

interface RPMResponse {
  success: boolean;
  enrollment?: PatientRPMEnrollment;
  device?: PatientDevice;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RPMResponse>
) {
  try {
    // Authenticate
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const providerId = session.user.id;

    switch (req.method) {
      case 'POST': {
        const { action } = req.query;

        if (action === 'device') {
          // Register device
          const { patientId, deviceType, vendor, settings } = req.body as DeviceRequest;

          if (!patientId || !deviceType || !vendor) {
            return res.status(400).json({ 
              success: false, 
              error: 'patientId, deviceType, and vendor are required' 
            });
          }

          const device = await remoteMonitoringService.registerDevice(
            patientId,
            deviceType,
            vendor,
            settings
          );

          return res.status(201).json({ success: true, device });
        }

        // Enroll patient
        const { patientId, programType, conditions } = req.body as EnrollRequest;

        if (!patientId || !programType || !conditions) {
          return res.status(400).json({ 
            success: false, 
            error: 'patientId, programType, and conditions are required' 
          });
        }

        const enrollment = await remoteMonitoringService.enrollPatient(
          patientId,
          providerId,
          programType,
          conditions
        );

        return res.status(201).json({ success: true, enrollment });
      }

      default:
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ 
          success: false, 
          error: `Method ${req.method} Not Allowed` 
        });
    }
  } catch (error) {
    console.error('[RPM Enrollment API] Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}
