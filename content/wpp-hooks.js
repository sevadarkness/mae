/**
 * WhatsHybrid Lite - WPP Hooks (WPP Boladão tested approach)
 * Uses require() to load internal WhatsApp modules via webpack
 * Does NOT use window.Store directly (CSP blocking)
 */

window.whl_hooks_main = () => {
    // ===== DEBUG LOGGING SYSTEM =====
            const WHL_DEBUG = localStorage.getItem('whl_debug') === 'true';
    const whlLog = {
        debug: (...args) => { if (WHL_DEBUG) console.log('[WHL Hooks DEBUG]', ...args); },
        info: (...args) => console.log('[WHL Hooks]', ...args),
        warn: (...args) => console.warn('[WHL Hooks]', ...args),
        error: (...args) => console.error('[WHL Hooks]', ...args)
    };
    
    // ===== CONSTANTS =====
    // WhatsApp ID suffixes pattern for removal
    const WHATSAPP_SUFFIXES_REGEX = /@c\.us|@s\.whatsapp\.net|@g\.us|@broadcast|@lid/g;
    
    // Valid ITU-T E.164 country codes for phone number validation
    const VALID_COUNTRY_CODES = [
        '1',    // USA, Canada
        '7',    // Russia
        '20',   // Egypt
        '27',   // South Africa
        '30',   // Greece
        '31',   // Netherlands
        '32',   // Belgium
        '33',   // France
        '34',   // Spain
        '36',   // Hungary
        '39',   // Italy
        '40',   // Romania
        '41',   // Switzerland
        '43',   // Austria
        '44',   // UK
        '45',   // Denmark
        '46',   // Sweden
        '47',   // Norway
        '48',   // Poland
        '49',   // Germany
        '51',   // Peru
        '52',   // Mexico
        '53',   // Cuba
        '54',   // Argentina
        '55',   // Brazil
        '56',   // Chile
        '57',   // Colombia
        '58',   // Venezuela
        '60',   // Malaysia
        '61',   // Australia
        '62',   // Indonesia
        '63',   // Philippines
        '64',   // New Zealand
        '65',   // Singapore
        '66',   // Thailand
        '81',   // Japan
        '82',   // South Korea
        '84',   // Vietnam
        '86',   // China
        '90',   // Turkey
        '91',   // India
        '92',   // Pakistan
        '93',   // Afghanistan
        '94',   // Sri Lanka
        '95',   // Myanmar
        '98',   // Iran
        '212',  // Morocco
        '213',  // Algeria
        '216',  // Tunisia
        '218',  // Libya
        '220',  // Gambia
        '221',  // Senegal
        '222',  // Mauritania
        '223',  // Mali
        '224',  // Guinea
        '225',  // Ivory Coast
        '226',  // Burkina Faso
        '227',  // Niger
        '228',  // Togo
        '229',  // Benin
        '230',  // Mauritius
        '231',  // Liberia
        '232',  // Sierra Leone
        '233',  // Ghana
        '234',  // Nigeria
        '235',  // Chad
        '236',  // Central African Republic
        '237',  // Cameroon
        '238',  // Cape Verde
        '239',  // São Tomé and Príncipe
        '240',  // Equatorial Guinea
        '241',  // Gabon
        '242',  // Republic of the Congo
        '243',  // Democratic Republic of the Congo
        '244',  // Angola
        '245',  // Guinea-Bissau
        '246',  // British Indian Ocean Territory
        '247',  // Ascension Island
        '248',  // Seychelles
        '249',  // Sudan
        '250',  // Rwanda
        '251',  // Ethiopia
        '252',  // Somalia
        '253',  // Djibouti
        '254',  // Kenya
        '255',  // Tanzania
        '256',  // Uganda
        '257',  // Burundi
        '258',  // Mozambique
        '260',  // Zambia
        '261',  // Madagascar
        '262',  // Réunion
        '263',  // Zimbabwe
        '264',  // Namibia
        '265',  // Malawi
        '266',  // Lesotho
        '267',  // Botswana
        '268',  // Eswatini
        '269',  // Comoros
        '290',  // Saint Helena
        '291',  // Eritrea
        '297',  // Aruba
        '298',  // Faroe Islands
        '299',  // Greenland
        '350',  // Gibraltar
        '351',  // Portugal
        '352',  // Luxembourg
        '353',  // Ireland
        '354',  // Iceland
        '355',  // Albania
        '356',  // Malta
        '357',  // Cyprus
        '358',  // Finland
        '359',  // Bulgaria
        '370',  // Lithuania
        '371',  // Latvia
        '372',  // Estonia
        '373',  // Moldova
        '374',  // Armenia
        '375',  // Belarus
        '376',  // Andorra
        '377',  // Monaco
        '378',  // San Marino
        '380',  // Ukraine
        '381',  // Serbia
        '382',  // Montenegro
        '385',  // Croatia
        '386',  // Slovenia
        '387',  // Bosnia and Herzegovina
        '389',  // North Macedonia
        '420',  // Czech Republic
        '421',  // Slovakia
        '423',  // Liechtenstein
        '500',  // Falkland Islands
        '501',  // Belize
        '502',  // Guatemala
        '503',  // El Salvador
        '504',  // Honduras
        '505',  // Nicaragua
        '506',  // Costa Rica
        '507',  // Panama
        '508',  // Saint Pierre and Miquelon
        '509',  // Haiti
        '590',  // Guadeloupe
        '591',  // Bolivia
        '592',  // Guyana
        '593',  // Ecuador
        '594',  // French Guiana
        '595',  // Paraguay
        '596',  // Martinique
        '597',  // Suriname
        '598',  // Uruguay
        '599',  // Curaçao
        '670',  // East Timor
        '672',  // Norfolk Island
        '673',  // Brunei
        '674',  // Nauru
        '675',  // Papua New Guinea
        '676',  // Tonga
        '677',  // Solomon Islands
        '678',  // Vanuatu
        '679',  // Fiji
        '680',  // Palau
        '681',  // Wallis and Futuna
        '682',  // Cook Islands
        '683',  // Niue
        '685',  // Samoa
        '686',  // Kiribati
        '687',  // New Caledonia
        '688',  // Tuvalu
        '689',  // French Polynesia
        '690',  // Tokelau
        '691',  // Micronesia
        '692',  // Marshall Islands
        '850',  // North Korea
        '852',  // Hong Kong
        '853',  // Macau
        '855',  // Cambodia
        '856',  // Laos
        '880',  // Bangladesh
        '886',  // Taiwan
        '960',  // Maldives
        '961',  // Lebanon
        '962',  // Jordan
        '963',  // Syria
        '964',  // Iraq
        '965',  // Kuwait
        '966',  // Saudi Arabia
        '967',  // Yemen
        '968',  // Oman
        '970',  // Palestine
        '971',  // United Arab Emirates
        '972',  // Israel
        '973',  // Bahrain
        '974',  // Qatar
        '975',  // Bhutan
        '976',  // Mongolia
        '977',  // Nepal
        '992',  // Tajikistan
        '993',  // Turkmenistan
        '994',  // Azerbaijan
        '995',  // Georgia
        '996',  // Kyrgyzstan
        '998'   // Uzbekistan
    ];
    
    // Sorted country codes (longest first) for efficient prefix matching
    const SORTED_COUNTRY_CODES = VALID_COUNTRY_CODES.slice().sort((a, b) => b.length - a.length);
    
    // ===== HELPER FUNCTIONS FOR GROUP MEMBER EXTRACTION =====
    function safeRequire(name) {
        try {
            if (typeof require === 'function') {
                return require(name);
            }
        } catch {}
        return null;
    }

    function resolveCollections() {
        // A — require()
        try {
            const ChatMod = safeRequire('WAWebChatCollection');
            const ContactMod = safeRequire('WAWebContactCollection');

            if (ChatMod && ContactMod) {
                const ChatCollection =
                    ChatMod.ChatCollection || ChatMod.default?.ChatCollection;
                const ContactCollection =
                    ContactMod.ContactCollection || ContactMod.default?.ContactCollection;

                if (ChatCollection && ContactCollection) {
                    return { ChatCollection, ContactCollection };
                }
            }
        } catch {}

        // B — globais (quando existirem)
        try {
            if (window.ChatCollection && window.ContactCollection) {
                return {
                    ChatCollection: window.ChatCollection,
                    ContactCollection: window.ContactCollection
                };
            }
        } catch {}

        // C — introspecção defensiva
        try {
            for (const k in window) {
                const v = window[k];
                if (v?.getModelsArray && v?.get) {
                    const arr = v.getModelsArray();
                    if (Array.isArray(arr) && arr.some(c => c?.id?.server === 'g.us')) {
                        return { ChatCollection: v, ContactCollection: null };
                    }
                }
            }
        } catch {}

        return null;
    }

    async function waitForCollections(maxTries = 50, delay = 400) {
        for (let i = 0; i < maxTries; i++) {
            const cols = resolveCollections();
            if (cols?.ChatCollection) return cols;
            await new Promise(r => setTimeout(r, delay));
        }
        return null;
    }

    /**
     * PR #76 ULTRA: Validação de telefone melhorada
     * Validação básica usada em outras partes do sistema
     * Verifica comprimento e rejeita números contendo ':' ou '@lid'
     * @param {string} num - Número a ser validado
     * @returns {boolean} - true se válido, false caso contrário
     */
    function isValidPhone(num) {
        if (!num) return false;
        const clean = String(num).replace(/\D/g, '');
        
        // Rejeitar LIDs (contêm ':' ou '@lid')
        if (String(num).includes(':') || String(num).includes('@lid')) {
            return false;
        }
        
        // Aceitar apenas números válidos (10-15 dígitos)
        return /^\d{10,15}$/.test(clean);
    }

    /**
     * Valida se um número de telefone começa com um código de país válido
     * Usado especificamente para validar números extraídos de mensagens WhatsApp
     * e rejeitar LIDs (identificadores internos do WhatsApp)
     * @param {string} digits - String contendo apenas dígitos
     * @returns {boolean} - true se o número é válido, false caso contrário
     */
    function isValidPhoneNumber(digits) {
        if (!digits || digits.length < 10 || digits.length > 15) return false;
        
        // Verificar se começa com código de país válido
        // Usa códigos pré-ordenados (longest first) para evitar falsos positivos
        // Ex: '212' deve ser testado antes de '1' para números do Marrocos
        for (const code of SORTED_COUNTRY_CODES) {
            if (digits.startsWith(code)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Resolve um LID (Local ID) para o número de telefone real
     * Busca no ContactCollection do WhatsApp
     * @param {string} lid - O LID a ser resolvido (ex: '143379161678071')
     * @returns {string|null} - O número de telefone ou null se não encontrado
     */
    function resolveLidToPhone(lid) {
        if (!lid) return null;
        
        // Limpar o LID usando o regex padrão
        const cleanLid = String(lid).replace(WHATSAPP_SUFFIXES_REGEX, '');
        
        try {
            const CC = require('WAWebContactCollection');
            
            // Método 1: Buscar diretamente pelo LID
            const contact = CC.ContactCollection.get(cleanLid + '@lid');
            if (contact && contact.phoneNumber) {
                const phone = contact.phoneNumber._serialized || contact.phoneNumber.user;
                if (phone) {
                    const cleanPhone = String(phone).replace(WHATSAPP_SUFFIXES_REGEX, '');
                    // Validar se é um número válido
                    if (/^\d{10,15}$/.test(cleanPhone)) {
                        console.log('[WHL] LID resolvido:', cleanLid, '→', cleanPhone);
                        return cleanPhone;
                    }
                }
            }
            
            // Método 2: Buscar na lista de contatos
            const contacts = CC.ContactCollection.getModelsArray() || [];
            const found = contacts.find(c => 
                c.id.user === cleanLid || 
                c.id._serialized === cleanLid + '@lid'
            );
            
            if (found && found.phoneNumber) {
                const phone = found.phoneNumber._serialized || found.phoneNumber.user;
                if (phone) {
                    const cleanPhone = String(phone).replace(WHATSAPP_SUFFIXES_REGEX, '');
                    if (/^\d{10,15}$/.test(cleanPhone)) {
                        console.log('[WHL] LID resolvido via busca:', cleanLid, '→', cleanPhone);
                        return cleanPhone;
                    }
                }
            }
            
        } catch(e) {
            console.warn('[WHL] Erro ao resolver LID:', e.message);
        }
        
        return null;
    }

    /**
     * Extrai número de telefone de um objeto de mensagem do WhatsApp
     * Busca em múltiplos campos e formata corretamente
     * @param {Object} message - Objeto de mensagem do WhatsApp
     * @returns {string} - Número de telefone limpo ou "Desconhecido"
     */
    function extractPhoneNumber(message) {
        // Lista de campos onde o número pode estar
        const sources = [
            message?.sender,
            message?.phoneNumber,
            message?.number,
            message?.author?._serialized,
            message?.author?.user,
            message?.from?._serialized,
            message?.from?.user,
            message?.from,
            message?.chat?.contact?.number,
            message?.chat?.contact?.id?.user,
            message?.chat?.id?.user,
            message?.id?.remote?._serialized,
            message?.id?.remote?.user,
            message?.id?.participant?._serialized,
            message?.id?.participant?.user
        ];
        
        // Coletar LIDs encontrados para fallback
        const foundLids = [];
        
        for (const src of sources) {
            if (!src) continue;
            let s = String(src).trim();
            
            // Se é um LID, tentar resolver para número real
            if (s.includes('@lid')) {
                const resolved = resolveLidToPhone(s);
                if (resolved) {
                    return resolved;
                }
                // Coletar LID para fallback
                const lidMatch = s.match(/(\d{10,15})@lid/);
                if (lidMatch) {
                    foundLids.push(lidMatch[1]);
                }
                continue; // Pular este source se não conseguir resolver
            }
            
            // Remove TODOS os sufixos do WhatsApp usando regex constante
            s = s.replace(WHATSAPP_SUFFIXES_REGEX, '');
            
            // Extrai apenas dígitos
            const digits = s.replace(/\D/g, '');
            
            // Valida se é um número de telefone válido (com código de país)
            if (isValidPhoneNumber(digits)) {
                return digits;
            }
        }
        
        // Fallback: tentar resolver LIDs coletados
        for (const lid of foundLids) {
            const resolved = resolveLidToPhone(lid);
            if (resolved) {
                return resolved;
            }
        }
        
        return 'Desconhecido';
    }

    // PR #76 ULTRA: Resolução de LID ULTRA (7 campos + 5 variações de ID)
    async function resolveContactPhoneUltra(participantId, collections) {
        if (!collections?.ContactCollection) {
            whlLog.warn('ContactCollection não disponível');
            return null;
        }

        // Lista de IDs para tentar (5 VARIAÇÕES)
        const searchIds = [
            participantId,
            String(participantId).replace(/@c\.us|@s\.whatsapp\.net|@lid/g, ''),
            String(participantId).replace('@lid', '').split(':')[0],
            String(participantId).split(':')[0],
            String(participantId).split('@')[0]
        ];

        for (const id of searchIds) {
            if (!id) continue;

            try {
                let contact = collections.ContactCollection.get(id);
                if (!contact && !id.includes('@')) {
                    contact = collections.ContactCollection.get(id + '@c.us');
                }

                if (contact) {
                    // 7 CAMPOS onde o número pode estar
                    const possibleNumbers = [
                        contact.phoneNumber,
                        contact.formattedNumber,
                        contact.id?.user,
                        contact.userid,
                        contact.number,
                        contact.id?._serialized?.replace(/@c\.us|@s\.whatsapp\.net|@lid/g, ''),
                        contact.verifiedName,
                    ];

                    for (const num of possibleNumbers) {
                        if (!num) continue;
                        const clean = String(num).replace(/\D/g, '');
                        if (isValidPhone(clean)) {
                            whlLog.debug(`LID resolvido: ${String(participantId).substring(0, 30)}... → ${clean}`);
                            return clean;
                        }
                    }
                }
            } catch (e) {
                continue;
            }
        }

        whlLog.warn(`Não foi possível resolver: ${String(participantId).substring(0, 30)}...`);
        return null;
    }
    
    // MANTER FUNÇÃO ANTIGA PARA COMPATIBILIDADE
    async function getPhoneFromContact(participantId) {
        const cols = await waitForCollections();
        if (!cols) return null;
        return await resolveContactPhoneUltra(participantId, cols);
    }
    
    // ===== Robust Webpack require bootstrap =====
    function getWpRequire() {
        if (window.webpackChunkwhatsapp_web_client) {
            return window.webpackChunkwhatsapp_web_client.push([
                ['__whl'], {}, (req) => req
            ]);
        }
        if (window.webpackJsonp) {
            let __req;
            window.webpackJsonp.push([['__whl'], { '__whl': (m, e, r) => { __req = r; } }, ['__whl']]);
            return __req;
        }
        return null;
    }

    function findModule(filterFn) {
        const wp = getWpRequire();
        if (!wp || !wp.c) return null;
        for (const id of Object.keys(wp.c)) {
            const m = wp.c[id]?.exports;
            if (!m) continue;
            if (filterFn(m)) return m;
            if (m.default && filterFn(m.default)) return m.default;
        }
        return null;
    }

    // ===== ACESSO AOS MÓDULOS VIA REQUIRE (LAZY LOADING) =====
    // Chamado DENTRO de cada função para garantir que módulos já existem
    function getModules() {
        try {
            const ChatCollection = require('WAWebChatCollection');
            const ContactCollection = require('WAWebContactCollection');
            const BlocklistCollection = require('WAWebBlocklistCollection');
            
            return {
                ChatCollection: ChatCollection?.ChatCollection || null,
                ContactCollection: ContactCollection?.ContactCollection || null,
                BlocklistCollection: BlocklistCollection?.BlocklistCollection || null
            };
        } catch (e) {
            whlLog.warn('Módulos não disponíveis ainda:', e.message);
            return null;
        }
    }

    // ===== EXTRAÇÃO DE CONTATOS =====
    // PR #78: Melhorada com múltiplos fallbacks e logs detalhados
    function extrairContatos() {
        try {
            const modules = getModules();
            if (!modules || !modules.ChatCollection) {
                console.error('[WHL] ChatCollection não disponível');
                return { success: false, error: 'Módulos não disponíveis', contacts: [], count: 0 };
            }
            
            const models = modules.ChatCollection.getModelsArray() || [];
            whlLog.debug('Total de chats encontrados:', models.length);
            
            // Filtrar apenas contatos individuais (c.us)
            const contatos = models
                .filter(m => {
                    const isContact = m.id?.server === 'c.us';
                    const hasUser = m.id?.user || m.id?._serialized;
                    return isContact && hasUser;
                })
                .map(m => {
                    // Múltiplos métodos para obter o número
                    if (m.id.user) {
                        return m.id.user;
                    }
                    const serialized = m.id._serialized || '';
                    return serialized.replace('@c.us', '');
                })
                .map(n => String(n).replace(/\D/g, ''))  // PR #78: Clean before filtering
                .filter(n => n && /^\d{10,15}$/.test(n));  // PR #78: Test cleaned value
            
            const uniqueContatos = [...new Set(contatos)];
            whlLog.debug('Contatos extraídos:', uniqueContatos.length);
            
            return { 
                success: true, 
                contacts: uniqueContatos, 
                count: uniqueContatos.length 
            };
        } catch (e) {
            console.error('[WHL] Erro ao extrair contatos:', e);
            return { 
                success: false, 
                error: e.message, 
                contacts: [], 
                count: 0 
            };
        }
    }

    // ===== EXTRAÇÃO DE GRUPOS =====
    function extrairGrupos() {
        const modules = getModules();
        if (!modules || !modules.ChatCollection) {
            console.warn('[WHL Hooks] ChatCollection não disponível');
            return { success: false, groups: [], error: 'Módulos não carregados' };
        }
        
        try {
            const models = modules.ChatCollection.getModelsArray() || [];
            const grupos = models
                .filter(m => m.id && m.id.server === 'g.us')
                .map(g => ({
                    id: g.id._serialized,
                    name: g.name || g.formattedTitle || 'Grupo sem nome',
                    participants: g.groupMetadata?.participants?.length || 0
                }));
            
            console.log('[WHL Hooks] Grupos extraídos:', grupos.length);
            return { success: true, groups: grupos, count: grupos.length };
        } catch (e) {
            console.error('[WHL Hooks] Erro ao extrair grupos:', e);
            return { success: false, groups: [], error: e.message };
        }
    }

    // ===== EXTRAÇÃO DE ARQUIVADOS =====
    function extrairArquivados() {
        const modules = getModules();
        if (!modules || !modules.ChatCollection) {
            return { success: false, archived: [], error: 'Módulos não carregados' };
        }
        
        try {
            const models = modules.ChatCollection.getModelsArray() || [];
            
            const arquivados = models
                .filter(m => m.archive === true && m.id && m.id.server === 'c.us')
                .map(m => m.id.user || (typeof m.id._serialized === 'string' ? m.id._serialized.replace('@c.us', '') : ''))
                .filter(n => /^\d{8,15}$/.test(n));
            
            console.log('[WHL Hooks] Arquivados extraídos:', arquivados.length);
            return { success: true, archived: [...new Set(arquivados)], count: arquivados.length };
        } catch (e) {
            console.error('[WHL Hooks] Erro ao extrair arquivados:', e);
            return { success: false, archived: [], error: e.message };
        }
    }

    // ===== EXTRAÇÃO DE BLOQUEADOS =====
    function extrairBloqueados() {
        const modules = getModules();
        if (!modules || !modules.BlocklistCollection) {
            return { success: false, blocked: [], error: 'BlocklistCollection não disponível' };
        }
        
        try {
            const blocklist = modules.BlocklistCollection.getModelsArray 
                ? modules.BlocklistCollection.getModelsArray() 
                : (modules.BlocklistCollection._models || []);
            
            const bloqueados = blocklist
                .map(b => {
                    if (!b || !b.id) return '';
                    return b.id.user || (typeof b.id._serialized === 'string' ? b.id._serialized.replace('@c.us', '') : '');
                })
                .filter(n => n && /^\d{8,15}$/.test(n));
            
            console.log('[WHL Hooks] Bloqueados extraídos:', bloqueados.length);
            return { success: true, blocked: [...new Set(bloqueados)], count: bloqueados.length };
        } catch (e) {
            console.error('[WHL Hooks] Erro ao extrair bloqueados:', e);
            return { success: false, blocked: [], error: e.message };
        }
    }

    // ===== EXTRAÇÃO COMPLETA =====
    function extrairTudo() {
        const contatos = extrairContatos();
        const grupos = extrairGrupos();
        const arquivados = extrairArquivados();
        const bloqueados = extrairBloqueados();
        
        return {
            success: true,
            contacts: contatos.contacts || [],
            groups: grupos.groups || [],
            archived: arquivados.archived || [],
            blocked: bloqueados.blocked || [],
            stats: {
                contacts: contatos.count || 0,
                groups: grupos.count || 0,
                archived: arquivados.count || 0,
                blocked: bloqueados.count || 0
            }
        };
    }

    // ============================================
    // FUNÇÕES DE ENVIO - TESTADAS E VALIDADAS
    // ============================================

    // Timeouts para envio de mensagens (em milissegundos)
    const TIMEOUTS = {
        IMAGE_PASTE_WAIT: 2500,    // Tempo para modal de imagem aparecer após paste
        CAPTION_INPUT_WAIT: 400,   // Tempo para campo de caption processar texto
        MESSAGE_SEND_DELAY: 1200   // Delay entre envio de texto e imagem
    };

    /**
     * Extrai contatos arquivados e bloqueados via DOM
     * Combina API e DOM para máxima cobertura
     */
    async function extrairArquivadosBloqueadosDOM() {
        console.log('[WHL] Iniciando extração de arquivados/bloqueados via DOM...');
        
        const result = { archived: [], blocked: [] };
        
        // Método 1: Tentar via API primeiro (Arquivados)
        try {
            const CC = require('WAWebChatCollection');
            const chats = CC?.ChatCollection?.getModelsArray?.() || [];
            
            // Arquivados
            result.archived = chats
                .filter(c => c.archive === true && c.id?._serialized?.endsWith('@c.us'))
                .map(c => c.id._serialized.replace('@c.us', ''))
                .filter(n => /^\d{8,15}$/.test(n));
            
            console.log('[WHL] Arquivados via API:', result.archived.length);
        } catch (e) {
            console.warn('[WHL] Erro ao extrair arquivados via API:', e);
        }
        
        // Bloqueados via BlocklistCollection
        try {
            const BC = require('WAWebBlocklistCollection');
            const blocklist = BC?.BlocklistCollection?.getModelsArray?.() || [];
            
            result.blocked = blocklist
                .map(c => c.id?._serialized?.replace('@c.us', '') || c.id?.user || '')
                .filter(n => /^\d{8,15}$/.test(n));
            
            console.log('[WHL] Bloqueados via API:', result.blocked.length);
        } catch (e) {
            console.warn('[WHL] Erro ao extrair bloqueados via API:', e);
        }
        
        return result;
    }

    /**
     * Envia mensagem de TEXTO para qualquer número via API interna do WhatsApp
     * NÃO CAUSA RELOAD!
     */
    async function enviarMensagemAPI(phone, mensagem) {
        console.log('[WHL] 📨 Enviando TEXTO para', phone);
        
        try {
            var WF = require('WAWebWidFactory');
            var ChatModel = require('WAWebChatModel');
            var MsgModel = require('WAWebMsgModel');
            var MsgKey = require('WAWebMsgKey');
            var CC = require('WAWebChatCollection');
            var SMRA = require('WAWebSendMsgRecordAction');

            // CORREÇÃO BUG 1: Preservar quebras de linha exatamente como estão
            // Não fazer nenhuma sanitização no texto
            var textoOriginal = mensagem; // Manter \n intacto
            
            console.log('[WHL] Texto com quebras:', JSON.stringify(textoOriginal));

            var wid = WF.createWid(phone + '@c.us');
            var chat = CC.ChatCollection.get(wid);
            if (!chat) { 
                chat = new ChatModel.Chat({ id: wid }); 
                CC.ChatCollection.add(chat); 
            }

            var msgId = await MsgKey.newId();
            var msg = new MsgModel.Msg({
                id: { fromMe: true, remote: wid, id: msgId, _serialized: 'true_' + wid._serialized + '_' + msgId },
                body: textoOriginal,  // CORREÇÃO BUG 1: Texto COM quebras de linha preservadas
                type: 'chat',
                t: Math.floor(Date.now() / 1000),
                from: wid, to: wid, self: 'out', isNewMsg: true, local: true
            });

            var result = await SMRA.sendMsgRecord(msg);
            
            // NOVO: Forçar atualização do chat para renderizar a mensagem
            try {
                if (chat.msgs && chat.msgs.sync) {
                    await chat.msgs.sync();
                }
                // Tentar também recarregar o chat
                if (chat.reload) {
                    await chat.reload();
                }
            } catch (e) {
                console.warn('[WHL] Não foi possível sincronizar chat:', e);
            }
            
            console.log('[WHL] ✅ TEXTO enviado:', result);
            return { success: true, result: result };
        } catch (error) {
            console.error('[WHL] ❌ Erro ao enviar TEXTO:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Encontra o campo de composição de mensagem
     */
    function acharCompose() {
        return document.querySelector('footer div[contenteditable="true"][role="textbox"]')
            || document.querySelector('[data-testid="conversation-compose-box-input"]')
            || document.querySelector('div[contenteditable="true"][role="textbox"]');
    }

    /**
     * Simula pressionar ENTER em um elemento
     */
    function pressEnter(el) {
        el.focus();
        el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
        el.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
    }

    /**
     * Envia IMAGEM via DOM (paste + ENTER)
     * Funciona com legenda (caption)
     */
    async function enviarImagemDOM(base64Image, caption) {
        console.log('[WHL] 🖼️ Enviando IMAGEM...');
        
        try {
            var response = await fetch(base64Image);
            var blob = await response.blob();

            var input = acharCompose();
            if (!input) {
                console.error('[WHL] ❌ Campo de composição não encontrado');
                return { success: false, error: 'INPUT_NOT_FOUND' };
            }

            var dt = new DataTransfer();
            dt.items.add(new File([blob], 'image.png', { type: 'image/png' }));

            input.focus();
            input.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: dt }));

            await new Promise(r => setTimeout(r, TIMEOUTS.IMAGE_PASTE_WAIT));

            var captionInput =
                document.querySelector('[data-testid="media-caption-input-container"] [contenteditable="true"]') ||
                document.querySelector('[data-testid="media-caption-input"] [contenteditable="true"]') ||
                document.querySelector('div[contenteditable="true"][data-lexical-editor="true"]');

            if (!captionInput) {
                // Only error if we actually need to add a caption
                if (caption) {
                    console.error('[WHL] ❌ Campo de caption não encontrado');
                    return { success: false, error: 'CAPTION_INPUT_NOT_FOUND' };
                }
                // No caption needed and no input found - try to send anyway
                console.warn('[WHL] ⚠️ Campo de caption não encontrado, mas sem caption para adicionar');
            } else {
                if (caption) {
                    captionInput.focus();
                    // Note: Using execCommand despite deprecation warning because it's the only method
                    // that reliably triggers WhatsApp Web's internal message handlers during testing
                    
                    // IMPORTANTE: Preservar quebras de linha (\n) dividindo em linhas
                    const lines = caption.split('\n');
                    for (let i = 0; i < lines.length; i++) {
                        if (i > 0) {
                            // Inserir quebra de linha com Shift+Enter
                            captionInput.dispatchEvent(new KeyboardEvent('keydown', {
                                key: 'Enter',
                                code: 'Enter',
                                keyCode: 13,
                                which: 13,
                                shiftKey: true,
                                bubbles: true,
                                cancelable: true
                            }));
                            await new Promise(r => setTimeout(r, 50));
                        }
                        
                        if (lines[i]) {
                            document.execCommand('insertText', false, lines[i]);
                        }
                    }
                    console.log('[WHL] 📝 Caption adicionado (com quebras preservadas):', caption);
                }

                await new Promise(r => setTimeout(r, TIMEOUTS.CAPTION_INPUT_WAIT));

                pressEnter(captionInput);
            }
            
            console.log('[WHL] ✅ IMAGEM enviada!');
            return { success: true };
        } catch (error) {
            console.error('[WHL] ❌ Erro ao enviar IMAGEM:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * CORREÇÃO BUG 2: Abre o chat de um número específico via navegação de URL
     * @param {string} phone - Número de telefone
     * @returns {Promise<boolean>} - true se chat foi aberto
     */
    async function abrirChatPorNumero(phone) {
        console.log('[WHL] 📱 Abrindo chat para:', phone);
        
        try {
            const WF = require('WAWebWidFactory');
            const CC = require('WAWebChatCollection');
            
            const wid = WF.createWid(phone + '@c.us');
            let chat = CC.ChatCollection.get(wid);
            
            if (!chat) {
                const ChatModel = require('WAWebChatModel');
                chat = new ChatModel.Chat({ id: wid });
                CC.ChatCollection.add(chat);
            }
            
            // MÉTODO CORRETO: Usar openChat do CMD
            try {
                const CMD = require('WAWebCmd');
                if (CMD && CMD.openChatAt) {
                    await CMD.openChatAt(chat);
                    await new Promise(r => setTimeout(r, 2000));
                    return true;
                }
            } catch (e) {
                console.log('[WHL] CMD não disponível, tentando método alternativo...');
            }
            
            // FALLBACK: Simular clique no contato ou usar URL
            // Navegar para o chat via URL do WhatsApp Web
            const currentUrl = window.location.href;
            const targetUrl = `https://web.whatsapp.com/send?phone=${phone}`;
            
            if (!currentUrl.includes(phone)) {
                // Criar link e clicar
                const link = document.createElement('a');
                link.href = targetUrl;
                link.target = '_self';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                // Aguardar página carregar
                await new Promise(r => setTimeout(r, 3000));
                
                // Verificar se o número é inválido após navegação
                const bodyText = document.body.innerText || document.body.textContent || '';
                if (bodyText.includes('O número de telefone compartilhado por url é inválido')) {
                    console.log('[WHL] ❌ Número inexistente detectado após navegação');
                    return false;
                }
            }
            
            return true;
        } catch (e) {
            console.error('[WHL] Erro ao abrir chat:', e);
            return false;
        }
    }

    /**
     * CORREÇÃO BUG 2: Envia IMAGEM para um número específico (não o chat aberto)
     * @param {string} phone - Número de destino
     * @param {string} base64Image - Imagem em base64
     * @param {string} caption - Legenda opcional
     */
    async function enviarImagemParaNumero(phone, base64Image, caption) {
        console.log('[WHL] 🖼️ Enviando IMAGEM para número:', phone);
        
        // PASSO 1: Abrir o chat do número correto
        const chatAberto = await abrirChatPorNumero(phone);
        if (!chatAberto) {
            console.error('[WHL] ❌ Não foi possível abrir chat para', phone);
            return { success: false, error: 'Número inexistente' };
        }
        
        // PASSO 2: Aguardar um pouco mais para garantir
        await new Promise(r => setTimeout(r, 500));
        
        // PASSO 3: Agora enviar a imagem (chat correto está aberto)
        return await enviarImagemDOM(base64Image, caption);
    }

    /**
     * Envia TEXTO + IMAGEM combinados
     */
    async function enviarMensagemCompleta(phone, texto, base64Image, caption) {
        console.log('[WHL] 🚀 Enviando mensagem completa para', phone);
        
        var results = { texto: null, imagem: null };
        
        // Enviar texto se houver
        if (texto) {
            results.texto = await enviarMensagemAPI(phone, texto);
            await new Promise(r => setTimeout(r, TIMEOUTS.MESSAGE_SEND_DELAY));
        }
        
        // Enviar imagem se houver
        if (base64Image) {
            results.imagem = await enviarImagemDOM(base64Image, caption);
        }
        
        return results;
    }

    /**
     * Aguarda confirmação visual de que a mensagem apareceu no chat
     * @param {string} mensagemEnviada - Texto da mensagem enviada
     * @param {number} timeout - Tempo máximo de espera em ms (padrão: 10000)
     * @returns {Promise<{success: boolean, confirmed: boolean, reason?: string}>}
     */
    async function aguardarConfirmacaoVisual(mensagemEnviada, timeout = 10000) {
        console.log('[WHL] ⏳ Aguardando confirmação visual no DOM...');
        
        const startTime = Date.now();
        const textoParaBuscar = mensagemEnviada.substring(0, 50); // Primeiros 50 chars
        const isImageOnly = mensagemEnviada === '[imagem]' || !mensagemEnviada || mensagemEnviada.trim().length === 0;
        
        while (Date.now() - startTime < timeout) {
            try {
                // Seletores para mensagens no chat
                const mensagensNoChat = document.querySelectorAll(
                    '[data-testid="msg-container"], ' +
                    '.message-out, ' +
                    '[class*="message-out"], ' +
                    '[data-testid="conversation-panel-messages"] [role="row"]'
                );
                
                for (const msgEl of mensagensNoChat) {
                    const texto = msgEl.textContent || '';
                    
                    // Se for imagem sem texto, procurar por elementos de mídia recentes
                    if (isImageOnly) {
                        const hasImage = msgEl.querySelector('img[src*="blob"], img[src*="data:image"], [data-testid="image-thumb"]');
                        if (hasImage) {
                            // Verificar se tem o tick de enviado
                            const ticks = msgEl.querySelector(
                                '[data-testid="msg-check"], ' +
                                '[data-testid="msg-dblcheck"], ' +
                                '[data-icon="msg-check"], ' +
                                '[data-icon="msg-dblcheck"], ' +
                                'span[data-icon="msg-time"]'
                            );
                            
                            if (ticks) {
                                console.log('[WHL] ✅ Confirmação visual: Imagem apareceu no chat com tick!');
                                return { success: true, confirmed: true };
                            }
                            
                            console.log('[WHL] 📝 Imagem encontrada, aguardando tick...');
                        }
                    } else {
                        // Verificar se a mensagem apareceu (comparar início do texto)
                        if (texto.includes(textoParaBuscar)) {
                            // Verificar se tem o tick de enviado (✓ ou ✓✓)
                            const ticks = msgEl.querySelector(
                                '[data-testid="msg-check"], ' +
                                '[data-testid="msg-dblcheck"], ' +
                                '[data-icon="msg-check"], ' +
                                '[data-icon="msg-dblcheck"], ' +
                                'span[data-icon="msg-time"]'
                            );
                            
                            if (ticks) {
                                console.log('[WHL] ✅ Confirmação visual: Mensagem apareceu no chat com tick!');
                                return { success: true, confirmed: true };
                            }
                            
                            // Se encontrou a mensagem mas sem tick ainda, aguardar mais um pouco
                            console.log('[WHL] 📝 Mensagem encontrada, aguardando tick...');
                        }
                    }
                }
            } catch (e) {
                console.warn('[WHL] Erro ao verificar confirmação visual:', e);
            }
            
            // Verificar a cada 500ms
            await new Promise(r => setTimeout(r, 500));
        }
        
        console.warn('[WHL] ⚠️ Timeout: Mensagem não confirmada visualmente após', timeout, 'ms');
        return { success: false, confirmed: false, reason: 'TIMEOUT' };
    }

    class Hook {
        constructor() { 
            this.is_registered = false; 
        }
        register() { 
            this.is_registered = true; 
        }
        unregister() { 
            this.is_registered = false; 
        }
    }

    const WA_MODULES = {
        PROCESS_EDIT_MESSAGE: 'WAWebDBProcessEditProtocolMsgs',
        PROCESS_RENDERABLE_MESSAGES: 'WAWebMessageProcessRenderable',
        MESSAGES_RENDERER: 'WAWebMessageMeta.react',
        PROTOBUF_HOOK: ['decodeProtobuf', 'WAWebProtobufdecode', 'WAWebProtobufUtils'],
        SEND_MESSAGE: 'WAWebSendMsgRecordAction',
        QUERY_GROUP: 'WAWebGroupMsgSendUtils',
        CHAT_COLLECTION: 'WAWebChatCollection',
        CONTACT_STORE: 'WAWebContactCollection',
        GROUP_METADATA: 'WAWebGroupMetadata',
        // Novos módulos para envio direto
        OPEN_CHAT: 'useWAWebSetModelValue',
        WID_FACTORY: 'WAWebWidFactory',
        // Módulos de mídia
        MEDIA_PREP: 'WAWebMediaPrep',
        MEDIA_UPLOAD: 'WAWebMediaUpload',
        MSG_MODELS: 'WAWebMsgModel',
    };

    let MODULES = {};

    // ===== RECOVER HISTORY TRACKING =====
    // CORREÇÃO BUG 4: Cache mais robusto de mensagens para recuperar conteúdo quando forem apagadas
    // Mantém as últimas 1000 mensagens em memória
    const messageCache = new Map(); // Map<messageId, {body, from, timestamp, type}>
    const MAX_CACHE_SIZE = 1000; // Aumentar para 1000
    
    // Array para armazenar histórico de mensagens recuperadas
    const historicoRecover = [];
    
    // Constants for recover history limits
    const MAX_STORAGE_MB = 5;
    const MAX_STORAGE_BYTES = MAX_STORAGE_MB * 1024 * 1024;
    const MAX_RECOVER_MESSAGES = 100; // Maximum number of messages to keep
    const FALLBACK_RECOVER_MESSAGES = 50; // Fallback when storage is full
    
    /**
     * CORREÇÃO BUG 4: Cachear mensagem recebida para poder recuperá-la se for apagada
     */
    function cachearMensagem(msg) {
        if (!msg) return;
        
        // Múltiplos IDs para cache
        const ids = [
            msg.id?.id,
            msg.id?._serialized,
            msg.id?.remote?._serialized + '_' + msg.id?.id
        ].filter(Boolean);
        
        const body = msg.body || msg.caption || msg.text || '';
        const from = msg.from?._serialized || msg.from?.user || msg.author?._serialized || msg.id?.remote?._serialized || '';
        
        if (!body && !from) return;
        
        const cacheData = {
            body: body,
            from: from,
            timestamp: Date.now(),
            type: msg.type || 'chat'
        };
        
        // Cachear com TODOS os IDs possíveis
        ids.forEach(id => {
            messageCache.set(id, cacheData);
        });
        
        // Limitar tamanho do cache
        if (messageCache.size > MAX_CACHE_SIZE) {
            const firstKey = messageCache.keys().next().value;
            messageCache.delete(firstKey);
        }
        
        console.log('[WHL Cache] Mensagem cacheada:', body.substring(0, 30), 'IDs:', ids.length);
    }
    
    /**
     * Detects message type based on content
     * @param {string} body - Message content
     * @param {string} originalType - Original message type
     * @returns {string} - Detected type ('image', 'video', 'audio', 'text')
     */
    function detectMessageType(body, originalType) {
        if (!body || typeof body !== 'string') return originalType || 'text';
        
        // Detect base64 images
        // JPEG starts with /9j/
        // PNG starts with iVBOR
        if (body.startsWith('/9j/') || body.startsWith('iVBOR')) {
            return 'image';
        }
        
        // Detect data URLs
        if (body.startsWith('data:image')) return 'image';
        if (body.startsWith('data:video')) return 'video';
        if (body.startsWith('data:audio')) return 'audio';
        
        // Keep original type if not detected
        return originalType || 'text';
    }
    
    /**
     * Checks if content is a base64 image
     * Helper function shared between hooks and UI rendering
     * @param {string} content - Content to check
     * @returns {boolean} - True if content is base64 image
     */
    function isBase64Image(content) {
        if (!content || typeof content !== 'string') return false;
        return content.startsWith('/9j/') || 
               content.startsWith('iVBOR') || 
               content.startsWith('data:image');
    }
    
    /**
     * Converts base64 content to data URL
     * @param {string} content - Base64 content
     * @returns {string|null} - Data URL or null if not convertible
     */
    function toDataUrl(content) {
        if (!content || typeof content !== 'string') return null;
        
        // Already a data URL
        if (content.startsWith('data:')) return content;
        
        // JPEG base64
        if (content.startsWith('/9j/')) {
            return `data:image/jpeg;base64,${content}`;
        }
        
        // PNG base64
        if (content.startsWith('iVBOR')) {
            return `data:image/png;base64,${content}`;
        }
        
        return null;
    }
    
    /**
     * Bug fix: Save edited message to history
     */
    function salvarMensagemEditada(message) {
        const messageContent = message?.body || message?.caption || '[sem conteúdo]';
        let from = extractPhoneNumber(message);
        
        if (!from || from === 'Desconhecido') from = 'Número desconhecido';
        
        const entrada = {
            id: message.id?.id || Date.now().toString(),
            from: from,
            body: messageContent,
            type: 'edited',
            timestamp: Date.now()
        };
        
        console.log('[WHL Recover] ✏️ Salvando mensagem editada:', entrada);
        
        historicoRecover.push(entrada);
        
        // Item 4: Limit Recover localStorage storage
        let currentSize = new Blob([JSON.stringify(historicoRecover)]).size;
        
        while (currentSize > MAX_STORAGE_BYTES && historicoRecover.length > 10) {
            historicoRecover.shift();
            currentSize = new Blob([JSON.stringify(historicoRecover)]).size;
        }
        
        if (historicoRecover.length > MAX_RECOVER_MESSAGES) {
            historicoRecover = historicoRecover.slice(-MAX_RECOVER_MESSAGES);
        }
        
        // Salvar no localStorage
        try {
            const dataToSave = JSON.stringify(historicoRecover);
            const sizeKB = (new Blob([dataToSave]).size / 1024).toFixed(2);
            localStorage.setItem('whl_recover_history', dataToSave);
            console.log(`[WHL Recover] Histórico salvo: ${historicoRecover.length} mensagens, ${sizeKB}KB`);
        } catch(e) {
            console.error('[WHL Recover] Erro ao salvar (limite excedido?)', e);
            historicoRecover = historicoRecover.slice(-FALLBACK_RECOVER_MESSAGES);
            try {
                localStorage.setItem('whl_recover_history', JSON.stringify(historicoRecover));
            } catch(e2) {
                console.error('[WHL Recover] Falha crítica ao salvar histórico', e2);
            }
        }
        
        // Notificar UI
        window.postMessage({
            type: 'WHL_RECOVER_NEW_MESSAGE',
            message: entrada,
            total: historicoRecover.length
        }, window.location.origin);
        
        console.log(`[WHL Recover] Mensagem editada de ${entrada.from}: ${entrada.body.substring(0, 50)}...`);
    }

    function salvarMensagemRecuperada(msg) {
        // CORREÇÃO BUG 4: Tentar múltiplas fontes para o body
        let body = msg.body || msg.caption || msg.text || '';
        let from = extractPhoneNumber(msg);
        
        // Se body estiver vazio, TENTAR RECUPERAR DO CACHE
        if (!body) {
            const possibleIds = [
                msg.protocolMessageKey?.id,
                msg.id?.id,
                msg.id?._serialized,
                msg.quotedStanzaID,
                msg.id?.remote?._serialized + '_' + msg.protocolMessageKey?.id
            ].filter(Boolean);
            
            for (const id of possibleIds) {
                const cached = messageCache.get(id);
                if (cached && cached.body) {
                    body = cached.body;
                    // Se from não foi encontrado, tentar recuperar do cache
                    if ((!from || from === 'Desconhecido') && cached.from) {
                        from = extractPhoneNumber({ from: { _serialized: cached.from } });
                    }
                    console.log('[WHL Recover] ✅ Conteúdo recuperado do cache:', body.substring(0, 50));
                    break;
                }
            }
        }
        
        // Validar resultados
        if (!body) body = '[Mensagem sem texto - mídia ou sticker]';
        if (!from || from === 'Desconhecido') from = 'Número desconhecido';
        
        const entrada = {
            id: msg.id?.id || Date.now().toString(),
            from: from,
            body: body,
            type: detectMessageType(body, msg.type), // ← USAR DETECÇÃO
            timestamp: Date.now()
        };
        
        console.log('[WHL Recover] 📝 Salvando:', entrada);
        
        historicoRecover.push(entrada);
        
        // Item 4: Limit Recover localStorage storage
        // Calculate approximate size and limit storage
        let currentSize = new Blob([JSON.stringify(historicoRecover)]).size;
        
        // Keep trimming until under size limit
        while (currentSize > MAX_STORAGE_BYTES && historicoRecover.length > 10) {
            historicoRecover.shift(); // Remove oldest messages
            currentSize = new Blob([JSON.stringify(historicoRecover)]).size;
        }
        
        // Also limit by count (max messages as fallback)
        if (historicoRecover.length > MAX_RECOVER_MESSAGES) {
            historicoRecover = historicoRecover.slice(-MAX_RECOVER_MESSAGES);
        }
        
        // Salvar no localStorage
        try {
            const dataToSave = JSON.stringify(historicoRecover);
            const sizeKB = (new Blob([dataToSave]).size / 1024).toFixed(2);
            localStorage.setItem('whl_recover_history', dataToSave);
            console.log(`[WHL Recover] Histórico salvo: ${historicoRecover.length} mensagens, ${sizeKB}KB`);
        } catch(e) {
            console.error('[WHL Recover] Erro ao salvar (limite excedido?)', e);
            // If storage fails, remove oldest half and retry
            historicoRecover = historicoRecover.slice(-FALLBACK_RECOVER_MESSAGES);
            try {
                localStorage.setItem('whl_recover_history', JSON.stringify(historicoRecover));
            } catch(e2) {
                console.error('[WHL Recover] Falha crítica ao salvar histórico', e2);
            }
        }
        
        // Notificar UI
        window.postMessage({
            type: 'WHL_RECOVER_NEW_MESSAGE',
            message: entrada,
            total: historicoRecover.length
        }, window.location.origin);
        
        console.log(`[WHL Recover] Mensagem recuperada de ${entrada.from}: ${entrada.body.substring(0, 50)}...`);
    }

    function tryRequireModule(moduleNames) {
        if (Array.isArray(moduleNames)) {
            for (const moduleName of moduleNames) {
                try {
                    const module = require(moduleName);
                    if (module) return module;
                } catch (e) {
                    // Module not found, try next
                }
            }
            return null;
        } else {
            try {
                return require(moduleNames);
            } catch (e) {
                return null;
            }
        }
    }

    // ===== HOOK PARA MENSAGENS APAGADAS =====
    class RenderableMessageHook extends Hook {
        register() {
            if (this.is_registered) return;
            super.register();
            
            if (!MODULES.PROCESS_RENDERABLE_MESSAGES) {
                console.warn('[WHL Hooks] PROCESS_RENDERABLE_MESSAGES module not available');
                return;
            }
            
            this.original_function = MODULES.PROCESS_RENDERABLE_MESSAGES.processRenderableMessages;
            
            MODULES.PROCESS_RENDERABLE_MESSAGES.processRenderableMessages = function (...args) {
                args[0] = args[0].filter((message) => !RenderableMessageHook.handle_message(message));
                return RenderableMessageHook.originalProcess(...args);
            };
            
            RenderableMessageHook.originalProcess = this.original_function;
            console.log('[WHL Hooks] RenderableMessageHook registered');
        }
        
        static handle_message(message) {
            // CORREÇÃO ISSUE 05: Cachear todas as mensagens antes de processar
            // Isso permite recuperar o conteúdo quando a mensagem for apagada
            cachearMensagem(message);
            
            return RenderableMessageHook.revoke_handler(message);
        }
        
        static revoke_handler(message) {
            const REVOKE_SUBTYPES = ['sender_revoke', 'admin_revoke'];
            if (!REVOKE_SUBTYPES.includes(message?.subtype)) return false;
            
            // Check if protocolMessageKey exists before accessing
            if (!message.protocolMessageKey) {
                console.warn('[WHL Hooks] protocolMessageKey not found in revoked message');
                return false;
            }
            
            // Salvar mensagem recuperada ANTES de transformar
            salvarMensagemRecuperada(message);
            
            // Notificar via postMessage para UI
            try {
                window.postMessage({
                    type: 'WHL_RECOVERED_MESSAGE',
                    payload: {
                        chatId: message?.id?.remote || message?.from?._serialized || null,
                        from: message?.author?._serialized || message?.from?._serialized || null,
                        ts: Date.now(),
                        kind: 'revoked',
                        preview: message?.body || '🚫 Esta mensagem foi excluída!'
                    }
                }, window.location.origin);
            } catch (e) {
                console.warn('[WHL Hooks] recover postMessage failed', e);
            }
            
            // Transformar mensagem apagada em mensagem visível
            message.type = 'chat';
            message.body = '🚫 Esta mensagem foi excluída!';
            message.quotedStanzaID = message.protocolMessageKey.id;
            message.quotedParticipant = message.protocolMessageKey?.participant || message.from;
            message.quotedMsg = { type: 'chat' };
            delete message.protocolMessageKey;
            delete message.subtype;
            
            return false; // Não filtrar, manter a mensagem
        }
    }

    // ===== HOOK PARA MENSAGENS EDITADAS =====
    class EditMessageHook extends Hook {
        register() {
            if (this.is_registered) return;
            super.register();
            
            if (!MODULES.PROCESS_EDIT_MESSAGE) {
                console.warn('[WHL Hooks] PROCESS_EDIT_MESSAGE module not available');
                return;
            }
            
            this.original_function = MODULES.PROCESS_EDIT_MESSAGE.processEditProtocolMsgs;
            
            MODULES.PROCESS_EDIT_MESSAGE.processEditProtocolMsgs = function (...args) {
                args[0] = args[0].filter((message) => {
                    return !EditMessageHook.handle_edited_message(message, ...args);
                });
                return EditMessageHook.originalEdit(...args);
            };
            
            MODULES.PROCESS_EDIT_MESSAGE.processEditProtocolMsg = MODULES.PROCESS_EDIT_MESSAGE.processEditProtocolMsgs;
            EditMessageHook.originalEdit = this.original_function;
            console.log('[WHL Hooks] EditMessageHook registered');
        }
        
        static handle_edited_message(message, arg1, arg2) {
            // CORREÇÃO ISSUE 05: Salvar mensagem editada no histórico ANTES de modificar
            salvarMensagemEditada(message);
            
            // Extract message content - body for text, caption for media
            const messageContent = message?.body || message?.caption || '[sem conteúdo]';
            message.type = 'chat';
            message.body = `✏️ Esta mensagem foi editada para: ${messageContent}`;
            
            if (!message.protocolMessageKey) return true;
            
            message.quotedStanzaID = message.protocolMessageKey.id;
            message.quotedParticipant = message.protocolMessageKey?.participant || message.from;
            message.quotedMsg = { type: 'chat' };
            delete message.latestEditMsgKey;
            delete message.protocolMessageKey;
            delete message.subtype;
            delete message.editMsgType;
            delete message.latestEditSenderTimestampMs;
            
            // Processar mensagem editada como nova mensagem
            if (MODULES.PROCESS_RENDERABLE_MESSAGES) {
                MODULES.PROCESS_RENDERABLE_MESSAGES.processRenderableMessages(
                    [message],
                    { 
                        author: message.from, 
                        type: 'chat', 
                        externalId: message.id.id, 
                        edit: -1, 
                        isHsm: false, 
                        chat: message.id.remote 
                    },
                    null,
                    { verifiedLevel: 'unknown' },
                    null,
                    0,
                    arg2 === undefined ? arg1 : arg2
                );
            }
            
            return true; // Filtrar a mensagem original de edição
        }
    }

    const hooks = {
        keep_revoked_messages: new RenderableMessageHook(),
        keep_edited_messages: new EditMessageHook(),
    };

    const initialize_modules = () => {
        MODULES = {
            PROCESS_EDIT_MESSAGE: tryRequireModule(WA_MODULES.PROCESS_EDIT_MESSAGE),
            PROCESS_RENDERABLE_MESSAGES: tryRequireModule(WA_MODULES.PROCESS_RENDERABLE_MESSAGES),
            QUERY_GROUP: tryRequireModule(WA_MODULES.QUERY_GROUP),
            CHAT_COLLECTION: tryRequireModule(WA_MODULES.CHAT_COLLECTION),
            CONTACT_STORE: tryRequireModule(WA_MODULES.CONTACT_STORE),
            GROUP_METADATA: tryRequireModule(WA_MODULES.GROUP_METADATA),
            // Novos módulos
            WID_FACTORY: tryRequireModule(WA_MODULES.WID_FACTORY),
            MEDIA_PREP: tryRequireModule(WA_MODULES.MEDIA_PREP),
            MEDIA_UPLOAD: tryRequireModule(WA_MODULES.MEDIA_UPLOAD),
            MSG_MODELS: tryRequireModule(WA_MODULES.MSG_MODELS),
        };
        
        console.log('[WHL Hooks] Modules initialized:', {
            PROCESS_EDIT_MESSAGE: !!MODULES.PROCESS_EDIT_MESSAGE,
            PROCESS_RENDERABLE_MESSAGES: !!MODULES.PROCESS_RENDERABLE_MESSAGES,
            QUERY_GROUP: !!MODULES.QUERY_GROUP,
            CHAT_COLLECTION: !!MODULES.CHAT_COLLECTION,
            CONTACT_STORE: !!MODULES.CONTACT_STORE,
            GROUP_METADATA: !!MODULES.GROUP_METADATA,
            WID_FACTORY: !!MODULES.WID_FACTORY,
            MEDIA_PREP: !!MODULES.MEDIA_PREP,
            MEDIA_UPLOAD: !!MODULES.MEDIA_UPLOAD,
            MSG_MODELS: !!MODULES.MSG_MODELS
        });
    };

    const start = () => {
        initialize_modules();
        
        for (const [name, hook] of Object.entries(hooks)) {
            try {
                hook.register();
            } catch (e) {
                console.error(`[WHL Hooks] Error registering ${name}:`, e);
            }
        }
        
        console.log('[WHL Hooks] ✅ Hooks registrados com sucesso!');
    };
    
    /**
     * Carregar grupos via require() interno
     */
    function carregarGrupos() {
        try {
            // Usar require() diretamente aqui, não Store global
            const CC = require('WAWebChatCollection');
            const ChatCollection = CC?.ChatCollection;
            
            if (!ChatCollection || !ChatCollection.getModelsArray) {
                console.warn('[WHL] ChatCollection não disponível para grupos');
                return { success: false, groups: [] };
            }
            
            const models = ChatCollection.getModelsArray() || [];
            const grupos = models
                .filter(c => c.id && c.id.server === 'g.us')
                .map(g => ({
                    id: g.id._serialized,
                    name: g.name || g.formattedTitle || g.contact?.name || 'Grupo sem nome',
                    participants: g.groupMetadata?.participants?.length || 0
                }));
            
            console.log(`[WHL] ${grupos.length} grupos encontrados via require()`);
            return { success: true, groups: grupos };
        } catch (error) {
            console.error('[WHL] Erro ao carregar grupos:', error);
            return { success: false, error: error.message, groups: [] };
        }
    }

    // Aguardar módulos carregarem
    const load_and_start = async () => {
        let attempts = 0;
        const maxAttempts = 50;
        
        while (attempts < maxAttempts) {
            try {
                // Testar se módulos do WhatsApp estão disponíveis
                // Use constant for consistency
                if (require(WA_MODULES.PROCESS_RENDERABLE_MESSAGES)) {
                    console.log('[WHL Hooks] WhatsApp modules detected, starting...');
                    start();
                    return;
                }
            } catch (e) {
                // Módulo ainda não disponível
            }
            
            attempts++;
            await new Promise(r => setTimeout(r, 100));
        }
        
        console.warn('[WHL Hooks] ⚠️ Módulos não encontrados após', maxAttempts, 'tentativas, iniciando mesmo assim...');
        start();
    };

    // Iniciar após delay para garantir que WhatsApp Web carregou
    setTimeout(load_and_start, 1000);
    
    // ===== FUNÇÕES DE ENVIO DIRETO (API) =====
    
    /**
     * Abre chat sem reload da página
     * @param {string} phoneNumber - Número no formato internacional (ex: 5511999998888)
     * @returns {Promise<boolean>} - true se chat foi aberto com sucesso
     */
    async function openChatDirect(phoneNumber) {
        try {
            if (!MODULES.WID_FACTORY || !MODULES.CHAT_COLLECTION) {
                console.warn('[WHL Hooks] Módulos necessários não disponíveis para openChatDirect');
                return false;
            }
            
            const wid = MODULES.WID_FACTORY.createWid(phoneNumber + '@c.us');
            const chat = await MODULES.CHAT_COLLECTION.find(wid);
            
            if (chat) {
                // Abrir chat usando API interna
                if (MODULES.CHAT_COLLECTION.setActive) {
                    await MODULES.CHAT_COLLECTION.setActive(chat);
                }
                return true;
            }
            return false;
        } catch (error) {
            console.error('[WHL Hooks] Erro ao abrir chat:', error);
            return false;
        }
    }
    
    /**
     * Envia mensagem de texto diretamente via API
     * @param {string} phoneNumber - Número no formato internacional
     * @param {string} text - Texto da mensagem
     * @returns {Promise<boolean>} - true se mensagem foi enviada
     */
    async function sendMessageDirect(phoneNumber, text) {
        try {
            if (!MODULES.WID_FACTORY || !MODULES.CHAT_COLLECTION) {
                console.warn('[WHL Hooks] Módulos necessários não disponíveis para sendMessageDirect');
                return false;
            }
            
            const wid = MODULES.WID_FACTORY.createWid(phoneNumber + '@c.us');
            let chat = await MODULES.CHAT_COLLECTION.find(wid);
            
            if (!chat) {
                // Criar novo chat se não existir
                console.log('[WHL Hooks] Chat não encontrado, criando novo...');
                chat = await MODULES.CHAT_COLLECTION.add(wid);
            }
            
            if (chat && chat.sendMessage) {
                await chat.sendMessage(text);
                console.log('[WHL Hooks] ✅ Mensagem enviada via API para', phoneNumber);
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('[WHL Hooks] Erro ao enviar mensagem:', error);
            return false;
        }
    }
    
    /**
     * Envia imagem diretamente via API
     * @param {string} phoneNumber - Número no formato internacional
     * @param {string} imageDataUrl - Data URL da imagem (base64)
     * @param {string} caption - Legenda da imagem (opcional)
     * @returns {Promise<boolean>} - true se imagem foi enviada
     */
    async function sendImageDirect(phoneNumber, imageDataUrl, caption = '') {
        try {
            if (!MODULES.WID_FACTORY || !MODULES.CHAT_COLLECTION) {
                console.warn('[WHL Hooks] Módulos necessários não disponíveis para sendImageDirect');
                return false;
            }
            
            const wid = MODULES.WID_FACTORY.createWid(phoneNumber + '@c.us');
            let chat = await MODULES.CHAT_COLLECTION.find(wid);
            
            if (!chat) {
                console.log('[WHL Hooks] Chat não encontrado para envio de imagem');
                return false;
            }
            
            // Converter data URL para blob
            const response = await fetch(imageDataUrl);
            const blob = await response.blob();
            const file = new File([blob], 'image.jpg', { type: blob.type || 'image/jpeg' });
            
            // Preparar mídia usando API interna
            if (MODULES.MEDIA_PREP && typeof MODULES.MEDIA_PREP.prepareMedia === 'function') {
                const mediaData = await MODULES.MEDIA_PREP.prepareMedia(file);
                
                // Validar que sendMessage aceita mídia
                if (!chat.sendMessage || typeof chat.sendMessage !== 'function') {
                    console.warn('[WHL Hooks] chat.sendMessage não disponível');
                    return false;
                }
                
                // Enviar com caption
                try {
                    await chat.sendMessage(mediaData, { caption });
                    console.log('[WHL Hooks] ✅ Imagem enviada via API para', phoneNumber);
                    return true;
                } catch (sendError) {
                    console.error('[WHL Hooks] Erro ao chamar sendMessage com mídia:', sendError);
                    return false;
                }
            } else {
                // Fallback: tentar envio simples se MEDIA_PREP não disponível
                console.log('[WHL Hooks] MEDIA_PREP não disponível, usando fallback');
                return false;
            }
        } catch (error) {
            console.error('[WHL Hooks] Erro ao enviar imagem:', error);
            return false;
        }
    }
    
    /**
     * Envia mensagem com indicador de digitação
     * @param {string} phoneNumber - Número no formato internacional
     * @param {string} text - Texto da mensagem
     * @param {number} typingDuration - Duração do indicador em ms
     * @returns {Promise<boolean>} - true se mensagem foi enviada
     */
    async function sendWithTypingIndicator(phoneNumber, text, typingDuration = 2000) {
        try {
            if (!MODULES.WID_FACTORY || !MODULES.CHAT_COLLECTION) {
                console.warn('[WHL Hooks] Módulos necessários não disponíveis');
                return false;
            }
            
            const wid = MODULES.WID_FACTORY.createWid(phoneNumber + '@c.us');
            let chat = await MODULES.CHAT_COLLECTION.find(wid);
            
            if (!chat) {
                return false;
            }
            
            // Mostrar "digitando..." para o destinatário
            if (chat.presence) {
                await chat.presence.subscribe();
                await chat.presence.update('composing');
            }
            
            // Aguardar tempo simulado (baseado no tamanho da mensagem)
            const delay = Math.min(typingDuration, text.length * 50);
            await new Promise(r => setTimeout(r, delay));
            
            // Enviar mensagem
            if (chat.sendMessage) {
                await chat.sendMessage(text);
            }
            
            // Parar indicador
            if (chat.presence) {
                await chat.presence.update('available');
            }
            
            console.log('[WHL Hooks] ✅ Mensagem enviada com indicador de digitação');
            return true;
        } catch (error) {
            console.error('[WHL Hooks] Erro ao enviar com typing indicator:', error);
            return false;
        }
    }
    
    /**
     * Extrai todos os contatos diretamente via API
     * @returns {Object} - Objeto com arrays de contatos (normal, archived, blocked, groups)
     */
    function extractAllContactsDirect() {
        const result = {
            normal: [],
            archived: [],
            blocked: [],
            groups: []
        };
        
        try {
            const chats = MODULES.CHAT_COLLECTION?.models || 
                         MODULES.CHAT_COLLECTION?.getModelsArray?.() || 
                         [];
            
            chats.forEach(chat => {
                const id = chat.id?._serialized;
                if (!id) return;
                
                if (id.endsWith('@g.us')) {
                    // Grupo
                    result.groups.push({
                        id,
                        name: chat.formattedTitle || chat.name || 'Grupo sem nome',
                        participants: chat.groupMetadata?.participants?.length || 0
                    });
                } else if (id.endsWith('@c.us')) {
                    // Contato individual
                    const phone = id.replace('@c.us', '');
                    if (chat.archive) {
                        result.archived.push(phone);
                    } else {
                        result.normal.push(phone);
                    }
                }
            });
            
            // Bloqueados (se disponível)
            if (MODULES.CONTACT_STORE?.models) {
                MODULES.CONTACT_STORE.models.forEach(contact => {
                    if (contact.isBlocked) {
                        const id = contact.id?._serialized;
                        if (id?.endsWith('@c.us')) {
                            result.blocked.push(id.replace('@c.us', ''));
                        }
                    }
                });
            }
            
            console.log('[WHL Hooks] ✅ Extração direta concluída:', {
                normal: result.normal.length,
                archived: result.archived.length,
                blocked: result.blocked.length,
                groups: result.groups.length
            });
        } catch (error) {
            console.error('[WHL Hooks] Erro ao extrair contatos:', error);
        }
        
        return result;
    }
    
    /**
     * Extração instantânea via API interna (método alternativo)
     * Tenta múltiplos métodos para garantir compatibilidade
     */
    function extrairContatosInstantaneo() {
        try {
            // Método 1: via ContactCollection require
            try {
                const ContactC = require('WAWebContactCollection');
                const contacts = ContactC?.ContactCollection?.getModelsArray?.() || [];
                if (contacts.length > 0) {
                    const contatos = contacts.map(contact => contact.id.user || contact.id._serialized?.replace('@c.us', ''));
                    console.log('[WHL] ✅ Extração via WAWebContactCollection:', contatos.length);
                    return { success: true, contacts: contatos, method: 'WAWebContactCollection' };
                }
            } catch(e) {
                console.log('[WHL] Método ContactCollection falhou:', e.message);
            }
            
            // Método 2: via ChatCollection require
            try {
                const CC = require('WAWebChatCollection');
                const chats = CC?.ChatCollection?.getModelsArray?.() || MODULES.CHAT_COLLECTION?.models || [];
                if (chats.length > 0) {
                    const contatos = chats
                        .filter(c => c?.id?.server !== 'g.us' && (c.id._serialized?.endsWith('@c.us') || c.id?.user))
                        .map(c => c.id.user || c.id._serialized?.replace('@c.us', ''));
                    console.log('[WHL] ✅ Extração via WAWebChatCollection:', contatos.length);
                    return { success: true, contacts: contatos, method: 'WAWebChatCollection' };
                }
            } catch(e) {
                console.log('[WHL] Método ChatCollection falhou:', e.message);
            }
            
            return { success: false, error: 'Nenhum método disponível' };
        } catch (error) {
            console.error('[WHL] Erro na extração instantânea:', error);
            return { success: false, error: error.message };
        }
    }
    
    
    /**
     * Extração de bloqueados
     */
    function extrairBloqueados() {
        try {
            // Usar WAWebBlocklistCollection
            try {
                const BC = require('WAWebBlocklistCollection');
                const blocklist = BC?.BlocklistCollection?.getModelsArray?.() || [];
                if (blocklist.length > 0) {
                    const bloqueados = blocklist.map(c => c.id.user || c.id._serialized?.replace('@c.us', ''));
                    console.log('[WHL] ✅ Bloqueados via WAWebBlocklistCollection:', bloqueados.length);
                    return { success: true, blocked: bloqueados };
                }
            } catch(e) {
                console.log('[WHL] Método BlocklistCollection falhou:', e.message);
            }
            
            return { success: false, error: 'Blocklist não disponível' };
        } catch (error) {
            console.error('[WHL] Erro ao extrair bloqueados:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * PR #76 ULTRA: Helper para obter nome do grupo
     */
    async function getGroupName(groupId) {
        try {
            const cols = await waitForCollections();
            if (!cols) return 'Grupo';
            
            const chat = cols.ChatCollection.get(groupId);
            return chat?.name || chat?.formattedTitle || 'Grupo';
        } catch (e) {
            return 'Grupo';
        }
    }

    // ===== WhatsAppExtractor v4.0 (TESTADO E FUNCIONANDO) =====
    // Módulo de extração de membros do WhatsApp - v4.0 (Virtual Scroll Fix)
    const WhatsAppExtractor = {
      
      // Estado
      state: {
        isExtracting: false,
        members: new Map(),
        groupName: '',
        debug: true
      },

      log(...args) {
        if (this.state.debug) {
          console.log('[WA Extractor]', ...args);
        }
      },

      delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
      },

      getGroupName() {
        const mainHeader = document.querySelector('#main header');
        if (mainHeader) {
          const titleSpan = mainHeader.querySelector('span[title]');
          if (titleSpan) {
            const title = titleSpan.getAttribute('title');
            if (title && !title.includes('+55') && title.length < 100) {
              return title;
            }
          }
          
          const spans = mainHeader.querySelectorAll('span[dir="auto"]');
          for (const span of spans) {
            const text = span.textContent?.trim();
            if (text && text.length < 50 && !text.includes('+55')) {
              return text;
            }
          }
        }
        return 'Grupo';
      },

      async openGroupInfo() {
        this.log('Tentando abrir info do grupo...');
        
        const header = document.querySelector('#main header');
        if (!header) {
          throw new Error('Header do chat não encontrado');
        }

        const clickable = header.querySelector('[role="button"]') || 
                         header.querySelector('div[tabindex="0"]') ||
                         header;
        
        clickable.click();
        await this.delay(1500);
        return true;
      },

      async clickSeeAllMembers() {
        this.log('Procurando botão "Ver todos"...');
        await this.delay(500);

        const membersSections = document.querySelectorAll('div[role="button"]');
        
        for (const section of membersSections) {
          const text = section.textContent || '';
          if (/\d+\s*(membros|members)/i.test(text) || 
              /ver tudo|see all|view all/i.test(text)) {
            if (text.length < 500) {
              section.click();
              await this.delay(2000);
              return true;
            }
          }
        }

        const allSpans = document.querySelectorAll('span');
        for (const span of allSpans) {
          const text = span.textContent?.toLowerCase().trim() || '';
          if (text === 'ver tudo' || text === 'see all') {
            const clickable = span.closest('[role="button"]') || span.closest('div[tabindex]') || span;
            clickable.click();
            await this.delay(2000);
            return true;
          }
        }

        return false;
      },

      findMembersModal() {
        const dialogs = document.querySelectorAll('[role="dialog"]');
        
        for (const dialog of dialogs) {
          const scrollables = dialog.querySelectorAll('div');
          
          for (const div of scrollables) {
            const style = window.getComputedStyle(div);
            const hasScroll = style.overflowY === 'auto' || style.overflowY === 'scroll';
            
            if (hasScroll && div.scrollHeight > div.clientHeight + 100) {
              const items = div.querySelectorAll('[role="listitem"], [role="row"], [data-testid*="cell"]');
              
              if (items.length > 0) {
                return { modal: dialog, scrollContainer: div };
              }
            }
          }
        }

        return null;
      },

      extractMemberData(element) {
        try {
          const spans = element.querySelectorAll('span[title], span[dir="auto"]');
          
          let name = '';
          let phone = '';
          let isAdmin = false;

          const fullText = element.textContent?.toLowerCase() || '';
          isAdmin = fullText.includes('admin');

          for (const span of spans) {
            const title = span.getAttribute('title');
            const text = (title || span.textContent || '').trim();
            
            if (!text || text.length < 2) continue;
            
            const lowerText = text.toLowerCase();
            if (['admin', 'admin do grupo', 'você', 'you', 'online', 'offline', 
                 'visto por último', 'last seen', 'pesquisar', 'search',
                 'membros', 'members', 'participantes'].some(s => lowerText === s || lowerText.startsWith(s + ' '))) {
              continue;
            }

            const cleanText = text.replace(/[\s\-()]/g, '');
            if (/^\+?\d{10,}$/.test(cleanText)) {
              phone = text;
              if (!name) name = text;
              continue;
            }

            if (!name && text.length >= 2 && text.length < 100) {
              name = text;
            }
          }

          if (!name) return null;

          const key = phone || name;

          return {
            key: key,
            name: name,
            phone: phone || '',
            isAdmin: isAdmin
          };

        } catch (error) {
          return null;
        }
      },

      isValidMember(name) {
        if (!name || name.length < 2) return false;
        
        const invalidPatterns = [
          /^(admin|você|you|pesquisar|search|ver tudo|see all)$/i,
          /^(membros|members|participantes|participants)$/i,
          /^(adicionar|add|sair|exit|denunciar|report)$/i,
          /^\d+\s*(membros|members)$/i
        ];
        
        for (const pattern of invalidPatterns) {
          if (pattern.test(name.trim())) {
            return false;
          }
        }
        
        return true;
      },

      extractVisibleMembers(container) {
        const itemSelectors = [
          '[role="listitem"]',
          '[role="row"]',
          '[data-testid="cell-frame-container"]',
          '[data-testid="list-item"]'
        ];

        let memberElements = [];
        
        for (const selector of itemSelectors) {
          const items = container.querySelectorAll(selector);
          if (items.length > memberElements.length) {
            memberElements = Array.from(items);
          }
        }

        let newMembersCount = 0;

        for (const element of memberElements) {
          const memberData = this.extractMemberData(element);
          
          if (memberData && memberData.name && this.isValidMember(memberData.name)) {
            if (!this.state.members.has(memberData.key)) {
              this.state.members.set(memberData.key, {
                name: memberData.name,
                phone: memberData.phone,
                isAdmin: memberData.isAdmin
              });
              newMembersCount++;
            }
          }
        }

        return newMembersCount;
      },

      async scrollAndCapture(modalInfo, onProgress) {
        const { scrollContainer } = modalInfo;
        
        if (!scrollContainer) {
          return;
        }

        this.state.members.clear();

        const CONFIG = {
          scrollStepPercent: 0.25,
          delayBetweenScrolls: 400,
          delayAfterCapture: 200,
          maxScrollAttempts: 500,
          noNewMembersLimit: 15,
        };

        let scrollAttempts = 0;
        let noNewMembersCount = 0;
        let lastMemberCount = 0;

        scrollContainer.scrollTop = 0;
        await this.delay(800);

        this.extractVisibleMembers(scrollContainer);

        while (scrollAttempts < CONFIG.maxScrollAttempts) {
          const scrollStep = scrollContainer.clientHeight * CONFIG.scrollStepPercent;
          
          scrollContainer.scrollTop += scrollStep;
          await this.delay(CONFIG.delayBetweenScrolls);

          const newMembers = this.extractVisibleMembers(scrollContainer);
          const totalMembers = this.state.members.size;

          if (onProgress) {
            onProgress({ loaded: totalMembers });
          }

          if (totalMembers > lastMemberCount) {
            noNewMembersCount = 0;
            lastMemberCount = totalMembers;
            await this.delay(CONFIG.delayAfterCapture);
          } else {
            noNewMembersCount++;
          }

          const atBottom = scrollContainer.scrollTop + scrollContainer.clientHeight >= scrollContainer.scrollHeight - 20;
          
          if (atBottom) {
            for (let i = 0; i < 3; i++) {
              await this.delay(300);
              this.extractVisibleMembers(scrollContainer);
            }
            break;
          }

          if (noNewMembersCount >= CONFIG.noNewMembersLimit) {
            break;
          }

          scrollAttempts++;
        }

        // Varredura final
        scrollContainer.scrollTop = 0;
        await this.delay(500);

        let finalSweepCount = 0;
        while (scrollContainer.scrollTop + scrollContainer.clientHeight < scrollContainer.scrollHeight - 10) {
          this.extractVisibleMembers(scrollContainer);
          scrollContainer.scrollTop += scrollContainer.clientHeight * 0.5;
          await this.delay(200);
          finalSweepCount++;
          if (finalSweepCount > 100) break;
        }

        this.extractVisibleMembers(scrollContainer);
      },

      async extractMembers(onProgress, onComplete, onError) {
        try {
          this.state.isExtracting = true;
          this.state.members.clear();

          this.state.groupName = this.getGroupName();

          onProgress?.({ status: 'Abrindo informações do grupo...', count: 0 });

          await this.openGroupInfo();
          await this.delay(1500);

          onProgress?.({ status: 'Expandindo lista de membros...', count: 0 });
          await this.clickSeeAllMembers();
          await this.delay(2000);

          onProgress?.({ status: 'Localizando lista de membros...', count: 0 });
          const modalInfo = this.findMembersModal();

          if (!modalInfo) {
            throw new Error('Modal de membros não encontrado');
          }

          onProgress?.({ status: 'Capturando membros...', count: 0 });
          await this.scrollAndCapture(modalInfo, (data) => {
            onProgress?.({ status: 'Capturando membros...', count: data.loaded });
          });

          this.state.isExtracting = false;

          const membersArray = Array.from(this.state.members.values());

          const result = {
            groupName: this.state.groupName,
            totalMembers: membersArray.length,
            members: membersArray
          };

          onComplete?.(result);
          return result;

        } catch (error) {
          this.state.isExtracting = false;
          onError?.(error.message);
          throw error;
        }
      }
    };

    window.WhatsAppExtractor = WhatsAppExtractor;

    /**
     * WhatsAppExtractor v4.0 - Extração de membros de grupo (APENAS DOM)
     * Substitui completamente o método antigo que retornava LIDs
     * @param {string} groupId - ID do grupo (_serialized)
     * @returns {Promise<Object>} Resultado com membros extraídos (números reais)
     */
    async function extractGroupMembersUltra(groupId) {
        console.log('[WHL] ═══════════════════════════════════════════');
        console.log('[WHL] 🚀 WhatsAppExtractor v4.0: Iniciando extração DOM');
        console.log('[WHL] 📱 Grupo:', groupId);
        console.log('[WHL] ═══════════════════════════════════════════');
        
        try {
            // PASSO 1: Abrir o chat do grupo na sidebar
            console.log('[WHL] PASSO 1: Abrindo chat do grupo...');
            const chatOpened = await abrirChatDoGrupo(groupId);
            
            if (!chatOpened) {
                console.warn('[WHL] Não foi possível abrir o chat, tentando continuar...');
            }
            
            await new Promise(r => setTimeout(r, 2000));
            
            // PASSO 2: Usar WhatsAppExtractor v4.0 para extrair membros
            console.log('[WHL] PASSO 2: Iniciando WhatsAppExtractor.extractMembers()...');
            
            const result = await WhatsAppExtractor.extractMembers(
                // onProgress
                (progress) => {
                    console.log('[WHL] Progresso:', progress.status, progress.count);
                    window.postMessage({
                        type: 'WHL_EXTRACTION_PROGRESS',
                        groupId: groupId,
                        phase: 'extracting',
                        message: progress.status,
                        progress: 50,
                        currentCount: progress.count
                    }, window.location.origin);
                },
                // onComplete
                (result) => {
                    console.log('[WHL] ✅ Extração concluída:', result.totalMembers, 'membros');
                },
                // onError
                (error) => {
                    console.error('[WHL] ❌ Erro na extração:', error);
                }
            );
            
            // PASSO 3: Converter resultado para formato compatível
            const members = result.members.map(m => {
                // Extrair apenas números reais (com telefone)
                if (m.phone) {
                    const cleaned = m.phone.replace(/[^\d]/g, '');
                    return cleaned;
                }
                return null;
            }).filter(Boolean);
            
            console.log('[WHL] ═══════════════════════════════════════════');
            console.log('[WHL] ✅ EXTRAÇÃO CONCLUÍDA');
            console.log('[WHL] 📱 Total de membros:', result.totalMembers);
            console.log('[WHL] 📞 Números extraídos:', members.length);
            console.log('[WHL] ═══════════════════════════════════════════');
            
            // Notificar conclusão
            window.postMessage({
                type: 'WHL_EXTRACTION_PROGRESS',
                groupId: groupId,
                phase: 'complete',
                message: `Concluído: ${members.length} números extraídos`,
                progress: 100,
                currentCount: members.length
            }, window.location.origin);
            
            return {
                success: true,
                members: members,
                count: members.length,
                groupName: result.groupName || 'Grupo',
                // Manter estrutura de stats para compatibilidade
                stats: {
                    domExtractor: members.length,
                    total: members.length
                }
            };
            
        } catch (e) {
            console.error('[WHL] ❌ Erro na extração:', e.message);
            
            // Notificar erro
            window.postMessage({
                type: 'WHL_EXTRACTION_PROGRESS',
                groupId: groupId,
                phase: 'error',
                message: 'Erro: ' + e.message,
                progress: 100
            }, window.location.origin);
            
            return { 
                success: false, 
                error: e.message, 
                members: [], 
                count: 0,
                stats: {
                    domExtractor: 0,
                    total: 0
                }
            };
        }
    }
    
    /**
     * Abre o chat do grupo usando API interna do WhatsApp
     * Mais confiável que buscar na sidebar
     * @param {string} groupId - ID do grupo (_serialized)
     * @returns {Promise<boolean>} - true se chat foi aberto
     */
    async function abrirChatDoGrupo(groupId) {
        console.log('[WHL] Abrindo chat via API interna:', groupId);
        
        try {
            // Método 1: Usar CMD.openChatAt (mais confiável)
            try {
                const CMD = require('WAWebCmd');
                const CC = require('WAWebChatCollection');
                
                const chat = CC?.ChatCollection?.get(groupId);
                if (chat) {
                    // Tentar openChatAt primeiro
                    if (CMD && typeof CMD.openChatAt === 'function') {
                        console.log('[WHL] Usando CMD.openChatAt...');
                        await CMD.openChatAt(chat);
                        await new Promise(r => setTimeout(r, 2000));
                        
                        // Verificar se o chat abriu (header deve mostrar o grupo)
                        const header = document.querySelector('#main header');
                        if (header) {
                            console.log('[WHL] ✅ Chat aberto via CMD.openChatAt');
                            return true;
                        }
                    }
                    
                    // Tentar openChatFromUnread
                    if (CMD && typeof CMD.openChatFromUnread === 'function') {
                        console.log('[WHL] Usando CMD.openChatFromUnread...');
                        await CMD.openChatFromUnread(chat);
                        await new Promise(r => setTimeout(r, 2000));
                        return true;
                    }
                }
            } catch (e) {
                console.warn('[WHL] CMD methods failed:', e.message);
            }
            
            // Método 2: Usar chat.open() se disponível
            try {
                const CC = require('WAWebChatCollection');
                const chat = CC?.ChatCollection?.get(groupId);
                
                if (chat && typeof chat.open === 'function') {
                    console.log('[WHL] Usando chat.open()...');
                    await chat.open();
                    await new Promise(r => setTimeout(r, 2000));
                    return true;
                }
            } catch (e) {
                console.warn('[WHL] chat.open() failed:', e.message);
            }
            
            // Método 3: Usar setActive no ChatCollection
            try {
                const CC = require('WAWebChatCollection');
                const chat = CC?.ChatCollection?.get(groupId);
                
                if (chat && CC?.ChatCollection?.setActive) {
                    console.log('[WHL] Usando ChatCollection.setActive...');
                    await CC.ChatCollection.setActive(chat);
                    await new Promise(r => setTimeout(r, 2000));
                    return true;
                }
            } catch (e) {
                console.warn('[WHL] setActive failed:', e.message);
            }
            
            // Método 4: Usar openChat via modelo
            try {
                const CC = require('WAWebChatCollection');
                const chat = CC?.ChatCollection?.get(groupId);
                
                if (chat) {
                    // Alguns builds têm select() ou activate()
                    if (typeof chat.select === 'function') {
                        await chat.select();
                        await new Promise(r => setTimeout(r, 2000));
                        return true;
                    }
                    
                    if (typeof chat.activate === 'function') {
                        await chat.activate();
                        await new Promise(r => setTimeout(r, 2000));
                        return true;
                    }
                }
            } catch (e) {
                console.warn('[WHL] Model methods failed:', e.message);
            }
            
            // Método 5: Fallback - buscar na sidebar (último recurso)
            console.log('[WHL] Tentando fallback: busca na sidebar...');
            const chatList = document.querySelector('#pane-side');
            if (chatList) {
                const allItems = chatList.querySelectorAll('[role="listitem"], [data-testid="cell-frame-container"]');
                const groupIdPrefix = groupId.split('@')[0];
                
                for (const item of allItems) {
                    const dataId = item.getAttribute('data-id') || '';
                    if (dataId.includes(groupId) || dataId.includes(groupIdPrefix)) {
                        console.log('[WHL] Grupo encontrado na sidebar, clicando...');
                        item.click();
                        await new Promise(r => setTimeout(r, 2000));
                        return true;
                    }
                }
                
                // Tentar scroll na sidebar para encontrar o grupo
                for (let i = 0; i < 10; i++) {
                    chatList.scrollTop += 500;
                    await new Promise(r => setTimeout(r, 300));
                    
                    const items = chatList.querySelectorAll('[role="listitem"], [data-testid="cell-frame-container"]');
                    for (const item of items) {
                        const dataId = item.getAttribute('data-id') || '';
                        if (dataId.includes(groupId) || dataId.includes(groupIdPrefix)) {
                            console.log('[WHL] Grupo encontrado após scroll, clicando...');
                            item.click();
                            await new Promise(r => setTimeout(r, 2000));
                            return true;
                        }
                    }
                }
            }
            
        } catch (e) {
            console.error('[WHL] Erro ao abrir chat:', e.message);
        }
        
        console.warn('[WHL] Não foi possível abrir o chat do grupo');
        return false;
    }
    
    /**
     * MANTER FUNÇÃO ANTIGA PARA COMPATIBILIDADE
     */
    async function extractGroupMembers(groupId) {
        return await extractGroupMembersUltra(groupId);
    }
    
    /**
     * Extração instantânea unificada - retorna tudo de uma vez
     * Usa WAWebChatCollection e WAWebBlocklistCollection via require()
     */
    function extrairTudoInstantaneo() {
        console.log('[WHL] 🚀 Iniciando extração instantânea via API interna...');
        
        const normal = extrairContatos();
        const archived = extrairArquivados();
        const blocked = extrairBloqueados();

        console.log(`[WHL] ✅ Extração completa: ${normal.count} normais, ${archived.count} arquivados, ${blocked.count} bloqueados`);

        return {
            success: true,
            normal: normal.contacts || [],
            archived: archived.archived || [],
            blocked: blocked.blocked || [],
            stats: {
                normal: normal.count || 0,
                archived: archived.count || 0,
                blocked: blocked.count || 0,
                total: (normal.count || 0) + (archived.count || 0) + (blocked.count || 0)
            }
        };
    }
    
    // ===== LISTENERS PARA NOVAS EXTRAÇÕES =====
    window.addEventListener('message', (event) => {
        // Validate origin and source for security (prevent cross-frame attacks)
        if (event.origin !== window.location.origin || event.source !== window) return;
        if (!event.data || !event.data.type) return;
        
        const { type } = event.data;
        
        if (type === 'WHL_EXTRACT_CONTACTS') {
            const result = extrairContatos();
            window.postMessage({ type: 'WHL_EXTRACT_CONTACTS_RESULT', ...result }, window.location.origin);
        }
        
        if (type === 'WHL_LOAD_GROUPS') {
            const result = extrairGrupos();
            window.postMessage({ type: 'WHL_LOAD_GROUPS_RESULT', ...result }, window.location.origin);
        }
        
        if (type === 'WHL_LOAD_ARCHIVED_BLOCKED') {
            const arquivados = extrairArquivados();
            const bloqueados = extrairBloqueados();
            
            window.postMessage({ 
                type: 'WHL_ARCHIVED_BLOCKED_RESULT', 
                archived: arquivados.archived || [],
                blocked: bloqueados.blocked || [],
                stats: {
                    archived: arquivados.count || 0,
                    blocked: bloqueados.count || 0
                }
            }, window.location.origin);
        }
        
        // EXTRAIR MEMBROS DO GRUPO
        if (type === 'WHL_EXTRACT_GROUP_MEMBERS') {
            const { groupId } = event.data;
            try {
                const CC = require('WAWebChatCollection');
                const chats = CC?.ChatCollection?.getModelsArray?.() || [];
                const chat = chats.find(c => c?.id?._serialized === groupId);
                const members = (chat?.groupMetadata?.participants || [])
                    .map(p => p?.id?._serialized)
                    .filter(Boolean)
                    .filter(id => id.endsWith('@c.us'))
                    .map(id => id.replace('@c.us', ''));
                
                window.postMessage({
                    type: 'WHL_GROUP_MEMBERS_RESULT',
                    groupId,
                    members: [...new Set(members)]
                }, window.location.origin);
            } catch (e) {
                window.postMessage({ type: 'WHL_GROUP_MEMBERS_ERROR', error: e.message }, window.location.origin);
            }
        }
        
        // PR #71: Listener para extrair membros por ID com código testado e validado
        if (type === 'WHL_EXTRACT_GROUP_MEMBERS_BY_ID') {
            const { groupId, requestId } = event.data;
            console.log('[WHL] Recebido pedido de extração de membros:', groupId);
            
            (async () => {
                try {
                    const result = await extractGroupMembers(groupId);
                    console.log('[WHL] Enviando resultado:', result);
                    window.postMessage({
                        type: 'WHL_EXTRACT_GROUP_MEMBERS_RESULT',
                        requestId,
                        ...result
                    }, window.location.origin);
                } catch (error) {
                    console.error('[WHL] Erro no listener:', error);
                    window.postMessage({
                        type: 'WHL_EXTRACT_GROUP_MEMBERS_RESULT',
                        requestId,
                        success: false,
                        error: error.message,
                        members: [],
                        count: 0
                    }, window.location.origin);
                }
            })();
        }
        
        if (type === 'WHL_EXTRACT_ALL') {
            const result = extrairTudo();
            window.postMessage({ type: 'WHL_EXTRACT_ALL_RESULT', ...result }, window.location.origin);
        }
        
        // RECOVER MESSAGES - Since hooks are automatic, just acknowledge
        if (type === 'WHL_RECOVER_ENABLE') {
            console.log('[WHL Hooks] Recover is always enabled with hooks approach');
        }
        
        if (type === 'WHL_RECOVER_DISABLE') {
            console.log('[WHL Hooks] Note: Recover hooks cannot be disabled once loaded');
        }
        
        // GET RECOVER HISTORY
        if (type === 'WHL_GET_RECOVER_HISTORY') {
            // Carregar do localStorage se array vazio
            if (historicoRecover.length === 0) {
                try {
                    const saved = localStorage.getItem('whl_recover_history');
                    if (saved) {
                        const parsed = JSON.parse(saved);
                        historicoRecover.push(...parsed);
                    }
                } catch(e) {
                    console.warn('[WHL] Erro ao carregar histórico:', e);
                }
            }
            
            window.postMessage({
                type: 'WHL_RECOVER_HISTORY_RESULT',
                history: historicoRecover,
                total: historicoRecover.length
            }, window.location.origin);
        }
        
        // CLEAR RECOVER HISTORY
        if (type === 'WHL_CLEAR_RECOVER_HISTORY') {
            historicoRecover.length = 0;
            localStorage.removeItem('whl_recover_history');
            window.postMessage({ type: 'WHL_RECOVER_HISTORY_CLEARED' }, window.location.origin);
        }
    });
    
    // ===== LISTENERS FOR SEND FUNCTIONS =====
    window.addEventListener('message', async (event) => {
        // Validate origin and source for security (prevent cross-frame attacks)
        if (event.origin !== window.location.origin || event.source !== window) return;
        if (!event.data) return;
        
        // Enviar apenas TEXTO
        if (event.data.type === 'WHL_SEND_MESSAGE_API') {
            const { phone, message, requestId } = event.data;
            const result = await enviarMensagemAPI(phone, message);
            window.postMessage({ type: 'WHL_SEND_MESSAGE_API_RESULT', requestId, ...result }, window.location.origin);
        }
        
        // Enviar apenas IMAGEM
        if (event.data.type === 'WHL_SEND_IMAGE_DOM') {
            const { base64Image, caption, requestId } = event.data;
            const result = await enviarImagemDOM(base64Image, caption);
            window.postMessage({ type: 'WHL_SEND_IMAGE_DOM_RESULT', requestId, ...result }, window.location.origin);
        }
        
        // CORREÇÃO BUG 2: Enviar IMAGEM para número específico (abre o chat primeiro)
        if (event.data.type === 'WHL_SEND_IMAGE_TO_NUMBER') {
            const { phone, image, caption, requestId } = event.data;
            (async () => {
                try {
                    const result = await enviarImagemParaNumero(phone, image, caption);
                    window.postMessage({
                        type: 'WHL_SEND_IMAGE_TO_NUMBER_RESULT',
                        requestId,
                        ...result
                    }, window.location.origin);
                } catch (error) {
                    window.postMessage({
                        type: 'WHL_SEND_IMAGE_TO_NUMBER_ERROR',
                        requestId,
                        error: error.message
                    }, window.location.origin);
                }
            })();
        }
        
        // Enviar TEXTO + IMAGEM
        if (event.data.type === 'WHL_SEND_COMPLETE') {
            const { phone, texto, base64Image, caption, requestId } = event.data;
            const result = await enviarMensagemCompleta(phone, texto, base64Image, caption);
            window.postMessage({ type: 'WHL_SEND_COMPLETE_RESULT', requestId, ...result }, window.location.origin);
        }
        
        // EXTRAIR MEMBROS DE GRUPO VIA DOM
        if (event.data.type === 'WHL_EXTRACT_GROUP_CONTACTS_DOM') {
            const { requestId, groupId } = event.data;
            (async () => {
                try {
                    const result = await extractGroupContacts(groupId);
                    window.postMessage({ 
                        type: 'WHL_EXTRACT_GROUP_CONTACTS_DOM_RESULT', 
                        requestId, 
                        ...result 
                    }, window.location.origin);
                } catch (error) {
                    window.postMessage({ 
                        type: 'WHL_EXTRACT_GROUP_CONTACTS_DOM_ERROR', 
                        requestId, 
                        error: error.message 
                    }, window.location.origin);
                }
            })();
        }
        
        // EXTRAIR ARQUIVADOS E BLOQUEADOS
        if (event.data.type === 'WHL_EXTRACT_ARCHIVED_BLOCKED_DOM') {
            const { requestId } = event.data;
            (async () => {
                try {
                    const result = await extrairArquivadosBloqueadosDOM();
                    window.postMessage({ 
                        type: 'WHL_EXTRACT_ARCHIVED_BLOCKED_DOM_RESULT', 
                        requestId,
                        ...result,
                        success: true
                    }, window.location.origin);
                } catch (error) {
                    window.postMessage({ 
                        type: 'WHL_EXTRACT_ARCHIVED_BLOCKED_DOM_ERROR', 
                        requestId, 
                        error: error.message 
                    }, window.location.origin);
                }
            })();
        }
        
        // Listener para aguardar confirmação visual
        if (event.data.type === 'WHL_WAIT_VISUAL_CONFIRMATION') {
            const { message, timeout, requestId } = event.data;
            (async () => {
                try {
                    const result = await aguardarConfirmacaoVisual(message, timeout || 10000);
                    window.postMessage({ 
                        type: 'WHL_VISUAL_CONFIRMATION_RESULT', 
                        requestId,
                        ...result
                    }, window.location.origin);
                } catch (error) {
                    window.postMessage({ 
                        type: 'WHL_VISUAL_CONFIRMATION_ERROR', 
                        requestId, 
                        error: error.message 
                    }, window.location.origin);
                }
            })();
        }
    });
    
    // ===== MESSAGE LISTENERS PARA API DIRETA =====
    window.addEventListener('message', async (event) => {
        // Validate origin and source for security (prevent cross-frame attacks)
        if (event.origin !== window.location.origin || event.source !== window) return;
        if (!event.data || !event.data.type) return;
        
        const { type } = event.data;
        
        // ENVIAR MENSAGEM DE TEXTO DIRETAMENTE
        if (type === 'WHL_SEND_MESSAGE_DIRECT') {
            const { phone, message, useTyping } = event.data;
            try {
                let success;
                if (useTyping) {
                    success = await sendWithTypingIndicator(phone, message);
                } else {
                    success = await sendMessageDirect(phone, message);
                }
                
                window.postMessage({ 
                    type: 'WHL_SEND_MESSAGE_RESULT', 
                    success, 
                    phone 
                }, window.location.origin);
            } catch (error) {
                window.postMessage({ 
                    type: 'WHL_SEND_MESSAGE_RESULT', 
                    success: false, 
                    phone, 
                    error: error.message 
                }, window.location.origin);
            }
        }
        
        // ENVIAR IMAGEM DIRETAMENTE
        if (type === 'WHL_SEND_IMAGE_DIRECT') {
            const { phone, imageData, caption } = event.data;
            try {
                const success = await sendImageDirect(phone, imageData, caption);
                window.postMessage({ 
                    type: 'WHL_SEND_IMAGE_RESULT', 
                    success, 
                    phone 
                }, window.location.origin);
            } catch (error) {
                window.postMessage({ 
                    type: 'WHL_SEND_IMAGE_RESULT', 
                    success: false, 
                    phone, 
                    error: error.message 
                }, window.location.origin);
            }
        }
        
        // EXTRAIR TODOS OS CONTATOS DIRETAMENTE
        if (type === 'WHL_EXTRACT_ALL_DIRECT') {
            try {
                const result = extractAllContactsDirect();
                window.postMessage({ 
                    type: 'WHL_EXTRACT_ALL_RESULT', 
                    ...result 
                }, window.location.origin);
            } catch (error) {
                window.postMessage({ 
                    type: 'WHL_EXTRACT_ALL_ERROR', 
                    error: error.message 
                }, window.location.origin);
            }
        }
        
        // EXTRAÇÃO INSTANTÂNEA (novo método alternativo)
        if (type === 'WHL_EXTRACT_INSTANT') {
            try {
                const result = extrairContatosInstantaneo();
                window.postMessage({ 
                    type: 'WHL_EXTRACT_INSTANT_RESULT', 
                    ...result 
                }, window.location.origin);
            } catch (error) {
                window.postMessage({ 
                    type: 'WHL_EXTRACT_INSTANT_ERROR', 
                    error: error.message 
                }, window.location.origin);
            }
        }
        
        // EXTRAÇÃO COMPLETA INSTANTÂNEA (contatos, arquivados, bloqueados)
        if (type === 'WHL_EXTRACT_ALL_INSTANT') {
            const { requestId } = event.data;
            (async () => {
                try {
                    const result = extrairTudoInstantaneo();
                    window.postMessage({
                        type: 'WHL_EXTRACT_ALL_INSTANT_RESULT',
                        requestId,
                        ...result
                    }, window.location.origin);
                } catch (error) {
                    window.postMessage({
                        type: 'WHL_EXTRACT_ALL_INSTANT_ERROR',
                        requestId,
                        error: error.message
                    }, window.location.origin);
                }
            })();
        }
    });

    // ===== EXTRAÇÃO INSTANTÂNEA =====
    window.addEventListener('message', (event) => {
        // Validate origin and source for security (prevent cross-frame attacks)
        if (event.origin !== window.location.origin || event.source !== window) return;
        if (event.data?.type !== 'WHL_EXTRACT_INSTANT') return;
        
        try {
            const CC = require('WAWebChatCollection');
            const ContactC = require('WAWebContactCollection');
            const chats = CC?.ChatCollection?.getModelsArray?.() || [];
            const contacts = ContactC?.ContactCollection?.getModelsArray?.() || [];

            const phoneFromId = (id) => (id?._serialized || '').replace('@c.us', '');
            const nums = new Set();

            chats.forEach(c => {
                const id = phoneFromId(c?.id);
                if (/^\d{8,15}$/.test(id)) nums.add(id);
            });
            
            contacts.forEach(ct => {
                const id = phoneFromId(ct?.id);
                if (/^\d{8,15}$/.test(id)) nums.add(id);
            });

            console.log(`[WHL Hooks] Extração instantânea: ${nums.size} números`);
            window.postMessage({ type: 'WHL_EXTRACT_INSTANT_RESULT', numbers: [...nums] }, window.location.origin);
        } catch (e) {
            console.error('[WHL Hooks] Erro na extração instantânea:', e);
            window.postMessage({ type: 'WHL_EXTRACT_INSTANT_ERROR', error: e.message }, window.location.origin);
        }
    });
    
    // ===== BACKUP FUNCTIONALITY =====
    
    /**
     * Get all chats (contacts and groups) for backup
     */
    function getBackupContacts() {
        try {
            const CC = require('WAWebChatCollection');
            const chats = CC?.ChatCollection?.getModelsArray?.() || [];
            
            const contacts = chats.map(c => {
                const id = c.id?._serialized || '';
                const name = c.name || c.formattedTitle || c.contact?.name || 'Sem nome';
                const isGroup = id.endsWith('@g.us');
                const memberCount = isGroup ? (c.groupMetadata?.participants?.length || 0) : 0;
                
                return {
                    id,
                    name,
                    isGroup,
                    memberCount
                };
            }).filter(c => c.id);
            
            console.log('[WHL Backup] Found', contacts.length, 'chats');
            return { success: true, contacts };
        } catch (e) {
            console.error('[WHL Backup] Error getting contacts:', e);
            return { success: false, error: e.message, contacts: [] };
        }
    }
    
    /**
     * Get chat info by ID
     */
    function getBackupChatInfo(chatId) {
        try {
            const CC = require('WAWebChatCollection');
            const chat = CC?.ChatCollection?.get(chatId);
            
            if (!chat) {
                return { success: false, error: 'Chat não encontrado' };
            }
            
            const isGroup = chatId.endsWith('@g.us');
            const memberCount = isGroup ? (chat.groupMetadata?.participants?.length || 0) : 0;
            
            return {
                success: true,
                chat: {
                    id: chatId,
                    name: chat.name || chat.formattedTitle || 'Sem nome',
                    isGroup,
                    memberCount
                }
            };
        } catch (e) {
            console.error('[WHL Backup] Error getting chat info:', e);
            return { success: false, error: e.message };
        }
    }
    
    /**
     * Get messages from a chat with loadEarlierMsgs approach
     */
    async function getActiveChatMessages(chatId, limit = 10000) {
        try {
            console.log('[WHL Backup] Loading messages for chat:', chatId, 'limit:', limit);
            
            const CC = require('WAWebChatCollection');
            const chat = CC?.ChatCollection?.get(chatId);
            
            if (!chat) {
                throw new Error('Chat não encontrado');
            }
            
            // Get message collection
            const msgs = chat.msgs;
            if (!msgs) {
                throw new Error('Message collection não disponível');
            }
            
            // Load earlier messages
            let loadedCount = msgs.length || 0;
            let attempts = 0;
            const maxAttempts = Math.ceil(limit / 30); // WhatsApp loads ~30 msgs at a time
            
            while (loadedCount < limit && attempts < maxAttempts) {
                try {
                    // Try to load earlier messages
                    if (chat.loadEarlierMsgs) {
                        await chat.loadEarlierMsgs();
                    }
                    
                    await new Promise(r => setTimeout(r, 300)); // Wait for loading
                    
                    const newCount = msgs.length || 0;
                    if (newCount === loadedCount) {
                        // No more messages available
                        break;
                    }
                    loadedCount = newCount;
                    attempts++;
                    
                    // Report progress
                    window.postMessage({
                        type: 'WHL_BACKUP_PROGRESS',
                        progress: Math.min(Math.round((loadedCount / limit) * 50), 50), // 0-50% for loading
                        status: 'Carregando mensagens',
                        currentCount: loadedCount,
                        totalCount: limit
                    }, window.location.origin);
                } catch (e) {
                    console.warn('[WHL Backup] Error loading earlier messages:', e);
                    break;
                }
            }
            
            // Extract messages
            const messages = [];
            const msgArray = msgs.getModelsArray?.() || [];
            
            for (const msg of msgArray) {
                if (messages.length >= limit) break;
                
                const msgData = {
                    id: msg.id?.id || '',
                    from: extractPhoneNumber(msg),
                    body: msg.body || msg.caption || '',
                    timestamp: msg.t ? msg.t * 1000 : Date.now(),
                    type: msg.type || 'chat',
                    isFromMe: msg.id?.fromMe || false
                };
                
                messages.push(msgData);
            }
            
            console.log('[WHL Backup] Extracted', messages.length, 'messages');
            return { success: true, messages, count: messages.length };
        } catch (e) {
            console.error('[WHL Backup] Error getting messages:', e);
            return { success: false, error: e.message, messages: [] };
        }
    }
    
    /**
     * Generate HTML export
     */
    function generateHTML(messages, settings, chatName) {
        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Backup - ${chatName}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0b141a; color: #e9edef; padding: 20px; }
        .container { max-width: 800px; margin: 0 auto; }
        .header { background: #202c33; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .message { background: #202c33; padding: 12px; margin-bottom: 8px; border-radius: 8px; }
        .message.from-me { background: #005c4b; margin-left: 50px; }
        .message-sender { font-weight: bold; color: #25d366; font-size: 13px; margin-bottom: 4px; }
        .message-body { word-wrap: break-word; }
        .message-time { font-size: 11px; color: #8696a0; margin-top: 4px; text-align: right; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>💾 ${chatName}</h1>
            <p>Exportado em: ${new Date().toLocaleString('pt-BR')}</p>
            <p>Total de mensagens: ${messages.length}</p>
        </div>
        ${messages.map(m => `
            <div class="message ${m.isFromMe ? 'from-me' : ''}">
                ${settings.includeSender ? `<div class="message-sender">${m.from}</div>` : ''}
                <div class="message-body">${escapeHtml(m.body)}</div>
                ${settings.includeDate ? `<div class="message-time">${new Date(m.timestamp).toLocaleString('pt-BR')}</div>` : ''}
            </div>
        `).join('')}
    </div>
</body>
</html>`;
        return html;
    }
    
    /**
     * Generate CSV export
     */
    function generateCSV(messages, settings) {
        const headers = [];
        if (settings.includeSender) headers.push('Remetente');
        headers.push('Mensagem');
        if (settings.includeDate) headers.push('Data/Hora');
        
        const rows = [headers.join(',')];
        
        messages.forEach(m => {
            const row = [];
            if (settings.includeSender) row.push(`"${(m.from || '').replace(/"/g, '""')}"`);
            row.push(`"${(m.body || '').replace(/"/g, '""')}"`);
            if (settings.includeDate) row.push(`"${new Date(m.timestamp).toLocaleString('pt-BR')}"`);
            rows.push(row.join(','));
        });
        
        return '\uFEFF' + rows.join('\n'); // BOM for Excel UTF-8
    }
    
    /**
     * Generate JSON export
     */
    function generateJSON(messages, settings, chatName) {
        return JSON.stringify({
            chat: chatName,
            exportedAt: new Date().toISOString(),
            messageCount: messages.length,
            settings: settings,
            messages: messages
        }, null, 2);
    }
    
    /**
     * Generate TXT export
     */
    function generateTXT(messages, settings, chatName) {
        const lines = [
            `Backup de Conversa: ${chatName}`,
            `Exportado em: ${new Date().toLocaleString('pt-BR')}`,
            `Total de mensagens: ${messages.length}`,
            '',
            '='repeat(60),
            ''
        ];
        
        messages.forEach(m => {
            const parts = [];
            if (settings.includeDate) {
                parts.push(`[${new Date(m.timestamp).toLocaleString('pt-BR')}]`);
            }
            if (settings.includeSender) {
                parts.push(`${m.from}:`);
            }
            parts.push(m.body);
            lines.push(parts.join(' '));
            lines.push('');
        });
        
        return lines.join('\n');
    }
    
    /**
     * Download generated file
     */
    function downloadBackupFile(content, fileName, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    /**
     * Start backup export
     */
    async function startBackupExport(settings) {
        try {
            console.log('[WHL Backup] Starting export with settings:', settings);
            
            // Get chat info
            const chatInfo = getBackupChatInfo(settings.chatId);
            if (!chatInfo.success) {
                throw new Error(chatInfo.error);
            }
            
            const chatName = chatInfo.chat.name;
            
            // Load messages
            window.postMessage({
                type: 'WHL_BACKUP_PROGRESS',
                progress: 10,
                status: 'Carregando mensagens...',
                currentCount: 0,
                totalCount: settings.limit
            }, window.location.origin);
            
            const msgResult = await getActiveChatMessages(settings.chatId, settings.limit);
            if (!msgResult.success) {
                throw new Error(msgResult.error);
            }
            
            let messages = msgResult.messages;
            
            // Apply date filter if needed
            if (settings.dateFrom || settings.dateTo) {
                const fromTs = settings.dateFrom ? new Date(settings.dateFrom).getTime() : 0;
                const toTs = settings.dateTo ? new Date(settings.dateTo).getTime() : Date.now();
                
                messages = messages.filter(m => {
                    return m.timestamp >= fromTs && m.timestamp <= toTs;
                });
            }
            
            // Generate file
            window.postMessage({
                type: 'WHL_BACKUP_PROGRESS',
                progress: 60,
                status: 'Gerando arquivo...',
                currentCount: messages.length,
                totalCount: messages.length
            }, window.location.origin);
            
            let content, fileName, mimeType;
            
            switch (settings.format) {
                case 'html':
                    content = generateHTML(messages, settings, chatName);
                    fileName = `backup_${chatName}_${Date.now()}.html`;
                    mimeType = 'text/html;charset=utf-8';
                    break;
                case 'csv':
                    content = generateCSV(messages, settings);
                    fileName = `backup_${chatName}_${Date.now()}.csv`;
                    mimeType = 'text/csv;charset=utf-8';
                    break;
                case 'json':
                    content = generateJSON(messages, settings, chatName);
                    fileName = `backup_${chatName}_${Date.now()}.json`;
                    mimeType = 'application/json;charset=utf-8';
                    break;
                case 'txt':
                    content = generateTXT(messages, settings, chatName);
                    fileName = `backup_${chatName}_${Date.now()}.txt`;
                    mimeType = 'text/plain;charset=utf-8';
                    break;
                default:
                    throw new Error('Formato inválido');
            }
            
            // Download file
            window.postMessage({
                type: 'WHL_BACKUP_PROGRESS',
                progress: 90,
                status: 'Baixando arquivo...'
            }, window.location.origin);
            
            downloadBackupFile(content, fileName, mimeType);
            
            window.postMessage({
                type: 'WHL_BACKUP_PROGRESS',
                progress: 100,
                status: 'Concluído!'
            }, window.location.origin);
            
            return { success: true, fileName };
        } catch (e) {
            console.error('[WHL Backup] Export error:', e);
            return { success: false, error: e.message };
        }
    }
    
    // ===== BACKUP MESSAGE LISTENERS =====
    window.addEventListener('message', async (event) => {
        if (event.origin !== window.location.origin || event.source !== window) return;
        if (!event.data || !event.data.type) return;
        
        const { type } = event.data;
        
        if (type === 'WHL_BACKUP_GET_CONTACTS') {
            const result = getBackupContacts();
            window.postMessage({ type: 'WHL_BACKUP_GET_CONTACTS_RESULT', ...result }, window.location.origin);
        }
        
        if (type === 'WHL_BACKUP_GET_CHAT_INFO') {
            const { chatId } = event.data;
            const result = getBackupChatInfo(chatId);
            window.postMessage({ type: 'WHL_BACKUP_GET_CHAT_INFO_RESULT', ...result }, window.location.origin);
        }
        
        if (type === 'WHL_BACKUP_START') {
            const { settings } = event.data;
            const result = await startBackupExport(settings);
            window.postMessage({ type: 'WHL_BACKUP_START_RESULT', ...result }, window.location.origin);
        }
        
        if (type === 'WHL_BACKUP_CANCEL') {
            // TODO: Implement cancellation logic
            window.postMessage({ type: 'WHL_BACKUP_CANCEL_RESULT', success: true }, window.location.origin);
        }
    });
    
    // Expose helper functions for use by sidepanel and other components
    window.WHL_MessageContentHelpers = {
        isBase64Image: isBase64Image,
        toDataUrl: toDataUrl,
        detectMessageType: detectMessageType
    };
};

// Executar apenas uma vez
if (!window.whl_hooks_loaded) {
    window.whl_hooks_loaded = true;
    console.log('[WHL Hooks] Initializing WPP Hooks...');
    window.whl_hooks_main();
}
