import { App, Setting, Notice, Modal, ButtonComponent } from 'obsidian';
import { ConfirmationModal } from '../../modals/ConfirmationModal';
import type SpeechToTextPlugin from '../../../main';

/**
 * 단축키 설정 컴포넌트
 * 플러그인의 단축키를 관리하고 충돌을 감지
 */
export class ShortcutSettings {
    private shortcuts: Map<string, ShortcutInfo> = new Map();
    private defaultShortcuts: Map<string, string> = new Map([
        ['transcribe-audio', 'Ctrl+Shift+T'],
        ['transcribe-clipboard', 'Ctrl+Shift+V'],
        ['show-format-options', 'Ctrl+Shift+F'],
        ['show-history', 'Ctrl+Shift+H'],
        ['cancel-transcription', 'Escape'],
        ['undo-insertion', 'Ctrl+Z'],
        ['redo-insertion', 'Ctrl+Shift+Z'],
    ]);

    constructor(private app: App, private plugin: SpeechToTextPlugin) {
        this.loadShortcuts();
    }

    render(containerEl: HTMLElement): void {
        // 단축키 설명
        const descEl = containerEl.createDiv({ cls: 'shortcut-description' });
        descEl.createEl('p', {
            text: '각 기능에 대한 단축키를 설정할 수 있습니다. 단축키를 클릭하여 변경하세요.',
        });

        // 단축키 목록
        this.renderShortcutList(containerEl);

        // 기본값 복원 버튼
        new Setting(containerEl)
            .setName('단축키 초기화')
            .setDesc('모든 단축키를 기본값으로 복원합니다')
            .addButton((button) =>
                button
                    .setButtonText('기본값 복원')
                    .setWarning()
                    .onClick(async () => {
                        new ConfirmationModal(
                            this.app,
                            '단축키 초기화',
                            '모든 단축키를 기본값으로 복원하시겠습니까?',
                            async () => {
                                await this.resetToDefaults();
                                this.render(containerEl); // UI 새로고침
                            }
                        ).open();
                    })
            );

        // 충돌 감지 정보
        this.renderConflictInfo(containerEl);
    }

    /**
     * 단축키 목록 렌더링
     */
    private renderShortcutList(containerEl: HTMLElement): void {
        const listEl = containerEl.createDiv({ cls: 'shortcut-list' });

        const shortcuts = [
            {
                id: 'transcribe-audio',
                name: '음성 파일 변환',
                desc: '음성 파일을 선택하여 텍스트로 변환합니다',
            },
            {
                id: 'transcribe-clipboard',
                name: '클립보드 음성 변환',
                desc: '클립보드의 음성을 텍스트로 변환합니다',
            },
            {
                id: 'show-format-options',
                name: '포맷 옵션 표시',
                desc: '텍스트 포맷 옵션을 표시합니다',
            },
            {
                id: 'show-history',
                name: '변환 기록 표시',
                desc: '최근 변환 기록을 표시합니다',
            },
            {
                id: 'cancel-transcription',
                name: '변환 취소',
                desc: '진행 중인 변환을 취소합니다',
            },
            {
                id: 'undo-insertion',
                name: '삽입 취소',
                desc: '마지막 텍스트 삽입을 취소합니다',
            },
            {
                id: 'redo-insertion',
                name: '삽입 다시 실행',
                desc: '취소한 텍스트 삽입을 다시 실행합니다',
            },
        ];

        shortcuts.forEach((shortcut) => {
            const setting = new Setting(listEl).setName(shortcut.name).setDesc(shortcut.desc);

            // 현재 단축키 표시
            const currentKey = this.getShortcut(shortcut.id);
            const keyEl = setting.controlEl.createDiv({ cls: 'shortcut-key' });

            const keyDisplay = keyEl.createEl('kbd', {
                text: currentKey || '설정 안 됨',
                cls: currentKey ? 'shortcut-set' : 'shortcut-unset',
            });

            // 변경 버튼
            setting.addButton((button) =>
                button.setButtonText('변경').onClick(() => {
                    this.openShortcutModal(shortcut.id, shortcut.name, (newKey) => {
                        if (newKey) {
                            void this.setShortcut(shortcut.id, newKey);
                            keyDisplay.textContent = newKey;
                            keyDisplay.className = 'shortcut-set';
                        }
                    });
                })
            );

            // 삭제 버튼
            if (currentKey) {
                setting.addButton((button) =>
                    button
                        .setButtonText('삭제')
                        .setWarning()
                        .onClick(async () => {
                            await this.removeShortcut(shortcut.id);
                            keyDisplay.textContent = '설정 안 됨';
                            keyDisplay.className = 'shortcut-unset';
                        })
                );
            }
        });
    }

    /**
     * 충돌 정보 렌더링
     */
    private renderConflictInfo(containerEl: HTMLElement): void {
        const conflicts = this.detectConflicts();

        if (conflicts.length > 0) {
            const conflictEl = containerEl.createDiv({ cls: 'shortcut-conflicts' });
            conflictEl.createEl('h4', { text: '⚠️ 단축키 충돌 감지됨' });

            const conflictList = conflictEl.createEl('ul');
            conflicts.forEach((conflict) => {
                conflictList.createEl('li', {
                    text: `"${conflict.key}"가 "${conflict.commands.join('", "')}"에서 중복됩니다`,
                });
            });
        }
    }

    /**
     * 단축키 모달 열기
     */
    private openShortcutModal(
        commandId: string,
        commandName: string,
        onSubmit: (key: string | null) => void
    ): void {
        const modal = new ShortcutModal(
            this.app,
            commandName,
            this.getShortcut(commandId),
            (key) => {
                if (key) {
                    // 충돌 검사
                    const existingCommand = this.findCommandByShortcut(key);
                    if (existingCommand && existingCommand !== commandId) {
                        new ConfirmationModal(
                            this.app,
                            '단축키 충돌',
                            `"${key}"는 이미 다른 명령에 할당되어 있습니다. 덮어쓰시겠습니까?`,
                            () => {
                                // 기존 단축키 제거
                                void this.removeShortcut(existingCommand);
                                onSubmit(key);
                            }
                        ).open();
                        return;
                    }
                }
                onSubmit(key);
            }
        );
        modal.open();
    }

    /**
     * 단축키 로드
     */
    private loadShortcuts(): void {
        // 저장된 단축키 로드 또는 기본값 사용
        const saved = this.getSavedShortcuts();

        this.defaultShortcuts.forEach((defaultKey, commandId) => {
            const key = saved[commandId] || defaultKey;
            this.shortcuts.set(commandId, {
                commandId,
                key,
                isCustom: saved[commandId] !== undefined,
            });
        });
    }

    /**
     * 단축키 저장
     */
    private async saveShortcuts(): Promise<void> {
        const shortcuts: Record<string, string> = {};

        this.shortcuts.forEach((info, commandId) => {
            if (info.isCustom) {
                shortcuts[commandId] = info.key;
            }
        });

        this.plugin.settings['shortcuts'] = shortcuts;
        await this.plugin.saveSettings();
    }

    private getSavedShortcuts(): Record<string, string> {
        const savedValue = this.plugin.settings['shortcuts'];
        const saved: Record<string, string> = {};

        if (savedValue && typeof savedValue === 'object') {
            Object.entries(savedValue).forEach(([key, value]) => {
                if (typeof value === 'string') {
                    saved[key] = value;
                }
            });
        }

        return saved;
    }

    /**
     * 단축키 가져오기
     */
    private getShortcut(commandId: string): string {
        return this.shortcuts.get(commandId)?.key || '';
    }

    /**
     * 단축키 설정
     */
    private async setShortcut(commandId: string, key: string): Promise<void> {
        this.shortcuts.set(commandId, {
            commandId,
            key,
            isCustom: true,
        });

        await this.saveShortcuts();

        // Obsidian 명령에 단축키 등록
        this.registerHotkey(commandId, key);

        new Notice(`단축키가 설정되었습니다: ${key}`);
    }

    /**
     * 단축키 제거
     */
    private async removeShortcut(commandId: string): Promise<void> {
        const defaultKey = this.defaultShortcuts.get(commandId);

        if (defaultKey) {
            // 기본값으로 복원
            this.shortcuts.set(commandId, {
                commandId,
                key: defaultKey,
                isCustom: false,
            });
        } else {
            // 완전히 제거
            this.shortcuts.delete(commandId);
        }

        await this.saveShortcuts();

        // Obsidian에서 단축키 제거
        this.unregisterHotkey(commandId);

        new Notice('단축키가 제거되었습니다');
    }

    /**
     * 기본값으로 초기화
     */
    private async resetToDefaults(): Promise<void> {
        this.shortcuts.clear();

        this.defaultShortcuts.forEach((key, commandId) => {
            this.shortcuts.set(commandId, {
                commandId,
                key,
                isCustom: false,
            });
            this.registerHotkey(commandId, key);
        });

        this.plugin.settings['shortcuts'] = {};
        await this.plugin.saveSettings();

        new Notice('단축키가 기본값으로 복원되었습니다');
    }

    /**
     * 충돌 감지
     */
    private detectConflicts(): Array<{ key: string; commands: string[] }> {
        const keyMap = new Map<string, string[]>();

        this.shortcuts.forEach((info, commandId) => {
            if (!keyMap.has(info.key)) {
                keyMap.set(info.key, []);
            }
            keyMap.get(info.key)!.push(commandId);
        });

        const conflicts: Array<{ key: string; commands: string[] }> = [];

        keyMap.forEach((commands, key) => {
            if (commands.length > 1) {
                conflicts.push({ key, commands });
            }
        });

        return conflicts;
    }

    /**
     * 단축키로 명령 찾기
     */
    private findCommandByShortcut(key: string): string | null {
        for (const [commandId, info] of this.shortcuts) {
            if (info.key === key) {
                return commandId;
            }
        }
        return null;
    }

    /**
     * Obsidian에 단축키 등록
     */
    private registerHotkey(commandId: string, key: string): void {
        // Obsidian API를 통한 단축키 등록
        // 실제 구현은 Obsidian API에 따라 다를 수 있음
        this.debug(`Registering hotkey: ${commandId} -> ${key}`);
    }

    /**
     * Obsidian에서 단축키 제거
     */
    private unregisterHotkey(commandId: string): void {
        // Obsidian API를 통한 단축키 제거
        this.debug(`Unregistering hotkey: ${commandId}`);
    }

    private debug(...args: unknown[]): void {
        if (this.plugin.settings?.debugMode) {
            console.debug('[ShortcutSettings]', ...args);
        }
    }
}

/**
 * 단축키 정보 인터페이스
 */
interface ShortcutInfo {
    commandId: string;
    key: string;
    isCustom: boolean;
}

/**
 * 단축키 설정 모달
 */
class ShortcutModal extends Modal {
    private currentKey = '';
    private recordedKeys: Set<string> = new Set();
    private isRecording = false;

    constructor(
        app: App,
        private commandName: string,
        private initialKey: string,
        private onSubmit: (key: string | null) => void
    ) {
        super(app);
        this.currentKey = initialKey;
    }

    onOpen() {
        const { contentEl } = this;

        contentEl.createEl('h2', { text: `단축키 설정: ${this.commandName}` });

        // 현재 단축키 표시
        const currentKeyEl = contentEl.createDiv({ cls: 'current-shortcut' });
        currentKeyEl.createEl('span', { text: '현재 단축키: ' });
        const keyDisplay = currentKeyEl.createEl('kbd', {
            text: this.currentKey || '설정 안 됨',
            cls: 'shortcut-display',
        });

        // 녹음 영역
        const recordEl = contentEl.createDiv({ cls: 'shortcut-record' });
        recordEl.createEl('p', { text: '새 단축키를 입력하려면 아래 버튼을 클릭하세요:' });

        const recordButton = new ButtonComponent(recordEl)
            .setButtonText('단축키 녹음 시작')
            .onClick(() => {
                this.startRecording(recordButton, keyDisplay);
            });

        // 입력 필드 (직접 입력)
        const manualEl = contentEl.createDiv({ cls: 'shortcut-manual' });
        manualEl.createEl('p', { text: '또는 직접 입력:' });

        const inputEl = manualEl.createEl('input', {
            type: 'text',
            placeholder: '예: Ctrl+Shift+T',
            value: this.currentKey,
        });

        inputEl.addEventListener('input', (e) => {
            const target = e.target;
            if (target instanceof HTMLInputElement) {
                this.currentKey = target.value;
                keyDisplay.textContent = this.currentKey || '설정 안 됨';
            }
        });

        // 버튼
        const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });

        new ButtonComponent(buttonContainer).setButtonText('취소').onClick(() => {
            this.onSubmit(null);
            this.close();
        });

        new ButtonComponent(buttonContainer)
            .setButtonText('삭제')
            .setWarning()
            .onClick(() => {
                this.onSubmit('');
                this.close();
            });

        new ButtonComponent(buttonContainer)
            .setButtonText('저장')
            .setCta()
            .onClick(() => {
                this.onSubmit(this.currentKey);
                this.close();
            });
    }

    /**
     * 단축키 녹음 시작
     */
    private startRecording(button: ButtonComponent, display: HTMLElement): void {
        if (this.isRecording) {
            this.stopRecording(button);
            return;
        }

        this.isRecording = true;
        this.recordedKeys.clear();

        button.setButtonText('녹음 중... (ESC로 취소)');
        button.buttonEl.addClass('is-recording');

        // 키 이벤트 리스너
        const keydownHandler = (e: KeyboardEvent) => {
            e.preventDefault();
            e.stopPropagation();

            if (e.key === 'Escape') {
                this.stopRecording(button);
                document.removeEventListener('keydown', keydownHandler);
                return;
            }

            // 키 조합 생성
            const keys: string[] = [];
            if (e.ctrlKey || e.metaKey) keys.push('Ctrl');
            if (e.altKey) keys.push('Alt');
            if (e.shiftKey) keys.push('Shift');

            // 특수 키 처리
            const key = this.normalizeKey(e.key);
            if (key && !['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
                keys.push(key);
            }

            if (keys.length > 0) {
                this.currentKey = keys.join('+');
                display.textContent = this.currentKey;

                // 녹음 종료
                setTimeout(() => {
                    this.stopRecording(button);
                    document.removeEventListener('keydown', keydownHandler);
                }, 100);
            }
        };

        document.addEventListener('keydown', keydownHandler);
    }

    /**
     * 단축키 녹음 중지
     */
    private stopRecording(button: ButtonComponent): void {
        this.isRecording = false;
        button.setButtonText('단축키 녹음 시작');
        button.buttonEl.removeClass('is-recording');
    }

    /**
     * 키 정규화
     */
    private normalizeKey(key: string): string {
        const keyMap: Record<string, string> = {
            ' ': 'Space',
            ArrowUp: 'Up',
            ArrowDown: 'Down',
            ArrowLeft: 'Left',
            ArrowRight: 'Right',
            Enter: 'Enter',
            Backspace: 'Backspace',
            Delete: 'Delete',
            Tab: 'Tab',
            PageUp: 'PageUp',
            PageDown: 'PageDown',
            Home: 'Home',
            End: 'End',
        };

        return keyMap[key] || key.toUpperCase();
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
