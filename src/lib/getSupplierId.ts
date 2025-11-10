import { supabase } from "@/integrations/supabase/client";

export async function getSupplierId() {
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) throw new Error("Não autenticado");

  // Call RPC to auto-provision supplier if needed
  const { data, error } = await supabase.rpc("ensure_profile_and_supplier", {
    p_user_id: user.id,
  });

  if (error) throw error;
  if (!data) throw new Error("Falha ao obter supplier_id");

  return { supplierId: data as string, userId: user.id };
}
