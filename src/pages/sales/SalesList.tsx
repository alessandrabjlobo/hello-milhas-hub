import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { PlusCircle, Eye, ShoppingCart, MoreHorizontal, Filter, X, FileUp } from "lucide-react";
import { useSales } from "@/hooks/useSales";
import { EmptyState } from "@/components/shared/EmptyState";
import { exportToCSV } from "@/lib/csv-export";
import { PaymentStatusBadge } from "@/components/sales/PaymentStatusBadge";
import { EditSaleDialog } from "@/components/sales/EditSaleDialog";
import { DeleteSaleDialog } from "@/components/sales/DeleteSaleDialog";
import { BulkImportDialog } from "@/components/sales/BulkImportDialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function SalesList() {
  const { sales, loading, fetchSales } = useSales();
  const { toast } = useToast();
  const [editingSale, setEditingSale] = useState<typeof sales[0] | null>(null);
  const [deletingSale, setDeletingSale] = useState<typeof sales[0] | null>(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState(() => 
    localStorage.getItem("sales_filter_search") || ""
  );
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState(() => 
    localStorage.getItem("sales_filter_payment_status") || "all"
  );
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(() => 
    localStorage.getItem("sales_filter_payment_method") || "all"
  );
  const [dateFrom, setDateFrom] = useState(() => 
    localStorage.getItem("sales_filter_date_from") || ""
  );
  const [dateTo, setDateTo] = useState(() => 
    localStorage.getItem("sales_filter_date_to") || ""
  );

  // Save filters to localStorage
  useEffect(() => {
    localStorage.setItem("sales_filter_search", searchTerm);
    localStorage.setItem("sales_filter_payment_status", selectedPaymentStatus);
    localStorage.setItem("sales_filter_payment_method", selectedPaymentMethod);
    localStorage.setItem("sales_filter_date_from", dateFrom);
    localStorage.setItem("sales_filter_date_to", dateTo);
  }, [searchTerm, selectedPaymentStatus, selectedPaymentMethod, dateFrom, dateTo]);

  // Apply filters
  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesName = (sale.customer_name || sale.client_name || "").toLowerCase().includes(search);
        const matchesCpf = (sale.customer_cpf || sale.client_cpf_encrypted || "").toLowerCase().includes(search);
        if (!matchesName && !matchesCpf) return false;
      }

      // Payment status filter
      if (selectedPaymentStatus !== "all" && sale.payment_status !== selectedPaymentStatus) {
        return false;
      }

      // Payment method filter
      if (selectedPaymentMethod !== "all") {
        const method = sale.payment_method || "";
        if (selectedPaymentMethod === "pix" && method !== "pix") return false;
        if (selectedPaymentMethod === "credit" && method !== "credit_card") return false;
        if (selectedPaymentMethod === "debit" && method !== "debit_card") return false;
      }

      // Date filters
      if (dateFrom) {
        const saleDate = new Date(sale.created_at);
        const fromDate = new Date(dateFrom);
        if (saleDate < fromDate) return false;
      }

      if (dateTo) {
        const saleDate = new Date(sale.created_at);
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59);
        if (saleDate > toDate) return false;
      }

      return true;
    });
  }, [sales, searchTerm, selectedPaymentStatus, selectedPaymentMethod, dateFrom, dateTo]);

  const hasActiveFilters = searchTerm || selectedPaymentStatus !== "all" || 
    selectedPaymentMethod !== "all" || dateFrom || dateTo;

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedPaymentStatus("all");
    setSelectedPaymentMethod("all");
    setDateFrom("");
    setDateTo("");
  };

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
    const data = filteredSales.map((sale) => ({
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
              {filteredSales.length} de {sales.length} venda(s)
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportCSV} disabled={filteredSales.length === 0}>
              Exportar CSV
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowBulkImport(true)}
            >
              <FileUp className="h-4 w-4 mr-2" />
              Importar Vendas
            </Button>
            <Link to="/sales/new">
              <Button>
                <PlusCircle className="h-4 w-4 mr-2" />
                Nova Venda
              </Button>
            </Link>
          </div>
        </div>

        {/* Filtros */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-4 w-4" />
            <h3 className="font-semibold">Filtros</h3>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-auto">
                <X className="h-4 w-4 mr-2" />
                Limpar Filtros
              </Button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label>Buscar</Label>
              <Input
                placeholder="Cliente, CPF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Label>Status Pagamento</Label>
              <Select value={selectedPaymentStatus} onValueChange={setSelectedPaymentStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="partial">Parcial</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Forma de Pagamento</Label>
              <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="credit">Crédito</SelectItem>
                  <SelectItem value="debit">Débito</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data Início</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <Label>Data Fim</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
        </Card>

        <Card>
          {filteredSales.length === 0 ? (
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
                  <TableHead>% Lucro</TableHead>
                  <TableHead>Forma Pagamento</TableHead>
                  <TableHead>Status Pagamento</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>
                      {new Date(sale.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>{sale.customer_name || sale.client_name}</TableCell>
                    <TableCell>{sale.passengers}</TableCell>
                    <TableCell>
                      {sale.mileage_accounts?.airline_companies?.code || 
                       (sale.sale_source === 'mileage_counter' ? sale.counter_airline_program : '-')}
                    </TableCell>
                    <TableCell>
                      R$ {(sale.price_total || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        (sale.margin_percentage || 0) >= 20 ? "default" : 
                        (sale.margin_percentage || 0) >= 10 ? "secondary" : "destructive"
                      }>
                        {(sale.margin_percentage || 0).toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {sale.payment_method === 'pix' ? '📱 PIX' : 
                         sale.payment_method === 'credit_card' ? '💳 Crédito' : 
                         sale.payment_method === 'debit_card' ? '💳 Débito' : 
                         sale.payment_method || '-'}
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

      <BulkImportDialog
        open={showBulkImport}
        onOpenChange={setShowBulkImport}
        onSuccess={fetchSales}
      />
    </div>
  );
}
