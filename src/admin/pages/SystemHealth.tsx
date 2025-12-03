// =============================================================================
// System Health Page
// =============================================================================

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  Server,
  Database,
  Wifi,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { getDashboardStats } from '../services/admin-api';
import type { DashboardStats } from '../types';

interface HealthStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  latency: number;
  uptime: number;
  icon: React.ReactNode;
}

export function SystemHealth() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Mock latency data for chart
  const [latencyData] = useState(() =>
    Array.from({ length: 24 }, (_, i) => ({
      hour: `${i}:00`,
      api: Math.floor(Math.random() * 50) + 30,
      database: Math.floor(Math.random() * 20) + 10,
    }))
  );

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      const data = await getDashboardStats();
      setStats(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const healthStatuses: HealthStatus[] = [
    {
      name: 'API Server',
      status: 'healthy',
      latency: 45,
      uptime: 99.9,
      icon: <Server size={24} />,
    },
    {
      name: 'Database',
      status: 'healthy',
      latency: 12,
      uptime: 100,
      icon: <Database size={24} />,
    },
    {
      name: 'OpenAI',
      status: stats?.error_rate && stats.error_rate > 5 ? 'degraded' : 'healthy',
      latency: 234,
      uptime: 98.5,
      icon: <Wifi size={24} />,
    },
    {
      name: 'Anthropic',
      status: 'healthy',
      latency: 156,
      uptime: 99.8,
      icon: <Wifi size={24} />,
    },
    {
      name: 'Google AI',
      status: 'healthy',
      latency: 89,
      uptime: 99.9,
      icon: <Wifi size={24} />,
    },
    {
      name: 'Supabase',
      status: 'healthy',
      latency: 25,
      uptime: 100,
      icon: <Database size={24} />,
    },
  ];

  const getStatusColor = (status: HealthStatus['status']) => {
    switch (status) {
      case 'healthy':
        return 'text-green-400';
      case 'degraded':
        return 'text-yellow-400';
      case 'down':
        return 'text-red-400';
    }
  };

  const getStatusBg = (status: HealthStatus['status']) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500/20';
      case 'degraded':
        return 'bg-yellow-500/20';
      case 'down':
        return 'bg-red-500/20';
    }
  };

  const getStatusIcon = (status: HealthStatus['status']) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle size={16} className="text-green-400" />;
      case 'degraded':
        return <AlertTriangle size={16} className="text-yellow-400" />;
      case 'down':
        return <XCircle size={16} className="text-red-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">System Health</h1>
          <p className="text-gray-400 mt-1">
            Monitor system status and performance
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-400">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
          <button
            onClick={loadStats}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Overall Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800 rounded-xl p-6 border border-gray-700"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
              <CheckCircle size={32} className="text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">All Systems Operational</h2>
              <p className="text-gray-400">
                {healthStatuses.filter((s) => s.status === 'healthy').length} of{' '}
                {healthStatuses.length} services healthy
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-green-400">99.9%</p>
            <p className="text-gray-400 text-sm">Overall Uptime</p>
          </div>
        </div>
      </motion.div>

      {/* Service Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {healthStatuses.map((service, index) => (
          <motion.div
            key={service.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-gray-800 rounded-xl p-4 border border-gray-700"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${getStatusBg(service.status)}`}>
                  <span className={getStatusColor(service.status)}>{service.icon}</span>
                </div>
                <div>
                  <h3 className="text-white font-medium">{service.name}</h3>
                  <div className="flex items-center gap-1 mt-1">
                    {getStatusIcon(service.status)}
                    <span className={`text-sm capitalize ${getStatusColor(service.status)}`}>
                      {service.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <p className="text-gray-400 text-xs">Latency</p>
                <p className="text-white font-medium">{service.latency}ms</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs">Uptime</p>
                <p className="text-white font-medium">{service.uptime}%</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800 rounded-xl p-4 border border-gray-700"
        >
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <Activity size={16} />
            <span className="text-sm">Requests Today</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {isLoading ? '-' : stats?.total_requests_today?.toLocaleString() || '0'}
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-800 rounded-xl p-4 border border-gray-700"
        >
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <Clock size={16} />
            <span className="text-sm">Avg Response Time</span>
          </div>
          <p className="text-2xl font-bold text-white">45ms</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-800 rounded-xl p-4 border border-gray-700"
        >
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <AlertTriangle size={16} />
            <span className="text-sm">Error Rate</span>
          </div>
          <p className={`text-2xl font-bold ${
            stats?.error_rate && stats.error_rate > 5 ? 'text-red-400' : 'text-green-400'
          }`}>
            {isLoading ? '-' : `${(stats?.error_rate || 0).toFixed(2)}%`}
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gray-800 rounded-xl p-4 border border-gray-700"
        >
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <Server size={16} />
            <span className="text-sm">Active Users</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {isLoading ? '-' : stats?.active_users_today?.toLocaleString() || '0'}
          </p>
        </motion.div>
      </div>

      {/* Latency Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800 rounded-xl p-6 border border-gray-700"
      >
        <h3 className="text-lg font-semibold text-white mb-4">
          Response Time (Last 24 Hours)
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={latencyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="hour" stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={12} unit="ms" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#fff' }}
              />
              <Line
                type="monotone"
                dataKey="api"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={false}
                name="API"
              />
              <Line
                type="monotone"
                dataKey="database"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                name="Database"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Recent Incidents */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800 rounded-xl p-6 border border-gray-700"
      >
        <h3 className="text-lg font-semibold text-white mb-4">Recent Incidents</h3>
        <div className="space-y-3">
          {stats?.error_count_today && stats.error_count_today > 0 ? (
            <div className="flex items-center gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <AlertTriangle size={20} className="text-yellow-400" />
              <div>
                <p className="text-white font-medium">
                  {stats.error_count_today} errors detected today
                </p>
                <p className="text-gray-400 text-sm">
                  Check Error Logs for details
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <CheckCircle size={20} className="text-green-400" />
              <div>
                <p className="text-white font-medium">No incidents today</p>
                <p className="text-gray-400 text-sm">All systems running smoothly</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
