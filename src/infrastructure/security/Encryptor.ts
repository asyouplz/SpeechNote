/**
 * 암호화 유틸리티
 * Web Crypto API를 사용한 안전한 데이터 암호화/복호화
 */

import { type App, Notice } from 'obsidian';

export interface EncryptedData {
    data: string; // Base64 encoded encrypted data
    iv: string; // Base64 encoded initialization vector
    salt: string; // Base64 encoded salt
}

export interface IEncryptor {
    encrypt(plainText: string): Promise<EncryptedData>;
    decrypt(encryptedData: EncryptedData): Promise<string>;
}

/**
 * AES-GCM 암호화 구현
 */
export class Encryptor implements IEncryptor {
    private readonly algorithm = 'AES-GCM';
    private readonly keyLength = 256;
    private readonly iterations = 100000;
    private readonly saltLength = 16;
    private readonly ivLength = 12;
    private vaultSalt: string | null = null;
    private app: App | null = null;

    /**
     * Set the App instance for vault-specific salt generation
     */
    setApp(app: App): void {
        this.app = app;
        this.initializeVaultSalt();
    }

    /**
     * Initialize or load the per-vault unique salt
     */
    private initializeVaultSalt(): void {
        if (!this.app) return;

        const storedSalt = this.app.loadLocalStorage('encryption_vault_salt') as string | null;
        if (storedSalt) {
            this.vaultSalt = storedSalt;
        } else {
            // Generate a unique salt for this vault
            const randomBytes = crypto.getRandomValues(new Uint8Array(32));
            this.vaultSalt = Array.from(randomBytes)
                .map((b) => b.toString(16).padStart(2, '0'))
                .join('');
            this.app.saveLocalStorage('encryption_vault_salt', this.vaultSalt);
        }
    }

    /**
     * 시스템 파생 키 생성
     * 사용자별 고유 식별자와 앱 시드를 조합
     */
    private async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
        // 패스워드에서 키 재료 생성
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(password),
            { name: 'PBKDF2' },
            false,
            ['deriveKey']
        );

        // PBKDF2를 사용한 키 유도
        return crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt.buffer as ArrayBuffer,
                iterations: this.iterations,
                hash: 'SHA-256',
            },
            keyMaterial,
            {
                name: this.algorithm,
                length: this.keyLength,
            },
            false,
            ['encrypt', 'decrypt']
        );
    }

    /**
     * 시스템 패스워드 생성
     * 여러 요소를 조합하여 고유한 암호화 키 생성
     */
    private getSystemPassword(): string {
        // Use per-vault unique salt for security
        // Each vault has its own unique encryption key
        // SECURITY NOTE: This is defense-in-depth, not primary security.
        // The encryption protects API keys from casual access but is not
        // intended to protect against determined attackers with localStorage access.
        if (this.vaultSalt) {
            return `ObsidianSpeechToText-${this.vaultSalt}`;
        }
        // Do not use a weak fallback - force initialization
        throw new Error('Vault salt not initialized. Call setApp() first.');
    }

    /**
     * 텍스트 암호화
     */
    async encrypt(plainText: string): Promise<EncryptedData> {
        try {
            // 랜덤 salt와 IV 생성
            const salt = crypto.getRandomValues(new Uint8Array(this.saltLength));
            const iv = crypto.getRandomValues(new Uint8Array(this.ivLength));

            // 키 유도
            const key = await this.deriveKey(this.getSystemPassword(), salt);

            // 데이터 암호화
            const encodedText = new TextEncoder().encode(plainText);
            const encryptedBuffer = await crypto.subtle.encrypt(
                {
                    name: this.algorithm,
                    iv: iv.buffer as ArrayBuffer,
                },
                key,
                encodedText.buffer as ArrayBuffer
            );

            // Base64 인코딩
            return {
                data: this.bufferToBase64(encryptedBuffer),
                iv: this.bufferToBase64(iv),
                salt: this.bufferToBase64(salt),
            };
        } catch (error) {
            console.error('Encryption failed:', error);
            throw new Error('Failed to encrypt data');
        }
    }

    /**
     * 텍스트 복호화
     */
    async decrypt(encryptedData: EncryptedData): Promise<string> {
        try {
            // Base64 디코딩
            const encryptedBuffer = this.base64ToBuffer(encryptedData.data);
            const iv = this.base64ToBuffer(encryptedData.iv);
            const salt = this.base64ToBuffer(encryptedData.salt);

            // 키 유도
            const key = await this.deriveKey(this.getSystemPassword(), salt);

            // 데이터 복호화
            const decryptedBuffer = await crypto.subtle.decrypt(
                {
                    name: this.algorithm,
                    iv: iv.buffer as ArrayBuffer,
                },
                key,
                encryptedBuffer.buffer as ArrayBuffer
            );

            // 텍스트 디코딩
            return new TextDecoder().decode(decryptedBuffer);
        } catch (error) {
            console.error('Decryption failed:', error);
            throw new Error('Failed to decrypt data');
        }
    }

    /**
     * ArrayBuffer를 Base64로 변환
     */
    private bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
        const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer;

        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    /**
     * Base64를 Uint8Array로 변환
     */
    private base64ToBuffer(base64: string): Uint8Array {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);

        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }

        return bytes;
    }
}

/**
 * EncryptedData 타입 가드
 */
export function isEncryptedData(data: unknown): data is EncryptedData {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    return typeof d.data === 'string' && typeof d.iv === 'string' && typeof d.salt === 'string';
}

/**
 * 보안 API 키 관리자
 *
 * Manages encrypted storage and retrieval of API keys using the Obsidian localStorage API.
 *
 * @example Default usage with built-in Encryptor:
 * ```typescript
 * const manager = new SecureApiKeyManager(undefined, app);
 * await manager.storeApiKey('sk-...');
 * ```
 *
 * @example Custom encryptor usage:
 * ```typescript
 * // Custom encryptor must implement IEncryptor interface
 * // and handle its own initialization (e.g., key derivation)
 * const customEncryptor = new MyCustomEncryptor();
 * const manager = new SecureApiKeyManager(customEncryptor, app);
 * ```
 *
 * @note When using a custom encryptor, ensure it handles initialization properly.
 * The built-in Encryptor requires setApp() to be called for per-vault salt generation,
 * which is done automatically. Custom implementations must handle this independently.
 */
export class SecureApiKeyManager {
    private encryptor: IEncryptor;
    private storageKey = 'encrypted_api_key';
    private app: App;

    /**
     * Creates a new SecureApiKeyManager instance.
     *
     * @param encryptor - Optional custom encryptor implementing IEncryptor interface.
     *                    If not provided, uses the built-in Encryptor with per-vault salt.
     *                    Note: Custom encryptors must handle their own key derivation/initialization.
     * @param app - Required Obsidian App instance for localStorage access.
     * @throws Error if app is not provided.
     */
    constructor(encryptor?: IEncryptor, app?: App) {
        this.encryptor = encryptor || new Encryptor();
        if (!app) {
            throw new Error('App instance is required for SecureApiKeyManager');
        }
        this.app = app;
        // Initialize encryptor with app for per-vault salt
        // Note: Custom encryptors that don't extend Encryptor must handle initialization independently
        if (this.encryptor instanceof Encryptor) {
            this.encryptor.setApp(app);
        }
    }

    /**
     * API 키 암호화 저장
     */
    async storeApiKey(apiKey: string): Promise<void> {
        // 유효성 검증
        if (!this.validateApiKeyFormat(apiKey)) {
            throw new Error('Invalid API key format');
        }

        try {
            // 암호화
            const encrypted = await this.encryptor.encrypt(apiKey);

            // Obsidian API를 통해 저장
            this.app.saveLocalStorage(this.storageKey, JSON.stringify(encrypted));

            // 메모리에서 원본 제거 (가비지 컬렉션 대상)
            apiKey = '';
        } catch (error) {
            console.error('Failed to store API key:', error);
            throw new Error('Failed to store API key securely');
        }
    }

    /**
     * API 키 복호화 조회
     */
    async getApiKey(): Promise<string | null> {
        const MAX_RETRIES = 2;
        let lastError: Error | null = null;

        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
                const storedData = this.app.loadLocalStorage(this.storageKey) as string | null;
                if (!storedData) {
                    return null;
                }

                const encrypted: EncryptedData = JSON.parse(storedData) as EncryptedData;

                try {
                    return await this.encryptor.decrypt(encrypted);
                } catch (decryptionError) {
                    console.error('Decryption failed:', decryptionError);
                    throw decryptionError;
                }
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                console.warn(`API key retrieval attempt ${attempt + 1} failed:`, error);
                // Wait before retry
                if (attempt < MAX_RETRIES - 1) {
                    await new Promise((resolve) => setTimeout(resolve, 100));
                }
            }
        }

        // All retries failed - backup then clear
        console.error('Failed to retrieve API key after retries:', lastError);

        // Backup corrupted data for potential recovery
        const corruptedData = this.app.loadLocalStorage(this.storageKey) as string | null;
        if (corruptedData) {
            const backupKey = `${this.storageKey}_backup_${Date.now()}`;
            this.app.saveLocalStorage(backupKey, corruptedData);
            console.debug(`Backed up corrupted API key data to: ${backupKey}`);
        }

        new Notice('API key data is corrupted. Please re-enter your API key. Backup saved.', 10000);
        this.clearApiKey();
        return null;
    }

    /**
     * API 키 존재 여부 확인
     */
    hasApiKey(): boolean {
        return (this.app.loadLocalStorage(this.storageKey) as string | null) !== null;
    }

    /**
     * API 키 제거
     */
    clearApiKey(): void {
        this.app.saveLocalStorage(this.storageKey, null);
    }

    /**
     * API 키 형식 검증
     */
    private validateApiKeyFormat(apiKey: string): boolean {
        // OpenAI API 키 형식 검증
        if (apiKey.startsWith('sk-')) {
            return apiKey.length > 20; // 최소 길이 검증
        }

        // Azure 또는 커스텀 키 형식
        return apiKey.length >= 32;
    }

    /**
     * API 키 마스킹
     */
    static maskApiKey(apiKey: string): string {
        if (!apiKey || apiKey.length < 10) {
            return '***';
        }

        const visibleStart = apiKey.startsWith('sk-') ? 7 : 4;
        const visibleEnd = 4;
        const totalVisible = visibleStart + visibleEnd;

        if (apiKey.length <= totalVisible) {
            return apiKey.substring(0, 3) + '*'.repeat(apiKey.length - 3);
        }

        const masked = '*'.repeat(apiKey.length - totalVisible);
        return (
            apiKey.substring(0, visibleStart) +
            masked +
            apiKey.substring(apiKey.length - visibleEnd)
        );
    }
}

/**
 * 설정 데이터 암호화 관리자
 */
export class SettingsEncryptor {
    private encryptor: IEncryptor;

    constructor(encryptor?: IEncryptor) {
        this.encryptor = encryptor || new Encryptor();
    }

    /**
     * 민감한 설정 암호화
     */
    async encryptSensitiveSettings(
        settings: Record<string, unknown>
    ): Promise<Record<string, unknown>> {
        const sensitiveFields = ['apiKey', 'tokens', 'credentials'];
        const encryptedSettings: Record<string, any> = { ...settings };

        for (const field of sensitiveFields) {
            if (settings[field]) {
                encryptedSettings[field] = await this.encryptor.encrypt(
                    JSON.stringify(settings[field])
                );
            }
        }

        return encryptedSettings;
    }

    /**
     * 민감한 설정 복호화
     */
    async decryptSensitiveSettings(
        encryptedSettings: Record<string, unknown>
    ): Promise<Record<string, unknown>> {
        const settings: Record<string, any> = { ...encryptedSettings };
        const sensitiveFields = ['apiKey', 'tokens', 'credentials'];

        for (const field of sensitiveFields) {
            const fieldValue = encryptedSettings[field];
            if (fieldValue && typeof fieldValue === 'object' && isEncryptedData(fieldValue)) {
                try {
                    const decrypted = await this.encryptor.decrypt(fieldValue);
                    settings[field] = JSON.parse(decrypted);
                } catch (error) {
                    console.error(`Failed to decrypt ${field}:`, error);
                    delete settings[field];
                }
            }
        }

        return settings;
    }
}
