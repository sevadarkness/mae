/**
 * scheduler.js - Sistema de Agendamento de Campanhas
 * 
 * Permite agendar múltiplas campanhas para execução automática
 * em horários específicos usando chrome.alarms API
 */

class SchedulerManager {
  constructor() {
    this.scheduledCampaigns = [];
    this.init();
  }

  async init() {
    // Carregar agendamentos salvos do storage
    await this.loadSchedules();
    
    // Listener para alarmes
    if (chrome.alarms) {
      chrome.alarms.onAlarm.addListener((alarm) => this.handleAlarm(alarm));
    }
  }

  /**
   * Carrega agendamentos do chrome.storage
   */
  async loadSchedules() {
    try {
      const result = await chrome.storage.local.get('scheduledCampaigns');
      this.scheduledCampaigns = result.scheduledCampaigns || [];
      console.log('[Scheduler] Agendamentos carregados:', this.scheduledCampaigns.length);
    } catch (error) {
      console.error('[Scheduler] Erro ao carregar agendamentos:', error);
      this.scheduledCampaigns = [];
    }
  }

  /**
   * Salva agendamentos no chrome.storage
   */
  async saveSchedules() {
    try {
      await chrome.storage.local.set({ scheduledCampaigns: this.scheduledCampaigns });
      console.log('[Scheduler] Agendamentos salvos');
    } catch (error) {
      console.error('[Scheduler] Erro ao salvar agendamentos:', error);
    }
  }

  /**
   * Agenda uma nova campanha
   * @param {Object} campaign - Dados da campanha
   * @param {Date} scheduledTime - Data/hora do agendamento
   * @returns {Object} Resultado da operação
   */
  async scheduleCampaign(campaign, scheduledTime) {
    try {
      const now = new Date();
      const scheduleDate = new Date(scheduledTime);
      
      // Validações
      if (scheduleDate <= now) {
        return { success: false, error: 'Data/hora deve ser no futuro' };
      }

      if (!campaign.queue || campaign.queue.length === 0) {
        return { success: false, error: 'Campanha sem contatos' };
      }

      // Gerar ID único
      const scheduleId = `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Criar agendamento
      const schedule = {
        id: scheduleId,
        campaign: campaign,
        scheduledTime: scheduleDate.toISOString(),
        createdAt: now.toISOString(),
        status: 'pending',
        contactCount: campaign.queue.length
      };

      // Criar alarme no Chrome
      const delayInMinutes = (scheduleDate.getTime() - now.getTime()) / 1000 / 60;
      await chrome.alarms.create(scheduleId, {
        delayInMinutes: delayInMinutes
      });

      // Adicionar à lista
      this.scheduledCampaigns.push(schedule);
      await this.saveSchedules();

      console.log('[Scheduler] Campanha agendada:', scheduleId, 'para', scheduleDate);
      return { success: true, scheduleId, schedule };
    } catch (error) {
      console.error('[Scheduler] Erro ao agendar campanha:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Remove um agendamento
   * @param {string} scheduleId - ID do agendamento
   */
  async removeSchedule(scheduleId) {
    try {
      // Remover alarme
      await chrome.alarms.clear(scheduleId);
      
      // Remover da lista
      this.scheduledCampaigns = this.scheduledCampaigns.filter(s => s.id !== scheduleId);
      await this.saveSchedules();

      console.log('[Scheduler] Agendamento removido:', scheduleId);
      return { success: true };
    } catch (error) {
      console.error('[Scheduler] Erro ao remover agendamento:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Edita um agendamento existente
   * @param {string} scheduleId - ID do agendamento
   * @param {Date} newTime - Nova data/hora
   */
  async editSchedule(scheduleId, newTime) {
    try {
      const schedule = this.scheduledCampaigns.find(s => s.id === scheduleId);
      if (!schedule) {
        return { success: false, error: 'Agendamento não encontrado' };
      }

      const now = new Date();
      const scheduleDate = new Date(newTime);
      
      if (scheduleDate <= now) {
        return { success: false, error: 'Data/hora deve ser no futuro' };
      }

      // Remover alarme antigo
      await chrome.alarms.clear(scheduleId);

      // Criar novo alarme
      const delayInMinutes = (scheduleDate.getTime() - now.getTime()) / 1000 / 60;
      await chrome.alarms.create(scheduleId, {
        delayInMinutes: delayInMinutes
      });

      // Atualizar registro
      schedule.scheduledTime = scheduleDate.toISOString();
      await this.saveSchedules();

      console.log('[Scheduler] Agendamento editado:', scheduleId);
      return { success: true };
    } catch (error) {
      console.error('[Scheduler] Erro ao editar agendamento:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Lista todos os agendamentos
   * @returns {Array} Lista de agendamentos
   */
  getSchedules() {
    return this.scheduledCampaigns.map(s => ({
      ...s,
      timeRemaining: this.getTimeRemaining(s.scheduledTime),
      isExpired: new Date(s.scheduledTime) <= new Date()
    }));
  }

  /**
   * Obtém um agendamento específico
   * @param {string} scheduleId - ID do agendamento
   */
  getSchedule(scheduleId) {
    return this.scheduledCampaigns.find(s => s.id === scheduleId);
  }

  /**
   * Calcula tempo restante até o agendamento
   * @param {string} scheduledTime - ISO string da data agendada
   * @returns {string} Tempo formatado
   */
  getTimeRemaining(scheduledTime) {
    const now = new Date();
    const scheduled = new Date(scheduledTime);
    const diff = scheduled.getTime() - now.getTime();

    if (diff <= 0) return 'Expirado';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }

  /**
   * Handler para quando o alarme dispara
   * @param {Object} alarm - Objeto do alarme
   */
  async handleAlarm(alarm) {
    console.log('[Scheduler] Alarme disparado:', alarm.name);

    const schedule = this.scheduledCampaigns.find(s => s.id === alarm.name);
    if (!schedule) {
      console.warn('[Scheduler] Agendamento não encontrado para alarme:', alarm.name);
      return;
    }

    // Atualizar status
    schedule.status = 'executing';
    await this.saveSchedules();

    // Executar campanha
    try {
      // Enviar mensagem para o background script iniciar a campanha
      await chrome.runtime.sendMessage({
        action: 'START_SCHEDULED_CAMPAIGN',
        campaign: schedule.campaign
      });

      // Marcar como executado
      schedule.status = 'executed';
      schedule.executedAt = new Date().toISOString();
      await this.saveSchedules();

      // Notificar usuário
      if (chrome.notifications) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: chrome.runtime.getURL('icons/48.png'),
          title: 'Campanha Agendada Iniciada',
          message: `Campanha com ${schedule.contactCount} contatos foi iniciada.`
        });
      }

      console.log('[Scheduler] Campanha executada:', schedule.id);
    } catch (error) {
      console.error('[Scheduler] Erro ao executar campanha:', error);
      schedule.status = 'failed';
      schedule.error = error.message;
      await this.saveSchedules();
    }
  }

  /**
   * Limpa agendamentos expirados/executados
   */
  async cleanupOldSchedules() {
    const now = new Date();
    const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 dias atrás

    const before = this.scheduledCampaigns.length;
    this.scheduledCampaigns = this.scheduledCampaigns.filter(s => {
      const scheduleDate = new Date(s.scheduledTime);
      // Manter agendamentos pendentes ou recentes
      return s.status === 'pending' || scheduleDate > cutoff;
    });

    if (this.scheduledCampaigns.length !== before) {
      await this.saveSchedules();
      console.log('[Scheduler] Limpeza realizada:', before - this.scheduledCampaigns.length, 'agendamentos removidos');
    }
  }
}

// Instância global
window.schedulerManager = window.schedulerManager || new SchedulerManager();
