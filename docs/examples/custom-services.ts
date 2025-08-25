/**
 * 커스텀 서비스 구현 예제 (Custom Service Implementation Examples)
 * 
 * 서비스를 확장하거나 대체하는 방법을 보여줍니다.
 */

import type { 
    IWhisperService, 
    WhisperOptions, 
    WhisperResponse,
    ILogger,
    ISettingsManager
} from '../../src/types';
import { TFile } from 'obsidian';

/**
 * 예제 1: 캐싱 기능이 추가된 WhisperService
 */
class CachedWhisperService implements IWhisperService {
    private cache = new Map<string, CacheEntry>();
    private readonly maxCacheSize = 100;
    private readonly cacheTTL = 3600000; // 1시간
    
    constructor(
        private baseService: IWhisperService,
        private logger: ILogger
    ) {}
    
    async transcribe(
        audio: ArrayBuffer,
        options?: WhisperOptions
    ): Promise<WhisperResponse> {
        // 캐시 키 생성
        const cacheKey = this.generateCacheKey(audio, options);
        
        // 캐시 확인
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            this.logger.debug('Cache hit', { key: cacheKey });
            return cached;
        }
        
        // 실제 API 호출
        this.logger.debug('Cache miss, calling API', { key: cacheKey });
        const response = await this.baseService.transcribe(audio, options);
        
        // 캐시 저장
        this.saveToCache(cacheKey, response);
        
        return response;
    }
    
    async validateApiKey(key: string): Promise<boolean> {
        return this.baseService.validateApiKey(key);
    }
    
    cancel(): void {
        this.baseService.cancel();
    }
    
    private generateCacheKey(audio: ArrayBuffer, options?: WhisperOptions): string {
        // 오디오 버퍼의 해시 생성
        const audioHash = this.hashArrayBuffer(audio);
        const optionsString = JSON.stringify(options || {});
        return `${audioHash}-${this.hashString(optionsString)}`;
    }
    
    private hashArrayBuffer(buffer: ArrayBuffer): string {
        // 간단한 해시 구현 (실제로는 crypto API 사용 권장)
        const bytes = new Uint8Array(buffer);
        let hash = 0;
        
        for (let i = 0; i < Math.min(bytes.length, 1000); i++) {
            hash = ((hash << 5) - hash) + bytes[i];
            hash = hash & hash; // Convert to 32bit integer
        }
        
        return hash.toString(36);
    }
    
    private hashString(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash = hash & hash;
        }
        return hash.toString(36);
    }
    
    private getFromCache(key: string): WhisperResponse | null {
        const entry = this.cache.get(key);
        
        if (!entry) {
            return null;
        }
        
        // TTL 확인
        if (Date.now() - entry.timestamp > this.cacheTTL) {
            this.cache.delete(key);
            return null;
        }
        
        // 캐시 히트 카운트 증가
        entry.hits++;
        return entry.response;
    }
    
    private saveToCache(key: string, response: WhisperResponse): void {
        // 캐시 크기 제한
        if (this.cache.size >= this.maxCacheSize) {
            // LRU 정책: 가장 오래되고 적게 사용된 항목 제거
            const leastUsed = this.findLeastRecentlyUsed();
            if (leastUsed) {
                this.cache.delete(leastUsed);
            }
        }
        
        this.cache.set(key, {
            response,
            timestamp: Date.now(),
            hits: 0
        });
    }
    
    private findLeastRecentlyUsed(): string | null {
        let leastUsedKey: string | null = null;
        let minScore = Infinity;
        
        this.cache.forEach((entry, key) => {
            // 점수 = 현재시간 - 타임스탬프 - (히트수 * 1000)
            const score = Date.now() - entry.timestamp - (entry.hits * 1000);
            if (score < minScore) {
                minScore = score;
                leastUsedKey = key;
            }
        });
        
        return leastUsedKey;
    }
    
    // 캐시 통계
    getCacheStats(): CacheStats {
        let totalHits = 0;
        let totalSize = 0;
        
        this.cache.forEach(entry => {
            totalHits += entry.hits;
            totalSize += JSON.stringify(entry.response).length;
        });
        
        return {
            entries: this.cache.size,
            totalHits,
            totalSize,
            maxSize: this.maxCacheSize
        };
    }
    
    // 캐시 초기화
    clearCache(): void {
        this.cache.clear();
        this.logger.info('Cache cleared');
    }
}

/**
 * 예제 2: 대체 음성 인식 API 서비스 (Google Speech-to-Text)
 */
class GoogleSpeechService implements IWhisperService {
    private readonly API_ENDPOINT = 'https://speech.googleapis.com/v1/speech:recognize';
    
    constructor(
        private apiKey: string,
        private logger: ILogger
    ) {}
    
    async transcribe(
        audio: ArrayBuffer,
        options?: WhisperOptions
    ): Promise<WhisperResponse> {
        try {
            // Google API 형식으로 변환
            const request = this.buildGoogleRequest(audio, options);
            
            // API 호출
            const response = await fetch(`${this.API_ENDPOINT}?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(request)
            });
            
            if (!response.ok) {
                throw new Error(`Google Speech API error: ${response.status}`);
            }
            
            const data = await response.json();
            
            // WhisperResponse 형식으로 변환
            return this.convertToWhisperResponse(data);
            
        } catch (error) {
            this.logger.error('Google Speech API failed', error as Error);
            throw error;
        }
    }
    
    private buildGoogleRequest(audio: ArrayBuffer, options?: WhisperOptions): any {
        // ArrayBuffer를 Base64로 변환
        const base64Audio = this.arrayBufferToBase64(audio);
        
        return {
            config: {
                encoding: 'WEBM_OPUS',
                sampleRateHertz: 48000,
                languageCode: this.mapLanguageCode(options?.language || 'en'),
                enableAutomaticPunctuation: true,
                enableWordTimeOffsets: options?.responseFormat === 'verbose_json'
            },
            audio: {
                content: base64Audio
            }
        };
    }
    
    private arrayBufferToBase64(buffer: ArrayBuffer): string {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        
        return btoa(binary);
    }
    
    private mapLanguageCode(whisperCode: string): string {
        // Whisper 언어 코드를 Google 형식으로 매핑
        const mapping: Record<string, string> = {
            'ko': 'ko-KR',
            'en': 'en-US',
            'ja': 'ja-JP',
            'zh': 'zh-CN',
            'auto': 'en-US' // Google은 auto-detect를 지원하지 않음
        };
        
        return mapping[whisperCode] || 'en-US';
    }
    
    private convertToWhisperResponse(googleResponse: any): WhisperResponse {
        const result = googleResponse.results?.[0];
        
        if (!result) {
            return {
                text: '',
                language: 'unknown'
            };
        }
        
        const text = result.alternatives[0].transcript;
        const confidence = result.alternatives[0].confidence;
        
        // 세그먼트 정보 변환
        const segments = result.alternatives[0].words?.map((word: any, index: number) => ({
            id: index,
            start: parseFloat(word.startTime.replace('s', '')),
            end: parseFloat(word.endTime.replace('s', '')),
            text: word.word
        }));
        
        return {
            text,
            language: this.extractLanguage(googleResponse.languageCode),
            confidence,
            segments
        };
    }
    
    private extractLanguage(googleCode: string): string {
        // 'ko-KR' -> 'ko' 형식으로 변환
        return googleCode.split('-')[0];
    }
    
    async validateApiKey(key: string): Promise<boolean> {
        // Google API 키 검증
        try {
            const response = await fetch(
                `https://speech.googleapis.com/v1/speech:recognize?key=${key}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ config: {}, audio: {} })
                }
            );
            
            // 400 에러는 잘못된 요청이지만 키는 유효함
            // 401/403은 키 문제
            return response.status !== 401 && response.status !== 403;
            
        } catch (error) {
            return false;
        }
    }
    
    cancel(): void {
        // Google API는 취소를 직접 지원하지 않음
        this.logger.debug('Cancel requested (not supported by Google API)');
    }
}

/**
 * 예제 3: 다중 API 폴백 서비스
 */
class MultiProviderService implements IWhisperService {
    private providers: IWhisperService[] = [];
    private currentProviderIndex = 0;
    
    constructor(
        providers: IWhisperService[],
        private logger: ILogger
    ) {
        if (providers.length === 0) {
            throw new Error('At least one provider is required');
        }
        this.providers = providers;
    }
    
    async transcribe(
        audio: ArrayBuffer,
        options?: WhisperOptions
    ): Promise<WhisperResponse> {
        let lastError: Error | null = null;
        
        // 모든 프로바이더 시도
        for (let i = 0; i < this.providers.length; i++) {
            const providerIndex = (this.currentProviderIndex + i) % this.providers.length;
            const provider = this.providers[providerIndex];
            
            try {
                this.logger.debug(`Trying provider ${providerIndex + 1}/${this.providers.length}`);
                
                const response = await provider.transcribe(audio, options);
                
                // 성공하면 이 프로바이더를 우선순위로 설정
                this.currentProviderIndex = providerIndex;
                
                return response;
                
            } catch (error) {
                lastError = error as Error;
                this.logger.warn(`Provider ${providerIndex + 1} failed`, error as Error);
                
                // 다음 프로바이더 시도
                continue;
            }
        }
        
        // 모든 프로바이더 실패
        throw new Error(`All providers failed. Last error: ${lastError?.message}`);
    }
    
    async validateApiKey(key: string): Promise<boolean> {
        // 현재 프로바이더의 API 키 검증
        return this.providers[this.currentProviderIndex].validateApiKey(key);
    }
    
    cancel(): void {
        // 모든 프로바이더 취소
        this.providers.forEach(provider => provider.cancel());
    }
    
    // 프로바이더 관리
    addProvider(provider: IWhisperService): void {
        this.providers.push(provider);
    }
    
    removeProvider(index: number): void {
        if (this.providers.length <= 1) {
            throw new Error('Cannot remove the last provider');
        }
        this.providers.splice(index, 1);
    }
    
    getProviderStatus(): ProviderStatus[] {
        return this.providers.map((provider, index) => ({
            index,
            active: index === this.currentProviderIndex,
            name: provider.constructor.name
        }));
    }
}

/**
 * 예제 4: 큐 기반 처리 서비스
 */
class QueuedTranscriptionService {
    private queue: TranscriptionJob[] = [];
    private processing = false;
    private concurrency = 2; // 동시 처리 수
    private activeJobs = new Set<string>();
    
    constructor(
        private whisperService: IWhisperService,
        private eventManager: any,
        private logger: ILogger
    ) {}
    
    async addToQueue(
        file: TFile,
        options?: WhisperOptions,
        priority: 'high' | 'normal' | 'low' = 'normal'
    ): Promise<string> {
        const jobId = this.generateJobId();
        
        const job: TranscriptionJob = {
            id: jobId,
            file,
            options,
            priority,
            status: 'queued',
            createdAt: Date.now(),
            result: null,
            error: null
        };
        
        // 우선순위에 따라 큐에 추가
        this.insertJobByPriority(job);
        
        // 이벤트 발생
        this.eventManager.emit('queue:job-added', { jobId, queueLength: this.queue.length });
        
        // 처리 시작
        this.processQueue();
        
        return jobId;
    }
    
    private insertJobByPriority(job: TranscriptionJob): void {
        const priorityScore = { high: 0, normal: 1, low: 2 };
        const jobScore = priorityScore[job.priority];
        
        // 적절한 위치 찾기
        let insertIndex = this.queue.findIndex(
            j => priorityScore[j.priority] > jobScore
        );
        
        if (insertIndex === -1) {
            this.queue.push(job);
        } else {
            this.queue.splice(insertIndex, 0, job);
        }
    }
    
    private async processQueue(): Promise<void> {
        if (this.processing) return;
        
        this.processing = true;
        
        while (this.queue.length > 0 || this.activeJobs.size > 0) {
            // 동시 처리 제한
            while (this.activeJobs.size < this.concurrency && this.queue.length > 0) {
                const job = this.queue.shift()!;
                this.processJob(job); // await 없이 병렬 처리
            }
            
            // 잠시 대기
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        this.processing = false;
    }
    
    private async processJob(job: TranscriptionJob): Promise<void> {
        this.activeJobs.add(job.id);
        job.status = 'processing';
        
        try {
            // 파일 읽기
            const buffer = await this.app.vault.readBinary(job.file);
            
            // 변환 실행
            const response = await this.whisperService.transcribe(buffer, job.options);
            
            // 결과 저장
            job.status = 'completed';
            job.result = response;
            job.completedAt = Date.now();
            
            // 이벤트 발생
            this.eventManager.emit('queue:job-completed', {
                jobId: job.id,
                result: response
            });
            
            this.logger.info(`Job ${job.id} completed successfully`);
            
        } catch (error) {
            job.status = 'failed';
            job.error = error as Error;
            job.completedAt = Date.now();
            
            // 이벤트 발생
            this.eventManager.emit('queue:job-failed', {
                jobId: job.id,
                error
            });
            
            this.logger.error(`Job ${job.id} failed`, error as Error);
            
        } finally {
            this.activeJobs.delete(job.id);
        }
    }
    
    private generateJobId(): string {
        return `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // 작업 상태 조회
    getJobStatus(jobId: string): TranscriptionJob | null {
        return this.queue.find(j => j.id === jobId) || null;
    }
    
    // 큐 상태 조회
    getQueueStatus(): QueueStatus {
        return {
            total: this.queue.length,
            queued: this.queue.filter(j => j.status === 'queued').length,
            processing: this.activeJobs.size,
            completed: this.queue.filter(j => j.status === 'completed').length,
            failed: this.queue.filter(j => j.status === 'failed').length
        };
    }
    
    // 작업 취소
    cancelJob(jobId: string): boolean {
        const jobIndex = this.queue.findIndex(j => j.id === jobId);
        
        if (jobIndex === -1) {
            return false;
        }
        
        const job = this.queue[jobIndex];
        
        if (job.status === 'queued') {
            this.queue.splice(jobIndex, 1);
            this.eventManager.emit('queue:job-cancelled', { jobId });
            return true;
        }
        
        return false;
    }
    
    // 큐 초기화
    clearQueue(): void {
        this.queue = this.queue.filter(j => j.status === 'processing');
        this.eventManager.emit('queue:cleared');
    }
}

/**
 * 예제 5: 오프라인 백업 서비스
 */
class OfflineBackupService implements IWhisperService {
    private pendingRequests: PendingRequest[] = [];
    
    constructor(
        private onlineService: IWhisperService,
        private logger: ILogger
    ) {
        // 온라인 상태 모니터링
        window.addEventListener('online', () => this.processPendingRequests());
    }
    
    async transcribe(
        audio: ArrayBuffer,
        options?: WhisperOptions
    ): Promise<WhisperResponse> {
        if (navigator.onLine) {
            try {
                return await this.onlineService.transcribe(audio, options);
            } catch (error) {
                // 네트워크 에러인 경우 오프라인 처리
                if (this.isNetworkError(error)) {
                    return this.handleOffline(audio, options);
                }
                throw error;
            }
        } else {
            return this.handleOffline(audio, options);
        }
    }
    
    private async handleOffline(
        audio: ArrayBuffer,
        options?: WhisperOptions
    ): Promise<WhisperResponse> {
        // 요청을 저장
        const request: PendingRequest = {
            id: Date.now().toString(),
            audio,
            options,
            timestamp: Date.now()
        };
        
        this.pendingRequests.push(request);
        await this.savePendingRequests();
        
        // 임시 응답 반환
        return {
            text: '[오프라인 모드: 온라인 복구 시 처리됩니다]',
            language: 'offline',
            offline: true,
            requestId: request.id
        };
    }
    
    private async processPendingRequests(): Promise<void> {
        if (this.pendingRequests.length === 0) return;
        
        this.logger.info(`Processing ${this.pendingRequests.length} pending requests`);
        
        for (const request of this.pendingRequests) {
            try {
                const response = await this.onlineService.transcribe(
                    request.audio,
                    request.options
                );
                
                // 결과를 저장하거나 알림
                await this.saveCompletedTranscription(request.id, response);
                
            } catch (error) {
                this.logger.error(`Failed to process pending request ${request.id}`, error as Error);
            }
        }
        
        // 처리 완료된 요청 제거
        this.pendingRequests = [];
        await this.savePendingRequests();
    }
    
    private async savePendingRequests(): Promise<void> {
        // IndexedDB나 localStorage에 저장
        const data = this.pendingRequests.map(r => ({
            id: r.id,
            options: r.options,
            timestamp: r.timestamp,
            // ArrayBuffer는 Base64로 변환하여 저장
            audioBase64: this.arrayBufferToBase64(r.audio)
        }));
        
        localStorage.setItem('pendingTranscriptions', JSON.stringify(data));
    }
    
    private async saveCompletedTranscription(
        requestId: string,
        response: WhisperResponse
    ): Promise<void> {
        // 완료된 변환 결과 저장
        const completed = JSON.parse(
            localStorage.getItem('completedTranscriptions') || '[]'
        );
        
        completed.push({
            requestId,
            response,
            completedAt: Date.now()
        });
        
        localStorage.setItem('completedTranscriptions', JSON.stringify(completed));
        
        // 사용자에게 알림
        new Notification('오프라인 변환 완료', {
            body: `요청 ${requestId}의 변환이 완료되었습니다.`
        });
    }
    
    private isNetworkError(error: any): boolean {
        return error?.code === 'NETWORK_ERROR' ||
               error?.message?.includes('network') ||
               error?.message?.includes('fetch');
    }
    
    private arrayBufferToBase64(buffer: ArrayBuffer): string {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }
    
    async validateApiKey(key: string): Promise<boolean> {
        if (navigator.onLine) {
            return this.onlineService.validateApiKey(key);
        }
        // 오프라인에서는 검증 불가
        return true;
    }
    
    cancel(): void {
        this.onlineService.cancel();
    }
}

// 타입 정의
interface CacheEntry {
    response: WhisperResponse;
    timestamp: number;
    hits: number;
}

interface CacheStats {
    entries: number;
    totalHits: number;
    totalSize: number;
    maxSize: number;
}

interface ProviderStatus {
    index: number;
    active: boolean;
    name: string;
}

interface TranscriptionJob {
    id: string;
    file: TFile;
    options?: WhisperOptions;
    priority: 'high' | 'normal' | 'low';
    status: 'queued' | 'processing' | 'completed' | 'failed';
    createdAt: number;
    completedAt?: number;
    result: WhisperResponse | null;
    error: Error | null;
}

interface QueueStatus {
    total: number;
    queued: number;
    processing: number;
    completed: number;
    failed: number;
}

interface PendingRequest {
    id: string;
    audio: ArrayBuffer;
    options?: WhisperOptions;
    timestamp: number;
}

// 내보내기
export {
    CachedWhisperService,
    GoogleSpeechService,
    MultiProviderService,
    QueuedTranscriptionService,
    OfflineBackupService
};