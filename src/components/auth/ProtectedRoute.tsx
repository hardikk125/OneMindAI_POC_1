/**
 * Protected Route Component
 * 
 * Wrapper that requires authentication to access content.
 */

import React, { ReactNode } from 'react';
import { useAuth } from '../../lib/supabase/auth-context';
import { Loader2, Lock } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface ProtectedRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
  requiredRole?: 'user' | 'admin' | 'premium';
  onAuthRequired?: () => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ProtectedRoute({ 
  children, 
  fallback,
  requiredRole,
  onAuthRequired,
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, profile } = useAuth();

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-center p-8">
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Authentication Required
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-sm">
          Please sign in to access this content.
        </p>
        {onAuthRequired && (
          <button
            onClick={onAuthRequired}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Sign In
          </button>
        )}
      </div>
    );
  }

  // Check role requirement
  if (requiredRole && profile?.role !== requiredRole && profile?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-center p-8">
        <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-yellow-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Upgrade Required
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-sm">
          This feature requires a {requiredRole} account.
        </p>
        <button
          className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-colors"
        >
          Upgrade Now
        </button>
      </div>
    );
  }

  return <>{children}</>;
}

// =============================================================================
// HOC VERSION
// =============================================================================

export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    requiredRole?: 'user' | 'admin' | 'premium';
    fallback?: ReactNode;
  }
) {
  return function AuthenticatedComponent(props: P) {
    return (
      <ProtectedRoute 
        requiredRole={options?.requiredRole}
        fallback={options?.fallback}
      >
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}

export default ProtectedRoute;
