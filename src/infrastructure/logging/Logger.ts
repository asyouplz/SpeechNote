import type { ILogger } from '../../types';

export { ILogger };

export class Logger implements ILogger {
    constructor(private prefix: string) { }

    debug(message: string, context?: unknown): void {
        if (process.env.NODE_ENV === 'development') {
            console.debug(`[${this.prefix}] DEBUG:`, message, context || '');
        }
    }

    info(message: string, context?: unknown): void {
        console.debug(`[${this.prefix}] INFO:`, message, context || '');
    }

    warn(message: string, context?: unknown): void {
        console.warn(`[${this.prefix}] WARN:`, message, context || '');
    }

    error(message: string, error?: Error, context?: unknown): void {
        console.error(`[${this.prefix}] ERROR:`, message, error, context || '');
    }
}
