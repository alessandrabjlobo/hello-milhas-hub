import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  Users, 
  Plane, 
  DollarSign,
  ArrowRight,
  AlertCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function Demo() {
  const navigate = useNavigate();

  // Dados fictícios
  const mockMetrics = {
    revenue: "R$ 47.580,00",
    sales: 23,
    customers: 18,
    tickets: 31
  };

  const mockSales = [
    {
      id: 1,
      customer: "João Silva",
      miles: "60.000",
      program: "Smiles",
      value: "R$ 2.400,00",
      status: "Pago",
      date: "15/01/2024"
    },
    {
      id: 2,
      customer: "Maria Santos",
      miles: "80.000",
      program: "LATAM Pass",
      value: "R$ 3.200,00",
      status: "Pendente",
      date: "14/01/2024"
    },
    {
      id: 3,
      customer: "Carlos Oliveira",
      miles: "45.000",
      program: "TudoAzul",
      value: "R$ 1.800,00",
      status: "Pago",
      date: "13/01/2024"
    }
  ];

  const mockAccounts = [
    {
      id: 1,
      program: "Smiles",
      account: "1234567890",
      balance: "250.000",
      status: "Ativa"
    },
    {
      id: 2,
      program: "LATAM Pass",
      account: "9876543210",
      balance: "180.000",
      status: "Ativa"
    },
    {
      id: 3,
      program: "TudoAzul",
      account: "5555666677",
      balance: "320.000",
      status: "Ativa"
    }
  ];

  const mockTickets = [
    {
      id: 1,
      passenger: "Ana Costa",
      route: "GRU → MIA",
      date: "25/02/2024",
      status: "Emitida"
    },
    {
      id: 2,
      passenger: "Pedro Lima",
      route: "GIG → LIS",
      date: "10/03/2024",
      status: "Emitida"
    },
    {
      id: 3,
      passenger: "Julia Mendes",
      route: "BSB → NYC",
      date: "05/04/2024",
      status: "Pendente"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Demo Banner */}
      <div className="bg-gradient-primary text-primary-foreground py-3 px-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">
              Você está visualizando uma demonstração com dados fictícios
            </span>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => navigate("/login")}
            >
              Fazer Login
            </Button>
            <Button 
              variant="default" 
              size="sm"
              onClick={() => navigate("/assinatura")}
            >
              Começar Agora
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Visão geral do seu negócio</p>
          </div>
          <Alert className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Explore as funcionalidades! Ações de edição estão desabilitadas na demo.
            </AlertDescription>
          </Alert>
        </div>

        {/* Metrics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{mockMetrics.revenue}</div>
              <p className="text-xs text-muted-foreground">Últimos 30 dias</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vendas</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{mockMetrics.sales}</div>
              <p className="text-xs text-muted-foreground">+12% vs. mês anterior</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clientes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{mockMetrics.customers}</div>
              <p className="text-xs text-muted-foreground">+3 novos este mês</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Passagens</CardTitle>
              <Plane className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{mockMetrics.tickets}</div>
              <p className="text-xs text-muted-foreground">Emitidas este mês</p>
            </CardContent>
          </Card>
        </div>

        {/* Sales Table */}
        <Card>
          <CardHeader>
            <CardTitle>Vendas Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Milhas</TableHead>
                  <TableHead>Programa</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockSales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium">{sale.customer}</TableCell>
                    <TableCell>{sale.miles}</TableCell>
                    <TableCell>{sale.program}</TableCell>
                    <TableCell>{sale.value}</TableCell>
                    <TableCell>
                      <Badge variant={sale.status === "Pago" ? "default" : "secondary"}>
                        {sale.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{sale.date}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Two Column Layout */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Accounts */}
          <Card>
            <CardHeader>
              <CardTitle>Contas de Milhagem</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Programa</TableHead>
                    <TableHead>Conta</TableHead>
                    <TableHead>Saldo</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockAccounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium">{account.program}</TableCell>
                      <TableCell className="text-muted-foreground">{account.account}</TableCell>
                      <TableCell>{account.balance}</TableCell>
                      <TableCell>
                        <Badge variant="default">{account.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Tickets */}
          <Card>
            <CardHeader>
              <CardTitle>Passagens Emitidas</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Passageiro</TableHead>
                    <TableHead>Rota</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockTickets.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell className="font-medium">{ticket.passenger}</TableCell>
                      <TableCell>{ticket.route}</TableCell>
                      <TableCell className="text-muted-foreground">{ticket.date}</TableCell>
                      <TableCell>
                        <Badge variant={ticket.status === "Emitida" ? "default" : "secondary"}>
                          {ticket.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <Card className="border-2 border-primary/20 shadow-glow">
          <CardContent className="p-8 text-center space-y-4">
            <h2 className="text-2xl font-bold">Pronto para começar?</h2>
            <p className="text-muted-foreground">
              Teste grátis por 7 dias. Todas as funcionalidades liberadas.
            </p>
            <Button 
              variant="hero" 
              size="lg"
              onClick={() => navigate("/assinatura")}
            >
              Começar Teste Gratuito
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
