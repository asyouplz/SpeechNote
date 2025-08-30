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
        private logger: ILogger,
        private settings?: any // 🔥 설정 주입
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
            this.logger.debug('Starting transcription with WhisperService');
            
            // 🔥 언어 옵션 전달
            const transcribeOptions = {
                language: this.settings?.language,
                model: this.settings?.model
            };
            
            this.logger.debug('Transcription options:', transcribeOptions);
            
            const response = await this.whisperService.transcribe(processedAudio.buffer, transcribeOptions);
            
            this.logger.debug('WhisperService response:', {
                hasResponse: !!response,
                hasText: !!response?.text,
                textLength: response?.text?.length || 0,
                textPreview: response?.text?.substring(0, 100),
                language: response?.language
            });
            
            // Validate response
            if (!response || !response.text) {
                this.logger.error('Empty or invalid response from WhisperService', undefined, { response });
                throw new Error('Transcription service returned empty text');
            }

            // Format text
            this.status = 'formatting';
            const formattedText = this.textFormatter.format(response.text);
            
            this.logger.debug('Text formatted:', {
                originalLength: response.text.length,
                formattedLength: formattedText.length,
                formattedPreview: formattedText.substring(0, 100)
            });

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
            
            this.logger.debug('Emitting transcription:complete event', {
                textLength: result.text.length,
                hasSegments: !!result.segments,
                segmentsCount: result.segments?.length || 0
            });
            
            // Ensure the event data includes the text for auto-insertion
            this.eventManager.emit('transcription:complete', { 
                result,
                text: result.text  // Explicitly include text for event handlers
            });

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