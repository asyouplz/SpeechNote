import { DeepgramAdapter } from '../../src/infrastructure/api/providers/deepgram/DeepgramAdapter';
import {
    TranscriptionError,
    type DeepgramSpecificOptions,
    type TranscriptionOptions,
} from '../../src/infrastructure/api/providers/ITranscriber';
import type { DeepgramService } from '../../src/infrastructure/api/providers/deepgram/DeepgramService';
import type { ILogger, ISettingsManager } from '../../src/types';

const createLogger = (): ILogger => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
});

const createSettingsManager = (overrides?: Record<string, unknown>): ISettingsManager => ({
    load: jest.fn(),
    save: jest.fn(),
    get: jest.fn((key: string) => overrides?.[key]),
    set: jest.fn(),
});

const createService = (): DeepgramService =>
    ({
        transcribe: jest.fn(),
        parseResponse: jest.fn(),
        validateApiKey: jest.fn(),
        cancel: jest.fn(),
    } as unknown as DeepgramService);

const createAdapter = (settingsOverrides?: Record<string, unknown>) => {
    const service = createService();
    const adapter = new DeepgramAdapter(
        service,
        createLogger(),
        createSettingsManager(settingsOverrides)
    );
    return { adapter, service };
};

describe('DeepgramAdapter', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('merges Deepgram feature toggles from settings', () => {
        const { adapter } = createAdapter({
            transcription: {
                deepgram: {
                    features: {
                        punctuation: false,
                        smartFormat: false,
                        diarization: true,
                        utterances: false,
                        numerals: true,
                    },
                },
            },
        });

        const options = (
            adapter as unknown as {
                convertOptions(opts?: TranscriptionOptions): DeepgramSpecificOptions;
            }
        ).convertOptions({ model: 'nova-2' });

        expect(options.tier).toBe('nova-2');
        expect(options.punctuate).toBe(false);
        expect(options.smartFormat).toBe(false);
        expect(options.diarize).toBe(true);
        expect(options.utterances).toBe(false);
        expect(options.numerals).toBe(true);
    });

    it('enhances EMPTY_TRANSCRIPT errors with actionable guidance', async () => {
        const { adapter, service } = createAdapter();
        const audio = new ArrayBuffer(1024);

        (service.transcribe as jest.Mock).mockRejectedValue(
            new TranscriptionError('No speech detected', 'EMPTY_TRANSCRIPT', 'deepgram')
        );

        await expect(adapter.transcribe(audio)).rejects.toThrow('No transcript was returned');
    });
});
