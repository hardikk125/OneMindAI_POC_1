// =============================================================================
// Transactions Page
// =============================================================================

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Receipt,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Gift,
  ShoppingCart,
  RefreshCw,
} from 'lucide-react';
import { DataTable } from '../components/DataTable';
import { getAllTransactions } from '../services/admin-api';
import type { Transaction } from '../types';

const typeColors = {
  purchase: 'bg-green-500/20 text-green-400',
  usage: 'bg-blue-500/20 text-blue-400',
  refund: 'bg-yellow-500/20 text-yellow-400',
  bonus: 'bg-purple-500/20 text-purple-400',
  signup: 'bg-pink-500/20 text-pink-400',
};

const typeIcons = {
  purchase: <ShoppingCart size={14} />,
  usage: <CreditCard size={14} />,
  refund: <RefreshCw size={14} />,
  bonus: <Gift size={14} />,
  signup: <Gift size={14} />,
};

export function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    setIsLoading(true);
    try {
      const data = await getAllTransactions(500);
      setTransactions(data);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredTransactions =
    typeFilter === 'all'
      ? transactions
      : transactions.filter((t) => t.type === typeFilter);

  const stats = {
    totalCreditsAdded: transactions
      .filter((t) => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0),
    totalCreditsUsed: Math.abs(
      transactions.filter((t) => t.amount < 0).reduce((sum, t) => sum + t.amount, 0)
    ),
    totalTransactions: transactions.length,
  };

  const columns = [
    {
      key: 'type',
      label: 'Type',
      sortable: true,
      render: (tx: Transaction) => (
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1 w-fit capitalize ${
            typeColors[tx.type]
          }`}
        >
          {typeIcons[tx.type]}
          {tx.type}
        </span>
      ),
    },
    {
      key: 'description',
      label: 'Description',
      sortable: false,
      render: (tx: Transaction) => (
        <div className="max-w-xs">
          <p className="text-white text-sm truncate">{tx.description}</p>
          {tx.provider && (
            <p className="text-gray-400 text-xs">
              {tx.provider}
              {tx.model && ` / ${tx.model}`}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
      sortable: true,
      render: (tx: Transaction) => (
        <div className="flex items-center gap-1">
          {tx.amount > 0 ? (
            <TrendingUp size={14} className="text-green-400" />
          ) : (
            <TrendingDown size={14} className="text-red-400" />
          )}
          <span
            className={`font-medium ${
              tx.amount > 0 ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {tx.amount > 0 ? '+' : ''}
            {tx.amount.toLocaleString()}
          </span>
        </div>
      ),
    },
    {
      key: 'tokens_used',
      label: 'Tokens',
      sortable: true,
      render: (tx: Transaction) => (
        <span className="text-gray-400">
          {tx.tokens_used ? tx.tokens_used.toLocaleString() : '-'}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Date',
      sortable: true,
      render: (tx: Transaction) => (
        <span className="text-gray-400 text-sm">{formatDate(tx.created_at)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Transactions</h1>
          <p className="text-gray-400 mt-1">View all credit transactions</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500"
          >
            <option value="all">All Types</option>
            <option value="purchase">Purchases</option>
            <option value="usage">Usage</option>
            <option value="bonus">Bonuses</option>
            <option value="signup">Signups</option>
            <option value="refund">Refunds</option>
          </select>
          <button
            onClick={loadTransactions}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800 rounded-xl p-4 border border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Transactions</p>
              <p className="text-2xl font-bold text-white">
                {stats.totalTransactions.toLocaleString()}
              </p>
            </div>
            <Receipt size={24} className="text-gray-400" />
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-800 rounded-xl p-4 border border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Credits Added</p>
              <p className="text-2xl font-bold text-green-400">
                +{stats.totalCreditsAdded.toLocaleString()}
              </p>
            </div>
            <TrendingUp size={24} className="text-green-400" />
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-800 rounded-xl p-4 border border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Credits Used</p>
              <p className="text-2xl font-bold text-red-400">
                -{stats.totalCreditsUsed.toLocaleString()}
              </p>
            </div>
            <TrendingDown size={24} className="text-red-400" />
          </div>
        </motion.div>
      </div>

      {/* Transactions Table */}
      <DataTable
        data={filteredTransactions}
        columns={columns}
        keyField="id"
        isLoading={isLoading}
        searchPlaceholder="Search transactions..."
        emptyMessage="No transactions found"
      />
    </div>
  );
}
