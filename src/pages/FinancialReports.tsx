import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CalendarIcon,
  BarChart3,
  TrendingUp,
  DollarSign,
  Download,
  RefreshCw,
} from "lucide-react";
import {
  format,
  subDays,
  startOfMonth,
  endOfMonth,
  startOfYear,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useFinancialReports } from "@/hooks/useFinancialReports";
import { useUserRole } from "@/hooks/useUserRole";
import { useMileageAccounts } from "@/hooks/useMileageAccounts";
import { MetricsCard } from "@/components/dashboard/MetricsCard";
import { exportToCSV } from "@/lib/csv-export";
import { useToast } from "@/hooks/use-toast";

export default function FinancialReports() {
  const { supplierId } = useUserRole();
  const { accounts } = useMileageAccounts();
  const { toast } = useToast();

  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });

  const { kpis, sales, loading, refreshReports } = useFinancialReports(
    supplierId,
    dateRange.from,
    dateRange.to,
  );

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const formatNumber = (value: number) => {
    return value.toLocaleString("pt-BR");
  };

  const setPresetRange = (preset: string) => {
    const today = new Date();
    switch (preset) {
      case "today":
        setDateRange({ from: today, to: today });
        break;
      case "last7":
        setDateRange({ from: subDays(today, 7), to: today });
        break;
      case "thisMonth":
        setDateRange({ from: startOfMonth(today), to: endOfMonth(today) });
        break;
      case "lastMonth":
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        setDateRange({
          from: startOfMonth(lastMonth),
          to: endOfMonth(lastMonth),
        });
        break;
      case "thisYear":
        setDateRange({ from: startOfYear(today), to: today });
        break;
    }
  };

  // Uso de CPF por conta baseado nas vendas do período
  const cpfUsageByAccount = useMemo(() => {
    // Mapa: accountId -> Set de CPFs usados
    const usageMap = new Map<string, Set<string>>();

    sales.forEach((sale: any) => {
      const accountId = sale.mileage_account_id;
      const cpf = sale.client_cpf_encrypted;

      if (!accountId || !cpf) return;

      if (!usageMap.has(accountId)) {
        usageMap.set(accountId, new Set());
      }
      usageMap.get(accountId)!.add(cpf);
    });

    // Combina vendas com as contas cadastradas
    return accounts.map((account: any) => {
      const cpfSet = usageMap.get(account.id) ?? new Set<string>();
      const used = cpfSet.size;
      const limit = account.cpf_limit || 25;
      const percentage = limit > 0 ? (used / limit) * 100 : 0;

      return {
        id: account.id,
        airlineName: account.airline_companies?.name || "N/A",
        airlineCode: account.airline_companies?.code || "N/A",
        accountNumber: account.account_number,
        used,
        limit,
        percentage,
      };
    });
  }, [sales, accounts]);

  // Exportação CSV
  const exportSalesReport = () => {
    if (!kpis || sales.length === 0) {
      toast({
        title: "Nenhum dado para exportar",
        description: "Não há vendas no período selecionado",
        variant: "destructive",
      });
      return;
    }

    const exportData = sales.map((sale: any) => ({
      "Data da Venda": new Date(sale.created_at).toLocaleDateString("pt-BR"),
      "ID da Venda": sale.id.substring(0, 8),
      "Cliente": sale.client_name || "N/A",
      "CPF/CNPJ": sale.client_cpf_encrypted
        ? `***.***.***-${sale.client_cpf_encrypted.slice(-2)}`
        : "N/A",
      "Canal":
        sale.sale_source === "internal_account" ? "Conta Interna" : "Balcão",
      "Companhia Aérea":
        sale.mileage_accounts?.airline_companies?.name ||
        sale.counter_airline_program ||
        "N/A",
      "Milhas Usadas": sale.miles_used || 0,
      "Custo das Milhas": sale.total_cost
        ? (
            sale.total_cost -
            (sale.boarding_fee || 0) * (sale.passengers || 1)
          ).toFixed(2)
        : "0.00",
      "Taxa de Embarque": sale.boarding_fee
        ? ((sale.boarding_fee || 0) * (sale.passengers || 1)).toFixed(2)
        : "0.00",
      "Custo Total": sale.total_cost || 0,
      "Valor Bruto (sem juros)": sale.price_total || sale.sale_price || 0,
      "Juros": sale.final_price_with_interest
        ? (
            sale.final_price_with_interest -
            (sale.price_total || sale.sale_price || 0)
          ).toFixed(2)
        : "0.00",
      "Valor Final (com juros)":
        sale.final_price_with_interest ||
        sale.price_total ||
        sale.sale_price ||
        0,
      "Lucro":
        sale.margin_value ||
        (sale.price_total || sale.sale_price || 0) - (sale.total_cost || 0) ||
        0,
      "Margem (%)": sale.margin_percentage?.toFixed(2) || "0.00",
      "Forma de Pagamento": sale.payment_method || "N/A",
      Parcelas: sale.installments || 1,
      "Taxa de Juros (%)": sale.interest_rate?.toFixed(2) || "0.00",
      "Status Pagamento": sale.payment_status || "pending",
    }));

    const filename = `relatorio-vendas-${format(
      dateRange.from || new Date(),
      "yyyy-MM-dd",
    )}_${format(dateRange.to || new Date(), "yyyy-MM-dd")}`;

    exportToCSV(exportData, filename);

    toast({
      title: "Relatório exportado",
      description: `${exportData.length} vendas exportadas com sucesso`,
    });
  };

  if (loading || !kpis) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <p className="text-muted-foreground">Carregando relatórios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <BarChart3 className="h-8 w-8" />
              Relatórios Financeiros
            </h1>
            <p className="text-muted-foreground">
              Análise completa de vendas e performance financeira
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refreshReports()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button variant="default" onClick={exportSalesReport}>
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPresetRange("today")}
              >
                Hoje
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPresetRange("last7")}
              >
                Últimos 7 dias
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPresetRange("thisMonth")}
              >
                Mês atual
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPresetRange("lastMonth")}
              >
                Mês anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPresetRange("thisYear")}
              >
                Ano atual
              </Button>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="ml-4">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "dd/MM/yy", { locale: ptBR })}{" "}
                          -{" "}
                          {format(dateRange.to, "dd/MM/yy", { locale: ptBR })}
                        </>
                      ) : (
                        format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                      )
                    ) : (
                      <span>Selecione o período</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange.from}
                    selected={{ from: dateRange.from, to: dateRange.to }}
                    onSelect={(range) =>
                      setDateRange({ from: range?.from, to: range?.to })
                    }
                    numberOfMonths={2}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        </Card>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricsCard
            title="Faturamento Bruto"
            value={formatCurrency(kpis.grossRevenue)}
            change={`${kpis.salesCount} vendas`}
            icon={DollarSign}
            trend="up"
          />
          <MetricsCard
            title="Lucro Bruto"
            value={formatCurrency(kpis.grossProfit)}
            change={`${kpis.grossMarginPercent.toFixed(1)}% margem`}
            icon={TrendingUp}
            trend="up"
          />
          <MetricsCard
            title="Ticket Médio"
            value={formatCurrency(kpis.averageTicket)}
            change={`${kpis.salesCount} vendas`}
            icon={BarChart3}
            trend="up"
          />
          <MetricsCard
            title="Milhas Usadas"
            value={formatNumber(kpis.totalMilesUsed)}
            change={`${formatCurrency(
              kpis.averageCostPerThousand / 1000,
            )}/milha`}
            icon={TrendingUp}
            trend="up"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="accounts">Por Conta</TabsTrigger>
            <TabsTrigger value="airlines">Por Companhia</TabsTrigger>
            <TabsTrigger value="channels">Por Canal</TabsTrigger>
            <TabsTrigger value="payments">Por Pagamento</TabsTrigger>
            <TabsTrigger value="cpf">CPFs por Conta</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Resumo Financeiro</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Faturamento bruto:
                    </span>
                    <span className="font-semibold">
                      {formatCurrency(kpis.grossRevenue)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Faturamento com juros:
                    </span>
                    <span className="font-semibold">
                      {formatCurrency(kpis.revenueWithInterest)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Custo de milhas:
                    </span>
                    <span className="font-semibold text-destructive">
                      -{formatCurrency(kpis.totalMilesCost)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Taxas de embarque:
                    </span>
                    <span className="font-semibold text-destructive">
                      -{formatCurrency(kpis.totalBoardingFees)}
                    </span>
                  </div>
                  <div className="border-t pt-2 flex justify-between">
                    <span className="font-semibold">Lucro bruto:</span>
                    <span className="font-bold text-primary">
                      {formatCurrency(kpis.grossProfit)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Margem bruta:
                    </span>
                    <span className="font-semibold">
                      {kpis.grossMarginPercent.toFixed(2)}%
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Performance de Vendas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Total de vendas:
                    </span>
                    <span className="font-semibold">{kpis.salesCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Ticket médio:
                    </span>
                    <span className="font-semibold">
                      {formatCurrency(kpis.averageTicket)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Milhas totais:
                    </span>
                    <span className="font-semibold">
                      {formatNumber(kpis.totalMilesUsed)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Custo médio/mil:
                    </span>
                    <span className="font-semibold">
                      {formatCurrency(kpis.averageCostPerThousand)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Canal interno:
                    </span>
                    <span className="font-semibold">
                      {kpis.byChannel.internal.salesCount} vendas
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Canal balcão:
                    </span>
                    <span className="font-semibold">
                      {kpis.byChannel.counter.salesCount} vendas
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="accounts">
            <Card>
              <CardHeader>
                <CardTitle>Performance por Conta de Milhagem</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Conta</TableHead>
                      <TableHead>Companhia</TableHead>
                      <TableHead className="text-right">Vendas</TableHead>
                      <TableHead className="text-right">Milhas</TableHead>
                      <TableHead className="text-right">Receita</TableHead>
                      <TableHead className="text-right">Lucro</TableHead>
                      <TableHead className="text-right">Margem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {kpis.byAccount.map((acc) => (
                      <TableRow key={acc.accountId}>
                        <TableCell className="font-medium">
                          {acc.accountNumber}
                        </TableCell>
                        <TableCell>{acc.airlineName}</TableCell>
                        <TableCell className="text-right">
                          {acc.salesCount}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(acc.milesUsed)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(acc.revenue)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(acc.profit)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={
                              acc.marginPercent > 0
                                ? "default"
                                : "destructive"
                            }
                          >
                            {acc.marginPercent.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="airlines">
            <Card>
              <CardHeader>
                <CardTitle>Performance por Companhia Aérea</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Companhia</TableHead>
                      <TableHead className="text-right">Vendas</TableHead>
                      <TableHead className="text-right">Receita</TableHead>
                      <TableHead className="text-right">Lucro</TableHead>
                      <TableHead className="text-right">Margem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {kpis.byAirline.map((airline) => (
                      <TableRow key={airline.airlineId}>
                        <TableCell className="font-medium">
                          {airline.airlineName}
                        </TableCell>
                        <TableCell className="text-right">
                          {airline.salesCount}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(airline.revenue)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(airline.profit)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={
                              airline.marginPercent > 0
                                ? "default"
                                : "destructive"
                            }
                          >
                            {airline.marginPercent.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="channels">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Canal Interno</CardTitle>
                  <CardDescription>Vendas com contas próprias</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>Vendas:</span>
                    <span className="font-semibold">
                      {kpis.byChannel.internal.salesCount}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Receita:</span>
                    <span className="font-semibold">
                      {formatCurrency(kpis.byChannel.internal.revenue)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Lucro:</span>
                    <span className="font-bold text-primary">
                      {formatCurrency(kpis.byChannel.internal.profit)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Margem:</span>
                    <Badge>
                      {kpis.byChannel.internal.marginPercent.toFixed(1)}%
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Canal Balcão</CardTitle>
                  <CardDescription>
                    Vendas com fornecedores
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>Vendas:</span>
                    <span className="font-semibold">
                      {kpis.byChannel.counter.salesCount}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Receita:</span>
                    <span className="font-semibold">
                      {formatCurrency(kpis.byChannel.counter.revenue)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Lucro:</span>
                    <span className="font-bold text-primary">
                      {formatCurrency(kpis.byChannel.counter.profit)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Margem:</span>
                    <Badge>
                      {kpis.byChannel.counter.marginPercent.toFixed(1)}%
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle>Performance por Forma de Pagamento</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Forma de Pagamento</TableHead>
                      <TableHead className="text-right">Vendas</TableHead>
                      <TableHead className="text-right">
                        Receita Total
                      </TableHead>
                      <TableHead className="text-right">
                        Ticket Médio
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {kpis.byPaymentMethod.map((pm) => (
                      <TableRow key={pm.method}>
                        <TableCell className="font-medium">
                          {pm.method}
                        </TableCell>
                        <TableCell className="text-right">
                          {pm.salesCount}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(pm.revenue)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(pm.averageTicket)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: CPFs por Conta */}
          <TabsContent value="cpf" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Uso de CPFs por Conta</CardTitle>
                <CardDescription>
                  Acompanhe o consumo de CPFs por conta de milhagem no período
                  selecionado
                </CardDescription>
              </CardHeader>
              <CardContent>
                {cpfUsageByAccount.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Não há vendas com CPF registradas no período selecionado.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {cpfUsageByAccount.map((item) => (
                      <div
                        key={item.id}
                        className="border rounded-lg p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{item.airlineName}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.airlineCode} - {item.accountNumber}
                            </p>
                          </div>
                          <Badge
                            variant={
                              item.percentage >= 90
                                ? "destructive"
                                : item.percentage >= 75
                                ? "secondary"
                                : "default"
                            }
                          >
                            {item.used}/{item.limit} CPFs
                          </Badge>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Uso</span>
                            <span className="font-medium">
                              {item.percentage.toFixed(0)}%
                            </span>
                          </div>
                          <div className="h-2 bg-secondary rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full transition-all",
                                item.percentage >= 90
                                  ? "bg-destructive"
                                  : item.percentage >= 75
                                  ? "bg-yellow-500"
                                  : "bg-primary",
                              )}
                              style={{
                                width: `${Math.min(item.percentage, 100)}%`,
                              }}
                            />
                          </div>
                        </div>

                        {item.percentage >= 75 && (
                          <p className="text-sm text-muted-foreground">
                            ⚠️ {item.percentage >= 90 ? "Atenção: " : "Aviso: "}
                            {item.limit - item.used} CPF(s) disponível(is) no
                            limite desta conta.
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
