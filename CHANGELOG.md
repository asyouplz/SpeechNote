# Changelog

이 프로젝트의 모든 주요 변경사항은 이 파일에 문서화됩니다.

형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.0.0/)를 기반으로 하며,
이 프로젝트는 [Semantic Versioning](https://semver.org/spec/v2.0.0.html)을 따릅니다.

## [Unreleased]

## [3.0.3] - 2025-08-30

### 수정됨 (Fixed)

#### 컨텍스트 메뉴 통합
- **문제**: 음성 파일 우클릭 시 "Transcribe audio file" 메뉴가 표시되지 않음
  - 컨텍스트 메뉴 이벤트 핸들러 누락
  - 파일 확장자 검증 로직 미구현
  
- **해결**: 파일 메뉴에 음성 변환 옵션 추가
  - `file-menu` 이벤트 리스너 구현
  - 지원 가능한 오디오 파일 형식 검증 (.m4a, .mp3, .wav, .mp4, .webm, .ogg, .flac)
  - 메뉴 아이템 클릭 시 변환 서비스 직접 호출

#### 명령 팔레트 ID 수정
- **문제**: 명령어 실행 시 "undefined" 텍스트가 표시됨
  - 명령어 ID에 네임스페이스 접두사 누락
  - Obsidian API 명명 규칙 미준수
  
- **해결**: 모든 명령어 ID에 "speech-to-text:" 접두사 추가
  - `transcribe-audio` → `speech-to-text:transcribe-audio`
  - `cancel-transcription` → `speech-to-text:cancel-transcription`
  - 일관된 명령어 식별 체계 구축

#### StatusBar 안전성 강화
- **문제**: StatusBar 초기화 시 타입 오류 발생 가능성
  - `addStatusBarItem()` 호출 시 불필요한 매개변수 전달
  - 텍스트 업데이트 시 null 체크 미흡
  
- **해결**: StatusBar 관리 로직 개선
  - `addStatusBarItem()` 매개변수 제거 (Obsidian API 스펙 준수)
  - 안전한 텍스트 업데이트 패턴 적용
  - StatusBar 요소 존재 여부 확인 로직 추가

#### SettingsTab 디버깅 개선
- **문제**: 설정 탭 렌더링 문제 디버깅 어려움
  - DOM 렌더링 상태 확인 불가
  - 컨테이너 요소 생성 시점 불명확
  
- **해결**: 상세 디버깅 로그 추가
  - `display()` 메서드 실행 추적
  - DOM 요소 상태 로깅
  - 컨테이너 엘리먼트 생성 확인

### 개선사항 (Improved)

#### QA 및 테스트
- **완료된 테스트 항목**
  - 컨텍스트 메뉴 기능 테스트 (다양한 파일 형식)
  - 명령 팔레트 실행 테스트
  - StatusBar 표시 및 업데이트 테스트
  - 설정 탭 로딩 및 표시 테스트
  
- **테스트 환경**
  - Obsidian v1.5.x
  - macOS, Windows 11, Ubuntu 22.04
  - 다양한 vault 크기 및 구성

### 기술적 세부사항 (Technical Details)

#### 수정된 파일
- `src/main.ts`: 컨텍스트 메뉴 이벤트 핸들러 추가, 명령어 ID 수정, StatusBar 초기화 개선
- `src/ui/settings/SettingsTab.ts`: 디버깅 로그 추가 및 DOM 검증 로직 구현

#### 영향받는 기능
- 파일 우클릭 메뉴
- 명령 팔레트 (Cmd/Ctrl + P)
- 하단 상태바 표시
- 플러그인 설정 화면

## [3.0.2] - 2025-08-30

### 수정됨 (Fixed)

#### StatusBar 오류 해결
- **문제**: `addStatusBarItem()` 호출 시 `toLowerCase` 메서드 오류 발생
  - StatusBar 텍스트 설정 시 undefined 값 처리 미흡
  - 타입 안전성 부족으로 인한 런타임 에러
  
- **해결**: 안전한 텍스트 설정 메커니즘 구현
  - Null/undefined 체크 로직 추가
  - 기본값 설정 및 타입 가드 적용
  - StatusBar 업데이트 메서드 안정화

#### SettingsTab 표시 문제 수정
- **문제**: 설정 탭이 Obsidian 설정 창에 표시되지 않음
  - 복잡한 모듈 구조로 인한 초기화 실패
  - 의존성 순환 참조 문제
  
- **해결**: 간단한 단일 파일 구조로 리팩토링
  - SettingsTab 클래스 통합 및 단순화
  - 의존성 주입 개선
  - 초기화 순서 최적화

### 개선사항 (Improved)

#### 아키텍처 개선
- **생명주기 관리자 추가**
  - 플러그인 생명주기 이벤트 중앙 관리
  - 리소스 정리 자동화
  - 메모리 누수 방지 메커니즘
  
- **의존성 주입 컨테이너 구현**
  - 서비스 간 느슨한 결합 달성
  - 테스트 용이성 향상
  - 모듈 교체 가능성 확보
  
- **UI 매니저 패턴 적용**
  - UI 컴포넌트 중앙 관리
  - 일관된 UI 업데이트 로직
  - 성능 최적화된 렌더링
  
- **에러 경계 시스템 구축**
  - 전역 에러 핸들링
  - 사용자 친화적 에러 메시지
  - 자동 복구 메커니즘

### 기술적 세부사항 (Technical Details)

#### 수정된 파일
- `src/main.ts`: StatusBar 초기화 및 업데이트 로직 개선
- `src/ui/settings/SettingsTab.ts`: 설정 탭 구조 단순화
- `src/core/LifecycleManager.ts`: 새로운 생명주기 관리 시스템
- `src/core/DependencyContainer.ts`: DI 컨테이너 구현
- `src/ui/UIManager.ts`: UI 컴포넌트 매니저
- `src/core/ErrorBoundary.ts`: 에러 처리 시스템

## [3.0.1] - 2025-08-30

### 개선사항 (Improved)

#### TypeScript 타입 시스템 강화
- **타입 에러 41개 수정 완료**
  - `tsconfig.json`의 `strict` 모드에서 발생한 모든 타입 에러 해결
  - 타입 안전성 대폭 향상으로 런타임 에러 가능성 감소
  
#### 코드 품질 개선
- **타입 정의 명확화**
  - 모든 함수 매개변수와 반환 타입 명시
  - `any` 타입 사용 최소화
  - 인터페이스와 타입 별칭 적절히 활용
  
- **Null 안전성 강화**
  - Optional chaining (`?.`) 활용
  - Nullish coalescing (`??`) 연산자 적용
  - 명시적 null/undefined 체크 추가

#### 빌드 시스템 개선
- **TypeScript 컴파일 성공**
  - 모든 TypeScript 컴파일 에러 해결
  - 빌드 파이프라인 안정성 향상
  - CI/CD 파이프라인 통과

### 기술적 세부사항 (Technical Details)

#### 수정된 주요 타입 에러 카테고리
1. **암시적 any 타입** (15개)
   - 함수 매개변수 타입 명시
   - 콜백 함수 타입 정의
   
2. **Null/Undefined 처리** (12개)
   - Optional property 접근 수정
   - Null 체크 로직 추가
   
3. **타입 불일치** (8개)
   - 인터페이스 구현 정합성 확보
   - 제네릭 타입 파라미터 수정
   
4. **모듈 타입 정의** (6개)
   - 외부 라이브러리 타입 정의 추가
   - 커스텀 타입 선언 파일 생성

## [3.0.0] - 2025-08-29

### 추가됨 (Added)
- Multi-Provider 지원 (OpenAI Whisper, Deepgram)
- 향상된 설정 UI (탭 네비게이션)
- 실시간 음성 변환 지원
- 고급 캐싱 시스템
- Provider별 상세 설정

### 변경됨 (Changed)
- 설정 UI 전면 개편
- 성능 최적화
- 에러 처리 개선

### 수정됨 (Fixed)
- Windows 11 호환성 문제
- 메모리 누수 이슈
- API 응답 처리 버그

## [2.0.0] - 2025-08-28

### 추가됨 (Added)
- Deepgram API 통합
- 다국어 지원 확대
- 자동 언어 감지

### 변경됨 (Changed)
- 아키텍처 리팩토링
- 모듈화 개선

## [1.0.0] - 2025-08-27

### 추가됨 (Added)
- 초기 릴리스
- OpenAI Whisper API 지원
- 기본 음성 변환 기능
- 한국어/영어 지원

---

## 버전 정보

- **현재 안정 버전**: 3.0.3
- **최소 Obsidian 버전**: 0.15.0
- **Node.js 버전**: 18.x 이상
- **TypeScript 버전**: 5.x

## 링크

- [GitHub Repository](https://github.com/asyouplz/SpeechNote-1)
- [Issue Tracker](https://github.com/asyouplz/SpeechNote-1/issues)
- [Release Notes](https://github.com/asyouplz/SpeechNote-1/releases)