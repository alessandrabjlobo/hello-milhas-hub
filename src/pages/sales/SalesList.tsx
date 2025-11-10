import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PlusCircle, Eye, ShoppingCart, MoreHorizontal } from "lucide-react";
import { useSales } from "@/hooks/useSales";
import { EmptyState } from "@/components/shared/EmptyState";
import { exportToCSV } from "@/lib/csv-export";
import { PaymentStatusBadge } from "@/components/sales/PaymentStatusBadge";
import { EditSaleDialog } from "@/components/sales/EditSaleDialog";
import { DeleteSaleDialog } from "@/components/sales/DeleteSaleDialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function SalesList() {
  const { sales, loading, fetchSales } = useSales();
  const { toast } = useToast();
  const [editingSale, setEditingSale] = useState<typeof sales[0] | null>(null);
  const [deletingSale, setDeletingSale] = useState<typeof sales[0] | null>(null);

  const handleDeleteSale = async () => {
    if (!deletingSale) return;

    try {
      const { error } = await supabase
        .from("sales")
        .delete()
        .eq("id", deletingSale.id);

      if (error) throw error;

      toast({
        title: "Venda excluída",
        description: "A venda foi removida com sucesso.",
      });

      fetchSales();
      setDeletingSale(null);
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleExportCSV = () => {
    const data = sales.map((sale) => ({
      Data: new Date(sale.created_at).toLocaleDateString("pt-BR"),
      Cliente: sale.customer_name || sale.client_name,
      Rota: sale.route_text,
      Passageiros: sale.passengers,
      Milhagem: sale.miles_needed?.toLocaleString('pt-BR') || '0',
      "Valor Total": sale.price_total,
      Status: sale.status === 'pending' ? 'Aguardando' : sale.status === 'completed' ? 'Concluída' : 'Cancelada',
    }));
    exportToCSV(data, `vendas-${new Date().toISOString().split("T")[0]}`);
  };

  const getFlightStatus = (sale: typeof sales[0]) => {
    // Tentar extrair a data do voo de flight_segments ou travel_dates
    let departureDate: Date | null = null;
    
    if (sale.flight_segments && Array.isArray(sale.flight_segments) && sale.flight_segments.length > 0) {
      const firstSegment = sale.flight_segments[0] as { date?: string };
      if (firstSegment.date) {
        departureDate = new Date(firstSegment.date);
      }
    } else if (sale.travel_dates) {
      departureDate = new Date(String(sale.travel_dates));
    }
    
    if (!departureDate || isNaN(departureDate.getTime())) {
      return <Badge variant="secondary">Sem Data</Badge>;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const flightDate = new Date(departureDate);
    flightDate.setHours(0, 0, 0, 0);
    
    if (flightDate < today) {
      return <Badge variant="outline">✓ Já Voado</Badge>;
    } else if (flightDate.getTime() === today.getTime()) {
      return <Badge variant="default">✈️ Voa Hoje</Badge>;
    } else {
      return <Badge variant="secondary">📅 Próximo Voo</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-32" />
          </div>
          <Card className="p-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Todas as Vendas</h1>
            <p className="text-muted-foreground">
              {sales.length} venda(s) registrada(s)
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportCSV} disabled={sales.length === 0}>
              Exportar CSV
            </Button>
            <Link to="/sales/new">
              <Button>
                <PlusCircle className="h-4 w-4 mr-2" />
                Nova Venda
              </Button>
            </Link>
          </div>
        </div>

        <Card>
          {sales.length === 0 ? (
            <EmptyState
              icon={ShoppingCart}
              title="Nenhuma venda registrada"
              description="Crie sua primeira venda para começar a gerenciar suas emissões."
              actionLabel="Nova Venda"
              onAction={() => window.location.href = "/sales/new"}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Passageiros</TableHead>
                  <TableHead>Companhia</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>
                      {new Date(sale.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>{sale.customer_name || sale.client_name}</TableCell>
                    <TableCell>{sale.passengers}</TableCell>
                    <TableCell>
                      {sale.mileage_accounts?.airline_companies?.code || "-"}
                    </TableCell>
                    <TableCell>
                      R$ {(sale.price_total || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <PaymentStatusBadge
                        status={sale.payment_status || "pending"}
                        paidAmount={sale.paid_amount || 0}
                        totalAmount={sale.sale_price || 0}
                      />
                    </TableCell>
                    <TableCell>{getFlightStatus(sale)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" asChild>
                        <Link to={`/sales/${sale.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingSale(sale)}>
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeletingSale(sale)}
                          >
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      <EditSaleDialog
        sale={editingSale}
        open={!!editingSale}
        onOpenChange={(open) => !open && setEditingSale(null)}
        onSuccess={fetchSales}
      />

      <DeleteSaleDialog
        open={!!deletingSale}
        onOpenChange={(open) => !open && setDeletingSale(null)}
        onConfirm={handleDeleteSale}
        customerName={deletingSale?.customer_name || deletingSale?.client_name || ""}
        hasTickets={false}
      />
    </div>
  );
}
