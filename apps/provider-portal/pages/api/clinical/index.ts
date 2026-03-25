// =============================================================================
// ATTENDING AI - Clinical API Index
// apps/provider-portal/pages/api/clinical/index.ts
//
// Documentation endpoint for all clinical API endpoints.
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';

interface ApiDocumentation {
  name: string;
  version: string;
  description: string;
  baseUrl: string;
  endpoints: EndpointDoc[];
  authentication: {
    type: string;
    description: string;
  };
  rateLimit: {
    requests: number;
    window: string;
  };
}

interface EndpointDoc {
  path: string;
  method: string;
  description: string;
  requiresAuth: boolean;
  requiredPermissions?: string[];
  requestBody?: {
    contentType: string;
    required: string[];
    optional?: string[];
  };
  responses: {
    code: number;
    description: string;
  }[];
}

const API_DOCUMENTATION: ApiDocumentation = {
  name: 'ATTENDING AI Clinical API',
  version: '1.0.0',
  description: 'Clinical decision support API for healthcare providers',
  baseUrl: '/api/clinical',
  authentication: {
    type: 'Bearer Token (Azure AD B2C)',
    description: 'Include Authorization header with Bearer token for authenticated endpoints',
  },
  rateLimit: {
    requests: 100,
    window: '1 minute',
  },
  endpoints: [
    {
      path: '/triage',
      method: 'POST',
      description: 'Classify patient triage level using ESI (Emergency Severity Index) 1-5',
      requiresAuth: true,
      requiredPermissions: ['view_assessments'],
      requestBody: {
        contentType: 'application/json',
        required: ['chiefComplaint'],
        optional: ['vitalSigns', 'patientAge', 'symptoms', 'redFlags', 'mentalStatus'],
      },
      responses: [
        { code: 200, description: 'Successful triage classification' },
        { code: 400, description: 'Invalid request body' },
        { code: 401, description: 'Authentication required' },
        { code: 500, description: 'Internal server error' },
      ],
    },
    {
      path: '/labs',
      method: 'POST',
      description: 'Get AI-powered lab recommendations based on clinical presentation',
      requiresAuth: true,
      requiredPermissions: ['order_labs'],
      requestBody: {
        contentType: 'application/json',
        required: ['chiefComplaint'],
        optional: [
          'workingDiagnosis',
          'symptoms',
          'redFlags',
          'vitalSigns',
          'existingConditions',
          'currentMedications',
          'recentLabs',
          'patientAge',
          'patientSex',
          'pregnancyStatus',
        ],
      },
      responses: [
        { code: 200, description: 'Lab recommendations with priorities and rationale' },
        { code: 400, description: 'Invalid request body' },
        { code: 401, description: 'Authentication required' },
        { code: 403, description: 'Insufficient permissions' },
        { code: 500, description: 'Internal server error' },
      ],
    },
    {
      path: '/red-flags',
      method: 'POST',
      description: 'CRITICAL: Evaluate symptoms for emergency red flags requiring immediate action',
      requiresAuth: false, // Available for patient portal emergency detection
      requestBody: {
        contentType: 'application/json',
        required: ['symptoms'],
        optional: [
          'chiefComplaint',
          'vitalSigns',
          'patientAge',
          'medicalHistory',
          'mentalStatus',
          'onsetDuration',
          'progression',
        ],
      },
      responses: [
        { code: 200, description: 'Red flag evaluation with immediate actions' },
        { code: 400, description: 'Invalid request body' },
        { code: 500, description: 'Internal server error - manual review required' },
      ],
    },
    {
      path: '/protocols',
      method: 'GET | POST',
      description: 'Retrieve evidence-based clinical protocols for specific conditions',
      requiresAuth: true,
      requiredPermissions: ['view_assessments'],
      requestBody: {
        contentType: 'application/json',
        required: ['condition'],
        optional: ['severity', 'setting', 'patientAge', 'comorbidities'],
      },
      responses: [
        { code: 200, description: 'Clinical protocol with time-sensitive actions' },
        { code: 400, description: 'Invalid request body' },
        { code: 404, description: 'Protocol not found for condition' },
        { code: 500, description: 'Internal server error' },
      ],
    },
    {
      path: '/drug-check',
      method: 'POST',
      description: 'Check drug-drug interactions and allergy cross-reactivity',
      requiresAuth: true,
      requiredPermissions: ['order_medications'],
      requestBody: {
        contentType: 'application/json',
        required: ['proposedMedication', 'currentMedications', 'allergies'],
        optional: ['patientAge', 'renalFunction', 'hepaticFunction', 'pregnancyStatus'],
      },
      responses: [
        { code: 200, description: 'Drug safety check results with risk level' },
        { code: 400, description: 'Invalid request body' },
        { code: 401, description: 'Authentication required' },
        { code: 403, description: 'Insufficient permissions' },
        { code: 500, description: 'Internal server error - pharmacist review recommended' },
      ],
    },
  ],
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiDocumentation>
) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  return res.status(200).json(API_DOCUMENTATION);
}
