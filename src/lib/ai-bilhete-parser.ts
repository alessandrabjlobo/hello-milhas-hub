// src/lib/ai-bilhete-parser.ts

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
 * Versão FRONT-END
 * - Usa import.meta.env.VITE_OPENAI_API_KEY
 * - Chama a OpenAI direto do navegador
 * - NÃO depende de Supabase / edge function
 */
export async function parseWithAI(text: string): Promise<ExtractedData> {
  console.log("[parseWithAI] 🚀 Iniciando extração via IA");
  console.log("[parseWithAI] 📝 Tamanho do texto:", text.length, "caracteres");
  
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

  if (!apiKey) {
    console.error("[parseWithAI] ❌ VITE_OPENAI_API_KEY não configurada");
    throw new Error("API Key da OpenAI não configurada");
  }

  console.log("[parseWithAI] ✅ API Key encontrada:", apiKey.substring(0, 10) + "...");

  if (!text || !text.trim()) {
    console.warn("[parseWithAI] ⚠️ Texto vazio, abortando");
    return {};
  }

  const maxChars = 8000;
  const trimmedText = text.slice(0, maxChars);
  console.log("[parseWithAI] ✂️ Texto trimado para:", trimmedText.length, "caracteres");

  const body = {
    model: "gpt-4o-mini",
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

  console.log("[parseWithAI] 📡 Enviando requisição para OpenAI...");

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    console.log("[parseWithAI] 📬 Resposta recebida - Status:", response.status);

    if (!response.ok) {
      const errText = await response.text();
      console.error("[parseWithAI] ❌ Erro na chamada OpenAI:", {
        status: response.status,
        statusText: response.statusText,
        body: errText
      });

      if (response.status === 401) {
        throw new Error("OpenAI API: Chave inválida ou sem créditos (401)");
      }

      throw new Error(`OpenAI API falhou: ${response.status} - ${errText}`);
    }

    const json = await response.json();
    console.log("[parseWithAI] 📦 JSON recebido:", json);

    const content = json?.choices?.[0]?.message?.content;

    if (!content) {
      console.error("[parseWithAI] ❌ Resposta vazia da OpenAI:", json);
      throw new Error("Resposta vazia da OpenAI");
    }

    console.log("[parseWithAI] 🔍 Conteúdo bruto da IA:", content);

    let parsed: any;
    try {
      parsed = JSON.parse(content);
      console.log("[parseWithAI] ✅ JSON parseado com sucesso:", parsed);
    } catch (e) {
      console.error("[parseWithAI] ❌ Falha ao parsear JSON:", content);
      throw new Error(`JSON inválido da OpenAI: ${content}`);
    }

    const result: ExtractedData = {
      pnr: parsed.pnr ?? undefined,
      ticketNumber: parsed.ticketNumber ?? undefined,
      passengerName: parsed.passengerName ?? undefined,
      cpf: parsed.cpf ?? undefined,
      route: parsed.route ?? undefined,
      departureDate: parsed.departureDate ?? undefined,
      airline: parsed.airline ?? undefined,
      flightNumber: parsed.flightNumber ?? undefined,
    };

    console.log("[parseWithAI] 🎉 Extração concluída:", result);

    return result;
  } catch (error) {
    console.error("[parseWithAI] ❌ Erro crítico:", error);
    throw error; // Propagar erro ao invés de engolir
  }
}
