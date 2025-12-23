-- =============================================================================
-- Fix RLS Policies for Backend API Access
-- Allow service_role to access provider_config and ai_models tables
-- Created: 2025-12-22
-- =============================================================================

-- Drop existing RLS policies if any
DROP POLICY IF EXISTS "Allow service_role full access to provider_config" ON provider_config;
DROP POLICY IF EXISTS "Allow service_role full access to ai_models" ON ai_models;

-- Allow service_role (backend) to read provider_config
CREATE POLICY "Allow service_role full access to provider_config"
ON provider_config
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Allow service_role (backend) to read ai_models
CREATE POLICY "Allow service_role full access to ai_models"
ON ai_models
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Also allow authenticated users (admin panel) to read these tables
DROP POLICY IF EXISTS "Allow authenticated read access to provider_config" ON provider_config;
DROP POLICY IF EXISTS "Allow authenticated read access to ai_models" ON ai_models;

CREATE POLICY "Allow authenticated read access to provider_config"
ON provider_config
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated read access to ai_models"
ON ai_models
FOR SELECT
TO authenticated
USING (true);

-- Grant necessary permissions
GRANT ALL ON provider_config TO service_role;
GRANT ALL ON ai_models TO service_role;
GRANT SELECT ON provider_config TO authenticated;
GRANT SELECT ON ai_models TO authenticated;
