# Chat Backup Feature - Testing Guide

## Overview
The Chat Backup feature allows users to export WhatsApp conversations in multiple formats (HTML, CSV, JSON, TXT) directly from the WhatsHybrid Side Panel.

## Features Implemented

### 1. UI Components ✅
- **Contact Selector**: Load and search through all chats
- **Chat Selection**: Click to select a chat for backup
- **Export Options**:
  - Format selection (HTML, CSV, JSON, TXT)
  - Message limit (1K, 5K, 10K, 50K, 100K, All)
  - Date range filter (From/To)
  - Include/exclude date and sender
  - Media export checkboxes (scaffolded, not fully implemented)
- **Progress Tracking**: Real-time progress bar with status updates

### 2. Core Functionality ✅
- **getBackupContacts()**: Retrieves all chats (contacts and groups)
- **getBackupChatInfo()**: Gets detailed information about a selected chat
- **getActiveChatMessages()**: Loads messages using WhatsApp's loadEarlierMsgs() API
- **File Generation**: Generates export files in 4 formats
- **Download**: Automatically downloads the generated file

## Testing Steps

### Test 1: Load Contacts
1. Open WhatsApp Web (web.whatsapp.com)
2. Click the WhatsHybrid extension icon to open Side Panel
3. Click on "💾 Backup" in the top navigation
4. Click "📂 Carregar Chats" button
5. **Expected**: List of all chats should appear with search functionality

### Test 2: Select a Chat
1. After loading contacts, click on any chat in the list
2. **Expected**: 
   - Chat should be highlighted
   - Selected chat card should appear showing chat name and type
   - Export options should become visible

### Test 3: Export as HTML
1. Select a chat
2. Choose "HTML (Visual)" format
3. Set message limit (e.g., 1,000 messages)
4. Click "▶️ Exportar Conversa"
5. **Expected**:
   - Progress bar should appear
   - Status messages should update ("Loading messages...", "Generating file...")
   - File should automatically download with name like `backup_ChatName_timestamp.html`

### Test 4: Export as CSV
1. Select a chat
2. Choose "CSV (Planilha)" format
3. Click "▶️ Exportar Conversa"
4. **Expected**: CSV file downloads, openable in Excel/Google Sheets

### Test 5: Export as JSON
1. Select a chat
2. Choose "JSON (Dados)" format
3. Click "▶️ Exportar Conversa"
4. **Expected**: JSON file downloads with structured data

### Test 6: Export as TXT
1. Select a chat
2. Choose "TXT (Texto)" format
3. Click "▶️ Exportar Conversa"
4. **Expected**: Plain text file downloads

### Test 7: Date Range Filter
1. Select a chat
2. Set "De" (From) date to a past date
3. Set "Até" (To) date to today
4. Click "▶️ Exportar Conversa"
5. **Expected**: Only messages within the date range should be exported

### Test 8: Options Testing
1. Select a chat
2. Uncheck "Incluir data/hora"
3. Uncheck "Incluir remetente"
4. Export
5. **Expected**: Exported file should not contain timestamps or sender names

### Test 9: Search Functionality
1. Load contacts
2. Type a chat name in the search field
3. **Expected**: List should filter to show only matching chats

## Known Limitations

### Media Export (Deferred)
- Media export checkboxes (Images, Audios, Documents) are present in UI but not fully implemented
- The backend functions for media download (`downloadMediaForExport`, `createMediaZip`) are scaffolded but need additional implementation
- This feature can be added in a future update

### Message Limit
- WhatsApp Web's `loadEarlierMsgs()` loads ~30 messages at a time
- Very large exports (50K+, All) may take significant time
- Progress reporting keeps user informed during long operations

## File Formats

### HTML
- Visual representation styled like WhatsApp
- Color-coded messages (sent vs received)
- Includes timestamps and sender names (if enabled)

### CSV
- Spreadsheet-friendly format
- Columns: Remetente, Mensagem, Data/Hora
- UTF-8 BOM for Excel compatibility

### JSON
- Structured data format
- Includes metadata (export date, chat name, message count)
- Each message is a separate object with all fields

### TXT
- Plain text format
- Easy to read and share
- Preserves message order

## Browser Console Debugging

To monitor the backup process:
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for messages prefixed with `[WHL Backup]`
4. Progress updates should appear as messages are loaded

## Error Handling

Common errors and solutions:
- **"Chat não encontrado"**: The selected chat ID is invalid
- **"Message collection não disponível"**: WhatsApp Web isn't fully loaded
- **"Timeout"**: Operation took longer than expected (increase timeout or reduce message limit)

## Integration Points

### Side Panel Router (`sidepanel-router.js`)
- `backupInit()`: Initializes event listeners
- `backupLoadContacts()`: Requests chat list from content script
- `backupSelectContact()`: Handles chat selection
- `backupStartExport()`: Initiates export process

### WPP Hooks (`content/wpp-hooks.js`)
- `getBackupContacts()`: Accesses WhatsApp's ChatCollection
- `getActiveChatMessages()`: Uses loadEarlierMsgs() to load message history
- `generateHTML/CSV/JSON/TXT()`: File generation functions
- `downloadBackupFile()`: Creates and triggers download

### Content Bridge (`content/content.js`)
- Handles `GET_BACKUP_CONTACTS` command
- Handles `GET_BACKUP_CHAT_INFO` command  
- Handles `START_BACKUP` command
- Forwards requests between Side Panel and wpp-hooks

## Next Steps for Full Implementation

1. **Media Download Implementation**:
   - Implement `downloadMediaForExport()` function
   - Add JSZip integration for creating media archives
   - Update progress reporting for media downloads
   
2. **Cancel Functionality**:
   - Implement proper cancellation logic
   - Add abort signals for ongoing operations
   
3. **Background Download Handler**:
   - If needed, add chrome.downloads API support in background.js
   - Handle large file downloads through background service worker

4. **Performance Optimization**:
   - Add caching for frequently accessed chats
   - Implement pagination for very large exports
   - Add memory management for large message sets

## Success Criteria

✅ User can load all chats
✅ User can select a specific chat
✅ User can export in 4 different formats
✅ Date range filtering works
✅ Include/exclude options work
✅ Progress tracking is visible
✅ Files download automatically
✅ No console errors during operation

## Conclusion

The Chat Backup feature is fully functional for text message export in all 4 formats. The UI is complete, styled consistently with the WhatsHybrid theme, and provides a smooth user experience. Media export functionality is scaffolded and can be implemented in a future iteration if needed.
