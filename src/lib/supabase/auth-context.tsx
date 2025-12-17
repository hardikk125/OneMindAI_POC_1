/**
 * Authentication Context Provider
 * 
 * Secure session management with Supabase Auth.
 * Provides user state, auth methods, and credit balance.
 */

import React, { 
  createContext, 
  useContext, 
  useEffect, 
  useState, 
  useCallback,
  useMemo,
  ReactNode 
} from 'react';
import { 
  User, 
  Session, 
  AuthError,
  AuthChangeEvent,
} from '@supabase/supabase-js';
import { getSupabase, isSupabaseConfigured, isTestMode, setTestMode } from './client';
import type { Profile, Credits, UpdateTables } from './types';

// =============================================================================
// TYPES
// =============================================================================

export interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  credits: Credits | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

export interface AuthContextValue extends AuthState {
  // Auth methods
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string, bypassOnError?: boolean) => Promise<{ error: AuthError | null }>;
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
  signInWithGithub: () => Promise<{ error: AuthError | null }>;
  signInWithApple: () => Promise<{ error: AuthError | null }>;
  signInWithMicrosoft: () => Promise<{ error: AuthError | null }>;
  signInWithTwitter: () => Promise<{ error: AuthError | null }>;
  signInWithLinkedIn: () => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
  
  // Profile methods
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
  
  // Credit methods
  refreshCredits: () => Promise<void>;
  hasEnoughCredits: (amount: number) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// =============================================================================
// PROVIDER COMPONENT
// =============================================================================

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  // If in test mode (Supabase disabled), provide mock authenticated state
  const testModeEnabled = isTestMode();
  
  const [state, setState] = useState<AuthState>({
    user: testModeEnabled ? { id: 'test-user', email: 'test@example.com' } as User : null,
    session: null,
    profile: testModeEnabled ? { id: 'test-user', full_name: 'Test User', email: 'test@example.com', role: 'admin' } as Profile : null,
    credits: testModeEnabled ? { user_id: 'test-user', balance: 1000 } as Credits : null,
    isLoading: !testModeEnabled && isSupabaseConfigured(), // Skip loading in test mode
    isAuthenticated: testModeEnabled, // Auto-authenticate in test mode
    error: null,
  });

  // ==========================================================================
  // FETCH USER DATA
  // ==========================================================================

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    if (!isSupabaseConfigured()) return null;
    
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('[Auth] Error fetching profile:', error.message);
        return null;
      }
      
      return data;
    } catch (err) {
      console.error('[Auth] Profile fetch failed:', err);
      return null;
    }
  }, []);

  const fetchCredits = useCallback(async (userId: string): Promise<Credits | null> => {
    if (!isSupabaseConfigured()) return null;
    
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('credits')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        // Credits might not exist yet for new users
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error('[Auth] Error fetching credits:', error.message);
        return null;
      }
      
      return data;
    } catch (err) {
      console.error('[Auth] Credits fetch failed:', err);
      return null;
    }
  }, []);

  // ==========================================================================
  // SESSION MANAGEMENT
  // ==========================================================================

  const handleAuthChange = useCallback(async (
    event: AuthChangeEvent,
    session: Session | null
  ) => {
    console.log('[Auth] Auth state changed:', event);
    
    if (session?.user) {
      // IMMEDIATELY set authenticated state - don't wait for profile/credits
      setState(prev => ({
        ...prev,
        user: session.user,
        session,
        isLoading: false,
        isAuthenticated: true,
        error: null,
      }));
      
      // Fetch profile and credits in background (non-blocking)
      Promise.all([
        fetchProfile(session.user.id),
        fetchCredits(session.user.id),
      ]).then(([profile, credits]) => {
        setState(prev => ({
          ...prev,
          profile,
          credits,
        }));
      }).catch(err => {
        console.error('[Auth] Error fetching user data:', err);
      });
    } else {
      setState({
        user: null,
        session: null,
        profile: null,
        credits: null,
        isLoading: false,
        isAuthenticated: false,
        error: null,
      });
    }
  }, [fetchProfile, fetchCredits]);

  // Initialize auth state
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      // Supabase not configured - immediately show login (no loading)
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    const supabase = getSupabase();
    
    // Timeout to prevent infinite loading (reduced to 2 seconds - Supabase is down)
    const timeout = setTimeout(() => {
      setState(prev => {
        if (prev.isLoading) {
          console.warn('[Auth] Session check timed out - Supabase may be down, continuing without auth');
          return { ...prev, isLoading: false, error: 'Supabase connection timeout' };
        }
        return prev;
      });
    }, 2000); // Reduced from 5000 to 2000ms
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timeout);
      handleAuthChange('INITIAL_SESSION' as AuthChangeEvent, session);
    }).catch((error) => {
      clearTimeout(timeout);
      console.error('[Auth] Error getting session:', error);
      // Don't block the app - continue without auth
      setState(prev => ({ ...prev, isLoading: false, error: null, user: null, session: null }));
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [handleAuthChange]);

  // ==========================================================================
  // AUTH METHODS
  // ==========================================================================

  const signUp = useCallback(async (
    email: string, 
    password: string, 
    fullName?: string
  ): Promise<{ error: AuthError | null }> => {
    if (!isSupabaseConfigured()) {
      return { error: { message: 'Supabase not configured' } as AuthError };
    }

    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      
      return { error };
    } catch (err) {
      return { error: { message: 'Sign up failed' } as AuthError };
    }
  }, []);

  const signIn = useCallback(async (
    email: string, 
    password: string,
    bypassOnError: boolean = false
  ): Promise<{ error: AuthError | null }> => {
    if (!isSupabaseConfigured()) {
      return { error: { message: 'Supabase not configured' } as AuthError };
    }

    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      return { error };
    } catch (err: any) {
      // Handle CORS/network errors
      const errorMessage = err?.message || 'Sign in failed';
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        // If bypass is enabled, create a mock session
        if (bypassOnError) {
          console.log('[Auth] Supabase unreachable - using offline bypass mode');
          
          const mockUser = {
            id: 'offline-user-' + Date.now(),
            email: email,
            created_at: new Date().toISOString(),
            app_metadata: {},
            user_metadata: { full_name: 'Offline User' },
            aud: 'authenticated',
            role: 'authenticated',
          } as User;
          
          const mockSession = {
            access_token: 'offline-token',
            refresh_token: 'offline-refresh',
            expires_in: 3600,
            token_type: 'bearer',
            user: mockUser,
          } as Session;
          
          setState(prev => ({
            ...prev,
            user: mockUser,
            session: mockSession,
            isAuthenticated: true,
            isLoading: false,
            error: 'Offline mode - some features may be limited',
          }));
          
          return { error: null };
        }
        
        return { 
          error: { 
            message: 'SUPABASE_UNREACHABLE' 
          } as AuthError 
        };
      }
      return { error: { message: errorMessage } as AuthError };
    }
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<{ error: AuthError | null }> => {
    if (!isSupabaseConfigured()) {
      return { error: { message: 'Supabase not configured' } as AuthError };
    }

    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      
      return { error };
    } catch (err) {
      return { error: { message: 'Google sign in failed' } as AuthError };
    }
  }, []);

  const signInWithGithub = useCallback(async (): Promise<{ error: AuthError | null }> => {
    if (!isSupabaseConfigured()) {
      return { error: { message: 'Supabase not configured' } as AuthError };
    }

    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      
      return { error };
    } catch (err) {
      return { error: { message: 'GitHub sign in failed' } as AuthError };
    }
  }, []);

  const signInWithApple = useCallback(async (): Promise<{ error: AuthError | null }> => {
    if (!isSupabaseConfigured()) {
      return { error: { message: 'Supabase not configured' } as AuthError };
    }

    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      
      return { error };
    } catch (err) {
      return { error: { message: 'Apple sign in failed' } as AuthError };
    }
  }, []);

  const signInWithMicrosoft = useCallback(async (): Promise<{ error: AuthError | null }> => {
    if (!isSupabaseConfigured()) {
      return { error: { message: 'Supabase not configured' } as AuthError };
    }

    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: 'email profile openid',
        },
      });
      
      return { error };
    } catch (err) {
      return { error: { message: 'Microsoft sign in failed' } as AuthError };
    }
  }, []);

  const signInWithTwitter = useCallback(async (): Promise<{ error: AuthError | null }> => {
    if (!isSupabaseConfigured()) {
      return { error: { message: 'Supabase not configured' } as AuthError };
    }

    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'twitter',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      
      return { error };
    } catch (err) {
      return { error: { message: 'X (Twitter) sign in failed' } as AuthError };
    }
  }, []);

  const signInWithLinkedIn = useCallback(async (): Promise<{ error: AuthError | null }> => {
    if (!isSupabaseConfigured()) {
      return { error: { message: 'Supabase not configured' } as AuthError };
    }

    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'linkedin_oidc',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      
      return { error };
    } catch (err) {
      return { error: { message: 'LinkedIn sign in failed' } as AuthError };
    }
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    if (!isSupabaseConfigured()) return;

    try {
      const supabase = getSupabase();
      await supabase.auth.signOut();
    } catch (err) {
      console.error('[Auth] Sign out failed:', err);
    }
  }, []);

  const resetPassword = useCallback(async (
    email: string
  ): Promise<{ error: AuthError | null }> => {
    if (!isSupabaseConfigured()) {
      return { error: { message: 'Supabase not configured' } as AuthError };
    }

    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      
      return { error };
    } catch (err) {
      return { error: { message: 'Password reset failed' } as AuthError };
    }
  }, []);

  const updatePassword = useCallback(async (
    newPassword: string
  ): Promise<{ error: AuthError | null }> => {
    if (!isSupabaseConfigured()) {
      return { error: { message: 'Supabase not configured' } as AuthError };
    }

    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      
      return { error };
    } catch (err) {
      return { error: { message: 'Password update failed' } as AuthError };
    }
  }, []);

  // ==========================================================================
  // PROFILE METHODS
  // ==========================================================================

  const updateProfile = useCallback(async (
    updates: Partial<Profile>
  ): Promise<{ error: Error | null }> => {
    if (!isSupabaseConfigured() || !state.user) {
      return { error: new Error('Not authenticated') };
    }

    try {
      const supabase = getSupabase();
      // Build update object - Supabase types can be overly strict
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from('profiles')
        // @ts-expect-error - Supabase type inference issue with Update types
        .update(updateData)
        .eq('id', state.user.id);
      
      if (error) {
        return { error: new Error(error.message) };
      }
      
      // Refresh profile
      const profile = await fetchProfile(state.user.id);
      setState(prev => ({ ...prev, profile }));
      
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  }, [state.user, fetchProfile]);

  const refreshProfile = useCallback(async (): Promise<void> => {
    if (!state.user) return;
    
    const profile = await fetchProfile(state.user.id);
    setState(prev => ({ ...prev, profile }));
  }, [state.user, fetchProfile]);

  // ==========================================================================
  // CREDIT METHODS
  // ==========================================================================

  const refreshCredits = useCallback(async (): Promise<void> => {
    if (!state.user) return;
    
    const credits = await fetchCredits(state.user.id);
    setState(prev => ({ ...prev, credits }));
  }, [state.user, fetchCredits]);

  const hasEnoughCredits = useCallback((amount: number): boolean => {
    if (!state.credits) return false;
    return state.credits.balance >= amount;
  }, [state.credits]);

  // ==========================================================================
  // CONTEXT VALUE
  // ==========================================================================

  const value = useMemo<AuthContextValue>(() => ({
    ...state,
    signUp,
    signIn,
    signInWithGoogle,
    signInWithGithub,
    signInWithApple,
    signInWithMicrosoft,
    signInWithTwitter,
    signInWithLinkedIn,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    refreshProfile,
    refreshCredits,
    hasEnoughCredits,
  }), [
    state,
    signUp,
    signIn,
    signInWithGoogle,
    signInWithGithub,
    signInWithApple,
    signInWithMicrosoft,
    signInWithTwitter,
    signInWithLinkedIn,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    refreshProfile,
    refreshCredits,
    hasEnoughCredits,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook to access auth context
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

/**
 * Hook to check if user is authenticated
 */
export function useIsAuthenticated(): boolean {
  const { isAuthenticated } = useAuth();
  return isAuthenticated;
}

/**
 * Hook to get current user
 */
export function useUser(): User | null {
  const { user } = useAuth();
  return user;
}

/**
 * Hook to get user's credit balance
 */
export function useCredits(): Credits | null {
  const { credits } = useAuth();
  return credits;
}

export default AuthProvider;
