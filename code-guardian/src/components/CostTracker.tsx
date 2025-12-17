/**
 * COST TRACKER COMPONENT
 * ======================
 * Displays LLM API costs and usage statistics
 */

import { useState, useEffect } from 'react';

interface CostSummary {
  totalAnalyses: number;
  totalCost: number;
  totalTokens: {
    input: number;
    output: number;
    total: number;
  };
  averageCostPerAnalysis: number;
  averageTokensPerAnalysis: number;
  byProvider: Array<{
    name: string;
    count: number;
    cost: number;
    tokens: number;
    avgCost: number;
  }>;
  byModel: Array<{
    name: string;
    count: number;
    cost: number;
    tokens: number;
    avgCost: number;
  }>;
  byRisk: {
    high: number;
    medium: number;
    low: number;
  };
  recentAnalyses: Array<{
    timestamp: string;
    file: string;
    provider: string;
    model: string;
    tokens: { input: number; output: number; total: number };
    cost: number;
    riskScore: number;
  }>;
}

export function CostTracker() {
  const [costs, setCosts] = useState<CostSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    const fetchCosts = async () => {
      try {
        const response = await fetch('http://localhost:4000/api/costs');
        const data = await response.json();
        setCosts(data);
      } catch (error) {
        console.error('Failed to fetch costs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCosts();

    // Auto-refresh every 10 seconds
    const interval = autoRefresh ? setInterval(fetchCosts, 10000) : null;
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  if (loading) {
    return (
      <div className="text-center py-8 text-slate-500">
        Loading cost data...
      </div>
    );
  }

  if (!costs) {
    return (
      <div className="text-center py-8 text-slate-500">
        No cost data available
      </div>
    );
  }

  const formatCost = (cost: number) => `$${cost.toFixed(4)}`;
  const formatTokens = (tokens: number) => tokens.toLocaleString();

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Cost */}
        <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 border border-emerald-500/30 rounded-lg p-4">
          <div className="text-sm text-emerald-400 mb-1">Total Cost</div>
          <div className="text-3xl font-bold text-emerald-300">{formatCost(costs.totalCost)}</div>
          <div className="text-xs text-emerald-400/70 mt-2">{costs.totalAnalyses} analyses</div>
        </div>

        {/* Avg Cost Per Analysis */}
        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-lg p-4">
          <div className="text-sm text-blue-400 mb-1">Avg Cost/Analysis</div>
          <div className="text-3xl font-bold text-blue-300">{formatCost(costs.averageCostPerAnalysis)}</div>
          <div className="text-xs text-blue-400/70 mt-2">{costs.averageTokensPerAnalysis} tokens avg</div>
        </div>

        {/* Total Tokens */}
        <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-lg p-4">
          <div className="text-sm text-purple-400 mb-1">Total Tokens</div>
          <div className="text-3xl font-bold text-purple-300">{formatTokens(costs.totalTokens.total)}</div>
          <div className="text-xs text-purple-400/70 mt-2">
            {formatTokens(costs.totalTokens.input)} in / {formatTokens(costs.totalTokens.output)} out
          </div>
        </div>

        {/* Risk Distribution */}
        <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/20 border border-amber-500/30 rounded-lg p-4">
          <div className="text-sm text-amber-400 mb-1">Risk Distribution</div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-red-400">🔴 {costs.byRisk.high}</span>
            <span className="text-amber-400">🟡 {costs.byRisk.medium}</span>
            <span className="text-emerald-400">🟢 {costs.byRisk.low}</span>
          </div>
        </div>
      </div>

      {/* By Provider */}
      {costs.byProvider.length > 0 && (
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">By Provider</h3>
          <div className="space-y-2">
            {costs.byProvider.map(provider => (
              <div key={provider.name} className="flex items-center justify-between text-sm">
                <div className="flex-1">
                  <div className="font-mono text-slate-300">{provider.name}</div>
                  <div className="text-xs text-slate-500">
                    {provider.count} analyses • {formatTokens(provider.tokens)} tokens
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-emerald-400">{formatCost(provider.cost)}</div>
                  <div className="text-xs text-slate-500">{formatCost(provider.avgCost)}/ea</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* By Model */}
      {costs.byModel.length > 0 && (
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">By Model</h3>
          <div className="space-y-2">
            {costs.byModel.map(model => (
              <div key={model.name} className="flex items-center justify-between text-sm">
                <div className="flex-1">
                  <div className="font-mono text-slate-300">{model.name}</div>
                  <div className="text-xs text-slate-500">
                    {model.count} analyses • {formatTokens(model.tokens)} tokens
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-emerald-400">{formatCost(model.cost)}</div>
                  <div className="text-xs text-slate-500">{formatCost(model.avgCost)}/ea</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Analyses */}
      {costs.recentAnalyses.length > 0 && (
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Recent Analyses</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {costs.recentAnalyses.map((analysis, i) => (
              <div key={i} className="flex items-center justify-between text-xs p-2 bg-slate-900/50 rounded">
                <div className="flex-1 min-w-0">
                  <div className="text-slate-300 truncate">{analysis.file}</div>
                  <div className="text-slate-500">
                    {analysis.model} • {analysis.tokens.total} tokens
                  </div>
                </div>
                <div className="text-right ml-2">
                  <div className="text-emerald-400 font-mono">{formatCost(analysis.cost)}</div>
                  <div className={
                    analysis.riskScore >= 7 ? 'text-red-400' :
                    analysis.riskScore >= 4 ? 'text-amber-400' : 'text-emerald-400'
                  }>
                    {analysis.riskScore}/10
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="rounded"
          />
          Auto-refresh every 10s
        </label>
        <button
          onClick={() => {
            const response = fetch('http://localhost:4000/api/costs');
            response.then(r => r.json()).then(data => setCosts(data));
          }}
          className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm transition-colors"
        >
          Refresh Now
        </button>
      </div>
    </div>
  );
}

export default CostTracker;
