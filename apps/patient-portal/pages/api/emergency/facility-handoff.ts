// ============================================================
// ATTENDING AI — Facility Handoff API
// apps/patient-portal/pages/api/emergency/facility-handoff.ts
//
// POST /api/emergency/facility-handoff
//
// Two modes:
// 1. Patient self-refer: COMPASS pushes assessment summary
//    to selected facility so they can prepare.
// 2. EMS handoff: Paramedics stream real-time patient data
//    (vitals, treatments, ambient transcript summary) to
//    receiving ER so the trauma/care team is ready.
//
// Rate limits:
// - Patient self-refer: 1 per facility per 15 min
// - EMS stream: updates every 2 min, max 60 min session
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';

// ── Types ──

export interface PatientHandoff {
  handoffId: string;
  facilityId: string;
  facilityName: string;
  mode: 'self-refer' | 'ems-stream';
  status: 'active' | 'received' | 'closed';
  createdAt: string;
  expiresAt: string;
  patient: {
    name: string;
    age: number;
    sex: string;
    allergies: string[];
    conditions: string[];
    medications: string[];
    bloodType?: string;
  };
  // COMPASS assessment data (self-refer)
  compassSummary?: {
    chiefComplaint: string;
    urgencyLevel: 'low' | 'moderate' | 'high' | 'critical';
    redFlags: string[];
    symptomTimeline: string;
    assessmentId?: string;
  };
  // EMS real-time data (ems-stream)
  emsData?: {
    unitId: string;
    eta: string;
    vitals: {
      timestamp: string;
      heartRate?: number;
      bloodPressure?: string;
      spO2?: number;
      respRate?: number;
      gcs?: number;
      painScale?: number;
      temperature?: number;
    }[];
    treatments: {
      timestamp: string;
      action: string;
      detail: string;
    }[];
    ambientSummary: string;     // AI-generated summary from ambient listening
    lastSummaryUpdate: string;  // updates every ~2 min
    mechanism?: string;         // mechanism of injury
    scene?: string;             // scene description
  };
  updates: {
    timestamp: string;
    type: 'vitals' | 'treatment' | 'summary' | 'eta' | 'status';
    data: any;
  }[];
}

// ── In-memory store ──
const handoffStore = new Map<string, PatientHandoff>();
const rateLimits = new Map<string, number>(); // key -> last timestamp

// ── Rate limit check ──
function checkRateLimit(key: string, windowMs: number): boolean {
  const last = rateLimits.get(key);
  if (last && Date.now() - last < windowMs) return false;
  rateLimits.set(key, Date.now());
  return true;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // ── POST: Create or update handoff ──
  if (req.method === 'POST') {
    const { mode, facilityId, patient, compassSummary, emsData, handoffId: existingId } = req.body;

    // Update existing EMS stream
    if (existingId && handoffStore.has(existingId)) {
      const handoff = handoffStore.get(existingId)!;

      // Check session expiry (60 min max)
      if (new Date(handoff.expiresAt).getTime() < Date.now()) {
        handoff.status = 'closed';
        return res.status(410).json({ error: 'Handoff session expired (60 min max)' });
      }

      // EMS update rate: every 2 min minimum
      const lastUpdate = handoff.updates[handoff.updates.length - 1];
      if (lastUpdate) {
        const sinceLast = Date.now() - new Date(lastUpdate.timestamp).getTime();
        if (sinceLast < 30000) { // 30 sec floor for burst updates
          return res.status(429).json({ error: 'Update too frequent. Min 30 sec between updates.' });
        }
      }

      // Apply updates
      const now = new Date().toISOString();

      if (emsData?.vitals) {
        handoff.emsData!.vitals.push(...(Array.isArray(emsData.vitals) ? emsData.vitals : [emsData.vitals]));
        handoff.updates.push({ timestamp: now, type: 'vitals', data: emsData.vitals });
      }
      if (emsData?.treatments) {
        handoff.emsData!.treatments.push(...(Array.isArray(emsData.treatments) ? emsData.treatments : [emsData.treatments]));
        handoff.updates.push({ timestamp: now, type: 'treatment', data: emsData.treatments });
      }
      if (emsData?.ambientSummary) {
        handoff.emsData!.ambientSummary = emsData.ambientSummary;
        handoff.emsData!.lastSummaryUpdate = now;
        handoff.updates.push({ timestamp: now, type: 'summary', data: emsData.ambientSummary });
      }
      if (emsData?.eta) {
        handoff.emsData!.eta = emsData.eta;
        handoff.updates.push({ timestamp: now, type: 'eta', data: emsData.eta });
      }

      handoffStore.set(existingId, handoff);
      return res.status(200).json({ ok: true, handoff });
    }

    // New handoff
    if (!facilityId || !patient || !mode) {
      return res.status(400).json({ error: 'facilityId, patient, and mode are required' });
    }

    // Rate limit: patient self-refer — 1 per facility per 15 min
    if (mode === 'self-refer') {
      const key = `self-refer:${facilityId}:${patient.name}`;
      if (!checkRateLimit(key, 15 * 60000)) {
        return res.status(429).json({ error: 'Already sent to this facility. Wait 15 min before resending.' });
      }
    }

    const id = `handoff-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date();
    const expiry = new Date(now.getTime() + 60 * 60000); // 60 min

    const handoff: PatientHandoff = {
      handoffId: id,
      facilityId,
      facilityName: req.body.facilityName ?? facilityId,
      mode,
      status: 'active',
      createdAt: now.toISOString(),
      expiresAt: expiry.toISOString(),
      patient,
      compassSummary: mode === 'self-refer' ? compassSummary : undefined,
      emsData: mode === 'ems-stream' ? {
        unitId: emsData?.unitId ?? 'EMS-Unknown',
        eta: emsData?.eta ?? 'Unknown',
        vitals: emsData?.vitals ? [emsData.vitals] : [],
        treatments: emsData?.treatments ? [emsData.treatments] : [],
        ambientSummary: emsData?.ambientSummary ?? '',
        lastSummaryUpdate: now.toISOString(),
        mechanism: emsData?.mechanism,
        scene: emsData?.scene,
      } : undefined,
      updates: [{ timestamp: now.toISOString(), type: 'status', data: 'Handoff initiated' }],
    };

    handoffStore.set(id, handoff);

    return res.status(201).json({
      ok: true,
      handoffId: id,
      expiresAt: expiry.toISOString(),
      message: mode === 'self-refer'
        ? `Patient info sent to ${handoff.facilityName}. They will be prepared for your arrival.`
        : `EMS stream active. Update every 2 min. Session expires in 60 min.`,
    });
  }

  // ── GET: Facility retrieves handoff(s) ──
  if (req.method === 'GET') {
    const { facilityId, handoffId } = req.query;

    if (handoffId && typeof handoffId === 'string') {
      const h = handoffStore.get(handoffId);
      if (!h) return res.status(404).json({ error: 'Handoff not found' });
      return res.status(200).json(h);
    }

    if (facilityId && typeof facilityId === 'string') {
      const active = Array.from(handoffStore.values())
        .filter(h => h.facilityId === facilityId && h.status === 'active');
      return res.status(200).json({ handoffs: active });
    }

    // Demo: return all active
    const all = Array.from(handoffStore.values()).filter(h => h.status === 'active');
    return res.status(200).json({ handoffs: all });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
