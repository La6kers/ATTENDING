// =============================================================================
// ATTENDING AI - Send Orders to EHR Endpoint
// apps/provider-portal/pages/api/fhir/orders/send.ts
//
// Sends clinical orders from ATTENDING to connected EHR
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { prisma } from '@/lib/prisma';
import { createFhirOrderService } from '@/shared/services/fhir-sync/FhirOrderService';
import type { EhrVendor } from '@/shared/lib/fhir/types';

type OrderType = 'lab' | 'imaging' | 'referral' | 'prescription';

interface SendOrderRequest {
  orderType: OrderType;
  orderId: string;  // Local ATTENDING order ID
  vendor?: EhrVendor;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = session.user.id;
  const { orderType, orderId, vendor = 'epic' } = req.body as SendOrderRequest;

  if (!orderType || !orderId) {
    return res.status(400).json({ error: 'Missing orderType or orderId' });
  }

  try {
    // Get FHIR connection
    const connection = await prisma.fhirConnection.findUnique({
      where: {
        userId_vendor: { userId, vendor },
      },
    });

    if (!connection) {
      return res.status(404).json({ error: 'No FHIR connection found' });
    }

    if (new Date() >= connection.tokenExpiresAt) {
      return res.status(401).json({ error: 'Token expired' });
    }

    // Get the local order
    const localOrder = await getLocalOrder(orderType, orderId);
    if (!localOrder) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Create order service
    const orderService = createFhirOrderService({
      vendor: connection.vendor as EhrVendor,
      baseUrl: connection.baseUrl,
      accessToken: connection.accessToken,
      refreshToken: connection.refreshToken || undefined,
      tokenExpiresAt: connection.tokenExpiresAt,
      patientId: connection.patientId!,
      encounterId: connection.encounterId || undefined,
      practitionerId: session.user.providerId,
    });

    // Send order based on type
    let result;
    switch (orderType) {
      case 'lab':
        result = await orderService.createLabOrder({
          testCode: localOrder.testCode,
          testName: localOrder.testName,
          priority: localOrder.priority?.toLowerCase() as any || 'routine',
          clinicalIndication: localOrder.diagnosis,
          notes: localOrder.notes,
          fasting: localOrder.fasting,
        });
        break;

      case 'imaging':
        result = await orderService.createImagingOrder({
          studyCode: localOrder.studyCode,
          studyName: localOrder.studyName,
          modality: localOrder.modality,
          priority: localOrder.priority?.toLowerCase() as any || 'routine',
          clinicalIndication: localOrder.indication || localOrder.diagnosis,
          bodyRegion: localOrder.bodyRegion,
          contrast: localOrder.withContrast,
          notes: localOrder.notes,
        });
        break;

      case 'referral':
        result = await orderService.createReferral({
          specialty: localOrder.specialty,
          specialtyCode: localOrder.specialtyCode,
          reason: localOrder.reason || localOrder.diagnosis,
          urgency: localOrder.urgency?.toLowerCase() as any || 'routine',
          preferredProvider: localOrder.preferredProvider,
          notes: localOrder.notes,
        });
        break;

      case 'prescription':
        result = await orderService.createPrescription({
          medicationCode: localOrder.medicationCode || localOrder.rxnorm,
          medicationName: localOrder.medicationName,
          dosage: localOrder.dosage,
          frequency: localOrder.frequency,
          route: localOrder.route || 'oral',
          duration: localOrder.duration,
          quantity: localOrder.quantity || 30,
          refills: localOrder.refills || 0,
          indication: localOrder.indication,
          instructions: localOrder.instructions,
          dispenseAsWritten: localOrder.dispenseAsWritten,
        });
        break;

      default:
        return res.status(400).json({ error: `Unknown order type: ${orderType}` });
    }

    // Update local order with FHIR ID
    if (result.success && result.fhirId) {
      await updateLocalOrderWithFhirId(orderType, orderId, result.fhirId, result.orderNumber);
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'FHIR_ORDER_SENT',
        resourceType: orderType,
        resourceId: orderId,
        details: JSON.stringify({
          vendor,
          fhirId: result.fhirId,
          status: result.status,
          error: result.error,
        }),
      },
    });

    return res.status(200).json(result);

  } catch (error: any) {
    console.error('[FHIR Orders] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

async function getLocalOrder(orderType: OrderType, orderId: string): Promise<any> {
  switch (orderType) {
    case 'lab':
      return prisma.labOrder.findUnique({ where: { id: orderId } });
    case 'imaging':
      return prisma.imagingOrder.findUnique({ where: { id: orderId } });
    case 'referral':
      return prisma.referral.findUnique({ where: { id: orderId } });
    case 'prescription':
      return prisma.medicationOrder.findUnique({ where: { id: orderId } });
    default:
      return null;
  }
}

async function updateLocalOrderWithFhirId(
  orderType: OrderType, 
  orderId: string, 
  fhirId: string,
  orderNumber?: string
): Promise<void> {
  const updateData = { 
    fhirId, 
    ehrOrderNumber: orderNumber,
    sentToEhrAt: new Date(),
  };

  switch (orderType) {
    case 'lab':
      await prisma.labOrder.update({ where: { id: orderId }, data: updateData });
      break;
    case 'imaging':
      await prisma.imagingOrder.update({ where: { id: orderId }, data: updateData });
      break;
    case 'referral':
      await prisma.referral.update({ where: { id: orderId }, data: updateData });
      break;
    case 'prescription':
      await prisma.medicationOrder.update({ where: { id: orderId }, data: updateData });
      break;
  }
}
