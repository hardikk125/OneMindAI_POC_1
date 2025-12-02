import React, { useMemo, useState, useEffect } from "react";
import { marked } from "marked";
import { FileUploadZone } from './components/FileUploadZone';
import EnhancedMarkdownRenderer from './components/EnhancedMarkdownRenderer';
import { SelectableMarkdownRenderer } from './components/SelectableMarkdownRenderer';
import { TableChartRenderer } from './components/TableChartRenderer';
import { ErrorRecoveryPanel } from './components/ErrorRecoveryPanel';
import { ExportDropdown } from './components/ExportButton';
import { HyperText } from './components/ui/hyper-text';
import { UploadedFile } from "./lib/file-utils";
import { terminalLogger } from "./lib/terminal-logger";
import { exportAllToWord, exportAllToPDF, ExportData } from './lib/export-utils';
import { 
  autoFixRateLimit, 
  autoFixServerError, 
  autoFixSlowDown, 
  autoFixConnectionError,
  shouldAutoFix,
  getAutoFixFunction,
  initializeAutoRecovery
} from './lib/error-recovery-engine';
import { SuperDebugPanel } from './components/SuperDebugPanel';
import { superDebugBus } from './lib/super-debug-bus';
import { BalanceManager } from './components/BalanceManager';
import { deductFromBalance, loadBalances, BalanceRecord } from './lib/balance-tracker';
import { useAuth } from './lib/supabase';
import { deductCredits, calculateCredits, CREDIT_PRICING } from './lib/supabase/credit-service';
import { AuthModal, UserMenu } from './components/auth';

/**
 * OneMindAI — v14 (Mobile-First Preview, patched again)
 * Formula2GX Digital Advanced Incubation Labs Platform
 *
 * Fix for SyntaxError around line ~281:
 * - Fixed three unclosed JSX tags: Prompt, Engine Selection, Every Engine Output containers now have closing ">".
 * - Verified all blocks and details/summary tags are properly closed.
 * - Added a tiny smoke-test effect to assert helper outputs (does not change UI or behavior).
 * - Added comprehensive console logging for debugging and process tracking
 */

// ===== Console Logging Utilities =====
// These will be controlled by debug mode - only vanilla logs when debug is off
let debugModeEnabled = false;

const logStyles = {
  header: 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 8px 16px; border-radius: 4px; font-weight: bold; font-size: 14px;',
  step: 'background: #4CAF50; color: white; padding: 6px 12px; border-radius: 3px; font-weight: bold;',
  data: 'background: #2196F3; color: white; padding: 6px 12px; border-radius: 3px;',
  warning: 'background: #FF9800; color: white; padding: 6px 12px; border-radius: 3px; font-weight: bold;',
  error: 'background: #F44336; color: white; padding: 6px 12px; border-radius: 3px; font-weight: bold;',
  success: 'background: #4CAF50; color: white; padding: 6px 12px; border-radius: 3px; font-weight: bold;',
  info: 'background: #00BCD4; color: white; padding: 6px 12px; border-radius: 3px;',
};

const logger = {
  header: (msg: string) => { if (debugModeEnabled) console.log(`%c${msg}`, logStyles.header); },
  step: (step: number, msg: string) => { if (debugModeEnabled) console.log(`%c STEP ${step} `, logStyles.step, msg); },
  data: (label: string, data: any) => {
    if (debugModeEnabled) {
      console.log(`%c ${label} `, logStyles.data);
      console.log(data);
    }
  },
  warning: (msg: string) => { if (debugModeEnabled) console.warn(`%c ⚠️ WARNING `, logStyles.warning, msg); },
  error: (msg: string, error?: any) => {
    if (debugModeEnabled) {
      console.error(`%c ❌ ERROR `, logStyles.error, msg);
      if (error) console.error(error);
    }
  },
  success: (msg: string) => { if (debugModeEnabled) console.log(`%c ✅ SUCCESS `, logStyles.success, msg); },
  info: (msg: string) => { if (debugModeEnabled) console.log(`%c ℹ️ INFO `, logStyles.info, msg); },
  separator: () => { if (debugModeEnabled) console.log('%c' + '='.repeat(80), 'color: #667eea;'); },
};

// ===== Types =====
interface Engine {
  id: string;
  name: string;
  provider: "openai" | "anthropic" | "gemini" | "deepseek" | "mistral" | "perplexity" | "kimi" | "xai" | "groq" | "falcon" | "huggingface" | "sarvam" | "generic";
  tokenizer: "tiktoken" | "sentencepiece" | "bytebpe";
  contextLimit: number;
  versions: string[];
  selectedVersion: string;
  apiKey?: string;
  endpoint?: string; // for huggingface/generic
  outPolicy?: { mode: "auto" | "fixed"; fixedTokens?: number };
}

interface RunResult {
  engineId: string;
  engineName: string;
  version: string;
  tokensIn: number;
  tokensOut: number;
  estIn: number;
  estOutCap: number;
  estMinSpend: number;
  estMaxSpend: number;
  costUSD: number;
  durationMs: number;
  warnings: string[];
  attempts: number;
  reason: string;
  success: boolean;
  error?: string | null;
  responsePreview?: string;
  isStreaming?: boolean;
  streamingContent?: string;
}

// ===== Default API Keys =====
// SECURITY: API keys are now managed via backend proxy (server/ai-proxy.cjs)
// Users should NOT add keys here - use .env file with the proxy server instead
// See .env.example for configuration
const DEFAULT_API_KEYS: Record<string, string> = {
  "claude": "",
  "kimi": "",
  "deepseek": "",
  "perplexity": "",
  "gemini": "", 
  "mistral": "",
  "groq": "",
  "sarvam": "",
  "chatgpt": "",
  "xai": "",
  "huggingface": "",
};

// Simple encryption/decryption for display (Base64)
// Unicode-safe base64 encoding
function encryptKey(key: string): string {
  try {
    return btoa(encodeURIComponent(key).replace(/%([0-9A-F]{2})/g, (match, p1) => {
      return String.fromCharCode(parseInt(p1, 16));
    }));
  } catch {
    return btoa(key); // Fallback for simple strings
  }
}

function decryptKey(encrypted: string): string {
  try {
    const decoded = atob(encrypted);
    return decodeURIComponent(decoded.split('').map(c => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
  } catch {
    return encrypted; // If not encrypted, return as-is
  }
}

// Unicode-safe btoa for SVG and other content with special characters
function unicodeBtoa(str: string): string {
  try {
    // Remove emojis and other problematic Unicode characters
    const cleanStr = str.replace(/[\u{1F300}-\u{1F9FF}]/gu, ''); // Remove emojis
    return btoa(unescape(encodeURIComponent(cleanStr)));
  } catch (e) {
    console.error('btoa encoding error:', e);
    // Fallback: return a data URL without base64
    return encodeURIComponent(str);
  }
}

// ===== Engines Registry =====
const seededEngines: Engine[] = [
  { id: "openai", name: "ChatGPT", provider: "openai", tokenizer: "tiktoken", contextLimit: 128_000, versions: ["gpt-4.1", "gpt-4o", "gpt-4o-2024-11-20", "gpt-4o-2024-08-06", "gpt-4o-2024-05-13", "gpt-4.1-mini", "gpt-4o-mini"], selectedVersion: "gpt-4.1", outPolicy: { mode: "auto" }, apiKey: DEFAULT_API_KEYS["chatgpt"] },
  { id: "claude", name: "Claude", provider: "anthropic", tokenizer: "sentencepiece", contextLimit: 200_000, versions: ["claude-3.5-sonnet", "claude-3-5-sonnet-20241022", "claude-3-haiku", "claude-3-haiku-20240307"], selectedVersion: "claude-3-haiku-20240307", outPolicy: { mode: "auto" }, apiKey: DEFAULT_API_KEYS["claude"] },
  { id: "gemini", name: "Gemini", provider: "gemini", tokenizer: "sentencepiece", contextLimit: 1_000_000, versions: ["gemini-2.0-flash-exp", "gemini-2.0-flash-lite", "gemini-2.5-flash-lite"], selectedVersion: "gemini-2.5-flash-lite", outPolicy: { mode: "auto" }, apiKey: DEFAULT_API_KEYS["gemini"] },
  { id: "deepseek", name: "DeepSeek", provider: "deepseek", tokenizer: "tiktoken", contextLimit: 128_000, versions: ["deepseek-chat", "deepseek-coder"], selectedVersion: "deepseek-chat", outPolicy: { mode: "auto" }, apiKey: DEFAULT_API_KEYS["deepseek"] },
  { id: "mistral", name: "Mistral", provider: "mistral", tokenizer: "bytebpe", contextLimit: 64_000, versions: ["mistral-large-latest", "mistral-medium-2312", "mistral-small"], selectedVersion: "mistral-large-latest", outPolicy: { mode: "auto" }, apiKey: DEFAULT_API_KEYS["mistral"] },
  { id: "perplexity", name: "Perplexity", provider: "perplexity", tokenizer: "tiktoken", contextLimit: 32_000, versions: ["sonar-pro", "sonar-small"], selectedVersion: "sonar-pro", outPolicy: { mode: "auto" }, apiKey: DEFAULT_API_KEYS["perplexity"] },
  { id: "kimi", name: "KIMI", provider: "kimi", tokenizer: "tiktoken", contextLimit: 128_000, versions: ["moonshot-v1-8k", "moonshot-v1-32k", "moonshot-v1-128k"], selectedVersion: "moonshot-v1-128k", outPolicy: { mode: "auto" }, apiKey: DEFAULT_API_KEYS["kimi"] },
  { id: "xai", name: "xAI Grok", provider: "xai", tokenizer: "bytebpe", contextLimit: 128_000, versions: ["grok-beta"], selectedVersion: "grok-beta", outPolicy: { mode: "auto" }, endpoint: "", apiKey: DEFAULT_API_KEYS["groq"] },
  { id: "groq", name: "Groq", provider: "groq", tokenizer: "tiktoken", contextLimit: 128_000, versions: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768", "gemma2-9b-it"], selectedVersion: "llama-3.3-70b-versatile", outPolicy: { mode: "auto" }, apiKey: DEFAULT_API_KEYS["groq"] },
  { id: "falcon", name: "Falcon LLM", provider: "falcon", tokenizer: "bytebpe", contextLimit: 128_000, versions: ["falcon-180b-chat", "falcon-40b-instruct", "falcon-7b-instruct", "falcon-mamba-7b", "falcon-11b"], selectedVersion: "falcon-180b-chat", outPolicy: { mode: "auto" }, apiKey: DEFAULT_API_KEYS["huggingface"] },
  { id: "sarvam", name: "Sarvam AI", provider: "sarvam", tokenizer: "tiktoken", contextLimit: 32_000, versions: ["sarvam-2b", "sarvam-1"], selectedVersion: "sarvam-2b", outPolicy: { mode: "auto" }, apiKey: DEFAULT_API_KEYS["sarvam"] },
  { id: "huggingface", name: "HuggingFace Inference", provider: "huggingface", tokenizer: "bytebpe", contextLimit: 64_000, versions: ["hf-model"], selectedVersion: "hf-model", outPolicy: { mode: "auto" }, endpoint: "", apiKey: DEFAULT_API_KEYS["sarvam"] },
  { id: "generic", name: "Custom HTTP Engine", provider: "generic", tokenizer: "bytebpe", contextLimit: 64_000, versions: ["v1"], selectedVersion: "v1", outPolicy: { mode: "auto" }, endpoint: "", apiKey: DEFAULT_API_KEYS["sarvam"] },
];

// ===== Pricing (USD per 1M tokens) — real pricing from providers =====
const BASE_PRICING: Record<string, Record<string, { in: number; out: number; note: string }>> = {
  openai: {
    "gpt-4.1": { in: 10.00, out: 30.00, note: "GPT-4 Turbo - Strong reasoning" },
    "gpt-4o": { in: 2.50, out: 10.00, note: "GPT-4o - Balanced quality" },
    "gpt-4.1-mini": { in: 0.15, out: 0.60, note: "GPT-4o mini - Fast & economical" },
  },
  anthropic: {
    "claude-3.5-sonnet": { in: 3.00, out: 15.00, note: "Claude 3.5 Sonnet - Best performance" },
    "claude-3-5-sonnet-20241022": { in: 3.00, out: 15.00, note: "Claude 3.5 Sonnet (Oct 2024)" },
    "claude-3-haiku": { in: 0.25, out: 1.25, note: "Claude 3 Haiku - Speed optimized" },
    "claude-3-haiku-20240307": { in: 0.25, out: 1.25, note: "Claude 3 Haiku (Mar 2024)" },
  },
  gemini: {
    "gemini-2.0-flash-exp": { in: 0.075, out: 0.30, note: "Gemini 2.0 Flash - Fast multimodal" },
    "gemini-2.0-flash-lite": { in: 0.0375, out: 0.15, note: "Gemini 2.0 Flash Lite - Lighter model" },
    "gemini-2.5-flash-lite": { in: 0.0375, out: 0.15, note: "Gemini 2.5 Flash Lite - Latest light model" },
  },
  deepseek: {
    "deepseek-chat": { in: 0.14, out: 0.28, note: "DeepSeek Chat - Ultra low cost" },
    "deepseek-coder": { in: 0.14, out: 0.28, note: "DeepSeek Coder - Code optimized" },
  },
  mistral: {
    "mistral-large-latest": { in: 8.00, out: 24.00, note: "Competent generalist." },
    "mistral-medium-2312": { in: 4.00, out: 12.00, note: "Balanced performance and cost." },
    "mistral-small": { in: 2.00, out: 6.00, note: "Low‑cost summaries." },
  },
  perplexity: {
    "sonar-pro": { in: 10.00, out: 20.00, note: "Web‑augmented research." },
    "sonar-small": { in: 4.00, out: 8.00, note: "Cheaper web‑aug." },
  },
  kimi: {
    "moonshot-v1-8k": { in: 8.00, out: 16.00, note: "Fast context processing." },
    "moonshot-v1-32k": { in: 12.00, out: 24.00, note: "Extended context support." },
    "moonshot-v1-128k": { in: 20.00, out: 40.00, note: "Large context analysis." },
  },
  xai: {
    "grok-beta": { in: 6.00, out: 12.00, note: "Fast, opinionated." },
  },
  groq: {
    "llama-3.3-70b-versatile": { in: 0.59, out: 0.79, note: "Llama 3.3 70B - Best quality on Groq" },
    "llama-3.1-8b-instant": { in: 0.05, out: 0.08, note: "Llama 3.1 8B - Ultra fast inference" },
    "mixtral-8x7b-32768": { in: 0.24, out: 0.24, note: "Mixtral 8x7B - 32K context MoE" },
    "gemma2-9b-it": { in: 0.20, out: 0.20, note: "Gemma 2 9B - Google's efficient model" },
  },
  falcon: {
    "falcon-180b-chat": { in: 0.80, out: 1.60, note: "Falcon 180B - Top open-source LLM by TII" },
    "falcon-40b-instruct": { in: 0.40, out: 0.80, note: "Falcon 40B - Multilingual, royalty-free" },
    "falcon-7b-instruct": { in: 0.10, out: 0.20, note: "Falcon 7B - Lightweight Apache 2.0" },
    "falcon-mamba-7b": { in: 0.15, out: 0.30, note: "Falcon Mamba 7B - State Space LM" },
    "falcon-11b": { in: 0.20, out: 0.40, note: "Falcon 2 11B - Vision-to-language" },
  },
  sarvam: {
    "sarvam-2b": { in: 0.10, out: 0.30, note: "Sarvam AI 2B - Lightweight & fast" },
    "sarvam-1": { in: 0.20, out: 0.50, note: "Sarvam AI 1 - Balanced performance" },
  },
  huggingface: {
    "hf-model": { in: 3.00, out: 8.00, note: "Depends on your hosted model." },
  },
  generic: {
    "v1": { in: 3.00, out: 8.00, note: "Custom endpoint." },
  },
};

// ===== Helpers =====
function estimateTokens(text: string, tokenizer: Engine["tokenizer"]): number {
  const t = text || "";
  const words = (t.match(/\S+/g) || []).length;
  const chars = t.length;
  if (tokenizer === "tiktoken") return Math.max(1, Math.floor(0.75 * words + 0.002 * chars));
  if (tokenizer === "sentencepiece") return Math.max(1, Math.floor(0.95 * words + 0.003 * chars));
  return Math.max(1, Math.floor(0.6 * words + 0.004 * chars));
}

// Calculate estimated cost for selected engines
function calculateEstimatedCost(
  engines: Engine[], 
  selected: Record<string, boolean>, 
  promptTokens: number,
  expectedOutputTokens: number = 1000 // Default expected output
): { totalCost: number; breakdown: Array<{ engine: string; cost: number; inCost: number; outCost: number }> } {
  const breakdown: Array<{ engine: string; cost: number; inCost: number; outCost: number }> = [];
  let totalCost = 0;
  
  for (const engine of engines) {
    if (!selected[engine.id]) continue;
    
    const providerPricing = BASE_PRICING[engine.provider];
    if (!providerPricing) continue;
    
    const versionPricing = providerPricing[engine.selectedVersion];
    if (!versionPricing) continue;
    
    // Cost per 1M tokens, so divide by 1,000,000
    const inCost = (promptTokens / 1_000_000) * versionPricing.in;
    const outCost = (expectedOutputTokens / 1_000_000) * versionPricing.out;
    const cost = inCost + outCost;
    
    breakdown.push({
      engine: engine.name,
      cost,
      inCost,
      outCost
    });
    
    totalCost += cost;
  }
  
  return { totalCost, breakdown };
}
const rand = (min: number, max: number) => Math.random() * (max - min) + min;
const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

function timeLabel(inTok: number, outTok: number): string {
  const seconds = Math.max(3, Math.round(((inTok + outTok) / 1000) * 3 + 2));
  if (seconds < 20) return "a few seconds";
  if (seconds < 90) return `${seconds}s`;
  const lo = Math.max(1, Math.round(seconds / 90));
  const hi = Math.max(lo, Math.round(seconds / 60));
  return `${lo}–${hi} min`;
}
function outcomeLabel(outCap: number): string {
  if (outCap <= 800) return "Quick summary";
  if (outCap <= 2000) return "Short brief with bullets";
  if (outCap <= 4000) return "Concise report";
  return "Detailed report";
}
// Provider-specific max output token limits (API constraints)
const PROVIDER_MAX_OUTPUT: Record<string, number> = {
  openai: 16384,      // GPT-4o max output
  anthropic: 8192,    // Claude max output
  gemini: 8192,       // Gemini max output
  deepseek: 8192,     // DeepSeek max output
  mistral: 32768,     // Mistral max output
  perplexity: 4096,   // Perplexity max output
  kimi: 8192,         // Kimi/Moonshot max output
  xai: 16384,         // xAI Grok max output
  groq: 8192,         // Groq max output
  huggingface: 4096,  // HuggingFace max output
  sarvam: 4096,       // Sarvam max output
  falcon: 4096,       // Falcon max output
  generic: 4096,      // Generic fallback
};

function computeOutCap(e: Engine, inputTokens: number): number {
  if (e.outPolicy?.mode === "fixed" && e.outPolicy.fixedTokens) return e.outPolicy.fixedTokens;
  
  // Get provider-specific max output limit
  const providerMax = PROVIDER_MAX_OUTPUT[e.provider] || 4096;
  
  // Calculate available context space
  const availableTokens = Math.max(0, e.contextLimit - inputTokens);
  
  // Use the smaller of: provider max limit OR 90% of available context
  return Math.min(providerMax, Math.floor(availableTokens * 0.9));
}

// Configure marked for enhanced markdown rendering
marked.setOptions({
  breaks: true,
  gfm: true,
});

interface OneMindAIProps {
  onOpenAdmin?: () => void;
}

export default function OneMindAI_v14Mobile({ onOpenAdmin }: OneMindAIProps) {
  // ===== Auth (must be first - before any conditional returns) =====
  const { isAuthenticated, isLoading, user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  // ===== Prompt Limits =====
  const LIMITS = {
    PROMPT_SOFT_LIMIT: 5000,    // Warning
    PROMPT_HARD_LIMIT: 10000,   // Block
    PROMPT_CHUNK_SIZE: 4000,    // For chunking
  };

  // ===== MOCK ERROR TESTING (DISABLED) =====
  // Uncomment to enable mock error testing for auto-retry logic
  // Set to '429', '500', '503', or 'random' to simulate errors
  // Set to false for normal operation
  const mockErrorMode: false | '429' | '500' | '503' | 'random' = false; // DISABLED - change to useState to enable
  const mockErrorCounts: Record<string, number> = {}; // DISABLED
  const setMockErrorCounts = (_: any) => {}; // DISABLED - no-op
  const MOCK_FAIL_AFTER_RETRIES = 2; // Succeed after this many retries (to test retry logic)
  // To re-enable, uncomment these lines:
  // const [mockErrorMode, setMockErrorMode] = useState<false | '429' | '500' | '503' | 'random'>(false);
  // const [mockErrorCounts, setMockErrorCounts] = useState<Record<string, number>>({});

  // ===== State =====
  const [prompt, setPrompt] = useState("");
  const [promptWarning, setPromptWarning] = useState<string | null>(null);
  const [engines, setEngines] = useState<Engine[]>(seededEngines);
  const [selected, setSelected] = useState<Record<string, boolean>>({ openai: true, claude: true, deepseek: true, gemini: true, mistral: true });
  const [results, setResults] = useState<RunResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [showBusiness, setShowBusiness] = useState(true);
  const [streamingStates, setStreamingStates] = useState<Record<string, { content: string; isStreaming: boolean }>>({});
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [showTech, setShowTech] = useState(false);
  const [liveMode, setLiveMode] = useState(true);
  const [currentError, setCurrentError] = useState<any>(null);
  const [lastFailedRequest, setLastFailedRequest] = useState<{ engine: Engine; prompt: string; outCap: number } | null>(null);
  const [showEngineRecommendations, setShowEngineRecommendations] = useState(false);
  const [errorQueue, setErrorQueue] = useState<Array<{id: string; error: any; engine: Engine; prompt: string; outCap: number}>>([]);
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const [apiBalances, setApiBalances] = useState<Record<string, { balance: string; loading: boolean; error?: string }>>({});
  const [showBalanceManager, setShowBalanceManager] = useState(false);
  const [localBalances, setLocalBalances] = useState<BalanceRecord[]>([]);

  // ===== Load Local Balances =====
  useEffect(() => {
    setLocalBalances(loadBalances());
  }, [showBalanceManager]); // Reload when balance manager closes

  // ===== Application Startup Logging =====
  useEffect(() => {
    // Initialize auto-recovery system
    initializeAutoRecovery();
    logger.info('✅ Auto-recovery system initialized');
    
    // Browser console logging
    logger.separator();
    logger.header('🚀 OneMindAI Application Started');
    logger.info('Component: OneMindAI_v14Mobile initialized');
    logger.info('Version: v14 Mobile-First Preview');
    logger.info('Platform: Formula2GX Digital Advanced Incubation Labs');
    logger.data('Available Engines', seededEngines.map(e => ({ id: e.id, name: e.name, provider: e.provider })));
    logger.data('Default Selected Engines', Object.keys(selected).filter(k => selected[k]));
    logger.separator();
    
    // Terminal logging
    terminalLogger.appStart();
    terminalLogger.componentMount('OneMindAI_v14Mobile');
  }, []);
  const [expandedEngines, setExpandedEngines] = useState<Set<string>>(new Set());
  const [showGreenGlow, setShowGreenGlow] = useState(false);
  const [priceOverrides, setPriceOverrides] = useState<Record<string, Record<string, { in: number; out: number }>>>({});
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [storyMode, setStoryMode] = useState(true);
  const [storyStep, setStoryStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [compiledDoc, setCompiledDoc] = useState<string>("");
  const [showCombinedResponse, setShowCombinedResponse] = useState(false);
  const [activeEngineTab, setActiveEngineTab] = useState<string>("");
  const [selectedComponents, setSelectedComponents] = useState<Array<{id: string, engineName: string, content: string, type: string}>>([]);
  const [totalBudget, setTotalBudget] = useState<number>(50.00);
  const [totalSpent, setTotalSpent] = useState<number>(0);
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [showExecutiveRoles, setShowExecutiveRoles] = useState(false);
  const [showOtherRoles, setShowOtherRoles] = useState(false);
  const [selectedRoleDetails, setSelectedRoleDetails] = useState<{name: string, category: string} | null>(null);
  const [roleResponsibilities, setRoleResponsibilities] = useState<string>("");
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [selectedSubItem, setSelectedSubItem] = useState<string>("");
  const [expandedPromptId, setExpandedPromptId] = useState<string | null>(null);
  const [consoleVisible, setConsoleVisible] = useState(false);
  const [comingSoonClicked, setComingSoonClicked] = useState(false);
  const [superDebugMode, setSuperDebugMode] = useState(false);

  // ===== Override console.log to control [TERMINAL] logs =====
  useEffect(() => {
    const originalLog = console.log;
    
    console.log = (...args: any[]) => {
      // Check if this is a [TERMINAL] log
      const isTerminalLog = args[0]?.includes?.('[TERMINAL]');
      
      // Only show [TERMINAL] logs if debug mode is enabled
      if (isTerminalLog && !consoleVisible) {
        return; // Suppress the log
      }
      
      // Otherwise, show the log normally
      originalLog(...args);
    };
    
    return () => {
      console.log = originalLog;
    };
  }, [consoleVisible]);
  
  // ===== Toggle console visibility =====
  const toggleConsole = () => {
    const newState = !consoleVisible;
    setConsoleVisible(newState);
    debugModeEnabled = newState; // Update global flag
    
    // Use original console.log to show toggle messages (always visible)
    const originalLog = console.log;
    
    if (newState) {
      // Show instruction to open console
      originalLog('\n' + '='.repeat(80));
      originalLog('[TERMINAL] 🐛 DEBUG MODE ENABLED - Styled logs (INFO, SUCCESS, ERROR) are now visible');
      originalLog('[TERMINAL] 📊 All [TERMINAL] logs are visible in vanilla format');
      originalLog('[TERMINAL] ⌨️  Press F12 or Ctrl+Shift+I to open/close DevTools');
      originalLog('='.repeat(80) + '\n');
    } else {
      originalLog('\n' + '='.repeat(80));
      originalLog('[TERMINAL] 🐛 DEBUG MODE DISABLED - Only vanilla [TERMINAL] logs will show');
      originalLog('[TERMINAL] 🔇 Styled logs (INFO, SUCCESS, ERROR badges) are now hidden');
      originalLog('='.repeat(80) + '\n');
    }
  };

  // ===== Smoke tests (non-UI assertions) =====
  useEffect(() => {
    // Test estimateTokens monotonicity
    const a = estimateTokens("short", "tiktoken");
    const b = estimateTokens("a somewhat longer example text", "tiktoken");
    if (!(b >= a)) console.warn("estimateTokens not monotonic for tiktoken");
    // Test computeOutCap never exceeds context
    const e = seededEngines[0];
    const cap = computeOutCap(e, 1000);
    if (!(cap <= Math.max(0, e.contextLimit - 1000))) console.warn("computeOutCap exceeds free space");
  }, []);

  // Auto-select first engine tab when entering Step 4
  useEffect(() => {
    if (storyMode && storyStep === 4 && !activeEngineTab) {
      const firstSelectedEngine = engines.find(e => selected[e.id]);
      if (firstSelectedEngine) {
        setActiveEngineTab(firstSelectedEngine.id);
      }
    }
  }, [storyMode, storyStep, engines, selected, activeEngineTab]);

  // ===== Helper to highlight [placeholder] text in prompts =====
  const highlightPlaceholders = (text: string, variant: 'default' | 'light' = 'default') => {
    const parts = text.split(/(\[[^\]]+\])/g);
    return parts.map((part, index) => {
      if (part.match(/^\[[^\]]+\]$/)) {
        return (
          <span 
            key={index} 
            className={variant === 'light' 
              ? "bg-purple-50 text-purple-600 px-1 rounded text-[11px]" 
              : "bg-purple-100/80 text-purple-700 px-1.5 py-0.5 rounded-md text-[11px] font-medium"
            }
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  // ===== Brand colours per provider =====
  const providerStyles: Record<string, string> = {
    openai: "bg-[#0F766E]",
    anthropic: "bg-[#4F46E5]",
    gemini: "bg-[#1D4ED8]",
    deepseek: "bg-[#0F172A]",
    mistral: "bg-[#7C3AED]",
    perplexity: "bg-[#111827]",
    kimi: "bg-[#DC2626]",
    xai: "bg-[#0EA5E9]",
    groq: "bg-[#F55036]",
    falcon: "bg-[#8B5CF6]",
    sarvam: "bg-[#FF6B35]",
    huggingface: "bg-[#F59E0B] text-black",
    generic: "bg-[#374151]",
  };

  // ===== Derived pricing with overrides =====
  const pricing = useMemo(() => {
    const merged: any = JSON.parse(JSON.stringify(BASE_PRICING));
    Object.entries(priceOverrides).forEach(([prov, byModel]) => {
      merged[prov] = merged[prov] || {};
      Object.entries(byModel).forEach(([model, val]) => {
        merged[prov][model] = { ...(merged[prov][model] || { note: "override" }), in: val.in, out: val.out, note: (merged[prov][model]?.note || "") + " (override)" };
      });
    });
    return merged as typeof BASE_PRICING;
  }, [priceOverrides]);

  const selectedEngines = useMemo(() => engines.filter(e => selected[e.id]), [engines, selected]);

  useEffect(() => {
    if (!selectedEngines.length) { setActiveTab(null); return; }
    if (!activeTab || !selected[activeTab]) setActiveTab(selectedEngines[0].id);
  }, [selectedEngines, selected]);

  function getPrice(e: Engine) {
    const prov = e.provider;
    const sheet = (pricing as any)[prov] || {};
    return sheet[e.selectedVersion];
  }

  function computePreview(e: Engine, text: string) {
    const P = estimateTokens(text, e.tokenizer);
    const nowIn = Math.min(P, e.contextLimit);
    const outCap = computeOutCap(e, nowIn);
    const minOut = Math.min(outCap, Math.max(200, Math.floor(0.35 * outCap)));
    const pr = getPrice(e);
    // Pricing is per 1M tokens, so divide by 1,000,000
    const minSpend = pr ? (nowIn / 1_000_000) * pr.in + (minOut / 1_000_000) * pr.out : 0;
    const maxSpend = pr ? (nowIn / 1_000_000) * pr.in + (outCap / 1_000_000) * pr.out : 0;
    return { nowIn, outCap, minSpend, maxSpend };
  }

  const previews = useMemo(() => selectedEngines.map(e => ({ e, ...computePreview(e, prompt) })), [selectedEngines, prompt]);

  const totals = useMemo(() => previews.reduce((a, p) => {
    a.min += p.minSpend; a.max += p.maxSpend; a.inTok += p.nowIn; a.outTok += p.outCap; return a;
  }, { min: 0, max: 0, inTok: 0, outTok: 0 }), [previews]);

  function warningForEngine(e: Engine): string | null {
    if (!liveMode) return null;
    if (["huggingface", "generic"].includes(e.provider) && !e.endpoint) return "Endpoint required in Live mode.";
    if (!e.apiKey && !["huggingface", "generic"].includes(e.provider)) return "API key missing; will fall back to Mock.";
    return null;
  }

  // Clean error message - convert technical errors to user-friendly messages
  function cleanErrorMessage(error: any, engineName: string, provider: string): string {
    const errorStr = String(error?.message || error || 'Unknown error');
    const statusCode = error?.status || error?.statusCode || error?.code;
    
    // Remove HTML tags and extract meaningful content
    const withoutHtml = errorStr.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    
    // ===== xAI Grok Specific Error Handling =====
    if (provider === 'xai') {
      // 400 Bad Request
      if (statusCode === 400 || withoutHtml.includes('400') || withoutHtml.includes('Bad Request')) {
        if (withoutHtml.includes('invalid argument') || withoutHtml.includes('invalid param')) {
          return `❌ ${engineName}: Invalid request parameters. Please check your prompt format.`;
        }
        if (withoutHtml.includes('incorrect API key') || withoutHtml.includes('api key')) {
          return `🔑 ${engineName}: Incorrect API key format. Please verify your xAI API key.`;
        }
        return `❌ ${engineName}: Bad request. Please check your input and try again.`;
      }
      
      // 401 Unauthorized
      if (statusCode === 401 || withoutHtml.includes('401') || withoutHtml.includes('Unauthorized')) {
        return `🔑 ${engineName}: Invalid or missing API key. Get a new key at console.x.ai`;
      }
      
      // 403 Forbidden
      if (statusCode === 403 || withoutHtml.includes('403') || withoutHtml.includes('Forbidden')) {
        if (withoutHtml.includes('blocked')) {
          return `🚫 ${engineName}: Your API key/team is blocked. Please contact xAI support.`;
        }
        return `🚫 ${engineName}: Permission denied. Ask your team admin for access or check console.x.ai`;
      }
      
      // 404 Not Found
      if (statusCode === 404 || withoutHtml.includes('404') || withoutHtml.includes('Not Found')) {
        if (withoutHtml.includes('model')) {
          return `❓ ${engineName}: Model not found. Please select a valid Grok model version.`;
        }
        return `❓ ${engineName}: Endpoint not found. Please check the API configuration.`;
      }
      
      // 405 Method Not Allowed
      if (statusCode === 405 || withoutHtml.includes('405') || withoutHtml.includes('Method Not Allowed')) {
        return `⚠️ ${engineName}: Invalid request method. This is a configuration error.`;
      }
      
      // 415 Unsupported Media Type
      if (statusCode === 415 || withoutHtml.includes('415') || withoutHtml.includes('Unsupported Media Type')) {
        return `⚠️ ${engineName}: Invalid content type. Ensure request is JSON formatted.`;
      }
      
      // 422 Unprocessable Entity
      if (statusCode === 422 || withoutHtml.includes('422') || withoutHtml.includes('Unprocessable Entity')) {
        return `❌ ${engineName}: Invalid request format. Please check your prompt structure.`;
      }
      
      // 429 Too Many Requests (Rate Limit)
      if (statusCode === 429 || withoutHtml.includes('429') || withoutHtml.includes('Too Many Requests') || withoutHtml.includes('rate limit')) {
        return `⏱️ ${engineName}: Rate limit exceeded. Reduce request frequency or increase limit at console.x.ai`;
      }
      
      // 202 Accepted (Deferred completion)
      if (statusCode === 202 || withoutHtml.includes('202') || withoutHtml.includes('queued')) {
        return `⏳ ${engineName}: Request queued for processing. Response will be available shortly.`;
      }
      
      // 5XX Server Errors
      if (statusCode >= 500 || withoutHtml.includes('500') || withoutHtml.includes('502') || withoutHtml.includes('503') || withoutHtml.includes('504')) {
        return `⚠️ ${engineName}: xAI server error. Check status at status.x.ai`;
      }
    }
    
    // ===== Groq Specific Error Handling =====
    if (provider === 'groq') {
      // 400 Bad Request
      if (statusCode === 400 || withoutHtml.includes('400') || withoutHtml.includes('Bad Request')) {
        return `❌ ${engineName}: Invalid request syntax. Review your request format.`;
      }
      
      // 401 Unauthorized
      if (statusCode === 401 || withoutHtml.includes('401') || withoutHtml.includes('Unauthorized')) {
        return `🔑 ${engineName}: Invalid API key. Get a new key at console.groq.com`;
      }
      
      // 403 Forbidden
      if (statusCode === 403 || withoutHtml.includes('403') || withoutHtml.includes('Forbidden')) {
        return `🚫 ${engineName}: Permission denied. Check your API permissions at console.groq.com`;
      }
      
      // 404 Not Found
      if (statusCode === 404 || withoutHtml.includes('404') || withoutHtml.includes('Not Found')) {
        return `❓ ${engineName}: Resource not found. Check the model name and endpoint URL.`;
      }
      
      // 413 Request Entity Too Large
      if (statusCode === 413 || withoutHtml.includes('413') || withoutHtml.includes('Too Large')) {
        return `📦 ${engineName}: Request too large. Please reduce your prompt size.`;
      }
      
      // 422 Unprocessable Entity
      if (statusCode === 422 || withoutHtml.includes('422') || withoutHtml.includes('Unprocessable')) {
        if (withoutHtml.includes('hallucination')) {
          return `🤖 ${engineName}: Model hallucination detected. Please retry your request.`;
        }
        return `❌ ${engineName}: Semantic error in request. Verify data correctness.`;
      }
      
      // 424 Failed Dependency (MCP issues)
      if (statusCode === 424 || withoutHtml.includes('424') || withoutHtml.includes('Failed Dependency')) {
        return `🔗 ${engineName}: Dependent request failed (MCP auth issue). Check Remote MCP config.`;
      }
      
      // 429 Too Many Requests
      if (statusCode === 429 || withoutHtml.includes('429') || withoutHtml.includes('Too Many Requests') || withoutHtml.includes('rate limit')) {
        return `⏱️ ${engineName}: Rate limit exceeded. Implement throttling or wait before retrying.`;
      }
      
      // 498 Flex Tier Capacity Exceeded (Groq custom)
      if (statusCode === 498 || withoutHtml.includes('498') || withoutHtml.includes('Flex Tier')) {
        return `📊 ${engineName}: Flex tier at capacity. Try again later.`;
      }
      
      // 499 Request Cancelled (Groq custom)
      if (statusCode === 499 || withoutHtml.includes('499') || withoutHtml.includes('Cancelled')) {
        return `🚫 ${engineName}: Request was cancelled.`;
      }
      
      // 500 Internal Server Error
      if (statusCode === 500 || withoutHtml.includes('500') || withoutHtml.includes('Internal Server Error')) {
        return `⚠️ ${engineName}: Groq server error. Try again later or contact support.`;
      }
      
      // 502 Bad Gateway
      if (statusCode === 502 || withoutHtml.includes('502') || withoutHtml.includes('Bad Gateway')) {
        return `⚠️ ${engineName}: Bad gateway. This may be temporary - retry the request.`;
      }
      
      // 503 Service Unavailable
      if (statusCode === 503 || withoutHtml.includes('503') || withoutHtml.includes('Service Unavailable')) {
        return `⚠️ ${engineName}: Service unavailable (maintenance/overload). Wait and retry.`;
      }
      
      // 206 Partial Content
      if (statusCode === 206 || withoutHtml.includes('206') || withoutHtml.includes('Partial Content')) {
        return `📄 ${engineName}: Partial content delivered. Check if this is expected.`;
      }
    }
    
    // ===== Falcon LLM Specific Error Handling (via HuggingFace) =====
    if (provider === 'falcon') {
      // 400 Bad Request
      if (statusCode === 400 || withoutHtml.includes('400') || withoutHtml.includes('Bad Request')) {
        return `❌ ${engineName}: Invalid request format. Check your prompt structure.`;
      }
      
      // 401 Unauthorized
      if (statusCode === 401 || withoutHtml.includes('401') || withoutHtml.includes('Unauthorized')) {
        return `🔑 ${engineName}: Invalid HuggingFace API token. Get one at huggingface.co/settings/tokens`;
      }
      
      // 403 Forbidden
      if (statusCode === 403 || withoutHtml.includes('403') || withoutHtml.includes('Forbidden')) {
        return `🚫 ${engineName}: Access denied. You may need to accept the model's license on HuggingFace.`;
      }
      
      // 404 Not Found
      if (statusCode === 404 || withoutHtml.includes('404') || withoutHtml.includes('Not Found')) {
        return `❓ ${engineName}: Model not found. Check model name at huggingface.co/tiiuae`;
      }
      
      // 413 Payload Too Large
      if (statusCode === 413 || withoutHtml.includes('413') || withoutHtml.includes('Too Large')) {
        return `📦 ${engineName}: Input too large. Reduce your prompt size.`;
      }
      
      // 429 Rate Limit
      if (statusCode === 429 || withoutHtml.includes('429') || withoutHtml.includes('Too Many Requests') || withoutHtml.includes('rate limit')) {
        return `⏱️ ${engineName}: Rate limit exceeded. Wait before retrying or upgrade your HuggingFace plan.`;
      }
      
      // 500 Internal Server Error
      if (statusCode === 500 || withoutHtml.includes('500') || withoutHtml.includes('Internal Server Error')) {
        return `⚠️ ${engineName}: Server error. The model may be loading - try again in a moment.`;
      }
      
      // 502 Bad Gateway
      if (statusCode === 502 || withoutHtml.includes('502') || withoutHtml.includes('Bad Gateway')) {
        return `⚠️ ${engineName}: Bad gateway. Model may be initializing - retry shortly.`;
      }
      
      // 503 Service Unavailable / Model Loading
      if (statusCode === 503 || withoutHtml.includes('503') || withoutHtml.includes('Service Unavailable') || withoutHtml.includes('loading')) {
        return `⏳ ${engineName}: Model is loading. Please wait ~20-60 seconds and retry.`;
      }
      
      // Timeout
      if (withoutHtml.includes('timeout') || withoutHtml.includes('Timeout')) {
        return `⏰ ${engineName}: Request timed out. The model may be under heavy load.`;
      }
      
      // Model unavailable
      if (withoutHtml.includes('unavailable') || withoutHtml.includes('Unavailable')) {
        return `⚠️ ${engineName}: Model temporarily unavailable. Try a different Falcon variant.`;
      }
    }
    
    // ===== Mistral Specific Error Handling =====
    if (provider === 'mistral') {
      // Extract detail from JSON error format {"detail":"Unauthorized"}
      const detailMatch = withoutHtml.match(/"detail"\s*:\s*"([^"]+)"/i);
      const errorDetail = detailMatch ? detailMatch[1] : '';
      
      // 401 Unauthorized
      if (statusCode === 401 || withoutHtml.includes('401') || withoutHtml.includes('Unauthorized') || errorDetail.toLowerCase() === 'unauthorized') {
        return `🔑 ${engineName}: API key invalid or missing. Get your key at console.mistral.ai/api-keys`;
      }
      
      // 400 Bad Request
      if (statusCode === 400 || withoutHtml.includes('400') || withoutHtml.includes('Bad Request')) {
        if (withoutHtml.includes('role')) {
          return `❌ ${engineName}: Invalid role field. Mistral uses "user", "assistant", "tool" - not "system".`;
        }
        return `❌ ${engineName}: Invalid request format. Check your prompt structure.`;
      }
      
      // 403 Forbidden
      if (statusCode === 403 || withoutHtml.includes('403') || withoutHtml.includes('Forbidden')) {
        return `🚫 ${engineName}: Access denied. Check API key permissions at console.mistral.ai`;
      }
      
      // 404 Not Found
      if (statusCode === 404 || withoutHtml.includes('404') || withoutHtml.includes('Not Found')) {
        return `❓ ${engineName}: Model not found. Codestral models need codestral.mistral.ai endpoint.`;
      }
      
      // 422 Validation Error
      if (statusCode === 422 || withoutHtml.includes('422') || withoutHtml.includes('Validation') || withoutHtml.includes('HTTPValidationError')) {
        return `❌ ${engineName}: Validation error - unsupported parameters. Check Mistral API docs.`;
      }
      
      // 429 Rate Limit
      if (statusCode === 429 || withoutHtml.includes('429') || withoutHtml.includes('Too Many Requests') || withoutHtml.includes('rate limit') || withoutHtml.includes('service tier capacity')) {
        return `⏱️ ${engineName}: Rate limit exceeded. Free tier has strict limits - upgrade at console.mistral.ai`;
      }
      
      // Connection Error
      if (withoutHtml.includes('connection') || withoutHtml.includes('ConnectError') || withoutHtml.includes('network')) {
        return `🌐 ${engineName}: Cannot connect to Mistral API. Check your internet connection.`;
      }
      
      // Timeout
      if (withoutHtml.includes('timeout') || withoutHtml.includes('Timeout') || withoutHtml.includes('timed out')) {
        return `⏰ ${engineName}: Request timed out. Try again or reduce prompt size.`;
      }
      
      // 500+ Server Errors
      if (statusCode >= 500 || withoutHtml.includes('500') || withoutHtml.includes('502') || withoutHtml.includes('503') || withoutHtml.includes('504')) {
        return `⚠️ ${engineName}: Mistral server error. Try again in a few moments.`;
      }
      
      // If we extracted a detail, show it
      if (errorDetail) {
        return `❌ ${engineName}: ${errorDetail}. Check your API configuration.`;
      }
    }
    
    // ===== Anthropic/Claude Specific Error Handling =====
    if (provider === 'anthropic') {
      // 401 - Authentication Error
      if (statusCode === 401 || withoutHtml.includes('401') || withoutHtml.includes('authentication_error') || 
          withoutHtml.includes('invalid api key') || withoutHtml.includes('invalid_api_key')) {
        return `🔑 ${engineName}: Invalid or expired API key. Get your key at console.anthropic.com`;
      }
      
      // 403 - Permission Error
      if (statusCode === 403 || withoutHtml.includes('403') || withoutHtml.includes('permission_error') ||
          withoutHtml.includes('forbidden')) {
        return `🚫 ${engineName}: API key lacks required permissions. Check your Anthropic console settings.`;
      }
      
      // 404 - Not Found
      if (statusCode === 404 || withoutHtml.includes('404') || withoutHtml.includes('not_found_error') ||
          withoutHtml.includes('not found')) {
        return `❓ ${engineName}: Model or resource not found. Check the model name (e.g., claude-3-5-sonnet-20241022).`;
      }
      
      // 413 - Request Too Large
      if (statusCode === 413 || withoutHtml.includes('413') || withoutHtml.includes('request_too_large') ||
          withoutHtml.includes('too large')) {
        return `📦 ${engineName}: Request too large. Maximum is 32 MB. Please reduce your input size.`;
      }
      
      // 429 - Rate Limit
      if (statusCode === 429 || withoutHtml.includes('429') || withoutHtml.includes('rate_limit_error') ||
          withoutHtml.includes('rate limit') || withoutHtml.includes('too many requests')) {
        return `⏱️ ${engineName}: Rate limit exceeded. System will retry automatically.`;
      }
      
      // 500 - API Error
      if (statusCode === 500 || withoutHtml.includes('500') || withoutHtml.includes('api_error') ||
          withoutHtml.includes('internal error')) {
        return `⚠️ ${engineName}: Anthropic server error. System will retry automatically.`;
      }
      
      // 529 - Overloaded
      if (statusCode === 529 || withoutHtml.includes('529') || withoutHtml.includes('overloaded_error') ||
          withoutHtml.includes('overloaded')) {
        return `⏳ ${engineName}: API temporarily overloaded. System will retry automatically.`;
      }
      
      // Connection errors
      if (withoutHtml.includes('connection') || withoutHtml.includes('network') || withoutHtml.includes('timeout')) {
        return `🌐 ${engineName}: Network connection issue. Check your internet and try again.`;
      }
    }
    
    // ===== OpenAI Specific Error Handling =====
    if (provider === 'openai') {
      // PRIORITY 1: Authentication errors (check BEFORE connection errors!)
      // OpenAI SDK may wrap auth errors with connection-related messages
      if (statusCode === 401 || 
          withoutHtml.includes('401') || 
          withoutHtml.includes('invalid_api_key') || 
          withoutHtml.includes('incorrect api key') || 
          withoutHtml.includes('invalid api key') ||
          withoutHtml.includes('authentication failed') ||
          withoutHtml.includes('unauthorized') ||
          (withoutHtml.includes('authentication') && !withoutHtml.includes('timeout'))) {
        return `🔑 ${engineName}: Invalid or expired API key. Get your key at platform.openai.com/api-keys`;
      }
      
      // 403 - Permission Error
      if (statusCode === 403 || withoutHtml.includes('403') || withoutHtml.includes('permission') ||
          withoutHtml.includes('forbidden')) {
        return `🚫 ${engineName}: API key lacks required permissions. Check your OpenAI dashboard.`;
      }
      
      // 404 - Not Found
      if (statusCode === 404 || withoutHtml.includes('404') || 
          (withoutHtml.includes('model') && withoutHtml.includes('not found')) ||
          withoutHtml.includes('does not exist')) {
        return `❓ ${engineName}: Model not found. Check the model name (e.g., gpt-4, gpt-3.5-turbo).`;
      }
      
      // 429 - Rate Limit / Quota
      if (statusCode === 429 || withoutHtml.includes('429') || withoutHtml.includes('rate_limit') ||
          withoutHtml.includes('rate limit') || withoutHtml.includes('too many requests')) {
        return `⏱️ ${engineName}: Rate limit exceeded. System will retry automatically.`;
      }
      
      // Quota/Billing
      if (withoutHtml.includes('insufficient_quota') || withoutHtml.includes('billing') ||
          withoutHtml.includes('exceeded your current quota')) {
        return `💳 ${engineName}: No credits remaining. Add credits at platform.openai.com/account/billing`;
      }
      
      // 500 - Server Error
      if (statusCode === 500 || withoutHtml.includes('500') || withoutHtml.includes('internal error')) {
        return `⚠️ ${engineName}: OpenAI server error. System will retry automatically.`;
      }
      
      // 502/503 - Overloaded
      if (statusCode === 502 || statusCode === 503 || withoutHtml.includes('502') || withoutHtml.includes('503') ||
          withoutHtml.includes('overloaded') || withoutHtml.includes('bad gateway')) {
        return `⏳ ${engineName}: OpenAI servers overloaded. System will retry automatically.`;
      }
      
      // Token limit
      if (withoutHtml.includes('context_length') || withoutHtml.includes('maximum context length')) {
        return `📏 ${engineName}: Request exceeds token limit. Reduce your prompt length.`;
      }
      
      // Content policy
      if (withoutHtml.includes('content_policy') || withoutHtml.includes('safety') || withoutHtml.includes('flagged')) {
        return `🚫 ${engineName}: Content flagged by safety system. Modify your prompt.`;
      }
      
      // Connection errors (LAST - only if no other error matched)
      if (withoutHtml.includes('connection') || withoutHtml.includes('network') || withoutHtml.includes('timeout')) {
        return `🌐 ${engineName}: Network connection issue. Check your internet and try again.`;
      }
    }
    
    // ===== Common Error Patterns (All Providers) =====
    
    // Check for common error patterns
    if (withoutHtml.includes('401') || withoutHtml.includes('Authorization Required') || withoutHtml.includes('invalid_api_key')) {
      return `🔑 Invalid or expired API key for ${engineName}. Please update your API key.`;
    }
    
    if (withoutHtml.includes('403') || withoutHtml.includes('Forbidden')) {
      return `🚫 Access denied for ${engineName}. Your API key may not have permission for this operation.`;
    }
    
    if (withoutHtml.includes('429') || withoutHtml.includes('rate limit') || withoutHtml.includes('Too Many Requests')) {
      return `⏱️ Rate limit exceeded for ${engineName}. Please wait a moment and try again.`;
    }
    
    if (withoutHtml.includes('500') || withoutHtml.includes('502') || withoutHtml.includes('503') || withoutHtml.includes('504') || withoutHtml.includes('Internal Server Error')) {
      return `⚠️ ${engineName} server is experiencing issues. Please try again in a few moments.`;
    }
    
    if (withoutHtml.includes('timeout') || withoutHtml.includes('ETIMEDOUT')) {
      return `⏰ Request to ${engineName} timed out. The server took too long to respond.`;
    }
    
    if (withoutHtml.includes('network') || withoutHtml.includes('ECONNREFUSED') || withoutHtml.includes('Failed to fetch')) {
      return `🌐 Network error connecting to ${engineName}. Please check your internet connection.`;
    }
    
    if (withoutHtml.includes('quota') || withoutHtml.includes('insufficient_quota')) {
      return `💳 API quota exceeded for ${engineName}. You may need to upgrade your plan or add credits.`;
    }
    
    // If error is too long (likely HTML), provide generic message
    if (withoutHtml.length > 200) {
      return `❌ ${engineName} request failed. Please check your API key and try again.`;
    }
    
    // Return cleaned error if it's short and meaningful
    return `❌ ${engineName}: ${withoutHtml.substring(0, 150)}`;
  }

  // Streaming helper functions
  function updateStreamingContent(engineId: string, content: string, isStreaming: boolean) {
    setStreamingStates(prev => ({
      ...prev,
      [engineId]: { content, isStreaming }
    }));
  }

  function clearStreamingContent(engineId: string) {
    setStreamingStates(prev => {
      const newState = { ...prev };
      delete newState[engineId];
      return newState;
    });
  }

  async function* streamFromProvider(e: Engine, prompt: string, outCap: number) {
    // ===== Super Debug: Function Entry =====
    superDebugBus.emit('FUNCTION_ENTER', `streamFromProvider() called for ${e.name}`, {
      engineId: e.id,
      engineName: e.name,
      provider: e.provider,
      variables: { promptLength: prompt.length, outCap, version: e.selectedVersion },
      codeSnippet: `async function* streamFromProvider(e: Engine, prompt: string, outCap: number) {\n  // Provider: ${e.provider}\n  // Max tokens: ${outCap}\n}`
    });
    superDebugBus.emit('PIPELINE_STEP', `API call preparation for ${e.name}`, {
      engineId: e.id,
      provider: e.provider
    });
    
    logger.separator();
    logger.step(4, `streamFromProvider() called for ${e.name}`);
    logger.data('Engine Config', { id: e.id, provider: e.provider, version: e.selectedVersion });
    
    // CRITICAL: Limit prompt length to avoid API 400 errors
    const MAX_PROMPT_LENGTH = 7000;
    if (prompt.length > MAX_PROMPT_LENGTH) {
      console.warn(`[${e.name}] Prompt too long (${prompt.length} chars). Truncating to ${MAX_PROMPT_LENGTH} chars.`);
      prompt = prompt.substring(0, MAX_PROMPT_LENGTH) + "\n\n[Note: Your prompt was truncated because it exceeded the maximum length of 7,000 characters. Please provide a shorter, more focused question for better results.]";
    }
    logger.data('Input Prompt Length', `${prompt.length} characters`);
    logger.data('Max Output Tokens', outCap);
    
    // Terminal logging
    terminalLogger.functionCall('streamFromProvider', {
      engineName: e.name,
      provider: e.provider,
      promptLength: prompt.length,
      maxOutputTokens: outCap
    });
    
    // Enhance prompt with uploaded file content
    let enhancedPrompt = prompt;
    
    // Add text files content to prompt
    const textFiles = uploadedFiles.filter(f => 
      f.name.endsWith('.txt') || f.type === 'text/plain'
    );
    
    if (textFiles.length > 0) {
      logger.info(`📁 Processing ${textFiles.length} text file(s)`);
      enhancedPrompt += '\n\n--- Uploaded Text Files ---\n';
      textFiles.forEach(file => {
        logger.data(`Text File: ${file.name}`, `${file.extractedText?.length || 0} characters`);
        terminalLogger.fileProcessed(file.name, file.type, file.size, file.extractedText?.length || 0);
        enhancedPrompt += `\n📝 ${file.name}:\n${file.extractedText}\n`;
      });
    }
    
    // Add Word document content to prompt
    const wordDocs = uploadedFiles.filter(f => 
      f.name.endsWith('.docx') || f.name.endsWith('.doc')
    );
    
    if (wordDocs.length > 0) {
      logger.info(`📄 Processing ${wordDocs.length} Word document(s)`);
      enhancedPrompt += '\n\n--- Uploaded Document Content ---\n';
      wordDocs.forEach(doc => {
        logger.data(`Word Doc: ${doc.name}`, `${doc.extractedText?.length || 0} characters`);
        enhancedPrompt += `\n📄 ${doc.name}:\n${doc.extractedText}\n`;
      });
    }
    
    // Add JSON files content to prompt
    const jsonFiles = uploadedFiles.filter(f => 
      f.name.endsWith('.json') || f.type === 'application/json'
    );
    
    if (jsonFiles.length > 0) {
      logger.info(`📋 Processing ${jsonFiles.length} JSON file(s)`);
      enhancedPrompt += '\n\n--- Uploaded JSON Files ---\n';
      jsonFiles.forEach(file => {
        logger.data(`JSON File: ${file.name}`, `${file.extractedText?.length || 0} characters`);
        enhancedPrompt += `\n📋 ${file.name}:\n${file.extractedText}\n`;
      });
    }
    
    // Add PDF references
    const pdfs = uploadedFiles.filter(f => f.name.endsWith('.pdf'));
    if (pdfs.length > 0) {
      enhancedPrompt += '\n\n--- Uploaded PDF Files ---\n';
      pdfs.forEach(pdf => {
        enhancedPrompt += `\n📕 ${pdf.name} (${(pdf.size / 1024).toFixed(2)} KB)\n`;
      });
    }
    
    // Add Excel/CSV references
    const dataFiles = uploadedFiles.filter(f => 
      f.name.endsWith('.xlsx') || f.name.endsWith('.xls') || f.name.endsWith('.csv')
    );
    if (dataFiles.length > 0) {
      enhancedPrompt += '\n\n--- Uploaded Data Files ---\n';
      dataFiles.forEach(file => {
        enhancedPrompt += `\n📊 ${file.name} (${(file.size / 1024).toFixed(2)} KB)\n`;
      });
    }
    
    // Check if we should use the proxy (no API key) or direct calls (has API key)
    const useProxy = !e.apiKey;
    const supportedProviders = ['anthropic', 'openai', 'gemini', 'mistral', 'perplexity', 'kimi', 'deepseek', 'xai', 'groq', 'falcon', 'sarvam'];
    
    if (!liveMode || !supportedProviders.includes(e.provider)) {
      yield `⚠️ ${e.name} is not configured for live streaming. Provider not supported.`;
      return;
    }
    
    // If using proxy, route through backend
    if (useProxy) {
      try {
        const proxyUrl = import.meta.env.NEXT_PUBLIC_BACKEND_URL || import.meta.env.VITE_PROXY_URL || 'http://localhost:3002';
        const providerEndpoint = `${proxyUrl}/api/${e.provider === 'anthropic' ? 'anthropic' : e.provider}`;
        
        const response = await fetch(providerEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: enhancedPrompt }],
            model: e.selectedVersion,
            max_tokens: outCap,
            stream: true,
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Proxy request failed' }));
          yield `⚠️ ${e.name}: ${errorData.error || `HTTP ${response.status}`}`;
          return;
        }
        
        // Handle streaming response
        const reader = response.body?.getReader();
        if (!reader) {
          yield `⚠️ ${e.name}: No response stream available`;
          return;
        }
        
        const decoder = new TextDecoder();
        let buffer = '';
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content || 
                               parsed.delta?.text ||
                               parsed.content?.[0]?.text || '';
                if (content) yield content;
              } catch {
                // Skip non-JSON lines
              }
            }
          }
        }
        return;
      } catch (proxyError) {
        yield `⚠️ ${e.name}: Proxy server not available. Run 'npm run proxy' to start it.`;
        return;
      }
    }

    try {
      // ===== MOCK ERROR INJECTION FOR TESTING =====
      // Must be INSIDE try block so errors are caught by the error handling logic
      if (mockErrorMode) {
        const engineRetryCount = mockErrorCounts[e.id] || 0;
        const shouldFail = mockErrorMode === 'random' 
          ? Math.random() > 0.5 
          : true;
        
        if (shouldFail && engineRetryCount < MOCK_FAIL_AFTER_RETRIES) {
          // Increment retry count for this engine
          setMockErrorCounts(prev => ({ ...prev, [e.id]: (prev[e.id] || 0) + 1 }));
          
          const mockErrors: Record<string, { status: number; message: string }> = {
            '429': { 
              status: 429, 
              message: `Rate limit exceeded. You are sending requests too quickly. Please retry after 30 seconds.` 
            },
            '500': { 
              status: 500, 
              message: `Internal server error. The ${e.provider} API is experiencing issues.` 
            },
            '503': { 
              status: 503, 
              message: `Service temporarily unavailable. The ${e.provider} API is overloaded.` 
            },
            'random': {
              status: [429, 500, 503][Math.floor(Math.random() * 3)],
              message: `Random mock error for testing`
            }
          };
          
          const mockError = mockErrors[mockErrorMode] || mockErrors['429'];
          
          console.log(`🧪 [MOCK ERROR] Simulating ${mockError.status} error for ${e.name} (attempt ${engineRetryCount + 1}/${MOCK_FAIL_AFTER_RETRIES})`);
          
          const error: any = new Error(mockError.message);
          error.status = mockError.status;
          error.statusCode = mockError.status;
          error.provider = e.provider;
          error.engine = e.name;
          
          throw error;
        } else if (engineRetryCount >= MOCK_FAIL_AFTER_RETRIES) {
          console.log(`✅ [MOCK] ${e.name} succeeding after ${engineRetryCount} retries`);
          // Reset for next run
          setMockErrorCounts(prev => ({ ...prev, [e.id]: 0 }));
        }
      }

      if (e.provider === 'anthropic') {
        const { default: Anthropic } = await import('@anthropic-ai/sdk');
        
        // Super Debug: Library trigger for Anthropic SDK
        superDebugBus.emitLibrary(
          '@anthropic-ai/sdk',
          'messages.create',
          'Streaming response from Claude API',
          prompt.substring(0, 100),
          undefined
        );
        
        const client = new Anthropic({
          apiKey: e.apiKey,
          dangerouslyAllowBrowser: true,
        });

        // Check if there are images to send
        const images = uploadedFiles.filter(f => f.type.startsWith('image/'));
        
        let messageContent: any;
        
        if (images.length > 0) {
          // Send with images using Claude's vision API
          messageContent = [
            { type: 'text', text: enhancedPrompt },
            ...images.map(img => ({
              type: 'image',
              source: {
                type: 'base64',
                media_type: img.type,
                data: img.content.split(',')[1], // Remove data:image/png;base64, prefix
              }
            }))
          ];
        } else {
          // Text only
          messageContent = enhancedPrompt;
        }

        // Wrap API call with auto-recovery
        const makeClaudeRequest = async () => {
          return await client.messages.create({
            model: e.selectedVersion,
            max_tokens: Math.max(outCap, 8000),
            temperature: 0.7,
            messages: [{ role: 'user', content: messageContent }],
            stream: true,
          });
        };

        let stream;
        try {
          // Try with auto-recovery for rate limits
          stream = await autoFixRateLimit(
            'claude',
            makeClaudeRequest,
            (status) => {
              logger.info(`[Claude Auto-Recovery] ${status}`);
              updateStreamingContent(e.id, `${status}\n\nPlease wait...`, true);
            }
          );
        } catch (firstError: any) {
          // If rate limit fix failed, try server error recovery (500, 529)
          if (firstError.statusCode === 500 || firstError.statusCode === 529 || firstError.status === 500 || firstError.status === 529) {
            try {
              stream = await autoFixServerError(
                'claude',
                makeClaudeRequest,
                (status) => {
                  logger.info(`[Claude Auto-Recovery] ${status}`);
                  updateStreamingContent(e.id, `${status}\n\nPlease wait...`, true);
                }
              );
            } catch (secondError: any) {
              // All auto-recovery attempts failed
              throw secondError;
            }
          } else {
            throw firstError;
          }
        }

        logger.success('Claude streaming started');
        
        // Super Debug: Stream started
        superDebugBus.emit('STREAM_START', `Claude stream started for ${e.name}`, {
          engineId: e.id,
          provider: 'anthropic'
        });

        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            yield event.delta.text;
          }
        }
        
        // Super Debug: Stream ended
        superDebugBus.emit('STREAM_END', `Claude stream completed for ${e.name}`, {
          engineId: e.id,
          provider: 'anthropic'
        });
      } else if (e.provider === 'openai') {
        logger.step(5, 'Initializing OpenAI SDK');
        const { default: OpenAI } = await import('openai');
        
        // Super Debug: Library trigger for OpenAI SDK
        superDebugBus.emitLibrary(
          'openai',
          'chat.completions.create',
          'Streaming response from ChatGPT API',
          prompt.substring(0, 100),
          undefined
        );
        
        const client = new OpenAI({
          apiKey: e.apiKey,
          dangerouslyAllowBrowser: true,
        });
        logger.info('OpenAI client initialized successfully');

        // Check if there are images to send (GPT-4 Vision)
        const images = uploadedFiles.filter(f => f.type.startsWith('image/'));
        
        let messageContent: any;
        
        if (images.length > 0 && e.selectedVersion.includes('gpt-4')) {
          // Send with images using GPT-4 Vision
          messageContent = [
            { type: 'text', text: enhancedPrompt },
            ...images.map(img => ({
              type: 'image_url',
              image_url: {
                url: img.content, // Full data URL
              }
            }))
          ];
        } else {
          // Text only
          messageContent = enhancedPrompt;
        }

        // Check if the prompt is asking for image generation
        const imageGenPrompts = [
          "generate an image", "create an image", "draw", "make a picture", 
          "create art", "generate art", "dall-e", "image of", "picture of"
        ];
        const isImageGenRequest = imageGenPrompts.some(prompt => 
          enhancedPrompt.toLowerCase().includes(prompt)
        );

        if (isImageGenRequest && e.selectedVersion.includes('gpt-4')) {
          // Use DALL-E for image generation
          try {
            const imageResponse = await client.images.generate({
              model: "dall-e-3",
              prompt: enhancedPrompt,
              n: 1,
              size: "1024x1024",
              quality: "standard",
            });

            if (imageResponse.data && imageResponse.data[0]?.url) {
              yield `![Generated Image](${imageResponse.data[0].url})`;
              return;
            }
          } catch (error) {
            // Fallback to text if image generation fails
            console.warn('DALL-E generation failed, falling back to text:', error);
          }
        }

        logger.step(6, 'Making OpenAI API call');
        logger.data('API Request', {
          model: e.selectedVersion,
          max_tokens: Math.max(outCap, 8000),
          temperature: 0.7,
          stream: true,
          hasImages: images.length > 0
        });
        
// ===== Test Error Injection (temporary) =====
        // Set TEST_ERROR to '429' or '500' to simulate errors, or null to disable
        const TEST_ERROR: '429' | '500' | null = null;  // ← DISABLED - Normal operation
        // =============================================

        // Wrap API call with auto-recovery
        const makeOpenAIRequest = async () => {
          // Inject test error INSIDE the request function so retry manager catches it
          if (TEST_ERROR === '429') {
            const err: any = new Error('429: Rate limit exceeded');
            err.statusCode = 429;
            err.status = 429;
            throw err;
          }
          if (TEST_ERROR === '500') {
            const err: any = new Error('500: Internal server error');
            err.statusCode = 500;
            err.status = 500;
            throw err;
          }
          
          return await client.chat.completions.create({
            model: e.selectedVersion,
            messages: [{ role: 'user', content: messageContent }],
            max_tokens: Math.max(outCap, 8000),
            temperature: 0.7,
            stream: true,
          });
        };

        let stream;
        try {
          // Try with auto-recovery for rate limits and server errors
          stream = await autoFixRateLimit(
            'openai',
            makeOpenAIRequest,
            (status) => {
              // Update UI with retry status
              logger.info(`[OpenAI Auto-Recovery] ${status}`);
              updateStreamingContent(e.id, `${status}\n\nPlease wait...`, true);
            }
          );
        } catch (firstError: any) {
          // If rate limit fix failed, try server error recovery
          if (firstError.statusCode === 500 || firstError.statusCode === 503) {
            try {
              stream = await autoFixServerError(
                'openai',
                makeOpenAIRequest,
                (status) => {
                  logger.info(`[OpenAI Auto-Recovery] ${status}`);
                  updateStreamingContent(e.id, `${status}\n\nPlease wait...`, true);
                }
              );
            } catch (secondError: any) {
              // All auto-recovery attempts failed
              throw secondError;
            }
          } else {
            throw firstError;
          }
        }

        logger.success('OpenAI streaming started');
        terminalLogger.streamStart(e.name);
        terminalLogger.apiCallStart('OpenAI', e.selectedVersion, {
          maxTokens: Math.max(outCap, 8000),
          temperature: 0.7,
          stream: true
        });
        
        let chunkCount = 0;
        let totalChars = 0;
        const streamStartTime = Date.now();
        
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            chunkCount++;
            totalChars += content.length;
            
            // Browser console logging
            if (chunkCount === 1) logger.info('First chunk received');
            if (chunkCount % 50 === 0) logger.info(`Received ${chunkCount} chunks...`);
            
            // Terminal logging - detailed chunk info
            terminalLogger.chunkReceived(e.name, chunkCount, content, {
              totalCharsReceived: totalChars,
              avgChunkSize: (totalChars / chunkCount).toFixed(2)
            });
            
            yield content;
          }
        }
        
        const streamDuration = Date.now() - streamStartTime;
        logger.success(`OpenAI streaming complete - Total chunks: ${chunkCount}`);
        terminalLogger.streamEnd(e.name, chunkCount, totalChars, streamDuration);
        terminalLogger.apiCallEnd('OpenAI', streamDuration, chunkCount, totalChars);
      } else if (e.provider === 'gemini') {
// ===== Test Error Injection for Gemini (temporary) =====
        // Set GEMINI_TEST_ERROR to simulate errors, or null to disable
        // Options: '429' (rate limit), '500' (internal), '503' (unavailable), '504' (deadline), 
        //          '400' (invalid), '403' (permission), '404' (not found), 'safety' (safety block)
        const GEMINI_TEST_ERROR: '429' | '500' | '503' | '504' | '400' | '403' | '404' | 'safety' | null = null;  // ← DISABLED - Normal operation
        // =============================================

        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        
        // Super Debug: Library trigger for Google Generative AI
        superDebugBus.emitLibrary(
          '@google/generative-ai',
          'generateContentStream',
          'Streaming response from Gemini API',
          prompt.substring(0, 100),
          undefined
        );
        
        const genAI = new GoogleGenerativeAI(e.apiKey);
        
        // Check if there are images to send
        const images = uploadedFiles.filter(f => f.type.startsWith('image/'));
        
        let contentParts: any[];
        
        if (images.length > 0) {
          // Send with images
          contentParts = [
            { text: enhancedPrompt },
            ...images.map(img => ({
              inlineData: {
                mimeType: img.type,
                data: img.content.split(',')[1], // Remove data:image/png;base64, prefix
              }
            }))
          ];
        } else {
          // Text only
          contentParts = [{ text: enhancedPrompt }];
        }

        // Wrap API call with auto-recovery
        const makeGeminiRequest = async () => {
          // Test error injection INSIDE the request function
          if (GEMINI_TEST_ERROR === '429') {
            const err: any = new Error('429: RESOURCE_EXHAUSTED - Rate limit exceeded');
            err.statusCode = 429;
            err.status = 429;
            throw err;
          }
          if (GEMINI_TEST_ERROR === '500') {
            const err: any = new Error('500: INTERNAL - Unexpected error on Google\'s side');
            err.statusCode = 500;
            err.status = 500;
            throw err;
          }
          if (GEMINI_TEST_ERROR === '503') {
            const err: any = new Error('503: UNAVAILABLE - Service temporarily overloaded');
            err.statusCode = 503;
            err.status = 503;
            throw err;
          }
          if (GEMINI_TEST_ERROR === '504') {
            const err: any = new Error('504: DEADLINE_EXCEEDED - Processing took too long');
            err.statusCode = 504;
            err.status = 504;
            throw err;
          }
          if (GEMINI_TEST_ERROR === '400') {
            const err: any = new Error('400: INVALID_ARGUMENT - Request body is malformed');
            err.statusCode = 400;
            err.status = 400;
            throw err;
          }
          if (GEMINI_TEST_ERROR === '403') {
            const err: any = new Error('403: PERMISSION_DENIED - API key lacks required permissions');
            err.statusCode = 403;
            err.status = 403;
            throw err;
          }
          if (GEMINI_TEST_ERROR === '404') {
            const err: any = new Error('404: NOT_FOUND - Requested resource not found');
            err.statusCode = 404;
            err.status = 404;
            throw err;
          }
          if (GEMINI_TEST_ERROR === 'safety') {
            const err: any = new Error('SAFETY_BLOCK - Content blocked by safety filters');
            err.statusCode = 0;
            err.status = 'blocked';
            throw err;
          }
          
          const model = genAI.getGenerativeModel({ 
            model: e.selectedVersion,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: Math.max(outCap, 8000),
            },
          });

          return await model.generateContentStream(contentParts);
        };

        let result;
        try {
          // Try with auto-recovery for rate limits
          result = await autoFixRateLimit(
            'gemini',
            makeGeminiRequest,
            (status) => {
              logger.info(`[Gemini Auto-Recovery] ${status}`);
              updateStreamingContent(e.id, `${status}\n\nPlease wait...`, true);
            }
          );
        } catch (firstError: any) {
          // If rate limit fix failed, try server error recovery
          if (firstError.statusCode === 500 || firstError.statusCode === 503 || firstError.statusCode === 504) {
            try {
              result = await autoFixServerError(
                'gemini',
                makeGeminiRequest,
                (status) => {
                  logger.info(`[Gemini Auto-Recovery] ${status}`);
                  updateStreamingContent(e.id, `${status}\n\nPlease wait...`, true);
                }
              );
            } catch (secondError: any) {
              // All auto-recovery attempts failed
              throw secondError;
            }
          } else {
            throw firstError;
          }
        }

        logger.success('Gemini streaming started');
        
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            yield text;
          }
        }
      } else if (e.provider === 'mistral') {
        // Super Debug: Library trigger for Mistral API
        superDebugBus.emitLibrary(
          'Fetch API',
          'fetch',
          'Streaming response from Mistral API',
          prompt.substring(0, 100),
          undefined
        );
        
        // Wrap API call with auto-recovery
        const makeMistralRequest = async () => {
          // Use proxy if no API key, otherwise direct API call
          const apiUrl = e.apiKey 
            ? 'https://api.mistral.ai/v1/chat/completions'
            : `${import.meta.env.NEXT_PUBLIC_BACKEND_URL || import.meta.env.VITE_PROXY_URL || 'http://localhost:3002'}/api/mistral`;
          
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(e.apiKey && { 'Authorization': `Bearer ${e.apiKey}` }),
            },
            body: JSON.stringify({
              model: e.selectedVersion,
              messages: [{ role: 'user', content: enhancedPrompt }],
              max_tokens: Math.max(outCap, 8000),
              temperature: 0.7,
              stream: true,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = errorText;
            try {
              const errorJson = JSON.parse(errorText);
              errorMessage = errorJson.error?.message || errorJson.message || errorText;
            } catch {
              // Use raw text if JSON parse fails
            }
            
            const error: any = new Error(`Mistral API error: ${errorMessage}`);
            error.statusCode = response.status;
            error.status = response.status;
            error.response = response;
            throw error;
          }

          return response;
        };

        let response;
        try {
          // Try with auto-recovery for rate limits
          response = await autoFixRateLimit(
            'mistral',
            makeMistralRequest,
            (status) => {
              logger.info(`[Mistral Auto-Recovery] ${status}`);
              updateStreamingContent(e.id, `${status}\n\nPlease wait...`, true);
            }
          );
        } catch (firstError: any) {
          // If rate limit fix failed, try server error recovery
          if (firstError.statusCode === 500 || firstError.statusCode === 502 || firstError.statusCode === 503 || firstError.statusCode === 504) {
            try {
              response = await autoFixServerError(
                'mistral',
                makeMistralRequest,
                (status) => {
                  logger.info(`[Mistral Auto-Recovery] ${status}`);
                  updateStreamingContent(e.id, `${status}\n\nPlease wait...`, true);
                }
              );
            } catch (secondError: any) {
              // All auto-recovery attempts failed
              throw secondError;
            }
          } else {
            throw firstError;
          }
        }

        logger.success('Mistral streaming started');

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('No response body');
        }

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') return;

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices[0]?.delta?.content;
                  if (content) {
                    yield content;
                  }
                } catch {
                  // Ignore parsing errors
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      } else if (e.provider === 'perplexity') {
        const apiKey = e.apiKey || DEFAULT_API_KEYS['perplexity'];
        
        logger.info(`Calling Perplexity API with model: ${e.selectedVersion}`);
        logger.data('API Key Status', { 
          hasKey: !!apiKey, 
          keyPrefix: apiKey ? apiKey.substring(0, 8) + '...' : 'none' 
        });
        
        // Wrap API call with auto-recovery
        const makePerplexityRequest = async () => {
          const response = await fetch('/api/perplexity/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: e.selectedVersion,
              messages: [{ role: 'user', content: enhancedPrompt }],
              max_tokens: Math.max(outCap, 8000),
              temperature: 0.7,
              stream: true,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = errorText;
            try {
              const errorJson = JSON.parse(errorText);
              errorMessage = errorJson.error?.message || errorJson.message || errorText;
            } catch {
              // Use raw text if JSON parse fails
            }
            
            const error: any = new Error(`Perplexity API error: ${errorMessage}`);
            error.statusCode = response.status;
            error.status = response.status;
            error.response = response;
            throw error;
          }

          return response;
        };

        let response;
        try {
          // Try with auto-recovery for rate limits
          response = await autoFixRateLimit(
            'perplexity',
            makePerplexityRequest,
            (status) => {
              logger.info(`[Perplexity Auto-Recovery] ${status}`);
              updateStreamingContent(e.id, `${status}\n\nPlease wait...`, true);
            }
          );
        } catch (firstError: any) {
          // If rate limit fix failed, try server error recovery
          if (firstError.statusCode === 500 || firstError.statusCode === 502 || firstError.statusCode === 503 || firstError.statusCode === 504) {
            try {
              response = await autoFixServerError(
                'perplexity',
                makePerplexityRequest,
                (status) => {
                  logger.info(`[Perplexity Auto-Recovery] ${status}`);
                  updateStreamingContent(e.id, `${status}\n\nPlease wait...`, true);
                }
              );
            } catch (secondError: any) {
              // All auto-recovery attempts failed
              throw secondError;
            }
          } else {
            throw firstError;
          }
        }

        logger.success('Perplexity streaming started');

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (reader) {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split('\n');

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  if (data === '[DONE]') return;

                  try {
                    const parsed = JSON.parse(data);
                    const content = parsed.choices[0]?.delta?.content;
                    if (content) {
                      yield content;
                    }
                  } catch {
                    // Ignore parsing errors
                  }
                }
              }
            }
          } finally {
            reader.releaseLock();
          }
        }
      } else if (e.provider === 'kimi') {
        // Wrap API call with auto-recovery
        const makeKimiRequest = async () => {
          const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${e.apiKey}`,
            },
            body: JSON.stringify({
              model: e.selectedVersion,
              messages: [{ role: 'user', content: enhancedPrompt }],
              max_tokens: Math.max(outCap, 8000),
              temperature: 0.7,
              stream: true,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = errorText;
            try {
              const errorJson = JSON.parse(errorText);
              errorMessage = errorJson.error?.message || errorJson.message || errorText;
            } catch {
              // Use raw text if JSON parse fails
            }
            
            const error: any = new Error(`KIMI API error: ${errorMessage}`);
            error.statusCode = response.status;
            error.status = response.status;
            error.response = response;
            throw error;
          }

          return response;
        };

        let response;
        try {
          // Try with auto-recovery for rate limits
          response = await autoFixRateLimit(
            'kimi',
            makeKimiRequest,
            (status) => {
              logger.info(`[Kimi Auto-Recovery] ${status}`);
              updateStreamingContent(e.id, `${status}\n\nPlease wait...`, true);
            }
          );
        } catch (firstError: any) {
          // If rate limit fix failed, try server error recovery
          if (firstError.statusCode === 500 || firstError.statusCode === 502 || firstError.statusCode === 503 || firstError.statusCode === 504) {
            try {
              response = await autoFixServerError(
                'kimi',
                makeKimiRequest,
                (status) => {
                  logger.info(`[Kimi Auto-Recovery] ${status}`);
                  updateStreamingContent(e.id, `${status}\n\nPlease wait...`, true);
                }
              );
            } catch (secondError: any) {
              // All auto-recovery attempts failed
              throw secondError;
            }
          } else {
            throw firstError;
          }
        }

        logger.success('Kimi streaming started');

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (reader) {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split('\n');

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  if (data === '[DONE]') return;

                  try {
                    const parsed = JSON.parse(data);
                    const content = parsed.choices[0]?.delta?.content;
                    if (content) {
                      yield content;
                    }
                  } catch {
                    // Ignore parsing errors
                  }
                }
              }
            }
          } finally {
            reader.releaseLock();
          }
        }
      } else if (e.provider === 'deepseek') {
        // Super Debug: Library trigger for DeepSeek API
        superDebugBus.emitLibrary(
          'Fetch API',
          'fetch',
          'Streaming response from DeepSeek API',
          prompt.substring(0, 100),
          undefined
        );
        
        // Define the request function for the retry manager
        const makeDeepSeekRequest = async () => {
          // Use proxy if no API key, otherwise direct API call
          const apiUrl = e.apiKey 
            ? 'https://api.deepseek.com/v1/chat/completions'
            : `${import.meta.env.NEXT_PUBLIC_BACKEND_URL || import.meta.env.VITE_PROXY_URL || 'http://localhost:3002'}/api/deepseek`;
          
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(e.apiKey && { 'Authorization': `Bearer ${e.apiKey}` }),
            },
            body: JSON.stringify({
              model: e.selectedVersion,
              messages: [{ role: 'user', content: enhancedPrompt }],
              max_tokens: Math.max(outCap, 8000),
              temperature: 0.7,
              stream: true,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = errorText;
            try {
              const errorJson = JSON.parse(errorText);
              errorMessage = errorJson.error?.message || errorJson.message || errorText;
            } catch {
              // Use raw text if JSON parse fails
            }
            
            // Throw an object with statusCode for the retry manager to inspect
            const error: any = new Error(`DeepSeek API error: ${errorMessage}`);
            error.statusCode = response.status;
            error.status = response.status;
            error.response = response;
            throw error;
          }

          return response;
        };

        let response;
        try {
          // Try with Rate Limit Auto-Fix
          response = await autoFixRateLimit(
            'deepseek',
            makeDeepSeekRequest,
            (status) => {
              logger.info(`[DeepSeek Auto-Recovery] ${status}`);
              updateStreamingContent(e.id, `${status}\n\nPlease wait...`, true);
            }
          );
        } catch (firstError: any) {
          // Fallback to Server Error Auto-Fix if applicable
          if (firstError.statusCode === 500 || firstError.statusCode === 503) {
            response = await autoFixServerError(
              'deepseek',
              makeDeepSeekRequest,
              (status) => {
                logger.info(`[DeepSeek Auto-Recovery] ${status}`);
                updateStreamingContent(e.id, `${status}\n\nPlease wait...`, true);
              }
            );
          } else {
            throw firstError;
          }
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (reader) {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split('\n');

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  if (data === '[DONE]') return;

                  try {
                    const parsed = JSON.parse(data);
                    const content = parsed.choices[0]?.delta?.content;
                    if (content) {
                      yield content;
                    }
                  } catch {
                    // Ignore parsing errors
                  }
                }
              }
            }
          } finally {
            reader.releaseLock();
          }
        }
      } else if (e.provider === 'xai') {
        // xAI Grok using OpenAI-compatible API
        logger.step(5, 'Initializing xAI Grok with OpenAI SDK');
        const { default: OpenAI } = await import('openai');
        const client = new OpenAI({
          apiKey: e.apiKey,
          baseURL: 'https://api.x.ai/v1',
          dangerouslyAllowBrowser: true,
        });
        logger.info('xAI Grok client initialized successfully');

        const stream = await client.chat.completions.create({
          model: e.selectedVersion,
          messages: [{ role: 'user', content: enhancedPrompt }],
          max_tokens: Math.max(outCap, 8000),
          temperature: 0.7,
          stream: true,
        });

        logger.success('xAI Grok streaming started');

        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            yield content;
          }
        }
      } else if (e.provider === 'groq') {
        // Groq using OpenAI-compatible API
        logger.step(5, 'Initializing Groq with OpenAI SDK');
        const { default: OpenAI } = await import('openai');
        const client = new OpenAI({
          apiKey: e.apiKey,
          baseURL: 'https://api.groq.com/openai/v1',
          dangerouslyAllowBrowser: true,
        });
        logger.info('Groq client initialized successfully');

        const stream = await client.chat.completions.create({
          model: e.selectedVersion,
          messages: [{ role: 'user', content: enhancedPrompt }],
          max_tokens: Math.max(outCap, 8000),
          temperature: 0.7,
          stream: true,
        });

        logger.success('Groq streaming started');

        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            yield content;
          }
        }
      } else if (e.provider === 'falcon') {
        // Falcon LLM via HuggingFace Inference API
        logger.step(5, 'Initializing Falcon LLM with HuggingFace API');
        
        const makeHuggingFaceRequest = async () => {
          const response = await fetch(`https://api-inference.huggingface.co/models/tiiuae/${e.selectedVersion}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${e.apiKey}`,
            },
            body: JSON.stringify({
              inputs: enhancedPrompt,
              parameters: {
                max_new_tokens: Math.max(outCap, 8000),
                temperature: 0.7,
                return_full_text: false,
                stream: true,
              },
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = errorText;
            try {
              const errorJson = JSON.parse(errorText);
              errorMessage = errorJson.error || errorText;
            } catch {
              // Use raw text if JSON parse fails
            }
            
            const error: any = new Error(`Falcon API error: ${errorMessage}`);
            error.statusCode = response.status;
            error.status = response.status;
            error.response = response;
            throw error;
          }

          return response;
        };

        const response = await makeHuggingFaceRequest();
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (reader) {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              
              try {
                const parsed = JSON.parse(chunk);
                if (parsed.token?.text) {
                  yield parsed.token.text;
                } else if (parsed.generated_text) {
                  yield parsed.generated_text;
                } else if (typeof parsed === 'string') {
                  yield parsed;
                }
              } catch {
                // If not JSON, yield as is
                if (chunk.trim()) {
                  yield chunk;
                }
              }
            }
          } finally {
            reader.releaseLock();
          }
        }
      } else if (e.provider === 'sarvam') {
        // Sarvam AI using their API
        logger.step(5, 'Initializing Sarvam AI');
        
        const makeSarvamRequest = async () => {
          const response = await fetch('https://api.sarvam.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${e.apiKey}`,
            },
            body: JSON.stringify({
              model: e.selectedVersion,
              messages: [{ role: 'user', content: enhancedPrompt }],
              max_tokens: Math.max(outCap, 8000),
              temperature: 0.7,
              stream: true,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = errorText;
            try {
              const errorJson = JSON.parse(errorText);
              errorMessage = errorJson.error?.message || errorJson.message || errorText;
            } catch {
              // Use raw text if JSON parse fails
            }
            
            const error: any = new Error(`Sarvam API error: ${errorMessage}`);
            error.statusCode = response.status;
            error.status = response.status;
            error.response = response;
            throw error;
          }

          return response;
        };

        const response = await makeSarvamRequest();
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (reader) {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split('\n');

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  if (data === '[DONE]') return;

                  try {
                    const parsed = JSON.parse(data);
                    const content = parsed.choices[0]?.delta?.content;
                    if (content) {
                      yield content;
                    }
                  } catch {
                    // Ignore parsing errors
                  }
                }
              }
            }
          } finally {
            reader.releaseLock();
          }
        }
      }
    } catch (error: any) {
      // ===== Super Debug: Error Caught =====
      superDebugBus.emitError(error, {
        provider: e.provider,
        engineId: e.id,
        engineName: e.name,
        functionName: 'streamFromProvider'
      });
      superDebugBus.emitFileHandoff('OneMindAI.tsx', 'ErrorRecoveryPanel.tsx', 'Enhanced Error Object');
      
      // Log the full error structure to understand what we're dealing with
      console.log(`[streamFromProvider] RAW ERROR OBJECT for ${e.name}:`, error);
      console.log(`[streamFromProvider] error.status:`, error.status);
      console.log(`[streamFromProvider] error.statusCode:`, error.statusCode);
      console.log(`[streamFromProvider] error.status_code:`, error.status_code);
      console.log(`[streamFromProvider] error.error:`, error.error);
      console.log(`[streamFromProvider] error.response:`, error.response);
      
      // Extract status code from various possible locations (Anthropic SDK, OpenAI SDK, etc.)
      let extractedStatusCode = 
        error.status || 
        error.statusCode || 
        error.status_code || 
        error.error?.status ||
        error.error?.status_code ||
        error.response?.status ||
        error.response?.statusCode ||
        (typeof error.code === 'number' ? error.code : undefined);
      
      // Fallback: Try to parse status code from error message if not found in object
      if (!extractedStatusCode && error.message) {
        const statusMatch = error.message.match(/\b(40[0-9]|50[0-9]|429)\b/);
        if (statusMatch) {
          extractedStatusCode = parseInt(statusMatch[1]);
          console.log(`[streamFromProvider] Extracted status ${extractedStatusCode} from error message`);
        }
      }
      
      // Extract error type for Anthropic errors
      const errorType = error.error?.type || error.type || '';
      
      console.log(`[streamFromProvider] EXTRACTED STATUS CODE:`, extractedStatusCode);
      console.log(`[streamFromProvider] Error for ${e.name}:`, {
        message: error.message,
        status: extractedStatusCode,
        errorType,
        fullError: JSON.stringify(error).substring(0, 500)
      });
      
      // Extract the truly raw error message from the API
      let rawApiMessage = 'Unknown error occurred';
      try {
        // Try to get the most detailed error message available
        if (error.error?.message) {
          rawApiMessage = error.error.message; // Anthropic SDK nested error
        } else if (error.message) {
          rawApiMessage = error.message; // Direct error message
        }
        
        // For some APIs, the full error details are in error.error
        if (error.error && typeof error.error === 'object') {
          // Include error type and message if available
          const errorDetails = [];
          if (error.error.type) errorDetails.push(`Type: ${error.error.type}`);
          if (error.error.message) errorDetails.push(error.error.message);
          if (errorDetails.length > 0) {
            rawApiMessage = errorDetails.join(' | ');
          }
        }
      } catch (e) {
        console.error('[streamFromProvider] Error extracting raw message:', e);
      }
      
      // Clean the error message for user-friendly display
      const cleanedMessage = cleanErrorMessage(error, e.name, e.provider);
      
      // Enhanced error handling with recovery engine
      const enhancedError = {
        message: rawApiMessage, // Show the REAL error from API, not cleaned version
        cleanedMessage: cleanedMessage, // Keep cleaned version for reference
        rawMessage: rawApiMessage, // Real raw error from API
        rawJson: JSON.stringify(error, null, 2), // Full error JSON for debugging
        statusCode: extractedStatusCode,
        status: extractedStatusCode,
        code: extractedStatusCode,
        type: errorType, // Include error type for analysis
        provider: e.provider,
        engine: e.name,
        originalError: {
          ...error,
          message: error.message || 'Unknown error occurred',
          statusCode: extractedStatusCode,
          status: extractedStatusCode,
          type: errorType,
          // Preserve the error's error object for Anthropic SDK
          error: error.error || undefined
        }
      };
      
      // Store failed request details for retry
      setLastFailedRequest({ engine: e, prompt, outCap });
      
      // Set current error for display in the error panel
      setCurrentError(enhancedError);
      
      // Throw cleaned error message
      throw new Error(cleanedMessage);
    }
  }

  // Retry handler for auto-fixable errors
  async function handleRetry() {
    if (!lastFailedRequest) {
      logger.warning('No failed request to retry');
      return;
    }

    const { engine, prompt: failedPrompt, outCap } = lastFailedRequest;
    
    logger.separator();
    logger.header('🔄 USER CLICKED "RETRY"');
    logger.info(`Retrying request for engine: ${engine.name}`);
    
    // Clear error state
    setCurrentError(null);
    setLastFailedRequest(null);
    
    // Clear the error result from results array so retry messages are visible
    setResults(prev => prev.filter(r => r.engineId !== engine.id));
    
    // Initialize streaming state
    updateStreamingContent(engine.id, '', true);
    
    const startTime = Date.now();
    let fullContent = '';
    let tokenCount = 0;

    try {
      // Retry the streaming request
      for await (const chunk of streamFromProvider(engine, failedPrompt, outCap)) {
        fullContent += chunk;
        tokenCount++;
        updateStreamingContent(engine.id, fullContent, true);
      }

      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);
      
      logger.success(`✅ Retry successful for ${engine.name} in ${duration}s`);
      
      // Mark streaming as complete
      updateStreamingContent(engine.id, fullContent, false);
      
      // Update results
      const { nowIn, outCap: estOutCap, minSpend, maxSpend } = computePreview(engine, failedPrompt);

      // ===== CREDIT DEDUCTION (after successful manual retry) =====
      const estimatedInputTokens = estimateTokens(failedPrompt, engine.tokenizer);
      const estimatedOutputTokens = estimateTokens(fullContent, engine.tokenizer);
      
      if (user?.id) {
        const creditsToDeduct = calculateCredits(
          engine.provider,
          engine.selectedVersion,
          estimatedInputTokens,
          estimatedOutputTokens
        );
        
        if (creditsToDeduct > 0) {
          const deductResult = await deductCredits(
            user.id,
            creditsToDeduct,
            engine.provider,
            engine.selectedVersion,
            estimatedInputTokens + estimatedOutputTokens,
            `API call to ${engine.name} (${engine.selectedVersion}) - manual retry`
          );
          
          if (deductResult.success) {
            logger.success(`[Credits] Deducted ${creditsToDeduct} credits for ${engine.name} (manual retry). New balance: ${deductResult.newBalance}`);
          }
        }
      }

      setResults((prev: RunResult[]) => {
        const filtered = prev.filter(r => r.engineId !== engine.id);
        return [...filtered, {
          engineId: engine.id,
          engineName: engine.name,
          version: engine.selectedVersion,
          tokensIn: nowIn,
          tokensOut: tokenCount,
          estIn: nowIn,
          estOutCap: estOutCap,
          estMinSpend: minSpend,
          estMaxSpend: maxSpend,
          costUSD: maxSpend,
          durationMs: parseFloat(duration) * 1000,
          warnings: [],
          attempts: 1,
          reason: 'Manual retry successful',
          success: true,
          responsePreview: fullContent.substring(0, 200),
          isStreaming: false,
          streamingContent: fullContent,
        }];
      });
    } catch (error: any) {
      logger.error(`❌ Retry failed for ${engine.name}: ${error.message}`);
      updateStreamingContent(engine.id, `Error: ${error.message}`, false);
      
      // Restore error states so retry button appears again
      const enhancedError = {
        message: error.message,
        statusCode: error.status || error.statusCode,
        provider: engine.provider,
        engine: engine.name,
        originalError: error
      };
      
      setCurrentError(enhancedError);
      setLastFailedRequest({ engine, prompt: failedPrompt, outCap });
      
      // Don't throw - let the error panel stay visible
    }
  }

  // 🧪 TEST FUNCTION: Simulate Multiple Errors
  function simulateMultipleErrors() {
    logger.separator();
    logger.header('🧪 SIMULATING MULTIPLE ERRORS FOR TESTING');
    
    // Clear existing errors
    setErrorQueue([]);
    setCurrentError(null);
    
    // Simulate 3 different error types from 3 different engines
    const testEngines = engines.slice(0, 3); // Get first 3 engines
    
    const errorTypes = [
      {
        statusCode: 429,
        message: 'Rate limit exceeded. Please try again in 20 seconds.',
        type: 'Rate Limit'
      },
      {
        statusCode: 500,
        message: 'Internal server error. The AI service is temporarily unavailable.',
        type: 'Server Error'
      },
      {
        statusCode: 401,
        message: 'Invalid API key provided. Please check your authentication credentials.',
        type: 'Authentication Error'
      }
    ];
    
    testEngines.forEach((engine, index) => {
      const errorType = errorTypes[index];
      const enhancedError = {
        message: errorType.message,
        statusCode: errorType.statusCode,
        provider: engine.provider,
        engine: engine.name,
        originalError: new Error(errorType.message)
      };
      
      const errorId = `test-${engine.id}-${Date.now()}-${index}`;
      
      setTimeout(() => {
        setErrorQueue(prev => [...prev, {
          id: errorId,
          error: enhancedError,
          engine: engine,
          prompt: 'Test prompt for error simulation',
          outCap: 1000
        }]);
        
        logger.error(`Simulated ${errorType.type} for ${engine.name}`);
      }, index * 500); // Stagger errors by 500ms each
    });
    
    logger.success('✅ Simulated 3 errors - check top-right corner!');
  }

  // ===== Prompt Change Handler with Limits =====
  const handlePromptChange = (value: string) => {
    if (value.length > LIMITS.PROMPT_HARD_LIMIT) {
      setPromptWarning(`❌ Prompt too long (${value.length.toLocaleString()} chars). Maximum is ${LIMITS.PROMPT_HARD_LIMIT.toLocaleString()} characters.`);
      // Auto-clear warning after 5 seconds
      setTimeout(() => setPromptWarning(null), 5000);
      return; // Block input
    } else if (value.length > LIMITS.PROMPT_SOFT_LIMIT) {
      setPromptWarning(`⚠️ Large prompt (${value.length.toLocaleString()} chars). Consider breaking into smaller requests for better results.`);
      // Auto-clear warning after 5 seconds
      setTimeout(() => setPromptWarning(null), 5000);
    } else {
      setPromptWarning(null);
    }
    
    setPrompt(value);
  };

  async function runAll() {
    if (selectedEngines.length === 0 || !prompt.trim()) {
      logger.warning('Cannot run: No engines selected or empty prompt');
      return;
    }
    
    // ===== Super Debug: Pipeline Start =====
    superDebugBus.emit('PIPELINE_START', 'User clicked "Run Live" - Starting execution pipeline', {
      details: {
        selectedEngines: selectedEngines.map(e => e.name),
        promptLength: prompt.length,
        filesUploaded: uploadedFiles.length
      },
      codeSnippet: `async function runAll() {\n  // Selected: ${selectedEngines.map(e => e.name).join(', ')}\n  // Prompt: ${prompt.length} chars\n}`
    });
    superDebugBus.emit('FUNCTION_ENTER', 'runAll() function called', {
      variables: {
        selectedEngines: selectedEngines.length,
        promptLength: prompt.length,
        uploadedFiles: uploadedFiles.length
      }
    });
    
    logger.separator();
    logger.header('🎯 USER CLICKED "RUN LIVE"');
    logger.step(1, 'runAll() function called');
    logger.data('Selected Engines', selectedEngines.map(e => e.name));
    logger.data('Prompt', `"${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"`);
    logger.data('Uploaded Files', uploadedFiles.map(f => ({ name: f.name, size: f.size, type: f.type })));
    
    setIsRunning(true);
    setResults([]);
    setStreamingStates({});
    
    // Super Debug: State update
    superDebugBus.emitStateUpdate('isRunning', false, true);
    superDebugBus.emitStateUpdate('results', '[]', '[]');
    superDebugBus.emitStateUpdate('streamingStates', '{}', '{}');

    // Initialize streaming states
    selectedEngines.forEach(e => {
      updateStreamingContent(e.id, '', true);
    });

    logger.step(2, 'Starting parallel engine processing');
    const runs = selectedEngines.map(async (e) => {
      logger.separator();
      logger.step(3, `Processing engine: ${e.name}`);
      const { nowIn, outCap, minSpend, maxSpend } = computePreview(e, prompt);
      logger.data('Token Calculation', {
        inputTokens: nowIn,
        maxOutputTokens: outCap,
        minCost: `$${minSpend.toFixed(4)}`,
        maxCost: `$${maxSpend.toFixed(4)}`
      });
      
      const startTime = Date.now();
      let fullContent = '';
      let tokenCount = 0;

      try {
        // Start streaming (prompt truncation handled in streamFromProvider)
        updateStreamingContent(e.id, '', true);

        for await (const chunk of streamFromProvider(e, prompt, outCap)) {
          fullContent += chunk;
          tokenCount++;
          updateStreamingContent(e.id, fullContent, true);
          
          // Super Debug: Chunk received and merged
          superDebugBus.emitChunk(chunk, e.id, fullContent);
          
          // No artificial delay - true real-time streaming
        }

        // Finish streaming
        updateStreamingContent(e.id, fullContent, false);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        logger.success(`${e.name} completed in ${elapsed}s - ${fullContent.length} characters`);
        
        // Super Debug: Pipeline step - streaming complete
        superDebugBus.emit('PIPELINE_STEP', `${e.name} streaming completed`, {
          engineId: e.id,
          engineName: e.name,
          details: { duration: elapsed, contentLength: fullContent.length }
        });
        
        // Super Debug: File handoff to markdown renderer
        superDebugBus.emitFileHandoff('OneMindAI.tsx', 'EnhancedMarkdownRenderer.tsx', 'Streaming content for rendering');

        const endTime = Date.now();
        const duration = endTime - startTime;

        // Estimate token counts (since we don't have exact counts from streaming)
        const estimatedInputTokens = estimateTokens(prompt, e.tokenizer);
        const estimatedOutputTokens = estimateTokens(fullContent, e.tokenizer);
        
        const pricing = getPrice(e);
        const inputCost = pricing ? (estimatedInputTokens / 1_000_000) * pricing.in : 0;
        const outputCost = pricing ? (estimatedOutputTokens / 1_000_000) * pricing.out : 0;

        // ===== CREDIT DEDUCTION (after successful API response) =====
        // Only deduct credits if user is authenticated
        if (user?.id) {
          const creditsToDeduct = calculateCredits(
            e.provider,
            e.selectedVersion,
            estimatedInputTokens,
            estimatedOutputTokens
          );
          
          if (creditsToDeduct > 0) {
            const deductResult = await deductCredits(
              user.id,
              creditsToDeduct,
              e.provider,
              e.selectedVersion,
              estimatedInputTokens + estimatedOutputTokens,
              `API call to ${e.name} (${e.selectedVersion})`
            );
            
            if (deductResult.success) {
              logger.success(`[Credits] Deducted ${creditsToDeduct} credits for ${e.name}. New balance: ${deductResult.newBalance}`);
            } else {
              logger.warning(`[Credits] Failed to deduct credits: ${deductResult.error}`);
            }
          } else {
            logger.info(`[Credits] No credits charged for ${e.name} (free tier or zero cost)`);
          }
        }

        return {
          engineId: e.id,
          engineName: e.name,
          version: e.selectedVersion,
          tokensIn: estimatedInputTokens,
          tokensOut: estimatedOutputTokens,
          estIn: nowIn,
          estOutCap: outCap,
          estMinSpend: minSpend,
          estMaxSpend: maxSpend,
          costUSD: inputCost + outputCost,
          durationMs: duration,
          warnings: [],
          attempts: 1,
          reason: 'Streaming completed successfully',
          success: true,
          error: null,
          responsePreview: fullContent,
          isStreaming: false,
          streamingContent: fullContent,
        } as RunResult;

      } catch (error: any) {
        logger.error(`${e.name} failed`, error);
        logger.data('Error Details', {
          message: error.message,
          stack: error.stack?.split('\n').slice(0, 3)
        });
        updateStreamingContent(e.id, '', false);
        
        // Enhanced error handling with recovery engine
        const enhancedError = {
          message: error.message || 'Unknown error occurred',
          statusCode: error.status || error.statusCode || error.code,
          status: error.status || error.statusCode || error.code,
          code: error.code || error.status || error.statusCode,
          provider: e.provider,
          engine: e.name,
          originalError: {
            ...error,
            message: error.message || 'Unknown error occurred',
            statusCode: error.status || error.statusCode || error.code,
            status: error.status || error.statusCode || error.code,
          }
        };
        
        // Store failed request details for retry and display error panel
        setLastFailedRequest({ engine: e, prompt, outCap });
        setCurrentError(enhancedError);
        
        // Don't add to error queue automatically - only show inline errors
        // User can click "View full error details" to see the popup
        // const errorId = `${e.id}-${Date.now()}`;
        // setErrorQueue(prev => [...prev, {
        //   id: errorId,
        //   error: enhancedError,
        //   engine: e,
        //   prompt,
        //   outCap
        // }]);
        
        // Check if auto-fixable
        if (shouldAutoFix(error)) {
          logger.info(`[Auto-Recovery] Error is auto-fixable for ${e.name}`);
          const autoFixFnName = getAutoFixFunction(error);
          
          // Map function name to actual function
          const autoFixFnMap: Record<string, any> = {
            'autoFixRateLimit': autoFixRateLimit,
            'autoFixServerError': autoFixServerError,
            'autoFixSlowDown': autoFixSlowDown,
            'autoFixConnectionError': autoFixConnectionError,
          };
          
          const autoFixFn = autoFixFnMap[autoFixFnName];
          
          if (autoFixFn) {
            try {
              logger.info(`[Auto-Recovery] Attempting auto-fix for ${e.name}...`);
              
              // Attempt auto-fix
              await autoFixFn(
                e.provider,
                async () => {
                  // Retry the streaming
                  let retryContent = '';
                  for await (const chunk of streamFromProvider(e, prompt, outCap)) {
                    retryContent += chunk;
                    updateStreamingContent(e.id, retryContent, true);
                  }
                  return retryContent;
                },
                (status: string) => {
                  logger.info(`[Auto-Recovery] ${status}`);
                  updateStreamingContent(e.id, `🔄 ${status}\n\nPlease wait...`, true);
                }
              );
              
              logger.success(`[Auto-Recovery] Auto-fix successful for ${e.name}`);
              
              // Clear error since auto-fix succeeded
              setCurrentError(null);
              setLastFailedRequest(null);
              
              // Return success result (the streaming state is already updated)
              const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
              logger.success(`${e.name} completed after auto-fix in ${elapsed}s`);
              
              const finalContent = streamingStates[e.id]?.content || '';
              const estimatedInputTokens = estimateTokens(prompt, e.tokenizer);
              const estimatedOutputTokens = estimateTokens(finalContent, e.tokenizer);
              
              const pricing = getPrice(e);
              const inputCost = pricing ? (estimatedInputTokens / 1_000_000) * pricing.in : 0;
              const outputCost = pricing ? (estimatedOutputTokens / 1_000_000) * pricing.out : 0;

              // ===== CREDIT DEDUCTION (after successful auto-retry) =====
              if (user?.id) {
                const creditsToDeduct = calculateCredits(
                  e.provider,
                  e.selectedVersion,
                  estimatedInputTokens,
                  estimatedOutputTokens
                );
                
                if (creditsToDeduct > 0) {
                  const deductResult = await deductCredits(
                    user.id,
                    creditsToDeduct,
                    e.provider,
                    e.selectedVersion,
                    estimatedInputTokens + estimatedOutputTokens,
                    `API call to ${e.name} (${e.selectedVersion}) - auto-retry`
                  );
                  
                  if (deductResult.success) {
                    logger.success(`[Credits] Deducted ${creditsToDeduct} credits for ${e.name} (auto-retry). New balance: ${deductResult.newBalance}`);
                  }
                }
              }
              
              return {
                engineId: e.id,
                engineName: e.name,
                version: e.selectedVersion,
                tokensIn: estimatedInputTokens,
                tokensOut: estimatedOutputTokens,
                estIn: nowIn,
                estOutCap: outCap,
                estMinSpend: minSpend,
                estMaxSpend: maxSpend,
                costUSD: inputCost + outputCost,
                durationMs: Date.now() - startTime,
                warnings: ['Auto-recovered from error'],
                attempts: 2,
                reason: 'Auto-fixed and completed',
                success: true,
                error: null,
                responsePreview: finalContent,
                isStreaming: false,
                streamingContent: finalContent,
              } as RunResult;
              
            } catch (autoFixError: any) {
              logger.error(`[Auto-Recovery] Auto-fix failed for ${e.name}:`, autoFixError);
              // Fall through to return error result
            }
          }
        }
        
        return {
          engineId: e.id,
          engineName: e.name,
          version: e.selectedVersion,
          tokensIn: 0,
          tokensOut: 0,
          estIn: nowIn,
          estOutCap: outCap,
          estMinSpend: minSpend,
          estMaxSpend: maxSpend,
          costUSD: 0,
          durationMs: Date.now() - startTime,
          warnings: [error.message],
          attempts: 1,
          reason: 'Streaming failed',
          success: false,
          error: error.message,
          responsePreview: '',
          isStreaming: false,
          streamingContent: '',
        } as RunResult;
      }
    });

    const out = await Promise.all(runs);
    setResults(out);
    
    // Auto-select first engine tab when results are available
    if (out.length > 0 && !activeEngineTab) {
      const firstEngineId = selectedEngines[0]?.id;
      if (firstEngineId) {
        setActiveEngineTab(firstEngineId);
      }
    }
    
    // Calculate total spent
    const totalCost = out.reduce((sum, result) => sum + result.costUSD, 0);
    setTotalSpent(prev => prev + totalCost);
    
    logger.separator();
    logger.header('✅ ALL ENGINES COMPLETED');
    logger.data('Results Summary', {
      totalEngines: out.length,
      successful: out.filter(r => r.success).length,
      failed: out.filter(r => !r.success).length,
      totalCost: `$${totalCost.toFixed(4)}`,
      totalCharacters: out.reduce((sum, r) => sum + (r.responsePreview?.length || 0), 0)
    });
    
    // Super Debug: Pipeline end
    superDebugBus.emit('PIPELINE_END', 'All engines completed', {
      details: {
        totalEngines: out.length,
        successful: out.filter(r => r.success).length,
        failed: out.filter(r => !r.success).length,
        totalCost: totalCost.toFixed(4),
        totalCharacters: out.reduce((sum, r) => sum + (r.responsePreview?.length || 0), 0)
      }
    });
    superDebugBus.emit('FUNCTION_EXIT', 'runAll() completed', {
      variables: { resultsCount: out.length, totalCost: totalCost.toFixed(4) }
    });
    out.forEach(result => {
      if (result.success) {
        logger.success(`${result.engineName}: ${result.tokensOut} tokens, $${result.costUSD.toFixed(4)}, ${(result.durationMs / 1000).toFixed(2)}s`);
        
        // Auto-deduct from local balance tracker (with token tracking)
        const engine = engines.find(e => e.id === result.engineId);
        if (engine && result.costUSD > 0) {
          deductFromBalance(
            engine.provider, 
            result.costUSD, 
            engine.selectedVersion,
            result.tokensIn,
            result.tokensOut
          );
        }
      } else {
        logger.error(`${result.engineName}: ${result.error}`);
      }
    });
    logger.separator();
    
    // Reload local balances after run
    setLocalBalances(loadBalances());
    
    setIsRunning(false);
  }

  // ===== Mutators =====
  function toggleEngine(id: string) { setSelected(prev => ({ ...prev, [id]: !prev[id] })); }
  function updateVersion(id: string, v: string) { setEngines(prev => prev.map(e => e.id === id ? { ...e, selectedVersion: v } : e)); }
  function updateApiKey(id: string, key: string) { setEngines(prev => prev.map(e => e.id === id ? { ...e, apiKey: key } : e)); }
  function updateEndpoint(id: string, url: string) { setEngines(prev => prev.map(e => e.id === id ? { ...e, endpoint: url } : e)); }
  function updateOutPolicy(id: string, mode: "auto" | "fixed", fixedTokens?: number) { setEngines(prev => prev.map(e => e.id === id ? { ...e, outPolicy: { mode, fixedTokens } } : e)); }
  function overridePrice(provider: string, model: string, field: "in" | "out", val: number) {
    setPriceOverrides(prev => ({ ...prev, [provider]: { ...(prev[provider] || {}), [model]: { ...(prev[provider]?.[model] || { in: 0, out: 0 }), [field]: Math.max(0, val) } } }));
  }
  function addCustomEngine() {
    const id = `custom-${Date.now()}`;
    setEngines(prev => ([...prev, { id, name: "Custom HTTP Engine", provider: "generic", tokenizer: "bytebpe", contextLimit: 64000, versions: ["v1"], selectedVersion: "v1", outPolicy: { mode: "auto" }, endpoint: "" }]));
    setSelected(prev => ({ ...prev, [id]: true }));
  }

  // ===== Fetch API Balance for a single engine =====
  async function fetchBalance(engine: Engine) {
    if (!engine.apiKey) {
      setApiBalances(prev => ({ ...prev, [engine.id]: { balance: 'No API key', loading: false, error: 'Missing key' } }));
      return;
    }
    
    setApiBalances(prev => ({ ...prev, [engine.id]: { balance: '...', loading: true } }));
    
    try {
      if (engine.provider === 'deepseek') {
        // DeepSeek has a balance API
        const response = await fetch('https://api.deepseek.com/user/balance', {
          headers: { 'Authorization': 'Bearer ' + engine.apiKey }
        });
        if (response.ok) {
          const data = await response.json();
          const balance = data.balance_infos?.[0]?.total_balance || data.balance || 'N/A';
          const currency = data.balance_infos?.[0]?.currency || 'CNY';
          setApiBalances(prev => ({ ...prev, [engine.id]: { balance: `${balance} ${currency}`, loading: false } }));
        } else {
          setApiBalances(prev => ({ ...prev, [engine.id]: { balance: 'Error', loading: false, error: `HTTP ${response.status}` } }));
        }
      } else if (engine.provider === 'openai') {
        // OpenAI - try to get usage info to estimate balance
        // First try the usage endpoint
        const today = new Date().toISOString().split('T')[0];
        const usageResponse = await fetch('https://api.openai.com/v1/usage?date=' + today, {
          headers: { 'Authorization': 'Bearer ' + engine.apiKey }
        });
        
        if (usageResponse.ok) {
          const usage = await usageResponse.json();
          const usageCents = usage.total_usage || 0;
          const usageDollars = (usageCents / 100).toFixed(2);
          setApiBalances(prev => ({ ...prev, [engine.id]: { balance: `Used $${usageDollars} today`, loading: false } }));
        } else if (usageResponse.status === 401) {
          setApiBalances(prev => ({ ...prev, [engine.id]: { balance: '✗ Invalid key', loading: false, error: 'Unauthorized' } }));
        } else {
          // Fallback: just validate the key with models endpoint
          const modelResponse = await fetch('https://api.openai.com/v1/models', {
            headers: { 'Authorization': 'Bearer ' + engine.apiKey }
          });
          if (modelResponse.ok) {
            setApiBalances(prev => ({ ...prev, [engine.id]: { balance: '✓ Key valid (balance unavailable)', loading: false } }));
          } else if (modelResponse.status === 401) {
            setApiBalances(prev => ({ ...prev, [engine.id]: { balance: '✗ Invalid key', loading: false, error: 'Unauthorized' } }));
          } else {
            setApiBalances(prev => ({ ...prev, [engine.id]: { balance: `Error ${modelResponse.status}`, loading: false, error: `HTTP ${modelResponse.status}` } }));
          }
        }
      } else if (engine.provider === 'anthropic') {
        setApiBalances(prev => ({ ...prev, [engine.id]: { balance: 'Check console.anthropic.com', loading: false } }));
      } else if (engine.provider === 'gemini') {
        setApiBalances(prev => ({ ...prev, [engine.id]: { balance: 'Free tier / Pay-as-you-go', loading: false } }));
      } else if (engine.provider === 'mistral') {
        setApiBalances(prev => ({ ...prev, [engine.id]: { balance: 'Check console.mistral.ai', loading: false } }));
      } else if (engine.provider === 'groq') {
        setApiBalances(prev => ({ ...prev, [engine.id]: { balance: 'Free tier', loading: false } }));
      } else {
        setApiBalances(prev => ({ ...prev, [engine.id]: { balance: 'N/A', loading: false } }));
      }
    } catch (error: any) {
      console.error(`Failed to fetch balance for ${engine.name}:`, error);
      setApiBalances(prev => ({ ...prev, [engine.id]: { balance: 'Error', loading: false, error: error.message } }));
    }
  }

  // ===== Sales Leader Prompts Data =====
  const salesLeaderPrompts: Record<string, Array<{title: string, prompt: string}>> = {
    'A. Market & Opportunity': [
      { title: 'A1. Market Intelligence & Trends', prompt: `Opportunity: Spotting market shifts before competitors

Prompt to run/edit: "I need to identify emerging market opportunities before my competitors catch them.

Here's my situation: [Describe your industry/territory]

Help me understand:
• What specific signals should I be monitoring for disruption or change?
• Which sources or tools can give me early warning of shifts?
• How do I translate these signals into actionable sales opportunities?
• What cadence should I use to review market intelligence?

Currently, I'm tracking [describe what you do now, if anything].

My biggest blind spots are around [describe specific areas like regulatory changes, technology trends, competitor moves, or client buying patterns]."` },
      { title: 'A2. Target Account Selection', prompt: `Challenge: Spreading resources too thin or missing whale opportunities

Prompt to run/edit: "I need to prioritize my target accounts more effectively to maximize ROI on my team's efforts.

Here's what I'm dealing with: I have [number] accounts in my territory worth approximately [$X] in potential revenue.

Currently, I'm allocating resources based on [describe current approach - gut feel, account size, relationship strength, etc.].

Help me develop:
• An ideal client profile (ICP) framework specific to my offerings
• A scoring methodology that considers firmographics, buying signals, competitive position, and strategic fit
• A white space analysis approach to spot untapped potential
• An investment allocation model that balances hunting vs. farming

My specific challenge is [describe: too many small deals, missing whale opportunities, spreading team too thin, unclear prioritization criteria, or competitive blind spots]."` },
      { title: 'A3. Trigger Event Identification', prompt: `Challenge: Missing high-probability buying signals

Prompt to run/edit: "I'm missing high-probability opportunities because I'm not catching trigger events early enough.

I sell [describe your solutions] to [describe target clients].

Help me:
• Identify which trigger events are most predictive of buying intent for my solutions
• Set up systems or tools to monitor these events across my accounts
• Create playbooks for how to respond when specific triggers occur
• Develop messaging that connects the trigger event to business value I deliver

The trigger events most relevant to me include: [check all that apply and add details - M&A activity, new executive appointments, earnings misses/beats, regulatory changes, competitor wins/losses, funding rounds, digital transformation announcements, technology stack changes, office expansions/closures, customer experience issues].

I currently [describe how you monitor these now, if at all]."` }
    ],
    'B. Pre-Bid Phase': [
      { title: 'B1. Stakeholder Mapping', prompt: `Challenge: Finding the real decision maker

Prompt to run/edit: I need to map all stakeholders and identify the real decision maker for this opportunity.

Here's what I know so far:
• Company: [name and industry]
• Opportunity: [brief description of what they're buying]
• Deal size: [approximate value]
• My current contacts: [list names, titles, and their apparent role]

Help me:
• Identify who the economic buyer is (who controls budget and can say yes)
• Map all influencers (who can say no or shape requirements)
• Identify technical evaluators (who assess our capabilities)
• Understand end users (who will use the solution)
• Determine procurement's role and authority
• Assess whether there's a coach/champion who wants us to win

What I'm uncertain about: [describe gaps - can't reach certain levels, conflicting signals about authority, multiple decision makers, unclear buying process, or matrixed organization complexity].` },
      { title: 'B2. Access & Relationship Building', prompt: `Challenge: Getting to senior decision makers

Prompt to run/edit: I need to get access to senior executives who control strategic decisions and budgets.

Here's my situation:
• Target company: [name]
• Current relationship level: [describe - stuck at Director/VP level, only IT contacts, single business unit, etc.]
• Who I need to reach: [specific titles or names if known]
• What I've tried: [describe attempts - emails, LinkedIn, going through current contacts, events, etc.]

Help me:
• Develop strategies to get past gatekeepers (EAs, screening processes)
• Craft compelling reasons for executives to take the meeting
• Leverage my current contacts to facilitate introductions upward
• Build trust and credibility quickly with new senior stakeholders
• Prepare for executive conversations that demonstrate business acumen

My specific access barriers are: [describe - gatekeepers blocking, current contacts won't introduce me up, executives not responding, can't articulate compelling enough value for their level, or lacking referrals/warm introductions].` },
      { title: 'B3. Requirements Shaping', prompt: `Challenge: Shaping requirements before RFP lockdown

Prompt to run/edit: I need to get involved early enough to shape the client's requirements before they lock in an RFP.

Here's where I am:
• Opportunity: [describe what the client is trying to solve]
• Stage: [describe - informal discussions, formal RFP expected in X months, already issued, etc.]
• Competition: [who else is involved, if known]
• My relationships: [describe access and influence level]

What I need:
• Strategies to gain early access when I'm not yet in the conversation
• Discovery questions that uncover their true business needs vs. perceived requirements
• Ways to educate the client on evaluation criteria that favor our strengths
• Techniques to make our approach feel like the logical solution
• How to position against incumbent specifications if I'm already late

My specific challenge: [describe - being brought in after requirements set, competing against incumbent-written RFP, no access to requirements authors, client has preconceived solution in mind, or procurement-driven process limiting shaping opportunity].` },
      { title: 'B4. Qualification & Go/No-Go', prompt: `Challenge: Making confident go/no-go decisions

Prompt to run/edit: I need to make a confident go/no-go decision on this pursuit.

Here's the opportunity:
• Client: [name and brief background]
• Opportunity: [description and scope]
• Estimated value: [$X over Y years]
• Competition: [known competitors]
• Our relationship/position: [describe]
• Required investment to pursue: [rough estimate if known]

Help me assess:
• Win probability using objective criteria (not hope)
• Strategic fit with our priorities and capabilities
• Required investment (pre-sales, bid team, executive time, proof of concept)
• Risk factors that could make this unprofitable or problematic
• Whether we can get organizational buy-in and resources
• If this is a 'buy' opportunity (client legitimately evaluating) vs 'die' opportunity (meeting vendor requirements with predetermined winner)

My concerns are: [describe specific worries - client just price shopping, incumbent has inside track, we lack key capabilities, margin will be too low, delivery doesn't want it, unclear decision process, too competitive, or unrealistic client expectations].` },
      { title: 'B5. Pre-Sales & Solution Architecture Alignment', prompt: `Challenge: Getting strong pre-sales support

Prompt to run/edit: I need stronger pre-sales support to win this technical deal.

Here's my situation:
• Opportunity: [describe the technical solution being evaluated]
• Client's technical environment: [what you know about their stack, architecture, scale]
• Key technical requirements: [list critical must-haves]
• Technical evaluators: [titles and concerns if known]
• Competition: [technical strengths of competitors]
• Current pre-sales challenges: [Check what applies and add details - solution architects overcommitted across too many bids, proposed solution doesn't match what client needs, our architects lack credibility in this domain, disconnect between what I'm selling and what delivery says is feasible, late involvement of technical team, client technical team skeptical of our capabilities]

Help me:
• Get the right architect engaged at the right time
• Ensure our solution design matches client's actual needs and constraints
• Build technical credibility with client's technical evaluators
• Validate that what we're proposing is actually deliverable
• Prepare our team for technical deep dives and proof of concepts
• Align sales narrative with technical solution story.` }
    ],
    'C. Bid Phase': [
      { title: 'C1. Bid Strategy & Theme Development', prompt: `Challenge: Developing compelling win themes

Prompt to run/edit: I need to develop a compelling bid strategy with clear win themes for this competitive pursuit.

Here's the context:
• Client: [name and industry]
• Their key business challenges: [what you understand about their pain points]
• Opportunity scope: [what they're buying]
• Known competitors: [who and their likely positioning]
• Our relationship position: [incumbent, challenger, or dark horse]
• Client's decision criteria: [if known - cost, capability, relationship, risk mitigation, innovation, etc.]

Help me develop:
• 3-5 win themes that differentiate us and resonate with client hot buttons
• Ghost strategies that expose competitor weaknesses without naming them directly
• Proof points (case studies, references, metrics) that validate each theme
• Alignment between our solution and their CEO/board-level strategic priorities
• A compelling narrative arc for the proposal that builds to why we're the only choice

What I'm struggling with: [describe - we look like everyone else, competing primarily on price, unclear what really matters to client, our differentiators feel weak, or lack compelling proof points for our claims].` },
      { title: 'C2. Pricing Strategy & Deal Economics', prompt: `Challenge: Winning while protecting margins

Prompt to run/edit: I need to develop the right pricing strategy for this deal that wins while protecting margins.

Here's the situation:
• Opportunity value: [total contract value and duration]
• Scope: [high-level description of work]
• Client's budget expectations: [if known or suspected]
• Competitive pricing pressure: [what you know about competitor pricing or market rates]
• Our cost structure: [rough idea of delivery costs if known]

Help me decide:
• Fixed-price vs. Time & Materials vs. Outcome-based - which model and why
• Optimal offshore/nearshore/onshore delivery mix for cost and quality
• Risk contingencies and how to size them appropriately
• Volume discounts, ramp pricing, or other commercial structures
• How to defend premium pricing if we're more expensive
• What I can negotiate on vs. what's non-negotiable

My specific pricing challenges: [describe - client demanding rates 30% below our standard, competitors undercutting significantly, unclear scope making pricing risky, pressure to low-ball to win, delivery says my price won't cover costs, or difficulty articulating value vs. just rates].` },
      { title: 'C3. Solution Design & Architecture', prompt: `Challenge: Creating compelling, deliverable solutions

Prompt to run/edit: I need to ensure our solution design is compelling, innovative, and actually deliverable.

Here's what I'm proposing:
• Client's business problem: [describe what they're trying to solve]
• Technical requirements: [key technical must-haves]
• Current state: [their existing environment/process]
• Our proposed solution: [high-level description]
• Constraints: [budget, timeline, technology, organizational, etc.]

Help me validate:
• Does our solution actually address their business problem or just technical requirements?
• Are we over-engineering (gold-plating) or under-delivering?
• What innovation can we add that competitors won't have?
• Can we realistically deliver this with our current capabilities?
• Are there risks in the technical approach we're not seeing?
• How do we demonstrate feasibility convincingly?

My concerns: [describe - promising capabilities we don't fully have, not sure solution matches their environment, might be too complex/expensive, delivery team hasn't validated approach, lacking innovation to differentiate, or client technical team skeptical it will work].` },
      { title: 'C4. Cross-Practice Collaboration', prompt: `Challenge: Getting multiple practices aligned

Prompt to run/edit: I need to get multiple practices working together to create an integrated solution for this opportunity.

Here's the situation:
• Client opportunity: [describe scope and complexity]
• Practices needed: [list - e.g., Strategy, Technology, Cloud, Data/AI, Security, Change Management, etc.]
• Current collaboration status: [what's working or not working]
• Key practice leaders: [names/roles if relevant]

Help me:
• Get practice leaders aligned on the opportunity and committed to winning together
• Resolve conflicts over ownership and client relationship control
• Create consistent messaging across all practices
• Address resource conflicts and allocation disputes
• Resolve margin allocation and P&L issues between practices
• Build a truly integrated solution vs. Frankenstein of separate offers

What's breaking down: [describe - practice leaders fighting for primary relationship, inconsistent client messages, can't agree on solution approach, one practice won't commit resources, margin allocation disputes, or siloed proposals that don't integrate].` },
      { title: 'C5. Marketing & Collateral Support', prompt: `Challenge: Missing marketing materials and proof points

Prompt to run/edit: I don't have the marketing materials and proof points I need to win this deal.

Here's what I'm pursuing:
• Client: [name and industry]
• Their key concerns: [what matters most to decision makers]
• What I need to prove: [specific capabilities, experience, outcomes, etc.]
• Competition: [what they can show that I can't]

What marketing support I'm missing:
• Case studies: [describe ideal - industry, use case, scale, outcomes]
• Thought leadership: [specific topics or formats needed]
• Executive presentations: [what story/message for what audience]
• ROI/business case tools: [what financial justification needed]
• Client references: [who can speak to what]
• Collateral: [specific materials - one-pagers, demos, videos, etc.]

My specific gap is: [describe - no case studies from this industry, no client willing to be reference, no content on emerging technology we're selling, nothing at executive level, can't quantify business value, or competitors have much stronger proof points].` },
      { title: 'C6. Delivery Team Engagement', prompt: `Challenge: Getting delivery leadership committed

Prompt to run/edit: I need delivery leadership properly engaged and committed to this pursuit.

Here's the situation:
• Opportunity: [describe scope and technical complexity]
• Deal value: [$X]
• Expected start date: [timeline]
• Key delivery leaders: [who needs to be involved]
• Current delivery engagement: [describe what's happening or not happening]

Problems I'm facing:
• Delivery leaders not participating in solution design sessions
• Concerns about whether we have resources available when needed
• Disconnect between what I'm selling and what delivery thinks we can do
• Lack of delivery input on technical or execution risks
• Delivery doesn't want this deal (low margin, difficult client, technology risk, etc.)
• Can't get commitments on key delivery personnel for client meetings

Help me:
• Get the right delivery leaders engaged at the right time
• Address their concerns about feasibility, resources, or risks
• Ensure sales and delivery are aligned on what we're committing to
• Get delivery buy-in and enthusiasm for winning this

Specific issue: [describe the core problem - delivery is stretched thin, they got burned on a deal I sold before, margin is too tight, they don't believe in the solution approach, or organizational politics between sales and delivery].` },
      { title: 'C7. Risk Assessment & Mitigation', prompt: `Challenge: Identifying and mitigating deal risks

Prompt to run/edit: I need to identify and mitigate risks in this deal that could hurt us during the sale or after we win.

Here's the opportunity:
• Client: [name and context]
• Scope: [what we're proposing]
• Deal structure: [commercial terms, payment, contract type]
• Timeline: [key milestones]
• What worries me: [gut feel concerns]

Help me think through:
• Technical delivery risks: Can we actually build/implement what we're promising?
• Client organizational risks: Change management, politics, decision maker turnover, budget changes
• Third-party dependencies: Reliance on client, vendors, partners we don't control
• Regulatory/compliance complexity: Data privacy, industry regulations, audit requirements
• Commercial/financial risks: Scope creep, payment terms, penalties, liability exposure
• Competitive risks: Incumbent counterattacks, competitor undercutting, client cold feet
• Delivery execution risks: Team availability, skillset gaps, untested approach

For each risk category, help me identify specific risks I might not see, assess likelihood and impact, and develop mitigation strategies.

My biggest concern is: [describe what keeps you up at night about this deal].` },
      { title: 'C8. Proposal Production & Quality', prompt: `Challenge: Creating winning proposals

Prompt to run/edit: I need to improve our proposal development to create a winning submission.

Here's my situation:
• Opportunity: [brief description]
• Proposal deadline: [date]
• Page limit/format requirements: [if any]
• Evaluation criteria: [if known]
• Current proposal status: [outline done, first draft, review stage, etc.]

My proposal challenges:
• Insufficient bid factory capacity - too many proposals, not enough resources
• Quality issues - proposals are functional but not compelling
• Storytelling - reads like a spec sheet, doesn't engage emotionally
• Executive summary - doesn't grab attention or make the case for why us
• Incorporating feedback - struggle to integrate color team review comments
• Compliance - miss requirements or don't address evaluation criteria fully
• Graphics/layout - text-heavy, not visually engaging
• Consistency - different sections feel disconnected

Help me:
• Create a proposal outline and storyboard that flows and builds our case
• Write a compelling executive summary that decision makers will actually read
• Develop win themes that weave throughout the proposal
• Make it compliant while still being engaging
• Incorporate visual storytelling that reinforces messages

Specific help needed: [describe - need full proposal structure, executive summary help, making technical content accessible, or improving overall quality].` },
      { title: 'C9. Orals & Presentations', prompt: `Challenge: Nailing finalist presentations

Prompt to run/edit: I need to prepare for our finalist presentation/orals and make sure we nail it.

Here's the context:
• Opportunity: [brief description]
• Presentation date: [when]
• Format: [duration, audience, presentation vs. Q&A split, demo expectations]
• Audience: [who will be in the room - titles and their likely concerns]
• Evaluation focus: [what they're assessing - technical, team, approach, etc.]
• Our presentation team: [who's presenting and their roles]
• Competition: [who else is presenting]

Help me improve:
• Executive presence - coming across with gravitas and confidence
• Handling tough questions - addressing concerns without being defensive
• Demo effectiveness - showing capability without technical glitches
• Differentiation clarity - making it obvious why we're different/better
• Team chemistry - how we work together in front of the client
• Opening and closing - strong memorable start and finish

What needs work: [describe specific concerns about presentation performance, team readiness, content flow, demo risks, or anticipated difficult questions].` }
    ],
    'D. Negotiation & Closing': [
      { title: 'D1. Commercial Negotiations', prompt: `Challenge: Breaking through negotiation deadlocks

Prompt to run/edit: I need to get unstuck from these negotiations without killing margins.

Here's where we are:
• Deal: [brief description]
• Current sticking points: [what's blocking closure]
• Client demands: [what they're asking for]
• My constraints: [what I can't give]
• Timeline pressure: [how urgent is closure]

The sticking points are:
• Price/rate pressure: [describe demands]
• Payment terms: [what they want vs. what we need]
• SLA commitments: [service levels and penalties]
• Liability caps: [risk exposure concerns]
• IP ownership: [who owns what]
• Scope creep: [additions during contracting]

Help me:
• Develop negotiation strategies that protect key interests
• Identify tradeable items vs. non-negotiables
• Create alternative value propositions if I can't move on price
• Understand what the client really needs vs. nice-to-haves
• Know when to walk away

My specific challenge: [describe - relentless price pressure with no give on other terms, unrealistic demands, competing internal pressures to close vs. protect margin, or unclear what client will actually accept].` },
      { title: 'D2. Legal & Contracting', prompt: `Challenge: Resolving legal roadblocks

Prompt to run/edit: Legal issues are blocking closure of this deal and I need to resolve them.

Here's the situation:
• Deal: [description]
• Contract type: [MSA, SOW, specific agreement]
• Current stage: [initial review, redlines exchanged, stalled, etc.]
• Timeline: [how urgent]

The specific legal problems:
• MSA negotiations: [what terms are contentious]
• Liability limitations: [indemnification, caps, carve-outs]
• Termination clauses: [notice periods, termination for convenience, wind-down]
• Data protection: [GDPR, data residency, privacy requirements]
• Compliance terms: [regulatory requirements, audit rights, certifications]

Help me:
• Understand which terms are truly deal-breakers vs. negotiable
• Develop alternative language that addresses both parties' concerns
• Know industry-standard positions to anchor negotiations
• Decide when to escalate to senior legal/executives
• Assess risk exposure of various positions

What's blocking us: [describe - our legal won't budge on key terms, client legal being unreasonable, risk committee concerns, regulatory complexity, or fundamental misalignment on risk allocation].` },
      { title: 'D3. Procurement & Vendor Management', prompt: `Challenge: Navigating difficult procurement

Prompt to run/edit: I'm facing a difficult procurement process that's threatening the deal.

Here's the situation:
• Deal: [description]
• Procurement's role: [how involved, what authority]
• Their tactics: [reverse auctions, rate pressure, compliance requirements]
• My business sponsor: [who wants us, their influence over procurement]

The procurement challenges:
• Vendor onboarding: [forms, compliance, insurance requirements]
• Compliance documentation: [certifications, financial stability, references]
• Preferred supplier lists: [pressure to accept deep discounts for PSL status]
• Commoditization: [treating strategic work like commodity purchase]
• Rate tables: [demands for published rates that lock us in]
• Reverse auctions: [competitive bidding driving price to bottom]

Help me:
• Navigate procurement while protecting the business relationship
• Elevate back to business stakeholders when procurement overreaches
• Justify premium pricing against commodity treatment
• Understand what procurement metrics/goals are driving their behavior
• Know what documentation/requirements are negotiable vs. standard

My specific challenge: [describe - procurement has taken over from business stakeholders, unreasonable demands, trying to commoditize complex work, or business sponsor won't override procurement].` },
      { title: 'D4. Internal Approvals & Deal Desk', prompt: `Challenge: Getting internal approval to close

Prompt to run/edit: I'm stuck in internal approvals trying to get this deal closed.

Here's what's happening:
• Deal: [description and value]
• Current approval stage: [deal desk, risk committee, finance, exec sponsor, etc.]
• What's blocking: [specific objections or concerns]
• Timeline: [client expectations and pressure]

Internal roadblocks:
• Deal desk rejecting pricing: [too low margin, non-standard terms, discount too deep]
• Risk committee concerns: [client financial health, technical risk, contract terms]
• Delivery capacity: [can't commit resources, other priorities, skillset gaps]
• Executive approval: [can't get sponsor sign-off, competing priorities]
• Finance issues: [payment terms, revenue recognition, deal structure]

Help me:
• Build the business case that gets internal stakeholders to yes
• Address risk concerns with mitigation strategies
• Navigate internal politics and competing priorities
• Know when to escalate and to whom
• Understand what modifications would get approval

My specific blocker is: [describe - pricing below threshold, delivery doesn't want it, risk concerns about client, can't get executive attention, or organizational bureaucracy].` },
      { title: 'D5. Competitive Displacement', prompt: `Challenge: Countering competitor blocking tactics

Prompt to run/edit: A competitor is blocking me from closing this deal and I need to counter them.

Here's the situation:
• Deal: [description]
• Stage: [how close to closure]
• Competitor: [who and their position]
• Their tactics: [what they're doing to block me]
• Our position: [strengths and weaknesses vs. them]

What the competitor is doing:
• Incumbent leverage: Using existing relationships and installed base
• Last-minute pricing: Dropping price dramatically to retain business
• FUD tactics: Spreading fear, uncertainty, doubt about our capabilities
• Client risk aversion: Playing on fear of switching vendors
• Lock-in strategies: Contract extensions, bundling, or other barriers

Help me:
• Develop counter-strategies for each competitor tactic
• Identify and exploit their vulnerabilities
• Reframe client risk perception (greater risk to stay vs. switch)
• Create urgency and compelling reasons to move now
• Build coalition of support within client organization

My specific challenge: [describe - incumbent relationship too strong, competitor undercutting on price, client getting cold feet about change, procurement prefers incumbent, or we're late to the game].` }
    ],
    'E. Post-Win Transition': [
      { title: 'E1. Sales-to-Delivery Handoff', prompt: `Challenge: Ensuring smooth sales-to-delivery transition

Prompt to run/edit: I need to ensure a smooth handoff to delivery after winning this deal.

Here's the situation:
• Deal: [description]
• Start date: [when delivery begins]
• Delivery team: [who's taking over]
• Client expectations: [what they're anticipating]
• What's documented: [contracts, SOW, what else]

What concerns me about handoff:
• Incomplete knowledge transfer: What I know that delivery doesn't
• Undocumented commitments: Things I promised that aren't written down
• Stakeholder introductions: Key client relationships delivery needs
• Delivery surprised by scope: Aspects of the deal they're not expecting
• Timeline expectations: Client timing vs. delivery readiness
• Resource commitments: Specific people client expects vs. who's assigned

Help me:
• Create a comprehensive handoff plan and checklist
• Document all commitments, expectations, and nuances
• Facilitate introductions between delivery team and client stakeholders
• Align delivery team on client sensitivities and relationship dynamics
• Ensure smooth transition that maintains client confidence

My specific handoff challenge: [describe - delivery doesn't know what I promised, client relationships aren't transferred, scope interpretation differs, timeline misalignment, or I'm being cut out too quickly].` },
      { title: 'E2. Expectation Alignment', prompt: `Challenge: Closing expectation gaps

Prompt to run/edit: There's a gap between what the client expects and what we're delivering and I need to close it.

Here's the misalignment:
• Deal: [description]
• Current stage: [how far into delivery]
• The expectation gap: [what's different]
• Client reaction: [are they aware, what are they saying]
• Root cause: [why the misalignment exists]

Where expectations differ:
• Timeline/milestones: Client thought different dates or sequence
• Resource qualifications: Expected more senior or specialized people
• Scope interpretation: Different understanding of what's included
• Governance model: How often we meet, who's involved, escalation
• Success metrics: How we're measuring outcomes and progress
• Delivery approach: Methodology, tools, process client expected

Help me:
• Diagnose root cause of expectation misalignment
• Develop strategy to reset expectations without damaging relationship
• Create shared understanding through documentation
• Prevent future misalignments
• Recover client confidence if it's been damaged

My specific issue: [describe - sales promised something different than we can deliver, client interpreted SOW differently, undocumented verbal commitments, or delivery approach doesn't match what client anticipated].` },
      { title: 'E3. Delivery Risk Management', prompt: `Challenge: Managing early delivery problems

Prompt to run/edit: We're having early delivery challenges that could damage the relationship and I need to address them.

Here's what's happening:
• Deal: [description]
• How long into delivery: [weeks/months]
• The problems: [what's going wrong]
• Client awareness: [do they see it, what are they saying]
• Impact so far: [relationship damage, trust erosion]

The delivery issues are:
• Resource ramp-up: Can't get the right people onboarded fast enough
• Technical challenges: Harder than expected, unforeseen complexity
• Client resistance: Change management, political issues, lack of engagement
• Scope ambiguity: Disagreements about what's in/out of scope
• Missed milestones: Behind schedule on key deliverables
• Quality concerns: Client not happy with work product
• Communication breakdowns: Not aligned, surprised by issues

Help me:
• Assess severity and potential relationship impact
• Develop recovery plan to get back on track
• Manage client expectations and maintain trust
• Identify if this is temporary or systemic issue
• Determine if we need to reset scope, timeline, or approach
• Know when to escalate and bring in additional help

My biggest concern: [describe - client losing confidence in us, missed milestone triggering penalty, political fallout, risk of contract termination, or this becoming reference problem].` },
      { title: 'E4. Account Team Structure', prompt: `Challenge: Clarifying post-sale account ownership

Prompt to run/edit: I need to clarify account ownership and structure now that we've moved from sale to delivery.

Here's the situation:
• Account: [name]
• Deal just closed: [description]
• Current team: [who's involved from sales and delivery]
• Future opportunity: [expansion potential]

What's unclear about account structure:
• Account ownership: Does sales or delivery lead the relationship going forward?
• Client relationship management: Who's the primary day-to-day contact?
• Upsell responsibility: Who identifies and pursues expansion opportunities?
• Escalation protocols: Who handles issues, who do they escalate to?
• Strategic planning: Who develops account growth strategy?
• Compensation: How does revenue get credited?

Help me:
• Design an account team structure that serves client and drives growth
• Define clear roles and responsibilities
• Create governance model for account management
• Balance delivery focus with growth focus
• Ensure no one feels cut out or undermined
• Set up success metrics for account team

My specific challenge: [describe - sales-delivery friction over ownership, delivery wants to own it but isn't focused on growth, client relationships are fragmented, unclear accountability, or compensation disputes].` }
    ],
    'F. Account Growth': [
      { title: 'F1. Whitespace Identification', prompt: `Challenge: Finding hidden expansion opportunities

Prompt to run/edit: I know there's more revenue potential in this account but I'm not seeing all of it.

Here's my current account situation:
• Account: [name and industry]
• Current footprint: [what we're doing, revenue, which BU/geography]
• Relationship strength: [who we know, how deep]
• Contract status: [when does current work end, renewal likelihood]

Help me identify whitespace:
• Other business units or divisions: Where else in the organization could we expand?
• Adjacent services: What related capabilities could we cross-sell?
• Geographic expansion: Other locations where we could replicate success?
• Capability upgrades: How could we enhance or expand current engagement?
• Strategic initiatives: What's on the client's roadmap we could support?
• Competitive displacement: Where do competitors have business we could win?

What I need:
• Framework to systematically analyze expansion opportunities
• Questions to ask to uncover hidden needs
• Approach to prioritize opportunities
• Strategy to position new offerings

My challenge: [describe - don't have visibility beyond current business unit, current engagement is tactical not strategic, limited access to broader organization, or don't know what else to look for].` },
      { title: 'F2. Upsell & Cross-Sell Execution', prompt: `Challenge: Breaking through expansion blockers

Prompt to run/edit: I'm blocked from expanding in this account despite having current work and I need to break through.

Here's the situation:
• Account: [name]
• Current work: [what we're doing and revenue]
• Expansion opportunity: [what I want to sell]
• Estimated additional value: [$X]

What's blocking expansion:
• Budget constraints: Client says no money available
• Delivery issues: Problems with current work limiting trust
• Competing priorities: Other initiatives taking precedence
• Value demonstration: Can't show enough ROI for expansion
• Wrong stakeholders: Don't have access to decision makers for new work
• Competitive entrenchment: Other vendors own those relationships

Help me:
• Diagnose the real blocker (vs. what client is saying)
• Build business case that gets budget allocated
• Address delivery concerns if they exist
• Position expansion as accelerating their priorities
• Get access to the right stakeholders
• Counter competitive positioning

My specific situation: [describe - current delivery is struggling, expanded scope but no budget increase, different division doesn't know us, or competitor has stronger relationship for the new service].` },
      { title: 'F3. Multi-BU/Geography Expansion', prompt: `Challenge: Expanding beyond initial success area

Prompt to run/edit: I've had success in one area but can't expand to other parts of the organization.

Here's where I am:
• Account: [name]
• Current success: [where we're working, what we've achieved]
• Target expansion: [other BUs, geographies, or divisions]
• Why I believe there's opportunity: [similar needs, same challenges]

The barriers to expansion are:
• Different decision-makers: New areas have their own leaders who don't know us
• Local competitor entrenchment: Other vendors already established there
• Lack of internal champions: No one advocating for us in target areas
• Insufficient success stories: Can't demonstrate relevance to their specific situation
• Not-invented-here syndrome: They don't want solutions from corporate/other divisions
• Budget/prioritization: Other areas have different priorities or constraints

Help me:
• Develop strategy to get introduced and build credibility in new areas
• Create success stories that resonate with different audiences
• Identify and cultivate internal champions
• Position our work as relevant to their specific context
• Navigate organizational politics and dynamics

My specific challenge: [describe - current business unit won't facilitate introductions, target area is burned by previous vendors, different culture/needs, budget owned locally, or corporate mandate isn't driving adoption].` },
      { title: 'F4. Strategic Account Planning', prompt: `Challenge: Moving from reactive to strategic account management

Prompt to run/edit: I need to develop a strategic growth plan for this major account rather than managing it reactively.

Here's my account:
• Account: [name and industry]
• Current relationship: [revenue, scope, tenure]
• Account potential: [realistic revenue target over 3-5 years]
• Current approach: [how I'm managing it today]

What I'm missing in strategic planning:
• Multi-year roadmap: Where could this account go over 3-5 years?
• Relationship investment strategy: Which relationships to build, what's the plan?
• Capability gap analysis: What do I need to develop to win more?
• Competitive threat assessment: Who's trying to take share, how do I defend?
• Success metrics: How do I measure account health and growth trajectory?
• Resource allocation: What investment is justified given potential?

Help me:
• Create a comprehensive strategic account plan
• Develop relationship map with investment priorities
• Build multi-year growth scenario with milestones
• Identify capability gaps and development plan
• Design governance structure for account management
• Set metrics that drive the right behaviors

My current gap: [describe - no formal planning process, managing quarter-to-quarter, unclear long-term potential, haven't mapped broader organization, or lack executive sponsorship for strategic approach].` },
      { title: 'F5. Client Success & Value Realization', prompt: `Opportunity: Demonstrating business impact that drives renewals and expansion

Prompt to run/edit: "I'm struggling to show the business value we're delivering to this client in terms they care about.

Here's the situation:
• Account: [name]
• What we're delivering: [current work]
• Contract status: [when is renewal, expansion opportunity]
• Client satisfaction: [what you sense or know]

The value demonstration issues:
1. Unclear success metrics: We never defined how to measure success
2. No outcome tracking: Measuring outputs (things we do) not outcomes (business results)
3. Weak QBR discipline: Not regularly reviewing value and adjusting
4. Can't articulate value: Converting what we do into business terms executives understand
5. Attribution challenges: Hard to show our contribution vs. other factors

Help me:
1. Define success metrics that matter to business leaders
2. Create system to track and report business outcomes
3. Build compelling value narrative with data and stories
4. Design QBR approach that reinforces value partnership
5. Develop business case for renewal and expansion
6. Connect our work to their strategic priorities and KPIs

My specific challenge: [describe - delivering technical work but can't show business impact, client sees us as cost center not value driver, executive sponsor changed and new person doesn't see value, or competing for budget against other priorities]."` }
    ],
    'G. Sales Team Coordination': [
      { title: 'G1. Sales Team Coordination', prompt: `Challenge: Multiple sellers colliding in same accounts

Prompt to run/edit: I have sales team coordination problems that are hurting our effectiveness and confusing clients.

Here's what's happening:
• Account(s) involved: [names]
• Who's colliding: [roles, teams, or names]
• The conflicts: [describe specific incidents]
• Client impact: [are they seeing the dysfunction?]

The coordination issues are:
• Territory overlap: Multiple sellers claim the same account
• Account ownership disputes: Unclear who really owns the relationship
• Opportunity collision: Different sellers pursuing opportunities in same account
• Poor communication: Teams not talking about account strategy
• Conflicting messages: Client hearing different things from different sellers
• Internal competition: Sellers competing against each other not competitors

Help me:
• Clarify account ownership and territory boundaries
• Create account coordination protocols
• Design incentive structures that reward collaboration
• Implement account planning that involves all stakeholders
• Set up communication cadence to prevent collisions
• Resolve current conflicts constructively

My specific situation: [describe - two sellers both claiming account, different teams selling to different divisions without coordination, client complained about confusion, compensation disputes, or management not enforcing territory rules].` },
      { title: 'G2. Sales & Pre-Sales Partnership', prompt: `Challenge: Pre-sales collaboration isn't working

Prompt to run/edit: My relationship with the pre-sales organization isn't working well and it's hurting deal outcomes.

Here's the situation:
• What I sell: [solutions/services]
• Pre-sales organization: [structure, reporting, key people]
• Current process: [how pre-sales gets engaged]
• What's broken: [specific problems]

The partnership issues:
• Late involvement: Pre-sales brought in too late to be effective
• Solution mismatch: What they propose doesn't match what I'm selling
• Resource contention: Fighting for scarce pre-sales resources
• Credibility gaps: Architects don't resonate with clients
• Misaligned incentives: Pre-sales measured differently than sales
• Communication breakdowns: Not aligned on strategy or client situation

Help me:
• Define how sales and pre-sales should work together
• Create engagement model that gets pre-sales involved at right time
• Align on solution positioning and messaging
• Build trust and partnership with key pre-sales leaders
• Manage resource allocation fairly
• Set shared success metrics

My specific issue: [describe - pre-sales is overcommitted, they're proposing wrong solutions, client doesn't find them credible, can't get them engaged early enough, or organizational friction between sales and pre-sales].` },
      { title: 'G3. Sales & Delivery Collaboration', prompt: `Challenge: Adversarial relationship with delivery

Prompt to run/edit: There's tension between sales and delivery that's creating problems for everyone.

Here's the dynamic:
• What I sell: [solutions/services]
• Delivery organization: [structure, key people]
• Current relationship: [how we interact, quality of relationship]
• Recent flashpoints: [specific incidents]

The sales-delivery tensions:
• Over-promising: Delivery says I sold things we can't deliver
• Margin pressure: Delivery costs exceed what I priced
• Resource conflicts: Can't get resources when I need them
• Blame culture: Finger-pointing when deals go wrong
• Misaligned incentives: Measured on different things
• Communication gaps: Not aligned on capabilities or client needs

Help me:
• Build healthier partnership between sales and delivery
• Create handoff process that works for both
• Align incentives and shared accountability
• Address specific conflicts constructively
• Set realistic expectations on both sides
• Design collaboration model that prevents problems

My specific situation: [describe - delivery is angry about a deal I sold, they're refusing to support my pursuits, we delivered poorly and client is unhappy, margin disputes, or fundamental trust breakdown between sales and delivery].` },
      { title: 'G4. Sales & Marketing Alignment', prompt: `Challenge: Marketing isn't supporting sales effectively

Prompt to run/edit: Marketing is falling short on supporting sales and I need better alignment.

Here's the situation:
• My target market: [industries, company size, buyer personas]
• What I need to sell: [solutions/services]
• Current marketing support: [what exists today]
• The gaps: [what's missing or not working]

Where marketing is falling short:
• Lead quality: Marketing leads are low quality or poor fit
• Missing collateral: Don't have materials I need for my targets
• No air cover: No campaigns or awareness building in my accounts
• Campaign misalignment: Marketing programs don't match my focus
• Weak digital presence: Prospects can't find us or what they find is poor
• No sales enablement: Not training me on how to use marketing materials

Help me:
• Define what marketing support I actually need to hit quota
• Create service level agreement between sales and marketing
• Improve lead quality and qualification
• Develop collateral and content that helps me sell
• Align campaigns to my target accounts and priorities
• Build better feedback loop between sales and marketing

My specific gap: [describe - marketing is focused on different segment, lead quality is terrible, missing case studies I need, no executive-level content, digital presence is weak, or they don't understand what I actually need].` },
      { title: 'G5. Practice/Portfolio Partnerships', prompt: `Challenge: Practice leaders won't collaborate on deals

Prompt to run/edit: I can't get practices to work together on deals and it's limiting what I can sell.

Here's the situation:
• Opportunity: [what I'm trying to sell]
• Practices needed: [which capabilities]
• Practice leaders: [who and their priorities]
• Current collaboration: [what's working or not]

The practice collaboration issues:
• Fighting for ownership: Practice leaders competing for client relationship
• Inconsistent messaging: Different practices telling different stories
• Resource hoarding: Practices protecting their resources
• P&L conflicts: Can't agree on margin allocation
• Lack of integration: Separate offerings not integrated solution
• Competing priorities: Other opportunities more important to them

Help me:
• Get practices aligned on pursuing this together
• Create governance structure for multi-practice deals
• Resolve ownership and control concerns
• Design fair margin allocation model
• Build integrated solution from separate capabilities
• Make this a priority for all practices involved

My specific situation: [describe - two practice leaders both want to own client, can't agree on solution approach, margin allocation dispute, one practice won't commit, or client is frustrated by our internal dysfunction].` },
      { title: 'G6. Partner/Alliance Engagement', prompt: `Challenge: Not leveraging partners effectively

Prompt to run/edit: I'm struggling to effectively leverage partner relationships to win more business.

Here's the situation:
• My target market: [where I sell]
• Relevant partners: [technology vendors, SI partners, referral sources]
• Partnership type: [co-sell, referral, solution integration, etc.]
• Current partner engagement: [what's happening or not happening]

The partner challenges:
• Technology vendor co-selling: Not getting support from platform vendors
• SI partner conflicts: Other system integrators competing with us
• Referral partner activation: Partners with relationships not referring
• Joint GTM execution: Can't execute joint go-to-market plays
• Partner priorities: We're not important to them
• Internal resistance: My organization doesn't want to work with partners

Help me:
• Identify which partner relationships have most potential
• Develop activation strategy for dormant partnerships
• Create joint value proposition and GTM approach
• Navigate partner conflicts and channel dynamics
• Build internal support for partner leverage
• Set up mechanics to make partnering easy

My specific issue: [describe - technology vendor won't co-sell with me, partner is also a competitor, can't get partners engaged, my company discourages partnering, or don't know how to activate partner relationships].` }
    ],
    'H. Sales Operations & Enablement': [
      { title: 'H1. CRM & Pipeline Management', prompt: `Challenge: Poor data quality or low system adoption

Prompt to run/edit: I have CRM challenges that are hurting pipeline visibility and forecast accuracy.

Here's the situation:
• CRM system: [Salesforce, Dynamics, other]
• Current adoption: [percentage of team using it consistently]
• Data quality: [how accurate and complete]
• Reporting capabilities: [what works, what doesn't]

The CRM problems:
• Low seller adoption: Team sees it as administrative burden not helpful tool
• Inaccurate data: Opportunities not updated, wrong stages, bad close dates
• Poor reporting: Can't get insights I need from the system
• Process compliance: Team not following required sales process in CRM
• Integration issues: Disconnected from other systems we use
• Complexity: Too complicated, too many fields, hard to use

Help me:
• Improve CRM adoption across the team
• Establish data quality standards and enforcement
• Build reports and dashboards that actually help me manage
• Simplify and streamline CRM processes
• Create accountability for keeping CRM updated
• Make CRM useful tool not just reporting requirement

My specific challenge: [describe - team refuses to use it, data is garbage so can't trust pipeline, can't forecast accurately, too complex and time-consuming, or leadership doesn't see value].` },
      { title: 'H2. Sales Process & Methodology', prompt: `Challenge: Inconsistent sales approach across team

Prompt to run/edit: My team lacks consistent sales process and methodology which is hurting our effectiveness.

Here's the situation:
• Team size: [number of sellers]
• What we sell: [complexity and sales cycle]
• Current approach: [describe what exists if anything]
• Inconsistencies: [what varies across team]

The process gaps:
• No defined methodology: Everyone does their own thing
• Poor qualification discipline: Chasing bad deals or missing good ones
• Inconsistent opportunity reviews: No standard way to assess deals
• Weak pipeline hygiene: Stale opportunities, unrealistic forecasts
• Lack of playbooks: No repeatable approaches for common situations
• No stage gates: Unclear what it takes to advance opportunities

Help me:
• Select or design sales methodology appropriate for our business
• Define clear sales stages with entrance/exit criteria
• Create qualification framework (MEDDIC, BANT, or custom)
• Build opportunity review cadence and standards
• Develop playbooks for common sales scenarios
• Implement without making it feel like bureaucracy

My specific gap: [describe - everyone selling differently, can't scale best practices, new hires take too long to ramp, inconsistent results across team, or resistance to process].` },
      { title: 'H3. Sales Training & Skills Development', prompt: `Challenge: Team lacks critical capabilities

Prompt to run/edit: My team needs skills development to hit their numbers.

Here's my team situation:
• Team composition: [experience levels, backgrounds]
• What we sell: [solutions and to whom]
• Performance gaps: [where they're struggling]
• Current training: [what exists today]

The skill gaps:
• Consultative selling: Too transactional, not uncovering real needs
• Industry expertise: Don't understand client's business deeply enough
• Solution articulation: Can't explain our value compellingly
• Negotiation skills: Giving away too much or walking away too early
• Digital/AI knowledge: Can't speak credibly about emerging technologies
• Executive engagement: Uncomfortable at C-level conversations
• Financial acumen: Can't build business cases or speak CFO language

Help me:
• Assess which skills are most critical to improve
• Design training approach (formal, coaching, peer learning)
• Create practical application not just theory
• Measure skill improvement and business impact
• Build ongoing development not one-time event
• Tailor to different seller experience levels

My specific need: [describe - new hires need foundational skills, experienced team needs upskilling on new offerings, everyone struggles with specific skill, or gaps preventing us from moving upmarket].` },
      { title: 'H4. Compensation & Incentives', prompt: `Challenge: Comp plan drives wrong behaviors

Prompt to run/edit: Our compensation structure isn't driving the right behaviors and I need to fix it.

Here's the current plan:
• Structure: [base/variable split, accelerators, etc.]
• What gets paid: [revenue, profit, new logos, renewals, etc.]
• Complexity: [how complicated is it]
• Team feedback: [what sellers say about it]

The compensation issues:
• Misaligned incentives: Rewards wrong activities or outcomes
• Complexity causing confusion: Sellers don't understand how they get paid
• Delayed payments: Too long between achievement and payment
• Territory inequity: Huge variance in territory potential
• Team-selling recognition: Doesn't reward collaboration
• Focus mismatch: Pays for things that don't match company priorities

Help me:
• Design comp plan that drives desired behaviors
• Balance simplicity with right incentives
• Create equity across territories while rewarding performance
• Incorporate team-selling and collaboration
• Structure accelerators and SPIFs effectively
• Communicate plan so everyone understands it

My specific problem: [describe - sellers sandbagging because of bad accelerators, fighting over deals because credit allocation is broken, ignoring strategic priorities because they're not incented, or plan is so complex nobody understands it].` },
      { title: 'H5. Sales Tools & Technology', prompt: `Challenge: Inadequate tools hampering productivity

Prompt to run/edit: I'm missing critical sales tools that would improve my team's productivity and effectiveness.

Here's my current toolkit:
• CRM: [what you have]
• Other tools: [list what exists]
• Gaps: [what's missing]
• Budget: [constraints if any]

What tools I need:
• Account intelligence platforms: [ZoomInfo, LinkedIn Sales Nav, 6sense, Demandbase]
• Proposal automation: [RFP response, proposal generation]
• Pricing tools: [configure-price-quote, deal desk automation]
• Competitive intelligence: [Crayon, Klue, competitor tracking]
• Sales engagement: [Outreach, SalesLoft, cadence management]
• Conversation intelligence: [Gong, Chorus, call recording and analysis]
• Contract management: [CLM, e-signature, redlining]

Help me:
• Prioritize which tools would have biggest impact
• Build business case for tool investment
• Evaluate vendor options and capabilities
• Plan implementation and adoption strategy
• Measure ROI on tools
• Avoid tool sprawl and complexity

My specific need: [describe - spending too much time on administrative work, can't find the right accounts to target, competitive intelligence is ad hoc, proposal development takes forever, or losing deals because we're slower than competitors].` }
    ],
    'I. Competitive & Market Positioning': [
      { title: 'I1. Competitive Intelligence', prompt: `Challenge: Blind to competitor strategies and moves

Prompt to run/edit: I need better competitive intelligence to anticipate and counter competitor moves.

Here's my competitive landscape:
• Key competitors: [list main rivals]
• Market dynamics: [consolidation, new entrants, disruption]
• Current intelligence: [what I know and how I know it]
• Gaps: [what I'm missing]

The competitive intelligence I need:
• Competitor pricing: What they're charging and discounting practices
• Their win themes: How they're positioning and differentiating
• Capability investments: What they're building or acquiring
• Client feedback: What clients say about them vs. us
• Their account strategies: Which accounts they're targeting and how
• Key personnel moves: Who they're hiring and from where
• Financial health: Are they struggling or thriving

Help me:
• Build systematic competitive intelligence process
• Identify best sources for competitor information
• Create competitor battle cards for my team
• Train team to gather and share intelligence
• Analyze patterns to anticipate their moves
• Turn intelligence into actionable counter-strategies

My specific gap: [describe - consistently surprised by competitor moves, don't know how they're winning, can't counter their positioning effectively, or losing deals to competitors I know nothing about].` },
      { title: 'I2. Differentiation & Positioning', prompt: `Challenge: Perceived as commoditized or "same as others"

Prompt to run/edit: I'm struggling with differentiation - clients see us as same as competitors.

Here's my situation:
• What I sell: [solutions/services]
• Target market: [who I sell to]
• Main competitors: [who I compete against]
• Current positioning: [how I position today]
• Client perception: [what I hear from prospects/clients]

Where differentiation is failing:
• Technical capability parity: Clients think we all do the same thing
• Offshore rate competition: Competing primarily on price against low-cost providers
• Brand perception vs. Big 4: Seen as tier-2 despite our capabilities
• Articulating unique value: Can't explain what makes us different/better
• Proof points: Lack compelling evidence of differentiation
• Me-too positioning: Saying same things as everyone else

Help me:
• Identify truly defensible differentiation (not made-up marketing)
• Develop positioning that resonates with target buyers
• Create proof points and stories that validate differentiation
• Train team to articulate and defend our uniqueness
• Position against specific competitors effectively
• Avoid commodity trap and price competition

My specific challenge: [describe - clients say we're all the same, competing on price, can't articulate why we're better, lost our differentiation as market evolved, or new competitors have stronger positioning].` },
      { title: 'I3. Analyst Relations & Market Perception', prompt: `Challenge: Poor positioning in analyst reports

Prompt to run/edit: I need to improve our market perception and positioning with industry analysts.

Here's our current situation:
• Relevant analysts: [Gartner, Forrester, IDC, others]
• Current positioning: [quadrant/wave placement if applicable]
• Competitor positioning: [how rivals are positioned]
• Impact on sales: [how this affects deal outcomes]

The analyst/market perception issues:
• Gartner/Forrester positioning: Not in leaders quadrant or not included
• Client reference reluctance: Can't get clients to talk to analysts
• Case study scarcity: Don't have compelling public success stories
• Industry recognition gaps: Not winning awards or being recognized
• Thought leadership absence: Not seen as innovators or thought leaders
• Negative perception: Historical issues still affecting brand

Help me:
• Develop analyst relations strategy
• Improve positioning in relevant magic quadrants/waves
• Build referenceable client base willing to speak publicly
• Create case studies that showcase our capabilities
• Establish thought leadership in key areas
• Address negative perceptions or historical issues

My specific issue: [describe - not in Gartner magic quadrant, positioned as niche player, competitors have better analyst coverage, clients won't be references, or brand perception doesn't match reality].` }
    ],
    'J. Leadership & Organizational Challenges': [
      { title: 'J1. Territory Design & Coverage', prompt: `Challenge: Inefficient territory structure or coverage model

Prompt to run/edit: My territory design isn't optimal and it's creating inefficiency or inequity.

Here's my current structure:
• Team size: [number of sellers]
• Territory structure: [geographic, vertical, account-based, etc.]
• Coverage model: [hunter/farmer, named accounts, open territory]
• Known issues: [what's not working]

The territory design problems:
• Imbalanced revenue potential: Some territories much richer than others
• Geographic coverage gaps: Areas not covered or over-covered
• Account segmentation issues: Wrong accounts in wrong territories
• Hunter vs. farmer allocation: Not clear who hunts vs. grows
• Territory conflicts: Overlap causing seller conflicts
• Market changes: Structure doesn't match current market

Help me:
• Analyze current territory performance and potential
• Design territory structure that balances coverage and equity
• Define clear segmentation and assignment rules
• Plan transition to new structure without disruption
• Set quotas that reflect territory potential
• Create coverage model that matches go-to-market strategy

My specific challenge: [describe - inherited bad structure, market has shifted, top performers in best territories creating inequity, gaps in coverage, or team fighting over accounts].` },
      { title: 'J2. Sales Team Performance Management', prompt: `Challenge: Underperforming sellers or weak coaching

Prompt to run/edit: I have performance management challenges that are hurting team results.

Here's my team situation:
• Team size: [number]
• Performance distribution: [how many hitting/missing quota]
• Underperformers: [number and their situations]
• Coaching approach: [what I do today]

The performance management issues:
• Underperformers not improving: Bottom performers staying at bottom
• Lack of coaching rigor: Not coaching consistently or effectively
• No performance improvement plans: Avoiding difficult conversations
• Pipeline accountability missing: Not holding team accountable for pipeline health
• Activity management: Not tracking or managing leading indicators
• Skill development gaps: Not developing capabilities they need

Help me:
• Establish performance standards and accountability
• Create coaching cadence and methodology
• Develop performance improvement process
• Build leading indicator dashboard and management
• Have difficult conversations with underperformers
• Balance coaching and performance management

My specific challenge: [describe - have underperformers I'm avoiding dealing with, don't know how to coach effectively, no time for coaching, performance conversations go poorly, or team doesn't respect performance management process].` },
      { title: 'J3. Talent Acquisition & Retention', prompt: `Challenge: Can't attract or keep top sales talent

Prompt to run/edit: I'm struggling to attract and retain the sales talent I need.

Here's my talent situation:
• Open positions: [number and types]
• Recent turnover: [who left and why]
• Competition for talent: [who we compete against for hires]
• Reputation: [what candidates say about us]

The talent challenges:
• Recruiting senior sellers: Can't attract experienced enterprise sellers
• Competing for talent: Losing candidates to competitors
• Retention of top performers: Best people leaving
• Succession planning gaps: No bench strength for key roles
• Onboarding effectiveness: New hires not ramping fast enough
• Employer brand: Not seen as attractive place for sales talent

Help me:
• Define ideal candidate profiles for key roles
• Build recruiting strategy and sourcing approach
• Develop compelling value proposition for candidates
• Create onboarding program that accelerates ramp
• Address retention issues for top performers
• Build succession bench for critical roles

My specific issue: [describe - can't find candidates with right skills, losing finalists to competitors who pay more, high turnover due to specific issues, or new hires not working out].` },
      { title: 'J4. Sales Culture & Morale', prompt: `Challenge: Team disengagement or toxic dynamics

Prompt to run/edit: I have cultural issues on my sales team that are affecting performance and morale.

Here's what's happening:
• Team size and composition: [describe team]
• Cultural symptoms: [what you're observing]
• Recent changes: [anything that triggered issues]
• Impact: [effect on performance]

The cultural/morale issues:
• Low morale from missed targets: Team is discouraged and defeated
• Poor collaboration: Sellers not helping each other, hoarding information
• Political infighting: Backstabbing, credit-stealing, toxic competition
• Lack of recognition: Good work not acknowledged or celebrated
• Burnout: Unrealistic expectations driving exhaustion
• No trust: Team doesn't trust leadership or each other
• Resistance to change: Team fighting initiatives

Help me:
• Diagnose root causes of cultural issues
• Rebuild trust and psychological safety
• Create recognition and celebration practices
• Address toxic behaviors and people
• Set realistic expectations and goals
• Build collaborative vs. competitive culture

My specific situation: [describe - team is demoralized after tough year, top performer is toxic but I can't afford to lose them, significant change is creating resistance, or inherited dysfunctional team culture].` },
      { title: 'J5. Sales Strategy & Planning', prompt: `Challenge: Unclear or misaligned sales strategy

Prompt to run/edit: I lack strategic clarity on where to focus and how to win.

Here's my current situation:
• Market served: [industries, segments, geographies]
• Offerings: [what I sell]
• Current strategy: [if any exists]
• Results: [what's working and not working]

What's missing in strategy:
• Target market focus: Trying to be everything to everyone
• Service portfolio prioritization: Too many offerings, no focus
• Channel strategy: Unclear direct vs. partner approach
• Geographic expansion decisions: Where to invest for growth
• Investment allocation: Resources spread too thin
• Competitive strategy: How we'll win against specific competitors

Help me:
• Define clear target market and ideal client profile
• Prioritize service portfolio for focus
• Develop channel and partnership strategy
• Make geographic expansion decisions
• Allocate resources to highest potential
• Build competitive strategy and positioning

My specific gap: [describe - trying to sell everything to everyone, no prioritization so resources scattered, unclear how to compete effectively, or strategy doesn't match market reality].` }
    ],
    'K. Financial & Business Metrics': [
      { title: 'K1. Revenue Attainment & Forecasting', prompt: `Challenge: Missing targets or inaccurate forecasts

Prompt to run/edit: I'm struggling with revenue attainment and forecast accuracy.

Here's my situation:
• Quota: [$X]
• Current attainment: [% to quota]
• Forecast accuracy: [how far off I typically am]
• Team performance: [% of team hitting quota]

The attainment and forecasting challenges:
• Consistent forecast misses: Forecasting too high or too low
• Pipeline coverage gaps: Not enough pipeline to hit numbers
• Back-end loaded quarters: Everything closing in last week
• Individual seller variance: Wide spread between top and bottom performers
• Deal slippage: Forecasted deals not closing when expected
• Visibility issues: Don't see problems coming early enough

Help me:
• Improve forecast accuracy and methodology
• Build adequate pipeline coverage (3X? 4X?)
• Manage linearity to avoid back-loaded quarters
• Improve deal inspection and qualification
• Create early warning systems for at-risk forecast
• Address performance variance across team

My specific challenge: [describe - consistently miss forecast, pipeline looks good but deals don't close, everything slips to next quarter, a few reps hit but most miss, or can't predict what will actually close].` },
      { title: 'K2. Deal Profitability & Margins', prompt: `Challenge: Winning low-margin or unprofitable deals

Prompt to run/edit: I'm winning deals but margins are too low or we're losing money on them.

Here's my situation:
• Revenue: [what I'm generating]
• Margin expectations: [target margins]
• Actual margins: [what I'm delivering]
• Why margins are low: [root causes]

What's hurting profitability:
• Aggressive pricing to win: Underbidding to beat competitors
• Scope creep post-sale: Delivering more than we priced for
• Delivery cost overruns: Execution costs exceeding estimates
• Selling rates vs. value: Competing on hourly rates not business value
• Wrong deal mix: Too many small low-margin deals
• Hidden costs: Underestimating true cost to deliver

Help me:
• Price for profitability not just to win
• Prevent scope creep through better SOWs
• Align sales pricing with actual delivery costs
• Shift from rate-based to value-based selling
• Target more profitable deal types
• Understand true costs including hidden costs

My specific issue: [describe - pressure to discount to win, delivery says my pricing doesn't cover their costs, scope always expands after contract, or small deals are killing margins with overhead].` },
      { title: 'K3. Sales Efficiency & Productivity', prompt: `Challenge: High cost of sales or long ramp times

Prompt to run/edit: I have sales efficiency issues that are hurting profitability.

Here's my situation:
• Cost of sales: [% of revenue or absolute]
• Benchmark: [industry standard or target]
• Team productivity: [deals per rep, revenue per rep]
• Ramp time: [how long to full productivity]

The efficiency problems:
• Long new hire ramp time: 12+ months to full productivity
• High customer acquisition cost: Too expensive to win new business
• Low conversion rates: Lots of activity, few deals closing
• Administrative burden: Sellers spending time on non-selling activities
• Tool/system inefficiency: Technology not enabling productivity
• Long sales cycles: Taking too long to close deals

Help me:
• Accelerate new hire ramp with better onboarding
• Reduce customer acquisition costs
• Improve conversion at each stage of funnel
• Eliminate administrative burden on sellers
• Leverage technology to improve productivity
• Shorten sales cycles through better process

My specific challenge: [describe - new hires take forever to contribute, CAC is too high to be profitable, conversion rates are terrible, sellers spending 50% of time on admin work, or sales cycles are painfully long].` },
      { title: 'K4. Customer Lifetime Value', prompt: `Challenge: High churn or low account expansion

Prompt to run/edit: My customer lifetime value metrics are weak and I need to improve retention and growth.

Here's my situation:
• Customer count: [number]
• Churn rate: [% annual]
• Net retention: [revenue retention including expansion]
• Expansion rate: [growth in existing accounts]
• Average customer tenure: [years]

What's impacting lifetime value:
• Client attrition after projects: Don't retain clients after initial work
• Stalled growth in accounts: Can't expand beyond initial footprint
• Inability to demonstrate value: Can't show ongoing business impact
• Competitive displacement: Losing accounts to competitors
• Price pressure at renewal: Having to discount to retain
• Delivery issues: Problems causing client departures

Help me:
• Reduce churn through better client success
• Increase expansion in existing accounts
• Build land-and-expand model
• Improve value demonstration and ROI
• Create client loyalty and stickiness
• Defend against competitive displacement

My specific issue: [describe - losing clients after first project, can't grow accounts beyond initial sale, clients churning due to delivery problems, price pressure at every renewal, or competitive losses in base].` }
    ]
  };

  // ===== UI =====
  const shell = "max-w-6xl mx-auto px-3 sm:px-4";
  const panel = "bg-white/95 backdrop-blur rounded-2xl shadow-sm border-2 border-slate-300";
  const headerBar = "bg-[#0B1F3B] text-white rounded-2xl p-2 sm:p-3 flex items-center justify-between gap-3 shadow";

  // ===== Auth Screens =====
  // Show loading screen while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h1 className="text-4xl font-bold text-white mb-4">OneMindAI</h1>
          <p className="text-gray-300 mb-8">Collective Intelligence, Optimised</p>
          <button
            onClick={() => setShowAuthModal(true)}
            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all font-semibold text-lg"
          >
            Sign In to Continue
          </button>
        </div>
        <AuthModal 
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          initialMode="signin"
        />
      </div>
    );
  }

  // ===== Main App (authenticated) =====
  return (
    <div className={`${shell} space-y-4 pb-24 transition-all duration-300 ${superDebugMode ? 'mr-[480px]' : ''}`}>
      {/* Header */}
      <div className={headerBar}>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold tracking-tight truncate">OneMindAI: Collective Intelligence, Optimised</h1>
          <div className="text-[12px] sm:text-[13px] italic">The future-proof engine that fuses the smartest minds into one perfect answer.</div>
          <div className="opacity-80 text-[11px] sm:text-[12px]">Formula2GX Digital Advanced Incubation Labs Platform</div>
        </div>
        <div className="flex items-center gap-3">
          {/* Controls - hidden on mobile */}
          <div className="hidden sm:flex items-center gap-3">
            <label className="text-xs flex items-center gap-2 px-2 py-1 rounded-lg bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-400/50 cursor-pointer hover:from-purple-600/30 hover:to-blue-600/30 transition">
              <input type="checkbox" checked={storyMode} onChange={() => {
                setStoryMode(v => !v);
                if (!storyMode) setStoryStep(1);
              }} />
              <span className="font-semibold">Story Mode</span>
            </label>
            <label className="text-xs flex items-center gap-2"><input type="checkbox" checked={showBusiness} onChange={() => setShowBusiness(v => !v)} /><span>Business</span></label>
            <label className="text-xs flex items-center gap-2"><input type="checkbox" checked={showTech} onChange={() => setShowTech(v => !v)} /><span>Technical</span></label>
            <label className="text-xs flex items-center gap-2">
              <input type="checkbox" checked={consoleVisible} onChange={toggleConsole} />
              <span>Inspect</span>
            </label>
            <label className="text-xs flex items-center gap-2 px-2 py-1 rounded-lg bg-gradient-to-r from-purple-600/30 to-pink-600/30 border border-purple-400/50 cursor-pointer hover:from-purple-600/40 hover:to-pink-600/40 transition">
              <input type="checkbox" checked={superDebugMode} onChange={() => setSuperDebugMode(v => !v)} />
              <span className="font-semibold">🔧 Debug</span>
            </label>
            <button
              onClick={simulateMultipleErrors}
              className="text-xs px-3 py-1 bg-slate-500 text-white rounded-lg hover:bg-slate-600 transition font-medium"
              title="Simulate multi-error display"
            >
              Simulate
            </button>
          </div>
          {/* User Menu - always visible */}
          <UserMenu onOpenAdmin={onOpenAdmin} />
        </div>
      </div>

      {/* Story Mode Progress Indicator */}
      {storyMode && (
        <div className="flex items-center justify-between bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-2xl p-3 shadow">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold">Step {storyStep} of 4</span>
            <span className="opacity-90">
              {storyStep === 1 && "· Choose your role"}
              {storyStep === 2 && "· Define your intent"}
              {storyStep === 3 && "· Select engines"}
              {storyStep === 4 && "· Review & merge results"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className={`h-2 w-10 rounded-full transition-all ${
                    s <= storyStep ? "bg-white" : "bg-white/30"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Story Mode Step 1: Role Selection */}
      {storyMode && storyStep === 1 && (
        <div className={`${panel} p-4 sm:p-6 border-t-4 border-purple-600`}>
          <div className="space-y-3">
            <p className="text-xs font-semibold tracking-wide text-purple-600 uppercase">Step 1 · Identity</p>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
              Who are you, and what do you want to do today?
            </h2>
            <p className="text-sm text-slate-600 max-w-2xl">
              Start by choosing the role you are operating in right now. OneMind will shape recommendations, language and actions to match your context.
            </p>
          </div>

          {/* Role Selection - Using existing role cards */}
          <div className="mt-6">
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={() => {
                  setShowExecutiveRoles(!showExecutiveRoles);
                  setShowOtherRoles(false);
                }}
                className="flex items-center justify-between px-4 py-2 bg-purple-100 hover:bg-purple-200 rounded-full transition-colors border border-purple-300"
              >
                <span className="font-medium text-purple-900 text-sm">Executive roles</span>
                <span className="text-purple-700 ml-3">{showExecutiveRoles ? '▲' : '▼'}</span>
              </button>
              
              <button
                onClick={() => {
                  setShowOtherRoles(!showOtherRoles);
                  setShowExecutiveRoles(false);
                }}
                className="flex items-center justify-between px-4 py-2 bg-purple-100 hover:bg-purple-200 rounded-full transition-colors border border-purple-300"
              >
                <span className="font-medium text-purple-900 text-sm">Industry Specific Personas</span>
                <span className="text-purple-700 ml-3">{showOtherRoles ? '▲' : '▼'}</span>
              </button>
            </div>

            {/* Industry Specific Personas Dropdown */}
            {showOtherRoles && !selectedRoleDetails && (
              <div className="mt-2 p-2 bg-white border-2 border-purple-200 rounded-lg shadow-lg">
                {['IT Services'].map(role => (
                  <button
                    key={role}
                    onClick={() => {
                      setSelectedRole(role);
                      setSelectedRoleDetails({name: role, category: 'Industry'});
                    }}
                    className={`w-full text-left px-3 py-2 rounded hover:bg-purple-50 transition-colors ${selectedRole === role ? 'bg-purple-100 font-semibold text-purple-900' : 'text-gray-700'}`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            )}

            {/* Executive Roles Dropdown */}
            {showExecutiveRoles && !selectedRoleDetails && (
              <div className="mt-2 p-2 bg-white border-2 border-purple-200 rounded-lg shadow-lg">
                {['CEO', 'CDIO', 'Head of Sales'].map(role => (
                  <button
                    key={role}
                    onClick={() => {
                      setSelectedRole(role);
                      setSelectedRoleDetails({name: role, category: 'Executive'});
                    }}
                    className={`w-full text-left px-3 py-2 rounded hover:bg-purple-50 transition-colors ${selectedRole === role ? 'bg-purple-100 font-semibold text-purple-900' : 'text-gray-700'}`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            )}

            {/* Role Details Card - CEO/CDIO/Head of Sales */}
            {selectedRoleDetails && selectedRoleDetails.category === 'Executive' && (
              <div className="mt-4 p-4 bg-white border-2 border-purple-200 rounded-xl shadow-lg">
                <div className="flex gap-4">
                  {/* Left Side - Silhouette and Definition */}
                  <div className="flex-1">
                    {/* Silhouette Image */}
                    <div className="mb-4 flex justify-center">
                      <div className="w-32 h-32 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                        <svg className="w-20 h-20 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                        </svg>
                      </div>
                    </div>
                    
                    {/* Role Name */}
                    <h3 className="text-xl font-bold text-purple-900 text-center mb-2">{selectedRoleDetails.name}</h3>
                    
                    {/* Role Definition - CEO */}
                    {selectedRoleDetails.name === 'CEO' && (
                      <div className="text-sm text-gray-700 space-y-2">
                        <p className="font-semibold text-purple-800">Chief Executive Officer</p>
                        <p>The CEO is the highest-ranking executive in a company, responsible for making major corporate decisions, managing overall operations and resources, and acting as the main point of communication between the board of directors and corporate operations.</p>
                        <p className="text-xs text-gray-600 mt-2">Key responsibilities include strategic planning, stakeholder management, and organizational leadership.</p>
                      </div>
                    )}
                    
                    {/* Role Definition - CDIO */}
                    {selectedRoleDetails.name === 'CDIO' && (
                      <div className="text-sm text-gray-700 space-y-2">
                        <p className="font-semibold text-purple-800">Chief Digital & Information Officer</p>
                        <p>The CDIO oversees the organization's data strategy, information systems, and digital transformation initiatives. Responsible for data governance, analytics, cybersecurity, and leveraging data as a strategic asset to drive business value.</p>
                        <p className="text-xs text-gray-600 mt-2">Key responsibilities include data architecture, AI/ML implementation, information security, and digital innovation.</p>
                      </div>
                    )}
                    
                    {/* Role Definition - Head of Sales */}
                    {selectedRoleDetails.name === 'Head of Sales' && (
                      <div className="text-sm text-gray-700 space-y-2">
                        <p className="font-semibold text-purple-800">Head of Sales</p>
                        <p>The Head of Sales leads the sales organization, responsible for revenue generation, team performance, and customer acquisition. Oversees sales strategy, pipeline management, team development, and achieving revenue targets.</p>
                        <p className="text-xs text-gray-600 mt-2">Key responsibilities include sales strategy, team leadership, pipeline management, and revenue growth.</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Vertical Divider */}
                  <div className="w-px bg-purple-200"></div>
                  
                  {/* Right Side - Responsibilities and KPIs Input */}
                  <div className="flex-1">
                    <div className="mb-3">
                      <label className="block text-sm font-semibold text-purple-900 mb-2">
                        Your specific responsibilities and target KPIs
                      </label>
                      <textarea
                        value={roleResponsibilities}
                        onChange={(e) => setRoleResponsibilities(e.target.value)}
                        placeholder="e.g., Increase revenue by 25%, Expand into 3 new markets, Build a team of 50+ sales reps..."
                        className="w-full h-64 px-3 py-2 border-2 border-purple-200 rounded-lg text-sm focus:outline-none focus:border-purple-400 resize-none"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Optional: Add your specific goals and KPIs to get more personalized recommendations
                      </p>
                    </div>
                    
                    {/* Removed focus areas preview - now in Step 2 */}
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-xs font-semibold text-blue-800 mb-1">
                        ✨ Next Step
                      </p>
                      <p className="text-sm text-slate-700">
                        You'll be able to browse {selectedRoleDetails.name === 'CEO' ? '8' : selectedRoleDetails.name === 'CDIO' ? '8' : '11'} focus areas and select from curated prompts in the next step.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedRole && !selectedRoleDetails && (
              <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-xl">
                <p className="text-sm text-purple-900">
                  <span className="font-semibold">Selected role:</span> {selectedRole}
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setStoryStep(2)}
              disabled={!selectedRole}
              className={`px-8 py-2.5 rounded-full text-sm font-semibold shadow-sm transition ${
                selectedRole
                  ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Story Mode Step 2: Focus Areas & Prompt Preview */}
      {storyMode && storyStep === 2 && (
        <div className={`${panel} p-4 sm:p-6 border-t-4 border-purple-600`}>
          <div className="space-y-3 mb-6">
            <p className="text-xs font-semibold tracking-wide text-purple-600 uppercase">Step 2 · Focus Area</p>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
              Select your focus area and preview prompts
            </h2>
            <p className="text-sm text-slate-600">
              Browse {selectedRole} focus areas on the left, then click a prompt to continue.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-5">
            {/* Left Sidebar - Focus Areas with Categories */}
            <div className="md:col-span-2 bg-slate-50 rounded-lg border-2 border-slate-200 p-4 max-h-[600px] overflow-y-auto">
              <p className="text-xs font-semibold text-slate-700 mb-3 uppercase">Focus Areas</p>
              
              {selectedRole === 'Head of Sales' && (
                <div className="space-y-2">
                  {[
                    { category: 'A. Market & Opportunity', items: ['A1. Market Intelligence', 'A2. Target Account Selection', 'A3. Trigger Events'] },
                    { category: 'B. Pre-Bid Phase', items: ['B1. Stakeholder Mapping', 'B2. Access & Relationships', 'B3. Requirements Shaping', 'B4. Qualification', 'B5. Pre-Sales Alignment'] },
                    { category: 'C. Bid Phase', items: ['C1. Bid Strategy', 'C2. Pricing Strategy', 'C3. Solution Design', 'C4. Cross-Practice', 'C5. Marketing Support', 'C6. Delivery Engagement', 'C7. Risk Assessment', 'C8. Proposal Production', 'C9. Orals & Presentations'] },
                    { category: 'D. Negotiation & Closing', items: ['D1. Commercial Negotiations', 'D2. Legal & Contracting', 'D3. Procurement', 'D4. Internal Approvals', 'D5. Competitive Displacement'] },
                    { category: 'E. Post-Win Transition', items: ['E1. Sales-to-Delivery', 'E2. Expectation Alignment', 'E3. Delivery Risk', 'E4. Account Team Structure'] },
                    { category: 'F. Account Growth', items: ['F1. Whitespace', 'F2. Upsell & Cross-Sell', 'F3. Multi-BU Expansion', 'F4. Strategic Planning', 'F5. Client Success'] },
                    { category: 'G. Sales Team Coordination', items: ['G1. Team Coordination', 'G2. Sales & Pre-Sales', 'G3. Sales & Delivery', 'G4. Sales & Marketing', 'G5. Practice Partnerships', 'G6. Partner Engagement'] },
                    { category: 'H. Sales Operations & Enablement', items: ['H1. CRM & Pipeline', 'H2. Sales Process', 'H3. Training & Skills', 'H4. Compensation', 'H5. Sales Tools'] },
                    { category: 'I. Competitive & Market Positioning', items: ['I1. Competitive Intelligence', 'I2. Differentiation', 'I3. Analyst Relations'] },
                    { category: 'J. Leadership & Organizational Challenges', items: ['J1. Territory Design', 'J2. Performance Management', 'J3. Talent Acquisition', 'J4. Sales Culture', 'J5. Sales Strategy'] },
                    { category: 'K. Financial & Business Metrics', items: ['K1. Revenue & Forecasting', 'K2. Deal Profitability', 'K3. Sales Efficiency', 'K4. Customer Lifetime Value'] }
                  ].map((section, idx) => (
                    <div key={idx} className="border-b border-slate-300 pb-2">
                      <button
                        onClick={() => setActiveCategory(activeCategory === section.category ? '' : section.category)}
                        className="w-full text-left px-2 py-1.5 rounded hover:bg-purple-100 transition-colors flex items-center justify-between"
                      >
                        <span className="text-xs font-semibold text-purple-900">{section.category}</span>
                        <span className="text-purple-600">{activeCategory === section.category ? '▼' : '▶'}</span>
                      </button>
                      {activeCategory === section.category && (
                        <div className="mt-1 ml-2 space-y-1">
                          {section.items.map((item, itemIdx) => (
                            <button
                              key={itemIdx}
                              onClick={() => {
                                // Set the selected focus area to show prompts on the right
                                setActiveCategory(section.category);
                              }}
                              className="w-full text-left px-2 py-1 text-xs text-slate-700 hover:bg-purple-50 rounded transition-colors"
                            >
                              {item}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Side - Prompt Options */}
            <div className="md:col-span-3 space-y-4">
              <div className="bg-white rounded-lg border-2 border-purple-200 p-4">
                <p className="text-base font-semibold text-purple-700 mb-3">Available Prompts</p>
                <p className="text-base text-slate-600 mb-4">
                  {activeCategory ? `Showing prompts for: ${activeCategory}` : 'Select a focus area from the left to see available prompts'}
                </p>
                
                {/* Collapsible prompt preview cards */}
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {activeCategory && salesLeaderPrompts[activeCategory]?.map((item, idx) => {
                    const promptId = `${activeCategory}-${idx}`;
                    const isExpanded = expandedPromptId === promptId;
                    
                    return (
                      <div
                        key={idx}
                        className="bg-purple-50 border-2 border-purple-200 rounded-lg transition-all"
                      >
                        {/* Prompt Header - Click to expand/collapse */}
                        <button
                          onClick={() => setExpandedPromptId(isExpanded ? null : promptId)}
                          className="w-full p-4 text-left hover:bg-purple-100 rounded-lg transition-colors"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-purple-900 mb-1">{item.title}</p>
                              {!isExpanded && (
                                <p className="text-xs text-slate-600 line-clamp-2">{item.prompt.substring(0, 150)}...</p>
                              )}
                            </div>
                            <span className="text-purple-600 text-sm flex-shrink-0">
                              {isExpanded ? '▼' : '▶'}
                            </span>
                          </div>
                        </button>
                        
                        {/* Expanded Prompt Content */}
                        {isExpanded && (
                          <div className="px-4 pb-4 space-y-3">
                            <div className="bg-white rounded-lg p-3 border border-purple-200">
                              <p 
                                className="text-xs text-slate-700 whitespace-pre-wrap"
                                style={activeCategory.startsWith('A.') ? { 
                                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"',
                                  lineHeight: '1.6',
                                  letterSpacing: '-0.01em'
                                } : undefined}
                              >
                                {highlightPlaceholders(item.prompt)}
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                setPrompt(item.prompt);
                                setStoryStep(3);
                              }}
                              className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-sm hover:shadow-md text-sm font-medium"
                            >
                              Use This Prompt →
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {!activeCategory && (
                    <div className="text-center py-12 text-slate-400">
                      <p className="text-sm">👈 Select a focus area from the left to see available prompts</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between gap-2 mt-4">
                <button
                  onClick={() => setStoryStep(1)}
                  className="px-4 py-2 rounded-full border-2 border-slate-300 text-sm text-slate-700 bg-white hover:border-slate-400"
                >
                  Back
                </button>
                <button
                  onClick={() => setStoryStep(3)}
                  className="px-6 py-2 rounded-full text-sm font-semibold shadow-sm transition bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700"
                >
                  Proceed
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Story Mode Step 3: Prompt Editing */}
      {storyMode && storyStep === 3 && (
        <div className={`${panel} p-4 sm:p-6 border-t-4 border-purple-600`}>
          <div className="space-y-3">
            <p className="text-base font-semibold tracking-wide text-purple-600 uppercase">Step 3 · Customize Prompt</p>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
              Review and customize your prompt
            </h2>
            <p className="text-sm text-slate-600">
              Edit the prompt below or write your own from scratch.
            </p>
          </div>

          <div className="mt-6">
            <label className="text-xs font-medium text-slate-500 mb-2 block">Your prompt</label>
            <textarea
              rows={12}
              value={prompt}
              onChange={(e) => handlePromptChange(e.target.value)}
              placeholder="e.g., 'Summarise the top three strategic options I should put in my board pack next week.'"
              className="w-full rounded-2xl border-2 border-slate-300 bg-slate-50 focus:bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
            />
            {/* Placeholder hint */}
            {prompt.includes('[') && prompt.includes(']') && (
              <div className="mt-2 p-2 bg-purple-50/50 rounded-lg border border-purple-100">
                <p className="text-[11px] text-purple-600 mb-1 font-medium">📝 Updated Prompt:</p>
                <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">
                  {highlightPlaceholders(prompt, 'light')}
                </p>
              </div>
            )}
            {/* Character counter and warning */}
            <div className="flex justify-between items-center text-xs mt-2">
              <span className="text-slate-500">
                {prompt.length.toLocaleString()} / {LIMITS.PROMPT_HARD_LIMIT.toLocaleString()} characters
              </span>
              {promptWarning && (
                <span className={prompt.length > LIMITS.PROMPT_HARD_LIMIT ? 'text-red-600 font-medium' : 'text-orange-600 font-medium'}>
                  {promptWarning}
                </span>
              )}
            </div>
          </div>

          {/* File Upload */}
          <div className="mt-4">
            <FileUploadZone
              files={uploadedFiles}
              onFilesChange={setUploadedFiles}
            />
          </div>

          {/* Navigation Buttons */}
          <div className="mt-6 flex justify-between gap-2">
            <button
              onClick={() => setStoryStep(2)}
              className="px-4 py-2 rounded-full border-2 border-slate-300 text-sm text-slate-700 bg-white hover:border-slate-400"
            >
              Back
            </button>
            <button
              onClick={() => setStoryStep(4)}
              disabled={!prompt.trim()}
              className={`px-6 py-2 rounded-full text-sm font-medium shadow-sm transition ${
                prompt.trim()
                  ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              Choose Engines
            </button>
          </div>
        </div>
      )}

      {/* Story Mode Step 4: Engine Selection */}
      {storyMode && storyStep === 4 && (
        <div className="space-y-4">
          <div className={`${panel} p-4 sm:p-6 border-t-4 border-purple-600`}>
            <div className="space-y-3">
              <p className="text-xs font-semibold tracking-wide text-purple-600 uppercase">Step 4 · Engines</p>
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
                    Choose which AI engines to run
                  </h2>
                  <p className="text-sm text-slate-600 mt-1">
                    Select multiple engines to get diverse perspectives. OneMind will run them in parallel.
                  </p>
                </div>
                <button
                  onClick={() => setShowEngineRecommendations(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-md hover:shadow-lg whitespace-nowrap"
                >
                  <span className="font-medium text-sm">Let us select for you</span>
                </button>
              </div>
            </div>

            {/* Dynamic Estimated Cost Calculator */}
            {(() => {
              const selectedCount = Object.values(selected).filter(Boolean).length;
              const inputChars = prompt.length;
              
              // Use the same estimateTokens function as run summary (tiktoken as default)
              const inputTokens = estimateTokens(prompt, 'tiktoken');
              
              // Estimate output: typical AI response is 2-3x input for short prompts, less for long
              // This matches what run summary calculates after actual response
              const estimatedOutputTokens = Math.min(4000, Math.max(100, Math.round(inputTokens * 2)));
              
              const { totalCost, breakdown } = calculateEstimatedCost(engines, selected, inputTokens, estimatedOutputTokens);
              
              if (selectedCount === 0) return null;
              
              return (
                <div className="mt-4 px-4 py-2.5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-6">
                      <div>
                        <p className="text-[10px] font-medium text-emerald-600 uppercase tracking-wide">Est. Cost</p>
                        <p className="text-lg font-bold text-emerald-800">
                          ${totalCost < 0.01 ? totalCost.toFixed(5) : totalCost.toFixed(4)}
                        </p>
                      </div>
                      <div className="h-8 w-px bg-emerald-200"></div>
                      <div className="flex items-center gap-4 text-xs">
                        <div>
                          <span className="text-slate-500">Engines:</span>
                          <span className="font-semibold text-slate-700 ml-1">{selectedCount}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">In:</span>
                          <span className="font-semibold text-slate-700 ml-1">{inputTokens.toLocaleString()} <span className="text-slate-400">({inputChars} chars)</span></span>
                        </div>
                        <div>
                          <span className="text-slate-500">Est. Out:</span>
                          <span className="font-semibold text-slate-700 ml-1">~{estimatedOutputTokens.toLocaleString()}/engine</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {breakdown.length > 0 && (
                        <details className="text-xs">
                          <summary className="text-emerald-600 cursor-pointer hover:text-emerald-700 font-medium">
                            Breakdown
                          </summary>
                          <div className="absolute right-4 mt-1 p-2 bg-white border border-emerald-200 rounded-lg shadow-lg z-10 grid grid-cols-2 gap-1.5 min-w-[200px]">
                            {breakdown.map((item) => (
                              <div key={item.engine} className="flex justify-between gap-2 px-2 py-1 bg-emerald-50 rounded text-[11px]">
                                <span className="text-slate-600 truncate">{item.engine}</span>
                                <span className="text-emerald-700 font-medium">${item.cost < 0.0001 ? item.cost.toFixed(5) : item.cost.toFixed(4)}</span>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                      <button
                        onClick={() => setShowBalanceManager(true)}
                        className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors font-medium"
                      >
                        Manage Balances
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* All Engines - Pills or Expanded Cards */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
              {engines.map((engine) => {
                const isSelected = selected[engine.id];
                const isExpanded = expandedEngines.has(engine.id);
                const brandColor = providerStyles[engine.provider] || 'bg-slate-700';
                const warn = warningForEngine(engine);
                
                const toggleExpand = () => {
                  const newSet = new Set(expandedEngines);
                  if (newSet.has(engine.id)) {
                    newSet.delete(engine.id);
                  } else {
                    newSet.add(engine.id);
                  }
                  setExpandedEngines(newSet);
                };

                // If collapsed, show as pill
                if (!isExpanded) {
                  return (
                    <div
                      key={engine.id}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${brandColor} text-white hover:shadow-lg cursor-pointer self-start h-fit ${
                        isSelected ? 'ring-2 ring-purple-500 ring-offset-2' : 'opacity-80 hover:opacity-100'
                      }`}
                      onClick={toggleExpand}
                    >
                      <span>{engine.name}</span>
                      <span className="text-xs opacity-75">Context {(engine.contextLimit / 1000).toFixed(0)}k • {engine.tokenizer}</span>
                      <div className="ml-auto flex items-center gap-1">
                        <div 
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                            isSelected 
                              ? 'bg-white border-white shadow-md' 
                              : 'border-white bg-white/30 hover:bg-white/50'
                          }`}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            toggleEngine(engine.id);
                          }}
                        >
                          {isSelected && (
                            <svg className="w-3.5 h-3.5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <svg className="w-4 h-4 opacity-75" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  );
                }

                // If expanded, show full card
                const pr = (pricing as any)[engine.provider]?.[engine.selectedVersion];
                const fallbackPricing = (BASE_PRICING as any)[engine.provider]?.[engine.selectedVersion];
                const actualPricing = pr || fallbackPricing;
                
                const P = estimateTokens(prompt, engine.tokenizer);
                const minTokens = Math.max(P, 100);
                const nowIn = Math.min(minTokens, engine.contextLimit);
                const outCap = computeOutCap(engine, nowIn);
                const minOut = Math.max(200, Math.floor(0.35 * outCap));
                
                const calculatedMinSpend = actualPricing ? (nowIn / 1_000_000) * actualPricing.in + (minOut / 1_000_000) * actualPricing.out : 0;
                const calculatedMaxSpend = actualPricing ? (nowIn / 1_000_000) * actualPricing.in + (outCap / 1_000_000) * actualPricing.out : 0;
                const minSpend = Math.max(calculatedMinSpend, 0.01);
                const maxSpend = Math.max(calculatedMaxSpend, 0.01);
                
                return (
                  <div
                    key={engine.id}
                    className="w-full flex flex-col items-start text-left rounded-2xl border-2 px-4 py-3 text-sm transition relative overflow-hidden border-purple-300 bg-white shadow-lg"
                  >
                    {/* Brand color bar on left */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${brandColor}`}></div>
                    
                    {/* Clickable header area - Collapse */}
                    <button
                      onClick={toggleExpand}
                      className="flex items-center gap-2 w-full text-left"
                    >
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold text-white ${brandColor}`}>
                        {engine.name}
                      </span>
                      <div className="ml-auto flex items-center gap-2">
                        <span className="text-xs text-slate-500">Select Engine</span>
                        <div 
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                            isSelected ? 'bg-purple-600 border-purple-600' : 'border-slate-300 bg-white'
                          }`}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            toggleEngine(engine.id);
                          }}
                        >
                          {isSelected && (
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <svg className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>
                    
                    {/* Model Version Dropdown */}
                    <div className="w-full mt-2">
                      <label className="text-xs text-slate-600 block mb-1">Version</label>
                      <select 
                        className="w-full text-xs border rounded px-2 py-1.5 bg-white"
                        value={engine.selectedVersion} 
                        onChange={(ev) => {
                          ev.stopPropagation();
                          updateVersion(engine.id, ev.target.value);
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {engine.versions.map(v => {
                          const excludedModels = ['gemini-2.0-flash-exp', 'claude-3.5-sonnet', 'claude-3-5-sonnet-20241022', 'claude-3-haiku'];
                          const showGreenDot = liveMode && !excludedModels.includes(v);
                          return (
                            <option key={v} value={v}>
                              {showGreenDot ? '🟢 ' : ''}{v}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    
                    {/* API Key Field */}
                    <div className="w-full mt-2">
                      <label className="text-xs text-slate-600 block mb-1">API Key</label>
                      <div className="flex items-center gap-2">
                        <input 
                          className="flex-1 text-xs border rounded px-2 py-1.5 bg-white" 
                          type={showApiKey[engine.id] ? "text" : "password"} 
                          placeholder="Enter API key..." 
                          value={engine.apiKey || ""} 
                          onChange={(ev) => {
                            ev.stopPropagation();
                            updateApiKey(engine.id, ev.target.value);
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowApiKey(prev => ({ ...prev, [engine.id]: !prev[engine.id] }));
                          }}
                          className="px-2 py-1 text-xs border rounded hover:bg-slate-50"
                          title={showApiKey[engine.id] ? "Hide" : "Show"}
                        >
                          {showApiKey[engine.id] ? "👁️" : "👁️‍🗨️"}
                        </button>
                        {/* Fetch Balance Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            fetchBalance(engine);
                          }}
                          className="px-2 py-1 text-xs border rounded hover:bg-blue-50 text-blue-600 border-blue-300"
                          title="Check balance/validate key"
                        >
                          {apiBalances[engine.id]?.loading ? '⏳' : '💰'}
                        </button>
                      </div>
                      {/* Balance Display */}
                      {apiBalances[engine.id] && !apiBalances[engine.id].loading && (
                        <div className="mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            apiBalances[engine.id].error ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                          }`}>
                            {apiBalances[engine.id].balance}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Output Policy */}
                    <div className="w-full mt-2">
                      <label className="text-xs text-slate-600 block mb-1">Output</label>
                      <div className="flex items-center gap-2">
                        <select 
                          className="flex-1 text-xs border rounded px-2 py-1.5 bg-white" 
                          value={engine.outPolicy?.mode || "auto"} 
                          onChange={(ev) => {
                            ev.stopPropagation();
                            updateOutPolicy(engine.id, ev.target.value as any);
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <option value="auto">Auto (recommended)</option>
                          <option value="fixed">Fixed</option>
                        </select>
                        {engine.outPolicy?.mode === "fixed" && (
                          <>
                            <input 
                              type="number" 
                              min={256} 
                              step={128} 
                              value={engine.outPolicy?.fixedTokens || 2000} 
                              onChange={(ev) => {
                                ev.stopPropagation();
                                updateOutPolicy(engine.id, "fixed", Math.max(256, Number(ev.target.value)||2000));
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="w-20 text-xs border rounded px-2 py-1.5" 
                            />
                            <span className="text-xs text-slate-500">tokens</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* Pricing Override */}
                    <div className="w-full mt-2">
                      <div className="flex items-center gap-2 text-xs">
                        <div className="flex-1">
                          <label className="text-slate-600 block mb-1">Price in:</label>
                          <input 
                            className="w-full border rounded px-2 py-1.5" 
                            type="number" 
                            step="0.000001" 
                            value={(pr?.in ?? 0).toString()} 
                            onChange={(ev) => {
                              ev.stopPropagation();
                              overridePrice(engine.provider, engine.selectedVersion, "in", Number(ev.target.value));
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-slate-600 block mb-1">Price out:</label>
                          <input 
                            className="w-full border rounded px-2 py-1.5" 
                            type="number" 
                            step="0.000001" 
                            value={(pr?.out ?? 0).toString()} 
                            onChange={(ev) => {
                              ev.stopPropagation();
                              overridePrice(engine.provider, engine.selectedVersion, "out", Number(ev.target.value));
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {((BASE_PRICING as any)[engine.provider]?.[engine.selectedVersion]?.note || engine.selectedVersion)}
                      </p>
                    </div>
                    
                    <span className="text-xs text-slate-400 mt-2 block">
                      Context {engine.contextLimit.toLocaleString()} • {engine.tokenizer}
                    </span>
                    
                    {/* Min/Max Spend Summary - Always Visible */}
                    <div className="w-full mt-2 pt-2 border-t border-slate-200">
                      <div className="text-xs text-slate-700">
                        <span className="font-medium">Min spend</span> <span className="font-bold text-green-600">${minSpend.toFixed(2)}</span> • 
                        <span className="font-medium ml-2">Max</span> <span className="font-bold text-orange-600">${maxSpend.toFixed(2)}</span> • 
                        <span className="font-medium ml-2">ETA</span> <span className="font-bold">{timeLabel(nowIn, outCap)}</span> • 
                        <span className="font-medium ml-2">Outcome:</span> <span className="font-bold">{outcomeLabel(outCap)}</span>
                      </div>
                      {warn && liveMode ? <div className="text-amber-700 text-[11px] mt-1">⚠️ {warn}</div> : null}
                    </div>
                    
                    {/* Token and Cost Info - Only show when Technical toggle is ON */}
                    {showTech && (
                      <div className="w-full mt-3 pt-2 border-t border-slate-200">
                        <div className="text-xs text-slate-600 space-y-1">
                          <div className="flex justify-between">
                            <span>Input tokens:</span>
                            <span className="font-medium text-slate-900">{nowIn.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Output cap:</span>
                            <span className="font-medium text-slate-900">{outCap.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center pt-1">
                            <span className="font-medium text-purple-700">Min cost:</span>
                            <span className="font-semibold text-green-600">${minSpend.toFixed(4)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-purple-700">Max cost:</span>
                            <span className="font-semibold text-orange-600">${maxSpend.toFixed(4)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Summary Section - Horizontal Layout */}
          <div className={`${panel} p-4 sm:p-6 border-t-4 border-blue-600`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              {/* Summary Info - Horizontal */}
              <div className="flex items-center gap-6 text-sm flex-wrap">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold tracking-wide text-blue-600 uppercase">Summary:</p>
                  <p className="font-medium text-slate-900">
                    {Object.keys(selected).filter(k => selected[k]).length} of {engines.length} engines selected
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-medium text-slate-700">Selected:</span>
                  <span>
                    {engines.filter(e => selected[e.id]).map(e => `${e.name} (${e.selectedVersion})`).join(', ') || 'None'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 ml-auto">
                <button
                  onClick={() => setStoryStep(3)}
                  className="px-4 py-2 rounded-full border-2 border-slate-300 text-sm text-slate-700 bg-white hover:border-slate-400"
                >
                  Back
                </button>
                <button
                  onClick={() => {
                    setStoryStep(5);
                    runAll();
                  }}
                  disabled={Object.keys(selected).filter(k => selected[k]).length === 0}
                  className={`px-6 py-2 rounded-full text-sm font-medium shadow-sm transition ${
                    Object.keys(selected).filter(k => selected[k]).length > 0
                      ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  Run Engines
                </button>
              </div>
            </div>

            {/* 🧪 MOCK ERROR TESTING PANEL - Story Mode (DISABLED)
            <div className="mt-4 p-3 bg-amber-50 border border-amber-300 rounded-lg">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🧪</span>
                  <span className="text-sm font-semibold text-amber-800">Mock Error Testing</span>
                  {mockErrorMode && (
                    <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full animate-pulse">
                      ACTIVE: {mockErrorMode}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={mockErrorMode || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setMockErrorMode(val === '' ? false : val as '429' | '500' | '503' | 'random');
                      setMockErrorCounts({});
                    }}
                    className="text-sm border border-amber-400 rounded px-2 py-1 bg-white"
                  >
                    <option value="">Off (Normal)</option>
                    <option value="429">🔄 429 Rate Limit</option>
                    <option value="500">💥 500 Server Error</option>
                    <option value="503">⏳ 503 Overloaded</option>
                    <option value="random">🎲 Random Errors</option>
                  </select>
                </div>
              </div>
              {mockErrorMode && (
                <div className="mt-2 text-xs text-amber-700">
                  <p>⚠️ Mock errors will be thrown for all engines. They will succeed after {MOCK_FAIL_AFTER_RETRIES} retries.</p>
                  <p className="mt-1">Retry attempts per engine: {Object.entries(mockErrorCounts).map(([id, count]) => `${id}: ${count}`).join(', ') || 'None yet'}</p>
                </div>
              )}
            </div>
            */}
          </div>
        </div>
      )}

      {/* Story Mode Step 5: Results & Merging - Modern Horizontal Tabs */}
      {storyMode && storyStep === 5 && (
        <div className={`${panel} p-4 sm:p-6 border-t-4 border-purple-600`}>
          {/* Header */}
          <div className="space-y-3 mb-6">
            <p className="text-xs font-semibold tracking-wide text-purple-600 uppercase">Step 5 · Results</p>
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
                Compare engines and select the best pieces
              </h2>
              
              {/* Quick Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveEngineTab('combined')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    activeEngineTab === 'combined'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span className="hidden sm:inline">Collective Response</span>
                </button>
                
                <button
                  onClick={() => setActiveEngineTab('selected')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    activeEngineTab === 'selected'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span className="hidden sm:inline">Your Preferred Selection</span>
                  {selectedComponents.length > 0 && (
                    <span className="px-2 py-0.5 bg-white text-purple-600 text-xs rounded-full font-semibold">
                      {selectedComponents.length}
                    </span>
                  )}
                </button>
                
                <button
                  onClick={() => {
                    setComingSoonClicked(true);
                    setTimeout(() => setComingSoonClicked(false), 3000);
                  }} 
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                    comingSoonClicked
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span className="hidden sm:inline">OneMind AI Best Response</span>
                  {comingSoonClicked && (
                    <HyperText 
                      text="Coming Soon" 
                      className="text-xs text-white"
                      duration={600}
                      animateOnLoad={true}
                    />
                  )}
                </button>
                
              </div>
            </div>
            <p className="text-sm text-slate-600">
              Review outputs from each engine. Switch between tabs to compare responses.
            </p>
          </div>

          {/* Horizontal Tab Navigation */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 border-b-2 border-slate-200">
            {engines.filter(e => selected[e.id]).map((engine) => {
              const state = streamingStates[engine.id];
              const streaming = state?.isStreaming || false;
              const isActive = activeEngineTab === engine.id;
              const brandColor = providerStyles[engine.provider] || 'bg-slate-700';
              
              return (
                <button
                  key={engine.id}
                  onClick={() => setActiveEngineTab(engine.id)}
                  className={`relative flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-white text-purple-700 shadow-md border-2 border-b-0 border-purple-300 -mb-[2px]'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-2 border-transparent'
                  }`}
                >
                  {/* Brand color indicator */}
                  <div className={`w-2 h-2 rounded-full ${brandColor}`}></div>
                  
                  <span>{engine.name}</span>
                  
                  {streaming && (
                    <span className="flex items-center gap-1 text-xs text-blue-600">
                      <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse"></span>
                      Streaming
                    </span>
                  )}
                  
                  {/* Active indicator */}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-t"></div>
                  )}
                </button>
              );
            })}
            
          </div>

          {/* Tab Content */}
          <div className="bg-white border-2 border-slate-200 rounded-xl p-6 min-h-[400px] max-h-[600px] overflow-auto">
            {/* Engine Response Content */}
            {engines.filter(e => selected[e.id]).map((engine) => {
              if (activeEngineTab !== engine.id) return null;
              
              const state = streamingStates[engine.id];
              const result = results.find(r => r.engineId === engine.id);
              const content = state?.content || "";
              const streaming = state?.isStreaming || false;
              const hasError = result && !result.success && result.error;
              const brandColor = providerStyles[engine.provider] || 'bg-slate-700';

              return (
                <div key={engine.id} className="space-y-4">
                  {/* Engine Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-lg text-white text-xs font-semibold ${brandColor}`}>
                        {engine.name}
                      </span>
                      <div>
                        <h3 className="font-semibold text-slate-900">{engine.selectedVersion}</h3>
                        <p className="text-xs text-slate-500">Context: {(engine.contextLimit / 1000).toFixed(0)}k tokens</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {streaming && (
                        <span className="flex items-center gap-2 text-sm text-blue-600 font-medium">
                          <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                          </span>
                          Streaming...
                        </span>
                      )}
                      {content && !streaming && (
                        <ExportDropdown
                          data={{
                            title: `${engine.name} Response`,
                            provider: engine.provider,
                            model: engine.selectedVersion,
                            prompt: prompt,
                            response: content,
                            timestamp: new Date(),
                            tokensUsed: result?.tokensOut,
                            cost: result?.costUSD,
                          }}
                        />
                      )}
                    </div>
                  </div>

                  {/* Response Content */}
                  <div>
                    {hasError ? (
                      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                        {/* Business-Friendly Error Explanation - No redundant header */}
                        {(() => {
                          const errorStr = result.error || '';
                          const provider = engine.provider?.toLowerCase() || '';
                          
                          // Create error info with what happened, fact about it, and actions
                          const getErrorInfo = () => {
                            // Authentication errors (401) - also check for emoji patterns from cleanErrorMessage
                            if (errorStr.includes('401') || errorStr.includes('Unauthorized') || errorStr.includes('Authentication') || 
                                errorStr.includes('🔑') || errorStr.includes('Invalid') && errorStr.includes('API key') ||
                                errorStr.includes('invalid') && errorStr.includes('api') || errorStr.includes('API key')) {
                              return {
                                what: `Your ${engine.name} API key is invalid or expired`,
                                fact: 'API keys are like passwords that verify your identity with the AI service. Without a valid key, the service cannot process your requests.',
                                actions: [
                                  'Go to Settings and check your API key is correct',
                                  `Get a new key from ${provider === 'openai' ? 'platform.openai.com' : provider === 'anthropic' ? 'console.anthropic.com' : provider === 'deepseek' ? 'platform.deepseek.com' : provider === 'gemini' ? 'aistudio.google.com' : provider === 'groq' ? 'console.groq.com' : provider === 'xai' ? 'console.x.ai' : 'the provider dashboard'}`
                                ]
                              };
                            }
                            
                            // Rate limit errors (429) - also check for emoji patterns
                            if (errorStr.includes('429') || errorStr.includes('rate limit') || errorStr.includes('Too Many Requests') || 
                                errorStr.includes('quota') || errorStr.includes('⏱️') || errorStr.includes('Rate limit')) {
                              return {
                                what: `You've hit a rate limit with ${engine.name}`,
                                fact: 'Rate limits prevent abuse and ensure fair usage. They restrict how many requests you can make in a time period. The system will automatically retry.',
                                actions: [
                                  'Wait a moment - the system will retry automatically',
                                  'Consider upgrading your API plan for higher limits'
                                ]
                              };
                            }
                            
                            // Server errors (500, 502, 503) - also check for emoji patterns
                            if (errorStr.includes('500') || errorStr.includes('502') || errorStr.includes('503') || 
                                errorStr.includes('Server') || errorStr.includes('overloaded') || errorStr.includes('⚠️') ||
                                errorStr.includes('server error') || errorStr.includes('⏳')) {
                              return {
                                what: `${engine.name} is experiencing server issues`,
                                fact: 'Server errors are temporary issues on the provider\'s side. They usually resolve within minutes as the service auto-recovers.',
                                actions: [
                                  'Wait a moment and try again',
                                  'Check the provider\'s status page for outages'
                                ]
                              };
                            }
                            
                            // Permission errors (403) - also check for emoji patterns
                            if (errorStr.includes('403') || errorStr.includes('Forbidden') || errorStr.includes('permission') ||
                                errorStr.includes('🚫') || errorStr.includes('Permission denied') || errorStr.includes('blocked')) {
                              return {
                                what: `Your API key lacks permission for ${engine.name}`,
                                fact: 'Some AI models require special access or upgraded plans. Your current API key may not have access to this specific model.',
                                actions: [
                                  'Check if you have access to this model in your account',
                                  'Contact the provider to request access if needed'
                                ]
                              };
                            }
                            
                            // Not found errors (404) - also check for emoji patterns
                            if (errorStr.includes('404') || errorStr.includes('Not Found') || errorStr.includes('❓') ||
                                errorStr.includes('not found') || errorStr.includes('Model not found')) {
                              return {
                                what: `The requested model or endpoint was not found`,
                                fact: 'This usually means the model name is incorrect or the model has been deprecated/renamed by the provider.',
                                actions: [
                                  'Check the model name is spelled correctly',
                                  'Verify the model is still available from the provider'
                                ]
                              };
                            }
                            
                            // Timeout errors
                            if (errorStr.includes('timeout') || errorStr.includes('Timeout') || errorStr.includes('timed out')) {
                              return {
                                what: `The request to ${engine.name} timed out`,
                                fact: 'Timeouts happen when the server takes too long to respond, often due to high demand or complex requests.',
                                actions: [
                                  'Try again with a shorter prompt',
                                  'Wait a moment and retry'
                                ]
                              };
                            }
                            
                            // Content/request too large (413)
                            if (errorStr.includes('413') || errorStr.includes('too large') || errorStr.includes('Too Large') || errorStr.includes('exceeds')) {
                              return {
                                what: `Your request is too large for ${engine.name}`,
                                fact: 'Each AI model has limits on how much text it can process at once. This is called the context window.',
                                actions: [
                                  'Reduce the length of your prompt',
                                  'Split your request into smaller parts'
                                ]
                              };
                            }
                            
                            // Bad request (400) - also check for emoji patterns
                            if (errorStr.includes('400') || errorStr.includes('Bad Request') || errorStr.includes('❌') ||
                                errorStr.includes('Invalid request') || errorStr.includes('invalid request')) {
                              return {
                                what: `${engine.name} couldn't process your request`,
                                fact: 'The request format may be incorrect or contain unsupported parameters.',
                                actions: [
                                  'Check your prompt for any special characters',
                                  'Try simplifying your request'
                                ]
                              };
                            }
                            
                            // Network errors
                            if (errorStr.includes('network') || errorStr.includes('Network') || errorStr.includes('connection') || errorStr.includes('ECONNREFUSED')) {
                              return {
                                what: `Network connection issue with ${engine.name}`,
                                fact: 'This could be a temporary network issue or the service may be temporarily unreachable.',
                                actions: [
                                  'Check your internet connection',
                                  'Try again in a few moments'
                                ]
                              };
                            }
                            
                            // If error string contains useful info, show it directly
                            if (errorStr.length > 10 && !errorStr.includes('Unknown error')) {
                              return {
                                what: errorStr.replace(/^[🔑❌⚠️⏱️🚫❓⏳]\s*/, '').replace(new RegExp(`^${engine.name}:\\s*`, 'i'), ''),
                                fact: 'The AI service returned an error while processing your request.',
                                actions: [
                                  'Review the error message above',
                                  'Try your request again or check your settings'
                                ]
                              };
                            }
                            
                            // Default fallback - should rarely be reached now
                            return {
                              what: `An error occurred with ${engine.name}`,
                              fact: 'Something unexpected happened while processing your request.',
                              actions: [
                                'Try your request again',
                                'Click "View details" for technical information'
                              ]
                            };
                          };
                          
                          const errorInfo = getErrorInfo();
                          
                          return (
                            <div className="p-4 space-y-3">
                              {/* What Happened */}
                              <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                                <div className="flex items-start gap-2">
                                  <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <div>
                                    <p className="text-blue-900 font-semibold text-sm">{errorInfo.what}</p>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Fact About the Error */}
                              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                <div className="flex items-start gap-2">
                                  <span className="text-sm">💡</span>
                                  <p className="text-gray-700 text-xs leading-relaxed">{errorInfo.fact}</p>
                                </div>
                              </div>
                              
                              {/* Actions Required */}
                              <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
                                <p className="text-orange-900 font-semibold text-xs mb-2 flex items-center gap-1">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                  </svg>
                                  Action Required:
                                </p>
                                <div className="space-y-1">
                                  {errorInfo.actions.map((action, idx) => (
                                    <div key={idx} className="flex items-start gap-2">
                                      <span className="w-4 h-4 rounded-full bg-orange-200 text-orange-800 text-xs flex items-center justify-center flex-shrink-0 font-semibold">{idx + 1}</span>
                                      <span className="text-gray-700 text-xs">{action}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              
                              {/* View Details Button */}
                              <button
                                onClick={() => {
                                  const errorMessage = String(result.error || 'Unknown error occurred');
                                  const enhancedError = {
                                    message: errorMessage,
                                    statusCode: undefined,
                                    status: undefined,
                                    code: undefined,
                                    provider: engine.provider,
                                    engine: engine.name,
                                    originalError: result.error
                                  };
                                  
                                  const errorId = `${engine.id}-${Date.now()}`;
                                  setErrorQueue(prev => [...prev, {
                                    id: errorId,
                                    error: enhancedError,
                                    engine: engine,
                                    prompt: prompt,
                                    outCap: 0
                                  }]);
                                }}
                                className="w-full text-center text-xs text-gray-500 hover:text-gray-700 py-2 border-t border-gray-100 mt-2"
                              >
                                View technical details →
                              </button>
                            </div>
                          );
                        })()}
                      </div>
                    ) : content ? (
                      <SelectableMarkdownRenderer 
                        content={content} 
                        engineName={engine.name}
                        onComponentSelect={(component) => {
                          setSelectedComponents(prev => [...prev, component]);
                        }}
                        onComponentDeselect={(id) => {
                          setSelectedComponents(prev => prev.filter(c => c.id !== id));
                        }}
                        selectedIds={selectedComponents.map(c => c.id)}
                        isStreaming={streaming}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="text-4xl mb-3">⏳</div>
                        <p className="text-slate-400 italic">Waiting for response...</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Combined View Content - All Responses in One Page */}
            {activeEngineTab === 'combined' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📄</span>
                    <div>
                      <h3 className="font-semibold text-slate-900">All Engine Responses</h3>
                      <p className="text-xs text-slate-500">View all responses in a single scrollable page</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-purple-600 bg-purple-100 px-3 py-1 rounded-full">
                      {engines.filter(e => selected[e.id]).length} Engines
                    </span>
                    {/* Copy All Button - with Word-style formatting */}
                    <button
                      onClick={async () => {
                        const { copyAllToClipboard } = await import('./lib/export-utils');
                        const selectedEnginesList = engines.filter(e => selected[e.id]);
                        const exportData = selectedEnginesList.map(e => {
                          const r = results.find(rr => rr.engineId === e.id);
                          const streamingState = streamingStates[e.id];
                          const content = streamingState?.content || r?.responsePreview || "(No response)";
                          return {
                            title: `${e.name} Response`,
                            provider: e.provider,
                            model: e.selectedVersion,
                            prompt: prompt,
                            response: content,
                            timestamp: new Date(),
                            tokensUsed: r?.tokensOut,
                            cost: (r as any)?.cost,
                          };
                        });
                        
                        try {
                          await copyAllToClipboard(exportData);
                          alert('✅ All responses copied with formatting!');
                        } catch (error) {
                          alert('❌ Copy failed. Please try again.');
                          console.error('Copy error:', error);
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all hover:opacity-90 flex items-center gap-1 shadow-md"
                      style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}
                      title="Copy all responses with Word-style formatting"
                    >
                      📋 Copy All
                    </button>
                    {/* Export All Buttons */}
                    <button
                      onClick={async () => {
                        const selectedEnginesList = engines.filter(e => selected[e.id]);
                        const exportData: ExportData[] = selectedEnginesList.map(e => {
                          const r = results.find(rr => rr.engineId === e.id);
                          const streamingState = streamingStates[e.id];
                          const content = streamingState?.content || r?.responsePreview || "(No response)";
                          
                          return {
                            title: `${e.name} Response`,
                            provider: e.provider,
                            model: e.selectedVersion,
                            prompt: prompt,
                            response: content,
                            timestamp: new Date(),
                            tokensUsed: r?.tokensOut,
                            cost: (r as any)?.cost
                          };
                        });
                        
                        try {
                          await exportAllToWord(exportData);
                          alert('✅ All responses exported to Word!');
                        } catch (error) {
                          alert('❌ Export failed. Please try again.');
                          console.error('Export error:', error);
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all hover:opacity-90 flex items-center gap-1"
                      style={{ backgroundColor: '#059669' }}
                      title="Export all responses to Word document"
                    >
                      📥 Word
                    </button>
                    <button
                      onClick={async () => {
                        const selectedEnginesList = engines.filter(e => selected[e.id]);
                        
                        // Capture chart images from the DOM
                        const captureChartImages = async (engineId: string): Promise<string[]> => {
                          const chartImages: string[] = [];
                          try {
                            // Find all canvas elements (charts) for this engine
                            const engineContainer = document.querySelector(`[data-engine-id="${engineId}"]`);
                            if (engineContainer) {
                              const canvases = engineContainer.querySelectorAll('canvas');
                              for (const canvas of canvases) {
                                try {
                                  const dataUrl = (canvas as HTMLCanvasElement).toDataURL('image/png');
                                  chartImages.push(dataUrl);
                                } catch (e) {
                                  console.error('Failed to capture chart:', e);
                                }
                              }
                            }
                          } catch (e) {
                            console.error('Error capturing charts:', e);
                          }
                          return chartImages;
                        };
                        
                        const exportData: ExportData[] = await Promise.all(
                          selectedEnginesList.map(async (e) => {
                            const r = results.find(rr => rr.engineId === e.id);
                            const streamingState = streamingStates[e.id];
                            const content = streamingState?.content || r?.responsePreview || "(No response)";
                            const chartImages = await captureChartImages(e.id);
                            
                            return {
                              title: `${e.name} Response`,
                              provider: e.provider,
                              model: e.selectedVersion,
                              prompt: prompt,
                              response: content,
                              timestamp: new Date(),
                              tokensUsed: r?.tokensOut,
                              cost: (r as any)?.cost,
                              chartImages
                            };
                          })
                        );
                        
                        try {
                          await exportAllToPDF(exportData);
                          alert('✅ All responses exported to PDF!');
                        } catch (error) {
                          alert('❌ PDF export failed. Please try again.');
                          console.error('PDF Export error:', error);
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all hover:opacity-90 flex items-center gap-1"
                      style={{ backgroundColor: '#dc2626' }}
                      title="Export all responses to PDF document"
                    >
                      📄 PDF
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  {engines.filter(e => selected[e.id]).map((engine, index) => {
                    const state = streamingStates[engine.id];
                    const content = state?.content || "";
                    const streaming = state?.isStreaming || false;
                    const brandColor = providerStyles[engine.provider] || 'bg-slate-700';
                    const totalResponses = engines.filter(e => selected[e.id]).length;
                    const responseNumber = index + 1;

                    return (
                      <div key={engine.id} data-engine-id={engine.id}>
                        {/* Engine Header */}
                        <div className="flex items-center gap-3 mb-3 pb-2 border-b-2 border-purple-200">
                          <span className={`px-3 py-1 rounded-lg text-white font-medium text-xs ${brandColor}`}>
                            {engine.name}
                          </span>
                          <span className="text-sm text-gray-600">({engine.selectedVersion})</span>
                          <span className="ml-auto text-sm font-semibold text-purple-600">
                            {responseNumber}/{totalResponses} Engine response
                          </span>
                          {streaming && (
                            <span className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                              <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse"></span>
                              Streaming
                            </span>
                          )}
                          {content && !streaming && (
                            <ExportDropdown
                              data={{
                                title: `${engine.name} Response`,
                                provider: engine.provider,
                                model: engine.selectedVersion,
                                prompt: prompt,
                                response: content,
                                timestamp: new Date(),
                                tokensUsed: results.find(r => r.engineId === engine.id)?.tokensOut,
                                cost: results.find(r => r.engineId === engine.id)?.costUSD,
                              }}
                              variant="compact"
                            />
                          )}
                        </div>

                        {/* Response Content */}
                        <div className="prose prose-sm max-w-none pl-4">
                          {content ? (
                            <EnhancedMarkdownRenderer content={content} isStreaming={streaming} />
                          ) : (
                            <div className="flex items-center gap-2 py-4 text-slate-400 italic">
                              <span className="text-2xl">⏳</span>
                              <span>Waiting for response...</span>
                            </div>
                          )}
                        </div>

                        {/* Divider between responses */}
                        {index < totalResponses - 1 && (
                          <hr className="my-6 border-t-2 border-dashed border-purple-200" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Summary Footer */}
                {engines.filter(e => selected[e.id]).every(e => streamingStates[e.id]?.content) && (
                  <div className="mt-6 p-4 bg-purple-50 border-2 border-purple-200 rounded-xl">
                    <div className="flex items-center gap-2 text-sm text-purple-800">
                      <span className="text-lg">✅</span>
                      <span className="font-medium">
                        All {engines.filter(e => selected[e.id]).length} engines have completed their responses.
                      </span>
                    </div>
                    <p className="text-xs text-purple-600 mt-1 ml-7">
                      Switch to the "Final Answer" tab to see the merged response.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Selected Components Content */}
            {activeEngineTab === 'selected' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">✅</span>
                    <div>
                      <h3 className="font-semibold text-slate-900">Selected Components</h3>
                      <p className="text-xs text-slate-500">Curated selections from engine responses</p>
                    </div>
                  </div>
                  {selectedComponents.length > 0 && (
                    <button
                      onClick={() => setSelectedComponents([])}
                      className="text-xs px-3 py-1 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {selectedComponents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="text-4xl mb-3">📋</div>
                    <p className="text-slate-400 italic mb-2">No components selected yet</p>
                    <p className="text-xs text-slate-500">
                      Click the checkbox next to any heading or paragraph in individual engine tabs to add them here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedComponents.map((component, index) => {
                      const engine = engines.find(e => e.name === component.engineName);
                      const brandColor = engine ? (providerStyles[engine.provider] || 'bg-slate-700') : 'bg-slate-700';
                      
                      return (
                        <div key={component.id} className="relative group">
                          {/* Component Header */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-white text-xs font-medium ${brandColor}`}>
                                {component.engineName}
                              </span>
                              <span className="text-xs text-slate-500">
                                {component.type === 'heading' && '📌 Heading + Content'}
                                {component.type === 'paragraph' && '📝 Paragraph'}
                                {component.type === 'list' && '📋 List'}
                                {component.type === 'code' && '💻 Code'}
                                {component.type === 'table' && '📊 Table'}
                                {component.type === 'chart' && '📈 Chart'}
                              </span>
                              <span className="text-xs text-slate-400">#{index + 1}</span>
                            </div>
                            <button
                              onClick={() => setSelectedComponents(prev => prev.filter(c => c.id !== component.id))}
                              className="opacity-0 group-hover:opacity-100 text-red-600 hover:text-red-700 text-sm transition"
                              title="Remove"
                            >
                              ✕
                            </button>
                          </div>

                          {/* Component Content */}
                          <div className="pl-4 border-l-4 border-green-400 bg-green-50/50 rounded-r-lg p-3">
                            {component.type === 'chart' ? (
                              // Render chart from stored configuration
                              (() => {
                                try {
                                  const chartData = JSON.parse(component.content);
                                  if (chartData.type === 'echarts' && chartData.config) {
                                    return (
                                      <div className="bg-white rounded-lg p-2">
                                        <TableChartRenderer chart={{ id: chartData.id, config: chartData.config, sourceTable: '' }} />
                                      </div>
                                    );
                                  }
                                } catch (e) {
                                  // Fallback to markdown if JSON parse fails
                                }
                                return (
                                  <div 
                                    className="prose prose-sm max-w-none"
                                    dangerouslySetInnerHTML={{ __html: marked.parse(component.content) as string }}
                                  />
                                );
                              })()
                            ) : (
                              <div 
                                className="prose prose-sm max-w-none"
                                dangerouslySetInnerHTML={{ __html: marked.parse(component.content) as string }}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Export Options */}
                    <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {selectedComponents.length} component{selectedComponents.length !== 1 ? 's' : ''} selected
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            These selections are ordered as you picked them
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={async () => {
                              const { copyAllToClipboard } = await import('./lib/export-utils');
                              const exportData = selectedComponents.map(c => {
                                const engine = engines.find(e => e.name === c.engineName);
                                return {
                                  title: `From ${c.engineName}`,
                                  provider: engine?.provider || 'Unknown',
                                  model: engine?.selectedVersion || c.engineName,
                                  prompt: prompt,
                                  response: c.content,
                                  timestamp: new Date(),
                                };
                              });
                              try {
                                await copyAllToClipboard(exportData);
                                alert('✅ Selected components copied with formatting!');
                              } catch (error) {
                                alert('❌ Copy failed. Please try again.');
                              }
                            }}
                            className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition"
                          >
                            📋 Copy All
                          </button>
                          <ExportDropdown
                            data={{
                              title: 'Selected Components',
                              provider: 'Multiple Engines',
                              model: selectedComponents.map(c => {
                                const engine = engines.find(e => e.name === c.engineName);
                                return engine ? `${engine.name} (${engine.selectedVersion})` : c.engineName;
                              }).filter((v, i, a) => a.indexOf(v) === i).join(', '),
                              prompt: prompt,
                              response: selectedComponents.map((c, i) => 
                                `## From ${c.engineName}${(() => {
                                  const engine = engines.find(e => e.name === c.engineName);
                                  return engine ? ` (${engine.selectedVersion})` : '';
                                })()}\n\n${c.content}`
                              ).join('\n\n---\n\n'),
                              timestamp: new Date(),
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Merged Response Content */}
            {activeEngineTab === 'merged' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">✨</span>
                    <div>
                      <h3 className="font-semibold text-slate-900">Combined AI Response</h3>
                      <p className="text-xs text-slate-500">Merged insights from all selected engines</p>
                    </div>
                  </div>
                </div>

                <div className="prose prose-sm max-w-none">
                  {showCombinedResponse && compiledDoc ? (
                    <EnhancedMarkdownRenderer content={compiledDoc} isStreaming={false} />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="text-4xl mb-3">🤖</div>
                      <p className="text-slate-400 italic mb-4">
                        Engines are generating responses. You can merge them once complete.
                      </p>
                      <button
                        onClick={() => setShowCombinedResponse(true)}
                        disabled={!compiledDoc}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                          compiledDoc
                            ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        Generate Merged Response
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Technical Analysis Tab Content */}
            {activeEngineTab === 'analysis' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📊</span>
                    <div>
                      <h3 className="font-semibold text-slate-900">Technical Analysis</h3>
                      <p className="text-xs text-slate-500">Estimate vs Actual comparison for all engines</p>
                    </div>
                  </div>
                </div>

                {engines.filter(e => selected[e.id]).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="text-4xl mb-3">📊</div>
                    <p className="text-slate-400 italic">No engines selected. Select engines to see analysis.</p>
                  </div>
                ) : results.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="text-4xl mb-3">⏳</div>
                    <p className="text-slate-400 italic">Waiting for engine responses...</p>
                    <p className="text-xs text-slate-300 mt-2">Analysis will appear once engines complete.</p>
                  </div>
                ) : (
                <div className="space-y-4">
                  {engines.filter(e => selected[e.id]).map(engine => {
                    const result = results.find(r => r.engineId === engine.id);
                    const preview = previews.find(p => p.e.id === engine.id);
                    const brandColor = providerStyles[engine.provider] || 'bg-slate-700';
                    
                    return (
                      <div key={engine.id} className="border rounded-xl p-4 bg-white shadow-sm">
                        <div className="flex items-center gap-3 mb-3 pb-2 border-b border-slate-200">
                          <span className={`px-3 py-1 rounded-lg text-white text-xs font-semibold ${brandColor}`}>
                            {engine.name}
                          </span>
                          <div>
                            <span className="font-semibold text-slate-900">{engine.selectedVersion}</span>
                            <span className="text-xs text-slate-500 ml-2">· {(engine.contextLimit / 1000).toFixed(0)}k context</span>
                          </div>
                          {result && (
                            <span className={`ml-auto px-2 py-1 rounded-full text-xs font-medium ${
                              result.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {result.success ? '✓ Success' : '✗ Failed'}
                            </span>
                          )}
                        </div>
                        
                        <div className="overflow-auto text-sm">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="text-left border-b bg-slate-50">
                                <th className="py-2 px-3 font-medium text-slate-600">Metric</th>
                                <th className="py-2 px-3 font-medium text-slate-600">Estimate</th>
                                <th className="py-2 px-3 font-medium text-slate-600">Actual</th>
                                <th className="py-2 px-3 font-medium text-slate-600">Variance</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="border-b">
                                <td className="py-2 px-3 text-slate-700">Input tokens</td>
                                <td className="py-2 px-3">{preview?.nowIn.toLocaleString() || '–'}</td>
                                <td className="py-2 px-3 font-medium">{result ? result.tokensIn.toLocaleString() : '–'}</td>
                                <td className="py-2 px-3">{result ? (result.tokensIn - (preview?.nowIn || 0)).toLocaleString() : '–'}</td>
                              </tr>
                              <tr className="border-b">
                                <td className="py-2 px-3 text-slate-700">Output tokens</td>
                                <td className="py-2 px-3">cap {preview?.outCap.toLocaleString() || '–'}</td>
                                <td className="py-2 px-3 font-medium">{result ? result.tokensOut.toLocaleString() : '–'}</td>
                                <td className="py-2 px-3">{result ? (result.tokensOut - (preview?.outCap || 0)).toLocaleString() : '–'}</td>
                              </tr>
                              <tr className="border-b">
                                <td className="py-2 px-3 text-slate-700">Cost (min → max)</td>
                                <td className="py-2 px-3">${(preview?.minSpend || 0).toFixed(4)} → ${(preview?.maxSpend || 0).toFixed(4)}</td>
                                <td className="py-2 px-3 font-medium text-green-700">{result ? `$${result.costUSD.toFixed(4)}` : '–'}</td>
                                <td className="py-2 px-3">{result ? `$${(result.costUSD - (preview?.maxSpend || 0)).toFixed(4)}` : '–'}</td>
                              </tr>
                              <tr className="border-b">
                                <td className="py-2 px-3 text-slate-700">Duration</td>
                                <td className="py-2 px-3">–</td>
                                <td className="py-2 px-3 font-medium">{result ? `${(result.durationMs / 1000).toFixed(2)}s` : '–'}</td>
                                <td className="py-2 px-3">–</td>
                              </tr>
                              <tr>
                                <td className="py-2 px-3 text-slate-700">Status</td>
                                <td className="py-2 px-3" colSpan={3}>
                                  <span className={result?.success ? 'text-green-600' : 'text-red-600'}>
                                    {result ? result.reason : 'Waiting for response...'}
                                  </span>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                          {result?.warnings?.length ? (
                            <div className="mt-3 p-2 bg-amber-50 rounded-lg text-amber-700 text-xs">
                              ⚠️ Warnings: {result.warnings.join("; ")}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}

                  {/* Summary Stats */}
                  <div className="mt-4 p-4 bg-slate-50 rounded-xl border">
                    <h4 className="font-semibold text-slate-900 mb-3">📈 Summary</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                      <div className="bg-white p-3 rounded-lg border">
                        <div className="text-slate-500 text-xs">Total Input</div>
                        <div className="font-semibold text-lg">{results.reduce((sum, r) => sum + r.tokensIn, 0).toLocaleString()}</div>
                        <div className="text-xs text-slate-400">tokens</div>
                      </div>
                      <div className="bg-white p-3 rounded-lg border">
                        <div className="text-slate-500 text-xs">Total Output</div>
                        <div className="font-semibold text-lg">{results.reduce((sum, r) => sum + r.tokensOut, 0).toLocaleString()}</div>
                        <div className="text-xs text-slate-400">tokens</div>
                      </div>
                      <div className="bg-white p-3 rounded-lg border">
                        <div className="text-slate-500 text-xs">Total Cost</div>
                        <div className="font-semibold text-lg text-green-600">${results.reduce((sum, r) => sum + r.costUSD, 0).toFixed(4)}</div>
                        <div className="text-xs text-slate-400">USD</div>
                      </div>
                      <div className="bg-white p-3 rounded-lg border">
                        <div className="text-slate-500 text-xs">Avg Duration</div>
                        <div className="font-semibold text-lg">{(results.reduce((sum, r) => sum + r.durationMs, 0) / results.length / 1000).toFixed(2)}s</div>
                        <div className="text-xs text-slate-400">per engine</div>
                      </div>
                    </div>
                  </div>
                </div>
                )}
              </div>
            )}
          </div>


          {/* Technical Analysis Section - Collapsible */}
          {results.length > 0 && engines.filter(e => selected[e.id]).length > 0 && (
            <div className="mt-6 bg-white rounded-xl border-2 border-slate-400 p-4">
              <details>
                <summary className="cursor-pointer font-semibold text-slate-900 flex items-center justify-between">
                  <span>📊 Technical Analysis</span>
                  <span className="text-xs text-slate-500 font-normal">
                    {engines.filter(e => selected[e.id]).length} engine{engines.filter(e => selected[e.id]).length > 1 ? 's' : ''} selected
                  </span>
                </summary>
                
                <div className="mt-4 space-y-4">
                  {/* Per-Engine Analysis Cards */}
                  {engines.filter(e => selected[e.id]).map(engine => {
                    const result = results.find(r => r.engineId === engine.id);
                    const preview = previews.find(p => p.e.id === engine.id);
                    const brandColor = providerStyles[engine.provider] || 'bg-slate-700';
                    
                    return (
                      <div key={engine.id} className="border rounded-xl p-3 sm:p-4 bg-slate-50">
                        {/* Engine Header */}
                        <div className="flex items-center gap-2 sm:gap-3 mb-3 pb-2 border-b border-slate-200">
                          <span className={`px-2 sm:px-3 py-1 rounded-lg text-white text-xs font-semibold ${brandColor}`}>
                            {engine.name}
                          </span>
                          <span className="font-medium text-slate-900 text-sm">{engine.selectedVersion}</span>
                          {result && (
                            <span className={`ml-auto px-2 py-1 rounded-full text-xs font-medium ${
                              result.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {result.success ? '✓' : '✗'}
                            </span>
                          )}
                        </div>
                        
                        {/* Mobile: Compact View */}
                        <div className="sm:hidden space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-600">Input tokens:</span>
                            <span className="font-medium">{result ? result.tokensIn.toLocaleString() : '–'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">Output tokens:</span>
                            <span className="font-medium">{result ? result.tokensOut.toLocaleString() : '–'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">Cost:</span>
                            <span className="font-medium text-green-700">{result ? `$${result.costUSD.toFixed(4)}` : '–'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">Duration:</span>
                            <span className="font-medium">{result ? `${(result.durationMs / 1000).toFixed(2)}s` : '–'}</span>
                          </div>
                        </div>
                        
                        {/* Desktop: Full Table */}
                        <div className="hidden sm:block overflow-auto text-sm">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="text-left border-b bg-white">
                                <th className="py-2 px-3 font-medium text-slate-600 text-xs">Metric</th>
                                <th className="py-2 px-3 font-medium text-slate-600 text-xs">Estimate</th>
                                <th className="py-2 px-3 font-medium text-slate-600 text-xs">Actual</th>
                                <th className="py-2 px-3 font-medium text-slate-600 text-xs">Variance</th>
                              </tr>
                            </thead>
                            <tbody className="text-xs">
                              <tr className="border-b">
                                <td className="py-2 px-3 text-slate-700">Input tokens</td>
                                <td className="py-2 px-3">{preview?.nowIn.toLocaleString() || '–'}</td>
                                <td className="py-2 px-3 font-medium">{result ? result.tokensIn.toLocaleString() : '–'}</td>
                                <td className="py-2 px-3">{result ? (result.tokensIn - (preview?.nowIn || 0)).toLocaleString() : '–'}</td>
                              </tr>
                              <tr className="border-b">
                                <td className="py-2 px-3 text-slate-700">Output tokens</td>
                                <td className="py-2 px-3">cap {preview?.outCap.toLocaleString() || '–'}</td>
                                <td className="py-2 px-3 font-medium">{result ? result.tokensOut.toLocaleString() : '–'}</td>
                                <td className="py-2 px-3">{result ? (result.tokensOut - (preview?.outCap || 0)).toLocaleString() : '–'}</td>
                              </tr>
                              <tr className="border-b">
                                <td className="py-2 px-3 text-slate-700">Cost (min → max)</td>
                                <td className="py-2 px-3">${(preview?.minSpend || 0).toFixed(4)} → ${(preview?.maxSpend || 0).toFixed(4)}</td>
                                <td className="py-2 px-3 font-medium text-green-700">{result ? `$${result.costUSD.toFixed(4)}` : '–'}</td>
                                <td className="py-2 px-3">{result ? `$${(result.costUSD - (preview?.maxSpend || 0)).toFixed(4)}` : '–'}</td>
                              </tr>
                              <tr>
                                <td className="py-2 px-3 text-slate-700">Duration</td>
                                <td className="py-2 px-3">–</td>
                                <td className="py-2 px-3 font-medium">{result ? `${(result.durationMs / 1000).toFixed(2)}s` : '–'}</td>
                                <td className="py-2 px-3">–</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                        
                        {/* Warnings only - Error is shown in the warning section below */}
                        {result?.warnings?.length ? (
                          <div className="mt-2 p-2 bg-amber-50 rounded-lg text-amber-700 text-xs">
                            ⚠️ {result.warnings.join("; ")}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                  
                  {/* Summary Stats */}
                  <div className="p-3 sm:p-4 bg-slate-100 rounded-xl border border-slate-200">
                    <h4 className="font-semibold text-slate-900 mb-3 text-sm">📈 Summary (Selected Engines)</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-xs sm:text-sm">
                      <div className="bg-white p-2 sm:p-3 rounded-lg border">
                        <div className="text-slate-500 text-xs">Total Input</div>
                        <div className="font-semibold text-base sm:text-lg">
                          {results.filter(r => selected[r.engineId]).reduce((sum, r) => sum + r.tokensIn, 0).toLocaleString()}
                        </div>
                        <div className="text-xs text-slate-400">tokens</div>
                      </div>
                      <div className="bg-white p-2 sm:p-3 rounded-lg border">
                        <div className="text-slate-500 text-xs">Total Output</div>
                        <div className="font-semibold text-base sm:text-lg">
                          {results.filter(r => selected[r.engineId]).reduce((sum, r) => sum + r.tokensOut, 0).toLocaleString()}
                        </div>
                        <div className="text-xs text-slate-400">tokens</div>
                      </div>
                      <div className="bg-white p-2 sm:p-3 rounded-lg border">
                        <div className="text-slate-500 text-xs">Total Cost</div>
                        <div className="font-semibold text-base sm:text-lg text-green-600">
                          ${results.filter(r => selected[r.engineId]).reduce((sum, r) => sum + r.costUSD, 0).toFixed(4)}
                        </div>
                        <div className="text-xs text-slate-400">USD</div>
                      </div>
                      <div className="bg-white p-2 sm:p-3 rounded-lg border">
                        <div className="text-slate-500 text-xs">Success Rate</div>
                        <div className="font-semibold text-base sm:text-lg">
                          {results.filter(r => selected[r.engineId]).length > 0 
                            ? Math.round((results.filter(r => selected[r.engineId] && r.success).length / results.filter(r => selected[r.engineId]).length) * 100)
                            : 0}%
                        </div>
                        <div className="text-xs text-slate-400">
                          {results.filter(r => selected[r.engineId] && r.success).length}/{results.filter(r => selected[r.engineId]).length} engines
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </details>
            </div>
          )}

          {/* Run Summary Section */}
          {results.length > 0 && (
            <div className="mt-6 bg-white rounded-xl border-2 border-emerald-600 p-4">
              <details>
                <summary className="cursor-pointer font-semibold text-slate-900 flex items-center justify-between">
                  <span>📈 Run Summary (Actuals)</span>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const combined = results.map(r => `# ${r.engineName} · ${r.version}\n\n${r.responsePreview || "(no text)"}`).join("\n\n---\n\n");
                      setCompiledDoc(combined);
                    }}
                    className="px-3 py-1.5 rounded-lg border text-xs bg-white hover:bg-slate-50 transition"
                  >
                    Compile all responses
                  </button>
                </summary>

              <div className="mt-3">
              {/* Compiled doc viewer */}
              {compiledDoc && (
                <details className="mb-3 rounded-lg border border-slate-200 p-3">
                  <summary className="cursor-pointer text-sm font-medium">Preview compiled document</summary>
                  <div className="mt-2">
                    <textarea readOnly value={compiledDoc} className="w-full h-40 p-2 border rounded text-xs" />
                    <div className="mt-2 flex gap-2">
                      <button 
                        onClick={() => navigator.clipboard?.writeText(compiledDoc)} 
                        className="px-3 py-1.5 rounded bg-slate-800 text-white text-xs"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </details>
              )}

              {/* Mobile Cards */}
              <div className="sm:hidden space-y-3">
                {results.map(r => (
                  <div key={r.engineId} className="rounded-xl border p-3">
                    <div className="font-medium text-sm">{r.engineName} · {r.version}</div>
                    <div className="text-xs mt-1">
                      In: {r.tokensIn.toLocaleString()} • Out: {r.tokensOut.toLocaleString()} • ${r.costUSD.toFixed(4)} • {(r.durationMs/1000).toFixed(1)}s
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                      {r.success ? '✓ Success' : `✗ ${r.error || 'Failed'}`}
                    </div>
                    {r.warnings?.length ? (
                      <div className="text-xs text-amber-700 mt-1">{r.warnings.join('; ')}</div>
                    ) : null}
                  </div>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden sm:block overflow-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2 pr-3">Engine</th>
                      <th className="py-2 pr-3">Version</th>
                      <th className="py-2 pr-3 text-right">In (tok)</th>
                      <th className="py-2 pr-3 text-right">Out (tok)</th>
                      <th className="py-2 pr-3 text-right">Cost ($)</th>
                      <th className="py-2 pr-3">Time</th>
                      <th className="py-2 pr-3">Attempts</th>
                      <th className="py-2 pr-3">Reason</th>
                      <th className="py-2 pr-3">Success?</th>
                      <th className="py-2 pr-3">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map(r => (
                      <tr key={r.engineId} className="border-b align-top">
                        <td className="py-2 pr-3">{r.engineName}</td>
                        <td className="py-2 pr-3">{r.version}</td>
                        <td className="py-2 pr-3 text-right">{r.tokensIn.toLocaleString()}</td>
                        <td className="py-2 pr-3 text-right">{r.tokensOut.toLocaleString()}</td>
                        <td className="py-2 pr-3 text-right">{r.costUSD.toFixed(4)}</td>
                        <td className="py-2 pr-3">{(r.durationMs/1000).toFixed(1)}s</td>
                        <td className="py-2 pr-3">{r.attempts}</td>
                        <td className="py-2 pr-3 max-w-[220px]">{r.reason}</td>
                        <td className="py-2 pr-3">{r.success ? "✓" : "✗"}</td>
                        <td className="py-2 pr-3">{r.error || ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Cost Comparison */}
              <div className="mt-4 pt-4 border-t">
                <div className="text-sm font-medium mb-2">💰 Cost Analysis</div>
                <div className="flex flex-wrap items-center gap-4 text-xs">
                  <div>
                    <span className="text-slate-600">Total Estimated:</span>
                    <span className="ml-2 font-semibold">${totals.max.toFixed(4)}</span>
                  </div>
                  <div>
                    <span className="text-slate-600">Actual Cost Incurred:</span>
                    <span className="ml-2 font-semibold text-emerald-600">
                      ${results.reduce((sum, r) => sum + r.costUSD, 0).toFixed(4)}
                    </span>
                  </div>
                  <div>
                    {results.reduce((sum, r) => sum + r.costUSD, 0) < totals.max ? (
                      <span className="text-green-600 text-xs">✓ Under estimate</span>
                    ) : results.reduce((sum, r) => sum + r.costUSD, 0) > totals.max ? (
                      <span className="text-red-600 text-xs">⚠ Over estimate</span>
                    ) : (
                      <span className="text-blue-600 text-xs">= Exact match</span>
                    )}
                  </div>
                </div>
              </div>
              </div>
              </details>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-6 flex justify-between gap-2">
            <button
              onClick={() => setStoryStep(4)}
              className="px-4 py-2 rounded-full border-2 border-slate-300 text-sm text-slate-700 bg-white hover:border-slate-400 transition"
            >
              ← Back
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setStoryMode(false);
                  setStoryStep(1);
                }}
                className="px-4 py-2 rounded-full border-2 border-slate-300 text-sm text-slate-700 bg-white hover:border-slate-400 transition"
              >
                Exit Story Mode
              </button>
              <button
                onClick={() => {
                  setStoryStep(1);
                  setSelectedRole("");
                  setPrompt("");
                  setResults([]);
                  setStreamingStates({});
                  setActiveEngineTab("");
                }}
                className="px-6 py-2 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-medium shadow-sm hover:from-purple-700 hover:to-blue-700 transition"
              >
                Start Over
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Classic Mode - Original UI (only show when story mode is off) */}
      {!storyMode && (
        <>
      {/* Who am I? Section */}
      <div className={`${panel} p-3 sm:p-4 border-t-4 border-purple-600`}>
        <div className="font-semibold mb-3 text-purple-700">Let us help you find answer to your needs, choose your role.</div>
        
        {/* Buttons in one line */}
        <div className="flex flex-wrap gap-2 mb-3">
          <button
            onClick={() => {
              setShowExecutiveRoles(!showExecutiveRoles);
              setShowOtherRoles(false);
            }}
            className="flex items-center justify-between px-4 py-2 bg-purple-100 hover:bg-purple-200 rounded-full transition-colors border border-purple-300"
          >
            <span className="font-medium text-purple-900 text-sm">Executive roles</span>
            <span className="text-purple-700 ml-3">{showExecutiveRoles ? '▲' : '▼'}</span>
          </button>
          
          <button
            onClick={() => {
              setShowOtherRoles(!showOtherRoles);
              setShowExecutiveRoles(false);
            }}
            className="flex items-center justify-between px-4 py-2 bg-purple-100 hover:bg-purple-200 rounded-full transition-colors border border-purple-300"
          >
            <span className="font-medium text-purple-900 text-sm">Industry Specific Personas</span>
            <span className="text-purple-700 ml-3">{showOtherRoles ? '▲' : '▼'}</span>
          </button>
          
          <button
            onClick={() => {
              setPrompt("");
              setShowExecutiveRoles(false);
              setShowOtherRoles(false);
              setSelectedRole("");
              setSelectedRoleDetails(null);
            }}
            className="flex items-center px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-full transition-colors border border-purple-400 shadow-md"
          >
            <span className="font-medium text-sm">Ask us anything</span>
            <span className="ml-2">💬</span>
          </button>
        </div>
        
        <div className="space-y-3">
          {/* Industry Specific Personas Dropdown */}
          {showOtherRoles && !selectedRoleDetails && (
            <div className="mt-2 p-2 bg-white border-2 border-purple-200 rounded-lg shadow-lg">
              {['IT Services'].map(role => (
                <button
                  key={role}
                  onClick={() => {
                    setSelectedRole(role);
                    setSelectedRoleDetails({name: role, category: 'Industry'});
                  }}
                  className={`w-full text-left px-3 py-2 rounded hover:bg-purple-50 transition-colors ${selectedRole === role ? 'bg-purple-100 font-semibold text-purple-900' : 'text-gray-700'}`}
                >
                  {role}
                </button>
              ))}
            </div>
          )}

          {/* Executive Roles */}
          <div className="relative">
            
            {showExecutiveRoles && !selectedRoleDetails && (
              <div className="mt-2 p-2 bg-white border-2 border-purple-200 rounded-lg shadow-lg">
                {['CEO', 'CDIO', 'Head of Sales'].map(role => (
                  <button
                    key={role}
                    onClick={() => {
                      setSelectedRole(role);
                      setSelectedRoleDetails({name: role, category: 'Executive'});
                    }}
                    className={`w-full text-left px-3 py-2 rounded hover:bg-purple-50 transition-colors ${selectedRole === role ? 'bg-purple-100 font-semibold text-purple-900' : 'text-gray-700'}`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            )}
            
            {/* Role Details Display - Under Executive Roles Button */}
            {selectedRoleDetails && selectedRoleDetails.category === 'Executive' && (
          <div className="mt-4 p-4 bg-white border-2 border-purple-200 rounded-xl shadow-lg">
            <div className="flex gap-4">
              {/* Left Side - Silhouette and Definition */}
              <div className="flex-1">
                {/* Silhouette Image */}
                <div className="mb-4 flex justify-center">
                  <div className="w-32 h-32 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                    <svg className="w-20 h-20 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                  </div>
                </div>
                
                {/* Role Name */}
                <h3 className="text-xl font-bold text-purple-900 text-center mb-2">{selectedRoleDetails.name}</h3>
                
                {/* Role Definition - CEO */}
                {selectedRoleDetails.name === 'CEO' && (
                  <div className="text-sm text-gray-700 space-y-2">
                    <p className="font-semibold text-purple-800">Chief Executive Officer</p>
                    <p>The CEO is the highest-ranking executive in a company, responsible for making major corporate decisions, managing overall operations and resources, and acting as the main point of communication between the board of directors and corporate operations.</p>
                    <p className="text-xs text-gray-600 mt-2">Key responsibilities include strategic planning, stakeholder management, and organizational leadership.</p>
                  </div>
                )}
                
                {/* Role Definition - CDIO */}
                {selectedRoleDetails.name === 'CDIO' && (
                  <div className="text-sm text-gray-700 space-y-2">
                    <p className="font-semibold text-purple-800">Chief Digital & Information Officer</p>
                    <p>The CDIO oversees the organization's data strategy, information systems, and digital transformation initiatives. Responsible for data governance, analytics, cybersecurity, and leveraging data as a strategic asset to drive business value.</p>
                    <p className="text-xs text-gray-600 mt-2">Key responsibilities include data architecture, AI/ML implementation, information security, and digital innovation.</p>
                  </div>
                )}
              </div>
              
              {/* Vertical Divider */}
              <div className="w-px bg-purple-200"></div>
              
              {/* Right Side - Role Specific Prompts */}
              <div className="flex-1">
                <div className="mb-3">
                  <p className="text-xs text-gray-600 mb-2">{selectedRoleDetails.name}-Specific Prompts:</p>
                  <div className="space-y-2">
                    {selectedRoleDetails.name === 'CEO' && [
                      { 
                        label: 'Growth Strategy', 
                        prompt: `As CEO, clean and analyze:
• Company_Performance_5yr.csv
• Market_Share_Asia.xlsx
• Competitor_News.pdf

1. Identify and fill missing values using logical inference or synthetic modeling (describe your method).
2. Flag all abnormalities, outliers, or inconsistent entries, and document repairs.
3. Generate a 3-scenario strategic expansion plan for Asia, using the corrected datasets.
4. Present outputs as:
   a. A comparative table of scenarios (inc. data adjustments)
   b. A summary text listing detected issues and modeling assumptions
   c. Charts showing predicted growth & market share across scenarios
   d. Hyperlinks or line references to key source data/evidence in the PDF` 
                      },
                      { label: 'Leadership Development', prompt: 'As a CEO, what are the best practices for building a strong leadership team and developing future leaders within my organization?' },
                      { label: 'Strategic Planning', prompt: 'As a CEO, guide me through creating a strategic plan that aligns with our company vision and addresses current market challenges.' },
                      { label: 'Innovation Culture', prompt: 'As a CEO, how can I foster an innovation culture and drive digital transformation across the organization?' },
                      { label: 'Operational Excellence', prompt: 'As a CEO, what frameworks should I use to optimize operations, improve efficiency, and ensure sustainable growth?' },
                      { label: 'Stakeholder Management', prompt: 'As a CEO, how do I effectively manage relationships with board members, investors, and key stakeholders?' },
                      { label: 'Crisis Management', prompt: 'As a CEO, what are the essential steps for handling a company crisis and maintaining stakeholder confidence?' },
                      { label: 'M&A Strategy', prompt: 'As a CEO, help me evaluate potential mergers and acquisitions that align with our strategic objectives.' }
                    ].map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setPrompt(item.prompt);
                          setSelectedRoleDetails(null);
                          setSelectedRole("");
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors bg-purple-100 text-purple-700 hover:bg-purple-200 hover:shadow-md"
                      >
                        {item.label}
                      </button>
                    ))}
                    
                    {selectedRoleDetails.name === 'CDIO' && [
                      { 
                        label: 'Data Architecture', 
                        prompt: `As CDIO, design a comprehensive data architecture strategy:
• Assess current data infrastructure and identify gaps
• Recommend modern data stack (cloud, on-premise, hybrid)
• Define data lake/warehouse architecture
• Establish data governance framework
• Create data quality and lineage tracking system
• Propose migration roadmap with timelines and costs` 
                      },
                      { 
                        label: 'AI/ML Implementation', 
                        prompt: `As CDIO, develop an AI/ML implementation roadmap:
• Identify high-value use cases for AI/ML across the organization
• Assess data readiness and quality for ML models
• Recommend ML platforms and tools
• Define model governance and monitoring framework
• Create ethical AI guidelines
• Estimate ROI and success metrics for each use case` 
                      },
                      { 
                        label: 'Cybersecurity Strategy', 
                        prompt: `As CDIO, create a comprehensive cybersecurity strategy:
• Conduct risk assessment of current security posture
• Identify vulnerabilities and threat vectors
• Recommend security tools and technologies
• Define incident response and disaster recovery plans
• Establish security awareness training program
• Ensure compliance with regulations (GDPR, CCPA, etc.)` 
                      },
                      { 
                        label: 'Digital Transformation', 
                        prompt: `As CDIO, lead digital transformation initiatives:
• Assess digital maturity across departments
• Identify automation opportunities
• Recommend digital tools and platforms
• Define change management strategy
• Create digital skills development program
• Measure transformation success metrics` 
                      },
                      { 
                        label: 'Data Analytics', 
                        prompt: `As CDIO, build enterprise analytics capabilities:
• Design self-service analytics platform
• Create data visualization standards
• Establish KPI framework and dashboards
• Implement predictive analytics models
• Define data democratization strategy
• Train business users on analytics tools` 
                      },
                      { 
                        label: 'Cloud Migration', 
                        prompt: `As CDIO, plan cloud migration strategy:
• Assess applications for cloud readiness
• Recommend cloud provider(s) and services
• Define migration approach (lift-and-shift, refactor, rebuild)
• Create cost optimization strategy
• Establish cloud governance policies
• Plan phased migration with minimal disruption` 
                      },
                      { 
                        label: 'Data Monetization', 
                        prompt: `As CDIO, develop data monetization strategy:
• Identify valuable data assets
• Explore data product opportunities
• Assess market demand for data services
• Define pricing and packaging models
• Ensure privacy and compliance
• Create go-to-market strategy for data products` 
                      },
                      { 
                        label: 'IT Modernization', 
                        prompt: `As CDIO, modernize IT infrastructure:
• Audit legacy systems and technical debt
• Prioritize systems for modernization
• Recommend modern architecture patterns (microservices, APIs)
• Define DevOps and CI/CD practices
• Create infrastructure as code strategy
• Estimate costs and timelines for modernization` 
                      }
                    ].map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setPrompt(item.prompt);
                          setSelectedRoleDetails(null);
                          setSelectedRole("");
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors bg-purple-100 text-purple-700 hover:bg-purple-200 hover:shadow-md"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Close Button */}
            <button
              onClick={() => {
                setSelectedRole("");
                setSelectedRoleDetails(null);
              }}
              className="mt-4 w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
            >
              Close
            </button>
          </div>
            )}
          </div>

          {/* Other Roles */}
          <div className="relative">
            {showOtherRoles && !selectedRoleDetails && (
              <div className="mt-2 p-2 bg-white border-2 border-purple-200 rounded-lg shadow-lg">
                {['Lawyers', 'HR', 'Student', 'AI Engineer'].map(role => (
                  <button
                    key={role}
                    onClick={() => {
                      setSelectedRole(role);
                      setSelectedRoleDetails({name: role, category: 'Other'});
                    }}
                    className={`w-full text-left px-3 py-2 rounded hover:bg-purple-50 transition-colors ${selectedRole === role ? 'bg-purple-100 font-semibold text-purple-900' : 'text-gray-700'}`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            )}
            
            {/* Role Details Display - Under Other Roles Button */}
            {selectedRoleDetails && selectedRoleDetails.category === 'Other' && (
              <div className="mt-4 p-4 bg-white border-2 border-purple-200 rounded-xl shadow-lg">
                <div className="flex gap-4">
                  {/* Left Side - Silhouette and Definition */}
                  <div className="flex-1">
                    {/* Silhouette Image */}
                    <div className="mb-4 flex justify-center">
                      <div className="w-32 h-32 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                        <svg className="w-20 h-20 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                        </svg>
                      </div>
                    </div>
                    
                    {/* Role Name */}
                    <h3 className="text-xl font-bold text-purple-900 text-center mb-2">{selectedRoleDetails.name}</h3>
                    
                    {/* Role Definition - Lawyers */}
                    {selectedRoleDetails.name === 'Lawyers' && (
                      <div className="text-sm text-gray-700 space-y-2">
                        <p className="font-semibold text-purple-800">Legal Counsel / Corporate Lawyer</p>
                        <p>Legal professionals who provide expert advice on legal matters, ensure regulatory compliance, manage contracts, handle litigation, and protect the organization's legal interests across all business operations.</p>
                        <p className="text-xs text-gray-600 mt-2">Key responsibilities include contract review, compliance management, risk mitigation, and legal strategy.</p>
                      </div>
                    )}
                    
                    {/* Role Definition - HR */}
                    {selectedRoleDetails.name === 'HR' && (
                      <div className="text-sm text-gray-700 space-y-2">
                        <p className="font-semibold text-purple-800">Human Resources Manager</p>
                        <p>HR professionals who manage the employee lifecycle, from recruitment to retirement. They develop talent strategies, ensure compliance with labor laws, foster positive workplace culture, and align human capital with organizational goals.</p>
                        <p className="text-xs text-gray-600 mt-2">Key responsibilities include talent acquisition, employee relations, performance management, and organizational development.</p>
                      </div>
                    )}
                    
                    {/* Role Definition - Student */}
                    {selectedRoleDetails.name === 'Student' && (
                      <div className="text-sm text-gray-700 space-y-2">
                        <p className="font-semibold text-purple-800">Student / Learner</p>
                        <p>Students pursuing academic goals, learning new skills, and preparing for their careers. They need support with research, assignments, exam preparation, career planning, and developing practical knowledge across various subjects.</p>
                        <p className="text-xs text-gray-600 mt-2">Key focus areas include academic success, skill development, research assistance, and career preparation.</p>
                      </div>
                    )}
                    
                    {/* Role Definition - AI Engineer */}
                    {selectedRoleDetails.name === 'AI Engineer' && (
                      <div className="text-sm text-gray-700 space-y-2">
                        <p className="font-semibold text-purple-800">AI/ML Engineer</p>
                        <p>Technical professionals who design, develop, and deploy artificial intelligence and machine learning solutions. They build models, optimize algorithms, implement AI systems, and ensure scalable, production-ready AI applications.</p>
                        <p className="text-xs text-gray-600 mt-2">Key responsibilities include model development, algorithm optimization, MLOps, and AI system architecture.</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Vertical Divider */}
                  <div className="w-px bg-purple-200"></div>
                  
                  {/* Right Side - Role Specific Prompts */}
                  <div className="flex-1">
                    <div className="mb-3">
                      <p className="text-xs text-gray-600 mb-2">{selectedRoleDetails.name}-Specific Prompts:</p>
                      <div className="space-y-2">
                        {selectedRoleDetails.name === 'Lawyers' && [
                          { 
                            label: 'Contract Review', 
                            prompt: `As a Legal Counsel, review and analyze contracts:
• Identify key terms, obligations, and potential risks
• Flag unfavorable clauses and liability concerns
• Recommend modifications and protective language
• Ensure compliance with applicable laws and regulations
• Assess indemnification and limitation of liability provisions
• Provide redline suggestions and negotiation points` 
                          },
                          { 
                            label: 'Compliance Assessment', 
                            prompt: `As a Legal Counsel, conduct compliance assessment:
• Review current compliance with regulations (GDPR, CCPA, SOX, etc.)
• Identify compliance gaps and vulnerabilities
• Recommend policies and procedures to ensure compliance
• Create compliance training programs for employees
• Establish monitoring and reporting mechanisms
• Develop incident response and remediation plans` 
                          },
                          { 
                            label: 'Risk Management', 
                            prompt: `As a Legal Counsel, develop legal risk management strategy:
• Identify and assess legal risks across business operations
• Evaluate potential litigation exposure
• Recommend risk mitigation strategies
• Create legal risk matrix and prioritization framework
• Establish early warning systems for legal issues
• Develop insurance and indemnification strategies` 
                          },
                          { 
                            label: 'IP Protection', 
                            prompt: `As a Legal Counsel, protect intellectual property:
• Audit existing IP portfolio (patents, trademarks, copyrights)
• Identify unprotected IP assets
• Recommend IP registration and protection strategies
• Draft IP assignment and licensing agreements
• Monitor for IP infringement
• Develop IP enforcement and defense strategies` 
                          },
                          { 
                            label: 'Employment Law', 
                            prompt: `As a Legal Counsel, address employment law matters:
• Review employment contracts and policies
• Ensure compliance with labor laws and regulations
• Draft non-compete and confidentiality agreements
• Handle employee disputes and terminations
• Advise on workplace investigations
• Develop harassment and discrimination prevention policies` 
                          },
                          { 
                            label: 'M&A Due Diligence', 
                            prompt: `As a Legal Counsel, conduct M&A legal due diligence:
• Review target company's legal structure and documents
• Identify legal liabilities and contingencies
• Assess litigation history and pending cases
• Review material contracts and obligations
• Evaluate regulatory compliance status
• Provide risk assessment and recommendations for deal structure` 
                          },
                          { 
                            label: 'Corporate Governance', 
                            prompt: `As a Legal Counsel, establish corporate governance framework:
• Draft and review bylaws, articles of incorporation
• Advise on board composition and responsibilities
• Ensure compliance with corporate governance regulations
• Develop policies for conflicts of interest and ethics
• Establish shareholder rights and protections
• Create board meeting procedures and documentation requirements` 
                          },
                          { 
                            label: 'Dispute Resolution', 
                            prompt: `As a Legal Counsel, manage dispute resolution:
• Assess dispute and potential outcomes
• Recommend resolution strategy (negotiation, mediation, arbitration, litigation)
• Draft demand letters and settlement proposals
• Evaluate litigation costs vs. settlement benefits
• Coordinate with external counsel if needed
• Develop litigation budget and timeline` 
                          }
                        ].map((item, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setPrompt(item.prompt);
                              setSelectedRoleDetails(null);
                              setSelectedRole("");
                            }}
                            className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors bg-purple-100 text-purple-700 hover:bg-purple-200 hover:shadow-md"
                          >
                            {item.label}
                          </button>
                        ))}
                        
                        {selectedRoleDetails.name === 'HR' && [
                          { 
                            label: 'Talent Acquisition', 
                            prompt: `As an HR Manager, develop a talent acquisition strategy:
• Define hiring needs and create job descriptions
• Identify best recruitment channels and sourcing strategies
• Design interview process and assessment criteria
• Develop employer branding and candidate experience
• Create offer packages and negotiation strategies
• Establish onboarding program for new hires` 
                          },
                          { 
                            label: 'Performance Management', 
                            prompt: `As an HR Manager, implement performance management system:
• Design performance review framework and KPIs
• Create goal-setting and tracking processes
• Develop feedback and coaching mechanisms
• Establish performance improvement plans
• Link performance to compensation and promotions
• Train managers on performance conversations` 
                          },
                          { 
                            label: 'Employee Engagement', 
                            prompt: `As an HR Manager, boost employee engagement:
• Conduct employee satisfaction surveys
• Analyze engagement drivers and pain points
• Design recognition and rewards programs
• Create career development opportunities
• Foster inclusive workplace culture
• Develop retention strategies for key talent` 
                          },
                          { 
                            label: 'Compensation & Benefits', 
                            prompt: `As an HR Manager, design compensation and benefits strategy:
• Conduct market salary benchmarking
• Create competitive compensation structure
• Design benefits packages (health, retirement, perks)
• Establish pay equity and transparency policies
• Develop incentive and bonus programs
• Ensure compliance with compensation regulations` 
                          },
                          { 
                            label: 'Learning & Development', 
                            prompt: `As an HR Manager, build learning and development programs:
• Assess skill gaps and training needs
• Design training curriculum and learning paths
• Implement leadership development programs
• Create mentorship and coaching initiatives
• Establish succession planning process
• Measure training effectiveness and ROI` 
                          },
                          { 
                            label: 'Employee Relations', 
                            prompt: `As an HR Manager, manage employee relations:
• Handle workplace conflicts and grievances
• Conduct investigations for misconduct or harassment
• Mediate disputes between employees or teams
• Ensure fair and consistent policy enforcement
• Develop employee communication channels
• Create positive work environment initiatives` 
                          },
                          { 
                            label: 'HR Compliance', 
                            prompt: `As an HR Manager, ensure HR compliance:
• Review compliance with labor laws and regulations
• Update employee handbook and policies
• Manage FMLA, ADA, and other leave programs
• Ensure proper documentation and recordkeeping
• Conduct HR audits and risk assessments
• Train managers on compliance requirements` 
                          },
                          { 
                            label: 'Organizational Development', 
                            prompt: `As an HR Manager, drive organizational development:
• Assess organizational structure and effectiveness
• Design change management strategies
• Develop culture transformation initiatives
• Create team-building and collaboration programs
• Establish diversity, equity, and inclusion programs
• Align HR strategy with business objectives` 
                          }
                        ].map((item, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setPrompt(item.prompt);
                              setSelectedRoleDetails(null);
                              setSelectedRole("");
                            }}
                            className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors bg-purple-100 text-purple-700 hover:bg-purple-200 hover:shadow-md"
                          >
                            {item.label}
                          </button>
                        ))}
                        
                        {selectedRoleDetails.name === 'Student' && [
                          { 
                            label: 'Research Assistance', 
                            prompt: `As a Student, help me with research:
• Identify credible sources and academic databases
• Summarize key findings from research papers
• Create annotated bibliography
• Develop research methodology
• Organize research notes and citations
• Generate thesis statement and outline` 
                          },
                          { 
                            label: 'Essay Writing', 
                            prompt: `As a Student, help me write an essay:
• Develop strong thesis and arguments
• Create structured outline with main points
• Provide writing tips for clarity and coherence
• Suggest evidence and examples to support claims
• Review grammar, style, and academic tone
• Format citations and references properly` 
                          },
                          { 
                            label: 'Exam Preparation', 
                            prompt: `As a Student, help me prepare for exams:
• Create study schedule and timeline
• Summarize key concepts and topics
• Generate practice questions and quizzes
• Explain difficult concepts in simple terms
• Provide memory techniques and mnemonics
• Suggest exam strategies and time management tips` 
                          },
                          { 
                            label: 'Career Planning', 
                            prompt: `As a Student, help me plan my career:
• Explore career options based on my interests and skills
• Identify required qualifications and certifications
• Suggest internship and job opportunities
• Review and improve my resume and cover letter
• Prepare for job interviews with practice questions
• Develop networking and personal branding strategies` 
                          },
                          { 
                            label: 'Project Help', 
                            prompt: `As a Student, help me with my project:
• Define project scope and objectives
• Create project timeline and milestones
• Suggest research methods and data collection
• Help with data analysis and interpretation
• Design presentation and visualization
• Provide feedback on project report` 
                          },
                          { 
                            label: 'Concept Explanation', 
                            prompt: `As a Student, explain complex concepts to me:
• Break down difficult topics into simple terms
• Provide real-world examples and analogies
• Create visual aids and diagrams
• Suggest additional learning resources
• Answer follow-up questions
• Test my understanding with practice problems` 
                          },
                          { 
                            label: 'Study Skills', 
                            prompt: `As a Student, help me improve study skills:
• Assess my current study habits
• Recommend effective study techniques
• Create personalized study plan
• Teach note-taking and summarization methods
• Suggest time management strategies
• Develop focus and concentration techniques` 
                          },
                          { 
                            label: 'Assignment Help', 
                            prompt: `As a Student, help me with my assignment:
• Understand assignment requirements and rubric
• Break down complex tasks into steps
• Provide guidance on approach and methodology
• Review my work and suggest improvements
• Check for plagiarism and proper citations
• Ensure assignment meets academic standards` 
                          }
                        ].map((item, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setPrompt(item.prompt);
                              setSelectedRoleDetails(null);
                              setSelectedRole("");
                            }}
                            className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors bg-purple-100 text-purple-700 hover:bg-purple-200 hover:shadow-md"
                          >
                            {item.label}
                          </button>
                        ))}
                        
                        {selectedRoleDetails.name === 'AI Engineer' && [
                          { 
                            label: 'Model Development', 
                            prompt: `As an AI Engineer, help me develop ML models:
• Select appropriate algorithms for the problem
• Design model architecture and features
• Implement data preprocessing pipeline
• Train and validate models with proper metrics
• Handle overfitting and underfitting issues
• Optimize hyperparameters for best performance` 
                          },
                          { 
                            label: 'MLOps & Deployment', 
                            prompt: `As an AI Engineer, implement MLOps pipeline:
• Design CI/CD pipeline for ML models
• Containerize models with Docker
• Set up model versioning and registry
• Implement model monitoring and logging
• Create automated retraining workflows
• Deploy models to production (cloud/edge)` 
                          },
                          { 
                            label: 'Data Engineering', 
                            prompt: `As an AI Engineer, build data pipeline:
• Design data ingestion and ETL processes
• Implement data validation and quality checks
• Create feature engineering pipeline
• Set up data versioning and lineage tracking
• Optimize data storage and retrieval
• Handle streaming and batch data processing` 
                          },
                          { 
                            label: 'Model Optimization', 
                            prompt: `As an AI Engineer, optimize ML models:
• Reduce model size and inference time
• Implement quantization and pruning
• Optimize for specific hardware (GPU/CPU/TPU)
• Improve model accuracy and performance
• Handle model compression techniques
• Benchmark and profile model performance` 
                          },
                          { 
                            label: 'NLP Solutions', 
                            prompt: `As an AI Engineer, build NLP applications:
• Design text preprocessing pipeline
• Implement sentiment analysis or classification
• Build chatbots or conversational AI
• Create text generation or summarization models
• Implement named entity recognition (NER)
• Fine-tune large language models (LLMs)` 
                          },
                          { 
                            label: 'Computer Vision', 
                            prompt: `As an AI Engineer, develop computer vision systems:
• Design image preprocessing and augmentation
• Implement object detection or segmentation
• Build image classification models
• Create facial recognition systems
• Develop video analysis pipelines
• Optimize models for real-time inference` 
                          },
                          { 
                            label: 'AI Architecture', 
                            prompt: `As an AI Engineer, design AI system architecture:
• Design scalable ML infrastructure
• Select appropriate tech stack and frameworks
• Implement microservices for AI components
• Set up model serving and API endpoints
• Design data flow and system integration
• Ensure security and compliance in AI systems` 
                          },
                          { 
                            label: 'Experiment Tracking', 
                            prompt: `As an AI Engineer, set up experiment tracking:
• Implement experiment logging and versioning
• Track hyperparameters and metrics
• Compare model performance across experiments
• Visualize training progress and results
• Reproduce experiments reliably
• Document findings and best practices` 
                          }
                        ].map((item, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setPrompt(item.prompt);
                              setSelectedRoleDetails(null);
                              setSelectedRole("");
                            }}
                            className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors bg-purple-100 text-purple-700 hover:bg-purple-200 hover:shadow-md"
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Close Button */}
                <button
                  onClick={() => {
                    setSelectedRole("");
                    setSelectedRoleDetails(null);
                  }}
                  className="mt-4 w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Prompt */}
      <div className={`${panel} p-3 sm:p-4 border-t-4 border-[#0B1F3B] relative transition-all duration-300 ${showGreenGlow ? 'green-glow-animation' : ''}`} style={{ zIndex: showGreenGlow ? 10 : 'auto' }}>
        <div className="font-semibold mb-3">Prompt</div>
        
        {/* Greeting Message */}
        {!prompt && (
          <div className="mb-3 text-slate-500 text-sm italic">
            Hey, Mac — ready to dive in? Ask me anything!
          </div>
        )}
        
        <textarea 
          className="w-full h-40 p-3 rounded-xl border focus:outline-none text-[15px] transition-all" 
          placeholder="Enter your research question... (Paste screenshots with Ctrl+V or drag & drop files here)" 
          value={prompt} 
          onChange={(e) => handlePromptChange(e.target.value)}
          onPaste={async (e) => {
            // Handle pasted images and files
            console.log('Paste event triggered');
            
            // Check for files in clipboard
            const items = Array.from(e.clipboardData.items);
            console.log('Clipboard items:', items.map(i => ({ type: i.type, kind: i.kind })));
            
            const imageItems = items.filter(item => item.type.startsWith('image/'));
            
            if (imageItems.length > 0) {
              e.preventDefault();
              console.log('Found images:', imageItems.length);
              
              try {
                const { processFiles } = await import('./lib/file-utils');
                const imageFiles = await Promise.all(
                  imageItems.map(async (item) => {
                    const file = item.getAsFile();
                    console.log('Got file:', file?.name, file?.type, file?.size);
                    return file;
                  })
                );
                
                const validFiles = imageFiles.filter(file => file !== null) as File[];
                console.log('Valid files:', validFiles.length);
                
                if (validFiles.length > 0) {
                  const newFiles = await processFiles(validFiles);
                  console.log('Processed files:', newFiles.length);
                  setUploadedFiles([...uploadedFiles, ...newFiles]);
                }
              } catch (error) {
                console.error('Error processing pasted images:', error);
              }
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.currentTarget.classList.add('border-blue-500', 'bg-blue-50');
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');
          }}
          onDrop={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');
            
            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) {
              const { processFiles } = await import('./lib/file-utils');
              const newFiles = await processFiles(files);
              setUploadedFiles([...uploadedFiles, ...newFiles]);
            }
          }}
        />
        
        {/* Character counter and warning */}
        <div className="flex justify-between items-center text-xs mt-2">
          <span className="text-slate-500">
            {prompt.length.toLocaleString()} / {LIMITS.PROMPT_HARD_LIMIT.toLocaleString()} characters
          </span>
          {promptWarning && (
            <span className={prompt.length > LIMITS.PROMPT_HARD_LIMIT ? 'text-red-600 font-medium' : 'text-orange-600 font-medium'}>
              {promptWarning}
            </span>
          )}
        </div>
        
        {/* Generate Button Under Prompt - Right Side */}
        <div className="mt-3 flex justify-end">
          <button 
            onClick={runAll} 
            disabled={isRunning || selectedEngines.length===0 || !prompt.trim()} 
            className="px-12 py-2 rounded-xl bg-[#0B1F3B] text-white text-sm font-medium disabled:opacity-50 hover:bg-[#0d2a52] transition-colors"
          >
            {isRunning ? 'Generating…' : 'Generate'}
          </button>
        </div>
        
        {/* Image Preview Section (GPT-like) */}
        {uploadedFiles.filter(f => f.type.startsWith('image/')).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {uploadedFiles
              .filter(f => f.type.startsWith('image/'))
              .map((file, idx) => (
                <div key={idx} className="relative group">
                  <img 
                    src={file.content} 
                    alt={file.name}
                    className="h-20 w-20 object-cover rounded-lg border-2 border-slate-200 hover:border-blue-500 transition-all cursor-pointer"
                    onClick={() => {
                      // Open image in new tab
                      window.open(file.content, '_blank');
                    }}
                  />
                  <button
                    onClick={() => {
                      setUploadedFiles(uploadedFiles.filter((_, i) => uploadedFiles.indexOf(file) !== i));
                    }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold hover:bg-red-600"
                    title="Remove image"
                  >
                    ×
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-1 py-0.5 rounded-b-lg truncate opacity-0 group-hover:opacity-100 transition-opacity">
                    {file.name}
                  </div>
                </div>
              ))}
          </div>
        )}
        
        {/* File Upload Zone */}
        <div className="mt-3">
          <FileUploadZone 
            files={uploadedFiles} 
            onFilesChange={setUploadedFiles}
            disabled={isRunning}
          />
        </div>

        {/* Business metrics chips (mobile-compact) */}
        <div className={`mt-3 w-full rounded-xl p-3 sm:p-4 text-white ${liveMode ? "bg-gradient-to-r from-emerald-700 to-emerald-600" : "bg-gradient-to-r from-slate-700 to-slate-600"}`}>
          {showBusiness ? (
            <div className="flex flex-wrap gap-3 text-sm">
              <div className="px-2 py-1 rounded-lg bg-white/10">In tokens: <span className="font-semibold">{totals.inTok.toLocaleString()}</span></div>
              <div className="px-2 py-1 rounded-lg bg-white/10">Out tokens: <span className="font-semibold">{totals.outTok.toLocaleString()}</span></div>
              <div className="px-2 py-1 rounded-lg bg-white/10">Min spend: <span className="font-semibold">${totals.min.toFixed(2)}</span></div>
              <div className="px-2 py-1 rounded-lg bg-white/10">Max spend: <span className="font-semibold">${totals.max.toFixed(2)}</span></div>
              <div className="px-2 py-1 rounded-lg bg-white/10">Time: <span className="font-semibold">{timeLabel(totals.inTok, totals.outTok)}</span></div>
            </div>
          ) : (
            <div className="text-xs">(Business view hidden — toggle in header.)</div>
          )}
          <div className="text-[11px] mt-2 opacity-90">
            {liveMode ? "Live mode ON — use a backend proxy in production to hide keys and avoid CORS." : "Mock mode — estimates only; no live API calls."}
          </div>
        </div>

        {/* Primary generate action - Live/Mock toggle only */}
        <div className="mt-2 flex items-center justify-end gap-3">
          <span className="text-[12px] text-slate-600 mr-3">Tip: Toggle mode, then click Generate</span>
          <div className="inline-flex rounded-lg border overflow-hidden">
            <button type="button" onClick={() => { setLiveMode(false); setShowGreenGlow(false); }} className={`${!liveMode ? 'bg-slate-800 text-white' : 'bg-white text-slate-700'} px-4 py-2 text-sm font-medium transition-colors`}>Estimate cost</button>
            <button type="button" onClick={() => { setLiveMode(true); setShowGreenGlow(true); }} className={`${liveMode ? 'bg-emerald-700 text-white' : 'bg-white text-slate-700'} px-4 py-2 text-sm font-medium transition-colors`}>Run Live</button>
          </div>
        </div>

        {/* 🧪 MOCK ERROR TESTING PANEL - For testing auto-retry logic (DISABLED)
        <div className="mt-3 p-3 bg-amber-50 border border-amber-300 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🧪</span>
              <span className="text-sm font-semibold text-amber-800">Mock Error Testing</span>
              {mockErrorMode && (
                <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full animate-pulse">
                  ACTIVE: {mockErrorMode}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <select
                value={mockErrorMode || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setMockErrorMode(val === '' ? false : val as '429' | '500' | '503' | 'random');
                  setMockErrorCounts({});
                }}
                className="text-sm border border-amber-400 rounded px-2 py-1 bg-white"
              >
                <option value="">Off (Normal)</option>
                <option value="429">🔄 429 Rate Limit</option>
                <option value="500">💥 500 Server Error</option>
                <option value="503">⏳ 503 Overloaded</option>
                <option value="random">🎲 Random Errors</option>
              </select>
            </div>
          </div>
          {mockErrorMode && (
            <div className="mt-2 text-xs text-amber-700">
              <p>⚠️ Mock errors will be thrown for all engines. They will succeed after {MOCK_FAIL_AFTER_RETRIES} retries.</p>
              <p className="mt-1">Retry attempts per engine: {Object.entries(mockErrorCounts).map(([id, count]) => `${id}: ${count}`).join(', ') || 'None yet'}</p>
            </div>
          )}
        </div>
        */}

        <div className="mt-2 text-[12px] text-slate-700">Prices are indicative. Adjust these to match your plan; final billing comes from each provider.</div>

        {/* Assumptions (hidden from end users - uncomment to show) */}
        {false && (
          <details className="mt-3 rounded-lg border border-slate-200 p-3">
            <summary className="cursor-pointer text-sm font-medium">Show assumptions that power the estimates</summary>
            <div className="mt-2 text-[13px] text-slate-700 space-y-2">
              <div>• One attempt per engine • Output capped by context and your output policy • Prices reflect the override values shown per engine.</div>
              <div className="overflow-auto">
                <table className="w-full text-[12px] border-collapse">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-1 pr-2">Engine</th>
                      <th className="py-1 pr-2">Version</th>
                      <th className="py-1 pr-2">Price in</th>
                      <th className="py-1 pr-2">Price out</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedEngines.map(e => {
                      const pr = (pricing as any)[e.provider]?.[e.selectedVersion];
                      return (
                        <tr key={`assump-${e.id}`} className="border-b">
                          <td className="py-1 pr-2">{e.name}</td>
                          <td className="py-1 pr-2">{e.selectedVersion}</td>
                          <td className="py-1 pr-2">${(pr?.in ?? 0).toFixed(6)}</td>
                          <td className="py-1 pr-2">${(pr?.out ?? 0).toFixed(6)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </details>
        )}
      </div>

      {/* Engine Selection — Story Mode Style */}
      <div className={`${panel} p-3 sm:p-4 border-t-4 border-[#4F46E5]`}>
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold">Engine Selection ({Object.values(selected).filter(Boolean).length}/{engines.length} selected)</div>
          <div className="flex items-center gap-2">
            <button onClick={addCustomEngine} className="px-3 py-1.5 rounded-lg border text-sm bg-white hover:bg-slate-50">+ Add Custom Engine</button>
          </div>
        </div>
        
        {/* All Engines - Pills or Expanded Cards */}
        <div className="grid md:grid-cols-2 gap-3 sm:gap-4 items-start">
          {engines.map(engine => {
            const isSelected = selected[engine.id];
            const isExpanded = expandedEngines.has(engine.id);
            const brandColor = providerStyles[engine.provider] || 'bg-slate-700';
            const warn = warningForEngine(engine);
            
            const toggleExpand = () => {
              const newSet = new Set(expandedEngines);
              if (newSet.has(engine.id)) {
                newSet.delete(engine.id);
              } else {
                newSet.add(engine.id);
              }
              setExpandedEngines(newSet);
            };

            // If collapsed, show as pill
            if (!isExpanded) {
              return (
                <div
                  key={engine.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${brandColor} text-white hover:shadow-lg cursor-pointer self-start h-fit ${
                    isSelected ? 'ring-2 ring-purple-500 ring-offset-2' : 'opacity-80 hover:opacity-100'
                  }`}
                  onClick={toggleExpand}
                >
                  <span>{engine.name}</span>
                  <span className="text-xs opacity-75">Context {(engine.contextLimit / 1000).toFixed(0)}k • {engine.tokenizer}</span>
                  <div className="ml-auto flex items-center gap-1">
                    <div 
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                        isSelected 
                          ? 'bg-white border-white shadow-md' 
                          : 'border-white bg-white/30 hover:bg-white/50'
                      }`}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        toggleEngine(engine.id);
                      }}
                    >
                      {isSelected && (
                        <svg className="w-3.5 h-3.5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <svg className="w-4 h-4 opacity-75" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              );
            }

            // If expanded, show full card
            const e = engine;
            const pr = (pricing as any)[e.provider]?.[e.selectedVersion];
            const fallbackPricing = (BASE_PRICING as any)[e.provider]?.[e.selectedVersion];
            const actualPricing = pr || fallbackPricing;
            
            const P = estimateTokens(prompt, e.tokenizer);
            const minTokens = Math.max(P, 100);
            const nowIn = Math.min(minTokens, e.contextLimit);
            const outCap = computeOutCap(e, nowIn);
            const minOut = Math.max(200, Math.floor(0.35 * outCap));
            
            const calculatedMinSpend = actualPricing ? (nowIn / 1_000_000) * actualPricing.in + (minOut / 1_000_000) * actualPricing.out : 0;
            const calculatedMaxSpend = actualPricing ? (nowIn / 1_000_000) * actualPricing.in + (outCap / 1_000_000) * actualPricing.out : 0;
            const minSpend = Math.max(calculatedMinSpend, 0.01);
            const maxSpend = Math.max(calculatedMaxSpend, 0.01);

            return (
              <div
                key={e.id}
                className="w-full flex flex-col items-start text-left rounded-2xl border-2 px-4 py-3 text-sm transition relative overflow-hidden border-purple-300 bg-white shadow-lg"
              >
                {/* Brand color bar on left */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${brandColor}`}></div>
                
                {/* Clickable header area - Collapse */}
                <button
                  onClick={toggleExpand}
                  className="flex items-center gap-2 w-full text-left"
                >
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold text-white ${brandColor}`}>
                    {e.name}
                  </span>
                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-xs text-slate-500">Select Engine</span>
                    <div 
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                        isSelected ? 'bg-purple-600 border-purple-600' : 'border-slate-300 bg-white'
                      }`}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        toggleEngine(e.id);
                      }}
                    >
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <svg className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>
                
                {/* Model Version Dropdown */}
                <div className="w-full mt-2">
                  <label className="text-xs text-slate-600 block mb-1">Version</label>
                  <select 
                    className="w-full text-xs border rounded px-2 py-1.5 bg-white"
                    value={e.selectedVersion} 
                    onChange={(ev) => {
                      ev.stopPropagation();
                      updateVersion(e.id, ev.target.value);
                    }}
                    onClick={(ev) => ev.stopPropagation()}
                  >
                    {e.versions.map(v => {
                      const excludedModels = ['gemini-2.0-flash-exp', 'claude-3.5-sonnet', 'claude-3-5-sonnet-20241022', 'claude-3-haiku'];
                      const showGreenDot = liveMode && !excludedModels.includes(v);
                      return (
                        <option key={v} value={v}>
                          {showGreenDot ? '🟢 ' : ''}{v}
                        </option>
                      );
                    })}
                  </select>
                </div>
                
                {/* API Key Field */}
                <div className="w-full mt-2">
                  <label className="text-xs text-slate-600 block mb-1">API Key</label>
                  <div className="flex items-center gap-2">
                    <input 
                      className="flex-1 text-xs border rounded px-2 py-1.5 bg-white" 
                      type={showApiKey[e.id] ? "text" : "password"} 
                      placeholder="Enter API key..." 
                      value={e.apiKey || ""} 
                      onChange={(ev) => {
                        ev.stopPropagation();
                        updateApiKey(e.id, ev.target.value);
                      }}
                      onClick={(ev) => ev.stopPropagation()}
                    />
                    <button
                      type="button"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        setShowApiKey(prev => ({ ...prev, [e.id]: !prev[e.id] }));
                      }}
                      className="px-2 py-1 text-xs border rounded hover:bg-slate-50"
                      title={showApiKey[e.id] ? "Hide" : "Show"}
                    >
                      {showApiKey[e.id] ? "👁️" : "👁️‍🗨️"}
                    </button>
                    {/* Fetch Balance Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fetchBalance(e);
                      }}
                      className="px-2 py-1 text-xs border rounded hover:bg-blue-50 text-blue-600 border-blue-300"
                      title="Check balance/validate key"
                    >
                      {apiBalances[e.id]?.loading ? '⏳' : '💰'}
                    </button>
                  </div>
                  {/* Balance Display */}
                  {apiBalances[e.id] && !apiBalances[e.id].loading && (
                    <div className="mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        apiBalances[e.id].error ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                      }`}>
                        {apiBalances[e.id].balance}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Output Policy */}
                <div className="w-full mt-2">
                  <label className="text-xs text-slate-600 block mb-1">Output</label>
                  <div className="flex items-center gap-2">
                    <select 
                      className="flex-1 text-xs border rounded px-2 py-1.5 bg-white" 
                      value={e.outPolicy?.mode || "auto"} 
                      onChange={(ev) => {
                        ev.stopPropagation();
                        updateOutPolicy(e.id, ev.target.value as any);
                      }}
                      onClick={(ev) => ev.stopPropagation()}
                    >
                      <option value="auto">Auto (recommended)</option>
                      <option value="fixed">Fixed</option>
                    </select>
                    {e.outPolicy?.mode === "fixed" && (
                      <>
                        <input 
                          type="number" 
                          min={256} 
                          step={128} 
                          value={e.outPolicy?.fixedTokens || 2000} 
                          onChange={(ev) => {
                            ev.stopPropagation();
                            updateOutPolicy(e.id, "fixed", Math.max(256, Number(ev.target.value)||2000));
                          }}
                          onClick={(ev) => ev.stopPropagation()}
                          className="w-20 text-xs border rounded px-2 py-1.5" 
                        />
                        <span className="text-xs text-slate-500">tokens</span>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Pricing Override */}
                <div className="w-full mt-2">
                  <div className="flex items-center gap-2 text-xs">
                    <div className="flex-1">
                      <label className="text-slate-600 block mb-1">Price in:</label>
                      <input 
                        className="w-full border rounded px-2 py-1.5" 
                        type="number" 
                        step="0.000001" 
                        value={(pr?.in ?? 0).toString()} 
                        onChange={(ev) => {
                          ev.stopPropagation();
                          overridePrice(e.provider, e.selectedVersion, "in", Number(ev.target.value));
                        }}
                        onClick={(ev) => ev.stopPropagation()}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-slate-600 block mb-1">Price out:</label>
                      <input 
                        className="w-full border rounded px-2 py-1.5" 
                        type="number" 
                        step="0.000001" 
                        value={(pr?.out ?? 0).toString()} 
                        onChange={(ev) => {
                          ev.stopPropagation();
                          overridePrice(e.provider, e.selectedVersion, "out", Number(ev.target.value));
                        }}
                        onClick={(ev) => ev.stopPropagation()}
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {((BASE_PRICING as any)[e.provider]?.[e.selectedVersion]?.note || e.selectedVersion)}
                  </p>
                </div>
                
                <span className="text-xs text-slate-400 mt-2 block">
                  Context {e.contextLimit.toLocaleString()} • {e.tokenizer}
                </span>
                
                {/* Min/Max Spend Summary - Always Visible */}
                <div className="w-full mt-2 pt-2 border-t border-slate-200">
                  <div className="text-xs text-slate-700">
                    <span className="font-medium">Min spend</span> <span className="font-bold text-green-600">${minSpend.toFixed(2)}</span> • 
                    <span className="font-medium ml-2">Max</span> <span className="font-bold text-orange-600">${maxSpend.toFixed(2)}</span> • 
                    <span className="font-medium ml-2">ETA</span> <span className="font-bold">{timeLabel(nowIn, outCap)}</span> • 
                    <span className="font-medium ml-2">Outcome:</span> <span className="font-bold">{outcomeLabel(outCap)}</span>
                  </div>
                  {warn && liveMode ? <div className="text-amber-700 text-[11px] mt-1">⚠️ {warn}</div> : null}
                </div>
                
                {/* Token and Cost Info - Only show when Technical toggle is ON */}
                {showTech && (
                  <div className="w-full mt-3 pt-2 border-t border-slate-200">
                    <div className="text-xs text-slate-600 space-y-1">
                      <div className="flex justify-between">
                        <span>Input tokens:</span>
                        <span className="font-medium text-slate-900">{nowIn.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Output cap:</span>
                        <span className="font-medium text-slate-900">{outCap.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center pt-1">
                        <span className="font-medium text-purple-700">Min cost:</span>
                        <span className="font-semibold text-green-600">${minSpend.toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-purple-700">Max cost:</span>
                        <span className="font-semibold text-orange-600">${maxSpend.toFixed(4)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Outcome Screens — swipeable tabs */}
      {selectedEngines.length > 0 && (
        <div className={`${panel} p-3 sm:p-4 border-t-4 border-[#0EA5E9]`}>
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold">Every Engine Output</div>
          </div>

          <div className="hidden">
            <button
              onClick={async () => {
                try {
                  // Helper function to convert markdown to HTML with proper table support
                  const markdownToHtml = (md: string) => {
                    let html = md;
                    
                    // First, extract and protect code blocks
                    const codeBlocks: string[] = [];
                    html = html.replace(/```([^\n]*)\n([\s\S]*?)```/g, (match, lang, code) => {
                      const placeholder = `___CODE_BLOCK_${codeBlocks.length}___`;
                      // Escape HTML in code
                      const escapedCode = code
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .trim();
                      codeBlocks.push(`<pre style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; overflow-x: auto; font-family: 'Courier New', monospace;"><code>${escapedCode}</code></pre>`);
                      return placeholder;
                    });
                    
                    // Extract and protect inline code
                    const inlineCodes: string[] = [];
                    html = html.replace(/`([^`]+)`/g, (match, code) => {
                      const placeholder = `___INLINE_CODE_${inlineCodes.length}___`;
                      const escapedCode = code
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;');
                      inlineCodes.push(`<code style="background-color: #f1f5f9; padding: 2px 6px; border-radius: 3px; font-family: 'Courier New', monospace;">${escapedCode}</code>`);
                      return placeholder;
                    });
                    
                    // Extract and process tables separately
                    const tables: string[] = [];
                    const tableRegex = /(\|[^\n]+\|\n\|[-:\s|]+\|\n(?:\|[^\n]*\|\n?)*)/g;
                    html = html.replace(tableRegex, (match) => {
                      const placeholder = `<!--TABLE${tables.length}-->`;
                      tables.push(match);
                      return placeholder;
                    });
                    
                    // Headers (must be at start of line)
                    html = html.replace(/^### (.+)$/gim, '<h3>$1</h3>');
                    html = html.replace(/^## (.+)$/gim, '<h2>$1</h2>');
                    html = html.replace(/^# (.+)$/gim, '<h1>$1</h1>');
                    
                    // Bold (process before italic to avoid conflicts)
                    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
                    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
                    
                    // Italic (avoid matching underscores in code/identifiers)
                    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
                    html = html.replace(/(?<!\w)_(.+?)_(?!\w)/g, '<em>$1</em>');
                    
                    // Lists
                    html = html.replace(/^\* (.+)$/gim, '<li>$1</li>');
                    html = html.replace(/^- (.+)$/gim, '<li>$1</li>');
                    html = html.replace(/^\d+\. (.+)$/gim, '<li>$1</li>');
                    
                    // Wrap consecutive <li> in <ul>
                    html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`);
                    
                    // Process tables and replace placeholders
                    tables.forEach((tableText, index) => {
                      const lines = tableText.trim().split('\n');
                      if (lines.length < 3) return; // Invalid table
                      
                      const headerRow = lines[0];
                      const dataRows = lines.slice(2);
                      
                      // Parse header
                      const headers = headerRow.split('|').map((h: string) => h.trim()).filter((h: string) => h);
                      const headerHtml = headers.map((h: string) => `<th>${h}</th>`).join('');
                      
                      // Parse body rows
                      const bodyHtml = dataRows.map((row: string) => {
                        const cells = row.split('|').map((c: string) => c.trim()).filter((c: string) => c);
                        return '<tr>' + cells.map((c: string) => `<td>${c}</td>`).join('') + '</tr>';
                      }).join('');
                      
                      const tableHtml = `<table><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`;
                      html = html.replace(`<!--TABLE${index}-->`, tableHtml);
                    });
                    
                    // Paragraphs and line breaks (do this before restoring code)
                    html = html.replace(/\n\n+/g, '</p><p>');
                    html = html.replace(/\n/g, '<br>');
                    
                    // Wrap in paragraph if not already wrapped
                    if (!html.startsWith('<')) {
                      html = '<p>' + html + '</p>';
                    }
                    
                    // Restore code blocks (do this LAST to prevent interference)
                    codeBlocks.forEach((code, index) => {
                      html = html.replace(`___CODE_BLOCK_${index}___`, code);
                    });
                    
                    // Restore inline code
                    inlineCodes.forEach((code, index) => {
                      html = html.replace(`___INLINE_CODE_${index}___`, code);
                    });
                    
                    return html;
                  };

                  // Build HTML content with rich formatting
                  const htmlContent = selectedEngines.map(e => {
                    const r = results.find(rr => rr.engineId === e.id);
                    const streamingState = streamingStates[e.id];
                    const content = streamingState?.content || r?.responsePreview || "(No response)";
                    const htmlContent = markdownToHtml(content);
                    
                    return `
                      <div style="margin-bottom: 30px; page-break-inside: avoid;">
                        <h2 style="color: #1e40af; border-bottom: 2px solid #3b82f6; padding-bottom: 8px; margin-bottom: 16px;">
                          ${e.name} <span style="color: #64748b; font-size: 0.9em;">(${e.selectedVersion})</span>
                        </h2>
                        <div style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; line-height: 1.6;">
                          ${htmlContent}
                        </div>
                        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                      </div>
                    `;
                  }).join('');

                  const fullHtml = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                      <meta charset="utf-8">
                      <style>
                        body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; line-height: 1.6; }
                        h1 { color: #1e293b; font-size: 18pt; margin-top: 20px; margin-bottom: 10px; }
                        h2 { color: #1e40af; font-size: 14pt; margin-top: 16px; margin-bottom: 8px; }
                        h3 { color: #475569; font-size: 12pt; margin-top: 12px; margin-bottom: 6px; }
                        strong { font-weight: 600; color: #0f172a; }
                        em { font-style: italic; }
                        code { background-color: #f1f5f9; padding: 2px 6px; border-radius: 3px; font-family: 'Courier New', monospace; font-size: 10pt; }
                        pre { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; overflow-x: auto; }
                        pre code { background-color: transparent; padding: 0; }
                        ul, ol { margin-left: 20px; margin-bottom: 10px; }
                        li { margin-bottom: 4px; }
                        table { border-collapse: collapse; width: 100%; margin: 16px 0; }
                        th { background-color: #3b82f6; color: white; padding: 10px; text-align: left; font-weight: 600; }
                        td { border: 1px solid #e2e8f0; padding: 8px; }
                        tr:nth-child(even) { background-color: #f8fafc; }
                      </style>
                    </head>
                    <body>
                      <h1 style="color: #1e293b; border-bottom: 3px solid #3b82f6; padding-bottom: 12px; margin-bottom: 24px;">
                        AI Responses Comparison
                      </h1>
                      ${htmlContent}
                    </body>
                    </html>
                  `;

                  // Plain text version as fallback
                  const plainText = selectedEngines.map(e => {
                    const r = results.find(rr => rr.engineId === e.id);
                    const streamingState = streamingStates[e.id];
                    const content = streamingState?.content || r?.responsePreview || "(No response)";
                    return `${e.name} (${e.selectedVersion})\n\n${content}\n\n---\n`;
                  }).join('\n');

                  // Copy both HTML and plain text to clipboard
                  const blob = new Blob([fullHtml], { type: 'text/html' });
                  const textBlob = new Blob([plainText], { type: 'text/plain' });
                  
                  const clipboardItem = new ClipboardItem({
                    'text/html': blob,
                    'text/plain': textBlob
                  });

                  await navigator.clipboard.write([clipboardItem]);
                  alert('✅ All responses copied with rich formatting! Paste into Word to see formatting.');
                } catch (error) {
                  // Fallback to plain text if rich copy fails
                  const plainText = selectedEngines.map(e => {
                    const r = results.find(rr => rr.engineId === e.id);
                    const streamingState = streamingStates[e.id];
                    const content = streamingState?.content || r?.responsePreview || "(No response)";
                    return `${e.name} (${e.selectedVersion})\n\n${content}\n\n---\n`;
                  }).join('\n');
                  
                  navigator.clipboard?.writeText(plainText).then(() => {
                    alert('✅ Responses copied as plain text!');
                  }).catch(() => {
                    alert('❌ Failed to copy. Please try again.');
                  });
                }
              }}
              className="hidden"
            >
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 #f1f5f9' }}>
            {selectedEngines.map(e => (
              <button key={e.id} onClick={() => setActiveTab(e.id)} className={`shrink-0 px-3 py-2 rounded-full text-sm border ${activeTab===e.id ? 'bg-[#0B1F3B] text-white border-[#0B1F3B]' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                {e.name} · {e.selectedVersion}
              </button>
            ))}
          </div>

          {(() => {
            const e = selectedEngines.find(x => x.id === activeTab) || selectedEngines[0];
            const r = results.find(rr => rr.engineId === e.id);
            const p = previews.find(pp => pp.e.id === e.id);
            const streamingState = streamingStates[e.id];
            const isCurrentlyStreaming = streamingState?.isStreaming || false;
            const currentContent = streamingState?.content || r?.responsePreview || "";
            const hasError = r?.error;
            const brand = providerStyles[e.provider] || 'bg-slate-700';
            
            // Convert markdown to HTML for real-time rendering
            const htmlContent = currentContent ? marked.parse(currentContent) as string : "";
            
            return (
              <div className="mt-3 rounded-2xl border border-slate-300 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-md text-white ${brand}`}>{e.name}</span>
                    <span>· {e.selectedVersion}</span>
                    {isCurrentlyStreaming && (
                      <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium flex items-center gap-1">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        Streaming...
                      </span>
                    )}
                    {hasError && !isCurrentlyStreaming && (
                      <>
                        <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-medium flex items-center gap-1">
                          <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                          Error
                        </span>
                        {/* Retry button for auto-fixable errors */}
                        {lastFailedRequest && lastFailedRequest.engine.id === e.id && currentError && (
                          <button
                            onClick={async () => {
                              await handleRetry();
                            }}
                            className="px-3 py-1 rounded-full bg-blue-600 text-white text-xs font-medium flex items-center gap-1.5 hover:bg-blue-700 transition-colors shadow-sm"
                            title="Retry this request"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Retry
                          </button>
                        )}
                      </>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-600">{showTech ? 'Tech view on' : 'Business view'}</div>
                </div>
                
                {/* Streaming content with auto-scroll */}
                <div className="relative">
                  <div 
                    className="text-sm max-h-screen overflow-y-auto custom-scrollbar"
                    style={{ scrollBehavior: 'smooth', maxHeight: '800px' }}
                    ref={(el) => {
                      if (el && isCurrentlyStreaming) {
                        el.scrollTop = el.scrollHeight;
                      }
                    }}
                  >
                    {hasError ? (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-start gap-3">
                          <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div>
                            <div className="font-semibold text-red-900 mb-1">Error</div>
                            <div className="text-red-800 text-sm">{r?.error}</div>
                          </div>
                        </div>
                      </div>
                    ) : currentContent ? (
                      <EnhancedMarkdownRenderer 
                        content={currentContent} 
                        isStreaming={isCurrentlyStreaming}
                      />
                    ) : null}
                  </div>
                  
                  {/* Streaming progress bar */}
                  {isCurrentlyStreaming && (
                    <div className="absolute bottom-0 left-0 right-0">
                      <div className="h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse"></div>
                    </div>
                  )}
                </div>

                {/* Technical analysis collapsible */}
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-medium">Technical analysis (estimate vs actual)</summary>
                  <div className="mt-2 overflow-auto text-sm">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="text-left border-b">
                          <th className="py-1 pr-3">Metric</th>
                          <th className="py-1 pr-3">Estimate</th>
                          <th className="py-1 pr-3">Actual</th>
                          <th className="py-1 pr-3">Variance</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b"><td className="py-1 pr-3">Input tokens</td><td className="py-1 pr-3">{p?.nowIn.toLocaleString()}</td><td className="py-1 pr-3">{r ? r.tokensIn.toLocaleString() : "–"}</td><td className="py-1 pr-3">{r ? (r.tokensIn - (p?.nowIn||0)).toLocaleString() : "–"}</td></tr>
                        <tr className="border-b"><td className="py-1 pr-3">Output tokens</td><td className="py-1 pr-3">cap {p?.outCap.toLocaleString()}</td><td className="py-1 pr-3">{r ? r.tokensOut.toLocaleString() : "–"}</td><td className="py-1 pr-3">{r ? (r.tokensOut - (p?.outCap||0)).toLocaleString() : "–"}</td></tr>
                        <tr className="border-b"><td className="py-1 pr-3">Spend (min → max)</td><td className="py-1 pr-3">${(p?.minSpend||0).toFixed(3)} → ${(p?.maxSpend||0).toFixed(3)}</td><td className="py-1 pr-3">{r ? `$${r.costUSD.toFixed(3)}` : "–"}</td><td className="py-1 pr-3">{r ? `$${(r.costUSD - (p?.maxSpend||0)).toFixed(3)}` : "–"}</td></tr>
                        <tr><td className="py-1 pr-3">Reason</td><td className="py-1 pr-3" colSpan={3}>{r ? r.reason : "Will be computed after run."}</td></tr>
                      </tbody>
                    </table>
                    {r?.warnings?.length ? <div className="mt-2 text-amber-700 text-[12px]">Warnings: {r.warnings.join("; ")}</div> : null}
                  </div>
                </details>
              </div>
            );
          })()}
        </div>
      )}

      {/* Run Summary — cards on mobile */}
      {results.length > 0 && (
        <div className={`${panel} p-3 sm:p-4 border-t-4 border-emerald-600`}>
          <details>
            <summary className="cursor-pointer font-semibold flex items-center justify-between mb-2">
              <span>Run Summary (Actuals)</span>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const combined = results.map(r => `# ${r.engineName} · ${r.version}\n\n${r.responsePreview || "(no text)"}`).join("\n\n---\n\n");
                  setCompiledDoc(combined);
                }}
                className="px-3 py-1.5 rounded-lg border text-sm bg-white hover:bg-slate-50"
              >Compile all responses</button>
            </summary>

          <div className="mt-3">
          {/* Compiled doc viewer */}
          {compiledDoc && (
            <details className="mb-3 rounded-lg border border-slate-200 p-3">
              <summary className="cursor-pointer text-sm font-medium">Preview compiled document</summary>
              <div className="mt-2">
                <textarea readOnly value={compiledDoc} className="w-full h-40 p-2 border rounded" />
                <div className="mt-2 flex gap-2">
                  <button onClick={() => navigator.clipboard?.writeText(compiledDoc)} className="px-3 py-1.5 rounded bg-slate-800 text-white text-sm">Copy</button>
                </div>
              </div>
            </details>
          )}

          <div className="sm:hidden space-y-3">
            {results.map(r => (
              <div key={r.engineId} className="rounded-xl border p-3">
                <div className="font-medium">{r.engineName} · {r.version}</div>
                <div className="text-[13px] mt-1">In: {r.tokensIn.toLocaleString()} • Out: {r.tokensOut.toLocaleString()} • ${r.costUSD.toFixed(4)} • {(r.durationMs/1000).toFixed(1)}s</div>
                <div className="text-[12px] text-slate-600 mt-1">{r.success ? '✓ Success' : `✗ ${r.error || 'Failed'}`}</div>
                {r.warnings?.length ? <div className="text-[12px] text-amber-700 mt-1">{r.warnings.join('; ')}</div> : null}
              </div>
            ))}
          </div>
          <div className="hidden sm:block overflow-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-3">Engine</th>
                  <th className="py-2 pr-3">Version</th>
                  <th className="py-2 pr-3 text-right">In (tok)</th>
                  <th className="py-2 pr-3 text-right">Out (tok)</th>
                  <th className="py-2 pr-3 text-right">Cost ($)</th>
                  <th className="py-2 pr-3">Time</th>
                  <th className="py-2 pr-3">Attempts</th>
                  <th className="py-2 pr-3">Reason</th>
                  <th className="py-2 pr-3">Success?</th>
                  <th className="py-2 pr-3">Error</th>
                </tr>
              </thead>
              <tbody>
                {results.map(r => (
                  <tr key={r.engineId} className="border-b align-top">
                    <td className="py-2 pr-3">{r.engineName}</td>
                    <td className="py-2 pr-3">{r.version}</td>
                    <td className="py-2 pr-3 text-right">{r.tokensIn.toLocaleString()}</td>
                    <td className="py-2 pr-3 text-right">{r.tokensOut.toLocaleString()}</td>
                    <td className="py-2 pr-3 text-right">{r.costUSD.toFixed(4)}</td>
                    <td className="py-2 pr-3">{(r.durationMs/1000).toFixed(1)}s</td>
                    <td className="py-2 pr-3">{r.attempts}</td>
                    <td className="py-2 pr-3 max-w-[220px]">{r.reason}</td>
                    <td className="py-2 pr-3">{r.success ? "✓" : "✗"}</td>
                    <td className="py-2 pr-3">{r.error || ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Cost Comparison */}
          <div className="mt-4 pt-4 border-t">
            <div className="text-sm font-medium mb-2">Cost Analysis</div>
            <div className="flex items-center gap-4 text-sm">
              <div>
                <span className="text-slate-600">Total Estimated:</span>
                <span className="ml-2 font-semibold">${totals.max.toFixed(4)}</span>
              </div>
              <div>
                <span className="text-slate-600">Actual Cost Incurred:</span>
                <span className="ml-2 font-semibold text-emerald-600">${results.reduce((sum, r) => sum + r.costUSD, 0).toFixed(4)}</span>
              </div>
              <div>
                {results.reduce((sum, r) => sum + r.costUSD, 0) < totals.max ? (
                  <span className="text-green-600 text-xs">✓ Under estimate</span>
                ) : results.reduce((sum, r) => sum + r.costUSD, 0) > totals.max ? (
                  <span className="text-red-600 text-xs">⚠ Over estimate</span>
                ) : (
                  <span className="text-blue-600 text-xs">= Exact match</span>
                )}
              </div>
            </div>
          </div>
          
          {/* Budget Tracking Table */}
          <div className="mt-4 pt-4 border-t">
            <div className="text-sm font-medium mb-3">Budget Tracking</div>
            <div className="overflow-auto">
              <table className="w-full text-sm border-collapse border">
                <thead className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                  <tr>
                    <th className="py-2 px-3 text-left border">Metric</th>
                    <th className="py-2 px-3 text-right border">Amount ($)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 px-3 border">Total Credits</td>
                    <td className="py-2 px-3 text-right font-semibold border">${totalBudget.toFixed(2)}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3 border">Cost Estimated (This Run)</td>
                    <td className="py-2 px-3 text-right border">${totals.max.toFixed(4)}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3 border">Cost Incurred (This Run)</td>
                    <td className="py-2 px-3 text-right text-emerald-600 font-semibold border">${results.reduce((sum, r) => sum + r.costUSD, 0).toFixed(4)}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3 border">Total Spent (All Runs)</td>
                    <td className="py-2 px-3 text-right text-orange-600 font-semibold border">${totalSpent.toFixed(4)}</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="py-2 px-3 font-semibold border">Balance Remaining</td>
                    <td className={`py-2 px-3 text-right font-bold border ${(totalBudget - totalSpent) < 5 ? 'text-red-600' : 'text-green-600'}`}>
                      ${(totalBudget - totalSpent).toFixed(4)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-2 text-xs text-slate-600">
              Note: Real calculation is based on actual cost incurred by all selected models. Budget can be adjusted in settings.
            </div>
            
            {/* Business Statement */}
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm font-medium text-blue-900 mb-2">💼 Business Forecast</div>
              <div className="text-xs text-blue-800">
                {(() => {
                  const balance = totalBudget - totalSpent;
                  const avgCostPerRun = results.length > 0 ? results.reduce((sum, r) => sum + r.costUSD, 0) / results.length : 0;
                  const allEnginesCost = selectedEngines.reduce((sum, e) => {
                    const p = previews.find(pp => pp.e.id === e.id);
                    return sum + (p?.maxSpend || 0);
                  }, 0);
                  
                  if (avgCostPerRun > 0) {
                    const promptsWithAllEngines = allEnginesCost > 0 ? Math.floor(balance / allEnginesCost) : 0;
                    const promptsWithSingleEngine = Math.floor(balance / avgCostPerRun);
                    
                    return (
                      <div>
                        <div className="mb-1">
                          <strong>With the remaining balance (${balance.toFixed(2)}), you can run:</strong>
                        </div>
                        <div className="ml-4">
                          • <strong>{promptsWithAllEngines}</strong> more prompts with all selected engines (${allEnginesCost.toFixed(4)} each)
                        </div>
                        <div className="ml-4">
                          • <strong>{promptsWithSingleEngine}</strong> more prompts with a single engine (${avgCostPerRun.toFixed(4)} each on average)
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div>
                        <strong>With the remaining balance (${balance.toFixed(2)}), you have full budget available for future prompts.</strong>
                      </div>
                    );
                  }
                })()}
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="mt-3 flex gap-3">
              <button
                onClick={async () => {
                  const { copyAllToClipboard } = await import('./lib/export-utils');
                  const exportData: ExportData[] = selectedEngines.map(e => {
                    const r = results.find(rr => rr.engineId === e.id);
                    const streamingState = streamingStates[e.id];
                    const content = streamingState?.content || r?.responsePreview || "(No response)";
                    
                    return {
                      title: `${e.name} Response`,
                      provider: e.provider,
                      model: e.selectedVersion,
                      prompt: prompt,
                      response: content,
                      timestamp: new Date(),
                      tokensUsed: r?.tokensOut,
                      cost: (r as any)?.cost
                    };
                  });
                  
                  try {
                    await copyAllToClipboard(exportData);
                    alert('✅ All responses copied with beautiful formatting!');
                  } catch (error) {
                    alert('❌ Copy failed. Please try again.');
                    console.error('Copy error:', error);
                  }
                }}
                className="px-6 py-2.5 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90 shadow-md"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}
                title="Copy all responses with beautiful formatting"
              >
                📋 Copy All
              </button>
              
              <button
                onClick={() => setShowCombinedResponse(!showCombinedResponse)}
                className="px-6 py-2.5 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90"
                style={{ backgroundColor: '#7c3aed' }}
                title="View all responses in a single page"
              >
                Collective response {showCombinedResponse ? '▲' : '▼'}
              </button>
              
              <button
                onClick={async () => {
                  // Helper function to capture chart images (canvas + SVG)
                  const captureChartImages = async (engineId: string): Promise<string[]> => {
                    const chartImages: string[] = [];
                    try {
                      const engineContainer = document.querySelector(`[data-engine-id="${engineId}"]`);
                      if (engineContainer) {
                        // Capture canvas elements (ECharts, Chart.js)
                        const canvases = engineContainer.querySelectorAll('canvas');
                        for (const canvas of canvases) {
                          try {
                            const dataUrl = (canvas as HTMLCanvasElement).toDataURL('image/png');
                            if (dataUrl && dataUrl !== 'data:,') {
                              chartImages.push(dataUrl);
                              console.log('Captured canvas chart for Word export');
                            }
                          } catch (e) {
                            console.error('Failed to capture canvas chart:', e);
                          }
                        }
                        
                        // Capture SVG elements (Mermaid charts)
                        const svgs = engineContainer.querySelectorAll('.mermaid-chart-content svg, .mermaid svg, svg[id^="mermaid"]');
                        for (const svg of svgs) {
                          try {
                            const svgElement = svg as SVGSVGElement;
                            const svgData = new XMLSerializer().serializeToString(svgElement);
                            const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
                            const url = URL.createObjectURL(svgBlob);
                            
                            // Convert SVG to PNG using canvas
                            const img = new Image();
                            await new Promise<void>((resolve, reject) => {
                              img.onload = () => {
                                const canvas = document.createElement('canvas');
                                canvas.width = svgElement.clientWidth || 800;
                                canvas.height = svgElement.clientHeight || 400;
                                const ctx = canvas.getContext('2d');
                                if (ctx) {
                                  ctx.fillStyle = 'white';
                                  ctx.fillRect(0, 0, canvas.width, canvas.height);
                                  ctx.drawImage(img, 0, 0);
                                  const dataUrl = canvas.toDataURL('image/png');
                                  if (dataUrl && dataUrl !== 'data:,') {
                                    chartImages.push(dataUrl);
                                    console.log('Captured SVG/Mermaid chart for Word export');
                                  }
                                }
                                URL.revokeObjectURL(url);
                                resolve();
                              };
                              img.onerror = () => {
                                URL.revokeObjectURL(url);
                                reject(new Error('Failed to load SVG'));
                              };
                              img.src = url;
                            });
                          } catch (e) {
                            console.error('Failed to capture SVG chart:', e);
                          }
                        }
                      }
                      console.log(`Word Export - Engine ${engineId}: Found ${chartImages.length} charts`);
                    } catch (e) {
                      console.error('Error capturing charts:', e);
                    }
                    return chartImages;
                  };
                  
                  const exportData: ExportData[] = await Promise.all(
                    selectedEngines.map(async (e) => {
                      const r = results.find(rr => rr.engineId === e.id);
                      const streamingState = streamingStates[e.id];
                      const content = streamingState?.content || r?.responsePreview || "(No response)";
                      const chartImages = await captureChartImages(e.id);
                      
                      return {
                        title: `${e.name} Response`,
                        provider: e.provider,
                        model: e.selectedVersion,
                        prompt: prompt,
                        response: content,
                        timestamp: new Date(),
                        tokensUsed: r?.tokensOut,
                        cost: r?.costUSD,
                        chartImages
                      };
                    })
                  );
                  
                  try {
                    await exportAllToWord(exportData);
                    alert('✅ All responses exported to Word!');
                  } catch (error) {
                    alert('❌ Export failed. Please try again.');
                    console.error('Export error:', error);
                  }
                }}
                className="px-6 py-2.5 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90"
                style={{ backgroundColor: '#059669' }}
                title="Export all responses to Word document"
              >
                📥 Export All to Word
              </button>
              
              <button
                onClick={async () => {
                  // Helper function to capture chart images (canvas + SVG)
                  const captureChartImages = async (engineId: string): Promise<string[]> => {
                    const chartImages: string[] = [];
                    try {
                      const engineContainer = document.querySelector(`[data-engine-id="${engineId}"]`);
                      if (engineContainer) {
                        // Capture canvas elements (ECharts, Chart.js)
                        const canvases = engineContainer.querySelectorAll('canvas');
                        for (const canvas of canvases) {
                          try {
                            const dataUrl = (canvas as HTMLCanvasElement).toDataURL('image/png');
                            if (dataUrl && dataUrl !== 'data:,') {
                              chartImages.push(dataUrl);
                              console.log('Captured canvas chart for PDF export');
                            }
                          } catch (e) {
                            console.error('Failed to capture canvas chart:', e);
                          }
                        }
                        
                        // Capture SVG elements (Mermaid charts)
                        const svgs = engineContainer.querySelectorAll('.mermaid-chart-content svg, .mermaid svg, svg[id^="mermaid"]');
                        for (const svg of svgs) {
                          try {
                            const svgElement = svg as SVGSVGElement;
                            const svgData = new XMLSerializer().serializeToString(svgElement);
                            const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
                            const url = URL.createObjectURL(svgBlob);
                            
                            // Convert SVG to PNG using canvas
                            const img = new Image();
                            await new Promise<void>((resolve, reject) => {
                              img.onload = () => {
                                const canvas = document.createElement('canvas');
                                canvas.width = svgElement.clientWidth || 800;
                                canvas.height = svgElement.clientHeight || 400;
                                const ctx = canvas.getContext('2d');
                                if (ctx) {
                                  ctx.fillStyle = 'white';
                                  ctx.fillRect(0, 0, canvas.width, canvas.height);
                                  ctx.drawImage(img, 0, 0);
                                  const dataUrl = canvas.toDataURL('image/png');
                                  if (dataUrl && dataUrl !== 'data:,') {
                                    chartImages.push(dataUrl);
                                    console.log('Captured SVG/Mermaid chart for PDF export');
                                  }
                                }
                                URL.revokeObjectURL(url);
                                resolve();
                              };
                              img.onerror = () => {
                                URL.revokeObjectURL(url);
                                reject(new Error('Failed to load SVG'));
                              };
                              img.src = url;
                            });
                          } catch (e) {
                            console.error('Failed to capture SVG chart:', e);
                          }
                        }
                      }
                      console.log(`PDF Export - Engine ${engineId}: Found ${chartImages.length} charts`);
                    } catch (e) {
                      console.error('Error capturing charts:', e);
                    }
                    return chartImages;
                  };
                  
                  const exportData: ExportData[] = await Promise.all(
                    selectedEngines.map(async (e) => {
                      const r = results.find(rr => rr.engineId === e.id);
                      const streamingState = streamingStates[e.id];
                      const content = streamingState?.content || r?.responsePreview || "(No response)";
                      const chartImages = await captureChartImages(e.id);
                      
                      return {
                        title: `${e.name} Response`,
                        provider: e.provider,
                        model: e.selectedVersion,
                        prompt: prompt,
                        response: content,
                        timestamp: new Date(),
                        tokensUsed: r?.tokensOut,
                        cost: (r as any)?.cost,
                        chartImages
                      };
                    })
                  );
                  
                  try {
                    await exportAllToPDF(exportData);
                    alert('✅ All responses exported to PDF!');
                  } catch (error) {
                    alert('❌ PDF export failed. Please try again.');
                    console.error('PDF Export error:', error);
                  }
                }}
                className="px-6 py-2.5 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90"
                style={{ backgroundColor: '#dc2626' }}
                title="Export all responses to PDF document"
              >
                📄 Export All to PDF
              </button>
              
              <button
                onClick={async () => {
                  const { copyAllToClipboard } = await import('./lib/export-utils');
                  const exportData: ExportData[] = selectedEngines.map(e => {
                    const r = results.find(rr => rr.engineId === e.id);
                    const streamingState = streamingStates[e.id];
                    const content = streamingState?.content || r?.responsePreview || "(No response)";
                    
                    return {
                      title: `${e.name} Response`,
                      provider: e.provider,
                      model: e.selectedVersion,
                      prompt: prompt,
                      response: content,
                      timestamp: new Date(),
                      tokensUsed: r?.tokensOut,
                      cost: (r as any)?.cost
                    };
                  });
                  
                  try {
                    await copyAllToClipboard(exportData);
                    alert('✅ All responses copied to clipboard!');
                  } catch (error) {
                    alert('❌ Copy failed. Please try again.');
                    console.error('Copy error:', error);
                  }
                }}
                className="px-6 py-2.5 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90"
                style={{ backgroundColor: '#059669' }}
                title="Copy all responses with beautiful formatting"
              >
                📋 Copy All
              </button>
              
              <button
                disabled
                className="px-6 py-2.5 rounded-lg text-sm font-medium bg-gray-300 text-gray-500 cursor-not-allowed opacity-60"
                title="Coming soon - AI will select the best response"
              >
                🏆 Give me best response
              </button>
            </div>
            
            {/* Combined Response Dropdown */}
            {showCombinedResponse && (
              <div className="mt-4 p-6 bg-white border-2 border-purple-200 rounded-xl shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-purple-700">Combined AI Responses</h3>
                  <button
                    onClick={() => setShowCombinedResponse(false)}
                    className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                    title="Close"
                  >
                    ×
                  </button>
                </div>
                <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                  {selectedEngines.map((e, index) => {
                    const r = results.find(rr => rr.engineId === e.id);
                    const streamingState = streamingStates[e.id];
                    const content = streamingState?.content || r?.responsePreview || "(No response)";
                    const totalResponses = selectedEngines.length;
                    const responseNumber = index + 1;
                    
                    return (
                      <div key={e.id} className="mb-8" data-engine-id={e.id}>
                        <div className="flex items-center gap-3 mb-3 pb-2 border-b-2 border-purple-200">
                          <span className={`px-3 py-1 rounded-lg text-white font-medium ${providerStyles[e.provider] || 'bg-slate-700'}`}>
                            {e.name}
                          </span>
                          <span className="text-sm text-gray-600">({e.selectedVersion})</span>
                          <span className="ml-auto text-base font-semibold text-purple-600">{responseNumber}/{totalResponses} Engine response</span>
                          <ExportDropdown
                            data={{
                              title: `${e.name} Response`,
                              provider: e.provider,
                              model: e.selectedVersion,
                              prompt: prompt,
                              response: content,
                              timestamp: new Date(),
                              tokensUsed: r?.tokensOut,
                              cost: r?.costUSD,
                            }}
                          />
                        </div>
                        <div className="prose prose-sm max-w-none">
                          <EnhancedMarkdownRenderer content={content} />
                        </div>
                        {index < selectedEngines.length - 1 && (
                          <hr className="my-6 border-t-2 border-dashed border-purple-200" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          </div>
          </details>
        </div>
      )}

      {/* Sticky bottom action bar (mobile) */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-300 p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[12px]">
          <label className="flex items-center gap-1"><input type="checkbox" checked={showBusiness} onChange={() => setShowBusiness(v => !v)} /><span>Business</span></label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={showTech} onChange={() => setShowTech(v => !v)} /><span>Tech</span></label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={liveMode} onChange={() => setLiveMode(v => !v)} /><span>Live</span></label>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={storyMode} onChange={() => {
              setStoryMode(v => !v);
              if (!storyMode) setStoryStep(1);
            }} />
            <span>Story</span>
          </label>
        </div>
        <button onClick={runAll} disabled={isRunning || selectedEngines.length===0 || !prompt.trim()} className="px-4 py-2 rounded-xl bg-[#0B1F3B] text-white text-sm disabled:opacity-50">
          {isRunning ? "Running..." : (liveMode ? "Run (Live)" : "Run (Mock)")}
        </button>
      </div>
      </>
      )}
      
      {/* Multi-Error Display System */}
      {errorQueue.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2 max-w-xs">
          {errorQueue.map((errorItem, index) => (
            <div
              key={errorItem.id}
              className="bg-white rounded-lg shadow-xl border-l-4 border-red-500 p-2.5 animate-slide-in-right"
              style={{
                animation: `slideInRight 0.3s ease-out ${index * 0.1}s both`,
              }}
            >
              {/* Error Header */}
              <div className="flex items-start justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <div className="w-7 h-7 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-xs">{errorItem.engine.name}</h4>
                    <p className="text-[10px] text-gray-500">{errorItem.engine.provider}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setErrorQueue(prev => prev.filter(e => e.id !== errorItem.id));
                    if (errorQueue.length === 1) {
                      setCurrentError(null);
                      setLastFailedRequest(null);
                    }
                  }}
                  className="text-gray-400 hover:text-gray-600 transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Error Details */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 bg-red-100 text-red-800 text-[10px] font-semibold rounded">
                    {errorItem.error.statusCode || 'Error'}
                  </span>
                  <span className="text-[10px] text-gray-500">
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                
                <p className="text-[11px] text-gray-700 line-clamp-1">
                  {errorItem.error.message}
                </p>

                {/* Action Buttons */}
                <div className="flex gap-1.5 mt-1.5">
                  <button
                    onClick={() => {
                      setLastFailedRequest({
                        engine: errorItem.engine,
                        prompt: errorItem.prompt,
                        outCap: errorItem.outCap
                      });
                      setCurrentError(errorItem.error);
                      handleRetry();
                      setErrorQueue(prev => prev.filter(e => e.id !== errorItem.id));
                    }}
                    className="flex-1 px-2 py-1 bg-blue-600 text-white text-[10px] font-medium rounded hover:bg-blue-700 transition"
                  >
                    Retry
                  </button>
                  <button
                    onClick={() => {
                      setCurrentError(errorItem.error);
                      setLastFailedRequest({
                        engine: errorItem.engine,
                        prompt: errorItem.prompt,
                        outCap: errorItem.outCap
                      });
                      setShowErrorDetails(true);
                    }}
                    className="flex-1 px-2 py-1 bg-gray-100 text-gray-700 text-[10px] font-medium rounded hover:bg-gray-200 transition"
                  >
                    Details
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {/* Clear All Button */}
          {errorQueue.length > 1 && (
            <button
              onClick={() => {
                setErrorQueue([]);
                setCurrentError(null);
                setLastFailedRequest(null);
              }}
              className="w-full px-3 py-1.5 bg-gray-800 text-white text-[11px] font-medium rounded-lg hover:bg-gray-900 transition"
            >
              Clear All ({errorQueue.length})
            </button>
          )}
        </div>
      )}

      {/* Error Recovery Panel - Detailed View */}
      {showErrorDetails && currentError && (
        <ErrorRecoveryPanel 
          error={currentError} 
          onDismiss={() => {
            setShowErrorDetails(false);
            setCurrentError(null);
            setLastFailedRequest(null);
          }}
          onRetry={lastFailedRequest ? handleRetry : undefined}
        />
      )}

      {/* Engine Recommendations Sidebar */}
      {showEngineRecommendations && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setShowEngineRecommendations(false)}
          />
          
          {/* Sidebar */}
          <div className="fixed right-0 top-0 bottom-0 w-full sm:w-96 bg-white shadow-2xl z-50 overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Engine Recommendations</h3>
                  <p className="text-sm text-gray-500 mt-1">Let OneMindAI choose the best engines for you</p>
                </div>
                <button
                  onClick={() => setShowEngineRecommendations(false)}
                  className="text-gray-400 hover:text-gray-600 transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* OneMindAI Recommended Option */}
              <div className="space-y-4">
                <button
                  onClick={() => {
                    // Select first 5 engines
                    const firstFiveEngines = engines.slice(0, 5);
                    const newSelected: Record<string, boolean> = {};
                    
                    // Deselect all first
                    engines.forEach(e => {
                      newSelected[e.id] = false;
                    });
                    
                    // Select first 5
                    firstFiveEngines.forEach(e => {
                      newSelected[e.id] = true;
                    });
                    
                    setSelected(newSelected);
                    setShowEngineRecommendations(false);
                    
                    // Show success message
                    setTimeout(() => {
                      alert('OneMindAI Recommended engines selected!\n\n' + 
                            firstFiveEngines.map(e => `• ${e.name}`).join('\n'));
                    }, 300);
                  }}
                  className="w-full p-6 bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-600 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02] border-2 border-purple-400"
                >
                  <div className="flex items-start gap-4">
                    <div className="text-left flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-lg font-bold">OneMindAI Recommended</h4>
                        <span className="px-2 py-0.5 bg-yellow-400 text-yellow-900 text-xs font-bold rounded-full">BEST</span>
                      </div>
                      <p className="text-sm text-white/90 mb-3">
                        Our AI-powered selection of the top 5 engines for balanced, high-quality responses
                      </p>
                      <div className="space-y-1">
                        {engines.slice(0, 5).map((engine, idx) => (
                          <div key={engine.id} className="flex items-center gap-2 text-xs text-white/80">
                            <span className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-white font-bold">
                              {idx + 1}
                            </span>
                            <span>{engine.name}</span>
                            <span className="text-white/60">({engine.provider})</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 pt-4 border-t border-white/20 flex items-center justify-between text-xs">
                        <span className="text-white/80">Estimated response time:</span>
                        <span className="font-bold">~15-30 seconds</span>
                      </div>
                    </div>
                  </div>
                </button>

                {/* Additional Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="text-sm">
                    <p className="font-semibold text-blue-900 mb-1">Why these engines?</p>
                    <p className="text-blue-700 text-xs leading-relaxed">
                      Our recommendation balances speed, quality, and diversity. These 5 engines provide 
                      complementary perspectives while maintaining fast response times.
                    </p>
                  </div>
                </div>

                {/* Manual Selection Option */}
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600 mb-3">Or choose your own combination:</p>
                  <button
                    onClick={() => setShowEngineRecommendations(false)}
                    className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium text-sm"
                  >
                    ← Back to manual selection
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
      
      {/* Super Debug Panel */}
      <SuperDebugPanel 
        isOpen={superDebugMode}
        onClose={() => setSuperDebugMode(false)}
        onOpenFullDebug={() => setConsoleVisible(true)}
      />
      
      {/* Balance Manager Modal */}
      <BalanceManager 
        isOpen={showBalanceManager}
        onClose={() => setShowBalanceManager(false)}
      />
    </div>
  );
}
