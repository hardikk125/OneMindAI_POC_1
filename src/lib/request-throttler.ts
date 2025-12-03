/**
 * Request Throttler
 * Manages request rate limiting and adaptive throttling
 */

export interface ThrottleConfig {
  maxRequestsPerSecond: number;
  burstLimit: number;
  adaptiveThrottling: boolean;
}

export class RequestThrottler {
  private config: ThrottleConfig;
  private requestTimestamps: number[] = [];
  private isThrottled: boolean = false;
  private throttleUntil: number = 0;
  private originalRate: number;

  constructor(config?: Partial<ThrottleConfig>) {
    this.config = {
      maxRequestsPerSecond: 10,
      burstLimit: 20,
      adaptiveThrottling: true,
      ...config
    };
    this.originalRate = this.config.maxRequestsPerSecond;
  }

  /**
   * Wait if necessary to respect rate limits
   */
  async throttle(): Promise<void> {
    // Check if we're in a throttled period
    if (this.isThrottled && Date.now() < this.throttleUntil) {
      const waitTime = this.throttleUntil - Date.now();
      console.log(`[Throttler] Throttled. Waiting ${waitTime}ms...`);
      await this.sleep(waitTime);
      this.isThrottled = false;
    }

    // Clean old timestamps (older than 1 second)
    const now = Date.now();
    this.requestTimestamps = this.requestTimestamps.filter(
      ts => now - ts < 1000
    );

    // Check if we're at the limit
    if (this.requestTimestamps.length >= this.config.maxRequestsPerSecond) {
      const oldestTimestamp = this.requestTimestamps[0];
      const waitTime = 1000 - (now - oldestTimestamp);
      
      if (waitTime > 0) {
        console.log(`[Throttler] Rate limit reached. Waiting ${waitTime}ms...`);
        await this.sleep(waitTime);
      }
    }

    // Record this request
    this.requestTimestamps.push(Date.now());
  }

  /**
   * Enter throttled mode (for 503 Slow Down errors)
   */
  enterThrottleMode(durationMs: number = 15 * 60 * 1000) {
    this.isThrottled = true;
    this.throttleUntil = Date.now() + durationMs;
    
    // Reduce rate dramatically (30% of original)
    this.config.maxRequestsPerSecond = Math.max(1, Math.floor(this.originalRate * 0.3));
    
    console.log(`[Throttler] Entering throttle mode for ${durationMs}ms. New rate: ${this.config.maxRequestsPerSecond} req/s`);
  }

  /**
   * Gradually increase rate after throttle period
   */
  graduallyIncreaseRate() {
    if (this.config.adaptiveThrottling) {
      this.config.maxRequestsPerSecond = Math.min(
        this.originalRate,
        this.config.maxRequestsPerSecond + 1
      );
      console.log(`[Throttler] Gradually increasing rate to ${this.config.maxRequestsPerSecond} req/s`);
    }
  }

  /**
   * Reset to original rate
   */
  reset() {
    this.config.maxRequestsPerSecond = this.originalRate;
    this.isThrottled = false;
    this.throttleUntil = 0;
    this.requestTimestamps = [];
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getCurrentRate(): number {
    return this.config.maxRequestsPerSecond;
  }

  isCurrentlyThrottled(): boolean {
    return this.isThrottled && Date.now() < this.throttleUntil;
  }
}
