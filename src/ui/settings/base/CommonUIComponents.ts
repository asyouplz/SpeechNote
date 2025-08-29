import { Setting, ButtonComponent, TextComponent, ToggleComponent, SliderComponent, DropdownComponent } from 'obsidian';

/**
 * 공통 UI 컴포넌트 팩토리
 * 
 * 재사용 가능한 UI 컴포넌트들을 생성하는 팩토리 클래스
 * Single Responsibility Principle 적용
 */
export class UIComponentFactory {
    /**
     * 상태 인디케이터 생성
     */
    static createStatusIndicator(
        containerEl: HTMLElement,
        status: 'success' | 'warning' | 'error' | 'info',
        text: string,
        icon?: string
    ): HTMLElement {
        const statusEl = containerEl.createDiv({ 
            cls: `status-indicator status-${status}`,
            attr: {
                'role': 'status',
                'aria-label': text
            }
        });
        
        if (icon) {
            statusEl.createSpan({ text: icon, cls: 'status-icon' });
        }
        
        statusEl.createSpan({ text, cls: 'status-text' });
        
        return statusEl;
    }
    
    /**
     * 프로그레스 바 생성
     */
    static createProgressBar(
        containerEl: HTMLElement,
        value: number,
        max = 100,
        label?: string
    ): HTMLElement {
        const progressContainer = containerEl.createDiv({ cls: 'progress-container' });
        
        if (label) {
            progressContainer.createDiv({ 
                text: label, 
                cls: 'progress-label',
                attr: { 'id': `progress-label-${Date.now()}` }
            });
        }
        
        const progressBar = progressContainer.createDiv({ 
            cls: 'progress-bar',
            attr: {
                'role': 'progressbar',
                'aria-valuenow': String(value),
                'aria-valuemin': '0',
                'aria-valuemax': String(max),
                'aria-labelledby': label ? `progress-label-${Date.now()}` : null
            }
        });
        
        const progressFill = progressBar.createDiv({ 
            cls: 'progress-fill',
            attr: {
                'style': `width: ${(value / max) * 100}%`
            }
        });
        
        // 접근성을 위한 텍스트
        progressFill.createSpan({ 
            text: `${Math.round((value / max) * 100)}%`,
            cls: 'progress-text'
        });
        
        return progressContainer;
    }
    
    /**
     * 접을 수 있는 섹션 생성
     */
    static createCollapsibleSection(
        containerEl: HTMLElement,
        title: string,
        isExpanded = false,
        onToggle?: (expanded: boolean) => void
    ): { headerEl: HTMLElement; contentEl: HTMLElement } {
        const sectionEl = containerEl.createDiv({ cls: 'collapsible-section' });
        
        const headerEl = sectionEl.createDiv({ 
            cls: 'collapsible-header',
            attr: {
                'role': 'button',
                'tabindex': '0',
                'aria-expanded': String(isExpanded),
                'aria-controls': `collapsible-content-${Date.now()}`
            }
        });
        
        const toggleIcon = headerEl.createSpan({ 
            text: isExpanded ? '▼' : '▶',
            cls: 'toggle-icon'
        });
        
        headerEl.createSpan({ text: title, cls: 'collapsible-title' });
        
        const contentEl = sectionEl.createDiv({ 
            cls: `collapsible-content ${isExpanded ? 'expanded' : 'collapsed'}`,
            attr: {
                'id': `collapsible-content-${Date.now()}`,
                'aria-hidden': String(!isExpanded)
            }
        });
        
        // 이벤트 핸들러
        const toggle = () => {
            isExpanded = !isExpanded;
            toggleIcon.textContent = isExpanded ? '▼' : '▶';
            contentEl.className = `collapsible-content ${isExpanded ? 'expanded' : 'collapsed'}`;
            headerEl.setAttribute('aria-expanded', String(isExpanded));
            contentEl.setAttribute('aria-hidden', String(!isExpanded));
            onToggle?.(isExpanded);
        };
        
        headerEl.onclick = toggle;
        headerEl.onkeydown = (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggle();
            }
        };
        
        return { headerEl, contentEl };
    }
    
    /**
     * 카드 컴포넌트 생성
     */
    static createCard(
        containerEl: HTMLElement,
        title: string,
        content: string,
        actions?: Array<{ text: string; onClick: () => void; type?: 'primary' | 'secondary' | 'danger' }>
    ): HTMLElement {
        const cardEl = containerEl.createDiv({ cls: 'settings-card' });
        
        const headerEl = cardEl.createDiv({ cls: 'card-header' });
        headerEl.createEl('h5', { text: title, cls: 'card-title' });
        
        const contentEl = cardEl.createDiv({ cls: 'card-content' });
        contentEl.createEl('p', { text: content });
        
        if (actions && actions.length > 0) {
            const actionsEl = cardEl.createDiv({ cls: 'card-actions' });
            
            actions.forEach(action => {
                const btn = new ButtonComponent(actionsEl)
                    .setButtonText(action.text)
                    .onClick(action.onClick);
                
                if (action.type === 'primary') btn.setCta();
                if (action.type === 'danger') btn.setWarning();
            });
        }
        
        return cardEl;
    }
    
    /**
     * 탭 컴포넌트 생성
     */
    static createTabs(
        containerEl: HTMLElement,
        tabs: Array<{ id: string; label: string; content: () => HTMLElement }>,
        activeTabId?: string
    ): HTMLElement {
        const tabsContainer = containerEl.createDiv({ cls: 'tabs-container' });
        
        const tabList = tabsContainer.createDiv({ 
            cls: 'tab-list',
            attr: {
                'role': 'tablist'
            }
        });
        
        const tabPanels = tabsContainer.createDiv({ cls: 'tab-panels' });
        
        let activeTab = activeTabId || tabs[0]?.id;
        
        tabs.forEach((tab, index) => {
            // 탭 버튼
            const tabButton = tabList.createEl('button', {
                text: tab.label,
                cls: `tab-button ${tab.id === activeTab ? 'active' : ''}`,
                attr: {
                    'role': 'tab',
                    'id': `tab-${tab.id}`,
                    'aria-controls': `panel-${tab.id}`,
                    'aria-selected': String(tab.id === activeTab),
                    'tabindex': tab.id === activeTab ? '0' : '-1'
                }
            });
            
            // 탭 패널
            const tabPanel = tabPanels.createDiv({
                cls: `tab-panel ${tab.id === activeTab ? 'active' : ''}`,
                attr: {
                    'role': 'tabpanel',
                    'id': `panel-${tab.id}`,
                    'aria-labelledby': `tab-${tab.id}`,
                    'hidden': tab.id !== activeTab ? 'true' : null
                }
            });
            
            if (tab.id === activeTab) {
                tabPanel.appendChild(tab.content());
            }
            
            // 이벤트 핸들러
            tabButton.onclick = () => {
                // 모든 탭 비활성화
                tabList.querySelectorAll('.tab-button').forEach(btn => {
                    btn.classList.remove('active');
                    btn.setAttribute('aria-selected', 'false');
                    btn.setAttribute('tabindex', '-1');
                });
                
                tabPanels.querySelectorAll('.tab-panel').forEach(panel => {
                    panel.classList.remove('active');
                    panel.setAttribute('hidden', 'true');
                    (panel as HTMLElement).empty();
                });
                
                // 선택된 탭 활성화
                tabButton.classList.add('active');
                tabButton.setAttribute('aria-selected', 'true');
                tabButton.setAttribute('tabindex', '0');
                
                tabPanel.classList.add('active');
                tabPanel.removeAttribute('hidden');
                tabPanel.appendChild(tab.content());
                
                activeTab = tab.id;
            };
            
            // 키보드 네비게이션
            tabButton.onkeydown = (e) => {
                let newIndex = index;
                
                if (e.key === 'ArrowLeft') {
                    newIndex = index > 0 ? index - 1 : tabs.length - 1;
                } else if (e.key === 'ArrowRight') {
                    newIndex = index < tabs.length - 1 ? index + 1 : 0;
                } else if (e.key === 'Home') {
                    newIndex = 0;
                } else if (e.key === 'End') {
                    newIndex = tabs.length - 1;
                } else {
                    return;
                }
                
                e.preventDefault();
                const newTab = tabList.querySelectorAll('.tab-button')[newIndex] as HTMLElement;
                newTab.click();
                newTab.focus();
            };
        });
        
        return tabsContainer;
    }
    
    /**
     * 툴팁 추가
     */
    static addTooltip(element: HTMLElement, text: string): void {
        element.setAttribute('title', text);
        element.setAttribute('aria-label', text);
        element.addClass('has-tooltip');
    }
    
    /**
     * 로딩 스피너 생성
     */
    static createLoadingSpinner(containerEl: HTMLElement, text = 'Loading...'): HTMLElement {
        const spinnerEl = containerEl.createDiv({ 
            cls: 'loading-spinner',
            attr: {
                'role': 'status',
                'aria-label': text
            }
        });
        
        spinnerEl.createDiv({ cls: 'spinner' });
        spinnerEl.createSpan({ text, cls: 'spinner-text' });
        
        return spinnerEl;
    }
    
    /**
     * 에러 메시지 표시
     */
    static showErrorMessage(
        containerEl: HTMLElement,
        message: string,
        details?: string,
        onRetry?: () => void
    ): HTMLElement {
        const errorEl = containerEl.createDiv({ 
            cls: 'error-message',
            attr: {
                'role': 'alert',
                'aria-live': 'assertive'
            }
        });
        
        errorEl.createDiv({ text: '⚠️', cls: 'error-icon' });
        errorEl.createDiv({ text: message, cls: 'error-text' });
        
        if (details) {
            const detailsEl = errorEl.createEl('details');
            detailsEl.createEl('summary', { text: '자세히 보기' });
            detailsEl.createEl('pre', { text: details, cls: 'error-details' });
        }
        
        if (onRetry) {
            new ButtonComponent(errorEl)
                .setButtonText('다시 시도')
                .onClick(onRetry);
        }
        
        return errorEl;
    }
    
    /**
     * 확인 다이얼로그
     */
    static async showConfirmDialog(
        title: string,
        message: string,
        confirmText = '확인',
        cancelText = '취소'
    ): Promise<boolean> {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal-container';
            modal.innerHTML = `
                <div class="modal-bg"></div>
                <div class="modal">
                    <div class="modal-close-button" aria-label="Close">×</div>
                    <div class="modal-title">${title}</div>
                    <div class="modal-content">
                        <p>${message}</p>
                    </div>
                    <div class="modal-button-container">
                        <button class="mod-cta">${confirmText}</button>
                        <button>${cancelText}</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            const confirmBtn = modal.querySelector('.mod-cta') as HTMLButtonElement;
            const cancelBtn = modal.querySelectorAll('button')[1] as HTMLButtonElement;
            const closeBtn = modal.querySelector('.modal-close-button') as HTMLElement;
            
            const close = (result: boolean) => {
                document.body.removeChild(modal);
                resolve(result);
            };
            
            confirmBtn.onclick = () => close(true);
            cancelBtn.onclick = () => close(false);
            closeBtn.onclick = () => close(false);
            modal.querySelector('.modal-bg')!.addEventListener('click', () => close(false));
            
            // 포커스 설정
            confirmBtn.focus();
        });
    }
}

/**
 * 폼 유효성 검사 헬퍼
 */
export class FormValidator {
    private errors: Map<string, string> = new Map();
    
    /**
     * 필수 필드 검증
     */
    required(field: string, value: any, message?: string): this {
        if (!value || (typeof value === 'string' && value.trim() === '')) {
            this.errors.set(field, message || `${field}는 필수 항목입니다`);
        }
        return this;
    }
    
    /**
     * 최소 길이 검증
     */
    minLength(field: string, value: string, min: number, message?: string): this {
        if (value.length < min) {
            this.errors.set(field, message || `${field}는 최소 ${min}자 이상이어야 합니다`);
        }
        return this;
    }
    
    /**
     * 최대 길이 검증
     */
    maxLength(field: string, value: string, max: number, message?: string): this {
        if (value.length > max) {
            this.errors.set(field, message || `${field}는 최대 ${max}자까지 입력 가능합니다`);
        }
        return this;
    }
    
    /**
     * 패턴 검증
     */
    pattern(field: string, value: string, pattern: RegExp, message?: string): this {
        if (!pattern.test(value)) {
            this.errors.set(field, message || `${field} 형식이 올바르지 않습니다`);
        }
        return this;
    }
    
    /**
     * 범위 검증
     */
    range(field: string, value: number, min: number, max: number, message?: string): this {
        if (value < min || value > max) {
            this.errors.set(field, message || `${field}는 ${min}에서 ${max} 사이여야 합니다`);
        }
        return this;
    }
    
    /**
     * 유효성 검사 통과 여부
     */
    isValid(): boolean {
        return this.errors.size === 0;
    }
    
    /**
     * 에러 가져오기
     */
    getErrors(): Map<string, string> {
        return this.errors;
    }
    
    /**
     * 첫 번째 에러 가져오기
     */
    getFirstError(): string | null {
        const firstError = this.errors.values().next();
        return firstError.done ? null : firstError.value;
    }
    
    /**
     * 에러 초기화
     */
    clear(): void {
        this.errors.clear();
    }
}