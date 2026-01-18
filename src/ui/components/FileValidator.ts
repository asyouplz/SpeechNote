import { TFile } from 'obsidian';

export interface ValidationResult {
    valid: boolean;
    errors?: ValidationError[];
    warnings?: ValidationWarning[];
    metadata?: FileMetadata;
}

export interface ValidationError {
    code: string;
    message: string;
    field?: string;
}

export interface ValidationWarning {
    code: string;
    message: string;
}

export interface FileMetadata {
    path: string;
    name: string;
    extension: string;
    size: number;
    sizeFormatted: string;
    created: Date;
    modified: Date;
    duration?: number;
    mimeType?: string;
}

/**
 * 오디오 파일 검증 클래스
 * - 파일 형식 검증
 * - 파일 크기 검증
 * - 매직 바이트 검증
 * - 메타데이터 추출
 */
export class FileValidator {
    private readonly MAX_FILE_SIZE: number;
    private readonly MIN_FILE_SIZE = 100; // 100 bytes
    private readonly SUPPORTED_FORMATS: Map<string, FormatInfo>;

    constructor(maxFileSize: number = 25 * 1024 * 1024, supportedFormats?: string[]) {
        this.MAX_FILE_SIZE = maxFileSize;
        this.SUPPORTED_FORMATS = this.initializeFormats(supportedFormats);
    }

    private initializeFormats(customFormats?: string[]): Map<string, FormatInfo> {
        const formats = new Map<string, FormatInfo>();

        // 기본 지원 형식
        const defaultFormats: Record<string, FormatInfo> = {
            m4a: {
                mimeTypes: ['audio/mp4', 'audio/x-m4a'],
                magicBytes: [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70],
                magicOffset: 0,
            },
            mp3: {
                mimeTypes: ['audio/mpeg'],
                magicBytes: [0xff, 0xfb],
                magicOffset: 0,
                alternativeMagic: [0xff, 0xf3],
            },
            wav: {
                mimeTypes: ['audio/wav', 'audio/x-wav'],
                magicBytes: [0x52, 0x49, 0x46, 0x46], // RIFF
                magicOffset: 0,
            },
            mp4: {
                mimeTypes: ['video/mp4', 'audio/mp4'],
                magicBytes: [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70],
                magicOffset: 0,
            },
            webm: {
                mimeTypes: ['audio/webm', 'video/webm'],
                magicBytes: [0x1a, 0x45, 0xdf, 0xa3],
                magicOffset: 0,
            },
            ogg: {
                mimeTypes: ['audio/ogg'],
                magicBytes: [0x4f, 0x67, 0x67, 0x53], // OggS
                magicOffset: 0,
            },
        };

        // 커스텀 형식이 지정된 경우
        if (customFormats && customFormats.length > 0) {
            customFormats.forEach((format) => {
                const formatLower = format.toLowerCase();
                if (defaultFormats[formatLower]) {
                    formats.set(formatLower, defaultFormats[formatLower]);
                }
            });
        } else {
            // 모든 기본 형식 사용
            Object.entries(defaultFormats).forEach(([key, value]) => {
                formats.set(key, value);
            });
        }

        return formats;
    }

    /**
     * 파일 검증 메인 메서드
     */
    async validate(file: TFile, buffer?: ArrayBuffer): Promise<ValidationResult> {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];

        // 1. 확장자 검증
        const extensionResult = this.validateExtension(file);
        if (!extensionResult.valid) {
            errors.push(extensionResult.error!);
        }

        // 2. 파일 크기 검증
        const sizeResult = this.validateFileSize(file.stat.size);
        if (!sizeResult.valid) {
            errors.push(sizeResult.error!);
        } else if (sizeResult.warning) {
            warnings.push(sizeResult.warning);
        }

        // 3. 파일명 검증
        const nameResult = this.validateFileName(file.name);
        if (!nameResult.valid) {
            warnings.push(nameResult.warning!);
        }

        // 4. 매직 바이트 검증 (버퍼가 제공된 경우)
        if (buffer && extensionResult.valid) {
            const magicResult = this.validateMagicBytes(file.extension, buffer);
            if (!magicResult.valid) {
                errors.push(magicResult.error!);
            }
        }

        // 5. 메타데이터 추출
        const metadata = await this.extractMetadata(file, buffer);

        return {
            valid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined,
            warnings: warnings.length > 0 ? warnings : undefined,
            metadata,
        };
    }

    /**
     * 확장자 검증
     */
    private validateExtension(file: TFile): { valid: boolean; error?: ValidationError } {
        const extension = file.extension.toLowerCase();

        if (!this.SUPPORTED_FORMATS.has(extension)) {
            const supported = Array.from(this.SUPPORTED_FORMATS.keys())
                .map((ext) => `.${ext}`)
                .join(', ');

            return {
                valid: false,
                error: {
                    code: 'INVALID_EXTENSION',
                    message: `지원하지 않는 형식: .${extension}. 지원 형식: ${supported}`,
                    field: 'extension',
                },
            };
        }

        return { valid: true };
    }

    /**
     * 파일 크기 검증
     */
    private validateFileSize(size: number): {
        valid: boolean;
        error?: ValidationError;
        warning?: ValidationWarning;
    } {
        if (size < this.MIN_FILE_SIZE) {
            return {
                valid: false,
                error: {
                    code: 'FILE_TOO_SMALL',
                    message: `파일이 너무 작습니다 (${size} bytes). 최소 크기: ${this.MIN_FILE_SIZE} bytes`,
                    field: 'size',
                },
            };
        }

        if (size > this.MAX_FILE_SIZE) {
            return {
                valid: false,
                error: {
                    code: 'FILE_TOO_LARGE',
                    message: `파일 크기(${this.formatFileSize(
                        size
                    )})가 최대 허용 크기(${this.formatFileSize(this.MAX_FILE_SIZE)})를 초과합니다`,
                    field: 'size',
                },
            };
        }

        // 경고: 10MB 이상
        if (size > 10 * 1024 * 1024) {
            return {
                valid: true,
                warning: {
                    code: 'LARGE_FILE',
                    message: `큰 파일(${this.formatFileSize(
                        size
                    )})은 처리 시간이 오래 걸릴 수 있습니다`,
                },
            };
        }

        return { valid: true };
    }

    /**
     * 파일명 검증
     */
    private validateFileName(name: string): {
        valid: boolean;
        warning?: ValidationWarning;
    } {
        // 문제가 될 수 있는 문자 체크
        const problematicChars = /[<>:"/\\|?*]/g;
        const specialChars = /[^\w\s.-]/g;

        if (problematicChars.test(name)) {
            return {
                valid: false,
                warning: {
                    code: 'PROBLEMATIC_FILENAME',
                    message: '파일명에 문제가 될 수 있는 문자가 포함되어 있습니다',
                },
            };
        }

        // 특수 문자가 많은 경우 경고
        const specialCharMatches = name.match(specialChars);
        if (specialCharMatches && specialCharMatches.length > 3) {
            return {
                valid: true,
                warning: {
                    code: 'SPECIAL_CHARS_IN_FILENAME',
                    message: '파일명에 특수 문자가 많이 포함되어 있습니다',
                },
            };
        }

        return { valid: true };
    }

    /**
     * 매직 바이트 검증
     */
    private validateMagicBytes(
        extension: string,
        buffer: ArrayBuffer
    ): { valid: boolean; error?: ValidationError } {
        const format = this.SUPPORTED_FORMATS.get(extension.toLowerCase());
        if (!format || !format.magicBytes) {
            return { valid: true }; // 매직 바이트 정보가 없으면 통과
        }

        const bytes = new Uint8Array(buffer);
        const offset = format.magicOffset || 0;

        // 버퍼가 너무 작은 경우
        if (bytes.length < offset + format.magicBytes.length) {
            return {
                valid: false,
                error: {
                    code: 'INVALID_FILE_STRUCTURE',
                    message: '파일 구조가 올바르지 않습니다',
                    field: 'format',
                },
            };
        }

        // 매직 바이트 확인
        const magicMatch = format.magicBytes.every((byte, index) => bytes[offset + index] === byte);

        // 대체 매직 바이트 확인 (MP3 등)
        let alternativeMatch = false;
        if (!magicMatch && format.alternativeMagic) {
            alternativeMatch = format.alternativeMagic.every(
                (byte, index) => bytes[offset + index] === byte
            );
        }

        if (!magicMatch && !alternativeMatch) {
            return {
                valid: false,
                error: {
                    code: 'INVALID_FORMAT',
                    message: `파일 내용이 예상된 ${extension.toUpperCase()} 형식과 일치하지 않습니다`,
                    field: 'format',
                },
            };
        }

        return { valid: true };
    }

    /**
     * 메타데이터 추출
     */
    private extractMetadata(file: TFile, buffer?: ArrayBuffer): FileMetadata {
        const metadata: FileMetadata = {
            path: file.path,
            name: file.name,
            extension: file.extension,
            size: file.stat.size,
            sizeFormatted: this.formatFileSize(file.stat.size),
            created: new Date(file.stat.ctime),
            modified: new Date(file.stat.mtime),
        };

        // MIME 타입 설정
        const format = this.SUPPORTED_FORMATS.get(file.extension.toLowerCase());
        if (format && format.mimeTypes.length > 0) {
            metadata.mimeType = format.mimeTypes[0];
        }

        // 오디오 길이 추출 시도 (간단한 추정)
        if (buffer) {
            metadata.duration = this.estimateAudioDuration(file.extension, buffer);
        }

        return metadata;
    }

    /**
     * 오디오 길이 추정 (간단한 구현)
     */
    private estimateAudioDuration(extension: string, buffer: ArrayBuffer): number | undefined {
        // 실제 구현에서는 오디오 메타데이터 파서를 사용해야 함
        // 여기서는 대략적인 추정만 제공

        const fileSizeKB = buffer.byteLength / 1024;

        // 평균 비트레이트 기반 추정 (매우 부정확함)
        const avgBitrates: Record<string, number> = {
            mp3: 128, // kbps
            m4a: 256,
            wav: 1411,
            ogg: 192,
        };

        const bitrate = avgBitrates[extension.toLowerCase()];
        if (bitrate) {
            // duration in seconds = (file size in KB * 8) / bitrate
            return Math.round((fileSizeKB * 8) / bitrate);
        }

        return undefined;
    }

    /**
     * 파일 크기 포맷팅
     */
    private formatFileSize(bytes: number): string {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }

    /**
     * 빠른 검증 (버퍼 없이)
     */
    quickValidate(file: TFile): Promise<ValidationResult> {
        return this.validate(file);
    }

    /**
     * 전체 검증 (버퍼 포함)
     */
    fullValidate(file: TFile, buffer: ArrayBuffer): Promise<ValidationResult> {
        return this.validate(file, buffer);
    }

    /**
     * 지원 형식 확인
     */
    isSupportedFormat(extension: string): boolean {
        return this.SUPPORTED_FORMATS.has(extension.toLowerCase());
    }

    /**
     * 지원 형식 목록 반환
     */
    getSupportedFormats(): string[] {
        return Array.from(this.SUPPORTED_FORMATS.keys());
    }
}

interface FormatInfo {
    mimeTypes: string[];
    magicBytes?: number[];
    magicOffset?: number;
    alternativeMagic?: number[];
}
