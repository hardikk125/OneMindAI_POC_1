/**
 * useAIModels Hook
 * 
 * Fetches AI model configurations from database including:
 * - Model token limits (max_output_tokens)
 * - Pricing (input/output per million tokens)
 * - Model metadata (display name, description, capabilities)
 * 
 * Replaces hardcoded MODEL_TOKEN_LIMITS and BASE_PRICING in OneMindAI.tsx
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase/client';

// =============================================================================
// TYPES
// =============================================================================

export interface AIModel {
  id: string;
  provider: string;
  model_id: string;
  display_name: string | null;
  max_output_tokens: number;
  context_window: number | null;
  input_price_per_million: number | null;
  output_price_per_million: number | null;
  description: string | null;
  is_active: boolean;
  capabilities: string[];
}

export interface ModelPricing {
  in: number;
  out: number;
  note: string;
}

export interface UseAIModelsReturn {
  models: AIModel[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  
  // Helper functions
  getModelTokenLimit: (provider: string, modelId: string) => number;
  getModelPricing: (provider: string, modelId: string) => ModelPricing | null;
  getModelsForProvider: (provider: string) => AIModel[];
  getPricingMap: () => Record<string, Record<string, ModelPricing>>;
  getTokenLimitsMap: () => Record<string, Record<string, number>>;
}

// =============================================================================
// DEFAULT FALLBACK DATA (used when database is unavailable)
// =============================================================================

const DEFAULT_TOKEN_LIMIT = 8192;

const FALLBACK_MODELS: AIModel[] = [
  // OpenAI
  { id: '1', provider: 'openai', model_id: 'gpt-4o', display_name: 'GPT-4o', max_output_tokens: 16384, context_window: 128000, input_price_per_million: 2.50, output_price_per_million: 10.00, description: 'GPT-4o - Balanced quality', is_active: true, capabilities: ['chat', 'code', 'vision'] },
  { id: '2', provider: 'openai', model_id: 'gpt-4o-mini', display_name: 'GPT-4o Mini', max_output_tokens: 16384, context_window: 128000, input_price_per_million: 0.15, output_price_per_million: 0.60, description: 'GPT-4o Mini - Fast & economical', is_active: true, capabilities: ['chat', 'code'] },
  // Anthropic
  { id: '3', provider: 'anthropic', model_id: 'claude-3.5-sonnet', display_name: 'Claude 3.5 Sonnet', max_output_tokens: 8192, context_window: 200000, input_price_per_million: 3.00, output_price_per_million: 15.00, description: 'Claude 3.5 Sonnet - Best performance', is_active: true, capabilities: ['chat', 'code', 'reasoning'] },
  { id: '4', provider: 'anthropic', model_id: 'claude-3-haiku', display_name: 'Claude 3 Haiku', max_output_tokens: 4096, context_window: 200000, input_price_per_million: 0.25, output_price_per_million: 1.25, description: 'Claude 3 Haiku - Speed optimized', is_active: true, capabilities: ['chat', 'code'] },
  // Gemini
  { id: '5', provider: 'gemini', model_id: 'gemini-2.0-flash-exp', display_name: 'Gemini 2.0 Flash', max_output_tokens: 8192, context_window: 1000000, input_price_per_million: 0.075, output_price_per_million: 0.30, description: 'Gemini 2.0 Flash - Fast multimodal', is_active: true, capabilities: ['chat', 'code', 'vision'] },
  // DeepSeek
  { id: '6', provider: 'deepseek', model_id: 'deepseek-chat', display_name: 'DeepSeek Chat', max_output_tokens: 65536, context_window: 128000, input_price_per_million: 0.14, output_price_per_million: 0.28, description: 'DeepSeek Chat - Ultra low cost', is_active: true, capabilities: ['chat', 'code'] },
  // Mistral
  { id: '7', provider: 'mistral', model_id: 'mistral-large-latest', display_name: 'Mistral Large', max_output_tokens: 128000, context_window: 128000, input_price_per_million: 8.00, output_price_per_million: 24.00, description: 'Mistral Large - Competent generalist', is_active: true, capabilities: ['chat', 'code', 'reasoning'] },
];

// =============================================================================
// CACHE CONFIGURATION
// =============================================================================

const CACHE_KEY = 'onemindai-ai-models';
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

interface CacheData {
  models: AIModel[];
  timestamp: number;
}

function getCachedData(): CacheData | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const data: CacheData = JSON.parse(cached);
    const now = Date.now();
    
    if (now - data.timestamp > CACHE_DURATION_MS) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    
    return data;
  } catch {
    return null;
  }
}

function setCachedData(models: AIModel[]): void {
  try {
    const data: CacheData = {
      models,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // Ignore cache errors
  }
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useAIModels(): UseAIModelsReturn {
  const [models, setModels] = useState<AIModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch models from database
  const fetchModels = useCallback(async () => {
    // Check cache first
    const cached = getCachedData();
    if (cached) {
      setModels(cached.models);
      setIsLoading(false);
      return;
    }

    // If Supabase not configured, use fallback
    if (!isSupabaseConfigured()) {
      console.log('[useAIModels] Supabase not configured, using fallback data');
      setModels(FALLBACK_MODELS);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const supabase = getSupabase();
      if (!supabase) {
        setModels(FALLBACK_MODELS);
        setIsLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('ai_models')
        .select('*')
        .eq('is_active', true)
        .order('provider')
        .order('model_id');

      if (fetchError) {
        console.error('[useAIModels] Fetch error:', fetchError.message);
        // Table might not exist yet, use fallback
        if (fetchError.message.includes('does not exist')) {
          console.log('[useAIModels] Table not found, using fallback data');
          setModels(FALLBACK_MODELS);
        } else {
          setError(fetchError.message);
          setModels(FALLBACK_MODELS);
        }
        setIsLoading(false);
        return;
      }

      if (data && data.length > 0) {
        // Parse capabilities from JSONB
        const parsedModels: AIModel[] = data.map((m: Record<string, unknown>) => ({
          id: m.id as string,
          provider: m.provider as string,
          model_id: m.model_id as string,
          display_name: m.display_name as string | null,
          max_output_tokens: m.max_output_tokens as number,
          context_window: m.context_window as number | null,
          input_price_per_million: m.input_price_per_million as number | null,
          output_price_per_million: m.output_price_per_million as number | null,
          description: m.description as string | null,
          is_active: m.is_active as boolean,
          capabilities: Array.isArray(m.capabilities) 
            ? m.capabilities as string[]
            : JSON.parse((m.capabilities as string) || '[]'),
        }));
        setModels(parsedModels);
        setCachedData(parsedModels);
      } else {
        // No data in table, use fallback
        console.log('[useAIModels] No models in database, using fallback');
        setModels(FALLBACK_MODELS);
      }
    } catch (err) {
      console.error('[useAIModels] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch AI models');
      setModels(FALLBACK_MODELS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  // ==========================================================================
  // HELPER FUNCTIONS
  // ==========================================================================

  /**
   * Get token limit for a specific model
   */
  const getModelTokenLimit = useCallback((provider: string, modelId: string): number => {
    const model = models.find(m => m.provider === provider && m.model_id === modelId);
    return model?.max_output_tokens ?? DEFAULT_TOKEN_LIMIT;
  }, [models]);

  /**
   * Get pricing for a specific model
   */
  const getModelPricing = useCallback((provider: string, modelId: string): ModelPricing | null => {
    const model = models.find(m => m.provider === provider && m.model_id === modelId);
    if (!model || model.input_price_per_million === null || model.output_price_per_million === null) {
      return null;
    }
    return {
      in: model.input_price_per_million,
      out: model.output_price_per_million,
      note: model.description || '',
    };
  }, [models]);

  /**
   * Get all models for a provider
   */
  const getModelsForProvider = useCallback((provider: string): AIModel[] => {
    return models.filter(m => m.provider === provider);
  }, [models]);

  /**
   * Get pricing map in the same format as BASE_PRICING
   * Record<provider, Record<model_id, { in, out, note }>>
   */
  const getPricingMap = useMemo(() => {
    return (): Record<string, Record<string, ModelPricing>> => {
      const map: Record<string, Record<string, ModelPricing>> = {};
      
      for (const model of models) {
        if (!map[model.provider]) {
          map[model.provider] = {};
        }
        if (model.input_price_per_million !== null && model.output_price_per_million !== null) {
          map[model.provider][model.model_id] = {
            in: model.input_price_per_million,
            out: model.output_price_per_million,
            note: model.description || '',
          };
        }
      }
      
      return map;
    };
  }, [models]);

  /**
   * Get token limits map in the same format as MODEL_TOKEN_LIMITS
   * Record<provider, Record<model_id, number>>
   */
  const getTokenLimitsMap = useMemo(() => {
    return (): Record<string, Record<string, number>> => {
      const map: Record<string, Record<string, number>> = {};
      
      for (const model of models) {
        if (!map[model.provider]) {
          map[model.provider] = {};
        }
        map[model.provider][model.model_id] = model.max_output_tokens;
      }
      
      return map;
    };
  }, [models]);

  return {
    models,
    isLoading,
    error,
    refetch: fetchModels,
    getModelTokenLimit,
    getModelPricing,
    getModelsForProvider,
    getPricingMap,
    getTokenLimitsMap,
  };
}

// =============================================================================
// STANDALONE HELPER FUNCTIONS (for use outside React components)
// =============================================================================

/**
 * Fetch models directly from database (for non-React contexts)
 */
export async function fetchAIModelsFromDB(): Promise<AIModel[]> {
  if (!isSupabaseConfigured()) {
    return FALLBACK_MODELS;
  }

  try {
    const supabase = getSupabase();
    if (!supabase) return FALLBACK_MODELS;

    const { data, error } = await supabase
      .from('ai_models')
      .select('*')
      .eq('is_active', true)
      .order('provider')
      .order('model_id');

    if (error || !data || data.length === 0) {
      return FALLBACK_MODELS;
    }

    return data.map((m: Record<string, unknown>) => ({
      id: m.id as string,
      provider: m.provider as string,
      model_id: m.model_id as string,
      display_name: m.display_name as string | null,
      max_output_tokens: m.max_output_tokens as number,
      context_window: m.context_window as number | null,
      input_price_per_million: m.input_price_per_million as number | null,
      output_price_per_million: m.output_price_per_million as number | null,
      description: m.description as string | null,
      is_active: m.is_active as boolean,
      capabilities: Array.isArray(m.capabilities) 
        ? m.capabilities as string[]
        : JSON.parse((m.capabilities as string) || '[]'),
    }));
  } catch {
    return FALLBACK_MODELS;
  }
}

/**
 * Clear the AI models cache
 */
export function clearAIModelsCache(): void {
  localStorage.removeItem(CACHE_KEY);
}

export default useAIModels;
