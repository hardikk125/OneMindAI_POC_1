/**
 * SUPABASE LOGGER
 * ================
 * Logs code changes and analysis results to Supabase
 * for historical tracking and reporting
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// =============================================================================
// CONFIGURATION
// =============================================================================

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

console.log('[SupabaseLogger] Supabase configured:', {
  url: !!SUPABASE_URL,
  key: !!SUPABASE_SERVICE_KEY,
});

let supabase = null;

function getSupabase() {
  if (!supabase && SUPABASE_URL && SUPABASE_SERVICE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  }
  return supabase;
}

// =============================================================================
// TABLE SCHEMA (for reference)
// =============================================================================

/*
CREATE TABLE IF NOT EXISTS code_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_ms INTEGER,
  risk_score INTEGER,
  risk_level TEXT,
  summary TEXT,
  intent TEXT,
  potential_issues JSONB,
  breaking_changes JSONB,
  affected_areas JSONB,
  recommendations JSONB,
  tests_needed JSONB,
  dependencies JSONB,
  affected_components JSONB,
  llm_provider TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_code_changes_file ON code_changes(file_path);
CREATE INDEX idx_code_changes_risk ON code_changes(risk_score);
CREATE INDEX idx_code_changes_timestamp ON code_changes(timestamp);
*/

// =============================================================================
// LOGGING FUNCTIONS
// =============================================================================

async function logChange(changeResult) {
  const client = getSupabase();
  
  if (!client) {
    console.log('[SupabaseLogger] Supabase not configured, skipping log');
    return null;
  }
  
  try {
    const record = {
      change_id: changeResult.id,
      file_path: changeResult.file,
      timestamp: changeResult.timestamp,
      duration_ms: changeResult.duration,
      risk_score: changeResult.analysis?.riskScore || 0,
      risk_level: getRiskLevel(changeResult.analysis?.riskScore || 0),
      summary: changeResult.analysis?.summary || null,
      intent: changeResult.analysis?.intent || null,
      potential_issues: changeResult.analysis?.potentialIssues || [],
      breaking_changes: changeResult.analysis?.breakingChanges || [],
      affected_areas: changeResult.analysis?.affectedAreas || [],
      recommendations: changeResult.analysis?.recommendations || [],
      tests_needed: changeResult.analysis?.testsNeeded || [],
      dependencies: changeResult.dependencies || {},
      affected_components: changeResult.affected || {},
      llm_provider: changeResult.analysis?.llmProvider || 'none',
    };
    
    const { data, error } = await client
      .from('code_changes')
      .insert(record)
      .select()
      .single();
    
    if (error) {
      // Table might not exist - that's okay
      if (error.code === '42P01') {
        console.log('[SupabaseLogger] Table "code_changes" does not exist - run migration to create it');
        return null;
      }
      console.error('[SupabaseLogger] Error logging change:', error.message);
      return null;
    }
    
    console.log(`[SupabaseLogger] Logged change: ${changeResult.id}`);
    return data;
    
  } catch (error) {
    console.error('[SupabaseLogger] Error:', error.message);
    return null;
  }
}

async function getChangeHistory(options = {}) {
  const client = getSupabase();
  
  if (!client) {
    return [];
  }
  
  try {
    let query = client
      .from('code_changes')
      .select('*')
      .order('timestamp', { ascending: false });
    
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    if (options.file) {
      query = query.eq('file_path', options.file);
    }
    
    if (options.minRisk) {
      query = query.gte('risk_score', options.minRisk);
    }
    
    if (options.since) {
      query = query.gte('timestamp', options.since);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('[SupabaseLogger] Error fetching history:', error.message);
      return [];
    }
    
    return data || [];
    
  } catch (error) {
    console.error('[SupabaseLogger] Error:', error.message);
    return [];
  }
}

async function getRiskSummary(days = 7) {
  const client = getSupabase();
  
  if (!client) {
    return null;
  }
  
  try {
    const since = new Date();
    since.setDate(since.getDate() - days);
    
    const { data, error } = await client
      .from('code_changes')
      .select('risk_score, risk_level, file_path, timestamp')
      .gte('timestamp', since.toISOString())
      .order('timestamp', { ascending: false });
    
    if (error) {
      console.error('[SupabaseLogger] Error fetching risk summary:', error.message);
      return null;
    }
    
    const summary = {
      total: data.length,
      highRisk: data.filter(c => c.risk_score >= 7).length,
      mediumRisk: data.filter(c => c.risk_score >= 4 && c.risk_score < 7).length,
      lowRisk: data.filter(c => c.risk_score < 4).length,
      averageRisk: data.length > 0 
        ? (data.reduce((sum, c) => sum + c.risk_score, 0) / data.length).toFixed(1)
        : 0,
      mostChangedFiles: getMostChangedFiles(data),
      recentHighRisk: data.filter(c => c.risk_score >= 7).slice(0, 5),
    };
    
    return summary;
    
  } catch (error) {
    console.error('[SupabaseLogger] Error:', error.message);
    return null;
  }
}

function getMostChangedFiles(changes) {
  const counts = {};
  for (const change of changes) {
    counts[change.file_path] = (counts[change.file_path] || 0) + 1;
  }
  
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([file, count]) => ({ file, count }));
}

function getRiskLevel(score) {
  if (score >= 7) return 'high';
  if (score >= 4) return 'medium';
  return 'low';
}

// =============================================================================
// MIGRATION
// =============================================================================

async function createTable() {
  const client = getSupabase();
  
  if (!client) {
    console.log('[SupabaseLogger] Supabase not configured');
    return false;
  }
  
  const sql = `
    CREATE TABLE IF NOT EXISTS code_changes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      change_id TEXT NOT NULL,
      file_path TEXT NOT NULL,
      timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      duration_ms INTEGER,
      risk_score INTEGER,
      risk_level TEXT,
      summary TEXT,
      intent TEXT,
      potential_issues JSONB DEFAULT '[]',
      breaking_changes JSONB DEFAULT '[]',
      affected_areas JSONB DEFAULT '[]',
      recommendations JSONB DEFAULT '[]',
      tests_needed JSONB DEFAULT '[]',
      dependencies JSONB DEFAULT '{}',
      affected_components JSONB DEFAULT '{}',
      llm_provider TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS idx_code_changes_file ON code_changes(file_path);
    CREATE INDEX IF NOT EXISTS idx_code_changes_risk ON code_changes(risk_score);
    CREATE INDEX IF NOT EXISTS idx_code_changes_timestamp ON code_changes(timestamp);
  `;
  
  try {
    const { error } = await client.rpc('exec_sql', { sql });
    
    if (error) {
      console.error('[SupabaseLogger] Migration error:', error.message);
      return false;
    }
    
    console.log('[SupabaseLogger] Table created successfully');
    return true;
    
  } catch (error) {
    console.error('[SupabaseLogger] Migration error:', error.message);
    return false;
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  logChange,
  getChangeHistory,
  getRiskSummary,
  createTable,
  getSupabase,
};
