/**
 * OneMindAI Utility Functions
 * 
 * Helper functions for token estimation, cost calculation, and formatting.
 */

import { Engine, Tokenizer, EstimatedCost, CostBreakdown } from './types';
import { BASE_PRICING } from './constants';

// =============================================================================
// TOKEN ESTIMATION
// =============================================================================

/**
 * Estimate token count based on text and tokenizer type
 */
export function estimateTokens(text: string, tokenizer: Tokenizer): number {
  const t = text || '';
  const words = (t.match(/\S+/g) || []).length;
  const chars = t.length;
  
  switch (tokenizer) {
    case 'tiktoken':
      return Math.max(1, Math.floor(0.75 * words + 0.002 * chars));
    case 'sentencepiece':
      return Math.max(1, Math.floor(0.95 * words + 0.003 * chars));
    default: // bytebpe
      return Math.max(1, Math.floor(0.6 * words + 0.004 * chars));
  }
}

/**
 * Compute output token cap based on engine and input tokens
 */
// Provider-specific max output token limits (API constraints)
const PROVIDER_MAX_OUTPUT: Record<string, number> = {
  openai: 16384,
  anthropic: 8192,
  gemini: 8192,
  deepseek: 8192,
  mistral: 32768,
  perplexity: 4096,
  kimi: 8192,
  xai: 16384,
  groq: 8192,
  huggingface: 4096,
  sarvam: 4096,
  falcon: 4096,
  generic: 4096,
};

export function computeOutCap(engine: Engine, inputTokens: number): number {
  if (engine.outPolicy?.mode === 'fixed' && engine.outPolicy.fixedTokens) {
    return engine.outPolicy.fixedTokens;
  }
  
  // Get provider-specific max output limit
  const providerMax = PROVIDER_MAX_OUTPUT[engine.provider] || 4096;
  
  // Calculate available context space
  const availableTokens = Math.max(0, engine.contextLimit - inputTokens);
  
  // Use the smaller of: provider max limit OR 90% of available context
  return Math.min(providerMax, Math.floor(availableTokens * 0.9));
}

// =============================================================================
// COST CALCULATION
// =============================================================================

/**
 * Calculate estimated cost for selected engines
 */
export function calculateEstimatedCost(
  engines: Engine[],
  selected: Record<string, boolean>,
  promptTokens: number,
  expectedOutputTokens: number = 1000
): EstimatedCost {
  const breakdown: CostBreakdown[] = [];
  let totalCost = 0;

  for (const engine of engines) {
    if (!selected[engine.id]) continue;

    const providerPricing = BASE_PRICING[engine.provider];
    if (!providerPricing) continue;

    const versionPricing = providerPricing[engine.selectedVersion];
    if (!versionPricing) continue;

    // Cost per 1M tokens
    const inCost = (promptTokens / 1_000_000) * versionPricing.in;
    const outCost = (expectedOutputTokens / 1_000_000) * versionPricing.out;
    const cost = inCost + outCost;

    breakdown.push({
      engine: engine.name,
      cost,
      inCost,
      outCost,
    });

    totalCost += cost;
  }

  return { totalCost, breakdown };
}

/**
 * Get pricing for a specific engine version
 */
export function getEnginePricing(
  provider: string,
  version: string
): { in: number; out: number; note: string } | null {
  const providerPricing = BASE_PRICING[provider];
  if (!providerPricing) return null;
  return providerPricing[version] || null;
}

// =============================================================================
// TIME & LABEL FORMATTING
// =============================================================================

/**
 * Generate human-readable time estimate
 */
export function timeLabel(inTok: number, outTok: number): string {
  const seconds = Math.max(3, Math.round(((inTok + outTok) / 1000) * 3 + 2));
  
  if (seconds < 20) return 'a few seconds';
  if (seconds < 90) return `${seconds}s`;
  
  const lo = Math.max(1, Math.round(seconds / 90));
  const hi = Math.max(lo, Math.round(seconds / 60));
  return `${lo}–${hi} min`;
}

/**
 * Generate outcome label based on output cap
 */
export function outcomeLabel(outCap: number): string {
  if (outCap <= 800) return 'Quick summary';
  if (outCap <= 2000) return 'Short brief with bullets';
  if (outCap <= 4000) return 'Concise report';
  return 'Detailed report';
}

// =============================================================================
// RANDOM & SLEEP UTILITIES
// =============================================================================

/**
 * Generate random number in range
 */
export function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// =============================================================================
// ENCODING UTILITIES
// =============================================================================

/**
 * Unicode-safe base64 encoding
 */
export function encryptKey(key: string): string {
  try {
    return btoa(
      encodeURIComponent(key).replace(/%([0-9A-F]{2})/g, (_match, p1) => {
        return String.fromCharCode(parseInt(p1, 16));
      })
    );
  } catch {
    return btoa(key);
  }
}

/**
 * Unicode-safe base64 decoding
 */
export function decryptKey(encrypted: string): string {
  try {
    const decoded = atob(encrypted);
    return decodeURIComponent(
      decoded
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
  } catch {
    return encrypted;
  }
}

/**
 * Unicode-safe btoa for SVG and special characters
 */
export function unicodeBtoa(str: string): string {
  try {
    // Remove emojis and other problematic Unicode characters
    const cleanStr = str.replace(/[\u{1F300}-\u{1F9FF}]/gu, '');
    return btoa(unescape(encodeURIComponent(cleanStr)));
  } catch (e) {
    console.error('btoa encoding error:', e);
    return encodeURIComponent(str);
  }
}

// =============================================================================
// PROMPT VALIDATION
// =============================================================================

/**
 * Validate prompt length and return warning if needed
 */
export function validatePrompt(
  prompt: string,
  softLimit: number,
  hardLimit: number
): { valid: boolean; warning: string | null } {
  if (prompt.length > hardLimit) {
    return {
      valid: false,
      warning: `Prompt exceeds maximum length of ${hardLimit} characters. Please shorten your prompt.`,
    };
  }
  
  if (prompt.length > softLimit) {
    return {
      valid: true,
      warning: `Prompt is getting long (${prompt.length}/${hardLimit} chars). Consider shortening for better results.`,
    };
  }
  
  return { valid: true, warning: null };
}

/**
 * Truncate prompt if too long
 */
export function truncatePrompt(prompt: string, maxLength: number): string {
  if (prompt.length <= maxLength) return prompt;
  
  return (
    prompt.substring(0, maxLength) +
    '\n\n[Note: Your prompt was truncated because it exceeded the maximum length. Please provide a shorter, more focused question for better results.]'
  );
}

// =============================================================================
// FORMAT UTILITIES
// =============================================================================

/**
 * Format cost as USD string
 */
export function formatCost(cost: number): string {
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  if (cost < 1) return `$${cost.toFixed(3)}`;
  return `$${cost.toFixed(2)}`;
}

/**
 * Format token count with commas
 */
export function formatTokens(tokens: number): string {
  return tokens.toLocaleString();
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
