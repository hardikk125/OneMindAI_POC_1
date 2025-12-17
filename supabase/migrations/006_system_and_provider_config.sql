-- =============================================================================
-- System Configuration and Provider Configuration Tables
-- =============================================================================
-- This migration adds system-wide configuration and provider-level settings
-- to replace hardcoded values in the application
-- Run this migration in your Supabase SQL editor
-- =============================================================================

-- =============================================
-- 1. SYSTEM_CONFIG TABLE
-- =============================================
-- Stores all system-wide configuration values
-- Replaces hardcoded values in OneMindAI.tsx and constants.ts

CREATE TABLE IF NOT EXISTS system_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  category TEXT NOT NULL,                 -- 'limits', 'pricing', 'ux', 'api', 'technical'
  description TEXT,
  is_sensitive BOOLEAN DEFAULT false,     -- Hide from non-admins
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 2. PROVIDER_CONFIG TABLE
-- =============================================
-- Stores provider-level settings (rate limits, enable/disable, output caps)

CREATE TABLE IF NOT EXISTS provider_config (
  provider TEXT PRIMARY KEY,              -- 'openai', 'anthropic', 'gemini', etc.
  is_enabled BOOLEAN DEFAULT true,        -- Enable/disable provider
  max_output_cap INTEGER,                 -- Backend safety cap (tokens)
  rate_limit_rpm INTEGER,                 -- Requests per minute
  timeout_seconds INTEGER DEFAULT 30,     -- Request timeout
  retry_count INTEGER DEFAULT 3,          -- Number of retries
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 3. INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_system_config_category ON system_config(category);
CREATE INDEX IF NOT EXISTS idx_system_config_updated_at ON system_config(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_provider_config_enabled ON provider_config(is_enabled);

-- =============================================
-- 4. ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_config ENABLE ROW LEVEL SECURITY;

-- Public read access for non-sensitive config
CREATE POLICY "Public read access for system_config" ON system_config
    FOR SELECT USING (is_sensitive = false);

CREATE POLICY "Public read access for provider_config" ON provider_config
    FOR SELECT USING (true);

-- Authenticated users can write (admin check done in application layer)
CREATE POLICY "Authenticated write access for system_config" ON system_config
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated write access for provider_config" ON provider_config
    FOR ALL USING (auth.role() = 'authenticated');

-- =============================================
-- 5. TRIGGERS FOR AUTO-UPDATE TIMESTAMPS
-- =============================================

CREATE OR REPLACE FUNCTION update_system_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_provider_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_system_config_updated_at ON system_config;
CREATE TRIGGER trigger_system_config_updated_at
    BEFORE UPDATE ON system_config
    FOR EACH ROW EXECUTE FUNCTION update_system_config_timestamp();

DROP TRIGGER IF EXISTS trigger_provider_config_updated_at ON provider_config;
CREATE TRIGGER trigger_provider_config_updated_at
    BEFORE UPDATE ON provider_config
    FOR EACH ROW EXECUTE FUNCTION update_provider_config_timestamp();

-- =============================================
-- 6. SEED DATA - SYSTEM CONFIG
-- =============================================
-- Insert all hardcoded values from the application

INSERT INTO system_config (key, value, category, description, is_sensitive) VALUES
-- PROMPT LIMITS (Category: limits)
('prompt_soft_limit', '5000', 'limits', 'Warning threshold for prompt length', false),
('prompt_hard_limit', '10000', 'limits', 'Maximum prompt length (hard block)', false),
('prompt_chunk_size', '4000', 'limits', 'Chunk size for long prompts', false),
('max_prompt_length', '7000', 'limits', 'Truncation point before API call', false),

-- TIMEOUTS (Category: api)
('stream_timeout_ms', '30000', 'api', 'Timeout for streaming responses (30 seconds)', false),
('request_timeout_ms', '60000', 'api', 'General request timeout (60 seconds)', false),

-- PRICING DEFAULTS (Category: pricing)
('expected_output_tokens', '1000', 'pricing', 'Default expected output tokens for cost estimation', false),
('signup_bonus_credits', '100', 'pricing', 'Credits given to new users', false),
('markup_percentage', '30', 'pricing', 'Markup percentage over provider costs', false),

-- UI TIMING (Category: technical)
('debounce_ms', '300', 'technical', 'Input debounce delay (milliseconds)', false),
('animation_duration_ms', '200', 'technical', 'Framer motion animation duration', false),
('update_interval_ms', '15', 'technical', '~60fps refresh rate for streaming', false),
('toast_duration_ms', '5000', 'technical', 'Notification display time', false),

-- TIME DISPLAY THRESHOLDS (Category: technical)
('base_time_offset', '2', 'technical', 'Minimum display time (seconds)', false),
('few_seconds_max', '20', 'technical', 'Threshold for "a few seconds" label', false),
('switch_to_minutes', '90', 'technical', 'When to switch from seconds to minutes display', false),

-- TOKEN ESTIMATION (Category: technical)
('tiktoken_chars_per_token', '0.75', 'technical', 'Tiktoken approximation: chars per token', false),
('tiktoken_adjustment', '0.002', 'technical', 'Tiktoken fine-tuning adjustment', false),
('sentencepiece_chars_per_token', '0.95', 'technical', 'SentencePiece approximation: chars per token', false),
('sentencepiece_adjustment', '0.003', 'technical', 'SentencePiece fine-tuning adjustment', false),
('bytebpe_chars_per_token', '0.6', 'technical', 'ByteBPE approximation: chars per token', false),
('bytebpe_adjustment', '0.004', 'technical', 'ByteBPE fine-tuning adjustment', false),

-- INDUSTRY STANDARDS (Category: technical - never change)
('tokens_per_million', '1000000', 'technical', 'Industry standard divisor for per-million pricing', false),
('cents_per_dollar', '100', 'technical', 'Currency standard: cents per dollar', false),
('context_reserve_ratio', '0.9', 'technical', 'Reserve 90% of context for safety margin', false)

ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = NOW();

-- =============================================
-- 7. SEED DATA - PROVIDER CONFIG
-- =============================================
-- Insert provider-level settings

INSERT INTO provider_config (provider, is_enabled, max_output_cap, rate_limit_rpm, timeout_seconds, retry_count) VALUES
('openai', true, 16384, 3500, 30, 3),
('anthropic', true, 8192, 3500, 30, 3),
('gemini', true, 8192, 3600, 30, 3),
('deepseek', true, 8192, 3600, 30, 3),
('mistral', true, 32768, 3600, 30, 3),
('perplexity', true, 4096, 1800, 30, 3),
('groq', true, 8192, 1800, 30, 3),
('xai', true, 16384, 1800, 30, 3),
('kimi', true, 8192, 1800, 30, 3)

ON CONFLICT (provider) DO UPDATE SET
    is_enabled = EXCLUDED.is_enabled,
    max_output_cap = EXCLUDED.max_output_cap,
    rate_limit_rpm = EXCLUDED.rate_limit_rpm,
    timeout_seconds = EXCLUDED.timeout_seconds,
    retry_count = EXCLUDED.retry_count,
    updated_at = NOW();

-- =============================================
-- 8. HELPER FUNCTIONS
-- =============================================

-- Function to get system config value
CREATE OR REPLACE FUNCTION get_system_config(p_key TEXT)
RETURNS JSONB AS $$
DECLARE
    v_value JSONB;
BEGIN
    SELECT value INTO v_value FROM system_config WHERE key = p_key;
    RETURN COALESCE(v_value, NULL);
END;
$$ LANGUAGE plpgsql;

-- Function to get all system config by category
CREATE OR REPLACE FUNCTION get_system_config_by_category(p_category TEXT)
RETURNS TABLE (key TEXT, value JSONB, description TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT sc.key, sc.value, sc.description
    FROM system_config sc
    WHERE sc.category = p_category
    ORDER BY sc.key;
END;
$$ LANGUAGE plpgsql;

-- Function to get provider config
CREATE OR REPLACE FUNCTION get_provider_config(p_provider TEXT)
RETURNS TABLE (
    provider TEXT,
    is_enabled BOOLEAN,
    max_output_cap INTEGER,
    rate_limit_rpm INTEGER,
    timeout_seconds INTEGER,
    retry_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pc.provider,
        pc.is_enabled,
        pc.max_output_cap,
        pc.rate_limit_rpm,
        pc.timeout_seconds,
        pc.retry_count
    FROM provider_config pc
    WHERE pc.provider = p_provider;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- MIGRATION COMPLETE
-- =============================================
-- 
-- TABLES CREATED:
-- 1. system_config - Key-value store for system-wide settings
-- 2. provider_config - Provider-level configuration
--
-- FEATURES:
-- - Full CRUD for both tables
-- - RLS for security
-- - Auto-updating timestamps
-- - Helper functions for common queries
-- - Seed data with all current hardcoded values
--
-- NEXT STEPS:
-- 1. Run this migration in Supabase
-- 2. Verify tables and seed data in Supabase dashboard
-- 3. Create useAdminConfig hook to fetch from these tables
-- 4. Update OneMindAI.tsx to use database values
-- =============================================
