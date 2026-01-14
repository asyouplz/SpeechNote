import type { ITextFormatter, FormatOptions, TranscriptionSegment } from '../../types';
import type { SpeechToTextSettings } from '../../domain/models/Settings';

export class TextFormatter implements ITextFormatter {
    constructor(private settings: SpeechToTextSettings) {}

    format(text: string, options?: FormatOptions): string {
        const shouldClean = options?.cleanupText !== false;
        const formattedText = shouldClean ? this.cleanUp(text) : text;

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
        const normalized = text.replace(/\r\n/g, '\n').trim();
        if (!normalized) {
            return '';
        }

        const condensed = normalized.replace(/\n{3,}/g, '\n\n');
        const rawLines = condensed.split('\n');
        const sentences: string[] = [];
        let currentSentence = '';

        const finalizeSentence = () => {
            const trimmed = currentSentence.trim();
            if (trimmed) {
                sentences.push(trimmed);
            }
            currentSentence = '';
        };

        for (const rawLine of rawLines) {
            const trimmedLine = rawLine.trim();

            if (!trimmedLine) {
                finalizeSentence();
                continue;
            }

            const normalizedLine = trimmedLine.replace(/\s+/g, ' ');
            currentSentence = currentSentence
                ? `${currentSentence} ${normalizedLine}`
                : normalizedLine;

            if (/[.!?]["']?$/.test(normalizedLine)) {
                finalizeSentence();
            }
        }

        finalizeSentence();

        const formatted = sentences.join('\n\n');
        const hasEmphasisPunctuation = sentences.some((sentence) => /[!?]/.test(sentence));
        const needsTrailingBreak =
            hasEmphasisPunctuation &&
            sentences.length > 1 &&
            /[.!?]["']?$/.test(sentences[sentences.length - 1] ?? '');
        return needsTrailingBreak ? `${formatted}\n\n` : formatted;
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
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
}
