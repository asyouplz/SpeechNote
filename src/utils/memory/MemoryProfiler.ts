/**
 * MemoryProfiler - Phase 4 Performance Optimization
 *
 * 실시간 메모리 모니터링 및 누수 감지
 * - 메모리 사용량 추적
 * - 누수 패턴 감지
 * - 자동 정리 트리거
 */

export interface MemorySnapshot {
    timestamp: number;
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
    domNodes: number;
    listeners: number;
    detachedNodes?: number;
}

export interface MemoryLeak {
    type: 'rapid-growth' | 'steady-leak' | 'dom-leak' | 'listener-leak';
    severity: 'low' | 'medium' | 'high' | 'critical';
    growthRate?: number;
    totalGrowth?: number;
    suspectedCause: string;
    recommendation: string;
}

export interface MemoryReport {
    currentUsage: MemorySnapshot;
    trend: 'stable' | 'growing' | 'shrinking';
    leaks: MemoryLeak[];
    recommendations: string[];
    healthScore: number; // 0-100
}

export class MemoryProfiler {
    private static instance: MemoryProfiler | null = null;
    private snapshots: MemorySnapshot[] = [];
    private isMonitoring = false;
    private monitoringInterval?: number;
    private readonly maxSnapshots = 100;
    private readonly snapshotInterval: number;
    private leakCallbacks: ((leak: MemoryLeak) => void)[] = [];

    private constructor(snapshotInterval = 5000) {
        this.snapshotInterval = snapshotInterval;

        // Performance Memory API 지원 확인
        if (!this.isSupported()) {
            console.warn('Performance Memory API not supported');
        }
    }

    /**
     * 싱글톤 인스턴스 반환
     */
    static getInstance(snapshotInterval?: number): MemoryProfiler {
        if (!this.instance) {
            this.instance = new MemoryProfiler(snapshotInterval);
        }
        return this.instance;
    }

    /**
     * 메모리 모니터링 시작
     */
    startProfiling(): void {
        if (this.isMonitoring || !this.isSupported()) return;

        this.isMonitoring = true;
        void this.profileLoop();

        if (process.env.NODE_ENV === 'development') {
            console.debug('Memory profiling started');
        }
    }

    /**
     * 메모리 모니터링 중지
     */
    stopProfiling(): void {
        if (!this.isMonitoring) return;

        this.isMonitoring = false;

        if (this.monitoringInterval) {
            clearTimeout(this.monitoringInterval);
            this.monitoringInterval = undefined;
        }

        if (process.env.NODE_ENV === 'development') {
            console.debug('Memory profiling stopped');
        }
    }

    /**
     * 프로파일링 루프
     */
    private async profileLoop(): Promise<void> {
        if (!this.isMonitoring) return;

        // 스냅샷 촬영
        const snapshot = await this.takeSnapshot();
        this.snapshots.push(snapshot);

        // 최대 스냅샷 수 유지
        if (this.snapshots.length > this.maxSnapshots) {
            this.snapshots.shift();
        }

        // 메모리 누수 감지
        if (this.snapshots.length >= 5) {
            const leaks = this.detectMemoryLeaks();

            if (leaks.length > 0) {
                this.handleMemoryLeaks(leaks);
            }
        }

        // 다음 스냅샷 스케줄
        this.monitoringInterval = window.setTimeout(() => {
            void this.profileLoop();
        }, this.snapshotInterval);
    }

    /**
     * 메모리 스냅샷 촬영
     */
    private takeSnapshot(): Promise<MemorySnapshot> {
        const memory = (
            performance as Performance & {
                memory?: {
                    totalJSHeapSize: number;
                    usedJSHeapSize: number;
                    jsHeapSizeLimit: number;
                };
            }
        ).memory;

        return Promise.resolve({
            timestamp: Date.now(),
            usedJSHeapSize: memory?.usedJSHeapSize || 0,
            totalJSHeapSize: memory?.totalJSHeapSize || 0,
            jsHeapSizeLimit: memory?.jsHeapSizeLimit || 0,
            domNodes: document.getElementsByTagName('*').length,
            listeners: this.countEventListeners(),
            detachedNodes: this.countDetachedNodes(),
        });
    }

    /**
     * 메모리 누수 감지
     */
    private detectMemoryLeaks(): MemoryLeak[] {
        const leaks: MemoryLeak[] = [];
        const recent = this.snapshots.slice(-10);

        if (recent.length < 5) return leaks;

        // 1. 급격한 메모리 증가 감지
        const rapidGrowth = this.detectRapidGrowth(recent);
        if (rapidGrowth) leaks.push(rapidGrowth);

        // 2. 지속적인 메모리 누수 감지
        const steadyLeak = this.detectSteadyLeak(recent);
        if (steadyLeak) leaks.push(steadyLeak);

        // 3. DOM 노드 누수 감지
        const domLeak = this.detectDOMLeaks(recent);
        if (domLeak) leaks.push(domLeak);

        // 4. 이벤트 리스너 누수 감지
        const listenerLeak = this.detectListenerLeaks(recent);
        if (listenerLeak) leaks.push(listenerLeak);

        return leaks;
    }

    /**
     * 급격한 메모리 증가 감지
     */
    private detectRapidGrowth(snapshots: MemorySnapshot[]): MemoryLeak | null {
        const first = snapshots[0];
        const last = snapshots[snapshots.length - 1];
        const growth = last.usedJSHeapSize - first.usedJSHeapSize;
        const growthRate = growth / first.usedJSHeapSize;

        // 50초 동안 50% 이상 증가
        if (growthRate > 0.5) {
            return {
                type: 'rapid-growth',
                severity: growthRate > 1 ? 'critical' : 'high',
                growthRate,
                totalGrowth: growth,
                suspectedCause: this.analyzeCause(snapshots),
                recommendation: 'Check for memory-intensive operations or infinite loops',
            };
        }

        return null;
    }

    /**
     * 지속적인 메모리 누수 감지
     */
    private detectSteadyLeak(snapshots: MemorySnapshot[]): MemoryLeak | null {
        // 모든 스냅샷이 이전보다 메모리 증가
        const isMonotonic = snapshots.every(
            (s, i) => i === 0 || s.usedJSHeapSize > snapshots[i - 1].usedJSHeapSize
        );

        if (isMonotonic) {
            const growth =
                snapshots[snapshots.length - 1].usedJSHeapSize - snapshots[0].usedJSHeapSize;

            if (growth > 5 * 1024 * 1024) {
                // 5MB 이상 증가
                return {
                    type: 'steady-leak',
                    severity: growth > 20 * 1024 * 1024 ? 'high' : 'medium',
                    totalGrowth: growth,
                    suspectedCause: 'Continuous memory allocation without release',
                    recommendation: 'Review object lifecycle and ensure proper cleanup',
                };
            }
        }

        return null;
    }

    /**
     * DOM 노드 누수 감지
     */
    private detectDOMLeaks(snapshots: MemorySnapshot[]): MemoryLeak | null {
        const first = snapshots[0];
        const last = snapshots[snapshots.length - 1];
        const domGrowth = last.domNodes - first.domNodes;

        if (domGrowth > 1000) {
            return {
                type: 'dom-leak',
                severity: domGrowth > 5000 ? 'high' : 'medium',
                totalGrowth: domGrowth,
                suspectedCause: `DOM nodes increased by ${domGrowth}`,
                recommendation: 'Check for detached DOM nodes or excessive element creation',
            };
        }

        // Detached nodes 체크
        if (last.detachedNodes && last.detachedNodes > 100) {
            return {
                type: 'dom-leak',
                severity: 'medium',
                totalGrowth: last.detachedNodes,
                suspectedCause: `${last.detachedNodes} detached DOM nodes detected`,
                recommendation: 'Remove references to detached DOM nodes',
            };
        }

        return null;
    }

    /**
     * 이벤트 리스너 누수 감지
     */
    private detectListenerLeaks(snapshots: MemorySnapshot[]): MemoryLeak | null {
        const first = snapshots[0];
        const last = snapshots[snapshots.length - 1];
        const listenerGrowth = last.listeners - first.listeners;

        if (listenerGrowth > 100) {
            return {
                type: 'listener-leak',
                severity: listenerGrowth > 500 ? 'high' : 'medium',
                totalGrowth: listenerGrowth,
                suspectedCause: `Event listeners increased by ${listenerGrowth}`,
                recommendation: 'Ensure event listeners are properly removed when not needed',
            };
        }

        return null;
    }

    /**
     * 누수 원인 분석
     */
    private analyzeCause(snapshots: MemorySnapshot[]): string {
        const first = snapshots[0];
        const last = snapshots[snapshots.length - 1];

        const domGrowth = last.domNodes - first.domNodes;
        const listenerGrowth = last.listeners - first.listeners;
        const heapGrowth = last.usedJSHeapSize - first.usedJSHeapSize;

        if (domGrowth > 500) {
            return `DOM nodes increased by ${domGrowth}`;
        }

        if (listenerGrowth > 50) {
            return `Event listeners increased by ${listenerGrowth}`;
        }

        if (heapGrowth > 10 * 1024 * 1024) {
            return `Heap memory increased by ${(heapGrowth / 1024 / 1024).toFixed(2)} MB`;
        }

        return 'Unknown - check for retained objects or closures';
    }

    /**
     * 메모리 누수 처리
     */
    private handleMemoryLeaks(leaks: MemoryLeak[]): void {
        leaks.forEach((leak) => {
            console.warn('Memory leak detected:', leak);

            // 콜백 실행
            this.leakCallbacks.forEach((callback) => callback(leak));

            // 심각한 누수의 경우 자동 정리 시도
            if (leak.severity === 'critical' || leak.severity === 'high') {
                this.triggerCleanup();
            }
        });
    }

    /**
     * 가비지 컬렉션 트리거
     */
    private triggerCleanup(): void {
        // Chrome의 경우 gc() 함수 사용 가능 (--expose-gc 플래그 필요)
        if (typeof (window as typeof window & { gc?: () => void }).gc === 'function') {
            (window as typeof window & { gc?: () => void }).gc?.();
            if (process.env.NODE_ENV === 'development') {
                console.debug('Garbage collection triggered');
            }
        }

        // 커스텀 정리 이벤트 발생
        window.dispatchEvent(new CustomEvent('memory-cleanup-needed'));
    }

    /**
     * 이벤트 리스너 수 계산
     */
    private countEventListeners(): number {
        let count = 0;
        const allElements = document.getElementsByTagName('*');

        // getEventListeners는 Chrome DevTools에서만 사용 가능
        // 대안으로 추정치 사용
        count = allElements.length * 2; // 평균적으로 요소당 2개의 리스너 가정

        return count;
    }

    /**
     * Detached DOM 노드 수 계산
     */
    private countDetachedNodes(): number {
        // 실제 구현은 복잡하므로 추정치 사용
        // Chrome DevTools의 Heap Profiler를 사용하면 정확한 수치 가능
        return 0;
    }

    /**
     * 메모리 리포트 생성
     */
    generateReport(): MemoryReport {
        const current = this.snapshots[this.snapshots.length - 1] || this.takeSnapshotSync();
        const leaks = this.detectMemoryLeaks();
        const trend = this.analyzeTrend();
        const healthScore = this.calculateHealthScore(current, leaks);
        const recommendations = this.generateRecommendations(current, leaks);

        return {
            currentUsage: current,
            trend,
            leaks,
            recommendations,
            healthScore,
        };
    }

    /**
     * 동기적 스냅샷 촬영
     */
    private takeSnapshotSync(): MemorySnapshot {
        const memory = (
            performance as Performance & {
                memory?: {
                    totalJSHeapSize: number;
                    usedJSHeapSize: number;
                    jsHeapSizeLimit: number;
                };
            }
        ).memory;

        return {
            timestamp: Date.now(),
            usedJSHeapSize: memory?.usedJSHeapSize || 0,
            totalJSHeapSize: memory?.totalJSHeapSize || 0,
            jsHeapSizeLimit: memory?.jsHeapSizeLimit || 0,
            domNodes: document.getElementsByTagName('*').length,
            listeners: this.countEventListeners(),
        };
    }

    /**
     * 메모리 사용 추세 분석
     */
    private analyzeTrend(): 'stable' | 'growing' | 'shrinking' {
        if (this.snapshots.length < 10) return 'stable';

        const recent = this.snapshots.slice(-10);
        const first = recent[0].usedJSHeapSize;
        const last = recent[recent.length - 1].usedJSHeapSize;
        const change = (last - first) / first;

        if (change > 0.1) return 'growing';
        if (change < -0.1) return 'shrinking';
        return 'stable';
    }

    /**
     * 헬스 스코어 계산
     */
    private calculateHealthScore(current: MemorySnapshot, leaks: MemoryLeak[]): number {
        let score = 100;

        // 메모리 사용률
        const usageRatio = current.usedJSHeapSize / current.jsHeapSizeLimit;
        if (usageRatio > 0.8) score -= 30;
        else if (usageRatio > 0.6) score -= 15;
        else if (usageRatio > 0.4) score -= 5;

        // 누수 심각도
        leaks.forEach((leak) => {
            switch (leak.severity) {
                case 'critical':
                    score -= 40;
                    break;
                case 'high':
                    score -= 25;
                    break;
                case 'medium':
                    score -= 15;
                    break;
                case 'low':
                    score -= 5;
                    break;
            }
        });

        // DOM 노드 수
        if (current.domNodes > 10000) score -= 20;
        else if (current.domNodes > 5000) score -= 10;
        else if (current.domNodes > 2000) score -= 5;

        return Math.max(0, Math.min(100, score));
    }

    /**
     * 권장사항 생성
     */
    private generateRecommendations(current: MemorySnapshot, leaks: MemoryLeak[]): string[] {
        const recommendations: string[] = [];

        // 메모리 사용률 기반
        const usageRatio = current.usedJSHeapSize / current.jsHeapSizeLimit;
        if (usageRatio > 0.8) {
            recommendations.push(
                'Critical: Memory usage above 80%. Consider restarting the application.'
            );
        } else if (usageRatio > 0.6) {
            recommendations.push('Warning: Memory usage above 60%. Monitor for potential issues.');
        }

        // DOM 노드 기반
        if (current.domNodes > 5000) {
            recommendations.push('Consider implementing virtual scrolling for large lists.');
            recommendations.push('Remove unused DOM elements from the document.');
        }

        // 누수 기반
        if (leaks.some((l) => l.type === 'listener-leak')) {
            recommendations.push('Use event delegation instead of individual listeners.');
            recommendations.push('Ensure all event listeners are removed when components unmount.');
        }

        if (leaks.some((l) => l.type === 'dom-leak')) {
            recommendations.push('Check for detached DOM nodes holding memory.');
            recommendations.push('Clear references to removed DOM elements.');
        }

        // 일반 권장사항
        if (recommendations.length === 0) {
            recommendations.push('Memory usage is healthy. Continue monitoring.');
        }

        return recommendations;
    }

    /**
     * 누수 감지 콜백 등록
     */
    onLeakDetected(callback: (leak: MemoryLeak) => void): void {
        this.leakCallbacks.push(callback);
    }

    /**
     * API 지원 여부 확인
     */
    private isSupported(): boolean {
        return 'memory' in performance;
    }

    /**
     * 통계 반환
     */
    getStats(): {
        snapshots: number;
        monitoring: boolean;
        lastSnapshot?: MemorySnapshot;
    } {
        return {
            snapshots: this.snapshots.length,
            monitoring: this.isMonitoring,
            lastSnapshot: this.snapshots[this.snapshots.length - 1],
        };
    }

    /**
     * 정리
     */
    destroy(): void {
        this.stopProfiling();
        this.snapshots = [];
        this.leakCallbacks = [];
        MemoryProfiler.instance = null;
    }
}

/**
 * 전역 메모리 프로파일러 인스턴스
 */
export const memoryProfiler = MemoryProfiler.getInstance();
