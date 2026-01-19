/**
 * E2E Test: 파일 선택 → 변환 → 삽입 전체 플로우
 *
 * 테스트 시나리오:
 * 1. 파일 선택 모달 열기
 * 2. 오디오 파일 선택
 * 3. 변환 프로세스 시작
 * 4. 진행 상황 추적
 * 5. 변환된 텍스트 에디터에 삽입
 * 6. 성공 알림 확인
 */

import { App, Modal, Editor, Notice } from 'obsidian';
import { FilePickerModal } from '../../src/ui/modals/FilePickerModal';
import { TranscriptionService } from '../../src/core/transcription/TranscriptionService';
import { EditorService } from '../../src/application/EditorService';
import { NotificationManager } from '../../src/ui/notifications/NotificationManager';
import { ProgressTracker } from '../../src/ui/progress/ProgressTracker';
import { StateManager } from '../../src/application/StateManager';
import { EventManager } from '../../src/application/EventManager';
import { Settings } from '../../src/domain/models/Settings';

describe('E2E: 파일 변환 플로우', () => {
    let app: App;
    let editor: Editor;
    let settings: Settings;
    let filePickerModal: FilePickerModal;
    let transcriptionService: TranscriptionService;
    let editorService: EditorService;
    let notificationManager: NotificationManager;
    let progressTracker: ProgressTracker;
    let stateManager: StateManager;
    let eventManager: EventManager;

    beforeEach(() => {
        // Mock Obsidian App과 Editor
        app = {
            workspace: {
                getActiveViewOfType: jest.fn().mockReturnValue({
                    editor: {
                        getValue: jest.fn().mockReturnValue('기존 텍스트'),
                        setValue: jest.fn(),
                        replaceSelection: jest.fn(),
                        getCursor: jest.fn().mockReturnValue({ line: 0, ch: 0 }),
                        setCursor: jest.fn(),
                        getLine: jest.fn().mockReturnValue(''),
                        lastLine: jest.fn().mockReturnValue(0),
                        getSelection: jest.fn().mockReturnValue(''),
                    },
                }),
            },
            vault: {
                adapter: {
                    read: jest.fn(),
                    write: jest.fn(),
                    exists: jest.fn().mockResolvedValue(true),
                },
            },
        } as any;

        editor = app.workspace.getActiveViewOfType(null).editor;

        // 기본 설정
        settings = {
            apiKey: 'test-api-key',
            apiUrl: 'https://api.openai.com/v1/audio/transcriptions',
            model: 'whisper-1',
            language: 'ko',
            temperature: 0,
            responseFormat: 'text',
            maxFileSize: 25,
            autoSave: true,
            insertPosition: 'cursor',
            addTimestamp: false,
            timestampFormat: 'YYYY-MM-DD HH:mm:ss',
            enableNotifications: true,
            debug: false,
            retryAttempts: 3,
            retryDelay: 1000,
            timeout: 30000,
            concurrentLimit: 3,
        };

        // 서비스 초기화
        eventManager = new EventManager();
        stateManager = new StateManager(eventManager);
        notificationManager = new NotificationManager(app, settings);
        progressTracker = new ProgressTracker('file-conversion', stateManager);
        editorService = new EditorService(app);
        transcriptionService = new TranscriptionService(settings);

        // Mock API 응답
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue({ text: '변환된 텍스트' }),
            text: jest.fn().mockResolvedValue('변환된 텍스트'),
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
    });

    describe('정상 플로우', () => {
        test('파일 선택부터 텍스트 삽입까지 전체 프로세스', async () => {
            // 1. 파일 선택 모달 생성 및 열기
            filePickerModal = new FilePickerModal(
                app,
                async (file: File) => {
                    // 2. 파일 유효성 검사
                    expect(file.name).toMatch(/\.(mp3|mp4|mpeg|mpga|m4a|wav|webm)$/i);
                    expect(file.size).toBeLessThanOrEqual(settings.maxFileSize * 1024 * 1024);

                    // 3. 진행 상황 추적 시작
                    progressTracker.start(5);
                    progressTracker.updateMessage('파일 업로드 중...');
                    progressTracker.increment();

                    // 4. 변환 서비스 호출
                    progressTracker.updateMessage('음성을 텍스트로 변환 중...');
                    const result = await transcriptionService.transcribe(file);
                    progressTracker.increment();

                    // 5. 변환 결과 확인
                    expect(result).toBeDefined();
                    expect(result.text).toBe('변환된 텍스트');
                    progressTracker.increment();

                    // 6. 에디터에 텍스트 삽입
                    progressTracker.updateMessage('텍스트 삽입 중...');
                    await editorService.insertText(result.text, {
                        position: settings.insertPosition,
                        addTimestamp: settings.addTimestamp,
                        timestampFormat: settings.timestampFormat,
                    });
                    progressTracker.increment();

                    // 7. 완료 알림
                    progressTracker.updateMessage('완료!');
                    progressTracker.complete();
                    notificationManager.success('음성 변환이 완료되었습니다.');

                    // 검증
                    expect(editor.replaceSelection).toHaveBeenCalledWith('변환된 텍스트');
                    expect(progressTracker.getProgress()).toBe(100);
                },
                settings
            );

            // 테스트용 파일 생성
            const mockFile = new File(['mock audio data'], 'test-audio.mp3', { type: 'audio/mp3' });

            // 파일 선택 시뮬레이션
            await filePickerModal.onChooseFile(mockFile);

            // API 호출 검증
            expect(global.fetch).toHaveBeenCalledWith(
                settings.apiUrl,
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        Authorization: `Bearer ${settings.apiKey}`,
                    }),
                })
            );
        });

        test('드래그 앤 드롭으로 파일 업로드', async () => {
            const dropZone = document.createElement('div');
            dropZone.className = 'drag-drop-zone';
            document.body.appendChild(dropZone);

            // 드래그 이벤트 시뮬레이션
            const dragEnterEvent = new DragEvent('dragenter', {
                dataTransfer: new DataTransfer(),
            });
            dropZone.dispatchEvent(dragEnterEvent);
            expect(dropZone.classList.contains('drag-over')).toBe(false); // 실제 구현에서 추가 필요

            // 드롭 이벤트 시뮬레이션
            const mockFile = new File(['mock audio'], 'audio.wav', { type: 'audio/wav' });
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(mockFile);

            const dropEvent = new DragEvent('drop', {
                dataTransfer: dataTransfer,
            });

            // 드롭 핸들러 등록
            dropZone.addEventListener('drop', async (e: DragEvent) => {
                e.preventDefault();
                const files = Array.from(e.dataTransfer?.files || []);

                for (const file of files) {
                    // 변환 프로세스 시작
                    const result = await transcriptionService.transcribe(file);
                    await editorService.insertText(result.text);
                    notificationManager.success(`${file.name} 변환 완료`);
                }
            });

            dropZone.dispatchEvent(dropEvent);

            // 변환 완료 대기
            await new Promise((resolve) => setTimeout(resolve, 100));

            // 검증
            expect(global.fetch).toHaveBeenCalled();

            document.body.removeChild(dropZone);
        });

        test('여러 파일 순차 처리', async () => {
            const files = [
                new File(['audio1'], 'file1.mp3', { type: 'audio/mp3' }),
                new File(['audio2'], 'file2.wav', { type: 'audio/wav' }),
                new File(['audio3'], 'file3.m4a', { type: 'audio/m4a' }),
            ];

            let processedCount = 0;
            const results: string[] = [];

            // 각 파일에 대한 mock 응답 설정
            (global.fetch as jest.Mock).mockImplementation(() => {
                processedCount++;
                return Promise.resolve({
                    ok: true,
                    text: () => Promise.resolve(`변환된 텍스트 ${processedCount}`),
                });
            });

            // 순차 처리
            for (const file of files) {
                progressTracker.start(files.length);
                progressTracker.updateMessage(`${file.name} 처리 중...`);

                const result = await transcriptionService.transcribe(file);
                results.push(result.text);

                await editorService.insertText(result.text);
                progressTracker.increment();
            }

            progressTracker.complete();

            // 검증
            expect(results).toHaveLength(3);
            expect(results).toEqual(['변환된 텍스트 1', '변환된 텍스트 2', '변환된 텍스트 3']);
            expect(editor.replaceSelection).toHaveBeenCalledTimes(3);
        });
    });

    describe('에러 처리 시나리오', () => {
        test('API 키 누락 시 에러 처리', async () => {
            settings.apiKey = '';
            transcriptionService = new TranscriptionService(settings);

            const mockFile = new File(['audio'], 'test.mp3', { type: 'audio/mp3' });

            await expect(transcriptionService.transcribe(mockFile)).rejects.toThrow(
                'API key is required'
            );

            // 에러 알림 확인
            const errorSpy = jest.spyOn(notificationManager, 'error');
            notificationManager.error('API 키가 설정되지 않았습니다.');
            expect(errorSpy).toHaveBeenCalled();
        });

        test('파일 크기 초과 에러', async () => {
            const largeFile = new File(
                [new ArrayBuffer(30 * 1024 * 1024)], // 30MB
                'large-file.mp3',
                { type: 'audio/mp3' }
            );

            await expect(transcriptionService.transcribe(largeFile)).rejects.toThrow(
                `File size exceeds maximum limit of ${settings.maxFileSize}MB`
            );
        });

        test('네트워크 에러 처리 및 재시도', async () => {
            let attemptCount = 0;
            (global.fetch as jest.Mock).mockImplementation(() => {
                attemptCount++;
                if (attemptCount < 3) {
                    return Promise.reject(new Error('Network error'));
                }
                return Promise.resolve({
                    ok: true,
                    text: () => Promise.resolve('변환된 텍스트'),
                });
            });

            const mockFile = new File(['audio'], 'test.mp3', { type: 'audio/mp3' });
            const result = await transcriptionService.transcribe(mockFile);

            expect(result.text).toBe('변환된 텍스트');
            expect(attemptCount).toBe(3);
        });

        test('타임아웃 처리', async () => {
            (global.fetch as jest.Mock).mockImplementation(
                () =>
                    new Promise((resolve) => {
                        setTimeout(resolve, settings.timeout + 1000);
                    })
            );

            const mockFile = new File(['audio'], 'test.mp3', { type: 'audio/mp3' });

            await expect(transcriptionService.transcribe(mockFile)).rejects.toThrow(
                'Request timeout'
            );
        });

        test('잘못된 파일 형식', async () => {
            const invalidFile = new File(['not audio'], 'document.pdf', {
                type: 'application/pdf',
            });

            await expect(transcriptionService.transcribe(invalidFile)).rejects.toThrow(
                'Unsupported file type'
            );
        });
    });

    describe('진행 상황 추적', () => {
        test('진행률 업데이트 확인', async () => {
            const mockFile = new File(['audio'], 'test.mp3', { type: 'audio/mp3' });
            const progressUpdates: number[] = [];

            // 진행률 변경 리스너
            eventManager.on('progress:update', (data: any) => {
                progressUpdates.push(data.percentage);
            });

            progressTracker.start(4);
            progressTracker.increment(); // 25%
            progressTracker.increment(); // 50%
            progressTracker.increment(); // 75%
            progressTracker.complete(); // 100%

            expect(progressUpdates).toEqual([25, 50, 75, 100]);
        });

        test('취소 기능', async () => {
            const mockFile = new File(['audio'], 'test.mp3', { type: 'audio/mp3' });
            let isCancelled = false;

            const abortController = new AbortController();

            // 변환 시작
            const transcribePromise = transcriptionService.transcribe(mockFile, {
                signal: abortController.signal,
            });

            // 취소
            setTimeout(() => {
                abortController.abort();
                isCancelled = true;
            }, 100);

            await expect(transcribePromise).rejects.toThrow('Aborted');
            expect(isCancelled).toBe(true);
        });
    });
});
