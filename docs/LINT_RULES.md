# Obsidian Plugin Lint Rules Guide

이 문서는 Obsidian 플러그인 개발 시 준수해야 하는 린트 규칙을 설명합니다. 이 규칙들은 [Obsidian 플러그인 리뷰 프로세스](https://github.com/obsidianmd/obsidian-releases)에서 자동으로 체크되는 항목들입니다.

## 로컬에서 린트 실행 방법

```bash
# 기본 린트 체크
npm run lint

# 자동 수정 가능한 항목 수정
npm run lint:fix

# Obsidian 특화 린트 (상세 리포트)
npm run lint:obsidian

# 경고도 에러로 처리 (CI와 동일한 엄격함)
npm run lint:verbose
```

## 주요 Required 규칙 (필수 수정)

### 1. Async/Await 사용

**규칙**: `@typescript-eslint/require-await`

async 함수는 반드시 `await` 표현식을 포함해야 합니다.

```typescript
// ❌ 잘못된 예
async function loadSettings() {
  return this.settings;
}

// ✅ 올바른 예
async function loadSettings() {
  const data = await this.loadData();
  return data || DEFAULT_SETTINGS;
}

// ✅ 또는 async 제거
function loadSettings() {
  return this.settings;
}
```

### 2. 불필요한 Type Assertion 제거

**규칙**: `@typescript-eslint/no-unnecessary-type-assertion`

타입을 변경하지 않는 불필요한 type assertion은 제거해야 합니다.

```typescript
// ❌ 잘못된 예
const value = someValue as string as string;
const element = document.createElement('div') as HTMLDivElement;

// ✅ 올바른 예
const value = someValue as string;
const element = document.createElement('div');
```

### 3. Empty Object Type 사용 금지

**규칙**: `@typescript-eslint/ban-types`

빈 객체 타입 `{}`는 사용하지 않고 `object` 또는 `unknown`을 사용해야 합니다.

```typescript
// ❌ 잘못된 예
function processData(data: {}) {
  // ...
}

// ✅ 올바른 예
function processData(data: object) {
  // ...
}

// 또는 더 명확하게
function processData(data: unknown) {
  // ...
}
```

### 4. Floating Promises 처리

**규칙**: `@typescript-eslint/no-floating-promises`

Promise를 반환하는 함수는 적절히 처리해야 합니다.

```typescript
// ❌ 잘못된 예
someAsyncFunction(); // Promise가 처리되지 않음

// ✅ 올바른 예
await someAsyncFunction();

// 또는 명시적으로 무시
void someAsyncFunction();

// 또는 catch 처리
someAsyncFunction().catch(error => {
  console.error('Error:', error);
});
```

### 5. Deprecated API 사용 금지

Obsidian API의 deprecated 항목은 사용하지 않아야 합니다:

- `noticeEl` → `messageEl` 사용
- `createElement` → Obsidian의 `createEl` 또는 `createDiv` 사용

```typescript
// ❌ 잘못된 예
const notice = new Notice('Message');
notice.noticeEl.addClass('custom-class');

// ✅ 올바른 예
const notice = new Notice('Message');
notice.messageEl?.addClass('custom-class');
```

## Obsidian 플러그인 특화 규칙

### UI Sentence Case

**규칙**: `obsidian/ui/sentence-case`

UI 텍스트는 sentence case를 사용해야 합니다 (첫 글자만 대문자).

```typescript
// ❌ 잘못된 예
addCommand({
  id: 'my-command',
  name: 'Convert Audio To Text', // Title Case
});

// ✅ 올바른 예
addCommand({
  id: 'my-command',
  name: 'Convert audio to text', // Sentence case
});
```

### Sample Code 제거

**규칙**: `obsidian/no-sample-code`

샘플 코드나 placeholder는 제거해야 합니다:

- `MyPlugin` → 실제 플러그인 이름으로 변경
- `SampleSettingTab` → 실제 이름으로 변경
- 샘플 커맨드 제거

### HTML Heading 금지

**규칙**: `obsidian/settings-tab/no-manual-html-headings`

Settings 탭에서 HTML heading 태그를 직접 사용하지 않아야 합니다.

```typescript
// ❌ 잘못된 예
containerEl.createEl('h2', { text: 'General Settings' });

// ✅ 올바른 예
new Setting(containerEl)
  .setName('General settings')
  .setHeading();
```

## Optional 규칙 (경고)

### 미사용 변수 및 Imports

**규칙**: `unused-imports/no-unused-vars`, `unused-imports/no-unused-imports`

사용되지 않는 변수나 imports는 자동으로 제거됩니다:

```bash
npm run lint:fix
```

underscore(`_`)로 시작하는 변수는 미사용으로 허용됩니다:

```typescript
// ✅ 허용됨
const _unusedVariable = someValue;
function handler(_event: Event) {
  // event를 사용하지 않지만 signature가 필요한 경우
}
```

## CI 파이프라인 통합

모든 PR은 자동으로 이 린트 규칙들을 체크합니다:

1. GitHub PR 생성 시 자동 실행
2. `Code Quality Check` job에서 린트 체크
3. 에러 발생 시 PR 머지 차단

## 추가 리소스

- [Obsidian Plugin Guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines)
- [eslint-plugin-obsidian](https://github.com/obsidianmd/eslint-plugin)
- [Obsidian Developer Docs](https://docs.obsidian.md/)
