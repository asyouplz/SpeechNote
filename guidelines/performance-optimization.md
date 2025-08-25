# 성능 최적화 가이드 - Speech to Text 플러그인

## 1. UI 렌더링 최적화

### 1.1 Virtual DOM 및 효율적인 업데이트

#### 배치 DOM 업데이트
```typescript
class BatchDOMUpdater {
  private pendingUpdates: (() => void)[] = [];
  private rafId: number | null = null;
  
  // 업데이트 대기열에 추가
  queueUpdate(updateFn: () => void) {
    this.pendingUpdates.push(updateFn);
    
    if (!this.rafId) {
      this.rafId = requestAnimationFrame(() => {
        this.flush();
      });
    }
  }
  
  // 모든 업데이트 한 번에 실행
  private flush() {
    const updates = this.pendingUpdates.splice(0);
    updates.forEach(fn => fn());
    this.rafId = null;
  }
}
```

#### 가상 스크롤링
```typescript
class VirtualScroller {
  private itemHeight = 40;
  private buffer = 5; // 뷰포트 위아래 버퍼 항목 수
  
  render(items: any[], container: HTMLElement) {
    const scrollTop = container.scrollTop;
    const viewportHeight = container.clientHeight;
    
    // 보이는 영역 계산
    const startIndex = Math.floor(scrollTop / this.itemHeight) - this.buffer;
    const endIndex = Math.ceil((scrollTop + viewportHeight) / this.itemHeight) + this.buffer;
    
    // 안전한 인덱스 범위
    const safeStart = Math.max(0, startIndex);
    const safeEnd = Math.min(items.length, endIndex);
    
    // 가상 스페이서
    const topSpace = safeStart * this.itemHeight;
    const bottomSpace = (items.length - safeEnd) * this.itemHeight;
    
    return `
      <div style="height: ${topSpace}px"></div>
      ${items.slice(safeStart, safeEnd).map(item => this.renderItem(item)).join('')}
      <div style="height: ${bottomSpace}px"></div>
    `;
  }
  
  private renderItem(item: any): string {
    return `<div class="list-item" style="height: ${this.itemHeight}px">${item.name}</div>`;
  }
}
```

### 1.2 CSS 최적화

#### Critical CSS 인라이닝
```typescript
class CriticalCSS {
  // 중요 스타일만 인라인으로 삽입
  injectCritical() {
    const critical = `
      .speech-to-text-plugin {
        display: block;
        position: relative;
      }
      .modal-container {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 9999;
      }
      .hidden { display: none !important; }
    `;
    
    const style = document.createElement('style');
    style.textContent = critical;
    document.head.insertBefore(style, document.head.firstChild);
  }
  
  // 나머지 스타일 지연 로드
  loadNonCritical() {
    requestIdleCallback(() => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'styles/main.css';
      document.head.appendChild(link);
    });
  }
}
```

#### CSS Containment
```css
/* 레이아웃 격리로 리플로우 최소화 */
.file-list {
  contain: layout style paint;
  will-change: transform;
}

.modal-content {
  contain: layout style;
  content-visibility: auto;
}

/* 애니메이션 최적화 */
.animated-element {
  will-change: transform, opacity;
  transform: translateZ(0); /* GPU 가속 */
}

/* 애니메이션 완료 후 will-change 제거 */
.animation-done {
  will-change: auto;
}
```

### 1.3 리플로우/리페인트 최소화

```typescript
class LayoutOptimizer {
  // 레이아웃 쓰래싱 방지
  batchLayoutReads(elements: HTMLElement[]): number[] {
    // 모든 읽기 작업을 먼저 수행
    const heights = elements.map(el => el.offsetHeight);
    
    // 그 다음 쓰기 작업 수행
    elements.forEach((el, i) => {
      el.style.height = `${heights[i] + 10}px`;
    });
    
    return heights;
  }
  
  // 강제 동기 레이아웃 방지
  optimizedResize(element: HTMLElement, width: number, height: number) {
    // 나쁜 예: 레이아웃 쓰래싱
    // element.style.width = width + 'px';
    // console.log(element.offsetWidth); // 강제 리플로우
    // element.style.height = height + 'px';
    // console.log(element.offsetHeight); // 또 강제 리플로우
    
    // 좋은 예: 배치 업데이트
    requestAnimationFrame(() => {
      element.style.cssText = `width: ${width}px; height: ${height}px`;
    });
  }
  
  // 숨겨진 요소에서 계산
  measureHidden(element: HTMLElement): DOMRect {
    const clone = element.cloneNode(true) as HTMLElement;
    clone.style.cssText = `
      position: absolute;
      visibility: hidden;
      display: block !important;
    `;
    
    document.body.appendChild(clone);
    const rect = clone.getBoundingClientRect();
    document.body.removeChild(clone);
    
    return rect;
  }
}
```

## 2. 메모리 사용량 최소화

### 2.1 메모리 누수 방지

```typescript
class MemoryManager {
  private listeners: Map<HTMLElement, Function[]> = new Map();
  private timers: Set<NodeJS.Timeout> = new Set();
  private observers: Set<MutationObserver | IntersectionObserver> = new Set();
  
  // 이벤트 리스너 관리
  addEventListener(element: HTMLElement, event: string, handler: Function) {
    element.addEventListener(event, handler as EventListener);
    
    if (!this.listeners.has(element)) {
      this.listeners.set(element, []);
    }
    this.listeners.get(element)!.push(handler);
  }
  
  // 타이머 관리
  setTimeout(callback: Function, delay: number): NodeJS.Timeout {
    const timer = setTimeout(() => {
      callback();
      this.timers.delete(timer);
    }, delay);
    
    this.timers.add(timer);
    return timer;
  }
  
  // 옵저버 관리
  createObserver(callback: Function): IntersectionObserver {
    const observer = new IntersectionObserver(callback as IntersectionObserverCallback);
    this.observers.add(observer);
    return observer;
  }
  
  // 모든 리소스 정리
  cleanup() {
    // 이벤트 리스너 제거
    this.listeners.forEach((handlers, element) => {
      handlers.forEach(handler => {
        element.removeEventListener('*', handler as EventListener);
      });
    });
    this.listeners.clear();
    
    // 타이머 정리
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
    
    // 옵저버 해제
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
  }
}
```

### 2.2 객체 풀링

```typescript
class ObjectPool<T> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn: (obj: T) => void;
  private maxSize: number;
  
  constructor(
    createFn: () => T,
    resetFn: (obj: T) => void,
    maxSize: number = 100
  ) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.maxSize = maxSize;
  }
  
  acquire(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return this.createFn();
  }
  
  release(obj: T) {
    if (this.pool.length < this.maxSize) {
      this.resetFn(obj);
      this.pool.push(obj);
    }
  }
  
  clear() {
    this.pool = [];
  }
}

// 사용 예: DOM 요소 재활용
const fileItemPool = new ObjectPool(
  () => document.createElement('div'),
  (div) => {
    div.className = '';
    div.textContent = '';
    div.removeAttribute('data-id');
  },
  50
);
```

### 2.3 대용량 데이터 처리

```typescript
class LargeDataHandler {
  // 청크 단위 처리
  async processInChunks<T>(
    items: T[],
    processor: (item: T) => Promise<void>,
    chunkSize: number = 100
  ) {
    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      
      // 각 청크를 비동기로 처리
      await Promise.all(chunk.map(processor));
      
      // UI 업데이트 기회 제공
      await this.yieldToMain();
    }
  }
  
  // 메인 스레드 양보
  private yieldToMain(): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, 0);
    });
  }
  
  // WeakMap으로 메타데이터 관리
  private metadata = new WeakMap<object, any>();
  
  setMetadata(obj: object, data: any) {
    this.metadata.set(obj, data);
  }
  
  getMetadata(obj: object): any {
    return this.metadata.get(obj);
  }
}
```

## 3. 비동기 작업 관리

### 3.1 Web Worker 활용

```typescript
// worker.ts
self.addEventListener('message', async (e) => {
  const { type, data } = e.data;
  
  switch (type) {
    case 'PROCESS_AUDIO':
      const result = await processAudioData(data);
      self.postMessage({ type: 'AUDIO_PROCESSED', result });
      break;
      
    case 'FORMAT_TEXT':
      const formatted = formatLargeText(data);
      self.postMessage({ type: 'TEXT_FORMATTED', result: formatted });
      break;
  }
});

// main.ts
class WorkerManager {
  private worker: Worker;
  private pending = new Map<string, (result: any) => void>();
  
  constructor() {
    this.worker = new Worker('worker.js');
    this.worker.addEventListener('message', this.handleMessage.bind(this));
  }
  
  async processInBackground(type: string, data: any): Promise<any> {
    return new Promise((resolve) => {
      const id = this.generateId();
      this.pending.set(id, resolve);
      this.worker.postMessage({ id, type, data });
    });
  }
  
  private handleMessage(e: MessageEvent) {
    const { id, result } = e.data;
    const resolver = this.pending.get(id);
    if (resolver) {
      resolver(result);
      this.pending.delete(id);
    }
  }
  
  terminate() {
    this.worker.terminate();
  }
}
```

### 3.2 취소 가능한 작업

```typescript
class CancellableOperation {
  private abortController: AbortController | null = null;
  
  async execute<T>(
    operation: (signal: AbortSignal) => Promise<T>
  ): Promise<T> {
    // 이전 작업 취소
    this.cancel();
    
    // 새 컨트롤러 생성
    this.abortController = new AbortController();
    
    try {
      return await operation(this.abortController.signal);
    } finally {
      this.abortController = null;
    }
  }
  
  cancel() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }
}

// 사용 예
class TranscriptionManager {
  private operation = new CancellableOperation();
  
  async transcribe(file: File) {
    return this.operation.execute(async (signal) => {
      // 취소 가능한 fetch
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: file,
        signal
      });
      
      if (signal.aborted) {
        throw new Error('Operation cancelled');
      }
      
      return response.json();
    });
  }
  
  cancelTranscription() {
    this.operation.cancel();
  }
}
```

### 3.3 작업 큐 및 우선순위 관리

```typescript
interface Task {
  id: string;
  priority: number;
  execute: () => Promise<any>;
  onComplete?: (result: any) => void;
  onError?: (error: Error) => void;
}

class TaskQueue {
  private queue: Task[] = [];
  private running = 0;
  private maxConcurrent = 2;
  
  enqueue(task: Task) {
    // 우선순위에 따라 정렬하여 삽입
    const index = this.queue.findIndex(t => t.priority < task.priority);
    if (index === -1) {
      this.queue.push(task);
    } else {
      this.queue.splice(index, 0, task);
    }
    
    this.processNext();
  }
  
  private async processNext() {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }
    
    const task = this.queue.shift()!;
    this.running++;
    
    try {
      const result = await task.execute();
      task.onComplete?.(result);
    } catch (error) {
      task.onError?.(error as Error);
    } finally {
      this.running--;
      this.processNext();
    }
  }
  
  clear() {
    this.queue = [];
  }
  
  setPriority(taskId: string, priority: number) {
    const task = this.queue.find(t => t.id === taskId);
    if (task) {
      task.priority = priority;
      // 재정렬
      this.queue.sort((a, b) => b.priority - a.priority);
    }
  }
}
```

## 4. 로딩 시간 단축

### 4.1 지연 로딩

```typescript
class LazyLoader {
  private loaded = new Set<string>();
  
  // 컴포넌트 지연 로딩
  async loadComponent(name: string): Promise<any> {
    if (this.loaded.has(name)) {
      return;
    }
    
    const module = await import(`./components/${name}`);
    this.loaded.add(name);
    return module.default;
  }
  
  // Intersection Observer를 이용한 지연 로딩
  observeLazyElements() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const element = entry.target as HTMLElement;
          this.loadElement(element);
          observer.unobserve(element);
        }
      });
    }, {
      rootMargin: '50px'
    });
    
    document.querySelectorAll('[data-lazy]').forEach(el => {
      observer.observe(el);
    });
  }
  
  private async loadElement(element: HTMLElement) {
    const component = element.dataset.lazy;
    if (component) {
      const Component = await this.loadComponent(component);
      new Component(element);
    }
  }
}
```

### 4.2 리소스 프리로딩

```typescript
class ResourcePreloader {
  // 중요 리소스 프리로드
  preloadCritical() {
    // API 엔드포인트 프리커넥트
    this.preconnect('https://api.openai.com');
    
    // 중요 스크립트 프리로드
    this.preloadScript('core-functionality.js');
    
    // 폰트 프리로드
    this.preloadFont('/fonts/main.woff2');
  }
  
  private preconnect(url: string) {
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = url;
    document.head.appendChild(link);
  }
  
  private preloadScript(src: string) {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'script';
    link.href = src;
    document.head.appendChild(link);
  }
  
  private preloadFont(href: string) {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'font';
    link.type = 'font/woff2';
    link.href = href;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  }
  
  // 유저 인터랙션 예측 기반 프리로드
  predictivePreload(element: HTMLElement) {
    element.addEventListener('mouseenter', () => {
      // 호버 시 관련 리소스 미리 로드
      this.preloadRelatedResources(element);
    }, { once: true });
  }
  
  private preloadRelatedResources(element: HTMLElement) {
    const action = element.dataset.action;
    switch (action) {
      case 'open-settings':
        this.loadComponent('SettingsModal');
        break;
      case 'select-file':
        this.loadComponent('FilePicker');
        break;
    }
  }
}
```

## 5. 캐싱 전략

### 5.1 메모리 캐시

```typescript
class MemoryCache<T> {
  private cache = new Map<string, { data: T; timestamp: number }>();
  private maxSize: number;
  private ttl: number;
  
  constructor(maxSize: number = 100, ttl: number = 5 * 60 * 1000) {
    this.maxSize = maxSize;
    this.ttl = ttl;
  }
  
  set(key: string, value: T) {
    // 크기 제한 확인
    if (this.cache.size >= this.maxSize) {
      // LRU: 가장 오래된 항목 제거
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      data: value,
      timestamp: Date.now()
    });
  }
  
  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    // TTL 확인
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    // LRU: 접근한 항목을 끝으로 이동
    this.cache.delete(key);
    this.cache.set(key, entry);
    
    return entry.data;
  }
  
  clear() {
    this.cache.clear();
  }
  
  // 메모리 사용량 추정
  getMemoryUsage(): number {
    let size = 0;
    this.cache.forEach(entry => {
      size += JSON.stringify(entry).length * 2; // 대략적인 바이트 추정
    });
    return size;
  }
}
```

### 5.2 IndexedDB 캐시

```typescript
class IndexedDBCache {
  private dbName = 'SpeechToTextCache';
  private version = 1;
  private db: IDBDatabase | null = null;
  
  async init() {
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // 변환 결과 저장소
        if (!db.objectStoreNames.contains('transcriptions')) {
          const store = db.createObjectStore('transcriptions', { keyPath: 'id' });
          store.createIndex('fileHash', 'fileHash', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        // 설정 저장소
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
    });
  }
  
  async saveTranscription(fileHash: string, text: string, metadata: any) {
    if (!this.db) await this.init();
    
    const transaction = this.db!.transaction(['transcriptions'], 'readwrite');
    const store = transaction.objectStore('transcriptions');
    
    return store.add({
      id: this.generateId(),
      fileHash,
      text,
      metadata,
      timestamp: Date.now()
    });
  }
  
  async getTranscription(fileHash: string): Promise<any> {
    if (!this.db) await this.init();
    
    const transaction = this.db!.transaction(['transcriptions'], 'readonly');
    const store = transaction.objectStore('transcriptions');
    const index = store.index('fileHash');
    
    return new Promise((resolve, reject) => {
      const request = index.get(fileHash);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  
  async cleanOldEntries(maxAge: number = 7 * 24 * 60 * 60 * 1000) {
    if (!this.db) await this.init();
    
    const cutoff = Date.now() - maxAge;
    const transaction = this.db!.transaction(['transcriptions'], 'readwrite');
    const store = transaction.objectStore('transcriptions');
    const index = store.index('timestamp');
    
    const range = IDBKeyRange.upperBound(cutoff);
    const request = index.openCursor(range);
    
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        store.delete(cursor.primaryKey);
        cursor.continue();
      }
    };
  }
  
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

## 6. 네트워크 최적화

### 6.1 요청 배칭

```typescript
class RequestBatcher {
  private pending: Map<string, any[]> = new Map();
  private timer: NodeJS.Timeout | null = null;
  private batchDelay = 50;
  private maxBatchSize = 10;
  
  add(endpoint: string, data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.pending.has(endpoint)) {
        this.pending.set(endpoint, []);
      }
      
      this.pending.get(endpoint)!.push({ data, resolve, reject });
      
      // 배치 크기 초과 시 즉시 전송
      if (this.pending.get(endpoint)!.length >= this.maxBatchSize) {
        this.flush(endpoint);
      } else {
        // 타이머 설정
        this.scheduleBatch();
      }
    });
  }
  
  private scheduleBatch() {
    if (this.timer) return;
    
    this.timer = setTimeout(() => {
      this.flushAll();
      this.timer = null;
    }, this.batchDelay);
  }
  
  private async flush(endpoint: string) {
    const batch = this.pending.get(endpoint);
    if (!batch || batch.length === 0) return;
    
    this.pending.delete(endpoint);
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch: batch.map(b => b.data) })
      });
      
      const results = await response.json();
      
      batch.forEach((item, index) => {
        item.resolve(results[index]);
      });
    } catch (error) {
      batch.forEach(item => item.reject(error));
    }
  }
  
  private flushAll() {
    this.pending.forEach((_, endpoint) => {
      this.flush(endpoint);
    });
  }
}
```

### 6.2 압축 및 최적화

```typescript
class DataCompressor {
  // 텍스트 압축
  async compressText(text: string): Promise<Blob> {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    
    const cs = new CompressionStream('gzip');
    const writer = cs.writable.getWriter();
    writer.write(data);
    writer.close();
    
    return new Response(cs.readable).blob();
  }
  
  // 이미지 최적화
  async optimizeImage(file: File, maxWidth: number = 1920): Promise<Blob> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        
        // 비율 유지하며 리사이즈
        const scale = Math.min(1, maxWidth / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
          resolve(blob!);
        }, 'image/jpeg', 0.85);
      };
      
      img.src = URL.createObjectURL(file);
    });
  }
  
  // 청크 업로드
  async uploadInChunks(file: File, chunkSize: number = 1024 * 1024) {
    const chunks = Math.ceil(file.size / chunkSize);
    const uploadId = this.generateUploadId();
    
    for (let i = 0; i < chunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);
      
      await this.uploadChunk(uploadId, i, chunk, chunks);
      
      // 진행률 업데이트
      this.updateProgress((i + 1) / chunks * 100);
    }
    
    return this.completeUpload(uploadId);
  }
  
  private async uploadChunk(
    uploadId: string,
    index: number,
    chunk: Blob,
    total: number
  ) {
    const formData = new FormData();
    formData.append('uploadId', uploadId);
    formData.append('index', index.toString());
    formData.append('total', total.toString());
    formData.append('chunk', chunk);
    
    return fetch('/api/upload/chunk', {
      method: 'POST',
      body: formData
    });
  }
}
```

## 7. 성능 모니터링

### 7.1 Performance Observer

```typescript
class PerformanceMonitor {
  private observer: PerformanceObserver;
  private metrics: Map<string, number[]> = new Map();
  
  init() {
    // Long Tasks 모니터링
    if ('PerformanceObserver' in window) {
      this.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'longtask') {
            console.warn('Long task detected:', entry.duration);
            this.recordMetric('longtask', entry.duration);
          }
        }
      });
      
      this.observer.observe({ entryTypes: ['longtask'] });
    }
    
    // 커스텀 측정
    this.measureInitTime();
    this.measureRenderTime();
  }
  
  // 초기화 시간 측정
  private measureInitTime() {
    performance.mark('init-start');
    
    // 초기화 완료 후
    requestIdleCallback(() => {
      performance.mark('init-end');
      performance.measure('initialization', 'init-start', 'init-end');
      
      const measure = performance.getEntriesByName('initialization')[0];
      this.recordMetric('init', measure.duration);
    });
  }
  
  // 렌더링 시간 측정
  private measureRenderTime() {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'paint') {
          this.recordMetric(entry.name, entry.startTime);
        }
      }
    });
    
    observer.observe({ entryTypes: ['paint'] });
  }
  
  // 커스텀 타이밍
  startTiming(name: string) {
    performance.mark(`${name}-start`);
  }
  
  endTiming(name: string) {
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
    
    const measure = performance.getEntriesByName(name)[0];
    this.recordMetric(name, measure.duration);
    
    // 마크 정리
    performance.clearMarks(`${name}-start`);
    performance.clearMarks(`${name}-end`);
    performance.clearMeasures(name);
  }
  
  private recordMetric(name: string, value: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const values = this.metrics.get(name)!;
    values.push(value);
    
    // 최대 100개만 유지
    if (values.length > 100) {
      values.shift();
    }
  }
  
  getStats(name: string) {
    const values = this.metrics.get(name) || [];
    if (values.length === 0) return null;
    
    const sorted = [...values].sort((a, b) => a - b);
    
    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }
  
  // 성능 리포트 생성
  generateReport() {
    const report: any = {
      timestamp: Date.now(),
      metrics: {}
    };
    
    this.metrics.forEach((values, name) => {
      report.metrics[name] = this.getStats(name);
    });
    
    // 메모리 정보
    if ('memory' in performance) {
      report.memory = {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
      };
    }
    
    return report;
  }
}
```

### 7.2 리소스 타이밍

```typescript
class ResourceMonitor {
  analyzeResources() {
    const resources = performance.getEntriesByType('resource');
    
    const analysis = {
      total: resources.length,
      byType: new Map<string, number>(),
      slowest: [] as any[],
      totalSize: 0,
      totalDuration: 0
    };
    
    resources.forEach(resource => {
      const res = resource as PerformanceResourceTiming;
      
      // 타입별 집계
      const type = this.getResourceType(res.name);
      analysis.byType.set(type, (analysis.byType.get(type) || 0) + 1);
      
      // 느린 리소스 추적
      if (res.duration > 500) {
        analysis.slowest.push({
          name: res.name,
          duration: res.duration,
          size: res.transferSize
        });
      }
      
      analysis.totalSize += res.transferSize || 0;
      analysis.totalDuration += res.duration;
    });
    
    // 느린 리소스 정렬
    analysis.slowest.sort((a, b) => b.duration - a.duration);
    
    return analysis;
  }
  
  private getResourceType(url: string): string {
    if (url.match(/\.(js|mjs)$/)) return 'script';
    if (url.match(/\.css$/)) return 'style';
    if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) return 'image';
    if (url.match(/\.(woff|woff2|ttf|otf)$/)) return 'font';
    if (url.includes('/api/')) return 'api';
    return 'other';
  }
}
```

## 8. 최적화 체크리스트

### 렌더링 최적화
- [ ] Virtual scrolling 구현
- [ ] CSS containment 사용
- [ ] will-change 적절히 활용
- [ ] 리플로우/리페인트 최소화
- [ ] requestAnimationFrame 사용
- [ ] 배치 DOM 업데이트

### 메모리 최적화
- [ ] 이벤트 리스너 정리
- [ ] 타이머/인터벌 정리
- [ ] WeakMap/WeakSet 활용
- [ ] 객체 풀링 구현
- [ ] 대용량 데이터 청킹
- [ ] 메모리 누수 모니터링

### 네트워크 최적화
- [ ] 요청 배칭
- [ ] 데이터 압축
- [ ] 청크 업로드
- [ ] HTTP/2 활용
- [ ] 캐시 전략 구현
- [ ] CDN 활용

### 로딩 최적화
- [ ] 코드 스플리팅
- [ ] 지연 로딩
- [ ] 프리로딩/프리페칭
- [ ] Critical CSS 인라이닝
- [ ] 번들 크기 최적화
- [ ] Tree shaking

### 런타임 최적화
- [ ] Web Worker 활용
- [ ] 디바운싱/쓰로틀링
- [ ] 취소 가능한 작업
- [ ] 우선순위 큐
- [ ] Idle callback 활용
- [ ] 점진적 향상

### 모니터링
- [ ] Performance Observer 설정
- [ ] 리소스 타이밍 분석
- [ ] 메모리 사용량 추적
- [ ] 에러 로깅
- [ ] 사용자 지표 수집
- [ ] A/B 테스팅