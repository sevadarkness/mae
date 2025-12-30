/**
 * Advanced Contact Importer
 * Handles CSV and Excel imports with validation and deduplication
 */

class ContactImporter {
    constructor() {
        this.supportedFormats = ['.csv', '.xlsx', '.xls'];
    }
    
    /**
     * Validate phone number
     */
    validatePhoneNumber(number) {
        if (!number) return null;
        
        // Remove caracteres não numéricos
        const clean = String(number).replace(/\D/g, '');
        
        if (!clean) return null;
        
        // Verifica formato brasileiro
        if (clean.length === 11 && clean[2] === '9') {
            return '55' + clean; // Adiciona código do país
        }
        if (clean.length === 10 && clean[2] !== '9') {
            // Número fixo brasileiro (adicionar 9 após DDD)
            return '55' + clean.slice(0, 2) + '9' + clean.slice(2);
        }
        if (clean.length === 13 && clean.startsWith('55')) {
            return clean;
        }
        
        // Outros formatos internacionais
        if (clean.length >= 10 && clean.length <= 15) {
            return clean;
        }
        
        return null; // inválido
    }
    
    /**
     * Remove duplicates from array of numbers
     */
    removeDuplicates(numbers) {
        const validated = numbers
            .map(n => this.validatePhoneNumber(n))
            .filter(Boolean);
        
        return [...new Set(validated)];
    }
    
    /**
     * Parse CSV content
     */
    parseCSV(content) {
        const lines = content.split('\n').filter(line => line.trim());
        const numbers = [];
        
        lines.forEach(line => {
            // Try to extract numbers from each line
            const cells = line.split(/[,;\t]/);
            cells.forEach(cell => {
                const cleaned = cell.trim().replace(/["']/g, '');
                if (cleaned) {
                    numbers.push(cleaned);
                }
            });
        });
        
        return numbers;
    }
    
    /**
     * Parse Excel using SheetJS (must be loaded via CDN)
     */
    async parseExcel(file) {
        return new Promise((resolve, reject) => {
            // Check if XLSX library is available
            if (typeof XLSX === 'undefined') {
                reject(new Error('Biblioteca XLSX não carregada. Adicione SheetJS via CDN.'));
                return;
            }
            
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    // Get first sheet
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    
                    // Convert to JSON
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                    
                    // Extract all numbers from all cells
                    const numbers = [];
                    jsonData.forEach(row => {
                        row.forEach(cell => {
                            if (cell) {
                                numbers.push(String(cell));
                            }
                        });
                    });
                    
                    resolve(numbers);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
            reader.readAsArrayBuffer(file);
        });
    }
    
    /**
     * Import contacts from file
     */
    async importFromFile(file) {
        const fileName = file.name.toLowerCase();
        let numbers = [];
        
        try {
            if (fileName.endsWith('.csv')) {
                const content = await this.readFileAsText(file);
                numbers = this.parseCSV(content);
            } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
                numbers = await this.parseExcel(file);
            } else {
                throw new Error('Formato não suportado. Use CSV ou Excel (.xlsx)');
            }
            
            // Validate and deduplicate
            const validated = numbers.map(n => this.validatePhoneNumber(n));
            const validCount = validated.filter(Boolean).length;
            const invalidCount = validated.filter(n => !n).length;
            const unique = this.removeDuplicates(numbers);
            const duplicatesCount = validCount - unique.length;
            
            return {
                success: true,
                numbers: unique,
                stats: {
                    total: numbers.length,
                    valid: validCount,
                    invalid: invalidCount,
                    duplicates: duplicatesCount,
                    final: unique.length
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                numbers: []
            };
        }
    }
    
    /**
     * Read file as text
     */
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
            reader.readAsText(file);
        });
    }
    
    /**
     * Create preview data
     */
    createPreview(numbers, limit = 10) {
        return {
            preview: numbers.slice(0, limit),
            hasMore: numbers.length > limit,
            total: numbers.length
        };
    }
}

// Make it globally available
if (typeof window !== 'undefined') {
    window.ContactImporter = ContactImporter;
}
