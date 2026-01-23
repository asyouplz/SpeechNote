/**
 * Deepgram 전용 로거
 * 일관된 로깅 패턴과 레벨 관리
 */

import { LOG_PREFIX, LOG_LEVEL, LogLevel } from '../../../config/DeepgramConstants';

export class DeepgramLogger {
    private static instance: DeepgramLogger;
    private enabled = true;
    private minLevel: LogLevel = LOG_LEVEL.INFO;

    private constructor() {}

    public static getInstance(): DeepgramLogger {
        if (!DeepgramLogger.instance) {
            DeepgramLogger.instance = new DeepgramLogger();
        }
        return DeepgramLogger.instance;
    }

    /**
     * 로깅 활성화/비활성화
     */
    public setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }

    /**
     * 최소 로그 레벨 설정
     */
    public setMinLevel(level: LogLevel): void {
        this.minLevel = level;
    }

    /**
     * 디버그 로그
     */
    public debug(message: string, ...args: unknown[]): void {
        if (this.shouldLog(LOG_LEVEL.DEBUG)) {
            console.debug(`${LOG_PREFIX} ${message}`, ...args);
        }
    }

    /**
     * 정보 로그
     */
    public info(message: string, ...args: unknown[]): void {
        if (this.shouldLog(LOG_LEVEL.INFO)) {
            console.debug(`${LOG_PREFIX} ${message}`, ...args);
        }
    }

    /**
     * 경고 로그
     */
    public warn(message: string, ...args: unknown[]): void {
        if (this.shouldLog(LOG_LEVEL.WARN)) {
            console.warn(`${LOG_PREFIX} ${message}`, ...args);
        }
    }

    /**
     * 에러 로그
     */
    public error(message: string, error?: unknown): void {
        if (this.shouldLog(LOG_LEVEL.ERROR)) {
            console.error(`${LOG_PREFIX} ${message}`);
            if (error) {
                if (error instanceof Error) {
                    console.error(`${LOG_PREFIX} Error details:`, {
                        message: error.message,
                        stack: error.stack,
                    });
                } else {
                    console.error(`${LOG_PREFIX} Error details:`, error);
                }
            }
        }
    }

    /**
     * 그룹 로깅 시작
     */
    public group(label: string): void {
        if (this.enabled) {
            // eslint-disable-next-line no-console
            console.group(`${LOG_PREFIX} ${label}`);
        }
    }

    /**
     * 그룹 로깅 종료
     */
    public groupEnd(): void {
        if (this.enabled) {
            // eslint-disable-next-line no-console
            console.groupEnd();
        }
    }

    /**
     * 로그 레벨 확인
     */
    private shouldLog(level: LogLevel): boolean {
        if (!this.enabled) return false;

        const levels: Record<LogLevel, number> = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3,
        };

        return levels[level] >= levels[this.minLevel];
    }

    /**
     * 성능 측정 시작
     */
    public time(label: string): void {
        if (this.enabled) {
            // eslint-disable-next-line no-console
            console.time(`${LOG_PREFIX} ${label}`);
        }
    }

    /**
     * 성능 측정 종료
     */
    public timeEnd(label: string): void {
        if (this.enabled) {
            // eslint-disable-next-line no-console
            console.timeEnd(`${LOG_PREFIX} ${label}`);
        }
    }
}
