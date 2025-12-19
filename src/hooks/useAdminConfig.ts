// =============================================================================
// useAdminConfig Hook
// Fetches system_config and provider_config from database for admin-controlled values
// Created: 2025-12-13 | Initials: HP | Layer: Frontend | Type: Hook | I/O: Output
// =============================================================================

import { useState, useEffect, useCallback } from 'react';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase/client';
import { trackChange } from '../lib/change-tracker';

// =============================================================================
// TYPES
// =============================================================================

export interface SystemConfigItem {
  key: string;
  value: string | number | boolean;
  category: 'limits' | 'api' | 'pricing' | 'technical';
  description: string | null;
  is_sensitive: boolean;
}

export interface ProviderConfigItem {
  provider: string;
  is_enabled: boolean;
  max_output_cap: number;
  rate_limit_rpm: number;
  timeout_seconds: number;
  retry_count: number;
  temperature: number;
}

export interface AdminConfig {
  systemConfig: SystemConfigItem[];
  providerConfig: ProviderConfigItem[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// =============================================================================
// DEFAULT VALUES (Fallback when database is not available)
// =============================================================================

const DEFAULT_SYSTEM_CONFIG: SystemConfigItem[] = [
  // LIMITS
  { key: 'prompt_soft_limit', value: 5000, category: 'limits', description: 'Warning threshold for prompt length', is_sensitive: false },
  { key: 'prompt_hard_limit', value: 10000, category: 'limits', description: 'Maximum prompt length (hard block)', is_sensitive: false },
  { key: 'prompt_chunk_size', value: 4000, category: 'limits', description: 'Chunk size for long prompts', is_sensitive: false },
  { key: 'max_prompt_length', value: 7000, category: 'limits', description: 'Truncation point before API call', is_sensitive: false },
  
  // API
  { key: 'stream_timeout_ms', value: 30000, category: 'api', description: 'Timeout for streaming responses', is_sensitive: false },
  { key: 'request_timeout_ms', value: 60000, category: 'api', description: 'General request timeout', is_sensitive: false },
  
  // PRICING
  { key: 'expected_output_tokens', value: 1000, category: 'pricing', description: 'Default expected output tokens', is_sensitive: false },
  { key: 'signup_bonus_credits', value: 100, category: 'pricing', description: 'Credits given to new users', is_sensitive: false },
  { key: 'markup_percentage', value: 30, category: 'pricing', description: 'Markup percentage over provider costs', is_sensitive: false },
  
  // TECHNICAL
  { key: 'debounce_ms', value: 300, category: 'technical', description: 'Input debounce delay', is_sensitive: false },
  { key: 'animation_duration_ms', value: 200, category: 'technical', description: 'Animation duration', is_sensitive: false },
  { key: 'update_interval_ms', value: 15, category: 'technical', description: 'Streaming refresh rate', is_sensitive: false },
  { key: 'toast_duration_ms', value: 5000, category: 'technical', description: 'Notification display time', is_sensitive: false },
];

const DEFAULT_PROVIDER_CONFIG: ProviderConfigItem[] = [
  { provider: 'openai', is_enabled: true, max_output_cap: 16384, rate_limit_rpm: 3500, timeout_seconds: 30, retry_count: 3, temperature: 0.7 },
  { provider: 'anthropic', is_enabled: true, max_output_cap: 8192, rate_limit_rpm: 3500, timeout_seconds: 30, retry_count: 3, temperature: 0.7 },
  { provider: 'gemini', is_enabled: true, max_output_cap: 8192, rate_limit_rpm: 3600, timeout_seconds: 30, retry_count: 3, temperature: 0.7 },
  { provider: 'deepseek', is_enabled: true, max_output_cap: 8192, rate_limit_rpm: 3600, timeout_seconds: 30, retry_count: 3, temperature: 0.7 },
  { provider: 'mistral', is_enabled: true, max_output_cap: 32768, rate_limit_rpm: 3600, timeout_seconds: 30, retry_count: 3, temperature: 0.7 },
  { provider: 'perplexity', is_enabled: true, max_output_cap: 4096, rate_limit_rpm: 1800, timeout_seconds: 30, retry_count: 3, temperature: 0.7 },
  { provider: 'groq', is_enabled: true, max_output_cap: 8192, rate_limit_rpm: 1800, timeout_seconds: 30, retry_count: 3, temperature: 0.7 },
  { provider: 'xai', is_enabled: true, max_output_cap: 16384, rate_limit_rpm: 1800, timeout_seconds: 30, retry_count: 3, temperature: 0.7 },
  { provider: 'kimi', is_enabled: true, max_output_cap: 8192, rate_limit_rpm: 1800, timeout_seconds: 30, retry_count: 3, temperature: 0.7 },
];

// =============================================================================
// CACHE CONFIGURATION
// =============================================================================

const CACHE_KEY = 'onemindai-admin-config';
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

interface CachedConfig {
  systemConfig: SystemConfigItem[];
  providerConfig: ProviderConfigItem[];
  timestamp: number;
}

function getCachedConfig(): CachedConfig | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const parsed: CachedConfig = JSON.parse(cached);
    const isExpired = Date.now() - parsed.timestamp > CACHE_DURATION_MS;
    
    if (isExpired) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    
    return parsed;
  } catch {
    return null;
  }
}

function setCachedConfig(systemConfig: SystemConfigItem[], providerConfig: ProviderConfigItem[]): void {
  try {
    const cacheData: CachedConfig = {
      systemConfig,
      providerConfig,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
  } catch {
    // Ignore localStorage errors
  }
}

// =============================================================================
// HOOK
// =============================================================================

export function useAdminConfig(): AdminConfig {
  const [systemConfig, setSystemConfig] = useState<SystemConfigItem[]>(DEFAULT_SYSTEM_CONFIG);
  const [providerConfig, setProviderConfig] = useState<ProviderConfigItem[]>(DEFAULT_PROVIDER_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    // Check cache first
    const cached = getCachedConfig();
    if (cached) {
      setSystemConfig(cached.systemConfig);
      setProviderConfig(cached.providerConfig);
      setIsLoading(false);
      return;
    }

    // If Supabase is not configured, use defaults
    if (!isSupabaseConfigured()) {
      console.log('[AdminConfig] Supabase not configured, using defaults');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const supabase = getSupabase();

      // Fetch both configs in parallel
      const [systemResult, providerResult] = await Promise.all([
        supabase
          .from('system_config')
          .select('key, value, category, description, is_sensitive')
          .order('key', { ascending: true }),
        supabase
          .from('provider_config')
          .select('provider, is_enabled, max_output_cap, rate_limit_rpm, timeout_seconds, retry_count, temperature')
          .order('provider', { ascending: true }),
      ]);

      // Process system_config
      if (systemResult.error) {
        console.warn('[AdminConfig] Error fetching system_config:', systemResult.error.message);
      } else if (systemResult.data && systemResult.data.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const parsedConfig = (systemResult.data as any[]).map((item: any) => ({
          key: item.key,
          value: parseConfigValue(item.value),
          category: item.category,
          description: item.description,
          is_sensitive: item.is_sensitive,
        })) as SystemConfigItem[];
        
        setSystemConfig(parsedConfig);
        trackChange('useAdminConfig.ts', `system_config loaded: ${parsedConfig.length} items`, {
          function: 'fetchConfig',
          changeType: 'database',
        });
      }

      // Process provider_config
      if (providerResult.error) {
        console.warn('[AdminConfig] Error fetching provider_config:', providerResult.error.message);
      } else if (providerResult.data && providerResult.data.length > 0) {
        setProviderConfig(providerResult.data as ProviderConfigItem[]);
        trackChange('useAdminConfig.ts', `provider_config loaded: ${providerResult.data.length} providers`, {
          function: 'fetchConfig',
          changeType: 'database',
        });
      }

      // Cache the results
      if (systemResult.data && providerResult.data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const parsedSystemConfig = (systemResult.data as any[]).map((item: any) => ({
          key: item.key,
          value: parseConfigValue(item.value),
          category: item.category,
          description: item.description,
          is_sensitive: item.is_sensitive,
        })) as SystemConfigItem[];
        setCachedConfig(parsedSystemConfig, providerResult.data as ProviderConfigItem[]);
      }

    } catch (err) {
      console.error('[AdminConfig] Error fetching config:', err);
      setError('Failed to load admin configuration');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Set up real-time listeners for database changes
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const supabase = getSupabase();
    
    // Subscribe to changes on system_config table
    const systemSubscription = supabase
      .channel('system_config_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'system_config' },
        (payload) => {
          trackChange('useAdminConfig.ts', `Real-time update: ${payload.eventType} on system_config`, {
            function: 'realtime-listener',
          });
          // Clear cache and refetch
          localStorage.removeItem(CACHE_KEY);
          fetchConfig();
        }
      )
      .subscribe();

    // Subscribe to changes on provider_config table
    const providerSubscription = supabase
      .channel('provider_config_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'provider_config' },
        (payload) => {
          trackChange('useAdminConfig.ts', `Real-time update: ${payload.eventType} on provider_config`, {
            function: 'realtime-listener',
          });
          // Clear cache and refetch
          localStorage.removeItem(CACHE_KEY);
          fetchConfig();
        }
      )
      .subscribe();

    // Cleanup subscriptions on unmount
    return () => {
      systemSubscription.unsubscribe();
      providerSubscription.unsubscribe();
    };
  }, [fetchConfig]);

  return {
    systemConfig,
    providerConfig,
    isLoading,
    error,
    refetch: fetchConfig,
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Parse JSONB value from database to appropriate type
 */
function parseConfigValue(value: unknown): string | number | boolean {
  if (typeof value === 'string') {
    // Try to parse as number
    const num = Number(value);
    if (!isNaN(num)) return num;
    
    // Try to parse as boolean
    if (value === 'true') return true;
    if (value === 'false') return false;
    
    return value;
  }
  return value as string | number | boolean;
}

/**
 * Get a specific system config value by key
 */
export function getSystemConfig<T extends string | number | boolean>(
  config: SystemConfigItem[],
  key: string,
  defaultValue?: T
): T {
  const item = config.find(c => c.key === key);
  if (item) return item.value as T;
  return defaultValue as T;
}

/**
 * Get system config values by category
 */
export function getSystemConfigByCategory(
  config: SystemConfigItem[],
  category: SystemConfigItem['category']
): SystemConfigItem[] {
  return config.filter(c => c.category === category);
}

/**
 * Get provider config by provider name
 */
export function getProviderConfig(
  config: ProviderConfigItem[],
  provider: string
): ProviderConfigItem | undefined {
  return config.find(c => c.provider === provider);
}

/**
 * Get all enabled providers
 */
export function getEnabledProviders(config: ProviderConfigItem[]): ProviderConfigItem[] {
  return config.filter(c => c.is_enabled);
}

/**
 * Get max output cap for a provider
 */
export function getProviderMaxOutput(config: ProviderConfigItem[], provider: string): number {
  const providerConfig = getProviderConfig(config, provider);
  return providerConfig?.max_output_cap ?? 8192; // Default fallback
}

/**
 * Get temperature for a provider
 */
export function getProviderTemperature(config: ProviderConfigItem[], provider: string): number {
  const providerConfig = getProviderConfig(config, provider);
  return providerConfig?.temperature ?? 0.7; // Default fallback
}

// =============================================================================
// EXPORTS
// =============================================================================

export { DEFAULT_SYSTEM_CONFIG, DEFAULT_PROVIDER_CONFIG };
