# Bug Fixes Testing Guide

This document describes how to test the three critical bug fixes implemented in this PR.

## Bug Fix 1: Invalid Phone Number Detection

### What was fixed:
- System now properly detects when a WhatsApp number doesn't exist
- Marks as failed with "Número inexistente" instead of sending to wrong chat
- Validates the open chat matches the expected number before sending

### How to test:

1. **Load the extension** in Chrome (developer mode)
2. **Open WhatsApp Web** and ensure you're logged in
3. **Create a campaign** with a mix of valid and invalid numbers:
   ```
   5511999999999
   5511888888888
   5511777777777
   1234567890
   9999999999
   ```
4. **Start the campaign** and watch the console logs (F12)
5. **Expected behavior:**
   - Valid numbers: Opens chat, validates, sends message ✅
   - Invalid numbers: Detects error popup/modal, marks as "failed" with reason "Número inexistente" ✅
   - Never sends a message to the wrong/currently open chat ✅

### Console logs to look for:
```javascript
[WHL] 📨 Enviando via Input + Enter para: 1234567890
[WHL] 🔗 Abrindo chat via URL...
[WHL] ❌ Número inválido detectado no popup
[WHL] ❌ Falha ao enviar para 1234567890 : Número inexistente
```

### What to check in UI:
- Status column shows "failed" for invalid numbers
- Error reason shows "Número inexistente"
- Campaign continues to next number automatically
- No messages sent to unintended recipients

---

## Bug Fix 2: Side Panel Opening on Button Click

### What was fixed:
- Side panel now reliably opens when clicking any top panel button
- Added 3-tier fallback strategy (tabId → windowId → query active tab)
- Enhanced error handling and logging

### How to test:

1. **Load the extension** in Chrome
2. **Open WhatsApp Web** in a new tab
3. **Look for the top panel** (should appear at the top of WhatsApp)
4. **Click each button** in the top panel:
   - 📨 Disparo de mensagens
   - 📥 Extrator
   - 👥 Grupos
   - 🔄 Recover
   - ⚙️ Config
5. **Expected behavior:**
   - Side panel opens on EVERY click ✅
   - Side panel switches to the correct view ✅
   - No need to manually open the side panel ✅

### Console logs to look for:
```javascript
[TopPanel] View switched to: extrator
[TopPanel] Attempting to open side panel with view: extrator
[TopPanel] Side panel opened successfully for view: extrator
[WHL Background] Side panel opened for tab: 123456
```

### What to check:
- Side panel appears immediately after clicking a button
- Side panel content matches the selected view
- No errors in console about side panel failing to open
- Can switch between views smoothly

---

## Bug Fix 3: Side Panel Only Enabled in WhatsApp Tabs

### What was fixed:
- Side panel now automatically disables when switching to non-WhatsApp tabs
- Re-enables when returning to WhatsApp Web tabs
- Listens to both tab activation and URL changes

### How to test:

1. **Load the extension** in Chrome
2. **Open WhatsApp Web** in one tab
3. **Open the side panel** by clicking any top panel button
4. **Open a different website** in a new tab (e.g., google.com)
5. **Switch to the non-WhatsApp tab**
6. **Expected behavior:**
   - Side panel should close/disable ✅
   - Side panel option not available in browser UI ✅
7. **Switch back to WhatsApp Web tab**
8. **Expected behavior:**
   - Side panel becomes available again ✅
   - Can click top panel buttons to open side panel ✅

### Console logs to look for:
```javascript
// When switching away from WhatsApp:
[WHL Background] Side panel disabled for non-WhatsApp tab: 123457

// When switching back to WhatsApp:
[WHL Background] Side panel enabled for WhatsApp tab: 123456
```

### What to check:
- Side panel is ONLY visible/accessible in WhatsApp Web tabs
- Side panel automatically manages itself based on active tab
- No manual intervention needed to enable/disable
- Works when navigating URLs within the same tab

---

## Additional Testing Scenarios

### Scenario 1: Full Campaign with Mixed Numbers
1. Create a campaign with 5 valid numbers and 2 invalid
2. Start campaign
3. Verify invalid numbers are detected and skipped
4. Verify valid numbers receive messages
5. Check final stats show correct sent/failed counts

### Scenario 2: Multiple WhatsApp Tabs
1. Open WhatsApp Web in 2 tabs
2. Test side panel in Tab 1
3. Switch to Tab 2
4. Verify side panel works in Tab 2
5. Verify no conflicts between tabs

### Scenario 3: Navigation Testing
1. Open WhatsApp Web
2. Open side panel
3. Navigate to settings.whatsapp.com
4. Verify side panel closes
5. Navigate back to web.whatsapp.com
6. Verify side panel can be reopened

---

## Known Limitations

1. **Error Detection Timing**: The system waits up to 30 seconds (60 attempts × 500ms) to detect invalid numbers. If WhatsApp is slow, this may take a moment.

2. **Popup Text Detection**: Error detection relies on text content in popups. If WhatsApp changes their error messages, detection may need updating.

3. **Chat Validation**: The `validateOpenChat` function uses multiple methods to verify the chat. In rare cases with unusual chat names/numbers, validation might need adjustment.

---

## Rollback Instructions

If any issues are found:

1. Revert to previous commit: `git revert dd133bc`
2. Rebuild extension
3. Reload in Chrome
4. Report issues with specific error logs

---

## Debug Mode

To enable detailed logging:

1. Open console (F12)
2. Run: `localStorage.setItem('whl_debug', 'true')`
3. Reload WhatsApp Web
4. All debug logs will now appear

To disable:
```javascript
localStorage.removeItem('whl_debug')
```

---

## Success Criteria

✅ Bug 1: No messages sent to wrong chats, invalid numbers properly detected and marked as failed

✅ Bug 2: Side panel opens reliably on every top panel button click

✅ Bug 3: Side panel only appears in WhatsApp Web tabs, automatically manages itself

---

## Contact

For issues or questions about these fixes, check:
- Console logs (F12)
- Extension error page (chrome://extensions)
- GitHub Issues

Report bugs with:
- Browser version
- Extension version
- Console logs
- Steps to reproduce
