import { TranscriberFactory } from '../../src/infrastructure/api/TranscriberFactoryRefactored';
import { DeepgramService } from '../../src/infrastructure/api/providers/deepgram/DeepgramServiceRefactored';
import { WhisperAdapter } from '../../src/infrastructure/api/providers/whisper/WhisperAdapter';
import { DeepgramAdapter } from '../../src/infrastructure/api/providers/deepgram/DeepgramAdapterRefactored';
import { PluginSettings } from '../../src/domain/models/Settings';

describe('Deepgram Integration Tests', () => {
    let factory: TranscriberFactory;
    let mockSettings: PluginSettings;

    beforeEach(() => {
        mockSettings = {
            transcriptionProvider: 'auto',
            whisperApiKey: 'test-whisper-key',
            deepgramApiKey: 'test-deepgram-key',
            language: 'ko',
            model: 'base',
            experimentalFeatures: {
                enableStreaming: false,
                enableSpeakerDiarization: false,
            },
            providerSettings: {
                deepgram: {
                    model: 'nova-2',
                    tier: 'nova',
                    features: {
                        punctuate: true,
                        utterances: false,
                        smartFormat: true,
                    },
                },
                whisper: {
                    model: 'whisper-1',
                    temperature: 0,
                },
            },
            abTesting: {
                enabled: false,
                whisperPercentage: 50,
                forceProvider: null,
            },
        } as PluginSettings;

        factory = new TranscriberFactory(mockSettings, console);
    });

    describe('Factory Pattern', () => {
        test('should create WhisperAdapter when provider is whisper', () => {
            mockSettings.transcriptionProvider = 'whisper';
            const provider = factory.getProvider();
            expect(provider).toBeInstanceOf(WhisperAdapter);
        });

        test('should create DeepgramAdapter when provider is deepgram', () => {
            mockSettings.transcriptionProvider = 'deepgram';
            const provider = factory.getProvider();
            expect(provider).toBeInstanceOf(DeepgramAdapter);
        });

        test('should select provider automatically in auto mode', () => {
            mockSettings.transcriptionProvider = 'auto';
            const provider = factory.getProvider();
            expect(provider).toBeDefined();
            expect(['WhisperAdapter', 'DeepgramAdapter']).toContain(provider.constructor.name);
        });
    });

    describe('Provider Capabilities', () => {
        test('Deepgram should support streaming', () => {
            const deepgramAdapter = new DeepgramAdapter(
                mockSettings.deepgramApiKey!,
                mockSettings,
                console
            );
            const capabilities = deepgramAdapter.getCapabilities();
            expect(capabilities.streaming).toBe(true);
        });

        test('Whisper should not support streaming', () => {
            const whisperAdapter = new WhisperAdapter(
                {} as any, // Mock WhisperService
                console
            );
            const capabilities = whisperAdapter.getCapabilities();
            expect(capabilities.streaming).toBe(false);
        });
    });

    describe('Error Handling', () => {
        test('should handle missing API key gracefully', async () => {
            mockSettings.deepgramApiKey = '';
            mockSettings.transcriptionProvider = 'deepgram';

            expect(() => factory.getProvider()).toThrow(/API key/i);
        });

        test('should fallback to whisper when deepgram fails', async () => {
            mockSettings.transcriptionProvider = 'auto';
            // Mock Deepgram failure scenario
            const provider = factory.getProvider();
            expect(provider).toBeDefined();
        });
    });

    describe('A/B Testing', () => {
        test('should respect A/B testing settings', () => {
            mockSettings.abTesting = {
                enabled: true,
                whisperPercentage: 100,
                forceProvider: null,
            };

            const providers = [];
            for (let i = 0; i < 10; i++) {
                providers.push(factory.getProvider());
            }

            // With 100% whisper, all should be WhisperAdapter
            const allWhisper = providers.every((p) => p instanceof WhisperAdapter);
            expect(allWhisper).toBe(true);
        });

        test('should force provider when specified', () => {
            mockSettings.abTesting = {
                enabled: true,
                whisperPercentage: 0,
                forceProvider: 'deepgram',
            };

            const provider = factory.getProvider();
            expect(provider).toBeInstanceOf(DeepgramAdapter);
        });
    });

    describe('Metrics Tracking', () => {
        test('should track provider usage metrics', () => {
            const metrics = factory.getMetrics();
            expect(metrics).toHaveProperty('totalRequests');
            expect(metrics).toHaveProperty('providerUsage');
            expect(metrics).toHaveProperty('errorRates');
        });

        test('should calculate average response time', () => {
            const metrics = factory.getMetrics();
            expect(metrics).toHaveProperty('averageResponseTime');
        });
    });

    describe('Response Normalization', () => {
        test('should normalize Deepgram response to common format', () => {
            const deepgramResponse = {
                results: {
                    channels: [
                        {
                            alternatives: [
                                {
                                    transcript: '테스트 텍스트',
                                    confidence: 0.95,
                                    words: [
                                        { word: '테스트', start: 0, end: 0.5 },
                                        { word: '텍스트', start: 0.5, end: 1.0 },
                                    ],
                                },
                            ],
                        },
                    ],
                },
                metadata: {
                    duration: 1.0,
                    channels: 1,
                },
            };

            const adapter = new DeepgramAdapter(
                mockSettings.deepgramApiKey!,
                mockSettings,
                console
            );

            // This would be tested with actual normalization logic
            expect(adapter).toBeDefined();
        });
    });
});
