# Whisper에서 Deepgram으로 마이그레이션 가이드

## 개요

이 가이드는 기존 OpenAI Whisper 사용자가 Deepgram Nova 2로 전환하는 과정을 안내합니다.

### 왜 Deepgram으로 전환하나요?

| 장점 | Whisper | Deepgram |
|------|---------|----------|
| **처리 속도** | 보통 | 30% 빠름 |
| **파일 크기** | 25MB | 2GB |
| **비용** | $0.006/분 | $0.0043/분 |
| **무료 크레딧** | $5 | $200 |
| **화자 분리** | ❌ | ✅ |
| **실시간 스트리밍** | ❌ | ✅ (예정) |

## 마이그레이션 단계

### Step 1: Deepgram 계정 생성

1. [console.deepgram.com](https://console.deepgram.com) 접속
2. 무료 계정 생성 ($200 크레딧 제공)
3. Dashboard → API Keys에서 새 API 키 생성
4. 키 복사 및 안전한 곳에 보관

### Step 2: 플러그인 업데이트

```bash
# 플러그인을 v3.0.0 이상으로 업데이트
Settings → Community plugins → Speech to Text → Update
```

### Step 3: Provider 설정

1. **설정 열기**
   ```
   Settings → Speech to Text
   ```

2. **Provider 선택**
   - **Deepgram만 사용**: "Deepgram" 선택
   - **자동 선택** (권장): "Auto" 선택
   - **Fallback 설정**: 두 API 키 모두 입력

3. **API 키 입력**
   ```
   Deepgram API Key: [40자 키 입력]
   ```

4. **검증 및 저장**
   - "Validate" 버튼 클릭
   - 성공 메시지 확인
   - 설정 저장

### Step 4: 기능 차이점 이해

#### 지원 파일 형식
```yaml
Whisper 전용:
  - 없음

Deepgram 전용:
  - WebM (.webm)
  - OGG (.ogg)  
  - FLAC (.flac)

공통 지원:
  - M4A, MP3, WAV, MP4
```

#### API 옵션 차이
```typescript
// Whisper 옵션
{
  model: 'whisper-1',
  temperature: 0.2,
  prompt: '전문 용어 포함'
}

// Deepgram 옵션
{
  tier: 'nova-2',        // 최신 모델
  punctuate: true,       // 자동 문장부호
  diarize: true,         // 화자 분리
  smart_format: true,    // 스마트 포매팅
  detect_language: true  // 자동 언어 감지
}
```

### Step 5: 테스트 및 검증

1. **작은 파일로 테스트**
   ```
   10초 짧은 녹음으로 먼저 테스트
   ```

2. **결과 비교**
   - 변환 속도 확인
   - 정확도 비교
   - 특수 기능 테스트 (화자 분리 등)

3. **대용량 파일 테스트**
   ```
   25MB 이상 파일로 Deepgram 전용 기능 테스트
   ```

## Auto 모드 설정 (권장)

### 자동 Provider 선택 로직

```yaml
파일 크기 < 25MB:
  형식이 M4A/MP3/WAV/MP4: 
    → Whisper (안정적)
  형식이 WebM/OGG/FLAC:
    → Deepgram (전용 형식)

파일 크기 > 25MB:
  → Deepgram (대용량 지원)

API 오류 발생시:
  → 자동으로 다른 Provider로 전환
```

### Auto 모드 설정 방법

1. **두 API 키 모두 입력**
   ```
   OpenAI API Key: sk-...
   Deepgram API Key: ...
   ```

2. **Provider를 "Auto"로 설정**

3. **Fallback 옵션 활성화**
   ```
   Enable Fallback: ON
   Smart Routing: ON
   ```

## 롤백 방법

만약 Deepgram이 만족스럽지 않다면:

1. **즉시 전환**
   ```
   Settings → Provider → "Whisper" 선택
   ```

2. **데이터 보존**
   - 모든 설정과 캐시는 유지됨
   - 기존 변환 결과 영향 없음

3. **API 키 유지**
   - Deepgram 키를 삭제할 필요 없음
   - 나중에 다시 시도 가능

## 비용 비교 계산기

### 월간 사용량 기준 비용

| 사용량 | Whisper | Deepgram | 절감액 |
|--------|---------|----------|--------|
| 100분 | $0.60 | $0.43 | $0.17 (28%) |
| 500분 | $3.00 | $2.15 | $0.85 (28%) |
| 1000분 | $6.00 | $4.30 | $1.70 (28%) |
| 5000분 | $30.00 | $21.50 | $8.50 (28%) |

## FAQ

### Q: 기존 Whisper 설정은 어떻게 되나요?
**A:** 모든 설정이 유지됩니다. Provider만 변경하면 됩니다.

### Q: 두 Provider를 동시에 사용할 수 있나요?
**A:** Auto 모드에서 파일별로 최적 Provider가 자동 선택됩니다.

### Q: Deepgram 무료 크레딧이 소진되면?
**A:** 자동으로 Whisper로 전환되거나 (Auto 모드), 결제 수단 추가가 필요합니다.

### Q: 변환 품질 차이가 있나요?
**A:** 대부분 동등하거나 Deepgram이 약간 우수합니다. 특히 화자 분리 기능이 뛰어납니다.

### Q: 언어 지원 차이가 있나요?
- **Whisper**: 50+ 언어
- **Deepgram**: 40+ 언어
- 주요 언어(한국어, 영어, 일본어, 중국어)는 모두 지원

## 문제 해결

### Deepgram API 키 인증 실패
1. 키 형식 확인 (40자 16진수)
2. Console에서 키 상태 확인
3. 프로젝트 권한 확인

### 변환 속도가 느림
1. Deepgram 서버 상태 확인
2. 네트워크 연결 확인
3. Tier를 'nova-2'로 설정 확인

### 특정 형식 지원 안됨
1. Provider가 올바르게 설정되었는지 확인
2. Auto 모드 사용 권장

## 지원

- **Deepgram 문서**: [developers.deepgram.com](https://developers.deepgram.com)
- **플러그인 이슈**: [GitHub Issues](https://github.com/yourusername/obsidian-speech-to-text/issues)
- **커뮤니티**: [Obsidian Forum](https://forum.obsidian.md)

---

*마지막 업데이트: 2025-08-28*
*플러그인 버전: v3.0.0*