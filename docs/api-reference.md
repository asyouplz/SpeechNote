# API 레퍼런스 (API Reference)

## 목차
1. [개요](#개요)
2. [핵심 클래스](#핵심-클래스)
3. [서비스 인터페이스](#서비스-인터페이스)
4. [유틸리티 함수](#유틸리티-함수)
5. [타입 정의](#타입-정의)
6. [이벤트 시스템](#이벤트-시스템)
7. [에러 처리](#에러-처리)
8. [설정 옵션](#설정-옵션)

---

## 개요

이 문서는 Obsidian Speech-to-Text 플러그인의 주요 API를 설명합니다. 모든 public 클래스, 메서드, 인터페이스에 대한 상세 정보를 제공합니다.

### API 버전
- **현재 버전**: 3.0.3
- **최소 Obsidian 버전**: 0.15.0
- **TypeScript 버전**: 5.0.4
- **지원 Provider**: OpenAI Whisper, Deepgram Nova 2

---

## 핵심 클래스

### SpeechToTextPlugin

플러그인의 메인 클래스입니다.

```typescript
class SpeechToTextPlugin extends Plugin {
  settings: SpeechToTextSettings;
  
  /**
   * 플러그인 로드 시 호출됩니다.
   */
  async onload(): Promise<void>
  
  /**
   * 플러그인 언로드 시 호출됩니다.
   */
  onunload(): void
  
  /**
   * 설정을 로드합니다.
   */
  async loadSettings(): Promise<void>
  
  /**
   * 설정을 저장합니다.
   */
  async saveSettings(): Promise<void>
}
```

#### 사용 예제
```typescript
// 플러그인 인스턴스는 Obsidian이 자동으로 생성합니다
export default class MyPlugin extends SpeechToTextPlugin {
  async onload() {
    await super.onload();
    // 추가 초기화 로직
  }
}
```

---

## 서비스 인터페이스 (Service Interfaces)

### ITranscriber 인터페이스

모든 음성 변환 Provider가 구현해야 하는 공통 인터페이스입니다.

```typescript
interface ITranscriber {
  /**
   * Provider 이름
   */
  readonly name: string;
  
  /**
   * 음성을 텍스트로 변환합니다.
   * @param audio - 오디오 버퍼 데이터
   * @param options - Provider별 옵션
   * @returns 변환된 텍스트와 메타데이터
   */
  transcribe(
    audio: ArrayBuffer,
    options?: TranscriptionOptions
  ): Promise<TranscriptionResponse>;
  
  /**
   * Provider 상태를 확인합니다.
   */
  isAvailable(): Promise<boolean>;
  
  /**
   * 지원하는 파일 형식을 반환합니다.
   */
  getSupportedFormats(): string[];
  
  /**
   * 최대 파일 크기를 반환합니다.
   */
  getMaxFileSize(): number;
  
  /**
   * 진행 중인 요청을 취소합니다.
   */
  cancel(): void;
}
```

### Provider별 기능 비교

| 기능 | Whisper | Deepgram |
|-----|---------|----------|
| **최대 파일 크기** | 25MB | 2GB |
| **지원 형식** | m4a, mp3, wav, mp4 | m4a, mp3, wav, mp4, webm, ogg, flac |
| **언어 지원** | 50+ 언어 | 40+ 언어 |
| **실시간 스트리밍** | ❌ | ✅ (예정) |
| **화자 분리** | ❌ | ✅ |
| **자동 문장부호** | ✅ | ✅ |
| **단어 타임스탬프** | ✅ | ✅ |
| **API 응답 속도** | 중간 | 빠름 |
| **비용** | $0.006/분 | $0.0043/분 |

### WhisperAdapter

OpenAI Whisper API를 위한 어댑터 클래스입니다.

```typescript
class WhisperService implements IWhisperService {
  /**
   * 오디오를 텍스트로 변환합니다.
   * @param audio - 오디오 버퍼 데이터
   * @param options - Whisper API 옵션
   * @returns 변환된 텍스트와 메타데이터
   * @throws {WhisperAPIError} API 호출 실패 시
   * @throws {FileTooLargeError} 파일 크기 초과 시
   * @example
   * const result = await whisperService.transcribe(audioBuffer, {
   *   language: 'ko',
   *   responseFormat: 'verbose_json'
   * });
   */
  async transcribe(
    audio: ArrayBuffer, 
    options?: WhisperOptions
  ): Promise<WhisperResponse>;
  
  /**
   * API 키 유효성을 검증합니다.
   * @param key - OpenAI API 키
   * @returns 유효성 여부
   */
  async validateApiKey(key: string): Promise<boolean>;
  
  /**
   * 진행 중인 요청을 취소합니다.
   */
  cancel(): void;
  
  /**
   * Circuit Breaker를 리셋합니다.
   */
  resetCircuitBreaker(): void;
}
```

#### TranscriptionOptions 상세
```typescript
interface TranscriptionOptions {
  // 공통 옵션
  provider?: 'whisper' | 'deepgram' | 'auto';  // Provider 선택
  language?: string;              // 언어 코드 (ko, en, ja 등)
  
  // Whisper 전용 옵션
  model?: 'whisper-1';           // Whisper 모델
  prompt?: string;                // 컨텍스트 프롬프트 (최대 224 토큰)
  temperature?: number;           // 0-1 사이 값, 창의성 조절
  responseFormat?: 'json' | 'text' | 'verbose_json';  // 응답 형식
  
  // Deepgram 전용 옵션
  tier?: 'nova-2' | 'nova' | 'enhanced' | 'base';  // Deepgram 티어
  punctuate?: boolean;            // 자동 문장부호
  diarize?: boolean;              // 화자 분리
  smart_format?: boolean;         // 스마트 포매팅
  utterances?: boolean;           // 발화 구분
  detect_language?: boolean;      // 자동 언어 감지
}
```

### DeepgramAdapter

Deepgram Nova 2 API를 위한 어댑터 클래스입니다.

```typescript
class DeepgramAdapter implements ITranscriber {
  readonly name = 'deepgram';
  
  /**
   * Deepgram API를 사용하여 음성을 변환합니다.
   * @param audio - 오디오 버퍼
   * @param options - Deepgram 옵션
   * @example
   * const result = await deepgramAdapter.transcribe(audioBuffer, {
   *   language: 'ko',
   *   tier: 'nova-2',
   *   smart_format: true
   * });
   */
  async transcribe(
    audio: ArrayBuffer,
    options?: TranscriptionOptions
  ): Promise<TranscriptionResponse>;
  
  /**
   * 실시간 스트리밍 변환을 시작합니다.
   * @param stream - 오디오 스트림
   * @param onResult - 결과 콜백
   */
  async startStreaming(
    stream: ReadableStream,
    onResult: (result: Partial<TranscriptionResponse>) => void
  ): Promise<void>;
}
```

### ITranscriptionService

음성 변환 서비스의 인터페이스입니다.

```typescript
interface ITranscriptionService {
  /**
   * 오디오 파일을 텍스트로 변환합니다.
   * @param file - 변환할 오디오 파일
   * @returns 변환 결과
   */
  transcribe(file: TFile): Promise<TranscriptionResult>;
  
  /**
   * 진행 중인 변환을 취소합니다.
   */
  cancel(): void;
  
  /**
   * 현재 변환 상태를 반환합니다.
   */
  getStatus(): TranscriptionStatus;
}
```

#### 구현 예제
```typescript
class TranscriptionService implements ITranscriptionService {
  async transcribe(file: TFile): Promise<TranscriptionResult> {
    // 1. 파일 검증
    const isValid = await this.audioProcessor.validate(file);
    if (!isValid) {
      throw new ValidationError('Invalid audio file');
    }
    
    // 2. 오디오 처리
    const processedAudio = await this.audioProcessor.process(file);
    
    // 3. API 호출
    const response = await this.whisperService.transcribe(
      processedAudio.buffer,
      { language: this.settings.language }
    );
    
    // 4. 텍스트 포맷팅
    const formattedText = this.textFormatter.format(response.text);
    
    return {
      text: formattedText,
      language: response.language,
      duration: processedAudio.metadata.duration
    };
  }
}
```

### SettingsManager

플러그인 설정을 관리하며 API 키 암호화를 담당합니다.

```typescript
class SettingsManager implements ISettingsManager {
  /**
   * 설정을 로드합니다.
   * @returns 로드된 설정 객체
   * @example
   * const settings = await settingsManager.load();
   * console.log(settings.language); // 'ko'
   */
  async load(): Promise<PluginSettings>;
  
  /**
   * 설정을 저장합니다.
   * @param settings - 저장할 설정 객체
   */
  async save(settings: PluginSettings): Promise<void>;
  
  /**
   * 특정 설정 값을 가져옵니다.
   * @param key - 설정 키
   * @returns 설정 값
   */
  get<K extends keyof PluginSettings>(key: K): PluginSettings[K];
  
  /**
   * 특정 설정 값을 업데이트합니다.
   * @param key - 설정 키
   * @param value - 새로운 값
   */
  async set<K extends keyof PluginSettings>(
    key: K, 
    value: PluginSettings[K]
  ): Promise<void>;
  
  /**
   * API 키를 안전하게 설정합니다.
   * @param apiKey - OpenAI API 키
   * @returns 설정 성공 여부
   */
  async setApiKey(apiKey: string): Promise<boolean>;
  
  /**
   * 마스킹된 API 키를 반환합니다.
   * @returns 마스킹된 키 (예: "sk-XXXXX...XXXX")
   */
  getMaskedApiKey(): string;
  
  /**
   * 설정 유효성을 검증합니다.
   * @returns 검증 결과와 에러 목록
   */
  validateSettings(): { valid: boolean; errors: string[] };
  
  /**
   * 설정을 초기값으로 리셋합니다.
   */
  async reset(): Promise<void>;
}
```

#### PluginSettings 타입
```typescript
interface PluginSettings {
  // Provider 설정
  provider: 'whisper' | 'deepgram' | 'auto';  // Provider 선택
  openaiApiKey?: string;         // OpenAI API 키
  deepgramApiKey?: string;       // Deepgram API 키
  encryptedOpenaiKey?: string;   // 암호화된 OpenAI 키
  encryptedDeepgramKey?: string; // 암호화된 Deepgram 키
  
  // Whisper 설정
  whisperModel: 'whisper-1';     // Whisper 모델
  whisperPrompt?: string;         // Whisper 프롬프트
  whisperTemperature?: number;    // Whisper 온도
  
  // Deepgram 설정 (v3.0.3 업데이트)
  deepgramSettings: {
    model: 'nova-2' | 'nova' | 'enhanced' | 'base';  // Deepgram 모델
    language?: string;           // 언어 코드
    features: {
      punctuation?: boolean;     // 자동 문장부호
      diarization?: boolean;     // 화자 분리
      smartFormat?: boolean;     // 스마트 포매팅
      numerals?: boolean;        // 숫자 변환
      profanityFilter?: boolean; // 욕설 필터
      redaction?: string[];      // 민감정보 제거
      utterances?: boolean;      // 발화 단위 분할
      summarization?: boolean;   // 요약 생성
    };
  };
  
  // 공통 설정
  language: string;              // 기본 언어 (auto, ko, en 등)
  autoInsert: boolean;           // 자동 삽입 여부
  insertPosition: 'cursor' | 'end' | 'beginning';  // 삽입 위치
  timestampFormat: 'none' | 'inline' | 'sidebar';  // 타임스탬프 형식
  maxFileSize: number;           // 최대 파일 크기 (바이트)
  enableCache: boolean;          // 캐시 활성화
  cacheTTL: number;             // 캐시 유효 시간 (밀리초)
  enableDebugLogging: boolean;  // 디버그 로깅
  enableFallback: boolean;       // Fallback Provider 사용
  smartRouting: boolean;         // 스마트 라우팅 사용
}
```

### TranscriberFactory

Provider 선택과 인스턴스 생성을 담당하는 팩토리 클래스입니다.

```typescript
class TranscriberFactory {
  /**
   * 지정된 Provider의 인스턴스를 생성합니다.
   * @param provider - Provider 이름
   * @param settings - 설정 객체
   * @returns Transcriber 인스턴스
   */
  static create(
    provider: 'whisper' | 'deepgram' | 'auto',
    settings: PluginSettings
  ): ITranscriber;
  
  /**
   * 파일에 가장 적합한 Provider를 선택합니다.
   * @param file - 오디오 파일
   * @param settings - 설정 객체
   * @returns 최적 Provider
   */
  static selectBestProvider(
    file: TFile,
    settings: PluginSettings
  ): 'whisper' | 'deepgram';
  
  /**
   * 모든 사용 가능한 Provider를 반환합니다.
   * @param settings - 설정 객체
   * @returns 사용 가능한 Provider 목록
   */
  static getAvailableProviders(
    settings: PluginSettings
  ): string[];
}
```

### ProviderSelector

파일 특성에 따른 최적 Provider 선택 로직을 구현합니다.

```typescript
class ProviderSelector {
  /**
   * 파일 크기와 형식을 고려하여 최적 Provider를 선택합니다.
   * @param fileInfo - 파일 정보
   * @param preferences - 사용자 선호
   * @returns 추천 Provider
   */
  selectProvider(
    fileInfo: FileInfo,
    preferences: ProviderPreferences
  ): ProviderRecommendation;
  
  /**
   * Provider 성능 메트릭을 반환합니다.
   */
  getProviderMetrics(): Map<string, ProviderMetrics>;
  
  /**
   * Fallback 체인을 구성합니다.
   * @param primary - 기본 Provider
   * @returns Fallback Provider 순서
   */
  getFallbackChain(primary: string): string[];
}
```

### FileUploadManager

대용량 오디오 파일 처리 및 업로드를 관리합니다. Provider별 최적화를 지원합니다.

```typescript
class FileUploadManager {
  /**
   * 오디오 파일을 준비하고 처리합니다.
   * @param file - 처리할 오디오 파일
   * @param onProgress - 진행 상황 콜백
   * @returns 처리된 오디오 데이터
   * @throws {Error} 파일 검증 실패 시
   * @example
   * const processed = await uploadManager.prepareAudioFile(file, (progress) => {
   *   console.log(`${progress.percentage}% - ${progress.message}`);
   * });
   */
  async prepareAudioFile(
    file: TFile,
    onProgress?: ProgressCallback
  ): Promise<ProcessedAudioFile>;
  
  /**
   * 청크 단위로 파일을 업로드합니다.
   * @param buffer - 업로드할 버퍼
   * @param chunkSize - 청크 크기 (기본 5MB)
   * @yields 각 청크 데이터
   */
  async *uploadInChunks(
    buffer: ArrayBuffer,
    chunkSize?: number
  ): AsyncGenerator<ArrayBuffer, void, unknown>;
  
  /**
   * 진행 중인 업로드를 취소합니다.
   */
  cancel(): void;
  
  /**
   * 리소스를 정리합니다.
   */
  cleanup(): void;
}
```

#### ProcessedAudioFile 타입
```typescript
interface ProcessedAudioFile {
  buffer: ArrayBuffer;           // 처리된 오디오 버퍼
  metadata: AudioFileMetadata;   // 파일 메타데이터
  compressed: boolean;           // 압축 여부
  originalSize: number;          // 원본 크기 (바이트)
  processedSize: number;         // 처리 후 크기 (바이트)
}

interface AudioFileMetadata {
  name: string;                  // 파일명
  path: string;                  // 파일 경로
  extension: string;             // 확장자
  mimeType: string;              // MIME 타입
  duration?: number;             // 재생 시간 (초)
  sampleRate?: number;           // 샘플링 레이트
  bitrate?: number;              // 비트레이트 (kbps)
  channels?: number;             // 채널 수
}
```

#### Provider별 지원 형식

| 형식 | Whisper | Deepgram | 최대 크기 |
|-----|---------|----------|----------|
| m4a | ✅ | ✅ | 25MB/2GB |
| mp3 | ✅ | ✅ | 25MB/2GB |
| wav | ✅ | ✅ | 25MB/2GB |
| mp4 | ✅ | ✅ | 25MB/2GB |
| webm | ❌ | ✅ | -/2GB |
| ogg | ❌ | ✅ | -/2GB |
| flac | ❌ | ✅ | -/2GB |

- **압축 방식**: 
  - Whisper: Web Audio API (16kHz 모노)
  - Deepgram: 원본 품질 유지 가능

### EditorService

Obsidian 에디터와의 통합을 담당하며 텍스트 삽입, 커서 관리, Undo/Redo를 지원합니다.

```typescript
class EditorService {
  /**
   * 활성 에디터를 가져옵니다.
   * @returns 현재 활성 에디터 또는 null
   */
  getActiveEditor(): Editor | null;
  
  /**
   * 커서 위치에 텍스트를 삽입합니다.
   * @param text - 삽입할 텍스트
   * @param recordHistory - 히스토리 기록 여부
   * @returns 삽입 성공 여부
   * @example
   * await editorService.insertAtCursor("변환된 텍스트");
   */
  async insertAtCursor(
    text: string, 
    recordHistory?: boolean
  ): Promise<boolean>;
  
  /**
   * 선택 영역을 대체합니다.
   * @param text - 대체할 텍스트
   * @param recordHistory - 히스토리 기록 여부
   */
  async replaceSelection(
    text: string, 
    recordHistory?: boolean
  ): Promise<boolean>;
  
  /**
   * 특정 위치에 텍스트를 삽입합니다.
   * @param text - 삽입할 텍스트
   * @param position - 삽입 위치
   */
  async insertAtPosition(
    text: string,
    position: EditorPosition,
    recordHistory?: boolean
  ): Promise<boolean>;
  
  /**
   * 문서 끝에 텍스트를 추가합니다.
   * @param text - 추가할 텍스트
   * @param addNewLine - 새 줄 추가 여부
   */
  async appendToDocument(
    text: string, 
    addNewLine?: boolean
  ): Promise<boolean>;
  
  /**
   * 현재 커서 위치를 반환합니다.
   * @returns 커서 위치 또는 null
   */
  getCursorPosition(): EditorPosition | null;
  
  /**
   * 선택된 텍스트를 반환합니다.
   */
  getSelection(): string;
  
  /**
   * Undo를 실행합니다.
   */
  async undo(): Promise<boolean>;
  
  /**
   * Redo를 실행합니다.
   */
  async redo(): Promise<boolean>;
  
  /**
   * 새 노트를 생성하고 엽니다.
   * @param fileName - 파일명
   * @param content - 초기 내용
   * @param folder - 폴더 경로
   */
  async createAndOpenNote(
    fileName: string,
    content: string,
    folder?: string
  ): Promise<boolean>;
}
```

### TextInsertionHandler

변환된 텍스트의 포맷팅과 삽입을 담당합니다. 다양한 포맷과 템플릿을 지원합니다.

```typescript
class TextInsertionHandler {
  /**
   * 텍스트를 포맷팅하고 삽입합니다.
   * @param text - 삽입할 텍스트
   * @param options - 삽입 옵션
   * @returns 삽입 성공 여부
   * @example
   * await handler.insertText("변환된 텍스트", {
   *   mode: 'cursor',
   *   format: 'quote',
   *   addTimestamp: true
   * });
   */
  async insertText(
    text: string,
    options: InsertionOptions
  ): Promise<boolean>;
  
  /**
   * 마지막 삽입된 텍스트를 반환합니다.
   */
  getLastInsertedText(): string;
  
  /**
   * 삽입 히스토리를 반환합니다.
   */
  getInsertionHistory(): InsertionRecord[];
  
  /**
   * 프리뷰 모드를 설정합니다.
   * @param enabled - 활성화 여부
   */
  setPreviewMode(enabled: boolean): void;
}
```

#### InsertionOptions 타입
```typescript
interface InsertionOptions {
  mode: InsertionMode;           // 삽입 모드
  format: TextFormat;            // 텍스트 포맷
  addTimestamp?: boolean;        // 타임스탬프 추가
  timestampFormat?: string;      // 타임스탬프 형식 (YYYY-MM-DD HH:mm:ss)
  template?: string;             // 텍스트 템플릿
  language?: string;             // 언어 코드 (ko, en, ja, zh)
  preview?: boolean;             // 프리뷰 표시
  createNewNote?: boolean;       // 새 노트 생성
  noteTitle?: string;            // 노트 제목
  noteFolder?: string;           // 노트 폴더
  
  // 포맷별 옵션
  paragraphBreaks?: boolean;     // 문단 구분
  quoteAuthor?: string;          // 인용 작성자
  bulletChar?: string;           // 불릿 문자 (-, *, +)
  headingLevel?: number;         // 제목 레벨 (1-6)
  codeLanguage?: string;         // 코드 언어
  calloutType?: string;          // 콜아웃 타입 (info, warning, error)
  calloutTitle?: string;         // 콜아웃 제목
  calloutFoldable?: boolean;     // 콜아웃 접기 가능
}

type InsertionMode = 
  | 'cursor'      // 커서 위치
  | 'replace'     // 선택 영역 대체
  | 'append'      // 문서 끝
  | 'prepend'     // 문서 시작
  | 'line-end'    // 현재 줄 끝
  | 'new-line';   // 새 줄

type TextFormat = 
  | 'plain'       // 일반 텍스트
  | 'markdown'    // 마크다운
  | 'quote'       // 인용구
  | 'bullet'      // 불릿 리스트
  | 'heading'     // 제목
  | 'code'        // 코드 블록
  | 'callout';    // 콜아웃
```

### EventManager

애플리케이션 전체의 이벤트를 관리하는 중앙 이벤트 버스입니다. Observer 패턴과 Singleton 패턴을 활용합니다.

```typescript
class EventManager extends EventEmitter<AppEventMap> {
  /**
   * 이벤트를 발생시킵니다.
   * @param event - 이벤트 이름
   * @param data - 이벤트 데이터
   * @example
   * eventManager.emit('transcription:complete', {
   *   text: "변환된 텍스트",
   *   duration: 10.5
   * });
   */
  emit<K extends keyof AppEventMap>(
    event: K, 
    data: AppEventMap[K]
  ): void;
  
  /**
   * 이벤트를 구독합니다.
   * @param event - 이벤트 이름
   * @param listener - 이벤트 핸들러
   * @returns 구독 해제 함수
   * @example
   * const unsubscribe = eventManager.on('file:selected', (data) => {
   *   console.log(`파일 선택됨: ${data.file.path}`);
   * });
   */
  on<K extends keyof AppEventMap>(
    event: K,
    listener: EventListener<AppEventMap[K]>
  ): Unsubscribe;
  
  /**
   * 일회성 이벤트를 구독합니다.
   * @param event - 이벤트 이름
   * @param listener - 이벤트 핸들러
   */
  once<K extends keyof AppEventMap>(
    event: K,
    listener: EventListener<AppEventMap[K]>
  ): Unsubscribe;
  
  /**
   * 이벤트를 디바운싱합니다.
   * @param event - 이벤트 이름
   * @param wait - 대기 시간 (밀리초)
   * @param listener - 이벤트 핸들러
   */
  debounce<K extends keyof AppEventMap>(
    event: K,
    wait: number,
    listener: EventListener<AppEventMap[K]>
  ): Unsubscribe;
  
  /**
   * 이벤트를 쓰로틀링합니다.
   * @param event - 이벤트 이름
   * @param limit - 제한 시간 (밀리초)
   * @param listener - 이벤트 핸들러
   */
  throttle<K extends keyof AppEventMap>(
    event: K,
    limit: number,
    listener: EventListener<AppEventMap[K]>
  ): Unsubscribe;
  
  /**
   * 이벤트 체인을 생성합니다.
   * @param sourceEvent - 소스 이벤트
   * @param targetEvent - 타겟 이벤트
   * @param transformer - 데이터 변환 함수
   */
  chain<K extends keyof AppEventMap, K2 extends keyof AppEventMap>(
    sourceEvent: K,
    targetEvent: K2,
    transformer?: (data: AppEventMap[K]) => AppEventMap[K2]
  ): Unsubscribe;
  
  /**
   * 이벤트 통계를 조회합니다.
   * @returns 이벤트별 발생 횟수
   */
  getStats(): Map<keyof AppEventMap, number>;
  
  /**
   * 디버그 모드를 설정합니다.
   * @param enabled - 활성화 여부
   */
  setDebugMode(enabled: boolean): void;
}
```

#### AppEventMap 정의
```typescript
interface AppEventMap {
  // 변환 이벤트
  'transcription:start': { fileName: string; fileSize: number };
  'transcription:complete': { text: string; duration: number; autoInsert?: boolean };
  'transcription:error': { error: Error; fileName?: string };
  'transcription:progress': { progress: number; message?: string };
  
  // 에디터 이벤트
  'editor:changed': { editor: any };
  'editor:active': { view: any; editor: any };
  'editor:text-inserted': { text: string; position?: any };
  'editor:text-replaced': { oldText: string; newText: string };
  
  // 파일 이벤트
  'file:selected': { file: any };
  'file:uploaded': { file: any; size: number };
  'file:validated': { file: any; valid: boolean; errors?: string[] };
  
  // 설정 이벤트
  'settings:changed': { key: string; value: any };
  'settings:loaded': { settings: any };
  'settings:saved': { settings: any };
  
  // UI 이벤트
  'ui:modal-opened': { modalType: string };
  'ui:modal-closed': { modalType: string };
  'ui:notification': { message: string; type: 'info' | 'warning' | 'error' | 'success' };
}
```

---

## 유틸리티 함수

### ErrorHandler

중앙화된 에러 처리 유틸리티입니다.

```typescript
class ErrorHandler {
  /**
   * 에러를 처리하고 로깅합니다.
   * @param error - 처리할 에러
   * @param context - 에러 컨텍스트
   */
  handle(error: Error, context?: any): void;
  
  /**
   * 에러를 사용자 친화적 메시지로 변환합니다.
   * @param error - 변환할 에러
   * @returns 사용자 메시지
   */
  getUserMessage(error: Error): string;
  
  /**
   * 재시도 가능한 에러인지 확인합니다.
   * @param error - 확인할 에러
   * @returns 재시도 가능 여부
   */
  isRetryable(error: Error): boolean;
}
```

#### 사용 예제
```typescript
try {
  await transcriptionService.transcribe(file);
} catch (error) {
  errorHandler.handle(error, { file: file.path });
  
  if (errorHandler.isRetryable(error)) {
    // 재시도 로직
  }
}
```

### Logger

로깅 유틸리티입니다.

```typescript
class Logger {
  /**
   * 디버그 메시지를 기록합니다.
   */
  debug(message: string, data?: any): void;
  
  /**
   * 정보 메시지를 기록합니다.
   */
  info(message: string, data?: any): void;
  
  /**
   * 경고 메시지를 기록합니다.
   */
  warn(message: string, data?: any): void;
  
  /**
   * 에러 메시지를 기록합니다.
   */
  error(message: string, error?: Error, data?: any): void;
}
```

#### 로그 레벨
```typescript
enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}
```

---

## 타입 정의

### 기본 타입

```typescript
/** 음성 변환 결과 */
interface TranscriptionResult {
  /** 변환된 텍스트 */
  text: string;
  
  /** 감지된 언어 */
  language: string;
  
  /** 오디오 길이 (초) */
  duration?: number;
  
  /** 변환 신뢰도 (0-1) */
  confidence?: number;
  
  /** 세그먼트 정보 */
  segments?: TranscriptionSegment[];
  
  /** 메타데이터 */
  metadata?: TranscriptionMetadata;
}

/** 변환 세그먼트 */
interface TranscriptionSegment {
  /** 세그먼트 ID */
  id: number;
  
  /** 시작 시간 (초) */
  start: number;
  
  /** 종료 시간 (초) */
  end: number;
  
  /** 세그먼트 텍스트 */
  text: string;
  
  /** 신뢰도 */
  confidence?: number;
}

/** 오디오 메타데이터 */
interface AudioMetadata {
  /** 길이 (초) */
  duration: number;
  
  /** 비트레이트 */
  bitrate: number;
  
  /** 샘플레이트 */
  sampleRate: number;
  
  /** 채널 수 */
  channels: number;
  
  /** 코덱 */
  codec: string;
  
  /** 파일 크기 (바이트) */
  size: number;
}
```

### 상태 타입

```typescript
/** 변환 상태 */
type TranscriptionStatus = 
  | 'idle'          // 대기 중
  | 'validating'    // 검증 중
  | 'processing'    // 처리 중
  | 'uploading'     // 업로드 중
  | 'transcribing'  // 변환 중
  | 'formatting'    // 포맷팅 중
  | 'completed'     // 완료
  | 'cancelled'     // 취소됨
  | 'error';        // 에러

/** 앱 상태 */
interface AppState {
  /** 현재 상태 */
  status: TranscriptionStatus;
  
  /** 처리 중인 파일 */
  currentFile: TFile | null;
  
  /** 진행률 (0-100) */
  progress: number;
  
  /** 에러 정보 */
  error: Error | null;
  
  /** 변환 기록 */
  history: TranscriptionHistory[];
}
```

### 설정 타입

```typescript
/** 플러그인 설정 (v3.0.0) */
interface SpeechToTextSettings {
  /** Provider 선택 */
  provider: 'whisper' | 'deepgram' | 'auto';
  
  /** API 키 */
  openaiApiKey?: string;
  deepgramApiKey?: string;
  
  /** Provider별 모델 설정 */
  whisperModel?: 'whisper-1';
  deepgramTier?: 'nova-2' | 'nova' | 'enhanced' | 'base';
  
  /** 언어 코드 */
  language: LanguageCode;
  
  /** 자동 삽입 여부 */
  autoInsert: boolean;
  
  /** 삽입 위치 */
  insertPosition: InsertPosition;
  
  /** 타임스탬프 형식 */
  timestampFormat: TimestampFormat;
  
  /** 최대 파일 크기 (바이트) */
  maxFileSize: number;
  
  /** 캐시 활성화 */
  enableCache: boolean;
  
  /** 캐시 TTL (밀리초) */
  cacheTTL: number;
  
  /** Fallback 설정 */
  enableFallback: boolean;
  fallbackProvider?: 'whisper' | 'deepgram';
  
  /** 스마트 라우팅 */
  smartRouting: boolean;
}

/** 언어 코드 */
type LanguageCode = 'auto' | 'en' | 'ko' | 'ja' | 'zh' | string;

/** 삽입 위치 */
type InsertPosition = 'cursor' | 'end' | 'beginning';

/** 타임스탬프 형식 */
type TimestampFormat = 'none' | 'inline' | 'sidebar';
```

---

## 이벤트 시스템

### EventManager

이벤트 발행/구독 시스템입니다.

```typescript
class EventManager {
  /**
   * 이벤트를 발행합니다.
   * @param event - 이벤트 이름
   * @param data - 이벤트 데이터
   */
  emit(event: string, data?: any): void;
  
  /**
   * 이벤트를 구독합니다.
   * @param event - 이벤트 이름
   * @param handler - 이벤트 핸들러
   * @returns 구독 해제 함수
   */
  on(event: string, handler: EventHandler): Unsubscribe;
  
  /**
   * 한 번만 실행되는 이벤트를 구독합니다.
   */
  once(event: string, handler: EventHandler): Unsubscribe;
  
  /**
   * 이벤트 구독을 해제합니다.
   */
  off(event: string, handler?: EventHandler): void;
  
  /**
   * 모든 리스너를 제거합니다.
   */
  removeAllListeners(): void;
}
```

### 이벤트 목록

| 이벤트 | 설명 | 데이터 |
|--------|------|--------|
| `transcription:start` | 변환 시작 | `{ fileName: string }` |
| `transcription:progress` | 진행 상태 업데이트 | `{ progress: number }` |
| `transcription:complete` | 변환 완료 | `{ result: TranscriptionResult }` |
| `transcription:error` | 에러 발생 | `{ error: Error }` |
| `transcription:cancel` | 변환 취소 | `{}` |
| `settings:change` | 설정 변경 | `{ settings: Settings }` |

#### 사용 예제
```typescript
// 이벤트 구독
const unsubscribe = eventManager.on('transcription:progress', (data) => {
  console.log(`Progress: ${data.progress}%`);
});

// 이벤트 발행
eventManager.emit('transcription:progress', { progress: 50 });

// 구독 해제
unsubscribe();
```

---

## 에러 처리

### 에러 클래스

```typescript
/** 기본 에러 클래스 */
abstract class BaseError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly isRetryable: boolean = false
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

/** 검증 에러 */
class ValidationError extends BaseError {
  constructor(message: string, public readonly field?: string) {
    super(message, 'VALIDATION_ERROR', 400, false);
  }
}

/** API 에러 */
class WhisperAPIError extends BaseError {
  constructor(
    message: string,
    public readonly status: number,
    public readonly response?: any
  ) {
    super(
      message,
      'WHISPER_API_ERROR',
      status,
      status >= 500 || status === 429
    );
  }
}

/** 네트워크 에러 */
class NetworkError extends BaseError {
  constructor(message: string, public readonly originalError?: Error) {
    super(message, 'NETWORK_ERROR', 0, true);
  }
}

/** 파일 크기 초과 에러 */
class FileSizeExceededError extends BaseError {
  constructor(
    public readonly actualSize: number,
    public readonly maxSize: number
  ) {
    super(
      `File size ${actualSize} exceeds maximum ${maxSize}`,
      'FILE_SIZE_EXCEEDED',
      413,
      false
    );
  }
}
```

### 에러 코드

| 코드 | 설명 | 재시도 가능 |
|------|------|------------|
| `VALIDATION_ERROR` | 입력 검증 실패 | ❌ |
| `FILE_NOT_FOUND` | 파일을 찾을 수 없음 | ❌ |
| `FILE_SIZE_EXCEEDED` | 파일 크기 초과 | ❌ |
| `INVALID_FORMAT` | 지원하지 않는 형식 | ❌ |
| `WHISPER_API_ERROR` | API 호출 실패 | 상황에 따라 |
| `NETWORK_ERROR` | 네트워크 오류 | ✅ |
| `RATE_LIMIT` | API 호출 제한 | ✅ |
| `TIMEOUT` | 요청 시간 초과 | ✅ |
| `UNAUTHORIZED` | 인증 실패 | ❌ |

---

## 설정 옵션

### 기본 설정

```typescript
const DEFAULT_SETTINGS: SpeechToTextSettings = {
  // Provider 설정
  provider: 'auto',
  openaiApiKey: '',
  deepgramApiKey: '',
  
  // Whisper 기본값
  whisperModel: 'whisper-1',
  
  // Deepgram 기본값
  deepgramTier: 'nova-2',
  deepgramPunctuate: true,
  deepgramSmartFormat: true,
  deepgramDiarize: false,
  
  // 공통 설정
  language: 'auto',
  autoInsert: true,
  insertPosition: 'cursor',
  timestampFormat: 'none',
  maxFileSize: 0, // 0 = Provider별 기본값 사용
  enableCache: true,
  cacheTTL: 3600000, // 1시간
  
  // 고급 기능
  enableFallback: true,
  smartRouting: true
};
```

### 설정 관리

```typescript
class SettingsManager {
  /**
   * 설정을 로드합니다.
   */
  async load(): Promise<Settings>;
  
  /**
   * 설정을 저장합니다.
   */
  async save(settings: Settings): Promise<void>;
  
  /**
   * 특정 설정 값을 가져옵니다.
   */
  get<K extends keyof Settings>(key: K): Settings[K];
  
  /**
   * 특정 설정 값을 설정합니다.
   */
  async set<K extends keyof Settings>(
    key: K,
    value: Settings[K]
  ): Promise<void>;
  
  /**
   * 설정을 초기화합니다.
   */
  async reset(): Promise<void>;
}
```

---

## 사용 예제

### 기본 사용법

```typescript
// 플러그인 초기화
class MyPlugin extends SpeechToTextPlugin {
  async onload() {
    await super.onload();
    
    // 명령어 추가
    this.addCommand({
      id: 'my-custom-command',
      name: 'My Custom Command',
      callback: () => this.handleCustomCommand()
    });
  }
  
  private async handleCustomCommand() {
    // 파일 선택
    const files = this.app.vault.getFiles()
      .filter(f => f.extension === 'm4a');
    
    if (files.length === 0) {
      new Notice('No audio files found');
      return;
    }
    
    // 변환 실행
    try {
      const result = await this.transcriptionService
        .transcribe(files[0]);
      
      console.log('Transcription result:', result);
    } catch (error) {
      this.errorHandler.handle(error);
    }
  }
}
```

### 이벤트 처리

```typescript
// 진행 상태 모니터링
eventManager.on('transcription:progress', (data) => {
  const progressBar = document.getElementById('progress');
  if (progressBar) {
    progressBar.style.width = `${data.progress}%`;
  }
});

// 완료 처리
eventManager.on('transcription:complete', async (data) => {
  const { result } = data;
  
  // 텍스트 삽입
  const editor = this.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
  if (editor) {
    editor.replaceSelection(result.text);
  }
  
  // 알림
  new Notice(`Transcription complete! Language: ${result.language}`);
});
```

### 커스텀 서비스

```typescript
// 커스텀 변환 서비스 구현
class CustomTranscriptionService implements ITranscriptionService {
  async transcribe(file: TFile): Promise<TranscriptionResult> {
    // 커스텀 로직
    const customProcessor = new CustomAudioProcessor();
    const processed = await customProcessor.process(file);
    
    // API 호출
    const response = await this.callCustomAPI(processed);
    
    return {
      text: response.text,
      language: response.language,
      duration: processed.duration
    };
  }
  
  cancel(): void {
    // 취소 로직
  }
  
  getStatus(): TranscriptionStatus {
    return this.currentStatus;
  }
}
```

---

## API 버전 관리

### 버전 확인

```typescript
// 플러그인 버전 확인
const pluginVersion = this.manifest.version;
console.log(`Plugin version: ${pluginVersion}`);

// API 호환성 확인
if (!this.app.vault.adapter) {
  throw new Error('Incompatible Obsidian version');
}
```

### Breaking Changes

#### v3.0.3 (2025-08-30)
- **개선사항**:
  - Deepgram 설정 구조 개선 (`deepgramSettings` 객체로 통합)
  - 추가 Deepgram 기능 지원 (요약, 민감정보 제거 등)
  - Provider 설정 UI 개선
  - 비용 추정 기능 추가

#### v3.0.0 (2025-08-28)
- **주요 변경사항**:
  - Deepgram Nova 2 API 통합
  - 다중 Provider 지원 (Whisper, Deepgram)
  - 자동 Provider 선택 기능
  - 대용량 파일 지원 (최대 2GB)
  - Fallback 메커니즘 구현
  - 스마트 라우팅 기능
- **Breaking Changes**:
  - `apiKey` → `openaiApiKey`, `deepgramApiKey`로 분리
  - `model` → `whisperModel`로 변경
  - Provider별 설정 분리

#### v2.0.0 (2025-08-25)
- Phase 3: UX 개선
- Phase 4: 성능 최적화

#### v1.0.0 (2025-08-22)
- 초기 릴리스
- 기본 API 구조 확립

---

## 개발자 도구

### 디버깅

```typescript
// 디버그 모드 활성화
if (process.env.NODE_ENV === 'development') {
  window.speechToTextDebug = {
    plugin: this,
    services: {
      transcription: this.transcriptionService,
      whisper: this.whisperService
    },
    state: this.stateManager.getState()
  };
}
```

### 테스트 유틸리티

```typescript
// Mock 생성
export function createMockAudioFile(): TFile {
  return {
    path: 'test.m4a',
    name: 'test.m4a',
    extension: 'm4a',
    stat: {
      size: 1024 * 1024, // 1MB
      ctime: Date.now(),
      mtime: Date.now()
    }
  } as TFile;
}

// 테스트 헬퍼
export async function waitForEvent(
  eventManager: EventManager,
  event: string,
  timeout = 5000
): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for event: ${event}`));
    }, timeout);
    
    eventManager.once(event, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}
```

---

*최종 업데이트: 2025-08-30*
*API 버전: 3.0.3*