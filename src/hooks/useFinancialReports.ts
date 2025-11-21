import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface FinancialKPIs {
  // KPIs Gerais
  grossRevenue: number;
  revenueWithInterest: number;
  netRevenue: number;
  totalMilesCost: number;
  totalBoardingFees: number;
  totalCost: number;
  grossProfit: number;
  grossMarginPercent: number;
  averageTicket: number;
  totalMilesUsed: number;
  averageCostPerThousand: number;
  salesCount: number;
  
  // Quebras por dimensão
  byAccount: Array<{
    accountId: string;
    accountNumber: string;
    airlineName: string;
    milesUsed: number;
    totalCost: number;
    revenue: number;
    profit: number;
    marginPercent: number;
    salesCount: number;
  }>;
  
  byAirline: Array<{
    airlineId: string;
    airlineName: string;
    airlineCode: string;
    milesUsed: number;
    totalCost: number;
    revenue: number;
    profit: number;
    marginPercent: number;
    salesCount: number;
  }>;
  
  byChannel: {
    internal: {
      salesCount: number;
      revenue: number;
      cost: number;
      profit: number;
      marginPercent: number;
    };
    counter: {
      salesCount: number;
      revenue: number;
      cost: number;
      profit: number;
      marginPercent: number;
    };
  };
  
  byPaymentMethod: Array<{
    method: string;
    salesCount: number;
    revenue: number;
    averageTicket: number;
  }>;
}

export const useFinancialReports = (
  supplierId: string | null,
  dateFrom?: Date,
  dateTo?: Date
) => {
  const [kpis, setKpis] = useState<FinancialKPIs | null>(null);
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchReports = async () => {
    if (!supplierId) {
      setKpis(null);
      setSales([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      let query = supabase
        .from("sales")
        .select(`
          *,
          mileage_accounts (
            id,
            account_number,
            airline_company_id,
            airline_companies (
              id,
              name,
              code
            )
          )
        `)
        .eq("supplier_id", supplierId);

      if (dateFrom) {
        query = query.gte("created_at", dateFrom.toISOString());
      }
      if (dateTo) {
        query = query.lte("created_at", dateTo.toISOString());
      }

      // 🔹 Renomeado para não conflitar com o estado `sales`
      const { data: salesData, error } = await query;
      if (error) throw error;

      const safeSales = salesData ?? [];

      // 🔹 Agora populamos o estado usado no botão Exportar CSV
      setSales(safeSales);

      // 🔹 KPIs calculados em cima das MESMAS vendas
      const kpisData = calculateKPIs(safeSales);
      setKpis(kpisData);

    } catch (error: any) {
      console.error("Error fetching financial reports:", error);
      toast({
        title: "Erro ao carregar relatórios",
        description: error.message,
        variant: "destructive",
      });
      setSales([]);
      setKpis(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [supplierId, dateFrom, dateTo]);

  return {
    kpis,
    sales,
    loading,
    refreshReports: fetchReports,
  };
};

function calculateKPIs(sales: any[]): FinancialKPIs {
  const grossRevenue = sales.reduce(
    (sum, s) =>
      sum + (Number(s.price_total) || Number(s.sale_price) || 0),
    0
  );
  const revenueWithInterest = sales.reduce(
    (sum, s) =>
      sum +
      (Number(s.final_price_with_interest) ||
        Number(s.price_total) ||
        Number(s.sale_price) ||
        0),
    0
  );
  const totalCost = sales.reduce(
    (sum, s) => sum + (Number(s.total_cost) || 0),
    0
  );
  const totalBoardingFees = sales.reduce((sum, s) => {
    const fee = Number(s.boarding_fee) || 0;
    const pax = Number(s.passengers) || 1;
    return sum + fee * pax;
  }, 0);
  const totalMilesCost = totalCost - totalBoardingFees;
  const netRevenue = grossRevenue - totalCost;
  const grossProfit = grossRevenue - totalCost;
  const grossMarginPercent =
    grossRevenue > 0 ? (grossProfit / grossRevenue) * 100 : 0;
  const averageTicket =
    sales.length > 0 ? grossRevenue / sales.length : 0;
  const totalMilesUsed = sales.reduce(
    (sum, s) => sum + (Number(s.miles_used) || 0),
    0
  );
  const averageCostPerThousand =
    totalMilesUsed > 0
      ? (totalMilesCost / totalMilesUsed) * 1000
      : 0;

  // Por conta
  const accountMap = new Map();
  sales.forEach((sale) => {
    if (sale.mileage_account_id && sale.mileage_accounts) {
      const accId = sale.mileage_account_id;
      const existing =
        accountMap.get(accId) || {
          accountId: accId,
          accountNumber: sale.mileage_accounts.account_number,
          airlineName:
            sale.mileage_accounts.airline_companies?.name || "N/A",
          milesUsed: 0,
          totalCost: 0,
          revenue: 0,
          salesCount: 0,
        };
      existing.milesUsed += Number(sale.miles_used) || 0;
      existing.totalCost += Number(sale.total_cost) || 0;
      existing.revenue +=
        Number(sale.price_total) || Number(sale.sale_price) || 0;
      existing.salesCount += 1;
      accountMap.set(accId, existing);
    }
  });

  const byAccount = Array.from(accountMap.values()).map((acc: any) => ({
    ...acc,
    profit: acc.revenue - acc.totalCost,
    marginPercent:
      acc.revenue > 0
        ? ((acc.revenue - acc.totalCost) / acc.revenue) * 100
        : 0,
  }));

  // Por companhia
  const airlineMap = new Map();
  sales.forEach((sale) => {
    const airlineId =
      sale.mileage_accounts?.airline_company_id ||
      sale.program_id ||
      "counter";
    const airlineName =
      sale.mileage_accounts?.airline_companies?.name ||
      sale.counter_airline_program ||
      "Balcão";
    const airlineCode =
      sale.mileage_accounts?.airline_companies?.code || "N/A";

    const existing =
      airlineMap.get(airlineId) || {
        airlineId,
        airlineName,
        airlineCode,
        milesUsed: 0,
        totalCost: 0,
        revenue: 0,
        salesCount: 0,
      };
    existing.milesUsed += Number(sale.miles_used) || 0;
    existing.totalCost += Number(sale.total_cost) || 0;
    existing.revenue +=
      Number(sale.price_total) || Number(sale.sale_price) || 0;
    existing.salesCount += 1;
    airlineMap.set(airlineId, existing);
  });

  const byAirline = Array.from(airlineMap.values()).map(
    (airline: any) => ({
      ...airline,
      profit: airline.revenue - airline.totalCost,
      marginPercent:
        airline.revenue > 0
          ? ((airline.revenue - airline.totalCost) /
              airline.revenue) *
            100
          : 0,
    })
  );

  // Por canal
  const internal = sales.filter(
    (s) => s.channel === "internal" || s.sale_source === "internal_account"
  );
  const counter = sales.filter(
    (s) => s.channel === "balcao" || s.sale_source === "mileage_counter"
  );

  const calculateChannelStats = (channelSales: any[]) => {
    const revenue = channelSales.reduce(
      (sum, s) =>
        sum + (Number(s.price_total) || Number(s.sale_price) || 0),
      0
    );
    const cost = channelSales.reduce(
      (sum, s) => sum + (Number(s.total_cost) || 0),
      0
    );
    const profit = revenue - cost;
    return {
      salesCount: channelSales.length,
      revenue,
      cost,
      profit,
      marginPercent:
        revenue > 0 ? (profit / revenue) * 100 : 0,
    };
  };

  const byChannel = {
    internal: calculateChannelStats(internal),
    counter: calculateChannelStats(counter),
  };

  // Por forma de pagamento
  const paymentMap = new Map();
  sales.forEach((sale) => {
    const method = sale.payment_method || "Não informado";
    const existing =
      paymentMap.get(method) || {
        method,
        salesCount: 0,
        revenue: 0,
      };
    existing.salesCount += 1;
    existing.revenue +=
      Number(sale.price_total) || Number(sale.sale_price) || 0;
    paymentMap.set(method, existing);
  });

  const byPaymentMethod = Array.from(paymentMap.values()).map(
    (pm: any) => ({
      ...pm,
      averageTicket:
        pm.salesCount > 0 ? pm.revenue / pm.salesCount : 0,
    })
  );

  return {
    grossRevenue,
    revenueWithInterest,
    netRevenue,
    totalMilesCost,
    totalBoardingFees,
    totalCost,
    grossProfit,
    grossMarginPercent,
    averageTicket,
    totalMilesUsed,
    averageCostPerThousand,
    salesCount: sales.length,
    byAccount,
    byAirline,
    byChannel,
    byPaymentMethod,
  };
}
