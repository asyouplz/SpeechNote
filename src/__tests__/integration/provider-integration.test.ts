import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { TranscriberFactory } from '../../infrastructure/api/TranscriberFactory';
import { WhisperService } from '../../infrastructure/api/WhisperService';
import { DeepgramService } from '../../infrastructure/api/providers/deepgram/DeepgramService';
import { WhisperAdapter } from '../../infrastructure/api/providers/whisper/WhisperAdapter';
import { DeepgramAdapter } from '../../infrastructure/api/providers/deepgram/DeepgramAdapter';
import {
    TranscriptionOptions,
    TranscriptionResponse,
} from '../../infrastructure/api/providers/ITranscriber';
import type { ILogger, ISettingsManager } from '../../types';

// Mock implementations
class MockLogger implements ILogger {
    debug = jest.fn();
    info = jest.fn();
    warn = jest.fn();
    error = jest.fn();
}

class MockSettingsManager implements ISettingsManager {
    private settings: any = {};

    async load() {
        return this.settings;
    }

    async save(settings: any) {
        this.settings = settings;
    }

    get<K extends string>(key: K): any {
        return this.settings[key];
    }

    async set<K extends string>(key: K, value: any) {
        this.settings[key] = value;
    }
}

describe('Provider Integration Tests', () => {
    let factory: TranscriberFactory;
    let logger: MockLogger;
    let settingsManager: MockSettingsManager;

    beforeEach(() => {
        logger = new MockLogger();
        settingsManager = new MockSettingsManager();

        // 기본 설정
        settingsManager.set('transcription', {
            defaultProvider: 'whisper',
            autoSelect: false,
            fallbackEnabled: true,
            whisper: {
                enabled: true,
                apiKey: 'test-whisper-key',
            },
            deepgram: {
                enabled: true,
                apiKey: 'test-deepgram-key',
            },
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('TranscriberFactory', () => {
        it('should initialize with both providers', () => {
            factory = new TranscriberFactory(settingsManager, logger);
            const providers = factory.getAvailableProviders();

            expect(providers).toContain('whisper');
            expect(providers).toContain('deepgram');
            expect(logger.info).toHaveBeenCalledWith('Whisper provider initialized');
            expect(logger.info).toHaveBeenCalledWith('Deepgram provider initialized');
        });

        it('should return default provider when no preference specified', () => {
            factory = new TranscriberFactory(settingsManager, logger);
            const provider = factory.getProvider();

            expect(provider).toBeDefined();
            expect(provider.getProviderName()).toBe('OpenAI Whisper');
        });

        it('should return specified provider when preference given', () => {
            factory = new TranscriberFactory(settingsManager, logger);
            const provider = factory.getProvider('deepgram');

            expect(provider).toBeDefined();
            expect(provider.getProviderName()).toBe('Deepgram');
        });

        it('should fallback when preferred provider unavailable', async () => {
            await settingsManager.set('transcription', {
                defaultProvider: 'whisper',
                fallbackEnabled: true,
                whisper: {
                    enabled: false,
                    apiKey: 'test-key',
                },
                deepgram: {
                    enabled: true,
                    apiKey: 'test-key',
                },
            });

            factory = new TranscriberFactory(settingsManager, logger);
            const provider = factory.getProvider('whisper');

            expect(provider.getProviderName()).toBe('Deepgram');
            expect(logger.warn).toHaveBeenCalledWith(
                'Preferred provider whisper not available, falling back'
            );
        });

        it('should handle A/B testing', () => {
            factory = new TranscriberFactory(settingsManager, logger);

            const provider1 = factory.getProviderForABTest('user1');
            const provider2 = factory.getProviderForABTest('user2');

            expect(provider1).toBeDefined();
            expect(provider2).toBeDefined();
        });

        it('should track metrics correctly', () => {
            factory = new TranscriberFactory(settingsManager, logger);

            factory.recordMetrics('whisper', true, 1500, 0.01);
            factory.recordMetrics('whisper', true, 1200, 0.01);
            factory.recordMetrics('whisper', false, undefined, undefined, new Error('Test error'));

            const metrics = factory.getMetrics('whisper');

            expect(metrics).toBeDefined();
            if (typeof metrics !== 'object' || Array.isArray(metrics)) {
                throw new Error('Expected single metric object');
            }

            expect(metrics.totalRequests).toBe(3);
            expect(metrics.successfulRequests).toBe(2);
            expect(metrics.failedRequests).toBe(1);
            expect(metrics.averageLatency).toBe(1350);
            expect(metrics.lastError?.message).toBe('Test error');
        });

        it('should toggle provider correctly', async () => {
            factory = new TranscriberFactory(settingsManager, logger);

            await factory.toggleProvider('deepgram', false);
            let providers = factory.getAvailableProviders();
            expect(providers).not.toContain('deepgram');

            await factory.toggleProvider('deepgram', true);
            providers = factory.getAvailableProviders();
            expect(providers).toContain('deepgram');
        });

        it('should change default provider', async () => {
            factory = new TranscriberFactory(settingsManager, logger);

            await factory.setDefaultProvider('deepgram');
            const provider = factory.getProvider();

            expect(provider.getProviderName()).toBe('Deepgram');
        });
    });

    describe('WhisperAdapter', () => {
        it('should adapt WhisperService interface correctly', async () => {
            const whisperService = new WhisperService('test-key', logger);
            const adapter = new WhisperAdapter(whisperService, logger);

            expect(adapter.getProviderName()).toBe('OpenAI Whisper');

            const capabilities = adapter.getCapabilities();
            expect(capabilities.streaming).toBe(false);
            expect(capabilities.maxFileSize).toBe(25 * 1024 * 1024);
            expect(capabilities.languages).toContain('ko');
            expect(capabilities.audioFormats).toContain('mp3');
        });

        it('should convert options correctly', async () => {
            const whisperService = new WhisperService('test-key', logger);
            const adapter = new WhisperAdapter(whisperService, logger);

            // Mock transcribe method
            const mockTranscribe = jest.spyOn(whisperService, 'transcribe').mockResolvedValue({
                text: 'Test transcription',
                language: 'en',
                duration: 5,
            });

            const options: TranscriptionOptions = {
                language: 'en',
                whisper: {
                    temperature: 0.3,
                    prompt: 'Test prompt',
                    responseFormat: 'verbose_json',
                },
            };

            await adapter.transcribe(new ArrayBuffer(1024), options);

            expect(mockTranscribe).toHaveBeenCalledWith(
                expect.any(ArrayBuffer),
                expect.objectContaining({
                    language: 'en',
                    temperature: 0.3,
                    prompt: 'Test prompt',
                    responseFormat: 'verbose_json',
                })
            );
        });
    });

    describe('DeepgramAdapter', () => {
        it('should adapt DeepgramService interface correctly', () => {
            const deepgramService = new DeepgramService('test-key', logger);
            const adapter = new DeepgramAdapter(deepgramService, logger);

            expect(adapter.getProviderName()).toBe('Deepgram');

            const capabilities = adapter.getCapabilities();
            expect(capabilities.streaming).toBe(true);
            expect(capabilities.realtime).toBe(true);
            expect(capabilities.maxFileSize).toBe(2 * 1024 * 1024 * 1024);
            expect(capabilities.languages).toContain('ko');
            expect(capabilities.features).toContain('diarization');
        });

        it('should convert options correctly', async () => {
            const deepgramService = new DeepgramService('test-key', logger);
            const adapter = new DeepgramAdapter(deepgramService, logger);

            // Mock transcribe method
            const mockTranscribe = jest.spyOn(deepgramService, 'transcribe').mockResolvedValue({
                metadata: {
                    transaction_key: 'test',
                    request_id: 'test',
                    sha256: 'test',
                    created: '2024-01-01',
                    duration: 5,
                    channels: 1,
                    models: ['nova-2'],
                    model_info: {},
                },
                results: {
                    channels: [
                        {
                            alternatives: [
                                {
                                    transcript: 'Test transcription',
                                    confidence: 0.95,
                                },
                            ],
                            detected_language: 'en',
                        },
                    ],
                },
            });

            const options: TranscriptionOptions = {
                language: 'en',
                model: 'nova-2',
                deepgram: {
                    punctuate: true,
                    smartFormat: true,
                    numerals: true,
                },
            };

            await adapter.transcribe(new ArrayBuffer(1024), options);

            expect(mockTranscribe).toHaveBeenCalledWith(
                expect.any(ArrayBuffer),
                expect.objectContaining({
                    tier: 'nova-2',
                    punctuate: true,
                    smartFormat: true,
                    numerals: true,
                }),
                'en'
            );
        });

        it('should estimate cost correctly', () => {
            const deepgramService = new DeepgramService('test-key', logger);
            const adapter = new DeepgramAdapter(deepgramService, logger);

            // Test cost calculation for 1 minute
            const cost = adapter.estimateCost(60, 'nova-2');
            expect(cost).toBeCloseTo(0.0043, 4);

            // Test cost for 10 minutes with enhanced model
            const enhancedCost = adapter.estimateCost(600, 'enhanced');
            expect(enhancedCost).toBeCloseTo(0.145, 3);
        });
    });

    describe('Provider Switching', () => {
        it('should switch between providers seamlessly', async () => {
            factory = new TranscriberFactory(settingsManager, logger);

            const testAudio = new ArrayBuffer(1024);
            const options: TranscriptionOptions = {
                language: 'en',
            };

            // Get Whisper provider
            const whisperProvider = factory.getProvider('whisper');
            expect(whisperProvider.getProviderName()).toBe('OpenAI Whisper');

            // Mock transcribe for testing
            jest.spyOn(whisperProvider, 'transcribe').mockResolvedValue({
                text: 'Whisper result',
                provider: 'whisper',
                language: 'en',
            } as TranscriptionResponse);

            const whisperResult = await whisperProvider.transcribe(testAudio, options);
            expect(whisperResult.provider).toBe('whisper');

            // Get Deepgram provider
            const deepgramProvider = factory.getProvider('deepgram');
            expect(deepgramProvider.getProviderName()).toBe('Deepgram');

            // Mock transcribe for testing
            jest.spyOn(deepgramProvider, 'transcribe').mockResolvedValue({
                text: 'Deepgram result',
                provider: 'deepgram',
                language: 'en',
            } as TranscriptionResponse);

            const deepgramResult = await deepgramProvider.transcribe(testAudio, options);
            expect(deepgramResult.provider).toBe('deepgram');
        });
    });

    describe('Error Handling', () => {
        it('should handle provider initialization errors', async () => {
            await settingsManager.set('transcription', {
                whisper: {
                    enabled: true,
                    apiKey: '', // Empty API key
                },
                deepgram: {
                    enabled: true,
                    apiKey: 'valid-key',
                },
            });

            factory = new TranscriberFactory(settingsManager, logger);

            // Should still initialize successfully with at least one provider
            const providers = factory.getAvailableProviders();
            expect(providers.length).toBeGreaterThan(0);
        });

        it('should throw when no providers available', async () => {
            await settingsManager.set('transcription', {
                whisper: {
                    enabled: false,
                },
                deepgram: {
                    enabled: false,
                },
            });

            factory = new TranscriberFactory(settingsManager, logger);

            expect(() => factory.getProvider()).toThrow('No transcription provider available');
        });
    });
});

describe('Provider Capability Tests', () => {
    let logger: MockLogger;

    beforeEach(() => {
        logger = new MockLogger();
    });

    it('should correctly report Whisper capabilities', () => {
        const whisperService = new WhisperService('test-key', logger);
        const adapter = new WhisperAdapter(whisperService, logger);
        const capabilities = adapter.getCapabilities();

        expect(capabilities).toEqual(
            expect.objectContaining({
                streaming: false,
                realtime: false,
                maxFileSize: 25 * 1024 * 1024,
                languages: expect.arrayContaining(['en', 'ko', 'ja', 'zh']),
                audioFormats: expect.arrayContaining(['mp3', 'wav', 'm4a']),
                features: expect.arrayContaining(['transcription', 'translation', 'timestamps']),
                models: ['whisper-1'],
            })
        );
    });

    it('should correctly report Deepgram capabilities', () => {
        const deepgramService = new DeepgramService('test-key', logger);
        const adapter = new DeepgramAdapter(deepgramService, logger);
        const capabilities = adapter.getCapabilities();

        expect(capabilities).toEqual(
            expect.objectContaining({
                streaming: true,
                realtime: true,
                maxFileSize: 2 * 1024 * 1024 * 1024,
                languages: expect.arrayContaining(['en', 'ko', 'ja', 'zh']),
                audioFormats: expect.arrayContaining(['mp3', 'wav', 'flac', 'opus']),
                features: expect.arrayContaining([
                    'streaming',
                    'diarization',
                    'smart_formatting',
                    'language_detection',
                ]),
                models: ['nova-2', 'enhanced', 'base'],
            })
        );
    });
});
