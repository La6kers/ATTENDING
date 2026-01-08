// ============================================================
// ATTENDING AI - Order Select CDS Hook
// services/cds-hooks/src/hooks/order-select.ts
//
// Triggered when a provider selects lab or imaging orders
// Provides guidance based on COMPASS assessment and protocols
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import type {
  CDSRequest,
  CDSResponse,
  CDSCard,
  CDSSuggestion,
  CDSAction,
} from '../types';
import type { Bundle, ServiceRequest } from 'fhir/r4';

// ============================================================
// TYPES
// ============================================================

interface OrderSelectOptions {
  providerPortalUrl: string;
}

interface OrderGuidance {
  orderId: string;
  orderName: string;
  recommendation: 'appropriate' | 'consider-alternative' | 'potentially-unnecessary' | 'add-complementary';
  rationale: string;
  alternativeOrders?: string[];
  complementaryOrders?: string[];
  clinicalEvidence?: string;
}

// ============================================================
// CLINICAL PROTOCOLS
// ============================================================

const HEADACHE_PROTOCOL = {
  primaryOrders: ['CT Head', 'CBC', 'BMP', 'ESR', 'CRP'],
  redFlagOrders: ['CT Angiography Head/Neck', 'Lumbar Puncture', 'MRI Brain'],
  unnecessaryForMigraine: ['CT Head without red flags', 'EEG'],
};

const CHEST_PAIN_PROTOCOL = {
  primaryOrders: ['Troponin', 'ECG', 'BMP', 'CBC'],
  riskStratification: ['D-dimer', 'BNP'],
  imaging: ['Chest X-ray', 'CT Chest'],
};

const ABDOMINAL_PAIN_PROTOCOL = {
  primaryOrders: ['CBC', 'BMP', 'Lipase', 'LFTs', 'Urinalysis'],
  imaging: ['CT Abdomen/Pelvis', 'Ultrasound Abdomen'],
  ruleOut: ['Pregnancy Test', 'Stool Studies'],
};

// ============================================================
// MAIN HOOK HANDLER
// ============================================================

export async function orderSelectHook(
  request: CDSRequest,
  options: OrderSelectOptions
): Promise<CDSResponse> {
  const { context, prefetch } = request;
  const patientId = context.patientId;
  const draftOrders = context.draftOrders as Bundle | undefined;
  const selections = context.selections;
  const cards: CDSCard[] = [];

  if (!patientId || !draftOrders) {
    return { cards: [] };
  }

  // Get patient's pending assessment for context
  const assessment = await getPatientAssessment(patientId);

  // Extract selected orders from the bundle
  const selectedOrders = extractSelectedOrders(draftOrders, selections);

  if (selectedOrders.length === 0) {
    return { cards: [] };
  }

  // Analyze each order
  for (const order of selectedOrders) {
    const guidance = analyzeOrder(order, assessment);
    
    if (guidance.recommendation !== 'appropriate') {
      const card = createOrderGuidanceCard(guidance, order, options);
      cards.push(card);
    }
  }

  // Check for missing recommended orders based on assessment
  if (assessment) {
    const missingOrders = getMissingRecommendedOrders(selectedOrders, assessment);
    if (missingOrders.length > 0) {
      const suggestCard = createMissingOrdersCard(missingOrders, assessment, options);
      cards.push(suggestCard);
    }
  }

  return { cards };
}

// ============================================================
// ORDER ANALYSIS
// ============================================================

/**
 * Analyze an order against clinical protocols
 */
function analyzeOrder(
  order: ServiceRequest,
  assessment: any | null
): OrderGuidance {
  const orderName = order.code?.text || order.code?.coding?.[0]?.display || 'Unknown Order';
  const orderId = order.id || uuidv4();

  // Default to appropriate if no specific guidance
  let guidance: OrderGuidance = {
    orderId,
    orderName,
    recommendation: 'appropriate',
    rationale: 'Order appears clinically appropriate.',
  };

  if (!assessment) {
    return guidance;
  }

  const chiefComplaint = assessment.chiefComplaint?.toLowerCase() || '';
  const hasRedFlags = assessment.redFlags?.length > 0;

  // Headache-specific guidance
  if (chiefComplaint.includes('headache')) {
    if (orderName.toLowerCase().includes('ct head') && !hasRedFlags) {
      guidance = {
        orderId,
        orderName,
        recommendation: 'consider-alternative',
        rationale: 'CT Head may not be indicated for primary headache without red flags. Consider clinical evaluation first.',
        alternativeOrders: ['Clinical observation', 'Trial of abortive therapy'],
        clinicalEvidence: 'ACR Appropriateness Criteria: Imaging for uncomplicated headache has limited yield.',
      };
    }

    if (orderName.toLowerCase().includes('mri') && hasRedFlags) {
      guidance = {
        orderId,
        orderName,
        recommendation: 'add-complementary',
        rationale: 'MRI is appropriate. Consider adding CT Angiography for vascular evaluation given red flags.',
        complementaryOrders: ['CT Angiography Head/Neck'],
      };
    }
  }

  // Chest pain-specific guidance
  if (chiefComplaint.includes('chest pain')) {
    if (orderName.toLowerCase().includes('troponin')) {
      guidance = {
        orderId,
        orderName,
        recommendation: 'add-complementary',
        rationale: 'Troponin is appropriate. Ensure ECG is also ordered for complete ACS evaluation.',
        complementaryOrders: ['ECG', 'BMP'],
      };
    }

    if (orderName.toLowerCase().includes('d-dimer') && !assessment.riskFactors?.includes('PE risk factors')) {
      guidance = {
        orderId,
        orderName,
        recommendation: 'potentially-unnecessary',
        rationale: 'D-dimer may not be indicated without PE risk factors. Consider Wells criteria.',
        clinicalEvidence: 'PERC rule: If all criteria met, D-dimer testing may be unnecessary.',
      };
    }
  }

  // Abdominal pain-specific guidance
  if (chiefComplaint.includes('abdominal pain')) {
    if (orderName.toLowerCase().includes('ct') && !orderName.includes('contrast')) {
      guidance = {
        orderId,
        orderName,
        recommendation: 'consider-alternative',
        rationale: 'Consider CT with IV contrast for better soft tissue evaluation if renal function allows.',
        alternativeOrders: ['CT Abdomen/Pelvis with IV contrast'],
      };
    }
  }

  return guidance;
}

/**
 * Find recommended orders that haven't been selected
 */
function getMissingRecommendedOrders(
  selectedOrders: ServiceRequest[],
  assessment: any
): string[] {
  const selectedNames = selectedOrders.map(o => 
    (o.code?.text || o.code?.coding?.[0]?.display || '').toLowerCase()
  );

  const chiefComplaint = assessment.chiefComplaint?.toLowerCase() || '';
  const hasRedFlags = assessment.redFlags?.length > 0;
  let recommendedOrders: string[] = [];

  if (chiefComplaint.includes('headache')) {
    recommendedOrders = hasRedFlags 
      ? HEADACHE_PROTOCOL.redFlagOrders 
      : HEADACHE_PROTOCOL.primaryOrders;
  } else if (chiefComplaint.includes('chest pain')) {
    recommendedOrders = CHEST_PAIN_PROTOCOL.primaryOrders;
  } else if (chiefComplaint.includes('abdominal pain')) {
    recommendedOrders = ABDOMINAL_PAIN_PROTOCOL.primaryOrders;
  }

  return recommendedOrders.filter(order => 
    !selectedNames.some(selected => selected.includes(order.toLowerCase()))
  );
}

// ============================================================
// CARD CREATORS
// ============================================================

/**
 * Create card for order guidance
 */
function createOrderGuidanceCard(
  guidance: OrderGuidance,
  order: ServiceRequest,
  options: OrderSelectOptions
): CDSCard {
  const indicatorMap = {
    'appropriate': 'info' as const,
    'consider-alternative': 'warning' as const,
    'potentially-unnecessary': 'warning' as const,
    'add-complementary': 'info' as const,
  };

  const titleMap = {
    'appropriate': '✓ Order Appropriate',
    'consider-alternative': '⚠️ Consider Alternative',
    'potentially-unnecessary': '⚠️ Review Order Necessity',
    'add-complementary': '💡 Complementary Orders Suggested',
  };

  let detail = `**Order:** ${guidance.orderName}\n\n${guidance.rationale}`;

  if (guidance.alternativeOrders?.length) {
    detail += `\n\n**Alternative Options:**\n${guidance.alternativeOrders.map(o => `• ${o}`).join('\n')}`;
  }

  if (guidance.complementaryOrders?.length) {
    detail += `\n\n**Consider Adding:**\n${guidance.complementaryOrders.map(o => `• ${o}`).join('\n')}`;
  }

  if (guidance.clinicalEvidence) {
    detail += `\n\n*Evidence: ${guidance.clinicalEvidence}*`;
  }

  const suggestions: CDSSuggestion[] = [];

  if (guidance.alternativeOrders?.length) {
    suggestions.push({
      uuid: uuidv4(),
      label: `Replace with ${guidance.alternativeOrders[0]}`,
      actions: [{
        type: 'delete',
        description: `Remove ${guidance.orderName}`,
        resourceId: order.id,
      }],
    });
  }

  if (guidance.complementaryOrders?.length) {
    suggestions.push({
      uuid: uuidv4(),
      label: `Add ${guidance.complementaryOrders.join(', ')}`,
      isRecommended: true,
      actions: [],
    });
  }

  return {
    uuid: uuidv4(),
    summary: `${titleMap[guidance.recommendation]}: ${guidance.orderName}`,
    detail,
    indicator: indicatorMap[guidance.recommendation],
    source: {
      label: 'ATTENDING AI Order Guidance',
      url: options.providerPortalUrl,
    },
    suggestions: suggestions.length > 0 ? suggestions : undefined,
    overrideReasons: [
      { code: 'clinical-judgment', display: 'Clinical judgment - order appropriate' },
      { code: 'patient-specific', display: 'Patient-specific factors require this order' },
      { code: 'follow-up', display: 'Follow-up on previous findings' },
    ],
  };
}

/**
 * Create card suggesting missing orders
 */
function createMissingOrdersCard(
  missingOrders: string[],
  assessment: any,
  options: OrderSelectOptions
): CDSCard {
  return {
    uuid: uuidv4(),
    summary: `💡 Consider Additional Orders for ${assessment.chiefComplaint}`,
    detail: `Based on the COMPASS assessment and clinical protocols, the following orders may be appropriate:

${missingOrders.map(o => `• ${o}`).join('\n')}

*These suggestions are based on the patient's chief complaint and identified risk factors.*`,
    indicator: 'info',
    source: {
      label: 'ATTENDING AI Clinical Protocols',
      url: options.providerPortalUrl,
    },
    suggestions: missingOrders.slice(0, 3).map(order => ({
      uuid: uuidv4(),
      label: `Add ${order}`,
      actions: [],
    })),
  };
}

// ============================================================
// HELPERS
// ============================================================

/**
 * Extract selected orders from draft orders bundle
 */
function extractSelectedOrders(
  bundle: Bundle,
  selections?: string[]
): ServiceRequest[] {
  if (!bundle.entry) return [];

  return bundle.entry
    .filter(entry => entry.resource?.resourceType === 'ServiceRequest')
    .map(entry => entry.resource as ServiceRequest)
    .filter(order => !selections || selections.includes(order.id || ''));
}

/**
 * Fetch patient's assessment
 */
async function getPatientAssessment(patientId: string): Promise<any | null> {
  try {
    const apiUrl = process.env.ATTENDING_API_URL || 'http://localhost:3000';
    const response = await fetch(
      `${apiUrl}/api/assessments?patientId=${patientId}&status=pending&limit=1`
    );

    if (!response.ok) return null;

    const data = await response.json();
    return data.assessments?.[0] || null;
  } catch {
    return null;
  }
}
