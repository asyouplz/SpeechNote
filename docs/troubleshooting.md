# 트러블슈팅 가이드 (Troubleshooting Guide)

## 목차
1. [일반적인 문제](#일반적인-문제)
2. [API 관련 문제](#api-관련-문제)
3. [파일 처리 문제](#파일-처리-문제)
4. [성능 문제](#성능-문제)
5. [에러 코드 참조](#에러-코드-참조)
6. [디버깅 방법](#디버깅-방법)
7. [FAQ](#faq)

---

## 일반적인 문제

### 플러그인이 로드되지 않음

#### 증상
- 플러그인이 설정에서 보이지 않음
- 명령어가 실행되지 않음

#### 해결 방법
```typescript
// 1. 콘솔에서 에러 확인
console.log(app.plugins.plugins);

// 2. 수동으로 플러그인 리로드
app.plugins.disablePlugin('speech-to-text');
await app.plugins.enablePlugin('speech-to-text');

// 3. manifest.json 검증
{
  "id": "speech-to-text",
  "name": "Speech to Text",
  "version": "1.0.0",
  "minAppVersion": "0.15.0",
  "description": "Convert audio to text",
  "author": "Your Name",
  "isDesktopOnly": false
}
```

### 변환 버튼이 보이지 않음

#### 증상
- 리본 아이콘이 없음
- 컨텍스트 메뉴에 옵션이 없음

#### 해결 방법
```typescript
// 플러그인 재초기화
const plugin = app.plugins.plugins['speech-to-text'];
plugin.onunload();
await plugin.onload();

// 리본 아이콘 수동 추가
plugin.addRibbonIcon('microphone', 'Speech to Text', () => {
    // 명령 실행
});
```

---

## API 관련 문제

### API 키 인증 실패

#### 에러 메시지
```
AuthenticationError: Invalid API key
Status Code: 401
```

#### 해결 방법

1. **API 키 확인**
```typescript
// 설정에서 API 키 검증
const settingsManager = new SettingsManager(plugin, logger);
const apiKey = settingsManager.getApiKey();

// 형식 확인 (sk-로 시작해야 함)
if (!apiKey.startsWith('sk-')) {
    console.error('Invalid API key format');
}

// API 키 재검증
const isValid = await whisperService.validateApiKey(apiKey);
if (!isValid) {
    await settingsManager.setApiKey(''); // 초기화
}
```

2. **OpenAI 계정 확인**
- [OpenAI Dashboard](https://platform.openai.com) 접속
- API 키 재발급
- 사용량 한도 확인

### Rate Limit 에러

#### 에러 메시지
```
RateLimitError: Rate limit exceeded
Status Code: 429
Retry After: 60 seconds
```

#### 해결 방법

1. **자동 재시도 설정**
```typescript
// WhisperService는 자동으로 재시도합니다
// 수동으로 처리하려면:
try {
    await whisperService.transcribe(audio);
} catch (error) {
    if (error instanceof RateLimitError) {
        const retryAfter = error.retryAfter || 60;
        setTimeout(async () => {
            await whisperService.transcribe(audio);
        }, retryAfter * 1000);
    }
}
```

2. **요청 빈도 조절**
```typescript
// 큐잉 시스템 사용
class RateLimitedQueue {
    private queue: Array<() => Promise<any>> = [];
    private processing = false;
    private delay = 1000; // 1초 간격
    
    async add<T>(operation: () => Promise<T>): Promise<T> {
        return new Promise((resolve, reject) => {
            this.queue.push(async () => {
                try {
                    const result = await operation();
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            });
            this.process();
        });
    }
    
    private async process() {
        if (this.processing || this.queue.length === 0) return;
        
        this.processing = true;
        while (this.queue.length > 0) {
            const operation = this.queue.shift()!;
            await operation();
            await new Promise(r => setTimeout(r, this.delay));
        }
        this.processing = false;
    }
}
```

### Circuit Breaker Open 에러

#### 에러 메시지
```
WhisperAPIError: Circuit breaker is open. Try again after 14:30:00
Code: CIRCUIT_OPEN
```

#### 해결 방법
```typescript
// Circuit Breaker 리셋
whisperService.resetCircuitBreaker();

// 또는 대기 시간 후 자동 복구
setTimeout(() => {
    whisperService.transcribe(audio);
}, 60000); // 1분 후
```

---

## 파일 처리 문제

### 파일 크기 초과

#### 에러 메시지
```
FileTooLargeError: File size exceeds API limit (25MB)
Actual size: 30MB
```

#### 해결 방법

1. **자동 압축 활성화**
```typescript
const uploadManager = new FileUploadManager(vault, logger);

// 자동 압축 처리
const processed = await uploadManager.prepareAudioFile(file);
if (processed.compressed) {
    console.log(`압축됨: ${processed.originalSize} -> ${processed.processedSize}`);
}
```

2. **수동 압축**
```typescript
// Web Audio API를 사용한 압축
async function compressAudio(buffer: ArrayBuffer): Promise<ArrayBuffer> {
    const audioContext = new AudioContext();
    const audioBuffer = await audioContext.decodeAudioData(buffer);
    
    // 16kHz 모노로 다운샘플링
    const offlineContext = new OfflineAudioContext(
        1, // 모노
        audioBuffer.duration * 16000, // 16kHz
        16000
    );
    
    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineContext.destination);
    source.start();
    
    const compressed = await offlineContext.startRendering();
    return audioBufferToWav(compressed);
}
```

### 지원하지 않는 파일 형식

#### 에러 메시지
```
ValidationError: Unsupported file format: .aac
Supported formats: .m4a, .mp3, .wav, .mp4, .mpeg, .mpga, .webm, .ogg
```

#### 해결 방법

1. **파일 변환**
```bash
# FFmpeg를 사용한 변환
ffmpeg -i input.aac -acodec libmp3lame output.mp3
```

2. **형식 검증 우회 (주의 필요)**
```typescript
// 확장자만 변경 (위험할 수 있음)
const newFile = await vault.rename(
    file,
    file.path.replace('.aac', '.m4a')
);
```

### 오디오 메타데이터 추출 실패

#### 증상
- Duration이 undefined
- 샘플레이트 정보 없음

#### 해결 방법
```typescript
// 대체 방법으로 메타데이터 추정
function estimateMetadata(buffer: ArrayBuffer): AudioFileMetadata {
    const estimatedDuration = buffer.byteLength / (128 * 1024 / 8); // 128kbps 가정
    
    return {
        name: file.name,
        path: file.path,
        extension: file.extension,
        mimeType: 'audio/mpeg',
        duration: estimatedDuration,
        bitrate: 128,
        sampleRate: 44100,
        channels: 2
    };
}
```

---

## 성능 문제

### 변환 속도가 느림

#### 증상
- 변환에 1분 이상 소요
- 타임아웃 에러 발생

#### 최적화 방법

1. **파일 사전 처리**
```typescript
// 파일 크기 줄이기
const optimized = await optimizeAudioFile(file, {
    targetBitrate: 64, // kbps
    targetSampleRate: 16000, // Hz
    channels: 1 // 모노
});
```

2. **캐싱 활성화**
```typescript
// 캐시 시스템 구현
class TranscriptionCache {
    private cache = new Map<string, CachedResult>();
    
    async get(fileHash: string): Promise<TranscriptionResult | null> {
        const cached = this.cache.get(fileHash);
        if (!cached) return null;
        
        if (Date.now() - cached.timestamp > this.ttl) {
            this.cache.delete(fileHash);
            return null;
        }
        
        return cached.result;
    }
    
    set(fileHash: string, result: TranscriptionResult): void {
        this.cache.set(fileHash, {
            result,
            timestamp: Date.now()
        });
    }
}
```

### 메모리 사용량이 높음

#### 증상
- 브라우저/앱이 느려짐
- 크래시 발생

#### 해결 방법

1. **메모리 관리**
```typescript
// 큰 버퍼 처리 후 정리
function processLargeAudio(buffer: ArrayBuffer): void {
    try {
        // 처리
        const result = processAudio(buffer);
        return result;
    } finally {
        // 명시적 정리
        if (buffer.byteLength > 10 * 1024 * 1024) {
            // 10MB 이상인 경우
            buffer = new ArrayBuffer(0); // 참조 해제
        }
    }
}
```

2. **청크 처리**
```typescript
// 스트리밍 방식으로 처리
async function* processInChunks(
    file: TFile,
    chunkSize = 5 * 1024 * 1024
): AsyncGenerator<ProcessedChunk> {
    const buffer = await vault.readBinary(file);
    
    for (let i = 0; i < buffer.byteLength; i += chunkSize) {
        const chunk = buffer.slice(i, Math.min(i + chunkSize, buffer.byteLength));
        yield await processChunk(chunk);
        
        // 메모리 압박 완화
        await new Promise(resolve => setTimeout(resolve, 0));
    }
}
```

---

## 에러 코드 참조

### WhisperAPI 에러 코드

| 코드 | 설명 | 해결 방법 |
|------|------|-----------|
| `AUTH_ERROR` | 인증 실패 | API 키 확인 |
| `RATE_LIMIT` | 호출 제한 초과 | 잠시 후 재시도 |
| `FILE_TOO_LARGE` | 파일 크기 초과 | 파일 압축 필요 |
| `SERVER_ERROR` | 서버 오류 | 자동 재시도됨 |
| `CIRCUIT_OPEN` | Circuit Breaker 활성화 | 리셋 또는 대기 |
| `MAX_RETRIES_EXCEEDED` | 최대 재시도 초과 | 수동 재시도 필요 |
| `CANCELLED` | 사용자 취소 | 정상 동작 |
| `TIMEOUT` | 요청 시간 초과 | 네트워크 확인 |

### 검증 에러 코드

| 코드 | 설명 | 해결 방법 |
|------|------|-----------|
| `INVALID_FORMAT` | 지원하지 않는 형식 | 파일 변환 |
| `FILE_NOT_FOUND` | 파일 없음 | 경로 확인 |
| `INVALID_SIZE` | 잘못된 파일 크기 | 파일 재확인 |
| `CORRUPTED_FILE` | 손상된 파일 | 파일 재다운로드 |

---

## 디버깅 방법

### 개발자 콘솔 사용

1. **콘솔 열기**
   - Windows/Linux: `Ctrl + Shift + I`
   - Mac: `Cmd + Option + I`

2. **디버그 모드 활성화**
```typescript
// 콘솔에서 실행
window.speechToTextDebug = {
    enableVerboseLogging: true,
    logLevel: 'DEBUG'
};

// 이벤트 모니터링
const eventManager = window.speechToTextDebug.eventManager;
eventManager.setDebugMode(true);
```

### 로그 분석

```typescript
// 로그 필터링
console.log(
    logger.getLogs()
        .filter(log => log.level === 'ERROR')
        .map(log => ({
            time: new Date(log.timestamp).toISOString(),
            message: log.message,
            error: log.error
        }))
);

// 이벤트 통계
console.table(eventManager.getStats());

// 최근 이벤트 히스토리
console.log(eventManager.getHistory().slice(-10));
```

### 네트워크 디버깅

```typescript
// API 요청 인터셉트
const originalFetch = window.fetch;
window.fetch = async (...args) => {
    console.log('API Request:', args);
    const response = await originalFetch(...args);
    console.log('API Response:', response.status);
    return response;
};
```

### 성능 프로파일링

```typescript
// 실행 시간 측정
console.time('transcription');
await whisperService.transcribe(audio);
console.timeEnd('transcription');

// 메모리 사용량
console.log('Memory:', performance.memory);

// 상세 프로파일링
performance.mark('transcription-start');
await whisperService.transcribe(audio);
performance.mark('transcription-end');
performance.measure(
    'transcription',
    'transcription-start',
    'transcription-end'
);
console.log(performance.getEntriesByName('transcription'));
```

---

## FAQ

### Q: API 키는 어디서 얻나요?

**A:** OpenAI 웹사이트에서 얻을 수 있습니다:
1. [OpenAI Platform](https://platform.openai.com) 접속
2. 계정 생성 또는 로그인
3. API Keys 섹션에서 새 키 생성
4. `sk-`로 시작하는 키 복사

### Q: 무료로 사용할 수 있나요?

**A:** OpenAI API는 유료 서비스입니다:
- 신규 계정: $5 무료 크레딧 제공 (약 500분 변환 가능)
- 가격: $0.006/분 (Whisper 모델 기준)
- 상세 가격: [OpenAI Pricing](https://openai.com/pricing)

### Q: 오프라인에서 작동하나요?

**A:** 아니요, 인터넷 연결이 필요합니다:
- Whisper API는 클라우드 서비스입니다
- 로컬 모델을 원한다면 별도 솔루션 필요

### Q: 지원되는 언어는?

**A:** Whisper는 99개 언어를 지원합니다:
```typescript
const supportedLanguages = {
    'ko': '한국어',
    'en': 'English',
    'ja': '日本語',
    'zh': '中文',
    'es': 'Español',
    'fr': 'Français',
    'de': 'Deutsch',
    'ru': 'Русский',
    // ... 91개 더
};
```

### Q: 최대 파일 크기는?

**A:** 25MB입니다:
- 원본 파일: 최대 50MB (자동 압축됨)
- 압축 후: 25MB 이하
- 권장: 10MB 이하 (빠른 처리)

### Q: 변환 정확도를 높이려면?

**A:** 다음 방법들을 시도하세요:

1. **고품질 녹음**
   - 조용한 환경
   - 마이크 가까이
   - 44.1kHz 이상 샘플레이트

2. **프롬프트 사용**
```typescript
const options: WhisperOptions = {
    prompt: "이전 대화 내용이나 전문 용어를 여기에...",
    temperature: 0.2 // 낮을수록 일관성 있음
};
```

3. **언어 명시**
```typescript
const options: WhisperOptions = {
    language: 'ko' // auto 대신 명시
};
```

### Q: 비용을 줄이려면?

**A:** 비용 절감 방법:

1. **파일 압축**
```typescript
// 비트레이트 낮추기
const compressed = await compressAudio(audio, {
    bitrate: 64 // 128 -> 64 kbps
});
```

2. **캐싱 활용**
```typescript
// 동일 파일 재변환 방지
if (cache.has(fileHash)) {
    return cache.get(fileHash);
}
```

3. **필요한 부분만 변환**
```typescript
// 오디오 자르기
const trimmed = await trimAudio(audio, {
    start: 10, // 초
    end: 60
});
```

### Q: 보안은 안전한가요?

**A:** 보안 조치:

1. **API 키 암호화**: 설정에 암호화되어 저장
2. **HTTPS 통신**: 모든 API 통신은 암호화
3. **로컬 처리**: 파일은 로컬에서 처리 후 전송
4. **임시 데이터**: 변환 후 서버에서 즉시 삭제

### Q: 플러그인이 충돌하면?

**A:** 복구 방법:

1. **Safe Mode로 시작**
```bash
# Obsidian을 Safe Mode로 실행
obsidian --safe-mode
```

2. **플러그인 제거**
```bash
# .obsidian/plugins/speech-to-text 폴더 삭제
rm -rf .obsidian/plugins/speech-to-text
```

3. **설정 초기화**
```typescript
await settingsManager.reset();
```

---

## 지원 및 문의

### 버그 리포트
- GitHub Issues: [github.com/your-repo/issues](https://github.com)
- 필요 정보:
  - Obsidian 버전
  - 플러그인 버전
  - 에러 메시지
  - 재현 방법

### 커뮤니티
- Obsidian Forum: [forum.obsidian.md](https://forum.obsidian.md)
- Discord: [Obsidian Discord](https://discord.gg/obsidianmd)

### 로그 수집
```typescript
// 디버그 정보 수집
function collectDebugInfo() {
    return {
        obsidianVersion: app.vault.adapter.appVersion,
        pluginVersion: manifest.version,
        settings: settingsManager.exportSettings(),
        recentErrors: logger.getErrors().slice(-10),
        eventStats: eventManager.getStats(),
        systemInfo: {
            platform: navigator.platform,
            userAgent: navigator.userAgent,
            language: navigator.language
        }
    };
}

// 클립보드에 복사
navigator.clipboard.writeText(
    JSON.stringify(collectDebugInfo(), null, 2)
);
```

---

## Phase 4 추가 트러블슈팅

### 테스트 실행 문제

#### Jest 테스트가 실패함

**증상**
- 모든 테스트가 실패 상태
- Obsidian API를 찾을 수 없다는 에러

**해결 방법**
```typescript
// tests/mocks/obsidian.mock.ts 생성
export const mockApp = {
    workspace: {
        getActiveViewOfType: jest.fn(),
        activeLeaf: null
    },
    vault: {
        adapter: {
            read: jest.fn(),
            write: jest.fn()
        }
    },
    plugins: {
        plugins: {}
    }
};

// 테스트 파일에서 사용
jest.mock('obsidian', () => ({
    App: jest.fn().mockImplementation(() => mockApp),
    Plugin: jest.fn(),
    Editor: jest.fn(),
    TFile: jest.fn()
}));
```

### 성능 최적화 문제

#### 메모리 누수 감지

**증상**
- 장시간 사용 시 메모리 증가
- 브라우저 느려짐

**해결 방법**
```typescript
// 메모리 프로파일러 사용
import { memoryProfiler } from '@/utils/memory/MemoryProfiler';

// 모니터링 시작
memoryProfiler.startProfiling();

// 누수 감지 시 콜백
memoryProfiler.onLeakDetected((leak) => {
    console.error('Memory leak detected:', leak);
    
    // 자동 정리 시도
    if (leak.type === 'dom-leak') {
        // DOM 노드 정리
        document.querySelectorAll('.obsolete').forEach(el => el.remove());
    }
    
    if (leak.type === 'listener-leak') {
        // 이벤트 리스너 정리
        eventManager.removeAllListeners();
    }
});
```

#### 번들 크기 초과

**증상**
- 빌드 시 경고 메시지
- 로딩 시간 증가

**해결 방법**
```bash
# 번들 분석
ANALYZE=true npm run build

# 최적화된 빌드
npm run build:optimized

# 불필요한 의존성 제거
npm prune --production
```

### Phase 4에서 수정된 버그

#### 무한 재귀 호출 (Critical)

**이전 코드 (버그)**
```typescript
private addStatusBarItem() {
    const statusBarItem = this.addStatusBarItem(); // 무한 재귀
}
```

**수정된 코드**
```typescript
private createStatusBarItem() {
    const statusBarItem = this.addStatusBarItem(); // 정상 호출
}
```

#### TypeScript 설정 충돌 (Critical)

**문제**
- `sourceMap`과 `inlineSourceMap` 동시 설정

**해결**
```json
// tsconfig.json
{
    "compilerOptions": {
        "inlineSourceMap": true
        // sourceMap 옵션 제거
    }
}
```

#### WhisperService API 검증 실패 (High)

**문제**
- 너무 작은 테스트 오디오 사용

**해결**
```typescript
// 이전: 100 바이트
const testAudio = new ArrayBuffer(100);

// 수정: 1KB
const testAudio = new ArrayBuffer(1024);
```

### 최적화 설정

#### Lazy Loading 활성화

```typescript
// LazyLoader 사용
import { LazyLoader } from '@/core/LazyLoader';

// 모듈 동적 로드
const module = await LazyLoader.loadModule('StatisticsDashboard');

// 백그라운드 프리로드
LazyLoader.preloadModules(['AdvancedSettings', 'AudioSettings']);
```

#### 캐시 시스템 활용

```typescript
// 전역 캐시 사용
import { globalCache } from '@/infrastructure/cache/MemoryCache';

// API 응답 캐싱
const data = await globalCache.getOrSet(
    'api.transcription',
    async () => await whisperService.transcribe(audio),
    { ttl: 5 * 60 * 1000 } // 5분
);
```

#### 배치 요청 처리

```typescript
// BatchRequestManager 사용
import { batchManager } from '@/infrastructure/api/BatchRequestManager';

// 여러 요청 배치 처리
const results = await Promise.all([
    batchManager.addRequest('/api/user', 'GET'),
    batchManager.addRequest('/api/settings', 'GET'),
    batchManager.addRequest('/api/stats', 'GET')
]);
```

---

*최종 업데이트: 2025-08-25*  
*버전: 1.0.0*  
*Phase 4 Task 4.5 완료*