import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

type Sale = Database["public"]["Tables"]["sales"]["Row"];

interface EditSaleDialogProps {
  sale: Sale | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditSaleDialog({
  sale,
  open,
  onOpenChange,
  onSuccess,
}: EditSaleDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    customer_name: "",
    customer_phone: "",
    customer_cpf: "",
    status: "pending" as "pending" | "completed" | "cancelled",
    payment_status: "pending" as "pending" | "partial" | "paid" | "overdue" | "refunded",
    sale_price: "",
    payment_method: "",
    notes: "",
  });

  useEffect(() => {
    if (sale) {
      setFormData({
        customer_name: sale.customer_name || "",
        customer_phone: sale.customer_phone || "",
        customer_cpf: sale.customer_cpf || "",
        status: sale.status || "pending",
        payment_status: (sale.payment_status as any) || "pending",
        sale_price: sale.sale_price?.toString() || "",
        payment_method: sale.payment_method || "",
        notes: sale.notes || "",
      });
    }
  }, [sale]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sale) return;

    try {
      const { error } = await supabase
        .from("sales")
        .update({
          customer_name: formData.customer_name,
          customer_phone: formData.customer_phone || null,
          customer_cpf: formData.customer_cpf || null,
          status: formData.status,
          payment_status: formData.payment_status,
          sale_price: parseFloat(formData.sale_price) || 0,
          payment_method: formData.payment_method || null,
          notes: formData.notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sale.id);

      if (error) throw error;

      toast({
        title: "Venda atualizada",
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Venda</DialogTitle>
          <DialogDescription>
            Atualize os dados da venda selecionada
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customer_name">Nome do Cliente *</Label>
            <Input
              id="customer_name"
              value={formData.customer_name}
              onChange={(e) => setFormData((f) => ({ ...f, customer_name: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customer_phone">Telefone</Label>
              <Input
                id="customer_phone"
                value={formData.customer_phone}
                onChange={(e) => setFormData((f) => ({ ...f, customer_phone: e.target.value }))}
                placeholder="(00) 00000-0000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer_cpf">CPF</Label>
              <Input
                id="customer_cpf"
                value={formData.customer_cpf}
                onChange={(e) => setFormData((f) => ({ ...f, customer_cpf: e.target.value }))}
                placeholder="000.000.000-00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status da Venda</Label>
              <Select
                value={formData.status}
                onValueChange={(value: any) => setFormData((f) => ({ ...f, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="completed">Concluída</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_status">Status de Pagamento</Label>
              <Select
                value={formData.payment_status}
                onValueChange={(value: any) => setFormData((f) => ({ ...f, payment_status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="partial">Parcial</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="overdue">Atrasado</SelectItem>
                  <SelectItem value="refunded">Reembolsado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sale_price">Valor da Venda (R$)</Label>
              <Input
                id="sale_price"
                type="number"
                step="0.01"
                value={formData.sale_price}
                onChange={(e) => setFormData((f) => ({ ...f, sale_price: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_method">Forma de Pagamento</Label>
              <Input
                id="payment_method"
                value={formData.payment_method}
                onChange={(e) => setFormData((f) => ({ ...f, payment_method: e.target.value }))}
                placeholder="Ex: PIX, Cartão"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Observações adicionais sobre a venda"
              rows={3}
            />
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
