# Settings Guide

[English](#english) | [한국어](#한국어)

## English

### Notes about settings

-   Available settings may vary by version and provider.
-   If you do not see a setting in your UI, it may be hidden, unavailable, or disabled.

### Provider and API keys

-   Provider: Auto, OpenAI Whisper, or Deepgram.
-   API keys: add the key for the provider you want to use.

### Language

-   Auto-detect is recommended unless you always use a single language.

### Insert position

-   Insert at cursor, at the top of the note, or at the bottom of the note.
-   Auto-insert can place the result immediately after transcription completes.

### Speaker diarization (Deepgram)

-   Enable diarization to label speakers in multi-person recordings.
-   If you only have a single speaker, leave it off for simpler output.

### Text formatting

-   Output can be plain text or formatted (for example, markdown or blocks).
-   Choose a format that matches your note-taking style.

### Performance and reliability

-   Timeouts and retry limits help when networks are unstable.
-   Concurrency and batching (if available) can improve throughput for multiple files.

### Large files

-   Some providers have file size limits. Use chunking or compression if available.
-   For large files, Deepgram is often more suitable than Whisper.

### Cost controls

-   If your version exposes budget or cost controls, set a safe limit to avoid surprises.

### Recommended baseline

-   Provider: Auto
-   Language: Auto
-   Insert position: Cursor
-   Diarization: Off for single speaker, On for meetings

## 한국어

### 설정 안내

-   설정 항목은 버전과 공급자에 따라 달라질 수 있습니다.
-   UI에서 보이지 않는 항목은 비활성화되었거나 제공되지 않는 항목일 수 있습니다.

### 공급자 및 API 키

-   공급자: Auto, OpenAI Whisper, Deepgram 중 선택합니다.
-   사용할 공급자의 API 키를 입력합니다.

### 언어

-   특별한 이유가 없다면 자동 감지를 권장합니다.

### 삽입 위치

-   커서 위치, 노트 상단, 노트 하단 중 선택할 수 있습니다.
-   자동 삽입을 켜면 변환 완료 시 자동으로 삽입됩니다.

### 화자 분리 (Deepgram)

-   화자 분리를 켜면 다중 화자를 구분해 출력합니다.
-   1인 화자인 경우 끄는 것이 더 깔끔합니다.

### 텍스트 포맷

-   일반 텍스트 또는 포맷된 텍스트(예: 마크다운, 블록)로 출력할 수 있습니다.
-   메모 스타일에 맞는 포맷을 선택하세요.

### 성능 및 안정성

-   네트워크가 불안정할 때 타임아웃과 재시도 옵션이 도움이 됩니다.
-   동시 처리나 배치 처리가 있는 경우 여러 파일에 유리합니다.

### 대용량 파일

-   공급자마다 파일 크기 제한이 다를 수 있습니다.
-   필요하면 청킹 또는 압축 기능을 사용하세요.
-   대용량 파일은 Deepgram이 더 적합한 경우가 많습니다.

### 비용 관리

-   버전에 따라 예산/비용 한도 옵션이 제공될 수 있습니다.
-   안전한 한도를 설정해 예기치 않은 비용을 줄이세요.

### 권장 기본값

-   공급자: Auto
-   언어: 자동 감지
-   삽입 위치: 커서 위치
-   화자 분리: 1인 오디오에는 Off, 회의에는 On
