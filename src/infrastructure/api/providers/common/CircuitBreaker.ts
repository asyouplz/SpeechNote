import type { ILogger } from '../../../../types';

export interface CircuitBreakerConfig {
    failureThreshold?: number;
    successThreshold?: number;
    timeout?: number;
    halfOpenRetries?: number;
}

export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/**
 * Generic Circuit Breaker implementation
 * Prevents cascading failures by temporarily blocking operations when failure threshold is reached
 */
export class CircuitBreaker {
    private state: CircuitBreakerState = 'CLOSED';
    private failureCount = 0;
    private successCount = 0;
    private nextAttemptTime = 0;
    private readonly failureThreshold: number;
    private readonly successThreshold: number;
    private readonly timeout: number;

    constructor(
        private readonly name: string,
        private readonly logger: ILogger,
        config: CircuitBreakerConfig = {}
    ) {
        this.failureThreshold = config.failureThreshold ?? 5;
        this.successThreshold = config.successThreshold ?? 2;
        this.timeout = config.timeout ?? 60000;
    }

    /**
     * Execute operation with circuit breaker protection
     */
    async execute<R>(operation: () => Promise<R>): Promise<R> {
        if (this.isOpen()) {
            throw new Error(`${this.name}: Circuit breaker is OPEN`);
        }

        try {
            const result = await operation();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    /**
     * Check if circuit is open
     */
    private isOpen(): boolean {
        if (this.state === 'OPEN') {
            if (Date.now() >= this.nextAttemptTime) {
                this.transitionTo('HALF_OPEN');
                return false;
            }
            return true;
        }
        return false;
    }

    /**
     * Handle successful operation
     */
    private onSuccess(): void {
        this.failureCount = 0;
        
        if (this.state === 'HALF_OPEN') {
            this.successCount++;
            if (this.successCount >= this.successThreshold) {
                this.transitionTo('CLOSED');
                this.successCount = 0;
            }
        }
    }

    /**
     * Handle failed operation
     */
    private onFailure(): void {
        this.failureCount++;
        
        if (this.state === 'HALF_OPEN') {
            this.transitionTo('OPEN');
        } else if (this.failureCount >= this.failureThreshold) {
            this.transitionTo('OPEN');
        }
    }

    /**
     * Transition to new state
     */
    private transitionTo(newState: CircuitBreakerState): void {
        const oldState = this.state;
        this.state = newState;

        if (newState === 'OPEN') {
            this.nextAttemptTime = Date.now() + this.timeout;
        }

        this.logger.debug(`${this.name}: Circuit breaker ${oldState} -> ${newState}`);
    }

    /**
     * Reset circuit breaker to initial state
     */
    reset(): void {
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.successCount = 0;
        this.nextAttemptTime = 0;
        this.logger.info(`${this.name}: Circuit breaker reset`);
    }

    /**
     * Get current state
     */
    getState(): CircuitBreakerState {
        return this.state;
    }

    /**
     * Get statistics
     */
    getStats(): {
        state: CircuitBreakerState;
        failureCount: number;
        successCount: number;
        nextAttemptTime: number;
    } {
        return {
            state: this.state,
            failureCount: this.failureCount,
            successCount: this.successCount,
            nextAttemptTime: this.nextAttemptTime
        };
    }
}
