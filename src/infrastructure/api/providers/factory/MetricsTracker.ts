import type { ILogger } from '../../../../types';
import { TranscriptionProvider, ProviderMetrics } from '../ITranscriber';

/**
 * Provider metrics tracking with statistical analysis
 */
export class MetricsTracker {
    private metrics = new Map<TranscriptionProvider, ProviderMetrics>();
    private readonly providers: TranscriptionProvider[] = ['whisper', 'deepgram'];

    constructor(private readonly logger: ILogger) {
        this.initializeMetrics();
    }

    /**
     * Initialize metrics for all providers
     */
    private initializeMetrics(): void {
        this.providers.forEach(provider => {
            this.metrics.set(provider, this.createEmptyMetrics(provider));
        });
    }

    /**
     * Create empty metrics object
     */
    private createEmptyMetrics(provider: TranscriptionProvider): ProviderMetrics {
        return {
            provider,
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageLatency: 0,
            averageCost: 0
        };
    }

    /**
     * Record request metrics
     */
    recordRequest(
        provider: TranscriptionProvider,
        success: boolean,
        latency?: number,
        cost?: number,
        error?: Error
    ): void {
        const metric = this.getOrCreateMetric(provider);
        
        this.updateRequestCounts(metric, success);
        
        if (success) {
            this.updateSuccessMetrics(metric, latency, cost);
        } else {
            this.updateFailureMetrics(metric, error);
        }
        
        this.logger.debug(`Metrics updated for ${provider}`, this.formatMetrics(metric));
    }

    /**
     * Get or create metric for provider
     */
    private getOrCreateMetric(provider: TranscriptionProvider): ProviderMetrics {
        let metric = this.metrics.get(provider);
        if (!metric) {
            metric = this.createEmptyMetrics(provider);
            this.metrics.set(provider, metric);
        }
        return metric;
    }

    /**
     * Update request counts
     */
    private updateRequestCounts(metric: ProviderMetrics, success: boolean): void {
        metric.totalRequests++;
        if (success) {
            metric.successfulRequests++;
        } else {
            metric.failedRequests++;
        }
    }

    /**
     * Update success metrics
     */
    private updateSuccessMetrics(
        metric: ProviderMetrics,
        latency?: number,
        cost?: number
    ): void {
        if (latency !== undefined) {
            metric.averageLatency = this.calculateRunningAverage(
                metric.averageLatency,
                latency,
                metric.successfulRequests
            );
        }
        
        if (cost !== undefined) {
            metric.averageCost = this.calculateRunningAverage(
                metric.averageCost,
                cost,
                metric.successfulRequests
            );
        }
    }

    /**
     * Update failure metrics
     */
    private updateFailureMetrics(metric: ProviderMetrics, error?: Error): void {
        if (error) {
            metric.lastError = {
                message: error.message,
                timestamp: new Date()
            };
        }
    }

    /**
     * Calculate running average
     */
    private calculateRunningAverage(
        currentAvg: number,
        newValue: number,
        count: number
    ): number {
        if (count <= 1) return newValue;
        return (currentAvg * (count - 1) + newValue) / count;
    }

    /**
     * Get metrics for a specific provider
     */
    getMetrics(provider: TranscriptionProvider): ProviderMetrics | undefined {
        return this.metrics.get(provider);
    }

    /**
     * Get all provider metrics
     */
    getAllMetrics(): ProviderMetrics[] {
        return Array.from(this.metrics.values());
    }

    /**
     * Calculate success rate
     */
    getSuccessRate(provider: TranscriptionProvider): number {
        const metric = this.metrics.get(provider);
        if (!metric || metric.totalRequests === 0) return 0;
        
        return metric.successfulRequests / metric.totalRequests;
    }

    /**
     * Get performance statistics
     */
    getPerformanceStats(provider: TranscriptionProvider): {
        successRate: number;
        errorRate: number;
        averageLatency: number;
        averageCost: number;
        availability: number;
    } {
        const metric = this.metrics.get(provider);
        if (!metric) {
            return {
                successRate: 0,
                errorRate: 0,
                averageLatency: 0,
                averageCost: 0,
                availability: 0
            };
        }

        const successRate = this.getSuccessRate(provider);
        return {
            successRate,
            errorRate: 1 - successRate,
            averageLatency: metric.averageLatency,
            averageCost: metric.averageCost,
            availability: this.calculateAvailability(metric)
        };
    }

    /**
     * Calculate availability (success rate with time decay)
     */
    private calculateAvailability(metric: ProviderMetrics): number {
        if (metric.totalRequests === 0) return 1;
        
        // Simple availability: success rate
        const baseAvailability = this.getSuccessRate(metric.provider);
        
        // Apply time decay if there was a recent error
        if (metric.lastError) {
            const timeSinceError = Date.now() - metric.lastError.timestamp.getTime();
            const decayPeriod = 5 * 60 * 1000; // 5 minutes
            
            if (timeSinceError < decayPeriod) {
                const decayFactor = timeSinceError / decayPeriod;
                return baseAvailability * decayFactor;
            }
        }
        
        return baseAvailability;
    }

    /**
     * Reset metrics for a provider
     */
    resetMetrics(provider?: TranscriptionProvider): void {
        if (provider) {
            this.metrics.set(provider, this.createEmptyMetrics(provider));
            this.logger.info(`Metrics reset for ${provider}`);
        } else {
            this.initializeMetrics();
            this.logger.info('All metrics reset');
        }
    }

    /**
     * Format metrics for logging
     */
    private formatMetrics(metric: ProviderMetrics): any {
        return {
            provider: metric.provider,
            requests: {
                total: metric.totalRequests,
                successful: metric.successfulRequests,
                failed: metric.failedRequests
            },
            performance: {
                successRate: `${(this.getSuccessRate(metric.provider) * 100).toFixed(2)}%`,
                avgLatency: `${metric.averageLatency.toFixed(0)}ms`,
                avgCost: `$${metric.averageCost.toFixed(4)}`
            },
            lastError: metric.lastError
        };
    }

    /**
     * Export metrics as JSON
     */
    exportMetrics(): string {
        const metricsData = this.getAllMetrics().map(metric => ({
            ...metric,
            stats: this.getPerformanceStats(metric.provider)
        }));
        
        return JSON.stringify(metricsData, null, 2);
    }
}