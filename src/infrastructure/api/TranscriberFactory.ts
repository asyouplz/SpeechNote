import type { ILogger, ISettingsManager } from '../../types';
import {
    ITranscriber,
    TranscriptionProvider,
    TranscriptionProviderConfig,
    SelectionStrategy,
    ProviderMetrics,
    ProviderUnavailableError,
    ABTestConfig
} from './providers/ITranscriber';
import { WhisperService } from './WhisperService';
import { WhisperAdapter } from './providers/whisper/WhisperAdapter';
import { DeepgramService } from './providers/deepgram/DeepgramService';
import { DeepgramAdapter } from './providers/deepgram/DeepgramAdapter';

/**
 * Provider 메트릭 추적
 */
class MetricsTracker {
    private metrics = new Map<TranscriptionProvider, ProviderMetrics>();
    
    constructor(private logger: ILogger) {
        this.initializeMetrics();
    }
    
    private initializeMetrics(): void {
        const providers: TranscriptionProvider[] = ['whisper', 'deepgram'];
        
        providers.forEach(provider => {
            this.metrics.set(provider, {
                provider,
                totalRequests: 0,
                successfulRequests: 0,
                failedRequests: 0,
                averageLatency: 0,
                averageCost: 0
            });
        });
    }
    
    recordRequest(
        provider: TranscriptionProvider,
        success: boolean,
        latency?: number,
        cost?: number,
        error?: Error
    ): void {
        const metric = this.metrics.get(provider);
        if (!metric) return;
        
        metric.totalRequests++;
        
        if (success) {
            metric.successfulRequests++;
            
            // 평균 지연 시간 계산 (누적 평균)
            if (latency !== undefined) {
                metric.averageLatency = 
                    (metric.averageLatency * (metric.successfulRequests - 1) + latency) / 
                    metric.successfulRequests;
            }
            
            // 평균 비용 계산
            if (cost !== undefined) {
                metric.averageCost = 
                    (metric.averageCost * (metric.successfulRequests - 1) + cost) / 
                    metric.successfulRequests;
            }
        } else {
            metric.failedRequests++;
            
            if (error) {
                metric.lastError = {
                    message: error.message,
                    timestamp: new Date()
                };
            }
        }
        
        this.logger.debug(`Metrics updated for ${provider}`, metric);
    }
    
    getMetrics(provider: TranscriptionProvider): ProviderMetrics | undefined {
        return this.metrics.get(provider);
    }
    
    getAllMetrics(): ProviderMetrics[] {
        return Array.from(this.metrics.values());
    }
    
    getSuccessRate(provider: TranscriptionProvider): number {
        const metric = this.metrics.get(provider);
        if (!metric || metric.totalRequests === 0) return 0;
        
        return metric.successfulRequests / metric.totalRequests;
    }
}

/**
 * Provider 선택 전략
 */
class ProviderSelector {
    private roundRobinIndex = 0;
    
    constructor(
        private logger: ILogger,
        private metricsTracker: MetricsTracker
    ) {}
    
    select(
        providers: Map<TranscriptionProvider, ITranscriber>,
        strategy: SelectionStrategy,
        userId?: string
    ): ITranscriber {
        const availableProviders = Array.from(providers.entries())
            .filter(([_, provider]) => provider.getConfig().enabled);
        
        if (availableProviders.length === 0) {
            throw new Error('No transcription providers available');
        }
        
        switch (strategy) {
            case SelectionStrategy.COST_OPTIMIZED:
                return this.selectByCost(availableProviders);
                
            case SelectionStrategy.PERFORMANCE_OPTIMIZED:
                return this.selectByPerformance(availableProviders);
                
            case SelectionStrategy.QUALITY_OPTIMIZED:
                return this.selectByQuality(availableProviders);
                
            case SelectionStrategy.ROUND_ROBIN:
                return this.selectRoundRobin(availableProviders);
                
            case SelectionStrategy.AB_TEST:
                return this.selectForABTest(availableProviders, userId);
                
            case SelectionStrategy.MANUAL:
            default:
                return availableProviders[0][1];
        }
    }
    
    private selectByCost(
        providers: Array<[TranscriptionProvider, ITranscriber]>
    ): ITranscriber {
        // Deepgram이 일반적으로 더 저렴함
        const deepgram = providers.find(([name]) => name === 'deepgram');
        return deepgram ? deepgram[1] : providers[0][1];
    }
    
    private selectByPerformance(
        providers: Array<[TranscriptionProvider, ITranscriber]>
    ): ITranscriber {
        // 메트릭 기반으로 가장 빠른 Provider 선택
        let bestProvider = providers[0];
        let bestLatency = Infinity;
        
        for (const [name, provider] of providers) {
            const metrics = this.metricsTracker.getMetrics(name);
            if (metrics && metrics.averageLatency < bestLatency) {
                bestLatency = metrics.averageLatency;
                bestProvider = [name, provider];
            }
        }
        
        return bestProvider[1];
    }
    
    private selectByQuality(
        providers: Array<[TranscriptionProvider, ITranscriber]>
    ): ITranscriber {
        // 성공률이 가장 높은 Provider 선택
        let bestProvider = providers[0];
        let bestSuccessRate = 0;
        
        for (const [name, provider] of providers) {
            const successRate = this.metricsTracker.getSuccessRate(name);
            if (successRate > bestSuccessRate) {
                bestSuccessRate = successRate;
                bestProvider = [name, provider];
            }
        }
        
        return bestProvider[1];
    }
    
    private selectRoundRobin(
        providers: Array<[TranscriptionProvider, ITranscriber]>
    ): ITranscriber {
        const provider = providers[this.roundRobinIndex % providers.length];
        this.roundRobinIndex++;
        return provider[1];
    }
    
    private selectForABTest(
        providers: Array<[TranscriptionProvider, ITranscriber]>,
        userId?: string
    ): ITranscriber {
        // 간단한 해시 기반 A/B 테스트
        if (!userId) {
            return this.selectRoundRobin(providers);
        }
        
        const hash = this.hashString(userId);
        const threshold = 0.5; // 50/50 분할
        
        if (hash < threshold) {
            const whisper = providers.find(([name]) => name === 'whisper');
            return whisper ? whisper[1] : providers[0][1];
        } else {
            const deepgram = providers.find(([name]) => name === 'deepgram');
            return deepgram ? deepgram[1] : providers[0][1];
        }
    }
    
    private hashString(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash) / 2147483647; // Normalize to 0-1
    }
}

/**
 * 전사 Provider Factory
 * Provider 생성, 관리, 선택을 담당
 */
export class TranscriberFactory {
    private providers = new Map<TranscriptionProvider, ITranscriber>();
    private config: TranscriptionProviderConfig;
    private metricsTracker: MetricsTracker;
    private selector: ProviderSelector;
    
    constructor(
        private settingsManager: ISettingsManager,
        private logger: ILogger
    ) {
        this.metricsTracker = new MetricsTracker(logger);
        this.selector = new ProviderSelector(logger, this.metricsTracker);
        this.config = this.loadConfig();
        this.initializeProviders();
    }
    
    /**
     * 설정 로드
     */
    private loadConfig(): TranscriptionProviderConfig {
        const settings = (this.settingsManager.get('transcription') as Partial<TranscriptionProviderConfig>) || {};
        
        return {
            defaultProvider: settings.defaultProvider || 'whisper',
            autoSelect: settings.autoSelect || false,
            selectionStrategy: settings.selectionStrategy || SelectionStrategy.MANUAL,
            fallbackEnabled: settings.fallbackEnabled !== false,
            
            whisper: {
                enabled: settings.whisper?.enabled !== false,
                apiKey: settings.whisper?.apiKey ?? '',
                model: 'whisper-1',
                maxConcurrency: 1,
                timeout: 30000
            },
            
            deepgram: {
                enabled: settings.deepgram?.enabled || false,
                apiKey: settings.deepgram?.apiKey ?? '',
                model: settings.deepgram?.model || 'nova-2',
                maxConcurrency: settings.deepgram?.maxConcurrency ?? 5,
                timeout: settings.deepgram?.timeout ?? 30000,
                rateLimit: settings.deepgram?.rateLimit ?? { requests: 100, window: 60000 }
            },
            
            abTest: settings.abTest as ABTestConfig | undefined,
            monitoring: settings.monitoring as TranscriptionProviderConfig['monitoring'] | undefined
        };
    }
    
    /**
     * Provider 초기화
     */
    private initializeProviders(): void {
        // Whisper Provider
        if (this.config.whisper?.enabled && this.config.whisper.apiKey) {
            try {
                const whisperService = new WhisperService(
                    this.config.whisper.apiKey,
                    this.logger
                );
                const whisperAdapter = new WhisperAdapter(
                    whisperService,
                    this.logger,
                    this.config.whisper
                );
                this.providers.set('whisper', whisperAdapter);
                this.logger.info('Whisper provider initialized');
            } catch (error) {
                this.logger.error('Failed to initialize Whisper provider', error as Error);
            }
        }
        
        // Deepgram Provider
        if (this.config.deepgram?.enabled && this.config.deepgram.apiKey) {
            try {
                // Get timeout from settings, with fallback to default
        const settingsTimeout = Number(this.settingsManager?.get('requestTimeout')) || 30000;
        const configTimeout = this.config.deepgram.timeout || settingsTimeout;

                const deepgramService = new DeepgramService(
                this.config.deepgram.apiKey,
                this.logger,
                this.config.deepgram.rateLimit?.requests,
                configTimeout
            );
                const deepgramAdapter = new DeepgramAdapter(
                    deepgramService,
                    this.logger,
                    this.settingsManager,
                    this.config.deepgram
                );
                this.providers.set('deepgram', deepgramAdapter);
                this.logger.info('Deepgram provider initialized');
            } catch (error) {
                this.logger.error('Failed to initialize Deepgram provider', error as Error);
            }
        }
    }
    
    /**
     * Provider 가져오기
     */
    getProvider(preference?: TranscriptionProvider | 'auto'): ITranscriber {
        // 1. 명시적 선호도가 있는 경우
        if (preference && preference !== 'auto') {
            const provider = this.providers.get(preference);
            if (provider && provider.getConfig().enabled) {
                return provider;
            }
            
            // Fallback 활성화된 경우 다른 Provider 시도
            if (this.config.fallbackEnabled) {
                this.logger.warn(`Preferred provider ${preference} not available, falling back`);
                return this.getFallbackProvider(preference);
            }
            
            throw new ProviderUnavailableError(preference);
        }
        
        // 2. 자동 선택
        if (this.config.autoSelect || preference === 'auto') {
            return this.selector.select(
                this.providers,
                this.config.selectionStrategy || SelectionStrategy.MANUAL
            );
        }
        
        // 3. 기본 Provider
        const defaultProvider = this.providers.get(this.config.defaultProvider);
        if (defaultProvider && defaultProvider.getConfig().enabled) {
            return defaultProvider;
        }
        
        // 4. 사용 가능한 첫 번째 Provider
        for (const [name, provider] of this.providers) {
            if (provider.getConfig().enabled) {
                this.logger.warn(`Default provider not available, using ${name}`);
                return provider;
            }
        }
        
        throw new Error('No transcription provider available');
    }
    
    /**
     * Fallback Provider 가져오기
     */
    private getFallbackProvider(exclude: TranscriptionProvider): ITranscriber {
        for (const [name, provider] of this.providers) {
            if (name !== exclude && provider.getConfig().enabled) {
                return provider;
            }
        }
        
        throw new Error('No fallback provider available');
    }
    
    /**
     * A/B 테스트용 Provider 선택
     */
    getProviderForABTest(userId: string): ITranscriber {
        if (!this.config.abTest?.enabled) {
            return this.getProvider();
        }
        
        return this.selector.select(
            this.providers,
            SelectionStrategy.AB_TEST,
            userId
        );
    }
    
    /**
     * 모든 사용 가능한 Provider 반환
     */
    getAvailableProviders(): TranscriptionProvider[] {
        return Array.from(this.providers.entries())
            .filter(([_, provider]) => provider.getConfig().enabled)
            .map(([name]) => name);
    }
    
    /**
     * Provider 메트릭 기록
     */
    recordMetrics(
        provider: TranscriptionProvider,
        success: boolean,
        latency?: number,
        cost?: number,
        error?: Error
    ): void {
        this.metricsTracker.recordRequest(provider, success, latency, cost, error);
        
        // 모니터링 엔드포인트로 전송 (설정된 경우)
        if (this.config.monitoring?.enabled && this.config.monitoring.metricsEndpoint) {
            void this.sendMetricsToEndpoint(provider);
        }
    }
    
    /**
     * Provider 메트릭 조회
     */
    getMetrics(provider?: TranscriptionProvider): ProviderMetrics | ProviderMetrics[] {
        if (provider) {
            const metrics = this.metricsTracker.getMetrics(provider);
            if (!metrics) {
                throw new Error(`No metrics found for provider: ${provider}`);
            }
            return metrics;
        }
        
        return this.metricsTracker.getAllMetrics();
    }
    
    /**
     * 메트릭 엔드포인트로 전송
     */
    private async sendMetricsToEndpoint(provider: TranscriptionProvider): Promise<void> {
        // 실제 구현에서는 메트릭을 외부 모니터링 서비스로 전송
        const metrics = this.metricsTracker.getMetrics(provider);
        this.logger.debug('Sending metrics to monitoring endpoint', metrics);
    }
    
    /**
     * 설정 업데이트
     */
    async updateConfig(config: Partial<TranscriptionProviderConfig>): Promise<void> {
        this.config = {
            ...this.config,
            ...config
        };
        
        // 설정 저장
        await this.settingsManager.set('transcription', this.config);
        
        // Provider 재초기화
        this.reinitializeProviders();
    }
    
    /**
     * Provider 재초기화
     */
    private reinitializeProviders(): void {
        // 기존 Provider 정리
        this.providers.clear();
        
        // 새로 초기화
        this.initializeProviders();
        
        this.logger.info('Providers reinitialized with new configuration');
    }
    
    /**
     * Provider 활성화/비활성화
     */
    async toggleProvider(provider: TranscriptionProvider, enabled: boolean): Promise<void> {
        const config = (provider === 'whisper' ? this.config.whisper : this.config.deepgram) ?? {
            enabled: false
        };
        
        if (config) {
            config.enabled = enabled;
            await this.updateConfig(this.config);
        }
    }
    
    /**
     * 기본 Provider 변경
     */
    async setDefaultProvider(provider: TranscriptionProvider): Promise<void> {
        this.config.defaultProvider = provider;
        await this.updateConfig(this.config);
    }
}
