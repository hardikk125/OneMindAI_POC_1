/**
 * API Balance Tracker
 * 
 * CSV-based database for tracking API balances and usage.
 * Data is stored in src/data/api-balances.csv via backend API.
 * Persists across server restarts.
 */

export interface BalanceRecord {
  provider: string;
  engine: string;
  initial_balance: number;
  current_balance: number;
  total_spent: number;
  tokens_in: number;
  tokens_out: number;
  last_updated: string;
  currency: string;
  notes: string;
}

// API Base URL - Balance API server
const API_BASE = 'http://localhost:3001/api';

// Cache for balances (to avoid too many API calls)
let balanceCache: BalanceRecord[] = [];
let cacheTimestamp = 0;
const CACHE_TTL = 5000; // 5 seconds

/**
 * Load all balance records from CSV via API
 */
export async function loadBalancesAsync(): Promise<BalanceRecord[]> {
  try {
    const response = await fetch(`${API_BASE}/balances`);
    const result = await response.json();
    if (result.success) {
      balanceCache = result.data;
      cacheTimestamp = Date.now();
      return result.data;
    }
    console.error('Failed to load balances:', result.error);
    return balanceCache.length > 0 ? balanceCache : getDefaultBalances();
  } catch (e) {
    console.error('Failed to load balances from API:', e);
    return balanceCache.length > 0 ? balanceCache : getDefaultBalances();
  }
}

/**
 * Synchronous load (uses cache, triggers async refresh)
 */
export function loadBalances(): BalanceRecord[] {
  // Trigger async refresh if cache is stale
  if (Date.now() - cacheTimestamp > CACHE_TTL) {
    loadBalancesAsync().catch(console.error);
  }
  return balanceCache.length > 0 ? balanceCache : getDefaultBalances();
}

/**
 * Update balance for a provider (set new current balance)
 */
export async function setBalanceAsync(
  provider: string, 
  newBalance: number, 
  engine?: string,
  notes?: string
): Promise<BalanceRecord | null> {
  try {
    const response = await fetch(`${API_BASE}/balances/${provider}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_balance: newBalance, engine, notes })
    });
    const result = await response.json();
    if (result.success) {
      // Refresh cache
      await loadBalancesAsync();
      return result.data;
    }
    console.error('Failed to set balance:', result.error);
    return null;
  } catch (e) {
    console.error('Failed to set balance via API:', e);
    return null;
  }
}

/**
 * Synchronous wrapper for setBalance (for compatibility)
 */
export function setBalance(
  provider: string, 
  newBalance: number, 
  engine?: string,
  notes?: string
): BalanceRecord {
  // Fire and forget async call
  setBalanceAsync(provider, newBalance, engine, notes).catch(console.error);
  
  // Return optimistic update
  const record: BalanceRecord = {
    provider,
    engine: engine || 'default',
    initial_balance: newBalance,
    current_balance: newBalance,
    total_spent: 0,
    tokens_in: 0,
    tokens_out: 0,
    last_updated: new Date().toISOString(),
    currency: 'USD',
    notes: notes || ''
  };
  return record;
}

/**
 * Deduct cost from balance after API call
 * Also tracks tokens_in and tokens_out
 */
export async function deductFromBalanceAsync(
  provider: string, 
  cost: number, 
  engine?: string,
  tokens_in?: number,
  tokens_out?: number
): Promise<BalanceRecord | null> {
  try {
    const response = await fetch(`${API_BASE}/balances/deduct`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, engine, cost, tokens_in, tokens_out })
    });
    const result = await response.json();
    if (result.success) {
      // Refresh cache
      await loadBalancesAsync();
      return result.data;
    }
    console.error('Failed to deduct balance:', result.error);
    return null;
  } catch (e) {
    console.error('Failed to deduct balance via API:', e);
    return null;
  }
}

/**
 * Synchronous wrapper for deductFromBalance (for compatibility)
 */
export function deductFromBalance(
  provider: string, 
  cost: number, 
  engine?: string,
  tokens_in?: number,
  tokens_out?: number
): BalanceRecord | null {
  // Fire and forget async call
  deductFromBalanceAsync(provider, cost, engine, tokens_in, tokens_out).catch(console.error);
  return null;
}

/**
 * Reset a provider's balance to initial
 */
export async function resetBalanceAsync(provider: string, engine?: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/balances/reset/${provider}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ engine })
    });
    await loadBalancesAsync();
  } catch (e) {
    console.error('Failed to reset balance:', e);
  }
}

/**
 * Export balances to CSV (download from API)
 */
export function exportToCSV(): string {
  // Trigger download
  window.open(`${API_BASE}/balances/export`, '_blank');
  return '';
}

/**
 * Import balances from CSV string
 */
export async function importFromCSVAsync(csvContent: string): Promise<BalanceRecord[]> {
  try {
    const response = await fetch(`${API_BASE}/balances/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csvContent })
    });
    const result = await response.json();
    if (result.success) {
      balanceCache = result.data;
      cacheTimestamp = Date.now();
      return result.data;
    }
    console.error('Failed to import:', result.error);
    return [];
  } catch (e) {
    console.error('Failed to import via API:', e);
    return [];
  }
}

/**
 * Synchronous wrapper for import (for compatibility)
 */
export function importFromCSV(csvContent: string): BalanceRecord[] {
  importFromCSVAsync(csvContent).catch(console.error);
  return [];
}

/**
 * Get all providers summary
 */
export function getAllBalancesSummary(): {
  provider: string;
  current_balance: number;
  total_spent: number;
  last_updated: string;
  status: 'good' | 'low' | 'empty' | 'free';
}[] {
  const balances = loadBalances();
  
  return balances.map(b => {
    let status: 'good' | 'low' | 'empty' | 'free' = 'good';
    
    if (b.initial_balance === 0) {
      status = 'free';
    } else if (b.current_balance <= 0) {
      status = 'empty';
    } else if (b.current_balance < b.initial_balance * 0.2) {
      status = 'low';
    }
    
    return {
      provider: b.provider,
      current_balance: b.current_balance,
      total_spent: b.total_spent,
      last_updated: b.last_updated,
      status
    };
  });
}

/**
 * Default balances for initial setup (fallback)
 */
function getDefaultBalances(): BalanceRecord[] {
  const now = new Date().toISOString();
  return [
    { provider: 'openai', engine: 'gpt-4.1', initial_balance: 0, current_balance: 0, total_spent: 0, tokens_in: 0, tokens_out: 0, last_updated: now, currency: 'USD', notes: 'Enter your balance' },
    { provider: 'anthropic', engine: 'claude-3.5-sonnet', initial_balance: 0, current_balance: 0, total_spent: 0, tokens_in: 0, tokens_out: 0, last_updated: now, currency: 'USD', notes: 'Enter your balance' },
    { provider: 'gemini', engine: 'gemini-2.0-flash-exp', initial_balance: 0, current_balance: 0, total_spent: 0, tokens_in: 0, tokens_out: 0, last_updated: now, currency: 'USD', notes: 'Free tier' },
    { provider: 'deepseek', engine: 'deepseek-chat', initial_balance: 0, current_balance: 0, total_spent: 0, tokens_in: 0, tokens_out: 0, last_updated: now, currency: 'USD', notes: 'Enter your balance' },
    { provider: 'mistral', engine: 'mistral-large-latest', initial_balance: 0, current_balance: 0, total_spent: 0, tokens_in: 0, tokens_out: 0, last_updated: now, currency: 'USD', notes: 'Enter your balance' },
    { provider: 'groq', engine: 'llama-3.3-70b-versatile', initial_balance: 0, current_balance: 0, total_spent: 0, tokens_in: 0, tokens_out: 0, last_updated: now, currency: 'USD', notes: 'Free tier' },
    { provider: 'perplexity', engine: 'sonar-pro', initial_balance: 0, current_balance: 0, total_spent: 0, tokens_in: 0, tokens_out: 0, last_updated: now, currency: 'USD', notes: 'Enter your balance' },
    { provider: 'kimi', engine: 'moonshot-v1-128k', initial_balance: 0, current_balance: 0, total_spent: 0, tokens_in: 0, tokens_out: 0, last_updated: now, currency: 'USD', notes: 'Enter your balance' },
    { provider: 'xai', engine: 'grok-beta', initial_balance: 0, current_balance: 0, total_spent: 0, tokens_in: 0, tokens_out: 0, last_updated: now, currency: 'USD', notes: 'Enter your balance' },
  ];
}

/**
 * Initialize - load balances on startup
 */
export function initBalanceTracker(): void {
  loadBalancesAsync().catch(console.error);
}
