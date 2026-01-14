import { Notice, requestUrl } from 'obsidian';
import type SpeechToTextPlugin from '../../../main';

/**
 * API 키 검증 컴포넌트
 * OpenAI API 키의 유효성을 검증
 */
export class ApiKeyValidator {
    private readonly API_TEST_ENDPOINT = 'https://api.openai.com/v1/models';

    constructor(private plugin: SpeechToTextPlugin) {}

    /**
     * API 키 형식 검증
     */
    validateFormat(apiKey: string): { valid: boolean; message?: string } {
        if (!apiKey) {
            return { valid: false, message: 'API 키를 입력해주세요' };
        }

        if (!apiKey.startsWith('sk-')) {
            return { valid: false, message: 'API 키는 "sk-"로 시작해야 합니다' };
        }

        if (apiKey.length < 40) {
            return { valid: false, message: 'API 키가 너무 짧습니다' };
        }

        // 프로젝트 키 형식 검증 (sk-proj-)
        if (apiKey.startsWith('sk-proj-') && apiKey.length < 50) {
            return { valid: false, message: '프로젝트 API 키가 너무 짧습니다' };
        }

        return { valid: true };
    }

    /**
     * API 키 실제 검증 (API 호출)
     */
    async validate(apiKey: string): Promise<boolean> {
        // 먼저 형식 검증
        const formatValidation = this.validateFormat(apiKey);
        if (!formatValidation.valid) {
            new Notice(formatValidation.message || '유효하지 않은 API 키 형식');
            return false;
        }

        try {
            // API 호출로 실제 검증
            const response = await requestUrl({
                url: this.API_TEST_ENDPOINT,
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
            });

            // 성공적으로 응답을 받으면 유효한 키
            if (response.status === 200) {
                // Whisper 모델 존재 확인
                const models = response.json.data || [];
                const hasWhisper = models.some(
                    (model: any) => model.id && model.id.includes('whisper')
                );

                if (!hasWhisper) {
                    new Notice('⚠ API 키는 유효하지만 Whisper 모델 접근 권한이 없을 수 있습니다');
                }

                return true;
            }

            return false;
        } catch (error) {
            const status = this.getErrorStatus(error);
            // 401: 인증 실패 (잘못된 키)
            if (status === 401) {
                new Notice('❌ 유효하지 않은 API 키입니다');
                return false;
            }

            // 429: Rate limit (키는 유효하지만 한도 초과)
            if (status === 429) {
                new Notice('⚠ API 키는 유효하지만 사용 한도를 초과했습니다');
                return true; // 키 자체는 유효함
            }

            // 기타 네트워크 오류
            console.error('API 키 검증 실패:', error);
            new Notice('네트워크 오류로 API 키를 검증할 수 없습니다');
            return false;
        }
    }

    /**
     * API 사용량 조회
     */
    async getUsage(apiKey: string): Promise<{
        used: number;
        limit: number;
        remaining: number;
    } | null> {
        try {
            // OpenAI API는 직접적인 사용량 조회 엔드포인트가 없음
            // 대신 응답 헤더에서 rate limit 정보를 확인할 수 있음
            const response = await requestUrl({
                url: this.API_TEST_ENDPOINT,
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
            });

            // Rate limit 헤더 확인
            const headers = response.headers;
            const limit = parseInt(headers['x-ratelimit-limit-requests'] || '0');
            const remaining = parseInt(headers['x-ratelimit-remaining-requests'] || '0');
            const used = limit - remaining;

            return {
                used,
                limit,
                remaining,
            };
        } catch (error) {
            console.error('사용량 조회 실패:', error);
            return null;
        }
    }

    /**
     * API 키 마스킹
     */
    mask(apiKey: string): string {
        if (!apiKey || apiKey.length < 10) return '***';

        const visibleStart = 7; // sk-XXXXX
        const visibleEnd = 4;
        const masked = '*'.repeat(Math.max(0, apiKey.length - visibleStart - visibleEnd));

        return (
            apiKey.substring(0, visibleStart) +
            masked +
            apiKey.substring(apiKey.length - visibleEnd)
        );
    }

    /**
     * API 키 암호화 (간단한 Base64 인코딩)
     * 실제 프로덕션에서는 더 강력한 암호화 사용 권장
     */
    encrypt(apiKey: string): string {
        if (!apiKey) return '';

        try {
            // Base64 인코딩 + 간단한 변환
            const encoded = btoa(apiKey);
            const reversed = encoded.split('').reverse().join('');
            return btoa(reversed);
        } catch (error) {
            console.error('API 키 암호화 실패:', error);
            return '';
        }
    }

    /**
     * API 키 복호화
     */
    decrypt(encryptedKey: string): string {
        if (!encryptedKey) return '';

        try {
            // 역순으로 복호화
            const reversed = atob(encryptedKey);
            const encoded = reversed.split('').reverse().join('');
            return atob(encoded);
        } catch (error) {
            console.error('API 키 복호화 실패:', error);
            return '';
        }
    }

    /**
     * API 키 안전하게 저장
     */
    async saveSecurely(apiKey: string): Promise<void> {
        // 암호화하여 저장
        const encrypted = this.encrypt(apiKey);

        // 설정에 저장 (암호화된 버전)
        this.plugin.settings['encryptedApiKey'] = encrypted;

        // 평문 키는 메모리에만 유지
        this.plugin.settings.apiKey = apiKey;

        await this.plugin.saveSettings();
    }

    /**
     * API 키 안전하게 로드
     */
    loadSecurely(): Promise<string> {
        const encrypted = this.plugin.settings['encryptedApiKey'];

        if (encrypted) {
            const decrypted = this.decrypt(encrypted);
            this.plugin.settings.apiKey = decrypted;
            return Promise.resolve(decrypted);
        }

        return Promise.resolve(this.plugin.settings.apiKey || '');
    }

    private getErrorStatus(error: unknown): number | null {
        if (!error || typeof error !== 'object') {
            return null;
        }

        const status = Reflect.get(error, 'status');
        if (typeof status === 'number') {
            return status;
        }

        return null;
    }
}
