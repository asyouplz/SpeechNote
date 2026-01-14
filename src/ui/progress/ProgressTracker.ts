/**
 * Phase 3 진행 상태 추적 시스템
 * 
 * 계층적 진행 추적, ETA 예측, 취소 가능한 작업 관리를 제공합니다.
 */

import { EventEmitter } from 'events';
import { IProgressTracker, ProgressData, StepProgress, IProgressReporter } from '../../types/phase3-api';
import { EventManager } from '../../application/EventManager';

// Unsubscribe 타입 정의 (phase3-api에 정의되어 있으면 import로 변경)
type Unsubscribe = () => void;

/**
 * ETA 예측 알고리즘
 */
class ETAEstimator {
    private history: Array<{ timestamp: number; progress: number; rate: number }> = [];
    private smoothingFactor = 0.3; // 지수 평활 계수
    private maxHistorySize = 20;

    /**
     * ETA 계산
     */
    calculate(currentProgress: number, startTime: number): number | undefined {
        const elapsed = Date.now() - startTime;
        
        if (currentProgress === 0 || elapsed === 0) {
            return undefined;
        }

        const rate = currentProgress / elapsed;
        
        // 히스토리에 추가
        this.addToHistory({
            timestamp: Date.now(),
            progress: currentProgress,
            rate
        });

        if (this.history.length > 1) {
            // 지수 평활을 사용한 예측
            const smoothedRate = this.exponentialSmoothing(rate);
            const remaining = (100 - currentProgress) / smoothedRate;
            return Date.now() + remaining;
        }
        
        // 단순 선형 예측
        const remaining = (100 - currentProgress) / rate;
        return Date.now() + remaining;
    }

    /**
     * 지수 평활 적용
     */
    private exponentialSmoothing(currentRate: number): number {
        const lastEntry = this.history[this.history.length - 2];
        if (!lastEntry) return currentRate;
        
        const lastSmoothedRate = lastEntry.rate;
        return this.smoothingFactor * currentRate + (1 - this.smoothingFactor) * lastSmoothedRate;
    }

    /**
     * 히스토리에 추가
     */
    private addToHistory(entry: { timestamp: number; progress: number; rate: number }) {
        this.history.push(entry);
        
        // 히스토리 크기 제한
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        }
    }

    /**
     * 히스토리 초기화
     */
    reset() {
        this.history = [];
    }
}

/**
 * 단계별 진행 관리
 */
class StepManager {
    private steps: Map<string, StepProgress> = new Map();
    private stepWeights: Map<string, number> = new Map();
    private completedSteps: Set<string> = new Set();

    /**
     * 단계 추가
     */
    addStep(stepId: string, name: string, weight = 1) {
        this.steps.set(stepId, {
            id: stepId,
            name,
            progress: 0,
            status: 'pending'
        });
        this.stepWeights.set(stepId, weight);
    }

    /**
     * 단계 업데이트
     */
    updateStep(stepId: string, progress: number, message?: string): StepProgress | undefined {
        const step = this.steps.get(stepId);
        if (!step) return undefined;

        step.progress = Math.min(100, Math.max(0, progress));
        step.status = progress >= 100 ? 'completed' : 'running';
        
        if (message) {
            step.message = message;
        }

        if (progress >= 100) {
            this.completedSteps.add(stepId);
        }

        return step;
    }

    /**
     * 단계 완료
     */
    completeStep(stepId: string) {
        const step = this.steps.get(stepId);
        if (!step) return;

        step.progress = 100;
        step.status = 'completed';
        this.completedSteps.add(stepId);
    }

    /**
     * 단계 실패
     */
    failStep(stepId: string) {
        const step = this.steps.get(stepId);
        if (!step) return;

        step.status = 'failed';
    }

    /**
     * 전체 진행률 계산
     */
    calculateOverallProgress(): number {
        if (this.steps.size === 0) return 0;

        let totalWeightedProgress = 0;
        let totalWeight = 0;

        this.steps.forEach((step, stepId) => {
            const weight = this.stepWeights.get(stepId) || 1;
            totalWeightedProgress += step.progress * weight;
            totalWeight += weight;
        });

        return totalWeight > 0 ? totalWeightedProgress / totalWeight : 0;
    }

    /**
     * 모든 단계 가져오기
     */
    getAllSteps(): StepProgress[] {
        return Array.from(this.steps.values());
    }

    /**
     * 초기화
     */
    reset() {
        this.steps.clear();
        this.stepWeights.clear();
        this.completedSteps.clear();
    }
}

/**
 * 진행률 추적기 구현
 */
export class ProgressTracker implements IProgressTracker {
    private taskId: string;
    private totalSteps: number;
    private currentProgress = 0;
    private status: 'running' | 'paused' | 'completed' | 'failed' = 'running';
    private message = '';
    private startTime: number;
    private pausedTime = 0;
    private totalPausedDuration = 0;
    private estimator: ETAEstimator;
    private stepManager: StepManager;
    private eventManager: EventManager;
    private isPaused = false;
    private isCancelled = false;
    private emitter: EventEmitter;

    constructor(taskId: string, totalSteps = 100) {
        this.emitter = new EventEmitter();
        this.taskId = taskId;
        this.totalSteps = totalSteps;
        this.startTime = Date.now();
        this.estimator = new ETAEstimator();
        this.stepManager = new StepManager();
        this.eventManager = EventManager.getInstance();
    }

    /**
     * 진행률 업데이트
     */
    update(progress: number, message?: string): void {
        if (this.isCancelled || this.status === 'completed' || this.status === 'failed') {
            return;
        }

        this.currentProgress = Math.min(100, Math.max(0, progress));
        
        if (message) {
            this.message = message;
        }

        const data = this.getProgressData();
        
        this.emitter.emit('progress', data);
        this.eventManager.emit('progress:update', data);

        if (this.currentProgress >= 100) {
            this.complete();
        }
    }

    /**
     * 단계별 진행률 업데이트
     */
    updateStep(stepId: string, progress: number, message?: string): void {
        if (this.isCancelled || this.status === 'completed' || this.status === 'failed') {
            return;
        }

        const step = this.stepManager.updateStep(stepId, progress, message);
        if (!step) return;

        // 전체 진행률 재계산
        this.currentProgress = this.stepManager.calculateOverallProgress();
        
        const data = this.getProgressData();
        
        this.emitter.emit('progress', data);
        this.eventManager.emit('step:update', { stepId, step, overall: this.currentProgress });
    }

    /**
     * 진행률 증가
     */
    increment(delta = 1): void {
        this.update(this.currentProgress + delta);
    }

    /**
     * 상태 변경
     */
    setStatus(status: 'running' | 'paused' | 'completed' | 'failed'): void {
        const prevStatus = this.status;
        this.status = status;
        
        if (status === 'paused' && prevStatus === 'running') {
            this.pausedTime = Date.now();
            this.isPaused = true;
            this.emitter.emit('pause');
        } else if (status === 'running' && prevStatus === 'paused') {
            if (this.pausedTime > 0) {
                this.totalPausedDuration += Date.now() - this.pausedTime;
                this.pausedTime = 0;
            }
            this.isPaused = false;
            this.emitter.emit('resume');
        } else if (status === 'completed') {
            this.complete();
        } else if (status === 'failed') {
            this.fail();
        }
    }

    /**
     * 메시지 설정
     */
    setMessage(message: string): void {
        this.message = message;
        const data = this.getProgressData();
        this.emitter.emit('progress', data);
    }

    /**
     * 전체 단계 수 설정
     */
    setTotal(total: number): void {
        this.totalSteps = total;
    }

    /**
     * 단계 추가
     */
    addStep(stepId: string, name: string, weight = 1): void {
        this.stepManager.addStep(stepId, name, weight);
    }

    /**
     * 단계 완료
     */
    completeStep(stepId: string): void {
        this.stepManager.completeStep(stepId);
        this.currentProgress = this.stepManager.calculateOverallProgress();
        
        const data = this.getProgressData();
        this.emitter.emit('progress', data);
        
        if (this.currentProgress >= 100) {
            this.complete();
        }
    }

    /**
     * 단계 실패
     */
    failStep(stepId: string, error?: Error): void {
        this.stepManager.failStep(stepId);
        
        if (error) {
            this.emitter.emit('error', error);
            this.fail(error);
        }
    }

    /**
     * ETA 가져오기
     */
    getETA(): number | undefined {
        if (this.isPaused || this.currentProgress === 0) {
            return undefined;
        }
        
        const effectiveStartTime = this.startTime + this.totalPausedDuration;
        return this.estimator.calculate(this.currentProgress, effectiveStartTime);
    }

    /**
     * 남은 시간 가져오기
     */
    getRemainingTime(): number | undefined {
        const eta = this.getETA();
        if (!eta) return undefined;
        
        const remaining = eta - Date.now();
        return remaining > 0 ? remaining : undefined;
    }

    /**
     * 속도 가져오기 (진행률/초)
     */
    getSpeed(): number | undefined {
        const elapsed = this.getElapsedTime();
        if (elapsed === 0) return undefined;
        
        return (this.currentProgress / elapsed) * 1000; // 초당 진행률
    }

    /**
     * 경과 시간 가져오기
     */
    getElapsedTime(): number {
        const now = this.isPaused ? this.pausedTime : Date.now();
        return now - this.startTime - this.totalPausedDuration;
    }

    /**
     * 일시정지
     */
    pause(): void {
        if (this.status === 'running') {
            this.setStatus('paused');
        }
    }

    /**
     * 재개
     */
    resume(): void {
        if (this.status === 'paused') {
            this.setStatus('running');
        }
    }

    /**
     * 취소
     */
    cancel(): void {
        this.isCancelled = true;
        this.status = 'failed';
        this.emitter.emit('cancel');
        this.eventManager.emit('task:cancelled', { taskId: this.taskId });
    }

    /**
     * 완료 처리
     */
    private complete(result?: any): void {
        this.currentProgress = 100;
        this.status = 'completed';
        
        const data = this.getProgressData();
        
        this.emitter.emit('complete', result);
        this.emitter.emit('progress', data);
        this.eventManager.emit('task:completed', { taskId: this.taskId, result });
    }

    /**
     * 실패 처리
     */
    private fail(error?: Error): void {
        this.status = 'failed';
        
        if (error) {
            this.emitter.emit('error', error);
            this.eventManager.emit('task:failed', { taskId: this.taskId, error });
        }
    }

    /**
     * 진행 데이터 가져오기
     */
    private getProgressData(): ProgressData {
        return {
            taskId: this.taskId,
            overall: this.currentProgress,
            current: this.currentProgress,
            total: this.totalSteps,
            message: this.message,
            eta: this.getETA(),
            speed: this.getSpeed(),
            steps: this.stepManager.getAllSteps()
        };
    }

    /**
     * 이벤트 리스너 등록 (타입 안전한 구독)
     */
    on(event: 'progress', listener: (data: ProgressData) => void): Unsubscribe;
    on(event: 'complete', listener: (result?: any) => void): Unsubscribe;
    on(event: 'error', listener: (error: Error) => void): Unsubscribe;
    on(event: 'pause', listener: () => void): Unsubscribe;
    on(event: 'resume', listener: () => void): Unsubscribe;
    on(event: 'cancel', listener: () => void): Unsubscribe;
    on(event: string, listener: (...args: any[]) => void): Unsubscribe {
        this.emitter.on(event, listener);
        return () => this.emitter.off(event, listener);
    }

    /**
     * 모든 이벤트 리스너 제거
     */
    removeAllListeners(event?: string): void {
        if (event) {
            this.emitter.removeAllListeners(event);
        } else {
            this.emitter.removeAllListeners();
        }
    }
}

/**
 * 진행률 리포터 구현
 */
export class ProgressReporter implements IProgressReporter {
    constructor(private tracker: ProgressTracker) {}

    report(progress: number, message?: string): void {
        this.tracker.update(progress, message);
    }

    reportStep(step: string, progress: number): void {
        this.tracker.updateStep(step, progress);
    }
}

/**
 * 진행률 스택 관리
 */
export class ProgressStack {
    private stack: ProgressTracker[] = [];
    private activeTracker: ProgressTracker | null = null;

    /**
     * 새 추적기 추가
     */
    push(tracker: ProgressTracker): void {
        this.stack.push(tracker);
        this.activeTracker = tracker;
    }

    /**
     * 추적기 제거
     */
    pop(): ProgressTracker | undefined {
        const tracker = this.stack.pop();
        this.activeTracker = this.stack[this.stack.length - 1] || null;
        return tracker;
    }

    /**
     * 현재 활성 추적기
     */
    getActive(): ProgressTracker | null {
        return this.activeTracker;
    }

    /**
     * 모든 추적기
     */
    getAll(): ProgressTracker[] {
        return [...this.stack];
    }

    /**
     * 스택 비우기
     */
    clear(): void {
        this.stack = [];
        this.activeTracker = null;
    }
}

/**
 * 진행 추적 시스템
 */
export class ProgressTrackingSystem {
    private progressStack: ProgressStack;
    private trackers: Map<string, ProgressTracker> = new Map();
    private eventManager: EventManager;

    constructor() {
        this.progressStack = new ProgressStack();
        this.eventManager = EventManager.getInstance();
    }

    /**
     * 작업 시작
     */
    startTask(taskId: string, totalSteps = 100): ProgressTracker {
        // 기존 추적기가 있으면 제거
        if (this.trackers.has(taskId)) {
            const existing = this.trackers.get(taskId);
            existing?.cancel();
            this.trackers.delete(taskId);
        }

        const tracker = new ProgressTracker(taskId, totalSteps);
        
        // 이벤트 리스너 설정
        tracker.on('progress', (data) => {
            this.updateUI(data);
            this.notifySubscribers(data);
        });
        
        tracker.on('complete', (result) => {
            this.showCompletion(taskId, result);
            this.cleanupTracker(taskId);
        });
        
        tracker.on('error', (error) => {
            this.showError(taskId, error);
            this.cleanupTracker(taskId);
        });
        
        tracker.on('cancel', () => {
            this.showCancellation(taskId);
            this.cleanupTracker(taskId);
        });
        
        this.trackers.set(taskId, tracker);
        this.progressStack.push(tracker);
        
        this.eventManager.emit('task:started', { taskId });
        
        return tracker;
    }

    /**
     * 작업 가져오기
     */
    getTask(taskId: string): ProgressTracker | undefined {
        return this.trackers.get(taskId);
    }

    /**
     * 모든 작업 가져오기
     */
    getAllTasks(): ProgressTracker[] {
        return Array.from(this.trackers.values());
    }

    /**
     * UI 업데이트
     */
    private updateUI(data: ProgressData): void {
        // UI 업데이트 이벤트 발생
        this.eventManager.emit('ui:progress:update', data);
    }

    /**
     * 구독자에게 알림
     */
    private notifySubscribers(data: ProgressData): void {
        // 구독자 알림 이벤트 발생
        this.eventManager.emit('progress:notify', data);
    }

    /**
     * 완료 표시
     */
    private showCompletion(taskId: string, result: any): void {
        this.eventManager.emit('ui:task:complete', { taskId, result });
    }

    /**
     * 오류 표시
     */
    private showError(taskId: string, error: Error): void {
        this.eventManager.emit('ui:task:error', { taskId, error });
    }

    /**
     * 취소 표시
     */
    private showCancellation(taskId: string): void {
        this.eventManager.emit('ui:task:cancelled', { taskId });
    }

    /**
     * 추적기 정리
     */
    private cleanupTracker(taskId: string): void {
        const tracker = this.trackers.get(taskId);
        if (tracker) {
            tracker.removeAllListeners();
            this.trackers.delete(taskId);
        }
    }

    /**
     * 모든 작업 취소
     */
    cancelAll(): void {
        this.trackers.forEach(tracker => tracker.cancel());
        this.trackers.clear();
        this.progressStack.clear();
    }

    /**
     * 시스템 종료
     */
    dispose(): void {
        this.cancelAll();
    }
}