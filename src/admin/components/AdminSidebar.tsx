// =============================================================================
// Admin Sidebar Navigation
// =============================================================================

import React from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Bot,
  DollarSign,
  Receipt,
  Bug,
  AlertTriangle,
  Activity,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { AdminPage } from '../types';

interface NavItem {
  id: AdminPage;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

interface AdminSidebarProps {
  currentPage: AdminPage;
  onNavigate: (page: AdminPage) => void;
  onLogout: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  stats?: {
    openBugs?: number;
    criticalErrors?: number;
  };
}

export function AdminSidebar({
  currentPage,
  onNavigate,
  onLogout,
  isCollapsed,
  onToggleCollapse,
  stats,
}: AdminSidebarProps) {
  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'users', label: 'Users', icon: <Users size={20} /> },
    { id: 'models', label: 'AI Models', icon: <Bot size={20} /> },
    { id: 'pricing', label: 'Pricing', icon: <DollarSign size={20} /> },
    { id: 'transactions', label: 'Transactions', icon: <Receipt size={20} /> },
    { id: 'bugs', label: 'Bug Reports', icon: <Bug size={20} />, badge: stats?.openBugs },
    { id: 'errors', label: 'Error Logs', icon: <AlertTriangle size={20} />, badge: stats?.criticalErrors },
    { id: 'system', label: 'System Health', icon: <Activity size={20} /> },
  ];

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 64 : 240 }}
      className="h-screen bg-gray-900 border-r border-gray-800 flex flex-col"
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="text-white font-semibold">Admin Panel</span>
          </motion.div>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
              currentPage === item.id
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <span className="flex-shrink-0">{item.icon}</span>
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 text-left text-sm font-medium"
              >
                {item.label}
              </motion.span>
            )}
            {!isCollapsed && item.badge !== undefined && item.badge > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                  item.id === 'errors'
                    ? 'bg-red-500 text-white'
                    : 'bg-yellow-500 text-black'
                }`}
              >
                {item.badge}
              </motion.span>
            )}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-gray-800">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors"
        >
          <LogOut size={20} />
          {!isCollapsed && (
            <span className="text-sm font-medium">Exit Admin</span>
          )}
        </button>
      </div>
    </motion.aside>
  );
}
