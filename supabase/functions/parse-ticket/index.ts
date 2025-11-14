// supabase/functions/parse-ticket/index.ts

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

type ExtractedData = {
  pnr?: string | null;
  ticketNumber?: string | null;
  passengerName?: string | null;
  cpf?: string | null;
  route?: string | null;
  departureDate?: string | null;
  airline?: string | null;
  flightNumber?: string | null;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  // Pré-flight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Método não permitido. Use POST." }),
        {
          status: 405,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const body = await req.json().catch(() => null) as { rawText?: string } | null;

    if (!body || !body.rawText) {
      return new Response(
        JSON.stringify({ error: "Campo rawText é obrigatório" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const rawText = body.rawText;

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      console.error("OPENAI_API_KEY não configurada");
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY não configurada" }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const systemPrompt = `
Você é um assistente especialista em extrair dados de bilhetes de passagem aérea (e-tickets).
Você SEMPRE responde APENAS com um JSON válido, sem texto extra.

Campos esperados:

{
  "pnr": string | null,
  "ticketNumber": string | null,
  "passengerName": string | null,
  "cpf": string | null,
  "route": string | null,          // Ex: "FOR-GRU"
  "departureDate": string | null,  // Formato YYYY-MM-DD
  "airline": string | null,        // Ex: "LATAM", "GOL", "AZUL"
  "flightNumber": string | null    // Ex: "LA3456"
}

Regras:
- Se não tiver certeza, use null (NÃO invente).
- Se houver mais de um trecho, use o TRECHO PRINCIPAL (primeira ida).
- Se houver mais de um passageiro, use o PRIMEIRO passageiro como principal.
- Se a data aparecer em formatos brasileiros (DD/MM/YYYY), converta para YYYY-MM-DD.
- A rota deve usar códigos IATA de 3 letras, se disponíveis (ex: FOR, GRU, GIG).
`;

    const userPrompt = `
Texto do bilhete (pode estar em português ou inglês):

"""${rawText}"""

Extraia os campos e devolva APENAS o JSON.
`;

    // Chamada à OpenAI API (chat completions)
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0,
      }),
    });

    if (!openaiRes.ok) {
      const text = await openaiRes.text();
      console.error("Erro da OpenAI:", text);
      return new Response(
        JSON.stringify({ error: "Falha ao chamar modelo de IA" }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const openaiJson = await openaiRes.json() as any;
    const content = openaiJson.choices?.[0]?.message?.content;

    let parsed: ExtractedData;
    try {
      parsed = JSON.parse(content);
    } catch {
      // fallback: se vier algo estranho, devolve objeto vazio
      parsed = {};
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    console.error("Erro parse-ticket:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno ao processar bilhete" }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
