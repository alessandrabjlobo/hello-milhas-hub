import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Plane, 
  TrendingUp, 
  MessageSquare, 
  Shield, 
  BarChart3,
  Zap,
  ArrowRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import heroBackground from "@/assets/hero-background.jpg";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (user && !loading) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  const features = [
    {
      icon: TrendingUp,
      title: "Gestão de Vendas",
      description: "Controle completo de todas as suas transações e vendas de milhas em tempo real"
    },
    {
      icon: Shield,
      title: "Contas Seguras",
      description: "Gerencie múltiplas contas de programas de fidelidade com segurança máxima"
    },
    {
      icon: Plane,
      title: "Emissão de Passagens",
      description: "Acompanhe todas as passagens emitidas e seu status de forma simplificada"
    },
    {
      icon: MessageSquare,
      title: "Comunicação Direta",
      description: "Envie mensagens automatizadas para seus clientes com detalhes das compras"
    },
    {
      icon: BarChart3,
      title: "Relatórios Inteligentes",
      description: "Analise seu desempenho com dashboards e métricas em tempo real"
    },
    {
      icon: Zap,
      title: "Automação Completa",
      description: "Automatize processos repetitivos e economize tempo no seu dia a dia"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div 
          className="absolute inset-0 opacity-10 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroBackground})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background/95 to-primary/5" />
        
        <div className="relative container mx-auto px-6 py-20 md:py-32">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 animate-pulse-glow">
              <Plane className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">O futuro da venda de milhas</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold leading-tight">
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                Hello Milhas +
              </span>
              <br />
              <span className="text-foreground">
                Gerencie suas vendas com inteligência
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Plataforma completa para vendedores de milhas. Controle vendas, contas, passagens e comunicação com clientes em um só lugar.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <Button 
                variant="hero" 
                size="lg"
                onClick={() => navigate("/assinatura")}
                className="text-lg px-8"
              >
                Começar Agora
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="text-lg px-8"
                onClick={() => navigate("/demo")}
              >
                Ver Demonstração
              </Button>
            </div>
          </div>
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl md:text-5xl font-bold">
              Tudo que você precisa para{" "}
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                vender mais
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Ferramentas profissionais para otimizar cada etapa do seu negócio
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card 
                key={index} 
                className="shadow-card hover:shadow-glow transition-all duration-300 border-border/50 hover:border-primary/50"
              >
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-gradient-primary flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-primary opacity-10" />
        <div className="container mx-auto px-6 relative">
          <Card className="max-w-4xl mx-auto border-2 border-primary/20 shadow-glow">
            <CardContent className="p-12 text-center space-y-6">
              <h2 className="text-4xl md:text-5xl font-bold">
                Pronto para começar?
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Junte-se a centenas de vendedores que já transformaram seus negócios com o Hello Milhas +
              </p>
              <Button 
                variant="hero" 
                size="lg"
                onClick={() => navigate("/login")}
                className="text-lg px-10"
              >
                Entrar
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                <Plane className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg">Hello Milhas +</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 Hello Milhas +. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
