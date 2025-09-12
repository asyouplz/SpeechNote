# Obsidian Speech-to-Text Plugin

<div align="center">

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/asyouplz/SpeechNote-1/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Obsidian](https://img.shields.io/badge/obsidian-%3E%3D0.15.0-purple.svg)](https://obsidian.md)
[![OpenAI](https://img.shields.io/badge/OpenAI-Whisper%20API-orange.svg)](https://platform.openai.com/docs/guides/speech-to-text)
[![Deepgram](https://img.shields.io/badge/Deepgram-Nova%203%20API-blue.svg)](https://developers.deepgram.com/)

Convert audio recordings to text directly in Obsidian using multiple AI providers.

Recent improvements (3.0.x):
- Cleaner speaker diarization output: one utterance per line with `Speaker N: ...` format
- Better speaker grouping using Deepgram utterances when available
- Fewer label repeats via merge threshold tuning and light speaker smoothing
- Light Korean post-processing for spacing and punctuation readability

?듭떆?붿뼵?먯꽌 ?뚯꽦 ?뚯씪???띿뒪?몃줈 蹂?섑븯??媛뺣젰???뚮윭洹몄씤?낅땲??

[English](#english) | [?쒓뎅??(#korean)

</div>

---

## Features (二쇱슂 湲곕뒫)

### ?럺截?Multi-Provider Audio Transcription
- **OpenAI Whisper**: High accuracy, stable performance
- **Deepgram Nova 3**: Latest model with 98% accuracy, 70% cost reduction
- **Speaker Diarization**: Automatic speaker separation with "Speaker 1:", "Speaker 2:" format
- **Auto Selection**: Automatically chooses the best provider for each file
- **Supported Formats**: M4A, MP3, WAV, MP4, WebM, OGG, FLAC

### ?뙋 Multi-language Support
- **Auto Detection**: Automatic language recognition
- **40+ Languages**: Korean, English, Japanese, Chinese, Spanish, French, German, etc.
- **Provider Optimization**: Each provider optimized for different languages

### ?뱷 Smart Text Insertion & Speaker Recognition
- **Cursor Position**: Insert at current cursor location
- **Note Positions**: Beginning or end of note
- **Auto Note Creation**: Creates new note if no active editor
- **Speaker Diarization**: Automatic speaker identification and labeling
- **Multi-Speaker Support**: Clear separation for meetings, interviews, conversations

### ??Performance Optimizations
- **Nova-3 Model**: 98% accuracy with $0.0043/min (70% cost reduction)
- **Intelligent Provider Selection**: Best provider based on file size and format
- **Real-time Progress**: Status bar progress indicator
- **Async Processing**: Non-blocking background processing
- **Cancellation Support**: Cancel ongoing transcriptions
- **Fallback Mechanism**: Automatic provider switching on failure

## Installation (?ㅼ튂)

### Manual Installation (?섎룞 ?ㅼ튂)

#### From Releases
1. Download the latest release from [Releases](https://github.com/asyouplz/SpeechNote-1/releases)
2. Extract files to your vault's `.obsidian/plugins/obsidian-speech-to-text/` folder
3. Restart Obsidian
4. Enable "Speech to Text" in Community Plugins settings

#### Development Build
```bash
# Clone repository
git clone https://github.com/asyouplz/SpeechNote-1.git
cd SpeechNote-1

# Install dependencies
npm install

# Build
npm run build

# Copy to plugin folder
cp main.js manifest.json styles.css /path/to/your/vault/.obsidian/plugins/obsidian-speech-to-text/
```

## Setup (珥덇린 ?ㅼ젙)

### API Key Configuration

#### 1. Choose Provider
1. Open Obsidian Settings ??"Speech to Text"
2. Select "Transcription Provider":
   - **OpenAI Whisper**: High quality, stable
   - **Deepgram**: Fast speed, large file support
   - **Auto**: Automatic selection (recommended)

#### 2. Get OpenAI API Key (for Whisper)
1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in or create account
3. Click "Create new secret key"
4. Copy the key (?좑툘 shown only once)

#### 3. Get Deepgram API Key (for Deepgram)
1. Visit [Deepgram Console](https://console.deepgram.com/)
2. Sign up or sign in
3. Go to "API Keys" menu
4. Click "Create a New API Key"
5. Copy the API key

#### 4. Configure Plugin
1. Open Obsidian Settings (Cmd/Ctrl + ,)
2. Select "Speech to Text" from left menu
3. Enter your API key(s):
   - "OpenAI API Key" (for Whisper)
   - "Deepgram API Key" (for Deepgram)
4. Save settings

## Usage (?ъ슜踰?

### Basic Usage

#### Method 1: Command Palette
1. **Open Command Palette**: `Cmd/Ctrl + P`
2. **Search**: "Transcribe audio file"
3. **Select File**: Choose audio file from list
4. **Wait**: Monitor progress in status bar
5. **Complete**: Text automatically inserted into note

#### Method 2: Context Menu ??
1. **File Explorer**: Find audio file
2. **Right Click**: Right-click on audio file
3. **Select**: "Transcribe audio file"
4. **Auto Process**: Transcription starts and inserts result

#### Method 3: Hotkeys
1. **Settings**: Settings ??Hotkeys ??search "Transcribe audio file"
2. **Set Hotkey**: Assign preferred key combination
3. **Execute**: Use hotkey for quick access

### ?렚 Using Speaker Diarization

#### Enable Speaker Diarization
1. **Open Settings**: Settings ??Speech to Text ??Deepgram Settings
2. **Enable Diarization**: Toggle "Speaker Diarization" to ON
3. **Select Nova-3**: Choose "Nova-3" model (default for new installations)
4. **Save Settings**: Apply configuration

#### Example Results
```
?럺截?Multi-speaker meeting audio:

?뱷 Transcription output:
Speaker 1: Good morning everyone, let's start the meeting.

Speaker 2: Thank you. I'd like to discuss the project timeline.

Speaker 1: That sounds good. What are your thoughts?

Speaker 3: I think we should extend the deadline by one week.
```

#### Best Practices for Speaker Diarization
- **Clear Audio**: Use high-quality recordings for better accuracy
- **Speaker Separation**: Ensure speakers don't talk simultaneously
- **Minimum Duration**: Each speaker segment should be at least 2-3 seconds
- **Audio Format**: Use M4A, MP3, or WAV for optimal results

### ?렚 Speaker Diarization Feature

**Perfect for meetings, interviews, and conversations!**

```
?럺截?Input Audio:
"Hello, I'm John." (Speaker 1)
"Nice to meet you, I'm Sarah." (Speaker 2)

?뱷 Output Text:
Speaker 1: Hello, I'm John.

Speaker 2: Nice to meet you, I'm Sarah.
```

### Supported Audio Formats

| Format | Extension | Whisper | Deepgram | Max Size | Diarization | Description |
|--------|-----------|---------|----------|----------|-------------|--------------|
| M4A | .m4a | ??| ??| 25MB/2GB | ??| Apple default recording format |
| MP3 | .mp3 | ??| ??| 25MB/2GB | ??| Universal audio format |
| WAV | .wav | ??| ??| 25MB/2GB | ??| Lossless, large file size |
| MP4 | .mp4 | ??| ??| 25MB/2GB | ??| Audio from video files |
| WebM | .webm | ??| ??| -/2GB | ??| Web streaming format |
| OGG | .ogg | ??| ??| -/2GB | ??| Open source audio format |
| FLAC | .flac | ??| ??| -/2GB | ??| Lossless compression |

## Settings (?ㅼ젙)

### Main Settings
- **Provider**: Auto/Whisper/Deepgram selection
- **Language**: Auto-detect or specific language
- **Insert Position**: Cursor/Beginning/End of note
- **Auto-insert**: Automatic text insertion
- **Deepgram Model**: Nova-3/Nova-2/Nova/Enhanced/Base
- **Deepgram Features**: Punctuation, Smart Format, Speaker Diarization, etc.

### Advanced Settings
- **Model Selection**: Nova-3 (recommended), Nova-2, Nova, Enhanced, Base
- **Speaker Diarization**: Enable automatic speaker separation
- **Fallback Provider**: Backup provider on failure
- **Cache Settings**: Enable/disable result caching
- **Network Settings**: Timeout, retry policies
- **Debug Mode**: Detailed logging

## Troubleshooting (臾몄젣 ?닿껐)

### Common Issues

#### "Invalid API Key" Error
**Solutions:**
1. Verify API key format (OpenAI: starts with `sk-`)
2. Check API key status on provider dashboard
3. Ensure sufficient credits/active subscription
4. Remove any extra spaces from key

#### "File too large" Error
**Solutions:**
1. Check file size limits (Whisper: 25MB, Deepgram: 2GB)
2. Use Deepgram for larger files
3. Compress audio files if needed

#### Speaker Diarization Not Working
**Solutions:**
1. Ensure Nova-3 model is selected (required for diarization)
2. Check "Speaker Diarization" is enabled in Deepgram settings
3. Verify audio quality (clear speakers, minimal overlap)
4. Use supported audio formats (M4A, MP3, WAV recommended)
5. Check minimum speaker duration (2-3 seconds per segment)

#### No Audio Files Found
**Solutions:**
1. Verify supported formats: .m4a, .mp3, .wav, .mp4, etc.
2. Ensure files are in vault folder
3. Restart Obsidian
4. Wait for file indexing (large vaults)

#### Network Errors
**Solutions:**
1. Check internet connection
2. Verify VPN/proxy settings
3. Check provider API status

## Commands (紐낅졊??

| Command | Description | Status |
|---------|-------------|---------|
| **Transcribe audio file** | Select and transcribe audio file | ??Available |
| **Cancel transcription** | Cancel ongoing transcription | ??Available |

## Development (媛쒕컻)

### Prerequisites
- Node.js 16.0.0+
- npm 7.0.0+
- Obsidian 0.15.0+
- TypeScript 4.7.4+

### Development Setup
```bash
# Clone repository
git clone https://github.com/asyouplz/SpeechNote-1.git
cd SpeechNote-1

# Install dependencies
npm install

# Development mode (watch for changes)
npm run dev

# Production build
npm run build

# Code quality checks
npm run lint
npm run format
npm run typecheck

# Run tests
npm test
```

### Project Structure
```
SpeechNote-1/
?쒋?? src/
??  ?쒋?? main.ts                    # Plugin entry point
??  ?쒋?? core/                      # Core business logic
??  ??  ?붴?? transcription/         # Transcription services
??  ?쒋?? infrastructure/            # External system integrations
??  ??  ?붴?? api/                   # API clients
??  ??      ?쒋?? providers/         # Provider implementations
??  ??      ??  ?쒋?? deepgram/      # Deepgram integration
??  ??      ??  ?붴?? whisper/       # Whisper integration
??  ??      ?붴?? adapters/          # Interface adapters
??  ?쒋?? ui/                        # User interface
??  ?붴?? types/                     # Type definitions
?쒋?? tests/                         # Test files
?쒋?? manifest.json                  # Plugin metadata
?쒋?? package.json                   # Project configuration
?붴?? README.md                      # This file
```

## Contributing (湲곗뿬)

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Contribution Process
1. **Fork** the repository
2. **Create** feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** changes: `git commit -m 'feat: add amazing feature'`
4. **Push** to branch: `git push origin feature/amazing-feature`
5. **Create** Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Credits

### Acknowledgments
- **Obsidian Team**: Obsidian Plugin API
- **OpenAI**: Whisper API
- **Deepgram**: Speech-to-Text API
- **Community**: Obsidian community feedback and contributions

### Built With
- TypeScript
- ESBuild
- Jest
- ESLint & Prettier

## Support

### Need Help?
- ?맀 **Bug Reports**: [GitHub Issues](https://github.com/asyouplz/SpeechNote-1/issues)
- ?뮕 **Feature Requests**: [GitHub Issues](https://github.com/asyouplz/SpeechNote-1/issues)
- ?뮠 **Discussions**: [GitHub Discussions](https://github.com/asyouplz/SpeechNote-1/discussions)

### Show Your Support
If this project helped you:
- 狩?Star on GitHub
- ?맔 Share on social media
- ??[Buy me a coffee](https://buymeacoffee.com/asyouplz)

## Recent Updates

### ?? v3.2.0 (2025-01-10) - Nova-3 & Speaker Diarization Release
- ??**Nova-3 Model**: Default model upgrade with 98% accuracy
- ?렚 **Speaker Diarization**: Complete implementation with "Speaker 1:", "Speaker 2:" format
- ?뮥 **Cost Optimization**: 70% cost reduction ($0.0043/min vs $0.0145/min)
- ?뵩 **Code Quality**: 72% class size reduction, 98% type coverage
- ?썳截?**Backward Compatibility**: Existing Nova-2 users fully supported
- ??**Performance**: 20% faster response time, improved accuracy

### v1.0.0 (2025-08-30)
- ?럦 **Initial Release**
- ?럺截?**Multi-Provider Support**: OpenAI Whisper & Deepgram
- ?뙋 **Multi-language Support**: 40+ languages
- ?뱷 **Smart Text Insertion**: Flexible insertion options
- ??**Performance Optimizations**: Auto provider selection
- ?썳截?**Fallback Mechanisms**: Automatic error recovery
- ?렞 **Context Menu Integration**: Right-click transcription
- ?뱤 **Advanced Settings**: Comprehensive configuration options

---

<div align="center">

**Made with ?ㅿ툘 for the Obsidian community**

[燧?Back to top](#obsidian-speech-to-text-plugin)

</div>
