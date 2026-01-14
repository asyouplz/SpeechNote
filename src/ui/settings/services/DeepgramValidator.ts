/**
 * Deepgram API 검증 서비스
 * API 키 및 설정 검증 로직 분리
 */

import { requestUrl, RequestUrlParam } from 'obsidian';
import { API_CONSTANTS, CONFIG_CONSTANTS } from '../../../config/DeepgramConstants';
import { DeepgramLogger } from '../helpers/DeepgramLogger';

export class DeepgramValidator {
    private logger: DeepgramLogger;

    constructor() {
        this.logger = DeepgramLogger.getInstance();
    }

    /**
     * API 키 검증
     */
    public async validateApiKey(apiKey: string): Promise<boolean> {
        if (!apiKey) {
            this.logger.warn('API key validation failed: No key provided');
            return false;
        }

        try {
            this.logger.info('Validating API key via Obsidian requestUrl...');

            const method: RequestUrlParam['method'] = API_CONSTANTS.METHODS.GET;
            const req: RequestUrlParam = {
                url: API_CONSTANTS.ENDPOINTS.VALIDATION,
                method,
                headers: {
                    Authorization: `${API_CONSTANTS.HEADERS.AUTHORIZATION_PREFIX} ${apiKey}`,
                    'Content-Type': API_CONSTANTS.HEADERS.CONTENT_TYPE,
                },
                throw: false,
            };

            const res = await requestUrl(req);
            const isValid = res.status === 200;

            if (isValid) {
                this.logger.info('API key validation successful');
            } else {
                this.logger.warn(`API key validation failed with status: ${res.status}`);
            }

            return isValid;
        } catch (error) {
            this.logger.error('API validation error (requestUrl)', error);
            return false;
        }
    }

    /**
     * API 키 마스킹
     */
    public maskApiKey(key: string): string {
        if (!key || key.length < 10) {
            return '';
        }

        const { VISIBLE_START, VISIBLE_END, CHAR } = API_CONSTANTS.MASK;

        if (key.length <= VISIBLE_START + VISIBLE_END) {
            return key;
        }

        const masked = CHAR.repeat(key.length - VISIBLE_START - VISIBLE_END);
        return key.substring(0, VISIBLE_START) + masked + key.substring(key.length - VISIBLE_END);
    }

    /**
     * 타임아웃 값 검증
     */
    public validateTimeout(value: string): number | null {
        const timeout = parseInt(value) * 1000;
        const { MIN, MAX } = API_CONSTANTS.TIMEOUT;

        if (isNaN(timeout) || timeout < MIN || timeout > MAX) {
            this.logger.warn(`Invalid timeout value: ${value}`);
            return null;
        }

        return timeout;
    }

    /**
     * 재시도 횟수 검증
     */
    public validateRetries(value: string): number | null {
        const retries = parseInt(value);
        const { MIN, MAX } = CONFIG_CONSTANTS.RETRIES;

        if (isNaN(retries) || retries < MIN || retries > MAX) {
            this.logger.warn(`Invalid retries value: ${value}`);
            return null;
        }

        return retries;
    }
}
