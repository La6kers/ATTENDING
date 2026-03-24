// ============================================================
// ATTENDING AI - Inbound HL7v2 Receiver
// apps/provider-portal/pages/api/integrations/hl7v2.ts
//
// Receives HL7v2 messages from external systems (EHR, LIS, RIS).
// Authenticated via API key (X-API-Key header).
//
// Supported inbound message types:
//   ADT^A01/A04/A08/A28 → Patient create/update
//   ORU^R01             → Lab results ingest
//   ORM^O01             → Order acknowledgement
//
// POST /api/integrations/hl7v2
//   Content-Type: x-application/hl7-v2+er7  (or text/plain)
//   X-API-Key: atnd_xxxxx
//   Body: MSH|^~\&|...\r...
//
// Returns: HL7v2 ACK message
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import {
  HL7v2Parser,
  hl7PatientToAttending,
  hl7ObservationsToLabResults,
} from '@attending/shared/lib/integrations/hl7v2';
import { events } from '@attending/shared/lib/integrations/events';
import { validateApiKey } from '@attending/shared/lib/auth/apiKeys';
import { auditLog, AuditActions } from '@attending/shared/lib/audit';
import { logger } from '@attending/shared/lib/logging';

// Use dynamic import for prisma to avoid build issues
async function getPrisma() {
  const { prisma } = await import('@attending/shared/lib/prisma');
  return prisma;
}

export const config = {
  api: {
    bodyParser: {
      // HL7v2 messages are plain text, not JSON
      sizeLimit: '1mb',
    },
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const prisma = await getPrisma();

  // ---- API Key Authentication ----
  const apiKey = await validateApiKey(req, prisma, 'hl7');
  if (!apiKey) {
    return res.status(401).json({ error: 'Invalid or missing API key' });
  }

  // ---- Parse raw body ----
  let rawBody: string;
  if (typeof req.body === 'string') {
    rawBody = req.body;
  } else if (Buffer.isBuffer(req.body)) {
    rawBody = req.body.toString('utf-8');
  } else {
    // JSON-wrapped body: { message: "MSH|..." }
    rawBody = req.body?.message || '';
  }

  if (!rawBody || !HL7v2Parser.isValid(rawBody)) {
    return res.status(400).json({ error: 'Invalid HL7v2 message format' });
  }

  // ---- Parse HL7v2 ----
  const msg = HL7v2Parser.parse(rawBody);
  const messageType = msg.getMessageType();
  const controlId = msg.getControlId();
  const sendingFacility = msg.getSendingFacility();

  logger.info('[HL7v2] Received message', {
    messageType,
    controlId,
    sendingFacility,
    orgId: apiKey.organizationId,
  });

  try {
    // ---- Route by message type ----
    switch (messageType) {
      case 'ADT^A01':
      case 'ADT^A04':
      case 'ADT^A08':
      case 'ADT^A28': {
        await handleADT(msg, apiKey, prisma);
        break;
      }

      case 'ORU^R01': {
        await handleORU(msg, apiKey, prisma);
        break;
      }

      default: {
        logger.warn('[HL7v2] Unsupported message type', { messageType, controlId });
        const nack = HL7v2Parser.createACK(msg, 'AR', `Unsupported message type: ${messageType}`);
        res.setHeader('Content-Type', 'x-application/hl7-v2+er7');
        return res.status(200).send(nack);
      }
    }

    // ---- Send ACK ----
    const ack = HL7v2Parser.createACK(msg, 'AA');
    res.setHeader('Content-Type', 'x-application/hl7-v2+er7');
    return res.status(200).send(ack);

  } catch (error) {
    logger.error('[HL7v2] Processing error', error instanceof Error ? error : new Error(String(error)), {
      messageType,
      controlId,
    });

    const nack = HL7v2Parser.createACK(msg, 'AE', 'Internal processing error');
    res.setHeader('Content-Type', 'x-application/hl7-v2+er7');
    return res.status(200).send(nack);
  }
}

// ============================================================
// MESSAGE HANDLERS
// ============================================================

async function handleADT(msg: any, apiKey: any, prisma: any) {
  const hl7Patient = msg.getPatient();
  if (!hl7Patient) throw new Error('No PID segment in ADT message');

  const patientData = hl7PatientToAttending(hl7Patient);
  const messageType = msg.getMessageType();

  // Upsert patient by MRN
  const existing = await prisma.patient.findUnique({
    where: { mrn: patientData.mrn as string },
  });

  if (existing) {
    await prisma.patient.update({
      where: { mrn: patientData.mrn as string },
      data: {
        ...patientData,
        mrn: undefined, // Don't update MRN
      },
    });

    await events.emit('patient.updated', {
      patientId: existing.id,
      source: 'HL7v2',
      messageType,
    }, { organizationId: apiKey.organizationId });
  } else {
    const created = await prisma.patient.create({
      data: patientData,
    });

    await events.emit('patient.created', {
      patientId: created.id,
      source: 'HL7v2',
      messageType,
    }, { organizationId: apiKey.organizationId });
  }

  await auditLog({
    action: existing ? AuditActions.PATIENT_UPDATE : AuditActions.PATIENT_CREATE,
    userId: `integration:${apiKey.name}`,
    resourceType: 'Patient',
    resourceId: patientData.mrn as string,
    details: { source: 'HL7v2', messageType, sendingFacility: msg.getSendingFacility() },
  });
}

async function handleORU(msg: any, apiKey: any, prisma: any) {
  const hl7Patient = msg.getPatient();
  const observations = msg.getObservations();

  if (!hl7Patient || observations.length === 0) {
    throw new Error('ORU message missing PID or OBX segments');
  }

  // Find patient by MRN
  const patient = await prisma.patient.findUnique({
    where: { mrn: hl7Patient.mrn || hl7Patient.id },
  });

  if (!patient) {
    throw new Error(`Patient not found: MRN ${hl7Patient.mrn || hl7Patient.id}`);
  }

  // Convert and insert lab results
  const labResults = hl7ObservationsToLabResults(observations, patient.id);

  for (const result of labResults) {
    await prisma.labResult.create({ data: { ...result, organizationId: apiKey.organizationId } });

    // Check for critical values
    if (result.interpretation === 'CRITICAL_HIGH' || result.interpretation === 'CRITICAL_LOW') {
      await events.emit('lab.result.critical', {
        patientId: patient.id,
        testCode: result.testCode,
        testName: result.testName,
        value: result.value,
        interpretation: result.interpretation,
        source: 'HL7v2',
      }, { organizationId: apiKey.organizationId });
    }
  }

  await events.emit('lab.result.created', {
    patientId: patient.id,
    resultCount: labResults.length,
    source: 'HL7v2',
  }, { organizationId: apiKey.organizationId });

  await auditLog({
    action: AuditActions.LAB_RESULT_RECEIVED,
    userId: `integration:${apiKey.name}`,
    resourceType: 'LabOrder',
    patientId: patient.id,
    details: { source: 'HL7v2', resultCount: labResults.length },
  });
}
