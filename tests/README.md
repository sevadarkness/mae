# WhatsHybrid Lite - Tests

## Overview

This directory contains browser console tests for WhatsHybrid Lite. Since the extension doesn't use a bundler or test framework, tests are designed to run directly in the browser console on WhatsApp Web.

## Available Tests

### 1. Phone Validator Tests (`phone-validator.test.js`)

Validates phone number handling utilities:
- Phone number sanitization
- Phone number normalization (adding country codes)
- Phone number validation
- WhatsApp URL formatting
- WhatsApp ID parsing
- Batch validation
- Phone list parsing

### 2. Detect Message Type Tests (`detect-message-type.test.js`)

Validates the `detectMessageType` function that identifies message content types:
- JPEG base64 detection (`/9j/` prefix)
- PNG base64 detection (`iVBOR` prefix)
- Data URL detection (`data:image/`, `data:video/`, `data:audio/`)
- Text message handling
- Edge cases (null, undefined, empty strings)

### 3. Image Rendering Tests (`image-rendering.test.js`)

Validates image rendering in the recover timeline:
- Base64 image detection
- Data URL conversion
- Rendering decisions based on content type
- HTML generation for image display
- Mixed content scenarios (text vs images)
- Edge cases

### 4. Template Manager Tests (`template-manager.test.js`)

Validates the TemplateManager class functionality:
- Variable processing (saudacao based on time of day)
- Contact data replacement ({nome}, {empresa}, {numero})
- Date and time formatting ({data}, {hora})
- Case-insensitive variable matching
- Empty contact handling
- Category filtering
- Template lookup by ID

## How to Run Tests

1. **Load the extension** in Chrome/Edge (Developer Mode)
2. **Open WhatsApp Web** (https://web.whatsapp.com)
3. **Open Developer Console** (F12 or Ctrl+Shift+J / Cmd+Option+J)
4. **Copy and paste** the test file contents into the console
5. **Press Enter** to run the tests

### Example Expected Output

```
=== Detect Message Type Tests ===

--- Test Group: JPEG Detection ---
✅ PASS: Should detect JPEG base64 as image
✅ PASS: Should override chat type for JPEG base64

--- Test Group: PNG Detection ---
✅ PASS: Should detect PNG base64 as image
✅ PASS: Should detect PNG base64 even without original type

...

=== Test Summary ===
Total Tests: 20
✅ Passed: 20
❌ Failed: 0
Success Rate: 100.0%

🎉 All tests passed!
```

## Test Results

Test results are stored in global window variables for inspection:
- `window.WHL_TestResults` - Phone validator test results
- `window.WHL_detectMessageType_TestResults` - Message type detection results
- `window.WHL_ImageRendering_TestResults` - Image rendering test results

You can inspect these in the console to see detailed results:
```javascript
console.table(window.WHL_detectMessageType_TestResults);
```

## Manual Testing

For full extension testing:

1. Install the extension in developer mode
2. Navigate to WhatsApp Web
3. Test key features:
   - Contact extraction
   - Campaign creation
   - Message sending
   - Recover functionality (deleted/edited messages)
   - Image recovery and display
   - State persistence
   - Error handling

### Testing Image Recovery Feature

1. Send an image to a contact
2. Delete the image (sender revoke)
3. Open the extension side panel
4. Navigate to the "Recover" tab
5. Verify the deleted image is displayed as an image (not base64 text)
6. Click the image to open it in a new tab

## Notes

- These are lightweight browser console tests, not a full test framework
- The extension doesn't use a bundler, so standard test frameworks are not easily integrated
- Focus is on validating critical utility functions and business logic
- Tests are designed to be self-contained and not require external dependencies
