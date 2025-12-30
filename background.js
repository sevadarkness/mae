// ===== STRICT MODE AND ERROR HANDLING =====
'use strict';
// ===== FUSION: Load Group Extractor v6 background module =====
try {
  importScripts('background/extractor-v6.js');
  console.log('[Fusion] Loaded extractor-v6 background module');
} catch (e) {
  console.warn('[Fusion] Failed to load extractor-v6 background module', e);
}


// Verify Chrome APIs are available
if (typeof chrome === 'undefined' || !chrome.runtime) {
    console.error('[WHL Background] Chrome APIs not available');
}

// Global error handler
self.addEventListener('error', (event) => {
    console.error('[WHL Background] Global error:', event.error);
});

// Unhandled promise rejection handler
self.addEventListener('unhandledrejection', (event) => {
    console.error('[WHL Background] Unhandled promise rejection:', event.reason);
});

// ===== CONFIGURATION CONSTANTS =====
const SEND_MESSAGE_TIMEOUT_MS = 45000; // 45 seconds timeout for message sending
const NETSNIFFER_CLEANUP_INTERVAL_MS = 300000; // 5 minutes - periodic cleanup to prevent memory leaks
const NETSNIFFER_MAX_PHONES = 5000; // Reduced from 10000 to prevent excessive memory usage

const NetSniffer = {
  phones: new Set(),
  lastCleanup: Date.now(),
  
  init() {
    chrome.webRequest.onBeforeRequest.addListener(
      det => this.req(det),
      {urls:["*://web.whatsapp.com/*","*://*.whatsapp.net/*"]},
      ["requestBody"]
    );
    chrome.webRequest.onCompleted.addListener(
      det => this.resp(det),
      {urls:["*://web.whatsapp.com/*","*://*.whatsapp.net/*"]}
    );
    
    // Start periodic cleanup to prevent memory leaks
    this.startPeriodicCleanup();
  },
  
  /**
   * Periodic cleanup to prevent unbounded memory growth
   */
  startPeriodicCleanup() {
    setInterval(() => {
      const now = Date.now();
      const timeSinceLastCleanup = now - this.lastCleanup;
      
      // Only clean if interval has passed
      if (timeSinceLastCleanup >= NETSNIFFER_CLEANUP_INTERVAL_MS) {
        this.cleanup();
      }
    }, NETSNIFFER_CLEANUP_INTERVAL_MS);
  },
  
  /**
   * Clean up phones set to prevent memory leaks
   */
  cleanup() {
    console.log(`[NetSniffer] Cleanup: ${this.phones.size} phones in memory`);
    
    // If we have too many phones, clear the set
    if (this.phones.size > NETSNIFFER_MAX_PHONES) {
      console.log(`[NetSniffer] Clearing phones set (exceeded ${NETSNIFFER_MAX_PHONES})`);
      this.phones.clear();
    }
    
    this.lastCleanup = Date.now();
  },
  req(det) {
    try {
      if (det.requestBody) {
        if (det.requestBody.formData) Object.values(det.requestBody.formData).forEach(vals => vals.forEach(v => this.detect(v)));
        if (det.requestBody.raw) det.requestBody.raw.forEach(d=>{
          if(d.bytes){
            let t = new TextDecoder().decode(new Uint8Array(d.bytes));
            this.detect(t);
          }
        });
      }
      this.detect(det.url);
    } catch(err) {
      console.warn('[NetSniffer] Error processing request:', err.message);
    }
  },
  resp(det) {
    if (this.phones.size) {
      chrome.tabs.query({active:true,currentWindow:true},tabs=>{
        if(tabs[0]){
          chrome.tabs.sendMessage(tabs[0].id,{type:'netPhones',phones:Array.from(this.phones)})
            .catch(err => {
              console.log('[NetSniffer] Não foi possível enviar phones para content script:', err.message);
            });
        }
      });
    }
  },
  detect(t) {
    if (!t) return;
    // Security fix: Only use WhatsApp-specific pattern to avoid false positives
    for (let m of t.matchAll(/(\d{10,15})@c\.us/g)) this.phones.add(m[1]);
  }
};
NetSniffer.init();

// ===== CONSOLIDATED MESSAGE LISTENER =====
// Single message listener to handle all actions and avoid race conditions
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handler map for better organization and maintainability
  const handlers = {
    // Data export/clear actions
    exportData: handleExportData,
    clearData: handleClearData,
    
    // Worker management actions
    CHECK_IF_WORKER: handleCheckIfWorker,
    WORKER_READY: handleWorkerReady,
    WORKER_STATUS: handleWorkerStatus,
    WORKER_ERROR: handleWorkerError,
    
    // Campaign management actions
    START_CAMPAIGN_WORKER: handleStartCampaign,
    PAUSE_CAMPAIGN: handlePauseCampaign,
    RESUME_CAMPAIGN: handleResumeCampaign,
    STOP_CAMPAIGN: handleStopCampaign,
    GET_CAMPAIGN_STATUS: handleGetCampaignStatus,

    // UI routing (Top Panel -> Side Panel)
    WHL_OPEN_SIDE_PANEL_VIEW: handleOpenSidePanelView,
    WHL_SET_SIDE_PANEL_ENABLED: handleSetSidePanelEnabled
  };
  
  const handler = handlers[message.action];
  
  if (handler) {
    // All handlers return true for async operations
    handler(message, sender, sendResponse);
    return true;
  }
  
  // Unknown action - don't block
  return false;
});

// ===== MESSAGE HANDLERS =====

async function handleExportData(message, sender, sendResponse) {
  chrome.tabs.query({active:true,currentWindow:true},async tabs=>{
    if(!tabs[0]){
      sendResponse({success:false, error:'No active tab found'});
      return;
    }
    try{
      const res = await chrome.scripting.executeScript({
        target:{tabId:tabs[0].id},
        function:()=>({
          numbers: Array.from(window.HarvesterStore?._phones?.keys()||[]),
          valid: Array.from(window.HarvesterStore?._valid||[]),
          meta: window.HarvesterStore?._meta||{}
        })
      });
      sendResponse({success:true, data: res[0].result});
    }catch(e){
      sendResponse({success:false, error:e.message});
    }
  });
}

async function handleClearData(message, sender, sendResponse) {
  chrome.tabs.query({active:true,currentWindow:true},async tabs=>{
    if(!tabs[0]){
      sendResponse({success:false, error:'No active tab found'});
      return;
    }
    try{
      await chrome.scripting.executeScript({
        target:{tabId:tabs[0].id},
        function:()=>{
          if(window.HarvesterStore){
            window.HarvesterStore._phones.clear();
            window.HarvesterStore._valid.clear();
            window.HarvesterStore._meta = {};
            localStorage.removeItem('wa_extracted_numbers');
          }
        }
      });
      sendResponse({success:true});
    }catch(e){
      sendResponse({success:false, error:e.message});
    }
  });
}

// ===== UI ROUTING: OPEN SIDE PANEL + SET ACTIVE VIEW =====
async function handleOpenSidePanelView(message, sender, sendResponse) {
  try {
    const view = String(message.view || 'principal');

    // Try to open the side panel for the current WhatsApp tab/window
    const tabId = sender?.tab?.id ?? message.tabId;
    const windowId = sender?.tab?.windowId;

    // Persist view + tab association so the Side Panel can talk to the right tab
    await chrome.storage.local.set({
      whl_active_view: view,
      whl_active_tabId: (typeof tabId === 'number') ? tabId : null,
      whl_active_windowId: (typeof windowId === 'number') ? windowId : null
    });

    if (chrome.sidePanel && chrome.sidePanel.open) {
      try {
        if (typeof tabId === 'number') {
          await chrome.sidePanel.open({ tabId });
        } else if (typeof windowId === 'number') {
          await chrome.sidePanel.open({ windowId });
        } else {
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tabs?.[0]?.id != null) {
            await chrome.sidePanel.open({ tabId: tabs[0].id });
          }
        }
      } catch (e1) {
        // Fallback attempts
        try {
          if (typeof windowId === 'number') {
            await chrome.sidePanel.open({ windowId });
          }
        } catch (_) {
          // Ignore
        }
      }
    }

    sendResponse({ success: true, view });
  } catch (e) {
    sendResponse({ success: false, error: e?.message || String(e) });
  }
}

// Enable/disable Side Panel for the current tab (used to keep Top Panel + Side Panel in sync)
async function handleSetSidePanelEnabled(message, sender, sendResponse) {
  try {
    const enabled = !!message.enabled;
    const tabId = sender?.tab?.id ?? message.tabId;

    if (chrome.sidePanel && chrome.sidePanel.setOptions && typeof tabId === 'number') {
      const opts = { tabId, enabled };
      if (enabled) opts.path = 'sidepanel.html';
      await chrome.sidePanel.setOptions(opts);
    }

    sendResponse({ success: true, enabled });
  } catch (e) {
    sendResponse({ success: false, error: e?.message || String(e) });
  }
}


// ===== WORKER TAB MANAGEMENT =====

let workerTabId = null;
let campaignQueue = [];
let campaignState = {
  isRunning: false,
  isPaused: false,
  currentIndex: 0
};

// Initialize worker state on installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['workerTabId', 'campaignQueue', 'campaignState'], (data) => {
    if (data.workerTabId) {
      // Check if the tab still exists
      chrome.tabs.get(data.workerTabId, (tab) => {
        if (chrome.runtime.lastError || !tab) {
          workerTabId = null;
          chrome.storage.local.remove('workerTabId');
        } else {
          workerTabId = data.workerTabId;
        }
      });
    }
    if (data.campaignQueue) campaignQueue = data.campaignQueue;
    if (data.campaignState) campaignState = data.campaignState;
  });
});

function handleCheckIfWorker(message, sender, sendResponse) {
  sendResponse({ isWorker: sender.tab?.id === workerTabId });
}

function handleWorkerReady(message, sender, sendResponse) {
  console.log('[WHL Background] Worker tab ready');
  if (campaignState.isRunning && !campaignState.isPaused) {
    processNextInQueue();
  }
  sendResponse({ success: true });
}

function handleWorkerStatus(message, sender, sendResponse) {
  console.log('[WHL Background] Worker status:', message.status);
  notifyPopup({ action: 'WORKER_STATUS_UPDATE', status: message.status });
  sendResponse({ success: true });
}

function handleWorkerError(message, sender, sendResponse) {
  console.error('[WHL Background] Worker error:', message.error);
  notifyPopup({ action: 'WORKER_ERROR', error: message.error });
  sendResponse({ success: true });
}

async function handleStartCampaign(message, sender, sendResponse) {
  const { queue, config } = message;
  const result = await startCampaign(queue, config);
  sendResponse(result);
}

function handlePauseCampaign(message, sender, sendResponse) {
  campaignState.isPaused = true;
  saveCampaignState();
  sendResponse({ success: true });
}

function handleResumeCampaign(message, sender, sendResponse) {
  campaignState.isPaused = false;
  saveCampaignState();
  processNextInQueue();
  sendResponse({ success: true });
}

function handleStopCampaign(message, sender, sendResponse) {
  campaignState.isRunning = false;
  campaignState.isPaused = false;
  saveCampaignState();
  sendResponse({ success: true });
}

function handleGetCampaignStatus(message, sender, sendResponse) {
  sendResponse({
    ...campaignState,
    queue: campaignQueue,
    workerActive: workerTabId !== null
  });
}

async function startCampaign(queue, config) {
  console.log('[WHL Background] Starting campaign with', queue.length, 'contacts');
  
  campaignQueue = queue;
  campaignState = {
    isRunning: true,
    isPaused: false,
    currentIndex: 0,
    config: config
  };
  
  saveCampaignState();
  
  // Start processing directly
  processNextInQueue();
  
  return { success: true };
}

// ===== ENVIO SIMPLIFICADO =====
// Usar a aba principal do WhatsApp Web ao invés de worker incógnito

async function sendMessageToWhatsApp(phone, text, imageData = null) {
    // Encontrar aba do WhatsApp Web
    const tabs = await chrome.tabs.query({ url: 'https://web.whatsapp.com/*' });
    
    if (tabs.length === 0) {
        return { success: false, error: 'WhatsApp Web não está aberto' };
    }
    
    const whatsappTab = tabs[0];
    
    try {
        // Enviar mensagem para o content script
        const result = await chrome.tabs.sendMessage(whatsappTab.id, {
            action: 'SEND_MESSAGE_URL',
            phone: phone,
            text: text,
            imageData: imageData
        });
        
        return result;
    } catch (e) {
        return { success: false, error: e.message };
    }
}

// Helper: timeout para evitar travas
function withTimeout(promise, ms = 45000) {
  let t;
  const timeout = new Promise((_, rej) => 
    t = setTimeout(() => rej(new Error('TIMEOUT')), ms)
  );
  return Promise.race([promise.finally(() => clearTimeout(t)), timeout]);
}

async function processNextInQueue() {
  if (!campaignState.isRunning || campaignState.isPaused) {
    return;
  }
  
  if (campaignState.currentIndex >= campaignQueue.length) {
    console.log('[WHL Background] 🎉 Campanha finalizada!');
    campaignState.isRunning = false;
    saveCampaignState();
    notifyPopup({ action: 'CAMPAIGN_COMPLETED' });
    return;
  }
  
  const current = campaignQueue[campaignState.currentIndex];
  
  if (!current || current.status === 'sent') {
    campaignState.currentIndex++;
    saveCampaignState();
    processNextInQueue();
    return;
  }
  
  console.log(`[WHL Background] Processando ${current.phone} (${campaignState.currentIndex + 1}/${campaignQueue.length})`);
  
  // Update status to "sending"
  current.status = 'sending';
  saveCampaignState();
  notifyPopup({ action: 'CAMPAIGN_PROGRESS', current: campaignState.currentIndex, total: campaignQueue.length });

  let result;
  try {
    // Use withTimeout helper to prevent blocking
    result = await withTimeout(
      sendMessageToWhatsApp(
        current.phone, 
        campaignState.config?.message || '',
        campaignState.config?.imageData || null
      ),
      SEND_MESSAGE_TIMEOUT_MS
    );
  } catch (err) {
    result = { success: false, error: err.message };
  }
  
  // Atualizar status SEMPRE
  if (result && result.success) {
    current.status = 'sent';
    console.log(`[WHL Background] ✅ Enviado para ${current.phone}`);
  } else {
    current.status = 'failed';
    current.error = result?.error || 'Unknown error';
    console.log(`[WHL Background] ❌ Falha: ${current.phone} - ${current.error}`);
  }
  
  // Move to next
  campaignState.currentIndex++;
  saveCampaignState();
  
  // Notify popup
  notifyPopup({ 
    action: 'SEND_RESULT', 
    phone: current.phone, 
    status: current.status,
    error: current.error 
  });
  
  // Delay humanizado
  const minDelay = campaignState.config?.delayMin || 3000;
  const maxDelay = campaignState.config?.delayMax || 8000;
  const delay = Math.floor(Math.random() * (maxDelay - minDelay)) + minDelay;
  
  console.log(`[WHL Background] Waiting ${delay}ms before next...`);
  
  setTimeout(() => {
    processNextInQueue();
  }, delay);
}

function saveCampaignState() {
  chrome.storage.local.set({
    campaignQueue,
    campaignState
  });
}

function notifyPopup(message) {
  chrome.runtime.sendMessage(message).catch(() => {
    // Popup may be closed, ignore error
  });
}

// Cleanup when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === workerTabId) {
    console.log('[WHL Background] Worker tab was closed');
    workerTabId = null;
    chrome.storage.local.remove('workerTabId');
    
    // If campaign was running, pause it
    if (campaignState.isRunning) {
      campaignState.isPaused = true;
      saveCampaignState();
      notifyPopup({ action: 'WORKER_CLOSED' });
    }
  }
});


// ===== FUSION: open side panel on demand (from popup) =====
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.action === 'openSidePanel') {
    (async () => {
      try {
        const tabId = message.tabId || sender?.tab?.id;
        if (chrome.sidePanel && chrome.sidePanel.open && tabId) {
          await chrome.sidePanel.open({ tabId });
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: 'sidePanel.open indisponível' });
        }
      } catch (e) {
        sendResponse({ success: false, error: e?.message || String(e) });
      }
    })();
    return true;
  }
});
