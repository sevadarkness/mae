/**
 * Group Cache System
 * Caches WhatsApp groups to improve loading performance
 */

class GroupCache {
    static CACHE_KEY = 'whl_groups_cache';
    static CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
    
    /**
     * Get cached groups if still valid
     */
    static async get() {
        try {
            const data = await chrome.storage.local.get(this.CACHE_KEY);
            const cache = data[this.CACHE_KEY];
            
            if (cache && cache.timestamp && cache.groups) {
                const age = Date.now() - cache.timestamp;
                
                if (age < this.CACHE_DURATION) {
                    console.log(`[Cache] Usando grupos do cache (idade: ${Math.round(age / 1000)}s)`);
                    return {
                        groups: cache.groups,
                        fromCache: true,
                        age: age
                    };
                } else {
                    console.log('[Cache] Cache expirado, requer atualização');
                }
            }
            
            return null;
        } catch (error) {
            console.error('[Cache] Erro ao buscar cache:', error);
            return null;
        }
    }
    
    /**
     * Save groups to cache
     */
    static async set(groups) {
        try {
            await chrome.storage.local.set({
                [this.CACHE_KEY]: {
                    groups: groups,
                    timestamp: Date.now()
                }
            });
            console.log(`[Cache] ${groups.length} grupos salvos no cache`);
        } catch (error) {
            console.error('[Cache] Erro ao salvar cache:', error);
        }
    }
    
    /**
     * Clear the cache
     */
    static async clear() {
        try {
            await chrome.storage.local.remove(this.CACHE_KEY);
            console.log('[Cache] Cache limpo');
        } catch (error) {
            console.error('[Cache] Erro ao limpar cache:', error);
        }
    }
    
    /**
     * Get cache info
     */
    static async getInfo() {
        try {
            const data = await chrome.storage.local.get(this.CACHE_KEY);
            const cache = data[this.CACHE_KEY];
            
            if (cache && cache.timestamp) {
                const age = Date.now() - cache.timestamp;
                const isValid = age < this.CACHE_DURATION;
                const groupCount = cache.groups ? cache.groups.length : 0;
                
                return {
                    exists: true,
                    isValid: isValid,
                    age: age,
                    ageSeconds: Math.round(age / 1000),
                    groupCount: groupCount,
                    expiresIn: isValid ? this.CACHE_DURATION - age : 0
                };
            }
            
            return {
                exists: false,
                isValid: false,
                age: 0,
                ageSeconds: 0,
                groupCount: 0,
                expiresIn: 0
            };
        } catch (error) {
            console.error('[Cache] Erro ao obter info do cache:', error);
            return null;
        }
    }
    
    /**
     * Update cache duration (in milliseconds)
     */
    static setCacheDuration(durationMs) {
        this.CACHE_DURATION = Math.max(60000, Math.min(3600000, durationMs)); // Min 1 min, max 1 hour
        console.log(`[Cache] Duração do cache atualizada para ${this.CACHE_DURATION / 1000}s`);
    }
}

// Make it globally available
if (typeof window !== 'undefined') {
    window.GroupCache = GroupCache;
}
