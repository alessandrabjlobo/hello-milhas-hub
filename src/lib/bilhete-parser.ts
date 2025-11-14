// src/lib/bilhete-parser.ts
import * as pdfjsLib from "pdfjs-dist";

// Mesmo contrato usado no componente BilheteTicketExtractor
export interface ExtractedData {
  pnr?: string;
  ticketNumber?: string;
  passengerName?: string;
  cpf?: string;
  route?: string;
  departureDate?: string;
  airline?: string;
  flightNumber?: string;
}

/**
 * Lê o texto de todas as páginas do PDF.
 */
async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await (pdfjsLib as any).getDocument({ data: arrayBuffer }).promise;

  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = (textContent.items as any[])
      .map((item: any) => item.str)
      .join(" ");
    fullText += pageText + "\n";
  }

  return fullText;
}

function normalizeSpaces(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function extractWithPatterns(
  text: string,
  patterns: RegExp[]
): string | undefined {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return normalizeSpaces(match[1]);
    }
  }
  return undefined;
}

/**
 * Detecta companhia aérea por palavras-chave comuns em bilhetes.
 */
function detectAirline(text: string): string | undefined {
  const upper = text.toUpperCase();

  if (/LATAM|TAM LINHAS A[EÉ]REAS|LATAM AIRLINES/.test(upper)) return "LATAM";
  if (/GOL LINHAS A[EÉ]REAS|VOEGOL|GOL AIRLINES/.test(upper)) return "GOL";
  if (/AZUL LINHAS A[EÉ]REAS|AZUL S\.A\.|AZUL AIRLINES/.test(upper)) return "AZUL";
  if (/TAP AIR PORTUGAL|TAP PORTUGAL/.test(upper)) return "TAP";
  if (/AIR FRANCE/.test(upper)) return "Air France";
  if (/KLM ROYAL DUTCH/.test(upper)) return "KLM";

  return undefined;
}

/**
 * PNR: 5–7 caracteres alfanuméricos, perto de "Localizador", "Booking code" etc.
 */
function extractPNR(text: string): string | undefined {
  const patterns = [
    /(?:LOCALIZADOR|LOCALIZACAO|C[ÓO]DIGO DA RESERVA|CODIGO DA RESERVA|BOOKING CODE|BOOKING REF(?:ERENCE)?|RESERVATION CODE|PNR)\s*[:\-]?\s*([A-Z0-9]{5,7})/i,
    /\bPNR\s*[:\-]?\s*([A-Z0-9]{5,7})\b/i,
  ];
  const pnr = extractWithPatterns(text, patterns);
  return pnr ? pnr.toUpperCase() : undefined;
}

/**
 * Bilhete eletrônico: 13 dígitos, normalmente 999-9999999999.
 */
function extractTicketNumber(text: string): string | undefined {
  const patterns = [
    /(?:BILHETE ELETR[ÔO]NICO|BILHETE|E-?TICKET|ELECTRONIC TICKET)[^0-9]{0,20}(\d{3}-?\d{10})/i,
    /\bTICKET\s*[:\-]?\s*(\d{3}-?\d{10})\b/i,
  ];
  const ticket = extractWithPatterns(text, patterns);
  if (!ticket) return undefined;
  // Normaliza para 999-9999999999
  return ticket.replace(/(\d{3})-?(\d{10})/, "$1-$2");
}

/**
 * CPF: 000.000.000-00 ou só números.
 */
function extractCPF(text: string): string | undefined {
  const patterns = [
    /CPF[^0-9]{0,10}([\d.\-]{11,14})/i,
  ];
  const raw = extractWithPatterns(text, patterns);
  if (!raw) return undefined;

  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 11) return undefined;

  // Formato padrão XXX.XXX.XXX-XX
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

/**
 * Nome do passageiro (bem genérico, funciona pra português/espanhol/inglês).
 */
function extractPassengerName(text: string): string | undefined {
  const patterns = [
    /(?:PASSAGEIRO|PASSENGER|PASAJERO|NOME DO PASSAGEIRO)[^A-ZÁ-ÚÃÕÇ']{0,10}([A-ZÁ-ÚÃÕÇ' ./-]{5,60})/i,
  ];
  const name = extractWithPatterns(text, patterns);
  if (!name) return undefined;
  return name.replace(/[.,\/\s]+$/, "");
}

/**
 * Rota: GRU → FOR, GRU-FOR, GRU/FOR etc.
 */
function extractRoute(text: string): string | undefined {
  const upper = text.toUpperCase();
  const pattern = /\b([A-Z]{3})\s*[-–>→\/]\s*([A-Z]{3})\b/;
  const match = upper.match(pattern);
  if (!match) return undefined;
  return `${match[1]}-${match[2]}`;
}

/**
 * Data de partida: dd/mm/aaaa -> converte pra yyyy-mm-dd.
 */
function extractDepartureDate(text: string): string | undefined {
  const patterns = [
    /(?:IDA|DEPARTURE|SA[ÍI]DA|DATA DO VOO|DATA DE PARTIDA)[^0-9]{0,20}(\d{2}\/\d{2}\/\d{4})/i,
  ];

  let date = extractWithPatterns(text, patterns);
  if (!date) {
    const generic = text.match(/(\d{2}\/\d{2}\/\d{4})/);
    if (generic && generic[1]) date = generic[1];
  }
  if (!date) return undefined;

  const [dd, mm, yyyy] = date.split("/");
  if (!dd || !mm || !yyyy) return undefined;

  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Número do voo: LA1234, G3 1234, AD4567 etc.
 */
function extractFlightNumber(text: string): string | undefined {
  const patterns = [
    /(?:VOO|FLIGHT)[^A-Z0-9]{0,15}([A-Z0-9]{2}\s?\d{3,4})/i,
    /\b(LA|JJ|G3|AD|TP|AF|KL|IB|UX|LH|BA|UA|AA|DL)\s?\d{3,4}\b/i,
  ];
  const flight = extractWithPatterns(text, patterns);
  return flight ? flight.replace(/\s+/, "").toUpperCase() : undefined;
}

/**
 * Transforma o texto cru em dados estruturados.
 */
function extractDataFromText(rawText: string): ExtractedData {
  const text = normalizeSpaces(rawText);

  const airline = detectAirline(text);
  const pnr = extractPNR(text);
  const ticketNumber = extractTicketNumber(text);
  const passengerName = extractPassengerName(text);
  const cpf = extractCPF(text);
  const route = extractRoute(text);
  const departureDate = extractDepartureDate(text);
  const flightNumber = extractFlightNumber(text);

  return {
    airline,
    pnr,
    ticketNumber,
    passengerName,
    cpf,
    route,
    departureDate,
    flightNumber,
  };
}

/**
 * Função usada pelo componente BilheteTicketExtractor.
 */
export async function parseDocument(file: File): Promise<ExtractedData> {
  try {
    if (file.type === "application/pdf") {
      const text = await extractTextFromPDF(file);
      return extractDataFromText(text);
    } else {
      // fallback pra .txt, .html etc. se algum dia você quiser aceitar
      const text = await file.text();
      return extractDataFromText(text);
    }
  } catch (error) {
    console.error("Error parsing document:", error);
    throw new Error("Não foi possível extrair dados do documento");
  }
}
