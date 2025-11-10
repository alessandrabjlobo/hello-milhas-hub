import { CreditCard, Banknote, Smartphone, Building2, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { usePaymentTransactions } from "@/hooks/usePaymentTransactions";
import { Skeleton } from "@/components/ui/skeleton";

interface PaymentTimelineProps {
  saleId: string;
  totalAmount: number;
}

const getPaymentIcon = (method: string) => {
  const methodLower = method.toLowerCase();
  if (methodLower.includes("pix")) return <Smartphone className="h-4 w-4" />;
  if (methodLower.includes("cartão") || methodLower.includes("card")) return <CreditCard className="h-4 w-4" />;
  if (methodLower.includes("boleto")) return <Banknote className="h-4 w-4" />;
  if (methodLower.includes("transferência") || methodLower.includes("transfer")) return <Building2 className="h-4 w-4" />;
  return <Banknote className="h-4 w-4" />;
};

export const PaymentTimeline = ({ saleId, totalAmount }: PaymentTimelineProps) => {
  const { transactions, loading } = usePaymentTransactions(saleId);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  const totalPaid = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
  const progressPercentage = totalAmount > 0 ? Math.min((totalPaid / totalAmount) * 100, 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Histórico de Pagamentos</span>
          <Badge variant={totalPaid >= totalAmount ? "default" : "secondary"}>
            {transactions.length} {transactions.length === 1 ? "pagamento" : "pagamentos"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progresso do pagamento</span>
            <span className="font-medium">
              R$ {totalPaid.toFixed(2)} / R$ {totalAmount.toFixed(2)}
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Clock className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Nenhum pagamento registrado ainda</p>
          </div>
        ) : (
          <div className="space-y-4">
            {transactions.map((transaction, index) => (
              <div
                key={transaction.id}
                className="relative flex gap-4 pb-4 border-b last:border-0 last:pb-0"
              >
                <div className="flex flex-col items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    {getPaymentIcon(transaction.payment_method)}
                  </div>
                  {index < transactions.length - 1 && (
                    <div className="w-px h-full bg-border mt-2" />
                  )}
                </div>

                <div className="flex-1 space-y-1 pt-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{transaction.payment_method}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(transaction.payment_date).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <Badge variant="outline" className="font-mono">
                      R$ {Number(transaction.amount).toFixed(2)}
                    </Badge>
                  </div>
                  {transaction.notes && (
                    <p className="text-sm text-muted-foreground mt-2">{transaction.notes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
