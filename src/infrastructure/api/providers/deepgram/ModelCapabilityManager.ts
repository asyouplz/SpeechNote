/**
 * Deepgram 모델 기능 매트릭스 자동 관리
 *
 * 핵심 기능:
 * - 모델별 지원 기능 매트릭스 관리
 * - 동적 기능 호환성 검증
 * - 모델 업그레이드 추천 시스템
 * - 기능별 최적 모델 선택
 */

import type { ILogger } from '../../../../types';
import { MODEL_CAPABILITIES_DATA } from './modelCapabilities';
import { MODEL_DEFAULTS, SCORING_WEIGHTS } from './constants';

// 모델 기능 타입 정의
export interface ModelFeature {
    name: string;
    description: string;
    category: 'basic' | 'premium' | 'enterprise';
    requiresApiVersion?: string;
    performanceImpact: 'none' | 'low' | 'medium' | 'high';
    qualityImprovement: number; // 0-100 scale
}

export interface ModelCapabilities {
    modelId: string;
    tier: 'economy' | 'basic' | 'standard' | 'premium' | 'enterprise';
    features: Record<string, boolean>;
    performance: {
        accuracy: number;
        speed: 'slow' | 'moderate' | 'fast' | 'very_fast';
        latency: 'high' | 'medium' | 'low' | 'very_low';
        memoryUsage: 'low' | 'medium' | 'high';
    };
    limits: {
        maxFileSize: number;
        maxDuration: number;
        concurrentRequests: number;
    };
    pricing: {
        perMinute: number;
        currency: string;
        freeMinutes?: number;
    };
    languages: string[];
    availability: {
        regions: string[];
        beta?: boolean;
        deprecated?: boolean;
        replacedBy?: string;
    };
}

export interface CompatibilityCheck {
    compatible: boolean;
    missingFeatures: string[];
    degradedFeatures: string[];
    recommendations: string[];
    alternativeModels: string[];
}

export interface ModelRecommendation {
    modelId: string;
    score: number;
    reasons: string[];
    tradeoffs: string[];
    costImpact: number; // percentage change
    qualityImpact: number; // percentage change
}

/**
 * 모델 기능 매트릭스 관리 클래스
 */
export class ModelCapabilityManager {
    private capabilities: Record<string, ModelCapabilities>;

    constructor(private logger: ILogger, customCapabilities?: Record<string, ModelCapabilities>) {
        this.capabilities = { ...MODEL_CAPABILITIES_DATA, ...customCapabilities };
        this.logger.debug(
            'ModelCapabilityManager initialized with models:',
            Object.keys(this.capabilities)
        );
    }

    /**
     * 모델의 기능을 확인합니다
     */
    getModelCapabilities(modelId: string): ModelCapabilities | null {
        return this.capabilities[modelId] || null;
    }

    /**
     * 모든 사용 가능한 모델 목록을 반환합니다
     */
    getAvailableModels(): string[] {
        return Object.keys(this.capabilities).filter(
            (modelId) => !this.capabilities[modelId].availability.deprecated
        );
    }

    /**
     * 특정 기능을 지원하는 모델들을 반환합니다
     */
    getModelsWithFeature(feature: string): string[] {
        return Object.keys(this.capabilities).filter(
            (modelId) =>
                this.capabilities[modelId].features[feature] === true &&
                !this.capabilities[modelId].availability.deprecated
        );
    }

    /**
     * 요구사항과 모델의 호환성을 확인합니다
     */
    checkCompatibility(modelId: string, requirements: string[]): CompatibilityCheck {
        const capabilities = this.capabilities[modelId];
        if (!capabilities) {
            return {
                compatible: false,
                missingFeatures: requirements,
                degradedFeatures: [],
                recommendations: ['Model not found. Please check model ID.'],
                alternativeModels: this.getAvailableModels(),
            };
        }

        const missingFeatures: string[] = [];
        const degradedFeatures: string[] = [];

        requirements.forEach((feature) => {
            if (!capabilities.features[feature]) {
                missingFeatures.push(feature);
            }
        });

        const compatible = missingFeatures.length === 0;
        const recommendations: string[] = [];

        if (!compatible) {
            recommendations.push(`Missing features: ${missingFeatures.join(', ')}`);

            // 대안 모델 제안
            const alternativeModels = this.findAlternativeModels(requirements);
            if (alternativeModels.length > 0) {
                recommendations.push(
                    `Consider upgrading to: ${alternativeModels.slice(0, 3).join(', ')}`
                );
            }
        }

        return {
            compatible,
            missingFeatures,
            degradedFeatures,
            recommendations,
            alternativeModels: this.findAlternativeModels(requirements),
        };
    }

    /**
     * 요구사항에 맞는 최적 모델을 추천합니다
     */
    recommendModel(
        requirements: string[],
        priorities: { cost?: number; quality?: number; speed?: number } = {}
    ): ModelRecommendation[] {
        const {
            cost = SCORING_WEIGHTS.MODEL_RECOMMENDATION.COST,
            quality = SCORING_WEIGHTS.MODEL_RECOMMENDATION.QUALITY,
            speed = SCORING_WEIGHTS.MODEL_RECOMMENDATION.SPEED,
        } = priorities;
        const recommendations: ModelRecommendation[] = [];

        for (const modelId of this.getAvailableModels()) {
            const capabilities = this.capabilities[modelId];
            const compatibility = this.checkCompatibility(modelId, requirements);

            if (compatibility.compatible) {
                const score = this.calculateModelScore(capabilities, { cost, quality, speed });

                recommendations.push({
                    modelId,
                    score,
                    reasons: this.generateRecommendationReasons(capabilities, requirements),
                    tradeoffs: this.generateTradeoffs(capabilities),
                    costImpact: this.calculateCostImpact(capabilities),
                    qualityImpact: this.calculateQualityImpact(capabilities),
                });
            }
        }

        return recommendations.sort((a, b) => b.score - a.score);
    }

    /**
     * 모델 업그레이드 경로를 제안합니다
     */
    suggestUpgradePath(
        currentModel: string,
        targetFeatures: string[]
    ): {
        path: string[];
        benefits: string[];
        costs: { costIncrease: number; qualityImprovement: number };
    } {
        const currentCapabilities = this.capabilities[currentModel];
        if (!currentCapabilities) {
            throw new Error(`Unknown model: ${currentModel}`);
        }

        const compatibility = this.checkCompatibility(currentModel, targetFeatures);
        if (compatibility.compatible) {
            return {
                path: [currentModel],
                benefits: ['Current model already supports all required features'],
                costs: { costIncrease: 0, qualityImprovement: 0 },
            };
        }

        // 최적 업그레이드 모델 찾기
        const recommendations = this.recommendModel(targetFeatures);
        if (recommendations.length === 0) {
            return {
                path: [],
                benefits: [],
                costs: { costIncrease: 0, qualityImprovement: 0 },
            };
        }

        const bestModel = recommendations[0];
        const targetCapabilities = this.capabilities[bestModel.modelId];

        return {
            path: [currentModel, bestModel.modelId],
            benefits: bestModel.reasons,
            costs: {
                costIncrease:
                    ((targetCapabilities.pricing.perMinute -
                        currentCapabilities.pricing.perMinute) /
                        currentCapabilities.pricing.perMinute) *
                    100,
                qualityImprovement:
                    targetCapabilities.performance.accuracy -
                    currentCapabilities.performance.accuracy,
            },
        };
    }

    /**
     * 언어별 최적 모델을 반환합니다
     */
    getBestModelForLanguage(language: string, features: string[] = []): string | null {
        const compatibleModels = this.getAvailableModels().filter((modelId) => {
            const capabilities = this.capabilities[modelId];
            const hasLanguage = capabilities.languages.includes(language);
            const hasFeatures = features.every((feature) => capabilities.features[feature]);
            return hasLanguage && hasFeatures;
        });

        if (compatibleModels.length === 0) return null;

        // 품질과 기능을 기준으로 최적 모델 선택
        return compatibleModels.reduce((best, current) => {
            const bestCap = this.capabilities[best];
            const currentCap = this.capabilities[current];

            if (currentCap.performance.accuracy > bestCap.performance.accuracy) {
                return current;
            }
            return best;
        });
    }

    /**
     * 대안 모델 찾기
     */
    private findAlternativeModels(requirements: string[]): string[] {
        return this.getAvailableModels().filter((modelId) => {
            const compatibility = this.checkCompatibility(modelId, requirements);
            return compatibility.compatible;
        });
    }

    /**
     * 모델 점수 계산
     */
    private calculateModelScore(
        capabilities: ModelCapabilities,
        priorities: { cost: number; quality: number; speed: number }
    ): number {
        // 정규화된 점수 계산 (0-100 스케일)
        const costScore = Math.max(0, 100 - capabilities.pricing.perMinute * 10000); // 비용이 낮을수록 높은 점수
        const qualityScore = capabilities.performance.accuracy;
        const speedScore = this.getSpeedScore(capabilities.performance.speed);

        return (
            costScore * priorities.cost +
            qualityScore * priorities.quality +
            speedScore * priorities.speed
        );
    }

    /**
     * 속도 점수 변환
     */
    private getSpeedScore(speed: string): number {
        return (
            SCORING_WEIGHTS.SPEED_SCORES[speed as keyof typeof SCORING_WEIGHTS.SPEED_SCORES] ||
            SCORING_WEIGHTS.SPEED_SCORES.MODERATE
        );
    }

    /**
     * 추천 이유 생성
     */
    private generateRecommendationReasons(
        capabilities: ModelCapabilities,
        requirements: string[]
    ): string[] {
        const reasons: string[] = [];

        reasons.push(`High accuracy: ${capabilities.performance.accuracy}%`);
        reasons.push(
            `Performance: ${capabilities.performance.speed} speed, ${capabilities.performance.latency} latency`
        );

        if (capabilities.tier === 'premium') {
            reasons.push('Premium model with advanced features');
        }

        const supportedFeatures = requirements.filter((req) => capabilities.features[req]);
        if (supportedFeatures.length > 0) {
            reasons.push(`Supports required features: ${supportedFeatures.join(', ')}`);
        }

        return reasons;
    }

    /**
     * 트레이드오프 생성
     */
    private generateTradeoffs(capabilities: ModelCapabilities): string[] {
        const tradeoffs: string[] = [];

        if (capabilities.pricing.perMinute > 0.01) {
            tradeoffs.push('Higher cost per minute');
        }

        if (capabilities.performance.memoryUsage === 'high') {
            tradeoffs.push('Higher memory usage');
        }

        if (capabilities.limits.concurrentRequests < 25) {
            tradeoffs.push('Limited concurrent requests');
        }

        return tradeoffs;
    }

    /**
     * 비용 영향 계산
     */
    private calculateCostImpact(capabilities: ModelCapabilities): number {
        const basePrice = MODEL_DEFAULTS.PRICING.BASE_MODEL_PRICE;
        return ((capabilities.pricing.perMinute - basePrice) / basePrice) * 100;
    }

    /**
     * 품질 영향 계산
     */
    private calculateQualityImpact(capabilities: ModelCapabilities): number {
        const baseAccuracy = MODEL_DEFAULTS.PRICING.BASE_MODEL_ACCURACY;
        return capabilities.performance.accuracy - baseAccuracy;
    }

    /**
     * 기능 매트릭스 업데이트
     */
    updateCapabilities(modelId: string, capabilities: ModelCapabilities): void {
        this.capabilities[modelId] = capabilities;
        this.logger.debug(`Updated capabilities for model: ${modelId}`);
    }

    /**
     * 통계 정보 생성
     */
    getStatistics(): {
        totalModels: number;
        modelsByTier: Record<string, number>;
        averageAccuracy: number;
        mostPopularFeatures: string[];
    } {
        const models = Object.values(this.capabilities);
        const tiers: Record<string, number> = {};
        let totalAccuracy = 0;
        const featureCounts: Record<string, number> = {};

        models.forEach((model) => {
            tiers[model.tier] = (tiers[model.tier] || 0) + 1;
            totalAccuracy += model.performance.accuracy;

            Object.entries(model.features).forEach(([feature, supported]) => {
                if (supported) {
                    featureCounts[feature] = (featureCounts[feature] || 0) + 1;
                }
            });
        });

        const mostPopularFeatures = Object.entries(featureCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([feature]) => feature);

        return {
            totalModels: models.length,
            modelsByTier: tiers,
            averageAccuracy: totalAccuracy / models.length,
            mostPopularFeatures,
        };
    }
}
