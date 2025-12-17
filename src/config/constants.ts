// =============================================================================
// Technical Constants
// TRUE constants that should NEVER change - not admin-configurable
// Created: 2025-12-15 | Initials: HP | Layer: Frontend | Type: Service | I/O: Output
// =============================================================================

// =============================================================================
// INDUSTRY STANDARDS (Mathematical constants - never change)
// =============================================================================

/**
 * Industry-standard constants that are mathematical/universal truths.
 * These should NEVER be changed or made configurable.
 */
export const INDUSTRY_STANDARDS = {
  /** Standard divisor for per-million token pricing (1M = 1,000,000) */
  TOKENS_PER_MILLION: 1_000_000,
  
  /** Currency standard: cents per dollar (100 cents = $1) */
  CENTS_PER_DOLLAR: 100,
  
  /** Reserve ratio for context window safety margin (90%) */
  CONTEXT_RESERVE_RATIO: 0.9,
} as const;

// =============================================================================
// TOKENIZER CONFIGURATION
// Approximation constants for different tokenizer types
// These are empirically derived and should rarely change
// =============================================================================

/**
 * Tokenizer-specific configuration for token estimation.
 * Each tokenizer type has different character-to-token ratios.
 * 
 * - tiktoken: Used by OpenAI (GPT models), DeepSeek, Perplexity, Kimi, Groq
 * - sentencepiece: Used by Google (Gemini), Anthropic (Claude)
 * - bytebpe: Used by Mistral, xAI, Falcon, HuggingFace
 */
export const TOKENIZER_CONFIG = {
  /** OpenAI's tiktoken (GPT models, DeepSeek, Perplexity, Kimi, Groq) */
  tiktoken: {
    /** Characters per token ratio */
    charsPerToken: 0.75,
    /** Fine-tuning adjustment factor */
    adjustment: 0.002,
  },
  
  /** Google/Anthropic's SentencePiece (Gemini, Claude) */
  sentencepiece: {
    /** Characters per token ratio */
    charsPerToken: 0.95,
    /** Fine-tuning adjustment factor */
    adjustment: 0.003,
  },
  
  /** Byte-level BPE (Mistral, xAI, Falcon, HuggingFace) */
  bytebpe: {
    /** Characters per token ratio */
    charsPerToken: 0.6,
    /** Fine-tuning adjustment factor */
    adjustment: 0.004,
  },
} as const;

// =============================================================================
// TOKEN ESTIMATION HELPERS
// =============================================================================

/**
 * Estimate token count from character count based on tokenizer type.
 * 
 * @param charCount - Number of characters in the text
 * @param tokenizer - Tokenizer type ('tiktoken' | 'sentencepiece' | 'bytebpe')
 * @returns Estimated token count (rounded up)
 * 
 * @example
 * const tokens = estimateTokens(1000, 'tiktoken'); // ~750 tokens
 * const tokens = estimateTokens(1000, 'sentencepiece'); // ~950 tokens
 */
export function estimateTokens(
  charCount: number,
  tokenizer: TokenizerType = 'tiktoken'
): number {
  const config = TOKENIZER_CONFIG[tokenizer];
  const baseEstimate = charCount * config.charsPerToken;
  const adjusted = baseEstimate * (1 + config.adjustment);
  return Math.ceil(adjusted);
}

/**
 * Estimate character count from token count based on tokenizer type.
 * 
 * @param tokenCount - Number of tokens
 * @param tokenizer - Tokenizer type ('tiktoken' | 'sentencepiece' | 'bytebpe')
 * @returns Estimated character count (rounded up)
 * 
 * @example
 * const chars = estimateChars(750, 'tiktoken'); // ~1000 characters
 */
export function estimateChars(
  tokenCount: number,
  tokenizer: TokenizerType = 'tiktoken'
): number {
  const config = TOKENIZER_CONFIG[tokenizer];
  return Math.ceil(tokenCount / config.charsPerToken);
}

/**
 * Calculate cost in credits for a given token count.
 * 
 * @param inputTokens - Number of input tokens
 * @param outputTokens - Number of output tokens
 * @param inputPricePerMillion - Price per million input tokens (in credits)
 * @param outputPricePerMillion - Price per million output tokens (in credits)
 * @returns Total cost in credits
 * 
 * @example
 * const cost = calculateTokenCost(1000, 500, 2.50, 10.00);
 */
export function calculateTokenCost(
  inputTokens: number,
  outputTokens: number,
  inputPricePerMillion: number,
  outputPricePerMillion: number
): number {
  const inputCost = (inputTokens * inputPricePerMillion) / INDUSTRY_STANDARDS.TOKENS_PER_MILLION;
  const outputCost = (outputTokens * outputPricePerMillion) / INDUSTRY_STANDARDS.TOKENS_PER_MILLION;
  return inputCost + outputCost;
}

/**
 * Calculate safe context limit with reserve margin.
 * 
 * @param contextLimit - Maximum context window size
 * @returns Safe limit with 10% reserve for safety
 * 
 * @example
 * const safeLimit = getSafeContextLimit(128000); // 115200
 */
export function getSafeContextLimit(contextLimit: number): number {
  return Math.floor(contextLimit * INDUSTRY_STANDARDS.CONTEXT_RESERVE_RATIO);
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

/** Supported tokenizer types */
export type TokenizerType = keyof typeof TOKENIZER_CONFIG;

/** Industry standards type for type-safe access */
export type IndustryStandardsType = typeof INDUSTRY_STANDARDS;

/** Tokenizer config type for type-safe access */
export type TokenizerConfigType = typeof TOKENIZER_CONFIG;
