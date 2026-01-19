# Privacy

[English](#english) | [한국어](#한국어)

## English

### Data flow summary

-   Audio files are sent to the transcription provider you select (OpenAI Whisper or Deepgram).
-   Transcription results are written into your Obsidian notes.
-   API keys are stored in Obsidian settings on your device.

### What is shared with providers

-   Audio content and basic request metadata needed for transcription.
-   Any optional features enabled in settings may affect what is sent (for example, diarization).

### Local storage

-   Settings are stored locally in your Obsidian configuration.
-   If the plugin caches results or metadata, those remain on your device.

### Logs and diagnostics

-   If you enable detailed logs, avoid sharing files that may contain sensitive data.
-   Do not paste API keys into public issue trackers.

### Your responsibilities

-   Review the privacy policies of OpenAI and Deepgram for how they handle data.
-   Rotate keys if you believe they were exposed.

### Contact

For privacy questions, open a GitHub Issue and label it "privacy".

## 한국어

### 데이터 흐름 요약

-   오디오 파일은 선택한 변환 공급자(OpenAI Whisper 또는 Deepgram)로 전송됩니다.
-   변환 결과는 Obsidian 노트에 저장됩니다.
-   API 키는 사용자 기기의 Obsidian 설정에 저장됩니다.

### 공급자에게 전송되는 정보

-   변환을 위해 필요한 오디오 데이터와 기본 요청 메타데이터.
-   설정에서 선택한 옵션(예: 화자 분리)에 따라 전송 정보가 달라질 수 있습니다.

### 로컬 저장

-   설정은 Obsidian 구성에 로컬로 저장됩니다.
-   결과나 메타데이터를 캐시하는 경우, 해당 데이터는 기기 내에만 유지됩니다.

### 로그 및 진단

-   상세 로그를 사용하는 경우 민감한 정보가 포함되지 않도록 주의하세요.
-   API 키를 공개 이슈에 공유하지 마세요.

### 사용자 책임

-   OpenAI와 Deepgram의 개인정보 처리방침을 확인하세요.
-   키가 노출되었다고 의심되면 키를 교체하세요.

### 문의

개인정보 관련 문의는 GitHub Issue에 "privacy" 라벨로 등록해 주세요.
