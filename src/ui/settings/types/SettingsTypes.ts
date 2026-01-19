/**
 * Settings 관련 타입 정의 및 Type Guards
 *
 * 타입 안전성을 보장하기 위한 유틸리티 타입과 가드 함수들
 */

import {
    TranscriptionProvider,
    SelectionStrategy,
} from '../../../infrastructure/api/providers/ITranscriber';
import { isDate, isPlainRecord, isRecord } from '../../../types/guards';

// === 기본 타입 정의 ===

/**
 * API 키 정보
 */
export interface ApiKeyInfo {
    provider: TranscriptionProvider;
    key: string;
    encrypted: boolean;
    isValid: boolean;
    lastValidated?: Date;
    expiresAt?: Date;
}

/**
 * Provider 상태
 */
export interface ProviderStatus {
    provider: TranscriptionProvider;
    isConnected: boolean;
    lastChecked: Date;
    latency?: number;
    errorCount: number;
    successRate: number;
}

/**
 * 검증 결과
 */
export interface ValidationResult<T = unknown> {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    data?: T;
}

/**
 * 설정 변경 이벤트
 */
export interface SettingsChangeEvent<T = unknown> {
    key: string;
    oldValue: T;
    newValue: T;
    timestamp: Date;
}

/**
 * 메트릭 데이터
 */
export interface MetricsData {
    provider: TranscriptionProvider;
    period: 'hour' | 'day' | 'week' | 'month';
    requests: number;
    successCount: number;
    errorCount: number;
    avgLatency: number;
    totalCost: number;
    timestamps: Date[];
}

// === Union Types ===

/**
 * 설정 값 타입
 */
export type SettingValue =
    | string
    | number
    | boolean
    | Date
    | Record<string, unknown>
    | unknown[];

/**
 * 설정 키 타입 (type-safe keys)
 */
export type SettingKey<T> = keyof T & string;

/**
 * 에러 레벨
 */
export type ErrorLevel = 'info' | 'warning' | 'error' | 'critical';

/**
 * UI 상태
 */
export type UIState = 'idle' | 'loading' | 'saving' | 'error' | 'success';

// === Type Guards ===

const selectionStrategyValues = new Set<string>(Object.values(SelectionStrategy));

/**
 * TranscriptionProvider 타입 가드
 */
export function isTranscriptionProvider(value: unknown): value is TranscriptionProvider {
    return typeof value === 'string' && ['whisper', 'deepgram'].includes(value);
}

/**
 * SelectionStrategy 타입 가드
 */
export function isSelectionStrategy(value: unknown): value is SelectionStrategy {
    return typeof value === 'string' && selectionStrategyValues.has(value);
}

/**
 * ApiKeyInfo 타입 가드
 */
export function isApiKeyInfo(value: unknown): value is ApiKeyInfo {
    if (!isRecord(value)) return false;

    return (
        isTranscriptionProvider(value.provider) &&
        typeof value.key === 'string' &&
        typeof value.encrypted === 'boolean' &&
        typeof value.isValid === 'boolean'
    );
}

/**
 * ValidationResult 타입 가드
 */
export function isValidationResult(value: unknown): value is ValidationResult {
    if (!isRecord(value)) return false;

    return (
        typeof value.isValid === 'boolean' &&
        Array.isArray(value.errors) &&
        Array.isArray(value.warnings)
    );
}

/**
 * Date 타입 가드
 */
export function isValidDate(value: unknown): value is Date {
    return isDate(value);
}

/**
 * 숫자 범위 타입 가드
 */
export function isInRange(value: unknown, min: number, max: number): value is number {
    return typeof value === 'number' && !isNaN(value) && value >= min && value <= max;
}

/**
 * 문자열 패턴 타입 가드
 */
export function matchesPattern(value: unknown, pattern: RegExp): value is string {
    return typeof value === 'string' && pattern.test(value);
}

// === 제네릭 유틸리티 타입 ===

/**
 * Deep Partial 타입
 */
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Deep Readonly 타입
 */
export type DeepReadonly<T> = {
    readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/**
 * Required Keys 타입
 */
export type RequiredKeys<T> = {
    [K in keyof T]-?: object extends Pick<T, K> ? never : K;
}[keyof T];

/**
 * Optional Keys 타입
 */
export type OptionalKeys<T> = {
    [K in keyof T]-?: object extends Pick<T, K> ? K : never;
}[keyof T];

/**
 * Nullable 타입
 */
export type Nullable<T> = T | null | undefined;

/**
 * NonNullableObject 타입
 */
export type NonNullableObject<T> = {
    [P in keyof T]-?: NonNullable<T[P]>;
};

// === 유틸리티 클래스 ===

/**
 * 타입 안전한 설정 접근자
 */
export class TypeSafeSettings<T extends Record<string, unknown>> {
    constructor(private settings: T) { }

    /**
     * 타입 안전한 getter
     */
    get<K extends keyof T>(key: K): T[K] {
        return this.settings[key];
    }

    /**
     * 타입 안전한 setter
     */
    set<K extends keyof T>(key: K, value: T[K]): void {
        this.settings[key] = value;
    }

    /**
     * 기본값과 함께 가져오기
     */
    getWithDefault<K extends keyof T>(key: K, defaultValue: T[K]): T[K] {
        return this.settings[key] ?? defaultValue;
    }

    /**
     * 여러 값 한번에 설정
     */
    setMultiple(updates: Partial<T>): void {
        Object.assign(this.settings, updates);
    }

    /**
     * 검증과 함께 설정
     */
    setWithValidation<K extends keyof T>(
        key: K,
        value: T[K],
        validator: (value: T[K]) => boolean
    ): boolean {
        if (validator(value)) {
            this.settings[key] = value;
            return true;
        }
        return false;
    }

    /**
     * 모든 설정 가져오기
     */
    getAll(): Readonly<T> {
        return Object.freeze({ ...this.settings });
    }
}

/**
 * 설정 변경 추적기
 */
export class SettingsChangeTracker<T extends Record<string, unknown>> {
    private originalSettings: T;
    private changes: Map<keyof T, { old: T[keyof T]; new: T[keyof T] }> = new Map();

    constructor(settings: T) {
        this.originalSettings = { ...settings };
    }

    /**
     * 변경 추적
     */
    track<K extends keyof T>(key: K, newValue: T[K]): void {
        if (!this.changes.has(key)) {
            this.changes.set(key, {
                old: this.originalSettings[key],
                new: newValue,
            });
        } else {
            const change = this.changes.get(key);
            if (change) {
                change.new = newValue;
            }
        }
    }

    /**
     * 변경사항 확인
     */
    hasChanges(): boolean {
        return this.changes.size > 0;
    }

    /**
     * 변경사항 가져오기
     */
    getChanges(): Map<keyof T, { old: T[keyof T]; new: T[keyof T] }> {
        return new Map(this.changes);
    }

    /**
     * 변경사항 초기화
     */
    reset(): void {
        this.changes.clear();
    }

    /**
     * 원본으로 되돌리기
     */
    revert(): T {
        this.changes.clear();
        return { ...this.originalSettings };
    }
}

/**
 * 설정 검증기
 */
export class SettingsValidator<T extends Record<string, unknown>> {
    private rules = new Map<string, Array<(value: unknown) => ValidationResult>>();

    /**
     * 검증 규칙 추가
     */
    addRule<K extends keyof T>(key: K, validator: (value: T[K]) => ValidationResult): this {
        const fieldKey = String(key);
        if (!this.rules.has(fieldKey)) {
            this.rules.set(fieldKey, []);
        }
        const fieldRules = this.rules.get(fieldKey);
        if (fieldRules) {
            fieldRules.push((value: unknown) => validator(value as T[K]));
        }
        return this;
    }

    /**
     * 단일 필드 검증
     */
    validateField(key: string, value: unknown): ValidationResult {
        const validators = this.rules.get(key) || [];
        const errors: string[] = [];
        const warnings: string[] = [];

        for (const validator of validators) {
            const result = validator(value);
            errors.push(...result.errors);
            warnings.push(...result.warnings);

            if (!result.isValid) {
                return { isValid: false, errors, warnings };
            }
        }

        return { isValid: true, errors, warnings, data: value };
    }

    /**
     * 전체 설정 검증
     */
    validateAll(settings: T): ValidationResult<T> {
        const errors: string[] = [];
        const warnings: string[] = [];
        let isValid = true;

        for (const [key, value] of Object.entries(settings)) {
            const result = this.validateField(key, value);
            errors.push(...result.errors);
            warnings.push(...result.warnings);

            if (!result.isValid) {
                isValid = false;
            }
        }

        return { isValid, errors, warnings, data: isValid ? settings : undefined };
    }
}

// === 헬퍼 함수 ===

/**
 * 안전한 JSON 파싱
 */
export function safeJsonParse<T>(json: string, defaultValue: T): T {
    try {
        return JSON.parse(json) as T;
    } catch {
        return defaultValue;
    }
}

/**
 * 깊은 병합
 */
export function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
    const result = { ...target };

    for (const key in source) {
        const sourceValue = source[key];
        if (sourceValue !== undefined) {
            const targetValue = target[key];
            if (isPlainRecord(sourceValue) && isPlainRecord(targetValue)) {
                result[key] = deepMerge(targetValue as Record<string, unknown>, sourceValue as Record<string, unknown>) as T[Extract<keyof T, string>];
            } else {
                result[key] = sourceValue as T[Extract<keyof T, string>];
            }
        }
    }

    return result;
}

/**
 * 깊은 동등성 비교
 */
export function deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;

    if (a == null || b == null) return false;

    if (typeof a !== typeof b) return false;

    if (typeof a !== 'object') return false;

    if (!isRecord(a) || !isRecord(b)) return false;

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
        if (!keysB.includes(key)) return false;
        if (!deepEqual(a[key], b[key])) return false;
    }

    return true;
}

/**
 * Debounced 설정 저장
 */
export function createDebouncedSave<T>(
    saveFn: (settings: T) => Promise<void>,
    delay = 500
): (settings: T) => void {
    let timeoutId: number | undefined;

    return (settings: T) => {
        if (timeoutId !== undefined) {
            window.clearTimeout(timeoutId);
        }

        timeoutId = window.setTimeout(() => {
            void saveFn(settings);
            timeoutId = undefined;
        }, delay);
    };
}

/**
 * 설정 마이그레이션 헬퍼
 */
export function migrateSettings<T extends { version: number }>(
    settings: T,
    migrations: Array<(settings: T) => T>,
    currentVersion: number
): T {
    let migrated = settings;
    const startVersion = migrated?.version || 0;

    for (let i = startVersion; i < currentVersion; i++) {
        if (migrations[i]) {
            migrated = migrations[i](migrated);
        }
    }

    migrated.version = currentVersion;
    return migrated;
}
