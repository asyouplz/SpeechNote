import { Notice } from 'obsidian';
import { EditorService } from './EditorService';
import { EventManager } from './EventManager';
import { Logger } from '../infrastructure/logging/Logger';
import { TextFormat } from '../ui/formatting/FormatOptions';

/**
 * 텍스트 삽입 핸들러 - 변환된 텍스트를 에디터에 삽입하는 로직 처리
 *
 * 주요 기능:
 * - 다양한 삽입 모드 지원
 * - 포맷팅 적용
 * - 삽입 전 프리뷰
 * - 다국어 텍스트 처리
 * - 템플릿 적용
 */
export class TextInsertionHandler {
    private readonly logger: Logger;
    private previewMode = false;
    private lastInsertedText = '';
    private insertionHistory: InsertionRecord[] = [];
    private readonly maxHistorySize = 20;

    private normalizeError(error: unknown): Error {
        return error instanceof Error ? error : new Error('Unknown error');
    }

    constructor(
        private editorService: EditorService,
        private eventManager: EventManager,
        logger?: Logger
    ) {
        this.logger = logger || new Logger('TextInsertionHandler');
        this.setupEventListeners();
    }

    /**
     * 이벤트 리스너 설정
     */
    private setupEventListeners(): void {
        // 텍스트 삽입 이벤트 리스닝
        this.eventManager.on('transcription:complete', async (data) => {
            if (data.autoInsert) {
                await this.handleTranscriptionComplete(data.text, data.options);
            }
        });
    }

    /**
     * 변환 완료 텍스트 처리
     */
    private async handleTranscriptionComplete(
        text: string,
        options?: InsertionOptions
    ): Promise<void> {
        const defaultOptions: InsertionOptions = {
            mode: 'cursor',
            format: 'plain',
            addTimestamp: false,
            ...options,
        };

        await this.insertText(text, defaultOptions);
    }

    /**
     * 텍스트 삽입 메인 메서드
     */
    async insertText(text: string, options: InsertionOptions): Promise<boolean> {
        try {
            // 에디터 체크
            if (!this.editorService.hasActiveEditor()) {
                // 새 노트 생성 옵션
                if (options.createNewNote) {
                    return await this.createNewNoteWithText(text, options);
                }

                new Notice('No active editor. Please open a note first.');
                return false;
            }

            // 텍스트 포맷팅
            const formattedText = await this.formatText(text, options);

            // 프리뷰 모드 처리
            if (this.previewMode || options.preview) {
                return await this.showPreview(formattedText, options);
            }

            // 실제 삽입 실행
            const success = await this.executeInsertion(formattedText, options);

            if (success) {
                // 히스토리 기록
                this.recordInsertion({
                    text: formattedText,
                    originalText: text,
                    options,
                    timestamp: Date.now(),
                });

                // 이벤트 발생
                this.eventManager.emit('text:inserted', {
                    text: formattedText,
                    options,
                });

                this.logger.debug('Text inserted successfully', {
                    mode: options.mode,
                    textLength: formattedText.length,
                });
            }

            return success;
        } catch (error) {
            this.logger.error('Failed to insert text', this.normalizeError(error));
            new Notice('Failed to insert text. Please try again.');
            return false;
        }
    }

    /**
     * 텍스트 포맷팅 적용
     */
    private async formatText(text: string, options: InsertionOptions): Promise<string> {
        await Promise.resolve();

        let formatted = text;

        // 기본 정리
        formatted = this.cleanupText(formatted);

        // 포맷 적용
        switch (options.format) {
            case 'markdown':
                formatted = this.applyMarkdownFormat(formatted, options);
                break;
            case 'quote':
                formatted = this.applyQuoteFormat(formatted, options);
                break;
            case 'bullet':
                formatted = this.applyBulletFormat(formatted, options);
                break;
            case 'heading':
                formatted = this.applyHeadingFormat(formatted, options);
                break;
            case 'code':
                formatted = this.applyCodeFormat(formatted, options);
                break;
            case 'callout':
                formatted = this.applyCalloutFormat(formatted, options);
                break;
        }

        // 타임스탬프 추가
        if (options.addTimestamp) {
            formatted = this.addTimestamp(formatted, options.timestampFormat);
        }

        // 템플릿 적용
        if (options.template) {
            formatted = this.applyTemplate(formatted, options.template);
        }

        // 언어별 처리
        if (options.language) {
            formatted = this.processLanguageSpecific(formatted, options.language);
        }

        return formatted;
    }

    /**
     * 텍스트 정리
     */
    private cleanupText(text: string): string {
        return text
            .trim()
            .replace(/\r\n/g, '\n') // 줄바꿈 정규화
            .replace(/\n{3,}/g, '\n\n') // 과도한 줄바꿈 제거
            .replace(/^\s+|\s+$/gm, ''); // 각 줄 앞뒤 공백 제거
    }

    /**
     * 마크다운 포맷 적용
     */
    private applyMarkdownFormat(text: string, options: InsertionOptions): string {
        let formatted = text;

        // 문단 구분
        if (options.paragraphBreaks) {
            formatted = formatted
                .split(/\n+/)
                .filter((p) => p.trim())
                .join('\n\n');
        }

        return formatted;
    }

    /**
     * 인용구 포맷 적용
     */
    private applyQuoteFormat(text: string, options: InsertionOptions): string {
        const lines = text.split('\n');
        const quoted = lines.map((line) => `> ${line}`).join('\n');

        if (options.quoteAuthor) {
            return `${quoted}\n> \n> — ${options.quoteAuthor}`;
        }

        return quoted;
    }

    /**
     * 불릿 포맷 적용
     */
    private applyBulletFormat(text: string, options: InsertionOptions): string {
        const lines = text.split('\n').filter((line) => line.trim());
        const bulletChar = options.bulletChar || '-';

        return lines.map((line) => `${bulletChar} ${line}`).join('\n');
    }

    /**
     * 제목 포맷 적용
     */
    private applyHeadingFormat(text: string, options: InsertionOptions): string {
        const level = options.headingLevel || 2;
        const prefix = '#'.repeat(level);

        // 첫 줄만 제목으로
        const lines = text.split('\n');
        if (lines.length > 0) {
            lines[0] = `${prefix} ${lines[0]}`;
        }

        return lines.join('\n');
    }

    /**
     * 코드 포맷 적용
     */
    private applyCodeFormat(text: string, options: InsertionOptions): string {
        const language = options.codeLanguage || '';
        return `\`\`\`${language}\n${text}\n\`\`\``;
    }

    /**
     * 콜아웃 포맷 적용
     */
    private applyCalloutFormat(text: string, options: InsertionOptions): string {
        const type = options.calloutType || 'info';
        const title = options.calloutTitle || '';
        const foldable = options.calloutFoldable ? '+' : '';

        return `> [!${type}]${foldable} ${title}\n> ${text.replace(/\n/g, '\n> ')}`;
    }

    /**
     * 타임스탬프 추가
     */
    private addTimestamp(text: string, format?: string): string {
        const now = new Date();
        const timestamp = format ? this.formatDate(now, format) : now.toISOString();

        return `[${timestamp}]\n${text}`;
    }

    /**
     * 날짜 포맷팅
     */
    private formatDate(date: Date, format: string): string {
        const replacements: Record<string, string> = {
            YYYY: date.getFullYear().toString(),
            MM: (date.getMonth() + 1).toString().padStart(2, '0'),
            DD: date.getDate().toString().padStart(2, '0'),
            HH: date.getHours().toString().padStart(2, '0'),
            mm: date.getMinutes().toString().padStart(2, '0'),
            ss: date.getSeconds().toString().padStart(2, '0'),
        };

        let formatted = format;
        for (const [key, value] of Object.entries(replacements)) {
            formatted = formatted.replace(new RegExp(key, 'g'), value);
        }

        return formatted;
    }

    /**
     * 템플릿 적용
     */
    private applyTemplate(text: string, template: string): string {
        return template
            .replace('{{content}}', text)
            .replace('{{date}}', new Date().toLocaleDateString())
            .replace('{{time}}', new Date().toLocaleTimeString())
            .replace('{{datetime}}', new Date().toLocaleString());
    }

    /**
     * 언어별 특수 처리
     */
    private processLanguageSpecific(text: string, language: string): string {
        switch (language) {
            case 'ko':
                // 한국어 특수 처리
                return this.processKoreanText(text);
            case 'ja':
                // 일본어 특수 처리
                return this.processJapaneseText(text);
            case 'zh':
                // 중국어 특수 처리
                return this.processChineseText(text);
            default:
                return text;
        }
    }

    /**
     * 한국어 텍스트 처리
     */
    private processKoreanText(text: string): string {
        // 한국어 맞춤법 교정이나 특수 처리
        return text
            .replace(/\s+([.,!?])/g, '$1') // 구두점 앞 공백 제거
            .replace(/([.,!?])\s*/g, '$1 ') // 구두점 뒤 공백 추가
            .trim();
    }

    /**
     * 일본어 텍스트 처리
     */
    private processJapaneseText(text: string): string {
        // 일본어 특수 처리
        return text;
    }

    /**
     * 중국어 텍스트 처리
     */
    private processChineseText(text: string): string {
        // 중국어 특수 처리
        return text;
    }

    /**
     * 실제 삽입 실행
     */
    private async executeInsertion(text: string, options: InsertionOptions): Promise<boolean> {
        switch (options.mode) {
            case 'cursor':
                return await this.editorService.insertAtCursor(text);

            case 'replace':
                return await this.editorService.replaceSelection(text);

            case 'append':
                return await this.editorService.appendToDocument(text, true);

            case 'prepend':
                return await this.editorService.prependToDocument(text, true);

            case 'line-end': {
                const lineNumber = this.editorService.getCurrentLineNumber();
                if (lineNumber !== null) {
                    return await this.editorService.appendToLine(lineNumber, text);
                }
                return false;
            }

            case 'new-line': {
                const cursor = this.editorService.getCursorPosition();
                if (cursor) {
                    return await this.editorService.insertAtPosition(`\n${text}`, cursor);
                }
                return false;
            }

            default:
                return await this.editorService.insertAtCursor(text);
        }
    }

    /**
     * 프리뷰 표시
     */
    private async showPreview(text: string, options: InsertionOptions): Promise<boolean> {
        await Promise.resolve();

        // 프리뷰 모달 표시 (별도 구현 필요)
        new Notice(`Preview:\n${text.substring(0, 100)}...`);

        this.eventManager.emit('text:preview', {
            text,
            options,
        });

        return true;
    }

    /**
     * 새 노트 생성 및 텍스트 삽입
     */
    private async createNewNoteWithText(text: string, options: InsertionOptions): Promise<boolean> {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = options.noteTitle || `Transcription-${timestamp}.md`;
        const folder = options.noteFolder || '';

        const content = await this.formatText(text, options);

        return await this.editorService.createAndOpenNote(fileName, content, folder);
    }

    /**
     * 삽입 기록
     */
    private recordInsertion(record: InsertionRecord): void {
        this.insertionHistory.push(record);

        // 히스토리 크기 제한
        if (this.insertionHistory.length > this.maxHistorySize) {
            this.insertionHistory.shift();
        }

        this.lastInsertedText = record.text;
    }

    /**
     * 마지막 삽입 텍스트 가져오기
     */
    getLastInsertedText(): string {
        return this.lastInsertedText;
    }

    /**
     * 삽입 히스토리 가져오기
     */
    getInsertionHistory(): InsertionRecord[] {
        return [...this.insertionHistory];
    }

    /**
     * 프리뷰 모드 설정
     */
    setPreviewMode(enabled: boolean): void {
        this.previewMode = enabled;
        this.logger.debug('Preview mode changed', { enabled });
    }

    /**
     * 프리뷰 모드 상태
     */
    isPreviewMode(): boolean {
        return this.previewMode;
    }

    /**
     * 히스토리 초기화
     */
    clearHistory(): void {
        this.insertionHistory = [];
        this.lastInsertedText = '';
        this.logger.debug('Insertion history cleared');
    }

    /**
     * 클린업
     */
    destroy(): void {
        this.clearHistory();
        this.logger.debug('TextInsertionHandler destroyed');
    }
}

/**
 * 삽입 옵션 인터페이스
 */
export interface InsertionOptions {
    mode: InsertionMode;
    format: TextFormat;
    addTimestamp?: boolean;
    timestampFormat?: string;
    template?: string;
    language?: string;
    preview?: boolean;
    createNewNote?: boolean;
    noteTitle?: string;
    noteFolder?: string;
    paragraphBreaks?: boolean;
    quoteAuthor?: string;
    bulletChar?: string;
    headingLevel?: number;
    codeLanguage?: string;
    calloutType?: string;
    calloutTitle?: string;
    calloutFoldable?: boolean;
}

/**
 * 삽입 모드
 */
export type InsertionMode =
    | 'cursor' // 커서 위치
    | 'replace' // 선택 영역 대체
    | 'append' // 문서 끝
    | 'prepend' // 문서 시작
    | 'line-end' // 현재 줄 끝
    | 'new-line'; // 새 줄

/**
 * 삽입 기록
 */
interface InsertionRecord {
    text: string;
    originalText: string;
    options: InsertionOptions;
    timestamp: number;
}
