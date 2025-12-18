// =============================================================================
// Admin Config Service
// CRUD operations for system_config and provider_config tables
// Created: 2025-12-15 | Initials: HP | Layer: Frontend | Type: Service | I/O: Both
// =============================================================================

import { getSupabase } from '../../lib/supabase/client';
import type { SystemConfigItem, ProviderConfigItem } from '../../hooks/useAdminConfig';

// =============================================================================
// SYSTEM CONFIG CRUD
// =============================================================================

export async function fetchSystemConfig(): Promise<SystemConfigItem[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('system_config')
    .select('*')
    .order('category', { ascending: true });

  if (error) {
    console.error('[AdminConfig] Error fetching system_config:', error);
    throw error;
  }

  return data || [];
}

export async function updateSystemConfig(
  key: string, 
  value: string | number | boolean
): Promise<void> {
  const supabase = getSupabase();
  
  // Convert value to JSONB format (store as string in JSONB)
  const jsonbValue = typeof value === 'string' ? value : String(value);
  
  // @ts-ignore - Supabase types don't include system_config table
  const { error } = await supabase
    .from('system_config')
    .update({ value: jsonbValue, updated_at: new Date().toISOString() })
    .eq('key', key);

  if (error) {
    console.error('[AdminConfig] Error updating system_config:', error);
    throw error;
  }
  console.log(`[AdminConfig] Updated system_config: ${key} = ${value}`);
  // Clear cache to force immediate update
  localStorage.removeItem('onemindai-admin-config');
}

// =============================================================================
// PROVIDER CONFIG CRUD
// =============================================================================

export async function fetchProviderConfig(): Promise<ProviderConfigItem[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('provider_config')
    .select('*')
    .order('provider', { ascending: true });

  if (error) {
    console.error('[AdminConfig] Error fetching provider_config:', error);
    throw error;
  }

  return data || [];
}

export async function updateProviderConfig(
  provider: string, 
  updates: Partial<ProviderConfigItem>
): Promise<void> {
  const supabase = getSupabase();
  // @ts-ignore - Supabase types don't include provider_config table
  const { error } = await supabase
    .from('provider_config')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('provider', provider);

  if (error) {
    console.error('[AdminConfig] Error updating provider_config:', error);
    throw error;
  }
  console.log(`[AdminConfig] Updated provider_config: ${provider}`, updates);
  // Clear cache to force immediate update
  localStorage.removeItem('onemindai-admin-config');
}

export async function toggleProviderEnabled(
  provider: string, 
  isEnabled: boolean
): Promise<void> {
  await updateProviderConfig(provider, { is_enabled: isEnabled });
  // Clear cache to force immediate update in main UI
  localStorage.removeItem('onemindai-admin-config');
}

// =============================================================================
// API CONFIG CRUD (Extended provider_config)
// =============================================================================

import type { ApiProviderConfig, GlobalApiSettings } from '../types';

export async function fetchApiProviderConfigs(): Promise<ApiProviderConfig[]> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase client not available');
  
  // Use the public view that excludes sensitive API keys
  // @ts-expect-error - provider_config_public view not in generated types
  const { data, error } = await supabase
    .from('provider_config_public')
    .select('*')
    .order('priority', { ascending: true });

  if (error) {
    // Fallback to direct table if view doesn't exist
    if (error.message.includes('does not exist')) {
      // @ts-expect-error - provider_config table not in generated types
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('provider_config')
        .select('provider, is_enabled, max_output_cap, rate_limit_rpm, timeout_seconds, retry_count, retry_delay_ms, api_endpoint, notes, last_tested_at, last_test_status, priority, default_model, updated_at')
        .order('priority', { ascending: true });
      
      if (fallbackError) throw fallbackError;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return ((fallbackData as any[]) || []).map((p: Record<string, unknown>) => ({ ...p, has_api_key: false })) as ApiProviderConfig[];
    }
    throw error;
  }

  return (data as ApiProviderConfig[]) || [];
}

export async function updateApiProviderConfig(
  provider: string,
  updates: Partial<ApiProviderConfig>
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase client not available');
  
  // Remove has_api_key from updates (it's computed)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { has_api_key, ...cleanUpdates } = updates;
  
  // @ts-expect-error - provider_config table not in generated types
  const { error } = await supabase
    .from('provider_config')
    .update({ ...cleanUpdates, updated_at: new Date().toISOString() })
    .eq('provider', provider);

  if (error) {
    console.error('[ApiConfig] Error updating provider config:', error);
    throw error;
  }
  
  console.log(`[ApiConfig] Updated provider: ${provider}`, cleanUpdates);
  localStorage.removeItem('onemindai-admin-config');
}

export async function updateProviderApiKey(
  provider: string,
  apiKey: string
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase client not available');
  
  // Direct update to provider_config table
  // @ts-expect-error - provider_config table not in generated types
  const { error } = await supabase
    .from('provider_config')
    .update({ 
      api_key_encrypted: apiKey, 
      updated_at: new Date().toISOString() 
    })
    .eq('provider', provider);

  if (error) {
    console.error('[ApiConfig] Error updating API key:', error);
    throw error;
  }
  
  console.log(`[ApiConfig] Updated API key for provider: ${provider}`);
  localStorage.removeItem('onemindai-admin-config');
}

export async function testProviderConnection(
  provider: string
): Promise<{ success: boolean; error?: string; latency_ms?: number }> {
  const supabase = getSupabase();
  
  try {
    const startTime = Date.now();
    
    // Call backend test endpoint
    const response = await fetch(`/api/admin/test-provider/${provider}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const latency_ms = Date.now() - startTime;
    const result = await response.json();
    
    // Update test status in database if supabase is available
    if (supabase) {
      try {
        // @ts-expect-error - provider_config table not in generated types
        await supabase
          .from('provider_config')
          .update({
            last_tested_at: new Date().toISOString(),
            last_test_status: result.success ? 'success' : 'failed',
            last_test_error: result.error || null
          })
          .eq('provider', provider);
      } catch {
        // Ignore update errors
      }
    }
    
    return { success: result.success, error: result.error, latency_ms };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Connection failed';
    return { success: false, error: errorMsg };
  }
}

export async function fetchGlobalApiSettings(): Promise<GlobalApiSettings> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase client not available');
  
  // @ts-expect-error - system_config table not in generated types
  const { data, error } = await supabase
    .from('system_config')
    .select('key, value')
    .in('key', [
      'global_request_timeout_ms',
      'global_stream_timeout_ms',
      'global_retry_count',
      'global_retry_delay_ms',
      'api_rate_limit_enabled',
      'api_logging_enabled',
      'api_cache_ttl_seconds',
      'sse_heartbeat_interval_ms',
      'sse_max_duration_ms',
      'fallback_enabled',
      'fallback_max_attempts'
    ]);

  if (error) throw error;

  // Convert to GlobalApiSettings object
  const settings: Record<string, unknown> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ((data as any[]) || []).forEach((item: { key: string; value: unknown }) => {
    let val = item.value;
    // Parse string values
    if (typeof val === 'string') {
      if (val === 'true') val = true;
      else if (val === 'false') val = false;
      else if (!isNaN(Number(val))) val = Number(val);
    }
    settings[item.key] = val;
  });

  return {
    global_request_timeout_ms: (settings.global_request_timeout_ms as number) || 120000,
    global_stream_timeout_ms: (settings.global_stream_timeout_ms as number) || 600000,
    global_retry_count: (settings.global_retry_count as number) || 3,
    global_retry_delay_ms: (settings.global_retry_delay_ms as number) || 1000,
    api_rate_limit_enabled: (settings.api_rate_limit_enabled as boolean) ?? true,
    api_logging_enabled: (settings.api_logging_enabled as boolean) ?? true,
    api_cache_ttl_seconds: (settings.api_cache_ttl_seconds as number) || 300,
    sse_heartbeat_interval_ms: (settings.sse_heartbeat_interval_ms as number) || 30000,
    sse_max_duration_ms: (settings.sse_max_duration_ms as number) || 600000,
    fallback_enabled: (settings.fallback_enabled as boolean) ?? true,
    fallback_max_attempts: (settings.fallback_max_attempts as number) || 3,
  };
}

export async function updateGlobalApiSetting(
  key: string,
  value: string | number | boolean
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase client not available');
  
  // @ts-expect-error - system_config table not in generated types
  const { error } = await supabase
    .from('system_config')
    .update({ 
      value: String(value), 
      updated_at: new Date().toISOString() 
    })
    .eq('key', key);

  if (error) throw error;
  
  console.log(`[ApiConfig] Updated global setting: ${key} = ${value}`);
  localStorage.removeItem('onemindai-admin-config');
}
