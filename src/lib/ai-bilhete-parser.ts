// src/lib/ai-bilhete-parser.ts

import { supabase } from "@/integrations/supabase/client";

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
 * Agora o front NÃO fala mais com a OpenAI.
 * Ele chama a edge function `parse-ticket`,
 * que roda no backend e faz a chamada segura.
 */
export async function parseWithAI(text: string): Promise<ExtractedData> {
  if (!text || !text.trim()) {
    return {};
  }

  try {
    const { data, error } = await supabase.functions.invoke("parse-ticket", {
      body: { text },
    });

    if (error) {
      console.error("Erro ao chamar edge function parse-ticket:", error);
      return {};
    }

    // data já vem no formato { pnr, ticketNumber, ... }
    return (data || {}) as ExtractedData;
  } catch (err) {
    console.error("Erro inesperado em parseWithAI:", err);
    return {};
  }
}
