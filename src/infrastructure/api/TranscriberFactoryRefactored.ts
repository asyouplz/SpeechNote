import type { ILogger, ISettingsManager } from '../../types';
import {
    ITranscriber,
    TranscriptionProvider,
    TranscriptionProviderConfig,
    SelectionStrategy,
    ProviderMetrics,
    ProviderUnavailableError
} from './providers/ITranscriber';
import { WhisperService } from './WhisperService';
import { WhisperAdapter } from './providers/whisper/WhisperAdapter';
import { DeepgramAdapterRefactored } from './providers/deepgram/DeepgramAdapterRefactored';
import { MetricsTracker } from './providers/factory/MetricsTracker';
import { ProviderSelector } from './providers/factory/ProviderSelector';
import type { SpeechToTextSettings } from '../../domain/models/Settings';

/**
 * Refactored Transcriber Factory
 * Clean architecture with separated concerns and improved maintainability
 */
export class TranscriberFactoryRefactored {
    protected providers = new Map<TranscriptionProvider, ITranscriber>();
    protected config: TranscriptionProviderConfig;
    protected readonly metricsTracker: MetricsTracker;
    protected readonly selector: ProviderSelector;

    constructor(
        protected readonly settingsManager: ISettingsManager,
        protected readonly logger: ILogger
    ) {
        this.metricsTracker = new MetricsTracker(logger);
        this.selector = new ProviderSelector(logger, this.metricsTracker);
        this.config = this.loadConfiguration();
        this.initializeProviders();
    }

    /**
     * Get provider with preference handling
     */
    getProvider(preference?: TranscriptionProvider | 'auto'): ITranscriber {
        // Handle explicit preference
        if (preference && preference !== 'auto') {
            return this.getSpecificProvider(preference);
        }

        // Handle auto selection
        if (this.shouldAutoSelect(preference)) {
            return this.selectProvider();
        }

        // Use default provider
        return this.getDefaultProvider();
    }

    /**
     * Get provider for A/B testing
     */
    getProviderForABTest(userId: string): ITranscriber {
        if (!this.config.abTest?.enabled) {
            return this.getProvider();
        }

        return this.selector.select(
            this.providers,
            SelectionStrategy.AB_TEST,
            {
                userId,
                abTestSplit: this.config.abTest.trafficSplit
            }
        );
    }

    /**
     * Record provider metrics
     */
    recordMetrics(
        provider: TranscriptionProvider,
        success: boolean,
        latency?: number,
        cost?: number,
        error?: Error
    ): void {
        this.metricsTracker.recordRequest(provider, success, latency, cost, error);

        if (this.shouldSendMetrics()) {
            this.sendMetricsToEndpoint(provider);
        }
    }

    /**
     * Get provider metrics
     */
    getMetrics(provider?: TranscriptionProvider): ProviderMetrics | {
        totalRequests: number;
        providerUsage: Record<string, number>;
        errorRates: Record<string, number>;
        averageResponseTime: Record<string, number>;
        metrics: ProviderMetrics[];
    } {
        if (provider) {
            const metrics = this.metricsTracker.getMetrics(provider);
            if (!metrics) {
                throw new Error(`No metrics found for provider: ${provider}`);
            }
            return metrics;
        }

        const metrics = this.metricsTracker.getAllMetrics();
        const aggregate = {
            totalRequests: 0,
            providerUsage: {} as Record<string, number>,
            errorRates: {} as Record<string, number>,
            averageResponseTime: {} as Record<string, number>,
            metrics
        };

        metrics.forEach(metric => {
            aggregate.totalRequests += metric.totalRequests;
            aggregate.providerUsage[metric.provider] = metric.totalRequests;
            const errorRate = metric.totalRequests === 0 ? 0 : metric.failedRequests / metric.totalRequests;
            aggregate.errorRates[metric.provider] = errorRate;
            aggregate.averageResponseTime[metric.provider] = metric.averageLatency;
        });

        return aggregate;
    }

    /**
     * Get available providers
     */
    getAvailableProviders(): TranscriptionProvider[] {
        return Array.from(this.providers.entries())
            .filter(([_, provider]) => provider.getConfig().enabled)
            .map(([name]) => name);
    }

    /**
     * Update configuration
     */
    async updateConfig(config: Partial<TranscriptionProviderConfig>): Promise<void> {
        this.config = { ...this.config, ...config };
        await this.saveConfiguration();
        this.reinitializeProviders();
    }

    /**
     * Toggle provider on/off
     */
    async toggleProvider(provider: TranscriptionProvider, enabled: boolean): Promise<void> {
        const providerConfig = this.getProviderConfig(provider);
        if (providerConfig) {
            providerConfig.enabled = enabled;
            await this.updateConfig(this.config);
        }
    }

    /**
     * Set default provider
     */
    async setDefaultProvider(provider: TranscriptionProvider): Promise<void> {
        this.config.defaultProvider = provider;
        await this.updateConfig(this.config);
    }

    /**
     * Load configuration from settings
     */
    protected loadConfiguration(): TranscriptionProviderConfig {
        const settings = this.settingsManager.get('transcription') || {};

        return {
            defaultProvider: settings.defaultProvider || 'whisper',
            autoSelect: settings.autoSelect || false,
            selectionStrategy: settings.selectionStrategy || SelectionStrategy.MANUAL,
            fallbackEnabled: settings.fallbackEnabled !== false,

            whisper: this.loadProviderConfig('whisper', settings),
            deepgram: this.loadProviderConfig('deepgram', settings),

            abTest: settings.abTest,
            monitoring: settings.monitoring
        };
    }

    /**
     * Load provider-specific configuration
     */
    private loadProviderConfig(provider: TranscriptionProvider, settings: any) {
        const providerSettings = settings[provider] || {};
        const defaults = this.getProviderDefaults(provider);

        return {
            enabled: providerSettings.enabled ?? defaults.enabled,
            apiKey: providerSettings.apiKey || settings.apiKey || '',
            model: providerSettings.model || defaults.model,
            maxConcurrency: providerSettings.maxConcurrency ?? defaults.maxConcurrency,
            timeout: providerSettings.timeout ?? defaults.timeout,
            rateLimit: (providerSettings as any).rateLimit ?? (defaults as any).rateLimit
        };
    }

    /**
     * Get provider defaults
     */
    private getProviderDefaults(provider: TranscriptionProvider) {
        const defaults = {
            whisper: {
                enabled: true,
                model: 'whisper-1',
                maxConcurrency: 1,
                timeout: 30000
            },
            deepgram: {
                enabled: false,
                model: 'nova-3',
                maxConcurrency: 5,
                timeout: 30000,
                rateLimit: {
                    requests: 100,
                    window: 60000
                }
            }
        };

        return defaults[provider];
    }

    /**
     * Initialize providers
     */
    private initializeProviders(): void {
        this.initializeWhisperProvider();
        this.initializeDeepgramProvider();

        if (this.providers.size === 0) {
            this.logger.warn('No transcription providers initialized');
        }
    }

    /**
     * Initialize Whisper provider
     */
    private initializeWhisperProvider(): void {
        const config = this.config.whisper;

        if (!config?.enabled || !config.apiKey) {
            this.logger.debug('Whisper provider not initialized: disabled or missing API key');
            return;
        }

        try {
            const whisperService = new WhisperService(config.apiKey, this.logger);
            const whisperAdapter = new WhisperAdapter(whisperService, this.logger, config);

            this.providers.set('whisper', whisperAdapter);
            this.logger.info('Whisper provider initialized');
        } catch (error) {
            this.logger.error('Failed to initialize Whisper provider', error as Error);
        }
    }

    /**
     * Initialize Deepgram provider
     */
    private initializeDeepgramProvider(): void {
        const config = this.config.deepgram;

        if (!config?.enabled || !config.apiKey) {
            this.logger.debug('Deepgram provider not initialized: disabled or missing API key');
            return;
        }

        try {
            const deepgramAdapter = new DeepgramAdapterRefactored(
                config.apiKey,
                this.logger,
                config
            );

            this.providers.set('deepgram', deepgramAdapter);
            this.logger.info('Deepgram provider initialized');
        } catch (error) {
            this.logger.error('Failed to initialize Deepgram provider', error as Error);
        }
    }

    /**
     * Get specific provider
     */
    private getSpecificProvider(preference: TranscriptionProvider): ITranscriber {
        const provider = this.providers.get(preference);

        if (provider && provider.getConfig().enabled) {
            return provider;
        }

        if (this.config.fallbackEnabled) {
            this.logger.warn(`Preferred provider ${preference} not available, falling back`);
            return this.getFallbackProvider(preference);
        }

        throw new ProviderUnavailableError(preference);
    }

    /**
     * Should auto-select provider
     */
    private shouldAutoSelect(preference?: string): boolean {
        return this.config.autoSelect || preference === 'auto';
    }

    /**
     * Select provider using configured strategy
     */
    private selectProvider(): ITranscriber {
        return this.selector.select(
            this.providers,
            this.config.selectionStrategy || SelectionStrategy.MANUAL
        );
    }

    /**
     * Get default provider
     */
    private getDefaultProvider(): ITranscriber {
        const defaultProvider = this.providers.get(this.config.defaultProvider);

        if (defaultProvider?.getConfig().enabled) {
            return defaultProvider;
        }

        // Return first available provider
        for (const [name, provider] of this.providers) {
            if (provider.getConfig().enabled) {
                this.logger.warn(`Default provider not available, using ${name}`);
                return provider;
            }
        }

        throw new Error('No transcription provider available');
    }

    /**
     * Get fallback provider
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
     * Get provider configuration
     */
    private getProviderConfig(provider: TranscriptionProvider) {
        return provider === 'whisper' ? this.config.whisper : this.config.deepgram;
    }

    /**
     * Save configuration
     */
    protected async saveConfiguration(): Promise<void> {
        await this.settingsManager.set('transcription', this.config);
    }

    /**
     * Reinitialize providers with new configuration
     */
    protected reinitializeProviders(): void {
        this.providers.clear();
        this.initializeProviders();
        this.logger.info('Providers reinitialized with new configuration');
    }

    /**
     * Should send metrics to endpoint
     */
    private shouldSendMetrics(): boolean {
        return Boolean(
            this.config.monitoring?.enabled &&
            this.config.monitoring.metricsEndpoint
        );
    }

    /**
     * Send metrics to monitoring endpoint
     */
    private async sendMetricsToEndpoint(provider: TranscriptionProvider): Promise<void> {
        const metrics = this.metricsTracker.getMetrics(provider);
        const stats = this.metricsTracker.getPerformanceStats(provider);

        this.logger.debug('Sending metrics to monitoring endpoint', {
            provider,
            metrics,
            stats
        });

        // Implementation would send to actual endpoint
        // For now, just log
    }

    /**
     * Export factory statistics
     */
    getStatistics() {
        return {
            providers: this.getAvailableProviders(),
            metrics: this.metricsTracker.exportMetrics(),
            selector: this.selector.getStatistics(),
            config: {
                defaultProvider: this.config.defaultProvider,
                autoSelect: this.config.autoSelect,
                selectionStrategy: this.config.selectionStrategy,
                fallbackEnabled: this.config.fallbackEnabled
            }
        };
    }
}

type FactoryPluginSettings = SpeechToTextSettings & Record<string, any>;

class PluginSettingsManagerAdapter implements ISettingsManager {
    private transcriptionConfig: TranscriptionProviderConfig;
    private signature: string;

    constructor(private readonly settings: FactoryPluginSettings, private readonly logger: ILogger) {
        this.transcriptionConfig = this.buildConfig();
        this.signature = this.computeSignature(this.transcriptionConfig);
    }

    updateFromPlugin(): boolean {
        const nextConfig = this.buildConfig();
        const nextSignature = this.computeSignature(nextConfig);
        const changed = nextSignature !== this.signature;
        this.transcriptionConfig = nextConfig;
        this.signature = nextSignature;
        return changed;
    }

    async load(): Promise<Record<string, unknown>> {
        return { transcription: this.transcriptionConfig };
    }

    async save(settings: any): Promise<void> {
        if (settings?.transcription) {
            this.transcriptionConfig = settings.transcription as TranscriptionProviderConfig;
            this.signature = this.computeSignature(this.transcriptionConfig);
        }
    }

    get(key: string): any {
        if (key === 'transcription') {
            return this.transcriptionConfig;
        }
        return undefined;
    }

    async set(key: string, value: any): Promise<void> {
        if (key === 'transcription') {
            this.transcriptionConfig = value as TranscriptionProviderConfig;
            this.signature = this.computeSignature(this.transcriptionConfig);
        }
    }

    private buildConfig(): TranscriptionProviderConfig {
        const providerSetting: string = this.settings.transcriptionProvider ?? this.settings.provider ?? 'whisper';
        const defaultProvider: TranscriptionProvider = providerSetting === 'deepgram' ? 'deepgram' : 'whisper';
        const autoSelect = providerSetting === 'auto';

        const whisperApiKey = this.settings.whisperApiKey ?? this.settings.apiKey ?? '';
        const deepgramApiKey = this.settings.deepgramApiKey ?? '';
        const providerSettings = this.settings.providerSettings ?? {};

        const whisperConfig = providerSettings.whisper ?? {};
        const deepgramConfig = providerSettings.deepgram ?? {};

        const selection = this.mapSelectionStrategy(
            this.settings.selectionStrategy ?? this.settings.transcription?.selectionStrategy
        );
        const abTestConfig = this.mapAbTest(this.settings.abTesting ?? this.settings.transcription?.abTest);
        const selectionStrategy = selection ?? (abTestConfig ? SelectionStrategy.AB_TEST : SelectionStrategy.MANUAL);

        return {
            defaultProvider,
            autoSelect,
            selectionStrategy,
            fallbackEnabled: this.settings.fallbackEnabled !== false,
            whisper: {
                enabled: Boolean(whisperApiKey || !deepgramApiKey),
                apiKey: whisperApiKey,
                model: whisperConfig.model ?? this.settings.model ?? 'whisper-1',
                maxConcurrency: whisperConfig.maxConcurrency ?? 1,
                timeout: whisperConfig.timeout ?? this.settings.requestTimeout ?? 30000
            },
            deepgram: {
                enabled: Boolean(deepgramApiKey),
                apiKey: deepgramApiKey,
                model:
                    deepgramConfig.model ??
                    this.settings.deepgram?.model ??
                    this.settings.deepgramModel ??
                    'nova-3',
                maxConcurrency: deepgramConfig.maxConcurrency ?? 5,
                timeout: deepgramConfig.timeout ?? 30000,
                rateLimit: deepgramConfig.rateLimit ?? { requests: 100, window: 60000 }
            },
            abTest: abTestConfig,
            monitoring: this.settings.monitoring
        };
    }

    private mapSelectionStrategy(strategy?: string): SelectionStrategy | undefined {
        if (!strategy) {
            return undefined;
        }

        switch (strategy) {
            case 'cost_optimized':
                return SelectionStrategy.COST_OPTIMIZED;
            case 'performance_optimized':
                return SelectionStrategy.PERFORMANCE_OPTIMIZED;
            case 'quality_optimized':
                return SelectionStrategy.QUALITY_OPTIMIZED;
            case 'round_robin':
                return SelectionStrategy.ROUND_ROBIN;
            case 'ab_test':
                return SelectionStrategy.AB_TEST;
            case 'manual':
            default:
                return SelectionStrategy.MANUAL;
        }
    }

    private mapAbTest(abTest?: any) {
        if (!abTest?.enabled) {
            return undefined;
        }

        const percentage = abTest.whisperPercentage ?? (abTest.trafficSplit ?? 50);
        const split = percentage > 1 ? percentage / 100 : percentage;
        return {
            enabled: true,
            trafficSplit: Math.max(0, Math.min(1, split)),
            metricTracking: abTest.metricTracking ?? true,
            experimentId: abTest.experimentId
        };
    }

    private computeSignature(config: TranscriptionProviderConfig): string {
        try {
            return JSON.stringify(config);
        } catch (error) {
            this.logger.debug('Failed to serialize transcription config for signature', error);
            return Date.now().toString();
        }
    }
}

export class TranscriberFactory extends TranscriberFactoryRefactored {
    private readonly settingsAdapter: PluginSettingsManagerAdapter;

    constructor(private readonly pluginSettings: FactoryPluginSettings, logger: ILogger) {
        const adapter = new PluginSettingsManagerAdapter(pluginSettings, logger);
        super(adapter, logger);
        this.settingsAdapter = adapter;
    }

    override getProvider(preference?: TranscriptionProvider | 'auto'): ITranscriber {
        this.refreshConfiguration();
        const forced = this.getForcedProvider();
        let resolvedPreference = this.resolvePreference(preference, forced);

        if (!forced) {
            const abTest = this.pluginSettings?.abTesting ?? this.pluginSettings?.transcription?.abTest;
            if (abTest?.enabled) {
                const percentage = abTest.whisperPercentage ?? abTest.trafficSplit ?? 50;
                if (percentage >= 100) {
                    resolvedPreference = 'whisper';
                } else if (percentage <= 0) {
                    resolvedPreference = 'deepgram';
                } else if (resolvedPreference === 'auto' || resolvedPreference === undefined) {
                    const threshold = percentage > 1 ? percentage : percentage * 100;
                    const roll = Math.random() * 100;
                    resolvedPreference = roll < threshold ? 'whisper' : 'deepgram';
                }
            }
        }

        this.validateProviderAvailability(resolvedPreference);

        return super.getProvider(resolvedPreference);
    }

    override getProviderForABTest(userId: string): ITranscriber {
        this.refreshConfiguration();
        const forced = this.getForcedProvider();
        if (forced) {
            return super.getProvider(forced);
        }

        return super.getProviderForABTest(userId);
    }

    override getMetrics(provider?: TranscriptionProvider): ProviderMetrics | {
        totalRequests: number;
        providerUsage: Record<string, number>;
        errorRates: Record<string, number>;
        averageResponseTime: Record<string, number>;
        metrics: ProviderMetrics[];
    } {
        this.refreshConfiguration();
        return super.getMetrics(provider);
    }

    override recordMetrics(
        provider: TranscriptionProvider,
        success: boolean,
        latency?: number,
        cost?: number,
        error?: Error
    ): void {
        this.refreshConfiguration();
        super.recordMetrics(provider, success, latency, cost, error);
    }

    override getAvailableProviders(): TranscriptionProvider[] {
        this.refreshConfiguration();
        return super.getAvailableProviders();
    }

    private refreshConfiguration(): void {
        const changed = this.settingsAdapter.updateFromPlugin();
        if (changed) {
            this.config = this.loadConfiguration();
            this.reinitializeProviders();
        }
    }

    private getForcedProvider(): TranscriptionProvider | undefined {
        const forced = (this.pluginSettings as any)?.abTesting?.forceProvider ?? (this.pluginSettings as any)?.transcription?.abTest?.forceProvider;
        if (forced === 'whisper' || forced === 'deepgram') {
            return forced;
        }
        return undefined;
    }

    private resolvePreference(
        preference?: TranscriptionProvider | 'auto',
        forced?: TranscriptionProvider
    ): TranscriptionProvider | 'auto' | undefined {
        if (forced) {
            return forced;
        }

        if (preference) {
            return preference;
        }

        const configured = this.pluginSettings?.transcriptionProvider ?? this.pluginSettings?.provider;
        if (configured === 'whisper' || configured === 'deepgram' || configured === 'auto') {
            return configured;
        }

        return undefined;
    }

    private validateProviderAvailability(provider?: TranscriptionProvider | 'auto' | undefined): void {
        if (provider === 'deepgram' && !this.config.deepgram?.enabled) {
            throw new Error('Deepgram API key is missing');
        }

        if (provider === 'whisper' && !this.config.whisper?.enabled) {
            throw new Error('Whisper API key is missing');
        }
    }
}
