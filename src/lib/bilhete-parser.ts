import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker - use local version from node_modules
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

interface ExtractedData {
  pnr?: string;
  ticketNumber?: string;
  passengerName?: string;
  cpf?: string;
  route?: string;
  departureDate?: string;
  airline?: string;
  flightNumber?: string;
}

const patterns = {
  pnr: /(?:LOC(?:ALIZADOR)?|PNR|RECORD\s*LOC(?:ATOR)?)[:\s]*([A-Z0-9]{6})/i,
  ticketNumber: /(?:TICKET|BILHETE|E-TICKET)[:\s#]*(\d{3}[-\s]?\d{10})/i,
  cpf: /(?:CPF|TAX)[:\s]*(\d{3}\.?\d{3}\.?\d{3}[-\s]?\d{2})/i,
  route: /(?:ROUTE|ROTA|FROM|DE)[:\s]*([A-Z]{3})\s*[-\/]\s*([A-Z]{3})/i,
  flightNumber: /(?:FLIGHT|VOO|VÔO)[:\s#]*([A-Z0-9]{2}\s?\d{3,4})/i,
  passengerName: /(?:PASSENGER|PASSAGEIRO|NAME|NOME)[:\s]*([A-Z\s]{5,50})/i,
  airline: /(?:AIRLINE|CIA\s*AEREA|COMPANHIA)[:\s]*([A-Z\s]{3,30})/i,
  date: /(\d{2}[-\/]\d{2}[-\/]\d{4})/g,
};

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

function extractDataFromText(text: string): ExtractedData {
  const extractedData: ExtractedData = {};

  // PNR
  const pnrMatch = text.match(patterns.pnr);
  if (pnrMatch) extractedData.pnr = pnrMatch[1].toUpperCase();

  // Ticket Number
  const ticketMatch = text.match(patterns.ticketNumber);
  if (ticketMatch) extractedData.ticketNumber = ticketMatch[1].replace(/[-\s]/g, "");

  // CPF
  const cpfMatch = text.match(patterns.cpf);
  if (cpfMatch) extractedData.cpf = cpfMatch[1].replace(/[.\-]/g, "");

  // Route
  const routeMatch = text.match(patterns.route);
  if (routeMatch) extractedData.route = `${routeMatch[1]}-${routeMatch[2]}`.toUpperCase();

  // Flight Number
  const flightMatch = text.match(patterns.flightNumber);
  if (flightMatch) extractedData.flightNumber = flightMatch[1].replace(/\s/g, "").toUpperCase();

  // Passenger Name
  const nameMatch = text.match(patterns.passengerName);
  if (nameMatch) extractedData.passengerName = nameMatch[1].trim();

  // Airline
  const airlineMatch = text.match(patterns.airline);
  if (airlineMatch) extractedData.airline = airlineMatch[1].trim();

  // Date (first occurrence)
  const dateMatches = text.match(patterns.date);
  if (dateMatches && dateMatches.length > 0) {
    extractedData.departureDate = dateMatches[0];
  }

  return extractedData;
}

export async function parseDocument(file: File): Promise<ExtractedData> {
  try {
    // Check if it's a PDF
    if (file.type === 'application/pdf') {
      const text = await extractTextFromPDF(file);
      return extractDataFromText(text);
    } else {
      // For text files, use FileReader
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
          try {
            const text = e.target?.result as string;
            resolve(extractDataFromText(text));
          } catch (error) {
            reject(error);
          }
        };
        
        reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
        reader.readAsText(file);
      });
    }
  } catch (error) {
    console.error('Error parsing document:', error);
    throw new Error('Não foi possível extrair dados do documento');
  }
}
