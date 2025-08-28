# Deepgram API 마이그레이션 가이드

## 목차
1. [개요](#개요)
2. [설치 및 설정](#설치-및-설정)
3. [코드 변경 사항](#코드-변경-사항)
4. [마이그레이션 단계](#마이그레이션-단계)
5. [테스트](#테스트)
6. [문제 해결](#문제-해결)
7. [롤백 절차](#롤백-절차)

## 개요

이 가이드는 OpenAI Whisper API에서 Deepgram API로의 점진적 마이그레이션을 안내합니다.

### 주요 이점
- **비용 절감**: Deepgram은 Whisper보다 약 20-30% 저렴
- **성능 향상**: 더 빠른 응답 시간
- **추가 기능**: 실시간 스트리밍, 화자 분리, 스마트 포매팅
- **더 큰 파일 지원**: 최대 2GB (Whisper는 25MB)

### 호환성
- 기존 코드 100% 호환
- 점진적 전환 가능
- 자동 폴백 지원

## 설치 및 설정

### 1. Deepgram API 키 발급

1. [Deepgram Console](https://console.deepgram.com) 접속
2. 계정 생성 또는 로그인
3. API Keys 섹션에서 새 키 생성
4. 키를 안전한 곳에 저장

### 2. 플러그인 설정 업데이트

설정 탭에서 다음을 구성:

```typescript
// 기본 설정
{
  transcription: {
    defaultProvider: 'deepgram',  // 또는 'whisper'
    fallbackEnabled: true,
    
    whisper: {
      enabled: true,
      apiKey: 'sk-...'  // 기존 OpenAI API 키
    },
    
    deepgram: {
      enabled: true,
      apiKey: 'your-deepgram-api-key',
      tier: 'nova-2',  // 'nova-2', 'enhanced', 'base'
      features: {
        punctuation: true,
        smartFormat: true,
        diarization: false,
        numerals: true
      }
    }
  }
}
```

### 3. Provider 선택 방식

#### 수동 선택
```typescript
// 특정 Provider 사용
const provider = factory.getProvider('deepgram');
```

#### 자동 선택
```typescript
// 설정에서 자동 선택 활성화
{
  transcription: {
    autoSelect: true,
    selectionStrategy: 'cost_optimized'  // 또는 'performance_optimized'
  }
}
```

## 코드 변경 사항

### 기존 코드 (변경 불필요)

```typescript
// 기존 TranscriptionService는 그대로 동작
const result = await transcriptionService.transcribe(file);
```

### 새로운 API 사용 (선택적)

```typescript
import { TranscriberFactory } from './infrastructure/api/TranscriberFactory';

// Factory 초기화
const factory = new TranscriberFactory(settingsManager, logger);

// Provider 가져오기
const provider = factory.getProvider('deepgram');  // 또는 'whisper', 'auto'

// 전사 실행
const result = await provider.transcribe(audioBuffer, {
  language: 'ko',
  deepgram: {
    tier: 'nova-2',
    smartFormat: true,
    diarization: true
  }
});
```

### Provider별 옵션

#### Whisper 옵션
```typescript
{
  whisper: {
    temperature: 0.3,
    prompt: 'Previous context...',
    responseFormat: 'verbose_json'
  }
}
```

#### Deepgram 옵션
```typescript
{
  deepgram: {
    tier: 'nova-2',
    punctuate: true,
    smartFormat: true,
    diarization: true,
    numerals: true,
    profanityFilter: false,
    keywords: ['specific', 'terms']
  }
}
```

## 마이그레이션 단계

### Phase 1: 준비 (Day 1-2)
1. Deepgram API 키 발급
2. 설정에 Deepgram 구성 추가
3. 두 Provider 모두 활성화

```typescript
{
  transcription: {
    defaultProvider: 'whisper',  // 아직 Whisper 유지
    fallbackEnabled: true,
    whisper: { enabled: true },
    deepgram: { enabled: true }
  }
}
```

### Phase 2: A/B 테스트 (Week 1)
1. 일부 사용자에게 Deepgram 활성화

```typescript
{
  transcription: {
    abTest: {
      enabled: true,
      trafficSplit: 0.1,  // 10% Deepgram
      metricTracking: true
    }
  }
}
```

2. 메트릭 모니터링
```typescript
const metrics = factory.getMetrics();
console.log('Whisper:', metrics.find(m => m.provider === 'whisper'));
console.log('Deepgram:', metrics.find(m => m.provider === 'deepgram'));
```

### Phase 3: 점진적 전환 (Week 2-3)
1. 트래픽 비율 증가

```typescript
// Day 1: 25%
{ trafficSplit: 0.25 }

// Day 3: 50%
{ trafficSplit: 0.5 }

// Day 5: 75%
{ trafficSplit: 0.75 }
```

2. 성능 비교
- 응답 시간
- 정확도
- 비용
- 에러율

### Phase 4: 완전 전환 (Week 4)
1. Deepgram을 기본으로 설정

```typescript
{
  transcription: {
    defaultProvider: 'deepgram',
    fallbackEnabled: true,  // Whisper는 백업으로 유지
    whisper: { enabled: true },
    deepgram: { enabled: true }
  }
}
```

## 테스트

### 단위 테스트 실행
```bash
npm test -- --testPathPattern=provider
```

### 통합 테스트
```typescript
describe('Provider Migration', () => {
  it('should maintain backward compatibility', async () => {
    const result = await transcriptionService.transcribe(file);
    expect(result.text).toBeDefined();
  });
  
  it('should switch providers seamlessly', async () => {
    const whisperResult = await factory.getProvider('whisper').transcribe(audio);
    const deepgramResult = await factory.getProvider('deepgram').transcribe(audio);
    
    expect(whisperResult.provider).toBe('whisper');
    expect(deepgramResult.provider).toBe('deepgram');
  });
});
```

### 성능 벤치마크
```typescript
async function benchmark() {
  const audio = await loadTestAudio();
  
  // Whisper
  const whisperStart = Date.now();
  await factory.getProvider('whisper').transcribe(audio);
  const whisperTime = Date.now() - whisperStart;
  
  // Deepgram
  const deepgramStart = Date.now();
  await factory.getProvider('deepgram').transcribe(audio);
  const deepgramTime = Date.now() - deepgramStart;
  
  console.log(`Whisper: ${whisperTime}ms`);
  console.log(`Deepgram: ${deepgramTime}ms`);
  console.log(`Improvement: ${((whisperTime - deepgramTime) / whisperTime * 100).toFixed(2)}%`);
}
```

## 문제 해결

### 일반적인 문제

#### 1. API 키 인증 실패
```
Error: Invalid API key
```

**해결책**:
- API 키가 올바른지 확인
- Deepgram Console에서 키 상태 확인
- 키에 필요한 권한이 있는지 확인

#### 2. Rate Limit 에러
```
Error: Rate limit exceeded
```

**해결책**:
- Rate limit 설정 조정
```typescript
{
  deepgram: {
    rateLimit: {
      requests: 50,  // 분당 요청 수 감소
      window: 60000
    }
  }
}
```

#### 3. 파일 크기 문제
```
Error: File too large
```

**해결책**:
- Deepgram은 2GB까지 지원
- 파일 압축 또는 분할 고려

#### 4. 언어 감지 실패
```
Error: Language not detected
```

**해결책**:
```typescript
{
  deepgram: {
    detectLanguage: true,  // 자동 언어 감지 활성화
    // 또는 명시적 지정
    language: 'ko'
  }
}
```

### 디버깅

#### 로그 레벨 설정
```typescript
logger.setLevel('debug');
```

#### Provider 상태 확인
```typescript
const isAvailable = await provider.isAvailable();
console.log(`Provider available: ${isAvailable}`);

const config = provider.getConfig();
console.log('Provider config:', config);

const capabilities = provider.getCapabilities();
console.log('Provider capabilities:', capabilities);
```

## 롤백 절차

### 즉시 롤백
1. 설정에서 기본 Provider 변경
```typescript
{
  transcription: {
    defaultProvider: 'whisper'
  }
}
```

2. Deepgram 비활성화 (선택적)
```typescript
{
  deepgram: {
    enabled: false
  }
}
```

### 점진적 롤백
1. A/B 테스트 비율 조정
```typescript
{
  abTest: {
    trafficSplit: 0.9  // 90% Whisper로 복귀
  }
}
```

2. 모니터링 후 완전 롤백
```typescript
{
  abTest: {
    enabled: false
  },
  defaultProvider: 'whisper'
}
```

### Circuit Breaker 리셋
```typescript
// Provider가 일시적으로 차단된 경우
provider.resetCircuitBreaker();
```

## 모니터링 및 알림

### 메트릭 수집
```typescript
// 주기적으로 메트릭 확인
setInterval(() => {
  const metrics = factory.getMetrics();
  
  metrics.forEach(metric => {
    if (metric.failedRequests / metric.totalRequests > 0.05) {
      console.warn(`High error rate for ${metric.provider}: ${
        (metric.failedRequests / metric.totalRequests * 100).toFixed(2)
      }%`);
    }
    
    if (metric.averageLatency > 3000) {
      console.warn(`High latency for ${metric.provider}: ${metric.averageLatency}ms`);
    }
  });
}, 60000);  // 1분마다
```

### 비용 추적
```typescript
// 비용 계산
function calculateMonthlyCost(metrics: ProviderMetrics[]): void {
  metrics.forEach(metric => {
    const estimatedMonthlyCost = metric.averageCost * metric.totalRequests * 30;
    console.log(`${metric.provider} estimated monthly cost: $${estimatedMonthlyCost.toFixed(2)}`);
  });
}
```

## 추가 리소스

- [Deepgram Documentation](https://developers.deepgram.com)
- [Deepgram API Reference](https://developers.deepgram.com/reference)
- [Deepgram SDK](https://github.com/deepgram/deepgram-js-sdk)
- [Migration Best Practices](https://deepgram.com/learn/migration-guide)

## 지원

문제가 발생하면:
1. 이 가이드의 문제 해결 섹션 확인
2. 로그 확인 (`console.log` 또는 개발자 도구)
3. GitHub Issues에 문제 보고
4. Deepgram 지원팀 문의 (support@deepgram.com)