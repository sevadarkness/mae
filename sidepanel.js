// sidepanel.js - WhatsApp Group Extractor v6.0.6 - Side Panel Implementation
class PopupController {
    constructor() {
        // Estado
        this.groups = [];
        this.filteredGroups = [];
        this.selectedGroup = null;
        this.extractedData = null;
        this.currentFilter = 'all';
        this.stats = { total: 0, archived: 0, active: 0 };

        // Constantes de progresso
        this.PROGRESS = {
            STARTING: 3,        // 0-3%
            NAVIGATING: 12,     // 3-12%
            OPENING_INFO: 20,   // 12-20%
            PREPARING: 30,      // 20-30%
            EXTRACTING_MIN: 30, // 30%
            EXTRACTING_MAX: 95, // 95%
            FINISHING: 100      // 95-100%
        };

        // Constantes de conexão
        this.CONNECTION = {
            MAX_RETRIES: 3,           // Número de tentativas para verificar conexão
            RETRY_DELAY_MS: 800,      // Delay entre tentativas (ms)
            ERROR_MESSAGE: 'Conexão perdida. Clique no ícone da extensão para reconectar.'
        };

        // Estado de extração
        this.extractionState = {
            isRunning: false,
            isPaused: false,
            currentGroup: null,
            progress: 0,
            membersCount: 0
        };

        // Caches e otimizações
        this.groupsCache = null;
        this.performanceMonitor = null;
        this.virtualList = null;
        this.membersVirtualList = null; // ← CORREÇÃO: Declarar esta variável

        // Storage e exporters
        this.storage = null;
        this.sheetsExporter = null;

        // Inicializa
        this.init();
    }

    // ========================================
    // INICIALIZAÇÃO
    // ========================================
    async init() {
        // Notify background that side panel is open
        this.notifyBackgroundPanelOpen();
        
        // Verificar se as classes estão disponíveis
        this.waitForDependencies().then(() => {
            this.initializeComponents();
            this.cacheElements();
            this.bindEventsOptimized();
            this.setupHistoryEventDelegation(); // Configurar event delegation do histórico
            this.initStorage();
        });
    }

    // Notify background that side panel has opened
    notifyBackgroundPanelOpen() {
        // Prevent duplicate port connections which would cause memory leaks and multiple event handlers
        if (this.backgroundPort) {
            console.log('[SidePanel] ⚠️ Already connected to background, skipping');
            return;
        }
        
        try {
            // Establish connection to notify background of side panel state
            const port = chrome.runtime.connect({ name: 'sidepanel' });
            console.log('[SidePanel] 🔗 Connected to background');
            
            // Keep port reference to maintain connection while panel is open
            this.backgroundPort = port;
            
            // Listen for disconnect and clean up
            port.onDisconnect.addListener(() => {
                console.log('[SidePanel] 🔌 Disconnected from background');
                this.backgroundPort = null;
            });
        } catch (error) {
            console.error('[SidePanel] Error connecting to background:', error);
            // Extension context may be invalid - log and continue
            this.backgroundPort = null;
        }
    }

    waitForDependencies() {
        return new Promise((resolve) => {
            const checkDeps = () => {
                if (typeof SmartCache !== 'undefined' &&
                    typeof PerformanceMonitor !== 'undefined' &&
                    typeof ExtractionStorage !== 'undefined' &&
                    typeof GoogleSheetsExporter !== 'undefined') {
                    resolve();
                } else {
                    setTimeout(checkDeps, 50);
                }
            };
            checkDeps();
        });
    }

    initializeComponents() {
        this.groupsCache = new SmartCache({ maxAge: 2 * 60 * 1000 });
        this.performanceMonitor = new PerformanceMonitor();
        this.storage = new ExtractionStorage();
        this.sheetsExporter = new GoogleSheetsExporter();
        console.log('[SidePanel] ✅ Componentes inicializados');
    }

    async initStorage() {
        try {
            await this.storage.init();
            console.log('[SidePanel] ✅ Storage inicializado');
            
            const deleted = await this.storage.cleanOldExtractions(30);
            if (deleted > 0) {
                console.log(`[SidePanel] 🗑️ ${deleted} extrações antigas removidas`);
            }

            // Restaurar estado se houver
            await this.restoreState();
        } catch (error) {
            console.error('[SidePanel] Erro ao inicializar storage:', error);
        }
    }

    // ========================================
    // STATE PERSISTENCE
    // ========================================
    async saveState() {
        try {
            const state = {
                groups: this.groups,
                selectedGroup: this.selectedGroup,
                extractionState: this.extractionState,
                stats: this.stats,
                timestamp: Date.now()
            };
            
            await chrome.storage.local.set({ extractorState: state });
            console.log('[SidePanel] ✅ Estado salvo');
        } catch (error) {
            console.error('[SidePanel] Erro ao salvar estado:', error);
        }
    }

    async restoreState() {
        try {
            const result = await chrome.storage.local.get('extractorState');
            
            if (result.extractorState) {
                const state = result.extractorState;
                
                // Verificar se o estado não é muito antigo (mais de 1 hora)
                const age = Date.now() - state.timestamp;
                if (age > 3600000) {
                    console.log('[SidePanel] Estado muito antigo, ignorando');
                    await chrome.storage.local.remove('extractorState');
                    return;
                }
                
                // Restaurar dados
                if (state.groups && state.groups.length > 0) {
                    this.groups = state.groups;
                    this.stats = state.stats || this.stats;
                }
                
                if (state.selectedGroup) {
                    this.selectedGroup = state.selectedGroup;
                }
                
                if (state.extractionState) {
                    this.extractionState = state.extractionState;
                    
                    // Se estava em execução ou pausada, notificar usuário
                    if (state.extractionState.isRunning || state.extractionState.isPaused) {
                        console.log('[SidePanel] ⚠️ Extração anterior detectada');
                        // Usuário pode retomar manualmente
                    }
                }
                
                console.log('[SidePanel] ✅ Estado restaurado');
            }
        } catch (error) {
            console.error('[SidePanel] Erro ao restaurar estado:', error);
        }
    }

    async clearState() {
        try {
            await chrome.storage.local.remove('extractorState');
            console.log('[SidePanel] 🗑️ Estado limpo');
        } catch (error) {
            console.error('[SidePanel] Erro ao limpar estado:', error);
        }
    }

    // ========================================
    // EXTRACTION CONTROLS
    // ========================================
    async pauseExtraction() {
        try {
            console.log('[SidePanel] ⏸️ Pausando extração...');
            this.extractionState.isPaused = true;
            this.extractionState.isRunning = false;
            
            // Enviar comando para content script
            await this.sendMessage('pauseExtraction');
            
            // Notificar background
            chrome.runtime.sendMessage({
                action: 'pauseExtraction',
                state: this.extractionState
            }).catch(console.error);
            
            // Atualizar UI
            this.btnPauseExtraction?.classList.add('hidden');
            this.btnResumeExtraction?.classList.remove('hidden');
            
            this.showStatus('⏸️ Extração pausada', this.extractionState.progress);
            
            await this.saveState();
        } catch (error) {
            console.error('[SidePanel] Erro ao pausar:', error);
            this.showError('❌ Não foi possível pausar a extração. Tente novamente.');
        }
    }

    async resumeExtraction() {
        try {
            console.log('[SidePanel] ▶️ Retomando extração...');
            this.extractionState.isPaused = false;
            this.extractionState.isRunning = true;
            
            // Enviar comando para content script
            await this.sendMessage('resumeExtraction');
            
            // Notificar background
            chrome.runtime.sendMessage({
                action: 'resumeExtraction',
                state: this.extractionState
            }).catch(console.error);
            
            // Atualizar UI
            this.btnPauseExtraction?.classList.remove('hidden');
            this.btnResumeExtraction?.classList.add('hidden');
            
            this.showStatus('▶️ Extração retomada...', this.extractionState.progress);
            
            await this.saveState();
        } catch (error) {
            console.error('[SidePanel] Erro ao retomar:', error);
            this.showError('❌ Não foi possível retomar a extração. Tente novamente.');
        }
    }

    async stopExtraction() {
        try {
            if (!confirm('⚠️ Tem certeza que deseja parar a extração?\n\nOs dados coletados até agora não serão perdidos.')) {
                return;
            }
            
            console.log('[SidePanel] ⏹️ Parando extração...');
            this.extractionState.isRunning = false;
            this.extractionState.isPaused = false;
            
            // Enviar comando para content script
            await this.sendMessage('stopExtraction');
            
            // Notificar background
            chrome.runtime.sendMessage({
                action: 'stopExtraction'
            }).catch(console.error);
            
            // Ocultar controles
            this.extractionControls?.classList.add('hidden');
            
            this.hideStatus();
            this.setLoading(this.btnExtract, false);
            
            await this.clearState();
            
            // Se já tem dados, mostrar resultado parcial
            if (this.extractedData && this.extractedData.members && this.extractedData.members.length > 0) {
                this.showResults();
            }
        } catch (error) {
            console.error('[SidePanel] Erro ao parar:', error);
            this.showError('❌ Não foi possível parar a extração. Tente fechar e reabrir a extensão.');
        }
    }

    cacheElements() {
        // Steps
        this.step1 = document.getElementById('step1');
        this.step2 = document.getElementById('step2');
        this.step3 = document.getElementById('step3');
        this.step4 = document.getElementById('step4');

        // Buttons
        this.btnLoadGroups = document.getElementById('btnLoadGroups');
        this.btnBack = document.getElementById('btnBack');
        this.btnExtract = document.getElementById('btnExtract');
        this.btnNewExtraction = document.getElementById('btnNewExtraction');
        this.btnDismissError = document.getElementById('btnDismissError');
        this.btnViewHistory = document.getElementById('btnViewHistory');

        // Export buttons
        this.btnExportCSV = document.getElementById('btnExportCSV');
        this.btnCopyList = document.getElementById('btnCopyList');
        this.btnCopySheets = document.getElementById('btnCopySheets');
        this.btnOpenSheets = document.getElementById('btnOpenSheets');

        // History buttons
        this.btnBackFromHistory = document.getElementById('btnBackFromHistory');
        this.btnClearHistory = document.getElementById('btnClearHistory');

        // Extraction control buttons
        this.extractionControls = document.getElementById('extractionControls');
        this.btnPauseExtraction = document.getElementById('btnPauseExtraction');
        this.btnResumeExtraction = document.getElementById('btnResumeExtraction');
        this.btnStopExtraction = document.getElementById('btnStopExtraction');

        // Filter tabs
        this.filterTabs = document.querySelectorAll('.filter-tab');

        // Other elements
        this.statusBar = document.getElementById('statusBar');
        this.statusText = document.getElementById('statusText');
        this.progressFill = document.getElementById('progressFill');
        this.groupsList = document.getElementById('groupsList');
        this.groupCount = document.getElementById('groupCount');
        this.searchGroups = document.getElementById('searchGroups');
        this.errorBox = document.getElementById('errorBox');
        this.errorText = document.getElementById('errorText');

        // Result elements
        this.resultGroupName = document.getElementById('resultGroupName');
        this.resultGroupStatus = document.getElementById('resultGroupStatus');
        this.resultMemberCount = document.getElementById('resultMemberCount');
        this.membersList = document.getElementById('membersList');

        // History elements
        this.historyList = document.getElementById('historyList');
        this.historyStats = document.getElementById('historyStats');
    }

    // ========================================
    // BIND EVENTS
    // ========================================
    bindEventsOptimized() {
        this.btnLoadGroups?.addEventListener('click', () => this.loadGroups());
        this.btnBack?.addEventListener('click', () => this.goToStep(1));
        this.btnExtract?.addEventListener('click', () => this.startExtraction());
        this.btnNewExtraction?.addEventListener('click', () => this.reset());
        this.btnDismissError?.addEventListener('click', () => this.hideError());
        this.btnViewHistory?.addEventListener('click', () => this.showHistory());

        this.btnExportCSV?.addEventListener('click', () => this.exportCSV());
        this.btnCopyList?.addEventListener('click', () => this.copyList());
        this.btnCopySheets?.addEventListener('click', () => this.copyToSheets());
        this.btnOpenSheets?.addEventListener('click', () => this.openInSheets());

        this.btnBackFromHistory?.addEventListener('click', () => this.goToStep(1));
        this.btnClearHistory?.addEventListener('click', () => this.clearHistory());

        // Extraction controls
        this.btnPauseExtraction?.addEventListener('click', () => this.pauseExtraction());
        this.btnResumeExtraction?.addEventListener('click', () => this.resumeExtraction());
        this.btnStopExtraction?.addEventListener('click', () => this.stopExtraction());

        // Debounced search
        this.searchGroups?.addEventListener('input', 
            PerformanceUtils.debounce(() => {
                if (this.performanceMonitor) {
                    this.performanceMonitor.mark('search-start');
                }
                this.applyFilters();
                if (this.performanceMonitor) {
                    const duration = this.performanceMonitor.measure('search', 'search-start');
                    console.log(`Search completed in ${duration?.toFixed(2)}ms`);
                }
            }, 300)
        );

        this.filterTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this.setFilter(tab.dataset.filter);
            });
        });

        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });
    }

    // ========================================
    // KEYBOARD SHORTCUTS
    // ========================================
    handleKeyboardShortcuts(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
            e.preventDefault();
            if (!this.btnLoadGroups?.disabled) this.loadGroups();
        }

        if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
            e.preventDefault();
            if (!this.btnExtract?.disabled) this.startExtraction();
        }

        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if (this.extractedData) this.exportCSV();
        }

        if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
            e.preventDefault();
            if (this.extractedData) this.copyToSheets();
        }

        if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
            e.preventDefault();
            this.showHistory();
        }

        if (e.key === 'Escape') {
            if (this.step2 && !this.step2.classList.contains('hidden')) {
                this.goToStep(1);
            }
        }

        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            this.searchGroups?.focus();
        }
    }

    // ========================================
    // VERIFICAÇÃO INICIAL
    // ========================================
    async checkWhatsAppTab() {
        // Sidepanel sempre ativo - o usuário decide quando usar
        // A verificação de conexão é feita com retry no loadGroups()
        return true;
    }
    
    // Métodos mantidos para compatibilidade (não fazem mais nada)
    showNotWhatsAppMessage() {
        // Não bloqueamos mais - sidepanel sempre ativo
    }
    
    hideNotWhatsAppMessage() {
        // Não bloqueamos mais - sidepanel sempre ativo
    }

    // ========================================
    // NAVEGAÇÃO ENTRE ETAPAS
    // ========================================
    goToStep(step) {
        PerformanceUtils.batchUpdate(() => {
            this.step1?.classList.toggle('hidden', step !== 1);
            this.step2?.classList.toggle('hidden', step !== 2);
            this.step3?.classList.toggle('hidden', step !== 3);
            this.step4?.classList.toggle('hidden', step !== 4);
        });

        if (step === 1) {
            this.hideStatus();
            this.selectedGroup = null;
            if (this.btnExtract) this.btnExtract.disabled = true;

            if (this.virtualList) {
                this.virtualList.destroy();
                this.virtualList = null;
            }
        }
    }

    // ========================================
    // STATUS E LOADING
    // ========================================
    showStatus(text, progress = null) {
        if (!this.statusBar) return;
        this.statusBar.classList.remove('hidden');
        if (this.statusText) this.statusText.textContent = text;
        if (progress !== null && this.progressFill) {
            this.progressFill.style.width = `${progress}%`;
            // Atualizar o texto de porcentagem
            const progressPercent = document.getElementById('progressPercent');
            if (progressPercent) {
                progressPercent.textContent = `${Math.round(progress)}%`;
            }
        }
    }

    hideStatus() {
        if (!this.statusBar) return;
        this.statusBar.classList.add('hidden');
        if (this.progressFill) this.progressFill.style.width = '0%';
        const progressPercent = document.getElementById('progressPercent');
        if (progressPercent) {
            progressPercent.textContent = '0%';
        }
    }

    setLoading(button, loading) {
        if (!button) return;
        if (loading) {
            button.dataset.originalText = button.innerHTML;
            button.innerHTML = '<div class="spinner" style="width: 16px; height: 16px; border-width: 2px; margin: 0 auto;"></div>';
            button.disabled = true;
        } else {
            button.innerHTML = button.dataset.originalText || button.innerHTML;
            button.disabled = false;
        }
    }

    // ========================================
    // MENSAGENS DE ERRO
    // ========================================
    showError(message) {
        if (!this.errorBox) return;
        if (this.errorText) this.errorText.textContent = message;
        this.errorBox.classList.remove('hidden');
        setTimeout(() => this.hideError(), 5000);
    }

    hideError() {
        if (!this.errorBox) return;
        this.errorBox.classList.add('hidden');
    }

    // ========================================
    // COMUNICAÇÃO COM CONTENT SCRIPT
    // ========================================
    async sendMessage(action, data = {}) {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const tab = tabs[0];

        return new Promise((resolve, reject) => {
            chrome.tabs.sendMessage(
                tab.id,
                { action, ...data },
                (response) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve(response);
                    }
                }
            );
        });
    }

    // ========================================
    // CARREGAR GRUPOS
    // ========================================
    async loadGroups(forceRefresh = false) {
        try {
            if (this.performanceMonitor) {
                this.performanceMonitor.mark('load-groups-start');
            }

            this.setLoading(this.btnLoadGroups, true);
            this.showStatus('🔍 Carregando lista de grupos...', 20);

            const includeArchived = true; // Sempre incluir todos os grupos
            const cacheKey = `groups_${includeArchived}`;

            if (!forceRefresh && this.groupsCache && this.groupsCache.has(cacheKey)) {
                const cached = this.groupsCache.get(cacheKey);
                this.groups = cached.groups;
                this.stats = cached.stats;
                console.log('[SidePanel] ✅ Grupos do cache:', this.stats);

                this.updateStats();
                this.setFilter('all');
                this.goToStep(2);
                this.setLoading(this.btnLoadGroups, false);
                this.hideStatus();
                return;
            }

            // NOVO: Verificar conexão antes de prosseguir
            let isConnected = false;
            
            for (let attempt = 1; attempt <= this.CONNECTION.MAX_RETRIES; attempt++) {
                try {
                    console.log(`[SidePanel] Verificando conexão (tentativa ${attempt}/${this.CONNECTION.MAX_RETRIES})...`);
                    const checkResult = await this.sendMessage('checkPage');
                    if (checkResult?.success && checkResult?.isWhatsApp) {
                        isConnected = true;
                        console.log('[SidePanel] ✅ Conexão OK');
                        break;
                    }
                } catch (e) {
                    console.log(`[SidePanel] ⚠️ Tentativa ${attempt} falhou:`, e.message);
                    if (attempt < this.CONNECTION.MAX_RETRIES) {
                        await this.delay(this.CONNECTION.RETRY_DELAY_MS);
                    }
                }
            }
            
            if (!isConnected) {
                // Mostrar dica de reconexão
                this.showReconnectTip();
                throw new Error(this.CONNECTION.ERROR_MESSAGE);
            }
            
            // Ocultar dica se estava visível
            this.hideReconnectTip();

            const response = await this.sendMessage('getGroups', { 
                includeArchived: includeArchived 
            });

            if (response?.success && response.groups) {
                this.groups = response.groups;
                this.stats = response.stats || {
                    total: this.groups.length,
                    archived: this.groups.filter(g => g.isArchived).length,
                    active: this.groups.filter(g => !g.isArchived).length
                };

                if (this.groupsCache) {
                    this.groupsCache.set(cacheKey, { 
                        groups: this.groups, 
                        stats: this.stats 
                    });
                }

                if (this.performanceMonitor) {
                    const duration = this.performanceMonitor.measure('load-groups', 'load-groups-start');
                    console.log(`[SidePanel] ✅ Grupos carregados em ${duration?.toFixed(2)}ms:`, this.stats);
                }

                this.updateStats();
                this.setFilter('all');
                this.goToStep(2);
                this.hideReconnectTip();
            } else {
                throw new Error(response?.error || 'Não foi possível carregar os grupos');
            }
        } catch (error) {
            console.error('[SidePanel] Erro ao carregar grupos:', error);
            this.showError(error.message);
        } finally {
            this.setLoading(this.btnLoadGroups, false);
            this.hideStatus();
        }
    }

    // ========================================
    // RECONNECT TIP
    // ========================================
    showReconnectTip() {
        const tip = document.getElementById('reconnectTip');
        if (tip) {
            tip.style.display = 'block';
        }
    }

    hideReconnectTip() {
        const tip = document.getElementById('reconnectTip');
        if (tip) {
            tip.style.display = 'none';
        }
    }

    // ========================================
    // ESTATÍSTICAS
    // ========================================
    updateStats() {
        const statTotal = document.querySelector('#statTotal .stat-value');
        const statActive = document.querySelector('#statActive .stat-value');
        const statArchived = document.querySelector('#statArchived .stat-value');

        if (statTotal) {
            statTotal.textContent = this.stats.total;
        }
        if (statActive) {
            statActive.textContent = this.stats.active;
        }
        if (statArchived) {
            statArchived.textContent = this.stats.archived;
        }
    }

    // ========================================
    // FILTROS
    // ========================================
    setFilter(filter) {
        if (this.performanceMonitor) {
            this.performanceMonitor.mark('filter-start');
        }

        this.currentFilter = filter;

        PerformanceUtils.batchUpdate(() => {
            this.filterTabs.forEach(tab => {
                tab.classList.toggle('active', tab.dataset.filter === filter);
            });
        });

        this.applyFilters();

        if (this.performanceMonitor) {
            const duration = this.performanceMonitor.measure('filter', 'filter-start');
            console.log(`Filter applied in ${duration?.toFixed(2)}ms`);
        }
    }

    applyFilters() {
        const searchQuery = this.searchGroups?.value?.toLowerCase() || '';

        this.filteredGroups = this.groups.filter(group => {
            if (this.currentFilter === 'active' && group.isArchived) return false;
            if (this.currentFilter === 'archived' && !group.isArchived) return false;
            if (searchQuery && !group.name.toLowerCase().includes(searchQuery)) return false;
            return true;
        });

        this.renderGroupsWithVirtualScroll(this.filteredGroups);

        if (this.groupCount) {
            this.groupCount.textContent = `${this.filteredGroups.length} grupo${this.filteredGroups.length !== 1 ? 's' : ''}`;
        }
    }

    // ========================================
    // RENDERIZAR COM VIRTUAL SCROLL
    // ========================================
    renderGroupsWithVirtualScroll(groups) {
        if (!this.groupsList) return;

        if (this.performanceMonitor) {
            this.performanceMonitor.mark('render-start');
        }

        if (groups.length === 0) {
            this.groupsList.innerHTML = `
                <div class="empty-state">
                    <span class="empty-state-icon">🔭</span>
                    <p>Nenhum grupo encontrado</p>
                </div>
            `;
            return;
        }

        if (this.virtualList) {
            this.virtualList.destroy();
        }

        this.groupsList.innerHTML = '';

        this.virtualList = new VirtualScroll(this.groupsList, {
            itemHeight: 72,
            buffer: 3,
            renderItem: (group, index) => this.createGroupElement(group, index)
        });

        this.virtualList.setItems(groups);

        if (this.performanceMonitor) {
            const duration = this.performanceMonitor.measure('render', 'render-start');
            console.log(`Groups rendered with VirtualScroll in ${duration?.toFixed(2)}ms`);
        }
    }

    createGroupElement(group, index) {
        const div = document.createElement('div');
        div.className = `group-item ${group.isArchived ? 'archived' : ''}`;
        div.dataset.index = index;
        div.dataset.id = group.id;
        div.dataset.archived = group.isArchived;

        div.innerHTML = `
            <div class="group-avatar">
                ${group.isArchived ? '📦' : '👥'}
            </div>
            <div class="group-info">
                <div class="group-name">
                    ${this.escapeHtml(group.name)}
                    ${group.isArchived ? '<span class="archived-badge">Arquivado</span>' : ''}
                </div>
                <div class="group-members">${group.memberCount || 'Grupo'}</div>
            </div>
            <div class="group-check">✓</div>
        `;

        div.addEventListener('click', () => this.selectGroup(div));
        return div;
    }

    selectGroup(element) {
        PerformanceUtils.batchUpdate(() => {
            this.groupsList?.querySelectorAll('.group-item').forEach(item => {
                item.classList.remove('selected');
            });
            element.classList.add('selected');
        });

        const groupId = element.dataset.id;
        const isArchived = element.dataset.archived === 'true';

        this.selectedGroup = this.groups.find(g => g.id === groupId);

        if (this.selectedGroup) {
            this.selectedGroup.isArchived = isArchived;
            if (this.btnExtract) this.btnExtract.disabled = false;
            console.log('[SidePanel] Grupo selecionado:', this.selectedGroup);
        }
    }

    // ========================================
    // EXTRAÇÃO
    // ========================================
    async startExtraction() {
        if (!this.selectedGroup) {
            this.showError('⚠️ Selecione um grupo primeiro');
            return;
        }

        // Verificar se já há uma extração em andamento (client-side check for immediate UX)
        // Note: Background script also enforces a lock for true race condition prevention
        if (this.extractionState.isRunning) {
            this.showError('⏳ Aguarde! Já existe uma extração em andamento.');
            return;
        }

        try {
            if (this.performanceMonitor) {
                this.performanceMonitor.mark('extraction-start');
            }

            this.setLoading(this.btnExtract, true);
            
            // INÍCIO IMEDIATO - 3% (feedback visual imediato)
            this.showStatus('🚀 Iniciando processo...', this.PROGRESS.STARTING);
            
            // Reset do tracker de progresso para nova extração
            if (typeof lastReportedProgress !== 'undefined') {
                lastReportedProgress = this.PROGRESS.STARTING;
            }
            
            // Atualizar estado
            this.extractionState.isRunning = true;
            this.extractionState.isPaused = false;
            this.extractionState.currentGroup = this.selectedGroup;
            this.extractionState.progress = this.PROGRESS.STARTING;
            this.extractionState.membersCount = 0;
            
            // Notificar background que extração iniciou
            chrome.runtime.sendMessage({
                action: 'startExtraction',
                state: this.extractionState
            }).catch(console.error);
            
            // Mostrar controles de extração
            this.extractionControls?.classList.remove('hidden');
            this.btnPauseExtraction?.classList.remove('hidden');
            this.btnResumeExtraction?.classList.add('hidden');

            await this.saveState();

            // Chamar extractMembers com retry automático
            const extractResult = await this.extractMembers();

            if (extractResult?.success && extractResult.data) {
                this.extractedData = {
                    ...extractResult.data,
                    groupId: this.selectedGroup.id,
                    isArchived: this.selectedGroup.isArchived
                };

                await this.saveExtractionToStorage();

                if (this.performanceMonitor) {
                    const duration = this.performanceMonitor.measure('extraction', 'extraction-start');
                    console.log(`[SidePanel] ✅ Extração concluída em ${duration?.toFixed(2)}ms`);
                }

                // Limpar estado de extração
                this.extractionState.isRunning = false;
                this.extractionState.isPaused = false;
                
                // Notificar background que extração finalizou
                chrome.runtime.sendMessage({
                    action: 'stopExtraction'
                }).catch(console.error);
                
                await this.clearState();

                this.showResults();
            } else {
                throw new Error(extractResult?.error || 'Erro durante a extração');
            }
        } catch (error) {
            console.error('[SidePanel] ❌ Erro na extração:', error);
            this.showError(error.message);
            this.setLoading(this.btnExtract, false);
            
            // Limpar estado em caso de erro
            this.extractionState.isRunning = false;
            this.extractionState.isPaused = false;
            
            // Notificar background
            chrome.runtime.sendMessage({
                action: 'stopExtraction'
            }).catch(console.error);
            
            await this.clearState();
        } finally {
            this.hideStatus();
            this.extractionControls?.classList.add('hidden');
        }
    }

    async extractMembers() {
        const MAX_EXTRACTION_RETRIES = 3;
        const RETRY_DELAY_MS = 1500;
        const INITIAL_WAIT_MS_ACTIVE = 2000;
        const INITIAL_WAIT_MS_ARCHIVED = 2500;
        const RETRY_WAIT_MS = 1000;
        let lastError = null;
        let currentProgress = this.PROGRESS.STARTING; // Começa de onde parou (REGRA: NUNCA regride)
        
        for (let attempt = 1; attempt <= MAX_EXTRACTION_RETRIES; attempt++) {
            try {
                console.log(`[SidePanel] 🔄 Tentativa de extração ${attempt}/${MAX_EXTRACTION_RETRIES}`);
                
                // Atualizar UI com progresso que NUNCA regride
                if (attempt > 1) {
                    // Retry avança levemente em vez de regredir (+2% por tentativa)
                    currentProgress = Math.max(currentProgress, this.PROGRESS.STARTING + (attempt - 1) * 2);
                    this.showStatus(`🔄 Retry automático (${attempt}/${MAX_EXTRACTION_RETRIES})...`, currentProgress);
                    await this.delay(RETRY_DELAY_MS);
                }
                
                // Navegando - progride para ~12%
                currentProgress = Math.max(currentProgress, this.PROGRESS.NAVIGATING);
                const groupStatus = this.selectedGroup.isArchived ? 'arquivado' : 'ativo';
                this.showStatus(`🔍 Navegando até o grupo ${groupStatus}...`, currentProgress);
                
                // Navegar até o grupo
                const navResult = await this.sendMessage('navigateToGroup', {
                    groupId: this.selectedGroup.id,
                    groupName: this.selectedGroup.name,
                    isArchived: this.selectedGroup.isArchived
                });
                
                if (!navResult || !navResult.success) {
                    throw new Error(navResult?.error || 'Falha na navegação');
                }
                
                // Abrindo info - progride para ~20%
                currentProgress = Math.max(currentProgress, this.PROGRESS.OPENING_INFO);
                this.showStatus('📂 Abrindo informações...', currentProgress);
                
                // Aguardar mais tempo na primeira tentativa, com tempo extra para arquivados
                const waitTime = attempt === 1 
                    ? (this.selectedGroup.isArchived ? INITIAL_WAIT_MS_ARCHIVED : INITIAL_WAIT_MS_ACTIVE)
                    : RETRY_WAIT_MS;
                await this.delay(waitTime);
                
                // Aguardando modal - progride para ~30%
                currentProgress = Math.max(currentProgress, this.PROGRESS.PREPARING);
                this.showStatus('⏳ Preparando extração...', currentProgress);
                
                // Extração - progride de 30% até 95% (será atualizado pelo content script)
                currentProgress = Math.max(currentProgress, this.PROGRESS.EXTRACTING_MIN);
                this.showStatus('🔍 Extraindo membros...', currentProgress);
                
                // Tentar extrair
                const extractResult = await this.sendMessage('extractMembers');
                
                if (extractResult && extractResult.success) {
                    console.log(`[SidePanel] ✅ Extração bem-sucedida na tentativa ${attempt}`);
                    // Finalizando - progride para 98%
                    this.showStatus('✅ Finalizando...', 98);
                    return extractResult; // Sucesso!
                }
                
                // Se retornou mas sem sucesso
                lastError = new Error(extractResult?.error || 'Extração falhou');
                console.log(`[SidePanel] ⚠️ Tentativa ${attempt} falhou: ${lastError.message}`);
                // Nota: currentProgress já usa Math.max, então não regride
                
            } catch (error) {
                lastError = error;
                console.error(`[SidePanel] ❌ Erro na tentativa ${attempt}:`, error.message);
                // Nota: progresso mantido, não regride
                console.log(`[SidePanel] Progresso mantido em ${currentProgress}%`);
            }
            
            // Se não é a última tentativa, continuar
            if (attempt < MAX_EXTRACTION_RETRIES) {
                console.log(`[SidePanel] 🔄 Preparando retry ${attempt + 1}...`);
            }
        }
        
        // Todas as tentativas falharam
        console.error(`[SidePanel] ❌ Todas as ${MAX_EXTRACTION_RETRIES} tentativas falharam`);
        throw lastError || new Error(`Extração falhou após ${MAX_EXTRACTION_RETRIES} tentativas`);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ========================================
    // SALVAR NO STORAGE
    // ========================================
    async saveExtractionToStorage() {
        try {
            const id = await this.storage.saveExtraction(this.extractedData);
            console.log('[SidePanel] ✅ Extração salva no IndexedDB com ID:', id);
            this.extractedData.storageId = id;
        } catch (error) {
            console.error('[SidePanel] Erro ao salvar no storage:', error);
        }
    }

    // ========================================
    // MOSTRAR RESULTADOS
    // ========================================
    showResults() {
        // Check for 0 members found
        if (this.extractedData.totalMembers === 0 || this.extractedData.members.length === 0) {
            this.showError('⚠️ Nenhum membro encontrado. O grupo pode estar vazio ou você não tem permissão para ver os membros.');
            this.setLoading(this.btnExtract, false);
            return;
        }

        if (this.resultGroupName) {
            this.resultGroupName.textContent = this.extractedData.groupName;
        }

        if (this.resultGroupStatus) {
            this.resultGroupStatus.textContent = this.extractedData.isArchived 
                ? '📦 Arquivado' 
                : '💬 Ativo';
            this.resultGroupStatus.className = `value ${
                this.extractedData.isArchived ? 'status-archived' : 'status-active'
            }`;
        }

        if (this.resultMemberCount) {
            this.resultMemberCount.textContent = `${this.extractedData.totalMembers} membros`;
        }

        this.updateMembersListVirtual(this.extractedData.members);

        this.setLoading(this.btnExtract, false);
        this.goToStep(3);
    }

    // ========================================
    // ATUALIZAR MEMBROS COM VIRTUAL SCROLL
    // ========================================
    updateMembersListVirtual(members) {
        if (!this.membersList || !members || members.length === 0) return;

        const uniqueMembers = Array.from(
            new Map(members.map(m => [(m.phone || m.name), m])).values()
        );

        // ← CORREÇÃO: Destruir a instância anterior corretamente
        if (this.membersVirtualList) {
            this.membersVirtualList.destroy();
            this.membersVirtualList = null;
        }

        this.membersList.innerHTML = '';

        this.membersVirtualList = new VirtualScroll(this.membersList, {
            itemHeight: 60,
            buffer: 5,
            renderItem: (member) => {
                const div = document.createElement('div');
                div.className = 'member-item';
                div.innerHTML = `
                    <div class="member-avatar">
                        ${member.isAdmin ? '👑' : '👤'}
                    </div>
                    <div class="member-info">
                        <div class="member-name">${this.escapeHtml(member.name)}</div>
                        ${member.phone ? `<div class="member-phone">${this.escapeHtml(member.phone)}</div>` : ''}
                    </div>
                `;
                return div;
            }
        });

        this.membersVirtualList.setItems(uniqueMembers);
    }

    // ========================================
    // EXPORTAÇÕES
    // ========================================
    exportCSV() {
        if (!this.extractedData) return;

        try {
            const headers = ['Nome', 'Telefone', 'Admin', 'Grupo Arquivado', 'Data Extração'];
            const rows = this.extractedData.members.map(m => [
                m.name,
                m.phone || '', // MANTÉM o "+" no CSV
                m.isAdmin ? 'Sim' : 'Não',
                this.extractedData.isArchived ? 'Sim' : 'Não',
                m.extractedAt
            ]);

            const csv = [headers, ...rows]
                .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
                .join('\n');

            const filename = `${this.sanitizeFilename(this.extractedData.groupName)}_membros.csv`;
            this.downloadFile(csv, filename, 'text/csv;charset=utf-8');
            console.log('[SidePanel] ✅ CSV exportado:', filename);
        } catch (error) {
            console.error('[SidePanel] Erro ao exportar CSV:', error);
            this.showError('❌ Não foi possível exportar o arquivo CSV. Tente novamente.');
        }
    }

    exportJSON() {
        if (!this.extractedData) return;

        try {
            const json = JSON.stringify(this.extractedData, null, 2);
            const filename = `${this.sanitizeFilename(this.extractedData.groupName)}_membros.json`;
            this.downloadFile(json, filename, 'application/json');
            console.log('[SidePanel] ✅ JSON exportado:', filename);
        } catch (error) {
            console.error('[SidePanel] Erro ao exportar JSON:', error);
            this.showError('❌ Não foi possível exportar o arquivo JSON. Tente novamente.');
        }
    }

    async copyList() {
        if (!this.extractedData) return;

        try {
            const list = this.extractedData.members
                .map(m => `${m.name}${m.phone ? ' - ' + m.phone : ''}${m.isAdmin ? ' [Admin]' : ''}`) // MANTÉM o "+"
                .join('\n');

            await navigator.clipboard.writeText(list);

            if (this.btnCopyList) {
                const originalText = this.btnCopyList.innerHTML;
                this.btnCopyList.innerHTML = '✓ Copiado!';
                this.btnCopyList.style.background = 'rgba(37, 211, 102, 0.3)';

                setTimeout(() => {
                    this.btnCopyList.innerHTML = originalText;
                    this.btnCopyList.style.background = '';
                }, 2000);
            }

            console.log('[SidePanel] ✅ Lista copiada');
        } catch (error) {
            console.error('[SidePanel] Erro ao copiar:', error);
            this.showError('❌ Não foi possível copiar a lista. Verifique as permissões do navegador.');
        }
    }

    // ========================================
    // GOOGLE SHEETS EXPORT
    // ========================================
    async copyToSheets() {
        if (!this.extractedData) return;

        try {
            // Preparar dados COM cleanPhone aplicado
            const dataForSheets = {
                ...this.extractedData,
                members: this.extractedData.members.map(m => ({
                    ...m,
                    phone: this.cleanPhone(m.phone) // Remove "+" para Google Sheets
                }))
            };
            
            await this.sheetsExporter.copyForSheetsWithFormatting(dataForSheets);

            if (this.btnCopySheets) {
                const originalText = this.btnCopySheets.innerHTML;
                this.btnCopySheets.innerHTML = '✓ Copiado!';
                this.btnCopySheets.style.background = 'rgba(37, 211, 102, 0.3)';

                setTimeout(() => {
                    this.btnCopySheets.innerHTML = originalText;
                    this.btnCopySheets.style.background = '';
                }, 2000);
            }

            console.log('[SidePanel] ✅ Dados copiados para Sheets (telefones sem "+")');
            alert('✅ Dados copiados!\n\n1. Abra o Google Sheets\n2. Cole com Ctrl+V\n3. Pronto!');
        } catch (error) {
            console.error('[SidePanel] Erro ao copiar para Sheets:', error);
            this.showError('❌ Não foi possível copiar para o Google Sheets. Tente novamente.');
        }
    }

    async openInSheets() {
        if (!this.extractedData) return;

        try {
            // Preparar dados COM cleanPhone aplicado
            const dataForSheets = {
                ...this.extractedData,
                members: this.extractedData.members.map(m => ({
                    ...m,
                    phone: this.cleanPhone(m.phone) // Remove "+" para Google Sheets
                }))
            };
            
            await this.sheetsExporter.openInSheets(dataForSheets);
            console.log('[SidePanel] ✅ Google Sheets aberto');
        } catch (error) {
            console.error('[SidePanel] Erro ao abrir Sheets:', error);
            this.showError('❌ Não foi possível abrir o Google Sheets. Tente novamente.');
        }
    }

    // ========================================
    // HISTÓRICO
    // ========================================
    async showHistory() {
        try {
            this.showStatus('📜 Carregando histórico...', 50);

            const history = await this.storage.getExtractionHistory({ limit: 100 });
            const stats = await this.storage.getStats();

            this.renderHistory(history, stats);
            this.goToStep(4);
        } catch (error) {
            console.error('[SidePanel] Erro ao carregar histórico:', error);
            this.showError('❌ Não foi possível carregar o histórico. Tente novamente.');
        } finally {
            this.hideStatus();
        }
    }

    renderHistory(history, stats) {
        if (!this.historyList || !this.historyStats) return;

        // Renderizar estatísticas
        this.historyStats.innerHTML = `
            <div class="stat-card">
                <span class="stat-icon">📊</span>
                <span class="stat-value">${stats.totalExtractions}</span>
                <span class="stat-label">Extrações</span>
            </div>
            <div class="stat-card">
                <span class="stat-icon">👥</span>
                <span class="stat-value">${stats.totalGroups}</span>
                <span class="stat-label">Grupos</span>
            </div>
            <div class="stat-card">
                <span class="stat-icon">📈</span>
                <span class="stat-value">${stats.averageMembersPerGroup}</span>
                <span class="stat-label">Média/Grupo</span>
            </div>
        `;

        // Renderizar histórico
        if (history.length === 0) {
            this.historyList.innerHTML = `
                <div class="empty-state">
                    <span class="empty-state-icon">🔭</span>
                    <p>Nenhuma extração no histórico</p>
                </div>
            `;
            return;
        }

        const html = history.map((extraction) => {
            const date = new Date(extraction.extractedAt);
            const dateStr = date.toLocaleString('pt-BR');

            return `
                <div class="history-item" data-id="${extraction.id}">
                    <div class="history-avatar">
                        ${extraction.isArchived ? '📦' : '👥'}
                    </div>
                    <div class="history-info">
                        <div class="history-name">${this.escapeHtml(extraction.groupName)}</div>
                        <div class="history-meta">
                            ${extraction.totalMembers} membros • ${dateStr}
                        </div>
                    </div>
                    <div class="history-actions">
                        <button class="btn-icon" data-action="view" data-id="${extraction.id}" title="Ver">👁️</button>
                        <button class="btn-icon" data-action="download" data-id="${extraction.id}" title="Baixar CSV">📥</button>
                        <button class="btn-icon" data-action="delete" data-id="${extraction.id}" title="Deletar">🗑️</button>
                    </div>
                </div>
            `;
        }).join('');

        this.historyList.innerHTML = html;

        // Event delegation já configurado no init (não precisa readicionar)
    }

    // Método para configurar event delegation do histórico (chamado uma vez no init)
    setupHistoryEventDelegation() {
        if (!this.historyList) return;
        
        // Remover listener antigo se existir
        if (this.historyClickHandler) {
            this.historyList.removeEventListener('click', this.historyClickHandler);
        }
        
        // Criar e armazenar o handler
        this.historyClickHandler = (e) => {
            const button = e.target.closest('[data-action]');
            if (!button) return;

            const action = button.dataset.action;
            const id = parseInt(button.dataset.id);

            if (action === 'view') {
                this.viewExtraction(id);
            } else if (action === 'download') {
                this.downloadExtractionCSV(id);
            } else if (action === 'delete') {
                this.deleteExtraction(id);
            }
        };
        
        // Adicionar o listener
        this.historyList.addEventListener('click', this.historyClickHandler);
    }

    async viewExtraction(id) {
        try {
            const extraction = await this.storage.getExtraction(id);
            if (extraction) {
                this.extractedData = extraction;
                this.showResults();
            }
        } catch (error) {
            console.error('[SidePanel] Erro ao visualizar extração:', error);
            this.showError('❌ Não foi possível carregar esta extração. Tente novamente.');
        }
    }

    async downloadExtractionCSV(id) {
        try {
            const extraction = await this.storage.getExtraction(id);
            if (extraction) {
                const headers = ['Nome', 'Telefone', 'Admin', 'Grupo Arquivado', 'Data Extração'];
                const rows = extraction.members.map(m => [
                    m.name,
                    m.phone || '', // MANTÉM o "+" no CSV do histórico
                    m.isAdmin ? 'Sim' : 'Não',
                    extraction.isArchived ? 'Sim' : 'Não',
                    m.extractedAt
                ]);

                const csv = [headers, ...rows]
                    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
                    .join('\n');

                const filename = `${this.sanitizeFilename(extraction.groupName)}_membros.csv`;
                this.downloadFile(csv, filename, 'text/csv;charset=utf-8');
                console.log('[SidePanel] ✅ CSV do histórico exportado:', filename);
            }
        } catch (error) {
            console.error('[SidePanel] Erro ao baixar CSV:', error);
            this.showError('❌ Não foi possível baixar o arquivo CSV. Tente novamente.');
        }
    }

    async deleteExtraction(id) {
        if (!confirm('Tem certeza que deseja deletar esta extração?')) return;

        try {
            await this.storage.deleteExtraction(id);
            this.showHistory();
        } catch (error) {
            console.error('[SidePanel] Erro ao deletar:', error);
            this.showError('❌ Não foi possível deletar a extração. Tente novamente.');
        }
    }

    // ========================================
    // LIMPAR TODO HISTÓRICO
    // ========================================
    async clearHistory() {
        if (!confirm('⚠️ Tem certeza que deseja limpar TODO o histórico?\n\nEsta ação não pode ser desfeita!')) {
            return;
        }

        try {
            this.showStatus('🗑️ Limpando histórico...', 50);
            await this.storage.clearAllExtractions();
            console.log('[SidePanel] ✅ Histórico limpo');
            await this.showHistory();
        } catch (error) {
            console.error('[SidePanel] Erro ao limpar histórico:', error);
            this.showError('❌ Não foi possível limpar o histórico. Tente novamente.');
        } finally {
            this.hideStatus();
        }
    }

    // ========================================
    // UTILITÁRIOS
    // ========================================
    cleanPhone(phone) {
        if (!phone) return '';
        // Remove o "+" do início e quaisquer espaços
        return phone.replace(/^\+/, '').trim();
    }

    sanitizeFilename(filename) {
        return filename
            .replace(/[<>:"/\\|?*]/g, '')
            .replace(/[\u200B-\u200D\uFEFF\u202A-\u202E]/g, '')
            .replace(/[®™©]/g, '')
            .trim()
            .substring(0, 100);
    }

    downloadFile(content, filename, type) {
        try {
            const BOM = '\uFEFF';
            const blob = new Blob([BOM + content], { type });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('[SidePanel] Erro ao baixar:', error);
            throw error;
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ========================================
    // RESET
    // ========================================
    reset() {
        this.selectedGroup = null;
        this.extractedData = null;
        if (this.searchGroups) this.searchGroups.value = '';
        this.currentFilter = 'all';

        // Destruir virtual lists
        if (this.virtualList) {
            this.virtualList.destroy();
            this.virtualList = null;
        }
        if (this.membersVirtualList) {
            this.membersVirtualList.destroy();
            this.membersVirtualList = null;
        }

        this.goToStep(1);

        if (this.performanceMonitor && this.performanceMonitor.measures.length > 0) {
            this.performanceMonitor.report();
        }
    }
}

// ========================================
// LISTENER PARA PROGRESSO
// ========================================
let lastReportedProgress = 3; // Track para garantir que nunca regride (começa em 3%)

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'extractionProgress') {
        const statusText = document.getElementById('statusText');
        const progressFill = document.getElementById('progressFill');
        const progressPercent = document.getElementById('progressPercent');

        // REGRA ABSOLUTA: progresso NUNCA regride
        const currentProgress = Math.max(lastReportedProgress, message.progress || 0);
        lastReportedProgress = currentProgress;

        if (statusText) {
            statusText.textContent = `${message.status} (${message.count} membros)`;
        }
        if (progressFill) {
            progressFill.style.width = `${currentProgress}%`;
        }
        if (progressPercent) {
            progressPercent.textContent = `${Math.round(currentProgress)}%`;
        }
        
        // Atualizar estado de extração
        if (window.popupController) {
            window.popupController.extractionState.progress = currentProgress;
            window.popupController.extractionState.membersCount = message.count || 0;
            
            // Salvar estado periodicamente (a cada 10 membros)
            const count = message.count || 0;
            if (count > 0 && count % 10 === 0) {
                window.popupController.saveState().catch(console.error);
            }
        }
    }
});

// ========================================
// INICIALIZAÇÃO
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('[SidePanel] 🚀 Inicializando v6.0.6 COMPLETO...');
    console.log('[SidePanel] 📦 Features: Virtual Scroll + IndexedDB + Google Sheets');
    console.log('[SidePanel] 📊 Progress: Optimized bar with 65% for extraction (30-95%)');
    window.popupController = new PopupController();
});
// ========================================
// NEW FEATURES INTEGRATION
// ========================================

/**
 * Initialize new features (Templates, Anti-Ban, Notifications, Scheduler)
 */
class AdvancedFeaturesController {
    constructor() {
        this.templateManager = null;
        this.antiBanSystem = null;
        this.notificationSystem = null;
        this.schedulerSystem = null;
        this.contactImporter = null;
        
        this.init();
    }
    
    async init() {
        // Wait for utilities to be loaded
        await this.waitForUtilities();
        
        // Initialize systems
        this.templateManager = new TemplateManager();
        this.antiBanSystem = new AntiBanSystem();
        this.notificationSystem = new NotificationSystem();
        this.schedulerSystem = new SchedulerSystem();
        this.contactImporter = new ContactImporter();
        
        console.log('[AdvancedFeatures] ✅ All systems initialized');
        
        // Bind events
        this.bindTemplateEvents();
        this.bindAntiBanEvents();
        this.bindNotificationEvents();
        this.bindSchedulerEvents();
        this.bindImporterEvents();
        
        // Load initial data
        await this.loadAllData();
    }
    
    waitForUtilities() {
        return new Promise((resolve) => {
            const check = () => {
                if (typeof TemplateManager !== 'undefined' &&
                    typeof AntiBanSystem !== 'undefined' &&
                    typeof NotificationSystem !== 'undefined' &&
                    typeof SchedulerSystem !== 'undefined' &&
                    typeof ContactImporter !== 'undefined') {
                    resolve();
                } else {
                    setTimeout(check, 100);
                }
            };
            check();
        });
    }
    
    // ========================================
    // TEMPLATES
    // ========================================
    
    bindTemplateEvents() {
        const saveBtn = document.getElementById('saveTemplate');
        const exportBtn = document.getElementById('exportTemplates');
        const importBtn = document.getElementById('importTemplates');
        const importFile = document.getElementById('importTemplatesFile');
        
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveTemplate());
        }
        
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportTemplates());
        }
        
        if (importBtn) {
            importBtn.addEventListener('click', () => importFile?.click());
        }
        
        if (importFile) {
            importFile.addEventListener('change', (e) => this.importTemplates(e));
        }
    }
    
    async saveTemplate() {
        const name = document.getElementById('templateName')?.value?.trim();
        const category = document.getElementById('templateCategory')?.value;
        const content = document.getElementById('templateContent')?.value?.trim();
        const status = document.getElementById('template_status');
        
        if (!name || !content) {
            this.showStatus(status, '❌ Preencha nome e mensagem', 'error');
            return;
        }
        
        try {
            await this.templateManager.addTemplate(name, category, content);
            this.showStatus(status, '✅ Template salvo!', 'success');
            
            // Clear form
            document.getElementById('templateName').value = '';
            document.getElementById('templateContent').value = '';
            
            // Reload list
            await this.loadTemplates();
        } catch (error) {
            this.showStatus(status, '❌ Erro ao salvar: ' + error.message, 'error');
        }
    }
    
    async loadTemplates() {
        const container = document.getElementById('templatesList');
        if (!container) return;
        
        const templates = this.templateManager.getTemplates();
        
        if (templates.length === 0) {
            container.innerHTML = '<div class="sp-muted" style="text-align:center;padding:20px">Nenhum template salvo</div>';
            return;
        }
        
        container.innerHTML = templates.map(t => `
            <div class="template-item">
                <div class="template-header">
                    <span class="template-name">${this.escapeHtml(t.name)}</span>
                    <span class="template-category">${t.category}</span>
                </div>
                <div class="template-content">${this.escapeHtml(t.content)}</div>
                <div class="template-actions">
                    <button onclick="advancedFeatures.useTemplate('${t.id}')">✅ Usar</button>
                    <button onclick="advancedFeatures.deleteTemplate('${t.id}')">🗑️ Excluir</button>
                </div>
            </div>
        `).join('');
    }
    
    useTemplate(id) {
        const template = this.templateManager.getTemplateById(id);
        if (!template) return;
        
        const messageField = document.getElementById('sp_message');
        if (messageField) {
            messageField.value = template.content;
            
            // Trigger preview update
            const event = new Event('input', { bubbles: true });
            messageField.dispatchEvent(event);
            
            this.showStatus(document.getElementById('template_status'), '✅ Template aplicado!', 'success');
        }
    }
    
    async deleteTemplate(id) {
        if (!confirm('Excluir este template?')) return;
        
        await this.templateManager.deleteTemplate(id);
        await this.loadTemplates();
        this.showStatus(document.getElementById('template_status'), '🗑️ Template excluído', 'success');
    }
    
    exportTemplates() {
        const json = this.templateManager.exportTemplates();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `templates-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showStatus(document.getElementById('template_status'), '✅ Templates exportados!', 'success');
    }
    
    async importTemplates(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            const text = await file.text();
            const success = await this.templateManager.importTemplates(text, true);
            
            if (success) {
                this.showStatus(document.getElementById('template_status'), '✅ Templates importados!', 'success');
                await this.loadTemplates();
            } else {
                this.showStatus(document.getElementById('template_status'), '❌ Erro ao importar', 'error');
            }
        } catch (error) {
            this.showStatus(document.getElementById('template_status'), '❌ Arquivo inválido', 'error');
        }
        
        event.target.value = '';
    }
    
    // ========================================
    // ANTI-BAN
    // ========================================
    
    bindAntiBanEvents() {
        const dailyLimitInput = document.getElementById('dailyLimit');
        const resetBtn = document.getElementById('resetDailyCount');
        
        if (dailyLimitInput) {
            dailyLimitInput.addEventListener('change', async (e) => {
                const limit = parseInt(e.target.value);
                await this.antiBanSystem.updateDailyLimit(limit);
                this.updateAntiBanUI();
            });
        }
        
        if (resetBtn) {
            resetBtn.addEventListener('click', async () => {
                await this.antiBanSystem.resetDaily();
                this.updateAntiBanUI();
                this.showStatus(document.getElementById('antiban_status'), '🔄 Contador resetado', 'success');
            });
        }
    }
    
    updateAntiBanUI() {
        const status = this.antiBanSystem.getStatus();
        
        const sentTodayEl = document.getElementById('sentToday');
        const progressBar = document.getElementById('dailyProgress');
        const dailyLimitInput = document.getElementById('dailyLimit');
        
        if (sentTodayEl) {
            sentTodayEl.textContent = status.sentToday;
        }
        
        if (progressBar) {
            progressBar.style.width = status.percentage + '%';
            
            // Change color based on threshold
            if (status.percentage >= 100) {
                progressBar.style.background = '#e74c3c';
            } else if (status.percentage >= 80) {
                progressBar.style.background = '#f39c12';
            } else {
                progressBar.style.background = 'var(--color-primary)';
            }
        }
        
        if (dailyLimitInput) {
            dailyLimitInput.value = status.dailyLimit;
        }
    }
    
    // ========================================
    // NOTIFICATIONS
    // ========================================
    
    bindNotificationEvents() {
        const enableNotifs = document.getElementById('enableNotifications');
        const enableSounds = document.getElementById('enableSounds');
        const testBtn = document.getElementById('testNotification');
        
        if (enableNotifs) {
            enableNotifs.addEventListener('change', async (e) => {
                await this.notificationSystem.updateSettings({
                    notificationsEnabled: e.target.checked
                });
            });
        }
        
        if (enableSounds) {
            enableSounds.addEventListener('change', async (e) => {
                await this.notificationSystem.updateSettings({
                    soundEnabled: e.target.checked
                });
            });
        }
        
        if (testBtn) {
            testBtn.addEventListener('click', () => {
                this.notificationSystem.notify(
                    '🔔 Teste de Notificação',
                    'Sistema de notificações funcionando!',
                    { sound: true, soundType: 'success' }
                );
            });
        }
    }
    
    // ========================================
    // SCHEDULER
    // ========================================
    
    bindSchedulerEvents() {
        const addBtn = document.getElementById('addSchedule');
        
        if (addBtn) {
            addBtn.addEventListener('click', () => this.addSchedule());
        }
    }
    
    async addSchedule() {
        const nameInput = document.getElementById('scheduleName');
        const timeInput = document.getElementById('scheduleTime');
        const status = document.getElementById('schedule_status');
        
        const name = nameInput?.value?.trim();
        const datetime = timeInput?.value;
        
        if (!name || !datetime) {
            this.showStatus(status, '❌ Preencha nome e horário', 'error');
            return;
        }
        
        // Get current campaign data
        const campaign = this.getCurrentCampaignData();
        if (!campaign || !campaign.numbers || campaign.numbers.length === 0) {
            this.showStatus(status, '❌ Configure uma campanha primeiro', 'error');
            return;
        }
        
        try {
            await this.schedulerSystem.addSchedule(name, datetime, campaign);
            this.showStatus(status, '✅ Campanha agendada!', 'success');
            
            // Clear form
            nameInput.value = '';
            timeInput.value = '';
            
            // Reload list
            await this.loadSchedules();
        } catch (error) {
            this.showStatus(status, '❌ ' + error.message, 'error');
        }
    }
    
    getCurrentCampaignData() {
        const numbersText = document.getElementById('sp_numbers')?.value;
        const message = document.getElementById('sp_message')?.value;
        
        if (!numbersText || !message) return null;
        
        const numbers = numbersText.split('\n').filter(n => n.trim());
        
        return {
            numbers: numbers,
            message: message,
            settings: {
                delayMin: parseFloat(document.getElementById('sp_delay_min')?.value) || 2,
                delayMax: parseFloat(document.getElementById('sp_delay_max')?.value) || 6
            }
        };
    }
    
    async loadSchedules() {
        const container = document.getElementById('schedulesList');
        if (!container) return;
        
        const schedules = this.schedulerSystem.getSchedules();
        
        if (schedules.length === 0) {
            container.innerHTML = '<div class="sp-muted" style="text-align:center;padding:20px">Nenhum agendamento</div>';
            return;
        }
        
        container.innerHTML = schedules.map(s => {
            const datetime = new Date(s.datetime);
            const remaining = this.schedulerSystem.getTimeRemaining(s);
            
            return `
                <div class="schedule-item ${s.status}">
                    <div class="schedule-header">
                        <span class="schedule-name">${this.escapeHtml(s.name)}</span>
                        <span class="schedule-status ${s.status}">${s.status}</span>
                    </div>
                    <div class="schedule-info">
                        <div class="schedule-time">
                            ⏰ ${datetime.toLocaleString('pt-BR')}
                            ${s.status === 'pending' ? ` (${remaining})` : ''}
                        </div>
                        <div class="schedule-contacts">
                            👥 ${s.campaign.numbers.length} contatos
                        </div>
                    </div>
                    ${s.status === 'pending' ? `
                        <div class="schedule-actions">
                            <button class="delete" onclick="advancedFeatures.deleteSchedule('${s.id}')">🗑️ Excluir</button>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    }
    
    async deleteSchedule(id) {
        if (!confirm('Excluir este agendamento?')) return;
        
        await this.schedulerSystem.deleteSchedule(id);
        await this.loadSchedules();
        this.showStatus(document.getElementById('schedule_status'), '🗑️ Agendamento excluído', 'success');
    }
    
    // ========================================
    // CONTACT IMPORTER
    // ========================================
    
    bindImporterEvents() {
        const excelInput = document.getElementById('sp_excel');
        const selectExcelBtn = document.getElementById('sp_select_excel');
        
        if (selectExcelBtn && excelInput) {
            selectExcelBtn.addEventListener('click', () => excelInput.click());
        }
        
        if (excelInput) {
            excelInput.addEventListener('change', (e) => this.handleExcelImport(e));
        }
    }
    
    async handleExcelImport(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const hint = document.getElementById('sp_csv_hint');
        this.showStatus(hint, '⏳ Importando...', 'info');
        
        try {
            const result = await this.contactImporter.importFromFile(file);
            
            if (result.success) {
                // Show preview
                this.showImportPreview(result);
            } else {
                this.showStatus(hint, '❌ ' + result.error, 'error');
            }
        } catch (error) {
            this.showStatus(hint, '❌ Erro ao importar: ' + error.message, 'error');
        }
        
        event.target.value = '';
    }
    
    showImportPreview(result) {
        const { numbers, stats } = result;
        
        // Show modal with preview
        const modal = document.createElement('div');
        modal.className = 'import-preview-modal';
        modal.innerHTML = `
            <div class="import-preview-content">
                <div class="import-preview-header">
                    📊 Preview da Importação
                    <button onclick="this.closest('.import-preview-modal').remove()" style="background:transparent;border:none;color:#fff;font-size:24px;cursor:pointer">&times;</button>
                </div>
                <div class="import-preview-stats">
                    <div class="import-stat">
                        <div class="import-stat-value">${stats.total}</div>
                        <div class="import-stat-label">Total</div>
                    </div>
                    <div class="import-stat">
                        <div class="import-stat-value">${stats.valid}</div>
                        <div class="import-stat-label">Válidos</div>
                    </div>
                    <div class="import-stat">
                        <div class="import-stat-value">${stats.invalid}</div>
                        <div class="import-stat-label">Inválidos</div>
                    </div>
                    <div class="import-stat">
                        <div class="import-stat-value">${stats.duplicates}</div>
                        <div class="import-stat-label">Duplicados</div>
                    </div>
                </div>
                <div style="margin:16px 0">
                    <strong>Resultado Final: ${stats.final} contatos únicos</strong>
                </div>
                <div class="import-preview-list">
                    ${numbers.slice(0, 20).join('\n')}
                    ${numbers.length > 20 ? '\n... e mais ' + (numbers.length - 20) + ' contatos' : ''}
                </div>
                <div class="import-preview-actions">
                    <button class="sp-btn sp-btn-secondary" onclick="this.closest('.import-preview-modal').remove()">❌ Cancelar</button>
                    <button class="sp-btn sp-btn-primary" onclick="advancedFeatures.confirmImport(${JSON.stringify(numbers).replace(/"/g, '&quot;')})">✅ Importar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    confirmImport(numbers) {
        const textarea = document.getElementById('sp_numbers');
        if (textarea) {
            textarea.value = numbers.join('\n');
            
            // Trigger update
            const event = new Event('input', { bubbles: true });
            textarea.dispatchEvent(event);
        }
        
        // Close modal
        document.querySelector('.import-preview-modal')?.remove();
        
        // Show success
        const hint = document.getElementById('sp_csv_hint');
        this.showStatus(hint, `✅ ${numbers.length} contatos importados!`, 'success');
    }
    
    // ========================================
    // UTILITIES
    // ========================================
    
    async loadAllData() {
        await this.loadTemplates();
        this.updateAntiBanUI();
        await this.loadSchedules();
    }
    
    showStatus(element, message, type) {
        if (!element) return;
        
        element.textContent = message;
        element.className = 'sp-status';
        
        if (type === 'success') element.style.color = '#00D26A';
        else if (type === 'error') element.style.color = '#e74c3c';
        else if (type === 'info') element.style.color = '#3498db';
        
        setTimeout(() => {
            element.textContent = '';
            element.style.color = '';
        }, 5000);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize when DOM is ready
let advancedFeatures = null;

window.addEventListener('load', () => {
    setTimeout(() => {
        advancedFeatures = new AdvancedFeaturesController();
        window.advancedFeatures = advancedFeatures;
        console.log('[AdvancedFeatures] 🚀 Controller initialized');
    }, 1000); // Wait for other scripts to load
});
