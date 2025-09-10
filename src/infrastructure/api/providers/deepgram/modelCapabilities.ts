/**
 * Deepgram 모델 기능 매트릭스 데이터
 * ModelCapabilityManager에서 사용하는 모델 정보를 중앙화
 */

import type { ModelCapabilities } from './ModelCapabilityManager';

/**
 * 각 모델별 상세 기능 및 성능 정보
 */
export const MODEL_CAPABILITIES_DATA: Record<string, ModelCapabilities> = {
    'nova-3': {
        modelId: 'nova-3',
        tier: 'premium',
        features: {
            punctuation: true,
            smartFormat: true,
            diarization: true,
            numerals: true,
            profanityFilter: true,
            redaction: true,
            utterances: true,
            summarization: true,
            advancedDiarization: true,
            emotionDetection: true,
            speakerIdentification: true,
            realTime: true,
            streaming: true,
            languageDetection: true,
            customVocabulary: true,
            sentimentAnalysis: true,
            topicDetection: true
        },
        performance: {
            accuracy: 98,
            speed: 'very_fast',
            latency: 'very_low',
            memoryUsage: 'medium'
        },
        limits: {
            maxFileSize: 2 * 1024 * 1024 * 1024, // 2GB
            maxDuration: 12 * 60 * 60, // 12 hours
            concurrentRequests: 100
        },
        pricing: {
            perMinute: 0.0043,
            currency: 'USD'
        },
        languages: ['en', 'es', 'fr', 'de', 'pt', 'nl', 'it', 'pl', 'ru', 'zh', 'ja', 'ko', 'ar', 'hi', 'tr', 'sv', 'da', 'no', 'fi', 'cs', 'hu', 'bg'],
        availability: {
            regions: ['us', 'eu', 'asia'],
            beta: false,
            deprecated: false
        }
    },
    'nova-2': {
        modelId: 'nova-2',
        tier: 'premium',
        features: {
            punctuation: true,
            smartFormat: true,
            diarization: true,
            numerals: true,
            profanityFilter: true,
            redaction: true,
            utterances: true,
            summarization: true,
            realTime: true,
            streaming: true,
            languageDetection: true,
            customVocabulary: true,
            advancedDiarization: false,
            emotionDetection: false,
            speakerIdentification: false,
            sentimentAnalysis: false,
            topicDetection: false
        },
        performance: {
            accuracy: 95,
            speed: 'fast',
            latency: 'low',
            memoryUsage: 'medium'
        },
        limits: {
            maxFileSize: 2 * 1024 * 1024 * 1024,
            maxDuration: 12 * 60 * 60,
            concurrentRequests: 50
        },
        pricing: {
            perMinute: 0.0145,
            currency: 'USD'
        },
        languages: ['en', 'es', 'fr', 'de', 'pt', 'nl', 'it', 'pl', 'ru', 'zh', 'ja', 'ko', 'ar', 'hi', 'tr', 'sv', 'da', 'no', 'fi'],
        availability: {
            regions: ['us', 'eu', 'asia'],
            beta: false,
            deprecated: false
        }
    },
    'nova': {
        modelId: 'nova',
        tier: 'standard',
        features: {
            punctuation: true,
            smartFormat: true,
            diarization: true,
            numerals: true,
            profanityFilter: true,
            redaction: false,
            utterances: true,
            summarization: false,
            realTime: true,
            streaming: true,
            languageDetection: true,
            customVocabulary: false,
            advancedDiarization: false,
            emotionDetection: false,
            speakerIdentification: false,
            sentimentAnalysis: false,
            topicDetection: false
        },
        performance: {
            accuracy: 90,
            speed: 'fast',
            latency: 'low',
            memoryUsage: 'low'
        },
        limits: {
            maxFileSize: 1024 * 1024 * 1024, // 1GB
            maxDuration: 6 * 60 * 60, // 6 hours
            concurrentRequests: 25
        },
        pricing: {
            perMinute: 0.0125,
            currency: 'USD'
        },
        languages: ['en', 'es', 'fr', 'de', 'pt', 'nl', 'it', 'pl', 'ru', 'zh', 'ja', 'ko'],
        availability: {
            regions: ['us', 'eu'],
            beta: false,
            deprecated: false
        }
    },
    'enhanced': {
        modelId: 'enhanced',
        tier: 'basic',
        features: {
            punctuation: true,
            smartFormat: true,
            diarization: false,
            numerals: true,
            profanityFilter: true,
            redaction: false,
            utterances: false,
            summarization: false,
            realTime: false,
            streaming: false,
            languageDetection: false,
            customVocabulary: false,
            advancedDiarization: false,
            emotionDetection: false,
            speakerIdentification: false,
            sentimentAnalysis: false,
            topicDetection: false
        },
        performance: {
            accuracy: 85,
            speed: 'moderate',
            latency: 'medium',
            memoryUsage: 'low'
        },
        limits: {
            maxFileSize: 500 * 1024 * 1024, // 500MB
            maxDuration: 2 * 60 * 60, // 2 hours
            concurrentRequests: 10
        },
        pricing: {
            perMinute: 0.0085,
            currency: 'USD'
        },
        languages: ['en', 'es', 'fr', 'de', 'pt'],
        availability: {
            regions: ['us', 'eu'],
            beta: false,
            deprecated: false
        }
    },
    'base': {
        modelId: 'base',
        tier: 'economy',
        features: {
            punctuation: true,
            smartFormat: false,
            diarization: false,
            numerals: false,
            profanityFilter: false,
            redaction: false,
            utterances: false,
            summarization: false,
            realTime: false,
            streaming: false,
            languageDetection: false,
            customVocabulary: false,
            advancedDiarization: false,
            emotionDetection: false,
            speakerIdentification: false,
            sentimentAnalysis: false,
            topicDetection: false
        },
        performance: {
            accuracy: 80,
            speed: 'moderate',
            latency: 'medium',
            memoryUsage: 'low'
        },
        limits: {
            maxFileSize: 100 * 1024 * 1024, // 100MB
            maxDuration: 60 * 60, // 1 hour
            concurrentRequests: 5
        },
        pricing: {
            perMinute: 0.0059,
            currency: 'USD'
        },
        languages: ['en'],
        availability: {
            regions: ['us'],
            beta: false,
            deprecated: false
        }
    }
};

/**
 * 모델 기능별 분류
 */
export const FEATURE_CATEGORIES = {
    BASIC: ['punctuation', 'smartFormat', 'numerals'],
    PREMIUM: ['diarization', 'profanityFilter', 'redaction', 'utterances'],
    ENTERPRISE: ['summarization', 'advancedDiarization', 'emotionDetection', 'speakerIdentification'],
    REALTIME: ['realTime', 'streaming'],
    ADVANCED: ['languageDetection', 'customVocabulary', 'sentimentAnalysis', 'topicDetection']
} as const;

/**
 * 모델별 권장 사용 케이스
 */
export const MODEL_USE_CASES = {
    'nova-3': [
        'High-accuracy professional transcription',
        'Speaker identification needed',
        'Advanced analytics (sentiment, topics)',
        'Multi-language support required'
    ],
    'nova-2': [
        'Balanced accuracy and cost',
        'Speaker diarization',
        'Professional applications',
        'Real-time transcription'
    ],
    'nova': [
        'Standard accuracy requirements',
        'Cost-conscious applications',
        'Basic speaker diarization',
        'General purpose transcription'
    ],
    'enhanced': [
        'Budget-friendly option',
        'Simple transcription needs',
        'No speaker separation required',
        'Basic formatting'
    ],
    'base': [
        'Minimal cost requirements',
        'Simple text extraction',
        'English-only content',
        'No advanced features needed'
    ]
} as const;

/**
 * 모델 업그레이드 경로 매핑
 */
export const UPGRADE_PATHS = {
    'base': ['enhanced', 'nova'],
    'enhanced': ['nova', 'nova-2'],
    'nova': ['nova-2', 'nova-3'],
    'nova-2': ['nova-3']
} as const;