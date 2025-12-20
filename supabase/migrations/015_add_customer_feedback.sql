-- =============================================================================
-- Migration: Add Customer Feedback System
-- Description: Tables for customer feedback, comments, and attachments
-- Version: 015
-- =============================================================================

-- =============================================================================
-- ENUMS
-- =============================================================================

-- Feedback type enum
DO $$ BEGIN
  CREATE TYPE feedback_type AS ENUM (
    'response_quality',
    'model_performance', 
    'ui_experience',
    'bug_report',
    'feature_request',
    'general'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Feedback status enum
DO $$ BEGIN
  CREATE TYPE feedback_status AS ENUM (
    'new',
    'reviewed',
    'in_progress',
    'resolved',
    'closed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Feedback priority enum
DO $$ BEGIN
  CREATE TYPE feedback_priority AS ENUM (
    'low',
    'medium',
    'high',
    'critical'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =============================================================================
-- MAIN FEEDBACK TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.customer_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Feedback classification
  feedback_type feedback_type NOT NULL DEFAULT 'general',
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  category TEXT NOT NULL,
  
  -- AI interaction context
  session_id TEXT,
  provider TEXT,
  model TEXT,
  api_request_id TEXT,
  
  -- Feedback content
  title TEXT,
  message TEXT NOT NULL,
  tags TEXT[],
  
  -- System information
  user_agent TEXT,
  page_url TEXT,
  app_version TEXT,
  
  -- Workflow management
  status feedback_status NOT NULL DEFAULT 'new',
  priority feedback_priority NOT NULL DEFAULT 'medium',
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  internal_notes TEXT,
  
  -- Response tracking
  response_message TEXT,
  responded_at TIMESTAMPTZ,
  responded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_feedback_user_id ON public.customer_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_type ON public.customer_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_status ON public.customer_feedback(status);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_priority ON public.customer_feedback(priority);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_created_at ON public.customer_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_provider ON public.customer_feedback(provider);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_model ON public.customer_feedback(model);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_rating ON public.customer_feedback(rating);

-- =============================================================================
-- FEEDBACK COMMENTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.feedback_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id UUID NOT NULL REFERENCES public.customer_feedback(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_comments_feedback_id ON public.feedback_comments(feedback_id);
CREATE INDEX IF NOT EXISTS idx_feedback_comments_created_at ON public.feedback_comments(created_at DESC);

-- =============================================================================
-- FEEDBACK ATTACHMENTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.feedback_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id UUID NOT NULL REFERENCES public.customer_feedback(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_attachments_feedback_id ON public.feedback_attachments(feedback_id);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS
ALTER TABLE public.customer_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_attachments ENABLE ROW LEVEL SECURITY;

-- Customer Feedback Policies
CREATE POLICY "Users can view own feedback"
  ON public.customer_feedback FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own feedback"
  ON public.customer_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own feedback"
  ON public.customer_feedback FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all feedback"
  ON public.customer_feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'premium')
    )
  );

CREATE POLICY "Admins can update all feedback"
  ON public.customer_feedback FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'premium')
    )
  );

CREATE POLICY "Admins can delete feedback"
  ON public.customer_feedback FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'premium')
    )
  );

-- Feedback Comments Policies
CREATE POLICY "Users can view comments on own feedback"
  ON public.feedback_comments FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.customer_feedback WHERE id = feedback_id
    )
    OR NOT is_internal
  );

CREATE POLICY "Users can add comments to own feedback"
  ON public.feedback_comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    auth.uid() IN (
      SELECT user_id FROM public.customer_feedback WHERE id = feedback_id
    )
  );

CREATE POLICY "Admins can view all comments"
  ON public.feedback_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'premium')
    )
  );

CREATE POLICY "Admins can add comments"
  ON public.feedback_comments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'premium')
    )
  );

-- Feedback Attachments Policies
CREATE POLICY "Users can view own feedback attachments"
  ON public.feedback_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.customer_feedback
      WHERE id = feedback_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can upload attachments to own feedback"
  ON public.feedback_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.customer_feedback
      WHERE id = feedback_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all attachments"
  ON public.feedback_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'premium')
    )
  );

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_customer_feedback_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_customer_feedback_timestamp
  BEFORE UPDATE ON public.customer_feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.update_customer_feedback_timestamp();

-- =============================================================================
-- VIEWS
-- =============================================================================

-- Feedback with user information
CREATE OR REPLACE VIEW public.feedback_with_users AS
SELECT 
  cf.*,
  p.email as user_email,
  p.full_name as user_full_name,
  p.role as user_role
FROM public.customer_feedback cf
LEFT JOIN public.profiles p ON cf.user_id = p.id;

-- Feedback summary for dashboard
CREATE OR REPLACE VIEW public.feedback_summary AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_feedback,
  COUNT(*) FILTER (WHERE rating <= 2) as negative_feedback,
  COUNT(*) FILTER (WHERE rating >= 4) as positive_feedback,
  ROUND(AVG(rating)::DECIMAL, 2) as average_rating
FROM public.customer_feedback
WHERE rating IS NOT NULL
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Get feedback statistics
CREATE OR REPLACE FUNCTION public.get_feedback_statistics(
  p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  total_feedback BIGINT,
  average_rating DECIMAL(3,2),
  rating_distribution JSONB,
  feedback_by_type JSONB,
  feedback_by_provider JSONB,
  feedback_by_model JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_feedback,
    ROUND(AVG(rating)::DECIMAL, 2) as average_rating,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'rating', rating,
          'count', cnt
        ) ORDER BY rating
      )
      FROM (
        SELECT rating, COUNT(*) as cnt
        FROM public.customer_feedback
        WHERE created_at >= NOW() - INTERVAL '1 day' * p_days_back
          AND rating IS NOT NULL
        GROUP BY rating
      ) rating_stats
    ) as rating_distribution,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'type', feedback_type,
          'count', cnt
        ) ORDER BY cnt DESC
      )
      FROM (
        SELECT feedback_type, COUNT(*) as cnt
        FROM public.customer_feedback
        WHERE created_at >= NOW() - INTERVAL '1 day' * p_days_back
        GROUP BY feedback_type
      ) type_stats
    ) as feedback_by_type,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'provider', provider,
          'count', cnt
        ) ORDER BY cnt DESC
      )
      FROM (
        SELECT provider, COUNT(*) as cnt
        FROM public.customer_feedback
        WHERE created_at >= NOW() - INTERVAL '1 day' * p_days_back
          AND provider IS NOT NULL
        GROUP BY provider
      ) provider_stats
    ) as feedback_by_provider,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'model', model,
          'count', cnt
        ) ORDER BY cnt DESC
      )
      FROM (
        SELECT model, COUNT(*) as cnt
        FROM public.customer_feedback
        WHERE created_at >= NOW() - INTERVAL '1 day' * p_days_back
          AND model IS NOT NULL
        GROUP BY model
      ) model_stats
    ) as feedback_by_model
  FROM public.customer_feedback
  WHERE created_at >= NOW() - INTERVAL '1 day' * p_days_back;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get top feedback issues by category
CREATE OR REPLACE FUNCTION public.get_top_feedback_issues(
  p_limit INTEGER DEFAULT 10,
  p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  category TEXT,
  count BIGINT,
  avg_rating DECIMAL(3,2),
  latest_feedback TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cf.category,
    COUNT(*)::BIGINT as count,
    ROUND(AVG(cf.rating)::DECIMAL, 2) as avg_rating,
    MAX(cf.created_at) as latest_feedback
  FROM public.customer_feedback cf
  WHERE cf.created_at >= NOW() - INTERVAL '1 day' * p_days_back
    AND cf.category IS NOT NULL
  GROUP BY cf.category
  ORDER BY COUNT(*) DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- STORAGE BUCKET FOR FEEDBACK ATTACHMENTS
-- =============================================================================

-- Create storage bucket for feedback attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'feedback-attachments',
  'feedback-attachments',
  false,
  10485760, -- 10MB
  ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain', 'text/csv',
    'application/json', 'application/xml',
    'application/zip', 'application/x-rar-compressed'
  ]
) ON CONFLICT (id) DO NOTHING;

-- RLS policies for storage bucket
CREATE POLICY "Users can upload to own feedback" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'feedback-attachments' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can view own feedback attachments" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'feedback-attachments' AND
    auth.uid() IN (
      SELECT user_id FROM public.customer_feedback WHERE id::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "Admins can view all feedback attachments" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'feedback-attachments' AND
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE role IN ('admin', 'premium')
    )
  );

CREATE POLICY "Users can delete own feedback attachments" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'feedback-attachments' AND
    auth.uid() IN (
      SELECT user_id FROM public.customer_feedback WHERE id::text = (storage.foldername(name))[1]
    )
  );

-- =============================================================================
-- GRANTS
-- =============================================================================

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.customer_feedback TO authenticated;
GRANT SELECT, INSERT ON public.feedback_comments TO authenticated;
GRANT SELECT, INSERT ON public.feedback_attachments TO authenticated;

-- Grant access to views
GRANT SELECT ON public.feedback_with_users TO authenticated;
GRANT SELECT ON public.feedback_summary TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION public.get_feedback_statistics(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_top_feedback_issues(INTEGER, INTEGER) TO authenticated;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE public.customer_feedback IS 'Customer feedback submissions with ratings and categorization';
COMMENT ON TABLE public.feedback_comments IS 'Comments and discussions on feedback entries';
COMMENT ON TABLE public.feedback_attachments IS 'File attachments for feedback entries';
COMMENT ON FUNCTION public.get_feedback_statistics IS 'Get aggregated feedback statistics for analytics';
COMMENT ON FUNCTION public.get_top_feedback_issues IS 'Get top feedback issues by category';
