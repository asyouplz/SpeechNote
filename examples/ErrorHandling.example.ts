/**
 * 에러 처리 예제 코드
 * 포괄적인 에러 처리 전략 구현 예제
 */

import { Notice } from 'obsidian';

/**
 * 지수 백오프를 사용한 재시도 예제
 */
export class RetryWithBackoffExample {
    private readonly DEFAULT_MAX_RETRIES = 3;
    private readonly DEFAULT_BASE_DELAY = 1000; // 1초
    private readonly DEFAULT_MAX_DELAY = 30000; // 30초

    /**
     * 지수 백오프로 작업 재시도
     */
    async executeWithRetry<T>(
        operation: () => Promise<T>,
        options?: RetryOptions
    ): Promise<T> {
        const config = {
            maxRetries: options?.maxRetries || this.DEFAULT_MAX_RETRIES,
            baseDelay: options?.baseDelay || this.DEFAULT_BASE_DELAY,
            maxDelay: options?.maxDelay || this.DEFAULT_MAX_DELAY,
            shouldRetry: options?.shouldRetry || this.defaultShouldRetry,
            onRetry: options?.onRetry
        };

        let lastError: Error;

        for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
            try {
                // 작업 실행
                const result = await operation();
                console.log(`Operation succeeded on attempt ${attempt}`);
                return result;
            } catch (error) {
                lastError = error as Error;
                console.error(`Attempt ${attempt} failed:`, error);

                // 재시도 가능 여부 확인
                if (!config.shouldRetry(error, attempt)) {
                    throw error;
                }

                // 마지막 시도였다면 에러 throw
                if (attempt === config.maxRetries) {
                    throw new Error(
                        `Operation failed after ${config.maxRetries} attempts: ${lastError.message}`
                    );
                }

                // 지수 백오프 지연 계산
                const delay = this.calculateBackoffDelay(
                    attempt,
                    config.baseDelay,
                    config.maxDelay
                );

                // 재시도 콜백
                if (config.onRetry) {
                    config.onRetry(attempt, config.maxRetries, delay, error);
                }

                // 대기
                await this.sleep(delay);
            }
        }

        throw lastError!;
    }

    /**
     * 지수 백오프 지연 시간 계산
     */
    private calculateBackoffDelay(
        attempt: number,
        baseDelay: number,
        maxDelay: number
    ): number {
        // 2의 거듭제곱으로 지연 시간 증가
        const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
        
        // 최대 지연 시간 제한
        const cappedDelay = Math.min(exponentialDelay, maxDelay);
        
        // Jitter 추가 (±20%)
        const jitter = cappedDelay * 0.2 * (Math.random() - 0.5);
        
        return Math.floor(cappedDelay + jitter);
    }

    /**
     * 기본 재시도 가능 여부 판단
     */
    private defaultShouldRetry(error: any, attempt: number): boolean {
        // 네트워크 에러는 재시도
        if (error.message?.includes('network') || error.message?.includes('timeout')) {
            return true;
        }
        
        // HTTP 상태 코드 확인
        if (error.status) {
            // 5xx 서버 에러는 재시도
            if (error.status >= 500) return true;
            
            // 429 Rate Limit은 재시도
            if (error.status === 429) return true;
            
            // 4xx 클라이언트 에러는 재시도 안함
            if (error.status >= 400 && error.status < 500) return false;
        }
        
        return true;
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * Circuit Breaker 패턴 예제
 */
export class CircuitBreakerExample {
    private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
    private failureCount = 0;
    private successCount = 0;
    private lastFailureTime?: number;
    private nextRetryTime?: number;

    constructor(
        private readonly failureThreshold = 5,
        private readonly successThreshold = 2,
        private readonly timeout = 60000 // 1분
    ) {}

    /**
     * Circuit Breaker를 통한 작업 실행
     */
    async execute<T>(operation: () => Promise<T>): Promise<T> {
        // Circuit이 열려있는지 확인
        if (this.state === 'OPEN') {
            if (Date.now() < this.nextRetryTime!) {
                throw new Error(
                    `Circuit breaker is open. Retry after ${new Date(this.nextRetryTime!)}`
                );
            }
            // 타임아웃 지남 - Half-Open 상태로 전환
            this.state = 'HALF_OPEN';
            console.log('Circuit breaker: OPEN -> HALF_OPEN');
        }

        try {
            // 작업 실행
            const result = await operation();
            
            // 성공 처리
            this.onSuccess();
            
            return result;
        } catch (error) {
            // 실패 처리
            this.onFailure();
            throw error;
        }
    }

    /**
     * 성공 시 처리
     */
    private onSuccess(): void {
        this.failureCount = 0;

        if (this.state === 'HALF_OPEN') {
            this.successCount++;
            
            // 충분한 성공 - Circuit 닫기
            if (this.successCount >= this.successThreshold) {
                this.state = 'CLOSED';
                this.successCount = 0;
                console.log('Circuit breaker: HALF_OPEN -> CLOSED');
            }
        }
    }

    /**
     * 실패 시 처리
     */
    private onFailure(): void {
        this.failureCount++;
        this.lastFailureTime = Date.now();

        // Half-Open 상태에서 실패 - 다시 Open
        if (this.state === 'HALF_OPEN') {
            this.openCircuit();
        } 
        // 실패 임계값 도달 - Circuit 열기
        else if (this.failureCount >= this.failureThreshold) {
            this.openCircuit();
        }
    }

    /**
     * Circuit 열기
     */
    private openCircuit(): void {
        this.state = 'OPEN';
        this.nextRetryTime = Date.now() + this.timeout;
        this.successCount = 0;
        console.log(`Circuit breaker opened. Will retry at ${new Date(this.nextRetryTime)}`);
    }

    /**
     * 상태 확인
     */
    getState(): CircuitBreakerState {
        return {
            state: this.state,
            failureCount: this.failureCount,
            successCount: this.successCount,
            lastFailureTime: this.lastFailureTime,
            nextRetryTime: this.nextRetryTime
        };
    }

    /**
     * 수동 리셋
     */
    reset(): void {
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.successCount = 0;
        this.lastFailureTime = undefined;
        this.nextRetryTime = undefined;
        console.log('Circuit breaker reset');
    }
}

/**
 * 사용자 친화적 에러 메시지 예제
 */
export class UserFriendlyErrorExample {
    private errorMessages = new Map<string, ErrorMessageTemplate>();

    constructor() {
        this.initializeErrorMessages();
    }

    /**
     * 에러 메시지 템플릿 초기화
     */
    private initializeErrorMessages(): void {
        // 네트워크 에러
        this.errorMessages.set('NETWORK_ERROR', {
            title: '연결 문제',
            message: '서비스에 연결할 수 없습니다. 인터넷 연결을 확인해주세요.',
            icon: '🌐',
            severity: 'error',
            actions: ['retry', 'checkSettings']
        });

        // API 키 에러
        this.errorMessages.set('AUTH_ERROR', {
            title: '인증 실패',
            message: 'API 키가 올바르지 않습니다. 설정을 확인해주세요.',
            icon: '🔑',
            severity: 'error',
            actions: ['openSettings']
        });

        // 파일 크기 에러
        this.errorMessages.set('FILE_TOO_LARGE', {
            title: '파일 크기 초과',
            message: '선택한 파일이 25MB를 초과합니다. 더 작은 파일을 선택해주세요.',
            icon: '📁',
            severity: 'warning',
            actions: ['selectAnotherFile']
        });

        // 할당량 초과
        this.errorMessages.set('RATE_LIMIT', {
            title: '요청 한도 초과',
            message: 'API 요청 한도에 도달했습니다. 잠시 후 다시 시도해주세요.',
            icon: '⏱️',
            severity: 'warning',
            actions: ['retry', 'viewUsage']
        });

        // 서버 에러
        this.errorMessages.set('SERVER_ERROR', {
            title: '서버 오류',
            message: '서비스가 일시적으로 이용 불가능합니다. 나중에 다시 시도해주세요.',
            icon: '⚠️',
            severity: 'error',
            actions: ['retry', 'checkStatus']
        });
    }

    /**
     * 에러 처리 및 사용자 알림
     */
    handleError(error: Error, errorCode?: string): void {
        // 에러 코드 결정
        const code = errorCode || this.detectErrorCode(error);
        
        // 에러 메시지 템플릿 가져오기
        const template = this.errorMessages.get(code) || this.getDefaultTemplate();
        
        // 사용자에게 알림 표시
        this.showNotification(template, error);
        
        // 콘솔에 상세 로그
        console.error(`[${code}] ${error.message}`, error);
    }

    /**
     * 에러 코드 자동 감지
     */
    private detectErrorCode(error: Error): string {
        const message = error.message.toLowerCase();
        
        if (message.includes('network') || message.includes('fetch')) {
            return 'NETWORK_ERROR';
        }
        if (message.includes('401') || message.includes('unauthorized')) {
            return 'AUTH_ERROR';
        }
        if (message.includes('429') || message.includes('rate')) {
            return 'RATE_LIMIT';
        }
        if (message.includes('500') || message.includes('server')) {
            return 'SERVER_ERROR';
        }
        if (message.includes('size') || message.includes('large')) {
            return 'FILE_TOO_LARGE';
        }
        
        return 'UNKNOWN_ERROR';
    }

    /**
     * 기본 에러 템플릿
     */
    private getDefaultTemplate(): ErrorMessageTemplate {
        return {
            title: '오류 발생',
            message: '예기치 않은 오류가 발생했습니다. 문제가 지속되면 지원팀에 문의해주세요.',
            icon: '❌',
            severity: 'error',
            actions: ['retry']
        };
    }

    /**
     * 알림 표시
     */
    private showNotification(template: ErrorMessageTemplate, error: Error): void {
        // Obsidian Notice 생성
        const notice = new Notice('', 0);
        const container = notice.noticeEl;
        
        // 스타일 클래스 추가
        container.addClass(`error-notice-${template.severity}`);
        
        // 컨텐츠 구성
        const content = `
            <div class="error-notice">
                <div class="error-header">
                    <span class="error-icon">${template.icon}</span>
                    <span class="error-title">${template.title}</span>
                </div>
                <div class="error-message">${template.message}</div>
                <div class="error-actions">
                    ${this.renderActions(template.actions)}
                </div>
            </div>
        `;
        
        container.innerHTML = content;
        
        // 자동 숨김 (심각도에 따라)
        const timeout = template.severity === 'error' ? 10000 : 5000;
        setTimeout(() => notice.hide(), timeout);
    }

    /**
     * 액션 버튼 렌더링
     */
    private renderActions(actions: string[]): string {
        const actionButtons = actions.map(action => {
            const label = this.getActionLabel(action);
            return `<button class="error-action" data-action="${action}">${label}</button>`;
        }).join('');
        
        return actionButtons;
    }

    /**
     * 액션 레이블 매핑
     */
    private getActionLabel(action: string): string {
        const labels: Record<string, string> = {
            retry: '다시 시도',
            openSettings: '설정 열기',
            selectAnotherFile: '다른 파일 선택',
            viewUsage: '사용량 확인',
            checkStatus: '상태 확인',
            checkSettings: '설정 확인'
        };
        
        return labels[action] || action;
    }
}

// 타입 정의
interface RetryOptions {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    shouldRetry?: (error: any, attempt: number) => boolean;
    onRetry?: (attempt: number, maxRetries: number, delay: number, error: any) => void;
}

interface CircuitBreakerState {
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    failureCount: number;
    successCount: number;
    lastFailureTime?: number;
    nextRetryTime?: number;
}

interface ErrorMessageTemplate {
    title: string;
    message: string;
    icon: string;
    severity: 'info' | 'warning' | 'error';
    actions: string[];
}

// 통합 사용 예제
export async function exampleUsage() {
    // 1. 재시도 예제
    const retryManager = new RetryWithBackoffExample();
    
    try {
        const result = await retryManager.executeWithRetry(
            async () => {
                // API 호출 시뮬레이션
                const random = Math.random();
                if (random < 0.7) { // 70% 실패
                    throw new Error('Network error');
                }
                return 'Success!';
            },
            {
                maxRetries: 5,
                baseDelay: 500,
                onRetry: (attempt, max, delay) => {
                    console.log(`Retrying ${attempt}/${max} after ${delay}ms`);
                }
            }
        );
        console.log('Result:', result);
    } catch (error) {
        console.error('Failed after retries:', error);
    }

    // 2. Circuit Breaker 예제
    const circuitBreaker = new CircuitBreakerExample();
    
    for (let i = 0; i < 10; i++) {
        try {
            await circuitBreaker.execute(async () => {
                // 불안정한 서비스 시뮬레이션
                if (Math.random() < 0.6) { // 60% 실패
                    throw new Error('Service unavailable');
                }
                return 'Success!';
            });
            console.log(`Request ${i + 1}: Success`);
        } catch (error) {
            console.log(`Request ${i + 1}: Failed - ${error.message}`);
        }
        
        // 상태 확인
        console.log('Circuit state:', circuitBreaker.getState());
    }

    // 3. 사용자 친화적 에러 처리 예제
    const errorHandler = new UserFriendlyErrorExample();
    
    // 다양한 에러 시뮬레이션
    errorHandler.handleError(new Error('Network request failed'));
    errorHandler.handleError(new Error('401 Unauthorized'), 'AUTH_ERROR');
    errorHandler.handleError(new Error('File size exceeds 25MB'));
}