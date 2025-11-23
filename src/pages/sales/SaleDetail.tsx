import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Plane,
  User,
  CreditCard,
  DollarSign,
  MoreVertical,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PaymentDialog } from "@/components/sales/PaymentDialog";
import { PaymentStatusBadge } from "@/components/sales/PaymentStatusBadge";
import { PaymentTimeline } from "@/components/sales/PaymentTimeline";
import { EditSaleDialog } from "@/components/sales/EditSaleDialog";
import { DeleteSaleDialog } from "@/components/sales/DeleteSaleDialog";
import type { Database } from "@/integrations/supabase/types";
import { formatMiles } from "@/lib/utils";

type Sale = Database["public"]["Tables"]["sales"]["Row"] & {
  mileage_accounts?: {
    airline_companies: {
      name: string;
      code: string;
    } | null;
  } | null;
};

type Ticket = Database["public"]["Tables"]["tickets"]["Row"];

// ✅ Helper de data sem bug de fuso
const formatDate = (date?: string | null) => {
  if (!date) return "Data não informada";

  if (typeof date === "string") {
    const raw = date.trim();
    if (!raw) return "Data não informada";

    // Já está em BR
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return raw;

    // ISO: "YYYY-MM-DD" ou "YYYY-MM-DDTHH:MM:SS..."
    const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const [, y, m, d] = isoMatch;
      return `${d}/${m}/${y}`;
    }
  }

  const d = new Date(date as string);
  if (isNaN(d.getTime())) return String(date);
  return d.toLocaleDateString("pt-BR");
};

export default function SaleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sale, setSale] = useState<Sale | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const getFlightStatus = () => {
    if (!sale) return <Badge variant="secondary">Sem Data</Badge>;

    let departureDate: string | null = null;

    if (
      sale.flight_segments &&
      Array.isArray(sale.flight_segments) &&
      sale.flight_segments.length > 0
    ) {
      const firstSegment = sale.flight_segments[0] as { date?: string };
      if (firstSegment.date) {
        departureDate = firstSegment.date;
      }
    } else if ((sale as any).travel_dates) {
      departureDate = String((sale as any).travel_dates);
    }

    if (!departureDate) {
      return <Badge variant="secondary">Sem Data</Badge>;
    }

    // Usa o mesmo formatter para padronizar
    const raw = departureDate;
    const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    let flightDate: Date;

    if (isoMatch) {
      const [, y, m, d] = isoMatch;
      flightDate = new Date(
        Number(y),
        Number(m) - 1,
        Number(d),
        0,
        0,
        0,
        0
      );
    } else {
      flightDate = new Date(raw);
    }

    if (isNaN(flightDate.getTime())) {
      return <Badge variant="secondary">Sem Data</Badge>;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    flightDate.setHours(0, 0, 0, 0);

    if (flightDate < today) {
      return (
        <Badge className="bg-green-500 text-white hover:bg-green-600">
          ✓ Já Voado
        </Badge>
      );
    } else if (flightDate.getTime() === today.getTime()) {
      return (
        <Badge className="bg-blue-500 text-white hover:bg-blue-600">
          ✈️ Voa Hoje
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-yellow-500 text-black hover:bg-yellow-600">
          📅 Próximo Voo
        </Badge>
      );
    }
  };

  const fetchSaleDetails = async () => {
    if (!id) return;

    try {
      setLoading(true);

      const { data: saleData, error: saleError } = await supabase
        .from("sales")
        .select(
          `
          *,
          mileage_accounts (
            airline_companies (
              name,
              code
            )
          )
        `
        )
        .eq("id", id)
        .single();

      if (saleError) throw saleError;
      setSale(saleData as Sale);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleDeleteSale = async () => {
    if (!sale) return;

    try {
      const { error } = await supabase.from("sales").delete().eq("id", sale.id);

      if (error) throw error;

      toast({
        title: "Venda excluída",
        description: "A venda foi removida com sucesso.",
      });

      navigate("/sales");
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // 🧮 Dados auxiliares para os cards
  const totalPaid = sale.paid_amount || 0;
  const totalPrice = sale.sale_price || sale.price_total || 0;
  const remaining = totalPrice - totalPaid;

  const milesUsed = sale.miles_used || 0;
  const totalCost = sale.total_cost || 0;
  const boardingFee = (sale as any).boarding_fee || 0;
  const profit = sale.profit || sale.margin_value || 0;
  const profitMargin = sale.profit_margin ?? sale.margin_percentage ?? null;

  let costPerThousand: number | null = null;

  if ((sale as any).cost_per_thousand && (sale as any).cost_per_thousand > 0) {
    costPerThousand = (sale as any).cost_per_thousand;
  } else if (milesUsed > 0) {
    const milesCost = totalCost - boardingFee;
    costPerThousand = (milesCost / milesUsed) * 1000;
  }

  let programName = "Balcão";
  if (sale.mileage_accounts?.airline_companies) {
    const ac = sale.mileage_accounts.airline_companies;
    programName = ac.name || ac.code || "Conta interna";
  } else if ((sale as any).counter_airline_program) {
    programName = (sale as any).counter_airline_program as string;
  } else if (sale.sale_source === "bulk_import") {
    programName = "Importação (sem conta)";
  }

  const locator =
    (sale as any).locator ||
    (sale as any).booking_code ||
    (sale as any).localizador ||
    null;

  // ✅ Data do primeiro voo para o card de Viagem
  let firstFlightDate: string | null = null;
  if (
    sale.flight_segments &&
    Array.isArray(sale.flight_segments) &&
    sale.flight_segments.length > 0
  ) {
    const firstSegment = sale.flight_segments[0] as { date?: string };
    if (firstSegment.date) {
      firstFlightDate = firstSegment.date;
    }
  } else if ((sale as any).travel_dates) {
    firstFlightDate = String((sale as any).travel_dates);
  }

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
        <div className="flex items-center gap-2">
          {getFlightStatus()}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                Editar Venda
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                Excluir Venda
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="summary">Resumo</TabsTrigger>
          <TabsTrigger value="payments">Pagamentos</TabsTrigger>
          <TabsTrigger value="tickets">Passagens</TabsTrigger>
        </TabsList>

        {/* RESUMO */}
        <TabsContent value="summary" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
            {/* Cliente */}
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
                  <p className="font-medium">
                    {sale.customer_name || sale.client_name}
                  </p>
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

            {/* Viagem */}
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
                  <p className="text-sm text-muted-foreground">Data do voo</p>
                  <p className="font-medium">
                    {firstFlightDate ? formatDate(firstFlightDate) : "Data não informada"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Passageiros</p>
                  <p className="font-medium">{sale.passengers}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Companhia / Programa
                  </p>
                  <p className="font-medium">{programName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Localizador</p>
                  <p className="font-medium">
                    {locator || "Não informado"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Passagem</p>
                  <p className="font-medium">
                    {tickets.length > 0
                      ? "Passagem registrada"
                      : "Nenhuma passagem registrada"}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Financeiro */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Financeiro
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Custo total
                  </span>
                  <span className="font-medium">
                    R$ {totalCost.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Lucro</span>
                  <span className="font-medium text-green-600">
                    R$ {profit.toFixed(2)}
                  </span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Milhas utilizadas
                  </span>
                  <span className="font-medium">
                    {milesUsed > 0 ? formatMiles(milesUsed) : "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Custo por milheiro
                  </span>
                  <span className="font-medium">
                    {costPerThousand
                      ? `R$ ${costPerThousand.toFixed(2)}`
                      : "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Taxa de embarque
                  </span>
                  <span className="font-medium">
                    R$ {boardingFee.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Margem de lucro
                  </span>
                  <span className="font-medium text-blue-600">
                    {profitMargin !== null
                      ? `${profitMargin.toFixed(1)}%`
                      : "-"}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Pagamento */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Pagamento
                  </div>
                  <PaymentStatusBadge
                    status={sale.payment_status || "pending"}
                    paidAmount={totalPaid}
                    totalAmount={totalPrice}
                  />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Valor total (cliente)
                  </span>
                  <span className="font-medium">
                    R$ {totalPrice.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Já pago</span>
                  <span className="font-medium text-green-600">
                    R$ {totalPaid.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Restante
                  </span>
                  <span className="font-medium text-orange-600">
                    R$ {remaining.toFixed(2)}
                  </span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Forma de pagamento
                  </span>
                  <span className="font-medium">
                    {sale.payment_method || "-"}
                  </span>
                </div>
                <div className="flex justify-end pt-2">
                  <Button
                    onClick={() => setPaymentDialogOpen(true)}
                    disabled={sale.payment_status === "paid"}
                  >
                    Registrar / Ver pagamentos
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* PAGAMENTOS */}
        <TabsContent value="payments" className="space-y-6">
          <div className="flex justify-end mb-4">
            <Button
              onClick={() => setPaymentDialogOpen(true)}
              disabled={sale.payment_status === "paid"}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Registrar Pagamento
            </Button>
          </div>
          <PaymentTimeline saleId={sale.id} totalAmount={totalPrice} />
        </TabsContent>

        {/* PASSAGENS */}
        <TabsContent value="tickets" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Passagens Emitidas</CardTitle>
              <Button
                onClick={() => navigate(`/tickets/new?saleId=${sale.id}`)}
              >
                Emitir passagem
              </Button>
            </CardHeader>
            <CardContent>
              {tickets.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma passagem registrada
                </p>
              ) : (
                <div className="space-y-3">
                  {tickets.map((ticket) => {
                    const passengerName =
                      ticket.passenger_name ||
                      sale.customer_name ||
                      "Passageiro não informado";

                    const ticketRoute =
                      (ticket as any).route ||
                      sale.route_text ||
                      "Rota não informada";

                    const ticketLocator =
                      (ticket as any).locator ||
                      (ticket as any).pnr ||
                      (ticket as any).booking_code ||
                      locator ||
                      "Não informado";

                    const ticketNumber =
                      (ticket as any).ticket_number ||
                      (ticket as any).ticket ||
                      (ticket as any).bilhete ||
                      "Não informado";

                    const flightDateStr =
                      (ticket as any).flight_date ||
                      (ticket as any).travel_date ||
                      (ticket as any).departure_date ||
                      null;

                    return (
                      <div
                        key={ticket.id}
                        className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between p-3 border rounded-md bg-card"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 w-full">
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Passageiro
                            </p>
                            <p className="font-medium">{passengerName}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Rota
                            </p>
                            <p className="font-medium">{ticketRoute}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Data do voo
                            </p>
                            <p className="font-medium">
                              {formatDate(flightDateStr)}
                            </p>
                          </div>
                          <div className="flex flex-col gap-1">
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Localizador
                              </p>
                              <p className="font-medium">{ticketLocator}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Bilhete
                              </p>
                              <p className="font-medium">{ticketNumber}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end md:justify-center mt-2 md:mt-0">
                          <Badge
                            variant={
                              ticket.status === "confirmed"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {ticket.status === "confirmed"
                              ? "Confirmado"
                              : "Pendente"}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <PaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        saleId={sale.id}
        totalAmount={totalPrice}
        currentPaidAmount={totalPaid}
        onSuccess={fetchSaleDetails}
      />

      <EditSaleDialog
        sale={sale}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={fetchSaleDetails}
      />

      <DeleteSaleDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteSale}
        customerName={sale.customer_name || sale.client_name || ""}
        hasTickets={tickets.length > 0}
      />
    </div>
  );
}
