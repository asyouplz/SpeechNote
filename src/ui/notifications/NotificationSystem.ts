/**
 * 알림 시스템
 * - Toast 알림
 * - 모달 알림
 * - 상태바 알림
 * - 사운드 알림
 */

import { EventManager } from '../../application/EventManager';
import { StatusIcon } from '../progress/LoadingIndicators';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';
export type NotificationPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';

export interface NotificationOptions {
    type: NotificationType;
    title?: string;
    message: string;
    duration?: number; // 0이면 자동으로 닫히지 않음
    position?: NotificationPosition;
    closable?: boolean;
    icon?: boolean;
    sound?: boolean;
    actions?: NotificationAction[];
    progress?: number;
    persistent?: boolean; // 페이지 새로고침 후에도 유지
}

export interface NotificationAction {
    label: string;
    callback: () => void;
    style?: 'primary' | 'secondary' | 'link';
}

/**
 * Toast 알림 컴포넌트
 */
export class ToastNotification {
    private static container: HTMLElement | null = null;
    private static notifications: Map<string, HTMLElement> = new Map();
    private static soundEnabled: boolean = true;
    private static defaultPosition: NotificationPosition = 'top-right';
    
    /**
     * Toast 컨테이너 초기화
     */
    private static initContainer(position: NotificationPosition = 'top-right') {
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.className = `toast-container toast-container--${position}`;
            this.container.setAttribute('role', 'region');
            this.container.setAttribute('aria-label', '알림 영역');
            this.container.setAttribute('aria-live', 'polite');
            this.container.setAttribute('aria-atomic', 'false');
            document.body.appendChild(this.container);
        } else {
            // 위치 변경
            this.container.className = `toast-container toast-container--${position}`;
        }
    }
    
    /**
     * Toast 알림 표시
     */
    static show(options: NotificationOptions): string {
        const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const position = options.position || this.defaultPosition;
        
        this.initContainer(position);
        
        // Toast 요소 생성
        const toast = document.createElement('div');
        toast.className = `toast toast--${options.type}`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', options.type === 'error' ? 'assertive' : 'polite');
        toast.id = id;
        
        // 아이콘
        if (options.icon !== false) {
            const iconContainer = document.createElement('div');
            iconContainer.className = 'toast__icon';
            const statusIcon = new StatusIcon(options.type, undefined);
            iconContainer.appendChild(statusIcon.create());
            toast.appendChild(iconContainer);
        }
        
        // 콘텐츠
        const content = document.createElement('div');
        content.className = 'toast__content';
        
        if (options.title) {
            const title = document.createElement('div');
            title.className = 'toast__title';
            title.textContent = options.title;
            content.appendChild(title);
        }
        
        const message = document.createElement('div');
        message.className = 'toast__message';
        message.textContent = options.message;
        content.appendChild(message);
        
        // 진행률 바
        if (options.progress !== undefined) {
            const progressBar = document.createElement('div');
            progressBar.className = 'toast__progress';
            const progressFill = document.createElement('div');
            progressFill.className = 'toast__progress-fill';
            progressFill.setAttribute('style', `--sn-progress-width:${options.progress}%`);
            progressBar.appendChild(progressFill);
            content.appendChild(progressBar);
        }
        
        // 액션 버튼
        if (options.actions && options.actions.length > 0) {
            const actions = document.createElement('div');
            actions.className = 'toast__actions';
            
            options.actions.forEach(action => {
                const button = document.createElement('button');
                button.className = `toast__action toast__action--${action.style || 'link'}`;
                button.textContent = action.label;
                button.addEventListener('click', () => {
                    action.callback();
                    this.dismiss(id);
                });
                actions.appendChild(button);
            });
            
            content.appendChild(actions);
        }
        
        toast.appendChild(content);
        
        // 닫기 버튼
        if (options.closable !== false) {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'toast__close';
            closeBtn.setAttribute('aria-label', '알림 닫기');
            closeBtn.setText('×');
            closeBtn.addEventListener('click', () => this.dismiss(id));
            toast.appendChild(closeBtn);
        }
        
        // 컨테이너에 추가
        this.container?.appendChild(toast);
        this.notifications.set(id, toast);
        
        // 애니메이션
        requestAnimationFrame(() => {
            toast.classList.add('toast--show');
        });
        
        // 사운드 재생
        if (options.sound && this.soundEnabled) {
            this.playSound(options.type);
        }
        
        // 자동 닫기
        if (options.duration !== 0) {
            const duration = options.duration || this.getDefaultDuration(options.type);
            setTimeout(() => this.dismiss(id), duration);
        }
        
        // 영구 저장
        if (options.persistent) {
            this.saveToStorage(id, options);
        }
        
        return id;
    }
    
    /**
     * Toast 알림 닫기
     */
    static dismiss(id: string) {
        const toast = this.notifications.get(id);
        if (!toast) return;
        
        toast.classList.remove('toast--show');
        toast.classList.add('toast--hide');
        
        setTimeout(() => {
            toast.remove();
            this.notifications.delete(id);
            
            // 컨테이너가 비었으면 제거
            if (this.notifications.size === 0 && this.container) {
                this.container.remove();
                this.container = null;
            }
        }, 300);
        
        // 저장소에서 제거
        this.removeFromStorage(id);
    }
    
    /**
     * 모든 Toast 알림 닫기
     */
    static dismissAll() {
        this.notifications.forEach((_, id) => this.dismiss(id));
    }
    
    /**
     * 진행률 업데이트
     */
    static updateProgress(id: string, progress: number) {
        const toast = this.notifications.get(id);
        if (!toast) return;
        
        const progressFill = toast.querySelector('.toast__progress-fill') as HTMLElement;
        if (progressFill) {
            progressFill.setAttribute('style', `--sn-progress-width:${progress}%`);
        }
    }
    
    /**
     * 기본 지속 시간 가져오기
     */
    private static getDefaultDuration(type: NotificationType): number {
        const durations = {
            success: 3000,
            info: 4000,
            warning: 5000,
            error: 6000
        };
        return durations[type];
    }
    
    /**
     * 사운드 재생
     */
    private static playSound(type: NotificationType) {
        const audio = new Audio();
        const sounds = {
            success: 'data:audio/wav;base64,UklGRu4CAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YcoCAAA=',
            error: 'data:audio/wav;base64,UklGRvICAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0Yc4CAAA=',
            warning: 'data:audio/wav;base64,UklGRuwCAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YcgCAAA=',
            info: 'data:audio/wav;base64,UklGRuYCAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YcICAAA='
        };
        
        audio.src = sounds[type];
        audio.volume = 0.3;
        audio.play().catch(() => {
            // 사운드 재생 실패 무시
        });
    }
    
    /**
     * 영구 저장
     */
    private static saveToStorage(id: string, options: NotificationOptions) {
        try {
            const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
            notifications.push({ id, options, timestamp: Date.now() });
            localStorage.setItem('notifications', JSON.stringify(notifications));
        } catch (e) {
            console.error('Failed to save notification:', e);
        }
    }
    
    /**
     * 저장소에서 제거
     */
    private static removeFromStorage(id: string) {
        try {
            const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
            const filtered = notifications.filter((n: any) => n.id !== id);
            localStorage.setItem('notifications', JSON.stringify(filtered));
        } catch (e) {
            console.error('Failed to remove notification:', e);
        }
    }
    
    /**
     * 사운드 설정
     */
    static setSoundEnabled(enabled: boolean) {
        this.soundEnabled = enabled;
    }
    
    /**
     * 기본 위치 설정
     */
    static setDefaultPosition(position: NotificationPosition) {
        this.defaultPosition = position;
    }
}

/**
 * 모달 알림 컴포넌트
 */
export class ModalNotification {
    private static activeModal: HTMLElement | null = null;
    private static overlay: HTMLElement | null = null;
    
    /**
     * 모달 알림 표시
     */
    static show(options: NotificationOptions): Promise<boolean> {
        return new Promise((resolve) => {
            // 기존 모달 닫기
            if (this.activeModal) {
                this.dismiss();
            }
            
            // 오버레이 생성
            this.overlay = document.createElement('div');
            this.overlay.className = 'modal-overlay';
            this.overlay.addEventListener('click', () => {
                if (options.closable !== false) {
                    this.dismiss();
                    resolve(false);
                }
            });
            
            // 모달 생성
            this.activeModal = document.createElement('div');
            this.activeModal.className = `modal-notification modal-notification--${options.type}`;
            this.activeModal.setAttribute('role', 'alertdialog');
            this.activeModal.setAttribute('aria-modal', 'true');
            this.activeModal.setAttribute('aria-labelledby', 'modal-title');
            this.activeModal.setAttribute('aria-describedby', 'modal-message');
            
            // 헤더
            const header = document.createElement('div');
            header.className = 'modal-notification__header';
            
            if (options.icon !== false) {
                const statusIcon = new StatusIcon(options.type, undefined);
                header.appendChild(statusIcon.create());
            }
            
            if (options.title) {
                const title = document.createElement('h2');
                title.id = 'modal-title';
                title.className = 'modal-notification__title';
                title.textContent = options.title;
                header.appendChild(title);
            }
            
            if (options.closable !== false) {
                const closeBtn = document.createElement('button');
                closeBtn.className = 'modal-notification__close';
                closeBtn.setAttribute('aria-label', '닫기');
                closeBtn.setText('×');
                closeBtn.addEventListener('click', () => {
                    this.dismiss();
                    resolve(false);
                });
                header.appendChild(closeBtn);
            }
            
            this.activeModal.appendChild(header);
            
            // 본문
            const body = document.createElement('div');
            body.className = 'modal-notification__body';
            body.id = 'modal-message';
            body.textContent = options.message;
            this.activeModal.appendChild(body);
            
            // 액션 버튼
            if (options.actions && options.actions.length > 0) {
                const footer = document.createElement('div');
                footer.className = 'modal-notification__footer';
                
                options.actions.forEach(action => {
                    const button = document.createElement('button');
                    button.className = `modal-notification__action modal-notification__action--${action.style || 'secondary'}`;
                    button.textContent = action.label;
                    button.addEventListener('click', () => {
                        action.callback();
                        this.dismiss();
                        resolve(true);
                    });
                    footer.appendChild(button);
                });
                
                this.activeModal.appendChild(footer);
            }
            
            // DOM에 추가
            document.body.appendChild(this.overlay);
            document.body.appendChild(this.activeModal);
            
            // 포커스 설정
            const firstButton = this.activeModal.querySelector('button');
            if (firstButton) {
                (firstButton as HTMLElement).focus();
            }
            
            // 애니메이션
            requestAnimationFrame(() => {
                this.overlay?.classList.add('modal-overlay--show');
                this.activeModal?.classList.add('modal-notification--show');
            });
            
            // 사운드 재생
            if (options.sound) {
                ToastNotification['playSound'](options.type);
            }
            
            // ESC 키 처리
            const handleEscape = (e: KeyboardEvent) => {
                if (e.key === 'Escape' && options.closable !== false) {
                    this.dismiss();
                    resolve(false);
                    document.removeEventListener('keydown', handleEscape);
                }
            };
            document.addEventListener('keydown', handleEscape);
        });
    }
    
    /**
     * 모달 닫기
     */
    static dismiss() {
        if (!this.activeModal || !this.overlay) return;
        
        this.activeModal.classList.remove('modal-notification--show');
        this.overlay.classList.remove('modal-overlay--show');
        
        setTimeout(() => {
            this.activeModal?.remove();
            this.overlay?.remove();
            this.activeModal = null;
            this.overlay = null;
        }, 300);
    }
}

/**
 * 상태바 알림 컴포넌트
 */
export class StatusBarNotification {
    private static container: HTMLElement | null = null;
    private static currentNotification: HTMLElement | null = null;
    private static hideTimeout: number | null = null;
    
    /**
     * 상태바 컨테이너 초기화
     */
    private static initContainer() {
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.className = 'statusbar-notification';
            this.container.setAttribute('role', 'status');
            this.container.setAttribute('aria-live', 'polite');
            document.body.appendChild(this.container);
        }
    }
    
    /**
     * 상태바 알림 표시
     */
    static show(options: NotificationOptions) {
        this.initContainer();
        
        // 기존 알림 제거
        if (this.currentNotification) {
            this.currentNotification.remove();
        }
        
        // 타임아웃 취소
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
        }
        
        // 알림 생성
        this.currentNotification = document.createElement('div');
        this.currentNotification.className = `statusbar-notification__content statusbar-notification__content--${options.type}`;
        
        // 아이콘
        if (options.icon !== false) {
            const iconContainer = document.createElement('span');
            iconContainer.className = 'statusbar-notification__icon';
            const statusIcon = new StatusIcon(options.type, undefined);
            iconContainer.appendChild(statusIcon.create());
            this.currentNotification.appendChild(iconContainer);
        }
        
        // 메시지
        const message = document.createElement('span');
        message.className = 'statusbar-notification__message';
        message.textContent = options.message;
        this.currentNotification.appendChild(message);
        
        // 액션
        if (options.actions && options.actions.length > 0) {
            const action = options.actions[0]; // 상태바는 하나의 액션만 지원
            const button = document.createElement('button');
            button.className = 'statusbar-notification__action';
            button.textContent = action.label;
            button.addEventListener('click', () => {
                action.callback();
                this.hide();
            });
            this.currentNotification.appendChild(button);
        }
        
        // 닫기 버튼
        if (options.closable !== false) {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'statusbar-notification__close';
            closeBtn.setAttribute('aria-label', '닫기');
            closeBtn.setText('×');
            closeBtn.addEventListener('click', () => this.hide());
            this.currentNotification.appendChild(closeBtn);
        }
        
        // 컨테이너에 추가
        this.container?.appendChild(this.currentNotification);
        
        // 애니메이션
        requestAnimationFrame(() => {
            this.container?.classList.add('statusbar-notification--show');
        });
        
        // 자동 숨기기
        if (options.duration !== 0) {
            const duration = options.duration || 5000;
            this.hideTimeout = window.setTimeout(() => this.hide(), duration);
        }
    }
    
    /**
     * 상태바 알림 숨기기
     */
    static hide() {
        if (!this.container) return;
        
        this.container.classList.remove('statusbar-notification--show');
        
        setTimeout(() => {
            this.currentNotification?.remove();
            this.currentNotification = null;
        }, 300);
        
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
        }
    }
}

/**
 * 알림 매니저
 */
export class NotificationManager {
    private static eventManager = EventManager.getInstance();
    
    /**
     * 알림 표시
     */
    static notify(options: NotificationOptions & { method?: 'toast' | 'modal' | 'statusbar' }) {
        const method = options.method || 'toast';
        
        // 이벤트 발생
        this.eventManager.emit('notification:show', { method, options });
        
        switch (method) {
            case 'modal':
                return ModalNotification.show(options);
            case 'statusbar':
                StatusBarNotification.show(options);
                break;
            case 'toast':
            default:
                return ToastNotification.show(options);
        }
    }
    
    /**
     * 성공 알림
     */
    static success(message: string, options?: Partial<NotificationOptions>) {
        return this.notify({
            type: 'success',
            message,
            ...options
        });
    }
    
    /**
     * 오류 알림
     */
    static error(message: string, options?: Partial<NotificationOptions>) {
        return this.notify({
            type: 'error',
            message,
            ...options
        });
    }
    
    /**
     * 경고 알림
     */
    static warning(message: string, options?: Partial<NotificationOptions>) {
        return this.notify({
            type: 'warning',
            message,
            ...options
        });
    }
    
    /**
     * 정보 알림
     */
    static info(message: string, options?: Partial<NotificationOptions>) {
        return this.notify({
            type: 'info',
            message,
            ...options
        });
    }
    
    /**
     * 확인 대화상자
     */
    static async confirm(message: string, title?: string): Promise<boolean> {
        return ModalNotification.show({
            type: 'warning',
            title: title || '확인',
            message,
            actions: [
                { label: '취소', callback: () => {}, style: 'secondary' },
                { label: '확인', callback: () => {}, style: 'primary' }
            ]
        });
    }
}
