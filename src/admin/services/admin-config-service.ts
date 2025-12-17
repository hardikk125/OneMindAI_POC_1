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
