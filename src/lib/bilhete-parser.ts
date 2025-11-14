// src/lib/bilhete-parser.ts
import * as pdfjsLib from "pdfjs-dist";
import { parseWithAI, type ExtractedData } from "./ai-bilhete-parser";
// Worker é configurado globalmente em main.tsx via pdfWorker.ts

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

  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = (textContent.items as any[])
      .map((item) => item.str)
      .join(" ");
    fullText += pageText + "\n";
  }

  return fullText;
}

function extractDataFromTextRegex(text: string): ExtractedData {
  const extractedData: ExtractedData = {};

  // PNR
  const pnrMatch = text.match(patterns.pnr);
  if (pnrMatch) extractedData.pnr = pnrMatch[1].toUpperCase();

  // Ticket Number
  const ticketMatch = text.match(patterns.ticketNumber);
  if (ticketMatch)
    extractedData.ticketNumber = ticketMatch[1].replace(/[-\s]/g, "");

  // CPF
  const cpfMatch = text.match(patterns.cpf);
  if (cpfMatch) extractedData.cpf = cpfMatch[1].replace(/[.\-]/g, "");

  // Route
  const routeMatch = text.match(patterns.route);
  if (routeMatch)
    extractedData.route = `${routeMatch[1]}-${routeMatch[2]}`.toUpperCase();

  // Flight Number
  const flightMatch = text.match(patterns.flightNumber);
  if (flightMatch)
    extractedData.flightNumber = flightMatch[1]
      .replace(/\s/g, "")
      .toUpperCase();

  // Passenger Name
  const nameMatch = text.match(patterns.passengerName);
  if (nameMatch) extractedData.passengerName = nameMatch[1].trim();

  // Airline
  const airlineMatch = text.match(patterns.airline);
  if (airlineMatch) extractedData.airline = airlineMatch[1].trim();

  // Date (primeira ocorrência) — mantém formato original, a IA pode normalizar se quiser
  const dateMatches = text.match(patterns.date);
  if (dateMatches && dateMatches.length > 0) {
    extractedData.departureDate = dateMatches[0];
  }

  return extractedData;
}

export async function parseDocument(file: File): Promise<ExtractedData> {
  try {
    let text: string;

    if (file.type === "application/pdf") {
      text = await extractTextFromPDF(file);
    } else {
      text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          resolve(content);
        };
        reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
        reader.readAsText(file);
      });
    }

    // 1) Primeiro: regex "burro", mas rápido
    const regexData = extractDataFromTextRegex(text);

    // 2) Depois: tentar IA (se chave existir). Se der erro, usamos só regex.
    try {
      const aiData = await parseWithAI(text);

      // Mesclar: IA tem prioridade; se IA não preencher, usa regex
      const merged: ExtractedData = {
        pnr: aiData.pnr || regexData.pnr,
        ticketNumber: aiData.ticketNumber || regexData.ticketNumber,
        passengerName: aiData.passengerName || regexData.passengerName,
        cpf: aiData.cpf || regexData.cpf,
        route: aiData.route || regexData.route,
        departureDate: aiData.departureDate || regexData.departureDate,
        airline: aiData.airline || regexData.airline,
        flightNumber: aiData.flightNumber || regexData.flightNumber,
      };

      return merged;
    } catch (aiError) {
      console.warn("Falha na camada de IA. Usando apenas regex.", aiError);
      return regexData;
    }
  } catch (error) {
    console.error("Error parsing document:", error);
    throw new Error("Não foi possível extrair dados do documento");
  }
}
