import type { ILogger, ISettingsManager } from '../../types';
import {
    ITranscriber,
    TranscriptionProvider,
    TranscriptionProviderConfig,
    SelectionStrategy,
    ProviderMetrics,
    ProviderUnavailableError,
    ABTestConfig,
    ProviderConfig,
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

        return this.selector.select(this.providers, SelectionStrategy.AB_TEST, {
            userId,
            abTestSplit: this.config.abTest.trafficSplit,
        });
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
            void this.sendMetricsToEndpoint(provider);
        }
    }

    /**
     * Get provider metrics
     */
    getMetrics(provider?: TranscriptionProvider):
        | ProviderMetrics
        | {
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
            metrics,
        };

        metrics.forEach((metric) => {
            aggregate.totalRequests += metric.totalRequests;
            aggregate.providerUsage[metric.provider] = metric.totalRequests;
            const errorRate =
                metric.totalRequests === 0 ? 0 : metric.failedRequests / metric.totalRequests;
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
        const settings =
            (this.settingsManager.get('transcription') as Partial<TranscriptionProviderConfig>) ||
            {};

        const abTest: ABTestConfig = settings.abTest ?? {
            enabled: false,
            trafficSplit: 50,
            metricTracking: false,
        };

        const monitoring: TranscriptionProviderConfig['monitoring'] = settings.monitoring ?? {
            enabled: false,
        };

        return {
            defaultProvider: settings.defaultProvider || 'whisper',
            autoSelect: settings.autoSelect || false,
            selectionStrategy:
                (settings.selectionStrategy as SelectionStrategy) || SelectionStrategy.MANUAL,
            fallbackEnabled: settings.fallbackEnabled !== false,

            whisper: this.loadProviderConfig('whisper', settings),
            deepgram: this.loadProviderConfig('deepgram', settings),

            abTest,
            monitoring,
        };
    }

    /**
     * Load provider-specific configuration
     */
    private loadProviderConfig(
        provider: TranscriptionProvider,
        settings: Partial<TranscriptionProviderConfig>
    ): ProviderConfig {
        const providerSettings = (settings[provider] as Partial<ProviderConfig>) || {};
        const defaults = this.getProviderDefaults(provider);

        return {
            enabled: providerSettings.enabled ?? defaults.enabled,
            apiKey: providerSettings.apiKey ?? '',
            model: providerSettings.model ?? defaults.model,
            maxConcurrency: providerSettings.maxConcurrency ?? defaults.maxConcurrency,
            timeout: providerSettings.timeout ?? defaults.timeout,
            rateLimit: providerSettings.rateLimit ?? defaults.rateLimit,
        };
    }

    /**
     * Get provider defaults
     */
    private getProviderDefaults(provider: TranscriptionProvider) {
        const defaults = {
            whisper: {
                enabled: true,
                apiKey: '',
                model: 'whisper-1',
                maxConcurrency: 1,
                timeout: 30000,
                rateLimit: { requests: 60, window: 60000 },
            },
            deepgram: {
                enabled: false,
                apiKey: '',
                model: 'nova-3',
                maxConcurrency: 5,
                timeout: 30000,
                rateLimit: {
                    requests: 100,
                    window: 60000,
                },
            },
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
        const config = this.config.whisper ?? {
            enabled: false,
            apiKey: '',
            model: 'whisper-1',
            maxConcurrency: 1,
            timeout: 30000,
        };

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
        const config = this.config.deepgram ?? {
            enabled: false,
            apiKey: '',
            model: 'nova-3',
            maxConcurrency: 5,
            timeout: 30000,
            rateLimit: { requests: 100, window: 60000 },
        };

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
        return Boolean(this.config.monitoring?.enabled && this.config.monitoring.metricsEndpoint);
    }

    /**
     * Send metrics to monitoring endpoint
     */
    private sendMetricsToEndpoint(provider: TranscriptionProvider): void {
        const metrics = this.metricsTracker.getMetrics(provider);
        const stats = this.metricsTracker.getPerformanceStats(provider);

        this.logger.debug('Sending metrics to monitoring endpoint', {
            provider,
            metrics,
            stats,
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
                fallbackEnabled: this.config.fallbackEnabled,
            },
        };
    }
}

type FactoryPluginSettings = SpeechToTextSettings & Record<string, unknown>;

class PluginSettingsManagerAdapter implements ISettingsManager {
    private transcriptionConfig: TranscriptionProviderConfig;
    private signature: string;

    constructor(
        private readonly settings: FactoryPluginSettings,
        private readonly logger: ILogger
    ) {
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

    load(): Promise<Record<string, unknown>> {
        return Promise.resolve({ transcription: this.transcriptionConfig });
    }

    save(settings: Record<string, unknown>): Promise<void> {
        if (settings?.transcription) {
            this.transcriptionConfig = settings.transcription as TranscriptionProviderConfig;
            this.signature = this.computeSignature(this.transcriptionConfig);
        }
        return Promise.resolve();
    }

    get(key: string): TranscriptionProviderConfig | undefined {
        if (key === 'transcription') {
            return this.transcriptionConfig;
        }
        return undefined;
    }

    set(key: string, value: TranscriptionProviderConfig): Promise<void> {
        if (key === 'transcription') {
            this.transcriptionConfig = value;
            this.signature = this.computeSignature(this.transcriptionConfig);
        }
        return Promise.resolve();
    }

    private buildConfig(): TranscriptionProviderConfig {
        const providerSetting: string =
            ((this.settings as Record<string, unknown>).transcriptionProvider as
                | string
                | undefined) ??
            ((this.settings as Record<string, unknown>).provider as string | undefined) ??
            'whisper';
        const defaultProvider: TranscriptionProvider =
            providerSetting === 'deepgram' ? 'deepgram' : 'whisper';
        const autoSelect = providerSetting === 'auto';

        const whisperApiKey = this.settings.whisperApiKey ?? this.settings.apiKey ?? '';
        const deepgramApiKey = this.settings.deepgramApiKey ?? '';
        const providerSettings =
            (this.settings.providerSettings as Record<string, unknown> | undefined) ?? {};
        const deepgramSettings = this.settings.deepgram as { model?: string } | undefined;

        const whisperConfigRaw: Partial<ProviderConfig> = this.extractProviderConfig(
            providerSettings.whisper
        );
        const deepgramConfigRaw: Partial<ProviderConfig> = this.extractProviderConfig(
            providerSettings.deepgram
        );

        const selection = this.mapSelectionStrategy(
            this.settings.selectionStrategy ?? this.settings.transcription?.selectionStrategy
        );
        const abTestConfig = this.mapAbTest(
            this.settings.abTesting ?? this.settings.transcription?.abTest
        ) ?? {
            enabled: false,
            trafficSplit: 0.5,
            metricTracking: false,
        };
        const selectionStrategy =
            selection ??
            (abTestConfig?.enabled ? SelectionStrategy.AB_TEST : SelectionStrategy.MANUAL);

        const whisper: ProviderConfig = {
            enabled: Boolean(whisperApiKey || !deepgramApiKey),
            apiKey: whisperApiKey,
            model: this.pickString(whisperConfigRaw?.model) ?? this.settings.model ?? 'whisper-1',
            maxConcurrency: this.pickNumber(whisperConfigRaw?.maxConcurrency) ?? 1,
            timeout:
                this.pickNumber(whisperConfigRaw?.timeout) ?? this.settings.requestTimeout ?? 30000,
            rateLimit: this.normalizeRateLimit(whisperConfigRaw?.rateLimit),
        };

        const deepgram: ProviderConfig = {
            enabled: Boolean(deepgramApiKey),
            apiKey: deepgramApiKey,
            model:
                this.pickString(deepgramConfigRaw?.model) ??
                this.pickString(deepgramSettings?.model) ??
                this.settings.deepgramModel ??
                'nova-3',
            maxConcurrency: this.pickNumber(deepgramConfigRaw?.maxConcurrency) ?? 5,
            timeout: this.pickNumber(deepgramConfigRaw?.timeout) ?? 30000,
            rateLimit: this.normalizeRateLimit(deepgramConfigRaw?.rateLimit) ?? {
                requests: 100,
                window: 60000,
            },
        };

        const monitoring = this.normalizeMonitoring(this.settings.monitoring);

        return {
            defaultProvider,
            autoSelect,
            selectionStrategy,
            fallbackEnabled: this.settings.fallbackEnabled !== false,
            whisper,
            deepgram,
            abTest: abTestConfig,
            monitoring,
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

    private mapAbTest(abTest?: unknown): ABTestConfig | undefined {
        if (!abTest || typeof abTest !== 'object') {
            return undefined;
        }

        const source = abTest as Record<string, unknown>;
        const enabled = source.enabled === true;
        if (!enabled) {
            return {
                enabled: false,
                trafficSplit: 0.5,
                metricTracking: false,
            };
        }

        const rawSplit =
            this.pickNumber(source.whisperPercentage) ??
            this.pickNumber(source.trafficSplit) ??
            0.5;
        const split = rawSplit > 1 ? rawSplit / 100 : rawSplit;

        return {
            enabled: true,
            trafficSplit: Math.max(0, Math.min(1, split)),
            metricTracking: source.metricTracking !== false,
            experimentId: this.pickString(source.experimentId),
        };
    }

    private extractProviderConfig(raw: unknown): Partial<ProviderConfig> {
        if (raw && typeof raw === 'object') {
            return raw as Partial<ProviderConfig>;
        }
        return {};
    }

    private pickString(value: unknown): string | undefined {
        return typeof value === 'string' ? value : undefined;
    }

    private pickNumber(value: unknown): number | undefined {
        return typeof value === 'number' ? value : undefined;
    }

    private normalizeRateLimit(value: unknown): ProviderConfig['rateLimit'] {
        if (!value || typeof value !== 'object') {
            return undefined;
        }
        const rate = value as Record<string, unknown>;
        const requests = this.pickNumber(rate.requests);
        const window = this.pickNumber(rate.window);
        if (requests !== undefined && window !== undefined) {
            return { requests, window };
        }
        return undefined;
    }

    private normalizeMonitoring(value: unknown): TranscriptionProviderConfig['monitoring'] {
        if (!value || typeof value !== 'object') {
            return { enabled: false };
        }
        const monitoring = value as Record<string, unknown>;
        const alertThresholds =
            monitoring.alertThresholds && typeof monitoring.alertThresholds === 'object'
                ? {
                      errorRate: this.pickNumber(
                          (monitoring.alertThresholds as Record<string, unknown>).errorRate
                      ),
                      latency: this.pickNumber(
                          (monitoring.alertThresholds as Record<string, unknown>).latency
                      ),
                      cost: this.pickNumber(
                          (monitoring.alertThresholds as Record<string, unknown>).cost
                      ),
                  }
                : undefined;

        return {
            enabled: monitoring.enabled === true,
            metricsEndpoint: this.pickString(monitoring.metricsEndpoint),
            alertThresholds,
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
            const abTestRaw =
                this.pluginSettings?.abTesting ?? this.pluginSettings?.transcription?.abTest;
            const abTest =
                abTestRaw && typeof abTestRaw === 'object'
                    ? (abTestRaw as {
                          enabled?: boolean;
                          whisperPercentage?: number;
                          trafficSplit?: number;
                      })
                    : undefined;

            if (abTest?.enabled) {
                const rawSplit = abTest.whisperPercentage ?? abTest.trafficSplit ?? 50;
                const percentage = typeof rawSplit === 'number' ? rawSplit : 50;
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

    override getMetrics(provider?: TranscriptionProvider):
        | ProviderMetrics
        | {
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
        const settings = this.pluginSettings as Record<string, unknown> | undefined;
        const forced =
            (settings?.abTesting as { forceProvider?: TranscriptionProvider } | undefined)
                ?.forceProvider ??
            (
                settings?.transcription as
                    | { abTest?: { forceProvider?: TranscriptionProvider } }
                    | undefined
            )?.abTest?.forceProvider;
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

        const configured =
            this.pluginSettings?.transcriptionProvider ?? this.pluginSettings?.provider;
        if (configured === 'whisper' || configured === 'deepgram' || configured === 'auto') {
            return configured;
        }

        return undefined;
    }

    private validateProviderAvailability(provider?: TranscriptionProvider | 'auto'): void {
        if (provider === 'deepgram' && !this.config.deepgram?.enabled) {
            throw new Error('Deepgram API key is missing');
        }

        if (provider === 'whisper' && !this.config.whisper?.enabled) {
            throw new Error('Whisper API key is missing');
        }
    }
}
