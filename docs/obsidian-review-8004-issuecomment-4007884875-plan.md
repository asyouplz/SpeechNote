# Plan for PR #8004 Follow-up

- Source comment: https://github.com/obsidianmd/obsidian-releases/pull/8004#issuecomment-4007884875
- Comment date: 2026-03-05
- Branch baseline: `fix/pr8004-human-review`

## Review Summary

The reviewer has no more line-level comments for now, but asked for three remaining cleanup areas before a broader review:

1. Choose either Korean or English for the UI and logs.
2. Prefix CSS selectors to avoid leaking styles outside the plugin.
3. Review SVG creation.

## Decisions

### 1. UI and log language

- Choose English as the canonical language for user-facing UI copy and runtime logs.
- Translate remaining Korean notices, labels, button text, ARIA labels, and log messages in the active settings and shared UI paths.
- Leave developer comments unchanged unless they affect runtime text.

### 2. CSS selector prefixing

- Prefix provider-settings selectors with the existing `sn-` namespace.
- Update the corresponding DOM class names in `ProviderSettings.ts`.
- Keep selectors scoped under `.speech-to-text-settings` where practical.

### 3. SVG creation

- Audit the codebase for raw SVG HTML injection.
- Keep using Obsidian's `setIcon(...)` helper and `document.createElementNS(...)` for programmatic SVG.
- Only change code if a non-namespaced or string-based SVG path is found.

## Execution Order

1. Update shared settings/UI text and logs to English.
2. Prefix provider-settings CSS classes and sync the TypeScript renderers.
3. Finish the SVG audit and document whether code changes were needed.
4. Run targeted validation: typecheck, lint, and focused tests if string or selector changes affect coverage.

## Validation Notes

- Search for remaining Korean runtime strings in `src/`.
- Search for remaining unprefixed provider-settings selectors.
- Search for raw `<svg` or `createEl('svg')` usage and confirm only safe creation paths remain.

## Additional Bot Follow-up

- Follow-up comment: https://github.com/obsidianmd/obsidian-releases/pull/8004#issuecomment-4029277995
- Comment date: 2026-03-10

Applied follow-up cleanup:

1. Use sentence case for the `DragDropZone` helper text.
2. Remove the unused `safeJsonParse` import flagged in `StatisticsDashboard.ts`.
