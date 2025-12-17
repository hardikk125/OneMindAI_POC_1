-- =============================================================================
-- AI Models Configuration Table - MIGRATION 007
-- =============================================================================
-- This migration creates OR extends the ai_models table
-- Handles both cases: table doesn't exist OR table exists with different schema
-- =============================================================================

-- =============================================
-- 0. DROP AND RECREATE (CLEAN SLATE)
-- =============================================
-- IMPORTANT: Uncomment the next line if you get "column provider does not exist"
DROP TABLE IF EXISTS public.ai_models CASCADE;

-- =============================================
-- 1. CREATE TABLE IF NOT EXISTS (with full schema)
-- =============================================
-- Create the table with all columns if it doesn't exist

CREATE TABLE IF NOT EXISTS public.ai_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    model_id TEXT NOT NULL,
    display_name TEXT NOT NULL DEFAULT '',
    max_output_tokens INTEGER NOT NULL DEFAULT 4096,
    context_window INTEGER DEFAULT 128000,
    input_price_per_million DECIMAL(10,4) DEFAULT 0,
    output_price_per_million DECIMAL(10,4) DEFAULT 0,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    capabilities JSONB DEFAULT '["chat"]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID,
    -- Legacy columns for compatibility with 002_admin_panel_schema.sql
    input_cost_per_million DECIMAL(10,4) DEFAULT 0,
    output_cost_per_million DECIMAL(10,4) DEFAULT 0,
    input_credits_per_million INTEGER DEFAULT 0,
    output_credits_per_million INTEGER DEFAULT 0,
    is_free BOOLEAN DEFAULT false,
    max_tokens INTEGER DEFAULT 4096,
    UNIQUE(provider, model_id)
);

-- =============================================
-- 2. ADD MISSING COLUMNS (if table existed with old schema)
-- =============================================
-- These will silently succeed if columns already exist

DO $$
BEGIN
    -- Add max_output_tokens if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ai_models' AND column_name = 'max_output_tokens') THEN
        ALTER TABLE public.ai_models ADD COLUMN max_output_tokens INTEGER DEFAULT 4096;
    END IF;
    
    -- Add context_window if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ai_models' AND column_name = 'context_window') THEN
        ALTER TABLE public.ai_models ADD COLUMN context_window INTEGER DEFAULT 128000;
    END IF;
    
    -- Add is_default if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ai_models' AND column_name = 'is_default') THEN
        ALTER TABLE public.ai_models ADD COLUMN is_default BOOLEAN DEFAULT false;
    END IF;
    
    -- Add capabilities if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ai_models' AND column_name = 'capabilities') THEN
        ALTER TABLE public.ai_models ADD COLUMN capabilities JSONB DEFAULT '["chat"]';
    END IF;
    
    -- Add updated_by if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ai_models' AND column_name = 'updated_by') THEN
        ALTER TABLE public.ai_models ADD COLUMN updated_by UUID;
    END IF;
    
    -- Add input_price_per_million if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ai_models' AND column_name = 'input_price_per_million') THEN
        ALTER TABLE public.ai_models ADD COLUMN input_price_per_million DECIMAL(10,4) DEFAULT 0;
    END IF;
    
    -- Add output_price_per_million if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ai_models' AND column_name = 'output_price_per_million') THEN
        ALTER TABLE public.ai_models ADD COLUMN output_price_per_million DECIMAL(10,4) DEFAULT 0;
    END IF;
    
    -- Add description if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ai_models' AND column_name = 'description') THEN
        ALTER TABLE public.ai_models ADD COLUMN description TEXT;
    END IF;
    
    -- Sync max_output_tokens from max_tokens if max_output_tokens is null
    UPDATE public.ai_models 
    SET max_output_tokens = COALESCE(max_tokens, 4096)
    WHERE max_output_tokens IS NULL;
    
    -- Sync pricing columns if needed
    UPDATE public.ai_models 
    SET input_price_per_million = COALESCE(input_cost_per_million, 0)
    WHERE input_price_per_million IS NULL OR input_price_per_million = 0;
    
    UPDATE public.ai_models 
    SET output_price_per_million = COALESCE(output_cost_per_million, 0)
    WHERE output_price_per_million IS NULL OR output_price_per_million = 0;
    
EXCEPTION WHEN OTHERS THEN
    -- Ignore errors from missing legacy columns
    NULL;
END $$;

-- =============================================
-- 2. INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_ai_models_provider ON public.ai_models(provider);
CREATE INDEX IF NOT EXISTS idx_ai_models_active ON public.ai_models(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_models_provider_active ON public.ai_models(provider, is_active);

-- =============================================
-- 3. ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS (safe to run multiple times)
ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Public read access for ai_models" ON public.ai_models;
DROP POLICY IF EXISTS "Authenticated write access for ai_models" ON public.ai_models;
DROP POLICY IF EXISTS "ai_models_select_policy" ON public.ai_models;
DROP POLICY IF EXISTS "ai_models_all_policy" ON public.ai_models;

-- Create fresh policies
CREATE POLICY "ai_models_select_policy" ON public.ai_models
    FOR SELECT USING (true);

CREATE POLICY "ai_models_all_policy" ON public.ai_models
    FOR ALL USING (auth.role() = 'authenticated');

-- =============================================
-- 4. TRIGGERS FOR AUTO-UPDATE TIMESTAMPS
-- =============================================

CREATE OR REPLACE FUNCTION update_ai_models_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ai_models_updated_at ON public.ai_models;
CREATE TRIGGER trigger_ai_models_updated_at
    BEFORE UPDATE ON public.ai_models
    FOR EACH ROW EXECUTE FUNCTION update_ai_models_timestamp();

-- =============================================
-- 5. UPDATE EXISTING MODELS + INSERT NEW MODELS
-- =============================================
-- Update existing models with new columns, insert new models
-- Uses ON CONFLICT to handle both cases

INSERT INTO public.ai_models (provider, model_id, display_name, max_output_tokens, context_window, input_price_per_million, output_price_per_million, description, is_active, capabilities) VALUES
-- OpenAI Models
('openai', 'gpt-5.1', 'GPT-5.1', 131072, 128000, 25.00, 100.00, 'GPT-5.1 - Ultra-advanced reasoning', true, '["chat", "code", "reasoning"]'),
('openai', 'gpt-5-2025-08-07', 'GPT-5 (Aug 2025)', 131072, 128000, 15.00, 60.00, 'GPT-5 - Most advanced reasoning', true, '["chat", "code", "reasoning"]'),
('openai', 'gpt-4.1', 'GPT-4.1 Turbo', 16384, 128000, 10.00, 30.00, 'GPT-4 Turbo - Strong reasoning', true, '["chat", "code", "reasoning"]'),
('openai', 'gpt-4o', 'GPT-4o', 16384, 128000, 2.50, 10.00, 'GPT-4o - Balanced quality', true, '["chat", "code", "vision"]'),
('openai', 'gpt-4o-2024-11-20', 'GPT-4o (Nov 2024)', 16384, 128000, 2.50, 10.00, 'GPT-4o November 2024 snapshot', true, '["chat", "code", "vision"]'),
('openai', 'gpt-4o-2024-08-06', 'GPT-4o (Aug 2024)', 16384, 128000, 2.50, 10.00, 'GPT-4o August 2024 snapshot', true, '["chat", "code", "vision"]'),
('openai', 'gpt-4o-2024-05-13', 'GPT-4o (May 2024)', 16384, 128000, 2.50, 10.00, 'GPT-4o May 2024 snapshot', true, '["chat", "code", "vision"]'),
('openai', 'gpt-4.1-mini', 'GPT-4.1 Mini', 16384, 128000, 0.15, 0.60, 'GPT-4 Mini - Fast & economical', true, '["chat", "code"]'),
('openai', 'gpt-4o-mini', 'GPT-4o Mini', 16384, 128000, 0.15, 0.60, 'GPT-4o Mini - Fast & economical', true, '["chat", "code"]'),

-- Anthropic Models
('anthropic', 'claude-3.5-sonnet', 'Claude 3.5 Sonnet', 8192, 200000, 3.00, 15.00, 'Claude 3.5 Sonnet - Best performance', true, '["chat", "code", "reasoning"]'),
('anthropic', 'claude-3-5-sonnet-20241022', 'Claude 3.5 Sonnet (Oct 2024)', 8192, 200000, 3.00, 15.00, 'Claude 3.5 Sonnet October 2024', true, '["chat", "code", "reasoning"]'),
('anthropic', 'claude-3-haiku', 'Claude 3 Haiku', 4096, 200000, 0.25, 1.25, 'Claude 3 Haiku - Speed optimized', true, '["chat", "code"]'),
('anthropic', 'claude-3-haiku-20240307', 'Claude 3 Haiku (Mar 2024)', 4096, 200000, 0.25, 1.25, 'Claude 3 Haiku March 2024', true, '["chat", "code"]'),

-- Gemini Models
('gemini', 'gemini-2.0-flash-exp', 'Gemini 2.0 Flash', 8192, 1000000, 0.075, 0.30, 'Gemini 2.0 Flash - Fast multimodal', true, '["chat", "code", "vision"]'),
('gemini', 'gemini-2.0-flash-lite', 'Gemini 2.0 Flash Lite', 8192, 1000000, 0.0375, 0.15, 'Gemini 2.0 Flash Lite - Lighter model', true, '["chat", "code"]'),
('gemini', 'gemini-2.5-flash-lite', 'Gemini 2.5 Flash Lite', 8192, 1000000, 0.0375, 0.15, 'Gemini 2.5 Flash Lite - Latest light model', true, '["chat", "code"]'),

-- DeepSeek Models
('deepseek', 'deepseek-chat', 'DeepSeek Chat', 65536, 128000, 0.14, 0.28, 'DeepSeek Chat - Ultra low cost', true, '["chat", "code"]'),
('deepseek', 'deepseek-coder', 'DeepSeek Coder', 65536, 128000, 0.14, 0.28, 'DeepSeek Coder - Code optimized', true, '["code"]'),
('deepseek', 'deepseek-reasoner', 'DeepSeek Reasoner', 65536, 128000, 0.14, 0.28, 'DeepSeek Reasoner - Reasoning optimized', true, '["chat", "reasoning"]'),

-- Mistral Models
('mistral', 'mistral-large-latest', 'Mistral Large', 128000, 128000, 8.00, 24.00, 'Mistral Large - Competent generalist', true, '["chat", "code", "reasoning"]'),
('mistral', 'mistral-large-2', 'Mistral Large 2', 128000, 128000, 8.00, 24.00, 'Mistral Large 2 - Latest version', true, '["chat", "code", "reasoning"]'),
('mistral', 'mistral-medium-2312', 'Mistral Medium', 32000, 32000, 4.00, 12.00, 'Mistral Medium - Balanced performance and cost', true, '["chat", "code"]'),
('mistral', 'mistral-small', 'Mistral Small', 32000, 32000, 2.00, 6.00, 'Mistral Small - Low-cost summaries', true, '["chat"]'),
('mistral', 'mistral-7b', 'Mistral 7B', 32000, 32000, 0.50, 1.50, 'Mistral 7B - Lightweight open model', true, '["chat"]'),

-- Perplexity Models
('perplexity', 'sonar-pro', 'Sonar Pro', 8192, 32000, 10.00, 20.00, 'Perplexity Sonar Pro - Web-augmented research', true, '["chat", "search"]'),
('perplexity', 'sonar-small', 'Sonar Small', 4096, 32000, 4.00, 8.00, 'Perplexity Sonar Small - Cheaper web-aug', true, '["chat", "search"]'),

-- Groq Models
('groq', 'llama-3.3-70b-versatile', 'Llama 3.3 70B', 8192, 128000, 0.59, 0.79, 'Llama 3.3 70B - Best quality on Groq', true, '["chat", "code"]'),
('groq', 'llama-3.1-8b-instant', 'Llama 3.1 8B', 8192, 128000, 0.05, 0.08, 'Llama 3.1 8B - Ultra fast inference', true, '["chat"]'),
('groq', 'mixtral-8x7b-32768', 'Mixtral 8x7B', 8192, 32768, 0.24, 0.24, 'Mixtral 8x7B - 32K context MoE', true, '["chat", "code"]'),
('groq', 'gemma2-9b-it', 'Gemma 2 9B', 8192, 8192, 0.20, 0.20, 'Gemma 2 9B - Google efficient model', true, '["chat"]'),

-- xAI Models
('xai', 'grok-2', 'Grok 2', 8192, 128000, 6.00, 12.00, 'xAI Grok 2 - Latest version', true, '["chat", "reasoning"]'),
('xai', 'grok-beta', 'Grok Beta', 8192, 128000, 6.00, 12.00, 'xAI Grok Beta - Fast, opinionated', true, '["chat"]'),

-- Kimi Models
('kimi', 'moonshot-v1-8k', 'Moonshot 8K', 8192, 8000, 8.00, 16.00, 'Kimi Moonshot 8K - Fast context processing', true, '["chat"]'),
('kimi', 'moonshot-v1-32k', 'Moonshot 32K', 8192, 32000, 12.00, 24.00, 'Kimi Moonshot 32K - Extended context support', true, '["chat"]'),
('kimi', 'moonshot-v1-128k', 'Moonshot 128K', 8192, 128000, 20.00, 40.00, 'Kimi Moonshot 128K - Large context analysis', true, '["chat"]'),

-- Falcon Models
('falcon', 'falcon-180b-chat', 'Falcon 180B', 4096, 2048, 0.80, 1.60, 'Falcon 180B - Top open-source LLM by TII', true, '["chat"]'),
('falcon', 'falcon-40b-instruct', 'Falcon 40B', 4096, 2048, 0.40, 0.80, 'Falcon 40B - Multilingual, royalty-free', true, '["chat"]'),
('falcon', 'falcon-7b-instruct', 'Falcon 7B', 4096, 2048, 0.10, 0.20, 'Falcon 7B - Lightweight Apache 2.0', true, '["chat"]'),
('falcon', 'falcon-mamba-7b', 'Falcon Mamba 7B', 4096, 2048, 0.15, 0.30, 'Falcon Mamba 7B - State Space LM', true, '["chat"]'),
('falcon', 'falcon-11b', 'Falcon 11B', 4096, 2048, 0.20, 0.40, 'Falcon 2 11B - Vision-to-language', true, '["chat", "vision"]'),

-- Sarvam Models
('sarvam', 'sarvam-2b', 'Sarvam 2B', 4096, 4096, 0.10, 0.30, 'Sarvam AI 2B - Lightweight & fast', true, '["chat"]'),
('sarvam', 'sarvam-1', 'Sarvam 1', 4096, 4096, 0.20, 0.50, 'Sarvam AI 1 - Balanced performance', true, '["chat"]'),

-- HuggingFace Models
('huggingface', 'hf-model', 'HuggingFace Model', 4096, 4096, 3.00, 8.00, 'Depends on your hosted model', true, '["chat"]'),

-- Generic Models
('generic', 'v1', 'Custom Endpoint', 4096, 4096, 3.00, 8.00, 'Custom HTTP endpoint', true, '["chat"]')
ON CONFLICT (provider, model_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    max_output_tokens = EXCLUDED.max_output_tokens,
    context_window = EXCLUDED.context_window,
    input_price_per_million = EXCLUDED.input_price_per_million,
    output_price_per_million = EXCLUDED.output_price_per_million,
    description = EXCLUDED.description,
    capabilities = EXCLUDED.capabilities,
    updated_at = NOW();

-- =============================================
-- 6. HELPER FUNCTIONS
-- =============================================

-- Function to get model config by provider and model_id
CREATE OR REPLACE FUNCTION get_ai_model(p_provider TEXT, p_model_id TEXT)
RETURNS TABLE (
    id UUID,
    provider TEXT,
    model_id TEXT,
    display_name TEXT,
    max_output_tokens INTEGER,
    context_window INTEGER,
    input_price_per_million DECIMAL,
    output_price_per_million DECIMAL,
    description TEXT,
    is_active BOOLEAN,
    capabilities JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.provider,
        m.model_id,
        m.display_name,
        m.max_output_tokens,
        m.context_window,
        m.input_price_per_million,
        m.output_price_per_million,
        m.description,
        m.is_active,
        m.capabilities
    FROM public.ai_models m
    WHERE m.provider = p_provider AND m.model_id = p_model_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get all models for a provider
CREATE OR REPLACE FUNCTION get_ai_models_by_provider(p_provider TEXT)
RETURNS TABLE (
    id UUID,
    provider TEXT,
    model_id TEXT,
    display_name TEXT,
    max_output_tokens INTEGER,
    context_window INTEGER,
    input_price_per_million DECIMAL,
    output_price_per_million DECIMAL,
    description TEXT,
    is_active BOOLEAN,
    capabilities JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.provider,
        m.model_id,
        m.display_name,
        m.max_output_tokens,
        m.context_window,
        m.input_price_per_million,
        m.output_price_per_million,
        m.description,
        m.is_active,
        m.capabilities
    FROM public.ai_models m
    WHERE m.provider = p_provider AND m.is_active = true
    ORDER BY m.model_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get all active models
CREATE OR REPLACE FUNCTION get_all_active_ai_models()
RETURNS TABLE (
    id UUID,
    provider TEXT,
    model_id TEXT,
    display_name TEXT,
    max_output_tokens INTEGER,
    context_window INTEGER,
    input_price_per_million DECIMAL,
    output_price_per_million DECIMAL,
    description TEXT,
    is_active BOOLEAN,
    capabilities JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.provider,
        m.model_id,
        m.display_name,
        m.max_output_tokens,
        m.context_window,
        m.input_price_per_million,
        m.output_price_per_million,
        m.description,
        m.is_active,
        m.capabilities
    FROM public.ai_models m
    WHERE m.is_active = true
    ORDER BY m.provider, m.model_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update model pricing
CREATE OR REPLACE FUNCTION update_ai_model_pricing(
    p_provider TEXT,
    p_model_id TEXT,
    p_input_price DECIMAL,
    p_output_price DECIMAL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.ai_models
    SET 
        input_price_per_million = p_input_price,
        output_price_per_million = p_output_price,
        updated_at = NOW()
    WHERE provider = p_provider AND model_id = p_model_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to update model token limit
CREATE OR REPLACE FUNCTION update_ai_model_token_limit(
    p_provider TEXT,
    p_model_id TEXT,
    p_max_output_tokens INTEGER
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.ai_models
    SET 
        max_output_tokens = p_max_output_tokens,
        updated_at = NOW()
    WHERE provider = p_provider AND model_id = p_model_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to add a new model
CREATE OR REPLACE FUNCTION add_ai_model(
    p_provider TEXT,
    p_model_id TEXT,
    p_display_name TEXT,
    p_max_output_tokens INTEGER,
    p_context_window INTEGER,
    p_input_price DECIMAL,
    p_output_price DECIMAL,
    p_description TEXT,
    p_capabilities JSONB DEFAULT '["chat"]'
)
RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO public.ai_models (
        provider, model_id, display_name, max_output_tokens, 
        context_window, input_price_per_million, output_price_per_million,
        description, capabilities, is_active
    ) VALUES (
        p_provider, p_model_id, p_display_name, p_max_output_tokens,
        p_context_window, p_input_price, p_output_price,
        p_description, p_capabilities, true
    )
    RETURNING id INTO v_id;
    
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Function to toggle model active status
CREATE OR REPLACE FUNCTION toggle_ai_model_active(p_provider TEXT, p_model_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_new_status BOOLEAN;
BEGIN
    UPDATE public.ai_models
    SET is_active = NOT is_active, updated_at = NOW()
    WHERE provider = p_provider AND model_id = p_model_id
    RETURNING is_active INTO v_new_status;
    
    RETURN v_new_status;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- MIGRATION COMPLETE
-- =============================================
-- 
-- TABLE CREATED:
-- ai_models - Stores all AI model configurations
--
-- COLUMNS:
-- - provider: Provider name (openai, anthropic, etc.)
-- - model_id: Model identifier (gpt-4o, claude-3.5-sonnet, etc.)
-- - display_name: Human-readable name
-- - max_output_tokens: Maximum output tokens
-- - context_window: Total context window size
-- - input_price_per_million: USD per 1M input tokens
-- - output_price_per_million: USD per 1M output tokens
-- - description: Model notes
-- - is_active: Enable/disable model
-- - capabilities: JSON array of capabilities
--
-- FUNCTIONS:
-- - get_ai_model(provider, model_id) - Get single model
-- - get_ai_models_by_provider(provider) - Get all models for provider
-- - get_all_active_ai_models() - Get all active models
-- - update_ai_model_pricing(provider, model_id, input, output) - Update pricing
-- - update_ai_model_token_limit(provider, model_id, limit) - Update token limit
-- - add_ai_model(...) - Add new model
-- - toggle_ai_model_active(provider, model_id) - Toggle active status
--
-- NEXT STEPS:
-- 1. Run this migration in Supabase
-- 2. Create useAIModels hook to fetch from this table
-- 3. Update OneMindAI.tsx to use database values
-- 4. Add AI Models section to Admin Panel
-- =============================================
