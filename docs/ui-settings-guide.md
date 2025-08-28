# Multi-Provider 설정 UI 가이드

**버전 3.1.0** | **최종 업데이트: 2025-08-28**

## 목차

1. [개요](#개요)
2. [Provider 선택](#provider-선택)
3. [API 키 관리](#api-키-관리)
4. [고급 설정](#고급-설정)
5. [A/B 테스팅](#ab-테스팅)
6. [메트릭 모니터링](#메트릭-모니터링)
7. [문제 해결](#문제-해결)

---

## 개요

Multi-Provider 설정 UI는 다양한 음성 인식 서비스를 쉽게 관리하고 최적화할 수 있도록 설계된 통합 설정 인터페이스입니다. Progressive Disclosure 원칙을 적용하여 초보자는 간단하게, 고급 사용자는 세밀하게 설정할 수 있습니다.

### 주요 특징

- **직관적인 탭 네비게이션**: 기능별로 구분된 명확한 UI
- **실시간 검증**: API 키 유효성 즉시 확인
- **스마트 기본값**: 사용 패턴 기반 자동 최적화
- **시각적 피드백**: 상태 인디케이터와 진행률 표시

---

## Provider 선택

### Provider 옵션

설정 화면 상단의 Provider 선택 드롭다운에서 다음 옵션을 선택할 수 있습니다:

#### 🤖 Auto (자동 선택) - 권장
- **작동 방식**: 파일 크기, 형식, 네트워크 상태를 분석하여 최적의 Provider 자동 선택
- **선택 기준**:
  - 25MB 이하 파일: OpenAI Whisper 우선
  - 25MB 초과 파일: Deepgram 자동 선택
  - WebM/OGG/FLAC: Deepgram 전용
- **장점**: 사용자 개입 없이 최상의 성능 보장

#### 🎯 OpenAI Whisper
- **특징**: 높은 정확도, 안정적인 품질
- **제한사항**: 최대 25MB, MP3/M4A/WAV/MP4 형식
- **추천 대상**: 짧은 녹음, 높은 정확도가 필요한 경우

#### 🚀 Deepgram Nova 2
- **특징**: 빠른 속도, 대용량 지원
- **제한사항**: 최대 2GB, 모든 오디오 형식 지원
- **추천 대상**: 긴 녹음, 실시간 처리가 필요한 경우

### Provider 변경 방법

1. 설정 → Speech to Text 열기
2. "Transcription Provider" 드롭다운 클릭
3. 원하는 Provider 선택
4. 해당 Provider의 API 키 입력
5. 설정 자동 저장

---

## API 키 관리

### API 키 설정

#### 신규 API 키 추가

1. **Provider별 API 키 입력란 찾기**
   - OpenAI API Key: Whisper 사용 시
   - Deepgram API Key: Deepgram 사용 시

2. **API 키 입력**
   ```
   OpenAI: sk-proj-xxxxxxxxxxxxxxxxxxxxx
   Deepgram: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

3. **자동 검증**
   - ✅ 초록색 체크: 유효한 API 키
   - ❌ 빨간색 X: 잘못된 API 키
   - ⏳ 로딩 표시: 검증 진행 중

#### API 키 보안

- **암호화 저장**: 모든 API 키는 AES-256으로 암호화
- **로컬 저장**: 키는 사용자 기기에만 저장
- **자동 마스킹**: UI에서 키 중간 부분 자동 숨김
- **복사 보호**: 클립보드 복사 시 경고 표시

### API 키 관리 기능

#### 키 표시/숨기기
- 눈 아이콘 클릭으로 전체 키 확인
- 기본값: 마스킹된 상태 (sk-...xxxx)

#### 키 검증
- "Validate" 버튼으로 수동 검증
- 자동 검증: 키 입력 3초 후 자동 실행
- 검증 결과: 
  - ✅ Valid: 정상 작동
  - ⚠️ Invalid: 키 확인 필요
  - 🔄 Rate Limited: 일시적 제한

#### 키 삭제
- 휴지통 아이콘 클릭
- 확인 다이얼로그 표시
- 삭제 후 30초간 실행 취소 가능

---

## 고급 설정

### Advanced Settings 패널

고급 설정은 "Show Advanced Settings" 토글로 접근할 수 있습니다.

#### 네트워크 설정

##### Timeout 설정
- **기본값**: 30초
- **범위**: 10-120초
- **용도**: 느린 네트워크 환경 대응

```yaml
Request Timeout: [30] seconds
□ Auto-adjust based on network speed
```

##### Retry 정책
- **최대 재시도**: 3회 (1-5회 조절 가능)
- **재시도 간격**: 지수 백오프 (1s, 2s, 4s)
- **Smart Retry**: 오류 유형별 다른 전략

```yaml
Max Retries: [3]
Retry Strategy: [Exponential Backoff ▼]
□ Enable Smart Retry
```

#### 성능 최적화

##### 청크 크기
- **기본값**: 5MB
- **범위**: 1-10MB
- **영향**: 메모리 사용량과 처리 속도

```yaml
Chunk Size: [5] MB
□ Auto-optimize based on file size
```

##### 동시 처리
- **기본값**: 3개 파일
- **범위**: 1-10개
- **주의**: 높을수록 메모리 사용량 증가

```yaml
Concurrent Processing: [3] files
⚠️ Higher values may impact system performance
```

#### 캐시 설정

##### 캐시 관리
```yaml
□ Enable Response Cache
Cache Duration: [7] days
Cache Size Limit: [100] MB

[Clear Cache] [View Cache Stats]
```

##### 캐시 통계
- 총 캐시 크기: 45.2 MB / 100 MB
- 캐시된 항목: 127개
- 히트율: 68%
- 절약된 API 호출: 89회

---

## A/B 테스팅

### A/B 테스팅 설정

실험적 기능으로 Provider 성능을 비교할 수 있습니다.

#### 테스트 활성화
```yaml
□ Enable A/B Testing
Test Ratio: [50/50 ▼]
Sample Size: [100] transcriptions
```

#### 테스트 모드

##### 1. Random Split (무작위 분할)
- 각 요청을 무작위로 Provider에 할당
- 가장 공정한 비교 방법

##### 2. Time-based (시간 기반)
- 특정 시간대별로 Provider 전환
- 시간대별 성능 차이 분석

##### 3. File-based (파일 기반)
- 파일 특성에 따라 Provider 선택
- 최적 매칭 패턴 발견

### 테스트 결과 분석

#### 실시간 대시보드
```
Provider A (Whisper)     Provider B (Deepgram)
━━━━━━━━━━━━━━━━━━━━    ━━━━━━━━━━━━━━━━━━━━
Success Rate: 98.5%      Success Rate: 99.2%
Avg Speed: 4.2s          Avg Speed: 2.8s
Accuracy: 96%            Accuracy: 94%
Cost/1000: $0.60         Cost/1000: $0.45
```

#### 통계적 유의성
- 신뢰 구간: 95%
- p-value < 0.05일 때 유의미한 차이
- 최소 샘플 크기: 30개

---

## 메트릭 모니터링

### 실시간 메트릭

#### Provider 상태
```
OpenAI Whisper          Deepgram Nova 2
● Operational           ● Operational
Latency: 142ms         Latency: 89ms
Uptime: 99.9%          Uptime: 99.7%
```

#### 사용량 통계

##### 일일 사용량
```
Today's Usage:
├─ Transcriptions: 24
├─ Total Duration: 2h 15m
├─ Data Processed: 142 MB
└─ API Cost: ~$1.20
```

##### 월간 트렌드
```
   Usage Trend (Last 30 days)
   ▁▂▄█▆▃▂▄▆█▇▅▃▂▄▆▇█▆▄▃▂▄▆█▇▅▄
   Peak: Aug 15 (47 transcriptions)
   Average: 18 transcriptions/day
```

### 성능 지표

#### 응답 시간 분포
```
Response Time Distribution:
0-2s:   ████████████ 45%
2-5s:   ████████ 30%
5-10s:  ████ 15%
10s+:   ██ 10%
```

#### 오류율 추적
```
Error Rate (Last 7 days):
Mon: 0.5%  | ████
Tue: 0.8%  | ██████
Wed: 0.2%  | ██
Thu: 1.2%  | █████████
Fri: 0.3%  | ██
Sat: 0.0%  | 
Sun: 0.4%  | ███
```

---

## 문제 해결

### 일반적인 문제와 해결 방법

#### 🔑 API 키 관련 문제

##### "Invalid API Key" 오류
**증상**: API 키가 거부됨

**해결 방법**:
1. API 키 형식 확인
   - OpenAI: `sk-` 또는 `sk-proj-`로 시작
   - Deepgram: 40자 16진수
2. 키 앞뒤 공백 제거
3. Provider 콘솔에서 키 상태 확인
4. 결제 정보 및 크레딧 확인

##### "Rate Limited" 오류
**증상**: 너무 많은 요청으로 차단

**해결 방법**:
1. Rate Limiting 설정 활성화
2. 요청 간격 증가 (Settings → Advanced → Request Delay)
3. 다른 API 키 사용
4. Provider 업그레이드 고려

#### ⚡ 성능 문제

##### 느린 변환 속도
**증상**: 변환이 예상보다 오래 걸림

**해결 방법**:
1. Provider 변경 (Auto 모드 권장)
2. 청크 크기 조절 (Advanced Settings)
3. 네트워크 연결 확인
4. 캐시 활성화

##### 메모리 부족
**증상**: 대용량 파일 처리 시 앱 충돌

**해결 방법**:
1. 청크 크기 감소 (5MB → 2MB)
2. 동시 처리 수 감소
3. 파일을 작은 부분으로 분할
4. Deepgram Provider 사용 (스트리밍 지원)

#### 🌐 네트워크 문제

##### Connection Timeout
**증상**: 요청이 시간 초과됨

**해결 방법**:
1. Timeout 값 증가 (30s → 60s)
2. VPN/프록시 설정 확인
3. 방화벽 규칙 확인
4. DNS 설정 변경 (8.8.8.8)

### 진단 도구

#### 연결 테스트
```
[Test Connection]
→ Testing OpenAI API... ✅ OK (142ms)
→ Testing Deepgram API... ✅ OK (89ms)
→ Network latency: Good
```

#### 로그 수집
```
[Export Diagnostic Logs]
→ Collecting system info...
→ Gathering error logs...
→ Creating diagnostic bundle...
→ diagnostic_2025-08-28.zip ready
```

#### 설정 리셋
```
[Reset to Defaults]
⚠️ This will reset all settings to default values
[Confirm] [Cancel]
```

---

## 설정 백업 및 복원

### 설정 내보내기
1. Settings → Speech to Text → Advanced
2. "Export Settings" 클릭
3. JSON 파일로 저장

### 설정 가져오기
1. "Import Settings" 클릭
2. 백업 파일 선택
3. 충돌 해결 옵션 선택:
   - Replace: 기존 설정 덮어쓰기
   - Merge: 새 설정만 추가
   - Skip: 충돌 항목 건너뛰기

### 자동 백업
- 매주 자동 백업 생성
- 최대 4개 백업 파일 유지
- `.obsidian/plugins/speech-to-text/backups/` 폴더에 저장

---

## 키보드 단축키

| 기능 | Windows/Linux | macOS |
|------|---------------|-------|
| 설정 열기 | `Ctrl + ,` | `Cmd + ,` |
| Provider 전환 | `Ctrl + Shift + P` | `Cmd + Shift + P` |
| API 키 검증 | `Ctrl + Enter` | `Cmd + Enter` |
| 고급 설정 토글 | `Ctrl + Shift + A` | `Cmd + Shift + A` |
| 설정 저장 | `Ctrl + S` | `Cmd + S` |

---

## 추가 리소스

- [API Provider 비교 가이드](./provider-comparison.md)
- [성능 최적화 팁](./performance-tips.md)
- [보안 모범 사례](./security-best-practices.md)
- [비디오 튜토리얼](./video-tutorials.md)
- [FAQ](./faq.md)

---

**도움이 필요하신가요?**

- 📧 이메일: support@example.com
- 💬 Discord: [커뮤니티 참여](https://discord.gg/example)
- 🐛 버그 제보: [GitHub Issues](https://github.com/yourusername/obsidian-speech-to-text/issues)