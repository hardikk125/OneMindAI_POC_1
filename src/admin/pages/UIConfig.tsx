// =============================================================================
// UI Configuration Admin Page
// Manage mode options, user roles, and role prompts
// =============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  Users,
  MessageSquare,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Eye,
  EyeOff,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle,
  Cpu,
  Info,
  Database,
  Server,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
} from 'lucide-react';
import type { ModeOption, UserRole, RolePrompt } from '../types';
import type { SystemConfigItem, ProviderConfigItem } from '../../hooks/useAdminConfig';
import * as uiConfigService from '../services/ui-config-service';
import * as adminConfigService from '../services/admin-config-service';
import { getSupabase } from '../../lib/supabase';

// =============================================================================
// TYPES
// =============================================================================

type TabType = 'modes' | 'roles' | 'prompts' | 'engines' | 'system-config' | 'provider-config';

interface EditingItem {
  type: 'mode' | 'role' | 'prompt';
  id: string | null; // null for new items
  data: Partial<ModeOption | UserRole | RolePrompt>;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function UIConfig() {
  const [activeTab, setActiveTab] = useState<TabType>('modes');
  const [modeOptions, setModeOptions] = useState<ModeOption[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [rolePrompts, setRolePrompts] = useState<RolePrompt[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null);
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set());
  
  // Engine UI Config state
  const [engineUiConfig, setEngineUiConfig] = useState<any>(null);
  const [engineInfoTexts, setEngineInfoTexts] = useState<any[]>([]);
  
  // Phase 7: System and Provider Config state
  const [systemConfig, setSystemConfig] = useState<SystemConfigItem[]>([]);
  const [providerConfig, setProviderConfig] = useState<ProviderConfigItem[]>([]);
  const [editingSystemKey, setEditingSystemKey] = useState<string | null>(null);
  const [editingSystemValue, setEditingSystemValue] = useState<string>('');
  const [editingProviderKey, setEditingProviderKey] = useState<string | null>(null);
  const [editingProviderField, setEditingProviderField] = useState<string | null>(null);
  const [editingProviderValue, setEditingProviderValue] = useState<string>('');

  // ==========================================================================
  // DATA FETCHING
  // ==========================================================================

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [modes, roles, prompts] = await Promise.all([
        uiConfigService.fetchModeOptions(),
        uiConfigService.fetchUserRoles(),
        uiConfigService.fetchRolePrompts(),
      ]);
      setModeOptions(modes);
      setUserRoles(roles);
      setRolePrompts(prompts);
    } catch (err) {
      setError('Failed to load UI configuration');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const showSuccess = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleToggleVisibility = async (type: 'mode' | 'role' | 'prompt', id: string, currentValue: boolean) => {
    try {
      if (type === 'mode') {
        await uiConfigService.updateModeOption(id, { is_visible: !currentValue });
        setModeOptions((prev: ModeOption[]) => prev.map((m: ModeOption) => m.id === id ? { ...m, is_visible: !currentValue } : m));
      } else if (type === 'role') {
        await uiConfigService.updateUserRole(id, { is_visible: !currentValue });
        setUserRoles((prev: UserRole[]) => prev.map((r: UserRole) => r.id === id ? { ...r, is_visible: !currentValue } : r));
      } else {
        await uiConfigService.updateRolePrompt(id, { is_visible: !currentValue });
        setRolePrompts((prev: RolePrompt[]) => prev.map((p: RolePrompt) => p.id === id ? { ...p, is_visible: !currentValue } : p));
      }
      showSuccess('Visibility updated');
    } catch (err) {
      setError('Failed to update visibility');
    }
  };

  const handleDelete = async (type: 'mode' | 'role' | 'prompt', id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    try {
      if (type === 'mode') {
        await uiConfigService.deleteModeOption(id);
        setModeOptions((prev: ModeOption[]) => prev.filter((m: ModeOption) => m.id !== id));
      } else if (type === 'role') {
        await uiConfigService.deleteUserRole(id);
        setUserRoles((prev: UserRole[]) => prev.filter((r: UserRole) => r.id !== id));
        setRolePrompts((prev: RolePrompt[]) => prev.filter((p: RolePrompt) => p.role_id !== id));
      } else {
        await uiConfigService.deleteRolePrompt(id);
        setRolePrompts((prev: RolePrompt[]) => prev.filter((p: RolePrompt) => p.id !== id));
      }
      showSuccess('Item deleted');
    } catch (err) {
      setError('Failed to delete item');
    }
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    
    try {
      if (editingItem.type === 'mode') {
        const data = editingItem.data as Partial<ModeOption>;
        if (editingItem.id) {
          const updated = await uiConfigService.updateModeOption(editingItem.id, data);
          setModeOptions((prev: ModeOption[]) => prev.map((m: ModeOption) => m.id === editingItem.id ? updated : m));
        } else {
          const created = await uiConfigService.createModeOption(data as Omit<ModeOption, 'id' | 'created_at' | 'updated_at'>);
          setModeOptions((prev: ModeOption[]) => [...prev, created]);
        }
      } else if (editingItem.type === 'role') {
        const data = editingItem.data as Partial<UserRole>;
        if (editingItem.id) {
          const updated = await uiConfigService.updateUserRole(editingItem.id, data);
          setUserRoles((prev: UserRole[]) => prev.map((r: UserRole) => r.id === editingItem.id ? updated : r));
        } else {
          const created = await uiConfigService.createUserRole(data as Omit<UserRole, 'id' | 'created_at' | 'updated_at'>);
          setUserRoles((prev: UserRole[]) => [...prev, created]);
        }
      } else {
        const data = editingItem.data as Partial<RolePrompt>;
        if (editingItem.id) {
          const updated = await uiConfigService.updateRolePrompt(editingItem.id, data);
          setRolePrompts((prev: RolePrompt[]) => prev.map((p: RolePrompt) => p.id === editingItem.id ? updated : p));
        } else {
          const created = await uiConfigService.createRolePrompt(data as Omit<RolePrompt, 'id' | 'created_at' | 'updated_at'>);
          setRolePrompts((prev: RolePrompt[]) => [...prev, created]);
        }
      }
      setEditingItem(null);
      showSuccess(editingItem.id ? 'Item updated' : 'Item created');
    } catch (err) {
      setError('Failed to save item');
    }
  };

  const toggleRoleExpanded = (roleId: string) => {
    setExpandedRoles((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(roleId)) {
        next.delete(roleId);
      } else {
        next.add(roleId);
      }
      return next;
    });
  };

  // ==========================================================================
  // ENGINE CONFIG FUNCTIONS
  // ==========================================================================

  const fetchEngineConfig = async () => {
    try {
      const supabase = getSupabase();
      const [configRes, infoRes] = await Promise.all([
        supabase.from('engine_ui_config').select('*').single(),
        supabase.from('engine_info_text').select('*').order('engine_id')
      ]);
      
      // @ts-ignore - Supabase types don't include engine_ui_config table
      if (configRes.data) setEngineUiConfig(configRes.data);
      // @ts-ignore - Supabase types don't include engine_info_text table
      if (infoRes.data) setEngineInfoTexts(infoRes.data);
    } catch (err) {
      console.error('Failed to fetch engine config:', err);
    }
  };

  const updateEngineUiConfig = async (field: string, value: any) => {
    try {
      const supabase = getSupabase();
      // @ts-ignore - Supabase types don't include engine_ui_config table
      await supabase.from('engine_ui_config').update({ [field]: value }).eq('id', engineUiConfig.id);
      setEngineUiConfig((prev: any) => ({ ...prev, [field]: value }));
      showSuccess('UI config updated');
    } catch (err) {
      setError('Failed to update UI config');
    }
  };

  const updateEngineInfo = async (engineId: string, updates: any) => {
    try {
      const supabase = getSupabase();
      // @ts-ignore - Supabase types don't include engine_info_text table
      await supabase.from('engine_info_text').update(updates).eq('engine_id', engineId);
      setEngineInfoTexts((prev: any[]) => prev.map((e: any) => e.engine_id === engineId ? { ...e, ...updates } : e));
      showSuccess('Engine info updated');
    } catch (err) {
      setError('Failed to update engine info');
    }
  };

  useEffect(() => {
    if (activeTab === 'engines') {
      fetchEngineConfig();
    }
    if (activeTab === 'system-config') {
      fetchSystemConfigData();
    }
    if (activeTab === 'provider-config') {
      fetchProviderConfigData();
    }
  }, [activeTab]);

  // ==========================================================================
  // PHASE 8: REAL-TIME SUBSCRIPTIONS
  // ==========================================================================

  const showRealtimeUpdate = (table: string) => {
    setSuccess(`🔄 ${table} updated by another admin`);
    setTimeout(() => setSuccess(null), 3000);
  };

  useEffect(() => {
    const supabase = getSupabase();
    
    // Subscribe to system_config changes
    const systemSub = supabase
      .channel('admin-system-config-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'system_config' },
        (payload) => {
          console.log('[Realtime] system_config changed:', payload.eventType);
          fetchSystemConfigData();
          if (activeTab === 'system-config') {
            showRealtimeUpdate('System Config');
          }
        }
      )
      .subscribe();

    // Subscribe to provider_config changes
    const providerSub = supabase
      .channel('admin-provider-config-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'provider_config' },
        (payload) => {
          console.log('[Realtime] provider_config changed:', payload.eventType);
          fetchProviderConfigData();
          if (activeTab === 'provider-config') {
            showRealtimeUpdate('Provider Config');
          }
        }
      )
      .subscribe();

    // Cleanup subscriptions on unmount
    return () => {
      systemSub.unsubscribe();
      providerSub.unsubscribe();
    };
  }, [activeTab]);

  // ==========================================================================
  // PHASE 7: SYSTEM & PROVIDER CONFIG FUNCTIONS
  // ==========================================================================

  const fetchSystemConfigData = async () => {
    try {
      const data = await adminConfigService.fetchSystemConfig();
      setSystemConfig(data);
    } catch (err) {
      console.error('Failed to fetch system config:', err);
      setError('Failed to load system configuration');
    }
  };

  const fetchProviderConfigData = async () => {
    try {
      const data = await adminConfigService.fetchProviderConfig();
      setProviderConfig(data);
    } catch (err) {
      console.error('Failed to fetch provider config:', err);
      setError('Failed to load provider configuration');
    }
  };

  const handleUpdateSystemConfig = async (key: string, value: string | number | boolean) => {
    try {
      await adminConfigService.updateSystemConfig(key, value);
      setSystemConfig((prev: SystemConfigItem[]) => prev.map((c: SystemConfigItem) => c.key === key ? { ...c, value } : c));
      setEditingSystemKey(null);
      showSuccess(`Updated ${key}`);
    } catch (err) {
      setError(`Failed to update ${key}`);
    }
  };

  const handleUpdateProviderConfig = async (provider: string, field: string, value: any) => {
    try {
      await adminConfigService.updateProviderConfig(provider, { [field]: value });
      setProviderConfig((prev: ProviderConfigItem[]) => prev.map((p: ProviderConfigItem) => p.provider === provider ? { ...p, [field]: value } : p));
      setEditingProviderKey(null);
      setEditingProviderField(null);
      showSuccess(`Updated ${provider} ${field}`);
    } catch (err) {
      setError(`Failed to update ${provider}`);
    }
  };

  const handleToggleProvider = async (provider: string, currentValue: boolean) => {
    try {
      await adminConfigService.toggleProviderEnabled(provider, !currentValue);
      setProviderConfig((prev: ProviderConfigItem[]) => prev.map((p: ProviderConfigItem) => p.provider === provider ? { ...p, is_enabled: !currentValue } : p));
      showSuccess(`${provider} ${!currentValue ? 'enabled' : 'disabled'}`);
    } catch (err) {
      setError(`Failed to toggle ${provider}`);
    }
  };

  // ==========================================================================
  // RENDER HELPERS
  // ==========================================================================

  const renderModeOptions = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Mode Options</h3>
        <button
          onClick={() => setEditingItem({
            type: 'mode',
            id: null,
            data: { key: '', label: '', is_visible: true, is_enabled: true, display_order: modeOptions.length + 1, style_variant: 'default' }
          })}
          className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition"
        >
          <Plus size={16} />
          Add Mode
        </button>
      </div>

      {modeOptions.map((mode) => (
        <div
          key={mode.id}
          className={`p-4 rounded-lg border ${mode.is_visible ? 'bg-gray-800 border-gray-700' : 'bg-gray-900 border-gray-800 opacity-60'}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <GripVertical size={16} className="text-gray-500 cursor-grab" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white">{mode.label}</span>
                  <span className="text-xs px-2 py-0.5 bg-gray-700 rounded text-gray-400">{mode.key}</span>
                  {mode.style_variant !== 'default' && (
                    <span className="text-xs px-2 py-0.5 bg-purple-600/30 rounded text-purple-300">{mode.style_variant}</span>
                  )}
                </div>
                {mode.description && (
                  <p className="text-sm text-gray-400 mt-1">{mode.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleToggleVisibility('mode', mode.id, mode.is_visible)}
                className={`p-2 rounded-lg transition ${mode.is_visible ? 'text-green-400 hover:bg-green-400/20' : 'text-gray-500 hover:bg-gray-700'}`}
                title={mode.is_visible ? 'Hide' : 'Show'}
              >
                {mode.is_visible ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
              <button
                onClick={() => setEditingItem({ type: 'mode', id: mode.id, data: mode })}
                className="p-2 text-blue-400 hover:bg-blue-400/20 rounded-lg transition"
                title="Edit"
              >
                <Edit2 size={16} />
              </button>
              <button
                onClick={() => handleDelete('mode', mode.id)}
                className="p-2 text-red-400 hover:bg-red-400/20 rounded-lg transition"
                title="Delete"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderUserRoles = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">User Roles</h3>
        <button
          onClick={() => setEditingItem({
            type: 'role',
            id: null,
            data: { name: '', title: '', category: 'Executive', is_visible: true, is_enabled: true, display_order: userRoles.length + 1 }
          })}
          className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition"
        >
          <Plus size={16} />
          Add Role
        </button>
      </div>

      {userRoles.map((role) => {
        const rolePromptsList = rolePrompts.filter(p => p.role_id === role.id);
        const isExpanded = expandedRoles.has(role.id);

        return (
          <div
            key={role.id}
            className={`rounded-lg border ${role.is_visible ? 'bg-gray-800 border-gray-700' : 'bg-gray-900 border-gray-800 opacity-60'}`}
          >
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleRoleExpanded(role.id)}
                    className="p-1 text-gray-400 hover:text-white transition"
                  >
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{role.name}</span>
                      <span className="text-xs px-2 py-0.5 bg-purple-600/30 rounded text-purple-300">{role.category}</span>
                      <span className="text-xs text-gray-500">({rolePromptsList.length} prompts)</span>
                    </div>
                    <p className="text-sm text-gray-400">{role.title}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleVisibility('role', role.id, role.is_visible)}
                    className={`p-2 rounded-lg transition ${role.is_visible ? 'text-green-400 hover:bg-green-400/20' : 'text-gray-500 hover:bg-gray-700'}`}
                  >
                    {role.is_visible ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                  <button
                    onClick={() => setEditingItem({ type: 'role', id: role.id, data: role })}
                    className="p-2 text-blue-400 hover:bg-blue-400/20 rounded-lg transition"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete('role', role.id)}
                    className="p-2 text-red-400 hover:bg-red-400/20 rounded-lg transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Expanded prompts */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-gray-700 overflow-hidden"
                >
                  <div className="p-4 bg-gray-900/50 space-y-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-300">Prompts for {role.name}</span>
                      <button
                        onClick={() => setEditingItem({
                          type: 'prompt',
                          id: null,
                          data: { role_id: role.id, title: '', prompt_template: '', category: 'general', is_visible: true, is_enabled: true, display_order: rolePromptsList.length + 1 }
                        })}
                        className="flex items-center gap-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs transition"
                      >
                        <Plus size={12} />
                        Add Prompt
                      </button>
                    </div>
                    {rolePromptsList.length === 0 ? (
                      <p className="text-sm text-gray-500 italic">No prompts configured</p>
                    ) : (
                      rolePromptsList.map(prompt => (
                        <div
                          key={prompt.id}
                          className={`p-3 rounded border ${prompt.is_visible ? 'bg-gray-800 border-gray-700' : 'bg-gray-900 border-gray-800 opacity-60'}`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-white text-sm">{prompt.title}</span>
                                <span className="text-xs px-1.5 py-0.5 bg-gray-700 rounded text-gray-400">{prompt.category}</span>
                              </div>
                              <p className="text-xs text-gray-400 mt-1 line-clamp-2">{prompt.prompt_template}</p>
                            </div>
                            <div className="flex items-center gap-1 ml-2">
                              <button
                                onClick={() => handleToggleVisibility('prompt', prompt.id, prompt.is_visible)}
                                className={`p-1.5 rounded transition ${prompt.is_visible ? 'text-green-400 hover:bg-green-400/20' : 'text-gray-500 hover:bg-gray-700'}`}
                              >
                                {prompt.is_visible ? <Eye size={14} /> : <EyeOff size={14} />}
                              </button>
                              <button
                                onClick={() => setEditingItem({ type: 'prompt', id: prompt.id, data: prompt })}
                                className="p-1.5 text-blue-400 hover:bg-blue-400/20 rounded transition"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => handleDelete('prompt', prompt.id)}
                                className="p-1.5 text-red-400 hover:bg-red-400/20 rounded transition"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );

  const renderEngineConfig = () => {
    if (!engineUiConfig) {
      return <div className="text-center text-gray-400 py-8">Loading engine configuration...</div>;
    }

    return (
      <div className="space-y-6">
        {/* UI Visibility Controls */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Engine Card UI Controls</h3>
          <div className="space-y-3 bg-gray-800 p-4 rounded-lg">
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Show API Key Field</span>
              <input
                type="checkbox"
                checked={engineUiConfig.show_api_key_field}
                onChange={(e) => updateEngineUiConfig('show_api_key_field', e.target.checked)}
                className="rounded border-gray-600 bg-gray-900 text-purple-600 focus:ring-purple-500"
              />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Show Output Policy Field</span>
              <input
                type="checkbox"
                checked={engineUiConfig.show_output_policy_field}
                onChange={(e) => updateEngineUiConfig('show_output_policy_field', e.target.checked)}
                className="rounded border-gray-600 bg-gray-900 text-purple-600 focus:ring-purple-500"
              />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Show Price Override Fields</span>
              <input
                type="checkbox"
                checked={engineUiConfig.show_price_override_fields}
                onChange={(e) => updateEngineUiConfig('show_price_override_fields', e.target.checked)}
                className="rounded border-gray-600 bg-gray-900 text-purple-600 focus:ring-purple-500"
              />
            </label>
            <div className="pt-2 border-t border-gray-700">
              <label className="block text-sm text-gray-300 mb-2">Info Display Mode</label>
              <select
                value={engineUiConfig.info_display_mode}
                onChange={(e) => updateEngineUiConfig('info_display_mode', e.target.value)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
              >
                <option value="none">None - Hide all info</option>
                <option value="simple">Simple - Show tagline and tags</option>
                <option value="detailed">Detailed - Show full description</option>
              </select>
            </div>
          </div>
        </div>

        {/* Engine Info Texts */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Engine Information</h3>
          <div className="space-y-4">
            {engineInfoTexts.map((engine) => (
              <div key={engine.engine_id} className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                <div className="flex items-center gap-2 mb-3">
                  <Cpu size={18} className="text-purple-400" />
                  <h4 className="font-semibold text-white capitalize">{engine.engine_id}</h4>
                  {engine.badge_text && (
                    <span className="text-xs px-2 py-0.5 bg-purple-600/30 rounded text-purple-300">
                      {engine.badge_text}
                    </span>
                  )}
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Badge Text</label>
                    <input
                      type="text"
                      value={engine.badge_text || ''}
                      onChange={(e) => updateEngineInfo(engine.engine_id, { badge_text: e.target.value })}
                      className="w-full px-3 py-1.5 bg-gray-900 border border-gray-700 rounded text-white text-sm"
                      placeholder="e.g., MOST POPULAR"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Badge Color</label>
                    <select
                      value={engine.badge_color || 'blue'}
                      onChange={(e) => updateEngineInfo(engine.engine_id, { badge_color: e.target.value })}
                      className="w-full px-3 py-1.5 bg-gray-900 border border-gray-700 rounded text-white text-sm"
                    >
                      <option value="blue">Blue</option>
                      <option value="purple">Purple</option>
                      <option value="green">Green</option>
                      <option value="orange">Orange</option>
                      <option value="red">Red</option>
                      <option value="cyan">Cyan</option>
                      <option value="slate">Slate</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Tagline</label>
                    <input
                      type="text"
                      value={engine.engine_tagline || ''}
                      onChange={(e) => updateEngineInfo(engine.engine_id, { engine_tagline: e.target.value })}
                      className="w-full px-3 py-1.5 bg-gray-900 border border-gray-700 rounded text-white text-sm"
                      placeholder="Short description"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Description</label>
                    <textarea
                      value={engine.engine_description || ''}
                      onChange={(e) => updateEngineInfo(engine.engine_id, { engine_description: e.target.value })}
                      className="w-full px-3 py-1.5 bg-gray-900 border border-gray-700 rounded text-white text-sm"
                      rows={2}
                      placeholder="Detailed description"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Best For (comma-separated)</label>
                    <input
                      type="text"
                      value={engine.best_for_tags || ''}
                      onChange={(e) => updateEngineInfo(engine.engine_id, { best_for_tags: e.target.value })}
                      className="w-full px-3 py-1.5 bg-gray-900 border border-gray-700 rounded text-white text-sm"
                      placeholder="e.g., Complex reasoning, Code generation"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ==========================================================================
  // PHASE 7: SYSTEM CONFIG RENDER
  // ==========================================================================

  const renderSystemConfig = () => {
    const categories = ['limits', 'api', 'pricing', 'technical'] as const;
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">System Configuration</h3>
            <p className="text-sm text-gray-400">Manage application limits, API settings, and technical values</p>
          </div>
          <button
            onClick={fetchSystemConfigData}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition"
          >
            <Loader2 size={14} className={systemConfig.length === 0 ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {categories.map(category => {
          const items = systemConfig.filter(c => c.category === category);
          if (items.length === 0) return null;
          
          return (
            <div key={category} className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
              <div className="px-4 py-3 bg-gray-800 border-b border-gray-700">
                <h4 className="font-medium text-white capitalize flex items-center gap-2">
                  <Database size={16} className="text-purple-400" />
                  {category}
                </h4>
              </div>
              <div className="divide-y divide-gray-700">
                {items.map(config => (
                  <div key={config.key} className="px-4 py-3 flex items-center justify-between hover:bg-gray-800/50">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{config.key}</span>
                        {config.is_sensitive && (
                          <span className="text-xs px-1.5 py-0.5 bg-red-500/20 text-red-300 rounded">sensitive</span>
                        )}
                      </div>
                      {config.description && (
                        <p className="text-xs text-gray-400 mt-0.5">{config.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {editingSystemKey === config.key ? (
                        <>
                          <input
                            type={typeof config.value === 'number' ? 'number' : 'text'}
                            value={editingSystemValue}
                            onChange={(e) => setEditingSystemValue(e.target.value)}
                            className="w-32 px-2 py-1 bg-gray-900 border border-gray-600 rounded text-white text-sm"
                            autoFocus
                          />
                          <button
                            onClick={() => {
                              const value = typeof config.value === 'number' 
                                ? Number(editingSystemValue) 
                                : editingSystemValue;
                              handleUpdateSystemConfig(config.key, value);
                            }}
                            className="p-1.5 text-green-400 hover:bg-green-400/20 rounded"
                          >
                            <Save size={14} />
                          </button>
                          <button
                            onClick={() => setEditingSystemKey(null)}
                            className="p-1.5 text-gray-400 hover:bg-gray-700 rounded"
                          >
                            <X size={14} />
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="px-3 py-1 bg-gray-900 rounded text-sm text-purple-300 font-mono">
                            {String(config.value)}
                          </span>
                          <button
                            onClick={() => {
                              setEditingSystemKey(config.key);
                              setEditingSystemValue(String(config.value));
                            }}
                            className="p-1.5 text-blue-400 hover:bg-blue-400/20 rounded"
                          >
                            <Edit2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {systemConfig.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <Database size={32} className="mx-auto mb-2 opacity-50" />
            <p>No system configuration found</p>
            <p className="text-sm">Make sure the system_config table has data</p>
          </div>
        )}
      </div>
    );
  };

  // ==========================================================================
  // PHASE 7: PROVIDER CONFIG RENDER
  // ==========================================================================

  const renderProviderConfig = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Provider Configuration</h3>
          <p className="text-sm text-gray-400">Manage AI provider limits, rate limits, and enable/disable providers</p>
        </div>
        <button
          onClick={fetchProviderConfigData}
          className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition"
        >
          <Loader2 size={14} className={providerConfig.length === 0 ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Provider</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">Enabled</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Max Output</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Rate Limit (RPM)</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Temperature</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Timeout (s)</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Retries</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {providerConfig.map(provider => (
              <tr key={provider.provider} className={`hover:bg-gray-800/50 ${!provider.is_enabled ? 'bg-gray-900/50 opacity-60' : ''}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Server size={16} className={provider.is_enabled ? 'text-purple-400' : 'text-gray-600'} />
                    <span className={`font-medium capitalize ${provider.is_enabled ? 'text-white' : 'text-gray-500'}`}>{provider.provider}</span>
                    {!provider.is_enabled && (
                      <span className="ml-2 px-2 py-0.5 bg-red-900/40 text-red-400 text-xs font-semibold rounded border border-red-700/50">DISABLED</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => handleToggleProvider(provider.provider, provider.is_enabled)}
                    className={`p-1 rounded transition ${provider.is_enabled ? 'text-green-400 hover:bg-green-400/20' : 'text-gray-500 hover:bg-gray-700'}`}
                  >
                    {provider.is_enabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  {editingProviderKey === provider.provider && editingProviderField === 'max_output_cap' ? (
                    <div className="flex items-center justify-end gap-1">
                      <input
                        type="number"
                        value={editingProviderValue}
                        onChange={(e) => setEditingProviderValue(e.target.value)}
                        className="w-24 px-2 py-1 bg-gray-900 border border-gray-600 rounded text-white text-sm text-right"
                        autoFocus
                      />
                      <button
                        onClick={() => handleUpdateProviderConfig(provider.provider, 'max_output_cap', Number(editingProviderValue))}
                        className="p-1 text-green-400 hover:bg-green-400/20 rounded"
                      >
                        <Save size={12} />
                      </button>
                      <button
                        onClick={() => { setEditingProviderKey(null); setEditingProviderField(null); }}
                        className="p-1 text-gray-400 hover:bg-gray-700 rounded"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingProviderKey(provider.provider);
                        setEditingProviderField('max_output_cap');
                        setEditingProviderValue(String(provider.max_output_cap));
                      }}
                      className="text-purple-300 hover:text-purple-200 font-mono"
                    >
                      {provider.max_output_cap.toLocaleString()}
                    </button>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {editingProviderKey === provider.provider && editingProviderField === 'rate_limit_rpm' ? (
                    <div className="flex items-center justify-end gap-1">
                      <input
                        type="number"
                        value={editingProviderValue}
                        onChange={(e) => setEditingProviderValue(e.target.value)}
                        className="w-24 px-2 py-1 bg-gray-900 border border-gray-600 rounded text-white text-sm text-right"
                        autoFocus
                      />
                      <button
                        onClick={() => handleUpdateProviderConfig(provider.provider, 'rate_limit_rpm', Number(editingProviderValue))}
                        className="p-1 text-green-400 hover:bg-green-400/20 rounded"
                      >
                        <Save size={12} />
                      </button>
                      <button
                        onClick={() => { setEditingProviderKey(null); setEditingProviderField(null); }}
                        className="p-1 text-gray-400 hover:bg-gray-700 rounded"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingProviderKey(provider.provider);
                        setEditingProviderField('rate_limit_rpm');
                        setEditingProviderValue(String(provider.rate_limit_rpm));
                      }}
                      className="text-gray-300 hover:text-white font-mono"
                    >
                      {provider.rate_limit_rpm.toLocaleString()}
                    </button>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {editingProviderKey === provider.provider && editingProviderField === 'temperature' ? (
                    <div className="flex items-center justify-end gap-1">
                      <input
                        type="number"
                        min="0"
                        max="2"
                        step="0.1"
                        value={editingProviderValue}
                        onChange={(e) => setEditingProviderValue(e.target.value)}
                        className="w-20 px-2 py-1 bg-gray-900 border border-gray-600 rounded text-white text-sm text-right"
                        autoFocus
                      />
                      <button
                        onClick={() => handleUpdateProviderConfig(provider.provider, 'temperature', Number(editingProviderValue))}
                        className="p-1 text-green-400 hover:bg-green-400/20 rounded"
                      >
                        <Save size={12} />
                      </button>
                      <button
                        onClick={() => { setEditingProviderKey(null); setEditingProviderField(null); }}
                        className="p-1 text-gray-400 hover:bg-gray-700 rounded"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingProviderKey(provider.provider);
                        setEditingProviderField('temperature');
                        setEditingProviderValue(String(provider.temperature));
                      }}
                      className="text-blue-300 hover:text-blue-200 font-mono"
                    >
                      {provider.temperature.toFixed(1)}
                    </button>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-mono text-gray-300">{provider.timeout_seconds}</td>
                <td className="px-4 py-3 text-right font-mono text-gray-300">{provider.retry_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {providerConfig.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <Server size={32} className="mx-auto mb-2 opacity-50" />
          <p>No provider configuration found</p>
          <p className="text-sm">Make sure the provider_config table has data</p>
        </div>
      )}
    </div>
  );

  const renderEditModal = () => {
    if (!editingItem) return null;

    const isNew = editingItem.id === null;
    const title = isNew
      ? `Add New ${editingItem.type === 'mode' ? 'Mode Option' : editingItem.type === 'role' ? 'User Role' : 'Prompt'}`
      : `Edit ${editingItem.type === 'mode' ? 'Mode Option' : editingItem.type === 'role' ? 'User Role' : 'Prompt'}`;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gray-800 rounded-xl p-6 w-full max-w-lg mx-4 border border-gray-700 max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <button
              onClick={() => setEditingItem(null)}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition"
            >
              <X size={18} />
            </button>
          </div>

          <div className="space-y-4">
            {editingItem.type === 'mode' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Key (unique identifier)</label>
                  <input
                    type="text"
                    value={(editingItem.data as Partial<ModeOption>).key || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, key: e.target.value } })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="e.g., story_mode"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Label</label>
                  <input
                    type="text"
                    value={(editingItem.data as Partial<ModeOption>).label || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, label: e.target.value } })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="e.g., Story Mode"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                  <textarea
                    value={(editingItem.data as Partial<ModeOption>).description || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, description: e.target.value } })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    rows={2}
                    placeholder="Optional description"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Style Variant</label>
                  <select
                    value={(editingItem.data as Partial<ModeOption>).style_variant || 'default'}
                    onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, style_variant: e.target.value as ModeOption['style_variant'] } })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="default">Default</option>
                    <option value="highlighted">Highlighted</option>
                    <option value="gradient">Gradient</option>
                  </select>
                </div>
              </>
            )}

            {editingItem.type === 'role' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
                  <input
                    type="text"
                    value={(editingItem.data as Partial<UserRole>).name || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, name: e.target.value } })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="e.g., CEO"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Full Title</label>
                  <input
                    type="text"
                    value={(editingItem.data as Partial<UserRole>).title || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, title: e.target.value } })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="e.g., Chief Executive Officer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
                  <select
                    value={(editingItem.data as Partial<UserRole>).category || 'Executive'}
                    onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, category: e.target.value as UserRole['category'] } })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="Executive">Executive</option>
                    <option value="Industry">Industry</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                  <textarea
                    value={(editingItem.data as Partial<UserRole>).description || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, description: e.target.value } })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    rows={3}
                    placeholder="Role description"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Key Responsibilities</label>
                  <textarea
                    value={(editingItem.data as Partial<UserRole>).responsibilities || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, responsibilities: e.target.value } })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    rows={2}
                    placeholder="Key responsibilities"
                  />
                </div>
              </>
            )}

            {editingItem.type === 'prompt' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Title</label>
                  <input
                    type="text"
                    value={(editingItem.data as Partial<RolePrompt>).title || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, title: e.target.value } })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="e.g., Strategic Analysis"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
                  <select
                    value={(editingItem.data as Partial<RolePrompt>).category || 'general'}
                    onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, category: e.target.value as RolePrompt['category'] } })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="general">General</option>
                    <option value="analysis">Analysis</option>
                    <option value="strategy">Strategy</option>
                    <option value="operations">Operations</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Prompt Template</label>
                  <textarea
                    value={(editingItem.data as Partial<RolePrompt>).prompt_template || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, prompt_template: e.target.value } })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
                    rows={4}
                    placeholder="Use [topic] as placeholder for user input"
                  />
                  <p className="text-xs text-gray-500 mt-1">Use [topic] or [placeholder] for dynamic content</p>
                </div>
              </>
            )}

            <div className="flex items-center gap-2 pt-2">
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={(editingItem.data as { is_visible?: boolean }).is_visible ?? true}
                  onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, is_visible: e.target.checked } })}
                  className="rounded border-gray-600 bg-gray-900 text-purple-600 focus:ring-purple-500"
                />
                Visible to users
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => setEditingItem(null)}
              className="px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
            >
              <Save size={16} />
              {isNew ? 'Create' : 'Save Changes'}
            </button>
          </div>
        </motion.div>
      </div>
    );
  };

  // ==========================================================================
  // MAIN RENDER
  // ==========================================================================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="text-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">UI Configuration</h1>
          <p className="text-gray-400 mt-1">Manage mode options, user roles, and prompts</p>
        </div>
      </div>

      {/* Alerts */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300"
          >
            <AlertCircle size={18} />
            {error}
            <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-500/20 rounded">
              <X size={14} />
            </button>
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-300"
          >
            <CheckCircle size={18} />
            {success}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-700 pb-2">
        <button
          onClick={() => setActiveTab('modes')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
            activeTab === 'modes' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
        >
          <Settings size={18} />
          Mode Options ({modeOptions.length})
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
            activeTab === 'roles' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
        >
          <Users size={18} />
          User Roles ({userRoles.length})
        </button>
        <button
          onClick={() => setActiveTab('engines')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
            activeTab === 'engines' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
        >
          <Cpu size={18} />
          Engine Config
        </button>
        <button
          onClick={() => setActiveTab('system-config')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
            activeTab === 'system-config' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
        >
          <Database size={18} />
          System Config
        </button>
        <button
          onClick={() => setActiveTab('provider-config')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
            activeTab === 'provider-config' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
        >
          <Server size={18} />
          Provider Config
        </button>
      </div>

      {/* Content */}
      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
        {activeTab === 'modes' && renderModeOptions()}
        {activeTab === 'roles' && renderUserRoles()}
        {activeTab === 'engines' && renderEngineConfig()}
        {activeTab === 'system-config' && renderSystemConfig()}
        {activeTab === 'provider-config' && renderProviderConfig()}
      </div>

      {/* Edit Modal */}
      {renderEditModal()}
    </div>
  );
}
