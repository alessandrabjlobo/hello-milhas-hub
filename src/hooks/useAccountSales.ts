import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AccountSale {
  id: string;
  created_at: string;
  client_name: string;
  route_text: string;
  miles_used: number;
  sale_price: number;
  payment_status: string;
  status: string;
}

export const useAccountSales = (accountId?: string) => {
  const [sales, setSales] = useState<AccountSale[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAccountSales = async () => {
    if (!accountId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("sales")
        .select(`
          id,
          created_at,
          client_name,
          route_text,
          miles_used,
          sale_price,
          payment_status,
          status
        `)
        .eq("mileage_account_id", accountId)
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

  useEffect(() => {
    fetchAccountSales();
  }, [accountId]);

  return {
    sales,
    loading,
    fetchAccountSales,
  };
};
