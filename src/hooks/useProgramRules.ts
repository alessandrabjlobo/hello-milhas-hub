import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getSupplierId } from "@/lib/getSupplierId";

type Rule = {
  airline_id: string;
  cpf_limit: number;
  renewal_type: "annual" | "rolling";
};

export function useProgramRules(selectedAirlineId?: string) {
  const [rules, setRules] = useState<Rule | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    // se não tiver programa selecionado, limpa o estado e sai
    if (!selectedAirlineId) {
      setRules(null);
      return;
    }

    setLoading(true);
    try {
      const { supplierId } = await getSupplierId();
      if (!supplierId) {
        console.warn("[useProgramRules] supplierId não encontrado");
        setRules(null);
        return;
      }

      // tenta buscar regra existente
      const { data, error } = await supabase
        .from("program_rules")
        .select("airline_id, cpf_limit, renewal_type")
        .eq("supplier_id", supplierId)
        .eq("airline_id", selectedAirlineId)
        .maybeSingle();

      if (error && (error as any).code !== "PGRST116") {
        // qualquer erro diferente de "not found" deve ser exibido
        throw error;
      }

      if (data) {
        // já existe regra cadastrada
        setRules({
          airline_id: data.airline_id,
          cpf_limit: data.cpf_limit,
          renewal_type: data.renewal_type as "annual" | "rolling",
        });
      } else {
        // não existe regra -> cria (ou garante) uma regra padrão no banco
        const defaultRule = {
          supplier_id: supplierId,
          airline_id: selectedAirlineId,
          cpf_limit: 25,
          renewal_type: "annual" as const,
        };

        const { data: upserted, error: upsertError } = await supabase
          .from("program_rules")
          .upsert(defaultRule, {
            // garante unicidade por fornecedor+programa (ajusta se o nome do índice for diferente)
            onConflict: "supplier_id,airline_id",
          })
          .select("airline_id, cpf_limit, renewal_type")
          .single();

        if (upsertError) {
          console.error(
            "[useProgramRules] Erro ao criar regra padrão:",
            upsertError
          );
          // fallback: devolve apenas em memória, para não travar a tela
          setRules({
            airline_id: selectedAirlineId,
            cpf_limit: 25,
            renewal_type: "annual",
          });
        } else if (upserted) {
          setRules({
            airline_id: upserted.airline_id,
            cpf_limit: upserted.cpf_limit,
            renewal_type: upserted.renewal_type as "annual" | "rolling",
          });
        }
      }
    } finally {
      setLoading(false);
    }
  }, [selectedAirlineId]);

  useEffect(() => {
    load();
  }, [load]);

  return { rules, setRules, load, loading };
}
