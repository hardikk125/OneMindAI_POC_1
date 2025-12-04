-- =============================================================================
-- Add Additional Executive Roles
-- =============================================================================

-- Insert additional executive roles
INSERT INTO user_roles (name, title, category, description, responsibilities, is_visible, is_enabled, display_order) VALUES
  ('CFO', 'Chief Financial Officer', 'Executive',
   'The CFO manages the financial actions of a company, including financial planning, risk management, record-keeping, and financial reporting. They analyze the company''s financial strengths and weaknesses and propose corrective actions.',
   'Financial strategy, budgeting, investor relations, and compliance.',
   true, true, 2),
  ('COO', 'Chief Operating Officer', 'Executive',
   'The COO oversees the day-to-day administrative and operational functions of a business. They ensure that business operations are efficient and effective and that proper management of resources, distribution of goods and services to customers is achieved.',
   'Operations management, process optimization, and organizational efficiency.',
   true, true, 3),
  ('CTO', 'Chief Technology Officer', 'Executive',
   'The CTO is responsible for overseeing the development and dissemination of technology for external customers, vendors, and other clients to help improve and increase business. They also manage the physical and personnel technology infrastructure.',
   'Technology strategy, R&D, product development, and technical architecture.',
   true, true, 4),
  ('CMO', 'Chief Marketing Officer', 'Executive',
   'The CMO is responsible for developing and implementing marketing strategies to drive brand awareness, customer acquisition, and revenue growth. They oversee all marketing activities including advertising, branding, and market research.',
   'Brand strategy, marketing campaigns, customer acquisition, and market research.',
   true, true, 5),
  ('CHRO', 'Chief Human Resources Officer', 'Executive',
   'The CHRO oversees all human resource management and labor relations policies, practices, and operations. They are responsible for developing and executing human resource strategy in support of the overall business plan.',
   'Talent acquisition, employee development, culture, and HR strategy.',
   true, true, 6),
  ('CSO', 'Chief Strategy Officer', 'Executive',
   'The CSO is responsible for developing and implementing strategic initiatives to drive business growth. They work closely with the CEO to formulate corporate strategy and ensure alignment across all business units.',
   'Corporate strategy, M&A, business development, and competitive analysis.',
   true, true, 8),
  ('CLO', 'Chief Legal Officer', 'Executive',
   'The CLO oversees all legal matters and ensures the company operates within the law. They manage legal risks, handle corporate governance, and provide legal counsel to the executive team and board of directors.',
   'Legal strategy, compliance, contracts, and risk management.',
   true, true, 9),
  ('CRO', 'Chief Revenue Officer', 'Executive',
   'The CRO is responsible for all revenue generation processes across sales, marketing, and customer success. They align all revenue-related functions to maximize growth and ensure sustainable business performance.',
   'Revenue strategy, sales operations, customer retention, and growth.',
   true, true, 10),
  ('CPO', 'Chief Product Officer', 'Executive',
   'The CPO leads all product-related activities, from ideation to launch and lifecycle management. They define the product vision, strategy, and roadmap while ensuring products meet customer needs and business objectives.',
   'Product strategy, roadmap, user experience, and product-market fit.',
   true, true, 11)
ON CONFLICT (name) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  responsibilities = EXCLUDED.responsibilities,
  display_order = EXCLUDED.display_order;

-- Update display order for existing roles
UPDATE user_roles SET display_order = 1 WHERE name = 'CEO';
UPDATE user_roles SET display_order = 7 WHERE name = 'CDIO';
UPDATE user_roles SET display_order = 12 WHERE name = 'Head of Sales';
