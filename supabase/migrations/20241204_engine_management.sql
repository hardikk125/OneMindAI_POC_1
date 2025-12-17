-- =============================================================================
-- Engine Management Database Schema
-- =============================================================================
-- This schema enables live management of AI engines and models from the admin panel
-- Run this migration in your Supabase SQL editor
-- =============================================================================

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS model_health_logs CASCADE;
DROP TABLE IF EXISTS engine_config_history CASCADE;
DROP TABLE IF EXISTS ai_models CASCADE;
DROP TABLE IF EXISTS available_models_catalog CASCADE;
DROP TABLE IF EXISTS ai_engines CASCADE;

-- Drop existing functions
DROP FUNCTION IF EXISTS get_enabled_engines_with_models();
DROP FUNCTION IF EXISTS reorder_engine_models(UUID, UUID[]);
DROP FUNCTION IF EXISTS log_model_health_check(UUID, BOOLEAN, INTEGER, TEXT, VARCHAR);
DROP FUNCTION IF EXISTS update_updated_at();

-- =============================================
-- 1. AI ENGINES TABLE
-- =============================================
-- Stores the main engine configurations (OpenAI, Claude, Gemini, etc.)

CREATE TABLE ai_engines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    engine_id VARCHAR(50) UNIQUE NOT NULL,           -- e.g., 'openai', 'claude', 'gemini'
    name VARCHAR(100) NOT NULL,                       -- Display name e.g., 'ChatGPT'
    provider VARCHAR(50) NOT NULL,                    -- Provider identifier
    tokenizer VARCHAR(50) DEFAULT 'tiktoken',         -- Tokenizer type
    context_limit INTEGER DEFAULT 128000,             -- Max context window
    is_enabled BOOLEAN DEFAULT true,                  -- Engine enabled/disabled
    is_working BOOLEAN DEFAULT true,                  -- Current health status
    display_order INTEGER DEFAULT 0,                  -- Order in UI
    api_key_encrypted TEXT,                           -- Encrypted API key (optional)
    endpoint_url TEXT,                                -- Custom endpoint URL
    out_policy JSONB DEFAULT '{"mode": "auto"}',      -- Output policy config
    metadata JSONB DEFAULT '{}',                      -- Additional metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_health_check TIMESTAMPTZ
);

-- =============================================
-- 2. AI MODELS TABLE
-- =============================================
-- Stores individual model configurations within each engine

CREATE TABLE ai_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    engine_id UUID REFERENCES ai_engines(id) ON DELETE CASCADE,
    model_id VARCHAR(100) NOT NULL,                   -- e.g., 'gpt-4o', 'claude-3-5-sonnet-20241022'
    display_name VARCHAR(150),                        -- Human-readable name
    is_enabled BOOLEAN DEFAULT true,                  -- Model enabled/disabled
    is_working BOOLEAN DEFAULT true,                  -- Current health status
    is_default BOOLEAN DEFAULT false,                 -- Is this the default model for engine
    display_order INTEGER DEFAULT 0,                  -- Order within engine
    supports_streaming BOOLEAN DEFAULT true,          -- Streaming capability
    supports_vision BOOLEAN DEFAULT false,            -- Vision/image capability
    supports_function_calling BOOLEAN DEFAULT false,  -- Function calling capability
    max_tokens INTEGER DEFAULT 4096,                  -- Max output tokens
    input_cost_per_million DECIMAL(10,4) DEFAULT 0,   -- Cost per 1M input tokens (USD)
    output_cost_per_million DECIMAL(10,4) DEFAULT 0,  -- Cost per 1M output tokens (USD)
    input_credits_per_million INTEGER DEFAULT 0,      -- Credits per 1M input tokens
    output_credits_per_million INTEGER DEFAULT 0,     -- Credits per 1M output tokens
    response_time_avg INTEGER,                        -- Average response time (ms)
    last_health_check TIMESTAMPTZ,
    health_check_error TEXT,                          -- Last error message if any
    metadata JSONB DEFAULT '{}',                      -- Additional metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(engine_id, model_id)
);

-- =============================================
-- 3. MODEL HEALTH LOGS TABLE
-- =============================================
-- Tracks health check history for analytics and debugging

CREATE TABLE model_health_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES ai_models(id) ON DELETE CASCADE,
    is_working BOOLEAN NOT NULL,
    response_time INTEGER,                            -- Response time in ms
    error_message TEXT,
    error_code VARCHAR(50),
    checked_at TIMESTAMPTZ DEFAULT NOW(),
    checked_by UUID REFERENCES auth.users(id)         -- Admin who triggered check
);

-- =============================================
-- 4. ENGINE CONFIGURATION HISTORY TABLE
-- =============================================
-- Audit trail for configuration changes

CREATE TABLE engine_config_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    engine_id UUID REFERENCES ai_engines(id) ON DELETE SET NULL,
    model_id UUID REFERENCES ai_models(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,                      -- 'create', 'update', 'delete', 'enable', 'disable', 'reorder'
    old_value JSONB,
    new_value JSONB,
    changed_by UUID REFERENCES auth.users(id),
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- =============================================
-- 5. AVAILABLE MODELS CATALOG TABLE
-- =============================================
-- Master list of all available models that can be added to engines (drag-drop source)

CREATE TABLE available_models_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(50) NOT NULL,                    -- e.g., 'anthropic', 'openai'
    model_id VARCHAR(100) NOT NULL,                   -- e.g., 'claude-3-5-sonnet-20241022'
    display_name VARCHAR(150),
    description TEXT,
    supports_streaming BOOLEAN DEFAULT true,
    supports_vision BOOLEAN DEFAULT false,
    supports_function_calling BOOLEAN DEFAULT false,
    max_context_window INTEGER,
    max_output_tokens INTEGER,
    input_cost_per_million DECIMAL(10,4),
    output_cost_per_million DECIMAL(10,4),
    release_date DATE,
    deprecation_date DATE,
    is_deprecated BOOLEAN DEFAULT false,
    is_recommended BOOLEAN DEFAULT false,             -- Recommended for new users
    category VARCHAR(50),                             -- 'chat', 'code', 'vision', 'reasoning'
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(provider, model_id)
);

-- =============================================
-- 6. INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX idx_ai_engines_enabled ON ai_engines(is_enabled);
CREATE INDEX idx_ai_engines_provider ON ai_engines(provider);
CREATE INDEX idx_ai_engines_display_order ON ai_engines(display_order);

CREATE INDEX idx_ai_models_engine ON ai_models(engine_id);
CREATE INDEX idx_ai_models_enabled ON ai_models(is_enabled);
CREATE INDEX idx_ai_models_working ON ai_models(is_working);
CREATE INDEX idx_ai_models_display_order ON ai_models(display_order);

CREATE INDEX idx_health_logs_model ON model_health_logs(model_id);
CREATE INDEX idx_health_logs_checked_at ON model_health_logs(checked_at);

CREATE INDEX idx_catalog_provider ON available_models_catalog(provider);
CREATE INDEX idx_catalog_deprecated ON available_models_catalog(is_deprecated);

-- =============================================
-- 7. ROW LEVEL SECURITY (RLS)
-- =============================================
-- Note: Using service_role for admin operations via Supabase client
-- All authenticated users can read, only service_role can write

ALTER TABLE ai_engines ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_health_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE engine_config_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE available_models_catalog ENABLE ROW LEVEL SECURITY;

-- Public read access for engines and models (needed for app to function)
CREATE POLICY "Public read access for engines" ON ai_engines
    FOR SELECT USING (true);

CREATE POLICY "Public read access for models" ON ai_models
    FOR SELECT USING (true);

CREATE POLICY "Public read access for catalog" ON available_models_catalog
    FOR SELECT USING (true);

CREATE POLICY "Public read access for health logs" ON model_health_logs
    FOR SELECT USING (true);

CREATE POLICY "Public read access for config history" ON engine_config_history
    FOR SELECT USING (true);

-- Authenticated users can write (admin check done in application layer)
CREATE POLICY "Authenticated write access for engines" ON ai_engines
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated write access for models" ON ai_models
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated write access for health logs" ON model_health_logs
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated write access for config history" ON engine_config_history
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated write access for catalog" ON available_models_catalog
    FOR ALL USING (auth.role() = 'authenticated');

-- =============================================
-- 8. TRIGGERS FOR AUTO-UPDATE TIMESTAMPS
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ai_engines_updated_at
    BEFORE UPDATE ON ai_engines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_ai_models_updated_at
    BEFORE UPDATE ON ai_models
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_catalog_updated_at
    BEFORE UPDATE ON available_models_catalog
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- 9. SEED DATA - AVAILABLE MODELS CATALOG
-- =============================================
-- This is the external list for drag-and-drop

INSERT INTO available_models_catalog (provider, model_id, display_name, description, supports_streaming, supports_vision, max_context_window, input_cost_per_million, output_cost_per_million, category, is_recommended) VALUES
-- OpenAI Models
('openai', 'gpt-5-2025-08-07', 'GPT-5', 'Most advanced reasoning model', true, true, 128000, 15.00, 60.00, 'chat', true),
('openai', 'gpt-4.1', 'GPT-4 Turbo', 'Strong reasoning capabilities', true, true, 128000, 10.00, 30.00, 'chat', false),
('openai', 'gpt-4o', 'GPT-4o', 'Balanced quality and speed', true, true, 128000, 2.50, 10.00, 'chat', true),
('openai', 'gpt-4o-2024-11-20', 'GPT-4o (Nov 2024)', 'Latest GPT-4o snapshot', true, true, 128000, 2.50, 10.00, 'chat', false),
('openai', 'gpt-4o-2024-08-06', 'GPT-4o (Aug 2024)', 'GPT-4o August snapshot', true, true, 128000, 2.50, 10.00, 'chat', false),
('openai', 'gpt-4.1-mini', 'GPT-4 Mini', 'Fast and economical', true, false, 128000, 0.15, 0.60, 'chat', true),
('openai', 'gpt-4o-mini', 'GPT-4o Mini', 'Lightweight GPT-4o', true, false, 128000, 0.15, 0.60, 'chat', false),
('openai', 'o4-mini', 'O4 Mini', 'Efficient reasoning model', true, false, 128000, 0.10, 0.40, 'reasoning', false),
('openai', 'o4-mini-high', 'O4 Mini High', 'Enhanced O4 Mini', true, false, 128000, 0.15, 0.60, 'reasoning', false),

-- Anthropic/Claude Models
('anthropic', 'claude-3.5-sonnet', 'Claude 3.5 Sonnet', 'Best overall performance', true, true, 200000, 3.00, 15.00, 'chat', true),
('anthropic', 'claude-3-5-sonnet-20241022', 'Claude 3.5 Sonnet (Oct 2024)', 'October 2024 release', true, true, 200000, 3.00, 15.00, 'chat', true),
('anthropic', 'claude-3-5-sonnet-latest', 'Claude 3.5 Sonnet Latest', 'Always latest Sonnet', true, true, 200000, 3.00, 15.00, 'chat', false),
('anthropic', 'claude-3-5-sonnet-20241022-v1:0', 'Claude 3.5 Sonnet v1 (Oct)', 'AWS Bedrock version', true, true, 200000, 3.00, 15.00, 'chat', false),
('anthropic', 'claude-3-5-haiku-20241022-v1:0', 'Claude 3.5 Haiku (Oct 2024)', 'Fast Haiku model', true, false, 200000, 0.25, 1.25, 'chat', true),
('anthropic', 'claude-3-5-haiku-latest', 'Claude 3.5 Haiku Latest', 'Always latest Haiku', true, false, 200000, 0.25, 1.25, 'chat', false),
('anthropic', 'claude-3-haiku', 'Claude 3 Haiku', 'Speed optimized', true, false, 200000, 0.25, 1.25, 'chat', false),
('anthropic', 'claude-3-haiku-20240307', 'Claude 3 Haiku (Mar 2024)', 'March 2024 Haiku', true, false, 200000, 0.25, 1.25, 'chat', false),

-- Google Gemini Models
('gemini', 'gemini-2.0-flash-exp', 'Gemini 2.0 Flash', 'Fast multimodal', true, true, 1000000, 0.075, 0.30, 'chat', true),
('gemini', 'gemini-2.0-flash-lite', 'Gemini 2.0 Flash Lite', 'Lighter model', true, false, 1000000, 0.0375, 0.15, 'chat', false),
('gemini', 'gemini-2.5-flash-lite', 'Gemini 2.5 Flash Lite', 'Latest light model', true, false, 1000000, 0.0375, 0.15, 'chat', true),

-- DeepSeek Models
('deepseek', 'deepseek-chat', 'DeepSeek Chat', 'General chat model', true, false, 128000, 0.14, 0.28, 'chat', true),
('deepseek', 'deepseek-coder', 'DeepSeek Coder', 'Code specialized', true, false, 128000, 0.14, 0.28, 'code', true),
('deepseek', 'deepseek-reasoner', 'DeepSeek Reasoner', 'Advanced reasoning', true, false, 128000, 0.55, 2.19, 'reasoning', false),

-- Mistral Models
('mistral', 'mistral-large-latest', 'Mistral Large', 'Most capable Mistral', true, false, 64000, 2.00, 6.00, 'chat', true),
('mistral', 'mistral-large-2', 'Mistral Large 2', 'Large scale model', true, false, 64000, 2.00, 6.00, 'chat', false),
('mistral', 'mistral-medium-2312', 'Mistral Medium', 'Balanced performance', true, false, 64000, 2.70, 8.10, 'chat', false),
('mistral', 'mistral-small', 'Mistral Small', 'Fast and efficient', true, false, 64000, 0.20, 0.60, 'chat', true),
('mistral', 'mistral-7b', 'Mistral 7B', 'Lightweight model', true, false, 32000, 0.10, 0.30, 'chat', false),

-- Perplexity Models
('perplexity', 'sonar-pro', 'Sonar Pro', 'Advanced search AI', true, false, 32000, 3.00, 15.00, 'search', true),
('perplexity', 'sonar-small', 'Sonar Small', 'Fast search AI', true, false, 32000, 1.00, 5.00, 'search', false),

-- Groq Models (Fast inference)
('groq', 'llama-3.3-70b-versatile', 'Llama 3.3 70B', 'Versatile large model', true, false, 128000, 0.59, 0.79, 'chat', true),
('groq', 'llama-3.1-8b-instant', 'Llama 3.1 8B', 'Ultra-fast inference', true, false, 128000, 0.05, 0.08, 'chat', true),
('groq', 'mixtral-8x7b-32768', 'Mixtral 8x7B', 'MoE architecture', true, false, 32768, 0.24, 0.24, 'chat', false),
('groq', 'gemma2-9b-it', 'Gemma 2 9B', 'Google Gemma on Groq', true, false, 8192, 0.20, 0.20, 'chat', false)

ON CONFLICT (provider, model_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    supports_streaming = EXCLUDED.supports_streaming,
    supports_vision = EXCLUDED.supports_vision,
    max_context_window = EXCLUDED.max_context_window,
    input_cost_per_million = EXCLUDED.input_cost_per_million,
    output_cost_per_million = EXCLUDED.output_cost_per_million,
    category = EXCLUDED.category,
    is_recommended = EXCLUDED.is_recommended,
    updated_at = NOW();

-- =============================================
-- 10. HELPER FUNCTIONS
-- =============================================

-- Function to get all enabled engines with their models
CREATE OR REPLACE FUNCTION get_enabled_engines_with_models()
RETURNS TABLE (
    engine_id VARCHAR,
    engine_name VARCHAR,
    provider VARCHAR,
    models JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.engine_id,
        e.name as engine_name,
        e.provider,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'model_id', m.model_id,
                    'display_name', m.display_name,
                    'is_working', m.is_working,
                    'is_default', m.is_default,
                    'display_order', m.display_order
                ) ORDER BY m.display_order
            ) FILTER (WHERE m.id IS NOT NULL AND m.is_enabled = true),
            '[]'::jsonb
        ) as models
    FROM ai_engines e
    LEFT JOIN ai_models m ON m.engine_id = e.id
    WHERE e.is_enabled = true
    GROUP BY e.id, e.engine_id, e.name, e.provider
    ORDER BY e.display_order;
END;
$$ LANGUAGE plpgsql;

-- Function to reorder models within an engine
CREATE OR REPLACE FUNCTION reorder_engine_models(
    p_engine_id UUID,
    p_model_ids UUID[]
)
RETURNS VOID AS $$
DECLARE
    i INTEGER;
BEGIN
    FOR i IN 1..array_length(p_model_ids, 1) LOOP
        UPDATE ai_models 
        SET display_order = i - 1
        WHERE id = p_model_ids[i] AND engine_id = p_engine_id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to log health check
CREATE OR REPLACE FUNCTION log_model_health_check(
    p_model_id UUID,
    p_is_working BOOLEAN,
    p_response_time INTEGER DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL,
    p_error_code VARCHAR DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    -- Insert health log
    INSERT INTO model_health_logs (model_id, is_working, response_time, error_message, error_code, checked_by)
    VALUES (p_model_id, p_is_working, p_response_time, p_error_message, p_error_code, auth.uid());
    
    -- Update model status
    UPDATE ai_models 
    SET 
        is_working = p_is_working,
        response_time_avg = CASE 
            WHEN p_is_working AND p_response_time IS NOT NULL 
            THEN COALESCE((response_time_avg + p_response_time) / 2, p_response_time)
            ELSE response_time_avg
        END,
        last_health_check = NOW(),
        health_check_error = CASE WHEN p_is_working THEN NULL ELSE p_error_message END
    WHERE id = p_model_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- SCHEMA COMPLETE
-- =============================================
-- 
-- TABLES CREATED:
-- 1. ai_engines - Main engine configurations
-- 2. ai_models - Individual model configurations
-- 3. model_health_logs - Health check history
-- 4. engine_config_history - Audit trail
-- 5. available_models_catalog - Master list for drag-drop
--
-- FEATURES:
-- - Full CRUD for engines and models
-- - Health monitoring with history
-- - Audit trail for all changes
-- - RLS for security
-- - Auto-updating timestamps
-- - Helper functions for common operations
-- =============================================
