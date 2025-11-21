import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSales } from "@/hooks/useSales";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Users,
  ShoppingCart,
  Plane,
  CreditCard,
  Calendar,
  Percent,
  Eye,
} from "lucide-react";
import { PaymentStatusBadge } from "@/components/sales/PaymentStatusBadge";

interface Customer {
  id: string;
  name: string;
  cpf_encrypted: string;
  phone: string | null;
  email: string | null;
  total_purchases: number;
  total_spent: number;
  last_purchase_at: string | null;
  created_at: string;
}

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loadingCustomer, setLoadingCustomer] = useState(true);

  // Todas as vendas da agência
  const { sales, loading: loadingSales } = useSales();

  useEffect(() => {
    if (!id) return;
    void fetchCustomer();
  }, [id]);

  const fetchCustomer = async () => {
    try {
      setLoadingCustomer(true);
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast({
          title: "Cliente não encontrado",
          description: "Verifique se o link está correto.",
          variant: "destructive",
        });
        navigate("/customers");
        return;
      }

      setCustomer(data as Customer);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar cliente",
        description: error.message ?? "Tente novamente.",
        variant: "destructive",
      });
      navigate("/customers");
    } finally {
      setLoadingCustomer(false);
    }
  };

  const maskCPF = (cpf: string | null | undefined) => {
    if (!cpf) return "N/A";
    return `***.***.***-${cpf.slice(-2)}`;
  };

  // Vendas relacionadas a este cliente
  const customerSales = useMemo(() => {
    if (!customer) return [];
    return sales.filter((sale) => {
      const saleCpf =
        (sale.customer_cpf as string | null | undefined) ||
        (sale.client_cpf_encrypted as string | null | undefined) ||
        "";
      return saleCpf === customer.cpf_encrypted;
    });
  }, [sales, customer]);

  const summary = useMemo(() => {
    if (!customer) {
      return {
        totalSpent: 0,
        totalSales: 0,
        avgTicket: 0,
        lastPurchase: null as string | null,
      };
    }

    const totalSales = customerSales.length || customer.total_purchases || 0;

    const totalSpentFromSales =
      customerSales.reduce(
        (sum, sale) => sum + (sale.price_total || sale.sale_price || 0),
        0,
      ) || 0;

    const totalSpent = totalSpentFromSales || customer.total_spent || 0;
    const avgTicket = totalSales > 0 ? totalSpent / totalSales : 0;
    const lastPurchase =
      customer.last_purchase_at ||
      (customerSales[0]?.created_at as string | null | undefined) ||
      null;

    return {
      totalSpent,
      totalSales,
      avgTicket,
      lastPurchase,
    };
  }, [customer, customerSales]);

  if (loadingCustomer || (!customer && loadingCustomer)) {
    return (
      <div className="container max-w-7xl mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (!customer) return null;

  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/customers")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Users className="h-7 w-7" />
              {customer.name}
            </h1>
            <p className="text-muted-foreground">
              Cliente desde{" "}
              {new Date(customer.created_at).toLocaleDateString("pt-BR")}
            </p>
          </div>
        </div>

        <div className="text-right space-y-1">
          <p className="text-sm text-muted-foreground">
            CPF: {maskCPF(customer.cpf_encrypted)}
          </p>
          <div className="flex flex-col items-end text-sm">
            {customer.phone && (
              <span className="text-foreground">{customer.phone}</span>
            )}
            {customer.email && (
              <span className="text-muted-foreground">{customer.email}</span>
            )}
          </div>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Total Gasto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              R{"$ "}
              {summary.totalSpent.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Plane className="h-4 w-4" />
              Vendas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.totalSales}
            </div>
            <p className="text-xs text-muted-foreground">
              Compras registradas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Ticket Médio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R{"$ "}
              {summary.avgTicket.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Baseado nas vendas deste cliente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Última Compra
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
              {summary.lastPurchase
                ? new Date(summary.lastPurchase).toLocaleDateString("pt-BR")
                : "-"}
            </div>
            <p className="text-xs text-muted-foreground">
              Histórico de emissões
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Vendas do Cliente */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Plane className="h-5 w-5" />
                Vendas deste Cliente
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Todas as emissões vinculadas a este CPF
              </p>
            </div>
            <Button asChild variant="outline">
              <Link to={`/sales?customer=${customer.cpf_encrypted}`}>
                Ver na listagem completa
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingSales ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : customerSales.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
              <Plane className="h-8 w-8 mb-2" />
              <p className="font-medium">
                Nenhuma venda encontrada para este cliente
              </p>
              <p className="text-sm">
                Assim que você emitir uma passagem usando este cliente, ela
                aparecerá aqui.
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Rota</TableHead>
                    <TableHead>Passageiros</TableHead>
                    <TableHead>Valor Total</TableHead>
                    <TableHead>% Lucro</TableHead>
                    <TableHead>Forma Pagamento</TableHead>
                    <TableHead>Status Pagamento</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customerSales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>
                        {new Date(sale.created_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {sale.route_text || "-"}
                      </TableCell>
                      <TableCell>{sale.passengers}</TableCell>
                      <TableCell className="font-semibold">
                        R{"$ "}
                        {(sale.price_total || sale.sale_price || 0).toLocaleString(
                          "pt-BR",
                          { minimumFractionDigits: 2 },
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            (sale.margin_percentage || 0) >= 20
                              ? "default"
                              : (sale.margin_percentage || 0) >= 10
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {(sale.margin_percentage || 0).toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {sale.payment_method === "pix"
                            ? "📱 PIX"
                            : sale.payment_method === "credit_card"
                            ? "💳 Crédito"
                            : sale.payment_method === "debit_card"
                            ? "💳 Débito"
                            : sale.payment_method || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <PaymentStatusBadge
                          status={sale.payment_status || "pending"}
                          paidAmount={sale.paid_amount || 0}
                          totalAmount={sale.sale_price || 0}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" asChild>
                          <Link to={`/sales/${sale.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
