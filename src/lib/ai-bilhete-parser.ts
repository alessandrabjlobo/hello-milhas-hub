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
 * Usa OpenAI para interpretar o texto do bilhete e devolver um JSON estruturado.
 *
 * ⚠️ IMPORTANTE:
 * - TEMPORARIAMENTE a chave está definida direto no código.
 * - Isso é apenas para testes / ambiente controlado.
 * - Em produção, o ideal é mover essa chamada para um backend (edge function)
 *   e NUNCA deixar a chave exposta no front-end.
 */
export async function parseWithAI(text: string): Promise<ExtractedData> {
  // ❗ COLE SUA CHAVE AQUI (formato: "sk-..."):
  const apiKey = "SUA_CHAVE_DA_OPENAI_AQUI";

  if (!apiKey || apiKey === "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") {
    console.warn(
      "OpenAI API Key não configurada em ai-bilhete-parser.ts. Pulando IA."
    );
    return {};
  }

  if (!text || !text.trim()) {
    return {};
  }

  // Limitar tamanho do texto pra não explodir o token
  const maxChars = 8000;
  const trimmedText = text.slice(0, maxChars);

  const body = {
    model: "gpt-4.1-mini", // modelo mais barato
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

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Erro na chamada OpenAI:", errText);
      throw new Error("Erro ao chamar OpenAI");
    }

    const json = await response.json();
    const content = json?.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Resposta vazia da OpenAI");
    }

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.error(
        "Falha ao fazer JSON.parse no retorno da OpenAI. Conteúdo bruto:",
        content
      );
      throw new Error("OpenAI não retornou JSON válido");
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

    return result;
  } catch (error) {
    console.error("Erro em parseWithAI:", error);
    // Em caso de erro, não quebra o fluxo – só volta vazio
    return {};
  }
}
