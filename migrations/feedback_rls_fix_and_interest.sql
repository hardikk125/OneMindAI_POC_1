-- ============================================================================
-- FEEDBACK RLS FIX + INTEREST REGISTRATIONS TABLE
-- Run this in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- PART 1: FIX RLS POLICIES FOR FEEDBACK TABLES
-- ============================================================================

-- Drop existing policies (if they exist) to recreate them properly
DROP POLICY IF EXISTS "Users can view their own feedback" ON feedback_submissions;
DROP POLICY IF EXISTS "Users can insert their own feedback" ON feedback_submissions;
DROP POLICY IF EXISTS "Admins can view all feedback" ON feedback_submissions;
DROP POLICY IF EXISTS "Admins can delete feedback" ON feedback_submissions;
DROP POLICY IF EXISTS "Everyone can view feedback questions" ON feedback_questions;
DROP POLICY IF EXISTS "Admins can update feedback questions" ON feedback_questions;
DROP POLICY IF EXISTS "Admins can insert feedback questions" ON feedback_questions;

-- Ensure RLS is enabled
ALTER TABLE feedback_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_questions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- FEEDBACK_SUBMISSIONS POLICIES
-- ============================================================================

-- Policy: Authenticated users can INSERT their own feedback
CREATE POLICY "Users can insert own feedback" ON feedback_submissions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can view their own feedback
CREATE POLICY "Users can view own feedback" ON feedback_submissions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Admins can view ALL feedback (using email check as fallback)
CREATE POLICY "Admins can view all feedback" ON feedback_submissions
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id 
    OR 
    (SELECT email FROM auth.users WHERE id = auth.uid()) IN (
      'admin@onemindai.com',
      'hardik@onemindai.com',
      'hardikpandey.hp@gmail.com'
    )
  );

-- Policy: Admins can delete feedback
CREATE POLICY "Admins can delete feedback" ON feedback_submissions
  FOR DELETE TO authenticated
  USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) IN (
      'admin@onemindai.com',
      'hardik@onemindai.com',
      'hardikpandey.hp@gmail.com'
    )
  );

-- ============================================================================
-- FEEDBACK_QUESTIONS POLICIES
-- ============================================================================

-- Policy: Everyone (authenticated) can view questions
CREATE POLICY "Anyone can view questions" ON feedback_questions
  FOR SELECT TO authenticated
  USING (true);

-- Policy: Admins can update questions
CREATE POLICY "Admins can update questions" ON feedback_questions
  FOR UPDATE TO authenticated
  USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) IN (
      'admin@onemindai.com',
      'hardik@onemindai.com',
      'hardikpandey.hp@gmail.com'
    )
  );

-- Policy: Admins can insert new questions
CREATE POLICY "Admins can insert questions" ON feedback_questions
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT email FROM auth.users WHERE id = auth.uid()) IN (
      'admin@onemindai.com',
      'hardik@onemindai.com',
      'hardikpandey.hp@gmail.com'
    )
  );

-- ============================================================================
-- PART 2: INTEREST REGISTRATIONS TABLE
-- For collecting user interest (name + email) with feedback
-- ============================================================================

-- Create interest_registrations table
CREATE TABLE IF NOT EXISTS interest_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  feedback_id UUID REFERENCES feedback_submissions(id) ON DELETE SET NULL,
  source TEXT DEFAULT 'feedback_form',
  subscribed_to_updates BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_interest_registrations_email ON interest_registrations(email);
CREATE INDEX IF NOT EXISTS idx_interest_registrations_created_at ON interest_registrations(created_at DESC);

-- Enable RLS
ALTER TABLE interest_registrations ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can insert their interest registration
CREATE POLICY "Users can register interest" ON interest_registrations
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Policy: Users can view their own registrations (by email match)
CREATE POLICY "Users can view own registrations" ON interest_registrations
  FOR SELECT TO authenticated
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Policy: Admins can view all registrations
CREATE POLICY "Admins can view all registrations" ON interest_registrations
  FOR SELECT TO authenticated
  USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) IN (
      'admin@onemindai.com',
      'hardik@onemindai.com',
      'hardikpandey.hp@gmail.com'
    )
  );

-- Policy: Admins can delete registrations
CREATE POLICY "Admins can delete registrations" ON interest_registrations
  FOR DELETE TO authenticated
  USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) IN (
      'admin@onemindai.com',
      'hardik@onemindai.com',
      'hardikpandey.hp@gmail.com'
    )
  );

-- Grant permissions
GRANT SELECT, INSERT ON interest_registrations TO authenticated;
GRANT DELETE ON interest_registrations TO authenticated;

-- ============================================================================
-- VERIFY: Check that policies are created
-- ============================================================================
-- Run this to verify:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename IN ('feedback_submissions', 'feedback_questions', 'interest_registrations');
