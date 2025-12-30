/**
 * contact-importer.js - Importador Avançado de Contatos (Excel)
 * 
 * Suporta importação de arquivos .xlsx com validação automática,
 * remoção de duplicados e preview antes de importar
 */

class ContactImporter {
  constructor() {
    this.validatedContacts = [];
    this.duplicates = [];
    this.invalid = [];
  }

  /**
   * Valida número de telefone brasileiro
   * @param {string} phone - Número de telefone
   * @returns {Object} Resultado da validação
   */
  validateBrazilianPhone(phone) {
    // Remove caracteres não numéricos
    const clean = phone.replace(/\D/g, '');
    
    // Padrões brasileiros:
    // Celular: 55 + DDD (2 dígitos) + 9 + 8 dígitos = 13 dígitos
    // Fixo: 55 + DDD (2 dígitos) + 8 dígitos = 12 dígitos
    // Sem código do país: DDD + 9/8 dígitos = 10 ou 11 dígitos
    
    // Com código do país (55)
    if (clean.startsWith('55')) {
      if (clean.length === 13) {
        // Celular com 55
        const ddd = clean.substring(2, 4);
        if (this.isValidDDD(ddd)) {
          return {
            valid: true,
            formatted: `+${clean}`,
            type: 'brazilian_mobile'
          };
        }
      } else if (clean.length === 12) {
        // Fixo com 55
        const ddd = clean.substring(2, 4);
        if (this.isValidDDD(ddd)) {
          return {
            valid: true,
            formatted: `+${clean}`,
            type: 'brazilian_landline'
          };
        }
      }
    }
    
    // Sem código do país
    if (clean.length === 11) {
      // Celular sem 55
      const ddd = clean.substring(0, 2);
      if (this.isValidDDD(ddd)) {
        return {
          valid: true,
          formatted: `+55${clean}`,
          type: 'brazilian_mobile'
        };
      }
    } else if (clean.length === 10) {
      // Fixo sem 55
      const ddd = clean.substring(0, 2);
      if (this.isValidDDD(ddd)) {
        return {
          valid: true,
          formatted: `+55${clean}`,
          type: 'brazilian_landline'
        };
      }
    }
    
    return { valid: false, reason: 'Formato brasileiro inválido' };
  }

  /**
   * Valida número internacional
   * @param {string} phone - Número de telefone
   * @returns {Object} Resultado da validação
   */
  validateInternationalPhone(phone) {
    const clean = phone.replace(/\D/g, '');
    
    // Números internacionais geralmente têm 10-15 dígitos
    if (clean.length >= 10 && clean.length <= 15) {
      // Se não começa com +, adiciona
      const formatted = clean.startsWith('+') ? clean : `+${clean}`;
      return {
        valid: true,
        formatted: formatted,
        type: 'international'
      };
    }
    
    return { valid: false, reason: 'Formato internacional inválido (10-15 dígitos)' };
  }

  /**
   * Valida se DDD é válido
   * @param {string} ddd - DDD com 2 dígitos
   * @returns {boolean}
   */
  isValidDDD(ddd) {
    const validDDDs = [
      '11', '12', '13', '14', '15', '16', '17', '18', '19', // SP
      '21', '22', '24', // RJ
      '27', '28', // ES
      '31', '32', '33', '34', '35', '37', '38', // MG
      '41', '42', '43', '44', '45', '46', // PR
      '47', '48', '49', // SC
      '51', '53', '54', '55', // RS
      '61', // DF
      '62', '64', // GO
      '63', // TO
      '65', '66', // MT
      '67', // MS
      '68', // AC
      '69', // RO
      '71', '73', '74', '75', '77', // BA
      '79', // SE
      '81', '87', // PE
      '82', // AL
      '83', // PB
      '84', // RN
      '85', '88', // CE
      '86', '89', // PI
      '91', '93', '94', // PA
      '92', '97', // AM
      '95', // RR
      '96', // AP
      '98', '99' // MA
    ];
    return validDDDs.includes(ddd);
  }

  /**
   * Valida um número de telefone (tenta brasileiro primeiro, depois internacional)
   * @param {string} phone - Número de telefone
   * @returns {Object} Resultado da validação
   */
  validatePhone(phone) {
    if (!phone || typeof phone !== 'string') {
      return { valid: false, reason: 'Número vazio ou inválido' };
    }

    // Tentar validação brasileira primeiro
    const brResult = this.validateBrazilianPhone(phone);
    if (brResult.valid) return brResult;

    // Tentar validação internacional
    const intResult = this.validateInternationalPhone(phone);
    if (intResult.valid) return intResult;

    return { valid: false, reason: 'Formato não reconhecido' };
  }

  /**
   * Processa arquivo Excel
   * @param {File} file - Arquivo .xlsx
   * @returns {Promise<Object>} Resultado do processamento
   */
  async processExcelFile(file) {
    try {
      // Verificar se SheetJS está disponível
      if (typeof XLSX === 'undefined') {
        throw new Error('Biblioteca SheetJS não carregada. Recarregue a página.');
      }

      // Ler arquivo
      const data = await this.readFileAsArrayBuffer(file);
      const workbook = XLSX.read(data, { type: 'array' });

      // Pegar primeira planilha
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      // Converter para JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Processar dados
      return this.processData(jsonData);
    } catch (error) {
      console.error('[ContactImporter] Erro ao processar Excel:', error);
      throw error;
    }
  }

  /**
   * Lê arquivo como ArrayBuffer
   * @param {File} file
   * @returns {Promise<ArrayBuffer>}
   */
  readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(new Error('Erro ao ler arquivo'));
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Processa dados extraídos do Excel
   * @param {Array} jsonData - Dados do Excel
   * @returns {Object} Resultado do processamento
   */
  processData(jsonData) {
    this.validatedContacts = [];
    this.duplicates = [];
    this.invalid = [];
    
    const seen = new Set();
    const phoneRegex = /\d{10,15}/;

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row || row.length === 0) continue;

      // Tentar encontrar coluna com números de telefone
      let phone = null;
      for (const cell of row) {
        const cellStr = String(cell).trim();
        if (phoneRegex.test(cellStr)) {
          phone = cellStr;
          break;
        }
      }

      if (!phone) continue;

      // Validar
      const validation = this.validatePhone(phone);
      
      if (validation.valid) {
        const formatted = validation.formatted;
        
        // Verificar duplicado
        if (seen.has(formatted)) {
          this.duplicates.push({
            original: phone,
            formatted: formatted,
            row: i + 1
          });
        } else {
          seen.add(formatted);
          this.validatedContacts.push({
            phone: formatted,
            original: phone,
            type: validation.type,
            row: i + 1
          });
        }
      } else {
        this.invalid.push({
          phone: phone,
          reason: validation.reason,
          row: i + 1
        });
      }
    }

    return {
      success: true,
      valid: this.validatedContacts,
      duplicates: this.duplicates,
      invalid: this.invalid,
      stats: {
        total: jsonData.length,
        valid: this.validatedContacts.length,
        duplicates: this.duplicates.length,
        invalid: this.invalid.length
      }
    };
  }

  /**
   * Processa CSV (como fallback)
   * @param {string} csvText - Texto CSV
   * @returns {Object} Resultado do processamento
   */
  processCSV(csvText) {
    const lines = csvText.split(/\r?\n/);
    const jsonData = lines.map(line => line.split(/[,;\t]/));
    return this.processData(jsonData);
  }

  /**
   * Obtém contatos validados
   * @returns {Array}
   */
  getValidatedContacts() {
    return this.validatedContacts;
  }

  /**
   * Obtém estatísticas
   * @returns {Object}
   */
  getStats() {
    return {
      valid: this.validatedContacts.length,
      duplicates: this.duplicates.length,
      invalid: this.invalid.length,
      total: this.validatedContacts.length + this.duplicates.length + this.invalid.length
    };
  }
}

// Instância global
window.contactImporter = window.contactImporter || new ContactImporter();
