/**
 * API 신뢰성 보장 유틸리티들
 * Rate Limiter, Circuit Breaker, Retry Strategy 등을 포함
 */

import type { ILogger } from '../../../../types';
import { 
    TranscriptionError,
    ProviderUnavailableError 
} from '../ITranscriber';
import { RELIABILITY, ERROR_MESSAGES } from './constants';

/**
 * Rate Limiter 구현
 * API 호출 빈도를 제한하여 서버 부하 방지
 */
export class RateLimiter {
    private queue: Array<() => void> = [];
    private processing = false;
    private lastRequestTime = 0;
    
    constructor(
        private requestsPerMinute: number,
        private logger: ILogger
    ) {}
    
    /**
     * Rate limit을 고려한 요청 허가 대기
     */
    acquire(): Promise<void> {
        return new Promise<void>(resolve => {
            this.queue.push(resolve);
            void this.processQueue();
        });
    }
    
    /**
     * 대기열 처리
     */
    private async processQueue(): Promise<void> {
        if (this.processing || this.queue.length === 0) {
            return;
        }
        
        this.processing = true;
        const minInterval = 60000 / this.requestsPerMinute;
        
        while (this.queue.length > 0) {
            const now = Date.now();
            const timeSinceLastRequest = now - this.lastRequestTime;
            
            if (timeSinceLastRequest < minInterval) {
                const waitTime = minInterval - timeSinceLastRequest;
                await this.sleep(waitTime);
            }
            
            const resolve = this.queue.shift();
            if (resolve) {
                this.lastRequestTime = Date.now();
                resolve();
            }
        }
        
        this.processing = false;
    }
    
    /**
     * 지연 유틸리티
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * Circuit Breaker 패턴 구현
 * 연속된 실패를 감지하여 자동으로 API 호출을 차단
 */
export class CircuitBreaker {
    private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
    private failureCount = 0;
    private successCount = 0;
    private nextAttemptTime = 0;

    constructor(
        private logger: ILogger,
        private failureThreshold = RELIABILITY.CIRCUIT_BREAKER.FAILURE_THRESHOLD,
        private successThreshold = RELIABILITY.CIRCUIT_BREAKER.SUCCESS_THRESHOLD,
        private timeout = RELIABILITY.CIRCUIT_BREAKER.TIMEOUT
    ) {}

    /**
     * Circuit Breaker를 통한 작업 실행
     */
    async execute<T>(operation: () => Promise<T>): Promise<T> {
        if (this.isOpen()) {
            throw new ProviderUnavailableError('deepgram');
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
     * Circuit이 열려있는지 확인
     */
    private isOpen(): boolean {
        if (this.state === 'OPEN') {
            if (Date.now() >= this.nextAttemptTime) {
                this.state = 'HALF_OPEN';
                this.logger.info('Circuit breaker entering HALF_OPEN state');
                return false;
            }
            return true;
        }
        return false;
    }

    /**
     * 성공 시 호출
     */
    private onSuccess(): void {
        this.failureCount = 0;
        
        if (this.state === 'HALF_OPEN') {
            this.successCount++;
            if (this.successCount >= this.successThreshold) {
                this.state = 'CLOSED';
                this.successCount = 0;
                this.logger.info('Circuit breaker closed');
            }
        }
    }

    /**
     * 실패 시 호출
     */
    private onFailure(): void {
        this.failureCount++;
        
        if (this.state === 'HALF_OPEN') {
            this.state = 'OPEN';
            this.nextAttemptTime = Date.now() + this.timeout;
            this.logger.warn('Circuit breaker opened due to failure in HALF_OPEN state');
        } else if (this.failureCount >= this.failureThreshold) {
            this.state = 'OPEN';
            this.nextAttemptTime = Date.now() + this.timeout;
            this.logger.warn(`Circuit breaker opened after ${this.failureCount} failures`);
        }
    }

    /**
     * Circuit Breaker 상태 리셋
     */
    reset(): void {
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.successCount = 0;
        this.logger.info('Circuit breaker reset');
    }

    /**
     * 현재 상태 반환
     */
    getState(): string {
        return this.state;
    }
}

/**
 * Exponential Backoff 재시도 전략
 * 실패 시 지수적으로 증가하는 대기시간으로 재시도
 */
export class ExponentialBackoffRetry {
    constructor(
        private logger: ILogger,
        private maxRetries = RELIABILITY.RETRY.MAX_RETRIES,
        private baseDelay = RELIABILITY.RETRY.BASE_DELAY,
        private maxDelay = RELIABILITY.RETRY.MAX_DELAY,
        private jitterMax = RELIABILITY.RETRY.JITTER_MAX
    ) {}

    /**
     * 재시도 전략으로 작업 실행
     */
    async execute<T>(operation: () => Promise<T>): Promise<T> {
        let lastError: Error;
        
        for (let attempt = 0; attempt < this.maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error as Error;
                
                if (!this.isRetryable(error)) {
                    throw error;
                }
                
                if (attempt < this.maxRetries - 1) {
                    const delay = this.calculateDelay(attempt);
                    this.logger.debug(`Retrying after ${delay}ms (attempt ${attempt + 1}/${this.maxRetries})`);
                    await this.sleep(delay);
                }
            }
        }
        
        throw new TranscriptionError(
            ERROR_MESSAGES.API.MAX_RETRIES.replace('{retries}', this.maxRetries.toString()) + `: ${lastError!.message}`,
            'MAX_RETRIES_EXCEEDED',
            'deepgram',
            false
        );
    }
    
    /**
     * 재시도 가능한 에러인지 판단
     */
    private isRetryable(error: any): boolean {
        if (error instanceof TranscriptionError) {
            return error.isRetryable;
        }
        // 네트워크 에러는 재시도 가능
        return error.message?.toLowerCase().includes('network');
    }
    
    /**
     * 지수적 백오프 지연시간 계산
     */
    private calculateDelay(attempt: number): number {
        const delay = Math.min(
            this.baseDelay * Math.pow(2, attempt),
            this.maxDelay
        );
        // Jitter 추가로 thundering herd 방지
        return delay + Math.random() * this.jitterMax;
    }
    
    /**
     * 지연 유틸리티
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * 신뢰성 전략들을 조합한 컴포지트 패턴
 */
export class ReliabilityManager {
    private rateLimiter: RateLimiter;
    private circuitBreaker: CircuitBreaker;
    private retryStrategy: ExponentialBackoffRetry;

    constructor(
        logger: ILogger,
        requestsPerMinute = 100
    ) {
        this.rateLimiter = new RateLimiter(requestsPerMinute, logger);
        this.circuitBreaker = new CircuitBreaker(logger);
        this.retryStrategy = new ExponentialBackoffRetry(logger);
    }

    /**
     * 모든 신뢰성 전략을 적용한 작업 실행
     */
    async executeWithReliability<T>(operation: () => Promise<T>): Promise<T> {
        // Rate limiting 먼저 적용
        await this.rateLimiter.acquire();
        
        // Circuit Breaker와 Retry 전략 조합
        return this.circuitBreaker.execute(() =>
            this.retryStrategy.execute(operation)
        );
    }

    /**
     * Circuit Breaker 리셋
     */
    resetCircuitBreaker(): void {
        this.circuitBreaker.reset();
    }

    /**
     * 현재 상태 반환
     */
    getStatus(): {
        circuitBreakerState: string;
    } {
        return {
            circuitBreakerState: this.circuitBreaker.getState()
        };
    }
}
