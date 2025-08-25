# Git 브랜칭 전략

## 개요
이 문서는 Speech-to-Text 플러그인 프로젝트의 Git 브랜칭 전략을 정의합니다.

## 브랜치 구조

### 주요 브랜치

#### `main` (또는 `master`)
- **목적**: 프로덕션 준비 코드
- **특징**: 
  - 항상 배포 가능한 상태 유지
  - 직접 커밋 금지 (PR을 통해서만 병합)
  - 태그를 통한 버전 관리

#### `develop`
- **목적**: 개발 통합 브랜치
- **특징**:
  - 다음 릴리스를 위한 최신 개발 코드
  - feature 브랜치들이 병합되는 대상
  - CI/CD 파이프라인 실행

### 보조 브랜치

#### `feature/*`
- **목적**: 새로운 기능 개발
- **명명 규칙**: `feature/기능명` (예: `feature/audio-format-support`)
- **생성 위치**: `develop` 브랜치에서 분기
- **병합 대상**: `develop` 브랜치
- **예시**:
  ```bash
  git checkout -b feature/whisper-api-integration develop
  ```

#### `bugfix/*`
- **목적**: 버그 수정
- **명명 규칙**: `bugfix/버그설명` (예: `bugfix/file-size-validation`)
- **생성 위치**: `develop` 브랜치에서 분기
- **병합 대상**: `develop` 브랜치

#### `hotfix/*`
- **목적**: 프로덕션 긴급 수정
- **명명 규칙**: `hotfix/버그설명` (예: `hotfix/api-key-validation`)
- **생성 위치**: `main` 브랜치에서 분기
- **병합 대상**: `main`과 `develop` 브랜치 모두

#### `release/*`
- **목적**: 릴리스 준비
- **명명 규칙**: `release/버전번호` (예: `release/1.0.0`)
- **생성 위치**: `develop` 브랜치에서 분기
- **병합 대상**: `main`과 `develop` 브랜치 모두

## 워크플로우

### 1. 새 기능 개발
```bash
# 1. develop 브랜치에서 feature 브랜치 생성
git checkout develop
git pull origin develop
git checkout -b feature/new-feature

# 2. 기능 개발 및 커밋
git add .
git commit -m "feat: 새로운 기능 추가"

# 3. 원격 저장소에 푸시
git push origin feature/new-feature

# 4. Pull Request 생성 (feature -> develop)
```

### 2. 버그 수정
```bash
# 1. develop 브랜치에서 bugfix 브랜치 생성
git checkout develop
git pull origin develop
git checkout -b bugfix/fix-issue

# 2. 버그 수정 및 커밋
git add .
git commit -m "fix: 버그 수정"

# 3. 원격 저장소에 푸시
git push origin bugfix/fix-issue

# 4. Pull Request 생성 (bugfix -> develop)
```

### 3. 릴리스 준비
```bash
# 1. develop 브랜치에서 release 브랜치 생성
git checkout develop
git pull origin develop
git checkout -b release/1.0.0

# 2. 버전 업데이트 및 릴리스 노트 작성
npm version 1.0.0
git add .
git commit -m "chore: 버전 1.0.0 릴리스 준비"

# 3. 테스트 및 버그 수정

# 4. main으로 병합
git checkout main
git merge --no-ff release/1.0.0
git tag -a v1.0.0 -m "Release version 1.0.0"

# 5. develop으로 병합
git checkout develop
git merge --no-ff release/1.0.0

# 6. release 브랜치 삭제
git branch -d release/1.0.0
```

### 4. 핫픽스
```bash
# 1. main 브랜치에서 hotfix 브랜치 생성
git checkout main
git pull origin main
git checkout -b hotfix/critical-bug

# 2. 긴급 수정 및 커밋
git add .
git commit -m "hotfix: 긴급 버그 수정"

# 3. main으로 병합
git checkout main
git merge --no-ff hotfix/critical-bug
git tag -a v1.0.1 -m "Hotfix version 1.0.1"

# 4. develop으로 병합
git checkout develop
git merge --no-ff hotfix/critical-bug

# 5. hotfix 브랜치 삭제
git branch -d hotfix/critical-bug
```

## 커밋 메시지 컨벤션

### 형식
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type
- `feat`: 새로운 기능
- `fix`: 버그 수정
- `docs`: 문서 수정
- `style`: 코드 포맷팅, 세미콜론 누락 등
- `refactor`: 코드 리팩토링
- `test`: 테스트 추가 또는 수정
- `chore`: 빌드 프로세스 또는 보조 도구 변경
- `perf`: 성능 개선
- `ci`: CI 설정 변경
- `build`: 빌드 시스템 또는 외부 의존성 변경
- `revert`: 커밋 되돌리기

### 예시
```bash
# 기능 추가
git commit -m "feat(audio): MP3 파일 지원 추가"

# 버그 수정
git commit -m "fix(api): API 키 검증 오류 수정"

# 문서 업데이트
git commit -m "docs(readme): 설치 가이드 업데이트"

# 리팩토링
git commit -m "refactor(service): WhisperService 구조 개선"

# 테스트 추가
git commit -m "test(audio): AudioProcessor 단위 테스트 추가"
```

## Pull Request 가이드라인

### PR 제목
- 명확하고 간결하게 작성
- 커밋 메시지 컨벤션 따르기
- 예: `feat: Whisper API 통합 구현`

### PR 설명 템플릿
```markdown
## 변경 사항
- 변경 내용 요약

## 관련 이슈
- #이슈번호

## 체크리스트
- [ ] 코드 리뷰 요청 전 self-review 완료
- [ ] 테스트 추가/수정
- [ ] 문서 업데이트
- [ ] 브랜치 최신 상태 유지 (rebase/merge)

## 스크린샷 (UI 변경 시)
```

## 브랜치 보호 규칙

### `main` 브랜치
- Direct push 금지
- PR 필수
- 최소 1명 이상의 리뷰 승인 필요
- CI 통과 필수
- 브랜치 최신 상태 유지 필수

### `develop` 브랜치
- Direct push 금지
- PR 필수
- CI 통과 필수

## 버전 관리

### Semantic Versioning
`MAJOR.MINOR.PATCH` 형식 사용

- **MAJOR**: 호환되지 않는 API 변경
- **MINOR**: 하위 호환 가능한 기능 추가
- **PATCH**: 하위 호환 가능한 버그 수정

### 태그 규칙
- 형식: `v{version}` (예: `v1.0.0`)
- 릴리스 노트 포함
- GPG 서명 권장

## CI/CD 통합

### GitHub Actions 워크플로우
- **PR 체크**: 린트, 테스트, 빌드
- **develop 브랜치**: 지속적 통합
- **main 브랜치**: 자동 릴리스 및 배포

## 정리 작업

### 브랜치 정리
- 병합된 feature/bugfix 브랜치는 삭제
- 로컬 및 원격 브랜치 모두 정리
```bash
# 병합된 로컬 브랜치 삭제
git branch --merged | grep -v "\*\|main\|develop" | xargs -n 1 git branch -d

# 원격 브랜치 삭제
git push origin --delete feature/branch-name
```

## 트러블슈팅

### 충돌 해결
```bash
# develop 최신 변경사항 가져오기
git checkout develop
git pull origin develop

# feature 브랜치로 돌아가서 rebase
git checkout feature/my-feature
git rebase develop

# 충돌 해결 후
git add .
git rebase --continue

# 강제 푸시 (feature 브랜치에서만)
git push --force-with-lease origin feature/my-feature
```

### 커밋 되돌리기
```bash
# 마지막 커밋 수정
git commit --amend

# 특정 커밋 되돌리기
git revert <commit-hash>

# 여러 커밋 되돌리기 (인터랙티브 리베이스)
git rebase -i HEAD~3
```

---

*최종 업데이트: 2025-08-22*