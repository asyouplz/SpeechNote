# Deepgram Integration Guide

## 목차
1. [개요](#개요)
2. [Deepgram 설정 구성](#deepgram-설정-구성)
3. [사용 가능한 모델](#사용-가능한-모델)
4. [고급 기능](#고급-기능)
5. [비용 추정](#비용-추정)
6. [Whisper에서 Deepgram으로 전환](#whisper에서-deepgram으로-전환)
7. [최적화 팁](#최적화-팁)
8. [자주 묻는 질문](#자주-묻는-질문)

## 개요

Deepgram은 OpenAI Whisper와 함께 사용할 수 있는 강력한 음성 인식 Provider입니다. 이 가이드는 Deepgram 설정 방법과 활용 방법을 상세히 설명합니다.

### Deepgram의 주요 장점

| 특징 | Deepgram | Whisper | 비고 |
|------|----------|---------|------|
| **최대 파일 크기** | 2GB | 25MB | 80배 더 큰 파일 지원 |
| **처리 속도** | 매우 빠름 | 보통 | 평균 3-5배 빠름 |
| **실시간 스트리밍** | 지원 | 미지원 | 라이브 전사 가능 |
| **화자 분리** | 지원 | 미지원 | 다중 화자 구분 |
| **스마트 포맷팅** | 지원 | 기본 | 숫자, 날짜 자동 포맷 |
| **비용** | $0.0043/분 | $0.006/분 | 약 30% 저렴 |
| **언어 지원** | 40+ | 99 | Whisper가 더 많음 |

## Deepgram 설정 구성

### 1. API 키 발급

1. [Deepgram Console](https://console.deepgram.com/) 접속
2. 무료 계정 생성 (200분 크레딧 제공)
3. Projects → Your Project → API Keys
4. "Create a New API Key" 클릭
5. 권한 설정:
   - **Member**: 기본 전사 기능
   - **Owner**: 프로젝트 관리 포함
6. 생성된 키 안전하게 보관

### 2. 플러그인 설정

#### 설정 탭에서 구성

1. Obsidian 설정 열기 (Cmd/Ctrl + ,)
2. "Speech to Text" 플러그인 선택
3. "Provider" 탭 선택
4. Deepgram 섹션 구성:

```typescript
// 권장 설정
{
  provider: "deepgram",  // 또는 "auto"
  deepgramApiKey: "your-api-key-here",
  deepgramSettings: {
    model: "nova-2",      // 최신 모델
    language: "ko",       // 한국어
    features: {
      punctuation: true,   // 구두점 자동 추가
      smartFormat: true,   // 스마트 포맷팅
      numerals: true,      // 숫자 변환
      utterances: true     // 자연스러운 문장 분할
    }
  }
}
```

### 3. Provider 선택 방식

#### 자동 선택 (권장)
```typescript
{
  provider: "auto",
  autoProviderSettings: {
    strategy: "cost_optimized",  // 또는 "performance_optimized"
    rules: [
      { fileSize: "> 25MB", provider: "deepgram" },
      { format: "webm", provider: "deepgram" },
      { language: "ko", provider: "deepgram" }  // 한국어는 Deepgram이 우수
    ]
  }
}
```

#### 수동 선택
- 설정에서 "Deepgram" 선택
- 또는 변환 시 Provider 선택 대화상자 사용

## 사용 가능한 모델

### Nova-2 (권장)
- **최신 모델**: 가장 높은 정확도
- **비용**: $0.0043/분
- **특징**: 
  - 최고의 한국어 인식률
  - 낮은 지연시간
  - 다국어 동시 지원

### Nova
- **표준 모델**: 균형잡힌 성능
- **비용**: $0.0035/분
- **특징**:
  - 안정적인 성능
  - 대부분의 사용 사례에 적합

### Enhanced
- **고급 모델**: 특수 상황용
- **비용**: $0.0145/분
- **특징**:
  - 배경 소음 처리 우수
  - 전문 용어 인식 개선

### Base
- **기본 모델**: 비용 효율적
- **비용**: $0.0125/분
- **특징**:
  - 레거시 호환성
  - 단순한 음성에 적합

## 고급 기능

### 1. 화자 분리 (Speaker Diarization)
여러 명이 대화하는 녹음에서 화자를 구분합니다.

```typescript
{
  deepgramSettings: {
    features: {
      diarization: true,
      diarize_version: "latest"
    }
  }
}
```

**출력 예시**:
```
Speaker 0: 안녕하세요, 오늘 회의 시작하겠습니다.
Speaker 1: 네, 준비됐습니다.
Speaker 0: 첫 번째 안건은...
```

### 2. 스마트 포맷팅
숫자, 날짜, 시간을 자동으로 포맷팅합니다.

```typescript
{
  features: {
    smartFormat: true,
    numerals: true,
    dates: true,
    times: true
  }
}
```

**변환 예시**:
- "이천이십오년" → "2025년"
- "오후 세시 삼십분" → "오후 3:30"
- "일 더하기 일은 이" → "1 + 1 = 2"

### 3. 민감 정보 제거 (Redaction)
개인정보를 자동으로 마스킹합니다.

```typescript
{
  features: {
    redact: ["pci", "ssn", "numbers"],
    replace: "***"
  }
}
```

### 4. 요약 생성 (Summarization)
긴 녹음의 요약을 자동 생성합니다.

```typescript
{
  features: {
    summarize: true,
    summary_type: "bullets"  // 또는 "paragraph"
  }
}
```

### 5. 주제 감지 (Topic Detection)
대화의 주요 주제를 자동으로 식별합니다.

```typescript
{
  features: {
    detect_topics: true,
    topics_threshold: 0.6
  }
}
```

## 비용 추정

### 모델별 비용 계산기

| 모델 | 분당 비용 | 10분 녹음 | 1시간 녹음 | 월 100시간 |
|------|-----------|-----------|------------|------------|
| **Nova-2** | $0.0043 | $0.043 | $0.258 | $25.80 |
| **Nova** | $0.0035 | $0.035 | $0.210 | $21.00 |
| **Enhanced** | $0.0145 | $0.145 | $0.870 | $87.00 |
| **Base** | $0.0125 | $0.125 | $0.750 | $75.00 |

### 비용 최적화 팁

1. **Nova-2 사용**: 가장 비용 효율적
2. **불필요한 기능 비활성화**: 
   - Diarization (+25% 비용)
   - Summarization (+40% 비용)
3. **캐시 활용**: 동일 파일 재처리 방지
4. **배치 처리**: API 호출 횟수 감소

### 비용 모니터링

플러그인의 Metrics 탭에서 실시간 비용 추적:

```typescript
// 설정에서 활성화
{
  metrics: {
    trackCosts: true,
    costAlerts: {
      daily: 10,    // $10/일 초과 시 알림
      monthly: 100  // $100/월 초과 시 알림
    }
  }
}
```

## Whisper에서 Deepgram으로 전환

### 1단계: 병렬 실행 (1주차)
두 Provider를 동시에 활성화하여 비교:

```typescript
{
  provider: "auto",
  whisper: { enabled: true },
  deepgram: { enabled: true },
  fallbackEnabled: true
}
```

### 2단계: A/B 테스트 (2주차)
일부 파일만 Deepgram으로 처리:

```typescript
{
  abTesting: {
    enabled: true,
    deepgramRatio: 0.3  // 30% Deepgram 사용
  }
}
```

### 3단계: 점진적 전환 (3-4주차)
비율을 점진적으로 증가:

```typescript
// Day 1-7: 30%
{ deepgramRatio: 0.3 }

// Day 8-14: 60%
{ deepgramRatio: 0.6 }

// Day 15-21: 90%
{ deepgramRatio: 0.9 }

// Day 22+: 100%
{ provider: "deepgram" }
```

### 4단계: 완전 전환
Deepgram을 기본으로, Whisper를 백업으로:

```typescript
{
  provider: "deepgram",
  fallback: {
    enabled: true,
    provider: "whisper"
  }
}
```

## 최적화 팁

### 1. 한국어 최적화
```typescript
{
  deepgramSettings: {
    model: "nova-2",
    language: "ko",
    features: {
      punctuation: true,
      smartFormat: true,
      korean_numbers: true  // 한국어 숫자 처리 최적화
    }
  }
}
```

### 2. 긴 녹음 처리
```typescript
{
  deepgramSettings: {
    features: {
      utterances: true,      // 자연스러운 구간 분할
      paragraphs: true,      // 단락 구분
      utterance_split: 0.8   // 구간 분할 민감도
    }
  }
}
```

### 3. 회의 녹음 최적화
```typescript
{
  deepgramSettings: {
    model: "nova-2",
    features: {
      diarization: true,     // 화자 구분
      punctuation: true,
      smartFormat: true,
      summarize: true,       // 회의 요약
      detect_topics: true    // 주제 감지
    }
  }
}
```

### 4. 소음 환경 최적화
```typescript
{
  deepgramSettings: {
    model: "enhanced",       // 소음 처리 강화 모델
    features: {
      noise_reduction: true,
      multichannel: true     // 다채널 오디오 처리
    }
  }
}
```

## 자주 묻는 질문

### Q1: Deepgram과 Whisper 중 어떤 것을 선택해야 하나요?

**Deepgram 선택 기준**:
- 파일 크기가 25MB 초과
- 실시간 처리가 필요한 경우
- 화자 분리가 필요한 경우
- 비용 절감이 중요한 경우
- 한국어 음성이 주된 경우

**Whisper 선택 기준**:
- 매우 높은 정확도가 필요한 경우
- 희귀 언어 지원이 필요한 경우
- 짧은 음성 메모가 주된 경우
- OpenAI 생태계 통합이 중요한 경우

### Q2: Deepgram 무료 크레딧은 얼마나 되나요?

- **신규 가입**: 200분 무료 크레딧
- **유효 기간**: 30일
- **갱신**: 매월 자동 갱신 없음
- **추가 크레딧**: 이벤트 참여 시 추가 획득 가능

### Q3: 오프라인에서도 사용 가능한가요?

아니요, Deepgram은 클라우드 기반 서비스입니다. 오프라인 사용이 필요한 경우:
- 로컬 Whisper 모델 사용 (개발 중)
- 온라인 시 미리 변환하여 캐시 활용

### Q4: 파일 형식별 권장 설정은?

**M4A/AAC** (iOS 녹음):
```typescript
{ model: "nova-2", language: "auto" }
```

**MP3** (일반 오디오):
```typescript
{ model: "nova-2", features: { punctuation: true } }
```

**WAV** (고품질):
```typescript
{ model: "nova-2", features: { multichannel: true } }
```

**WebM** (웹 녹음):
```typescript
{ model: "nova-2", features: { noise_reduction: true } }
```

### Q5: 에러 처리는 어떻게 되나요?

플러그인은 자동 에러 처리와 재시도를 지원합니다:

1. **자동 재시도**: 3회까지 자동 재시도
2. **Provider 전환**: Deepgram 실패 시 Whisper로 자동 전환
3. **에러 로깅**: 상세한 에러 정보 기록
4. **사용자 알림**: 친숙한 에러 메시지 표시

### Q6: 보안은 어떻게 보장되나요?

**데이터 보안**:
- SSL/TLS 암호화 전송
- 서버에 30일간 보관 후 자동 삭제
- GDPR, SOC 2 Type II 준수
- 음성 데이터 학습 사용 옵션 (opt-out 가능)

**API 키 보안**:
- Obsidian 내부 암호화 저장
- 환경 변수 지원
- 키 회전 권장 (90일마다)

## 문제 해결

### 일반적인 문제와 해결책

#### 1. "Invalid API Key" 오류
- API 키가 올바른지 확인
- 키 앞뒤 공백 제거
- Deepgram Console에서 키 상태 확인

#### 2. "Rate Limit Exceeded" 오류
- 분당 요청 수 제한 확인 (기본 50/분)
- Rate limiting 설정 조정
- 유료 플랜 업그레이드 고려

#### 3. 변환 결과가 부정확한 경우
- 올바른 언어 설정 확인
- 모델을 Nova-2로 변경
- 오디오 품질 개선 (소음 제거)

#### 4. 긴 파일 처리 실패
- 파일 분할 고려 (1시간 단위)
- 메모리 설정 증가
- 네트워크 안정성 확인

## 추가 리소스

### 공식 문서
- [Deepgram Documentation](https://developers.deepgram.com/)
- [API Reference](https://developers.deepgram.com/reference)
- [SDK Guide](https://github.com/deepgram/deepgram-js-sdk)
- [Best Practices](https://developers.deepgram.com/docs/best-practices)

### 커뮤니티
- [Deepgram Community](https://community.deepgram.com/)
- [GitHub Discussions](https://github.com/deepgram/deepgram-js-sdk/discussions)
- [Discord Server](https://discord.gg/deepgram)

### 지원
- **기술 지원**: support@deepgram.com
- **영업 문의**: sales@deepgram.com
- **플러그인 이슈**: [GitHub Issues](https://github.com/asyouplz/SpeechNote-1/issues)

---

*최종 업데이트: 2025-08-30*
*버전: 3.0.3*