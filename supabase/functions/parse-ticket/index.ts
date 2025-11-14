// supabase/functions/parse-bilhete/index.ts

// @ts-nocheck
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Função edge que recebe o TEXTO do bilhete
 * e usa a OpenAI para extrair os campos estruturados.
 */
serve(async (req) => {
  // Pré-voo do CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();

    if (!text || typeof text !== "string") {
      return new Response(
        JSON.stringify({ error: "Campo 'text' é obrigatório." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ⚠️ COLE SUA CHAVE AQUI PARA TESTE
    // Ideal: usar Deno.env.get("OPENAI_API_KEY") com secret configurado
    const apiKey = "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"; // ex: "sk-proj-..."

    if (!apiKey || !apiKey.startsWith("sk-")) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY não configurada." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const maxChars = 8000;
    const trimmedText = text.slice(0, maxChars);

    const body = {
      model: "gpt-4.1-mini",
      response_format: { type: "json_object" as const },
      messages: [
        {
          role: "system",
          content:
            "Você é um assistente especializado em ler bilhetes de passagem aérea (e-tickets) em português ou inglês e extrair campos estruturados. Sempre responda APENAS com um JSON válido, sem texto extra.",
        },
        {
          role: "user",
          content: `
Extraia os seguintes campos, se existirem, do texto abaixo do bilhete de passagem:

- pnr: código localizador (6 caracteres, letras e números)
- ticketNumber: número do bilhete, geralmente no formato 0000000000000 ou 000-0000000000
- passengerName: nome completo do passageiro, formato "SOBRENOME/NOME" ou similar
- cpf: CPF do passageiro (apenas números, 11 dígitos)
- route: rota principal no formato ORIGEM-DESTINO, ex: FOR-GRU ou GRU-MCO
- departureDate: data da partida no formato YYYY-MM-DD
- airline: nome da companhia aérea (ex: LATAM, GOL, AZUL, TAP)
- flightNumber: número do voo (ex: LA1234, G31234)

Regras importantes:
- Se algum campo não existir com clareza, devolva null para ele.
- Não invente dados. Só preencha se estiver claro no texto.
- A data pode aparecer em formatos diferentes (DD/MM/YYYY, DD-MM-YYYY, etc.). Converta sempre para YYYY-MM-DD.
- Se houver mais de um voo, considere o primeiro voo da viagem como referência.

Responda APENAS com um JSON com esta estrutura:
{
  "pnr": string | null,
  "ticketNumber": string | null,
  "passengerName": string | null,
  "cpf": string | null,
  "route": string | null,
  "departureDate": string | null,
  "airline": string | null,
  "flightNumber": string | null
}

Texto do bilhete:
"""${trimmedText}"""
          `.trim(),
        },
      ],
    };

    const openaiResp = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    if (!openaiResp.ok) {
      const errText = await openaiResp.text();
      console.error("Erro da OpenAI:", errText);
      return new Response(
        JSON.stringify({ error: "Erro ao chamar OpenAI", details: errText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const json = await openaiResp.json();
    const content = json?.choices?.[0]?.message?.content ?? "{}";

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch (_e) {
      console.error("JSON inválido da OpenAI, conteúdo:", content);
      return new Response(
        JSON.stringify({ error: "OpenAI não retornou JSON válido", raw: content }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Normaliza o formato esperado pelo front
    const result = {
      pnr: parsed.pnr ?? null,
      ticketNumber: parsed.ticketNumber ?? null,
      passengerName: parsed.passengerName ?? null,
      cpf: parsed.cpf ?? null,
      route: parsed.route ?? null,
      departureDate: parsed.departureDate ?? null,
      airline: parsed.airline ?? null,
      flightNumber: parsed.flightNumber ?? null,
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Erro inesperado em parse-bilhete:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno na função parse-bilhete" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
