/**
 * Step Wireframe Component
 * 
 * Visual wireframe representation of OneMind AI steps
 * Shows actual UI layout with interactive button positions
 * Includes Supabase config, API calls, and live file watching
 */

import { useState, useEffect, useCallback } from 'react';
import { HelpIcon } from './ui/help-icon';

// WebSocket URL for live updates
const WS_URL = 'ws://localhost:4000';

interface ApiCallInfo {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  description: string;
  requestBody?: string;
  responseType?: string;
}

interface SupabaseConfig {
  table: string;
  columns: string[];
  realtime: boolean;
  description: string;
}

interface ButtonInfo {
  id: string;
  label: string;
  position: { x: number; y: number; width: number; height: number };
  functional: boolean;
  action: string;
  apiCall?: ApiCallInfo;
  stateChanges?: string[];
  supabaseConfig?: SupabaseConfig;
  sourceFile?: string;
  sourceLine?: number;
}

interface WireframeStep {
  step: number;
  title: string;
  description: string;
  layout: 'full' | 'split' | 'grid';
  sections: WireframeSection[];
  buttons: ButtonInfo[];
  supabaseTables: SupabaseConfig[];
  apiEndpoints: ApiCallInfo[];
  sourceFiles: string[];
}

interface WireframeSection {
  id: string;
  name: string;
  type: 'header' | 'carousel' | 'panel' | 'grid' | 'form' | 'footer' | 'sidebar';
  position: { x: number; y: number; width: number; height: number };
  children?: WireframeSection[];
}

interface FileChange {
  file: string;
  timestamp: string;
  type: 'source' | 'config' | 'analysis';
}

// Change categories for different layers
type ChangeLayer = 'ui' | 'component' | 'api' | 'supabase' | 'state' | 'config';

interface UIChangeRecord {
  id: string;
  timestamp: string;
  file: string;
  step: number;
  layer: ChangeLayer;  // Which layer was affected
  changeType: 'button_added' | 'button_removed' | 'button_modified' | 'api_added' | 'api_removed' | 'supabase_added' | 'supabase_removed' | 'state_changed' | 'hook_modified' | 'function_modified' | 'query_modified' | 'rpc_modified';
  elementId: string;
  elementLabel: string;
  previousValue?: string;
  newValue?: string;
  diff?: {
    added: string[];
    removed: string[];
    modified: string[];
  };
  // Enhanced change details
  summary?: string;           // Human-readable summary of the change
  reason?: string;            // Why this change was made (inferred or LLM-generated)
  impact?: 'high' | 'medium' | 'low';  // Impact level
  codeChanges?: {
    linesBefore?: number;
    linesAfter?: number;
    functionAffected?: string;
    stateVariables?: string[];
    apiEndpoints?: string[];
    supabaseTables?: string[];
    hooksAffected?: string[];
    rpcFunctions?: string[];
  };
  relatedChanges?: string[];  // IDs of related changes
  llmAnalysis?: {             // Optional LLM-powered analysis
    necessity: 'required' | 'optional' | 'refactor';
    riskAssessment: string;
    suggestedTests: string[];
    breakingChanges: boolean;
  };
}

interface UISnapshot {
  timestamp: string;
  step: number;
  buttons: ButtonInfo[];
  apiEndpoints: ApiCallInfo[];
  supabaseTables: SupabaseConfig[];
}

// Step 1: Role Selection Wireframe Data
const STEP_1_WIREFRAME: WireframeStep = {
  step: 1,
  title: 'Role Selection',
  description: 'Choose your role and select focus areas with pre-built prompts',
  layout: 'full',
  sourceFiles: ['src/OneMindAI.tsx', 'src/hooks/useUIConfig.ts', 'src/components/ui/navigation-menu.tsx'],
  supabaseTables: [
    { table: 'user_roles', columns: ['id', 'name', 'title', 'description', 'category', 'is_visible', 'is_enabled'], realtime: true, description: 'Role definitions fetched via useUIConfig hook' },
    { table: 'role_prompts', columns: ['id', 'role_name', 'prompt_template', 'category'], realtime: true, description: 'Prompt templates (NOT currently used - ROLE_FOCUS_AREAS is hardcoded)' },
  ],
  apiEndpoints: [],
  sections: [
    { id: 'header', name: 'Step Header', type: 'header', position: { x: 0, y: 0, width: 100, height: 8 } },
    { id: 'carousel', name: 'Role Carousel', type: 'carousel', position: { x: 0, y: 10, width: 100, height: 20 } },
    { id: 'scroll-dots', name: 'Scroll Indicators', type: 'panel', position: { x: 35, y: 31, width: 30, height: 3 } },
    { id: 'role-details', name: 'Selected Role Details', type: 'panel', position: { x: 0, y: 36, width: 100, height: 12 } },
    { id: 'focus-areas', name: 'Focus Areas Accordion', type: 'panel', position: { x: 0, y: 50, width: 100, height: 35 } },
    { id: 'prompt-preview', name: 'Prompt Preview', type: 'sidebar', position: { x: 60, y: 50, width: 38, height: 35 } },
    { id: 'footer', name: 'Navigation Footer', type: 'footer', position: { x: 0, y: 88, width: 100, height: 10 } },
  ],
  buttons: [
    { id: 'scroll-left', label: '← Scroll Left', position: { x: 2, y: 18, width: 6, height: 6 }, functional: true, action: 'container.scrollBy({ left: -300 })', stateChanges: [], sourceFile: 'src/OneMindAI.tsx', sourceLine: 5320 },
    { id: 'scroll-right', label: 'Scroll Right →', position: { x: 92, y: 18, width: 6, height: 6 }, functional: true, action: 'container.scrollBy({ left: 300 })', stateChanges: [], sourceFile: 'src/OneMindAI.tsx', sourceLine: 5325 },
    { id: 'role-ceo', label: 'CEO', position: { x: 10, y: 14, width: 12, height: 14 }, functional: true, action: 'setSelectedRole("CEO")', stateChanges: ['selectedRole', 'selectedRoleDetails'], supabaseConfig: { table: 'user_roles', columns: ['name', 'title', 'description'], realtime: true, description: 'Role data from Supabase' }, sourceFile: 'src/OneMindAI.tsx', sourceLine: 5380 },
    { id: 'role-sales', label: 'Sales', position: { x: 24, y: 14, width: 12, height: 14 }, functional: true, action: 'setSelectedRole("Sales")', stateChanges: ['selectedRole', 'selectedRoleDetails'], supabaseConfig: { table: 'user_roles', columns: ['name', 'title', 'description'], realtime: true, description: 'Role data from Supabase' }, sourceFile: 'src/OneMindAI.tsx', sourceLine: 5380 },
    { id: 'role-cdio', label: 'CDIO', position: { x: 38, y: 14, width: 12, height: 14 }, functional: true, action: 'setSelectedRole("CDIO")', stateChanges: ['selectedRole', 'selectedRoleDetails'], supabaseConfig: { table: 'user_roles', columns: ['name', 'title', 'description'], realtime: true, description: 'Role data from Supabase' }, sourceFile: 'src/OneMindAI.tsx', sourceLine: 5380 },
    { id: 'role-cfo', label: 'CFO', position: { x: 52, y: 14, width: 12, height: 14 }, functional: true, action: 'setSelectedRole("CFO")', stateChanges: ['selectedRole', 'selectedRoleDetails'], sourceFile: 'src/OneMindAI.tsx', sourceLine: 5380 },
    { id: 'role-cto', label: 'CTO', position: { x: 66, y: 14, width: 12, height: 14 }, functional: true, action: 'setSelectedRole("CTO")', stateChanges: ['selectedRole', 'selectedRoleDetails'], sourceFile: 'src/OneMindAI.tsx', sourceLine: 5380 },
    { id: 'add-role', label: '+ Add Role', position: { x: 80, y: 14, width: 10, height: 14 }, functional: false, action: 'alert("Coming soon!")', stateChanges: [], sourceFile: 'src/OneMindAI.tsx', sourceLine: 5395 },
    { id: 'change-role', label: 'Change Role', position: { x: 82, y: 38, width: 15, height: 4 }, functional: true, action: 'clearRoleSelection()', stateChanges: ['selectedRole', 'selectedRoleDetails', 'selectedFocusArea', 'selectedPromptPreview'], sourceFile: 'src/OneMindAI.tsx', sourceLine: 5450 },
    { id: 'focus-a', label: 'A. Strategic Vision', position: { x: 2, y: 52, width: 55, height: 6 }, functional: true, action: 'setSelectedFocusArea({id, title})', stateChanges: ['selectedFocusArea'], sourceFile: 'src/OneMindAI.tsx', sourceLine: 5520 },
    { id: 'focus-b', label: 'B. Leadership & Culture', position: { x: 2, y: 60, width: 55, height: 6 }, functional: true, action: 'setSelectedFocusArea({id, title})', stateChanges: ['selectedFocusArea'], sourceFile: 'src/OneMindAI.tsx', sourceLine: 5520 },
    { id: 'focus-c', label: 'C. Stakeholder Mgmt', position: { x: 2, y: 68, width: 55, height: 6 }, functional: true, action: 'setSelectedFocusArea({id, title})', stateChanges: ['selectedFocusArea'], sourceFile: 'src/OneMindAI.tsx', sourceLine: 5520 },
    { id: 'prompt-a1', label: 'A1. Growth Strategy', position: { x: 6, y: 58, width: 25, height: 4 }, functional: true, action: 'setSelectedPromptPreview({...})', stateChanges: ['selectedPromptPreview'], sourceFile: 'src/OneMindAI.tsx', sourceLine: 5580 },
    { id: 'use-prompt', label: 'Use This Prompt', position: { x: 70, y: 78, width: 20, height: 5 }, functional: true, action: 'setPrompt(template); setStoryStep(2)', stateChanges: ['prompt', 'storyStep'], sourceFile: 'src/OneMindAI.tsx', sourceLine: 5620 },
    { id: 'custom-prompt', label: 'Option 2: Custom Prompt', position: { x: 30, y: 92, width: 40, height: 5 }, functional: true, action: 'setPrompt(""); setStoryStep(2)', stateChanges: ['prompt', 'storyStep'], sourceFile: 'src/OneMindAI.tsx', sourceLine: 5660 },
  ]
};

// Step 3: Engine Selection Wireframe Data
const STEP_3_WIREFRAME: WireframeStep = {
  step: 3,
  title: 'Engine Selection',
  description: 'Choose AI engines, configure versions, and review costs',
  layout: 'grid',
  sourceFiles: ['src/OneMindAI.tsx', 'server/ai-proxy.cjs'],
  supabaseTables: [
    { table: 'engine_ui_config', columns: ['showApiKeyField', 'showOutputPolicyField', 'showPriceOverrideFields', 'infoDisplayMode'], realtime: false, description: 'Admin-controlled UI visibility settings' },
    { table: 'credits', columns: ['user_id', 'balance', 'total_used'], realtime: true, description: 'User credit balance (used after API calls)' },
    { table: 'credit_transactions', columns: ['user_id', 'amount', 'provider', 'model', 'tokens'], realtime: false, description: 'Transaction log for credit deductions' },
  ],
  apiEndpoints: [
    { method: 'GET', endpoint: '/api/{provider}/balance', description: 'Fetch API balance from provider', responseType: '{ balance: string }' },
    { method: 'POST', endpoint: '/api/openai', description: 'OpenAI ChatGPT API', requestBody: '{ model, messages, max_tokens }', responseType: 'Stream<ChatCompletion>' },
    { method: 'POST', endpoint: '/api/anthropic', description: 'Anthropic Claude API', requestBody: '{ model, messages, max_tokens }', responseType: 'Stream<Message>' },
    { method: 'POST', endpoint: '/api/gemini', description: 'Google Gemini API', requestBody: '{ model, contents }', responseType: 'Stream<GenerateContent>' },
    { method: 'POST', endpoint: '/api/deepseek', description: 'DeepSeek API', requestBody: '{ model, messages }', responseType: 'Stream<ChatCompletion>' },
    { method: 'POST', endpoint: '/api/mistral', description: 'Mistral API', requestBody: '{ model, messages }', responseType: 'Stream<ChatCompletion>' },
  ],
  sections: [
    { id: 'header', name: 'Step Header + Toggle', type: 'header', position: { x: 0, y: 0, width: 100, height: 10 } },
    { id: 'engine-grid', name: 'Engine Grid (2 columns)', type: 'grid', position: { x: 0, y: 12, width: 65, height: 60 } },
    { id: 'cost-calc', name: 'Cost Calculator', type: 'sidebar', position: { x: 67, y: 12, width: 33, height: 30 } },
    { id: 'summary', name: 'Selection Summary', type: 'panel', position: { x: 67, y: 44, width: 33, height: 28 } },
    { id: 'footer', name: 'Navigation Footer', type: 'footer', position: { x: 0, y: 88, width: 100, height: 10 } },
  ],
  buttons: [
    { id: 'choose-engines', label: 'Choose your AI engines', position: { x: 5, y: 3, width: 25, height: 5 }, functional: true, action: 'setShowRecommendedDropdown(false)', stateChanges: ['showRecommendedDropdown'], sourceFile: 'src/OneMindAI.tsx', sourceLine: 5780 },
    { id: 'run-recommended', label: 'Run recommended engines', position: { x: 35, y: 3, width: 28, height: 5 }, functional: true, action: 'autoSelectRecommended()', stateChanges: ['selected', 'showRecommendedDropdown'], sourceFile: 'src/OneMindAI.tsx', sourceLine: 5790 },
    { id: 'engine-chatgpt', label: '✓ ChatGPT', position: { x: 2, y: 14, width: 30, height: 8 }, functional: true, action: 'toggleEngine("openai")', stateChanges: ['selected'], sourceFile: 'src/OneMindAI.tsx', sourceLine: 5850 },
    { id: 'engine-claude', label: '○ Claude', position: { x: 34, y: 14, width: 30, height: 8 }, functional: true, action: 'toggleEngine("claude")', stateChanges: ['selected'], sourceFile: 'src/OneMindAI.tsx', sourceLine: 5850 },
    { id: 'engine-gemini', label: '○ Gemini', position: { x: 2, y: 24, width: 30, height: 8 }, functional: true, action: 'toggleEngine("gemini")', stateChanges: ['selected'], sourceFile: 'src/OneMindAI.tsx', sourceLine: 5850 },
    { id: 'engine-deepseek', label: '✓ DeepSeek', position: { x: 34, y: 24, width: 30, height: 8 }, functional: true, action: 'toggleEngine("deepseek")', stateChanges: ['selected'], sourceFile: 'src/OneMindAI.tsx', sourceLine: 5850 },
    { id: 'engine-mistral', label: '✓ Mistral', position: { x: 2, y: 34, width: 30, height: 8 }, functional: true, action: 'toggleEngine("mistral")', stateChanges: ['selected'], sourceFile: 'src/OneMindAI.tsx', sourceLine: 5850 },
    { id: 'engine-perplexity', label: '○ Perplexity', position: { x: 34, y: 34, width: 30, height: 8 }, functional: true, action: 'toggleEngine("perplexity")', stateChanges: ['selected'], sourceFile: 'src/OneMindAI.tsx', sourceLine: 5850 },
    { id: 'engine-grok', label: '○ Grok', position: { x: 2, y: 44, width: 30, height: 8 }, functional: true, action: 'toggleEngine("grok")', stateChanges: ['selected'], sourceFile: 'src/OneMindAI.tsx', sourceLine: 5850 },
    { id: 'engine-llama', label: '○ Llama', position: { x: 34, y: 44, width: 30, height: 8 }, functional: true, action: 'toggleEngine("llama")', stateChanges: ['selected'], sourceFile: 'src/OneMindAI.tsx', sourceLine: 5850 },
    { id: 'engine-cohere', label: '○ Cohere', position: { x: 2, y: 54, width: 30, height: 8 }, functional: true, action: 'toggleEngine("cohere")', stateChanges: ['selected'], sourceFile: 'src/OneMindAI.tsx', sourceLine: 5850 },
    { id: 'version-dropdown', label: 'Version: gpt-4.1 ▼', position: { x: 4, y: 64, width: 25, height: 4 }, functional: true, action: 'updateVersion(id, version)', stateChanges: ['engines[].selectedVersion'], supabaseConfig: { table: 'engine_ui_config', columns: ['showVersionField'], realtime: false, description: 'Visibility controlled by admin' }, sourceFile: 'src/OneMindAI.tsx', sourceLine: 5920 },
    { id: 'api-key-input', label: 'API Key: ••••••', position: { x: 4, y: 69, width: 20, height: 4 }, functional: true, action: 'updateApiKey(id, value)', stateChanges: ['engines[].apiKey'], supabaseConfig: { table: 'engine_ui_config', columns: ['showApiKeyField'], realtime: false, description: 'Visibility controlled by admin' }, sourceFile: 'src/OneMindAI.tsx', sourceLine: 5940 },
    { id: 'show-key', label: '👁️', position: { x: 25, y: 69, width: 4, height: 4 }, functional: true, action: 'setShowApiKey(!show)', stateChanges: ['showApiKey'], sourceFile: 'src/OneMindAI.tsx', sourceLine: 5950 },
    { id: 'fetch-balance', label: '💰', position: { x: 30, y: 69, width: 4, height: 4 }, functional: true, action: 'fetchBalance(engine)', apiCall: { method: 'GET', endpoint: '/api/{provider}/balance', description: 'Fetch balance from AI provider' }, stateChanges: ['apiBalances'], sourceFile: 'src/OneMindAI.tsx', sourceLine: 5960 },
    { id: 'breakdown-toggle', label: 'Breakdown ▼', position: { x: 69, y: 35, width: 15, height: 4 }, functional: true, action: 'toggleBreakdown()', stateChanges: ['showBreakdown'], sourceFile: 'src/OneMindAI.tsx', sourceLine: 6000 },
    { id: 'manage-balances', label: 'Manage Balances', position: { x: 85, y: 35, width: 13, height: 4 }, functional: true, action: 'setShowBalanceManager(true)', stateChanges: ['showBalanceManager'], sourceFile: 'src/OneMindAI.tsx', sourceLine: 6010 },
    { id: 'back-btn', label: '← Back', position: { x: 5, y: 92, width: 15, height: 5 }, functional: true, action: 'setStoryStep(2)', stateChanges: ['storyStep'], sourceFile: 'src/OneMindAI.tsx', sourceLine: 6100 },
    { id: 'run-engines', label: 'Run Engines →', position: { x: 75, y: 92, width: 20, height: 5 }, functional: true, action: 'setStoryStep(4); runAll()', apiCall: { method: 'POST', endpoint: '/api/{provider}', description: 'Send prompt to selected AI engines', requestBody: '{ model, messages, max_tokens, stream: true }' }, stateChanges: ['storyStep', 'results', 'isRunning'], sourceFile: 'src/OneMindAI.tsx', sourceLine: 6120 },
  ]
};

// Step 0: Company Selection Wireframe Data
const STEP_0_WIREFRAME: WireframeStep = {
  step: 0,
  title: 'Company Selection',
  description: 'Select your company to personalize the AI experience',
  layout: 'full',
  sourceFiles: ['src/OneMindAI.tsx', 'src/components/CompanyBanner.tsx'],
  supabaseTables: [],
  apiEndpoints: [],
  sections: [
    { id: 'header', name: 'Step Header', type: 'header', position: { x: 0, y: 0, width: 100, height: 10 } },
    { id: 'search-bar', name: 'Company Search', type: 'form', position: { x: 20, y: 12, width: 60, height: 6 } },
    { id: 'layout-toggle', name: 'Layout Toggle', type: 'panel', position: { x: 85, y: 12, width: 12, height: 6 } },
    { id: 'company-grid', name: 'Company Grid', type: 'grid', position: { x: 5, y: 22, width: 90, height: 55 } },
    { id: 'footer', name: 'Navigation Footer', type: 'footer', position: { x: 0, y: 85, width: 100, height: 12 } },
  ],
  buttons: [
    { id: 'search-toggle', label: '🔍 Search', position: { x: 22, y: 13, width: 10, height: 4 }, functional: true, action: 'setShowCompanySearch(!show)', stateChanges: ['showCompanySearch'], sourceFile: 'src/OneMindAI.tsx', sourceLine: 5215 },
    { id: 'search-input', label: 'Search companies...', position: { x: 34, y: 13, width: 44, height: 4 }, functional: true, action: 'setCompanySearchQuery(value)', stateChanges: ['companySearchQuery'], sourceFile: 'src/OneMindAI.tsx', sourceLine: 5220 },
    { id: 'layout-grid', label: '⊞', position: { x: 86, y: 13, width: 4, height: 4 }, functional: true, action: 'setCompanyLayout("grid")', stateChanges: ['companyLayout'], sourceFile: 'src/OneMindAI.tsx', sourceLine: 5230 },
    { id: 'layout-list', label: '☰', position: { x: 91, y: 13, width: 4, height: 4 }, functional: true, action: 'setCompanyLayout("list")', stateChanges: ['companyLayout'], sourceFile: 'src/OneMindAI.tsx', sourceLine: 5235 },
    { id: 'company-hcl', label: 'HCL Tech', position: { x: 7, y: 25, width: 18, height: 15 }, functional: true, action: 'setSelectedCompany(company)', stateChanges: ['selectedCompany'], sourceFile: 'src/components/CompanyBanner.tsx', sourceLine: 45 },
    { id: 'company-wesco', label: 'Wesco', position: { x: 28, y: 25, width: 18, height: 15 }, functional: true, action: 'setSelectedCompany(company)', stateChanges: ['selectedCompany'], sourceFile: 'src/components/CompanyBanner.tsx', sourceLine: 45 },
    { id: 'company-tcs', label: 'TCS', position: { x: 49, y: 25, width: 18, height: 15 }, functional: true, action: 'setSelectedCompany(company)', stateChanges: ['selectedCompany'], sourceFile: 'src/components/CompanyBanner.tsx', sourceLine: 45 },
    { id: 'company-infosys', label: 'Infosys', position: { x: 70, y: 25, width: 18, height: 15 }, functional: true, action: 'setSelectedCompany(company)', stateChanges: ['selectedCompany'], sourceFile: 'src/components/CompanyBanner.tsx', sourceLine: 45 },
    { id: 'company-wipro', label: 'Wipro', position: { x: 7, y: 43, width: 18, height: 15 }, functional: true, action: 'setSelectedCompany(company)', stateChanges: ['selectedCompany'], sourceFile: 'src/components/CompanyBanner.tsx', sourceLine: 45 },
    { id: 'company-accenture', label: 'Accenture', position: { x: 28, y: 43, width: 18, height: 15 }, functional: true, action: 'setSelectedCompany(company)', stateChanges: ['selectedCompany'], sourceFile: 'src/components/CompanyBanner.tsx', sourceLine: 45 },
    { id: 'company-ibm', label: 'IBM', position: { x: 49, y: 43, width: 18, height: 15 }, functional: true, action: 'setSelectedCompany(company)', stateChanges: ['selectedCompany'], sourceFile: 'src/components/CompanyBanner.tsx', sourceLine: 45 },
    { id: 'company-cognizant', label: 'Cognizant', position: { x: 70, y: 43, width: 18, height: 15 }, functional: true, action: 'setSelectedCompany(company)', stateChanges: ['selectedCompany'], sourceFile: 'src/components/CompanyBanner.tsx', sourceLine: 45 },
    { id: 'continue-btn', label: 'Continue →', position: { x: 70, y: 89, width: 22, height: 6 }, functional: true, action: 'setStoryStep(1)', stateChanges: ['storyStep'], sourceFile: 'src/OneMindAI.tsx', sourceLine: 5300 },
  ]
};

// Step 2: Prompt Customization Wireframe Data
const STEP_2_WIREFRAME: WireframeStep = {
  step: 2,
  title: 'Prompt Customization',
  description: 'Customize your prompt and upload supporting files',
  layout: 'split',
  sourceFiles: ['src/OneMindAI.tsx', 'src/components/FileUploadZone.tsx'],
  supabaseTables: [
    { table: 'mode_options', columns: ['id', 'name', 'description', 'is_enabled'], realtime: true, description: 'UI mode configuration' },
  ],
  apiEndpoints: [
    { method: 'POST', endpoint: '/api/hubspot/connect', description: 'Connect to HubSpot CRM', requestBody: '{ accessToken }', responseType: '{ success: boolean }' },
  ],
  sections: [
    { id: 'header', name: 'Step Header', type: 'header', position: { x: 0, y: 0, width: 100, height: 8 } },
    { id: 'prompt-editor', name: 'Prompt Editor', type: 'form', position: { x: 2, y: 10, width: 55, height: 50 } },
    { id: 'file-upload', name: 'File Upload Zone', type: 'panel', position: { x: 59, y: 10, width: 39, height: 30 } },
    { id: 'integrations', name: 'Integrations Panel', type: 'panel', position: { x: 59, y: 42, width: 39, height: 18 } },
    { id: 'prompt-stats', name: 'Prompt Statistics', type: 'panel', position: { x: 2, y: 62, width: 55, height: 10 } },
    { id: 'footer', name: 'Navigation Footer', type: 'footer', position: { x: 0, y: 85, width: 100, height: 12 } },
  ],
  buttons: [
    { id: 'prompt-textarea', label: 'Enter your prompt...', position: { x: 4, y: 14, width: 51, height: 40 }, functional: true, action: 'setPrompt(value)', stateChanges: ['prompt', 'promptWarning'], sourceFile: 'src/OneMindAI.tsx', sourceLine: 5670 },
    { id: 'clear-prompt', label: '✕ Clear', position: { x: 48, y: 12, width: 8, height: 3 }, functional: true, action: 'setPrompt("")', stateChanges: ['prompt'], sourceFile: 'src/OneMindAI.tsx', sourceLine: 5680 },
    { id: 'drop-zone', label: 'Drop files here or click to upload', position: { x: 61, y: 14, width: 35, height: 20 }, functional: true, action: 'handleFileUpload(files)', stateChanges: ['uploadedFiles'], sourceFile: 'src/components/FileUploadZone.tsx', sourceLine: 85 },
    { id: 'file-input', label: '📎 Browse', position: { x: 75, y: 30, width: 10, height: 4 }, functional: true, action: 'fileInputRef.click()', stateChanges: [], sourceFile: 'src/components/FileUploadZone.tsx', sourceLine: 95 },
    { id: 'hubspot-btn', label: 'HubSpot', position: { x: 61, y: 45, width: 10, height: 5 }, functional: true, action: 'connectHubSpot()', apiCall: { method: 'POST', endpoint: '/api/hubspot/connect', description: 'Connect to HubSpot CRM' }, stateChanges: ['selectedIntegrations'], sourceFile: 'src/components/FileUploadZone.tsx', sourceLine: 120 },
    { id: 'salesforce-btn', label: 'Salesforce', position: { x: 73, y: 45, width: 10, height: 5 }, functional: false, action: 'alert("Coming soon")', stateChanges: [], sourceFile: 'src/components/FileUploadZone.tsx', sourceLine: 125 },
    { id: 'slack-btn', label: 'Slack', position: { x: 85, y: 45, width: 10, height: 5 }, functional: false, action: 'alert("Coming soon")', stateChanges: [], sourceFile: 'src/components/FileUploadZone.tsx', sourceLine: 130 },
    { id: 'teams-btn', label: 'Teams', position: { x: 61, y: 52, width: 10, height: 5 }, functional: false, action: 'alert("Coming soon")', stateChanges: [], sourceFile: 'src/components/FileUploadZone.tsx', sourceLine: 135 },
    { id: 'back-btn', label: '← Back', position: { x: 5, y: 89, width: 15, height: 6 }, functional: true, action: 'setStoryStep(1)', stateChanges: ['storyStep'], sourceFile: 'src/OneMindAI.tsx', sourceLine: 5750 },
    { id: 'next-btn', label: 'Next: Select Engines →', position: { x: 60, y: 89, width: 35, height: 6 }, functional: true, action: 'setStoryStep(3)', stateChanges: ['storyStep'], sourceFile: 'src/OneMindAI.tsx', sourceLine: 5760 },
  ]
};

const ALL_WIREFRAMES = [STEP_0_WIREFRAME, STEP_1_WIREFRAME, STEP_2_WIREFRAME, STEP_3_WIREFRAME];

interface StepWireframeProps {
  initialStep?: number;
}

export function StepWireframe({ initialStep = 0 }: StepWireframeProps) {
  const [selectedStep, setSelectedStep] = useState(initialStep);
  const [hoveredButton, setHoveredButton] = useState<ButtonInfo | null>(null);
  const [selectedButton, setSelectedButton] = useState<ButtonInfo | null>(null);
  const [showSections, setShowSections] = useState(true);
  const [showButtons, setShowButtons] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [fileChanges, setFileChanges] = useState<FileChange[]>([]);
  const [showSupabase, setShowSupabase] = useState(true);
  const [showApiEndpoints, setShowApiEndpoints] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [uiHistory, setUiHistory] = useState<UIChangeRecord[]>([]);
  const [snapshots, setSnapshots] = useState<UISnapshot[]>([]);
  const [liveWireframes, setLiveWireframes] = useState<WireframeStep[]>(ALL_WIREFRAMES);
  const [isLiveMode, setIsLiveMode] = useState(true);

  const wireframe = liveWireframes[selectedStep];
  const [useLLMAnalysis, setUseLLMAnalysis] = useState(false);
  const [changeSummary, setChangeSummary] = useState<string>('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  // Generate LLM summary of recent changes
  const generateLLMSummary = useCallback(async (count: number = 5) => {
    if (uiHistory.length === 0) {
      setChangeSummary('No changes to summarize.');
      return;
    }
    
    setIsGeneratingSummary(true);
    const recentChanges = uiHistory.slice(0, count);
    
    try {
      const response = await fetch('http://localhost:4000/api/summarize-changes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          changes: recentChanges.map(c => ({
            layer: c.layer,
            changeType: c.changeType,
            file: c.file,
            elementLabel: c.elementLabel,
            summary: c.summary,
            reason: c.reason,
            impact: c.impact,
            codeChanges: c.codeChanges,
            diff: c.diff,
          }))
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        setChangeSummary(result.summary || 'Summary generated.');
      } else {
        // Generate local summary if API fails
        const localSummary = generateLocalSummary(recentChanges);
        setChangeSummary(localSummary);
      }
    } catch {
      // Generate local summary on error
      const localSummary = generateLocalSummary(recentChanges);
      setChangeSummary(localSummary);
    }
    
    setIsGeneratingSummary(false);
  }, [uiHistory]);

  // Generate local summary without LLM
  const generateLocalSummary = (changes: UIChangeRecord[]): string => {
    const layerCounts: Record<string, number> = {};
    const impactCounts: Record<string, number> = { high: 0, medium: 0, low: 0 };
    const changeTypes: string[] = [];
    
    changes.forEach(c => {
      layerCounts[c.layer] = (layerCounts[c.layer] || 0) + 1;
      if (c.impact) impactCounts[c.impact]++;
      if (c.summary && !changeTypes.includes(c.summary)) {
        changeTypes.push(c.summary);
      }
    });
    
    const layerSummary = Object.entries(layerCounts)
      .map(([layer, count]) => `${count} ${layer}`)
      .join(', ');
    
    let summary = `📊 **Summary of ${changes.length} Recent Changes**\n\n`;
    summary += `**Layers affected:** ${layerSummary}\n\n`;
    summary += `**Impact:** ${impactCounts.high} high, ${impactCounts.medium} medium, ${impactCounts.low} low\n\n`;
    summary += `**Changes:**\n`;
    changeTypes.slice(0, 5).forEach(ct => {
      summary += `• ${ct}\n`;
    });
    
    if (impactCounts.high > 0) {
      summary += `\n⚠️ **Warning:** ${impactCounts.high} high-impact changes detected. Review carefully.`;
    }
    
    return summary;
  };

  // Generate test changes for different layers (for demonstration)
  const generateTestChanges = useCallback(() => {
    const testChanges: UIChangeRecord[] = [
      // UI Layer Test
      {
        id: `test-${Date.now()}-ui-button`,
        timestamp: new Date().toISOString(),
        file: 'src/components/OneMindAI.tsx',
        step: 0,
        layer: 'ui',
        changeType: 'button_removed',
        elementId: 'test-button',
        elementLabel: 'Test Button',
        previousValue: 'handleTestClick()',
        summary: 'UI Button "Test Button" was removed from the interface',
        reason: 'Button was removed to streamline the user interface.',
        impact: 'low',
        codeChanges: {
          functionAffected: 'handleTestClick',
          stateVariables: ['testState'],
        },
        diff: {
          added: [],
          removed: ['Test Button'],
          modified: []
        }
      },
      
      // Component Layer Test
      {
        id: `test-${Date.now()}-component-hook`,
        timestamp: new Date().toISOString(),
        file: 'src/hooks/useUIConfig.ts',
        step: 1,
        layer: 'component',
        changeType: 'hook_modified',
        elementId: 'useUIConfig',
        elementLabel: 'useUIConfig Hook',
        previousValue: 'old logic',
        newValue: 'new logic',
        summary: 'Component hook "useUIConfig" was modified',
        reason: 'Hook behavior changed to improve performance.',
        impact: 'medium',
        codeChanges: {
          functionAffected: 'useUIConfig',
          hooksAffected: ['useEffect', 'useState'],
          stateVariables: ['selectedRole', 'uiConfig'],
        },
        diff: {
          added: [],
          removed: [],
          modified: ['useUIConfig logic updated']
        }
      },
      
      // API Layer Test
      {
        id: `test-${Date.now()}-api-endpoint`,
        timestamp: new Date().toISOString(),
        file: 'server/ai-proxy.cjs',
        step: 2,
        layer: 'api',
        changeType: 'api_added',
        elementId: '/api/new-endpoint',
        elementLabel: 'POST /api/new-endpoint',
        newValue: 'New AI analysis endpoint',
        summary: 'New API endpoint was added',
        reason: 'Backend integration expanded with new endpoint.',
        impact: 'high',
        codeChanges: {
          functionAffected: 'handleNewEndpoint',
          apiEndpoints: ['/api/new-endpoint'],
        },
        diff: {
          added: ['POST /api/new-endpoint'],
          removed: [],
          modified: []
        }
      },
      
      // Supabase Layer Test
      {
        id: `test-${Date.now()}-supabase-query`,
        timestamp: new Date().toISOString(),
        file: 'src/lib/supabase/credit-service.ts',
        step: 3,
        layer: 'supabase',
        changeType: 'query_modified',
        elementId: 'credit-deduction',
        elementLabel: 'Credit Deduction Query',
        previousValue: 'old query',
        newValue: 'optimized query',
        summary: 'Supabase query "Credit Deduction" was modified',
        reason: 'Query optimized for better performance and atomic operations.',
        impact: 'high',
        codeChanges: {
          functionAffected: 'deductCredits',
          supabaseTables: ['credits', 'credit_transactions'],
          rpcFunctions: ['deduct_credits_rpc'],
        },
        diff: {
          added: [],
          removed: [],
          modified: ['Credit deduction query optimized']
        }
      },
      
      // State Layer Test
      {
        id: `test-${Date.now()}-state-hook`,
        timestamp: new Date().toISOString(),
        file: 'src/hooks/useAuth.ts',
        step: 4,
        layer: 'state',
        changeType: 'hook_modified',
        elementId: 'useAuth',
        elementLabel: 'useAuth Hook',
        previousValue: 'basic auth',
        newValue: 'enhanced auth with credits',
        summary: 'State hook "useAuth" was modified',
        reason: 'Enhanced authentication with credit tracking integration.',
        impact: 'medium',
        codeChanges: {
          functionAffected: 'useAuth',
          hooksAffected: ['useContext', 'useEffect'],
          stateVariables: ['user', 'credits', 'isAuthenticated'],
        },
        diff: {
          added: ['credit tracking'],
          removed: [],
          modified: ['useAuth hook enhanced']
        }
      },
      
      // Config Layer Test
      {
        id: `test-${Date.now()}-config-env`,
        timestamp: new Date().toISOString(),
        file: '.env.example',
        step: 5,
        layer: 'config',
        changeType: 'state_changed',
        elementId: 'env-config',
        elementLabel: 'Environment Configuration',
        previousValue: 'old config',
        newValue: 'updated config',
        summary: 'Configuration file ".env.example" was modified',
        reason: 'Environment variables updated for new features.',
        impact: 'medium',
        codeChanges: {
          functionAffected: 'config loader',
        },
        diff: {
          added: ['NEW_API_KEY'],
          removed: ['OLD_API_KEY'],
          modified: ['Environment variables']
        }
      }
    ];
    
    setUiHistory(prev => [...testChanges, ...prev]);
  }, []);

  // Call LLM to analyze a code change (optional, requires backend)
  // TODO: Integrate with WebSocket handler for real-time LLM analysis
  const analyzewithLLM = useCallback(async (
    change: UIChangeRecord,
    sourceCode: string
  ): Promise<UIChangeRecord['llmAnalysis'] | undefined> => {
    if (!useLLMAnalysis) return undefined;
    
    try {
      const response = await fetch('http://localhost:4000/api/analyze-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          changeType: change.changeType,
          layer: change.layer,
          elementLabel: change.elementLabel,
          file: change.file,
          diff: change.diff,
          sourceSnippet: sourceCode.slice(0, 2000), // Limit context
        })
      });
      
      if (!response.ok) return undefined;
      
      const result = await response.json();
      return {
        necessity: result.necessity || 'optional',
        riskAssessment: result.riskAssessment || 'Unknown risk level',
        suggestedTests: result.suggestedTests || [],
        breakingChanges: result.breakingChanges || false,
      };
    } catch (error) {
      console.error('[StepWireframe] LLM analysis failed:', error);
      return undefined;
    }
  }, [useLLMAnalysis]);

  // Generate detailed change summary with reason and impact analysis
  const generateChangeSummary = useCallback((
    changeType: UIChangeRecord['changeType'],
    elementLabel: string,
    file: string,
    oldButton?: ButtonInfo,
    newButton?: ButtonInfo
  ): { summary: string; reason: string; impact: 'high' | 'medium' | 'low'; codeChanges: UIChangeRecord['codeChanges'] } => {
    const fileName = file.split('/').pop() || file;
    
    // Enhanced layer-specific analysis
    // TODO: Use this layer detection for enhanced impact analysis
    const layer = file.includes('supabase') || file.includes('credit-service') ? 'supabase' :
      file.includes('api') || file.includes('proxy') || file.includes('server') ? 'api' :
      file.includes('hook') || file.includes('use') ? 'state' :
      file.includes('config') || file.includes('.env') ? 'config' :
      file.includes('component') || file.includes('tsx') ? 'component' :
      'ui';
    
    switch (changeType) {
      case 'button_removed':
        return {
          summary: `UI Button "${elementLabel}" was removed from the interface`,
          reason: oldButton?.apiCall 
            ? `This button had an API call to ${oldButton.apiCall.endpoint}. Removal may affect backend integration.`
            : oldButton?.stateChanges?.length 
              ? `This button modified state: ${oldButton.stateChanges.join(', ')}. Removal simplifies UI flow.`
              : `Button was removed to streamline the user interface.`,
          impact: oldButton?.apiCall ? 'high' : oldButton?.stateChanges?.length ? 'medium' : 'low',
          codeChanges: {
            functionAffected: oldButton?.action,
            stateVariables: oldButton?.stateChanges,
            apiEndpoints: oldButton?.apiCall ? [oldButton.apiCall.endpoint] : [],
            supabaseTables: oldButton?.supabaseConfig ? [oldButton.supabaseConfig.table] : [],
          }
        };
      
      case 'button_added':
        return {
          summary: `New UI Button "${elementLabel}" was added to the interface`,
          reason: newButton?.apiCall 
            ? `This button connects to API endpoint ${newButton.apiCall.endpoint}. Adds new functionality.`
            : newButton?.stateChanges?.length 
              ? `This button will modify state: ${newButton.stateChanges.join(', ')}. Enhances user interaction.`
              : `Button was added to improve user experience.`,
          impact: newButton?.apiCall ? 'high' : newButton?.stateChanges?.length ? 'medium' : 'low',
          codeChanges: {
            functionAffected: newButton?.action,
            stateVariables: newButton?.stateChanges,
            apiEndpoints: newButton?.apiCall ? [newButton.apiCall.endpoint] : [],
            supabaseTables: newButton?.supabaseConfig ? [newButton.supabaseConfig.table] : [],
          }
        };
      
      case 'button_modified':
        return {
          summary: `UI Button "${elementLabel}" was modified`,
          reason: `Button behavior changed from "${oldButton?.action}" to "${newButton?.action}".`,
          impact: 'medium',
          codeChanges: {
            functionAffected: newButton?.action,
            stateVariables: [...(oldButton?.stateChanges || []), ...(newButton?.stateChanges || [])].filter((v, i, a) => a.indexOf(v) === i),
          }
        };
      
      case 'api_added':
        return {
          summary: `New API endpoint was added`,
          reason: `Backend integration expanded with new endpoint.`,
          impact: 'high',
          codeChanges: { apiEndpoints: [elementLabel] }
        };
      
      case 'api_removed':
        return {
          summary: `API endpoint was removed`,
          reason: `Backend integration reduced. Ensure no orphaned calls exist.`,
          impact: 'high',
          codeChanges: { apiEndpoints: [elementLabel] }
        };
      
      case 'state_changed':
        return {
          summary: `File "${fileName}" was modified`,
          reason: `Code changes detected in ${fileName}. Review for UI impact.`,
          impact: 'low',
          codeChanges: {}
        };
      
      default:
        return {
          summary: `Change detected in ${fileName}`,
          reason: 'Unknown change type',
          impact: 'low',
          codeChanges: {}
        };
    }
  }, []);

  // Parse OneMind AI source files to extract actual UI elements
  const parseOneMindUI = useCallback(async (file: string): Promise<WireframeStep[]> => {
    try {
      // Fetch the actual source file from Code Guardian server
      const response = await fetch(`http://localhost:4000/api/file-content?path=${file}`);
      if (!response.ok) return ALL_WIREFRAMES;
      
      const result = await response.json();
      const sourceCode = result.content;
      
      // Parse buttons from source code
      const buttonPattern = /{\s*id:\s*['"]([^'"]+)['"]\s*,\s*label:\s*['"]([^'"]+)['"]/g;
      // Parse companies from COMPANIES array - handles multi-line objects
      const companyPattern = /{\s*id:\s*['"]([^'"]+)['"][\s\S]*?name:\s*['"]([^'"]+)['"]/g;
      // const apiPattern = /apiCall:\s*{[^}]*method:\s*['"]([^'"]+)['"][^}]*endpoint:\s*['"]([^'"]+)['"]/g; // TODO: Implement API parsing
      
      const updatedWireframes = [...ALL_WIREFRAMES];
      
      // Update Step 0 if OneMindAI.tsx changed
      if (file.includes('OneMindAI.tsx')) {
        const buttons: ButtonInfo[] = [];
        let match;
        
        // Extract buttons with their actual presence in code
        while ((match = buttonPattern.exec(sourceCode)) !== null) {
          const [, id, label] = match;
          
          // Check if button exists in the current source
          const exists = sourceCode.includes(`id: '${id}'`);
          
          if (exists) {
            buttons.push({
              id,
              label,
              position: { x: 10, y: 10, width: 10, height: 10 }, // Default position
              functional: true,
              action: `set${id.charAt(0).toUpperCase() + id.slice(1)}()`,
              stateChanges: [id],
              sourceFile: file,
            });
          }
        }
        
        // Update the wireframe with actual buttons found
        if (buttons.length > 0) {
          updatedWireframes[0] = {
            ...updatedWireframes[0],
            buttons,
            sourceFiles: [file],
          };
        }
      }
      
      // Update Step 1 if role-related files changed
      if (file.includes('useUIConfig.ts')) {
        const rolePattern = /const\s+(\w+)\s*=\s*{[^}]*name:\s*['"]([^'"]+)['"]/g;
        const roles: ButtonInfo[] = [];
        let match;
        
        while ((match = rolePattern.exec(sourceCode)) !== null) {
          const [, /*varName*/, name] = match;
          roles.push({
            id: `role-${name.toLowerCase()}`,
            label: name,
            position: { x: 10, y: 14, width: 12, height: 14 },
            functional: true,
            action: `setSelectedRole("${name}")`,
            stateChanges: ['selectedRole', 'selectedRoleDetails'],
            supabaseConfig: { 
              table: 'user_roles', 
              columns: ['name', 'title', 'description'], 
              realtime: true, 
              description: 'Role data from Supabase' 
            },
            sourceFile: file,
          });
        }
        
        if (roles.length > 0) {
          updatedWireframes[1] = {
            ...updatedWireframes[1],
            buttons: [...updatedWireframes[1].buttons.filter(b => !b.id.startsWith('role-')), ...roles],
            sourceFiles: [...new Set([...updatedWireframes[1].sourceFiles, file])],
          };
        }
      }
      
      // Update Step 0 if CompanyBanner.tsx changed (company selection)
      if (file.includes('CompanyBanner.tsx')) {
        console.log('[StepWireframe] Parsing CompanyBanner.tsx for companies...');
        const companies: ButtonInfo[] = [];
        let match;
        
        // Extract companies from COMPANIES array
        while ((match = companyPattern.exec(sourceCode)) !== null) {
          const [, id, name /*description*/] = match;
          console.log(`[StepWireframe] Found company: ${id} - ${name}`);
          companies.push({
            id: `company-${id}`,
            label: name,
            position: { x: 15 + (companies.length * 15), y: 20, width: 12, height: 8 },
            functional: true,
            action: `setSelectedCompany({ id: '${id}', name: '${name}' })`,
            stateChanges: ['selectedCompany', 'companyData'],
            sourceFile: file,
          });
        }
        
        console.log(`[StepWireframe] Total companies found: ${companies.length}`);
        
        if (companies.length > 0) {
          updatedWireframes[0] = {
            ...updatedWireframes[0],
            buttons: [...updatedWireframes[0].buttons.filter(b => !b.id.startsWith('company-')), ...companies],
            sourceFiles: [...new Set([...updatedWireframes[0].sourceFiles, file])],
          };
        }
      }
      
      return updatedWireframes;
    } catch (error) {
      console.error('[StepWireframe] Failed to parse UI:', error);
      return ALL_WIREFRAMES;
    }
  }, []);

  // Take a snapshot of current UI state
  const takeSnapshot = useCallback((step: number) => {
    const wf = liveWireframes[step];
    const snapshot: UISnapshot = {
      timestamp: new Date().toISOString(),
      step,
      buttons: [...wf.buttons],
      apiEndpoints: [...wf.apiEndpoints],
      supabaseTables: [...wf.supabaseTables],
    };
    setSnapshots(prev => [snapshot, ...prev.slice(0, 19)]);
    return snapshot;
  }, [liveWireframes]);

  // Compare two snapshots and generate change records
  // TODO: Use this for manual snapshot comparison in future
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const compareSnapshots = useCallback((oldSnap: UISnapshot, newSnap: UISnapshot, file: string): UIChangeRecord[] => {
    const changes: UIChangeRecord[] = [];
    const timestamp = new Date().toISOString();

    // Compare buttons
    const oldButtonIds = new Set(oldSnap.buttons.map(b => b.id));
    const newButtonIds = new Set(newSnap.buttons.map(b => b.id));

    // Find added buttons
    newSnap.buttons.forEach(btn => {
      if (!oldButtonIds.has(btn.id)) {
        changes.push({
          id: `${timestamp}-${btn.id}-added`,
          timestamp,
          file,
          step: newSnap.step,
          layer: 'ui',
          changeType: 'button_added',
          elementId: btn.id,
          elementLabel: btn.label,
          newValue: btn.action,
          diff: { added: [btn.label], removed: [], modified: [] }
        });
      }
    });

    // Find removed buttons
    oldSnap.buttons.forEach(btn => {
      if (!newButtonIds.has(btn.id)) {
        changes.push({
          id: `${timestamp}-${btn.id}-removed`,
          timestamp,
          file,
          step: oldSnap.step,
          layer: 'ui',
          changeType: 'button_removed',
          elementId: btn.id,
          elementLabel: btn.label,
          previousValue: btn.action,
          diff: { added: [], removed: [btn.label], modified: [] }
        });
      }
    });

    // Find modified buttons
    newSnap.buttons.forEach(newBtn => {
      const oldBtn = oldSnap.buttons.find(b => b.id === newBtn.id);
      if (oldBtn && (oldBtn.action !== newBtn.action || oldBtn.functional !== newBtn.functional)) {
        changes.push({
          id: `${timestamp}-${newBtn.id}-modified`,
          timestamp,
          file,
          step: newSnap.step,
          layer: 'ui',
          changeType: 'button_modified',
          elementId: newBtn.id,
          elementLabel: newBtn.label,
          previousValue: oldBtn.action,
          newValue: newBtn.action,
          diff: { added: [], removed: [], modified: [`${oldBtn.action} → ${newBtn.action}`] }
        });
      }
    });

    // Compare API endpoints
    const oldApiEndpoints = new Set(oldSnap.apiEndpoints.map(a => a.endpoint));
    const newApiEndpoints = new Set(newSnap.apiEndpoints.map(a => a.endpoint));

    newSnap.apiEndpoints.forEach(api => {
      if (!oldApiEndpoints.has(api.endpoint)) {
        changes.push({
          id: `${timestamp}-${api.endpoint}-api-added`,
          timestamp,
          file,
          step: newSnap.step,
          layer: 'api',
          changeType: 'api_added',
          elementId: api.endpoint,
          elementLabel: `${api.method} ${api.endpoint}`,
          newValue: api.description,
          diff: { added: [`${api.method} ${api.endpoint}`], removed: [], modified: [] }
        });
      }
    });

    oldSnap.apiEndpoints.forEach(api => {
      if (!newApiEndpoints.has(api.endpoint)) {
        changes.push({
          id: `${timestamp}-${api.endpoint}-api-removed`,
          timestamp,
          file,
          step: oldSnap.step,
          layer: 'api',
          changeType: 'api_removed',
          elementId: api.endpoint,
          elementLabel: `${api.method} ${api.endpoint}`,
          previousValue: api.description,
          diff: { added: [], removed: [`${api.method} ${api.endpoint}`], modified: [] }
        });
      }
    });

    return changes;
  }, []);

  // WebSocket connection for live file watching
  const connectWebSocket = useCallback(() => {
    const ws = new WebSocket(WS_URL);
    
    ws.onopen = () => {
      console.log('[StepWireframe] WebSocket connected');
      setWsConnected(true);
      // Take initial snapshots for all steps
      ALL_WIREFRAMES.forEach((_, i) => takeSnapshot(i));
    };
    
    ws.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('[StepWireframe] WebSocket message:', message.type, message.data?.file);
        
        if (message.type === 'analysis_complete' || message.type === 'page_analysis_update') {
          const file = message.data.file || message.data.relativePath;
          console.log('[StepWireframe] Processing file change:', file);
          
          const change: FileChange = {
            file,
            timestamp: new Date().toISOString(),
            type: file?.includes('PAGE_ANALYSIS') ? 'analysis' : 
                  file?.includes('supabase') ? 'config' : 'source'
          };
          setFileChanges(prev => [change, ...prev.slice(0, 9)]);

          // Parse the actual file and update wireframe in real-time
          if (isLiveMode && (file.includes('OneMindAI.tsx') || file.includes('useUIConfig.ts') || file.includes('CompanyBanner.tsx'))) {
            console.log('[StepWireframe] Live mode enabled, parsing file:', file);
            const oldWireframe = liveWireframes[selectedStep];
            const updatedWireframes = await parseOneMindUI(file);
            const newWireframe = updatedWireframes[selectedStep];
            
            // Compare old and new wireframes to detect changes
            const oldButtonIds = new Set(oldWireframe.buttons.map(b => b.id));
            const newButtonIds = new Set(newWireframe.buttons.map(b => b.id));
            
            // Find removed buttons
            const removedButtons = oldWireframe.buttons.filter(b => !newButtonIds.has(b.id));
            const addedButtons = newWireframe.buttons.filter(b => !oldButtonIds.has(b.id));
            
            // Create change records for each difference
            const changes: UIChangeRecord[] = [];
            
            removedButtons.forEach(btn => {
              const { summary, reason, impact, codeChanges } = generateChangeSummary(
                'button_removed', btn.label, file, btn, undefined
              );
              changes.push({
                id: `${Date.now()}-${btn.id}-removed`,
                timestamp: new Date().toISOString(),
                file,
                step: selectedStep,
                layer: 'ui',
                changeType: 'button_removed',
                elementId: btn.id,
                elementLabel: btn.label,
                previousValue: btn.action,
                diff: { 
                  added: [], 
                  removed: [btn.label], 
                  modified: [] 
                },
                summary,
                reason,
                impact,
                codeChanges,
              });
            });
            
            addedButtons.forEach(btn => {
              const { summary, reason, impact, codeChanges } = generateChangeSummary(
                'button_added', btn.label, file, undefined, btn
              );
              changes.push({
                id: `${Date.now()}-${btn.id}-added`,
                timestamp: new Date().toISOString(),
                file,
                step: selectedStep,
                layer: 'ui',
                changeType: 'button_added',
                elementId: btn.id,
                elementLabel: btn.label,
                newValue: btn.action,
                diff: { 
                  added: [btn.label], 
                  removed: [], 
                  modified: [] 
                },
                summary,
                reason,
                impact,
                codeChanges,
              });
            });
            
            // Update the live wireframes
            setLiveWireframes(updatedWireframes);
            
            // Add changes to history
            if (changes.length > 0) {
              setUiHistory(prev => [...changes, ...prev.slice(0, 49)]);
            } else {
              // File changed but no UI elements changed
              const noChangeRecord: UIChangeRecord = {
                id: `${Date.now()}-no-change`,
                timestamp: new Date().toISOString(),
                file,
                step: selectedStep,
                layer: 'component',
                changeType: 'state_changed',
                elementId: 'file-change',
                elementLabel: file.split('/').pop() || file,
                previousValue: 'No UI elements affected',
                newValue: 'Code structure unchanged',
                diff: {
                  added: message.data.addedLines ? [`+${message.data.addedLines} lines`] : [],
                  removed: message.data.removedLines ? [`-${message.data.removedLines} lines`] : [],
                  modified: ['Code updated but UI unchanged']
                }
              };
              setUiHistory(prev => [noChangeRecord, ...prev.slice(0, 49)]);
            }
          } else {
            // Non-UI file change - parse for detailed info
            // Determine layer based on file path
            const layer: ChangeLayer = file.includes('supabase') || file.includes('credit-service') ? 'supabase' :
              file.includes('api') || file.includes('proxy') || file.includes('server') ? 'api' :
              file.includes('hook') || file.includes('use') ? 'state' :
              file.includes('config') || file.includes('.env') ? 'config' :
              'component';
            
            // Fetch file content for detailed analysis
            let detailedChange: UIChangeRecord;
            try {
              const fileResponse = await fetch(`http://localhost:4000/api/file-content?path=${file}`);
              if (fileResponse.ok) {
                const fileData = await fileResponse.json();
                const content = fileData.content || '';
                
                // Parse based on layer type
                let changeType: UIChangeRecord['changeType'] = 'state_changed';
                let summary = '';
                let reason = '';
                let impact: 'high' | 'medium' | 'low' = 'low';
                const codeChanges: UIChangeRecord['codeChanges'] = {
                  apiEndpoints: [],
                  supabaseTables: [],
                  rpcFunctions: [],
                  hooksAffected: [],
                  stateVariables: [],
                };
                
                if (layer === 'api') {
                  // Parse API endpoints from file
                  const endpointMatches = content.match(/app\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/gi) || [];
                  const functionMatches = content.match(/(?:async\s+)?function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s*)?\(/g) || [];
                  
                  codeChanges.apiEndpoints = endpointMatches.map((m: string) => {
                    const match = m.match(/app\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/i);
                    return match ? `${match[1].toUpperCase()} ${match[2]}` : m;
                  });
                  codeChanges.functionAffected = functionMatches.slice(0, 3).join(', ');
                  
                  changeType = 'function_modified';
                  summary = `API file "${file.split('/').pop()}" was modified`;
                  reason = codeChanges.apiEndpoints!.length > 0 
                    ? `Contains ${codeChanges.apiEndpoints!.length} endpoints: ${codeChanges.apiEndpoints!.slice(0, 3).join(', ')}`
                    : 'Backend logic updated';
                  impact = 'high';
                  
                } else if (layer === 'supabase') {
                  // Parse Supabase queries - extract unique table names
                  const tableMatches = content.match(/\.from\s*\(\s*['"]([^'"]+)['"]\)/g) || [];
                  const rpcMatches = content.match(/\.rpc\s*\(\s*['"]([^'"]+)['"]/g) || [];
                  
                  // Extract and deduplicate table names
                  const tables: string[] = tableMatches.map((m: string) => {
                    const match = m.match(/\.from\s*\(\s*['"]([^'"]+)['"]\)/);
                    return match ? match[1] : m;
                  });
                  codeChanges.supabaseTables = [...new Set(tables)] as string[]; // Remove duplicates
                  
                  // Extract and deduplicate RPC functions
                  const rpcs: string[] = rpcMatches.map((m: string) => {
                    const match = m.match(/\.rpc\s*\(\s*['"]([^'"]+)['"]/);
                    return match ? match[1] : m;
                  });
                  codeChanges.rpcFunctions = [...new Set(rpcs)] as string[]; // Remove duplicates
                  
                  changeType = 'query_modified';
                  summary = `Supabase service "${file.split('/').pop()}" was modified`;
                  reason = codeChanges.supabaseTables!.length > 0
                    ? `Affects tables: ${codeChanges.supabaseTables!.join(', ')}`
                    : codeChanges.rpcFunctions!.length > 0
                      ? `Uses RPC: ${codeChanges.rpcFunctions!.join(', ')}`
                      : 'Database operations updated';
                  impact = 'high';
                  
                } else if (layer === 'state') {
                  // Parse hooks and state
                  const hookMatches = content.match(/use[A-Z]\w+/g) || [];
                  const stateMatches = content.match(/useState\s*<[^>]*>\s*\(\s*[^)]*\)|useState\s*\([^)]*\)/g) || [];
                  
                  codeChanges.hooksAffected = [...new Set(hookMatches as string[])].slice(0, 5);
                  codeChanges.stateVariables = stateMatches.map((m: string) => {
                    const match = m.match(/useState[^(]*\(\s*([^)]*)\)/);
                    return match ? `initial: ${match[1].slice(0, 20)}` : 'state';
                  });
                  
                  changeType = 'hook_modified';
                  summary = `State hook "${file.split('/').pop()}" was modified`;
                  reason = codeChanges.hooksAffected!.length > 0
                    ? `Uses hooks: ${codeChanges.hooksAffected!.join(', ')}`
                    : 'State management updated';
                  impact = 'medium';
                  
                } else {
                  // Component layer - try LLM extraction first, fallback to regex
                  const fileName = file.split('/').pop() || file;
                  
                  // Always try comprehensive extraction (works with or without LLM)
                  try {
                    const extractResponse = await fetch('http://localhost:4000/api/extract-change-info', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        file,
                        newContent: content.slice(0, 5000), // Send more content for better analysis
                      })
                    });
                    
                    if (extractResponse.ok) {
                      const extractData = await extractResponse.json();
                      
                      // Use comprehensive data
                      summary = extractData.summary || `${fileName} was modified`;
                      
                      // Build detailed reason with WHY explanation
                      const whyParts = [];
                      if (extractData.whyAffected) {
                        whyParts.push(extractData.whyAffected);
                      }
                      if (extractData.whatChanged?.length > 0) {
                        whyParts.push(`Changes: ${extractData.whatChanged.slice(0, 3).join(', ')}`);
                      }
                      if (extractData.affectedAreas?.length > 0) {
                        const areas = extractData.affectedAreas.map((a: { area: string; reason: string }) => a.area).join(', ');
                        whyParts.push(`Affects: ${areas}`);
                      }
                      reason = whyParts.join(' | ') || 'File modified';
                      
                      // Set impact
                      impact = extractData.impact === 'high' ? 'high' : extractData.impact === 'medium' ? 'medium' : 'low';
                      
                      // Store what changed for display
                      codeChanges.stateVariables = extractData.whatChanged?.slice(0, 5) || [];
                      codeChanges.functionAffected = extractData.affectedAreas?.map((a: { area: string }) => a.area).join(', ') || '';
                      
                      // Store WHY reasons for detailed view
                      if (extractData.whyReasons?.length > 0) {
                        codeChanges.apiEndpoints = extractData.whyReasons.slice(0, 5);
                      }
                      
                      console.log('[StepWireframe] Comprehensive extraction:', extractData);
                    }
                  } catch (extractError) {
                    console.log('[StepWireframe] Extraction API failed, using local regex:', extractError);
                  }
                  
                  // Fallback to regex extraction if LLM didn't provide data
                  if (!summary) {
                    // Extract all variable/constant declarations
                    const constMatches = content.match(/(?:const|let|var)\s+([A-Z_][A-Z0-9_]*)\s*[:=]/g) || [];
                    const functionMatches = content.match(/(?:function|const)\s+([a-z][a-zA-Z0-9]*)\s*[=(]/g) || [];
                    const objectKeyMatches = content.match(/([a-z][a-zA-Z0-9]*)\s*:\s*\{/g) || [];
                    
                    // Extract modified constants/configs
                    const constants = constMatches.map((m: string) => {
                      const match = m.match(/(?:const|let|var)\s+([A-Z_][A-Z0-9_]*)/);
                      return match ? match[1] : null;
                    }).filter(Boolean) as string[];
                    
                    // Extract modified functions
                    const functions = functionMatches.map((m: string) => {
                      const match = m.match(/(?:function|const)\s+([a-z][a-zA-Z0-9]*)/);
                      return match ? match[1] : null;
                    }).filter(Boolean) as string[];
                    
                    // Extract object keys (like model configs)
                    const objectKeys = objectKeyMatches.map((m: string) => {
                      const match = m.match(/([a-z][a-zA-Z0-9]*)\s*:/);
                      return match ? match[1] : null;
                    }).filter(Boolean) as string[];
                    
                    // Count different types of changes
                    const lineCount = content.split('\n').length;
                    const importCount = (content.match(/^import\s+/gm) || []).length;
                    const exportCount = (content.match(/^export\s+/gm) || []).length;
                    
                    // Build dynamic summary based on what's in the file
                    const uniqueConstants = [...new Set(constants)];
                    const uniqueFunctions = [...new Set(functions)];
                    const uniqueKeys = [...new Set(objectKeys)];
                    
                    if (uniqueConstants.length > 0) {
                      summary = `Component "${fileName}" modified ${uniqueConstants.length} constant(s)`;
                      reason = `Updated: ${uniqueConstants.slice(0, 3).join(', ')}${uniqueConstants.length > 3 ? ` +${uniqueConstants.length - 3} more` : ''}`;
                      impact = uniqueConstants.some(c => c.includes('PRICING') || c.includes('COST') || c.includes('CREDIT')) ? 'high' : 'medium';
                      codeChanges.stateVariables = uniqueConstants.slice(0, 5);
                    } else if (uniqueFunctions.length > 0) {
                      summary = `Component "${fileName}" modified ${uniqueFunctions.length} function(s)`;
                      reason = `Updated functions: ${uniqueFunctions.slice(0, 3).join(', ')}${uniqueFunctions.length > 3 ? ` +${uniqueFunctions.length - 3} more` : ''}`;
                      impact = 'medium';
                      codeChanges.functionAffected = uniqueFunctions.slice(0, 3).join(', ');
                    } else if (uniqueKeys.length > 0) {
                      summary = `Component "${fileName}" modified ${uniqueKeys.length} configuration(s)`;
                      reason = `Updated configs: ${uniqueKeys.slice(0, 3).join(', ')}${uniqueKeys.length > 3 ? ` +${uniqueKeys.length - 3} more` : ''}`;
                      impact = 'medium';
                    } else {
                      summary = `Component "${fileName}" was modified`;
                      reason = `${lineCount} lines, ${importCount} imports, ${exportCount} exports`;
                      impact = 'low';
                    }
                  }
                }
                
                detailedChange = {
                  id: `${Date.now()}-change`,
                  timestamp: new Date().toISOString(),
                  file,
                  step: selectedStep,
                  layer,
                  changeType,
                  elementId: 'file-change',
                  elementLabel: file.split('/').pop() || file,
                  previousValue: 'Previous version',
                  newValue: 'Updated version',
                  summary,
                  reason,
                  impact,
                  codeChanges,
                  diff: {
                    added: message.data.addedLines ? [`+${message.data.addedLines} lines`] : [],
                    removed: message.data.removedLines ? [`-${message.data.removedLines} lines`] : [],
                    modified: [summary]
                  }
                };
              } else {
                throw new Error('Failed to fetch file');
              }
            } catch {
              // Fallback to basic change record
              detailedChange = {
                id: `${Date.now()}-change`,
                timestamp: new Date().toISOString(),
                file,
                step: selectedStep,
                layer,
                changeType: 'state_changed',
                elementId: 'file-change',
                elementLabel: file.split('/').pop() || file,
                previousValue: 'Previous state',
                newValue: 'New state after change',
                diff: {
                  added: message.data.addedLines ? [`+${message.data.addedLines} lines`] : [],
                  removed: message.data.removedLines ? [`-${message.data.removedLines} lines`] : [],
                  modified: ['File content updated']
                }
              };
            }
            
            setUiHistory(prev => [detailedChange, ...prev.slice(0, 49)]);
          }
        }
      } catch (err) {
        console.error('[StepWireframe] Failed to parse message:', err);
      }
    };
    
    ws.onclose = () => {
      console.log('[StepWireframe] WebSocket disconnected');
      setWsConnected(false);
      // Reconnect after 3 seconds
      setTimeout(connectWebSocket, 3000);
    };
    
    ws.onerror = () => {
      setWsConnected(false);
    };
    
    return ws;
  }, [selectedStep, takeSnapshot]);

  useEffect(() => {
    const ws = connectWebSocket();
    return () => ws.close();
  }, [connectWebSocket]);

  const getButtonColor = (btn: ButtonInfo) => {
    if (!btn.functional) return 'bg-gray-400/60 border-gray-500';
    if (btn.apiCall) return 'bg-blue-500/60 border-blue-400';
    if (btn.stateChanges && btn.stateChanges.length > 0) return 'bg-green-500/60 border-green-400';
    return 'bg-purple-500/60 border-purple-400';
  };

  const getSectionColor = (section: WireframeSection) => {
    switch (section.type) {
      case 'header': return 'bg-slate-700/40 border-slate-500';
      case 'footer': return 'bg-slate-700/40 border-slate-500';
      case 'carousel': return 'bg-indigo-500/20 border-indigo-400';
      case 'grid': return 'bg-emerald-500/20 border-emerald-400';
      case 'panel': return 'bg-amber-500/20 border-amber-400';
      case 'form': return 'bg-cyan-500/20 border-cyan-400';
      case 'sidebar': return 'bg-pink-500/20 border-pink-400';
      default: return 'bg-slate-500/20 border-slate-400';
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-950">
      {/* Help Icon */}
      <HelpIcon
        title="Code Guardian - Wireframe Viewer"
        description="Real-time visualization of UI changes in OneMind AI. Monitor file changes, track state updates, and see how code modifications affect the application architecture."
        features={[
          'Live file watching with WebSocket connection',
          'Visual wireframe representation of UI components',
          'API endpoint tracking and documentation',
          'Supabase table and RPC function monitoring',
          'Change history with detailed impact analysis',
          'LLM-powered change summaries (optional)',
          'Layer-based change categorization (UI, API, State, Supabase)',
        ]}
        tips={[
          'Enable "Live Parse" to see changes in real-time',
          'Click on buttons to see their API calls and state changes',
          'Use the History panel to review recent changes',
          'Enable LLM mode for intelligent change summaries',
        ]}
        position="top-right"
      />
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">UI Wireframe Viewer</h2>
            <p className="text-slate-400 text-sm">Interactive visualization of OneMind AI steps</p>
          </div>
          
          {/* Controls */}
          <div className="flex items-center gap-4">
            {/* Live Status */}
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs ${
              wsConnected && isLiveMode ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}>
              <span className={`w-2 h-2 rounded-full ${wsConnected && isLiveMode ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></span>
              {wsConnected && isLiveMode ? 'Live' : 'Offline'}
            </div>
            
            {/* Live Mode Toggle */}
            <label className="flex items-center gap-2 text-sm text-slate-400">
              <input 
                type="checkbox" 
                checked={isLiveMode} 
                onChange={(e) => setIsLiveMode(e.target.checked)}
                className="rounded"
              />
              Live Parse
            </label>
            
            <label className="flex items-center gap-2 text-sm text-slate-400">
              <input 
                type="checkbox" 
                checked={showSections} 
                onChange={(e) => setShowSections(e.target.checked)}
                className="rounded"
              />
              Sections
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-400">
              <input 
                type="checkbox" 
                checked={showButtons} 
                onChange={(e) => setShowButtons(e.target.checked)}
                className="rounded"
              />
              Buttons
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-400">
              <input 
                type="checkbox" 
                checked={showSupabase} 
                onChange={(e) => setShowSupabase(e.target.checked)}
                className="rounded"
              />
              Supabase
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-400">
              <input 
                type="checkbox" 
                checked={showApiEndpoints} 
                onChange={(e) => setShowApiEndpoints(e.target.checked)}
                className="rounded"
              />
              APIs
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-400">
              <input 
                type="checkbox" 
                checked={showHistory} 
                onChange={(e) => setShowHistory(e.target.checked)}
                className="rounded"
              />
              History
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-400" title="Use LLM to analyze changes (requires API)">
              <input 
                type="checkbox" 
                checked={useLLMAnalysis} 
                onChange={(e) => setUseLLMAnalysis(e.target.checked)}
                className="rounded"
              />
              🤖 LLM
            </label>
          </div>
        </div>
        
        {/* UI Change History Panel */}
        {showHistory && (
          <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-amber-400 text-sm font-medium">📜 UI Change History ({uiHistory.length})</span>
              <div className="flex gap-2">
                <button 
                  onClick={() => generateLLMSummary(5)}
                  disabled={isGeneratingSummary || uiHistory.length === 0}
                  className="text-cyan-400 hover:text-cyan-300 text-xs px-2 py-1 bg-cyan-500/20 rounded disabled:opacity-50"
                  title="Generate AI summary of last 5 changes"
                >
                  {isGeneratingSummary ? '⏳' : '📝'} Summary (5)
                </button>
                <button 
                  onClick={() => generateLLMSummary(10)}
                  disabled={isGeneratingSummary || uiHistory.length === 0}
                  className="text-cyan-400 hover:text-cyan-300 text-xs px-2 py-1 bg-cyan-500/20 rounded disabled:opacity-50"
                  title="Generate AI summary of last 10 changes"
                >
                  {isGeneratingSummary ? '⏳' : '📝'} Summary (10)
                </button>
                <button 
                  onClick={generateTestChanges}
                  className="text-purple-400 hover:text-purple-300 text-xs px-2 py-1 bg-purple-500/20 rounded"
                  title="Generate test changes for all layers"
                >
                  🧪 Test
                </button>
                <button 
                  onClick={() => takeSnapshot(selectedStep)}
                  className="text-amber-400 hover:text-amber-300 text-xs px-2 py-1 bg-amber-500/20 rounded"
                >
                  📸
                </button>
                <button 
                  onClick={() => { setUiHistory([]); setChangeSummary(''); }}
                  className="text-amber-400 hover:text-amber-300 text-xs"
                >
                  Clear
                </button>
              </div>
            </div>
            
            {/* Change Summary Panel */}
            {changeSummary && (
              <div className="mb-3 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-cyan-400 text-sm font-medium">📊 Change Summary</span>
                  <button 
                    onClick={() => setChangeSummary('')}
                    className="text-cyan-400 hover:text-cyan-300 text-xs"
                  >
                    ✕
                  </button>
                </div>
                <div className="text-sm text-slate-300 whitespace-pre-wrap">
                  {changeSummary.split('\n').map((line, i) => (
                    <div key={i} className={
                      line.startsWith('**') ? 'font-semibold text-slate-200 mt-1' :
                      line.startsWith('•') ? 'ml-2 text-slate-400' :
                      line.startsWith('⚠️') ? 'text-amber-400 mt-2 font-medium' :
                      ''
                    }>
                      {line.replace(/\*\*/g, '')}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {uiHistory.length === 0 ? (
              <div className="text-slate-500 text-sm text-center py-4">
                No changes recorded yet. Edit source files to see history.
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {uiHistory.map((change) => (
                  <div key={change.id} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                    {/* Header with layer, change type, label, impact, and timestamp */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Layer Badge */}
                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                          change.layer === 'ui' ? 'bg-pink-500/30 text-pink-300 border border-pink-500/50' :
                          change.layer === 'component' ? 'bg-violet-500/30 text-violet-300 border border-violet-500/50' :
                          change.layer === 'api' ? 'bg-blue-500/30 text-blue-300 border border-blue-500/50' :
                          change.layer === 'supabase' ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50' :
                          change.layer === 'state' ? 'bg-orange-500/30 text-orange-300 border border-orange-500/50' :
                          'bg-slate-500/30 text-slate-300 border border-slate-500/50'
                        }`}>
                          {change.layer}
                        </span>
                        {/* Change Type Badge */}
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          change.changeType.includes('added') ? 'bg-green-500/30 text-green-300' :
                          change.changeType.includes('removed') ? 'bg-red-500/30 text-red-300' :
                          change.changeType.includes('modified') ? 'bg-blue-500/30 text-blue-300' :
                          'bg-amber-500/30 text-amber-300'
                        }`}>
                          {change.changeType.replace(/_/g, ' ').toUpperCase()}
                        </span>
                        {/* Impact Badge */}
                        {change.impact && (
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            change.impact === 'high' ? 'bg-red-500/20 text-red-400' :
                            change.impact === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                            'bg-slate-500/20 text-slate-400'
                          }`}>
                            {change.impact.toUpperCase()} IMPACT
                          </span>
                        )}
                        <span className="text-slate-300 text-sm font-medium">{change.elementLabel}</span>
                      </div>
                      <span className="text-slate-500 text-xs">{new Date(change.timestamp).toLocaleTimeString()}</span>
                    </div>
                    
                    {/* Summary */}
                    {change.summary && (
                      <div className="text-sm text-slate-200 mb-2 font-medium">
                        {change.summary}
                      </div>
                    )}
                    
                    {/* Reason / Why */}
                    {change.reason && (
                      <div className="text-xs text-cyan-400 mb-2 bg-cyan-500/10 px-2 py-1.5 rounded border-l-2 border-cyan-500">
                        <span className="font-semibold">Why: </span>{change.reason}
                      </div>
                    )}
                    
                    <div className="text-xs font-mono text-slate-400 mb-2">
                      Step {change.step} • {change.file}
                    </div>
                    
                    {/* Code Changes Details */}
                    {change.codeChanges && (
                      <div className="mb-2 p-2 bg-slate-900/50 rounded border border-slate-700">
                        <div className="text-xs text-slate-400 font-semibold mb-1">Code Changes:</div>
                        <div className="space-y-1 text-xs">
                          {change.codeChanges.functionAffected && (
                            <div className="flex gap-2">
                              <span className="text-purple-400">Function:</span>
                              <span className="text-slate-300 font-mono">{change.codeChanges.functionAffected}</span>
                            </div>
                          )}
                          {change.codeChanges.stateVariables && change.codeChanges.stateVariables.length > 0 && (
                            <div className="flex gap-2 flex-wrap">
                              <span className="text-purple-400">State:</span>
                              {change.codeChanges.stateVariables.map((v, i) => (
                                <span key={i} className="px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded font-mono">{v}</span>
                              ))}
                            </div>
                          )}
                          {change.codeChanges.apiEndpoints && change.codeChanges.apiEndpoints.length > 0 && (
                            <div className="flex gap-2 flex-wrap">
                              <span className="text-blue-400">API:</span>
                              {change.codeChanges.apiEndpoints.map((v, i) => (
                                <span key={i} className="px-1.5 py-0.5 bg-blue-500/20 text-blue-300 rounded font-mono">{v}</span>
                              ))}
                            </div>
                          )}
                          {change.codeChanges.supabaseTables && change.codeChanges.supabaseTables.length > 0 && (
                            <div className="flex gap-2 flex-wrap">
                              <span className="text-green-400">Supabase:</span>
                              {change.codeChanges.supabaseTables.map((v, i) => (
                                <span key={i} className="px-1.5 py-0.5 bg-green-500/20 text-green-300 rounded font-mono">{v}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Diff View */}
                    {change.diff && (
                      <div className="space-y-1 text-xs">
                        {change.diff.removed.length > 0 && (
                          <div className="flex items-start gap-2">
                            <span className="text-red-400 font-bold">−</span>
                            <div className="text-red-300 bg-red-500/10 px-2 py-1 rounded flex-1">
                              {change.diff.removed.map((item, i) => (
                                <div key={i} className="line-through">{item}</div>
                              ))}
                            </div>
                          </div>
                        )}
                        {change.diff.added.length > 0 && (
                          <div className="flex items-start gap-2">
                            <span className="text-green-400 font-bold">+</span>
                            <div className="text-green-300 bg-green-500/10 px-2 py-1 rounded flex-1">
                              {change.diff.added.map((item, i) => (
                                <div key={i}>{item}</div>
                              ))}
                            </div>
                          </div>
                        )}
                        {change.diff.modified.length > 0 && (
                          <div className="flex items-start gap-2">
                            <span className="text-blue-400 font-bold">~</span>
                            <div className="text-blue-300 bg-blue-500/10 px-2 py-1 rounded flex-1">
                              {change.diff.modified.map((item, i) => (
                                <div key={i}>{item}</div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Previous/New Value */}
                    {(change.previousValue || change.newValue) && !change.diff && (
                      <div className="mt-2 space-y-1 text-xs">
                        {change.previousValue && (
                          <div className="flex gap-2">
                            <span className="text-red-400">Before:</span>
                            <span className="text-slate-400 font-mono">{change.previousValue}</span>
                          </div>
                        )}
                        {change.newValue && (
                          <div className="flex gap-2">
                            <span className="text-green-400">After:</span>
                            <span className="text-slate-400 font-mono">{change.newValue}</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* LLM Analysis (when available) */}
                    {change.llmAnalysis && (
                      <div className="mt-2 p-2 bg-indigo-500/10 rounded border border-indigo-500/30">
                        <div className="text-xs text-indigo-400 font-semibold mb-1">🤖 AI Analysis</div>
                        <div className="space-y-1 text-xs">
                          <div className="flex gap-2">
                            <span className="text-indigo-300">Necessity:</span>
                            <span className={`px-1.5 py-0.5 rounded font-medium ${
                              change.llmAnalysis.necessity === 'required' ? 'bg-green-500/20 text-green-300' :
                              change.llmAnalysis.necessity === 'refactor' ? 'bg-blue-500/20 text-blue-300' :
                              'bg-slate-500/20 text-slate-300'
                            }`}>
                              {change.llmAnalysis.necessity.toUpperCase()}
                            </span>
                            {change.llmAnalysis.breakingChanges && (
                              <span className="px-1.5 py-0.5 bg-red-500/30 text-red-300 rounded font-medium">⚠️ BREAKING</span>
                            )}
                          </div>
                          <div className="text-slate-300">{change.llmAnalysis.riskAssessment}</div>
                          {change.llmAnalysis.suggestedTests.length > 0 && (
                            <div className="mt-1">
                              <span className="text-indigo-300">Suggested Tests:</span>
                              <ul className="list-disc list-inside text-slate-400 ml-2">
                                {change.llmAnalysis.suggestedTests.map((test, i) => (
                                  <li key={i}>{test}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {/* Snapshots */}
            {snapshots.length > 0 && (
              <div className="mt-3 pt-3 border-t border-amber-500/30">
                <div className="text-amber-400 text-xs font-medium mb-2">📸 Snapshots ({snapshots.length})</div>
                <div className="flex flex-wrap gap-2">
                  {snapshots.slice(0, 5).map((snap, i) => (
                    <div key={i} className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-400">
                      Step {snap.step} • {new Date(snap.timestamp).toLocaleTimeString()}
                      <span className="text-slate-500 ml-1">({snap.buttons.length} btns)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* File Changes Alert */}
        {fileChanges.length > 0 && (
          <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-blue-400 text-sm font-medium">📡 Live File Changes</span>
              <button 
                onClick={() => setFileChanges([])}
                className="text-blue-400 hover:text-blue-300 text-xs"
              >
                Clear
              </button>
            </div>
            <div className="space-y-1 max-h-20 overflow-y-auto">
              {fileChanges.map((change, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className={`w-2 h-2 rounded-full ${
                    change.type === 'source' ? 'bg-green-400' : 
                    change.type === 'config' ? 'bg-purple-400' : 'bg-blue-400'
                  }`}></span>
                  <span className="text-slate-300 font-mono">{change.file}</span>
                  <span className="text-slate-500">{new Date(change.timestamp).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step Tabs */}
        <div className="flex gap-2">
          {ALL_WIREFRAMES.map((wf, i) => (
            <button
              key={wf.step}
              onClick={() => {
                setSelectedStep(i);
                setSelectedButton(null);
                setHoveredButton(null);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                selectedStep === i
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
            >
              Step {wf.step}: {wf.title}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Wireframe Canvas */}
        <div className="flex-1 p-4 overflow-auto">
          <div className="relative bg-slate-900 rounded-xl border border-slate-700 mx-auto" style={{ width: '900px', height: '600px' }}>
            {/* Step Title Overlay */}
            <div className="absolute top-2 left-2 z-20 bg-slate-800/90 px-3 py-1.5 rounded-lg">
              <span className="text-purple-400 font-mono text-sm">Step {wireframe.step}</span>
              <span className="text-white ml-2 font-medium">{wireframe.title}</span>
            </div>

            {/* Sections */}
            {showSections && wireframe.sections.map(section => (
              <div
                key={section.id}
                className={`absolute border-2 border-dashed rounded-lg ${getSectionColor(section)} transition-all`}
                style={{
                  left: `${section.position.x}%`,
                  top: `${section.position.y}%`,
                  width: `${section.position.width}%`,
                  height: `${section.position.height}%`,
                }}
              >
                <span className="absolute -top-3 left-2 text-xs font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                  {section.name}
                </span>
              </div>
            ))}

            {/* Buttons */}
            {showButtons && wireframe.buttons.map(btn => (
              <div
                key={btn.id}
                className={`absolute border-2 rounded cursor-pointer transition-all ${getButtonColor(btn)} ${
                  hoveredButton?.id === btn.id ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-105 z-10' : ''
                } ${selectedButton?.id === btn.id ? 'ring-2 ring-yellow-400' : ''}`}
                style={{
                  left: `${btn.position.x}%`,
                  top: `${btn.position.y}%`,
                  width: `${btn.position.width}%`,
                  height: `${btn.position.height}%`,
                }}
                onMouseEnter={() => setHoveredButton(btn)}
                onMouseLeave={() => setHoveredButton(null)}
                onClick={() => setSelectedButton(btn)}
              >
                <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white truncate px-1">
                  {btn.label}
                </span>
              </div>
            ))}

            {/* Hover Tooltip */}
            {hoveredButton && (
              <div 
                className="absolute z-30 bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-xl max-w-xs"
                style={{
                  left: `${Math.min(hoveredButton.position.x + hoveredButton.position.width + 2, 70)}%`,
                  top: `${hoveredButton.position.y}%`,
                }}
              >
                <div className="font-semibold text-white mb-1">{hoveredButton.label}</div>
                <div className={`text-xs px-2 py-0.5 rounded inline-block mb-2 ${
                  hoveredButton.functional ? 'bg-green-500/30 text-green-300' : 'bg-red-500/30 text-red-300'
                }`}>
                  {hoveredButton.functional ? '✓ Functional' : '✗ Not Functional'}
                </div>
                <div className="text-xs text-slate-400 font-mono">{hoveredButton.action}</div>
              </div>
            )}
          </div>
        </div>

        {/* Details Panel */}
        <div className="w-80 flex-shrink-0 border-l border-slate-800 overflow-y-auto">
          <div className="p-4">
            {/* Selected Button Details */}
            {selectedButton ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Button Details</h3>
                  <div className="bg-slate-800 rounded-lg p-4 space-y-3">
                    <div>
                      <span className="text-slate-400 text-xs">Label</span>
                      <div className="text-white font-medium">{selectedButton.label}</div>
                    </div>
                    <div>
                      <span className="text-slate-400 text-xs">Status</span>
                      <div className={`inline-block px-2 py-0.5 rounded text-sm ${
                        selectedButton.functional ? 'bg-green-500/30 text-green-300' : 'bg-red-500/30 text-red-300'
                      }`}>
                        {selectedButton.functional ? 'Functional' : 'Not Functional'}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400 text-xs">Action</span>
                      <div className="text-cyan-400 font-mono text-sm bg-slate-900 p-2 rounded mt-1">
                        {selectedButton.action}
                      </div>
                    </div>
                    {selectedButton.apiCall && (
                      <div>
                        <span className="text-slate-400 text-xs">API Call</span>
                        <div className="text-blue-400 font-mono text-sm bg-slate-900 p-2 rounded mt-1">
                          <span className="text-blue-300">{selectedButton.apiCall.method}</span>{' '}
                          <span className="text-blue-400">{selectedButton.apiCall.endpoint}</span>
                          {selectedButton.apiCall.description && (
                            <div className="text-slate-400 text-xs mt-1">{selectedButton.apiCall.description}</div>
                          )}
                          {selectedButton.apiCall.requestBody && (
                            <div className="text-slate-500 text-xs mt-1">Body: {selectedButton.apiCall.requestBody}</div>
                          )}
                        </div>
                      </div>
                    )}
                    {selectedButton.stateChanges && selectedButton.stateChanges.length > 0 && (
                      <div>
                        <span className="text-slate-400 text-xs">State Changes</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedButton.stateChanges.map((state, i) => (
                            <span key={i} className="px-2 py-0.5 bg-purple-500/30 text-purple-300 rounded text-xs font-mono">
                              {state}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-slate-500 text-center py-8">
                <div className="text-4xl mb-2">👆</div>
                <p>Click a button to see details</p>
              </div>
            )}

            {/* Legend */}
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-slate-400 mb-3">Legend</h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-green-500/60 border border-green-400"></div>
                  <span className="text-slate-300">State Change Only</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-blue-500/60 border border-blue-400"></div>
                  <span className="text-slate-300">API Call</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-purple-500/60 border border-purple-400"></div>
                  <span className="text-slate-300">UI Action</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-gray-400/60 border border-gray-500"></div>
                  <span className="text-slate-300">Not Functional</span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-slate-400 mb-3">Step {wireframe.step} Stats</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-800 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {wireframe.buttons.filter(b => b.functional).length}
                  </div>
                  <div className="text-xs text-slate-400">Functional</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-red-400">
                    {wireframe.buttons.filter(b => !b.functional).length}
                  </div>
                  <div className="text-xs text-slate-400">Not Functional</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-blue-400">
                    {wireframe.buttons.filter(b => b.apiCall).length}
                  </div>
                  <div className="text-xs text-slate-400">API Calls</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-amber-400">
                    {wireframe.sections.length}
                  </div>
                  <div className="text-xs text-slate-400">Sections</div>
                </div>
              </div>
            </div>

            {/* Supabase Config */}
            {showSupabase && wireframe.supabaseTables.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-purple-400 mb-3">🗄️ Supabase Tables</h3>
                <div className="space-y-2">
                  {wireframe.supabaseTables.map((table, i) => (
                    <div key={i} className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-purple-300 text-sm">{table.table}</span>
                        {table.realtime && (
                          <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">realtime</span>
                        )}
                      </div>
                      <div className="text-slate-400 text-xs mb-2">{table.description}</div>
                      <div className="flex flex-wrap gap-1">
                        {table.columns.map((col, j) => (
                          <span key={j} className="px-1.5 py-0.5 bg-slate-700 text-slate-300 text-xs rounded font-mono">
                            {col}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* API Endpoints */}
            {showApiEndpoints && wireframe.apiEndpoints.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-blue-400 mb-3">🔌 API Endpoints</h3>
                <div className="space-y-2">
                  {wireframe.apiEndpoints.map((api, i) => (
                    <div key={i} className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                          api.method === 'GET' ? 'bg-green-500/30 text-green-300' :
                          api.method === 'POST' ? 'bg-blue-500/30 text-blue-300' :
                          api.method === 'PUT' ? 'bg-amber-500/30 text-amber-300' :
                          'bg-red-500/30 text-red-300'
                        }`}>
                          {api.method}
                        </span>
                        <span className="font-mono text-blue-300 text-sm">{api.endpoint}</span>
                      </div>
                      <div className="text-slate-400 text-xs">{api.description}</div>
                      {api.requestBody && (
                        <div className="text-slate-500 text-xs mt-1 font-mono">Body: {api.requestBody}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Source Files */}
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-slate-400 mb-3">📁 Source Files</h3>
              <div className="space-y-1">
                {wireframe.sourceFiles.map((file, i) => (
                  <div key={i} className="px-2 py-1.5 bg-slate-800 rounded text-xs font-mono text-slate-300">
                    {file}
                  </div>
                ))}
              </div>
            </div>

            {/* All Buttons List */}
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-slate-400 mb-3">All Buttons ({wireframe.buttons.length})</h3>
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {wireframe.buttons.map(btn => (
                  <button
                    key={btn.id}
                    onClick={() => setSelectedButton(btn)}
                    className={`w-full text-left px-3 py-2 rounded text-sm transition ${
                      selectedButton?.id === btn.id
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                      btn.functional ? 'bg-green-400' : 'bg-red-400'
                    }`}></span>
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StepWireframe;
