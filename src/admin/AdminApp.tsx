// =============================================================================
// Admin Panel Main Application
// =============================================================================

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../lib/supabase/auth-context';
import { useAdminAuth } from './hooks/useAdminAuth';
import { AdminSidebar } from './components/AdminSidebar';
import { Dashboard } from './pages/Dashboard';
import { Users } from './pages/Users';
import { Models } from './pages/Models';
import { BugReports } from './pages/BugReports';
import { ErrorLogs } from './pages/ErrorLogs';
import { Transactions } from './pages/Transactions';
import { SystemHealth } from './pages/SystemHealth';
import { UIConfig } from './pages/UIConfig';
import { FeedbackDashboard } from './pages/FeedbackDashboard';
import { ChaosTesting } from './components/ChaosTesting';
import AIModelsConfig from './pages/AIModelsConfig';
import ApiConfig from './pages/ApiConfig';
import type { AdminPage } from './types';
import { Loader2, ShieldAlert, ArrowLeft } from 'lucide-react';
import { HelpIcon } from '../components/ui/help-icon';

interface AdminAppProps {
  onExit: () => void;
}

export function AdminApp({ onExit }: AdminAppProps) {
  const { user, isLoading: authLoading } = useAuth();
  const { isAdmin, isLoading: adminLoading, error } = useAdminAuth();
  const [currentPage, setCurrentPage] = useState<AdminPage>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Show loading state
  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="text-purple-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  // Show unauthorized state
  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gray-800 rounded-xl p-8 max-w-md text-center border border-gray-700"
        >
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert size={32} className="text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-gray-400 mb-6">
            {!user
              ? 'You must be logged in to access the admin panel.'
              : 'You do not have admin privileges to access this area.'}
          </p>
          {error && (
            <p className="text-red-400 text-sm mb-4">{error}</p>
          )}
          <button
            onClick={onExit}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto"
          >
            <ArrowLeft size={18} />
            Go Back
          </button>
        </motion.div>
      </div>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'users':
        return <Users />;
      case 'models':
        return <Models />;
      case 'pricing':
        return <Models />; // Pricing is part of Models page
      case 'ai-models':
        return <AIModelsConfig />;
      case 'api-config':
        return <ApiConfig />;
      case 'ui-config':
        return <UIConfig />;
      case 'transactions':
        return <Transactions />;
      case 'feedback':
        return <FeedbackDashboard />;
      case 'bugs':
        return <BugReports />;
      case 'errors':
        return <ErrorLogs />;
      case 'system':
        return <SystemHealth />;
      case 'chaos-testing':
        return <ChaosTesting />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* Help Icon */}
      <HelpIcon
        title="Admin Panel"
        description="The OneMind AI Admin Panel provides comprehensive management tools for system administrators. Monitor users, manage AI models, track transactions, and configure the platform."
        features={[
          'Dashboard with real-time analytics and metrics',
          'User management with role-based access control',
          'AI model configuration and pricing management',
          'Transaction history and credit tracking',
          'Bug reports and error log monitoring',
          'System health monitoring and alerts',
          'UI configuration for customizing the platform',
          'Chaos testing for system resilience',
        ]}
        tips={[
          'Use the sidebar to navigate between different sections',
          'Check the Dashboard for a quick overview of system status',
          'Monitor Error Logs regularly to catch issues early',
          'Use Chaos Testing in staging environments only',
        ]}
        position="top-right"
      />
      {/* Sidebar */}
      <AdminSidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        onLogout={onExit}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
