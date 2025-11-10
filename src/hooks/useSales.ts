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

export interface FlightSegment {
  from: string;
  to: string;
  date: string;
  time?: string;
  stops?: number;
  airline?: string;
}

export interface PassengerCPF {
  name: string;
  cpf: string;
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

      const saleSource = (saleData as any).sale_source || 'internal_account';
      
      // Get account to fetch cost_per_mile (only for internal accounts)
      let costPerMileSnapshot = 0.029; // default
      if (saleSource === 'internal_account' && saleData.mileage_account_id) {
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
      let priceTotal = Number(saleData.price_total) || 0;
      
      // Apply interest if installments are used
      const installments = (saleData as any).installments;
      const interestRate = (saleData as any).interest_rate;
      if (installments && installments > 1 && interestRate) {
        const rate = Number(interestRate) / 100;
        priceTotal = priceTotal * (1 + rate);
      }
      
      // Calculate costs and margins
      let totalCost = 0;
      let marginValue = 0;
      let marginPercentage = 0;

      if (saleSource === 'internal_account') {
        totalCost = milesUsed * costPerMileSnapshot;
        marginValue = priceTotal - totalCost;
        marginPercentage = priceTotal > 0 ? (marginValue / priceTotal) * 100 : 0;
      } else {
        // For mileage counter, no cost from internal account
        totalCost = 0;
        marginValue = priceTotal;
        marginPercentage = 100;
      }

      const { error } = await supabase.from("sales").insert({
        ...saleData,
        user_id: userData.user.id,
        supplier_id: profile?.supplier_id,
        client_name: saleData.customer_name || "",
        client_cpf_encrypted: saleData.customer_cpf || "",
        miles_used: milesUsed,
        cost_per_mile_snapshot: saleSource === 'internal_account' ? costPerMileSnapshot : null,
        total_cost: totalCost,
        sale_price: Number(saleData.price_total) || 0,
        final_price_with_interest: priceTotal,
        margin_value: marginValue,
        margin_percentage: marginPercentage,
        profit: marginValue,
        profit_margin: marginPercentage,
      } as SaleInsert);

      if (error) throw error;

      // Update account balance (only for internal accounts)
      if (saleSource === 'internal_account' && saleData.mileage_account_id && milesUsed > 0) {
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
