/**
 * OneMindAI Constants
 * 
 * All static configuration: API keys, engines registry, pricing.
 */

import { Engine, AllPricing } from './types';

// =============================================================================
// API KEYS (User should replace with their own)
// =============================================================================

// WARNING: These are placeholder keys. Users should add their own keys.
// In production, keys should come from environment variables via backend proxy.
export const DEFAULT_API_KEYS: Record<string, string> = {
  claude: '',
  kimi: '',
  deepseek: '',
  perplexity: '',
  gemini: '',
  mistral: '',
  groq: '',
  sarvam: '',
  chatgpt: '',
  xai: '',
  huggingface: '',
};

// =============================================================================
// ENGINES REGISTRY
// =============================================================================

export const SEEDED_ENGINES: Engine[] = [
  { 
    id: 'openai', 
    name: 'ChatGPT', 
    provider: 'openai', 
    tokenizer: 'tiktoken', 
    contextLimit: 128_000, 
    versions: ['gpt-4.1', 'gpt-4o', 'gpt-4o-2024-11-20', 'gpt-4o-2024-08-06', 'gpt-4o-2024-05-13', 'gpt-4.1-mini', 'gpt-4o-mini'], 
    selectedVersion: 'gpt-4.1', 
    outPolicy: { mode: 'auto' }, 
    apiKey: DEFAULT_API_KEYS.chatgpt 
  },
  { 
    id: 'claude', 
    name: 'Claude', 
    provider: 'anthropic', 
    tokenizer: 'sentencepiece', 
    contextLimit: 200_000, 
    versions: ['claude-3.5-sonnet', 'claude-3-5-sonnet-20241022', 'claude-3-haiku', 'claude-3-haiku-20240307'], 
    selectedVersion: 'claude-3-haiku-20240307', 
    outPolicy: { mode: 'auto' }, 
    apiKey: DEFAULT_API_KEYS.claude 
  },
  { 
    id: 'gemini', 
    name: 'Gemini', 
    provider: 'gemini', 
    tokenizer: 'sentencepiece', 
    contextLimit: 1_000_000, 
    versions: ['gemini-2.0-flash-exp', 'gemini-2.0-flash-lite', 'gemini-2.5-flash-lite'], 
    selectedVersion: 'gemini-2.5-flash-lite', 
    outPolicy: { mode: 'auto' }, 
    apiKey: DEFAULT_API_KEYS.gemini 
  },
  { 
    id: 'deepseek', 
    name: 'DeepSeek', 
    provider: 'deepseek', 
    tokenizer: 'tiktoken', 
    contextLimit: 128_000, 
    versions: ['deepseek-chat', 'deepseek-coder'], 
    selectedVersion: 'deepseek-chat', 
    outPolicy: { mode: 'auto' }, 
    apiKey: DEFAULT_API_KEYS.deepseek 
  },
  { 
    id: 'mistral', 
    name: 'Mistral', 
    provider: 'mistral', 
    tokenizer: 'bytebpe', 
    contextLimit: 64_000, 
    versions: ['mistral-large-latest', 'mistral-medium-2312', 'mistral-small'], 
    selectedVersion: 'mistral-large-latest', 
    outPolicy: { mode: 'auto' }, 
    apiKey: DEFAULT_API_KEYS.mistral 
  },
  { 
    id: 'perplexity', 
    name: 'Perplexity', 
    provider: 'perplexity', 
    tokenizer: 'tiktoken', 
    contextLimit: 32_000, 
    versions: ['sonar-pro', 'sonar-small'], 
    selectedVersion: 'sonar-pro', 
    outPolicy: { mode: 'auto' }, 
    apiKey: DEFAULT_API_KEYS.perplexity 
  },
  { 
    id: 'kimi', 
    name: 'KIMI', 
    provider: 'kimi', 
    tokenizer: 'tiktoken', 
    contextLimit: 128_000, 
    versions: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'], 
    selectedVersion: 'moonshot-v1-128k', 
    outPolicy: { mode: 'auto' }, 
    apiKey: DEFAULT_API_KEYS.kimi 
  },
  { 
    id: 'xai', 
    name: 'xAI Grok', 
    provider: 'xai', 
    tokenizer: 'bytebpe', 
    contextLimit: 128_000, 
    versions: ['grok-beta'], 
    selectedVersion: 'grok-beta', 
    outPolicy: { mode: 'auto' }, 
    endpoint: '', 
    apiKey: DEFAULT_API_KEYS.xai 
  },
  { 
    id: 'groq', 
    name: 'Groq', 
    provider: 'groq', 
    tokenizer: 'tiktoken', 
    contextLimit: 128_000, 
    versions: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it'], 
    selectedVersion: 'llama-3.3-70b-versatile', 
    outPolicy: { mode: 'auto' }, 
    apiKey: DEFAULT_API_KEYS.groq 
  },
  { 
    id: 'falcon', 
    name: 'Falcon LLM', 
    provider: 'falcon', 
    tokenizer: 'bytebpe', 
    contextLimit: 128_000, 
    versions: ['falcon-180b-chat', 'falcon-40b-instruct', 'falcon-7b-instruct', 'falcon-mamba-7b', 'falcon-11b'], 
    selectedVersion: 'falcon-180b-chat', 
    outPolicy: { mode: 'auto' }, 
    apiKey: DEFAULT_API_KEYS.huggingface 
  },
  { 
    id: 'sarvam', 
    name: 'Sarvam AI', 
    provider: 'sarvam', 
    tokenizer: 'tiktoken', 
    contextLimit: 32_000, 
    versions: ['sarvam-2b', 'sarvam-1'], 
    selectedVersion: 'sarvam-2b', 
    outPolicy: { mode: 'auto' }, 
    apiKey: DEFAULT_API_KEYS.sarvam 
  },
  { 
    id: 'huggingface', 
    name: 'HuggingFace Inference', 
    provider: 'huggingface', 
    tokenizer: 'bytebpe', 
    contextLimit: 64_000, 
    versions: ['hf-model'], 
    selectedVersion: 'hf-model', 
    outPolicy: { mode: 'auto' }, 
    endpoint: '', 
    apiKey: DEFAULT_API_KEYS.huggingface 
  },
  { 
    id: 'generic', 
    name: 'Custom HTTP Engine', 
    provider: 'generic', 
    tokenizer: 'bytebpe', 
    contextLimit: 64_000, 
    versions: ['v1'], 
    selectedVersion: 'v1', 
    outPolicy: { mode: 'auto' }, 
    endpoint: '', 
    apiKey: '' 
  },
];

// =============================================================================
// PRICING (USD per 1M tokens)
// =============================================================================

export const BASE_PRICING: AllPricing = {
  openai: {
    'gpt-4.1': { in: 10.00, out: 30.00, note: 'GPT-4 Turbo - Strong reasoning' },
    'gpt-4o': { in: 2.50, out: 10.00, note: 'GPT-4o - Balanced quality' },
    'gpt-4o-2024-11-20': { in: 2.50, out: 10.00, note: 'GPT-4o (Nov 2024)' },
    'gpt-4o-2024-08-06': { in: 2.50, out: 10.00, note: 'GPT-4o (Aug 2024)' },
    'gpt-4o-2024-05-13': { in: 5.00, out: 15.00, note: 'GPT-4o (May 2024)' },
    'gpt-4.1-mini': { in: 0.15, out: 0.60, note: 'GPT-4o mini - Fast & economical' },
    'gpt-4o-mini': { in: 0.15, out: 0.60, note: 'GPT-4o mini - Fast & economical' },
  },
  anthropic: {
    'claude-3.5-sonnet': { in: 3.00, out: 15.00, note: 'Claude 3.5 Sonnet - Best performance' },
    'claude-3-5-sonnet-20241022': { in: 3.00, out: 15.00, note: 'Claude 3.5 Sonnet (Oct 2024)' },
    'claude-3-haiku': { in: 0.25, out: 1.25, note: 'Claude 3 Haiku - Speed optimized' },
    'claude-3-haiku-20240307': { in: 0.25, out: 1.25, note: 'Claude 3 Haiku (Mar 2024)' },
  },
  gemini: {
    'gemini-2.0-flash-exp': { in: 0.075, out: 0.30, note: 'Gemini 2.0 Flash - Fast multimodal' },
    'gemini-2.0-flash-lite': { in: 0.0375, out: 0.15, note: 'Gemini 2.0 Flash Lite' },
    'gemini-2.5-flash-lite': { in: 0.0375, out: 0.15, note: 'Gemini 2.5 Flash Lite' },
  },
  deepseek: {
    'deepseek-chat': { in: 0.14, out: 0.28, note: 'DeepSeek Chat - Ultra low cost' },
    'deepseek-coder': { in: 0.14, out: 0.28, note: 'DeepSeek Coder - Code optimized' },
  },
  mistral: {
    'mistral-large-latest': { in: 8.00, out: 24.00, note: 'Competent generalist' },
    'mistral-medium-2312': { in: 4.00, out: 12.00, note: 'Balanced performance and cost' },
    'mistral-small': { in: 2.00, out: 6.00, note: 'Low-cost summaries' },
  },
  perplexity: {
    'sonar-pro': { in: 10.00, out: 20.00, note: 'Web-augmented research' },
    'sonar-small': { in: 4.00, out: 8.00, note: 'Cheaper web-aug' },
  },
  kimi: {
    'moonshot-v1-8k': { in: 8.00, out: 16.00, note: 'Fast context processing' },
    'moonshot-v1-32k': { in: 12.00, out: 24.00, note: 'Extended context support' },
    'moonshot-v1-128k': { in: 20.00, out: 40.00, note: 'Large context analysis' },
  },
  xai: {
    'grok-beta': { in: 6.00, out: 12.00, note: 'Fast, opinionated' },
  },
  groq: {
    'llama-3.3-70b-versatile': { in: 0.59, out: 0.79, note: 'Llama 3.3 70B - Best quality on Groq' },
    'llama-3.1-8b-instant': { in: 0.05, out: 0.08, note: 'Llama 3.1 8B - Ultra fast inference' },
    'mixtral-8x7b-32768': { in: 0.24, out: 0.24, note: 'Mixtral 8x7B - 32K context MoE' },
    'gemma2-9b-it': { in: 0.20, out: 0.20, note: 'Gemma 2 9B - Google efficient model' },
  },
  falcon: {
    'falcon-180b-chat': { in: 0.80, out: 1.60, note: 'Falcon 180B - Top open-source LLM' },
    'falcon-40b-instruct': { in: 0.40, out: 0.80, note: 'Falcon 40B - Multilingual' },
    'falcon-7b-instruct': { in: 0.10, out: 0.20, note: 'Falcon 7B - Lightweight' },
    'falcon-mamba-7b': { in: 0.15, out: 0.30, note: 'Falcon Mamba 7B - State Space LM' },
    'falcon-11b': { in: 0.20, out: 0.40, note: 'Falcon 2 11B - Vision-to-language' },
  },
  sarvam: {
    'sarvam-2b': { in: 0.10, out: 0.30, note: 'Sarvam AI 2B - Lightweight & fast' },
    'sarvam-1': { in: 0.20, out: 0.50, note: 'Sarvam AI 1 - Balanced performance' },
  },
  huggingface: {
    'hf-model': { in: 3.00, out: 8.00, note: 'Depends on your hosted model' },
  },
  generic: {
    'v1': { in: 3.00, out: 8.00, note: 'Custom endpoint' },
  },
};

// =============================================================================
// DEFAULT SELECTIONS
// =============================================================================

export const DEFAULT_SELECTED_ENGINES: Record<string, boolean> = {
  openai: true,
  claude: true,
  deepseek: true,
  gemini: true,
  mistral: true,
};

// =============================================================================
// SUPPORTED PROVIDERS FOR STREAMING
// =============================================================================

export const STREAMING_PROVIDERS: string[] = [
  'anthropic',
  'openai',
  'gemini',
  'mistral',
  'perplexity',
  'kimi',
  'deepseek',
  'xai',
  'groq',
  'falcon',
  'sarvam',
];

// =============================================================================
// MAX PROMPT LENGTH
// =============================================================================

export const MAX_PROMPT_LENGTH = 7000;
