/**
 * Supabase Client Configuration
 * 
 * Secure client setup with environment variables.
 * NEVER expose service_role key in frontend - only anon key.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

// =============================================================================
// ENVIRONMENT VALIDATION
// =============================================================================

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check for test mode via URL parameter (for E2E testing)
// Usage: http://localhost:5173?testMode=true
function checkTestModeFromUrl(): boolean {
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('testMode') === 'true';
  }
  return false;
}

// Store test mode state (checked once on load)
let testModeEnabled = checkTestModeFromUrl();

// Allow updating test mode (for SPA navigation)
export function setTestMode(enabled: boolean): void {
  testModeEnabled = enabled;
  if (enabled) {
    console.warn('[Supabase] Test mode ENABLED via URL parameter. Authentication bypassed.');
  }
}

// Log environment status
if (!supabaseUrl) {
  console.error('[Supabase] Missing VITE_SUPABASE_URL environment variable');
}
if (!supabaseAnonKey) {
  console.error('[Supabase] Missing VITE_SUPABASE_ANON_KEY environment variable');
}

// =============================================================================
// CLIENT CONFIGURATION
// =============================================================================

/**
 * Supabase client options for secure authentication
 */
const supabaseOptions = {
  auth: {
    // Use localStorage for session persistence (secure for SPAs)
    persistSession: true,
    storageKey: 'onemindai-auth',
    
    // Auto-refresh tokens before expiry
    autoRefreshToken: true,
    
    // Detect session from URL (for OAuth callbacks)
    detectSessionInUrl: true,
    
    // Flow type - PKCE is more secure for SPAs
    flowType: 'pkce' as const,
  },
  
  // Global headers
  global: {
    headers: {
      'x-client-info': 'onemindai-web',
    },
  },
};

// =============================================================================
// SINGLETON CLIENT
// =============================================================================

let supabaseInstance: SupabaseClient<Database> | null = null;

/**
 * Get the Supabase client instance (singleton pattern)
 * Only creates ONE instance to avoid "Multiple GoTrueClient instances" warning
 * Returns null if Supabase is disabled (for E2E testing)
 */
export function getSupabase(): SupabaseClient<Database> | null {
  // Return null if in test mode (E2E testing via URL param)
  if (testModeEnabled) {
    return null;
  }
  
  if (!supabaseInstance) {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase configuration missing. Check environment variables.');
    }
    
    supabaseInstance = createClient<Database>(
      supabaseUrl,
      supabaseAnonKey,
      supabaseOptions
    );
  }
  
  return supabaseInstance;
}

/**
 * Direct export for convenience - uses the same singleton
 */
export const supabase = supabaseUrl && supabaseAnonKey
  ? getSupabase()
  : null;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if Supabase is properly configured
 * Returns false if Supabase is disabled (for E2E testing)
 */
export function isSupabaseConfigured(): boolean {
  return !testModeEnabled && Boolean(supabaseUrl && supabaseAnonKey);
}

/**
 * Check if running in test mode (Supabase disabled)
 */
export function isTestMode(): boolean {
  return testModeEnabled;
}

/**
 * Get current session (if any)
 * Returns null if Supabase is disabled (test mode)
 */
export async function getCurrentSession() {
  const client = getSupabase();
  if (!client) return null; // Test mode - no auth
  
  const { data: { session }, error } = await client.auth.getSession();
  
  if (error) {
    console.error('[Supabase] Error getting session:', error.message);
    return null;
  }
  
  return session;
}

/**
 * Get current user (if authenticated)
 * Returns null if Supabase is disabled (test mode)
 */
export async function getCurrentUser() {
  const client = getSupabase();
  if (!client) return null; // Test mode - no auth
  
  const { data: { user }, error } = await client.auth.getUser();
  
  if (error) {
    console.error('[Supabase] Error getting user:', error.message);
    return null;
  }
  
  return user;
}

export default supabase;
