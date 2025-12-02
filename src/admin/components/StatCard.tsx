// =============================================================================
// Stat Card Component
// =============================================================================

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    label: string;
  };
  color?: 'blue' | 'green' | 'purple' | 'yellow' | 'red' | 'gray';
  isLoading?: boolean;
}

const colorClasses = {
  blue: 'from-blue-500 to-blue-600',
  green: 'from-green-500 to-green-600',
  purple: 'from-purple-500 to-purple-600',
  yellow: 'from-yellow-500 to-yellow-600',
  red: 'from-red-500 to-red-600',
  gray: 'from-gray-500 to-gray-600',
};

export function StatCard({
  title,
  value,
  icon,
  trend,
  color = 'blue',
  isLoading = false,
}: StatCardProps) {
  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend.value > 0) return <TrendingUp size={14} className="text-green-400" />;
    if (trend.value < 0) return <TrendingDown size={14} className="text-red-400" />;
    return <Minus size={14} className="text-gray-400" />;
  };

  const getTrendColor = () => {
    if (!trend) return 'text-gray-400';
    if (trend.value > 0) return 'text-green-400';
    if (trend.value < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800 rounded-xl p-5 border border-gray-700"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-gray-400 text-sm font-medium">{title}</p>
          {isLoading ? (
            <div className="h-8 w-24 bg-gray-700 rounded animate-pulse mt-2" />
          ) : (
            <p className="text-2xl font-bold text-white mt-1">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
          )}
          {trend && !isLoading && (
            <div className={`flex items-center gap-1 mt-2 text-xs ${getTrendColor()}`}>
              {getTrendIcon()}
              <span>
                {trend.value > 0 ? '+' : ''}
                {trend.value}% {trend.label}
              </span>
            </div>
          )}
        </div>
        <div
          className={`p-3 rounded-lg bg-gradient-to-br ${colorClasses[color]} bg-opacity-20`}
        >
          {icon}
        </div>
      </div>
    </motion.div>
  );
}
