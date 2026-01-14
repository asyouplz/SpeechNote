import { Notice } from 'obsidian';
import type { ILogger } from '../types';

export class ErrorHandler {
    constructor(private logger: ILogger) {}

    getUserFriendlyMessage(error: Error): string {
        const codeMessageMap: Record<string, string> = {
            ECONNREFUSED: '서버에 연결할 수 없습니다.',
            ETIMEDOUT: '연결 시간이 초과되었습니다.',
            ENOTFOUND: '서버를 찾을 수 없습니다.',
            EPERM: '권한이 없습니다.',
            ENOSPC: '저장 공간이 부족합니다.'
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
            INVALID_API_KEY: '설정에서 올바른 API 키를 입력해주세요.',
            NETWORK_ERROR: '네트워크 연결을 확인한 뒤 다시 시도해주세요.',
            TIMEOUT: '잠시 후 다시 시도하거나 타임아웃 값을 늘려주세요.',
            FILE_TOO_LARGE: '파일 크기를 줄이거나 다른 파일을 선택해주세요.',
            UNSUPPORTED_FORMAT: '지원되는 오디오 형식을 사용해주세요.'
        };

        return solutions[code] ?? '문제를 확인하고 다시 시도해주세요.';
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
