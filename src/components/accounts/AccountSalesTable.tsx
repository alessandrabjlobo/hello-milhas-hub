import { useNavigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PaymentStatusBadge } from "@/components/sales/PaymentStatusBadge";
import { Eye } from "lucide-react";
import { useAccountSales } from "@/hooks/useAccountSales";
import { Skeleton } from "@/components/ui/skeleton";

interface AccountSalesTableProps {
  accountId: string;
}

export const AccountSalesTable = ({ accountId }: AccountSalesTableProps) => {
  const navigate = useNavigate();
  const { sales, loading } = useAccountSales(accountId);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (sales.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Nenhuma venda registrada para esta conta ainda.</p>
      </div>
    );
  }

  const totalMilesUsed = sales.reduce((sum, sale) => sum + Number(sale.miles_used || 0), 0);
  const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.sale_price || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Total de Vendas</p>
          <p className="text-2xl font-bold">{sales.length}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Milhas Utilizadas</p>
          <p className="text-2xl font-bold">{totalMilesUsed.toLocaleString("pt-BR")}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Receita Total</p>
          <p className="text-2xl font-bold text-green-600">R$ {totalRevenue.toFixed(2)}</p>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Rota</TableHead>
              <TableHead className="text-right">Milhas</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Status Pgto</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales.map((sale) => (
              <TableRow key={sale.id}>
                <TableCell className="font-medium">
                  {new Date(sale.created_at).toLocaleDateString("pt-BR")}
                </TableCell>
                <TableCell>{sale.client_name}</TableCell>
                <TableCell className="max-w-xs truncate">{sale.route_text || "N/A"}</TableCell>
                <TableCell className="text-right">
                  {Number(sale.miles_used || 0).toLocaleString("pt-BR")}
                </TableCell>
                <TableCell className="text-right font-medium">
                  R$ {Number(sale.sale_price || 0).toFixed(2)}
                </TableCell>
                <TableCell>
                  <PaymentStatusBadge status={sale.payment_status} />
                </TableCell>
                <TableCell>
                  <Badge variant={sale.status === "completed" ? "default" : "secondary"}>
                    {sale.status === "completed" ? "Concluída" : "Pendente"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/sales/${sale.id}`)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
