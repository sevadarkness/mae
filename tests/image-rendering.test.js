/**
 * Tests for image rendering in recover timeline
 * Run this in browser console on WhatsApp Web page to test
 */

(function() {
  'use strict';
  
  console.log('=== Recover Timeline Image Rendering Tests ===\n');
  
  const tests = [];
  let passed = 0;
  let failed = 0;
  
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
  
  function assertContains(str, substring, testName) {
    const success = String(str).includes(substring);
    tests.push({ testName, success, actual: `Contains: ${success}`, expected: `Contains: true` });
    if (success) {
      passed++;
      console.log(`✅ PASS: ${testName}`);
    } else {
      failed++;
      console.error(`❌ FAIL: ${testName}`);
      console.error(`  Expected string to contain: ${substring}`);
      console.error(`  Actual string: ${String(str).substring(0, 100)}...`);
    }
  }
  
  // Test helper functions
  function isBase64Image(content) {
    const str = String(content);
    return str.startsWith('/9j/') || str.startsWith('iVBOR') || str.startsWith('data:image');
  }
  
  function convertToDataUrl(base64Content) {
    if (base64Content.startsWith('data:image')) {
      return base64Content;
    } else if (base64Content.startsWith('/9j/')) {
      return `data:image/jpeg;base64,${base64Content}`;
    } else if (base64Content.startsWith('iVBOR')) {
      return `data:image/png;base64,${base64Content}`;
    }
    return null;
  }
  
  function shouldRenderAsImage(message) {
    const type = message.type;
    const body = message.body || '';
    return type === 'image' || isBase64Image(body);
  }
  
  // Test 1: Detect base64 images
  console.log('\n--- Test Group: Base64 Image Detection ---');
  
  assertTrue(
    isBase64Image('/9j/4AAQSkZJRgABAQAAAQABAAD...'),
    'Should detect JPEG base64'
  );
  
  assertTrue(
    isBase64Image('iVBORw0KGgoAAAANSUhEUgAA...'),
    'Should detect PNG base64'
  );
  
  assertTrue(
    isBase64Image('data:image/jpeg;base64,/9j/4AAQ...'),
    'Should detect image data URL'
  );
  
  assertFalse(
    isBase64Image('Regular text message'),
    'Should not detect text as image'
  );
  
  // Test 2: Convert to data URLs
  console.log('\n--- Test Group: Data URL Conversion ---');
  
  assertContains(
    convertToDataUrl('/9j/4AAQSkZJRgABAQAAAQABAAD...'),
    'data:image/jpeg;base64,',
    'Should convert JPEG base64 to data URL'
  );
  
  assertContains(
    convertToDataUrl('iVBORw0KGgoAAAANSUhEUgAA...'),
    'data:image/png;base64,',
    'Should convert PNG base64 to data URL'
  );
  
  assertContains(
    convertToDataUrl('data:image/jpeg;base64,/9j/...'),
    'data:image/jpeg;base64,',
    'Should preserve existing data URL'
  );
  
  // Test 3: Rendering decisions
  console.log('\n--- Test Group: Rendering Decisions ---');
  
  assertTrue(
    shouldRenderAsImage({ type: 'image', body: 'some content' }),
    'Should render when type is image'
  );
  
  assertTrue(
    shouldRenderAsImage({ type: 'chat', body: '/9j/4AAQSkZJRgABAQAAAQABAAD...' }),
    'Should render JPEG base64 even with chat type'
  );
  
  assertTrue(
    shouldRenderAsImage({ type: 'protocol', body: 'iVBORw0KGgoAAAANSUhEUgAA...' }),
    'Should render PNG base64 even with protocol type'
  );
  
  assertFalse(
    shouldRenderAsImage({ type: 'chat', body: 'Regular text message' }),
    'Should not render text as image'
  );
  
  assertFalse(
    shouldRenderAsImage({ type: 'text', body: 'Hello World' }),
    'Should not render text message as image'
  );
  
  // Test 4: HTML generation (mock test)
  console.log('\n--- Test Group: HTML Generation ---');
  
  const jpegMessage = {
    type: 'image',
    body: '/9j/4AAQSkZJRgABAQAAAQABAAD...',
    from: '5521999999999',
    timestamp: Date.now()
  };
  
  const dataUrl = convertToDataUrl(jpegMessage.body);
  
  assertContains(
    dataUrl,
    'data:image/',
    'Generated data URL should be valid'
  );
  
  // Simulate HTML generation
  const imgHtml = `<img src="${dataUrl}" alt="Imagem recuperada" style="max-width: 100%; border-radius: 8px; cursor: pointer;" onclick="window.open('${dataUrl}', '_blank')" />`;
  
  assertContains(
    imgHtml,
    '<img',
    'Should generate img tag'
  );
  
  assertContains(
    imgHtml,
    'data:image/',
    'Image src should contain data URL'
  );
  
  assertContains(
    imgHtml,
    'onclick',
    'Should have click handler for opening image'
  );
  
  // Test 5: Mixed content scenarios
  console.log('\n--- Test Group: Mixed Content Scenarios ---');
  
  const textMessage = {
    type: 'chat',
    body: 'This is a text message',
    from: '5521999999999',
    timestamp: Date.now()
  };
  
  assertFalse(
    shouldRenderAsImage(textMessage),
    'Text message should not be rendered as image'
  );
  
  const deletedImageMessage = {
    type: 'protocol',
    body: '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABsSFBcUERsXFhceHB...',
    from: '5521999999999',
    timestamp: Date.now()
  };
  
  assertTrue(
    shouldRenderAsImage(deletedImageMessage),
    'Deleted image (protocol type) should be detected and rendered as image'
  );
  
  const pngImageMessage = {
    type: 'protocol',
    body: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    from: '5521999999999',
    timestamp: Date.now()
  };
  
  assertTrue(
    shouldRenderAsImage(pngImageMessage),
    'PNG deleted image should be detected and rendered'
  );
  
  // Test 6: Edge cases
  console.log('\n--- Test Group: Edge Cases ---');
  
  assertFalse(
    shouldRenderAsImage({ type: 'chat', body: '' }),
    'Empty body should not be rendered as image'
  );
  
  assertFalse(
    shouldRenderAsImage({ type: 'chat' }),
    'Missing body should not be rendered as image'
  );
  
  assertFalse(
    shouldRenderAsImage({ type: null, body: 'text' }),
    'Null type with text should not be rendered as image'
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
  window.WHL_ImageRendering_TestResults = tests;
  
})();
