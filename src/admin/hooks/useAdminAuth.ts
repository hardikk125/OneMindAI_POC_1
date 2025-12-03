// =============================================================================
// Admin Authentication Hook
// =============================================================================

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../lib/supabase/auth-context';
import { checkIsAdmin } from '../services/admin-api';

interface UseAdminAuthReturn {
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
  checkAdminStatus: () => Promise<void>;
}

export function useAdminAuth(): UseAdminAuthReturn {
  const { user, isLoading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkAdminStatus = useCallback(async () => {
    if (!user) {
      setIsAdmin(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const adminStatus = await checkIsAdmin();
      setIsAdmin(adminStatus);
    } catch (err) {
      console.error('Error checking admin status:', err);
      setError('Failed to verify admin status');
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      checkAdminStatus();
    }
  }, [authLoading, checkAdminStatus]);

  return {
    isAdmin,
    isLoading: authLoading || isLoading,
    error,
    checkAdminStatus,
  };
}
