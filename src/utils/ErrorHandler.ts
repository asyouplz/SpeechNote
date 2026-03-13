import { Notice } from 'obsidian';
import type { ILogger } from '../types';

export class ErrorHandler {
    constructor(private logger: ILogger) {}

    getUserFriendlyMessage(error: Error): string {
        const codeMessageMap: Record<string, string> = {
            ECONNREFUSED: 'Could not connect to the server.',
            ETIMEDOUT: 'The connection timed out.',
            ENOTFOUND: 'The server could not be found.',
            EPERM: 'Permission denied.',
            ENOSPC: 'Not enough storage space is available.',
        };

        for (const [code, message] of Object.entries(codeMessageMap)) {
            if (error.message.includes(code)) {
                return message;
            }
        }

        return this.getUserMessage(error);
    }

    getSolution(code: string): string {
        const solutions: Record<string, string> = {
            INVALID_API_KEY: 'Enter a valid API key in settings.',
            NETWORK_ERROR: 'Check your network connection and try again.',
            TIMEOUT: 'Try again later or increase the timeout value.',
            FILE_TOO_LARGE: 'Reduce the file size or choose a different file.',
            UNSUPPORTED_FORMAT: 'Use a supported audio format.',
        };

        return solutions[code] ?? 'Check the problem and try again.';
    }

    handle(error: unknown, context?: Record<string, unknown>): void {
        const errorObj = error instanceof Error ? error : new Error(String(error));

        // Log the error
        this.logger.error(errorObj.message, errorObj, context);

        // Show user-friendly notification
        const userMessage = this.getUserFriendlyMessage(errorObj);
        new Notice(userMessage, 5000);
    }

    private getUserMessage(error: Error): string {
        // Map technical errors to user-friendly messages
        if (error.message.includes('API key')) {
            return 'Invalid API key. Please check your settings.';
        }
        if (error.message.includes('network') || error.message.includes('fetch')) {
            return 'Network error. Please check your connection.';
        }
        if (error.message.includes('size')) {
            return 'File is too large. Maximum size is 25MB.';
        }
        if (error.message.includes('format')) {
            return 'Unsupported file format. Please use M4A, MP3, WAV, or MP4.';
        }

        // Default message
        return `An error occurred: ${error.message}`;
    }
}
