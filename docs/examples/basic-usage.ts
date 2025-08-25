/**
 * 기본 사용 예제 (Basic Usage Examples)
 * 
 * Speech-to-Text 플러그인의 기본적인 사용 방법을 보여줍니다.
 */

import { Plugin, TFile, Notice } from 'obsidian';
import { WhisperService } from '../../src/infrastructure/api/WhisperService';
import { SettingsManager } from '../../src/infrastructure/storage/SettingsManager';
import { FileUploadManager } from '../../src/infrastructure/api/FileUploadManager';
import { EditorService } from '../../src/application/EditorService';
import { TextInsertionHandler } from '../../src/application/TextInsertionHandler';
import { EventManager } from '../../src/application/EventManager';
import { Logger } from '../../src/infrastructure/logging/Logger';

/**
 * 예제 1: 간단한 음성 변환
 */
async function basicTranscription(
    file: TFile,
    whisperService: WhisperService
): Promise<void> {
    try {
        // 파일을 ArrayBuffer로 읽기
        const buffer = await this.app.vault.readBinary(file);
        
        // Whisper API 호출
        const response = await whisperService.transcribe(buffer, {
            language: 'auto', // 자동 언어 감지
            responseFormat: 'json'
        });
        
        // 결과 출력
        console.log('변환된 텍스트:', response.text);
        console.log('감지된 언어:', response.language);
        
        // 사용자에게 알림
        new Notice(`변환 완료! (${response.language})`);
        
    } catch (error) {
        console.error('변환 실패:', error);
        new Notice('변환에 실패했습니다.');
    }
}

/**
 * 예제 2: 진행 상황 표시와 함께 변환
 */
async function transcriptionWithProgress(
    file: TFile,
    uploadManager: FileUploadManager,
    whisperService: WhisperService
): Promise<void> {
    try {
        // 진행 상황 표시 UI
        const statusBar = this.app.statusBar.createEl('div');
        
        // 파일 준비 (압축 포함)
        const processed = await uploadManager.prepareAudioFile(file, (progress) => {
            statusBar.setText(`처리 중: ${progress.percentage}% - ${progress.message}`);
        });
        
        // API 호출
        statusBar.setText('변환 중...');
        const response = await whisperService.transcribe(processed.buffer);
        
        // 완료
        statusBar.setText('변환 완료!');
        setTimeout(() => statusBar.remove(), 3000);
        
        return response.text;
        
    } catch (error) {
        statusBar.setText('변환 실패');
        setTimeout(() => statusBar.remove(), 3000);
        throw error;
    }
}

/**
 * 예제 3: 변환 후 자동 삽입
 */
async function transcribeAndInsert(
    file: TFile,
    whisperService: WhisperService,
    editorService: EditorService,
    insertionHandler: TextInsertionHandler
): Promise<void> {
    try {
        // 1. 음성 변환
        const buffer = await this.app.vault.readBinary(file);
        const response = await whisperService.transcribe(buffer);
        
        // 2. 에디터 확인
        if (!editorService.hasActiveEditor()) {
            new Notice('열려있는 노트가 없습니다.');
            return;
        }
        
        // 3. 텍스트 삽입 (포맷팅 적용)
        await insertionHandler.insertText(response.text, {
            mode: 'cursor',           // 커서 위치에 삽입
            format: 'plain',          // 일반 텍스트
            addTimestamp: true,       // 타임스탬프 추가
            timestampFormat: 'YYYY-MM-DD HH:mm:ss'
        });
        
        new Notice('텍스트가 삽입되었습니다.');
        
    } catch (error) {
        console.error('작업 실패:', error);
        new Notice('작업에 실패했습니다.');
    }
}

/**
 * 예제 4: 이벤트 기반 처리
 */
function setupEventHandlers(eventManager: EventManager): void {
    // 변환 시작
    eventManager.on('transcription:start', (data) => {
        console.log(`변환 시작: ${data.fileName}`);
        new Notice(`변환 시작: ${data.fileName}`);
    });
    
    // 진행 상황 업데이트
    eventManager.on('transcription:progress', (data) => {
        console.log(`진행률: ${data.progress}%`);
        // 프로그레스 바 업데이트
        updateProgressBar(data.progress);
    });
    
    // 변환 완료
    eventManager.on('transcription:complete', async (data) => {
        console.log('변환 완료:', data.text.substring(0, 50) + '...');
        
        // 자동 삽입이 활성화된 경우
        if (data.autoInsert) {
            await insertTextToEditor(data.text);
        }
    });
    
    // 에러 처리
    eventManager.on('transcription:error', (data) => {
        console.error('변환 에러:', data.error);
        new Notice(`에러: ${data.error.message}`);
    });
}

/**
 * 예제 5: 설정 관리
 */
async function manageSettings(
    settingsManager: SettingsManager
): Promise<void> {
    // 설정 로드
    const settings = await settingsManager.load();
    console.log('현재 설정:', settings);
    
    // API 키 설정
    const apiKey = 'sk-your-api-key-here';
    const success = await settingsManager.setApiKey(apiKey);
    if (success) {
        console.log('API 키가 설정되었습니다.');
    }
    
    // 개별 설정 변경
    await settingsManager.set('language', 'ko');
    await settingsManager.set('autoInsert', true);
    await settingsManager.set('insertPosition', 'cursor');
    
    // 설정 유효성 검증
    const validation = settingsManager.validateSettings();
    if (!validation.valid) {
        console.error('설정 오류:', validation.errors);
    }
    
    // 설정 내보내기 (API 키 제외)
    const exported = settingsManager.exportSettings();
    console.log('내보낸 설정:', exported);
}

/**
 * 예제 6: 여러 파일 일괄 처리
 */
async function batchTranscription(
    files: TFile[],
    whisperService: WhisperService,
    eventManager: EventManager
): Promise<Map<string, string>> {
    const results = new Map<string, string>();
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        try {
            // 진행 상황 이벤트 발생
            eventManager.emit('transcription:progress', {
                progress: (i / files.length) * 100,
                message: `처리 중: ${file.name}`
            });
            
            // 변환 실행
            const buffer = await this.app.vault.readBinary(file);
            const response = await whisperService.transcribe(buffer);
            
            // 결과 저장
            results.set(file.path, response.text);
            
            // 각 파일 사이에 짧은 대기 (Rate Limit 방지)
            await new Promise(resolve => setTimeout(resolve, 1000));
            
        } catch (error) {
            console.error(`파일 처리 실패: ${file.name}`, error);
            results.set(file.path, `[에러: ${error.message}]`);
        }
    }
    
    // 완료 이벤트
    eventManager.emit('transcription:complete', {
        text: `${files.length}개 파일 처리 완료`,
        duration: 0
    });
    
    return results;
}

/**
 * 예제 7: 커스텀 포맷팅
 */
async function transcribeWithCustomFormat(
    file: TFile,
    whisperService: WhisperService,
    insertionHandler: TextInsertionHandler
): Promise<void> {
    // 변환 실행
    const buffer = await this.app.vault.readBinary(file);
    const response = await whisperService.transcribe(buffer, {
        responseFormat: 'verbose_json' // 세그먼트 정보 포함
    });
    
    // 세그먼트별로 포맷팅
    let formattedText = '';
    if (response.segments) {
        formattedText = response.segments
            .map(segment => `[${formatTime(segment.start)}] ${segment.text}`)
            .join('\n');
    } else {
        formattedText = response.text;
    }
    
    // 커스텀 템플릿 적용
    await insertionHandler.insertText(formattedText, {
        mode: 'cursor',
        format: 'plain',
        template: `## 음성 변환 결과\n\n**파일**: ${file.name}\n**언어**: ${response.language}\n**변환 시간**: {{datetime}}\n\n---\n\n{{content}}\n\n---\n\n*Whisper API로 자동 생성됨*`
    });
}

/**
 * 예제 8: 에러 처리 및 재시도
 */
async function robustTranscription(
    file: TFile,
    whisperService: WhisperService,
    maxRetries: number = 3
): Promise<string> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`시도 ${attempt}/${maxRetries}`);
            
            const buffer = await this.app.vault.readBinary(file);
            const response = await whisperService.transcribe(buffer);
            
            return response.text; // 성공
            
        } catch (error) {
            lastError = error as Error;
            console.error(`시도 ${attempt} 실패:`, error);
            
            // 재시도 가능한 에러인지 확인
            if (error instanceof RateLimitError) {
                // Rate limit의 경우 대기 후 재시도
                const waitTime = error.retryAfter || 60;
                console.log(`${waitTime}초 대기 중...`);
                await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
                
            } else if (error instanceof NetworkError) {
                // 네트워크 에러의 경우 짧은 대기 후 재시도
                await new Promise(resolve => setTimeout(resolve, 5000));
                
            } else if (error instanceof AuthenticationError) {
                // 인증 에러는 재시도해도 소용없음
                throw error;
            }
            
            // 마지막 시도가 아니면 계속
            if (attempt < maxRetries) {
                continue;
            }
        }
    }
    
    // 모든 시도 실패
    throw new Error(`${maxRetries}번 시도 후 실패: ${lastError!.message}`);
}

/**
 * 예제 9: 프로그레스 인디케이터와 취소 기능
 */
class TranscriptionTask {
    private cancelled = false;
    
    async execute(
        file: TFile,
        whisperService: WhisperService
    ): Promise<string | null> {
        // 취소 버튼 생성
        const cancelButton = this.app.workspace.containerEl.createEl('button', {
            text: '취소',
            cls: 'mod-warning'
        });
        
        cancelButton.onclick = () => {
            this.cancelled = true;
            whisperService.cancel();
        };
        
        try {
            // 변환 실행
            const buffer = await this.app.vault.readBinary(file);
            
            if (this.cancelled) {
                return null;
            }
            
            const response = await whisperService.transcribe(buffer);
            
            if (this.cancelled) {
                return null;
            }
            
            return response.text;
            
        } finally {
            // 정리
            cancelButton.remove();
        }
    }
}

/**
 * 유틸리티 함수
 */
function formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function updateProgressBar(percentage: number): void {
    const progressBar = document.querySelector('.progress-bar') as HTMLElement;
    if (progressBar) {
        progressBar.style.width = `${percentage}%`;
        progressBar.textContent = `${Math.round(percentage)}%`;
    }
}

async function insertTextToEditor(text: string): Promise<void> {
    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (activeView) {
        const editor = activeView.editor;
        editor.replaceSelection(text);
    }
}

// 타입 정의
interface RateLimitError extends Error {
    retryAfter?: number;
}

interface NetworkError extends Error {
    code: string;
}

interface AuthenticationError extends Error {
    status: number;
}

export {
    basicTranscription,
    transcriptionWithProgress,
    transcribeAndInsert,
    setupEventHandlers,
    manageSettings,
    batchTranscription,
    transcribeWithCustomFormat,
    robustTranscription,
    TranscriptionTask
};