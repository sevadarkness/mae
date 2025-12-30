# WhatsHybrid Lite - Tests

## Phone Validator Tests

To run the phone validator tests:

1. Load the extension in Chrome/Edge
2. Open WhatsApp Web (https://web.whatsapp.com)
3. Open browser Developer Console (F12)
4. Copy and paste the contents of `phone-validator.test.js` into the console
5. Press Enter to run the tests

The tests will validate:
- Phone number sanitization
- Phone number normalization (adding country codes)
- Phone number validation
- WhatsApp URL formatting
- WhatsApp ID parsing
- Batch validation
- Phone list parsing

Expected output:
```
=== Phone Validator Tests ===

--- Test Group: sanitizePhone ---
✅ PASS: Sanitize BR mobile with formatting
...

=== Test Summary ===
Total Tests: 24
✅ Passed: 24
❌ Failed: 0
Success Rate: 100.0%

🎉 All tests passed!
```

## Manual Testing

For full extension testing:

1. Install the extension in developer mode
2. Navigate to WhatsApp Web
3. Test key features:
   - Contact extraction
   - Campaign creation
   - Message sending
   - State persistence
   - Error handling

## Notes

- These are lightweight browser console tests, not a full test framework
- The extension doesn't use a bundler, so standard test frameworks are not easily integrated
- Focus is on validating critical utility functions
