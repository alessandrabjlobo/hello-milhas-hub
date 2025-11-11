import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Plane, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export default function Subscription() {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubscribe = async (plan: 'start' | 'pro') => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('stripe-checkout', {
        body: { email: user?.email }
      });

      if (error) throw error;

      // Redirecionar para Stripe Checkout
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('URL de checkout não recebida');
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      toast({
        title: "Erro ao processar pagamento",
        description: err.message || "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const plans = [
    {
      id: 'pro',
      name: 'Hello Milhas +',
      price: 'R$ 25',
      period: '/mês',
      description: 'Plataforma completa para gestão de vendas de milhas',
      features: [
        'Vendas ilimitadas',
        'Gestão completa de contas de milhagem',
        'Calculadora de margem e lucro',
        'Gerador de orçamentos',
        'Controle de passagens emitidas',
        'Gestão de fornecedores',
        'Relatórios e dashboards completos',
        'Sistema de mensagens para clientes',
        'Suporte completo',
      ],
      popular: true,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Plane className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Escolha seu Plano
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Comece com 7 dias de teste gratuito. Cancele quando quiser.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              Teste grátis por 7 dias - Cartão necessário
            </span>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="flex justify-center max-w-2xl mx-auto mb-12">
          {plans.map((plan) => (
            <Card 
              key={plan.id}
              className={`relative ${plan.popular ? 'border-primary shadow-lg' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className="px-4 py-1">Mais Popular</Badge>
                </div>
              )}
              
              <CardHeader>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
              </CardHeader>

              <CardContent>
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => handleSubscribe(plan.id as 'start' | 'pro')}
                  disabled={loading}
                  variant={plan.popular ? "default" : "outline"}
                >
                  {loading ? "Processando..." : "Começar Teste Gratuito"}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <h2 className="text-2xl font-bold text-foreground mb-6">
            Perguntas Frequentes
          </h2>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Como funciona o teste gratuito?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-left">
                Você terá acesso completo ao plano escolhido por 7 dias sem nenhum custo. 
                Cadastramos seu cartão para garantir uma transição suave após o período de teste, 
                mas você só será cobrado após os 7 dias. Pode cancelar a qualquer momento.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Posso trocar de plano depois?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-left">
                Sim! Você pode fazer upgrade ou downgrade do seu plano a qualquer momento 
                através da página de gerenciamento de assinatura.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12">
          <p className="text-muted-foreground">
            Já tem uma conta?{" "}
            <Button
              variant="link"
              className="text-primary p-0"
              onClick={() => navigate('/login')}
            >
              Fazer login
            </Button>
          </p>
        </div>
      </div>
    </div>
  );
}
