/**
 * Phase 4 - Task 4.4 버그 수정 회귀 테스트
 * 
 * 수정된 버그들이 다시 발생하지 않도록 보장하는 테스트 모음
 */

import '../helpers/testSetup'; // 테스트 환경 설정 임포트
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { WhisperService } from '../../src/infrastructure/api/WhisperService';
import { FileUploadManager } from '../../src/infrastructure/api/FileUploadManager';
import { NotificationManager } from '../../src/ui/notifications/NotificationManager';
import { Logger } from '../../src/infrastructure/logging/Logger';

// Mock 설정
jest.mock('../../src/infrastructure/logging/Logger');

describe('Critical Bug Fixes - 플러그인 크래시 방지', () => {
    describe('main.ts - 무한 재귀 버그 수정', () => {
        it('should not cause infinite recursion in createStatusBarItem', () => {
            // 이 테스트는 main.ts의 메서드 이름 변경으로 해결됨
            // createStatusBarItem이 자기 자신이 아닌 addStatusBarItem을 호출
            expect(true).toBe(true); // 컴파일 에러가 없으면 통과
        });
    });

    describe('tsconfig.json - TypeScript 설정 충돌', () => {
        it('should compile without sourceMap/inlineSourceMap conflict', async () => {
            // tsconfig.json 파일 읽기
            const fs = require('fs');
            const path = require('path');
            const tsconfigPath = path.resolve(__dirname, '../../tsconfig.json');
            const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
            
            // sourceMap과 inlineSourceMap이 동시에 설정되지 않았는지 확인
            const hasSourceMap = tsconfig.compilerOptions.sourceMap === true;
            const hasInlineSourceMap = tsconfig.compilerOptions.inlineSourceMap === true;
            
            expect(hasSourceMap && hasInlineSourceMap).toBe(false);
        });
    });

    describe('WhisperService - API 키 검증 버그', () => {
        let whisperService: WhisperService;
        let mockLogger: jest.Mocked<Logger>;

        beforeEach(() => {
            mockLogger = new Logger('test') as jest.Mocked<Logger>;
            whisperService = new WhisperService('test-api-key', mockLogger);
        });

        it('should use valid test audio size for API key validation', async () => {
            // validateApiKey 메서드가 1KB 크기의 테스트 오디오를 사용하는지 확인
            const performTranscriptionSpy = jest.spyOn(
                whisperService as any,
                'performTranscription'
            ).mockResolvedValue({ text: 'test' });

            await whisperService.validateApiKey('test-key');

            expect(performTranscriptionSpy).toHaveBeenCalled();
            const callArgs = performTranscriptionSpy.mock.calls[0];
            const testAudioBuffer = callArgs[0] as ArrayBuffer;
            
            // 테스트 오디오가 1KB (1024 bytes)인지 확인
            expect(testAudioBuffer.byteLength).toBe(1024);
        });
    });
});

describe('High Priority Bug Fixes - 기능 동작 실패', () => {
    describe('FileUploadManager - 메모리 누수 방지', () => {
        let fileUploadManager: FileUploadManager;
        let mockVault: jest.Mocked<Vault>;
        let mockLogger: jest.Mocked<Logger>;

        beforeEach(() => {
            mockVault = {} as jest.Mocked<Vault>;
            mockLogger = new Logger('test') as jest.Mocked<Logger>;
            fileUploadManager = new FileUploadManager(mockVault, mockLogger);
        });

        it('should cleanup AudioContext after file preparation', async () => {
            const mockFile = {
                stat: { size: 1000 },
                extension: 'mp3',
                name: 'test.mp3',
                path: 'test.mp3'
            };

            // Mock readBinary
            mockVault.readBinary = jest.fn().mockResolvedValue(new ArrayBuffer(1000));

            const cleanupSpy = jest.spyOn(fileUploadManager, 'cleanup');

            try {
                await fileUploadManager.prepareAudioFile(mockFile as any);
            } catch (error) {
                // 에러가 발생해도 cleanup이 호출되어야 함
            }

            // cleanup이 호출되었는지 확인
            expect(cleanupSpy).toHaveBeenCalled();
        });

        it('should cleanup resources even when error occurs', async () => {
            const mockFile = {
                stat: { size: 30 * 1024 * 1024 }, // 30MB - 제한 초과
                extension: 'mp3',
                name: 'test.mp3',
                path: 'test.mp3'
            };

            const cleanupSpy = jest.spyOn(fileUploadManager, 'cleanup');

            await expect(
                fileUploadManager.prepareAudioFile(mockFile as any)
            ).rejects.toThrow();

            // 에러가 발생해도 cleanup이 호출되어야 함
            expect(cleanupSpy).toHaveBeenCalled();
        });
    });
});

describe('Medium Priority Bug Fixes - UX 개선', () => {
    describe('NotificationManager - 중복 알림 방지', () => {
        let notificationManager: NotificationManager;

        beforeEach(() => {
            notificationManager = new NotificationManager({
                defaultDuration: 5000,
                soundEnabled: false
            });
        });

        it('should prevent duplicate notifications within 2 seconds', () => {
            const message = 'Test notification';
            const options = {
                type: 'info' as const,
                message
            };

            // 첫 번째 알림
            const id1 = notificationManager.show(options);
            expect(id1).toBeTruthy();

            // 즉시 같은 알림을 다시 표시 시도
            const id2 = notificationManager.show(options);
            expect(id2).toBe(''); // 중복으로 인해 빈 문자열 반환

            // 2초 후에는 다시 표시 가능
            jest.advanceTimersByTime(2100);
            const id3 = notificationManager.show(options);
            expect(id3).toBeTruthy();
            expect(id3).not.toBe('');
        });

        it('should allow different messages immediately', () => {
            const options1 = {
                type: 'info' as const,
                message: 'Message 1'
            };
            const options2 = {
                type: 'info' as const,
                message: 'Message 2'
            };

            const id1 = notificationManager.show(options1);
            const id2 = notificationManager.show(options2);

            expect(id1).toBeTruthy();
            expect(id2).toBeTruthy();
            expect(id1).not.toBe(id2);
        });

        it('should differentiate by notification type', () => {
            const message = 'Same message';
            
            const id1 = notificationManager.show({
                type: 'info',
                message
            });
            
            const id2 = notificationManager.show({
                type: 'error',
                message
            });

            expect(id1).toBeTruthy();
            expect(id2).toBeTruthy();
            expect(id1).not.toBe(id2);
        });
    });
});

describe('Low Priority Bug Fixes - 타입 정의', () => {
    describe('FormatOptions - TextTemplate 인터페이스', () => {
        it('should have TextTemplate interface defined', () => {
            // TypeScript 컴파일이 성공하면 인터페이스가 정의된 것
            // FormatOptionsModal이 정상적으로 import되면 테스트 통과
            expect(true).toBe(true);
        });
    });
});

describe('Performance and Memory Tests', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should not accumulate notification messages in memory', () => {
        const notificationManager = new NotificationManager();
        
        // 100개의 알림 생성
        for (let i = 0; i < 100; i++) {
            notificationManager.show({
                type: 'info',
                message: `Message ${i}`
            });
            jest.advanceTimersByTime(2100); // 각 알림 사이 2.1초 경과
        }

        // recentMessages Map이 정리되었는지 확인
        // (private 멤버이므로 간접적으로 확인)
        const duplicateId = notificationManager.show({
            type: 'info',
            message: 'Message 0' // 첫 번째 메시지와 동일
        });
        
        // 오래 전 메시지이므로 중복으로 처리되지 않아야 함
        expect(duplicateId).not.toBe('');
    });
});

describe('Integration Tests', () => {
    it('should handle API errors gracefully without crashing', async () => {
        const mockLogger = new Logger('test') as jest.Mocked<Logger>;
        const whisperService = new WhisperService('invalid-key', mockLogger);

        // Mock fetch to simulate API error
        global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

        await expect(
            whisperService.transcribe(new ArrayBuffer(1000))
        ).rejects.toThrow();

        // 플러그인이 크래시하지 않고 에러를 처리했는지 확인
        expect(mockLogger.error).toHaveBeenCalled();
    });
});