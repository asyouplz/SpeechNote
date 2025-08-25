# 옵시디언 음성-텍스트 변환 플러그인 요구사항서

## 프로젝트 개요
옵시디언(Obsidian)에서 음성 녹음 파일(m4a)을 텍스트로 변환하여 노트에 직접 기재하는 플러그인 개발

## 핵심 요구사항

### 기능 요구사항
1. **음성 파일 처리**
   - m4a 확장자 음성 녹음 파일 지원
   - 로컬 파일 링크 선택 기능
   - 옵시디언 내부 파일 링크 인식

2. **음성-텍스트 변환**
   - OpenAI Whisper API를 통한 speech-to-text 변환
   - 변환된 텍스트를 현재 활성 노트에 직접 삽입
   - 변환 진행 상태 표시

3. **플랫폼 지원**
   - macOS 환경 지원
   - Windows 환경 지원

### 비기능 요구사항
- 옵시디언 플러그인 가이드라인 준수
- 사용자 친화적인 인터페이스
- 안정적인 오류 처리

## 에이전트별 역할 분담 (CLAUDE.md 원칙 준수)

### 1단계: 초기 자문 및 계획
**@agent-mentor-educational-guide**
- 옵시디언 플러그인 개발 가이드라인 검토
- Whisper API 통합 방법 지도
- 코드 구조 및 패턴 제안

### 2단계: 시스템 설계
**@agent-systems-architect**
- 플러그인 아키텍처 설계
- 컴포넌트 구조 정의
- API 통합 전략 수립

협력 에이전트:
- **@agent-backend-api-infrastructure**: Whisper API 통합 조언
- **@agent-code-refactorer**: 코드 구조 최적화 제안

### 3단계: 구현
**@agent-backend-api-infrastructure**
- Whisper API 통합 구현
- 파일 처리 로직 개발
- 오류 처리 및 재시도 메커니즘 구현

**@agent-code-refactorer**
- 코드 품질 개선
- 디자인 패턴 적용
- 성능 최적화

### 4단계: 문서화
**@agent-documentation-expert**
- 사용자 매뉴얼 작성
- API 문서 작성
- 설치 및 설정 가이드 작성
- 코드 주석 및 인라인 문서화

## 개발 프로세스

### Phase 1: 환경 설정 및 기초 구조
1. 옵시디언 플러그인 개발 환경 구성
2. TypeScript 프로젝트 초기화
3. 기본 플러그인 구조 생성
4. 개발 도구 설정 (ESLint, Prettier)

### Phase 2: 핵심 기능 개발
1. 파일 선택 UI 구현
   - 파일 피커 다이얼로그
   - m4a 파일 필터링
   
2. Whisper API 통합
   - API 키 설정 관리
   - 음성 파일 업로드
   - 변환 결과 수신
   
3. 텍스트 삽입 기능
   - 현재 커서 위치 감지
   - 변환된 텍스트 삽입
   - 포맷팅 옵션 제공

### Phase 3: 사용자 경험 개선
1. 설정 페이지 구현
   - API 키 관리
   - 변환 옵션 설정
   - 단축키 설정
   
2. 진행 상태 표시
   - 로딩 인디케이터
   - 진행률 표시
   - 완료/오류 알림

### Phase 4: 테스트 및 최적화
1. 단위 테스트 작성
2. 통합 테스트 수행
3. 성능 최적화
4. 버그 수정

### Phase 5: 배포 준비
1. 문서 최종 검토
2. 릴리스 노트 작성
3. 플러그인 패키징
4. 커뮤니티 플러그인 등록 준비

## 기술 스택

### 개발 환경
- **언어**: TypeScript
- **프레임워크**: Obsidian Plugin API
- **빌드 도구**: esbuild
- **패키지 매니저**: npm

### 주요 라이브러리
- **obsidian**: 옵시디언 플러그인 API
- **openai**: Whisper API 클라이언트
- **node-fetch**: HTTP 요청 처리 (필요시)

### 개발 도구
- **ESLint**: 코드 품질 관리
- **Prettier**: 코드 포맷팅
- **Jest**: 테스트 프레임워크

## 참고 자료

### 과거 프로젝트 경험
회의록 자동화 시스템에서 얻은 주요 인사이트:

1. **음성 변환 최적화**
   - 네이버 클로바와 OpenAI Whisper 엔진 비교 경험
   - 한국어 음성 인식 최적화 방법
   - 오디오 파일 전처리 기법

2. **사용자 인터페이스**
   - 파일 업로드 방식 (드래그&드롭, 파일 선택)
   - 실시간 진행 상태 표시의 중요성
   - 오류 처리 및 사용자 피드백

3. **텍스트 후처리**
   - 변환된 텍스트 편집 기능
   - 타임스탬프 처리
   - 포맷팅 옵션 제공

### 외부 리소스
- [Obsidian Plugin Developer Docs](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- [OpenAI Whisper API Documentation](https://platform.openai.com/docs/guides/speech-to-text)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)

## 프로젝트 관리 원칙

1. **반복적 개발**: 각 Phase 완료 후 피드백 수렴 및 개선
2. **문서 우선**: 코드 작성 전 문서화, 코드 수정 후 문서 업데이트
3. **협업 중심**: 에이전트 간 지속적 소통과 검토
4. **품질 보증**: 각 단계별 테스트 및 검증

## 다음 단계

1. @agent-mentor-educational-guide와 초기 자문 세션 진행
2. @agent-systems-architect와 시스템 설계 검토
3. 개발 환경 구성 및 프로토타입 개발 시작

---

*이 문서는 CLAUDE.md의 Code and Script Work Principles에 따라 작성되었으며, 각 에이전트의 역할과 협업 프로세스를 명확히 정의하였습니다.*