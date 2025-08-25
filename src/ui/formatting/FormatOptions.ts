import { App, Modal, Setting, DropdownComponent, ToggleComponent, TextComponent } from 'obsidian';
import { InsertionOptions, InsertionMode } from '../../application/TextInsertionHandler';

/**
 * 텍스트 템플릿 인터페이스
 */
interface TextTemplate {
    name: string;
    format: string;
    content: string;
}

/**
 * 포맷 옵션 컴포넌트 - 텍스트 삽입 시 포맷팅 옵션 설정
 * 
 * 주요 기능:
 * - 다양한 텍스트 포맷 선택
 * - 삽입 위치 설정
 * - 타임스탬프 옵션
 * - 템플릿 관리
 * - 프리뷰 기능
 */
export class FormatOptionsModal extends Modal {
    private options: InsertionOptions;
    private onConfirm: (options: InsertionOptions) => void;
    private onCancel: () => void;
    private previewContainer: HTMLElement | null = null;
    private templates: TextTemplate[] = [];

    constructor(
        app: App,
        defaultOptions: Partial<InsertionOptions>,
        onConfirm: (options: InsertionOptions) => void,
        onCancel: () => void
    ) {
        super(app);
        this.onConfirm = onConfirm;
        this.onCancel = onCancel;
        
        // 기본 옵션 설정
        this.options = {
            mode: 'cursor',
            format: 'plain',
            addTimestamp: false,
            timestampFormat: 'YYYY-MM-DD HH:mm:ss',
            ...defaultOptions
        };

        // 기본 템플릿 로드
        this.loadDefaultTemplates();
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('format-options-modal');

        // 제목
        contentEl.createEl('h2', { text: 'Text Formatting Options' });

        // 탭 컨테이너
        const tabContainer = contentEl.createDiv('format-tabs');
        const tabs = ['Basic', 'Format', 'Advanced', 'Templates'];
        const tabContents: HTMLElement[] = [];

        tabs.forEach((tabName, index) => {
            const tab = tabContainer.createEl('button', {
                text: tabName,
                cls: 'format-tab'
            });

            const content = contentEl.createDiv({
                cls: 'format-tab-content'
            });

            if (index === 0) {
                tab.addClass('active');
                content.addClass('active');
            } else {
                content.style.display = 'none';
            }

            tabContents.push(content);

            tab.onclick = () => {
                // 모든 탭 비활성화
                tabContainer.querySelectorAll('.format-tab').forEach(t => {
                    t.removeClass('active');
                });
                tabContents.forEach(c => {
                    c.removeClass('active');
                    c.style.display = 'none';
                });

                // 선택된 탭 활성화
                tab.addClass('active');
                content.addClass('active');
                content.style.display = 'block';
            };
        });

        // Basic 탭 내용
        this.createBasicTab(tabContents[0]);

        // Format 탭 내용
        this.createFormatTab(tabContents[1]);

        // Advanced 탭 내용
        this.createAdvancedTab(tabContents[2]);

        // Templates 탭 내용
        this.createTemplatesTab(tabContents[3]);

        // 프리뷰 영역
        this.createPreviewSection(contentEl);

        // 버튼 영역
        this.createButtonSection(contentEl);
    }

    /**
     * Basic 탭 생성
     */
    private createBasicTab(container: HTMLElement): void {
        // 삽입 모드 선택
        new Setting(container)
            .setName('Insertion Mode')
            .setDesc('Where to insert the text')
            .addDropdown(dropdown => {
                dropdown
                    .addOption('cursor', 'At Cursor')
                    .addOption('replace', 'Replace Selection')
                    .addOption('append', 'End of Document')
                    .addOption('prepend', 'Beginning of Document')
                    .addOption('line-end', 'End of Current Line')
                    .addOption('new-line', 'New Line Below')
                    .setValue(this.options.mode)
                    .onChange(value => {
                        this.options.mode = value as InsertionMode;
                        this.updatePreview();
                    });
            });

        // 텍스트 포맷 선택
        new Setting(container)
            .setName('Text Format')
            .setDesc('How to format the inserted text')
            .addDropdown(dropdown => {
                dropdown
                    .addOption('plain', 'Plain Text')
                    .addOption('markdown', 'Markdown')
                    .addOption('quote', 'Quote Block')
                    .addOption('bullet', 'Bullet List')
                    .addOption('heading', 'Heading')
                    .addOption('code', 'Code Block')
                    .addOption('callout', 'Callout Block')
                    .setValue(this.options.format)
                    .onChange(value => {
                        this.options.format = value as TextFormat;
                        this.updateFormatSpecificOptions();
                        this.updatePreview();
                    });
            });

        // 타임스탬프 추가
        new Setting(container)
            .setName('Add Timestamp')
            .setDesc('Add timestamp before the text')
            .addToggle(toggle => {
                toggle
                    .setValue(this.options.addTimestamp || false)
                    .onChange(value => {
                        this.options.addTimestamp = value;
                        this.updatePreview();
                    });
            });

        // 타임스탬프 포맷
        if (this.options.addTimestamp) {
            new Setting(container)
                .setName('Timestamp Format')
                .setDesc('Format for the timestamp (YYYY-MM-DD HH:mm:ss)')
                .addText(text => {
                    text
                        .setPlaceholder('YYYY-MM-DD HH:mm:ss')
                        .setValue(this.options.timestampFormat || '')
                        .onChange(value => {
                            this.options.timestampFormat = value;
                            this.updatePreview();
                        });
                });
        }
    }

    /**
     * Format 탭 생성
     */
    private createFormatTab(container: HTMLElement): void {
        const formatSpecificContainer = container.createDiv('format-specific-options');
        this.updateFormatSpecificOptions(formatSpecificContainer);
    }

    /**
     * 포맷별 특수 옵션 업데이트
     */
    private updateFormatSpecificOptions(container?: HTMLElement): void {
        const targetContainer = container || document.querySelector('.format-specific-options') as HTMLElement;
        if (!targetContainer) return;

        targetContainer.empty();

        switch (this.options.format) {
            case 'quote':
                new Setting(targetContainer)
                    .setName('Quote Author')
                    .setDesc('Author attribution for the quote')
                    .addText(text => {
                        text
                            .setPlaceholder('Author name')
                            .setValue(this.options.quoteAuthor || '')
                            .onChange(value => {
                                this.options.quoteAuthor = value;
                                this.updatePreview();
                            });
                    });
                break;

            case 'bullet':
                new Setting(targetContainer)
                    .setName('Bullet Character')
                    .setDesc('Character to use for bullets')
                    .addDropdown(dropdown => {
                        dropdown
                            .addOption('-', '- (Dash)')
                            .addOption('*', '* (Asterisk)')
                            .addOption('+', '+ (Plus)')
                            .addOption('•', '• (Bullet)')
                            .setValue(this.options.bulletChar || '-')
                            .onChange(value => {
                                this.options.bulletChar = value;
                                this.updatePreview();
                            });
                    });
                break;

            case 'heading':
                new Setting(targetContainer)
                    .setName('Heading Level')
                    .setDesc('Level of the heading (1-6)')
                    .addDropdown(dropdown => {
                        for (let i = 1; i <= 6; i++) {
                            dropdown.addOption(String(i), `H${i}`);
                        }
                        dropdown
                            .setValue(String(this.options.headingLevel || 2))
                            .onChange(value => {
                                this.options.headingLevel = parseInt(value);
                                this.updatePreview();
                            });
                    });
                break;

            case 'code':
                new Setting(targetContainer)
                    .setName('Language')
                    .setDesc('Programming language for syntax highlighting')
                    .addText(text => {
                        text
                            .setPlaceholder('javascript, python, etc.')
                            .setValue(this.options.codeLanguage || '')
                            .onChange(value => {
                                this.options.codeLanguage = value;
                                this.updatePreview();
                            });
                    });
                break;

            case 'callout':
                new Setting(targetContainer)
                    .setName('Callout Type')
                    .setDesc('Type of callout block')
                    .addDropdown(dropdown => {
                        dropdown
                            .addOption('info', 'Info')
                            .addOption('tip', 'Tip')
                            .addOption('warning', 'Warning')
                            .addOption('danger', 'Danger')
                            .addOption('note', 'Note')
                            .addOption('abstract', 'Abstract')
                            .addOption('success', 'Success')
                            .addOption('question', 'Question')
                            .addOption('failure', 'Failure')
                            .addOption('example', 'Example')
                            .addOption('quote', 'Quote')
                            .setValue(this.options.calloutType || 'info')
                            .onChange(value => {
                                this.options.calloutType = value;
                                this.updatePreview();
                            });
                    });

                new Setting(targetContainer)
                    .setName('Callout Title')
                    .setDesc('Title for the callout')
                    .addText(text => {
                        text
                            .setPlaceholder('Title')
                            .setValue(this.options.calloutTitle || '')
                            .onChange(value => {
                                this.options.calloutTitle = value;
                                this.updatePreview();
                            });
                    });

                new Setting(targetContainer)
                    .setName('Foldable')
                    .setDesc('Make callout foldable')
                    .addToggle(toggle => {
                        toggle
                            .setValue(this.options.calloutFoldable || false)
                            .onChange(value => {
                                this.options.calloutFoldable = value;
                                this.updatePreview();
                            });
                    });
                break;
        }
    }

    /**
     * Advanced 탭 생성
     */
    private createAdvancedTab(container: HTMLElement): void {
        // 언어 설정
        new Setting(container)
            .setName('Language')
            .setDesc('Language for special processing')
            .addDropdown(dropdown => {
                dropdown
                    .addOption('', 'Auto Detect')
                    .addOption('en', 'English')
                    .addOption('ko', 'Korean')
                    .addOption('ja', 'Japanese')
                    .addOption('zh', 'Chinese')
                    .addOption('es', 'Spanish')
                    .addOption('fr', 'French')
                    .addOption('de', 'German')
                    .setValue(this.options.language || '')
                    .onChange(value => {
                        this.options.language = value;
                        this.updatePreview();
                    });
            });

        // 문단 구분
        new Setting(container)
            .setName('Paragraph Breaks')
            .setDesc('Add paragraph breaks between sentences')
            .addToggle(toggle => {
                toggle
                    .setValue(this.options.paragraphBreaks || false)
                    .onChange(value => {
                        this.options.paragraphBreaks = value;
                        this.updatePreview();
                    });
            });

        // 새 노트 생성
        new Setting(container)
            .setName('Create New Note')
            .setDesc('Create a new note for the text')
            .addToggle(toggle => {
                toggle
                    .setValue(this.options.createNewNote || false)
                    .onChange(value => {
                        this.options.createNewNote = value;
                        this.updateNewNoteOptions();
                    });
            });

        // 새 노트 옵션
        if (this.options.createNewNote) {
            new Setting(container)
                .setName('Note Title')
                .setDesc('Title for the new note')
                .addText(text => {
                    text
                        .setPlaceholder('Transcription-YYYY-MM-DD')
                        .setValue(this.options.noteTitle || '')
                        .onChange(value => {
                            this.options.noteTitle = value;
                        });
                });

            new Setting(container)
                .setName('Note Folder')
                .setDesc('Folder for the new note')
                .addText(text => {
                    text
                        .setPlaceholder('Transcriptions')
                        .setValue(this.options.noteFolder || '')
                        .onChange(value => {
                            this.options.noteFolder = value;
                        });
                });
        }

        // 프리뷰 모드
        new Setting(container)
            .setName('Preview Before Insert')
            .setDesc('Show preview before inserting text')
            .addToggle(toggle => {
                toggle
                    .setValue(this.options.preview || false)
                    .onChange(value => {
                        this.options.preview = value;
                    });
            });
    }

    /**
     * Templates 탭 생성
     */
    private createTemplatesTab(container: HTMLElement): void {
        // 템플릿 선택
        const templateSetting = new Setting(container)
            .setName('Template')
            .setDesc('Select a template to apply');

        const dropdown = new DropdownComponent(templateSetting.controlEl);
        dropdown.addOption('', 'None');
        
        this.templates.forEach(template => {
            dropdown.addOption(template.id, template.name);
        });

        dropdown.onChange(value => {
            const template = this.templates.find(t => t.id === value);
            if (template) {
                this.options.template = template.content;
                this.updatePreview();
            } else {
                this.options.template = undefined;
                this.updatePreview();
            }
        });

        // 커스텀 템플릿
        new Setting(container)
            .setName('Custom Template')
            .setDesc('Use {{content}} for the text placeholder')
            .addTextArea(text => {
                text
                    .setPlaceholder('## {{date}}\n\n{{content}}\n\n---\nTranscribed at {{time}}')
                    .setValue(this.options.template || '')
                    .onChange(value => {
                        this.options.template = value;
                        this.updatePreview();
                    });
                
                text.inputEl.rows = 5;
                text.inputEl.cols = 50;
            });

        // 템플릿 변수 도움말
        const helpContainer = container.createDiv('template-help');
        helpContainer.createEl('h4', { text: 'Available Variables:' });
        const helpList = helpContainer.createEl('ul');
        
        const variables = [
            { var: '{{content}}', desc: 'The transcribed text' },
            { var: '{{date}}', desc: 'Current date' },
            { var: '{{time}}', desc: 'Current time' },
            { var: '{{datetime}}', desc: 'Current date and time' }
        ];

        variables.forEach(v => {
            const li = helpList.createEl('li');
            li.createEl('code', { text: v.var });
            li.createSpan({ text: ` - ${v.desc}` });
        });
    }

    /**
     * 프리뷰 섹션 생성
     */
    private createPreviewSection(container: HTMLElement): void {
        const previewSection = container.createDiv('preview-section');
        previewSection.createEl('h3', { text: 'Preview' });
        
        this.previewContainer = previewSection.createDiv('preview-content');
        this.previewContainer.createEl('p', { 
            text: 'Preview will appear here...',
            cls: 'preview-placeholder'
        });
    }

    /**
     * 버튼 섹션 생성
     */
    private createButtonSection(container: HTMLElement): void {
        const buttonContainer = container.createDiv('button-container');

        // 기본값 복원 버튼
        const resetButton = buttonContainer.createEl('button', {
            text: 'Reset to Defaults',
            cls: 'mod-cta-secondary'
        });
        resetButton.onclick = () => {
            this.resetToDefaults();
        };

        // 취소 버튼
        const cancelButton = buttonContainer.createEl('button', {
            text: 'Cancel'
        });
        cancelButton.onclick = () => {
            this.onCancel();
            this.close();
        };

        // 확인 버튼
        const confirmButton = buttonContainer.createEl('button', {
            text: 'Apply',
            cls: 'mod-cta'
        });
        confirmButton.onclick = () => {
            this.onConfirm(this.options);
            this.close();
        };
    }

    /**
     * 프리뷰 업데이트
     */
    private updatePreview(): void {
        if (!this.previewContainer) return;

        // 샘플 텍스트
        const sampleText = "This is a sample transcribed text to show how the formatting will be applied.";
        
        // 포맷 적용 시뮬레이션
        let preview = this.simulateFormatting(sampleText);
        
        // 프리뷰 표시
        this.previewContainer.empty();
        
        const previewEl = this.previewContainer.createEl('pre', {
            text: preview,
            cls: 'format-preview'
        });
    }

    /**
     * 포맷팅 시뮬레이션
     */
    private simulateFormatting(text: string): string {
        let formatted = text;

        // 포맷 적용
        switch (this.options.format) {
            case 'quote':
                formatted = `> ${formatted}`;
                if (this.options.quoteAuthor) {
                    formatted += `\n> \n> — ${this.options.quoteAuthor}`;
                }
                break;
            case 'bullet':
                const bullet = this.options.bulletChar || '-';
                formatted = `${bullet} ${formatted}`;
                break;
            case 'heading':
                const level = this.options.headingLevel || 2;
                formatted = `${'#'.repeat(level)} ${formatted}`;
                break;
            case 'code':
                const lang = this.options.codeLanguage || '';
                formatted = `\`\`\`${lang}\n${formatted}\n\`\`\``;
                break;
            case 'callout':
                const type = this.options.calloutType || 'info';
                const title = this.options.calloutTitle || '';
                const foldable = this.options.calloutFoldable ? '+' : '';
                formatted = `> [!${type}]${foldable} ${title}\n> ${formatted}`;
                break;
        }

        // 타임스탬프 추가
        if (this.options.addTimestamp) {
            const timestamp = this.formatCurrentDate(this.options.timestampFormat || 'YYYY-MM-DD HH:mm:ss');
            formatted = `[${timestamp}]\n${formatted}`;
        }

        // 템플릿 적용
        if (this.options.template) {
            formatted = this.options.template
                .replace('{{content}}', formatted)
                .replace('{{date}}', new Date().toLocaleDateString())
                .replace('{{time}}', new Date().toLocaleTimeString())
                .replace('{{datetime}}', new Date().toLocaleString());
        }

        return formatted;
    }

    /**
     * 현재 날짜 포맷팅
     */
    private formatCurrentDate(format: string): string {
        const now = new Date();
        const replacements: Record<string, string> = {
            'YYYY': now.getFullYear().toString(),
            'MM': (now.getMonth() + 1).toString().padStart(2, '0'),
            'DD': now.getDate().toString().padStart(2, '0'),
            'HH': now.getHours().toString().padStart(2, '0'),
            'mm': now.getMinutes().toString().padStart(2, '0'),
            'ss': now.getSeconds().toString().padStart(2, '0')
        };

        let formatted = format;
        for (const [key, value] of Object.entries(replacements)) {
            formatted = formatted.replace(new RegExp(key, 'g'), value);
        }

        return formatted;
    }

    /**
     * 새 노트 옵션 업데이트
     */
    private updateNewNoteOptions(): void {
        // Advanced 탭 재렌더링
        const advancedTab = document.querySelectorAll('.format-tab-content')[2];
        if (advancedTab) {
            this.createAdvancedTab(advancedTab as HTMLElement);
        }
    }

    /**
     * 기본값으로 재설정
     */
    private resetToDefaults(): void {
        this.options = {
            mode: 'cursor',
            format: 'plain',
            addTimestamp: false,
            timestampFormat: 'YYYY-MM-DD HH:mm:ss'
        };

        // UI 재렌더링
        this.onOpen();
    }

    /**
     * 기본 템플릿 로드
     */
    private loadDefaultTemplates(): void {
        this.templates = [
            {
                id: 'meeting',
                name: 'Meeting Notes',
                content: '## Meeting Notes - {{date}}\n\n### Attendees\n- \n\n### Agenda\n- \n\n### Discussion\n{{content}}\n\n### Action Items\n- \n\n---\n*Transcribed at {{datetime}}*'
            },
            {
                id: 'daily',
                name: 'Daily Note',
                content: '## {{date}}\n\n### Transcription\n{{content}}\n\n### Thoughts\n\n\n### Tasks\n- [ ] \n\n---\n*Created at {{time}}*'
            },
            {
                id: 'interview',
                name: 'Interview',
                content: '# Interview Notes\n**Date:** {{date}}\n**Time:** {{time}}\n\n## Transcript\n{{content}}\n\n## Key Points\n- \n\n## Follow-up Questions\n- \n\n---'
            },
            {
                id: 'lecture',
                name: 'Lecture Notes',
                content: '# Lecture Notes\n**Date:** {{date}}\n**Topic:** \n\n## Main Content\n{{content}}\n\n## Key Concepts\n1. \n2. \n3. \n\n## Questions\n- \n\n## References\n- \n\n---\n*Transcribed at {{datetime}}*'
            }
        ];
    }

    onClose(): void {
        const { contentEl } = this;
        contentEl.empty();
    }
}

/**
 * 텍스트 포맷 타입
 */
export type TextFormat = 
    | 'plain'
    | 'markdown'
    | 'quote'
    | 'bullet'
    | 'heading'
    | 'code'
    | 'callout';

/**
 * 텍스트 템플릿
 */
interface TextTemplate {
    id: string;
    name: string;
    content: string;
}