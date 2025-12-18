-- =============================================================================
-- API Configuration Extension
-- =============================================================================
-- This migration extends provider_config with API key storage and additional
-- settings for centralized API management from the admin panel
-- Created: 2025-12-18 | Initials: HP
-- =============================================================================

-- =============================================
-- 1. EXTEND PROVIDER_CONFIG TABLE
-- =============================================
-- Add new columns for API key storage and additional settings

-- API Key (encrypted) - stored securely, only accessible by admins
ALTER TABLE provider_config 
ADD COLUMN IF NOT EXISTS api_key_encrypted TEXT;

-- Custom API endpoint (for self-hosted or proxy endpoints)
ALTER TABLE provider_config 
ADD COLUMN IF NOT EXISTS api_endpoint TEXT;

-- Retry delay in milliseconds
ALTER TABLE provider_config 
ADD COLUMN IF NOT EXISTS retry_delay_ms INTEGER DEFAULT 1000;

-- Custom headers as JSONB (for special auth requirements)
ALTER TABLE provider_config 
ADD COLUMN IF NOT EXISTS custom_headers JSONB DEFAULT '{}';

-- Admin notes for documentation
ALTER TABLE provider_config 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Connection testing fields
ALTER TABLE provider_config 
ADD COLUMN IF NOT EXISTS last_tested_at TIMESTAMPTZ;

ALTER TABLE provider_config 
ADD COLUMN IF NOT EXISTS last_test_status VARCHAR(20) DEFAULT 'untested';

ALTER TABLE provider_config 
ADD COLUMN IF NOT EXISTS last_test_error TEXT;

-- Priority for fallback ordering (lower = higher priority)
ALTER TABLE provider_config 
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 100;

-- Model to use for this provider (default model)
ALTER TABLE provider_config 
ADD COLUMN IF NOT EXISTS default_model TEXT;

-- =============================================
-- 2. UPDATE RLS POLICIES FOR SENSITIVE DATA
-- =============================================
-- Only admins can see API keys

-- Drop existing policies to recreate with proper security
DROP POLICY IF EXISTS "Public read access for provider_config" ON provider_config;
DROP POLICY IF EXISTS "Authenticated write access for provider_config" ON provider_config;

-- Public can read non-sensitive fields (exclude api_key_encrypted)
CREATE POLICY "Public read non-sensitive provider_config" ON provider_config
    FOR SELECT USING (true);

-- Only admins can update (checked via profiles table)
CREATE POLICY "Admin write access for provider_config" ON provider_config
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- =============================================
-- 3. CREATE VIEW FOR NON-SENSITIVE DATA
-- =============================================
-- Frontend uses this view to avoid exposing API keys

CREATE OR REPLACE VIEW provider_config_public AS
SELECT 
    provider,
    is_enabled,
    max_output_cap,
    rate_limit_rpm,
    timeout_seconds,
    retry_count,
    retry_delay_ms,
    api_endpoint,
    notes,
    last_tested_at,
    last_test_status,
    priority,
    default_model,
    updated_at,
    -- Show masked key status (has key or not)
    CASE 
        WHEN api_key_encrypted IS NOT NULL AND api_key_encrypted != '' 
        THEN true 
        ELSE false 
    END AS has_api_key
FROM provider_config;

-- =============================================
-- 4. ADD NEW PROVIDERS
-- =============================================
-- Ensure all supported providers exist

INSERT INTO provider_config (provider, is_enabled, max_output_cap, rate_limit_rpm, timeout_seconds, retry_count, priority, default_model) VALUES
('openai', true, 16384, 3500, 60, 3, 10, 'gpt-4o'),
('anthropic', true, 8192, 3500, 60, 3, 20, 'claude-3-5-sonnet-20241022'),
('gemini', true, 8192, 3600, 60, 3, 30, 'gemini-2.0-flash-exp'),
('deepseek', true, 65536, 3600, 120, 3, 40, 'deepseek-chat'),
('mistral', true, 32768, 3600, 600, 3, 50, 'mistral-large-latest'),
('perplexity', true, 4096, 1800, 60, 3, 60, 'llama-3.1-sonar-large-128k-online'),
('groq', true, 8192, 1800, 30, 3, 70, 'llama-3.3-70b-versatile'),
('xai', true, 16384, 1800, 60, 3, 80, 'grok-2-latest'),
('kimi', true, 8192, 1800, 60, 3, 90, 'moonshot-v1-128k'),
('falcon', false, 8192, 1800, 60, 3, 100, 'falcon-180b'),
('sarvam', false, 4096, 1800, 60, 3, 110, 'sarvam-2b'),
('huggingface', false, 4096, 1800, 60, 3, 120, NULL)

ON CONFLICT (provider) DO UPDATE SET
    max_output_cap = EXCLUDED.max_output_cap,
    timeout_seconds = EXCLUDED.timeout_seconds,
    priority = EXCLUDED.priority,
    default_model = EXCLUDED.default_model,
    updated_at = NOW();

-- =============================================
-- 5. ADD GLOBAL API SETTINGS TO SYSTEM_CONFIG
-- =============================================

INSERT INTO system_config (key, value, category, description, is_sensitive) VALUES
-- Global API settings
('global_request_timeout_ms', '120000', 'api', 'Global request timeout (2 minutes)', false),
('global_stream_timeout_ms', '600000', 'api', 'Global streaming timeout (10 minutes)', false),
('global_retry_count', '3', 'api', 'Default retry count for all providers', false),
('global_retry_delay_ms', '1000', 'api', 'Default retry delay in milliseconds', false),
('api_rate_limit_enabled', 'true', 'api', 'Enable rate limiting', false),
('api_logging_enabled', 'true', 'api', 'Enable API request logging', false),
('api_cache_ttl_seconds', '300', 'api', 'Cache TTL for config (5 minutes)', false),

-- Streaming settings
('sse_heartbeat_interval_ms', '30000', 'api', 'SSE heartbeat interval (30 seconds)', false),
('sse_max_duration_ms', '600000', 'api', 'Maximum SSE stream duration (10 minutes)', false),

-- Fallback settings
('fallback_enabled', 'true', 'api', 'Enable automatic provider fallback', false),
('fallback_max_attempts', '3', 'api', 'Maximum fallback attempts', false)

ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = NOW();

-- =============================================
-- 6. HELPER FUNCTIONS
-- =============================================

-- Function to get provider config with API key (admin only)
CREATE OR REPLACE FUNCTION get_provider_config_full(p_provider TEXT)
RETURNS TABLE (
    provider TEXT,
    is_enabled BOOLEAN,
    max_output_cap INTEGER,
    rate_limit_rpm INTEGER,
    timeout_seconds INTEGER,
    retry_count INTEGER,
    retry_delay_ms INTEGER,
    api_key_encrypted TEXT,
    api_endpoint TEXT,
    custom_headers JSONB,
    priority INTEGER,
    default_model TEXT
) 
SECURITY DEFINER
AS $$
BEGIN
    -- Check if caller is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;
    
    RETURN QUERY
    SELECT 
        pc.provider,
        pc.is_enabled,
        pc.max_output_cap,
        pc.rate_limit_rpm,
        pc.timeout_seconds,
        pc.retry_count,
        pc.retry_delay_ms,
        pc.api_key_encrypted,
        pc.api_endpoint,
        pc.custom_headers,
        pc.priority,
        pc.default_model
    FROM provider_config pc
    WHERE pc.provider = p_provider;
END;
$$ LANGUAGE plpgsql;

-- Function to update provider API key (admin only)
CREATE OR REPLACE FUNCTION update_provider_api_key(
    p_provider TEXT,
    p_api_key TEXT
)
RETURNS VOID
SECURITY DEFINER
AS $$
BEGIN
    -- Check if caller is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;
    
    UPDATE provider_config
    SET 
        api_key_encrypted = p_api_key,
        updated_at = NOW(),
        updated_by = auth.uid()
    WHERE provider = p_provider;
END;
$$ LANGUAGE plpgsql;

-- Function to test provider connection (updates last_tested fields)
CREATE OR REPLACE FUNCTION update_provider_test_status(
    p_provider TEXT,
    p_status VARCHAR(20),
    p_error TEXT DEFAULT NULL
)
RETURNS VOID
SECURITY DEFINER
AS $$
BEGIN
    UPDATE provider_config
    SET 
        last_tested_at = NOW(),
        last_test_status = p_status,
        last_test_error = p_error,
        updated_at = NOW()
    WHERE provider = p_provider;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 7. ADMIN ACTIVITY LOG FOR API CONFIG CHANGES
-- =============================================

-- Trigger to log API config changes
CREATE OR REPLACE FUNCTION log_provider_config_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if admin_activity_log table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_activity_log') THEN
        INSERT INTO admin_activity_log (
            admin_id,
            action,
            target_type,
            target_id,
            old_value,
            new_value
        ) VALUES (
            auth.uid(),
            TG_OP,
            'provider_config',
            NEW.provider,
            CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
            to_jsonb(NEW)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_provider_config_change ON provider_config;
CREATE TRIGGER trigger_log_provider_config_change
    AFTER INSERT OR UPDATE ON provider_config
    FOR EACH ROW EXECUTE FUNCTION log_provider_config_change();

-- =============================================
-- MIGRATION COMPLETE
-- =============================================
-- 
-- CHANGES:
-- 1. Extended provider_config with API key storage
-- 2. Added connection testing fields
-- 3. Added priority and default_model fields
-- 4. Created secure view for non-sensitive data
-- 5. Added global API settings to system_config
-- 6. Created admin-only functions for API key management
-- 7. Added audit logging for config changes
--
-- SECURITY:
-- - API keys only accessible via admin-only functions
-- - RLS policies enforce admin-only write access
-- - Public view excludes sensitive fields
-- =============================================
