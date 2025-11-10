import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileText } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Json = Database["public"]["Tables"]["tickets"]["Row"]["attachments"];

interface Ticket {
  id: string;
  ticket_code: string;
  passenger_name: string;
  passenger_cpf_encrypted: string;
  route: string;
  airline: string;
  departure_date: string;
  return_date: string | null;
  pnr: string | null;
  ticket_number: string | null;
  issued_at: string | null;
  verification_status: string | null;
  status: string;
  attachments: Json;
}

interface TicketDetailDialogProps {
  ticket: Ticket | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TicketDetailDialog({
  ticket,
  open,
  onOpenChange,
}: TicketDetailDialogProps) {
  if (!ticket) return null;

  const formatDate = (date: string | null) => {
    if (!date) return "Não informado";
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes da Passagem #{ticket.ticket_code}</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4">
          <div>
            <Label className="text-muted-foreground">Passageiro</Label>
            <p className="font-medium text-lg">{ticket.passenger_name}</p>
            <p className="text-sm text-muted-foreground">CPF: ***.***.***-{ticket.passenger_cpf_encrypted.slice(-2)}</p>
          </div>
          
          <Separator />
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Rota</Label>
              <p className="font-medium">{ticket.route}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Companhia</Label>
              <p className="font-medium">{ticket.airline}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Data de Partida</Label>
              <p className="font-medium">{formatDate(ticket.departure_date)}</p>
            </div>
            {ticket.return_date && (
              <div>
                <Label className="text-muted-foreground">Data de Retorno</Label>
                <p className="font-medium">{formatDate(ticket.return_date)}</p>
              </div>
            )}
          </div>
          
          <Separator />
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Localizador (PNR)</Label>
              <p className="font-mono font-medium">{ticket.pnr || "Não informado"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Número do Bilhete</Label>
              <p className="font-mono font-medium">{ticket.ticket_number || "Não informado"}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-muted-foreground">Data de Emissão</Label>
              <p className="font-medium">{ticket.issued_at ? formatDate(ticket.issued_at) : "Não emitido"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Status</Label>
              <div className="mt-1">{getStatusBadge(ticket.status)}</div>
            </div>
            <div>
              <Label className="text-muted-foreground">Verificação</Label>
              <div className="mt-1">{getVerificationBadge(ticket.verification_status)}</div>
            </div>
          </div>
          
          {ticket.attachments && Array.isArray(ticket.attachments) && ticket.attachments.length > 0 && (
            <>
              <Separator />
              <div>
                <Label className="text-muted-foreground">Anexos</Label>
                <div className="space-y-2 mt-2">
                  {ticket.attachments.map((att: any, idx: number) => (
                    <a
                      key={idx}
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <FileText className="h-4 w-4" />
                      {att.name || `Anexo ${idx + 1}`}
                    </a>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
