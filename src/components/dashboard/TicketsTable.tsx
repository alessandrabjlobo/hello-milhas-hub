import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

const ticketsData = [
  {
    id: "1",
    code: "TAM123456",
    client: "João Silva",
    route: "GRU → MIA",
    date: "15/11/2024",
    status: "confirmed",
  },
  {
    id: "2",
    code: "GLO789012",
    client: "Maria Santos",
    route: "SDU → BSB",
    date: "20/11/2024",
    status: "confirmed",
  },
  {
    id: "3",
    code: "AZU345678",
    client: "Pedro Costa",
    route: "GRU → NYC",
    date: "25/11/2024",
    status: "pending",
  },
  {
    id: "4",
    code: "TAM901234",
    client: "Ana Oliveira",
    route: "GIG → LIS",
    date: "30/11/2024",
    status: "confirmed",
  },
  {
    id: "5",
    code: "GLO567890",
    client: "Carlos Lima",
    route: "CGH → SSA",
    date: "05/12/2024",
    status: "processing",
  },
];

const statusConfig = {
  confirmed: { label: "Confirmado", variant: "default" as const },
  pending: { label: "Pendente", variant: "secondary" as const },
  processing: { label: "Processando", variant: "outline" as const },
};

export const TicketsTable = () => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Código</TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead>Rota</TableHead>
          <TableHead>Data do Voo</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ticketsData.map((ticket) => (
          <TableRow key={ticket.id}>
            <TableCell className="font-medium">{ticket.code}</TableCell>
            <TableCell>{ticket.client}</TableCell>
            <TableCell>{ticket.route}</TableCell>
            <TableCell>{ticket.date}</TableCell>
            <TableCell>
              <Badge variant={statusConfig[ticket.status as keyof typeof statusConfig].variant}>
                {statusConfig[ticket.status as keyof typeof statusConfig].label}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <Button variant="ghost" size="icon">
                <Download className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
