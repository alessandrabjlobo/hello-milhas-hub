import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type SaleRow = Database["public"]["Tables"]["sales"]["Row"];
type SaleInsert = Database["public"]["Tables"]["sales"]["Insert"];
type SaleUpdate = Database["public"]["Tables"]["sales"]["Update"];

export interface Sale extends SaleRow {
  mileage_accounts?: {
    account_number: string;
    airline_companies: {
      name: string;
      code: string;
    } | null;
  } | null;
}

export const useSales = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSales = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("sales")
        .select(`
          *,
          mileage_accounts (
            account_number,
            airline_companies (
              name,
              code
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSales(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar vendas",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createSale = async (saleData: Partial<SaleInsert>) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Usuário não autenticado");

      const { data: profile } = await supabase
        .from("profiles")
        .select("supplier_id")
        .eq("id", userData.user.id)
        .single();

      const { error } = await supabase.from("sales").insert({
        ...saleData,
        user_id: userData.user.id,
        supplier_id: profile?.supplier_id,
        client_name: saleData.customer_name || "",
        client_cpf_encrypted: saleData.customer_cpf || "",
        miles_used: saleData.miles_needed || 0,
        cost_per_mile: 0.029,
        total_cost: 0,
        sale_price: saleData.price_total || 0,
        profit: 0,
        profit_margin: 0,
      } as SaleInsert);

      if (error) throw error;

      toast({
        title: "Venda criada!",
        description: "A venda foi registrada com sucesso.",
      });

      await fetchSales();
      return true;
    } catch (error: any) {
      toast({
        title: "Erro ao criar venda",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  };

  const updateSale = async (id: string, updates: SaleUpdate) => {
    try {
      const { error } = await supabase
        .from("sales")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Venda atualizada!",
        description: "As alterações foram salvas.",
      });

      await fetchSales();
      return true;
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar venda",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteSale = async (id: string) => {
    try {
      const { error } = await supabase.from("sales").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Venda removida",
        description: "A venda foi excluída.",
      });

      await fetchSales();
      return true;
    } catch (error: any) {
      toast({
        title: "Erro ao remover venda",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchSales();
  }, []);

  return {
    sales,
    loading,
    fetchSales,
    createSale,
    updateSale,
    deleteSale,
  };
};
