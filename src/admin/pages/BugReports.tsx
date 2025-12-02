// =============================================================================
// Bug Reports Page
// =============================================================================

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bug,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  X,
  MessageSquare,
} from 'lucide-react';
import { DataTable } from '../components/DataTable';
import { getBugReports, updateBugReport } from '../services/admin-api';
import type { BugReport } from '../types';

const severityColors = {
  low: 'bg-blue-500/20 text-blue-400',
  medium: 'bg-yellow-500/20 text-yellow-400',
  high: 'bg-orange-500/20 text-orange-400',
  critical: 'bg-red-500/20 text-red-400',
};

const statusColors = {
  open: 'bg-blue-500/20 text-blue-400',
  in_progress: 'bg-yellow-500/20 text-yellow-400',
  resolved: 'bg-green-500/20 text-green-400',
  closed: 'bg-gray-500/20 text-gray-400',
  wont_fix: 'bg-red-500/20 text-red-400',
};

const statusIcons = {
  open: <AlertCircle size={14} />,
  in_progress: <Clock size={14} />,
  resolved: <CheckCircle size={14} />,
  closed: <CheckCircle size={14} />,
  wont_fix: <XCircle size={14} />,
};

export function BugReports() {
  const [bugs, setBugs] = useState<BugReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBug, setSelectedBug] = useState<BugReport | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadBugs();
  }, [statusFilter]);

  const loadBugs = async () => {
    setIsLoading(true);
    try {
      const data = await getBugReports(statusFilter);
      setBugs(data);
    } catch (error) {
      console.error('Error loading bugs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (bugId: string, status: BugReport['status']) => {
    setActionLoading(true);
    try {
      const updates: Partial<BugReport> = { status };
      if (status === 'resolved' || status === 'closed') {
        updates.resolved_at = new Date().toISOString();
      }

      const success = await updateBugReport(bugId, updates);
      if (success) {
        setBugs((prev) =>
          prev.map((b) => (b.id === bugId ? { ...b, ...updates } : b))
        );
        if (selectedBug?.id === bugId) {
          setSelectedBug({ ...selectedBug, ...updates });
        }
      }
    } catch (error) {
      console.error('Error updating bug:', error);
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
    });
  };

  const columns = [
    {
      key: 'title',
      label: 'Bug',
      sortable: true,
      render: (bug: BugReport) => (
        <div className="max-w-xs">
          <p className="text-white font-medium truncate">{bug.title}</p>
          <p className="text-gray-400 text-xs truncate">{bug.description}</p>
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Category',
      sortable: true,
      render: (bug: BugReport) => (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-700 text-gray-300 capitalize">
          {bug.category}
        </span>
      ),
    },
    {
      key: 'severity',
      label: 'Severity',
      sortable: true,
      render: (bug: BugReport) => (
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${
            severityColors[bug.severity]
          }`}
        >
          {bug.severity}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (bug: BugReport) => (
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1 w-fit ${
            statusColors[bug.status]
          }`}
        >
          {statusIcons[bug.status]}
          {bug.status.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Reported',
      sortable: true,
      render: (bug: BugReport) => (
        <span className="text-gray-400 text-sm">{formatDate(bug.created_at)}</span>
      ),
    },
  ];

  const renderActions = (bug: BugReport) => (
    <button
      onClick={(e) => {
        e.stopPropagation();
        setSelectedBug(bug);
        setShowDetailModal(true);
      }}
      className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
      title="View Details"
    >
      <Eye size={16} />
    </button>
  );

  const stats = {
    open: bugs.filter((b) => b.status === 'open').length,
    in_progress: bugs.filter((b) => b.status === 'in_progress').length,
    critical: bugs.filter((b) => b.severity === 'critical' && b.status !== 'resolved' && b.status !== 'closed').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Bug Reports</h1>
          <p className="text-gray-400 mt-1">Track and manage user-reported issues</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
            <option value="wont_fix">Won't Fix</option>
          </select>
          <button
            onClick={loadBugs}
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
              <p className="text-gray-400 text-sm">Open Bugs</p>
              <p className="text-2xl font-bold text-blue-400">{stats.open}</p>
            </div>
            <AlertCircle size={24} className="text-blue-400" />
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
              <p className="text-gray-400 text-sm">In Progress</p>
              <p className="text-2xl font-bold text-yellow-400">{stats.in_progress}</p>
            </div>
            <Clock size={24} className="text-yellow-400" />
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
              <p className="text-gray-400 text-sm">Critical</p>
              <p className="text-2xl font-bold text-red-400">{stats.critical}</p>
            </div>
            <Bug size={24} className="text-red-400" />
          </div>
        </motion.div>
      </div>

      {/* Bugs Table */}
      <DataTable
        data={bugs}
        columns={columns}
        keyField="id"
        isLoading={isLoading}
        searchPlaceholder="Search bugs..."
        actions={renderActions}
        emptyMessage="No bug reports found"
        onRowClick={(bug) => {
          setSelectedBug(bug);
          setShowDetailModal(true);
        }}
      />

      {/* Bug Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedBug && (
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
              className="bg-gray-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">{selectedBug.title}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${
                        severityColors[selectedBug.severity]
                      }`}
                    >
                      {selectedBug.severity}
                    </span>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${
                        statusColors[selectedBug.status]
                      }`}
                    >
                      {selectedBug.status.replace('_', ' ')}
                    </span>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-700 text-gray-300 capitalize">
                      {selectedBug.category}
                    </span>
                  </div>
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
                  <h4 className="text-sm font-medium text-gray-400 mb-1">Description</h4>
                  <p className="text-gray-300 bg-gray-700/50 p-3 rounded-lg">
                    {selectedBug.description}
                  </p>
                </div>

                {selectedBug.steps_to_reproduce && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-1">
                      Steps to Reproduce
                    </h4>
                    <p className="text-gray-300 bg-gray-700/50 p-3 rounded-lg whitespace-pre-wrap">
                      {selectedBug.steps_to_reproduce}
                    </p>
                  </div>
                )}

                {selectedBug.expected_behavior && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-1">
                      Expected Behavior
                    </h4>
                    <p className="text-gray-300 bg-gray-700/50 p-3 rounded-lg">
                      {selectedBug.expected_behavior}
                    </p>
                  </div>
                )}

                {selectedBug.actual_behavior && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-1">
                      Actual Behavior
                    </h4>
                    <p className="text-gray-300 bg-gray-700/50 p-3 rounded-lg">
                      {selectedBug.actual_behavior}
                    </p>
                  </div>
                )}

                {selectedBug.browser_info && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-1">
                      Browser Info
                    </h4>
                    <pre className="text-gray-300 bg-gray-700/50 p-3 rounded-lg text-xs overflow-x-auto">
                      {JSON.stringify(selectedBug.browser_info, null, 2)}
                    </pre>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Reported:</span>
                    <span className="text-gray-300 ml-2">
                      {formatDate(selectedBug.created_at)}
                    </span>
                  </div>
                  {selectedBug.resolved_at && (
                    <div>
                      <span className="text-gray-400">Resolved:</span>
                      <span className="text-gray-300 ml-2">
                        {formatDate(selectedBug.resolved_at)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Status Actions */}
                <div className="pt-4 border-t border-gray-700">
                  <h4 className="text-sm font-medium text-gray-400 mb-2">
                    Update Status
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {(['open', 'in_progress', 'resolved', 'closed', 'wont_fix'] as const).map(
                      (status) => (
                        <button
                          key={status}
                          onClick={() => handleUpdateStatus(selectedBug.id, status)}
                          disabled={selectedBug.status === status || actionLoading}
                          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                            selectedBug.status === status
                              ? 'bg-purple-600 text-white cursor-default'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          {status.replace('_', ' ')}
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
