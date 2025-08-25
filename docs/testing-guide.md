# 테스트 실행 가이드

## 목차
1. [개요](#개요)
2. [테스트 환경 설정](#테스트-환경-설정)
3. [테스트 종류](#테스트-종류)
4. [테스트 실행 명령어](#테스트-실행-명령어)
5. [E2E 테스트](#e2e-테스트)
6. [CI/CD 파이프라인](#cicd-파이프라인)
7. [테스트 커버리지](#테스트-커버리지)
8. [문제 해결](#문제-해결)

## 개요

이 프로젝트는 포괄적인 테스트 전략을 통해 코드 품질과 안정성을 보장합니다. Jest를 기반으로 단위 테스트, 통합 테스트, E2E 테스트를 구현하였으며, GitHub Actions를 통한 자동화된 CI/CD 파이프라인을 제공합니다.

### 테스트 철학
- **빠른 피드백**: 단위 테스트는 빠르게 실행되어 즉각적인 피드백 제공
- **포괄적 커버리지**: 모든 중요한 기능에 대한 테스트 커버리지 80% 이상 유지
- **실제 시나리오**: E2E 테스트를 통해 실제 사용자 워크플로우 검증
- **자동화**: 모든 테스트는 CI/CD 파이프라인에서 자동 실행

## 테스트 환경 설정

### 필수 요구사항
- Node.js 16.0.0 이상
- npm 7.0.0 이상

### 초기 설정

```bash
# 의존성 설치
npm install

# 테스트 관련 추가 패키지 설치 (이미 package.json에 포함됨)
npm install --save-dev jest ts-jest @types/jest
npm install --save-dev jest-environment-jsdom
npm install --save-dev jest-html-reporters jest-junit
```

### 환경 변수 설정

테스트 실행을 위한 환경 변수를 `.env.test` 파일에 설정:

```env
# .env.test
NODE_ENV=test
TEST_API_KEY=your-test-api-key
TEST_API_URL=http://localhost:3001/api
DEBUG=false
START_MOCK_SERVER=true
CLEANUP_TEMP_FILES=true
MEASURE_PERFORMANCE=true
```

## 테스트 종류

### 1. 단위 테스트 (Unit Tests)
개별 함수와 클래스의 동작을 검증합니다.

**위치**: `tests/unit/`

**특징**:
- 빠른 실행 속도
- 외부 의존성 모킹
- 격리된 환경에서 실행

### 2. 통합 테스트 (Integration Tests)
여러 컴포넌트 간의 상호작용을 검증합니다.

**위치**: `tests/integration/`

**특징**:
- API 통합 테스트
- 서비스 간 상호작용 검증
- 실제 데이터베이스/API 사용 가능

### 3. E2E 테스트 (End-to-End Tests)
전체 사용자 워크플로우를 검증합니다.

**위치**: `tests/e2e/`

**특징**:
- 실제 사용자 시나리오 시뮬레이션
- DOM 조작 및 이벤트 처리
- 전체 애플리케이션 플로우 검증

## 테스트 실행 명령어

### 기본 명령어

```bash
# 모든 테스트 실행
npm test

# 특정 테스트 스위트 실행
npm run test:unit        # 단위 테스트만
npm run test:integration # 통합 테스트만
npm run test:e2e         # E2E 테스트만

# 모든 테스트 순차 실행
npm run test:all

# Watch 모드 (파일 변경 감지)
npm run test:watch       # 일반 테스트
npm run test:e2e:watch   # E2E 테스트

# 변경된 파일만 테스트
npm run test:changed

# 디버그 모드
npm run test:debug
```

### 커버리지 명령어

```bash
# 커버리지와 함께 테스트 실행
npm run test:coverage

# 커버리지 리포트 보기
npm run coverage:report

# 커버리지 정리
npm run coverage:clean
```

### CI 환경 명령어

```bash
# CI 환경에서 실행 (최적화된 설정)
npm run test:ci

# 전체 검증 (린트 + 타입체크 + 테스트)
npm run validate

# CI 파이프라인 전체 실행
npm run ci
```

## E2E 테스트

### E2E 테스트 시나리오

#### 1. 파일 변환 플로우 (`file-conversion-flow.e2e.test.ts`)
- 파일 선택 모달 열기
- 오디오 파일 선택 및 유효성 검사
- 변환 프로세스 실행
- 진행 상황 추적
- 에디터에 텍스트 삽입
- 성공/실패 알림 확인

#### 2. 설정 플로우 (`settings-flow.e2e.test.ts`)
- 설정 탭 UI 렌더링
- API 키 입력 및 검증
- 각 설정 항목 변경
- 설정 저장 및 복원
- 설정 마이그레이션

#### 3. 에러 처리 (`error-handling.e2e.test.ts`)
- 네트워크 에러 처리
- API 에러 응답 처리
- 파일 처리 에러
- 재시도 메커니즘
- 사용자 친화적 에러 메시지

### E2E 테스트 실행

```bash
# E2E 테스트 실행
npm run test:e2e

# 특정 E2E 테스트 파일 실행
npx jest tests/e2e/file-conversion-flow.e2e.test.ts

# E2E 테스트 디버깅
npm run test:e2e -- --detectOpenHandles --forceExit

# 브라우저 헤드리스 모드 비활성화 (시각적 디버깅)
HEADLESS=false npm run test:e2e
```

## CI/CD 파이프라인

### GitHub Actions 워크플로우

#### 1. CI 파이프라인 (`ci.yml`)
**트리거**: Push to main/develop, Pull Request

**작업**:
1. **품질 검사**: ESLint, Prettier, TypeScript 체크
2. **단위 테스트**: 여러 Node.js 버전에서 실행
3. **통합 테스트**: API 통합 검증
4. **E2E 테스트**: 전체 플로우 검증
5. **빌드 테스트**: 여러 OS에서 빌드
6. **보안 검사**: npm audit, Snyk 스캔
7. **성능 테스트**: 번들 크기 체크
8. **커버리지 리포트**: Codecov 업로드

#### 2. 릴리스 파이프라인 (`release.yml`)
**트리거**: 버전 태그 푸시, 수동 실행

**작업**:
1. 릴리스 준비 및 버전 검증
2. 프로덕션 빌드 및 테스트
3. 릴리스 노트 자동 생성
4. GitHub Release 생성
5. Obsidian 커뮤니티 플러그인 업데이트
6. 문서 버전 업데이트
7. 알림 발송

### CI/CD 설정

```yaml
# .github/workflows/ci.yml 주요 설정
env:
  NODE_VERSION: '18'
  CACHE_KEY: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}

# 병렬 실행 전략
strategy:
  matrix:
    node-version: [16, 18, 20]
    os: [ubuntu-latest, windows-latest, macos-latest]
```

### 로컬에서 CI 환경 시뮬레이션

```bash
# CI 환경과 동일한 설정으로 테스트
CI=true npm run test:ci

# GitHub Actions 로컬 실행 (act 도구 사용)
brew install act  # macOS
act -j quality-check  # 특정 job 실행
```

## 테스트 커버리지

### 커버리지 목표
- **전체**: 80% 이상
- **라인**: 80% 이상
- **함수**: 75% 이상
- **브랜치**: 70% 이상

### 커버리지 확인

```bash
# 커버리지 실행 및 리포트 생성
npm run test:coverage

# HTML 리포트 열기
open coverage/lcov-report/index.html  # macOS
start coverage/lcov-report/index.html # Windows

# 커버리지 임계값 체크
npx jest --coverage --coverageThreshold='{"global":{"lines":80,"functions":75,"branches":70}}'
```

### 커버리지 제외 패턴

```javascript
// jest.config.js
collectCoverageFrom: [
  'src/**/*.{ts,tsx}',
  '!src/**/*.d.ts',      // 타입 정의 파일 제외
  '!src/types/**',       // types 디렉토리 제외
  '!src/main.ts',        // 엔트리 포인트 제외
  '!src/**/*.test.ts',   // 테스트 파일 제외
]
```

## 문제 해결

### 일반적인 문제

#### 1. 테스트가 타임아웃으로 실패
```bash
# 타임아웃 증가
npm test -- --testTimeout=30000

# 또는 특정 테스트에서
test('long running test', async () => {
  // ...
}, 30000);
```

#### 2. 메모리 부족 에러
```bash
# 메모리 제한 증가
NODE_OPTIONS="--max-old-space-size=4096" npm test

# 또는 워커 수 제한
npm test -- --maxWorkers=2
```

#### 3. 캐시 관련 문제
```bash
# 캐시 정리
npm run clean:all
rm -rf .jest-cache
npm install
npm test
```

#### 4. Mock 관련 문제
```javascript
// 각 테스트 후 mock 초기화
afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

// 특정 모듈 mock 초기화
jest.resetModules();
```

### 디버깅 팁

#### 1. 콘솔 로그 활성화
```bash
DEBUG=true npm test
```

#### 2. 특정 테스트만 실행
```javascript
// test.only 사용
test.only('specific test', () => {
  // ...
});

// 또는 describe.only
describe.only('specific suite', () => {
  // ...
});
```

#### 3. 스냅샷 업데이트
```bash
npm run test:update-snapshots
```

#### 4. 테스트 순서 문제
```bash
# 랜덤 순서로 실행하여 의존성 확인
npm test -- --randomize
```

### 성능 최적화

#### 1. 병렬 실행 최적화
```javascript
// jest.config.optimized.js
maxWorkers: '50%',  // CPU 코어의 50% 사용
```

#### 2. 캐싱 활용
```javascript
cache: true,
cacheDirectory: '<rootDir>/.jest-cache',
```

#### 3. 선택적 테스트 실행
```bash
# 변경된 파일과 관련된 테스트만
npm run test:changed

# 특정 패턴 매칭
npm test -- --testPathPattern="WhisperService"
```

## 모범 사례

### 1. 테스트 구조
```typescript
describe('ComponentName', () => {
  describe('methodName', () => {
    it('should do something when condition', () => {
      // Arrange
      const input = 'test';
      
      // Act
      const result = component.method(input);
      
      // Assert
      expect(result).toBe('expected');
    });
  });
});
```

### 2. 비동기 테스트
```typescript
// async/await 사용
test('async operation', async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
});

// Promise 반환
test('promise operation', () => {
  return expect(promiseFunction()).resolves.toBe('value');
});
```

### 3. 에러 테스트
```typescript
test('should throw error', () => {
  expect(() => {
    functionThatThrows();
  }).toThrow('Error message');
});

// 비동기 에러
test('async error', async () => {
  await expect(asyncFunction()).rejects.toThrow('Error');
});
```

### 4. Mock 사용
```typescript
// 함수 mock
const mockFn = jest.fn();
mockFn.mockReturnValue('mocked value');

// 모듈 mock
jest.mock('module-name');

// 부분 mock
jest.mock('module', () => ({
  ...jest.requireActual('module'),
  specificFunction: jest.fn()
}));
```

## 추가 리소스

- [Jest 공식 문서](https://jestjs.io/docs/getting-started)
- [Testing Library 문서](https://testing-library.com/docs/)
- [GitHub Actions 문서](https://docs.github.com/en/actions)
- [Codecov 문서](https://docs.codecov.io/)

## 지원

테스트 관련 문제나 질문이 있으시면:
1. [Issue 생성](https://github.com/your-repo/issues)
2. [Discussions 참여](https://github.com/your-repo/discussions)
3. 프로젝트 메인테이너에게 연락