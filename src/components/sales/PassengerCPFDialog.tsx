import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { maskCPF } from "@/lib/input-masks";
import { cn } from "@/lib/utils";

export interface PassengerCPF {
  name: string;
  cpf: string;
}

interface PassengerCPFDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  passengers: PassengerCPF[];
  onSave: (passengers: PassengerCPF[]) => void;
  expectedCount: number;
}

export function PassengerCPFDialog({
  open,
  onOpenChange,
  passengers,
  onSave,
  expectedCount,
}: PassengerCPFDialogProps) {
  const [localPassengers, setLocalPassengers] = useState<PassengerCPF[]>(passengers);
  const { toast } = useToast();

  // Sincronizar com a prop quando o dialog abre
  useEffect(() => {
    setLocalPassengers(passengers);
  }, [open, passengers]);

  const handleAddPassenger = () => {
    setLocalPassengers([...localPassengers, { name: "", cpf: "" }]);
  };

  const handleRemovePassenger = (index: number) => {
    // Não permitir remover o primeiro passageiro (cliente principal)
    if (index === 0) return;
    setLocalPassengers(localPassengers.filter((_, i) => i !== index));
  };

  const handleUpdatePassenger = (index: number, field: keyof PassengerCPF, value: string) => {
    const updated = [...localPassengers];
    updated[index][field] = value;
    setLocalPassengers(updated);
  };

  const validateAndSave = () => {
    if (localPassengers.length !== expectedCount) {
      toast({
        title: "Número incorreto de passageiros",
        description: `É necessário adicionar exatamente ${expectedCount} passageiro(s).`,
        variant: "destructive",
      });
      return;
    }

    const hasEmpty = localPassengers.some((p) => !p.name.trim() || !p.cpf.trim());
    if (hasEmpty) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o nome e CPF de todos os passageiros.",
        variant: "destructive",
      });
      return;
    }

    // Basic CPF format validation
    const hasInvalidCpf = localPassengers.some((p) => {
      const cpf = p.cpf.replace(/\D/g, "");
      return cpf.length !== 11;
    });

    if (hasInvalidCpf) {
      toast({
        title: "CPF inválido",
        description: "Verifique se todos os CPFs possuem 11 dígitos.",
        variant: "destructive",
      });
      return;
    }

    onSave(localPassengers);
    onOpenChange(false);
    toast({
      title: "Passageiros salvos!",
      description: `${localPassengers.length} passageiro(s) adicionado(s).`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            CPFs dos Passageiros
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Adicione {expectedCount} passageiro(s) com nome e CPF
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {localPassengers.map((passenger, index) => (
            <div key={index} className={cn(
              "p-4 border rounded-lg space-y-3",
              index === 0 ? "bg-primary/5 border-primary/20" : "bg-muted/30"
            )}>
              <div className="flex items-center justify-between">
                <Label className="font-semibold">
                  Passageiro {index + 1}
                  {index === 0 && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      (Cliente Principal)
                    </span>
                  )}
                </Label>
                {index > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemovePassenger(index)}
                    className="h-8 w-8 p-0"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor={`name-${index}`}>Nome Completo *</Label>
                  <Input
                    id={`name-${index}`}
                    placeholder="João Silva"
                    value={passenger.name}
                    onChange={(e) => handleUpdatePassenger(index, "name", e.target.value)}
                    disabled={index === 0}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`cpf-${index}`}>CPF *</Label>
                  <Input
                    id={`cpf-${index}`}
                    placeholder="000.000.000-00"
                    value={passenger.cpf}
                    onChange={(e) => {
                      const masked = maskCPF(e.target.value);
                      handleUpdatePassenger(index, "cpf", masked);
                    }}
                    maxLength={14}
                    disabled={index === 0}
                  />
                </div>
              </div>
            </div>
          ))}

          <Button
            variant="outline"
            onClick={handleAddPassenger}
            className="w-full"
            disabled={localPassengers.length >= expectedCount}
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Passageiro
          </Button>

          <div className="text-sm text-muted-foreground text-center">
            {localPassengers.length} de {expectedCount} passageiro(s) adicionado(s)
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={validateAndSave}>Salvar Passageiros</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
