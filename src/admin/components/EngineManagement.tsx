// =============================================================================
// Engine Management Component with Drag-and-Drop
// =============================================================================

import React, { useState, useEffect, DragEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, Edit, Power, PowerOff, Plus, X, Save, Trash2,
  ChevronUp, ChevronDown, CheckCircle, XCircle, Clock,
  Play, RefreshCw, GripVertical, Zap, Info,
} from 'lucide-react';
import { EngineConfigService } from '../services/engine-config-service';
import { EngineConfig, Engine, ModelHealthStatus, AVAILABLE_MODELS } from '../types/engine-config';
import { getSupabase } from '../../lib/supabase/client';

// Available Models Catalog for drag-and-drop
const MODELS_CATALOG: Record<string, Array<{ id: string; name: string; streaming: boolean; vision: boolean; cost: string; recommended: boolean }>> = {
  openai: [
    { id: 'gpt-5-2025-08-07', name: 'GPT-5', streaming: true, vision: true, cost: '$15/$60', recommended: true },
    { id: 'gpt-4.1', name: 'GPT-4 Turbo', streaming: true, vision: true, cost: '$10/$30', recommended: false },
    { id: 'gpt-4o', name: 'GPT-4o', streaming: true, vision: true, cost: '$2.50/$10', recommended: true },
    { id: 'gpt-4o-2024-11-20', name: 'GPT-4o (Nov 2024)', streaming: true, vision: true, cost: '$2.50/$10', recommended: false },
    { id: 'gpt-4.1-mini', name: 'GPT-4 Mini', streaming: true, vision: false, cost: '$0.15/$0.60', recommended: true },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', streaming: true, vision: false, cost: '$0.15/$0.60', recommended: false },
    { id: 'o4-mini', name: 'O4 Mini', streaming: true, vision: false, cost: '$0.10/$0.40', recommended: false },
  ],
  anthropic: [
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', streaming: true, vision: true, cost: '$3/$15', recommended: true },
    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', streaming: true, vision: false, cost: '$0.25/$1.25', recommended: true },
    { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', streaming: true, vision: false, cost: '$0.25/$1.25', recommended: false },
  ],
  gemini: [
    { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash', streaming: true, vision: true, cost: '$0.075/$0.30', recommended: true },
    { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite', streaming: true, vision: false, cost: '$0.0375/$0.15', recommended: false },
    { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', streaming: true, vision: false, cost: '$0.0375/$0.15', recommended: true },
  ],
  deepseek: [
    { id: 'deepseek-chat', name: 'DeepSeek Chat', streaming: true, vision: false, cost: '$0.14/$0.28', recommended: true },
    { id: 'deepseek-coder', name: 'DeepSeek Coder', streaming: true, vision: false, cost: '$0.14/$0.28', recommended: true },
    { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner', streaming: true, vision: false, cost: '$0.55/$2.19', recommended: false },
  ],
  mistral: [
    { id: 'mistral-large-latest', name: 'Mistral Large', streaming: true, vision: false, cost: '$2/$6', recommended: true },
    { id: 'mistral-large-2', name: 'Mistral Large 2', streaming: true, vision: false, cost: '$2/$6', recommended: false },
    { id: 'mistral-small', name: 'Mistral Small', streaming: true, vision: false, cost: '$0.20/$0.60', recommended: true },
    { id: 'mistral-7b', name: 'Mistral 7B', streaming: true, vision: false, cost: '$0.10/$0.30', recommended: false },
  ],
  perplexity: [
    { id: 'sonar-pro', name: 'Sonar Pro', streaming: true, vision: false, cost: '$3/$15', recommended: true },
    { id: 'sonar-small', name: 'Sonar Small', streaming: true, vision: false, cost: '$1/$5', recommended: false },
  ],
  groq: [
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', streaming: true, vision: false, cost: '$0.59/$0.79', recommended: true },
    { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', streaming: true, vision: false, cost: '$0.05/$0.08', recommended: true },
    { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', streaming: true, vision: false, cost: '$0.24/$0.24', recommended: false },
  ],
};

export function EngineManagement() {
  const [config, setConfig] = useState<EngineConfig>(EngineConfigService.loadConfig());
  const [selectedEngine, setSelectedEngine] = useState<Engine | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModelModal, setShowAddModelModal] = useState(false);
  const [testingEngine, setTestingEngine] = useState<string | null>(null);
  const [dragOverEngine, setDragOverEngine] = useState<string | null>(null);
  const [showCatalog, setShowCatalog] = useState(true);

  useEffect(() => {
    // Load default config with all 9 engines
    const defaultConfig = EngineConfigService.loadConfig();
    console.log(`[Engine Management] Loaded ${defaultConfig.engines.length} engines:`);
    defaultConfig.engines.forEach((e, i) => {
      console.log(`  ${i + 1}. ${e.name} (${e.id}) - ${e.versions.length} models`);
    });
    setConfig(defaultConfig);
  }, []);

  const handleToggleEngine = (engineId: string) => {
    const newConfig = EngineConfigService.toggleEngine(config, engineId);
    setConfig(newConfig);
  };

  const handleEditEngine = (engine: Engine) => {
    setSelectedEngine(engine);
    setShowEditModal(true);
  };

  const handleSaveEngine = (updates: Partial<Engine>) => {
    if (!selectedEngine) return;
    const newConfig = EngineConfigService.updateEngine(config, selectedEngine.id, updates);
    setConfig(newConfig);
    setShowEditModal(false);
    setSelectedEngine(null);
  };

  const handleDeleteEngine = (engineId: string) => {
    if (confirm('Are you sure you want to delete this engine?')) {
      const newConfig = EngineConfigService.removeEngine(config, engineId);
      setConfig(newConfig);
    }
  };

  const handleAddModel = (engineId: string, modelId: string) => {
    const newConfig = EngineConfigService.addModelToEngine(config, engineId, modelId);
    setConfig(newConfig);
  };

  const handleRemoveModel = (engineId: string, modelId: string) => {
    const newConfig = EngineConfigService.removeModelFromEngine(config, engineId, modelId);
    setConfig(newConfig);
  };

  const handleReorderModels = (engineId: string, newOrder: string[]) => {
    const newConfig = EngineConfigService.reorderModels(config, engineId, newOrder);
    setConfig(newConfig);
  };

  const handleTestEngine = async (engineId: string) => {
    setTestingEngine(engineId);
    const engine = config.engines.find(e => e.id === engineId);
    
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log(`║   🔍 Testing ${engine?.name || 'Engine'} Health                    ║`);
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('');
    
    try {
      const newConfig = await EngineConfigService.testAllModels(config, engineId);
      setConfig(newConfig);
      
      console.log('');
      console.log('╔═══════════════════════════════════════════════════════════╗');
      console.log(`║   ✅ ${engine?.name || 'Engine'} Health Check Complete            ║`);
      console.log('╚═══════════════════════════════════════════════════════════╝');
      console.log('');
    } catch (error) {
      console.error('');
      console.error('╔═══════════════════════════════════════════════════════════╗');
      console.error(`║   ❌ ${engine?.name || 'Engine'} Health Check Failed              ║`);
      console.error('╚═══════════════════════════════════════════════════════════╝');
      console.error('Error:', error);
      console.error('');
    } finally {
      setTestingEngine(null);
    }
  };

  const getModelHealth = (engineId: string, modelId: string): ModelHealthStatus => {
    return config.modelHealth[engineId]?.[modelId] || { isWorking: false, lastChecked: 0 };
  };

  const moveModel = (engineId: string, currentIndex: number, direction: 'up' | 'down') => {
    const engine = config.engines.find(e => e.id === engineId);
    if (!engine) return;
    const newVersions = [...engine.versions];
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex >= 0 && newIndex < newVersions.length) {
      [newVersions[currentIndex], newVersions[newIndex]] = [newVersions[newIndex], newVersions[currentIndex]];
      handleReorderModels(engineId, newVersions);
    }
  };

  const handleDragStart = (e: DragEvent<HTMLDivElement>, provider: string, modelId: string) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ provider, modelId }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>, engineId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragOverEngine(engineId);
  };

  const handleDragLeave = () => {
    setDragOverEngine(null);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>, engineId: string) => {
    e.preventDefault();
    setDragOverEngine(null);
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      const engine = config.engines.find(eng => eng.id === engineId);
      if (engine && !engine.versions.includes(data.modelId)) {
        handleAddModel(engineId, data.modelId);
      }
    } catch (error) {
      console.error('Drop error:', error);
    }
  };

  // Save configuration to Supabase database
  const saveToDatabase = async () => {
    try {
      const supabase = getSupabase();
      
      // Save each engine to database
      for (const engine of config.engines) {
        // Upsert engine
        const { data: engineData, error: engineError } = await supabase
          .from('ai_engines')
          .upsert({
            engine_id: engine.id,
            name: engine.name,
            provider: engine.provider,
            tokenizer: engine.tokenizer,
            context_limit: engine.contextLimit,
            is_enabled: engine.isEnabled,
            is_working: engine.isWorking,
            display_order: 0,
            endpoint_url: engine.endpoint,
            last_health_check: engine.lastChecked ? new Date(engine.lastChecked).toISOString() : null,
          }, {
            onConflict: 'engine_id'
          })
          .select()
          .single();

        if (engineError) {
          console.error('Error saving engine:', engineError);
          continue;
        }

        // Save models for this engine
        for (let i = 0; i < engine.versions.length; i++) {
          const modelId = engine.versions[i];
          const health = config.modelHealth[engine.id]?.[modelId];
          
          await supabase
            .from('ai_models')
            .upsert({
              engine_id: engineData.id,
              model_id: modelId,
              display_name: modelId,
              is_enabled: true,
              is_working: health?.isWorking ?? true,
              is_default: modelId === engine.selectedVersion,
              display_order: i,
              response_time_avg: health?.responseTime,
              last_health_check: health?.lastChecked ? new Date(health.lastChecked).toISOString() : null,
              health_check_error: health?.error,
            }, {
              onConflict: 'engine_id,model_id'
            });
        }
      }

      alert('Configuration saved to database successfully!');
    } catch (error) {
      console.error('Error saving to database:', error);
      alert('Failed to save configuration. Check console for details.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Engine Management</h1>
          <p className="text-gray-400 mt-1">
            Drag models from catalog to engines. {config.engines.length} engines loaded.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowCatalog(!showCatalog)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              showCatalog ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {showCatalog ? 'Hide Catalog' : 'Show Catalog'}
          </button>
          <button
            onClick={async () => {
              await saveToDatabase();
              setConfig(EngineConfigService.loadConfig());
            }}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <Save size={16} />
            Save to Database
          </button>
          <button
            onClick={() => setConfig(EngineConfigService.loadConfig())}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Refresh
          </button>
          <button
            onClick={() => setConfig(EngineConfigService.resetToDefault())}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 flex items-start gap-3">
        <Info size={20} className="text-blue-400 mt-0.5 flex-shrink-0" />
        <div className="text-sm">
          <p className="text-blue-200 font-medium">How to use:</p>
          <ul className="text-blue-300 mt-1 space-y-1">
            <li>• <strong>Green</strong> = Working | <strong>Red</strong> = Failed</li>
            <li>• <strong>Active</strong> = Default model for engine</li>
            <li>• <strong>Test</strong> = Verify model availability via API</li>
            <li>• <strong>Drag & Drop</strong> = Add models from catalog</li>
          </ul>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Engines List */}
        <div className={`space-y-4 ${showCatalog ? 'flex-1' : 'w-full'}`}>
          {config.engines.map((engine) => (
            <motion.div
              key={engine.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-gray-800 rounded-xl border overflow-hidden transition-colors ${
                dragOverEngine === engine.id ? 'border-purple-500 ring-2 ring-purple-500/50' : 'border-gray-700'
              }`}
              onDragOver={(e) => handleDragOver(e, engine.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, engine.id)}
            >
              {/* Engine Header */}
              <div className="p-4 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      engine.isEnabled ? 'bg-purple-500/20' : 'bg-gray-600/20'
                    }`}>
                      <Bot size={20} className={engine.isEnabled ? 'text-purple-400' : 'text-gray-400'} />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white flex items-center gap-2">
                        {engine.name}
                        {engine.isWorking ? (
                          <CheckCircle size={14} className="text-green-400" />
                        ) : (
                          <XCircle size={14} className="text-red-400" />
                        )}
                      </h3>
                      <p className="text-gray-400 text-xs">
                        {engine.provider} • {engine.versions.length} models
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleTestEngine(engine.id)}
                      disabled={testingEngine === engine.id}
                      className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                      title="Test All Models"
                    >
                      {testingEngine === engine.id ? (
                        <RefreshCw size={14} className="animate-spin" />
                      ) : (
                        <Play size={14} />
                      )}
                    </button>
                    <button
                      onClick={() => handleEditEngine(engine)}
                      className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                      title="Edit Engine"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => handleToggleEngine(engine.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        engine.isEnabled
                          ? 'text-gray-400 hover:text-red-400 hover:bg-gray-700'
                          : 'text-gray-400 hover:text-green-400 hover:bg-gray-700'
                      }`}
                      title={engine.isEnabled ? 'Disable' : 'Enable'}
                    >
                      {engine.isEnabled ? <PowerOff size={14} /> : <Power size={14} />}
                    </button>
                    <button
                      onClick={() => handleDeleteEngine(engine.id)}
                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Models List */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-medium text-gray-400 uppercase">Models</h4>
                  <button
                    onClick={() => { setSelectedEngine(engine); setShowAddModelModal(true); }}
                    className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-medium transition-colors flex items-center gap-1"
                  >
                    <Plus size={12} /> Add
                  </button>
                </div>
                <div className="space-y-1">
                  {engine.versions.map((modelId, index) => {
                    const health = getModelHealth(engine.id, modelId);
                    return (
                      <div key={modelId} className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg text-sm">
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col">
                            <button
                              onClick={() => moveModel(engine.id, index, 'up')}
                              disabled={index === 0}
                              className="p-0.5 text-gray-500 hover:text-white disabled:opacity-30"
                            >
                              <ChevronUp size={12} />
                            </button>
                            <button
                              onClick={() => moveModel(engine.id, index, 'down')}
                              disabled={index === engine.versions.length - 1}
                              className="p-0.5 text-gray-500 hover:text-white disabled:opacity-30"
                            >
                              <ChevronDown size={12} />
                            </button>
                          </div>
                          {health.isWorking ? (
                            <CheckCircle size={14} className="text-green-400" />
                          ) : (
                            <XCircle size={14} className="text-red-400" />
                          )}
                          <span className="text-white text-xs">{modelId}</span>
                          {modelId === engine.selectedVersion && (
                            <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 text-[10px] rounded-full">
                              Active
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoveModel(engine.id, modelId)}
                          className="p-1 text-gray-500 hover:text-red-400 rounded transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Models Catalog Sidebar */}
        {showCatalog && (
          <div className="w-80 flex-shrink-0">
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 sticky top-4">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <GripVertical size={18} className="text-purple-400" />
                Models Catalog
              </h3>
              <p className="text-gray-400 text-xs mb-4">Drag models to add them to engines</p>
              
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {Object.entries(MODELS_CATALOG).map(([provider, models]) => (
                  <div key={provider}>
                    <h4 className="text-xs font-medium text-gray-400 uppercase mb-2">{provider}</h4>
                    <div className="space-y-1">
                      {models.map((model) => (
                        <div
                          key={model.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, provider, model.id)}
                          className="p-2 bg-gray-700/50 rounded-lg cursor-grab hover:bg-gray-700 transition-colors group"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <GripVertical size={12} className="text-gray-500 group-hover:text-purple-400" />
                              <span className="text-white text-xs">{model.name}</span>
                              {model.recommended && (
                                <Zap size={10} className="text-yellow-400" />
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-1 ml-5">
                            <span className="text-[10px] text-gray-500">{model.cost}</span>
                            {model.streaming && (
                              <span className="text-[10px] text-green-400">Stream</span>
                            )}
                            {model.vision && (
                              <span className="text-[10px] text-blue-400">Vision</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Engine Modal */}
      <AnimatePresence>
        {showEditModal && selectedEngine && (
          <EngineEditModal
            engine={selectedEngine}
            onSave={handleSaveEngine}
            onClose={() => { setShowEditModal(false); setSelectedEngine(null); }}
          />
        )}
      </AnimatePresence>

      {/* Add Model Modal */}
      <AnimatePresence>
        {showAddModelModal && selectedEngine && (
          <AddModelModal
            engine={selectedEngine}
            availableModels={AVAILABLE_MODELS[selectedEngine.provider as keyof typeof AVAILABLE_MODELS] || []}
            existingModels={selectedEngine.versions}
            onAdd={(modelId: string) => {
              handleAddModel(selectedEngine.id, modelId);
              setShowAddModelModal(false);
              setSelectedEngine(null);
            }}
            onClose={() => { setShowAddModelModal(false); setSelectedEngine(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Engine Edit Modal
function EngineEditModal({ engine, onSave, onClose }: { 
  engine: Engine; 
  onSave: (updates: Partial<Engine>) => void; 
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    name: engine.name,
    apiKey: engine.apiKey,
    endpoint: engine.endpoint || '',
    selectedVersion: engine.selectedVersion,
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-gray-800 rounded-xl p-6 w-full max-w-lg border border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Edit Engine</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Engine Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">API Key</label>
            <input
              type="password"
              value={formData.apiKey}
              onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Endpoint (optional)</label>
            <input
              type="text"
              value={formData.endpoint}
              onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Default Model</label>
            <select
              value={formData.selectedVersion}
              onChange={(e) => setFormData({ ...formData, selectedVersion: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
            >
              {engine.versions.map((version) => (
                <option key={version} value={version}>{version}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium">
              Cancel
            </button>
            <button onClick={() => onSave(formData)} className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2">
              <Save size={16} /> Save
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Add Model Modal
function AddModelModal({ engine, availableModels, existingModels, onAdd, onClose }: { 
  engine: Engine; 
  availableModels: string[]; 
  existingModels: string[]; 
  onAdd: (modelId: string) => void; 
  onClose: () => void;
}) {
  const [selectedModel, setSelectedModel] = useState('');
  const availableToAdd = availableModels.filter((model) => !existingModels.includes(model));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Add Model to {engine.name}</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Select Model</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
            >
              <option value="">Choose a model...</option>
              {availableToAdd.map((model) => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </div>
          {availableToAdd.length === 0 && (
            <p className="text-gray-400 text-sm">All available models are already added.</p>
          )}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium">
              Cancel
            </button>
            <button
              onClick={() => selectedModel && onAdd(selectedModel)}
              disabled={!selectedModel}
              className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium"
            >
              Add Model
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
