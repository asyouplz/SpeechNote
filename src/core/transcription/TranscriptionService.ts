import { TFile } from 'obsidian';
import type {
    ITranscriptionService,
    TranscriptionResult,
    TranscriptionStatus,
    IWhisperService,
    IAudioProcessor,
    ITextFormatter,
    IEventManager,
    ILogger,
} from '../../types';

export class TranscriptionService implements ITranscriptionService {
    private status: TranscriptionStatus = 'idle';
    private abortController?: AbortController;

    constructor(
        private whisperService: IWhisperService,
        private audioProcessor: IAudioProcessor,
        private textFormatter: ITextFormatter,
        private eventManager: IEventManager,
        private logger: ILogger
    ) {}

    async transcribe(file: TFile): Promise<TranscriptionResult> {
        try {
            this.status = 'validating';
            this.eventManager.emit('transcription:start', { fileName: file.name });

            // Validate file
            const validation = await this.audioProcessor.validate(file);
            if (!validation.valid) {
                throw new Error(`File validation failed: ${validation.errors?.join(', ')}`);
            }

            // Process audio
            this.status = 'processing';
            const processedAudio = await this.audioProcessor.process(file);

            // Transcribe
            this.status = 'transcribing';
            const response = await this.whisperService.transcribe(processedAudio.buffer);

            // Format text
            this.status = 'formatting';
            const formattedText = this.textFormatter.format(response.text);

            const result: TranscriptionResult = {
                text: formattedText,
                language: response.language,
                segments: response.segments?.map((s, i) => ({
                    id: i,
                    start: s.start,
                    end: s.end,
                    text: s.text,
                })),
            };

            this.status = 'completed';
            this.eventManager.emit('transcription:complete', { result });

            return result;
        } catch (error) {
            this.status = 'error';
            this.eventManager.emit('transcription:error', { error });
            throw error;
        }
    }

    cancel(): void {
        this.abortController?.abort();
        this.status = 'cancelled';
        this.eventManager.emit('transcription:cancelled', {});
    }

    getStatus(): TranscriptionStatus {
        return this.status;
    }
}