/**
 * ATTENDING — Plan definitions and feature registry.
 *
 * Single source of truth for what each tier includes.
 * The database plans table mirrors this, but runtime checks
 * use these constants so the app never needs a DB round-trip
 * just to evaluate a feature flag.
 */

// AI endpoint names as used in ai_interactions.interaction_type
export const AI_FEATURES = {
  INTAKE_FOLLOWUP:   'ai_intake_followup',
  INTAKE_SUMMARY:    'ai_intake_summary',
  ENCOUNTER_ASSIST:  'ai_encounter_assist',
  GENERATE_NOTE:     'ai_generate_note',
  QUALITY_REVIEW:    'ai_quality_review',
  EMS_TRANSCRIPT:    'ai_ems_transcript',
  EMS_HANDOFF:       'ai_ems_handoff',
};

// Map from AI route path to feature flag name
export const ROUTE_TO_FEATURE = {
  'intake-followup':  AI_FEATURES.INTAKE_FOLLOWUP,
  'intake-summary':   AI_FEATURES.INTAKE_SUMMARY,
  'encounter-assist': AI_FEATURES.ENCOUNTER_ASSIST,
  'generate-note':    AI_FEATURES.GENERATE_NOTE,
  'review':           AI_FEATURES.QUALITY_REVIEW,
  'ems-transcript':   AI_FEATURES.EMS_TRANSCRIPT,
  'ems-handoff':      AI_FEATURES.EMS_HANDOFF,
};

// Map from AI route path to interaction_type stored in usage_records
export const ROUTE_TO_INTERACTION_TYPE = {
  'intake-followup':  'intake_followup',
  'intake-summary':   'intake_summary',
  'encounter-assist': 'encounter_assist',
  'generate-note':    'generate_note',
  'review':           'quality_review',
  'ems-transcript':   'ems_transcript_summary',
  'ems-handoff':      'ems_handoff_brief',
};

// Estimated Claude API cost per endpoint (in cents) for margin tracking
export const ESTIMATED_COST_CENTS = {
  intake_followup:       1,   // ~$0.008
  intake_summary:        2,   // ~$0.016
  encounter_assist:      2,   // ~$0.023
  generate_note:         3,   // ~$0.029
  quality_review:        2,   // ~$0.020
  ems_transcript_summary: 2,  // ~$0.020
  ems_handoff_brief:     3,   // ~$0.030
};

export const PLAN_DEFINITIONS = {
  starter: {
    name: 'starter',
    displayName: 'Starter',
    priceCentsPerProvider: 0,
    maxProviders: 2,
    maxEncountersPerMonth: 50,
    maxAiInteractionsPerMonth: 0,   // no AI on free tier
    aiOverageCents: 0,
    features: {
      [AI_FEATURES.INTAKE_FOLLOWUP]:  false,
      [AI_FEATURES.INTAKE_SUMMARY]:   false,
      [AI_FEATURES.ENCOUNTER_ASSIST]: false,
      [AI_FEATURES.GENERATE_NOTE]:    false,
      [AI_FEATURES.QUALITY_REVIEW]:   false,
      basic_charting:      true,
      patient_management:  true,
      encounter_tracking:  true,
    },
  },

  professional: {
    name: 'professional',
    displayName: 'Professional',
    priceCentsPerProvider: 14900,    // $149/provider/month
    maxProviders: null,              // unlimited
    maxEncountersPerMonth: null,     // unlimited
    maxAiInteractionsPerMonth: 200,  // per provider
    aiOverageCents: 15,              // $0.15 per overage call
    features: {
      [AI_FEATURES.INTAKE_FOLLOWUP]:  true,
      [AI_FEATURES.INTAKE_SUMMARY]:   true,
      [AI_FEATURES.ENCOUNTER_ASSIST]: true,
      [AI_FEATURES.GENERATE_NOTE]:    true,
      [AI_FEATURES.QUALITY_REVIEW]:   true,
      [AI_FEATURES.EMS_TRANSCRIPT]:   true,
      [AI_FEATURES.EMS_HANDOFF]:      true,
      basic_charting:      true,
      patient_management:  true,
      encounter_tracking:  true,
      coding_suggestions:  true,
      quality_dashboard:   true,
      ems_module:          true,
    },
  },

  enterprise: {
    name: 'enterprise',
    displayName: 'Enterprise',
    priceCentsPerProvider: 0,        // custom pricing
    maxProviders: null,
    maxEncountersPerMonth: null,
    maxAiInteractionsPerMonth: null,  // unlimited
    aiOverageCents: 0,
    features: {
      [AI_FEATURES.INTAKE_FOLLOWUP]:  true,
      [AI_FEATURES.INTAKE_SUMMARY]:   true,
      [AI_FEATURES.ENCOUNTER_ASSIST]: true,
      [AI_FEATURES.GENERATE_NOTE]:    true,
      [AI_FEATURES.QUALITY_REVIEW]:   true,
      [AI_FEATURES.EMS_TRANSCRIPT]:   true,
      [AI_FEATURES.EMS_HANDOFF]:      true,
      basic_charting:       true,
      patient_management:   true,
      encounter_tracking:   true,
      coding_suggestions:   true,
      quality_dashboard:    true,
      ems_module:           true,
      custom_integrations:  true,
      hl7_fhir:            true,
      dedicated_support:    true,
      sla:                  true,
      audit_trail:          true,
    },
  },
};

/**
 * Look up a plan definition by name.
 * Returns the in-memory constant — no DB call.
 */
export function getPlanDefinition(planName) {
  return PLAN_DEFINITIONS[planName] || null;
}

/**
 * Check whether a specific feature is enabled for a plan.
 */
export function isFeatureEnabled(planName, featureKey) {
  const plan = PLAN_DEFINITIONS[planName];
  if (!plan) return false;
  return plan.features[featureKey] === true;
}
