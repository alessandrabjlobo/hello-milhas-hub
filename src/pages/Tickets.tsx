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
import { PlusCircle, Ticket as TicketIcon, FileText, Calendar, MoreHorizontal, Edit, Trash2 } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function Tickets() {
  const navigate = useNavigate();
  const { tickets, loading, fetchTickets } = useTickets();
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<typeof tickets[0] | null>(null);
  const [deletingTicket, setDeletingTicket] = useState<typeof tickets[0] | null>(null);
  const { toast } = useToast();

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pending: "secondary",
      confirmed: "default",
      cancelled: "destructive",
    };

    const labels: Record<string, string> = {
      pending: "Pendente",
      confirmed: "Confirmado",
      cancelled: "Cancelado",
    };

    return (
      <Badge variant={variants[status] || "default"}>
        {labels[status] || status}
      </Badge>
    );
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

  const getVerificationBadge = (status: string | null) => {
    if (!status) return <Badge variant="secondary">-</Badge>;
    
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      pending: "secondary",
      requested: "outline",
      received: "default",
      completed: "default",
    };
    
    const labels: Record<string, string> = {
      pending: "Pendente",
      requested: "Solicitado",
      received: "Recebido",
      completed: "Completo",
    };

    return (
      <Badge variant={variants[status] || "secondary"}>
        {labels[status] || status}
      </Badge>
    );
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
                  <TableHead>Rota</TableHead>
                  <TableHead>Companhia</TableHead>
                  <TableHead>PNR</TableHead>
                  <TableHead>Bilhete</TableHead>
                  <TableHead>Verificação</TableHead>
                  <TableHead>Status</TableHead>
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
                      <div>
                        <p className="font-medium">
                          {ticket.sales?.customer_name || "-"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {ticket.sales?.route_text || ticket.route}
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
                    <TableCell>{getVerificationBadge(ticket.verification_status)}</TableCell>
                    <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
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
    </div>
  );
}
