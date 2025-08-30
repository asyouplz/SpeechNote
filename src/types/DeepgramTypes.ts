/**
 * Deepgram 관련 타입 정의
 * 타입 안정성 강화 및 any 타입 제거
 */

// 설정 관련 타입
export interface DeepgramSettings {
    enabled: boolean;
    model?: string;
    features?: DeepgramFeatures;
}

export interface DeepgramFeatures {
    punctuation?: boolean;
    smartFormat?: boolean;
    diarization?: boolean;
    numerals?: boolean;
    profanityFilter?: boolean;
    redaction?: boolean;
    utterances?: boolean;
    summarization?: boolean;
    [key: string]: boolean | undefined; // 확장성을 위한 인덱스 시그니처
}

export interface TranscriptionSettings {
    deepgram?: DeepgramSettings;
    [key: string]: any; // 다른 transcription 서비스를 위한 확장성
}

// UI 컴포넌트 타입
export interface DropdownComponent {
    addOption(value: string, display: string): DropdownComponent;
    setValue(value: string): DropdownComponent;
    onChange(callback: (value: string) => Promise<void>): DropdownComponent;
}

export interface TextComponent {
    setPlaceholder(placeholder: string): TextComponent;
    setValue(value: string): TextComponent;
    onChange(callback: (value: string) => Promise<void>): TextComponent;
    inputEl: HTMLInputElement;
}

export interface ToggleComponent {
    setValue(value: boolean): ToggleComponent;
    onChange(callback: (value: boolean) => Promise<void>): ToggleComponent;
    setDisabled(disabled: boolean): ToggleComponent;
}

export interface ButtonComponent {
    setButtonText(text: string): ButtonComponent;
    setCta(): ButtonComponent;
    removeCta(): ButtonComponent;
    setWarning(): ButtonComponent;
    setDisabled(disabled: boolean): ButtonComponent;
    onClick(callback: () => Promise<void>): ButtonComponent;
}

// 성능 관련 타입
export type PerformanceSpeed = 'fast' | 'moderate' | 'slow';
export type PerformanceLatency = 'low' | 'medium' | 'high';
export type ModelTier = 'premium' | 'standard' | 'basic' | 'economy';

// 비용 관련 타입
export interface PricingInfo {
    perMinute: number;
    currency: string;
}

// 모델 성능 타입
export interface ModelPerformance {
    accuracy: number;
    speed: PerformanceSpeed;
    latency: PerformanceLatency;
}

// 모델 요구사항 타입
export interface ModelRequirements {
    language?: string;
    maxPrice?: number;
    minAccuracy?: number;
    requiredFeatures?: string[];
}

// 검증 결과 타입
export interface ValidationResult {
    valid: boolean;
    errors: string[];
}

// API 응답 타입
export interface DeepgramApiResponse {
    status: number;
    ok: boolean;
    data?: any;
    error?: string;
}

// 이벤트 핸들러 타입
export type AsyncEventHandler<T = void> = (event: T) => Promise<void>;
export type SyncEventHandler<T = void> = (event: T) => void;

// 설정 콜백 타입
export type SettingsChangeCallback<T> = (value: T) => Promise<void>;

// 플러그인 설정 타입 (기존 코드와 호환성 유지)
export interface PluginSettings {
    deepgramApiKey?: string;
    transcription?: TranscriptionSettings;
    language?: string;
    requestTimeout?: number;
    maxRetries?: number;
    monthlyBudget?: number;
    [key: string]: any; // 기타 설정을 위한 확장성
}