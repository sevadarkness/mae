/**
 * Campaign Scheduler System
 * Manages multiple scheduled campaigns using chrome.alarms API
 */

class SchedulerSystem {
    constructor() {
        this.schedules = [];
        this.storageKey = 'whl_schedules';
        
        // Load schedules
        this.loadSchedules();
    }
    
    /**
     * Load schedules from storage
     */
    async loadSchedules() {
        try {
            const data = await chrome.storage.local.get([this.storageKey]);
            if (data[this.storageKey]) {
                this.schedules = data[this.storageKey];
                
                // Clean up past schedules
                this.cleanupPastSchedules();
            }
        } catch (error) {
            console.error('[Scheduler] Error loading schedules:', error);
        }
    }
    
    /**
     * Save schedules to storage
     */
    async saveSchedules() {
        try {
            await chrome.storage.local.set({
                [this.storageKey]: this.schedules
            });
        } catch (error) {
            console.error('[Scheduler] Error saving schedules:', error);
        }
    }
    
    /**
     * Add a new schedule
     */
    async addSchedule(name, datetime, campaign) {
        const scheduleTime = new Date(datetime);
        const now = new Date();
        
        if (scheduleTime <= now) {
            throw new Error('Horário deve ser no futuro');
        }
        
        const schedule = {
            id: Date.now().toString(),
            name: name,
            datetime: scheduleTime.toISOString(),
            campaign: campaign, // { numbers, message, image, settings }
            status: 'pending',
            createdAt: now.toISOString()
        };
        
        // Create chrome alarm
        const alarmName = `whl_schedule_${schedule.id}`;
        const delayInMinutes = (scheduleTime.getTime() - now.getTime()) / 60000;
        
        await chrome.alarms.create(alarmName, {
            when: scheduleTime.getTime()
        });
        
        this.schedules.push(schedule);
        await this.saveSchedules();
        
        console.log(`[Scheduler] Agendamento criado: ${name} para ${scheduleTime.toLocaleString('pt-BR')}`);
        
        return schedule;
    }
    
    /**
     * Delete a schedule
     */
    async deleteSchedule(id) {
        const index = this.schedules.findIndex(s => s.id === id);
        
        if (index !== -1) {
            const schedule = this.schedules[index];
            
            // Clear alarm
            const alarmName = `whl_schedule_${id}`;
            await chrome.alarms.clear(alarmName);
            
            this.schedules.splice(index, 1);
            await this.saveSchedules();
            
            console.log(`[Scheduler] Agendamento removido: ${schedule.name}`);
            return true;
        }
        
        return false;
    }
    
    /**
     * Update schedule status
     */
    async updateScheduleStatus(id, status) {
        const schedule = this.schedules.find(s => s.id === id);
        
        if (schedule) {
            schedule.status = status;
            await this.saveSchedules();
            return true;
        }
        
        return false;
    }
    
    /**
     * Get all schedules
     */
    getSchedules() {
        return this.schedules.sort((a, b) => 
            new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
        );
    }
    
    /**
     * Get pending schedules
     */
    getPendingSchedules() {
        return this.schedules.filter(s => s.status === 'pending');
    }
    
    /**
     * Get schedule by ID
     */
    getScheduleById(id) {
        return this.schedules.find(s => s.id === id);
    }
    
    /**
     * Clean up past schedules (older than 24 hours)
     */
    async cleanupPastSchedules() {
        const now = Date.now();
        const oneDayAgo = now - (24 * 60 * 60 * 1000);
        
        const beforeCount = this.schedules.length;
        
        this.schedules = this.schedules.filter(s => {
            const scheduleTime = new Date(s.datetime).getTime();
            
            // Keep if future or completed within last 24h
            if (scheduleTime > now) return true;
            if (s.status === 'completed' && scheduleTime > oneDayAgo) return true;
            if (s.status === 'failed' && scheduleTime > oneDayAgo) return true;
            
            return false;
        });
        
        if (beforeCount !== this.schedules.length) {
            await this.saveSchedules();
            console.log(`[Scheduler] Limpeza: ${beforeCount - this.schedules.length} agendamentos antigos removidos`);
        }
    }
    
    /**
     * Get next scheduled campaign
     */
    getNextSchedule() {
        const pending = this.getPendingSchedules();
        
        if (pending.length === 0) return null;
        
        return pending.reduce((next, current) => {
            const nextTime = new Date(next.datetime).getTime();
            const currentTime = new Date(current.datetime).getTime();
            return currentTime < nextTime ? current : next;
        });
    }
    
    /**
     * Format time remaining until schedule
     */
    getTimeRemaining(schedule) {
        const now = Date.now();
        const scheduleTime = new Date(schedule.datetime).getTime();
        const diff = scheduleTime - now;
        
        if (diff <= 0) {
            return 'Agora';
        }
        
        const hours = Math.floor(diff / (60 * 60 * 1000));
        const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
        
        if (hours > 24) {
            const days = Math.floor(hours / 24);
            return `${days}d ${hours % 24}h`;
        }
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        
        return `${minutes}m`;
    }
}

// Make it globally available
if (typeof window !== 'undefined') {
    window.SchedulerSystem = SchedulerSystem;
}
