# Changelog

이 프로젝트의 모든 주요 변경사항은 이 파일에 문서화됩니다.

형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.0.0/)를 기반으로 하며,
이 프로젝트는 [Semantic Versioning](https://semver.org/spec/v2.0.0.html)을 따릅니다.

## [Unreleased]

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

- **현재 안정 버전**: 3.0.1
- **최소 Obsidian 버전**: 0.15.0
- **Node.js 버전**: 18.x 이상
- **TypeScript 버전**: 5.x

## 링크

- [GitHub Repository](https://github.com/asyouplz/SpeechNote-1)
- [Issue Tracker](https://github.com/asyouplz/SpeechNote-1/issues)
- [Release Notes](https://github.com/asyouplz/SpeechNote-1/releases)