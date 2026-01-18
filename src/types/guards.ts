/**
 * 타입 가드 함수들
 * 런타임 타입 체크를 위한 유틸리티
 */

import type {
    WhisperResponse,
    WhisperOptions,
    ILogger,
    ISettingsManager,
    IWhisperService,
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
    if (!(typeof value === 'object' && value !== null)) {
        return false;
    }
    const then: unknown = Reflect.get(value, 'then');
    return value instanceof Promise || typeof then === 'function';
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
    if (!isRecord(value)) {
        return false;
    }

    const text = Reflect.get(value, 'text');
    const language = Reflect.get(value, 'language');
    const duration = Reflect.get(value, 'duration');
    const segments = Reflect.get(value, 'segments');

    return (
        typeof text === 'string' &&
        (language === undefined || typeof language === 'string') &&
        (duration === undefined || typeof duration === 'number') &&
        (segments === undefined || Array.isArray(segments))
    );
}

/**
 * Whisper Options 타입 가드
 */
export function isWhisperOptions(value: unknown): value is WhisperOptions {
    if (!isRecord(value)) {
        return false;
    }

    const model = Reflect.get(value, 'model');
    const prompt = Reflect.get(value, 'prompt');
    const responseFormat = Reflect.get(value, 'responseFormat');
    const temperature = Reflect.get(value, 'temperature');
    const language = Reflect.get(value, 'language');

    return (
        (model === undefined || typeof model === 'string') &&
        (prompt === undefined || typeof prompt === 'string') &&
        (responseFormat === undefined ||
            (typeof responseFormat === 'string' &&
                ['json', 'text', 'srt', 'verbose_json', 'vtt'].includes(responseFormat))) &&
        (temperature === undefined ||
            (typeof temperature === 'number' && temperature >= 0 && temperature <= 1)) &&
        (language === undefined || typeof language === 'string')
    );
}

/**
 * Logger 인터페이스 타입 가드
 */
export function isLogger(value: unknown): value is ILogger {
    if (!isRecord(value)) {
        return false;
    }

    return (
        typeof Reflect.get(value, 'debug') === 'function' &&
        typeof Reflect.get(value, 'info') === 'function' &&
        typeof Reflect.get(value, 'warn') === 'function' &&
        typeof Reflect.get(value, 'error') === 'function'
    );
}

/**
 * Settings Manager 인터페이스 타입 가드
 */
export function isSettingsManager(value: unknown): value is ISettingsManager {
    if (!isRecord(value)) {
        return false;
    }

    return (
        typeof Reflect.get(value, 'load') === 'function' &&
        typeof Reflect.get(value, 'save') === 'function' &&
        typeof Reflect.get(value, 'get') === 'function' &&
        typeof Reflect.get(value, 'set') === 'function'
    );
}

/**
 * Whisper Service 인터페이스 타입 가드
 */
export function isWhisperService(value: unknown): value is IWhisperService {
    if (!isRecord(value)) {
        return false;
    }

    return (
        typeof Reflect.get(value, 'transcribe') === 'function' &&
        typeof Reflect.get(value, 'cancel') === 'function' &&
        typeof Reflect.get(value, 'validateApiKey') === 'function'
    );
}

/**
 * 문자열 배열 타입 가드
 */
export function isStringArray(value: unknown): value is string[] {
    return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

/**
 * 숫자 배열 타입 가드
 */
export function isNumberArray(value: unknown): value is number[] {
    return Array.isArray(value) && value.every((item) => typeof item === 'number');
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

    for (const [key, val] of Object.entries(value)) {
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
 * Plain record 타입 가드 (배열 제외)
 */
export function isPlainRecord(value: unknown): value is Record<string, unknown> {
    return isRecord(value) && !Array.isArray(value);
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
export function isAsyncFunction(value: unknown): value is (...args: unknown[]) => Promise<unknown> {
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
