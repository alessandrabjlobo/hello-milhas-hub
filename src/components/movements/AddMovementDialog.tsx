import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Plus } from "lucide-react";
import { useMovements } from "@/hooks/useMovements";
import { supabase } from "@/integrations/supabase/client";

interface AddMovementDialogProps {
  accountId: string;
  onMovementAdded: () => void;
}

export const AddMovementDialog = ({ accountId, onMovementAdded }: AddMovementDialogProps) => {
  const [open, setOpen] = useState(false);
  const { createMovement } = useMovements(accountId);
  const [formData, setFormData] = useState({
    type: "credit" as "credit" | "debit",
    amount: "",
    note: "",
    cost: "", // FASE 3: Campo de custo
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // FASE 3: Atualizar custo médio se fornecido
    if (formData.type === 'credit' && formData.cost) {
      try {
        const { data: account } = await supabase
          .from('mileage_accounts')
          .select('balance, cost_per_mile')
          .eq('id', accountId)
          .single();
        
        if (account) {
          const currentTotalCost = account.balance * account.cost_per_mile;
          const newMiles = parseInt(formData.amount);
          const costPerThousand = parseFloat(formData.cost);
          const newCost = (newMiles / 1000) * costPerThousand; // Calcular custo total a partir do milheiro
          const newBalance = account.balance + newMiles;
          const newAvgCost = (currentTotalCost + newCost) / newBalance;
          
          await supabase
            .from('mileage_accounts')
            .update({ cost_per_mile: newAvgCost })
            .eq('id', accountId);
        }
      } catch (error) {
        console.error('Failed to update average cost:', error);
      }
    }
    
    const success = await createMovement({
      account_id: accountId,
      type: formData.type,
      amount: parseInt(formData.amount),
      note: formData.note || undefined,
    });

    if (success) {
      setFormData({ type: "credit", amount: "", note: "", cost: "" });
      setOpen(false);
      onMovementAdded();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nova Movimentação
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Movimentação</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type">Tipo</Label>
            <Select
              value={formData.type}
              onValueChange={(value: "credit" | "debit") =>
                setFormData({ ...formData, type: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="credit">Crédito (+)</SelectItem>
                <SelectItem value="debit">Débito (-)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Quantidade (milhas)</Label>
            <Input
              id="amount"
              type="number"
              min="1"
              required
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="Ex: 10000"
            />
          </div>

          {/* FASE 3: Campo de custo do milheiro para crédito */}
          {formData.type === "credit" && (
            <div className="space-y-2">
              <Label htmlFor="cost">Custo do Milheiro (R$/mil)</Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                min="0"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                placeholder="Ex: 45.00"
              />
              {formData.amount && formData.cost && (
                <p className="text-xs text-muted-foreground">
                  Custo total: R$ {((parseInt(formData.amount) / 1000) * parseFloat(formData.cost)).toFixed(2)} • 
                  Custo/milha: R$ {(parseFloat(formData.cost) / 1000).toFixed(4)}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="note">Observação (opcional)</Label>
            <Textarea
              id="note"
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              placeholder="Descreva o motivo da movimentação..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1">
              Criar Movimentação
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
