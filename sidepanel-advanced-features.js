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
            this.showStatus(status, '❌ Configure uma campanha primeiro (números + mensagem)', 'error');
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
