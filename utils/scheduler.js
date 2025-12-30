/**
 * scheduler.js - Sistema de Agendamento de Campanhas
 * 
 * Permite agendar múltiplas campanhas para serem executadas automaticamente
 * em horários específicos usando a chrome.alarms API.
 */

class SchedulerManager {
  constructor() {
    this.STORAGE_KEY = 'whl_schedules';
    this.schedules = [];
    this.init();
  }

  async init() {
    try {
      await this.loadSchedules();
      console.log('[Scheduler] Inicializado com', this.schedules.length, 'agendamentos');
    } catch (error) {
      console.error('[Scheduler] Erro na inicialização:', error);
    }
  }

  /**
   * Carrega agendamentos do storage
   */
  async loadSchedules() {
    try {
      const data = await chrome.storage.local.get(this.STORAGE_KEY);
      this.schedules = data[this.STORAGE_KEY] || [];
      
      // Limpar agendamentos antigos (mais de 30 dias)
      const now = Date.now();
      this.schedules = this.schedules.filter(s => {
        const scheduledTime = new Date(s.scheduledTime).getTime();
        return scheduledTime > now - (30 * 24 * 60 * 60 * 1000);
      });
      
      await this.saveSchedules();
      return this.schedules;
    } catch (error) {
      console.error('[Scheduler] Erro ao carregar agendamentos:', error);
      return [];
    }
  }

  /**
   * Salva agendamentos no storage
   */
  async saveSchedules() {
    try {
      await chrome.storage.local.set({
        [this.STORAGE_KEY]: this.schedules
      });
    } catch (error) {
      console.error('[Scheduler] Erro ao salvar agendamentos:', error);
      throw error;
    }
  }

  /**
   * Cria um novo agendamento
   */
  async createSchedule(schedule) {
    try {
      // Validar dados
      if (!schedule.name || !schedule.scheduledTime) {
        throw new Error('Nome e horário são obrigatórios');
      }

      const scheduledTime = new Date(schedule.scheduledTime);
      const now = new Date();

      if (scheduledTime <= now) {
        throw new Error('O horário deve ser no futuro');
      }

      // Criar agendamento
      const newSchedule = {
        id: Date.now().toString(),
        name: schedule.name,
        scheduledTime: schedule.scheduledTime,
        status: 'pending',
        queue: schedule.queue || [],
        config: schedule.config || {},
        createdAt: new Date().toISOString()
      };

      this.schedules.push(newSchedule);
      await this.saveSchedules();

      // Criar alarm no Chrome
      const alarmName = `whl_schedule_${newSchedule.id}`;
      await chrome.alarms.create(alarmName, {
        when: scheduledTime.getTime()
      });

      console.log('[Scheduler] Agendamento criado:', newSchedule.id);
      return newSchedule;
    } catch (error) {
      console.error('[Scheduler] Erro ao criar agendamento:', error);
      throw error;
    }
  }

  /**
   * Remove um agendamento
   */
  async deleteSchedule(scheduleId) {
    try {
      const index = this.schedules.findIndex(s => s.id === scheduleId);
      
      if (index === -1) {
        throw new Error('Agendamento não encontrado');
      }

      // Remover alarm do Chrome
      const alarmName = `whl_schedule_${scheduleId}`;
      await chrome.alarms.clear(alarmName);

      // Remover do array
      this.schedules.splice(index, 1);
      await this.saveSchedules();

      console.log('[Scheduler] Agendamento removido:', scheduleId);
      return true;
    } catch (error) {
      console.error('[Scheduler] Erro ao remover agendamento:', error);
      throw error;
    }
  }

  /**
   * Obtém um agendamento por ID
   */
  getSchedule(scheduleId) {
    return this.schedules.find(s => s.id === scheduleId);
  }

  /**
   * Obtém todos os agendamentos
   */
  getAllSchedules() {
    return [...this.schedules].sort((a, b) => {
      return new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime();
    });
  }

  /**
   * Obtém agendamentos pendentes
   */
  getPendingSchedules() {
    return this.schedules.filter(s => s.status === 'pending');
  }

  /**
   * Atualiza o status de um agendamento
   */
  async updateScheduleStatus(scheduleId, status) {
    try {
      const schedule = this.getSchedule(scheduleId);
      
      if (!schedule) {
        throw new Error('Agendamento não encontrado');
      }

      schedule.status = status;
      
      if (status === 'completed' || status === 'failed') {
        schedule.completedAt = new Date().toISOString();
      }

      await this.saveSchedules();
      return schedule;
    } catch (error) {
      console.error('[Scheduler] Erro ao atualizar status:', error);
      throw error;
    }
  }

  /**
   * Executa um agendamento
   */
  async executeSchedule(scheduleId) {
    try {
      const schedule = this.getSchedule(scheduleId);
      
      if (!schedule) {
        throw new Error('Agendamento não encontrado');
      }

      console.log('[Scheduler] Executando agendamento:', schedule.name);

      // Atualizar status para running
      await this.updateScheduleStatus(scheduleId, 'running');

      // Enviar mensagem para iniciar campanha
      chrome.runtime.sendMessage({
        action: 'START_SCHEDULED_CAMPAIGN',
        scheduleId: scheduleId,
        queue: schedule.queue,
        config: schedule.config
      }).catch(err => {
        console.error('[Scheduler] Erro ao enviar mensagem:', err);
      });

      return schedule;
    } catch (error) {
      console.error('[Scheduler] Erro ao executar agendamento:', error);
      await this.updateScheduleStatus(scheduleId, 'failed');
      throw error;
    }
  }

  /**
   * Formata um agendamento para exibição
   */
  formatSchedule(schedule) {
    const scheduledTime = new Date(schedule.scheduledTime);
    const now = new Date();
    const diff = scheduledTime.getTime() - now.getTime();

    let timeRemaining = '';
    if (diff > 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      if (hours > 24) {
        const days = Math.floor(hours / 24);
        timeRemaining = `${days} dia(s)`;
      } else if (hours > 0) {
        timeRemaining = `${hours}h ${minutes}min`;
      } else {
        timeRemaining = `${minutes} minuto(s)`;
      }
    }

    return {
      ...schedule,
      scheduledTimeFormatted: scheduledTime.toLocaleString('pt-BR'),
      timeRemaining: timeRemaining,
      queueSize: schedule.queue?.length || 0
    };
  }
}

// Exportar instância global
if (typeof window !== 'undefined') {
  window.schedulerManager = new SchedulerManager();
}
