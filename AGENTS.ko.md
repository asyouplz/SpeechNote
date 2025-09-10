# Repository Guidelines (KO)

언어 선택: [English](./AGENTS.md) | 한국어

## 프로젝트 구조 및 모듈
- 소스: `src/` (엔트리: `src/main.ts`). 주요 디렉터리: `core/transcription/`, `application/`, `infrastructure/`, `ui/`, `utils/`, `types/`.
- 빌드 산출물: `main.js`(Obsidian이 로드). 메타데이터: `manifest.json`. 스타일: `styles/`, `styles.css`.
- 테스트: 상위 `tests/`(unit/integration/e2e)와 인접 테스트 `src/__tests__/`. 샘플/자원은 `test/`.

## 빌드·테스트·개발
- `npm run dev` — esbuild 감시 모드(빠른 반복).
- `npm run build` — 타입 검사 후 프로덕션 번들(`main.js`).
- `npm run typecheck` — TS no‑emit 검사.
- `npm run lint` / `npm run lint:fix` — ESLint 검사/자동 수정.
- `npm run format` / `npm run format:check` — Prettier 적용/검사.
- `npm test` — 전체 Jest. 선택 실행: `test:unit`, `test:integration`, `test:e2e`. 커버리지: `test:coverage`.
- CI 점검: `npm run validate`(lint + typecheck + test).

## 코딩 스타일·네이밍
- 언어: TypeScript. 커밋 전 Prettier 필수.
- Prettier: 4칸 인덴트, `semi: true`, `singleQuote: true`, `printWidth: 100`.
- 클래스/서비스: PascalCase 파일명(예: `EditorService.ts`). 유틸: 소문자 파일(예: `utils/common/formatters.ts`).
- 함수/변수: `camelCase`. 타입/인터페이스: `PascalCase`(필요 시 `Props`/`Options` 접미사).

## 테스트 가이드
- 프레임워크: Jest(`jest.config.js`, `jest.config.e2e.js`).
- 위치: `tests/{unit,integration,e2e}` 또는 `src/__tests__/` 인접 테스트.
- 명명: `*.test.ts`. 외부 네트워크 호출 금지(결정적 테스트 유지).
- `npm run test:coverage` 실행. 변경 영역 커버리지 하락 금지.

## 커밋·PR 가이드
- 커밋: Conventional Commits(`feat:`, `fix:`, `refactor:`, `test:` 등). 예: `feat(ui): add provider settings panel`.
- PR: 상세 설명, 이슈 연계(`Closes #123`), 테스트 영향/커버리지 언급, UI 변경 시 스크린샷/GIF.
- 버저닝: `npm version patch|minor|major` 사용(자동으로 `manifest.json`/`versions.json` 갱신 스크립트 트리거).

## 보안·설정 팁
- API 키 커밋 금지. 플러그인 Settings UI로만 설정.
- 민감 정보 로그 출력 금지. 에러 메시지는 사용자 친화적으로.
- 빌드/설정 변경 시 `main.js` 크기·성능 점검.
