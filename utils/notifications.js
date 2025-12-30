/**
 * notifications.js - Sistema de Notificações Desktop
 * 
 * Implementa notificações desktop com sons gerados por Web Audio API
 * (sem necessidade de arquivos externos)
 */

class NotificationSystem {
  constructor() {
    this.enabled = true;
    this.soundEnabled = true;
    this.audioContext = null;
    this.init();
  }

  async init() {
    // Carregar configurações
    await this.loadSettings();
    
    // Inicializar AudioContext quando necessário (lazy loading)
    // Não inicializar aqui para evitar avisos do navegador
  }

  /**
   * Carrega configurações do storage
   */
  async loadSettings() {
    try {
      const result = await chrome.storage.local.get([
        'notifications_enabled',
        'notifications_sound'
      ]);

      this.enabled = result.notifications_enabled !== false; // Habilitado por padrão
      this.soundEnabled = result.notifications_sound !== false; // Habilitado por padrão

      console.log('[Notifications] Configurações carregadas:', {
        enabled: this.enabled,
        soundEnabled: this.soundEnabled
      });
    } catch (error) {
      console.error('[Notifications] Erro ao carregar configurações:', error);
    }
  }

  /**
   * Salva configurações no storage
   */
  async saveSettings() {
    try {
      await chrome.storage.local.set({
        notifications_enabled: this.enabled,
        notifications_sound: this.soundEnabled
      });
    } catch (error) {
      console.error('[Notifications] Erro ao salvar configurações:', error);
    }
  }

  /**
   * Inicializa AudioContext (lazy loading)
   */
  initAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  /**
   * Gera som de sucesso (bip agradável)
   */
  playSuccessSound() {
    if (!this.soundEnabled) return;

    try {
      this.initAudioContext();
      const ctx = this.audioContext;
      
      // Criar oscilador
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      // Tom de sucesso (C5 -> E5)
      oscillator.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      oscillator.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
      
      // Envelope
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      
      oscillator.type = 'sine';
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.2);
    } catch (error) {
      console.error('[Notifications] Erro ao reproduzir som de sucesso:', error);
    }
  }

  /**
   * Gera som de erro (bip baixo)
   */
  playErrorSound() {
    if (!this.soundEnabled) return;

    try {
      this.initAudioContext();
      const ctx = this.audioContext;
      
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      // Tom de erro (G3 -> D3)
      oscillator.frequency.setValueAtTime(196.00, ctx.currentTime); // G3
      oscillator.frequency.setValueAtTime(146.83, ctx.currentTime + 0.15); // D3
      
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      
      oscillator.type = 'triangle';
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);
    } catch (error) {
      console.error('[Notifications] Erro ao reproduzir som de erro:', error);
    }
  }

  /**
   * Gera som de alerta (bip médio)
   */
  playAlertSound() {
    if (!this.soundEnabled) return;

    try {
      this.initAudioContext();
      const ctx = this.audioContext;
      
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      // Tom de alerta (A4)
      oscillator.frequency.setValueAtTime(440.00, ctx.currentTime); // A4
      
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      
      oscillator.type = 'square';
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.25);
    } catch (error) {
      console.error('[Notifications] Erro ao reproduzir som de alerta:', error);
    }
  }

  /**
   * Gera som de conclusão (melodia)
   */
  playCompleteSound() {
    if (!this.soundEnabled) return;

    try {
      this.initAudioContext();
      const ctx = this.audioContext;
      
      // Melodia de conclusão: C5 -> E5 -> G5
      const notes = [
        { freq: 523.25, start: 0, duration: 0.15 },    // C5
        { freq: 659.25, start: 0.15, duration: 0.15 }, // E5
        { freq: 783.99, start: 0.30, duration: 0.3 }   // G5
      ];

      notes.forEach(note => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.frequency.setValueAtTime(note.freq, ctx.currentTime + note.start);
        
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime + note.start);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + note.start + note.duration);
        
        oscillator.type = 'sine';
        oscillator.start(ctx.currentTime + note.start);
        oscillator.stop(ctx.currentTime + note.start + note.duration);
      });
    } catch (error) {
      console.error('[Notifications] Erro ao reproduzir som de conclusão:', error);
    }
  }

  /**
   * Mostra notificação desktop
   * @param {Object} options - Opções da notificação
   */
  async show(options) {
    if (!this.enabled) {
      console.log('[Notifications] Notificações desabilitadas');
      return;
    }

    try {
      // Verificar permissão
      if (!chrome.notifications) {
        console.warn('[Notifications] API de notificações não disponível');
        return;
      }

      const notificationOptions = {
        type: options.type || 'basic',
        iconUrl: options.iconUrl || chrome.runtime.getURL('icons/48.png'),
        title: options.title || 'WhatsHybrid',
        message: options.message || '',
        priority: options.priority || 1,
        ...options
      };

      // Criar notificação
      const notificationId = await chrome.notifications.create('', notificationOptions);
      
      console.log('[Notifications] Notificação exibida:', notificationId);

      // Reproduzir som se habilitado
      if (this.soundEnabled && options.sound) {
        this.playSound(options.sound);
      }

      // Auto-fechar após alguns segundos
      if (options.autoClose !== false) {
        setTimeout(() => {
          chrome.notifications.clear(notificationId);
        }, options.duration || 5000);
      }

      return notificationId;
    } catch (error) {
      console.error('[Notifications] Erro ao exibir notificação:', error);
    }
  }

  /**
   * Reproduz som específico
   * @param {string} soundType - Tipo de som: success, error, alert, complete
   */
  playSound(soundType) {
    switch (soundType) {
      case 'success':
        this.playSuccessSound();
        break;
      case 'error':
        this.playErrorSound();
        break;
      case 'alert':
        this.playAlertSound();
        break;
      case 'complete':
        this.playCompleteSound();
        break;
      default:
        this.playAlertSound();
    }
  }

  /**
   * Notifica campanha concluída
   * @param {Object} stats - Estatísticas da campanha
   */
  async notifyCampaignComplete(stats) {
    await this.show({
      title: '🎉 Campanha Concluída!',
      message: `✅ ${stats.sent || 0} enviadas\n❌ ${stats.failed || 0} falhas`,
      sound: 'complete',
      priority: 2
    });
  }

  /**
   * Notifica erro
   * @param {string} message - Mensagem de erro
   */
  async notifyError(message) {
    await this.show({
      title: '❌ Erro',
      message: message,
      sound: 'error',
      priority: 2
    });
  }

  /**
   * Notifica limite diário
   */
  async notifyDailyLimit() {
    await this.show({
      title: '⚠️ Limite Diário Atingido',
      message: 'Você atingiu o limite diário de mensagens. Tente novamente amanhã.',
      sound: 'alert',
      priority: 2
    });
  }

  /**
   * Notifica campanha agendada
   * @param {Object} schedule - Informações do agendamento
   */
  async notifyScheduled(schedule) {
    await this.show({
      title: '⏰ Campanha Agendada',
      message: `${schedule.contactCount} contatos\nInício: ${new Date(schedule.scheduledTime).toLocaleString()}`,
      sound: 'success'
    });
  }

  /**
   * Notifica alerta de limite próximo
   * @param {number} percentage - Porcentagem do limite
   */
  async notifyLimitWarning(percentage) {
    await this.show({
      title: '⚠️ Atenção: Próximo do Limite',
      message: `Você atingiu ${percentage}% do limite diário de mensagens.`,
      sound: 'alert'
    });
  }

  /**
   * Atualiza configurações
   * @param {Object} settings - Novas configurações
   */
  async updateSettings(settings) {
    if (typeof settings.enabled === 'boolean') {
      this.enabled = settings.enabled;
    }
    
    if (typeof settings.soundEnabled === 'boolean') {
      this.soundEnabled = settings.soundEnabled;
    }

    await this.saveSettings();
    console.log('[Notifications] Configurações atualizadas');
  }

  /**
   * Testa notificação (para UI de configurações)
   */
  async test() {
    await this.show({
      title: '🔔 Teste de Notificação',
      message: 'Se você vê isso, as notificações estão funcionando! 🎉',
      sound: 'success',
      duration: 3000
    });
  }

  /**
   * Obtém configurações atuais
   * @returns {Object}
   */
  getSettings() {
    return {
      enabled: this.enabled,
      soundEnabled: this.soundEnabled
    };
  }
}

// Instância global
window.notificationSystem = window.notificationSystem || new NotificationSystem();
