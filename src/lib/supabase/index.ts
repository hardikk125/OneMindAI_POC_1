/**
 * Supabase Module
 * 
 * Export all Supabase-related utilities.
 */

// Client
export { 
  supabase, 
  getSupabase, 
  isSupabaseConfigured,
  getCurrentSession,
  getCurrentUser,
} from './client';

// Types
export type {
  Database,
  Tables,
  InsertTables,
  UpdateTables,
  Profile,
  Credits,
  CreditTransaction,
  ApiUsage,
  UserSettings,
  Conversation,
  Message,
  AuthUser,
} from './types';

// Auth Context
export {
  AuthProvider,
  useAuth,
  useIsAuthenticated,
  useUser,
  useCredits,
} from './auth-context';
export type { AuthState, AuthContextValue } from './auth-context';

// Credit Service
export {
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
} from './credit-service';
