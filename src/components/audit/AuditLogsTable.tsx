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
import { AuditLog } from "@/hooks/useAuditLogs";

interface AuditLogsTableProps {
  logs: AuditLog[];
  loading: boolean;
}

export const AuditLogsTable = ({ logs, loading }: AuditLogsTableProps) => {
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed rounded-lg">
        <p className="text-muted-foreground">Nenhum histórico de alterações.</p>
      </div>
    );
  }

  const getActionBadge = (action: string) => {
    switch (action) {
      case "insert":
        return <Badge variant="default">Criação</Badge>;
      case "update":
        return <Badge variant="secondary">Atualização</Badge>;
      case "delete":
        return <Badge variant="destructive">Exclusão</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Data/Hora</TableHead>
          <TableHead>Ação</TableHead>
          <TableHead>Tabela</TableHead>
          <TableHead>Detalhes</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs.map((log) => (
          <TableRow key={log.id}>
            <TableCell>
              {new Date(log.changed_at).toLocaleString("pt-BR")}
            </TableCell>
            <TableCell>{getActionBadge(log.action)}</TableCell>
            <TableCell className="font-mono text-sm">
              {log.table_name}
            </TableCell>
            <TableCell>
              <details className="cursor-pointer">
                <summary className="text-sm text-muted-foreground hover:text-foreground">
                  Ver alterações
                </summary>
                <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-40">
                  {JSON.stringify(log.diff, null, 2)}
                </pre>
              </details>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
