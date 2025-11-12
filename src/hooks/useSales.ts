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
  miles?: number;
  boardingFee?: number;
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
      const priceTotal = Number(saleData.price_total) || 0; // Valor base SEM juros
      
      // Calculate costs and margins (sempre usando valor base)
      let totalCost = 0;
      let marginValue = 0;
      let marginPercentage = 0;

      const passengers = Number((saleData as any).passengers) || 1;
      const boardingFee = Number((saleData as any).boarding_fee) || 0;
      const boardingFeeTotal = boardingFee * passengers;

      if (saleSource === 'internal_account') {
        const costPerThousand = costPerMileSnapshot * 1000;
        const milesCost = (milesUsed / 1000) * costPerThousand;
        totalCost = milesCost + boardingFeeTotal;
        marginValue = priceTotal - totalCost;
        marginPercentage = priceTotal > 0 ? (marginValue / priceTotal) * 100 : 0;
      } else if (saleSource === 'mileage_counter') {
        // For mileage counter, calculate cost based on supplier price
        const counterCostPerThousand = Number((saleData as any).counter_cost_per_thousand) || 0;
        const milesCost = (milesUsed / 1000) * counterCostPerThousand;
        totalCost = milesCost + boardingFeeTotal;
        marginValue = priceTotal - totalCost;
        marginPercentage = priceTotal > 0 ? (marginValue / priceTotal) * 100 : 0;
      }

      // FASE 1: Garantir route_text
      const routeText = (saleData as any).flight_segments
        ? (saleData as any).flight_segments.map((s: any) => `${s.from} → ${s.to}`).join(" / ")
        : "N/A";

      const { data: newSale, error } = await supabase.from("sales").insert({
        ...saleData,
        user_id: userData.user.id,
        supplier_id: profile?.supplier_id,
        client_name: saleData.customer_name || "",
        client_cpf_encrypted: saleData.customer_cpf || "",
        client_contact: saleData.customer_phone || "",
        route_text: routeText,
        miles_used: milesUsed,
        cost_per_mile_snapshot: saleSource === 'internal_account' ? costPerMileSnapshot : null,
        counter_cost_per_thousand: saleSource === 'mileage_counter' ? Number((saleData as any).counter_cost_per_thousand) : null,
        total_cost: totalCost,
        sale_price: priceTotal, // Valor base que o vendedor recebe
        final_price_with_interest: (saleData as any).final_price_with_interest || priceTotal,
        margin_value: marginValue,
        margin_percentage: marginPercentage,
        profit: marginValue,
        profit_margin: marginPercentage,
      } as SaleInsert)
      .select()
      .single();

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
        
        // Registrar uso de CPFs e atualizar contador
        const passengerCPFs = (saleData as any).passenger_cpfs as PassengerCPF[] || [];
        
        if (passengerCPFs.length > 0) {
          // Buscar airline_company_id da conta
          const { data: accountData } = await supabase
            .from('mileage_accounts')
            .select('airline_company_id')
            .eq('id', saleData.mileage_account_id)
            .single();
          
          if (accountData) {
            for (const passengerCPF of passengerCPFs) {
              if (!passengerCPF.cpf) continue;
              
              // Verificar se CPF já existe no registro
              const { data: existingCPF } = await supabase
                .from("cpf_registry")
                .select("*")
                .eq("cpf_encrypted", passengerCPF.cpf)
                .eq("airline_company_id", accountData.airline_company_id)
                .maybeSingle();
              
              if (existingCPF) {
                // Incrementar contador de uso
                await supabase
                  .from("cpf_registry")
                  .update({
                    usage_count: (existingCPF.usage_count || 0) + 1,
                    last_used_at: new Date().toISOString(),
                    first_use_date: existingCPF.first_use_date || new Date().toISOString(),
                  })
                  .eq("id", existingCPF.id);
              } else {
                // Criar novo registro de CPF
                await supabase
                  .from("cpf_registry")
                  .insert({
                    user_id: userData.user.id,
                    airline_company_id: accountData.airline_company_id,
                    full_name: passengerCPF.name,
                    cpf_encrypted: passengerCPF.cpf,
                    usage_count: 1,
                    first_use_date: new Date().toISOString(),
                    last_used_at: new Date().toISOString(),
                    status: 'available',
                  });
              }
            }
            
            // Atualizar contador de CPFs na conta usando função RPC
            await supabase.rpc("update_account_cpf_count", {
              p_account_id: saleData.mileage_account_id,
            });
          }
        }
      }

      toast({
        title: "Venda criada!",
        description: "A venda foi registrada com sucesso.",
      });

      await fetchSales();
      return newSale?.id || true;
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
