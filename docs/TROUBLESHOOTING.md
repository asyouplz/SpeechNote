# Troubleshooting

[English](#english) | [한국어](#한국어)

## English

### "Invalid API Key"
- Confirm the key is correct and has no extra spaces.
- Check the provider dashboard for key status and billing.
- If you changed keys, restart Obsidian to reload settings.

### "File too large"
- Whisper has smaller limits; Deepgram supports larger files.
- Use compression or chunking if available.

### No audio files found
- Ensure the file is inside your vault.
- Check supported formats (for example: m4a, mp3, wav, mp4).
- Wait for Obsidian indexing to complete.

### Empty or partial output
- Try a different provider or enable retries.
- Use clearer audio and avoid overlapping speech.

### Network errors or timeouts
- Check your internet connection.
- Increase request timeout if available.
- Retry later if the provider is rate-limiting.

### Speaker diarization not working
- Make sure diarization is enabled in settings.
- Use a model that supports diarization.
- Ensure each speaker has enough uninterrupted time.

### Still stuck?
- Reproduce the issue and capture logs if the plugin provides them.
- Open a GitHub Issue with steps, expected behavior, and actual behavior.

## 한국어

### "Invalid API Key"
- 키에 공백이 없는지 확인합니다.
- 공급자 대시보드에서 키 상태와 결제 상태를 확인합니다.
- 키를 변경했다면 Obsidian을 재시작해 설정을 다시 불러옵니다.

### "File too large"
- Whisper는 제한이 더 작고, Deepgram은 더 큰 파일을 지원합니다.
- 가능하다면 압축이나 청킹을 사용합니다.

### 오디오 파일이 보이지 않음
- 파일이 vault 안에 있는지 확인합니다.
- 지원 형식(m4a, mp3, wav, mp4 등)을 확인합니다.
- Obsidian 인덱싱이 끝날 때까지 기다립니다.

### 결과가 비어있거나 일부만 나옴
- 다른 공급자로 시도하거나 재시도 옵션을 켭니다.
- 오디오 품질을 개선하고 동시에 말하는 구간을 줄입니다.

### 네트워크 오류 또는 타임아웃
- 인터넷 연결을 확인합니다.
- 가능하면 타임아웃을 늘립니다.
- 공급자가 제한을 걸었을 수 있으니 잠시 후 재시도합니다.

### 화자 분리가 동작하지 않음
- 설정에서 화자 분리가 켜져 있는지 확인합니다.
- 화자 분리를 지원하는 모델을 사용합니다.
- 화자별로 충분한 발화 길이가 있는지 확인합니다.

### 그래도 해결되지 않나요?
- 재현 방법과 로그를 정리합니다.
- GitHub Issue에 재현 단계와 기대/실제 결과를 작성합니다.
