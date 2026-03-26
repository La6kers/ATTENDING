/**
 * ATTENDING — Usage metering service.
 *
 * Tracks AI interactions per organization/subscription, enforces
 * per-provider monthly limits, and provides usage queries for
 * dashboards and billing.
 */

import db from '../../db/database.js';
import { ESTIMATED_COST_CENTS } from './plans.js';

/**
 * Record an AI interaction for billing purposes.
 *
 * Called after every successful AI call. Writes to usage_records
 * and updates the rolling usage_summaries row for the current period.
 *
 * @param {Object} params
 * @param {number} params.organizationId
 * @param {number} params.subscriptionId
 * @param {number|null} params.encounterId
 * @param {string} params.interactionType - e.g. 'quality_review'
 * @param {number} params.tokensInput
 * @param {number} params.tokensOutput
 * @param {string} params.providerName
 * @param {string} params.periodStart - ISO datetime
 * @param {string} params.periodEnd   - ISO datetime
 */
export function recordUsage({
  organizationId,
  subscriptionId,
  encounterId,
  interactionType,
  tokensInput,
  tokensOutput,
  providerName,
  periodStart,
  periodEnd,
}) {
  const costCents = ESTIMATED_COST_CENTS[interactionType] || 1;

  db.execute(
    `INSERT INTO usage_records
       (organization_id, subscription_id, encounter_id, interaction_type,
        tokens_input, tokens_output, estimated_cost_cents, provider_name,
        period_start, period_end)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      organizationId, subscriptionId, encounterId, interactionType,
      tokensInput, tokensOutput, costCents, providerName,
      periodStart, periodEnd,
    ]
  );

  // Upsert the usage summary for this billing period
  _updateSummary(organizationId, subscriptionId, periodStart, periodEnd, interactionType, tokensInput, tokensOutput, costCents);
}

/**
 * Get the current AI interaction count for an org in the current period.
 * Used by the feature gate to enforce limits.
 */
export function getCurrentPeriodUsage(organizationId, periodStart, periodEnd) {
  const row = db.queryOne(
    `SELECT COUNT(*) as interaction_count,
            COALESCE(SUM(tokens_input), 0) as total_tokens_input,
            COALESCE(SUM(tokens_output), 0) as total_tokens_output,
            COALESCE(SUM(estimated_cost_cents), 0) as total_cost_cents
     FROM usage_records
     WHERE organization_id = ?
       AND period_start = ?
       AND period_end = ?`,
    [organizationId, periodStart, periodEnd]
  );
  return {
    interactionCount: row?.interaction_count || 0,
    totalTokensInput: row?.total_tokens_input || 0,
    totalTokensOutput: row?.total_tokens_output || 0,
    totalCostCents: row?.total_cost_cents || 0,
  };
}

/**
 * Get usage breakdown by interaction type for a billing period.
 */
export function getUsageBreakdown(organizationId, periodStart, periodEnd) {
  const rows = db.queryAll(
    `SELECT interaction_type,
            COUNT(*) as count,
            COALESCE(SUM(tokens_input), 0) as tokens_input,
            COALESCE(SUM(tokens_output), 0) as tokens_output,
            COALESCE(SUM(estimated_cost_cents), 0) as cost_cents
     FROM usage_records
     WHERE organization_id = ?
       AND period_start = ?
       AND period_end = ?
     GROUP BY interaction_type`,
    [organizationId, periodStart, periodEnd]
  );
  return rows;
}

/**
 * Get the usage summary for an org's current billing period.
 * Returns the pre-aggregated row from usage_summaries.
 */
export function getUsageSummary(organizationId, periodStart, periodEnd) {
  return db.queryOne(
    `SELECT * FROM usage_summaries
     WHERE organization_id = ?
       AND period_start = ?
       AND period_end = ?`,
    [organizationId, periodStart, periodEnd]
  );
}

/**
 * Get usage history across multiple billing periods.
 */
export function getUsageHistory(organizationId, limit = 12) {
  return db.queryAll(
    `SELECT * FROM usage_summaries
     WHERE organization_id = ?
     ORDER BY period_start DESC
     LIMIT ?`,
    [organizationId, limit]
  );
}

/**
 * Estimate coding savings for an encounter based on AI review results.
 *
 * Logic: if AI quality review suggested ICD-10 or CPT code corrections,
 * estimate the revenue impact. Average missed-code value is ~$45-120
 * per encounter based on CMS data.
 *
 * This is the number that sells the product.
 */
export function estimateEncounterSavings(aiReview) {
  if (!aiReview) return 0;

  let savingsEstimateCents = 0;
  const review = typeof aiReview === 'string' ? JSON.parse(aiReview) : aiReview;

  // Each ICD-10 suggestion represents a potentially missed diagnosis code
  const icdCount = (review.icd10_suggestions || []).length;
  // Each CPT suggestion represents a potentially missed procedure code
  const cptCount = (review.cpt_suggestions || []).length;
  // Quality flags suggest documentation improvements that support higher E/M levels
  const qualityFlags = (review.quality_flags || []).length;

  // Conservative estimates per code correction
  // Average missed ICD-10 code: $35 in claim value
  // Average missed CPT code: $85 in claim value
  // Average quality improvement (supports upcoding): $25 per flag
  savingsEstimateCents += icdCount * 3500;
  savingsEstimateCents += cptCount * 8500;
  savingsEstimateCents += qualityFlags * 2500;

  return savingsEstimateCents;
}

// ---- Internal helpers ----

function _updateSummary(orgId, subId, periodStart, periodEnd, interactionType, tokensIn, tokensOut, costCents) {
  const existing = db.queryOne(
    `SELECT id, total_ai_interactions, total_tokens_input, total_tokens_output,
            total_estimated_cost_cents, interactions_by_type
     FROM usage_summaries
     WHERE organization_id = ? AND period_start = ? AND period_end = ?`,
    [orgId, periodStart, periodEnd]
  );

  if (existing) {
    const byType = JSON.parse(existing.interactions_by_type || '{}');
    byType[interactionType] = (byType[interactionType] || 0) + 1;

    db.execute(
      `UPDATE usage_summaries SET
         total_ai_interactions = total_ai_interactions + 1,
         total_tokens_input = total_tokens_input + ?,
         total_tokens_output = total_tokens_output + ?,
         total_estimated_cost_cents = total_estimated_cost_cents + ?,
         interactions_by_type = ?,
         updated_at = datetime('now')
       WHERE id = ?`,
      [tokensIn, tokensOut, costCents, JSON.stringify(byType), existing.id]
    );
  } else {
    const byType = { [interactionType]: 1 };
    db.execute(
      `INSERT INTO usage_summaries
         (organization_id, subscription_id, period_start, period_end,
          total_encounters, total_ai_interactions, total_tokens_input,
          total_tokens_output, total_estimated_cost_cents, interactions_by_type,
          ai_savings_estimate_cents)
       VALUES (?, ?, ?, ?, 0, 1, ?, ?, ?, ?, 0)`,
      [orgId, subId, periodStart, periodEnd, tokensIn, tokensOut, costCents, JSON.stringify(byType)]
    );
  }
}
