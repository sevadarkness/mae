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
        this.btnForceRefresh = document.getElementById('btnForceRefresh');
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
        this.btnForceRefresh?.addEventListener('click', () => this.loadGroups(true));
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

            // Tentar usar cache se não for refresh forçado
            if (!forceRefresh && window.groupCache) {
                const cached = await window.groupCache.get();
                if (cached && cached.groups) {
                    this.groups = cached.groups;
                    this.stats = cached.stats || this.calculateStats(cached.groups);
                    console.log('[SidePanel] ✅ Grupos do cache:', this.stats, '(idade:', cached.ageSeconds, 's)');

                    // Mostrar indicador de cache
                    const cacheInfo = await window.groupCache.getInfo();
                    const remaining = await window.groupCache.getTimeRemaining();
                    this.showStatus(`📦 Grupos do cache (válido por ${remaining})`, 100);
                    
                    // Show force refresh button
                    if (this.btnForceRefresh) {
                        this.btnForceRefresh.style.display = 'block';
                    }
                    
                    setTimeout(() => {
                        this.updateStats();
                        this.setFilter('all');
                        this.goToStep(2);
                        this.setLoading(this.btnLoadGroups, false);
                        this.hideStatus();
                    }, 800);
                    return;
                }
            }

            // Hide force refresh button when loading fresh
            if (this.btnForceRefresh) {
                this.btnForceRefresh.style.display = 'none';
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
                this.stats = response.stats || this.calculateStats(response.groups);

                // Salvar no cache
                if (window.groupCache) {
                    await window.groupCache.save(this.groups, this.stats);
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

    /**
     * Calcula estatísticas dos grupos
     */
    calculateStats(groups) {
        return {
            total: groups.length,
            archived: groups.filter(g => g.isArchived).length,
            active: groups.filter(g => !g.isArchived).length
        };
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