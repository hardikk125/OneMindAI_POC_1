/**
 * API ERROR HANDLER
 * =================
 * Centralized error handling for all API calls
 * 
 * CONSTRAINTS (from ERR-001):
 * 1. All async API calls MUST be wrapped in try/catch
 * 2. Show user-friendly error message on failure
 * 3. Log error with timestamp and context
 * 4. Implement 3-retry with exponential backoff
 * 5. Never expose raw stack traces to users
 * 
 * @see docs/ERROR_REGISTRY.md#ERR-001
 * @see src/__tests__/regression/api-error-handling.test.ts
 */

// =============================================================================
// TYPES
// =============================================================================

export interface ApiErrorContext {
  endpoint: string;
  method: string;
  timestamp: string;
  retryCount: number;
  requestId?: string;
}

export interface ApiError {
  message: string;
  userMessage: string;
  context: ApiErrorContext;
  statusCode?: number;
  // NOTE: originalError is kept for internal logging only, NEVER expose to user
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
  success: boolean;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,  // 1 second
  maxDelay: 10000,  // 10 seconds max
};

/**
 * User-friendly error messages mapped by HTTP status code
 * CONSTRAINT: Never expose technical details to users
 */
const USER_MESSAGES: Record<number, string> = {
  400: 'Invalid request. Please check your input and try again.',
  401: 'Your session has expired. Please log in again.',
  403: 'You don\'t have permission to perform this action.',
  404: 'The requested resource was not found.',
  408: 'Request timed out. Please try again.',
  409: 'This action conflicts with another operation. Please refresh and try again.',
  422: 'The provided data is invalid. Please check and try again.',
  429: 'Too many requests. Please wait a moment and try again.',
  500: 'Server error. Our team has been notified.',
  502: 'Service temporarily unavailable. Please try again shortly.',
  503: 'Service is under maintenance. Please try again later.',
  504: 'Request timed out. Please try again.',
};

const DEFAULT_USER_MESSAGE = 'Something went wrong. Please try again.';
const NETWORK_ERROR_MESSAGE = 'Unable to connect. Please check your internet connection.';

// =============================================================================
// ERROR HANDLER
// =============================================================================

/**
 * Converts any error to a user-friendly ApiError
 * CONSTRAINT: Must NEVER include stack traces or sensitive paths
 */
export function handleApiError(
  error: unknown,
  context: Omit<ApiErrorContext, 'timestamp'>
): ApiError {
  const timestamp = new Date().toISOString();
  let message = 'Unknown error';
  let userMessage = DEFAULT_USER_MESSAGE;
  let statusCode: number | undefined;

  if (error instanceof Error) {
    message = error.message;

    // Check for network errors
    if (
      message.includes('Network') ||
      message.includes('fetch') ||
      message.includes('ECONNREFUSED') ||
      message.includes('ETIMEDOUT') ||
      message.includes('Failed to fetch')
    ) {
      userMessage = NETWORK_ERROR_MESSAGE;
    }
    // Check for HTTP status codes in error message
    else {
      const statusMatch = message.match(/(\d{3})/);
      if (statusMatch) {
        statusCode = parseInt(statusMatch[1], 10);
        userMessage = USER_MESSAGES[statusCode] || DEFAULT_USER_MESSAGE;
      }
    }
  } else if (typeof error === 'string') {
    message = error;
  }

  return {
    message,
    userMessage,
    statusCode,
    context: { ...context, timestamp },
  };
}

// =============================================================================
// RETRY LOGIC
// =============================================================================

/**
 * Wraps an async function with retry logic and exponential backoff
 * CONSTRAINT: Max 3 retries with exponential backoff (1s, 2s, 4s)
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const { maxRetries, baseDelay, maxDelay } = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on certain errors
      if (shouldNotRetry(lastError)) {
        throw lastError;
      }

      if (attempt < maxRetries) {
        // Exponential backoff with jitter
        const delay = Math.min(
          baseDelay * Math.pow(2, attempt) + Math.random() * 100,
          maxDelay
        );
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

/**
 * Determines if an error should NOT be retried
 */
function shouldNotRetry(error: Error): boolean {
  const message = error.message.toLowerCase();
  
  // Don't retry auth errors
  if (message.includes('401') || message.includes('403')) {
    return true;
  }
  
  // Don't retry validation errors
  if (message.includes('400') || message.includes('422')) {
    return true;
  }
  
  // Don't retry not found
  if (message.includes('404')) {
    return true;
  }
  
  return false;
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// =============================================================================
// SAFE API CALL
// =============================================================================

/**
 * Safe wrapper for all API calls
 * CONSTRAINT: All API calls in the app MUST use this wrapper
 * 
 * @example
 * const { data, error, success } = await safeApiCall<User>('/api/users/123');
 * if (!success) {
 *   showToast(error.userMessage);
 *   return;
 * }
 * // Use data safely
 */
export async function safeApiCall<T>(
  endpoint: string,
  options: RequestInit = {},
  retryConfig?: Partial<RetryConfig>
): Promise<ApiResponse<T>> {
  const method = options.method || 'GET';
  const requestId = generateRequestId();
  let retryCount = 0;

  try {
    const result = await withRetry(async () => {
      retryCount++;
      const response = await fetch(endpoint, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status}: ${response.statusText}. ${errorBody}`);
      }

      // Handle empty responses
      const text = await response.text();
      if (!text) {
        return null as T;
      }

      return JSON.parse(text) as T;
    }, retryConfig);

    return { data: result, success: true };
  } catch (error) {
    const apiError = handleApiError(error, { endpoint, method, retryCount, requestId });

    // Log error for debugging (internal only)
    logApiError(apiError, error);

    return { error: apiError, success: false };
  }
}

// =============================================================================
// LOGGING
// =============================================================================

/**
 * Logs API errors for debugging
 * CONSTRAINT: Log context but NEVER log stack traces to external services
 */
function logApiError(apiError: ApiError, originalError: unknown): void {
  // Console log for development
  if (process.env.NODE_ENV === 'development') {
    console.error('[API Error]', {
      endpoint: apiError.context.endpoint,
      method: apiError.context.method,
      timestamp: apiError.context.timestamp,
      retryCount: apiError.context.retryCount,
      requestId: apiError.context.requestId,
      message: apiError.message,
      statusCode: apiError.statusCode,
      // In dev, we can log the original error for debugging
      originalError: originalError instanceof Error ? originalError.message : originalError,
    });
  } else {
    // In production, send to error tracking service
    // BUT never include stack traces or sensitive data
    console.error('[API Error]', {
      endpoint: apiError.context.endpoint,
      method: apiError.context.method,
      timestamp: apiError.context.timestamp,
      statusCode: apiError.statusCode,
      requestId: apiError.context.requestId,
      // Sanitized message only
      message: apiError.userMessage,
    });
  }
}

/**
 * Generates a unique request ID for tracing
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// =============================================================================
// CONVENIENCE METHODS
// =============================================================================

/**
 * GET request wrapper
 */
export async function apiGet<T>(
  endpoint: string,
  options?: Omit<RequestInit, 'method'>
): Promise<ApiResponse<T>> {
  return safeApiCall<T>(endpoint, { ...options, method: 'GET' });
}

/**
 * POST request wrapper
 */
export async function apiPost<T>(
  endpoint: string,
  body: unknown,
  options?: Omit<RequestInit, 'method' | 'body'>
): Promise<ApiResponse<T>> {
  return safeApiCall<T>(endpoint, {
    ...options,
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * PUT request wrapper
 */
export async function apiPut<T>(
  endpoint: string,
  body: unknown,
  options?: Omit<RequestInit, 'method' | 'body'>
): Promise<ApiResponse<T>> {
  return safeApiCall<T>(endpoint, {
    ...options,
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

/**
 * DELETE request wrapper
 */
export async function apiDelete<T>(
  endpoint: string,
  options?: Omit<RequestInit, 'method'>
): Promise<ApiResponse<T>> {
  return safeApiCall<T>(endpoint, { ...options, method: 'DELETE' });
}

/**
 * PATCH request wrapper
 */
export async function apiPatch<T>(
  endpoint: string,
  body: unknown,
  options?: Omit<RequestInit, 'method' | 'body'>
): Promise<ApiResponse<T>> {
  return safeApiCall<T>(endpoint, {
    ...options,
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  safeApiCall,
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
  apiPatch,
  handleApiError,
  withRetry,
};
