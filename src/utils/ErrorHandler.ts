import { Notice } from 'obsidian';
import type { ILogger } from '../types';

export class ErrorHandler {
    constructor(private logger: ILogger) {}

    handle(error: unknown, context?: any): void {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        
        // Log the error
        this.logger.error(errorObj.message, errorObj, context);

        // Show user-friendly notification
        const userMessage = this.getUserMessage(errorObj);
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