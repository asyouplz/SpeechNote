# 프로젝트 구조 문서 (Project Structure Documentation)

## 목차
1. [개요](#개요)
2. [디렉토리 구조](#디렉토리-구조)
3. [계층별 상세 설명](#계층별-상세-설명)
4. [모듈 간 의존성](#모듈-간-의존성)
5. [파일 네이밍 컨벤션](#파일-네이밍-컨벤션)
6. [코드 구성 원칙](#코드-구성-원칙)

---

## 개요

이 프로젝트는 **클린 아키텍처(Clean Architecture)** 원칙을 따르는 계층형 구조로 설계되었습니다. 각 계층은 명확한 책임을 가지며, 의존성은 항상 안쪽 방향(도메인 중심)으로 향합니다.

### 아키텍처 특징
- **관심사의 분리**: 각 계층은 독립적인 책임을 가짐
- **의존성 역전**: 고수준 모듈이 저수준 모듈에 의존하지 않음
- **테스트 용이성**: 각 계층을 독립적으로 테스트 가능
- **확장성**: 새로운 기능을 기존 코드 수정 없이 추가 가능

---

## 디렉토리 구조

```
SpeechNote/
├── 📦 src/                              # 소스 코드 루트
│   ├── 🎯 main.ts                       # 플러그인 진입점
│   │
│   ├── 💼 application/                  # 응용 계층
│   │   ├── EventManager.ts              # 이벤트 발행/구독 관리
│   │   └── StateManager.ts              # 전역 상태 관리
│   │
│   ├── 🧠 core/                         # 핵심 비즈니스 로직 계층
│   │   └── transcription/               # 음성 변환 도메인
│   │       ├── AudioProcessor.ts        # 오디오 파일 처리 로직
│   │       ├── TextFormatter.ts         # 텍스트 포맷팅 로직
│   │       └── TranscriptionService.ts  # 변환 서비스 조정자
│   │
│   ├── 📊 domain/                       # 도메인 모델 계층
│   │   └── models/
│   │       └── Settings.ts              # 설정 도메인 모델
│   │
│   ├── 🔌 infrastructure/               # 인프라스트럭처 계층
│   │   ├── api/
│   │   │   └── WhisperService.ts        # OpenAI Whisper API 클라이언트
│   │   ├── logging/
│   │   │   └── Logger.ts                # 로깅 시스템
│   │   └── storage/
│   │       └── SettingsManager.ts       # 설정 영속성 관리
│   │
│   ├── 🛠️ utils/                        # 유틸리티 함수
│   │   └── ErrorHandler.ts              # 중앙 에러 처리
│   │
│   └── 📝 types/                        # TypeScript 타입 정의
│       └── index.ts                     # 공통 타입 및 인터페이스
│
├── 📚 docs/                             # 프로젝트 문서
│   ├── setup-guide.md                   # 개발 환경 설정 가이드
│   ├── project-structure.md             # 프로젝트 구조 문서 (현재 파일)
│   └── api-reference.md                 # API 레퍼런스
│
├── 🏗️ architecture/                     # 아키텍처 문서
│   ├── system-design.md                 # 시스템 설계 문서
│   └── diagrams/                        # 아키텍처 다이어그램
│       ├── 01-overall-architecture.mmd  # 전체 아키텍처
│       ├── 02-component-dependencies.mmd # 컴포넌트 의존성
│       ├── 03-data-flow.mmd            # 데이터 흐름
│       └── ...
│
├── 📋 guidelines/                       # 개발 가이드라인
│   └── development-guide.md             # 개발 가이드
│
├── 🧪 tests/                            # 테스트 코드 (준비 중)
│   ├── unit/                            # 단위 테스트
│   ├── integration/                     # 통합 테스트
│   └── e2e/                            # End-to-End 테스트
│
├── ⚙️ 설정 파일
│   ├── manifest.json                    # Obsidian 플러그인 메타데이터
│   ├── package.json                     # Node.js 프로젝트 설정
│   ├── tsconfig.json                    # TypeScript 컴파일러 설정
│   ├── esbuild.config.mjs               # ESBuild 번들러 설정
│   └── jest.config.js                   # Jest 테스트 프레임워크 설정
│
└── 📄 루트 파일
    ├── README.md                        # 프로젝트 소개 및 사용법
    ├── CONTRIBUTING.md                  # 기여 가이드라인
    ├── LICENSE                          # 라이선스 정보
    └── styles.css                       # 플러그인 스타일시트
```

---

## 계층별 상세 설명

### 1. Main Entry Point (`main.ts`)
**책임**: 플러그인 생명주기 관리
- Obsidian Plugin 클래스 확장
- 서비스 초기화 및 의존성 주입
- 명령어 등록
- 설정 탭 등록
- 이벤트 핸들러 설정

### 2. Application Layer (`application/`)
**책임**: 애플리케이션 흐름 제어 및 조정

#### EventManager.ts
- 이벤트 기반 통신 구현
- 발행-구독 패턴 제공
- 컴포넌트 간 느슨한 결합 유지

#### StateManager.ts
- 전역 상태 관리
- 상태 변경 구독 메커니즘
- 불변성 보장

### 3. Core Business Logic (`core/`)
**책임**: 핵심 비즈니스 규칙 구현

#### transcription/AudioProcessor.ts
- 오디오 파일 검증
- 파일 형식 변환
- 메타데이터 추출
- 크기 제한 확인

#### transcription/TextFormatter.ts
- 변환된 텍스트 포맷팅
- 타임스탬프 처리
- 템플릿 적용
- 마크다운 포맷팅

#### transcription/TranscriptionService.ts
- 변환 프로세스 조정
- 비즈니스 로직 실행
- 에러 처리 및 재시도
- 진행 상태 관리

### 4. Domain Models (`domain/`)
**책임**: 비즈니스 엔티티 정의

#### models/Settings.ts
- 설정 데이터 모델
- 기본값 정의
- 유효성 검증 규칙

### 5. Infrastructure Layer (`infrastructure/`)
**책임**: 외부 시스템과의 통합

#### api/WhisperService.ts
- OpenAI Whisper API 통신
- HTTP 요청/응답 처리
- 인증 관리
- Rate limiting

#### logging/Logger.ts
- 로그 레벨 관리
- 콘솔 출력
- 디버그 정보 기록

#### storage/SettingsManager.ts
- 설정 영속성
- Obsidian 저장소 통합
- 데이터 직렬화/역직렬화

### 6. Utilities (`utils/`)
**책임**: 공통 유틸리티 함수

#### ErrorHandler.ts
- 중앙화된 에러 처리
- 에러 분류 및 로깅
- 사용자 친화적 메시지 변환

### 7. Type Definitions (`types/`)
**책임**: TypeScript 타입 정의

#### index.ts
- 공통 인터페이스
- 타입 별칭
- 열거형 정의
- 제네릭 타입

---

## 모듈 간 의존성

### 의존성 방향
```
main.ts
   ↓
application/ ← → infrastructure/
   ↓               ↓
core/  ←────────────┘
   ↓
domain/
   ↑
types/ (모든 계층에서 참조)
```

### 의존성 규칙
1. **내부 방향 의존성**: 외부 계층은 내부 계층에 의존
2. **인터페이스 의존성**: 구현이 아닌 추상화에 의존
3. **순환 의존성 금지**: 모듈 간 순환 참조 방지
4. **도메인 독립성**: 도메인 계층은 외부 의존성 없음

### 주요 의존성 관계
```typescript
// main.ts → application/
import { EventManager } from './application/EventManager';
import { StateManager } from './application/StateManager';

// main.ts → core/
import { TranscriptionService } from './core/transcription/TranscriptionService';

// core/ → domain/
import { Settings } from '../../domain/models/Settings';

// infrastructure/ → types/
import { WhisperOptions, WhisperResponse } from '../../types';
```

---

## 파일 네이밍 컨벤션

### 일반 규칙
| 파일 유형 | 네이밍 규칙 | 예시 |
|----------|------------|------|
| **클래스/서비스** | PascalCase | `TranscriptionService.ts` |
| **유틸리티** | PascalCase | `ErrorHandler.ts` |
| **타입/인터페이스** | PascalCase | `Settings.ts` |
| **설정 파일** | kebab-case | `esbuild.config.mjs` |
| **문서** | kebab-case | `setup-guide.md` |
| **인덱스 파일** | lowercase | `index.ts` |

### 디렉토리 네이밍
- **소문자**: 모든 소스 코드 디렉토리
- **의미있는 이름**: 역할을 명확히 표현
- **단수형 사용**: `model` 대신 `models` 제외

---

## 코드 구성 원칙

### 1. 단일 책임 원칙 (SRP)
```typescript
// ✅ 좋은 예: 하나의 책임만 가짐
export class AudioProcessor {
  async validateFormat(file: TFile): Promise<boolean> { }
  async extractMetadata(buffer: ArrayBuffer): Promise<AudioMetadata> { }
}

// ❌ 나쁜 예: 여러 책임을 가짐
export class AudioHandler {
  async processAudio() { }
  async saveSettings() { }
  async sendToAPI() { }
}
```

### 2. 의존성 주입 (DI)
```typescript
// ✅ 좋은 예: 의존성 주입
export class TranscriptionService {
  constructor(
    private whisperService: WhisperService,
    private audioProcessor: AudioProcessor,
    private textFormatter: TextFormatter
  ) {}
}

// ❌ 나쁜 예: 직접 생성
export class TranscriptionService {
  private whisperService = new WhisperService();
}
```

### 3. 인터페이스 분리
```typescript
// ✅ 좋은 예: 작고 구체적인 인터페이스
interface ITranscriber {
  transcribe(audio: ArrayBuffer): Promise<string>;
}

interface ICancellable {
  cancel(): void;
}

// ❌ 나쁜 예: 거대한 인터페이스
interface IService {
  transcribe(): Promise<string>;
  cancel(): void;
  save(): void;
  load(): void;
  validate(): boolean;
}
```

### 4. 모듈 구성
```typescript
// 각 모듈의 구조
export class ModuleName {
  // 1. Static 멤버
  static readonly VERSION = '1.0.0';
  
  // 2. Private 필드
  private config: Config;
  
  // 3. Public 필드
  public status: Status;
  
  // 4. 생성자
  constructor() {}
  
  // 5. Public 메서드
  public async process(): Promise<void> {}
  
  // 6. Private 메서드
  private validate(): boolean {}
  
  // 7. Static 메서드
  static create(): ModuleName {}
}
```

### 5. 에러 처리
```typescript
// 각 계층별 에러 처리
try {
  // 비즈니스 로직
  const result = await this.process();
} catch (error) {
  // 1. 로깅
  this.logger.error('Processing failed', error);
  
  // 2. 에러 변환
  if (error instanceof NetworkError) {
    throw new ServiceError('Connection failed');
  }
  
  // 3. 상위 전파
  throw error;
}
```

---

## 테스트 구조

### 테스트 파일 위치
```
tests/
├── unit/                     # 단위 테스트
│   ├── core/
│   │   └── AudioProcessor.test.ts
│   ├── domain/
│   │   └── Settings.test.ts
│   └── utils/
│       └── ErrorHandler.test.ts
├── integration/              # 통합 테스트
│   └── TranscriptionFlow.test.ts
└── e2e/                     # End-to-End 테스트
    └── PluginLifecycle.test.ts
```

### 테스트 네이밍 컨벤션
- 테스트 파일: `{ComponentName}.test.ts`
- 테스트 설명: `should {expected behavior} when {condition}`

---

## 빌드 아티팩트

### 생성되는 파일
| 파일 | 설명 | 위치 |
|-----|------|------|
| `main.js` | 번들된 JavaScript | 루트 디렉토리 |
| `main.js.map` | 소스맵 (개발용) | 루트 디렉토리 |
| `styles.css` | 스타일시트 | 루트 디렉토리 |

### 무시되는 파일 (.gitignore)
```
node_modules/
main.js
main.js.map
.DS_Store
*.log
.env
```

---

## 모범 사례

### 1. 새 기능 추가 시
1. 적절한 계층 결정
2. 인터페이스 먼저 정의
3. 테스트 작성
4. 구현
5. 문서 업데이트

### 2. 파일 크기 관리
- 단일 파일: 최대 300줄
- 단일 함수: 최대 50줄
- 단일 클래스: 하나의 책임

### 3. 임포트 순서
```typescript
// 1. 외부 라이브러리
import { Plugin } from 'obsidian';

// 2. 내부 모듈 (절대 경로)
import { TranscriptionService } from 'src/core/TranscriptionService';

// 3. 상대 경로 임포트
import { Settings } from './Settings';

// 4. 타입 임포트
import type { TranscriptionOptions } from '../types';
```

---

## 개발 워크플로우

### 1. 기능 개발 프로세스
```bash
feature/
├── 1. 요구사항 분석
├── 2. 아키텍처 설계
├── 3. 인터페이스 정의
├── 4. 테스트 작성 (TDD)
├── 5. 구현
├── 6. 리팩토링
└── 7. 문서화
```

### 2. 코드 리뷰 체크리스트
- [ ] 아키텍처 원칙 준수
- [ ] 테스트 커버리지 80% 이상
- [ ] 문서 업데이트
- [ ] 타입 안정성
- [ ] 에러 처리
- [ ] 성능 고려사항

---

## 문서 업데이트

이 문서는 프로젝트 구조가 변경될 때마다 업데이트되어야 합니다:

1. 새 모듈 추가 시
2. 디렉토리 구조 변경 시
3. 의존성 관계 변경 시
4. 네이밍 컨벤션 변경 시

---

*최종 업데이트: 2025-08-22*
*버전: 1.0.0*