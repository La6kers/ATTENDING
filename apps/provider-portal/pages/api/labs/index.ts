// =============================================================================
// Lab Orders API - List & Create
// apps/provider-portal/pages/api/labs/index.ts
//
// GET  — list lab orders with filtering
// POST — create lab order(s) for an encounter
//
// Phase 3: Uses actual LabOrder schema fields. Removed phantom
// @attending/clinical-services import (package doesn't exist).
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import type { Prisma } from '@prisma/client';
import { prisma } from '@attending/shared/lib/prisma';
import { requireAuth, createAuditLog, type AttendingSession } from '@/lib/api/auth';
import { proxyToBackend } from '@/lib/api/backendProxy';

// =============================================================================
// Handler
// =============================================================================

async function handler(req: NextApiRequest, res: NextApiResponse, session: AttendingSession) {
  // Attempt to proxy to .NET backend first (architectural target).
  // If the .NET API is running, it handles the request through CQRS/MediatR.
  // If unavailable, fall through to direct Prisma access below.
  const proxied = await proxyToBackend(req, res, '/api/v1/laborders');
  if (proxied) return;

  // Fallback: direct Prisma access (works without .NET backend running)
  switch (req.method) {
    case 'GET':
      return getLabOrders(req, res);
    case 'POST':
      return createLabOrder(req, res, session);
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}

// =============================================================================
// GET - List Lab Orders
// =============================================================================

async function getLabOrders(req: NextApiRequest, res: NextApiResponse) {
  try {
    const {
      patientId,
      encounterId,
      status,
      priority,
      limit = '50',
      offset = '0',
    } = req.query;

    const where: Prisma.LabOrderWhereInput = {};
    if (patientId) where.patientId = String(patientId);
    if (encounterId) where.encounterId = String(encounterId);
    if (status) where.status = String(status).toUpperCase();
    if (priority) where.priority = String(priority).toUpperCase();

    const [labOrders, total] = await Promise.all([
      prisma.labOrder.findMany({
        where,
        include: {
          patient: {
            select: { id: true, firstName: true, lastName: true, mrn: true },
          },
          provider: {
            select: { id: true, name: true },
          },
          encounter: {
            select: { id: true, encounterType: true, status: true },
          },
          results: true,
        },
        orderBy: [
          { orderedAt: 'desc' },
        ],
        take: Math.min(parseInt(String(limit)), 100),
        skip: parseInt(String(offset)),
      }),
      prisma.labOrder.count({ where }),
    ]);

    // Parse JSON test arrays for response
    const formatted = labOrders.map((order) => ({
      ...order,
      tests: safeJsonParse(order.tests, []),
      diagnosis: safeJsonParse(order.diagnosis, null),
    }));

    return res.status(200).json({
      labOrders: formatted,
      total,
      limit: parseInt(String(limit)),
      offset: parseInt(String(offset)),
    });
  } catch (error) {
    console.error('[Labs API] Error fetching lab orders:', error);
    return res.status(500).json({ error: 'Failed to fetch lab orders' });
  }
}

// =============================================================================
// POST - Create Lab Order
// =============================================================================

async function createLabOrder(req: NextApiRequest, res: NextApiResponse, session: AttendingSession) {
  try {
    const {
      patientId,
      encounterId,
      tests,
      indication,
      diagnosis,
      priority = 'ROUTINE',
      specialInstructions,
      specimenType,
      collectionDate,
      fasting = false,
    } = req.body;

    // Validate required fields
    if (!patientId) {
      return res.status(400).json({ error: 'Patient ID is required' });
    }
    if (!tests || !Array.isArray(tests) || tests.length === 0) {
      return res.status(400).json({ error: 'At least one test is required' });
    }

    // Verify patient exists
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Verify encounter if provided
    if (encounterId) {
      const encounter = await prisma.encounter.findUnique({ where: { id: encounterId } });
      if (!encounter) {
        return res.status(404).json({ error: 'Encounter not found' });
      }
    }

    // Generate unique order number
    const orderNumber = `LAB-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Create the lab order — tests stored as JSON in single row
    const labOrder = await prisma.labOrder.create({
      data: {
        orderNumber,
        patientId,
        providerId: session.user.id,
        encounterId: encounterId || null,
        status: 'PENDING',
        priority: priority.toUpperCase(),
        tests: JSON.stringify(tests),
        diagnosis: diagnosis ? JSON.stringify(diagnosis) : null,
        indication: indication || null,
        specialInstructions: specialInstructions || null,
        specimenType: specimenType || null,
        collectionDate: collectionDate ? new Date(collectionDate) : null,
        fasting: fasting || false,
      },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, mrn: true },
        },
        provider: {
          select: { id: true, name: true },
        },
      },
    });

    // Create notification for STAT orders
    if (priority.toUpperCase() === 'STAT') {
      await prisma.notification.create({
        data: {
          userId: session.user.id,
          type: 'ALERT',
          priority: 'HIGH',
          title: 'STAT Lab Order Created',
          message: `STAT lab order ${orderNumber} for ${patient.lastName}, ${patient.firstName} (MRN: ${patient.mrn})`,
          data: JSON.stringify({ labOrderId: labOrder.id, orderNumber }),
        },
      });
    }

    // Audit log
    await createAuditLog(
      session.user.id,
      'CREATE_LAB_ORDER',
      'LabOrder',
      labOrder.id,
      {
        orderNumber,
        patientId,
        tests: tests.map((t: { name?: string; code?: string }) => t.name || t.code),
        priority: priority.toUpperCase(),
      },
      req
    );

    return res.status(201).json({
      success: true,
      labOrder: {
        ...labOrder,
        tests: safeJsonParse(labOrder.tests, []),
      },
    });
  } catch (error) {
    console.error('[Labs API] Error creating lab order:', error);
    return res.status(500).json({ error: 'Failed to create lab order' });
  }
}

// =============================================================================
// Helpers
// =============================================================================

function safeJsonParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try { return JSON.parse(value); } catch { return fallback; }
}

export default requireAuth(handler);
