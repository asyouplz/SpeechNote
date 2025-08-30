# Changelog

All notable changes to the Speech to Text plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-08-30

### 🎉 Initial Release

#### Added
- **Multi-Provider Transcription Support**
  - OpenAI Whisper API integration
  - Deepgram Nova 2 API integration
  - Automatic provider selection based on file size and format
  - Fallback mechanism for provider failures

- **Multi-language Support**
  - 40+ language support with auto-detection
  - Manual language selection option
  - Provider-optimized language processing

- **Smart Text Insertion**
  - Insert at cursor position
  - Insert at beginning/end of note
  - Auto note creation when no active editor
  - Automatic text insertion after transcription

- **Audio Format Support**
  - M4A, MP3, WAV, MP4 (both providers)
  - WebM, OGG, FLAC (Deepgram only)
  - File size limits: 25MB (Whisper), 2GB (Deepgram)
  - Audio format auto-detection and validation

- **User Interface Features**
  - Command palette integration
  - Context menu for audio files (right-click transcription)
  - Real-time progress indication in status bar
  - Comprehensive settings panel with tabbed interface

- **Advanced Features**
  - Deepgram-specific settings (punctuation, smart format, etc.)
  - Caching system for improved performance
  - Network retry and timeout handling
  - Debug logging and error reporting

- **Performance Optimizations**
  - Asynchronous processing
  - Non-blocking UI operations
  - Cancellation support for ongoing transcriptions
  - Intelligent provider routing

#### Technical Implementation
- **Architecture**
  - Clean Architecture with separated layers
  - Dependency injection pattern
  - Event-driven system for status updates
  - Adapter pattern for provider abstraction

- **Quality Assurance**
  - TypeScript strict mode compliance
  - Comprehensive error handling
  - Input validation and sanitization
  - Robust API key management

- **Development Experience**
  - ESBuild-based build system
  - Development mode with hot reload
  - Comprehensive logging system
  - Structured project organization

### Known Limitations
- Community plugin store submission pending
- Local Whisper model not yet supported
- Real-time streaming transcription not available

### Compatibility
- **Obsidian**: 0.15.0 or higher
- **Node.js**: 16.0.0 or higher (for development)
- **Platforms**: Windows, macOS, Linux

---

## Future Releases

### Planned for v1.1.0
- [ ] Community plugin store availability
- [ ] Real-time streaming transcription (Deepgram)
- [ ] Batch processing for multiple files
- [ ] Enhanced audio preprocessing

### Planned for v1.2.0
- [ ] Google Speech-to-Text integration
- [ ] Azure Speech Services integration
- [ ] Local Whisper model support
- [ ] Advanced audio editing features

### Long-term Roadmap (v2.0.0+)
- [ ] AI-powered transcription summaries
- [ ] Speaker diarization
- [ ] Custom model training support
- [ ] Enterprise features

---

For detailed technical documentation and development guides, see the project's documentation.