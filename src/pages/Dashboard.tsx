import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  DollarSign, 
  Users, 
  Plane, 
  TrendingUp,
  Search,
  Plus,
  MessageSquare,
  LogOut,
  Calculator,
  FileText,
  UserCheck
} from "lucide-react";
import { MetricsCard } from "@/components/dashboard/MetricsCard";
import { SalesTable } from "@/components/dashboard/SalesTable";
import { AccountsTable } from "@/components/dashboard/AccountsTable";
import { TicketsTable } from "@/components/dashboard/TicketsTable";
import { MessagesPanel } from "@/components/dashboard/MessagesPanel";
import { ProfitCalculator } from "@/components/calculator/ProfitCalculator";
import { QuoteGenerator } from "@/components/calculator/QuoteGenerator";
import { SuppliersTable } from "@/components/suppliers/SuppliersTable";
import { useAuth } from "@/hooks/useAuth";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("sales");
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user && !loading) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Plane className="h-12 w-12 text-primary animate-bounce mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const metrics = [
    {
      title: "Receita Total",
      value: "R$ 124.500",
      change: "+20.1%",
      icon: DollarSign,
      trend: "up" as const,
    },
    {
      title: "Vendas Ativas",
      value: "89",
      change: "+15.3%",
      icon: TrendingUp,
      trend: "up" as const,
    },
    {
      title: "Clientes",
      value: "243",
      change: "+12.5%",
      icon: Users,
      trend: "up" as const,
    },
    {
      title: "Passagens Emitidas",
      value: "156",
      change: "+8.2%",
      icon: Plane,
      trend: "up" as const,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-lg bg-gradient-primary flex items-center justify-center">
                  <Plane className="h-5 w-5 text-primary-foreground" />
                </div>
                <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  Hello Milhas +
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon">
                <Search className="h-4 w-4" />
              </Button>
              <Button variant="hero">
                <Plus className="h-4 w-4 mr-2" />
                Nova Venda
              </Button>
              <Button variant="outline" size="icon" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Metrics Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {metrics.map((metric, index) => (
            <MetricsCard key={index} {...metric} />
          ))}
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-card shadow-card">
            <TabsTrigger value="calculator">
              <Calculator className="h-4 w-4 mr-2" />
              Calculadora
            </TabsTrigger>
            <TabsTrigger value="quote">
              <FileText className="h-4 w-4 mr-2" />
              Orçamento
            </TabsTrigger>
            <TabsTrigger value="sales">Vendas</TabsTrigger>
            <TabsTrigger value="suppliers">
              <UserCheck className="h-4 w-4 mr-2" />
              Fornecedores
            </TabsTrigger>
            <TabsTrigger value="accounts">Contas</TabsTrigger>
            <TabsTrigger value="tickets">Passagens</TabsTrigger>
            <TabsTrigger value="messages">
              <MessageSquare className="h-4 w-4 mr-2" />
              Mensagens
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calculator" className="space-y-4">
            <ProfitCalculator />
          </TabsContent>

          <TabsContent value="quote" className="space-y-4">
            <QuoteGenerator />
          </TabsContent>

          <TabsContent value="sales" className="space-y-4">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Vendas Recentes</CardTitle>
                <CardDescription>
                  Acompanhe todas as suas transações em tempo real
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SalesTable />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="suppliers" className="space-y-4">
            <SuppliersTable />
          </TabsContent>

          <TabsContent value="accounts" className="space-y-4">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Contas de Milhagem</CardTitle>
                <CardDescription>
                  Gerencie suas contas de programas de fidelidade
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AccountsTable />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tickets" className="space-y-4">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Passagens Emitidas</CardTitle>
                <CardDescription>
                  Controle todas as passagens emitidas para seus clientes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TicketsTable />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="messages" className="space-y-4">
            <MessagesPanel />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;
