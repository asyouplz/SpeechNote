/**
 * TextFormatter 단위 테스트
 */

import { TextFormatter } from '../../src/core/transcription/TextFormatter';
import { 
    createMockSettings,
    createMockFormatOptions,
    createMockTranscriptionSegment,
    createMockSegments
} from '../helpers/mockDataFactory';
import '../helpers/testSetup';

describe('TextFormatter', () => {
    let textFormatter: TextFormatter;
    let mockSettings = createMockSettings();

    beforeEach(() => {
        mockSettings = createMockSettings();
        textFormatter = new TextFormatter(mockSettings);
    });

    describe('format', () => {
        it('should format basic text', () => {
            const input = '  안녕하세요.   테스트입니다.  ';
            const result = textFormatter.format(input);

            expect(result).toBe('안녕하세요. 테스트입니다.');
            expect(result).not.toContain('  '); // No double spaces
        });

        it('should clean up multiple spaces', () => {
            const input = '여러     공백이     있는     텍스트';
            const result = textFormatter.format(input);

            expect(result).toBe('여러 공백이 있는 텍스트');
        });

        it('should handle multiple newlines', () => {
            const input = '첫 번째 줄\n\n\n\n두 번째 줄';
            const result = textFormatter.format(input);

            expect(result).toBe('첫 번째 줄\n\n두 번째 줄');
        });

        it('should add double newline after sentences', () => {
            const input = '첫 번째 문장입니다.\n두 번째 문장입니다.';
            const result = textFormatter.format(input);

            expect(result).toBe('첫 번째 문장입니다.\n\n두 번째 문장입니다.');
        });

        it('should handle exclamation and question marks', () => {
            const input = '질문이 있나요?\n대답입니다!\n마침표입니다.';
            const result = textFormatter.format(input);

            expect(result).toContain('?\n\n');
            expect(result).toContain('!\n\n');
            expect(result).toContain('.\n\n');
        });

        it('should respect format options', () => {
            const input = '테스트 텍스트';
            const options = createMockFormatOptions({
                includeTimestamps: true,
                cleanupText: false
            });

            const result = textFormatter.format(input, options);
            expect(result).toBeDefined();
        });

        it('should handle empty string', () => {
            const result = textFormatter.format('');
            expect(result).toBe('');
        });

        it('should handle string with only spaces', () => {
            const result = textFormatter.format('   \n  \t  ');
            expect(result).toBe('');
        });
    });

    describe('insertTimestamps', () => {
        it('should insert inline timestamps', () => {
            mockSettings.timestampFormat = 'inline';
            textFormatter = new TextFormatter(mockSettings);

            const segments = [
                createMockTranscriptionSegment({ start: 0, end: 5, text: '첫 번째 세그먼트' }),
                createMockTranscriptionSegment({ start: 5, end: 10, text: '두 번째 세그먼트' })
            ];

            const result = textFormatter.insertTimestamps('', segments);

            expect(result).toContain('[00:00] 첫 번째 세그먼트');
            expect(result).toContain('[00:05] 두 번째 세그먼트');
            expect(result).toContainTimestamp();
        });

        it('should insert sidebar timestamps', () => {
            mockSettings.timestampFormat = 'sidebar';
            textFormatter = new TextFormatter(mockSettings);

            const segments = [
                createMockTranscriptionSegment({ start: 30, end: 35, text: '텍스트' })
            ];

            const result = textFormatter.insertTimestamps('', segments);

            expect(result).toContain('00:30 | 텍스트');
        });

        it('should handle no timestamp format', () => {
            mockSettings.timestampFormat = 'none';
            textFormatter = new TextFormatter(mockSettings);

            const segments = createMockSegments(3);
            const result = textFormatter.insertTimestamps('', segments);

            // Should not contain timestamp markers
            expect(result).not.toContain('[');
            expect(result).not.toContain('|');
            segments.forEach(segment => {
                expect(result).toContain(segment.text);
            });
        });

        it('should handle empty segments array', () => {
            const text = '원본 텍스트';
            const result = textFormatter.insertTimestamps(text, []);

            expect(result).toBe(text);
        });

        it('should handle undefined segments', () => {
            const text = '원본 텍스트';
            const result = textFormatter.insertTimestamps(text, undefined as any);

            expect(result).toBe(text);
        });

        it('should format timestamps with hours when needed', () => {
            mockSettings.timestampFormat = 'inline';
            textFormatter = new TextFormatter(mockSettings);

            const segments = [
                createMockTranscriptionSegment({ 
                    start: 3665, // 1:01:05
                    end: 3670, 
                    text: '1시간 넘은 세그먼트' 
                })
            ];

            const result = textFormatter.insertTimestamps('', segments);

            expect(result).toContain('[01:01:05]');
        });

        it('should handle decimal seconds correctly', () => {
            mockSettings.timestampFormat = 'inline';
            textFormatter = new TextFormatter(mockSettings);

            const segments = [
                createMockTranscriptionSegment({ 
                    start: 65.7, // Should be 01:05
                    end: 70, 
                    text: '소수점 초' 
                })
            ];

            const result = textFormatter.insertTimestamps('', segments);

            expect(result).toContain('[01:05]');
        });
    });

    describe('cleanUp', () => {
        it('should trim whitespace', () => {
            const input = '  \t텍스트\n  ';
            const result = textFormatter.cleanUp(input);

            expect(result).toBe('텍스트');
        });

        it('should replace multiple spaces with single space', () => {
            const input = '여러     공백     사이';
            const result = textFormatter.cleanUp(input);

            expect(result).toBe('여러 공백 사이');
        });

        it('should replace multiple newlines appropriately', () => {
            const input = '첫줄\n\n\n\n둘째줄';
            const result = textFormatter.cleanUp(input);

            expect(result).toBe('첫줄\n\n둘째줄');
        });

        it('should add paragraph breaks after sentences', () => {
            const input = '문장입니다.\n다음 문장';
            const result = textFormatter.cleanUp(input);

            expect(result).toBe('문장입니다.\n\n다음 문장');
        });

        it('should handle mixed punctuation', () => {
            const input = '질문?\n감탄!\n일반.\n계속';
            const result = textFormatter.cleanUp(input);

            expect(result).toContain('?\n\n');
            expect(result).toContain('!\n\n');
            expect(result).toContain('.\n\n');
        });

        it('should preserve single newlines within paragraphs', () => {
            const input = '같은 단락\n계속되는 텍스트';
            const result = textFormatter.cleanUp(input);

            // Single newline without sentence-ending punctuation should be preserved
            expect(result).toContain('같은 단락 계속되는 텍스트');
        });
    });

    describe('edge cases', () => {
        it('should handle very long text', () => {
            const longText = '긴 텍스트 '.repeat(1000);
            const result = textFormatter.format(longText);

            expect(result).toBeDefined();
            expect(result.length).toBeGreaterThan(0);
        });

        it('should handle special characters', () => {
            const input = '특수문자: @#$%^&*()_+-=[]{}|;\':",.<>?/';
            const result = textFormatter.format(input);

            expect(result).toContain('@#$%^&*()');
        });

        it('should handle Unicode characters', () => {
            const input = '이모지 😀 한자 漢字 일본어 ひらがな';
            const result = textFormatter.format(input);

            expect(result).toContain('😀');
            expect(result).toContain('漢字');
            expect(result).toContain('ひらがな');
        });

        it('should handle mixed languages', () => {
            const input = 'English 한국어 混在 テキスト';
            const result = textFormatter.format(input);

            expect(result).toBe('English 한국어 混在 テキスト');
        });

        it('should handle segments with overlapping times', () => {
            mockSettings.timestampFormat = 'inline';
            textFormatter = new TextFormatter(mockSettings);

            const segments = [
                createMockTranscriptionSegment({ start: 0, end: 5, text: '첫 번째' }),
                createMockTranscriptionSegment({ start: 3, end: 8, text: '겹치는' }), // Overlapping
                createMockTranscriptionSegment({ start: 8, end: 12, text: '세 번째' })
            ];

            const result = textFormatter.insertTimestamps('', segments);

            expect(result).toBeDefined();
            expect(result.split('\n')).toHaveLength(3);
        });
    });

    describe('performance', () => {
        it('should format large text efficiently', () => {
            const largeText = Array.from({ length: 10000 }, () => 
                '문장입니다. '
            ).join('\n');

            const startTime = Date.now();
            const result = textFormatter.format(largeText);
            const endTime = Date.now();

            expect(result).toBeDefined();
            expect(endTime - startTime).toBeLessThan(100); // Should be fast
        });

        it('should handle many segments efficiently', () => {
            mockSettings.timestampFormat = 'inline';
            textFormatter = new TextFormatter(mockSettings);

            const segments = createMockSegments(1000);

            const startTime = Date.now();
            const result = textFormatter.insertTimestamps('', segments);
            const endTime = Date.now();

            expect(result).toBeDefined();
            expect(result.split('\n')).toHaveLength(1000);
            expect(endTime - startTime).toBeLessThan(50);
        });
    });

    describe('configuration variations', () => {
        it('should respect different timestamp formats', () => {
            const segments = [createMockTranscriptionSegment({ start: 10, end: 15, text: '테스트' })];

            // Test each format
            const formats = ['none', 'inline', 'sidebar'] as const;
            
            for (const format of formats) {
                mockSettings.timestampFormat = format;
                textFormatter = new TextFormatter(mockSettings);
                
                const result = textFormatter.insertTimestamps('', segments);
                
                if (format === 'none') {
                    expect(result).toBe('테스트');
                } else if (format === 'inline') {
                    expect(result).toContain('[00:10]');
                } else if (format === 'sidebar') {
                    expect(result).toContain('00:10 |');
                }
            }
        });
    });
});