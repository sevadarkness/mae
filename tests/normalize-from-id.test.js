/**
 * Tests for normalizeFromId function in sidepanel-router.js
 * Run this in browser console on the side panel to test
 */

(function() {
  'use strict';
  
  console.log('=== normalizeFromId Tests ===\n');
  
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
  
  // Mock normalizeFromId function from sidepanel-router.js
  function normalizeFromId(from, fullObj = null) {
    // Tenta extrair número de múltiplas fontes
    const sources = [
      from,
      fullObj?.phoneNumber,
      fullObj?.number,
      fullObj?.sender,
      fullObj?.from,
      fullObj?.chat,
      fullObj?.jid,
      fullObj?.id?.user,
      fullObj?.id?._serialized
    ];
    
    for (const src of sources) {
      if (!src) continue;
      let s = String(src).trim();
      
      // Remove sufixos do WhatsApp
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
        // Formata o número de forma legível
        if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
          // Número brasileiro (55 + DDD + 8/9 dígitos)
          const ddd = digits.slice(2, 4);
          const rest = digits.slice(4);
          if (rest.length === 9) {
            // Celular: 9 dígitos após o DDD
            return `+55 ${ddd} ${rest.slice(0, 5)}-${rest.slice(5)}`;
          } else if (rest.length === 8) {
            // Fixo: 8 dígitos após o DDD
            return `+55 ${ddd} ${rest.slice(0, 4)}-${rest.slice(4)}`;
          }
        }
        // Outros números internacionais
        return '+' + digits;
      }
    }
    
    // Se não encontrou número válido, retorna o original limpo
    let s = String(from ?? '').trim();
    s = s
      .replace(/@c\.us/g, '')
      .replace(/@s\.whatsapp\.net/g, '')
      .replace(/@g\.us/g, '')
      .replace(/@broadcast/g, '')
      .replace(/@lid/g, '');
    
    return s || 'Desconhecido';
  }
  
  // Test 1: Basic WhatsApp ID with @c.us suffix
  console.log('\n--- Test Group: WhatsApp IDs ---');
  assertEquals(
    normalizeFromId('5511999998888@c.us'),
    '+55 11 99999-8888',
    'Brazilian mobile with @c.us'
  );
  
  assertEquals(
    normalizeFromId('5511987654321@s.whatsapp.net'),
    '+55 11 98765-4321',
    'Brazilian mobile with @s.whatsapp.net'
  );
  
  assertEquals(
    normalizeFromId('551134567890@c.us'),
    '+55 11 3456-7890',
    'Brazilian landline with @c.us'
  );
  
  // Test 2: LID (Local ID) format - should fall back to other fields
  console.log('\n--- Test Group: LID Format ---');
  assertEquals(
    normalizeFromId('lid_12345@lid', {
      phoneNumber: '5511999998888'
    }),
    '+55 11 99999-8888',
    'LID with phoneNumber field'
  );
  
  assertEquals(
    normalizeFromId('internal_id_xyz', {
      chat: '5511987654321@c.us'
    }),
    '+55 11 98765-4321',
    'Internal ID with chat field'
  );
  
  assertEquals(
    normalizeFromId('unknown_format', {
      jid: '551134567890@s.whatsapp.net'
    }),
    '+55 11 3456-7890',
    'Unknown format with jid field'
  );
  
  // Test 3: Multiple sources - should use first valid
  console.log('\n--- Test Group: Multiple Sources ---');
  assertEquals(
    normalizeFromId('invalid', {
      from: 'also_invalid',
      phoneNumber: '5511999998888',
      number: '5511987654321'
    }),
    '+55 11 99999-8888',
    'Should use first valid phoneNumber'
  );
  
  assertEquals(
    normalizeFromId('', {
      id: {
        user: '5511999998888'
      }
    }),
    '+55 11 99999-8888',
    'Should extract from nested id.user'
  );
  
  // Test 4: International numbers
  console.log('\n--- Test Group: International Numbers ---');
  assertEquals(
    normalizeFromId('12025551234@c.us'),
    '+12025551234',
    'US number'
  );
  
  assertEquals(
    normalizeFromId('447700900123@c.us'),
    '+447700900123',
    'UK number'
  );
  
  // Test 5: Edge cases
  console.log('\n--- Test Group: Edge Cases ---');
  assertEquals(
    normalizeFromId(''),
    'Desconhecido',
    'Empty string'
  );
  
  assertEquals(
    normalizeFromId(null),
    'Desconhecido',
    'Null value'
  );
  
  assertEquals(
    normalizeFromId('invalid_short'),
    'invalid_short',
    'Invalid short string (no @lid removed)'
  );
  
  assertEquals(
    normalizeFromId('lid_12345@lid'),
    'lid_12345',
    'LID without fallback returns cleaned ID'
  );
  
  // Test 6: Group chats
  console.log('\n--- Test Group: Group Chats ---');
  assertEquals(
    normalizeFromId('12345-67890@g.us'),
    '+1234567890',
    'Group ID cleaned and formatted (10 digits treated as phone)'
  );
  
  // Test 7: Brazilian numbers with 13 digits (55 + DDD + 9 digits)
  console.log('\n--- Test Group: Brazilian Number Formats ---');
  assertEquals(
    normalizeFromId('5511999998888'),
    '+55 11 99999-8888',
    'Brazilian mobile without suffix'
  );
  
  assertEquals(
    normalizeFromId('551134567890'),
    '+55 11 3456-7890',
    'Brazilian landline without suffix'
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
  
  // Store results globally for inspection (browser only)
  if (typeof window !== 'undefined') {
    window.WHL_NormalizeFromIdTestResults = tests;
  }
  
})();
