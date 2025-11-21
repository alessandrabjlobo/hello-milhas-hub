import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plane } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

function loadStripeScript() {
  return new Promise<void>((resolve) => {
    if (
      document.querySelector(
        `script[src="https://js.stripe.com/v3/pricing-table.js"]`
      )
    ) {
      return resolve();
    }
    const script = document.createElement("script");
    script.src = "https://js.stripe.com/v3/pricing-table.js";
    script.async = true;
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
}

// 🔗 Seu checkout direto do Stripe
const STRIPE_CHECKOUT_URL =
  "https://buy.stripe.com/4gMaEQe8IceS3pl0lH3Nm01";

export default function Subscription() {
  const { user } = useAuth();
  const [ready, setReady] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(true);

  const pricingTableId = import.meta.env.VITE_STRIPE_PRICING_TABLE_ID;
  const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

  useEffect(() => {
    loadStripeScript().then(() => setReady(true));

    if (user) {
      fetchSubscriptionStatus();
    } else {
      setLoadingSubscription(false);
    }
  }, [user]);

  const fetchSubscriptionStatus = async () => {
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

  // Se usuário logado COM assinatura ativa, mostrar status
  if (
    user &&
    subscription &&
    (subscription.status === "active" || subscription.status === "trialing")
  ) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 relative z-50">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                  <Plane className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="font-bold text-lg">Hello Milhas +</span>
              </div>
              <div className="flex items-center gap-3">
                <Button asChild variant="ghost">
                  <Link to="/dashboard">Dashboard</Link>
                </Button>
              </div>
            </div>
          </div>
        </nav>

        <div className="container mx-auto px-4 py-16 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                ✅ Assinatura Ativa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-muted-foreground">Status</p>
                <Badge variant="default" className="text-base">
                  {subscription.status === "active"
                    ? "ATIVA"
                    : subscription.status === "trialing"
                    ? "EM TESTE"
                    : subscription.status.toUpperCase()}
                </Badge>
              </div>

              <div className="space-y-2">
                <p className="text-muted-foreground">Plano</p>
                <p className="font-semibold">
                  {subscription.plan === "pro" ? "Plano Pro" : "Plano Básico"}
                </p>
              </div>

              {subscription.renewal_date && (
                <div className="space-y-2">
                  <p className="text-muted-foreground">Próxima renovação</p>
                  <p className="font-semibold">
                    {new Date(
                      subscription.renewal_date
                    ).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              )}

              <div className="pt-4 border-t">
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/dashboard">Ir para o Dashboard</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Página padrão de escolha de plano + Stripe
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 relative z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                <Plane className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg">Hello Milhas +</span>
            </div>
            <div className="flex items-center gap-3">
              <Button asChild variant="ghost">
                <Link to="/">Voltar ao Início</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/login">Já tenho conta</Link>
              </Button>
              {/* 🔴 Botão direto do Stripe no header */}
              <Button asChild>
                <a
                  href={STRIPE_CHECKOUT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Assinar agora
                </a>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-16">
        {/* Título */}
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
        </div>

        {/* Stripe Pricing Table */}
        <div className="max-w-5xl mx-auto">
          {ready && pricingTableId && publishableKey ? (
            <stripe-pricing-table
              pricing-table-id={pricingTableId}
              publishable-key={publishableKey}
              customer-email={user?.email || undefined}
            />
          ) : (
            // Fallback se a tabela não estiver configurada
            <Card className="max-w-xl mx-auto">
              <CardHeader>
                <CardTitle className="text-center">
                  Plano Hello Milhas +
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-center">
                <p className="text-muted-foreground">
                  Clique no botão abaixo para concluir sua assinatura com
                  segurança pelo Stripe.
                </p>
                <Button asChild size="lg">
                  <a
                    href={STRIPE_CHECKOUT_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Assinar agora pelo Stripe
                  </a>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* CTA inferior */}
        <div className="text-center mt-12 space-y-4">
          <Button asChild size="lg">
            <a
              href={STRIPE_CHECKOUT_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Assinar agora pelo Stripe
            </a>
          </Button>

          <p className="text-muted-foreground">
            Já tem uma conta?{" "}
            <Button asChild variant="link" className="text-primary p-0">
              <Link to="/login">Fazer login</Link>
            </Button>
          </p>
        </div>
      </div>
    </div>
  );
}

// Declaração de tipo para o web component do Stripe
declare global {
  namespace JSX {
    interface IntrinsicElements {
      "stripe-pricing-table": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          "pricing-table-id": string;
          "publishable-key": string;
          "customer-email"?: string;
        },
        HTMLElement
      >;
    }
  }
}
