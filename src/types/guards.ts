/**
 * 타입 가드 함수들
 * 런타임 타입 체크를 위한 유틸리티
 */

import type { 
    WhisperResponse, 
    WhisperOptions,
    ILogger,
    ISettingsManager,
    IWhisperService
} from './index';

/**
 * Error 타입 가드
 */
export function isError(value: unknown): value is Error {
    return value instanceof Error;
}

/**
 * Promise 타입 가드
 */
export function isPromise<T = unknown>(value: unknown): value is Promise<T> {
    return (
        value instanceof Promise ||
        (typeof value === 'object' &&
            value !== null &&
            'then' in value &&
            typeof (value as { then?: unknown }).then === 'function')
    );
}

/**
 * ArrayBuffer 타입 가드
 */
export function isArrayBuffer(value: unknown): value is ArrayBuffer {
    return value instanceof ArrayBuffer;
}

/**
 * Whisper Response 타입 가드
 */
export function isWhisperResponse(value: unknown): value is WhisperResponse {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    
    const response = value as {
        text?: unknown;
        language?: unknown;
        duration?: unknown;
        segments?: unknown;
    };
    
    return (
        typeof response.text === 'string' &&
        (response.language === undefined || typeof response.language === 'string') &&
        (response.duration === undefined || typeof response.duration === 'number') &&
        (response.segments === undefined || Array.isArray(response.segments))
    );
}

/**
 * Whisper Options 타입 가드
 */
export function isWhisperOptions(value: unknown): value is WhisperOptions {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    
    const options = value as {
        model?: unknown;
        prompt?: unknown;
        responseFormat?: unknown;
        temperature?: unknown;
        language?: unknown;
    };
    
    return (
        (options.model === undefined || typeof options.model === 'string') &&
        (options.prompt === undefined || typeof options.prompt === 'string') &&
        (options.responseFormat === undefined || 
            (typeof options.responseFormat === 'string' &&
                ['json', 'text', 'srt', 'verbose_json', 'vtt'].includes(options.responseFormat))) &&
        (options.temperature === undefined || 
            (typeof options.temperature === 'number' && options.temperature >= 0 && options.temperature <= 1)) &&
        (options.language === undefined || typeof options.language === 'string')
    );
}

/**
 * Logger 인터페이스 타입 가드
 */
export function isLogger(value: unknown): value is ILogger {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    
    const logger = value as {
        debug?: unknown;
        info?: unknown;
        warn?: unknown;
        error?: unknown;
    };
    
    return (
        typeof logger.debug === 'function' &&
        typeof logger.info === 'function' &&
        typeof logger.warn === 'function' &&
        typeof logger.error === 'function'
    );
}

/**
 * Settings Manager 인터페이스 타입 가드
 */
export function isSettingsManager(value: unknown): value is ISettingsManager {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    
    const manager = value as {
        load?: unknown;
        save?: unknown;
        get?: unknown;
        set?: unknown;
    };
    
    return (
        typeof manager.load === 'function' &&
        typeof manager.save === 'function' &&
        typeof manager.get === 'function' &&
        typeof manager.set === 'function'
    );
}

/**
 * Whisper Service 인터페이스 타입 가드
 */
export function isWhisperService(value: unknown): value is IWhisperService {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    
    const service = value as {
        transcribe?: unknown;
        cancel?: unknown;
        validateApiKey?: unknown;
    };
    
    return (
        typeof service.transcribe === 'function' &&
        typeof service.cancel === 'function' &&
        typeof service.validateApiKey === 'function'
    );
}

/**
 * 문자열 배열 타입 가드
 */
export function isStringArray(value: unknown): value is string[] {
    return Array.isArray(value) && value.every(item => typeof item === 'string');
}

/**
 * 숫자 배열 타입 가드
 */
export function isNumberArray(value: unknown): value is number[] {
    return Array.isArray(value) && value.every(item => typeof item === 'number');
}

/**
 * Record 타입 가드
 */
export function isRecord<K extends string | number | symbol, V>(
    value: unknown,
    keyGuard?: (key: unknown) => key is K,
    valueGuard?: (value: unknown) => value is V
): value is Record<K, V> {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    
    const record = value as Record<string | number | symbol, unknown>;
    
    for (const [key, val] of Object.entries(record)) {
        if (keyGuard && !keyGuard(key)) {
            return false;
        }
        if (valueGuard && !valueGuard(val)) {
            return false;
        }
    }
    
    return true;
}

/**
 * null이나 undefined가 아닌지 확인
 */
export function isDefined<T>(value: T | null | undefined): value is T {
    return value !== null && value !== undefined;
}

/**
 * 빈 값이 아닌지 확인
 */
export function isNotEmpty(value: unknown): boolean {
    if (value === null || value === undefined) {
        return false;
    }
    
    if (typeof value === 'string' || Array.isArray(value)) {
        return value.length > 0;
    }
    
    if (value instanceof Map || value instanceof Set) {
        return value.size > 0;
    }
    
    if (typeof value === 'object') {
        return Object.keys(value).length > 0;
    }
    
    return true;
}

/**
 * 함수 타입 가드
 */
export type AnyFunction = (...args: never[]) => unknown;

export function isFunction(value: unknown): value is AnyFunction {
    return typeof value === 'function';
}

/**
 * 비동기 함수 타입 가드
 */
export function isAsyncFunction(
    value: unknown
): value is (...args: unknown[]) => Promise<unknown> {
    return typeof value === 'function' && value.constructor.name === 'AsyncFunction';
}

/**
 * Date 객체 타입 가드
 */
export function isDate(value: unknown): value is Date {
    return value instanceof Date && !isNaN(value.getTime());
}

/**
 * RegExp 객체 타입 가드
 */
export function isRegExp(value: unknown): value is RegExp {
    return value instanceof RegExp;
}

/**
 * URL 타입 가드
 */
export function isURL(value: unknown): value is URL {
    if (typeof value === 'string') {
        try {
            new URL(value);
            return true;
        } catch {
            return false;
        }
    }
    return value instanceof URL;
}
