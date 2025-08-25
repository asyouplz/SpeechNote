# 개발 환경 설정 가이드

## 목차
1. [사전 요구사항](#사전-요구사항)
2. [프로젝트 설정](#프로젝트-설정)
3. [개발 환경 구성](#개발-환경-구성)
4. [빌드 및 실행](#빌드-및-실행)
5. [테스트 환경](#테스트-환경)
6. [문제 해결](#문제-해결)

## 사전 요구사항

### 필수 소프트웨어
- **Node.js**: v16.0.0 이상 (권장: v18.x LTS)
- **npm**: v7.0.0 이상 (Node.js와 함께 설치됨)
- **Git**: 최신 버전
- **Obsidian**: v0.15.0 이상

### 권장 개발 도구
- **VS Code**: 최신 버전
- **VS Code 확장 프로그램**:
  - ESLint
  - Prettier
  - TypeScript and JavaScript Language Features
  - Path Intellisense
  - GitLens

### OpenAI API 키
- [OpenAI Platform](https://platform.openai.com/)에서 API 키 발급
- Whisper API 사용 권한 확인

## 프로젝트 설정

### 1. 저장소 클론
```bash
# HTTPS
git clone https://github.com/yourusername/obsidian-speech-to-text.git

# SSH
git clone git@github.com:yourusername/obsidian-speech-to-text.git

# 프로젝트 디렉토리로 이동
cd obsidian-speech-to-text
```

### 2. 의존성 설치
```bash
# npm 사용
npm install

# 또는 yarn 사용 (선택사항)
yarn install

# 또는 pnpm 사용 (선택사항)
pnpm install
```

### 3. 환경 변수 설정 (선택사항)
개발 중 API 키를 환경 변수로 관리하려면:

```bash
# .env 파일 생성
touch .env

# .env 파일에 다음 내용 추가
OPENAI_API_KEY=your_api_key_here
```

⚠️ **주의**: `.env` 파일은 `.gitignore`에 포함되어 있어 Git에 커밋되지 않습니다.

## 개발 환경 구성

### VS Code 설정
프로젝트를 VS Code에서 열면 자동으로 권장 설정이 적용됩니다.

```bash
# VS Code에서 프로젝트 열기
code .
```

### 권장 확장 프로그램 설치
VS Code에서 권장 확장 프로그램 설치 프롬프트가 표시되면 "Install All"을 클릭하거나:

```bash
# 명령 팔레트 열기 (Cmd+Shift+P 또는 Ctrl+Shift+P)
# "Extensions: Show Recommended Extensions" 입력
# 모든 권장 확장 프로그램 설치
```

### TypeScript 설정 확인
```bash
# TypeScript 컴파일 확인
npm run typecheck

# 성공 메시지가 표시되면 정상
```

## 빌드 및 실행

### 개발 모드
실시간 파일 변경 감지 및 자동 빌드:

```bash
# 개발 모드 실행 (watch mode)
npm run dev

# 터미널에 다음과 같은 메시지 표시:
# 👀 Watching for changes...
# ✅ Build succeeded at [시간]
```

### 프로덕션 빌드
최적화된 프로덕션 빌드 생성:

```bash
# 프로덕션 빌드
npm run build

# 빌드 성공 시:
# 🚀 Production build complete
```

### 빌드 결과물
- `main.js`: 번들링된 플러그인 파일
- `styles.css`: 플러그인 스타일시트
- `manifest.json`: 플러그인 메타데이터

## 옵시디언에서 테스트

### 1. 테스트 Vault 생성
```bash
# 테스트용 Obsidian vault 생성
mkdir test-vault
```

### 2. 플러그인 설치
```bash
# 플러그인 파일을 테스트 vault의 플러그인 폴더로 복사
mkdir -p test-vault/.obsidian/plugins/speech-to-text
cp main.js manifest.json styles.css test-vault/.obsidian/plugins/speech-to-text/
```

### 3. 옵시디언에서 플러그인 활성화
1. Obsidian 실행
2. 테스트 vault 열기
3. Settings → Community plugins → Turn on community plugins
4. Installed plugins에서 "Speech to Text" 활성화

### 4. 개발 중 자동 리로드
개발 중 변경사항을 자동으로 반영하려면:

```bash
# 심볼릭 링크 생성 (추천)
ln -s $(pwd)/main.js test-vault/.obsidian/plugins/speech-to-text/main.js
ln -s $(pwd)/styles.css test-vault/.obsidian/plugins/speech-to-text/styles.css
ln -s $(pwd)/manifest.json test-vault/.obsidian/plugins/speech-to-text/manifest.json

# 개발 모드 실행
npm run dev
```

변경사항 적용 후 Obsidian에서:
- `Ctrl+R` (Windows/Linux) 또는 `Cmd+R` (macOS)로 리로드

## 코드 품질 관리

### 린팅
```bash
# ESLint 실행
npm run lint

# 자동 수정 가능한 문제 수정
npm run lint:fix
```

### 포맷팅
```bash
# Prettier로 코드 포맷팅
npm run format

# 포맷팅 확인만 (수정하지 않음)
npm run format:check
```

### 타입 체크
```bash
# TypeScript 타입 체크
npm run typecheck
```

## 테스트

### 단위 테스트 실행
```bash
# 모든 테스트 실행
npm test

# watch 모드로 테스트 실행
npm run test:watch

# 커버리지 포함 테스트
npm run test:coverage
```

### 테스트 파일 구조
```
tests/
├── unit/           # 단위 테스트
│   ├── services/
│   ├── utils/
│   └── ...
├── integration/    # 통합 테스트
└── e2e/           # End-to-End 테스트
```

## 디버깅

### VS Code 디버깅
1. VS Code 디버그 패널 열기 (`Ctrl+Shift+D` 또는 `Cmd+Shift+D`)
2. 디버그 구성 선택:
   - "Build Plugin": 일반 빌드 디버깅
   - "Build Plugin (Production)": 프로덕션 빌드 디버깅
   - "Run Tests": 테스트 디버깅
3. `F5` 키로 디버깅 시작

### 콘솔 로깅
```typescript
// 개발 중 디버그 로그
console.log('Debug:', variable);

// 프로덕션에서는 Logger 서비스 사용
this.logger.debug('Debug message', { context: data });
```

### Obsidian 개발자 콘솔
1. Obsidian에서 `Ctrl+Shift+I` (Windows/Linux) 또는 `Cmd+Option+I` (macOS)
2. Console 탭에서 로그 확인
3. Network 탭에서 API 호출 확인

## 프로젝트 구조

```
SpeechNote/
├── src/                      # 소스 코드
│   ├── main.ts              # 플러그인 진입점
│   ├── core/                # 핵심 비즈니스 로직
│   ├── domain/              # 도메인 모델
│   ├── infrastructure/      # 외부 시스템 통합
│   ├── presentation/        # UI 컴포넌트
│   ├── application/         # 애플리케이션 서비스
│   ├── utils/               # 유틸리티 함수
│   └── types/               # TypeScript 타입 정의
├── tests/                   # 테스트 파일
├── docs/                    # 문서
├── .vscode/                 # VS Code 설정
├── node_modules/            # 의존성 (git ignore)
├── main.js                  # 빌드 결과물 (git ignore)
├── manifest.json            # 플러그인 메타데이터
├── styles.css               # 플러그인 스타일
├── package.json             # 프로젝트 설정
├── tsconfig.json            # TypeScript 설정
├── .eslintrc.js            # ESLint 설정
├── .prettierrc             # Prettier 설정
├── esbuild.config.mjs      # 빌드 설정
└── README.md               # 프로젝트 설명
```

## 자주 사용하는 명령어

```bash
# 개발
npm run dev                  # 개발 모드 (watch)
npm run build               # 프로덕션 빌드

# 코드 품질
npm run lint                # ESLint 실행
npm run lint:fix            # ESLint 자동 수정
npm run format              # Prettier 포맷팅
npm run format:check        # 포맷팅 체크
npm run typecheck           # TypeScript 타입 체크

# 테스트
npm test                    # 테스트 실행
npm run test:watch          # Watch 모드 테스트
npm run test:coverage       # 커버리지 측정

# 기타
npm run clean              # 빌드 결과물 삭제
npm run version            # 버전 업데이트
```

## 문제 해결

### 빌드 오류

#### TypeScript 오류
```bash
# 타입 정의 재설치
npm install --save-dev @types/node obsidian

# TypeScript 캐시 정리
rm -rf node_modules/.cache
npm run typecheck
```

#### ESBuild 오류
```bash
# node_modules 재설치
rm -rf node_modules package-lock.json
npm install

# 빌드 캐시 정리
npm run clean
npm run build
```

### 옵시디언 플러그인 로드 실패

#### "Failed to load plugin" 오류
1. 콘솔에서 구체적인 오류 메시지 확인
2. `manifest.json`의 `minAppVersion` 확인
3. 플러그인 파일 권한 확인:
```bash
chmod 644 main.js manifest.json styles.css
```

#### 플러그인이 목록에 나타나지 않음
1. 플러그인 폴더 구조 확인:
```
.obsidian/plugins/speech-to-text/
├── main.js
├── manifest.json
└── styles.css
```
2. Community plugins 활성화 확인
3. Obsidian 재시작

### API 관련 문제

#### API 키 인증 실패
1. API 키 형식 확인 (sk-로 시작하는 48자)
2. API 키 권한 확인 (Whisper API 접근 가능)
3. 네트워크 연결 확인

#### Rate Limit 오류
- API 호출 제한 확인
- 재시도 로직 구현 확인
- 캐싱 활성화 확인

## 추가 리소스

### 공식 문서
- [Obsidian Plugin Developer Docs](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

### 커뮤니티
- [Obsidian Forum](https://forum.obsidian.md/)
- [Obsidian Discord](https://discord.gg/obsidianmd)
- [GitHub Discussions](https://github.com/obsidianmd/obsidian-api/discussions)

### 유용한 도구
- [Obsidian Plugin Template](https://github.com/obsidianmd/obsidian-sample-plugin)
- [Hot Reload Plugin](https://github.com/pjeby/hot-reload)
- [Plugin Developer Tools](https://github.com/obsidian-tools/obsidian-tools)

## 기여 가이드라인

### Pull Request 제출 전 체크리스트
- [ ] 모든 테스트 통과
- [ ] 린트 오류 없음
- [ ] 코드 포맷팅 완료
- [ ] 문서 업데이트
- [ ] 커밋 메시지 컨벤션 준수

### 이슈 보고
이슈를 보고할 때 다음 정보를 포함해 주세요:
- Obsidian 버전
- 플러그인 버전
- 운영체제
- 재현 단계
- 예상 동작과 실제 동작
- 오류 메시지 (있는 경우)

---

*최종 업데이트: 2025-08-22*
*문서 버전: 1.0.0*