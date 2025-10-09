import { Plugin, WorkspaceLeaf } from 'obsidian';
import { Logger } from '../../infrastructure/logging/Logger';
import { StateManager } from '../../application/StateManager';
import { IDisposable } from '../../architecture/DependencyContainer';

/**
 * StatusBar 아이템 설정
 */
interface StatusBarConfig {
    text: string;
    tooltip?: string;
    className?: string;
    hideAfter?: number; // 밀리초 단위
}

/**
 * StatusBar 관리자
 * StatusBar 아이템의 안전한 생성과 관리를 담당
 */
export class StatusBarManager implements IDisposable {
    private statusBarItem: HTMLElement | null = null;
    private hideTimeout: NodeJS.Timeout | null = null;
    private unsubscribe: (() => void) | null = null;
    private logger: Logger;
    private isDisposed: boolean = false;

    constructor(
        private plugin: Plugin,
        private stateManager: StateManager
    ) {
        this.logger = new Logger('StatusBarManager');
    }

    /**
     * StatusBar 초기화
     */
    public async initialize(): Promise<void> {
        try {
            // workspace가 준비되었는지 확인
            if (!this.plugin.app.workspace) {
                this.logger.warn('Workspace not ready for StatusBar');
                return;
            }

            // StatusBar 아이템 생성 시도
            this.createStatusBarItem();

            // 상태 구독 설정
            if (this.statusBarItem) {
                this.subscribeToStateChanges();
            }

            this.logger.info('StatusBar initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize StatusBar', error instanceof Error ? error : undefined);
            // StatusBar 실패는 치명적이지 않으므로 에러를 던지지 않음
        }
    }

    /**
     * StatusBar 아이템 생성
     */
    private createStatusBarItem(): void {
        try {
            // addStatusBarItem이 함수인지 확인
            if (typeof this.plugin.addStatusBarItem !== 'function') {
                this.logger.warn('addStatusBarItem is not available');
                return;
            }

            // StatusBar 아이템 생성
            const item = this.plugin.addStatusBarItem();
            
            // 반환값 검증
            if (!item || typeof item !== 'object') {
                this.logger.warn('Invalid StatusBar item returned');
                return;
            }

            this.statusBarItem = item;
            this.logger.debug('StatusBar item created successfully');
        } catch (error) {
            this.logger.error('Error creating StatusBar item', error instanceof Error ? error : undefined);
            this.statusBarItem = null;
        }
    }

    /**
     * 상태 변경 구독
     */
    private subscribeToStateChanges(): void {
        this.unsubscribe = this.stateManager.subscribe((state) => {
            if (this.isDisposed) return;

            const config = this.getStatusConfigForState(state);
            this.updateStatus(config);
        });
    }

    /**
     * 상태에 따른 StatusBar 설정 생성
     */
    private getStatusConfigForState(state: any): StatusBarConfig {
        switch (state.status) {
            case 'idle':
                return { text: '' };
            
            case 'processing':
                return {
                    text: '🎙️ Transcribing...',
                    tooltip: 'Processing audio transcription',
                    className: 'status-processing'
                };
            
            case 'completed':
                return {
                    text: '✅ Transcription complete',
                    tooltip: 'Transcription completed successfully',
                    className: 'status-success',
                    hideAfter: 3000
                };
            
            case 'error':
                return {
                    text: '❌ Transcription failed',
                    tooltip: state.error?.message || 'An error occurred',
                    className: 'status-error',
                    hideAfter: 5000
                };
            
            default:
                return { text: '' };
        }
    }

    /**
     * StatusBar 업데이트
     */
    public updateStatus(config: StatusBarConfig): void {
        if (!this.statusBarItem || this.isDisposed) {
            return;
        }

        try {
            // 이전 타이머 취소
            if (this.hideTimeout) {
                clearTimeout(this.hideTimeout);
                this.hideTimeout = null;
            }

            // setText 메서드 존재 확인
            if (typeof (this.statusBarItem as any).setText === 'function') {
                (this.statusBarItem as any).setText(config.text);
            } else if ('textContent' in this.statusBarItem) {
                // textContent 직접 설정
                this.statusBarItem.textContent = config.text;
            } else {
                this.logger.warn('Cannot update StatusBar text');
                return;
            }

            // 툴팁 설정
            if (config.tooltip) {
                this.statusBarItem.setAttribute('aria-label', config.tooltip);
                this.statusBarItem.setAttribute('title', config.tooltip);
            }

            // CSS 클래스 설정
            if (config.className) {
                this.statusBarItem.className = `status-bar-item ${config.className}`;
            }

            // 자동 숨김 설정
            if (config.hideAfter && config.hideAfter > 0) {
                this.hideTimeout = setTimeout(() => {
                    this.clearStatus();
                }, config.hideAfter);
            }

        } catch (error) {
            this.logger.error('Failed to update StatusBar', error instanceof Error ? error : undefined);
        }
    }

    /**
     * StatusBar 텍스트 직접 설정
     */
    public setText(text: string): void {
        this.updateStatus({ text });
    }

    /**
     * StatusBar 지우기
     */
    public clearStatus(): void {
        if (!this.statusBarItem || this.isDisposed) {
            return;
        }

        try {
            if (typeof (this.statusBarItem as any).setText === 'function') {
                (this.statusBarItem as any).setText('');
            } else if ('textContent' in this.statusBarItem) {
                this.statusBarItem.textContent = '';
            }
        } catch (error) {
            this.logger.error('Failed to clear StatusBar', error instanceof Error ? error : undefined);
        }
    }

    /**
     * StatusBar 표시
     */
    public show(): void {
        if (this.statusBarItem) {
            (this.statusBarItem as HTMLElement).classList.remove('sn-hidden');
        }
    }

    /**
     * StatusBar 숨기기
     */
    public hide(): void {
        if (this.statusBarItem) {
            (this.statusBarItem as HTMLElement).classList.add('sn-hidden');
        }
    }

    /**
     * StatusBar 사용 가능 여부 확인
     */
    public isAvailable(): boolean {
        return this.statusBarItem !== null && !this.isDisposed;
    }

    /**
     * 리소스 정리
     */
    public dispose(): void {
        if (this.isDisposed) return;

        this.isDisposed = true;

        // 타이머 정리
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
        }

        // 구독 해제
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }

        // StatusBar 아이템 제거
        if (this.statusBarItem) {
            try {
                // remove 메서드가 있으면 호출
                if (typeof (this.statusBarItem as any).remove === 'function') {
                    (this.statusBarItem as any).remove();
                } else if (this.statusBarItem.parentNode) {
                    // DOM에서 직접 제거
                    this.statusBarItem.parentNode.removeChild(this.statusBarItem);
                }
            } catch (error) {
                this.logger.error('Error removing StatusBar item', error instanceof Error ? error : undefined);
            }
            
            this.statusBarItem = null;
        }

        this.logger.info('StatusBarManager disposed');
    }
}
