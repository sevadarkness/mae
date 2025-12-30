/**
 * Simple validation tests for phone validator utility
 * Run this in browser console on WhatsApp Web page to test
 */

(function() {
  'use strict';
  
  console.log('=== Phone Validator Tests ===\n');
  
  const tests = [];
  let passed = 0;
  let failed = 0;
  
  function assertEquals(actual, expected, testName) {
    const success = JSON.stringify(actual) === JSON.stringify(expected);
    tests.push({ testName, success, actual, expected });
    if (success) {
      passed++;
      console.log(`✅ PASS: ${testName}`);
    } else {
      failed++;
      console.error(`❌ FAIL: ${testName}`);
      console.error(`  Expected: ${JSON.stringify(expected)}`);
      console.error(`  Actual: ${JSON.stringify(actual)}`);
    }
  }
  
  function assertTrue(actual, testName) {
    const success = actual === true;
    tests.push({ testName, success, actual, expected: true });
    if (success) {
      passed++;
      console.log(`✅ PASS: ${testName}`);
    } else {
      failed++;
      console.error(`❌ FAIL: ${testName}`);
      console.error(`  Expected: true`);
      console.error(`  Actual: ${actual}`);
    }
  }
  
  function assertFalse(actual, testName) {
    const success = actual === false;
    tests.push({ testName, success, actual, expected: false });
    if (success) {
      passed++;
      console.log(`✅ PASS: ${testName}`);
    } else {
      failed++;
      console.error(`❌ FAIL: ${testName}`);
      console.error(`  Expected: false`);
      console.error(`  Actual: ${actual}`);
    }
  }
  
  // Check if utility is loaded
  if (typeof window.WHL_PhoneValidator === 'undefined') {
    console.error('❌ WHL_PhoneValidator not found! Make sure utility modules are loaded.');
    return;
  }
  
  const validator = window.WHL_PhoneValidator;
  
  // Test 1: Sanitize phone numbers
  console.log('\n--- Test Group: sanitizePhone ---');
  assertEquals(validator.sanitizePhone('(11) 98765-4321'), '11987654321', 'Sanitize BR mobile with formatting');
  assertEquals(validator.sanitizePhone('+55 11 98765-4321'), '5511987654321', 'Sanitize BR mobile with country code');
  assertEquals(validator.sanitizePhone('11-3456-7890'), '1134567890', 'Sanitize BR landline');
  assertEquals(validator.sanitizePhone(''), '', 'Sanitize empty string');
  
  // Test 2: Normalize phone numbers
  console.log('\n--- Test Group: normalizePhone ---');
  assertEquals(validator.normalizePhone('11987654321'), '5511987654321', 'Normalize BR mobile (11 digits)');
  assertEquals(validator.normalizePhone('1134567890'), '551134567890', 'Normalize BR landline (10 digits)');
  assertEquals(validator.normalizePhone('5511987654321'), '5511987654321', 'Already normalized phone');
  assertEquals(validator.normalizePhone('123'), null, 'Too short number');
  assertEquals(validator.normalizePhone('12345678901234567890'), null, 'Too long number');
  
  // Test 3: Validate phone numbers
  console.log('\n--- Test Group: isValidPhone ---');
  assertTrue(validator.isValidPhone('11987654321'), 'Valid BR mobile');
  assertTrue(validator.isValidPhone('5511987654321'), 'Valid BR mobile with country code');
  assertTrue(validator.isValidPhone('1134567890'), 'Valid BR landline');
  assertFalse(validator.isValidPhone('123'), 'Invalid - too short');
  assertFalse(validator.isValidPhone(''), 'Invalid - empty');
  assertFalse(validator.isValidPhone(null), 'Invalid - null');
  
  // Test 4: Format for WhatsApp
  console.log('\n--- Test Group: formatForWhatsApp ---');
  assertEquals(validator.formatForWhatsApp('11987654321'), '5511987654321', 'Format BR mobile for WhatsApp');
  assertEquals(validator.formatForWhatsApp('(11) 98765-4321'), '5511987654321', 'Format with formatting for WhatsApp');
  
  // Test 5: Parse WhatsApp ID
  console.log('\n--- Test Group: parseWhatsAppId ---');
  assertEquals(validator.parseWhatsAppId('5511987654321@c.us'), '5511987654321', 'Parse WhatsApp contact ID');
  assertEquals(validator.parseWhatsAppId('5511987654321@g.us'), '5511987654321', 'Parse WhatsApp group ID');
  assertEquals(validator.parseWhatsAppId('invalid'), null, 'Parse invalid ID');
  
  // Test 6: Batch validation
  console.log('\n--- Test Group: batchValidatePhones ---');
  const batchResult = validator.batchValidatePhones([
    '11987654321',
    '1134567890',
    '123',
    '5511987654321'
  ]);
  assertTrue(batchResult.valid.length === 3, 'Batch validation - 3 valid numbers');
  assertTrue(batchResult.invalid.length === 1, 'Batch validation - 1 invalid number');
  
  // Test 7: Parse phone list
  console.log('\n--- Test Group: parsePhoneList ---');
  const listResult = validator.parsePhoneList(`
    11987654321
    1134567890
    123
    (21) 98765-4321
  `);
  assertTrue(listResult.valid.length === 3, 'Parse list - 3 valid numbers');
  assertTrue(listResult.invalid.length === 1, 'Parse list - 1 invalid number');
  
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
  window.WHL_TestResults = tests;
  
})();
