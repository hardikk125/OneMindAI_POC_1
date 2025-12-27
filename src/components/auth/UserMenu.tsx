/**
 * User Menu Component
 * 
 * Dropdown menu showing user info, credits, and auth actions.
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  LogOut, 
  Settings, 
  CreditCard, 
  ChevronDown,
  Coins,
  History,
  Shield,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../lib/supabase/auth-context';

// =============================================================================
// TYPES
// =============================================================================

interface UserMenuProps {
  onOpenSettings?: () => void;
  onOpenCredits?: () => void;
  onOpenHistory?: () => void;
  onOpenPricing?: () => void;
  onOpenAdmin?: () => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function UserMenu({ onOpenSettings, onOpenCredits, onOpenHistory, onOpenPricing, onOpenAdmin }: UserMenuProps) {
  const { user, profile, credits, signOut, isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isAuthenticated || !user) {
    return null;
  }

  const displayName = profile?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'User';
  const avatarUrl = profile?.avatar_url;
  const creditBalance = credits?.balance ?? 0;

  return (
    <div ref={menuRef} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center overflow-hidden">
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-white text-sm font-medium">
              {displayName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        {/* Name and credits */}
        <div className="hidden sm:block text-left">
          <div className="text-sm font-medium text-gray-900 dark:text-white">
            {displayName}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <Coins className="w-3 h-3" />
            {creditBalance.toLocaleString()} credits
          </div>
        </div>

        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-50"
          >
            {/* User info header */}
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <div className="font-medium text-gray-900 dark:text-white">{displayName}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400 truncate">{user.email}</div>
            </div>

            {/* Credit balance */}
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Credit Balance</span>
                <span className="font-semibold text-gray-900 dark:text-white flex items-center gap-1">
                  <Coins className="w-4 h-4 text-yellow-500" />
                  {creditBalance.toLocaleString()}
                </span>
              </div>
              {credits && (
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                  Lifetime: {credits.lifetime_earned.toLocaleString()} earned, {credits.lifetime_spent.toLocaleString()} spent
                </div>
              )}
            </div>

            {/* Menu items */}
            <div className="py-2">
              {onOpenPricing && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onOpenPricing();
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-3 transition-colors"
                >
                  <Zap className="w-4 h-4 text-yellow-500" />
                  View Pricing
                </button>
              )}

              {onOpenCredits && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onOpenCredits();
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-3 transition-colors"
                >
                  <CreditCard className="w-4 h-4" />
                  Buy Credits
                </button>
              )}

              {onOpenHistory && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onOpenHistory();
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-3 transition-colors"
                >
                  <History className="w-4 h-4" />
                  Usage History
                </button>
              )}

              {onOpenSettings && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onOpenSettings();
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-3 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
              )}

              {/* Admin button */}
              {onOpenAdmin && profile?.role === 'admin' && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onOpenAdmin();
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 flex items-center gap-3 transition-colors border-t border-gray-200 dark:border-gray-700"
                >
                  <Shield className="w-4 h-4" />
                  Admin Panel
                </button>
              )}

              {/* Role badge for premium/admin */}
              {profile?.role && profile.role !== 'user' && !onOpenAdmin && (
                <div className="px-4 py-2 flex items-center gap-3">
                  <Shield className="w-4 h-4 text-purple-500" />
                  <span className="text-sm text-purple-600 dark:text-purple-400 font-medium capitalize">
                    {profile.role} Account
                  </span>
                </div>
              )}
            </div>

            {/* Sign out */}
            <div className="border-t border-gray-200 dark:border-gray-700 py-2">
              <button
                onClick={() => {
                  setIsOpen(false);
                  signOut();
                }}
                className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default UserMenu;
