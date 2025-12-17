/**
 * ============================================================
 * ERROR ANALYSIS & AUTO-RECOVERY ENGINE
 * ============================================================
 * 
 * This engine handles ALL API errors with:
 * 1. Raw error display
 * 2. Plain English translation
 * 3. Technical analysis
 * 4. Automatic fix attempts
 * 5. Step-by-step narration
 * 6. CELLAR MESSAGE for unrecoverable errors
 */

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ErrorType = 'HTTP' | 'SDK' | 'Network' | 'Unknown';

export interface RawError {
  code?: number | string;
  message: string;
  type?: string;
  param?: string;
  statusCode?: number;
  statusText?: string;
  response?: any;
  stack?: string;
}

export interface ErrorDetails {
  errorCode: string;
  errorType: ErrorType;
  severity: ErrorSeverity;
  retryable: boolean;
  technicalCauses: string[];
  evidence: string[];
}

export interface PlainEnglishExplanation {
  whatItMeans: string;
  whyItHappens: string;
  howItAffects: string;
}

export interface CellarMessage {
  technical: string[];
  business: string[];
  escalation: string;
}

export interface ErrorAnalysis {
  rawError: string;
  code: string;
  severity: ErrorSeverity;
  retryable: boolean;
  plainEnglish: PlainEnglishExplanation;
  cellarMessage?: CellarMessage;
  nextStep: string;
}

// ============================================================
// ERROR PATTERN RECOGNITION
// ============================================================

const ERROR_PATTERNS = {
  // 400 Errors
  INVALID_FORMAT: {
    codes: [400],
    patterns: ['invalid format', 'invalid request body', 'bad request'],
    severity: 'medium' as ErrorSeverity,
    retryable: false,
  },

  // 401 Errors
  INVALID_AUTH: {
    codes: [401],
    patterns: ['invalid authentication', 'invalid_authentication', 'authentication fails'],
    severity: 'high' as ErrorSeverity,
    retryable: false,
  },
  INCORRECT_API_KEY: {
    codes: [401],
    patterns: ['incorrect api key', 'invalid api key', 'api key not correct'],
    severity: 'high' as ErrorSeverity,
    retryable: false,
  },
  NO_ORGANIZATION: {
    codes: [401],
    patterns: ['must be a member of an organization', 'organization_required'],
    severity: 'critical' as ErrorSeverity,
    retryable: false,
  },
  IP_NOT_AUTHORIZED: {
    codes: [401],
    patterns: ['ip not authorized', 'ip address not authorized'],
    severity: 'high' as ErrorSeverity,
    retryable: false,
  },
  
  // 402 Errors
  INSUFFICIENT_BALANCE: {
    codes: [402],
    patterns: ['insufficient balance', 'run out of balance', 'no credit'],
    severity: 'high' as ErrorSeverity,
    retryable: false,
  },

  // 403 Errors
  REGION_NOT_SUPPORTED: {
    codes: [403],
    patterns: ['country', 'region', 'territory not supported', 'unsupported_region'],
    severity: 'critical' as ErrorSeverity,
    retryable: false,
  },
  PERMISSION_DENIED: {
    codes: [403],
    patterns: ['permission denied', 'permission_denied', 'access denied'],
    severity: 'high' as ErrorSeverity,
    retryable: false,
  },
  
  // 404 Errors
  NOT_FOUND: {
    codes: [404],
    patterns: ['not found', 'not_found_error', 'no such model'],
    severity: 'medium' as ErrorSeverity,
    retryable: false,
  },

  // 422 Errors
  INVALID_PARAMETERS: {
    codes: [422],
    patterns: ['invalid parameters', 'invalid_parameters', 'validation error'],
    severity: 'medium' as ErrorSeverity,
    retryable: false,
  },
  
  // 429 Errors
  RATE_LIMIT: {
    codes: [429],
    patterns: ['rate limit', 'rate_limit_error', 'too many requests'],
    severity: 'medium' as ErrorSeverity,
    retryable: true,
  },
  QUOTA_EXCEEDED: {
    codes: [429],
    patterns: ['quota', 'exceeded', 'billing', 'usage limit'],
    severity: 'high' as ErrorSeverity,
    retryable: false,
  },
  
  // 500 Errors
  INTERNAL_SERVER_ERROR: {
    codes: [500],
    patterns: ['internal server error', 'server had an error', 'api_error'],
    severity: 'high' as ErrorSeverity,
    retryable: true,
  },
  
  // 503 Errors
  ENGINE_OVERLOADED: {
    codes: [503],
    patterns: ['overloaded', 'overloaded_error', 'high traffic'],
    severity: 'medium' as ErrorSeverity,
    retryable: true,
  },
  SLOW_DOWN: {
    codes: [503],
    patterns: ['slow down', 'traffic spike', 'sudden increase'],
    severity: 'medium' as ErrorSeverity,
    retryable: true,
  },
  
  // Network Errors
  CONNECTION_ERROR: {
    codes: ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT'],
    patterns: ['connection', 'connect', 'network', 'ECONNREFUSED'],
    severity: 'high' as ErrorSeverity,
    retryable: true,
  },
  TIMEOUT_ERROR: {
    codes: ['ETIMEDOUT'],
    patterns: ['timeout', 'timed out', 'ETIMEDOUT'],
    severity: 'medium' as ErrorSeverity,
    retryable: true,
  },
  
  // Content & Token Errors (400)
  CONTENT_POLICY_VIOLATION: {
    codes: [400],
    patterns: ['content_policy_violation', 'content filter', 'policy violation', 'inappropriate content', 'unsafe content'],
    severity: 'high' as ErrorSeverity,
    retryable: false,
  },
  TOKEN_LIMIT_EXCEEDED: {
    codes: [400],
    patterns: ['context_length_exceeded', 'maximum context length', 'token limit', 'too many tokens', 'context length'],
    severity: 'medium' as ErrorSeverity,
    retryable: false,
  },
  INVALID_CONTENT_TYPE: {
    codes: [415],
    patterns: ['unsupported_media_type', 'invalid content-type', 'content type not supported', 'unsupported media'],
    severity: 'medium' as ErrorSeverity,
    retryable: false,
  },
  
  // Model & Organization Critical Errors
  MODEL_DEPRECATED: {
    codes: [410],
    patterns: ['model_deprecated', 'model is deprecated', 'model no longer available', 'deprecated model'],
    severity: 'high' as ErrorSeverity,
    retryable: false,
  },
  BILLING_HARD_LIMIT: {
    codes: [429],
    patterns: ['billing_hard_limit_reached', 'hard limit', 'billing limit reached', 'hard billing limit'],
    severity: 'critical' as ErrorSeverity,
    retryable: false,
  },
  ORGANIZATION_SUSPENDED: {
    codes: [403],
    patterns: ['organization_suspended', 'account suspended', 'organization deactivated', 'account deactivated'],
    severity: 'critical' as ErrorSeverity,
    retryable: false,
  },
  
  // Gateway Errors (Retryable)
  BAD_GATEWAY: {
    codes: [502],
    patterns: ['bad gateway', 'proxy error', '502 bad gateway'],
    severity: 'high' as ErrorSeverity,
    retryable: true,
  },
  GATEWAY_TIMEOUT: {
    codes: [504],
    patterns: ['gateway timeout', 'upstream timeout', '504 gateway timeout'],
    severity: 'high' as ErrorSeverity,
    retryable: true,
  },
};

// ============================================================
// MAIN ERROR ANALYSIS FUNCTION
// ============================================================

export async function analyzeError(error: any): Promise<ErrorAnalysis> {
  const raw = JSON.stringify(error, null, 2).replace(/sk-[a-zA-Z0-9-_]{20,}/g, 'sk-***');
  const code = detectErrorCode(error);
  
  // Extract additional context from OpenAI SDK errors
  const errorParam = error.param || error.error?.param;
  const errorCode = error.code || error.error?.code;
  
  console.log(`🔴 ERROR: ${code}`, errorParam ? `(param: ${errorParam})` : '');
  
  const explanation = getExplanation(code, errorParam);
  const cellarMessage = getCellarMessage(code, errorParam);
  
  return {
    rawError: raw,
    code: errorCode || code,
    severity: getSeverity(code),
    retryable: isRetryable(code),
    plainEnglish: explanation,
    cellarMessage,
    nextStep: getNextStep(code)
  };
}

// ============================================================
// AUTO-FIX UTILITIES
// ============================================================

import { RetryManager } from './retry-manager';
import { RequestThrottler } from './request-throttler';

let globalRetryManager: RetryManager | null = null;
let globalThrottler: RequestThrottler | null = null;

export function initializeAutoRecovery() {
  if (!globalRetryManager) {
    globalRetryManager = new RetryManager({
      maxRetries: 4,
      baseDelay: 1000,
      maxDelay: 32000,
      backoffMultiplier: 2
    });
  }
  
  if (!globalThrottler) {
    globalThrottler = new RequestThrottler({
      maxRequestsPerSecond: 10,
      adaptiveThrottling: true
    });
  }
  
  return { retryManager: globalRetryManager, throttler: globalThrottler };
}

/**
 * Auto-fix: Exponential backoff retry for rate limits
 */
export async function autoFixRateLimit<T>(
  provider: string,
  fn: () => Promise<T>,
  onProgress?: (status: string) => void
): Promise<T> {
  const { retryManager } = initializeAutoRecovery();
  
  // Execute directly without throttling - only retry on actual rate limit errors
  return retryManager.executeWithRetry(
    `rate-limit-${provider}`,
    fn, // Direct execution - no throttle overhead
    (error) => {
      // Retry on rate limit errors
      return error.statusCode === 429 || 
             error.status === 429 ||
             error.message?.toLowerCase().includes('rate limit') ||
             error.message?.includes('429');
    },
    (attempt, delay, error) => {
      const status = `⏳ Rate limit retry ${attempt}/4: Waiting ${(delay / 1000).toFixed(1)}s...`;
      console.log(`[AutoFix] ${status}`);
      if (onProgress) onProgress(status);
    }
  );
}

/**
 * Auto-fix: Server error retry (500, 503)
 */
export async function autoFixServerError<T>(
  provider: string,
  fn: () => Promise<T>,
  onProgress?: (status: string) => void
): Promise<T> {
  const { retryManager } = initializeAutoRecovery();
  
  console.log(`[AutoFix] 🔧 Retrying after server error for ${provider}...`);
  
  return retryManager.executeWithRetry(
    `server-error-${provider}`,
    fn,
    (error) => {
      // Retry on 500/503 errors
      return error.statusCode === 500 || 
             error.statusCode === 503 ||
             error.status === 500 ||
             error.status === 503 ||
             error.message?.toLowerCase().includes('server error') ||
             error.message?.toLowerCase().includes('overloaded');
    },
    (attempt, delay, error) => {
      const status = `🔧 Server error retry ${attempt}/4: Waiting ${(delay / 1000).toFixed(1)}s...`;
      console.log(`[AutoFix] ${status}`);
      if (onProgress) onProgress(status);
    }
  );
}

/**
 * Auto-fix: Slow down throttling (503 Slow Down)
 */
export async function autoFixSlowDown<T>(
  provider: string,
  fn: () => Promise<T>,
  onProgress?: (status: string) => void
): Promise<T> {
  const { retryManager, throttler } = initializeAutoRecovery();
  
  console.log(`[AutoFix] 🐌 Entering adaptive throttle mode for ${provider}...`);
  
  // Enter throttle mode for 15 minutes
  throttler.enterThrottleMode(15 * 60 * 1000);
  
  if (onProgress) {
    onProgress('🐌 Throttling requests for 15 minutes to stabilize...');
  }

  // Wait initial period
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Retry with throttling
  return retryManager.executeWithRetry(
    `slow-down-${provider}`,
    async () => {
      await throttler.throttle();
      return await fn();
    },
    (error) => {
      return error.statusCode === 503 && 
             error.message?.toLowerCase().includes('slow down');
    },
    (attempt, delay) => {
      const status = `🐌 Throttled retry ${attempt}/4: Rate reduced to ${throttler.getCurrentRate()} req/s`;
      console.log(`[AutoFix] ${status}`);
      if (onProgress) onProgress(status);
    }
  );
}

/**
 * Auto-fix: Connection/Timeout errors
 */
export async function autoFixConnectionError<T>(
  provider: string,
  fn: () => Promise<T>,
  onProgress?: (status: string) => void
): Promise<T> {
  const { retryManager } = initializeAutoRecovery();
  
  console.log(`[AutoFix] 🌐 Retrying connection for ${provider}...`);
  
  return retryManager.executeWithRetry(
    `connection-${provider}`,
    fn,
    (error) => {
      return error.code === 'ECONNREFUSED' ||
             error.code === 'ENOTFOUND' ||
             error.code === 'ETIMEDOUT' ||
             error.message?.toLowerCase().includes('connection') ||
             error.message?.toLowerCase().includes('timeout') ||
             error.message?.toLowerCase().includes('network');
    },
    (attempt, delay, error) => {
      const errorType = error.code || 'Network error';
      const status = `🌐 Connection retry ${attempt}/4: ${errorType} - Waiting ${(delay / 1000).toFixed(1)}s...`;
      console.log(`[AutoFix] ${status}`);
      if (onProgress) onProgress(status);
    }
  );
}

/**
 * Determine if error should trigger auto-fix
 */
export function shouldAutoFix(error: any): boolean {
  const code = detectErrorCode(error);
  return isRetryable(code);
}

/**
 * Get appropriate auto-fix function for error
 */
export function getAutoFixFunction(error: any): string {
  const statusCode = error.statusCode || error.status;
  const message = (error.message || '').toLowerCase();
  
  if (statusCode === 429 || message.includes('rate limit')) {
    return 'autoFixRateLimit';
  }
  
  if (statusCode === 500 || message.includes('server error')) {
    return 'autoFixServerError';
  }
  
  if (statusCode === 502 || message.includes('bad gateway')) {
    return 'autoFixServerError'; // Treat bad gateway as server error
  }
  
  if (statusCode === 504 || message.includes('gateway timeout')) {
    return 'autoFixServerError'; // Treat gateway timeout as server error
  }
  
  if (statusCode === 503) {
    if (message.includes('slow down')) {
      return 'autoFixSlowDown';
    }
    return 'autoFixServerError'; // Treat overloaded as server error
  }
  
  if (message.includes('connection') || message.includes('timeout')) {
    return 'autoFixConnectionError';
  }
  
  return 'none';
}

function detectErrorCode(error: any): string {
  // 1️⃣ PRIORITY: Check OpenAI SDK error.type (most reliable)
  const errorType = error.type || error.error?.type;
  if (errorType === 'rate_limit_error') return 'RATE_LIMIT';
  if (errorType === 'invalid_request_error') return 'INVALID_FORMAT';
  if (errorType === 'authentication_error') return 'INVALID_AUTH';
  if (errorType === 'permission_error') return 'PERMISSION_DENIED';
  if (errorType === 'not_found_error') return 'NOT_FOUND';
  if (errorType === 'api_error') return 'INTERNAL_SERVER_ERROR';
  if (errorType === 'api_connection_error') return 'CONNECTION_ERROR';
  if (errorType === 'timeout_error') return 'TIMEOUT_ERROR';
  
  // 2️⃣ Check HTTP status code
  const statusCode = error.statusCode || error.status || error.code;
  const msg = (error.message || JSON.stringify(error) || '').toLowerCase();
  
  // 3️⃣ Check message patterns (for detailed classification)
  // Authentication & Authorization
  if (msg.includes('incorrect api key') || msg.includes('invalid api key')) return 'INCORRECT_API_KEY';
  if (msg.includes('invalid authentication') || msg.includes('authentication fails')) return 'INVALID_AUTH';
  if (msg.includes('must be a member of an organization')) return 'NO_ORGANIZATION';
  if (msg.includes('ip not authorized')) return 'IP_NOT_AUTHORIZED';
  if (msg.includes('organization_suspended') || msg.includes('account suspended')) return 'ORGANIZATION_SUSPENDED';
  if (msg.includes('permission denied')) return 'PERMISSION_DENIED';
  
  // Rate Limiting & Quota
  if (msg.includes('billing_hard_limit') || msg.includes('hard limit')) return 'BILLING_HARD_LIMIT';
  if (msg.includes('rate limit') || msg.includes('too many requests')) return 'RATE_LIMIT';
  if (msg.includes('quota') || msg.includes('usage limit')) return 'QUOTA_EXCEEDED';
  
  // Content & Token Errors
  if (msg.includes('content_policy_violation') || msg.includes('content filter')) return 'CONTENT_POLICY_VIOLATION';
  if (msg.includes('context_length_exceeded') || msg.includes('token limit')) return 'TOKEN_LIMIT_EXCEEDED';
  if (msg.includes('unsupported_media_type') || msg.includes('content type not supported')) return 'INVALID_CONTENT_TYPE';
  
  // Model & Resource Errors
  if (msg.includes('model_deprecated') || msg.includes('model is deprecated')) return 'MODEL_DEPRECATED';
  if (msg.includes('not found') || msg.includes('no such model')) return 'NOT_FOUND';
  
  // Server Errors
  if (msg.includes('bad gateway') || msg.includes('502')) return 'BAD_GATEWAY';
  if (msg.includes('gateway timeout') || msg.includes('504')) return 'GATEWAY_TIMEOUT';
  if (msg.includes('overloaded') || msg.includes('high traffic')) return 'ENGINE_OVERLOADED';
  if (msg.includes('slow down') || msg.includes('traffic spike')) return 'SLOW_DOWN';
  
  // Network Errors
  if (msg.includes('connection') || msg.includes('ECONNREFUSED')) return 'CONNECTION_ERROR';
  if (msg.includes('timeout') || msg.includes('ETIMEDOUT')) return 'TIMEOUT_ERROR';
  
  // Generic Errors
  if (msg.includes('country') || msg.includes('region not supported')) return 'REGION_NOT_SUPPORTED';
  if (msg.includes('invalid format') || msg.includes('bad request')) return 'INVALID_FORMAT';
  if (msg.includes('insufficient balance') || msg.includes('run out of balance')) return 'INSUFFICIENT_BALANCE';
  if (msg.includes('invalid parameters') || msg.includes('validation error')) return 'INVALID_PARAMETERS';
  
  // 4️⃣ Fallback to status code only
  if (statusCode === 400) return 'INVALID_FORMAT';
  if (statusCode === 401) return 'INVALID_AUTH';
  if (statusCode === 402) return 'INSUFFICIENT_BALANCE';
  if (statusCode === 403) return 'PERMISSION_DENIED';
  if (statusCode === 404) return 'NOT_FOUND';
  if (statusCode === 410) return 'MODEL_DEPRECATED';
  if (statusCode === 415) return 'INVALID_CONTENT_TYPE';
  if (statusCode === 422) return 'INVALID_PARAMETERS';
  if (statusCode === 429) return 'RATE_LIMIT';
  if (statusCode === 500) return 'INTERNAL_SERVER_ERROR';
  if (statusCode === 502) return 'BAD_GATEWAY';
  if (statusCode === 503) return 'ENGINE_OVERLOADED';
  if (statusCode === 504) return 'GATEWAY_TIMEOUT';
  
  return 'UNKNOWN';
}

function getSeverity(code: string): ErrorSeverity {
  const pattern = ERROR_PATTERNS[code as keyof typeof ERROR_PATTERNS];
  return pattern?.severity || 'high';
}

function isRetryable(code: string): boolean {
  const pattern = ERROR_PATTERNS[code as keyof typeof ERROR_PATTERNS];
  return pattern?.retryable || false;
}

function getExplanation(code: string, errorParam?: string): PlainEnglishExplanation {
  const explanations: Record<string, PlainEnglishExplanation> = {
    INVALID_AUTH: {
      whatItMeans: 'Your API key is not being accepted by the server. The server does not recognize your identity, so it cannot process your request.',
      whyItHappens: 'This happens when you use an API key that has been revoked, expired, or does not have the right permissions for what you are trying to do.',
      howItAffects: 'All requests using this API key will fail immediately. No AI responses will be generated until the API key issue is resolved.'
    },
    INVALID_FORMAT: {
      whatItMeans: errorParam 
        ? `The request parameter "${errorParam}" is invalid or missing. The server rejected the request due to malformed data.`
        : 'The request sent to the server was not formatted correctly.',
      whyItHappens: errorParam
        ? `The parameter "${errorParam}" either has an invalid value, wrong type, or is missing entirely.`
        : 'This usually happens due to a bug in the code where the JSON body is malformed or missing required fields.',
      howItAffects: 'The request is rejected immediately. It requires a code fix to resolve.'
    },
    INSUFFICIENT_BALANCE: {
      whatItMeans: 'You have run out of credits in your DeepSeek account.',
      whyItHappens: 'Your account balance has reached zero or your credit limit has been hit.',
      howItAffects: 'You cannot make any more requests until you top up your account balance.'
    },
    INVALID_PARAMETERS: {
      whatItMeans: 'The settings sent with the request (like temperature or max_tokens) are invalid.',
      whyItHappens: 'You might be sending values that are outside the allowed range for this model.',
      howItAffects: 'The request is rejected. You need to adjust your settings to be within valid limits.'
    },
    INCORRECT_API_KEY: {
      whatItMeans: 'The API key you entered is wrong or has a typo. The server checked your key and it does not match any valid key in their system.',
      whyItHappens: 'This usually happens when copying and pasting the API key incorrectly, or when an old cached key is being used instead of the new one.',
      howItAffects: 'The system cannot authenticate with the API, so no requests will work. You need to update the API key to continue.'
    },
    NO_ORGANIZATION: {
      whatItMeans: 'Your account is not part of any organization. OpenAI requires all API users to belong to an organization.',
      whyItHappens: 'This happens if you were removed from your organization, or if your account was never added to one in the first place.',
      howItAffects: 'You cannot use the API at all until you join or create an organization. This is a complete blocker.'
    },
    IP_NOT_AUTHORIZED: {
      whatItMeans: 'Your current internet connection (IP address) is not allowed to access this API. The organization has restricted which locations can make requests.',
      whyItHappens: 'Your organization set up an IP allowlist for security, and your current IP address is not on that list.',
      howItAffects: 'Requests from this network location will be blocked. You need to either change networks or update the IP allowlist.'
    },
    REGION_NOT_SUPPORTED: {
      whatItMeans: 'OpenAI does not provide services in your current country or region due to legal or compliance restrictions.',
      whyItHappens: 'Some countries and regions are restricted due to international regulations, sanctions, or company policy.',
      howItAffects: 'You cannot access the API from this location. This cannot be fixed without changing your physical location or network.'
    },
    PERMISSION_DENIED: {
      whatItMeans: 'Your API key does not have permission to access this specific resource or feature.',
      whyItHappens: 'The API key you are using has limited permissions, and the action you are trying to perform requires higher access.',
      howItAffects: 'This specific request will fail, but other requests with lower permission requirements may still work.'
    },
    NOT_FOUND: {
      whatItMeans: 'The system tried to find something (like a model or resource) but it does not exist.',
      whyItHappens: 'You might have typed the model name wrong, or the resource you are looking for was deleted or never existed.',
      howItAffects: 'This request will fail, but fixing the resource name or ID will resolve the issue.'
    },
    RATE_LIMIT: {
      whatItMeans: 'You are sending requests too quickly. The API has a speed limit, and you have exceeded it.',
      whyItHappens: 'This happens when you send too many requests in a short time, or when multiple users share the same API key.',
      howItAffects: 'New requests will be temporarily blocked. The system will automatically slow down and retry.'
    },
    QUOTA_EXCEEDED: {
      whatItMeans: 'You have used up all your available credits or hit your monthly spending limit.',
      whyItHappens: 'Your account has a budget cap, and you have reached it. No more requests can be made until you add more credits.',
      howItAffects: 'All requests will fail until you purchase more credits or increase your spending limit.'
    },
    INTERNAL_SERVER_ERROR: {
      whatItMeans: 'Something went wrong on OpenAI\'s servers. This is not your fault - it is a problem on their end.',
      whyItHappens: 'The server encountered an unexpected error while processing your request. This could be a temporary glitch or a bug.',
      howItAffects: 'This request failed, but retrying in a few seconds will likely work. The system will automatically retry.'
    },
    ENGINE_OVERLOADED: {
      whatItMeans: 'OpenAI\'s servers are experiencing very high traffic right now and cannot handle more requests.',
      whyItHappens: 'Too many people are using the API at the same time, overwhelming the servers.',
      howItAffects: 'Requests will be delayed or fail temporarily. The system will automatically retry when traffic decreases.'
    },
    SLOW_DOWN: {
      whatItMeans: 'You increased your request rate too quickly, and the system is asking you to slow down gradually.',
      whyItHappens: 'A sudden spike in traffic can overload the system. OpenAI wants you to ramp up slowly to maintain stability.',
      howItAffects: 'The system will automatically reduce the request rate and gradually increase it over 15 minutes.'
    },
    CONNECTION_ERROR: {
      whatItMeans: 'Your computer cannot connect to OpenAI\'s servers. This is a network problem.',
      whyItHappens: 'This could be due to internet connectivity issues, firewall blocking, or DNS problems.',
      howItAffects: 'No requests can reach the server. Check your internet connection and firewall settings.'
    },
    TIMEOUT_ERROR: {
      whatItMeans: 'Your request took too long to complete and was cancelled.',
      whyItHappens: 'The server was too slow to respond, possibly due to high load or a complex request.',
      howItAffects: 'This request failed, but retrying will likely work. The system will automatically retry.'
    },
    CONTENT_POLICY_VIOLATION: {
      whatItMeans: 'Your request contains content that violates OpenAI\'s usage policies (inappropriate, unsafe, or harmful content).',
      whyItHappens: 'The AI detected content that could be harmful, illegal, or against OpenAI\'s content policy guidelines.',
      howItAffects: 'This request is permanently blocked. You must modify the content to comply with usage policies.'
    },
    TOKEN_LIMIT_EXCEEDED: {
      whatItMeans: 'Your request contains too many tokens (words/characters) and exceeds the model\'s maximum context length.',
      whyItHappens: 'The combined length of your messages, system prompt, and requested response exceeds the model\'s limit (e.g., 4096, 8192, or 128k tokens).',
      howItAffects: 'Request is rejected. You need to reduce message history, shorten prompts, or use a model with larger context window.'
    },
    INVALID_CONTENT_TYPE: {
      whatItMeans: 'The request header Content-Type is incorrect or missing. API expects application/json.',
      whyItHappens: 'The HTTP request was sent with wrong Content-Type header (e.g., text/plain instead of application/json).',
      howItAffects: 'Request is rejected. This is a code-level issue that requires fixing the HTTP headers.'
    },
    MODEL_DEPRECATED: {
      whatItMeans: 'The AI model you are trying to use has been deprecated and is no longer available.',
      whyItHappens: 'OpenAI periodically retires old models and replaces them with newer, better versions.',
      howItAffects: 'All requests to this model will fail. You must update your code to use a supported model (e.g., gpt-4, gpt-3.5-turbo).'
    },
    BILLING_HARD_LIMIT: {
      whatItMeans: 'Your organization has reached its hard billing limit set in the OpenAI dashboard.',
      whyItHappens: 'A hard limit was configured to prevent unexpected charges, and your usage has hit that ceiling.',
      howItAffects: 'All API requests are blocked until you increase the hard limit or wait for the billing cycle to reset.'
    },
    ORGANIZATION_SUSPENDED: {
      whatItMeans: 'Your OpenAI organization account has been suspended or deactivated.',
      whyItHappens: 'This happens due to payment issues, policy violations, or administrative actions by OpenAI.',
      howItAffects: 'Complete API access is blocked. You must contact OpenAI support to resolve the suspension.'
    },
    BAD_GATEWAY: {
      whatItMeans: 'The gateway or proxy server received an invalid response from OpenAI\'s upstream server.',
      whyItHappens: 'This is a temporary infrastructure issue, often caused by server restarts or network problems between proxy layers.',
      howItAffects: 'Request failed but is temporary. The system will automatically retry with exponential backoff.'
    },
    GATEWAY_TIMEOUT: {
      whatItMeans: 'The gateway server did not receive a response from OpenAI\'s upstream server in time.',
      whyItHappens: 'The upstream server is taking too long to process requests, possibly due to high load or complex operations.',
      howItAffects: 'Request failed but is temporary. The system will automatically retry with longer timeout.'
    }
  };
  
  return explanations[code] || {
    whatItMeans: 'An unknown error occurred that is not documented in the API error list.',
    whyItHappens: 'The error type is not recognized, so the exact cause cannot be determined.',
    howItAffects: 'The system cannot automatically handle this error. Manual investigation is required.'
  };
}

function getCellarMessage(code: string, errorParam?: string): CellarMessage | undefined {
  const messages: Record<string, CellarMessage> = {
    INVALID_AUTH: {
      technical: [
        'Verify API key is correct in environment variables or config',
        'Check API key has not been revoked in OpenAI dashboard',
        'Ensure API key has required permissions for the endpoint',
        'Generate new API key if current one is compromised'
      ],
      business: [
        'Contact your OpenAI account administrator',
        'Verify your organization membership is active',
        'Check billing status to ensure account is in good standing'
      ],
      escalation: 'Include the raw error and API key (last 4 characters only) when contacting support'
    },
    INVALID_FORMAT: {
      technical: errorParam 
        ? [
            `The parameter "${errorParam}" is invalid or malformed`,
            'Check parameter type, format, and required constraints',
            'Verify parameter value matches API documentation',
            'Review OpenAI API Reference for this parameter'
          ]
        : [
            'Check JSON syntax and structure',
            'Verify all required fields are present',
            'Ensure Content-Type header is application/json',
            'Review request body against API schema'
          ],
      business: [
        'Report this issue to the developer',
        'Check API documentation for correct format',
        errorParam ? `The issue is specifically with parameter: ${errorParam}` : ''
      ].filter(Boolean),
      escalation: errorParam 
        ? `Parameter "${errorParam}" validation failed - provide the value sent and expected format`
        : 'Provide the request body and error message to the developer'
    },
    INSUFFICIENT_BALANCE: {
      technical: [
        'Check account balance via API or dashboard',
        'Verify payment method is valid'
      ],
      business: [
        'Go to DeepSeek dashboard and top up funds',
        'Check usage history to understand spending'
      ],
      escalation: 'Contact DeepSeek support if balance shows positive but error persists'
    },
    INVALID_PARAMETERS: {
      technical: [
        'Validate request parameters against API schema',
        'Check max_tokens and temperature values'
      ],
      business: [
        'Adjust settings in the UI to be within limits',
        'Consult DeepSeek documentation'
      ],
      escalation: 'Provide the parameter values used to the developer'
    },
    INCORRECT_API_KEY: {
      technical: [
        'Clear browser cache and cookies',
        'Verify API key has no extra spaces or characters',
        'Check API key is for the correct organization',
        'Generate new API key from OpenAI dashboard',
        'Update API key in all configuration files'
      ],
      business: [
        'Access OpenAI dashboard and verify API key',
        'Ensure you are using the latest generated key',
        'Update key in application settings'
      ],
      escalation: 'If issue persists after updating key, contact OpenAI support with request ID'
    },
    NO_ORGANIZATION: {
      technical: [
        'Cannot be resolved programmatically',
        'Requires organization membership'
      ],
      business: [
        'Contact OpenAI support to create new organization',
        'Ask existing organization owner to send invitation',
        'Accept pending organization invitations in email'
      ],
      escalation: 'This is a critical blocker - API cannot be used without organization membership'
    },
    IP_NOT_AUTHORIZED: {
      technical: [
        'Identify current public IP address',
        'Add IP to allowlist in OpenAI project settings',
        'If using VPN, disable it or add VPN IP to allowlist',
        'Check proxy configuration'
      ],
      business: [
        'Contact organization admin to update IP allowlist',
        'Provide current IP address for allowlist addition',
        'Consider using static IP for production systems'
      ],
      escalation: 'Include current IP address when requesting allowlist update'
    },
    REGION_NOT_SUPPORTED: {
      technical: [
        'Cannot be resolved without changing location',
        'Consider using VPN (not officially supported)',
        'Deploy application in supported region'
      ],
      business: [
        'Review OpenAI supported regions list',
        'Consider relocating infrastructure to supported region',
        'Contact OpenAI support for alternative solutions'
      ],
      escalation: 'This is a legal/compliance restriction and cannot be overridden'
    },
    PERMISSION_DENIED: {
      technical: [
        'Verify API key has required permissions',
        'Check resource belongs to your organization',
        'Ensure you are using correct project ID'
      ],
      business: [
        'Contact organization admin for permission upgrade',
        'Verify you have access to the requested resource',
        'Check if your plan includes this feature'
      ],
      escalation: 'Include resource details and current permissions when requesting access'
    },
    NOT_FOUND: {
      technical: [
        'Verify model name spelling and case',
        'Check if model is deprecated or removed',
        'Verify endpoint URL is correct',
        'Check resource ID format'
      ],
      business: [
        'Review OpenAI API documentation for correct model names',
        'Check if your plan includes access to this model',
        'Contact support for model availability'
      ],
      escalation: 'Include the exact model name and request details when contacting support'
    },
    QUOTA_EXCEEDED: {
      technical: [
        'Check current usage in OpenAI dashboard',
        'Verify billing information is up to date',
        'Consider implementing usage limits in application',
        'Monitor usage with API usage endpoints'
      ],
      business: [
        'Purchase additional credits or upgrade plan',
        'Set up usage alerts and budgets',
        'Review and optimize API usage patterns',
        'Consider implementing caching to reduce API calls'
      ],
      escalation: 'Include current usage metrics and billing details when contacting support'
    },
    INTERNAL_SERVER_ERROR: {
      technical: [
        'Wait a few seconds and retry your request',
        '🔗 Check https://status.openai.com for ongoing incidents or maintenance',
        'The system will automatically retry with exponential backoff',
        'If persistent after 4 retries, contact support with request details'
      ],
      business: [
        'This is an OpenAI server-side issue, not a problem with your setup',
        'Check https://status.openai.com for service status updates',
        'Automatic retries are already in progress',
        'If issue persists beyond 30 seconds, it may be a wider outage'
      ],
      escalation: 'Include timestamp, model used, and request ID (if available) when contacting OpenAI support'
    },
    CONTENT_POLICY_VIOLATION: {
      technical: [
        'Review OpenAI Usage Policies: https://openai.com/policies/usage-policies',
        'Implement content filtering before sending to API',
        'Check for inappropriate, harmful, or illegal content in prompts',
        'Use OpenAI Moderation API to pre-screen content'
      ],
      business: [
        'Your content violated OpenAI usage policies',
        'Modify the prompt to remove inappropriate content',
        'Review what types of content are prohibited',
        'Consider implementing content moderation in your application'
      ],
      escalation: 'If you believe this is a false positive, contact OpenAI support with the sanitized prompt'
    },
    TOKEN_LIMIT_EXCEEDED: {
      technical: [
        'Reduce message history length (keep only recent messages)',
        'Shorten system prompts and user inputs',
        'Use models with larger context windows (e.g., gpt-4-turbo-128k)',
        'Implement token counting before API calls',
        'Consider summarizing old messages instead of sending full history'
      ],
      business: [
        'Your conversation is too long for this model',
        'Clear some message history to continue',
        'Upgrade to a model with larger context capacity',
        'Start a new conversation if history is not needed'
      ],
      escalation: 'Calculate total tokens using tiktoken library and provide breakdown when reporting'
    },
    INVALID_CONTENT_TYPE: {
      technical: [
        'Set Content-Type header to "application/json"',
        'Verify HTTP request headers are correctly configured',
        'Check if using correct HTTP client library',
        'Ensure JSON body is properly stringified'
      ],
      business: [
        'This is a technical configuration error',
        'Contact your developer to fix HTTP headers',
        'The API requires JSON format for requests'
      ],
      escalation: 'Include HTTP request headers and client library version when reporting'
    },
    MODEL_DEPRECATED: {
      technical: [
        'Update model name to current version (e.g., gpt-4, gpt-3.5-turbo)',
        'Check OpenAI model deprecation schedule',
        'Review migration guide: https://platform.openai.com/docs/deprecations',
        'Update all references to old model in codebase'
      ],
      business: [
        'The AI model you are using is no longer available',
        'Switch to a newer, supported model',
        'Check OpenAI documentation for model alternatives',
        'Contact developer to update model configuration'
      ],
      escalation: 'Include deprecated model name and desired replacement when contacting support'
    },
    BILLING_HARD_LIMIT: {
      technical: [
        'Go to OpenAI dashboard → Settings → Billing → Limits',
        'Increase hard limit or remove it entirely',
        'Monitor usage to prevent hitting limit again',
        'Set up usage alerts before reaching limit'
      ],
      business: [
        'Your organization hit its spending hard limit',
        'Increase the limit in OpenAI billing settings',
        'Wait for billing cycle to reset (if monthly limit)',
        'Contact billing admin to adjust limits'
      ],
      escalation: 'Include current limit, usage, and requested new limit when contacting support'
    },
    ORGANIZATION_SUSPENDED: {
      technical: [
        'Cannot be resolved without OpenAI support intervention',
        'Check email for suspension notice from OpenAI',
        'Review account for policy violations or payment issues',
        'Prepare account details for support ticket'
      ],
      business: [
        'Your OpenAI account has been suspended',
        'Contact OpenAI support immediately: support@openai.com',
        'Check for payment failures or policy violations',
        'This requires direct resolution with OpenAI'
      ],
      escalation: 'URGENT: Contact OpenAI support with organization ID and account details'
    },
    BAD_GATEWAY: {
      technical: [
        'Automatic retry in progress with exponential backoff',
        'Check https://status.openai.com for infrastructure issues',
        'This is a temporary gateway/proxy error',
        'If persistent, may indicate OpenAI deployment in progress'
      ],
      business: [
        'Temporary server infrastructure issue',
        'System is automatically retrying',
        'Check OpenAI status page for updates',
        'Should resolve within seconds to minutes'
      ],
      escalation: 'If persists beyond 5 minutes, report to OpenAI with timestamp and region'
    },
    GATEWAY_TIMEOUT: {
      technical: [
        'Automatic retry in progress with longer timeout',
        'Check https://status.openai.com for performance issues',
        'Consider reducing request complexity if possible',
        'May indicate high server load'
      ],
      business: [
        'Server took too long to respond',
        'System is automatically retrying',
        'This is usually temporary during high traffic',
        'Check OpenAI status page for ongoing issues'
      ],
      escalation: 'If persists, report to OpenAI with request details and timestamp'
    }
  };
  
  return messages[code];
}

function getNextStep(code: string): string {
  if (isRetryable(code)) {
    return '🔄 Retrying automatically...';
  }
  return '🔧 Manual intervention required';
}

// ============================================================
// DEEPSEEK-SPECIFIC ERROR HANDLING
// ============================================================

const DEEPSEEK_ERROR_PATTERNS = {
  // 400 - Invalid Format
  DEEPSEEK_INVALID_FORMAT: {
    codes: [400],
    patterns: ['invalid request body format', 'invalid format', 'bad request'],
    severity: 'medium' as ErrorSeverity,
    retryable: false,
  },
  
  // 401 - Authentication Fails
  DEEPSEEK_AUTH_FAILS: {
    codes: [401],
    patterns: ['authentication fails', 'wrong api key', 'invalid api key'],
    severity: 'critical' as ErrorSeverity,
    retryable: false,
  },
  
  // 402 - Insufficient Balance
  DEEPSEEK_INSUFFICIENT_BALANCE: {
    codes: [402],
    patterns: ['insufficient balance', 'run out of balance', 'no balance'],
    severity: 'critical' as ErrorSeverity,
    retryable: false,
  },
  
  // 422 - Invalid Parameters
  DEEPSEEK_INVALID_PARAMETERS: {
    codes: [422],
    patterns: ['invalid parameters', 'invalid request parameters'],
    severity: 'medium' as ErrorSeverity,
    retryable: false,
  },
  
  // 429 - Rate Limit
  DEEPSEEK_RATE_LIMIT: {
    codes: [429],
    patterns: ['rate limit', 'sending requests too quickly', 'too many requests'],
    severity: 'medium' as ErrorSeverity,
    retryable: true,
  },
  
  // 500 - Server Error
  DEEPSEEK_SERVER_ERROR: {
    codes: [500],
    patterns: ['server error', 'server encounters an issue', 'internal server error'],
    severity: 'high' as ErrorSeverity,
    retryable: true,
  },
  
  // 503 - Server Overloaded
  DEEPSEEK_SERVER_OVERLOADED: {
    codes: [503],
    patterns: ['server overloaded', 'high traffic', 'service unavailable'],
    severity: 'high' as ErrorSeverity,
    retryable: true,
  },
};

function detectDeepSeekError(error: any): string {
  const statusCode = error.statusCode || error.status;
  const message = (error.message || '').toLowerCase();
  
  // Check each DeepSeek error pattern
  for (const [code, pattern] of Object.entries(DEEPSEEK_ERROR_PATTERNS)) {
    // Check status code match
    if (pattern.codes.includes(statusCode)) {
      // Check message pattern match
      if (pattern.patterns.some(p => message.includes(p))) {
        return code;
      }
    }
  }
  
  // Fallback to status code only
  if (statusCode === 400) return 'DEEPSEEK_INVALID_FORMAT';
  if (statusCode === 401) return 'DEEPSEEK_AUTH_FAILS';
  if (statusCode === 402) return 'DEEPSEEK_INSUFFICIENT_BALANCE';
  if (statusCode === 422) return 'DEEPSEEK_INVALID_PARAMETERS';
  if (statusCode === 429) return 'DEEPSEEK_RATE_LIMIT';
  if (statusCode === 500) return 'DEEPSEEK_SERVER_ERROR';
  if (statusCode === 503) return 'DEEPSEEK_SERVER_OVERLOADED';
  
  return 'UNKNOWN_ERROR';
}

function getDeepSeekPlainEnglish(code: string): PlainEnglishExplanation {
  const explanations: Record<string, PlainEnglishExplanation> = {
    DEEPSEEK_INVALID_FORMAT: {
      whatItMeans: 'Your request format is incorrect',
      whyItHappens: 'The request body doesn\'t match DeepSeek API requirements',
      howItAffects: 'Request rejected - need to fix the format'
    },
    DEEPSEEK_AUTH_FAILS: {
      whatItMeans: 'Authentication failed',
      whyItHappens: 'Wrong API key or invalid credentials',
      howItAffects: 'Cannot access DeepSeek API - need valid API key'
    },
    DEEPSEEK_INSUFFICIENT_BALANCE: {
      whatItMeans: 'Account balance is zero',
      whyItHappens: 'You\'ve run out of credits',
      howItAffects: 'Cannot make requests - need to add funds'
    },
    DEEPSEEK_INVALID_PARAMETERS: {
      whatItMeans: 'Request parameters are invalid',
      whyItHappens: 'One or more parameters don\'t match API requirements',
      howItAffects: 'Request rejected - need to fix parameters'
    },
    DEEPSEEK_RATE_LIMIT: {
      whatItMeans: 'Sending requests too quickly',
      whyItHappens: 'Exceeded DeepSeek rate limits',
      howItAffects: 'Temporarily blocked - will retry automatically'
    },
    DEEPSEEK_SERVER_ERROR: {
      whatItMeans: 'DeepSeek server encountered an issue',
      whyItHappens: 'Internal server problem on DeepSeek side',
      howItAffects: 'Temporary issue - will retry automatically'
    },
    DEEPSEEK_SERVER_OVERLOADED: {
      whatItMeans: 'DeepSeek servers are overloaded',
      whyItHappens: 'High traffic on DeepSeek platform',
      howItAffects: 'Temporary congestion - will retry automatically'
    }
  };
  
  return explanations[code] || {
    whatItMeans: 'Unknown error occurred',
    whyItHappens: 'Error details not recognized',
    howItAffects: 'Request failed'
  };
}

function getDeepSeekCellarMessage(code: string): CellarMessage {
  const messages: Record<string, CellarMessage> = {
    DEEPSEEK_INVALID_FORMAT: {
      technical: [
        'Check request body format against DeepSeek API docs',
        'Verify JSON structure is valid',
        'Ensure all required fields are present',
        'Check parameter types match API requirements'
      ],
      business: [
        'Request format needs correction',
        'Review DeepSeek API documentation',
        'Contact developer to fix request structure'
      ],
      escalation: 'Refer to DeepSeek API Docs: https://platform.deepseek.com/api-docs'
    },
    DEEPSEEK_AUTH_FAILS: {
      technical: [
        'Go to DeepSeek platform: https://platform.deepseek.com',
        'Navigate to API Keys section',
        'Create a new API key or verify existing one',
        'Update API key in application settings',
        'Ensure no extra spaces or characters in key'
      ],
      business: [
        'API key is invalid or missing',
        'Go to Settings → DeepSeek API Key',
        'Enter valid API key from DeepSeek platform',
        'Save and retry request'
      ],
      escalation: 'If you don\'t have an API key, create one at https://platform.deepseek.com'
    },
    DEEPSEEK_INSUFFICIENT_BALANCE: {
      technical: [
        'Go to DeepSeek platform: https://platform.deepseek.com',
        'Check account balance',
        'Navigate to Top up page',
        'Add funds to account',
        'Wait for payment confirmation'
      ],
      business: [
        'Account has run out of credits',
        'Go to DeepSeek platform',
        'Add funds to continue using API',
        'Consider setting up auto-recharge'
      ],
      escalation: 'Top up at https://platform.deepseek.com/top_up'
    },
    DEEPSEEK_INVALID_PARAMETERS: {
      technical: [
        'Review error message for specific parameter issues',
        'Check DeepSeek API docs for parameter requirements',
        'Verify parameter types and values',
        'Ensure model name is correct',
        'Check max_tokens, temperature are within valid ranges'
      ],
      business: [
        'Request parameters need correction',
        'Review error message hints',
        'Contact developer to fix parameters'
      ],
      escalation: 'Refer to DeepSeek API Docs: https://platform.deepseek.com/api-docs'
    },
    DEEPSEEK_RATE_LIMIT: {
      technical: [
        'Reduce request frequency',
        'Implement exponential backoff',
        'Consider request batching',
        'Monitor rate limit headers',
        'Temporarily switch to alternative providers (OpenAI, Claude)'
      ],
      business: [
        'Sending requests too quickly',
        'System will retry automatically',
        'Consider upgrading plan for higher limits',
        'Temporarily use alternative AI providers'
      ],
      escalation: 'Contact DeepSeek support for higher rate limits'
    },
    DEEPSEEK_SERVER_ERROR: {
      technical: [
        'Wait 1-2 minutes before retrying',
        'System will retry automatically',
        'Check DeepSeek status page',
        'If persists, contact DeepSeek support'
      ],
      business: [
        'DeepSeek server is experiencing issues',
        'System will retry automatically',
        'Usually resolves within minutes',
        'Consider using alternative providers temporarily'
      ],
      escalation: 'If persists >10 minutes, contact DeepSeek support'
    },
    DEEPSEEK_SERVER_OVERLOADED: {
      technical: [
        'Wait 30-60 seconds before retrying',
        'System will retry automatically with backoff',
        'Peak usage hours may have longer waits',
        'Consider request scheduling during off-peak hours'
      ],
      business: [
        'DeepSeek servers are experiencing high traffic',
        'System will retry automatically',
        'May take a few minutes to process',
        'Consider using alternative providers during peak hours'
      ],
      escalation: 'If consistently overloaded, contact DeepSeek about capacity'
    }
  };
  
  return messages[code] || {
    technical: ['Unknown error - check logs', 'Contact support with error details'],
    business: ['Unexpected error occurred', 'Contact technical support'],
    escalation: 'Contact DeepSeek support with full error details'
  };
}

export function analyzeDeepSeekError(error: any): ErrorAnalysis {
  const code = detectDeepSeekError(error);
  const pattern = DEEPSEEK_ERROR_PATTERNS[code as keyof typeof DEEPSEEK_ERROR_PATTERNS];
  
  return {
    rawError: error.message || JSON.stringify(error),
    code,
    severity: pattern?.severity || 'high',
    retryable: pattern?.retryable || false,
    plainEnglish: getDeepSeekPlainEnglish(code),
    cellarMessage: getDeepSeekCellarMessage(code),
    nextStep: pattern?.retryable ? '🔄 Retrying automatically...' : '🔧 Manual intervention required'
  };
}

// ============================================================
// GEMINI-SPECIFIC ERROR HANDLING
// ============================================================

const GEMINI_ERROR_PATTERNS = {
  // 400 - Invalid Argument
  GEMINI_INVALID_ARGUMENT: {
    codes: [400],
    patterns: ['invalid_argument', 'malformed', 'invalid request body', 'bad request'],
    severity: 'medium' as ErrorSeverity,
    retryable: false,
  },
  
  // 400 - Failed Precondition (Billing)
  GEMINI_FAILED_PRECONDITION: {
    codes: [400],
    patterns: ['failed_precondition', 'free tier not available', 'enable billing', 'billing not enabled'],
    severity: 'critical' as ErrorSeverity,
    retryable: false,
  },
  
  // 403 - Permission Denied
  GEMINI_PERMISSION_DENIED: {
    codes: [403],
    patterns: ['permission_denied', 'required permissions', 'api key'],
    severity: 'critical' as ErrorSeverity,
    retryable: false,
  },
  
  // 404 - Not Found
  GEMINI_NOT_FOUND: {
    codes: [404],
    patterns: ['not_found', 'not found', 'resource not found'],
    severity: 'medium' as ErrorSeverity,
    retryable: false,
  },
  
  // 429 - Resource Exhausted (Rate Limit)
  GEMINI_RESOURCE_EXHAUSTED: {
    codes: [429],
    patterns: ['resource_exhausted', 'rate limit', 'quota exceeded', 'too many requests'],
    severity: 'medium' as ErrorSeverity,
    retryable: true,
  },
  
  // 500 - Internal Error
  GEMINI_INTERNAL: {
    codes: [500],
    patterns: ['internal', 'unexpected error', 'google\'s side'],
    severity: 'high' as ErrorSeverity,
    retryable: true,
  },
  
  // 503 - Unavailable
  GEMINI_UNAVAILABLE: {
    codes: [503],
    patterns: ['unavailable', 'overloaded', 'temporarily down', 'service unavailable'],
    severity: 'high' as ErrorSeverity,
    retryable: true,
  },
  
  // 504 - Deadline Exceeded
  GEMINI_DEADLINE_EXCEEDED: {
    codes: [504],
    patterns: ['deadline_exceeded', 'deadline exceeded', 'timeout', 'unable to finish'],
    severity: 'high' as ErrorSeverity,
    retryable: true,
  },
  
  // Safety Block (No specific HTTP code)
  GEMINI_SAFETY_BLOCK: {
    codes: [],
    patterns: ['safety', 'blocked', 'blockedreason', 'content blocked', 'safety filter'],
    severity: 'high' as ErrorSeverity,
    retryable: false,
  },
};

function detectGeminiError(error: any): string {
  const statusCode = error.statusCode || error.status;
  const message = (error.message || '').toLowerCase();
  const statusText = String(error.status || '').toLowerCase();
  
  // Check for safety block first (special case)
  if (message.includes('safety') || message.includes('blocked') || statusText.includes('blocked')) {
    return 'GEMINI_SAFETY_BLOCK';
  }
  
  // Check for failed precondition (billing issue)
  if (statusCode === 400 && (message.includes('billing') || message.includes('free tier') || statusText.includes('failed_precondition'))) {
    return 'GEMINI_FAILED_PRECONDITION';
  }
  
  // Check each Gemini error pattern
  for (const [code, pattern] of Object.entries(GEMINI_ERROR_PATTERNS)) {
    // Check status code match
    if (pattern.codes.length > 0 && pattern.codes.includes(statusCode)) {
      // Check message or status pattern match
      if (pattern.patterns.some(p => message.includes(p) || statusText.includes(p))) {
        return code;
      }
    }
  }
  
  // Fallback to status code only
  if (statusCode === 400) return 'GEMINI_INVALID_ARGUMENT';
  if (statusCode === 403) return 'GEMINI_PERMISSION_DENIED';
  if (statusCode === 404) return 'GEMINI_NOT_FOUND';
  if (statusCode === 429) return 'GEMINI_RESOURCE_EXHAUSTED';
  if (statusCode === 500) return 'GEMINI_INTERNAL';
  if (statusCode === 503) return 'GEMINI_UNAVAILABLE';
  if (statusCode === 504) return 'GEMINI_DEADLINE_EXCEEDED';
  
  return 'UNKNOWN_ERROR';
}

function getGeminiPlainEnglish(code: string): PlainEnglishExplanation {
  const explanations: Record<string, PlainEnglishExplanation> = {
    GEMINI_INVALID_ARGUMENT: {
      whatItMeans: 'Your request format is incorrect',
      whyItHappens: 'Request body is malformed or has missing/invalid fields',
      howItAffects: 'Request rejected - need to fix the format'
    },
    GEMINI_FAILED_PRECONDITION: {
      whatItMeans: 'Free tier not available or billing not enabled',
      whyItHappens: 'Free tier not supported in your region or billing not set up',
      howItAffects: 'Cannot use Gemini API - need to enable billing'
    },
    GEMINI_PERMISSION_DENIED: {
      whatItMeans: 'API key lacks required permissions',
      whyItHappens: 'Wrong API key or insufficient permissions',
      howItAffects: 'Cannot access Gemini API - need valid API key'
    },
    GEMINI_NOT_FOUND: {
      whatItMeans: 'Requested resource not found',
      whyItHappens: 'File, model, or resource doesn\'t exist',
      howItAffects: 'Request rejected - need to check resource path'
    },
    GEMINI_RESOURCE_EXHAUSTED: {
      whatItMeans: 'Exceeded rate limit',
      whyItHappens: 'Sending too many requests per minute',
      howItAffects: 'Temporarily blocked - will retry automatically'
    },
    GEMINI_INTERNAL: {
      whatItMeans: 'Unexpected error on Google\'s side',
      whyItHappens: 'Internal server issue or context too long',
      howItAffects: 'Temporary issue - will retry automatically'
    },
    GEMINI_UNAVAILABLE: {
      whatItMeans: 'Service temporarily overloaded',
      whyItHappens: 'High traffic or capacity issues',
      howItAffects: 'Temporary congestion - will retry automatically'
    },
    GEMINI_DEADLINE_EXCEEDED: {
      whatItMeans: 'Processing took too long',
      whyItHappens: 'Prompt/context too large or timeout exceeded',
      howItAffects: 'Request timed out - will retry with longer timeout'
    },
    GEMINI_SAFETY_BLOCK: {
      whatItMeans: 'Content blocked by safety filters',
      whyItHappens: 'Content violates safety guidelines or terms of service',
      howItAffects: 'Request blocked - need to modify content'
    }
  };
  
  return explanations[code] || {
    whatItMeans: 'Unknown error occurred',
    whyItHappens: 'Error details not recognized',
    howItAffects: 'Request failed'
  };
}

function getGeminiCellarMessage(code: string): CellarMessage {
  const messages: Record<string, CellarMessage> = {
    GEMINI_INVALID_ARGUMENT: {
      technical: [
        'Check API reference for correct request format',
        'Verify all required fields are present',
        'Ensure using correct API version (/v1 or /v1beta)',
        'Validate parameter values (temperature: 0.0-1.0, candidate count: 1-8)',
        'Check for typos in request body'
      ],
      business: [
        'Request format needs correction',
        'Review Gemini API documentation',
        'Contact developer to fix request structure',
        'Verify API version compatibility'
      ],
      escalation: 'Refer to Gemini API Docs: https://ai.google.dev/api'
    },
    GEMINI_FAILED_PRECONDITION: {
      technical: [
        'Go to Google AI Studio: https://aistudio.google.com/app/apikey',
        'Enable billing on your project',
        'Set up a paid plan',
        'Verify region supports Gemini API',
        'Check billing status in Google Cloud Console'
      ],
      business: [
        'Free tier not available in your region',
        'Billing needs to be enabled',
        'Go to Google AI Studio to set up billing',
        'Contact admin to enable paid plan'
      ],
      escalation: 'Set up billing at https://aistudio.google.com/app/apikey'
    },
    GEMINI_PERMISSION_DENIED: {
      technical: [
        'Go to Google AI Studio: https://aistudio.google.com/app/apikey',
        'Verify API key is correct',
        'Check API key has required permissions',
        'For tuned models, ensure proper authentication',
        'Regenerate API key if needed'
      ],
      business: [
        'API key is invalid or lacks permissions',
        'Go to Settings → Gemini API Key',
        'Enter valid API key from Google AI Studio',
        'Save and retry request'
      ],
      escalation: 'Create/verify API key at https://aistudio.google.com/app/apikey'
    },
    GEMINI_NOT_FOUND: {
      technical: [
        'Verify resource path is correct',
        'Check file references (image/audio/video) exist',
        'Ensure using supported model name',
        'Verify API version supports requested feature',
        'Check model list: https://ai.google.dev/gemini-api/docs/models/gemini'
      ],
      business: [
        'Requested resource not found',
        'Check file paths and model names',
        'Contact developer to verify resource IDs',
        'Ensure using supported Gemini model'
      ],
      escalation: 'Refer to supported models: https://ai.google.dev/gemini-api/docs/models/gemini'
    },
    GEMINI_RESOURCE_EXHAUSTED: {
      technical: [
        'Reduce request frequency',
        'Implement exponential backoff (done automatically)',
        'Check rate limits: https://ai.google.dev/gemini-api/docs/rate-limits',
        'Request quota increase if needed',
        'Consider request batching'
      ],
      business: [
        'Sending requests too quickly',
        'System will retry automatically',
        'Consider upgrading plan for higher limits',
        'Request quota increase if needed'
      ],
      escalation: 'Request quota increase: https://ai.google.dev/gemini-api/docs/rate-limits#request-rate-limit-increase'
    },
    GEMINI_INTERNAL: {
      technical: [
        'Reduce input context length',
        'Temporarily switch to Gemini 1.5 Flash (lighter model)',
        'Wait 1-2 minutes and retry',
        'System will retry automatically',
        'Report persistent issues via Google AI Studio feedback'
      ],
      business: [
        'Google server experiencing issues',
        'System will retry automatically',
        'Usually resolves within minutes',
        'Consider using lighter model temporarily'
      ],
      escalation: 'If persists, report via "Send feedback" in Google AI Studio'
    },
    GEMINI_UNAVAILABLE: {
      technical: [
        'Temporarily switch to Gemini 1.5 Flash',
        'Wait 30-60 seconds and retry',
        'System will retry automatically with backoff',
        'Peak hours may have longer waits',
        'Report persistent issues via Google AI Studio feedback'
      ],
      business: [
        'Gemini service temporarily overloaded',
        'System will retry automatically',
        'May take a few minutes to process',
        'Consider using during off-peak hours'
      ],
      escalation: 'If persists, report via "Send feedback" in Google AI Studio'
    },
    GEMINI_DEADLINE_EXCEEDED: {
      technical: [
        'Set larger timeout in client request',
        'Reduce prompt/context size',
        'System will retry with increased timeout',
        'Consider breaking large requests into smaller chunks',
        'Use streaming for long responses'
      ],
      business: [
        'Request processing took too long',
        'System will retry with longer timeout',
        'Consider reducing input size',
        'Contact developer if issue persists'
      ],
      escalation: 'If persists with reasonable input, contact Google AI support'
    },
    GEMINI_SAFETY_BLOCK: {
      technical: [
        'Review prompt content against safety guidelines',
        'Modify content to comply with policies',
        'Adjust safety settings in API call if appropriate',
        'Check terms of service: https://ai.google.dev/terms',
        'For BlockedReason.OTHER, content may violate ToS'
      ],
      business: [
        'Content blocked by safety filters',
        'Review and modify prompt content',
        'Ensure compliance with Google policies',
        'Contact developer to adjust content'
      ],
      escalation: 'Review terms of service: https://ai.google.dev/terms'
    }
  };
  
  return messages[code] || {
    technical: ['Unknown error - check logs', 'Contact support with error details'],
    business: ['Unexpected error occurred', 'Contact technical support'],
    escalation: 'Contact Google AI support with full error details'
  };
}

export function analyzeGeminiError(error: any): ErrorAnalysis {
  const code = detectGeminiError(error);
  const pattern = GEMINI_ERROR_PATTERNS[code as keyof typeof GEMINI_ERROR_PATTERNS];
  
  return {
    rawError: error.message || JSON.stringify(error),
    code,
    severity: pattern?.severity || 'high',
    retryable: pattern?.retryable || false,
    plainEnglish: getGeminiPlainEnglish(code),
    cellarMessage: getGeminiCellarMessage(code),
    nextStep: pattern?.retryable ? '🔄 Retrying automatically...' : '🔧 Manual intervention required'
  };
}

// ============================================================
// CLAUDE-SPECIFIC ERROR HANDLING
// ============================================================

const CLAUDE_ERROR_PATTERNS = {
  // 400 - Invalid Request
  CLAUDE_INVALID_REQUEST: {
    codes: [400],
    patterns: ['invalid_request_error', 'invalid request', 'malformed', 'bad request'],
    severity: 'medium' as ErrorSeverity,
    retryable: false,
  },

  // 401 - Authentication Error
  CLAUDE_AUTHENTICATION_ERROR: {
    codes: [401],
    patterns: ['authentication_error', 'authentication', 'api key', 'unauthorized'],
    severity: 'critical' as ErrorSeverity,
    retryable: false,
  },

  // 403 - Permission Error
  CLAUDE_PERMISSION_ERROR: {
    codes: [403],
    patterns: ['permission_error', 'permission', 'forbidden', 'not have permission'],
    severity: 'critical' as ErrorSeverity,
    retryable: false,
  },

  // 404 - Not Found
  CLAUDE_NOT_FOUND: {
    codes: [404],
    patterns: ['not_found_error', 'not found', 'resource could not be found'],
    severity: 'medium' as ErrorSeverity,
    retryable: false,
  },

  // 413 - Request Too Large
  CLAUDE_REQUEST_TOO_LARGE: {
    codes: [413],
    patterns: ['request_too_large', 'too large', 'exceeds maximum', 'payload too large'],
    severity: 'medium' as ErrorSeverity,
    retryable: false,
  },

  // 429 - Rate Limit
  CLAUDE_RATE_LIMIT: {
    codes: [429],
    patterns: ['rate_limit_error', 'rate limit', 'too many requests'],
    severity: 'medium' as ErrorSeverity,
    retryable: true,
  },

  // 500 - API Error
  CLAUDE_API_ERROR: {
    codes: [500],
    patterns: ['api_error', 'internal error', 'unexpected error'],
    severity: 'high' as ErrorSeverity,
    retryable: true,
  },

  // 529 - Overloaded
  CLAUDE_OVERLOADED: {
    codes: [529],
    patterns: ['overloaded_error', 'overloaded', 'temporarily overloaded', 'high traffic'],
    severity: 'high' as ErrorSeverity,
    retryable: true,
  },
};

function detectClaudeError(error: any): string {
  const statusCode = error.statusCode || error.status || error.status_code;
  const message = (error.message || JSON.stringify(error) || '').toLowerCase();
  const errorType = (error.error?.type || error.type || '').toLowerCase();
  
  console.log('[detectClaudeError] Input:', { statusCode, message: message.substring(0, 200), errorType });
  
  // Check error type from API response first
  if (errorType.includes('authentication_error')) return 'CLAUDE_AUTHENTICATION_ERROR';
  if (errorType.includes('permission_error')) return 'CLAUDE_PERMISSION_ERROR';
  if (errorType.includes('not_found_error')) return 'CLAUDE_NOT_FOUND';
  if (errorType.includes('request_too_large')) return 'CLAUDE_REQUEST_TOO_LARGE';
  if (errorType.includes('rate_limit_error')) return 'CLAUDE_RATE_LIMIT';
  if (errorType.includes('api_error')) return 'CLAUDE_API_ERROR';
  if (errorType.includes('overloaded_error')) return 'CLAUDE_OVERLOADED';
  if (errorType.includes('invalid_request_error')) return 'CLAUDE_INVALID_REQUEST';
  
  // Check each Claude error pattern with status code + message
  for (const [code, pattern] of Object.entries(CLAUDE_ERROR_PATTERNS)) {
    // Check status code match
    if (pattern.codes.length > 0 && pattern.codes.includes(statusCode)) {
      // Check message pattern match
      if (pattern.patterns.some(p => message.includes(p) || errorType.includes(p))) {
        return code;
      }
    }
  }
  
  // Fallback to status code only
  if (statusCode === 400) return 'CLAUDE_INVALID_REQUEST';
  if (statusCode === 401) return 'CLAUDE_AUTHENTICATION_ERROR';
  if (statusCode === 403) return 'CLAUDE_PERMISSION_ERROR';
  if (statusCode === 404) return 'CLAUDE_NOT_FOUND';
  if (statusCode === 413) return 'CLAUDE_REQUEST_TOO_LARGE';
  if (statusCode === 429) return 'CLAUDE_RATE_LIMIT';
  if (statusCode === 500) return 'CLAUDE_API_ERROR';
  if (statusCode === 529) return 'CLAUDE_OVERLOADED';
  
  // ===== NEW: Fallback to message pattern matching ALONE (when status code is missing) =====
  // Authentication errors - check for API key related messages
  if (message.includes('api key') || message.includes('invalid key') || message.includes('expired key') ||
      message.includes('authentication') || message.includes('unauthorized') || message.includes('401') ||
      message.includes('invalid_api_key') || message.includes('invalid or expired')) {
    console.log('[detectClaudeError] Matched AUTHENTICATION via message pattern');
    return 'CLAUDE_AUTHENTICATION_ERROR';
  }
  
  // Permission errors
  if (message.includes('permission') || message.includes('forbidden') || message.includes('403') ||
      message.includes('access denied') || message.includes('not have permission')) {
    console.log('[detectClaudeError] Matched PERMISSION via message pattern');
    return 'CLAUDE_PERMISSION_ERROR';
  }
  
  // Rate limit errors
  if (message.includes('rate limit') || message.includes('too many requests') || message.includes('429') ||
      message.includes('quota exceeded')) {
    console.log('[detectClaudeError] Matched RATE_LIMIT via message pattern');
    return 'CLAUDE_RATE_LIMIT';
  }
  
  // Not found errors
  if (message.includes('not found') || message.includes('404') || message.includes('model not found') ||
      message.includes('resource could not be found')) {
    console.log('[detectClaudeError] Matched NOT_FOUND via message pattern');
    return 'CLAUDE_NOT_FOUND';
  }
  
  // Request too large
  if (message.includes('too large') || message.includes('413') || message.includes('exceeds maximum') ||
      message.includes('payload too large')) {
    console.log('[detectClaudeError] Matched REQUEST_TOO_LARGE via message pattern');
    return 'CLAUDE_REQUEST_TOO_LARGE';
  }
  
  // Server/API errors
  if (message.includes('server error') || message.includes('500') || message.includes('internal error') ||
      message.includes('unexpected error')) {
    console.log('[detectClaudeError] Matched API_ERROR via message pattern');
    return 'CLAUDE_API_ERROR';
  }
  
  // Overloaded errors
  if (message.includes('overloaded') || message.includes('529') || message.includes('high traffic') ||
      message.includes('temporarily overloaded')) {
    console.log('[detectClaudeError] Matched OVERLOADED via message pattern');
    return 'CLAUDE_OVERLOADED';
  }
  
  // Invalid request
  if (message.includes('bad request') || message.includes('400') || message.includes('malformed') ||
      message.includes('invalid request')) {
    console.log('[detectClaudeError] Matched INVALID_REQUEST via message pattern');
    return 'CLAUDE_INVALID_REQUEST';
  }
  
  console.log('[detectClaudeError] No pattern matched, returning UNKNOWN_ERROR');
  return 'UNKNOWN_ERROR';
}

function getClaudePlainEnglish(code: string): PlainEnglishExplanation {
  const explanations: Record<string, PlainEnglishExplanation> = {
    CLAUDE_INVALID_REQUEST: {
      whatItMeans: 'Your request format is incorrect',
      whyItHappens: 'The request format or content doesn\'t match Claude API requirements',
      howItAffects: 'Request rejected - need to fix the format'
    },
    CLAUDE_AUTHENTICATION_ERROR: {
      whatItMeans: 'Authentication failed',
      whyItHappens: 'Your API key is invalid, missing, or expired',
      howItAffects: 'Cannot access Claude API - need valid API key'
    },
    CLAUDE_PERMISSION_ERROR: {
      whatItMeans: 'API key lacks required permissions',
      whyItHappens: 'Your API key doesn\'t have permission for this resource or feature',
      howItAffects: 'Cannot access this resource - need proper permissions'
    },
    CLAUDE_NOT_FOUND: {
      whatItMeans: 'Requested resource not found',
      whyItHappens: 'The resource, model, or endpoint doesn\'t exist',
      howItAffects: 'Request rejected - need to check resource path'
    },
    CLAUDE_REQUEST_TOO_LARGE: {
      whatItMeans: 'Request exceeds size limit',
      whyItHappens: 'Request is larger than 32 MB (or 256 MB for Batch API)',
      howItAffects: 'Request rejected - need to reduce request size'
    },
    CLAUDE_RATE_LIMIT: {
      whatItMeans: 'Exceeded rate limit',
      whyItHappens: 'Sending too many requests too quickly',
      howItAffects: 'Temporarily blocked - will retry automatically'
    },
    CLAUDE_API_ERROR: {
      whatItMeans: 'Unexpected error on Anthropic\'s side',
      whyItHappens: 'Internal server issue within Anthropic\'s systems',
      howItAffects: 'Temporary issue - will retry automatically'
    },
    CLAUDE_OVERLOADED: {
      whatItMeans: 'API is temporarily overloaded',
      whyItHappens: 'High traffic across all users or sharp increase in your usage',
      howItAffects: 'Temporary congestion - will retry automatically'
    },
  };
  return explanations[code] || {
    whatItMeans: 'Unknown error occurred',
    whyItHappens: 'Error details not recognized',
    howItAffects: 'Request failed'
  };
}

function getClaudeCellarMessage(code: string): CellarMessage {
  const messages: Record<string, CellarMessage> = {
    CLAUDE_INVALID_REQUEST: {
      technical: [
        'Check API reference for correct request format: https://docs.anthropic.com/en/api',
        'Verify all required fields are present and valid',
        'Ensure using correct API version',
        'Validate parameter values (max_tokens, temperature, etc.)',
        'Check for typos in request body'
      ],
      business: [
        'Request format needs correction',
        'Review Claude API documentation',
        'Contact developer to fix request structure',
        'Verify API version compatibility'
      ],
      escalation: 'Refer to Claude API Docs: https://docs.anthropic.com/en/api'
    },
    CLAUDE_AUTHENTICATION_ERROR: {
      technical: [
        'Go to Anthropic Console: https://console.anthropic.com',
        'Verify API key is correct and not expired',
        'Check API key format (should start with "sk-ant-")',
        'Regenerate API key if needed',
        'Ensure API key is properly set in environment variables'
      ],
      business: [
        'API key is invalid or expired',
        'Go to Settings → Claude API Key',
        'Enter valid API key from Anthropic Console',
        'Save and retry request'
      ],
      escalation: 'Get API key at https://console.anthropic.com/settings/keys'
    },
    CLAUDE_PERMISSION_ERROR: {
      technical: [
        'Verify API key has required permissions',
        'Check if trying to access beta features without access',
        'Ensure workspace/organization has proper access',
        'Contact Anthropic support to request feature access',
        'Review API key permissions in console'
      ],
      business: [
        'API key lacks required permissions',
        'Contact admin to grant proper access',
        'May need to upgrade plan for this feature',
        'Contact Anthropic support if needed'
      ],
      escalation: 'Contact Anthropic support: https://support.anthropic.com'
    },
    CLAUDE_NOT_FOUND: {
      technical: [
        'Verify resource path/ID is correct',
        'Check if using correct model name (e.g., "claude-3-5-sonnet-20241022")',
        'Ensure endpoint URL is correct',
        'Verify API version supports requested feature',
        'Check model availability: https://docs.anthropic.com/en/docs/about-claude/models'
      ],
      business: [
        'Requested resource not found',
        'Check model names and resource IDs',
        'Contact developer to verify resource paths',
        'Ensure using supported Claude model'
      ],
      escalation: 'Refer to Claude models: https://docs.anthropic.com/en/docs/about-claude/models'
    },
    CLAUDE_REQUEST_TOO_LARGE: {
      technical: [
        'Reduce request size (max 32 MB for Messages API)',
        'For Batch API, max is 256 MB',
        'Split large requests into smaller chunks',
        'Reduce context length or number of messages',
        'Consider using streaming for large responses'
      ],
      business: [
        'Request is too large',
        'Need to reduce input size',
        'Contact developer to optimize request',
        'Consider breaking into smaller requests'
      ],
      escalation: 'Review size limits: https://docs.anthropic.com/en/docs/build-with-claude/errors'
    },
    CLAUDE_RATE_LIMIT: {
      technical: [
        'Reduce request frequency',
        'Implement exponential backoff (done automatically)',
        'Consider request batching',
        'Monitor rate limit headers',
        'Request rate limit increase if needed'
      ],
      business: [
        'Sending requests too quickly',
        'System will retry automatically',
        'Consider upgrading plan for higher limits',
        'Ramp up traffic gradually to avoid acceleration limits'
      ],
      escalation: 'Contact Anthropic to request higher rate limits'
    },
    CLAUDE_API_ERROR: {
      technical: [
        'Wait 1-2 minutes before retrying',
        'System will retry automatically',
        'Check Anthropic status page',
        'If persists, contact Anthropic support',
        'Include request_id when reporting'
      ],
      business: [
        'Anthropic server experiencing issues',
        'System will retry automatically',
        'Usually resolves within minutes',
        'Consider using alternative providers temporarily'
      ],
      escalation: 'If persists >10 minutes, contact Anthropic support with request_id'
    },
    CLAUDE_OVERLOADED: {
      technical: [
        'Wait 30-60 seconds before retrying',
        'System will retry automatically with backoff',
        'Ramp up traffic gradually to avoid acceleration limits',
        'Use streaming API for long requests',
        'Consider Message Batches API for non-urgent requests'
      ],
      business: [
        'Claude API temporarily overloaded',
        'System will retry automatically',
        'High traffic period - may take a few minutes',
        'Consider using during off-peak hours'
      ],
      escalation: 'If frequent 529 errors, contact Anthropic to discuss usage patterns'
    },
  };
  return messages[code] || {
    technical: ['Unknown error - check logs', 'Contact support with error details'],
    business: ['Unexpected error occurred', 'Contact technical support'],
    escalation: 'Contact Anthropic support with full error details'
  };
}

export function analyzeClaudeError(error: any): ErrorAnalysis {
  const code = detectClaudeError(error);
  const pattern = CLAUDE_ERROR_PATTERNS[code as keyof typeof CLAUDE_ERROR_PATTERNS];

  return {
    rawError: error.message || JSON.stringify(error),
    code,
    severity: pattern?.severity || 'high',
    retryable: pattern?.retryable || false,
    plainEnglish: getClaudePlainEnglish(code),
    cellarMessage: getClaudeCellarMessage(code),
    nextStep: pattern?.retryable ? '🔄 Retrying automatically...' : '🔧 Manual intervention required'
  };
}

// ============================================================
// PERPLEXITY-SPECIFIC ERROR HANDLING
// ============================================================

const PERPLEXITY_ERROR_PATTERNS = {
  // Network/Connection Errors
  PERPLEXITY_CONNECTION_ERROR: {
    codes: [],
    patterns: ['apiconnectionerror', 'connection', 'network', 'timeout', 'econnrefused'],
    severity: 'high' as ErrorSeverity,
    retryable: true,
  },

  // 429 - Rate Limit
  PERPLEXITY_RATE_LIMIT: {
    codes: [429],
    patterns: ['ratelimiterror', 'rate limit', 'too many requests'],
    severity: 'medium' as ErrorSeverity,
    retryable: true,
  },

  // 400 - Bad Request / Validation Error
  PERPLEXITY_VALIDATION_ERROR: {
    codes: [400],
    patterns: ['validationerror', 'validation', 'invalid parameter', 'bad request'],
    severity: 'medium' as ErrorSeverity,
    retryable: false,
  },

  // 401 - Authentication Error
  PERPLEXITY_AUTHENTICATION_ERROR: {
    codes: [401],
    patterns: ['authenticationerror', 'authentication', 'invalid api key', 'unauthorized'],
    severity: 'critical' as ErrorSeverity,
    retryable: false,
  },

  // 403 - Permission Denied
  PERPLEXITY_PERMISSION_ERROR: {
    codes: [403],
    patterns: ['permission', 'forbidden', 'access denied'],
    severity: 'critical' as ErrorSeverity,
    retryable: false,
  },

  // 404 - Not Found
  PERPLEXITY_NOT_FOUND: {
    codes: [404],
    patterns: ['not found', 'resource not found', 'endpoint not found'],
    severity: 'medium' as ErrorSeverity,
    retryable: false,
  },

  // 500+ - Server Errors
  PERPLEXITY_SERVER_ERROR: {
    codes: [500, 502, 503, 504],
    patterns: ['apistatuserror', 'server error', 'internal error', 'service unavailable'],
    severity: 'high' as ErrorSeverity,
    retryable: true,
  },
};

function detectPerplexityError(error: any): string {
  const statusCode = error.statusCode || error.status || error.code;
  const message = (error.message || '').toLowerCase();
  const errorName = (error.constructor?.name || error.name || '').toLowerCase();
  
  // Debug logging
  console.log('[detectPerplexityError] statusCode:', statusCode);
  console.log('[detectPerplexityError] message:', message.substring(0, 200));
  console.log('[detectPerplexityError] errorName:', errorName);
  
  // Check for HTML error responses (common with 401 errors)
  if (message.includes('401 authorization required') || message.includes('<title>401')) {
    return 'PERPLEXITY_AUTHENTICATION_ERROR';
  }
  
  // Check error constructor name first (SDK-specific)
  if (errorName.includes('apiconnectionerror')) return 'PERPLEXITY_CONNECTION_ERROR';
  if (errorName.includes('ratelimiterror')) return 'PERPLEXITY_RATE_LIMIT';
  if (errorName.includes('validationerror')) return 'PERPLEXITY_VALIDATION_ERROR';
  if (errorName.includes('authenticationerror')) return 'PERPLEXITY_AUTHENTICATION_ERROR';
  if (errorName.includes('apistatuserror')) {
    // For APIStatusError, check status code
    if (statusCode === 429) return 'PERPLEXITY_RATE_LIMIT';
    if (statusCode === 400) return 'PERPLEXITY_VALIDATION_ERROR';
    if (statusCode === 401) return 'PERPLEXITY_AUTHENTICATION_ERROR';
    if (statusCode === 403) return 'PERPLEXITY_PERMISSION_ERROR';
    if (statusCode === 404) return 'PERPLEXITY_NOT_FOUND';
    if (statusCode >= 500) return 'PERPLEXITY_SERVER_ERROR';
  }
  
  // Check each Perplexity error pattern
  for (const [code, pattern] of Object.entries(PERPLEXITY_ERROR_PATTERNS)) {
    // Check status code match
    if (pattern.codes.length > 0 && statusCode && pattern.codes.includes(statusCode)) {
      // Check message pattern match
      if (pattern.patterns.some(p => message.includes(p) || errorName.includes(p))) {
        return code;
      }
    }
    // Check message/name patterns even without status code
    if (pattern.patterns.some(p => message.includes(p) || errorName.includes(p))) {
      return code;
    }
  }
  
  // Fallback to status code only
  if (statusCode === 400) return 'PERPLEXITY_VALIDATION_ERROR';
  if (statusCode === 401) return 'PERPLEXITY_AUTHENTICATION_ERROR';
  if (statusCode === 403) return 'PERPLEXITY_PERMISSION_ERROR';
  if (statusCode === 404) return 'PERPLEXITY_NOT_FOUND';
  if (statusCode === 429) return 'PERPLEXITY_RATE_LIMIT';
  if (statusCode >= 500) return 'PERPLEXITY_SERVER_ERROR';
  
  console.log('[detectPerplexityError] No pattern matched, returning UNKNOWN_ERROR');
  return 'UNKNOWN_ERROR';
}

function getPerplexityPlainEnglish(code: string): PlainEnglishExplanation {
  const explanations: Record<string, PlainEnglishExplanation> = {
    PERPLEXITY_CONNECTION_ERROR: {
      whatItMeans: 'Network connection failed',
      whyItHappens: 'Unable to reach Perplexity API servers due to network issues',
      howItAffects: 'Request failed - will retry automatically with backoff'
    },
    PERPLEXITY_RATE_LIMIT: {
      whatItMeans: 'API rate limit exceeded',
      whyItHappens: 'Sending too many requests too quickly',
      howItAffects: 'Temporarily blocked - will retry automatically with exponential backoff'
    },
    PERPLEXITY_VALIDATION_ERROR: {
      whatItMeans: 'Invalid request parameters',
      whyItHappens: 'Request parameters don\'t match API requirements',
      howItAffects: 'Request rejected - need to fix parameters'
    },
    PERPLEXITY_AUTHENTICATION_ERROR: {
      whatItMeans: 'Authentication failed',
      whyItHappens: 'API key is invalid, missing, or expired',
      howItAffects: 'Cannot access Perplexity API - need valid API key'
    },
    PERPLEXITY_PERMISSION_ERROR: {
      whatItMeans: 'Permission denied',
      whyItHappens: 'API key doesn\'t have access to requested resource',
      howItAffects: 'Cannot access this resource - need proper permissions'
    },
    PERPLEXITY_NOT_FOUND: {
      whatItMeans: 'Resource not found',
      whyItHappens: 'The requested endpoint, model, or resource doesn\'t exist',
      howItAffects: 'Request rejected - need to check resource path'
    },
    PERPLEXITY_SERVER_ERROR: {
      whatItMeans: 'Perplexity server error',
      whyItHappens: 'Internal server issue or service temporarily unavailable',
      howItAffects: 'Temporary issue - will retry automatically'
    },
  };
  return explanations[code] || {
    whatItMeans: 'Unknown error occurred',
    whyItHappens: 'Error details not recognized',
    howItAffects: 'Request failed'
  };
}

function getPerplexityCellarMessage(code: string): CellarMessage {
  const messages: Record<string, CellarMessage> = {
    PERPLEXITY_CONNECTION_ERROR: {
      technical: [
        'Check internet connection',
        'Verify firewall/proxy settings allow API access',
        'Test connectivity: ping api.perplexity.ai',
        'Check if VPN is interfering with connection',
        'System will retry automatically with shorter delays'
      ],
      business: [
        'Network connection issue',
        'System will retry automatically',
        'Usually resolves within seconds',
        'Check internet connection if persists'
      ],
      escalation: 'If persists >5 minutes, check network configuration or contact IT'
    },
    PERPLEXITY_RATE_LIMIT: {
      technical: [
        'Reduce request frequency',
        'Implement exponential backoff (done automatically)',
        'Consider request batching',
        'Monitor rate limit patterns',
        'Contact Perplexity to request higher limits'
      ],
      business: [
        'Sending requests too quickly',
        'System will retry automatically',
        'Consider upgrading plan for higher limits',
        'Spread requests over time'
      ],
      escalation: 'Contact Perplexity support to discuss rate limit increases'
    },
    PERPLEXITY_VALIDATION_ERROR: {
      technical: [
        'Check API docs: https://docs.perplexity.ai',
        'Verify all required parameters are present',
        'Validate parameter types and values',
        'Check model name is correct',
        'Review request payload format'
      ],
      business: [
        'Request parameters are incorrect',
        'Review API documentation',
        'Contact developer to fix request format',
        'Verify model names and parameters'
      ],
      escalation: 'Refer to Perplexity API Docs: https://docs.perplexity.ai'
    },
    PERPLEXITY_AUTHENTICATION_ERROR: {
      technical: [
        'Verify PERPLEXITY_API_KEY environment variable',
        'Check API key format and validity',
        'Regenerate API key if needed',
        'Ensure API key is properly set in config',
        'Test with curl: curl -H "Authorization: Bearer YOUR_KEY" https://api.perplexity.ai'
      ],
      business: [
        'API key is invalid or expired',
        'Go to Settings → Perplexity API Key',
        'Enter valid API key',
        'Save and retry request'
      ],
      escalation: 'Get API key from Perplexity dashboard'
    },
    PERPLEXITY_PERMISSION_ERROR: {
      technical: [
        'Verify API key has required permissions',
        'Check if accessing beta features without access',
        'Ensure account has proper subscription',
        'Review API key scope and permissions',
        'Contact Perplexity support for feature access'
      ],
      business: [
        'API key lacks required permissions',
        'May need to upgrade plan',
        'Contact admin to grant access',
        'Contact Perplexity support if needed'
      ],
      escalation: 'Contact Perplexity support to request feature access'
    },
    PERPLEXITY_NOT_FOUND: {
      technical: [
        'Verify endpoint URL is correct',
        'Check model name (e.g., "llama-3.1-sonar-small-128k-online")',
        'Ensure using correct API version',
        'Review available models in documentation',
        'Check for typos in resource paths'
      ],
      business: [
        'Requested resource not found',
        'Check model names and endpoints',
        'Contact developer to verify paths',
        'Ensure using supported models'
      ],
      escalation: 'Refer to Perplexity models: https://docs.perplexity.ai/guides/model-cards'
    },
    PERPLEXITY_SERVER_ERROR: {
      technical: [
        'Wait 1-2 minutes before retrying',
        'System will retry automatically',
        'Check Perplexity status page',
        'If persists, contact Perplexity support',
        'Include request ID when reporting'
      ],
      business: [
        'Perplexity server experiencing issues',
        'System will retry automatically',
        'Usually resolves within minutes',
        'Consider using alternative providers temporarily'
      ],
      escalation: 'If persists >10 minutes, contact Perplexity support with request details'
    },
  };
  return messages[code] || {
    technical: ['Unknown error - check logs', 'Contact support with error details'],
    business: ['Unexpected error occurred', 'Contact technical support'],
    escalation: 'Contact Perplexity support with full error details'
  };
}

export function analyzePerplexityError(error: any): ErrorAnalysis {
  const code = detectPerplexityError(error);
  const pattern = PERPLEXITY_ERROR_PATTERNS[code as keyof typeof PERPLEXITY_ERROR_PATTERNS];

  return {
    rawError: error.message || JSON.stringify(error),
    code,
    severity: pattern?.severity || 'high',
    retryable: pattern?.retryable || false,
    plainEnglish: getPerplexityPlainEnglish(code),
    cellarMessage: getPerplexityCellarMessage(code),
    nextStep: pattern?.retryable ? '🔄 Retrying automatically...' : '🔧 Manual intervention required'
  };
}

// ============================================================
// KIMI (MOONSHOT AI) SPECIFIC ERROR HANDLING
// ============================================================

const KIMI_ERROR_PATTERNS = {
  // 401 - Unauthorized
  KIMI_UNAUTHORIZED: {
    codes: [401],
    patterns: ['unauthorized', 'invalid api key', 'authentication', 'api key'],
    severity: 'critical' as ErrorSeverity,
    retryable: false,
  },

  // 429 - Rate Limit
  KIMI_RATE_LIMIT: {
    codes: [429],
    patterns: ['rate limit', 'too many requests', 'quota exceeded'],
    severity: 'medium' as ErrorSeverity,
    retryable: true,
  },

  // 400 - Bad Request
  KIMI_BAD_REQUEST: {
    codes: [400],
    patterns: ['bad request', 'malformed', 'invalid parameter', 'invalid json'],
    severity: 'medium' as ErrorSeverity,
    retryable: false,
  },

  // Model Not Found
  KIMI_MODEL_NOT_FOUND: {
    codes: [],
    patterns: ['model_not_found', 'model not found', 'invalid model', 'base_url'],
    severity: 'medium' as ErrorSeverity,
    retryable: false,
  },

  // Connection Error
  KIMI_CONNECTION_ERROR: {
    codes: [],
    patterns: ['connection error', 'timeout', 'network', 'econnrefused', 'proxy'],
    severity: 'high' as ErrorSeverity,
    retryable: true,
  },

  // Insufficient Funds
  KIMI_INSUFFICIENT_FUNDS: {
    codes: [],
    patterns: ['insufficient funds', 'no balance', 'credits', 'payment required'],
    severity: 'critical' as ErrorSeverity,
    retryable: false,
  },

  // 500+ - Server Errors
  KIMI_SERVER_ERROR: {
    codes: [500, 502, 503, 504],
    patterns: ['server error', 'internal error', 'service unavailable', 'bad gateway'],
    severity: 'high' as ErrorSeverity,
    retryable: true,
  },
};

function detectKimiError(error: any): string {
  const statusCode = error.statusCode || error.status;
  const message = (error.message || '').toLowerCase();
  const errorType = (error.error?.type || '').toLowerCase();
  
  // Check for specific error patterns in message
  if (message.includes('model_not_found') || message.includes('base_url')) return 'KIMI_MODEL_NOT_FOUND';
  if (message.includes('insufficient funds') || message.includes('no balance')) return 'KIMI_INSUFFICIENT_FUNDS';
  if (message.includes('connection error') || message.includes('timeout')) return 'KIMI_CONNECTION_ERROR';
  
  // Check each Kimi error pattern
  for (const [code, pattern] of Object.entries(KIMI_ERROR_PATTERNS)) {
    // Check status code match
    if (pattern.codes.length > 0 && pattern.codes.includes(statusCode)) {
      // Check message pattern match
      if (pattern.patterns.some(p => message.includes(p) || errorType.includes(p))) {
        return code;
      }
    }
    // Check message/type patterns even without status code
    if (pattern.patterns.some(p => message.includes(p) || errorType.includes(p))) {
      return code;
    }
  }
  
  // Fallback to status code only
  if (statusCode === 400) return 'KIMI_BAD_REQUEST';
  if (statusCode === 401) return 'KIMI_UNAUTHORIZED';
  if (statusCode === 429) return 'KIMI_RATE_LIMIT';
  if (statusCode >= 500) return 'KIMI_SERVER_ERROR';
  
  return 'UNKNOWN_ERROR';
}

function getKimiPlainEnglish(code: string): PlainEnglishExplanation {
  const explanations: Record<string, PlainEnglishExplanation> = {
    KIMI_UNAUTHORIZED: {
      whatItMeans: 'API key authentication failed',
      whyItHappens: 'API key is invalid, revoked, or has extra spaces/characters',
      howItAffects: 'Cannot access Kimi API - need valid API key'
    },
    KIMI_RATE_LIMIT: {
      whatItMeans: 'Rate limit exceeded',
      whyItHappens: 'Free tier: ~1 concurrent request, 3 requests/minute limit exceeded',
      howItAffects: 'Temporarily blocked - will retry automatically with exponential backoff'
    },
    KIMI_BAD_REQUEST: {
      whatItMeans: 'Request format is invalid',
      whyItHappens: 'Malformed JSON, invalid parameters, or wrong model format',
      howItAffects: 'Request rejected - need to fix request format'
    },
    KIMI_MODEL_NOT_FOUND: {
      whatItMeans: 'Model not recognized',
      whyItHappens: 'Using OpenAI SDK without setting base_url to Moonshot API',
      howItAffects: 'Request rejected - need to set base_url="https://api.moonshot.ai/v1"'
    },
    KIMI_CONNECTION_ERROR: {
      whatItMeans: 'Cannot reach Kimi API',
      whyItHappens: 'Network issues, proxy configuration, or timeout',
      howItAffects: 'Request failed - will retry automatically'
    },
    KIMI_INSUFFICIENT_FUNDS: {
      whatItMeans: 'Account has no balance',
      whyItHappens: 'Credits depleted or payment issue',
      howItAffects: 'Cannot make requests - need to add credits'
    },
    KIMI_SERVER_ERROR: {
      whatItMeans: 'Kimi server error',
      whyItHappens: 'Internal server issue or service temporarily unavailable',
      howItAffects: 'Temporary issue - will retry automatically'
    },
  };
  return explanations[code] || {
    whatItMeans: 'Unknown error occurred',
    whyItHappens: 'Error details not recognized',
    howItAffects: 'Request failed'
  };
}

function getKimiCellarMessage(code: string): CellarMessage {
  const messages: Record<string, CellarMessage> = {
    KIMI_UNAUTHORIZED: {
      technical: [
        'Go to Moonshot Console: https://platform.moonshot.ai/console',
        'Verify API key is copied correctly',
        'Check for extra spaces or characters in key',
        'Ensure key is in request header: Authorization: Bearer YOUR_KEY',
        'Regenerate API key if needed'
      ],
      business: [
        'API key is invalid or revoked',
        'Go to Settings → Kimi API Key',
        'Enter valid API key from Moonshot Console',
        'Save and retry request'
      ],
      escalation: 'Get API key at https://platform.moonshot.ai/console'
    },
    KIMI_RATE_LIMIT: {
      technical: [
        'Free tier limits: ~1 concurrent request, 3 requests/minute',
        'Implement exponential backoff (done automatically)',
        'Batch or queue requests',
        'Monitor usage via console dashboard',
        'Upgrade plan for higher limits'
      ],
      business: [
        'Exceeded free tier rate limits',
        'System will retry automatically',
        'Consider upgrading to paid plan',
        'Free tier: 1 concurrent, 3/min'
      ],
      escalation: 'Upgrade plan at https://platform.moonshot.ai/console for higher limits'
    },
    KIMI_BAD_REQUEST: {
      technical: [
        'Check API docs: https://platform.moonshot.ai/docs',
        'Verify JSON is properly formatted',
        'Validate all required parameters',
        'Check model parameter format',
        'Review request schema'
      ],
      business: [
        'Request format is incorrect',
        'Review Kimi API documentation',
        'Contact developer to fix request',
        'Verify parameter values'
      ],
      escalation: 'Refer to Kimi API Docs: https://platform.moonshot.ai/docs'
    },
    KIMI_MODEL_NOT_FOUND: {
      technical: [
        'Set base_url="https://api.moonshot.ai/v1" in OpenAI SDK',
        'Verify model name is correct (e.g., "moonshot-v1-8k")',
        'Ensure using Moonshot-compatible configuration',
        'Check SDK initialization code',
        'Do not use default OpenAI base_url'
      ],
      business: [
        'Model not found - SDK configuration issue',
        'Contact developer to set correct base_url',
        'Must use Moonshot API endpoint',
        'OpenAI SDK needs custom configuration'
      ],
      escalation: 'Refer to integration guide: https://platform.moonshot.ai/docs/guide/start-using-kimi-api'
    },
    KIMI_CONNECTION_ERROR: {
      technical: [
        'Check internet connection',
        'Verify firewall/proxy allows API access',
        'Adjust timeout settings in code',
        'Test connectivity: ping api.moonshot.ai',
        'Check if VPN is interfering'
      ],
      business: [
        'Network connection issue',
        'System will retry automatically',
        'Usually resolves within seconds',
        'Check internet connection if persists'
      ],
      escalation: 'If persists >5 minutes, check network configuration or contact IT'
    },
    KIMI_INSUFFICIENT_FUNDS: {
      technical: [
        'Check account balance in console',
        'Go to https://platform.moonshot.ai/console',
        'Add credits or upgrade plan',
        'Verify payment method',
        'Review usage and billing'
      ],
      business: [
        'Account has no remaining credits',
        'Go to Console → Billing',
        'Add credits to continue using API',
        'Consider upgrading to paid plan'
      ],
      escalation: 'Add credits at https://platform.moonshot.ai/console'
    },
    KIMI_SERVER_ERROR: {
      technical: [
        'Wait 1-2 minutes before retrying',
        'System will retry automatically',
        'Check Moonshot status page',
        'If persists, contact Moonshot support',
        'Include error details when reporting'
      ],
      business: [
        'Kimi server experiencing issues',
        'System will retry automatically',
        'Usually resolves within minutes',
        'Consider using alternative providers temporarily'
      ],
      escalation: 'If persists >10 minutes, contact Moonshot support'
    },
  };
  return messages[code] || {
    technical: ['Unknown error - check logs', 'Contact support with error details'],
    business: ['Unexpected error occurred', 'Contact technical support'],
    escalation: 'Contact Moonshot support with full error details'
  };
}

export function analyzeKimiError(error: any): ErrorAnalysis {
  const code = detectKimiError(error);
  const pattern = KIMI_ERROR_PATTERNS[code as keyof typeof KIMI_ERROR_PATTERNS];

  return {
    rawError: error.message || JSON.stringify(error),
    code,
    severity: pattern?.severity || 'high',
    retryable: pattern?.retryable || false,
    plainEnglish: getKimiPlainEnglish(code),
    cellarMessage: getKimiCellarMessage(code),
    nextStep: pattern?.retryable ? '🔄 Retrying automatically...' : '🔧 Manual intervention required'
  };
}

// ============================================================
// MISTRAL AI SPECIFIC ERROR HANDLING
// ============================================================

const MISTRAL_ERROR_PATTERNS = {
  // 401 - Unauthorized
  MISTRAL_UNAUTHORIZED: {
    codes: [401],
    patterns: ['unauthorized', 'invalid api key', 'authentication', 'missing api key'],
    severity: 'critical' as ErrorSeverity,
    retryable: false,
  },

  // 400 - Bad Request
  MISTRAL_BAD_REQUEST: {
    codes: [400],
    patterns: ['bad request', 'invalid parameter', 'malformed', 'invalid role'],
    severity: 'medium' as ErrorSeverity,
    retryable: false,
  },

  // 422 - Validation Error
  MISTRAL_VALIDATION_ERROR: {
    codes: [422],
    patterns: ['validation error', 'httpvalidationerror', 'unsupported parameter', 'schema'],
    severity: 'medium' as ErrorSeverity,
    retryable: false,
  },

  // 404 - Not Found
  MISTRAL_NOT_FOUND: {
    codes: [404],
    patterns: ['not found', 'resource not found', 'model not found', 'endpoint not found'],
    severity: 'medium' as ErrorSeverity,
    retryable: false,
  },

  // 429 - Rate Limit
  MISTRAL_RATE_LIMIT: {
    codes: [429],
    patterns: ['rate limit', 'too many requests', 'service tier capacity exceeded', 'quota exceeded'],
    severity: 'medium' as ErrorSeverity,
    retryable: true,
  },

  // Connection Error
  MISTRAL_CONNECTION_ERROR: {
    codes: [],
    patterns: ['connection error', 'connecterror', 'unable to connect', 'network'],
    severity: 'high' as ErrorSeverity,
    retryable: true,
  },

  // Timeout
  MISTRAL_TIMEOUT: {
    codes: [],
    patterns: ['timeout', 'timeoutexception', 'timed out'],
    severity: 'high' as ErrorSeverity,
    retryable: true,
  },

  // 500+ - Server Errors
  MISTRAL_SERVER_ERROR: {
    codes: [500, 502, 503, 504],
    patterns: ['server error', 'internal error', 'service unavailable', 'bad gateway'],
    severity: 'high' as ErrorSeverity,
    retryable: true,
  },
};

function detectMistralError(error: any): string {
  const statusCode = error.statusCode || error.status || error.status_code;
  const message = (error.message || '').toLowerCase();
  const errorType = (error.error?.type || error.type || '').toLowerCase();
  const errorName = (error.constructor?.name || error.name || '').toLowerCase();
  
  // Check for specific SDK error types
  if (errorName.includes('httpvalidationerror') || statusCode === 422) return 'MISTRAL_VALIDATION_ERROR';
  if (errorName.includes('connecterror') || message.includes('connection error')) return 'MISTRAL_CONNECTION_ERROR';
  if (errorName.includes('timeout') || message.includes('timeout')) return 'MISTRAL_TIMEOUT';
  
  // Check for service tier capacity exceeded (special 429 case)
  if (message.includes('service tier capacity exceeded')) return 'MISTRAL_RATE_LIMIT';
  
  // Check each Mistral error pattern
  for (const [code, pattern] of Object.entries(MISTRAL_ERROR_PATTERNS)) {
    // Check status code match
    if (pattern.codes.length > 0 && pattern.codes.includes(statusCode)) {
      // Check message pattern match
      if (pattern.patterns.some(p => message.includes(p) || errorType.includes(p) || errorName.includes(p))) {
        return code;
      }
    }
    // Check message/type/name patterns even without status code
    if (pattern.patterns.some(p => message.includes(p) || errorType.includes(p) || errorName.includes(p))) {
      return code;
    }
  }
  
  // Fallback to status code only
  if (statusCode === 400) return 'MISTRAL_BAD_REQUEST';
  if (statusCode === 401) return 'MISTRAL_UNAUTHORIZED';
  if (statusCode === 404) return 'MISTRAL_NOT_FOUND';
  if (statusCode === 422) return 'MISTRAL_VALIDATION_ERROR';
  if (statusCode === 429) return 'MISTRAL_RATE_LIMIT';
  if (statusCode >= 500) return 'MISTRAL_SERVER_ERROR';
  
  return 'UNKNOWN_ERROR';
}

function getMistralPlainEnglish(code: string): PlainEnglishExplanation {
  const explanations: Record<string, PlainEnglishExplanation> = {
    MISTRAL_UNAUTHORIZED: {
      whatItMeans: 'API key authentication failed',
      whyItHappens: 'API key is missing, incorrect, or associated with wrong service/endpoint',
      howItAffects: 'Cannot access Mistral API - need valid API key'
    },
    MISTRAL_BAD_REQUEST: {
      whatItMeans: 'Request format is invalid',
      whyItHappens: 'Invalid parameters, malformed JSON, or incorrect role field',
      howItAffects: 'Request rejected - need to fix request format'
    },
    MISTRAL_VALIDATION_ERROR: {
      whatItMeans: 'Request validation failed',
      whyItHappens: 'Unsupported parameters sent or type mismatch in request body',
      howItAffects: 'Request rejected - need to remove unsupported parameters'
    },
    MISTRAL_NOT_FOUND: {
      whatItMeans: 'Resource not found',
      whyItHappens: 'Model doesn\'t exist or endpoint URL is incorrect',
      howItAffects: 'Request rejected - need to verify model name and endpoint'
    },
    MISTRAL_RATE_LIMIT: {
      whatItMeans: 'Rate limit exceeded',
      whyItHappens: 'Free tier limits exceeded or service tier capacity full (shared pool)',
      howItAffects: 'Temporarily blocked - will retry automatically with exponential backoff'
    },
    MISTRAL_CONNECTION_ERROR: {
      whatItMeans: 'Cannot connect to Mistral server',
      whyItHappens: 'Network issues, firewall blocking, or server unreachable',
      howItAffects: 'Request failed - will retry automatically'
    },
    MISTRAL_TIMEOUT: {
      whatItMeans: 'Request timed out',
      whyItHappens: 'Server taking too long to respond or network latency',
      howItAffects: 'Request failed - will retry automatically'
    },
    MISTRAL_SERVER_ERROR: {
      whatItMeans: 'Mistral server error',
      whyItHappens: 'Internal server issue or service temporarily unavailable',
      howItAffects: 'Temporary issue - will retry automatically'
    },
  };
  return explanations[code] || {
    whatItMeans: 'Unknown error occurred',
    whyItHappens: 'Error details not recognized',
    howItAffects: 'Request failed'
  };
}

function getMistralCellarMessage(code: string): CellarMessage {
  const messages: Record<string, CellarMessage> = {
    MISTRAL_UNAUTHORIZED: {
      technical: [
        'Go to Mistral Console: https://console.mistral.ai/api-keys',
        'Verify API key is copied correctly',
        'Check using correct endpoint:',
        '  - Main API: https://api.mistral.ai/v1',
        '  - Codestral: https://codestral.mistral.ai/v1',
        'Ensure key is in Authorization header: Bearer YOUR_KEY'
      ],
      business: [
        'API key is invalid or missing',
        'Go to Settings → Mistral API Key',
        'Enter valid API key from Mistral Console',
        'Verify using correct endpoint for your model'
      ],
      escalation: 'Get API key at https://console.mistral.ai/api-keys'
    },
    MISTRAL_BAD_REQUEST: {
      technical: [
        'Check API docs: https://docs.mistral.ai/api',
        'Verify role field is correct (user, assistant, tool - not system)',
        'Validate JSON is properly formatted',
        'Check all required parameters are present',
        'Review request payload structure'
      ],
      business: [
        'Request format is incorrect',
        'Review Mistral API documentation',
        'Contact developer to fix request format',
        'Common issue: incorrect role field'
      ],
      escalation: 'Refer to Mistral API Docs: https://docs.mistral.ai/api'
    },
    MISTRAL_VALIDATION_ERROR: {
      technical: [
        'HTTPValidationError (422) - unsupported parameters',
        'Remove parameters not supported by Mistral API',
        'Check validation error details in response',
        'Common with OpenWebUI: disable usage settings',
        'Review schema requirements in API docs'
      ],
      business: [
        'Request contains unsupported parameters',
        'Contact developer to filter request payload',
        'May need to adjust integration settings',
        'Check compatibility with Mistral API'
      ],
      escalation: 'Review validation errors and remove unsupported parameters'
    },
    MISTRAL_NOT_FOUND: {
      technical: [
        'Verify model name is correct',
        'Check endpoint URL is properly formatted',
        'Ensure using correct API version (/v1)',
        'Review available models in documentation',
        'Test with curl to verify endpoint'
      ],
      business: [
        'Model or resource not found',
        'Check model names are correct',
        'Contact developer to verify endpoints',
        'Ensure using supported models'
      ],
      escalation: 'Refer to Mistral models: https://docs.mistral.ai/getting-started/models/models_overview/'
    },
    MISTRAL_RATE_LIMIT: {
      technical: [
        'Free tier: Very restrictive limits (RPS/TPM)',
        'Check limits: https://admin.mistral.ai/plateforme/limits',
        'Implement exponential backoff (done automatically)',
        'Service tier capacity exceeded: Shared pool is full',
        'Retry during off-peak hours or upgrade tier'
      ],
      business: [
        'Rate limit exceeded or capacity full',
        'System will retry automatically',
        'Free tier: Upgrade for production use',
        'Peak hours: Shared pool may be full'
      ],
      escalation: 'Upgrade tier at https://console.mistral.ai for higher limits'
    },
    MISTRAL_CONNECTION_ERROR: {
      technical: [
        'Check internet connection',
        'Verify firewall/proxy allows API access',
        'Test connectivity: ping api.mistral.ai',
        'Check if VPN is interfering',
        'System will retry automatically'
      ],
      business: [
        'Network connection issue',
        'System will retry automatically',
        'Usually resolves within seconds',
        'Check internet connection if persists'
      ],
      escalation: 'If persists >5 minutes, check network configuration or contact IT'
    },
    MISTRAL_TIMEOUT: {
      technical: [
        'Increase timeout settings in code',
        'System will retry automatically',
        'Check server status',
        'May indicate large request processing',
        'Consider reducing request size'
      ],
      business: [
        'Request timed out',
        'System will retry automatically',
        'Usually resolves on retry',
        'May need to reduce request complexity'
      ],
      escalation: 'If persists, contact Mistral support with request details'
    },
    MISTRAL_SERVER_ERROR: {
      technical: [
        'Wait 1-2 minutes before retrying',
        'System will retry automatically',
        'Check Mistral status page',
        'If persists, contact Mistral support',
        'Include error details when reporting'
      ],
      business: [
        'Mistral server experiencing issues',
        'System will retry automatically',
        'Usually resolves within minutes',
        'Consider using alternative providers temporarily'
      ],
      escalation: 'If persists >10 minutes, contact Mistral support'
    },
  };
  return messages[code] || {
    technical: ['Unknown error - check logs', 'Contact support with error details'],
    business: ['Unexpected error occurred', 'Contact technical support'],
    escalation: 'Contact Mistral support with full error details'
  };
}

export function analyzeMistralError(error: any): ErrorAnalysis {
  const code = detectMistralError(error);
  const pattern = MISTRAL_ERROR_PATTERNS[code as keyof typeof MISTRAL_ERROR_PATTERNS];

  return {
    rawError: error.message || JSON.stringify(error),
    code,
    severity: pattern?.severity || 'high',
    retryable: pattern?.retryable || false,
    plainEnglish: getMistralPlainEnglish(code),
    cellarMessage: getMistralCellarMessage(code),
    nextStep: pattern?.retryable ? '🔄 Retrying automatically...' : '🔧 Manual intervention required'
  };
}
