/**
 * Tests for extractPhoneNumber function in wpp-hooks.js
 * 
 * HOW TO RUN:
 * 1. Load the extension in Chrome/Edge
 * 2. Open WhatsApp Web (https://web.whatsapp.com)
 * 3. Open browser Developer Console (F12)
 * 4. Copy and paste the entire contents of this file into the console
 * 5. Press Enter to run the tests
 * 
 * NOTE: This file contains a copy of the extractPhoneNumber function for testing purposes.
 * The actual implementation is in content/wpp-hooks.js. When making changes to the actual
 * function, remember to update this test file as well.
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
  
  // Mock constants and functions from wpp-hooks.js
  // NOTE: This is a copy of the actual implementation for testing.
  // Keep this in sync with content/wpp-hooks.js when making changes.
  
  // WhatsApp ID suffixes pattern (same as in wpp-hooks.js)
  const WHATSAPP_SUFFIXES_REGEX = /@c\.us|@s\.whatsapp\.net|@g\.us|@broadcast|@lid/g;
  
  // Valid ITU-T E.164 country codes for phone number validation
  const VALID_COUNTRY_CODES = [
    '1',    // USA, Canada
    '7',    // Russia
    '20',   // Egypt
    '27',   // South Africa
    '30',   // Greece
    '31',   // Netherlands
    '32',   // Belgium
    '33',   // France
    '34',   // Spain
    '36',   // Hungary
    '39',   // Italy
    '40',   // Romania
    '41',   // Switzerland
    '43',   // Austria
    '44',   // UK
    '45',   // Denmark
    '46',   // Sweden
    '47',   // Norway
    '48',   // Poland
    '49',   // Germany
    '51',   // Peru
    '52',   // Mexico
    '53',   // Cuba
    '54',   // Argentina
    '55',   // Brazil
    '56',   // Chile
    '57',   // Colombia
    '58',   // Venezuela
    '60',   // Malaysia
    '61',   // Australia
    '62',   // Indonesia
    '63',   // Philippines
    '64',   // New Zealand
    '65',   // Singapore
    '66',   // Thailand
    '81',   // Japan
    '82',   // South Korea
    '84',   // Vietnam
    '86',   // China
    '90',   // Turkey
    '91',   // India
    '92',   // Pakistan
    '93',   // Afghanistan
    '94',   // Sri Lanka
    '95',   // Myanmar
    '98',   // Iran
    '212',  // Morocco
    '213',  // Algeria
    '216',  // Tunisia
    '218',  // Libya
    '220',  // Gambia
    '221',  // Senegal
    '222',  // Mauritania
    '223',  // Mali
    '224',  // Guinea
    '225',  // Ivory Coast
    '226',  // Burkina Faso
    '227',  // Niger
    '228',  // Togo
    '229',  // Benin
    '230',  // Mauritius
    '231',  // Liberia
    '232',  // Sierra Leone
    '233',  // Ghana
    '234',  // Nigeria
    '235',  // Chad
    '236',  // Central African Republic
    '237',  // Cameroon
    '238',  // Cape Verde
    '239',  // São Tomé and Príncipe
    '240',  // Equatorial Guinea
    '241',  // Gabon
    '242',  // Republic of the Congo
    '243',  // Democratic Republic of the Congo
    '244',  // Angola
    '245',  // Guinea-Bissau
    '246',  // British Indian Ocean Territory
    '247',  // Ascension Island
    '248',  // Seychelles
    '249',  // Sudan
    '250',  // Rwanda
    '251',  // Ethiopia
    '252',  // Somalia
    '253',  // Djibouti
    '254',  // Kenya
    '255',  // Tanzania
    '256',  // Uganda
    '257',  // Burundi
    '258',  // Mozambique
    '260',  // Zambia
    '261',  // Madagascar
    '262',  // Réunion
    '263',  // Zimbabwe
    '264',  // Namibia
    '265',  // Malawi
    '266',  // Lesotho
    '267',  // Botswana
    '268',  // Eswatini
    '269',  // Comoros
    '290',  // Saint Helena
    '291',  // Eritrea
    '297',  // Aruba
    '298',  // Faroe Islands
    '299',  // Greenland
    '350',  // Gibraltar
    '351',  // Portugal
    '352',  // Luxembourg
    '353',  // Ireland
    '354',  // Iceland
    '355',  // Albania
    '356',  // Malta
    '357',  // Cyprus
    '358',  // Finland
    '359',  // Bulgaria
    '370',  // Lithuania
    '371',  // Latvia
    '372',  // Estonia
    '373',  // Moldova
    '374',  // Armenia
    '375',  // Belarus
    '376',  // Andorra
    '377',  // Monaco
    '378',  // San Marino
    '380',  // Ukraine
    '381',  // Serbia
    '382',  // Montenegro
    '385',  // Croatia
    '386',  // Slovenia
    '387',  // Bosnia and Herzegovina
    '389',  // North Macedonia
    '420',  // Czech Republic
    '421',  // Slovakia
    '423',  // Liechtenstein
    '500',  // Falkland Islands
    '501',  // Belize
    '502',  // Guatemala
    '503',  // El Salvador
    '504',  // Honduras
    '505',  // Nicaragua
    '506',  // Costa Rica
    '507',  // Panama
    '508',  // Saint Pierre and Miquelon
    '509',  // Haiti
    '590',  // Guadeloupe
    '591',  // Bolivia
    '592',  // Guyana
    '593',  // Ecuador
    '594',  // French Guiana
    '595',  // Paraguay
    '596',  // Martinique
    '597',  // Suriname
    '598',  // Uruguay
    '599',  // Curaçao
    '670',  // East Timor
    '672',  // Norfolk Island
    '673',  // Brunei
    '674',  // Nauru
    '675',  // Papua New Guinea
    '676',  // Tonga
    '677',  // Solomon Islands
    '678',  // Vanuatu
    '679',  // Fiji
    '680',  // Palau
    '681',  // Wallis and Futuna
    '682',  // Cook Islands
    '683',  // Niue
    '685',  // Samoa
    '686',  // Kiribati
    '687',  // New Caledonia
    '688',  // Tuvalu
    '689',  // French Polynesia
    '690',  // Tokelau
    '691',  // Micronesia
    '692',  // Marshall Islands
    '850',  // North Korea
    '852',  // Hong Kong
    '853',  // Macau
    '855',  // Cambodia
    '856',  // Laos
    '880',  // Bangladesh
    '886',  // Taiwan
    '960',  // Maldives
    '961',  // Lebanon
    '962',  // Jordan
    '963',  // Syria
    '964',  // Iraq
    '965',  // Kuwait
    '966',  // Saudi Arabia
    '967',  // Yemen
    '968',  // Oman
    '970',  // Palestine
    '971',  // United Arab Emirates
    '972',  // Israel
    '973',  // Bahrain
    '974',  // Qatar
    '975',  // Bhutan
    '976',  // Mongolia
    '977',  // Nepal
    '992',  // Tajikistan
    '993',  // Turkmenistan
    '994',  // Azerbaijan
    '995',  // Georgia
    '996',  // Kyrgyzstan
    '998'   // Uzbekistan
  ];
  
  // Sorted country codes (longest first) for efficient prefix matching
  const SORTED_COUNTRY_CODES = VALID_COUNTRY_CODES.slice().sort((a, b) => b.length - a.length);
  
  /**
   * Valida se um número de telefone começa com um código de país válido
   * @param {string} digits - String contendo apenas dígitos
   * @returns {boolean} - true se o número é válido, false caso contrário
   */
  function isValidPhoneNumber(digits) {
    if (!digits || digits.length < 10 || digits.length > 15) return false;
    
    // Verificar se começa com código de país válido
    // Usa códigos pré-ordenados (longest first) para evitar falsos positivos
    // Ex: '212' deve ser testado antes de '1' para números do Marrocos
    for (const code of SORTED_COUNTRY_CODES) {
      if (digits.startsWith(code)) {
        return true;
      }
    }
    return false;
  }
  
  /**
   * Resolve um LID (Local ID) para o número de telefone real
   * Busca no ContactCollection do WhatsApp
   * @param {string} lid - O LID a ser resolvido (ex: '143379161678071')
   * @returns {string|null} - O número de telefone ou null se não encontrado
   */
  function resolveLidToPhone(lid) {
    if (!lid) return null;
    
    // Limpar o LID usando o regex padrão
    const cleanLid = String(lid).replace(WHATSAPP_SUFFIXES_REGEX, '');
    
    try {
      // Check if require is available (when running in WhatsApp Web context)
      if (typeof require !== 'function') {
        console.warn('[WHL Test] require() not available, skipping LID resolution');
        return null;
      }
      
      const CC = require('WAWebContactCollection');
      
      // Método 1: Buscar diretamente pelo LID
      const contact = CC.ContactCollection.get(cleanLid + '@lid');
      if (contact && contact.phoneNumber) {
        const phone = contact.phoneNumber._serialized || contact.phoneNumber.user;
        if (phone) {
          const cleanPhone = String(phone).replace(WHATSAPP_SUFFIXES_REGEX, '');
          // Validar se é um número válido
          if (/^\d{10,15}$/.test(cleanPhone)) {
            console.log('[WHL Test] LID resolvido:', cleanLid, '→', cleanPhone);
            return cleanPhone;
          }
        }
      }
      
      // Método 2: Buscar na lista de contatos
      const contacts = CC.ContactCollection.getModelsArray() || [];
      const found = contacts.find(c => 
        c.id.user === cleanLid || 
        c.id._serialized === cleanLid + '@lid'
      );
      
      if (found && found.phoneNumber) {
        const phone = found.phoneNumber._serialized || found.phoneNumber.user;
        if (phone) {
          const cleanPhone = String(phone).replace(WHATSAPP_SUFFIXES_REGEX, '');
          if (/^\d{10,15}$/.test(cleanPhone)) {
            console.log('[WHL Test] LID resolvido via busca:', cleanLid, '→', cleanPhone);
            return cleanPhone;
          }
        }
      }
      
    } catch(e) {
      console.warn('[WHL Test] Erro ao resolver LID:', e.message);
    }
    
    return null;
  }
  
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
    
    // Coletar LIDs encontrados para fallback
    const foundLids = [];
    
    for (const src of sources) {
      if (!src) continue;
      let s = String(src).trim();
      
      // Se é um LID, tentar resolver para número real
      if (s.includes('@lid')) {
        const resolved = resolveLidToPhone(s);
        if (resolved) {
          return resolved;
        }
        // Coletar LID para fallback
        const lidMatch = s.match(/(\d{10,15})@lid/);
        if (lidMatch) {
          foundLids.push(lidMatch[1]);
        }
        continue; // Pular este source se não conseguir resolver
      }
      
      // Remove TODOS os sufixos do WhatsApp usando regex constante
      s = s.replace(WHATSAPP_SUFFIXES_REGEX, '');
      
      // Extrai apenas dígitos
      const digits = s.replace(/\D/g, '');
      
      // Valida se é um número de telefone válido (com código de país)
      if (isValidPhoneNumber(digits)) {
        return digits;
      }
    }
    
    // Fallback: tentar resolver LIDs coletados
    for (const lid of foundLids) {
      const resolved = resolveLidToPhone(lid);
      if (resolved) {
        return resolved;
      }
    }
    
    return 'Desconhecido';
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
  
  assertEquals(
    extractPhoneNumber({
      from: { _serialized: '919876543210@c.us' }
    }),
    '919876543210',
    'Valid India phone - 12 digits'
  );
  
  assertEquals(
    extractPhoneNumber({
      from: { _serialized: '861234567890@c.us' }
    }),
    '861234567890',
    'Valid China phone - 12 digits'
  );
  
  assertEquals(
    extractPhoneNumber({
      from: { _serialized: '81901234567@c.us' }
    }),
    '81901234567',
    'Valid Japan phone - 11 digits'
  );
  
  assertEquals(
    extractPhoneNumber({
      from: { _serialized: '491701234567@c.us' }
    }),
    '491701234567',
    'Valid Germany phone - 12 digits'
  );
  
  // Test 6: Edge cases and fallback
  console.log('\n--- Test Group: Edge Cases ---');
  assertEquals(
    extractPhoneNumber({
      from: { _serialized: 'abc123@c.us' }
    }),
    'Desconhecido',
    'Invalid format returns Desconhecido'
  );
  
  assertEquals(
    extractPhoneNumber({}),
    'Desconhecido',
    'Empty message object returns Desconhecido'
  );
  
  // Test 7: LID Resolution (Main Fix)
  console.log('\n--- Test Group: LID Resolution (Main Bug Fix) ---');
  console.log('Note: LID resolution requires WhatsApp Web ContactCollection to be loaded');
  console.log('When ContactCollection is not available, LIDs will return "Desconhecido"');
  
  assertEquals(
    extractPhoneNumber({
      from: { _serialized: '270953061822606@lid' }
    }),
    'Desconhecido',
    'LID without alternative field returns Desconhecido (when ContactCollection not available)'
  );
  
  assertEquals(
    extractPhoneNumber({
      from: { _serialized: '143379161678071@lid' }
    }),
    'Desconhecido',
    'LID from bug report (143379161678071) returns Desconhecido (when ContactCollection not available)'
  );
  
  // Test 8: Priority of fields (should check in order)
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
  
  // Test 9: Multiple suffixes and LID handling
  console.log('\n--- Test Group: Multiple Suffixes ---');
  assertEquals(
    extractPhoneNumber({
      from: { _serialized: '5511999998888@c.us@lid' }
    }),
    'Desconhecido',
    'Source with @lid attempts resolution, returns Desconhecido if resolution fails'
  );
  
  // Test 10: Real-world scenario from the bug report
  console.log('\n--- Test Group: Real Bug Scenario ---');
  assertEquals(
    extractPhoneNumber({
      id: { remote: { _serialized: '270953061822606@lid' } },
      from: { _serialized: '270953061822606@lid' },
      author: { _serialized: '270953061822606@lid' },
      sender: '5511999998888'
    }),
    '5511999998888',
    'Real bug: LID everywhere, should find sender as fallback'
  );
  
  // Test 11: LID with alternative fields (NEW)
  console.log('\n--- Test Group: LID with Alternative Fields (New Behavior) ---');
  assertEquals(
    extractPhoneNumber({
      from: { _serialized: '143379161678071@lid' },
      sender: '5521995800771'
    }),
    '5521995800771',
    'LID in from, should use sender field instead'
  );
  
  assertEquals(
    extractPhoneNumber({
      from: { _serialized: '143379161678071@lid' },
      phoneNumber: '5521995800771'
    }),
    '5521995800771',
    'LID in from, should use phoneNumber field instead'
  );
  
  assertEquals(
    extractPhoneNumber({
      author: { _serialized: '143379161678071@lid' },
      id: { remote: { user: '5521995800771' } }
    }),
    '5521995800771',
    'LID in author, should use id.remote.user instead'
  );
  
  assertEquals(
    extractPhoneNumber({
      from: { _serialized: '143379161678071@lid' },
      chat: { id: { user: '5521995800771' } }
    }),
    '5521995800771',
    'LID in from, should use chat.id.user instead'
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
  
  // Store results globally for inspection (only in browser environment)
  // This allows developers to inspect test results after execution via:
  // window.WHL_ExtractPhoneNumberTestResults
  if (typeof window !== 'undefined') {
    window.WHL_ExtractPhoneNumberTestResults = tests;
    console.log('\n💾 Test results stored in window.WHL_ExtractPhoneNumberTestResults');
  }
  
})();
