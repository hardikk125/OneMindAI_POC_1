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
 */
export function getSupabase(): SupabaseClient<Database> {
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
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

/**
 * Get current session (if any)
 */
export async function getCurrentSession() {
  const client = getSupabase();
  const { data: { session }, error } = await client.auth.getSession();
  
  if (error) {
    console.error('[Supabase] Error getting session:', error.message);
    return null;
  }
  
  return session;
}

/**
 * Get current user (if authenticated)
 */
export async function getCurrentUser() {
  const client = getSupabase();
  const { data: { user }, error } = await client.auth.getUser();
  
  if (error) {
    console.error('[Supabase] Error getting user:', error.message);
    return null;
  }
  
  return user;
}

export default supabase;
