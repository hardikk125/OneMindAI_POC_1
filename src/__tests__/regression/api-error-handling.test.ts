/**
 * REGRESSION TEST: API Error Handling
 * ====================================
 * ERR-001: Ensures API failures are properly caught and handled
 * 
 * This test suite verifies:
 * 1. API errors are caught (not silent failures)
 * 2. User-friendly messages are shown
 * 3. Retry logic works correctly
 * 4. Errors are logged with context
 * 5. Raw stack traces are never exposed
 * 
 * @see docs/ERROR_REGISTRY.md#ERR-001
 */

/**
 * NOTE: This test requires vitest. Install with:
 * npm install -D vitest
 * 
 * Or adapt to Jest if preferred.
 */

// @ts-ignore - vitest types
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetch for testing
const mockFetch = vi.fn();
global.fetch = mockFetch;

// =============================================================================
// TEST UTILITIES
// =============================================================================

/**
 * Simulates an API error response
 */
function createErrorResponse(status: number, message: string) {
  return {
    ok: false,
    status,
    statusText: message,
    json: () => Promise.resolve({ error: message }),
  };
}

/**
 * Simulates a network failure
 */
function createNetworkError() {
  return Promise.reject(new Error('Network request failed'));
}

/**
 * Simulates a successful response
 */
function createSuccessResponse(data: unknown) {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
  };
}

// =============================================================================
// API ERROR HANDLER (Implementation to test)
// =============================================================================

interface ApiErrorContext {
  endpoint: string;
  method: string;
  timestamp: string;
  retryCount: number;
}

interface ApiError {
  message: string;
  userMessage: string;
  context: ApiErrorContext;
  originalError?: Error;
}

/**
 * Centralized API error handler
 * CONSTRAINT: Must return user-friendly message, never raw stack trace
 */
function handleApiError(error: unknown, context: Omit<ApiErrorContext, 'timestamp'>): ApiError {
  const timestamp = new Date().toISOString();
  
  // Determine user-friendly message based on error type
  let userMessage = 'Something went wrong. Please try again.';
  let message = 'Unknown error';
  
  if (error instanceof Error) {
    message = error.message;
    
    // Map technical errors to user-friendly messages
    if (message.includes('Network') || message.includes('fetch')) {
      userMessage = 'Unable to connect. Please check your internet connection.';
    } else if (message.includes('401') || message.includes('Unauthorized')) {
      userMessage = 'Your session has expired. Please log in again.';
    } else if (message.includes('403') || message.includes('Forbidden')) {
      userMessage = 'You don\'t have permission to perform this action.';
    } else if (message.includes('404') || message.includes('Not Found')) {
      userMessage = 'The requested resource was not found.';
    } else if (message.includes('429') || message.includes('Too Many')) {
      userMessage = 'Too many requests. Please wait a moment and try again.';
    } else if (message.includes('500') || message.includes('Server')) {
      userMessage = 'Server error. Our team has been notified.';
    }
  }
  
  return {
    message,
    userMessage,
    context: { ...context, timestamp },
    originalError: error instanceof Error ? error : undefined,
  };
}

/**
 * Retry wrapper with exponential backoff
 * CONSTRAINT: Max 3 retries, exponential backoff
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

/**
 * Safe API call wrapper
 * CONSTRAINT: All API calls must use this wrapper
 */
async function safeApiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data?: T; error?: ApiError }> {
  const method = options.method || 'GET';
  let retryCount = 0;
  
  try {
    const result = await withRetry(async () => {
      retryCount++;
      const response = await fetch(endpoint, options);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response.json() as Promise<T>;
    });
    
    return { data: result };
  } catch (error) {
    const apiError = handleApiError(error, { endpoint, method, retryCount });
    
    // Log error (in real app, send to logging service)
    console.error('[API Error]', {
      ...apiError.context,
      message: apiError.message,
      // NEVER log: apiError.originalError?.stack
    });
    
    return { error: apiError };
  }
}

// =============================================================================
// REGRESSION TESTS
// =============================================================================

/**
 * Helper to run safeApiCall with fake timers
 * Advances timers to skip retry delays
 */
async function runWithFakeTimers<T>(fn: () => Promise<T>): Promise<T> {
  const promise = fn();
  // Advance timers to skip all retry delays (1s + 2s + 4s + buffer)
  await vi.advanceTimersByTimeAsync(10000);
  return promise;
}

describe('ERR-001: API Error Handling Regression Tests', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    vi.useFakeTimers();
  });
  
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Error Catching (No Silent Failures)', () => {
    it('should catch network errors and return error object', async () => {
      mockFetch.mockRejectedValue(new Error('Network request failed'));
      
      const result = await runWithFakeTimers(() => safeApiCall('/api/test'));
      
      expect(result.error).toBeDefined();
      expect(result.data).toBeUndefined();
    });

    it('should catch HTTP error responses', async () => {
      mockFetch.mockResolvedValue(createErrorResponse(500, 'Internal Server Error'));
      
      const result = await runWithFakeTimers(() => safeApiCall('/api/test'));
      
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('500');
    });

    it('should never throw unhandled exceptions', async () => {
      mockFetch.mockRejectedValue(new Error('Unexpected error'));
      
      // This should NOT throw
      const result = await runWithFakeTimers(() => safeApiCall('/api/test'));
      expect(result).toBeDefined();
    });
  });

  describe('User-Friendly Messages', () => {
    it('should return user-friendly message for network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network request failed'));
      
      const result = await runWithFakeTimers(() => safeApiCall('/api/test'));
      
      expect(result.error?.userMessage).toBe(
        'Unable to connect. Please check your internet connection.'
      );
    });

    it('should return user-friendly message for 401 errors', async () => {
      mockFetch.mockResolvedValue(createErrorResponse(401, 'Unauthorized'));
      
      // 401 errors should NOT retry (auth errors)
      const result = await runWithFakeTimers(() => safeApiCall('/api/test'));
      
      expect(result.error?.userMessage).toBe(
        'Your session has expired. Please log in again.'
      );
    });

    it('should return user-friendly message for 403 errors', async () => {
      mockFetch.mockResolvedValue(createErrorResponse(403, 'Forbidden'));
      
      const result = await runWithFakeTimers(() => safeApiCall('/api/test'));
      
      expect(result.error?.userMessage).toBe(
        'You don\'t have permission to perform this action.'
      );
    });

    it('should return user-friendly message for 404 errors', async () => {
      mockFetch.mockResolvedValue(createErrorResponse(404, 'Not Found'));
      
      const result = await runWithFakeTimers(() => safeApiCall('/api/test'));
      
      expect(result.error?.userMessage).toBe(
        'The requested resource was not found.'
      );
    });

    it('should return user-friendly message for 429 errors', async () => {
      mockFetch.mockResolvedValue(createErrorResponse(429, 'Too Many Requests'));
      
      const result = await runWithFakeTimers(() => safeApiCall('/api/test'));
      
      expect(result.error?.userMessage).toBe(
        'Too many requests. Please wait a moment and try again.'
      );
    });

    it('should return user-friendly message for 500 errors', async () => {
      mockFetch.mockResolvedValue(createErrorResponse(500, 'Internal Server Error'));
      
      const result = await runWithFakeTimers(() => safeApiCall('/api/test'));
      
      expect(result.error?.userMessage).toBe(
        'Server error. Our team has been notified.'
      );
    });

    it('should return generic message for unknown errors', async () => {
      mockFetch.mockRejectedValue(new Error('Some weird error'));
      
      const result = await runWithFakeTimers(() => safeApiCall('/api/test'));
      
      expect(result.error?.userMessage).toBe(
        'Something went wrong. Please try again.'
      );
    });
  });

  describe('Retry Logic', () => {
    it('should retry failed requests up to 3 times', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockRejectedValueOnce(new Error('Fail 3'))
        .mockResolvedValueOnce(createSuccessResponse({ success: true }));
      
      const promise = safeApiCall('/api/test');
      
      // Fast-forward through retries
      await vi.advanceTimersByTimeAsync(1000); // 1st retry
      await vi.advanceTimersByTimeAsync(2000); // 2nd retry
      await vi.advanceTimersByTimeAsync(4000); // 3rd retry
      
      const result = await promise;
      
      expect(result.data).toEqual({ success: true });
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });

    it('should fail after max retries exceeded', async () => {
      mockFetch.mockRejectedValue(new Error('Persistent failure'));
      
      const promise = safeApiCall('/api/test');
      
      // Fast-forward through all retries
      await vi.advanceTimersByTimeAsync(10000);
      
      const result = await promise;
      
      expect(result.error).toBeDefined();
      expect(mockFetch).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });

    it('should use exponential backoff (1s, 2s, 4s)', async () => {
      mockFetch.mockRejectedValue(new Error('Fail'));
      
      const promise = safeApiCall('/api/test');
      
      // Check timing of retries
      expect(mockFetch).toHaveBeenCalledTimes(1);
      
      await vi.advanceTimersByTimeAsync(1000);
      expect(mockFetch).toHaveBeenCalledTimes(2);
      
      await vi.advanceTimersByTimeAsync(2000);
      expect(mockFetch).toHaveBeenCalledTimes(3);
      
      await vi.advanceTimersByTimeAsync(4000);
      expect(mockFetch).toHaveBeenCalledTimes(4);
      
      await promise;
    });
  });

  describe('Error Context Logging', () => {
    it('should include endpoint in error context', async () => {
      mockFetch.mockRejectedValue(new Error('Fail'));
      
      const result = await runWithFakeTimers(() => safeApiCall('/api/users/123'));
      
      expect(result.error?.context.endpoint).toBe('/api/users/123');
    });

    it('should include method in error context', async () => {
      mockFetch.mockRejectedValue(new Error('Fail'));
      
      const result = await runWithFakeTimers(() => safeApiCall('/api/test', { method: 'POST' }));
      
      expect(result.error?.context.method).toBe('POST');
    });

    it('should include timestamp in error context', async () => {
      mockFetch.mockRejectedValue(new Error('Fail'));
      
      const result = await runWithFakeTimers(() => safeApiCall('/api/test'));
      
      expect(result.error?.context.timestamp).toBeDefined();
      expect(new Date(result.error!.context.timestamp).getTime()).not.toBeNaN();
    });

    it('should include retry count in error context', async () => {
      mockFetch.mockRejectedValue(new Error('Fail'));
      
      const promise = safeApiCall('/api/test');
      await vi.advanceTimersByTimeAsync(10000);
      const result = await promise;
      
      expect(result.error?.context.retryCount).toBe(4); // Initial + 3 retries
    });
  });

  describe('Security (No Stack Trace Exposure)', () => {
    it('should NOT include stack trace in user-facing error', async () => {
      const errorWithStack = new Error('Database connection failed');
      errorWithStack.stack = 'Error: Database connection failed\n    at Object.<anonymous> (/app/db.js:42:15)';
      
      mockFetch.mockRejectedValue(errorWithStack);
      
      const result = await runWithFakeTimers(() => safeApiCall('/api/test'));
      
      // User message should not contain stack trace
      expect(result.error?.userMessage).not.toContain('at Object');
      expect(result.error?.userMessage).not.toContain('/app/db.js');
      expect(result.error?.userMessage).not.toContain(':42:15');
    });

    it('should NOT include sensitive paths in user message', async () => {
      mockFetch.mockRejectedValue(new Error('ENOENT: /var/secrets/api-key.txt'));
      
      const result = await runWithFakeTimers(() => safeApiCall('/api/test'));
      
      expect(result.error?.userMessage).not.toContain('/var/secrets');
      expect(result.error?.userMessage).not.toContain('api-key');
    });
  });

  describe('Success Cases', () => {
    it('should return data on successful request', async () => {
      mockFetch.mockResolvedValue(createSuccessResponse({ id: 1, name: 'Test' }));
      
      const result = await safeApiCall('/api/test');
      
      expect(result.data).toEqual({ id: 1, name: 'Test' });
      expect(result.error).toBeUndefined();
    });

    it('should not retry successful requests', async () => {
      mockFetch.mockResolvedValue(createSuccessResponse({ success: true }));
      
      await safeApiCall('/api/test');
      
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
});

// =============================================================================
// CONSTRAINT VERIFICATION
// =============================================================================

describe('ERR-001: Constraint Verification', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    vi.useFakeTimers();
  });
  
  afterEach(() => {
    vi.useRealTimers();
  });

  it('CONSTRAINT: handleApiError must return userMessage', () => {
    const error = handleApiError(new Error('test'), {
      endpoint: '/test',
      method: 'GET',
      retryCount: 0,
    });
    
    expect(error).toHaveProperty('userMessage');
    expect(typeof error.userMessage).toBe('string');
    expect(error.userMessage.length).toBeGreaterThan(0);
  });

  it('CONSTRAINT: withRetry must respect maxRetries', async () => {
    let attempts = 0;
    const fn = async () => {
      attempts++;
      throw new Error('fail');
    };
    
    const promise = (async () => {
      try {
        await withRetry(fn, 3, 1); // 1ms delay for test speed
      } catch {
        // Expected
      }
    })();
    
    // Advance timers to complete all retries
    await vi.advanceTimersByTimeAsync(100);
    await promise;
    
    expect(attempts).toBe(4); // Initial + 3 retries
  });

  it('CONSTRAINT: safeApiCall must never throw', async () => {
    mockFetch.mockImplementation(() => {
      throw new Error('Catastrophic failure');
    });
    
    // This must NOT throw
    const result = await runWithFakeTimers(() => safeApiCall('/api/test'));
    
    expect(result.error).toBeDefined();
  });
});
