import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Função de extração por regex (sem custo)
function extractDataWithRegex(text: string) {
  const patterns = {
    pnr: /(?:LOC(?:ALIZADOR)?|PNR|RECORD\s*LOC(?:ATOR)?|Código\s*da\s*reserva)[:\s]*([A-Z0-9]{6})/i,
    ticketNumber: /(?:TICKET|BILHETE|E-TICKET|Número\s*da\s*passagem)[:\s#]*(\d{3}[-\s]?\d{10}|\d{13})/i,
    cpf: /(?:CPF|TAX|Documento\s*de\s*Identificação)[:\s]*(\d{3}\.?\d{3}\.?\d{3}[-\s]?\d{2}|\d{11})/i,
    route: /(?:ROUTE|ROTA|FROM|DE|Origem.*Destino)[:\s]*([A-Z]{3})\s*[-\/→]\s*([A-Z]{3})/i,
    flightNumber: /(?:FLIGHT|VOO|VÔO|N°\s*de\s*voo)[:\s#]*([A-Z]{2}\s?\d{3,4})/i,
    passengerName: /(?:PASSENGER|PASSAGEIRO|NAME|NOME|Nome\s*do\s*Passageiro)[:\s]*([A-ZÀ-Ú\s]{5,50})/i,
    airline: /(?:AIRLINE|CIA\s*AEREA|COMPANHIA|TAM|GOL|AZUL|LATAM)/i,
    date: /(?:Data|Saída)[:\s]*(\d{2}[-\/]\d{2}[-\/]\d{2,4})/i,
  };

  const data: any = {};

  const pnrMatch = text.match(patterns.pnr);
  if (pnrMatch) data.pnr = pnrMatch[1].toUpperCase();

  const ticketMatch = text.match(patterns.ticketNumber);
  if (ticketMatch) data.ticketNumber = ticketMatch[1].replace(/[-\s]/g, "");

  const cpfMatch = text.match(patterns.cpf);
  if (cpfMatch) data.cpf = cpfMatch[1].replace(/[.\-\s]/g, "");

  const routeMatch = text.match(patterns.route);
  if (routeMatch) data.route = `${routeMatch[1]}-${routeMatch[2]}`.toUpperCase();

  const flightMatch = text.match(patterns.flightNumber);
  if (flightMatch) data.flightNumber = flightMatch[1].replace(/\s/g, "").toUpperCase();

  const nameMatch = text.match(patterns.passengerName);
  if (nameMatch) data.passengerName = nameMatch[1].trim();

  const airlineMatch = text.match(patterns.airline);
  if (airlineMatch) {
    data.airline = airlineMatch[0].includes("TAM") || airlineMatch[0].includes("LATAM") 
      ? "LATAM" 
      : airlineMatch[0].includes("GOL") 
      ? "GOL" 
      : airlineMatch[0].includes("AZUL") 
      ? "AZUL" 
      : airlineMatch[1]?.trim();
  }

  const dateMatch = text.match(patterns.date);
  if (dateMatch) {
    const parts = dateMatch[1].split(/[-\/]/);
    if (parts.length === 3) {
      const [day, month, year] = parts;
      const fullYear = year.length === 2 ? `20${year}` : year;
      data.departureDate = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }

  return data;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  console.log("[parse-ticket] Método:", req.method);

  try {
    const rawBody = await req.text();
    
    // Validação de tamanho
    if (rawBody.length > 100000) {
      return new Response(
        JSON.stringify({ error: "Payload muito grande (máximo 100KB)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    let body: any = {};
    try {
      body = rawBody ? JSON.parse(rawBody) : {};
    } catch (err) {
      console.error("[parse-ticket] Erro ao parsear JSON:", err);
      return new Response(
        JSON.stringify({ error: "JSON inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const text = body?.text;
    if (!text || typeof text !== "string" || !text.trim()) {
      return new Response(
        JSON.stringify({ error: "Campo 'text' é obrigatório." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Validação de caracteres
    if (!/^[\x20-\x7E\s\n\r\u00C0-\u00FF]+$/.test(text)) {
      return new Response(
        JSON.stringify({ error: "Texto contém caracteres inválidos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const trimmedText = text.slice(0, 8000);
    const regexData = extractDataWithRegex(trimmedText);
    const regexFieldsCount = Object.values(regexData).filter(v => v).length;

    console.log(`[parse-ticket] 📋 Regex extraiu ${regexFieldsCount} campos:`, regexData);

    const missingFields = [];
    if (!regexData.pnr) missingFields.push('pnr');
    if (!regexData.passengerName) missingFields.push('passengerName');
    if (!regexData.cpf) missingFields.push('cpf');
    if (!regexData.airline) missingFields.push('airline');

    if (missingFields.length === 0) {
      console.log("[parse-ticket] ✅ Campos principais extraídos, pulando IA");
      return new Response(JSON.stringify(regexData), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log(`[parse-ticket] 🤖 Faltam: ${missingFields.join(', ')}`);

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      console.warn("[parse-ticket] ⚠️ OpenAI não configurada");
      return new Response(
        JSON.stringify({ ...regexData, warning: "OpenAI não configurada" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "Extraia campos de bilhetes aéreos retornando JSON."
          },
          {
            role: "user",
            content: `Extraia: pnr, ticketNumber, passengerName, cpf, route, departureDate, airline, flightNumber.\n\n${trimmedText}`
          }
        ],
      }),
    });

    if (!openaiResponse.ok) {
      const errorBody = await openaiResponse.text();
      console.error("[parse-ticket] ❌ OpenAI erro:", openaiResponse.status, errorBody);
      return new Response(
        JSON.stringify({ ...regexData, error: "Erro OpenAI", openaiStatus: openaiResponse.status }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const openaiData = await openaiResponse.json();
    let parsed: any = {};
    try {
      parsed = JSON.parse(openaiData?.choices?.[0]?.message?.content || "{}");
    } catch {
      parsed = {};
    }

    const result = {
      pnr: parsed.pnr ?? regexData.pnr ?? null,
      ticketNumber: parsed.ticketNumber ?? regexData.ticketNumber ?? null,
      passengerName: parsed.passengerName ?? regexData.passengerName ?? null,
      cpf: parsed.cpf ?? regexData.cpf ?? null,
      route: parsed.route ?? regexData.route ?? null,
      departureDate: parsed.departureDate ?? regexData.departureDate ?? null,
      airline: parsed.airline ?? regexData.airline ?? null,
      flightNumber: parsed.flightNumber ?? regexData.flightNumber ?? null,
    };

    const aiFieldsCount = Object.values(parsed).filter(v => v).length;
    console.log(`[parse-ticket] 📊 Regex: ${regexFieldsCount} | IA: ${aiFieldsCount}`);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[parse-ticket] ❌ Erro:", error);
    return new Response(
      JSON.stringify({ error: error?.message || String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
