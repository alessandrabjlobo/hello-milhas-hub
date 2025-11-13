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

export async function parseDocument(file: File): Promise<ExtractedData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        
        // Extract data using regex patterns
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

        resolve(extractedData);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
    reader.readAsText(file);
  });
}
