// =============================================================================
// Users Management Page
// =============================================================================

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users as UsersIcon,
  MoreVertical,
  UserCheck,
  UserX,
  CreditCard,
  History,
  Eye,
  X,
  Plus,
  Download,
} from 'lucide-react';
import { DataTable } from '../components/DataTable';
import {
  getAllUsers,
  toggleUserStatus,
  addCreditsToUser,
  getUserTransactions,
} from '../services/admin-api';
import type { AdminUser, Transaction } from '../types';

export function Users() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [showAddCreditsModal, setShowAddCreditsModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [creditAmount, setCreditAmount] = useState('');
  const [creditReason, setCreditReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const data = await getAllUsers();
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (user: AdminUser) => {
    setActionLoading(true);
    try {
      const success = await toggleUserStatus(user.id, !user.is_active);
      if (success) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === user.id ? { ...u, is_active: !u.is_active } : u
          )
        );
      }
    } catch (error) {
      console.error('Error toggling user status:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddCredits = async () => {
    if (!selectedUser || !creditAmount || !creditReason) return;

    setActionLoading(true);
    try {
      const success = await addCreditsToUser(
        selectedUser.id,
        parseInt(creditAmount),
        creditReason
      );
      if (success) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === selectedUser.id
              ? {
                  ...u,
                  credit_balance: u.credit_balance + parseInt(creditAmount),
                  lifetime_earned: u.lifetime_earned + parseInt(creditAmount),
                }
              : u
          )
        );
        setShowAddCreditsModal(false);
        setCreditAmount('');
        setCreditReason('');
      }
    } catch (error) {
      console.error('Error adding credits:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewHistory = async (user: AdminUser) => {
    setSelectedUser(user);
    setShowHistoryModal(true);
    try {
      const data = await getUserTransactions(user.id);
      setTransactions(data);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const columns = [
    {
      key: 'email',
      label: 'Email',
      sortable: true,
      render: (user: AdminUser) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">
              {user.email.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-white font-medium">{user.email}</p>
            {user.full_name && (
              <p className="text-gray-400 text-xs">{user.full_name}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Role',
      sortable: true,
      render: (user: AdminUser) => (
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${
            user.role === 'admin'
              ? 'bg-purple-500/20 text-purple-400'
              : user.role === 'premium'
              ? 'bg-yellow-500/20 text-yellow-400'
              : 'bg-gray-500/20 text-gray-400'
          }`}
        >
          {user.role}
        </span>
      ),
    },
    {
      key: 'is_active',
      label: 'Status',
      sortable: true,
      render: (user: AdminUser) => (
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${
            user.is_active
              ? 'bg-green-500/20 text-green-400'
              : 'bg-red-500/20 text-red-400'
          }`}
        >
          {user.is_active ? 'Active' : 'Suspended'}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Signup Date',
      sortable: true,
      render: (user: AdminUser) => (
        <span className="text-gray-400">{formatDate(user.created_at)}</span>
      ),
    },
    {
      key: 'credit_balance',
      label: 'Credits',
      sortable: true,
      render: (user: AdminUser) => (
        <div>
          <p className="text-white font-medium">{user.credit_balance.toLocaleString()}</p>
          <p className="text-gray-400 text-xs">
            Spent: {user.lifetime_spent.toLocaleString()}
          </p>
        </div>
      ),
    },
    {
      key: 'total_requests',
      label: 'Requests',
      sortable: true,
      render: (user: AdminUser) => (
        <span className="text-gray-300">{user.total_requests.toLocaleString()}</span>
      ),
    },
    {
      key: 'last_activity',
      label: 'Last Active',
      sortable: true,
      render: (user: AdminUser) => (
        <span className="text-gray-400">
          {user.last_activity ? formatDate(user.last_activity) : 'Never'}
        </span>
      ),
    },
  ];

  const renderActions = (user: AdminUser) => (
    <div className="flex items-center gap-1">
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleViewHistory(user);
        }}
        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
        title="View History"
      >
        <History size={16} />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setSelectedUser(user);
          setShowAddCreditsModal(true);
        }}
        className="p-2 text-gray-400 hover:text-green-400 hover:bg-gray-700 rounded-lg transition-colors"
        title="Add Credits"
      >
        <Plus size={16} />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleToggleStatus(user);
        }}
        className={`p-2 rounded-lg transition-colors ${
          user.is_active
            ? 'text-gray-400 hover:text-red-400 hover:bg-gray-700'
            : 'text-gray-400 hover:text-green-400 hover:bg-gray-700'
        }`}
        title={user.is_active ? 'Suspend User' : 'Activate User'}
        disabled={actionLoading}
      >
        {user.is_active ? <UserX size={16} /> : <UserCheck size={16} />}
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">User Management</h1>
          <p className="text-gray-400 mt-1">
            Manage users, credits, and account status
          </p>
        </div>
        <button
          onClick={loadUsers}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Users Table */}
      <DataTable
        data={users}
        columns={columns}
        keyField="id"
        isLoading={isLoading}
        searchPlaceholder="Search users..."
        actions={renderActions}
        emptyMessage="No users found"
      />

      {/* Add Credits Modal */}
      <AnimatePresence>
        {showAddCreditsModal && selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowAddCreditsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Add Credits</h3>
                <button
                  onClick={() => setShowAddCreditsModal(false)}
                  className="p-1 text-gray-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-400 mb-1">User</p>
                  <p className="text-white font-medium">{selectedUser.email}</p>
                  <p className="text-sm text-gray-400">
                    Current balance: {selectedUser.credit_balance.toLocaleString()} credits
                  </p>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Amount (credits)
                  </label>
                  <input
                    type="number"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Reason</label>
                  <input
                    type="text"
                    value={creditReason}
                    onChange={(e) => setCreditReason(e.target.value)}
                    placeholder="e.g., Promotional bonus"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowAddCreditsModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddCredits}
                    disabled={!creditAmount || !creditReason || actionLoading}
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {actionLoading ? 'Adding...' : 'Add Credits'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transaction History Modal */}
      <AnimatePresence>
        {showHistoryModal && selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowHistoryModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-gray-800 rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden border border-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Transaction History
                  </h3>
                  <p className="text-sm text-gray-400">{selectedUser.email}</p>
                </div>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="p-1 text-gray-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="overflow-y-auto max-h-96">
                {transactions.length === 0 ? (
                  <p className="text-center text-gray-400 py-8">
                    No transactions found
                  </p>
                ) : (
                  <div className="space-y-2">
                    {transactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg"
                      >
                        <div>
                          <p className="text-white text-sm">{tx.description}</p>
                          <p className="text-gray-400 text-xs">
                            {formatDate(tx.created_at)}
                            {tx.provider && ` • ${tx.provider}`}
                            {tx.model && ` / ${tx.model}`}
                          </p>
                        </div>
                        <span
                          className={`font-medium ${
                            tx.amount > 0 ? 'text-green-400' : 'text-red-400'
                          }`}
                        >
                          {tx.amount > 0 ? '+' : ''}
                          {tx.amount.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
