import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getSupplierId } from "@/lib/getSupplierId";

type ProgramRule = {
  airline_id: string;
  cpf_limit: number;
  renewal_type: "annual" | "rolling";
  airline_companies: {
    id: string;
    name: string;
    code: string;
  } | null;
};

export function useSupplierProgramRules(initialSupplierId?: string) {
  const [programs, setPrograms] = useState<ProgramRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [supplierId, setSupplierId] = useState(initialSupplierId);

  useEffect(() => {
    async function loadPrograms() {
      setLoading(true);
      try {
        let currentSupplierId = supplierId;
        
        if (!currentSupplierId) {
          const { supplierId: provisionedId } = await getSupplierId();
          currentSupplierId = provisionedId;
          setSupplierId(currentSupplierId);
        }

        // First get the program rules
        const { data: rulesData, error: rulesError } = await supabase
          .from("program_rules")
          .select("airline_id, cpf_limit, renewal_type")
          .eq("supplier_id", currentSupplierId);

        if (rulesError) throw rulesError;

        if (!rulesData || rulesData.length === 0) {
          setPrograms([]);
          return;
        }

        // Then get the airline companies for those rules
        const airlineIds = rulesData.map(r => r.airline_id);
        const { data: airlinesData, error: airlinesError } = await supabase
          .from("airline_companies")
          .select("id, name, code")
          .in("id", airlineIds);

        if (airlinesError) throw airlinesError;

        // Combine the data
        const combined = rulesData.map(rule => ({
          ...rule,
          airline_companies: airlinesData?.find(a => a.id === rule.airline_id) || null
        }));
        
        setPrograms(combined as ProgramRule[]);
      } catch (error) {
        console.error("Error loading program rules:", error);
        setPrograms([]);
      } finally {
        setLoading(false);
      }
    }

    loadPrograms();
  }, [supplierId]);

  return { programs, loading, supplierId };
}
