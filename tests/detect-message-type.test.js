/**
 * Tests for detectMessageType function
 * Run this in browser console on WhatsApp Web page to test
 */

(function() {
  'use strict';
  
  console.log('=== detectMessageType Tests ===\n');
  
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
  
  // Mock detectMessageType function for testing
  // This should match the implementation in wpp-hooks.js
  function detectMessageType(body, originalType) {
    if (!body || typeof body !== 'string') return originalType || 'text';
    
    // Detectar imagens base64
    // JPEG começa com /9j/
    // PNG começa com iVBOR
    if (body.startsWith('/9j/') || body.startsWith('iVBOR')) {
      return 'image';
    }
    
    // Detectar data URLs
    if (body.startsWith('data:image')) return 'image';
    if (body.startsWith('data:video')) return 'video';
    if (body.startsWith('data:audio')) return 'audio';
    
    // Manter tipo original se não for detectado
    return originalType || 'text';
  }
  
  // Test 1: Detect JPEG base64
  console.log('\n--- Test Group: JPEG Detection ---');
  assertEquals(
    detectMessageType('/9j/4AAQSkZJRgABAQAAAQABAAD...', 'protocol'),
    'image',
    'Should detect JPEG base64 as image'
  );
  
  assertEquals(
    detectMessageType('/9j/4AAQSkZJRgABAQAAAQABAAD...', 'chat'),
    'image',
    'Should override chat type for JPEG base64'
  );
  
  // Test 2: Detect PNG base64
  console.log('\n--- Test Group: PNG Detection ---');
  assertEquals(
    detectMessageType('iVBORw0KGgoAAAANSUhEUgAA...', 'protocol'),
    'image',
    'Should detect PNG base64 as image'
  );
  
  assertEquals(
    detectMessageType('iVBORw0KGgoAAAANSUhEUgAA...', null),
    'image',
    'Should detect PNG base64 even without original type'
  );
  
  // Test 3: Detect data URLs
  console.log('\n--- Test Group: Data URL Detection ---');
  assertEquals(
    detectMessageType('data:image/jpeg;base64,/9j/4AAQ...', 'protocol'),
    'image',
    'Should detect image data URL'
  );
  
  assertEquals(
    detectMessageType('data:video/mp4;base64,AAAAIGZ0...', 'protocol'),
    'video',
    'Should detect video data URL'
  );
  
  assertEquals(
    detectMessageType('data:audio/mp3;base64,SUQzBA...', 'protocol'),
    'audio',
    'Should detect audio data URL'
  );
  
  // Test 4: Text messages
  console.log('\n--- Test Group: Text Messages ---');
  assertEquals(
    detectMessageType('Hello World!', 'chat'),
    'chat',
    'Should keep chat type for text messages'
  );
  
  assertEquals(
    detectMessageType('Regular text message', null),
    'text',
    'Should default to text for regular messages'
  );
  
  assertEquals(
    detectMessageType('Message with emoji 😀', 'chat'),
    'chat',
    'Should preserve chat type for emoji messages'
  );
  
  // Test 5: Edge cases
  console.log('\n--- Test Group: Edge Cases ---');
  assertEquals(
    detectMessageType('', 'chat'),
    'chat',
    'Should preserve type for empty string'
  );
  
  assertEquals(
    detectMessageType(null, 'chat'),
    'chat',
    'Should preserve type for null body'
  );
  
  assertEquals(
    detectMessageType(undefined, 'protocol'),
    'protocol',
    'Should preserve type for undefined body'
  );
  
  assertEquals(
    detectMessageType('', null),
    'text',
    'Should default to text for empty string without type'
  );
  
  assertEquals(
    detectMessageType(123, 'chat'),
    'chat',
    'Should preserve type for non-string body'
  );
  
  // Test 6: Mixed content
  console.log('\n--- Test Group: Mixed Content ---');
  assertEquals(
    detectMessageType('/9j/ this is not base64', 'chat'),
    'image',
    'Should detect JPEG prefix even with text after'
  );
  
  assertEquals(
    detectMessageType('Some text /9j/4AAQ...', 'chat'),
    'chat',
    'Should not detect JPEG if not at start'
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
  window.WHL_detectMessageType_TestResults = tests;
  
})();
