import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlusCircle, Eye, Calendar, MoreHorizontal, Edit, Trash2, Ticket as TicketIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTickets } from "@/hooks/useTickets";
import { EmptyState } from "@/components/shared/EmptyState";
import { RegisterTicketDialog } from "@/components/tickets/RegisterTicketDialog";
import { EditTicketDialog } from "@/components/tickets/EditTicketDialog";
import { DeleteTicketDialog } from "@/components/tickets/DeleteTicketDialog";
import { TicketDetailDialog } from "@/components/tickets/TicketDetailDialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function Tickets() {
  const navigate = useNavigate();
  const { tickets, loading, fetchTickets } = useTickets();
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<typeof tickets[0] | null>(null);
  const [deletingTicket, setDeletingTicket] = useState<typeof tickets[0] | null>(null);
  const [detailTicket, setDetailTicket] = useState<typeof tickets[0] | null>(null);
  const { toast } = useToast();

  const getFlightStatusDot = (ticket: typeof tickets[0]) => {
    if (!ticket.departure_date) {
      return <div className="w-3 h-3 rounded-full bg-muted" title="Sem data" />;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const flightDate = new Date(ticket.departure_date);
    flightDate.setHours(0, 0, 0, 0);
    
    if (flightDate < today) {
      return <div className="w-3 h-3 rounded-full bg-green-500" title="Já voado" />;
    } else if (flightDate.getTime() === today.getTime()) {
      return <div className="w-3 h-3 rounded-full bg-yellow-500" title="Voa hoje" />;
    } else {
      return <div className="w-3 h-3 rounded-full bg-blue-500" title="Próximo voo" />;
    }
  };

  const handleDeleteTicket = async () => {
    if (!deletingTicket) return;

    try {
      const { error } = await supabase
        .from("tickets")
        .delete()
        .eq("id", deletingTicket.id);

      if (error) throw error;

      toast({
        title: "Passagem excluída",
        description: "A passagem foi removida com sucesso.",
      });

      fetchTickets();
      setDeletingTicket(null);
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    }
  };


  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-full" />
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
            <h1 className="text-3xl font-bold">Passagens</h1>
            <p className="text-muted-foreground">
              {tickets.length} passagem(ns) registrada(s)
            </p>
          </div>
          <Button onClick={() => setRegisterDialogOpen(true)}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Registrar Emissão
          </Button>
        </div>

        <Card>
          {tickets.length === 0 ? (
            <EmptyState
              icon={TicketIcon}
              title="Nenhuma passagem registrada"
              description="Registre a primeira emissão de passagem para começar."
              actionLabel="Registrar Emissão"
              onAction={() => setRegisterDialogOpen(true)}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data Emissão</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Data do Voo</TableHead>
                  <TableHead>Companhia</TableHead>
                  <TableHead>Localizador</TableHead>
                  <TableHead>Bilhete</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {ticket.issued_at
                          ? new Date(ticket.issued_at).toLocaleDateString("pt-BR")
                          : "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">
                        {ticket.sales?.customer_name || "-"}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {ticket.departure_date
                          ? new Date(ticket.departure_date).toLocaleDateString("pt-BR")
                          : "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {ticket.sales?.mileage_accounts?.airline_companies?.code || "-"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {ticket.pnr || "-"}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {ticket.ticket_number || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center">
                        {getFlightStatusDot(ticket)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setDetailTicket(ticket)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditingTicket(ticket)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeletingTicket(ticket)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
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
          {tickets.length > 0 && (
            <div className="border-t px-6 py-4">
              <p className="text-sm font-medium text-muted-foreground mb-3">
                Legenda de Status:
              </p>
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm text-muted-foreground">Já voado</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span className="text-sm text-muted-foreground">Voa hoje</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-sm text-muted-foreground">Próximo voo</span>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      <RegisterTicketDialog
        open={registerDialogOpen}
        onOpenChange={setRegisterDialogOpen}
      />

      <EditTicketDialog
        ticket={editingTicket}
        open={!!editingTicket}
        onOpenChange={(open) => !open && setEditingTicket(null)}
        onSuccess={fetchTickets}
      />

      <DeleteTicketDialog
        open={!!deletingTicket}
        onOpenChange={(open) => !open && setDeletingTicket(null)}
        onConfirm={handleDeleteTicket}
        ticketInfo={deletingTicket?.passenger_name || ""}
      />

      <TicketDetailDialog
        ticket={detailTicket}
        open={!!detailTicket}
        onOpenChange={(open) => !open && setDetailTicket(null)}
      />
    </div>
  );
}
