import { Setting } from 'obsidian';
import type SpeechToTextPlugin from '../../../main';
import { InsertPosition, TimestampFormat } from '../../../domain/models/Settings';

/**
 * 일반 설정 컴포넌트
 * 기본 동작 및 UI 관련 설정을 관리
 */
export class GeneralSettings {
    constructor(private plugin: SpeechToTextPlugin) {}

    render(containerEl: HTMLElement): void {
        // 자동 삽입 설정
        new Setting(containerEl)
            .setName('Auto-insert transcription')
            .setDesc('Automatically insert transcribed text into the active note')
            .addToggle((toggle) =>
                toggle.setValue(this.plugin.settings.autoInsert).onChange(async (value) => {
                    this.plugin.settings.autoInsert = value;
                    await this.plugin.saveSettings();
                })
            );

        // 삽입 위치 설정
        new Setting(containerEl)
            .setName('Insert position')
            .setDesc('Choose where the transcribed text should be inserted')
            .addDropdown((dropdown) =>
                dropdown
                    .addOption('cursor', 'At cursor position')
                    .addOption('end', 'At end of note')
                    .addOption('beginning', 'At beginning of note')
                    .setValue(this.plugin.settings.insertPosition)
                    .onChange(async (value: string) => {
                        if (this.isInsertPosition(value)) {
                            this.plugin.settings.insertPosition = value;
                            await this.plugin.saveSettings();
                        }
                    })
            );

        // 텍스트 포맷 설정
        new Setting(containerEl)
            .setName('Default text format')
            .setDesc('Choose the default format for transcribed text')
            .addDropdown((dropdown) =>
                dropdown
                    .addOption('plain', 'Plain text')
                    .addOption('markdown', 'Markdown')
                    .addOption('quote', 'Quote')
                    .addOption('bullet', 'Bullet list')
                    .addOption('heading', 'Heading')
                    .addOption('code', 'Code block')
                    .addOption('callout', 'Callout')
                    .setValue(this.plugin.settings.textFormat || 'plain')
                    .onChange(async (value) => {
                        if (this.isTextFormat(value)) {
                            this.plugin.settings.textFormat = value;
                            await this.plugin.saveSettings();
                        }
                    })
            );

        // 타임스탬프 추가
        new Setting(containerEl)
            .setName('Add timestamp')
            .setDesc('Add timestamps to transcribed text')
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.addTimestamp || false)
                    .onChange(async (value) => {
                        this.plugin.settings.addTimestamp = value;
                        await this.plugin.saveSettings();
                    })
            );

        // 타임스탬프 형식
        if (this.plugin.settings.addTimestamp) {
            new Setting(containerEl)
                .setName('Timestamp format')
                .setDesc('Choose how timestamps should be displayed')
                .addDropdown((dropdown) =>
                    dropdown
                        .addOption('none', 'None')
                        .addOption('inline', 'Inline')
                        .addOption('sidebar', 'Sidebar')
                        .setValue(this.plugin.settings.timestampFormat)
                        .onChange(async (value: string) => {
                            if (this.isTimestampFormat(value)) {
                                this.plugin.settings.timestampFormat = value;
                                await this.plugin.saveSettings();
                            }
                        })
                );
        }

        // 포맷 옵션 표시
        new Setting(containerEl)
            .setName('Show format options')
            .setDesc('Show formatting options after transcription')
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.showFormatOptions || false)
                    .onChange(async (value) => {
                        this.plugin.settings.showFormatOptions = value;
                        await this.plugin.saveSettings();
                    })
            );

        // 새 노트 생성 설정
        new Setting(containerEl)
            .setName('When no editor is active')
            .setDesc('Choose what to do when there is no active editor')
            .addDropdown((dropdown) =>
                dropdown
                    .addOption('create', 'Create a new note')
                    .addOption('skip', 'Skip')
                    .addOption('ask', 'Ask first')
                    .setValue('create') // 기본값
                    .onChange(async (_value) => {
                        // 추가 설정 저장 로직
                        await this.plugin.saveSettings();
                    })
            );

        // UI 테마
        new Setting(containerEl)
            .setName('UI theme')
            .setDesc('Choose the plugin UI theme')
            .addDropdown((dropdown) =>
                dropdown
                    .addOption('auto', 'Auto (follow system)')
                    .addOption('light', 'Light')
                    .addOption('dark', 'Dark')
                    .setValue('auto')
                    .onChange(async (value) => {
                        // UI 테마 적용 로직
                        document.body.setAttribute('data-speech-theme', value);
                        await this.plugin.saveSettings();
                    })
            );

        // 알림 설정
        new Setting(containerEl)
            .setName('Show notifications')
            .setDesc('Show completion and error notifications')
            .addToggle((toggle) =>
                toggle.setValue(true).onChange(async (_value) => {
                    // 알림 설정 저장
                    await this.plugin.saveSettings();
                })
            );

        // 사운드 효과
        new Setting(containerEl)
            .setName('Sound effects')
            .setDesc('Play a sound when tasks complete')
            .addToggle((toggle) =>
                toggle.setValue(false).onChange(async (_value) => {
                    // 사운드 설정 저장
                    await this.plugin.saveSettings();
                })
            );
    }

    private isInsertPosition(value: string): value is InsertPosition {
        return value === 'cursor' || value === 'end' || value === 'beginning';
    }

    private isTextFormat(
        value: string
    ): value is 'plain' | 'markdown' | 'quote' | 'bullet' | 'heading' | 'code' | 'callout' {
        return (
            value === 'plain' ||
            value === 'markdown' ||
            value === 'quote' ||
            value === 'bullet' ||
            value === 'heading' ||
            value === 'code' ||
            value === 'callout'
        );
    }

    private isTimestampFormat(value: string): value is TimestampFormat {
        return value === 'none' || value === 'inline' || value === 'sidebar';
    }
}
