/**
 * Whisper API 통합 예제 코드
 * OpenAI Whisper API와의 완전한 통합 예제
 */

import { requestUrl, RequestUrlParam } from 'obsidian';

/**
 * Whisper API 클라이언트 예제
 */
export class WhisperAPIExample {
    private readonly API_ENDPOINT = 'https://api.openai.com/v1/audio/transcriptions';
    private abortController?: AbortController;

    constructor(private apiKey: string) {}

    /**
     * 기본 변환 예제
     */
    async basicTranscription(audioBuffer: ArrayBuffer): Promise<string> {
        const formData = new FormData();
        const audioBlob = new Blob([audioBuffer], { type: 'audio/m4a' });
        
        formData.append('file', audioBlob, 'audio.m4a');
        formData.append('model', 'whisper-1');

        const response = await requestUrl({
            url: this.API_ENDPOINT,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: formData,
            throw: false
        });

        if (response.status === 200) {
            return response.json.text;
        } else {
            throw new Error(`API error: ${response.status}`);
        }
    }

    /**
     * 고급 변환 예제 (모든 옵션 포함)
     */
    async advancedTranscription(
        audioBuffer: ArrayBuffer,
        options: TranscriptionOptions
    ): Promise<TranscriptionResult> {
        // 요청 준비
        this.abortController = new AbortController();
        const formData = this.buildFormData(audioBuffer, options);

        // 타이머 시작
        const startTime = Date.now();

        try {
            // API 호출
            const response = await this.makeRequest(formData);
            
            // 응답 처리
            const result = await this.processResponse(response);
            
            // 처리 시간 계산
            const processingTime = Date.now() - startTime;
            
            return {
                ...result,
                processingTime,
                success: true
            };
        } catch (error) {
            // 에러 처리
            return this.handleError(error as Error);
        } finally {
            this.abortController = undefined;
        }
    }

    /**
     * FormData 구성
     */
    private buildFormData(
        audioBuffer: ArrayBuffer,
        options: TranscriptionOptions
    ): FormData {
        const formData = new FormData();
        
        // 오디오 파일
        const mimeType = this.getMimeType(options.format || 'm4a');
        const blob = new Blob([audioBuffer], { type: mimeType });
        const filename = `audio.${options.format || 'm4a'}`;
        formData.append('file', blob, filename);
        
        // 모델 (필수)
        formData.append('model', 'whisper-1');
        
        // 언어 (선택)
        if (options.language && options.language !== 'auto') {
            formData.append('language', options.language);
        }
        
        // 프롬프트 (선택)
        if (options.prompt) {
            // 프롬프트는 최대 224 토큰 (약 896 문자)
            const truncatedPrompt = options.prompt.substring(0, 896);
            formData.append('prompt', truncatedPrompt);
        }
        
        // 온도 (선택, 0.0 ~ 1.0)
        if (options.temperature !== undefined) {
            const temp = Math.max(0, Math.min(1, options.temperature));
            formData.append('temperature', temp.toString());
        }
        
        // 응답 형식 (선택)
        const responseFormat = options.responseFormat || 'json';
        formData.append('response_format', responseFormat);
        
        // 타임스탬프 (verbose_json에서만)
        if (responseFormat === 'verbose_json' && options.includeTimestamps) {
            formData.append('timestamp_granularities[]', 'segment');
            if (options.includeWordTimestamps) {
                formData.append('timestamp_granularities[]', 'word');
            }
        }
        
        return formData;
    }

    /**
     * API 요청 실행
     */
    private async makeRequest(formData: FormData): Promise<any> {
        const requestConfig: RequestUrlParam = {
            url: this.API_ENDPOINT,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                // FormData는 자동으로 Content-Type 설정
            },
            body: formData,
            throw: false,
            timeout: 30000 // 30초 타임아웃
        };

        const response = await requestUrl(requestConfig);
        
        if (response.status !== 200) {
            throw new APIError(
                response.status,
                response.json?.error?.message || 'Unknown error'
            );
        }
        
        return response;
    }

    /**
     * 응답 처리
     */
    private async processResponse(response: any): Promise<any> {
        const json = response.json;
        
        // 응답 형식에 따른 처리
        if (typeof json === 'string') {
            // text 형식
            return { text: json };
        } else if (json.segments) {
            // verbose_json 형식
            return {
                text: json.text,
                language: json.language,
                duration: json.duration,
                segments: json.segments,
                words: json.words
            };
        } else {
            // json 형식
            return {
                text: json.text,
                language: json.language
            };
        }
    }

    /**
     * 에러 처리
     */
    private handleError(error: Error): TranscriptionResult {
        console.error('Transcription error:', error);
        
        let errorMessage = 'Transcription failed';
        let errorCode = 'UNKNOWN_ERROR';
        
        if (error instanceof APIError) {
            switch (error.status) {
                case 401:
                    errorMessage = 'Invalid API key';
                    errorCode = 'AUTH_ERROR';
                    break;
                case 429:
                    errorMessage = 'Rate limit exceeded';
                    errorCode = 'RATE_LIMIT';
                    break;
                case 413:
                    errorMessage = 'File too large (max 25MB)';
                    errorCode = 'FILE_TOO_LARGE';
                    break;
                default:
                    errorMessage = error.message;
                    errorCode = `API_ERROR_${error.status}`;
            }
        }
        
        return {
            success: false,
            error: {
                message: errorMessage,
                code: errorCode
            }
        };
    }

    /**
     * MIME 타입 매핑
     */
    private getMimeType(format: string): string {
        const mimeTypes: Record<string, string> = {
            'm4a': 'audio/mp4',
            'mp3': 'audio/mpeg',
            'wav': 'audio/wav',
            'mp4': 'audio/mp4',
            'webm': 'audio/webm'
        };
        
        return mimeTypes[format] || 'audio/mpeg';
    }

    /**
     * 요청 취소
     */
    cancel(): void {
        this.abortController?.abort();
    }

    /**
     * 스트리밍 변환 예제 (실험적)
     */
    async streamingTranscription(
        audioBuffer: ArrayBuffer,
        onChunk: (text: string) => void
    ): Promise<void> {
        // 현재 Whisper API는 스트리밍을 지원하지 않지만,
        // 향후 지원될 경우를 대비한 예제 구조
        
        const chunks = this.splitIntoChunks(audioBuffer, 5 * 1024 * 1024); // 5MB 청크
        
        for (let i = 0; i < chunks.length; i++) {
            const result = await this.basicTranscription(chunks[i]);
            onChunk(result);
            
            // 진행 상황 업데이트
            const progress = ((i + 1) / chunks.length) * 100;
            console.log(`Progress: ${progress.toFixed(1)}%`);
        }
    }

    /**
     * 버퍼를 청크로 분할
     */
    private splitIntoChunks(buffer: ArrayBuffer, chunkSize: number): ArrayBuffer[] {
        const chunks: ArrayBuffer[] = [];
        let offset = 0;
        
        while (offset < buffer.byteLength) {
            const size = Math.min(chunkSize, buffer.byteLength - offset);
            chunks.push(buffer.slice(offset, offset + size));
            offset += size;
        }
        
        return chunks;
    }
}

// 타입 정의
interface TranscriptionOptions {
    format?: string;
    language?: string;
    prompt?: string;
    temperature?: number;
    responseFormat?: 'json' | 'text' | 'verbose_json';
    includeTimestamps?: boolean;
    includeWordTimestamps?: boolean;
}

interface TranscriptionResult {
    success: boolean;
    text?: string;
    language?: string;
    duration?: number;
    segments?: TranscriptionSegment[];
    words?: TranscriptionWord[];
    processingTime?: number;
    error?: {
        message: string;
        code: string;
    };
}

interface TranscriptionSegment {
    id: number;
    start: number;
    end: number;
    text: string;
    temperature?: number;
}

interface TranscriptionWord {
    word: string;
    start: number;
    end: number;
}

// 커스텀 에러 클래스
class APIError extends Error {
    constructor(public status: number, message: string) {
        super(message);
        this.name = 'APIError';
    }
}

// 사용 예제
export async function exampleUsage(apiKey: string) {
    const client = new WhisperAPIExample(apiKey);
    
    // 예제 1: 기본 변환
    try {
        const audioBuffer = new ArrayBuffer(1000); // 실제 오디오 데이터
        const text = await client.basicTranscription(audioBuffer);
        console.log('Transcribed text:', text);
    } catch (error) {
        console.error('Basic transcription failed:', error);
    }
    
    // 예제 2: 고급 변환 (한국어, 타임스탬프 포함)
    try {
        const audioBuffer = new ArrayBuffer(1000);
        const result = await client.advancedTranscription(audioBuffer, {
            language: 'ko',
            responseFormat: 'verbose_json',
            includeTimestamps: true,
            includeWordTimestamps: true,
            temperature: 0.2,
            prompt: '이것은 회의 녹음입니다.'
        });
        
        if (result.success) {
            console.log('Text:', result.text);
            console.log('Language:', result.language);
            console.log('Segments:', result.segments);
            console.log('Processing time:', result.processingTime, 'ms');
        } else {
            console.error('Error:', result.error);
        }
    } catch (error) {
        console.error('Advanced transcription failed:', error);
    }
}