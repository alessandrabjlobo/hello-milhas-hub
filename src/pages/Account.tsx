import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plane, CreditCard, Calendar, Mail, ArrowRight, ExternalLink, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type SubscriptionStatus = "active" | "trialing" | "past_due" | "cancelled" | "grace_period" | "suspended";

interface Subscription {
  plan: "start" | "pro";
  status: SubscriptionStatus;
  renewal_date: string;
  billing_email: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
}

export default function Account() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    fetchSubscription();
  }, [user, navigate]);

  const fetchSubscription = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("billing_subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSubscription(data as any);
      }
    } catch (err: any) {
      console.error("Error fetching subscription:", err);
      toast({
        title: "Erro ao carregar assinatura",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManageBilling = async () => {
    setPortalLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Sessão não encontrada');
      }

      const { data, error } = await supabase.functions.invoke('stripe-portal', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      } else {
        throw new Error('URL do portal não recebida');
      }
    } catch (err: any) {
      console.error('Portal error:', err);
      toast({
        title: "Erro ao abrir portal",
        description: err.message || "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setPortalLoading(false);
    }
  };

  const getStatusBadge = (status: SubscriptionStatus) => {
    const badges = {
      active: <Badge className="bg-green-500">Ativo</Badge>,
      trialing: <Badge className="bg-blue-500">Período de Teste</Badge>,
      past_due: <Badge variant="destructive">Pagamento Pendente</Badge>,
      cancelled: <Badge variant="outline">Cancelado</Badge>,
      grace_period: <Badge variant="secondary">Período de Carência</Badge>,
      suspended: <Badge variant="destructive">Suspenso</Badge>,
    };
    return badges[status] || <Badge variant="outline">{status}</Badge>;
  };

  const getPlanName = (plan: "start" | "pro") => {
    return plan === "pro" ? "Pro" : "Start";
  };

  const canAccessApp = subscription?.status === 'active' || subscription?.status === 'trialing';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-2xl p-8 space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-lg">
          <CardHeader>
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle className="text-center">Assinatura não encontrada</CardTitle>
            <CardDescription className="text-center">
              Você ainda não possui uma assinatura ativa.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full" onClick={() => navigate('/assinatura')}>
              Escolher um Plano
            </Button>
            <Button variant="outline" className="w-full" onClick={() => navigate('/login')}>
              Fazer Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Plane className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Minha Conta
          </h1>
          <p className="text-muted-foreground">
            Gerencie sua assinatura e informações de pagamento
          </p>
        </div>

        {/* Status Alert */}
        {!canAccessApp && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {subscription.status === 'past_due' && 
                'Seu pagamento está pendente. Atualize sua forma de pagamento para continuar usando o serviço.'}
              {subscription.status === 'cancelled' && 
                'Sua assinatura foi cancelada. Assine novamente para recuperar o acesso.'}
              {subscription.status === 'suspended' && 
                'Sua conta está suspensa. Entre em contato com o suporte.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Subscription Details */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Detalhes da Assinatura</CardTitle>
              {getStatusBadge(subscription.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Plano Atual</p>
                  <p className="font-semibold">{getPlanName(subscription.plan)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">E-mail de Cobrança</p>
                  <p className="font-semibold">{subscription.billing_email || user?.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {subscription.status === 'trialing' ? 'Fim do Período de Teste' : 'Próxima Cobrança'}
                  </p>
                  <p className="font-semibold">
                    {format(new Date(subscription.renewal_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t space-y-3">
              <Button
                className="w-full"
                onClick={handleManageBilling}
                disabled={portalLoading}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                {portalLoading ? "Carregando..." : "Gerenciar Cobrança"}
              </Button>

              {canAccessApp && (
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => navigate('/dashboard')}
                >
                  Ir para o App
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Trial Info */}
        {subscription.status === 'trialing' && (
          <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-900">
            <CardHeader>
              <CardTitle className="text-blue-900 dark:text-blue-100">
                🎉 Você está no período de teste!
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-blue-800 dark:text-blue-200">
                Aproveite todos os recursos do plano {getPlanName(subscription.plan)} gratuitamente até{" "}
                {format(new Date(subscription.renewal_date), "dd/MM/yyyy")}. Após esse período, 
                sua cobrança será processada automaticamente.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Logout */}
        <div className="text-center mt-8">
          <Button variant="ghost" onClick={signOut}>
            Sair da conta
          </Button>
        </div>
      </div>
    </div>
  );
}
