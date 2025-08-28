import type { ILogger } from '../../../../types';

export interface RateLimiterConfig {
    requestsPerWindow: number;
    windowMs?: number;
    queueEnabled?: boolean;
    maxQueueSize?: number;
}

/**
 * Token Bucket Rate Limiter with optional queuing
 * Ensures API rate limits are respected with smooth request distribution
 */
export class RateLimiter {
    private tokens: number;
    private lastRefillTime: number;
    private readonly maxTokens: number;
    private readonly refillRate: number;
    private readonly windowMs: number;
    private queue: Array<() => void> = [];
    private processing = false;

    constructor(
        private readonly name: string,
        private readonly logger: ILogger,
        private readonly config: RateLimiterConfig
    ) {
        this.windowMs = config.windowMs ?? 60000;
        this.maxTokens = config.requestsPerWindow;
        this.tokens = this.maxTokens;
        this.refillRate = this.maxTokens / this.windowMs;
        this.lastRefillTime = Date.now();
    }

    /**
     * Acquire permission to make a request
     */
    async acquire(): Promise<void> {
        if (this.config.queueEnabled) {
            return this.acquireWithQueue();
        }
        return this.acquireImmediate();
    }

    /**
     * Immediate acquisition (throws if rate limited)
     */
    private async acquireImmediate(): Promise<void> {
        this.refillTokens();

        if (this.tokens < 1) {
            const waitTime = this.getWaitTime();
            throw new Error(
                `${this.name}: Rate limit exceeded. Retry after ${Math.ceil(waitTime / 1000)} seconds`
            );
        }

        this.tokens--;
        this.logger.debug(`${this.name}: Token acquired. Remaining: ${Math.floor(this.tokens)}`);
    }

    /**
     * Queued acquisition (waits if rate limited)
     */
    private async acquireWithQueue(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (this.config.maxQueueSize && this.queue.length >= this.config.maxQueueSize) {
                reject(new Error(`${this.name}: Rate limiter queue is full`));
                return;
            }

            this.queue.push(resolve);
            this.processQueue();
        });
    }

    /**
     * Process queued requests
     */
    private async processQueue(): Promise<void> {
        if (this.processing || this.queue.length === 0) {
            return;
        }

        this.processing = true;

        while (this.queue.length > 0) {
            this.refillTokens();

            if (this.tokens < 1) {
                const waitTime = this.getWaitTime();
                await this.sleep(waitTime);
                continue;
            }

            const resolve = this.queue.shift();
            if (resolve) {
                this.tokens--;
                resolve();
                this.logger.debug(`${this.name}: Queued request processed. Queue size: ${this.queue.length}`);
            }
        }

        this.processing = false;
    }

    /**
     * Refill tokens based on elapsed time
     */
    private refillTokens(): void {
        const now = Date.now();
        const elapsed = now - this.lastRefillTime;
        const tokensToAdd = elapsed * this.refillRate;

        this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
        this.lastRefillTime = now;
    }

    /**
     * Calculate wait time until next token is available
     */
    private getWaitTime(): number {
        const tokensNeeded = 1 - this.tokens;
        return Math.max(0, tokensNeeded / this.refillRate);
    }

    /**
     * Check if rate limiter has available tokens
     */
    hasAvailableTokens(): boolean {
        this.refillTokens();
        return this.tokens >= 1;
    }

    /**
     * Get current statistics
     */
    getStats(): {
        availableTokens: number;
        maxTokens: number;
        queueSize: number;
    } {
        this.refillTokens();
        return {
            availableTokens: Math.floor(this.tokens),
            maxTokens: this.maxTokens,
            queueSize: this.queue.length
        };
    }

    /**
     * Reset rate limiter
     */
    reset(): void {
        this.tokens = this.maxTokens;
        this.lastRefillTime = Date.now();
        this.queue = [];
        this.processing = false;
        this.logger.info(`${this.name}: Rate limiter reset`);
    }

    /**
     * Sleep utility
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}