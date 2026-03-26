-- ATTENDING Medical AI — Billing & Subscription Schema
-- Recommendation #5: Revenue model scaffold

-- ============================================================
-- ORGANIZATIONS (tenant boundary for multi-practice support)
-- ============================================================
CREATE TABLE IF NOT EXISTS organizations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  owner_email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  npi_number TEXT,              -- National Provider Identifier (org-level)
  stripe_customer_id TEXT,      -- Stripe customer reference (nullable until integrated)
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- SUBSCRIPTION PLANS (system-defined pricing tiers)
-- ============================================================
CREATE TABLE IF NOT EXISTS plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,             -- 'starter', 'professional', 'enterprise'
  display_name TEXT NOT NULL,            -- 'Starter', 'Professional', 'Enterprise'
  price_cents_per_provider INTEGER NOT NULL DEFAULT 0,  -- monthly price in cents
  max_providers INTEGER,                 -- NULL = unlimited
  max_encounters_per_month INTEGER,      -- NULL = unlimited
  max_ai_interactions_per_month INTEGER, -- per provider; NULL = unlimited
  ai_overage_cents INTEGER DEFAULT 0,    -- cost per AI call over limit, in cents
  features TEXT NOT NULL DEFAULT '{}',   -- JSON feature flags
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- SUBSCRIPTIONS (org <-> plan binding)
-- ============================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organization_id INTEGER NOT NULL,
  plan_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'trialing',
  -- status: trialing | active | past_due | canceled | paused
  provider_count INTEGER NOT NULL DEFAULT 1,
  stripe_subscription_id TEXT,           -- Stripe reference (nullable)
  trial_ends_at TEXT,
  current_period_start TEXT NOT NULL DEFAULT (datetime('now')),
  current_period_end TEXT NOT NULL DEFAULT (datetime('now', '+30 days')),
  canceled_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (plan_id) REFERENCES plans(id)
);

-- ============================================================
-- USAGE RECORDS (metered AI interactions per billing period)
-- ============================================================
CREATE TABLE IF NOT EXISTS usage_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organization_id INTEGER NOT NULL,
  subscription_id INTEGER NOT NULL,
  encounter_id INTEGER,
  interaction_type TEXT NOT NULL,
  -- types match ai_interactions: intake_followup, intake_summary,
  --   encounter_assist, generate_note, quality_review
  tokens_input INTEGER NOT NULL DEFAULT 0,
  tokens_output INTEGER NOT NULL DEFAULT 0,
  estimated_cost_cents INTEGER NOT NULL DEFAULT 0,  -- our cost (Claude API)
  provider_name TEXT,
  period_start TEXT NOT NULL,            -- billing period this belongs to
  period_end TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (subscription_id) REFERENCES subscriptions(id),
  FOREIGN KEY (encounter_id) REFERENCES encounters(id)
);

-- ============================================================
-- BILLING EVENTS (audit trail for all billing-relevant actions)
-- ============================================================
CREATE TABLE IF NOT EXISTS billing_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organization_id INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  -- event types: subscription_created, subscription_upgraded,
  --   subscription_downgraded, subscription_canceled, subscription_renewed,
  --   payment_succeeded, payment_failed, invoice_generated,
  --   usage_limit_warning, usage_limit_reached, trial_ending,
  --   trial_ended, overage_charged
  metadata TEXT NOT NULL DEFAULT '{}',   -- JSON context for the event
  stripe_event_id TEXT,                  -- Stripe webhook event ID
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

-- ============================================================
-- USAGE SUMMARIES (pre-aggregated for dashboard queries)
-- ============================================================
CREATE TABLE IF NOT EXISTS usage_summaries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organization_id INTEGER NOT NULL,
  subscription_id INTEGER NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  total_encounters INTEGER NOT NULL DEFAULT 0,
  total_ai_interactions INTEGER NOT NULL DEFAULT 0,
  total_tokens_input INTEGER NOT NULL DEFAULT 0,
  total_tokens_output INTEGER NOT NULL DEFAULT 0,
  total_estimated_cost_cents INTEGER NOT NULL DEFAULT 0,
  interactions_by_type TEXT NOT NULL DEFAULT '{}',  -- JSON breakdown
  ai_savings_estimate_cents INTEGER NOT NULL DEFAULT 0,  -- estimated $ saved
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (subscription_id) REFERENCES subscriptions(id),
  UNIQUE(organization_id, period_start, period_end)
);

-- ============================================================
-- INDEXES for query performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_usage_records_org_period
  ON usage_records(organization_id, period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_usage_records_subscription
  ON usage_records(subscription_id, created_at);

CREATE INDEX IF NOT EXISTS idx_billing_events_org
  ON billing_events(organization_id, created_at);

CREATE INDEX IF NOT EXISTS idx_subscriptions_org
  ON subscriptions(organization_id, status);

CREATE INDEX IF NOT EXISTS idx_subscriptions_status
  ON subscriptions(status, current_period_end);
