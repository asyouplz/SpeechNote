/**
 * 파일 처리 예제 코드
 * 옵시디언 Vault 내에서 오디오 파일을 처리하는 완전한 예제
 */

import { TFile, Vault, App } from 'obsidian';

/**
 * 오디오 파일 처리 예제
 */
export class AudioFileProcessorExample {
    private readonly MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
    private readonly SUPPORTED_FORMATS = ['m4a', 'mp3', 'wav', 'mp4'];

    constructor(
        private app: App,
        private vault: Vault
    ) {}

    /**
     * 메인 처리 플로우
     */
    async processAudioFile(filePath: string): Promise<ProcessingResult> {
        try {
            // 1. 파일 가져오기
            const file = await this.getFile(filePath);
            if (!file) {
                throw new Error(`File not found: ${filePath}`);
            }

            // 2. 파일 검증
            const validation = await this.validateFile(file);
            if (!validation.isValid) {
                throw new Error(`File validation failed: ${validation.errors.join(', ')}`);
            }

            // 3. 파일 읽기 및 처리
            const audioData = await this.readAndProcessFile(file);

            // 4. 메타데이터 추출
            const metadata = this.extractMetadata(file, audioData);

            // 5. 결과 반환
            return {
                success: true,
                file: file,
                data: audioData,
                metadata: metadata
            };
        } catch (error) {
            console.error('Audio file processing failed:', error);
            return {
                success: false,
                error: error as Error
            };
        }
    }

    /**
     * Vault에서 파일 가져오기
     */
    private async getFile(path: string): Promise<TFile | null> {
        const abstractFile = this.vault.getAbstractFileByPath(path);
        
        if (!abstractFile || !(abstractFile instanceof TFile)) {
            return null;
        }
        
        return abstractFile;
    }

    /**
     * 파일 검증
     */
    private async validateFile(file: TFile): Promise<ValidationResult> {
        const errors: string[] = [];

        // 확장자 검증
        if (!this.SUPPORTED_FORMATS.includes(file.extension.toLowerCase())) {
            errors.push(`Unsupported format: .${file.extension}`);
        }

        // 파일 크기 검증
        if (file.stat.size > this.MAX_FILE_SIZE) {
            errors.push(`File size (${this.formatSize(file.stat.size)}) exceeds 25MB limit`);
        }

        // 파일 크기가 0인지 확인
        if (file.stat.size === 0) {
            errors.push('File is empty');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * 파일 읽기 및 처리
     */
    private async readAndProcessFile(file: TFile): Promise<ArrayBuffer> {
        // 바이너리 데이터 읽기
        const buffer = await this.vault.readBinary(file);

        // 필요시 압축 또는 변환 처리
        if (buffer.byteLength > 20 * 1024 * 1024) {
            console.log('Large file detected, consider compression');
            // 압축 로직 구현 가능
        }

        return buffer;
    }

    /**
     * 메타데이터 추출
     */
    private extractMetadata(file: TFile, buffer: ArrayBuffer): FileMetadata {
        return {
            path: file.path,
            name: file.name,
            extension: file.extension,
            size: file.stat.size,
            sizeFormatted: this.formatSize(file.stat.size),
            created: new Date(file.stat.ctime),
            modified: new Date(file.stat.mtime),
            bufferSize: buffer.byteLength
        };
    }

    /**
     * 파일 크기 포맷팅
     */
    private formatSize(bytes: number): string {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }

    /**
     * 여러 파일 배치 처리
     */
    async processBatch(filePaths: string[]): Promise<BatchProcessingResult> {
        const results: ProcessingResult[] = [];
        let successCount = 0;
        let failureCount = 0;

        for (const path of filePaths) {
            const result = await this.processAudioFile(path);
            results.push(result);

            if (result.success) {
                successCount++;
            } else {
                failureCount++;
            }

            // 진행 상황 업데이트
            this.updateProgress(results.length, filePaths.length);
        }

        return {
            totalFiles: filePaths.length,
            successCount,
            failureCount,
            results
        };
    }

    /**
     * 진행 상황 업데이트
     */
    private updateProgress(current: number, total: number): void {
        const percentage = (current / total) * 100;
        console.log(`Processing: ${current}/${total} (${percentage.toFixed(1)}%)`);
    }
}

// 타입 정의
interface ProcessingResult {
    success: boolean;
    file?: TFile;
    data?: ArrayBuffer;
    metadata?: FileMetadata;
    error?: Error;
}

interface ValidationResult {
    isValid: boolean;
    errors: string[];
}

interface FileMetadata {
    path: string;
    name: string;
    extension: string;
    size: number;
    sizeFormatted: string;
    created: Date;
    modified: Date;
    bufferSize: number;
}

interface BatchProcessingResult {
    totalFiles: number;
    successCount: number;
    failureCount: number;
    results: ProcessingResult[];
}

// 사용 예제
export async function exampleUsage(app: App, vault: Vault) {
    const processor = new AudioFileProcessorExample(app, vault);

    // 단일 파일 처리
    const result = await processor.processAudioFile('recordings/meeting.m4a');
    
    if (result.success) {
        console.log('File processed successfully:', result.metadata);
        // Whisper API로 전송
    } else {
        console.error('Processing failed:', result.error);
    }

    // 배치 처리
    const batchResult = await processor.processBatch([
        'recordings/meeting1.m4a',
        'recordings/meeting2.m4a',
        'recordings/interview.mp3'
    ]);

    console.log(`Processed ${batchResult.successCount} files successfully`);
}