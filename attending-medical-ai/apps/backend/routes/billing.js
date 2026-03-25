/**
 * ATTENDING — Billing API routes.
 *
 * Provides endpoints for:
 *   - Plan listing and comparison
 *   - Subscription management (CRUD)
 *   - Usage queries and dashboard data
 *   - Billing events / audit log
 *   - Demo: AI savings calculator
 */

import { Router } from 'express';
import db from '../db/database.js';
import { PLAN_DEFINITIONS, ESTIMATED_COST_CENTS } from '../services/billing/plans.js';
import {
  getCurrentPeriodUsage,
  getUsageBreakdown,
  getUsageSummary,
  getUsageHistory,
  estimateEncounterSavings,
} from '../services/billing/usage.js';
import {
  createCustomer,
  createSubscription,
  cancelSubscription,
  isStripeConfigured,
} from '../services/billing/stripe-interface.js';

const router = Router();

// ================================================================
// PLANS
// ================================================================

/**
 * GET /api/billing/plans
 *
 * Returns all available plans with feature breakdowns.
 * Used by the plan comparison page.
 */
router.get('/plans', (req, res) => {
  const plans = Object.values(PLAN_DEFINITIONS).map(plan => ({
    name: plan.name,
    displayName: plan.displayName,
    pricePerProvider: plan.priceCentsPerProvider / 100,  // dollars
    pricePerProviderCents: plan.priceCentsPerProvider,
    maxProviders: plan.maxProviders,
    maxEncountersPerMonth: plan.maxEncountersPerMonth,
    maxAiInteractionsPerMonth: plan.maxAiInteractionsPerMonth,
    aiOverageRate: plan.aiOverageCents / 100,  // dollars
    features: plan.features,
  }));

  res.json({ plans, stripeConfigured: isStripeConfigured() });
});

/**
 * GET /api/billing/plans/:name
 *
 * Returns a single plan's details.
 */
router.get('/plans/:name', (req, res) => {
  const plan = PLAN_DEFINITIONS[req.params.name];
  if (!plan) return res.status(404).json({ error: 'Plan not found' });

  res.json({
    name: plan.name,
    displayName: plan.displayName,
    pricePerProvider: plan.priceCentsPerProvider / 100,
    maxProviders: plan.maxProviders,
    maxEncountersPerMonth: plan.maxEncountersPerMonth,
    maxAiInteractionsPerMonth: plan.maxAiInteractionsPerMonth,
    aiOverageRate: plan.aiOverageCents / 100,
    features: plan.features,
  });
});

// ================================================================
// SUBSCRIPTIONS
// ================================================================

/**
 * GET /api/billing/subscription
 *
 * Returns the current org's active subscription and plan details.
 */
router.get('/subscription', (req, res) => {
  const orgId = parseInt(req.headers['x-organization-id'] || '1');

  const subscription = db.queryOne(
    `SELECT s.*, p.name as plan_name, p.display_name as plan_display_name,
            p.price_cents_per_provider, p.max_providers,
            p.max_encounters_per_month, p.max_ai_interactions_per_month,
            p.ai_overage_cents, p.features
     FROM subscriptions s
     JOIN plans p ON s.plan_id = p.id
     WHERE s.organization_id = ?
       AND s.status IN ('trialing', 'active')
     ORDER BY s.created_at DESC
     LIMIT 1`,
    [orgId]
  );

  if (!subscription) {
    return res.json({
      subscription: null,
      message: 'No active subscription. Defaulting to Starter plan.',
      suggestedPlan: PLAN_DEFINITIONS.starter,
    });
  }

  // Calculate remaining trial days if applicable
  let trialDaysRemaining = null;
  if (subscription.status === 'trialing' && subscription.trial_ends_at) {
    const trialEnd = new Date(subscription.trial_ends_at);
    const now = new Date();
    trialDaysRemaining = Math.max(0, Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)));
  }

  res.json({
    subscription: {
      id: subscription.id,
      status: subscription.status,
      planName: subscription.plan_name,
      planDisplayName: subscription.plan_display_name,
      providerCount: subscription.provider_count,
      pricePerProvider: subscription.price_cents_per_provider / 100,
      monthlyTotal: (subscription.price_cents_per_provider * subscription.provider_count) / 100,
      trialDaysRemaining,
      trialEndsAt: subscription.trial_ends_at,
      currentPeriodStart: subscription.current_period_start,
      currentPeriodEnd: subscription.current_period_end,
      features: JSON.parse(subscription.features || '{}'),
    },
  });
});

/**
 * POST /api/billing/subscription
 *
 * Create a new subscription. In demo mode, creates a local record.
 * In production, also creates the Stripe subscription.
 */
router.post('/subscription', async (req, res) => {
  const orgId = parseInt(req.headers['x-organization-id'] || '1');
  const { planName, providerCount = 1 } = req.body;

  const plan = db.queryOne('SELECT * FROM plans WHERE name = ? AND is_active = 1', [planName]);
  if (!plan) return res.status(400).json({ error: 'Invalid plan' });

  // Check provider limit
  if (plan.max_providers && providerCount > plan.max_providers) {
    return res.status(400).json({
      error: `${plan.display_name} plan supports a maximum of ${plan.max_providers} providers`,
      maxProviders: plan.max_providers,
    });
  }

  // Cancel any existing active subscription
  const existing = db.queryOne(
    `SELECT id FROM subscriptions
     WHERE organization_id = ? AND status IN ('trialing', 'active')`,
    [orgId]
  );
  if (existing) {
    db.execute(
      `UPDATE subscriptions SET status = 'canceled', canceled_at = datetime('now'), updated_at = datetime('now')
       WHERE id = ?`,
      [existing.id]
    );
  }

  // Create Stripe subscription if configured
  let stripeSubId = null;
  if (isStripeConfigured()) {
    const org = db.queryOne('SELECT * FROM organizations WHERE id = ?', [orgId]);
    if (org && org.stripe_customer_id) {
      const stripeResult = await createSubscription({
        stripeCustomerId: org.stripe_customer_id,
        planName,
        providerCount,
        trialDays: 30,
      });
      stripeSubId = stripeResult.subscriptionId || null;
    }
  }

  // Create local subscription record
  const result = db.execute(
    `INSERT INTO subscriptions
       (organization_id, plan_id, status, provider_count, stripe_subscription_id,
        trial_ends_at, current_period_start, current_period_end)
     VALUES (?, ?, 'trialing', ?, ?, datetime('now', '+30 days'), datetime('now'), datetime('now', '+30 days'))`,
    [orgId, plan.id, providerCount, stripeSubId]
  );

  // Log billing event
  db.execute(
    `INSERT INTO billing_events (organization_id, event_type, metadata)
     VALUES (?, 'subscription_created', ?)`,
    [orgId, JSON.stringify({ plan: planName, providerCount, trial_days: 30 })]
  );

  const subscription = db.queryOne('SELECT * FROM subscriptions WHERE id = ?', [result.lastInsertRowid]);
  res.status(201).json({ subscription });
});

/**
 * DELETE /api/billing/subscription
 *
 * Cancel the current subscription (at period end).
 */
router.delete('/subscription', async (req, res) => {
  const orgId = parseInt(req.headers['x-organization-id'] || '1');

  const subscription = db.queryOne(
    `SELECT * FROM subscriptions
     WHERE organization_id = ? AND status IN ('trialing', 'active')`,
    [orgId]
  );

  if (!subscription) {
    return res.status(404).json({ error: 'No active subscription to cancel' });
  }

  // Cancel in Stripe if configured
  if (isStripeConfigured() && subscription.stripe_subscription_id) {
    await cancelSubscription(subscription.stripe_subscription_id);
  }

  db.execute(
    `UPDATE subscriptions SET status = 'canceled', canceled_at = datetime('now'), updated_at = datetime('now')
     WHERE id = ?`,
    [subscription.id]
  );

  db.execute(
    `INSERT INTO billing_events (organization_id, event_type, metadata)
     VALUES (?, 'subscription_canceled', ?)`,
    [orgId, JSON.stringify({ plan: subscription.plan_id, reason: req.body?.reason || 'user_requested' })]
  );

  res.json({ message: 'Subscription canceled', effectiveDate: subscription.current_period_end });
});

// ================================================================
// USAGE & DASHBOARD
// ================================================================

/**
 * GET /api/billing/usage
 *
 * Returns current-period usage with limit context.
 * This is the primary endpoint for the usage dashboard widget.
 */
router.get('/usage', (req, res) => {
  const orgId = parseInt(req.headers['x-organization-id'] || '1');

  const subscription = db.queryOne(
    `SELECT s.*, p.name as plan_name, p.max_ai_interactions_per_month
     FROM subscriptions s
     JOIN plans p ON s.plan_id = p.id
     WHERE s.organization_id = ?
       AND s.status IN ('trialing', 'active')
     ORDER BY s.created_at DESC
     LIMIT 1`,
    [orgId]
  );

  if (!subscription) {
    return res.json({ usage: null, message: 'No active subscription' });
  }

  const currentUsage = getCurrentPeriodUsage(
    orgId,
    subscription.current_period_start,
    subscription.current_period_end
  );

  const breakdown = getUsageBreakdown(
    orgId,
    subscription.current_period_start,
    subscription.current_period_end
  );

  const summary = getUsageSummary(
    orgId,
    subscription.current_period_start,
    subscription.current_period_end
  );

  const limit = subscription.max_ai_interactions_per_month
    ? subscription.max_ai_interactions_per_month * (subscription.provider_count || 1)
    : null;

  res.json({
    usage: {
      currentPeriod: {
        start: subscription.current_period_start,
        end: subscription.current_period_end,
      },
      aiInteractions: {
        used: currentUsage.interactionCount,
        limit,
        percentUsed: limit ? Math.round((currentUsage.interactionCount / limit) * 100) : null,
        unlimited: limit === null,
      },
      tokens: {
        input: currentUsage.totalTokensInput,
        output: currentUsage.totalTokensOutput,
      },
      estimatedCostToUs: currentUsage.totalCostCents / 100,  // our Claude API cost
      breakdown: breakdown.map(b => ({
        type: b.interaction_type,
        count: b.count,
        tokensInput: b.tokens_input,
        tokensOutput: b.tokens_output,
        costCents: b.cost_cents,
      })),
      savingsEstimate: summary ? summary.ai_savings_estimate_cents / 100 : 0,
    },
  });
});

/**
 * GET /api/billing/usage/history
 *
 * Returns usage summaries across billing periods.
 */
router.get('/usage/history', (req, res) => {
  const orgId = parseInt(req.headers['x-organization-id'] || '1');
  const limit = parseInt(req.query.limit || '12');

  const history = getUsageHistory(orgId, limit);

  res.json({
    history: history.map(h => ({
      periodStart: h.period_start,
      periodEnd: h.period_end,
      totalEncounters: h.total_encounters,
      totalAiInteractions: h.total_ai_interactions,
      totalTokens: h.total_tokens_input + h.total_tokens_output,
      estimatedCost: h.total_estimated_cost_cents / 100,
      savingsEstimate: h.ai_savings_estimate_cents / 100,
      breakdownByType: JSON.parse(h.interactions_by_type || '{}'),
    })),
  });
});

// ================================================================
// DEMO: SAVINGS CALCULATOR
// ================================================================

/**
 * GET /api/billing/savings
 *
 * Calculates estimated AI coding savings across all completed encounters.
 * This is the money-shot endpoint for the demo and sales pitch.
 */
router.get('/savings', (req, res) => {
  const orgId = parseInt(req.headers['x-organization-id'] || '1');

  // Get all completed encounters with AI reviews
  const encounters = db.queryAll(
    `SELECT e.id, e.chief_complaint, e.ai_review, e.icd10_codes, e.cpt_codes,
            p.first_name, p.last_name
     FROM encounters e
     JOIN patients p ON e.patient_id = p.id
     WHERE e.ai_review IS NOT NULL
     ORDER BY e.completed_at DESC`
  );

  let totalSavingsCents = 0;
  const encounterSavings = encounters.map(e => {
    const savings = estimateEncounterSavings(e.ai_review);
    totalSavingsCents += savings;

    const review = e.ai_review ? JSON.parse(e.ai_review) : {};
    return {
      encounterId: e.id,
      patientName: `${e.first_name} ${e.last_name}`,
      chiefComplaint: e.chief_complaint,
      codesIdentified: {
        icd10: JSON.parse(e.icd10_codes || '[]').length,
        cpt: JSON.parse(e.cpt_codes || '[]').length,
      },
      qualityFlags: (review.quality_flags || []).length,
      estimatedSavings: savings / 100,  // dollars
      completeness: review.completeness || 'N/A',
    };
  });

  // Calculate AI costs for context
  const totalAiCostCents = encounters.length * 10;  // ~$0.10 per full encounter

  res.json({
    savings: {
      totalEstimatedSavings: totalSavingsCents / 100,
      totalAiCost: totalAiCostCents / 100,
      netValue: (totalSavingsCents - totalAiCostCents) / 100,
      roi: totalAiCostCents > 0
        ? Math.round(((totalSavingsCents - totalAiCostCents) / totalAiCostCents) * 100)
        : 0,
      encounterCount: encounters.length,
      encounters: encounterSavings,
    },
    projections: {
      monthlyAtCurrentRate: {
        encounters: encounters.length * 4,  // extrapolate to full month
        savings: (totalSavingsCents * 4) / 100,
        aiCost: (totalAiCostCents * 4) / 100,
      },
      annualProjection: {
        encounters: encounters.length * 48,
        savings: (totalSavingsCents * 48) / 100,
        aiCost: (totalAiCostCents * 48) / 100,
      },
    },
    context: {
      industryAvgCodingErrorRate: '10-15%',
      avgRevenueLeakagePerProvider: '$50,000-$125,000/year',
      attendingCostPerProvider: '$149/month ($1,788/year)',
    },
  });
});

// ================================================================
// BILLING EVENTS (audit log)
// ================================================================

/**
 * GET /api/billing/events
 *
 * Returns billing events for the org. Used for admin and audit purposes.
 */
router.get('/events', (req, res) => {
  const orgId = parseInt(req.headers['x-organization-id'] || '1');
  const limit = parseInt(req.query.limit || '50');

  const events = db.queryAll(
    `SELECT * FROM billing_events
     WHERE organization_id = ?
     ORDER BY created_at DESC
     LIMIT ?`,
    [orgId, limit]
  );

  res.json({
    events: events.map(e => ({
      id: e.id,
      type: e.event_type,
      metadata: JSON.parse(e.metadata || '{}'),
      stripeEventId: e.stripe_event_id,
      createdAt: e.created_at,
    })),
  });
});

export default router;
