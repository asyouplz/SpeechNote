/**
 * 에러 처리 유틸리티
 * - 전역 에러 핸들러
 * - 에러 바운더리
 * - 에러 복구 전략
 * - 에러 로깅 및 리포팅
 */

/**
 * 에러 타입 정의
 */
export enum ErrorType {
    NETWORK = 'NETWORK',
    VALIDATION = 'VALIDATION',
    PERMISSION = 'PERMISSION',
    TIMEOUT = 'TIMEOUT',
    RESOURCE = 'RESOURCE',
    UNKNOWN = 'UNKNOWN'
}

/**
 * 에러 심각도
 */
export enum ErrorSeverity {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
    CRITICAL = 'CRITICAL'
}

/**
 * 확장된 에러 정보
 */
export interface ErrorInfo {
    type: ErrorType;
    severity: ErrorSeverity;
    message: string;
    code?: string;
    stack?: string;
    timestamp: number;
    context?: Record<string, unknown>;
    userMessage?: string;
    recoverable?: boolean;
}

/**
 * 에러 리포터 인터페이스
 */
export interface ErrorReporter {
    report(error: ErrorInfo): void | Promise<void>;
}

/**
 * 에러 복구 전략
 */
export interface ErrorRecoveryStrategy {
    canRecover(error: ErrorInfo): boolean;
    recover(error: ErrorInfo): Promise<void>;
}

/**
 * 전역 에러 매니저
 */
export class GlobalErrorManager {
    private static instance: GlobalErrorManager;
    private reporters: Set<ErrorReporter> = new Set();
    private strategies: Map<ErrorType, ErrorRecoveryStrategy[]> = new Map();
    private errorHistory: ErrorInfo[] = [];
    private maxHistorySize = 100;
    private listeners: Set<(error: ErrorInfo) => void> = new Set();

    private constructor() {
        this.setupGlobalHandlers();
    }

    static getInstance(): GlobalErrorManager {
        if (!this.instance) {
            this.instance = new GlobalErrorManager();
        }
        return this.instance;
    }

    /**
     * 전역 에러 핸들러 설정
     */
    private setupGlobalHandlers(): void {
        // Unhandled rejection 처리
        window.addEventListener('unhandledrejection', (event) => {
            void this.handleError(new Error(event.reason), {
                type: ErrorType.UNKNOWN,
                severity: ErrorSeverity.HIGH,
                context: { promise: true }
            });
            event.preventDefault();
        });

        // 일반 에러 처리
        window.addEventListener('error', (event) => {
            void this.handleError(event.error || new Error(event.message), {
                type: ErrorType.UNKNOWN,
                severity: ErrorSeverity.HIGH,
                context: {
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno
                }
            });
            event.preventDefault();
        });
    }

    /**
     * 에러 처리
     */
    async handleError(
        error: Error | string,
        options: Partial<ErrorInfo> = {}
    ): Promise<void> {
        const errorInfo = this.createErrorInfo(error, options);
        
        // 히스토리에 추가
        this.addToHistory(errorInfo);
        
        // 리스너 알림
        this.notifyListeners(errorInfo);
        
        // 리포터에 전달
        await this.reportError(errorInfo);
        
        // 복구 시도
        if (errorInfo.recoverable !== false) {
            await this.attemptRecovery(errorInfo);
        }
    }

    /**
     * 에러 정보 생성
     */
    private createErrorInfo(
        error: Error | string,
        options: Partial<ErrorInfo>
    ): ErrorInfo {
        const errorObj = typeof error === 'string' ? new Error(error) : error;
        
        return {
            type: options.type || ErrorType.UNKNOWN,
            severity: options.severity || ErrorSeverity.MEDIUM,
            message: errorObj.message,
            stack: errorObj.stack,
            timestamp: Date.now(),
            recoverable: true,
            ...options
        };
    }

    /**
     * 에러 히스토리에 추가
     */
    private addToHistory(error: ErrorInfo): void {
        this.errorHistory.push(error);
        
        if (this.errorHistory.length > this.maxHistorySize) {
            this.errorHistory.shift();
        }
    }

    /**
     * 리스너에 알림
     */
    private notifyListeners(error: ErrorInfo): void {
        this.listeners.forEach(listener => {
            try {
                listener(error);
            } catch (e) {
                console.error('Error in error listener:', e);
            }
        });
    }

    /**
     * 에러 리포팅
     */
    private async reportError(error: ErrorInfo): Promise<void> {
        const promises = Array.from(this.reporters).map(reporter =>
            Promise.resolve(reporter.report(error)).catch(e =>
                console.error('Error in reporter:', e)
            )
        );
        
        await Promise.all(promises);
    }

    /**
     * 복구 시도
     */
    private async attemptRecovery(error: ErrorInfo): Promise<void> {
        const strategies = this.strategies.get(error.type) || [];
        
        for (const strategy of strategies) {
            if (strategy.canRecover(error)) {
                try {
                    await strategy.recover(error);
                    if (process.env.NODE_ENV === 'development') {
                        console.debug('Error recovered successfully:', error.type);
                    }
                    return;
                } catch (e) {
                    console.error('Recovery strategy failed:', e);
                }
            }
        }
    }

    /**
     * 리포터 추가
     */
    addReporter(reporter: ErrorReporter): void {
        this.reporters.add(reporter);
    }

    /**
     * 복구 전략 추가
     */
    addRecoveryStrategy(type: ErrorType, strategy: ErrorRecoveryStrategy): void {
        if (!this.strategies.has(type)) {
            this.strategies.set(type, []);
        }
        this.strategies.get(type)!.push(strategy);
    }

    /**
     * 에러 리스너 추가
     */
    onError(listener: (error: ErrorInfo) => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    /**
     * 에러 히스토리 가져오기
     */
    getHistory(filter?: { type?: ErrorType; severity?: ErrorSeverity }): ErrorInfo[] {
        if (!filter) return [...this.errorHistory];
        
        return this.errorHistory.filter(error => {
            if (filter.type && error.type !== filter.type) return false;
            if (filter.severity && error.severity !== filter.severity) return false;
            return true;
        });
    }

    /**
     * 히스토리 클리어
     */
    clearHistory(): void {
        this.errorHistory = [];
    }
}

/**
 * 콘솔 에러 리포터
 */
export class ConsoleErrorReporter implements ErrorReporter {
    report(error: ErrorInfo): void {
        const style = this.getConsoleStyle(error.severity);
        if (process.env.NODE_ENV === 'development') {
            console.debug(`%c[${error.severity}] ${error.type}`, style, error.message);
        }
        
        if (error.stack) {
            if (process.env.NODE_ENV === 'development') {
                console.debug(error.stack);
            }
        }
        
        if (error.context) {
            if (process.env.NODE_ENV === 'development') {
                console.debug('Context:', error.context);
            }
        }
    }

    private getConsoleStyle(severity: ErrorSeverity): string {
        const styles = {
            [ErrorSeverity.LOW]: 'color: gray',
            [ErrorSeverity.MEDIUM]: 'color: orange',
            [ErrorSeverity.HIGH]: 'color: red',
            [ErrorSeverity.CRITICAL]: 'color: red; font-weight: bold'
        };
        return styles[severity];
    }
}

/**
 * 로컬 스토리지 에러 리포터
 */
export class LocalStorageErrorReporter implements ErrorReporter {
    private storageKey = 'error_logs';
    private maxLogs = 50;

    report(error: ErrorInfo): void {
        try {
            const logs = this.getLogs();
            logs.push(error);
            
            if (logs.length > this.maxLogs) {
                logs.shift();
            }
            
            localStorage.setItem(this.storageKey, JSON.stringify(logs));
        } catch (e) {
            console.error('Failed to save error log:', e);
        }
    }

    getLogs(): ErrorInfo[] {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    }

    clearLogs(): void {
        localStorage.removeItem(this.storageKey);
    }
}

/**
 * 에러 바운더리 컴포넌트
 */
export class ErrorBoundary {
    private element: HTMLElement;
    private errorHandler: (error: Error) => void;
    private fallback: HTMLElement | null = null;
    private originalContent: HTMLElement | null = null;

    constructor(
        element: HTMLElement,
        options: {
            fallback?: () => HTMLElement;
            onError?: (error: Error) => void;
            recoverable?: boolean;
        } = {}
    ) {
        this.element = element;
        this.errorHandler = options.onError || (() => {});
        
        if (options.fallback) {
            this.fallback = options.fallback();
        }
        
        if (options.recoverable !== false) {
            this.setupRecovery();
        }
        
        this.protect();
    }

    /**
     * 에러 보호 설정
     */
    private protect(): void {
        // MutationObserver로 DOM 변경 감지
        const observer = new MutationObserver(() => {
            try {
                // DOM 변경 시 에러 체크
                this.checkForErrors();
            } catch (error) {
                this.handleError(error as Error);
            }
        });

        observer.observe(this.element, {
            childList: true,
            subtree: true,
            attributes: true
        });

        // 이벤트 버블링 에러 캐치
        this.element.addEventListener('error', (event) => {
            this.handleError(new Error('Child component error'));
            event.stopPropagation();
        }, true);
    }

    /**
     * 에러 체크
     */
    private checkForErrors(): void {
        // 자식 요소들의 상태 확인
        const errorElements = this.element.querySelectorAll('[data-error="true"]');
        if (errorElements.length > 0) {
            throw new Error('Child component in error state');
        }
    }

    /**
     * 에러 처리
     */
    private handleError(error: Error): void {
        console.error('Error caught by boundary:', error);
        
        // 원본 콘텐츠 저장
        if (!this.originalContent) {
            this.originalContent = this.element.cloneNode(true) as HTMLElement;
        }
        
        // 폴백 UI 표시
        if (this.fallback) {
            this.element.empty();
            this.element.appendChild(this.fallback);
        } else {
            this.showDefaultFallback(error);
        }
        
        // 에러 핸들러 호출
        this.errorHandler(error);
        
        // 전역 에러 매니저에 보고
        void GlobalErrorManager.getInstance().handleError(error, {
            type: ErrorType.UNKNOWN,
            severity: ErrorSeverity.MEDIUM,
            context: { boundary: true }
        });
    }

    /**
     * 기본 폴백 UI
     */
    private showDefaultFallback(error: Error): void {
        this.element.empty();
        const container = this.element.createDiv('error-boundary-fallback');
        container.createEl('h3', { text: '문제가 발생했습니다' });
        container.createEl('p', { text: error.message });
        container.createEl('button', {
            text: '다시 시도',
            cls: 'error-boundary-retry'
        });
    }

    /**
     * 복구 설정
     */
    private setupRecovery(): void {
        this.element.addEventListener('click', (event) => {
            const target = event.target as HTMLElement;
            if (target.classList.contains('error-boundary-retry')) {
                this.recover();
            }
        });
    }

    /**
     * 복구
     */
    recover(): void {
        if (this.originalContent) {
            this.element.empty();
            const children = Array.from(this.originalContent.children);
            children.forEach(child => {
                this.element.appendChild(child.cloneNode(true));
            });
        }
    }
}

/**
 * Try-catch 래퍼
 */
export function tryCatch<T>(
    fn: () => T,
    options: {
        fallback?: T;
        onError?: (error: Error) => void;
        rethrow?: boolean;
    } = {}
): T | undefined {
    try {
        return fn();
    } catch (error) {
        const err = error as Error;
        
        if (options.onError) {
            options.onError(err);
        }
        
        void GlobalErrorManager.getInstance().handleError(err, {
            type: ErrorType.UNKNOWN,
            severity: ErrorSeverity.LOW
        });
        
        if (options.rethrow) {
            throw err;
        }
        
        return options.fallback;
    }
}

/**
 * 비동기 Try-catch 래퍼
 */
export async function tryCatchAsync<T>(
    fn: () => Promise<T>,
    options: {
        fallback?: T;
        onError?: (error: Error) => void;
        rethrow?: boolean;
    } = {}
): Promise<T | undefined> {
    try {
        return await fn();
    } catch (error) {
        const err = error as Error;
        
        if (options.onError) {
            options.onError(err);
        }
        
        await GlobalErrorManager.getInstance().handleError(err, {
            type: ErrorType.UNKNOWN,
            severity: ErrorSeverity.LOW
        });
        
        if (options.rethrow) {
            throw err;
        }
        
        return options.fallback;
    }
}

/**
 * 에러 재시도 데코레이터
 */
export function retryOnError(
    maxAttempts = 3,
    delay = 1000
) {
    return function (
        target: unknown,
        propertyKey: string,
        descriptor: PropertyDescriptor
    ) {
        const originalMethod = descriptor.value;
        
        descriptor.value = async function (...args: unknown[]) {
            let lastError: Error;
            
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                try {
                    return await originalMethod.apply(this, args);
                } catch (error) {
                    lastError = error as Error;
                    
                    if (attempt < maxAttempts) {
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                }
            }
            
            throw lastError!;
        };
        
        return descriptor;
    };
}
