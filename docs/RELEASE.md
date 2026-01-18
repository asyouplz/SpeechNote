# 릴리즈 및 버전 관리 가이드

이 문서는 SpeechNote 플러그인의 릴리즈 프로세스와 버전 관리 방법을 설명합니다.

## 버전 관리 시스템

### 버전 형식

Semantic Versioning (x.y.z) 사용:
- **Major (x)**: Breaking changes
- **Minor (y)**: 새로운 기능 추가 (하위 호환)
- **Patch (z)**: 버그 수정

### 버전 관리 파일

다음 파일들이 버전을 포함하고 있으며, 버전 bump 시 자동으로 업데이트됩니다:
- `manifest.json` - Obsidian 플러그인 버전
- `package.json` - npm 패키지 버전
- `versions.json` - Obsidian 버전 호환성 정보

## 릴리즈 방법

### 방법 1: 자동 버전 Bump (PR 라벨)

PR에 라벨을 추가하여 merge 시 자동으로 버전이 증가합니다.

1. PR 생성
2. 다음 라벨 중 하나 추가:
   - `bump:patch` - 3.0.9 → 3.0.10
   - `bump:minor` - 3.0.9 → 3.1.0
   - `bump:major` - 3.0.9 → 4.0.0
3. PR merge
4. 자동으로 버전 증가 및 tag 생성
5. Tag push로 Release 워크플로우 자동 실행

### 방법 2: 수동 버전 Bump (로컬 스크립트)

로컬에서 버전을 증가시키고 릴리즈를 생성하는 방법:

```bash
# Patch 버전 증가 (3.0.9 → 3.0.10)
./scripts/release.sh patch

# Minor 버전 증가 (3.0.9 → 3.1.0)
./scripts/release.sh minor

# Major 버전 증가 (3.0.9 → 4.0.0)
./scripts/release.sh major

# 특정 버전으로 설정 (3.2.5)
./scripts/release.sh 3.2.5
```

스크립트는 다음을 자동으로 수행합니다:
1. ✅ 현재 브랜치 확인 (main 권장)
2. ✅ 최신 코드 pull
3. ✅ Lint, TypeScript, Build 체크
4. ✅ 버전 파일 업데이트
5. ✅ Commit 생성
6. ✅ Tag 생성
7. ✅ Push (선택 가능)

### 방법 3: GitHub Actions 수동 트리거

1. [Actions tab](https://github.com/asyouplz/SpeechNote/actions/workflows/version-bump.yml) 이동
2. "Run workflow" 클릭
3. 버전 bump 타입 선택 또는 커스텀 버전 입력
4. "Run workflow" 실행

## CI/CD 파이프라인

### CI Pipeline (자동 실행)

모든 PR 및 main 브랜치 push 시 자동 실행:

```
1. Code Quality Check (필수)
   ├─ ESLint (Obsidian plugin review bot compatible)
   ├─ Prettier format check
   └─ TypeScript type check

2. Tests (병렬 실행, 선택적)
   ├─ Unit Tests
   └─ Integration Tests

3. Build Test (필수)
   └─ Production build

4. Final Status Check
   └─ 모든 필수 체크 통과 확인
```

### Release Pipeline (Tag push 시 자동 실행)

버전 tag (v*.*.*)가 push되면 자동으로 릴리즈 생성:

```
1. Validate Release
   └─ 버전 형식 검증

2. Build & Package
   ├─ Production build
   └─ Release archive 생성

3. Generate Release Notes
   └─ Git 커밋 기반 자동 생성

4. Create GitHub Release
   ├─ Tag 생성
   ├─ Release notes 첨부
   └─ Assets 업로드 (main.js, manifest.json, zip)

5. Send Notifications
   └─ Discord webhook (설정된 경우)
```

## Pre-commit Hooks

로컬에서 commit 전 자동으로 체크:

```bash
# Husky를 사용하여 commit 전 자동 실행
.husky/pre-commit:
  - npm test
  - npm run lint
  - npm run format:check
```

설치 후 자동으로 활성화됩니다:
```bash
npm install  # prepare 스크립트가 자동으로 husky 설정
```

## Branch Protection Rules

main 브랜치 보호 규칙 (GitHub Settings에서 설정 권장):

- ✅ Require pull request before merging
- ✅ Require status checks to pass:
  - `Code Quality Check`
  - `Build Test`
- ✅ Require branches to be up to date
- ✅ Do not allow bypassing the above settings

## 릴리즈 체크리스트

릴리즈 전 확인사항:

- [ ] 모든 코드 변경사항이 commit됨
- [ ] CI 파이프라인 통과
- [ ] CHANGELOG 또는 release notes 작성
- [ ] 버전 번호가 Semantic Versioning 준수
- [ ] Breaking changes가 있다면 문서화됨
- [ ] Obsidian 최소 버전 호환성 확인

## 트러블슈팅

### 버전 bump 실패

**문제**: `version-bump.yml` 워크플로우가 실패함

**해결**:
1. PR에 올바른 라벨이 있는지 확인 (`bump:patch`, `bump:minor`, `bump:major`)
2. GitHub Actions 권한 확인 (Settings → Actions → Workflow permissions)
3. `manifest.json`, `package.json`, `versions.json` 형식 확인

### Release 생성 실패

**문제**: Tag는 생성되었으나 Release가 생성되지 않음

**해결**:
1. [Release 워크플로우 로그](https://github.com/asyouplz/SpeechNote/actions/workflows/release.yml) 확인
2. Tag 형식이 `v0.0.0` 형식인지 확인
3. Build 실패 시 lint/typecheck 오류 확인

### Pre-commit Hook이 실행되지 않음

**문제**: Commit 시 lint가 자동으로 실행되지 않음

**해결**:
```bash
# Husky 재설정
npm run prepare

# 또는 수동으로 hook 설정
npx husky init
chmod +x .husky/pre-commit
```

## 참고 자료

- [Semantic Versioning](https://semver.org/)
- [Obsidian Plugin Guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Husky Documentation](https://typicode.github.io/husky/)
