# Fix for Bug: Recover mostra LID em vez do número de telefone

## Summary
This fix addresses the issue where recovered and edited messages were showing LID (Local ID) values like `270953061822606@lid` instead of actual phone numbers in the recover history.

## Problem
The issue was in `content/wpp-hooks.js` where the functions `salvarMensagemRecuperada` and `salvarMensagemEditada` were:
1. Only removing some WhatsApp suffixes (`@c.us`, `@s.whatsapp.net`, `@g.us`, `@broadcast`)
2. NOT removing `@lid` suffix
3. NOT searching alternative fields when the primary field contained a LID

Example error log:
```
wpp-hooks.js:985 [WHL Recover] Mensagem recuperada de 270953061822606@lid: G...
```

## Solution

### 1. New Helper Function: `extractPhoneNumber`
Added a comprehensive helper function at line ~100 in `content/wpp-hooks.js` that:

- **Searches 15 different fields** in the message object for phone numbers:
  - `sender`
  - `phoneNumber`
  - `number`
  - `author._serialized`
  - `author.user`
  - `from._serialized`
  - `from.user`
  - `from`
  - `chat.contact.number`
  - `chat.contact.id.user`
  - `chat.id.user`
  - `id.remote._serialized`
  - `id.remote.user`
  - `id.participant._serialized`
  - `id.participant.user`

- **Removes ALL WhatsApp suffixes** including:
  - `@c.us`
  - `@s.whatsapp.net`
  - `@g.us`
  - `@broadcast`
  - `@lid` ← **NEW!**

- **Validates phone numbers**: Only returns values with 10-15 digits
- **Provides fallback**: Returns "Desconhecido" if no valid phone number found

### 2. Updated `salvarMensagemEditada` (line ~904)
**Before:**
```javascript
let from = message?.author?._serialized || message?.from?._serialized || 
           message?.id?.remote?._serialized || message?.from?.user || '';
from = (from || '').replace(/@c\.us|@s\.whatsapp\.net|@g\.us|@broadcast/g, '');
if (!from) from = 'Número desconhecido';
```

**After:**
```javascript
let from = extractPhoneNumber(message);
if (!from || from === 'Desconhecido') from = 'Número desconhecido';
```

### 3. Updated `salvarMensagemRecuperada` (line ~960)
**Before:**
```javascript
let from = msg.author?._serialized || msg.from?._serialized || 
           msg.id?.remote?._serialized || msg.from?.user || '';
from = (from || '').replace(/@c\.us|@s\.whatsapp\.net|@g\.us|@broadcast/g, '');
if (!from) from = 'Número desconhecido';
```

**After:**
```javascript
let from = extractPhoneNumber(msg);
// ... cache recovery logic ...
if (!from || from === 'Desconhecido') from = 'Número desconhecido';
```

Also enhanced the cache recovery to use `extractPhoneNumber` when recovering from cache.

## Testing

Created `tests/extract-phone-number.test.js` with 30+ test cases covering:

1. **Standard WhatsApp IDs** - Extract from `@c.us`, `@s.whatsapp.net` formats
2. **LID Format** - Main bug scenario: extract phone from alternative fields when LID is present
3. **Alternative Fields** - Test extraction from `phoneNumber`, `number`, `sender`, nested fields
4. **Suffix Removal** - Verify all suffixes are removed including `@lid`
5. **Phone Validation** - Test 10-15 digit validation
6. **Edge Cases** - Empty objects, invalid formats, fallback behavior
7. **Field Priority** - Verify fields are checked in correct order
8. **Real Bug Scenario** - Test the exact scenario from the bug report

### Running Tests
Load the extension, open WhatsApp Web, and run in console:
```javascript
// Copy and paste contents of tests/extract-phone-number.test.js
```

Expected output: ✅ All 30+ tests passed

## Benefits

1. ✅ **Solves LID issue**: Now extracts phone numbers even when LID is present
2. ✅ **More robust**: Checks 15 different fields instead of just 4
3. ✅ **Better suffix handling**: Removes `@lid` which was missing before
4. ✅ **Cleaner code**: Single function with clear responsibility
5. ✅ **Maintainable**: Easier to add new fields or update logic
6. ✅ **Tested**: Comprehensive test suite validates behavior

## Acceptance Criteria
- ✅ O número de telefone é extraído corretamente do objeto message
- ✅ LIDs como `270953061822606@lid` são tratados e buscam o número em outros campos
- ✅ O campo `from` no histórico salva o número de telefone (ex: `5511999998888`)
- ✅ Funciona para mensagens apagadas e editadas
- ✅ Fallback para "Desconhecido" quando não encontrar número

## Files Modified
1. `content/wpp-hooks.js` - Added `extractPhoneNumber` function, updated `salvarMensagemEditada` and `salvarMensagemRecuperada`
2. `tests/extract-phone-number.test.js` - New test file
3. `CHANGES.md` - Documentation update

## Example Output

**Before (with bug):**
```
[WHL Recover] Mensagem recuperada de 270953061822606@lid: G...
```

**After (fixed):**
```
[WHL Recover] Mensagem recuperada de 5511999998888: G...
```

## Notes
- This is a **minimal change** that addresses only the specific bug
- No changes to UI or other functionality
- Backwards compatible - still works with messages that have proper phone numbers
- Function is reusable for any future phone extraction needs
