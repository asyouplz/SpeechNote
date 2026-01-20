# Contributing to Speech-to-Text Plugin

First off, thank you for considering contributing to the Obsidian Speech-to-Text Plugin! It's people like you that make this plugin better for everyone.

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

-   **Use a clear and descriptive title**
-   **Describe the exact steps to reproduce the problem**
-   **Provide specific examples** (audio file format, size, etc.)
-   **Describe the behavior you observed and what you expected**
-   **Include screenshots or error messages** if applicable
-   **Specify your environment:**
    -   Obsidian version
    -   Operating system and version
    -   Plugin version
    -   Provider (OpenAI Whisper/Deepgram)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

-   **Use a clear and descriptive title**
-   **Provide a detailed description of the suggested enhancement**
-   **Explain why this enhancement would be useful**
-   **List some examples of how it would be used**

### Pull Requests

1. **Fork the repo** and create your branch from `main`
2. **Install dependencies**: `npm install`
3. **Make your changes** following our coding standards
4. **Add tests** if applicable
5. **Update documentation** if you changed functionality
6. **Run tests**: `npm test`
7. **Run linter**: `npm run lint`
8. **Ensure type safety**: `npm run typecheck`
9. **Commit with conventional commit format**:
    - `feat:` for new features
    - `fix:` for bug fixes
    - `docs:` for documentation
    - `refactor:` for code refactoring
    - `test:` for tests
    - `chore:` for maintenance

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/SpeechNote.git
cd SpeechNote

# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test

# Run linter
npm run lint

# Type checking
npm run typecheck
```

## Project Structure

```
src/
├── application/      # Application services
├── architecture/     # DI container, error boundaries
├── core/            # Business logic
├── domain/          # Domain models and events
├── infrastructure/  # External integrations (API clients)
├── ui/              # User interface components
└── utils/           # Utility functions
```

## Coding Standards

### TypeScript

-   Use TypeScript strict mode
-   Prefer interfaces over types for object shapes
-   Use explicit return types for public methods
-   Document complex logic with comments

### Code Style

-   Follow the existing code style
-   Use ESLint and Prettier (configured in the project)
-   Keep functions small and focused
-   Use meaningful variable and function names

### Architecture

-   Follow Clean Architecture principles
-   Maintain separation of concerns
-   Use dependency injection where appropriate
-   Keep business logic in the core layer

### Testing

-   Write unit tests for business logic
-   Write integration tests for API interactions
-   Maintain test coverage above 70%
-   Use descriptive test names

## API Keys for Testing

For development and testing:

1. **OpenAI Whisper**: Get a key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. **Deepgram**: Get a key from [Deepgram Console](https://console.deepgram.com/)

**Never commit API keys to the repository!**

## Commit Message Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

-   `feat`: New feature
-   `fix`: Bug fix
-   `docs`: Documentation changes
-   `style`: Code style changes (formatting)
-   `refactor`: Code refactoring
-   `test`: Adding or updating tests
-   `chore`: Maintenance tasks

### Examples

```
feat(deepgram): add Nova-3 model support

Implement support for Deepgram's Nova-3 model with improved
accuracy and speaker diarization capabilities.

Closes #123
```

```
fix(whisper): handle timeout errors gracefully

Add retry logic and better error messages for Whisper API
timeout issues with large files.

Fixes #456
```

## Review Process

1. **Automated checks** must pass (tests, linting, type checking)
2. **Code review** by at least one maintainer
3. **Testing** by reviewers when applicable
4. **Documentation** must be updated if needed

## Release Process

Releases are managed by maintainers:

1. Version bump in `package.json` and `manifest.json`
2. Update `CHANGELOG.md`
3. Create a GitHub release with release notes
4. Publish to Obsidian Community Plugins (maintainers only)

## Questions?

Feel free to:

-   Open a [Discussion](https://github.com/asyouplz/SpeechNote/discussions) for questions
-   Join our community discussions
-   Reach out to maintainers

## Recognition

Contributors are recognized in:

-   Release notes
-   Credits section of README
-   GitHub contributors page

Thank you for contributing! 🎉
