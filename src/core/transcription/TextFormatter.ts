import type {
    ITextFormatter,
    FormatOptions,
    TranscriptionSegment,
} from '../../types';
import type { SpeechToTextSettings } from '../../domain/models/Settings';

export class TextFormatter implements ITextFormatter {
    constructor(private settings: SpeechToTextSettings) {}

    format(text: string, options?: FormatOptions): string {
        let formattedText = this.cleanUp(text);

        // Apply formatting based on settings
        if (this.settings.timestampFormat !== 'none' && options?.includeTimestamps) {
            // Timestamp formatting would be applied here if segments are available
        }

        return formattedText;
    }

    insertTimestamps(text: string, segments: TranscriptionSegment[]): string {
        if (!segments || segments.length === 0) {
            return text;
        }

        const lines = text.split('\n');
        const result: string[] = [];

        segments.forEach((segment) => {
            const timestamp = this.formatTimestamp(segment.start);
            
            switch (this.settings.timestampFormat) {
                case 'inline':
                    result.push(`[${timestamp}] ${segment.text}`);
                    break;
                case 'sidebar':
                    result.push(`${timestamp} | ${segment.text}`);
                    break;
                default:
                    result.push(segment.text);
            }
        });

        return result.join('\n');
    }

    cleanUp(text: string): string {
        // Clean up common transcription issues + light Korean post-processing
        let out = text.trim();

        // Light Korean spacing around alphanumerics
        const hasHangul = /[\uAC00-\uD7A3]/.test(out);
        if (hasHangul) {
            // Insert spaces between Hangul and ASCII letters/digits boundaries
            out = out
                .replace(/([\uAC00-\uD7A3])([A-Za-z0-9])/g, '$1 $2')
                .replace(/([A-Za-z0-9])([\uAC00-\uD7A3])/g, '$1 $2')
                // Ensure a space after sentence punctuation if followed by Hangul/ASCII
                .replace(/([.!?])(\S)/g, '$1 $2');
        }

        out = out
            .replace(/\s+/g, ' ')
            .replace(/\n{3,}/g, '\n\n')
            .replace(/([.!?])\s*\n/g, '$1\n\n');

        return out;
    }

    private formatTimestamp(seconds: number): string {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hours > 0) {
            return `${hours.toString().padStart(2, '0')}:${minutes
                .toString()
                .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes.toString().padStart(2, '0')}:${secs
            .toString()
            .padStart(2, '0')}`;
    }
}
