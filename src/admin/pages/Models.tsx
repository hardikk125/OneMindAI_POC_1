// =============================================================================
// AI Models Configuration Page
// =============================================================================

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Edit,
  Power,
  PowerOff,
  Plus,
  X,
  Save,
  DollarSign,
  Settings,
} from 'lucide-react';
import { DataTable } from '../components/DataTable';
import { getAllModels, updateModel, getPricingConfig, updatePricingConfig } from '../services/admin-api';
import { EngineManagement } from '../components/EngineManagement';
import { HealthHistory } from '../components/HealthHistory';
import type { AIModel, PricingConfig } from '../types';

export function Models() {
  const [activeTab, setActiveTab] = useState<'engines' | 'legacy' | 'history'>('engines');
  const [models, setModels] = useState<AIModel[]>([]);
  const [pricingConfig, setPricingConfig] = useState<PricingConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    display_name: '',
    input_credits: 0,
    output_credits: 0,
    is_active: true,
    is_free: false,
    max_tokens: 4096,
    description: '',
  });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [modelsData, configData] = await Promise.all([
        getAllModels(),
        getPricingConfig(),
      ]);
      setModels(modelsData);
      setPricingConfig(configData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditModel = (model: AIModel) => {
    setSelectedModel(model);
    setEditForm({
      display_name: model.display_name,
      input_credits: model.input_credits_per_million,
      output_credits: model.output_credits_per_million,
      is_active: model.is_active,
      is_free: model.is_free,
      max_tokens: model.max_tokens,
      description: model.description || '',
    });
    setShowEditModal(true);
  };

  const handleSaveModel = async () => {
    if (!selectedModel) return;

    setActionLoading(true);
    try {
      const success = await updateModel(selectedModel.id, {
        display_name: editForm.display_name,
        input_credits: editForm.input_credits,
        output_credits: editForm.output_credits,
        is_active: editForm.is_active,
        is_free: editForm.is_free,
        max_tokens: editForm.max_tokens,
        description: editForm.description,
      });

      if (success) {
        setModels((prev) =>
          prev.map((m) =>
            m.id === selectedModel.id
              ? {
                  ...m,
                  display_name: editForm.display_name,
                  input_credits_per_million: editForm.input_credits,
                  output_credits_per_million: editForm.output_credits,
                  is_active: editForm.is_active,
                  is_free: editForm.is_free,
                  max_tokens: editForm.max_tokens,
                  description: editForm.description,
                }
              : m
          )
        );
        setShowEditModal(false);
      }
    } catch (error) {
      console.error('Error updating model:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = async (model: AIModel) => {
    setActionLoading(true);
    try {
      const success = await updateModel(model.id, { is_active: !model.is_active });
      if (success) {
        setModels((prev) =>
          prev.map((m) =>
            m.id === model.id ? { ...m, is_active: !m.is_active } : m
          )
        );
      }
    } catch (error) {
      console.error('Error toggling model:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdatePricingConfig = async (key: string, value: number) => {
    try {
      const success = await updatePricingConfig(key, value);
      if (success) {
        setPricingConfig((prev) =>
          prev.map((c) => (c.config_key === key ? { ...c, config_value: value } : c))
        );
      }
    } catch (error) {
      console.error('Error updating pricing config:', error);
    }
  };

  const getConfigValue = (key: string): number => {
    const config = pricingConfig.find((c) => c.config_key === key);
    return config?.config_value ?? 0;
  };

  const columns = [
    {
      key: 'display_name',
      label: 'Model',
      sortable: true,
      render: (model: AIModel) => (
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              model.is_free
                ? 'bg-green-500/20'
                : model.is_active
                ? 'bg-purple-500/20'
                : 'bg-gray-500/20'
            }`}
          >
            <Bot
              size={20}
              className={
                model.is_free
                  ? 'text-green-400'
                  : model.is_active
                  ? 'text-purple-400'
                  : 'text-gray-400'
              }
            />
          </div>
          <div>
            <p className="text-white font-medium">{model.display_name}</p>
            <p className="text-gray-400 text-xs">{model.model_id}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'provider',
      label: 'Provider',
      sortable: true,
      render: (model: AIModel) => (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-700 text-gray-300 capitalize">
          {model.provider}
        </span>
      ),
    },
    {
      key: 'input_cost_per_million',
      label: 'Cost/1M',
      sortable: true,
      render: (model: AIModel) => (
        <div className="text-sm">
          <p className="text-gray-300">
            ${model.input_cost_per_million.toFixed(2)} in
          </p>
          <p className="text-gray-400">
            ${model.output_cost_per_million.toFixed(2)} out
          </p>
        </div>
      ),
    },
    {
      key: 'input_credits_per_million',
      label: 'Credits/1M',
      sortable: true,
      render: (model: AIModel) => (
        <div className="text-sm">
          {model.is_free ? (
            <span className="text-green-400 font-medium">FREE</span>
          ) : (
            <>
              <p className="text-purple-400">{model.input_credits_per_million} in</p>
              <p className="text-purple-300">{model.output_credits_per_million} out</p>
            </>
          )}
        </div>
      ),
    },
    {
      key: 'max_tokens',
      label: 'Max Tokens',
      sortable: true,
      render: (model: AIModel) => (
        <span className="text-gray-300">{model.max_tokens.toLocaleString()}</span>
      ),
    },
    {
      key: 'is_active',
      label: 'Status',
      sortable: true,
      render: (model: AIModel) => (
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${
            model.is_active
              ? 'bg-green-500/20 text-green-400'
              : 'bg-red-500/20 text-red-400'
          }`}
        >
          {model.is_active ? 'Active' : 'Disabled'}
        </span>
      ),
    },
  ];

  const renderActions = (model: AIModel) => (
    <div className="flex items-center gap-1">
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleEditModel(model);
        }}
        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
        title="Edit Model"
      >
        <Edit size={16} />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleToggleActive(model);
        }}
        className={`p-2 rounded-lg transition-colors ${
          model.is_active
            ? 'text-gray-400 hover:text-red-400 hover:bg-gray-700'
            : 'text-gray-400 hover:text-green-400 hover:bg-gray-700'
        }`}
        title={model.is_active ? 'Disable Model' : 'Enable Model'}
        disabled={actionLoading}
      >
        {model.is_active ? <PowerOff size={16} /> : <Power size={16} />}
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">AI Models & Engines</h1>
          <p className="text-gray-400 mt-1">Configure AI engines, models, and pricing</p>
        </div>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 bg-gray-800 rounded-lg border border-gray-700">
        <button
          onClick={() => setActiveTab('engines')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'engines'
              ? 'bg-purple-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-700'
          }`}
        >
          <Settings size={16} />
          Engine Management
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'history'
              ? 'bg-purple-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-700'
          }`}
        >
          <DollarSign size={16} />
          Health History
        </button>
        <button
          onClick={() => setActiveTab('legacy')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'legacy'
              ? 'bg-purple-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-700'
          }`}
        >
          <Bot size={16} />
          Legacy Models
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'engines' ? (
        <EngineManagement />
      ) : activeTab === 'history' ? (
        <HealthHistory />
      ) : (
        <div className="space-y-6">
          {/* Global Pricing Config */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800 rounded-xl p-6 border border-gray-700"
          >
            <div className="flex items-center gap-2 mb-4">
              <DollarSign size={20} className="text-green-400" />
              <h3 className="text-lg font-semibold text-white">Global Pricing Settings</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Profit Markup (%)
                </label>
                <input
                  type="number"
                  value={getConfigValue('profit_markup') * 100}
                  onChange={(e) =>
                    handleUpdatePricingConfig('profit_markup', parseFloat(e.target.value) / 100)
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Credits per USD
                </label>
                <input
                  type="number"
                  value={getConfigValue('credits_per_usd')}
                  onChange={(e) =>
                    handleUpdatePricingConfig('credits_per_usd', parseFloat(e.target.value))
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Signup Bonus
                </label>
                <input
                  type="number"
                  value={getConfigValue('signup_bonus')}
                  onChange={(e) =>
                    handleUpdatePricingConfig('signup_bonus', parseFloat(e.target.value))
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Referral Bonus
                </label>
                <input
                  type="number"
                  value={getConfigValue('referral_bonus')}
                  onChange={(e) =>
                    handleUpdatePricingConfig('referral_bonus', parseFloat(e.target.value))
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          </motion.div>

          {/* Models Table */}
          <DataTable
            data={models}
            columns={columns}
            keyField="id"
            isLoading={isLoading}
            searchPlaceholder="Search models..."
            actions={renderActions}
            emptyMessage="No models configured"
          />

          {/* Edit Model Modal */}
          <AnimatePresence>
            {showEditModal && selectedModel && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                onClick={() => setShowEditModal(false)}
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="bg-gray-800 rounded-xl p-6 w-full max-w-lg border border-gray-700"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Edit Model</h3>
                    <button
                      onClick={() => setShowEditModal(false)}
                      className="p-1 text-gray-400 hover:text-white"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">
                        Display Name
                      </label>
                      <input
                        type="text"
                        value={editForm.display_name}
                        onChange={(e) =>
                          setEditForm({ ...editForm, display_name: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">
                          Input Credits/1M
                        </label>
                        <input
                          type="number"
                          value={editForm.input_credits}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              input_credits: parseFloat(e.target.value),
                            })
                          }
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">
                          Output Credits/1M
                        </label>
                        <input
                          type="number"
                          value={editForm.output_credits}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              output_credits: parseFloat(e.target.value),
                            })
                          }
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-1">
                        Max Tokens
                      </label>
                      <input
                        type="number"
                        value={editForm.max_tokens}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            max_tokens: parseInt(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-1">
                        Description
                      </label>
                      <textarea
                        value={editForm.description}
                        onChange={(e) =>
                          setEditForm({ ...editForm, description: e.target.value })
                        }
                        rows={2}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500 resize-none"
                      />
                    </div>

                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editForm.is_active}
                          onChange={(e) =>
                            setEditForm({ ...editForm, is_active: e.target.checked })
                          }
                          className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-purple-500 focus:ring-purple-500"
                        />
                        <span className="text-sm text-gray-300">Active</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editForm.is_free}
                          onChange={(e) =>
                            setEditForm({ ...editForm, is_free: e.target.checked })
                          }
                          className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-green-500 focus:ring-green-500"
                        />
                        <span className="text-sm text-gray-300">Free Model</span>
                      </label>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => setShowEditModal(false)}
                        className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveModel}
                        disabled={actionLoading}
                        className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <Save size={16} />
                        {actionLoading ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
