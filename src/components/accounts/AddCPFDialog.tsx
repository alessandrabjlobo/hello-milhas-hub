import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { maskCPF } from "@/lib/input-masks";

interface AddCPFDialogProps {
  accountId: string;
  airlineCompanyId: string;
  onSuccess: () => void;
}

export function AddCPFDialog({ accountId, airlineCompanyId, onSuccess }: AddCPFDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [cpf, setCpf] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!fullName || !cpf) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o nome completo e CPF.",
        variant: "destructive",
      });
      return;
    }

    const cleanCpf = cpf.replace(/\D/g, "");
    if (cleanCpf.length !== 11) {
      toast({
        title: "CPF inválido",
        description: "O CPF deve conter 11 dígitos.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("cpf_registry").insert({
        airline_company_id: airlineCompanyId,
        full_name: fullName,
        cpf_encrypted: cleanCpf,
        user_id: user.id,
        status: "available",
        usage_count: 0,
      });

      if (error) throw error;

      toast({
        title: "CPF cadastrado!",
        description: "CPF adicionado com sucesso ao registro.",
      });

      setFullName("");
      setCpf("");
      setOpen(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Erro ao cadastrar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="h-4 w-4 mr-2" />
          Adicionar CPF
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar CPF ao Registro</DialogTitle>
          <DialogDescription>
            Cadastre um novo CPF para esta conta. Ele será usado automaticamente em vendas futuras.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full-name">Nome Completo</Label>
            <Input
              id="full-name"
              placeholder="João Silva"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cpf">CPF</Label>
            <Input
              id="cpf"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={(e) => setCpf(maskCPF(e.target.value))}
              maxLength={14}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
