// =============================================================================
// useUIConfig Hook
// Fetches UI configuration from database for dynamic mode options and roles
// =============================================================================

import { useState, useEffect, useCallback } from 'react';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase/client';

// =============================================================================
// TYPES
// =============================================================================

export interface ModeOption {
  id: string;
  key: string;
  label: string;
  description: string | null;
  is_visible: boolean;
  is_enabled: boolean;
  display_order: number;
  style_variant: 'default' | 'highlighted' | 'gradient';
  icon: string | null;
}

export interface UserRole {
  id: string;
  name: string;
  title: string;
  category: 'Executive' | 'Industry' | 'Custom';
  description: string | null;
  responsibilities: string | null;
  is_visible: boolean;
  is_enabled: boolean;
  display_order: number;
  icon_svg: string | null;
}

export interface RolePrompt {
  id: string;
  role_id: string;
  title: string;
  prompt_template: string;
  category: 'general' | 'analysis' | 'strategy' | 'operations';
  is_visible: boolean;
  is_enabled: boolean;
  display_order: number;
}

export interface UIConfig {
  modeOptions: ModeOption[];
  userRoles: UserRole[];
  rolePrompts: RolePrompt[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// =============================================================================
// DEFAULT VALUES (Fallback when database is not available)
// =============================================================================

const DEFAULT_MODE_OPTIONS: ModeOption[] = [
  { id: '1', key: 'story_mode', label: 'Story Mode', description: 'Guided step-by-step workflow', is_visible: true, is_enabled: true, display_order: 1, style_variant: 'highlighted', icon: null },
  { id: '2', key: 'business', label: 'Business', description: 'Focus on business insights', is_visible: true, is_enabled: true, display_order: 2, style_variant: 'default', icon: null },
  { id: '3', key: 'technical', label: 'Technical', description: 'Focus on technical details', is_visible: true, is_enabled: true, display_order: 3, style_variant: 'default', icon: null },
  { id: '4', key: 'inspect', label: 'Inspect', description: 'Show console and debugging', is_visible: true, is_enabled: true, display_order: 4, style_variant: 'default', icon: null },
  { id: '5', key: 'debug', label: 'Debug', description: 'Enable super debug mode', is_visible: true, is_enabled: true, display_order: 5, style_variant: 'gradient', icon: null },
  { id: '6', key: 'simulate', label: 'Simulate', description: 'Simulate multi-error display', is_visible: true, is_enabled: true, display_order: 6, style_variant: 'default', icon: null },
];

const DEFAULT_USER_ROLES: UserRole[] = [
  { id: '1', name: 'CEO', title: 'Chief Executive Officer', category: 'Executive', description: 'The CEO is the highest-ranking executive in a company, responsible for making major corporate decisions.', responsibilities: 'Strategic planning, stakeholder management, and organizational leadership.', is_visible: true, is_enabled: true, display_order: 1, icon_svg: null },
  { id: '2', name: 'CFO', title: 'Chief Financial Officer', category: 'Executive', description: 'The CFO manages the financial actions of a company, including financial planning, risk management, and financial reporting.', responsibilities: 'Financial strategy, budgeting, investor relations, and compliance.', is_visible: true, is_enabled: true, display_order: 2, icon_svg: null },
  { id: '3', name: 'COO', title: 'Chief Operating Officer', category: 'Executive', description: 'The COO oversees the day-to-day administrative and operational functions of a business.', responsibilities: 'Operations management, process optimization, and organizational efficiency.', is_visible: true, is_enabled: true, display_order: 3, icon_svg: null },
  { id: '4', name: 'CTO', title: 'Chief Technology Officer', category: 'Executive', description: 'The CTO is responsible for overseeing the development and dissemination of technology for external customers and internal operations.', responsibilities: 'Technology strategy, R&D, product development, and technical architecture.', is_visible: true, is_enabled: true, display_order: 4, icon_svg: null },
  { id: '5', name: 'CMO', title: 'Chief Marketing Officer', category: 'Executive', description: 'The CMO is responsible for developing and implementing marketing strategies to drive brand awareness and revenue growth.', responsibilities: 'Brand strategy, marketing campaigns, customer acquisition, and market research.', is_visible: true, is_enabled: true, display_order: 5, icon_svg: null },
  { id: '6', name: 'CHRO', title: 'Chief Human Resources Officer', category: 'Executive', description: 'The CHRO oversees all human resource management and labor relations policies, practices, and operations.', responsibilities: 'Talent acquisition, employee development, culture, and HR strategy.', is_visible: true, is_enabled: true, display_order: 6, icon_svg: null },
  { id: '7', name: 'CDIO', title: 'Chief Digital & Information Officer', category: 'Executive', description: 'The CDIO oversees the organization\'s data strategy, information systems, and digital transformation initiatives.', responsibilities: 'Data architecture, AI/ML implementation, information security, and digital innovation.', is_visible: true, is_enabled: true, display_order: 7, icon_svg: null },
  { id: '8', name: 'CSO', title: 'Chief Strategy Officer', category: 'Executive', description: 'The CSO is responsible for developing and implementing strategic initiatives to drive business growth.', responsibilities: 'Corporate strategy, M&A, business development, and competitive analysis.', is_visible: true, is_enabled: true, display_order: 8, icon_svg: null },
  { id: '9', name: 'CLO', title: 'Chief Legal Officer', category: 'Executive', description: 'The CLO oversees all legal matters and ensures the company operates within the law.', responsibilities: 'Legal strategy, compliance, contracts, and risk management.', is_visible: true, is_enabled: true, display_order: 9, icon_svg: null },
  { id: '10', name: 'CRO', title: 'Chief Revenue Officer', category: 'Executive', description: 'The CRO is responsible for all revenue generation processes across sales, marketing, and customer success.', responsibilities: 'Revenue strategy, sales operations, customer retention, and growth.', is_visible: true, is_enabled: true, display_order: 10, icon_svg: null },
  { id: '11', name: 'CPO', title: 'Chief Product Officer', category: 'Executive', description: 'The CPO leads all product-related activities, from ideation to launch and lifecycle management.', responsibilities: 'Product strategy, roadmap, user experience, and product-market fit.', is_visible: true, is_enabled: true, display_order: 11, icon_svg: null },
  { id: '12', name: 'Head of Sales', title: 'Head of Sales', category: 'Executive', description: 'The Head of Sales leads the sales organization, responsible for revenue generation and sales strategy.', responsibilities: 'Revenue targets, sales team leadership, pipeline management, and customer acquisition.', is_visible: true, is_enabled: true, display_order: 12, icon_svg: null },
];

const DEFAULT_ROLE_PROMPTS: RolePrompt[] = [
  { id: '1', role_id: '1', title: 'Strategic Analysis', prompt_template: 'As a CEO, analyze the strategic implications of [topic] for our organization.', category: 'strategy', is_visible: true, is_enabled: true, display_order: 1 },
  { id: '2', role_id: '1', title: 'Board Presentation', prompt_template: 'Help me prepare a board presentation on [topic].', category: 'general', is_visible: true, is_enabled: true, display_order: 2 },
  { id: '3', role_id: '2', title: 'Digital Transformation', prompt_template: 'Develop a digital transformation roadmap for [area].', category: 'strategy', is_visible: true, is_enabled: true, display_order: 1 },
  { id: '4', role_id: '2', title: 'Data Strategy', prompt_template: 'Create a comprehensive data strategy for [objective].', category: 'strategy', is_visible: true, is_enabled: true, display_order: 2 },
  { id: '5', role_id: '3', title: 'Sales Strategy', prompt_template: 'Develop a sales strategy for [market/product].', category: 'strategy', is_visible: true, is_enabled: true, display_order: 1 },
  { id: '6', role_id: '3', title: 'Pipeline Analysis', prompt_template: 'Analyze our sales pipeline for [quarter/region].', category: 'analysis', is_visible: true, is_enabled: true, display_order: 2 },
];

// =============================================================================
// HOOK
// =============================================================================

export function useUIConfig(): UIConfig {
  const [modeOptions, setModeOptions] = useState<ModeOption[]>(DEFAULT_MODE_OPTIONS);
  const [userRoles, setUserRoles] = useState<UserRole[]>(DEFAULT_USER_ROLES);
  const [rolePrompts, setRolePrompts] = useState<RolePrompt[]>(DEFAULT_ROLE_PROMPTS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    // If Supabase is not configured, use defaults
    if (!isSupabaseConfigured()) {
      console.log('[UIConfig] Supabase not configured, using defaults');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const supabase = getSupabase();

      // Fetch all configurations in parallel
      const [modesResult, rolesResult, promptsResult] = await Promise.all([
        supabase
          .from('mode_options')
          .select('*')
          .eq('is_visible', true)
          .order('display_order', { ascending: true }),
        supabase
          .from('user_roles')
          .select('*')
          .eq('is_visible', true)
          .order('display_order', { ascending: true }),
        supabase
          .from('role_prompts')
          .select('*')
          .eq('is_visible', true)
          .order('display_order', { ascending: true }),
      ]);

      // Check for errors
      if (modesResult.error) {
        console.warn('[UIConfig] Error fetching mode_options:', modesResult.error.message);
        // Table might not exist yet, use defaults
      } else if (modesResult.data && modesResult.data.length > 0) {
        setModeOptions(modesResult.data as ModeOption[]);
      }

      if (rolesResult.error) {
        console.warn('[UIConfig] Error fetching user_roles:', rolesResult.error.message);
      } else if (rolesResult.data && rolesResult.data.length > 0) {
        // Merge database roles with defaults to ensure all roles are available
        const dbRoles = rolesResult.data as UserRole[];
        const dbRoleNames = new Set(dbRoles.map(r => r.name));
        const missingDefaults = DEFAULT_USER_ROLES.filter(r => !dbRoleNames.has(r.name));
        const mergedRoles = [...dbRoles, ...missingDefaults].sort((a, b) => a.display_order - b.display_order);
        setUserRoles(mergedRoles);
      }

      if (promptsResult.error) {
        console.warn('[UIConfig] Error fetching role_prompts:', promptsResult.error.message);
      } else if (promptsResult.data && promptsResult.data.length > 0) {
        setRolePrompts(promptsResult.data as RolePrompt[]);
      }

    } catch (err) {
      console.error('[UIConfig] Error fetching config:', err);
      setError('Failed to load UI configuration');
      // Keep using defaults on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return {
    modeOptions,
    userRoles,
    rolePrompts,
    isLoading,
    error,
    refetch: fetchConfig,
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get prompts for a specific role
 */
export function getPromptsForRole(roleId: string, allPrompts: RolePrompt[]): RolePrompt[] {
  return allPrompts.filter(p => p.role_id === roleId && p.is_visible);
}

/**
 * Get visible mode options
 */
export function getVisibleModes(modes: ModeOption[]): ModeOption[] {
  return modes.filter(m => m.is_visible && m.is_enabled);
}

/**
 * Get visible roles by category
 */
export function getRolesByCategory(roles: UserRole[], category: UserRole['category']): UserRole[] {
  return roles.filter(r => r.category === category && r.is_visible && r.is_enabled);
}
