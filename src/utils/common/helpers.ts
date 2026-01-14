/**
 * 공통 헬퍼 유틸리티 함수들
 * 자주 사용되는 유틸리티 로직을 중앙화
 */

/**
 * 지정된 시간만큼 대기
 */
export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 디바운스 함수 생성
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    return function debounced(...args: Parameters<T>) {
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
        }

        timeoutId = setTimeout(() => {
            func(...args);
            timeoutId = null;
        }, wait);
    };
}

/**
 * 쓰로틀 함수 생성
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
    func: T,
    limit: number
): (...args: Parameters<T>) => void {
    let inThrottle = false;

    return function throttled(...args: Parameters<T>) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => {
                inThrottle = false;
            }, limit);
        }
    };
}

/**
 * 재시도 로직 실행
 */
export async function retry<T>(
    operation: () => Promise<T>,
    options: {
        maxAttempts?: number;
        delay?: number;
        backoff?: boolean;
        onRetry?: (attempt: number, error: Error) => void;
    } = {}
): Promise<T> {
    const { maxAttempts = 3, delay = 1000, backoff = true, onRetry } = options;

    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error as Error;

            if (attempt < maxAttempts) {
                const waitTime = backoff ? delay * Math.pow(2, attempt - 1) : delay;

                if (onRetry) {
                    onRetry(attempt, lastError);
                }

                await sleep(waitTime);
            }
        }
    }

    throw lastError!;
}

/**
 * 안전한 JSON 파싱
 */
export function safeJsonParse<T = unknown>(jsonString: string, fallback: T): T {
    try {
        return JSON.parse(jsonString);
    } catch {
        return fallback;
    }
}

/**
 * 딥 클론
 */
export function deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (obj instanceof Date) {
        return new Date(obj.getTime()) as unknown as T;
    }

    if (obj instanceof Array) {
        return obj.map((item) => deepClone(item)) as unknown as T;
    }

    if (obj instanceof Map) {
        const cloned = new Map();
        obj.forEach((value, key) => {
            cloned.set(key, deepClone(value));
        });
        return cloned as unknown as T;
    }

    if (obj instanceof Set) {
        const cloned = new Set();
        obj.forEach((value) => {
            cloned.add(deepClone(value));
        });
        return cloned as unknown as T;
    }

    const cloned = {} as T;
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            cloned[key] = deepClone(obj[key]);
        }
    }

    return cloned;
}

/**
 * 객체 병합 (깊은 병합)
 */
export function deepMerge<T extends Record<string, unknown>>(
    target: T,
    ...sources: Partial<T>[]
): T {
    if (!sources.length) return target;

    const source = sources.shift();

    if (isObject(target) && isObject(source)) {
        for (const key in source) {
            const sourceValue = source[key];
            if (isObject(sourceValue)) {
                const targetValue = target[key];
                const base = isObject(targetValue) ? targetValue : {};
                const merged = deepMerge(
                    base as Record<string, unknown>,
                    sourceValue as Record<string, unknown>
                );
                Object.assign(target, { [key]: merged as T[Extract<keyof T, string>] });
            } else {
                Object.assign(target, { [key]: sourceValue });
            }
        }
    }

    return deepMerge(target, ...sources);
}

/**
 * 객체인지 확인
 */
export function isObject(item: unknown): item is Record<string, unknown> {
    return item !== null && typeof item === 'object' && !Array.isArray(item);
}

/**
 * 빈 객체인지 확인
 */
export function isEmpty(obj: unknown): boolean {
    if (obj == null) return true;
    if (typeof obj === 'string' || Array.isArray(obj)) return obj.length === 0;
    if (obj instanceof Map || obj instanceof Set) return obj.size === 0;
    if (typeof obj === 'object') return Object.keys(obj).length === 0;
    return false;
}

/**
 * 유니크 ID 생성
 */
export function generateId(prefix = ''): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 9);
    return prefix ? `${prefix}-${timestamp}-${random}` : `${timestamp}-${random}`;
}

/**
 * 배열을 청크로 분할
 */
export function chunk<T>(array: T[], size: number): T[][] {
    if (size <= 0) throw new Error('Chunk size must be positive');

    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}

/**
 * 배열에서 중복 제거
 */
export function unique<T>(array: T[], key?: (item: T) => unknown): T[] {
    if (!key) {
        return [...new Set(array)];
    }

    const seen = new Set();
    return array.filter((item) => {
        const k = key(item);
        if (seen.has(k)) {
            return false;
        }
        seen.add(k);
        return true;
    });
}

/**
 * 프로미스 타임아웃 추가
 */
export function withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage = 'Operation timed out'
): Promise<T> {
    return Promise.race([
        promise,
        new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
        }),
    ]);
}

/**
 * 에러를 Error 객체로 변환
 */
export function ensureError(value: unknown): Error {
    if (value instanceof Error) return value;

    let stringified = '[Unable to stringify the thrown value]';
    try {
        stringified = JSON.stringify(value);
    } catch {
        stringified = String(value);
    }

    return new Error(stringified);
}

/**
 * 메모이제이션
 */
export function memoize<T extends (...args: unknown[]) => unknown>(
    fn: T,
    keyResolver?: (...args: Parameters<T>) => string
): T {
    const cache = new Map<string, ReturnType<T>>();

    return ((...args: Parameters<T>) => {
        const key = keyResolver ? keyResolver(...args) : JSON.stringify(args);

        if (cache.has(key)) {
            return cache.get(key);
        }

        const result = fn(...args) as ReturnType<T>;
        cache.set(key, result);
        return result;
    }) as T;
}
