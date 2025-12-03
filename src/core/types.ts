/**
 * OneMindAI Core Types
 * 
 * All TypeScript interfaces and types used across the application.
 */

// =============================================================================
// ENGINE TYPES
// =============================================================================

export type AIProvider = 
  | 'openai' 
  | 'anthropic' 
  | 'gemini' 
  | 'deepseek' 
  | 'mistral' 
  | 'perplexity' 
  | 'kimi' 
  | 'xai' 
  | 'groq' 
  | 'falcon' 
  | 'huggingface' 
  | 'sarvam' 
  | 'generic';

export type Tokenizer = 'tiktoken' | 'sentencepiece' | 'bytebpe';

export interface OutputPolicy {
  mode: 'auto' | 'fixed';
  fixedTokens?: number;
}

export interface Engine {
  id: string;
  name: string;
  provider: AIProvider;
  tokenizer: Tokenizer;
  contextLimit: number;
  versions: string[];
  selectedVersion: string;
  apiKey?: string;
  endpoint?: string;
  outPolicy?: OutputPolicy;
}

// =============================================================================
// RESULT TYPES
// =============================================================================

export interface RunResult {
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

// =============================================================================
// STREAMING TYPES
// =============================================================================

export interface StreamingState {
  content: string;
  isStreaming: boolean;
}

export type StreamingStates = Record<string, StreamingState>;

// =============================================================================
// PRICING TYPES
// =============================================================================

export interface PricingTier {
  in: number;
  out: number;
  note: string;
}

export type ProviderPricing = Record<string, PricingTier>;
export type AllPricing = Record<string, ProviderPricing>;

export interface CostBreakdown {
  engine: string;
  cost: number;
  inCost: number;
  outCost: number;
}

export interface EstimatedCost {
  totalCost: number;
  breakdown: CostBreakdown[];
}

// =============================================================================
// ERROR TYPES
// =============================================================================

export interface ErrorQueueItem {
  id: string;
  error: Error & { status?: number; statusCode?: number };
  engine: Engine;
  prompt: string;
  outCap: number;
}

export interface FailedRequest {
  engine: Engine;
  prompt: string;
  outCap: number;
}

// =============================================================================
// BALANCE TYPES
// =============================================================================

export interface ApiBalanceState {
  balance: string;
  loading: boolean;
  error?: string;
}

export type ApiBalances = Record<string, ApiBalanceState>;

// =============================================================================
// ROLE TYPES
// =============================================================================

export interface RoleDetails {
  name: string;
  category: string;
}

// =============================================================================
// COMPONENT SELECTION TYPES
// =============================================================================

export interface SelectedComponent {
  id: string;
  engineName: string;
  content: string;
  type: string;
}

// =============================================================================
// PROMPT LIMITS
// =============================================================================

export interface PromptLimits {
  PROMPT_SOFT_LIMIT: number;
  PROMPT_HARD_LIMIT: number;
  PROMPT_CHUNK_SIZE: number;
}

export const DEFAULT_PROMPT_LIMITS: PromptLimits = {
  PROMPT_SOFT_LIMIT: 5000,
  PROMPT_HARD_LIMIT: 10000,
  PROMPT_CHUNK_SIZE: 4000,
};

// =============================================================================
// STORY MODE TYPES
// =============================================================================

export type StoryStep = 1 | 2 | 3 | 4 | 5;

// =============================================================================
// MOCK ERROR TYPES (for testing)
// =============================================================================

export type MockErrorMode = false | '429' | '500' | '503' | 'random';

export interface MockError {
  status: number;
  message: string;
}

export const MOCK_ERRORS: Record<string, MockError> = {
  '429': { 
    status: 429, 
    message: 'Rate limit exceeded. You are sending requests too quickly. Please retry after 30 seconds.' 
  },
  '500': { 
    status: 500, 
    message: 'Internal server error. The API is experiencing issues.' 
  },
  '503': { 
    status: 503, 
    message: 'Service temporarily unavailable. The API is overloaded.' 
  },
};
