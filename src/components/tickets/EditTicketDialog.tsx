import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Ticket = Database["public"]["Tables"]["tickets"]["Row"];

interface EditTicketDialogProps {
  ticket: Ticket | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditTicketDialog({
  ticket,
  open,
  onOpenChange,
  onSuccess,
}: EditTicketDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    pnr: "",
    ticket_number: "",
    issued_at: "",
    status: "pending" as "pending" | "confirmed" | "cancelled",
  });

  useEffect(() => {
    if (ticket) {
      setFormData({
        pnr: ticket.pnr || "",
        ticket_number: ticket.ticket_number || "",
        issued_at: ticket.issued_at ? new Date(ticket.issued_at).toISOString().slice(0, 16) : "",
        status: ticket.status || "pending",
      });
    }
  }, [ticket]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket) return;

    try {
      const { error } = await supabase
        .from("tickets")
        .update({
          pnr: formData.pnr || null,
          ticket_number: formData.ticket_number || null,
          issued_at: formData.issued_at ? new Date(formData.issued_at).toISOString() : null,
          status: formData.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ticket.id);

      if (error) throw error;

      toast({
        title: "Passagem atualizada",
        description: "As alterações foram salvas com sucesso.",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Passagem</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pnr">PNR / Localizador</Label>
            <Input
              id="pnr"
              value={formData.pnr}
              onChange={(e) => setFormData((f) => ({ ...f, pnr: e.target.value.toUpperCase() }))}
              placeholder="Ex: ABC123"
              maxLength={6}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ticket_number">Número do Bilhete</Label>
            <Input
              id="ticket_number"
              value={formData.ticket_number}
              onChange={(e) => setFormData((f) => ({ ...f, ticket_number: e.target.value }))}
              placeholder="Ex: 123-4567890123"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="issued_at">Data de Emissão</Label>
            <Input
              id="issued_at"
              type="datetime-local"
              value={formData.issued_at}
              onChange={(e) => setFormData((f) => ({ ...f, issued_at: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value: any) => setFormData((f) => ({ ...f, status: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="confirmed">Confirmado</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1">
              Salvar Alterações
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
