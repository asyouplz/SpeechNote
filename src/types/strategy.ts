/**
 * 전략 패턴 타입 정의
 *
 * Provider 선택 전략과 관련된 타입 시스템
 */

import { TranscriptionProvider } from '../infrastructure/api/providers/ITranscriber';

/**
 * Provider 선택 전략 타입
 * enum 대신 const assertion과 union type 사용
 */
export const SelectionStrategyValues = {
    MANUAL: 'manual',
    COST_OPTIMIZED: 'cost_optimized',
    PERFORMANCE_OPTIMIZED: 'performance_optimized',
    QUALITY_OPTIMIZED: 'quality_optimized',
    ROUND_ROBIN: 'round_robin',
    AB_TEST: 'ab_test',
} as const;

export type SelectionStrategy =
    (typeof SelectionStrategyValues)[keyof typeof SelectionStrategyValues];

const selectionStrategyValues = new Set<string>(Object.values(SelectionStrategyValues));

/**
 * 전략 설정 타입
 */
export interface StrategyConfig {
    strategy: SelectionStrategy;
    weights?: StrategyWeights;
    constraints?: StrategyConstraints;
    metadata?: Record<string, unknown>;
}

/**
 * 전략 가중치
 */
export interface StrategyWeights {
    latency: number; // 0-1
    cost: number; // 0-1
    quality: number; // 0-1
    reliability: number; // 0-1
}

/**
 * 전략 제약 조건
 */
export interface StrategyConstraints {
    maxLatency?: number; // ms
    maxCost?: number; // per request
    minQuality?: number; // 0-100
    minReliability?: number; // 0-100
    requiredFeatures?: string[];
}

/**
 * 전략 평가 결과
 */
export interface StrategyEvaluation {
    provider: TranscriptionProvider;
    score: number;
    metrics: {
        latency: number;
        cost: number;
        quality: number;
        reliability: number;
    };
    reasoning: string[];
}

/**
 * 전략 선택기 인터페이스
 */
export interface IStrategySelector {
    select(
        config: StrategyConfig,
        providers: TranscriptionProvider[]
    ): Promise<TranscriptionProvider>;

    evaluate(provider: TranscriptionProvider, config: StrategyConfig): Promise<StrategyEvaluation>;

    updateMetrics(
        provider: TranscriptionProvider,
        metrics: Partial<StrategyEvaluation['metrics']>
    ): void;
}

/**
 * 전략 팩토리
 */
export class StrategyFactory {
    private strategies = new Map<SelectionStrategy, IStrategySelector>();

    register(strategy: SelectionStrategy, selector: IStrategySelector): void {
        this.strategies.set(strategy, selector);
    }

    get(strategy: SelectionStrategy): IStrategySelector | undefined {
        return this.strategies.get(strategy);
    }

    create(config: StrategyConfig): IStrategySelector {
        const selector = this.strategies.get(config.strategy);
        if (!selector) {
            throw new Error(`Unknown strategy: ${config.strategy}`);
        }
        return selector;
    }
}

/**
 * 기본 전략 구현 베이스 클래스
 */
export abstract class BaseStrategySelector implements IStrategySelector {
    protected metricsCache = new Map<TranscriptionProvider, StrategyEvaluation['metrics']>();

    abstract select(
        config: StrategyConfig,
        providers: TranscriptionProvider[]
    ): Promise<TranscriptionProvider>;

    evaluate(provider: TranscriptionProvider, config: StrategyConfig): Promise<StrategyEvaluation> {
        const metrics = this.metricsCache.get(provider) || {
            latency: 100,
            cost: 0.01,
            quality: 85,
            reliability: 95,
        };

        const score = this.calculateScore(metrics, config.weights);

        return Promise.resolve({
            provider,
            score,
            metrics,
            reasoning: this.generateReasoning(metrics, config),
        });
    }

    updateMetrics(
        provider: TranscriptionProvider,
        metrics: Partial<StrategyEvaluation['metrics']>
    ): void {
        const current = this.metricsCache.get(provider) || {
            latency: 100,
            cost: 0.01,
            quality: 85,
            reliability: 95,
        };

        this.metricsCache.set(provider, { ...current, ...metrics });
    }

    protected calculateScore(
        metrics: StrategyEvaluation['metrics'],
        weights?: StrategyWeights
    ): number {
        const w = weights || {
            latency: 0.25,
            cost: 0.25,
            quality: 0.25,
            reliability: 0.25,
        };

        // Normalize and weight
        const normalizedLatency = Math.max(0, 1 - metrics.latency / 1000);
        const normalizedCost = Math.max(0, 1 - metrics.cost);
        const normalizedQuality = metrics.quality / 100;
        const normalizedReliability = metrics.reliability / 100;

        return (
            normalizedLatency * w.latency +
            normalizedCost * w.cost +
            normalizedQuality * w.quality +
            normalizedReliability * w.reliability
        );
    }

    protected generateReasoning(
        metrics: StrategyEvaluation['metrics'],
        config: StrategyConfig
    ): string[] {
        const reasons: string[] = [];

        if (config.constraints?.maxLatency && metrics.latency > config.constraints.maxLatency) {
            reasons.push(
                `Latency ${metrics.latency}ms exceeds limit ${config.constraints.maxLatency}ms`
            );
        }

        if (config.constraints?.maxCost && metrics.cost > config.constraints.maxCost) {
            reasons.push(`Cost $${metrics.cost} exceeds limit $${config.constraints.maxCost}`);
        }

        if (config.constraints?.minQuality && metrics.quality < config.constraints.minQuality) {
            reasons.push(
                `Quality ${metrics.quality}% below minimum ${config.constraints.minQuality}%`
            );
        }

        return reasons;
    }
}

/**
 * 타입 가드 함수
 */
export function isValidSelectionStrategy(value: unknown): value is SelectionStrategy {
    return typeof value === 'string' && selectionStrategyValues.has(value);
}

/**
 * 기본값 제공 헬퍼
 */
export function getSelectionStrategy(
    value: unknown,
    defaultStrategy: SelectionStrategy = SelectionStrategyValues.PERFORMANCE_OPTIMIZED
): SelectionStrategy {
    return isValidSelectionStrategy(value) ? value : defaultStrategy;
}
