# Phase 2 핵심 기능 구현 가이드

## 목차
1. [파일 처리 패턴 가이드](#1-파일-처리-패턴-가이드)
2. [API 통합 패턴 및 예제 코드](#2-api-통합-패턴-및-예제-코드)
3. [오류 처리 전략](#3-오류-처리-전략)
4. [코드 리뷰 체크리스트](#4-코드-리뷰-체크리스트)

---

## 1. 파일 처리 패턴 가이드

### 1.1 옵시디언 Vault 내 파일 접근 방법

#### 파일 시스템 접근 패턴
```typescript
import { TFile, Vault, App, TAbstractFile } from 'obsidian';

export class VaultFileManager {
    constructor(
        private app: App,
        private vault: Vault
    ) {}

    /**
     * Vault 내 오디오 파일 목록 가져오기
     */
    async getAudioFiles(): Promise<TFile[]> {
        const supportedExtensions = ['m4a', 'mp3', 'wav', 'mp4'];
        
        return this.vault.getFiles().filter(file => {
            const extension = file.extension.toLowerCase();
            return supportedExtensions.includes(extension);
        });
    }

    /**
     * 특정 경로의 파일 가져오기
     */
    async getFileByPath(path: string): Promise<TFile | null> {
        const file = this.vault.getAbstractFileByPath(path);
        
        if (!file || !(file instanceof TFile)) {
            return null;
        }
        
        return file;
    }

    /**
     * 파일의 바이너리 데이터 읽기
     */
    async readBinaryFile(file: TFile): Promise<ArrayBuffer> {
        try {
            return await this.vault.readBinary(file);
        } catch (error) {
            throw new Error(`Failed to read file ${file.path}: ${error.message}`);
        }
    }

    /**
     * 파일의 메타데이터 가져오기
     */
    getFileMetadata(file: TFile): FileMetadata {
        return {
            path: file.path,
            name: file.name,
            extension: file.extension,
            size: file.stat.size,
            created: new Date(file.stat.ctime),
            modified: new Date(file.stat.mtime)
        };
    }
}

interface FileMetadata {
    path: string;
    name: string;
    extension: string;
    size: number;
    created: Date;
    modified: Date;
}
```

#### 파일 선택 모달 구현
```typescript
import { App, Modal, TFile, Setting } from 'obsidian';

export class AudioFilePickerModal extends Modal {
    private selectedFile: TFile | null = null;
    private onChoose: (file: TFile) => void;
    private onCancel: () => void;

    constructor(
        app: App,
        audioFiles: TFile[],
        onChoose: (file: TFile) => void,
        onCancel: () => void
    ) {
        super(app);
        this.onChoose = onChoose;
        this.onCancel = onCancel;
        this.modalEl.addClass('audio-file-picker-modal');
    }

    onOpen() {
        const { contentEl } = this;
        
        contentEl.createEl('h2', { text: 'Select Audio File' });
        
        // 파일 목록 표시
        const fileList = contentEl.createDiv('file-list');
        
        this.app.vault.getFiles()
            .filter(file => this.isAudioFile(file))
            .forEach(file => {
                const fileItem = fileList.createDiv('file-item');
                fileItem.setText(`${file.path} (${this.formatFileSize(file.stat.size)})`);
                fileItem.onclick = () => {
                    this.selectedFile = file;
                    this.onChoose(file);
                    this.close();
                };
            });

        // 버튼 영역
        const buttonContainer = contentEl.createDiv('button-container');
        
        new Setting(buttonContainer)
            .addButton(btn => btn
                .setButtonText('Cancel')
                .onClick(() => {
                    this.onCancel();
                    this.close();
                }));
    }

    private isAudioFile(file: TFile): boolean {
        const audioExtensions = ['m4a', 'mp3', 'wav', 'mp4'];
        return audioExtensions.includes(file.extension.toLowerCase());
    }

    private formatFileSize(bytes: number): string {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
```

### 1.2 M4A 파일 처리 및 검증 로직

#### 고급 파일 검증 시스템
```typescript
export class AudioFileValidator {
    private readonly MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
    private readonly MIN_FILE_SIZE = 100; // 100 bytes
    private readonly SUPPORTED_FORMATS = {
        'm4a': { mimeTypes: ['audio/mp4', 'audio/x-m4a'], magicBytes: [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70] },
        'mp3': { mimeTypes: ['audio/mpeg'], magicBytes: [0xFF, 0xFB] },
        'wav': { mimeTypes: ['audio/wav'], magicBytes: [0x52, 0x49, 0x46, 0x46] },
        'mp4': { mimeTypes: ['video/mp4', 'audio/mp4'], magicBytes: [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70] }
    };

    /**
     * 종합적인 파일 검증
     */
    async validateAudioFile(file: TFile, buffer?: ArrayBuffer): Promise<ValidationResult> {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];

        // 1. 확장자 검증
        const extensionValid = this.validateExtension(file);
        if (!extensionValid.valid) {
            errors.push({
                code: 'INVALID_EXTENSION',
                message: extensionValid.error!,
                field: 'extension'
            });
        }

        // 2. 파일 크기 검증
        const sizeValid = this.validateFileSize(file.stat.size);
        if (!sizeValid.valid) {
            errors.push({
                code: 'INVALID_SIZE',
                message: sizeValid.error!,
                field: 'size'
            });
        } else if (sizeValid.warning) {
            warnings.push({
                code: 'LARGE_FILE',
                message: sizeValid.warning
            });
        }

        // 3. 매직 바이트 검증 (버퍼가 제공된 경우)
        if (buffer) {
            const magicValid = this.validateMagicBytes(file.extension, buffer);
            if (!magicValid.valid) {
                errors.push({
                    code: 'INVALID_FORMAT',
                    message: magicValid.error!,
                    field: 'format'
                });
            }
        }

        // 4. 파일명 검증
        const nameValid = this.validateFileName(file.name);
        if (!nameValid.valid) {
            warnings.push({
                code: 'PROBLEMATIC_NAME',
                message: nameValid.error!
            });
        }

        return {
            valid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined,
            warnings: warnings.length > 0 ? warnings : undefined,
            metadata: {
                extension: file.extension,
                size: file.stat.size,
                sizeFormatted: this.formatFileSize(file.stat.size),
                path: file.path
            }
        };
    }

    /**
     * 확장자 검증
     */
    private validateExtension(file: TFile): { valid: boolean; error?: string } {
        const extension = file.extension.toLowerCase();
        
        if (!Object.keys(this.SUPPORTED_FORMATS).includes(extension)) {
            return {
                valid: false,
                error: `Unsupported format: .${extension}. Supported: ${Object.keys(this.SUPPORTED_FORMATS).map(ext => `.${ext}`).join(', ')}`
            };
        }
        
        return { valid: true };
    }

    /**
     * 파일 크기 검증
     */
    private validateFileSize(size: number): { valid: boolean; error?: string; warning?: string } {
        if (size < this.MIN_FILE_SIZE) {
            return {
                valid: false,
                error: `File is too small (${size} bytes). Minimum size is ${this.MIN_FILE_SIZE} bytes.`
            };
        }
        
        if (size > this.MAX_FILE_SIZE) {
            return {
                valid: false,
                error: `File size (${this.formatFileSize(size)}) exceeds maximum allowed size (25MB)`
            };
        }
        
        // 경고: 10MB 이상
        if (size > 10 * 1024 * 1024) {
            return {
                valid: true,
                warning: `Large file (${this.formatFileSize(size)}) may take longer to process`
            };
        }
        
        return { valid: true };
    }

    /**
     * 매직 바이트 검증 (파일 포맷 실제 검증)
     */
    private validateMagicBytes(extension: string, buffer: ArrayBuffer): { valid: boolean; error?: string } {
        const format = this.SUPPORTED_FORMATS[extension.toLowerCase() as keyof typeof this.SUPPORTED_FORMATS];
        if (!format) {
            return { valid: true }; // 포맷 정보가 없으면 통과
        }

        const bytes = new Uint8Array(buffer.slice(0, format.magicBytes.length));
        const magicMatch = format.magicBytes.every((byte, index) => bytes[index] === byte);

        if (!magicMatch) {
            return {
                valid: false,
                error: `File content does not match expected ${extension.toUpperCase()} format`
            };
        }

        return { valid: true };
    }

    /**
     * 파일명 검증
     */
    private validateFileName(name: string): { valid: boolean; error?: string } {
        // 문제가 될 수 있는 문자 체크
        const problematicChars = /[<>:"/\\|?*]/g;
        if (problematicChars.test(name)) {
            return {
                valid: false,
                error: 'File name contains problematic characters'
            };
        }
        
        return { valid: true };
    }

    /**
     * 파일 크기 포맷팅
     */
    private formatFileSize(bytes: number): string {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
}

interface ValidationResult {
    valid: boolean;
    errors?: ValidationError[];
    warnings?: ValidationWarning[];
    metadata?: {
        extension: string;
        size: number;
        sizeFormatted: string;
        path: string;
    };
}

interface ValidationError {
    code: string;
    message: string;
    field?: string;
}

interface ValidationWarning {
    code: string;
    message: string;
}
```

### 1.3 파일 크기 제한 처리 (25MB)

#### 청크 기반 파일 처리
```typescript
export class LargeFileProcessor {
    private readonly CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
    private readonly MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

    /**
     * 대용량 파일 처리 (압축 포함)
     */
    async processLargeFile(file: TFile, vault: Vault): Promise<ProcessedFile> {
        const stats = file.stat;
        
        if (stats.size > this.MAX_FILE_SIZE) {
            // 파일이 너무 큰 경우 압축 시도
            return await this.compressAndProcess(file, vault);
        }
        
        // 정상 크기 파일 처리
        const buffer = await vault.readBinary(file);
        return {
            buffer,
            compressed: false,
            originalSize: stats.size,
            processedSize: stats.size
        };
    }

    /**
     * 파일 압축 처리
     */
    private async compressAndProcess(file: TFile, vault: Vault): Promise<ProcessedFile> {
        const buffer = await vault.readBinary(file);
        
        // 오디오 품질 조정을 통한 크기 감소
        // 실제 구현에서는 Web Audio API 또는 외부 라이브러리 사용
        const compressed = await this.compressAudio(buffer);
        
        if (compressed.byteLength > this.MAX_FILE_SIZE) {
            throw new Error(
                `File is still too large after compression. ` +
                `Original: ${this.formatSize(buffer.byteLength)}, ` +
                `Compressed: ${this.formatSize(compressed.byteLength)}`
            );
        }
        
        return {
            buffer: compressed,
            compressed: true,
            originalSize: buffer.byteLength,
            processedSize: compressed.byteLength
        };
    }

    /**
     * 오디오 압축 (샘플링 레이트 감소)
     */
    private async compressAudio(buffer: ArrayBuffer): Promise<ArrayBuffer> {
        // 실제 구현 시 Web Audio API 사용
        // 여기서는 시뮬레이션만
        
        // 예: 샘플링 레이트를 절반으로 줄이기
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        try {
            const audioBuffer = await audioContext.decodeAudioData(buffer.slice(0));
            
            // 낮은 샘플링 레이트로 새 버퍼 생성
            const targetSampleRate = Math.min(audioBuffer.sampleRate, 16000);
            const offlineContext = new OfflineAudioContext(
                audioBuffer.numberOfChannels,
                audioBuffer.duration * targetSampleRate,
                targetSampleRate
            );
            
            const source = offlineContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(offlineContext.destination);
            source.start();
            
            const compressedBuffer = await offlineContext.startRendering();
            
            // ArrayBuffer로 변환
            return this.audioBufferToArrayBuffer(compressedBuffer);
        } finally {
            audioContext.close();
        }
    }

    /**
     * AudioBuffer를 ArrayBuffer로 변환
     */
    private audioBufferToArrayBuffer(audioBuffer: AudioBuffer): ArrayBuffer {
        const channels = [];
        for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
            channels.push(audioBuffer.getChannelData(i));
        }
        
        const length = audioBuffer.length * audioBuffer.numberOfChannels * 2;
        const buffer = new ArrayBuffer(length);
        const view = new DataView(buffer);
        
        let offset = 0;
        for (let i = 0; i < audioBuffer.length; i++) {
            for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
                const sample = channels[channel][i];
                const value = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
                view.setInt16(offset, value, true);
                offset += 2;
            }
        }
        
        return buffer;
    }

    private formatSize(bytes: number): string {
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
}

interface ProcessedFile {
    buffer: ArrayBuffer;
    compressed: boolean;
    originalSize: number;
    processedSize: number;
}
```

### 1.4 Base64 인코딩 최적화

#### 효율적인 Base64 처리
```typescript
export class Base64Encoder {
    private readonly CHUNK_SIZE = 1024 * 1024; // 1MB chunks for encoding

    /**
     * ArrayBuffer를 Base64로 효율적으로 인코딩
     */
    async encodeArrayBuffer(buffer: ArrayBuffer): Promise<string> {
        if (buffer.byteLength < this.CHUNK_SIZE) {
            // 작은 파일은 직접 인코딩
            return this.directEncode(buffer);
        }
        
        // 큰 파일은 청크로 나누어 인코딩
        return await this.chunkedEncode(buffer);
    }

    /**
     * 직접 인코딩 (작은 파일)
     */
    private directEncode(buffer: ArrayBuffer): string {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        
        return btoa(binary);
    }

    /**
     * 청크 기반 인코딩 (대용량 파일)
     */
    private async chunkedEncode(buffer: ArrayBuffer): Promise<string> {
        const chunks: string[] = [];
        const uint8Array = new Uint8Array(buffer);
        
        for (let i = 0; i < uint8Array.length; i += this.CHUNK_SIZE) {
            const chunk = uint8Array.slice(i, Math.min(i + this.CHUNK_SIZE, uint8Array.length));
            
            // 각 청크를 비동기적으로 처리
            await new Promise(resolve => setTimeout(resolve, 0));
            
            let binary = '';
            for (let j = 0; j < chunk.length; j++) {
                binary += String.fromCharCode(chunk[j]);
            }
            
            chunks.push(btoa(binary));
        }
        
        return chunks.join('');
    }

    /**
     * Base64를 ArrayBuffer로 디코딩
     */
    async decodeToArrayBuffer(base64: string): Promise<ArrayBuffer> {
        const binary = atob(base64);
        const buffer = new ArrayBuffer(binary.length);
        const bytes = new Uint8Array(buffer);
        
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        
        return buffer;
    }

    /**
     * 스트리밍 인코딩 (메모리 효율적)
     */
    async* encodeStream(buffer: ArrayBuffer): AsyncGenerator<string, void, unknown> {
        const uint8Array = new Uint8Array(buffer);
        
        for (let i = 0; i < uint8Array.length; i += this.CHUNK_SIZE) {
            const chunk = uint8Array.slice(i, Math.min(i + this.CHUNK_SIZE, uint8Array.length));
            
            let binary = '';
            for (let j = 0; j < chunk.length; j++) {
                binary += String.fromCharCode(chunk[j]);
            }
            
            yield btoa(binary);
            
            // CPU에 여유 시간 제공
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }
}

// 사용 예제
export class OptimizedFileUploader {
    private encoder = new Base64Encoder();

    async uploadFile(file: TFile, vault: Vault): Promise<void> {
        const buffer = await vault.readBinary(file);
        
        // 스트리밍 인코딩 사용
        const chunks: string[] = [];
        for await (const chunk of this.encoder.encodeStream(buffer)) {
            chunks.push(chunk);
            // 진행 상황 업데이트
            this.updateProgress(chunks.length, Math.ceil(buffer.byteLength / (1024 * 1024)));
        }
        
        const base64 = chunks.join('');
        // 업로드 처리...
    }

    private updateProgress(current: number, total: number): void {
        const percentage = (current / total) * 100;
        console.log(`Encoding progress: ${percentage.toFixed(1)}%`);
    }
}
```

---

## 2. API 통합 패턴 및 예제 코드

### 2.1 Whisper API 호출 구현 패턴

#### 완전한 Whisper API 클라이언트
```typescript
import { requestUrl, RequestUrlParam } from 'obsidian';

export class WhisperAPIClient {
    private readonly API_BASE_URL = 'https://api.openai.com/v1';
    private readonly TRANSCRIPTION_ENDPOINT = '/audio/transcriptions';
    private readonly TRANSLATION_ENDPOINT = '/audio/translations';
    
    private abortController?: AbortController;
    private requestQueue: Promise<any> = Promise.resolve();

    constructor(
        private apiKey: string,
        private logger: ILogger
    ) {}

    /**
     * 음성을 텍스트로 변환
     */
    async transcribe(
        audioBuffer: ArrayBuffer,
        options: TranscriptionOptions = {}
    ): Promise<TranscriptionResponse> {
        return this.queueRequest(() => this.executeTranscription(audioBuffer, options));
    }

    /**
     * 실제 변환 실행
     */
    private async executeTranscription(
        audioBuffer: ArrayBuffer,
        options: TranscriptionOptions
    ): Promise<TranscriptionResponse> {
        this.abortController = new AbortController();

        const formData = this.buildFormData(audioBuffer, options);
        
        const requestConfig: RequestUrlParam = {
            url: `${this.API_BASE_URL}${this.TRANSCRIPTION_ENDPOINT}`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                // FormData는 자동으로 Content-Type 설정
            },
            body: formData,
            throw: false,
            // 타임아웃 설정 (30초)
            timeout: 30000
        };

        try {
            this.logger.debug('Starting transcription request', { 
                fileSize: audioBuffer.byteLength,
                options 
            });

            const startTime = Date.now();
            const response = await requestUrl(requestConfig);
            const duration = Date.now() - startTime;

            this.logger.debug('Transcription completed', { 
                duration,
                status: response.status 
            });

            if (response.status === 200) {
                return this.parseResponse(response.json, duration);
            } else {
                throw await this.handleAPIError(response);
            }
        } catch (error) {
            if ((error as Error).name === 'AbortError') {
                throw new TranscriptionCancelledError();
            }
            throw error;
        } finally {
            this.abortController = undefined;
        }
    }

    /**
     * FormData 구성
     */
    private buildFormData(audioBuffer: ArrayBuffer, options: TranscriptionOptions): FormData {
        const formData = new FormData();
        
        // 오디오 파일 추가
        const audioBlob = new Blob([audioBuffer], { 
            type: options.mimeType || 'audio/m4a' 
        });
        formData.append('file', audioBlob, options.filename || 'audio.m4a');
        
        // 모델 설정
        formData.append('model', options.model || 'whisper-1');
        
        // 선택적 파라미터들
        if (options.language && options.language !== 'auto') {
            formData.append('language', options.language);
        }
        
        if (options.prompt) {
            formData.append('prompt', options.prompt);
        }
        
        if (options.temperature !== undefined) {
            formData.append('temperature', options.temperature.toString());
        }
        
        if (options.responseFormat) {
            formData.append('response_format', options.responseFormat);
        }
        
        // 타임스탬프 옵션 (verbose_json 포맷에서만)
        if (options.responseFormat === 'verbose_json' && options.timestampGranularities) {
            options.timestampGranularities.forEach(granularity => {
                formData.append('timestamp_granularities[]', granularity);
            });
        }
        
        return formData;
    }

    /**
     * 응답 파싱
     */
    private parseResponse(json: any, duration: number): TranscriptionResponse {
        if (typeof json === 'string') {
            // response_format이 'text'인 경우
            return {
                text: json,
                duration,
                type: 'simple'
            };
        }
        
        // verbose_json 또는 json 포맷
        return {
            text: json.text,
            language: json.language,
            duration,
            segments: json.segments,
            words: json.words,
            type: json.segments ? 'verbose' : 'simple'
        };
    }

    /**
     * API 에러 처리
     */
    private async handleAPIError(response: any): Promise<never> {
        const errorBody = response.json;
        
        switch (response.status) {
            case 400:
                throw new BadRequestError(errorBody?.error?.message || 'Invalid request');
            case 401:
                throw new AuthenticationError('Invalid API key');
            case 429:
                const retryAfter = response.headers?.['retry-after'];
                throw new RateLimitError(retryAfter);
            case 413:
                throw new FileTooLargeError();
            case 500:
            case 502:
            case 503:
                throw new ServerError(`Server error: ${response.status}`);
            default:
                throw new UnknownAPIError(`API error: ${response.status}`, response.status);
        }
    }

    /**
     * 요청 큐잉 (동시 요청 제한)
     */
    private async queueRequest<T>(request: () => Promise<T>): Promise<T> {
        const promise = this.requestQueue.then(request, request);
        this.requestQueue = promise.catch(() => {});
        return promise;
    }

    /**
     * 진행 중인 요청 취소
     */
    cancel(): void {
        this.abortController?.abort();
    }

    /**
     * API 키 검증
     */
    async validateApiKey(): Promise<boolean> {
        try {
            // 최소한의 테스트 요청
            const testAudio = new ArrayBuffer(100);
            await this.transcribe(testAudio, { 
                responseFormat: 'text' 
            });
            return true;
        } catch (error) {
            if (error instanceof AuthenticationError) {
                return false;
            }
            // 다른 에러는 API 키와 관련 없음
            return true;
        }
    }
}

// 타입 정의
interface TranscriptionOptions {
    model?: 'whisper-1';
    language?: string;
    prompt?: string;
    temperature?: number;
    responseFormat?: 'json' | 'text' | 'verbose_json';
    timestampGranularities?: ('word' | 'segment')[];
    mimeType?: string;
    filename?: string;
}

interface TranscriptionResponse {
    text: string;
    language?: string;
    duration: number;
    segments?: TranscriptionSegment[];
    words?: TranscriptionWord[];
    type: 'simple' | 'verbose';
}

interface TranscriptionSegment {
    id: number;
    start: number;
    end: number;
    text: string;
    temperature: number;
    avgLogprob?: number;
    compressionRatio?: number;
    noSpeechProb?: number;
}

interface TranscriptionWord {
    word: string;
    start: number;
    end: number;
    confidence?: number;
}

// 커스텀 에러 클래스들
class TranscriptionError extends Error {
    constructor(message: string, public code: string) {
        super(message);
        this.name = 'TranscriptionError';
    }
}

class AuthenticationError extends TranscriptionError {
    constructor(message: string) {
        super(message, 'AUTH_ERROR');
    }
}

class RateLimitError extends TranscriptionError {
    constructor(public retryAfter?: string) {
        super('Rate limit exceeded', 'RATE_LIMIT');
    }
}

class FileTooLargeError extends TranscriptionError {
    constructor() {
        super('File size exceeds API limit (25MB)', 'FILE_TOO_LARGE');
    }
}

class ServerError extends TranscriptionError {
    constructor(message: string) {
        super(message, 'SERVER_ERROR');
    }
}

class BadRequestError extends TranscriptionError {
    constructor(message: string) {
        super(message, 'BAD_REQUEST');
    }
}

class UnknownAPIError extends TranscriptionError {
    constructor(message: string, public status: number) {
        super(message, 'UNKNOWN_ERROR');
    }
}

class TranscriptionCancelledError extends TranscriptionError {
    constructor() {
        super('Transcription was cancelled', 'CANCELLED');
    }
}
```

### 2.2 FormData 구성 방법

#### 고급 FormData 처리
```typescript
export class FormDataBuilder {
    private formData: FormData;

    constructor() {
        this.formData = new FormData();
    }

    /**
     * 오디오 파일 추가 (다양한 포맷 지원)
     */
    addAudioFile(buffer: ArrayBuffer, format: AudioFormat): this {
        const mimeType = this.getMimeType(format);
        const filename = `audio.${format}`;
        
        const blob = new Blob([buffer], { type: mimeType });
        this.formData.append('file', blob, filename);
        
        return this;
    }

    /**
     * Whisper API 파라미터 추가
     */
    addWhisperParams(params: WhisperParams): this {
        // 필수 파라미터
        this.formData.append('model', params.model || 'whisper-1');
        
        // 선택적 파라미터
        if (params.language) {
            this.formData.append('language', params.language);
        }
        
        if (params.prompt) {
            // 프롬프트 길이 제한 (최대 224 토큰)
            const truncatedPrompt = this.truncatePrompt(params.prompt);
            this.formData.append('prompt', truncatedPrompt);
        }
        
        if (params.temperature !== undefined) {
            // 온도 범위 검증 (0.0 ~ 1.0)
            const temp = Math.max(0, Math.min(1, params.temperature));
            this.formData.append('temperature', temp.toString());
        }
        
        if (params.responseFormat) {
            this.formData.append('response_format', params.responseFormat);
        }
        
        return this;
    }

    /**
     * 메타데이터 추가 (커스텀 처리용)
     */
    addMetadata(metadata: Record<string, any>): this {
        Object.entries(metadata).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                if (Array.isArray(value)) {
                    value.forEach(item => {
                        this.formData.append(`${key}[]`, String(item));
                    });
                } else {
                    this.formData.append(key, String(value));
                }
            }
        });
        
        return this;
    }

    /**
     * FormData 빌드
     */
    build(): FormData {
        return this.formData;
    }

    /**
     * MIME 타입 매핑
     */
    private getMimeType(format: AudioFormat): string {
        const mimeTypes: Record<AudioFormat, string> = {
            'm4a': 'audio/mp4',
            'mp3': 'audio/mpeg',
            'wav': 'audio/wav',
            'mp4': 'audio/mp4',
            'mpeg': 'audio/mpeg',
            'mpga': 'audio/mpeg',
            'webm': 'audio/webm'
        };
        
        return mimeTypes[format] || 'audio/mpeg';
    }

    /**
     * 프롬프트 길이 제한 (간단한 구현)
     */
    private truncatePrompt(prompt: string, maxTokens: number = 224): string {
        // 대략적으로 1 토큰 = 4 문자로 계산
        const maxChars = maxTokens * 4;
        
        if (prompt.length <= maxChars) {
            return prompt;
        }
        
        return prompt.substring(0, maxChars - 3) + '...';
    }
}

type AudioFormat = 'm4a' | 'mp3' | 'wav' | 'mp4' | 'mpeg' | 'mpga' | 'webm';

interface WhisperParams {
    model?: 'whisper-1';
    language?: string;
    prompt?: string;
    temperature?: number;
    responseFormat?: 'json' | 'text' | 'verbose_json';
}
```

### 2.3 비동기 처리 및 프로미스 체이닝

#### 고급 비동기 처리 패턴
```typescript
export class AsyncTranscriptionManager {
    private currentOperation?: Promise<any>;
    private operationQueue: Array<() => Promise<any>> = [];
    private isProcessing = false;

    /**
     * 순차적 처리 (큐 기반)
     */
    async processSequentially<T>(operation: () => Promise<T>): Promise<T> {
        return new Promise((resolve, reject) => {
            this.operationQueue.push(async () => {
                try {
                    const result = await operation();
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            });
            
            this.processQueue();
        });
    }

    /**
     * 큐 처리
     */
    private async processQueue(): Promise<void> {
        if (this.isProcessing || this.operationQueue.length === 0) {
            return;
        }
        
        this.isProcessing = true;
        
        while (this.operationQueue.length > 0) {
            const operation = this.operationQueue.shift()!;
            await operation();
        }
        
        this.isProcessing = false;
    }

    /**
     * 병렬 처리 (배치)
     */
    async processBatch<T>(
        items: T[],
        processor: (item: T) => Promise<any>,
        batchSize: number = 3
    ): Promise<any[]> {
        const results: any[] = [];
        
        for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);
            const batchResults = await Promise.all(
                batch.map(item => processor(item))
            );
            results.push(...batchResults);
        }
        
        return results;
    }

    /**
     * 타임아웃이 있는 비동기 작업
     */
    async withTimeout<T>(
        operation: Promise<T>,
        timeoutMs: number,
        timeoutError?: Error
    ): Promise<T> {
        const timeout = new Promise<never>((_, reject) => {
            setTimeout(() => {
                reject(timeoutError || new Error(`Operation timed out after ${timeoutMs}ms`));
            }, timeoutMs);
        });
        
        return Promise.race([operation, timeout]);
    }

    /**
     * 재시도가 있는 비동기 작업
     */
    async withRetry<T>(
        operation: () => Promise<T>,
        options: RetryOptions = {}
    ): Promise<T> {
        const {
            maxAttempts = 3,
            delay = 1000,
            backoff = 2,
            shouldRetry = () => true
        } = options;
        
        let lastError: Error;
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error as Error;
                
                if (attempt === maxAttempts || !shouldRetry(error)) {
                    throw error;
                }
                
                const waitTime = delay * Math.pow(backoff, attempt - 1);
                await this.sleep(waitTime);
            }
        }
        
        throw lastError!;
    }

    /**
     * 프로미스 체이닝 예제
     */
    async transcribeWithFullPipeline(
        file: TFile,
        vault: Vault,
        whisperClient: WhisperAPIClient
    ): Promise<TranscriptionResult> {
        return this.validateFile(file)
            .then(() => this.readFile(file, vault))
            .then(buffer => this.preprocessAudio(buffer))
            .then(processed => this.transcribeAudio(processed, whisperClient))
            .then(response => this.postprocessText(response))
            .then(result => this.saveResult(result))
            .catch(error => this.handleError(error));
    }

    /**
     * async/await 버전
     */
    async transcribeWithAsyncAwait(
        file: TFile,
        vault: Vault,
        whisperClient: WhisperAPIClient
    ): Promise<TranscriptionResult> {
        try {
            // 검증
            await this.validateFile(file);
            
            // 파일 읽기
            const buffer = await this.readFile(file, vault);
            
            // 전처리
            const processed = await this.preprocessAudio(buffer);
            
            // 변환
            const response = await this.transcribeAudio(processed, whisperClient);
            
            // 후처리
            const result = await this.postprocessText(response);
            
            // 저장
            return await this.saveResult(result);
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * 파이프라인 빌더 패턴
     */
    createPipeline<T>(): Pipeline<T> {
        return new Pipeline<T>();
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 헬퍼 메서드들 (실제 구현 필요)
    private async validateFile(file: TFile): Promise<void> {
        // 구현...
    }

    private async readFile(file: TFile, vault: Vault): Promise<ArrayBuffer> {
        return vault.readBinary(file);
    }

    private async preprocessAudio(buffer: ArrayBuffer): Promise<ArrayBuffer> {
        return buffer; // 실제로는 처리 필요
    }

    private async transcribeAudio(buffer: ArrayBuffer, client: WhisperAPIClient): Promise<any> {
        return client.transcribe(buffer);
    }

    private async postprocessText(response: any): Promise<TranscriptionResult> {
        return {
            text: response.text,
            timestamp: Date.now()
        };
    }

    private async saveResult(result: TranscriptionResult): Promise<TranscriptionResult> {
        // 저장 로직
        return result;
    }

    private async handleError(error: any): Promise<never> {
        throw error;
    }
}

// 파이프라인 빌더
class Pipeline<T> {
    private steps: Array<(input: any) => Promise<any>> = [];

    pipe<U>(step: (input: T) => Promise<U>): Pipeline<U> {
        this.steps.push(step);
        return this as any;
    }

    async execute(input: T): Promise<any> {
        let result = input;
        
        for (const step of this.steps) {
            result = await step(result);
        }
        
        return result;
    }
}

interface RetryOptions {
    maxAttempts?: number;
    delay?: number;
    backoff?: number;
    shouldRetry?: (error: any) => boolean;
}

interface TranscriptionResult {
    text: string;
    timestamp: number;
}
```

### 2.4 스트리밍 응답 처리

#### 스트리밍 API 처리
```typescript
export class StreamingTranscriptionHandler {
    private reader?: ReadableStreamDefaultReader<Uint8Array>;
    private decoder = new TextDecoder();

    /**
     * 스트리밍 응답 처리
     */
    async handleStreamingResponse(
        response: Response,
        onChunk: (text: string) => void,
        onComplete: (fullText: string) => void,
        onError: (error: Error) => void
    ): Promise<void> {
        if (!response.body) {
            throw new Error('Response body is empty');
        }

        this.reader = response.body.getReader();
        const chunks: string[] = [];

        try {
            while (true) {
                const { done, value } = await this.reader.read();
                
                if (done) {
                    break;
                }
                
                const chunk = this.decoder.decode(value, { stream: true });
                chunks.push(chunk);
                
                // 청크별 처리
                const parsedChunk = this.parseStreamChunk(chunk);
                if (parsedChunk) {
                    onChunk(parsedChunk);
                }
            }
            
            // 완료 처리
            const fullText = chunks.join('');
            onComplete(fullText);
        } catch (error) {
            onError(error as Error);
        } finally {
            this.reader?.releaseLock();
        }
    }

    /**
     * Server-Sent Events (SSE) 처리
     */
    async handleSSEStream(
        url: string,
        headers: HeadersInit,
        onMessage: (data: any) => void,
        onError: (error: Error) => void
    ): Promise<EventSource> {
        const eventSource = new EventSource(url);
        
        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                onMessage(data);
            } catch (error) {
                console.error('Failed to parse SSE message:', error);
            }
        };
        
        eventSource.onerror = (error) => {
            onError(new Error('SSE connection error'));
            eventSource.close();
        };
        
        return eventSource;
    }

    /**
     * 청크 파싱
     */
    private parseStreamChunk(chunk: string): string | null {
        // SSE 포맷 파싱 예제
        if (chunk.startsWith('data: ')) {
            const data = chunk.slice(6).trim();
            
            if (data === '[DONE]') {
                return null;
            }
            
            try {
                const parsed = JSON.parse(data);
                return parsed.text || parsed.content || null;
            } catch {
                return null;
            }
        }
        
        return chunk;
    }

    /**
     * 진행 상황이 있는 스트리밍
     */
    async streamWithProgress(
        response: Response,
        onProgress: (progress: StreamProgress) => void
    ): Promise<string> {
        const contentLength = response.headers.get('content-length');
        const total = contentLength ? parseInt(contentLength, 10) : 0;
        
        if (!response.body) {
            throw new Error('Response body is empty');
        }
        
        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        let received = 0;
        
        while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
                break;
            }
            
            chunks.push(value);
            received += value.length;
            
            // 진행 상황 업데이트
            onProgress({
                received,
                total,
                percentage: total > 0 ? (received / total) * 100 : 0
            });
        }
        
        // 전체 데이터 조합
        const allChunks = new Uint8Array(received);
        let position = 0;
        
        for (const chunk of chunks) {
            allChunks.set(chunk, position);
            position += chunk.length;
        }
        
        return this.decoder.decode(allChunks);
    }

    /**
     * 취소 가능한 스트림
     */
    createCancellableStream(): CancellableStream {
        const abortController = new AbortController();
        
        return {
            signal: abortController.signal,
            cancel: () => abortController.abort(),
            
            async process(
                response: Response,
                processor: (chunk: string) => void
            ): Promise<void> {
                if (!response.body) {
                    throw new Error('Response body is empty');
                }
                
                const reader = response.body.getReader();
                
                try {
                    while (!abortController.signal.aborted) {
                        const { done, value } = await reader.read();
                        
                        if (done) {
                            break;
                        }
                        
                        const text = new TextDecoder().decode(value);
                        processor(text);
                    }
                } finally {
                    reader.releaseLock();
                }
            }
        };
    }
}

interface StreamProgress {
    received: number;
    total: number;
    percentage: number;
}

interface CancellableStream {
    signal: AbortSignal;
    cancel: () => void;
    process: (response: Response, processor: (chunk: string) => void) => Promise<void>;
}
```

---

## 3. 오류 처리 전략

### 3.1 에러 타입별 처리 방법

#### 종합적인 에러 처리 시스템
```typescript
export class ComprehensiveErrorHandler {
    private readonly errorStrategies = new Map<string, ErrorStrategy>();
    private readonly logger: ILogger;
    private readonly notifier: INotificationService;

    constructor(logger: ILogger, notifier: INotificationService) {
        this.logger = logger;
        this.notifier = notifier;
        this.registerErrorStrategies();
    }

    /**
     * 에러 전략 등록
     */
    private registerErrorStrategies(): void {
        // 네트워크 에러
        this.errorStrategies.set('NetworkError', {
            handle: (error) => this.handleNetworkError(error),
            canRetry: true,
            userMessage: 'Network connection issue. Please check your internet connection.'
        });

        // API 에러
        this.errorStrategies.set('APIError', {
            handle: (error) => this.handleAPIError(error),
            canRetry: (error) => error.status >= 500 || error.status === 429,
            userMessage: (error) => this.getAPIErrorMessage(error)
        });

        // 검증 에러
        this.errorStrategies.set('ValidationError', {
            handle: (error) => this.handleValidationError(error),
            canRetry: false,
            userMessage: (error) => error.message
        });

        // 파일 에러
        this.errorStrategies.set('FileError', {
            handle: (error) => this.handleFileError(error),
            canRetry: false,
            userMessage: 'File operation failed. Please check file permissions.'
        });

        // 권한 에러
        this.errorStrategies.set('PermissionError', {
            handle: (error) => this.handlePermissionError(error),
            canRetry: false,
            userMessage: 'Permission denied. Please check your settings.'
        });
    }

    /**
     * 메인 에러 처리
     */
    async handle(
        error: Error,
        context?: ErrorContext
    ): Promise<ErrorHandlingResult> {
        // 에러 분류
        const errorType = this.classifyError(error);
        const strategy = this.errorStrategies.get(errorType);

        // 로깅
        this.logError(error, errorType, context);

        // 전략에 따른 처리
        if (strategy) {
            await strategy.handle(error);
            
            // 사용자 알림
            const userMessage = typeof strategy.userMessage === 'function'
                ? strategy.userMessage(error)
                : strategy.userMessage;
            
            this.notifier.error(userMessage);

            return {
                handled: true,
                canRetry: typeof strategy.canRetry === 'function'
                    ? strategy.canRetry(error)
                    : strategy.canRetry,
                errorType
            };
        }

        // 알 수 없는 에러
        return this.handleUnknownError(error);
    }

    /**
     * 에러 분류
     */
    private classifyError(error: Error): string {
        if (error.name === 'NetworkError' || error.message.includes('network')) {
            return 'NetworkError';
        }
        
        if (error.name === 'APIError' || error.message.includes('API')) {
            return 'APIError';
        }
        
        if (error.name === 'ValidationError') {
            return 'ValidationError';
        }
        
        if (error.message.includes('file') || error.message.includes('File')) {
            return 'FileError';
        }
        
        if (error.message.includes('permission') || error.message.includes('denied')) {
            return 'PermissionError';
        }
        
        return 'UnknownError';
    }

    /**
     * 네트워크 에러 처리
     */
    private async handleNetworkError(error: Error): Promise<void> {
        // 네트워크 상태 확인
        const isOnline = await this.checkNetworkStatus();
        
        if (!isOnline) {
            this.notifier.warn('You appear to be offline. Please check your connection.');
        } else {
            this.notifier.error('Network request failed. The server may be unavailable.');
        }
    }

    /**
     * API 에러 처리
     */
    private handleAPIError(error: any): void {
        const status = error.status || error.statusCode;
        
        switch (status) {
            case 401:
                this.notifier.error('Authentication failed. Please check your API key.');
                // API 키 재설정 UI 표시
                this.showAPIKeySettings();
                break;
            
            case 429:
                const retryAfter = error.retryAfter || 60;
                this.notifier.warn(`Rate limit exceeded. Please try again in ${retryAfter} seconds.`);
                break;
            
            case 403:
                this.notifier.error('Access forbidden. You may not have permission for this operation.');
                break;
            
            case 500:
            case 502:
            case 503:
                this.notifier.error('Server error. Please try again later.');
                break;
            
            default:
                this.notifier.error(`API error: ${error.message}`);
        }
    }

    /**
     * 검증 에러 처리
     */
    private handleValidationError(error: any): void {
        const fields = error.fields || [];
        
        if (fields.length > 0) {
            const fieldList = fields.join(', ');
            this.notifier.error(`Validation failed for: ${fieldList}`);
        } else {
            this.notifier.error(error.message);
        }
    }

    /**
     * 파일 에러 처리
     */
    private handleFileError(error: Error): void {
        if (error.message.includes('size')) {
            this.notifier.error('File is too large. Maximum size is 25MB.');
        } else if (error.message.includes('format')) {
            this.notifier.error('Unsupported file format. Please use M4A, MP3, WAV, or MP4.');
        } else if (error.message.includes('not found')) {
            this.notifier.error('File not found. It may have been moved or deleted.');
        } else {
            this.notifier.error('File operation failed. Please check file permissions.');
        }
    }

    /**
     * 권한 에러 처리
     */
    private handlePermissionError(error: Error): void {
        this.notifier.error('Permission denied. Please check your settings and try again.');
        // 설정 페이지로 이동 제안
    }

    /**
     * 알 수 없는 에러 처리
     */
    private handleUnknownError(error: Error): ErrorHandlingResult {
        this.logger.error('Unknown error occurred', error);
        this.notifier.error(`An unexpected error occurred: ${error.message}`);
        
        return {
            handled: true,
            canRetry: false,
            errorType: 'UnknownError'
        };
    }

    /**
     * API 에러 메시지 생성
     */
    private getAPIErrorMessage(error: any): string {
        const status = error.status || error.statusCode;
        
        const messages: Record<number, string> = {
            400: 'Invalid request. Please check your input.',
            401: 'Authentication failed. Please check your API key.',
            403: 'Access forbidden.',
            404: 'Resource not found.',
            429: 'Too many requests. Please slow down.',
            500: 'Server error. Please try again later.',
            502: 'Bad gateway. Please try again.',
            503: 'Service unavailable. Please try again later.'
        };
        
        return messages[status] || `API error: ${error.message}`;
    }

    /**
     * 에러 로깅
     */
    private logError(error: Error, errorType: string, context?: ErrorContext): void {
        this.logger.error(`[${errorType}] ${error.message}`, error, {
            ...context,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * 네트워크 상태 확인
     */
    private async checkNetworkStatus(): Promise<boolean> {
        try {
            const response = await fetch('https://api.openai.com', { 
                method: 'HEAD',
                mode: 'no-cors'
            });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * API 키 설정 UI 표시
     */
    private showAPIKeySettings(): void {
        // 구현 필요
    }
}

interface ErrorStrategy {
    handle: (error: any) => void | Promise<void>;
    canRetry: boolean | ((error: any) => boolean);
    userMessage: string | ((error: any) => string);
}

interface ErrorContext {
    operation?: string;
    file?: string;
    userId?: string;
    [key: string]: any;
}

interface ErrorHandlingResult {
    handled: boolean;
    canRetry: boolean;
    errorType: string;
}
```

### 3.2 재시도 로직 구현 (지수 백오프)

#### 고급 재시도 메커니즘
```typescript
export class AdvancedRetryManager {
    private readonly defaultConfig: RetryConfig = {
        maxAttempts: 3,
        initialDelay: 1000,
        maxDelay: 30000,
        backoffMultiplier: 2,
        jitterFactor: 0.1,
        retryableErrors: ['NetworkError', 'TimeoutError', 'ServerError']
    };

    /**
     * 지수 백오프를 사용한 재시도
     */
    async executeWithRetry<T>(
        operation: () => Promise<T>,
        config?: Partial<RetryConfig>
    ): Promise<T> {
        const finalConfig = { ...this.defaultConfig, ...config };
        let lastError: Error;
        
        for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
            try {
                // 작업 실행
                const result = await operation();
                
                // 성공 시 메트릭 기록
                this.recordSuccess(attempt);
                
                return result;
            } catch (error) {
                lastError = error as Error;
                
                // 재시도 가능 여부 확인
                if (!this.isRetryable(error, finalConfig)) {
                    throw error;
                }
                
                // 마지막 시도였다면 에러 throw
                if (attempt === finalConfig.maxAttempts) {
                    throw new MaxRetriesExceededError(lastError, finalConfig.maxAttempts);
                }
                
                // 대기 시간 계산
                const delay = this.calculateDelay(attempt, finalConfig);
                
                // 재시도 전 로깅
                this.logRetryAttempt(attempt, finalConfig.maxAttempts, delay, error);
                
                // 대기
                await this.sleep(delay);
            }
        }
        
        throw lastError!;
    }

    /**
     * 적응형 재시도 (성공률 기반)
     */
    async executeWithAdaptiveRetry<T>(
        operation: () => Promise<T>,
        adaptiveConfig?: AdaptiveRetryConfig
    ): Promise<T> {
        const config = {
            ...this.defaultConfig,
            ...adaptiveConfig,
            successRateThreshold: adaptiveConfig?.successRateThreshold || 0.5
        };
        
        // 현재 성공률 확인
        const successRate = this.getRecentSuccessRate();
        
        // 성공률이 낮으면 재시도 횟수 증가
        if (successRate < config.successRateThreshold) {
            config.maxAttempts = Math.min(config.maxAttempts * 2, 10);
            config.initialDelay = config.initialDelay * 1.5;
        }
        
        return this.executeWithRetry(operation, config);
    }

    /**
     * 지수 백오프 지연 시간 계산
     */
    private calculateDelay(attempt: number, config: RetryConfig): number {
        // 기본 지수 백오프
        let delay = Math.min(
            config.initialDelay * Math.pow(config.backoffMultiplier, attempt - 1),
            config.maxDelay
        );
        
        // Jitter 추가 (충돌 방지)
        if (config.jitterFactor > 0) {
            const jitter = delay * config.jitterFactor * Math.random();
            delay = delay + jitter;
        }
        
        return Math.floor(delay);
    }

    /**
     * 재시도 가능 여부 판단
     */
    private isRetryable(error: any, config: RetryConfig): boolean {
        // 에러 타입 확인
        if (config.retryableErrors) {
            const errorName = error.name || error.constructor.name;
            if (!config.retryableErrors.includes(errorName)) {
                return false;
            }
        }
        
        // HTTP 상태 코드 확인
        if (error.status !== undefined) {
            // 5xx 에러와 429는 재시도 가능
            if (error.status >= 500 || error.status === 429) {
                return true;
            }
            
            // 4xx 에러는 대부분 재시도 불가
            if (error.status >= 400 && error.status < 500) {
                return false;
            }
        }
        
        // 특정 에러 메시지 확인
        const message = error.message?.toLowerCase() || '';
        const retryableMessages = ['timeout', 'network', 'econnrefused', 'enotfound'];
        
        return retryableMessages.some(msg => message.includes(msg));
    }

    /**
     * Circuit Breaker와 통합된 재시도
     */
    async executeWithCircuitBreaker<T>(
        operation: () => Promise<T>,
        circuitBreaker: CircuitBreaker
    ): Promise<T> {
        // Circuit이 열려있으면 빠른 실패
        if (circuitBreaker.isOpen()) {
            throw new CircuitOpenError('Circuit breaker is open');
        }
        
        try {
            const result = await this.executeWithRetry(operation);
            circuitBreaker.recordSuccess();
            return result;
        } catch (error) {
            circuitBreaker.recordFailure();
            throw error;
        }
    }

    /**
     * 재시도 메트릭 기록
     */
    private recordSuccess(attempts: number): void {
        // 메트릭 수집 구현
        console.log(`Operation succeeded after ${attempts} attempt(s)`);
    }

    private logRetryAttempt(
        attempt: number,
        maxAttempts: number,
        delay: number,
        error: any
    ): void {
        console.log(
            `Retry attempt ${attempt}/${maxAttempts} after ${delay}ms delay. ` +
            `Error: ${error.message}`
        );
    }

    private getRecentSuccessRate(): number {
        // 최근 성공률 계산 로직
        return 0.8; // 예시
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

interface RetryConfig {
    maxAttempts: number;
    initialDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
    jitterFactor: number;
    retryableErrors?: string[];
}

interface AdaptiveRetryConfig extends Partial<RetryConfig> {
    successRateThreshold?: number;
}

class MaxRetriesExceededError extends Error {
    constructor(public originalError: Error, public attempts: number) {
        super(`Operation failed after ${attempts} attempts: ${originalError.message}`);
        this.name = 'MaxRetriesExceededError';
    }
}

class CircuitOpenError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'CircuitOpenError';
    }
}
```

### 3.3 Circuit Breaker 패턴 적용

#### Circuit Breaker 구현
```typescript
export class CircuitBreaker {
    private state: CircuitState = 'CLOSED';
    private failureCount = 0;
    private successCount = 0;
    private lastFailureTime?: number;
    private nextAttemptTime?: number;

    constructor(private config: CircuitBreakerConfig) {}

    /**
     * Circuit Breaker를 통한 작업 실행
     */
    async execute<T>(operation: () => Promise<T>): Promise<T> {
        // 상태 확인
        if (this.isOpen()) {
            throw new CircuitOpenError(
                `Circuit breaker is open. Next attempt at ${new Date(this.nextAttemptTime!)}`
            );
        }

        try {
            const result = await operation();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    /**
     * Circuit이 열려있는지 확인
     */
    isOpen(): boolean {
        if (this.state === 'OPEN') {
            // 타임아웃 확인
            if (Date.now() >= this.nextAttemptTime!) {
                this.state = 'HALF_OPEN';
                return false;
            }
            return true;
        }
        return false;
    }

    /**
     * 성공 처리
     */
    recordSuccess(): void {
        this.onSuccess();
    }

    /**
     * 실패 처리
     */
    recordFailure(): void {
        this.onFailure();
    }

    /**
     * 성공 시 상태 업데이트
     */
    private onSuccess(): void {
        this.failureCount = 0;
        
        if (this.state === 'HALF_OPEN') {
            this.successCount++;
            
            if (this.successCount >= this.config.successThreshold) {
                this.close();
            }
        }
    }

    /**
     * 실패 시 상태 업데이트
     */
    private onFailure(): void {
        this.failureCount++;
        this.lastFailureTime = Date.now();
        
        if (this.state === 'HALF_OPEN') {
            this.open();
        } else if (this.failureCount >= this.config.failureThreshold) {
            this.open();
        }
    }

    /**
     * Circuit 열기
     */
    private open(): void {
        this.state = 'OPEN';
        this.nextAttemptTime = Date.now() + this.config.timeout;
        console.log(`Circuit breaker opened. Will retry at ${new Date(this.nextAttemptTime)}`);
    }

    /**
     * Circuit 닫기
     */
    private close(): void {
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.successCount = 0;
        console.log('Circuit breaker closed');
    }

    /**
     * 상태 가져오기
     */
    getState(): CircuitBreakerState {
        return {
            state: this.state,
            failureCount: this.failureCount,
            successCount: this.successCount,
            lastFailureTime: this.lastFailureTime,
            nextAttemptTime: this.nextAttemptTime
        };
    }

    /**
     * 수동 리셋
     */
    reset(): void {
        this.close();
    }
}

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerConfig {
    failureThreshold: number;  // 실패 횟수 임계값
    successThreshold: number;  // 성공 횟수 임계값 (HALF_OPEN 상태에서)
    timeout: number;           // OPEN 상태 유지 시간 (ms)
}

interface CircuitBreakerState {
    state: CircuitState;
    failureCount: number;
    successCount: number;
    lastFailureTime?: number;
    nextAttemptTime?: number;
}

// Circuit Breaker 매니저
export class CircuitBreakerManager {
    private breakers = new Map<string, CircuitBreaker>();

    /**
     * Circuit Breaker 생성 또는 가져오기
     */
    getBreaker(name: string, config?: CircuitBreakerConfig): CircuitBreaker {
        if (!this.breakers.has(name)) {
            const defaultConfig: CircuitBreakerConfig = {
                failureThreshold: 5,
                successThreshold: 2,
                timeout: 60000, // 1분
                ...config
            };
            
            this.breakers.set(name, new CircuitBreaker(defaultConfig));
        }
        
        return this.breakers.get(name)!;
    }

    /**
     * 모든 Circuit Breaker 상태
     */
    getAllStates(): Record<string, CircuitBreakerState> {
        const states: Record<string, CircuitBreakerState> = {};
        
        this.breakers.forEach((breaker, name) => {
            states[name] = breaker.getState();
        });
        
        return states;
    }

    /**
     * 모든 Circuit Breaker 리셋
     */
    resetAll(): void {
        this.breakers.forEach(breaker => breaker.reset());
    }
}
```

### 3.4 사용자 친화적 에러 메시지

#### 에러 메시지 매핑 시스템
```typescript
export class UserFriendlyErrorMessages {
    private readonly errorMessages = new Map<string, ErrorMessageConfig>();

    constructor() {
        this.initializeMessages();
    }

    /**
     * 에러 메시지 초기화
     */
    private initializeMessages(): void {
        // 네트워크 에러
        this.errorMessages.set('NETWORK_ERROR', {
            title: 'Connection Problem',
            message: 'Unable to connect to the service. Please check your internet connection.',
            icon: '🌐',
            actions: [
                { label: 'Retry', action: 'retry' },
                { label: 'Check Settings', action: 'settings' }
            ]
        });

        // API 키 에러
        this.errorMessages.set('INVALID_API_KEY', {
            title: 'Authentication Failed',
            message: 'Your API key appears to be invalid. Please check your settings.',
            icon: '🔑',
            actions: [
                { label: 'Update API Key', action: 'updateApiKey' },
                { label: 'Get API Key', action: 'openApiDocs' }
            ]
        });

        // 파일 크기 에러
        this.errorMessages.set('FILE_TOO_LARGE', {
            title: 'File Too Large',
            message: 'The selected file exceeds the 25MB limit. Please choose a smaller file.',
            icon: '📁',
            actions: [
                { label: 'Choose Another File', action: 'selectFile' },
                { label: 'Learn More', action: 'help' }
            ]
        });

        // 할당량 초과
        this.errorMessages.set('QUOTA_EXCEEDED', {
            title: 'Quota Exceeded',
            message: 'You have reached your API usage limit. Please try again later or upgrade your plan.',
            icon: '⚠️',
            actions: [
                { label: 'View Usage', action: 'viewUsage' },
                { label: 'Upgrade Plan', action: 'upgrade' }
            ]
        });

        // 서버 에러
        this.errorMessages.set('SERVER_ERROR', {
            title: 'Service Unavailable',
            message: 'The transcription service is temporarily unavailable. Please try again in a few moments.',
            icon: '🔧',
            actions: [
                { label: 'Retry', action: 'retry' },
                { label: 'Check Status', action: 'checkStatus' }
            ]
        });
    }

    /**
     * 에러 코드로 사용자 메시지 가져오기
     */
    getUserMessage(errorCode: string, context?: any): UserErrorMessage {
        const config = this.errorMessages.get(errorCode);
        
        if (!config) {
            return this.getDefaultMessage(errorCode);
        }

        // 컨텍스트를 사용한 메시지 커스터마이징
        let message = config.message;
        if (context) {
            message = this.interpolateMessage(message, context);
        }

        return {
            title: config.title,
            message,
            icon: config.icon,
            actions: config.actions,
            severity: this.getSeverity(errorCode)
        };
    }

    /**
     * 기본 에러 메시지
     */
    private getDefaultMessage(errorCode: string): UserErrorMessage {
        return {
            title: 'An Error Occurred',
            message: `Something went wrong (${errorCode}). Please try again or contact support if the problem persists.`,
            icon: '❌',
            actions: [
                { label: 'Retry', action: 'retry' },
                { label: 'Get Help', action: 'help' }
            ],
            severity: 'error'
        };
    }

    /**
     * 메시지 보간
     */
    private interpolateMessage(message: string, context: any): string {
        return message.replace(/\{(\w+)\}/g, (match, key) => {
            return context[key] || match;
        });
    }

    /**
     * 에러 심각도 결정
     */
    private getSeverity(errorCode: string): ErrorSeverity {
        const criticalErrors = ['SERVER_ERROR', 'INVALID_API_KEY'];
        const warningErrors = ['QUOTA_EXCEEDED', 'RATE_LIMIT'];
        
        if (criticalErrors.includes(errorCode)) {
            return 'error';
        }
        
        if (warningErrors.includes(errorCode)) {
            return 'warning';
        }
        
        return 'info';
    }
}

interface ErrorMessageConfig {
    title: string;
    message: string;
    icon: string;
    actions: ErrorAction[];
}

interface UserErrorMessage extends ErrorMessageConfig {
    severity: ErrorSeverity;
}

interface ErrorAction {
    label: string;
    action: string;
}

type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

// 에러 표시 컴포넌트
export class ErrorNotificationComponent {
    constructor(private messageService: UserFriendlyErrorMessages) {}

    /**
     * 에러 알림 표시
     */
    showError(errorCode: string, context?: any): void {
        const message = this.messageService.getUserMessage(errorCode, context);
        
        // Obsidian Notice 사용
        const notice = new Notice('', 0);
        
        // 커스텀 HTML 생성
        const container = notice.noticeEl;
        container.empty();
        container.addClass(`error-notice-${message.severity}`);
        
        // 아이콘과 제목
        const header = container.createDiv('error-notice-header');
        header.createSpan({ text: message.icon, cls: 'error-icon' });
        header.createSpan({ text: message.title, cls: 'error-title' });
        
        // 메시지
        container.createDiv({
            text: message.message,
            cls: 'error-message'
        });
        
        // 액션 버튼들
        if (message.actions.length > 0) {
            const actions = container.createDiv('error-actions');
            
            message.actions.forEach(action => {
                const button = actions.createEl('button', {
                    text: action.label,
                    cls: 'error-action-button'
                });
                
                button.onclick = () => {
                    this.handleAction(action.action);
                    notice.hide();
                };
            });
        }
        
        // 자동 숨김 설정
        if (message.severity !== 'critical') {
            setTimeout(() => notice.hide(), 10000);
        }
    }

    /**
     * 액션 처리
     */
    private handleAction(action: string): void {
        switch (action) {
            case 'retry':
                // 재시도 로직
                break;
            case 'settings':
                // 설정 열기
                break;
            case 'updateApiKey':
                // API 키 업데이트 모달
                break;
            // ... 기타 액션들
        }
    }
}
```

---

## 4. 코드 리뷰 체크리스트

### 4.1 성능 최적화 포인트

#### 성능 체크리스트
```typescript
/**
 * 성능 최적화 체크리스트
 * 
 * ✅ 메모리 관리
 * - [ ] 대용량 ArrayBuffer 처리 시 메모리 누수 방지
 * - [ ] 사용 완료된 객체 참조 해제
 * - [ ] WeakMap/WeakSet 활용 검토
 * - [ ] 이벤트 리스너 적절한 해제
 * 
 * ✅ 비동기 처리
 * - [ ] Promise 체이닝 최적화
 * - [ ] 동시성 제어 (최대 동시 요청 수 제한)
 * - [ ] 불필요한 await 제거
 * - [ ] Promise.all() 활용하여 병렬 처리
 * 
 * ✅ 파일 처리
 * - [ ] 청크 단위 처리로 메모리 사용 최소화
 * - [ ] 스트리밍 처리 가능 여부 검토
 * - [ ] Base64 인코딩 최적화
 * - [ ] 파일 캐싱 전략 구현
 * 
 * ✅ API 호출
 * - [ ] 요청 디바운싱/쓰로틀링 적용
 * - [ ] 응답 캐싱 구현
 * - [ ] 불필요한 API 호출 제거
 * - [ ] 배치 처리 가능 여부 검토
 * 
 * ✅ UI 렌더링
 * - [ ] Virtual scrolling for long lists
 * - [ ] 레이지 로딩 적용
 * - [ ] 리렌더링 최소화
 * - [ ] CSS 애니메이션 최적화
 */

// 성능 모니터링 유틸리티
export class PerformanceMonitor {
    private metrics: Map<string, PerformanceMetric> = new Map();

    /**
     * 작업 시간 측정
     */
    async measure<T>(name: string, operation: () => Promise<T>): Promise<T> {
        const start = performance.now();
        
        try {
            const result = await operation();
            const duration = performance.now() - start;
            
            this.recordMetric(name, duration, true);
            return result;
        } catch (error) {
            const duration = performance.now() - start;
            this.recordMetric(name, duration, false);
            throw error;
        }
    }

    /**
     * 메트릭 기록
     */
    private recordMetric(name: string, duration: number, success: boolean): void {
        if (!this.metrics.has(name)) {
            this.metrics.set(name, {
                name,
                count: 0,
                totalDuration: 0,
                avgDuration: 0,
                minDuration: Infinity,
                maxDuration: 0,
                successCount: 0,
                failureCount: 0
            });
        }
        
        const metric = this.metrics.get(name)!;
        metric.count++;
        metric.totalDuration += duration;
        metric.avgDuration = metric.totalDuration / metric.count;
        metric.minDuration = Math.min(metric.minDuration, duration);
        metric.maxDuration = Math.max(metric.maxDuration, duration);
        
        if (success) {
            metric.successCount++;
        } else {
            metric.failureCount++;
        }
    }

    /**
     * 성능 보고서 생성
     */
    generateReport(): PerformanceReport {
        const report: PerformanceReport = {
            timestamp: new Date().toISOString(),
            metrics: Array.from(this.metrics.values()),
            summary: {
                totalOperations: 0,
                avgDuration: 0,
                successRate: 0
            }
        };
        
        // 요약 계산
        let totalOps = 0;
        let totalDuration = 0;
        let totalSuccess = 0;
        
        report.metrics.forEach(metric => {
            totalOps += metric.count;
            totalDuration += metric.totalDuration;
            totalSuccess += metric.successCount;
        });
        
        report.summary.totalOperations = totalOps;
        report.summary.avgDuration = totalOps > 0 ? totalDuration / totalOps : 0;
        report.summary.successRate = totalOps > 0 ? (totalSuccess / totalOps) * 100 : 0;
        
        return report;
    }
}

interface PerformanceMetric {
    name: string;
    count: number;
    totalDuration: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    successCount: number;
    failureCount: number;
}

interface PerformanceReport {
    timestamp: string;
    metrics: PerformanceMetric[];
    summary: {
        totalOperations: number;
        avgDuration: number;
        successRate: number;
    };
}
```

### 4.2 보안 검토 사항

#### 보안 체크리스트
```typescript
/**
 * 보안 검토 체크리스트
 * 
 * ✅ API 키 보안
 * - [ ] API 키 암호화 저장
 * - [ ] 메모리에서 API 키 보호
 * - [ ] 로그에 API 키 노출 방지
 * - [ ] API 키 검증 로직 구현
 * 
 * ✅ 입력 검증
 * - [ ] 파일 형식 검증
 * - [ ] 파일 크기 제한
 * - [ ] 경로 트래버설 방지
 * - [ ] 인젝션 공격 방지
 * 
 * ✅ 데이터 보호
 * - [ ] 민감한 데이터 암호화
 * - [ ] 안전한 통신 (HTTPS)
 * - [ ] 캐시된 데이터 보호
 * - [ ] 임시 파일 안전한 삭제
 * 
 * ✅ 권한 관리
 * - [ ] 최소 권한 원칙 적용
 * - [ ] 파일 시스템 접근 제한
 * - [ ] API 엔드포인트 검증
 */

// 보안 유틸리티
export class SecurityUtilities {
    /**
     * API 키 마스킹
     */
    maskApiKey(key: string): string {
        if (!key || key.length < 8) {
            return '***';
        }
        
        const visibleStart = 4;
        const visibleEnd = 4;
        const masked = '*'.repeat(key.length - visibleStart - visibleEnd);
        
        return key.substring(0, visibleStart) + masked + key.substring(key.length - visibleEnd);
    }

    /**
     * 안전한 경로 검증
     */
    validatePath(path: string): boolean {
        // 경로 트래버설 방지
        const dangerous = ['..', '~', '\\\\', '//'];
        
        for (const pattern of dangerous) {
            if (path.includes(pattern)) {
                return false;
            }
        }
        
        // 절대 경로 차단
        if (path.startsWith('/') || path.match(/^[A-Z]:/)) {
            return false;
        }
        
        return true;
    }

    /**
     * 입력 살균
     */
    sanitizeInput(input: string): string {
        return input
            .replace(/[<>]/g, '')  // HTML 태그 제거
            .replace(/javascript:/gi, '')  // JavaScript 프로토콜 제거
            .replace(/on\w+=/gi, '')  // 이벤트 핸들러 제거
            .trim();
    }

    /**
     * 안전한 JSON 파싱
     */
    safeJsonParse<T>(json: string): T | null {
        try {
            return JSON.parse(json);
        } catch {
            return null;
        }
    }
}
```

### 4.3 테스트 커버리지 요구사항

#### 테스트 체크리스트
```typescript
/**
 * 테스트 커버리지 체크리스트
 * 
 * ✅ 단위 테스트 (목표: 80% 이상)
 * - [ ] 모든 public 메서드 테스트
 * - [ ] 경계값 테스트
 * - [ ] 에러 케이스 테스트
 * - [ ] 모킹/스터빙 적절히 사용
 * 
 * ✅ 통합 테스트
 * - [ ] API 통합 테스트
 * - [ ] 파일 시스템 통합 테스트
 * - [ ] 옵시디언 API 통합 테스트
 * 
 * ✅ E2E 테스트
 * - [ ] 주요 사용자 시나리오 테스트
 * - [ ] 에러 복구 시나리오 테스트
 * - [ ] 성능 테스트
 */

// 테스트 예제
describe('WhisperService', () => {
    let service: WhisperService;
    let mockLogger: jest.Mocked<ILogger>;

    beforeEach(() => {
        mockLogger = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        };
        
        service = new WhisperService('test-api-key', mockLogger);
    });

    describe('transcribe', () => {
        it('should successfully transcribe audio', async () => {
            // Arrange
            const audioBuffer = new ArrayBuffer(100);
            const expectedResponse = { text: 'Test transcription' };
            
            // Mock requestUrl
            jest.spyOn(obsidian, 'requestUrl').mockResolvedValue({
                status: 200,
                json: expectedResponse
            });

            // Act
            const result = await service.transcribe(audioBuffer);

            // Assert
            expect(result).toEqual(expectedResponse);
            expect(mockLogger.debug).toHaveBeenCalledWith(
                expect.stringContaining('Starting transcription'),
                expect.any(Object)
            );
        });

        it('should handle API errors properly', async () => {
            // Arrange
            const audioBuffer = new ArrayBuffer(100);
            
            jest.spyOn(obsidian, 'requestUrl').mockResolvedValue({
                status: 401,
                json: { error: 'Unauthorized' }
            });

            // Act & Assert
            await expect(service.transcribe(audioBuffer))
                .rejects
                .toThrow('API returned status 401');
        });
    });
});
```

### 4.4 접근성 고려사항

#### 접근성 체크리스트
```typescript
/**
 * 접근성 체크리스트
 * 
 * ✅ 키보드 접근성
 * - [ ] 모든 기능 키보드로 접근 가능
 * - [ ] 탭 순서 논리적 구성
 * - [ ] 키보드 단축키 제공
 * - [ ] 포커스 표시 명확
 * 
 * ✅ 스크린 리더 지원
 * - [ ] ARIA 레이블 적절히 사용
 * - [ ] 의미있는 대체 텍스트
 * - [ ] 동적 콘텐츠 변경 알림
 * 
 * ✅ 시각적 접근성
 * - [ ] 충분한 색상 대비
 * - [ ] 색상만으로 정보 전달 금지
 * - [ ] 텍스트 크기 조절 가능
 * - [ ] 애니메이션 비활성화 옵션
 * 
 * ✅ 사용성
 * - [ ] 명확한 에러 메시지
 * - [ ] 진행 상황 표시
 * - [ ] 작업 취소 가능
 * - [ ] 도움말 제공
 */

// 접근성 유틸리티
export class AccessibilityUtils {
    /**
     * ARIA 속성 설정
     */
    setAriaAttributes(element: HTMLElement, attributes: AriaAttributes): void {
        Object.entries(attributes).forEach(([key, value]) => {
            if (value !== undefined) {
                element.setAttribute(`aria-${key}`, String(value));
            }
        });
    }

    /**
     * 키보드 내비게이션 설정
     */
    setupKeyboardNavigation(container: HTMLElement): void {
        const focusableElements = container.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
        
        container.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                        lastElement.focus();
                        e.preventDefault();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        firstElement.focus();
                        e.preventDefault();
                    }
                }
            }
            
            if (e.key === 'Escape') {
                // 닫기 동작
                container.dispatchEvent(new CustomEvent('close'));
            }
        });
    }

    /**
     * 스크린 리더 알림
     */
    announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
        const announcement = document.createElement('div');
        announcement.setAttribute('role', 'status');
        announcement.setAttribute('aria-live', priority);
        announcement.style.position = 'absolute';
        announcement.style.left = '-10000px';
        announcement.textContent = message;
        
        document.body.appendChild(announcement);
        
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }
}

interface AriaAttributes {
    label?: string;
    describedby?: string;
    labelledby?: string;
    hidden?: boolean;
    expanded?: boolean;
    pressed?: boolean;
    checked?: boolean;
    disabled?: boolean;
    required?: boolean;
    invalid?: boolean;
    live?: 'polite' | 'assertive' | 'off';
    busy?: boolean;
}
```

---

## 결론

이 구현 가이드는 Phase 2 핵심 기능 개발을 위한 상세한 패턴과 예제 코드를 제공합니다. 각 섹션의 코드는 실제 프로젝트에 바로 적용 가능하도록 작성되었으며, 다음과 같은 원칙을 따릅니다:

1. **모듈화**: 각 기능이 독립적으로 동작하고 테스트 가능
2. **확장성**: 새로운 기능 추가가 용이한 구조
3. **안정성**: 포괄적인 에러 처리와 복구 메커니즘
4. **성능**: 메모리와 CPU 사용 최적화
5. **보안**: API 키 보호와 입력 검증
6. **접근성**: 모든 사용자가 이용 가능한 인터페이스

개발 시 이 가이드를 참조하여 일관된 코드 품질과 아키텍처를 유지하시기 바랍니다.

---

*최종 업데이트: 2025-08-22*
*버전: 1.0.0*