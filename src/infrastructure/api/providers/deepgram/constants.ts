/**
 * Deepgram 관련 상수 정의
 * 매직 넘버와 하드코딩된 값들을 중앙화하여 관리
 */

// === API 관련 상수 ===
export const DEEPGRAM_API = {
    ENDPOINT: 'https://api.deepgram.com/v1/listen',
    MAX_FILE_SIZE: 2 * 1024 * 1024 * 1024, // 2GB
    DEFAULT_TIMEOUT: 30000, // 30초
    MAX_TIMEOUT: 90 * 60 * 1000, // 90분 (대용량 파일 대비)
    REQUESTS_PER_MINUTE: 100,
    RECOMMENDED_MAX_SIZE: 50 * 1024 * 1024, // 50MB recommended limit for reliable processing
} as const;

// === 오디오 검증 임계값 ===
export const AUDIO_VALIDATION = {
    MIN_HEADER_SIZE: 44, // WAV 헤더 최소 크기
    SIZE_WARNING_THRESHOLD: 1024, // 1KB 미만 경고
    SIZE_WARNING_LARGE: 100 * 1024 * 1024, // 100MB 이상 경고
    SILENCE_THRESHOLD: 327, // 16bit 최대값의 1%
    SILENCE_PEAK_MULTIPLIER: 5,
    SAMPLE_SIZE: 8192, // 8KB 샘플링
} as const;

// === Rate Limiting 및 Circuit Breaker ===
export const RELIABILITY = {
    CIRCUIT_BREAKER: {
        FAILURE_THRESHOLD: 5,
        SUCCESS_THRESHOLD: 2,
        TIMEOUT: 60000, // 1분
    },
    RETRY: {
        MAX_RETRIES: 3,
        BASE_DELAY: 1000,
        MAX_DELAY: 10000,
        JITTER_MAX: 1000,
    },
    TIMEOUT: {
        SIZE_MB_THRESHOLD: 5,
        PROCESSING_TIME_PER_MB: 30 * 1000, // 30초 per MB
        BUFFER_MULTIPLIER: 1.5,
    },
} as const;

// === 화자 분리 기본값 ===
export const DIARIZATION_DEFAULTS = {
    CONSECUTIVE_THRESHOLD: 0.5, // 연속 발화 병합 임계값 (초)
    MIN_SEGMENT_LENGTH: 1, // 최소 세그먼트 길이 (단어 수)
    WORDS_PER_SEGMENT: 10, // 기본 세그먼트당 단어 수
    SPEAKER_LABELS: {
        PREFIX: 'Speaker',
        NUMBERING: 'numeric' as const,
    },
} as const;

// === 모델 관련 기본값 ===
export const MODEL_DEFAULTS = {
    DEFAULT_MODEL: 'nova-2',
    PRICING: {
        BASE_MODEL_PRICE: 0.0059, // base model 가격 기준
        BASE_MODEL_ACCURACY: 80, // base model 정확도 기준
    },
    MIGRATION: {
        MAX_COST_INCREASE: 20, // 기본 최대 비용 증가율 (%)
        ESTIMATED_TIME_PER_STEP: 2, // 마이그레이션 단계당 예상 시간 (분)
        BACKUP_RETENTION_HOURS: 24, // 백업 보관 시간 (시간)
    },
} as const;

// === 점수 계산 가중치 ===
export const SCORING_WEIGHTS = {
    MODEL_RECOMMENDATION: {
        COST: 0.3,
        QUALITY: 0.4,
        SPEED: 0.3,
    },
    MIGRATION_SCORE: {
        QUALITY_MULTIPLIER: 10,
        COST_MULTIPLIER: 20,
    },
    SPEED_SCORES: {
        SLOW: 25,
        MODERATE: 50,
        FAST: 75,
        VERY_FAST: 100,
    },
} as const;

// === 로깅 및 진단 ===
export const LOGGING = {
    PREVIEW_LENGTH: {
        TEXT: 200,
        TRANSCRIPT: 100,
        FIRST_BYTES: 8,
    },
    SAMPLE_SIZES: {
        WORDS: 5,
        CHANNELS_MAX: 3,
    },
} as const;

// === 오디오 포맷 매핑 ===
export const AUDIO_FORMATS = {
    SIGNATURES: {
        WAV: [0x52, 0x49, 0x46, 0x46],
        MP3: [0xff, 0xe0], // 부분 시그니처
        MP3_ID3: [0x49, 0x44, 0x33],
        FLAC: [0x66, 0x4c, 0x61, 0x43],
        OGG: [0x4f, 0x67, 0x67, 0x53],
        M4A_FTYP: [0x66, 0x74, 0x79, 0x70], // offset 4에서 시작
        WEBM: [0x1a, 0x45, 0xdf, 0xa3],
    },
    CONTENT_TYPES: {
        wav: 'audio/wav',
        mp3: 'audio/mpeg',
        flac: 'audio/flac',
        ogg: 'audio/ogg',
        m4a: 'audio/mp4',
        webm: 'audio/webm',
        opus: 'audio/opus',
    },
    DEFAULT_CONTENT_TYPE: 'audio/wav',
} as const;

// === 에러 메시지 템플릿 ===
export const ERROR_MESSAGES = {
    AUDIO_VALIDATION: {
        EMPTY: 'Audio data is empty',
        TOO_SMALL: 'Audio data too small to contain valid audio',
        TOO_LARGE: 'Audio file exceeds maximum size limit (2GB)',
        VERY_SMALL_WARNING: 'Audio file is very small, may not contain meaningful content',
        LARGE_WARNING: 'Large audio file may take longer to process',
    },
    API: {
        INVALID_RESPONSE: 'Invalid response from Deepgram API',
        NO_ALTERNATIVES: 'No transcription alternatives found',
        EMPTY_TRANSCRIPT: 'Transcription service returned empty text',
        SERVER_TIMEOUT:
            "Server timeout processing large audio file. This often happens with very large files (>50MB). Try: 1) Breaking the file into smaller chunks, 2) Reducing audio quality/bitrate, or 3) Using a different model like 'enhanced' which may be faster.",
        CANCELLED: 'Transcription cancelled',
        MAX_RETRIES: 'operation failed after {retries} attempts',
    },
    MIGRATION: {
        MODEL_NOT_FOUND: 'Model not found. Please check model ID.',
        USER_APPROVAL_REQUIRED: 'User approval required but not granted',
        INVALID_BACKUP: 'Invalid backup data',
        ROLLBACK_FAILED: 'Rollback failed',
    },
} as const;

// === 진단 및 추천 메시지 ===
export const DIAGNOSTIC_MESSAGES = {
    EMPTY_TRANSCRIPT_CAUSES: [
        'Check audio quality and volume',
        'Verify audio contains actual speech',
        'Consider adjusting language settings',
        'Try different Deepgram model',
        'Check for audio format compatibility issues',
    ],
    SILENCE_INDICATORS: [
        'Zero confidence - possibly no speech detected',
        'No word timestamps - indicates no speech recognition',
        'Very short audio duration',
        'No language detected',
    ],
} as const;

// === 타입 가드용 상수 ===
export const TYPE_CHECKS = {
    MIN_AUDIO_SIZE: 12, // 포맷 감지를 위한 최소 크기
    WAV_DATA_START: 44, // WAV 데이터 시작 오프셋
} as const;
