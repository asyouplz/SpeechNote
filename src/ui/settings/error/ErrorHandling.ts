import { Notice, Platform } from 'obsidian';
import type { App } from 'obsidian';
import { isPlainRecord } from '../../../types/guards';

/**
 * 에러 타입 정의
 */
export enum ErrorType {
    VALIDATION = 'VALIDATION',
    NETWORK = 'NETWORK',
    AUTHENTICATION = 'AUTHENTICATION',
    CONFIGURATION = 'CONFIGURATION',
    PERMISSION = 'PERMISSION',
    STORAGE = 'STORAGE',
    UNKNOWN = 'UNKNOWN',
}

/**
 * 커스텀 에러 클래스
 */
export class SettingsError extends Error {
    constructor(
        message: string,
        public type: ErrorType = ErrorType.UNKNOWN,
        public details?: unknown,
        public recoverable = true
    ) {
        super(message);
        this.name = 'SettingsError';
    }

    /**
     * 사용자 친화적 메시지 생성
     */
    getUserMessage(): string {
        const messages: Record<ErrorType, string> = {
            [ErrorType.VALIDATION]: 'The input is invalid.',
            [ErrorType.NETWORK]: 'Check your network connection.',
            [ErrorType.AUTHENTICATION]: 'Authentication failed. Check your API key.',
            [ErrorType.CONFIGURATION]: 'There is a problem with the settings.',
            [ErrorType.PERMISSION]: 'Permission denied.',
            [ErrorType.STORAGE]: 'Failed to access storage.',
            [ErrorType.UNKNOWN]: 'An unknown error occurred.',
        };

        return messages[this.type] || this.message;
    }

    /**
     * 복구 가능 여부
     */
    isRecoverable(): boolean {
        return this.recoverable;
    }
}

/**
 * 에러 핸들러 인터페이스
 */
interface ErrorHandler {
    handle(error: Error): void;
    canHandle(error: Error): boolean;
}

function normalizeError(error: unknown): Error {
    return error instanceof Error ? error : new Error('Unknown error');
}

function getFieldFromDetails(details: unknown): string | null {
    if (!isPlainRecord(details)) {
        return null;
    }

    const field = details.field;
    return typeof field === 'string' ? field : null;
}

function getRetryCallback(details: unknown): (() => void) | null {
    if (!isPlainRecord(details)) {
        return null;
    }

    const retry = details.retry;
    return typeof retry === 'function'
        ? () => {
              retry();
          }
        : null;
}

/**
 * 에러 핸들러 체인
 */
export class ErrorHandlerChain {
    private handlers: ErrorHandler[] = [];

    /**
     * 핸들러 추가
     */
    addHandler(handler: ErrorHandler): this {
        this.handlers.push(handler);
        return this;
    }

    /**
     * 에러 처리
     */
    handle(error: Error): void {
        for (const handler of this.handlers) {
            if (handler.canHandle(error)) {
                handler.handle(error);
                return;
            }
        }

        // 기본 핸들러
        console.error('Unhandled error:', error);
        new Notice('An unexpected error occurred.');
    }
}

/**
 * 검증 에러 핸들러
 */
export class ValidationErrorHandler implements ErrorHandler {
    canHandle(error: Error): boolean {
        return error instanceof SettingsError && error.type === ErrorType.VALIDATION;
    }

    handle(error: Error): void {
        if (!(error instanceof SettingsError)) {
            new Notice('The input is invalid.');
            return;
        }

        new Notice(error.getUserMessage());

        // 검증 에러 필드 하이라이트
        const field = getFieldFromDetails(error.details);
        if (field) {
            this.highlightErrorField(field);
        }
    }

    private highlightErrorField(fieldName: string): void {
        const field = document.querySelector(`[data-field="${fieldName}"]`);
        if (field) {
            field.classList.add('error');
            setTimeout(() => field.classList.remove('error'), 3000);
        }
    }
}

/**
 * 네트워크 에러 핸들러
 */
export class NetworkErrorHandler implements ErrorHandler {
    private retryCount = 0;
    private readonly maxRetries = 3;

    canHandle(error: Error): boolean {
        return error instanceof SettingsError && error.type === ErrorType.NETWORK;
    }

    handle(error: Error): void {
        if (!(error instanceof SettingsError)) {
            new Notice('Check your network connection.');
            return;
        }

        if (this.retryCount < this.maxRetries && error.recoverable) {
            this.retryCount++;
            new Notice(`Network error (retry ${this.retryCount}/${this.maxRetries})`);

            // 재시도 로직
            setTimeout(() => {
                // 재시도 콜백 실행
                const retryCallback = getRetryCallback(error.details);
                if (typeof retryCallback === 'function') {
                    retryCallback();
                }
            }, 1000 * this.retryCount);
        } else {
            new Notice('Check your network connection.');
            this.retryCount = 0;
        }
    }
}

/**
 * Error Boundary 컴포넌트
 */
export class ErrorBoundary {
    private errorHandlerChain: ErrorHandlerChain;
    private fallbackUI: HTMLElement | null = null;
    private app: App;

    constructor(
        private container: HTMLElement,
        app: App,
        private onError?: (error: Error) => void
    ) {
        this.app = app;
        this.errorHandlerChain = new ErrorHandlerChain()
            .addHandler(new ValidationErrorHandler())
            .addHandler(new NetworkErrorHandler())
            .addHandler(new AuthenticationErrorHandler())
            .addHandler(new StorageErrorHandler());
    }

    /**
     * 에러 처리 래퍼
     */
    wrap<T>(fn: () => T): T | null {
        try {
            return fn();
        } catch (error) {
            this.handleError(normalizeError(error));
            return null;
        }
    }

    /**
     * 비동기 에러 처리 래퍼
     */
    async wrapAsync<T>(fn: () => Promise<T>): Promise<T | null> {
        try {
            return await fn();
        } catch (error) {
            this.handleError(normalizeError(error));
            return null;
        }
    }

    /**
     * 에러 처리
     */
    private handleError(error: Error): void {
        console.error('[ErrorBoundary] Caught error:', error);

        // 에러 핸들러 체인 실행
        this.errorHandlerChain.handle(error);

        // 콜백 실행
        this.onError?.(error);

        // Fallback UI 표시
        this.showFallbackUI(error);

        // 에러 리포팅
        this.reportError(error);
    }

    /**
     * Fallback UI 표시
     */
    private showFallbackUI(error: Error): void {
        if (this.fallbackUI) {
            this.fallbackUI.remove();
        }

        this.fallbackUI = this.container.createDiv({ cls: 'error-boundary-fallback' });

        const isRecoverable = error instanceof SettingsError && error.isRecoverable();
        const container = this.fallbackUI.createDiv({ cls: 'error-container' });
        container.createDiv({ cls: 'error-icon', text: '⚠️' });
        container.createEl('h3', { text: 'Something went wrong' });
        container.createEl('p', {
            cls: 'error-message',
            text: this.getSafeErrorMessage(error),
        });

        if (isRecoverable) {
            container.createEl('button', {
                cls: 'mod-cta retry-button',
                text: 'Retry',
            });
            container.createEl('button', {
                cls: 'reset-button',
                text: 'Reset settings',
            });
        } else {
            container.createEl('button', {
                cls: 'refresh-button',
                text: 'Reload',
            });
        }

        const detailsEl = container.createEl('details', { cls: 'error-details' });
        detailsEl.createEl('summary', { text: 'Technical details' });
        detailsEl.createEl('pre', { text: this.getErrorDetails(error) });

        // 버튼 이벤트 핸들러
        this.attachFallbackHandlers(error);
    }

    /**
     * 안전한 에러 메시지 가져오기
     */
    private getSafeErrorMessage(error: Error): string {
        if (error instanceof SettingsError) {
            return error.getUserMessage();
        }

        // 민감한 정보 제거
        const message = error.message
            .replace(/api[-_]?key[s]?/gi, 'API_KEY')
            .replace(/token[s]?/gi, 'TOKEN')
            .replace(/password[s]?/gi, 'PASSWORD');

        return message;
    }

    /**
     * 에러 세부사항 가져오기
     */
    private getErrorDetails(error: Error): string {
        const details: Record<string, unknown> = {
            name: error.name,
            message: this.getSafeErrorMessage(error),
            stack: error.stack?.split('\n').slice(0, 5).join('\n'),
            timestamp: new Date().toISOString(),
        };

        if (error instanceof SettingsError) {
            details.type = error.type;
            details.recoverable = error.recoverable;
        }

        return JSON.stringify(details, null, 2);
    }

    /**
     * Fallback UI 이벤트 핸들러
     */
    private attachFallbackHandlers(error: Error): void {
        if (!this.fallbackUI) return;

        const retryButton = this.fallbackUI.querySelector('.retry-button');
        if (retryButton) {
            retryButton.addEventListener('click', () => {
                this.clearFallbackUI();
                // 재시도 로직
                const retryCallback = getRetryCallback(error);
                if (typeof retryCallback === 'function') {
                    retryCallback();
                }
            });
        }

        const resetButton = this.fallbackUI.querySelector('.reset-button');
        if (resetButton) {
            resetButton.addEventListener('click', () => {
                this.clearFallbackUI();
                // 설정 초기화 로직
                window.location.reload();
            });
        }

        const refreshButton = this.fallbackUI.querySelector('.refresh-button');
        if (refreshButton) {
            refreshButton.addEventListener('click', () => {
                window.location.reload();
            });
        }
    }

    /**
     * Fallback UI 제거
     */
    clearFallbackUI(): void {
        if (this.fallbackUI) {
            this.fallbackUI.remove();
            this.fallbackUI = null;
        }
    }

    /**
     * 에러 리포팅
     */
    private reportError(error: Error): void {
        // 에러 리포팅 서비스로 전송 (예: Sentry)
        // 프라이버시를 위해 민감한 정보는 제거
        const sanitizedError = {
            name: error.name,
            message: this.getSafeErrorMessage(error),
            type: error instanceof SettingsError ? error.type : 'UNKNOWN',
            timestamp: new Date().toISOString(),
            platform: Platform.isDesktopApp ? 'desktop' : 'mobile',
        };

        // 로컬 스토리지에 에러 로그 저장
        this.saveErrorLog(sanitizedError);
    }

    /**
     * 에러 로그 저장
     */
    private saveErrorLog(errorData: Record<string, unknown>): void {
        try {
            const storedDataRaw = this.app.loadLocalStorage('settings-error-logs') as unknown;
            const storedData = typeof storedDataRaw === 'string' ? storedDataRaw : null;
            const parsed = storedData ? (JSON.parse(storedData) as unknown) : [];
            const logs: Record<string, unknown>[] = Array.isArray(parsed)
                ? parsed.filter(isPlainRecord)
                : [];
            logs.push(errorData);

            // 최대 50개의 로그만 유지
            if (logs.length > 50) {
                logs.shift();
            }

            this.app.saveLocalStorage('settings-error-logs', JSON.stringify(logs));
        } catch {
            // 로그 저장 실패는 무시
        }
    }
}

/**
 * 인증 에러 핸들러
 */
class AuthenticationErrorHandler implements ErrorHandler {
    canHandle(error: Error): boolean {
        return error instanceof SettingsError && error.type === ErrorType.AUTHENTICATION;
    }

    handle(error: Error): void {
        if (!(error instanceof SettingsError)) {
            new Notice('Authentication failed. Check your API key.');
            return;
        }
        new Notice(error.getUserMessage());

        // API 키 입력 필드로 포커스 이동
        const apiKeyInput = document.querySelector('.api-key-input');
        if (apiKeyInput instanceof HTMLInputElement) {
            apiKeyInput.focus();
            apiKeyInput.select();
        }
    }
}

/**
 * 저장소 에러 핸들러
 */
class StorageErrorHandler implements ErrorHandler {
    canHandle(error: Error): boolean {
        return error instanceof SettingsError && error.type === ErrorType.STORAGE;
    }

    handle(error: Error): void {
        if (!(error instanceof SettingsError)) {
            new Notice('Failed to access storage.');
            return;
        }
        new Notice(error.getUserMessage());

        // 저장소 용량 확인
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            void navigator.storage.estimate().then((estimate) => {
                const percentUsed = ((estimate.usage || 0) / (estimate.quota || 1)) * 100;
                if (percentUsed > 90) {
                    new Notice('Storage is almost full. Free up some space and try again.');
                }
            });
        }
    }
}

/**
 * Graceful Degradation 헬퍼
 */
export class GracefulDegradation {
    private features = new Map<string, boolean>();

    /**
     * 기능 가용성 확인
     */
    isFeatureAvailable(feature: string): boolean {
        if (!this.features.has(feature)) {
            this.features.set(feature, this.checkFeature(feature));
        }
        return this.features.get(feature) || false;
    }

    /**
     * 기능 확인
     */
    private checkFeature(feature: string): boolean {
        switch (feature) {
            case 'clipboard':
                return 'clipboard' in navigator;
            case 'storage':
                return 'localStorage' in window;
            case 'indexeddb':
                return 'indexedDB' in window;
            case 'webworker':
                return 'Worker' in window;
            case 'notification':
                return 'Notification' in window;
            default:
                return false;
        }
    }

    /**
     * 대체 기능 실행
     */
    executeWithFallback<T>(feature: string, primary: () => T, fallback: () => T): T {
        if (this.isFeatureAvailable(feature)) {
            try {
                return primary();
            } catch (error) {
                console.warn(`Feature ${feature} failed, using fallback:`, error);
                return fallback();
            }
        } else {
            return fallback();
        }
    }
}

/**
 * 에러 복구 전략
 */
export class ErrorRecoveryStrategy {
    private strategies = new Map<ErrorType, () => void>();

    constructor() {
        this.registerDefaultStrategies();
    }

    /**
     * 기본 복구 전략 등록
     */
    private registerDefaultStrategies(): void {
        this.strategies.set(ErrorType.NETWORK, () => {
            new Notice('A network error occurred. Switching to offline mode.');
            // 오프라인 모드 활성화
        });

        this.strategies.set(ErrorType.AUTHENTICATION, () => {
            new Notice('Authentication failed. Enter the API key again.');
            // API 키 재입력 다이얼로그 표시
        });

        this.strategies.set(ErrorType.STORAGE, () => {
            new Notice('Saving failed. Falling back to temporary storage.');
            // 메모리 저장소로 전환
        });
    }

    /**
     * 복구 전략 실행
     */
    recover(error: SettingsError): void {
        const strategy = this.strategies.get(error.type);
        if (strategy) {
            strategy();
        } else {
            console.warn('No recovery strategy for error type:', error.type);
        }
    }

    /**
     * 커스텀 복구 전략 등록
     */
    registerStrategy(type: ErrorType, strategy: () => void): void {
        this.strategies.set(type, strategy);
    }
}
