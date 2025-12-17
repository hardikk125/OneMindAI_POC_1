/**
 * AI Models Configuration Page
 * 
 * Admin interface for managing AI model configurations:
 * - Token limits (max_output_tokens)
 * - Pricing (input/output per million tokens)
 * - Enable/disable models
 * - Add new models
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  RefreshCw, 
  Save, 
  X, 
  Plus, 
  Trash2, 
  Edit2,
  ChevronDown,
  ChevronRight,
  DollarSign,
  Zap,
  AlertCircle,
  Check
} from 'lucide-react';
import { getSupabase, isSupabaseConfigured } from '../../lib/supabase/client';

// =============================================================================
// TYPES
// =============================================================================

interface AIModel {
  id: string;
  provider: string;
  model_id: string;
  display_name: string | null;
  max_output_tokens: number;
  context_window: number | null;
  input_price_per_million: number | null;
  output_price_per_million: number | null;
  description: string | null;
  is_active: boolean;
  capabilities: string[];
}

interface NewModelForm {
  provider: string;
  model_id: string;
  display_name: string;
  max_output_tokens: number;
  context_window: number;
  input_price_per_million: number;
  output_price_per_million: number;
  description: string;
  capabilities: string[];
}

// =============================================================================
// CONSTANTS
// =============================================================================

const PROVIDERS = [
  'openai', 'anthropic', 'gemini', 'deepseek', 'mistral', 
  'perplexity', 'groq', 'xai', 'kimi', 'falcon', 'sarvam', 
  'huggingface', 'generic'
];

const CAPABILITIES = ['chat', 'code', 'vision', 'reasoning', 'search'];

// =============================================================================
// COMPONENT
// =============================================================================

export default function AIModelsConfig() {
  const [models, setModels] = useState<AIModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Editing state
  const [editingModel, setEditingModel] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<AIModel>>({});
  
  // Add new model state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newModel, setNewModel] = useState<NewModelForm>({
    provider: 'openai',
    model_id: '',
    display_name: '',
    max_output_tokens: 8192,
    context_window: 128000,
    input_price_per_million: 1.00,
    output_price_per_million: 3.00,
    description: '',
    capabilities: ['chat'],
  });
  
  // Expanded providers
  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(new Set(['openai', 'anthropic']));

  // ==========================================================================
  // FETCH MODELS
  // ==========================================================================

  const fetchModels = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setError('Supabase not configured');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const supabase = getSupabase();
      if (!supabase) {
        setError('Supabase client not available');
        setIsLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('ai_models')
        .select('*')
        .order('provider')
        .order('model_id');

      if (fetchError) {
        if (fetchError.message.includes('does not exist')) {
          setError('AI Models table not found. Please run migration 007_ai_models_config.sql');
        } else {
          setError(fetchError.message);
        }
        setIsLoading(false);
        return;
      }

      if (data) {
        const parsedModels: AIModel[] = data.map((m: Record<string, unknown>) => ({
          id: m.id as string,
          provider: m.provider as string,
          model_id: m.model_id as string,
          display_name: m.display_name as string | null,
          max_output_tokens: m.max_output_tokens as number,
          context_window: m.context_window as number | null,
          input_price_per_million: m.input_price_per_million as number | null,
          output_price_per_million: m.output_price_per_million as number | null,
          description: m.description as string | null,
          is_active: m.is_active as boolean,
          capabilities: Array.isArray(m.capabilities) 
            ? m.capabilities as string[]
            : JSON.parse((m.capabilities as string) || '[]'),
        }));
        setModels(parsedModels);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch models');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  // ==========================================================================
  // UPDATE MODEL
  // ==========================================================================

  const handleUpdateModel = async (modelId: string) => {
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      const { error: updateError } = await supabase
        .from('ai_models')
        .update({
          display_name: editForm.display_name,
          max_output_tokens: editForm.max_output_tokens,
          context_window: editForm.context_window,
          input_price_per_million: editForm.input_price_per_million,
          output_price_per_million: editForm.output_price_per_million,
          description: editForm.description,
          is_active: editForm.is_active,
          capabilities: editForm.capabilities,
        })
        .eq('id', modelId);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setSuccessMessage('Model updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      setEditingModel(null);
      setEditForm({});
      
      // Clear cache and refetch
      localStorage.removeItem('onemindai-ai-models');
      fetchModels();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update model');
    }
  };

  // ==========================================================================
  // TOGGLE MODEL ACTIVE
  // ==========================================================================

  const handleToggleActive = async (model: AIModel) => {
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      const { error: updateError } = await supabase
        .from('ai_models')
        .update({ is_active: !model.is_active })
        .eq('id', model.id);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      // Clear cache and refetch
      localStorage.removeItem('onemindai-ai-models');
      fetchModels();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle model');
    }
  };

  // ==========================================================================
  // ADD NEW MODEL
  // ==========================================================================

  const handleAddModel = async () => {
    const supabase = getSupabase();
    if (!supabase) return;

    if (!newModel.model_id.trim()) {
      setError('Model ID is required');
      return;
    }

    try {
      const { error: insertError } = await supabase
        .from('ai_models')
        .insert({
          provider: newModel.provider,
          model_id: newModel.model_id,
          display_name: newModel.display_name || newModel.model_id,
          max_output_tokens: newModel.max_output_tokens,
          context_window: newModel.context_window,
          input_price_per_million: newModel.input_price_per_million,
          output_price_per_million: newModel.output_price_per_million,
          description: newModel.description,
          capabilities: newModel.capabilities,
          is_active: true,
        });

      if (insertError) {
        if (insertError.message.includes('duplicate')) {
          setError('Model already exists for this provider');
        } else {
          setError(insertError.message);
        }
        return;
      }

      setSuccessMessage('Model added successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      setShowAddForm(false);
      setNewModel({
        provider: 'openai',
        model_id: '',
        display_name: '',
        max_output_tokens: 8192,
        context_window: 128000,
        input_price_per_million: 1.00,
        output_price_per_million: 3.00,
        description: '',
        capabilities: ['chat'],
      });
      
      // Clear cache and refetch
      localStorage.removeItem('onemindai-ai-models');
      fetchModels();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add model');
    }
  };

  // ==========================================================================
  // DELETE MODEL
  // ==========================================================================

  const handleDeleteModel = async (modelId: string) => {
    if (!confirm('Are you sure you want to delete this model?')) return;

    const supabase = getSupabase();
    if (!supabase) return;

    try {
      const { error: deleteError } = await supabase
        .from('ai_models')
        .delete()
        .eq('id', modelId);

      if (deleteError) {
        setError(deleteError.message);
        return;
      }

      setSuccessMessage('Model deleted successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      
      // Clear cache and refetch
      localStorage.removeItem('onemindai-ai-models');
      fetchModels();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete model');
    }
  };

  // ==========================================================================
  // TOGGLE PROVIDER EXPANSION
  // ==========================================================================

  const toggleProvider = (provider: string) => {
    setExpandedProviders(prev => {
      const next = new Set(prev);
      if (next.has(provider)) {
        next.delete(provider);
      } else {
        next.add(provider);
      }
      return next;
    });
  };

  // ==========================================================================
  // GROUP MODELS BY PROVIDER
  // ==========================================================================

  const modelsByProvider = models.reduce((acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push(model);
    return acc;
  }, {} as Record<string, AIModel[]>);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">AI Models Configuration</h2>
          <p className="text-sm text-slate-400 mt-1">
            Manage model pricing, token limits, and availability
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            <Plus size={16} />
            Add Model
          </button>
          <button
            onClick={fetchModels}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
          <AlertCircle size={16} />
          {error}
          <button onClick={() => setError(null)} className="ml-auto">
            <X size={16} />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-2 p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400">
          <Check size={16} />
          {successMessage}
        </div>
      )}

      {/* Add Model Form */}
      {showAddForm && (
        <div className="p-6 bg-slate-800/50 border border-slate-700 rounded-lg">
          <h3 className="text-lg font-medium text-white mb-4">Add New Model</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Provider</label>
              <select
                value={newModel.provider}
                onChange={(e) => setNewModel({ ...newModel, provider: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
              >
                {PROVIDERS.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Model ID *</label>
              <input
                type="text"
                value={newModel.model_id}
                onChange={(e) => setNewModel({ ...newModel, model_id: e.target.value })}
                placeholder="e.g., gpt-4o-2024-12-01"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Display Name</label>
              <input
                type="text"
                value={newModel.display_name}
                onChange={(e) => setNewModel({ ...newModel, display_name: e.target.value })}
                placeholder="e.g., GPT-4o (Dec 2024)"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Max Output Tokens</label>
              <input
                type="number"
                value={newModel.max_output_tokens}
                onChange={(e) => setNewModel({ ...newModel, max_output_tokens: parseInt(e.target.value) || 8192 })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Context Window</label>
              <input
                type="number"
                value={newModel.context_window}
                onChange={(e) => setNewModel({ ...newModel, context_window: parseInt(e.target.value) || 128000 })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Input Price ($/1M tokens)</label>
              <input
                type="number"
                step="0.01"
                value={newModel.input_price_per_million}
                onChange={(e) => setNewModel({ ...newModel, input_price_per_million: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Output Price ($/1M tokens)</label>
              <input
                type="number"
                step="0.01"
                value={newModel.output_price_per_million}
                onChange={(e) => setNewModel({ ...newModel, output_price_per_million: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm text-slate-400 mb-1">Description</label>
              <input
                type="text"
                value={newModel.description}
                onChange={(e) => setNewModel({ ...newModel, description: e.target.value })}
                placeholder="Brief description of the model"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm text-slate-400 mb-1">Capabilities</label>
              <div className="flex flex-wrap gap-2">
                {CAPABILITIES.map(cap => (
                  <label key={cap} className="flex items-center gap-1 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={newModel.capabilities.includes(cap)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewModel({ ...newModel, capabilities: [...newModel.capabilities, cap] });
                        } else {
                          setNewModel({ ...newModel, capabilities: newModel.capabilities.filter(c => c !== cap) });
                        }
                      }}
                      className="rounded border-slate-600"
                    />
                    {cap}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleAddModel}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
            >
              Add Model
            </button>
          </div>
        </div>
      )}

      {/* Models by Provider */}
      <div className="space-y-4">
        {Object.entries(modelsByProvider).map(([provider, providerModels]) => (
          <div key={provider} className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
            {/* Provider Header */}
            <button
              onClick={() => toggleProvider(provider)}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {expandedProviders.has(provider) ? (
                  <ChevronDown size={20} className="text-slate-400" />
                ) : (
                  <ChevronRight size={20} className="text-slate-400" />
                )}
                <span className="text-lg font-medium text-white capitalize">{provider}</span>
                <span className="text-sm text-slate-400">
                  ({providerModels.length} models, {providerModels.filter(m => m.is_active).length} active)
                </span>
              </div>
            </button>

            {/* Models Table */}
            {expandedProviders.has(provider) && (
              <div className="border-t border-slate-700">
                <table className="w-full">
                  <thead className="bg-slate-900/50">
                    <tr className="text-left text-xs text-slate-400 uppercase">
                      <th className="px-4 py-3">Model</th>
                      <th className="px-4 py-3 text-right">Max Output</th>
                      <th className="px-4 py-3 text-right">Input $/1M</th>
                      <th className="px-4 py-3 text-right">Output $/1M</th>
                      <th className="px-4 py-3 text-center">Active</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {providerModels.map(model => (
                      <tr key={model.id} className={`${!model.is_active ? 'opacity-50' : ''}`}>
                        {editingModel === model.id ? (
                          // Edit Mode
                          <>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={editForm.display_name || ''}
                                onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                                className="w-full px-2 py-1 bg-slate-900 border border-slate-600 rounded text-white text-sm"
                              />
                              <div className="text-xs text-slate-500 mt-1">{model.model_id}</div>
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                value={editForm.max_output_tokens || 0}
                                onChange={(e) => setEditForm({ ...editForm, max_output_tokens: parseInt(e.target.value) || 0 })}
                                className="w-24 px-2 py-1 bg-slate-900 border border-slate-600 rounded text-white text-sm text-right"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                step="0.01"
                                value={editForm.input_price_per_million || 0}
                                onChange={(e) => setEditForm({ ...editForm, input_price_per_million: parseFloat(e.target.value) || 0 })}
                                className="w-20 px-2 py-1 bg-slate-900 border border-slate-600 rounded text-white text-sm text-right"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                step="0.01"
                                value={editForm.output_price_per_million || 0}
                                onChange={(e) => setEditForm({ ...editForm, output_price_per_million: parseFloat(e.target.value) || 0 })}
                                className="w-20 px-2 py-1 bg-slate-900 border border-slate-600 rounded text-white text-sm text-right"
                              />
                            </td>
                            <td className="px-4 py-3 text-center">
                              <input
                                type="checkbox"
                                checked={editForm.is_active || false}
                                onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                                className="rounded border-slate-600"
                              />
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => handleUpdateModel(model.id)}
                                  className="p-1 text-green-400 hover:bg-green-400/20 rounded"
                                >
                                  <Save size={16} />
                                </button>
                                <button
                                  onClick={() => { setEditingModel(null); setEditForm({}); }}
                                  className="p-1 text-red-400 hover:bg-red-400/20 rounded"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          // View Mode
                          <>
                            <td className="px-4 py-3">
                              <div className="text-white font-medium">{model.display_name || model.model_id}</div>
                              <div className="text-xs text-slate-500">{model.model_id}</div>
                              {model.description && (
                                <div className="text-xs text-slate-400 mt-1">{model.description}</div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1 text-purple-300">
                                <Zap size={14} />
                                {model.max_output_tokens.toLocaleString()}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1 text-green-300">
                                <DollarSign size={14} />
                                {model.input_price_per_million?.toFixed(2) || '0.00'}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1 text-orange-300">
                                <DollarSign size={14} />
                                {model.output_price_per_million?.toFixed(2) || '0.00'}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => handleToggleActive(model)}
                                className={`w-10 h-5 rounded-full transition-colors ${
                                  model.is_active ? 'bg-green-500' : 'bg-slate-600'
                                }`}
                              >
                                <div className={`w-4 h-4 rounded-full bg-white transform transition-transform ${
                                  model.is_active ? 'translate-x-5' : 'translate-x-0.5'
                                }`} />
                              </button>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => {
                                    setEditingModel(model.id);
                                    setEditForm({
                                      display_name: model.display_name,
                                      max_output_tokens: model.max_output_tokens,
                                      context_window: model.context_window,
                                      input_price_per_million: model.input_price_per_million,
                                      output_price_per_million: model.output_price_per_million,
                                      description: model.description,
                                      is_active: model.is_active,
                                      capabilities: model.capabilities,
                                    });
                                  }}
                                  className="p-1 text-blue-400 hover:bg-blue-400/20 rounded"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  onClick={() => handleDeleteModel(model.id)}
                                  className="p-1 text-red-400 hover:bg-red-400/20 rounded"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Empty State */}
      {models.length === 0 && !isLoading && (
        <div className="text-center py-12 text-slate-400">
          <p>No AI models found. Run the migration or add models manually.</p>
        </div>
      )}
    </div>
  );
}
