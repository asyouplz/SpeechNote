# Quick Start Guide | 빠른 시작 가이드

<div align="center">

## 🚀 Get Started in 5 Minutes | 5분 만에 시작하기

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/taesunlee/obsidian-speech-to-text)
[![Obsidian](https://img.shields.io/badge/Obsidian-%3E%3D0.15.0-purple.svg)](https://obsidian.md)

[English](#english) | [한국어](#korean)

</div>

---

<a name="english"></a>
## 🇬🇧 English

### 📦 Step 1: Install Plugin (30 seconds)

#### Option A: Community Plugin
```
1. Settings (⚙️) → Community plugins
2. Turn off "Restricted mode"
3. Browse → Search "Speech to Text"
4. Install → Enable
```

#### Option B: Manual Install
```bash
# Download and extract
wget https://github.com/taesunlee/obsidian-speech-to-text/releases/latest/download/speech-to-text.zip
unzip speech-to-text.zip -d ~/.obsidian/plugins/

# Restart Obsidian
```

---

### 🔑 Step 2: Get OpenAI API Key (2 minutes)

1. **Create Account**
   - Visit [platform.openai.com](https://platform.openai.com)
   - Sign up with email or Google/Microsoft

2. **Generate API Key**
   ```
   Profile → View API keys → Create new secret key
   ```
   
3. **Copy Key**
   - ⚠️ **Important**: Copy immediately! (shown only once)
   - Format: `sk-...` (48 characters)

---

### ⚙️ Step 3: Configure Plugin (30 seconds)

1. **Open Settings**
   ```
   Cmd/Ctrl + , → Speech to Text
   ```

2. **Enter API Key**
   ```
   Paste your API key → Validate → Save
   ```

3. **Quick Settings**
   | Setting | Recommended |
   |---------|-------------|
   | Language | Auto Detect |
   | Insert Position | Cursor |
   | Auto Insert | Enabled |

---

### 🎙️ Step 4: First Transcription (1 minute)

1. **Prepare Audio File**
   - Record a 10-second test
   - Save to vault (`.m4a`, `.mp3`, `.wav`)

2. **Run Transcription**
   ```
   Cmd/Ctrl + P → "Transcribe audio file" → Select file
   ```

3. **Done!** 
   - Text appears at cursor position
   - Check status bar for progress

---

### ⚡ Quick Commands

| Action | Shortcut | Command |
|--------|----------|---------|
| **Transcribe** | `Cmd+Shift+T` | Transcribe audio file |
| **Cancel** | `Cmd+Shift+C` | Cancel transcription |
| **Format** | `Cmd+Shift+F` | Show format options |
| **History** | `Cmd+Shift+H` | Show history |

---

### 💡 Pro Tips

#### Best Recording Practices
- 🎙️ **Quality**: Use quiet environment
- 📏 **Length**: Keep under 5 minutes per file
- 💾 **Format**: Use M4A or MP3
- 📁 **Organization**: Create `Audio Notes` folder

#### Optimize for Speed
```yaml
File Size: < 10MB
Bitrate: 128kbps
Sample Rate: 16kHz
Channels: Mono
```

#### Save Money
- Enable caching (prevents re-transcription)
- Compress files before upload
- Remove silence from recordings
- Batch process during off-peak

---

### ❓ Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| **"Invalid API Key"** | Check format (`sk-...`), remove spaces |
| **"File too large"** | Max 25MB, compress if needed |
| **Slow transcription** | Reduce file size, check internet |
| **No audio files found** | Check format (`.m4a`, `.mp3`, `.wav`) |
| **Plugin not loading** | Restart Obsidian (`Cmd/Ctrl + R`) |

---

### 📚 Next Steps

- 📖 Read [Full Manual](./user-manual-en.md)
- 🎥 Watch [Video Tutorials](./video-tutorials.md)
- 💬 Join [Community Forum](https://forum.obsidian.md)
- ⭐ Star on [GitHub](https://github.com/taesunlee/obsidian-speech-to-text)

---

<a name="korean"></a>
## 🇰🇷 한국어

### 📦 Step 1: 플러그인 설치 (30초)

#### 방법 A: 커뮤니티 플러그인
```
1. 설정 (⚙️) → 커뮤니티 플러그인
2. "제한 모드" 끄기
3. 둘러보기 → "Speech to Text" 검색
4. 설치 → 활성화
```

#### 방법 B: 수동 설치
```bash
# 다운로드 및 압축 해제
wget https://github.com/taesunlee/obsidian-speech-to-text/releases/latest/download/speech-to-text.zip
unzip speech-to-text.zip -d ~/.obsidian/plugins/

# 옵시디언 재시작
```

---

### 🔑 Step 2: OpenAI API 키 발급 (2분)

1. **계정 생성**
   - [platform.openai.com](https://platform.openai.com) 접속
   - 이메일 또는 구글/마이크로소프트로 가입

2. **API 키 생성**
   ```
   프로필 → View API keys → Create new secret key
   ```
   
3. **키 복사**
   - ⚠️ **중요**: 즉시 복사! (한 번만 표시됨)
   - 형식: `sk-...` (48자)

---

### ⚙️ Step 3: 플러그인 설정 (30초)

1. **설정 열기**
   ```
   Cmd/Ctrl + , → Speech to Text
   ```

2. **API 키 입력**
   ```
   API 키 붙여넣기 → 검증 → 저장
   ```

3. **빠른 설정**
   | 설정 | 권장값 |
   |------|--------|
   | 언어 | 자동 감지 |
   | 삽입 위치 | 커서 |
   | 자동 삽입 | 활성화 |

---

### 🎙️ Step 4: 첫 변환 (1분)

1. **오디오 파일 준비**
   - 10초 테스트 녹음
   - vault에 저장 (`.m4a`, `.mp3`, `.wav`)

2. **변환 실행**
   ```
   Cmd/Ctrl + P → "Transcribe audio file" → 파일 선택
   ```

3. **완료!** 
   - 커서 위치에 텍스트 표시
   - 상태바에서 진행 상황 확인

---

### ⚡ 빠른 명령어

| 동작 | 단축키 | 명령 |
|------|--------|------|
| **변환** | `Cmd+Shift+T` | 음성 파일 변환 |
| **취소** | `Cmd+Shift+C` | 변환 취소 |
| **포맷** | `Cmd+Shift+F` | 포맷 옵션 표시 |
| **기록** | `Cmd+Shift+H` | 변환 기록 보기 |

---

### 💡 프로 팁

#### 최적 녹음 방법
- 🎙️ **품질**: 조용한 환경 사용
- 📏 **길이**: 파일당 5분 이내
- 💾 **형식**: M4A 또는 MP3 사용
- 📁 **정리**: `음성 메모` 폴더 생성

#### 속도 최적화
```yaml
파일 크기: < 10MB
비트레이트: 128kbps
샘플레이트: 16kHz
채널: 모노
```

#### 비용 절감
- 캐싱 활성화 (재변환 방지)
- 업로드 전 파일 압축
- 녹음에서 무음 제거
- 한꺼번에 배치 처리

---

### ❓ 빠른 문제 해결

| 문제 | 해결 방법 |
|------|-----------|
| **"Invalid API Key"** | 형식 확인 (`sk-...`), 공백 제거 |
| **"File too large"** | 최대 25MB, 필요시 압축 |
| **변환 느림** | 파일 크기 줄이기, 인터넷 확인 |
| **오디오 파일 없음** | 형식 확인 (`.m4a`, `.mp3`, `.wav`) |
| **플러그인 안 보임** | 옵시디언 재시작 (`Cmd/Ctrl + R`) |

---

### 📚 다음 단계

- 📖 [전체 매뉴얼](./user-manual-ko.md) 읽기
- 🎥 [비디오 튜토리얼](./video-tutorials.md) 시청
- 💬 [커뮤니티 포럼](https://forum.obsidian.md) 참여
- ⭐ [GitHub](https://github.com/taesunlee/obsidian-speech-to-text) 스타

---

## 🆘 Need Help? | 도움이 필요하신가요?

<div align="center">

### Support Channels | 지원 채널

| Channel | Link | Response Time |
|---------|------|---------------|
| 📧 **Email** | support@example.com | 24-48 hours |
| 💬 **Discord** | [Join Server](https://discord.gg/obsidianmd) | Real-time |
| 🐛 **GitHub** | [Issues](https://github.com/taesunlee/obsidian-speech-to-text/issues) | 1-3 days |
| 📖 **Docs** | [Full Documentation](./user-manual-en.md) | Immediate |

### Quick Links | 빠른 링크

[🏠 Home](../README.md) | [📖 Manual](./user-manual-en.md) | [🔧 Troubleshooting](./troubleshooting.md) | [🎥 Videos](./video-tutorials.md)

**Version 1.0.0** | Last Updated: 2025-08-25

</div>