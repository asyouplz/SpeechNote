# Repository Guidelines

English | 한국어: [AGENTS.ko.md](./AGENTS.ko.md)

## Project Structure & Modules

-   Source: `src/` (entry: `src/main.ts`). Key areas: `core/transcription/`, `application/`, `infrastructure/`, `ui/`, `utils/`, `types/`.
-   Builds output to `main.js` (loaded by Obsidian). Plugin metadata in `manifest.json`. Styles in `styles/` and `styles.css`.
-   Tests: `tests/` (unit, integration, e2e) and `src/__tests__/` for targeted specs. Assets for tests in `test/`.

## Build, Test, and Development

-   `npm run dev` — esbuild watch for rapid iteration.
-   `npm run build` — type-check + production bundle (`main.js`).
-   `npm run typecheck` — TypeScript no‑emit type validation.
-   `npm run lint` / `npm run lint:fix` — ESLint checks/fixes.
-   `npm run format` / `format:check` — Prettier write/check.
-   `npm test` — Jest all tests. Focused: `test:unit`, `test:integration`, `test:e2e`. Coverage: `test:coverage`.
-   CI sanity: `npm run validate` (lint + typecheck + tests).

## Coding Style & Naming

-   Language: TypeScript. Run Prettier before commits.
-   Prettier config: 4‑space indent, `semi: true`, `singleQuote: true`, `printWidth: 100`.
-   Classes/services in PascalCase files (e.g., `EditorService.ts`). Utilities/helpers use lower‑case file names (e.g., `utils/common/formatters.ts`).
-   Functions/variables: `camelCase`; types/interfaces: `PascalCase` with `Props`/`Options` suffix when appropriate.

## Testing Guidelines

-   Framework: Jest (`jest.config.js`, `jest.config.e2e.js`).
-   Place tests under `tests/{unit,integration,e2e}` or near code in `src/__tests__/`.
-   Name tests `*.test.ts`. Keep tests deterministic; avoid external network calls.
-   Run `npm run test:coverage`; PRs should not reduce coverage for changed areas.

## Commit & Pull Requests

-   Commits: Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`, `test:`). Example: `feat(ui): add provider settings panel`.
-   PRs: clear description, linked issues (`Closes #123`), test coverage notes, and screenshots/GIFs for UI changes.
-   Versioning: use `npm version patch|minor|major` to trigger `version-bump` (updates `manifest.json`/`versions.json`).

## Security & Config Tips

-   Never commit API keys; configure keys via the plugin’s Settings UI.
-   Avoid logging sensitive data. Keep error messages user‑friendly and non‑revealing.
-   When touching build config, ensure `main.js` size/perf remains reasonable.
