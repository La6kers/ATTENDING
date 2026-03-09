// ============================================================
// ATTENDING AI - Clinical Image Analysis API
// apps/provider-portal/pages/api/clinical-images/analyze.ts
//
// Receives patient-submitted clinical photos (3-view set),
// runs AI vision analysis, stores results, and returns
// preliminary assessment to the patient + flags for provider.
//
// When connected to a real AI service:
// 1. Swap mock response with call to vision model (Claude, GPT-4V, etc.)
// 2. Store images in blob storage (Azure Blob / S3)
// 3. Create ClinicalImage records in database
// 4. Notify assigned provider via real-time channel
//
// POST /api/clinical-images/analyze
// Body: { patientId, bodyRegion, chiefComplaint, photos: [{ viewType, base64 }] }
// Returns: { success, data: AIAnalysisResult }
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface AnalyzeRequest {
  patientId: string;
  bodyRegion: string;
  chiefComplaint?: string;
  photos: {
    viewType: 'CLOSEUP' | 'BODY_PART' | 'WIDE_CONTEXT';
    base64: string;
  }[];
}

interface AIAnalysisResult {
  primaryAssessment: string;
  confidence: number;
  differential: string[];
  urgency: 'routine' | 'soon' | 'urgent';
  recommendations: string[];
  bodyRegion: string;
  imageSetId: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Authentication check
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  try {
    const body = req.body as AnalyzeRequest;

    // Validate required fields
    if (!body.patientId || !body.bodyRegion || !body.photos?.length) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: patientId, bodyRegion, photos',
      });
    }

    if (body.photos.length !== 3) {
      return res.status(400).json({
        success: false,
        error: 'Exactly 3 photos required (CLOSEUP, BODY_PART, WIDE_CONTEXT)',
      });
    }

    // ================================================================
    // TODO: Real implementation steps
    //
    // 1. Upload images to blob storage:
    //    const urls = await Promise.all(
    //      body.photos.map(p => blobStorage.upload(p.base64, p.viewType))
    //    );
    //
    // 2. Call AI vision model:
    //    const analysis = await aiService.analyzeImages({
    //      images: urls,
    //      bodyRegion: body.bodyRegion,
    //      chiefComplaint: body.chiefComplaint,
    //      prompt: DERM_ANALYSIS_PROMPT,
    //    });
    //
    // 3. Store in database:
    //    const imageSet = await prisma.clinicalImage.createMany({
    //      data: body.photos.map(p => ({
    //        patientId: body.patientId,
    //        imageType: 'SKIN_LESION',
    //        bodyRegion: body.bodyRegion,
    //        viewType: p.viewType,
    //        imageUrl: urls[i],
    //        aiAnalysis: JSON.stringify(analysis),
    //        imageSetId: imageSetId,
    //      })),
    //    });
    //
    // 4. Notify provider (real-time):
    //    await notifyProvider(body.patientId, imageSetId, analysis.urgency);
    // ================================================================

    // Generate a mock image set ID
    const imageSetId = `IMG-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Mock AI analysis response
    const result: AIAnalysisResult = {
      primaryAssessment: getMockAssessment(body.bodyRegion),
      confidence: 0.72 + Math.random() * 0.2,
      differential: getMockDifferential(body.bodyRegion),
      urgency: getMockUrgency(body.bodyRegion),
      recommendations: getMockRecommendations(body.bodyRegion),
      bodyRegion: body.bodyRegion,
      imageSetId,
    };

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Clinical image analysis error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to analyze clinical images',
    });
  }
}

// ============================================================
// Mock helpers — remove when real AI service is connected
// ============================================================

function getMockAssessment(region: string): string {
  const assessments: Record<string, string> = {
    FACE: 'Facial rash with malar distribution — evaluate for rosacea vs lupus',
    CHEST: 'Diffuse maculopapular rash — consider viral exanthem vs drug eruption',
    ARM_L: 'Linear erythematous lesion — pattern consistent with contact dermatitis',
    ARM_R: 'Linear erythematous lesion — pattern consistent with contact dermatitis',
    HAND_L: 'Vesicular eruption on palmar surface — consider dyshidrotic eczema',
    HAND_R: 'Vesicular eruption on palmar surface — consider dyshidrotic eczema',
  };
  return assessments[region] || 'Erythematous papular rash — recommend dermatology evaluation';
}

function getMockDifferential(region: string): string[] {
  return [
    'Contact dermatitis (72%)',
    'Eczema / atopic dermatitis (58%)',
    'Psoriasis (35%)',
    'Fungal infection (22%)',
  ];
}

function getMockUrgency(region: string): 'routine' | 'soon' | 'urgent' {
  if (region === 'FACE') return 'soon';
  return 'routine';
}

function getMockRecommendations(region: string): string[] {
  return [
    'Schedule dermatology evaluation within 2 weeks',
    'Avoid potential irritants and allergens',
    'OTC hydrocortisone 1% may provide symptomatic relief',
    'Photos forwarded to provider for clinical review',
  ];
}

// Increase body size limit for base64 images
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};
