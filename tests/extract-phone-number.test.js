/**
 * Tests for extractPhoneNumber function in wpp-hooks.js
 * Run this in browser console on WhatsApp Web page to test
 * 
 * This tests the fix for Bug: Recover showing LID instead of phone number
 */

(function() {
  'use strict';
  
  console.log('=== extractPhoneNumber Tests ===\n');
  
  const tests = [];
  let passed = 0;
  let failed = 0;
  
  function assertEquals(actual, expected, testName) {
    const success = actual === expected;
    tests.push({ testName, success, actual, expected });
    if (success) {
      passed++;
      console.log(`✅ PASS: ${testName}`);
    } else {
      failed++;
      console.error(`❌ FAIL: ${testName}`);
      console.error(`  Expected: ${expected}`);
      console.error(`  Actual: ${actual}`);
    }
  }
  
  // Mock extractPhoneNumber function from wpp-hooks.js
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
    
    for (const src of sources) {
      if (!src) continue;
      let s = String(src).trim();
      
      // Remove TODOS os sufixos do WhatsApp
      s = s
        .replace(/@c\.us/g, '')
        .replace(/@s\.whatsapp\.net/g, '')
        .replace(/@g\.us/g, '')
        .replace(/@broadcast/g, '')
        .replace(/@lid/g, '');
      
      // Extrai apenas dígitos
      const digits = s.replace(/\D/g, '');
      
      // Se tem entre 10 e 15 dígitos, é provavelmente um número de telefone
      if (digits.length >= 10 && digits.length <= 15) {
        return digits;
      }
    }
    
    // Fallback: retorna o que tiver, limpo
    let fallback = message?.author?._serialized || 
                   message?.from?._serialized || 
                   message?.id?.remote?._serialized || 
                   message?.from?.user || '';
    
    fallback = String(fallback)
      .replace(/@c\.us|@s\.whatsapp\.net|@g\.us|@broadcast|@lid/g, '');
    
    return fallback || 'Desconhecido';
  }
  
  // Test 1: Extract from standard WhatsApp ID
  console.log('\n--- Test Group: Standard WhatsApp IDs ---');
  assertEquals(
    extractPhoneNumber({
      from: { _serialized: '5511999998888@c.us' }
    }),
    '5511999998888',
    'Extract from from._serialized with @c.us'
  );
  
  assertEquals(
    extractPhoneNumber({
      author: { _serialized: '5511987654321@s.whatsapp.net' }
    }),
    '5511987654321',
    'Extract from author._serialized with @s.whatsapp.net'
  );
  
  // Test 2: Extract from LID format (the main bug)
  console.log('\n--- Test Group: LID Format (Main Bug) ---');
  assertEquals(
    extractPhoneNumber({
      from: { _serialized: '270953061822606@lid' },
      sender: '5511999998888'
    }),
    '5511999998888',
    'LID in from._serialized, should use sender field'
  );
  
  assertEquals(
    extractPhoneNumber({
      from: { _serialized: '270953061822606@lid' },
      phoneNumber: '5511987654321'
    }),
    '5511987654321',
    'LID in from._serialized, should use phoneNumber field'
  );
  
  assertEquals(
    extractPhoneNumber({
      author: { _serialized: '270953061822606@lid' },
      id: { remote: { user: '5511999998888' } }
    }),
    '5511999998888',
    'LID in author._serialized, should use id.remote.user'
  );
  
  // Test 3: Extract from alternative fields
  console.log('\n--- Test Group: Alternative Fields ---');
  assertEquals(
    extractPhoneNumber({
      phoneNumber: '5511999998888'
    }),
    '5511999998888',
    'Extract from phoneNumber field'
  );
  
  assertEquals(
    extractPhoneNumber({
      number: '5511987654321'
    }),
    '5511987654321',
    'Extract from number field'
  );
  
  assertEquals(
    extractPhoneNumber({
      sender: '5511999998888@c.us'
    }),
    '5511999998888',
    'Extract from sender field with suffix'
  );
  
  assertEquals(
    extractPhoneNumber({
      chat: {
        contact: {
          number: '5511999998888'
        }
      }
    }),
    '5511999998888',
    'Extract from nested chat.contact.number'
  );
  
  // Test 4: Remove all WhatsApp suffixes
  console.log('\n--- Test Group: Suffix Removal ---');
  assertEquals(
    extractPhoneNumber({
      from: { _serialized: '5511999998888@c.us' }
    }),
    '5511999998888',
    'Remove @c.us suffix'
  );
  
  assertEquals(
    extractPhoneNumber({
      from: { _serialized: '5511999998888@s.whatsapp.net' }
    }),
    '5511999998888',
    'Remove @s.whatsapp.net suffix'
  );
  
  assertEquals(
    extractPhoneNumber({
      from: { _serialized: '5511999998888@g.us' }
    }),
    '5511999998888',
    'Remove @g.us suffix'
  );
  
  assertEquals(
    extractPhoneNumber({
      from: { _serialized: '5511999998888@broadcast' }
    }),
    '5511999998888',
    'Remove @broadcast suffix'
  );
  
  assertEquals(
    extractPhoneNumber({
      from: { _serialized: '270953061822606@lid' },
      author: { user: '5511999998888' }
    }),
    '5511999998888',
    'Remove @lid suffix and find in alternative field'
  );
  
  // Test 5: Phone number validation (10-15 digits)
  console.log('\n--- Test Group: Phone Validation ---');
  assertEquals(
    extractPhoneNumber({
      from: { _serialized: '5511999998888@c.us' }
    }),
    '5511999998888',
    'Valid BR phone - 13 digits'
  );
  
  assertEquals(
    extractPhoneNumber({
      from: { _serialized: '12025551234@c.us' }
    }),
    '12025551234',
    'Valid US phone - 11 digits'
  );
  
  assertEquals(
    extractPhoneNumber({
      from: { _serialized: '447700900123@c.us' }
    }),
    '447700900123',
    'Valid UK phone - 12 digits'
  );
  
  // Test 6: Edge cases and fallback
  console.log('\n--- Test Group: Edge Cases ---');
  assertEquals(
    extractPhoneNumber({
      from: { _serialized: 'abc123@c.us' }
    }),
    'abc123',
    'Invalid format falls back to cleaned string'
  );
  
  assertEquals(
    extractPhoneNumber({}),
    'Desconhecido',
    'Empty message object returns Desconhecido'
  );
  
  assertEquals(
    extractPhoneNumber({
      from: { _serialized: '270953061822606@lid' }
    }),
    '270953061822606',
    'LID without alternative field returns cleaned LID'
  );
  
  // Test 7: Priority of fields (should check in order)
  console.log('\n--- Test Group: Field Priority ---');
  assertEquals(
    extractPhoneNumber({
      sender: '5511111111111',
      phoneNumber: '5522222222222',
      from: { _serialized: '5533333333333@c.us' }
    }),
    '5511111111111',
    'sender field has highest priority'
  );
  
  assertEquals(
    extractPhoneNumber({
      phoneNumber: '5522222222222',
      from: { _serialized: '5533333333333@c.us' }
    }),
    '5522222222222',
    'phoneNumber field has priority over from'
  );
  
  // Test 8: Multiple suffixes in same string
  console.log('\n--- Test Group: Multiple Suffixes ---');
  assertEquals(
    extractPhoneNumber({
      from: { _serialized: '5511999998888@c.us@lid' }
    }),
    '5511999998888',
    'Remove multiple suffixes'
  );
  
  // Test 9: Real-world scenario from the bug report
  console.log('\n--- Test Group: Real Bug Scenario ---');
  assertEquals(
    extractPhoneNumber({
      id: { remote: { _serialized: '270953061822606@lid' } },
      from: { _serialized: '270953061822606@lid' },
      author: { _serialized: '270953061822606@lid' },
      sender: '5511999998888'
    }),
    '5511999998888',
    'Real bug: LID everywhere, should find sender'
  );
  
  // Summary
  console.log('\n=== Test Summary ===');
  console.log(`Total Tests: ${tests.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / tests.length) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed!');
  } else {
    console.log('\n⚠️ Some tests failed. Review the output above.');
  }
  
  // Store results globally for inspection
  if (typeof window !== 'undefined') {
    window.WHL_ExtractPhoneNumberTestResults = tests;
  }
  
})();
