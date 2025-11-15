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
  console.log("[parseWithAI] 🚀 Chamando edge function backend...");
  console.log("[parseWithAI] 📝 Tamanho do texto:", text.length, "caracteres");
  
  if (!text || !text.trim()) {
    console.warn("[parseWithAI] ⚠️ Texto vazio, abortando");
    return {};
  }
  
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    
    const { data, error } = await supabase.functions.invoke('parse-ticket', {
      body: { text }
    });
    
    if (error) {
      console.error("[parseWithAI] ❌ Erro na edge function:", error);
      
      // Se o erro contém informações da OpenAI
      if (data?.openaiStatus === 401) {
        throw new Error('Chave da OpenAI inválida. Configure a chave correta.');
      }
      
      throw new Error(error.message || 'Erro ao chamar função de análise');
    }
    
    console.log("[parseWithAI] ✅ Resposta da edge function:", data);
    
    const result: ExtractedData = {
      pnr: data?.pnr ?? undefined,
      ticketNumber: data?.ticketNumber ?? undefined,
      passengerName: data?.passengerName ?? undefined,
      cpf: data?.cpf ?? undefined,
      route: data?.route ?? undefined,
      departureDate: data?.departureDate ?? undefined,
      airline: data?.airline ?? undefined,
      flightNumber: data?.flightNumber ?? undefined,
    };
    
    console.log("[parseWithAI] 🎉 Extração concluída:", result);
    
    return result;
  } catch (error: any) {
    console.error("[parseWithAI] ❌ Erro crítico:", error);
    throw error;
  }
}
