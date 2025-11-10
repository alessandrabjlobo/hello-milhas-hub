import { supabase } from "@/integrations/supabase/client";
import { getSupplierId } from "@/lib/getSupplierId";

export async function saveProgramRule(input: {
  airline_id: string;
  cpf_limit: number;
  renewal_type: "annual" | "rolling";
}) {
  const { supplierId, userId } = await getSupplierId();

  const payload = {
    supplier_id: supplierId,
    airline_id: input.airline_id,
    cpf_limit: input.cpf_limit,
    renewal_type: input.renewal_type,
    updated_by: userId,
  };

  const { data, error } = await supabase
    .from("program_rules")
    .upsert(payload, { onConflict: "supplier_id,airline_id" })
    .select()
    .single();

  if (error) throw error;
  return data;
}
