// =============================================================================
// Error Logs Page
// =============================================================================

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  AlertCircle,
  XCircle,
  Eye,
  X,
  CheckCircle,
  Filter,
} from 'lucide-react';
import { DataTable } from '../components/DataTable';
import { getErrorLogs, resolveErrorLog } from '../services/admin-api';
import type { ErrorLog } from '../types';

const severityColors = {
  warning: 'bg-yellow-500/20 text-yellow-400',
  error: 'bg-orange-500/20 text-orange-400',
  critical: 'bg-red-500/20 text-red-400',
};

const severityIcons = {
  warning: <AlertCircle size={14} />,
  error: <AlertTriangle size={14} />,
  critical: <XCircle size={14} />,
};

export function ErrorLogs() {
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [filters, setFilters] = useState({
    severity: 'all',
    provider: 'all',
    resolved: 'all',
  });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadErrors();
  }, [filters]);

  const loadErrors = async () => {
    setIsLoading(true);
    try {
      const data = await getErrorLogs({
        severity: filters.severity !== 'all' ? filters.severity : undefined,
        provider: filters.provider !== 'all' ? filters.provider : undefined,
        resolved: filters.resolved === 'all' ? undefined : filters.resolved === 'resolved',
      });
      setErrors(data);
    } catch (error) {
      console.error('Error loading error logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolve = async (errorId: string, notes?: string) => {
    setActionLoading(true);
    try {
      const success = await resolveErrorLog(errorId, notes);
      if (success) {
        setErrors((prev) =>
          prev.map((e) =>
            e.id === errorId ? { ...e, is_resolved: true, resolution_notes: notes || null } : e
          )
        );
        if (selectedError?.id === errorId) {
          setSelectedError({ ...selectedError, is_resolved: true, resolution_notes: notes || null });
        }
      }
    } catch (error) {
      console.error('Error resolving error log:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const uniqueProviders = [...new Set(errors.map((e) => e.provider).filter(Boolean))];

  const columns = [
    {
      key: 'severity',
      label: 'Severity',
      sortable: true,
      width: '100px',
      render: (error: ErrorLog) => (
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1 w-fit ${
            severityColors[error.severity]
          }`}
        >
          {severityIcons[error.severity]}
          {error.severity}
        </span>
      ),
    },
    {
      key: 'error_type',
      label: 'Type',
      sortable: true,
      render: (error: ErrorLog) => (
        <span className="text-gray-300 font-mono text-sm">{error.error_type}</span>
      ),
    },
    {
      key: 'error_message',
      label: 'Message',
      sortable: false,
      render: (error: ErrorLog) => (
        <div className="max-w-xs">
          <p className="text-white text-sm truncate">{error.error_message}</p>
          {error.component && (
            <p className="text-gray-400 text-xs">Component: {error.component}</p>
          )}
        </div>
      ),
    },
    {
      key: 'provider',
      label: 'Provider',
      sortable: true,
      render: (error: ErrorLog) => (
        <div className="text-sm">
          {error.provider ? (
            <>
              <p className="text-gray-300 capitalize">{error.provider}</p>
              {error.model && <p className="text-gray-400 text-xs">{error.model}</p>}
            </>
          ) : (
            <span className="text-gray-500">-</span>
          )}
        </div>
      ),
    },
    {
      key: 'created_at',
      label: 'Time',
      sortable: true,
      render: (error: ErrorLog) => (
        <span className="text-gray-400 text-sm">{formatDate(error.created_at)}</span>
      ),
    },
    {
      key: 'is_resolved',
      label: 'Status',
      sortable: true,
      render: (error: ErrorLog) => (
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${
            error.is_resolved
              ? 'bg-green-500/20 text-green-400'
              : 'bg-red-500/20 text-red-400'
          }`}
        >
          {error.is_resolved ? 'Resolved' : 'Unresolved'}
        </span>
      ),
    },
  ];

  const renderActions = (error: ErrorLog) => (
    <div className="flex items-center gap-1">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setSelectedError(error);
          setShowDetailModal(true);
        }}
        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
        title="View Details"
      >
        <Eye size={16} />
      </button>
      {!error.is_resolved && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleResolve(error.id);
          }}
          className="p-2 text-gray-400 hover:text-green-400 hover:bg-gray-700 rounded-lg transition-colors"
          title="Mark Resolved"
          disabled={actionLoading}
        >
          <CheckCircle size={16} />
        </button>
      )}
    </div>
  );

  const stats = {
    total: errors.length,
    critical: errors.filter((e) => e.severity === 'critical' && !e.is_resolved).length,
    unresolved: errors.filter((e) => !e.is_resolved).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Error Logs</h1>
          <p className="text-gray-400 mt-1">Monitor and resolve application errors</p>
        </div>
        <button
          onClick={loadErrors}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Refresh
        </button>
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
              <p className="text-gray-400 text-sm">Total Errors</p>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
            </div>
            <AlertTriangle size={24} className="text-gray-400" />
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
              <p className="text-gray-400 text-sm">Critical</p>
              <p className="text-2xl font-bold text-red-400">{stats.critical}</p>
            </div>
            <XCircle size={24} className="text-red-400" />
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
              <p className="text-gray-400 text-sm">Unresolved</p>
              <p className="text-2xl font-bold text-orange-400">{stats.unresolved}</p>
            </div>
            <AlertCircle size={24} className="text-orange-400" />
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-400" />
          <span className="text-gray-400 text-sm">Filters:</span>
        </div>
        <select
          value={filters.severity}
          onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500"
        >
          <option value="all">All Severity</option>
          <option value="warning">Warning</option>
          <option value="error">Error</option>
          <option value="critical">Critical</option>
        </select>
        <select
          value={filters.provider}
          onChange={(e) => setFilters({ ...filters, provider: e.target.value })}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500"
        >
          <option value="all">All Providers</option>
          {uniqueProviders.map((provider) => (
            <option key={provider} value={provider || ''}>
              {provider}
            </option>
          ))}
        </select>
        <select
          value={filters.resolved}
          onChange={(e) => setFilters({ ...filters, resolved: e.target.value })}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500"
        >
          <option value="all">All Status</option>
          <option value="unresolved">Unresolved</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {/* Error Logs Table */}
      <DataTable
        data={errors}
        columns={columns}
        keyField="id"
        isLoading={isLoading}
        searchPlaceholder="Search errors..."
        actions={renderActions}
        emptyMessage="No error logs found"
        onRowClick={(error) => {
          setSelectedError(error);
          setShowDetailModal(true);
        }}
      />

      {/* Error Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowDetailModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-gray-800 rounded-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${
                        severityColors[selectedError.severity]
                      }`}
                    >
                      {severityIcons[selectedError.severity]}
                      {selectedError.severity}
                    </span>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        selectedError.is_resolved
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {selectedError.is_resolved ? 'Resolved' : 'Unresolved'}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-white mt-2">
                    {selectedError.error_type}
                  </h3>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-1 text-gray-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-1">Error Message</h4>
                  <p className="text-red-400 bg-gray-700/50 p-3 rounded-lg font-mono text-sm">
                    {selectedError.error_message}
                  </p>
                </div>

                {selectedError.error_stack && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-1">Stack Trace</h4>
                    <pre className="text-gray-300 bg-gray-900 p-3 rounded-lg text-xs overflow-x-auto max-h-48">
                      {selectedError.error_stack}
                    </pre>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {selectedError.component && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-1">Component</h4>
                      <p className="text-gray-300">{selectedError.component}</p>
                    </div>
                  )}
                  {selectedError.provider && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-1">Provider</h4>
                      <p className="text-gray-300 capitalize">
                        {selectedError.provider}
                        {selectedError.model && ` / ${selectedError.model}`}
                      </p>
                    </div>
                  )}
                  {selectedError.url && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-1">URL</h4>
                      <p className="text-gray-300 text-sm truncate">{selectedError.url}</p>
                    </div>
                  )}
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-1">Time</h4>
                    <p className="text-gray-300">{formatDate(selectedError.created_at)}</p>
                  </div>
                </div>

                {selectedError.request_data && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-1">Request Data</h4>
                    <pre className="text-gray-300 bg-gray-900 p-3 rounded-lg text-xs overflow-x-auto max-h-32">
                      {JSON.stringify(selectedError.request_data, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedError.browser_info && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-1">Browser Info</h4>
                    <pre className="text-gray-300 bg-gray-700/50 p-3 rounded-lg text-xs overflow-x-auto">
                      {JSON.stringify(selectedError.browser_info, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Actions */}
                {!selectedError.is_resolved && (
                  <div className="pt-4 border-t border-gray-700">
                    <button
                      onClick={() => handleResolve(selectedError.id)}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      <CheckCircle size={16} />
                      {actionLoading ? 'Resolving...' : 'Mark as Resolved'}
                    </button>
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
