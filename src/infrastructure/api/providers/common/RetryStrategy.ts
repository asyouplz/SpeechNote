import type { ILogger } from '../../../../types';

export interface RetryConfig {
    maxRetries?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    exponentialBase?: number;
    jitterEnabled?: boolean;
    retryCondition?: (error: any) => boolean;
}

export enum RetryStrategy {
    EXPONENTIAL = 'exponential',
    LINEAR = 'linear',
    FIXED = 'fixed'
}

/**
 * Configurable retry mechanism with multiple strategies
 * Handles transient failures with intelligent backoff
 */
export class RetryHandler {
    private readonly maxRetries: number;
    private readonly baseDelayMs: number;
    private readonly maxDelayMs: number;
    private readonly exponentialBase: number;
    private readonly jitterEnabled: boolean;
    private readonly retryCondition: (error: any) => boolean;

    constructor(
        private readonly name: string,
        private readonly logger: ILogger,
        private readonly strategy: RetryStrategy = RetryStrategy.EXPONENTIAL,
        config: RetryConfig = {}
    ) {
        this.maxRetries = config.maxRetries ?? 3;
        this.baseDelayMs = config.baseDelayMs ?? 1000;
        this.maxDelayMs = config.maxDelayMs ?? 10000;
        this.exponentialBase = config.exponentialBase ?? 2;
        this.jitterEnabled = config.jitterEnabled ?? true;
        this.retryCondition = config.retryCondition ?? this.defaultRetryCondition;
    }

    /**
     * Execute operation with retry logic
     */
    async execute<T>(
        operation: () => Promise<T>,
        context?: string
    ): Promise<T> {
        let lastError: Error;
        
        for (let attempt = 0; attempt < this.maxRetries; attempt++) {
            try {
                this.logger.debug(`${this.name}: Attempt ${attempt + 1}/${this.maxRetries}${context ? ` for ${context}` : ''}`);
                return await operation();
            } catch (error) {
                lastError = error as Error;
                
                if (!this.shouldRetry(error, attempt)) {
                    throw error;
                }
                
                if (attempt < this.maxRetries - 1) {
                    const delay = this.calculateDelay(attempt);
                    this.logger.debug(
                        `${this.name}: Retrying after ${delay}ms (attempt ${attempt + 1}/${this.maxRetries})`,
                        { error: lastError.message }
                    );
                    await this.sleep(delay);
                }
            }
        }
        
        throw this.wrapError(lastError!, context);
    }

    /**
     * Execute with custom retry config
     */
    async executeWithConfig<T>(
        operation: () => Promise<T>,
        customConfig: RetryConfig
    ): Promise<T> {
        const handler = new RetryHandler(this.name, this.logger, this.strategy, {
            ...this.getConfig(),
            ...customConfig
        });
        return handler.execute(operation);
    }

    /**
     * Determine if operation should be retried
     */
    private shouldRetry(error: any, attempt: number): boolean {
        if (attempt >= this.maxRetries - 1) {
            return false;
        }
        return this.retryCondition(error);
    }

    /**
     * Default retry condition
     */
    private defaultRetryCondition(error: any): boolean {
        // Retry on network errors
        if (error.message?.toLowerCase().includes('network')) {
            return true;
        }
        
        // Retry on timeout
        if (error.message?.toLowerCase().includes('timeout')) {
            return true;
        }
        
        // Retry on specific HTTP status codes
        if (error.statusCode) {
            const retryableCodes = [408, 429, 500, 502, 503, 504];
            return retryableCodes.includes(error.statusCode);
        }
        
        // Don't retry on explicit non-retryable errors
        if (error.isRetryable === false) {
            return false;
        }
        
        return false;
    }

    /**
     * Calculate delay based on strategy
     */
    private calculateDelay(attempt: number): number {
        let delay: number;

        switch (this.strategy) {
            case RetryStrategy.EXPONENTIAL:
                delay = Math.min(
                    this.baseDelayMs * Math.pow(this.exponentialBase, attempt),
                    this.maxDelayMs
                );
                break;
            
            case RetryStrategy.LINEAR:
                delay = Math.min(
                    this.baseDelayMs * (attempt + 1),
                    this.maxDelayMs
                );
                break;
            
            case RetryStrategy.FIXED:
                delay = this.baseDelayMs;
                break;
            
            default:
                delay = this.baseDelayMs;
        }

        // Add jitter to prevent thundering herd
        if (this.jitterEnabled) {
            const jitter = Math.random() * delay * 0.2; // 20% jitter
            delay = delay + jitter;
        }

        return Math.floor(delay);
    }

    /**
     * Wrap error with retry information
     */
    private wrapError(error: Error, context?: string): Error {
        const message = `${this.name}: Operation failed after ${this.maxRetries} attempts${context ? ` for ${context}` : ''}: ${error.message}`;
        const wrappedError = new Error(message);
        wrappedError.stack = error.stack;
        (wrappedError as any).originalError = error;
        (wrappedError as any).retriesExhausted = true;
        return wrappedError;
    }

    /**
     * Get current configuration
     */
    private getConfig(): RetryConfig {
        return {
            maxRetries: this.maxRetries,
            baseDelayMs: this.baseDelayMs,
            maxDelayMs: this.maxDelayMs,
            exponentialBase: this.exponentialBase,
            jitterEnabled: this.jitterEnabled,
            retryCondition: this.retryCondition
        };
    }

    /**
     * Sleep utility
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}