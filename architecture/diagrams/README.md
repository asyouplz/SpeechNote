# 아키텍처 다이어그램 가이드

## 다이어그램 목록

### 1. 전체 아키텍처 (01-overall-architecture.mmd)
- **목적**: 시스템의 전체 계층 구조와 주요 컴포넌트 관계를 보여줍니다
- **주요 내용**:
  - 4계층 아키텍처 (UI, Application, Business, Infrastructure)
  - 외부 시스템 통합 포인트
  - 컴포넌트 간 의존성

### 2. 컴포넌트 의존성 (02-component-dependencies.mmd)
- **목적**: 각 컴포넌트 간의 상세한 의존성 관계를 표현합니다
- **주요 내용**:
  - 핵심 컴포넌트 간 관계
  - 지원 컴포넌트 역할
  - 인프라스트럭처 서비스 연결

### 3. 데이터 흐름 (03-data-flow.mmd)
- **목적**: 음성 파일 변환 프로세스의 전체 데이터 흐름을 시퀀스 다이어그램으로 표현합니다
- **주요 내용**:
  - 사용자 상호작용 시퀀스
  - 캐시 확인 로직
  - API 호출 및 재시도 메커니즘
  - 에러 처리 흐름

### 4. 상태 관리 (04-state-management.mmd)
- **목적**: 애플리케이션의 상태 전이를 상태 다이어그램으로 표현합니다
- **주요 내용**:
  - 각 처리 단계별 상태
  - 에러 상태 분류
  - 취소 및 복구 흐름

### 5. API 통합 (05-api-integration.mmd)
- **목적**: Whisper API 통합 아키텍처를 상세히 표현합니다
- **주요 내용**:
  - API 클라이언트 구조
  - 인증 및 권한 관리
  - 재시도 및 Rate Limiting
  - 에러 처리 전략

### 6. 에러 처리 계층 (06-error-handling-layers.mmd)
- **목적**: 다층적 에러 처리 전략을 시각화합니다
- **주요 내용**:
  - 에러 소스 분류
  - 에러 감지 및 분류
  - 복구 전략
  - 사용자 피드백 메커니즘

### 7. 비동기 처리 (07-async-processing.mmd)
- **목적**: 다중 파일 처리를 위한 비동기 처리 아키텍처를 표현합니다
- **주요 내용**:
  - 큐 관리 시스템
  - 동시성 제어
  - 진행 상황 추적
  - 취소 메커니즘

### 8. 보안 아키텍처 (08-security-architecture.mmd)
- **목적**: 보안 계층과 위협 완화 전략을 표현합니다
- **주요 내용**:
  - 입력 검증 및 살균
  - API 키 보안
  - 데이터 보호
  - 보안 모니터링

## Mermaid 다이어그램 사용법

### VSCode에서 보기
1. Mermaid Preview 확장 설치
   ```
   ext install bierner.markdown-mermaid
   ```
2. `.mmd` 파일 열기
3. 우측 상단의 미리보기 버튼 클릭

### Obsidian에서 사용
1. 마크다운 파일에 다음과 같이 포함:
   ````markdown
   ```mermaid
   [다이어그램 내용]
   ```
   ````

### 온라인 편집기
- [Mermaid Live Editor](https://mermaid.live/)에서 직접 편집 및 내보내기 가능

## 다이어그램 수정 가이드

### 색상 테마 변경
```mermaid
%%{init: {'theme':'dark'}}%%
```
- 사용 가능한 테마: `default`, `neutral`, `dark`, `forest`, `base`

### 스타일 커스터마이징
```mermaid
style NODE_ID fill:#색상,stroke:#테두리색,stroke-width:2px
```

### 노트 추가
```mermaid
Note over Component: 설명 텍스트
Note right of Component: 우측 노트
```

## 다이어그램 내보내기

### PNG/SVG로 내보내기
1. Mermaid Live Editor 사용
2. 다이어그램 붙여넣기
3. Actions → Download PNG/SVG

### PDF 문서에 포함
1. SVG로 내보내기
2. 문서에 이미지로 삽입

---

*최종 업데이트: 2025-08-22*