-- =============================================================================
-- CODE GUARDIAN - SUPABASE SCHEMA
-- =============================================================================
-- Run this in your Supabase SQL Editor to create the required tables
-- Dashboard: https://supabase.com/dashboard/project/YOUR_PROJECT/sql
-- =============================================================================

-- Drop existing table if needed (uncomment to reset)
-- DROP TABLE IF EXISTS code_changes;

-- =============================================================================
-- MAIN TABLE: code_changes
-- =============================================================================
-- Stores all code change analysis results

CREATE TABLE IF NOT EXISTS code_changes (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Change identification
  change_id TEXT NOT NULL,                    -- Unique ID for this change (e.g., change_1733667890123)
  file_path TEXT NOT NULL,                    -- Relative path to the changed file
  
  -- Timestamps
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- When the change was detected
  created_at TIMESTAMPTZ DEFAULT NOW(),         -- When the record was created
  
  -- Analysis metrics
  duration_ms INTEGER,                        -- How long analysis took in milliseconds
  risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 10), -- 0-10 risk rating
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high')), -- Categorical risk
  
  -- LLM Analysis results
  summary TEXT,                               -- Brief description of the change
  intent TEXT,                                -- What the developer was trying to do
  llm_provider TEXT,                          -- Which LLM was used (openai, anthropic, etc.)
  
  -- Detailed analysis (JSONB for flexibility)
  potential_issues JSONB DEFAULT '[]',        -- Array of detected issues
  breaking_changes JSONB DEFAULT '[]',        -- Array of breaking changes
  affected_areas JSONB DEFAULT '[]',          -- Array of affected component names
  recommendations JSONB DEFAULT '[]',         -- Array of recommendations
  tests_needed JSONB DEFAULT '[]',            -- Array of suggested tests
  
  -- Dependency information
  dependencies JSONB DEFAULT '{}',            -- File's imports, exports, functions, etc.
  affected_components JSONB DEFAULT '{}'      -- Direct/indirect dependents, components, hooks, etc.
);

-- =============================================================================
-- INDEXES for fast queries
-- =============================================================================

-- Index for filtering by file path
CREATE INDEX IF NOT EXISTS idx_code_changes_file_path 
  ON code_changes(file_path);

-- Index for filtering by risk score (find high-risk changes)
CREATE INDEX IF NOT EXISTS idx_code_changes_risk_score 
  ON code_changes(risk_score DESC);

-- Index for time-based queries (recent changes)
CREATE INDEX IF NOT EXISTS idx_code_changes_timestamp 
  ON code_changes(timestamp DESC);

-- Index for risk level filtering
CREATE INDEX IF NOT EXISTS idx_code_changes_risk_level 
  ON code_changes(risk_level);

-- Composite index for dashboard queries
CREATE INDEX IF NOT EXISTS idx_code_changes_dashboard 
  ON code_changes(timestamp DESC, risk_score DESC);

-- =============================================================================
-- VIEWS for common queries
-- =============================================================================

-- View: Recent high-risk changes
CREATE OR REPLACE VIEW high_risk_changes AS
SELECT 
  id,
  change_id,
  file_path,
  timestamp,
  risk_score,
  summary,
  potential_issues,
  affected_areas
FROM code_changes
WHERE risk_score >= 7
ORDER BY timestamp DESC
LIMIT 50;

-- View: Daily risk summary
CREATE OR REPLACE VIEW daily_risk_summary AS
SELECT 
  DATE(timestamp) as date,
  COUNT(*) as total_changes,
  COUNT(*) FILTER (WHERE risk_score >= 7) as high_risk,
  COUNT(*) FILTER (WHERE risk_score >= 4 AND risk_score < 7) as medium_risk,
  COUNT(*) FILTER (WHERE risk_score < 4) as low_risk,
  ROUND(AVG(risk_score)::numeric, 2) as avg_risk_score,
  ROUND(AVG(duration_ms)::numeric, 0) as avg_analysis_time_ms
FROM code_changes
GROUP BY DATE(timestamp)
ORDER BY date DESC;

-- View: Most changed files
CREATE OR REPLACE VIEW most_changed_files AS
SELECT 
  file_path,
  COUNT(*) as change_count,
  ROUND(AVG(risk_score)::numeric, 2) as avg_risk_score,
  MAX(timestamp) as last_changed
FROM code_changes
GROUP BY file_path
ORDER BY change_count DESC
LIMIT 50;

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Function: Get risk summary for a time period
CREATE OR REPLACE FUNCTION get_risk_summary(days_back INTEGER DEFAULT 7)
RETURNS TABLE (
  total_changes BIGINT,
  high_risk BIGINT,
  medium_risk BIGINT,
  low_risk BIGINT,
  avg_risk_score NUMERIC,
  most_risky_file TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_changes,
    COUNT(*) FILTER (WHERE risk_score >= 7)::BIGINT as high_risk,
    COUNT(*) FILTER (WHERE risk_score >= 4 AND risk_score < 7)::BIGINT as medium_risk,
    COUNT(*) FILTER (WHERE risk_score < 4)::BIGINT as low_risk,
    ROUND(AVG(risk_score)::numeric, 2) as avg_risk_score,
    (SELECT file_path FROM code_changes 
     WHERE timestamp > NOW() - (days_back || ' days')::INTERVAL
     GROUP BY file_path ORDER BY AVG(risk_score) DESC LIMIT 1) as most_risky_file
  FROM code_changes
  WHERE timestamp > NOW() - (days_back || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- ROW LEVEL SECURITY (Optional - enable if needed)
-- =============================================================================

-- Enable RLS (uncomment if you want to restrict access)
-- ALTER TABLE code_changes ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations for authenticated users
-- CREATE POLICY "Allow all for authenticated" ON code_changes
--   FOR ALL
--   TO authenticated
--   USING (true)
--   WITH CHECK (true);

-- Policy: Allow read-only for anonymous users
-- CREATE POLICY "Allow read for anon" ON code_changes
--   FOR SELECT
--   TO anon
--   USING (true);

-- =============================================================================
-- SAMPLE DATA (for testing - uncomment to insert)
-- =============================================================================

/*
INSERT INTO code_changes (change_id, file_path, risk_score, risk_level, summary, intent, llm_provider)
VALUES 
  ('change_test_1', 'src/App.tsx', 3, 'low', 'Added new component import', 'Import new feature component', 'openai'),
  ('change_test_2', 'src/hooks/useAuth.ts', 7, 'high', 'Modified authentication logic', 'Fix token refresh bug', 'openai'),
  ('change_test_3', 'server/api.js', 5, 'medium', 'Added new API endpoint', 'Create user profile endpoint', 'openai');
*/

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Check table was created
SELECT 'code_changes table created' as status, COUNT(*) as row_count FROM code_changes;

-- Check indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'code_changes';
