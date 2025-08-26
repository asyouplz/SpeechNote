# Phase 4 성능 벤치마크 기준

## 1. 벤치마크 카테고리

### 1.1 번들 사이즈 메트릭

| 메트릭 | 현재 (추정) | 목표 | 개선율 |
|--------|------------|------|--------|
| 초기 번들 크기 | 500KB | 150KB | 70% |
| 총 번들 크기 | 500KB | 400KB | 20% |
| 지연 로드 청크 | 0개 | 10개 | - |
| 압축률 (gzip) | 60% | 75% | 25% |
| 트리 쉐이킹 효율 | 50% | 90% | 80% |

**측정 방법:**
```bash
# 번들 분석
npm run build -- --analyze

# 크기 확인
ls -lh main.js

# gzip 압축 크기
gzip -c main.js | wc -c
```

### 1.2 로딩 성능 메트릭

| 메트릭 | 현재 | 목표 | 임계값 |
|--------|------|------|--------|
| TTFB (Time to First Byte) | 500ms | 200ms | 600ms |
| FCP (First Contentful Paint) | 2000ms | 1000ms | 2500ms |
| LCP (Largest Contentful Paint) | 3000ms | 2000ms | 4000ms |
| TTI (Time to Interactive) | 4000ms | 2000ms | 5000ms |
| CLS (Cumulative Layout Shift) | 0.15 | 0.05 | 0.1 |
| FID (First Input Delay) | 150ms | 50ms | 100ms |

**측정 도구:**
- Chrome DevTools Lighthouse
- Web Vitals Extension
- Performance Observer API

### 1.3 런타임 메모리 메트릭

| 메트릭 | 현재 | 목표 | 위험 수준 |
|--------|------|------|-----------|
| 초기 메모리 사용량 | 30MB | 20MB | 50MB |
| 평균 메모리 사용량 | 40MB | 25MB | 60MB |
| 피크 메모리 사용량 | 100MB | 60MB | 150MB |
| 메모리 누수율 | 5MB/hr | 0MB/hr | 10MB/hr |
| GC 빈도 | 2/min | 1/min | 5/min |
| GC 일시정지 시간 | 100ms | 50ms | 200ms |

**측정 코드:**
```typescript
// 메모리 모니터링
const memoryMonitor = {
  start(): void {
    setInterval(() => {
      const memory = performance.memory;
      console.log({
        used: (memory.usedJSHeapSize / 1024 / 1024).toFixed(2) + ' MB',
        total: (memory.totalJSHeapSize / 1024 / 1024).toFixed(2) + ' MB',
        limit: (memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2) + ' MB'
      });
    }, 5000);
  }
};
```

### 1.4 API 성능 메트릭

| 메트릭 | 현재 | 목표 | SLA |
|--------|------|------|-----|
| 평균 응답 시간 | 200ms | 100ms | 300ms |
| P50 응답 시간 | 150ms | 80ms | 200ms |
| P95 응답 시간 | 800ms | 400ms | 1000ms |
| P99 응답 시간 | 2000ms | 800ms | 3000ms |
| 처리량 (req/s) | 50 | 100 | 30 |
| 에러율 | 1% | 0.1% | 2% |
| 타임아웃율 | 0.5% | 0.05% | 1% |

**측정 방법:**
```typescript
// API 성능 추적
class APIPerformanceTracker {
  private metrics: number[] = [];
  
  async track<T>(apiCall: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      const result = await apiCall();
      const duration = performance.now() - start;
      this.metrics.push(duration);
      return result;
    } catch (error) {
      this.recordError(error);
      throw error;
    }
  }
  
  getStats() {
    const sorted = [...this.metrics].sort((a, b) => a - b);
    return {
      mean: sorted.reduce((a, b) => a + b, 0) / sorted.length,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }
}
```

## 2. 기능별 성능 기준

### 2.1 파일 처리

| 작업 | 파일 크기 | 현재 | 목표 | 최대 허용 |
|------|-----------|------|------|-----------|
| 파일 선택 모달 열기 | - | 200ms | 50ms | 300ms |
| 파일 검증 (10MB) | 10MB | 500ms | 200ms | 1000ms |
| 파일 업로드 (10MB) | 10MB | 3000ms | 2000ms | 5000ms |
| 오디오 처리 (5분) | ~50MB | 10000ms | 5000ms | 15000ms |
| 텍스트 변환 | - | 100ms | 30ms | 200ms |

### 2.2 UI 상호작용

| 작업 | 현재 | 목표 | 최대 허용 |
|------|------|------|-----------|
| 버튼 클릭 응답 | 100ms | 16ms | 100ms |
| 모달 열기/닫기 | 200ms | 50ms | 300ms |
| 탭 전환 | 150ms | 30ms | 200ms |
| 드래그 앤 드롭 | 50ms | 16ms | 100ms |
| 스크롤 성능 (FPS) | 30fps | 60fps | 24fps |
| 애니메이션 (FPS) | 30fps | 60fps | 24fps |

### 2.3 데이터 작업

| 작업 | 데이터 크기 | 현재 | 목표 | 최대 허용 |
|------|-------------|------|------|-----------|
| 설정 로드 | ~10KB | 50ms | 10ms | 100ms |
| 설정 저장 | ~10KB | 100ms | 20ms | 200ms |
| 히스토리 로드 (100개) | ~100KB | 300ms | 100ms | 500ms |
| 검색 (1000개 항목) | ~1MB | 200ms | 50ms | 300ms |
| 캐시 조회 | - | 10ms | 1ms | 20ms |

## 3. 자동화된 성능 테스트

### 3.1 성능 테스트 스크립트

```typescript
// tests/performance/benchmark.test.ts
import { PerformanceBenchmark } from '../../src/utils/performance/PerformanceBenchmark';

describe('Performance Benchmarks', () => {
  describe('Bundle Size', () => {
    test('Initial bundle should be under 150KB', async () => {
      const stats = await getBundleStats();
      expect(stats.initialSize).toBeLessThan(150 * 1024);
    });
    
    test('Total bundle should be under 400KB', async () => {
      const stats = await getBundleStats();
      expect(stats.totalSize).toBeLessThan(400 * 1024);
    });
  });
  
  describe('Loading Performance', () => {
    test('FCP should be under 1 second', async () => {
      const metrics = await measureLoadingMetrics();
      expect(metrics.fcp).toBeLessThan(1000);
    });
    
    test('TTI should be under 2 seconds', async () => {
      const metrics = await measureLoadingMetrics();
      expect(metrics.tti).toBeLessThan(2000);
    });
  });
  
  describe('Runtime Performance', () => {
    test('Memory usage should not exceed 50MB', async () => {
      const memory = await measureMemoryUsage();
      expect(memory.used).toBeLessThan(50 * 1024 * 1024);
    });
    
    test('No memory leaks after 100 operations', async () => {
      const initialMemory = getMemoryUsage();
      
      for (let i = 0; i < 100; i++) {
        await performOperation();
      }
      
      // Force garbage collection
      await forceGC();
      
      const finalMemory = getMemoryUsage();
      const leak = finalMemory - initialMemory;
      
      expect(leak).toBeLessThan(5 * 1024 * 1024); // Less than 5MB
    });
  });
  
  describe('API Performance', () => {
    test('Average API response time under 100ms', async () => {
      const times = [];
      
      for (let i = 0; i < 100; i++) {
        const start = performance.now();
        await makeAPICall();
        times.push(performance.now() - start);
      }
      
      const average = times.reduce((a, b) => a + b, 0) / times.length;
      expect(average).toBeLessThan(100);
    });
    
    test('P95 response time under 400ms', async () => {
      const times = await collectResponseTimes(100);
      times.sort((a, b) => a - b);
      
      const p95 = times[Math.floor(times.length * 0.95)];
      expect(p95).toBeLessThan(400);
    });
  });
});
```

### 3.2 CI/CD 통합

```yaml
# .github/workflows/performance.yml
name: Performance Testing

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  performance:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build production bundle
        run: npm run build
        
      - name: Analyze bundle size
        run: |
          npm run build -- --analyze
          node scripts/check-bundle-size.js
          
      - name: Run performance tests
        run: npm run test:performance
        
      - name: Generate performance report
        run: node scripts/generate-performance-report.js
        
      - name: Upload performance artifacts
        uses: actions/upload-artifact@v3
        with:
          name: performance-report
          path: |
            performance-report.html
            bundle-analysis.txt
            lighthouse-report.html
            
      - name: Comment PR with results
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const report = fs.readFileSync('performance-summary.md', 'utf8');
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: report
            });
```

## 4. 성능 모니터링 대시보드

### 4.1 실시간 메트릭

```typescript
// src/ui/dashboard/PerformanceDashboard.ts
export class PerformanceDashboard {
  private metrics: Map<string, any> = new Map();
  private updateInterval: number;
  
  constructor(private container: HTMLElement) {
    this.setupDashboard();
    this.startMonitoring();
  }
  
  private setupDashboard(): void {
    this.container.innerHTML = `
      <div class="perf-dashboard">
        <div class="perf-metric">
          <h3>Memory</h3>
          <div id="memory-chart"></div>
          <div id="memory-stats"></div>
        </div>
        <div class="perf-metric">
          <h3>API Performance</h3>
          <div id="api-chart"></div>
          <div id="api-stats"></div>
        </div>
        <div class="perf-metric">
          <h3>Frame Rate</h3>
          <div id="fps-chart"></div>
          <div id="fps-stats"></div>
        </div>
        <div class="perf-metric">
          <h3>Bundle Size</h3>
          <div id="bundle-stats"></div>
        </div>
      </div>
    `;
  }
  
  private startMonitoring(): void {
    this.updateInterval = window.setInterval(() => {
      this.updateMemoryMetrics();
      this.updateAPIMetrics();
      this.updateFPSMetrics();
    }, 1000);
  }
  
  private updateMemoryMetrics(): void {
    const memory = performance.memory;
    const used = memory.usedJSHeapSize / 1024 / 1024;
    const total = memory.totalJSHeapSize / 1024 / 1024;
    
    this.metrics.set('memory', { used, total });
    this.renderMemoryChart();
  }
  
  private updateAPIMetrics(): void {
    // Collect API metrics from APIPerformanceTracker
    const stats = APIPerformanceTracker.getStats();
    this.metrics.set('api', stats);
    this.renderAPIChart();
  }
  
  private updateFPSMetrics(): void {
    // Calculate FPS
    const fps = this.calculateFPS();
    this.metrics.set('fps', fps);
    this.renderFPSChart();
  }
  
  private calculateFPS(): number {
    let lastTime = performance.now();
    let frames = 0;
    let fps = 0;
    
    const measureFPS = () => {
      frames++;
      const currentTime = performance.now();
      
      if (currentTime >= lastTime + 1000) {
        fps = Math.round((frames * 1000) / (currentTime - lastTime));
        frames = 0;
        lastTime = currentTime;
      }
      
      requestAnimationFrame(measureFPS);
    };
    
    measureFPS();
    return fps;
  }
  
  destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }
}
```

## 5. 성능 목표 달성 전략

### 5.1 단계별 목표

#### Phase 1 (1주)
- [ ] 번들 크기 30% 감소
- [ ] 초기 로딩 시간 25% 개선
- [ ] 기본 메모리 모니터링 구현

#### Phase 2 (2주)
- [ ] 번들 크기 50% 감소
- [ ] TTI 40% 개선
- [ ] API 캐싱 구현

#### Phase 3 (1개월)
- [ ] 목표 성능 메트릭 100% 달성
- [ ] 자동화된 성능 테스트 구현
- [ ] 성능 대시보드 완성

### 5.2 성공 기준

1. **필수 달성 항목**
   - 초기 번들 < 150KB
   - TTI < 2초
   - 메모리 누수 0건

2. **권장 달성 항목**
   - FCP < 1초
   - P95 API 응답 < 400ms
   - 60 FPS 유지

3. **추가 개선 항목**
   - LCP < 1.5초
   - CLS < 0.03
   - 100 Lighthouse 점수

## 6. 벤치마크 실행 가이드

### 6.1 로컬 테스트

```bash
# 번들 크기 분석
npm run build:analyze

# 성능 테스트 실행
npm run test:performance

# 메모리 프로파일링
npm run profile:memory

# Lighthouse 테스트
npm run lighthouse
```

### 6.2 프로덕션 모니터링

```typescript
// 프로덕션 성능 모니터링
if (process.env.NODE_ENV === 'production') {
  // Web Vitals 수집
  import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
    getCLS(console.log);
    getFID(console.log);
    getFCP(console.log);
    getLCP(console.log);
    getTTFB(console.log);
  });
  
  // 에러 추적
  window.addEventListener('error', (event) => {
    trackError(event.error);
  });
  
  // 성능 추적
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      trackPerformance(entry);
    }
  }).observe({ entryTypes: ['navigation', 'resource', 'paint'] });
}
```

## 7. 결론

이 벤치마크 기준은 Phase 4의 성능 최적화 목표를 명확히 정의하고, 측정 가능한 지표를 제공합니다. 각 메트릭은 사용자 경험에 직접적인 영향을 미치며, 달성 시 전반적인 애플리케이션 성능이 크게 향상됩니다.