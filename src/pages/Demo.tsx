import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  ArrowUpRight, 
  DollarSign, 
  ShoppingCart, 
  Users, 
  Ticket,
  Info,
  Plane
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Demo() {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);

  // Dados fictícios
  const metrics = [
    {
      title: "Receita Total",
      value: "R$ 127.450,00",
      change: "+12.5%",
      trend: "up",
      icon: DollarSign,
    },
    {
      title: "Vendas no Mês",
      value: "48",
      change: "+8.2%",
      trend: "up",
      icon: ShoppingCart,
    },
    {
      title: "Clientes Ativos",
      value: "156",
      change: "+5.1%",
      trend: "up",
      icon: Users,
    },
    {
      title: "Passagens Emitidas",
      value: "72",
      change: "+15.3%",
      trend: "up",
      icon: Ticket,
    },
  ];

  const recentSales = [
    { id: 1, cliente: "Maria Silva", rota: "GRU-MIA", valor: "R$ 2.450,00", status: "Pago" },
    { id: 2, cliente: "João Santos", rota: "GRU-LIS", valor: "R$ 3.200,00", status: "Pago" },
    { id: 3, cliente: "Ana Costa", rota: "GRU-NYC", valor: "R$ 2.850,00", status: "Pendente" },
    { id: 4, cliente: "Pedro Lima", rota: "GRU-PAR", valor: "R$ 3.100,00", status: "Pago" },
    { id: 5, cliente: "Carla Souza", rota: "GRU-LON", valor: "R$ 3.500,00", status: "Pago" },
  ];

  const handleActionClick = () => {
    setShowModal(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Demo Banner */}
      <Alert className="border-primary bg-primary/10 rounded-none">
        <Info className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span className="font-medium">
            DEMONSTRAÇÃO - Todos os dados exibidos são fictícios
          </span>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="default"
              onClick={() => navigate('/assinatura')}
            >
              Testar 7 dias grátis
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => navigate('/login')}
            >
              Login
            </Button>
          </div>
        </AlertDescription>
      </Alert>

      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Plane className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">Hello Milhas + | Demo</span>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
            <p className="text-muted-foreground">
              Visão geral do seu negócio de milhas
            </p>
          </div>
          <Button onClick={handleActionClick}>
            Nova Venda
          </Button>
        </div>

        {/* Metrics Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {metrics.map((metric, index) => (
            <Card key={index} onClick={handleActionClick} className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {metric.title}
                </CardTitle>
                <metric.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metric.value}</div>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <ArrowUpRight className="h-3 w-3 text-green-500" />
                  <span className="text-green-500">{metric.change}</span>
                  <span>vs. mês anterior</span>
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Sales */}
        <Card>
          <CardHeader>
            <CardTitle>Vendas Recentes</CardTitle>
            <CardDescription>
              Últimas transações realizadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentSales.map((sale) => (
                <div 
                  key={sale.id} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={handleActionClick}
                >
                  <div className="flex flex-col gap-1">
                    <p className="font-medium">{sale.cliente}</p>
                    <p className="text-sm text-muted-foreground">{sale.rota}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="font-semibold">{sale.valor}</p>
                    <Badge variant={sale.status === "Pago" ? "default" : "secondary"}>
                      {sale.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* CTA Section */}
        <Card className="mt-8 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">
              Gostou do que viu?
            </h2>
            <p className="text-muted-foreground mb-6">
              Comece seu teste gratuito de 7 dias e tenha acesso completo a todos os recursos
            </p>
            <Button 
              size="lg" 
              onClick={() => navigate('/assinatura')}
            >
              Começar Teste Gratuito
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Modal de Recurso Bloqueado */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recurso disponível no plano completo</DialogTitle>
            <DialogDescription>
              Esta é apenas uma demonstração com dados fictícios. Inicie seu teste grátis de 7 dias para ter acesso completo a todos os recursos da plataforma.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Continuar Explorando
            </Button>
            <Button onClick={() => navigate('/assinatura')}>
              Iniciar Teste Grátis
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
