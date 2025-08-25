import type { ILogger } from '../../types';

export class Logger implements ILogger {
    constructor(private prefix: string) {}

    debug(message: string, context?: any): void {
        console.log(`[${this.prefix}] DEBUG:`, message, context || '');
    }

    info(message: string, context?: any): void {
        console.info(`[${this.prefix}] INFO:`, message, context || '');
    }

    warn(message: string, context?: any): void {
        console.warn(`[${this.prefix}] WARN:`, message, context || '');
    }

    error(message: string, error?: Error, context?: any): void {
        console.error(`[${this.prefix}] ERROR:`, message, error, context || '');
    }
}