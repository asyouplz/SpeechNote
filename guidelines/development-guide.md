# 옵시디언 음성-텍스트 변환 플러그인 개발 가이드

## 목차
1. [옵시디언 플러그인 개발 가이드라인](#1-옵시디언-플러그인-개발-가이드라인)
2. [TypeScript 프로젝트 구조 베스트 프랙티스](#2-typescript-프로젝트-구조-베스트-프랙티스)
3. [Whisper API 통합 방법론](#3-whisper-api-통합-방법론)
4. [코드 컨벤션 및 스타일 가이드](#4-코드-컨벤션-및-스타일-가이드)

---

## 1. 옵시디언 플러그인 개발 가이드라인

### 1.1 플러그인 구조 및 아키텍처 베스트 프랙티스

#### 핵심 구조
```typescript
// main.ts - 플러그인 진입점
export default class SpeechToTextPlugin extends Plugin {
    settings: SpeechToTextSettings;
    
    async onload() {
        // 플러그인 초기화
        await this.loadSettings();
        this.addCommand({...});
        this.addSettingTab(new SpeechToTextSettingTab(this.app, this));
    }
    
    async onunload() {
        // 리소스 정리
    }
}
```

#### 아키텍처 원칙
1. **관심사 분리 (Separation of Concerns)**
   - UI 로직과 비즈니스 로직 분리
   - API 통신 로직을 별도 서비스로 추상화
   - 설정 관리를 독립적인 모듈로 구성

2. **의존성 주입 (Dependency Injection)**
   ```typescript
   class WhisperService {
       constructor(
           private apiKey: string,
           private httpClient: HttpClient
       ) {}
   }
   ```

3. **이벤트 기반 통신**
   - 옵시디언 이벤트 시스템 활용
   - 커스텀 이벤트 정의 및 처리

### 1.2 옵시디언 API 사용 방법

#### 주요 API 인터페이스
```typescript
// 파일 시스템 접근
const file = this.app.vault.getAbstractFileByPath(path);
const content = await this.app.vault.read(file as TFile);

// 에디터 조작
const editor = this.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
editor?.replaceSelection(text);

// 모달 및 UI
class TranscriptionModal extends Modal {
    constructor(app: App) {
        super(app);
    }
    
    onOpen() {
        const {contentEl} = this;
        contentEl.setText('Processing...');
    }
}

// 설정 저장
await this.saveData(this.settings);
```

#### 권장 API 사용 패턴
1. **비동기 작업 처리**
   ```typescript
   async processAudioFile(file: TFile): Promise<string> {
       try {
           const arrayBuffer = await this.app.vault.readBinary(file);
           return await this.transcribeAudio(arrayBuffer);
       } catch (error) {
           new Notice(`Error: ${error.message}`);
           throw error;
       }
   }
   ```

2. **파일 링크 처리**
   ```typescript
   // 내부 링크 파싱
   const linkpath = this.app.metadataCache.getFirstLinkpathDest(
       linktext, 
       sourcePath
   );
   ```

### 1.3 플러그인 생명주기 관리

#### 생명주기 메서드
```typescript
class SpeechToTextPlugin extends Plugin {
    async onload() {
        console.log('Loading Speech-to-Text plugin');
        
        // 1. 설정 로드
        await this.loadSettings();
        
        // 2. 커맨드 등록
        this.registerCommands();
        
        // 3. 이벤트 리스너 등록
        this.registerEventHandlers();
        
        // 4. UI 컴포넌트 초기화
        this.initializeUI();
    }
    
    onunload() {
        console.log('Unloading Speech-to-Text plugin');
        
        // 1. 이벤트 리스너 제거
        this.cleanupEventHandlers();
        
        // 2. 진행 중인 작업 취소
        this.cancelPendingOperations();
        
        // 3. 리소스 정리
        this.cleanup();
    }
}
```

#### 리소스 관리 베스트 프랙티스
1. **메모리 누수 방지**
   - 모든 이벤트 리스너를 `registerEvent()`로 등록
   - DOM 요소 참조를 적절히 해제

2. **상태 영속성**
   ```typescript
   private async loadSettings() {
       this.settings = Object.assign(
           {}, 
           DEFAULT_SETTINGS, 
           await this.loadData()
       );
   }
   ```

---

## 2. TypeScript 프로젝트 구조 베스트 프랙티스

### 2.1 디렉토리 구조 권장사항

```
speech-to-text-plugin/
├── src/
│   ├── main.ts                 # 플러그인 진입점
│   ├── settings/
│   │   ├── Settings.ts          # 설정 데이터 모델
│   │   └── SettingTab.ts        # 설정 UI
│   ├── services/
│   │   ├── WhisperService.ts    # Whisper API 클라이언트
│   │   ├── AudioProcessor.ts    # 오디오 파일 처리
│   │   └── TranscriptionService.ts # 변환 비즈니스 로직
│   ├── ui/
│   │   ├── TranscriptionModal.ts # 변환 진행 모달
│   │   ├── FilePicker.ts        # 파일 선택 UI
│   │   └── StatusBar.ts         # 상태 표시
│   ├── utils/
│   │   ├── FileUtils.ts         # 파일 유틸리티
│   │   ├── TextFormatter.ts     # 텍스트 포맷팅
│   │   └── ErrorHandler.ts      # 에러 처리
│   ├── types/
│   │   ├── index.ts             # 타입 정의
│   │   └── whisper.d.ts         # Whisper API 타입
│   └── constants/
│       └── index.ts             # 상수 정의
├── tests/
│   ├── unit/
│   └── integration/
├── styles.css                   # 플러그인 스타일
├── manifest.json                # 플러그인 메타데이터
├── versions.json                # 버전 히스토리
├── tsconfig.json                # TypeScript 설정
├── package.json                 # 프로젝트 설정
└── esbuild.config.mjs          # 빌드 설정
```

### 2.2 모듈 구성 방법

#### 모듈 설계 원칙
1. **단일 책임 원칙 (Single Responsibility)**
   ```typescript
   // AudioProcessor.ts - 오디오 처리만 담당
   export class AudioProcessor {
       async validateFormat(file: File): Promise<boolean> {
           return file.name.endsWith('.m4a');
       }
       
       async convertToBase64(arrayBuffer: ArrayBuffer): Promise<string> {
           // Base64 변환 로직
       }
   }
   ```

2. **인터페이스 기반 설계**
   ```typescript
   // types/index.ts
   export interface ITranscriptionService {
       transcribe(audio: ArrayBuffer): Promise<string>;
       cancel(): void;
   }
   
   export interface IWhisperConfig {
       apiKey: string;
       model: 'whisper-1';
       language?: string;
       temperature?: number;
   }
   ```

3. **배럴 익스포트 (Barrel Exports)**
   ```typescript
   // services/index.ts
   export { WhisperService } from './WhisperService';
   export { AudioProcessor } from './AudioProcessor';
   export { TranscriptionService } from './TranscriptionService';
   ```

### 2.3 타입 정의 전략

#### 타입 정의 베스트 프랙티스
```typescript
// types/index.ts

// 1. 도메인 모델 정의
export interface AudioFile {
    path: string;
    name: string;
    size: number;
    format: 'M4A';
    duration?: number;
}

// 2. API 응답 타입
export interface WhisperResponse {
    text: string;
    language?: string;
    duration?: number;
    segments?: TranscriptionSegment[];
}

// 3. 설정 타입
export interface SpeechToTextSettings {
    apiKey: string;
    model: WhisperModel;
    language: LanguageCode;
    autoInsert: boolean;
    timestampFormat: TimestampFormat;
}

// 4. 유니온 타입 활용
export type TranscriptionStatus = 
    | 'idle' 
    | 'processing' 
    | 'completed' 
    | 'error';

// 5. 제네릭 활용
export interface Result<T> {
    success: boolean;
    data?: T;
    error?: Error;
}

// 6. 유틸리티 타입 활용
export type PartialSettings = Partial<SpeechToTextSettings>;
export type RequiredApiConfig = Required<Pick<IWhisperConfig, 'apiKey' | 'model'>>;
```

#### 타입 가드 구현
```typescript
// Type Guards
export function isAudioFile(file: any): file is AudioFile {
    return file && 
           typeof file.path === 'string' &&
           file.format === 'M4A';
}

export function isWhisperError(error: any): error is WhisperAPIError {
    return error && 
           error.code && 
           typeof error.code === 'string';
}
```

---

## 3. Whisper API 통합 방법론

### 3.1 OpenAI Whisper API 연동 방법

#### API 클라이언트 구현
```typescript
// services/WhisperService.ts
import { requestUrl, RequestUrlParam } from 'obsidian';

export class WhisperService {
    private readonly API_ENDPOINT = 'https://api.openai.com/v1/audio/transcriptions';
    private abortController?: AbortController;
    
    constructor(private apiKey: string) {}
    
    async transcribe(
        audioBuffer: ArrayBuffer, 
        options?: TranscriptionOptions
    ): Promise<WhisperResponse> {
        this.abortController = new AbortController();
        
        const formData = new FormData();
        const audioBlob = new Blob([audioBuffer], { type: 'audio/m4a' });
        
        formData.append('file', audioBlob, 'audio.m4a');
        formData.append('model', options?.model || 'whisper-1');
        
        if (options?.language) {
            formData.append('language', options.language);
        }
        
        if (options?.prompt) {
            formData.append('prompt', options.prompt);
        }
        
        const requestParams: RequestUrlParam = {
            url: this.API_ENDPOINT,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
            },
            body: formData,
            throw: false
        };
        
        try {
            const response = await requestUrl(requestParams);
            
            if (response.status !== 200) {
                throw new WhisperAPIError(
                    `API returned status ${response.status}`,
                    response.status
                );
            }
            
            return response.json;
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Transcription cancelled');
            }
            throw error;
        }
    }
    
    cancel(): void {
        this.abortController?.abort();
    }
}
```

### 3.2 음성 파일 처리 및 업로드 전략

#### 파일 처리 파이프라인
```typescript
// services/AudioProcessor.ts
export class AudioProcessor {
    private readonly MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
    private readonly SUPPORTED_FORMATS = ['.m4a', '.mp3', '.wav', '.mp4'];
    
    async processAudioFile(file: TFile, vault: Vault): Promise<ProcessedAudio> {
        // 1. 파일 검증
        await this.validateFile(file);
        
        // 2. 파일 읽기
        const arrayBuffer = await vault.readBinary(file);
        
        // 3. 크기 검증
        if (arrayBuffer.byteLength > this.MAX_FILE_SIZE) {
            throw new Error(`File size exceeds ${this.MAX_FILE_SIZE / 1024 / 1024}MB limit`);
        }
        
        // 4. 메타데이터 추출
        const metadata = await this.extractMetadata(arrayBuffer);
        
        return {
            buffer: arrayBuffer,
            metadata,
            originalFile: file
        };
    }
    
    private async validateFile(file: TFile): Promise<void> {
        const extension = file.extension.toLowerCase();
        
        if (!this.SUPPORTED_FORMATS.includes(`.${extension}`)) {
            throw new Error(
                `Unsupported format: ${extension}. ` +
                `Supported formats: ${this.SUPPORTED_FORMATS.join(', ')}`
            );
        }
    }
    
    // 청크 업로드 전략 (대용량 파일)
    async uploadInChunks(
        audioBuffer: ArrayBuffer, 
        chunkSize: number = 5 * 1024 * 1024
    ): Promise<void> {
        const totalChunks = Math.ceil(audioBuffer.byteLength / chunkSize);
        
        for (let i = 0; i < totalChunks; i++) {
            const start = i * chunkSize;
            const end = Math.min(start + chunkSize, audioBuffer.byteLength);
            const chunk = audioBuffer.slice(start, end);
            
            // 청크 업로드 로직
            await this.uploadChunk(chunk, i, totalChunks);
        }
    }
}
```

### 3.3 API 키 관리 및 보안 고려사항

#### 안전한 API 키 저장
```typescript
// settings/Settings.ts
export class SettingsManager {
    private settings: SpeechToTextSettings;
    
    async saveApiKey(apiKey: string): Promise<void> {
        // 1. API 키 검증
        if (!this.isValidApiKey(apiKey)) {
            throw new Error('Invalid API key format');
        }
        
        // 2. 암호화된 저장 (옵시디언 내부 저장소 활용)
        this.settings.apiKey = apiKey;
        await this.plugin.saveData(this.settings);
        
        // 3. 메모리에서 안전하게 관리
        this.secureApiKey();
    }
    
    private isValidApiKey(key: string): boolean {
        // OpenAI API 키 형식 검증
        return /^sk-[A-Za-z0-9]{48}$/.test(key);
    }
    
    private secureApiKey(): void {
        // API 키를 메모리에서 안전하게 관리
        Object.defineProperty(this.settings, 'apiKey', {
            configurable: false,
            enumerable: false,
            writable: true
        });
    }
    
    getApiKey(): string {
        if (!this.settings.apiKey) {
            throw new Error('API key not configured');
        }
        return this.settings.apiKey;
    }
}
```

#### 보안 베스트 프랙티스
1. **API 키 노출 방지**
   ```typescript
   // 로깅 시 API 키 마스킹
   function maskApiKey(key: string): string {
       if (!key) return '';
       const visibleChars = 4;
       return key.substring(0, visibleChars) + 
              '*'.repeat(key.length - visibleChars * 2) + 
              key.substring(key.length - visibleChars);
   }
   ```

2. **환경별 설정 분리**
   ```typescript
   interface SecurityConfig {
       enableHttps: boolean;
       validateCertificate: boolean;
       requestTimeout: number;
       maxRetries: number;
   }
   
   const SECURITY_CONFIG: SecurityConfig = {
       enableHttps: true,
       validateCertificate: true,
       requestTimeout: 30000,
       maxRetries: 3
   };
   ```

### 3.4 오류 처리 및 재시도 메커니즘

#### 강건한 에러 처리
```typescript
// utils/ErrorHandler.ts
export class ErrorHandler {
    private readonly MAX_RETRIES = 3;
    private readonly RETRY_DELAYS = [1000, 2000, 4000]; // 지수 백오프
    
    async withRetry<T>(
        operation: () => Promise<T>,
        options?: RetryOptions
    ): Promise<T> {
        const maxRetries = options?.maxRetries || this.MAX_RETRIES;
        let lastError: Error;
        
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error as Error;
                
                // 재시도 불가능한 에러 체크
                if (this.isNonRetryableError(error)) {
                    throw error;
                }
                
                // 재시도 전 대기
                if (attempt < maxRetries - 1) {
                    const delay = this.RETRY_DELAYS[attempt] || 5000;
                    await this.delay(delay);
                    
                    // 사용자에게 재시도 알림
                    new Notice(`Retrying... (${attempt + 1}/${maxRetries})`);
                }
            }
        }
        
        throw new Error(`Operation failed after ${maxRetries} attempts: ${lastError.message}`);
    }
    
    private isNonRetryableError(error: any): boolean {
        // 401, 403: 인증 에러
        // 400: 잘못된 요청
        const nonRetryableStatuses = [400, 401, 403];
        return error.status && nonRetryableStatuses.includes(error.status);
    }
    
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// 커스텀 에러 클래스
export class WhisperAPIError extends Error {
    constructor(
        message: string,
        public status?: number,
        public code?: string
    ) {
        super(message);
        this.name = 'WhisperAPIError';
    }
}

export class AudioProcessingError extends Error {
    constructor(message: string, public file?: TFile) {
        super(message);
        this.name = 'AudioProcessingError';
    }
}
```

#### 에러 로깅 및 모니터링
```typescript
// utils/Logger.ts
export class Logger {
    private readonly LOG_LEVELS = {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3
    };
    
    error(message: string, error?: Error, context?: any): void {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level: 'ERROR',
            message,
            error: error ? {
                name: error.name,
                message: error.message,
                stack: error.stack
            } : undefined,
            context
        };
        
        console.error('[Speech-to-Text]', logEntry);
        
        // 사용자 친화적 에러 메시지
        this.notifyUser(message, error);
    }
    
    private notifyUser(message: string, error?: Error): void {
        let userMessage = message;
        
        if (error instanceof WhisperAPIError) {
            if (error.status === 429) {
                userMessage = 'API rate limit exceeded. Please try again later.';
            } else if (error.status === 401) {
                userMessage = 'Invalid API key. Please check your settings.';
            }
        }
        
        new Notice(userMessage, 5000);
    }
}
```

---

## 4. 코드 컨벤션 및 스타일 가이드

### 4.1 네이밍 컨벤션

#### 일반 규칙
```typescript
// 클래스: PascalCase
class AudioTranscriber { }

// 인터페이스: PascalCase with 'I' prefix (선택적)
interface ITranscriptionService { }
interface TranscriptionOptions { }  // 'I' prefix 없이도 가능

// 타입 별칭: PascalCase
type TranscriptionResult = { text: string; confidence: number };

// 열거형: PascalCase (값은 UPPER_SNAKE_CASE)
enum TranscriptionStatus {
    IDLE = 'idle',
    PROCESSING = 'processing',
    COMPLETED = 'completed',
    ERROR = 'error'
}

// 함수/메서드: camelCase
function transcribeAudio(file: TFile): Promise<string> { }

// 변수/매개변수: camelCase
const audioFile = await vault.read(file);
let isProcessing = false;

// 상수: UPPER_SNAKE_CASE
const MAX_FILE_SIZE = 25 * 1024 * 1024;
const API_ENDPOINT = 'https://api.openai.com/v1/audio/transcriptions';

// Private 멤버: underscore prefix (선택적)
private _apiKey: string;
private _isInitialized = false;

// 파일명
// - 클래스/인터페이스: PascalCase (예: WhisperService.ts)
// - 유틸리티/헬퍼: camelCase (예: fileUtils.ts)
// - 인덱스 파일: index.ts
// - 설정 파일: kebab-case (예: esbuild.config.mjs)
```

#### 의미있는 이름 사용
```typescript
// 나쁜 예
const d = new Date();
const u = users.filter(u => u.a > 18);

// 좋은 예
const currentDate = new Date();
const adultUsers = users.filter(user => user.age > 18);

// 불린 변수는 is/has/can으로 시작
const isLoading = true;
const hasPermission = false;
const canEdit = true;

// 배열은 복수형 사용
const files: TFile[] = [];
const transcriptions: string[] = [];

// 함수는 동작을 설명
async function fetchTranscription(audioId: string): Promise<string> { }
function validateApiKey(key: string): boolean { }
function handleError(error: Error): void { }
```

### 4.2 코드 포맷팅 규칙

#### Prettier 설정
```json
// .prettierrc
{
    "semi": true,
    "trailingComma": "es5",
    "singleQuote": true,
    "printWidth": 100,
    "tabWidth": 4,
    "useTabs": false,
    "bracketSpacing": true,
    "arrowParens": "always",
    "endOfLine": "lf"
}
```

#### ESLint 설정
```json
// .eslintrc.json
{
    "extends": [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:prettier/recommended"
    ],
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
        "ecmaVersion": 2022,
        "sourceType": "module"
    },
    "rules": {
        "@typescript-eslint/explicit-function-return-type": "warn",
        "@typescript-eslint/no-explicit-any": "error",
        "@typescript-eslint/no-unused-vars": ["error", { 
            "argsIgnorePattern": "^_" 
        }],
        "no-console": ["warn", { 
            "allow": ["warn", "error"] 
        }],
        "prefer-const": "error",
        "no-var": "error"
    }
}
```

#### 코드 구조화
```typescript
// 임포트 순서
// 1. 외부 라이브러리
import { Plugin, TFile, Notice } from 'obsidian';
import { debounce } from 'lodash';

// 2. 내부 모듈 (절대 경로)
import { WhisperService } from 'src/services/WhisperService';
import { AudioProcessor } from 'src/services/AudioProcessor';

// 3. 상대 경로 임포트
import { TranscriptionModal } from './ui/TranscriptionModal';
import { Settings } from './settings/Settings';

// 4. 타입 임포트
import type { TranscriptionOptions, WhisperResponse } from './types';

// 클래스 구조
export class TranscriptionService {
    // 1. Static 멤버
    static readonly VERSION = '1.0.0';
    
    // 2. Private 필드
    private apiKey: string;
    private isProcessing = false;
    
    // 3. Public 필드
    public settings: Settings;
    
    // 4. 생성자
    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }
    
    // 5. Public 메서드
    async transcribe(file: TFile): Promise<string> {
        // 구현
    }
    
    // 6. Private 메서드
    private validateFile(file: TFile): void {
        // 구현
    }
    
    // 7. Static 메서드
    static create(config: Config): TranscriptionService {
        return new TranscriptionService(config.apiKey);
    }
}
```

### 4.3 주석 작성 가이드라인

#### JSDoc 주석
```typescript
/**
 * 음성 파일을 텍스트로 변환합니다.
 * 
 * @param file - 변환할 오디오 파일 (m4a 형식)
 * @param options - 변환 옵션
 * @returns 변환된 텍스트
 * @throws {AudioProcessingError} 파일 처리 실패 시
 * @throws {WhisperAPIError} API 호출 실패 시
 * 
 * @example
 * ```typescript
 * const text = await transcriber.transcribe(audioFile, {
 *     language: 'ko',
 *     model: 'whisper-1'
 * });
 * ```
 */
async transcribe(
    file: TFile, 
    options?: TranscriptionOptions
): Promise<string> {
    // 구현
}

/**
 * Whisper API 서비스 클래스
 * 
 * OpenAI Whisper API와 통신하여 음성을 텍스트로 변환합니다.
 * 
 * @remarks
 * API 키는 설정에서 관리되며, 각 요청마다 자동으로 포함됩니다.
 * 
 * @see {@link https://platform.openai.com/docs/guides/speech-to-text}
 */
export class WhisperService {
    // 구현
}
```

#### 인라인 주석
```typescript
async processAudioFile(file: TFile): Promise<ProcessedAudio> {
    // 파일 형식 검증 - m4a만 지원
    if (!file.name.endsWith('.m4a')) {
        throw new Error('Only M4A files are supported');
    }
    
    // ArrayBuffer로 변환하여 API 전송 준비
    const buffer = await this.app.vault.readBinary(file);
    
    // TODO: 향후 다른 오디오 형식 지원 추가
    // NOTE: 파일 크기 제한은 25MB (Whisper API 제한)
    
    /* 
     * 메타데이터 추출 로직
     * - 파일 크기
     * - 녹음 시간
     * - 비트레이트
     */
    const metadata = await this.extractMetadata(buffer);
    
    return { buffer, metadata };
}
```

#### 주석 작성 원칙
1. **What이 아닌 Why 설명**
   ```typescript
   // 나쁜 예: i를 1 증가
   i++;
   
   // 좋은 예: 헤더 행을 건너뛰기 위해 인덱스 증가
   i++; // Skip header row
   ```

2. **복잡한 비즈니스 로직 설명**
   ```typescript
   // Whisper API는 최대 25MB 파일만 지원하므로
   // 더 큰 파일은 청크로 나누어 처리
   if (fileSize > MAX_FILE_SIZE) {
       return this.processInChunks(file);
   }
   ```

3. **TODO/FIXME/NOTE 활용**
   ```typescript
   // TODO: 캐싱 메커니즘 구현 (v2.0)
   // FIXME: 큰 파일에서 메모리 누수 발생 가능
   // NOTE: API 키 형식이 변경될 수 있음
   // HACK: 임시 해결책 - 추후 리팩토링 필요
   ```

---

## 부록: 개발 환경 설정

### package.json 설정
```json
{
    "name": "obsidian-speech-to-text",
    "version": "1.0.0",
    "description": "Convert audio recordings to text in Obsidian",
    "main": "main.js",
    "scripts": {
        "dev": "node esbuild.config.mjs",
        "build": "tsc -noEmit -skipLibCheck && node esbuild.config.mjs production",
        "lint": "eslint src/**/*.ts",
        "format": "prettier --write 'src/**/*.{ts,tsx}'",
        "test": "jest",
        "version": "node version-bump.mjs && git add manifest.json versions.json"
    },
    "keywords": [
        "obsidian",
        "plugin",
        "speech-to-text",
        "whisper",
        "transcription"
    ],
    "author": "Your Name",
    "license": "MIT",
    "devDependencies": {
        "@types/node": "^16.11.6",
        "@typescript-eslint/eslint-plugin": "5.29.0",
        "@typescript-eslint/parser": "5.29.0",
        "builtin-modules": "3.3.0",
        "esbuild": "0.17.3",
        "obsidian": "latest",
        "tslib": "2.4.0",
        "typescript": "4.7.4",
        "eslint": "^8.42.0",
        "prettier": "^2.8.8",
        "jest": "^29.5.0"
    }
}
```

### tsconfig.json 설정
```json
{
    "compilerOptions": {
        "baseUrl": ".",
        "inlineSourceMap": true,
        "inlineSources": true,
        "module": "ESNext",
        "target": "ES6",
        "allowJs": true,
        "noImplicitAny": true,
        "moduleResolution": "node",
        "importHelpers": true,
        "isolatedModules": true,
        "strictNullChecks": true,
        "strict": true,
        "lib": [
            "DOM",
            "ES5",
            "ES6",
            "ES7"
        ],
        "paths": {
            "src/*": ["src/*"]
        }
    },
    "include": [
        "src/**/*.ts"
    ]
}
```

### esbuild.config.mjs 설정
```javascript
import esbuild from "esbuild";
import process from "process";
import builtins from "builtin-modules";

const banner = `/*
THIS IS A GENERATED/BUNDLED FILE BY ESBUILD
if you want to view the source, please visit the github repository of this plugin
*/`;

const prod = (process.argv[2] === "production");

const context = await esbuild.context({
    banner: {
        js: banner,
    },
    entryPoints: ["src/main.ts"],
    bundle: true,
    external: [
        "obsidian",
        "electron",
        "@codemirror/autocomplete",
        "@codemirror/collab",
        "@codemirror/commands",
        "@codemirror/language",
        "@codemirror/lint",
        "@codemirror/search",
        "@codemirror/state",
        "@codemirror/view",
        "@lezer/common",
        "@lezer/highlight",
        "@lezer/lr",
        ...builtins
    ],
    format: "cjs",
    target: "es2018",
    logLevel: "info",
    sourcemap: prod ? false : "inline",
    treeShaking: true,
    outfile: "main.js",
});

if (prod) {
    await context.rebuild();
    process.exit(0);
} else {
    await context.watch();
}
```

---

## 개발 체크리스트

### 초기 설정
- [ ] Node.js 및 npm 설치 확인
- [ ] 옵시디언 개발 환경 설정
- [ ] 프로젝트 초기화 (`npm init`)
- [ ] TypeScript 설정
- [ ] ESLint/Prettier 설정
- [ ] 빌드 도구 설정

### 핵심 기능 구현
- [ ] 플러그인 기본 구조 생성
- [ ] 설정 관리 시스템 구현
- [ ] Whisper API 클라이언트 구현
- [ ] 오디오 파일 처리 로직
- [ ] UI 컴포넌트 개발
- [ ] 에러 처리 시스템

### 품질 보증
- [ ] 단위 테스트 작성
- [ ] 통합 테스트 수행
- [ ] 코드 리뷰
- [ ] 성능 최적화
- [ ] 보안 검토

### 배포 준비
- [ ] 문서화 완료
- [ ] manifest.json 작성
- [ ] 릴리스 노트 작성
- [ ] 커뮤니티 플러그인 제출

---

## 참고 자료

### 공식 문서
- [Obsidian Plugin Developer Documentation](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- [OpenAI Whisper API Documentation](https://platform.openai.com/docs/guides/speech-to-text)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)

### 유용한 리소스
- [Obsidian Plugin Template](https://github.com/obsidianmd/obsidian-sample-plugin)
- [Obsidian API Reference](https://github.com/obsidianmd/obsidian-api)
- [ESBuild Documentation](https://esbuild.github.io/)

### 커뮤니티
- [Obsidian Forum - Plugin Development](https://forum.obsidian.md/c/developers-api/14)
- [Obsidian Discord - Plugin Development Channel](https://discord.gg/obsidianmd)

---

*이 가이드는 지속적으로 업데이트되며, 프로젝트 진행에 따라 내용이 추가될 수 있습니다.*

*최종 업데이트: 2025-08-22*