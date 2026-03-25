// ============================================================
// ATTENDING AI - CDS Hooks Server
// services/cds-hooks/src/index.ts
//
// Clinical Decision Support Hooks Server
// Integrates with Epic, Oracle Health, and other EHRs
// ============================================================

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

import type {
  CDSServicesResponse,
  CDSService,
  CDSRequest,
  CDSResponse,
  CDSCard,
  CDSFeedback,
} from './types';

import { patientViewHook } from './hooks/patient-view';
import { orderSelectHook } from './hooks/order-select';
import { encounterStartHook } from './hooks/encounter-start';

// ============================================================
// CONFIGURATION
// ============================================================

const PORT = process.env.CDS_HOOKS_PORT || 3010;
const CORS_ORIGINS = process.env.CDS_CORS_ORIGINS?.split(',') || ['*'];
const PROVIDER_PORTAL_URL = process.env.PROVIDER_PORTAL_URL || 'http://localhost:3000';

// ============================================================
// EXPRESS APP SETUP
// ============================================================

const app: Express = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allow inline scripts for EHR embedding
}));

// CORS for EHR integrations
app.use(cors({
  origin: CORS_ORIGINS,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[CDS] ${req.method} ${req.path}`, {
    hook: req.body?.hook,
    patient: req.body?.context?.patientId,
  });
  next();
});

// ============================================================
// CDS SERVICES DEFINITION
// ============================================================

const CDS_SERVICES: CDSService[] = [
  {
    id: 'attending-patient-view',
    hook: 'patient-view',
    title: 'ATTENDING AI Pre-Visit Assessment',
    description: 'Displays COMPASS pre-visit assessment data when viewing a patient chart. Shows urgency level, red flags, differential diagnoses, and recommended workup.',
    prefetch: {
      patient: 'Patient/{{context.patientId}}',
      conditions: 'Condition?patient={{context.patientId}}&clinical-status=active',
      medications: 'MedicationRequest?patient={{context.patientId}}&status=active',
      allergies: 'AllergyIntolerance?patient={{context.patientId}}',
    },
  },
  {
    id: 'attending-order-select',
    hook: 'order-select',
    title: 'ATTENDING AI Order Guidance',
    description: 'Provides clinical decision support when selecting laboratory or imaging orders. Suggests appropriate tests based on COMPASS assessment and clinical protocols.',
    prefetch: {
      patient: 'Patient/{{context.patientId}}',
      conditions: 'Condition?patient={{context.patientId}}&clinical-status=active',
    },
  },
  {
    id: 'attending-encounter-start',
    hook: 'encounter-start',
    title: 'ATTENDING AI Encounter Alerts',
    description: 'Alerts providers to urgent findings and pending assessments at the start of an encounter. Highlights red flags and recommended immediate actions.',
    prefetch: {
      patient: 'Patient/{{context.patientId}}',
      encounter: 'Encounter/{{context.encounterId}}',
    },
  },
];

// ============================================================
// ROUTES
// ============================================================

/**
 * CDS Services Discovery Endpoint
 * GET /cds-services
 */
app.get('/cds-services', (req: Request, res: Response) => {
  const response: CDSServicesResponse = {
    services: CDS_SERVICES,
  };
  res.json(response);
});

/**
 * Patient View Hook
 * POST /cds-services/attending-patient-view
 */
app.post('/cds-services/attending-patient-view', async (req: Request, res: Response) => {
  try {
    const request: CDSRequest = req.body;
    const response = await patientViewHook(request, { providerPortalUrl: PROVIDER_PORTAL_URL });
    res.json(response);
  } catch (error) {
    console.error('[CDS] patient-view error:', error);
    res.json(createErrorResponse('Failed to process patient view hook'));
  }
});

/**
 * Order Select Hook
 * POST /cds-services/attending-order-select
 */
app.post('/cds-services/attending-order-select', async (req: Request, res: Response) => {
  try {
    const request: CDSRequest = req.body;
    const response = await orderSelectHook(request, { providerPortalUrl: PROVIDER_PORTAL_URL });
    res.json(response);
  } catch (error) {
    console.error('[CDS] order-select error:', error);
    res.json(createErrorResponse('Failed to process order select hook'));
  }
});

/**
 * Encounter Start Hook
 * POST /cds-services/attending-encounter-start
 */
app.post('/cds-services/attending-encounter-start', async (req: Request, res: Response) => {
  try {
    const request: CDSRequest = req.body;
    const response = await encounterStartHook(request, { providerPortalUrl: PROVIDER_PORTAL_URL });
    res.json(response);
  } catch (error) {
    console.error('[CDS] encounter-start error:', error);
    res.json(createErrorResponse('Failed to process encounter start hook'));
  }
});

/**
 * Feedback Endpoint
 * POST /cds-services/:serviceId/feedback
 */
app.post('/cds-services/:serviceId/feedback', async (req: Request, res: Response) => {
  try {
    const { serviceId } = req.params;
    const feedback: CDSFeedback = req.body;
    
    console.log(`[CDS] Feedback received for ${serviceId}:`, {
      card: feedback.card,
      outcome: feedback.outcome,
      overrideReason: feedback.overrideReason?.display,
    });

    // Store feedback for analytics (implement as needed)
    // await storeFeedback(serviceId, feedback);

    res.status(200).send();
  } catch (error) {
    console.error('[CDS] Feedback error:', error);
    res.status(500).json({ error: 'Failed to process feedback' });
  }
});

/**
 * Health Check
 * GET /health
 */
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'attending-cds-hooks',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    services: CDS_SERVICES.map(s => s.id),
  });
});

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Create an error response card
 */
function createErrorResponse(message: string): CDSResponse {
  return {
    cards: [{
      uuid: uuidv4(),
      summary: 'ATTENDING AI Service Error',
      detail: message,
      indicator: 'warning',
      source: {
        label: 'ATTENDING AI',
        url: PROVIDER_PORTAL_URL,
      },
    }],
  };
}

// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║     🏥 ATTENDING AI CDS Hooks Server                          ║
║                                                               ║
║     Port: ${PORT}                                                ║
║     Discovery: http://localhost:${PORT}/cds-services             ║
║     Health:    http://localhost:${PORT}/health                   ║
║                                                               ║
║     Registered Services:                                      ║
║     • attending-patient-view                                  ║
║     • attending-order-select                                  ║
║     • attending-encounter-start                               ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

export { app };
