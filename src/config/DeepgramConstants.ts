/**
 * Deepgram 관련 상수 정의
 * 모든 매직 스트링과 설정 값을 중앙에서 관리
 */

// 로깅 관련
export const LOG_PREFIX = '[Deepgram]';
export const LOG_LEVEL = {
    DEBUG: 'debug',
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error'
} as const;

// UI 관련 상수
export const UI_CONSTANTS = {
    // CSS 클래스
    CLASSES: {
        API_KEY_INPUT: 'deepgram-api-key-input',
        MODEL_INFO: 'deepgram-model-info',
        MODEL_DESCRIPTION: 'model-description',
        MODEL_METRICS: 'model-metrics',
        SUPPORTED_LANGUAGES: 'supported-languages',
        FEATURES_CONTAINER: 'deepgram-features',
        ADVANCED_CONTAINER: 'deepgram-advanced',
        COST_ESTIMATION: 'deepgram-cost-estimation',
        COST_DETAILS: 'cost-details',
        WARNING: 'mod-warning',
        ERROR_DETAILS: 'error-details',
        SETTING_DESCRIPTION: 'setting-item-description'
    },
    
    // 텍스트 메시지
    MESSAGES: {
        HEADER: 'Deepgram Configuration',
        DESCRIPTION: 'Configure Deepgram for advanced speech recognition with multiple language support and AI features.',
        REGISTRY_WARNING: '⚠️ Model registry not available. Using default configuration.',
        API_KEY_LABEL: 'Deepgram API Key',
        API_KEY_DESC: 'Enter your Deepgram API key for transcription',
        API_KEY_PLACEHOLDER: 'Enter API key...',
        API_KEY_SAVED: 'Deepgram API key saved',
        API_KEY_REQUIRED: 'Please enter your Deepgram API key first',
        MODEL_LABEL: 'Deepgram Model',
        MODEL_DESC: 'Select the Deepgram model for transcription',
        MODEL_PLACEHOLDER: 'Select a model...',
        FEATURES_HEADER: 'Features',
        ADVANCED_HEADER: 'Advanced Settings',
        COST_HEADER: 'Cost Estimation',
        VALIDATION_LABEL: 'Validate Configuration',
        VALIDATION_DESC: 'Test your Deepgram API key and settings',
        VALIDATION_BUTTON: 'Validate',
        VALIDATING: 'Validating...',
        VALIDATION_SUCCESS: '✅ Deepgram configuration is valid',
        VALIDATION_ERROR: '❌ Invalid Deepgram API key or configuration',
        FALLBACK_ERROR_TITLE: '⚠️ Deepgram Settings Error',
        FALLBACK_ERROR_DESC: 'Unable to load full configuration. Basic settings are available below.',
        CRITICAL_ERROR: 'Deepgram settings could not be loaded. Please check the console for errors.'
    },
    
    // 스타일
    STYLES: {
        WARNING_BOX: 'deepgram-warning-box',
        INFO_CONTAINER: 'deepgram-info-container',
        METRICS_ROW: 'deepgram-metrics-row',
        LANGUAGES_ROW: 'deepgram-languages-row',
        COST_CONTAINER: 'deepgram-cost-container',
        ERROR_CONTAINER: 'deepgram-error-container',
        ERROR_DETAILS: 'deepgram-error-details',
        DESCRIPTION_MARGIN: 'deepgram-description'
    }
} as const;

// API 관련 상수
export const API_CONSTANTS = {
    ENDPOINTS: {
        VALIDATION: 'https://api.deepgram.com/v1/projects'
    },
    HEADERS: {
        AUTHORIZATION_PREFIX: 'Token',
        CONTENT_TYPE: 'application/json'
    },
    METHODS: {
        GET: 'GET',
        POST: 'POST'
    },
    MASK: {
        VISIBLE_START: 8,
        VISIBLE_END: 4,
        CHAR: '*'
    },
    TIMEOUT: {
        MIN: 5000,  // 5 seconds
        MAX: 120000  // 120 seconds
    }
} as const;

// 설정 관련 상수
export const CONFIG_CONSTANTS = {
    TIMEOUT: {
        MIN: 5000,
        MAX: 120000,
        DEFAULT: 30000
    },
    RETRIES: {
        MIN: 0,
        MAX: 3,
        DEFAULT: 3
    },
    COST_ESTIMATION: {
        DAILY_MINUTES: 10,
        DAYS_PER_MONTH: 30
    },
    VALIDATION_RESET_DELAY: 3000
} as const;

// 언어 옵션
export const LANGUAGE_OPTIONS = [
    { value: 'auto', label: 'Auto-detect' },
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' },
    { value: 'pt', label: 'Portuguese' },
    { value: 'nl', label: 'Dutch' },
    { value: 'it', label: 'Italian' },
    { value: 'pl', label: 'Polish' },
    { value: 'ru', label: 'Russian' },
    { value: 'zh', label: 'Chinese' },
    { value: 'ja', label: 'Japanese' },
    { value: 'ko', label: 'Korean' },
    { value: 'ar', label: 'Arabic' },
    { value: 'hi', label: 'Hindi' }
] as const;

// 기본 모델 정보 (폴백용)
export const DEFAULT_MODELS = [
    { id: 'nova-3', name: 'Nova 3', tier: 'Premium', price: 0.0043 },
    { id: 'nova-2', name: 'Nova 2', tier: 'Premium', price: 0.0059 },
    { id: 'nova', name: 'Nova', tier: 'Standard', price: 0.0025 },
    { id: 'enhanced', name: 'Enhanced', tier: 'Standard', price: 0.0145 },
    { id: 'base', name: 'Base', tier: 'Economy', price: 0.0125 }
] as const;

// 기본 기능 정보 (폴백용)
export const DEFAULT_FEATURES = [
    { 
        key: 'punctuation', 
        name: 'Punctuation', 
        description: 'Add punctuation to transcript', 
        default: true 
    },
    { 
        key: 'smartFormat', 
        name: 'Smart Format', 
        description: 'Format numbers, dates, etc.', 
        default: true 
    },
    { 
        key: 'diarization', 
        name: 'Speaker Diarization', 
        description: 'Identify different speakers', 
        default: true 
    },
    { 
        key: 'numerals', 
        name: 'Numerals', 
        description: 'Convert numbers to digits', 
        default: false 
    }
] as const;

// 타입 정의
export type LogLevel = typeof LOG_LEVEL[keyof typeof LOG_LEVEL];
export type LanguageOption = typeof LANGUAGE_OPTIONS[number];
export type DefaultModel = typeof DEFAULT_MODELS[number];
export type DefaultFeature = typeof DEFAULT_FEATURES[number];
