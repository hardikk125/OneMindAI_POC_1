/**
 * Secret Filter Utility
 * 
 * Removes sensitive data from logs, error messages, and debug output.
 * Prevents accidental exposure of API keys, passwords, and tokens.
 */

// =============================================================================
// SECRET PATTERNS
// =============================================================================

/**
 * Patterns that identify sensitive data
 */
const SECRET_PATTERNS: Array<{ pattern: RegExp; name: string }> = [
  // API Keys - various providers
  { pattern: /sk-[a-zA-Z0-9]{20,}/g, name: 'OpenAI API Key' },
  { pattern: /sk-ant-[a-zA-Z0-9\-_]{20,}/g, name: 'Anthropic API Key' },
  { pattern: /sk-proj-[a-zA-Z0-9\-_]{20,}/g, name: 'OpenAI Project Key' },
  { pattern: /AIza[a-zA-Z0-9\-_]{35}/g, name: 'Google API Key' },
  { pattern: /gsk_[a-zA-Z0-9]{20,}/g, name: 'Groq API Key' },
  { pattern: /pplx-[a-zA-Z0-9]{20,}/g, name: 'Perplexity API Key' },
  { pattern: /xai-[a-zA-Z0-9]{20,}/g, name: 'xAI API Key' },
  { pattern: /hf_[a-zA-Z0-9]{20,}/g, name: 'HuggingFace Token' },
  
  // Generic API key patterns
  { pattern: /api[_-]?key['":\s]*[=:]\s*['"]?[a-zA-Z0-9\-_]{20,}['"]?/gi, name: 'Generic API Key' },
  { pattern: /bearer\s+[a-zA-Z0-9\-_\.]{20,}/gi, name: 'Bearer Token' },
  { pattern: /authorization['":\s]*[=:]\s*['"]?[a-zA-Z0-9\-_\.]{20,}['"]?/gi, name: 'Authorization Header' },
  
  // Passwords and secrets
  { pattern: /password['":\s]*[=:]\s*['"]?[^\s'"]{8,}['"]?/gi, name: 'Password' },
  { pattern: /secret['":\s]*[=:]\s*['"]?[a-zA-Z0-9\-_]{16,}['"]?/gi, name: 'Secret' },
  { pattern: /token['":\s]*[=:]\s*['"]?[a-zA-Z0-9\-_\.]{20,}['"]?/gi, name: 'Token' },
  
  // AWS credentials
  { pattern: /AKIA[A-Z0-9]{16}/g, name: 'AWS Access Key' },
  { pattern: /aws[_-]?secret[_-]?access[_-]?key['":\s]*[=:]\s*['"]?[a-zA-Z0-9\/+=]{40}['"]?/gi, name: 'AWS Secret Key' },
  
  // Private keys
  { pattern: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----[\s\S]*?-----END\s+(RSA\s+)?PRIVATE\s+KEY-----/g, name: 'Private Key' },
  
  // Credit card numbers (basic pattern)
  { pattern: /\b(?:\d{4}[- ]?){3}\d{4}\b/g, name: 'Credit Card' },
  
  // Email addresses (optional - can be sensitive)
  // { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, name: 'Email' },
];

/**
 * Replacement text for redacted secrets
 */
const REDACTED = '[REDACTED]';
const REDACTED_KEY = '[API_KEY_REDACTED]';
const REDACTED_TOKEN = '[TOKEN_REDACTED]';
const REDACTED_SECRET = '[SECRET_REDACTED]';

// =============================================================================
// FILTER FUNCTIONS
// =============================================================================

/**
 * Remove all secrets from a string
 */
export function filterSecrets(input: string): string {
  if (!input || typeof input !== 'string') return input;
  
  let filtered = input;
  
  for (const { pattern } of SECRET_PATTERNS) {
    // Reset regex lastIndex for global patterns
    pattern.lastIndex = 0;
    filtered = filtered.replace(pattern, REDACTED);
  }
  
  return filtered;
}

/**
 * Remove secrets from an object (recursive)
 */
export function filterSecretsFromObject<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return filterSecrets(obj) as T;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => filterSecretsFromObject(item)) as T;
  }
  
  if (typeof obj === 'object') {
    const filtered: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      // Check if key itself suggests sensitive data
      const sensitiveKeys = ['apiKey', 'api_key', 'apikey', 'password', 'secret', 'token', 'authorization', 'auth'];
      const isKeySecret = sensitiveKeys.some(sk => key.toLowerCase().includes(sk));
      
      if (isKeySecret && typeof value === 'string') {
        // Redact the entire value for sensitive keys
        filtered[key] = value.length > 0 ? REDACTED_KEY : '';
      } else {
        filtered[key] = filterSecretsFromObject(value);
      }
    }
    
    return filtered as T;
  }
  
  return obj;
}

/**
 * Create a safe error object for logging
 */
export function createSafeError(error: Error | unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: filterSecrets(error.message),
      stack: filterSecrets(error.stack || ''),
    };
  }
  
  if (typeof error === 'string') {
    return { message: filterSecrets(error) };
  }
  
  if (typeof error === 'object' && error !== null) {
    return filterSecretsFromObject(error as Record<string, unknown>);
  }
  
  return { message: String(error) };
}

/**
 * Mask a secret for display (show first/last few chars)
 */
export function maskSecret(secret: string, showChars: number = 4): string {
  if (!secret || typeof secret !== 'string') return '';
  if (secret.length <= showChars * 2) return '*'.repeat(secret.length);
  
  const start = secret.substring(0, showChars);
  const end = secret.substring(secret.length - showChars);
  const middle = '*'.repeat(Math.min(secret.length - showChars * 2, 20));
  
  return `${start}${middle}${end}`;
}

/**
 * Check if a string contains any secrets
 */
export function containsSecrets(input: string): boolean {
  if (!input || typeof input !== 'string') return false;
  
  for (const { pattern } of SECRET_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(input)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Get list of detected secret types in a string
 */
export function detectSecretTypes(input: string): string[] {
  if (!input || typeof input !== 'string') return [];
  
  const detected: string[] = [];
  
  for (const { pattern, name } of SECRET_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(input)) {
      detected.push(name);
    }
  }
  
  return [...new Set(detected)]; // Remove duplicates
}

// =============================================================================
// SAFE CONSOLE WRAPPER
// =============================================================================

/**
 * Create a safe console that filters secrets
 */
export const safeConsole = {
  log: (...args: unknown[]): void => {
    console.log(...args.map(arg => 
      typeof arg === 'string' ? filterSecrets(arg) : filterSecretsFromObject(arg)
    ));
  },
  
  warn: (...args: unknown[]): void => {
    console.warn(...args.map(arg => 
      typeof arg === 'string' ? filterSecrets(arg) : filterSecretsFromObject(arg)
    ));
  },
  
  error: (...args: unknown[]): void => {
    console.error(...args.map(arg => 
      typeof arg === 'string' ? filterSecrets(arg) : filterSecretsFromObject(arg)
    ));
  },
  
  info: (...args: unknown[]): void => {
    console.info(...args.map(arg => 
      typeof arg === 'string' ? filterSecrets(arg) : filterSecretsFromObject(arg)
    ));
  },
  
  debug: (...args: unknown[]): void => {
    console.debug(...args.map(arg => 
      typeof arg === 'string' ? filterSecrets(arg) : filterSecretsFromObject(arg)
    ));
  },
};

// =============================================================================
// ENVIRONMENT VARIABLE FILTER
// =============================================================================

/**
 * Get safe environment info for debugging
 */
export function getSafeEnvInfo(): Record<string, string> {
  const safeEnv: Record<string, string> = {};
  
  // Only include non-sensitive env vars
  const safeKeys = ['NODE_ENV', 'VITE_PROXY_URL', 'VITE_APP_TITLE'];
  
  for (const key of safeKeys) {
    const value = (import.meta as { env?: Record<string, string> }).env?.[key];
    if (value) {
      safeEnv[key] = value;
    }
  }
  
  return safeEnv;
}

export default {
  filterSecrets,
  filterSecretsFromObject,
  createSafeError,
  maskSecret,
  containsSecrets,
  detectSecretTypes,
  safeConsole,
  getSafeEnvInfo,
};
