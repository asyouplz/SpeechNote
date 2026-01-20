import { App, MarkdownView, Editor, EditorPosition } from 'obsidian';
import { EditorService } from '../../src/application/EditorService';
import { EventManager } from '../../src/application/EventManager';
import { Logger } from '../../src/infrastructure/logging/Logger';

// Mock Obsidian API
jest.mock('obsidian');

describe('EditorService', () => {
    let editorService: EditorService;
    let mockApp: jest.Mocked<App>;
    let mockEventManager: jest.Mocked<EventManager>;
    let mockLogger: jest.Mocked<Logger>;
    let mockEditor: jest.Mocked<Editor>;
    let mockView: jest.Mocked<MarkdownView>;

    beforeEach(() => {
        // Mock 설정
        mockEditor = {
            getCursor: jest.fn(),
            getSelection: jest.fn(),
            replaceRange: jest.fn(),
            replaceSelection: jest.fn(),
            setCursor: jest.fn(),
            getLine: jest.fn(),
            setLine: jest.fn(),
            lastLine: jest.fn(),
            getValue: jest.fn(),
            setValue: jest.fn(),
            setSelection: jest.fn(),
            focus: jest.fn(),
        } as any;

        mockView = {
            editor: mockEditor,
            file: { path: 'test.md' },
        } as any;

        mockApp = {
            workspace: {
                getActiveViewOfType: jest.fn().mockReturnValue(mockView),
                on: jest.fn(),
                openLinkText: jest.fn(),
            },
            vault: {
                create: jest.fn(),
            },
        } as any;

        mockEventManager = {
            emit: jest.fn(),
            on: jest.fn(),
            off: jest.fn(),
            once: jest.fn(),
        } as any;

        mockLogger = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
        } as any;

        editorService = new EditorService(mockApp, mockEventManager, mockLogger);
    });

    describe('getActiveEditor', () => {
        it('should return active editor when available', () => {
            const editor = editorService.getActiveEditor();
            expect(editor).toBe(mockEditor);
        });

        it('should return null when no active view', () => {
            mockApp.workspace.getActiveViewOfType.mockReturnValue(null);
            const editor = editorService.getActiveEditor();
            expect(editor).toBeNull();
        });
    });

    describe('getCursorPosition', () => {
        it('should return cursor position', () => {
            const position: EditorPosition = { line: 5, ch: 10 };
            mockEditor.getCursor.mockReturnValue(position);

            const result = editorService.getCursorPosition();
            expect(result).toEqual(position);
            expect(mockEditor.getCursor).toHaveBeenCalled();
        });

        it('should return null when no active editor', () => {
            mockApp.workspace.getActiveViewOfType.mockReturnValue(null);
            const result = editorService.getCursorPosition();
            expect(result).toBeNull();
        });
    });

    describe('getSelection', () => {
        it('should return selected text', () => {
            const selectedText = 'selected text';
            mockEditor.getSelection.mockReturnValue(selectedText);

            const result = editorService.getSelection();
            expect(result).toBe(selectedText);
            expect(mockEditor.getSelection).toHaveBeenCalled();
        });

        it('should return empty string when no editor', () => {
            mockApp.workspace.getActiveViewOfType.mockReturnValue(null);
            const result = editorService.getSelection();
            expect(result).toBe('');
        });
    });

    describe('insertAtCursor', () => {
        it('should insert text at cursor position', async () => {
            const position: EditorPosition = { line: 1, ch: 0 };
            const text = 'inserted text';
            mockEditor.getCursor.mockReturnValue(position);

            const result = await editorService.insertAtCursor(text);

            expect(result).toBe(true);
            expect(mockEditor.replaceRange).toHaveBeenCalledWith(text, position);
            expect(mockEditor.setCursor).toHaveBeenCalledWith({
                line: 1,
                ch: text.length,
            });
            expect(mockEventManager.emit).toHaveBeenCalledWith('editor:text-inserted', {
                text,
                position,
            });
        });

        it('should return false when no active editor', async () => {
            mockApp.workspace.getActiveViewOfType.mockReturnValue(null);
            const result = await editorService.insertAtCursor('text');

            expect(result).toBe(false);
            expect(mockLogger.warn).toHaveBeenCalled();
        });

        it('should handle insertion errors', async () => {
            mockEditor.replaceRange.mockImplementation(() => {
                throw new Error('Insertion failed');
            });

            const result = await editorService.insertAtCursor('text');

            expect(result).toBe(false);
            expect(mockLogger.error).toHaveBeenCalled();
        });
    });

    describe('replaceSelection', () => {
        it('should replace selected text', async () => {
            const oldText = 'old text';
            const newText = 'new text';
            mockEditor.getSelection.mockReturnValue(oldText);
            mockEditor.getCursor
                .mockReturnValueOnce({ line: 1, ch: 0 })
                .mockReturnValueOnce({ line: 1, ch: 8 });

            const result = await editorService.replaceSelection(newText);

            expect(result).toBe(true);
            expect(mockEditor.replaceSelection).toHaveBeenCalledWith(newText);
            expect(mockEventManager.emit).toHaveBeenCalledWith('editor:text-replaced', {
                oldText,
                newText,
            });
        });
    });

    describe('appendToDocument', () => {
        it('should append text to end of document', async () => {
            const text = 'appended text';
            const lastLineContent = 'last line';
            mockEditor.lastLine.mockReturnValue(10);
            mockEditor.getLine.mockReturnValue(lastLineContent);

            const result = await editorService.appendToDocument(text);

            expect(result).toBe(true);
            expect(mockEditor.replaceRange).toHaveBeenCalledWith(`\n${text}`, {
                line: 10,
                ch: lastLineContent.length,
            });
        });
    });

    describe('prependToDocument', () => {
        it('should prepend text to beginning of document', async () => {
            const text = 'prepended text';

            const result = await editorService.prependToDocument(text);

            expect(result).toBe(true);
            expect(mockEditor.replaceRange).toHaveBeenCalledWith(`${text}\n`, { line: 0, ch: 0 });
        });
    });

    describe('getCurrentLine', () => {
        it('should return current line text', () => {
            const lineText = 'current line text';
            const position: EditorPosition = { line: 5, ch: 0 };
            mockEditor.getCursor.mockReturnValue(position);
            mockEditor.getLine.mockReturnValue(lineText);

            const result = editorService.getCurrentLine();

            expect(result).toBe(lineText);
            expect(mockEditor.getLine).toHaveBeenCalledWith(5);
        });

        it('should return null when no editor', () => {
            mockApp.workspace.getActiveViewOfType.mockReturnValue(null);
            const result = editorService.getCurrentLine();
            expect(result).toBeNull();
        });
    });

    describe('getDocumentContent', () => {
        it('should return entire document content', () => {
            const content = 'document content';
            mockEditor.getValue.mockReturnValue(content);

            const result = editorService.getDocumentContent();

            expect(result).toBe(content);
            expect(mockEditor.getValue).toHaveBeenCalled();
        });
    });

    describe('setDocumentContent', () => {
        it('should set document content', async () => {
            const oldContent = 'old content';
            const newContent = 'new content';
            mockEditor.getValue.mockReturnValue(oldContent);

            const result = await editorService.setDocumentContent(newContent);

            expect(result).toBe(true);
            expect(mockEditor.setValue).toHaveBeenCalledWith(newContent);
        });
    });

    describe('undo/redo', () => {
        it('should undo insert action', async () => {
            const position: EditorPosition = { line: 1, ch: 0 };
            const text = 'inserted text';
            mockEditor.getCursor.mockReturnValue(position);

            // 먼저 텍스트 삽입
            await editorService.insertAtCursor(text);

            // Undo 실행
            const result = await editorService.undo();

            expect(result).toBe(true);
            expect(mockEditor.replaceRange).toHaveBeenCalledWith('', position, {
                line: 1,
                ch: text.length,
            });
        });

        it('should redo insert action', async () => {
            const position: EditorPosition = { line: 1, ch: 0 };
            const text = 'inserted text';
            mockEditor.getCursor.mockReturnValue(position);

            // 삽입 -> Undo -> Redo
            await editorService.insertAtCursor(text);
            await editorService.undo();
            const result = await editorService.redo();

            expect(result).toBe(true);
            // Redo should re-insert the text
            expect(mockEditor.replaceRange).toHaveBeenLastCalledWith(text, position);
        });

        it('should return false when no actions to undo', async () => {
            const result = await editorService.undo();
            expect(result).toBe(false);
        });

        it('should return false when no actions to redo', async () => {
            const result = await editorService.redo();
            expect(result).toBe(false);
        });
    });

    describe('createAndOpenNote', () => {
        it('should create and open new note', async () => {
            const fileName = 'test.md';
            const content = 'note content';
            const mockFile = { path: fileName };

            mockApp.vault.create.mockResolvedValue(mockFile as any);

            const result = await editorService.createAndOpenNote(fileName, content);

            expect(result).toBe(true);
            expect(mockApp.vault.create).toHaveBeenCalledWith(fileName, content);
            expect(mockApp.workspace.openLinkText).toHaveBeenCalledWith(fileName, '', true);
            expect(mockEventManager.emit).toHaveBeenCalledWith('editor:note-created', {
                file: mockFile,
                content,
            });
        });

        it('should handle creation errors', async () => {
            mockApp.vault.create.mockRejectedValue(new Error('Creation failed'));

            const result = await editorService.createAndOpenNote('test.md', 'content');

            expect(result).toBe(false);
            expect(mockLogger.error).toHaveBeenCalled();
        });
    });

    describe('setCursorPosition', () => {
        it('should set cursor position', () => {
            const position: EditorPosition = { line: 5, ch: 10 };

            const result = editorService.setCursorPosition(position);

            expect(result).toBe(true);
            expect(mockEditor.setCursor).toHaveBeenCalledWith(position);
        });

        it('should return false when no editor', () => {
            mockApp.workspace.getActiveViewOfType.mockReturnValue(null);
            const result = editorService.setCursorPosition({ line: 0, ch: 0 });
            expect(result).toBe(false);
        });
    });

    describe('selectRange', () => {
        it('should select text range', () => {
            const from: EditorPosition = { line: 1, ch: 0 };
            const to: EditorPosition = { line: 2, ch: 5 };

            const result = editorService.selectRange(from, to);

            expect(result).toBe(true);
            expect(mockEditor.setSelection).toHaveBeenCalledWith(from, to);
        });
    });

    describe('focus', () => {
        it('should focus editor', () => {
            const result = editorService.focus();

            expect(result).toBe(true);
            expect(mockEditor.focus).toHaveBeenCalled();
        });

        it('should return false when no editor', () => {
            mockApp.workspace.getActiveViewOfType.mockReturnValue(null);
            const result = editorService.focus();
            expect(result).toBe(false);
        });
    });

    describe('clearHistory', () => {
        it('should clear undo/redo history', async () => {
            // Add some history
            const position: EditorPosition = { line: 1, ch: 0 };
            mockEditor.getCursor.mockReturnValue(position);
            await editorService.insertAtCursor('text');

            // Clear history
            editorService.clearHistory();

            // Should not be able to undo
            const result = await editorService.undo();
            expect(result).toBe(false);
        });
    });

    describe('destroy', () => {
        it('should clean up resources', () => {
            editorService.destroy();

            expect(mockLogger.debug).toHaveBeenCalledWith('EditorService destroyed');

            // Should return null after destroy
            const editor = editorService.getActiveEditor();
            expect(editor).toBeNull();
        });
    });
});
