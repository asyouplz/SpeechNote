# 시스템 아키텍처 다이어그램

## 1. 전체 시스템 아키텍처

```mermaid
graph TB
    subgraph "Presentation Layer"
        UI[User Interface]
        Settings[Settings UI]
        Dashboard[Monitoring Dashboard]
    end
    
    subgraph "Application Layer"
        TS[TranscriptionService]
        EM[EventManager]
        SM[StateManager]
    end
    
    subgraph "Adapter Layer"
        TPA[TranscriptionProviderAdapter]
        ITranscriber[ITranscriber Interface]
        WA[WhisperAdapter]
        DA[DeepgramAdapter]
    end
    
    subgraph "Service Layer"
        WS[WhisperService]
        DS[DeepgramService]
    end
    
    subgraph "Infrastructure Layer"
        CB[Circuit Breaker]
        RS[Retry Strategy]
        RL[Rate Limiter]
        Cache[Response Cache]
    end
    
    subgraph "Factory & Config"
        PF[Provider Factory]
        CM[Config Manager]
        ABT[A/B Test Manager]
    end
    
    subgraph "External APIs"
        WAPI[OpenAI Whisper API]
        DAPI[Deepgram API]
    end
    
    UI --> TS
    Settings --> CM
    Dashboard --> EM
    
    TS --> TPA
    TPA --> ITranscriber
    ITranscriber --> WA
    ITranscriber --> DA
    
    WA --> WS
    DA --> DS
    
    WS --> CB
    DS --> CB
    CB --> RS
    RS --> RL
    
    WS --> WAPI
    DS --> DAPI
    
    PF --> TPA
    CM --> PF
    ABT --> PF
    
    EM --> Dashboard
    SM --> TS
```

## 2. Provider 선택 플로우

```mermaid
flowchart TD
    Start([User Request]) --> Check{Provider Preference?}
    
    Check -->|Explicit| UsePreferred[Use Preferred Provider]
    Check -->|Auto| ABCheck{A/B Test Enabled?}
    Check -->|Default| UseDefault[Use Default Provider]
    
    ABCheck -->|Yes| HashUser[Hash User ID]
    ABCheck -->|No| AutoSelect[Auto Selection Algorithm]
    
    HashUser --> Split{Traffic Split}
    Split -->|< Threshold| SelectWhisper[Select Whisper]
    Split -->|>= Threshold| SelectDeepgram[Select Deepgram]
    
    AutoSelect --> Evaluate[Evaluate Providers]
    Evaluate --> Score[Calculate Scores]
    Score --> SelectBest[Select Best Provider]
    
    UsePreferred --> Validate{Provider Available?}
    UseDefault --> Validate
    SelectWhisper --> Validate
    SelectDeepgram --> Validate
    SelectBest --> Validate
    
    Validate -->|Yes| CreateAdapter[Create Adapter Instance]
    Validate -->|No| Fallback{Fallback Available?}
    
    Fallback -->|Yes| UseFallback[Use Fallback Provider]
    Fallback -->|No| Error[Throw Error]
    
    UseFallback --> CreateAdapter
    CreateAdapter --> Execute[Execute Transcription]
    
    Execute --> Success{Success?}
    Success -->|Yes| Return[Return Result]
    Success -->|No| HandleError[Handle Error]
    
    HandleError --> Retry{Retryable?}
    Retry -->|Yes| Execute
    Retry -->|No| TryFallback{Try Fallback?}
    
    TryFallback -->|Yes| Fallback
    TryFallback -->|No| Error
    
    Return --> End([Complete])
    Error --> End
```

## 3. 데이터 플로우 다이어그램

```mermaid
sequenceDiagram
    participant U as User
    participant UI as UI Layer
    participant TS as TranscriptionService
    participant PF as Provider Factory
    participant A as Adapter
    participant S as Service (W/D)
    participant API as External API
    participant C as Cache
    participant M as Metrics
    
    U->>UI: Upload Audio File
    UI->>TS: transcribe(file)
    
    TS->>PF: getProvider(preference)
    PF->>PF: Select Provider Logic
    PF-->>TS: Return Adapter
    
    TS->>A: transcribe(audio, options)
    
    A->>C: Check Cache
    alt Cache Hit
        C-->>A: Return Cached Result
        A-->>TS: Return Result
    else Cache Miss
        A->>S: Call Service
        
        S->>S: Rate Limit Check
        S->>S: Circuit Breaker Check
        
        S->>API: HTTP/WebSocket Request
        API-->>S: Response
        
        S->>S: Retry if needed
        S-->>A: Return Response
        
        A->>A: Normalize Response
        A->>C: Store in Cache
        A->>M: Record Metrics
        A-->>TS: Return Result
    end
    
    TS-->>UI: Display Result
    UI-->>U: Show Transcription
```

## 4. 클래스 다이어그램

```mermaid
classDiagram
    class ITranscriber {
        <<interface>>
        +transcribe(audio, options)
        +validateApiKey(key)
        +cancel()
        +getProviderName()
        +getCapabilities()
    }
    
    class BaseAdapter {
        <<abstract>>
        #logger: ILogger
        +transcribe(audio, options)*
        +validateApiKey(key)*
        +cancel()*
        #convertOptions(options)*
        #convertResponse(response)*
    }
    
    class WhisperAdapter {
        -whisperService: WhisperService
        +transcribe(audio, options)
        +validateApiKey(key)
        +cancel()
        -convertOptions(options)
        -convertResponse(response)
    }
    
    class DeepgramAdapter {
        -deepgramService: DeepgramService
        +transcribe(audio, options)
        +validateApiKey(key)
        +cancel()
        -convertOptions(options)
        -convertResponse(response)
        +transcribeStream(stream, options)
    }
    
    class WhisperService {
        -apiKey: string
        -circuitBreaker: CircuitBreaker
        -retryStrategy: RetryStrategy
        +transcribe(audio, options)
        +validateApiKey(key)
        +cancel()
    }
    
    class DeepgramService {
        -apiKey: string
        -circuitBreaker: CircuitBreaker
        -retryStrategy: RetryStrategy
        -rateLimiter: RateLimiter
        +transcribe(audio, options)
        +transcribeStream(stream, options)
        +validateApiKey(key)
        +cancel()
    }
    
    class TranscriptionProviderFactory {
        -providers: Map
        -config: ProviderConfig
        +getProvider(preference)
        +getProviderForABTest(userId)
        -selectOptimalProvider()
        -evaluateProviders()
    }
    
    class CircuitBreaker {
        -state: string
        -failureCount: number
        +execute(operation)
        -onSuccess()
        -onFailure()
        +reset()
    }
    
    class RetryStrategy {
        <<interface>>
        +execute(operation)
    }
    
    class ExponentialBackoffRetry {
        -maxRetries: number
        -baseDelay: number
        +execute(operation)
        -calculateDelay(attempt)
    }
    
    ITranscriber <|.. BaseAdapter
    BaseAdapter <|-- WhisperAdapter
    BaseAdapter <|-- DeepgramAdapter
    
    WhisperAdapter --> WhisperService
    DeepgramAdapter --> DeepgramService
    
    WhisperService --> CircuitBreaker
    WhisperService --> RetryStrategy
    DeepgramService --> CircuitBreaker
    DeepgramService --> RetryStrategy
    
    RetryStrategy <|.. ExponentialBackoffRetry
    
    TranscriptionProviderFactory --> ITranscriber
    TranscriptionProviderFactory ..> WhisperAdapter : creates
    TranscriptionProviderFactory ..> DeepgramAdapter : creates
```

## 5. 에러 처리 플로우

```mermaid
stateDiagram-v2
    [*] --> Request
    Request --> Processing
    
    Processing --> Success: No Error
    Processing --> Error: Error Occurred
    
    Error --> ClassifyError
    
    ClassifyError --> RetryableError: Network/Timeout
    ClassifyError --> NonRetryableError: Auth/Validation
    ClassifyError --> RateLimitError: 429 Status
    
    RetryableError --> CheckRetryCount
    CheckRetryCount --> Retry: Count < Max
    CheckRetryCount --> CircuitOpen: Count >= Max
    
    Retry --> Processing
    
    RateLimitError --> WaitBackoff
    WaitBackoff --> Processing
    
    NonRetryableError --> CheckFallback
    CircuitOpen --> CheckFallback
    
    CheckFallback --> UseFallback: Fallback Available
    CheckFallback --> FailureResponse: No Fallback
    
    UseFallback --> FallbackProcessing
    FallbackProcessing --> Success: No Error
    FallbackProcessing --> FailureResponse: Error
    
    Success --> LogMetrics
    FailureResponse --> LogMetrics
    
    LogMetrics --> [*]
```

## 6. 마이그레이션 단계별 아키텍처 변화

### Phase 1: 현재 상태 (Whisper Only)
```
UI → TranscriptionService → WhisperService → Whisper API
```

### Phase 2: Adapter 도입
```
UI → TranscriptionService → ITranscriber → WhisperAdapter → WhisperService → Whisper API
```

### Phase 3: Deepgram 추가
```
UI → TranscriptionService → Factory → ITranscriber
                                    ├── WhisperAdapter → WhisperService → Whisper API
                                    └── DeepgramAdapter → DeepgramService → Deepgram API
```

### Phase 4: 완전 마이그레이션
```
UI → TranscriptionService → Factory → DeepgramAdapter → DeepgramService → Deepgram API
                                    └── (WhisperAdapter as Fallback)
```

## 7. 스트리밍 아키텍처 (Deepgram 전용)

```mermaid
sequenceDiagram
    participant C as Client
    participant DA as DeepgramAdapter
    participant DS as DeepgramService
    participant WS as WebSocket
    participant API as Deepgram API
    
    C->>DA: transcribeStream(audioStream)
    DA->>DS: initializeStream()
    
    DS->>WS: Create WebSocket Connection
    WS->>API: Connect
    API-->>WS: Connection Established
    
    loop Audio Chunks
        C->>DA: Audio Chunk
        DA->>DS: Process Chunk
        DS->>WS: Send Chunk
        WS->>API: Audio Data
        
        API-->>WS: Partial Result
        WS-->>DS: Receive Result
        DS-->>DA: Process Result
        DA-->>C: onPartialResult(text)
    end
    
    C->>DA: End Stream
    DA->>DS: Finalize
    DS->>WS: Close Connection
    
    API-->>WS: Final Result
    WS-->>DS: Final Response
    DS-->>DA: Process Final
    DA-->>C: Final Transcription
```

## 8. 모니터링 및 메트릭 수집

```mermaid
graph LR
    subgraph "Provider Metrics"
        PM1[Response Time]
        PM2[Error Rate]
        PM3[Success Rate]
        PM4[Cost per Request]
    end
    
    subgraph "System Metrics"
        SM1[Memory Usage]
        SM2[CPU Usage]
        SM3[Cache Hit Rate]
        SM4[Queue Length]
    end
    
    subgraph "Business Metrics"
        BM1[User Satisfaction]
        BM2[Transcription Accuracy]
        BM3[Total Cost]
        BM4[Usage Volume]
    end
    
    subgraph "Collectors"
        PC[Provider Collector]
        SC[System Collector]
        BC[Business Collector]
    end
    
    subgraph "Aggregators"
        MA[Metrics Aggregator]
        AA[Alert Aggregator]
    end
    
    subgraph "Outputs"
        D[Dashboard]
        A[Alerts]
        R[Reports]
    end
    
    PM1 --> PC
    PM2 --> PC
    PM3 --> PC
    PM4 --> PC
    
    SM1 --> SC
    SM2 --> SC
    SM3 --> SC
    SM4 --> SC
    
    BM1 --> BC
    BM2 --> BC
    BM3 --> BC
    BM4 --> BC
    
    PC --> MA
    SC --> MA
    BC --> MA
    
    MA --> D
    MA --> AA
    MA --> R
    
    AA --> A
```

## 9. 설정 관리 시스템

```mermaid
graph TD
    subgraph "Configuration Sources"
        UC[User Config]
        DC[Default Config]
        EC[Environment Config]
    end
    
    subgraph "Config Manager"
        CM[ConfigManager]
        CV[ConfigValidator]
        CMig[ConfigMigrator]
    end
    
    subgraph "Provider Configs"
        WC[Whisper Config]
        DGC[Deepgram Config]
        ABC[A/B Test Config]
    end
    
    subgraph "Runtime"
        PF[Provider Factory]
        PM[Provider Manager]
    end
    
    UC --> CM
    DC --> CM
    EC --> CM
    
    CM --> CV
    CV --> CMig
    CMig --> WC
    CMig --> DGC
    CMig --> ABC
    
    WC --> PF
    DGC --> PF
    ABC --> PF
    
    PF --> PM
    
    PM --> |Create| WA[Whisper Adapter]
    PM --> |Create| DA[Deepgram Adapter]
```

## 10. 보안 및 인증 플로우

```mermaid
sequenceDiagram
    participant U as User
    participant UI as Settings UI
    participant VM as Validation Manager
    participant E as Encryptor
    participant S as Storage
    participant P as Provider
    
    U->>UI: Enter API Key
    UI->>VM: Validate Format
    
    alt Valid Format
        VM->>P: Test API Key
        P-->>VM: Validation Result
        
        alt Valid Key
            VM->>E: Encrypt Key
            E-->>VM: Encrypted Key
            VM->>S: Store Encrypted
            S-->>VM: Success
            VM-->>UI: Validation Success
            UI-->>U: Show Success
        else Invalid Key
            VM-->>UI: Validation Failed
            UI-->>U: Show Error
        end
    else Invalid Format
        VM-->>UI: Format Error
        UI-->>U: Show Format Error
    end
    
    Note over S: Keys stored encrypted
    Note over P: Keys never logged
```

이 다이어그램들은 Deepgram API 마이그레이션의 전체 시스템 아키텍처를 시각적으로 표현합니다. 각 다이어그램은 시스템의 다른 측면을 보여주며, 구현 시 참고할 수 있는 청사진 역할을 합니다.