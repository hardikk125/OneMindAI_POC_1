-- ============================================================================
-- FEEDBACK SYSTEM SCHEMA
-- Tables: feedback_submissions, feedback_questions
-- ============================================================================

-- Create feedback_questions table (editable by admin)
CREATE TABLE IF NOT EXISTS feedback_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_number INT NOT NULL CHECK (question_number >= 1 AND question_number <= 4),
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('rating', 'text', 'textarea')),
  is_required BOOLEAN DEFAULT false,
  display_order INT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(question_number)
);

-- Create feedback_submissions table (user feedback data)
CREATE TABLE IF NOT EXISTS feedback_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  reason_for_rating TEXT,
  what_liked TEXT,
  what_improve TEXT,
  ai_provider TEXT,
  ai_model TEXT,
  response_length INT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_user_id ON feedback_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_created_at ON feedback_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_rating ON feedback_submissions(rating);
CREATE INDEX IF NOT EXISTS idx_feedback_questions_order ON feedback_questions(display_order);

-- Enable Row Level Security
ALTER TABLE feedback_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_questions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own feedback
CREATE POLICY "Users can view their own feedback" ON feedback_submissions
  FOR SELECT USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own feedback
CREATE POLICY "Users can insert their own feedback" ON feedback_submissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Admins can view all feedback
CREATE POLICY "Admins can view all feedback" ON feedback_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- RLS Policy: Admins can delete feedback
CREATE POLICY "Admins can delete feedback" ON feedback_submissions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- RLS Policy: Everyone can view feedback questions
CREATE POLICY "Everyone can view feedback questions" ON feedback_questions
  FOR SELECT USING (true);

-- RLS Policy: Only admins can update feedback questions
CREATE POLICY "Admins can update feedback questions" ON feedback_questions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Insert default feedback questions
INSERT INTO feedback_questions (question_number, question_text, question_type, is_required, display_order)
VALUES 
  (1, 'Rate your experience', 'rating', true, 1),
  (2, 'Reason for your rating', 'text', false, 2),
  (3, 'What did you like about OneMind AI?', 'textarea', false, 3),
  (4, 'What could we improve?', 'textarea', false, 4)
ON CONFLICT (question_number) DO NOTHING;

-- Grant permissions
GRANT SELECT ON feedback_questions TO authenticated;
GRANT SELECT, INSERT ON feedback_submissions TO authenticated;
GRANT SELECT, UPDATE ON feedback_questions TO authenticated;
GRANT SELECT, DELETE ON feedback_submissions TO authenticated;
