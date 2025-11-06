import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, BarChart3, TrendingUp, DollarSign, Users } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useSales } from "@/hooks/useSales";
import { useMileageAccounts } from "@/hooks/useMileageAccounts";

export default function Reports() {
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  });
  
  const { sales } = useSales();
  const { accounts } = useMileageAccounts();

  // Filter sales by date range
  const filteredSales = sales.filter(sale => {
    if (!dateRange.from || !dateRange.to) return true;
    const saleDate = new Date(sale.created_at);
    return saleDate >= dateRange.from && saleDate <= dateRange.to;
  });

  // Sales by airline
  const salesByAirline = filteredSales.reduce((acc, sale) => {
    const airline = sale.mileage_accounts?.airline_companies?.code || "N/A";
    if (!acc[airline]) {
      acc[airline] = { count: 0, revenue: 0, cost: 0 };
    }
    acc[airline].count++;
    acc[airline].revenue += sale.price_total || 0;
    acc[airline].cost += sale.total_cost || 0;
    return acc;
  }, {} as Record<string, { count: number; revenue: number; cost: number }>);

  // CPFs by account
  const cpfsByAccount = accounts.map(account => ({
    airline: account.airline_companies?.name || "N/A",
    code: account.airline_companies?.code || "N/A",
    used: account.cpf_count || 0,
    limit: account.cpf_limit || 25,
    percentage: ((account.cpf_count || 0) / (account.cpf_limit || 25)) * 100,
  }));

  // Summary metrics
  const totalRevenue = filteredSales.reduce((sum, sale) => sum + (sale.price_total || 0), 0);
  const totalCost = filteredSales.reduce((sum, sale) => sum + (sale.total_cost || 0), 0);
  const totalProfit = totalRevenue - totalCost;
  const avgMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100) : 0;

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Relatórios</h1>
            <p className="text-muted-foreground">
              Análise de vendas e performance
            </p>
          </div>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[280px] justify-start text-left">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "dd/MM/yy", { locale: ptBR })} -{" "}
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
                onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                numberOfMonths={2}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Vendas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <span className="text-2xl font-bold">{filteredSales.length}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Receita Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span className="text-2xl font-bold">
                  R$ {totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Lucro Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-2xl font-bold">
                  R$ {totalProfit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Margem Média
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-2xl font-bold">{avgMargin.toFixed(1)}%</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="sales" className="space-y-4">
          <TabsList>
            <TabsTrigger value="sales">Vendas por Companhia</TabsTrigger>
            <TabsTrigger value="cpf">CPFs por Conta</TabsTrigger>
          </TabsList>

          <TabsContent value="sales" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Análise por Companhia Aérea</CardTitle>
                <CardDescription>
                  Quantidade, receita e custo por companhia no período selecionado
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(salesByAirline).map(([airline, data]) => {
                    const margin = data.revenue > 0 ? ((data.revenue - data.cost) / data.revenue * 100) : 0;
                    
                    return (
                      <div key={airline} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="text-base">
                              {airline}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {data.count} venda(s)
                            </span>
                          </div>
                          <Badge variant={margin > 20 ? "default" : margin > 10 ? "secondary" : "destructive"}>
                            {margin.toFixed(1)}% margem
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Receita</p>
                            <p className="font-semibold text-green-600">
                              R$ {data.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Custo</p>
                            <p className="font-semibold text-red-600">
                              R$ {data.cost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Lucro</p>
                            <p className="font-semibold text-primary">
                              R$ {(data.revenue - data.cost).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {Object.keys(salesByAirline).length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p>Nenhuma venda no período selecionado</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cpf" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Uso de CPFs por Conta</CardTitle>
                <CardDescription>
                  Acompanhe o consumo de CPFs e renovações necessárias
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {cpfsByAccount.map((account, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{account.airline}</p>
                          <p className="text-sm text-muted-foreground">{account.code}</p>
                        </div>
                        <Badge 
                          variant={
                            account.percentage >= 90 ? "destructive" : 
                            account.percentage >= 75 ? "secondary" : 
                            "default"
                          }
                        >
                          {account.used}/{account.limit} CPFs
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Uso</span>
                          <span className="font-medium">{account.percentage.toFixed(0)}%</span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full transition-all",
                              account.percentage >= 90 ? "bg-destructive" :
                              account.percentage >= 75 ? "bg-yellow-500" :
                              "bg-primary"
                            )}
                            style={{ width: `${Math.min(account.percentage, 100)}%` }}
                          />
                        </div>
                      </div>

                      {account.percentage >= 75 && (
                        <p className="text-sm text-muted-foreground">
                          ⚠️ {account.percentage >= 90 ? "Atenção: " : "Aviso: "}
                          {account.limit - account.used} CPF(s) disponível(is)
                        </p>
                      )}
                    </div>
                  ))}

                  {cpfsByAccount.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p>Nenhuma conta cadastrada</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
