/**
 * API Configuration Page
 * 
 * Admin interface for managing OneMind API access control:
 * - Model Whitelist - Which models users can access via OneMind API
 * - Provider Whitelist - Which providers are enabled
 * - Global API Settings - Timeouts, retries, rate limits
 * 
 * Created: 2025-12-18 | Initials: HP | Layer: Frontend | Type: Component | I/O: Output
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw,
  Check,
  X,
  AlertCircle,
  Zap,
  Shield,
  Settings,
  ChevronDown,
  ChevronRight,
  Globe,
  Timer,
  Repeat,
  Activity,
  Bot,
  Search,
  Info,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import {
  fetchApiProviderConfigs,
  updateApiProviderConfig,
  fetchGlobalApiSettings,
  updateGlobalApiSetting,
} from '../services/admin-config-service';
import { getSupabase } from '../../lib/supabase/client';
import type { ApiProviderConfig, GlobalApiSettings } from '../types';

// =============================================================================
// TYPES
// =============================================================================

interface AIModel {
  id: string;
  provider: string;
  model_id: string;
  display_name: string;
  max_output_tokens: number;
  context_window: number;
  input_price_per_million: number;
  output_price_per_million: number;
  description: string | null;
  is_active: boolean;
  capabilities: string[];
}

// =============================================================================
// CONSTANTS
// =============================================================================

const PROVIDER_ICONS: Record<string, string> = {
  openai: '🤖',
  anthropic: '🧠',
  gemini: '✨',
  deepseek: '🔍',
  mistral: '🌬️',
  perplexity: '🔮',
  groq: '⚡',
  xai: '🚀',
  kimi: '🌙',
  falcon: '🦅',
  sarvam: '🇮🇳',
  huggingface: '🤗',
  generic: '🔌',
};

const PROVIDER_COLORS: Record<string, string> = {
  openai: 'bg-green-500/20 border-green-500/50 text-green-400',
  anthropic: 'bg-orange-500/20 border-orange-500/50 text-orange-400',
  gemini: 'bg-blue-500/20 border-blue-500/50 text-blue-400',
  deepseek: 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400',
  mistral: 'bg-purple-500/20 border-purple-500/50 text-purple-400',
  perplexity: 'bg-pink-500/20 border-pink-500/50 text-pink-400',
  groq: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400',
  xai: 'bg-red-500/20 border-red-500/50 text-red-400',
  kimi: 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400',
  falcon: 'bg-slate-500/20 border-slate-500/50 text-slate-400',
  sarvam: 'bg-orange-600/20 border-orange-600/50 text-orange-400',
  huggingface: 'bg-yellow-400/20 border-yellow-400/50 text-yellow-400',
  generic: 'bg-gray-500/20 border-gray-500/50 text-gray-400',
};

// =============================================================================
// COMPONENT
// =============================================================================

export function ApiConfig() {
  // State
  const [models, setModels] = useState<AIModel[]>([]);
  const [providers, setProviders] = useState<ApiProviderConfig[]>([]);
  const [globalSettings, setGlobalSettings] = useState<GlobalApiSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Filter state
  const [modelSearch, setModelSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  
  // Expanded sections
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['models', 'providers', 'global'])
  );

  // ==========================================================================
  // FETCH DATA
  // ==========================================================================

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const supabase = getSupabase();
      if (!supabase) throw new Error('Supabase not available');

      // Fetch models, providers, and global settings in parallel
      const [modelsResult, providersData, settingsData] = await Promise.all([
        supabase.from('ai_models').select('*').order('provider').order('model_id'),
        fetchApiProviderConfigs(),
        fetchGlobalApiSettings(),
      ]);

      if (modelsResult.error) throw modelsResult.error;

      setModels((modelsResult.data as AIModel[]) || []);
      setProviders(providersData);
      setGlobalSettings(settingsData);
    } catch (err) {
      console.error('[ApiConfig] Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load API configuration');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ==========================================================================
  // COMPUTED VALUES
  // ==========================================================================

  const uniqueProviders = useMemo(() => {
    const providerSet = new Set(models.map(m => m.provider));
    return Array.from(providerSet).sort();
  }, [models]);

  const filteredModels = useMemo(() => {
    return models.filter(model => {
      // Provider filter
      if (providerFilter !== 'all' && model.provider !== providerFilter) return false;
      
      // Active filter
      if (showActiveOnly && !model.is_active) return false;
      
      // Search filter
      if (modelSearch) {
        const search = modelSearch.toLowerCase();
        return (
          model.model_id.toLowerCase().includes(search) ||
          model.display_name.toLowerCase().includes(search) ||
          model.provider.toLowerCase().includes(search)
        );
      }
      
      return true;
    });
  }, [models, providerFilter, showActiveOnly, modelSearch]);

  const modelStats = useMemo(() => {
    const total = models.length;
    const active = models.filter(m => m.is_active).length;
    const byProvider: Record<string, { total: number; active: number }> = {};
    
    models.forEach(m => {
      if (!byProvider[m.provider]) {
        byProvider[m.provider] = { total: 0, active: 0 };
      }
      byProvider[m.provider].total++;
      if (m.is_active) byProvider[m.provider].active++;
    });
    
    return { total, active, byProvider };
  }, [models]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleToggleModel = async (model: AIModel) => {
    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error('Supabase not available');

      const newStatus = !model.is_active;
      
      const { error: updateError } = await supabase
        .from('ai_models')
        .update({ is_active: newStatus, updated_at: new Date().toISOString() })
        .eq('id', model.id);

      if (updateError) throw updateError;

      setModels(prev => prev.map(m => 
        m.id === model.id ? { ...m, is_active: newStatus } : m
      ));
      
      showSuccess(`${model.display_name} ${newStatus ? 'enabled' : 'disabled'}`);
    } catch (err) {
      showError(`Failed to update ${model.display_name}`);
    }
  };

  const handleToggleProvider = async (provider: string, isEnabled: boolean) => {
    try {
      await updateApiProviderConfig(provider, { is_enabled: isEnabled });
      setProviders(prev => prev.map(p => 
        p.provider === provider ? { ...p, is_enabled: isEnabled } : p
      ));
      showSuccess(`${provider} ${isEnabled ? 'enabled' : 'disabled'}`);
    } catch (err) {
      showError(`Failed to update ${provider}`);
    }
  };

  const handleBulkToggle = async (provider: string, enable: boolean) => {
    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error('Supabase not available');

      const { error: updateError } = await supabase
        .from('ai_models')
        .update({ is_active: enable, updated_at: new Date().toISOString() })
        .eq('provider', provider);

      if (updateError) throw updateError;

      setModels(prev => prev.map(m => 
        m.provider === provider ? { ...m, is_active: enable } : m
      ));
      
      showSuccess(`All ${provider} models ${enable ? 'enabled' : 'disabled'}`);
    } catch (err) {
      showError(`Failed to update ${provider} models`);
    }
  };

  const handleUpdateGlobalSetting = async (key: keyof GlobalApiSettings, value: number | boolean) => {
    if (!globalSettings) return;

    try {
      await updateGlobalApiSetting(key, value);
      setGlobalSettings(prev => prev ? { ...prev, [key]: value } : null);
      showSuccess(`Updated ${key.replace(/_/g, ' ')}`);
    } catch (err) {
      showError(`Failed to update ${key}`);
    }
  };

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const showError = (message: string) => {
    setError(message);
    setTimeout(() => setError(null), 5000);
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-purple-500 animate-spin" />
        <span className="ml-3 text-gray-400">Loading API configuration...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Settings className="w-7 h-7 text-purple-400" />
            OneMind API Access Control
          </h1>
          <p className="text-gray-400 mt-1">
            Control which models and providers users can access via the OneMind API
          </p>
        </div>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center gap-2 transition-colors"
        >
          <RefreshCw size={18} />
          Refresh
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-2xl font-bold text-white">{modelStats.active}</div>
          <div className="text-sm text-gray-400">Active Models</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-2xl font-bold text-gray-500">{modelStats.total - modelStats.active}</div>
          <div className="text-sm text-gray-400">Disabled Models</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-2xl font-bold text-green-400">
            {providers.filter(p => p.is_enabled).length}
          </div>
          <div className="text-sm text-gray-400">Active Providers</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-2xl font-bold text-gray-500">
            {providers.filter(p => !p.is_enabled).length}
          </div>
          <div className="text-sm text-gray-400">Disabled Providers</div>
        </div>
      </div>

      {/* Notifications */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-green-500/20 border border-green-500/50 text-green-400 px-4 py-3 rounded-lg flex items-center gap-2"
          >
            <Check size={18} />
            {successMessage}
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg flex items-center gap-2"
          >
            <AlertCircle size={18} />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Model Whitelist Section */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <button
          onClick={() => toggleSection('models')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-750 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Bot className="w-5 h-5 text-blue-400" />
            <span className="text-lg font-semibold text-white">Model Whitelist</span>
            <span className="text-sm text-gray-500">
              ({modelStats.active} of {modelStats.total} enabled)
            </span>
          </div>
          {expandedSections.has('models') ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
        </button>

        <AnimatePresence>
          {expandedSections.has('models') && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-gray-700"
            >
              {/* Filters */}
              <div className="p-4 bg-gray-850 border-b border-gray-700 flex flex-wrap gap-4 items-center">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search models..."
                    value={modelSearch}
                    onChange={(e) => setModelSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500"
                  />
                </div>
                
                <select
                  value={providerFilter}
                  onChange={(e) => setProviderFilter(e.target.value)}
                  className="px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white"
                >
                  <option value="all">All Providers</option>
                  {uniqueProviders.map(p => (
                    <option key={p} value={p}>{p} ({modelStats.byProvider[p]?.active}/{modelStats.byProvider[p]?.total})</option>
                  ))}
                </select>

                <button
                  onClick={() => setShowActiveOnly(!showActiveOnly)}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                    showActiveOnly 
                      ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
                      : 'bg-gray-900 text-gray-400 border border-gray-600'
                  }`}
                >
                  {showActiveOnly ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                  Active Only
                </button>
              </div>

              {/* Model Grid */}
              <div className="p-4 grid gap-2 max-h-[500px] overflow-y-auto">
                {filteredModels.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No models match your filters
                  </div>
                ) : (
                  filteredModels.map(model => (
                    <ModelRow
                      key={model.id}
                      model={model}
                      onToggle={() => handleToggleModel(model)}
                    />
                  ))
                )}
              </div>

              {/* Bulk Actions */}
              {providerFilter !== 'all' && (
                <div className="p-4 bg-gray-850 border-t border-gray-700 flex gap-2">
                  <button
                    onClick={() => handleBulkToggle(providerFilter, true)}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm"
                  >
                    Enable All {providerFilter}
                  </button>
                  <button
                    onClick={() => handleBulkToggle(providerFilter, false)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm"
                  >
                    Disable All {providerFilter}
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Provider Whitelist Section */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <button
          onClick={() => toggleSection('providers')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-750 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-purple-400" />
            <span className="text-lg font-semibold text-white">Provider Whitelist</span>
            <span className="text-sm text-gray-500">
              ({providers.filter(p => p.is_enabled).length} of {providers.length} enabled)
            </span>
          </div>
          {expandedSections.has('providers') ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
        </button>

        <AnimatePresence>
          {expandedSections.has('providers') && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-gray-700"
            >
              <div className="p-4">
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4 flex items-start gap-2">
                  <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-blue-300">
                    Disabling a provider will block ALL models from that provider, even if individual models are enabled above.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {providers.map(provider => (
                    <ProviderCard
                      key={provider.provider}
                      provider={provider}
                      modelCount={modelStats.byProvider[provider.provider] || { total: 0, active: 0 }}
                      onToggle={(enabled) => handleToggleProvider(provider.provider, enabled)}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Global Settings Section */}
      {globalSettings && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <button
            onClick={() => toggleSection('global')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-750 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5 text-yellow-400" />
              <span className="text-lg font-semibold text-white">Global API Settings</span>
            </div>
            {expandedSections.has('global') ? (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-400" />
            )}
          </button>

          <AnimatePresence>
            {expandedSections.has('global') && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-gray-700"
              >
                <div className="p-6">
                  {/* Settings Explanation */}
                  <div className="bg-gray-900 rounded-lg p-4 mb-6 border border-gray-700">
                    <h4 className="text-white font-medium mb-2">What these settings control:</h4>
                    <ul className="text-sm text-gray-400 space-y-1">
                      <li><strong className="text-gray-300">Request Timeout:</strong> Max time for any API call before aborting</li>
                      <li><strong className="text-gray-300">Stream Timeout:</strong> Max time for streaming responses (SSE)</li>
                      <li><strong className="text-gray-300">Retry Count:</strong> How many times to retry failed requests</li>
                      <li><strong className="text-gray-300">Rate Limiting:</strong> Enforce request limits per user</li>
                      <li><strong className="text-gray-300">Auto Fallback:</strong> Try next provider if one fails</li>
                    </ul>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Timeouts */}
                    <SettingCard
                      icon={<Timer className="w-5 h-5 text-blue-400" />}
                      label="Request Timeout"
                      description="Max time for API calls"
                      value={globalSettings.global_request_timeout_ms}
                      unit="ms"
                      onChange={(v) => handleUpdateGlobalSetting('global_request_timeout_ms', v)}
                    />
                    <SettingCard
                      icon={<Timer className="w-5 h-5 text-cyan-400" />}
                      label="Stream Timeout"
                      description="Max time for streaming"
                      value={globalSettings.global_stream_timeout_ms}
                      unit="ms"
                      onChange={(v) => handleUpdateGlobalSetting('global_stream_timeout_ms', v)}
                    />
                    <SettingCard
                      icon={<Activity className="w-5 h-5 text-green-400" />}
                      label="SSE Heartbeat"
                      description="Keep-alive interval"
                      value={globalSettings.sse_heartbeat_interval_ms}
                      unit="ms"
                      onChange={(v) => handleUpdateGlobalSetting('sse_heartbeat_interval_ms', v)}
                    />

                    {/* Retries */}
                    <SettingCard
                      icon={<Repeat className="w-5 h-5 text-orange-400" />}
                      label="Retry Count"
                      description="Attempts before failing"
                      value={globalSettings.global_retry_count}
                      onChange={(v) => handleUpdateGlobalSetting('global_retry_count', v)}
                    />
                    <SettingCard
                      icon={<Timer className="w-5 h-5 text-yellow-400" />}
                      label="Retry Delay"
                      description="Wait between retries"
                      value={globalSettings.global_retry_delay_ms}
                      unit="ms"
                      onChange={(v) => handleUpdateGlobalSetting('global_retry_delay_ms', v)}
                    />
                    <SettingCard
                      icon={<Zap className="w-5 h-5 text-purple-400" />}
                      label="Cache TTL"
                      description="Response cache duration"
                      value={globalSettings.api_cache_ttl_seconds}
                      unit="sec"
                      onChange={(v) => handleUpdateGlobalSetting('api_cache_ttl_seconds', v)}
                    />

                    {/* Toggles */}
                    <ToggleCard
                      icon={<Shield className="w-5 h-5 text-red-400" />}
                      label="Rate Limiting"
                      description="Enforce request limits"
                      value={globalSettings.api_rate_limit_enabled}
                      onChange={(v) => handleUpdateGlobalSetting('api_rate_limit_enabled', v)}
                    />
                    <ToggleCard
                      icon={<Activity className="w-5 h-5 text-blue-400" />}
                      label="API Logging"
                      description="Log all API requests"
                      value={globalSettings.api_logging_enabled}
                      onChange={(v) => handleUpdateGlobalSetting('api_logging_enabled', v)}
                    />
                    <ToggleCard
                      icon={<Repeat className="w-5 h-5 text-green-400" />}
                      label="Auto Fallback"
                      description="Try next provider on fail"
                      value={globalSettings.fallback_enabled}
                      onChange={(v) => handleUpdateGlobalSetting('fallback_enabled', v)}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface ModelRowProps {
  model: AIModel;
  onToggle: () => void;
}

function ModelRow({ model, onToggle }: ModelRowProps) {
  const providerColor = PROVIDER_COLORS[model.provider] || PROVIDER_COLORS.generic;
  const providerIcon = PROVIDER_ICONS[model.provider] || '🔌';

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
      model.is_active 
        ? 'bg-gray-900 border-gray-600' 
        : 'bg-gray-900/50 border-gray-700 opacity-60'
    }`}>
      <div className="flex items-center gap-3">
        <span className={`px-2 py-1 rounded text-xs border ${providerColor}`}>
          {providerIcon} {model.provider}
        </span>
        <div>
          <div className="text-white font-medium">{model.display_name}</div>
          <div className="text-xs text-gray-500">{model.model_id}</div>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="text-right text-xs text-gray-500 hidden md:block">
          <div>{model.max_output_tokens.toLocaleString()} tokens</div>
          <div>${model.input_price_per_million}/${model.output_price_per_million} per 1M</div>
        </div>
        
        <button
          onClick={onToggle}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            model.is_active ? 'bg-green-500' : 'bg-gray-600'
          }`}
        >
          <span
            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
              model.is_active ? 'left-7' : 'left-1'
            }`}
          />
        </button>
      </div>
    </div>
  );
}

interface ProviderCardProps {
  provider: ApiProviderConfig;
  modelCount: { total: number; active: number };
  onToggle: (enabled: boolean) => void;
}

function ProviderCard({ provider, modelCount, onToggle }: ProviderCardProps) {
  const icon = PROVIDER_ICONS[provider.provider] || '🔌';
  const colorClass = PROVIDER_COLORS[provider.provider] || PROVIDER_COLORS.generic;

  return (
    <div className={`p-4 rounded-lg border transition-all ${
      provider.is_enabled 
        ? 'bg-gray-900 border-gray-600' 
        : 'bg-gray-900/50 border-gray-700 opacity-60'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl border ${colorClass}`}>
            {icon}
          </span>
          <div>
            <div className="text-white font-medium capitalize">{provider.provider}</div>
            <div className="text-xs text-gray-500">
              {modelCount.active}/{modelCount.total} models active
            </div>
          </div>
        </div>
        
        <button
          onClick={() => onToggle(!provider.is_enabled)}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            provider.is_enabled ? 'bg-green-500' : 'bg-gray-600'
          }`}
        >
          <span
            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
              provider.is_enabled ? 'left-7' : 'left-1'
            }`}
          />
        </button>
      </div>
    </div>
  );
}

interface SettingCardProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  value: number;
  unit?: string;
  onChange: (value: number) => void;
}

function SettingCard({ icon, label, description, value, unit, onChange }: SettingCardProps) {
  const [localValue, setLocalValue] = useState(value);
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    if (localValue !== value) {
      onChange(localValue);
    }
    setIsEditing(false);
  };

  return (
    <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-sm font-medium text-white">{label}</span>
      </div>
      <p className="text-xs text-gray-500 mb-3">{description}</p>
      
      {isEditing ? (
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={localValue}
            onChange={(e) => setLocalValue(parseInt(e.target.value) || 0)}
            className="flex-1 px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-lg"
            autoFocus
          />
          <button
            onClick={handleSave}
            className="p-1 text-green-400 hover:bg-gray-700 rounded"
          >
            <Check size={18} />
          </button>
          <button
            onClick={() => {
              setLocalValue(value);
              setIsEditing(false);
            }}
            className="p-1 text-red-400 hover:bg-gray-700 rounded"
          >
            <X size={18} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsEditing(true)}
          className="text-xl font-semibold text-white hover:text-purple-400 transition-colors"
        >
          {value.toLocaleString()}{unit && <span className="text-sm text-gray-500 ml-1">{unit}</span>}
        </button>
      )}
    </div>
  );
}

interface ToggleCardProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

function ToggleCard({ icon, label, description, value, onChange }: ToggleCardProps) {
  return (
    <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {icon}
            <span className="text-sm font-medium text-white">{label}</span>
          </div>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
        <button
          onClick={() => onChange(!value)}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            value ? 'bg-green-500' : 'bg-gray-600'
          }`}
        >
          <span
            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
              value ? 'left-7' : 'left-1'
            }`}
          />
        </button>
      </div>
    </div>
  );
}

export default ApiConfig;
