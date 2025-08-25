import { Setting } from 'obsidian';
import type SpeechToTextPlugin from '../../../main';

/**
 * 일반 설정 컴포넌트
 * 기본 동작 및 UI 관련 설정을 관리
 */
export class GeneralSettings {
    constructor(private plugin: SpeechToTextPlugin) {}

    render(containerEl: HTMLElement): void {
        // 자동 삽입 설정
        new Setting(containerEl)
            .setName('자동 삽입')
            .setDesc('변환된 텍스트를 자동으로 노트에 삽입합니다')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.autoInsert)
                .onChange(async (value) => {
                    this.plugin.settings.autoInsert = value;
                    await this.plugin.saveSettings();
                }));

        // 삽입 위치 설정
        new Setting(containerEl)
            .setName('삽입 위치')
            .setDesc('텍스트를 삽입할 위치를 선택하세요')
            .addDropdown(dropdown => dropdown
                .addOption('cursor', '커서 위치')
                .addOption('end', '노트 끝')
                .addOption('beginning', '노트 시작')
                .setValue(this.plugin.settings.insertPosition)
                .onChange(async (value: 'cursor' | 'end' | 'beginning') => {
                    this.plugin.settings.insertPosition = value;
                    await this.plugin.saveSettings();
                }));

        // 텍스트 포맷 설정
        new Setting(containerEl)
            .setName('기본 텍스트 형식')
            .setDesc('변환된 텍스트의 기본 형식을 선택하세요')
            .addDropdown(dropdown => dropdown
                .addOption('plain', '일반 텍스트')
                .addOption('markdown', '마크다운')
                .addOption('quote', '인용구')
                .addOption('bullet', '글머리 기호')
                .addOption('heading', '제목')
                .addOption('code', '코드 블록')
                .addOption('callout', '콜아웃')
                .setValue(this.plugin.settings.textFormat || 'plain')
                .onChange(async (value) => {
                    this.plugin.settings.textFormat = value as any;
                    await this.plugin.saveSettings();
                }));

        // 타임스탬프 추가
        new Setting(containerEl)
            .setName('타임스탬프 추가')
            .setDesc('변환된 텍스트에 타임스탬프를 추가합니다')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.addTimestamp || false)
                .onChange(async (value) => {
                    this.plugin.settings.addTimestamp = value;
                    await this.plugin.saveSettings();
                }));

        // 타임스탬프 형식
        if (this.plugin.settings.addTimestamp) {
            new Setting(containerEl)
                .setName('타임스탬프 형식')
                .setDesc('타임스탬프 표시 형식을 선택하세요')
                .addDropdown(dropdown => dropdown
                    .addOption('none', '없음')
                    .addOption('inline', '인라인')
                    .addOption('sidebar', '사이드바')
                    .setValue(this.plugin.settings.timestampFormat)
                    .onChange(async (value: 'none' | 'inline' | 'sidebar') => {
                        this.plugin.settings.timestampFormat = value;
                        await this.plugin.saveSettings();
                    }));
        }

        // 포맷 옵션 표시
        new Setting(containerEl)
            .setName('포맷 옵션 표시')
            .setDesc('변환 후 텍스트 포맷 옵션을 표시합니다')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showFormatOptions || false)
                .onChange(async (value) => {
                    this.plugin.settings.showFormatOptions = value;
                    await this.plugin.saveSettings();
                }));

        // 새 노트 생성 설정
        new Setting(containerEl)
            .setName('활성 에디터가 없을 때')
            .setDesc('활성 에디터가 없을 때 동작을 선택하세요')
            .addDropdown(dropdown => dropdown
                .addOption('create', '새 노트 생성')
                .addOption('skip', '건너뛰기')
                .addOption('ask', '물어보기')
                .setValue('create') // 기본값
                .onChange(async (value) => {
                    // 추가 설정 저장 로직
                    await this.plugin.saveSettings();
                }));

        // UI 테마
        new Setting(containerEl)
            .setName('UI 테마')
            .setDesc('플러그인 UI 테마를 선택하세요')
            .addDropdown(dropdown => dropdown
                .addOption('auto', '자동 (시스템 따름)')
                .addOption('light', '라이트')
                .addOption('dark', '다크')
                .setValue('auto')
                .onChange(async (value) => {
                    // UI 테마 적용 로직
                    document.body.setAttribute('data-speech-theme', value);
                    await this.plugin.saveSettings();
                }));

        // 알림 설정
        new Setting(containerEl)
            .setName('알림 표시')
            .setDesc('작업 완료 및 오류 알림을 표시합니다')
            .addToggle(toggle => toggle
                .setValue(true)
                .onChange(async (value) => {
                    // 알림 설정 저장
                    await this.plugin.saveSettings();
                }));

        // 사운드 효과
        new Setting(containerEl)
            .setName('사운드 효과')
            .setDesc('작업 완료 시 사운드를 재생합니다')
            .addToggle(toggle => toggle
                .setValue(false)
                .onChange(async (value) => {
                    // 사운드 설정 저장
                    await this.plugin.saveSettings();
                }));
    }
}