/**
 * Phase 3 통합 알림 시스템
 * 
 * Toast, Modal, StatusBar, Sound 알림을 통합 관리합니다.
 */

import { 
    INotificationAPI, 
    NotificationOptions, 
    NotificationConfig, 
    NotificationPosition, 
    NotificationType,
    ConfirmOptions,
    PromptOptions,
    ProgressNotificationOptions,
    IProgressNotification,
    Unsubscribe
} from '../../types/phase3-api';
import { EventEmitter } from 'events';
import { EventManager } from '../../application/EventManager';

/**
 * 알림 채널 인터페이스
 */
interface NotificationChannel {
    send(notification: NotificationOptions): Promise<void>;
    dismiss(notificationId: string): void;
    dismissAll(): void;
}

const DOM_AVAILABLE = typeof document !== 'undefined' && typeof document.createElement === 'function';
const AUDIO_AVAILABLE = typeof Audio !== 'undefined';

class NoopChannel implements NotificationChannel {
    async send(): Promise<void> {
        return Promise.resolve();
    }

    dismiss(): void {}

    dismissAll(): void {}
}

/**
 * 우선순위 큐 구현
 */
class PriorityQueue<T> {
    private heap: Array<{ priority: number; item: T }> = [];

    enqueue(item: T, priority = 0): void {
        this.heap.push({ priority, item });
        this.bubbleUp(this.heap.length - 1);
    }

    dequeue(): T | undefined {
        if (this.heap.length === 0) return undefined;
        
        const result = this.heap[0];
        const end = this.heap.pop()!;
        
        if (this.heap.length > 0) {
            this.heap[0] = end;
            this.sinkDown(0);
        }
        
        return result.item;
    }

    size(): number {
        return this.heap.length;
    }

    private bubbleUp(index: number): void {
        const element = this.heap[index];
        
        while (index > 0) {
            const parentIndex = Math.floor((index - 1) / 2);
            const parent = this.heap[parentIndex];
            
            if (element.priority <= parent.priority) break;
            
            this.heap[index] = parent;
            index = parentIndex;
        }
        
        this.heap[index] = element;
    }

    private sinkDown(index: number): void {
        const element = this.heap[index];
        const length = this.heap.length;
        
        let searching = true;
        while (searching) {
            const leftChildIdx = 2 * index + 1;
            const rightChildIdx = 2 * index + 2;
            let swapIdx = -1;
            
            if (leftChildIdx < length) {
                const leftChild = this.heap[leftChildIdx];
                if (leftChild.priority > element.priority) {
                    swapIdx = leftChildIdx;
                }
            }
            
            if (rightChildIdx < length) {
                const rightChild = this.heap[rightChildIdx];
                const compare = swapIdx === -1 ? element : this.heap[swapIdx];
                if (rightChild.priority > compare.priority) {
                    swapIdx = rightChildIdx;
                }
            }
            
            if (swapIdx === -1) {
                searching = false;
                continue;
            }
            
            this.heap[index] = this.heap[swapIdx];
            index = swapIdx;
        }
        
        this.heap[index] = element;
    }
}

/**
 * 속도 제한기
 */
class RateLimiter {
    private counts: Map<string, number> = new Map();
    private timestamps: Map<string, number[]> = new Map();
    private maxPerMinute: number;
    private maxPerType: Map<NotificationType, number>;

    constructor(maxPerMinute = 30, maxPerType?: Map<NotificationType, number>) {
        this.maxPerMinute = maxPerMinute;
        this.maxPerType = maxPerType || new Map([
            ['error', 10],
            ['warning', 15],
            ['info', 20],
            ['success', 20]
        ]);
    }

    allow(type: NotificationType): boolean {
        const now = Date.now();
        const oneMinuteAgo = now - 60000;
        
        // 전체 속도 제한 확인
        const allTimestamps = this.timestamps.get('all') || [];
        const recentAll = allTimestamps.filter(t => t > oneMinuteAgo);
        
        if (recentAll.length >= this.maxPerMinute) {
            return false;
        }
        
        // 타입별 속도 제한 확인
        const typeTimestamps = this.timestamps.get(type) || [];
        const recentType = typeTimestamps.filter(t => t > oneMinuteAgo);
        const maxForType = this.maxPerType.get(type) || 20;
        
        if (recentType.length >= maxForType) {
            return false;
        }
        
        // 타임스탬프 업데이트
        this.timestamps.set('all', [...recentAll, now]);
        this.timestamps.set(type, [...recentType, now]);
        
        return true;
    }

    reset(): void {
        this.counts.clear();
        this.timestamps.clear();
    }
}

/**
 * Toast 알림 채널
 */
class ToastChannel implements NotificationChannel {
    private container: HTMLElement | null = null;
    private notifications: Map<string, HTMLElement> = new Map();
    private position: NotificationPosition = 'top-right';

    constructor() {
        this.createContainer();
    }

    private createContainer(): void {
        this.container = document.createElement('div');
        this.container.className = 'toast-container';
        this.container.setAttribute('aria-live', 'polite');
        this.container.setAttribute('aria-atomic', 'true');
        this.setPosition(this.position);
        document.body.appendChild(this.container);
    }

    setPosition(position: NotificationPosition): void {
        this.position = position;
        if (this.container) {
            this.container.className = `toast-container toast-container--${position}`;
        }
    }

    async send(notification: NotificationOptions): Promise<void> {
        if (!DOM_AVAILABLE) {
            return;
        }

        if (!this.container) this.createContainer();
        if (!this.container) return;
        
        const id = this.generateId();
        const toast = this.createToast(notification, id);
        if (!toast) return;
        
        this.notifications.set(id, toast);
        this.container.appendChild(toast);
        
        if (typeof requestAnimationFrame === 'function') {
            requestAnimationFrame(() => {
                toast.classList.add('toast--show');
            });
        } else {
            toast.classList.add('toast--show');
        }
        
        if (notification.duration !== 0) {
            const duration = notification.duration || 5000;
            setTimeout(() => this.dismiss(id), duration);
        }
    }

    private createToast(notification: NotificationOptions, id: string): HTMLElement | null {
        if (!DOM_AVAILABLE) {
            return null;
        }

        const toast = document.createElement('div');
        toast.className = `toast toast--${notification.type}`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('data-notification-id', id);
        
        // 아이콘
        if (notification.icon !== false) {
            const icon = document.createElement('div');
            icon.className = 'toast__icon';
            const iconSvg = this.getIcon(notification.type);
            if (iconSvg) {
                icon.appendChild(iconSvg);
            }
            toast.appendChild(icon);
        }
        
        // 내용
        const content = document.createElement('div');
        content.className = 'toast__content';
        
        if (notification.title) {
            const title = document.createElement('div');
            title.className = 'toast__title';
            title.textContent = notification.title;
            content.appendChild(title);
        }
        
        const message = document.createElement('div');
        message.className = 'toast__message';
        message.textContent = notification.message;
        content.appendChild(message);
        
        toast.appendChild(content);
        
        // 닫기 버튼
        if (notification.closable !== false) {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'toast__close';
            closeBtn.textContent = '×';
            closeBtn.setAttribute('aria-label', '닫기');
            closeBtn.onclick = () => this.dismiss(id);
            toast.appendChild(closeBtn);
        }
        
        // 액션 버튼
        if (notification.actions && notification.actions.length > 0) {
            const actions = document.createElement('div');
            actions.className = 'toast__actions';
            
            notification.actions.forEach(action => {
                const btn = document.createElement('button');
                btn.className = `toast__action toast__action--${action.style || 'secondary'}`;
                btn.textContent = action.label;
                btn.onclick = async () => {
                    await action.callback();
                    if (action.closeOnClick !== false) {
                        this.dismiss(id);
                    }
                };
                actions.appendChild(btn);
            });
            
            toast.appendChild(actions);
        }
        
        // 진행률 바
        if (notification.progress !== undefined) {
            const progressBar = document.createElement('div');
            progressBar.className = 'toast__progress';
            const fill = document.createElement('div');
            fill.className = 'toast__progress-fill';
            fill.setAttribute('style', `--sn-progress-width:${notification.progress}%`);
            progressBar.appendChild(fill);
            toast.appendChild(progressBar);
        }
        
        return toast;
    }

    private getIcon(type: NotificationType): SVGElement | null {
        const iconConfig: Record<NotificationType, { viewBox: string; path: string }> = {
            success: {
                viewBox: '0 0 24 24',
                path: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z'
            },
            error: {
                viewBox: '0 0 24 24',
                path: 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z'
            },
            warning: {
                viewBox: '0 0 24 24',
                path: 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z'
            },
            info: {
                viewBox: '0 0 24 24',
                path: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z'
            }
        };

        const config = iconConfig[type] || iconConfig.info;
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', config.viewBox);
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', config.path);
        svg.appendChild(path);
        return svg;
    }

    dismiss(notificationId: string): void {
        if (!DOM_AVAILABLE) {
            this.notifications.delete(notificationId);
            return;
        }
        const toast = this.notifications.get(notificationId);
        if (!toast) return;
        
        toast.classList.remove('toast--show');
        toast.classList.add('toast--hide');
        
        setTimeout(() => {
            toast.remove();
            this.notifications.delete(notificationId);
        }, 300);
    }

    dismissAll(): void {
        this.notifications.forEach((_, id) => this.dismiss(id));
    }

    private generateId(): string {
        return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}

/**
 * Modal 알림 채널
 */
class ModalChannel implements NotificationChannel {
    private activeModals: Map<string, HTMLElement> = new Map();

    async send(notification: NotificationOptions): Promise<void> {
        const id = this.generateId();
        const modal = this.createModal(notification, id);
        
        this.activeModals.set(id, modal);
        document.body.appendChild(modal);
        
        // 포커스 트랩
        this.trapFocus(modal);
        
        // ESC 키로 닫기
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && notification.closable !== false) {
                this.dismiss(id);
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
    }

    private createModal(notification: NotificationOptions, id: string): HTMLElement {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.setAttribute('data-notification-id', id);
        
        const modal = document.createElement('div');
        modal.className = `modal modal--${notification.type}`;
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', `modal-title-${id}`);
        
        // 헤더
        const header = document.createElement('div');
        header.className = 'modal__header';
        
        const title = document.createElement('h2');
        title.id = `modal-title-${id}`;
        title.className = 'modal__title';
        title.textContent = notification.title || this.getDefaultTitle(notification.type);
        header.appendChild(title);
        
        if (notification.closable !== false) {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'modal__close';
            closeBtn.textContent = '×';
            closeBtn.setAttribute('aria-label', '닫기');
            closeBtn.onclick = () => this.dismiss(id);
            header.appendChild(closeBtn);
        }
        
        modal.appendChild(header);
        
        // 내용
        const content = document.createElement('div');
        content.className = 'modal__content';
        content.textContent = notification.message;
        modal.appendChild(content);
        
        // 액션
        if (notification.actions && notification.actions.length > 0) {
            const footer = document.createElement('div');
            footer.className = 'modal__footer';
            
            notification.actions.forEach(action => {
                const btn = document.createElement('button');
                btn.className = `modal__action modal__action--${action.style || 'secondary'}`;
                btn.textContent = action.label;
                btn.onclick = async () => {
                    await action.callback();
                    if (action.closeOnClick !== false) {
                        this.dismiss(id);
                    }
                };
                footer.appendChild(btn);
            });
            
            modal.appendChild(footer);
        }
        
        overlay.appendChild(modal);
        
        // 오버레이 클릭으로 닫기
        overlay.onclick = (e) => {
            if (e.target === overlay && notification.closable !== false) {
                this.dismiss(id);
            }
        };
        
        return overlay;
    }

    private getDefaultTitle(type: NotificationType): string {
        const titles = {
            success: '성공',
            error: '오류',
            warning: '경고',
            info: '알림'
        };
        return titles[type] || '알림';
    }

    private trapFocus(modal: HTMLElement): void {
        const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
        
        firstElement?.focus();
        
        modal.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                if (e.shiftKey && document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement?.focus();
                } else if (!e.shiftKey && document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement?.focus();
                }
            }
        });
    }

    dismiss(notificationId: string): void {
        const modal = this.activeModals.get(notificationId);
        if (!modal) return;
        
        modal.classList.add('modal-overlay--hide');
        
        setTimeout(() => {
            modal.remove();
            this.activeModals.delete(notificationId);
        }, 300);
    }

    dismissAll(): void {
        this.activeModals.forEach((_, id) => this.dismiss(id));
    }

    private generateId(): string {
        return `modal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}

/**
 * StatusBar 알림 채널
 */
class StatusBarChannel implements NotificationChannel {
    private statusBar: HTMLElement | null = null;
    private currentNotification: string | null = null;
    private timeout: NodeJS.Timeout | null = null;

    constructor() {
        this.createStatusBar();
    }

    private createStatusBar(): void {
        this.statusBar = document.querySelector('.status-bar');
        if (!this.statusBar) {
            this.statusBar = document.createElement('div');
            this.statusBar.className = 'status-bar';
            document.body.appendChild(this.statusBar);
        }
    }

    async send(notification: NotificationOptions): Promise<void> {
        if (!this.statusBar) this.createStatusBar();
        
        const id = this.generateId();
        this.currentNotification = id;
        
        this.statusBar!.className = `status-bar status-bar--${notification.type}`;
        this.statusBar!.textContent = notification.message;
        this.statusBar!.classList.add('status-bar--show');
        
        if (this.timeout) {
            clearTimeout(this.timeout);
        }
        
        if (notification.duration !== 0) {
            const duration = notification.duration || 3000;
            this.timeout = setTimeout(() => this.dismiss(id), duration);
        }
    }

    dismiss(notificationId: string): void {
        if (this.currentNotification !== notificationId) return;
        
        this.statusBar?.classList.remove('status-bar--show');
        this.currentNotification = null;
        
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }
    }

    dismissAll(): void {
        if (this.currentNotification) {
            this.dismiss(this.currentNotification);
        }
    }

    private generateId(): string {
        return `status-${Date.now()}`;
    }
}

/**
 * Sound 알림 채널
 */
class SoundChannel implements NotificationChannel {
    private sounds: Map<NotificationType, string> = new Map();
    private enabled = true;
    private audioCache: Map<string, HTMLAudioElement> = new Map();

    constructor() {
        this.initDefaultSounds();
    }

    private initDefaultSounds(): void {
        // 기본 사운드 URL 설정 (실제 사운드 파일 경로로 대체 필요)
        this.sounds.set('success', '/sounds/success.mp3');
        this.sounds.set('error', '/sounds/error.mp3');
        this.sounds.set('warning', '/sounds/warning.mp3');
        this.sounds.set('info', '/sounds/info.mp3');
    }

    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }

    setSoundFile(type: NotificationType, url: string): void {
        this.sounds.set(type, url);
        // 캐시 무효화
        const cached = this.audioCache.get(type);
        if (cached) {
            this.audioCache.delete(type);
        }
    }

    async send(notification: NotificationOptions): Promise<void> {
        if (!this.enabled || notification.sound === false) return;
        
        const soundUrl = typeof notification.sound === 'string' 
            ? notification.sound 
            : this.sounds.get(notification.type);
        
        if (!soundUrl) return;
        
        try {
            const audio = await this.getAudio(soundUrl);
            await audio.play();
        } catch (error) {
            console.warn('Failed to play notification sound:', error);
        }
    }

    private async getAudio(url: string): Promise<HTMLAudioElement> {
        if (this.audioCache.has(url)) {
            return this.audioCache.get(url)!;
        }
        
        const audio = new Audio(url);
        audio.volume = 0.5;
        this.audioCache.set(url, audio);
        
        return audio;
    }

    dismiss(_notificationId: string): void {
        // Sound 채널은 dismiss 동작 없음
    }

    dismissAll(): void {
        // Sound 채널은 dismissAll 동작 없음
    }
}

/**
 * 진행률 알림 구현
 */
class ProgressNotification implements IProgressNotification {
    private notificationId: string;
    private channel: NotificationChannel;
    private options: ProgressNotificationOptions;
    private updateInterval: NodeJS.Timeout | null = null;

    constructor(
        notificationId: string,
        channel: NotificationChannel,
        message: string,
        options: Partial<ProgressNotificationOptions> = {}
    ) {
        this.notificationId = notificationId;
        this.channel = channel;
        this.options = {
            ...options,
            message,
            type: 'info',
            duration: 0, // 자동으로 닫지 않음
            progress: 0
        };
        
        void this.init();
    }

    private async init(): Promise<void> {
        await this.channel.send(this.options as NotificationOptions);
        
        if (this.options.updateInterval) {
            this.updateInterval = setInterval(() => {
                this.render();
            }, this.options.updateInterval);
        }
    }

    update(progress: number, message?: string): void {
        this.options.progress = progress;
        if (message) {
            this.options.message = message;
        }
        this.render();
    }

    complete(message?: string): void {
        this.options.type = 'success';
        this.options.message = message || '완료되었습니다';
        this.options.progress = 100;
        this.render();
        
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        setTimeout(() => this.close(), 3000);
    }

    error(message: string): void {
        this.options.type = 'error';
        this.options.message = message;
        this.render();
        
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }

    close(): void {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        this.channel.dismiss(this.notificationId);
    }

    private render(): void {
        const element = document.querySelector(`[data-notification-id="${this.notificationId}"]`);
        if (!element) return;
        
        // 메시지 업데이트
        const messageEl = element.querySelector('.toast__message');
        if (messageEl) {
            let text = this.options.message || '';
            
            if (this.options.showPercentage && this.options.progress !== undefined) {
                text += ` (${Math.round(this.options.progress)}%)`;
            }
            
            messageEl.textContent = text;
        }
        
        // 진행률 바 업데이트
        const progressFill = element.querySelector('.toast__progress-fill') as HTMLElement;
        if (progressFill) {
            progressFill.setAttribute('style', `--sn-progress-width:${this.options.progress}%`);
        }
        
        // 타입별 스타일 업데이트
        element.className = `toast toast--${this.options.type} toast--show`;
    }
}

/**
 * 통합 알림 시스템
 */
export class NotificationManager implements INotificationAPI {
    private emitter = new EventEmitter();
    private channels: Map<string, NotificationChannel> = new Map();
    private queue: PriorityQueue<NotificationOptions> = new PriorityQueue();
    private rateLimiter: RateLimiter;
    private config: NotificationConfig;
    private activeNotifications: Map<string, NotificationOptions> = new Map();
    private eventManager: EventManager;
    private notificationCounter = 0;
    private recentMessages: Map<string, number> = new Map(); // 최근 메시지 추적
    private recentMessageTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

    constructor(config: NotificationConfig = {}) {
        this.config = {
            defaultPosition: 'top-right',
            defaultDuration: 5000,
            maxNotifications: 5,
            soundEnabled: true,
            stackNotifications: true,
            animationDuration: 300,
            ...config
        };
        
        this.rateLimiter = new RateLimiter(
            this.config.rateLimit?.maxPerMinute,
            this.config.rateLimit?.maxPerType as any
        );
        
        this.eventManager = EventManager.getInstance();
        this.initializeChannels();
    }

    private initializeChannels(): void {
        if (DOM_AVAILABLE) {
            this.channels.set('toast', new ToastChannel());
            this.channels.set('modal', new ModalChannel());
            this.channels.set('statusbar', new StatusBarChannel());
        } else {
            const noop = new NoopChannel();
            this.channels.set('toast', noop);
            this.channels.set('modal', noop);
            this.channels.set('statusbar', noop);
            this.channels.set('noop', noop);
        }

        if (AUDIO_AVAILABLE) {
            this.channels.set('sound', new SoundChannel());
        } else {
            this.channels.set('sound', new NoopChannel());
        }
    }

    /**
     * 기본 알림 표시
     */
    show(options: NotificationOptions): string {
        // 중복 메시지 확인 (2초 이내 동일 메시지 방지)
        const messageKey = `${options.type}-${options.message}`;
        if (this.recentMessageTimers.has(messageKey)) {
            if (process.env.DEBUG_NOTIFICATION) {
                console.debug('Duplicate notification blocked', { messageKey });
            }
            return ''; // 중복 메시지 무시
        }
        const now = Date.now();
        this.recentMessages.set(messageKey, now);
        const timeout = setTimeout(() => {
            this.recentMessages.delete(messageKey);
            const timer = this.recentMessageTimers.get(messageKey);
            if (timer) {
                this.recentMessageTimers.delete(messageKey);
            }
        }, 2000);
        this.recentMessageTimers.set(messageKey, timeout);
        
        const id = this.generateNotificationId();
        const notification = {
            ...options,
            duration: options.duration ?? this.config.defaultDuration,
            position: options.position ?? this.config.defaultPosition
        };
        
        this.activeNotifications.set(id, notification);
        
        // 속도 제한 확인
        if (!this.rateLimiter.allow(notification.type)) {
            this.queue.enqueue(notification, this.getPriority(notification.priority));
            return id;
        }
        
        // 채널 선택 및 전송
        const channels = this.selectChannels(notification);
        void Promise.all(
            channels.map(channel => 
                channel.send(notification).catch(error => {
                    console.error('Notification channel error:', error);
                })
            )
        );
        
        // 이벤트 발생
        this.emitter.emit('show', notification);
        this.eventManager.emit('notification:show', { id, notification });
        
        return id;
    }

    /**
     * 성공 알림
     */
    success(message: string, options?: Partial<NotificationOptions>): string {
        return this.show({
            ...options,
            type: 'success',
            message
        });
    }

    /**
     * 오류 알림
     */
    error(message: string, options?: Partial<NotificationOptions>): string {
        return this.show({
            ...options,
            type: 'error',
            message
        });
    }

    /**
     * 경고 알림
     */
    warning(message: string, options?: Partial<NotificationOptions>): string {
        return this.show({
            ...options,
            type: 'warning',
            message
        });
    }

    /**
     * 정보 알림
     */
    info(message: string, options?: Partial<NotificationOptions>): string {
        return this.show({
            ...options,
            type: 'info',
            message
        });
    }

    /**
     * 알림 닫기
     */
    dismiss(notificationId: string): void {
        this.channels.forEach(channel => channel.dismiss(notificationId));
        this.activeNotifications.delete(notificationId);
        
        this.emitter.emit('dismiss', notificationId);
        this.eventManager.emit('notification:dismiss', { id: notificationId });
        
        // 큐에서 다음 알림 처리
        this.processQueue();
    }

    /**
     * 모든 알림 닫기
     */
    dismissAll(): void {
        this.channels.forEach(channel => channel.dismissAll());
        this.activeNotifications.clear();
        this.queue = new PriorityQueue();
    }

    /**
     * 타입별 알림 닫기
     */
    dismissByType(type: NotificationType): void {
        const toRemove: string[] = [];
        
        this.activeNotifications.forEach((notification, id) => {
            if (notification.type === type) {
                toRemove.push(id);
            }
        });
        
        toRemove.forEach(id => this.dismiss(id));
    }

    /**
     * 알림 업데이트
     */
    update(notificationId: string, options: Partial<NotificationOptions>): void {
        const existing = this.activeNotifications.get(notificationId);
        if (!existing) return;
        
        const updated = { ...existing, ...options };
        this.activeNotifications.set(notificationId, updated);
        
        // 재렌더링
        this.dismiss(notificationId);
        this.show(updated);
    }

    /**
     * 확인 대화상자
     */
    async confirm(message: string, options?: ConfirmOptions): Promise<boolean> {
        return new Promise((resolve) => {
            const modal = new ModalChannel();
            const id = this.generateNotificationId();
            
            void modal.send({
                type: 'info',
                title: options?.title || '확인',
                message,
                closable: false,
                actions: [
                    {
                        label: options?.cancelText || '취소',
                        style: 'secondary',
                        callback: () => {
                            modal.dismiss(id);
                            resolve(false);
                        }
                    },
                    {
                        label: options?.confirmText || '확인',
                        style: options?.confirmStyle || 'primary',
                        callback: () => {
                            modal.dismiss(id);
                            resolve(true);
                        }
                    }
                ]
            });
        });
    }

    /**
     * 입력 대화상자
     */
    async prompt(_message: string, _options?: PromptOptions): Promise<string | null> {
        return new Promise((resolve) => {
            // 구현 예정
            resolve(null);
        });
    }

    /**
     * 알림 대화상자
     */
    async alert(message: string, title?: string): Promise<void> {
        return new Promise((resolve) => {
            const modal = new ModalChannel();
            const id = this.generateNotificationId();
            
            void modal.send({
                type: 'info',
                title: title || '알림',
                message,
                actions: [
                    {
                        label: '확인',
                        style: 'primary',
                        callback: () => {
                            modal.dismiss(id);
                            resolve();
                        }
                    }
                ]
            });
        });
    }

    /**
     * 진행률 알림
     */
    showProgress(message: string, options?: ProgressNotificationOptions): IProgressNotification {
        const id = this.generateNotificationId();
        const channel = this.channels.get('toast') ?? new NoopChannel();
        
        return new ProgressNotification(id, channel, message, options);
    }

    /**
     * 설정
     */
    configure(config: NotificationConfig): void {
        this.config = { ...this.config, ...config };
        
        if (config.rateLimit) {
            this.rateLimiter = new RateLimiter(
                config.rateLimit.maxPerMinute,
                config.rateLimit.maxPerType as any
            );
        }
    }

    /**
     * 설정 가져오기
     */
    getConfig(): NotificationConfig {
        return { ...this.config };
    }

    /**
     * 기본 위치 설정
     */
    setDefaultPosition(position: NotificationPosition): void {
        this.config.defaultPosition = position;
        const toast = this.channels.get('toast');
        if (toast instanceof ToastChannel) {
            toast.setPosition(position);
        }
    }

    /**
     * 사운드 설정
     */
    setSound(enabled: boolean): void {
        this.config.soundEnabled = enabled;
        const sound = this.channels.get('sound');
        if (sound instanceof SoundChannel) {
            sound.setEnabled(enabled);
        }
    }

    /**
     * 사운드 파일 설정
     */
    setSoundFile(type: NotificationType, soundUrl: string): void {
        const sound = this.channels.get('sound');
        if (sound instanceof SoundChannel) {
            sound.setSoundFile(type, soundUrl);
        }
    }

    /**
     * 활성 알림 가져오기
     */
    getActiveNotifications(): NotificationOptions[] {
        return Array.from(this.activeNotifications.values());
    }

    /**
     * ID로 알림 가져오기
     */
    getNotificationById(id: string): NotificationOptions | undefined {
        return this.activeNotifications.get(id);
    }

    /**
     * 이벤트 리스너 등록 (타입 안전한 구독)
     */
    subscribe(event: 'show', listener: (notification: NotificationOptions) => void): Unsubscribe;
    subscribe(event: 'dismiss', listener: (id: string) => void): Unsubscribe;
    subscribe(event: 'action', listener: (id: string, action: string) => void): Unsubscribe;
    subscribe(event: string, listener: (...args: any[]) => void): Unsubscribe {
        this.emitter.on(event, listener);
        return () => this.emitter.off(event, listener);
    }

    /**
     * 채널 선택
     */
    private selectChannels(notification: NotificationOptions): NotificationChannel[] {
        const channels: NotificationChannel[] = [];
        const toast = this.channels.get('toast');
        const modal = this.channels.get('modal');
        const statusbar = this.channels.get('statusbar');
        const sound = this.channels.get('sound');

        const pushChannel = (channel?: NotificationChannel) => {
            if (channel) {
                channels.push(channel);
            }
        };

        switch (notification.priority) {
            case 'urgent':
                pushChannel(modal);
                pushChannel(toast);
                pushChannel(sound);
                break;
            case 'high':
                pushChannel(toast);
                if (notification.type === 'error' || notification.type === 'warning') {
                    pushChannel(sound);
                }
                break;
            case 'low':
                pushChannel(statusbar);
                break;
            case 'normal':
            default:
                pushChannel(toast);
                if (notification.type === 'error' || notification.type === 'warning') {
                    pushChannel(sound);
                }
                break;
        }

        if (channels.length === 0) {
            const fallback = this.channels.get('noop');
            pushChannel(fallback ?? new NoopChannel());
        }

        return channels;
    }

    /**
     * 우선순위 계산
     */
    private getPriority(priority?: string): number {
        const priorities = {
            urgent: 4,
            high: 3,
            normal: 2,
            low: 1
        };
        return priorities[priority as keyof typeof priorities] || 2;
    }

    /**
     * 큐 처리
     */
    private processQueue(): void {
        if (this.activeNotifications.size >= (this.config.maxNotifications || 5)) {
            return;
        }
        
        const notification = this.queue.dequeue();
        if (notification) {
            this.show(notification);
        }
    }

    /**
     * ID 생성
     */
    private generateNotificationId(): string {
        return `notification-${Date.now()}-${++this.notificationCounter}`;
    }

    /**
     * 이벤트 리스너 등록 - INotificationAPI 인터페이스 구현
     */
    on(event: 'show', listener: (notification: NotificationOptions) => void): () => void;
    on(event: 'dismiss', listener: (id: string) => void): () => void;
    on(event: 'action', listener: (id: string, action: string) => void): () => void;
    on(event: string, listener: (...args: any[]) => void): () => void {
        this.emitter.on(event, listener);
        return () => this.emitter.off(event, listener);
    }

    /**
     * 정리
     */
    dispose(): void {
        this.dismissAll();
        this.emitter.removeAllListeners();
    }
}
