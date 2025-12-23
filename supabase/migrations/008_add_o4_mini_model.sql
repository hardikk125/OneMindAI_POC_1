-- =============================================================================
-- Add o4-mini-2025-04-16 Model - MIGRATION 008
-- =============================================================================
-- This migration adds the new OpenAI o4-mini model to the ai_models table
-- =============================================================================

INSERT INTO public.ai_models (
    provider, 
    model_id, 
    display_name, 
    max_output_tokens, 
    context_window, 
    input_price_per_million, 
    output_price_per_million, 
    description, 
    is_active, 
    capabilities
) VALUES (
    'openai',
    'o4-mini-2025-04-16',
    'O4 Mini (Apr 2025)',
    16384,
    128000,
    0.15,
    0.60,
    'O4 Mini - Fast and economical reasoning model',
    true,
    '["chat", "code", "reasoning"]'
)
ON CONFLICT (provider, model_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    max_output_tokens = EXCLUDED.max_output_tokens,
    context_window = EXCLUDED.context_window,
    input_price_per_million = EXCLUDED.input_price_per_million,
    output_price_per_million = EXCLUDED.output_price_per_million,
    description = EXCLUDED.description,
    capabilities = EXCLUDED.capabilities,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();
