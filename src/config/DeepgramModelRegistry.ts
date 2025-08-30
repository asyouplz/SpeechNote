import deepgramModelsConfig from '../../config/deepgram-models.json';

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

    private constructor() {
        this.models = new Map();
        this.features = new Map();
        this.loadConfiguration();
    }

    /**
     * 싱글톤 인스턴스 반환
     */
    public static getInstance(): DeepgramModelRegistry {
        if (!DeepgramModelRegistry.instance) {
            DeepgramModelRegistry.instance = new DeepgramModelRegistry();
        }
        return DeepgramModelRegistry.instance;
    }

    /**
     * 설정 파일에서 모델 및 기능 정보 로드
     */
    private loadConfiguration(): void {
        // 모델 로드
        Object.entries(deepgramModelsConfig.models).forEach(([key, model]) => {
            this.models.set(key, model as DeepgramModel);
        });

        // 기능 로드
        Object.entries(deepgramModelsConfig.features).forEach(([key, feature]) => {
            this.features.set(key, feature as DeepgramFeature);
        });
    }

    /**
     * 모든 모델 반환
     */
    public getAllModels(): DeepgramModel[] {
        return Array.from(this.models.values());
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
        return this.features;
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
        return Array.from(this.models.values()).filter(model => 
            model.languages.includes(language)
        );
    }

    /**
     * 티어별 모델 필터링
     */
    public getModelsByTier(tier: 'premium' | 'standard' | 'basic' | 'economy'): DeepgramModel[] {
        return Array.from(this.models.values()).filter(model => 
            model.tier === tier
        );
    }

    /**
     * 가격대별 모델 필터링
     */
    public getModelsByPriceRange(maxPricePerMinute: number): DeepgramModel[] {
        return Array.from(this.models.values()).filter(model => 
            model.pricing.perMinute <= maxPricePerMinute
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

        // 언어 필터링
        if (requirements.language) {
            candidates = candidates.filter(model => 
                model.languages.includes(requirements.language!)
            );
        }

        // 가격 필터링
        if (requirements.maxPrice !== undefined) {
            candidates = candidates.filter(model => 
                model.pricing.perMinute <= requirements.maxPrice!
            );
        }

        // 정확도 필터링
        if (requirements.minAccuracy !== undefined) {
            candidates = candidates.filter(model => 
                model.performance.accuracy >= requirements.minAccuracy!
            );
        }

        // 필수 기능 필터링
        if (requirements.requiredFeatures && requirements.requiredFeatures.length > 0) {
            candidates = candidates.filter(model => 
                requirements.requiredFeatures!.every(feature => 
                    model.features[feature as keyof typeof model.features] === true
                )
            );
        }

        // 성능 점수로 정렬하여 최적 모델 반환
        if (candidates.length > 0) {
            candidates.sort((a, b) => 
                this.getPerformanceScore(b.id) - this.getPerformanceScore(a.id)
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
            errors
        };
    }
}