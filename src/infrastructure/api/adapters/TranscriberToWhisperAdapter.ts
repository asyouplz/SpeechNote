import type { IWhisperService, WhisperOptions, WhisperResponse, ILogger } from '../../../types';
import type { ITranscriber, TranscriptionOptions } from '../providers/ITranscriber';

/**
 * Adapter to make ITranscriber compatible with IWhisperService interface
 * This allows TranscriptionService to work with any transcription provider
 */
export class TranscriberToWhisperAdapter implements IWhisperService {
    constructor(
        private transcriber: ITranscriber,
        private logger?: ILogger
    ) {}

    async transcribe(audio: ArrayBuffer, options?: WhisperOptions): Promise<WhisperResponse> {
        this.logger?.debug('=== TranscriberToWhisperAdapter.transcribe START ===', {
            audioSize: audio.byteLength,
            provider: this.transcriber.getProviderName(),
            options
        });
        
        // Convert WhisperOptions to TranscriptionOptions
        const transcriptionOptions: TranscriptionOptions = {
            language: options?.language,
            model: options?.model,
            whisper: {
                temperature: options?.temperature,
                prompt: options?.prompt,
                responseFormat: options?.responseFormat
            }
        };

        // Call the underlying transcriber
        const response = await this.transcriber.transcribe(audio, transcriptionOptions);
        
        this.logger?.debug('Transcriber response received:', {
            hasText: !!response?.text,
            textLength: response?.text?.length || 0,
            textPreview: response?.text?.substring(0, 100),
            language: response?.language,
            segmentsCount: response?.segments?.length || 0
        });

        // Convert TranscriptionResponse to WhisperResponse
        const whisperResponse: WhisperResponse = {
            text: response.text || '',
            language: response.language,
            duration: response.duration,
            segments: response.segments?.map(segment => ({
                id: segment.id,
                seek: 0, // Not available in generic response
                start: segment.start,
                end: segment.end,
                text: segment.text,
                tokens: [], // Not available in generic response
                temperature: 0,
                avg_logprob: 0,
                compression_ratio: 0,
                no_speech_prob: 0
            }))
        };
        
        this.logger?.info('=== TranscriberToWhisperAdapter.transcribe COMPLETE ===', {
            textLength: whisperResponse.text?.length || 0,
            language: whisperResponse.language
        });
        
        return whisperResponse;
    }

    async validateApiKey(key: string): Promise<boolean> {
        return this.transcriber.validateApiKey(key);
    }

    cancel(): void {
        this.transcriber.cancel();
    }

    /**
     * Get the underlying transcriber for advanced operations
     */
    getTranscriber(): ITranscriber {
        return this.transcriber;
    }

    /**
     * Get provider name for logging/debugging
     */
    getProviderName(): string {
        return this.transcriber.getProviderName();
    }
}