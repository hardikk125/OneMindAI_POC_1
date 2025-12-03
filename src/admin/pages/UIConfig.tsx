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
} from 'lucide-react';
import type { ModeOption, UserRole, RolePrompt } from '../types';
import * as uiConfigService from '../services/ui-config-service';

// =============================================================================
// TYPES
// =============================================================================

type TabType = 'modes' | 'roles' | 'prompts';

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
        setModeOptions(prev => prev.map(m => m.id === id ? { ...m, is_visible: !currentValue } : m));
      } else if (type === 'role') {
        await uiConfigService.updateUserRole(id, { is_visible: !currentValue });
        setUserRoles(prev => prev.map(r => r.id === id ? { ...r, is_visible: !currentValue } : r));
      } else {
        await uiConfigService.updateRolePrompt(id, { is_visible: !currentValue });
        setRolePrompts(prev => prev.map(p => p.id === id ? { ...p, is_visible: !currentValue } : p));
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
        setModeOptions(prev => prev.filter(m => m.id !== id));
      } else if (type === 'role') {
        await uiConfigService.deleteUserRole(id);
        setUserRoles(prev => prev.filter(r => r.id !== id));
        setRolePrompts(prev => prev.filter(p => p.role_id !== id));
      } else {
        await uiConfigService.deleteRolePrompt(id);
        setRolePrompts(prev => prev.filter(p => p.id !== id));
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
          setModeOptions(prev => prev.map(m => m.id === editingItem.id ? updated : m));
        } else {
          const created = await uiConfigService.createModeOption(data as Omit<ModeOption, 'id' | 'created_at' | 'updated_at'>);
          setModeOptions(prev => [...prev, created]);
        }
      } else if (editingItem.type === 'role') {
        const data = editingItem.data as Partial<UserRole>;
        if (editingItem.id) {
          const updated = await uiConfigService.updateUserRole(editingItem.id, data);
          setUserRoles(prev => prev.map(r => r.id === editingItem.id ? updated : r));
        } else {
          const created = await uiConfigService.createUserRole(data as Omit<UserRole, 'id' | 'created_at' | 'updated_at'>);
          setUserRoles(prev => [...prev, created]);
        }
      } else {
        const data = editingItem.data as Partial<RolePrompt>;
        if (editingItem.id) {
          const updated = await uiConfigService.updateRolePrompt(editingItem.id, data);
          setRolePrompts(prev => prev.map(p => p.id === editingItem.id ? updated : p));
        } else {
          const created = await uiConfigService.createRolePrompt(data as Omit<RolePrompt, 'id' | 'created_at' | 'updated_at'>);
          setRolePrompts(prev => [...prev, created]);
        }
      }
      setEditingItem(null);
      showSuccess(editingItem.id ? 'Item updated' : 'Item created');
    } catch (err) {
      setError('Failed to save item');
    }
  };

  const toggleRoleExpanded = (roleId: string) => {
    setExpandedRoles(prev => {
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
      </div>

      {/* Content */}
      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
        {activeTab === 'modes' && renderModeOptions()}
        {activeTab === 'roles' && renderUserRoles()}
      </div>

      {/* Edit Modal */}
      {renderEditModal()}
    </div>
  );
}
