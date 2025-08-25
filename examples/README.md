# 예제 코드 모음

이 디렉토리는 Phase 2 핵심 기능 개발을 위한 실제 구현 예제들을 포함합니다.

## 📁 파일 목록

### 1. FileProcessor.example.ts
**옵시디언 Vault 내 파일 처리 예제**
- Vault에서 오디오 파일 접근
- 파일 검증 및 메타데이터 추출
- 배치 처리 구현
- 진행 상황 추적

**주요 기능:**
- `AudioFileProcessorExample`: 완전한 파일 처리 클래스
- 파일 크기 및 형식 검증
- ArrayBuffer 변환
- 배치 처리 지원

### 2. WhisperAPI.example.ts
**OpenAI Whisper API 통합 예제**
- 기본 및 고급 변환 옵션
- FormData 구성
- 다양한 응답 형식 처리
- 에러 처리 및 재시도

**주요 기능:**
- `WhisperAPIExample`: 완전한 API 클라이언트
- 모든 Whisper API 옵션 지원
- 타임스탬프 및 언어 감지
- 청크 기반 처리 (대용량 파일)

### 3. ErrorHandling.example.ts
**포괄적인 에러 처리 예제**
- 지수 백오프 재시도 로직
- Circuit Breaker 패턴 구현
- 사용자 친화적 에러 메시지
- 에러 분류 및 복구 전략

**주요 기능:**
- `RetryWithBackoffExample`: 지능적인 재시도 메커니즘
- `CircuitBreakerExample`: 장애 격리 패턴
- `UserFriendlyErrorExample`: 사용자 알림 시스템

## 🚀 사용 방법

### 파일 처리 예제
```typescript
import { AudioFileProcessorExample } from './FileProcessor.example';

const processor = new AudioFileProcessorExample(app, vault);
const result = await processor.processAudioFile('recordings/meeting.m4a');

if (result.success) {
    console.log('File processed:', result.metadata);
    // Whisper API로 전송...
}
```

### API 통합 예제
```typescript
import { WhisperAPIExample } from './WhisperAPI.example';

const client = new WhisperAPIExample(apiKey);
const result = await client.advancedTranscription(audioBuffer, {
    language: 'ko',
    responseFormat: 'verbose_json',
    includeTimestamps: true
});

if (result.success) {
    console.log('Transcription:', result.text);
    console.log('Segments:', result.segments);
}
```

### 에러 처리 예제
```typescript
import { RetryWithBackoffExample } from './ErrorHandling.example';

const retryManager = new RetryWithBackoffExample();
const result = await retryManager.executeWithRetry(
    async () => {
        return await whisperAPI.transcribe(audio);
    },
    {
        maxRetries: 3,
        baseDelay: 1000,
        shouldRetry: (error) => error.status === 429
    }
);
```

## 📝 구현 체크리스트

### 파일 처리
- [x] Vault 파일 접근
- [x] 파일 검증 (크기, 형식)
- [x] 메타데이터 추출
- [x] 배치 처리
- [x] 진행 상황 추적

### API 통합
- [x] 기본 변환
- [x] 고급 옵션 (언어, 프롬프트, 온도)
- [x] 타임스탬프 처리
- [x] 에러 처리
- [x] 요청 취소

### 에러 처리
- [x] 재시도 로직 (지수 백오프)
- [x] Circuit Breaker
- [x] 사용자 알림
- [x] 에러 분류
- [x] 복구 전략

## 🔧 설정 요구사항

### TypeScript 설정
```json
{
  "compilerOptions": {
    "target": "ES2018",
    "module": "ESNext",
    "lib": ["ES2018", "DOM"],
    "strict": true,
    "esModuleInterop": true
  }
}
```

### 필요한 타입 정의
```bash
npm install --save-dev @types/node obsidian
```

## 📚 참고 자료

- [Obsidian Plugin API](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- [OpenAI Whisper API](https://platform.openai.com/docs/guides/speech-to-text)
- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)
- [Exponential Backoff](https://en.wikipedia.org/wiki/Exponential_backoff)

## 🧪 테스트

각 예제 파일은 독립적으로 테스트 가능하도록 설계되었습니다:

```typescript
// 예제 파일 끝부분의 exampleUsage() 함수 실행
import { exampleUsage } from './WhisperAPI.example';
await exampleUsage('your-api-key');
```

## 💡 팁

1. **메모리 관리**: 대용량 파일 처리 시 청크 단위로 처리하여 메모리 사용 최적화
2. **에러 처리**: 네트워크 에러와 API 에러를 구분하여 적절한 재시도 전략 적용
3. **사용자 경험**: 진행 상황 표시와 명확한 에러 메시지로 사용자 경험 개선
4. **성능**: Circuit Breaker로 불필요한 API 호출 방지

---

*이 예제들은 실제 프로덕션 코드에 바로 적용 가능하도록 작성되었습니다.*