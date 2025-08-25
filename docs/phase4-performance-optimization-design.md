# Phase 4 Task 4.3 성능 최적화 시스템 설계

## 개요

Phase 3에서 달성한 성능 개선(메모리 40-70% 감소, 응답 시간 75-84% 개선)을 기반으로, 추가적인 최적화를 통해 사용자 경험을 극대화하고 시스템 효율성을 향상시킵니다.

## 1. 현재 상태 분석

### 1.1 달성된 개선 사항
- **메모리 관리**: AutoDisposable 패턴으로 메모리 누수 100% 방지
- **비동기 처리**: CancellablePromise, Semaphore로 효율적 작업 관리
- **에러 처리**: GlobalErrorManager로 100% 에러 캐치율 달성
- **코드 복잡도**: Cyclomatic Complexity 68% 감소

### 1.2 최적화 기회 영역
1. **번들 사이즈**: 현재 단일 번들로 구성
2. **초기 로딩**: 모든 모듈 동시 로드
3. **런타임 메모리**: 대용량 데이터 처리 시 스파이크
4. **네트워크 요청**: 개별 API 호출로 인한 오버헤드

## 2. 최적화 전략

### 2.1 번들 사이즈 최적화

#### 2.1.1 현재 번들 분석
```typescript
// 예상 번들 구성
interface BundleAnalysis {
  totalSize: '~500KB';
  breakdown: {
    core: '150KB (30%)';
    ui: '200KB (40%)';
    utils: '100KB (20%)';
    styles: '50KB (10%)';
  };
}
```

#### 2.1.2 Tree Shaking 전략
```typescript
// esbuild.config.optimized.mjs
export const optimizedConfig = {
  // 기존 설정
  ...baseConfig,
  
  // Tree shaking 강화
  treeShaking: true,
  pure: ['console.log', 'console.debug'],
  drop: prod ? ['console', 'debugger'] : [],
  
  // 사용하지 않는 코드 제거
  sideEffects: false,
  
  // 번들 분석
  metafile: true,
  analyze: process.env.ANALYZE === 'true'
};
```

#### 2.1.3 코드 스플리팅 구현
```typescript
// src/core/lazy-loader.ts
export class LazyLoader {
  private static loadedModules = new Map<string, any>();
  
  static async loadModule<T>(
    modulePath: string,
    fallback?: T
  ): Promise<T> {
    if (this.loadedModules.has(modulePath)) {
      return this.loadedModules.get(modulePath);
    }
    
    try {
      const module = await import(
        /* webpackChunkName: "[request]" */
        /* webpackPreload: true */
        modulePath
      );
      
      this.loadedModules.set(modulePath, module.default || module);
      return module.default || module;
    } catch (error) {
      console.error(`Failed to load module: ${modulePath}`, error);
      return fallback as T;
    }
  }
  
  static preload(modulePaths: string[]): void {
    modulePaths.forEach(path => {
      const link = document.createElement('link');
      link.rel = 'modulepreload';
      link.href = path;
      document.head.appendChild(link);
    });
  }
}
```

### 2.2 로딩 시간 개선

#### 2.2.1 초기 로딩 최적화
```typescript
// src/core/bootstrap.ts
export class ApplicationBootstrap {
  private static criticalModules = [
    'StateManager',
    'EventManager',
    'Logger'
  ];
  
  private static deferredModules = [
    'StatisticsDashboard',
    'AdvancedSettings',
    'FileValidator'
  ];
  
  static async initialize(): Promise<void> {
    // Phase 1: Critical modules
    await this.loadCritical();
    
    // Phase 2: Core functionality
    await this.loadCore();
    
    // Phase 3: Deferred modules (background)
    this.loadDeferred();
  }
  
  private static async loadCritical(): Promise<void> {
    const startTime = performance.now();
    
    await Promise.all(
      this.criticalModules.map(module => 
        LazyLoader.loadModule(`./core/${module}`)
      )
    );
    
    console.log(`Critical modules loaded in ${
      performance.now() - startTime
    }ms`);
  }
  
  private static loadDeferred(): void {
    requestIdleCallback(() => {
      this.deferredModules.forEach(module => {
        LazyLoader.loadModule(`./ui/${module}`);
      });
    });
  }
}
```

#### 2.2.2 Lazy Loading 전략
```typescript
// src/ui/components/LazyComponent.ts
export abstract class LazyComponent<T = any> {
  private component?: T;
  private loadPromise?: Promise<T>;
  
  constructor(
    private loader: () => Promise<T>,
    private placeholder?: HTMLElement
  ) {}
  
  async load(): Promise<T> {
    if (this.component) {
      return this.component;
    }
    
    if (!this.loadPromise) {
      this.loadPromise = this.performLoad();
    }
    
    return this.loadPromise;
  }
  
  private async performLoad(): Promise<T> {
    try {
      // Show loading placeholder
      if (this.placeholder) {
        this.showPlaceholder();
      }
      
      // Load component
      this.component = await this.loader();
      
      // Hide placeholder
      if (this.placeholder) {
        this.hidePlaceholder();
      }
      
      return this.component;
    } catch (error) {
      console.error('Failed to load component:', error);
      throw error;
    }
  }
  
  private showPlaceholder(): void {
    if (this.placeholder) {
      this.placeholder.style.display = 'block';
    }
  }
  
  private hidePlaceholder(): void {
    if (this.placeholder) {
      this.placeholder.style.display = 'none';
    }
  }
}
```

#### 2.2.3 리소스 프리로딩
```typescript
// src/core/ResourcePreloader.ts
export class ResourcePreloader {
  private static preloadQueue: Set<string> = new Set();
  private static isPreloading = false;
  
  static async preloadResources(resources: ResourceConfig[]): Promise<void> {
    const sorted = this.prioritizeResources(resources);
    
    // Critical resources - immediate
    await this.loadCriticalResources(sorted.critical);
    
    // Important resources - after DOM ready
    document.addEventListener('DOMContentLoaded', () => {
      this.loadImportantResources(sorted.important);
    });
    
    // Nice-to-have resources - idle time
    requestIdleCallback(() => {
      this.loadDeferredResources(sorted.deferred);
    });
  }
  
  private static prioritizeResources(resources: ResourceConfig[]): {
    critical: ResourceConfig[];
    important: ResourceConfig[];
    deferred: ResourceConfig[];
  } {
    return {
      critical: resources.filter(r => r.priority === 'critical'),
      important: resources.filter(r => r.priority === 'important'),
      deferred: resources.filter(r => r.priority === 'deferred')
    };
  }
  
  private static async loadCriticalResources(
    resources: ResourceConfig[]
  ): Promise<void> {
    await Promise.all(
      resources.map(r => this.preloadResource(r))
    );
  }
  
  private static preloadResource(resource: ResourceConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = resource.type === 'module' ? 'modulepreload' : 'preload';
      link.as = resource.as || 'script';
      link.href = resource.url;
      
      if (resource.crossOrigin) {
        link.crossOrigin = resource.crossOrigin;
      }
      
      link.onload = () => resolve();
      link.onerror = reject;
      
      document.head.appendChild(link);
    });
  }
}

interface ResourceConfig {
  url: string;
  type: 'module' | 'script' | 'style' | 'font';
  priority: 'critical' | 'important' | 'deferred';
  as?: string;
  crossOrigin?: string;
}
```

### 2.3 메모리 사용량 최적화

#### 2.3.1 메모리 프로파일링
```typescript
// src/utils/memory/MemoryProfiler.ts
export class MemoryProfiler {
  private static snapshots: MemorySnapshot[] = [];
  private static isMonitoring = false;
  
  static startProfiling(interval = 5000): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.profileLoop(interval);
  }
  
  private static async profileLoop(interval: number): Promise<void> {
    while (this.isMonitoring) {
      const snapshot = await this.takeSnapshot();
      this.snapshots.push(snapshot);
      
      // Analyze for leaks
      if (this.snapshots.length > 10) {
        const leak = this.detectMemoryLeak();
        if (leak) {
          console.warn('Potential memory leak detected:', leak);
          this.triggerCleanup(leak);
        }
        
        // Keep only recent snapshots
        this.snapshots = this.snapshots.slice(-10);
      }
      
      await this.sleep(interval);
    }
  }
  
  private static async takeSnapshot(): Promise<MemorySnapshot> {
    const memory = performance.memory;
    
    return {
      timestamp: Date.now(),
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      domNodes: document.getElementsByTagName('*').length,
      listeners: this.countEventListeners()
    };
  }
  
  private static detectMemoryLeak(): MemoryLeak | null {
    if (this.snapshots.length < 5) return null;
    
    const recent = this.snapshots.slice(-5);
    const growth = recent[4].usedJSHeapSize - recent[0].usedJSHeapSize;
    const growthRate = growth / recent[0].usedJSHeapSize;
    
    // Detect rapid memory growth (>50% in 5 snapshots)
    if (growthRate > 0.5) {
      return {
        type: 'rapid-growth',
        growthRate,
        suspectedCause: this.analyzeCause(recent)
      };
    }
    
    // Detect steady leak (continuous growth)
    const isMonotonic = recent.every((s, i) => 
      i === 0 || s.usedJSHeapSize > recent[i - 1].usedJSHeapSize
    );
    
    if (isMonotonic && growth > 10 * 1024 * 1024) { // 10MB
      return {
        type: 'steady-leak',
        totalGrowth: growth,
        suspectedCause: this.analyzeCause(recent)
      };
    }
    
    return null;
  }
  
  private static analyzeCause(snapshots: MemorySnapshot[]): string {
    const domGrowth = snapshots[4].domNodes - snapshots[0].domNodes;
    const listenerGrowth = snapshots[4].listeners - snapshots[0].listeners;
    
    if (domGrowth > 1000) {
      return `DOM nodes increased by ${domGrowth}`;
    }
    
    if (listenerGrowth > 100) {
      return `Event listeners increased by ${listenerGrowth}`;
    }
    
    return 'Unknown - check for retained objects';
  }
  
  private static triggerCleanup(leak: MemoryLeak): void {
    // Trigger garbage collection if available
    if (typeof (window as any).gc === 'function') {
      (window as any).gc();
    }
    
    // Emit cleanup event
    window.dispatchEvent(new CustomEvent('memory-cleanup-needed', {
      detail: leak
    }));
  }
}

interface MemorySnapshot {
  timestamp: number;
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  domNodes: number;
  listeners: number;
}

interface MemoryLeak {
  type: 'rapid-growth' | 'steady-leak';
  growthRate?: number;
  totalGrowth?: number;
  suspectedCause: string;
}
```

#### 2.3.2 대용량 데이터 처리
```typescript
// src/utils/data/StreamProcessor.ts
export class StreamProcessor {
  static async* processLargeData<T>(
    data: T[],
    chunkSize = 100
  ): AsyncGenerator<T[], void, unknown> {
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      
      // Process chunk
      yield chunk;
      
      // Allow browser to breathe
      await this.yieldToMain();
    }
  }
  
  static async processInBatches<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    options: BatchOptions = {}
  ): Promise<R[]> {
    const {
      batchSize = 10,
      delay = 0,
      onProgress
    } = options;
    
    const results: R[] = [];
    const total = items.length;
    
    for (let i = 0; i < total; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      // Process batch in parallel
      const batchResults = await Promise.all(
        batch.map(processor)
      );
      
      results.push(...batchResults);
      
      // Report progress
      if (onProgress) {
        onProgress({
          processed: Math.min(i + batchSize, total),
          total,
          percentage: Math.min(100, ((i + batchSize) / total) * 100)
        });
      }
      
      // Delay between batches
      if (delay > 0 && i + batchSize < total) {
        await this.sleep(delay);
      }
      
      // Yield to main thread
      await this.yieldToMain();
    }
    
    return results;
  }
  
  private static yieldToMain(): Promise<void> {
    return new Promise(resolve => {
      if (typeof MessageChannel !== 'undefined') {
        const channel = new MessageChannel();
        const port = channel.port2;
        channel.port1.onmessage = () => resolve();
        port.postMessage(null);
      } else {
        setTimeout(resolve, 0);
      }
    });
  }
  
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

interface BatchOptions {
  batchSize?: number;
  delay?: number;
  onProgress?: (progress: ProgressInfo) => void;
}

interface ProgressInfo {
  processed: number;
  total: number;
  percentage: number;
}
```

#### 2.3.3 Object Pool 패턴
```typescript
// src/utils/memory/ObjectPool.ts
export class ObjectPool<T> {
  private pool: T[] = [];
  private inUse: Set<T> = new Set();
  private factory: () => T;
  private reset: (obj: T) => void;
  private maxSize: number;
  
  constructor(options: ObjectPoolOptions<T>) {
    this.factory = options.factory;
    this.reset = options.reset;
    this.maxSize = options.maxSize || 100;
    
    // Pre-allocate minimum objects
    const minSize = options.minSize || 10;
    for (let i = 0; i < minSize; i++) {
      this.pool.push(this.factory());
    }
  }
  
  acquire(): T {
    let obj: T;
    
    if (this.pool.length > 0) {
      obj = this.pool.pop()!;
    } else {
      obj = this.factory();
    }
    
    this.inUse.add(obj);
    return obj;
  }
  
  release(obj: T): void {
    if (!this.inUse.has(obj)) {
      console.warn('Attempting to release object not from pool');
      return;
    }
    
    this.inUse.delete(obj);
    this.reset(obj);
    
    if (this.pool.length < this.maxSize) {
      this.pool.push(obj);
    }
  }
  
  clear(): void {
    this.pool = [];
    this.inUse.clear();
  }
  
  get stats(): PoolStats {
    return {
      available: this.pool.length,
      inUse: this.inUse.size,
      total: this.pool.length + this.inUse.size
    };
  }
}

interface ObjectPoolOptions<T> {
  factory: () => T;
  reset: (obj: T) => void;
  minSize?: number;
  maxSize?: number;
}

interface PoolStats {
  available: number;
  inUse: number;
  total: number;
}

// Usage example
const bufferPool = new ObjectPool<ArrayBuffer>({
  factory: () => new ArrayBuffer(1024 * 1024), // 1MB buffers
  reset: (buffer) => new Uint8Array(buffer).fill(0),
  minSize: 5,
  maxSize: 20
});
```

### 2.4 API 호출 최적화

#### 2.4.1 요청 배치 처리
```typescript
// src/infrastructure/api/BatchRequestManager.ts
export class BatchRequestManager {
  private queue: Map<string, RequestItem[]> = new Map();
  private batchTimer: number | null = null;
  private readonly batchDelay = 50; // ms
  private readonly maxBatchSize = 10;
  
  async addRequest<T>(
    endpoint: string,
    params: any,
    options: RequestOptions = {}
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const request: RequestItem = {
        params,
        resolve,
        reject,
        timestamp: Date.now(),
        priority: options.priority || 'normal'
      };
      
      // Add to queue
      if (!this.queue.has(endpoint)) {
        this.queue.set(endpoint, []);
      }
      this.queue.get(endpoint)!.push(request);
      
      // Schedule batch processing
      this.scheduleBatch(endpoint);
    });
  }
  
  private scheduleBatch(endpoint: string): void {
    if (this.batchTimer !== null) return;
    
    this.batchTimer = window.setTimeout(() => {
      this.processBatch(endpoint);
      this.batchTimer = null;
    }, this.batchDelay);
  }
  
  private async processBatch(endpoint: string): Promise<void> {
    const requests = this.queue.get(endpoint);
    if (!requests || requests.length === 0) return;
    
    // Sort by priority and timestamp
    requests.sort((a, b) => {
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      const priorityDiff = 
        priorityOrder[a.priority] - priorityOrder[b.priority];
      
      return priorityDiff !== 0 
        ? priorityDiff 
        : a.timestamp - b.timestamp;
    });
    
    // Process in batches
    while (requests.length > 0) {
      const batch = requests.splice(0, this.maxBatchSize);
      
      try {
        const results = await this.executeBatch(endpoint, batch);
        
        // Resolve individual promises
        batch.forEach((request, index) => {
          request.resolve(results[index]);
        });
      } catch (error) {
        // Reject all promises in failed batch
        batch.forEach(request => {
          request.reject(error);
        });
      }
    }
    
    // Clear queue for this endpoint
    this.queue.delete(endpoint);
  }
  
  private async executeBatch(
    endpoint: string,
    batch: RequestItem[]
  ): Promise<any[]> {
    const batchRequest = {
      endpoint,
      requests: batch.map(item => item.params)
    };
    
    const response = await fetch('/api/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(batchRequest)
    });
    
    if (!response.ok) {
      throw new Error(`Batch request failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.results;
  }
}

interface RequestItem {
  params: any;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  timestamp: number;
  priority: 'high' | 'normal' | 'low';
}

interface RequestOptions {
  priority?: 'high' | 'normal' | 'low';
}
```

#### 2.4.2 캐싱 전략
```typescript
// src/infrastructure/cache/SmartCache.ts
export class SmartCache {
  private memoryCache: LRUCache<string, CacheEntry>;
  private persistentCache: IDBCache;
  private cacheStrategy: CacheStrategy;
  
  constructor(options: SmartCacheOptions = {}) {
    this.memoryCache = new LRUCache({
      maxSize: options.maxMemoryItems || 100,
      ttl: options.defaultTTL || 5 * 60 * 1000 // 5 minutes
    });
    
    this.persistentCache = new IDBCache({
      dbName: options.dbName || 'app-cache',
      storeName: options.storeName || 'cache-store'
    });
    
    this.cacheStrategy = options.strategy || new NetworkFirstStrategy();
  }
  
  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const strategy = options.strategy || this.cacheStrategy;
    
    return strategy.execute({
      key,
      fetcher,
      memoryCache: this.memoryCache,
      persistentCache: this.persistentCache,
      options
    });
  }
  
  async invalidate(pattern: string | RegExp): Promise<void> {
    // Invalidate memory cache
    this.memoryCache.invalidate(pattern);
    
    // Invalidate persistent cache
    await this.persistentCache.invalidate(pattern);
  }
  
  async preload<T>(
    entries: Array<{ key: string; fetcher: () => Promise<T> }>
  ): Promise<void> {
    await Promise.all(
      entries.map(({ key, fetcher }) => 
        this.get(key, fetcher, { 
          strategy: new CacheOnlyStrategy() 
        }).catch(() => {
          // Preload in background, ignore errors
        })
      )
    );
  }
}

// Cache Strategies
abstract class CacheStrategy {
  abstract execute<T>(context: StrategyContext<T>): Promise<T>;
}

class NetworkFirstStrategy extends CacheStrategy {
  async execute<T>(context: StrategyContext<T>): Promise<T> {
    try {
      const data = await context.fetcher();
      
      // Update caches
      context.memoryCache.set(context.key, {
        data,
        timestamp: Date.now()
      });
      
      await context.persistentCache.set(context.key, data);
      
      return data;
    } catch (error) {
      // Fallback to cache
      const cached = context.memoryCache.get(context.key);
      if (cached) return cached.data;
      
      const persistent = await context.persistentCache.get(context.key);
      if (persistent) return persistent;
      
      throw error;
    }
  }
}

class CacheFirstStrategy extends CacheStrategy {
  async execute<T>(context: StrategyContext<T>): Promise<T> {
    // Check memory cache
    const cached = context.memoryCache.get(context.key);
    if (cached && !this.isStale(cached, context.options)) {
      return cached.data;
    }
    
    // Check persistent cache
    const persistent = await context.persistentCache.get(context.key);
    if (persistent) {
      // Promote to memory cache
      context.memoryCache.set(context.key, {
        data: persistent,
        timestamp: Date.now()
      });
      return persistent;
    }
    
    // Fetch from network
    const data = await context.fetcher();
    
    // Update caches
    context.memoryCache.set(context.key, {
      data,
      timestamp: Date.now()
    });
    
    await context.persistentCache.set(context.key, data);
    
    return data;
  }
  
  private isStale(entry: CacheEntry, options: CacheOptions): boolean {
    const maxAge = options.maxAge || 5 * 60 * 1000; // 5 minutes
    return Date.now() - entry.timestamp > maxAge;
  }
}

// LRU Cache Implementation
class LRUCache<K, V> {
  private cache: Map<K, V> = new Map();
  private maxSize: number;
  private ttl: number;
  
  constructor(options: LRUCacheOptions) {
    this.maxSize = options.maxSize;
    this.ttl = options.ttl;
  }
  
  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }
  
  set(key: K, value: V): void {
    // Remove if exists (to update position)
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    
    // Check size limit
    if (this.cache.size >= this.maxSize) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, value);
  }
  
  invalidate(pattern: string | RegExp): void {
    for (const key of this.cache.keys()) {
      const keyStr = String(key);
      if (typeof pattern === 'string' 
        ? keyStr.includes(pattern)
        : pattern.test(keyStr)) {
        this.cache.delete(key);
      }
    }
  }
}
```

#### 2.4.3 재시도 로직 개선
```typescript
// src/infrastructure/api/EnhancedRetryManager.ts
export class EnhancedRetryManager {
  private static readonly strategies = {
    exponential: (attempt: number) => Math.min(1000 * 2 ** attempt, 30000),
    linear: (attempt: number) => 1000 * attempt,
    fibonacci: (attempt: number) => this.fibonacci(attempt) * 1000,
    custom: (attempt: number, fn?: (n: number) => number) => 
      fn ? fn(attempt) : 1000
  };
  
  static async withRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const {
      maxAttempts = 3,
      strategy = 'exponential',
      shouldRetry = this.defaultShouldRetry,
      onRetry,
      signal
    } = options;
    
    let lastError: Error;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        // Check cancellation
        if (signal?.aborted) {
          throw new Error('Operation cancelled');
        }
        
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Check if should retry
        if (!shouldRetry(error, attempt)) {
          throw error;
        }
        
        // Last attempt - don't delay
        if (attempt === maxAttempts - 1) {
          throw error;
        }
        
        // Calculate delay
        const delay = this.strategies[strategy](
          attempt,
          options.customStrategy
        );
        
        // Add jitter to avoid thundering herd
        const jitteredDelay = this.addJitter(delay, options.jitter);
        
        // Notify retry
        if (onRetry) {
          onRetry({
            attempt: attempt + 1,
            delay: jitteredDelay,
            error: lastError
          });
        }
        
        // Wait before retry
        await this.delay(jitteredDelay, signal);
      }
    }
    
    throw lastError!;
  }
  
  private static defaultShouldRetry(error: any, attempt: number): boolean {
    // Network errors
    if (error.name === 'NetworkError' || error.code === 'ECONNREFUSED') {
      return true;
    }
    
    // HTTP status codes
    if (error.status) {
      // Retry on 5xx errors and specific 4xx errors
      const retryableStatuses = [408, 429, 500, 502, 503, 504];
      return retryableStatuses.includes(error.status);
    }
    
    // Timeout errors
    if (error.name === 'TimeoutError' || error.code === 'ETIMEDOUT') {
      return attempt < 2; // Limit timeout retries
    }
    
    return false;
  }
  
  private static addJitter(delay: number, jitter = 0.1): number {
    const jitterAmount = delay * jitter;
    return delay + Math.random() * jitterAmount * 2 - jitterAmount;
  }
  
  private static delay(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, ms);
      
      if (signal) {
        signal.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new Error('Delay cancelled'));
        });
      }
    });
  }
  
  private static fibonacci(n: number): number {
    if (n <= 1) return 1;
    let a = 1, b = 1;
    for (let i = 2; i <= n; i++) {
      [a, b] = [b, a + b];
    }
    return b;
  }
}

interface RetryOptions {
  maxAttempts?: number;
  strategy?: 'exponential' | 'linear' | 'fibonacci' | 'custom';
  customStrategy?: (attempt: number) => number;
  shouldRetry?: (error: any, attempt: number) => boolean;
  onRetry?: (info: RetryInfo) => void;
  jitter?: number;
  signal?: AbortSignal;
}

interface RetryInfo {
  attempt: number;
  delay: number;
  error: Error;
}
```

## 3. 벤치마크 기준

### 3.1 성능 메트릭
```typescript
export interface PerformanceMetrics {
  // Bundle metrics
  bundle: {
    totalSize: number; // Target: < 300KB
    initialLoad: number; // Target: < 150KB
    lazyChunks: number; // Target: > 5 chunks
  };
  
  // Loading metrics
  loading: {
    ttfb: number; // Time to First Byte - Target: < 200ms
    fcp: number; // First Contentful Paint - Target: < 1s
    tti: number; // Time to Interactive - Target: < 2s
    lcp: number; // Largest Contentful Paint - Target: < 2.5s
  };
  
  // Runtime metrics
  runtime: {
    memoryUsage: number; // Target: < 50MB average
    memoryPeak: number; // Target: < 100MB peak
    gcFrequency: number; // Target: < 1 per minute
    gcDuration: number; // Target: < 50ms
  };
  
  // API metrics
  api: {
    avgLatency: number; // Target: < 100ms
    p95Latency: number; // Target: < 500ms
    throughput: number; // Target: > 100 req/s
    errorRate: number; // Target: < 0.1%
  };
}
```

### 3.2 측정 도구
```typescript
// src/utils/performance/PerformanceBenchmark.ts
export class PerformanceBenchmark {
  private static metrics: Map<string, Metric[]> = new Map();
  
  static measure(name: string, fn: () => void): number {
    const start = performance.now();
    fn();
    const duration = performance.now() - start;
    
    this.recordMetric(name, duration);
    return duration;
  }
  
  static async measureAsync(
    name: string, 
    fn: () => Promise<void>
  ): Promise<number> {
    const start = performance.now();
    await fn();
    const duration = performance.now() - start;
    
    this.recordMetric(name, duration);
    return duration;
  }
  
  static recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    this.metrics.get(name)!.push({
      value,
      timestamp: Date.now()
    });
    
    // Keep only last 100 measurements
    const metrics = this.metrics.get(name)!;
    if (metrics.length > 100) {
      metrics.shift();
    }
  }
  
  static getStats(name: string): Stats | null {
    const metrics = this.metrics.get(name);
    if (!metrics || metrics.length === 0) return null;
    
    const values = metrics.map(m => m.value);
    values.sort((a, b) => a - b);
    
    return {
      min: values[0],
      max: values[values.length - 1],
      mean: values.reduce((a, b) => a + b, 0) / values.length,
      median: values[Math.floor(values.length / 2)],
      p95: values[Math.floor(values.length * 0.95)],
      p99: values[Math.floor(values.length * 0.99)],
      count: values.length
    };
  }
  
  static generateReport(): BenchmarkReport {
    const report: BenchmarkReport = {
      timestamp: Date.now(),
      metrics: {}
    };
    
    for (const [name, metrics] of this.metrics) {
      report.metrics[name] = this.getStats(name)!;
    }
    
    return report;
  }
}

interface Metric {
  value: number;
  timestamp: number;
}

interface Stats {
  min: number;
  max: number;
  mean: number;
  median: number;
  p95: number;
  p99: number;
  count: number;
}

interface BenchmarkReport {
  timestamp: number;
  metrics: Record<string, Stats>;
}
```

## 4. 구현 우선순위

### Phase 1: 즉시 구현 (1주)
1. **번들 최적화**
   - Tree shaking 설정
   - 코드 스플리팅 기본 구현
   - 번들 분석 도구 추가

2. **기본 캐싱**
   - 메모리 캐시 구현
   - API 응답 캐싱

3. **메모리 모니터링**
   - 메모리 프로파일러 구현
   - 누수 감지 시스템

### Phase 2: 단기 구현 (2주)
1. **Lazy Loading**
   - 컴포넌트 지연 로드
   - 리소스 프리로딩

2. **배치 처리**
   - API 요청 배치
   - 데이터 스트림 처리

3. **고급 캐싱**
   - IndexedDB 영구 캐시
   - 캐시 전략 패턴

### Phase 3: 중기 구현 (1개월)
1. **Object Pool**
   - 재사용 가능 객체 풀
   - 메모리 최적화

2. **고급 재시도**
   - 적응형 재시도 전략
   - Circuit breaker 패턴

3. **성능 대시보드**
   - 실시간 메트릭 표시
   - 벤치마크 자동화

## 5. 예상 성과

### 5.1 번들 사이즈
- 초기 번들: 500KB → 150KB (70% 감소)
- 총 번들: 500KB → 400KB (20% 감소)
- 지연 로드 청크: 0 → 10개

### 5.2 로딩 성능
- TTFB: 500ms → 200ms (60% 개선)
- FCP: 2s → 1s (50% 개선)
- TTI: 4s → 2s (50% 개선)

### 5.3 런타임 성능
- 평균 메모리: 30MB → 20MB (33% 감소)
- GC 빈도: 1/30s → 1/60s (50% 감소)
- 응답 시간: 100ms → 50ms (50% 개선)

### 5.4 API 성능
- 요청 수: 100/min → 20/min (80% 감소)
- 캐시 히트율: 0% → 70%
- 에러율: 1% → 0.1% (90% 감소)

## 6. 리스크 및 완화 전략

### 6.1 리스크
1. **과도한 최적화로 인한 복잡도 증가**
   - 완화: 점진적 적용, 충분한 테스트

2. **브라우저 호환성 문제**
   - 완화: 폴리필 제공, 기능 감지

3. **캐시 무효화 문제**
   - 완화: 버전 기반 캐시 키, TTL 설정

### 6.2 모니터링
- 성능 메트릭 실시간 추적
- 에러 로깅 및 알림
- 사용자 피드백 수집

## 7. 결론

Phase 4 Task 4.3의 성능 최적화 설계는 기존의 개선사항을 기반으로 추가적인 최적화를 통해 사용자 경험을 극대화합니다. 번들 최적화, 로딩 개선, 메모리 관리, API 최적화를 통해 전반적인 성능을 50-70% 향상시킬 수 있을 것으로 예상됩니다.

구현은 우선순위에 따라 단계적으로 진행되며, 각 단계에서 측정 가능한 성과를 달성하도록 설계되었습니다.