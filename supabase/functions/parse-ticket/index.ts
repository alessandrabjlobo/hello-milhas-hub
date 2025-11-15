import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
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
    const { text } = await req.json();

    if (!text || typeof text !== "string") {
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

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      console.error("API configuration error");
      return new Response(
        JSON.stringify({ error: "Service configuration error" }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    // Limita o tamanho do texto
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

    const openaiRes = await fetch(
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

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error("Erro na chamada OpenAI:", errText);
      return new Response(
        JSON.stringify({ error: "Erro ao chamar OpenAI" }),
        {
          status: 500,
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
      return new Response(
        JSON.stringify({ error: "Resposta vazia da OpenAI" }),
        {
          status: 500,
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
        "Falha ao fazer JSON.parse no retorno da OpenAI. Conteúdo bruto:",
        content,
      );
      return new Response(
        JSON.stringify({ error: "OpenAI não retornou JSON válido" }),
        {
          status: 500,
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
    console.error("Erro inesperado em parse-ticket:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno na função parse-ticket" }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }
});
