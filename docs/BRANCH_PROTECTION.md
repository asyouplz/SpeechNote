# Branch Protection 설정 가이드

GitHub repository의 main 브랜치를 보호하기 위한 설정 가이드입니다.

## 왜 Branch Protection이 필요한가?

Branch Protection은 다음을 보장합니다:

-   ✅ 모든 코드가 리뷰를 거쳐 merge됨
-   ✅ CI 파이프라인 통과 없이는 merge 불가
-   ✅ 직접 main 브랜치에 push 방지
-   ✅ 코드 품질 유지

## 설정 방법

### 1. GitHub Repository 설정 접근

1. **GitHub Repository로 이동**: https://github.com/asyouplz/SpeechNote
2. **Settings 탭 클릭** (repository 상단 메뉴)
3. 왼쪽 사이드바에서 **"Branches"** 클릭 (Code and automation 섹션)

### 2. Branch Protection Rule 추가

1. **"Add branch protection rule"** 버튼 클릭
2. **Branch name pattern**: `main` 입력

### 3. 보호 규칙 설정

다음 옵션들을 체크:

#### Required (필수)

-   ✅ **Require a pull request before merging**
    -   ✅ "Require approvals" 체크
    -   Approvals 수: `1` 입력
-   ✅ **Require status checks to pass before merging**

    -   ✅ "Require branches to be up to date before merging" 체크
    -   검색창에서 다음 status checks 추가:
        -   `Code Quality Check`
        -   `Build Test`

    > **참고**: Status checks는 최소 한 번 이상 CI가 실행된 후에야 선택 가능합니다.
    > PR을 하나 생성하고 CI를 실행한 후 이 설정을 추가하세요.

#### Optional but Recommended (선택적, 권장)

-   ✅ **Do not allow bypassing the above settings**

    -   관리자도 규칙을 우회할 수 없도록 강제

-   ✅ **Require conversation resolution before merging**

    -   PR 코멘트가 모두 resolved되어야 merge 가능

-   ✅ **Lock branch**
    -   main 브랜치를 read-only로 만들기 (선택적)

### 4. 설정 저장

-   페이지 하단의 **"Create"** 버튼 클릭

## 설정 검증

Branch Protection이 올바르게 설정되었는지 확인:

1. **새 PR 생성**:

    ```bash
    git checkout -b test-branch
    echo "test" >> test.txt
    git add test.txt
    git commit -m "test: branch protection"
    git push origin test-branch
    ```

2. **GitHub에서 PR 생성**

3. **다음 사항 확인**:
    - [ ] CI가 자동으로 실행됨
    - [ ] CI 통과 전에는 merge 버튼이 비활성화됨
    - [ ] "Merge" 대신 "Merge when checks pass" 표시
    - [ ] 1명의 approval 필요 표시

## Status Checks가 안 보일 때

Status checks는 CI가 최소 한 번 실행된 후에만 선택 가능합니다:

1. **먼저 PR 생성하고 CI 실행**:

    - 아무 변경사항으로 PR을 생성
    - CI가 완료될 때까지 대기

2. **다시 Branch Protection 설정으로 이동**:

    - Settings → Branches → Edit rule
    - "Require status checks to pass" 섹션에서
    - 검색창에 체크할 항목들이 나타남

3. **필요한 checks 선택**:
    - `Code Quality Check`
    - `Build Test`

## Troubleshooting

### "Settings" 탭이 안 보여요

-   Repository의 owner 또는 admin 권한이 필요합니다
-   Collaborator라면 owner에게 admin 권한을 요청하세요

### Status checks를 추가할 수 없어요

-   CI 워크플로우가 최소 한 번 실행되어야 합니다
-   PR을 생성하고 CI가 완료된 후 다시 시도하세요

### CI를 우회하고 싶어요

-   **권장하지 않습니다**. Branch protection의 목적을 훼손합니다
-   긴급 hotfix가 필요한 경우:
    1. "Allow specified actors to bypass required pull requests" 체크
    2. 특정 사용자/팀만 우회 허용 (최소한으로 제한)

## 다음 단계

Branch Protection 설정 후:

1. ✅ 팀원들에게 새로운 워크플로우 안내
2. ✅ [docs/RELEASE.md](RELEASE.md) 참조하여 릴리즈 프로세스 숙지
3. ✅ Pre-commit hooks 설정: `npm install`

## 참고 자료

-   [GitHub Branch Protection 공식 문서](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
-   [Status Checks 설정](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/about-status-checks)
