// =============================================================================
// Admin Panel Types
// =============================================================================

export interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
  credit_balance: number;
  lifetime_earned: number;
  lifetime_spent: number;
  total_requests: number;
  last_activity: string | null;
}

export interface AIModel {
  id: string;
  provider: string;
  model_id: string;
  display_name: string;
  input_cost_per_million: number;
  output_cost_per_million: number;
  input_credits_per_million: number;
  output_credits_per_million: number;
  is_active: boolean;
  is_free: boolean;
  max_tokens: number;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface PricingConfig {
  id: string;
  config_key: string;
  config_value: number;
  description: string | null;
  updated_by: string | null;
  updated_at: string;
}

export interface BugReport {
  id: string;
  user_id: string | null;
  title: string;
  description: string;
  category: 'ui' | 'api' | 'auth' | 'credits' | 'export' | 'models' | 'performance' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'closed' | 'wont_fix';
  browser_info: Record<string, unknown> | null;
  screenshot_url: string | null;
  steps_to_reproduce: string | null;
  expected_behavior: string | null;
  actual_behavior: string | null;
  assigned_to: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ErrorLog {
  id: string;
  user_id: string | null;
  error_type: string;
  error_message: string;
  error_stack: string | null;
  component: string | null;
  provider: string | null;
  model: string | null;
  request_data: Record<string, unknown> | null;
  response_data: Record<string, unknown> | null;
  browser_info: Record<string, unknown> | null;
  url: string | null;
  severity: 'warning' | 'error' | 'critical';
  is_resolved: boolean;
  resolution_notes: string | null;
  created_at: string;
}

export interface SystemMetric {
  id: string;
  metric_type: 'api_latency' | 'error_rate' | 'uptime' | 'active_users' | 'requests_per_minute' | 'credits_used' | 'provider_latency';
  metric_value: number;
  provider: string | null;
  model: string | null;
  metadata: Record<string, unknown> | null;
  recorded_at: string;
}

export interface AdminActivityLog {
  id: string;
  admin_id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface DashboardStats {
  total_users: number;
  active_users_today: number;
  new_users_today: number;
  total_requests_today: number;
  total_credits_used_today: number;
  total_credits_balance: number;
  error_count_today: number;
  error_rate: number;
  open_bugs: number;
  critical_bugs: number;
}

export interface AnalyticsData {
  date: string;
  total_requests: number;
  total_credits_used: number;
  active_users: number;
  new_users: number;
  error_count: number;
}

export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  type: 'purchase' | 'usage' | 'refund' | 'bonus' | 'signup';
  description: string;
  provider: string | null;
  model: string | null;
  tokens_used: number | null;
  created_at: string;
}

// Navigation types
export type AdminPage = 
  | 'dashboard' 
  | 'users' 
  | 'models' 
  | 'pricing' 
  | 'ai-models'
  | 'api-config'
  | 'transactions' 
  | 'bugs' 
  | 'errors' 
  | 'system'
  | 'ui-config'
  | 'chaos-testing'
  | 'feedback';

// =============================================================================
// API Configuration Types
// =============================================================================

export interface ApiProviderConfig {
  provider: string;
  is_enabled: boolean;
  max_output_cap: number;
  rate_limit_rpm: number;
  timeout_seconds: number;
  retry_count: number;
  retry_delay_ms: number;
  api_endpoint: string | null;
  notes: string | null;
  last_tested_at: string | null;
  last_test_status: 'untested' | 'success' | 'failed' | 'timeout';
  last_test_error: string | null;
  priority: number;
  default_model: string | null;
  has_api_key: boolean;
  updated_at: string;
}

export interface ApiProviderConfigFull extends ApiProviderConfig {
  api_key_encrypted: string | null;
  custom_headers: Record<string, string> | null;
}

export interface GlobalApiSettings {
  global_request_timeout_ms: number;
  global_stream_timeout_ms: number;
  global_retry_count: number;
  global_retry_delay_ms: number;
  api_rate_limit_enabled: boolean;
  api_logging_enabled: boolean;
  api_cache_ttl_seconds: number;
  sse_heartbeat_interval_ms: number;
  sse_max_duration_ms: number;
  fallback_enabled: boolean;
  fallback_max_attempts: number;
}

export interface NavItem {
  id: AdminPage;
  label: string;
  icon: string;
  badge?: number;
}

// =============================================================================
// UI Configuration Types
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
  created_at: string;
  updated_at: string;
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
  created_at: string;
  updated_at: string;
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
  created_at: string;
  updated_at: string;
}

export interface UIConfig {
  modeOptions: ModeOption[];
  userRoles: UserRole[];
  rolePrompts: RolePrompt[];
}
