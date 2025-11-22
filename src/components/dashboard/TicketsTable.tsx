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
import type { Ticket } from "@/hooks/useTickets";

// Configuração dos textos de status
const statusConfig = {
  confirmed: { label: "Confirmado", variant: "default" as const },
  pending: { label: "Pendente", variant: "secondary" as const },
  processing: { label: "Processando", variant: "outline" as const },
};

// Helper para formatar a data do voo
const getFlightDate = (ticket: Ticket): string | null => {
  const raw =
    (ticket as any).flight_date ||
    (ticket as any).travel_date ||
    (ticket as any).departure_date ||
    null;

  if (!raw) return null;

  const d = new Date(raw as string);
  if (isNaN(d.getTime())) return String(raw);
  return d.toLocaleDateString("pt-BR");
};

// Helper para pegar nome do passageiro/cliente
const getPassengerName = (ticket: Ticket): string | null => {
  if (ticket.passenger_name) return ticket.passenger_name;
  if (ticket.sales?.customer_name) return ticket.sales.customer_name;
  return null;
};

// Helper para pegar companhia / programa
const getAirlineOrProgram = (ticket: Ticket): string | null => {
  const fromTicket =
    (ticket as any).airline ||
    (ticket as any).airline_name ||
    (ticket as any).company ||
    null;

  if (fromTicket && fromTicket !== "N/A") return fromTicket;

  const airline = ticket.sales?.mileage_accounts?.airline_companies;
  if (airline) return airline.name || airline.code || null;

  return null;
};

// Helper para pegar localizador e bilhete
const getLocator = (ticket: Ticket): string | null =>
  (ticket as any).locator ||
  (ticket as any).pnr ||
  (ticket as any).booking_code ||
  null;

const getTicketNumber = (ticket: Ticket): string | null =>
  (ticket as any).ticket_number ||
  (ticket as any).ticket ||
  (ticket as any).bilhete ||
  null;

interface TicketsTableProps {
  tickets: Ticket[];
  loading?: boolean;
}

export const TicketsTable = ({ tickets, loading }: TicketsTableProps) => {
  if (loading) {
    return <p className="text-sm text-muted-foreground">Carregando passagens...</p>;
  }

  if (!tickets.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhuma passagem registrada até o momento.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Data Emissão</TableHead>
          <TableHead>Cliente / Passageiro</TableHead>
          <TableHead>Data do Voo</TableHead>
          <TableHead>Companhia</TableHead>
          <TableHead>Localizador</TableHead>
          <TableHead>Bilhete</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {tickets.map((ticket) => {
          const emissionDate = ticket.created_at
            ? new Date(ticket.created_at).toLocaleDateString("pt-BR")
            : null;

          const passengerName = getPassengerName(ticket);
          const flightDate = getFlightDate(ticket);
          const airline = getAirlineOrProgram(ticket);
          const locator = getLocator(ticket);
          const ticketNumber = getTicketNumber(ticket);

          const statusKey =
            (ticket.status as keyof typeof statusConfig) || "pending";
          const status = statusConfig[statusKey] || statusConfig.pending;

          return (
            <TableRow key={ticket.id}>
              {/* Data de emissão */}
              <TableCell>
                {emissionDate ?? (
                  <span className="text-amber-600 text-xs font-medium">
                    ⚠ Informe a data de emissão
                  </span>
                )}
              </TableCell>

              {/* Cliente / Passageiro */}
              <TableCell>
                {passengerName ?? (
                  <span className="text-amber-600 text-xs font-medium">
                    ⚠ Informe o nome do passageiro
                  </span>
                )}
              </TableCell>

              {/* Data do voo */}
              <TableCell>
                {flightDate ?? (
                  <span className="text-amber-600 text-xs font-medium">
                    ⚠ Informe a data do voo
                  </span>
                )}
              </TableCell>

              {/* Companhia */}
              <TableCell>
                {airline ?? (
                  <span className="text-amber-600 text-xs font-medium">
                    ⚠ Informe a companhia / programa
                  </span>
                )}
              </TableCell>

              {/* Localizador */}
              <TableCell>
                {locator ?? (
                  <span className="text-amber-600 text-xs font-medium">
                    ⚠ Informe o localizador
                  </span>
                )}
              </TableCell>

              {/* Bilhete */}
              <TableCell>
                {ticketNumber ?? (
                  <span className="text-amber-600 text-xs font-medium">
                    ⚠ Informe o número do bilhete
                  </span>
                )}
              </TableCell>

              {/* Status */}
              <TableCell>
                <Badge variant={status.variant}>{status.label}</Badge>
              </TableCell>

              {/* Ações */}
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" title="Baixar / visualizar">
                  <Download className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};
