// =============================================================================
// Lab Order Detail API: /api/labs/[id]
// apps/provider-portal/pages/api/labs/[id].ts
//
// GET — single lab order with results
// PATCH — update status, add results
// DELETE — cancel order (soft)
//
// Phase 3: Uses actual LabOrder/LabResult schema fields only.
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@attending/shared/lib/prisma';
import { requireAuth, createAuditLog } from '@/lib/api/auth';
import { proxyToBackend } from '@/lib/api/backendProxy';

// =============================================================================
// Helpers
// =============================================================================

function safeJsonParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try { return JSON.parse(value); } catch { return fallback; }
}

// =============================================================================
// Handler
// =============================================================================

async function handler(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Lab order ID is required' });
  }

  // Try .NET backend first
  const proxied = await proxyToBackend(req, res, `/api/v1/laborders/${id}`);
  if (proxied) return;

  // Fallback: direct Prisma

  switch (req.method) {
    case 'GET': return getLabOrder(id, res);
    case 'PATCH': return updateLabOrder(id, req, res, session);
    case 'DELETE': return cancelLabOrder(id, res, session, req);
    default:
      res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
      return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}

// =============================================================================
// GET
// =============================================================================

async function getLabOrder(id: string, res: NextApiResponse) {
  try {
    const labOrder = await prisma.labOrder.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            mrn: true,
            dateOfBirth: true,
          },
        },
        provider: {
          select: { id: true, name: true, specialty: true },
        },
        results: {
          orderBy: { reportedAt: 'desc' },
        },
      },
    });

    if (!labOrder) {
      return res.status(404).json({ error: 'Lab order not found' });
    }

    return res.status(200).json({
      ...labOrder,
      tests: safeJsonParse(labOrder.tests, []),
      diagnosis: safeJsonParse(labOrder.diagnosis, null),
    });
  } catch (error) {
    console.error('[Labs API] Error fetching lab order:', error);
    return res.status(500).json({ error: 'Failed to fetch lab order' });
  }
}

// =============================================================================
// PATCH — update status or add results
// =============================================================================

async function updateLabOrder(
  id: string,
  req: NextApiRequest,
  res: NextApiResponse,
  session: any
) {
  try {
    const existing = await prisma.labOrder.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Lab order not found' });
    }

    const { status, priority, specialInstructions, results } = req.body;

    // Update the order itself
    const updateData: any = {};
    if (status) updateData.status = status.toUpperCase();
    if (priority) updateData.priority = priority.toUpperCase();
    if (specialInstructions) updateData.specialInstructions = specialInstructions;
    if (status === 'COMPLETED') updateData.completedAt = new Date();

    const labOrder = await prisma.labOrder.update({
      where: { id },
      data: updateData,
      include: {
        patient: { select: { firstName: true, lastName: true, mrn: true } },
        results: true,
      },
    });

    // Add results if provided
    if (results && Array.isArray(results)) {
      for (const r of results) {
        await prisma.labResult.create({
          data: {
            patientId: existing.patientId,
            organizationId: existing.organizationId,
            labOrderId: id,
            testCode: r.testCode || r.code || '',
            testName: r.testName || r.name || '',
            loincCode: r.loincCode || null,
            value: String(r.value),
            unit: r.unit || null,
            referenceRange: r.referenceRange || null,
            interpretation: r.interpretation || null,
            status: r.status || 'FINAL',
            performedAt: r.performedAt ? new Date(r.performedAt) : null,
          },
        });
      }

      // Create notification for critical results
      const criticalResults = results.filter(
        (r: any) => r.interpretation === 'CRITICAL' || r.isCritical
      );
      if (criticalResults.length > 0) {
        await prisma.notification.create({
          data: {
            userId: existing.providerId,
            type: 'CRITICAL_VALUE',
            title: 'Critical Lab Value',
            message: `Critical result on order ${existing.orderNumber} for ${labOrder.patient.lastName}, ${labOrder.patient.firstName}`,
            priority: 'HIGH',
            data: JSON.stringify({ labOrderId: id, orderNumber: existing.orderNumber }),
          },
        });
      }
    }

    await createAuditLog(session.user.id, 'UPDATE_LAB_ORDER', 'LabOrder', id, JSON.stringify(req.body), req);

    return res.status(200).json({
      success: true,
      labOrder: {
        ...labOrder,
        tests: safeJsonParse(labOrder.tests, []),
      },
    });
  } catch (error) {
    console.error('[Labs API] Error updating lab order:', error);
    return res.status(500).json({ error: 'Failed to update lab order' });
  }
}

// =============================================================================
// DELETE — cancel (soft)
// =============================================================================

async function cancelLabOrder(
  id: string,
  res: NextApiResponse,
  session: any,
  req: NextApiRequest
) {
  try {
    const existing = await prisma.labOrder.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Lab order not found' });
    }

    await prisma.labOrder.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        deletedAt: new Date(),
        deletedBy: session.user.id,
      },
    });

    await createAuditLog(session.user.id, 'CANCEL_LAB_ORDER', 'LabOrder', id, null, req);

    return res.status(200).json({ success: true, message: 'Lab order cancelled' });
  } catch (error) {
    console.error('[Labs API] Error cancelling lab order:', error);
    return res.status(500).json({ error: 'Failed to cancel lab order' });
  }
}

export default requireAuth(handler);
