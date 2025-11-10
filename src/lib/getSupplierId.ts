import { supabase } from "@/integrations/supabase/client";

export async function getSupplierId() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("profiles")
    .select("supplier_id")
    .eq("id", user.id)
    .single();

  if (error) throw error;
  if (!data?.supplier_id) throw new Error("supplier_id missing in profile");
  return { supplierId: data.supplier_id as string, userId: user.id };
}
