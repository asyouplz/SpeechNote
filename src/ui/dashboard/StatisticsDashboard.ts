/**
 * 통계 대시보드
 * - 변환 히스토리
 * - 성공/실패 통계
 * - 처리 시간 평균
 * - API 사용량
 */

import type { App } from 'obsidian';
import { EventManager } from '../../application/EventManager';
import { ConfirmationModal } from '../modals/ConfirmationModal';
import { Notice } from 'obsidian';

export interface TranscriptionRecord {
    id: string;
    fileName: string;
    fileSize: number;
    duration?: number; // 오디오 길이 (초)
    startTime: number;
    endTime?: number;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
    error?: string;
    result?: string;
    wordCount?: number;
    apiCost?: number; // API 사용 비용 (추정치)
}

export interface DashboardStats {
    totalTranscriptions: number;
    successCount: number;
    failureCount: number;
    cancelledCount: number;
    averageProcessingTime: number;
    totalProcessingTime: number;
    totalDataProcessed: number; // bytes
    totalApiCost: number;
    successRate: number;
    todayCount: number;
    weekCount: number;
    monthCount: number;
}

/**
 * 통계 저장소
 */
export class StatisticsStore {
    private static readonly STORAGE_KEY = 'transcription_statistics';
    private static records: TranscriptionRecord[] = [];
    private static app: App | null = null;

    /**
     * App 인스턴스 설정
     */
    static setApp(app: App): void {
        this.app = app;
    }

    /**
     * 저장소 초기화
     */
    static init(app?: App) {
        if (app) {
            this.app = app;
        }
        this.loadFromStorage();
    }

    /**
     * 레코드 추가
     */
    static addRecord(record: TranscriptionRecord) {
        this.records.push(record);
        this.saveToStorage();

        // 이벤트 발생
        EventManager.getInstance().emit('stats:record:added', record);
    }

    /**
     * 레코드 업데이트
     */
    static updateRecord(id: string, updates: Partial<TranscriptionRecord>) {
        const index = this.records.findIndex((r) => r.id === id);
        if (index !== -1) {
            this.records[index] = { ...this.records[index], ...updates };
            this.saveToStorage();

            // 이벤트 발생
            EventManager.getInstance().emit('stats:record:updated', this.records[index]);
        }
    }

    /**
     * 모든 레코드 가져오기
     */
    static getAllRecords(): TranscriptionRecord[] {
        return [...this.records];
    }

    /**
     * 필터링된 레코드 가져오기
     */
    static getFilteredRecords(filter: {
        status?: TranscriptionRecord['status'];
        startDate?: number;
        endDate?: number;
    }): TranscriptionRecord[] {
        return this.records.filter((record) => {
            if (filter.status && record.status !== filter.status) {
                return false;
            }
            if (filter.startDate && record.startTime < filter.startDate) {
                return false;
            }
            if (filter.endDate && record.startTime > filter.endDate) {
                return false;
            }
            return true;
        });
    }

    /**
     * 통계 계산
     */
    static calculateStats(): DashboardStats {
        const now = Date.now();
        const dayAgo = now - 24 * 60 * 60 * 1000;
        const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
        const monthAgo = now - 30 * 24 * 60 * 60 * 1000;

        const completedRecords = this.records.filter((r) => r.status === 'completed');
        const failedRecords = this.records.filter((r) => r.status === 'failed');
        const cancelledRecords = this.records.filter((r) => r.status === 'cancelled');

        const processingTimes = completedRecords
            .filter((r) => r.endTime)
            .map((r) => (r.endTime! - r.startTime) / 1000); // 초 단위

        const totalProcessingTime = processingTimes.reduce((sum, time) => sum + time, 0);
        const averageProcessingTime =
            processingTimes.length > 0 ? totalProcessingTime / processingTimes.length : 0;

        const totalDataProcessed = this.records.reduce((sum, r) => sum + r.fileSize, 0);
        const totalApiCost = this.records.reduce((sum, r) => sum + (r.apiCost || 0), 0);

        const successRate =
            this.records.length > 0 ? (completedRecords.length / this.records.length) * 100 : 0;

        const todayCount = this.records.filter((r) => r.startTime >= dayAgo).length;
        const weekCount = this.records.filter((r) => r.startTime >= weekAgo).length;
        const monthCount = this.records.filter((r) => r.startTime >= monthAgo).length;

        return {
            totalTranscriptions: this.records.length,
            successCount: completedRecords.length,
            failureCount: failedRecords.length,
            cancelledCount: cancelledRecords.length,
            averageProcessingTime,
            totalProcessingTime,
            totalDataProcessed,
            totalApiCost,
            successRate,
            todayCount,
            weekCount,
            monthCount,
        };
    }

    /**
     * 저장소에 저장
     */
    private static saveToStorage() {
        if (!this.app) {
            console.error('App instance not set for StatisticsStore');
            return;
        }
        try {
            this.app.saveLocalStorage(this.STORAGE_KEY, JSON.stringify(this.records));
        } catch (e) {
            console.error('Failed to save statistics:', e);
        }
    }

    /**
     * 저장소에서 로드
     */
    private static loadFromStorage() {
        if (!this.app) {
            console.error('App instance not set for StatisticsStore');
            return;
        }
        try {
            const data = this.app.loadLocalStorage(this.STORAGE_KEY);
            if (data) {
                this.records = JSON.parse(data);
            }
        } catch (e) {
            console.error('Failed to load statistics:', e);
            this.records = [];
        }
    }

    /**
     * 데이터 초기화
     */
    static clear() {
        this.records = [];
        this.saveToStorage();

        // 이벤트 발생
        EventManager.getInstance().emit('stats:cleared', {});
    }
}

/**
 * 대시보드 컴포넌트
 */
export class StatisticsDashboard {
    private element: HTMLElement | null = null;
    private stats: DashboardStats | null = null;
    private refreshInterval: number | null = null;
    private eventManager: EventManager;

    constructor() {
        this.eventManager = EventManager.getInstance();
        StatisticsStore.init();
    }

    /**
     * 대시보드 생성
     */
    create(container: HTMLElement): HTMLElement {
        this.element = createEl('div', { cls: 'statistics-dashboard' });
        this.element.setAttribute('role', 'region');
        this.element.setAttribute('aria-label', '통계 대시보드');

        // 헤더
        const header = this.createHeader();
        this.element.appendChild(header);

        // 주요 통계 카드
        const statsGrid = this.createStatsGrid();
        this.element.appendChild(statsGrid);

        // 차트 영역
        const charts = this.createCharts();
        this.element.appendChild(charts);

        // 히스토리 테이블
        const history = this.createHistoryTable();
        this.element.appendChild(history);

        container.appendChild(this.element);

        // 데이터 로드 및 렌더링
        this.refresh();

        // 자동 새로고침 (30초마다)
        this.startAutoRefresh();

        // 이벤트 리스너
        this.setupEventListeners();

        return this.element;
    }

    /**
     * 헤더 생성
     */
    private createHeader(): HTMLElement {
        const header = createEl('div', { cls: 'dashboard__header' });

        const title = createEl('h2', { text: '변환 통계' });
        header.appendChild(title);

        const controls = createEl('div', { cls: 'dashboard__controls' });

        // 새로고침 버튼
        const refreshBtn = createEl('button', { cls: 'dashboard__refresh', text: '새로고침' });
        refreshBtn.addEventListener('click', () => this.refresh());
        controls.appendChild(refreshBtn);

        // 데이터 초기화 버튼
        const clearBtn = createEl('button', { cls: 'dashboard__clear', text: '데이터 초기화' });
        clearBtn.addEventListener('click', () => this.clearData());
        controls.appendChild(clearBtn);

        // 내보내기 버튼
        const exportBtn = createEl('button', { cls: 'dashboard__export', text: 'CSV 내보내기' });
        exportBtn.addEventListener('click', () => this.exportToCSV());
        controls.appendChild(exportBtn);

        header.appendChild(controls);

        return header;
    }

    /**
     * 통계 그리드 생성
     */
    private createStatsGrid(): HTMLElement {
        const grid = createEl('div', { cls: 'dashboard__stats-grid' });

        // 통계 카드들
        const cards = [
            { id: 'total', label: '전체 변환', value: '0', icon: '📊' },
            { id: 'success', label: '성공', value: '0', icon: '✅', color: 'success' },
            { id: 'failure', label: '실패', value: '0', icon: '❌', color: 'error' },
            { id: 'rate', label: '성공률', value: '0%', icon: '📈', color: 'info' },
            { id: 'avg-time', label: '평균 처리 시간', value: '0초', icon: '⏱️' },
            { id: 'data', label: '처리된 데이터', value: '0 MB', icon: '💾' },
            { id: 'today', label: '오늘', value: '0', icon: '📅' },
            { id: 'api-cost', label: 'API 비용', value: '$0.00', icon: '💰' },
        ];

        cards.forEach((card) => {
            const cardEl = createEl('div', {
                cls: card.color ? ['stats-card', `stats-card--${card.color}`] : 'stats-card',
            });
            cardEl.setAttribute('data-stat-id', card.id);

            const icon = createEl('div', { cls: 'stats-card__icon', text: card.icon });
            cardEl.appendChild(icon);

            const content = createEl('div', { cls: 'stats-card__content' });

            const value = createEl('div', { cls: 'stats-card__value', text: card.value });
            content.appendChild(value);

            const label = createEl('div', { cls: 'stats-card__label', text: card.label });
            content.appendChild(label);

            cardEl.appendChild(content);
            grid.appendChild(cardEl);
        });

        return grid;
    }

    /**
     * 차트 영역 생성
     */
    private createCharts(): HTMLElement {
        const charts = createEl('div', { cls: 'dashboard__charts' });

        // 시간대별 차트
        const timeChart = createEl('div', { cls: 'chart-container' });

        const timeChartTitle = createEl('h3', { text: '시간대별 변환 횟수' });
        timeChart.appendChild(timeChartTitle);

        const timeChartCanvas = createEl('div', { cls: 'chart-canvas' });
        timeChartCanvas.id = 'time-chart';
        timeChart.appendChild(timeChartCanvas);

        charts.appendChild(timeChart);

        // 성공률 차트
        const successChart = createEl('div', { cls: 'chart-container' });

        const successChartTitle = createEl('h3', { text: '성공률 추이' });
        successChart.appendChild(successChartTitle);

        const successChartCanvas = createEl('div', { cls: 'chart-canvas' });
        successChartCanvas.id = 'success-chart';
        successChart.appendChild(successChartCanvas);

        charts.appendChild(successChart);

        return charts;
    }

    /**
     * 히스토리 테이블 생성
     */
    private createHistoryTable(): HTMLElement {
        const container = createEl('div', { cls: 'dashboard__history' });

        const header = createEl('div', { cls: 'history__header' });

        const title = createEl('h3', { text: '최근 변환 기록' });
        header.appendChild(title);

        // 필터
        const filter = createEl('select', { cls: 'history__filter' });

        const filterOptions = [
            { value: 'all', label: '전체' },
            { value: 'completed', label: '성공' },
            { value: 'failed', label: '실패' },
            { value: 'processing', label: '처리 중' },
            { value: 'cancelled', label: '취소됨' },
        ];

        filterOptions.forEach((optionInfo) => {
            const optionEl = createEl('option', { text: optionInfo.label });
            optionEl.value = optionInfo.value;
            filter.appendChild(optionEl);
        });
        filter.addEventListener('change', () => this.filterHistory(filter.value));
        header.appendChild(filter);

        container.appendChild(header);

        // 테이블
        const table = createEl('table', { cls: 'history__table' });

        const thead = createEl('thead');
        const headerRow = createEl('tr');
        ['시간', '파일명', '크기', '처리 시간', '상태', '단어 수', '작업'].forEach((text) => {
            const th = createEl('th', { text });
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = createEl('tbody', { cls: 'history__tbody' });
        table.appendChild(tbody);

        container.appendChild(table);

        return container;
    }

    /**
     * 데이터 새로고침
     */
    refresh() {
        this.stats = StatisticsStore.calculateStats();
        this.updateStatsCards();
        this.updateCharts();
        this.updateHistoryTable();
    }

    /**
     * 통계 카드 업데이트
     */
    private updateStatsCards() {
        if (!this.stats || !this.element) return;

        const updates = {
            total: String(this.stats.totalTranscriptions),
            success: String(this.stats.successCount),
            failure: String(this.stats.failureCount),
            rate: `${this.stats.successRate.toFixed(1)}%`,
            'avg-time': this.formatTime(this.stats.averageProcessingTime * 1000),
            data: this.formatBytes(this.stats.totalDataProcessed),
            today: String(this.stats.todayCount),
            'api-cost': `$${this.stats.totalApiCost.toFixed(2)}`,
        };

        Object.entries(updates).forEach(([id, value]) => {
            const card = this.element!.querySelector(`[data-stat-id="${id}"] .stats-card__value`);
            if (card) {
                card.textContent = value;
            }
        });
    }

    /**
     * 차트 업데이트
     */
    private updateCharts() {
        if (!this.element) return;

        // 간단한 막대 차트 구현 (실제로는 Chart.js 등을 사용하는 것이 좋음)
        this.renderTimeChart();
        this.renderSuccessChart();
    }

    /**
     * 시간대별 차트 렌더링
     */
    private renderTimeChart() {
        const chartEl = this.element?.querySelector('#time-chart');
        if (!chartEl) return;

        const records = StatisticsStore.getAllRecords();
        const hourCounts = new Array(24).fill(0);

        records.forEach((record) => {
            const hour = new Date(record.startTime).getHours();
            hourCounts[hour]++;
        });

        const maxCount = Math.max(...hourCounts, 1);

        chartEl.replaceChildren();
        const chartContainer = createEl('div', { cls: 'bar-chart' });

        hourCounts.forEach((count, hour) => {
            const bar = createEl('div', { cls: 'bar-chart__bar' });
            const height = (count / maxCount) * 100;
            bar.setAttribute('style', `--sn-bar-height:${height}%`);

            const valueLabel = createEl('span', { cls: 'bar-chart__value', text: String(count) });
            bar.appendChild(valueLabel);

            const barLabel = createEl('span', { cls: 'bar-chart__label', text: `${hour}시` });
            bar.appendChild(barLabel);

            chartContainer.appendChild(bar);
        });

        chartEl.appendChild(chartContainer);
    }

    /**
     * 성공률 차트 렌더링
     */
    private renderSuccessChart() {
        const chartEl = this.element?.querySelector('#success-chart');
        if (!chartEl) return;

        // 최근 7일간의 성공률
        const records = StatisticsStore.getAllRecords();
        const dailyStats: { [date: string]: { success: number; total: number } } = {};

        records.forEach((record) => {
            const date = new Date(record.startTime).toLocaleDateString();
            if (!dailyStats[date]) {
                dailyStats[date] = { success: 0, total: 0 };
            }
            dailyStats[date].total++;
            if (record.status === 'completed') {
                dailyStats[date].success++;
            }
        });

        const dates = Object.keys(dailyStats).slice(-7);

        chartEl.replaceChildren();
        const lineChart = createEl('div', { cls: 'line-chart' });

        dates.forEach((date) => {
            const stat = dailyStats[date];
            const rate = stat.total > 0 ? (stat.success / stat.total) * 100 : 0;

            const point = createEl('div', { cls: 'line-chart__point' });

            const valueLabel = createEl('span', {
                cls: 'line-chart__value',
                text: `${rate.toFixed(0)}%`,
            });
            point.appendChild(valueLabel);

            const dateLabel = createEl('span', {
                cls: 'line-chart__label',
                text: date.split('/').slice(0, 2).join('/'),
            });
            point.appendChild(dateLabel);

            lineChart.appendChild(point);
        });

        chartEl.appendChild(lineChart);
    }

    /**
     * 히스토리 테이블 업데이트
     */
    private updateHistoryTable(filter = 'all') {
        const tbody = this.element?.querySelector('.history__tbody');
        if (!tbody) return;

        let records = StatisticsStore.getAllRecords();

        // 필터링
        if (filter !== 'all') {
            records = records.filter((r) => r.status === filter);
        }

        // 최근 순으로 정렬
        records.sort((a, b) => b.startTime - a.startTime);

        // 최대 20개만 표시
        records = records.slice(0, 20);

        // 테이블 렌더링
        tbody.replaceChildren();

        records.forEach((record) => {
            const row = createEl('tr');

            const startTimeCell = createEl('td', {
                text: new Date(record.startTime).toLocaleString(),
            });
            row.appendChild(startTimeCell);

            const nameCell = createEl('td', { text: record.fileName });
            row.appendChild(nameCell);

            const sizeCell = createEl('td', { text: this.formatBytes(record.fileSize) });
            row.appendChild(sizeCell);

            const processingTimeCell = createEl('td');
            const processingTime = record.endTime
                ? this.formatTime(record.endTime - record.startTime)
                : '-';
            processingTimeCell.textContent = processingTime;
            row.appendChild(processingTimeCell);

            const statusCell = createEl('td');
            const statusBadge = createEl('span', {
                cls: ['status', `status--${record.status}`],
                text: this.getStatusText(record.status),
            });
            statusCell.appendChild(statusBadge);
            row.appendChild(statusCell);

            const wordCountCell = createEl('td', {
                text: record.wordCount ? String(record.wordCount) : '-',
            });
            row.appendChild(wordCountCell);

            const actionCell = createEl('td');
            const actionBtn = createEl('button', { cls: 'action-btn', text: '보기' });
            actionBtn.dataset.recordId = record.id;
            actionBtn.dataset.action = 'view';
            actionBtn.addEventListener('click', () => {
                this.viewRecord(record.id);
            });
            actionCell.appendChild(actionBtn);
            row.appendChild(actionCell);

            tbody.appendChild(row);
        });
    }

    /**
     * 히스토리 필터링
     */
    private filterHistory(filter: string) {
        this.updateHistoryTable(filter);
    }

    /**
     * 레코드 상세 보기
     */
    private viewRecord(recordId: string) {
        const records = StatisticsStore.getAllRecords();
        const record = records.find((r) => r.id === recordId);

        if (record) {
            // 상세 정보 모달 표시 (NotificationSystem 활용)
            this.eventManager.emit('record:view', record);
        }
    }

    /**
     * 상태 텍스트 가져오기
     */
    private getStatusText(status: TranscriptionRecord['status']): string {
        const texts = {
            pending: '대기 중',
            processing: '처리 중',
            completed: '완료',
            failed: '실패',
            cancelled: '취소됨',
        };
        return texts[status] || status;
    }

    /**
     * 시간 포맷팅
     */
    private formatTime(milliseconds: number): string {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}시간 ${minutes % 60}분`;
        } else if (minutes > 0) {
            return `${minutes}분 ${seconds % 60}초`;
        } else {
            return `${seconds}초`;
        }
    }

    /**
     * 바이트 포맷팅
     */
    private formatBytes(bytes: number): string {
        if (bytes === 0) return '0 B';

        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
    }

    /**
     * 데이터 초기화
     */
    private clearData() {
        // StatisticsStore에 app이 설정되어 있어야 함
        const app = StatisticsStore['app']; // private 필드 접근
        if (!app) {
            new Notice('앱 인스턴스를 찾을 수 없습니다');
            return;
        }

        new ConfirmationModal(
            app,
            'Clear statistics',
            '모든 통계 데이터를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
            () => {
                StatisticsStore.clear();
                this.refresh();
            }
        ).open();
    }

    /**
     * CSV로 내보내기
     */
    private exportToCSV() {
        const records = StatisticsStore.getAllRecords();

        const headers = [
            '시간',
            '파일명',
            '크기(bytes)',
            '처리시간(ms)',
            '상태',
            '단어수',
            'API비용',
        ];
        const rows = records.map((r) => [
            new Date(r.startTime).toISOString(),
            r.fileName,
            r.fileSize,
            r.endTime ? r.endTime - r.startTime : '',
            r.status,
            r.wordCount || '',
            r.apiCost || '',
        ]);

        const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

        // 다운로드
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = createEl('a');
        link.href = URL.createObjectURL(blob);
        link.download = `transcription_stats_${Date.now()}.csv`;
        link.click();
    }

    /**
     * 자동 새로고침 시작
     */
    private startAutoRefresh() {
        this.refreshInterval = window.setInterval(() => {
            this.refresh();
        }, 30000); // 30초마다
    }

    /**
     * 자동 새로고침 중지
     */
    private stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    /**
     * 이벤트 리스너 설정
     */
    private setupEventListeners() {
        // 레코드 추가/업데이트 시 새로고침
        this.eventManager.on('stats:record:added', () => this.refresh());
        this.eventManager.on('stats:record:updated', () => this.refresh());
        this.eventManager.on('stats:cleared', () => this.refresh());
    }

    /**
     * 컴포넌트 제거
     */
    destroy() {
        this.stopAutoRefresh();
        this.element?.remove();
        this.element = null;
        this.stats = null;
    }
}
