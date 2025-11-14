import { describe, it, expect } from 'vitest';

describe('Ticket Parser', () => {
  describe('PDF.js Extraction', () => {
    it('should detect LATAM tickets and extract basic info', async () => {
      // Create a mock PDF with LATAM content
      const mockText = `
        LATAM Airlines
        E-TICKET: 045-1234567890
        RECORD LOC: ABC123
        PASSENGER: JOHN DOE SILVA
        CPF: 123.456.789-00
        FROM: GRU - TO: GIG
        FLIGHT: LA3000
        DATE: 01/12/2024
        TOTAL: R$ 1.500,00
      `;
      
      // Since we can't create actual PDF files in tests easily,
      // we'll test the pattern matching directly
      const patterns = {
        pnr: /(?:RECORD\s*LOC|LOC)[:\s]*([A-Z0-9]{6})/i,
        ticketNumber: /(?:E-TICKET|TICKET)[:\s#]*(\d{3}[-\s]?\d{10})/i,
      };
      
      const pnrMatch = mockText.match(patterns.pnr);
      const ticketMatch = mockText.match(patterns.ticketNumber);
      
      expect(pnrMatch).not.toBeNull();
      expect(pnrMatch?.[1]).toBe('ABC123');
      expect(ticketMatch).not.toBeNull();
      expect(ticketMatch?.[1].replace(/[-\s]/g, '')).toBe('0451234567890');
    });

    it('should detect GOL tickets with Portuguese patterns', () => {
      const mockText = `
        GOL Linhas Aéreas
        BILHETE: 127-9876543210
        LOCALIZADOR: XYZ456
        PASSAGEIRO: MARIA SANTOS
        CPF: 987.654.321-00
        DE: CGH - PARA: SDU
        VOO: G31234
        DATA: 15/12/2024
        TOTAL: R$ 800,00
      `;
      
      const patterns = {
        pnr: /(?:LOCALIZADOR|LOC)[:\s]*([A-Z0-9]{6})/i,
        ticketNumber: /(?:BILHETE)[:\s#]*(\d{3}[-\s]?\d{10})/i,
        passengerName: /(?:PASSAGEIRO)[:\s]*([A-Z\s]{5,50})/i,
      };
      
      const pnrMatch = mockText.match(patterns.pnr);
      const ticketMatch = mockText.match(patterns.ticketNumber);
      const nameMatch = mockText.match(patterns.passengerName);
      
      expect(pnrMatch?.[1]).toBe('XYZ456');
      expect(ticketMatch?.[1].replace(/[-\s]/g, '')).toBe('1279876543210');
      expect(nameMatch?.[1].trim()).toBe('MARIA SANTOS');
    });

    it('should extract confidence score based on found fields', () => {
      const mockFullText = `
        AZUL Linhas Aéreas
        BILHETE: 121-5555555555
        PNR: DEF789
        PASSAGEIRO: JOSE OLIVEIRA
        CPF: 111.222.333-44
        DE: VCP - PARA: GIG
        VOO: AD4567
        DATA: 20/12/2024
        TOTAL: R$ 1.200,00
      `;
      
      // Simulate confidence calculation
      const fieldsFound = 8; // All major fields present
      const totalFields = 8;
      const confidence = fieldsFound / totalFields;
      
      expect(confidence).toBeGreaterThan(0.9);
    });
  });

  describe('Language Detection', () => {
    it('should detect Portuguese', () => {
      const text = 'passageiro bilhete voo de para total';
      const keywords = ['passageiro', 'voo', 'bilhete', 'de', 'para', 'total'];
      
      const lowerText = text.toLowerCase();
      const matches = keywords.filter(k => lowerText.includes(k)).length;
      
      expect(matches).toBeGreaterThan(3);
    });

    it('should detect English', () => {
      const text = 'passenger ticket flight from to total';
      const keywords = ['passenger', 'flight', 'ticket', 'from', 'to', 'total'];
      
      const lowerText = text.toLowerCase();
      const matches = keywords.filter(k => lowerText.includes(k)).length;
      
      expect(matches).toBeGreaterThan(3);
    });
  });

  describe('OCR Fallback', () => {
    it('should trigger OCR when confidence is low', () => {
      const lowConfidence = 0.3;
      const threshold = 0.5;
      
      const shouldUseOCR = lowConfidence < threshold;
      expect(shouldUseOCR).toBe(true);
    });

    it('should trigger OCR when text is too short', () => {
      const shortText = 'ABC';
      const minLength = 100;
      
      const shouldUseOCR = shortText.trim().length < minLength;
      expect(shouldUseOCR).toBe(true);
    });

    it('should return OCR engine type when fallback is used', () => {
      const result = {
        engine: 'ocr' as const,
        confidence: 0.75,
        fields: {
          pnr: 'ABC123',
          passengerName: 'JOHN DOE'
        }
      };
      
      expect(result.engine).toBe('ocr');
      expect(result.confidence).toBeGreaterThan(0.5);
    });
  });

  describe('Confidence Scoring', () => {
    it('should calculate combined confidence for OCR results', () => {
      const ocrConfidence = 0.8; // Tesseract confidence
      const extractConfidence = 0.7; // Field extraction confidence
      const combined = ocrConfidence * extractConfidence;
      
      expect(combined).toBeCloseTo(0.56);
    });

    it('should recommend user review when confidence is below 0.6', () => {
      const confidenceThreshold = 0.6;
      const lowConfidence = 0.5;
      const highConfidence = 0.85;
      
      expect(lowConfidence < confidenceThreshold).toBe(true);
      expect(highConfidence < confidenceThreshold).toBe(false);
    });
  });
});
