-- =============================================================================
-- Add GPT-5.1 Model to OneMind AI
-- =============================================================================
-- Date: 2025-12-19
-- Purpose: Add OpenAI's new GPT-5.1 model with 400K context and 128K output

-- Add GPT-5.1 to ai_models table
INSERT INTO ai_models (
    provider,
    model_id,
    display_name,
    max_output_tokens,
    context_window,
    input_price_per_million,
    output_price_per_million,
    description,
    is_active,
    is_default,
    capabilities
) VALUES (
    'openai',
    'gpt-5.1-2025-11-13',
    'GPT-5.1',
    128000,                    -- 128K max output tokens
    400000,                    -- 400K context window
    2.50,                      -- Estimated input pricing (per million tokens)
    10.00,                     -- Estimated output pricing (per million tokens)
    'GPT-5.1 - Flagship model for coding and agentic tasks with configurable reasoning effort. 400K context window with reasoning token support.',
    true,                      -- Active by default
    false,                     -- Not default (keep gpt-4o as default for now)
    '["chat", "code", "reasoning", "agentic"]'
) ON CONFLICT (provider, model_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    max_output_tokens = EXCLUDED.max_output_tokens,
    context_window = EXCLUDED.context_window,
    description = EXCLUDED.description,
    capabilities = EXCLUDED.capabilities,
    updated_at = NOW();

-- Update OpenAI provider config to support higher output tokens
-- GPT-5.1 supports 128K output, so increase the provider cap
UPDATE provider_config 
SET max_output_cap = 128000,
    updated_at = NOW()
WHERE provider = 'openai' AND max_output_cap < 128000;

-- Log the addition
DO $$
BEGIN
  RAISE NOTICE 'Added GPT-5.1 model: 400K context, 128K output, reasoning support';
END $$;
