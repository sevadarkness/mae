/**
 * Anti-Ban Intelligent System
 * Prevents WhatsApp from detecting automated behavior
 */

class AntiBanSystem {
    constructor() {
        this.dailyLimit = 200; // configurável
        this.sentToday = 0;
        this.warningThreshold = 0.8; // 80%
        this.suspiciousPatterns = {
            rapidFire: 5, // mensagens em menos de 30s
            sameMessage: 10, // mesma mensagem para muitos contatos seguidos
        };
        this.lastMessageTime = null;
        this.recentMessages = [];
        this.messageHistory = [];
        this.lastResetDate = new Date().toDateString();
        
        // Load saved state
        this.loadState();
    }
    
    /**
     * Load state from storage
     */
    async loadState() {
        try {
            const data = await chrome.storage.local.get(['antiBanState']);
            if (data.antiBanState) {
                const state = data.antiBanState;
                this.sentToday = state.sentToday || 0;
                this.dailyLimit = state.dailyLimit || 200;
                this.lastResetDate = state.lastResetDate || new Date().toDateString();
                
                // Reset if it's a new day
                const today = new Date().toDateString();
                if (this.lastResetDate !== today) {
                    this.sentToday = 0;
                    this.lastResetDate = today;
                    await this.saveState();
                }
            }
        } catch (error) {
            console.error('[AntiBan] Error loading state:', error);
        }
    }
    
    /**
     * Save state to storage
     */
    async saveState() {
        try {
            await chrome.storage.local.set({
                antiBanState: {
                    sentToday: this.sentToday,
                    dailyLimit: this.dailyLimit,
                    lastResetDate: this.lastResetDate
                }
            });
        } catch (error) {
            console.error('[AntiBan] Error saving state:', error);
        }
    }
    
    /**
     * Calculate smart delay with Gaussian distribution
     */
    calculateSmartDelay(baseMin, baseMax) {
        // Variação gaussiana em vez de linear
        const gaussian = () => {
            let u = 0, v = 0;
            while (u === 0) u = Math.random();
            while (v === 0) v = Math.random();
            return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
        };
        
        const mean = (baseMin + baseMax) / 2;
        const stdDev = (baseMax - baseMin) / 4;
        let delay = mean + gaussian() * stdDev;
        
        // Adicionar micro-variações humanas
        delay += (Math.random() - 0.5) * 2; // ±1 segundo
        
        // Ocasionalmente pausas mais longas (simula distração)
        if (Math.random() < 0.1) {
            delay += Math.random() * 10; // pausa extra de até 10s
        }
        
        return Math.max(baseMin, Math.min(baseMax * 1.5, delay));
    }
    
    /**
     * Check for suspicious activity patterns
     */
    checkSuspiciousActivity() {
        const now = Date.now();
        
        // Check rapid fire (too many messages in short time)
        if (this.lastMessageTime && (now - this.lastMessageTime) < 30000) {
            this.recentMessages.push(now);
            
            // Keep only messages from last 30 seconds
            this.recentMessages = this.recentMessages.filter(t => (now - t) < 30000);
            
            if (this.recentMessages.length >= this.suspiciousPatterns.rapidFire) {
                return {
                    warning: true,
                    type: 'rapid_fire',
                    message: 'Detectado envio muito rápido. Recomendado pausar.'
                };
            }
        }
        
        // Check if same message is being sent too many times
        if (this.messageHistory.length >= this.suspiciousPatterns.sameMessage) {
            const lastMessages = this.messageHistory.slice(-this.suspiciousPatterns.sameMessage);
            const uniqueMessages = new Set(lastMessages);
            
            if (uniqueMessages.size === 1) {
                return {
                    warning: true,
                    type: 'same_message',
                    message: 'Mesma mensagem enviada muitas vezes. Considere variar o conteúdo.'
                };
            }
        }
        
        return { warning: false };
    }
    
    /**
     * Check if within business hours
     */
    isWithinBusinessHours() {
        const hour = new Date().getHours();
        return hour >= 8 && hour <= 20;
    }
    
    /**
     * Check if daily limit was reached
     */
    hasReachedDailyLimit() {
        return this.sentToday >= this.dailyLimit;
    }
    
    /**
     * Check if approaching daily limit
     */
    isApproachingDailyLimit() {
        return this.sentToday >= (this.dailyLimit * this.warningThreshold);
    }
    
    /**
     * Increment sent counter
     */
    async incrementSent(message = '') {
        this.sentToday++;
        this.lastMessageTime = Date.now();
        
        // Track message for pattern detection
        if (message) {
            this.messageHistory.push(message);
            // Keep only last 50 messages
            if (this.messageHistory.length > 50) {
                this.messageHistory.shift();
            }
        }
        
        await this.saveState();
    }
    
    /**
     * Reset daily counter (for testing or manual reset)
     */
    async resetDaily() {
        this.sentToday = 0;
        this.lastResetDate = new Date().toDateString();
        await this.saveState();
    }
    
    /**
     * Update daily limit
     */
    async updateDailyLimit(newLimit) {
        this.dailyLimit = Math.max(1, Math.min(1000, newLimit));
        await this.saveState();
    }
    
    /**
     * Get current status
     */
    getStatus() {
        return {
            sentToday: this.sentToday,
            dailyLimit: this.dailyLimit,
            percentage: Math.round((this.sentToday / this.dailyLimit) * 100),
            remaining: Math.max(0, this.dailyLimit - this.sentToday),
            isApproachingLimit: this.isApproachingDailyLimit(),
            hasReachedLimit: this.hasReachedDailyLimit(),
            isBusinessHours: this.isWithinBusinessHours()
        };
    }
}

// Make it globally available
if (typeof window !== 'undefined') {
    window.AntiBanSystem = AntiBanSystem;
}
