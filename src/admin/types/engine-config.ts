// =============================================================================
// Engine Configuration Schema
// =============================================================================

export interface EngineConfig {
  engines: Engine[];
  modelHealth: Record<string, Record<string, ModelHealthStatus>>;
  disabledEngines: string[];
  globalSettings: GlobalEngineSettings;
}

export interface Engine {
  id: string;
  name: string;
  provider: string;
  tokenizer: string;
  contextLimit: number;
  versions: string[];
  selectedVersion: string;
  outPolicy: { mode: string };
  apiKey: string;
  endpoint?: string;
  isEnabled: boolean;
  isWorking: boolean;
  lastChecked?: number;
}

export interface ModelHealthStatus {
  isWorking: boolean;
  lastChecked: number;
  responseTime?: number;
  error?: string;
}

export interface GlobalEngineSettings {
  healthCheckInterval: number; // minutes
  autoRetryFailedModels: boolean;
  maxRetries: number;
  testMessage: string;
}

// Available models from providers
export const AVAILABLE_MODELS = {
  anthropic: [
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    'claude-3-haiku-20240307',
  ],
  openai: [
    'gpt-5-2025-08-07',
    'gpt-4.1',
    'gpt-4o',
    'gpt-4o-2024-11-20',
    'gpt-4o-2024-08-06',
    'gpt-4o-2024-05-13',
    'gpt-4.1-mini',
    'gpt-4o-mini',
    'o4-mini',
    'o4-mini-high',
  ],
  gemini: [
    'gemini-2.0-flash-exp',
    'gemini-2.0-flash-lite',
    'gemini-2.5-flash-lite',
  ],
  deepseek: [
    'deepseek-chat',
    'deepseek-coder',
  ],
  mistral: [
    'mistral-large-latest',
    'mistral-large-2',
    'mistral-medium-2312',
    'mistral-small',
    'mistral-7b',
  ],
  perplexity: [
    'sonar-pro',
    'sonar-small',
  ],
  groq: [
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
    'mixtral-8x7b-32768',
    'gemma2-9b-it',
  ],
  xai: [
    'grok-2',
    'grok-beta',
  ],
  kimi: [
    'moonshot-v1-8k',
    'moonshot-v1-32k',
    'moonshot-v1-128k',
  ],
};

export const DEFAULT_ENGINE_CONFIG: EngineConfig = {
  engines: [
    {
      id: "openai",
      name: "ChatGPT",
      provider: "openai",
      tokenizer: "tiktoken",
      contextLimit: 128_000,
      versions: ["gpt-5-2025-08-07", "gpt-4.1", "gpt-4o", "gpt-4o-2024-11-20", "gpt-4.1-mini", "gpt-4o-mini", "o4-mini", "o4-mini-high"],
      selectedVersion: "gpt-5-2025-08-07",
      outPolicy: { mode: "auto" },
      apiKey: "",
      isEnabled: true,
      isWorking: true,
      lastChecked: Date.now(),
    },
    {
      id: "claude",
      name: "Claude",
      provider: "anthropic",
      tokenizer: "sentencepiece",
      contextLimit: 200_000,
      versions: ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-3-haiku-20240307"],
      selectedVersion: "claude-3-5-sonnet-20241022",
      outPolicy: { mode: "auto" },
      apiKey: "",
      isEnabled: true,
      isWorking: true,
      lastChecked: Date.now(),
    },
    {
      id: "gemini",
      name: "Gemini",
      provider: "gemini",
      tokenizer: "sentencepiece",
      contextLimit: 1_000_000,
      versions: ["gemini-2.0-flash-exp", "gemini-2.0-flash-lite", "gemini-2.5-flash-lite"],
      selectedVersion: "gemini-2.5-flash-lite",
      outPolicy: { mode: "auto" },
      apiKey: "",
      isEnabled: true,
      isWorking: true,
      lastChecked: Date.now(),
    },
    {
      id: "deepseek",
      name: "DeepSeek",
      provider: "deepseek",
      tokenizer: "tiktoken",
      contextLimit: 128_000,
      versions: ["deepseek-chat", "deepseek-coder", "deepseek-reasoner"],
      selectedVersion: "deepseek-chat",
      outPolicy: { mode: "auto" },
      apiKey: "",
      isEnabled: true,
      isWorking: true,
      lastChecked: Date.now(),
    },
    {
      id: "mistral",
      name: "Mistral",
      provider: "mistral",
      tokenizer: "bytebpe",
      contextLimit: 64_000,
      versions: ["mistral-large-latest", "mistral-large-2", "mistral-medium-2312", "mistral-small", "mistral-7b"],
      selectedVersion: "mistral-large-latest",
      outPolicy: { mode: "auto" },
      apiKey: "",
      isEnabled: true,
      isWorking: true,
      lastChecked: Date.now(),
    },
    {
      id: "perplexity",
      name: "Perplexity",
      provider: "perplexity",
      tokenizer: "tiktoken",
      contextLimit: 32_000,
      versions: ["sonar-pro", "sonar-small"],
      selectedVersion: "sonar-pro",
      outPolicy: { mode: "auto" },
      apiKey: "",
      isEnabled: true,
      isWorking: true,
      lastChecked: Date.now(),
    },
    {
      id: "groq",
      name: "Groq",
      provider: "groq",
      tokenizer: "tiktoken",
      contextLimit: 128_000,
      versions: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768", "gemma2-9b-it"],
      selectedVersion: "llama-3.3-70b-versatile",
      outPolicy: { mode: "auto" },
      apiKey: "",
      isEnabled: true,
      isWorking: true,
      lastChecked: Date.now(),
    },
    {
      id: "xai",
      name: "xAI (Grok)",
      provider: "xai",
      tokenizer: "tiktoken",
      contextLimit: 128_000,
      versions: ["grok-2", "grok-beta"],
      selectedVersion: "grok-beta",
      outPolicy: { mode: "auto" },
      apiKey: "",
      isEnabled: true,
      isWorking: true,
      lastChecked: Date.now(),
    },
    {
      id: "kimi",
      name: "Kimi (Moonshot)",
      provider: "kimi",
      tokenizer: "tiktoken",
      contextLimit: 128_000,
      versions: ["moonshot-v1-8k", "moonshot-v1-32k", "moonshot-v1-128k"],
      selectedVersion: "moonshot-v1-128k",
      outPolicy: { mode: "auto" },
      apiKey: "",
      isEnabled: true,
      isWorking: true,
      lastChecked: Date.now(),
    },
  ],
  modelHealth: {
    openai: {
      "gpt-5-2025-08-07": { isWorking: true, lastChecked: Date.now(), responseTime: 245 },
      "gpt-4.1": { isWorking: true, lastChecked: Date.now(), responseTime: 189 },
      "gpt-4o": { isWorking: true, lastChecked: Date.now(), responseTime: 156 },
      "gpt-4o-2024-11-20": { isWorking: true, lastChecked: Date.now(), responseTime: 167 },
    },
    claude: {
      "claude-3.5-sonnet": { isWorking: true, lastChecked: Date.now(), responseTime: 234 },
      "claude-3-5-sonnet-20241022": { isWorking: true, lastChecked: Date.now(), responseTime: 223 },
      "claude-3-5-haiku-20241022-v1:0": { isWorking: true, lastChecked: Date.now(), responseTime: 145 },
      "claude-3-5-haiku-latest": { isWorking: true, lastChecked: Date.now(), responseTime: 138 },
    },
    gemini: {
      "gemini-2.0-flash-exp": { isWorking: true, lastChecked: Date.now(), responseTime: 198 },
      "gemini-2.0-flash-lite": { isWorking: true, lastChecked: Date.now(), responseTime: 167 },
      "gemini-2.5-flash-lite": { isWorking: true, lastChecked: Date.now(), responseTime: 155 },
    },
  },
  disabledEngines: [],
  globalSettings: {
    healthCheckInterval: 30,
    autoRetryFailedModels: true,
    maxRetries: 3,
    testMessage: "Hello, are you working?",
  },
};
