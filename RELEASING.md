# 릴리스 가이드

SpeechNote 플러그인의 릴리스 프로세스 문서입니다.

## 자동 릴리스 (권장)

**semantic-release**를 사용하여 완전 자동화된 릴리스를 수행합니다.

### 사용 방법

1. **Conventional Commits** 형식으로 커밋합니다:
   ```
   feat: add new transcription feature    # → Minor (3.1.0)
   fix: resolve audio playback issue      # → Patch (3.0.1)
   feat!: redesign settings UI            # → Major (4.0.0)
   ```

2. PR을 `main` 브랜치로 머지합니다.

3. GitHub Actions가 자동으로:
   - 버전 업데이트
   - CHANGELOG.md 생성
   - GitHub Release 생성
   - 빌드 아티팩트 업로드

### Conventional Commits 가이드

| 타입 | 설명 | 버전 범프 |
|------|------|----------|
| `feat` | 새로운 기능 | Minor |
| `fix` | 버그 수정 | Patch |
| `perf` | 성능 개선 | Patch |
| `refactor` | 코드 리팩토링 | Patch |
| `docs` | 문서 수정 | - |
| `chore` | 유지보수 작업 | - |

**Breaking Change**: 타입 뒤에 `!`를 붙이거나 커밋 본문에 `BREAKING CHANGE:` 포함 시 Major 버전 범프.

---

## 긴급 수동 릴리스

자동화 시스템이 작동하지 않을 때만 사용하세요.

```bash
./scripts/release-emergency.sh [patch|minor|major|VERSION]
```

### 예시
```bash
./scripts/release-emergency.sh patch    # 3.0.9 → 3.0.10
./scripts/release-emergency.sh 3.2.0    # 특정 버전 지정
```

---

## 롤백 절차

### 잘못된 릴리스 롤백

1. **GitHub에서 릴리스 삭제**:
   - Releases 페이지에서 해당 릴리스 삭제

2. **태그 삭제**:
   ```bash
   git tag -d v3.1.0
   git push origin --delete v3.1.0
   ```

3. **커밋 되돌리기** (필요시):
   ```bash
   git revert HEAD
   git push origin main
   ```

### 버전 파일만 롤백

```bash
git checkout HEAD~1 -- manifest.json package.json versions.json
git commit -m "fix: revert version files"
git push origin main
```

---

## 실패 처리

### CI 파이프라인 실패

1. GitHub Actions 로그 확인
2. 로컬에서 동일한 명령 실행하여 디버깅:
   ```bash
   npm run lint
   npm run typecheck
   npm run build
   ```

### semantic-release 실패

1. 커밋 메시지 형식 확인
2. GitHub Token 권한 확인
3. 필요시 `--dry-run`으로 테스트:
   ```bash
   npx semantic-release --dry-run
   ```

---

## 검증

### 릴리스 전 확인 사항
- [ ] `npm run lint` 통과
- [ ] `npm run typecheck` 통과
- [ ] `npm run build` 성공
- [ ] Conventional Commit 형식 준수

### 버전 스크립트 테스트
```bash
# 변경 사항 미리보기 (파일 수정 없음)
node scripts/update-version.mjs 4.0.0 --dry-run
```
