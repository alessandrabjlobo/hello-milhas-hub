import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { User, Building2, CreditCard, ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import AgencySettings from "./AgencySettings";
import { supabase } from "@/integrations/supabase/client";

export default function UserProfile() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<any>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSubscription();
    }
  }, [user]);

  const fetchSubscription = async () => {
    try {
      const { data, error } = await supabase
        .from("billing_subscriptions")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      
      if (!error && data) {
        setSubscription(data);
      }
    } catch (error) {
      console.error("Error fetching subscription:", error);
    } finally {
      setLoadingSubscription(false);
    }
  };

  return (
    <div className="container py-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <User className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Meu Perfil</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie suas informações pessoais, da agência e assinatura
          </p>
        </div>
      </div>

      <Tabs defaultValue="personal" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="personal">
            <User className="h-4 w-4 mr-2" />
            Dados Pessoais
          </TabsTrigger>
          <TabsTrigger value="agency">
            <Building2 className="h-4 w-4 mr-2" />
            Dados da Agência
          </TabsTrigger>
          <TabsTrigger value="subscription">
            <CreditCard className="h-4 w-4 mr-2" />
            Assinatura
          </TabsTrigger>
        </TabsList>

        {/* Aba: Dados Pessoais */}
        <TabsContent value="personal">
          <Card>
            <CardHeader>
              <CardTitle>Informações Pessoais</CardTitle>
              <CardDescription>
                Seus dados de conta no Hello Milhas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input 
                  value={user?.email || ""} 
                  disabled 
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Entre em contato com o suporte para alterar seu e-mail
                </p>
              </div>

              <div className="space-y-2">
                <Label>ID do Usuário</Label>
                <Input 
                  value={user?.id || ""} 
                  disabled 
                  className="bg-muted font-mono text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label>Data de Criação</Label>
                <Input 
                  value={user?.created_at ? new Date(user.created_at).toLocaleDateString("pt-BR") : ""} 
                  disabled 
                  className="bg-muted"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba: Dados da Agência */}
        <TabsContent value="agency">
          <AgencySettings />
        </TabsContent>

        {/* Aba: Assinatura */}
        <TabsContent value="subscription">
          <Card>
            <CardHeader>
              <CardTitle>Gerenciamento de Assinatura</CardTitle>
              <CardDescription>
                Informações sobre seu plano e cobrança
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {loadingSubscription ? (
                <p className="text-muted-foreground">Carregando informações...</p>
              ) : subscription ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Status da Assinatura</Label>
                      <div>
                        <Badge 
                          variant={subscription.status === 'active' || subscription.status === 'trialing' ? 'default' : 'destructive'}
                          className="text-sm"
                        >
                          {subscription.status === 'active' ? '✅ ATIVA' : 
                           subscription.status === 'trialing' ? '🎉 EM TESTE' :
                           subscription.status === 'canceled' ? '❌ CANCELADA' : 
                           subscription.status.toUpperCase()}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Plano Atual</Label>
                      <p className="font-semibold text-lg">
                        {subscription.plan === 'pro' ? 'Plano Pro' : 'Plano Básico'}
                      </p>
                    </div>

                    {subscription.renewal_date && (
                      <div className="space-y-2">
                        <Label>Próxima Renovação</Label>
                        <p className="font-semibold">
                          {new Date(subscription.renewal_date).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "long",
                            year: "numeric"
                          })}
                        </p>
                      </div>
                    )}

                    {subscription.created_at && (
                      <div className="space-y-2">
                        <Label>Assinante desde</Label>
                        <p className="font-semibold">
                          {new Date(subscription.created_at).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "long",
                            year: "numeric"
                          })}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="border-t pt-6 space-y-3">
                    <Button 
                      variant="default" 
                      className="w-full"
                      onClick={() => window.open("https://buy.stripe.com/4gMaEQe8IceS3pl0lH3Nm01", "_blank")}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Atualizar Plano ou Método de Pagamento
                    </Button>
                    
                    <p className="text-xs text-muted-foreground text-center">
                      Você será redirecionado para o portal seguro do Stripe
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 space-y-4">
                  <p className="text-muted-foreground">
                    Você ainda não possui uma assinatura ativa
                  </p>
                  <Button 
                    variant="default"
                    size="lg"
                    onClick={() => window.open("https://buy.stripe.com/4gMaEQe8IceS3pl0lH3Nm01", "_blank")}
                  >
                    Assinar Agora
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
