-- =============================================================================
-- Engine UI Configuration Schema
-- =============================================================================
-- This schema enables admin control over engine card UI elements and info text
-- Run this migration in your Supabase SQL editor
-- =============================================================================

-- =============================================
-- 1. ENGINE UI CONFIGURATION TABLE
-- =============================================
-- Controls visibility of UI elements in engine cards

CREATE TABLE IF NOT EXISTS engine_ui_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Global UI Settings (applies to all engines)
    show_api_key_field BOOLEAN DEFAULT true,           -- Show/hide API key input
    show_output_policy_field BOOLEAN DEFAULT true,     -- Show/hide output policy dropdown
    show_price_override_fields BOOLEAN DEFAULT true,   -- Show/hide price in/out inputs
    show_version_dropdown BOOLEAN DEFAULT true,        -- Show/hide model version selector
    show_technical_details BOOLEAN DEFAULT true,       -- Show/hide technical token info
    show_health_indicator BOOLEAN DEFAULT true,        -- Show/hide green health dot
    show_context_info BOOLEAN DEFAULT true,            -- Show/hide context limit info
    
    -- Info Text Mode
    info_display_mode VARCHAR(20) DEFAULT 'simple',    -- 'simple', 'detailed', 'none'
    
    -- Metadata
    updated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 2. ENGINE INFO TEXT TABLE
-- =============================================
-- Stores descriptive info text for each engine and model

CREATE TABLE IF NOT EXISTS engine_info_text (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    engine_id VARCHAR(50) NOT NULL,                    -- e.g., 'openai', 'claude', 'gemini', 'deepseek'
    
    -- Engine-level info
    engine_tagline VARCHAR(200),                       -- Short tagline e.g., "Most advanced reasoning"
    engine_description TEXT,                           -- Detailed description
    best_for TEXT[],                                   -- Array of use cases e.g., ['Complex reasoning', 'Code generation']
    strengths TEXT[],                                  -- Key strengths
    considerations TEXT[],                             -- Things to consider
    
    -- Display settings
    is_featured BOOLEAN DEFAULT false,                 -- Highlight this engine
    badge_text VARCHAR(50),                            -- e.g., 'BEST', 'NEW', 'FAST'
    badge_color VARCHAR(20) DEFAULT 'yellow',          -- Badge color
    
    -- Metadata
    display_order INTEGER DEFAULT 0,
    is_enabled BOOLEAN DEFAULT true,
    updated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(engine_id)
);

-- =============================================
-- 3. MODEL INFO TEXT TABLE
-- =============================================
-- Stores descriptive info for individual models within engines

CREATE TABLE IF NOT EXISTS model_info_text (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    engine_id VARCHAR(50) NOT NULL,                    -- Parent engine
    model_id VARCHAR(100) NOT NULL,                    -- e.g., 'gpt-4o', 'claude-3-5-sonnet'
    
    -- Model-level info
    model_tagline VARCHAR(200),                        -- Short description
    model_description TEXT,                            -- Detailed description
    best_for TEXT[],                                   -- Specific use cases
    speed_rating VARCHAR(20) DEFAULT 'medium',         -- 'fast', 'medium', 'slow'
    quality_rating VARCHAR(20) DEFAULT 'high',         -- 'standard', 'high', 'premium'
    cost_rating VARCHAR(20) DEFAULT 'medium',          -- 'budget', 'medium', 'premium'
    
    -- Capabilities
    supports_vision BOOLEAN DEFAULT false,
    supports_code BOOLEAN DEFAULT true,
    supports_reasoning BOOLEAN DEFAULT true,
    supports_creative BOOLEAN DEFAULT true,
    supports_analysis BOOLEAN DEFAULT true,
    
    -- Display
    is_recommended BOOLEAN DEFAULT false,
    is_new BOOLEAN DEFAULT false,
    is_deprecated BOOLEAN DEFAULT false,
    
    -- Metadata
    display_order INTEGER DEFAULT 0,
    is_enabled BOOLEAN DEFAULT true,
    updated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(engine_id, model_id)
);

-- =============================================
-- 4. INSERT DEFAULT UI CONFIG
-- =============================================

INSERT INTO engine_ui_config (
    show_api_key_field,
    show_output_policy_field,
    show_price_override_fields,
    show_version_dropdown,
    show_technical_details,
    show_health_indicator,
    show_context_info,
    info_display_mode
) VALUES (
    true,   -- show_api_key_field (can be hidden by admin)
    true,   -- show_output_policy_field
    true,   -- show_price_override_fields
    true,   -- show_version_dropdown
    true,   -- show_technical_details
    true,   -- show_health_indicator
    true,   -- show_context_info
    'simple' -- info_display_mode
) ON CONFLICT DO NOTHING;

-- =============================================
-- 5. INSERT DEFAULT ENGINE INFO TEXT
-- =============================================
-- Based on web research for top 4 engines

-- OpenAI / ChatGPT
INSERT INTO engine_info_text (
    engine_id,
    engine_tagline,
    engine_description,
    best_for,
    strengths,
    considerations,
    is_featured,
    badge_text,
    badge_color,
    display_order
) VALUES (
    'openai',
    'Industry-leading AI with advanced reasoning and multimodal capabilities',
    'OpenAI''s GPT models are the most widely adopted AI systems, known for exceptional instruction following, coding abilities, and creative writing. GPT-4o and GPT-4.1 offer multimodal capabilities (text, images, audio) with up to 1M token context windows.',
    ARRAY['Complex reasoning tasks', 'Code generation & debugging', 'Creative writing', 'Data analysis', 'Multimodal tasks (images + text)', 'Long document processing'],
    ARRAY['Best-in-class instruction following', 'Excellent coding capabilities', 'Strong reasoning and analysis', 'Native multimodal support', 'Largest context windows (up to 1M tokens)', 'Most extensive API ecosystem'],
    ARRAY['Higher cost than some alternatives', 'Rate limits on free tier', 'May require prompt optimization for best results'],
    true,
    'MOST POPULAR',
    'blue',
    1
) ON CONFLICT (engine_id) DO UPDATE SET
    engine_tagline = EXCLUDED.engine_tagline,
    engine_description = EXCLUDED.engine_description,
    best_for = EXCLUDED.best_for,
    strengths = EXCLUDED.strengths,
    considerations = EXCLUDED.considerations,
    updated_at = NOW();

-- Anthropic / Claude
INSERT INTO engine_info_text (
    engine_id,
    engine_tagline,
    engine_description,
    best_for,
    strengths,
    considerations,
    is_featured,
    badge_text,
    badge_color,
    display_order
) VALUES (
    'claude',
    'Thoughtful AI assistant with exceptional safety and nuanced understanding',
    'Claude by Anthropic excels at nuanced, thoughtful responses with strong safety guardrails. Claude 3.5 Sonnet outperforms competitors on many benchmarks while being 2x faster than Claude 3 Opus. Known for excellent long-context comprehension and coding abilities.',
    ARRAY['Nuanced analysis & research', 'Long document summarization', 'Code review & generation', 'Academic writing', 'Ethical reasoning', 'Complex instruction following'],
    ARRAY['200K token context window', 'Excellent safety and alignment', 'Superior long-context understanding', 'Strong coding abilities', 'Thoughtful, nuanced responses', 'Fast response times (Sonnet)'],
    ARRAY['Slightly more conservative responses', 'May decline certain edge cases', 'Smaller model selection than OpenAI'],
    true,
    'BEST SAFETY',
    'purple',
    2
) ON CONFLICT (engine_id) DO UPDATE SET
    engine_tagline = EXCLUDED.engine_tagline,
    engine_description = EXCLUDED.engine_description,
    best_for = EXCLUDED.best_for,
    strengths = EXCLUDED.strengths,
    considerations = EXCLUDED.considerations,
    updated_at = NOW();

-- Google / Gemini
INSERT INTO engine_info_text (
    engine_id,
    engine_tagline,
    engine_description,
    best_for,
    strengths,
    considerations,
    is_featured,
    badge_text,
    badge_color,
    display_order
) VALUES (
    'gemini',
    'Google''s multimodal AI with massive context and native tool use',
    'Gemini 2.0 is Google''s most capable AI model family, featuring native image/audio output and tool use. Gemini 2.5 Flash offers the best balance of speed and cost, while Pro delivers state-of-the-art reasoning. Supports up to 1M token context.',
    ARRAY['Multimodal tasks (text, images, audio, video)', 'Large document analysis', 'Research and fact-checking', 'Code generation', 'Real-time information tasks', 'Cost-effective high-volume workloads'],
    ARRAY['1M token context window', 'Native multimodal capabilities', 'Excellent cost-efficiency (Flash)', 'Strong reasoning (Pro)', 'Built-in Google Search integration', 'Fast inference speeds'],
    ARRAY['Newer ecosystem than OpenAI', 'Some features still in preview', 'Regional availability varies'],
    true,
    'BEST VALUE',
    'green',
    3
) ON CONFLICT (engine_id) DO UPDATE SET
    engine_tagline = EXCLUDED.engine_tagline,
    engine_description = EXCLUDED.engine_description,
    best_for = EXCLUDED.best_for,
    strengths = EXCLUDED.strengths,
    considerations = EXCLUDED.considerations,
    updated_at = NOW();

-- DeepSeek
INSERT INTO engine_info_text (
    engine_id,
    engine_tagline,
    engine_description,
    best_for,
    strengths,
    considerations,
    is_featured,
    badge_text,
    badge_color,
    display_order
) VALUES (
    'deepseek',
    'Open-source powerhouse with exceptional reasoning and coding at low cost',
    'DeepSeek offers two flagship models: V3 for general-purpose tasks and R1 for advanced reasoning. R1 achieves 79.8% on AIME 2024 (vs OpenAI o1''s 79.2%) using reinforcement learning. V3 excels at knowledge tasks with 75.9% on MMLU-Pro. Extremely cost-effective.',
    ARRAY['Mathematical reasoning', 'Complex problem solving', 'Code generation & analysis', 'Scientific research', 'Cost-sensitive applications', 'Open-source deployments'],
    ARRAY['State-of-the-art reasoning (R1)', 'Exceptional cost-efficiency', '64K output token limit', 'Strong coding abilities', 'Open-source availability', 'Competitive with GPT-4 at fraction of cost'],
    ARRAY['Newer provider with smaller ecosystem', 'Some latency on complex tasks', 'Limited multimodal support'],
    true,
    'BEST REASONING',
    'orange',
    4
) ON CONFLICT (engine_id) DO UPDATE SET
    engine_tagline = EXCLUDED.engine_tagline,
    engine_description = EXCLUDED.engine_description,
    best_for = EXCLUDED.best_for,
    strengths = EXCLUDED.strengths,
    considerations = EXCLUDED.considerations,
    updated_at = NOW();

-- =============================================
-- 6. INSERT DEFAULT MODEL INFO TEXT
-- =============================================

-- OpenAI Models
INSERT INTO model_info_text (engine_id, model_id, model_tagline, best_for, speed_rating, quality_rating, cost_rating, is_recommended) VALUES
('openai', 'gpt-5-2025-08-07', 'Most advanced reasoning and instruction following', ARRAY['Complex analysis', 'Advanced coding', 'Research'], 'medium', 'premium', 'premium', true),
('openai', 'gpt-4.1', 'Improved coding and 1M context window', ARRAY['Long documents', 'Code generation', 'Analysis'], 'medium', 'premium', 'premium', false),
('openai', 'gpt-4o', 'Fast multimodal model with vision', ARRAY['Image analysis', 'Quick tasks', 'General use'], 'fast', 'high', 'medium', true),
('openai', 'gpt-4o-mini', 'Cost-effective for simple tasks', ARRAY['Simple queries', 'High volume', 'Budget tasks'], 'fast', 'standard', 'budget', false)
ON CONFLICT (engine_id, model_id) DO NOTHING;

-- Claude Models
INSERT INTO model_info_text (engine_id, model_id, model_tagline, best_for, speed_rating, quality_rating, cost_rating, is_recommended) VALUES
('claude', 'claude-3-5-sonnet-20241022', 'Best balance of speed and intelligence', ARRAY['Analysis', 'Coding', 'Writing'], 'fast', 'premium', 'medium', true),
('claude', 'claude-3-haiku-20240307', 'Fastest Claude for simple tasks', ARRAY['Quick responses', 'Simple tasks', 'High volume'], 'fast', 'standard', 'budget', false)
ON CONFLICT (engine_id, model_id) DO NOTHING;

-- Gemini Models
INSERT INTO model_info_text (engine_id, model_id, model_tagline, best_for, speed_rating, quality_rating, cost_rating, is_recommended) VALUES
('gemini', 'gemini-2.5-flash-lite', 'Most cost-effective Gemini model', ARRAY['High volume', 'Budget tasks', 'Quick responses'], 'fast', 'high', 'budget', true),
('gemini', 'gemini-2.0-flash-exp', 'Experimental with latest features', ARRAY['Multimodal', 'Tool use', 'Agentic tasks'], 'fast', 'high', 'medium', false)
ON CONFLICT (engine_id, model_id) DO NOTHING;

-- DeepSeek Models
INSERT INTO model_info_text (engine_id, model_id, model_tagline, best_for, speed_rating, quality_rating, cost_rating, is_recommended) VALUES
('deepseek', 'deepseek-chat', 'General-purpose with strong knowledge', ARRAY['General tasks', 'Knowledge queries', 'Conversation'], 'fast', 'high', 'budget', true),
('deepseek', 'deepseek-coder', 'Specialized for code generation', ARRAY['Code generation', 'Debugging', 'Code review'], 'fast', 'high', 'budget', false)
ON CONFLICT (engine_id, model_id) DO NOTHING;

-- =============================================
-- 7. CREATE INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_engine_info_text_engine_id ON engine_info_text(engine_id);
CREATE INDEX IF NOT EXISTS idx_engine_info_text_display_order ON engine_info_text(display_order);
CREATE INDEX IF NOT EXISTS idx_model_info_text_engine_id ON model_info_text(engine_id);
CREATE INDEX IF NOT EXISTS idx_model_info_text_model_id ON model_info_text(model_id);

-- =============================================
-- 8. CREATE UPDATED_AT TRIGGER
-- =============================================

CREATE OR REPLACE FUNCTION update_engine_ui_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_engine_ui_config_updated_at ON engine_ui_config;
CREATE TRIGGER trigger_engine_ui_config_updated_at
    BEFORE UPDATE ON engine_ui_config
    FOR EACH ROW
    EXECUTE FUNCTION update_engine_ui_updated_at();

DROP TRIGGER IF EXISTS trigger_engine_info_text_updated_at ON engine_info_text;
CREATE TRIGGER trigger_engine_info_text_updated_at
    BEFORE UPDATE ON engine_info_text
    FOR EACH ROW
    EXECUTE FUNCTION update_engine_ui_updated_at();

DROP TRIGGER IF EXISTS trigger_model_info_text_updated_at ON model_info_text;
CREATE TRIGGER trigger_model_info_text_updated_at
    BEFORE UPDATE ON model_info_text
    FOR EACH ROW
    EXECUTE FUNCTION update_engine_ui_updated_at();

-- =============================================
-- 9. ROW LEVEL SECURITY
-- =============================================

ALTER TABLE engine_ui_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE engine_info_text ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_info_text ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read access for engine_ui_config" ON engine_ui_config FOR SELECT USING (true);
CREATE POLICY "Public read access for engine_info_text" ON engine_info_text FOR SELECT USING (true);
CREATE POLICY "Public read access for model_info_text" ON model_info_text FOR SELECT USING (true);

-- Admin write access (requires admin role)
CREATE POLICY "Admin write access for engine_ui_config" ON engine_ui_config 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

CREATE POLICY "Admin write access for engine_info_text" ON engine_info_text 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

CREATE POLICY "Admin write access for model_info_text" ON model_info_text 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- =============================================
-- 10. HELPER FUNCTIONS
-- =============================================

-- Get UI config
CREATE OR REPLACE FUNCTION get_engine_ui_config()
RETURNS TABLE (
    show_api_key_field BOOLEAN,
    show_output_policy_field BOOLEAN,
    show_price_override_fields BOOLEAN,
    show_version_dropdown BOOLEAN,
    show_technical_details BOOLEAN,
    show_health_indicator BOOLEAN,
    show_context_info BOOLEAN,
    info_display_mode VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        euc.show_api_key_field,
        euc.show_output_policy_field,
        euc.show_price_override_fields,
        euc.show_version_dropdown,
        euc.show_technical_details,
        euc.show_health_indicator,
        euc.show_context_info,
        euc.info_display_mode
    FROM engine_ui_config euc
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get engine info with models
CREATE OR REPLACE FUNCTION get_engine_info_with_models(p_engine_id VARCHAR DEFAULT NULL)
RETURNS TABLE (
    engine_id VARCHAR,
    engine_tagline VARCHAR,
    engine_description TEXT,
    best_for TEXT[],
    strengths TEXT[],
    badge_text VARCHAR,
    badge_color VARCHAR,
    models JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        eit.engine_id,
        eit.engine_tagline,
        eit.engine_description,
        eit.best_for,
        eit.strengths,
        eit.badge_text,
        eit.badge_color,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'model_id', mit.model_id,
                    'tagline', mit.model_tagline,
                    'best_for', mit.best_for,
                    'speed_rating', mit.speed_rating,
                    'quality_rating', mit.quality_rating,
                    'cost_rating', mit.cost_rating,
                    'is_recommended', mit.is_recommended
                ) ORDER BY mit.display_order
            ) FILTER (WHERE mit.model_id IS NOT NULL),
            '[]'::jsonb
        ) as models
    FROM engine_info_text eit
    LEFT JOIN model_info_text mit ON eit.engine_id = mit.engine_id AND mit.is_enabled = true
    WHERE eit.is_enabled = true
    AND (p_engine_id IS NULL OR eit.engine_id = p_engine_id)
    GROUP BY eit.engine_id, eit.engine_tagline, eit.engine_description, 
             eit.best_for, eit.strengths, eit.badge_text, eit.badge_color, eit.display_order
    ORDER BY eit.display_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- DONE
-- =============================================
-- To use in admin panel:
-- 1. SELECT * FROM get_engine_ui_config();
-- 2. SELECT * FROM get_engine_info_with_models();
-- 3. UPDATE engine_ui_config SET show_api_key_field = false WHERE id = (SELECT id FROM engine_ui_config LIMIT 1);
-- 4. UPDATE engine_info_text SET engine_tagline = 'New tagline' WHERE engine_id = 'openai';
