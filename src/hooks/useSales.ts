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

      // Get account to fetch cost_per_mile
      let costPerMileSnapshot = 0.029; // default
      if (saleData.mileage_account_id) {
        const { data: accountData } = await supabase
          .from("mileage_accounts")
          .select("cost_per_mile")
          .eq("id", saleData.mileage_account_id)
          .single();
        
        if (accountData) {
          costPerMileSnapshot = Number(accountData.cost_per_mile);
        }
      }

      const milesUsed = Number(saleData.miles_needed) || 0;
      const priceTotal = Number(saleData.price_total) || 0;
      
      // Calculate costs and margins
      const totalCost = milesUsed * costPerMileSnapshot;
      const marginValue = priceTotal - totalCost;
      const marginPercentage = priceTotal > 0 ? (marginValue / priceTotal) * 100 : 0;

      const { error } = await supabase.from("sales").insert({
        ...saleData,
        user_id: userData.user.id,
        supplier_id: profile?.supplier_id,
        client_name: saleData.customer_name || "",
        client_cpf_encrypted: saleData.customer_cpf || "",
        miles_used: milesUsed,
        cost_per_mile_snapshot: costPerMileSnapshot,
        total_cost: totalCost,
        sale_price: priceTotal,
        margin_value: marginValue,
        margin_percentage: marginPercentage,
        profit: marginValue,
        profit_margin: marginPercentage,
      } as SaleInsert);

      if (error) throw error;

      // Update account balance
      if (saleData.mileage_account_id && milesUsed > 0) {
        const { error: balanceError } = await supabase.rpc("update_account_balance", {
          account_id: saleData.mileage_account_id,
          miles_delta: -milesUsed,
        });

        if (balanceError) {
          console.error("Failed to update balance:", balanceError);
        }
      }

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
