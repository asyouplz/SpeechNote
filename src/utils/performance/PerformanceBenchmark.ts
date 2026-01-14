/**
 * PerformanceBenchmark - Phase 4 Performance Optimization
 * 
 * 성능 측정 및 벤치마크 도구
 * - 실행 시간 측정
 * - 메트릭 수집 및 분석
 * - 성능 리포트 생성
 */

export interface Metric {
    name: string;
    value: number;
    timestamp: number;
    metadata?: Record<string, unknown>;
}

export interface Stats {
    min: number;
    max: number;
    mean: number;
    median: number;
    p95: number;
    p99: number;
    stdDev: number;
    count: number;
}

export interface BenchmarkReport {
    timestamp: number;
    metrics: Record<string, Stats>;
    summary: {
        totalMeasurements: number;
        duration: number;
        passed: number;
        failed: number;
    };
    recommendations: string[];
}

export interface PerformanceThresholds {
    [metricName: string]: {
        target: number;
        warning: number;
        critical: number;
    };
}

type PerformanceMemory = {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
};

export class PerformanceBenchmark {
    private static metrics = new Map<string, Metric[]>();
    private static marks = new Map<string, number>();
    private static observers: PerformanceObserver[] = [];
    private static thresholds: PerformanceThresholds = {};

    /**
     * 성능 측정 시작
     */
    static mark(name: string): void {
        this.marks.set(name, performance.now());
        performance.mark(name);
    }

    /**
     * 성능 측정 종료 및 기록
     */
    static measure(name: string, startMark?: string, endMark?: string): number {
        let duration: number;
        
        if (startMark && endMark) {
            performance.measure(name, startMark, endMark);
            const entries = performance.getEntriesByName(name, 'measure');
            duration = entries[entries.length - 1]?.duration || 0;
        } else if (startMark) {
            const start = this.marks.get(startMark);
            if (start) {
                duration = performance.now() - start;
                performance.measure(name, startMark);
            } else {
                duration = 0;
            }
        } else {
            // 즉시 측정
            const start = this.marks.get(name);
            if (start) {
                duration = performance.now() - start;
                this.marks.delete(name);
            } else {
                duration = 0;
            }
        }
        
        this.recordMetric(name, duration);
        return duration;
    }

    /**
     * 함수 실행 시간 측정
     */
    static measureSync<T>(name: string, fn: () => T): T {
        const start = performance.now();
        try {
            const result = fn();
            const duration = performance.now() - start;
            this.recordMetric(name, duration);
            return result;
        } catch (error) {
            const duration = performance.now() - start;
            this.recordMetric(name, duration, { error: true });
            throw error;
        }
    }

    /**
     * 비동기 함수 실행 시간 측정
     */
    static async measureAsync<T>(
        name: string,
        fn: () => Promise<T>
    ): Promise<T> {
        const start = performance.now();
        try {
            const result = await fn();
            const duration = performance.now() - start;
            this.recordMetric(name, duration);
            return result;
        } catch (error) {
            const duration = performance.now() - start;
            this.recordMetric(name, duration, { error: true });
            throw error;
        }
    }

    /**
     * 메트릭 기록
     */
    static recordMetric(
        name: string,
        value: number,
        metadata?: Record<string, unknown>
    ): void {
        if (!this.metrics.has(name)) {
            this.metrics.set(name, []);
        }
        
        const metric: Metric = {
            name,
            value,
            timestamp: Date.now(),
            metadata
        };
        
        const metrics = this.metrics.get(name)!;
        metrics.push(metric);
        
        // 최대 1000개까지만 유지
        if (metrics.length > 1000) {
            metrics.shift();
        }
        
        // 임계값 체크
        this.checkThreshold(name, value);
    }

    /**
     * 통계 계산
     */
    static getStats(name: string): Stats | null {
        const metrics = this.metrics.get(name);
        if (!metrics || metrics.length === 0) return null;
        
        const values = metrics.map(m => m.value);
        values.sort((a, b) => a - b);
        
        const sum = values.reduce((a, b) => a + b, 0);
        const mean = sum / values.length;
        
        // 표준편차 계산
        const squareDiffs = values.map(value => Math.pow(value - mean, 2));
        const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
        const stdDev = Math.sqrt(avgSquareDiff);
        
        return {
            min: values[0],
            max: values[values.length - 1],
            mean,
            median: values[Math.floor(values.length / 2)],
            p95: values[Math.floor(values.length * 0.95)],
            p99: values[Math.floor(values.length * 0.99)],
            stdDev,
            count: values.length
        };
    }

    /**
     * 모든 메트릭 통계
     */
    static getAllStats(): Record<string, Stats> {
        const allStats: Record<string, Stats> = {};
        
        for (const [name] of this.metrics) {
            const stats = this.getStats(name);
            if (stats) {
                allStats[name] = stats;
            }
        }
        
        return allStats;
    }

    /**
     * 벤치마크 리포트 생성
     */
    static generateReport(): BenchmarkReport {
        const allStats = this.getAllStats();
        const recommendations: string[] = [];
        let totalMeasurements = 0;
        let passed = 0;
        let failed = 0;
        
        // 각 메트릭 분석
        for (const [name, stats] of Object.entries(allStats)) {
            totalMeasurements += stats.count;
            
            const threshold = this.thresholds[name];
            if (threshold) {
                if (stats.mean > threshold.critical) {
                    failed++;
                    recommendations.push(
                        `⚠️ ${name}: Mean time ${stats.mean.toFixed(2)}ms exceeds critical threshold ${threshold.critical}ms`
                    );
                } else if (stats.mean > threshold.warning) {
                    recommendations.push(
                        `⚡ ${name}: Mean time ${stats.mean.toFixed(2)}ms exceeds warning threshold ${threshold.warning}ms`
                    );
                } else if (stats.mean <= threshold.target) {
                    passed++;
                }
            }
        }
        
        // 일반 권장사항
        if (recommendations.length === 0) {
            recommendations.push('✅ All performance metrics within acceptable range');
        }
        
        // 시작과 끝 시간 계산
        let minTime = Infinity;
        let maxTime = -Infinity;
        
        for (const metrics of this.metrics.values()) {
            for (const metric of metrics) {
                minTime = Math.min(minTime, metric.timestamp);
                maxTime = Math.max(maxTime, metric.timestamp);
            }
        }
        
        return {
            timestamp: Date.now(),
            metrics: allStats,
            summary: {
                totalMeasurements,
                duration: maxTime - minTime,
                passed,
                failed
            },
            recommendations
        };
    }

    /**
     * 임계값 설정
     */
    static setThreshold(
        name: string,
        target: number,
        warning: number,
        critical: number
    ): void {
        this.thresholds[name] = { target, warning, critical };
    }

    /**
     * Phase 4 성능 목표 설정
     */
    static setPhase4Thresholds(): void {
        // API 응답 시간
        this.setThreshold('api.response', 100, 300, 500);
        
        // 파일 처리
        this.setThreshold('file.validation', 200, 500, 1000);
        this.setThreshold('file.upload', 2000, 5000, 10000);
        
        // UI 상호작용
        this.setThreshold('ui.modal.open', 50, 150, 300);
        this.setThreshold('ui.tab.switch', 30, 100, 200);
        
        // 메모리 작업
        this.setThreshold('cache.get', 1, 5, 10);
        this.setThreshold('cache.set', 2, 10, 20);
    }

    /**
     * 임계값 체크
     */
    private static checkThreshold(name: string, value: number): void {
        const threshold = this.thresholds[name];
        if (!threshold) return;
        
        if (value > threshold.critical) {
            console.error(`Performance critical: ${name} = ${value.toFixed(2)}ms (threshold: ${threshold.critical}ms)`);
        } else if (value > threshold.warning) {
            console.warn(`Performance warning: ${name} = ${value.toFixed(2)}ms (threshold: ${threshold.warning}ms)`);
        }
    }

    /**
     * Performance Observer 설정
     */
    static observePerformance(types: string[]): void {
        if (!('PerformanceObserver' in window)) {
            console.warn('PerformanceObserver not supported');
            return;
        }
        
        types.forEach(type => {
            try {
                const observer = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        this.recordMetric(
                            `${type}.${entry.name}`,
                            entry.duration,
                            {
                                entryType: entry.entryType,
                                startTime: entry.startTime
                            }
                        );
                    }
                });
                
                observer.observe({ entryTypes: [type] });
                this.observers.push(observer);
            } catch (error) {
                console.warn(`Failed to observe ${type}:`, error);
            }
        });
    }

    /**
     * Web Vitals 측정
     */
    static measureWebVitals(): void {
        // First Contentful Paint (FCP)
        this.observePerformance(['paint']);
        
        // Largest Contentful Paint (LCP)
        this.observePerformance(['largest-contentful-paint']);
        
        // First Input Delay (FID)
        this.observePerformance(['first-input']);
        
        // Cumulative Layout Shift (CLS)
        let clsValue = 0;
        type LayoutShiftEntry = PerformanceEntry & { value: number; hadRecentInput: boolean };
        const clsObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                const layoutEntry = entry as LayoutShiftEntry;
                if (!layoutEntry.hadRecentInput) {
                    clsValue += layoutEntry.value;
                    this.recordMetric('cls', clsValue);
                }
            }
        });
        
        try {
            clsObserver.observe({ type: 'layout-shift', buffered: true });
            this.observers.push(clsObserver);
        } catch (error) {
            console.warn('Layout shift observation not supported');
        }
    }

    /**
     * 메모리 사용량 측정
     */
    static measureMemory(): void {
        if (!('memory' in performance)) {
            console.warn('Performance.memory not available');
            return;
        }
        
        const memory = (performance as Performance & { memory?: PerformanceMemory }).memory;
        if (!memory) {
            console.warn('Performance.memory not available');
            return;
        }

        this.recordMetric('memory.used', memory.usedJSHeapSize);
        this.recordMetric('memory.total', memory.totalJSHeapSize);
        this.recordMetric('memory.limit', memory.jsHeapSizeLimit);
    }

    /**
     * 네트워크 타이밍 측정
     */
    static measureNetworkTiming(): void {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        if (navigation) {
            // DNS 조회 시간
            this.recordMetric('network.dns', 
                navigation.domainLookupEnd - navigation.domainLookupStart);
            
            // TCP 연결 시간
            this.recordMetric('network.tcp',
                navigation.connectEnd - navigation.connectStart);
            
            // TTFB (Time to First Byte)
            this.recordMetric('network.ttfb',
                navigation.responseStart - navigation.requestStart);
            
            // 다운로드 시간
            this.recordMetric('network.download',
                navigation.responseEnd - navigation.responseStart);
            
            // 전체 로드 시간
            this.recordMetric('network.total',
                navigation.loadEventEnd - navigation.fetchStart);
        }
    }

    /**
     * 커스텀 타이밍 측정
     */
    static time(label: string): () => void {
        const start = performance.now();
        
        return () => {
            const duration = performance.now() - start;
            this.recordMetric(label, duration);
        };
    }

    /**
     * 메트릭 초기화
     */
    static clear(name?: string): void {
        if (name) {
            this.metrics.delete(name);
        } else {
            this.metrics.clear();
        }
        this.marks.clear();
    }

    /**
     * 정리
     */
    static destroy(): void {
        this.observers.forEach(observer => observer.disconnect());
        this.observers = [];
        this.clear();
    }
}

/**
 * 성능 측정 데코레이터
 */
export function Benchmark(name?: string) {
    return function (
        target: object,
        propertyName: string,
        descriptor: PropertyDescriptor
    ) {
        const originalMethod = descriptor.value;
        const metricName = name || `${target.constructor.name}.${propertyName}`;
        
        if (originalMethod.constructor.name === 'AsyncFunction') {
            descriptor.value = async function (...args: unknown[]) {
                return PerformanceBenchmark.measureAsync(
                    metricName,
                    () => originalMethod.apply(this, args)
                );
            };
        } else {
            descriptor.value = function (...args: unknown[]) {
                return PerformanceBenchmark.measureSync(
                    metricName,
                    () => originalMethod.apply(this, args)
                );
            };
        }
        
        return descriptor;
    };
}

// Phase 4 성능 목표 초기화
PerformanceBenchmark.setPhase4Thresholds();
