/**
 * Template Manager Tests
 * 
 * Run these tests in the browser console after loading the extension.
 * The tests validate the TemplateManager class functionality.
 */

(function() {
  'use strict';

  // Test results storage
  const results = [];

  function assert(condition, message) {
    if (condition) {
      results.push({ test: message, passed: true });
      console.log('✅ PASS:', message);
    } else {
      results.push({ test: message, passed: false });
      console.error('❌ FAIL:', message);
    }
  }

  function assertEqual(actual, expected, message) {
    if (actual === expected) {
      results.push({ test: message, passed: true });
      console.log('✅ PASS:', message);
    } else {
      results.push({ test: message, passed: false });
      console.error('❌ FAIL:', message, '- Expected:', expected, 'Got:', actual);
    }
  }

  console.log('\n=== Template Manager Tests ===\n');

  // Test 1: Template Manager exists
  console.log('--- Test Group: Initialization ---');
  assert(typeof TemplateManager === 'function', 'TemplateManager class should exist');

  // Test 2: Process variables - saudacao
  console.log('\n--- Test Group: Variable Processing - Saudacao ---');
  const tm = new TemplateManager();
  
  // Test morning greeting (5-12)
  const morningDate = new Date('2025-12-30T10:00:00');
  const originalHours = Date.prototype.getHours;
  Date.prototype.getHours = function() { return 10; };
  const morningResult = tm.processVariables('{saudacao}, como vai?', {});
  Date.prototype.getHours = originalHours;
  assert(morningResult.includes('Bom dia'), 'Should use "Bom dia" in the morning (10h)');

  // Test afternoon greeting (12-18)
  Date.prototype.getHours = function() { return 14; };
  const afternoonResult = tm.processVariables('{saudacao}, tudo bem?', {});
  Date.prototype.getHours = originalHours;
  assert(afternoonResult.includes('Boa tarde'), 'Should use "Boa tarde" in the afternoon (14h)');

  // Test evening greeting (18-5)
  Date.prototype.getHours = function() { return 20; };
  const eveningResult = tm.processVariables('{saudacao}!', {});
  Date.prototype.getHours = originalHours;
  assert(eveningResult.includes('Boa noite'), 'Should use "Boa noite" in the evening (20h)');

  // Test 3: Process variables - contact data
  console.log('\n--- Test Group: Variable Processing - Contact Data ---');
  const contact = {
    nome: 'João Silva',
    empresa: 'Tech Corp',
    numero: '5511999998888',
  };
  
  const templateText = 'Olá {nome} da {empresa}, seu número é {numero}';
  const processed = tm.processVariables(templateText, contact);
  
  assert(processed.includes('João Silva'), 'Should replace {nome} with contact name');
  assert(processed.includes('Tech Corp'), 'Should replace {empresa} with company name');
  assert(processed.includes('5511999998888'), 'Should replace {numero} with phone number');
  assert(!processed.includes('{nome}'), 'Should not have {nome} placeholder after processing');
  assert(!processed.includes('{empresa}'), 'Should not have {empresa} placeholder after processing');

  // Test 4: Process variables - date and time
  console.log('\n--- Test Group: Variable Processing - Date/Time ---');
  const dateTemplate = 'Data: {data}, Hora: {hora}';
  const dateProcessed = tm.processVariables(dateTemplate, {});
  
  assert(!dateProcessed.includes('{data}'), 'Should replace {data} with actual date');
  assert(!dateProcessed.includes('{hora}'), 'Should replace {hora} with actual time');
  assert(dateProcessed.includes('/'), 'Processed date should contain date separator /');
  assert(dateProcessed.includes(':'), 'Processed time should contain time separator :');

  // Test 5: Case insensitivity
  console.log('\n--- Test Group: Case Insensitivity ---');
  const mixedCaseTemplate = '{NOME} {Nome} {nome}';
  const mixedCaseProcessed = tm.processVariables(mixedCaseTemplate, { nome: 'Maria' });
  
  assert(!mixedCaseProcessed.includes('{'), 'Should replace all case variations of variables');
  const mariaCount = (mixedCaseProcessed.match(/Maria/g) || []).length;
  assertEqual(mariaCount, 3, 'Should replace all 3 case variations with "Maria"');

  // Test 6: Empty contact
  console.log('\n--- Test Group: Empty Contact Handling ---');
  const emptyContactTemplate = 'Olá {nome}, da empresa {empresa}';
  const emptyProcessed = tm.processVariables(emptyContactTemplate, {});
  
  assert(!emptyProcessed.includes('{nome}'), 'Should remove {nome} if contact is empty');
  assert(!emptyProcessed.includes('{empresa}'), 'Should remove {empresa} if contact is empty');

  // Test 7: Get by category
  console.log('\n--- Test Group: Category Filtering ---');
  tm.templates = [
    { id: 1, name: 'Template 1', category: 'vendas', content: 'Test 1' },
    { id: 2, name: 'Template 2', category: 'suporte', content: 'Test 2' },
    { id: 3, name: 'Template 3', category: 'vendas', content: 'Test 3' },
  ];
  
  const vendasTemplates = tm.getByCategory('vendas');
  assertEqual(vendasTemplates.length, 2, 'Should return 2 templates for "vendas" category');
  
  const suporteTemplates = tm.getByCategory('suporte');
  assertEqual(suporteTemplates.length, 1, 'Should return 1 template for "suporte" category');

  // Test 8: Get by ID
  console.log('\n--- Test Group: Get by ID ---');
  const template = tm.getById(2);
  assert(template !== null, 'Should find template with ID 2');
  assertEqual(template?.name, 'Template 2', 'Should return correct template name');
  
  const nonExistent = tm.getById(999);
  assertEqual(nonExistent, null, 'Should return null for non-existent ID');

  // Print summary
  console.log('\n=== Test Summary ===');
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;
  const successRate = ((passed / total) * 100).toFixed(1);

  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${successRate}%`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed!');
  } else {
    console.log('\n⚠️ Some tests failed. Please review the errors above.');
  }

  // Store results globally for inspection
  window.WHL_TemplateManager_TestResults = results;
})();
