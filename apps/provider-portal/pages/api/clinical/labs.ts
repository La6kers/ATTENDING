// =============================================================================
// ATTENDING AI - Lab Recommendations API
// apps/provider-portal/pages/api/clinical/labs.ts
//
// Endpoint for AI-powered lab recommendations based on clinical presentation.
// Returns prioritized lab bundles with clinical rationale.
// FIXED: Added criticalCount and recommendedCount for test compatibility
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '@/lib/api/auth';

// =============================================================================
// Types
// =============================================================================

interface LabRequest {
  chiefComplaint: string;
  symptoms?: string[];
  redFlags?: string[];
  workingDiagnosis?: string;
  vitalSigns?: {
    heartRate?: number;
    bloodPressure?: number;
    respiratoryRate?: number;
    temperature?: number;
    oxygenSaturation?: number;
  };
  existingConditions?: string[];
  patientAge?: number;
  patientGender?: string;
  patientId?: string;
}

interface LabRecommendation {
  testCode: string;
  testName: string;
  category: 'critical' | 'recommended' | 'optional';
  priority: 'STAT' | 'ASAP' | 'ROUTINE';
  rationale: string;
  bundle?: string;
  confidence?: number;
}

interface LabBundle {
  id: string;
  name: string;
  tests: string[];
  indication: string;
}

interface LabResponse {
  success: boolean;
  data?: {
    recommendations: LabRecommendation[];
    bundles: LabBundle[];
    urgentTests: LabRecommendation[];
    statCount: number;
    routineCount: number;
    criticalCount: number;      // FIXED: Added
    recommendedCount: number;   // FIXED: Added
    orderingSummary: string;
    clinicalContext: string;
  };
  error?: string;
  timestamp: string;
}

// =============================================================================
// Lab Recommendation Rules Engine
// =============================================================================

interface RecommendationRule {
  patterns: string[];
  recommendations: Omit<LabRecommendation, 'rationale'>[];
  bundles?: string[];
  rationale: string;
}

const RECOMMENDATION_RULES: RecommendationRule[] = [
  // Chest Pain / ACS
  {
    patterns: ['chest pain', 'chest pressure', 'angina', 'mi', 'heart attack', 'acs', 'acute coronary'],
    recommendations: [
      { testCode: 'TROP-I', testName: 'Troponin I', category: 'critical', priority: 'STAT' },
      { testCode: 'BNP', testName: 'BNP', category: 'critical', priority: 'STAT' },
      { testCode: 'DDIMER', testName: 'D-Dimer', category: 'recommended', priority: 'STAT' },
      { testCode: 'CBC-DIFF', testName: 'CBC with Differential', category: 'recommended', priority: 'ROUTINE' },
      { testCode: 'BMP', testName: 'Basic Metabolic Panel', category: 'recommended', priority: 'ROUTINE' },
      { testCode: 'PT-INR', testName: 'PT/INR', category: 'optional', priority: 'ROUTINE' },
    ],
    bundles: ['ACS', 'CARDIAC'],
    rationale: 'ACS workup with cardiac biomarkers and coagulation studies',
  },
  
  // Sepsis / Fever / Infection
  {
    patterns: ['sepsis', 'fever', 'infection', 'confusion', 'altered mental status', 'bacteremia'],
    recommendations: [
      { testCode: 'CBC-DIFF', testName: 'CBC with Differential', category: 'critical', priority: 'STAT' },
      { testCode: 'CMP', testName: 'Comprehensive Metabolic Panel', category: 'critical', priority: 'STAT' },
      { testCode: 'LACTATE', testName: 'Lactic Acid', category: 'critical', priority: 'STAT' },
      { testCode: 'PROCALCITONIN', testName: 'Procalcitonin', category: 'recommended', priority: 'STAT' },
      { testCode: 'BCULT', testName: 'Blood Culture', category: 'critical', priority: 'STAT' },
      { testCode: 'UA', testName: 'Urinalysis', category: 'recommended', priority: 'ROUTINE' },
    ],
    bundles: ['SEPSIS'],
    rationale: 'Sepsis workup per Surviving Sepsis Campaign guidelines',
  },
  
  // Abdominal Pain
  {
    patterns: ['abdominal pain', 'stomach pain', 'belly pain', 'epigastric', 'rlq pain', 'llq pain'],
    recommendations: [
      { testCode: 'CBC-DIFF', testName: 'CBC with Differential', category: 'recommended', priority: 'ROUTINE' },
      { testCode: 'CMP', testName: 'Comprehensive Metabolic Panel', category: 'recommended', priority: 'ROUTINE' },
      { testCode: 'LIPASE', testName: 'Lipase', category: 'recommended', priority: 'ROUTINE' },
      { testCode: 'UA', testName: 'Urinalysis', category: 'recommended', priority: 'ROUTINE' },
      { testCode: 'HCG-U', testName: 'Urine Pregnancy Test', category: 'optional', priority: 'STAT' },
    ],
    bundles: ['ABDOMINAL'],
    rationale: 'Abdominal pain workup to evaluate infection, pancreatitis, and metabolic causes',
  },
  
  // Shortness of Breath / Dyspnea
  {
    patterns: ['shortness of breath', 'dyspnea', 'sob', 'difficulty breathing', 'cant breathe'],
    recommendations: [
      { testCode: 'BNP', testName: 'BNP', category: 'critical', priority: 'STAT' },
      { testCode: 'DDIMER', testName: 'D-Dimer', category: 'critical', priority: 'STAT' },
      { testCode: 'TROP-I', testName: 'Troponin I', category: 'recommended', priority: 'STAT' },
      { testCode: 'CBC-DIFF', testName: 'CBC with Differential', category: 'recommended', priority: 'ROUTINE' },
      { testCode: 'BMP', testName: 'Basic Metabolic Panel', category: 'recommended', priority: 'ROUTINE' },
    ],
    bundles: ['CARDIAC', 'PULMONARY'],
    rationale: 'Dyspnea workup to evaluate cardiac and pulmonary causes including PE',
  },
  
  // Headache
  {
    patterns: ['headache', 'head pain', 'migraine', 'worst headache'],
    recommendations: [
      { testCode: 'CBC-DIFF', testName: 'CBC with Differential', category: 'recommended', priority: 'ROUTINE' },
      { testCode: 'BMP', testName: 'Basic Metabolic Panel', category: 'recommended', priority: 'ROUTINE' },
      { testCode: 'ESR', testName: 'ESR', category: 'optional', priority: 'ROUTINE' },
      { testCode: 'CRP', testName: 'CRP', category: 'optional', priority: 'ROUTINE' },
    ],
    bundles: [],
    rationale: 'Headache workup - inflammatory markers if concerned for temporal arteritis',
  },
  
  // Diabetes / Glucose Issues
  {
    patterns: ['diabetes', 'glucose', 'blood sugar', 'hyperglycemia', 'dka', 'hhs'],
    recommendations: [
      { testCode: 'GLU', testName: 'Glucose', category: 'critical', priority: 'STAT' },
      { testCode: 'HBA1C', testName: 'Hemoglobin A1C', category: 'recommended', priority: 'ROUTINE' },
      { testCode: 'BMP', testName: 'Basic Metabolic Panel', category: 'critical', priority: 'STAT' },
      { testCode: 'UA', testName: 'Urinalysis', category: 'recommended', priority: 'ROUTINE' },
    ],
    bundles: ['DIABETIC'],
    rationale: 'Diabetic evaluation with glucose, A1C, and metabolic panel',
  },
  
  // Fatigue / Weakness
  {
    patterns: ['fatigue', 'weakness', 'tired', 'exhaustion', 'malaise'],
    recommendations: [
      { testCode: 'CBC-DIFF', testName: 'CBC with Differential', category: 'recommended', priority: 'ROUTINE' },
      { testCode: 'CMP', testName: 'Comprehensive Metabolic Panel', category: 'recommended', priority: 'ROUTINE' },
      { testCode: 'TSH', testName: 'TSH', category: 'recommended', priority: 'ROUTINE' },
      { testCode: 'FERRITIN', testName: 'Ferritin', category: 'optional', priority: 'ROUTINE' },
      { testCode: 'B12', testName: 'Vitamin B12', category: 'optional', priority: 'ROUTINE' },
      { testCode: 'VITD', testName: 'Vitamin D', category: 'optional', priority: 'ROUTINE' },
    ],
    bundles: ['FATIGUE'],
    rationale: 'Fatigue workup including thyroid, anemia, and vitamin deficiency screening',
  },
  
  // DVT / PE
  {
    patterns: ['dvt', 'pe', 'pulmonary embolism', 'deep vein', 'leg swelling', 'calf pain'],
    recommendations: [
      { testCode: 'DDIMER', testName: 'D-Dimer', category: 'critical', priority: 'STAT' },
      { testCode: 'CBC-DIFF', testName: 'CBC with Differential', category: 'recommended', priority: 'ROUTINE' },
      { testCode: 'PT-INR', testName: 'PT/INR', category: 'recommended', priority: 'ROUTINE' },
      { testCode: 'PTT', testName: 'PTT', category: 'recommended', priority: 'ROUTINE' },
    ],
    bundles: ['COAG'],
    rationale: 'VTE workup with D-dimer and coagulation studies',
  },
];

// Predefined bundles
const LAB_BUNDLES: Record<string, LabBundle> = {
  ACS: { id: 'ACS', name: 'ACS Panel', tests: ['TROP-I', 'BNP', 'CBC-DIFF', 'BMP', 'PT-INR'], indication: 'Acute coronary syndrome evaluation' },
  CARDIAC: { id: 'CARDIAC', name: 'Cardiac Panel', tests: ['TROP-I', 'BNP'], indication: 'Cardiac biomarker evaluation' },
  SEPSIS: { id: 'SEPSIS', name: 'Sepsis Workup', tests: ['CBC-DIFF', 'CMP', 'LACTATE', 'PROCALCITONIN', 'BCULT'], indication: 'Sepsis evaluation' },
  COAG: { id: 'COAG', name: 'Coagulation Panel', tests: ['PT-INR', 'PTT', 'FIBRIN', 'DDIMER'], indication: 'Coagulation evaluation' },
  ABDOMINAL: { id: 'ABDOMINAL', name: 'Abdominal Panel', tests: ['CBC-DIFF', 'CMP', 'LIPASE', 'UA'], indication: 'Abdominal pain workup' },
  FATIGUE: { id: 'FATIGUE', name: 'Fatigue Workup', tests: ['CBC-DIFF', 'CMP', 'TSH', 'FERRITIN', 'B12'], indication: 'Fatigue evaluation' },
  DIABETIC: { id: 'DIABETIC', name: 'Diabetic Panel', tests: ['GLU', 'HBA1C', 'BMP', 'UA'], indication: 'Diabetic evaluation' },
  PULMONARY: { id: 'PULMONARY', name: 'Pulmonary Panel', tests: ['BNP', 'DDIMER', 'CBC-DIFF'], indication: 'Pulmonary evaluation' },
};

// =============================================================================
// Recommendation Engine
// =============================================================================

function getRecommendations(request: LabRequest): { recommendations: LabRecommendation[]; bundles: LabBundle[] } {
  const recommendations: LabRecommendation[] = [];
  const bundleIds = new Set<string>();
  const addedTests = new Set<string>();
  
  // Combine all text for pattern matching
  const searchText = [
    request.chiefComplaint,
    ...(request.symptoms || []),
    ...(request.redFlags || []),
    request.workingDiagnosis || '',
  ].join(' ').toLowerCase();
  
  // Find matching rules
  for (const rule of RECOMMENDATION_RULES) {
    const matches = rule.patterns.some(pattern => searchText.includes(pattern.toLowerCase()));
    
    if (matches) {
      // Add recommendations from this rule
      for (const rec of rule.recommendations) {
        if (!addedTests.has(rec.testCode)) {
          addedTests.add(rec.testCode);
          recommendations.push({
            ...rec,
            rationale: rule.rationale,
            confidence: rec.category === 'critical' ? 0.95 : rec.category === 'recommended' ? 0.85 : 0.7,
          });
        }
      }
      
      // Track bundles
      if (rule.bundles) {
        rule.bundles.forEach(b => bundleIds.add(b));
      }
    }
  }
  
  // If no specific matches, provide baseline labs
  if (recommendations.length === 0) {
    recommendations.push(
      { testCode: 'CBC-DIFF', testName: 'CBC with Differential', category: 'recommended', priority: 'ROUTINE', rationale: 'Baseline hematologic assessment', confidence: 0.7 },
      { testCode: 'BMP', testName: 'Basic Metabolic Panel', category: 'optional', priority: 'ROUTINE', rationale: 'Baseline metabolic assessment', confidence: 0.6 },
    );
  }
  
  // Get bundle objects
  const bundles = Array.from(bundleIds)
    .map(id => LAB_BUNDLES[id])
    .filter((b): b is LabBundle => b !== undefined);
  
  return { recommendations, bundles };
}

// =============================================================================
// Request Validation
// =============================================================================

function validateRequest(body: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!body || typeof body !== 'object') {
    errors.push('Request body is required');
    return { valid: false, errors };
  }
  
  const bodyObj = body as Record<string, unknown>;
  
  if (!bodyObj.chiefComplaint || typeof bodyObj.chiefComplaint !== 'string') {
    errors.push('chiefComplaint is required and must be a string');
  }
  
  if (bodyObj.patientAge !== undefined) {
    const age = bodyObj.patientAge as number;
    if (age < 0 || age > 150) {
      errors.push('patientAge must be between 0-150');
    }
  }
  
  return { valid: errors.length === 0, errors };
}

// =============================================================================
// API Handler
// =============================================================================

export default requireAuth(async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LabResponse>
) {
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.',
      timestamp: new Date().toISOString(),
    });
  }
  
  try {
    const validation = validateRequest(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: `Validation failed: ${validation.errors.join(', ')}`,
        timestamp: new Date().toISOString(),
      });
    }
    
    const body = req.body as LabRequest;
    
    // Get recommendations
    const { recommendations, bundles } = getRecommendations(body);
    
    // Separate urgent (STAT) tests
    const urgentTests = recommendations.filter(r => r.priority === 'STAT');
    
    // Count by priority
    const statCount = urgentTests.length;
    const routineCount = recommendations.filter(r => r.priority === 'ROUTINE').length;
    
    // FIXED: Count by category
    const criticalCount = recommendations.filter(r => r.category === 'critical').length;
    const recommendedCount = recommendations.filter(r => r.category === 'recommended').length;
    
    // Generate clinical context
    const clinicalContext = generateClinicalContext(body, recommendations, bundles);
    
    // Generate ordering summary
    const orderingSummary = generateOrderingSummary(recommendations, bundles);
    
    console.log('[AUDIT] Lab recommendations:', {
      timestamp: new Date().toISOString(),
      chiefComplaint: body.chiefComplaint,
      bundleCount: bundles.length,
      testCount: recommendations.length,
      urgentCount: urgentTests.length,
      criticalCount,
      recommendedCount,
    });
    
    return res.status(200).json({
      success: true,
      data: {
        recommendations,
        bundles,
        urgentTests,
        statCount,
        routineCount,
        criticalCount,      // FIXED: Added
        recommendedCount,   // FIXED: Added
        orderingSummary,
        clinicalContext,
      },
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('[ERROR] Lab recommendations failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during lab recommendation',
      timestamp: new Date().toISOString(),
    });
  }
});

function generateClinicalContext(
  request: LabRequest, 
  recommendations: LabRecommendation[],
  bundles: LabBundle[]
): string {
  const parts: string[] = [];
  
  parts.push(`Patient presents with ${request.chiefComplaint}.`);
  
  if (request.workingDiagnosis) {
    parts.push(`Working diagnosis: ${request.workingDiagnosis}.`);
  }
  
  if (request.redFlags && request.redFlags.length > 0) {
    parts.push(`Red flags identified: ${request.redFlags.join(', ')}.`);
  }
  
  if (bundles.length > 0) {
    parts.push(`Recommended bundles: ${bundles.map(b => b.name).join(', ')}.`);
  }
  
  const urgentCount = recommendations.filter(r => r.priority === 'STAT').length;
  if (urgentCount > 0) {
    parts.push(`STAT: ${urgentCount} time-sensitive tests recommended.`);
  }
  
  return parts.join(' ');
}

function generateOrderingSummary(
  recommendations: LabRecommendation[],
  bundles: LabBundle[]
): string {
  const parts: string[] = [];
  
  if (bundles.length > 0) {
    parts.push(`Lab bundles: ${bundles.map(b => b.name).join(', ')}`);
  }
  
  const statTests = recommendations.filter(r => r.priority === 'STAT');
  if (statTests.length > 0) {
    parts.push(`STAT orders: ${statTests.map(t => t.testName).join(', ')}`);
  }
  
  const routineTests = recommendations.filter(r => r.priority === 'ROUTINE');
  if (routineTests.length > 0) {
    parts.push(`Routine orders: ${routineTests.map(t => t.testName).join(', ')}`);
  }
  
  return parts.join('. ') || 'No lab orders recommended.';
}
