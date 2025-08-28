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

/**
 * Refactored Transcriber Factory
 * Clean architecture with separated concerns and improved maintainability
 */
export class TranscriberFactoryRefactored {
    private providers = new Map<TranscriptionProvider, ITranscriber>();
    private config: TranscriptionProviderConfig;
    private readonly metricsTracker: MetricsTracker;
    private readonly selector: ProviderSelector;
    
    constructor(
        private readonly settingsManager: ISettingsManager,
        private readonly logger: ILogger
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
    private loadConfiguration(): TranscriptionProviderConfig {
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
            rateLimit: providerSettings.rateLimit ?? defaults.rateLimit
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
                model: 'nova-2',
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
    private async saveConfiguration(): Promise<void> {
        await this.settingsManager.set('transcription', this.config);
    }

    /**
     * Reinitialize providers with new configuration
     */
    private reinitializeProviders(): void {
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