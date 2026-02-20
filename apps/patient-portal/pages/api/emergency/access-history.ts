// =============================================================================
// ATTENDING AI - Emergency Access History API
// apps/patient-portal/pages/api/emergency/access-history.ts
//
// Retrieves history of emergency access events for a patient
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';

// =============================================================================
// Types
// =============================================================================

interface AccessLogEntry {
  id: string;
  timestamp: string;
  accessMethod: 'pin' | 'face_scan' | 'biometric';
  triggerType: 'crash_detection' | 'manual' | 'lock_screen' | 'fall_detected';
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  accessorPhotoUrl?: string;
  deviceInfo: {
    userAgent: string;
    platform?: string;
  };
  sessionDuration?: number;
  notificationsSent: {
    emergencyContacts: boolean;
    emergencyServices: boolean;
    careTeam: boolean;
  };
}

// =============================================================================
// Mock Data (Replace with database in production)
// =============================================================================

const mockAccessHistory: AccessLogEntry[] = [
  {
    id: 'eal_001',
    timestamp: new Date(Date.now() - 86400000 * 30).toISOString(), // 30 days ago
    accessMethod: 'pin',
    triggerType: 'crash_detection',
    location: {
      latitude: 39.7392,
      longitude: -104.9903,
      address: 'Denver, CO',
    },
    accessorPhotoUrl: '/api/emergency/photos/eal_001',
    deviceInfo: {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)',
      platform: 'iOS',
    },
    sessionDuration: 180, // 3 minutes
    notificationsSent: {
      emergencyContacts: true,
      emergencyServices: false,
      careTeam: true,
    },
  },
  {
    id: 'eal_002',
    timestamp: new Date(Date.now() - 86400000 * 90).toISOString(), // 90 days ago
    accessMethod: 'pin',
    triggerType: 'manual',
    location: {
      latitude: 39.7500,
      longitude: -105.0000,
      address: 'Golden, CO',
    },
    deviceInfo: {
      userAgent: 'Mozilla/5.0 (Linux; Android 14)',
      platform: 'Android',
    },
    sessionDuration: 45,
    notificationsSent: {
      emergencyContacts: true,
      emergencyServices: false,
      careTeam: false,
    },
  },
];

// =============================================================================
// API Handler
// =============================================================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    const { patientId: _patientId, limit = '10', offset = '0' } = req.query;

    // In production, verify authentication and authorization
    
    const limitNum = parseInt(limit as string, 10);
    const offsetNum = parseInt(offset as string, 10);
    
    // Paginate results
    const paginatedHistory = mockAccessHistory.slice(offsetNum, offsetNum + limitNum);
    
    return res.status(200).json({
      success: true,
      data: {
        history: paginatedHistory,
        total: mockAccessHistory.length,
        limit: limitNum,
        offset: offsetNum,
      },
    });

  } catch (error) {
    console.error('[ERROR] Failed to retrieve access history:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve access history',
    });
  }
}
