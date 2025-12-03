// =============================================================================
// Admin API Service - Supabase RPC calls
// =============================================================================

import { getSupabase, isSupabaseConfigured } from '../../lib/supabase/client';
import type {
  AdminUser,
  AIModel,
  PricingConfig,
  BugReport,
  ErrorLog,
  DashboardStats,
  AnalyticsData,
  Transaction,
} from '../types';

// =============================================================================
// Dashboard Stats
// =============================================================================

export async function getDashboardStats(): Promise<DashboardStats | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc('admin_get_dashboard_stats');

    if (error) {
      console.error('Error fetching dashboard stats:', error);
      return null;
    }

    return data?.[0] || null;
  } catch (err) {
    console.error('Error in getDashboardStats:', err);
    return null;
  }
}

export async function getAnalytics(days: number = 30): Promise<AnalyticsData[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc('admin_get_analytics', { p_days: days });

    if (error) {
      console.error('Error fetching analytics:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error in getAnalytics:', err);
    return [];
  }
}

// =============================================================================
// User Management
// =============================================================================

export async function getAllUsers(): Promise<AdminUser[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc('admin_get_all_users');

    if (error) {
      console.error('Error fetching users:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error in getAllUsers:', err);
    return [];
  }
}

export async function toggleUserStatus(userId: string, isActive: boolean): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc('admin_toggle_user_status', {
      p_user_id: userId,
      p_is_active: isActive,
    });

    if (error) {
      console.error('Error toggling user status:', error);
      return false;
    }

    return data === true;
  } catch (err) {
    console.error('Error in toggleUserStatus:', err);
    return false;
  }
}

export async function addCreditsToUser(
  userId: string,
  amount: number,
  reason: string
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc('admin_add_credits', {
      p_user_id: userId,
      p_amount: amount,
      p_reason: reason,
    });

    if (error) {
      console.error('Error adding credits:', error);
      return false;
    }

    return data === true;
  } catch (err) {
    console.error('Error in addCreditsToUser:', err);
    return false;
  }
}

export async function getUserTransactions(userId: string): Promise<Transaction[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc('admin_get_user_transactions', {
      p_user_id: userId,
    });

    if (error) {
      console.error('Error fetching user transactions:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error in getUserTransactions:', err);
    return [];
  }
}

// =============================================================================
// AI Models Management
// =============================================================================

export async function getAllModels(): Promise<AIModel[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('ai_models')
      .select('*')
      .order('provider', { ascending: true })
      .order('display_name', { ascending: true });

    if (error) {
      console.error('Error fetching models:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error in getAllModels:', err);
    return [];
  }
}

export async function updateModel(
  modelId: string,
  updates: Partial<{
    display_name: string;
    input_credits: number;
    output_credits: number;
    is_active: boolean;
    is_free: boolean;
    max_tokens: number;
    description: string;
  }>
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc('admin_update_model', {
      p_model_id: modelId,
      p_display_name: updates.display_name || null,
      p_input_credits: updates.input_credits || null,
      p_output_credits: updates.output_credits || null,
      p_is_active: updates.is_active ?? null,
      p_is_free: updates.is_free ?? null,
      p_max_tokens: updates.max_tokens || null,
      p_description: updates.description || null,
    });

    if (error) {
      console.error('Error updating model:', error);
      return false;
    }

    return data === true;
  } catch (err) {
    console.error('Error in updateModel:', err);
    return false;
  }
}

export async function createModel(model: Omit<AIModel, 'id' | 'created_at' | 'updated_at'>): Promise<AIModel | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('ai_models')
      .insert(model)
      .select()
      .single();

    if (error) {
      console.error('Error creating model:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error in createModel:', err);
    return null;
  }
}

// =============================================================================
// Pricing Configuration
// =============================================================================

export async function getPricingConfig(): Promise<PricingConfig[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('pricing_config')
      .select('*')
      .order('config_key', { ascending: true });

    if (error) {
      console.error('Error fetching pricing config:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error in getPricingConfig:', err);
    return [];
  }
}

export async function updatePricingConfig(key: string, value: number): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc('admin_update_pricing_config', {
      p_config_key: key,
      p_config_value: value,
    });

    if (error) {
      console.error('Error updating pricing config:', error);
      return false;
    }

    return data === true;
  } catch (err) {
    console.error('Error in updatePricingConfig:', err);
    return false;
  }
}

// =============================================================================
// Bug Reports
// =============================================================================

export async function getBugReports(status?: string): Promise<BugReport[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const supabase = getSupabase();
    let query = supabase
      .from('bug_reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching bug reports:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error in getBugReports:', err);
    return [];
  }
}

export async function updateBugReport(
  bugId: string,
  updates: Partial<BugReport>
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('bug_reports')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bugId);

    if (error) {
      console.error('Error updating bug report:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error in updateBugReport:', err);
    return false;
  }
}

// =============================================================================
// Error Logs
// =============================================================================

export async function getErrorLogs(
  filters?: {
    severity?: string;
    provider?: string;
    resolved?: boolean;
  },
  limit: number = 100
): Promise<ErrorLog[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const supabase = getSupabase();
    let query = supabase
      .from('error_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (filters?.severity && filters.severity !== 'all') {
      query = query.eq('severity', filters.severity);
    }
    if (filters?.provider && filters.provider !== 'all') {
      query = query.eq('provider', filters.provider);
    }
    if (filters?.resolved !== undefined) {
      query = query.eq('is_resolved', filters.resolved);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching error logs:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error in getErrorLogs:', err);
    return [];
  }
}

export async function resolveErrorLog(errorId: string, notes?: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('error_logs')
      .update({
        is_resolved: true,
        resolution_notes: notes || null,
      })
      .eq('id', errorId);

    if (error) {
      console.error('Error resolving error log:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error in resolveErrorLog:', err);
    return false;
  }
}

// =============================================================================
// Transactions
// =============================================================================

export async function getAllTransactions(limit: number = 100): Promise<Transaction[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('credit_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error in getAllTransactions:', err);
    return [];
  }
}

// =============================================================================
// Check Admin Status
// =============================================================================

export async function checkIsAdmin(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc('is_admin');

    if (error) {
      console.error('Error checking admin status:', error);
      return false;
    }

    return data === true;
  } catch (err) {
    console.error('Error in checkIsAdmin:', err);
    return false;
  }
}
