import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Plane, User, CreditCard, DollarSign } from "lucide-react";
import { PaymentDialog } from "@/components/sales/PaymentDialog";
import { PaymentStatusBadge } from "@/components/sales/PaymentStatusBadge";
import type { Database } from "@/integrations/supabase/types";

type Sale = Database["public"]["Tables"]["sales"]["Row"] & {
  mileage_accounts?: {
    airline_companies: {
      name: string;
      code: string;
    } | null;
  } | null;
};

type Ticket = Database["public"]["Tables"]["tickets"]["Row"];

export default function SaleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sale, setSale] = useState<Sale | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  const fetchSaleDetails = async () => {
    if (!id) return;

    try {
      setLoading(true);

      const { data: saleData, error: saleError } = await supabase
        .from("sales")
        .select(`
          *,
          mileage_accounts (
            airline_companies (
              name,
              code
            )
          )
        `)
        .eq("id", id)
        .single();

      if (saleError) throw saleError;
      setSale(saleData);

      const { data: ticketsData, error: ticketsError } = await supabase
        .from("tickets")
        .select("*")
        .eq("sale_id", id)
        .order("created_at", { ascending: false });

      if (ticketsError) throw ticketsError;
      setTickets(ticketsData || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar detalhes",
        description: error.message,
        variant: "destructive",
      });
      navigate("/sales");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSaleDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!sale) {
    return null;
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pending: "secondary",
      completed: "default",
      cancelled: "destructive",
    };
    const labels: Record<string, string> = {
      pending: "Pendente",
      completed: "Concluída",
      cancelled: "Cancelada",
    };
    return <Badge variant={variants[status]}>{labels[status] || status}</Badge>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/sales")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Detalhes da Venda</h1>
            <p className="text-muted-foreground">
              {new Date(sale.created_at).toLocaleDateString("pt-BR")}
            </p>
          </div>
        </div>
        {getStatusBadge(sale.status)}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm text-muted-foreground">Nome</p>
              <p className="font-medium">{sale.customer_name || sale.client_name}</p>
            </div>
            {sale.customer_phone && (
              <div>
                <p className="text-sm text-muted-foreground">Telefone</p>
                <p className="font-medium">{sale.customer_phone}</p>
              </div>
            )}
            {sale.customer_cpf && (
              <div>
                <p className="text-sm text-muted-foreground">CPF</p>
                <p className="font-medium">{sale.customer_cpf}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plane className="h-5 w-5" />
              Viagem
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm text-muted-foreground">Rota</p>
              <p className="font-medium">{sale.route_text || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Passageiros</p>
              <p className="font-medium">{sale.passengers}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Programa</p>
              <p className="font-medium">
                {sale.mileage_accounts?.airline_companies?.name || "Balcão"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Financeiro
              </div>
              <PaymentStatusBadge
                status={sale.payment_status || "pending"}
                paidAmount={sale.paid_amount || 0}
                totalAmount={sale.sale_price || 0}
              />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Valor Total</span>
              <span className="font-medium">R$ {sale.sale_price?.toFixed(2) || "0.00"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Já Pago</span>
              <span className="font-medium text-green-600">
                R$ {sale.paid_amount?.toFixed(2) || "0.00"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Restante</span>
              <span className="font-medium text-orange-600">
                R$ {((sale.sale_price || 0) - (sale.paid_amount || 0)).toFixed(2)}
              </span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Custo</span>
              <span className="font-medium">R$ {sale.total_cost?.toFixed(2) || "0.00"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Lucro</span>
              <span className="font-medium text-green-600">
                R$ {sale.profit?.toFixed(2) || "0.00"}
              </span>
            </div>
            {sale.payment_notes && (
              <div className="pt-2">
                <p className="text-sm text-muted-foreground">Observações</p>
                <p className="text-sm">{sale.payment_notes}</p>
              </div>
            )}
            <Button
              className="w-full mt-4"
              onClick={() => setPaymentDialogOpen(true)}
              disabled={sale.payment_status === "paid"}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Registrar Pagamento
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Passagens Emitidas</CardTitle>
          </CardHeader>
          <CardContent>
            {tickets.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma passagem registrada</p>
            ) : (
              <div className="space-y-2">
                {tickets.map((ticket) => (
                  <div key={ticket.id} className="flex justify-between items-center p-2 border rounded">
                    <div>
                      <p className="font-medium">{ticket.passenger_name}</p>
                      <p className="text-sm text-muted-foreground">{ticket.route}</p>
                    </div>
                    <Badge variant={ticket.status === "confirmed" ? "default" : "secondary"}>
                      {ticket.status === "confirmed" ? "Confirmado" : "Pendente"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <PaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        saleId={sale.id}
        totalAmount={sale.sale_price || 0}
        currentPaidAmount={sale.paid_amount || 0}
        onSuccess={fetchSaleDetails}
      />
    </div>
  );
}
