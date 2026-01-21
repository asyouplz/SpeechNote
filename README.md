# Obsidian Speech-to-Text Plugin

<!-- Test: Verifying Claude Code Review with new OAuth token - 2026-01-20 -->

<div align="center">

[![Version](https://img.shields.io/badge/version-3.0.9-blue.svg)](https://github.com/asyouplz/SpeechNote/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Obsidian](https://img.shields.io/badge/obsidian-%3E%3D0.15.0-purple.svg)](https://obsidian.md)
[![OpenAI](https://img.shields.io/badge/OpenAI-Whisper%20API-orange.svg)](https://platform.openai.com/docs/guides/speech-to-text)
[![Deepgram](https://img.shields.io/badge/Deepgram-Nova%203%20API-blue.svg)](https://developers.deepgram.com/)

Convert audio recordings to text directly in Obsidian using multiple AI providers with advanced features like speaker diarization.

[English](#english) | [한국어](#한국어)

</div>

---

# English

## Features

### 🎙️ Multi-Provider Audio Transcription

-   **OpenAI Whisper**: High accuracy, stable performance
-   **Deepgram Nova 3**: Latest model with 98% accuracy, 70% cost reduction
-   **Speaker Diarization**: Automatic speaker separation with "Speaker 1:", "Speaker 2:" format
-   **Auto Selection**: Automatically chooses the best provider for each file
-   **Supported Formats**: M4A, MP3, WAV, MP4, WebM, OGG, FLAC

### 🌐 Multi-language Support

-   **Auto Detection**: Automatic language recognition
-   **40+ Languages**: Korean, English, Japanese, Chinese, Spanish, French, German, etc.
-   **Provider Optimization**: Each provider optimized for different languages

### 📝 Smart Text Insertion & Speaker Recognition

-   **Cursor Position**: Insert at current cursor location
-   **Note Positions**: Beginning or end of note
-   **Auto Note Creation**: Creates new note if no active editor
-   **Speaker Diarization**: Automatic speaker identification and labeling
-   **Multi-Speaker Support**: Clear separation for meetings, interviews, conversations

### ⚡ Performance & Architecture

-   **Nova-3 Model**: 98% accuracy with $0.0043/min (70% cost reduction)
-   **Clean Architecture**: Domain-driven design with clear separation of concerns
-   **Intelligent Provider Selection**: Best provider based on file size and format
-   **Real-time Progress**: Status bar progress indicator with cancellation support
-   **Async Processing**: Non-blocking background processing
-   **Memory Management**: Built-in memory monitoring and optimization
-   **Performance Benchmarking**: Integrated performance monitoring tools
-   **Error Boundaries**: Comprehensive error handling and recovery
-   **Dependency Injection**: IoC container for better testability
-   **Event-Driven Architecture**: Decoupled components with EventManager
-   **Batch Processing**: Efficient batch request handling
-   **Caching Layer**: Smart caching for improved performance
-   **Settings Migration**: Automatic settings upgrade and validation
-   **Fallback Mechanism**: Automatic provider switching on failure

## Installation

### Manual Installation

#### From Releases

1. Download the latest release from [Releases](https://github.com/asyouplz/SpeechNote/releases)
2. Extract files to your vault's `.obsidian/plugins/obsidian-speech-to-text/` folder
3. Restart Obsidian
4. Enable "Speech to Text" in Community Plugins settings

#### Development Build

```bash
# Clone repository
git clone https://github.com/asyouplz/SpeechNote.git
cd SpeechNote

# Install dependencies
npm install

# Build
npm run build

# Copy to plugin folder
cp main.js manifest.json styles.css /path/to/your/vault/.obsidian/plugins/obsidian-speech-to-text/
```

## Setup

### API Key Configuration

#### 1. Choose Provider

1. Open Obsidian Settings → "Speech to Text"
2. Select "Transcription Provider":
    - **OpenAI Whisper**: High quality, stable
    - **Deepgram**: Fast speed, large file support
    - **Auto**: Automatic selection (recommended)

#### 2. Get OpenAI API Key (for Whisper)

1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in or create account
3. Click "Create new secret key"
4. Copy the key (⚠️ shown only once)

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

## Usage

### Basic Usage

#### Method 1: Command Palette

1. **Open Command Palette**: `Cmd/Ctrl + P`
2. **Search**: "Transcribe audio file"
3. **Select File**: Choose audio file from list
4. **Wait**: Monitor progress in status bar
5. **Complete**: Text automatically inserted into note

#### Method 2: Context Menu ✨

1. **File Explorer**: Find audio file
2. **Right Click**: Right-click on audio file
3. **Select**: "Transcribe audio file"
4. **Auto Process**: Transcription starts and inserts result

#### Method 3: Hotkeys

1. **Settings**: Settings → Hotkeys → search "Transcribe audio file"
2. **Set Hotkey**: Assign preferred key combination
3. **Execute**: Use hotkey for quick access

### 🎭 Using Speaker Diarization

#### Enable Speaker Diarization

1. **Open Settings**: Settings → Speech to Text → Deepgram Settings
2. **Enable Diarization**: Toggle "Speaker Diarization" to ON
3. **Select Nova-3**: Choose "Nova-3" model (default for new installations)
4. **Save Settings**: Apply configuration

#### Example Results

```
🎙️ Multi-speaker meeting audio:

📝 Transcription output:
Speaker 1: Good morning everyone, let's start the meeting.

Speaker 2: Thank you. I'd like to discuss the project timeline.

Speaker 1: That sounds good. What are your thoughts?

Speaker 3: I think we should extend the deadline by one week.
```

#### Best Practices for Speaker Diarization

-   **Clear Audio**: Use high-quality recordings for better accuracy
-   **Speaker Separation**: Ensure speakers don't talk simultaneously
-   **Minimum Duration**: Each speaker segment should be at least 2-3 seconds
-   **Audio Format**: Use M4A, MP3, or WAV for optimal results

### Supported Audio Formats

| Format | Extension | Whisper | Deepgram | Max Size | Diarization | Description                    |
| ------ | --------- | ------- | -------- | -------- | ----------- | ------------------------------ |
| M4A    | .m4a      | ✅      | ✅       | 25MB/2GB | ✅          | Apple default recording format |
| MP3    | .mp3      | ✅      | ✅       | 25MB/2GB | ✅          | Universal audio format         |
| WAV    | .wav      | ✅      | ✅       | 25MB/2GB | ✅          | Lossless, large file size      |
| MP4    | .mp4      | ✅      | ✅       | 25MB/2GB | ✅          | Audio from video files         |
| WebM   | .webm     | ❌      | ✅       | -/2GB    | ✅          | Web streaming format           |
| OGG    | .ogg      | ❌      | ✅       | -/2GB    | ✅          | Open source audio format       |
| FLAC   | .flac     | ❌      | ✅       | -/2GB    | ✅          | Lossless compression           |

## Settings

### Main Settings

-   **Provider Selection**:
    -   Auto: Intelligent selection based on file
    -   OpenAI Whisper: High quality, stable performance
    -   Deepgram: Fast speed, speaker diarization support
-   **Language**: Auto-detect or specific language selection
-   **Insert Position**:
    -   Cursor position
    -   Beginning of note
    -   End of note
-   **Auto-insert**: Automatic text insertion after transcription

### Deepgram Settings

-   **Model Selection**:
    -   Nova-3 (recommended): 98% accuracy, speaker diarization
    -   Nova-2: Previous generation, high accuracy
    -   Nova/Enhanced/Base: Legacy models
-   **Features**:
    -   Speaker Diarization: Automatic speaker separation
    -   Smart Format: Intelligent text formatting
    -   Punctuation: Automatic punctuation
    -   Utterances: Segment by natural speech patterns
    -   Paragraphs: Automatic paragraph detection

### Advanced Settings

-   **Performance**:
    -   Batch Processing: Process multiple files efficiently
    -   Memory Limits: Configure memory usage thresholds
    -   Cache Duration: Result caching timeouts
    -   Max Parallel Requests: Control concurrent API calls
    -   Circuit Breaker: Automatic failure protection
-   **Network**:
    -   Request Timeout: API request timeout settings
    -   Retry Policy: Automatic retry configuration
    -   Fallback Provider: Backup provider on failure
    -   Health Checks: Monitor provider availability
-   **Cost Management**:
    -   Monthly Budget: Set spending limits
    -   Cost Limits: Per-request cost controls
    -   Budget Alerts: Get notified at threshold
    -   Auto Cost Optimization: Intelligent provider selection based on cost
-   **Quality Control**:
    -   Quality Threshold: Minimum acceptable accuracy
    -   Confidence Level: Minimum transcription confidence
    -   Strict Language Mode: Enforce language consistency
    -   Post-Processing: Additional text refinement
-   **Text Formatting**:
    -   Plain Text: Standard text output
    -   Markdown: Markdown-formatted output
    -   Quote Block: Insert as blockquote
    -   Bullet List: Format as list items
    -   Heading: Insert as headings
    -   Code Block: Format as code
    -   Callout: Use Obsidian callouts
-   **A/B Testing**:
    -   Provider Comparison: Test multiple providers
    -   Traffic Split: Percentage-based routing
    -   Metric Tracking: Compare accuracy, speed, cost
    -   Duration Control: Set test duration
-   **Large File Handling**:
    -   Auto Chunking: Split files automatically
    -   Chunk Size: Configure chunk size (MB)
    -   Overlap: Set chunk overlap for continuity
-   **Development**:
    -   Debug Mode: Detailed logging
    -   Performance Monitoring: Track performance metrics
    -   Error Reporting: Enhanced error details
    -   Metrics Retention: Configure data retention period

## Troubleshooting

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

## Commands

| Command                   | Description                      | Status       |
| ------------------------- | -------------------------------- | ------------ |
| **Transcribe audio file** | Select and transcribe audio file | ✅ Available |
| **Cancel transcription**  | Cancel ongoing transcription     | ✅ Available |

## Development

### Prerequisites

-   Node.js 16.0.0+
-   npm 7.0.0+
-   Obsidian 0.15.0+
-   TypeScript 4.7.4+

### Development Setup

```bash
# Clone repository
git clone https://github.com/asyouplz/SpeechNote.git
cd SpeechNote

# Install dependencies
npm install

# Development mode (watch for changes)
npm run dev

# Production build
npm run build

# Code quality checks
npm run lint          # Lint check
npm run lint:fix      # Auto-fix lint issues
npm run format        # Format code
npm run format:check  # Check formatting
npm run typecheck     # Type checking

# Testing
npm test              # Run all tests
npm run test:unit     # Unit tests only
npm run test:integration  # Integration tests
npm run test:e2e      # End-to-end tests
npm run test:coverage # Generate coverage report
npm run test:watch    # Watch mode for TDD

# Clean build
npm run clean         # Clean build artifacts
npm run clean:all     # Clean everything including node_modules

# Full validation
npm run validate      # Lint + Type check + Tests
npm run ci           # Full CI pipeline
```

### Project Structure

```
SpeechNote/
├── src/
│   ├── main.ts                     # Plugin entry point
│   ├── application/                # Application services
│   │   ├── EditorService.ts       # Editor management
│   │   ├── EventManager.ts        # Event handling
│   │   ├── StateManager.ts        # State management
│   │   └── TextInsertionHandler.ts # Text insertion logic
│   ├── architecture/               # Architecture components
│   │   ├── DependencyContainer.ts # Dependency injection
│   │   ├── ErrorBoundary.ts       # Error handling boundaries
│   │   └── PluginLifecycleManager.ts # Plugin lifecycle
│   ├── core/                       # Core business logic
│   │   ├── LazyLoader.ts          # Lazy loading utilities
│   │   └── transcription/         # Transcription services
│   │       ├── AudioProcessor.ts  # Audio processing
│   │       ├── TextFormatter.ts   # Text formatting
│   │       └── TranscriptionService.ts # Main transcription service
│   ├── domain/                     # Domain models
│   │   ├── events/                # Domain events
│   │   └── models/                # Domain entities
│   ├── infrastructure/            # External integrations
│   │   ├── api/                   # API clients
│   │   │   ├── providers/         # Provider implementations
│   │   │   │   ├── deepgram/     # Deepgram integration
│   │   │   │   ├── whisper/      # OpenAI Whisper integration
│   │   │   │   └── factory/      # Provider factory
│   │   │   ├── adapters/         # Interface adapters
│   │   │   ├── BatchRequestManager.ts # Batch request handling
│   │   │   ├── FileUploadManager.ts   # File upload management
│   │   │   ├── SettingsAPI.ts        # Settings API
│   │   │   ├── SettingsMigrator.ts   # Settings migration
│   │   │   ├── SettingsValidator.ts  # Settings validation
│   │   │   └── TranscriberFactory.ts # Transcriber factory
│   │   ├── audio/                # Audio utilities
│   │   ├── cache/                # Caching layer
│   │   ├── logging/              # Logging infrastructure
│   │   ├── security/             # Security utilities
│   │   └── storage/              # Storage management
│   ├── patterns/                  # Design patterns
│   ├── testing/                   # Testing utilities
│   ├── types/                     # Type definitions
│   │   ├── DeepgramTypes.ts     # Deepgram type definitions
│   │   ├── events.ts             # Event types
│   │   ├── guards.ts             # Type guards
│   │   ├── resources.ts          # Resource types
│   │   └── strategy.ts           # Strategy pattern types
│   ├── ui/                        # User interface
│   │   ├── commands/             # Command implementations
│   │   ├── formatting/           # Format options UI
│   │   ├── modals/              # Modal dialogs
│   │   ├── settings/            # Settings tab UI
│   │   └── statusbar/           # Status bar components
│   └── utils/                     # Utilities
│       ├── error/                # Error handling utilities
│       ├── memory/               # Memory management
│       └── performance/          # Performance monitoring
├── __tests__/                     # Test files
├── esbuild.config.mjs            # Build configuration
├── jest.config.js                # Test configuration
├── manifest.json                 # Plugin metadata
├── package.json                  # Project configuration
└── README.md                     # Documentation
```

## Architecture Highlights

### Clean Architecture Layers

-   **Application Layer**: Orchestrates use cases and coordinates domain logic
-   **Core Layer**: Business logic and transcription services
-   **Domain Layer**: Business entities and domain events
-   **Infrastructure Layer**: External services and API integrations
-   **UI Layer**: User interface components and settings management

### Design Patterns Used

-   **Factory Pattern**: TranscriberFactory for provider instantiation
-   **Adapter Pattern**: API adapters for provider integration
-   **Observer Pattern**: Event-driven architecture with EventManager
-   **Strategy Pattern**: Multiple transcription providers
-   **Repository Pattern**: Storage management abstraction
-   **Dependency Injection**: IoC container for loose coupling
-   **Error Boundary Pattern**: Comprehensive error handling

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Contribution Process

1. **Fork** the repository
2. **Create** feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** changes: `git commit -m 'feat: add amazing feature'`
4. **Push** to branch: `git push origin feature/amazing-feature`
5. **Create** Pull Request

### Code Style Guidelines

-   Follow TypeScript best practices
-   Use ESLint and Prettier configurations
-   Write unit tests for new features
-   Update documentation for API changes

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Credits

### Acknowledgments

-   **Obsidian Team**: Obsidian Plugin API
-   **OpenAI**: Whisper API
-   **Deepgram**: Speech-to-Text API
-   **Community**: Obsidian community feedback and contributions

### Built With

-   TypeScript
-   ESBuild
-   Jest
-   ESLint & Prettier

## Support

### Need Help?

-   🐛 **Bug Reports**: [GitHub Issues](https://github.com/asyouplz/SpeechNote/issues)
-   💡 **Feature Requests**: [GitHub Issues](https://github.com/asyouplz/SpeechNote/issues)
-   💬 **Discussions**: [GitHub Discussions](https://github.com/asyouplz/SpeechNote/discussions)

### Show Your Support

If this project helped you:

-   ⭐ Star on GitHub
-   🐦 Share on social media
-   ☕ [Buy me a coffee](https://buymeacoffee.com/asyouplz)

## Recent Updates

### 🚀 v3.0.4 (Latest) - Settings Stability & Deepgram Cleanup

-   🛠️ **Settings Stability**: Improves plugin settings reliability
-   🧹 **Deepgram Refactor**: Cleanup and refactor for provider integration
-   🧩 **General Fixes**: Minor bug fixes and improvements

### v3.0.1 - Enterprise Architecture & Performance

-   🏗️ **Clean Architecture**: Domain-driven design with clear separation of concerns
-   🎯 **Modular Structure**: Organized into application, core, domain, infrastructure layers
-   ⚡ **Performance Monitoring**: Built-in performance benchmarking and memory management
-   🛡️ **Error Boundaries**: Comprehensive error handling with ErrorBoundary pattern
-   📦 **Dependency Injection**: DependencyContainer for better testability
-   🧪 **Test Coverage**: Unit, integration, and E2E test suites
-   🔄 **Settings Migration**: Automatic settings migration and validation
-   📊 **Batch Processing**: Efficient batch request management

### v3.0.0 - Nova-3 & Speaker Diarization

-   ✨ **Nova-3 Model**: Default model upgrade with 98% accuracy
-   🎭 **Speaker Diarization**: Complete implementation with "Speaker 1:", "Speaker 2:" format
-   💰 **Cost Optimization**: 70% cost reduction with Deepgram Nova-3
-   🔧 **Code Quality**: Improved type safety and code organization

### v1.0.0 - Initial Release

-   🎉 **Multi-Provider Support**: OpenAI Whisper & Deepgram integration
-   🌐 **Multi-language Support**: 40+ languages with auto-detection
-   📝 **Smart Text Insertion**: Flexible insertion options
-   🎯 **Context Menu Integration**: Right-click transcription

---

# 한국어

## 주요 기능

### 🎙️ 다중 공급자 오디오 변환

-   **OpenAI Whisper**: 높은 정확도, 안정적인 성능
-   **Deepgram Nova 3**: 최신 모델, 98% 정확도, 70% 비용 절감
-   **화자 분리**: "Speaker 1:", "Speaker 2:" 형식으로 자동 화자 구분
-   **자동 선택**: 각 파일에 가장 적합한 공급자 자동 선택
-   **지원 형식**: M4A, MP3, WAV, MP4, WebM, OGG, FLAC

### 🌐 다국어 지원

-   **자동 감지**: 자동 언어 인식
-   **40개 이상 언어**: 한국어, 영어, 일본어, 중국어, 스페인어, 프랑스어, 독일어 등
-   **공급자 최적화**: 각 공급자별 언어 최적화

### 📝 스마트 텍스트 삽입 및 화자 인식

-   **커서 위치**: 현재 커서 위치에 삽입
-   **노트 위치**: 노트의 시작 또는 끝에 삽입
-   **자동 노트 생성**: 활성 편집기가 없으면 새 노트 생성
-   **화자 분리**: 자동 화자 식별 및 레이블링
-   **다중 화자 지원**: 회의, 인터뷰, 대화를 명확하게 구분

### ⚡ 성능 및 아키텍처

-   **Nova-3 모델**: 98% 정확도, 분당 $0.0043 (70% 비용 절감)
-   **클린 아키텍처**: 도메인 주도 설계 및 관심사 분리
-   **지능형 공급자 선택**: 파일 크기와 형식에 따른 최적 공급자 선택
-   **실시간 진행 상황**: 취소 지원이 포함된 상태 표시줄 진행 표시기
-   **비동기 처리**: 논블로킹 백그라운드 처리
-   **메모리 관리**: 내장 메모리 모니터링 및 최적화
-   **성능 벤치마킹**: 통합 성능 모니터링 도구
-   **에러 바운더리**: 포괄적인 오류 처리 및 복구
-   **의존성 주입**: 더 나은 테스트 가능성을 위한 IoC 컨테이너
-   **이벤트 기반 아키텍처**: EventManager를 통한 분리된 컴포넌트
-   **배치 처리**: 효율적인 배치 요청 처리
-   **캐싱 레이어**: 성능 향상을 위한 스마트 캐싱
-   **설정 마이그레이션**: 자동 설정 업그레이드 및 검증
-   **폴백 메커니즘**: 실패 시 자동 공급자 전환

## 설치

### 수동 설치

#### 릴리즈에서 설치

1. [Releases](https://github.com/asyouplz/SpeechNote/releases)에서 최신 릴리즈 다운로드
2. vault의 `.obsidian/plugins/obsidian-speech-to-text/` 폴더에 파일 압축 해제
3. Obsidian 재시작
4. 커뮤니티 플러그인 설정에서 "Speech to Text" 활성화

#### 개발 빌드

```bash
# 저장소 복제
git clone https://github.com/asyouplz/SpeechNote.git
cd SpeechNote

# 의존성 설치
npm install

# 빌드
npm run build

# 플러그인 폴더에 복사
cp main.js manifest.json styles.css /path/to/your/vault/.obsidian/plugins/obsidian-speech-to-text/
```

## 초기 설정

### API 키 설정

#### 1. 공급자 선택

1. Obsidian 설정 → "Speech to Text" 열기
2. "Transcription Provider" 선택:
    - **OpenAI Whisper**: 고품질, 안정적
    - **Deepgram**: 빠른 속도, 대용량 파일 지원
    - **Auto**: 자동 선택 (권장)

#### 2. OpenAI API 키 받기 (Whisper용)

1. [OpenAI Platform](https://platform.openai.com/api-keys) 방문
2. 로그인 또는 계정 생성
3. "Create new secret key" 클릭
4. 키 복사 (⚠️ 한 번만 표시됨)

#### 3. Deepgram API 키 받기 (Deepgram용)

1. [Deepgram Console](https://console.deepgram.com/) 방문
2. 회원가입 또는 로그인
3. "API Keys" 메뉴로 이동
4. "Create a New API Key" 클릭
5. API 키 복사

#### 4. 플러그인 설정

1. Obsidian 설정 열기 (Cmd/Ctrl + ,)
2. 왼쪽 메뉴에서 "Speech to Text" 선택
3. API 키 입력:
    - "OpenAI API Key" (Whisper용)
    - "Deepgram API Key" (Deepgram용)
4. 설정 저장

## 사용법

### 기본 사용법

#### 방법 1: 명령 팔레트

1. **명령 팔레트 열기**: `Cmd/Ctrl + P`
2. **검색**: "Transcribe audio file"
3. **파일 선택**: 목록에서 오디오 파일 선택
4. **대기**: 상태 표시줄에서 진행 상황 모니터링
5. **완료**: 텍스트가 자동으로 노트에 삽입됨

#### 방법 2: 컨텍스트 메뉴 ✨

1. **파일 탐색기**: 오디오 파일 찾기
2. **오른쪽 클릭**: 오디오 파일에서 오른쪽 클릭
3. **선택**: "Transcribe audio file"
4. **자동 처리**: 변환 시작 및 결과 삽입

#### 방법 3: 단축키

1. **설정**: 설정 → 단축키 → "Transcribe audio file" 검색
2. **단축키 설정**: 선호하는 키 조합 할당
3. **실행**: 단축키를 사용하여 빠른 액세스

### 🎭 화자 분리 사용하기

#### 화자 분리 활성화

1. **설정 열기**: 설정 → Speech to Text → Deepgram 설정
2. **분리 활성화**: "Speaker Diarization"을 ON으로 전환
3. **Nova-3 선택**: "Nova-3" 모델 선택 (새 설치 시 기본값)
4. **설정 저장**: 구성 적용

#### 결과 예시

```
🎙️ 다중 화자 회의 오디오:

📝 변환 결과:
Speaker 1: 안녕하세요 여러분, 회의를 시작하겠습니다.

Speaker 2: 감사합니다. 프로젝트 일정에 대해 논의하고 싶습니다.

Speaker 1: 좋습니다. 어떤 생각이신가요?

Speaker 3: 마감일을 일주일 연장해야 할 것 같습니다.
```

#### 화자 분리 모범 사례

-   **깨끗한 오디오**: 더 나은 정확도를 위해 고품질 녹음 사용
-   **화자 분리**: 화자들이 동시에 말하지 않도록 보장
-   **최소 길이**: 각 화자 세그먼트는 최소 2-3초여야 함
-   **오디오 형식**: 최적의 결과를 위해 M4A, MP3 또는 WAV 사용

### 지원 오디오 형식

| 형식 | 확장자 | Whisper | Deepgram | 최대 크기 | 화자분리 | 설명                  |
| ---- | ------ | ------- | -------- | --------- | -------- | --------------------- |
| M4A  | .m4a   | ✅      | ✅       | 25MB/2GB  | ✅       | Apple 기본 녹음 형식  |
| MP3  | .mp3   | ✅      | ✅       | 25MB/2GB  | ✅       | 범용 오디오 형식      |
| WAV  | .wav   | ✅      | ✅       | 25MB/2GB  | ✅       | 무손실, 큰 파일 크기  |
| MP4  | .mp4   | ✅      | ✅       | 25MB/2GB  | ✅       | 비디오 파일의 오디오  |
| WebM | .webm  | ❌      | ✅       | -/2GB     | ✅       | 웹 스트리밍 형식      |
| OGG  | .ogg   | ❌      | ✅       | -/2GB     | ✅       | 오픈 소스 오디오 형식 |
| FLAC | .flac  | ❌      | ✅       | -/2GB     | ✅       | 무손실 압축           |

## 설정

### 기본 설정

-   **공급자 선택**:
    -   Auto (자동): 파일에 따라 지능적 선택
    -   OpenAI Whisper: 고품질, 안정적인 성능
    -   Deepgram: 빠른 속도, 화자 분리 지원
-   **언어**: 자동 감지 또는 특정 언어 선택
-   **삽입 위치**:
    -   커서 위치
    -   노트 시작
    -   노트 끝
-   **자동 삽입**: 변환 후 자동 텍스트 삽입

### Deepgram 설정

-   **모델 선택**:
    -   Nova-3 (권장): 98% 정확도, 화자 분리
    -   Nova-2: 이전 세대, 높은 정확도
    -   Nova/Enhanced/Base: 레거시 모델
-   **기능**:
    -   화자 분리: 자동 화자 구분
    -   스마트 포맷: 지능형 텍스트 포맷팅
    -   문장 부호: 자동 구두점
    -   발화: 자연스러운 말 패턴으로 분할
    -   문단: 자동 문단 감지

### 고급 설정

-   **성능**:
    -   배치 처리: 여러 파일을 효율적으로 처리
    -   메모리 제한: 메모리 사용 임계값 구성
    -   캐시 지속 시간: 결과 캐싱 타임아웃
    -   최대 병렬 요청: 동시 API 호출 제어
    -   서킷 브레이커: 자동 장애 보호
-   **네트워크**:
    -   요청 타임아웃: API 요청 타임아웃 설정
    -   재시도 정책: 자동 재시도 구성
    -   폴백 공급자: 실패 시 백업 공급자
    -   상태 체크: 공급자 가용성 모니터링
-   **비용 관리**:
    -   월간 예산: 지출 한도 설정
    -   비용 제한: 요청당 비용 제어
    -   예산 알림: 임계값 도달 시 알림
    -   자동 비용 최적화: 비용 기반 지능형 공급자 선택
-   **품질 제어**:
    -   품질 임계값: 최소 허용 정확도
    -   신뢰도 수준: 최소 변환 신뢰도
    -   엄격한 언어 모드: 언어 일관성 강제
    -   후처리: 추가 텍스트 정제
-   **텍스트 포맷팅**:
    -   일반 텍스트: 표준 텍스트 출력
    -   마크다운: 마크다운 형식 출력
    -   인용구 블록: 인용구로 삽입
    -   글머리 기호: 목록 항목으로 포맷
    -   제목: 제목으로 삽입
    -   코드 블록: 코드로 포맷
    -   콜아웃: Obsidian 콜아웃 사용
-   **A/B 테스팅**:
    -   공급자 비교: 여러 공급자 테스트
    -   트래픽 분할: 백분율 기반 라우팅
    -   메트릭 추적: 정확도, 속도, 비용 비교
    -   기간 제어: 테스트 기간 설정
-   **대용량 파일 처리**:
    -   자동 청킹: 파일 자동 분할
    -   청크 크기: 청크 크기 구성 (MB)
    -   오버랩: 연속성을 위한 청크 오버랩 설정
-   **개발**:
    -   디버그 모드: 상세 로깅
    -   성능 모니터링: 성능 메트릭 추적
    -   오류 보고: 향상된 오류 세부 정보
    -   메트릭 보존: 데이터 보존 기간 구성

## 문제 해결

### 일반적인 문제

#### "Invalid API Key" 오류

**해결 방법:**

1. API 키 형식 확인 (OpenAI: `sk-`로 시작)
2. 공급자 대시보드에서 API 키 상태 확인
3. 충분한 크레딧/활성 구독 확인
4. 키에서 공백 제거

#### "File too large" 오류

**해결 방법:**

1. 파일 크기 제한 확인 (Whisper: 25MB, Deepgram: 2GB)
2. 큰 파일은 Deepgram 사용
3. 필요시 오디오 파일 압축

#### 화자 분리가 작동하지 않음

**해결 방법:**

1. Nova-3 모델이 선택되었는지 확인 (화자 분리에 필요)
2. Deepgram 설정에서 "Speaker Diarization"이 활성화되었는지 확인
3. 오디오 품질 확인 (명확한 화자, 최소 중첩)
4. 지원되는 오디오 형식 사용 (M4A, MP3, WAV 권장)
5. 최소 화자 길이 확인 (세그먼트당 2-3초)

#### 오디오 파일을 찾을 수 없음

**해결 방법:**

1. 지원 형식 확인: .m4a, .mp3, .wav, .mp4 등
2. 파일이 vault 폴더에 있는지 확인
3. Obsidian 재시작
4. 파일 인덱싱 대기 (큰 vault의 경우)

#### 네트워크 오류

**해결 방법:**

1. 인터넷 연결 확인
2. VPN/프록시 설정 확인
3. 공급자 API 상태 확인

## 명령어

| 명령어                    | 설명                     | 상태         |
| ------------------------- | ------------------------ | ------------ |
| **Transcribe audio file** | 오디오 파일 선택 및 변환 | ✅ 사용 가능 |
| **Cancel transcription**  | 진행 중인 변환 취소      | ✅ 사용 가능 |

## 개발

### 필수 요구 사항

-   Node.js 16.0.0+
-   npm 7.0.0+
-   Obsidian 0.15.0+
-   TypeScript 4.7.4+

### 개발 환경 설정

```bash
# 저장소 복제
git clone https://github.com/asyouplz/SpeechNote.git
cd SpeechNote

# 의존성 설치
npm install

# 개발 모드 (변경 감지)
npm run dev

# 프로덕션 빌드
npm run build

# 코드 품질 검사
npm run lint          # Lint 검사
npm run lint:fix      # Lint 문제 자동 수정
npm run format        # 코드 포맷팅
npm run format:check  # 포맷팅 확인
npm run typecheck     # 타입 체킹

# 테스트
npm test              # 모든 테스트 실행
npm run test:unit     # 단위 테스트만
npm run test:integration  # 통합 테스트
npm run test:e2e      # End-to-end 테스트
npm run test:coverage # 커버리지 보고서 생성
npm run test:watch    # TDD를 위한 감시 모드

# 빌드 정리
npm run clean         # 빌드 아티팩트 정리
npm run clean:all     # node_modules 포함 모두 정리

# 전체 검증
npm run validate      # Lint + 타입 체크 + 테스트
npm run ci           # 전체 CI 파이프라인
```

### 프로젝트 구조

```
SpeechNote/
├── src/
│   ├── main.ts                     # 플러그인 진입점
│   ├── application/                # 애플리케이션 서비스
│   │   ├── EditorService.ts       # 에디터 관리
│   │   ├── EventManager.ts        # 이벤트 처리
│   │   ├── StateManager.ts        # 상태 관리
│   │   └── TextInsertionHandler.ts # 텍스트 삽입 로직
│   ├── architecture/               # 아키텍처 컴포넌트
│   │   ├── DependencyContainer.ts # 의존성 주입
│   │   ├── ErrorBoundary.ts       # 오류 처리 경계
│   │   └── PluginLifecycleManager.ts # 플러그인 생명주기
│   ├── core/                       # 핵심 비즈니스 로직
│   │   ├── LazyLoader.ts          # 지연 로딩 유틸리티
│   │   └── transcription/         # 변환 서비스
│   │       ├── AudioProcessor.ts  # 오디오 처리
│   │       ├── TextFormatter.ts   # 텍스트 포맷팅
│   │       └── TranscriptionService.ts # 메인 변환 서비스
│   ├── domain/                     # 도메인 모델
│   │   ├── events/                # 도메인 이벤트
│   │   └── models/                # 도메인 엔티티
│   ├── infrastructure/            # 외부 통합
│   │   ├── api/                   # API 클라이언트
│   │   │   ├── providers/         # 공급자 구현
│   │   │   │   ├── deepgram/     # Deepgram 통합
│   │   │   │   ├── whisper/      # OpenAI Whisper 통합
│   │   │   │   └── factory/      # 공급자 팩토리
│   │   │   ├── adapters/         # 인터페이스 어댑터
│   │   │   ├── BatchRequestManager.ts # 배치 요청 처리
│   │   │   ├── FileUploadManager.ts   # 파일 업로드 관리
│   │   │   ├── SettingsAPI.ts        # 설정 API
│   │   │   ├── SettingsMigrator.ts   # 설정 마이그레이션
│   │   │   ├── SettingsValidator.ts  # 설정 검증
│   │   │   └── TranscriberFactory.ts # 변환기 팩토리
│   │   ├── audio/                # 오디오 유틸리티
│   │   ├── cache/                # 캐싱 레이어
│   │   ├── logging/              # 로깅 인프라
│   │   ├── security/             # 보안 유틸리티
│   │   └── storage/              # 스토리지 관리
│   ├── patterns/                  # 디자인 패턴
│   ├── testing/                   # 테스트 유틸리티
│   ├── types/                     # 타입 정의
│   │   ├── DeepgramTypes.ts     # Deepgram 타입 정의
│   │   ├── events.ts             # 이벤트 타입
│   │   ├── guards.ts             # 타입 가드
│   │   ├── resources.ts          # 리소스 타입
│   │   └── strategy.ts           # 전략 패턴 타입
│   ├── ui/                        # 사용자 인터페이스
│   │   ├── commands/             # 명령 구현
│   │   ├── formatting/           # 포맷 옵션 UI
│   │   ├── modals/              # 모달 대화상자
│   │   ├── settings/            # 설정 탭 UI
│   │   └── statusbar/           # 상태 표시줄 컴포넌트
│   └── utils/                     # 유틸리티
│       ├── error/                # 오류 처리 유틸리티
│       ├── memory/               # 메모리 관리
│       └── performance/          # 성능 모니터링
├── __tests__/                     # 테스트 파일
├── esbuild.config.mjs            # 빌드 구성
├── jest.config.js                # 테스트 구성
├── manifest.json                 # 플러그인 메타데이터
├── package.json                  # 프로젝트 구성
└── README.md                     # 문서
```

## 아키텍처 하이라이트

### 클린 아키텍처 레이어

-   **애플리케이션 레이어**: 유스케이스 조정 및 도메인 로직 코디네이션
-   **코어 레이어**: 비즈니스 로직 및 변환 서비스
-   **도메인 레이어**: 비즈니스 엔티티 및 도메인 이벤트
-   **인프라 레이어**: 외부 서비스 및 API 통합
-   **UI 레이어**: 사용자 인터페이스 컴포넌트 및 설정 관리

### 사용된 디자인 패턴

-   **팩토리 패턴**: 공급자 인스턴스화를 위한 TranscriberFactory
-   **어댑터 패턴**: 공급자 통합을 위한 API 어댑터
-   **옵저버 패턴**: EventManager를 통한 이벤트 기반 아키텍처
-   **전략 패턴**: 다중 변환 공급자
-   **리포지토리 패턴**: 스토리지 관리 추상화
-   **의존성 주입**: 느슨한 결합을 위한 IoC 컨테이너
-   **에러 바운더리 패턴**: 포괄적인 오류 처리

## 기여

기여를 환영합니다! 가이드라인은 [CONTRIBUTING.md](CONTRIBUTING.md)를 참조하세요.

### 기여 과정

1. **Fork** 저장소
2. **생성** 기능 브랜치: `git checkout -b feature/amazing-feature`
3. **커밋** 변경사항: `git commit -m 'feat: add amazing feature'`
4. **푸시** 브랜치로: `git push origin feature/amazing-feature`
5. **생성** 풀 리퀘스트

### 코드 스타일 가이드라인

-   TypeScript 모범 사례 준수
-   ESLint 및 Prettier 구성 사용
-   새 기능에 대한 단위 테스트 작성
-   API 변경 사항에 대한 문서 업데이트

## 라이선스

이 프로젝트는 MIT 라이선스에 따라 라이선스가 부여됩니다 - 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 크레딧

### 감사의 말

-   **Obsidian Team**: Obsidian 플러그인 API
-   **OpenAI**: Whisper API
-   **Deepgram**: 음성-텍스트 API
-   **Community**: Obsidian 커뮤니티 피드백 및 기여

### 사용 기술

-   TypeScript
-   ESBuild
-   Jest
-   ESLint & Prettier

## 지원

### 도움이 필요하신가요?

-   🐛 **버그 신고**: [GitHub Issues](https://github.com/asyouplz/SpeechNote/issues)
-   💡 **기능 요청**: [GitHub Issues](https://github.com/asyouplz/SpeechNote/issues)
-   💬 **토론**: [GitHub Discussions](https://github.com/asyouplz/SpeechNote/discussions)

### 지원 보여주기

이 프로젝트가 도움이 되었다면:

-   ⭐ GitHub에 별 주기
-   🐦 소셜 미디어에 공유
-   ☕ [커피 사주기](https://buymeacoffee.com/asyouplz)

## 최근 업데이트

### 🚀 v3.0.4 (최신) - 설정 안정화 및 Deepgram 정리

-   🛠️ **설정 안정화**: 플러그인 설정 신뢰성 개선
-   🧹 **Deepgram 리팩터링**: 공급자 통합 구조 정리
-   🧩 **기타 수정**: 소소한 버그 수정 및 개선

### v3.0.1 - 엔터프라이즈 아키텍처 및 성능

-   🏗️ **클린 아키텍처**: 관심사 분리를 갖춘 도메인 주도 설계
-   🎯 **모듈식 구조**: application, core, domain, infrastructure 레이어로 구성
-   ⚡ **성능 모니터링**: 내장 성능 벤치마킹 및 메모리 관리
-   🛡️ **에러 바운더리**: ErrorBoundary 패턴을 활용한 포괄적인 오류 처리
-   📦 **의존성 주입**: 더 나은 테스트 가능성을 위한 DependencyContainer
-   🧪 **테스트 커버리지**: 단위, 통합, E2E 테스트 스위트
-   🔄 **설정 마이그레이션**: 자동 설정 마이그레이션 및 검증
-   📊 **배치 처리**: 효율적인 배치 요청 관리

### v3.0.0 - Nova-3 및 화자 분리

-   ✨ **Nova-3 모델**: 98% 정확도로 기본 모델 업그레이드
-   🎭 **화자 분리**: "Speaker 1:", "Speaker 2:" 형식의 완전한 구현
-   💰 **비용 최적화**: Deepgram Nova-3로 70% 비용 절감
-   🔧 **코드 품질**: 향상된 타입 안전성 및 코드 구성

### v1.0.0 - 초기 릴리즈

-   🎉 **다중 공급자 지원**: OpenAI Whisper 및 Deepgram 통합
-   🌐 **다국어 지원**: 자동 감지 기능이 있는 40개 이상 언어
-   📝 **스마트 텍스트 삽입**: 유연한 삽입 옵션
-   🎯 **컨텍스트 메뉴 통합**: 오른쪽 클릭 변환

---

<div align="center">

**Made with ❤️ for the Obsidian community**

[⬆ Back to top](#obsidian-speech-to-text-plugin)

</div>
