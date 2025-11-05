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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PlusCircle, Eye, ShoppingCart } from "lucide-react";
import { useSales } from "@/hooks/useSales";
import { EmptyState } from "@/components/shared/EmptyState";
import { exportToCSV } from "@/lib/csv-export";

export default function SalesList() {
  const { sales, loading } = useSales();

  const handleExportCSV = () => {
    const data = sales.map((sale) => ({
      Data: new Date(sale.created_at).toLocaleDateString("pt-BR"),
      Cliente: sale.customer_name || sale.client_name,
      Rota: sale.route_text,
      Passageiros: sale.passengers,
      Milhagem: sale.miles_needed,
      "Valor Total": sale.price_total,
      Status: sale.status,
    }));
    exportToCSV(data, `vendas-${new Date().toISOString().split("T")[0]}`);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pending: "secondary",
      completed: "default",
      cancelled: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
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
                  <TableHead>Rota</TableHead>
                  <TableHead>Passageiros</TableHead>
                  <TableHead>Companhia</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>
                      {new Date(sale.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>{sale.customer_name || sale.client_name}</TableCell>
                    <TableCell>{sale.route_text}</TableCell>
                    <TableCell>{sale.passengers}</TableCell>
                    <TableCell>
                      {sale.mileage_accounts?.airline_companies?.code || "-"}
                    </TableCell>
                    <TableCell>
                      R$ {(sale.price_total || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>{getStatusBadge(sale.status)}</TableCell>
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
          )}
        </Card>
      </div>
    </div>
  );
}
