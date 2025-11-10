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
    if (!selectedAirlineId) return;
    setLoading(true);
    try {
      const { supplierId } = await getSupplierId();
      const { data, error } = await supabase
        .from("program_rules")
        .select("airline_id, cpf_limit, renewal_type")
        .eq("supplier_id", supplierId)
        .eq("airline_id", selectedAirlineId)
        .maybeSingle();

      if (error && (error as any).code !== "PGRST116") throw error; // not found
      setRules(
        data 
          ? {
              airline_id: data.airline_id,
              cpf_limit: data.cpf_limit,
              renewal_type: data.renewal_type as "annual" | "rolling"
            }
          : { airline_id: selectedAirlineId, cpf_limit: 25, renewal_type: "annual" }
      );
    } finally {
      setLoading(false);
    }
  }, [selectedAirlineId]);

  useEffect(() => { load(); }, [load]);

  return { rules, setRules, load, loading };
}
