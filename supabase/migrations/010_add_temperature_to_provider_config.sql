-- =============================================================================
-- Migration: Add Temperature Column to Provider Config
-- =============================================================================
-- Created: 2025-12-19 | Initials: HP | Layer: Database | Type: Migration
-- Purpose: Add temperature configuration per provider to replace hardcoded 0.7 values
-- =============================================================================

-- =============================================
-- 1. ADD TEMPERATURE COLUMN
-- =============================================
-- Add temperature column with default value 0.7 (current hardcoded value)

ALTER TABLE provider_config 
ADD COLUMN IF NOT EXISTS temperature DECIMAL(3,2) DEFAULT 0.7;

-- Add constraint to ensure temperature is within valid range (0.0 to 2.0)
ALTER TABLE provider_config 
ADD CONSTRAINT check_temperature_range 
CHECK (temperature >= 0.0 AND temperature <= 2.0);

-- =============================================
-- 2. UPDATE EXISTING PROVIDERS WITH DEFAULT TEMPERATURE
-- =============================================
-- Set temperature for all existing providers

UPDATE provider_config SET temperature = 0.7 WHERE temperature IS NULL;

-- =============================================
-- 3. UPDATE HELPER FUNCTION TO INCLUDE TEMPERATURE
-- =============================================
-- Drop the old function first (required when changing return type)
-- Then recreate it with the new return type including temperature

DROP FUNCTION IF EXISTS get_provider_config(TEXT);

CREATE FUNCTION get_provider_config(p_provider TEXT)
RETURNS TABLE (
    provider TEXT,
    is_enabled BOOLEAN,
    max_output_cap INTEGER,
    rate_limit_rpm INTEGER,
    timeout_seconds INTEGER,
    retry_count INTEGER,
    temperature DECIMAL(3,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pc.provider,
        pc.is_enabled,
        pc.max_output_cap,
        pc.rate_limit_rpm,
        pc.timeout_seconds,
        pc.retry_count,
        pc.temperature
    FROM provider_config pc
    WHERE pc.provider = p_provider;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 4. ADD FUNCTION TO GET PROVIDER TEMPERATURE
-- =============================================

CREATE OR REPLACE FUNCTION get_provider_temperature(p_provider TEXT)
RETURNS DECIMAL(3,2) AS $$
DECLARE
    v_temperature DECIMAL(3,2);
BEGIN
    SELECT temperature INTO v_temperature 
    FROM provider_config 
    WHERE provider = p_provider;
    
    -- Return default 0.7 if not found
    RETURN COALESCE(v_temperature, 0.7);
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- MIGRATION COMPLETE
-- =============================================
-- 
-- CHANGES:
-- 1. Added temperature column to provider_config table
-- 2. Default value: 0.7 (matches current hardcoded value)
-- 3. Valid range: 0.0 to 2.0
-- 4. Updated get_provider_config function to include temperature
-- 5. Added get_provider_temperature helper function
--
-- NEXT STEPS:
-- 1. Run this migration in Supabase
-- 2. Update useAdminConfig.ts to include temperature field
-- 3. Update ai-proxy.cjs to use dynamic temperature
-- 4. Update frontend AI clients to use provider config temperature
-- =============================================
