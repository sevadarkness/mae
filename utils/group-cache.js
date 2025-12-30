/**
 * group-cache.js - Sistema de Cache de Grupos
 * 
 * Implementa cache local com TTL de 5 minutos para grupos do WhatsApp
 * Melhora a performance ao evitar recarregamento desnecessário
 */

class GroupCache {
  constructor(ttlMinutes = 5) {
    this.ttl = ttlMinutes * 60 * 1000; // Converter para ms
    this.cacheKey = 'groupCache';
    this.timestampKey = 'groupCacheTimestamp';
  }

  /**
   * Salva grupos no cache
   * @param {Array} groups - Lista de grupos
   * @param {Object} stats - Estatísticas dos grupos
   * @returns {Promise<boolean>}
   */
  async save(groups, stats = null) {
    try {
      const now = Date.now();
      const cacheData = {
        groups: groups,
        stats: stats,
        timestamp: now,
        count: groups.length
      };

      await chrome.storage.local.set({
        [this.cacheKey]: cacheData,
        [this.timestampKey]: now
      });

      console.log('[GroupCache] Cache salvo:', groups.length, 'grupos');
      return true;
    } catch (error) {
      console.error('[GroupCache] Erro ao salvar cache:', error);
      return false;
    }
  }

  /**
   * Obtém grupos do cache
   * @returns {Promise<Object|null>} Dados do cache ou null se expirado/vazio
   */
  async get() {
    try {
      const result = await chrome.storage.local.get([this.cacheKey, this.timestampKey]);
      
      if (!result[this.cacheKey] || !result[this.timestampKey]) {
        console.log('[GroupCache] Cache vazio');
        return null;
      }

      const now = Date.now();
      const age = now - result[this.timestampKey];
      
      // Verificar se cache expirou
      if (age > this.ttl) {
        console.log('[GroupCache] Cache expirado (idade:', Math.round(age / 1000), 's)');
        await this.clear();
        return null;
      }

      const cacheData = result[this.cacheKey];
      console.log('[GroupCache] Cache válido:', cacheData.count, 'grupos (idade:', Math.round(age / 1000), 's)');
      
      return {
        groups: cacheData.groups,
        stats: cacheData.stats,
        timestamp: cacheData.timestamp,
        age: age,
        ageSeconds: Math.round(age / 1000)
      };
    } catch (error) {
      console.error('[GroupCache] Erro ao obter cache:', error);
      return null;
    }
  }

  /**
   * Verifica se o cache é válido (não expirou)
   * @returns {Promise<boolean>}
   */
  async isValid() {
    try {
      const result = await chrome.storage.local.get(this.timestampKey);
      
      if (!result[this.timestampKey]) {
        return false;
      }

      const now = Date.now();
      const age = now - result[this.timestampKey];
      
      return age <= this.ttl;
    } catch (error) {
      console.error('[GroupCache] Erro ao verificar validade:', error);
      return false;
    }
  }

  /**
   * Limpa o cache
   * @returns {Promise<boolean>}
   */
  async clear() {
    try {
      await chrome.storage.local.remove([this.cacheKey, this.timestampKey]);
      console.log('[GroupCache] Cache limpo');
      return true;
    } catch (error) {
      console.error('[GroupCache] Erro ao limpar cache:', error);
      return false;
    }
  }

  /**
   * Obtém informações sobre o cache
   * @returns {Promise<Object>}
   */
  async getInfo() {
    try {
      const result = await chrome.storage.local.get([this.cacheKey, this.timestampKey]);
      
      if (!result[this.timestampKey]) {
        return {
          exists: false,
          valid: false
        };
      }

      const now = Date.now();
      const age = now - result[this.timestampKey];
      const valid = age <= this.ttl;
      const remaining = valid ? this.ttl - age : 0;

      return {
        exists: true,
        valid: valid,
        age: age,
        ageSeconds: Math.round(age / 1000),
        ageMinutes: Math.round(age / 60000),
        remaining: remaining,
        remainingSeconds: Math.round(remaining / 1000),
        remainingMinutes: Math.round(remaining / 60000),
        count: result[this.cacheKey]?.count || 0,
        timestamp: result[this.timestampKey]
      };
    } catch (error) {
      console.error('[GroupCache] Erro ao obter info:', error);
      return {
        exists: false,
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Força atualização do cache (clear + get novos dados)
   * Deve ser chamado quando usuário clicar em "Forçar atualização"
   * @returns {Promise<boolean>}
   */
  async forceRefresh() {
    await this.clear();
    console.log('[GroupCache] Refresh forçado - cache limpo');
    return true;
  }

  /**
   * Obtém tempo restante até expiração (em formato legível)
   * @returns {Promise<string>}
   */
  async getTimeRemaining() {
    const info = await this.getInfo();
    
    if (!info.exists || !info.valid) {
      return 'Cache expirado ou vazio';
    }

    const minutes = info.remainingMinutes;
    const seconds = info.remainingSeconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }

  /**
   * Atualiza TTL (tempo de vida do cache)
   * @param {number} minutes - Novo TTL em minutos
   */
  setTTL(minutes) {
    this.ttl = minutes * 60 * 1000;
    console.log('[GroupCache] TTL atualizado para', minutes, 'minutos');
  }
}

// Instância global com TTL padrão de 5 minutos
window.groupCache = window.groupCache || new GroupCache(5);
