// =============================================================================
// ATTENDING AI - Register Push Token API
// apps/patient-portal/pages/api/emergency/register-push-token.ts
//
// Registers device push notification tokens for emergency alerts
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';

// =============================================================================
// Types
// =============================================================================

interface RegisterTokenRequest {
  userId: string;
  token: string;
  platform: 'ios' | 'android' | 'web' | 'expo';
  deviceId?: string;
  deviceName?: string;
}

// In-memory storage (replace with database in production)
const registeredTokens: Map<string, RegisterTokenRequest[]> = new Map();

// =============================================================================
// API Handler
// =============================================================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Handle different methods
  switch (req.method) {
    case 'POST':
      return handleRegister(req, res);
    case 'DELETE':
      return handleUnregister(req, res);
    case 'GET':
      return handleGetTokens(req, res);
    default:
      return res.status(405).json({ 
        success: false, 
        error: 'Method not allowed' 
      });
  }
}

async function handleRegister(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { userId, token, platform, deviceId, deviceName } = req.body as RegisterTokenRequest;

    // Validate required fields
    if (!userId || !token || !platform) {
      return res.status(400).json({
        success: false,
        error: 'userId, token, and platform are required',
      });
    }

    // Validate platform
    if (!['ios', 'android', 'web', 'expo'].includes(platform)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid platform. Must be ios, android, web, or expo',
      });
    }

    // Get existing tokens for user
    const existingTokens = registeredTokens.get(userId) || [];
    
    // Check if token already exists
    const tokenExists = existingTokens.some(t => t.token === token);
    if (!tokenExists) {
      existingTokens.push({ userId, token, platform, deviceId, deviceName });
      registeredTokens.set(userId, existingTokens);
    }

    console.log(`[PUSH] Registered token for user ${userId}: ${platform} (${deviceName || 'unknown device'})`);

    return res.status(200).json({
      success: true,
      message: 'Push token registered successfully',
    });

  } catch (error) {
    console.error('[ERROR] Failed to register push token:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to register push token',
    });
  }
}

async function handleUnregister(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { userId, token } = req.body;

    if (!userId || !token) {
      return res.status(400).json({
        success: false,
        error: 'userId and token are required',
      });
    }

    // Remove token
    const existingTokens = registeredTokens.get(userId) || [];
    const filteredTokens = existingTokens.filter(t => t.token !== token);
    registeredTokens.set(userId, filteredTokens);

    console.log(`[PUSH] Unregistered token for user ${userId}`);

    return res.status(200).json({
      success: true,
      message: 'Push token unregistered successfully',
    });

  } catch (error) {
    console.error('[ERROR] Failed to unregister push token:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to unregister push token',
    });
  }
}

async function handleGetTokens(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required',
      });
    }

    const tokens = registeredTokens.get(userId as string) || [];
    
    // Return tokens without exposing full token string
    const safeTokens = tokens.map(t => ({
      platform: t.platform,
      deviceId: t.deviceId,
      deviceName: t.deviceName,
      tokenPreview: t.token.substring(0, 10) + '...',
    }));

    return res.status(200).json({
      success: true,
      data: {
        tokens: safeTokens,
        count: safeTokens.length,
      },
    });

  } catch (error) {
    console.error('[ERROR] Failed to get push tokens:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get push tokens',
    });
  }
}
