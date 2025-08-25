# 기여 가이드라인 (Contributing Guidelines)

## 목차
1. [환영합니다!](#환영합니다)
2. [행동 규범](#행동-규범)
3. [기여 방법](#기여-방법)
4. [개발 환경 설정](#개발-환경-설정)
5. [코드 스타일 가이드](#코드-스타일-가이드)
6. [커밋 메시지 컨벤션](#커밋-메시지-컨벤션)
7. [Pull Request 프로세스](#pull-request-프로세스)
8. [이슈 작성 가이드](#이슈-작성-가이드)
9. [테스트 가이드라인](#테스트-가이드라인)
10. [문서화 가이드](#문서화-가이드)

---

## 환영합니다!

Obsidian Speech-to-Text 플러그인에 기여해주셔서 감사합니다! 모든 형태의 기여를 환영합니다:

- 🐛 버그 리포트
- ✨ 새로운 기능 제안
- 📝 문서 개선
- 🌍 번역
- 💻 코드 기여
- 🎨 UI/UX 개선
- 💡 아이디어 공유

---

## 행동 규범

### 우리의 약속
- **존중**: 모든 기여자를 존중하고 포용적인 환경 조성
- **건설적 비판**: 개인이 아닌 아이디어와 코드에 집중
- **협력**: 서로 돕고 지식 공유
- **투명성**: 의사결정 과정과 진행 상황 공개

### 용납되지 않는 행동
- 괴롭힘, 차별, 모욕적 언어
- 개인 정보 무단 공개
- 트롤링, 스팸
- 기타 비전문적 행위

---

## 기여 방법

### 1. 첫 기여자를 위한 가이드

#### Step 1: Fork 저장소
```bash
# GitHub에서 Fork 버튼 클릭
# 또는 GitHub CLI 사용
gh repo fork yourusername/obsidian-speech-to-text
```

#### Step 2: 로컬 환경 설정
```bash
# 저장소 클론
git clone https://github.com/YOUR_USERNAME/obsidian-speech-to-text.git
cd obsidian-speech-to-text

# Upstream 저장소 추가
git remote add upstream https://github.com/ORIGINAL_OWNER/obsidian-speech-to-text.git

# 의존성 설치
npm install
```

#### Step 3: 브랜치 생성
```bash
# 최신 변경사항 가져오기
git fetch upstream
git checkout main
git merge upstream/main

# 기능 브랜치 생성
git checkout -b feature/your-feature-name
```

### 2. 기여 유형별 가이드

#### 🐛 버그 수정
1. 이슈 확인 또는 생성
2. 버그 재현 테스트 작성
3. 수정 구현
4. 테스트 통과 확인
5. PR 제출

#### ✨ 새 기능 추가
1. 기능 제안 이슈 생성
2. 논의 및 승인 대기
3. 설계 문서 작성 (큰 기능의 경우)
4. 구현 및 테스트
5. 문서 업데이트
6. PR 제출

#### 📝 문서 개선
1. 오타, 문법 수정
2. 예제 추가
3. 설명 개선
4. 번역 추가

---

## 개발 환경 설정

### 필수 도구
```bash
# Node.js 버전 확인
node --version  # v16.0.0 이상

# npm 버전 확인
npm --version   # v7.0.0 이상

# Git 설정
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### 개발 명령어
```bash
# 개발 서버 실행
npm run dev

# 빌드
npm run build

# 테스트
npm test

# 린트
npm run lint

# 포맷팅
npm run format
```

### VS Code 설정
`.vscode/settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

---

## 코드 스타일 가이드

### TypeScript 스타일

#### 네이밍 컨벤션
```typescript
// 클래스: PascalCase
class AudioProcessor { }

// 인터페이스: PascalCase
interface TranscriptionOptions { }

// 함수/변수: camelCase
const processAudio = async () => { };
let isProcessing = false;

// 상수: UPPER_SNAKE_CASE
const MAX_FILE_SIZE = 25 * 1024 * 1024;

// 타입: PascalCase
type AudioFormat = 'mp3' | 'm4a' | 'wav';

// 열거형: PascalCase
enum Status {
  IDLE = 'idle',
  PROCESSING = 'processing'
}
```

#### 함수 작성
```typescript
/**
 * 오디오 파일을 텍스트로 변환합니다.
 * @param file - 변환할 오디오 파일
 * @param options - 변환 옵션
 * @returns 변환된 텍스트
 */
async function transcribeAudio(
  file: TFile,
  options?: TranscriptionOptions
): Promise<string> {
  // 구현
}
```

#### 클래스 구조
```typescript
export class ServiceName {
  // 1. Static 속성
  static readonly VERSION = '1.0.0';
  
  // 2. Private 필드
  private config: Config;
  
  // 3. Public 필드
  public status: Status;
  
  // 4. 생성자
  constructor(config: Config) {
    this.config = config;
  }
  
  // 5. Public 메서드
  public async process(): Promise<void> {
    // 구현
  }
  
  // 6. Private 메서드
  private validate(): boolean {
    // 구현
  }
  
  // 7. Static 메서드
  static create(options: Options): ServiceName {
    // 구현
  }
}
```

### 파일 구조
```typescript
// 1. 임포트
import { external } from 'external-lib';
import { internal } from '../internal';
import type { Types } from '../types';

// 2. 타입 정의
interface LocalInterface { }
type LocalType = string;

// 3. 구현
export class Implementation { }

// 4. 익스포트
export { Implementation };
export type { LocalInterface };
```

---

## 커밋 메시지 컨벤션

### 형식
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type
| Type | 설명 | 예시 |
|------|------|------|
| `feat` | 새로운 기능 | `feat(api): add batch processing support` |
| `fix` | 버그 수정 | `fix(audio): resolve m4a format error` |
| `docs` | 문서 변경 | `docs(readme): update installation guide` |
| `style` | 코드 스타일 변경 | `style: apply prettier formatting` |
| `refactor` | 리팩토링 | `refactor(core): simplify audio processing` |
| `test` | 테스트 추가/수정 | `test(api): add whisper service tests` |
| `chore` | 빌드, 설정 변경 | `chore(deps): update dependencies` |
| `perf` | 성능 개선 | `perf(cache): optimize cache lookup` |

### 예시
```bash
# 기능 추가
git commit -m "feat(transcription): add real-time progress tracking

- Add progress event emitter
- Update UI to show percentage
- Add cancel functionality

Closes #123"

# 버그 수정
git commit -m "fix(api): handle rate limit errors gracefully

- Implement exponential backoff
- Add retry mechanism
- Show user-friendly error messages

Fixes #456"
```

### 커밋 메시지 규칙
1. **제목**: 50자 이내, 명령형 현재 시제
2. **본문**: 72자에서 줄바꿈, What과 Why 설명
3. **Footer**: 이슈 참조, Breaking Changes

---

## Pull Request 프로세스

### 1. PR 체크리스트
```markdown
## PR 체크리스트
- [ ] 코드가 프로젝트 스타일 가이드를 따름
- [ ] 셀프 리뷰 완료
- [ ] 코드에 주석 추가 (특히 복잡한 부분)
- [ ] 문서 변경사항 반영
- [ ] 테스트 추가/수정
- [ ] 모든 테스트 통과
- [ ] 관련 이슈 링크
```

### 2. PR 템플릿
```markdown
## 설명
이 PR이 해결하는 문제나 추가하는 기능을 설명해주세요.

## 변경 사항
- 주요 변경 1
- 주요 변경 2
- 주요 변경 3

## 테스트
어떻게 테스트했는지 설명해주세요.

## 스크린샷 (해당되는 경우)
UI 변경사항이 있다면 스크린샷을 추가해주세요.

## 관련 이슈
Closes #(이슈 번호)
```

### 3. PR 제출 과정
```bash
# 1. 변경사항 커밋
git add .
git commit -m "feat: your feature"

# 2. 최신 변경사항 반영
git fetch upstream
git rebase upstream/main

# 3. 푸시
git push origin feature/your-feature

# 4. GitHub에서 PR 생성
```

### 4. 코드 리뷰 대응
- 리뷰 코멘트에 신속히 응답
- 건설적인 피드백 수용
- 필요시 추가 커밋으로 수정
- 리뷰어에게 감사 표현

---

## 이슈 작성 가이드

### 버그 리포트 템플릿
```markdown
## 버그 설명
버그가 무엇인지 명확하고 간결하게 설명해주세요.

## 재현 방법
1. '...'로 이동
2. '...' 클릭
3. '...' 까지 스크롤
4. 에러 확인

## 예상 동작
예상했던 동작을 설명해주세요.

## 스크린샷
가능하다면 스크린샷을 추가해주세요.

## 환경
- OS: [예: macOS 13.0]
- Obsidian 버전: [예: 1.4.0]
- 플러그인 버전: [예: 1.0.0]

## 추가 정보
문제 해결에 도움이 될 추가 정보를 제공해주세요.
```

### 기능 요청 템플릿
```markdown
## 기능 설명
제안하는 기능을 명확하게 설명해주세요.

## 문제점
이 기능이 해결하는 문제는 무엇인가요?

## 제안하는 해결책
어떻게 해결하고 싶은지 설명해주세요.

## 대안
고려한 다른 대안이 있다면 설명해주세요.

## 추가 정보
스크린샷, 목업, 참고 자료 등을 추가해주세요.
```

---

## 테스트 가이드라인

### 테스트 작성
```typescript
describe('TranscriptionService', () => {
  let service: TranscriptionService;
  
  beforeEach(() => {
    service = new TranscriptionService();
  });
  
  describe('transcribe', () => {
    it('should transcribe audio file successfully', async () => {
      // Arrange
      const mockFile = createMockAudioFile();
      
      // Act
      const result = await service.transcribe(mockFile);
      
      // Assert
      expect(result).toBeDefined();
      expect(result.text).toContain('expected text');
    });
    
    it('should handle errors gracefully', async () => {
      // Arrange
      const invalidFile = createInvalidFile();
      
      // Act & Assert
      await expect(service.transcribe(invalidFile))
        .rejects
        .toThrow('Invalid file format');
    });
  });
});
```

### 테스트 커버리지
- 목표: 80% 이상
- 중요 비즈니스 로직: 100%
- 유틸리티 함수: 90% 이상

### 테스트 실행
```bash
# 모든 테스트 실행
npm test

# 특정 파일 테스트
npm test -- AudioProcessor.test.ts

# 커버리지 확인
npm run test:coverage

# Watch 모드
npm run test:watch
```

---

## 문서화 가이드

### 코드 문서화
```typescript
/**
 * 오디오 파일을 처리하고 검증합니다.
 * 
 * @class AudioProcessor
 * @implements {IAudioProcessor}
 * 
 * @example
 * ```typescript
 * const processor = new AudioProcessor();
 * const isValid = await processor.validate(file);
 * ```
 */
export class AudioProcessor implements IAudioProcessor {
  /**
   * 파일 형식을 검증합니다.
   * 
   * @param {TFile} file - 검증할 파일
   * @returns {Promise<boolean>} 유효성 여부
   * @throws {ValidationError} 파일이 없거나 접근 불가능한 경우
   */
  async validate(file: TFile): Promise<boolean> {
    // 구현
  }
}
```

### README 업데이트
- 새 기능 추가 시 사용법 섹션 업데이트
- API 변경 시 관련 예제 수정
- 설정 옵션 추가 시 설정 테이블 업데이트

### 변경 로그
```markdown
## [1.1.0] - 2025-01-15
### Added
- 배치 처리 기능 추가
- 진행률 표시 기능

### Changed
- API 응답 처리 개선
- 에러 메시지 개선

### Fixed
- 대용량 파일 처리 버그 수정
```

---

## 릴리스 프로세스

### 버전 관리
- Semantic Versioning (SemVer) 사용
- MAJOR.MINOR.PATCH (예: 1.2.3)

### 릴리스 체크리스트
- [ ] 모든 테스트 통과
- [ ] 문서 업데이트
- [ ] CHANGELOG.md 업데이트
- [ ] 버전 번호 업데이트
- [ ] 태그 생성
- [ ] 릴리스 노트 작성

---

## 도움 받기

### 리소스
- 📚 [프로젝트 문서](docs/)
- 💬 [GitHub Discussions](https://github.com/yourusername/obsidian-speech-to-text/discussions)
- 🐛 [Issue Tracker](https://github.com/yourusername/obsidian-speech-to-text/issues)
- 📧 이메일: support@example.com

### 자주 묻는 질문

#### Q: 첫 기여를 어디서부터 시작해야 하나요?
A: "good first issue" 라벨이 붙은 이슈를 확인해보세요.

#### Q: 코드 리뷰는 얼마나 걸리나요?
A: 보통 2-3일 이내에 첫 리뷰를 받을 수 있습니다.

#### Q: 기능 제안은 어떻게 하나요?
A: GitHub Issues에 Feature Request 템플릿을 사용해 제안해주세요.

---

## 감사의 말

모든 기여자분들께 감사드립니다! 여러분의 기여가 이 프로젝트를 더 나은 방향으로 이끌어갑니다.

### 기여자 인정
- 모든 기여자는 README.md에 기록됩니다
- 중요한 기여는 릴리스 노트에 언급됩니다
- 지속적인 기여자는 Collaborator 권한을 받을 수 있습니다

---

## 라이선스

이 프로젝트에 기여함으로써, 여러분의 기여가 MIT 라이선스 하에 배포되는 것에 동의하는 것으로 간주됩니다.

---

*최종 업데이트: 2025-08-22*
*버전: 1.0.0*

**행복한 코딩! 🎉**