/**
 * ProgressTracker 시스템 테스트
 */

import { ProgressTracker, ProgressTrackingSystem, ProgressReporter } from '../../ui/progress/ProgressTracker';

describe('ProgressTracker', () => {
    let tracker: ProgressTracker;

    beforeEach(() => {
        tracker = new ProgressTracker('test-task', 100);
    });

    afterEach(() => {
        tracker.removeAllListeners();
    });

    describe('기본 진행률 추적', () => {
        it('진행률을 업데이트할 수 있어야 함', (done) => {
            tracker.on('progress', (data) => {
                expect(data.overall).toBe(50);
                expect(data.taskId).toBe('test-task');
                done();
            });

            tracker.update(50, 'Processing...');
        });

        it('진행률을 0-100 범위로 제한해야 함', () => {
            tracker.update(150);
            expect(tracker['currentProgress']).toBe(100);

            tracker.update(-50);
            expect(tracker['currentProgress']).toBe(0);
        });

        it('100% 도달 시 자동으로 완료되어야 함', (done) => {
            tracker.on('complete', () => {
                expect(tracker['status']).toBe('completed');
                done();
            });

            tracker.update(100);
        });

        it('진행률을 증가시킬 수 있어야 함', () => {
            tracker.update(30);
            tracker.increment(20);
            expect(tracker['currentProgress']).toBe(50);
        });
    });

    describe('단계별 진행률 관리', () => {
        beforeEach(() => {
            tracker.addStep('step1', 'Step 1', 1);
            tracker.addStep('step2', 'Step 2', 2);
            tracker.addStep('step3', 'Step 3', 1);
        });

        it('단계를 추가하고 업데이트할 수 있어야 함', () => {
            tracker.updateStep('step1', 100);
            expect(tracker['currentProgress']).toBe(25); // 1/4 완료

            tracker.updateStep('step2', 50);
            expect(tracker['currentProgress']).toBe(50); // 2/4 완료
        });

        it('단계 완료를 처리할 수 있어야 함', () => {
            tracker.completeStep('step1');
            tracker.completeStep('step2');
            expect(tracker['currentProgress']).toBe(75); // 3/4 완료
        });

        it('단계 실패를 처리할 수 있어야 함', (done) => {
            const error = new Error('Step failed');
            
            tracker.on('error', (err) => {
                expect(err).toBe(error);
                expect(tracker['status']).toBe('failed');
                done();
            });

            tracker.failStep('step1', error);
        });
    });

    describe('일시정지/재개 기능', () => {
        it('작업을 일시정지할 수 있어야 함', (done) => {
            tracker.on('pause', () => {
                expect(tracker['status']).toBe('paused');
                expect(tracker['isPaused']).toBe(true);
                done();
            });

            tracker.pause();
        });

        it('작업을 재개할 수 있어야 함', (done) => {
            tracker.pause();
            
            tracker.on('resume', () => {
                expect(tracker['status']).toBe('running');
                expect(tracker['isPaused']).toBe(false);
                done();
            });

            tracker.resume();
        });

        it('일시정지 시간을 추적해야 함', (done) => {
            const startTime = Date.now();
            
            tracker.pause();
            
            setTimeout(() => {
                tracker.resume();
                const elapsed = tracker.getElapsedTime();
                
                // 일시정지 시간(100ms)을 제외한 실제 작업 시간
                expect(elapsed).toBeLessThan(50);
                done();
            }, 100);
        });
    });

    describe('취소 기능', () => {
        it('작업을 취소할 수 있어야 함', (done) => {
            tracker.on('cancel', () => {
                expect(tracker['isCancelled']).toBe(true);
                expect(tracker['status']).toBe('failed');
                done();
            });

            tracker.cancel();
        });

        it('취소된 작업은 업데이트를 무시해야 함', () => {
            tracker.cancel();
            tracker.update(50);
            expect(tracker['currentProgress']).toBe(0);
        });
    });

    describe('ETA 계산', () => {
        it('ETA를 계산할 수 있어야 함', (done) => {
            // 시뮬레이션: 1초에 10%씩 진행
            let progress = 0;
            const interval = setInterval(() => {
                progress += 10;
                tracker.update(progress);
                
                if (progress === 50) {
                    const eta = tracker.getETA();
                    const remaining = tracker.getRemainingTime();
                    
                    expect(eta).toBeGreaterThan(Date.now());
                    expect(remaining).toBeGreaterThan(0);
                    
                    clearInterval(interval);
                    done();
                }
            }, 100);
        });

        it('속도를 계산할 수 있어야 함', (done) => {
            setTimeout(() => {
                tracker.update(50);
                const speed = tracker.getSpeed();
                
                expect(speed).toBeGreaterThan(0);
                done();
            }, 100);
        });
    });
});

describe('ProgressTrackingSystem', () => {
    let system: ProgressTrackingSystem;

    beforeEach(() => {
        system = new ProgressTrackingSystem();
    });

    afterEach(() => {
        system.dispose();
    });

    describe('작업 관리', () => {
        it('새 작업을 시작할 수 있어야 함', () => {
            const tracker = system.startTask('task1', 100);
            
            expect(tracker).toBeDefined();
            expect(system.getTask('task1')).toBe(tracker);
        });

        it('동일한 ID의 작업 시작 시 기존 작업을 취소해야 함', () => {
            const tracker1 = system.startTask('task1', 100);
            const cancelSpy = jest.spyOn(tracker1, 'cancel');
            
            const tracker2 = system.startTask('task1', 100);
            
            expect(cancelSpy).toHaveBeenCalled();
            expect(system.getTask('task1')).toBe(tracker2);
        });

        it('모든 작업을 가져올 수 있어야 함', () => {
            system.startTask('task1', 100);
            system.startTask('task2', 100);
            system.startTask('task3', 100);
            
            const tasks = system.getAllTasks();
            expect(tasks).toHaveLength(3);
        });

        it('모든 작업을 취소할 수 있어야 함', () => {
            const tracker1 = system.startTask('task1', 100);
            const tracker2 = system.startTask('task2', 100);
            
            const cancelSpy1 = jest.spyOn(tracker1, 'cancel');
            const cancelSpy2 = jest.spyOn(tracker2, 'cancel');
            
            system.cancelAll();
            
            expect(cancelSpy1).toHaveBeenCalled();
            expect(cancelSpy2).toHaveBeenCalled();
            expect(system.getAllTasks()).toHaveLength(0);
        });
    });

    describe('이벤트 처리', () => {
        it('작업 완료 시 정리되어야 함', (done) => {
            const tracker = system.startTask('task1', 100);
            
            tracker.on('complete', () => {
                setTimeout(() => {
                    expect(system.getTask('task1')).toBeUndefined();
                    done();
                }, 10);
            });
            
            tracker.update(100);
        });

        it('작업 오류 시 정리되어야 함', (done) => {
            const tracker = system.startTask('task1', 100);
            
            tracker.on('error', () => {
                setTimeout(() => {
                    expect(system.getTask('task1')).toBeUndefined();
                    done();
                }, 10);
            });
            
            tracker.failStep('step1', new Error('Test error'));
        });

        it('작업 취소 시 정리되어야 함', (done) => {
            const tracker = system.startTask('task1', 100);
            
            tracker.on('cancel', () => {
                setTimeout(() => {
                    expect(system.getTask('task1')).toBeUndefined();
                    done();
                }, 10);
            });
            
            tracker.cancel();
        });
    });
});

describe('ProgressReporter', () => {
    let tracker: ProgressTracker;
    let reporter: ProgressReporter;

    beforeEach(() => {
        tracker = new ProgressTracker('test-task', 100);
        reporter = new ProgressReporter(tracker);
    });

    it('진행률을 보고할 수 있어야 함', (done) => {
        tracker.on('progress', (data) => {
            expect(data.overall).toBe(50);
            expect(data.message).toBe('Halfway there');
            done();
        });

        reporter.report(50, 'Halfway there');
    });

    it('단계별 진행률을 보고할 수 있어야 함', () => {
        tracker.addStep('step1', 'Step 1');
        const updateSpy = jest.spyOn(tracker, 'updateStep');
        
        reporter.reportStep('step1', 75);
        
        expect(updateSpy).toHaveBeenCalledWith('step1', 75);
    });
});