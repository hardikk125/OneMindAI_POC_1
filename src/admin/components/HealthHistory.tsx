// =============================================================================
// Health History Component
// =============================================================================

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Filter,
} from 'lucide-react';
import { getSupabase } from '../../lib/supabase/client';

interface HealthLog {
  id: string;
  model_id: string;
  is_working: boolean;
  response_time: number;
  error_message?: string;
  error_code?: string;
  checked_at: string;
  model_name?: string;
  engine_name?: string;
}

export function HealthHistory() {
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');

  useEffect(() => {
    loadHistory();
  }, [filter, timeRange]);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const supabase = getSupabase();
      
      // Calculate time range
      const now = new Date();
      const timeRanges = {
        '1h': new Date(now.getTime() - 60 * 60 * 1000),
        '24h': new Date(now.getTime() - 24 * 60 * 60 * 1000),
        '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      };

      let query = supabase
        .from('model_health_logs')
        .select(`
          *,
          ai_models!inner(
            model_id,
            display_name,
            ai_engines!inner(name)
          )
        `)
        .gte('checked_at', timeRanges[timeRange].toISOString())
        .order('checked_at', { ascending: false })
        .limit(100);

      // Apply filter
      if (filter === 'success') {
        query = query.eq('is_working', true);
      } else if (filter === 'failed') {
        query = query.eq('is_working', false);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[Health History] Error fetching:', error);
        return;
      }

      console.log(`[Health History] Loaded ${data?.length || 0} health check logs`);

      // Map the data with proper joins
      const mappedLogs = (data || []).map((log: any) => ({
        id: log.id,
        model_id: log.ai_models?.model_id || 'Unknown',
        is_working: log.is_working,
        response_time: log.response_time,
        error_message: log.error_message,
        error_code: log.error_code,
        checked_at: log.checked_at,
        model_name: log.ai_models?.display_name || log.ai_models?.model_id || 'Unknown',
        engine_name: log.ai_models?.ai_engines?.name || 'Unknown',
      }));

      setLogs(mappedLogs);
    } catch (error) {
      console.error('Error loading health history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStats = () => {
    const total = logs.length;
    const successful = logs.filter(l => l.is_working).length;
    const failed = logs.filter(l => !l.is_working).length;
    const avgResponseTime = logs.length > 0
      ? Math.round(logs.reduce((sum, l) => sum + (l.response_time || 0), 0) / logs.length)
      : 0;

    return { total, successful, failed, avgResponseTime };
  };

  const stats = getStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Health Check History</h1>
          <p className="text-gray-400 mt-1">View model health check logs and performance</p>
        </div>
        <button
          onClick={loadHistory}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800 rounded-xl p-4 border border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Checks</p>
              <p className="text-2xl font-bold text-white mt-1">{stats.total}</p>
            </div>
            <Activity size={24} className="text-purple-400" />
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
              <p className="text-gray-400 text-sm">Successful</p>
              <p className="text-2xl font-bold text-green-400 mt-1">{stats.successful}</p>
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
              <p className="text-gray-400 text-sm">Failed</p>
              <p className="text-2xl font-bold text-red-400 mt-1">{stats.failed}</p>
            </div>
            <TrendingDown size={24} className="text-red-400" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gray-800 rounded-xl p-4 border border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Avg Response</p>
              <p className="text-2xl font-bold text-blue-400 mt-1">{stats.avgResponseTime}ms</p>
            </div>
            <Clock size={24} className="text-blue-400" />
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-400" />
          <span className="text-sm text-gray-400">Filter:</span>
          <div className="flex gap-2">
            {(['all', 'success', 'failed'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  filter === f
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {f === 'all' ? 'All' : f === 'success' ? 'Success' : 'Failed'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Clock size={16} className="text-gray-400" />
          <span className="text-sm text-gray-400">Time:</span>
          <div className="flex gap-2">
            {(['1h', '24h', '7d', '30d'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimeRange(t)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  timeRange === t
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Engine</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Model</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Response Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Checked At</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
                    Loading history...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    No health checks found for the selected filters
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3">
                      {log.is_working ? (
                        <div className="flex items-center gap-2">
                          <CheckCircle size={16} className="text-green-400" />
                          <span className="text-sm text-green-400">Success</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <XCircle size={16} className="text-red-400" />
                          <span className="text-sm text-red-400">Failed</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-white">{log.engine_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-300">{log.model_name}</td>
                    <td className="px-4 py-3">
                      <span className={`text-sm ${
                        log.response_time < 500 ? 'text-green-400' :
                        log.response_time < 1000 ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {log.response_time}ms
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {new Date(log.checked_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {log.error_message || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
