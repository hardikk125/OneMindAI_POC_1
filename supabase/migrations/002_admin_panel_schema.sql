-- =============================================================================
-- OneMindAI Admin Panel Database Schema
-- Run this in your Supabase SQL Editor AFTER 001_initial_schema.sql
-- =============================================================================

-- =============================================================================
-- 1. AI MODELS CONFIGURATION TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ai_models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider TEXT NOT NULL,
  model_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  input_cost_per_million DECIMAL(10,4) NOT NULL DEFAULT 0,
  output_cost_per_million DECIMAL(10,4) NOT NULL DEFAULT 0,
  input_credits_per_million INTEGER NOT NULL DEFAULT 0,
  output_credits_per_million INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  is_free BOOLEAN DEFAULT FALSE NOT NULL,
  max_tokens INTEGER DEFAULT 4096,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(provider, model_id)
);

-- Enable RLS
ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;

-- Insert default models
INSERT INTO public.ai_models (provider, model_id, display_name, input_cost_per_million, output_cost_per_million, input_credits_per_million, output_credits_per_million, is_free, max_tokens, description) VALUES
  ('openai', 'gpt-4o', 'GPT-4o', 2.50, 10.00, 25, 100, FALSE, 128000, 'Most capable GPT-4 model'),
  ('openai', 'gpt-4o-mini', 'GPT-4o Mini', 0.15, 0.60, 1.5, 6, FALSE, 128000, 'Affordable GPT-4 model'),
  ('openai', 'gpt-4.1', 'GPT-4.1 Turbo', 2.00, 8.00, 100, 300, FALSE, 128000, 'Latest GPT-4 Turbo'),
  ('openai', 'gpt-4.1-mini', 'GPT-4.1 Mini', 0.15, 0.60, 1.5, 6, FALSE, 128000, 'Affordable GPT-4.1'),
  ('anthropic', 'claude-3-5-sonnet-20241022', 'Claude 3.5 Sonnet', 3.00, 15.00, 30, 150, FALSE, 200000, 'Most intelligent Claude model'),
  ('anthropic', 'claude-3-haiku-20240307', 'Claude 3 Haiku', 0.25, 1.25, 2.5, 12.5, FALSE, 200000, 'Fast and affordable Claude'),
  ('gemini', 'gemini-2.0-flash-exp', 'Gemini 2.0 Flash', 0, 0, 0, 0, TRUE, 1000000, 'Free Google Gemini model'),
  ('gemini', 'gemini-2.0-flash-lite', 'Gemini 2.0 Flash Lite', 0, 0, 0, 0, TRUE, 1000000, 'Free lightweight Gemini'),
  ('deepseek', 'deepseek-chat', 'DeepSeek Chat', 0.14, 0.28, 1.4, 2.8, FALSE, 64000, 'Affordable DeepSeek model'),
  ('deepseek', 'deepseek-coder', 'DeepSeek Coder', 0.14, 0.28, 1.4, 2.8, FALSE, 64000, 'Code-specialized DeepSeek'),
  ('mistral', 'mistral-large-latest', 'Mistral Large', 2.00, 6.00, 20, 60, FALSE, 128000, 'Most capable Mistral'),
  ('mistral', 'mistral-small', 'Mistral Small', 1.00, 3.00, 10, 30, FALSE, 128000, 'Efficient Mistral model'),
  ('groq', 'llama-3.3-70b-versatile', 'Llama 3.3 70B', 0.59, 0.79, 0.59, 0.79, FALSE, 128000, 'Fast Llama on Groq'),
  ('groq', 'llama-3.1-8b-instant', 'Llama 3.1 8B', 0.05, 0.08, 0.05, 0.08, FALSE, 128000, 'Ultra-fast small Llama'),
  ('groq', 'mixtral-8x7b-32768', 'Mixtral 8x7B', 0.24, 0.24, 0.24, 0.24, FALSE, 32768, 'Mixtral on Groq'),
  ('perplexity', 'sonar-pro', 'Perplexity Sonar Pro', 3.00, 15.00, 30, 150, FALSE, 128000, 'Advanced search-augmented'),
  ('perplexity', 'sonar-small', 'Perplexity Sonar Small', 0.20, 0.20, 2, 2, FALSE, 128000, 'Lightweight search model')
ON CONFLICT (provider, model_id) DO NOTHING;

-- =============================================================================
-- 2. PRICING CONFIGURATION TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.pricing_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  config_key TEXT UNIQUE NOT NULL,
  config_value DECIMAL(10,4) NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.pricing_config ENABLE ROW LEVEL SECURITY;

-- Insert default pricing config
INSERT INTO public.pricing_config (config_key, config_value, description) VALUES
  ('profit_markup', 0.30, 'Profit markup percentage (30%)'),
  ('credits_per_usd', 100, 'Credits per $1 USD'),
  ('signup_bonus', 100, 'Signup bonus credits'),
  ('referral_bonus', 50, 'Referral bonus credits'),
  ('min_purchase', 5, 'Minimum purchase amount in USD'),
  ('max_purchase', 1000, 'Maximum purchase amount in USD')
ON CONFLICT (config_key) DO NOTHING;

-- =============================================================================
-- 3. BUG REPORTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.bug_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('ui', 'api', 'auth', 'credits', 'export', 'models', 'performance', 'other')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'open' NOT NULL CHECK (status IN ('open', 'in_progress', 'resolved', 'closed', 'wont_fix')),
  browser_info JSONB,
  screenshot_url TEXT,
  steps_to_reproduce TEXT,
  expected_behavior TEXT,
  actual_behavior TEXT,
  assigned_to UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bug_reports_status ON public.bug_reports(status);
CREATE INDEX IF NOT EXISTS idx_bug_reports_severity ON public.bug_reports(severity);
CREATE INDEX IF NOT EXISTS idx_bug_reports_created ON public.bug_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bug_reports_user ON public.bug_reports(user_id);

-- =============================================================================
-- 4. ERROR LOGS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.error_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  component TEXT,
  provider TEXT,
  model TEXT,
  request_data JSONB,
  response_data JSONB,
  browser_info JSONB,
  url TEXT,
  severity TEXT DEFAULT 'error' CHECK (severity IN ('warning', 'error', 'critical')),
  is_resolved BOOLEAN DEFAULT FALSE,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_error_logs_created ON public.error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_type ON public.error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON public.error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_provider ON public.error_logs(provider);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON public.error_logs(is_resolved);

-- =============================================================================
-- 5. SYSTEM METRICS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.system_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_type TEXT NOT NULL CHECK (metric_type IN ('api_latency', 'error_rate', 'uptime', 'active_users', 'requests_per_minute', 'credits_used', 'provider_latency')),
  metric_value DECIMAL(10,4) NOT NULL,
  provider TEXT,
  model TEXT,
  metadata JSONB,
  recorded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.system_metrics ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_system_metrics_type ON public.system_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_system_metrics_recorded ON public.system_metrics(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_metrics_provider ON public.system_metrics(provider);

-- =============================================================================
-- 6. ADMIN ACTIVITY LOG TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.admin_activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  old_value JSONB,
  new_value JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_admin_activity_created ON public.admin_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_activity_admin ON public.admin_activity_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_action ON public.admin_activity_log(action);

-- =============================================================================
-- 7. ADMIN CHECK FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 8. RLS POLICIES
-- =============================================================================

-- AI Models: Anyone can view active models, admins can manage all
CREATE POLICY "Anyone can view active models" ON public.ai_models
  FOR SELECT USING (is_active = TRUE OR public.is_admin());

CREATE POLICY "Admins can insert models" ON public.ai_models
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update models" ON public.ai_models
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can delete models" ON public.ai_models
  FOR DELETE USING (public.is_admin());

-- Pricing Config: Only admins
CREATE POLICY "Admins can view pricing" ON public.pricing_config
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can update pricing" ON public.pricing_config
  FOR UPDATE USING (public.is_admin());

-- Bug Reports: Users can create and view own, admins can manage all
CREATE POLICY "Users can create bug reports" ON public.bug_reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own bug reports" ON public.bug_reports
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Admins can update bug reports" ON public.bug_reports
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can delete bug reports" ON public.bug_reports
  FOR DELETE USING (public.is_admin());

-- Error Logs: System can insert, admins can view
CREATE POLICY "System can insert error logs" ON public.error_logs
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Admins can view error logs" ON public.error_logs
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can update error logs" ON public.error_logs
  FOR UPDATE USING (public.is_admin());

-- System Metrics: System can insert, admins can view
CREATE POLICY "System can insert metrics" ON public.system_metrics
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Admins can view metrics" ON public.system_metrics
  FOR SELECT USING (public.is_admin());

-- Admin Activity Log: Only admins
CREATE POLICY "Admins can view activity log" ON public.admin_activity_log
  FOR SELECT USING (public.is_admin());

CREATE POLICY "System can insert activity log" ON public.admin_activity_log
  FOR INSERT WITH CHECK (TRUE);

-- =============================================================================
-- 9. ADMIN RPC FUNCTIONS
-- =============================================================================

-- Get all users with stats
CREATE OR REPLACE FUNCTION public.admin_get_all_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  role TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  credit_balance INTEGER,
  lifetime_earned INTEGER,
  lifetime_spent INTEGER,
  total_requests BIGINT,
  last_activity TIMESTAMPTZ
) AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.full_name,
    p.role,
    p.is_active,
    p.created_at,
    COALESCE(c.balance, 0)::INTEGER as credit_balance,
    COALESCE(c.lifetime_earned, 0)::INTEGER as lifetime_earned,
    COALESCE(c.lifetime_spent, 0)::INTEGER as lifetime_spent,
    COALESCE(COUNT(a.id), 0)::BIGINT as total_requests,
    MAX(a.created_at) as last_activity
  FROM public.profiles p
  LEFT JOIN public.credits c ON c.user_id = p.id
  LEFT JOIN public.api_usage a ON a.user_id = p.id
  GROUP BY p.id, p.email, p.full_name, p.role, p.is_active, p.created_at, c.balance, c.lifetime_earned, c.lifetime_spent
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Toggle user status (suspend/unsuspend)
CREATE OR REPLACE FUNCTION public.admin_toggle_user_status(
  p_user_id UUID,
  p_is_active BOOLEAN
)
RETURNS BOOLEAN AS $$
DECLARE
  v_old_status BOOLEAN;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  -- Get old status
  SELECT is_active INTO v_old_status
  FROM public.profiles WHERE id = p_user_id;
  
  -- Update status
  UPDATE public.profiles
  SET is_active = p_is_active, updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Log admin action
  INSERT INTO public.admin_activity_log (admin_id, action, target_type, target_id, old_value, new_value)
  VALUES (
    auth.uid(), 
    CASE WHEN p_is_active THEN 'unsuspend_user' ELSE 'suspend_user' END, 
    'user', 
    p_user_id, 
    jsonb_build_object('is_active', v_old_status),
    jsonb_build_object('is_active', p_is_active)
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin add credits to user
CREATE OR REPLACE FUNCTION public.admin_add_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_old_balance INTEGER;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;
  
  -- Get old balance
  SELECT balance INTO v_old_balance
  FROM public.credits WHERE user_id = p_user_id;
  
  -- Add credits
  UPDATE public.credits
  SET 
    balance = balance + p_amount,
    lifetime_earned = lifetime_earned + p_amount,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Log transaction
  INSERT INTO public.credit_transactions (user_id, amount, type, description)
  VALUES (p_user_id, p_amount, 'bonus', 'Admin: ' || p_reason);
  
  -- Log admin action
  INSERT INTO public.admin_activity_log (admin_id, action, target_type, target_id, old_value, new_value)
  VALUES (
    auth.uid(), 
    'add_credits', 
    'user', 
    p_user_id, 
    jsonb_build_object('balance', v_old_balance),
    jsonb_build_object('balance', COALESCE(v_old_balance, 0) + p_amount, 'amount_added', p_amount, 'reason', p_reason)
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get analytics data
CREATE OR REPLACE FUNCTION public.admin_get_analytics(p_days INTEGER DEFAULT 30)
RETURNS TABLE (
  date DATE,
  total_requests BIGINT,
  total_credits_used BIGINT,
  active_users BIGINT,
  new_users BIGINT,
  error_count BIGINT
) AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(
      CURRENT_DATE - (p_days - 1),
      CURRENT_DATE,
      '1 day'::INTERVAL
    )::DATE as date
  ),
  daily_requests AS (
    SELECT DATE(created_at) as date, COUNT(*) as count, COALESCE(SUM(cost_credits), 0) as credits
    FROM public.api_usage
    WHERE created_at >= CURRENT_DATE - (p_days - 1)
    GROUP BY DATE(created_at)
  ),
  daily_users AS (
    SELECT DATE(created_at) as date, COUNT(DISTINCT user_id) as count
    FROM public.api_usage
    WHERE created_at >= CURRENT_DATE - (p_days - 1)
    GROUP BY DATE(created_at)
  ),
  daily_signups AS (
    SELECT DATE(created_at) as date, COUNT(*) as count
    FROM public.profiles
    WHERE created_at >= CURRENT_DATE - (p_days - 1)
    GROUP BY DATE(created_at)
  ),
  daily_errors AS (
    SELECT DATE(created_at) as date, COUNT(*) as count
    FROM public.error_logs
    WHERE created_at >= CURRENT_DATE - (p_days - 1)
    GROUP BY DATE(created_at)
  )
  SELECT 
    ds.date,
    COALESCE(dr.count, 0)::BIGINT as total_requests,
    COALESCE(dr.credits, 0)::BIGINT as total_credits_used,
    COALESCE(du.count, 0)::BIGINT as active_users,
    COALESCE(dns.count, 0)::BIGINT as new_users,
    COALESCE(de.count, 0)::BIGINT as error_count
  FROM date_series ds
  LEFT JOIN daily_requests dr ON dr.date = ds.date
  LEFT JOIN daily_users du ON du.date = ds.date
  LEFT JOIN daily_signups dns ON dns.date = ds.date
  LEFT JOIN daily_errors de ON de.date = ds.date
  ORDER BY ds.date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get dashboard stats
CREATE OR REPLACE FUNCTION public.admin_get_dashboard_stats()
RETURNS TABLE (
  total_users BIGINT,
  active_users_today BIGINT,
  new_users_today BIGINT,
  total_requests_today BIGINT,
  total_credits_used_today BIGINT,
  total_credits_balance BIGINT,
  error_count_today BIGINT,
  error_rate DECIMAL,
  open_bugs BIGINT,
  critical_bugs BIGINT
) AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM public.profiles)::BIGINT as total_users,
    (SELECT COUNT(DISTINCT user_id) FROM public.api_usage WHERE created_at >= CURRENT_DATE)::BIGINT as active_users_today,
    (SELECT COUNT(*) FROM public.profiles WHERE created_at >= CURRENT_DATE)::BIGINT as new_users_today,
    (SELECT COUNT(*) FROM public.api_usage WHERE created_at >= CURRENT_DATE)::BIGINT as total_requests_today,
    (SELECT COALESCE(SUM(cost_credits), 0) FROM public.api_usage WHERE created_at >= CURRENT_DATE)::BIGINT as total_credits_used_today,
    (SELECT COALESCE(SUM(balance), 0) FROM public.credits)::BIGINT as total_credits_balance,
    (SELECT COUNT(*) FROM public.error_logs WHERE created_at >= CURRENT_DATE)::BIGINT as error_count_today,
    (SELECT COALESCE(
      (COUNT(*) FILTER (WHERE success = FALSE)::DECIMAL / NULLIF(COUNT(*), 0) * 100),
      0
    ) FROM public.api_usage WHERE created_at >= CURRENT_DATE)::DECIMAL as error_rate,
    (SELECT COUNT(*) FROM public.bug_reports WHERE status IN ('open', 'in_progress'))::BIGINT as open_bugs,
    (SELECT COUNT(*) FROM public.bug_reports WHERE status IN ('open', 'in_progress') AND severity = 'critical')::BIGINT as critical_bugs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update model pricing
CREATE OR REPLACE FUNCTION public.admin_update_model(
  p_model_id UUID,
  p_display_name TEXT DEFAULT NULL,
  p_input_credits INTEGER DEFAULT NULL,
  p_output_credits INTEGER DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL,
  p_is_free BOOLEAN DEFAULT NULL,
  p_max_tokens INTEGER DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_old_record JSONB;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  -- Get old values
  SELECT to_jsonb(ai_models.*) INTO v_old_record
  FROM public.ai_models WHERE id = p_model_id;
  
  -- Update model
  UPDATE public.ai_models
  SET 
    display_name = COALESCE(p_display_name, display_name),
    input_credits_per_million = COALESCE(p_input_credits, input_credits_per_million),
    output_credits_per_million = COALESCE(p_output_credits, output_credits_per_million),
    is_active = COALESCE(p_is_active, is_active),
    is_free = COALESCE(p_is_free, is_free),
    max_tokens = COALESCE(p_max_tokens, max_tokens),
    description = COALESCE(p_description, description),
    updated_at = NOW()
  WHERE id = p_model_id;
  
  -- Log admin action
  INSERT INTO public.admin_activity_log (admin_id, action, target_type, target_id, old_value, new_value)
  VALUES (
    auth.uid(), 
    'update_model', 
    'model', 
    p_model_id, 
    v_old_record,
    jsonb_build_object(
      'display_name', p_display_name,
      'input_credits', p_input_credits,
      'output_credits', p_output_credits,
      'is_active', p_is_active,
      'is_free', p_is_free
    )
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update pricing config
CREATE OR REPLACE FUNCTION public.admin_update_pricing_config(
  p_config_key TEXT,
  p_config_value DECIMAL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_old_value DECIMAL;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  -- Get old value
  SELECT config_value INTO v_old_value
  FROM public.pricing_config WHERE config_key = p_config_key;
  
  -- Update config
  UPDATE public.pricing_config
  SET 
    config_value = p_config_value,
    updated_by = auth.uid(),
    updated_at = NOW()
  WHERE config_key = p_config_key;
  
  -- Log admin action
  INSERT INTO public.admin_activity_log (admin_id, action, target_type, target_id, old_value, new_value)
  VALUES (
    auth.uid(), 
    'update_pricing_config', 
    'pricing', 
    NULL, 
    jsonb_build_object('key', p_config_key, 'value', v_old_value),
    jsonb_build_object('key', p_config_key, 'value', p_config_value)
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user transaction history
CREATE OR REPLACE FUNCTION public.admin_get_user_transactions(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  amount INTEGER,
  type TEXT,
  description TEXT,
  provider TEXT,
  model TEXT,
  tokens_used INTEGER,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  RETURN QUERY
  SELECT 
    ct.id,
    ct.amount,
    ct.type,
    ct.description,
    ct.provider,
    ct.model,
    ct.tokens_used,
    ct.created_at
  FROM public.credit_transactions ct
  WHERE ct.user_id = p_user_id
  ORDER BY ct.created_at DESC
  LIMIT 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 10. GRANTS
-- =============================================================================

-- Grant access to tables
GRANT SELECT ON public.ai_models TO authenticated;
GRANT ALL ON public.ai_models TO service_role;

GRANT SELECT ON public.pricing_config TO service_role;
GRANT UPDATE ON public.pricing_config TO service_role;

GRANT ALL ON public.bug_reports TO authenticated;
GRANT ALL ON public.bug_reports TO service_role;

GRANT INSERT ON public.error_logs TO authenticated;
GRANT ALL ON public.error_logs TO service_role;

GRANT INSERT ON public.system_metrics TO authenticated;
GRANT ALL ON public.system_metrics TO service_role;

GRANT INSERT ON public.admin_activity_log TO authenticated;
GRANT ALL ON public.admin_activity_log TO service_role;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_all_users TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_toggle_user_status TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_add_credits TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_dashboard_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_model TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_pricing_config TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_user_transactions TO authenticated;

-- =============================================================================
-- 11. ENABLE REALTIME
-- =============================================================================

-- Enable realtime for admin tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.bug_reports;
ALTER PUBLICATION supabase_realtime ADD TABLE public.error_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.api_usage;
ALTER PUBLICATION supabase_realtime ADD TABLE public.credit_transactions;

-- =============================================================================
-- DONE! Run this in Supabase SQL Editor
-- =============================================================================
