import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }

  try {
    const body = await req.json().catch(() => null) as { text?: string } | null;

    if (!body || typeof body.text !== "string" || !body.text.trim()) {
      return new Response(
        JSON.stringify({ error: "Campo 'text' é obrigatório." }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    const text = body.text;
    const apiKey = Deno.env.get("OPENAI_API_KEY");

    // 🔴 SE NÃO TIVER CHAVE, NÃO QUEBRA MAIS: SÓ DEVOLVE VAZIO
    if (!apiKey) {
      console.error("[parse-ticket] OPENAI_API_KEY não configurada");
      return new Response(
        JSON.stringify({
          error: "OPENAI_API_KEY não configurada",
          pnr: null,
          ticketNumber: null,
          passengerName: null,
          cpf: null,
          route: null,
          departureDate: null,
          airline: null,
          flightNumber: null,
        }),
        {
          status: 200, // 👈 sempre 200 pra não virar FunctionsHttpError
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    const maxChars = 8000;
    const trimmedText = text.slice(0, maxChars);

    const openaiPayload = {
      model: "gpt-4.1-mini",
      response_format: { type: "json_object" },
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

    const openaiRes = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(openaiPayload),
      },
    );

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error("[parse-ticket] Erro na chamada OpenAI:", errText);
      // 🔴 NÃO devolve mais 500, devolve 200 com erro no JSON
      return new Response(
        JSON.stringify({
          error: "Erro ao chamar OpenAI",
          rawError: errText,
          pnr: null,
          ticketNumber: null,
          passengerName: null,
          cpf: null,
          route: null,
          departureDate: null,
          airline: null,
          flightNumber: null,
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    const json = await openaiRes.json();
    const content = json?.choices?.[0]?.message?.content;

    if (!content) {
      console.error("[parse-ticket] Resposta vazia da OpenAI:", json);
      return new Response(
        JSON.stringify({
          error: "Resposta vazia da OpenAI",
          pnr: null,
          ticketNumber: null,
          passengerName: null,
          cpf: null,
          route: null,
          departureDate: null,
          airline: null,
          flightNumber: null,
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.error(
        "[parse-ticket] Falha ao fazer JSON.parse no retorno da OpenAI. Conteúdo bruto:",
        content,
      );
      return new Response(
        JSON.stringify({
          error: "OpenAI não retornou JSON válido",
          rawContent: content,
          pnr: null,
          ticketNumber: null,
          passengerName: null,
          cpf: null,
          route: null,
          departureDate: null,
          airline: null,
          flightNumber: null,
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

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
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    console.error("[parse-ticket] Erro inesperado:", err);
    // 🔴 Mesmo no catch final, não devolve 500
    return new Response(
      JSON.stringify({
        error: "Erro interno na função parse-ticket",
        pnr: null,
        ticketNumber: null,
        passengerName: null,
        cpf: null,
        route: null,
        departureDate: null,
        airline: null,
        flightNumber: null,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }
});
