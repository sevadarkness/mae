/**
 * anti-ban.js - Sistema Anti-Ban Inteligente
 * 
 * Implementa delays com variação gaussiana, limite diário de mensagens,
 * horário comercial opcional e pausas aleatórias para simular comportamento humano
 */

class AntiBanSystem {
  constructor() {
    this.dailyLimit = 200; // Limite padrão
    this.businessHoursOnly = false;
    this.messagesSentToday = 0;
    this.lastResetDate = null;
    this.enabled = true;
    this.init();
  }

  async init() {
    // Carregar configurações do storage
    await this.loadSettings();
    
    // Resetar contadores diariamente
    this.checkDailyReset();
  }

  /**
   * Carrega configurações do storage
   */
  async loadSettings() {
    try {
      const result = await chrome.storage.local.get([
        'antiBan_dailyLimit',
        'antiBan_businessHours',
        'antiBan_messagesSent',
        'antiBan_lastReset',
        'antiBan_enabled'
      ]);

      this.dailyLimit = result.antiBan_dailyLimit || 200;
      this.businessHoursOnly = result.antiBan_businessHours || false;
      this.messagesSentToday = result.antiBan_messagesSent || 0;
      this.lastResetDate = result.antiBan_lastReset || new Date().toDateString();
      this.enabled = result.antiBan_enabled !== false; // Habilitado por padrão

      console.log('[AntiBan] Configurações carregadas:', {
        dailyLimit: this.dailyLimit,
        businessHours: this.businessHoursOnly,
        messagesSent: this.messagesSentToday,
        enabled: this.enabled
      });
    } catch (error) {
      console.error('[AntiBan] Erro ao carregar configurações:', error);
    }
  }

  /**
   * Salva configurações no storage
   */
  async saveSettings() {
    try {
      await chrome.storage.local.set({
        antiBan_dailyLimit: this.dailyLimit,
        antiBan_businessHours: this.businessHoursOnly,
        antiBan_messagesSent: this.messagesSentToday,
        antiBan_lastReset: this.lastResetDate,
        antiBan_enabled: this.enabled
      });
    } catch (error) {
      console.error('[AntiBan] Erro ao salvar configurações:', error);
    }
  }

  /**
   * Verifica se precisa resetar contadores (novo dia)
   */
  checkDailyReset() {
    const today = new Date().toDateString();
    if (this.lastResetDate !== today) {
      console.log('[AntiBan] Resetando contadores diários');
      this.messagesSentToday = 0;
      this.lastResetDate = today;
      this.saveSettings();
    }
  }

  /**
   * Gera delay com distribuição gaussiana (mais humano)
   * @param {number} min - Delay mínimo em ms
   * @param {number} max - Delay máximo em ms
   * @returns {number} Delay em ms
   */
  getGaussianDelay(min, max) {
    // Box-Muller transform para distribuição normal
    const u1 = Math.random() || Number.MIN_VALUE; // Evita Math.log(0)
    const u2 = Math.random();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    
    // Normalizar para a faixa [min, max]
    const mean = (min + max) / 2;
    const stdDev = (max - min) / 6; // 99.7% dos valores caem dentro de ±3σ
    
    let delay = mean + z0 * stdDev;
    
    // Garantir que está dentro dos limites
    delay = Math.max(min, Math.min(max, delay));
    
    return Math.round(delay);
  }

  /**
   * Adiciona variação extra aleatória (micro-pausas humanas)
   * @param {number} baseDelay - Delay base em ms
   * @returns {number} Delay com variação
   */
  addHumanVariation(baseDelay) {
    // 20% de chance de adicionar uma pausa extra (0.5s a 2s)
    if (Math.random() < 0.2) {
      const extraDelay = Math.random() * 1500 + 500;
      console.log('[AntiBan] Adicionando pausa humana:', Math.round(extraDelay), 'ms');
      return baseDelay + extraDelay;
    }
    return baseDelay;
  }

  /**
   * Verifica se está dentro do horário comercial (8h-20h)
   * @returns {boolean}
   */
  isBusinessHours() {
    if (!this.businessHoursOnly) return true;
    
    const now = new Date();
    const hour = now.getHours();
    return hour >= 8 && hour < 20;
  }

  /**
   * Verifica se pode enviar mensagem (não atingiu limite)
   * @returns {Object} Resultado da verificação
   */
  canSendMessage() {
    this.checkDailyReset();

    if (!this.enabled) {
      return { allowed: true, reason: 'Anti-ban desabilitado' };
    }

    // Verificar horário comercial
    if (!this.isBusinessHours()) {
      return {
        allowed: false,
        reason: 'Fora do horário comercial (8h-20h)',
        nextAllowedTime: this.getNextBusinessHour()
      };
    }

    // Verificar limite diário
    if (this.messagesSentToday >= this.dailyLimit) {
      return {
        allowed: false,
        reason: 'Limite diário atingido',
        messagesSent: this.messagesSentToday,
        dailyLimit: this.dailyLimit,
        nextAllowedTime: this.getNextDayTime()
      };
    }

    const remaining = this.dailyLimit - this.messagesSentToday;
    const percentage = (this.messagesSentToday / this.dailyLimit) * 100;

    return {
      allowed: true,
      messagesSent: this.messagesSentToday,
      remaining: remaining,
      percentage: Math.round(percentage)
    };
  }

  /**
   * Registra envio de mensagem
   */
  async recordMessage() {
    if (!this.enabled) return;
    
    this.messagesSentToday++;
    await this.saveSettings();
    
    // Alerta quando próximo do limite
    const percentage = (this.messagesSentToday / this.dailyLimit) * 100;
    if (percentage >= 80 && percentage < 85) {
      console.warn('[AntiBan] ⚠️ Atenção: 80% do limite diário atingido');
    } else if (percentage >= 90 && percentage < 95) {
      console.warn('[AntiBan] ⚠️ Atenção: 90% do limite diário atingido');
    } else if (percentage >= 95) {
      console.warn('[AntiBan] ⚠️ ATENÇÃO: 95%+ do limite diário atingido!');
    }
  }

  /**
   * Calcula próximo horário comercial
   * @returns {Date}
   */
  getNextBusinessHour() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);
    return tomorrow;
  }

  /**
   * Calcula horário do próximo dia
   * @returns {Date}
   */
  getNextDayTime() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);
    return tomorrow;
  }

  /**
   * Obtém estatísticas de uso
   * @returns {Object}
   */
  getStats() {
    this.checkDailyReset();
    
    const percentage = this.dailyLimit > 0 
      ? Math.round((this.messagesSentToday / this.dailyLimit) * 100) 
      : 0;

    return {
      enabled: this.enabled,
      messagesSentToday: this.messagesSentToday,
      dailyLimit: this.dailyLimit,
      remaining: Math.max(0, this.dailyLimit - this.messagesSentToday),
      percentage: percentage,
      businessHoursOnly: this.businessHoursOnly,
      isBusinessHours: this.isBusinessHours(),
      lastReset: this.lastResetDate
    };
  }

  /**
   * Atualiza configurações
   * @param {Object} settings - Novas configurações
   */
  async updateSettings(settings) {
    if (typeof settings.dailyLimit === 'number' && settings.dailyLimit > 0) {
      this.dailyLimit = settings.dailyLimit;
    }
    
    if (typeof settings.businessHoursOnly === 'boolean') {
      this.businessHoursOnly = settings.businessHoursOnly;
    }

    if (typeof settings.enabled === 'boolean') {
      this.enabled = settings.enabled;
    }

    await this.saveSettings();
    console.log('[AntiBan] Configurações atualizadas:', this.getStats());
  }

  /**
   * Reseta contadores manualmente
   */
  async resetCounters() {
    this.messagesSentToday = 0;
    this.lastResetDate = new Date().toDateString();
    await this.saveSettings();
    console.log('[AntiBan] Contadores resetados');
  }

  /**
   * Calcula delay inteligente baseado no progresso
   * @param {number} minDelay - Delay mínimo (ms)
   * @param {number} maxDelay - Delay máximo (ms)
   * @returns {number} Delay calculado (ms)
   */
  getSmartDelay(minDelay, maxDelay) {
    if (!this.enabled) {
      // Se desabilitado, usa delay simples
      return Math.random() * (maxDelay - minDelay) + minDelay;
    }

    // Usar distribuição gaussiana
    let delay = this.getGaussianDelay(minDelay, maxDelay);
    
    // Adicionar variação humana
    delay = this.addHumanVariation(delay);
    
    // Se próximo do limite, aumentar delays
    const percentage = (this.messagesSentToday / this.dailyLimit) * 100;
    if (percentage > 70) {
      const multiplier = 1 + ((percentage - 70) / 100); // 1.0 a 1.3x
      delay *= multiplier;
      console.log('[AntiBan] Delay aumentado (próximo do limite):', Math.round(delay), 'ms');
    }
    
    return Math.round(delay);
  }
}

// Instância global
window.antiBanSystem = window.antiBanSystem || new AntiBanSystem();
