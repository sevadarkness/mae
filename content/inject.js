// inject.js - WhatsApp Group Extractor v6.0.3 (CORREÇÃO COMPLETA PARA ARQUIVADOS)
(function() {
    if (window.__waExtractorAPI) {
        console.log('[WA API] API já inicializada');
        return;
    }

    console.log('[WA API] Inicializando v6.0.3 com suporte total a arquivados...');

    // Lista expandida de indicadores de grupos inválidos
    const invalidIndicators = [
        // Português
        'você foi removido', 'você saiu', 'grupo excluído', 
        'não é mais participante', 'este grupo foi excluído',
        'grupo desativado', 'você não faz mais parte',
        'este grupo não existe mais', 'grupo foi desativado',
        // English
        'you were removed', 'you left', 'group deleted',
        'no longer a participant', 'this group was deleted',
        'group deactivated', 'you are no longer a member',
        'this group no longer exists'
    ];

    // Verificar se grupo é válido
    function isGroupValid(group) {
        const nameToCheck = (group.name || '').toLowerCase();
        
        for (const indicator of invalidIndicators) {
            if (nameToCheck.includes(indicator)) {
                console.log(`[WA API] ⚠️ Grupo filtrado: "${group.name}" - motivo: "${indicator}"`);
                return false;
            }
        }
        
        // Verificar flags de metadata se disponíveis
        if (group.isReadOnly === true || group.suspended === true || group.isParticipant === false) {
            console.log(`[WA API] ⚠️ Grupo filtrado por metadata: "${group.name}"`);
            return false;
        }
        
        return true;
    }

    // Helper para require seguro
    function safeRequire(moduleName) {
        try {
            if (typeof require === 'function') {
                return require(moduleName);
            }
            return null;
        } catch (e) {
            console.warn(`[WA API] Módulo ${moduleName} não encontrado:`, e.message);
            return null;
        }
    }

    // Helper para aguardar WhatsApp carregar
    function waitForWhatsApp(timeout = 10000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            function check() {
                try {
                    const CC = safeRequire('WAWebChatCollection');
                    if (CC?.ChatCollection || CC?.default?.ChatCollection) {
                        resolve(true);
                        return;
                    }
                } catch (e) {}
                
                if (Date.now() - startTime > timeout) {
                    reject(new Error('WhatsApp não carregou completamente'));
                    return;
                }
                
                setTimeout(check, 500);
            }
            
            check();
        });
    }

    window.__waExtractorAPI = {
        // ========================================
        // LISTAR GRUPOS (incluindo arquivados)
        // ========================================
        getGroups(options = {}) {
            try {
                const { includeArchived = true, onlyArchived = false } = options;
                console.log('[WA API] 🔍 Carregando grupos...', { includeArchived, onlyArchived });

                const CC = safeRequire('WAWebChatCollection');
                if (!CC) {
                    return { success: false, groups: [], error: 'WAWebChatCollection não disponível' };
                }

                const ChatCollection = CC.ChatCollection || CC.default?.ChatCollection;
                if (!ChatCollection || !ChatCollection.getModelsArray) {
                    return { success: false, groups: [], error: 'ChatCollection não disponível' };
                }

                const models = ChatCollection.getModelsArray() || [];
                console.log('[WA API] 📋 Total de chats:', models.length);

                let groups = models
                    .filter(m => m.id && m.id.server === 'g.us')
                    .map(g => ({
                        id: g.id._serialized,
                        name: g.name || g.formattedTitle || g.contact?.name || 'Grupo sem nome',
                        memberCount: g.groupMetadata?.participants?.length 
                            ? `${g.groupMetadata.participants.length} membros` 
                            : '',
                        isArchived: g.archive === true,
                        isMuted: g.mute?.isMuted === true,
                        unreadCount: g.unreadCount || 0,
                        lastMessageTime: g.t || 0,
                        isReadOnly: g.isReadOnly,
                        suspended: g.suspended,
                        isParticipant: g.groupMetadata?.isParticipant
                    }))
                    .filter(g => isGroupValid(g)); // Filtrar grupos inválidos

                if (onlyArchived) {
                    groups = groups.filter(g => g.isArchived);
                } else if (!includeArchived) {
                    groups = groups.filter(g => !g.isArchived);
                }

                // Ordenar por nome
                groups.sort((a, b) => a.name.localeCompare(b.name));

                const stats = {
                    total: groups.length,
                    archived: groups.filter(g => g.isArchived).length,
                    active: groups.filter(g => !g.isArchived).length
                };

                console.log('[WA API] ✅ Grupos:', stats);
                return { success: true, groups, stats };

            } catch (error) {
                console.error('[WA API] ❌ Erro:', error);
                return { success: false, groups: [], error: error.message };
            }
        },

        // ========================================
        // ABRIR CHAT (CORRIGIDO v6.0.2 - DESARQUIVA SE NECESSÁRIO)
        // ========================================
        async openChat(groupId, isArchived = false) {
            try {
                console.log('[WA API] Abrindo chat:', groupId, 'Arquivado:', isArchived);

                const CC = safeRequire('WAWebChatCollection');
                if (!CC) {
                    return { success: false, error: 'MODULES_NOT_AVAILABLE' };
                }

                const ChatCollection = CC.ChatCollection || CC.default?.ChatCollection;
                const chat = ChatCollection?.get(groupId);

                if (!chat) {
                    return { success: false, error: 'CHAT_NOT_FOUND' };
                }

                const wasArchived = chat.archive === true;
                console.log('[WA API] Chat encontrado. Arquivado:', wasArchived);

                // ✅ CORREÇÃO: Se o chat está arquivado, desarquivar ANTES de abrir
                if (wasArchived && typeof chat.setArchive === 'function') {
                    console.log('[WA API] 📤 Desarquivando chat temporariamente...');
                    try {
                        await chat.setArchive(false);
                        await new Promise(r => setTimeout(r, 800));
                        console.log('[WA API] ✅ Chat desarquivado');
                    } catch (e) {
                        console.log('[WA API] ⚠️ Falha ao desarquivar, continuando...', e.message);
                    }
                }

                // Lista de métodos para tentar (em ordem de preferência)
                const methods = [
                    // Método 1: CMD.openChatAt
                    async () => {
                        const CMD = safeRequire('WAWebCmd');
                        if (CMD?.openChatAt) {
                            await CMD.openChatAt(chat);
                            return 'CMD.openChatAt';
                        }
                        if (CMD?.default?.openChatAt) {
                            await CMD.default.openChatAt(chat);
                            return 'CMD.default.openChatAt';
                        }
                        throw new Error('CMD não disponível');
                    },

                    // Método 2: chat.sendSeen (força abertura)
                    async () => {
                        if (typeof chat.sendSeen === 'function') {
                            await chat.sendSeen();
                        }
                        if (typeof chat.open === 'function') {
                            await chat.open();
                            return 'chat.sendSeen+open';
                        }
                        throw new Error('chat.open não disponível');
                    },

                    // Método 3: setActive
                    async () => {
                        if (ChatCollection?.setActive) {
                            await ChatCollection.setActive(chat);
                            return 'setActive';
                        }
                        throw new Error('setActive não disponível');
                    },

                    // Método 4: Navegar via Wid
                    async () => {
                        const NavModule = safeRequire('WAWebNavigateToChat');
                        if (NavModule?.navigateToChat) {
                            await NavModule.navigateToChat(chat.id);
                            return 'navigateToChat';
                        }
                        throw new Error('Nav modules não disponíveis');
                    }
                ];

                // Tentar cada método
                let lastError;
                for (const method of methods) {
                    try {
                        const result = await method();
                        console.log('[WA API] ✅ Sucesso via:', result);

                        // Aguardar um pouco para garantir abertura
                        await new Promise(r => setTimeout(r, 1200));

                        return { success: true, method: result, wasArchived };
                    } catch (e) {
                        lastError = e;
                        console.log('[WA API] Método falhou:', e.message);
                    }
                }

                return {
                    success: false,
                    error: 'ALL_METHODS_FAILED',
                    details: lastError?.message,
                    wasArchived
                };

            } catch (e) {
                console.error('[WA API] Erro:', e);
                return { success: false, error: e.message };
            }
        },

        // ========================================
        // DESARQUIVAR CHAT
        // ========================================
        async unarchiveChat(groupId) {
            try {
                const CC = safeRequire('WAWebChatCollection');
                if (!CC) {
                    return { success: false, error: 'MODULES_NOT_AVAILABLE' };
                }

                const ChatCollection = CC.ChatCollection || CC.default?.ChatCollection;
                const chat = ChatCollection?.get(groupId);

                if (!chat) {
                    return { success: false, error: 'CHAT_NOT_FOUND' };
                }

                if (chat.archive !== true) {
                    return { success: true, message: 'ALREADY_UNARCHIVED' };
                }

                if (typeof chat.setArchive === 'function') {
                    await chat.setArchive(false);
                    console.log('[WA API] ✅ Chat desarquivado');
                    return { success: true };
                }

                return { success: false, error: 'UNARCHIVE_NOT_SUPPORTED' };
            } catch (e) {
                return { success: false, error: e.message };
            }
        },

        // ========================================
        // OBTER ESTATÍSTICAS
        // ========================================
        getStats() {
            try {
                const CC = safeRequire('WAWebChatCollection');
                if (!CC) {
                    return { success: false, error: 'MODULES_NOT_AVAILABLE' };
                }

                const ChatCollection = CC.ChatCollection || CC.default?.ChatCollection;
                const models = ChatCollection?.getModelsArray() || [];
                const groups = models.filter(m => m.id?.server === 'g.us');

                return {
                    success: true,
                    stats: {
                        totalChats: models.length,
                        totalGroups: groups.length,
                        archivedGroups: groups.filter(g => g.archive === true).length,
                        activeGroups: groups.filter(g => g.archive !== true).length
                    }
                };
            } catch (e) {
                return { success: false, error: e.message };
            }
        },

        // ========================================
        // VERIFICAR SE WHATSAPP ESTÁ PRONTO
        // ========================================
        isReady() {
            try {
                const CC = safeRequire('WAWebChatCollection');
                return !!(CC?.ChatCollection || CC?.default?.ChatCollection);
            } catch (e) {
                return false;
            }
        }
    };

    // ========================================
    // LISTENER DE MENSAGENS
    // ========================================
    window.addEventListener('message', (event) => {
        if (event.source !== window) return;
        if (!event.data?.type) return;

        const { type } = event.data;

        if (type === 'WA_GET_GROUPS') {
            const result = window.__waExtractorAPI.getGroups({
                includeArchived: event.data.includeArchived !== false,
                onlyArchived: event.data.onlyArchived === true
            });
            window.postMessage({ type: 'WA_GET_GROUPS_RESULT', ...result }, '*');
        }

        if (type === 'WA_OPEN_CHAT') {
            window.__waExtractorAPI.openChat(
                event.data.groupId,
                event.data.isArchived
            ).then(result => {
                window.postMessage({ type: 'WA_OPEN_CHAT_RESULT', ...result }, '*');
            });
        }

        if (type === 'WA_UNARCHIVE_CHAT') {
            window.__waExtractorAPI.unarchiveChat(
                event.data.groupId
            ).then(result => {
                window.postMessage({ type: 'WA_UNARCHIVE_CHAT_RESULT', ...result }, '*');
            });
        }

        if (type === 'WA_GET_STATS') {
            const result = window.__waExtractorAPI.getStats();
            window.postMessage({ type: 'WA_GET_STATS_RESULT', ...result }, '*');
        }

        if (type === 'WA_CHECK_READY') {
            const isReady = window.__waExtractorAPI.isReady();
            window.postMessage({ type: 'WA_CHECK_READY_RESULT', success: true, ready: isReady }, '*');
        }
    });

    console.log('[WA API] ✅ API v6.0.3 pronta! (Suporte completo a arquivados)');
})();