/**
 * ATTENDING — Billing service barrel export.
 *
 * Consolidates all billing-related modules for clean imports:
 *   import { isFeatureEnabled, recordUsage, isStripeConfigured } from '../services/billing/index.js';
 */

export {
  PLAN_DEFINITIONS,
  AI_FEATURES,
  ROUTE_TO_FEATURE,
  ROUTE_TO_INTERACTION_TYPE,
  ESTIMATED_COST_CENTS,
  getPlanDefinition,
  isFeatureEnabled,
} from './plans.js';

export {
  recordUsage,
  getCurrentPeriodUsage,
  getUsageBreakdown,
  getUsageSummary,
  getUsageHistory,
  estimateEncounterSavings,
} from './usage.js';

export {
  createCustomer,
  updateCustomer,
  createSubscription,
  updateSubscription,
  cancelSubscription,
  reportUsage,
  constructWebhookEvent,
  WEBHOOK_HANDLERS,
  PRICE_IDS,
  isStripeConfigured,
} from './stripe-interface.js';
