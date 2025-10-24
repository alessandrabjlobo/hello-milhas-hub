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
import { Eye } from "lucide-react";

const salesData = [
  {
    id: "#12345",
    client: "João Silva",
    miles: "50.000",
    value: "R$ 1.450,00",
    date: "24/10/2024",
    status: "completed",
  },
  {
    id: "#12344",
    client: "Maria Santos",
    miles: "75.000",
    value: "R$ 2.175,00",
    date: "23/10/2024",
    status: "pending",
  },
  {
    id: "#12343",
    client: "Pedro Costa",
    miles: "100.000",
    value: "R$ 2.900,00",
    date: "22/10/2024",
    status: "completed",
  },
  {
    id: "#12342",
    client: "Ana Oliveira",
    miles: "30.000",
    value: "R$ 870,00",
    date: "21/10/2024",
    status: "processing",
  },
  {
    id: "#12341",
    client: "Carlos Lima",
    miles: "60.000",
    value: "R$ 1.740,00",
    date: "20/10/2024",
    status: "completed",
  },
];

const statusConfig = {
  completed: { label: "Concluído", variant: "default" as const },
  pending: { label: "Pendente", variant: "secondary" as const },
  processing: { label: "Processando", variant: "outline" as const },
};

export const SalesTable = () => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead>Milhas</TableHead>
          <TableHead>Valor</TableHead>
          <TableHead>Data</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {salesData.map((sale) => (
          <TableRow key={sale.id}>
            <TableCell className="font-medium">{sale.id}</TableCell>
            <TableCell>{sale.client}</TableCell>
            <TableCell>{sale.miles}</TableCell>
            <TableCell className="font-semibold text-primary">{sale.value}</TableCell>
            <TableCell>{sale.date}</TableCell>
            <TableCell>
              <Badge variant={statusConfig[sale.status as keyof typeof statusConfig].variant}>
                {statusConfig[sale.status as keyof typeof statusConfig].label}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <Button variant="ghost" size="icon">
                <Eye className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
