import { Notice } from 'obsidian';
import { Logger } from '../infrastructure/logging/Logger';

/**
 * 에러 심각도 레벨
 */
export enum ErrorSeverity {
    CRITICAL = 'critical', // 플러그인 동작 불가
    HIGH = 'high', // 주요 기능 영향
    MEDIUM = 'medium', // 일부 기능 영향
    LOW = 'low', // 미미한 영향
}

/**
 * 에러 컨텍스트
 */
export interface ErrorContext {
    component?: string;
    operation?: string;
    userId?: string;
    timestamp?: number;
    metadata?: Record<string, unknown>;
}

/**
 * 에러 복구 전략
 */
export interface RecoveryStrategy {
    name: string;
    canRecover: (error: Error, context: ErrorContext) => boolean;
    recover: (error: Error, context: ErrorContext) => Promise<void>;
}

/**
 * 에러 경계 관리자
 * 전역 에러 처리 및 복구 전략 관리
 */
export class ErrorBoundary {
    private logger: Logger;
    private recoveryStrategies: RecoveryStrategy[] = [];
    private errorHandlers: Map<string, (error: Error) => void> = new Map();
    private errorCount: Map<string, number> = new Map();
    private readonly MAX_ERROR_COUNT = 5;
    private readonly ERROR_RESET_INTERVAL = 60000; // 1분

    constructor() {
        this.logger = new Logger('ErrorBoundary');
        this.setupDefaultStrategies();
        this.setupGlobalErrorHandlers();
    }

    /**
     * 기본 복구 전략 설정
     */
    private setupDefaultStrategies(): void {
        // UI 에러 복구 전략
        this.addRecoveryStrategy({
            name: 'UI Recovery',
            canRecover: (error, context) => {
                return (
                    context.component?.startsWith('UI') ||
                    error.message.includes('StatusBar') ||
                    error.message.includes('SettingsTab')
                );
            },
            recover: async (error, context) => {
                this.logger.warn(
                    `UI component error in ${context.component}, attempting graceful degradation`
                );
                // UI 컴포넌트는 무시하고 계속 진행
                await Promise.resolve();
            },
        });

        // API 에러 복구 전략
        this.addRecoveryStrategy({
            name: 'API Recovery',
            canRecover: (error) => {
                return (
                    error.message.includes('API') ||
                    error.message.includes('Network') ||
                    error.name === 'NetworkError'
                );
            },
            recover: async (_error) => {
                this.logger.warn('API error detected, will retry with exponential backoff');
                // 재시도 로직은 별도 서비스에서 처리
                await Promise.resolve();
            },
        });

        // 설정 에러 복구 전략
        this.addRecoveryStrategy({
            name: 'Settings Recovery',
            canRecover: (error, context) => {
                return (
                    context.component === 'SettingsManager' || error.message.includes('settings')
                );
            },
            recover: async (_error, _context) => {
                this.logger.warn('Settings error detected, using default settings');
                // 기본 설정으로 폴백
                await Promise.resolve();
            },
        });
    }

    /**
     * 전역 에러 핸들러 설정
     */
    private setupGlobalErrorHandlers(): void {
        // 처리되지 않은 Promise rejection 처리
        if (typeof window !== 'undefined') {
            window.addEventListener('unhandledrejection', (event) => {
                let errorMessage = 'Unhandled Promise rejection';

                // Type guard for error-like objects
                const reason: unknown = event.reason;
                if (
                    typeof reason === 'object' &&
                    reason !== null &&
                    'message' in reason &&
                    typeof (reason as { message: unknown }).message === 'string'
                ) {
                    errorMessage = (reason as { message: string }).message;
                }

                void this.handleError(new Error(errorMessage), {
                    component: 'Global',
                    operation: 'Promise',
                });
                event.preventDefault();
            });

            // 전역 에러 처리
            window.addEventListener('error', (event) => {
                const error = event.error instanceof Error ? event.error : new Error(event.message);
                void this.handleError(error, {
                    component: 'Global',
                    operation: 'Runtime',
                });
                event.preventDefault();
            });
        }
    }

    /**
     * 복구 전략 추가
     */
    public addRecoveryStrategy(strategy: RecoveryStrategy): void {
        this.recoveryStrategies.push(strategy);
        this.logger.debug(`Added recovery strategy: ${strategy.name}`);
    }

    /**
     * 에러 처리 래퍼
     */
    public async wrap<T>(
        fn: () => Promise<T> | T,
        context: ErrorContext = {}
    ): Promise<T | undefined> {
        try {
            return await fn();
        } catch (error) {
            await this.handleError(this.normalizeError(error), context);
            return undefined;
        }
    }

    /**
     * 동기 함수 래퍼
     */
    public wrapSync<T>(fn: () => T, context: ErrorContext = {}): T | undefined {
        try {
            return fn();
        } catch (error) {
            void this.handleError(this.normalizeError(error), context);
            return undefined;
        }
    }

    /**
     * 에러 정규화
     */
    private normalizeError(error: unknown): Error {
        return error instanceof Error ? error : new Error(String(error));
    }

    /**
     * 에러 처리
     */
    public async handleError(error: Error, context: ErrorContext = {}): Promise<void> {
        // 컨텍스트 보강
        context.timestamp = Date.now();

        // 에러 빈도 체크
        if (this.isErrorRateTooHigh(error, context)) {
            this.handleCriticalError(error, context);
            return;
        }

        // 에러 로깅
        this.logError(error, context);

        // 복구 시도
        const recovered = await this.attemptRecovery(error, context);

        if (!recovered) {
            // 복구 실패 시 사용자 알림
            this.notifyUser(error, context);
        }

        // 에러 카운트 증가
        this.incrementErrorCount(error, context);
    }

    /**
     * 에러 빈도 확인
     */
    private isErrorRateTooHigh(error: Error, context: ErrorContext): boolean {
        const key = `${context.component}-${context.operation}`;
        const count = this.errorCount.get(key) || 0;

        if (count >= this.MAX_ERROR_COUNT) {
            // 일정 시간 후 카운트 리셋
            setTimeout(() => {
                this.errorCount.set(key, 0);
            }, this.ERROR_RESET_INTERVAL);

            return true;
        }

        return false;
    }

    /**
     * 에러 카운트 증가
     */
    private incrementErrorCount(error: Error, context: ErrorContext): void {
        const key = `${context.component}-${context.operation}`;
        const count = this.errorCount.get(key) || 0;
        this.errorCount.set(key, count + 1);
    }

    /**
     * 복구 시도
     */
    private async attemptRecovery(error: Error, context: ErrorContext): Promise<boolean> {
        for (const strategy of this.recoveryStrategies) {
            if (strategy.canRecover(error, context)) {
                try {
                    await strategy.recover(error, context);
                    this.logger.info(`Recovered from error using strategy: ${strategy.name}`);
                    return true;
                } catch (recoveryError) {
                    this.logger.error(
                        `Recovery strategy ${strategy.name} failed`,
                        recoveryError instanceof Error ? recoveryError : undefined
                    );
                }
            }
        }
        return false;
    }

    /**
     * 에러 로깅
     */
    private logError(error: Error, context: ErrorContext): void {
        const severity = this.determineErrorSeverity(error, context);

        const errorInfo = {
            message: error.message,
            stack: error.stack,
            context,
            severity,
        };

        switch (severity) {
            case ErrorSeverity.CRITICAL:
            case ErrorSeverity.HIGH:
                this.logger.error('Error occurred', error, errorInfo);
                break;
            case ErrorSeverity.MEDIUM:
                this.logger.warn('Warning', errorInfo);
                break;
            case ErrorSeverity.LOW:
                this.logger.debug('Minor issue', errorInfo);
                break;
        }
    }

    /**
     * 에러 심각도 판단
     */
    private determineErrorSeverity(error: Error, context: ErrorContext): ErrorSeverity {
        // Critical: 플러그인 초기화 실패
        if (context.component === 'PluginLifecycle' && context.operation === 'initialize') {
            return ErrorSeverity.CRITICAL;
        }

        // High: 핵심 서비스 실패
        if (['TranscriptionService', 'EditorService'].includes(context.component || '')) {
            return ErrorSeverity.HIGH;
        }

        // Medium: UI 컴포넌트 실패
        if (context.component?.startsWith('UI')) {
            return ErrorSeverity.MEDIUM;
        }

        // Low: 기타
        return ErrorSeverity.LOW;
    }

    /**
     * 사용자 알림
     */
    private notifyUser(error: Error, context: ErrorContext): void {
        const severity = this.determineErrorSeverity(error, context);

        if (severity === ErrorSeverity.LOW) {
            // 낮은 심각도는 알림하지 않음
            return;
        }

        let message = '';
        switch (severity) {
            case ErrorSeverity.CRITICAL:
                message = `Critical error: ${error.message}. Plugin may not function properly.`;
                break;
            case ErrorSeverity.HIGH:
                message = `Error in ${context.component}: ${error.message}`;
                break;
            case ErrorSeverity.MEDIUM:
                message = `Warning: ${error.message}`;
                break;
        }

        if (message) {
            new Notice(message, severity === ErrorSeverity.CRITICAL ? 10000 : 5000);
        }
    }

    /**
     * 치명적 에러 처리
     */
    private handleCriticalError(error: Error, context: ErrorContext): void {
        this.logger.error('CRITICAL ERROR - Too many errors detected', error, {
            context,
        });

        new Notice('Speech-to-Text plugin is experiencing issues. Please restart Obsidian.', 15000);

        // 플러그인 비활성화 고려
        // this.plugin.unload();
    }

    /**
     * 컴포넌트별 에러 핸들러 등록
     */
    public registerErrorHandler(component: string, handler: (error: Error) => void): void {
        this.errorHandlers.set(component, handler);
    }

    /**
     * 에러 통계 반환
     */
    public getErrorStats(): Record<string, number> {
        const stats: Record<string, number> = {};
        this.errorCount.forEach((count, key) => {
            stats[key] = count;
        });
        return stats;
    }

    /**
     * 에러 카운트 리셋
     */
    public resetErrorCounts(): void {
        this.errorCount.clear();
        this.logger.info('Error counts reset');
    }
}
