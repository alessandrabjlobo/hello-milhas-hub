import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plane } from "lucide-react";

function loadStripeScript() {
  return new Promise<void>((resolve) => {
    if (document.querySelector(`script[src="https://js.stripe.com/v3/pricing-table.js"]`)) {
      return resolve();
    }
    const script = document.createElement("script");
    script.src = "https://js.stripe.com/v3/pricing-table.js";
    script.async = true;
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
}

export default function Subscription() {
  const [ready, setReady] = useState(false);

  const pricingTableId = import.meta.env.VITE_STRIPE_PRICING_TABLE_ID;
  const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

  useEffect(() => {
    loadStripeScript().then(() => setReady(true));
  }, []);

  const missing = !pricingTableId || !publishableKey;

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
            </div>
          </div>
        </div>
      </nav>

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
        </div>

        {/* Stripe Pricing Table */}
        <div className="max-w-5xl mx-auto">
          {missing && (
            <div className="p-6 border-2 border-yellow-500/50 rounded-lg bg-yellow-500/10 text-center">
              <p className="text-foreground font-medium mb-2">
                ⚠️ Configuração Necessária
              </p>
              <p className="text-muted-foreground text-sm">
                Configure as variáveis de ambiente VITE_STRIPE_PRICING_TABLE_ID e VITE_STRIPE_PUBLISHABLE_KEY em Configurações do Projeto → Variáveis de Ambiente.
              </p>
            </div>
          )}

          {ready && !missing && (
            <stripe-pricing-table 
              pricing-table-id={pricingTableId}
              publishable-key={publishableKey}
            />
          )}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12">
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
      'stripe-pricing-table': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          'pricing-table-id': string;
          'publishable-key': string;
          'customer-email'?: string;
        },
        HTMLElement
      >;
    }
  }
}
