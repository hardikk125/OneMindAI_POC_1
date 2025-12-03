// =============================================================================
// UI Configuration Service
// Admin CRUD operations for mode options, roles, and prompts
// =============================================================================

import { getSupabase } from '../../lib/supabase/client';
import type { ModeOption, UserRole, RolePrompt } from '../types';

// =============================================================================
// MODE OPTIONS
// =============================================================================

export async function fetchModeOptions(): Promise<ModeOption[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('mode_options')
    .select('*')
    .order('display_order', { ascending: true });

  if (error) {
    console.error('[UIConfig] Error fetching mode options:', error);
    throw error;
  }

  return data || [];
}

export async function updateModeOption(
  id: string,
  updates: Partial<Omit<ModeOption, 'id' | 'created_at' | 'updated_at'>>
): Promise<ModeOption> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('mode_options')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[UIConfig] Error updating mode option:', error);
    throw error;
  }

  return data;
}

export async function createModeOption(
  option: Omit<ModeOption, 'id' | 'created_at' | 'updated_at'>
): Promise<ModeOption> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('mode_options')
    .insert(option)
    .select()
    .single();

  if (error) {
    console.error('[UIConfig] Error creating mode option:', error);
    throw error;
  }

  return data;
}

export async function deleteModeOption(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('mode_options')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[UIConfig] Error deleting mode option:', error);
    throw error;
  }
}

// =============================================================================
// USER ROLES
// =============================================================================

export async function fetchUserRoles(): Promise<UserRole[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('user_roles')
    .select('*')
    .order('display_order', { ascending: true });

  if (error) {
    console.error('[UIConfig] Error fetching user roles:', error);
    throw error;
  }

  return data || [];
}

export async function updateUserRole(
  id: string,
  updates: Partial<Omit<UserRole, 'id' | 'created_at' | 'updated_at'>>
): Promise<UserRole> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('user_roles')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[UIConfig] Error updating user role:', error);
    throw error;
  }

  return data;
}

export async function createUserRole(
  role: Omit<UserRole, 'id' | 'created_at' | 'updated_at'>
): Promise<UserRole> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('user_roles')
    .insert(role)
    .select()
    .single();

  if (error) {
    console.error('[UIConfig] Error creating user role:', error);
    throw error;
  }

  return data;
}

export async function deleteUserRole(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('user_roles')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[UIConfig] Error deleting user role:', error);
    throw error;
  }
}

// =============================================================================
// ROLE PROMPTS
// =============================================================================

export async function fetchRolePrompts(roleId?: string): Promise<RolePrompt[]> {
  const supabase = getSupabase();
  let query = supabase
    .from('role_prompts')
    .select('*')
    .order('display_order', { ascending: true });

  if (roleId) {
    query = query.eq('role_id', roleId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[UIConfig] Error fetching role prompts:', error);
    throw error;
  }

  return data || [];
}

export async function updateRolePrompt(
  id: string,
  updates: Partial<Omit<RolePrompt, 'id' | 'created_at' | 'updated_at'>>
): Promise<RolePrompt> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('role_prompts')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[UIConfig] Error updating role prompt:', error);
    throw error;
  }

  return data;
}

export async function createRolePrompt(
  prompt: Omit<RolePrompt, 'id' | 'created_at' | 'updated_at'>
): Promise<RolePrompt> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('role_prompts')
    .insert(prompt)
    .select()
    .single();

  if (error) {
    console.error('[UIConfig] Error creating role prompt:', error);
    throw error;
  }

  return data;
}

export async function deleteRolePrompt(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('role_prompts')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[UIConfig] Error deleting role prompt:', error);
    throw error;
  }
}

// =============================================================================
// BULK OPERATIONS
// =============================================================================

export async function reorderModeOptions(
  orderedIds: string[]
): Promise<void> {
  const supabase = getSupabase();
  
  // Update each item's display_order
  const updates = orderedIds.map((id, index) => 
    supabase
      .from('mode_options')
      .update({ display_order: index + 1 })
      .eq('id', id)
  );

  await Promise.all(updates);
}

export async function reorderUserRoles(
  orderedIds: string[]
): Promise<void> {
  const supabase = getSupabase();
  
  const updates = orderedIds.map((id, index) => 
    supabase
      .from('user_roles')
      .update({ display_order: index + 1 })
      .eq('id', id)
  );

  await Promise.all(updates);
}

export async function reorderRolePrompts(
  orderedIds: string[]
): Promise<void> {
  const supabase = getSupabase();
  
  const updates = orderedIds.map((id, index) => 
    supabase
      .from('role_prompts')
      .update({ display_order: index + 1 })
      .eq('id', id)
  );

  await Promise.all(updates);
}
