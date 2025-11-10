import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Edit, Trash2, GripVertical, CreditCard, Smartphone, Banknote, Building2, DollarSign } from "lucide-react";
import { usePaymentMethods, PaymentMethod } from "@/hooks/usePaymentMethods";
import { Skeleton } from "@/components/ui/skeleton";

interface PaymentMethodsListProps {
  onEdit: (method: PaymentMethod) => void;
  onDelete: (method: PaymentMethod) => void;
}

const getMethodIcon = (type: string) => {
  switch (type) {
    case "pix": return <Smartphone className="h-5 w-5" />;
    case "credit":
    case "debit": return <CreditCard className="h-5 w-5" />;
    case "boleto": return <Banknote className="h-5 w-5" />;
    case "transfer": return <Building2 className="h-5 w-5" />;
    case "cash": return <DollarSign className="h-5 w-5" />;
    default: return <CreditCard className="h-5 w-5" />;
  }
};

const getMethodTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    pix: "PIX",
    credit: "Cartão de Crédito",
    debit: "Cartão de Débito",
    boleto: "Boleto",
    transfer: "Transferência",
    cash: "Dinheiro",
  };
  return labels[type] || type;
};

export const PaymentMethodsList = ({ onEdit, onDelete }: PaymentMethodsListProps) => {
  const { methods, loading, updateMethod } = usePaymentMethods();

  const handleToggleActive = async (method: PaymentMethod) => {
    await updateMethod(method.id, { is_active: !method.is_active });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (methods.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center">
            Nenhuma forma de pagamento configurada ainda.
            <br />
            Adicione sua primeira forma de pagamento acima.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {methods.map((method) => (
        <Card key={method.id} className={!method.is_active ? "opacity-60" : ""}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary">
                  {getMethodIcon(method.method_type)}
                </div>
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {method.method_name}
                    {method.is_active && <Badge variant="default">Ativa</Badge>}
                    {!method.is_active && <Badge variant="secondary">Inativa</Badge>}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {getMethodTypeLabel(method.method_type)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={method.is_active}
                  onCheckedChange={() => handleToggleActive(method)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {method.description && (
                <p className="text-sm text-muted-foreground">{method.description}</p>
              )}

              {method.method_type === "pix" && method.additional_info?.pix_key && (
                <div className="rounded-lg bg-muted p-3 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Chave PIX</p>
                  <p className="text-sm font-mono">{method.additional_info.pix_key}</p>
                  {method.additional_info.pix_holder && (
                    <>
                      <p className="text-xs font-medium text-muted-foreground mt-2">Titular</p>
                      <p className="text-sm">{method.additional_info.pix_holder}</p>
                    </>
                  )}
                </div>
              )}

              {(method.method_type === "boleto" || method.method_type === "transfer") && 
               method.additional_info?.bank_name && (
                <div className="rounded-lg bg-muted p-3 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Dados Bancários</p>
                  <p className="text-sm">{method.additional_info.bank_name}</p>
                  <p className="text-sm font-mono">
                    Ag: {method.additional_info.bank_agency} | Conta: {method.additional_info.bank_account}
                  </p>
                  {method.additional_info.bank_holder && (
                    <p className="text-sm">Titular: {method.additional_info.bank_holder}</p>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(method)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(method)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
