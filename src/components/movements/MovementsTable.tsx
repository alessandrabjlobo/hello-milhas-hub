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
import { TrendingUp, TrendingDown } from "lucide-react";
import { Movement } from "@/hooks/useMovements";

interface MovementsTableProps {
  movements: Movement[];
  loading: boolean;
}

export const MovementsTable = ({ movements, loading }: MovementsTableProps) => {
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (movements.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed rounded-lg">
        <p className="text-muted-foreground">Nenhuma movimentação registrada.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Data/Hora</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead className="text-right">Quantidade</TableHead>
          <TableHead>Observação</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {movements.map((movement) => (
          <TableRow key={movement.id}>
            <TableCell>
              {new Date(movement.created_at).toLocaleString("pt-BR")}
            </TableCell>
            <TableCell>
              {movement.type === "credit" ? (
                <Badge variant="default" className="gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Crédito
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1">
                  <TrendingDown className="h-3 w-3" />
                  Débito
                </Badge>
              )}
            </TableCell>
            <TableCell className="text-right font-semibold">
              {movement.type === "credit" ? "+" : "-"}
              {Number(movement.amount).toLocaleString("pt-BR")}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {movement.note || "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
