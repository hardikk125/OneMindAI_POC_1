/**
 * Retry Manager with Exponential Backoff
 * Handles automatic retries for transient errors
 */

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export interface RetryContext {
  attempt: number;
  lastError: any;
  totalDelay: number;
}

export class RetryManager {
  private config: RetryConfig;
  private activeRetries: Map<string, RetryContext> = new Map();

  constructor(config?: Partial<RetryConfig>) {
    this.config = {
      maxRetries: 4,
      baseDelay: 1000, // 1 second
      maxDelay: 32000, // 32 seconds
      backoffMultiplier: 2,
      ...config
    };
  }

  /**
   * Calculate delay with exponential backoff
   * Pattern: 1s → 2s → 4s → 8s → 16s (capped at maxDelay)
   */
  calculateDelay(attempt: number): number {
    const delay = Math.min(
      this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attempt),
      this.config.maxDelay
    );
    
    // Add jitter (randomness) to prevent thundering herd
    const jitter = delay * 0.1 * Math.random();
    return Math.floor(delay + jitter);
  }

  /**
   * Execute function with automatic retry
   */
  async executeWithRetry<T>(
    key: string,
    fn: () => Promise<T>,
    shouldRetry: (error: any) => boolean,
    onRetry?: (attempt: number, delay: number, error: any) => void
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const result = await fn();
        this.activeRetries.delete(key);
        return result;
      } catch (error: any) {
        lastError = error;

        // Check if we should retry
        if (!shouldRetry(error) || attempt >= this.config.maxRetries) {
          this.activeRetries.delete(key);
          throw error;
        }

        // Calculate delay and wait
        const delay = this.calculateDelay(attempt);
        
        // Update retry context
        this.activeRetries.set(key, {
          attempt: attempt + 1,
          lastError: error,
          totalDelay: delay
        });

        // Notify callback
        if (onRetry) {
          onRetry(attempt + 1, delay, error);
        }

        console.log(`[RetryManager] Attempt ${attempt + 1}/${this.config.maxRetries} failed. Retrying in ${delay}ms...`);
        
        await this.sleep(delay);
      }
    }

    this.activeRetries.delete(key);
    throw lastError;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getRetryContext(key: string): RetryContext | undefined {
    return this.activeRetries.get(key);
  }

  reset(key: string) {
    this.activeRetries.delete(key);
  }
}
