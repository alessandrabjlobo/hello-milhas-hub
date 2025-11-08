import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface SalesKPIs {
  totalRevenue: number;
  totalMilesSold: number;
  averagePricePerThousand: number;
  averageMargin: number;
  salesCount: number;
  topPrograms: Array<{
    airlineId: string;
    airlineName: string;
    salesCount: number;
    totalRevenue: number;
  }>;
  lowBalanceAccounts: Array<{
    id: string;
    accountNumber: string;
    airlineName: string;
    balance: number;
  }>;
}

export const useSalesKPIs = (supplierId: string | null, periodDays: number = 30) => {
  const [kpis, setKpis] = useState<SalesKPIs>({
    totalRevenue: 0,
    totalMilesSold: 0,
    averagePricePerThousand: 0,
    averageMargin: 0,
    salesCount: 0,
    topPrograms: [],
    lowBalanceAccounts: [],
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchKPIs = async () => {
    if (!supplierId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const periodStart = new Date();
      periodStart.setDate(periodStart.getDate() - periodDays);

      // Fetch sales for the period
      const { data: salesData, error: salesError } = await supabase
        .from("sales")
        .select(`
          *,
          mileage_accounts (
            airline_company_id,
            airline_companies (
              name
            )
          )
        `)
        .eq("supplier_id", supplierId)
        .gte("created_at", periodStart.toISOString());

      if (salesError) throw salesError;

      // Fetch accounts with low balance
      const { data: accountsData, error: accountsError } = await supabase
        .from("mileage_accounts")
        .select(`
          id,
          account_number,
          balance,
          airline_companies (
            name
          )
        `)
        .eq("supplier_id", supplierId)
        .eq("status", "active")
        .lt("balance", 50000)
        .order("balance", { ascending: true })
        .limit(5);

      if (accountsError) throw accountsError;

      // Calculate KPIs
      const sales = salesData || [];
      const totalRevenue = sales.reduce((sum, sale) => sum + (Number(sale.price_total) || 0), 0);
      const totalMilesSold = sales.reduce((sum, sale) => sum + (Number(sale.miles_used) || 0), 0);
      const totalMargin = sales.reduce((sum, sale) => sum + (Number(sale.margin_value) || 0), 0);

      // Calculate average price per thousand
      const avgPricePerK = totalMilesSold > 0 ? (totalRevenue / totalMilesSold) * 1000 : 0;

      // Calculate average margin
      const avgMargin = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;

      // Top programs
      const programMap = new Map<string, { name: string; count: number; revenue: number }>();
      sales.forEach(sale => {
        const airlineId = (sale.mileage_accounts as any)?.airline_company_id;
        const airlineName = (sale.mileage_accounts as any)?.airline_companies?.name || "Desconhecida";
        if (airlineId) {
          const existing = programMap.get(airlineId) || { name: airlineName, count: 0, revenue: 0 };
          programMap.set(airlineId, {
            name: airlineName,
            count: existing.count + 1,
            revenue: existing.revenue + (Number(sale.price_total) || 0),
          });
        }
      });

      const topPrograms = Array.from(programMap.entries())
        .map(([airlineId, data]) => ({
          airlineId,
          airlineName: data.name,
          salesCount: data.count,
          totalRevenue: data.revenue,
        }))
        .sort((a, b) => b.salesCount - a.salesCount)
        .slice(0, 5);

      // Low balance accounts
      const lowBalanceAccounts = (accountsData || []).map(acc => ({
        id: acc.id,
        accountNumber: acc.account_number,
        airlineName: (acc.airline_companies as any)?.name || "Desconhecida",
        balance: Number(acc.balance) || 0,
      }));

      setKpis({
        totalRevenue,
        totalMilesSold,
        averagePricePerThousand: avgPricePerK,
        averageMargin: avgMargin,
        salesCount: sales.length,
        topPrograms,
        lowBalanceAccounts,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao carregar KPIs",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKPIs();
  }, [supplierId, periodDays]);

  return { kpis, loading, refreshKPIs: fetchKPIs };
};