/**
 * ATTENDING — Stripe integration interface (scaffold only).
 *
 * This module defines the contract between ATTENDING's billing system
 * and Stripe. NONE of this calls Stripe yet — it is a typed interface
 * with stub implementations that return structured errors telling the
 * caller that Stripe is not configured.
 *
 * When you are ready to integrate Stripe:
 *   1. npm install stripe
 *   2. Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in .env
 *   3. Replace each stub with the real Stripe SDK call
 *   4. Wire up the webhook handler in server.js
 *
 * The interface is designed around Stripe's Subscriptions + Usage Records
 * model, which maps cleanly to ATTENDING's hybrid pricing.
 */

const STRIPE_NOT_CONFIGURED = {
  configured: false,
  error: 'Stripe is not configured. Set STRIPE_SECRET_KEY in .env to enable payments.',
};

// ---------- Customer Management ----------

/**
 * Create a Stripe Customer for an organization.
 *
 * @param {Object} params
 * @param {string} params.email - Organization admin email
 * @param {string} params.name  - Organization name
 * @param {Object} params.metadata - { organizationId, slug }
 * @returns {Promise<{id: string, email: string}>}
 */
export async function createCustomer({ email, name, metadata }) {
  // STUB: Replace with:
  //   const customer = await stripe.customers.create({ email, name, metadata });
  //   return { id: customer.id, email: customer.email };
  return { ...STRIPE_NOT_CONFIGURED, action: 'createCustomer', params: { email, name } };
}

/**
 * Update a Stripe Customer (e.g. email change, payment method).
 */
export async function updateCustomer(stripeCustomerId, updates) {
  // STUB: stripe.customers.update(stripeCustomerId, updates)
  return { ...STRIPE_NOT_CONFIGURED, action: 'updateCustomer' };
}

// ---------- Subscription Management ----------

/**
 * Create a subscription in Stripe.
 *
 * For ATTENDING's model, this creates a subscription with:
 *   - A recurring line item for the base per-provider fee
 *   - A metered line item for AI overage charges
 *
 * @param {Object} params
 * @param {string} params.stripeCustomerId
 * @param {string} params.planName - 'professional' or 'enterprise'
 * @param {number} params.providerCount
 * @param {number} params.trialDays
 * @returns {Promise<{subscriptionId: string, clientSecret: string}>}
 */
export async function createSubscription({ stripeCustomerId, planName, providerCount, trialDays }) {
  // STUB: Replace with:
  //   const subscription = await stripe.subscriptions.create({
  //     customer: stripeCustomerId,
  //     items: [
  //       { price: PRICE_IDS[planName].base, quantity: providerCount },
  //       { price: PRICE_IDS[planName].overage },  // metered
  //     ],
  //     trial_period_days: trialDays || 30,
  //     payment_behavior: 'default_incomplete',
  //     expand: ['latest_invoice.payment_intent'],
  //   });
  return { ...STRIPE_NOT_CONFIGURED, action: 'createSubscription', params: { planName, providerCount } };
}

/**
 * Update subscription (change plan, add/remove providers).
 */
export async function updateSubscription(stripeSubscriptionId, updates) {
  // STUB: stripe.subscriptions.update(stripeSubscriptionId, { ... })
  return { ...STRIPE_NOT_CONFIGURED, action: 'updateSubscription' };
}

/**
 * Cancel a subscription (at period end by default).
 */
export async function cancelSubscription(stripeSubscriptionId, { immediate = false } = {}) {
  // STUB:
  //   if (immediate) await stripe.subscriptions.cancel(stripeSubscriptionId);
  //   else await stripe.subscriptions.update(stripeSubscriptionId, { cancel_at_period_end: true });
  return { ...STRIPE_NOT_CONFIGURED, action: 'cancelSubscription' };
}

// ---------- Usage Reporting ----------

/**
 * Report metered usage to Stripe for overage billing.
 *
 * Called at the end of each billing period (or in real-time) to
 * report AI interactions that exceeded the included allocation.
 *
 * @param {string} stripeSubscriptionItemId - The metered line item
 * @param {number} quantity - Number of overage interactions
 * @param {number} timestamp - Unix timestamp for the usage
 */
export async function reportUsage(stripeSubscriptionItemId, quantity, timestamp) {
  // STUB: Replace with:
  //   await stripe.subscriptionItems.createUsageRecord(stripeSubscriptionItemId, {
  //     quantity,
  //     timestamp,
  //     action: 'increment',
  //   });
  return { ...STRIPE_NOT_CONFIGURED, action: 'reportUsage', params: { quantity } };
}

// ---------- Webhook Handling ----------

/**
 * Verify and parse a Stripe webhook event.
 *
 * @param {string} rawBody - The raw request body
 * @param {string} signature - The Stripe-Signature header
 * @returns {Object} The verified event object
 */
export function constructWebhookEvent(rawBody, signature) {
  // STUB: Replace with:
  //   return stripe.webhooks.constructEvent(rawBody, signature, WEBHOOK_SECRET);
  throw new Error('Stripe webhooks not configured');
}

/**
 * Map of Stripe webhook event types to handler functions.
 *
 * Wire this into an Express route:
 *   app.post('/api/billing/webhook', express.raw({type: 'application/json'}), (req, res) => {
 *     const event = constructWebhookEvent(req.body, req.headers['stripe-signature']);
 *     const handler = WEBHOOK_HANDLERS[event.type];
 *     if (handler) await handler(event);
 *     res.json({ received: true });
 *   });
 */
export const WEBHOOK_HANDLERS = {
  'customer.subscription.created': async (event) => {
    // Update local subscription record with stripe IDs
    // Log billing event
  },

  'customer.subscription.updated': async (event) => {
    // Sync status changes (active, past_due, canceled)
    // Handle plan changes
  },

  'customer.subscription.deleted': async (event) => {
    // Mark subscription as canceled
    // Downgrade to starter plan
  },

  'invoice.payment_succeeded': async (event) => {
    // Log successful payment
    // Update subscription period dates
  },

  'invoice.payment_failed': async (event) => {
    // Mark subscription as past_due
    // Log billing event
    // Trigger notification (email, in-app)
  },

  'customer.subscription.trial_will_end': async (event) => {
    // 3 days before trial ends
    // Log billing event
    // Trigger trial-ending notification
  },
};

// ---------- Price Configuration ----------

/**
 * Stripe Price IDs — set these after creating products in Stripe Dashboard.
 *
 * Structure matches ATTENDING's hybrid model:
 *   - base: recurring per-provider price
 *   - overage: metered price for AI calls over the included limit
 */
export const PRICE_IDS = {
  professional: {
    base: process.env.STRIPE_PRICE_PRO_BASE || 'price_NOT_SET',
    overage: process.env.STRIPE_PRICE_PRO_OVERAGE || 'price_NOT_SET',
  },
  enterprise: {
    base: process.env.STRIPE_PRICE_ENT_BASE || 'price_NOT_SET',
    overage: null,  // no overage on enterprise
  },
};

/**
 * Check whether Stripe is actually configured.
 */
export function isStripeConfigured() {
  return !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
}
