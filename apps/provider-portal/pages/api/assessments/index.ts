// =============================================================================
// ATTENDING AI - Assessments API (Provider Portal)
// apps/provider-portal/pages/api/assessments/index.ts
//
// Returns patient assessments from database.
// Supports filtering by status, triage level, and provider assignment.
//
// Phase 3: Reads actual PatientAssessment schema fields.
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@attending/shared/lib/prisma';
import { requireAuth } from '@/lib/api/auth';
import { proxyToBackend } from '@/lib/api/backendProxy';

// =============================================================================
// Types
// =============================================================================

interface AssessmentListItem {
  id: string;
  sessionId: string;
  patientId: string;
  patientName: string;
  patientMRN: string;
  patientDOB: string | null;
  patientGender: string | null;
  chiefComplaint: string | null;
  hpiNarrative: string | null;
  symptoms: string[];
  medications: string[];
  allergies: string[];
  medicalHistory: string[];
  triageLevel: string | null;
  // NOTE: COMPASS submit stores redFlags as string[] (symptom names).
  // The .NET backend may store structured objects in the future.
  // Consumers should handle both shapes.
  redFlags: string[];
  status: string;
  phase: string;
  assignedProviderId: string | null;
  assignedProviderName: string | null;
  completedAt: string | null;
  createdAt: string;
}

// =============================================================================
// Helpers
// =============================================================================

function safeJsonParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function calculateAge(dob: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

// =============================================================================
// Handler
// =============================================================================

async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Attempt .NET backend first (CQRS pipeline with tenant isolation)
  const proxied = await proxyToBackend(req, res, '/api/v1/assessments');
  if (proxied) return;

  // Fallback: direct Prisma access

  try {
    const {
      status,
      triageLevel,
      unassigned,
      providerId,
      page = '1',
      pageSize = '50',
    } = req.query;

    // Build filter
    const where: Record<string, unknown> = {};

    if (status && typeof status === 'string') {
      where.status = status.toUpperCase();
    }

    if (triageLevel && typeof triageLevel === 'string') {
      where.triageLevel = triageLevel.toUpperCase();
    }

    if (unassigned === 'true') {
      where.assignedProviderId = null;
      // Only show completed (submitted) assessments waiting for review
      if (!status) {
        where.status = 'COMPLETED';
      }
    }

    if (providerId && typeof providerId === 'string') {
      where.assignedProviderId = providerId;
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const pageSizeNum = Math.min(parseInt(pageSize as string, 10) || 50, 100);
    const skip = (pageNum - 1) * pageSizeNum;

    // Query
    const [assessments, total] = await Promise.all([
      prisma.patientAssessment.findMany({
        where,
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              mrn: true,
              dateOfBirth: true,
              gender: true,
            },
          },
          assignedProvider: {
            select: { id: true, name: true },
          },
        },
        orderBy: [
          { completedAt: 'desc' },
        ],
        skip,
        take: pageSizeNum,
      }),
      prisma.patientAssessment.count({ where }),
    ]);

    // Transform
    const items: AssessmentListItem[] = assessments.map((a) => ({
      id: a.id,
      sessionId: a.sessionId,
      patientId: a.patientId,
      patientName: a.patient
        ? `${a.patient.firstName} ${a.patient.lastName}`
        : 'Unknown Patient',
      patientMRN: a.patient?.mrn || '',
      patientDOB: a.patient?.dateOfBirth
        ? a.patient.dateOfBirth.toISOString().split('T')[0]
        : null,
      patientGender: a.patient?.gender || null,
      chiefComplaint: a.chiefComplaint,
      hpiNarrative: a.hpiNarrative,
      symptoms: safeJsonParse<string[]>(a.symptoms, []),
      medications: safeJsonParse<string[]>(a.medications, []),
      allergies: safeJsonParse<string[]>(a.allergies, []),
      medicalHistory: safeJsonParse<string[]>(a.medicalHistory, []),
      triageLevel: a.triageLevel,
      redFlags: safeJsonParse<string[]>(a.redFlagsDetected, []),
      status: a.status,
      phase: a.phase,
      assignedProviderId: a.assignedProviderId,
      assignedProviderName: a.assignedProvider?.name || null,
      completedAt: a.completedAt?.toISOString() || null,
      createdAt: a.createdAt.toISOString(),
    }));

    return res.status(200).json({
      assessments: items,
      total,
      page: pageNum,
      pageSize: pageSizeNum,
      hasMore: skip + assessments.length < total,
    });
  } catch (error) {
    console.error('[ASSESSMENTS API ERROR]', error);
    return res.status(500).json({ error: 'Failed to fetch assessments' });
  }
}

export default requireAuth(handler);
