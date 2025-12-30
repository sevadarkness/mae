/**
 * Desktop Notifications System
 * Manages desktop notifications and sound alerts
 */

class NotificationSystem {
    constructor() {
        this.soundEnabled = true;
        this.notificationsEnabled = true;
        this.volume = 0.5;
        
        // Load settings
        this.loadSettings();
    }
    
    /**
     * Load settings from storage
     */
    async loadSettings() {
        try {
            const data = await chrome.storage.local.get(['notificationSettings']);
            if (data.notificationSettings) {
                this.soundEnabled = data.notificationSettings.soundEnabled !== false;
                this.notificationsEnabled = data.notificationSettings.notificationsEnabled !== false;
                this.volume = data.notificationSettings.volume || 0.5;
            }
        } catch (error) {
            console.error('[Notifications] Error loading settings:', error);
        }
    }
    
    /**
     * Save settings to storage
     */
    async saveSettings() {
        try {
            await chrome.storage.local.set({
                notificationSettings: {
                    soundEnabled: this.soundEnabled,
                    notificationsEnabled: this.notificationsEnabled,
                    volume: this.volume
                }
            });
        } catch (error) {
            console.error('[Notifications] Error saving settings:', error);
        }
    }
    
    /**
     * Request notification permission
     */
    static async requestPermission() {
        if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
            try {
                await Notification.requestPermission();
            } catch (error) {
                console.error('[Notifications] Error requesting permission:', error);
            }
        }
    }
    
    /**
     * Show notification
     */
    async notify(title, body, options = {}) {
        if (!this.notificationsEnabled) return null;
        
        try {
            // Use chrome.notifications API for better compatibility
            const notificationId = `whl_${Date.now()}`;
            
            await chrome.notifications.create(notificationId, {
                type: 'basic',
                iconUrl: chrome.runtime.getURL('icons/128.png'),
                title: title,
                message: body,
                silent: !this.soundEnabled || !options.sound,
                priority: options.priority || 1
            });
            
            // Auto-close after 5 seconds
            setTimeout(() => {
                chrome.notifications.clear(notificationId);
            }, 5000);
            
            // Play sound if enabled
            if (this.soundEnabled && options.sound) {
                this.playSound(options.soundType || 'success');
            }
            
            return notificationId;
        } catch (error) {
            console.error('[Notifications] Error showing notification:', error);
            return null;
        }
    }
    
    /**
     * Play sound using Web Audio API
     */
    playSound(type) {
        if (!this.soundEnabled) return;
        
        try {
            // Create AudioContext
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create oscillator for simple beep sounds
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Set volume
            gainNode.gain.value = this.volume;
            
            // Different frequencies for different types
            const frequencies = {
                success: [523.25, 659.25, 783.99], // C, E, G (major chord)
                error: [440, 392, 349.23],          // A, G, F (descending)
                warning: [523.25, 493.88]           // C, B (alert)
            };
            
            const freqs = frequencies[type] || frequencies.success;
            
            // Play sequence
            let time = audioContext.currentTime;
            freqs.forEach((freq, index) => {
                const osc = audioContext.createOscillator();
                const gain = audioContext.createGain();
                
                osc.connect(gain);
                gain.connect(audioContext.destination);
                
                osc.frequency.value = freq;
                osc.type = 'sine';
                gain.gain.value = this.volume * 0.3;
                
                const startTime = time + (index * 0.15);
                const duration = 0.1;
                
                osc.start(startTime);
                osc.stop(startTime + duration);
            });
            
        } catch (error) {
            console.error('[Notifications] Error playing sound:', error);
        }
    }
    
    /**
     * Campaign complete notification
     */
    campaignComplete(sent, failed) {
        return this.notify(
            '✅ Campanha Concluída!',
            `Enviadas: ${sent} | Falhas: ${failed}`,
            { sound: true, soundType: 'success' }
        );
    }
    
    /**
     * Campaign error notification
     */
    campaignError(error) {
        return this.notify(
            '❌ Erro na Campanha',
            error,
            { sound: true, soundType: 'error', priority: 2 }
        );
    }
    
    /**
     * Daily limit warning notification
     */
    dailyLimitWarning(current, limit) {
        return this.notify(
            '⚠️ Limite Diário',
            `Você atingiu ${current}/${limit} mensagens hoje`,
            { sound: true, soundType: 'warning', priority: 1 }
        );
    }
    
    /**
     * Scheduled campaign notification
     */
    scheduledCampaignReady(campaignName) {
        return this.notify(
            '📅 Campanha Agendada',
            `Iniciando campanha: ${campaignName}`,
            { sound: true, soundType: 'success' }
        );
    }
    
    /**
     * Update settings
     */
    async updateSettings(settings) {
        if (settings.soundEnabled !== undefined) {
            this.soundEnabled = settings.soundEnabled;
        }
        if (settings.notificationsEnabled !== undefined) {
            this.notificationsEnabled = settings.notificationsEnabled;
        }
        if (settings.volume !== undefined) {
            this.volume = Math.max(0, Math.min(1, settings.volume));
        }
        
        await this.saveSettings();
    }
}

// Make it globally available
if (typeof window !== 'undefined') {
    window.NotificationSystem = NotificationSystem;
}
