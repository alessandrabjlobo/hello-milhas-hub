import { Badge } from "@/components/ui/badge";

interface PaymentStatusBadgeProps {
  status: string;
  paidAmount?: number;
  totalAmount?: number;
}

export const PaymentStatusBadge = ({ status, paidAmount = 0, totalAmount = 0 }: PaymentStatusBadgeProps) => {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    pending: "secondary",
    partial: "outline",
    paid: "default",
    overdue: "destructive",
    refunded: "outline",
  };

  const labels: Record<string, string> = {
    pending: "Pendente",
    partial: "Parcial",
    paid: "Pago",
    overdue: "Atrasado",
    refunded: "Reembolsado",
  };

  const showAmount = status === "partial" && paidAmount > 0 && totalAmount > 0;

  return (
    <div className="flex flex-col gap-1">
      <Badge variant={variants[status] || "default"}>
        {labels[status] || status}
      </Badge>
      {showAmount && (
        <span className="text-xs text-muted-foreground">
          R$ {paidAmount.toFixed(2)} / R$ {totalAmount.toFixed(2)}
        </span>
      )}
    </div>
  );
};
