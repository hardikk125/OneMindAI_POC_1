-- =============================================================================
-- Set GPT-5.1 as Default OpenAI Model
-- =============================================================================
-- Date: 2025-12-19
-- Purpose: Update OpenAI provider to use GPT-5.1 as default model

-- Disable triggers to avoid admin_activity_log constraint during migration
ALTER TABLE provider_config DISABLE TRIGGER log_provider_config_change;
ALTER TABLE ai_models DISABLE TRIGGER log_ai_models_change;

-- Update provider_config to use GPT-5.1 as default
UPDATE provider_config 
SET default_model = 'gpt-5.1-2025-11-13',
    updated_at = NOW()
WHERE provider = 'openai';

-- Update ai_models to set GPT-5.1 as default and gpt-4o as non-default
UPDATE ai_models 
SET is_default = false
WHERE provider = 'openai' AND model_id = 'gpt-4o';

UPDATE ai_models 
SET is_default = true
WHERE provider = 'openai' AND model_id = 'gpt-5.1-2025-11-13';

-- Re-enable triggers after migration
ALTER TABLE provider_config ENABLE TRIGGER log_provider_config_change;
ALTER TABLE ai_models ENABLE TRIGGER log_ai_models_change;

-- Log the change
DO $$
BEGIN
  RAISE NOTICE 'Updated OpenAI default model: gpt-4o -> gpt-5.1-2025-11-13';
END $$;
