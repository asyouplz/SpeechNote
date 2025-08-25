# 예제 코드 모음 (Example Code Collection)

이 디렉토리는 Speech-to-Text 플러그인의 다양한 사용 예제를 포함합니다.

## 📁 파일 구조

```
docs/examples/
├── README.md                    # 이 파일
├── basic-usage.ts              # 기본 사용 예제
├── advanced-integration.ts     # 고급 통합 예제
└── custom-services.ts          # 커스텀 서비스 구현 예제
```

## 🎯 예제 카테고리

### 1. 기본 사용법 (`basic-usage.ts`)

초보자를 위한 기본적인 사용 예제들입니다.

- **간단한 음성 변환**: 파일을 선택하고 텍스트로 변환
- **진행 상황 표시**: 변환 진행률 UI 표시
- **자동 텍스트 삽입**: 변환 후 에디터에 자동 삽입
- **이벤트 처리**: 이벤트 기반 프로그래밍
- **설정 관리**: 플러그인 설정 저장/로드
- **일괄 처리**: 여러 파일 동시 처리
- **커스텀 포맷팅**: 다양한 텍스트 포맷 적용
- **에러 처리**: 강건한 에러 처리 및 재시도

### 2. 고급 통합 (`advanced-integration.ts`)

숙련자를 위한 고급 기능 예제들입니다.

- **커스텀 명령어**: 사용자 정의 명령어 및 단축키
- **커스텀 UI 모달**: 옵션 선택 모달 다이얼로그
- **실시간 대시보드**: 통계 및 모니터링 대시보드
- **워크플로우 자동화**: 규칙 기반 자동화 시스템

### 3. 커스텀 서비스 (`custom-services.ts`)

서비스 확장 및 커스터마이징 예제들입니다.

- **커스텀 WhisperService**: 기능 확장된 Whisper 서비스
- **대체 API 통합**: 다른 음성 인식 API 사용
- **캐싱 시스템**: 성능 향상을 위한 캐싱
- **큐 시스템**: 대량 처리를 위한 큐

## 🚀 빠른 시작

### 기본 변환 예제

```typescript
import { basicTranscription } from './basic-usage';

// 파일 선택 및 변환
const file = app.vault.getFiles().find(f => f.extension === 'm4a');
if (file) {
    await basicTranscription(file, whisperService);
}
```

### 커스텀 명령어 추가

```typescript
import { CustomTranscriptionCommands } from './advanced-integration';

// 플러그인 onload() 메서드에서
const commands = new CustomTranscriptionCommands(
    this, 
    whisperService, 
    logger
);
```

### 대시보드 생성

```typescript
import { TranscriptionDashboard } from './advanced-integration';

// 대시보드 초기화
const dashboard = new TranscriptionDashboard(eventManager, logger);

// 뷰에 마운트
const containerEl = document.querySelector('.workspace-leaf-content');
dashboard.mount(containerEl);
```

## 📚 학습 경로

### 초급자

1. `basic-usage.ts`의 예제 1-3 학습
2. 간단한 변환 기능 구현
3. 에러 처리 추가

### 중급자

1. `basic-usage.ts`의 예제 4-6 학습
2. 이벤트 시스템 활용
3. 일괄 처리 구현

### 고급자

1. `advanced-integration.ts` 전체 학습
2. 커스텀 서비스 구현
3. 자동화 워크플로우 구축

## 💡 팁과 트릭

### 성능 최적화

```typescript
// 파일 크기 확인 후 압축
if (file.stat.size > 10 * 1024 * 1024) {
    const compressed = await compressAudio(buffer);
    response = await whisperService.transcribe(compressed);
} else {
    response = await whisperService.transcribe(buffer);
}
```

### 에러 처리

```typescript
// 재시도 로직
const maxRetries = 3;
for (let i = 0; i < maxRetries; i++) {
    try {
        return await whisperService.transcribe(buffer);
    } catch (error) {
        if (i === maxRetries - 1) throw error;
        await sleep(1000 * Math.pow(2, i)); // 지수 백오프
    }
}
```

### 메모리 관리

```typescript
// 큰 파일 처리 후 메모리 해제
let buffer = await vault.readBinary(file);
try {
    const result = await process(buffer);
    return result;
} finally {
    buffer = null; // 가비지 컬렉션 힌트
}
```

## 🔧 개발 환경 설정

### TypeScript 설정

```json
{
  "compilerOptions": {
    "target": "ES2018",
    "module": "ESNext",
    "lib": ["ES2018", "DOM"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

### 디버깅

```typescript
// 개발 모드에서 디버깅 활성화
if (process.env.NODE_ENV === 'development') {
    window.debugTranscription = {
        service: whisperService,
        lastResponse: null,
        logs: []
    };
}
```

## 📖 추가 리소스

- [API Reference](../api-reference.md)
- [Component Guide](../component-guide.md)
- [Troubleshooting Guide](../troubleshooting.md)
- [OpenAI Whisper API Docs](https://platform.openai.com/docs/guides/speech-to-text)

## 🤝 기여하기

예제 코드를 개선하거나 새로운 예제를 추가하고 싶으시다면:

1. 이슈를 생성하여 논의
2. Pull Request 제출
3. 코드 리뷰 진행

## 📝 라이선스

이 예제 코드들은 MIT 라이선스 하에 제공됩니다.

---

*최종 업데이트: 2025-08-22*  
*버전: 1.0.0*