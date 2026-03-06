// ============================================================
// ATTENDING AI - Prometheus Metrics Endpoint
// apps/provider-portal/pages/api/metrics.ts
//
// GET /api/metrics → Prometheus text format (for scraping)
//
// Restricted endpoint — only internal/monitoring IPs should access.
// Configure METRICS_ALLOWED_IPS as a comma-separated list of
// trusted CIDRs or IPs (default: 127.0.0.1, ::1).
// In production, also restrict via network policy / ingress rules.
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { metrics } from '@attending/shared/lib/metrics';

// Parse allowed IPs from env; default to localhost only
const ALLOWED_IPS: string[] = (process.env.METRICS_ALLOWED_IPS || '127.0.0.1,::1,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16')
  .split(',')
  .map((ip) => ip.trim())
  .filter(Boolean);

/**
 * Check if a client IP matches any of the allowed CIDRs / exact IPs.
 * Supports exact matches and simple CIDR notation (IPv4 only).
 */
function isAllowedIp(clientIp: string): boolean {
  // Normalise IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1 → 127.0.0.1)
  const normalised = clientIp.replace(/^::ffff:/, '');

  for (const entry of ALLOWED_IPS) {
    if (entry.includes('/')) {
      // Simple CIDR match (IPv4 only)
      if (cidrMatch(normalised, entry)) return true;
    } else {
      // Exact match
      const normEntry = entry.replace(/^::ffff:/, '');
      if (normalised === normEntry) return true;
    }
  }
  return false;
}

/** IPv4-only CIDR match helper. */
function cidrMatch(ip: string, cidr: string): boolean {
  const [range, bits] = cidr.split('/');
  const mask = ~((1 << (32 - parseInt(bits, 10))) - 1) >>> 0;
  const ipNum = ipToNumber(ip);
  const rangeNum = ipToNumber(range);
  if (ipNum === null || rangeNum === null) return false;
  return (ipNum & mask) === (rangeNum & mask);
}

function ipToNumber(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  const n = parts.reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0);
  return n >>> 0; // unsigned
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end();
  }

  // IP-based access control
  const forwarded = req.headers['x-forwarded-for'];
  const clientIp = typeof forwarded === 'string'
    ? forwarded.split(',')[0]?.trim() || ''
    : req.socket?.remoteAddress || '';

  if (!isAllowedIp(clientIp)) {
    console.warn(`[Metrics] Blocked request from ${clientIp}`);
    return res.status(403).json({ error: 'Forbidden — metrics access restricted by IP' });
  }

  res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.status(200).send(metrics.toPrometheus());
}
