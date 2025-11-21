import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  DollarSign, 
  TrendingUp,
  Plane,
  BarChart3,
  AlertTriangle,
  Plus,
  Settings
} from "lucide-react";
import { MetricsCard } from "@/components/dashboard/MetricsCard";
import { useSalesKPIs } from "@/hooks/useSalesKPIs";
import { useUserRole } from "@/hooks/useUserRole";
import { Badge } from "@/components/ui/badge";

export default function DashboardKPIs() {
  const navigate = useNavigate();
  const { supplierId } = useUserRole();
  const { kpis, loading } = useSalesKPIs(supplierId, 30);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Plane className="h-12 w-12 text-primary animate-bounce mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando KPIs...</p>
        </div>
      </div>
    );
  }

  const metrics = [
    {
      title: "Receita Total (30 dias)",
      value: formatCurrency(kpis.totalRevenue),
      change: `${kpis.salesCount} vendas`,
      icon: DollarSign,
      trend: "up" as const,
    },
    {
      title: "Milhas Vendidas",
      value: formatNumber(kpis.totalMilesSold),
      change: "Últimos 30 dias",
      icon: Plane,
      trend: "up" as const,
    },
    {
      title: "Preço Médio /1k",
      value: formatCurrency(kpis.averagePricePerThousand),
      change: "Por mil milhas",
      icon: TrendingUp,
      trend: "up" as const,
    },
    {
      title: "Margem Média",
      value: `${kpis.averageMargin.toFixed(1)}%`,
      change: "Sobre receita total",
      icon: BarChart3,
      trend: "up" as const,
    },
  ];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Visão geral dos últimos 30 dias</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate("/settings/programs")}>
              <Settings className="h-4 w-4 mr-2" />
              Configurar Programas
            </Button>
            <Button onClick={() => navigate("/sales/new")}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Venda
            </Button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {metrics.map((metric, index) => (
            <MetricsCard key={index} {...metric} />
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Top Programs */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Top Programas</CardTitle>
              <CardDescription>Programas com mais vendas no período</CardDescription>
            </CardHeader>
            <CardContent>
              {kpis.topPrograms.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma venda registrada no período
                </p>
              ) : (
                <div className="space-y-4">
                  {kpis.topPrograms.map((program, idx) => (
                    <div key={program.airlineId} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="w-8 h-8 flex items-center justify-center">
                          {idx + 1}
                        </Badge>
                        <div>
                          <p className="font-medium">{program.airlineName}</p>
                          <p className="text-sm text-muted-foreground">
                            {program.salesCount} vendas
                          </p>
                        </div>
                      </div>
                      <p className="font-semibold">{formatCurrency(program.totalRevenue)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Low Balance Accounts */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Contas com Saldo Baixo
              </CardTitle>
              <CardDescription>Contas com menos de 50.000 milhas</CardDescription>
            </CardHeader>
            <CardContent>
              {kpis.lowBalanceAccounts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Todas as contas estão com saldo adequado
                </p>
              ) : (
                <div className="space-y-4">
                  {kpis.lowBalanceAccounts.map((account) => (
                    <div key={account.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{account.airlineName}</p>
                        <p className="text-sm text-muted-foreground">
                          {account.accountNumber}
                        </p>
                      </div>
                      <Badge variant={account.balance < 20000 ? "destructive" : "secondary"}>
                        {formatNumber(account.balance)} milhas
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
              <Button 
                variant="outline" 
                className="w-full mt-4"
                onClick={() => navigate("/accounts")}
              >
                Ver Todas as Contas
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="shadow-card mt-6">
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-4">
            <Button variant="outline" onClick={() => navigate("/sales/new")} className="h-20">
              <div className="flex flex-col items-center gap-2">
                <Plus className="h-5 w-5" />
                <span className="text-sm">Nova Venda</span>
              </div>
            </Button>
            <Button variant="outline" onClick={() => navigate("/accounts")} className="h-20">
              <div className="flex flex-col items-center gap-2">
                <Plane className="h-5 w-5" />
                <span className="text-sm">Contas</span>
              </div>
            </Button>
            <Button variant="outline" onClick={() => navigate("/sales")} className="h-20">
              <div className="flex flex-col items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                <span className="text-sm">Vendas</span>
              </div>
            </Button>
            <Button variant="outline" onClick={() => navigate("/reports/financial")} className="h-20">
              <div className="flex flex-col items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                <span className="text-sm">Relatórios</span>
              </div>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}