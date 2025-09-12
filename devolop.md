# Development Notes (Diarization & Formatting)

This document tracks diarization and text-formatting related changes and follow-ups.

## Changes (3.0.x)

- Output format defaults to one utterance per line: `Speaker N: text`
- Prefer Deepgram `utterances` for better speaker grouping when available
- Merge tuning: `consecutiveThreshold = 1.0s`, `minSegmentLength = 3 words`
- Speaker smoothing: reduce single-word A→B→A flips to avoid label spam
- Light Korean post-processing: spacing around Hangul/alphanumerics and punctuation spacing

## Code Touchpoints

- `src/infrastructure/api/providers/deepgram/DiarizationFormatter.ts`
  - More aggressive merge defaults
  - `smoothSpeakers()` added before segment building
  - `lineBreaksBetweenSpeakers = false` for one-line-per-utterance output

- `src/infrastructure/api/providers/deepgram/DeepgramService.ts`
  - `parseResponse()`: when `results.utterances` exists and diarization is enabled, build segments from utterances and produce `Speaker N: text` lines

- `src/core/transcription/TextFormatter.ts`
  - Light Korean cleanup: Hangul ↔ alphanumeric spacing, punctuation spacing

## Next Steps

- Expose diarization settings in UI:
  - Merge gap threshold (seconds)
  - Minimum words per segment
  - Speaker smoothing toggle
  - Label style (prefix/block) and label prefix customization
  - Korean post-processing mode (conservative/aggressive)

- Testing
  - Add fixtures with fast speaker turns and short backchannels
  - Snapshot tests for diarization output stability

## Known Considerations

- Utterances availability varies by model/response; fallback to word-based grouping handled.
- Korean post-processing is intentionally conservative to avoid altering semantics.
