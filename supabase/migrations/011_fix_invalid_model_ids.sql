-- Migration: Fix invalid model IDs in ai_models table
-- Date: 2025-12-19
-- Issue: Some model IDs don't match actual provider API model names

-- Fix Mistral model IDs
UPDATE ai_models 
SET model_id = 'mistral-large-latest',
    display_name = 'Mistral Large Latest'
WHERE provider = 'mistral' AND model_id = 'mistral-large-2';

-- Ensure default model for Mistral provider is correct
UPDATE provider_config 
SET default_model = 'mistral-large-latest'
WHERE provider = 'mistral' AND default_model = 'mistral-large-2';

-- Valid Mistral model IDs (as of Dec 2024):
-- mistral-large-latest (most capable)
-- mistral-medium-latest
-- mistral-small-latest  
-- open-mistral-7b
-- open-mixtral-8x7b
-- open-mixtral-8x22b
-- codestral-latest

-- Log the fix
DO $$
BEGIN
  RAISE NOTICE 'Fixed invalid Mistral model IDs: mistral-large-2 -> mistral-large-latest';
END $$;
