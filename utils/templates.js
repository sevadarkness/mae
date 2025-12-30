/**
 * Message Templates Manager
 * Manages reusable message templates with dynamic variables
 */

class TemplateManager {
    constructor() {
        this.templates = [];
        this.categories = ['geral', 'vendas', 'suporte', 'marketing'];
        this.storageKey = 'whl_message_templates';
        
        // Load templates from storage
        this.loadTemplates();
    }
    
    /**
     * Load templates from storage
     */
    async loadTemplates() {
        try {
            const data = await chrome.storage.local.get([this.storageKey]);
            if (data[this.storageKey]) {
                this.templates = data[this.storageKey];
            }
        } catch (error) {
            console.error('[Templates] Error loading templates:', error);
        }
    }
    
    /**
     * Save templates to storage
     */
    async saveTemplates() {
        try {
            await chrome.storage.local.set({
                [this.storageKey]: this.templates
            });
        } catch (error) {
            console.error('[Templates] Error saving templates:', error);
        }
    }
    
    /**
     * Add a new template
     */
    async addTemplate(name, category, content) {
        const template = {
            id: Date.now().toString(),
            name: name,
            category: category || 'geral',
            content: content,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        this.templates.push(template);
        await this.saveTemplates();
        return template;
    }
    
    /**
     * Update an existing template
     */
    async updateTemplate(id, updates) {
        const index = this.templates.findIndex(t => t.id === id);
        if (index !== -1) {
            this.templates[index] = {
                ...this.templates[index],
                ...updates,
                updatedAt: new Date().toISOString()
            };
            await this.saveTemplates();
            return this.templates[index];
        }
        return null;
    }
    
    /**
     * Delete a template
     */
    async deleteTemplate(id) {
        const index = this.templates.findIndex(t => t.id === id);
        if (index !== -1) {
            this.templates.splice(index, 1);
            await this.saveTemplates();
            return true;
        }
        return false;
    }
    
    /**
     * Get all templates
     */
    getTemplates(category = null) {
        if (category && category !== 'all') {
            return this.templates.filter(t => t.category === category);
        }
        return this.templates;
    }
    
    /**
     * Get a specific template by ID
     */
    getTemplateById(id) {
        return this.templates.find(t => t.id === id);
    }
    
    /**
     * Replace variables in message
     */
    replaceVariables(message, contact = {}) {
        const now = new Date();
        
        return message
            .replace(/{nome}/g, contact.name || '')
            .replace(/{empresa}/g, contact.company || '')
            .replace(/{data}/g, now.toLocaleDateString('pt-BR'))
            .replace(/{hora}/g, now.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'}));
    }
    
    /**
     * Get available variables
     */
    getAvailableVariables() {
        return [
            { name: '{nome}', description: 'Nome do contato' },
            { name: '{empresa}', description: 'Empresa do contato' },
            { name: '{data}', description: 'Data atual (DD/MM/AAAA)' },
            { name: '{hora}', description: 'Hora atual (HH:MM)' }
        ];
    }
    
    /**
     * Export templates as JSON
     */
    exportTemplates() {
        return JSON.stringify(this.templates, null, 2);
    }
    
    /**
     * Import templates from JSON
     */
    async importTemplates(jsonString, merge = false) {
        try {
            const importedTemplates = JSON.parse(jsonString);
            
            if (!Array.isArray(importedTemplates)) {
                throw new Error('Invalid format: expected array');
            }
            
            if (merge) {
                // Merge with existing, avoiding duplicates by name
                const existingNames = new Set(this.templates.map(t => t.name));
                const newTemplates = importedTemplates.filter(t => !existingNames.has(t.name));
                this.templates = [...this.templates, ...newTemplates];
            } else {
                // Replace all templates
                this.templates = importedTemplates;
            }
            
            await this.saveTemplates();
            return true;
        } catch (error) {
            console.error('[Templates] Error importing templates:', error);
            return false;
        }
    }
    
    /**
     * Search templates by name or content
     */
    searchTemplates(query) {
        const lowerQuery = query.toLowerCase();
        return this.templates.filter(t => 
            t.name.toLowerCase().includes(lowerQuery) ||
            t.content.toLowerCase().includes(lowerQuery)
        );
    }
}

// Make it globally available
if (typeof window !== 'undefined') {
    window.TemplateManager = TemplateManager;
}
