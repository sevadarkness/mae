/**
 * sidepanel-router.js - WhatsHybrid Lite Fusion
 *
 * Objetivo:
 * - Trocar as views do Side Panel de acordo com o botão do TopNav (Principal / Extrator / Grupos / Recover / Config).
 * - Manter o "motor" (lógica original) rodando no content script (WhatsApp Web), sem reescrever a lógica de envio.
 * - Devolver no Side Panel o mesmo conjunto de funcionalidades do módulo original (preview, CSV, imagem, tabela, etc.).
 */

(() => {
  'use strict';

  // View names come from the Top Panel (content/top-panel-injector.js)
  // and are persisted by background.js in chrome.storage.local (whl_active_view).
  // Keep aliases to avoid blank panels when a name changes (e.g. "groups" vs "grupos").
  const VIEW_MAP = {
    principal: 'whlViewPrincipal',
    extrator: 'whlViewExtrator',

    // Grupos / Group Extractor v6
    groups: 'whlViewGroups',
    grupos: 'whlViewGroups',

    recover: 'whlViewRecover',
    config: 'whlViewConfig',
  };

  const MAX_QUEUE_RENDER = 500;   // evita travar o side panel em filas gigantes
  const MAX_RECOVER_RENDER = 200;

  let currentView = null;

  // ========= Utils =========
  function $(id) { return document.getElementById(id); }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function fmtTimeHM(d = new Date()) {
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  function normalizeFromId(from) {
    let s = String(from ?? '').trim();
    if (!s) return '';
    // remove sufixos comuns
    s = s
      .replace(/@c\.us/g, '')
      .replace(/@s\.whatsapp\.net/g, '')
      .replace(/@g\.us/g, '')
      .replace(/@broadcast/g, '');
    return s;
  }

  function joinNonEmptyLines(...parts) {
    return parts
      .map(p => (p || '').trim())
      .filter(Boolean)
      .join('\n')
      .replace(/\n{3,}/g, '\n\n');
  }

  async function copyToClipboard(text) {
    const t = String(text ?? '');
    if (!t.trim()) return false;
    try {
      await navigator.clipboard.writeText(t);
      return true;
    } catch (e) {
      // fallback
      try {
        const ta = document.createElement('textarea');
        ta.value = t;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        const ok = document.execCommand('copy');
        ta.remove();
        return ok;
      } catch {
        return false;
      }
    }
  }

  // ========= Messaging =========
  function sendToActiveTab(payload) {
    return new Promise((resolve, reject) => {
      chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
        const tab = (tabs || []).find(t => (t.url || '').includes('web.whatsapp.com'));
        if (!tab?.id) return reject(new Error('Abra o WhatsApp Web (web.whatsapp.com) e tente novamente.'));
        chrome.tabs.sendMessage(tab.id, payload, (resp) => {
          const err = chrome.runtime.lastError;
          if (err) return reject(new Error(err.message || String(err)));
          resolve(resp);
        });
      });
    });
  }

  async function motor(cmd, data = {}) {
    const resp = await sendToActiveTab({ type: 'WHL_SIDE_PANEL', cmd, ...data });
    if (resp && resp.success === false) {
      throw new Error(resp.message || 'Falha no comando: ' + cmd);
    }
    return resp;
  }

  // ========= View Router =========
  function showView(viewName) {
    // Defensive: if the stored view name is unknown, fall back to principal
    const safeView = VIEW_MAP[viewName] ? viewName : 'principal';
    currentView = safeView;

    const activeId = VIEW_MAP[safeView];
    // Avoid duplicate toggles when VIEW_MAP has aliases (e.g. groups/grupos)
    const ids = Array.from(new Set(Object.values(VIEW_MAP)));
    ids.forEach((id) => {
      const el = $(id);
      if (!el) return;
      el.classList.toggle('hidden', id !== activeId);
    });

    // Hooks por view
    stopIntervals();
    if (safeView === 'principal') {
      principalInit();      // garante listeners e render inicial
      principalRefresh(true);
      startPrincipalInterval();
    } else if (safeView === 'extrator') {
      extratorInit();
      extratorRefresh();
    } else if (safeView === 'recover') {
      recoverInit();
      recoverRefresh();
      startRecoverInterval();
    } else if (safeView === 'config') {
      configInit();
      configLoad();
    } else if (safeView === 'grupos' || safeView === 'groups') {
      // UI do v6 já tem seu próprio JS (sidepanel.js). Nada a fazer aqui.
    }
  }

  async function loadCurrentView() {
    const { whl_active_view } = await chrome.storage.local.get('whl_active_view');
    showView(whl_active_view || 'principal');
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.whl_active_view?.newValue) {
      showView(changes.whl_active_view.newValue);
    }
  });

  // ========= Intervals =========
  let principalInterval = null;
  let recoverInterval = null;

  // Principal live-refresh state (to keep queue/table status updating in real time)
  let principalLastLight = null;
  let principalLastFullAt = 0;

  function startPrincipalInterval() {
    if (principalInterval) clearInterval(principalInterval);

    // Faster tick on Principal view so the queue status updates live
    principalInterval = setInterval(() => {
      if (currentView === 'principal') principalTick();
    }, 900);
  }

  function startRecoverInterval() {
    if (recoverInterval) clearInterval(recoverInterval);
    recoverInterval = setInterval(() => {
      if (currentView === 'recover') recoverRefresh(false);
    }, 3000);
  }

  function stopIntervals() {
    if (principalInterval) clearInterval(principalInterval);
    principalInterval = null;
    if (recoverInterval) clearInterval(recoverInterval);
    recoverInterval = null;
  }

  // ========= Principal =========
  let principalBound = false;
  let principalImageData = null;
  let principalCsvName = null;
  let principalDebounceTimer = null;

  const EMOJIS = [
    '😀','😁','😂','🤣','😊','😍','😘','😎','🤝','🙏','👍','👎','🔥','💡','✨',
    '🎉','✅','❌','⚠️','📌','📎','📞','📱','💬','🕒','📍','🧾','💰','📦'
  ];

  function principalInit() {
    if (principalBound) return;
    principalBound = true;

    // Emoji picker
    const picker = $('sp_emoji_picker');
    if (picker) {
      picker.innerHTML = EMOJIS.map(e => `<button class="sp-btn sp-btn-secondary" data-emoji="${escapeHtml(e)}" style="padding:6px 8px; margin:4px; min-width:38px">${escapeHtml(e)}</button>`).join('');
      picker.addEventListener('click', (ev) => {
        const btn = ev.target.closest('button[data-emoji]');
        if (!btn) return;
        const emoji = btn.getAttribute('data-emoji');
        insertEmoji(emoji);
      });
    }

    const emojiBtn = $('sp_emoji_btn');
    if (emojiBtn && picker) {
      emojiBtn.addEventListener('click', () => {
        picker.style.display = (picker.style.display === 'none' || !picker.style.display) ? 'block' : 'none';
      });
      document.addEventListener('click', (ev) => {
        if (currentView !== 'principal') return;
        const isInside = picker.contains(ev.target) || emojiBtn.contains(ev.target);
        if (!isInside) picker.style.display = 'none';
      });
    }

    // Inputs -> preview + debounce sync
    const numbersEl = $('sp_numbers');
    const msgEl = $('sp_message');
    if (numbersEl) numbersEl.addEventListener('input', () => {
      principalScheduleSync();
    });
    if (msgEl) msgEl.addEventListener('input', () => {
      principalUpdatePreview();
      principalScheduleSync();
    });

    // CSV
    const csvInput = $('sp_csv');
    const csvBtn = $('sp_select_csv');
    const csvClear = $('sp_clear_csv');
    if (csvBtn && csvInput) {
      csvBtn.addEventListener('click', () => csvInput.click());
    }
    if (csvInput) {
      csvInput.addEventListener('change', async () => {
        const file = csvInput.files?.[0];
        if (!file) return;
        try {
          const text = await file.text();
          $('sp_csv_hint').textContent = `📊 Importando: ${file.name} ...`;
          const resp = await motor('IMPORT_CSV_TEXT', { csvText: text, filename: file.name });
          principalCsvName = file.name;
          if (csvClear) csvClear.style.display = '';
          if (csvBtn) csvBtn.textContent = '📊 Trocar CSV';
          $('sp_csv_hint').textContent = resp?.message || `✅ CSV importado: ${file.name}`;
          await principalRefresh(true);
        } catch (e) {
          $('sp_csv_hint').textContent = `❌ Erro no CSV: ${e.message || e}`;
        }
      });
    }
    if (csvClear && csvInput) {
      csvClear.addEventListener('click', async () => {
        if (!confirm('Remover o CSV importado e limpar a fila gerada?')) return;
        try {
          csvInput.value = '';
          principalCsvName = null;
          csvClear.style.display = 'none';
          if (csvBtn) csvBtn.textContent = '📊 Importar CSV';
          $('sp_csv_hint').textContent = '';
          await motor('CLEAR_CSV');
          await principalRefresh(true);
        } catch (e) {
          $('sp_csv_hint').textContent = `❌ ${e.message || e}`;
        }
      });
    }

    // Image
    const imgInput = $('sp_image');
    const imgBtn = $('sp_select_image');
    const imgClear = $('sp_clear_image');
    if (imgBtn && imgInput) {
      imgBtn.addEventListener('click', () => imgInput.click());
    }
    if (imgInput) {
      imgInput.addEventListener('change', async () => {
        const file = imgInput.files?.[0];
        if (!file) return;

        const ok = await validateAndLoadImage(file);
        if (!ok) {
          imgInput.value = '';
          return;
        }
      });
    }
    if (imgClear && imgInput) {
      imgClear.addEventListener('click', async () => {
        if (!confirm('Remover a imagem anexada?')) return;
        try {
          imgInput.value = '';
          principalImageData = null;
          $('sp_image_hint').textContent = '';
          imgClear.style.display = 'none';
          if (imgBtn) imgBtn.textContent = '📎 Anexar imagem';
          await motor('SET_IMAGE_DATA', { imageData: null });
          principalUpdatePreview();
        } catch (e) {
          $('sp_image_hint').textContent = `❌ ${e.message || e}`;
        }
      });
    }

    // Buttons
    $('sp_build_queue')?.addEventListener('click', principalBuildQueue);
    $('sp_clear_fields')?.addEventListener('click', principalClearFields);

    $('sp_start')?.addEventListener('click', async () => {
      $('sp_campaign_status').textContent = '▶️ Iniciando...';
      try {
        await motor('START_CAMPAIGN');
      } catch (e) {
        $('sp_campaign_status').textContent = `❌ ${e.message || e}`;
      }
      await principalRefresh(true);
    });

    $('sp_pause')?.addEventListener('click', async () => {
      try {
        await motor('PAUSE_TOGGLE');
      } catch (e) {
        $('sp_campaign_status').textContent = `❌ ${e.message || e}`;
      }
      await principalRefresh(true);
    });

    $('sp_stop')?.addEventListener('click', async () => {
      if (!confirm('Parar a campanha?')) return;
      try {
        await motor('STOP_CAMPAIGN');
      } catch (e) {
        $('sp_campaign_status').textContent = `❌ ${e.message || e}`;
      }
      await principalRefresh(true);
    });

    $('sp_skip')?.addEventListener('click', async () => {
      try {
        await motor('SKIP_CURRENT');
      } catch (e) {
        $('sp_campaign_status').textContent = `❌ ${e.message || e}`;
      }
      await principalRefresh(true);
    });

    $('sp_wipe')?.addEventListener('click', async () => {
      if (!confirm('Zerar a fila inteira?')) return;
      try {
        await motor('WIPE_QUEUE');
      } catch (e) {
        $('sp_campaign_status').textContent = `❌ ${e.message || e}`;
      }
      await principalRefresh(true);
    });

    $('sp_save_message')?.addEventListener('click', async () => {
      const nameDefault = `Mensagem ${new Date().toLocaleString()}`;
      const name = prompt('Nome para salvar a mensagem:', nameDefault);
      if (!name) return;

      const numbersText = $('sp_numbers')?.value || '';
      const messageText = $('sp_message')?.value || '';
      try {
        await motor('SAVE_MESSAGE_DRAFT', { name, numbersText, messageText, imageData: principalImageData });
        $('sp_hint').textContent = `✅ Mensagem salva: ${name}`;
      } catch (e) {
        $('sp_hint').textContent = `❌ ${e.message || e}`;
      }
    });
  }

  function insertEmoji(emoji) {
    const ta = $('sp_message');
    if (!ta || !emoji) return;
    const start = ta.selectionStart ?? ta.value.length;
    const end = ta.selectionEnd ?? ta.value.length;
    const before = ta.value.slice(0, start);
    const after = ta.value.slice(end);
    ta.value = before + emoji + after;
    const pos = start + emoji.length;
    ta.setSelectionRange(pos, pos);
    ta.focus();
    principalUpdatePreview();
    principalScheduleSync();
  }

  function highlightVariables(msg) {
    if (!msg) return '';
    // Copia do módulo original: destaca {{variavel}}
    return escapeHtml(msg).replace(/\{\{[^}]+\}\}/g, (match) => {
      return `<span style="background: rgba(255,255,0,0.20); padding: 1px 4px; border-radius: 3px; font-weight: bold;">${match}</span>`;
    });
  }

  function principalUpdatePreview(stateForPhone = null) {
    const msgEl = $('sp_message');
    const textEl = $('sp_preview_text');
    const imgEl = $('sp_preview_img');
    const metaEl = $('sp_preview_meta');

    if (metaEl) metaEl.textContent = fmtTimeHM();

    const messageRaw = (msgEl?.value || '');
    let phone = '';
    if (stateForPhone?.queue?.[stateForPhone.index]?.phone) {
      phone = stateForPhone.queue[stateForPhone.index].phone;
    }
    const msgFinal = (messageRaw || '').replace(/\{phone\}/g, phone);

    if (textEl) textEl.innerHTML = highlightVariables(msgFinal);

    const data = principalImageData || null;
    if (imgEl) {
      if (data) {
        imgEl.src = data;
        imgEl.style.display = 'block';
      } else {
        imgEl.removeAttribute('src');
        imgEl.style.display = 'none';
      }
    }
  }

  function principalScheduleSync() {
    if (principalDebounceTimer) clearTimeout(principalDebounceTimer);
    principalDebounceTimer = setTimeout(() => principalSyncFields(), 350);
  }

  async function principalSyncFields() {
    try {
      await motor('SET_FIELDS', {
        numbersText: $('sp_numbers')?.value || '',
        messageText: $('sp_message')?.value || '',
      });
    } catch (e) {
      // silencioso (não travar a digitação)
      console.debug('[WHL] sync failed', e);
    }
  }

  async function validateAndLoadImage(file) {
    const hint = $('sp_image_hint');
    const imgBtn = $('sp_select_image');
    const imgClear = $('sp_clear_image');

    try {
      const validTypes = ['image/jpeg','image/jpg','image/png','image/gif','image/webp'];
      if (!validTypes.includes(file.type)) {
        if (hint) hint.textContent = '❌ Formato inválido. Use JPG, PNG, GIF ou WebP.';
        return false;
      }
      if (file.size > 16 * 1024 * 1024) {
        if (hint) hint.textContent = '❌ Imagem muito grande. Máximo 16MB.';
        return false;
      }

      // checar dimensões
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Falha ao ler arquivo.'));
        reader.readAsDataURL(file);
      });

      const dims = await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.width, h: img.height });
        img.onerror = () => resolve({ w: 0, h: 0 });
        img.src = dataUrl;
      });

      if (dims.w > 4096 || dims.h > 4096) {
        if (hint) hint.textContent = `❌ Dimensões muito grandes (${dims.w}x${dims.h}). Máximo 4096px.`;
        return false;
      }

      principalImageData = dataUrl;

      if (hint) hint.textContent = `✅ Imagem anexada: ${file.name} (${Math.round(file.size/1024)}KB)`;
      if (imgClear) imgClear.style.display = '';
      if (imgBtn) imgBtn.textContent = '📎 Trocar imagem';

      await motor('SET_IMAGE_DATA', { imageData: dataUrl });
      principalUpdatePreview();

      return true;
    } catch (e) {
      if (hint) hint.textContent = `❌ ${e.message || e}`;
      return false;
    }
  }

  async function principalBuildQueue() {
    const hint = $('sp_hint');
    if (hint) hint.textContent = '⏳ Gerando tabela...';

    try {
      const numbersText = $('sp_numbers')?.value || '';
      const messageText = $('sp_message')?.value || '';
      const resp = await motor('BUILD_QUEUE', { numbersText, messageText });

      if (resp?.state) {
        principalApplyState(resp.state);
      }
      if (hint) hint.textContent = resp?.message || '✅ Tabela gerada.';
    } catch (e) {
      if (hint) hint.textContent = `❌ ${e.message || e}`;
    }
  }

  async function principalClearFields() {
    if (!confirm('Limpar campos de números e mensagem?')) return;

    $('sp_numbers').value = '';
    $('sp_message').value = '';
    principalUpdatePreview();

    const hint = $('sp_hint');
    if (hint) hint.textContent = '';

    try {
      await motor('CLEAR_FIELDS');
    } catch (e) {
      // ignora
    }
  }

  async function principalTick() {
    // Light poll for status + conditional full refresh for queue table
    try {
      const resp = await motor('GET_STATE', { light: true });
      const st = resp?.state || resp; // compat
      if (!st) return;

      principalApplyStatus(st);

      // Decide when we need a full refresh (queue/table)
      let needFull = false;
      if (!principalLastLight) {
        needFull = true;
      } else {
        const keys = ['isRunning','isPaused','index','queueTotal','queueSent','queueFailed','queuePending'];
        for (const k of keys) {
          if (principalLastLight?.[k] !== st?.[k]) { needFull = true; break; }
        }
      }
      principalLastLight = st;

      if (!needFull) return;

      // Throttle full pulls to avoid excessive work on huge queues
      const now = Date.now();
      if (now - principalLastFullAt < 350) return;
      principalLastFullAt = now;

      const fullResp = await motor('GET_STATE', { light: false });
      const fullSt = fullResp?.state || fullResp;
      if (fullSt) principalApplyState(fullSt);
    } catch (e) {
      // Silencioso no polling
    }
  }

  async function principalRefresh(includeQueue) {
    // includeQueue: true quando entrou na view ou após ações; false no intervalo
    try {
      const resp = await motor('GET_STATE', { light: !includeQueue });
      const st = resp?.state || resp; // compat
      if (!st) return;

      // Se veio "light", não vamos redesenhar a tabela por completo
      if (!includeQueue) {
        principalApplyStatus(st);
        return;
      }

      principalApplyState(st);
    } catch (e) {
      $('sp_campaign_status').textContent = `❌ ${e.message || e}`;
    }
  }

  function principalApplyStatus(st) {
    // Atualiza apenas status/stats/barra/meta (sem re-render de tabela)
    const sent = st.queueSent ?? null; // se vier do motor
    const failed = st.queueFailed ?? null;
    const pending = st.queuePending ?? null;

    // Se não vier do motor (light), tenta usar totals (se existirem)
    const total = st.queueTotal ?? (Array.isArray(st.queue) ? st.queue.length : 0);

    if (typeof sent === 'number' && $('sp_stat_sent')) $('sp_stat_sent').textContent = sent;
    if (typeof failed === 'number' && $('sp_stat_failed')) $('sp_stat_failed').textContent = failed;
    if (typeof pending === 'number' && $('sp_stat_pending')) $('sp_stat_pending').textContent = pending;

    // Meta (posição atual)
    const metaEl = $('sp_queue_meta');
    if (metaEl) {
      const idx = (typeof st.index === 'number' ? st.index : 0);
      if (total > 0) {
        const pos = Math.min(idx + 1, total);
        metaEl.textContent = `${total} contatos • Próximo: ${pos}/${total}`;
      } else {
        metaEl.textContent = '0 contatos';
      }
    }

    // Status
    const statusEl = $('sp_campaign_status');
    if (statusEl) {
      if (st.isRunning && !st.isPaused) statusEl.textContent = '✅ Enviando...';
      else if (st.isPaused) statusEl.textContent = '⏸️ Pausado';
      else statusEl.textContent = '⏹️ Parado';
    }

    // Progress (best effort)
    if (typeof sent === 'number' && typeof failed === 'number' && total > 0) {
      const completed = sent + failed;
      const perc = Math.round((completed / total) * 100);
      const fill = $('sp_progress_fill');
      const ptxt = $('sp_progress_text');
      if (fill) fill.style.width = `${perc}%`;
      if (ptxt) ptxt.textContent = `${perc}% (${completed}/${total})`;
    } else {
      const fill = $('sp_progress_fill');
      const ptxt = $('sp_progress_text');
      if (fill) fill.style.width = `0%`;
      if (ptxt) ptxt.textContent = `0% (0/${total || 0})`;
    }
  }

  function principalApplyState(st) {
    // Campos (se o usuário estiver digitando, não sobrescrever constantemente)
    const nEl = $('sp_numbers');
    const mEl = $('sp_message');

    if (nEl && (document.activeElement !== nEl)) nEl.value = st.numbersText || '';
    if (mEl && (document.activeElement !== mEl)) mEl.value = st.message || '';

    principalImageData = st.imageData || principalImageData;

    // CSV hints
    const csvHint = $('sp_csv_hint');
    const csvBtn = $('sp_select_csv');
    const csvClear = $('sp_clear_csv');
    if (csvHint && principalCsvName) csvHint.textContent = `📊 CSV carregado: ${principalCsvName}`;

    // Image hints
    const imgHint = $('sp_image_hint');
    const imgBtn = $('sp_select_image');
    const imgClear = $('sp_clear_image');
    if (imgHint) {
      if (principalImageData) {
        imgHint.textContent = '✅ Imagem anexada e pronta para envio';
        if (imgClear) imgClear.style.display = '';
        if (imgBtn) imgBtn.textContent = '📎 Trocar imagem';
      } else {
        imgHint.textContent = '';
        if (imgClear) imgClear.style.display = 'none';
        if (imgBtn) imgBtn.textContent = '📎 Anexar imagem';
      }
    }

    // Preview
    principalUpdatePreview(st);

    // Stats
    const queue = Array.isArray(st.queue) ? st.queue : [];
    const sent = queue.filter(c => c.status === 'sent').length;
    const failed = queue.filter(c => c.status === 'failed').length;
    const pending = queue.filter(c => ['pending','opened','confirming','pending_retry'].includes(c.status)).length;

    $('sp_stat_sent').textContent = sent;
    $('sp_stat_failed').textContent = failed;
    $('sp_stat_pending').textContent = pending;

    // Progress
    const total = queue.length;
    const completed = sent + failed;
    const perc = total > 0 ? Math.round((completed / total) * 100) : 0;
    $('sp_progress_fill').style.width = `${perc}%`;
    $('sp_progress_text').textContent = `${perc}% (${completed}/${total})`;

    // Estimated time (quando rodando)
    const estEl = $('sp_estimated_time');
    if (estEl && st.isRunning && pending > 0) {
      const avgDelay = ((Number(st.delayMin) || 0) + (Number(st.delayMax) || 0)) / 2;
      const estimatedSeconds = pending * avgDelay;
      const estimatedMinutes = Math.ceil(estimatedSeconds / 60);
      if (estimatedMinutes > 60) {
        const hours = Math.floor(estimatedMinutes / 60);
        const mins = estimatedMinutes % 60;
        estEl.textContent = `⏱️ Tempo estimado: ${hours}h ${mins}min`;
      } else {
        estEl.textContent = `⏱️ Tempo estimado: ${estimatedMinutes} min`;
      }
    } else if (estEl) {
      estEl.textContent = '';
    }

    // Campaign status
    const statusEl = $('sp_campaign_status');
    if (statusEl) {
      if (st.isRunning && !st.isPaused) statusEl.textContent = '✅ Enviando...';
      else if (st.isPaused) statusEl.textContent = '⏸️ Pausado';
      else statusEl.textContent = '⏹️ Parado';
    }

    // Queue meta
    const meta = $('sp_queue_meta');
    if (meta) meta.textContent = `${total} contato(s) • posição: ${Math.min((st.index||0)+1, Math.max(1,total))}/${Math.max(1,total)}`;

    // Queue table
    renderQueueTable(queue, st.index || 0);
  }

  function renderQueueTable(queue, currentIndex) {
    const tbody = $('sp_queue_table');
    if (!tbody) return;

    const total = queue.length;
    const limit = total > MAX_QUEUE_RENDER ? MAX_QUEUE_RENDER : total;

    const rows = [];
    for (let i = 0; i < limit; i++) {
      const c = queue[i];
      const phone = escapeHtml(c.phone || '');
      const status = String(c.status || 'pending');
      const pillClass =
        status === 'sent' ? 'sent' :
        status === 'failed' ? 'failed' :
        (c.valid === false ? 'invalid' : 'pending');

      rows.push(`
        <tr class="${i === currentIndex ? 'current' : ''}">
          <td>${i+1}</td>
          <td style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;">${phone}</td>
          <td><span class="sp-pill ${pillClass}">${escapeHtml(status)}</span></td>
          <td><button class="sp-btn sp-btn-danger" data-del="${i}" style="padding:6px 8px">✖</button></td>
        </tr>
      `);
    }

    if (total > MAX_QUEUE_RENDER) {
      rows.push(`
        <tr>
          <td colspan="4" style="opacity:.75">
            Mostrando ${MAX_QUEUE_RENDER} de ${total} (para performance).
          </td>
        </tr>
      `);
    }

    tbody.innerHTML = rows.join('');

    // delete buttons
    tbody.querySelectorAll('button[data-del]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const idx = Number(btn.getAttribute('data-del'));
        if (!Number.isFinite(idx)) return;
        if (!confirm(`Remover o item #${idx+1} da fila?`)) return;
        try {
          await motor('DELETE_QUEUE_ITEM', { index: idx });
          await principalRefresh(true);
        } catch (e) {
          $('sp_campaign_status').textContent = `❌ ${e.message || e}`;
        }
      });
    });
  }

  // ========= Extrator =========
  let extratorBound = false;

  function extratorInit() {
    if (extratorBound) return;
    extratorBound = true;

    $('sp_extract_contacts')?.addEventListener('click', extratorExtract);
    $('sp_refresh_extract')?.addEventListener('click', extratorRefresh);

    $('sp_copy_extract_all')?.addEventListener('click', async () => {
      const all = joinNonEmptyLines(
        $('sp_normal_list')?.value,
        $('sp_archived_list')?.value,
        $('sp_blocked_list')?.value,
      );
      const ok = await copyToClipboard(all);
      $('sp_extract_status').textContent = ok ? '✅ Copiado: Todos' : '⚠️ Nada para copiar.';
    });

    $('sp_copy_normal')?.addEventListener('click', async () => {
      const ok = await copyToClipboard($('sp_normal_list')?.value || '');
      $('sp_extract_status').textContent = ok ? '✅ Copiado: Normais' : '⚠️ Nada para copiar.';
    });

    $('sp_copy_archived')?.addEventListener('click', async () => {
      const ok = await copyToClipboard($('sp_archived_list')?.value || '');
      $('sp_extract_status').textContent = ok ? '✅ Copiado: Arquivados' : '⚠️ Nada para copiar.';
    });

    $('sp_copy_blocked')?.addEventListener('click', async () => {
      const ok = await copyToClipboard($('sp_blocked_list')?.value || '');
      $('sp_extract_status').textContent = ok ? '✅ Copiado: Bloqueados' : '⚠️ Nada para copiar.';
    });
  }

  async function extratorExtract() {
    const status = $('sp_extract_status');
    if (status) status.textContent = '⏳ Extraindo...';

    try {
      const resp = await motor('EXTRACT_CONTACTS');
      const lists = resp?.lists || resp?.data;
      if (lists) renderExtractLists(lists);
      if (status) status.textContent = resp?.message || '✅ Extraído.';
    } catch (e) {
      if (status) status.textContent = `❌ ${e.message || e}`;
    }
  }

  async function extratorRefresh() {
    const status = $('sp_extract_status');
    if (status) status.textContent = '🔄 Atualizando...';

    try {
      const resp = await motor('GET_EXTRACTED_CONTACTS');
      if (resp?.lists || resp?.data) renderExtractLists(resp.lists || resp.data);
      if (status) status.textContent = '✅ Atualizado.';
    } catch (e) {
      if (status) status.textContent = `❌ ${e.message || e}`;
    }
  }

  function renderExtractLists(lists) {
  const norm = Array.isArray(lists?.normal)
    ? lists.normal
    : String(lists?.normal || '').split(/\n+/).map(s => s.trim()).filter(Boolean);

  const arch = Array.isArray(lists?.archived)
    ? lists.archived
    : String(lists?.archived || '').split(/\n+/).map(s => s.trim()).filter(Boolean);

  const block = Array.isArray(lists?.blocked)
    ? lists.blocked
    : String(lists?.blocked || '').split(/\n+/).map(s => s.trim()).filter(Boolean);

  $('sp_normal_list').value = norm.join('\n');
  $('sp_archived_list').value = arch.join('\n');
  $('sp_blocked_list').value = block.join('\n');

  const cNorm = (lists?.counts && typeof lists.counts.normal === 'number') ? lists.counts.normal : norm.length;
  const cArch = (lists?.counts && typeof lists.counts.archived === 'number') ? lists.counts.archived : arch.length;
  const cBlock = (lists?.counts && typeof lists.counts.blocked === 'number') ? lists.counts.blocked : block.length;

  $('sp_count_normal').textContent = cNorm;
  $('sp_count_archived').textContent = cArch;
  $('sp_count_blocked').textContent = cBlock;
}

  // ========= Recover =========
  let recoverBound = false;

  function recoverInit() {
    if (recoverBound) return;
    recoverBound = true;

    $('sp_refresh_recover')?.addEventListener('click', () => recoverRefresh(true));

    $('sp_clear_recover')?.addEventListener('click', async () => {
      if (!confirm('Limpar histórico de recover?')) return;
      const st = $('sp_recover_status');
      if (st) st.textContent = '⏳ Limpando...';
      try {
        await motor('CLEAR_RECOVER_HISTORY');
        await recoverRefresh(true);
      } catch (e) {
        if (st) st.textContent = `❌ ${e.message || e}`;
      }
    });

    $('sp_export_recover')?.addEventListener('click', async () => {
      try {
        const resp = await motor('GET_RECOVER_HISTORY');
        const history = resp?.history || [];
        const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `recover_history_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        $('sp_recover_status').textContent = `⬇️ Exportado (${history.length})`;
      } catch (e) {
        $('sp_recover_status').textContent = `❌ ${e.message || e}`;
      }
    });
  }

  async function recoverRefresh(verbose = true) {
    const st = $('sp_recover_status');
    if (verbose && st) st.textContent = '🔄 Atualizando...';

    try {
      const resp = await motor('GET_RECOVER_HISTORY');
      const history = resp?.history || [];
      $('sp_recover_total').textContent = String(history.length);
      renderRecoverTimeline(history);
      if (verbose && st) st.textContent = '✅ Atualizado.';
    } catch (e) {
      if (st) st.textContent = `❌ ${e.message || e}`;
    }
  }

  function renderRecoverTimeline(history) {
  const root = $('sp_recover_timeline');
  if (!root) return;

  const slice = (history || []).slice(-MAX_RECOVER_RENDER).reverse();

  root.innerHTML = slice.map((h) => {
    const type = (h?.type || 'unknown');
    const klass = type === 'deleted' ? 'deleted' : (type === 'edited' ? 'edited' : '');
    const typeLabel = type === 'deleted' ? '🗑️ Apagada' : (type === 'edited' ? '✏️ Editada' : 'ℹ️');
    const from = normalizeFromId(h?.from || h?.chat || h?.jid || '');
    const ts = new Date(h?.timestamp || Date.now());
    const hh = String(ts.getHours()).padStart(2,'0');
    const mm = String(ts.getMinutes()).padStart(2,'0');

    const raw = String(h?.body || h?.message || h?.text || '');
    const textHtml = escapeHtml(raw);
    const encoded = encodeURIComponent(raw);

    return `
      <div class="timeline-item ${klass}">
        <div class="timeline-dot"></div>
        <div class="timeline-card">
          <div class="card-header">
            <div class="contact-name">📞 ${escapeHtml(from || 'Desconhecido')}</div>
            <div class="timestamp">${hh}:${mm}</div>
            <span class="message-type ${klass}">${escapeHtml(typeLabel)}</span>
          </div>
          <div class="card-body">
            <p class="original-message">${textHtml || '<i>(vazio)</i>'}</p>
          </div>
          <div class="card-footer">
            <span class="date">${ts.toLocaleDateString()}</span>
            <button class="copy-btn" data-copy="${encoded}">📋 Copiar</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  root.querySelectorAll('button[data-copy]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const enc = btn.getAttribute('data-copy') || '';
      const t = decodeURIComponent(enc);
      const ok = await copyToClipboard(t);
      btn.textContent = ok ? '✅ Copiado' : '⚠️ Falhou';
      setTimeout(() => btn.textContent = '📋 Copiar', 900);
    });
  });
}

  // ========= Config =========
  let configBound = false;

  function configInit() {
    if (configBound) return;
    configBound = true;

    $('sp_save_settings')?.addEventListener('click', configSave);
    $('sp_reload_settings')?.addEventListener('click', configLoad);

    $('sp_save_draft')?.addEventListener('click', async () => {
      const name = ($('sp_draft_name')?.value || '').trim();
      if (!name) {
        $('sp_config_status').textContent = '⚠️ Informe um nome para o rascunho.';
        return;
      }
      $('sp_config_status').textContent = '⏳ Salvando rascunho...';
      try {
        await motor('SAVE_DRAFT', { name });
        $('sp_draft_name').value = '';
        $('sp_config_status').textContent = '✅ Rascunho salvo.';
        await configLoad();
      } catch (e) {
        $('sp_config_status').textContent = `❌ ${e.message || e}`;
      }
    });

    $('sp_export_report')?.addEventListener('click', exportReportCSV);
    $('sp_copy_failed')?.addEventListener('click', copyFailedNumbers);
  }

  async function configLoad() {
    $('sp_config_status').textContent = '🔄 Carregando...';
    try {
      const resp = await motor('GET_STATE', { light: false });
      const st = resp?.state || resp;
      if (!st) throw new Error('Sem estado');

      $('sp_delay_min').value = String(st.delayMin ?? '');
      $('sp_delay_max').value = String(st.delayMax ?? '');
      $('sp_schedule').value = st.scheduleAt || '';

      renderDrafts(st.drafts || {});

      $('sp_config_status').textContent = '✅ Pronto.';
    } catch (e) {
      $('sp_config_status').textContent = `❌ ${e.message || e}`;
    }
  }

  async function configSave() {
    const status = $('sp_config_status');
    if (status) status.textContent = '⏳ Salvando...';

    try {
      const delayMin = parseFloat($('sp_delay_min')?.value || '0');
      const delayMax = parseFloat($('sp_delay_max')?.value || '0');
      const scheduleAt = ($('sp_schedule')?.value || '').trim();

      const resp = await motor('SET_SETTINGS', { delayMin, delayMax, scheduleAt });
      if (status) status.textContent = resp?.message || '✅ Configurações salvas.';
    } catch (e) {
      if (status) status.textContent = `❌ ${e.message || e}`;
    }
  }

  function renderDrafts(draftsObj) {
    const body = $('sp_drafts_body');
    if (!body) return;

    const entries = Object.entries(draftsObj || {});
    if (!entries.length) {
      body.innerHTML = `<tr><td colspan="4" style="opacity:.75">Nenhum rascunho salvo.</td></tr>`;
      return;
    }

    body.innerHTML = entries
      .sort((a,b) => (b[1]?.savedAt || 0) - (a[1]?.savedAt || 0))
      .map(([name, d]) => {
        const savedAt = d?.savedAt ? new Date(d.savedAt) : null;
        const date = savedAt ? savedAt.toLocaleDateString() : '-';
        const qlen = Array.isArray(d?.queue) ? d.queue.length : (d?.numbersText ? String(d.numbersText).split(/\n+/).filter(Boolean).length : 0);

        return `
          <tr>
            <td style="font-weight:800">${escapeHtml(name)}</td>
            <td>${escapeHtml(date)}</td>
            <td>${qlen}</td>
            <td>
              <button class="sp-btn sp-btn-secondary" data-load="${escapeHtml(name)}" style="padding:6px 8px">Carregar</button>
              <button class="sp-btn sp-btn-danger" data-del="${escapeHtml(name)}" style="padding:6px 8px">Del</button>
            </td>
          </tr>
        `;
      }).join('');

    body.querySelectorAll('button[data-load]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const name = btn.getAttribute('data-load');
        if (!name) return;
        $('sp_config_status').textContent = `⏳ Carregando "${name}"...`;
        try {
          await motor('LOAD_DRAFT', { name });
          $('sp_config_status').textContent = '✅ Rascunho carregado.';
          await principalRefresh(true); // atualiza principal se usuário voltar
          await configLoad();
        } catch (e) {
          $('sp_config_status').textContent = `❌ ${e.message || e}`;
        }
      });
    });

    body.querySelectorAll('button[data-del]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const name = btn.getAttribute('data-del');
        if (!name) return;
        if (!confirm(`Excluir rascunho "${name}"?`)) return;
        $('sp_config_status').textContent = `⏳ Excluindo "${name}"...`;
        try {
          await motor('DELETE_DRAFT', { name });
          $('sp_config_status').textContent = '✅ Excluído.';
          await configLoad();
        } catch (e) {
          $('sp_config_status').textContent = `❌ ${e.message || e}`;
        }
      });
    });
  }

  async function exportReportCSV() {
    const hint = $('sp_report_hint');
    if (hint) hint.textContent = '⏳ Gerando CSV...';

    try {
      const resp = await motor('GET_STATE', { light: false });
      const st = resp?.state || resp;
      const queue = Array.isArray(st?.queue) ? st.queue : [];
      const header = ['phone','status','valid','retries'].join(',');
      const lines = queue.map(c => {
        const phone = String(c.phone || '').replace(/"/g,'""');
        const status = String(c.status || '').replace(/"/g,'""');
        const valid = (c.valid === false) ? 'false' : 'true';
        const retries = String(c.retries ?? 0);
        return `"${phone}","${status}",${valid},${retries}`;
      });
      const csv = [header, ...lines].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `whl_report_${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      if (hint) hint.textContent = `✅ CSV exportado (${queue.length} linhas).`;
    } catch (e) {
      if (hint) hint.textContent = `❌ ${e.message || e}`;
    }
  }

  async function copyFailedNumbers() {
    const hint = $('sp_report_hint');
    if (hint) hint.textContent = '⏳ Copiando falhas...';

    try {
      const resp = await motor('GET_STATE', { light: false });
      const st = resp?.state || resp;
      const queue = Array.isArray(st?.queue) ? st.queue : [];
      const failed = queue.filter(c => c.status === 'failed' || c.valid === false).map(c => c.phone).filter(Boolean);
      const text = failed.join('\n');
      const ok = await copyToClipboard(text);
      if (hint) hint.textContent = ok ? `✅ Copiado (${failed.length}).` : '⚠️ Nada para copiar.';
    } catch (e) {
      if (hint) hint.textContent = `❌ ${e.message || e}`;
    }
  }

  // ========= Bootstrap =========
  document.addEventListener('DOMContentLoaded', loadCurrentView);
})();