# PR #8004 Sentence Case Follow-up Plan

- Source comments:
  - https://github.com/obsidianmd/obsidian-releases/pull/8004#issuecomment-4060715550
  - https://github.com/obsidianmd/obsidian-releases/pull/8004#issuecomment-4061036624
- Branch baseline: `origin/fix/pr8004-settings-sentence-case-followups`
- Local verification date: 2026-03-15

## Goal

The review bot is still flagging UI copy that is not in sentence case.

For this follow-up, treat "sentence case" as:

- Capitalize only the first word of a sentence or label.
- Keep brand names and acronyms as proper nouns when needed.
- Avoid title-case nouns inside labels and dropdown options unless they are brand names.

## Current status

The issue is not fully fixed on the current remote follow-up branch.

The remaining work falls into two groups:

1. Active settings UI that the user can still reach now.
2. Secondary settings components that are still present in the repository and may still be scanned by the review bot.

## Group 1: Active settings UI

### `src/ui/settings/SettingsTab.ts`

These strings still look likely to trigger the review bot:

- `Auto (intelligent selection)` -> `Automatic (recommended)`
- `OpenAI whisper` -> `OpenAI Whisper`
- `Cost optimized` -> `Cost-optimized`
- `Performance optimized` -> `Performance-optimized`
- `Quality optimized` -> `Quality-optimized`
- `Round robin` -> `Round-robin`
- `A/B testing` -> `A/B testing`
  - Keep as-is only if the rule accepts acronym-style casing.
  - If the bot still flags it, change to `A/B tests`.
- `Provider API keys` -> `Provider API keys`
  - This may still be flagged because of internal capitalization.
  - Safer alternative: `API keys for providers`
- `OpenAI API key` -> `OpenAI API key`
  - Keep brand capitalization, but verify whether the rule tolerates this.
  - If not, use `API key for OpenAI`.
- `Enter your OpenAI API key for whisper transcription` -> `Enter your OpenAI API key for Whisper transcription`
- `Saved the OpenAI API key.` -> `Saved the OpenAI API key.`
  - If still flagged, use `Saved the API key for OpenAI.`
- `Deepgram API key saved.` -> `Saved the Deepgram API key.`
- `Whisper model` -> `Whisper model`
- `Debug information` -> `Debug information`
- `Buy me a coffee` -> `Buy me a coffee`

Representative lines to revisit:

- [SettingsTab.ts](/home/tslee/SpeechNote/src/ui/settings/SettingsTab.ts:155)
- [SettingsTab.ts](/home/tslee/SpeechNote/src/ui/settings/SettingsTab.ts:156)
- [SettingsTab.ts](/home/tslee/SpeechNote/src/ui/settings/SettingsTab.ts:262)
- [SettingsTab.ts](/home/tslee/SpeechNote/src/ui/settings/SettingsTab.ts:263)
- [SettingsTab.ts](/home/tslee/SpeechNote/src/ui/settings/SettingsTab.ts:264)
- [SettingsTab.ts](/home/tslee/SpeechNote/src/ui/settings/SettingsTab.ts:265)
- [SettingsTab.ts](/home/tslee/SpeechNote/src/ui/settings/SettingsTab.ts:266)
- [SettingsTab.ts](/home/tslee/SpeechNote/src/ui/settings/SettingsTab.ts:298)
- [SettingsTab.ts](/home/tslee/SpeechNote/src/ui/settings/SettingsTab.ts:369)
- [SettingsTab.ts](/home/tslee/SpeechNote/src/ui/settings/SettingsTab.ts:370)
- [SettingsTab.ts](/home/tslee/SpeechNote/src/ui/settings/SettingsTab.ts:381)
- [SettingsTab.ts](/home/tslee/SpeechNote/src/ui/settings/SettingsTab.ts:414)
- [SettingsTab.ts](/home/tslee/SpeechNote/src/ui/settings/SettingsTab.ts:527)
- [SettingsTab.ts](/home/tslee/SpeechNote/src/ui/settings/SettingsTab.ts:652)

### `src/ui/settings/SimpleSettingsTab.ts`

These are the same issue in a smaller settings surface:

- `Auto (intelligent selection)` -> `Automatic (recommended)`
- `OpenAI whisper` -> `OpenAI Whisper`
- `OpenAI API key` -> `OpenAI API key`
  - Fallback if flagged: `API key for OpenAI`
- `Enter your OpenAI API key for whisper` -> `Enter your OpenAI API key for Whisper`
- `Deepgram model` -> `Deepgram model`
- `Debug information` -> `Debug information`
- `Enhanced` -> `Enhanced`
- `Base (economy)` -> `Base (economy)`
  - These may be acceptable if treated as product labels; verify after the first pass.

Representative lines to revisit:

- [SimpleSettingsTab.ts](/home/tslee/SpeechNote/src/ui/settings/SimpleSettingsTab.ts:41)
- [SimpleSettingsTab.ts](/home/tslee/SpeechNote/src/ui/settings/SimpleSettingsTab.ts:42)
- [SimpleSettingsTab.ts](/home/tslee/SpeechNote/src/ui/settings/SimpleSettingsTab.ts:64)
- [SimpleSettingsTab.ts](/home/tslee/SpeechNote/src/ui/settings/SimpleSettingsTab.ts:65)
- [SimpleSettingsTab.ts](/home/tslee/SpeechNote/src/ui/settings/SimpleSettingsTab.ts:95)
- [SimpleSettingsTab.ts](/home/tslee/SpeechNote/src/ui/settings/SimpleSettingsTab.ts:155)

## Group 2: Secondary settings components still in the repository

These are still present on the branch and were explicitly referenced by the review bot comment.

### `src/ui/settings/components/ApiKeyValidator.ts`

Potentially problematic sentence-case copy:

- `The API key is valid, but it may not have access to whisper.` -> `The API key is valid, but it may not have access to Whisper.`

Representative line:

- [ApiKeyValidator.ts](/home/tslee/SpeechNote/src/ui/settings/components/ApiKeyValidator.ts:73)

### `src/ui/settings/components/AudioSettings.ts`

Potentially problematic copy:

- `Whisper-1 (default)` -> `Whisper-1 (default)`
  - Likely acceptable, but the bot has flagged this area before.
- `Verbose JSON (detailed output)` -> `Verbose JSON (detailed output)`
  - If flagged, change to `Detailed JSON output`
- `WebVTT format (VTT)` -> `WebVTT format (VTT)`
  - Likely acceptable because of the proper acronym.
- `Maximum file size` and `25 MB` are fine semantically; only change if the bot flags exact casing nearby.

Representative lines:

- [AudioSettings.ts](/home/tslee/SpeechNote/src/ui/settings/components/AudioSettings.ts:40)
- [AudioSettings.ts](/home/tslee/SpeechNote/src/ui/settings/components/AudioSettings.ts:44)
- [AudioSettings.ts](/home/tslee/SpeechNote/src/ui/settings/components/AudioSettings.ts:63)
- [AudioSettings.ts](/home/tslee/SpeechNote/src/ui/settings/components/AudioSettings.ts:65)
- [AudioSettings.ts](/home/tslee/SpeechNote/src/ui/settings/components/AudioSettings.ts:103)
- [AudioSettings.ts](/home/tslee/SpeechNote/src/ui/settings/components/AudioSettings.ts:114)

### `src/ui/settings/components/ProviderSettings.ts`

Still contains sentence-case candidates:

- `Automatic (recommended)` is already improved, but verify whether the bot still flags brand-heavy option labels.
- `OpenAI whisper` -> `OpenAI Whisper`
- `Cost optimized` -> `Cost-optimized`
- `Performance optimized` -> `Performance-optimized`
- `Quality optimized` -> `Quality-optimized`
- `Round robin` -> `Round-robin`
- `A/B testing` -> `A/B tests` if needed
- `Performance metrics` -> `Performance metrics`
- `Provider comparison` -> `Provider comparison`

Representative lines:

- [ProviderSettings.ts](/home/tslee/SpeechNote/src/ui/settings/components/ProviderSettings.ts:83)
- [ProviderSettings.ts](/home/tslee/SpeechNote/src/ui/settings/components/ProviderSettings.ts:84)
- [ProviderSettings.ts](/home/tslee/SpeechNote/src/ui/settings/components/ProviderSettings.ts:85)
- [ProviderSettings.ts](/home/tslee/SpeechNote/src/ui/settings/components/ProviderSettings.ts:222)
- [ProviderSettings.ts](/home/tslee/SpeechNote/src/ui/settings/components/ProviderSettings.ts:223)
- [ProviderSettings.ts](/home/tslee/SpeechNote/src/ui/settings/components/ProviderSettings.ts:224)
- [ProviderSettings.ts](/home/tslee/SpeechNote/src/ui/settings/components/ProviderSettings.ts:225)
- [ProviderSettings.ts](/home/tslee/SpeechNote/src/ui/settings/components/ProviderSettings.ts:226)
- [ProviderSettings.ts](/home/tslee/SpeechNote/src/ui/settings/components/ProviderSettings.ts:285)
- [ProviderSettings.ts](/home/tslee/SpeechNote/src/ui/settings/components/ProviderSettings.ts:352)
- [ProviderSettings.ts](/home/tslee/SpeechNote/src/ui/settings/components/ProviderSettings.ts:410)

### `src/ui/settings/components/ShortcutSettings.ts`

Representative flagged copy:

- `Shortcut conflicts detected` -> `Shortcut conflicts detected`
- `Recording... (press Escape to cancel)` -> `Recording... (press Escape to cancel)`

These already look sentence-case compliant, so this file should be rechecked carefully before changing anything.

Representative lines:

- [ShortcutSettings.ts](/home/tslee/SpeechNote/src/ui/settings/components/ShortcutSettings.ts:153)
- [ShortcutSettings.ts](/home/tslee/SpeechNote/src/ui/settings/components/ShortcutSettings.ts:488)

## Proposed execution order

1. Fix the active settings surfaces first:
   - `SettingsTab.ts`
   - `SimpleSettingsTab.ts`
2. Fix the explicitly referenced secondary components:
   - `ApiKeyValidator.ts`
   - `AudioSettings.ts`
   - `ProviderSettings.ts`
   - `ShortcutSettings.ts` only if a real sentence-case issue is confirmed
3. Re-run repository-wide copy checks with targeted grep:
   - `OpenAI whisper`
   - `Auto (intelligent selection)`
   - `Cost optimized`
   - `Performance optimized`
   - `Quality optimized`
   - `Round robin`
   - `Debug information`
4. Run full validation:
   - `npm run build:css`
   - `npm run typecheck`
   - `npm run build`
   - `npx jest --runInBand`

## Notes

- The local ESLint setup in this repository does not currently expose the review bot's `obsidianmd/ui/sentence-case` rule, so validation here must be done by direct string audit plus normal build/test checks.
- Prefer minimal wording changes over broad copy rewrites.
- Preserve proper nouns:
  - `OpenAI`
  - `Deepgram`
  - `Whisper`
  - `WebVTT`
  - `JSON`
  - `API`
