-- Migration: Fix provider token limits to match actual API constraints
-- Date: 2025-12-19
-- Issue: max_output_cap values were incorrect, causing 400 errors

-- Update provider_config with correct max_output_cap values
-- Based on actual API documentation as of Dec 2024

UPDATE provider_config SET max_output_cap = 4096 WHERE provider = 'openai';
-- OpenAI: gpt-4o supports up to 128K context, but output is typically capped at 4096

UPDATE provider_config SET max_output_cap = 4096 WHERE provider = 'anthropic';
-- Anthropic Claude: max output is 4096 tokens

UPDATE provider_config SET max_output_cap = 8192 WHERE provider = 'gemini';
-- Google Gemini: supports up to 8192 output tokens

UPDATE provider_config SET max_output_cap = 8192 WHERE provider = 'deepseek';
-- DeepSeek: max output is 8192 tokens (NOT 65536!)

UPDATE provider_config SET max_output_cap = 32768 WHERE provider = 'mistral';
-- Mistral: supports up to 32768 output tokens

UPDATE provider_config SET max_output_cap = 8000 WHERE provider = 'groq';
-- Groq: max output is 8000 tokens

UPDATE provider_config SET max_output_cap = 4096 WHERE provider = 'perplexity';
-- Perplexity: max output is 4096 tokens

UPDATE provider_config SET max_output_cap = 8192 WHERE provider = 'xai';
-- xAI Grok: max output is 8192 tokens

UPDATE provider_config SET max_output_cap = 4096 WHERE provider = 'kimi';
-- Kimi: max output is 4096 tokens

-- Log the fix
DO $$
BEGIN
  RAISE NOTICE 'Fixed provider token limits to match actual API constraints';
  RAISE NOTICE 'DeepSeek: 65536 -> 8192 (CRITICAL FIX)';
  RAISE NOTICE 'OpenAI: 16384 -> 4096';
  RAISE NOTICE 'Anthropic: 8192 -> 4096';
END $$;
