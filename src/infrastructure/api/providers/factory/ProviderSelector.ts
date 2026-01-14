import type { ILogger } from '../../../../types';
import { ITranscriber, TranscriptionProvider, SelectionStrategy } from '../ITranscriber';
import { MetricsTracker } from './MetricsTracker';

/**
 * Provider selection strategies with intelligent routing
 */
export class ProviderSelector {
    private roundRobinIndex = 0;
    private readonly strategies: Map<SelectionStrategy, SelectionFunction>;

    constructor(private readonly logger: ILogger, private readonly metricsTracker: MetricsTracker) {
        this.strategies = this.initializeStrategies();
    }

    /**
     * Select provider based on strategy
     */
    select(
        providers: Map<TranscriptionProvider, ITranscriber>,
        strategy: SelectionStrategy,
        context?: SelectionContext
    ): ITranscriber {
        const availableProviders = this.getAvailableProviders(providers);

        if (availableProviders.length === 0) {
            throw new Error('No transcription providers available');
        }

        const strategyFunction = this.strategies.get(strategy) ?? this.defaultStrategy;
        return strategyFunction(availableProviders, context);
    }

    /**
     * Initialize selection strategies
     */
    private initializeStrategies(): Map<SelectionStrategy, SelectionFunction> {
        return new Map([
            [SelectionStrategy.COST_OPTIMIZED, this.selectByCost.bind(this)],
            [SelectionStrategy.PERFORMANCE_OPTIMIZED, this.selectByPerformance.bind(this)],
            [SelectionStrategy.QUALITY_OPTIMIZED, this.selectByQuality.bind(this)],
            [SelectionStrategy.ROUND_ROBIN, this.selectRoundRobin.bind(this)],
            [SelectionStrategy.AB_TEST, this.selectForABTest.bind(this)],
            [SelectionStrategy.MANUAL, this.defaultStrategy.bind(this)],
        ]);
    }

    /**
     * Get available providers
     */
    private getAvailableProviders(
        providers: Map<TranscriptionProvider, ITranscriber>
    ): Array<[TranscriptionProvider, ITranscriber]> {
        return Array.from(providers.entries()).filter(
            ([_, provider]) => provider.getConfig().enabled
        );
    }

    /**
     * Default selection strategy
     */
    private defaultStrategy(
        providers: Array<[TranscriptionProvider, ITranscriber]>,
        _context?: SelectionContext
    ): ITranscriber {
        return providers[0][1];
    }

    /**
     * Select by cost optimization
     */
    private selectByCost(
        providers: Array<[TranscriptionProvider, ITranscriber]>,
        _context?: SelectionContext
    ): ITranscriber {
        let bestProvider = providers[0];
        let lowestCost = Infinity;

        for (const [name, provider] of providers) {
            const metrics = this.metricsTracker.getMetrics(name);
            const cost = metrics?.averageCost ?? this.getDefaultCost(name);

            if (cost < lowestCost) {
                lowestCost = cost;
                bestProvider = [name, provider];
            }
        }

        this.logger.debug(
            `Cost-optimized selection: ${bestProvider[0]} (cost: $${lowestCost.toFixed(4)})`
        );
        return bestProvider[1];
    }

    /**
     * Select by performance optimization
     */
    private selectByPerformance(
        providers: Array<[TranscriptionProvider, ITranscriber]>,
        _context?: SelectionContext
    ): ITranscriber {
        let bestProvider = providers[0];
        let bestScore = -Infinity;

        for (const [name, provider] of providers) {
            const score = this.calculatePerformanceScore(name);

            if (score > bestScore) {
                bestScore = score;
                bestProvider = [name, provider];
            }
        }

        this.logger.debug(
            `Performance-optimized selection: ${bestProvider[0]} (score: ${bestScore.toFixed(2)})`
        );
        return bestProvider[1];
    }

    /**
     * Select by quality optimization
     */
    private selectByQuality(
        providers: Array<[TranscriptionProvider, ITranscriber]>,
        _context?: SelectionContext
    ): ITranscriber {
        let bestProvider = providers[0];
        let bestQuality = 0;

        for (const [name, provider] of providers) {
            const quality = this.calculateQualityScore(name);

            if (quality > bestQuality) {
                bestQuality = quality;
                bestProvider = [name, provider];
            }
        }

        this.logger.debug(
            `Quality-optimized selection: ${bestProvider[0]} (quality: ${(
                bestQuality * 100
            ).toFixed(2)}%)`
        );
        return bestProvider[1];
    }

    /**
     * Round-robin selection
     */
    private selectRoundRobin(
        providers: Array<[TranscriptionProvider, ITranscriber]>,
        _context?: SelectionContext
    ): ITranscriber {
        const provider = providers[this.roundRobinIndex % providers.length];
        this.roundRobinIndex++;

        this.logger.debug(
            `Round-robin selection: ${provider[0]} (index: ${this.roundRobinIndex - 1})`
        );
        return provider[1];
    }

    /**
     * A/B test selection
     */
    private selectForABTest(
        providers: Array<[TranscriptionProvider, ITranscriber]>,
        context?: SelectionContext
    ): ITranscriber {
        if (!context?.userId) {
            return this.selectRoundRobin(providers, context);
        }

        const hash = this.hashUserId(context.userId);
        const threshold = context.abTestSplit ?? 0.5;

        // Find specific providers
        const whisperProvider = providers.find(([name]) => name === 'whisper');
        const deepgramProvider = providers.find(([name]) => name === 'deepgram');

        let selected: [TranscriptionProvider, ITranscriber];

        if (hash < threshold && whisperProvider) {
            selected = whisperProvider;
        } else if (deepgramProvider) {
            selected = deepgramProvider;
        } else {
            selected = providers[0];
        }

        this.logger.debug(
            `A/B test selection: ${selected[0]} (user: ${context.userId}, hash: ${hash.toFixed(3)})`
        );
        return selected[1];
    }

    /**
     * Calculate performance score
     */
    private calculatePerformanceScore(provider: TranscriptionProvider): number {
        const stats = this.metricsTracker.getPerformanceStats(provider);

        // Weighted score based on multiple factors
        const weights = {
            latency: -0.4, // Lower is better
            successRate: 0.4,
            availability: 0.2,
        };

        // Normalize latency (assume 5000ms is worst case)
        const normalizedLatency = Math.min(stats.averageLatency / 5000, 1);

        return (
            weights.latency * normalizedLatency +
            weights.successRate * stats.successRate +
            weights.availability * stats.availability
        );
    }

    /**
     * Calculate quality score
     */
    private calculateQualityScore(provider: TranscriptionProvider): number {
        const stats = this.metricsTracker.getPerformanceStats(provider);

        // Quality is primarily based on success rate and availability
        return stats.successRate * 0.7 + stats.availability * 0.3;
    }

    /**
     * Get default cost for provider
     */
    private getDefaultCost(provider: TranscriptionProvider): number {
        const defaultCosts: Record<TranscriptionProvider, number> = {
            whisper: 0.006, // $0.006 per minute
            deepgram: 0.0043, // $0.0043 per minute
        };

        return defaultCosts[provider] ?? 0.01;
    }

    /**
     * Hash user ID for consistent A/B testing
     */
    private hashUserId(userId: string): number {
        let hash = 0;
        for (let i = 0; i < userId.length; i++) {
            hash = (hash << 5) - hash + userId.charCodeAt(i);
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash) / 2147483647; // Normalize to 0-1
    }

    /**
     * Get selection statistics
     */
    getStatistics(): {
        roundRobinIndex: number;
        strategiesAvailable: string[];
    } {
        return {
            roundRobinIndex: this.roundRobinIndex,
            strategiesAvailable: Array.from(this.strategies.keys()),
        };
    }

    /**
     * Reset selector state
     */
    reset(): void {
        this.roundRobinIndex = 0;
        this.logger.info('Provider selector reset');
    }
}

// Type definitions
type SelectionFunction = (
    providers: Array<[TranscriptionProvider, ITranscriber]>,
    context?: SelectionContext
) => ITranscriber;

interface SelectionContext {
    userId?: string;
    abTestSplit?: number;
    preferredProvider?: TranscriptionProvider;
    excludeProviders?: TranscriptionProvider[];
}
