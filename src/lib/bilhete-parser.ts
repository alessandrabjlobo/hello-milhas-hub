// src/lib/bilhete-parser.ts
import * as pdfjsLib from "pdfjs-dist";
import { parseWithAI, type ExtractedData } from "./ai-bilhete-parser";
import { toast } from "sonner";

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
    const pageText = (textContent.items as any[]).map((item) => item.str).join(" ");
    fullText += pageText + "\n";
  }
  return fullText;
}

function extractDataFromTextRegex(text: string): ExtractedData {
  const extractedData: ExtractedData = {};
  const pnrMatch = text.match(patterns.pnr);
  if (pnrMatch) extractedData.pnr = pnrMatch[1].toUpperCase();
  const ticketMatch = text.match(patterns.ticketNumber);
  if (ticketMatch) extractedData.ticketNumber = ticketMatch[1].replace(/[-\s]/g, "");
  const cpfMatch = text.match(patterns.cpf);
  if (cpfMatch) extractedData.cpf = cpfMatch[1].replace(/[.\-]/g, "");
  const routeMatch = text.match(patterns.route);
  if (routeMatch) extractedData.route = `${routeMatch[1]}-${routeMatch[2]}`.toUpperCase();
  const flightMatch = text.match(patterns.flightNumber);
  if (flightMatch) extractedData.flightNumber = flightMatch[1].replace(/\s/g, "").toUpperCase();
  const nameMatch = text.match(patterns.passengerName);
  if (nameMatch) extractedData.passengerName = nameMatch[1].trim();
  const airlineMatch = text.match(patterns.airline);
  if (airlineMatch) extractedData.airline = airlineMatch[1].trim();
  const dateMatches = text.match(patterns.date);
  if (dateMatches && dateMatches.length > 0) extractedData.departureDate = dateMatches[0];
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
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
        reader.readAsText(file);
      });
    }

    const regexData = extractDataFromTextRegex(text);
    console.log("[parseDocument] 📋 Regex extraiu:", regexData);

    try {
      const aiData = await parseWithAI(text);
      const aiFields = Object.keys(aiData).filter(k => aiData[k as keyof ExtractedData]).length;
      console.log("[parseDocument] ✅ IA extraiu", aiFields, "campos");
      if (aiFields > 0) {
        const merged = { ...regexData, ...aiData };
        console.log(`[parseDocument] 📊 Total: Regex + IA`);
        return merged;
      }
    } catch (aiError: any) {
      console.warn("[parseDocument] ⚠️ IA falhou:", aiError.message);
      toast.info("Extração via IA não disponível", {
        description: "Usando análise local"
      });
    }

    return regexData;
  } catch (error) {
    console.error("[parseDocument] ❌ Erro:", error);
    toast.error("Erro ao processar documento");
    return {};
  }
}
