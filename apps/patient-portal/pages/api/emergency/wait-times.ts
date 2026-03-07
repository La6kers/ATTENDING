// ============================================================
// ATTENDING AI — Facility Wait Times API
// apps/patient-portal/pages/api/emergency/wait-times.ts
//
// GET  — Returns current wait times for nearby facilities
// POST — Facilities push wait time updates (API key auth)
//
// Facilities integrate by POSTing to this endpoint with their
// facility ID, current wait time, and an API key. The app
// polls GET to show patients real-time wait estimates.
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';

export interface FacilityWaitTime {
  facilityId: string;
  name: string;
  type: 'er' | 'urgent-care' | 'clinic';
  address: string;
  phone: string;
  lat: number;
  lng: number;
  waitMinutes: number | null;        // null = no data available
  lastUpdated: string;               // ISO timestamp
  updatedBy: string;                 // facility name or system
  patientsSeen24h?: number;          // optional transparency metric
  status: 'open' | 'closed' | 'diverting'; // diverting = ER on diversion
  hours: string;
  capacityLevel?: 'low' | 'moderate' | 'high' | 'critical'; // optional
}

// In-memory store (production would use Redis/DB)
const waitTimeStore = new Map<string, FacilityWaitTime>();

// Seed demo data
const SEED_DATA: FacilityWaitTime[] = [
  {
    facilityId: 'parker-adventist-er',
    name: 'Parker Adventist Hospital ER',
    type: 'er',
    address: '9395 Crown Crest Blvd, Parker, CO',
    phone: '(303) 269-4000',
    lat: 39.5050, lng: -104.7614,
    waitMinutes: 18,
    lastUpdated: new Date(Date.now() - 8 * 60000).toISOString(),
    updatedBy: 'Parker Adventist Hospital',
    patientsSeen24h: 127,
    status: 'open',
    hours: '24/7',
    capacityLevel: 'moderate',
  },
  {
    facilityId: 'uchealth-urgent-parker',
    name: 'UCHealth Urgent Care - Parker',
    type: 'urgent-care',
    address: '10450 S Parker Rd, Parker, CO',
    phone: '(720) 516-1000',
    lat: 39.5186, lng: -104.7614,
    waitMinutes: 25,
    lastUpdated: new Date(Date.now() - 12 * 60000).toISOString(),
    updatedBy: 'UCHealth System',
    patientsSeen24h: 43,
    status: 'open',
    hours: '8:00 AM - 8:00 PM',
    capacityLevel: 'moderate',
  },
  {
    facilityId: 'afc-urgent-parker',
    name: 'AFC Urgent Care Parker',
    type: 'urgent-care',
    address: '18366 Lincoln Ave, Parker, CO',
    phone: '(303) 841-4000',
    lat: 39.5120, lng: -104.7750,
    waitMinutes: 10,
    lastUpdated: new Date(Date.now() - 3 * 60000).toISOString(),
    updatedBy: 'AFC Urgent Care',
    patientsSeen24h: 31,
    status: 'open',
    hours: '8:00 AM - 7:00 PM',
    capacityLevel: 'low',
  },
  {
    facilityId: 'sky-ridge-er',
    name: 'Sky Ridge Medical Center ER',
    type: 'er',
    address: '10101 Ridge Gate Pkwy, Lone Tree, CO',
    phone: '(720) 225-1000',
    lat: 39.5400, lng: -104.8700,
    waitMinutes: 42,
    lastUpdated: new Date(Date.now() - 20 * 60000).toISOString(),
    updatedBy: 'Sky Ridge Medical Center',
    patientsSeen24h: 156,
    status: 'open',
    hours: '24/7',
    capacityLevel: 'high',
  },
  {
    facilityId: 'centura-er-parker',
    name: 'Centura Health ER - Parker',
    type: 'er',
    address: '19550 E Mainstreet, Parker, CO',
    phone: '(303) 269-5100',
    lat: 39.5095, lng: -104.7520,
    waitMinutes: null,
    lastUpdated: new Date(Date.now() - 120 * 60000).toISOString(),
    updatedBy: 'System',
    status: 'open',
    hours: '24/7',
    capacityLevel: undefined,
  },
  {
    facilityId: 'nextcare-urgent-parker',
    name: 'NextCare Urgent Care',
    type: 'urgent-care',
    address: '11035 S Pikes Peak Dr, Parker, CO',
    phone: '(303) 840-7300',
    lat: 39.5200, lng: -104.7680,
    waitMinutes: 5,
    lastUpdated: new Date(Date.now() - 1 * 60000).toISOString(),
    updatedBy: 'NextCare Urgent Care',
    patientsSeen24h: 22,
    status: 'open',
    hours: '8:00 AM - 9:00 PM',
    capacityLevel: 'low',
  },
];

// Initialize store
if (waitTimeStore.size === 0) {
  SEED_DATA.forEach(f => waitTimeStore.set(f.facilityId, f));
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // ── GET: Patient app fetches wait times ──
  if (req.method === 'GET') {
    const { type, lat, lng } = req.query;

    let facilities = Array.from(waitTimeStore.values());

    // Filter by type if provided
    if (type && typeof type === 'string' && type !== 'all') {
      facilities = facilities.filter(f => f.type === type);
    }

    // Sort: open first, then by wait time (null last)
    facilities.sort((a, b) => {
      if (a.status !== 'open' && b.status === 'open') return 1;
      if (a.status === 'open' && b.status !== 'open') return -1;
      if (a.waitMinutes === null && b.waitMinutes !== null) return 1;
      if (a.waitMinutes !== null && b.waitMinutes === null) return -1;
      return (a.waitMinutes ?? 999) - (b.waitMinutes ?? 999);
    });

    return res.status(200).json({
      facilities,
      lastPolled: new Date().toISOString(),
      note: 'Wait times are estimates provided by each facility and may vary.',
    });
  }

  // ── POST: Facility pushes a wait time update ──
  if (req.method === 'POST') {
    const apiKey = req.headers['x-facility-api-key'];

    // In production, validate API key against facility registry
    if (!apiKey) {
      return res.status(401).json({ error: 'Missing x-facility-api-key header' });
    }

    const { facilityId, waitMinutes, status, capacityLevel, patientsSeen24h } = req.body;

    if (!facilityId) {
      return res.status(400).json({ error: 'facilityId is required' });
    }

    const existing = waitTimeStore.get(facilityId);
    if (!existing) {
      return res.status(404).json({ error: `Unknown facilityId: ${facilityId}` });
    }

    // Update
    const updated: FacilityWaitTime = {
      ...existing,
      waitMinutes: waitMinutes ?? existing.waitMinutes,
      status: status ?? existing.status,
      capacityLevel: capacityLevel ?? existing.capacityLevel,
      patientsSeen24h: patientsSeen24h ?? existing.patientsSeen24h,
      lastUpdated: new Date().toISOString(),
      updatedBy: existing.name,
    };

    waitTimeStore.set(facilityId, updated);

    return res.status(200).json({
      ok: true,
      facility: updated,
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
