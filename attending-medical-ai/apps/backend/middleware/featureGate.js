/**
 * ATTENDING — Feature gating middleware.
 *
 * Enforces subscription-based access control on AI endpoints.
 * Checks three things in order:
 *   1. Does the org's plan include this AI feature?
 *   2. Is the subscription in a valid state (trialing or active)?
 *   3. Has the org exceeded its AI interaction limit for this period?
 *
 * In demo mode (ATTENDING_DEMO=true or no subscription found),
 * all features are unlocked to avoid blocking seed demos.
 */

import db from '../db/database.js';
import { ROUTE_TO_FEATURE, PLAN_DEFINITIONS } from '../services/billing/plans.js';
import { getCurrentPeriodUsage } from '../services/billing/usage.js';

const DEMO_MODE = process.env.ATTENDING_DEMO === 'true' ||
                  process.env.NODE_ENV !== 'production';

/**
 * Express middleware factory. Returns a middleware that gates
 * AI endpoints based on the requesting org's subscription.
 *
 * Usage in routes:
 *   router.post('/review', featureGate('review'), async (req, res) => { ... });
 *
 * The middleware attaches billing context to req.billing so downstream
 * handlers can record usage without re-querying.
 *
 * @param {string} routeKey - The AI route key (e.g. 'review', 'generate-note')
 */
export function featureGate(routeKey) {
  const featureFlag = ROUTE_TO_FEATURE[routeKey];

  return (req, res, next) => {
    // In demo/dev mode, attach default billing context and proceed
    if (DEMO_MODE) {
      req.billing = _demoBillingContext();
      return next();
    }

    // Production: resolve org from request
    // In a real system this comes from auth middleware (JWT, session, API key).
    // For now we accept an X-Organization-Id header or default to org 1.
    const orgId = parseInt(req.headers['x-organization-id'] || '1');

    // Fetch active subscription
    const subscription = db.queryOne(
      `SELECT s.*, p.name as plan_name, p.max_ai_interactions_per_month, p.features
       FROM subscriptions s
       JOIN plans p ON s.plan_id = p.id
       WHERE s.organization_id = ?
         AND s.status IN ('trialing', 'active')
       ORDER BY s.created_at DESC
       LIMIT 1`,
      [orgId]
    );

    if (!subscription) {
      return res.status(403).json({
        error: 'No active subscription',
        code: 'NO_SUBSCRIPTION',
        upgrade_url: '/plans',
      });
    }

    // Check feature access
    const planDef = PLAN_DEFINITIONS[subscription.plan_name];
    if (featureFlag && planDef && !planDef.features[featureFlag]) {
      return res.status(403).json({
        error: `Feature "${featureFlag}" is not available on the ${planDef.displayName} plan`,
        code: 'FEATURE_NOT_AVAILABLE',
        current_plan: subscription.plan_name,
        upgrade_url: '/plans',
      });
    }

    // Check usage limits
    const maxInteractions = subscription.max_ai_interactions_per_month;
    if (maxInteractions !== null && maxInteractions !== undefined) {
      const providerLimit = maxInteractions * (subscription.provider_count || 1);
      const usage = getCurrentPeriodUsage(
        orgId,
        subscription.current_period_start,
        subscription.current_period_end
      );

      if (usage.interactionCount >= providerLimit) {
        // Check if plan allows overage
        if (planDef && planDef.aiOverageCents > 0) {
          // Allow but flag as overage
          req.billing = {
            organizationId: orgId,
            subscriptionId: subscription.id,
            planName: subscription.plan_name,
            periodStart: subscription.current_period_start,
            periodEnd: subscription.current_period_end,
            providerCount: subscription.provider_count,
            isOverage: true,
            overageCents: planDef.aiOverageCents,
            currentUsage: usage.interactionCount,
            limit: providerLimit,
          };
          return next();
        }

        return res.status(429).json({
          error: 'AI interaction limit reached for this billing period',
          code: 'USAGE_LIMIT_REACHED',
          current_usage: usage.interactionCount,
          limit: providerLimit,
          period_end: subscription.current_period_end,
          upgrade_url: '/plans',
        });
      }
    }

    // Attach billing context for downstream usage recording
    req.billing = {
      organizationId: orgId,
      subscriptionId: subscription.id,
      planName: subscription.plan_name,
      periodStart: subscription.current_period_start,
      periodEnd: subscription.current_period_end,
      providerCount: subscription.provider_count,
      isOverage: false,
      overageCents: 0,
      currentUsage: null,  // lazy-loaded if needed
      limit: maxInteractions ? maxInteractions * (subscription.provider_count || 1) : null,
    };

    next();
  };
}

/**
 * Default billing context for demo mode.
 * Unlocks all features, tracks to demo org.
 */
function _demoBillingContext() {
  // Compute current month boundaries
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

  return {
    organizationId: 1,
    subscriptionId: 1,
    planName: 'professional',
    periodStart,
    periodEnd,
    providerCount: 3,
    isOverage: false,
    overageCents: 0,
    currentUsage: null,
    limit: null,  // unlimited in demo
  };
}

export default featureGate;
