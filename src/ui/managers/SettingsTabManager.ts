import { App, PluginSettingTab } from 'obsidian';
import type SpeechToTextPlugin from '../../main';
import { Logger } from '../../infrastructure/logging/Logger';
import { IDisposable } from '../../architecture/DependencyContainer';
import { SettingsTab } from '../settings/SettingsTab';

/**
 * SettingsTab 관리자
 * 설정 탭의 안전한 생성과 관리를 담당
 */
export class SettingsTabManager implements IDisposable {
    private settingsTab: PluginSettingTab | null = null;
    private logger: Logger;
    private isDisposed = false;

    constructor(
        private app: App,
        private plugin: SpeechToTextPlugin
    ) {
        this.logger = new Logger('SettingsTabManager');
    }

    /**
     * SettingsTab 초기화
     */
    public initialize(): void {
        try {
            // 이미 초기화된 경우 스킵
            if (this.settingsTab) {
                this.logger.warn('SettingsTab already initialized');
                return;
            }

            // SettingsTab 생성 전 검증
            if (!this.validateEnvironment()) {
                this.logger.warn('Environment not ready for SettingsTab');
                return;
            }

            // SettingsTab 생성
            this.createSettingsTab();

            this.logger.info('SettingsTab initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize SettingsTab', error instanceof Error ? error : undefined);
            // SettingsTab 실패는 치명적이지 않으므로 에러를 던지지 않음
            this.handleInitializationError(error);
        }
    }

    /**
     * 환경 검증
     */
    private validateEnvironment(): boolean {
        // App 객체 검증
        if (!this.app) {
            this.logger.error('App instance is not available');
            return false;
        }

        // Plugin 객체 검증
        if (!this.plugin) {
            this.logger.error('Plugin instance is not available');
            return false;
        }

        // addSettingTab 메서드 검증
        if (typeof this.plugin.addSettingTab !== 'function') {
            this.logger.error('addSettingTab method is not available');
            return false;
        }

        return true;
    }

    /**
     * SettingsTab 생성
     */
    private createSettingsTab(): void {
        try {
            // SettingsTab 인스턴스 생성 (에러 처리 래핑)
            const settingsTab = this.createSafeSettingsTab();
            
            if (!settingsTab) {
                this.logger.warn('Failed to create SettingsTab instance');
                return;
            }

            // Plugin에 등록
            this.registerSettingsTab(settingsTab);
            
            this.settingsTab = settingsTab;
            this.logger.debug('SettingsTab created and registered successfully');
        } catch (error) {
            this.logger.error('Error creating SettingsTab', error instanceof Error ? error : undefined);
            this.settingsTab = null;
        }
    }

    /**
     * 안전한 SettingsTab 생성
     */
    private createSafeSettingsTab(): PluginSettingTab | null {
        try {
            // SettingsTab 클래스가 제대로 로드되었는지 확인
            if (!SettingsTab) {
                this.logger.error('SettingsTab class is not available');
                return null;
            }

            // 타입 체크를 통한 안전한 생성
            const tab = new SettingsTab(this.app, this.plugin);
            
            // 생성된 객체 검증
            if (!tab || typeof tab.display !== 'function') {
                this.logger.error('Invalid SettingsTab instance created');
                return null;
            }

            return tab;
        } catch (error) {
            this.logger.error('Failed to instantiate SettingsTab', error instanceof Error ? error : undefined);
            return null;
        }
    }

    /**
     * SettingsTab 등록
     */
    private registerSettingsTab(settingsTab: PluginSettingTab): void {
        try {
            this.plugin.addSettingTab(settingsTab);
            this.logger.debug('SettingsTab registered with plugin');
        } catch (error) {
            this.logger.error('Failed to register SettingsTab', error instanceof Error ? error : undefined);
            throw error;
        }
    }

    /**
     * 초기화 에러 처리
     */
    private handleInitializationError(error: any): void {
        // 에러 타입에 따른 처리
        if (error?.message?.includes('toLowerCase')) {
            this.logger.error('String method error detected, possibly due to incorrect parameter types');
        } else if (error?.message?.includes('undefined')) {
            this.logger.error('Undefined reference error, checking dependencies');
        }

        // 폴백 처리: 기본 설정 탭 생성 시도
        this.tryCreateFallbackSettingsTab();
    }

    /**
     * 폴백 SettingsTab 생성 시도
     */
    private tryCreateFallbackSettingsTab(): void {
        try {
            // 최소한의 기능을 가진 설정 탭 생성
            const fallbackTab = new MinimalSettingsTab(this.app, this.plugin);
            this.plugin.addSettingTab(fallbackTab);
            this.settingsTab = fallbackTab;
            this.logger.info('Fallback SettingsTab created');
        } catch (error) {
            this.logger.error('Failed to create fallback SettingsTab', error instanceof Error ? error : undefined);
        }
    }

    /**
     * SettingsTab 새로고침
     */
    public refresh(): void {
        if (!this.settingsTab || this.isDisposed) {
            return;
        }

        try {
            if (typeof this.settingsTab.display === 'function') {
                this.settingsTab.display();
                this.logger.debug('SettingsTab refreshed');
            }
        } catch (error) {
            this.logger.error('Failed to refresh SettingsTab', error instanceof Error ? error : undefined);
        }
    }

    /**
     * SettingsTab 사용 가능 여부 확인
     */
    public isAvailable(): boolean {
        return this.settingsTab !== null && !this.isDisposed;
    }

    /**
     * 현재 SettingsTab 인스턴스 반환
     */
    public getSettingsTab(): PluginSettingTab | null {
        return this.settingsTab;
    }

    /**
     * 리소스 정리
     */
    public dispose(): void {
        if (this.isDisposed) return;

        this.isDisposed = true;

        // SettingsTab은 Plugin이 자동으로 정리하므로 별도 처리 불필요
        this.settingsTab = null;

        this.logger.info('SettingsTabManager disposed');
    }
}

/**
 * 최소 기능 SettingsTab (폴백용)
 */
class MinimalSettingsTab extends PluginSettingTab {
    constructor(app: App, plugin: SpeechToTextPlugin) {
        super(app, plugin);
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        
        containerEl.createEl('h2', { text: 'Speech to text settings' });
        containerEl.createEl('p', { 
            text: 'Settings are temporarily unavailable. Please restart Obsidian if this persists.',
            cls: 'settings-error-message'
        });
    }
}
