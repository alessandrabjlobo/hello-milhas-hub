import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { usePaymentTransactions } from "@/hooks/usePaymentTransactions";

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleId: string;
  totalAmount: number;
  currentPaidAmount: number;
  onSuccess: () => void;
}

export const PaymentDialog = ({
  open,
  onOpenChange,
  saleId,
  totalAmount,
  currentPaidAmount,
  onSuccess,
}: PaymentDialogProps) => {
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { createTransaction } = usePaymentTransactions(saleId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const paymentAmount = parseFloat(amount);
      if (isNaN(paymentAmount) || paymentAmount <= 0) {
        toast({
          title: "Valor inválido",
          description: "Por favor, insira um valor válido",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (!paymentMethod) {
        toast({
          title: "Forma de pagamento obrigatória",
          description: "Por favor, selecione uma forma de pagamento",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Create payment transaction
      await createTransaction({
        sale_id: saleId,
        amount: paymentAmount,
        payment_date: new Date(paymentDate).toISOString(),
        payment_method: paymentMethod,
        notes: notes || undefined,
      });

      // Update sale paid_amount and status
      const newPaidAmount = currentPaidAmount + paymentAmount;
      let paymentStatus: "pending" | "partial" | "paid";

      if (newPaidAmount >= totalAmount) {
        paymentStatus = "paid";
      } else if (newPaidAmount > 0) {
        paymentStatus = "partial";
      } else {
        paymentStatus = "pending";
      }

      const { error } = await supabase
        .from("sales")
        .update({
          paid_amount: newPaidAmount,
          payment_status: paymentStatus,
          paid_at: paymentStatus === "paid" ? new Date().toISOString() : undefined,
        })
        .eq("id", saleId);

      if (error) throw error;

      onSuccess();
      onOpenChange(false);
      setAmount("");
      setPaymentMethod("");
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setNotes("");
    } catch (error: any) {
      toast({
        title: "Erro ao registrar pagamento",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const remainingAmount = totalAmount - currentPaidAmount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
            <DialogDescription>
              Valor total: R$ {totalAmount.toFixed(2)} | Já pago: R$ {currentPaidAmount.toFixed(2)} | Restante: R$ {remainingAmount.toFixed(2)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Valor Recebido *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentDate">Data do Pagamento *</Label>
                <Input
                  id="paymentDate"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Forma de Pagamento *</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a forma de pagamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                  <SelectItem value="Cartão de Débito">Cartão de Débito</SelectItem>
                  <SelectItem value="Boleto">Boleto</SelectItem>
                  <SelectItem value="Transferência">Transferência Bancária</SelectItem>
                  <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                placeholder="Comprovante, número da transação, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Registrando..." : "Registrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
