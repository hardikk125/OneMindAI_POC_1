/**
 * Credit Service
 * 
 * Manages user credits with atomic operations.
 * All credit modifications go through Supabase RPC functions.
 */

import { getSupabase, isSupabaseConfigured } from './client';
import type { Database, Credits, CreditTransaction, ApiUsage } from './types';
import { superDebugBus } from '../super-debug-bus';

// =============================================================================
// CREDIT PRICING (credits per 1M tokens)
// =============================================================================

export const CREDIT_PRICING: Record<string, Record<string, { input: number; output: number }>> = {
  openai: {
    'gpt-5.1': { input: 2500, output: 10000 },
    'gpt-5-2025-08-07': { input: 1500, output: 6000 },
    'gpt-4.1': { input: 100, output: 300 },
    'gpt-4o': { input: 25, output: 100 },
    'gpt-4o-mini': { input: 1.5, output: 6 },
    'gpt-4.1-mini': { input: 1.5, output: 6 },
    'gpt-3.5-turbo': { input: 10, output: 40 },
  },
  anthropic: {
    'claude-3.5-sonnet': { input: 30, output: 150 },
    'claude-3-5-sonnet-20241022': { input: 30, output: 150 },
    'claude-3-haiku': { input: 2.5, output: 12.5 },
    'claude-3-haiku-20240307': { input: 2.5, output: 12.5 },
  },
  gemini: {
    'gemini-2.0-flash-exp': { input: 0, output: 0 }, // Free tier
    'gemini-2.0-flash-lite': { input: 0, output: 0 },
    'gemini-2.5-flash-lite': { input: 0, output: 0 },
  },
  deepseek: {
    'deepseek-chat': { input: 1.4, output: 2.8 },
    'deepseek-coder': { input: 1.4, output: 2.8 },
  },
  mistral: {
    'mistral-large-latest': { input: 20, output: 60 },
    'mistral-medium-2312': { input: 27, output: 81 },
    'mistral-small': { input: 10, output: 30 },
  },
  groq: {
    'llama-3.3-70b-versatile': { input: 0.59, output: 0.79 },
    'llama-3.1-8b-instant': { input: 0.05, output: 0.08 },
    'mixtral-8x7b-32768': { input: 0.24, output: 0.24 },
  },
  perplexity: {
    'sonar-pro': { input: 30, output: 150 },
    'sonar-small': { input: 2, output: 2 },
  },
  xai: {
    'grok-beta': { input: 6.00, output: 12.00 },
    'grok-2': { input: 8.00, output: 16.00 },
  },
};

// Signup bonus credits
export const SIGNUP_BONUS_CREDITS = 100;

// =============================================================================
// CREDIT CALCULATION
// =============================================================================

/**
 * Calculate credits needed for a request
 */
export function calculateCredits(
  provider: string,
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const pricing = CREDIT_PRICING[provider]?.[model];
  
  if (!pricing) {
    // Default pricing for unknown models
    return Math.ceil((promptTokens + completionTokens) / 1000);
  }
  
  const inputCost = (promptTokens / 1_000_000) * pricing.input;
  const outputCost = (completionTokens / 1_000_000) * pricing.output;
  
  // Round up to nearest credit
  return Math.ceil(inputCost + outputCost);
}

/**
 * Estimate credits before making a request
 */
export function estimateCredits(
  provider: string,
  model: string,
  estimatedPromptTokens: number,
  estimatedCompletionTokens: number = 1000
): number {
  return calculateCredits(provider, model, estimatedPromptTokens, estimatedCompletionTokens);
}

// =============================================================================
// CREDIT OPERATIONS
// =============================================================================

/**
 * Get user's current credit balance
 */
export async function getCreditBalance(userId: string): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  
  try {
    const supabase = getSupabase();
    
    // ===== Super Debug: Real-time Supabase Tracking =====
    superDebugBus.emitSupabaseOp('select', 'credits', 'SELECT balance FROM credits WHERE user_id = ?', undefined);
    
    const { data, error } = await supabase
      .from('credits')
      .select('balance')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      console.error('[Credits] Error fetching balance:', error.message);
      superDebugBus.emitSupabaseOp('select', 'credits', 'SELECT balance FROM credits WHERE user_id = ?', { error: error.message });
      return 0;
    }
    
    // Type assertion to handle TypeScript inference issue
    const balanceData = data as { balance: number } | null;
    const balance = balanceData?.balance ?? 0;
    
    // ===== Super Debug: Credit Check =====
    superDebugBus.emitCreditOp('check', 0, balance);
    
    return balance;
  } catch (err) {
    console.error('[Credits] Balance fetch failed:', err);
    superDebugBus.emitSupabaseOp('select', 'credits', 'SELECT balance FROM credits WHERE user_id = ?', { error: 'Unexpected error' });
    return 0;
  }
}

/**
 * Deduct credits for API usage (atomic operation)
 */
export async function deductCredits(
  userId: string,
  amount: number,
  provider: string,
  model: string,
  tokens: number,
  description?: string
): Promise<{ success: boolean; error?: string; newBalance?: number }> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase not configured' };
  }
  
  if (amount <= 0) {
    return { success: true, newBalance: await getCreditBalance(userId) };
  }
  
  try {
    const supabase = getSupabase();
    
    // ===== Super Debug: Real-time Supabase Tracking =====
    const rpcParams = {
      p_user_id: userId,
      p_amount: amount,
      p_description: description || `API usage: ${provider}/${model}`,
      p_provider: provider,
      p_model: model,
      p_tokens: tokens,
    };
    superDebugBus.emitSupabaseOp('rpc', 'deduct_credits', rpcParams, undefined);
    
    // Use RPC for atomic deduction
    const { data, error } = await supabase.rpc('deduct_credits', rpcParams);
    
    if (error) {
      console.error('[Credits] Deduction failed:', error.message);
      superDebugBus.emitSupabaseOp('rpc', 'deduct_credits', rpcParams, { error: error.message });
      return { success: false, error: error.message };
    }
    
    if (!data) {
      superDebugBus.emitSupabaseOp('rpc', 'deduct_credits', rpcParams, { error: 'Insufficient credits' });
      return { success: false, error: 'Insufficient credits' };
    }
    
    // Get new balance for tracking
    const newBalance = await getCreditBalance(userId);
    
    // ===== Super Debug: Credit Deduction =====
    superDebugBus.emitCreditOp('deduct', amount, newBalance, provider, model);
    
    return { success: true, newBalance };
  } catch (err) {
    console.error('[Credits] Deduction error:', err);
    superDebugBus.emitSupabaseOp('rpc', 'deduct_credits', { error: 'Unexpected error' }, { error: 'Unexpected error' });
    return { success: false, error: 'Credit deduction failed' };
  }
}

/**
 * Add credits to user account
 */
export async function addCredits(
  userId: string,
  amount: number,
  type: 'purchase' | 'refund' | 'bonus' | 'signup',
  description: string
): Promise<{ success: boolean; error?: string; newBalance?: number }> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase not configured' };
  }
  
  try {
    const supabase = getSupabase();
    
    // Use RPC for atomic addition
    const { data, error } = await supabase.rpc('add_credits', {
      p_user_id: userId,
      p_amount: amount,
      p_type: type,
      p_description: description,
    });
    
    if (error) {
      console.error('[Credits] Addition failed:', error.message);
      return { success: false, error: error.message };
    }
    
    const newBalance = await getCreditBalance(userId);
    return { success: true, newBalance };
  } catch (err) {
    console.error('[Credits] Addition error:', err);
    return { success: false, error: 'Credit addition failed' };
  }
}

/**
 * Initialize credits for new user (signup bonus)
 */
export async function initializeCredits(userId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  
  try {
    const supabase = getSupabase();
    
    // Check if credits already exist
    const { data: existing } = await supabase
      .from('credits')
      .select('id')
      .eq('user_id', userId)
      .single();
    
    if (existing) {
      return true; // Already initialized
    }
    
    // Create credits record with signup bonus
    const { error } = await supabase
      .from('credits')
      .insert({
        user_id: userId,
        balance: SIGNUP_BONUS_CREDITS,
        lifetime_earned: SIGNUP_BONUS_CREDITS,
        lifetime_spent: 0,
      } as any);
    
    if (error) {
      console.error('[Credits] Initialization failed:', error.message);
      return false;
    }
    
    // Log the signup bonus transaction
    await supabase
      .from('credit_transactions')
      .insert({
        user_id: userId,
        amount: SIGNUP_BONUS_CREDITS,
        type: 'signup',
        description: 'Welcome bonus credits',
      } as any);
    
    return true;
  } catch (err) {
    console.error('[Credits] Initialization error:', err);
    return false;
  }
}

// =============================================================================
// TRANSACTION HISTORY
// =============================================================================

/**
 * Get user's credit transaction history
 */
export async function getTransactionHistory(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<CreditTransaction[]> {
  if (!isSupabaseConfigured()) return [];
  
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error('[Credits] Transaction history error:', error.message);
      return [];
    }
    
    return data || [];
  } catch (err) {
    console.error('[Credits] Transaction history failed:', err);
    return [];
  }
}

/**
 * Get user's API usage history
 */
export async function getUsageHistory(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<ApiUsage[]> {
  if (!isSupabaseConfigured()) return [];
  
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('api_usage')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error('[Credits] Usage history error:', error.message);
      return [];
    }
    
    return data || [];
  } catch (err) {
    console.error('[Credits] Usage history failed:', err);
    return [];
  }
}

/**
 * Log API usage (for analytics)
 */
export async function logApiUsage(
  userId: string,
  provider: string,
  model: string,
  promptTokens: number,
  completionTokens: number,
  costCredits: number,
  success: boolean,
  errorMessage?: string
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  
  try {
    const supabase = getSupabase();
    await supabase
      .from('api_usage')
      .insert({
        user_id: userId,
        provider,
        model,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens,
        cost_credits: costCredits,
        success,
        error_message: errorMessage,
      } as any);
  } catch (err) {
    console.error('[Credits] Usage logging failed:', err);
  }
}

export default {
  CREDIT_PRICING,
  SIGNUP_BONUS_CREDITS,
  calculateCredits,
  estimateCredits,
  getCreditBalance,
  deductCredits,
  addCredits,
  initializeCredits,
  getTransactionHistory,
  getUsageHistory,
  logApiUsage,
};
