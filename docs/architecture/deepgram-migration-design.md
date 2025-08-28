# Deepgram API 마이그레이션 시스템 설계

## 목차
1. [개요](#개요)
2. [시스템 아키텍처](#시스템-아키텍처)
3. [상세 설계](#상세-설계)
4. [데이터 흐름](#데이터-흐름)
5. [마이그레이션 전략](#마이그레이션-전략)
6. [구현 로드맵](#구현-로드맵)

## 개요

### 목적
OpenAI Whisper API에서 Deepgram API로의 점진적 마이그레이션을 통해 더 나은 성능과 비용 효율성을 달성합니다.

### 핵심 요구사항
- **점진적 전환**: 위험을 최소화하는 단계적 마이그레이션
- **호환성 유지**: 기존 인터페이스와 100% 호환
- **롤백 가능**: 언제든지 이전 상태로 복구 가능
- **A/B 테스팅**: 두 API의 성능 비교 가능
- **무중단 전환**: 서비스 중단 없이 마이그레이션

### 설계 원칙
1. **SOLID 원칙 준수**: 단일 책임, 개방-폐쇄, 인터페이스 분리
2. **재사용성**: 기존 Circuit Breaker, Retry Logic 재사용
3. **확장성**: 미래의 다른 API 추가 가능한 구조
4. **테스트 가능성**: 모든 컴포넌트의 독립적 테스트 가능

## 시스템 아키텍처

### 1. 계층 구조

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│                   TranscriptionService                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Adapter Layer (New)                       │
│              TranscriptionProviderAdapter                    │
│                    ┌──────────────┐                         │
│                    │ ITranscriber │ ◄── Interface           │
│                    └──────────────┘                         │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
┌──────────────────────────┐ ┌──────────────────────────┐
│   WhisperAdapter (New)   │ │  DeepgramAdapter (New)   │
│  ┌──────────────────┐    │ │  ┌──────────────────┐    │
│  │ WhisperService   │    │ │  │ DeepgramService  │    │
│  │   (Existing)     │    │ │  │     (New)        │    │
│  └──────────────────┘    │ │  └──────────────────┘    │
└──────────────────────────┘ └──────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Infrastructure Layer                        │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────┐    │
│  │ Circuit Breaker│  │ Retry Strategy │  │Rate Limiter│    │
│  │   (Existing)   │  │   (Existing)   │  │   (New)    │    │
│  └────────────────┘  └────────────────┘  └────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Provider Factory                          │
│         TranscriptionProviderFactory (New)                   │
│                  ┌──────────────┐                           │
│                  │ Configuration│                           │
│                  │   Manager    │                           │
│                  └──────────────┘                           │
└─────────────────────────────────────────────────────────────┘
```

### 2. 컴포넌트 관계도

```
                    ┌─────────────────┐
                    │  User Settings  │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ Provider Config │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│   Provider    │  │   Provider    │  │   Provider    │
│   Selector    │  │   Factory     │  │   Monitor     │
└───────┬───────┘  └───────┬───────┘  └───────┬───────┘
        │                   │                   │
        └───────────┬───────┴───────────────────┘
                    ▼
        ┌───────────────────────────┐
        │   Active Provider Instance │
        │   (Whisper or Deepgram)   │
        └───────────────────────────┘
```

## 상세 설계

### 1. 인터페이스 정의

```typescript
// src/types/transcription.ts

// 핵심 인터페이스
export interface ITranscriber {
    transcribe(audio: ArrayBuffer, options?: TranscriptionOptions): Promise<TranscriptionResponse>;
    validateApiKey(key: string): Promise<boolean>;
    cancel(): void;
    getProviderName(): string;
    getCapabilities(): ProviderCapabilities;
}

// 통합된 옵션 인터페이스
export interface TranscriptionOptions {
    // 공통 옵션
    language?: string;
    model?: string;
    
    // Provider별 옵션
    whisper?: WhisperSpecificOptions;
    deepgram?: DeepgramSpecificOptions;
    
    // 메타 옵션
    preferredProvider?: 'whisper' | 'deepgram' | 'auto';
    fallbackEnabled?: boolean;
}

// Provider 능력 정의
export interface ProviderCapabilities {
    streaming: boolean;
    realtime: boolean;
    languages: string[];
    maxFileSize: number;
    audioFormats: string[];
    features: string[];
}

// 응답 형식 통합
export interface TranscriptionResponse {
    text: string;
    language?: string;
    confidence?: number;
    duration?: number;
    segments?: TranscriptionSegment[];
    provider: string;
    metadata?: {
        model?: string;
        processingTime?: number;
        cost?: number;
    };
}
```

### 2. Adapter 패턴 구현

```typescript
// src/infrastructure/adapters/WhisperAdapter.ts

export class WhisperAdapter implements ITranscriber {
    constructor(
        private whisperService: WhisperService,
        private logger: ILogger
    ) {}

    async transcribe(
        audio: ArrayBuffer, 
        options?: TranscriptionOptions
    ): Promise<TranscriptionResponse> {
        // 옵션 변환
        const whisperOptions = this.convertOptions(options);
        
        // 기존 WhisperService 호출
        const response = await this.whisperService.transcribe(audio, whisperOptions);
        
        // 응답 변환
        return this.convertResponse(response);
    }

    private convertOptions(options?: TranscriptionOptions): WhisperOptions {
        return {
            model: options?.model || 'whisper-1',
            language: options?.language,
            temperature: options?.whisper?.temperature,
            prompt: options?.whisper?.prompt,
            responseFormat: options?.whisper?.responseFormat || 'verbose_json'
        };
    }

    private convertResponse(response: WhisperResponse): TranscriptionResponse {
        return {
            text: response.text,
            language: response.language,
            duration: response.duration,
            segments: response.segments?.map(s => ({
                id: s.id,
                start: s.start,
                end: s.end,
                text: s.text,
                confidence: 1 - s.no_speech_prob
            })),
            provider: 'whisper',
            metadata: {
                model: 'whisper-1',
                processingTime: response.duration
            }
        };
    }

    getProviderName(): string {
        return 'OpenAI Whisper';
    }

    getCapabilities(): ProviderCapabilities {
        return {
            streaming: false,
            realtime: false,
            languages: ['en', 'ko', 'ja', 'zh', 'es', 'fr', 'de'],
            maxFileSize: 25 * 1024 * 1024,
            audioFormats: ['mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'wav', 'webm'],
            features: ['transcription', 'translation', 'timestamps']
        };
    }

    async validateApiKey(key: string): Promise<boolean> {
        return this.whisperService.validateApiKey(key);
    }

    cancel(): void {
        this.whisperService.cancel();
    }
}
```

### 3. Deepgram 서비스 구현

```typescript
// src/infrastructure/api/DeepgramService.ts

export class DeepgramService {
    private readonly API_ENDPOINT = 'https://api.deepgram.com/v1/listen';
    private circuitBreaker: CircuitBreaker;
    private retryStrategy: RetryStrategy;
    private rateLimiter: RateLimiter;
    
    constructor(
        private apiKey: string,
        private logger: ILogger
    ) {
        // 기존 WhisperService의 패턴 재사용
        this.circuitBreaker = new CircuitBreaker(logger);
        this.retryStrategy = new ExponentialBackoffRetry(logger);
        this.rateLimiter = new RateLimiter(100, 60000); // 100 requests per minute
    }

    async transcribe(
        audio: ArrayBuffer,
        options?: DeepgramOptions
    ): Promise<DeepgramResponse> {
        await this.rateLimiter.acquire();
        
        return this.circuitBreaker.execute(() =>
            this.retryStrategy.execute(() =>
                this.performTranscription(audio, options)
            )
        );
    }

    private async performTranscription(
        audio: ArrayBuffer,
        options?: DeepgramOptions
    ): Promise<DeepgramResponse> {
        const url = this.buildUrl(options);
        const headers = this.buildHeaders();
        
        const response = await requestUrl({
            url,
            method: 'POST',
            headers,
            body: audio,
            timeout: 30000
        });

        if (response.status === 200) {
            return this.parseResponse(response.json);
        }
        
        throw this.handleError(response);
    }

    private buildUrl(options?: DeepgramOptions): string {
        const params = new URLSearchParams();
        
        if (options?.model) params.append('model', options.model);
        if (options?.language) params.append('language', options.language);
        if (options?.punctuate) params.append('punctuate', 'true');
        if (options?.smartFormat) params.append('smart_format', 'true');
        
        return `${this.API_ENDPOINT}?${params.toString()}`;
    }

    private buildHeaders(): Record<string, string> {
        return {
            'Authorization': `Token ${this.apiKey}`,
            'Content-Type': 'audio/wav'
        };
    }

    // 스트리밍 지원
    async transcribeStream(
        audioStream: ReadableStream,
        options?: DeepgramOptions,
        onPartialResult?: (text: string) => void
    ): Promise<DeepgramResponse> {
        // WebSocket 연결을 통한 실시간 전사
        const ws = new WebSocket(this.buildWebSocketUrl(options));
        
        return new Promise((resolve, reject) => {
            ws.onopen = () => {
                this.streamAudio(audioStream, ws);
            };
            
            ws.onmessage = (event) => {
                const result = JSON.parse(event.data);
                if (result.is_final) {
                    resolve(this.parseResponse(result));
                } else if (onPartialResult) {
                    onPartialResult(result.channel.alternatives[0].transcript);
                }
            };
            
            ws.onerror = reject;
        });
    }
}
```

### 4. Factory 패턴 구현

```typescript
// src/infrastructure/factory/TranscriptionProviderFactory.ts

export class TranscriptionProviderFactory {
    private providers = new Map<string, ITranscriber>();
    private config: ProviderConfig;
    
    constructor(
        private settingsManager: ISettingsManager,
        private logger: ILogger
    ) {
        this.config = this.loadConfig();
        this.initializeProviders();
    }

    private initializeProviders(): void {
        // Whisper Provider
        if (this.config.whisper?.enabled) {
            const whisperService = new WhisperService(
                this.config.whisper.apiKey,
                this.logger
            );
            this.providers.set('whisper', new WhisperAdapter(whisperService, this.logger));
        }
        
        // Deepgram Provider
        if (this.config.deepgram?.enabled) {
            const deepgramService = new DeepgramService(
                this.config.deepgram.apiKey,
                this.logger
            );
            this.providers.set('deepgram', new DeepgramAdapter(deepgramService, this.logger));
        }
    }

    getProvider(preference?: string): ITranscriber {
        // 1. 명시적 선호도
        if (preference && this.providers.has(preference)) {
            return this.providers.get(preference)!;
        }
        
        // 2. 자동 선택 로직
        if (this.config.autoSelect) {
            return this.selectOptimalProvider();
        }
        
        // 3. 기본 Provider
        const defaultProvider = this.providers.get(this.config.defaultProvider);
        if (defaultProvider) {
            return defaultProvider;
        }
        
        throw new Error('No transcription provider available');
    }

    private selectOptimalProvider(): ITranscriber {
        // 비용, 성능, 가용성 기반 선택
        const metrics = this.evaluateProviders();
        const optimal = metrics.reduce((best, current) => 
            current.score > best.score ? current : best
        );
        
        return this.providers.get(optimal.name)!;
    }

    private evaluateProviders(): ProviderMetrics[] {
        return Array.from(this.providers.entries()).map(([name, provider]) => ({
            name,
            score: this.calculateScore(provider),
            available: this.checkAvailability(provider)
        }));
    }

    // A/B 테스팅 지원
    getProviderForABTest(userId: string): ITranscriber {
        const hash = this.hashUserId(userId);
        const threshold = this.config.abTest?.trafficSplit || 0.5;
        
        return hash < threshold 
            ? this.providers.get('whisper')!
            : this.providers.get('deepgram')!;
    }
}
```

### 5. 설정 관리 시스템

```typescript
// src/infrastructure/config/TranscriptionConfig.ts

export interface TranscriptionProviderConfig {
    // Provider 선택
    defaultProvider: 'whisper' | 'deepgram';
    autoSelect: boolean;
    fallbackEnabled: boolean;
    
    // Provider별 설정
    whisper?: {
        enabled: boolean;
        apiKey: string;
        model?: string;
        maxConcurrency?: number;
    };
    
    deepgram?: {
        enabled: boolean;
        apiKey: string;
        model?: string;
        tier?: 'nova' | 'enhanced' | 'base';
        features?: {
            punctuation?: boolean;
            smartFormat?: boolean;
            diarization?: boolean;
            numerals?: boolean;
        };
    };
    
    // A/B 테스팅
    abTest?: {
        enabled: boolean;
        trafficSplit: number; // 0-1, Whisper 트래픽 비율
        metricTracking: boolean;
    };
    
    // 모니터링
    monitoring?: {
        enabled: boolean;
        metricsEndpoint?: string;
        alertThresholds?: {
            errorRate?: number;
            latency?: number;
            cost?: number;
        };
    };
}

export class TranscriptionConfigManager {
    private config: TranscriptionProviderConfig;
    private validators: Map<string, ConfigValidator>;
    
    constructor(private settingsManager: ISettingsManager) {
        this.loadConfig();
        this.setupValidators();
    }

    async updateConfig(updates: Partial<TranscriptionProviderConfig>): Promise<void> {
        // 검증
        await this.validateConfig(updates);
        
        // 병합
        this.config = { ...this.config, ...updates };
        
        // 저장
        await this.settingsManager.save(this.config);
        
        // 이벤트 발생
        this.notifyConfigChange();
    }

    private async validateConfig(config: Partial<TranscriptionProviderConfig>): Promise<void> {
        // API 키 검증
        if (config.whisper?.apiKey) {
            await this.validateApiKey('whisper', config.whisper.apiKey);
        }
        if (config.deepgram?.apiKey) {
            await this.validateApiKey('deepgram', config.deepgram.apiKey);
        }
        
        // 논리적 일관성 검증
        if (config.defaultProvider && !config[config.defaultProvider]?.enabled) {
            throw new Error(`Default provider ${config.defaultProvider} is not enabled`);
        }
    }

    // 동적 설정 변경 지원
    enableProvider(provider: 'whisper' | 'deepgram'): void {
        this.updateConfig({
            [provider]: { ...this.config[provider], enabled: true }
        });
    }

    switchDefaultProvider(provider: 'whisper' | 'deepgram'): void {
        this.updateConfig({ defaultProvider: provider });
    }

    setABTestSplit(split: number): void {
        this.updateConfig({
            abTest: { ...this.config.abTest, trafficSplit: split }
        });
    }
}
```

## 데이터 흐름

### 1. 기본 전사 흐름

```
User Request
     │
     ▼
TranscriptionService
     │
     ├──> Provider Selection
     │         │
     │         ├──> Check User Preference
     │         ├──> Check A/B Test
     │         └──> Auto Select
     │
     ▼
Selected Provider (Adapter)
     │
     ├──> Pre-processing
     │         │
     │         ├──> Audio Validation
     │         ├──> Format Conversion
     │         └──> Size Check
     │
     ▼
API Service (Whisper/Deepgram)
     │
     ├──> Rate Limiting
     ├──> Circuit Breaking
     ├──> Retry Logic
     └──> API Call
     │
     ▼
Response Processing
     │
     ├──> Format Normalization
     ├──> Error Handling
     └──> Metrics Collection
     │
     ▼
Unified Response
```

### 2. 스트리밍 전사 흐름 (Deepgram)

```
Audio Stream Input
     │
     ▼
Stream Chunking
     │
     ▼
WebSocket Connection
     │
     ├──> Connection Management
     ├──> Heartbeat
     └──> Reconnection Logic
     │
     ▼
Continuous Processing
     │
     ├──> Partial Results
     │         │
     │         └──> UI Update
     │
     └──> Final Result
           │
           └──> Complete Transcription
```

### 3. 에러 처리 및 폴백

```
Primary Provider Failure
     │
     ▼
Error Classification
     │
     ├──> Retryable Error ──> Retry Strategy
     │
     ├──> Non-Retryable Error
     │         │
     │         └──> Fallback Check
     │                   │
     │                   ├──> Yes ──> Secondary Provider
     │                   │
     │                   └──> No ──> User Notification
     │
     └──> Circuit Open ──> Wait & Half-Open
```

## 마이그레이션 전략

### Phase 1: 준비 단계 (1주)
```
Week 1:
├── Day 1-2: 인터페이스 정의 및 Adapter 패턴 구현
├── Day 3-4: DeepgramService 기본 구현
├── Day 5-6: Factory 패턴 및 설정 시스템 구현
└── Day 7: 단위 테스트 작성
```

### Phase 2: 통합 단계 (1주)
```
Week 2:
├── Day 1-2: TranscriptionService 수정
├── Day 3-4: UI 설정 페이지 업데이트
├── Day 5-6: 통합 테스트
└── Day 7: 문서화
```

### Phase 3: 실험 단계 (2주)
```
Week 3-4:
├── Week 3:
│   ├── A/B 테스트 설정 (10% 트래픽)
│   ├── 메트릭 수집 시작
│   └── 초기 피드백 수집
│
└── Week 4:
    ├── 트래픽 점진적 증가 (10% → 25% → 50%)
    ├── 성능 비교 분석
    └── 이슈 해결
```

### Phase 4: 전환 단계 (1주)
```
Week 5:
├── Day 1-2: 최종 검증
├── Day 3-4: 100% 전환 또는 비율 고정
├── Day 5: 모니터링 강화
└── Day 6-7: 최적화 및 정리
```

### 롤백 계획

```typescript
// src/infrastructure/rollback/RollbackManager.ts

export class RollbackManager {
    private snapshots = new Map<string, ConfigSnapshot>();
    
    async createSnapshot(name: string): Promise<void> {
        const currentConfig = await this.configManager.getConfig();
        const metrics = await this.metricsCollector.getCurrentMetrics();
        
        this.snapshots.set(name, {
            config: currentConfig,
            metrics: metrics,
            timestamp: Date.now()
        });
    }
    
    async rollback(snapshotName: string): Promise<void> {
        const snapshot = this.snapshots.get(snapshotName);
        if (!snapshot) {
            throw new Error(`Snapshot ${snapshotName} not found`);
        }
        
        // 1. 설정 복원
        await this.configManager.restoreConfig(snapshot.config);
        
        // 2. Provider 재초기화
        await this.providerFactory.reinitialize();
        
        // 3. 캐시 무효화
        await this.cacheManager.invalidate();
        
        // 4. 알림
        this.notificationService.notify('Rollback completed', 'warning');
    }
}
```

## 구현 로드맵

### 1단계: 핵심 인프라 (필수)
- [ ] ITranscriber 인터페이스 정의
- [ ] WhisperAdapter 구현
- [ ] DeepgramService 기본 구현
- [ ] DeepgramAdapter 구현
- [ ] TranscriptionProviderFactory 구현

### 2단계: 설정 및 관리 (필수)
- [ ] TranscriptionConfig 스키마 정의
- [ ] ConfigManager 구현
- [ ] UI 설정 페이지 업데이트
- [ ] API 키 검증 로직

### 3단계: 고급 기능 (선택)
- [ ] A/B 테스팅 시스템
- [ ] 메트릭 수집 시스템
- [ ] 자동 Provider 선택 알고리즘
- [ ] 스트리밍 전사 지원

### 4단계: 안정성 (필수)
- [ ] 포괄적 에러 처리
- [ ] Fallback 메커니즘
- [ ] 롤백 시스템
- [ ] 모니터링 대시보드

### 5단계: 최적화 (선택)
- [ ] 응답 캐싱
- [ ] 배치 처리
- [ ] 비용 최적화 알고리즘
- [ ] 성능 프로파일링

## 테스트 전략

### 단위 테스트
```typescript
describe('DeepgramAdapter', () => {
    it('should convert options correctly');
    it('should handle API errors gracefully');
    it('should respect rate limits');
    it('should normalize responses');
});

describe('TranscriptionProviderFactory', () => {
    it('should select correct provider based on preference');
    it('should fallback when primary fails');
    it('should handle A/B test assignment');
});
```

### 통합 테스트
```typescript
describe('Migration Integration', () => {
    it('should maintain backward compatibility');
    it('should switch providers seamlessly');
    it('should preserve all existing features');
    it('should handle concurrent requests');
});
```

### 성능 테스트
```typescript
describe('Performance Comparison', () => {
    it('should measure latency differences');
    it('should compare accuracy rates');
    it('should track cost per transcription');
    it('should monitor resource usage');
});
```

## 모니터링 메트릭

### 핵심 메트릭
- **Latency**: P50, P95, P99 응답 시간
- **Error Rate**: Provider별 에러율
- **Cost**: 전사당 평균 비용
- **Accuracy**: 샘플 기반 정확도 측정
- **Availability**: Provider 가용성

### 비즈니스 메트릭
- **User Satisfaction**: 사용자 피드백
- **Adoption Rate**: Provider 전환율
- **Feature Usage**: 기능별 사용 통계

## 위험 요소 및 대응

### 기술적 위험
1. **API 호환성 문제**
   - 대응: 철저한 Adapter 테스트
   
2. **성능 저하**
   - 대응: A/B 테스트로 점진적 검증

3. **비용 증가**
   - 대응: 비용 모니터링 및 알림

### 운영적 위험
1. **사용자 혼란**
   - 대응: 명확한 설정 UI 제공

2. **데이터 손실**
   - 대응: 트랜잭션 로깅

3. **롤백 실패**
   - 대응: 다단계 롤백 계획

## 결론

이 설계는 안전하고 점진적인 마이그레이션을 보장하면서도 미래의 확장성을 고려한 구조입니다. Adapter 패턴과 Factory 패턴의 조합으로 Provider 독립적인 아키텍처를 구현하며, 기존 코드의 재사용을 최대화합니다.

핵심 성공 요인:
- ✅ 무중단 마이그레이션
- ✅ 완벽한 롤백 가능
- ✅ A/B 테스트 지원
- ✅ 확장 가능한 구조
- ✅ 기존 기능 100% 호환