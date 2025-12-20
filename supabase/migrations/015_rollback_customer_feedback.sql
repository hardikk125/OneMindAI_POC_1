-- =============================================================================
-- Rollback: Remove Customer Feedback System
-- Description: Drops all feedback-related tables, functions, views, and policies
-- Version: 015_rollback
-- =============================================================================

-- Drop storage policies first
DROP POLICY IF EXISTS "Users can upload to own feedback" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own feedback attachments" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all feedback attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own feedback attachments" ON storage.objects;

-- Delete storage bucket
DELETE FROM storage.buckets WHERE id = 'feedback-attachments';

-- Drop helper functions
DROP FUNCTION IF EXISTS public.get_feedback_statistics(INTEGER);
DROP FUNCTION IF EXISTS public.get_top_feedback_issues(INTEGER, INTEGER);

-- Drop views
DROP VIEW IF EXISTS public.feedback_summary;
DROP VIEW IF EXISTS public.feedback_with_users;

-- Drop trigger function
DROP FUNCTION IF EXISTS public.update_customer_feedback_timestamp() CASCADE;

-- Drop tables (CASCADE will drop all foreign key constraints and policies)
DROP TABLE IF EXISTS public.feedback_attachments CASCADE;
DROP TABLE IF EXISTS public.feedback_comments CASCADE;
DROP TABLE IF EXISTS public.customer_feedback CASCADE;

-- Drop enums
DROP TYPE IF EXISTS feedback_priority CASCADE;
DROP TYPE IF EXISTS feedback_status CASCADE;
DROP TYPE IF EXISTS feedback_type CASCADE;

-- Confirmation message
DO $$
BEGIN
  RAISE NOTICE 'Customer feedback system has been completely removed';
END $$;
