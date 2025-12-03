-- =============================================================================
-- UI Configuration Tables for Admin-Controlled Features
-- =============================================================================

-- Mode Options (Story Mode, Business, Technical, Inspect, Debug, Simulate)
CREATE TABLE IF NOT EXISTS mode_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  is_visible BOOLEAN DEFAULT true,
  is_enabled BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  style_variant TEXT DEFAULT 'default', -- 'default', 'highlighted', 'gradient'
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Roles (CEO, CDIO, Head of Sales, etc.)
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL, -- Full title (e.g., "Chief Executive Officer")
  category TEXT NOT NULL DEFAULT 'Executive', -- 'Executive', 'Industry', 'Custom'
  description TEXT,
  responsibilities TEXT,
  is_visible BOOLEAN DEFAULT true,
  is_enabled BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  icon_svg TEXT, -- Optional custom SVG icon
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Role Prompts (Pre-defined prompts for each role)
CREATE TABLE IF NOT EXISTS role_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID REFERENCES user_roles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  prompt_template TEXT NOT NULL,
  category TEXT DEFAULT 'general', -- 'general', 'analysis', 'strategy', 'operations'
  is_visible BOOLEAN DEFAULT true,
  is_enabled BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default mode options
INSERT INTO mode_options (key, label, description, is_visible, is_enabled, display_order, style_variant) VALUES
  ('story_mode', 'Story Mode', 'Guided step-by-step workflow for structured queries', true, true, 1, 'highlighted'),
  ('business', 'Business', 'Focus on business insights and strategy', true, true, 2, 'default'),
  ('technical', 'Technical', 'Focus on technical details and implementation', true, true, 3, 'default'),
  ('inspect', 'Inspect', 'Show console and debugging information', true, true, 4, 'default'),
  ('debug', 'Debug', 'Enable super debug mode for development', true, true, 5, 'gradient'),
  ('simulate', 'Simulate', 'Simulate multi-error display for testing', true, true, 6, 'default')
ON CONFLICT (key) DO NOTHING;

-- Insert default user roles
INSERT INTO user_roles (name, title, category, description, responsibilities, is_visible, is_enabled, display_order) VALUES
  ('CEO', 'Chief Executive Officer', 'Executive', 
   'The CEO is the highest-ranking executive in a company, responsible for making major corporate decisions, managing overall operations and resources, and acting as the main point of communication between the board of directors and corporate operations.',
   'Strategic planning, stakeholder management, and organizational leadership.',
   true, true, 1),
  ('CDIO', 'Chief Digital & Information Officer', 'Executive',
   'The CDIO oversees the organization''s data strategy, information systems, and digital transformation initiatives. Responsible for data governance, analytics, cybersecurity, and leveraging data as a strategic asset to drive business value.',
   'Data architecture, AI/ML implementation, information security, and digital innovation.',
   true, true, 2),
  ('Head of Sales', 'Head of Sales', 'Executive',
   'The Head of Sales leads the sales organization, responsible for revenue generation, sales strategy, team management, and customer relationship development. Drives growth through effective sales processes and market expansion.',
   'Revenue targets, sales team leadership, pipeline management, and customer acquisition.',
   true, true, 3)
ON CONFLICT (name) DO NOTHING;

-- Insert default role prompts for CEO
INSERT INTO role_prompts (role_id, title, prompt_template, category, display_order)
SELECT id, 'Strategic Analysis', 'As a CEO, analyze the strategic implications of [topic] for our organization. Consider market positioning, competitive landscape, and long-term growth opportunities.', 'strategy', 1
FROM user_roles WHERE name = 'CEO'
ON CONFLICT DO NOTHING;

INSERT INTO role_prompts (role_id, title, prompt_template, category, display_order)
SELECT id, 'Board Presentation', 'Help me prepare a board presentation on [topic]. Include key metrics, strategic initiatives, and risk assessment.', 'general', 2
FROM user_roles WHERE name = 'CEO'
ON CONFLICT DO NOTHING;

INSERT INTO role_prompts (role_id, title, prompt_template, category, display_order)
SELECT id, 'M&A Evaluation', 'Evaluate the potential acquisition of [company/asset]. Analyze synergies, integration challenges, and strategic fit.', 'analysis', 3
FROM user_roles WHERE name = 'CEO'
ON CONFLICT DO NOTHING;

-- Insert default role prompts for CDIO
INSERT INTO role_prompts (role_id, title, prompt_template, category, display_order)
SELECT id, 'Digital Transformation', 'Develop a digital transformation roadmap for [area]. Include technology stack recommendations, timeline, and success metrics.', 'strategy', 1
FROM user_roles WHERE name = 'CDIO'
ON CONFLICT DO NOTHING;

INSERT INTO role_prompts (role_id, title, prompt_template, category, display_order)
SELECT id, 'Data Strategy', 'Create a comprehensive data strategy for [objective]. Address data governance, analytics capabilities, and AI/ML opportunities.', 'strategy', 2
FROM user_roles WHERE name = 'CDIO'
ON CONFLICT DO NOTHING;

INSERT INTO role_prompts (role_id, title, prompt_template, category, display_order)
SELECT id, 'Security Assessment', 'Conduct a cybersecurity assessment for [system/process]. Identify vulnerabilities and recommend mitigation strategies.', 'analysis', 3
FROM user_roles WHERE name = 'CDIO'
ON CONFLICT DO NOTHING;

-- Insert default role prompts for Head of Sales
INSERT INTO role_prompts (role_id, title, prompt_template, category, display_order)
SELECT id, 'Sales Strategy', 'Develop a sales strategy for [market/product]. Include target segments, pricing approach, and go-to-market tactics.', 'strategy', 1
FROM user_roles WHERE name = 'Head of Sales'
ON CONFLICT DO NOTHING;

INSERT INTO role_prompts (role_id, title, prompt_template, category, display_order)
SELECT id, 'Pipeline Analysis', 'Analyze our sales pipeline for [quarter/region]. Identify bottlenecks, conversion opportunities, and forecast accuracy.', 'analysis', 2
FROM user_roles WHERE name = 'Head of Sales'
ON CONFLICT DO NOTHING;

INSERT INTO role_prompts (role_id, title, prompt_template, category, display_order)
SELECT id, 'Competitive Positioning', 'Compare our offering against [competitor] for [customer segment]. Highlight differentiators and objection handling.', 'analysis', 3
FROM user_roles WHERE name = 'Head of Sales'
ON CONFLICT DO NOTHING;

-- Row Level Security
ALTER TABLE mode_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_prompts ENABLE ROW LEVEL SECURITY;

-- Everyone can read (for frontend)
CREATE POLICY "Anyone can read mode_options" ON mode_options FOR SELECT USING (true);
CREATE POLICY "Anyone can read user_roles" ON user_roles FOR SELECT USING (true);
CREATE POLICY "Anyone can read role_prompts" ON role_prompts FOR SELECT USING (true);

-- Only admins can modify (check admin role in profiles table)
CREATE POLICY "Admins can modify mode_options" ON mode_options 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can modify user_roles" ON user_roles 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can modify role_prompts" ON role_prompts 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_mode_options_visible ON mode_options(is_visible, display_order);
CREATE INDEX IF NOT EXISTS idx_user_roles_visible ON user_roles(is_visible, display_order);
CREATE INDEX IF NOT EXISTS idx_role_prompts_role ON role_prompts(role_id, is_visible, display_order);

-- Updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_mode_options_updated_at ON mode_options;
CREATE TRIGGER update_mode_options_updated_at
  BEFORE UPDATE ON mode_options
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_roles_updated_at ON user_roles;
CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_role_prompts_updated_at ON role_prompts;
CREATE TRIGGER update_role_prompts_updated_at
  BEFORE UPDATE ON role_prompts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
