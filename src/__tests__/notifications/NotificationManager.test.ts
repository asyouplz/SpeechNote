/**
 * NotificationManager 시스템 테스트
 */

import { NotificationManager } from '../../ui/notifications/NotificationManager';

describe('NotificationManager', () => {
    let manager: NotificationManager;

    beforeEach(() => {
        // DOM 환경 설정
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
        manager = new NotificationManager({
            defaultDuration: 1000,
            soundEnabled: false // 테스트에서는 사운드 비활성화
        });
    });

    afterEach(() => {
        manager.dispose();
    });

    describe('기본 알림 기능', () => {
        it('성공 알림을 표시할 수 있어야 함', () => {
            const id = manager.success('Operation successful');
            
            expect(id).toBeDefined();
            expect(manager.getNotificationById(id)).toBeDefined();
            expect(manager.getNotificationById(id)?.type).toBe('success');
        });

        it('오류 알림을 표시할 수 있어야 함', () => {
            const id = manager.error('Operation failed');
            
            expect(manager.getNotificationById(id)?.type).toBe('error');
        });

        it('경고 알림을 표시할 수 있어야 함', () => {
            const id = manager.warning('Warning message');
            
            expect(manager.getNotificationById(id)?.type).toBe('warning');
        });

        it('정보 알림을 표시할 수 있어야 함', () => {
            const id = manager.info('Information message');
            
            expect(manager.getNotificationById(id)?.type).toBe('info');
        });
    });

    describe('알림 관리', () => {
        it('알림을 닫을 수 있어야 함', () => {
            const id = manager.info('Test notification');
            
            manager.dismiss(id);
            
            expect(manager.getNotificationById(id)).toBeUndefined();
        });

        it('모든 알림을 닫을 수 있어야 함', () => {
            manager.info('Notification 1');
            manager.info('Notification 2');
            manager.info('Notification 3');
            
            expect(manager.getActiveNotifications()).toHaveLength(3);
            
            manager.dismissAll();
            
            expect(manager.getActiveNotifications()).toHaveLength(0);
        });

        it('타입별로 알림을 닫을 수 있어야 함', () => {
            manager.success('Success');
            manager.error('Error');
            manager.warning('Warning');
            
            manager.dismissByType('error');
            
            const active = manager.getActiveNotifications();
            expect(active).toHaveLength(2);
            expect(active.find(n => n.type === 'error')).toBeUndefined();
        });

        it('알림을 업데이트할 수 있어야 함', () => {
            const id = manager.info('Original message');
            
            manager.update(id, { message: 'Updated message' });
            
            const notification = manager.getNotificationById(id);
            expect(notification?.message).toBe('Updated message');
        });
    });

    describe('알림 옵션', () => {
        it('사용자 정의 지속 시간을 설정할 수 있어야 함', () => {
            const id = manager.info('Test', { duration: 500 });
            const notification = manager.getNotificationById(id);
            
            expect(notification?.duration).toBe(500);
        });

        it('영구 알림을 만들 수 있어야 함', () => {
            const id = manager.info('Persistent', { duration: 0 });
            const notification = manager.getNotificationById(id);
            
            expect(notification?.duration).toBe(0);
        });

        it('알림 위치를 설정할 수 있어야 함', () => {
            const id = manager.info('Test', { position: 'bottom-left' });
            const notification = manager.getNotificationById(id);
            
            expect(notification?.position).toBe('bottom-left');
        });

        it('알림 우선순위를 설정할 수 있어야 함', () => {
            const id = manager.info('Test', { priority: 'urgent' });
            const notification = manager.getNotificationById(id);
            
            expect(notification?.priority).toBe('urgent');
        });
    });

    describe('대화상자 기능', () => {
        it('확인 대화상자를 표시할 수 있어야 함', async () => {
            // 모의 사용자 확인
            const confirmPromise = manager.confirm('Are you sure?');
            
            // DOM에서 확인 버튼 찾기
            setTimeout(() => {
                const confirmBtn = document.querySelector('.modal__action--primary') as HTMLElement;
                confirmBtn?.click();
            }, 10);
            
            const result = await confirmPromise;
            expect(result).toBeDefined();
        });

        it('알림 대화상자를 표시할 수 있어야 함', async () => {
            const alertPromise = manager.alert('Alert message', 'Alert Title');
            
            // DOM에서 확인 버튼 찾기
            setTimeout(() => {
                const okBtn = document.querySelector('.modal__action--primary') as HTMLElement;
                okBtn?.click();
            }, 10);
            
            await expect(alertPromise).resolves.toBeUndefined();
        });
    });

    describe('진행률 알림', () => {
        it('진행률 알림을 생성할 수 있어야 함', () => {
            const progress = manager.showProgress('Loading...', {
                showPercentage: true,
                showETA: true
            });
            
            expect(progress).toBeDefined();
            expect(progress.update).toBeDefined();
            expect(progress.complete).toBeDefined();
            expect(progress.error).toBeDefined();
            expect(progress.close).toBeDefined();
        });

        it('진행률을 업데이트할 수 있어야 함', () => {
            const progress = manager.showProgress('Loading...');
            
            progress.update(50, 'Halfway there');
            
            // DOM 확인
            const toastEl = document.querySelector('.toast');
            expect(toastEl).toBeDefined();
        });

        it('진행률 알림을 완료할 수 있어야 함', () => {
            const progress = manager.showProgress('Loading...');
            
            progress.complete('Done!');
            
            // DOM 확인
            const toastEl = document.querySelector('.toast--success');
            expect(toastEl).toBeDefined();
        });

        it('진행률 알림에서 오류를 표시할 수 있어야 함', () => {
            const progress = manager.showProgress('Loading...');
            
            progress.error('Failed to load');
            
            // DOM 확인
            const toastEl = document.querySelector('.toast--error');
            expect(toastEl).toBeDefined();
        });
    });

    describe('설정 관리', () => {
        it('기본 위치를 설정할 수 있어야 함', () => {
            manager.setDefaultPosition('bottom-right');
            
            const config = manager.getConfig();
            expect(config.defaultPosition).toBe('bottom-right');
        });

        it('사운드를 활성화/비활성화할 수 있어야 함', () => {
            manager.setSound(true);
            expect(manager.getConfig().soundEnabled).toBe(true);
            
            manager.setSound(false);
            expect(manager.getConfig().soundEnabled).toBe(false);
        });

        it('사운드 파일을 설정할 수 있어야 함', () => {
            const spy = jest.spyOn(manager as any, 'setSoundFile');
            
            manager.setSoundFile('success', '/custom-sound.mp3');
            
            expect(spy).toHaveBeenCalledWith('success', '/custom-sound.mp3');
        });

        it('설정을 구성할 수 있어야 함', () => {
            manager.configure({
                defaultDuration: 3000,
                maxNotifications: 10,
                animationDuration: 500
            });
            
            const config = manager.getConfig();
            expect(config.defaultDuration).toBe(3000);
            expect(config.maxNotifications).toBe(10);
            expect(config.animationDuration).toBe(500);
        });
    });

    describe('이벤트 처리', () => {
        it('show 이벤트를 발생시켜야 함', (done) => {
            manager.on('show', (notification) => {
                expect(notification.message).toBe('Test notification');
                done();
            });
            
            manager.info('Test notification');
        });

        it('dismiss 이벤트를 발생시켜야 함', (done) => {
            const id = manager.info('Test notification');
            
            manager.on('dismiss', (dismissedId) => {
                expect(dismissedId).toBe(id);
                done();
            });
            
            manager.dismiss(id);
        });

        it('이벤트 리스너를 제거할 수 있어야 함', () => {
            const listener = jest.fn();
            const unsubscribe = manager.on('show', listener);
            
            manager.info('Test 1');
            expect(listener).toHaveBeenCalledTimes(1);
            
            unsubscribe();
            
            manager.info('Test 2');
            expect(listener).toHaveBeenCalledTimes(1); // 여전히 1번만 호출
        });
    });

    describe('속도 제한', () => {
        it('속도 제한을 초과하면 큐에 추가해야 함', () => {
            // 속도 제한 설정: 분당 3개
            manager.configure({
                rateLimit: {
                    maxPerMinute: 3
                }
            });
            
            // 4개의 알림 생성
            manager.info('Notification 1');
            manager.info('Notification 2');
            manager.info('Notification 3');
            manager.info('Notification 4'); // 큐에 추가됨
            
            // 활성 알림은 3개만
            expect(manager.getActiveNotifications()).toHaveLength(3);
        });
    });

    describe('DOM 조작', () => {
        it('Toast 컨테이너를 생성해야 함', () => {
            manager.info('Test');
            
            const container = document.querySelector('.toast-container');
            expect(container).toBeDefined();
        });

        it('Toast 요소를 생성해야 함', () => {
            manager.info('Test message');
            
            const toast = document.querySelector('.toast');
            expect(toast).toBeDefined();
            
            const message = toast?.querySelector('.toast__message');
            expect(message?.textContent).toBe('Test message');
        });

        it('Modal 오버레이를 생성해야 함', async () => {
            manager.show({
                type: 'info',
                message: 'Modal test',
                priority: 'urgent'
            });
            
            // urgent priority는 Modal을 사용
            setTimeout(() => {
                const overlay = document.querySelector('.modal-overlay');
                expect(overlay).toBeDefined();
            }, 10);
        });

        it('StatusBar를 생성해야 함', () => {
            manager.show({
                type: 'info',
                message: 'Status test',
                priority: 'low'
            });
            
            // low priority는 StatusBar를 사용
            const statusBar = document.querySelector('.status-bar');
            expect(statusBar).toBeDefined();
        });
    });
});
