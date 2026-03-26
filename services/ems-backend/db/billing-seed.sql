-- ATTENDING Medical AI — Billing Seed Data
-- Sets up plans and a demo organization with trial subscription

-- ============================================================
-- PLAN DEFINITIONS
-- ============================================================
INSERT INTO plans (name, display_name, price_cents_per_provider, max_providers, max_encounters_per_month, max_ai_interactions_per_month, ai_overage_cents, features) VALUES
(
  'starter',
  'Starter',
  0,
  2,
  50,
  0,
  0,
  '{"ai_intake_followup": false, "ai_intake_summary": false, "ai_encounter_assist": false, "ai_generate_note": false, "ai_quality_review": false, "basic_charting": true, "patient_management": true, "encounter_tracking": true}'
),
(
  'professional',
  'Professional',
  14900,
  NULL,
  NULL,
  200,
  15,
  '{"ai_intake_followup": true, "ai_intake_summary": true, "ai_encounter_assist": true, "ai_generate_note": true, "ai_quality_review": true, "basic_charting": true, "patient_management": true, "encounter_tracking": true, "coding_suggestions": true, "quality_dashboard": true}'
),
(
  'enterprise',
  'Enterprise',
  0,
  NULL,
  NULL,
  NULL,
  0,
  '{"ai_intake_followup": true, "ai_intake_summary": true, "ai_encounter_assist": true, "ai_generate_note": true, "ai_quality_review": true, "basic_charting": true, "patient_management": true, "encounter_tracking": true, "coding_suggestions": true, "quality_dashboard": true, "custom_integrations": true, "hl7_fhir": true, "dedicated_support": true, "sla": true, "audit_trail": true}'
);

-- ============================================================
-- DEMO ORGANIZATION (seed demo context)
-- ============================================================
INSERT INTO organizations (name, slug, owner_email, phone, npi_number) VALUES
('Lakeside Family Medicine', 'lakeside-family', 'admin@lakesidefamily.example.com', '555-0200', '1234567890');

-- ============================================================
-- DEMO SUBSCRIPTION (Professional trial, all features unlocked)
-- ============================================================
INSERT INTO subscriptions (organization_id, plan_id, status, provider_count, trial_ends_at, current_period_start, current_period_end) VALUES
(1, 2, 'trialing', 3, datetime('now', '+30 days'), datetime('now'), datetime('now', '+30 days'));

-- ============================================================
-- DEMO USAGE RECORDS (from the seed encounters that used AI)
-- Encounters 1, 4, 6, 8 are completed with AI reviews
-- ============================================================
INSERT INTO usage_records (organization_id, subscription_id, encounter_id, interaction_type, tokens_input, tokens_output, estimated_cost_cents, provider_name, period_start, period_end) VALUES
-- Encounter 1 (Maria Santos - chest pain): full AI workflow
(1, 1, 1, 'intake_summary',    1150, 780, 2,  'Dr. Demo', datetime('now', 'start of month'), datetime('now', 'start of month', '+1 month')),
(1, 1, 1, 'encounter_assist',  1480, 1150, 2, 'Dr. Demo', datetime('now', 'start of month'), datetime('now', 'start of month', '+1 month')),
(1, 1, 1, 'generate_note',     1950, 1420, 3, 'Dr. Demo', datetime('now', 'start of month'), datetime('now', 'start of month', '+1 month')),
(1, 1, 1, 'quality_review',    2400, 760, 2,  'Dr. Demo', datetime('now', 'start of month'), datetime('now', 'start of month', '+1 month')),

-- Encounter 4 (Robert Kim - diabetes follow-up): full workflow
(1, 1, 4, 'intake_summary',    980, 650, 1,   'Dr. Demo', datetime('now', 'start of month'), datetime('now', 'start of month', '+1 month')),
(1, 1, 4, 'encounter_assist',  1320, 1080, 2, 'Dr. Demo', datetime('now', 'start of month'), datetime('now', 'start of month', '+1 month')),
(1, 1, 4, 'generate_note',     1870, 1380, 3, 'Dr. Demo', datetime('now', 'start of month'), datetime('now', 'start of month', '+1 month')),
(1, 1, 4, 'quality_review',    2350, 720, 2,  'Dr. Demo', datetime('now', 'start of month'), datetime('now', 'start of month', '+1 month')),

-- Encounter 6 (David Okonkwo - back pain): note + review only
(1, 1, 6, 'generate_note',     1780, 1250, 2, 'Dr. Demo', datetime('now', 'start of month'), datetime('now', 'start of month', '+1 month')),
(1, 1, 6, 'quality_review',    2280, 680, 2,  'Dr. Demo', datetime('now', 'start of month'), datetime('now', 'start of month', '+1 month')),

-- Encounter 8 (Marcus Thompson - knee): full workflow
(1, 1, 8, 'intake_summary',    1050, 720, 2,  'Dr. Demo', datetime('now', 'start of month'), datetime('now', 'start of month', '+1 month')),
(1, 1, 8, 'encounter_assist',  1400, 1100, 2, 'Dr. Demo', datetime('now', 'start of month'), datetime('now', 'start of month', '+1 month')),
(1, 1, 8, 'generate_note',     1900, 1350, 3, 'Dr. Demo', datetime('now', 'start of month'), datetime('now', 'start of month', '+1 month')),
(1, 1, 8, 'quality_review',    2320, 740, 2,  'Dr. Demo', datetime('now', 'start of month'), datetime('now', 'start of month', '+1 month'));

-- ============================================================
-- DEMO USAGE SUMMARY (pre-aggregated for dashboard)
-- ============================================================
INSERT INTO usage_summaries (organization_id, subscription_id, period_start, period_end, total_encounters, total_ai_interactions, total_tokens_input, total_tokens_output, total_estimated_cost_cents, interactions_by_type, ai_savings_estimate_cents) VALUES
(1, 1,
 datetime('now', 'start of month'),
 datetime('now', 'start of month', '+1 month'),
 4,
 14,
 24230,
 13780,
 30,
 '{"intake_summary": 3, "encounter_assist": 3, "generate_note": 4, "quality_review": 4}',
 245000  -- $2,450 estimated savings from coding corrections across 4 encounters
);

-- ============================================================
-- DEMO BILLING EVENTS
-- ============================================================
INSERT INTO billing_events (organization_id, event_type, metadata) VALUES
(1, 'subscription_created', '{"plan": "professional", "trial_days": 30, "provider_count": 3}'),
(1, 'trial_ending', '{"days_remaining": 23, "plan": "professional"}');
