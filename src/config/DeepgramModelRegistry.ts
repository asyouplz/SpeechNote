// Default fallback configuration
const DEFAULT_CONFIG = {
    models: {
        'nova-3': {
            id: 'nova-3',
            name: 'Nova 3',
            description: 'Latest premium model with higher accuracy and improved diarization',
            tier: 'premium' as const,
            features: {
                punctuation: true,
                smartFormat: true,
                diarization: true,
                numerals: true,
                profanityFilter: true,
                redaction: true,
                utterances: true,
                summarization: true,
            },
            languages: [
                'en',
                'es',
                'fr',
                'de',
                'pt',
                'nl',
                'it',
                'pl',
                'ru',
                'zh',
                'ja',
                'ko',
                'ar',
                'hi',
            ],
            performance: {
                accuracy: 98,
                speed: 'fast' as const,
                latency: 'low' as const,
            },
            pricing: {
                perMinute: 0.0043,
                currency: 'USD',
            },
        },
        'nova-2': {
            id: 'nova-2',
            name: 'Nova 2',
            description: 'Most accurate and powerful model with advanced features',
            tier: 'premium' as const,
            features: {
                punctuation: true,
                smartFormat: true,
                diarization: true,
                numerals: true,
                profanityFilter: true,
                redaction: true,
                utterances: true,
                summarization: true,
            },
            languages: [
                'en',
                'es',
                'fr',
                'de',
                'pt',
                'nl',
                'it',
                'pl',
                'ru',
                'zh',
                'ja',
                'ko',
                'ar',
                'hi',
            ],
            performance: {
                accuracy: 95,
                speed: 'fast' as const,
                latency: 'low' as const,
            },
            pricing: {
                perMinute: 0.0043,
                currency: 'USD',
            },
        },
        nova: {
            id: 'nova',
            name: 'Nova',
            description: 'Balanced model with good accuracy and speed',
            tier: 'standard' as const,
            features: {
                punctuation: true,
                smartFormat: true,
                diarization: true,
                numerals: true,
                profanityFilter: true,
                redaction: false,
                utterances: true,
                summarization: false,
            },
            languages: ['en', 'es', 'fr', 'de', 'pt', 'nl', 'it'],
            performance: {
                accuracy: 90,
                speed: 'fast' as const,
                latency: 'low' as const,
            },
            pricing: {
                perMinute: 0.0025,
                currency: 'USD',
            },
        },
        enhanced: {
            id: 'enhanced',
            name: 'Enhanced',
            description: 'Enhanced accuracy for challenging audio',
            tier: 'standard' as const,
            features: {
                punctuation: true,
                smartFormat: true,
                diarization: false,
                numerals: true,
                profanityFilter: false,
                redaction: false,
                utterances: false,
                summarization: false,
            },
            languages: ['en'],
            performance: {
                accuracy: 85,
                speed: 'moderate' as const,
                latency: 'medium' as const,
            },
            pricing: {
                perMinute: 0.0145,
                currency: 'USD',
            },
        },
        base: {
            id: 'base',
            name: 'Base',
            description: 'Cost-effective option for simple transcription',
            tier: 'economy' as const,
            features: {
                punctuation: true,
                smartFormat: false,
                diarization: false,
                numerals: false,
                profanityFilter: false,
                redaction: false,
                utterances: false,
                summarization: false,
            },
            languages: ['en'],
            performance: {
                accuracy: 80,
                speed: 'moderate' as const,
                latency: 'medium' as const,
            },
            pricing: {
                perMinute: 0.0125,
                currency: 'USD',
            },
        },
    },
    features: {
        punctuation: {
            name: 'Punctuation',
            description: 'Add punctuation marks to transcript',
            default: true,
            requiresPremium: false,
        },
        smartFormat: {
            name: 'Smart format',
            description: 'Format numbers, dates, and other entities',
            default: true,
            requiresPremium: false,
        },
        diarization: {
            name: 'Speaker diarization',
            description: 'Identify different speakers',
            default: false,
            requiresPremium: false,
        },
        numerals: {
            name: 'Numerals',
            description: 'Convert numbers to digits',
            default: false,
            requiresPremium: false,
        },
        profanityFilter: {
            name: 'Profanity filter',
            description: 'Filter out profanity from transcript',
            default: false,
            requiresPremium: false,
        },
        redaction: {
            name: 'Redaction',
            description: 'Redact sensitive information',
            default: false,
            requiresPremium: true,
        },
        utterances: {
            name: 'Utterances',
            description: 'Split transcript into utterances',
            default: false,
            requiresPremium: false,
        },
        summarization: {
            name: 'Summarization',
            description: 'Generate summary of transcript',
            default: false,
            requiresPremium: true,
        },
    },
};

import { DeepgramLogger } from '../ui/settings/helpers/DeepgramLogger';
import deepgramModelsConfigJson from '../../config/deepgram-models.json';

// Safe import with fallback
const deepgramModelsConfig: typeof DEFAULT_CONFIG =
    (deepgramModelsConfigJson as unknown as typeof DEFAULT_CONFIG) ?? DEFAULT_CONFIG;

/**
 * Deepgram 모델 정보 인터페이스
 */
export interface DeepgramModel {
    id: string;
    name: string;
    description: string;
    tier: 'premium' | 'standard' | 'basic' | 'economy';
    features: {
        punctuation: boolean;
        smartFormat: boolean;
        diarization: boolean;
        numerals: boolean;
        profanityFilter: boolean;
        redaction: boolean;
        utterances: boolean;
        summarization: boolean;
    };
    languages: string[];
    performance: {
        accuracy: number;
        speed: string;
        latency: string;
    };
    pricing: {
        perMinute: number;
        currency: string;
    };
}

/**
 * Deepgram 기능 정보 인터페이스
 */
export interface DeepgramFeature {
    name: string;
    description: string;
    default: boolean;
    requiresPremium?: boolean;
}

/**
 * Deepgram 모델 및 기능 레지스트리
 * - 모델 정보 관리
 * - 기능 정보 관리
 * - 검증 및 필터링
 */
export class DeepgramModelRegistry {
    private static instance: DeepgramModelRegistry;
    private models: Map<string, DeepgramModel>;
    private features: Map<string, DeepgramFeature>;
    private logger: DeepgramLogger;

    private constructor() {
        this.models = new Map();
        this.features = new Map();
        this.logger = DeepgramLogger.getInstance();

        try {
            this.loadConfiguration();
            this.logger.info('Constructor completed successfully');
        } catch (error) {
            this.logger.error('Error during initialization', error);
            // Continue with empty maps - better than crashing
        }
    }

    /**
     * 싱글톤 인스턴스 반환
     */
    public static getInstance(): DeepgramModelRegistry {
        try {
            if (!DeepgramModelRegistry.instance) {
                DeepgramModelRegistry.instance = new DeepgramModelRegistry();
            }
            return DeepgramModelRegistry.instance;
        } catch (error) {
            // Return a minimal instance rather than throw
            if (!DeepgramModelRegistry.instance) {
                const fallbackInstance = Object.create(
                    DeepgramModelRegistry.prototype
                ) as DeepgramModelRegistry;
                fallbackInstance.models = new Map<string, DeepgramModel>();
                fallbackInstance.features = new Map<string, DeepgramFeature>();
                fallbackInstance.logger = DeepgramLogger.getInstance();
                const errorObj = error instanceof Error ? error : new Error(String(error));
                fallbackInstance.logger.error(
                    'Failed to create instance, using fallback',
                    errorObj
                );
                DeepgramModelRegistry.instance = fallbackInstance;
            }
            return DeepgramModelRegistry.instance;
        }
    }

    /**
     * 설정 파일에서 모델 및 기능 정보 로드
     */
    private loadConfiguration(): void {
        try {
            const config = deepgramModelsConfig || DEFAULT_CONFIG;

            this.loadModels(config);
            this.loadFeatures(config);

            if (this.models.size === 0 && this.features.size === 0) {
                this.logger.warn('No data loaded, loading fallback configuration');
                this.loadFallbackConfiguration();
            }
        } catch (error) {
            this.logger.error('Error loading configuration', error);
            this.loadFallbackConfiguration();
        }
    }

    /**
     * 모델 로드
     */
    private loadModels(config: typeof DEFAULT_CONFIG): void {
        if (!config.models || typeof config.models !== 'object') {
            this.logger.warn('No models in configuration');
            return;
        }

        Object.entries(config.models).forEach(([key, model]) => {
            try {
                if (this.isValidModel(model)) {
                    this.models.set(key, model as DeepgramModel);
                } else {
                    this.logger.warn(`Invalid model structure for ${key}`);
                }
            } catch (err) {
                this.logger.error(`Failed to load model ${key}`, err);
            }
        });

        this.logger.info(`Loaded ${this.models.size} models`);
    }

    /**
     * 기능 로드
     */
    private loadFeatures(config: typeof DEFAULT_CONFIG): void {
        if (!config.features || typeof config.features !== 'object') {
            this.logger.warn('No features in configuration');
            return;
        }

        Object.entries(config.features).forEach(([key, feature]) => {
            try {
                if (this.isValidFeature(feature)) {
                    this.features.set(key, feature as DeepgramFeature);
                } else {
                    this.logger.warn(`Invalid feature structure for ${key}`);
                }
            } catch (err) {
                this.logger.error(`Failed to load feature ${key}`, err);
            }
        });

        this.logger.info(`Loaded ${this.features.size} features`);
    }

    /**
     * 폴백 설정 로드
     */
    private loadFallbackConfiguration(): void {
        try {
            Object.entries(DEFAULT_CONFIG.models).forEach(([key, model]) => {
                this.models.set(key, model as DeepgramModel);
            });
            Object.entries(DEFAULT_CONFIG.features).forEach(([key, feature]) => {
                this.features.set(key, feature as DeepgramFeature);
            });
            this.logger.info('Fallback configuration loaded');
        } catch (error) {
            this.logger.error('Failed to load fallback configuration', error);
        }
    }

    /**
     * Validate model structure
     */
    private isValidModel(model: unknown): model is DeepgramModel {
        if (!model || typeof model !== 'object') {
            return false;
        }
        const typed = model as Partial<DeepgramModel>;
        return (
            typeof typed.id === 'string' &&
            typeof typed.name === 'string' &&
            typed.features !== undefined &&
            Array.isArray(typed.languages) &&
            typeof typed.performance === 'object' &&
            typeof typed.pricing === 'object'
        );
    }

    /**
     * Validate feature structure
     */
    private isValidFeature(feature: unknown): feature is DeepgramFeature {
        if (!feature || typeof feature !== 'object') {
            return false;
        }
        const typed = feature as Partial<DeepgramFeature>;
        return (
            typeof typed.name === 'string' &&
            typeof typed.description === 'string' &&
            typeof typed.default === 'boolean'
        );
    }

    /**
     * 모든 모델 반환
     */
    public getAllModels(): DeepgramModel[] {
        try {
            return Array.from(this.models.values());
        } catch (error) {
            this.logger.error('Error getting all models', error);
            return [];
        }
    }

    /**
     * 특정 모델 반환
     */
    public getModel(modelId: string): DeepgramModel | undefined {
        return this.models.get(modelId);
    }

    /**
     * 모든 기능 반환
     */
    public getAllFeatures(): Map<string, DeepgramFeature> {
        try {
            return this.features;
        } catch (error) {
            this.logger.error('Error getting all features', error);
            return new Map();
        }
    }

    /**
     * 특정 기능 반환
     */
    public getFeature(featureKey: string): DeepgramFeature | undefined {
        return this.features.get(featureKey);
    }

    /**
     * 모델이 특정 언어를 지원하는지 확인
     */
    public isLanguageSupported(modelId: string, language: string): boolean {
        const model = this.models.get(modelId);
        if (!model) return false;
        return model.languages.includes(language);
    }

    /**
     * 모델이 특정 기능을 지원하는지 확인
     */
    public isFeatureSupported(modelId: string, featureKey: string): boolean {
        const model = this.models.get(modelId);
        if (!model) return false;
        return model.features[featureKey as keyof typeof model.features] === true;
    }

    /**
     * 언어별 지원 모델 필터링
     */
    public getModelsByLanguage(language: string): DeepgramModel[] {
        return Array.from(this.models.values()).filter((model) =>
            model.languages.includes(language)
        );
    }

    /**
     * 티어별 모델 필터링
     */
    public getModelsByTier(tier: 'premium' | 'standard' | 'basic' | 'economy'): DeepgramModel[] {
        return Array.from(this.models.values()).filter((model) => model.tier === tier);
    }

    /**
     * 가격대별 모델 필터링
     */
    public getModelsByPriceRange(maxPricePerMinute: number): DeepgramModel[] {
        return Array.from(this.models.values()).filter(
            (model) => model.pricing.perMinute <= maxPricePerMinute
        );
    }

    /**
     * 모델 비용 계산 (분 단위)
     */
    public calculateCost(modelId: string, durationInMinutes: number): number {
        const model = this.models.get(modelId);
        if (!model) return 0;
        return model.pricing.perMinute * durationInMinutes;
    }

    /**
     * 모델 성능 점수 계산 (0-100)
     */
    public getPerformanceScore(modelId: string): number {
        const model = this.models.get(modelId);
        if (!model) return 0;

        let score = model.performance.accuracy;

        // Speed bonus
        if (model.performance.speed === 'fast') score += 5;
        else if (model.performance.speed === 'moderate') score += 2;

        // Latency penalty
        if (model.performance.latency === 'high') score -= 5;
        else if (model.performance.latency === 'medium') score -= 2;

        return Math.min(100, Math.max(0, score));
    }

    /**
     * 추천 모델 반환 (요구사항 기반)
     */
    public getRecommendedModel(requirements: {
        language?: string;
        maxPrice?: number;
        minAccuracy?: number;
        requiredFeatures?: string[];
    }): DeepgramModel | null {
        let candidates = Array.from(this.models.values());
        const { language, maxPrice, minAccuracy, requiredFeatures } = requirements;

        // 언어 필터링
        if (language) {
            candidates = candidates.filter((model) => model.languages.includes(language));
        }

        // 가격 필터링
        if (maxPrice !== undefined) {
            candidates = candidates.filter((model) => model.pricing.perMinute <= maxPrice);
        }

        // 정확도 필터링
        if (minAccuracy !== undefined) {
            candidates = candidates.filter((model) => model.performance.accuracy >= minAccuracy);
        }

        // 필수 기능 필터링
        if (requiredFeatures && requiredFeatures.length > 0) {
            candidates = candidates.filter((model) =>
                requiredFeatures.every(
                    (feature) => model.features[feature as keyof typeof model.features] === true
                )
            );
        }

        // 성능 점수로 정렬하여 최적 모델 반환
        if (candidates.length > 0) {
            candidates.sort(
                (a, b) => this.getPerformanceScore(b.id) - this.getPerformanceScore(a.id)
            );
            return candidates[0];
        }

        return null;
    }

    /**
     * 모델 검증
     */
    public validateModel(modelId: string): { valid: boolean; errors: string[] } {
        const errors: string[] = [];
        const model = this.models.get(modelId);

        if (!model) {
            errors.push(`Model '${modelId}' not found`);
            return { valid: false, errors };
        }

        // 기본 검증
        if (!model.id) errors.push('Model ID is missing');
        if (!model.name) errors.push('Model name is missing');
        if (!model.tier) errors.push('Model tier is missing');
        if (!model.languages || model.languages.length === 0) {
            errors.push('Model must support at least one language');
        }
        if (model.pricing.perMinute < 0) {
            errors.push('Model pricing cannot be negative');
        }
        if (model.performance.accuracy < 0 || model.performance.accuracy > 100) {
            errors.push('Model accuracy must be between 0 and 100');
        }

        return {
            valid: errors.length === 0,
            errors,
        };
    }
}
