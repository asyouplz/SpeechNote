# Phase 4: 테스트 전략 문서

## 개요

이 문서는 SpeechNote 플러그인의 Phase 4 테스트 및 최적화를 위한 전략을 정의합니다.

## 테스트 철학

### 핵심 원칙
1. **예방적 품질 보증**: 버그가 프로덕션에 도달하기 전에 발견
2. **지속적 개선**: 테스트를 통한 코드 품질 향상
3. **자동화 우선**: 반복적인 테스트 작업의 자동화
4. **측정 가능한 품질**: 구체적인 메트릭을 통한 품질 추적

## 테스트 피라미드 전략

```
         E2E 테스트
        (10%)
       /    \
      /      \
    통합 테스트
     (30%)
    /        \
   /          \
 단위 테스트
   (60%)
```

### 1. 단위 테스트 (Unit Tests) - 60%

#### 목적
- 개별 함수와 클래스의 격리된 동작 검증
- 빠른 피드백 루프 제공
- 리팩토링 안정성 보장

#### 대상 컴포넌트
```typescript
// 핵심 비즈니스 로직
- AudioProcessor
- TextFormatter
- TranscriptionService
- Settings validators
- Error handlers

// 유틸리티 함수
- formatters.ts
- validators.ts
- helpers.ts
```

#### 테스트 패턴
```typescript
describe('ComponentName', () => {
    describe('메서드명', () => {
        it('정상 케이스 설명', () => {
            // Given - 준비
            // When - 실행
            // Then - 검증
        });
        
        it('엣지 케이스 설명', () => {
            // 경계값 테스트
        });
        
        it('에러 케이스 설명', () => {
            // 예외 처리 테스트
        });
    });
});
```

### 2. 통합 테스트 (Integration Tests) - 30%

#### 목적
- 컴포넌트 간 상호작용 검증
- API 통신 검증
- 데이터 플로우 확인

#### 주요 테스트 시나리오
```typescript
// API 통합
- WhisperService + FileUploadManager
- SettingsAPI + SettingsValidator
- NotificationSystem + EventManager

// UI 통합
- FilePickerModal + FileBrowser
- SettingsTab + Settings persistence
- ProgressTracker + UI updates

// 데이터 플로우
- Audio upload → Transcription → Text insertion
- Settings change → UI update → Storage
```

### 3. E2E 테스트 (End-to-End Tests) - 10%

#### 목적
- 실제 사용자 시나리오 검증
- 전체 워크플로우 테스트
- 크리티컬 패스 보장

#### 핵심 시나리오
1. **기본 음성 인식 플로우**
   - 파일 선택 → 업로드 → 전사 → 텍스트 삽입

2. **설정 관리 플로우**
   - 설정 변경 → 저장 → 재시작 → 설정 유지

3. **에러 복구 플로우**
   - API 실패 → 재시도 → 복구 → 알림

## 테스트 도구 및 프레임워크

### 현재 스택
```json
{
  "unit": "Jest + ts-jest",
  "integration": "Jest + MSW (Mock Service Worker)",
  "e2e": "Playwright (추천)",
  "coverage": "Jest coverage + nyc",
  "mutation": "Stryker (선택적)"
}
```

### 추가 도구 권장사항

#### Mock Service Worker (MSW)
```bash
npm install --save-dev msw
```
- API 모킹을 위한 표준 도구
- 네트워크 레벨 인터셉션
- 실제 API와 동일한 동작

#### Playwright
```bash
npm install --save-dev @playwright/test
```
- 크로스 브라우저 E2E 테스트
- Obsidian 플러그인 환경 시뮬레이션
- 시각적 회귀 테스트

## 테스트 커버리지 목표

### 전체 목표
- **최소 커버리지**: 70%
- **권장 커버리지**: 85%
- **크리티컬 컴포넌트**: 95%

### 컴포넌트별 우선순위

#### Priority 1 (95% 커버리지)
```typescript
// 핵심 비즈니스 로직
src/core/transcription/*
src/infrastructure/api/WhisperService.ts
src/domain/models/Settings.ts
src/utils/ErrorHandler.ts
```

#### Priority 2 (85% 커버리지)
```typescript
// 중요 서비스 레이어
src/application/*
src/infrastructure/storage/*
src/ui/notifications/*
src/ui/progress/*
```

#### Priority 3 (70% 커버리지)
```typescript
// UI 컴포넌트
src/ui/components/*
src/ui/modals/*
src/ui/settings/*
```

#### 테스트 제외 대상
```typescript
// 제외 패턴
src/types/*         // 타입 정의
src/patterns/*      // 디자인 패턴 (이미 검증된 패턴)
*.css               // 스타일시트
src/main.ts         // 엔트리 포인트
```

## 테스트 데이터 관리

### Fixture 구조
```
tests/
├── fixtures/
│   ├── audio/
│   │   ├── valid-audio.mp3
│   │   ├── invalid-audio.txt
│   │   └── large-audio.wav
│   ├── api-responses/
│   │   ├── success.json
│   │   ├── error-401.json
│   │   └── timeout.json
│   └── settings/
│       ├── default.json
│       ├── custom.json
│       └── invalid.json
```

### Mock 데이터 팩토리
```typescript
// tests/factories/settingsFactory.ts
export const createMockSettings = (overrides = {}) => ({
    apiKey: 'test-api-key',
    language: 'ko',
    model: 'whisper-1',
    ...overrides
});

// tests/factories/audioFactory.ts
export const createMockAudioFile = (size = 1024) => {
    return new File([''], 'test.mp3', { 
        type: 'audio/mp3',
        size 
    });
};
```

## 성능 테스트 전략

### 메트릭 정의
```typescript
interface PerformanceMetrics {
    // 응답 시간
    apiResponseTime: number;      // < 2s
    fileUploadTime: number;        // < 5s per 10MB
    uiRenderTime: number;          // < 100ms
    
    // 메모리 사용량
    memoryBaseline: number;        // < 50MB
    memoryPeak: number;            // < 200MB
    memoryLeaks: boolean;          // false
    
    // 처리량
    concurrentRequests: number;    // >= 3
    fileProcessingRate: number;    // >= 2MB/s
}
```

### 성능 테스트 시나리오
1. **대용량 파일 처리**
   - 100MB 오디오 파일 업로드
   - 메모리 사용량 모니터링
   - 처리 시간 측정

2. **동시성 테스트**
   - 다중 파일 동시 업로드
   - API 요청 큐잉
   - 리소스 경합 확인

3. **장시간 실행 테스트**
   - 8시간 연속 실행
   - 메모리 누수 감지
   - 성능 저하 모니터링

## 보안 테스트

### 검증 항목
1. **API 키 보안**
   - 암호화 저장 확인
   - 전송 시 HTTPS 사용
   - 로그에 노출 방지

2. **입력 검증**
   - XSS 방지
   - 파일 업로드 제한
   - SQL 인젝션 방지 (해당 시)

3. **권한 관리**
   - 파일 시스템 접근 제한
   - API 권한 최소화
   - 사용자 데이터 격리

## 접근성 테스트

### WCAG 2.1 레벨 AA 준수
```typescript
// 테스트 항목
- 키보드 네비게이션
- 스크린 리더 호환성
- 색상 대비 (4.5:1)
- 포커스 표시
- 에러 메시지 명확성
```

## 회귀 테스트 전략

### 자동화된 회귀 테스트
```yaml
# 실행 시점
- PR 생성 시
- main 브랜치 병합 전
- 릴리즈 전
- 야간 빌드

# 테스트 범위
- 전체 단위 테스트
- 크리티컬 통합 테스트
- 스모크 E2E 테스트
```

### 시각적 회귀 테스트
```typescript
// Percy 또는 Chromatic 사용
- 설정 화면 스냅샷
- 모달 다이얼로그 스냅샷
- 진행 상태 표시 스냅샷
- 에러 상태 스냅샷
```

## 테스트 환경 관리

### 로컬 개발 환경
```bash
# 테스트 실행
npm test              # 전체 테스트
npm test:watch       # 감시 모드
npm test:coverage    # 커버리지 포함
npm test:unit        # 단위 테스트만
npm test:integration # 통합 테스트만
```

### CI 환경
```yaml
# GitHub Actions 설정
- Node.js 16, 18, 20
- OS: Ubuntu, Windows, macOS
- Obsidian 버전: latest, beta
```

## 테스트 보고 및 모니터링

### 대시보드 메트릭
```typescript
interface TestDashboard {
    coverage: {
        lines: number;
        branches: number;
        functions: number;
        statements: number;
    };
    testResults: {
        passed: number;
        failed: number;
        skipped: number;
        duration: number;
    };
    trends: {
        coverageTrend: 'up' | 'down' | 'stable';
        failureRate: number;
        flakyTests: string[];
    };
}
```

### 알림 설정
- 테스트 실패 시 즉시 알림
- 커버리지 하락 시 경고
- 성능 저하 감지 시 알림

## 테스트 문화 구축

### 모범 사례
1. **TDD/BDD 접근법 권장**
2. **코드 리뷰 시 테스트 필수 확인**
3. **테스트 작성 가이드라인 제공**
4. **테스트 코드도 프로덕션 코드처럼 관리**

### 교육 및 문서화
- 테스트 작성 워크샵
- 베스트 프랙티스 문서
- 테스트 패턴 카탈로그
- 트러블슈팅 가이드

## 다음 단계

1. **즉시 실행 (Week 1)**
   - Jest 설정 최적화
   - 누락된 단위 테스트 작성
   - CI 파이프라인 구성

2. **단기 목표 (Week 2-3)**
   - MSW 도입 및 API 모킹
   - 통합 테스트 확장
   - 커버리지 80% 달성

3. **중기 목표 (Week 4-6)**
   - E2E 테스트 도입
   - 성능 테스트 자동화
   - 시각적 회귀 테스트 구현

4. **장기 목표 (Month 2-3)**
   - 뮤테이션 테스트 도입
   - 테스트 대시보드 구축
   - 지속적인 개선 프로세스 확립