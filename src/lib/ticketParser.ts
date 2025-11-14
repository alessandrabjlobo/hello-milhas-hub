import * as pdfjsLib from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';

export interface ParsedTicketData {
  engine: 'pdfjs' | 'ocr';
  confidence: number;
  fields: {
    pnr?: string;
    ticketNumber?: string;
    passengerName?: string;
    cpf?: string;
    route?: string;
    departureDate?: string;
    airline?: string;
    flightNumber?: string;
    from?: string;
    to?: string;
    total?: string;
  };
}

interface PatternSet {
  pnr: RegExp;
  ticketNumber: RegExp;
  cpf: RegExp;
  route: RegExp;
  flightNumber: RegExp;
  passengerName: RegExp;
  airline: RegExp;
  date: RegExp;
  total: RegExp;
}

// Language detection keywords
const languageKeywords = {
  en: ['passenger', 'flight', 'ticket', 'from', 'to', 'total'],
  pt: ['passageiro', 'voo', 'bilhete', 'de', 'para', 'total'],
  es: ['pasajero', 'vuelo', 'boleto', 'desde', 'hasta', 'total']
};

// Airline-specific patterns
const airlinePatterns: Record<string, Partial<PatternSet>> = {
  LATAM: {
    pnr: /(?:RECORD\s*LOC|LOC)[:\s]*([A-Z0-9]{6})/i,
    ticketNumber: /(?:E-TICKET|TICKET)[:\s#]*(\d{3}[-\s]?\d{10})/i,
  },
  GOL: {
    pnr: /(?:LOCALIZADOR|LOC)[:\s]*([A-Z0-9]{6})/i,
    ticketNumber: /(?:BILHETE)[:\s#]*(\d{3}[-\s]?\d{10})/i,
  },
  AZUL: {
    pnr: /(?:LOCALIZADOR|PNR)[:\s]*([A-Z0-9]{6})/i,
    ticketNumber: /(?:BILHETE|TICKET)[:\s#]*(\d{3}[-\s]?\d{10})/i,
  }
};

// Generic patterns (fallback)
const genericPatterns: PatternSet = {
  pnr: /(?:LOC(?:ALIZADOR)?|PNR|RECORD\s*LOC(?:ATOR)?)[:\s]*([A-Z0-9]{6})/i,
  ticketNumber: /(?:TICKET|BILHETE|E-TICKET|BOLETO)[:\s#]*(\d{3}[-\s]?\d{10})/i,
  cpf: /(?:CPF|TAX)[:\s]*(\d{3}\.?\d{3}\.?\d{3}[-\s]?\d{2})/i,
  route: /(?:ROUTE|ROTA|FROM|DE|DESDE)[:\s]*([A-Z]{3})\s*[-\/]\s*([A-Z]{3})/i,
  flightNumber: /(?:FLIGHT|VOO|VÔO|VUELO)[:\s#]*([A-Z0-9]{2}\s?\d{3,4})/i,
  passengerName: /(?:PASSENGER|PASSAGEIRO|PASAJERO|NAME|NOME)[:\s]*([A-Z\s]{5,50})/i,
  airline: /(?:AIRLINE|CIA\s*AEREA|COMPANHIA|AEROLÍNEA)[:\s]*([A-Z\s]{3,30})/i,
  date: /(\d{2}[-\/]\d{2}[-\/]\d{4})/g,
  total: /(?:TOTAL|VALOR)[:\s]*(?:R\$|USD|BRL)?\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/i
};

function detectLanguage(text: string): 'en' | 'pt' | 'es' {
  const lowerText = text.toLowerCase();
  const scores = {
    en: 0,
    pt: 0,
    es: 0
  };

  for (const [lang, keywords] of Object.entries(languageKeywords)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        scores[lang as keyof typeof scores]++;
      }
    }
  }

  const maxScore = Math.max(scores.en, scores.pt, scores.es);
  if (scores.pt === maxScore) return 'pt';
  if (scores.es === maxScore) return 'es';
  return 'en';
}

function detectAirline(text: string): string | null {
  const upperText = text.toUpperCase();
  for (const airline of ['LATAM', 'GOL', 'AZUL']) {
    if (upperText.includes(airline)) {
      return airline;
    }
  }
  return null;
}

function extractDataFromText(text: string): { fields: ParsedTicketData['fields'], confidence: number } {
  const fields: ParsedTicketData['fields'] = {};
  let foundFields = 0;
  const totalFields = 8;

  const airline = detectAirline(text);
  const patterns = airline ? { ...genericPatterns, ...airlinePatterns[airline] } : genericPatterns;

  // PNR
  const pnrMatch = text.match(patterns.pnr);
  if (pnrMatch) {
    fields.pnr = pnrMatch[1].toUpperCase();
    foundFields++;
  }

  // Ticket Number
  const ticketMatch = text.match(patterns.ticketNumber);
  if (ticketMatch) {
    fields.ticketNumber = ticketMatch[1].replace(/[-\s]/g, "");
    foundFields++;
  }

  // CPF
  const cpfMatch = text.match(patterns.cpf);
  if (cpfMatch) {
    fields.cpf = cpfMatch[1].replace(/[.\-]/g, "");
    foundFields++;
  }

  // Route
  const routeMatch = text.match(patterns.route);
  if (routeMatch) {
    fields.from = routeMatch[1].toUpperCase();
    fields.to = routeMatch[2].toUpperCase();
    fields.route = `${fields.from}-${fields.to}`;
    foundFields++;
  }

  // Flight Number
  const flightMatch = text.match(patterns.flightNumber);
  if (flightMatch) {
    fields.flightNumber = flightMatch[1].replace(/\s/g, "").toUpperCase();
    foundFields++;
  }

  // Passenger Name
  const nameMatch = text.match(patterns.passengerName);
  if (nameMatch) {
    fields.passengerName = nameMatch[1].trim();
    foundFields++;
  }

  // Airline
  const airlineMatch = text.match(patterns.airline);
  if (airlineMatch) {
    fields.airline = airlineMatch[1].trim();
    foundFields++;
  } else if (airline) {
    fields.airline = airline;
    foundFields++;
  }

  // Date (first occurrence)
  const dateMatches = text.match(patterns.date);
  if (dateMatches && dateMatches.length > 0) {
    fields.departureDate = dateMatches[0];
    foundFields++;
  }

  // Total
  const totalMatch = text.match(patterns.total);
  if (totalMatch) {
    fields.total = totalMatch[1].replace(/[.,](?=\d{3})/g, '').replace(',', '.');
  }

  const confidence = foundFields / totalFields;
  return { fields, confidence };
}

async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  let fullText = '';
  
  // Extract text from all pages
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    fullText += pageText + '\n';
  }
  
  return fullText;
}

async function extractWithOCR(file: File): Promise<{ text: string, confidence: number }> {
  const worker = await createWorker('por+eng+spa');
  
  try {
    // Convert first page to image
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    await page.render({
      canvasContext: context,
      viewport: viewport
    } as any).promise;
    
    // OCR on canvas
    const { data } = await worker.recognize(canvas);
    await worker.terminate();
    
    return {
      text: data.text,
      confidence: data.confidence / 100
    };
  } catch (error) {
    await worker.terminate();
    throw error;
  }
}

export async function extractTicketData(file: File): Promise<ParsedTicketData> {
  try {
    // Try PDF.js first
    if (file.type === 'application/pdf') {
      const text = await extractTextFromPDF(file);
      const { fields, confidence } = extractDataFromText(text);
      
      // If confidence is low or no text found, try OCR
      if (confidence < 0.5 || text.trim().length < 100) {
        console.log('Low confidence or empty text, trying OCR...');
        const { text: ocrText, confidence: ocrConfidence } = await extractWithOCR(file);
        const { fields: ocrFields, confidence: extractConfidence } = extractDataFromText(ocrText);
        
        return {
          engine: 'ocr',
          confidence: ocrConfidence * extractConfidence,
          fields: ocrFields
        };
      }
      
      return {
        engine: 'pdfjs',
        confidence,
        fields
      };
    } else {
      throw new Error('Unsupported file type');
    }
  } catch (error) {
    console.error('Error extracting ticket data:', error);
    throw new Error('Não foi possível extrair dados do bilhete');
  }
}
