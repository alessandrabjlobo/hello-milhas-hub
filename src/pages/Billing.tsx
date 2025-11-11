import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, CreditCard, Upload, Check, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type SubscriptionPlan = "start" | "pro";
type SubscriptionStatus = "active" | "grace_period" | "suspended" | "cancelled" | "trialing" | "past_due";

interface Subscription {
  id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  renewal_date: string;
  grace_period_ends: string | null;
  pix_instructions: string | null;
  receipt_url: string | null;
  receipt_uploaded_at: string | null;
  receipt_reviewed: boolean;
}

export default function Billing() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      fetchSubscription();
    }
  }, [authLoading, user]);

  const fetchSubscription = async () => {
    try {
      const { data, error } = await supabase
        .from("billing_subscriptions")
        .select("*")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (error) throw error;
      setSubscription(data);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar assinatura",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      setUploading(true);

      // Placeholder: In real implementation, upload to Supabase Storage
      // const { data, error } = await supabase.storage
      //   .from('receipts')
      //   .upload(`${user.id}/${Date.now()}_${file.name}`, file);

      // For now, just update the database with a placeholder URL
      const { error } = await supabase
        .from("billing_subscriptions")
        .update({
          receipt_url: `receipt_${Date.now()}`,
          receipt_uploaded_at: new Date().toISOString(),
          receipt_reviewed: false,
        })
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Comprovante enviado",
        description: "Seu pagamento será analisado em breve.",
      });

      fetchSubscription();
    } catch (error: any) {
      toast({
        title: "Erro ao enviar comprovante",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="container max-w-4xl mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const isGracePeriod = subscription?.status === "grace_period";
  const isSuspended = subscription?.status === "suspended";
  const planName = subscription?.plan === "pro" ? "PRO" : "START";

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Plano e Pagamento</h1>
          <p className="text-muted-foreground">Gerencie sua assinatura</p>
        </div>
      </div>

      {isGracePeriod && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Seu plano está no período de carência. Por favor, realize o pagamento até{" "}
            {new Date(subscription.grace_period_ends!).toLocaleDateString("pt-BR")} para evitar a suspensão.
          </AlertDescription>
        </Alert>
      )}

      {isSuspended && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Sua conta está suspensa por falta de pagamento. Realize o pagamento para reativar.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Plano {planName}</CardTitle>
              <CardDescription>
                Renovação em {subscription?.renewal_date ? new Date(subscription.renewal_date).toLocaleDateString("pt-BR") : "-"}
              </CardDescription>
            </div>
            <Badge
              variant={
                subscription?.status === "active"
                  ? "default"
                  : subscription?.status === "grace_period"
                  ? "secondary"
                  : "destructive"
              }
            >
              {subscription?.status === "active" && "Ativo"}
              {subscription?.status === "grace_period" && "Carência"}
              {subscription?.status === "suspended" && "Suspenso"}
              {subscription?.status === "cancelled" && "Cancelado"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Instruções de Pagamento (PIX)
            </h3>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm whitespace-pre-wrap">
                {subscription?.pix_instructions || "Aguarde as instruções de pagamento."}
              </p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Comprovante de Pagamento
            </h3>
            
            {subscription?.receipt_url && (
              <div className="mb-4 p-4 bg-muted rounded-lg flex items-center gap-3">
                <Check className="h-5 w-5 text-green-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Comprovante enviado</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(subscription.receipt_uploaded_at!).toLocaleString("pt-BR")}
                  </p>
                </div>
                {subscription.receipt_reviewed ? (
                  <Badge variant="default">Aprovado</Badge>
                ) : (
                  <Badge variant="secondary">Em análise</Badge>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileUpload}
                disabled={uploading}
                className="flex-1"
              />
              <Button disabled={uploading}>
                {uploading ? "Enviando..." : "Enviar"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Formatos aceitos: JPG, PNG, PDF (máx. 5MB)
            </p>
          </div>

          <div className="border-t pt-6">
            <h3 className="font-semibold mb-4">Detalhes do Plano</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plano:</span>
                <span className="font-medium">{planName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor mensal:</span>
                <span className="font-medium">
                  {subscription?.plan === "pro" ? "R$ 149,90" : "R$ 79,90"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Próximo vencimento:</span>
                <span className="font-medium">
                  {subscription?.renewal_date ? new Date(subscription.renewal_date).toLocaleDateString("pt-BR") : "-"}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
