// =============================================================================
// ATTENDING AI - Assessments API
// apps/provider-portal/pages/api/assessments/index.ts
//
// Returns assessment data from the database via Prisma
// Supports filtering by status, urgency, and date range
//
// UPDATED: Now fetches from real database instead of mock data
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/api/prisma';

// Type definitions
interface AssessmentResponse {
  id: string;
  sessionId: string;
  patientId: string;
  patientName: string;
  patientAge: number | null;
  patientDOB: string;
  patientMRN: string;
  patientGender: string | null;
  chiefComplaint: string;
  hpiOnset: string | null;
  hpiLocation: string | null;
  hpiDuration: string | null;
  hpiCharacter: string | null;
  hpiSeverity: number | null;
  hpiTiming: string | null;
  hpiAggravating: string[];
  hpiRelieving: string[];
  hpiAssociated: string[];
  medications: string[];
  allergies: string[];
  medicalHistory: string[];
  urgencyLevel: string;
  urgencyScore: number;
  redFlags: string[];
  status: string;
  assignedProviderId: string | null;
  assignedProviderName: string | null;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse {
  assessments: AssessmentResponse[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Helper to safely parse JSON strings
function safeParseJson<T>(value: string | null, defaultValue: T): T {
  if (!value) return defaultValue;
  try {
    return JSON.parse(value);
  } catch {
    return defaultValue;
  }
}

// Calculate age from date of birth
function calculateAge(dob: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      status, 
      urgency, 
      urgent,
      providerId,
      page = '1',
      pageSize = '50',
      sortBy = 'submittedAt',
      sortOrder = 'desc',
    } = req.query;

    // Build where clause
    const where: any = {};

    // Filter by status
    if (status && typeof status === 'string') {
      where.status = status.toUpperCase();
    } else if (urgent === 'true') {
      // Get pending/in-progress assessments only for urgent flag
      where.status = { in: ['PENDING', 'IN_PROGRESS'] };
    }

    // Filter by urgency level
    if (urgency && typeof urgency === 'string') {
      where.urgencyLevel = urgency.toUpperCase();
    } else if (urgent === 'true') {
      // High and emergency urgency only
      where.urgencyLevel = { in: ['HIGH', 'EMERGENCY'] };
    }

    // Filter by assigned provider
    if (providerId && typeof providerId === 'string') {
      where.assignedProviderId = providerId;
    }

    // Pagination
    const pageNum = parseInt(page as string, 10) || 1;
    const pageSizeNum = Math.min(parseInt(pageSize as string, 10) || 50, 100);
    const skip = (pageNum - 1) * pageSizeNum;

    // Sort order
    const orderBy: any = {};
    const sortField = (sortBy as string) || 'submittedAt';
    const order = (sortOrder as string) === 'asc' ? 'asc' : 'desc';
    
    // Priority sorting: urgent first, then by time
    if (urgent === 'true' || !sortBy) {
      orderBy.urgencyLevel = 'desc'; // EMERGENCY > HIGH > MODERATE > STANDARD
    }
    orderBy[sortField] = order;

    // Fetch assessments with patient data
    const [assessments, total] = await Promise.all([
      prisma.patientAssessment.findMany({
        where,
        include: {
          patient: true,
          assignedProvider: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [
          // Sort by urgency first (emergency on top)
          { urgencyLevel: 'desc' },
          // Then by submitted time
          { submittedAt: order as 'asc' | 'desc' },
        ],
        skip,
        take: pageSizeNum,
      }),
      prisma.patientAssessment.count({ where }),
    ]);

    // Transform to response format
    const formattedAssessments: AssessmentResponse[] = assessments.map((assessment) => ({
      id: assessment.id,
      sessionId: assessment.sessionId,
      patientId: assessment.patientId,
      patientName: assessment.patient 
        ? `${assessment.patient.firstName} ${assessment.patient.lastName}`
        : 'Unknown Patient',
      patientAge: assessment.patient?.dateOfBirth 
        ? calculateAge(assessment.patient.dateOfBirth) 
        : null,
      patientDOB: assessment.patient?.dateOfBirth 
        ? assessment.patient.dateOfBirth.toISOString().split('T')[0] 
        : '',
      patientMRN: assessment.patient?.mrn || '',
      patientGender: assessment.patient?.gender || null,
      chiefComplaint: assessment.chiefComplaint,
      hpiOnset: assessment.hpiOnset,
      hpiLocation: assessment.hpiLocation,
      hpiDuration: assessment.hpiDuration,
      hpiCharacter: assessment.hpiCharacter,
      hpiSeverity: assessment.hpiSeverity,
      hpiTiming: assessment.hpiTiming,
      hpiAggravating: safeParseJson<string[]>(assessment.hpiAggravating, []),
      hpiRelieving: safeParseJson<string[]>(assessment.hpiRelieving, []),
      hpiAssociated: safeParseJson<string[]>(assessment.hpiAssociated, []),
      medications: safeParseJson<string[]>(assessment.medications, []),
      allergies: safeParseJson<string[]>(assessment.allergies, []),
      medicalHistory: safeParseJson<string[]>(assessment.medicalHistory, []),
      urgencyLevel: assessment.urgencyLevel,
      urgencyScore: assessment.urgencyScore,
      redFlags: safeParseJson<string[]>(assessment.redFlags, []),
      status: assessment.status,
      assignedProviderId: assessment.assignedProviderId,
      assignedProviderName: assessment.assignedProvider?.name || null,
      submittedAt: assessment.submittedAt?.toISOString() || assessment.createdAt.toISOString(),
      createdAt: assessment.createdAt.toISOString(),
      updatedAt: assessment.updatedAt.toISOString(),
    }));

    return res.status(200).json({
      assessments: formattedAssessments,
      total,
      page: pageNum,
      pageSize: pageSizeNum,
      hasMore: skip + assessments.length < total,
    });
  } catch (error) {
    console.error('[ASSESSMENTS API ERROR]', error);
    return res.status(500).json({ 
      error: 'Failed to fetch assessments',
    });
  }
}
