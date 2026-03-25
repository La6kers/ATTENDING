// =============================================================================
// ATTENDING AI — FHIR Disconnect
// apps/provider-portal/pages/api/fhir/auth/disconnect.ts
//
// Clears the FHIR token cookie, disconnecting the provider from the EHR.
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';

function serializeCookie(name: string, value: string, options: {
  httpOnly?: boolean; secure?: boolean; sameSite?: 'lax' | 'strict' | 'none';
  maxAge?: number; path?: string;
}): string {
  let str = `${name}=${encodeURIComponent(value)}`;
  if (options.httpOnly) str += '; HttpOnly';
  if (options.secure) str += '; Secure';
  if (options.sameSite) str += `; SameSite=${options.sameSite}`;
  if (options.maxAge !== undefined) str += `; Max-Age=${options.maxAge}`;
  if (options.path) str += `; Path=${options.path}`;
  return str;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Set-Cookie', [
    serializeCookie('attending_fhir_token', '', { maxAge: 0, path: '/' }),
    serializeCookie('attending_fhir_state', '', { maxAge: 0, path: '/' }),
  ]);

  return res.json({ disconnected: true });
}
