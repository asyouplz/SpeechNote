import { App, MarkdownView, Editor, EditorPosition, EditorRange, Notice } from 'obsidian';
import { Logger } from '../infrastructure/logging/Logger';
import { EventManager } from './EventManager';

/**
 * 에디터 서비스 - 옵시디언 에디터 통합 관리
 * 
 * 주요 기능:
 * - 활성 에디터 감지 및 관리
 * - 커서 위치 추적
 * - 텍스트 삽입/수정
 * - 에디터 상태 관리
 * - Undo/Redo 지원
 */
export class EditorService {
    private activeEditor: Editor | null = null;
    private activeView: MarkdownView | null = null;
    private readonly logger: Logger;
    private readonly undoHistory: EditorAction[] = [];
    private readonly redoHistory: EditorAction[] = [];
    private readonly maxHistorySize = 50;

    constructor(
        private app: App,
        private eventManager: EventManager,
        logger?: Logger
    ) {
        this.logger = logger || new Logger('EditorService');
        this.setupEventListeners();
    }

    /**
     * 이벤트 리스너 설정
     */
    private setupEventListeners(): void {
        // 활성 뷰 변경 감지
        this.app.workspace.on('active-leaf-change', () => {
            this.updateActiveEditor();
        });

        // 에디터 변경 감지
        this.app.workspace.on('editor-change', (editor: Editor) => {
            this.activeEditor = editor;
            this.eventManager.emit('editor:changed', { editor });
        });
    }

    /**
     * 활성 에디터 업데이트
     */
    private updateActiveEditor(): void {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        
        if (view) {
            this.activeView = view;
            this.activeEditor = view.editor;
            this.logger.debug('Active editor updated', { 
                file: view.file?.path 
            });
            
            this.eventManager.emit('editor:active', { 
                view, 
                editor: this.activeEditor 
            });
        } else {
            this.activeView = null;
            this.activeEditor = null;
            this.logger.debug('No active markdown view');
        }
    }

    /**
     * 활성 에디터 가져오기
     */
    getActiveEditor(): Editor | null {
        if (!this.activeEditor) {
            this.updateActiveEditor();
        }
        return this.activeEditor;
    }

    /**
     * 활성 뷰 가져오기
     */
    getActiveView(): MarkdownView | null {
        if (!this.activeView) {
            this.updateActiveEditor();
        }
        return this.activeView;
    }

    /**
     * 에디터가 활성화되어 있는지 확인
     */
    hasActiveEditor(): boolean {
        return this.getActiveEditor() !== null;
    }

    /**
     * 현재 커서 위치 가져오기
     */
    getCursorPosition(): EditorPosition | null {
        const editor = this.getActiveEditor();
        if (!editor) return null;
        
        return editor.getCursor();
    }

    /**
     * 선택 영역 가져오기
     */
    getSelection(): string {
        const editor = this.getActiveEditor();
        if (!editor) return '';
        
        return editor.getSelection();
    }

    /**
     * 선택 영역 범위 가져오기
     */
    getSelectionRange(): EditorRange | null {
        const editor = this.getActiveEditor();
        if (!editor) return null;
        
        const from = editor.getCursor('from');
        const to = editor.getCursor('to');
        
        return { from, to };
    }

    /**
     * 커서 위치에 텍스트 삽입
     */
    async insertAtCursor(text: string, recordHistory = true): Promise<boolean> {
        const editor = this.getActiveEditor();
        if (!editor) {
            this.logger.warn('No active editor for text insertion');
            return false;
        }

        try {
            const cursor = editor.getCursor();
            
            if (recordHistory) {
                this.recordAction({
                    type: 'insert',
                    position: cursor,
                    text,
                    timestamp: Date.now()
                });
            }

            editor.replaceRange(text, cursor);
            
            // 커서를 삽입된 텍스트 끝으로 이동
            const newCursor = {
                line: cursor.line,
                ch: cursor.ch + text.length
            };
            editor.setCursor(newCursor);
            
            this.logger.debug('Text inserted at cursor', { 
                position: cursor, 
                textLength: text.length 
            });
            
            this.eventManager.emit('editor:text-inserted', { 
                text, 
                position: cursor 
            });
            
            return true;
        } catch (error) {
            this.logger.error('Failed to insert text at cursor', error as Error);
            return false;
        }
    }

    /**
     * 선택 영역 대체
     */
    async replaceSelection(text: string, recordHistory = true): Promise<boolean> {
        const editor = this.getActiveEditor();
        if (!editor) {
            this.logger.warn('No active editor for text replacement');
            return false;
        }

        try {
            const selection = editor.getSelection();
            const range = this.getSelectionRange();
            
            if (recordHistory && range) {
                this.recordAction({
                    type: 'replace',
                    range,
                    oldText: selection,
                    newText: text,
                    timestamp: Date.now()
                });
            }

            editor.replaceSelection(text);
            
            this.logger.debug('Selection replaced', { 
                oldLength: selection.length, 
                newLength: text.length 
            });
            
            this.eventManager.emit('editor:text-replaced', { 
                oldText: selection, 
                newText: text 
            });
            
            return true;
        } catch (error) {
            this.logger.error('Failed to replace selection', error as Error);
            return false;
        }
    }

    /**
     * 특정 위치에 텍스트 삽입
     */
    async insertAtPosition(
        text: string, 
        position: EditorPosition, 
        recordHistory = true
    ): Promise<boolean> {
        const editor = this.getActiveEditor();
        if (!editor) {
            this.logger.warn('No active editor for text insertion');
            return false;
        }

        try {
            if (recordHistory) {
                this.recordAction({
                    type: 'insert',
                    position,
                    text,
                    timestamp: Date.now()
                });
            }

            editor.replaceRange(text, position);
            
            this.logger.debug('Text inserted at position', { 
                position, 
                textLength: text.length 
            });
            
            return true;
        } catch (error) {
            this.logger.error('Failed to insert text at position', error as Error);
            return false;
        }
    }

    /**
     * 라인 끝에 텍스트 추가
     */
    async appendToLine(lineNumber: number, text: string): Promise<boolean> {
        const editor = this.getActiveEditor();
        if (!editor) return false;

        try {
            const line = editor.getLine(lineNumber);
            if (line === undefined) {
                this.logger.warn('Invalid line number', { lineNumber });
                return false;
            }

            const position: EditorPosition = {
                line: lineNumber,
                ch: line.length
            };

            return await this.insertAtPosition(text, position);
        } catch (error) {
            this.logger.error('Failed to append to line', error as Error);
            return false;
        }
    }

    /**
     * 문서 끝에 텍스트 추가
     */
    async appendToDocument(text: string, addNewLine = true): Promise<boolean> {
        const editor = this.getActiveEditor();
        if (!editor) return false;

        try {
            const lastLine = editor.lastLine();
            const lastLineText = editor.getLine(lastLine);
            const position: EditorPosition = {
                line: lastLine,
                ch: lastLineText.length
            };

            const textToInsert = addNewLine ? `\n${text}` : text;
            return await this.insertAtPosition(textToInsert, position);
        } catch (error) {
            this.logger.error('Failed to append to document', error as Error);
            return false;
        }
    }

    /**
     * 문서 시작에 텍스트 추가
     */
    async prependToDocument(text: string, addNewLine = true): Promise<boolean> {
        const editor = this.getActiveEditor();
        if (!editor) return false;

        try {
            const position: EditorPosition = { line: 0, ch: 0 };
            const textToInsert = addNewLine ? `${text}\n` : text;
            return await this.insertAtPosition(textToInsert, position);
        } catch (error) {
            this.logger.error('Failed to prepend to document', error as Error);
            return false;
        }
    }

    /**
     * 현재 라인 가져오기
     */
    getCurrentLine(): string | null {
        const editor = this.getActiveEditor();
        if (!editor) return null;

        const cursor = editor.getCursor();
        return editor.getLine(cursor.line);
    }

    /**
     * 현재 라인 번호 가져오기
     */
    getCurrentLineNumber(): number | null {
        const cursor = this.getCursorPosition();
        return cursor ? cursor.line : null;
    }

    /**
     * 전체 문서 내용 가져오기
     */
    getDocumentContent(): string | null {
        const editor = this.getActiveEditor();
        if (!editor) return null;

        return editor.getValue();
    }

    /**
     * 전체 문서 내용 설정
     */
    async setDocumentContent(content: string): Promise<boolean> {
        const editor = this.getActiveEditor();
        if (!editor) return false;

        try {
            const oldContent = editor.getValue();
            
            this.recordAction({
                type: 'set-content',
                oldText: oldContent,
                newText: content,
                timestamp: Date.now()
            });

            editor.setValue(content);
            
            this.logger.debug('Document content updated');
            
            return true;
        } catch (error) {
            this.logger.error('Failed to set document content', error as Error);
            return false;
        }
    }

    /**
     * 액션 기록 (Undo/Redo용)
     */
    private recordAction(action: EditorAction): void {
        this.undoHistory.push(action);
        
        // 히스토리 크기 제한
        if (this.undoHistory.length > this.maxHistorySize) {
            this.undoHistory.shift();
        }
        
        // Redo 히스토리 초기화
        this.redoHistory.length = 0;
    }

    /**
     * Undo 실행
     */
    async undo(): Promise<boolean> {
        if (this.undoHistory.length === 0) {
            this.logger.debug('No actions to undo');
            return false;
        }

        const editor = this.getActiveEditor();
        if (!editor) return false;

        const action = this.undoHistory.pop()!;
        this.redoHistory.push(action);

        try {
            switch (action.type) {
                case 'insert':
                    // 삽입된 텍스트 제거
                    if (action.position && action.text) {
                        const from = action.position;
                        const to = {
                            line: from.line,
                            ch: from.ch + action.text.length
                        };
                        editor.replaceRange('', from, to);
                    }
                    break;
                    
                case 'replace':
                    // 이전 텍스트로 복원
                    if (action.range && action.oldText !== undefined) {
                        editor.replaceRange(action.oldText, action.range.from, action.range.to);
                    }
                    break;
                    
                case 'set-content':
                    // 이전 내용으로 복원
                    if (action.oldText !== undefined) {
                        editor.setValue(action.oldText);
                    }
                    break;
            }
            
            this.logger.debug('Undo executed', { actionType: action.type });
            return true;
        } catch (error) {
            this.logger.error('Failed to execute undo', error as Error);
            return false;
        }
    }

    /**
     * Redo 실행
     */
    async redo(): Promise<boolean> {
        if (this.redoHistory.length === 0) {
            this.logger.debug('No actions to redo');
            return false;
        }

        const editor = this.getActiveEditor();
        if (!editor) return false;

        const action = this.redoHistory.pop()!;
        this.undoHistory.push(action);

        try {
            switch (action.type) {
                case 'insert':
                    // 텍스트 다시 삽입
                    if (action.position && action.text) {
                        editor.replaceRange(action.text, action.position);
                    }
                    break;
                    
                case 'replace':
                    // 새 텍스트로 다시 대체
                    if (action.range && action.newText !== undefined) {
                        editor.replaceRange(action.newText, action.range.from, action.range.to);
                    }
                    break;
                    
                case 'set-content':
                    // 새 내용으로 다시 설정
                    if (action.newText !== undefined) {
                        editor.setValue(action.newText);
                    }
                    break;
            }
            
            this.logger.debug('Redo executed', { actionType: action.type });
            return true;
        } catch (error) {
            this.logger.error('Failed to execute redo', error as Error);
            return false;
        }
    }

    /**
     * 히스토리 초기화
     */
    clearHistory(): void {
        this.undoHistory.length = 0;
        this.redoHistory.length = 0;
        this.logger.debug('Editor history cleared');
    }

    /**
     * 새 노트 생성 및 열기
     */
    async createAndOpenNote(
        fileName: string, 
        content: string, 
        folder = ''
    ): Promise<boolean> {
        try {
            const path = folder ? `${folder}/${fileName}` : fileName;
            const file = await this.app.vault.create(path, content);
            
            await this.app.workspace.openLinkText(file.path, '', true);
            
            this.logger.debug('New note created and opened', { path });
            
            this.eventManager.emit('editor:note-created', { 
                file, 
                content 
            });
            
            return true;
        } catch (error) {
            this.logger.error('Failed to create and open note', error as Error);
            new Notice('Failed to create new note');
            return false;
        }
    }

    /**
     * 커서 위치 설정
     */
    setCursorPosition(position: EditorPosition): boolean {
        const editor = this.getActiveEditor();
        if (!editor) return false;

        try {
            editor.setCursor(position);
            return true;
        } catch (error) {
            this.logger.error('Failed to set cursor position', error as Error);
            return false;
        }
    }

    /**
     * 텍스트 선택
     */
    selectRange(from: EditorPosition, to: EditorPosition): boolean {
        const editor = this.getActiveEditor();
        if (!editor) return false;

        try {
            editor.setSelection(from, to);
            return true;
        } catch (error) {
            this.logger.error('Failed to select range', error as Error);
            return false;
        }
    }

    /**
     * 에디터 포커스
     */
    focus(): boolean {
        const editor = this.getActiveEditor();
        if (!editor) return false;

        try {
            editor.focus();
            return true;
        } catch (error) {
            this.logger.error('Failed to focus editor', error as Error);
            return false;
        }
    }

    /**
     * 클린업
     */
    destroy(): void {
        this.clearHistory();
        this.activeEditor = null;
        this.activeView = null;
        this.logger.debug('EditorService destroyed');
    }
}

/**
 * 에디터 액션 타입 (Undo/Redo용)
 */
interface EditorAction {
    type: 'insert' | 'replace' | 'set-content';
    position?: EditorPosition;
    range?: EditorRange;
    text?: string;
    oldText?: string;
    newText?: string;
    timestamp: number;
}